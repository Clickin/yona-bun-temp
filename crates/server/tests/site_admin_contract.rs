use axum::body::Body;
use bcrypt::verify;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ActiveModelTrait, Database, DatabaseConnection, Set};
use serde_json::json;
use tower::ServiceExt;
use yona_rust_persistence::{
    site_admin, AppRepository, CreateIssueInput, CreatePostingInput, CreateProjectInput,
    IssueMutationInput, PostingMutationInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

async fn build_app_with_repository() -> (axum::Router, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());
    let app = create_router_with_app_repository(
        RuntimeConfig {
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo,
    );

    (app, db)
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

async fn response_json(response: Response<Body>) -> serde_json::Value {
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
    payload: serde_json::Value,
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

async fn mark_site_admin(db: &DatabaseConnection, user_id: i64) {
    site_admin::ActiveModel {
        id: sea_orm::NotSet,
        admin_id: Set(Some(user_id)),
    }
    .insert(db)
    .await
    .expect("site admin row");
}

async fn create_project(
    db: &DatabaseConnection,
    owner_name: &str,
    project_name: &str,
    overview: &str,
) -> i64 {
    let project = AppRepository::new(db.clone())
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: owner_name.to_string(),
            overview: Some(overview.to_string()),
            project_name: project_name.to_string(),
            project_scope: "public".to_string(),
        })
        .await
        .expect("project");
    project.id
}

async fn create_posting(
    db: &DatabaseConnection,
    actor_id: i64,
    actor_login_id: &str,
    owner_name: &str,
    project_name: &str,
    title: &str,
) -> i64 {
    let post = AppRepository::new(db.clone())
        .create_posting(CreatePostingInput {
            actor_display_name: actor_login_id.to_string(),
            actor_id,
            actor_login_id: actor_login_id.to_string(),
            owner_name: owner_name.to_string(),
            project_name: project_name.to_string(),
            values: PostingMutationInput {
                attachment_ids: Vec::new(),
                body_markdown: "body".to_string(),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: title.to_string(),
            },
        })
        .await
        .expect("posting")
        .expect("created posting");
    post.id
}

async fn create_issue(
    db: &DatabaseConnection,
    actor_id: i64,
    actor_login_id: &str,
    owner_name: &str,
    project_name: &str,
    title: &str,
) -> i64 {
    let issue = AppRepository::new(db.clone())
        .create_issue(CreateIssueInput {
            actor_display_name: actor_login_id.to_string(),
            actor_id,
            actor_login_id: actor_login_id.to_string(),
            owner_name: owner_name.to_string(),
            project_name: project_name.to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: Vec::new(),
                body_markdown: "body".to_string(),
                label_ids: Vec::new(),
                milestone_id: None,
                title: title.to_string(),
            },
        })
        .await
        .expect("issue")
        .expect("created issue");
    issue.issue_number
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
    let mut builder = Request::builder().method(Method::POST).uri(uri);
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

async fn rest_delete(
    app: axum::Router,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
) -> Response<Body> {
    let mut builder = Request::builder().method(Method::DELETE).uri(uri);
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

#[tokio::test]
async fn site_admin_user_list_requires_site_admin_and_filters_legacy_tabs() {
    let (app, db) = build_app_with_repository().await;
    let (_, admin_cookie, admin_id) = register_user(app.clone(), "admin").await;
    let (_, member_cookie, _) = register_user(app.clone(), "member").await;
    let _ = register_user(app.clone(), "needle").await;
    mark_site_admin(&db, admin_id).await;

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/sites/users?state=active&query=member",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let active = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/sites/users?state=ACTIVE&query=mem&pageNum=1&pageSize=30",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(active["state"], "ACTIVE");
    assert_eq!(active["query"], "mem");
    assert_eq!(active["total"], 1);
    assert_eq!(active["items"][0]["loginId"], "member");
    assert_eq!(active["items"][0]["emailAddress"], "member@example.com");
    assert_eq!(active["items"][0]["isSiteAdmin"], false);

    let site_admins = response_json(
        rest_get(
            app,
            "/yona/api/v1/sites/users?state=SITE_ADMIN&pageNum=1&pageSize=30",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(site_admins["state"], "SITE_ADMIN");
    assert_eq!(site_admins["items"][0]["loginId"], "admin");
    assert_eq!(site_admins["items"][0]["isSiteAdmin"], true);
    assert_eq!(site_admins["tabs"][4]["state"], "SITE_ADMIN");
}

#[tokio::test]
async fn site_admin_user_list_actions_require_admin_csrf_and_toggle_legacy_flags() {
    let (app, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "admin").await;
    let (member_csrf, member_cookie, _) = register_user(app.clone(), "member").await;
    mark_site_admin(&db, admin_id).await;

    let forbidden = rest_post(
        app.clone(),
        "/yona/api/v1/sites/users/member/toggle-site-admin",
        Some(&member_cookie),
        Some(&member_csrf),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let invalid_csrf = rest_post(
        app.clone(),
        "/yona/api/v1/sites/users/member/toggle-account-lock",
        Some(&admin_cookie),
        None,
    )
    .await;
    assert_eq!(invalid_csrf.status(), StatusCode::FORBIDDEN);

    let reset_password = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/sites/users/member/reset-password",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(reset_password["loginId"], "member");
    assert_eq!(reset_password["name"], "member");
    assert_eq!(reset_password["isSuccess"], true);
    let new_password = reset_password["newPassword"]
        .as_str()
        .expect("new password");
    assert_eq!(new_password.len(), 6);
    let member = AppRepository::new(db.clone())
        .find_user_by_identifier("member")
        .await
        .unwrap()
        .expect("member after site-admin reset");
    assert!(verify(new_password, &member.password_hash).unwrap());

    let upgraded = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/sites/users/member/toggle-site-admin",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(upgraded["loginId"], "member");
    assert_eq!(upgraded["isSiteAdmin"], true);

    let site_admins = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/sites/users?state=SITE_ADMIN&pageNum=1&pageSize=30",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(site_admins["total"], 2);

    let locked = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/sites/users/member/toggle-account-lock",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(locked["loginId"], "member");
    assert_eq!(locked["state"], "locked");

    let locked_list = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/sites/users?state=LOCKED&pageNum=1&pageSize=30",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(locked_list["items"][0]["loginId"], "member");

    let guest = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/sites/users/member/toggle-guest-mode",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(guest["loginId"], "member");
    assert_eq!(guest["isGuest"], true);

    let guest_list = response_json(
        rest_get(
            app,
            "/yona/api/v1/sites/users?state=GUEST&pageNum=1&pageSize=30",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(guest_list["items"][0]["loginId"], "member");
}

#[tokio::test]
async fn site_admin_project_list_requires_site_admin_and_filters_legacy_names() {
    let (app, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "admin").await;
    let (member_csrf, member_cookie, _) = register_user(app.clone(), "member").await;
    create_project(&db, "admin", "alpha", "Alpha overview").await;
    let expected_project_id =
        create_project(&db, "admin", "needleProject", "Needle overview").await;
    create_project(&db, "member", "other", "Other overview").await;
    mark_site_admin(&db, admin_id).await;

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/sites/projects?filter=needle",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let projects = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/sites/projects?filter=needle&pageNum=1&pageSize=25",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(projects["filter"], "needle");
    assert_eq!(projects["pageNum"], 1);
    assert_eq!(projects["pageSize"], 25);
    assert_eq!(projects["total"], 1);
    assert_eq!(projects["items"][0]["id"], expected_project_id.to_string());
    assert_eq!(projects["items"][0]["ownerName"], "admin");
    assert_eq!(projects["items"][0]["projectName"], "needleProject");
    assert_eq!(projects["items"][0]["overview"], "Needle overview");
    assert_eq!(projects["items"][0]["projectPath"], "/admin/needleProject");
    assert_eq!(
        projects["items"][0]["deletePath"],
        format!("/sites/project/delete/{expected_project_id}")
    );

    let forbidden_delete = rest_delete(
        app.clone(),
        &format!("/yona/api/v1/sites/projects/{expected_project_id}"),
        Some(&member_cookie),
        Some(&member_csrf),
    )
    .await;
    assert_eq!(forbidden_delete.status(), StatusCode::FORBIDDEN);

    let missing_csrf_delete = rest_delete(
        app.clone(),
        &format!("/yona/api/v1/sites/projects/{expected_project_id}"),
        Some(&admin_cookie),
        None,
    )
    .await;
    assert_eq!(missing_csrf_delete.status(), StatusCode::FORBIDDEN);

    let deleted = response_json(
        rest_delete(
            app.clone(),
            &format!("/yona/api/v1/sites/projects/{expected_project_id}"),
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(deleted["ok"], true);

    let after_delete = response_json(
        rest_get(
            app,
            "/yona/api/v1/sites/projects?filter=needle&pageNum=1&pageSize=25",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(after_delete["total"], 0);
    assert!(AppRepository::new(db)
        .read_project_by_id(expected_project_id)
        .await
        .unwrap()
        .is_none());
}

#[tokio::test]
async fn site_admin_post_list_requires_site_admin_and_lists_recent_posts() {
    let (app, db) = build_app_with_repository().await;
    let (_, admin_cookie, admin_id) = register_user(app.clone(), "admin").await;
    let (_, member_cookie, _) = register_user(app.clone(), "member").await;
    create_project(&db, "admin", "projectYobi", "Project overview").await;
    let expected_post_id =
        create_posting(&db, admin_id, "admin", "admin", "projectYobi", "Admin post").await;
    mark_site_admin(&db, admin_id).await;

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/sites/posts",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let posts = response_json(
        rest_get(
            app,
            "/yona/api/v1/sites/posts?pageNum=1&pageSize=30",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(posts["pageNum"], 1);
    assert_eq!(posts["pageSize"], 30);
    assert_eq!(posts["total"], 1);
    assert_eq!(posts["items"][0]["id"], expected_post_id.to_string());
    assert_eq!(posts["items"][0]["ownerName"], "admin");
    assert_eq!(posts["items"][0]["projectName"], "projectYobi");
    assert_eq!(posts["items"][0]["postNumber"], "1");
    assert_eq!(posts["items"][0]["title"], "Admin post");
    assert_eq!(posts["items"][0]["authorLoginId"], "admin");
    assert_eq!(posts["items"][0]["projectPath"], "/admin/projectYobi");
    assert_eq!(posts["items"][0]["postPath"], "/admin/projectYobi/post/1");
    assert_eq!(
        posts["items"][0]["commentsPath"],
        "/admin/projectYobi/post/1#comments"
    );
}

#[tokio::test]
async fn site_admin_issue_list_requires_site_admin_and_filters_legacy_state_tabs() {
    let (app, db) = build_app_with_repository().await;
    let (_, admin_cookie, admin_id) = register_user(app.clone(), "admin").await;
    let (_, member_cookie, _) = register_user(app.clone(), "member").await;
    create_project(&db, "admin", "projectYobi", "Project overview").await;
    let open_issue_number =
        create_issue(&db, admin_id, "admin", "admin", "projectYobi", "Open issue").await;
    let closed_issue_number = create_issue(
        &db,
        admin_id,
        "admin",
        "admin",
        "projectYobi",
        "Closed issue",
    )
    .await;
    AppRepository::new(db.clone())
        .update_issue_state("admin", "projectYobi", closed_issue_number, "closed")
        .await
        .expect("close issue")
        .expect("closed issue");
    mark_site_admin(&db, admin_id).await;

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/sites/issues?state=open",
        Some(&member_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let default_open = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/sites/issues?pageNum=1&pageSize=30",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(default_open["state"], "OPEN");
    assert_eq!(default_open["pageNum"], 1);
    assert_eq!(default_open["pageSize"], 30);
    assert_eq!(default_open["total"], 1);
    assert_eq!(default_open["tabs"][0]["state"], "OPEN");
    assert_eq!(default_open["tabs"][0]["total"], 1);
    assert_eq!(default_open["tabs"][1]["state"], "CLOSED");
    assert_eq!(default_open["tabs"][1]["total"], 1);
    assert_eq!(
        default_open["items"][0]["issueNumber"],
        open_issue_number.to_string()
    );
    assert_eq!(default_open["items"][0]["title"], "Open issue");
    assert_eq!(default_open["items"][0]["authorLoginId"], "admin");
    assert_eq!(default_open["items"][0]["ownerName"], "admin");
    assert_eq!(default_open["items"][0]["projectName"], "projectYobi");
    assert_eq!(
        default_open["items"][0]["projectPath"],
        "/admin/projectYobi"
    );
    assert_eq!(
        default_open["items"][0]["issuePath"],
        format!("/admin/projectYobi/issue/{open_issue_number}")
    );
    assert_eq!(
        default_open["items"][0]["commentsPath"],
        format!("/admin/projectYobi/issue/{open_issue_number}#comments")
    );

    let closed = response_json(
        rest_get(
            app,
            "/yona/api/v1/sites/issues?state=closed&pageNum=1&pageSize=30",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(closed["state"], "CLOSED");
    assert_eq!(closed["total"], 1);
    assert_eq!(
        closed["items"][0]["issueNumber"],
        closed_issue_number.to_string()
    );
    assert_eq!(closed["items"][0]["title"], "Closed issue");
}
