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

async fn ok_json(response: Response<Body>) -> serde_json::Value {
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
    cookie_header: &str,
    csrf: &str,
    payload: serde_json::Value,
) -> Response<Body> {
    app.oneshot(
        Request::builder()
            .method(Method::POST)
            .uri(uri)
            .header(http::header::CONTENT_TYPE, "application/json")
            .header(http::header::COOKIE, cookie_header)
            .header("x-csrf-token", csrf)
            .body(Body::from(payload.to_string()))
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    ok_json(
        rpc(
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
        .await,
    )
    .await;
    (csrf, cookie_header)
}

async fn create_organization_project(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    organization: &str,
    project: &str,
) {
    ok_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(cookie),
            Some(csrf),
            json!({
                "organizationName": organization,
                "description": "Board organization"
            }),
        )
        .await,
    )
    .await;
    ok_json(
        rpc(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": organization,
                "projectName": project,
                "overview": "Organization board project",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;
}

async fn create_project_in_existing_organization(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    organization: &str,
    project: &str,
) {
    ok_json(
        rpc(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": organization,
                "projectName": project,
                "overview": "Organization board project",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;
}

#[tokio::test]
async fn organization_board_contract_lists_visible_cross_project_posts_without_notice_pin() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_organization_project(app.clone(), &cookie, &csrf, "weblabs", "alpha").await;
    create_project_in_existing_organization(app.clone(), &cookie, &csrf, "weblabs", "beta").await;

    ok_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/projects/weblabs/alpha/posts",
            &cookie,
            &csrf,
            json!({
                "title": "Alpha notice",
                "bodyMarkdown": "Pinned but not separated on organization board",
                "notice": true
            }),
        )
        .await,
    )
    .await;
    ok_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/projects/weblabs/beta/posts",
            &cookie,
            &csrf,
            json!({
                "title": "Beta announcement",
                "bodyMarkdown": "Cross project board post"
            }),
        )
        .await,
    )
    .await;

    let all = ok_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/organizations/weblabs/boards?pageNum=1&orderBy=createdDate&orderDir=asc",
            Some(&cookie),
        )
        .await,
    )
    .await;
    assert_eq!(all["organizationName"], "weblabs");
    assert_eq!(all["pageNum"], 1);
    assert_eq!(all["pageSize"], 15);
    assert_eq!(all["totalCount"], 2);
    assert_eq!(all["items"].as_array().unwrap().len(), 2);
    assert_eq!(all["items"][0]["notice"], true);
    assert_eq!(all["items"][0]["projectName"], "alpha");
    assert_eq!(all["items"][1]["projectName"], "beta");
    assert!(all.get("notices").is_none());
    assert_eq!(all["visibleProjects"].as_array().unwrap().len(), 2);

    let filtered = ok_json(
        rest_get(
            app,
            "/yona/api/v1/organizations/weblabs/boards?projectNames[]=beta&filter=announcement&pageNum=1",
            Some(&cookie),
        )
        .await,
    )
    .await;
    assert_eq!(filtered["totalCount"], 1);
    assert_eq!(filtered["items"][0]["projectName"], "beta");
    assert_eq!(filtered["items"][0]["title"], "Beta announcement");
}
