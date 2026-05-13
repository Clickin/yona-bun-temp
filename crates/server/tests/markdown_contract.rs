use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use tower::ServiceExt;
use yona_rust_persistence::{AppRepository, CreateProjectInput};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

async fn build_app_with_repository() -> (axum::Router, AppRepository) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let repository = AppRepository::new(db);
    let app = create_router_with_app_repository(
        RuntimeConfig {
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        repository.clone(),
    );
    (app, repository)
}

async fn response_text(response: Response<Body>) -> String {
    String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .expect("response body")
            .to_bytes()
            .to_vec(),
    )
    .expect("utf8 response")
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
    let cookies = response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().split(';').next().unwrap())
        .collect::<Vec<_>>()
        .join("; ");
    (csrf, cookies)
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = rest_test_support::pilot_rest(
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
    repository: &AppRepository,
    owner_name: &str,
    project_name: &str,
    scope: &str,
) {
    repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: owner_name.to_string(),
            overview: Some("markdown parity".to_string()),
            project_name: project_name.to_string(),
            project_scope: scope.to_string(),
        })
        .await
        .expect("create project");
}

async fn post_markdown(app: axum::Router, owner: &str, project: &str) -> Response<Body> {
    app.oneshot(
        Request::builder()
            .method(Method::POST)
            .uri(format!("/yona/markdown/{owner}/{project}"))
            .header(http::header::CONTENT_TYPE, "application/json")
            .body(Body::from(
                json!({
                    "body": "Hello **Yona**\nline two <script>alert(1)</script>",
                    "breaks": true
                })
                .to_string(),
            ))
            .unwrap(),
    )
    .await
    .unwrap()
}

#[tokio::test]
async fn direct_markdown_preview_renders_legacy_html_for_readable_project() {
    let (app, repository) = build_app_with_repository().await;
    register_user(app.clone(), "owner").await;
    create_project(&repository, "owner", "publicYobi", "public").await;

    let response = post_markdown(app, "owner", "publicYobi").await;
    assert_eq!(response.status(), StatusCode::OK);
    let content_type = response
        .headers()
        .get(http::header::CONTENT_TYPE)
        .unwrap()
        .to_str()
        .unwrap();
    assert!(content_type.starts_with("text/html"), "{content_type}");
    let html = response_text(response).await;

    assert!(html.contains("<strong>Yona</strong>"), "{html}");
    assert!(html.contains("Hello <strong>Yona</strong><br"), "{html}");
    assert!(!html.contains("<script"), "{html}");
    assert!(!html.contains("alert(1)"), "{html}");
}

#[tokio::test]
async fn direct_markdown_preview_requires_project_read_access() {
    let (app, repository) = build_app_with_repository().await;
    register_user(app.clone(), "owner").await;
    create_project(&repository, "owner", "privateYobi", "private").await;

    let response = post_markdown(app, "owner", "privateYobi").await;
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}
