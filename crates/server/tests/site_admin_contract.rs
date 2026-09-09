use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::entity::prelude::DateTime;

// Guards site-admin update helper ownership while server config helpers are
// imported from their owning module instead of the root.
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, Database, DatabaseConnection, EntityTrait,
    NotSet, QueryFilter, Set, Statement,
};
use serde_json::{json, Value};
use tower::ServiceExt;
use yoram_integrations::{clear_test_outbox, snapshot_test_outbox};
use yoram_migration::Migrator;
use yoram_persistence::{
    attachment, issue, issue_comment, issue_label, issue_label_category, milestone, n4user,
    posting, posting_comment, project, project_user, role, site_admin, AppRepository,
    CreateIssueCommentInput, CreateIssueInput, CreatePostingCommentInput, CreatePostingInput,
    CreateProjectLabelInput, IssueMutationInput, MilestoneListFilter, MilestoneMutationInput,
    PostingMutationInput,
};
use yoram_server::{
    create_router_with_app_repository, create_router_with_repository_and_app_config,
    create_router_with_repository_and_filesystem_assets_and_app_config,
    reconcile_site_import_staging_uploads_for_startup, AppRuntimeConfig, RuntimeConfig,
    SiteUpdateConfig, SmtpRuntimeConfig,
};

mod rest_test_support;

async fn build_app_with_repository() -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());
    let app = create_router_with_app_repository(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
    );

    (app, app_repo, db)
}

async fn build_app_with_app_config(
    app_config: AppRuntimeConfig,
) -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());
    let app = create_router_with_repository_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
        app_config,
    );

    (app, app_repo, db)
}

async fn build_app_with_site_update_config(
    site_update: SiteUpdateConfig,
) -> (axum::Router, AppRepository, DatabaseConnection) {
    build_app_with_app_config(AppRuntimeConfig {
        site_update,
        ..AppRuntimeConfig::default()
    })
    .await
}

async fn response_text(response: Response<Body>) -> String {
    String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap()
}

async fn response_bytes(response: Response<Body>) -> Vec<u8> {
    response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes()
        .to_vec()
}

async fn response_json(response: Response<Body>) -> Value {
    let status = response.status();
    let text = response_text(response).await;
    assert_eq!(status, StatusCode::OK, "{text}");
    serde_json::from_str(&text).expect("json response")
}

async fn bootstrap(app: axum::Router) -> (String, String) {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/auth/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let csrf = response
        .headers()
        .get("x-csrf-token")
        .unwrap()
        .to_str()
        .unwrap()
        .to_string();
    let cookies: Vec<String> = response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .map(|value| {
            value
                .to_str()
                .unwrap()
                .split(';')
                .next()
                .unwrap()
                .to_string()
        })
        .collect();

    (csrf, cookies.join("; "))
}

async fn rpc(
    app: axum::Router,
    method_name: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Value,
) -> Response<Body> {
    rest_test_support::pilot_rest(app, method_name, cookie_header, csrf, payload).await
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String, i64) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = rpc(
        app,
        "RegisterWithPassword",
        Some(&cookie_header),
        Some(&csrf),
        json!({
            "loginId": login_id,
            "name": login_id,
            "emailAddress": format!("{login_id}@example.com"),
            "password": "doorpass1",
            "retypedPassword": "doorpass1"
        }),
    )
    .await;
    let payload = response_json(response).await;
    let actor_id = payload
        .get("actorId")
        .and_then(|value| {
            value
                .as_i64()
                .or_else(|| value.as_str().and_then(|value| value.parse().ok()))
        })
        .expect("actor id");

    (csrf, cookie_header, actor_id)
}

async fn create_project(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    owner_name: &str,
    project_name: &str,
) {
    response_json(
        rpc(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": owner_name,
                "projectName": project_name,
                "overview": "site admin delete guard",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;
}

async fn rest_get(app: axum::Router, uri: &str, cookie_header: Option<&str>) -> Response<Body> {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
}

async fn rest_get_with_bearer(app: axum::Router, uri: &str, token: &str) -> Response<Body> {
    app.oneshot(
        Request::builder()
            .method(Method::GET)
            .uri(uri)
            .header(http::header::AUTHORIZATION, format!("Bearer {token}"))
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn rest_post(
    app: axum::Router,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::POST)
        .uri(uri)
        .header(http::header::CONTENT_TYPE, "application/json");
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }
    app.oneshot(builder.body(Body::from("{}")).unwrap())
        .await
        .unwrap()
}

async fn rest_json(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Value,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header(http::header::CONTENT_TYPE, "application/json");
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }
    app.oneshot(builder.body(Body::from(payload.to_string())).unwrap())
        .await
        .unwrap()
}

async fn rest_raw_post(
    app: axum::Router,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    content_type: &str,
    body: &str,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::POST)
        .uri(uri)
        .header(http::header::CONTENT_TYPE, content_type);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }
    app.oneshot(builder.body(Body::from(body.to_string())).unwrap())
        .await
        .unwrap()
}

async fn rest_delete(
    app: axum::Router,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::DELETE)
        .uri(uri)
        .header(http::header::CONTENT_TYPE, "application/json");
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }
    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
}

async fn mark_site_admin(db: &DatabaseConnection, user_id: i64) {
    site_admin::ActiveModel {
        id: NotSet,
        admin_id: Set(Some(user_id)),
    }
    .insert(db)
    .await
    .expect("site admin insert");
}

#[tokio::test]
async fn site_admin_legacy_external_user_list_route_is_admin_only() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (_plain_csrf, plain_cookie, _plain_id) = register_user(app.clone(), "plain").await;
    mark_site_admin(&db, admin_id).await;

    let admin_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/admin/users")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(admin_response.status(), StatusCode::OK);
    let users: Value = serde_json::from_str(&response_text(admin_response).await).unwrap();
    assert!(users
        .as_array()
        .unwrap()
        .iter()
        .any(|user| user["login_id"] == "siteboss"));

    let plain_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/admin/users")
                .header(http::header::COOKIE, &plain_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(plain_response.status(), StatusCode::FORBIDDEN);
}

async fn insert_attachment(
    db: &DatabaseConnection,
    container_type: &str,
    container_id: i64,
    owner_login_id: &str,
    name: &str,
    mime_type: &str,
) -> attachment::Model {
    attachment::ActiveModel {
        id: NotSet,
        name: Set(Some(name.to_string())),
        hash: Set(Some(format!("{container_type}-{container_id}-{name}"))),
        container_type: Set(Some(container_type.to_string())),
        mime_type: Set(Some(mime_type.to_string())),
        size: Set(Some(256)),
        container_id: Set(container_id),
        created_date: Set(Some(
            DateTime::parse_from_str("2020-01-01 00:00:00", "%Y-%m-%d %H:%M:%S")
                .expect("attachment timestamp"),
        )),
        owner_login_id: Set(Some(owner_login_id.to_string())),
    }
    .insert(db)
    .await
    .expect("attachment insert")
}

fn write_uploaded_test_file(
    data_dir: &tempfile::TempDir,
    attachment: &attachment::Model,
    bytes: &[u8],
) {
    let hash = attachment.hash.as_deref().expect("attachment hash");
    let upload_dir = data_dir.path().join("uploads");
    std::fs::create_dir_all(&upload_dir).expect("upload dir");
    std::fs::write(upload_dir.join(hash), bytes).expect("upload bytes");
}

fn imported_upload_staging_dir(data_dir: &tempfile::TempDir) -> std::path::PathBuf {
    data_dir.path().join("uploads").join(".site-import-staging")
}

fn final_upload_file_count(data_dir: &tempfile::TempDir) -> usize {
    std::fs::read_dir(data_dir.path().join("uploads"))
        .map(|entries| {
            entries
                .filter_map(Result::ok)
                .filter(|entry| entry.file_name() != ".site-import-staging")
                .count()
        })
        .unwrap_or_default()
}

fn spawn_update_asset_server(path: &str, content_type: &str, body: &'static [u8]) -> String {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("update asset listener");
    let address = listener.local_addr().expect("update asset address");
    let path = path.to_string();
    let url_path = path.clone();
    let content_type = content_type.to_string();
    std::thread::spawn(move || {
        let Ok((mut stream, _)) = listener.accept() else {
            return;
        };
        let mut buffer = [0_u8; 1024];
        let _ = std::io::Read::read(&mut stream, &mut buffer);
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            body.len()
        );
        let _ = std::io::Write::write_all(&mut stream, response.as_bytes());
        let _ = std::io::Write::write_all(&mut stream, body);
        let _ = path;
    });
    format!("http://{address}{url_path}")
}

fn spawn_chunked_update_asset_server(
    path: &str,
    content_type: &str,
    chunks: Vec<&'static [u8]>,
) -> String {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("update asset listener");
    let address = listener.local_addr().expect("update asset address");
    let path = path.to_string();
    let url_path = path.clone();
    let content_type = content_type.to_string();
    std::thread::spawn(move || {
        let Ok((mut stream, _)) = listener.accept() else {
            return;
        };
        let mut buffer = [0_u8; 1024];
        let _ = std::io::Read::read(&mut stream, &mut buffer);
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: {content_type}\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n"
        );
        let _ = std::io::Write::write_all(&mut stream, response.as_bytes());
        for chunk in chunks {
            let _ =
                std::io::Write::write_all(&mut stream, format!("{:x}\r\n", chunk.len()).as_bytes());
            let _ = std::io::Write::write_all(&mut stream, chunk);
            let _ = std::io::Write::write_all(&mut stream, b"\r\n");
        }
        let _ = std::io::Write::write_all(&mut stream, b"0\r\n\r\n");
        let _ = path;
    });
    format!("http://{address}{url_path}")
}

fn user<'a>(payload: &'a Value, login_id: &str) -> &'a Value {
    payload["users"]
        .as_array()
        .expect("users")
        .iter()
        .find(|user| user["loginId"] == login_id)
        .unwrap_or_else(|| panic!("user {login_id} missing from {payload}"))
}

fn login_ids(payload: &Value) -> Vec<String> {
    payload["users"]
        .as_array()
        .expect("users")
        .iter()
        .map(|user| user["loginId"].as_str().unwrap().to_string())
        .collect()
}

fn response_location(response: &Response<Body>) -> String {
    response
        .headers()
        .get(http::header::LOCATION)
        .expect("location header")
        .to_str()
        .expect("location utf8")
        .to_string()
}

#[tokio::test]
async fn site_admin_no_avatar_json_routes_follow_legacy_contract() {
    let (app, repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (_plain_csrf, plain_cookie, _plain_id) = register_user(app.clone(), "plain").await;
    let (_avatar_csrf, _avatar_cookie, avatar_id) = register_user(app.clone(), "withavatar").await;
    let (_locked_csrf, _locked_cookie, _locked_id) = register_user(app.clone(), "locked").await;
    mark_site_admin(&db, admin_id).await;

    insert_attachment(
        &db,
        "USER_AVATAR",
        avatar_id,
        "withavatar",
        "avatar.png",
        "image/png",
    )
    .await;
    repo.toggle_site_user_account_lock("locked")
        .await
        .expect("lock user")
        .expect("locked user");

    let unauthenticated = rest_get(app.clone(), "/yona/api/v1/site/no-avatar-users", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/site/no-avatar-users",
        Some(&plain_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let payload = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/no-avatar-users",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    let ids = login_ids(&payload);
    assert!(ids.contains(&"plain".to_string()));
    assert!(!ids.contains(&"withavatar".to_string()));
    assert!(!ids.contains(&"locked".to_string()));
    let plain = user(&payload, "plain");
    assert_eq!(plain["loginId"], "plain");
    assert_eq!(plain["name"], "plain");
    assert_eq!(plain["email"], "plain@example.com");
    assert!(plain.get("emailAddress").is_none());

    let legacy_payload = response_json(
        rest_get(
            app.clone(),
            "/yona/sites/noAvatarUsers",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&legacy_payload), ids);
    assert!(legacy_payload
        .get("users")
        .and_then(Value::as_array)
        .is_some());

    let bad_json = rest_raw_post(
        app.clone(),
        "/yona/sites/setAttachmentToUserAvatar",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "text/plain",
        "not-json",
    )
    .await;
    assert_eq!(bad_json.status(), StatusCode::BAD_REQUEST);
    let bad_json_payload: Value = serde_json::from_str(&response_text(bad_json).await).unwrap();
    assert_eq!(bad_json_payload["message"], "Expecting Json data");

    let uploaded_by_admin = insert_attachment(
        &db,
        "USER",
        admin_id,
        "siteboss",
        "selected.png",
        "image/png",
    )
    .await;
    let promoted = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/site/users/avatar-from-attachment",
            Some(&admin_cookie),
            Some(&admin_csrf),
            json!({
                "avatarFileId": uploaded_by_admin.id,
                "email": "plain@example.com"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(promoted["status"], 200);
    assert_eq!(promoted["message"], "OK");

    let moved_attachment = repo
        .read_attachment_by_id(uploaded_by_admin.id)
        .await
        .expect("read promoted attachment")
        .expect("promoted attachment");
    let plain_user = repo
        .find_user_by_login_id("plain")
        .await
        .expect("read plain user")
        .expect("plain user");
    assert_eq!(moved_attachment.container_type, "USER_AVATAR");
    assert_eq!(moved_attachment.container_id, plain_user.id);

    let after_promote = response_json(
        rest_get(
            app,
            "/yona/api/v1/site/no-avatar-users",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert!(!login_ids(&after_promote).contains(&"plain".to_string()));
}

#[tokio::test]
async fn site_admin_direct_mutation_aliases_follow_legacy_routes() {
    let (app, repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    let (_deletee_csrf, _deletee_cookie, deletee_id) = register_user(app.clone(), "deletee").await;
    mark_site_admin(&db, admin_id).await;

    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "legacy-delete-project",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("member", "legacy-delete-project")
        .await
        .expect("read legacy delete project")
        .expect("legacy delete project");

    let forbidden_toggle = rest_post(
        app.clone(),
        "/yona/sites/toggleSiteAdminRole/siteboss",
        Some(&member_cookie),
        Some(&member_csrf),
    )
    .await;
    assert_eq!(forbidden_toggle.status(), StatusCode::FORBIDDEN);

    let forbidden_legacy_reset = rest_post(
        app.clone(),
        "/yona/member?action=resetPassword",
        Some(&member_cookie),
        Some(&member_csrf),
    )
    .await;
    assert_eq!(forbidden_legacy_reset.status(), StatusCode::FORBIDDEN);

    let missing_legacy_reset_action = rest_post(
        app.clone(),
        "/yona/member",
        Some(&admin_cookie),
        Some(&admin_csrf),
    )
    .await;
    assert_eq!(
        missing_legacy_reset_action.status(),
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        serde_json::from_str::<Value>(&response_text(missing_legacy_reset_action).await)
            .expect("legacy reset bad request json"),
        json!({ "isSuccess": false, "reason": "BAD_REQUEST" })
    );

    let legacy_reset = response_json(
        rest_post(
            app.clone(),
            "/yona/member?action=resetPassword",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    let legacy_new_password = legacy_reset["newPassword"]
        .as_str()
        .expect("legacy reset password");
    assert_eq!(legacy_reset["isSuccess"], true);
    assert_eq!(legacy_reset["loginId"], "member");
    assert_eq!(legacy_reset["name"], "member");
    assert_eq!(legacy_new_password.len(), 6);
    let member_after_legacy_reset = repo
        .find_user_by_login_id("member")
        .await
        .expect("read legacy reset member")
        .expect("legacy reset member");
    assert!(bcrypt::verify(
        legacy_new_password,
        &member_after_legacy_reset.password_hash
    )
    .expect("bcrypt verify legacy reset"));

    let promoted = rest_post(
        app.clone(),
        "/yona/sites/toggleSiteAdminRole/member",
        Some(&admin_cookie),
        Some(&admin_csrf),
    )
    .await;
    assert_eq!(promoted.status(), StatusCode::SEE_OTHER);
    assert_eq!(response_location(&promoted), "/yona/sites/userList");
    assert_eq!(response_text(promoted).await, "");
    assert!(
        repo.find_user_by_login_id("member")
            .await
            .expect("read promoted member")
            .expect("promoted member")
            .is_site_admin
    );

    let locked = rest_post(
        app.clone(),
        "/yona/sites/toggleAccountLock?loginId=member&state=ACTIVE&query=mem",
        Some(&admin_cookie),
        Some(&admin_csrf),
    )
    .await;
    assert_eq!(locked.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        response_location(&locked),
        "/yona/sites/userList?state=ACTIVE&query=mem"
    );
    assert!(
        !repo
            .find_user_by_login_id("member")
            .await
            .expect("read locked member")
            .expect("locked member")
            .is_confirmed
    );

    let guest = rest_post(
        app.clone(),
        "/yona/sites/toggleGuestMode?loginId=member&state=LOCKED&query=mem",
        Some(&admin_cookie),
        Some(&admin_csrf),
    )
    .await;
    assert_eq!(guest.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        response_location(&guest),
        "/yona/sites/userList?state=LOCKED&query=mem"
    );
    assert_eq!(
        user(
            &response_json(
                rest_get(
                    app.clone(),
                    "/yona/api/v1/site/users?state=GUEST",
                    Some(&admin_cookie),
                )
                .await,
            )
            .await,
            "member",
        )["id"]
            .as_i64(),
        Some(member_id)
    );

    let deleted_user = rest_delete(
        app.clone(),
        &format!("/yona/sites/user/delete{deletee_id}"),
        Some(&admin_cookie),
        Some(&admin_csrf),
    )
    .await;
    assert_eq!(deleted_user.status(), StatusCode::SEE_OTHER);
    assert_eq!(response_location(&deleted_user), "/yona/sites/userList");
    assert_eq!(response_text(deleted_user).await, "");
    assert_eq!(
        repo.find_user_by_login_id("deletee")
            .await
            .expect("read deleted user")
            .expect("deleted user")
            .is_confirmed,
        false
    );

    let deleted_project = rest_delete(
        app.clone(),
        &format!("/yona/sites/project/delete/{}", project.id),
        Some(&admin_cookie),
        Some(&admin_csrf),
    )
    .await;
    assert_eq!(deleted_project.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        response_location(&deleted_project),
        "/yona/sites/projectList"
    );
    assert!(repo
        .read_project_by_id(project.id)
        .await
        .expect("read deleted project")
        .is_none());
}

#[tokio::test]
async fn site_admin_unwatch_update_alias_follows_legacy_route() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    let unauthenticated = rest_post(app.clone(), "/yona/sites/unwatchUpdate", None, None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_post(
        app.clone(),
        "/yona/sites/unwatchUpdate",
        Some(&member_cookie),
        Some(&member_csrf),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let missing_csrf = rest_post(
        app.clone(),
        "/yona/sites/unwatchUpdate",
        Some(&admin_cookie),
        None,
    )
    .await;
    assert_eq!(missing_csrf.status(), StatusCode::FORBIDDEN);

    let hidden = rest_post(
        app,
        "/yona/sites/unwatchUpdate",
        Some(&admin_cookie),
        Some(&admin_csrf),
    )
    .await;
    assert_eq!(hidden.status(), StatusCode::OK);
    assert!(hidden.headers().get(http::header::CONTENT_TYPE).is_none());
    assert!(hidden.headers().get(http::header::LOCATION).is_none());
    assert_eq!(response_text(hidden).await, "");
}

#[tokio::test]
async fn site_admin_export_download_follows_legacy_site_data_route() {
    // Guards the site-admin export DTO route-module ownership split and route-utils timestamp helper.
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "dataproj",
    )
    .await;
    let export_post_attachment = insert_attachment(
        &db,
        "USER",
        member_id,
        "member",
        "post-export.png",
        "image/png",
    )
    .await;
    let export_post_comment_attachment = insert_attachment(
        &db,
        "USER",
        member_id,
        "member",
        "post-comment-export.txt",
        "text/plain",
    )
    .await;
    let export_issue_attachment = insert_attachment(
        &db,
        "USER",
        member_id,
        "member",
        "issue-export.png",
        "image/png",
    )
    .await;
    let export_issue_comment_attachment = insert_attachment(
        &db,
        "USER",
        member_id,
        "member",
        "issue-comment-export.txt",
        "text/plain",
    )
    .await;
    let export_milestone_attachment = insert_attachment(
        &db,
        "USER",
        member_id,
        "member",
        "milestone-export.txt",
        "text/plain",
    )
    .await;
    write_uploaded_test_file(&data_dir, &export_post_attachment, b"post-export-binary");
    write_uploaded_test_file(
        &data_dir,
        &export_post_comment_attachment,
        b"post-comment-export-binary",
    );
    write_uploaded_test_file(&data_dir, &export_issue_attachment, b"issue-export-binary");
    write_uploaded_test_file(
        &data_dir,
        &export_issue_comment_attachment,
        b"issue-comment-export-binary",
    );
    write_uploaded_test_file(
        &data_dir,
        &export_milestone_attachment,
        b"milestone-export-binary",
    );
    repo.create_project_label(CreateProjectLabelInput {
        category_is_exclusive: true,
        category_name: "Priority".to_string(),
        label_color: "#ff9800".to_string(),
        label_name: "Unused export label".to_string(),
        owner_name: "member".to_string(),
        project_name: "dataproj".to_string(),
    })
    .await
    .expect("create export label")
    .expect("export label created");
    let milestone = repo
        .create_project_milestone(MilestoneMutationInput {
            actor_id: Some(member_id),
            attachment_ids: vec![export_milestone_attachment.id],
            contents_markdown: "legacy data export milestone".to_string(),
            due_date: None,
            owner_name: "member".to_string(),
            project_name: "dataproj".to_string(),
            state: "open".to_string(),
            title: "Export milestone".to_string(),
        })
        .await
        .expect("create export milestone")
        .expect("export milestone created");
    repo.create_posting(CreatePostingInput {
        actor_display_name: "Member Name".to_string(),
        actor_id: member_id,
        actor_login_id: "member".to_string(),
        owner_name: "member".to_string(),
        project_name: "dataproj".to_string(),
        values: PostingMutationInput {
            attachment_ids: vec![export_post_attachment.id],
            body_markdown: "legacy data export post".to_string(),
            label_ids: vec![],
            notice: false,
            readme: false,
            title: "Data export post".to_string(),
        },
    })
    .await
    .expect("create export posting")
    .expect("posting created");
    let posting_with_parent_comment = repo
        .create_posting_comment(CreatePostingCommentInput {
            actor_display_name: "Member Name".to_string(),
            actor_id: member_id,
            actor_login_id: "member".to_string(),
            attachment_actor_id: None,
            attachment_ids: vec![export_post_comment_attachment.id],
            contents_markdown: "legacy data export post comment".to_string(),
            created_at: None,
            owner_name: "member".to_string(),
            parent_comment_id: None,
            post_number: 1,
            project_name: "dataproj".to_string(),
        })
        .await
        .expect("create export posting comment")
        .expect("posting comment created");
    let post_parent_comment_id = posting_with_parent_comment.comments[0].id;
    repo.create_posting_comment(CreatePostingCommentInput {
        actor_display_name: "Member Name".to_string(),
        actor_id: member_id,
        actor_login_id: "member".to_string(),
        attachment_actor_id: None,
        attachment_ids: vec![],
        contents_markdown: "legacy data export post child comment".to_string(),
        created_at: None,
        owner_name: "member".to_string(),
        parent_comment_id: Some(post_parent_comment_id),
        post_number: 1,
        project_name: "dataproj".to_string(),
    })
    .await
    .expect("create export posting child comment")
    .expect("posting child comment created");
    repo.create_issue(CreateIssueInput {
        actor_display_name: "Member Name".to_string(),
        actor_id: member_id,
        actor_login_id: "member".to_string(),
        owner_name: "member".to_string(),
        project_name: "dataproj".to_string(),
        values: IssueMutationInput {
            assignee_login_id: None,
            attachment_ids: vec![export_issue_attachment.id],
            body_markdown: "legacy data export issue".to_string(),
            due_date: None,
            is_draft: false,
            is_publish: false,
            label_ids: vec![],
            milestone_id: Some(milestone.id),
            parent_issue_id: None,
            title: "Data export issue".to_string(),
        },
    })
    .await
    .expect("create export issue")
    .expect("issue created");
    let issue_with_parent_comment = repo
        .create_issue_comment(CreateIssueCommentInput {
            actor_display_name: "Member Name".to_string(),
            actor_id: member_id,
            actor_login_id: "member".to_string(),
            attachment_ids: vec![export_issue_comment_attachment.id],
            contents_markdown: "legacy data export issue comment".to_string(),
            issue_number: 1,
            owner_name: "member".to_string(),
            parent_comment_id: None,
            project_name: "dataproj".to_string(),
        })
        .await
        .expect("create export issue comment")
        .expect("issue comment created");
    let issue_parent_comment_id = issue_with_parent_comment.comments[0].id;
    repo.create_issue_comment(CreateIssueCommentInput {
        actor_display_name: "Member Name".to_string(),
        actor_id: member_id,
        actor_login_id: "member".to_string(),
        attachment_ids: vec![],
        contents_markdown: "legacy data export issue child comment".to_string(),
        issue_number: 1,
        owner_name: "member".to_string(),
        parent_comment_id: Some(issue_parent_comment_id),
        project_name: "dataproj".to_string(),
    })
    .await
    .expect("create export issue child comment")
    .expect("issue child comment created");

    let unauthenticated = rest_get(app.clone(), "/yona/sites/export", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(app.clone(), "/yona/sites/export", Some(&member_cookie)).await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let response = rest_get(app.clone(), "/yona/sites/export", Some(&admin_cookie)).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get(http::header::CONTENT_TYPE).unwrap(),
        "application/x-download"
    );
    let disposition = response
        .headers()
        .get(http::header::CONTENT_DISPOSITION)
        .unwrap()
        .to_str()
        .unwrap();
    assert!(disposition.starts_with("attachment; filename=yobi-data-"));
    assert!(disposition.ends_with(".json"));

    let payload: Value = serde_json::from_str(&response_text(response).await).unwrap();
    assert!(payload.as_object().is_some());
    assert_eq!(payload["format"], "yobi-data");
    assert_eq!(payload["provenance"], "rust-app-runtime");
    assert!(payload["users"]
        .as_array()
        .unwrap()
        .iter()
        .any(|user| user["loginId"] == "member"
            && user["createdAt"]
                .as_str()
                .is_some_and(|value| !value.is_empty())));
    assert_eq!(payload["projects"][0]["ownerName"], "member");
    assert_eq!(payload["projects"][0]["projectName"], "dataproj");
    assert_eq!(payload["projects"][0]["projectScope"], "public");
    assert_eq!(payload["projects"][0]["vcs"], "GIT");
    assert!(payload["projectMembers"]
        .as_array()
        .unwrap()
        .iter()
        .any(|member| member["ownerName"] == "member"
            && member["projectName"] == "dataproj"
            && member["loginId"] == "member"
            && member["role"] == "manager"));
    assert_eq!(payload["labels"][0]["ownerName"], "member");
    assert_eq!(payload["labels"][0]["projectName"], "dataproj");
    assert_eq!(payload["labels"][0]["name"], "Unused export label");
    assert_eq!(payload["labels"][0]["categoryName"], "Priority");
    assert_eq!(payload["labels"][0]["categoryIsExclusive"], true);
    assert_eq!(payload["labels"][0]["color"], "#ff9800");
    assert_eq!(payload["milestones"][0]["title"], "Export milestone");
    assert_eq!(
        payload["milestones"][0]["contentsMarkdown"],
        "legacy data export milestone"
    );
    assert_eq!(payload["milestones"][0]["state"], "open");
    assert_eq!(
        payload["milestones"][0]["attachments"][0]["name"],
        "milestone-export.txt"
    );
    assert_eq!(
        payload["milestones"][0]["attachments"][0]["contentBase64"],
        "bWlsZXN0b25lLWV4cG9ydC1iaW5hcnk="
    );
    assert!(
        payload["milestones"][0]["attachments"][0]["createdAt"]
            .as_str()
            .is_some_and(|value| !value.is_empty()),
        "site export should carry legacy attachment createdAt"
    );
    assert_eq!(payload["posts"][0]["title"], "Data export post");
    assert!(
        payload["posts"][0]["createdAt"]
            .as_str()
            .is_some_and(|value| !value.is_empty()),
        "site export should carry legacy post createdAt"
    );
    assert!(
        payload["posts"][0]["updatedAt"]
            .as_str()
            .is_some_and(|value| !value.is_empty()),
        "site export should carry legacy post updatedAt"
    );
    assert_eq!(
        payload["posts"][0]["bodyMarkdown"],
        "legacy data export post"
    );
    assert_eq!(
        payload["posts"][0]["attachments"][0]["name"],
        "post-export.png"
    );
    assert_eq!(
        payload["posts"][0]["attachments"][0]["mimeType"],
        "image/png"
    );
    assert_eq!(payload["posts"][0]["attachments"][0]["size"], 256);
    assert_eq!(
        payload["posts"][0]["attachments"][0]["contentBase64"],
        "cG9zdC1leHBvcnQtYmluYXJ5"
    );
    assert_eq!(
        payload["posts"][0]["comments"][0]["contentsMarkdown"],
        "legacy data export post comment"
    );
    assert!(
        payload["posts"][0]["comments"][0]["createdAt"]
            .as_str()
            .is_some_and(|value| !value.is_empty()),
        "site export should carry legacy post comment createdAt"
    );
    assert_eq!(
        payload["posts"][0]["comments"][0]["attachments"][0]["name"],
        "post-comment-export.txt"
    );
    assert_eq!(
        payload["posts"][0]["comments"][0]["attachments"][0]["contentBase64"],
        "cG9zdC1jb21tZW50LWV4cG9ydC1iaW5hcnk="
    );
    assert_eq!(
        payload["posts"][0]["comments"][0]["childComments"][0]["contentsMarkdown"],
        "legacy data export post child comment"
    );
    assert_eq!(payload["posts"][0]["comments"].as_array().unwrap().len(), 1);
    assert_eq!(payload["issues"][0]["title"], "Data export issue");
    assert!(
        payload["issues"][0]["createdAt"]
            .as_str()
            .is_some_and(|value| !value.is_empty()),
        "site export should carry legacy issue createdAt"
    );
    assert!(
        payload["issues"][0]["updatedAt"]
            .as_str()
            .is_some_and(|value| !value.is_empty()),
        "site export should carry legacy issue updatedAt"
    );
    assert_eq!(payload["issues"][0]["milestoneTitle"], "Export milestone");
    assert_eq!(
        payload["issues"][0]["bodyMarkdown"],
        "legacy data export issue"
    );
    assert_eq!(
        payload["issues"][0]["attachments"][0]["name"],
        "issue-export.png"
    );
    assert_eq!(
        payload["issues"][0]["attachments"][0]["mimeType"],
        "image/png"
    );
    assert_eq!(payload["issues"][0]["attachments"][0]["size"], 256);
    assert_eq!(
        payload["issues"][0]["attachments"][0]["contentBase64"],
        "aXNzdWUtZXhwb3J0LWJpbmFyeQ=="
    );
    assert_eq!(
        payload["issues"][0]["attachments"][0]["contentSha256"],
        "0629ce10856feac7bb39198f2fe1122dc1aea05ddd4eb3aad2ec9d5270f79fc6"
    );
    assert_eq!(
        payload["issues"][0]["comments"][0]["contentsMarkdown"],
        "legacy data export issue comment"
    );
    assert_eq!(
        payload["issues"][0]["comments"][0]["attachments"][0]["name"],
        "issue-comment-export.txt"
    );
    assert_eq!(
        payload["issues"][0]["comments"][0]["attachments"][0]["contentBase64"],
        "aXNzdWUtY29tbWVudC1leHBvcnQtYmluYXJ5"
    );
    assert_eq!(
        payload["issues"][0]["comments"][0]["childComments"][0]["contentsMarkdown"],
        "legacy data export issue child comment"
    );
    assert_eq!(
        payload["issues"][0]["comments"].as_array().unwrap().len(),
        1
    );
    assert!(
        payload["issues"][0]["comments"][0]["createdAt"]
            .as_str()
            .is_some_and(|value| !value.is_empty()),
        "site export should carry legacy issue comment createdAt"
    );
    // Migration round-trip: the site manager's own account must be in the
    // export (excluding it orphans every manager-owned project on import),
    // and the export carries the password hash so logins survive a
    // Yoram→Yoram migration.
    let manager = payload["users"]
        .as_array()
        .unwrap()
        .iter()
        .find(|user| user["loginId"] == "siteboss")
        .expect("site manager must be part of the site export");
    assert_eq!(manager["isSiteAdmin"], true);
    assert!(
        manager["passwordHash"]
            .as_str()
            .is_some_and(|value| !value.is_empty()),
        "site export should carry the user password hash"
    );
    // The REST export route answers the migration tool over Bearer token.
    let token = repo
        .reset_api_token_for_user(admin_id)
        .await
        .expect("api token");
    let bearer_export = rest_get_with_bearer(app.clone(), "/yona/api/v1/site/export", &token).await;
    assert_eq!(bearer_export.status(), StatusCode::OK);
    let bearer_payload: Value = serde_json::from_str(&response_text(bearer_export).await).unwrap();
    assert!(bearer_payload["users"]
        .as_array()
        .unwrap()
        .iter()
        .any(|user| user["loginId"] == "siteboss"));
    // Attachment bytes are served over HTTP to the Bearer token as well
    // (the migrator's byte source stays backend-agnostic).
    let bearer_file = rest_get_with_bearer(
        app.clone(),
        &format!("/yona/files/{}", export_issue_attachment.id),
        &token,
    )
    .await;
    assert_eq!(bearer_file.status(), StatusCode::OK);
}

#[tokio::test]
async fn site_admin_import_has_rest_json_boundary_for_spa() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteimportboss").await;
    let (member_csrf, member_cookie, _member_id) =
        register_user(app.clone(), "siteimportmember").await;
    mark_site_admin(&db, admin_id).await;

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "projectMembers": [],
        "labels": [],
        "milestones": [],
        "posts": [],
        "issues": []
    });

    let unauthenticated = rest_json(
        app.clone(),
        Method::POST,
        "/yona/api/v1/site/import",
        None,
        None,
        payload.clone(),
    )
    .await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_json(
        app.clone(),
        Method::POST,
        "/yona/api/v1/site/import",
        Some(&member_cookie),
        Some(&member_csrf),
        payload.clone(),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let missing_csrf = rest_json(
        app.clone(),
        Method::POST,
        "/yona/api/v1/site/import",
        Some(&admin_cookie),
        None,
        payload.clone(),
    )
    .await;
    assert_eq!(missing_csrf.status(), StatusCode::FORBIDDEN);

    let imported = response_json(
        rest_json(
            app,
            Method::POST,
            "/yona/api/v1/site/import",
            Some(&admin_cookie),
            Some(&admin_csrf),
            payload,
        )
        .await,
    )
    .await;
    assert_eq!(imported["dryRun"], false);
    assert_eq!(imported["importedUsers"], 0);
    assert_eq!(imported["importedProjects"], 0);
}

#[tokio::test]
async fn site_admin_import_restores_supported_yobi_data_snapshot_sections() {
    let (app, repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "loginId": "imported",
            "displayName": "Imported User",
            "emailAddress": "imported@example.com",
            "createdAt": "2020-01-01T00:00:01+0000",
            "isSiteAdmin": false,
            "lastStateModifiedAt": "2020-01-01T00:00:02+0000",
            "state": "ACTIVE"
        }, {
            "loginId": "imported-member",
            "displayName": "Imported Member",
            "emailAddress": "imported-member@example.com",
            "isSiteAdmin": false,
            "state": "ACTIVE"
        }],
        "projects": [{
            "createdAt": "2020-01-01T02:03:04+0000",
            "ownerName": "imported",
            "projectName": "restored",
            "overview": "Restored from site import",
            "projectScope": "protected",
            "projectVcs": "Subversion"
        }],
        "projectMembers": [{
            "loginId": "imported",
            "ownerName": "imported",
            "projectName": "restored",
            "role": "manager"
        }, {
            "loginId": "imported-member",
            "ownerName": "imported",
            "projectName": "restored",
            "role": "member"
        }],
        "labels": [{
            "categoryIsExclusive": true,
            "categoryName": "Priority",
            "color": "#ff9800",
            "name": "Standalone label",
            "ownerName": "imported",
            "projectName": "restored"
        }],
        "milestones": [{
            "attachments": [],
            "contentsMarkdown": "restored milestone body",
            "dueDate": "",
            "ownerName": "imported",
            "projectName": "restored",
            "state": "closed",
            "title": "Imported milestone"
        }],
        "posts": [{
            "authorLoginId": "imported",
            "bodyMarkdown": "restored post body",
            "comments": [{
                "authorLoginId": "imported",
                "contentsMarkdown": "restored post comment",
                "createdAt": "2020-01-02T03:04:05+0000"
            }],
            "createdAt": "2020-01-02T03:00:00+0000",
            "historyMarkdown": "previous post body",
            "labels": [{
                "categoryIsExclusive": false,
                "categoryName": "Type",
                "color": "#f44336",
                "name": "Notice"
            }],
            "notice": true,
            "ownerName": "imported",
            "projectName": "restored",
            "readme": false,
            "title": "Restored post",
            "updatedAt": "2020-01-03T04:05:06+0000"
        }],
        "issues": [{
            "assigneeLoginId": "",
            "authorLoginId": "imported",
            "bodyMarkdown": "restored issue body",
            "comments": [{
                "authorLoginId": "imported",
                "contentsMarkdown": "restored issue comment",
                "createdAt": "2020-01-04T05:06:07+0000"
            }],
            "createdAt": "2020-01-04T05:00:00+0000",
            "historyMarkdown": "previous issue body",
            "milestoneTitle": "Imported milestone",
            "ownerName": "imported",
            "projectName": "restored",
            "labels": [{
                "categoryIsExclusive": false,
                "categoryName": "Type",
                "color": "#2196f3",
                "name": "Bug"
            }],
            "state": "closed",
            "title": "Restored issue",
            "updatedAt": "2020-01-05T06:07:08+0000"
        }]
    });

    let unauthenticated = rest_raw_post(
        app.clone(),
        "/yona/sites/import",
        None,
        None,
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_raw_post(
        app.clone(),
        "/yona/sites/import",
        Some(&member_cookie),
        Some(&member_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let missing_csrf = rest_raw_post(
        app.clone(),
        "/yona/sites/import",
        Some(&admin_cookie),
        None,
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(missing_csrf.status(), StatusCode::FORBIDDEN);

    let boundary = "yona-import-boundary";
    let missing_data_multipart = format!(
        "--{boundary}\r\nContent-Disposition: form-data; name=\"csrfToken\"\r\n\r\n{admin_csrf}\r\n--{boundary}--\r\n",
    );
    let missing_data = rest_raw_post(
        app.clone(),
        "/yona/sites/import",
        Some(&admin_cookie),
        None,
        &format!("multipart/form-data; boundary={boundary}"),
        &missing_data_multipart,
    )
    .await;
    assert_eq!(missing_data.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        missing_data
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/sites/data")
    );

    let multipart = format!(
        "--{boundary}\r\nContent-Disposition: form-data; name=\"csrfToken\"\r\n\r\n{admin_csrf}\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"data\"; filename=\"yobi-data.json\"\r\nContent-Type: application/json\r\n\r\n{}\r\n--{boundary}--\r\n",
        payload
    );
    let imported = rest_raw_post(
        app.clone(),
        "/yona/sites/import",
        Some(&admin_cookie),
        None,
        &format!("multipart/form-data; boundary={boundary}"),
        &multipart,
    )
    .await;
    assert_eq!(imported.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        imported
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/")
    );

    let users = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=ACTIVE&query=imported",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert!(users["users"]
        .as_array()
        .unwrap()
        .iter()
        .any(|user| { user["loginId"] == "imported" && user["displayName"] == "Imported User" }));
    let imported_user = users["users"]
        .as_array()
        .unwrap()
        .iter()
        .find(|user| user["loginId"] == "imported")
        .expect("imported user in site list");
    assert_eq!(
        imported_user["createdAt"]
            .as_str()
            .expect("imported user created date")
            .replace(' ', "T"),
        "2020-01-01T00:00:01"
    );
    assert_eq!(
        imported_user["lastStateModifiedAt"]
            .as_str()
            .expect("imported user last state modified date")
            .replace(' ', "T"),
        "2020-01-01T00:00:02"
    );

    let projects = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/projects?filter=restored",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(projects["projects"][0]["ownerName"], "imported");
    assert_eq!(projects["projects"][0]["projectName"], "restored");
    assert_eq!(projects["projects"][0]["projectScope"], "protected");
    assert_eq!(projects["projects"][0]["vcs"], "Subversion");
    assert_eq!(
        projects["projects"][0]["createdAt"]
            .as_str()
            .expect("imported project created date")
            .replace(' ', "T"),
        "2020-01-01T02:03:04"
    );

    let members = repo
        .read_project_members("imported", "restored")
        .await
        .expect("read imported project members");
    assert!(members
        .members
        .iter()
        .any(|member| { member.login_id == "imported" && member.role == "manager" }));
    assert!(members
        .members
        .iter()
        .any(|member| { member.login_id == "imported-member" && member.role == "member" }));

    let labels = repo
        .list_project_labels("imported", "restored")
        .await
        .expect("list imported labels");
    let standalone_label = labels
        .iter()
        .find(|label| label.name == "Standalone label")
        .expect("standalone label restored");
    assert_eq!(standalone_label.category_name, "Priority");
    assert_eq!(standalone_label.category_is_exclusive, true);
    assert_eq!(standalone_label.color, "#ff9800");

    let milestones = repo
        .list_project_milestones(
            "imported",
            "restored",
            MilestoneListFilter {
                order_by: "dueDate".to_string(),
                order_dir: "asc".to_string(),
                state: "all".to_string(),
            },
        )
        .await
        .expect("list imported milestones");
    assert_eq!(milestones.len(), 1);
    assert_eq!(milestones[0].title, "Imported milestone");
    assert_eq!(milestones[0].state, "closed");
    assert_eq!(milestones[0].contents_markdown, "restored milestone body");

    let posts =
        response_json(rest_get(app.clone(), "/yona/api/v1/site/posts", Some(&admin_cookie)).await)
            .await;
    assert_eq!(posts["posts"][0]["title"], "Restored post");
    assert_eq!(posts["posts"][0]["labels"][0]["name"], "Notice");
    assert_eq!(posts["posts"][0]["labels"][0]["categoryName"], "Type");
    let post_detail = repo
        .read_posting_detail_for_viewer("imported", "restored", 1, None)
        .await
        .expect("read imported post")
        .expect("imported post exists");
    assert_eq!(post_detail.comments.len(), 1);
    assert_eq!(
        post_detail.comments[0].contents_markdown,
        "restored post comment"
    );
    assert_eq!(
        post_detail
            .created_at
            .expect("imported post created date")
            .format("%Y-%m-%dT%H:%M:%S+0000")
            .to_string(),
        "2020-01-02T03:00:00+0000"
    );
    assert_eq!(
        post_detail
            .updated_at
            .expect("imported post updated date")
            .format("%Y-%m-%dT%H:%M:%S+0000")
            .to_string(),
        "2020-01-03T04:05:06+0000"
    );
    assert_eq!(
        post_detail.comments[0]
            .created_at
            .expect("imported post comment created date")
            .format("%Y-%m-%dT%H:%M:%S+0000")
            .to_string(),
        "2020-01-02T03:04:05+0000"
    );
    assert_eq!(post_detail.history_markdown, "previous post body");

    let issues = response_json(
        rest_get(
            app,
            "/yona/api/v1/site/issues?state=closed",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(issues["issues"][0]["title"], "Restored issue");
    assert_eq!(issues["issues"][0]["labels"][0]["name"], "Bug");
    assert_eq!(issues["issues"][0]["labels"][0]["categoryName"], "Type");
    let issue_detail = repo
        .read_issue_detail("imported", "restored", 1)
        .await
        .expect("read imported issue")
        .expect("imported issue exists");
    assert_eq!(issue_detail.comments.len(), 1);
    assert_eq!(
        issue_detail.comments[0].contents_markdown,
        "restored issue comment"
    );
    assert_eq!(issue_detail.history_markdown, "previous issue body");
    assert_eq!(issue_detail.milestone_title, "Imported milestone");
    assert_eq!(
        issue_detail
            .created_at
            .expect("imported issue created date")
            .format("%Y-%m-%dT%H:%M:%S+0000")
            .to_string(),
        "2020-01-04T05:00:00+0000"
    );
    assert_eq!(
        issue_detail
            .updated_at
            .expect("imported issue updated date")
            .format("%Y-%m-%dT%H:%M:%S+0000")
            .to_string(),
        "2020-01-05T06:07:08+0000"
    );
    assert_eq!(
        issue_detail.comments[0]
            .created_at
            .expect("imported issue comment created date")
            .format("%Y-%m-%dT%H:%M:%S+0000")
            .to_string(),
        "2020-01-04T05:06:07+0000"
    );
}

#[tokio::test]
async fn site_admin_import_rebinds_existing_attachment_ids_from_yobi_data_snapshot() {
    let (app, repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "restored",
    )
    .await;
    let post_attachment = insert_attachment(
        &db,
        "USER",
        member_id,
        "member",
        "post-import.png",
        "image/png",
    )
    .await;
    let post_comment_attachment = insert_attachment(
        &db,
        "USER",
        member_id,
        "member",
        "post-comment-import.txt",
        "text/plain",
    )
    .await;
    let issue_attachment = insert_attachment(
        &db,
        "USER",
        member_id,
        "member",
        "issue-import.png",
        "image/png",
    )
    .await;
    let issue_comment_attachment = insert_attachment(
        &db,
        "USER",
        member_id,
        "member",
        "issue-comment-import.txt",
        "text/plain",
    )
    .await;

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "posts": [{
            "authorLoginId": "member",
            "attachments": [{
                "id": post_attachment.id,
                "mimeType": "image/png",
                "name": "post-import.png",
                "size": 256
            }],
            "bodyMarkdown": "post with imported attachment",
            "comments": [{
                "attachments": [{
                    "id": post_comment_attachment.id,
                    "mimeType": "text/plain",
                    "name": "post-comment-import.txt",
                    "size": 256
                }],
                "authorLoginId": "member",
                "contentsMarkdown": "post comment with imported attachment"
            }],
            "ownerName": "member",
            "projectName": "restored",
            "title": "Attached imported post"
        }],
        "issues": [{
            "authorLoginId": "member",
            "attachments": [{
                "id": issue_attachment.id,
                "mimeType": "image/png",
                "name": "issue-import.png",
                "size": 256
            }],
            "bodyMarkdown": "issue with imported attachment",
            "comments": [{
                "attachments": [{
                    "id": issue_comment_attachment.id,
                    "mimeType": "text/plain",
                    "name": "issue-comment-import.txt",
                    "size": 256
                }],
                "authorLoginId": "member",
                "contentsMarkdown": "issue comment with imported attachment"
            }],
            "ownerName": "member",
            "projectName": "restored",
            "state": "open",
            "title": "Attached imported issue"
        }]
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    let imported = response_json(response).await;
    assert_eq!(imported["importedPosts"], 1);
    assert_eq!(imported["importedIssues"], 1);

    let post_detail = repo
        .read_posting_detail_for_viewer("member", "restored", 1, None)
        .await
        .expect("read imported post")
        .expect("imported post exists");
    assert_eq!(post_detail.attachments.len(), 1);
    assert_eq!(post_detail.attachments[0].name, "post-import.png");
    assert_eq!(post_detail.comments[0].attachments.len(), 1);
    assert_eq!(
        post_detail.comments[0].attachments[0].name,
        "post-comment-import.txt"
    );

    let issue_detail = repo
        .read_issue_detail("member", "restored", 1)
        .await
        .expect("read imported issue")
        .expect("imported issue exists");
    assert_eq!(issue_detail.attachments.len(), 1);
    assert_eq!(issue_detail.attachments[0].name, "issue-import.png");
    assert_eq!(issue_detail.comments[0].attachments.len(), 1);
    assert_eq!(
        issue_detail.comments[0].attachments[0].name,
        "issue-comment-import.txt"
    );
}

#[tokio::test]
async fn site_admin_import_restores_preexisting_attachment_rebinding_after_downstream_failure() {
    let (app, repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "restore-attachment",
    )
    .await;
    let preexisting_attachment = insert_attachment(
        &db,
        "USER",
        member_id,
        "member",
        "preexisting.txt",
        "text/plain",
    )
    .await;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        "CREATE TRIGGER fail_rebind_issue_comment_insert BEFORE INSERT ON issue_comment \
         BEGIN SELECT RAISE(FAIL, 'forced rebinding issue comment import failure'); END"
            .to_string(),
    ))
    .await
    .expect("install issue comment failure trigger");

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "posts": [{
            "authorLoginId": "member",
            "attachments": [{
                "id": preexisting_attachment.id,
                "mimeType": "text/plain",
                "name": "preexisting.txt",
                "size": 256
            }],
            "bodyMarkdown": "post temporarily rebinds existing attachment",
            "comments": [],
            "ownerName": "member",
            "projectName": "restore-attachment",
            "title": "Temporary imported post"
        }],
        "issues": [{
            "authorLoginId": "member",
            "bodyMarkdown": "issue reaches failing comment insert",
            "comments": [{
                "authorLoginId": "member",
                "contentsMarkdown": "comment triggers rebinding rollback"
            }],
            "ownerName": "member",
            "projectName": "restore-attachment",
            "state": "open",
            "title": "Temporary imported issue"
        }]
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    assert!(response_text(response)
        .await
        .contains("forced rebinding issue comment import failure"));

    assert!(repo
        .read_posting_detail_for_viewer("member", "restore-attachment", 1, None)
        .await
        .expect("read rolled-back post")
        .is_none());
    let restored_attachment = repo
        .read_attachment_by_id(preexisting_attachment.id)
        .await
        .expect("read restored attachment")
        .expect("restored attachment exists");
    assert_eq!(restored_attachment.container_type, "USER");
    assert_eq!(restored_attachment.container_id, member_id);
    assert_eq!(restored_attachment.name, "preexisting.txt");
    assert_eq!(restored_attachment.owner_login_id, "member");
}

#[tokio::test]
async fn site_admin_import_restores_portable_attachment_content_from_yobi_data_snapshot() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "portable",
    )
    .await;

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "posts": [{
            "authorLoginId": "member",
            "attachments": [{
                "contentBase64": "cG9ydGFibGUtcG9zdC1maWxl",
                "createdAt": "2020-02-01T01:02:03+0000",
                "id": 901,
                "mimeType": "text/plain",
                "name": "portable-post.txt",
                "size": 18
            }],
            "bodyMarkdown": "post with portable attachment /files/901",
            "comments": [{
                "attachments": [{
                    "contentBase64": "cG9ydGFibGUtY29tbWVudC1maWxl",
                    "createdAt": "2020-02-02T02:03:04+0000",
                    "id": 902,
                    "mimeType": "text/plain",
                    "name": "portable-comment.txt",
                    "size": 21
                }],
                "authorLoginId": "member",
                "childComments": [{
                    "authorLoginId": "member",
                    "contentsMarkdown": "child comment with portable attachment"
                }],
                "contentsMarkdown": "comment with portable attachment /files/902"
            }],
            "ownerName": "member",
            "projectName": "portable",
            "title": "Portable attached post"
        }],
        "issues": []
    });

    let response = rest_raw_post(
        app.clone(),
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    let imported = response_json(response).await;
    assert_eq!(imported["importedPosts"], 1);

    let post_detail = repo
        .read_posting_detail_for_viewer("member", "portable", 1, None)
        .await
        .expect("read imported post")
        .expect("imported post exists");
    assert_eq!(post_detail.attachments[0].name, "portable-post.txt");
    let post_attachment = repo
        .read_attachment_by_id(post_detail.attachments[0].id)
        .await
        .expect("read post attachment")
        .expect("post attachment exists");
    let post_hash = post_attachment.hash.as_str();
    assert_eq!(
        post_attachment
            .created_at
            .expect("portable post attachment created date")
            .format("%Y-%m-%dT%H:%M:%S+0000")
            .to_string(),
        "2020-02-01T01:02:03+0000"
    );
    assert_eq!(
        std::fs::read(data_dir.path().join("uploads").join(post_hash)).expect("post bytes"),
        b"portable-post-file"
    );
    let post_download = rest_get(
        app.clone(),
        &format!("/yona/files/{}", post_attachment.id),
        Some(&member_cookie),
    )
    .await;
    assert_eq!(post_download.status(), StatusCode::OK);
    assert_eq!(response_bytes(post_download).await, b"portable-post-file");
    assert_eq!(
        post_detail.body_markdown,
        format!(
            "post with portable attachment /files/{}",
            post_attachment.id
        )
    );

    assert_eq!(
        post_detail.comments[0].attachments[0].name,
        "portable-comment.txt"
    );
    let comment_attachment = repo
        .read_attachment_by_id(post_detail.comments[0].attachments[0].id)
        .await
        .expect("read comment attachment")
        .expect("comment attachment exists");
    let comment_hash = comment_attachment.hash.as_str();
    assert_eq!(
        comment_attachment
            .created_at
            .expect("portable comment attachment created date")
            .format("%Y-%m-%dT%H:%M:%S+0000")
            .to_string(),
        "2020-02-02T02:03:04+0000"
    );
    assert_eq!(
        std::fs::read(data_dir.path().join("uploads").join(comment_hash)).expect("comment bytes"),
        b"portable-comment-file"
    );
    let comment_download = rest_get(
        app,
        &format!("/yona/files/{}", comment_attachment.id),
        Some(&member_cookie),
    )
    .await;
    assert_eq!(comment_download.status(), StatusCode::OK);
    assert_eq!(
        response_bytes(comment_download).await,
        b"portable-comment-file"
    );
    assert!(
        !imported_upload_staging_dir(&data_dir).exists(),
        "successful import must promote and remove staged portable files"
    );
    assert_eq!(
        post_detail.comments[0].contents_markdown,
        format!(
            "comment with portable attachment /files/{}",
            comment_attachment.id
        )
    );
    let parent_comment = post_detail
        .comments
        .iter()
        .find(|comment| {
            comment
                .contents_markdown
                .starts_with("comment with portable")
        })
        .expect("parent comment");
    let child_comment = post_detail
        .comments
        .iter()
        .find(|comment| comment.contents_markdown == "child comment with portable attachment")
        .expect("child comment");
    assert_eq!(child_comment.parent_comment_id, Some(parent_comment.id));
}

#[tokio::test]
async fn site_admin_import_cleans_leftover_staging_before_live_import() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "portable-cleanup",
    )
    .await;

    let staging_dir = imported_upload_staging_dir(&data_dir);
    let leftover_dir = staging_dir.join("previous-import");
    std::fs::create_dir_all(&leftover_dir).expect("leftover staging dir");
    std::fs::write(leftover_dir.join("leftover-hash"), b"orphaned staged bytes")
        .expect("leftover staged bytes");
    let final_upload_sentinel = data_dir.path().join("uploads").join("existing-final-hash");
    std::fs::write(&final_upload_sentinel, b"existing final upload")
        .expect("existing final upload");

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "posts": [{
            "authorLoginId": "member",
            "attachments": [{
                "contentBase64": "Y2xlYW51cC1wb3J0YWJsZS1maWxl",
                "id": 9902,
                "mimeType": "text/plain",
                "name": "cleanup-portable.txt",
                "size": 21
            }],
            "bodyMarkdown": "post with portable attachment /files/9902",
            "comments": [],
            "ownerName": "member",
            "projectName": "portable-cleanup",
            "title": "Portable cleanup post"
        }],
        "issues": []
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    let imported = response_json(response).await;
    assert_eq!(imported["importedPosts"], 1);

    assert!(
        !staging_dir.exists(),
        "successful live import must remove prior import-local staging leftovers"
    );
    assert!(
        final_upload_sentinel.exists(),
        "staging cleanup must not remove normal upload files"
    );
    let post_detail = repo
        .read_posting_detail_for_viewer("member", "portable-cleanup", 1, None)
        .await
        .expect("read imported post")
        .expect("imported post exists");
    let attachment = repo
        .read_attachment_by_id(post_detail.attachments[0].id)
        .await
        .expect("read imported attachment")
        .expect("imported attachment exists");
    assert_eq!(
        std::fs::read(data_dir.path().join("uploads").join(&attachment.hash))
            .expect("promoted portable bytes"),
        b"cleanup-portable-file"
    );
}

#[tokio::test]
async fn site_admin_import_repairs_committed_staged_attachment_before_live_import_cleanup() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, _repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (_member_csrf, _member_cookie, member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    let committed_attachment = attachment::ActiveModel {
        id: NotSet,
        name: Set(Some("crash-window.txt".to_string())),
        hash: Set(Some("site-import-crash-window-hash".to_string())),
        container_type: Set(Some("USER".to_string())),
        mime_type: Set(Some("text/plain".to_string())),
        size: Set(Some(27)),
        container_id: Set(member_id),
        created_date: Set(Some(
            DateTime::parse_from_str("2020-03-01 00:00:00", "%Y-%m-%d %H:%M:%S")
                .expect("attachment timestamp"),
        )),
        owner_login_id: Set(Some("member".to_string())),
    }
    .insert(&db)
    .await
    .expect("committed attachment row");
    let hash = committed_attachment
        .hash
        .as_deref()
        .expect("attachment hash");
    let staging_dir = imported_upload_staging_dir(&data_dir);
    let staged_import_dir = staging_dir.join("committed-import");
    std::fs::create_dir_all(&staged_import_dir).expect("staged import dir");
    std::fs::write(
        staged_import_dir.join(hash),
        b"committed staged crash bytes",
    )
    .expect("staged bytes");
    std::fs::write(
        staged_import_dir.join(format!("{hash}.json")),
        json!({
            "attachmentId": committed_attachment.id,
            "hash": hash,
            "version": 1
        })
        .to_string(),
    )
    .expect("staged journal");
    let final_path = data_dir.path().join("uploads").join(hash);
    assert!(
        !final_path.exists(),
        "fixture should model the post-commit/pre-promotion crash window"
    );

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "posts": [],
        "issues": []
    });
    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    let imported = response_json(response).await;
    assert_eq!(imported["importedPosts"], 0);
    assert_eq!(
        std::fs::read(&final_path).expect("repaired final upload"),
        b"committed staged crash bytes"
    );
    assert!(
        !staging_dir.exists(),
        "repair should promote committed staged bytes before cleanup removes stale staging"
    );
}

#[tokio::test]
async fn site_admin_startup_reconciles_committed_staged_attachment_before_serving_files() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let app_config = AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    };
    let (setup_app, repo, db) = build_app_with_app_config(app_config.clone()).await;
    let (_member_csrf, member_cookie, member_id) = register_user(setup_app, "member").await;

    let committed_attachment = attachment::ActiveModel {
        id: NotSet,
        name: Set(Some("startup-crash-window.txt".to_string())),
        hash: Set(Some("site-import-startup-crash-window-hash".to_string())),
        container_type: Set(Some("USER_AVATAR".to_string())),
        mime_type: Set(Some("text/plain".to_string())),
        size: Set(Some(33)),
        container_id: Set(member_id),
        created_date: Set(Some(
            DateTime::parse_from_str("2020-03-01 00:00:00", "%Y-%m-%d %H:%M:%S")
                .expect("attachment timestamp"),
        )),
        owner_login_id: Set(Some("member".to_string())),
    }
    .insert(&db)
    .await
    .expect("committed attachment row");
    let hash = committed_attachment
        .hash
        .as_deref()
        .expect("attachment hash");
    let staging_dir = imported_upload_staging_dir(&data_dir);
    let staged_import_dir = staging_dir.join("startup-committed-import");
    std::fs::create_dir_all(&staged_import_dir).expect("staged import dir");
    std::fs::write(
        staged_import_dir.join(hash),
        b"committed staged startup crash bytes",
    )
    .expect("staged bytes");
    std::fs::write(
        staged_import_dir.join(format!("{hash}.json")),
        json!({
            "attachmentId": committed_attachment.id,
            "hash": hash,
            "version": 1
        })
        .to_string(),
    )
    .expect("staged journal");
    let final_path = data_dir.path().join("uploads").join(hash);
    assert!(
        !final_path.exists(),
        "fixture should model the post-commit/pre-promotion crash window"
    );

    reconcile_site_import_staging_uploads_for_startup(data_dir.path(), &repo)
        .await
        .expect("startup staging reconciliation");
    assert_eq!(
        std::fs::read(&final_path).expect("repaired final upload"),
        b"committed staged startup crash bytes"
    );
    assert!(
        !staging_dir.exists(),
        "startup repair should remove the repaired staged file and empty staging parents"
    );

    let app = create_router_with_repository_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        repo,
        app_config,
    );
    let download = rest_get(
        app,
        &format!("/yona/files/{}", committed_attachment.id),
        Some(&member_cookie),
    )
    .await;
    assert_eq!(download.status(), StatusCode::OK);
    assert_eq!(
        response_bytes(download).await,
        b"committed staged startup crash bytes"
    );
}

#[tokio::test]
async fn site_admin_import_preserves_committed_staging_when_final_upload_differs() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, _repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (_member_csrf, _member_cookie, member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    let committed_attachment = attachment::ActiveModel {
        id: NotSet,
        name: Set(Some("crash-window-conflict.txt".to_string())),
        hash: Set(Some("site-import-crash-window-conflict-hash".to_string())),
        container_type: Set(Some("USER".to_string())),
        mime_type: Set(Some("text/plain".to_string())),
        size: Set(Some(31)),
        container_id: Set(member_id),
        created_date: Set(Some(
            DateTime::parse_from_str("2020-03-01 00:00:00", "%Y-%m-%d %H:%M:%S")
                .expect("attachment timestamp"),
        )),
        owner_login_id: Set(Some("member".to_string())),
    }
    .insert(&db)
    .await
    .expect("committed attachment row");
    let hash = committed_attachment
        .hash
        .as_deref()
        .expect("attachment hash");
    let staging_dir = imported_upload_staging_dir(&data_dir);
    let staged_import_dir = staging_dir.join("committed-import-conflict");
    std::fs::create_dir_all(&staged_import_dir).expect("staged import dir");
    let staging_path = staged_import_dir.join(hash);
    let journal_path = staged_import_dir.join(format!("{hash}.json"));
    std::fs::write(&staging_path, b"committed staged recovery bytes").expect("staged bytes");
    std::fs::write(
        &journal_path,
        json!({
            "attachmentId": committed_attachment.id,
            "hash": hash,
            "version": 1
        })
        .to_string(),
    )
    .expect("staged journal");
    let final_path = data_dir.path().join("uploads").join(hash);
    std::fs::write(&final_path, b"conflicting final upload bytes").expect("final bytes");

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "posts": [],
        "issues": []
    });
    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(
        std::fs::read(&final_path).expect("final upload remains"),
        b"conflicting final upload bytes"
    );
    assert_eq!(
        std::fs::read(&staging_path).expect("staged recovery bytes remain"),
        b"committed staged recovery bytes"
    );
    assert!(
        journal_path.exists(),
        "journal must remain so a mismatched final file is not silently treated as repaired"
    );
}

#[tokio::test]
async fn site_admin_import_dry_run_reports_counts_and_never_writes() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, _repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        max_uploaded_file_size: 8,
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let before_users = n4user::Entity::find().all(&db).await.unwrap().len();
    let before_projects = project::Entity::find().all(&db).await.unwrap().len();
    let before_posts = posting::Entity::find().all(&db).await.unwrap().len();
    let before_issues = issue::Entity::find().all(&db).await.unwrap().len();
    let before_milestones = milestone::Entity::find().all(&db).await.unwrap().len();
    let before_attachments = attachment::Entity::find().all(&db).await.unwrap().len();

    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "loginId": "dry-imported",
            "displayName": "Dry Imported User",
            "emailAddress": "dry-imported@example.com",
            "isSiteAdmin": false,
            "state": "ACTIVE"
        }, {
            "loginId": "siteboss",
            "displayName": "Existing Site Boss",
            "emailAddress": "siteboss@example.com",
            "isSiteAdmin": true,
            "state": "ACTIVE"
        }],
        "projects": [{
            "ownerName": "dry-imported",
            "projectName": "dry-restored",
            "overview": "Dry-run restored project",
            "projectScope": "public",
            "projectVcs": "GIT"
        }, {
            "ownerName": "missing-owner",
            "projectName": "skipped-project",
            "overview": "Skipped because owner is absent",
            "projectScope": "public",
            "projectVcs": "GIT"
        }],
        "projectMembers": [{
            "loginId": "dry-imported",
            "ownerName": "dry-imported",
            "projectName": "dry-restored",
            "role": "manager"
        }, {
            "loginId": "missing-member",
            "ownerName": "dry-imported",
            "projectName": "dry-restored",
            "role": "member"
        }],
        "labels": [{
            "categoryIsExclusive": false,
            "categoryName": "Type",
            "color": "#4caf50",
            "name": "Dry label",
            "ownerName": "dry-imported",
            "projectName": "dry-restored"
        }],
        "milestones": [{
            "attachments": [{
                "contentBase64": "ZHJ5",
                "id": 701,
                "mimeType": "text/plain",
                "name": "dry.txt",
                "size": 3
            }],
            "contentsMarkdown": "dry milestone body",
            "dueDate": "",
            "ownerName": "dry-imported",
            "projectName": "dry-restored",
            "state": "open",
            "title": "Dry milestone"
        }],
        "posts": [{
            "authorLoginId": "dry-imported",
            "attachments": [{
                "contentBase64": "cG9ydGFibGUtcG9zdC1maWxl",
                "id": 702,
                "mimeType": "text/plain",
                "name": "too-large.txt",
                "size": 18
            }],
            "bodyMarkdown": "dry-run post with oversized portable attachment",
            "comments": [],
            "ownerName": "dry-imported",
            "projectName": "dry-restored",
            "title": "Dry-run post"
        }],
        "issues": [{
            "authorLoginId": "dry-imported",
            "bodyMarkdown": "skipped issue",
            "comments": [],
            "ownerName": "missing-owner",
            "projectName": "skipped-project",
            "state": "open",
            "title": "Skipped issue"
        }]
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import?dryRun=true",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    let report = response_json(response).await;
    assert_eq!(report["dryRun"], true);
    assert_eq!(report["importedUsers"], 0);
    assert_eq!(report["importedProjects"], 0);
    assert_eq!(report["importedPosts"], 0);
    assert_eq!(report["importedIssues"], 0);
    assert_eq!(report["importedMilestones"], 0);
    assert_eq!(report["wouldImportUsers"], 1);
    assert_eq!(report["wouldSkipUsers"], 1);
    assert_eq!(report["wouldImportProjects"], 1);
    assert_eq!(report["wouldSkipProjects"], 1);
    assert_eq!(report["wouldImportProjectMembers"], 1);
    assert_eq!(report["wouldSkipProjectMembers"], 1);
    assert_eq!(report["wouldImportLabels"], 1);
    assert_eq!(report["wouldImportMilestones"], 1);
    assert_eq!(report["wouldImportPosts"], 0);
    assert_eq!(report["wouldSkipPosts"], 1);
    assert_eq!(report["wouldSkipIssues"], 1);
    assert_eq!(report["wouldImportAttachments"], 1);
    assert_eq!(report["wouldSkipAttachments"], 1);
    assert_eq!(
        report["validationErrors"][0]["message"],
        "site.import.attachment.tooLarge"
    );
    assert_eq!(report["checkpoint"]["version"], 1);
    assert!(report["checkpoint"]["failure"].is_null());
    let checkpoint_sections = report["checkpoint"]["sections"]
        .as_array()
        .expect("checkpoint sections");
    let users_checkpoint = checkpoint_sections
        .iter()
        .find(|section| section["section"] == "users")
        .expect("users checkpoint");
    assert_eq!(users_checkpoint["total"], 2);
    assert_eq!(users_checkpoint["validated"], 2);
    assert_eq!(users_checkpoint["skipped"], 1);
    assert!(users_checkpoint["resourceKeys"]
        .as_array()
        .expect("user resource keys")
        .iter()
        .any(|key| key == "users:dry-imported"));
    let projects_checkpoint = checkpoint_sections
        .iter()
        .find(|section| section["section"] == "projects")
        .expect("projects checkpoint");
    assert!(projects_checkpoint["resourceKeys"]
        .as_array()
        .expect("project resource keys")
        .iter()
        .any(|key| key == "projects:dry-imported/dry-restored"));
    let attachments_checkpoint = checkpoint_sections
        .iter()
        .find(|section| section["section"] == "attachments")
        .expect("attachments checkpoint");
    assert_eq!(attachments_checkpoint["total"], 2);
    assert_eq!(attachments_checkpoint["validated"], 2);
    assert!(attachments_checkpoint["resourceKeys"]
        .as_array()
        .expect("attachment resource keys")
        .iter()
        .any(|key| key == "attachments:701:dry.txt"));

    assert_eq!(
        n4user::Entity::find().all(&db).await.unwrap().len(),
        before_users
    );
    assert_eq!(
        project::Entity::find().all(&db).await.unwrap().len(),
        before_projects
    );
    assert_eq!(
        posting::Entity::find().all(&db).await.unwrap().len(),
        before_posts
    );
    assert_eq!(
        issue::Entity::find().all(&db).await.unwrap().len(),
        before_issues
    );
    assert_eq!(
        milestone::Entity::find().all(&db).await.unwrap().len(),
        before_milestones
    );
    assert_eq!(
        attachment::Entity::find().all(&db).await.unwrap().len(),
        before_attachments
    );
    assert!(
        !data_dir.path().join("uploads").exists(),
        "dry-run must not write portable attachment files"
    );
}

#[tokio::test]
async fn site_admin_import_live_preflight_rejects_duplicate_resource_keys_without_partial_writes() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let before_users = n4user::Entity::find().all(&db).await.unwrap().len();
    let before_projects = project::Entity::find().all(&db).await.unwrap().len();
    let before_members = project_user::Entity::find().all(&db).await.unwrap().len();
    let before_labels = issue_label::Entity::find().all(&db).await.unwrap().len();
    let before_milestones = milestone::Entity::find().all(&db).await.unwrap().len();
    let before_posts = posting::Entity::find().all(&db).await.unwrap().len();
    let before_issues = issue::Entity::find().all(&db).await.unwrap().len();

    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "loginId": "duplicate-owner",
            "displayName": "Duplicate Owner",
            "emailAddress": "duplicate-owner@example.com",
            "isSiteAdmin": false,
            "state": "ACTIVE"
        }, {
            "loginId": "duplicate-owner",
            "displayName": "Conflicting Owner Name",
            "emailAddress": "conflicting-owner@example.com",
            "isSiteAdmin": true,
            "state": "ACTIVE"
        }],
        "projects": [{
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project",
            "overview": "First project payload",
            "projectScope": "public",
            "projectVcs": "GIT"
        }, {
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project",
            "overview": "Conflicting project payload",
            "projectScope": "private",
            "projectVcs": "SVN"
        }],
        "projectMembers": [{
            "loginId": "duplicate-owner",
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project",
            "role": "manager"
        }, {
            "loginId": "duplicate-owner",
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project",
            "role": "member"
        }],
        "labels": [{
            "categoryIsExclusive": false,
            "categoryName": "Type",
            "color": "#4caf50",
            "name": "Duplicate label",
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project"
        }, {
            "categoryIsExclusive": true,
            "categoryName": "Type",
            "color": "#f44336",
            "name": "Duplicate label",
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project"
        }],
        "milestones": [{
            "attachments": [],
            "contentsMarkdown": "first milestone",
            "dueDate": "",
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project",
            "state": "open",
            "title": "Duplicate milestone"
        }, {
            "attachments": [],
            "contentsMarkdown": "conflicting milestone",
            "dueDate": "",
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project",
            "state": "closed",
            "title": "Duplicate milestone"
        }],
        "posts": [{
            "authorLoginId": "duplicate-owner",
            "attachments": [],
            "bodyMarkdown": "first duplicate post body",
            "comments": [],
            "ownerName": "duplicate-owner",
            "postNumber": "17",
            "projectName": "duplicate-project",
            "title": "Duplicate post"
        }, {
            "authorLoginId": "duplicate-owner",
            "attachments": [],
            "bodyMarkdown": "conflicting duplicate post body",
            "comments": [],
            "ownerName": "duplicate-owner",
            "postNumber": "17",
            "projectName": "duplicate-project",
            "title": "Duplicate post with conflicting body"
        }, {
            "authorLoginId": "duplicate-owner",
            "attachments": [],
            "bodyMarkdown": "first title-key duplicate post body",
            "comments": [],
            "ownerName": "duplicate-owner",
            "postNumber": "",
            "projectName": "duplicate-project",
            "title": "Duplicate title-only post"
        }, {
            "authorLoginId": "duplicate-owner",
            "attachments": [],
            "bodyMarkdown": "conflicting title-key duplicate post body",
            "comments": [],
            "ownerName": "duplicate-owner",
            "postNumber": "",
            "projectName": "duplicate-project",
            "title": "Duplicate title-only post"
        }],
        "issues": [{
            "assigneeLoginId": "",
            "authorLoginId": "duplicate-owner",
            "attachments": [],
            "bodyMarkdown": "first duplicate issue body",
            "comments": [],
            "issueNumber": "23",
            "milestoneTitle": "",
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project",
            "state": "open",
            "title": "Duplicate issue"
        }, {
            "assigneeLoginId": "",
            "authorLoginId": "duplicate-owner",
            "attachments": [],
            "bodyMarkdown": "conflicting duplicate issue body",
            "comments": [],
            "issueNumber": "23",
            "milestoneTitle": "",
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project",
            "state": "closed",
            "title": "Duplicate issue with conflicting body"
        }, {
            "assigneeLoginId": "",
            "authorLoginId": "duplicate-owner",
            "attachments": [],
            "bodyMarkdown": "first title-key duplicate issue body",
            "comments": [],
            "issueNumber": "",
            "milestoneTitle": "",
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project",
            "state": "open",
            "title": "Duplicate title-only issue"
        }, {
            "assigneeLoginId": "",
            "authorLoginId": "duplicate-owner",
            "attachments": [],
            "bodyMarkdown": "conflicting title-key duplicate issue body",
            "comments": [],
            "issueNumber": "",
            "milestoneTitle": "",
            "ownerName": "duplicate-owner",
            "projectName": "duplicate-project",
            "state": "closed",
            "title": "Duplicate title-only issue"
        }]
    });

    let dry_run_response = rest_raw_post(
        app.clone(),
        "/yona/sites/import?dryRun=true",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    let dry_run_report = response_json(dry_run_response).await;
    assert_eq!(dry_run_report["dryRun"], true);
    assert_eq!(dry_run_report["wouldImportUsers"], 1);
    assert_eq!(dry_run_report["wouldSkipUsers"], 1);
    assert_eq!(dry_run_report["wouldImportProjects"], 1);
    assert_eq!(dry_run_report["wouldSkipProjects"], 1);
    assert_eq!(dry_run_report["wouldImportProjectMembers"], 1);
    assert_eq!(dry_run_report["wouldSkipProjectMembers"], 1);
    assert_eq!(dry_run_report["wouldImportLabels"], 1);
    assert_eq!(dry_run_report["wouldSkipLabels"], 1);
    assert_eq!(dry_run_report["wouldImportMilestones"], 1);
    assert_eq!(dry_run_report["wouldSkipMilestones"], 1);
    assert_eq!(dry_run_report["wouldImportPosts"], 2);
    assert_eq!(dry_run_report["wouldSkipPosts"], 2);
    assert_eq!(dry_run_report["wouldImportIssues"], 2);
    assert_eq!(dry_run_report["wouldSkipIssues"], 2);
    let validation_errors = dry_run_report["validationErrors"]
        .as_array()
        .expect("validation errors");
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "users"
            && error["field"] == "loginId"
            && error["message"] == "site.import.duplicateResource"
    }));
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "projects"
            && error["field"] == "projectName"
            && error["message"] == "site.import.duplicateResource"
    }));
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "projectMembers"
            && error["field"] == "loginId"
            && error["message"] == "site.import.duplicateResource"
    }));
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "labels"
            && error["field"] == "name"
            && error["message"] == "site.import.duplicateResource"
    }));
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "milestones"
            && error["field"] == "title"
            && error["message"] == "site.import.duplicateResource"
    }));
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "posts"
            && error["field"] == "postNumber"
            && error["message"] == "site.import.duplicateResource"
    }));
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "posts"
            && error["field"] == "title"
            && error["message"] == "site.import.duplicateResource"
    }));
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "issues"
            && error["field"] == "issueNumber"
            && error["message"] == "site.import.duplicateResource"
    }));
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "issues"
            && error["field"] == "title"
            && error["message"] == "site.import.duplicateResource"
    }));

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(response)
        .await
        .contains("site.import.duplicateResource"));

    assert!(repo
        .find_user_by_login_id("duplicate-owner")
        .await
        .expect("read rejected user")
        .is_none());
    assert!(repo
        .read_project_by_owner_and_name("duplicate-owner", "duplicate-project")
        .await
        .expect("read rejected project")
        .is_none());
    assert_eq!(
        n4user::Entity::find().all(&db).await.unwrap().len(),
        before_users
    );
    assert_eq!(
        project::Entity::find().all(&db).await.unwrap().len(),
        before_projects
    );
    assert_eq!(
        project_user::Entity::find().all(&db).await.unwrap().len(),
        before_members
    );
    assert_eq!(
        issue_label::Entity::find().all(&db).await.unwrap().len(),
        before_labels
    );
    assert_eq!(
        milestone::Entity::find().all(&db).await.unwrap().len(),
        before_milestones
    );
    assert_eq!(
        posting::Entity::find().all(&db).await.unwrap().len(),
        before_posts
    );
    assert_eq!(
        issue::Entity::find().all(&db).await.unwrap().len(),
        before_issues
    );
    assert!(
        !data_dir.path().join("uploads").exists(),
        "duplicate preflight must reject before portable file writes"
    );
}

#[tokio::test]
async fn site_admin_import_live_preflight_rejects_duplicate_portable_attachment_ids_without_partial_writes(
) {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let before_users = n4user::Entity::find().all(&db).await.unwrap().len();
    let before_projects = project::Entity::find().all(&db).await.unwrap().len();
    let before_posts = posting::Entity::find().all(&db).await.unwrap().len();
    let before_attachments = attachment::Entity::find().all(&db).await.unwrap().len();

    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "loginId": "duplicate-attachment-owner",
            "displayName": "Duplicate Attachment Owner",
            "emailAddress": "duplicate-attachment-owner@example.com",
            "isSiteAdmin": false,
            "state": "ACTIVE"
        }],
        "projects": [{
            "ownerName": "duplicate-attachment-owner",
            "projectName": "duplicate-attachment-project",
            "overview": "Should not survive failed portable attachment preflight",
            "projectScope": "public",
            "projectVcs": "GIT"
        }],
        "posts": [{
            "authorLoginId": "duplicate-attachment-owner",
            "attachments": [{
                "contentBase64": "Zmlyc3QtcG9ydGFibGUtZmlsZQ==",
                "id": 8801,
                "mimeType": "text/plain",
                "name": "first-portable.txt",
                "size": 19
            }],
            "bodyMarkdown": "first portable attachment /files/8801",
            "comments": [{
                "attachments": [{
                    "contentBase64": "Y29uZmxpY3RpbmctcG9ydGFibGUtZmlsZQ==",
                    "id": 8801,
                    "mimeType": "text/plain",
                    "name": "conflicting-portable.txt",
                    "size": 25
                }],
                "authorLoginId": "duplicate-attachment-owner",
                "contentsMarkdown": "conflicting portable attachment /files/8801"
            }],
            "ownerName": "duplicate-attachment-owner",
            "projectName": "duplicate-attachment-project",
            "title": "Rejected duplicate portable attachment"
        }],
        "issues": []
    });

    let dry_run_response = rest_raw_post(
        app.clone(),
        "/yona/sites/import?dryRun=true",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    let dry_run_report = response_json(dry_run_response).await;
    assert_eq!(dry_run_report["dryRun"], true);
    assert_eq!(dry_run_report["wouldImportAttachments"], 1);
    assert_eq!(dry_run_report["wouldSkipAttachments"], 1);
    assert_eq!(dry_run_report["wouldImportPosts"], 0);
    assert_eq!(dry_run_report["wouldSkipPosts"], 1);
    let validation_errors = dry_run_report["validationErrors"]
        .as_array()
        .expect("validation errors");
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "posts.comments.attachments"
            && error["field"] == "id"
            && error["message"] == "site.import.attachment.duplicateId"
    }));

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(response)
        .await
        .contains("site.import.attachment.duplicateId"));

    assert!(repo
        .find_user_by_login_id("duplicate-attachment-owner")
        .await
        .expect("read rejected user")
        .is_none());
    assert!(repo
        .read_project_by_owner_and_name(
            "duplicate-attachment-owner",
            "duplicate-attachment-project",
        )
        .await
        .expect("read rejected project")
        .is_none());
    assert_eq!(
        n4user::Entity::find().all(&db).await.unwrap().len(),
        before_users
    );
    assert_eq!(
        project::Entity::find().all(&db).await.unwrap().len(),
        before_projects
    );
    assert_eq!(
        posting::Entity::find().all(&db).await.unwrap().len(),
        before_posts
    );
    assert_eq!(
        attachment::Entity::find().all(&db).await.unwrap().len(),
        before_attachments
    );
    assert!(
        !data_dir.path().join("uploads").exists(),
        "duplicate portable attachment preflight must reject before file writes"
    );
}

#[tokio::test]
async fn site_admin_import_live_preflight_rejects_non_positive_portable_attachment_id_without_partial_writes(
) {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let before_users = n4user::Entity::find().all(&db).await.unwrap().len();
    let before_projects = project::Entity::find().all(&db).await.unwrap().len();
    let before_posts = posting::Entity::find().all(&db).await.unwrap().len();
    let before_attachments = attachment::Entity::find().all(&db).await.unwrap().len();

    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "loginId": "invalid-attachment-owner",
            "displayName": "Invalid Attachment Owner",
            "emailAddress": "invalid-attachment-owner@example.com",
            "isSiteAdmin": false,
            "state": "ACTIVE"
        }],
        "projects": [{
            "ownerName": "invalid-attachment-owner",
            "projectName": "invalid-attachment-project",
            "overview": "Should not survive invalid portable attachment preflight",
            "projectScope": "public",
            "projectVcs": "GIT"
        }],
        "posts": [{
            "authorLoginId": "invalid-attachment-owner",
            "attachments": [{
                "contentBase64": "aW52YWxpZC1pZC1wb3J0YWJsZS1maWxl",
                "id": 0,
                "mimeType": "text/plain",
                "name": "invalid-id-portable.txt",
                "size": 24
            }],
            "bodyMarkdown": "invalid portable attachment /files/0",
            "ownerName": "invalid-attachment-owner",
            "projectName": "invalid-attachment-project",
            "title": "Rejected invalid attachment id"
        }],
        "issues": []
    });

    let dry_run_response = rest_raw_post(
        app.clone(),
        "/yona/sites/import?dryRun=true",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    let dry_run_report = response_json(dry_run_response).await;
    assert_eq!(dry_run_report["dryRun"], true);
    assert_eq!(dry_run_report["wouldImportAttachments"], 0);
    assert_eq!(dry_run_report["wouldSkipAttachments"], 1);
    assert_eq!(dry_run_report["wouldImportPosts"], 0);
    assert_eq!(dry_run_report["wouldSkipPosts"], 1);
    let validation_errors = dry_run_report["validationErrors"]
        .as_array()
        .expect("validation errors");
    assert!(validation_errors.iter().any(|error| {
        error["section"] == "posts.attachments"
            && error["field"] == "id"
            && error["message"] == "site.import.attachment.invalidId"
    }));

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(response)
        .await
        .contains("site.import.attachment.invalidId"));

    assert!(repo
        .find_user_by_login_id("invalid-attachment-owner")
        .await
        .expect("read rejected user")
        .is_none());
    assert!(repo
        .read_project_by_owner_and_name("invalid-attachment-owner", "invalid-attachment-project")
        .await
        .expect("read rejected project")
        .is_none());
    assert_eq!(
        n4user::Entity::find().all(&db).await.unwrap().len(),
        before_users
    );
    assert_eq!(
        project::Entity::find().all(&db).await.unwrap().len(),
        before_projects
    );
    assert_eq!(
        posting::Entity::find().all(&db).await.unwrap().len(),
        before_posts
    );
    assert_eq!(
        attachment::Entity::find().all(&db).await.unwrap().len(),
        before_attachments
    );
    assert!(
        !data_dir.path().join("uploads").exists(),
        "invalid portable attachment id preflight must reject before file writes"
    );
}

#[tokio::test]
async fn site_admin_import_live_preflight_rejects_invalid_portable_attachment_without_partial_writes(
) {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let before_users = n4user::Entity::find().all(&db).await.unwrap().len();
    let before_projects = project::Entity::find().all(&db).await.unwrap().len();
    let before_posts = posting::Entity::find().all(&db).await.unwrap().len();
    let before_issues = issue::Entity::find().all(&db).await.unwrap().len();
    let before_milestones = milestone::Entity::find().all(&db).await.unwrap().len();
    let before_attachments = attachment::Entity::find().all(&db).await.unwrap().len();

    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "loginId": "preflight-owner",
            "displayName": "Preflight Owner",
            "emailAddress": "preflight-owner@example.com",
            "isSiteAdmin": false,
            "state": "ACTIVE"
        }],
        "projects": [{
            "ownerName": "preflight-owner",
            "projectName": "preflight-project",
            "overview": "Should not survive failed live preflight",
            "projectScope": "public",
            "projectVcs": "GIT"
        }],
        "milestones": [{
            "attachments": [{
                "contentBase64": "cHJlZmxpZ2h0LW1pbGVzdG9uZS1maWxl",
                "id": 801,
                "mimeType": "text/plain",
                "name": "preflight-milestone.txt",
                "size": 24
            }],
            "contentsMarkdown": "milestone with valid portable attachment /files/801",
            "dueDate": "",
            "ownerName": "preflight-owner",
            "projectName": "preflight-project",
            "state": "open",
            "title": "Preflight milestone"
        }],
        "posts": [{
            "authorLoginId": "preflight-owner",
            "attachments": [{
                "contentBase64": "not-valid-base64",
                "id": 802,
                "mimeType": "text/plain",
                "name": "invalid-post.txt",
                "size": 12
            }],
            "bodyMarkdown": "post with invalid portable attachment",
            "comments": [],
            "ownerName": "preflight-owner",
            "projectName": "preflight-project",
            "title": "Rejected preflight post"
        }],
        "issues": []
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(response)
        .await
        .contains("site.import.attachment.invalidContent"));

    assert!(repo
        .find_user_by_login_id("preflight-owner")
        .await
        .expect("read rejected user")
        .is_none());
    assert!(repo
        .read_project_by_owner_and_name("preflight-owner", "preflight-project")
        .await
        .expect("read rejected project")
        .is_none());
    assert_eq!(
        n4user::Entity::find().all(&db).await.unwrap().len(),
        before_users
    );
    assert_eq!(
        project::Entity::find().all(&db).await.unwrap().len(),
        before_projects
    );
    assert_eq!(
        posting::Entity::find().all(&db).await.unwrap().len(),
        before_posts
    );
    assert_eq!(
        issue::Entity::find().all(&db).await.unwrap().len(),
        before_issues
    );
    assert_eq!(
        milestone::Entity::find().all(&db).await.unwrap().len(),
        before_milestones
    );
    assert_eq!(
        attachment::Entity::find().all(&db).await.unwrap().len(),
        before_attachments
    );
    assert!(
        !data_dir.path().join("uploads").exists(),
        "live preflight must reject before portable attachment file writes"
    );
}

#[tokio::test]
async fn site_admin_import_cleans_portable_attachment_when_downstream_milestone_insert_fails() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "portable",
    )
    .await;

    let before_milestones = milestone::Entity::find().all(&db).await.unwrap().len();
    let before_attachments = attachment::Entity::find().all(&db).await.unwrap().len();

    db.execute(Statement::from_string(
        db.get_database_backend(),
        "CREATE TRIGGER fail_import_milestone_insert BEFORE INSERT ON milestone \
         BEGIN SELECT RAISE(FAIL, 'forced milestone import failure'); END"
            .to_string(),
    ))
    .await
    .expect("install milestone failure trigger");

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "milestones": [{
            "attachments": [{
                "contentBase64": "cm9sbGJhY2stZmlsZQ==",
                "id": 9901,
                "mimeType": "text/plain",
                "name": "rollback-file.txt",
                "size": 13
            }],
            "contentsMarkdown": "milestone with portable attachment /files/9901",
            "dueDate": "",
            "ownerName": "member",
            "projectName": "portable",
            "state": "open",
            "title": "Rollback milestone"
        }],
        "posts": [],
        "issues": []
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    assert!(response_text(response)
        .await
        .contains("forced milestone import failure"));

    assert_eq!(
        milestone::Entity::find().all(&db).await.unwrap().len(),
        before_milestones
    );
    assert_eq!(
        attachment::Entity::find().all(&db).await.unwrap().len(),
        before_attachments
    );
    assert!(repo
        .list_project_milestones(
            "member",
            "portable",
            MilestoneListFilter {
                order_by: String::new(),
                order_dir: String::new(),
                state: "all".to_string(),
            },
        )
        .await
        .expect("list milestones after failed import")
        .into_iter()
        .all(|milestone| milestone.title != "Rollback milestone"));
    assert_eq!(
        final_upload_file_count(&data_dir),
        0,
        "failed import must leave no final portable upload files"
    );
    assert!(
        !imported_upload_staging_dir(&data_dir).exists(),
        "failed import must remove staged portable upload files"
    );
}

#[tokio::test]
async fn site_admin_import_transaction_rolls_back_project_created_before_timestamp_restore_fails() {
    let (app, repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let before_users = n4user::Entity::find().all(&db).await.unwrap().len();
    let before_site_admins = site_admin::Entity::find().all(&db).await.unwrap().len();
    let before_projects = project::Entity::find().all(&db).await.unwrap().len();

    db.execute(Statement::from_string(
        db.get_database_backend(),
        "CREATE TRIGGER fail_import_project_timestamp_restore BEFORE UPDATE ON project \
         WHEN NEW.name = 'tx-project' \
         BEGIN SELECT RAISE(FAIL, 'forced project timestamp restore failure'); END"
            .to_string(),
    ))
    .await
    .expect("install project timestamp restore failure trigger");

    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "loginId": "tx-owner",
            "displayName": "Transaction Owner",
            "emailAddress": "tx-owner@example.com",
            "isSiteAdmin": true,
            "state": "ACTIVE"
        }],
        "projects": [{
            "createdAt": "2024-01-02T03:04:05",
            "ownerName": "tx-owner",
            "projectName": "tx-project",
            "overview": "Should disappear through DB transaction rollback",
            "projectScope": "public",
            "projectVcs": "GIT"
        }],
        "projectMembers": [],
        "labels": [],
        "milestones": [],
        "posts": [],
        "issues": []
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    assert!(response_text(response)
        .await
        .contains("forced project timestamp restore failure"));

    assert!(repo
        .find_user_by_login_id("tx-owner")
        .await
        .expect("read transaction rolled-back user")
        .is_none());
    assert!(repo
        .read_project_by_owner_and_name("tx-owner", "tx-project")
        .await
        .expect("read transaction rolled-back project")
        .is_none());
    assert_eq!(
        n4user::Entity::find().all(&db).await.unwrap().len(),
        before_users
    );
    assert_eq!(
        site_admin::Entity::find().all(&db).await.unwrap().len(),
        before_site_admins
    );
    assert_eq!(
        project::Entity::find().all(&db).await.unwrap().len(),
        before_projects
    );
}

#[tokio::test]
async fn site_admin_import_rolls_back_created_db_rows_when_downstream_issue_comment_insert_fails() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;
    if role::Entity::find()
        .filter(role::Column::Name.eq(Some("manager".to_string())))
        .one(&db)
        .await
        .expect("read manager role")
        .is_none()
    {
        role::ActiveModel {
            id: NotSet,
            name: Set(Some("manager".to_string())),
            active: Set(Some(1)),
        }
        .insert(&db)
        .await
        .expect("seed manager role");
    }

    let before_users = n4user::Entity::find().all(&db).await.unwrap().len();
    let before_site_admins = site_admin::Entity::find().all(&db).await.unwrap().len();
    let before_projects = project::Entity::find().all(&db).await.unwrap().len();
    let before_project_users = project_user::Entity::find().all(&db).await.unwrap().len();
    let before_labels = issue_label::Entity::find().all(&db).await.unwrap().len();
    let before_label_categories = issue_label_category::Entity::find()
        .all(&db)
        .await
        .unwrap()
        .len();
    let before_milestones = milestone::Entity::find().all(&db).await.unwrap().len();
    let before_posts = posting::Entity::find().all(&db).await.unwrap().len();
    let before_post_comments = posting_comment::Entity::find()
        .all(&db)
        .await
        .unwrap()
        .len();
    let before_issues = issue::Entity::find().all(&db).await.unwrap().len();
    let before_issue_comments = issue_comment::Entity::find().all(&db).await.unwrap().len();
    let before_attachments = attachment::Entity::find().all(&db).await.unwrap().len();
    let before_roles = role::Entity::find().all(&db).await.unwrap().len();

    db.execute(Statement::from_string(
        db.get_database_backend(),
        "CREATE TRIGGER fail_import_issue_comment_insert BEFORE INSERT ON issue_comment \
         BEGIN SELECT RAISE(FAIL, 'forced issue comment import failure'); END"
            .to_string(),
    ))
    .await
    .expect("install issue comment failure trigger");

    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "loginId": "rollback-owner",
            "displayName": "Rollback Owner",
            "emailAddress": "rollback-owner@example.com",
            "isSiteAdmin": true,
            "state": "ACTIVE"
        }],
        "projects": [{
            "ownerName": "rollback-owner",
            "projectName": "rollback-project",
            "overview": "Should disappear after failed import",
            "projectScope": "public",
            "projectVcs": "GIT"
        }],
        "projectMembers": [{
            "loginId": "rollback-owner",
            "ownerName": "rollback-owner",
            "projectName": "rollback-project",
            "role": "manager"
        }],
        "labels": [{
            "categoryIsExclusive": false,
            "categoryName": "Kind",
            "color": "#4caf50",
            "name": "Standalone rollback label",
            "ownerName": "rollback-owner",
            "projectName": "rollback-project"
        }],
        "milestones": [{
            "attachments": [{
                "contentBase64": "bWlsZXN0b25lLWZpbGU=",
                "id": 9911,
                "mimeType": "text/plain",
                "name": "rollback-milestone.txt",
                "size": 14
            }],
            "contentsMarkdown": "milestone with portable attachment /files/9911",
            "dueDate": "",
            "ownerName": "rollback-owner",
            "projectName": "rollback-project",
            "state": "open",
            "title": "Standalone rollback milestone"
        }],
        "posts": [{
            "authorLoginId": "rollback-owner",
            "attachments": [{
                "contentBase64": "cG9zdC1maWxl",
                "id": 9912,
                "mimeType": "text/plain",
                "name": "rollback-post.txt",
                "size": 9
            }],
            "bodyMarkdown": "post with portable attachment /files/9912",
            "comments": [{
                "authorLoginId": "rollback-owner",
                "attachments": [{
                    "contentBase64": "cG9zdC1jb21tZW50LWZpbGU=",
                    "id": 9913,
                    "mimeType": "text/plain",
                    "name": "rollback-post-comment.txt",
                    "size": 17
                }],
                "childComments": [],
                "contentsMarkdown": "post comment with portable attachment /files/9913"
            }],
            "labels": [{
                "categoryIsExclusive": false,
                "categoryName": "Embedded",
                "color": "#2196f3",
                "name": "Embedded post label"
            }],
            "ownerName": "rollback-owner",
            "projectName": "rollback-project",
            "title": "Rollback post"
        }],
        "issues": [{
            "authorLoginId": "rollback-owner",
            "attachments": [{
                "contentBase64": "aXNzdWUtZmlsZQ==",
                "id": 9914,
                "mimeType": "text/plain",
                "name": "rollback-issue.txt",
                "size": 10
            }],
            "bodyMarkdown": "issue with portable attachment /files/9914",
            "comments": [{
                "authorLoginId": "rollback-owner",
                "attachments": [{
                    "contentBase64": "aXNzdWUtY29tbWVudC1maWxl",
                    "id": 9915,
                    "mimeType": "text/plain",
                    "name": "rollback-issue-comment.txt",
                    "size": 18
                }],
                "childComments": [],
                "contentsMarkdown": "issue comment should trigger rollback /files/9915"
            }],
            "labels": [{
                "categoryIsExclusive": false,
                "categoryName": "Embedded",
                "color": "#ff9800",
                "name": "Embedded issue label"
            }],
            "milestoneTitle": "On-demand issue milestone",
            "ownerName": "rollback-owner",
            "projectName": "rollback-project",
            "state": "open",
            "title": "Rollback issue"
        }]
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    let failure_report: Value =
        serde_json::from_str(&response_text(response).await).expect("failure report json");
    assert_eq!(failure_report["dryRun"], false);
    assert_eq!(
        failure_report["checkpoint"]["failure"]["section"],
        "issues.comments"
    );
    assert_eq!(failure_report["checkpoint"]["failure"]["index"], 0);
    assert!(failure_report["checkpoint"]["failure"]["resourceKey"]
        .as_str()
        .expect("failure resource key")
        .contains("issues.comments:rollback-owner/rollback-project#1"));
    assert!(failure_report["checkpoint"]["failure"]["message"]
        .as_str()
        .expect("failure message")
        .contains("forced issue comment import failure"));
    let failure_sections = failure_report["checkpoint"]["sections"]
        .as_array()
        .expect("failure checkpoint sections");
    let users_checkpoint = failure_sections
        .iter()
        .find(|section| section["section"] == "users")
        .expect("users failure checkpoint");
    assert_eq!(users_checkpoint["completed"], 1);
    let issues_checkpoint = failure_sections
        .iter()
        .find(|section| section["section"] == "issues")
        .expect("issues failure checkpoint");
    assert_eq!(issues_checkpoint["validated"], 1);
    assert_eq!(issues_checkpoint["completed"], 0);

    assert!(repo
        .find_user_by_login_id("rollback-owner")
        .await
        .expect("read rolled-back user")
        .is_none());
    assert!(repo
        .read_project_by_owner_and_name("rollback-owner", "rollback-project")
        .await
        .expect("read rolled-back project")
        .is_none());
    assert_eq!(
        n4user::Entity::find().all(&db).await.unwrap().len(),
        before_users
    );
    assert_eq!(
        site_admin::Entity::find().all(&db).await.unwrap().len(),
        before_site_admins
    );
    assert_eq!(
        project::Entity::find().all(&db).await.unwrap().len(),
        before_projects
    );
    assert_eq!(
        project_user::Entity::find().all(&db).await.unwrap().len(),
        before_project_users
    );
    assert_eq!(
        issue_label::Entity::find().all(&db).await.unwrap().len(),
        before_labels
    );
    assert_eq!(
        issue_label_category::Entity::find()
            .all(&db)
            .await
            .unwrap()
            .len(),
        before_label_categories
    );
    assert_eq!(
        milestone::Entity::find().all(&db).await.unwrap().len(),
        before_milestones
    );
    assert_eq!(
        posting::Entity::find().all(&db).await.unwrap().len(),
        before_posts
    );
    assert_eq!(
        posting_comment::Entity::find()
            .all(&db)
            .await
            .unwrap()
            .len(),
        before_post_comments
    );
    assert_eq!(
        issue::Entity::find().all(&db).await.unwrap().len(),
        before_issues
    );
    assert_eq!(
        issue_comment::Entity::find().all(&db).await.unwrap().len(),
        before_issue_comments
    );
    assert_eq!(
        attachment::Entity::find().all(&db).await.unwrap().len(),
        before_attachments
    );
    assert_eq!(
        role::Entity::find().all(&db).await.unwrap().len(),
        before_roles
    );
    assert_eq!(
        final_upload_file_count(&data_dir),
        0,
        "failed import must leave no final route-created portable files"
    );
    assert!(
        !imported_upload_staging_dir(&data_dir).exists(),
        "failed import must remove every staged route-created portable file"
    );
}

#[tokio::test]
async fn site_admin_import_restores_existing_project_sequence_counters_after_downstream_failure() {
    let (app, repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "counter-safe",
    )
    .await;
    let existing_post = repo
        .create_posting(CreatePostingInput {
            actor_display_name: "member".to_string(),
            actor_id: member_id,
            actor_login_id: "member".to_string(),
            owner_name: "member".to_string(),
            project_name: "counter-safe".to_string(),
            values: PostingMutationInput {
                attachment_ids: vec![],
                body_markdown: "existing post".to_string(),
                label_ids: vec![],
                notice: false,
                readme: false,
                title: "Existing post".to_string(),
            },
        })
        .await
        .expect("create existing post")
        .expect("existing post created");
    let existing_issue = repo
        .create_issue(CreateIssueInput {
            actor_display_name: "member".to_string(),
            actor_id: member_id,
            actor_login_id: "member".to_string(),
            owner_name: "member".to_string(),
            project_name: "counter-safe".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: vec![],
                body_markdown: "existing issue".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: vec![],
                milestone_id: None,
                parent_issue_id: None,
                title: "Existing issue".to_string(),
            },
        })
        .await
        .expect("create existing issue")
        .expect("existing issue created");
    assert_eq!(existing_post.post_number, 1);
    assert_eq!(existing_issue.issue_number, 1);

    db.execute(Statement::from_string(
        db.get_database_backend(),
        "CREATE TRIGGER fail_counter_issue_comment_insert BEFORE INSERT ON issue_comment \
         BEGIN SELECT RAISE(FAIL, 'forced counter issue comment import failure'); END"
            .to_string(),
    ))
    .await
    .expect("install issue comment failure trigger");

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "posts": [{
            "authorLoginId": "member",
            "bodyMarkdown": "imported post should roll back",
            "comments": [],
            "ownerName": "member",
            "projectName": "counter-safe",
            "title": "Rollback post"
        }],
        "issues": [{
            "authorLoginId": "member",
            "bodyMarkdown": "imported issue should roll back",
            "comments": [{
                "authorLoginId": "member",
                "contentsMarkdown": "comment triggers rollback"
            }],
            "ownerName": "member",
            "projectName": "counter-safe",
            "state": "open",
            "title": "Rollback issue"
        }]
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    assert!(response_text(response)
        .await
        .contains("forced counter issue comment import failure"));

    let project_row = project::Entity::find()
        .filter(project::Column::Owner.eq(Some("member".to_string())))
        .filter(project::Column::Name.eq(Some("counter-safe".to_string())))
        .one(&db)
        .await
        .expect("read project counters")
        .expect("project remains");
    assert_eq!(project_row.last_posting_number, Some(1));
    assert_eq!(project_row.last_issue_number, Some(1));
    assert!(repo
        .read_posting_detail_for_viewer("member", "counter-safe", 2, None)
        .await
        .expect("read rolled-back imported post")
        .is_none());
    assert!(repo
        .read_issue_detail("member", "counter-safe", 2)
        .await
        .expect("read rolled-back imported issue")
        .is_none());

    let next_post = repo
        .create_posting(CreatePostingInput {
            actor_display_name: "member".to_string(),
            actor_id: member_id,
            actor_login_id: "member".to_string(),
            owner_name: "member".to_string(),
            project_name: "counter-safe".to_string(),
            values: PostingMutationInput {
                attachment_ids: vec![],
                body_markdown: "next post".to_string(),
                label_ids: vec![],
                notice: false,
                readme: false,
                title: "Next post".to_string(),
            },
        })
        .await
        .expect("create next post")
        .expect("next post created");
    let next_issue = repo
        .create_issue(CreateIssueInput {
            actor_display_name: "member".to_string(),
            actor_id: member_id,
            actor_login_id: "member".to_string(),
            owner_name: "member".to_string(),
            project_name: "counter-safe".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: vec![],
                body_markdown: "next issue".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: vec![],
                milestone_id: None,
                parent_issue_id: None,
                title: "Next issue".to_string(),
            },
        })
        .await
        .expect("create next issue")
        .expect("next issue created");
    assert_eq!(next_post.post_number, 2);
    assert_eq!(next_issue.issue_number, 2);
}

#[tokio::test]
async fn site_admin_import_rejects_portable_attachment_size_mismatch() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "portable",
    )
    .await;

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "posts": [{
            "authorLoginId": "member",
            "attachments": [{
                "contentBase64": "cG9ydGFibGUtcG9zdC1maWxl",
                "id": 901,
                "mimeType": "text/plain",
                "name": "portable-post.txt",
                "size": 999
            }],
            "bodyMarkdown": "post with invalid portable attachment",
            "ownerName": "member",
            "projectName": "portable",
            "title": "Rejected portable attached post"
        }],
        "issues": []
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(response)
        .await
        .contains("site.import.attachment.sizeMismatch"));

    assert!(repo
        .read_posting_detail_for_viewer("member", "portable", 1, None)
        .await
        .expect("read rejected post")
        .is_none());
}

#[tokio::test]
async fn site_admin_import_preflight_rejects_portable_attachment_sha256_mismatch() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "portable",
    )
    .await;

    let before_posts = posting::Entity::find().all(&db).await.unwrap().len();
    let before_attachments = attachment::Entity::find().all(&db).await.unwrap().len();

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "posts": [{
            "authorLoginId": "member",
            "attachments": [{
                "contentBase64": "cG9ydGFibGUtcG9zdC1maWxl",
                "contentSha256": "0000000000000000000000000000000000000000000000000000000000000000",
                "id": 901,
                "mimeType": "text/plain",
                "name": "portable-post.txt",
                "size": 18
            }],
            "bodyMarkdown": "post with checksum-mismatched portable attachment",
            "ownerName": "member",
            "projectName": "portable",
            "title": "Rejected checksum portable attached post"
        }],
        "issues": []
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(response)
        .await
        .contains("site.import.attachment.sha256Mismatch"));

    assert!(repo
        .read_posting_detail_for_viewer("member", "portable", 1, None)
        .await
        .expect("read rejected post")
        .is_none());
    assert_eq!(
        posting::Entity::find().all(&db).await.unwrap().len(),
        before_posts
    );
    assert_eq!(
        attachment::Entity::find().all(&db).await.unwrap().len(),
        before_attachments
    );
    assert!(
        !data_dir.path().join("uploads").exists(),
        "checksum preflight must not write portable attachment files"
    );
}

#[tokio::test]
async fn site_admin_import_respects_configured_max_file_size_without_env_mutation() {
    // Guards site-admin import using the app-scoped max upload size service snapshot.
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        max_uploaded_file_size: 8,
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "portable",
    )
    .await;

    let payload = json!({
        "format": "yobi-data",
        "users": [],
        "projects": [],
        "posts": [{
            "authorLoginId": "member",
            "attachments": [{
                "contentBase64": "cG9ydGFibGUtcG9zdC1maWxl",
                "id": 901,
                "mimeType": "text/plain",
                "name": "portable-post.txt",
                "size": 18
            }],
            "bodyMarkdown": "post with too-large portable attachment",
            "ownerName": "member",
            "projectName": "portable",
            "title": "Rejected oversized portable attached post"
        }],
        "issues": []
    });

    let response = rest_raw_post(
        app,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/json",
        &payload.to_string(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(response)
        .await
        .contains("site.import.attachment.tooLarge"));

    assert!(repo
        .read_posting_detail_for_viewer("member", "portable", 1, None)
        .await
        .expect("read rejected post")
        .is_none());
}

#[tokio::test]
// Guards shared label mapping, identifier/URI normalization, redirects, and users route boundary.
async fn site_admin_user_list_and_toggles_follow_legacy_state_buckets() {
    // Keeps site-admin user surfaces on the shared users route-module boundary after root DTO diet.
    let (app, repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    let (guest_csrf, guest_cookie, _guest_id) = register_user(app.clone(), "guest").await;
    let (_deletee_csrf, _deletee_cookie, deletee_id) = register_user(app.clone(), "deletee").await;
    let (manager_csrf, manager_cookie, manager_id) =
        register_user(app.clone(), "solemanager").await;
    mark_site_admin(&db, admin_id).await;
    let member_avatar = insert_attachment(
        &db,
        "USER_AVATAR",
        member_id,
        "member",
        "member-avatar.png",
        "image/png",
    )
    .await;

    let unauthenticated = rest_get(app.clone(), "/yona/api/v1/site/users", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(app.clone(), "/yona/api/v1/site/users", Some(&member_cookie)).await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let active = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=ACTIVE&query=mem",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(active["state"], "ACTIVE");
    assert_eq!(active["query"], "mem");
    assert_eq!(active["page"], 1);
    assert_eq!(active["pageSize"], 30);
    assert_eq!(active["users"].as_array().unwrap().len(), 1);
    assert_eq!(login_ids(&active), vec!["member".to_string()]);
    assert_eq!(active["total"], 1);
    assert_eq!(active["initialUserId"], admin_id);
    assert_eq!(user(&active, "member")["isSiteAdmin"], false);
    assert_eq!(user(&active, "member")["state"], "ACTIVE");
    assert_eq!(
        user(&active, "member")["avatarUrl"],
        format!("/yona/files/{}", member_avatar.id)
    );

    let case_insensitive_active = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=ACTIVE&query=MEM",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(
        login_ids(&case_insensitive_active),
        vec!["member".to_string()]
    );

    let protected_revoke = rest_post(
        app.clone(),
        "/yona/api/v1/site/users/siteboss/site-admin/toggle",
        Some(&admin_cookie),
        Some(&admin_csrf),
    )
    .await;
    assert_eq!(protected_revoke.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(protected_revoke)
        .await
        .contains("initial user must remain a site admin"));

    let forbidden_toggle = rest_post(
        app.clone(),
        "/yona/api/v1/site/users/member/site-admin/toggle",
        Some(&member_cookie),
        Some(&member_csrf),
    )
    .await;
    assert_eq!(forbidden_toggle.status(), StatusCode::FORBIDDEN);

    let promoted = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/site/users/member/site-admin/toggle",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(promoted["user"]["loginId"], "member");
    assert_eq!(promoted["user"]["isSiteAdmin"], true);

    let site_admins = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=SITE_ADMIN",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(site_admins["state"], "SITE_ADMIN");
    let site_admin_ids = login_ids(&site_admins);
    // Legacy User.findUsers excludes the initial site manager (SITE_MANAGER_ID)
    // from every bucket, so the first user never appears in SITE_ADMIN.
    assert!(!site_admin_ids.contains(&"siteboss".to_string()));
    assert!(site_admin_ids.contains(&"member".to_string()));
    assert_eq!(site_admins["siteAdminCount"], 2);

    let locked = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/site/users/member/account-lock/toggle",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(locked["user"]["loginId"], "member");
    assert_eq!(locked["user"]["state"], "LOCKED");

    let locked_bucket = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=LOCKED",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&locked_bucket), vec!["member".to_string()]);

    let unlocked = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/site/users/member/account-lock/toggle",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(unlocked["user"]["state"], "ACTIVE");
    assert_eq!(unlocked["user"]["id"].as_i64(), Some(member_id));

    let guest_forbidden = rest_post(
        app.clone(),
        "/yona/api/v1/site/users/member/guest/toggle",
        Some(&guest_cookie),
        Some(&guest_csrf),
    )
    .await;
    assert_eq!(guest_forbidden.status(), StatusCode::FORBIDDEN);

    let guest_mode = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/site/users/member/guest/toggle",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(guest_mode["user"]["loginId"], "member");
    assert_eq!(guest_mode["user"]["isGuest"], true);

    let guest_bucket = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=GUEST",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&guest_bucket), vec!["member".to_string()]);

    let normal_mode = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/site/users/member/guest/toggle",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(normal_mode["user"]["isGuest"], false);

    let reset_forbidden = rest_post(
        app.clone(),
        "/yona/api/v1/site/users/member/password/reset",
        Some(&guest_cookie),
        Some(&guest_csrf),
    )
    .await;
    assert_eq!(reset_forbidden.status(), StatusCode::FORBIDDEN);

    let reset = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/site/users/member/password/reset",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    let new_password = reset["newPassword"].as_str().expect("new password");
    assert_eq!(reset["loginId"], "member");
    assert_eq!(reset["name"], "member");
    assert_eq!(reset["isSuccess"], true);
    assert_eq!(new_password.len(), 6);

    let member = repo
        .find_user_by_login_id("member")
        .await
        .expect("read member after reset")
        .expect("member exists");
    assert!(bcrypt::verify(new_password, &member.password_hash).expect("bcrypt verify"));

    let delete_forbidden = rest_delete(
        app.clone(),
        "/yona/api/v1/site/users/deletee",
        Some(&guest_cookie),
        Some(&guest_csrf),
    )
    .await;
    assert_eq!(delete_forbidden.status(), StatusCode::FORBIDDEN);

    create_project(
        app.clone(),
        &manager_cookie,
        &manager_csrf,
        "solemanager",
        "only-manager-project",
    )
    .await;
    let only_manager_delete = rest_delete(
        app.clone(),
        "/yona/api/v1/site/users/solemanager",
        Some(&admin_cookie),
        Some(&admin_csrf),
    )
    .await;
    assert_eq!(only_manager_delete.status(), StatusCode::FORBIDDEN);

    let manager_project = repo
        .read_project_by_owner_and_name("solemanager", "only-manager-project")
        .await
        .expect("read manager project")
        .expect("manager project");
    repo.add_project_membership(manager_project.id, admin_id, "manager")
        .await
        .expect("add second manager");
    let deleted = response_json(
        rest_delete(
            app.clone(),
            "/yona/api/v1/site/users/solemanager",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(deleted["user"]["loginId"], "solemanager");
    assert_eq!(deleted["user"]["state"], "DELETED");
    assert_eq!(deleted["user"]["displayName"], "[DELETED]solemanager");
    assert_eq!(
        deleted["user"]["emailAddress"],
        "deleted-solemanager@noreply.yona.io"
    );

    let remaining_manager_memberships = project_user::Entity::find()
        .filter(project_user::Column::UserId.eq(Some(manager_id)))
        .all(&db)
        .await
        .expect("read manager memberships");
    assert!(remaining_manager_memberships.is_empty());

    let deleted_bucket = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=DELETED&query=sole",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&deleted_bucket), vec!["solemanager".to_string()]);

    let deletee_deleted = response_json(
        rest_delete(
            app,
            "/yona/api/v1/site/users/deletee",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(deletee_deleted["user"]["id"].as_i64(), Some(deletee_id));
    assert_eq!(deletee_deleted["user"]["state"], "DELETED");
}

#[tokio::test]
async fn site_admin_project_list_and_delete_follow_legacy_surface() {
    // Guards site-admin project delete service-snapshot threading: repository
    // storage removal must use the app-config data root from the injected service.
    let data_root = tempfile::tempdir().expect("site project data root");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_root.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "siteboss",
        "alpha-project",
    )
    .await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "beta-project",
    )
    .await;

    let unauthenticated = rest_get(app.clone(), "/yona/api/v1/site/projects", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/site/projects",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let beta_project = repo
        .read_project_by_owner_and_name("member", "beta-project")
        .await
        .expect("read beta project")
        .expect("beta project");
    let beta_repo_path = yoram_vcs::repository_path(
        data_root.path(),
        &beta_project.owner_name,
        &beta_project.project_name,
    )
    .expect("repository path");
    assert!(
        beta_repo_path.join("HEAD").is_file(),
        "project create should provision repository under the app-config data root"
    );
    let beta_logo = insert_attachment(
        &db,
        "PROJECT",
        beta_project.id,
        "member",
        "beta-logo.png",
        "image/png",
    )
    .await;
    let filtered = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/projects?filter=beta&page=1",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(filtered["filter"], "beta");
    assert_eq!(filtered["page"], 1);
    assert_eq!(filtered["pageSize"], 25);
    assert_eq!(filtered["total"], 1);
    assert_eq!(filtered["totalPages"], 1);
    assert_eq!(
        filtered["projects"][0]["id"].as_i64(),
        Some(beta_project.id)
    );
    assert_eq!(filtered["projects"][0]["ownerName"], "member");
    assert_eq!(filtered["projects"][0]["projectName"], "beta-project");
    assert_eq!(
        filtered["projects"][0]["overview"],
        "site admin delete guard"
    );
    assert_eq!(
        filtered["projects"][0]["projectLogoUrl"],
        format!("/yona/files/{}", beta_logo.id)
    );

    let case_insensitive_filtered = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/projects?filter=BETA&page=1",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(case_insensitive_filtered["total"], 1);
    assert_eq!(
        case_insensitive_filtered["projects"][0]["projectName"],
        "beta-project"
    );

    let delete_forbidden = rest_delete(
        app.clone(),
        &format!("/yona/api/v1/site/projects/{}", beta_project.id),
        Some(&member_cookie),
        Some(&member_csrf),
    )
    .await;
    assert_eq!(delete_forbidden.status(), StatusCode::FORBIDDEN);

    let delete_missing = rest_delete(
        app.clone(),
        "/yona/api/v1/site/projects/999999",
        Some(&admin_cookie),
        Some(&admin_csrf),
    )
    .await;
    assert_eq!(delete_missing.status(), StatusCode::NOT_FOUND);

    let deleted = response_json(
        rest_delete(
            app.clone(),
            &format!("/yona/api/v1/site/projects/{}", beta_project.id),
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(deleted["ok"], true);
    assert_eq!(deleted["redirectPath"], "/sites/projectList");
    assert!(repo
        .read_project_by_id(beta_project.id)
        .await
        .expect("read deleted project")
        .is_none());
    assert!(
        !beta_repo_path.exists(),
        "site-admin project delete should remove repository storage under the app-config data root"
    );

    let empty = response_json(
        rest_get(
            app,
            "/yona/api/v1/site/projects?filter=beta&page=1",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(empty["projects"].as_array().expect("projects").len(), 0);
    assert_eq!(empty["total"], 0);
}

#[tokio::test]
async fn site_admin_post_list_follows_legacy_read_only_surface() {
    let (app, repo, db) = build_app_with_repository().await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "boardproj",
    )
    .await;
    let project = repo
        .read_project_authorization("member", "boardproj", None)
        .await
        .expect("read board project")
        .expect("board project exists")
        .project;
    let logo = insert_attachment(
        &db,
        "PROJECT",
        project.id,
        "member",
        "logo.png",
        "image/png",
    )
    .await;
    let posting = repo
        .create_posting(CreatePostingInput {
            actor_display_name: "Member Name".to_string(),
            actor_id: member_id,
            actor_login_id: "member".to_string(),
            owner_name: "member".to_string(),
            project_name: "boardproj".to_string(),
            values: PostingMutationInput {
                attachment_ids: vec![],
                body_markdown: "legacy site post list body".to_string(),
                label_ids: vec![],
                notice: false,
                readme: false,
                title: "Legacy site post".to_string(),
            },
        })
        .await
        .expect("create posting")
        .expect("posting created");

    let unauthenticated = rest_get(app.clone(), "/yona/api/v1/site/posts", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(app.clone(), "/yona/api/v1/site/posts", Some(&member_cookie)).await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let payload = response_json(
        rest_get(
            app,
            "/yona/api/v1/site/posts?pageNum=1",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(payload["page"], 1);
    assert_eq!(payload["pageSize"], 30);
    assert_eq!(payload["total"], 1);
    assert_eq!(payload["totalPages"], 1);
    assert_eq!(payload["posts"][0]["ownerName"], "member");
    assert_eq!(payload["posts"][0]["projectName"], "boardproj");
    assert_eq!(
        payload["posts"][0]["postNumber"],
        posting.post_number.to_string()
    );
    assert_eq!(payload["posts"][0]["title"], "Legacy site post");
    assert_eq!(payload["posts"][0]["authorLoginId"], "member");
    assert_eq!(payload["posts"][0]["authorLabel"], "Member Name");
    assert_eq!(
        payload["posts"][0]["projectLogoUrl"],
        format!("/yona/files/{}", logo.id)
    );
    assert!(payload["posts"][0]["authorAvatarUrl"]
        .as_str()
        .expect("author avatar url")
        .starts_with("https://www.gravatar.com/avatar/"));
    assert_eq!(payload["posts"][0]["commentCount"], 0);
}

#[tokio::test]
async fn site_admin_issue_list_follows_legacy_state_tabs() {
    let (app, repo, db) = build_app_with_repository().await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "issueproj",
    )
    .await;
    let project = repo
        .read_project_authorization("member", "issueproj", None)
        .await
        .expect("read issue project")
        .expect("issue project exists")
        .project;
    let logo = insert_attachment(
        &db,
        "PROJECT",
        project.id,
        "member",
        "issue-logo.png",
        "image/png",
    )
    .await;
    let open_issue = repo
        .create_issue(CreateIssueInput {
            actor_display_name: "Member Name".to_string(),
            actor_id: member_id,
            actor_login_id: "member".to_string(),
            owner_name: "member".to_string(),
            project_name: "issueproj".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: vec![],
                body_markdown: "legacy site issue list body".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: vec![],
                milestone_id: None,
                parent_issue_id: None,
                title: "Open site issue".to_string(),
            },
        })
        .await
        .expect("create open issue")
        .expect("open issue created");
    let closed_issue = repo
        .create_issue(CreateIssueInput {
            actor_display_name: "Member Name".to_string(),
            actor_id: member_id,
            actor_login_id: "member".to_string(),
            owner_name: "member".to_string(),
            project_name: "issueproj".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: vec![],
                body_markdown: "legacy closed issue body".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: vec![],
                milestone_id: None,
                parent_issue_id: None,
                title: "Closed site issue".to_string(),
            },
        })
        .await
        .expect("create closed issue")
        .expect("closed issue created");
    repo.update_issue_state("member", "issueproj", closed_issue.issue_number, "closed")
        .await
        .expect("close issue")
        .expect("closed issue updated");

    let unauthenticated = rest_get(app.clone(), "/yona/api/v1/site/issues", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/site/issues",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let invalid_state = rest_get(
        app.clone(),
        "/yona/api/v1/site/issues?state=waiting",
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(invalid_state.status(), StatusCode::BAD_REQUEST);

    let open = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/issues?state=open&pageNum=1",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(open["state"], "open");
    assert_eq!(open["page"], 1);
    assert_eq!(open["pageSize"], 30);
    assert_eq!(open["total"], 1);
    assert_eq!(open["totalPages"], 1);
    assert_eq!(open["issues"][0]["ownerName"], "member");
    assert_eq!(open["issues"][0]["projectName"], "issueproj");
    assert_eq!(
        open["issues"][0]["issueNumber"],
        open_issue.issue_number.to_string()
    );
    assert_eq!(open["issues"][0]["title"], "Open site issue");
    assert_eq!(open["issues"][0]["authorLoginId"], "member");
    assert_eq!(open["issues"][0]["authorLabel"], "Member Name");
    assert_eq!(
        open["issues"][0]["projectLogoUrl"],
        format!("/yona/files/{}", logo.id)
    );
    assert!(open["issues"][0]["authorAvatarUrl"]
        .as_str()
        .expect("author avatar url")
        .starts_with("https://www.gravatar.com/avatar/"));
    assert_eq!(open["issues"][0]["state"], "open");
    assert_eq!(open["issues"][0]["commentCount"], 0);

    let closed = response_json(
        rest_get(
            app,
            "/yona/api/v1/site/issues?state=closed&page=1",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(closed["state"], "closed");
    assert_eq!(
        closed["issues"][0]["issueNumber"],
        closed_issue.issue_number.to_string()
    );
    assert_eq!(closed["issues"][0]["title"], "Closed site issue");
    assert_eq!(closed["issues"][0]["state"], "closed");
}

#[tokio::test]
async fn site_admin_diagnostics_are_site_admin_only_and_report_legacy_error_list() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let repo = AppRepository::new(db.clone());
    let asset_root = tempfile::tempdir().expect("site diagnostic assets");
    std::fs::write(
        asset_root.path().join("index.html"),
        "<!doctype html><html><head></head><body><main id=\"root\">legacy index</main></body></html>",
    )
    .expect("index html");
    let app = create_router_with_repository_and_filesystem_assets_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        repo,
        asset_root.path().to_path_buf(),
        AppRuntimeConfig::default(),
    );
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (_member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    let unauthenticated = rest_get(app.clone(), "/yona/api/v1/site/diagnostics", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/site/diagnostics",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let payload = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/diagnostics",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(payload["errorCount"], 0);
    assert_eq!(payload["errors"].as_array().expect("errors").len(), 0);

    let direct_unauthenticated = rest_get(app.clone(), "/yona/sites/diagnostic", None).await;
    assert_eq!(direct_unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let direct_forbidden =
        rest_get(app.clone(), "/yona/sites/diagnostic", Some(&member_cookie)).await;
    assert_eq!(direct_forbidden.status(), StatusCode::FORBIDDEN);

    let direct = rest_get(app, "/yona/sites/diagnostic", Some(&admin_cookie)).await;
    assert_eq!(direct.status(), StatusCode::OK);
    assert_eq!(
        direct.headers().get(http::header::CONTENT_TYPE).unwrap(),
        "text/html; charset=utf-8"
    );
    let direct_body = response_text(direct).await;
    assert!(direct_body.contains("legacy index"));
    assert!(direct_body.contains("window.__YONA_RUNTIME_CONFIG__"));
    assert!(direct_body.contains(r#""basePath":"/yona""#));
    assert!(!direct_body.contains("site.diagnostic.errorNotFound"));
}

#[tokio::test]
async fn site_admin_spa_shell_and_rest_routes_reject_direct_non_admin_access() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let repo = AppRepository::new(db.clone());
    let asset_root = tempfile::tempdir().expect("site admin shell assets");
    std::fs::write(
        asset_root.path().join("index.html"),
        "<!doctype html><html><head></head><body><main id=\"root\">site admin shell</main></body></html>",
    )
    .expect("index html");
    let app = create_router_with_repository_and_filesystem_assets_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        repo,
        asset_root.path().to_path_buf(),
        AppRuntimeConfig::default(),
    );
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (_member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    for path in [
        "/yona/sites/userList",
        "/yona/sites/postList",
        "/yona/sites/mail",
    ] {
        assert_eq!(
            rest_get(app.clone(), path, None).await.status(),
            StatusCode::UNAUTHORIZED,
            "anonymous direct {path} must not receive the SPA shell"
        );
        assert_eq!(
            rest_get(app.clone(), path, Some(&member_cookie))
                .await
                .status(),
            StatusCode::FORBIDDEN,
            "non-admin direct {path} must not receive the SPA shell"
        );
        let response = rest_get(app.clone(), path, Some(&admin_cookie)).await;
        assert_eq!(
            response.status(),
            StatusCode::OK,
            "site admin direct {path}"
        );
        assert!(response_text(response).await.contains("site admin shell"));
    }

    for path in ["/yona/api/v1/site/users", "/yona/api/v1/site/posts"] {
        assert_eq!(
            rest_get(app.clone(), path, None).await.status(),
            StatusCode::UNAUTHORIZED,
            "anonymous {path} must be denied"
        );
        assert_eq!(
            rest_get(app.clone(), path, Some(&member_cookie))
                .await
                .status(),
            StatusCode::FORBIDDEN,
            "non-admin {path} must be denied"
        );
        assert_eq!(
            rest_get(app.clone(), path, Some(&admin_cookie))
                .await
                .status(),
            StatusCode::OK,
            "site admin {path} remains available"
        );
    }
}

#[tokio::test]
async fn site_admin_update_status_follows_legacy_update_view_branches() {
    // Guards site-admin update status using the app-scoped service update config snapshot.
    let (app, _repo, db) = build_app_with_site_update_config(SiteUpdateConfig::default()).await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (_member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    let unauthenticated = rest_get(app.clone(), "/yona/api/v1/site/update", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/site/update",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let payload =
        response_json(rest_get(app, "/yona/api/v1/site/update", Some(&admin_cookie)).await).await;
    assert!(
        payload["currentVersion"]
            .as_str()
            .expect("current version")
            .trim()
            .len()
            > 0
    );
    assert_eq!(payload["message"], "site.update.isNotNecessary");
    assert!(payload["versionToUpdate"].is_null());
    assert!(payload["releaseUrl"].is_null());
    assert!(payload["error"].is_null());
}

#[tokio::test]
async fn site_admin_update_status_does_not_synthesize_an_upstream_release_url() {
    let (app, _repo, db) = build_app_with_site_update_config(SiteUpdateConfig {
        current_version: "9.9.8".to_string(),
        latest_version: "v9.9.9".to_string(),
        ..SiteUpdateConfig::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let payload =
        response_json(rest_get(app.clone(), "/yona/api/v1/site/update", Some(&admin_cookie)).await)
            .await;
    assert_eq!(payload["message"], "site.update.isAvailable");
    assert_eq!(payload["versionToUpdate"], "v9.9.9");
    assert!(payload["releaseUrl"].is_null());
    assert!(!payload
        .to_string()
        .contains("github.com/yona-projects/yona"));

    let download = rest_get(
        app,
        "/yona/api/v1/site/update/download",
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(download.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn site_admin_update_status_discovers_live_metadata_when_configured() {
    let metadata_dir = tempfile::tempdir().expect("metadata tempdir");
    let metadata_path = metadata_dir.path().join("latest.json");
    std::fs::write(
        &metadata_path,
        r#"{"tag_name":"v9.9.9","html_url":"https://downloads.example.test/yona/v9.9.9"}"#,
    )
    .expect("write metadata");
    let (app, _repo, db) = build_app_with_site_update_config(SiteUpdateConfig {
        current_version: "9.9.8".to_string(),
        metadata_url: format!("file://{}", metadata_path.display()),
        ..SiteUpdateConfig::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let payload =
        response_json(rest_get(app, "/yona/api/v1/site/update", Some(&admin_cookie)).await).await;
    assert_eq!(payload["currentVersion"], "9.9.8");
    assert_eq!(payload["message"], "site.update.isAvailable");
    assert_eq!(payload["versionToUpdate"], "v9.9.9");
    assert_eq!(
        payload["releaseUrl"],
        "https://downloads.example.test/yona/v9.9.9"
    );
    assert!(payload["error"].is_null());
}

#[tokio::test]
async fn site_admin_update_status_decodes_plain_http_chunked_metadata() {
    let metadata_url = spawn_chunked_update_asset_server(
        "/latest.json",
        "application/json",
        vec![
            br#"{"tag_name":"#,
            br#""v9.9.9","#,
            br#""html_url":"https://downloads.example.test/yona/v9.9.9"}"#,
        ],
    );
    let (app, _repo, db) = build_app_with_site_update_config(SiteUpdateConfig {
        current_version: "9.9.8".to_string(),
        metadata_url,
        ..SiteUpdateConfig::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let payload =
        response_json(rest_get(app, "/yona/api/v1/site/update", Some(&admin_cookie)).await).await;
    assert_eq!(payload["currentVersion"], "9.9.8");
    assert_eq!(payload["message"], "site.update.isAvailable");
    assert_eq!(payload["versionToUpdate"], "v9.9.9");
    assert_eq!(
        payload["releaseUrl"],
        "https://downloads.example.test/yona/v9.9.9"
    );
    assert!(payload["error"].is_null());
}

#[tokio::test]
async fn site_admin_update_download_redirects_through_app_owned_routes() {
    // Guards REST and direct update download routes using the same service snapshot.
    let (app, _repo, db) = build_app_with_site_update_config(SiteUpdateConfig {
        current_version: "9.9.8".to_string(),
        latest_version: "v9.9.9".to_string(),
        release_url: "https://downloads.example.test/yona/v9.9.9".to_string(),
        ..SiteUpdateConfig::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (_member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    let unauthenticated = rest_get(app.clone(), "/yona/api/v1/site/update/download", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/site/update/download",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let rest_download = rest_get(
        app.clone(),
        "/yona/api/v1/site/update/download",
        Some(&admin_cookie),
    )
    .await;
    assert_eq!(rest_download.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        response_location(&rest_download),
        "https://downloads.example.test/yona/v9.9.9"
    );

    let direct_forbidden = rest_get(
        app.clone(),
        "/yona/sites/update/download",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(direct_forbidden.status(), StatusCode::FORBIDDEN);

    let direct_download = rest_get(app, "/yona/sites/update/download", Some(&admin_cookie)).await;
    assert_eq!(direct_download.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        response_location(&direct_download),
        "https://downloads.example.test/yona/v9.9.9"
    );
    assert_eq!(response_text(direct_download).await, "");
}

#[tokio::test]
async fn site_admin_update_download_file_proxies_configured_plain_http_binary() {
    let release_url = spawn_update_asset_server(
        "/releases/yona-9.9.9.zip",
        "application/zip",
        b"portable-yona-update",
    );
    let (app, _repo, db) = build_app_with_site_update_config(SiteUpdateConfig {
        current_version: "9.9.8".to_string(),
        latest_version: "v9.9.9".to_string(),
        release_url,
        ..SiteUpdateConfig::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (_member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    let unauthenticated =
        rest_get(app.clone(), "/yona/api/v1/site/update/download-file", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/site/update/download-file",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let rest_download = rest_get(
        app.clone(),
        "/yona/api/v1/site/update/download-file",
        Some(&admin_cookie),
    )
    .await;
    if rest_download.status() != StatusCode::OK {
        panic!(
            "expected HTTPS update download to succeed, got {}: {}",
            rest_download.status(),
            response_text(rest_download).await
        );
    }
    assert_eq!(
        rest_download
            .headers()
            .get(http::header::CONTENT_TYPE)
            .unwrap(),
        "application/zip"
    );
    assert!(rest_download
        .headers()
        .get(http::header::CONTENT_DISPOSITION)
        .unwrap()
        .to_str()
        .unwrap()
        .contains("yona-9.9.9.zip"));
    assert_eq!(response_bytes(rest_download).await, b"portable-yona-update");
}

#[tokio::test]
async fn site_admin_update_download_file_decodes_plain_http_chunked_binary() {
    let release_url = spawn_chunked_update_asset_server(
        "/releases/yona-9.9.9.zip",
        "application/zip",
        vec![b"portable-", b"yona-", b"update"],
    );
    let (app, _repo, db) = build_app_with_site_update_config(SiteUpdateConfig {
        current_version: "9.9.8".to_string(),
        latest_version: "v9.9.9".to_string(),
        release_url,
        ..SiteUpdateConfig::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let rest_download = rest_get(
        app,
        "/yona/api/v1/site/update/download-file",
        Some(&admin_cookie),
    )
    .await;
    if rest_download.status() != StatusCode::OK {
        panic!(
            "expected chunked HTTP update download to succeed, got {}: {}",
            rest_download.status(),
            response_text(rest_download).await
        );
    }
    assert_eq!(
        rest_download
            .headers()
            .get(http::header::CONTENT_TYPE)
            .unwrap(),
        "application/zip"
    );
    assert_eq!(response_bytes(rest_download).await, b"portable-yona-update");
}

#[tokio::test]
async fn site_admin_update_download_file_proxies_configured_https_binary() {
    // Guards the routes/site_admin/update.rs HTTPS update fetch command and download proxy split.
    let fake_curl_dir = tempfile::tempdir().expect("fake curl tempdir");
    let fake_curl = fake_curl_dir.path().join("fake-curl.sh");
    std::fs::write(
        &fake_curl,
        "#!/bin/sh\nprintf 'HTTP/1.1 200 OK\\r\\nContent-Type: application/zip\\r\\n\\r\\nportable-yona-update'\n",
    )
    .expect("write fake curl");
    let (app, _repo, db) = build_app_with_site_update_config(SiteUpdateConfig {
        current_version: "9.9.8".to_string(),
        latest_version: "v9.9.9".to_string(),
        release_url: "https://downloads.example.test/releases/yona-9.9.9.zip".to_string(),
        https_fetch_command: format!("sh {}", fake_curl.display()),
        ..SiteUpdateConfig::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let rest_download = rest_get(
        app,
        "/yona/api/v1/site/update/download-file",
        Some(&admin_cookie),
    )
    .await;
    if rest_download.status() != StatusCode::OK {
        panic!(
            "expected HTTPS update download to succeed, got {}: {}",
            rest_download.status(),
            response_text(rest_download).await
        );
    }
    assert_eq!(
        rest_download
            .headers()
            .get(http::header::CONTENT_TYPE)
            .unwrap(),
        "application/zip"
    );
    assert!(rest_download
        .headers()
        .get(http::header::CONTENT_DISPOSITION)
        .unwrap()
        .to_str()
        .unwrap()
        .contains("yona-9.9.9.zip"));
    assert_eq!(response_bytes(rest_download).await, b"portable-yona-update");
}

#[tokio::test]
async fn site_admin_mail_send_and_recipient_lookup_follow_legacy_surface() {
    // Guards the site-admin mail DTO route-module ownership split and SMTP
    // runtime snapshot plumbing through the shared PilotServiceImpl wrapper,
    // including the direct legacy POST /sites/mail form submit path.
    clear_test_outbox();

    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        smtp: SmtpRuntimeConfig {
            from: "site-admin@yona.local".to_string(),
            ..SmtpRuntimeConfig::default()
        },
        ..AppRuntimeConfig::default()
    })
    .await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    let (_observer_csrf, _observer_cookie, observer_id) =
        register_user(app.clone(), "observer").await;
    mark_site_admin(&db, admin_id).await;
    create_project(
        app.clone(),
        &member_cookie,
        &member_csrf,
        "member",
        "mailproj",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("member", "mailproj")
        .await
        .expect("read project")
        .expect("project");
    repo.add_project_membership(project.id, observer_id, "member")
        .await
        .expect("add observer membership");

    let unauthenticated = rest_get(app.clone(), "/yona/api/v1/site/mail", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(app.clone(), "/yona/api/v1/site/mail", Some(&member_cookie)).await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let options =
        response_json(rest_get(app.clone(), "/yona/api/v1/site/mail", Some(&admin_cookie)).await)
            .await;
    assert_eq!(options["sender"], "site-admin@yona.local");
    assert_eq!(options["sent"], false);
    assert_eq!(
        options["notConfiguredItems"],
        json!(["smtp.host", "smtp.user", "smtp.password"])
    );

    let send_forbidden = rest_json(
        app.clone(),
        Method::POST,
        "/yona/api/v1/site/mail/test",
        Some(&member_cookie),
        Some(&member_csrf),
        json!({
            "from": "site-admin@yona.local",
            "to": "receiver@example.com",
            "subject": "Test subject",
            "body": "Test body"
        }),
    )
    .await;
    assert_eq!(send_forbidden.status(), StatusCode::FORBIDDEN);

    let sent = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/site/mail/test",
            Some(&admin_cookie),
            Some(&admin_csrf),
            json!({
                "from": "site-admin@yona.local",
                "to": "receiver@example.com",
                "subject": "Test subject",
                "body": "Test body"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(sent["sent"], true);
    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].from, "site-admin@yona.local");
    assert_eq!(outbox[0].to, "receiver@example.com");
    assert_eq!(outbox[0].bcc, Vec::<String>::new());
    assert_eq!(outbox[0].reply_to, None);
    assert_eq!(outbox[0].subject, "Test subject");
    assert_eq!(outbox[0].body, "Test body");
    assert!(!outbox[0].html);

    let direct_sent = rest_raw_post(
        app.clone(),
        "/yona/sites/mail",
        Some(&admin_cookie),
        Some(&admin_csrf),
        "application/x-www-form-urlencoded",
        "from=site-admin%40yona.local&to=direct%40example.com&subject=Direct+subject&body=Direct+body",
    )
    .await;
    assert_eq!(direct_sent.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        direct_sent
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/sites/mail?sended=true")
    );
    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 2);
    assert_eq!(outbox[1].from, "site-admin@yona.local");
    assert_eq!(outbox[1].to, "direct@example.com");
    assert_eq!(outbox[1].bcc, Vec::<String>::new());
    assert_eq!(outbox[1].reply_to, None);
    assert_eq!(outbox[1].subject, "Direct subject");
    assert_eq!(outbox[1].body, "Direct body");
    assert!(!outbox[1].html);

    let all_recipients = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/site/mail-list",
            Some(&admin_cookie),
            Some(&admin_csrf),
            json!({ "all": true }),
        )
        .await,
    )
    .await;
    assert_eq!(
        all_recipients["recipients"],
        json!([
            "member@example.com",
            "observer@example.com",
            "siteboss@example.com"
        ])
    );

    let project_recipients = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/site/mail-list",
            Some(&admin_cookie),
            Some(&admin_csrf),
            json!({ "projects": ["member/mailproj"] }),
        )
        .await,
    )
    .await;
    assert_eq!(
        project_recipients["recipients"],
        json!(["member@example.com", "observer@example.com"])
    );

    let direct_all_recipients = response_json(
        rest_raw_post(
            app.clone(),
            "/yona/sites/mailList",
            Some(&admin_cookie),
            Some(&admin_csrf),
            "application/x-www-form-urlencoded",
            "all=true",
        )
        .await,
    )
    .await;
    assert_eq!(
        direct_all_recipients,
        json!([
            "member@example.com",
            "observer@example.com",
            "siteboss@example.com"
        ])
    );

    let direct_project_recipients = response_json(
        rest_raw_post(
            app.clone(),
            "/yona/sites/mailList",
            Some(&admin_cookie),
            Some(&admin_csrf),
            "application/x-www-form-urlencoded",
            "0=member%2Fmailproj",
        )
        .await,
    )
    .await;
    assert_eq!(
        direct_project_recipients,
        json!(["member@example.com", "observer@example.com"])
    );
    assert!(direct_project_recipients.as_array().is_some());

    let blank_optional_fields = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/site/mail/test",
            Some(&admin_cookie),
            Some(&admin_csrf),
            json!({
                "from": "site-admin@yona.local",
                "to": "blank@example.com",
                "subject": "",
                "body": ""
            }),
        )
        .await,
    )
    .await;
    assert_eq!(blank_optional_fields["sent"], true);
    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 3);
    assert_eq!(outbox[2].to, "blank@example.com");
    assert_eq!(outbox[2].subject, "");
    assert_eq!(outbox[2].body, "");
}

#[tokio::test]
async fn site_admin_mail_options_use_runtime_smtp_config_without_env_mutation() {
    let (app, _repo, db) = build_app_with_app_config(AppRuntimeConfig {
        smtp: SmtpRuntimeConfig {
            host: "smtp.snapshot.example.com".to_string(),
            password: "snapshot-pass".to_string(),
            site_hostname: "snapshot-host.example.com".to_string(),
            user: "snapshot-user".to_string(),
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let options =
        response_json(rest_get(app, "/yona/api/v1/site/mail", Some(&admin_cookie)).await).await;

    assert_eq!(options["notConfiguredItems"], json!([]));
    assert_eq!(options["sender"], "snapshot-user@snapshot-host.example.com");
}

#[tokio::test]
// Guards route-utils-owned SMTP sender derivation from the app runtime snapshot.
async fn site_admin_mail_sender_derives_from_runtime_smtp_user_and_domain() {
    let (app, _repo, db) = build_app_with_app_config(AppRuntimeConfig {
        smtp: SmtpRuntimeConfig {
            domain: "example.com".to_string(),
            host: "smtp.example.com".to_string(),
            password: "smtp-password".to_string(),
            user: "smtp-user".to_string(),
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let options =
        response_json(rest_get(app, "/yona/api/v1/site/mail", Some(&admin_cookie)).await).await;

    assert_eq!(options["sender"], "smtp-user@example.com");
    assert_eq!(options["notConfiguredItems"], json!([]));
}

#[tokio::test]
// Guards route-utils-owned SMTP sender fallback through the configured site hostname.
async fn site_admin_mail_sender_uses_runtime_site_hostname_when_smtp_domain_is_absent() {
    let (app, _repo, db) = build_app_with_app_config(AppRuntimeConfig {
        smtp: SmtpRuntimeConfig {
            host: "smtp.example.com".to_string(),
            password: "smtp-password".to_string(),
            site_hostname: "host.example.com".to_string(),
            user: "smtp-user".to_string(),
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let options =
        response_json(rest_get(app, "/yona/api/v1/site/mail", Some(&admin_cookie)).await).await;

    assert_eq!(options["sender"], "smtp-user@host.example.com");
    assert_eq!(options["notConfiguredItems"], json!([]));
}

#[tokio::test]
async fn site_admin_mail_sender_accepts_runtime_smtp_from_override() {
    let (app, _repo, db) = build_app_with_app_config(AppRuntimeConfig {
        smtp: SmtpRuntimeConfig {
            domain: "example.com".to_string(),
            from: "override@yona.example".to_string(),
            host: "smtp.example.com".to_string(),
            password: "smtp-password".to_string(),
            user: "smtp-user".to_string(),
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    let (_admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;

    let options =
        response_json(rest_get(app, "/yona/api/v1/site/mail", Some(&admin_cookie)).await).await;

    assert_eq!(options["sender"], "override@yona.example");
    assert_eq!(options["notConfiguredItems"], json!([]));
}

#[tokio::test]
async fn site_admin_migration_token_auth_restores_orgs_prs_passwords_and_ids() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (_admin_csrf, _admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;
    let token = repo
        .reset_api_token_for_user(admin_id)
        .await
        .expect("api token");

    // Legacy SHA-256 hash for "pass" (Sha256Hash(password, salt, 1024)).
    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "id": 101,
            "loginId": "imported",
            "displayName": "Imported",
            "emailAddress": "imported@example.com",
            "password": "r0egKhZzB4AkoXUp9kRF1BNxv9LWeaLAhV0yhz1lgmU=",
            "passwordSalt": "c2FsdC1mb3ItdGVzdA==",
            "state": "ACTIVE",
            "isSiteAdmin": false,
            "createdAt": "2020-01-01T00:00:01+0000",
            "lastStateModifiedAt": "2020-01-01T00:00:02+0000"
        }],
        "organizations": [{
            "id": 10,
            "name": "myorg",
            "description": "org desc",
            "createdAt": "2020-01-01T00:00:00+0000"
        }],
        "organizationMembers": [{
            "id": 100,
            "organizationId": 10,
            "userId": 101,
            "role": "org_admin"
        }],
        "projects": [{
            "id": 20,
            "ownerName": "myorg",
            "projectName": "repo",
            "overview": "Migrated repo",
            "projectScope": "protected",
            "projectVcs": "GIT",
            "organizationId": 10,
            "createdAt": "2020-01-01T00:00:00+0000"
        }],
        "projectMembers": [{
            "id": 200,
            "loginId": "imported",
            "ownerName": "myorg",
            "projectName": "repo",
            "role": "manager"
        }],
        "issues": [{
            "id": 50,
            "issueNumber": "1",
            "title": "Migrated issue",
            "bodyMarkdown": "issue body",
            "state": "open",
            "authorLoginId": "imported",
            "ownerName": "myorg",
            "projectName": "repo",
            "createdAt": "2020-01-02T03:00:00+0000",
            "updatedAt": "2020-01-02T04:00:00+0000",
            "comments": [{
                "id": 51,
                "authorLoginId": "imported",
                "contentsMarkdown": "issue comment",
                "createdAt": "2020-01-02T05:00:00+0000"
            }],
            "labels": [],
            "attachments": []
        }],
        "posts": [{
            "id": 60,
            "postNumber": "1",
            "title": "Migrated post",
            "bodyMarkdown": "post body",
            "authorLoginId": "imported",
            "ownerName": "myorg",
            "projectName": "repo",
            "notice": false,
            "readme": false,
            "createdAt": "2020-01-03T00:00:00+0000",
            "updatedAt": "2020-01-03T00:00:00+0000",
            "comments": [],
            "labels": [],
            "attachments": []
        }],
        "pullRequests": [{
            "id": 70,
            "projectId": 20,
            "contributorId": 101,
            "receiverId": 101,
            "number": 1,
            "title": "Migrated PR",
            "bodyMarkdown": "pr body",
            "state": "OPEN",
            "isMerged": false,
            "createdAt": "2020-01-04T00:00:00+0000",
            "updatedAt": "2020-01-04T00:00:00+0000",
            "events": [{
                "id": 71,
                "pullRequestId": 70,
                "senderLoginId": "imported",
                "eventType": "NEW_PULL_REQUEST",
                "newValue": "Migrated PR",
                "createdAt": "2020-01-04T00:00:00+0000"
            }],
            "threads": [],
            "reviewComments": [],
            "commitComments": []
        }]
    });

    // Token-authenticated import (Bearer, no CSRF).
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/site/import")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::AUTHORIZATION, format!("Bearer {token}"))
                .body(Body::from(payload.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let imported = response_json(response).await;
    assert_eq!(imported["importedUsers"], 1);
    assert_eq!(imported["importedOrganizations"], 1);
    assert_eq!(imported["importedOrganizationMembers"], 1);
    assert_eq!(imported["importedProjects"], 1);
    assert_eq!(imported["importedProjectMembers"], 1);
    assert_eq!(imported["importedIssues"], 1);
    assert_eq!(imported["importedPosts"], 1);
    assert_eq!(imported["importedPullRequests"], 1);

    // Legacy ids preserved and FKs intact.
    let user = repo
        .find_user_by_login_id("imported")
        .await
        .expect("read user")
        .expect("imported user exists");
    assert_eq!(user.id, 101);
    assert_eq!(
        user.password_hash,
        "r0egKhZzB4AkoXUp9kRF1BNxv9LWeaLAhV0yhz1lgmU="
    );
    assert_eq!(user.password_salt.as_deref(), Some("c2FsdC1mb3ItdGVzdA=="));
    let org = repo
        .read_organization_by_id(10)
        .await
        .expect("read org")
        .expect("imported org exists");
    assert_eq!(org.organization_name, "myorg");
    let project = repo
        .read_project_by_owner_and_name("myorg", "repo")
        .await
        .expect("read project")
        .expect("imported project exists");
    assert_eq!(project.id, 20);
    assert_eq!(project.organization_id, Some(10));
    let issue = repo
        .read_issue_detail("myorg", "repo", 1)
        .await
        .expect("read issue")
        .expect("imported issue exists");
    assert_eq!(issue.id, 50);
    assert_eq!(issue.title, "Migrated issue");
    assert_eq!(issue.comments.len(), 1);
    let post = repo
        .read_posting_detail_for_viewer("myorg", "repo", 1, None)
        .await
        .expect("read post")
        .expect("imported post exists");
    assert_eq!(post.id, 60);
    let pr = repo
        .read_pull_request_detail("myorg", "repo", 1, None)
        .await
        .expect("read pr")
        .expect("imported pr exists");
    assert_eq!(pr.title, "Migrated PR");

    // The legacy SHA-256 hash keeps the old password working.
    let (login_csrf, login_cookie) = bootstrap(app.clone()).await;
    let sign_in = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/SignInWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &login_cookie)
                .header("x-csrf-token", &login_csrf)
                .body(Body::from(
                    "{\"identifier\":\"imported\",\"password\":\"pass\",\"rememberMe\":false}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_in.status(), StatusCode::OK);

    // Token-authenticated site export returns the same structure.
    let export = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/site/export")
                .header(http::header::AUTHORIZATION, format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(export.status(), StatusCode::OK);
    let exported = response_json(export).await;
    assert_eq!(exported["format"], "yobi-data");
    assert_eq!(
        exported["projects"]
            .as_array()
            .expect("projects array")
            .iter()
            .find(|project| project["projectName"] == "repo")
            .expect("exported project")["ownerName"],
        "myorg"
    );
    let exported_issue = exported["issues"]
        .as_array()
        .expect("issues array")
        .iter()
        .find(|issue| issue["issueNumber"] == "1")
        .expect("exported issue");
    assert_eq!(exported_issue["title"], "Migrated issue");
    assert_eq!(exported_issue["id"], 50);

    // A non-admin token is rejected on the site-import surface.
    let (_, _, plain_id) = register_user(app.clone(), "plain").await;
    let plain_token = repo
        .reset_api_token_for_user(plain_id)
        .await
        .expect("plain token");
    let forbidden = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/site/export")
                .header(http::header::AUTHORIZATION, format!("Bearer {plain_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn site_import_svn_provisioning_tolerates_leftover_repo_dir() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (_admin_csrf, _admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;
    let token = repo
        .reset_api_token_for_user(admin_id)
        .await
        .expect("api token");

    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "id": 101,
            "loginId": "imported",
            "displayName": "Imported",
            "emailAddress": "imported@example.com",
            "state": "ACTIVE",
            "isSiteAdmin": false,
            "createdAt": "2020-01-01T00:00:00+0000",
            "lastStateModifiedAt": "2020-01-01T00:00:00+0000"
        }],
        "organizations": [],
        "organizationMembers": [],
        "projects": [{
            "id": 20,
            "ownerName": "imported",
            "projectName": "svnproj",
            "overview": "SVN project",
            "projectScope": "public",
            "projectVcs": "Subversion",
            "createdAt": "2020-01-01T00:00:00+0000"
        }],
        "projectMembers": [],
        "labels": [],
        "milestones": [],
        "posts": [],
        "issues": [],
        "pullRequests": []
    });

    let post_import = |payload: Value| {
        let app = app.clone();
        let token = token.clone();
        async move {
            app.clone()
                .oneshot(
                    Request::builder()
                        .method(Method::POST)
                        .uri("/yona/api/v1/site/import")
                        .header(http::header::CONTENT_TYPE, "application/json")
                        .header(http::header::AUTHORIZATION, format!("Bearer {token}"))
                        .body(Body::from(payload.to_string()))
                        .unwrap(),
                )
                .await
                .unwrap()
        }
    };

    // First import provisions the empty SVN repo directory.
    let response = post_import(payload.clone()).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response_json(response).await["importedProjects"], 1);
    let svn_repo_dir = data_dir
        .path()
        .join("repo")
        .join("svn")
        .join("imported")
        .join("svnproj");
    assert!(svn_repo_dir.is_dir(), "svn repo provisioned on import");

    // A rolled-back import leaves the repo directory behind while the project
    // row is gone; re-importing must tolerate the leftover directory instead
    // of failing `svnadmin create`.
    project::Entity::delete_by_id(20)
        .exec(&db)
        .await
        .expect("drop project row");
    let response = post_import(payload).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response_json(response).await["importedProjects"], 1);
    let restored = repo
        .read_project_by_owner_and_name("imported", "svnproj")
        .await
        .expect("project re-created")
        .expect("project row present");
    assert_eq!(restored.vcs, "Subversion");
}

#[tokio::test]
async fn site_import_creates_placeholder_attachments_and_accepts_out_of_band_files() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (_admin_csrf, _admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;
    let token = repo
        .reset_api_token_for_user(admin_id)
        .await
        .expect("api token");

    let legacy_hash = "a".repeat(64);
    let payload = json!({
        "format": "yobi-data",
        "users": [{
            "id": 101,
            "loginId": "imported",
            "displayName": "Imported",
            "emailAddress": "imported@example.com",
            "state": "ACTIVE",
            "isSiteAdmin": false,
            "createdAt": "2020-01-01T00:00:00+0000",
            "lastStateModifiedAt": "2020-01-01T00:00:00+0000"
        }],
        "organizations": [],
        "organizationMembers": [],
        "projects": [{
            "id": 20,
            "ownerName": "imported",
            "projectName": "restored",
            "overview": "Migrated",
            "projectScope": "public",
            "projectVcs": "GIT",
            "createdAt": "2020-01-01T00:00:00+0000"
        }],
        "projectMembers": [],
        "labels": [],
        "milestones": [],
        "posts": [],
        "issues": [{
            "id": 50,
            "issueNumber": "1",
            "title": "Issue with attachment",
            "bodyMarkdown": "see /files/900",
            "state": "open",
            "authorLoginId": "imported",
            "ownerName": "imported",
            "projectName": "restored",
            "createdAt": "2020-01-02T00:00:00+0000",
            "updatedAt": "2020-01-02T00:00:00+0000",
            "comments": [],
            "labels": [],
            "attachments": [{
                "id": 900,
                "name": "proof.png",
                "mimeType": "image/png",
                "size": 4,
                "hash": legacy_hash.clone(),
                "createdAt": "2020-01-02T00:00:00+0000"
            }]
        }],
        "pullRequests": []
    });

    // Out-of-band upload first (placeholder flow: the import does not need
    // the file present).
    let upload_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/site/import/files")
                .header(http::header::AUTHORIZATION, format!("Bearer {token}"))
                .header(
                    http::header::CONTENT_TYPE,
                    "multipart/form-data; boundary=testboundary",
                )
                .body(Body::from(
                    "--testboundary\r\nContent-Disposition: form-data; name=\"hash\"\r\n\r\n"
                        .to_string()
                        + &legacy_hash
                        + "\r\n--testboundary\r\nContent-Disposition: form-data; name=\"file\"; filename=\"proof.png\"\r\nContent-Type: application/octet-stream\r\n\r\nAAAA\r\n--testboundary--\r\n",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(upload_response.status(), StatusCode::OK);
    assert!(
        data_dir
            .path()
            .join(format!("uploads/{legacy_hash}"))
            .is_file(),
        "file staged at uploads/legacy-hash"
    );

    // Import creates the placeholder attachment row without inline content.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/site/import")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::AUTHORIZATION, format!("Bearer {token}"))
                .body(Body::from(payload.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let imported = response_json(response).await;
    assert_eq!(imported["importedIssues"], 1);

    let attachments = attachment::Entity::find()
        .filter(attachment::Column::Hash.eq(&legacy_hash))
        .all(&db)
        .await
        .expect("attachment rows");
    assert_eq!(attachments.len(), 1);
    assert_eq!(attachments[0].hash.as_deref(), Some(legacy_hash.as_str()));
    assert_eq!(attachments[0].name.as_deref(), Some("proof.png"));
}
