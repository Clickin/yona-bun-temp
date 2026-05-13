use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::{json, Value};
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

async fn build_app_with_repository() -> axum::Router {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db);
    create_router_with_app_repository(
        RuntimeConfig {
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo,
    )
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

async fn error_json(response: axum::response::Response, expected_status: StatusCode) -> Value {
    let status = response.status();
    let text = response_text(response).await;
    assert_eq!(status, expected_status, "{text}");
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

async fn create_project(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    project_name: &str,
    scope: &str,
) {
    let response = rpc(
        app,
        "CreateProject",
        Some(cookie),
        Some(csrf),
        json!({
            "ownerName": "owner",
            "projectName": project_name,
            "overview": "watchers parity",
            "projectScope": scope
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

async fn watch_project(app: axum::Router, cookie: &str, csrf: &str, project_name: &str) {
    let watched = ok_json(
        rest(
            app,
            Method::POST,
            &format!("/yona/api/v1/owners/owner/projects/{project_name}/watch"),
            Some(cookie),
            Some(csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(watched["isWatching"], true);
}

#[tokio::test]
async fn rest_project_watchers_lists_public_project_actual_watchers() {
    let app = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (alice_csrf, alice_cookie) = register_user(app.clone(), "alice").await;
    let (bob_csrf, bob_cookie) = register_user(app.clone(), "bob").await;
    let (_charlie_csrf, _charlie_cookie) = register_user(app.clone(), "charlie").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "projectYobi",
        "public",
    )
    .await;

    watch_project(app.clone(), &bob_cookie, &bob_csrf, "projectYobi").await;
    watch_project(app.clone(), &alice_cookie, &alice_csrf, "projectYobi").await;

    let body = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/watchers",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    let watchers = body["watchers"].as_array().expect("watchers array");
    assert_eq!(watchers.len(), 2);
    assert_eq!(watchers[0]["loginId"], "alice");
    assert_eq!(watchers[0]["userLabel"], "alice");
    assert!(watchers[0]["avatarUrl"]
        .as_str()
        .is_some_and(|url| url.contains("gravatar.com/avatar")));
    assert_eq!(watchers[1]["loginId"], "bob");
    assert_eq!(watchers[1]["userLabel"], "bob");
}

#[tokio::test]
async fn rest_project_watchers_respects_read_permission_and_missing_project() {
    let app = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "privateYobi",
        "private",
    )
    .await;
    watch_project(app.clone(), &owner_cookie, &owner_csrf, "privateYobi").await;

    let forbidden = error_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/privateYobi/watchers",
            None,
            None,
            None,
        )
        .await,
        StatusCode::FORBIDDEN,
    )
    .await;
    assert_eq!(forbidden["error"]["code"], "forbidden");

    let missing = error_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/missing/watchers",
            None,
            None,
            None,
        )
        .await,
        StatusCode::NOT_FOUND,
    )
    .await;
    assert_eq!(missing["error"]["code"], "not_found");
}

#[tokio::test]
async fn rest_project_watchers_filters_watchers_without_current_read_access() {
    let app = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "projectYobi",
        "public",
    )
    .await;
    watch_project(app.clone(), &owner_cookie, &owner_csrf, "projectYobi").await;
    watch_project(app.clone(), &guest_cookie, &guest_csrf, "projectYobi").await;

    let updated = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/owners/owner/projects/projectYobi",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "overview": "watchers parity",
                "projectName": "projectYobi",
                "projectScope": "private",
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["projectScope"], "private");

    let body = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/watchers",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    let watchers = body["watchers"].as_array().expect("watchers array");
    assert_eq!(watchers.len(), 1);
    assert_eq!(watchers[0]["loginId"], "owner");
}
