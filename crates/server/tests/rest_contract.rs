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
use yona_rust_persistence::{email, watch, AppRepository, CreateProjectInput};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router, create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

fn build_router() -> axum::Router {
    create_router(RuntimeConfig {
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

async fn ok_json(response: axum::response::Response) -> Value {
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
async fn rest_organization_routes_cover_directory_views_and_membership_mutations() {
    let (app, repository) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie) = register_user(app.clone(), "admin").await;
    let (_member_csrf, _member_cookie) = register_user(app.clone(), "member").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    let (_outsider_csrf, outsider_cookie) = register_user(app.clone(), "outsider").await;

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
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;

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
            "/yona/api/v1/owners/owner/projects/projectYobi",
            Some(&guest_cookie),
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
            Some(&guest_cookie),
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
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(favorited["favorited"], true);

    let watched = ok_json(
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
    assert_eq!(watched["isWatching"], true);
    assert_eq!(watched["watchCount"], 1);

    let unwatched = ok_json(
        rest(
            app,
            Method::DELETE,
            "/yona/api/v1/owners/owner/projects/projectYobi/watch",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(unwatched["isWatching"].as_bool().unwrap_or(false), false);
    assert_eq!(unwatched["watchCount"].as_u64().unwrap_or_default(), 0);
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
    assert_eq!(voted["voterCount"], 1);

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
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;

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
    assert_eq!(labels["labels"].as_array().unwrap().len(), 1);

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
