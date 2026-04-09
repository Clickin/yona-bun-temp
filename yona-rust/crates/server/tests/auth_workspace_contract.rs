use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

async fn build_auth_router() -> axum::Router {
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

#[tokio::test]
async fn read_auth_ui_capabilities_returns_local_password_flags() {
    let app = build_auth_router().await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadAuthUiCapabilities")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    let payload: serde_json::Value = serde_json::from_str(&json).unwrap();
    assert_ne!(
        payload
            .get("emailVerificationEnabled")
            .and_then(|value| value.as_bool()),
        Some(true)
    );
    assert_ne!(
        payload
            .get("signupRequireConfirm")
            .and_then(|value| value.as_bool()),
        Some(true)
    );
    assert_ne!(
        payload
            .get("socialLoginOnly")
            .and_then(|value| value.as_bool()),
        Some(true)
    );
}

#[tokio::test]
async fn register_sign_in_sign_out_and_current_session_round_trip() {
    let app = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let current = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadCurrentSession")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(current.status(), StatusCode::OK);
    let current_body = current.into_body().collect().await.unwrap().to_bytes();
    let current_json = String::from_utf8(current_body.to_vec()).unwrap();
    assert!(current_json.contains("\"loginId\":\"door\""));

    let sign_out = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/SignOut")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_out.status(), StatusCode::OK);

    let sign_in = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/SignInWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"identifier\":\"door\",\"password\":\"doorpass1\",\"rememberMe\":true}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_in.status(), StatusCode::OK);
}

#[tokio::test]
async fn workspace_overview_reads_and_updates_default_landing() {
    let app = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();

    let overview = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadWorkspaceOverview")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(overview.status(), StatusCode::OK);
    let overview_body = overview.into_body().collect().await.unwrap().to_bytes();
    let overview_json = String::from_utf8(overview_body.to_vec()).unwrap();
    assert!(overview_json.contains("\"loginId\":\"door\""));
    assert!(overview_json.contains("\"defaultLandingPath\":\"/me\""));

    let set_default = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/SetDefaultLandingPath")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"path\":\"/search?scope=global&pageSize=20\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(set_default.status(), StatusCode::OK);
    let set_default_body = set_default.into_body().collect().await.unwrap().to_bytes();
    let set_default_json = String::from_utf8(set_default_body.to_vec()).unwrap();
    assert!(
        set_default_json.contains("\"defaultLandingPath\":\"/search?pageSize=20&scope=global\"")
    );

    let invalid = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/SetDefaultLandingPath")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"path\":\"/login\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);
}
