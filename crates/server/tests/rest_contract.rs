use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, NotSet, QueryFilter,
    Set,
};
use serde_json::json;
use serde_json::Value;
use tower::ServiceExt;
use yona_rust_persistence::{
    email, issue, title_head, user_project_notification, watch, AppRepository,
    CreateIssueCommentInput, CreateIssueInput, CreatePostingCommentInput, CreatePostingInput,
    CreateProjectInput, IssueMutationInput, PostingMutationInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router, create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

fn build_router() -> axum::Router {
    create_router(RuntimeConfig {
        allow_anonymous_access: true,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    })
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).unwrap()
}

async fn build_app_with_repository() -> (axum::Router, AppRepository) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db);
    let app = create_router_with_app_repository(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
    );
    (app, app_repo)
}

async fn build_app_with_repository_and_db() -> (axum::Router, AppRepository, DatabaseConnection) {
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

async fn response_text(response: axum::response::Response) -> String {
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

fn write_legacy_translation_stub_response(translated_text: &str) -> (String, std::path::PathBuf) {
    let response_path = std::env::temp_dir().join(format!(
        "yona-translation-stub-{}-{}.json",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos(),
    ));
    std::fs::write(
        &response_path,
        json!({
            "result": {
                "translatedText": translated_text,
            }
        })
        .to_string(),
    )
    .expect("translation stub response write");
    (format!("file://{}", response_path.display()), response_path)
}

async fn ok_json(response: axum::response::Response) -> Value {
    let status = response.status();
    let text = response_text(response).await;
    assert_eq!(status, StatusCode::OK, "{text}");
    serde_json::from_str(&text).expect("json response")
}

async fn assert_legacy_external_unauthorized(response: axum::response::Response) {
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        response_json(response).await,
        json!({ "message": "unauthorized request" })
    );
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
) -> axum::response::Response {
    rest_test_support::pilot_rest(app, method_name, cookie_header, csrf, payload).await
}

async fn rest(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Option<Value>,
) -> axum::response::Response {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }
    if payload.is_some() {
        builder = builder.header(http::header::CONTENT_TYPE, "application/json");
    }
    app.oneshot(
        builder
            .body(Body::from(
                payload.map_or_else(String::new, |value| value.to_string()),
            ))
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn rest_with_headers(
    app: axum::Router,
    method: Method,
    uri: &str,
    headers: &[(&str, &str)],
    payload: Option<Value>,
) -> axum::response::Response {
    let mut builder = Request::builder().method(method).uri(uri);
    for (name, value) in headers {
        builder = builder.header(*name, *value);
    }
    if payload.is_some() {
        builder = builder.header(http::header::CONTENT_TYPE, "application/json");
    }
    app.oneshot(
        builder
            .body(Body::from(
                payload.map_or_else(String::new, |value| value.to_string()),
            ))
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
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
    assert_eq!(response.status(), StatusCode::OK);
    (csrf, cookie_header)
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str, scope: &str) {
    let response = rpc(
        app,
        "CreateProject",
        Some(cookie),
        Some(csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "overview": "rest parity",
            "projectScope": scope
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

async fn create_organization_rest(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    organization_name: &str,
    description: &str,
) -> Value {
    ok_json(
        rest(
            app,
            Method::POST,
            "/yona/api/v1/organizations",
            Some(cookie),
            Some(csrf),
            Some(json!({
                "organizationName": organization_name,
                "description": description,
            })),
        )
        .await,
    )
    .await
}

async fn create_project_rest(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    owner_name: &str,
    project_name: &str,
    overview: &str,
    project_scope: &str,
) -> Value {
    ok_json(
        rest(
            app,
            Method::POST,
            &format!("/yona/api/v1/owners/{owner_name}/projects"),
            Some(cookie),
            Some(csrf),
            Some(json!({
                "overview": overview,
                "projectName": project_name,
                "projectScope": project_scope,
            })),
        )
        .await,
    )
    .await
}

async fn create_issue(app: axum::Router, cookie: &str, csrf: &str, title: &str) -> Value {
    ok_json(
        rpc(
            app,
            "CreateIssue",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": title,
                "bodyMarkdown": title
            }),
        )
        .await,
    )
    .await
}

async fn create_issue_comment(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    issue_number: i64,
    contents: &str,
) -> Value {
    ok_json(
        rpc(
            app,
            "CreateIssueComment",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": issue_number.to_string(),
                "contentsMarkdown": contents
            }),
        )
        .await,
    )
    .await
}

#[tokio::test]
async fn rest_issue_create_update_persists_legacy_due_date() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;

    let created = ok_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Due issue",
                "bodyMarkdown": "Due issue body",
                "dueDate": "2026-08-01"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(created["dueDateLabel"], "2026-08-01");

    let updated = ok_json(
        rpc(
            app.clone(),
            "UpdateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "title": "Due issue edited",
                "bodyMarkdown": "Due issue body edited",
                "dueDate": "2026-08-02"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(updated["dueDateLabel"], "2026-08-02");

    let cleared = ok_json(
        rpc(
            app.clone(),
            "UpdateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "title": "Due issue cleared",
                "bodyMarkdown": "Due issue body cleared",
                "dueDate": ""
            }),
        )
        .await,
    )
    .await;
    assert_eq!(cleared["dueDateLabel"], "");

    let invalid = rpc(
        app,
        "UpdateIssue",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "title": "Invalid due issue",
            "bodyMarkdown": "Invalid due issue body",
            "dueDate": "08/01/2026"
        }),
    )
    .await;
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn rest_project_issue_list_exposes_legacy_row_payload_fields() {
    let (app, _, db) = build_app_with_repository_and_db().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;

    ok_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Weighted due issue",
                "bodyMarkdown": "Weighted due issue body",
                "assigneeLoginId": "owner",
                "dueDate": "2026-08-01"
            }),
        )
        .await,
    )
    .await;

    let issue = issue::Entity::find()
        .filter(issue::Column::Number.eq(Some(1)))
        .one(&db)
        .await
        .expect("read issue")
        .expect("created issue");
    let mut active: issue::ActiveModel = issue.into();
    active.weight = Set(Some(3));
    active.update(&db).await.expect("update issue weight");

    let parent_options = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/parent-options",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    let parent_issue_id = parent_options["items"][0]["id"].as_i64().unwrap();
    ok_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Child row issue",
                "bodyMarkdown": "Child row issue body",
                "parentIssueId": parent_issue_id
            }),
        )
        .await,
    )
    .await;

    let list = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues?state=open",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;

    let items = list["items"].as_array().expect("issue list items");
    let item = items
        .iter()
        .find(|item| item["title"] == "Weighted due issue")
        .expect("parent row");
    assert!(item["id"].as_i64().unwrap_or_default() > 0);
    assert_eq!(item["assigneeLabel"], "owner");
    assert_eq!(item["assigneeLoginId"], "owner");
    assert_eq!(item["authorLoginId"], "owner");
    assert!(item["authorAvatarUrl"]
        .as_str()
        .unwrap_or_default()
        .contains("gravatar"));
    assert!(item["assigneeAvatarUrl"]
        .as_str()
        .unwrap_or_default()
        .contains("gravatar"));
    assert_eq!(item["dueDateLabel"], "2026-08-01");
    assert_eq!(item["dueDateOverdue"], false);
    assert_eq!(item["weight"], 3);
    assert_eq!(item["childOpenCount"], 1);
    assert_eq!(item["childClosedCount"], 0);
    assert_eq!(item["childIssues"][0]["issueNumber"], 2);
    assert_eq!(item["childIssues"][0]["title"], "Child row issue");

    let child_item = items
        .iter()
        .find(|item| item["title"] == "Child row issue")
        .expect("child row");
    assert_eq!(child_item["parentIssueNumber"], 1);
    assert_eq!(child_item["parentIssueTitle"], "Weighted due issue");
}

#[tokio::test]
async fn rest_issue_create_update_persists_legacy_parent_issue_id() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;

    let parent = ok_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Parent issue",
                "bodyMarkdown": "Parent issue body"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(parent["issueNumber"], "1");

    let parent_options = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/parent-options",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    let parent_issue_id = parent_options["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["issueNumber"] == 1)
        .unwrap()["id"]
        .as_i64()
        .unwrap();

    let child = ok_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Child issue",
                "bodyMarkdown": "Child issue body",
                "parentIssueId": parent_issue_id
            }),
        )
        .await,
    )
    .await;
    assert_eq!(child["parentIssueId"], parent_issue_id);
    assert_eq!(child["parentIssueNumber"], 1);
    assert_eq!(child["parentIssueTitle"], "Parent issue");

    let parent_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert!(parent_detail["authorId"].as_i64().unwrap_or_default() > 0);
    assert_eq!(parent_detail["childOpenCount"], 1);
    assert_eq!(parent_detail["childClosedCount"], 0);
    assert_eq!(parent_detail["childIssues"][0]["issueNumber"], 2);
    assert_eq!(parent_detail["childIssues"][0]["title"], "Child issue");
    assert_eq!(parent_detail["childIssues"][0]["state"], "open");

    let selected_options = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/parent-options?currentIssueNumber=2",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert!(selected_options["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["id"] == parent_issue_id && item["selected"] == true));

    let cleared = ok_json(
        rpc(
            app.clone(),
            "UpdateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "2",
                "title": "Child issue cleared",
                "bodyMarkdown": "Child issue body cleared",
                "parentIssueId": ""
            }),
        )
        .await,
    )
    .await;
    assert_eq!(cleared["parentIssueId"], Value::Null);
    assert_eq!(cleared["parentIssueNumber"], Value::Null);
    assert_eq!(cleared["parentIssueTitle"], "");
}

#[tokio::test]
async fn rest_issue_draft_save_and_publish_follow_legacy_visibility_and_numbering() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (_other_csrf, other_cookie) = register_user(app.clone(), "other").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;

    let draft = ok_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Draft issue",
                "bodyMarkdown": "Draft issue body",
                "isDraft": true
            }),
        )
        .await,
    )
    .await;
    assert_eq!(draft["isDraft"], true);
    assert_eq!(draft["state"], "draft");
    assert_eq!(draft["issueNumber"], "1");

    let forbidden = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/projects/owner/projectYobi/issues/1",
        Some(&other_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let list = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(list["items"].as_array().unwrap().len(), 0);
    assert_eq!(list["draftItems"].as_array().unwrap().len(), 1);
    assert_eq!(list["draftItems"][0]["state"], "draft");
    assert_eq!(list["draftItems"][0]["title"], "Draft issue");

    let published = ok_json(
        rpc(
            app.clone(),
            "UpdateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "title": "Published issue",
                "bodyMarkdown": "Published issue body",
                "isPublish": true
            }),
        )
        .await,
    )
    .await;
    assert_eq!(published["isDraft"], false);
    assert_eq!(published["state"], "open");
    assert_eq!(published["issueNumber"], "2");

    let published_read = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/2",
            Some(&other_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(published_read["title"], "Published issue");
}

#[tokio::test]
async fn rest_session_route_coexists_with_bootstrap_and_rpc() {
    let app = build_router();

    let rest_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(rest_response.status(), StatusCode::OK);
    assert!(rest_response.headers().get("x-csrf-token").is_some());
    assert!(rest_response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .any(|cookie| cookie.to_str().unwrap().starts_with("yona_session=")));
    let rest_json = response_json(rest_response).await;
    assert_eq!(
        rest_json.get("isAnonymous").and_then(Value::as_bool),
        Some(true)
    );
    assert!(rest_json
        .get("defaultLandingPath")
        .and_then(Value::as_str)
        .is_some());

    let bootstrap_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/auth/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(bootstrap_response.status(), StatusCode::OK);
    assert!(bootstrap_response.headers().get("x-csrf-token").is_some());

    let rpc_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadCurrentSession")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(rpc_response.status(), StatusCode::OK);
}

#[tokio::test]
async fn unknown_rest_route_returns_shared_json_error_envelope() {
    let response = build_router()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/unknown")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let body = response_json(response).await;
    assert_eq!(body["error"]["code"], "not_found");
    assert_eq!(body["error"]["message"], "REST endpoint not found.");
    assert_eq!(body["error"]["status"], 404);
}

#[tokio::test]
async fn legacy_external_hello_matches_global_api_contract() {
    let response = build_router()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/-_-api/v1/hello")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response_json(response).await;
    assert_eq!(body["message"], "I'm alive!");
    assert_eq!(body["ok"], true);
}

#[tokio::test]
async fn rest_organization_routes_cover_directory_views_and_membership_mutations() {
    let (app, repository) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie) = register_user(app.clone(), "admin").await;
    let (_member_csrf, _member_cookie) = register_user(app.clone(), "member").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    let (_outsider_csrf, outsider_cookie) = register_user(app.clone(), "outsider").await;
    repository
        .toggle_site_user_guest_mode("guest")
        .await
        .expect("mark organization enrollment actor as guest");

    let created = create_organization_rest(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "web labs",
    )
    .await;
    assert_eq!(created["organizationName"], "weblabs");

    let listed = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/organizations",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(listed["items"].as_array().unwrap().len(), 1);
    assert_eq!(listed["items"][0]["organizationName"], "weblabs");

    let detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/organizations/weblabs",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(detail["organizationName"], "weblabs");
    assert_eq!(detail["viewerCanUpdate"].as_bool().unwrap_or(false), false);

    let updated = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/organizations/weblabs",
            Some(&admin_cookie),
            Some(&admin_csrf),
            Some(json!({
                "organizationName": "weblabs",
                "description": "updated labs",
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["description"], "updated labs");

    let container = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/organizations/weblabs/container",
            Some(&guest_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(container["organizationName"], "weblabs");
    assert_eq!(container["viewerCanEnroll"], true);

    let forbidden_admin = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/organizations/weblabs/admin",
        Some(&outsider_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(forbidden_admin.status(), StatusCode::FORBIDDEN);

    let admin_view = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/organizations/weblabs/admin",
            Some(&admin_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(admin_view["organizationName"], "weblabs");
    assert_eq!(admin_view["viewerCanUpdate"], true);

    let settings = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/organizations/weblabs/settings",
            Some(&admin_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(settings["organizationName"], "weblabs");

    let members = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/organizations/weblabs/members",
            Some(&admin_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(members["members"].as_array().unwrap().len(), 1);

    let added_member = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/organizations/weblabs/members",
            Some(&admin_cookie),
            Some(&admin_csrf),
            Some(json!({
                "loginId": "member",
            })),
        )
        .await,
    )
    .await;
    assert!(added_member["members"]
        .as_array()
        .unwrap()
        .iter()
        .any(|member| member["loginId"] == "member"));

    let enroll = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/organizations/weblabs/enroll",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(enroll["enrollmentRequested"], true);

    let cancelled = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/organizations/weblabs/enroll",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        cancelled["enrollmentRequested"].as_bool().unwrap_or(false),
        false
    );

    let reenrolled = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/organizations/weblabs/enroll",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(reenrolled["enrollmentRequested"], true);

    let guest_id = repository
        .find_user_by_login_id("guest")
        .await
        .expect("lookup guest")
        .expect("guest exists")
        .id;
    let member_id = repository
        .find_user_by_login_id("member")
        .await
        .expect("lookup member")
        .expect("member exists")
        .id;

    let accepted = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!("/yona/api/v1/organizations/weblabs/enrollments/{guest_id}/accept"),
            Some(&admin_cookie),
            Some(&admin_csrf),
            None,
        )
        .await,
    )
    .await;
    assert!(accepted["members"]
        .as_array()
        .unwrap()
        .iter()
        .any(|member| member["loginId"] == "guest"));

    let promoted = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!("/yona/api/v1/organizations/weblabs/members/{member_id}"),
            Some(&admin_cookie),
            Some(&admin_csrf),
            Some(json!({
                "role": "org_admin",
            })),
        )
        .await,
    )
    .await;
    assert!(promoted["members"]
        .as_array()
        .unwrap()
        .iter()
        .any(|member| member["loginId"] == "member" && member["role"] == "org_admin"));

    let deleted_member = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/organizations/weblabs/members/{member_id}"),
            Some(&admin_cookie),
            Some(&admin_csrf),
            None,
        )
        .await,
    )
    .await;
    assert!(!deleted_member["members"]
        .as_array()
        .unwrap()
        .iter()
        .any(|member| member["loginId"] == "member"));

    let guest_leave = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/organizations/weblabs/leave",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(guest_leave["ok"], true);
    assert_eq!(guest_leave["redirectPath"], "/organizations/weblabs");

    let deleted = ok_json(
        rest(
            app,
            Method::DELETE,
            "/yona/api/v1/organizations/weblabs",
            Some(&admin_cookie),
            Some(&admin_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted["ok"], true);
    assert_eq!(deleted["redirectPath"], "/");
}

#[tokio::test]
async fn rest_project_routes_cover_directory_views_and_mutations() {
    let (app, repository, db) = build_app_with_repository_and_db().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    let (visitor_csrf, visitor_cookie) = register_user(app.clone(), "visitor").await;
    let (_statee_csrf, _statee_cookie) = register_user(app.clone(), "statee").await;

    let legacy_users_empty = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/users?query=",
            &[
                ("Accept", "application/json"),
                ("Referer", "http://localhost/yona/owner/projectYobi/members"),
            ],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_users_empty, json!([]));
    let legacy_users = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/users?query=vis",
            &[
                ("Accept", "application/json"),
                ("Referer", "http://localhost/yona/owner/projectYobi/members"),
            ],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_users
            .as_array()
            .expect("legacy users search results")
            .len(),
        1
    );
    assert_eq!(legacy_users[0]["loginId"], "visitor");
    assert!(legacy_users[0]["info"]
        .as_str()
        .expect("legacy user info html")
        .contains("mention_username"));
    let legacy_users_html = rest_with_headers(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/users?query=vis",
        &[
            ("Accept", "text/html"),
            ("Referer", "http://localhost/yona/owner/projectYobi/members"),
        ],
        None,
    )
    .await;
    assert_eq!(legacy_users_html.status(), StatusCode::NOT_ACCEPTABLE);
    let legacy_users_without_members_referer = rest_with_headers(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/users?query=vis",
        &[("Accept", "application/json")],
        None,
    )
    .await;
    assert_eq!(
        legacy_users_without_members_referer.status(),
        StatusCode::NOT_ACCEPTABLE
    );

    let created = create_project_rest(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "rest parity",
        "public",
    )
    .await;
    assert_eq!(created["projectName"], "projectYobi");
    let project_id = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("created project")
        .id;
    let project_id_text = project_id.to_string();
    let owner_id = repository
        .find_user_by_identifier("owner")
        .await
        .unwrap()
        .expect("owner user")
        .id;
    let visitor_id = repository
        .find_user_by_identifier("visitor")
        .await
        .unwrap()
        .expect("visitor user")
        .id;
    let legacy_board_post_file = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "legacy-board-post.png",
            "image/png",
            11,
            "legacy-board-post-hash",
        )
        .await
        .expect("legacy board post temp upload");
    let legacy_board_comment_file = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "legacy-board-comment.png",
            "image/png",
            13,
            "legacy-board-comment-hash",
        )
        .await
        .expect("legacy board comment temp upload");
    let legacy_issue_comment_file = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "legacy-issue-comment.png",
            "image/png",
            17,
            "legacy-issue-comment-hash",
        )
        .await
        .expect("legacy issue comment temp upload");
    let visitor_owned_file = repository
        .create_user_attachment_upload(
            visitor_id,
            "visitor",
            "visitor-owned.png",
            "image/png",
            17,
            "visitor-owned-hash",
        )
        .await
        .expect("visitor temp upload");
    repository
        .toggle_site_user_guest_mode("guest")
        .await
        .expect("mark project enrollment actor as guest");
    repository
        .toggle_site_admin_role("owner")
        .await
        .expect("mark legacy admin users actor as site admin");

    let legacy_admin_users = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/admin/users",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    let legacy_admin_users = legacy_admin_users
        .as_array()
        .expect("legacy admin users response");
    let legacy_owner = legacy_admin_users
        .iter()
        .find(|user| user["login_id"] == "owner")
        .expect("legacy owner user");
    assert_eq!(legacy_owner["name"], "owner");
    assert_eq!(legacy_owner["email"], "owner@example.com");
    assert_eq!(legacy_owner["state"], "ACTIVE");
    assert_eq!(legacy_owner["is_guest"], false);
    let legacy_guest = legacy_admin_users
        .iter()
        .find(|user| user["login_id"] == "guest")
        .expect("legacy guest user");
    assert_eq!(legacy_guest["is_guest"], true);
    let legacy_admin_users_by_visitor = rest(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/admin/users",
        Some(&visitor_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(
        legacy_admin_users_by_visitor.status(),
        StatusCode::FORBIDDEN
    );
    let legacy_state_update = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/-_-api/v1/admin/users/statee",
            Some(&owner_cookie),
            None,
            Some(json!({ "state": "locked" })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_state_update["login_id"], "statee");
    assert_eq!(legacy_state_update["state"], "LOCKED");
    let legacy_nested_guest_state_update = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/-_-api/v1/admin/users/statee",
            Some(&owner_cookie),
            None,
            Some(json!({ "user": { "state": "guest" } })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_nested_guest_state_update["login_id"], "statee");
    assert_eq!(legacy_nested_guest_state_update["state"], "GUEST");
    let legacy_state_update_site_admin = rest(
        app.clone(),
        Method::PATCH,
        "/yona/-_-api/v1/admin/users/statee",
        Some(&owner_cookie),
        None,
        Some(json!({ "state": "SITE_ADMIN" })),
    )
    .await;
    assert_eq!(
        legacy_state_update_site_admin.status(),
        StatusCode::FORBIDDEN
    );
    let legacy_state_update_by_visitor = rest(
        app.clone(),
        Method::PATCH,
        "/yona/-_-api/v1/admin/users/statee",
        Some(&visitor_cookie),
        None,
        Some(json!({ "state": "active" })),
    )
    .await;
    assert_eq!(
        legacy_state_update_by_visitor.status(),
        StatusCode::FORBIDDEN
    );

    let listed = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(listed["items"].as_array().unwrap().len(), 1);
    assert_eq!(listed["items"][0]["projectName"], "projectYobi");

    let detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/container",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(detail["projectName"], "projectYobi");

    let container = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/container",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(container["projectName"], "projectYobi");

    let forbidden_settings = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/owners/owner/projects/projectYobi/settings",
        Some(&guest_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(forbidden_settings.status(), StatusCode::FORBIDDEN);

    let guest_watch_forbidden = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/watch",
        Some(&guest_cookie),
        Some(&guest_csrf),
        None,
    )
    .await;
    assert_eq!(guest_watch_forbidden.status(), StatusCode::FORBIDDEN);

    let guest_direct_unwatched = rest(
        app.clone(),
        Method::POST,
        "/yona/owner/projectYobi/unwatch",
        Some(&guest_cookie),
        Some(&guest_csrf),
        None,
    )
    .await;
    assert_eq!(guest_direct_unwatched.status(), StatusCode::FORBIDDEN);

    let settings = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/settings",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(settings["projectName"], "projectYobi");

    let members = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert!(members["members"].is_array());

    let updated = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/owners/owner/projects/projectYobi",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "overview": "rest parity updated",
                "projectName": "projectYobi",
                "projectScope": "public",
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["overview"], "rest parity updated");
    assert_eq!(updated["projectScope"], "public");

    let overview = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/owners/owner/projects/projectYobi/overview",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "overview": "overview only",
            })),
        )
        .await,
    )
    .await;
    assert_eq!(overview["overview"], "overview only");

    let enrolled = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/enroll",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(enrolled["ok"], true);

    let canceled = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/owners/owner/projects/projectYobi/enroll",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(canceled["ok"], true);

    let favorited = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/favorite",
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(favorited["favorited"], true);

    let legacy_favorites = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/favoriteProjects",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_favorites["projectIds"], json!([project_id]));
    assert_eq!(legacy_favorites["projects"][0]["projectId"], project_id);
    assert_eq!(
        legacy_favorites["projects"][0]["projectName"],
        "projectYobi"
    );
    assert_eq!(legacy_favorites["projects"][0]["owner"], "owner");

    let legacy_unfavorited = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!("/yona/-_-api/v1/favoriteProjects/{project_id}"),
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_unfavorited["projectId"], project_id.to_string());
    assert_eq!(legacy_unfavorited["favored"], false);
    let legacy_refavorited = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!("/yona/-_-api/v1/favoriteProjects/{project_id}"),
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_refavorited["projectId"], project_id.to_string());
    assert_eq!(legacy_refavorited["favored"], true);

    let invalid_legacy_token = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/users/token",
        None,
        None,
        Some(json!({
            "id": "visitor",
            "password": "wrong-password"
        })),
    )
    .await;
    assert_eq!(invalid_legacy_token.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        response_json(invalid_legacy_token).await,
        json!({ "message": "No user by id and password" })
    );

    let legacy_token_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/users/token",
        None,
        None,
        Some(json!({
            "id": "visitor",
            "password": "doorpass1"
        })),
    )
    .await;
    assert_eq!(legacy_token_response.status(), StatusCode::OK);
    assert!(
        legacy_token_response
            .headers()
            .contains_key(http::header::SET_COOKIE),
        "legacy token API should attach an authenticated session cookie"
    );
    let legacy_api_token = response_json(legacy_token_response).await["access_token"]
        .as_str()
        .expect("legacy access token")
        .to_string();
    assert!(!legacy_api_token.is_empty());
    let nested_legacy_token_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/users/token",
        None,
        None,
        Some(json!({
            "credentials": {
                "id": "visitor",
                "secret": {
                    "password": "doorpass1"
                }
            }
        })),
    )
    .await;
    assert_eq!(nested_legacy_token_response.status(), StatusCode::OK);
    let nested_legacy_api_token = response_json(nested_legacy_token_response).await["access_token"]
        .as_str()
        .expect("nested legacy access token")
        .to_string();
    assert!(!nested_legacy_api_token.is_empty());
    let legacy_token_favorites = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/favoriteProjects",
            &[("Yona-Token", &nested_legacy_api_token)],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_token_favorites["projectIds"], json!([project_id]));

    let guest_api_token = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/workspace/api-token/reset",
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            None,
        )
        .await,
    )
    .await["apiToken"]
        .as_str()
        .expect("guest api token")
        .to_string();
    let token_favorites = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/favoriteProjects",
            &[("Yona-Token", &guest_api_token)],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(token_favorites["projectIds"], json!([project_id]));
    let authorization_header = format!("token {guest_api_token}");
    let token_unfavorited = ok_json(
        rest_with_headers(
            app.clone(),
            Method::POST,
            &format!("/yona/-_-api/v1/favoriteProjects/{project_id}"),
            &[("Authorization", &authorization_header)],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(token_unfavorited["projectId"], project_id.to_string());
    assert_eq!(token_unfavorited["favored"], false);
    let token_refavorited = ok_json(
        rest_with_headers(
            app.clone(),
            Method::POST,
            &format!("/yona/-_-api/v1/favoriteProjects/{project_id}"),
            &[("Yona-Token", &guest_api_token)],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(token_refavorited["projectId"], project_id.to_string());
    assert_eq!(token_refavorited["favored"], true);

    let anonymous_legacy_favorites = rest(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/favoriteProjects",
        None,
        None,
        None,
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_favorites).await;

    let anonymous_legacy_favorite_toggle = rest(
        app.clone(),
        Method::POST,
        &format!("/yona/-_-api/v1/favoriteProjects/{project_id}"),
        None,
        None,
        None,
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_favorite_toggle).await;

    let issue_created = ok_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Favorite issue",
                "bodyMarkdown": "Favorite issue body"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(issue_created["issueNumber"], "1");
    let issue_id = issue::Entity::find()
        .filter(issue::Column::Title.eq(Some("Favorite issue".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("created favorite issue")
        .id;
    let legacy_comment_receivers = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/commentNotiReceivers",
            Some(&owner_cookie),
            None,
            Some(json!({
                "draft": {
                    "comment": "preview receiver @visitor",
                    "parentCommentId": ""
                }
            })),
        )
        .await,
    )
    .await;
    let legacy_comment_receivers = legacy_comment_receivers["receivers"]
        .as_array()
        .expect("legacy comment receivers");
    assert!(legacy_comment_receivers
        .iter()
        .any(|receiver| receiver["loginId"] == "visitor"
            && receiver["name"] == "visitor"
            && receiver["pureNameOnly"] == "visitor"
            && receiver["type"] == "user"
            && receiver["avatarUrl"]
                .as_str()
                .expect("receiver avatar")
                .contains("gravatar.com")));
    assert!(!legacy_comment_receivers
        .iter()
        .any(|receiver| receiver["loginId"] == "owner"));
    let anonymous_legacy_comment_receivers = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/commentNotiReceivers",
        None,
        None,
        Some(json!({
            "comment": "anonymous",
            "parentCommentId": ""
        })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_comment_receivers).await;
    let legacy_issue_label_fixture = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryName": "IssueType",
                "categoryIsExclusive": false,
                "labelColor": "#f44336",
                "labelName": "IssueLabel"
            })),
        )
        .await,
    )
    .await;
    let legacy_issue_label_id = legacy_issue_label_fixture["label"]["id"]
        .as_str()
        .expect("legacy issue label id")
        .to_string();
    let legacy_issue_label_update = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issuelabel/1",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!([legacy_issue_label_id])),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_label_update["id"], "owner");
    assert_eq!(legacy_issue_label_update["labels"], 1);
    let legacy_issue_detail_with_label = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_issue_detail_with_label["labels"][0]["name"],
        "IssueLabel"
    );
    let anonymous_legacy_issue_label_update = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issuelabel/1",
        None,
        None,
        Some(json!([legacy_issue_label_fixture["label"]["id"].clone()])),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_label_update).await;
    let legacy_issue_weight_up = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/upvoteWeight",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_weight_up["weight"], 1);
    let legacy_issue_weight_down = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/downvoteWeight",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_weight_down["weight"], 0);
    let anonymous_legacy_issue_weight = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/upvoteWeight",
        None,
        None,
        None,
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_weight).await;
    let legacy_issue_content = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/content",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "content": "Favorite issue body updated",
                "original": "Favorite issue body"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_content["number"], 1);
    assert_eq!(legacy_issue_content["title"], "Favorite issue");
    assert_eq!(legacy_issue_content["type"], "ISSUE_POST");
    assert_eq!(legacy_issue_content["author"]["loginId"], "owner");
    assert_eq!(legacy_issue_content["body"], "Favorite issue body updated");
    assert_eq!(legacy_issue_content["owner"], "owner");
    assert_eq!(legacy_issue_content["projectName"], "projectYobi");
    assert_eq!(legacy_issue_content["state"], "open");

    let nested_legacy_issue_content = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/content",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payload": {
                    "body": {
                        "content": "Favorite issue body nested update"
                    },
                    "base": {
                        "original": "Favorite issue body updated"
                    }
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        nested_legacy_issue_content["body"],
        "Favorite issue body nested update"
    );

    let legacy_issue_content_conflict = rest(
        app.clone(),
        Method::PATCH,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/content",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "content": "stale issue update",
            "original": "Favorite issue body"
        })),
    )
    .await;
    assert_eq!(legacy_issue_content_conflict.status(), StatusCode::CONFLICT);
    assert_eq!(
        response_json(legacy_issue_content_conflict).await,
        json!({
            "message": "Already modified by someone.",
            "storedContent": "Favorite issue body nested update"
        })
    );
    let anonymous_legacy_issue_content = rest(
        app.clone(),
        Method::PATCH,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/content",
        None,
        None,
        Some(json!({
            "content": "anonymous",
            "original": "Favorite issue body nested update"
        })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_content).await;
    let legacy_issue_closed = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "transition": {
                    "state": "closed"
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_closed["result"]["number"], 1);
    assert_eq!(legacy_issue_closed["result"]["title"], "Favorite issue");
    assert_eq!(legacy_issue_closed["result"]["state"], "closed");
    assert_eq!(
        legacy_issue_closed["result"]["body"],
        "Favorite issue body nested update"
    );
    let legacy_issue_opened = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({})),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_opened["result"]["state"], "open");
    let anonymous_legacy_issue_state = rest(
        app.clone(),
        Method::PATCH,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1",
        None,
        None,
        Some(json!({ "state": "closed" })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_state).await;
    let legacy_issue_comment_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "author": {
                "email": "visitor@example.com"
            },
            "body": "legacy issue comment body"
        })),
    )
    .await;
    assert_eq!(legacy_issue_comment_response.status(), StatusCode::CREATED);
    let legacy_issue_comment = response_json(legacy_issue_comment_response).await;
    assert_eq!(legacy_issue_comment["status"], 201);
    assert!(legacy_issue_comment["location"]
        .as_str()
        .is_some_and(|location| location.starts_with("/yona/owner/projectYobi/issue/1#comment-")));
    let legacy_issue_comment_id = legacy_issue_comment["location"]
        .as_str()
        .expect("legacy issue comment location")
        .rsplit_once("#comment-")
        .expect("legacy issue comment anchor")
        .1
        .parse::<i64>()
        .expect("legacy issue comment id");
    let legacy_issue_imported_comment_author_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "author": {
                "email": "legacy-issue-comment-author@example.com",
                "loginId": "legacy-issue-comment-author",
                "name": "Legacy Issue Comment Author"
            },
            "body": "legacy issue imported comment author body"
        })),
    )
    .await;
    assert_eq!(
        legacy_issue_imported_comment_author_response.status(),
        StatusCode::CREATED
    );
    let legacy_issue_imported_comment_author = repository
        .find_user_by_identifier("legacy-issue-comment-author@example.com")
        .await
        .unwrap()
        .expect("legacy issue imported comment author");
    assert_eq!(
        legacy_issue_imported_comment_author.login_id,
        "legacy-issue-comment-author"
    );
    let nested_legacy_issue_comment_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "payload": {
                "actor": {
                    "author": {
                        "email": "visitor@example.com"
                    }
                },
                "message": {
                    "body": "legacy issue nested comment body"
                }
            }
        })),
    )
    .await;
    assert_eq!(
        nested_legacy_issue_comment_response.status(),
        StatusCode::CREATED
    );
    let nested_legacy_issue_attachment_comment_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "payload": {
                "message": {
                    "body": "legacy issue nested attachment comment body"
                },
                "files": {
                    "temporaryUploadFiles": [
                        legacy_issue_comment_file.id
                    ]
                }
            }
        })),
    )
    .await;
    assert_eq!(
        nested_legacy_issue_attachment_comment_response.status(),
        StatusCode::CREATED
    );
    let nested_legacy_issue_attachment_comment =
        response_json(nested_legacy_issue_attachment_comment_response).await;
    let nested_legacy_issue_attachment_comment_id = nested_legacy_issue_attachment_comment
        ["location"]
        .as_str()
        .expect("nested legacy issue attachment comment location")
        .rsplit_once("#comment-")
        .expect("nested legacy issue attachment comment anchor")
        .1
        .parse::<i64>()
        .expect("nested legacy issue attachment comment id");
    let legacy_issue_comment_file_after = repository
        .read_attachment_by_id(legacy_issue_comment_file.id)
        .await
        .unwrap()
        .expect("legacy issue comment attachment");
    assert_eq!(
        legacy_issue_comment_file_after.container_type,
        "ISSUE_COMMENT"
    );
    assert_eq!(
        legacy_issue_comment_file_after.container_id,
        nested_legacy_issue_attachment_comment_id
    );
    let legacy_issue_token_comment_response = rest_with_headers(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments",
        &[("Authorization", &authorization_header)],
        Some(json!({
            "comment": "legacy issue token comment"
        })),
    )
    .await;
    assert_eq!(
        legacy_issue_token_comment_response.status(),
        StatusCode::CREATED
    );
    let legacy_issue_token_comment = response_json(legacy_issue_token_comment_response).await;
    assert_eq!(legacy_issue_token_comment["result"]["number"], 1);
    assert_eq!(
        legacy_issue_token_comment["result"]["title"],
        "Favorite issue"
    );
    let nested_legacy_issue_token_comment_response = rest_with_headers(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments",
        &[("Authorization", &authorization_header)],
        Some(json!({
            "payload": {
                "message": {
                    "comment": "legacy issue token nested comment"
                }
            }
        })),
    )
    .await;
    assert_eq!(
        nested_legacy_issue_token_comment_response.status(),
        StatusCode::CREATED
    );
    let legacy_issue_comment_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    let legacy_issue_comments = legacy_issue_comment_detail["comments"]
        .as_array()
        .expect("legacy issue comments");
    assert!(legacy_issue_comments.iter().any(|comment| {
        comment["contentsMarkdown"] == "legacy issue comment body"
            && comment["authorLoginId"] == "visitor"
    }));
    assert!(legacy_issue_comments.iter().any(|comment| {
        comment["contentsMarkdown"] == "legacy issue token comment"
            && comment["authorLoginId"] == "visitor"
    }));
    assert!(legacy_issue_comments.iter().any(|comment| {
        comment["contentsMarkdown"] == "legacy issue imported comment author body"
            && comment["authorLoginId"] == "legacy-issue-comment-author"
    }));
    assert!(legacy_issue_comments.iter().any(|comment| {
        comment["contentsMarkdown"] == "legacy issue nested comment body"
            && comment["authorLoginId"] == "visitor"
    }));
    assert!(legacy_issue_comments.iter().any(|comment| {
        comment["contentsMarkdown"] == "legacy issue nested attachment comment body"
            && comment["authorLoginId"] == "owner"
    }));
    assert!(legacy_issue_comments.iter().any(|comment| {
        comment["contentsMarkdown"] == "legacy issue token nested comment"
            && comment["authorLoginId"] == "visitor"
    }));
    let legacy_issue_comment_updated = ok_json(
        rest(
            app.clone(),
            Method::PUT,
            &format!(
                "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments/{legacy_issue_comment_id}"
            ),
            Some(&visitor_cookie),
            None,
            Some(json!({
                "content": "legacy issue comment body updated",
                "original": "legacy issue comment body"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_issue_comment_updated["result"]["contents"],
        "legacy issue comment body updated"
    );
    assert_eq!(
        legacy_issue_comment_updated["result"]["author"]["loginId"],
        "visitor"
    );
    let nested_legacy_issue_comment_updated = ok_json(
        rest(
            app.clone(),
            Method::PUT,
            &format!(
                "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments/{legacy_issue_comment_id}"
            ),
            Some(&visitor_cookie),
            None,
            Some(json!({
                "payload": {
                    "body": {
                        "content": "legacy issue comment body nested update"
                    },
                    "base": {
                        "original": "legacy issue comment body updated"
                    }
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        nested_legacy_issue_comment_updated["result"]["contents"],
        "legacy issue comment body nested update"
    );
    let legacy_issue_comment_conflict = rest(
        app.clone(),
        Method::PUT,
        &format!(
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments/{legacy_issue_comment_id}"
        ),
        Some(&visitor_cookie),
        None,
        Some(json!({
            "content": "stale issue comment update",
            "original": "legacy issue comment body"
        })),
    )
    .await;
    assert_eq!(legacy_issue_comment_conflict.status(), StatusCode::CONFLICT);
    assert_eq!(
        response_json(legacy_issue_comment_conflict).await,
        json!({
            "message": "Already modified by someone.",
            "storedContent": "legacy issue comment body nested update"
        })
    );
    let anonymous_legacy_issue_comment = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments",
        None,
        None,
        Some(json!({ "body": "anonymous issue comment" })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_comment).await;
    let anonymous_legacy_issue_comment_update = rest(
        app.clone(),
        Method::PUT,
        &format!(
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments/{legacy_issue_comment_id}"
        ),
        None,
        None,
        Some(json!({
            "content": "anonymous update",
            "original": "legacy issue comment body updated"
        })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_comment_update).await;
    let legacy_issue_assignee = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/assignees",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "request": {
                    "assignees": ["visitor"]
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_assignee["assignee"]["loginId"], "visitor");
    assert_eq!(legacy_issue_assignee["assignee"]["name"], "visitor");
    assert_eq!(legacy_issue_assignee["issue"], "/owner/projectYobi/issue/1");
    let legacy_issue_assignee_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_assignee_detail["assigneeLoginId"], "visitor");
    let legacy_issue_updated = ok_json(
        rest_with_headers(
            app.clone(),
            Method::PUT,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1",
            &[("Authorization", &authorization_header)],
            Some(json!({
                "meta": {
                    "title": "Favorite issue via nested legacy put"
                },
                "details": {
                    "body": "Favorite issue body via nested legacy put"
                },
                "status": {
                    "state": "CLOSED"
                },
                "users": {
                    "assignees": [
                        {
                            "account": {
                                "loginId": "visitor"
                            }
                        }
                    ]
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_updated["result"]["number"], 1);
    assert_eq!(
        legacy_issue_updated["result"]["title"],
        "Favorite issue via nested legacy put"
    );
    assert_eq!(
        legacy_issue_updated["result"]["body"],
        "Favorite issue body via nested legacy put"
    );
    assert_eq!(legacy_issue_updated["result"]["state"], "closed");
    assert_eq!(
        legacy_issue_updated["result"]["assignees"][0]["loginId"],
        "visitor"
    );
    let legacy_issue_put_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_issue_put_detail["title"],
        "Favorite issue via nested legacy put"
    );
    assert_eq!(
        legacy_issue_put_detail["bodyMarkdown"],
        "Favorite issue body via nested legacy put"
    );
    assert_eq!(legacy_issue_put_detail["state"], "closed");
    let anonymous_legacy_issue_update = rest(
        app.clone(),
        Method::PUT,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1",
        None,
        None,
        Some(json!({
            "title": "anonymous legacy put",
            "body": "anonymous",
            "state": "OPEN",
            "assignees": []
        })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_update).await;
    let legacy_issue_read = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1",
            &[("Authorization", &authorization_header)],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_issue_read["result"]["title"],
        "Favorite issue via nested legacy put"
    );
    assert_eq!(legacy_issue_read["result"]["state"], "closed");
    assert!(legacy_issue_read["result"]["comments"]
        .as_array()
        .expect("legacy issue read comments")
        .iter()
        .any(
            |comment| comment["body"] == "legacy issue comment body nested update"
                && comment["author"]["loginId"] == "visitor"
        ));
    assert!(legacy_issue_read["result"]["events"]
        .as_array()
        .expect("legacy issue read events")
        .iter()
        .any(|event| event["eventType"] == "ISSUE_STATE_CHANGED"));
    let anonymous_legacy_issue_read = rest(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1",
        None,
        None,
        None,
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_read).await;
    let legacy_issue_detect_change = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/detectChange",
            Some(&visitor_cookie),
            None,
            Some(json!({
                "poll": {
                    "issueBodyChecksum": "stale",
                    "comments": {
                        "numOfComments": "0"
                    }
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_detect_change["result"], "ok");
    assert_eq!(legacy_issue_detect_change["issueBodyChanged"], true);
    assert_eq!(legacy_issue_detect_change["numOfComments"], 6);
    assert_eq!(legacy_issue_detect_change["commentAuthorName"], "visitor");
    assert!(legacy_issue_detect_change["issueBodyChecksum"]
        .as_str()
        .is_some_and(|value| value.len() == 40));
    assert!(legacy_issue_detect_change["issueUpdateDate"]
        .as_i64()
        .is_some_and(|value| value > 0));
    let anonymous_legacy_issue_detect_change = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/detectChange",
        None,
        None,
        Some(json!({
            "issueBodyChecksum": "stale",
            "numOfComments": 0
        })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_detect_change).await;
    let visitor_user = repository
        .find_user_by_login_id("visitor")
        .await
        .unwrap()
        .expect("visitor exists");
    let guest_user = repository
        .find_user_by_login_id("guest")
        .await
        .unwrap()
        .expect("guest exists");
    let issue_with_parent_comment = repository
        .create_issue_comment(CreateIssueCommentInput {
            actor_display_name: visitor_user.display_name.clone(),
            actor_id: visitor_user.id,
            actor_login_id: visitor_user.login_id.clone(),
            attachment_ids: Vec::new(),
            contents_markdown: "Parent comment for receiver preview".to_string(),
            issue_number: 1,
            owner_name: "owner".to_string(),
            parent_comment_id: None,
            project_name: "projectYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("issue after parent comment");
    let parent_comment_id = issue_with_parent_comment
        .comments
        .iter()
        .find(|comment| comment.contents_markdown == "Parent comment for receiver preview")
        .expect("parent comment")
        .id;
    repository
        .create_issue_comment(CreateIssueCommentInput {
            actor_display_name: guest_user.display_name.clone(),
            actor_id: guest_user.id,
            actor_login_id: guest_user.login_id.clone(),
            attachment_ids: Vec::new(),
            contents_markdown: "Sibling comment for receiver preview".to_string(),
            issue_number: 1,
            owner_name: "owner".to_string(),
            parent_comment_id: Some(parent_comment_id),
            project_name: "projectYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("issue after sibling comment");
    let legacy_parent_comment_receivers = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/commentNotiReceivers",
            Some(&visitor_cookie),
            None,
            Some(json!({
                "draft": {
                    "comment": "reply preview",
                    "parentCommentId": parent_comment_id.to_string()
                }
            })),
        )
        .await,
    )
    .await;
    let legacy_parent_comment_receivers = legacy_parent_comment_receivers["receivers"]
        .as_array()
        .expect("legacy parent comment receivers");
    assert!(legacy_parent_comment_receivers
        .iter()
        .any(|receiver| receiver["loginId"] == "guest"));
    assert!(!legacy_parent_comment_receivers
        .iter()
        .any(|receiver| receiver["loginId"] == "visitor"));
    assert!(!legacy_parent_comment_receivers
        .iter()
        .any(|receiver| receiver["loginId"] == "owner"));
    let legacy_issue_no_assignee = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/assignees",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({ "assignees": [] })),
    )
    .await;
    assert_eq!(legacy_issue_no_assignee.status(), StatusCode::BAD_REQUEST);
    assert_eq!(
        response_json(legacy_issue_no_assignee).await,
        json!({ "message": "No assignee" })
    );
    let anonymous_legacy_issue_assignee = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/assignees",
        None,
        None,
        Some(json!({ "assignees": ["visitor"] })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_assignee).await;
    let legacy_issue_shared = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/share",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "request": {
                    "action": "add"
                },
                "target": {
                    "sharer": {
                        "account": {
                            "loginId": "guest",
                            "type": "user"
                        }
                    }
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_shared["action"], "added");
    assert_eq!(legacy_issue_shared["sharer"], "guest");
    let legacy_issue_shared_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert!(legacy_issue_shared_detail["sharers"]
        .as_array()
        .expect("legacy issue sharers")
        .iter()
        .any(|sharer| sharer["loginId"] == "guest"));
    let legacy_issue_find_sharer = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/findSharer?query=guest,missing",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_issue_find_sharer
            .as_array()
            .expect("legacy issue find sharer")
            .len(),
        1
    );
    assert_eq!(legacy_issue_find_sharer[0]["loginId"], "guest");
    assert_eq!(legacy_issue_find_sharer[0]["name"], "guest");
    assert_eq!(legacy_issue_find_sharer[0]["type"], "user");
    let legacy_find_sharer_html = rest_with_headers(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/findSharer?query=guest",
        &[("Accept", "text/html")],
        None,
    )
    .await;
    assert_eq!(legacy_find_sharer_html.status(), StatusCode::NOT_ACCEPTABLE);
    let legacy_issue_unshared = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/share",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "request": {
                    "action": "delete"
                },
                "target": {
                    "sharer": {
                        "account": {
                            "loginId": "guest",
                            "type": "user"
                        }
                    }
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_unshared["action"], "deleted");
    assert_eq!(legacy_issue_unshared["sharer"], "guest");
    let legacy_issue_no_sharer = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/share",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({ "action": "add" })),
    )
    .await;
    assert_eq!(legacy_issue_no_sharer.status(), StatusCode::BAD_REQUEST);
    assert_eq!(
        response_json(legacy_issue_no_sharer).await,
        json!({ "message": "No sharer" })
    );
    let anonymous_legacy_issue_share = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/share",
        None,
        None,
        Some(json!({
            "action": "add",
            "sharer": {
                "loginId": "guest",
                "type": "user"
            }
        })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_share).await;
    let legacy_project_assignable = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/assignableUsers?query=visitor",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert!(legacy_project_assignable
        .as_array()
        .expect("legacy project assignable users")
        .iter()
        .any(|user| user["loginId"] == "visitor"
            && user["name"] == "visitor"
            && user["type"] == "user"));
    let legacy_issue_assignable = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/assignableUsers",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert!(legacy_issue_assignable
        .as_array()
        .expect("legacy issue assignable users")
        .iter()
        .any(|user| user["loginId"] == "owner" && user["name"] == "issue.assignToMe"));
    assert!(legacy_issue_assignable
        .as_array()
        .expect("legacy issue assignable users")
        .iter()
        .any(|user| user["loginId"] == "anonymous" && user["name"] == "issue.noAssignee"));
    assert!(legacy_issue_assignable
        .as_array()
        .expect("legacy issue assignable users")
        .iter()
        .any(|user| user["loginId"] == "visitor" && user["name"] == "visitor"));
    let legacy_assignable_html = rest_with_headers(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/assignableUsers",
        &[("Accept", "text/html")],
        None,
    )
    .await;
    assert_eq!(legacy_assignable_html.status(), StatusCode::NOT_ACCEPTABLE);
    let legacy_sharable_user = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/sharableUsers?query=visitor",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert!(legacy_sharable_user
        .as_array()
        .expect("legacy sharable users")
        .iter()
        .any(|item| item["loginId"] == "visitor"
            && item["name"] == "visitor"
            && item["type"] == "user"));
    let legacy_sharable_project = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/sharableUsers?query=projectYobi",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert!(legacy_sharable_project
        .as_array()
        .expect("legacy sharable projects")
        .iter()
        .any(|item| item["name"] == "owner/projectYobi" && item["type"] == "project"));
    let legacy_sharable_html = rest_with_headers(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/sharableUsers?query=visitor",
        &[("Accept", "text/html")],
        None,
    )
    .await;
    assert_eq!(legacy_sharable_html.status(), StatusCode::NOT_ACCEPTABLE);
    let legacy_issue_favorited = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!("/yona/-_-api/v1/favoriteIssues/{issue_id}"),
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_favorited["issueId"], issue_id.to_string());
    assert_eq!(legacy_issue_favorited["favored"], true);
    assert_eq!(
        legacy_issue_favorited["message"],
        "Added as a favorite issue. See it on the My Issues page"
    );
    let legacy_issues = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/favoriteIssues",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issues["projectIds"], json!([issue_id]));
    assert_eq!(legacy_issues["projects"][0]["issueId"], issue_id);
    assert_eq!(
        legacy_issues["projects"][0]["issueTitle"],
        "Favorite issue via nested legacy put"
    );
    assert_eq!(legacy_issues["projects"][0]["issueAuthorName"], "owner");
    let legacy_issue_unfavorited = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!("/yona/-_-api/v1/favoriteIssues/{issue_id}"),
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_unfavorited["issueId"], issue_id.to_string());
    assert_eq!(legacy_issue_unfavorited["favored"], false);
    assert_eq!(
        legacy_issue_unfavorited["message"],
        "Removed from favorite issues"
    );

    let anonymous_legacy_issues = rest(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/favoriteIssues",
        None,
        None,
        None,
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issues).await;

    let anonymous_legacy_issue_toggle = rest(
        app.clone(),
        Method::POST,
        &format!("/yona/-_-api/v1/favoriteIssues/{issue_id}"),
        None,
        None,
        None,
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_issue_toggle).await;

    let previous_translation_api = std::env::var("YONA_TRANSLATION_API").ok();
    std::env::set_var("YONA_TRANSLATION_API", "");
    let translation_without_config = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/translation",
        Some(&visitor_cookie),
        Some(&visitor_csrf),
        Some(json!({
            "owner": "owner",
            "projectName": "projectYobi",
            "type": "issue",
            "number": 1
        })),
    )
    .await;
    assert_eq!(
        translation_without_config.status(),
        StatusCode::PRECONDITION_FAILED
    );
    assert_eq!(
        response_text(translation_without_config).await,
        "Precondition Failed"
    );
    if let Some(value) = previous_translation_api {
        std::env::set_var("YONA_TRANSLATION_API", value);
    } else {
        std::env::remove_var("YONA_TRANSLATION_API");
    }

    let previous_translation_api = std::env::var("YONA_TRANSLATION_API").ok();
    std::env::set_var("YONA_TRANSLATION_API", "http://127.0.0.1:9/translate");
    let anonymous_translation = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/translation",
        None,
        None,
        Some(json!({
            "owner": "owner",
            "projectName": "projectYobi",
            "type": "issue",
            "number": 1
        })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_translation).await;
    if let Some(value) = previous_translation_api {
        std::env::set_var("YONA_TRANSLATION_API", value);
    } else {
        std::env::remove_var("YONA_TRANSLATION_API");
    }

    let previous_translation_api = std::env::var("YONA_TRANSLATION_API").ok();
    let (translation_api, translation_stub_path) =
        write_legacy_translation_stub_response("Translated **issue**");
    std::env::set_var("YONA_TRANSLATION_API", translation_api);
    let translated_issue = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/translation",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "owner": "owner",
                "projectName": "projectYobi",
                "type": "issue",
                "number": 1
            })),
        )
        .await,
    )
    .await;
    assert_eq!(translated_issue["translated"], "Translated **issue**");
    assert_eq!(
        translated_issue["translatedMarkdown"],
        "Translated **issue**"
    );
    std::fs::remove_file(translation_stub_path).expect("translation stub cleanup");
    if let Some(value) = previous_translation_api {
        std::env::set_var("YONA_TRANSLATION_API", value);
    } else {
        std::env::remove_var("YONA_TRANSLATION_API");
    }

    let organization = create_organization_rest(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "weblabs",
        "web labs",
    )
    .await;
    assert_eq!(organization["organizationName"], "weblabs");
    let organization_id = repository
        .read_organization_by_name("weblabs")
        .await
        .unwrap()
        .expect("created organization")
        .id;
    let legacy_organization_favorited = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!("/yona/-_-api/v1/favoriteOrganizations/{organization_id}"),
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_organization_favorited["organizationId"],
        organization_id.to_string()
    );
    assert_eq!(legacy_organization_favorited["favored"], true);
    let legacy_organizations = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/favoriteOrganizations",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_organizations["organizationIds"],
        json!([organization_id])
    );
    assert_eq!(
        legacy_organizations["organizations"][0]["organizationId"],
        organization_id
    );
    assert_eq!(
        legacy_organizations["organizations"][0]["organizationName"],
        "weblabs"
    );
    let legacy_organization_unfavorited = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!("/yona/-_-api/v1/favoriteOrganizations/{organization_id}"),
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_organization_unfavorited["organizationId"],
        organization_id.to_string()
    );
    assert_eq!(legacy_organization_unfavorited["favored"], false);

    let anonymous_legacy_organizations = rest(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/favoriteOrganizations",
        None,
        None,
        None,
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_organizations).await;

    let anonymous_legacy_organization_toggle = rest(
        app.clone(),
        Method::POST,
        &format!("/yona/-_-api/v1/favoriteOrganizations/{organization_id}"),
        None,
        None,
        None,
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_organization_toggle).await;

    repository
        .watch_issue(issue_id, visitor_id)
        .await
        .expect("legacy issue watcher");
    let legacy_issue_watchers = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/1/watchers?type=issues",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_issue_watchers["totalWatchers"], 2);
    assert_eq!(legacy_issue_watchers["watchersInList"], 2);
    assert_eq!(legacy_issue_watchers["watchers"][0]["name"], "owner");
    assert_eq!(legacy_issue_watchers["watchers"][0]["url"], "/yona/owner");
    assert_eq!(legacy_issue_watchers["watchers"][1]["name"], "visitor");
    assert_eq!(legacy_issue_watchers["watchers"][1]["url"], "/yona/visitor");

    let posting = repository
        .create_posting(CreatePostingInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: "projectYobi".to_string(),
            values: PostingMutationInput {
                attachment_ids: Vec::new(),
                body_markdown: "legacy watcher post body".to_string(),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: "legacy watcher post".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("legacy watcher posting");
    repository
        .watch_posting(posting.id, visitor_id)
        .await
        .expect("legacy posting watcher");
    let legacy_post_watchers = ok_json(
        rest(
            app.clone(),
            Method::GET,
            &format!(
                "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/{}/watchers?type=posts",
                posting.post_number
            ),
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_post_watchers["totalWatchers"], 2);
    assert_eq!(legacy_post_watchers["watchersInList"], 2);
    assert_eq!(legacy_post_watchers["watchers"][0]["name"], "owner");
    assert_eq!(legacy_post_watchers["watchers"][0]["url"], "/yona/owner");
    assert_eq!(legacy_post_watchers["watchers"][1]["name"], "visitor");
    assert_eq!(legacy_post_watchers["watchers"][1]["url"], "/yona/visitor");

    let legacy_board_create_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "posts": [
                {
                    "author": {
                        "email": "visitor@example.com"
                    },
                    "body": "legacy board post body",
                    "createdAt": "2020-01-02 AM 03:04:05 +0000",
                    "number": 77,
                    "temporaryUploadFiles": [
                        legacy_board_post_file.id.to_string(),
                        visitor_owned_file.id
                    ],
                    "title": "legacy board post",
                    "updatedAt": "2020-01-03 AM 04:05:06 +0000"
                },
                {
                    "author": {
                        "email": "legacy-board-author@example.com",
                        "loginId": "legacy-board-author",
                        "name": "Legacy Board Author"
                    },
                    "body": "legacy board imported author body",
                    "number": 78,
                    "title": "legacy board imported author"
                }
            ]
        })),
    )
    .await;
    assert_eq!(legacy_board_create_response.status(), StatusCode::CREATED);
    let legacy_board_created = response_json(legacy_board_create_response).await;
    assert_eq!(legacy_board_created[0]["status"], 201);
    assert_eq!(
        legacy_board_created[0]["location"],
        "/yona/owner/projectYobi/post/77"
    );
    assert_eq!(legacy_board_created[1]["status"], 201);
    assert_eq!(
        legacy_board_created[1]["location"],
        "/yona/owner/projectYobi/post/78"
    );
    let legacy_board_imported_author = repository
        .find_user_by_identifier("legacy-board-author@example.com")
        .await
        .unwrap()
        .expect("legacy board imported author");
    assert_eq!(legacy_board_imported_author.login_id, "legacy-board-author");
    assert_eq!(
        legacy_board_imported_author.display_name,
        "Legacy Board Author"
    );
    let nested_legacy_board_create_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "import": {
                "posts": [
                    {
                        "actor": {
                            "author": {
                                "email": "visitor@example.com"
                            }
                        },
                        "subject": {
                            "title": "legacy board nested post"
                        },
                        "message": {
                            "body": "legacy board nested post body"
                        },
                        "meta": {
                            "number": "79",
                            "createdAt": "2020-01-04 AM 03:04:05 +0000",
                            "updatedAt": "2020-01-05 AM 04:05:06 +0000"
                        }
                    }
                ]
            }
        })),
    )
    .await;
    assert_eq!(
        nested_legacy_board_create_response.status(),
        StatusCode::CREATED
    );
    let nested_legacy_board_created = response_json(nested_legacy_board_create_response).await;
    assert_eq!(nested_legacy_board_created[0]["status"], 201);
    assert_eq!(
        nested_legacy_board_created[0]["location"],
        "/yona/owner/projectYobi/post/79"
    );
    let legacy_board_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/77",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_board_detail["title"], "legacy board post");
    assert_eq!(
        legacy_board_detail["bodyMarkdown"],
        "legacy board post body"
    );
    let nested_legacy_board_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/79",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        nested_legacy_board_detail["title"],
        "legacy board nested post"
    );
    assert_eq!(
        nested_legacy_board_detail["bodyMarkdown"],
        "legacy board nested post body"
    );
    assert_eq!(nested_legacy_board_detail["authorLoginId"], "visitor");
    assert_eq!(legacy_board_detail["authorLoginId"], "visitor");
    let legacy_board_imported_author_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/78",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_board_imported_author_detail["authorLoginId"],
        "legacy-board-author"
    );

    let legacy_board_content = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/77/content",
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            Some(json!({
                "content": "legacy board post body updated",
                "original": "legacy board post body"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_board_content["number"], 77);
    assert_eq!(
        legacy_board_content["id"],
        json!(legacy_board_detail["id"]
            .as_str()
            .expect("post detail id")
            .parse::<i64>()
            .expect("numeric post detail id"))
    );
    assert_eq!(legacy_board_content["title"], "legacy board post");
    assert_eq!(legacy_board_content["type"], "BOARD_POST");
    assert_eq!(legacy_board_content["author"]["loginId"], "visitor");
    assert_eq!(
        legacy_board_content["author"]["email"],
        "visitor@example.com"
    );
    assert_eq!(
        legacy_board_content["body"],
        "legacy board post body updated"
    );
    assert_eq!(legacy_board_content["owner"], "owner");
    assert_eq!(legacy_board_content["projectName"], "projectYobi");
    assert_eq!(
        legacy_board_content["attachments"][0]["id"],
        legacy_board_post_file.id
    );
    let legacy_board_post_file_after = repository
        .read_attachment_by_id(legacy_board_post_file.id)
        .await
        .unwrap()
        .expect("legacy board post attachment");
    assert_eq!(legacy_board_post_file_after.container_type, "BOARD_POST");
    assert_eq!(
        legacy_board_post_file_after.container_id,
        legacy_board_content["id"].as_i64().unwrap()
    );
    let visitor_owned_file_after = repository
        .read_attachment_by_id(visitor_owned_file.id)
        .await
        .unwrap()
        .expect("visitor owned attachment");
    assert_eq!(visitor_owned_file_after.container_type, "USER");
    assert_eq!(visitor_owned_file_after.container_id, visitor_id);
    assert_eq!(
        legacy_board_content["createdAt"],
        "2020-01-02T03:04:05+0000"
    );
    assert!(legacy_board_content["updatedAt"]
        .as_str()
        .is_some_and(|value| value.ends_with("+0000")));

    let nested_legacy_board_content = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/77/content",
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            Some(json!({
                "payload": {
                    "body": {
                        "content": "legacy board post body nested update"
                    },
                    "base": {
                        "original": "legacy board post body updated"
                    }
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        nested_legacy_board_content["body"],
        "legacy board post body nested update"
    );

    let legacy_board_conflict = rest(
        app.clone(),
        Method::PATCH,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/77/content",
        Some(&visitor_cookie),
        Some(&visitor_csrf),
        Some(json!({
            "content": "stale update",
            "original": "legacy board post body"
        })),
    )
    .await;
    assert_eq!(legacy_board_conflict.status(), StatusCode::CONFLICT);
    assert_eq!(
        response_json(legacy_board_conflict).await,
        json!({
            "message": "Already modified by someone.",
            "storedContent": "legacy board post body nested update"
        })
    );

    let legacy_board_comment_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/77/comments",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "author": {
                "email": "visitor@example.com"
            },
            "body": "legacy board comment body",
            "createdAt": "2020-02-03 AM 04:05:06 +0000",
            "temporaryUploadFiles": [
                legacy_board_comment_file.id
            ]
        })),
    )
    .await;
    assert_eq!(legacy_board_comment_response.status(), StatusCode::CREATED);
    let legacy_board_comment = response_json(legacy_board_comment_response).await;
    assert_eq!(legacy_board_comment["status"], 201);
    assert!(legacy_board_comment["location"]
        .as_str()
        .is_some_and(|location| location.starts_with("/yona/owner/projectYobi/post/77#comment-")));
    let legacy_board_comment_id = legacy_board_comment["location"]
        .as_str()
        .expect("legacy board comment location")
        .rsplit_once("#comment-")
        .expect("legacy board comment anchor")
        .1
        .parse::<i64>()
        .expect("legacy board comment id");
    let legacy_board_comment_file_after = repository
        .read_attachment_by_id(legacy_board_comment_file.id)
        .await
        .unwrap()
        .expect("legacy board comment attachment");
    assert_eq!(
        legacy_board_comment_file_after.container_type,
        "NONISSUE_COMMENT"
    );
    assert_eq!(
        legacy_board_comment_file_after.container_id,
        legacy_board_comment_id
    );
    let legacy_board_imported_comment_author_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/77/comments",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "author": {
                "email": "legacy-board-comment-author@example.com",
                "loginId": "legacy-board-comment-author",
                "name": "Legacy Board Comment Author"
            },
            "body": "legacy board imported comment author body"
        })),
    )
    .await;
    assert_eq!(
        legacy_board_imported_comment_author_response.status(),
        StatusCode::CREATED
    );
    let legacy_board_imported_comment_author = repository
        .find_user_by_identifier("legacy-board-comment-author@example.com")
        .await
        .unwrap()
        .expect("legacy board imported comment author");
    assert_eq!(
        legacy_board_imported_comment_author.login_id,
        "legacy-board-comment-author"
    );
    let nested_legacy_board_comment_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/77/comments",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "payload": {
                "actor": {
                    "author": {
                        "email": "visitor@example.com"
                    }
                },
                "message": {
                    "body": "legacy board nested comment body"
                },
                "time": {
                    "createdAt": "2020-02-04 AM 04:05:06 +0000"
                }
            }
        })),
    )
    .await;
    assert_eq!(
        nested_legacy_board_comment_response.status(),
        StatusCode::CREATED
    );
    let legacy_board_detail_with_comment = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/77",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    let legacy_created_comment = legacy_board_detail_with_comment["comments"]
        .as_array()
        .expect("comments")
        .iter()
        .find(|comment| comment["contentsMarkdown"] == "legacy board comment body")
        .expect("legacy board comment");
    assert_eq!(legacy_created_comment["authorLoginId"], "visitor");
    assert!(legacy_board_detail_with_comment["comments"]
        .as_array()
        .unwrap()
        .iter()
        .any(
            |comment| comment["authorLoginId"] == "legacy-board-comment-author"
                && comment["contentsMarkdown"] == "legacy board imported comment author body"
        ));
    assert!(legacy_board_detail_with_comment["comments"]
        .as_array()
        .unwrap()
        .iter()
        .any(|comment| comment["authorLoginId"] == "visitor"
            && comment["contentsMarkdown"] == "legacy board nested comment body"));

    let legacy_board_comment_update = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!("/yona/owner/projectYobi/post/77/comment/{legacy_board_comment_id}"),
            Some(&visitor_cookie),
            None,
            Some(json!({
                "content": "legacy board comment body updated",
                "original": "legacy board comment body"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_board_comment_update["result"]["id"],
        legacy_board_comment_id
    );
    assert_eq!(
        legacy_board_comment_update["result"]["author"]["loginId"],
        "visitor"
    );
    assert_eq!(
        legacy_board_comment_update["result"]["author"]["email"],
        "visitor@example.com"
    );
    assert_eq!(
        legacy_board_comment_update["result"]["body"],
        "legacy board comment body updated"
    );
    assert_eq!(
        legacy_board_comment_update["result"]["createdAt"],
        "2020-02-03T04:05:06+0000"
    );

    let nested_legacy_board_comment_update = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!("/yona/owner/projectYobi/post/77/comment/{legacy_board_comment_id}"),
            Some(&visitor_cookie),
            None,
            Some(json!({
                "payload": {
                    "body": {
                        "content": "legacy board comment body nested update"
                    },
                    "base": {
                        "original": "legacy board comment body updated"
                    }
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        nested_legacy_board_comment_update["result"]["body"],
        "legacy board comment body nested update"
    );

    let legacy_board_comment_conflict = rest(
        app.clone(),
        Method::PATCH,
        &format!("/yona/owner/projectYobi/post/77/comment/{legacy_board_comment_id}"),
        Some(&visitor_cookie),
        None,
        Some(json!({
            "content": "stale comment update",
            "original": "legacy board comment body"
        })),
    )
    .await;
    assert_eq!(legacy_board_comment_conflict.status(), StatusCode::CONFLICT);
    assert_eq!(
        response_json(legacy_board_comment_conflict).await,
        json!({
            "message": "Already modified by someone.",
            "storedContent": "legacy board comment body nested update"
        })
    );

    let legacy_board_label_fixture = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryName": "BoardType",
                "categoryIsExclusive": false,
                "labelColor": "#2196f3",
                "labelName": "BoardLabel"
            })),
        )
        .await,
    )
    .await;
    let legacy_board_label_id = legacy_board_label_fixture["label"]["id"]
        .as_str()
        .expect("legacy board label id")
        .to_string();
    let legacy_board_label_update = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/postlabel/77",
            None,
            None,
            Some(json!([legacy_board_label_id])),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_board_label_update["id"], "owner");
    assert_eq!(legacy_board_label_update["labels"], 1);
    let legacy_board_detail_with_label = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/77",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_board_detail_with_label["labels"][0]["name"],
        "BoardLabel"
    );

    let legacy_milestones_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/milestones",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "milestones": [
                {
                    "title": "Legacy Milestone",
                    "description": "legacy milestone body",
                    "due_on": "2026-07-15",
                    "state": "closed"
                }
            ]
        })),
    )
    .await;
    assert_eq!(legacy_milestones_response.status(), StatusCode::CREATED);
    let legacy_milestones = response_json(legacy_milestones_response).await;
    assert_eq!(legacy_milestones[0]["title"], "Legacy Milestone");
    assert_eq!(legacy_milestones[0]["description"], "legacy milestone body");
    assert_eq!(legacy_milestones[0]["due_on"], "2026-07-15");
    assert_eq!(legacy_milestones[0]["state"], "closed");

    let legacy_duplicate_milestones = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/milestones",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "milestones": [
                    {
                        "title": "Legacy Milestone",
                        "description": "duplicate milestone body"
                    }
                ]
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_duplicate_milestones[0]["message"],
        "This milestone title already exists. Please enter a different title."
    );
    assert_eq!(
        legacy_duplicate_milestones[0]["milestone"]["title"],
        "Legacy Milestone"
    );

    let spaced_legacy_milestones = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/milestones",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "milestones": [
                    {
                        "title": "  Legacy Milestone  ",
                        "description": "legacy spaced title"
                    }
                ]
            })),
        )
        .await,
    )
    .await;
    assert_eq!(spaced_legacy_milestones[0]["title"], "  Legacy Milestone  ");
    assert_eq!(
        spaced_legacy_milestones[0]["description"],
        "legacy spaced title"
    );

    let nested_legacy_milestones = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/milestones",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "import": {
                    "milestones": [
                        {
                            "meta": {
                                "title": "Nested Legacy Milestone",
                                "state": "closed"
                            },
                            "body": {
                                "description": "nested milestone body"
                            },
                            "schedule": {
                                "due_on": "2026-08-20"
                            }
                        },
                        {
                            "body": {
                                "description": "fallback title body"
                            }
                        }
                    ]
                }
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        nested_legacy_milestones[0]["title"],
        "Nested Legacy Milestone"
    );
    assert_eq!(
        nested_legacy_milestones[0]["description"],
        "nested milestone body"
    );
    assert_eq!(nested_legacy_milestones[0]["due_on"], "2026-08-20");
    assert_eq!(nested_legacy_milestones[0]["state"], "closed");
    assert_eq!(nested_legacy_milestones[1]["title"], "No title");
    assert_eq!(
        nested_legacy_milestones[1]["description"],
        "fallback title body"
    );
    assert_eq!(nested_legacy_milestones[1]["state"], "open");

    let anonymous_legacy_milestones = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/milestones",
        None,
        None,
        Some(json!({
            "milestones": [
                {
                    "title": "Anonymous Milestone"
                }
            ]
        })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_milestones).await;

    let anonymous_legacy_board_create = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts",
        None,
        None,
        Some(json!({
            "posts": [
                {
                    "body": "anonymous",
                    "title": "anonymous"
                }
            ]
        })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_board_create).await;

    let legacy_watchers_without_type = rest(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/1/watchers",
        None,
        None,
        None,
    )
    .await;
    assert_eq!(legacy_watchers_without_type.status(), StatusCode::OK);
    assert_eq!(response_text(legacy_watchers_without_type).await, "");

    let watched = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/watch",
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(watched["isWatching"], true);
    assert_eq!(watched["watchCount"], 1);

    let unwatched = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/owners/owner/projects/projectYobi/watch",
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(unwatched["isWatching"].as_bool().unwrap_or(false), false);
    assert_eq!(unwatched["watchCount"].as_u64().unwrap_or_default(), 0);

    let direct_watched = rest(
        app.clone(),
        Method::POST,
        "/yona/owner/projectYobi/watch",
        Some(&visitor_cookie),
        Some(&visitor_csrf),
        None,
    )
    .await;
    assert_eq!(direct_watched.status(), StatusCode::OK);
    assert_eq!(response_text(direct_watched).await, "");
    assert!(repository
        .is_watching_project(visitor_id, project_id)
        .await
        .unwrap());

    let direct_watch_notification = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/workspace/notifications",
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            Some(json!({
                "projectId": project_id_text,
                "eventType": "NEW_COMMENT"
            })),
        )
        .await,
    )
    .await;
    let direct_watch_notifications = direct_watch_notification["watchedProjects"][0]
        ["notifications"]
        .as_array()
        .expect("notifications array after direct watch");
    let direct_watch_new_comment = direct_watch_notifications
        .iter()
        .find(|entry| entry["eventType"] == "NEW_COMMENT")
        .expect("new comment notification after direct watch");
    assert_eq!(direct_watch_new_comment["enabled"], true);
    let direct_watch_override = user_project_notification::Entity::find()
        .filter(user_project_notification::Column::UserId.eq(Some(visitor_id)))
        .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
        .filter(
            user_project_notification::Column::NotificationType.eq(Some("NEW_COMMENT".to_string())),
        )
        .one(&db)
        .await
        .unwrap();
    assert!(direct_watch_override.is_some());

    let direct_unwatched = rest(
        app.clone(),
        Method::POST,
        "/yona/owner/projectYobi/unwatch",
        Some(&visitor_cookie),
        Some(&visitor_csrf),
        None,
    )
    .await;
    assert_eq!(direct_unwatched.status(), StatusCode::OK);
    assert_eq!(response_text(direct_unwatched).await, "");
    assert!(!repository
        .is_watching_project(visitor_id, project_id)
        .await
        .unwrap());
    let direct_unwatch_override = user_project_notification::Entity::find()
        .filter(user_project_notification::Column::UserId.eq(Some(visitor_id)))
        .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
        .filter(
            user_project_notification::Column::NotificationType.eq(Some("NEW_COMMENT".to_string())),
        )
        .one(&db)
        .await
        .unwrap();
    assert!(direct_unwatch_override.is_none());
}

#[tokio::test]
async fn rest_project_read_denies_legacy_guest_nonmember_on_public_project() {
    let (app, repository) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (visitor_csrf, visitor_cookie) = register_user(app.clone(), "visitor").await;
    let (_read_guest_csrf, read_guest_cookie) = register_user(app.clone(), "read-guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let owner_issue = create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Owner public issue",
    )
    .await;
    assert_eq!(owner_issue["issueNumber"], "1");

    let empty_issue_title = rpc(
        app.clone(),
        "CreateIssue",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "title": "",
            "bodyMarkdown": "Missing title"
        }),
    )
    .await;
    assert_eq!(empty_issue_title.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(empty_issue_title)
        .await
        .contains("issue.error.emptyTitle"));

    let empty_post_title = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/projects/owner/projectYobi/posts",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "title": "",
            "bodyMarkdown": "Missing title"
        })),
    )
    .await;
    assert_eq!(empty_post_title.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(empty_post_title)
        .await
        .contains("post.error.emptyTitle"));

    let public_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(public_detail["projectName"], "projectYobi");

    let read_guest = repository
        .toggle_site_user_guest_mode("read-guest")
        .await
        .expect("toggle read guest mode")
        .expect("read guest exists");
    assert!(read_guest.is_guest);

    let guest_detail = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/owners/owner/projects/projectYobi",
        Some(&read_guest_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(guest_detail.status(), StatusCode::FORBIDDEN);

    let guest_comment = create_issue_comment(
        app.clone(),
        &visitor_cookie,
        &visitor_csrf,
        1,
        "Guest-created public issue comment",
    )
    .await;
    assert_eq!(
        guest_comment["comments"][0]["contentsMarkdown"],
        "Guest-created public issue comment"
    );

    let guest_issue = create_issue(
        app.clone(),
        &visitor_cookie,
        &visitor_csrf,
        "Guest-created public issue",
    )
    .await;
    assert_eq!(guest_issue["issueNumber"], "2");

    let guest_post = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            Some(json!({
                "title": "Guest-created public post",
                "bodyMarkdown": "Legacy public board post create"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(guest_post["postNumber"], "1");

    let guest_post_comment = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts/1/comments",
            Some(&visitor_cookie),
            Some(&visitor_csrf),
            Some(json!({
                "contentsMarkdown": "Guest-created public board comment"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(guest_post_comment["commentCount"], 1);
    assert_eq!(
        guest_post_comment["comments"][0]["contentsMarkdown"],
        "Guest-created public board comment"
    );

    let project = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("project");
    let visitor = repository
        .find_user_by_login_id("visitor")
        .await
        .unwrap()
        .expect("visitor exists");
    repository
        .add_project_membership(project.id, visitor.id, "member")
        .await
        .unwrap();

    let member_detail = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi",
            Some(&visitor_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(member_detail["projectName"], "projectYobi");
}

#[tokio::test]
async fn rest_project_watchers_lists_actual_watchers_with_read_acl() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/watch",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;

    let watchers = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/watchers",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(watchers["ownerName"], "owner");
    assert_eq!(watchers["projectName"], "projectYobi");
    assert_eq!(watchers["totalCount"], 1);
    assert_eq!(watchers["watchers"][0]["loginId"], "guest");
    assert_eq!(watchers["watchers"][0]["userLabel"], "guest");
    assert!(watchers["watchers"][0]["avatarUrl"]
        .as_str()
        .unwrap_or_default()
        .contains("gravatar"));

    create_project_rest(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "privateYobi",
        "private watchers",
        "private",
    )
    .await;
    let forbidden = rest(
        app,
        Method::GET,
        "/yona/api/v1/owners/owner/projects/privateYobi/watchers",
        None,
        None,
        None,
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn rest_issue_meta_routes_manage_participation_assignment_sharing_and_comment_votes() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "REST issue").await;
    let commented = create_issue_comment(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        1,
        "comment worth agreeing with",
    )
    .await;
    let comment_id = commented["comments"][0]["id"].as_str().unwrap();
    let child_commented = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/comments",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "one-line child reply",
                "parentCommentId": comment_id.parse::<i64>().unwrap()
            })),
        )
        .await,
    )
    .await;
    assert!(child_commented["commentParentLinks"]
        .as_array()
        .unwrap()
        .iter()
        .any(|link| link["parentCommentId"] == comment_id.parse::<i64>().unwrap()));

    let anonymous_watch = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
        None,
        None,
        None,
    )
    .await;
    assert_eq!(anonymous_watch.status(), StatusCode::UNAUTHORIZED);
    let anonymous_watch_body = response_json(anonymous_watch).await;
    assert_eq!(anonymous_watch_body["error"]["code"], "unauthorized");

    let watched = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(watched["isWatching"], true);
    assert!(watched["watcherCount"].as_u64().unwrap_or_default() >= 1);

    let voted = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/vote",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(voted["hasVoted"], true);
    assert_eq!(voted["issueId"], 1);
    assert_eq!(voted["voterCount"], 1);
    assert_eq!(voted["issueVoters"][0]["loginId"], "guest");
    assert_eq!(voted["issueVoters"][0]["userLabel"], "guest");
    assert_eq!(voted["issueVoters"][0]["emailAddress"], "guest@example.com");
    assert!(voted["issueVoters"][0]["avatarUrl"]
        .as_str()
        .unwrap_or_default()
        .contains("gravatar.com"));

    let weight_upvoted = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/upvoteWeight",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(weight_upvoted["weight"], 1);

    let weight_downvoted = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/downvoteWeight",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(weight_downvoted["weight"], 0);

    let favorited = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/favorite",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(favorited["isFavorited"], true);

    let comment_voted = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/comments/{comment_id}/vote"
            ),
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(comment_voted["comments"][0]["viewerHasVoted"], true);
    assert_eq!(comment_voted["comments"][0]["voterCount"], 1);

    let assigned = ok_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignee",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "assigneeLoginId": "guest" })),
        )
        .await,
    )
    .await;
    assert_eq!(assigned["assigneeLoginId"], "guest");

    let unassigned = ok_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignee",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "assigneeLoginId": "" })),
        )
        .await,
    )
    .await;
    assert_eq!(
        unassigned
            .get("assigneeLoginId")
            .and_then(Value::as_str)
            .unwrap_or(""),
        ""
    );

    let shared = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharers",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "loginId": "guest" })),
        )
        .await,
    )
    .await;
    assert_eq!(shared["sharers"].as_array().unwrap().len(), 1);
    assert_eq!(shared["sharers"][0]["loginId"], "guest");

    let unshared = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharers/guest",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        unshared["sharers"]
            .as_array()
            .map(Vec::len)
            .unwrap_or_default(),
        0
    );

    let comment_unvoted = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/comments/{comment_id}/vote"
            ),
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        comment_unvoted["comments"][0]["viewerHasVoted"]
            .as_bool()
            .unwrap_or(false),
        false
    );

    let unwatched = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(unwatched["isWatching"].as_bool().unwrap_or(false), false);
}

#[tokio::test]
async fn rest_workspace_routes_manage_overview_settings_and_recent_projects() {
    let (app, repository, db) = build_app_with_repository_and_db().await;
    let (csrf, cookie_header) = register_user(app.clone(), "owner").await;
    let user = repository
        .find_user_by_identifier("owner")
        .await
        .unwrap()
        .expect("registered user");
    let project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "owner".to_string(),
            overview: Some("Workspace rest parity".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();

    let overview = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/workspace",
            Some(&cookie_header),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(overview["session"]["loginId"], "owner");
    assert_eq!(overview["defaultLandingPath"], "/me");

    let set_default = ok_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/workspace/default-landing-path",
            Some(&cookie_header),
            Some(&csrf),
            Some(json!({ "path": "/search?scope=global&pageSize=20" })),
        )
        .await,
    )
    .await;
    assert_eq!(
        set_default["defaultLandingPath"],
        "/search?pageSize=20&scope=global"
    );

    let updated_profile = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/workspace/profile",
            Some(&cookie_header),
            Some(&csrf),
            Some(json!({
                "name": "Owner Updated",
                "email": "owner-updated@example.com"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated_profile["session"]["userLabel"], "Owner Updated");
    assert_eq!(
        updated_profile["session"]["emailAddress"],
        "owner-updated@example.com"
    );

    let added_email = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/workspace/emails",
            Some(&cookie_header),
            Some(&csrf),
            Some(json!({ "email": "alt@example.com" })),
        )
        .await,
    )
    .await;
    assert!(added_email["emails"]
        .as_array()
        .into_iter()
        .flatten()
        .any(|entry| entry["emailAddress"] == "alt@example.com"));

    let alt_email = email::Entity::find()
        .filter(email::Column::UserId.eq(Some(user.id)))
        .filter(email::Column::Email.eq(Some("alt@example.com".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("alt email");

    let validation_sent = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!("/yona/api/v1/workspace/emails/{}/validation", alt_email.id),
            Some(&cookie_header),
            Some(&csrf),
            None,
        )
        .await,
    )
    .await;
    assert!(validation_sent["emails"]
        .as_array()
        .into_iter()
        .flatten()
        .any(|entry| entry["emailAddress"] == "alt@example.com"));

    let mut alt_email_active = email::ActiveModel::from(
        email::Entity::find_by_id(alt_email.id)
            .one(&db)
            .await
            .unwrap()
            .expect("alt email row"),
    );
    alt_email_active.valid = Set(Some(1));
    alt_email_active.update(&db).await.unwrap();

    let set_main = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!("/yona/api/v1/workspace/emails/{}/main", alt_email.id),
            Some(&cookie_header),
            Some(&csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(set_main["session"]["emailAddress"], "alt@example.com");
    assert_eq!(
        set_main["profile"]["primaryEmailAddress"],
        "alt@example.com"
    );

    let recent_visit = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/workspace/recent-projects",
            Some(&cookie_header),
            Some(&csrf),
            Some(json!({
                "ownerName": "owner",
                "projectName": "projectYobi"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(recent_visit["ownerName"], "owner");
    assert_eq!(recent_visit["projectName"], "projectYobi");

    let overview_with_recent = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/workspace",
            Some(&cookie_header),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        overview_with_recent["recentProjects"]
            .as_array()
            .map(Vec::len)
            .unwrap_or_default(),
        1
    );

    watch::ActiveModel {
        id: NotSet,
        user_id: Set(Some(user.id)),
        resource_type: Set(Some("PROJECT".to_string())),
        resource_id: Set(Some(project.id.to_string())),
    }
    .insert(&db)
    .await
    .unwrap();

    let toggled_notification = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/workspace/notifications",
            Some(&cookie_header),
            Some(&csrf),
            Some(json!({
                "projectId": project.id.to_string(),
                "eventType": "NEW_COMMENT"
            })),
        )
        .await,
    )
    .await;
    let notifications = toggled_notification["watchedProjects"][0]["notifications"]
        .as_array()
        .expect("notifications array");
    let new_comment = notifications
        .iter()
        .find(|entry| entry["eventType"] == "NEW_COMMENT")
        .expect("new comment notification");
    assert_eq!(new_comment["enabled"], true);

    let direct_toggle_notification = rest(
        app.clone(),
        Method::POST,
        &format!("/yona/noti/toggle/{}/NEW_COMMENT", project.id),
        Some(&cookie_header),
        Some(&csrf),
        None,
    )
    .await;
    assert_eq!(direct_toggle_notification.status(), StatusCode::OK);
    assert_eq!(response_text(direct_toggle_notification).await, "");
    let direct_toggle_row = user_project_notification::Entity::find()
        .filter(user_project_notification::Column::UserId.eq(Some(user.id)))
        .filter(user_project_notification::Column::ProjectId.eq(Some(project.id)))
        .filter(
            user_project_notification::Column::NotificationType.eq(Some("NEW_COMMENT".to_string())),
        )
        .one(&db)
        .await
        .unwrap();
    assert!(direct_toggle_row.is_none());
    let rest_toggle_after_direct = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/workspace/notifications",
            Some(&cookie_header),
            Some(&csrf),
            Some(json!({
                "projectId": project.id.to_string(),
                "eventType": "NEW_COMMENT"
            })),
        )
        .await,
    )
    .await;
    let rest_toggle_after_direct_notifications = rest_toggle_after_direct["watchedProjects"][0]
        ["notifications"]
        .as_array()
        .expect("notifications array after rest toggle");
    let rest_toggle_after_direct_new_comment = rest_toggle_after_direct_notifications
        .iter()
        .find(|entry| entry["eventType"] == "NEW_COMMENT")
        .expect("new comment notification after rest toggle");
    assert_eq!(rest_toggle_after_direct_new_comment["enabled"], true);

    let reset_token = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/workspace/api-token/reset",
            Some(&cookie_header),
            Some(&csrf),
            None,
        )
        .await,
    )
    .await;
    assert!(reset_token["apiToken"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));

    let updated_main_email = email::Entity::find()
        .filter(email::Column::UserId.eq(Some(user.id)))
        .filter(email::Column::Email.eq(Some("owner-updated@example.com".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("updated main email");
    let deleted_email = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/workspace/emails/{}", updated_main_email.id),
            Some(&cookie_header),
            Some(&csrf),
            None,
        )
        .await,
    )
    .await;
    assert!(!deleted_email["emails"]
        .as_array()
        .into_iter()
        .flatten()
        .any(|entry| entry["emailAddress"] == "owner-updated@example.com"));

    let reset_recent = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/workspace/recent-projects",
            Some(&cookie_header),
            Some(&csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        reset_recent["recentProjects"]
            .as_array()
            .map(Vec::len)
            .unwrap_or_default(),
        0
    );

    let changed_password = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/workspace/password",
            Some(&cookie_header),
            Some(&csrf),
            Some(json!({
                "loginId": "owner",
                "oldPassword": "doorpass1",
                "password": "doorpass2",
                "retypedPassword": "doorpass2"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(changed_password["isAnonymous"], true);

    let (fresh_csrf, fresh_cookie) = bootstrap(app.clone()).await;
    let signed_in = ok_json(
        rest(
            app,
            Method::POST,
            "/yona/api/v1/auth/sign-in",
            Some(&fresh_cookie),
            Some(&fresh_csrf),
            Some(json!({
                "identifier": "owner",
                "password": "doorpass2",
                "rememberMe": true
            })),
        )
        .await,
    )
    .await;
    assert_eq!(signed_in["loginId"], "owner");
}

#[tokio::test]
async fn rest_public_user_profile_reads_legacy_single_segment_profile() {
    let (app, repository) = build_app_with_repository().await;
    let (_owner_csrf, _owner_cookie) = register_user(app.clone(), "owner").await;
    let owner = repository
        .find_user_by_identifier("owner")
        .await
        .unwrap()
        .expect("registered owner");
    let public_project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "owner".to_string(),
            overview: Some("Visible member project".to_string()),
            project_name: "publicYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();
    let private_project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "owner".to_string(),
            overview: Some("Hidden member project".to_string()),
            project_name: "secretYobi".to_string(),
            project_scope: "private".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();
    repository
        .add_project_membership(public_project.id, owner.id, "member")
        .await
        .unwrap();
    repository
        .add_project_membership(private_project.id, owner.id, "member")
        .await
        .unwrap();

    let profile = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/users/owner/profile?daysAgo=7&selected=projects",
            None,
            None,
            None,
        )
        .await,
    )
    .await;

    assert_eq!(profile["daysAgo"], 7);
    assert_eq!(profile["selected"], "projects");
    assert_eq!(profile["profile"]["loginId"], "owner");
    assert_eq!(profile["profile"]["displayName"], "owner");
    assert_eq!(
        profile["profile"]["primaryEmailAddress"]
            .as_str()
            .unwrap_or_default(),
        ""
    );
    assert_eq!(profile["viewerCanEditProfile"], false);
    assert_eq!(profile["issueItems"].as_array().unwrap().len(), 0);
    assert_eq!(profile["pullRequestItems"].as_array().unwrap().len(), 0);
    let projects = profile["memberProjects"].as_array().unwrap();
    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0]["projectName"], "publicYobi");

    let missing = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/users/missing/profile",
        None,
        None,
        None,
    )
    .await;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);

    let (admin_csrf, admin_cookie) = register_user(app.clone(), "admin").await;
    let organization = create_organization_rest(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "web labs",
    )
    .await;
    assert_eq!(organization["organizationName"], "weblabs");

    let redirect = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/users/weblabs/profile",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(redirect["redirectPath"], "/organizations/weblabs");
}

#[tokio::test]
async fn rest_user_statistics_counts_legacy_activity_rows() {
    let (app, repository) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (_other_csrf, _other_cookie) = register_user(app.clone(), "other").await;
    let owner = repository
        .find_user_by_identifier("owner")
        .await
        .unwrap()
        .expect("owner");
    let other = repository
        .find_user_by_identifier("other")
        .await
        .unwrap()
        .expect("other");
    repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "owner".to_string(),
            overview: Some("statistics parity".to_string()),
            project_name: "statsYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();
    let authored_issue = repository
        .create_issue(CreateIssueInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner.id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: "statsYobi".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: Vec::new(),
                body_markdown: "owner issue body".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
                title: "owner issue".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("authored issue");
    repository
        .create_issue(CreateIssueInput {
            actor_display_name: "other".to_string(),
            actor_id: other.id,
            actor_login_id: "other".to_string(),
            owner_name: "owner".to_string(),
            project_name: "statsYobi".to_string(),
            values: IssueMutationInput {
                assignee_login_id: Some("owner".to_string()),
                attachment_ids: Vec::new(),
                body_markdown: "assigned issue body".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
                title: "assigned issue".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("assigned issue");
    let commented_issue = repository
        .create_issue_comment(CreateIssueCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner.id,
            actor_login_id: "owner".to_string(),
            attachment_ids: Vec::new(),
            contents_markdown: "owner issue comment".to_string(),
            issue_number: authored_issue.issue_number,
            owner_name: "owner".to_string(),
            parent_comment_id: None,
            project_name: "statsYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("issue comment");
    let issue_comment_id = commented_issue.comments[0].id;
    let posting = repository
        .create_posting(CreatePostingInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner.id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: "statsYobi".to_string(),
            values: PostingMutationInput {
                attachment_ids: Vec::new(),
                body_markdown: "owner post body".to_string(),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: "owner posting".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("posting");
    repository
        .create_posting_comment(CreatePostingCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner.id,
            actor_login_id: "owner".to_string(),
            attachment_actor_id: None,
            attachment_ids: Vec::new(),
            contents_markdown: "owner posting comment".to_string(),
            created_at: None,
            owner_name: "owner".to_string(),
            parent_comment_id: None,
            post_number: posting.post_number,
            project_name: "statsYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("posting comment");
    repository
        .vote_issue(authored_issue.id, owner.id)
        .await
        .unwrap();
    repository
        .vote_issue_comment(issue_comment_id, owner.id)
        .await
        .unwrap();

    let unauthenticated = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/users/owner/statistics",
        None,
        None,
        None,
    )
    .await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let statistics = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/users/owner/statistics",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(statistics["issue"], 1);
    assert_eq!(statistics["posting"], 1);
    assert_eq!(statistics["assignedIssue"], 1);
    assert_eq!(statistics["issueComment"], 1);
    assert_eq!(statistics["postingComment"], 1);
    assert_eq!(statistics["issueVoter"], 1);
    assert_eq!(statistics["issueCommentVoter"], 1);

    let legacy_statistics = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/users/owner/statistics",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_statistics, statistics);

    let owner_token = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/workspace/api-token/reset",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await["apiToken"]
        .as_str()
        .expect("owner api token")
        .to_string();
    let legacy_token_statistics = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/users/owner/statistics",
            &[("Yona-Token", &owner_token)],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_token_statistics, statistics);

    let anonymous_legacy_statistics = rest(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/users/owner/statistics",
        None,
        None,
        None,
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_statistics).await;

    let missing = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/users/missing/statistics",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(missing["issue"], 0);
    assert_eq!(missing["posting"], 0);
    assert_eq!(missing["assignedIssue"], 0);
    assert_eq!(missing["issueComment"], 0);
    assert_eq!(missing["postingComment"], 0);
    assert_eq!(missing["issueVoter"], 0);
    assert_eq!(missing["issueCommentVoter"], 0);
}

#[tokio::test]
async fn rest_workspace_routes_preserve_error_status_and_envelope() {
    let (app, repository, _) = build_app_with_repository_and_db().await;
    let (csrf, cookie_header) = register_user(app.clone(), "door").await;
    let public_project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "admin".to_string(),
            overview: Some("Public".to_string()),
            project_name: "publicProject".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();
    let private_project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "admin".to_string(),
            overview: Some("Private".to_string()),
            project_name: "privateProject".to_string(),
            project_scope: "private".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();

    let invalid_landing = rest(
        app.clone(),
        Method::PUT,
        "/yona/api/v1/workspace/default-landing-path",
        Some(&cookie_header),
        Some(&csrf),
        Some(json!({ "path": "/login" })),
    )
    .await;
    assert_eq!(invalid_landing.status(), StatusCode::BAD_REQUEST);
    let invalid_landing_body = response_json(invalid_landing).await;
    assert_eq!(invalid_landing_body["error"]["code"], "bad_request");

    let missing_notification = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/workspace/notifications",
        Some(&cookie_header),
        Some(&csrf),
        Some(json!({ "projectId": "99999", "eventType": "NEW_ISSUE" })),
    )
    .await;
    assert_eq!(missing_notification.status(), StatusCode::NOT_FOUND);
    let missing_notification_body = response_json(missing_notification).await;
    assert_eq!(missing_notification_body["error"]["code"], "not_found");

    let forbidden_notification = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/workspace/notifications",
        Some(&cookie_header),
        Some(&csrf),
        Some(json!({
            "projectId": private_project.id.to_string(),
            "eventType": "NEW_ISSUE"
        })),
    )
    .await;
    assert_eq!(forbidden_notification.status(), StatusCode::FORBIDDEN);
    let forbidden_notification_body = response_json(forbidden_notification).await;
    assert_eq!(forbidden_notification_body["error"]["code"], "forbidden");

    let unwatched_notification = rest(
        app,
        Method::POST,
        "/yona/api/v1/workspace/notifications",
        Some(&cookie_header),
        Some(&csrf),
        Some(json!({
            "projectId": public_project.id.to_string(),
            "eventType": "NEW_ISSUE"
        })),
    )
    .await;
    assert_eq!(unwatched_notification.status(), StatusCode::BAD_REQUEST);
    let unwatched_notification_body = response_json(unwatched_notification).await;
    assert_eq!(unwatched_notification_body["error"]["code"], "bad_request");
}

#[tokio::test]
async fn rest_label_routes_manage_labels_and_categories() {
    let (app, repository, db) = build_app_with_repository_and_db().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let project_id = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("label project")
        .id;

    let created_category = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels/categories",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryName": "Priority",
                "categoryIsExclusive": false
            })),
        )
        .await,
    )
    .await;
    let category_id = created_category["category"]["id"].as_str().unwrap();
    assert_eq!(created_category["created"], true);

    let created_label = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryName": "Type",
                "categoryIsExclusive": true,
                "labelColor": "#f44336",
                "labelName": "Bug"
            })),
        )
        .await,
    )
    .await;
    let label_id = created_label["label"]["id"].as_str().unwrap();
    assert_eq!(created_label["label"]["name"], "Bug");
    let legacy_created_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/labels",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "labels": [
                    {
                        "category": "Kind",
                        "isExclusive": false,
                        "labelColor": "#00ff00",
                        "labelName": "LegacyFeature"
                },
                {
                    "category": "Type",
                    "isExclusive": true,
                    "labelColor": "#f44336",
                    "labelName": "Bug"
                }
            ]
        })),
    )
    .await;
    assert_eq!(legacy_created_response.status(), StatusCode::CREATED);
    let legacy_created_labels = response_json(legacy_created_response).await;
    assert_eq!(legacy_created_labels[0]["status"], 201);
    assert_eq!(legacy_created_labels[0]["label"], "LegacyFeature");
    assert_eq!(legacy_created_labels[0]["category"], "Kind");
    assert_eq!(legacy_created_labels[0]["labelColor"], "#00ff00");
    assert_eq!(legacy_created_labels[0]["isExclusive"], true);
    assert_eq!(legacy_created_labels[1]["status"], 409);
    assert_eq!(legacy_created_labels[1]["reason"], "Conflict");
    assert_eq!(
        legacy_created_labels[1]["message"],
        "Failed to create a new label. The label may already exist."
    );
    assert_eq!(legacy_created_labels[1]["user"]["labelName"], "Bug");

    let legacy_nested_labels_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/labels",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "import": {
                "labels": [
                    {
                        "meta": {
                            "category": "Nested",
                            "isExclusive": false
                        },
                        "style": {
                            "labelColor": "#0099ff"
                        },
                        "name": {
                            "labelName": "NestedFeature"
                        }
                    }
                ]
            }
        })),
    )
    .await;
    assert_eq!(legacy_nested_labels_response.status(), StatusCode::CREATED);
    let legacy_nested_labels = response_json(legacy_nested_labels_response).await;
    assert_eq!(legacy_nested_labels[0]["status"], 201);
    assert_eq!(legacy_nested_labels[0]["label"], "NestedFeature");
    assert_eq!(legacy_nested_labels[0]["category"], "Nested");
    assert_eq!(legacy_nested_labels[0]["labelColor"], "#0099ff");
    assert_eq!(legacy_nested_labels[0]["isExclusive"], true);

    let anonymous_legacy_label = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/labels",
        None,
        None,
        Some(json!({
            "labels": [
                {
                    "category": "Kind",
                    "labelColor": "#000000",
                    "labelName": "Anonymous"
                }
            ]
        })),
    )
    .await;
    assert_legacy_external_unauthorized(anonymous_legacy_label).await;

    title_head::ActiveModel {
        id: NotSet,
        project_id: Set(Some(project_id)),
        head_keyword: Set(Some("Bugfix".to_string())),
        frequency: Set(Some(3)),
    }
    .insert(&db)
    .await
    .expect("legacy title head");

    let legacy_title_heads = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/titleHeads?query=bug",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_title_heads["result"][0]["name"], "Bugfix");
    assert_eq!(legacy_title_heads["result"][0]["frequency"], 3);
    assert_eq!(legacy_title_heads["result"][0]["category"], "");
    assert_eq!(legacy_title_heads["result"][0]["searchText"], "Bugfix");
    assert_eq!(legacy_title_heads["result"][1]["name"], "Bug");
    assert_eq!(legacy_title_heads["result"][1]["frequency"], 0);
    assert_eq!(legacy_title_heads["result"][1]["category"], "Type");
    assert_eq!(
        legacy_title_heads["result"][1]["categoryId"],
        json!(created_label["label"]["categoryId"]
            .as_str()
            .unwrap()
            .parse::<i64>()
            .unwrap())
    );
    assert_eq!(
        legacy_title_heads["result"][1]["id"],
        json!(created_label["label"]["id"]
            .as_str()
            .unwrap()
            .parse::<i64>()
            .unwrap())
    );
    assert_eq!(legacy_title_heads["result"][1]["labelColor"], "#f44336");
    assert_eq!(legacy_title_heads["result"][1]["isExclusive"], true);
    assert_eq!(legacy_title_heads["result"][1]["searchText"], "Bug/Type");

    let legacy_title_heads_html = rest_with_headers(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/titleHeads",
        &[("Accept", "text/html")],
        None,
    )
    .await;
    assert_eq!(legacy_title_heads_html.status(), StatusCode::NOT_ACCEPTABLE);

    let labels = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(labels["labels"].as_array().unwrap().len(), 2);

    create_project_rest(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "sourceLabels",
        "source label project",
        "public",
    )
    .await;
    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/sourceLabels/labels",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryName": "Type",
                "categoryIsExclusive": true,
                "labelColor": "#2196f3",
                "labelName": "Feature"
            })),
        )
        .await,
    )
    .await;
    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/sourceLabels/labels",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryName": "Type",
                "categoryIsExclusive": true,
                "labelColor": "#111111",
                "labelName": "Bug"
            })),
        )
        .await,
    )
    .await;
    let copied = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels/copy",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "fromOwnerName": "owner",
                "fromProjectName": "sourceLabels"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(copied["copied"], 1);
    assert_eq!(copied["skipped"], 1);
    assert!(copied["labels"]
        .as_array()
        .unwrap()
        .iter()
        .any(|label| label["name"] == "Feature" && label["categoryName"] == "Type"));
    assert!(copied["labels"]
        .as_array()
        .unwrap()
        .iter()
        .any(|label| label["name"] == "Bug" && label["color"] == "#f44336"));

    let updated_category = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/labels/categories/{category_id}"
            ),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryName": "Priority+",
                "categoryIsExclusive": true
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated_category["category"]["name"], "Priority+");
    assert_eq!(updated_category["category"]["isExclusive"], true);

    let updated_label = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/labels/{label_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryId": created_label["label"]["categoryId"].as_str().unwrap().parse::<i64>().unwrap(),
                "labelColor": "#00ff00",
                "labelName": "Task"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated_label["label"]["name"], "Task");
    assert_eq!(updated_label["label"]["color"], "#00ff00");

    let deleted_label = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/labels/{label_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted_label["ok"], true);

    let deleted_category = ok_json(
        rest(
            app,
            Method::DELETE,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/labels/categories/{category_id}"
            ),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted_category["ok"], true);
}

#[tokio::test]
async fn rest_milestone_routes_manage_crud_and_state() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;

    let empty_title = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/milestones",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "title": "",
            "contentsMarkdown": "Missing title",
            "dueDate": "2026-05-09",
            "state": "open",
            "attachmentIds": []
        })),
    )
    .await;
    assert_eq!(empty_title.status(), StatusCode::BAD_REQUEST);
    assert!(response_text(empty_title)
        .await
        .contains("milestone.error.title"));

    let created = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/milestones",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "v1.0",
                "contentsMarkdown": "Ship **parity**",
                "dueDate": "2026-05-09",
                "state": "open",
                "attachmentIds": []
            })),
        )
        .await,
    )
    .await;
    let milestone_id = created["milestone"]["id"].as_str().unwrap();
    assert_eq!(created["milestone"]["title"], "v1.0");

    let listed = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/milestones?state=open&orderBy=dueDate&orderDir=asc",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(listed["milestones"].as_array().unwrap().len(), 1);

    let detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/milestones/{milestone_id}"),
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(detail["milestone"]["title"], "v1.0");

    let updated = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/milestones/{milestone_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "v1.0 patched",
                "contentsMarkdown": "Updated",
                "dueDate": "2026-05-11",
                "state": "closed",
                "attachmentIds": []
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["milestone"]["title"], "v1.0 patched");
    assert_eq!(updated["milestone"]["state"], "closed");

    let opened = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/milestones/{milestone_id}/state"
            ),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "state": "open" })),
        )
        .await,
    )
    .await;
    assert_eq!(opened["milestone"]["state"], "open");

    let deleted = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/milestones/{milestone_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted["ok"], true);

    let empty_list = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/milestones?state=all&orderBy=dueDate&orderDir=asc",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        empty_list["milestones"]
            .as_array()
            .map(Vec::len)
            .unwrap_or_default(),
        0
    );
}
