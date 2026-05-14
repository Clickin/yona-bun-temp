use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

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

async fn rpc(
    app: axum::Router,
    method_name: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: serde_json::Value,
) -> Response<Body> {
    rest_test_support::pilot_rest(app, method_name, cookie_header, csrf, payload).await
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

async fn create_project(app: axum::Router, cookie: &str, csrf: &str, project_name: &str) {
    let response = rpc(
        app,
        "CreateProject",
        Some(cookie),
        Some(csrf),
        json!({
            "ownerName": "owner",
            "projectName": project_name,
            "overview": "label parity",
            "projectScope": "public"
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

async fn create_public_project(app: axum::Router, cookie: &str, csrf: &str) {
    create_project(app, cookie, csrf, "projectYobi").await;
}

#[tokio::test]
async fn issue_label_rpc_manages_labels_categories_and_cleanup() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_public_project(app.clone(), &cookie, &csrf).await;

    let created = response_json(
        rpc(
            app.clone(),
            "CreateProjectLabel",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "labelName": "Bug",
                "labelColor": "f44336",
                "categoryName": "Type",
                "categoryIsExclusive": true
            }),
        )
        .await,
    )
    .await;
    assert_eq!(created["created"], true);
    assert_eq!(created["label"]["name"], "Bug");
    assert_eq!(created["label"]["color"], "#f44336");
    assert_eq!(created["label"]["categoryName"], "Type");
    assert_eq!(created["label"]["categoryIsExclusive"], true);

    let duplicate = response_json(
        rpc(
            app.clone(),
            "CreateProjectLabel",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "labelName": "Bug",
                "labelColor": "#f44336",
                "categoryName": "Type",
                "categoryIsExclusive": true
            }),
        )
        .await,
    )
    .await;
    assert!(!duplicate["created"].as_bool().unwrap_or(false));
    assert_eq!(duplicate["label"]["id"], created["label"]["id"]);

    let category_id = created["label"]["categoryId"].as_str().unwrap();
    let updated_category = response_json(
        rpc(
            app.clone(),
            "UpdateProjectLabelCategory",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "categoryId": category_id,
                "categoryName": "Kind",
                "categoryIsExclusive": false
            }),
        )
        .await,
    )
    .await;
    assert_eq!(updated_category["category"]["name"], "Kind");
    assert!(!updated_category["category"]["isExclusive"]
        .as_bool()
        .unwrap_or(false));

    let listed = response_json(
        rpc(
            app.clone(),
            "ListProjectLabels",
            None,
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(listed["labels"].as_array().unwrap().len(), 1);
    assert_eq!(listed["labels"][0]["categoryName"], "Kind");

    let deleted = response_json(
        rpc(
            app.clone(),
            "DeleteProjectLabel",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "labelId": created["label"]["id"].as_str().unwrap()
            }),
        )
        .await,
    )
    .await;
    assert_eq!(deleted["ok"], true);

    let categories = response_json(
        rpc(
            app,
            "ListProjectLabelCategories",
            None,
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi"
            }),
        )
        .await,
    )
    .await;
    assert!(categories["categories"]
        .as_array()
        .map(Vec::is_empty)
        .unwrap_or(true));
}

#[tokio::test]
async fn issue_label_copy_appends_missing_labels_from_readable_project() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "projectYobi").await;
    create_project(app.clone(), &cookie, &csrf, "sourceYobi").await;

    let existing = response_json(
        rpc(
            app.clone(),
            "CreateProjectLabel",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "labelName": "Bug",
                "labelColor": "222222",
                "categoryName": "Type",
                "categoryIsExclusive": false
            }),
        )
        .await,
    )
    .await;
    assert_eq!(existing["created"], true);

    let source_bug = response_json(
        rpc(
            app.clone(),
            "CreateProjectLabel",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "sourceYobi",
                "labelName": "Bug",
                "labelColor": "111111",
                "categoryName": "Type",
                "categoryIsExclusive": true
            }),
        )
        .await,
    )
    .await;
    assert_eq!(source_bug["created"], true);

    let source_feature = response_json(
        rpc(
            app.clone(),
            "CreateProjectLabel",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "sourceYobi",
                "labelName": "Feature",
                "labelColor": "00aa00",
                "categoryName": "Type",
                "categoryIsExclusive": true
            }),
        )
        .await,
    )
    .await;
    assert_eq!(source_feature["created"], true);

    let copied = response_json(
        app.clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/yona/api/v1/owners/owner/projects/projectYobi/labels/copy")
                    .header(http::header::COOKIE, &cookie)
                    .header("x-csrf-token", &csrf)
                    .header(http::header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"sourceOwnerName":"owner","sourceProjectName":"sourceYobi"}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap(),
    )
    .await;
    assert_eq!(copied["copied"], 1);
    assert_eq!(copied["skipped"], 1);

    let listed = response_json(
        rpc(
            app.clone(),
            "ListProjectLabels",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi"
            }),
        )
        .await,
    )
    .await;
    let labels = listed["labels"].as_array().unwrap();
    assert_eq!(labels.len(), 2);
    assert!(labels
        .iter()
        .any(|label| label["name"] == "Bug" && label["color"] == "#222222"));
    assert!(labels
        .iter()
        .any(|label| label["name"] == "Feature" && label["color"] == "#00aa00"));

    let legacy_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/owner/projectYobi/copyLabels")
                .header(http::header::COOKIE, &cookie)
                .header("x-csrf-token", &csrf)
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from("owner=owner&projectName=sourceYobi"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(legacy_response.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        legacy_response
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/owner/projectYobi/issue/labelsform")
    );
}

#[tokio::test]
async fn issue_label_legacy_routes_preserve_json_form_css_and_method_override() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_public_project(app.clone(), &cookie, &csrf).await;

    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/owner/projectYobi/issue/labels")
                .header(http::header::COOKIE, &cookie)
                .header("x-csrf-token", &csrf)
                .header(http::header::ACCEPT, "application/json")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from(
                    "labelName=UI&labelColor=111111&categoryName=Area&categoryIsExclusive=false",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_response.status(), StatusCode::CREATED);
    let created: serde_json::Value =
        serde_json::from_str(&response_text(create_response).await).unwrap();
    assert_eq!(created["name"], "UI");

    let css_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/owner/projectYobi/issue/labels.css")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(css_response.status(), StatusCode::OK);
    assert_eq!(
        css_response
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("text/css")
    );
    let css = response_text(css_response).await;
    assert!(css.contains(".issue-label[data-label-id=\""));
    assert!(css.contains("background-color: #111111;"));
    assert!(css.contains("color: white;"));

    let duplicate_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/owner/projectYobi/issue/labels")
                .header(http::header::COOKIE, &cookie)
                .header("x-csrf-token", &csrf)
                .header(http::header::ACCEPT, "application/json")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from(
                    "labelName=UI&labelColor=111111&categoryName=Area&categoryIsExclusive=false",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(duplicate_response.status(), StatusCode::NO_CONTENT);

    let label_id = created["id"].as_str().unwrap();
    let delete_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "/yona/owner/projectYobi/issue/label/{label_id}/delete"
                ))
                .header(http::header::COOKIE, &cookie)
                .header("x-csrf-token", &csrf)
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from("_method=delete"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(delete_response.status(), StatusCode::OK);
}
