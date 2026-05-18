use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::{json, Value};
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

async fn build_app_with_repository() -> axum::Router {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    create_router_with_app_repository(
        RuntimeConfig {
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        AppRepository::new(db),
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
    cookie_header: &str,
    csrf: &str,
    payload: Value,
) -> axum::response::Response {
    app.oneshot(
        Request::builder()
            .method(Method::POST)
            .uri(format!("/yona/api/v1/_pilot/{method_name}"))
            .header(http::header::COOKIE, cookie_header)
            .header("x-csrf-token", csrf)
            .header(http::header::CONTENT_TYPE, "application/json")
            .body(Body::from(payload.to_string()))
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
        &cookie_header,
        &csrf,
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

async fn create_project(app: axum::Router, cookie_header: &str, csrf: &str) {
    let response = rpc(
        app,
        "CreateProject",
        cookie_header,
        csrf,
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "overview": "markdown parity",
            "projectScope": "public"
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn legacy_markdown_renderer_route_returns_project_context_html() {
    let app = build_app_with_repository().await;
    let (csrf, cookie_header) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie_header, &csrf).await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/markdown/owner/projectYobi")
                .header(http::header::COOKIE, &cookie_header)
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({
                        "body": "Hello @owner #1 http://example.com\n<script>alert(1)</script>",
                        "breaks": true
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let content_type = response
        .headers()
        .get(http::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    let html = response_text(response).await;

    assert!(
        content_type.starts_with("text/html"),
        "legacy markdown renderer should return raw HTML, got {content_type}: {html}"
    );
    assert!(html.contains("Hello "), "{html}");
    assert!(
        html.contains(r#"href="/yona/owner" class="no-text-decoration user-link">"#),
        "{html}"
    );
    assert!(
        html.contains(r#"href="/yona/owner/projectYobi/issue/1" class="issueLink">#1</a>"#),
        "{html}"
    );
    assert!(
        html.contains(r#"<a href="http://example.com">http://example.com</a>"#),
        "{html}"
    );
    assert!(!html.contains("<script>"), "{html}");
}

#[tokio::test]
async fn legacy_markdown_renderer_preserves_marked_soft_breaks() {
    let app = build_app_with_repository().await;
    let (csrf, cookie_header) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie_header, &csrf).await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/markdown/owner/projectYobi")
                .header(http::header::COOKIE, &cookie_header)
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({
                        "body": "first line\nsecond line",
                        "breaks": true
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let html = response_text(response).await;
    assert!(html.contains("first line<br"), "{html}");
    assert!(html.contains("second line"), "{html}");
}
