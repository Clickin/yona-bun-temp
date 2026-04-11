use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

async fn build_app() -> axum::Router {
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

async fn register_user(app: axum::Router, cookie_header: &str, csrf: &str, login_id: &str) {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from(format!(
                    "{{\"loginId\":\"{login_id}\",\"name\":\"{login_id}\",\"emailAddress\":\"{login_id}@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

async fn create_organization(
    app: axum::Router,
    cookie_header: &str,
    csrf: &str,
    organization_name: &str,
    description: &str,
) {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/CreateOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from(format!(
                    "{{\"organizationName\":\"{organization_name}\",\"description\":\"{description}\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

async fn create_project(
    app: axum::Router,
    cookie_header: &str,
    csrf: &str,
    owner_name: &str,
    project_name: &str,
    overview: &str,
    project_scope: &str,
) {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/CreateProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from(format!(
                    "{{\"ownerName\":\"{owner_name}\",\"projectName\":\"{project_name}\",\"overview\":\"{overview}\",\"projectScope\":\"{project_scope}\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn organization_and_project_settings_contracts_require_expected_authority() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    let create_org = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/CreateOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"organizationName\":\"weblabs\",\"description\":\"web labs\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_org.status(), StatusCode::OK);

    let detail = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadOrganizationDetail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(detail.status(), StatusCode::OK);

    let anonymous_settings = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadOrganizationSettings")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(anonymous_settings.status(), StatusCode::UNAUTHORIZED);

    let authorized_settings = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadOrganizationSettings")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(authorized_settings.status(), StatusCode::OK);

    let create_project = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/CreateProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from("{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\",\"overview\":\"Yona\",\"projectScope\":\"public\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_project.status(), StatusCode::OK);

    let guest_settings = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadProjectSettings")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(guest_settings.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn project_detail_enrollment_favorites_recent_and_workspace_overview_round_trip() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    let create_project = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/CreateProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from("{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\",\"overview\":\"Yona\",\"projectScope\":\"public\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_project.status(), StatusCode::OK);

    let first_detail = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadProjectDetail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(first_detail.status(), StatusCode::OK);

    let enroll = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/EnrollProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(enroll.status(), StatusCode::OK);

    let favorite = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ToggleFavoriteProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(favorite.status(), StatusCode::OK);

    let overview = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadWorkspaceOverview")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(overview.status(), StatusCode::OK);
    let body = overview.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"favoriteProjects\":["));
    assert!(json.contains("\"recentProjects\":["));
    assert!(json.contains("\"ownerName\":\"admin\""));
    assert!(json.contains("\"projectName\":\"projectYobi\""));

    let cancel = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/CancelEnrollProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(cancel.status(), StatusCode::OK);
}

#[tokio::test]
async fn organization_container_contract_returns_project_cards_and_gated_rosters() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    create_organization(app.clone(), &admin_cookie, &admin_csrf, "weblabs", "web labs").await;
    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "projectYobi",
        "Wave 2A home",
        "public",
    )
    .await;

    let anonymous_container = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadOrganizationContainer")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(anonymous_container.status(), StatusCode::OK);

    let anonymous_json = String::from_utf8(
        anonymous_container
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap();
    assert!(anonymous_json.contains("\"organizationName\":\"weblabs\""));
    assert!(!anonymous_json.contains("\"viewerCanUpdate\":true"));
    assert!(!anonymous_json.contains("\"viewerCanCreateProject\":true"));
    assert!(!anonymous_json.contains("\"adminMembers\":[{"));
    assert!(!anonymous_json.contains("\"memberMembers\":[{"));
    assert!(anonymous_json.contains("\"visibleProjects\":["));

    let admin_container = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadOrganizationContainer")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(admin_container.status(), StatusCode::OK);

    let admin_json = String::from_utf8(
        admin_container
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap();
    assert!(admin_json.contains("\"viewerCanUpdate\":true"));
    assert!(admin_json.contains("\"viewerCanCreateProject\":true"));
    assert!(admin_json.contains("\"ownerName\":\"weblabs\""));
    assert!(admin_json.contains("\"projectName\":\"projectYobi\""));
}

#[tokio::test]
async fn project_container_contract_returns_header_menu_and_summary_shells() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Wave 2A home",
        "public",
    )
    .await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadProjectContainer")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = String::from_utf8(response.into_body().collect().await.unwrap().to_bytes().to_vec())
        .unwrap();
    assert!(json.contains("\"ownerName\":\"admin\""));
    assert!(json.contains("\"projectName\":\"projectYobi\""));
    assert!(json.contains("\"defaultTab\":\"readme\""));
    assert!(json.contains("\"showIssue\":"));
    assert!(json.contains("\"members\":["));
}

#[tokio::test]
async fn update_project_overview_returns_refreshed_project_container() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Before overview update",
        "public",
    )
    .await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/UpdateProjectOverview")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\",\"overview\":\"After overview update\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = String::from_utf8(response.into_body().collect().await.unwrap().to_bytes().to_vec())
        .unwrap();
    assert!(json.contains("\"overview\":\"After overview update\""));
}

#[tokio::test]
async fn toggle_project_watch_returns_refreshed_project_container() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Watchable project",
        "public",
    )
    .await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ToggleProjectWatch")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\",\"watching\":true}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = String::from_utf8(response.into_body().collect().await.unwrap().to_bytes().to_vec())
        .unwrap();
    assert!(json.contains("\"isWatching\":true"));
    assert!(json.contains("\"watchCount\":1"));
}
