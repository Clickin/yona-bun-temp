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
            "overview": "webhook parity",
            "projectScope": scope
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn rest_project_webhooks_manage_manager_crud() {
    let app = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "projectYobi",
        "public",
    )
    .await;

    let initial = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(initial["webhooks"].as_array().unwrap().len(), 0);
    assert_eq!(initial["permissions"]["canCreate"], true);
    assert_eq!(initial["permissions"]["canDelete"], true);

    let created = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "gitPush": true,
                "payloadUrl": "https://hooks.example.test/yona",
                "secret": "token-123",
                "webhookType": "DETAIL_SLACK",
            })),
        )
        .await,
    )
    .await;
    let webhooks = created["webhooks"].as_array().expect("webhooks array");
    assert_eq!(webhooks.len(), 1);
    let webhook_id = webhooks[0]["id"].as_i64().expect("webhook id");
    assert_eq!(webhooks[0]["payloadUrl"], "https://hooks.example.test/yona");
    assert_eq!(webhooks[0]["secret"], "token-123");
    assert_eq!(webhooks[0]["gitPush"], true);
    assert_eq!(webhooks[0]["webhookType"], "DETAIL_SLACK");

    let deleted = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/webhooks/{webhook_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted["webhooks"].as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn rest_project_webhooks_require_update_permission_and_validate_input() {
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

    let guest_list = error_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&guest_cookie),
            None,
            None,
        )
        .await,
        StatusCode::FORBIDDEN,
    )
    .await;
    assert_eq!(guest_list["error"]["code"], "forbidden");

    let missing_payload = error_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "",
                "secret": "token",
                "webhookType": "SIMPLE",
            })),
        )
        .await,
        StatusCode::BAD_REQUEST,
    )
    .await;
    assert_eq!(missing_payload["error"]["code"], "bad_request");

    let invalid_type = error_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example.test/yona",
                "webhookType": "UNKNOWN",
            })),
        )
        .await,
        StatusCode::BAD_REQUEST,
    )
    .await;
    assert_eq!(invalid_type["error"]["code"], "bad_request");

    let guest_create = error_json(
        rest(
            app,
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example.test/yona",
                "webhookType": "SIMPLE",
            })),
        )
        .await,
        StatusCode::FORBIDDEN,
    )
    .await;
    assert_eq!(guest_create["error"]["code"], "forbidden");
}

#[tokio::test]
async fn rest_project_webhooks_delete_is_project_scoped() {
    let app = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "projectYobi",
        "public",
    )
    .await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "otherYobi",
        "public",
    )
    .await;

    let created = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example.test/yona",
                "webhookType": "JSON",
            })),
        )
        .await,
    )
    .await;
    let webhook_id = created["webhooks"][0]["id"].as_i64().expect("webhook id");
    assert_eq!(created["webhooks"][0]["gitPush"], true);
    assert_eq!(created["webhooks"][0]["secret"], "");

    let wrong_project_delete = error_json(
        rest(
            app,
            Method::DELETE,
            &format!("/yona/api/v1/owners/owner/projects/otherYobi/webhooks/{webhook_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
        StatusCode::NOT_FOUND,
    )
    .await;
    assert_eq!(wrong_project_delete["error"]["code"], "not_found");
}
