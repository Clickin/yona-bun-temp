use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use tower::ServiceExt;
use yoram_persistence::AppRepository;
use yoram_migration::Migrator;
use yoram_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

// Covers the route-module split in crates/server/src/routes/issues/labels.rs.
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

fn json_id_string(value: &serde_json::Value) -> String {
    value
        .as_i64()
        .map(|id| id.to_string())
        .or_else(|| value.as_str().map(str::to_string))
        .expect("json id")
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

async fn create_public_project(app: axum::Router, cookie: &str, csrf: &str) {
    create_public_project_named(app, cookie, csrf, "projectYobi").await;
}

async fn create_public_project_named(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    project_name: &str,
) {
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

#[tokio::test]
// Guards issue route-owned label/category RPC/direct helpers, shared
// projections, and the service-snapshot project update guard.
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

    let category_id = json_id_string(&created["label"]["categoryId"]);
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
                "labelId": json_id_string(&created["label"]["id"])
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
async fn issue_label_legacy_routes_preserve_json_form_css_and_method_override() {
    // Guards route-utils-owned direct project update guard for label form routes.
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_public_project(app.clone(), &cookie, &csrf).await;
    create_public_project_named(app.clone(), &cookie, &csrf, "sourceLabels").await;

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
    assert_eq!(created["color"], "#111111");

    let source_label_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/owner/sourceLabels/issue/labels")
                .header(http::header::COOKIE, &cookie)
                .header("x-csrf-token", &csrf)
                .header(http::header::ACCEPT, "application/json")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from(
                    "labelName=Copied&labelColor=2196f3&categoryName=FromSource&categoryIsExclusive=true",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(source_label_response.status(), StatusCode::CREATED);

    let copy_response = app
        .clone()
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
                .body(Body::from("owner=owner&projectName=sourceLabels"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(copy_response.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        copy_response
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/owner/projectYobi/issue/labelsform")
    );

    let copied_labels_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/owner/projectYobi/issue/labels")
                .header(http::header::ACCEPT, "application/json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(copied_labels_response.status(), StatusCode::OK);
    let copied_labels: serde_json::Value =
        serde_json::from_str(&response_text(copied_labels_response).await).unwrap();
    assert!(copied_labels
        .as_array()
        .unwrap()
        .iter()
        .any(|label| label["name"] == "Copied" && label["category"] == "FromSource"));
    let categories_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/owner/projectYobi/issue/label/categories")
                .header(http::header::ACCEPT, "application/json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(categories_response.status(), StatusCode::OK);
    let categories: serde_json::Value =
        serde_json::from_str(&response_text(categories_response).await).unwrap();
    assert!(categories
        .as_array()
        .unwrap()
        .iter()
        .any(|category| category["name"] == "Area"));
    let area_category_id = categories
        .as_array()
        .unwrap()
        .iter()
        .find(|category| category["name"] == "Area")
        .map(|category| json_id_string(&category["id"]))
        .expect("area category id");
    let category_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/yona/owner/projectYobi/issue/label/category/{area_category_id}"
                ))
                .header(http::header::ACCEPT, "application/json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(category_response.status(), StatusCode::OK);
    let category: serde_json::Value =
        serde_json::from_str(&response_text(category_response).await).unwrap();
    assert_eq!(category["id"], area_category_id);
    assert_eq!(category["name"], "Area");
    assert_eq!(category["isExclusive"], "false");

    let missing_category_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/owner/projectYobi/issue/label/category/999999")
                .header(http::header::ACCEPT, "application/json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(missing_category_response.status(), StatusCode::NOT_FOUND);

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
    let css_etag = css_response
        .headers()
        .get(http::header::ETAG)
        .and_then(|value| value.to_str().ok())
        .expect("legacy label css etag")
        .to_string();
    let css = response_text(css_response).await;
    assert!(css.contains(".issue-label[data-label-id=\""));
    assert!(css.contains("box-shadow: inset 2px 0 0px #111111;"));
    assert!(css.contains("background-color: #111111;"));
    assert!(css.contains("color: white;"));

    let not_modified_css_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/owner/projectYobi/issue/labels.css")
                .header(http::header::IF_NONE_MATCH, css_etag.as_str())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(not_modified_css_response.status(), StatusCode::NOT_MODIFIED);
    assert_eq!(
        not_modified_css_response
            .headers()
            .get(http::header::ETAG)
            .and_then(|value| value.to_str().ok()),
        Some(css_etag.as_str())
    );
    assert!(response_text(not_modified_css_response).await.is_empty());

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

    let label_id = json_id_string(&created["id"]);
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
