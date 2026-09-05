// Legacy global label-typeahead contract (LabelApp.java:51-120,
// yona-original/conf/routes:205-206):
//
//   GET /labels?query=&category=&limit=
//   GET /categories?query=&limit=
//
// Anonymous (@AnonymousCheck on LabelApp), 406 unless Accept accepts
// application/json, 400 "No limit" without a limit, 200 JSON array of names
// with a `Content-Range: items <limit>/<total>` header exactly when total
// exceeds the limit. Categories clamp the limit to 1000 before paging.

use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use tower::ServiceExt;
use yoram_migration::Migrator;
use yoram_persistence::AppRepository;
use yoram_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

async fn build_app(allow_anonymous_access: bool) -> (axum::Router, AppRepository) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db);
    let app = create_router_with_app_repository(
        RuntimeConfig {
            allow_anonymous_access,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
    );
    (app, app_repo)
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

async fn get(
    app: axum::Router,
    uri: &str,
    accept: Option<&str>,
) -> Response<Body> {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(accept) = accept {
        builder = builder.header(http::header::ACCEPT, accept);
    }
    app.oneshot(builder.body(Body::empty()).unwrap()).await.unwrap()
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
    // Bootstrap an anonymous session first: the RPC boundary validates the
    // csrf token against it.
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
    let csrf = bootstrap_response
        .headers()
        .get("x-csrf-token")
        .unwrap()
        .to_str()
        .unwrap()
        .to_string();
    let session_cookie: Vec<String> = bootstrap_response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().split(';').next().unwrap().to_string())
        .collect();
    let session_cookie = session_cookie.join("; ");
    let response = rest_test_support::pilot_rest(
        app.clone(),
        "RegisterWithPassword",
        Some(&session_cookie),
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
    let cookies: Vec<String> = response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().split(';').next().unwrap().to_string())
        .collect();
    (csrf, cookies.join("; "))
}

async fn create_public_project(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    project_name: &str,
) {
    let response = rest_test_support::pilot_rest(
        app,
        "CreateProject",
        Some(cookie),
        Some(csrf),
        json!({
            "ownerName": "owner",
            "projectName": project_name,
            "overview": "label typeahead parity",
            "projectScope": "public"
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

// Seeds three labels across two categories on one project.
async fn seed_labels(repo: &AppRepository) {
    for (label_name, category_name) in [
        ("Guide", "Type"),
        ("Chore", "Type"),
        ("Blocking", "Priority"),
    ] {
        repo.attach_legacy_project_label(
            "owner",
            "projectYobi",
            Some(category_name),
            label_name,
        )
        .await
        .unwrap()
        .expect("project exists");
    }
}

async fn app_with_seeded_labels() -> axum::Router {
    let (app, repo) = build_app(true).await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_public_project(app.clone(), &cookie, &csrf, "projectYobi").await;
    seed_labels(&repo).await;
    app
}

#[tokio::test]
async fn labels_requires_json_accept() {
    let app = app_with_seeded_labels().await;
    let response = get(app, "/yona/labels?limit=1000", Some("text/html")).await;
    assert_eq!(response.status(), StatusCode::NOT_ACCEPTABLE);
}

#[tokio::test]
async fn labels_require_limit() {
    let app = app_with_seeded_labels().await;
    // Absent Accept means */* (accepted); the missing limit is what fails.
    let response = get(app.clone(), "/yona/labels", None).await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(response_text(response).await, "No limit");
    let response = get(app, "/yona/categories", Some("application/json")).await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn labels_lists_all_names_without_content_range_when_total_fits() {
    let app = app_with_seeded_labels().await;
    let response = get(app, "/yona/labels?limit=1000", Some("application/json")).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get(http::header::CONTENT_RANGE).is_none());
    let names = serde_json::from_str::<Vec<String>>(&response_text(response).await).unwrap();
    assert_eq!(names.len(), 3);
    assert!(names.contains(&"Guide".to_string()));
    assert!(names.contains(&"Chore".to_string()));
    assert!(names.contains(&"Blocking".to_string()));
}

#[tokio::test]
async fn labels_cap_rows_and_set_content_range_when_total_exceeds_limit() {
    let app = app_with_seeded_labels().await;
    let response = get(app, "/yona/labels?limit=2", Some("application/json")).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get(http::header::CONTENT_RANGE)
            .unwrap(),
        "items 2/3"
    );
    let names = serde_json::from_str::<Vec<String>>(&response_text(response).await).unwrap();
    assert_eq!(names.len(), 2);
}

#[tokio::test]
async fn labels_filter_by_icontains_name_and_category() {
    let app = app_with_seeded_labels().await;
    // icontains is case-insensitive on both name and category
    // (LabelApp.java:61 Expr.icontains).
    let response = get(app.clone(), "/yona/labels?query=GUIDE&limit=1000", Some("application/json")).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        serde_json::from_str::<Vec<String>>(&response_text(response).await).unwrap(),
        ["Guide"]
    );
    let response = get(app, "/yona/labels?category=priority&limit=1000", Some("application/json")).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        serde_json::from_str::<Vec<String>>(&response_text(response).await).unwrap(),
        ["Blocking"]
    );
}

#[tokio::test]
async fn categories_list_distinct_names_with_limit_clamp() {
    let app = app_with_seeded_labels().await;
    let response = get(app.clone(), "/yona/categories?limit=1000", Some("application/json")).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get(http::header::CONTENT_RANGE).is_none());
    let names = serde_json::from_str::<Vec<String>>(&response_text(response).await).unwrap();
    assert_eq!(names.len(), 2);
    assert!(names.contains(&"Type".to_string()));
    assert!(names.contains(&"Priority".to_string()));

    // Distinct total is 2, so limit=1 pages and emits Content-Range.
    let response = get(app, "/yona/categories?limit=1", Some("application/json")).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get(http::header::CONTENT_RANGE)
            .unwrap(),
        "items 1/2"
    );
    let names = serde_json::from_str::<Vec<String>>(&response_text(response).await).unwrap();
    assert_eq!(names.len(), 1);
}

#[tokio::test]
async fn endpoints_stay_anonymous_without_allow_anonymous_access() {
    // Legacy serves these anonymously (@AnonymousCheck on LabelApp), so the
    // paths must be public even when the global anonymous-access flag is off.
    let (app, repo) = build_app(false).await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_public_project(app.clone(), &cookie, &csrf, "projectYobi").await;
    seed_labels(&repo).await;

    let response = get(app, "/yona/labels?limit=1000", Some("application/json")).await;
    assert_eq!(response.status(), StatusCode::OK);
}
