use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;

// Guards site-admin update helper ownership while server config helpers are
// imported from their owning module instead of the root.
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, Database, DatabaseConnection, EntityTrait,
    NotSet, QueryFilter, Set, Statement,
};
use serde_json::{json, Value};
use tower::ServiceExt;
use yona_rust_integrations::{clear_test_outbox, snapshot_test_outbox};
use yona_rust_persistence::{
    attachment, issue, milestone, n4user, posting, project, project_user, site_admin,
    AppRepository, CreateIssueCommentInput, CreateIssueInput, CreatePostingCommentInput,
    CreatePostingInput, CreateProjectLabelInput, IssueMutationInput, MilestoneListFilter,
    MilestoneMutationInput, PostingMutationInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router_with_app_repository, create_router_with_repository_and_app_config,
    AppRuntimeConfig, RuntimeConfig, SiteUpdateConfig, SmtpRuntimeConfig,
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
                .uri("/yona/-_-api/v1/admin/users")
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
                .uri("/yona/-_-api/v1/admin/users")
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
        created_date: Set(None),
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
        "/yona/member",
        Some(&member_cookie),
        Some(&member_csrf),
    )
    .await;
    assert_eq!(forbidden_legacy_reset.status(), StatusCode::FORBIDDEN);

    let legacy_reset = response_json(
        rest_post(
            app.clone(),
            "/yona/member",
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

    let response = rest_get(app, "/yona/sites/export", Some(&admin_cookie)).await;
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
        .any(|user| user["loginId"] == "member"));
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
    assert_eq!(payload["posts"][0]["title"], "Data export post");
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
            "isSiteAdmin": false,
            "state": "ACTIVE"
        }, {
            "loginId": "imported-member",
            "displayName": "Imported Member",
            "emailAddress": "imported-member@example.com",
            "isSiteAdmin": false,
            "state": "ACTIVE"
        }],
        "projects": [{
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
                "contentsMarkdown": "restored post comment"
            }],
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
            "title": "Restored post"
        }],
        "issues": [{
            "assigneeLoginId": "",
            "authorLoginId": "imported",
            "bodyMarkdown": "restored issue body",
            "comments": [{
                "authorLoginId": "imported",
                "contentsMarkdown": "restored issue comment"
            }],
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
            "title": "Restored issue"
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
                "id": 901,
                "mimeType": "text/plain",
                "name": "portable-post.txt",
                "size": 18
            }],
            "bodyMarkdown": "post with portable attachment /files/901",
            "comments": [{
                "attachments": [{
                    "contentBase64": "cG9ydGFibGUtY29tbWVudC1maWxl",
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
        std::fs::read(data_dir.path().join("uploads").join(post_hash)).expect("post bytes"),
        b"portable-post-file"
    );
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
        std::fs::read(data_dir.path().join("uploads").join(comment_hash)).expect("comment bytes"),
        b"portable-comment-file"
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
    let upload_count = std::fs::read_dir(data_dir.path().join("uploads"))
        .map(|entries| entries.count())
        .unwrap_or_default();
    assert_eq!(upload_count, 0, "failed import must remove portable files");
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
    assert_eq!(user(&active, "member")["isSiteAdmin"], false);
    assert_eq!(user(&active, "member")["state"], "ACTIVE");
    assert_eq!(
        user(&active, "member")["avatarUrl"],
        format!("/yona/files/{}", member_avatar.id)
    );

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
    assert!(site_admin_ids.contains(&"siteboss".to_string()));
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
    let beta_repo_path = yona_rust_vcs::repository_path(data_root.path(), beta_project.id);
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
    assert_eq!(filtered["pageSize"], 30);
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
    let (app, _repo, db) = build_app_with_repository().await;
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
    assert!(direct_body.contains("site.sidebar.diagnostics"));
    assert!(direct_body.contains("site.diagnostic.errorNotFound"));
    assert!(direct_body.contains(r#"<li class="active"><a href="/sites/diagnostic">"#));
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
            app,
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
