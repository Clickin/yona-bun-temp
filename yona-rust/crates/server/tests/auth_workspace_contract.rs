use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ActiveModelTrait, Database, DatabaseConnection, EntityTrait, NotSet, Set};
use std::sync::{Mutex, OnceLock};
use tower::ServiceExt;
use yona_rust_persistence::{
    email, n4user, user_project_notification, watch, AppRepository, CreateProjectInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

fn auth_env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

async fn build_auth_router() -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());

    (
        create_router_with_app_repository(
            RuntimeConfig {
                base_path: "/yona".to_string(),
                public_origin: String::new(),
            },
            app_repo.clone(),
        ),
        app_repo,
        db,
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
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");
    std::env::remove_var("YONA_AUTH_SOCIAL_LOGIN_ONLY");

    let (app, _, _) = build_auth_router().await;

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
async fn read_auth_ui_capabilities_reflects_runtime_env_flags() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::set_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM", "true");
    std::env::set_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED", "true");
    std::env::set_var("YONA_AUTH_SOCIAL_LOGIN_ONLY", "true");

    let (app, _, _) = build_auth_router().await;

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

    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");
    std::env::remove_var("YONA_AUTH_SOCIAL_LOGIN_ONLY");

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    let payload: serde_json::Value = serde_json::from_str(&json).unwrap();
    assert_eq!(
        payload
            .get("emailVerificationEnabled")
            .and_then(|value| value.as_bool()),
        Some(true)
    );
    assert_eq!(
        payload
            .get("signupRequireConfirm")
            .and_then(|value| value.as_bool()),
        Some(true)
    );
    assert_eq!(
        payload
            .get("socialLoginOnly")
            .and_then(|value| value.as_bool()),
        Some(true)
    );
}

#[tokio::test]
async fn register_sign_in_sign_out_and_current_session_round_trip() {
    let (app, _, _) = build_auth_router().await;
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
    let (app, repository, db) = build_auth_router().await;
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
        .clone()
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

    let user = repository
        .find_user_by_identifier("door")
        .await
        .unwrap()
        .expect("registered user");
    let project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "admin".to_string(),
            overview: Some("Yona project".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
        })
        .await
        .unwrap();

    let user_model = n4user::Entity::find_by_id(user.id)
        .one(&db)
        .await
        .unwrap()
        .expect("user row");
    let mut user_active = n4user::ActiveModel::from(user_model);
    user_active.token = Set(Some("door-token".to_string()));
    user_active.update(&db).await.unwrap();

    email::ActiveModel {
        id: NotSet,
        user_id: Set(Some(user.id)),
        email: Set(Some("alt@example.com".to_string())),
        valid: Set(Some(1)),
        token: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    email::ActiveModel {
        id: NotSet,
        user_id: Set(Some(user.id)),
        email: Set(Some("pending@example.com".to_string())),
        valid: Set(Some(0)),
        token: Set(Some("mail-token".to_string())),
    }
    .insert(&db)
    .await
    .unwrap();
    watch::ActiveModel {
        id: NotSet,
        user_id: Set(Some(user.id)),
        resource_type: Set(Some("PROJECT".to_string())),
        resource_id: Set(Some(project.id.to_string())),
    }
    .insert(&db)
    .await
    .unwrap();
    user_project_notification::ActiveModel {
        id: NotSet,
        user_id: Set(Some(user.id)),
        project_id: Set(Some(project.id)),
        notification_type: Set(Some("NEW_ISSUE".to_string())),
        allowed: Set(Some(1)),
    }
    .insert(&db)
    .await
    .unwrap();

    let enriched_overview = app
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
    assert_eq!(enriched_overview.status(), StatusCode::OK);
    let enriched_body = enriched_overview.into_body().collect().await.unwrap().to_bytes();
    let enriched_json = String::from_utf8(enriched_body.to_vec()).unwrap();
    let enriched_payload: serde_json::Value = serde_json::from_str(&enriched_json).unwrap();
    assert!(enriched_json.contains("\"apiToken\":\"door-token\""));
    assert!(enriched_json.contains("\"emails\":["));
    assert!(enriched_json.contains("\"emailAddress\":\"alt@example.com\""));
    assert!(enriched_json.contains("\"emailAddress\":\"pending@example.com\""));
    assert!(enriched_json.contains("\"watchedProjects\":["));
    assert!(enriched_json.contains(&format!("\"projectId\":\"{}\"", project.id)));
    assert!(enriched_json.contains("\"projectName\":\"projectYobi\""));
    assert!(enriched_json.contains("\"eventType\":\"NEW_ISSUE\""));

    let watched_projects = enriched_payload
        .get("watchedProjects")
        .and_then(|value| value.as_array())
        .expect("watched projects array");
    let first_project = watched_projects.first().expect("watched project");
    let notifications = first_project
        .get("notifications")
        .and_then(|value| value.as_array())
        .expect("notifications array");
    let new_comment = notifications
        .iter()
        .find(|value| value.get("eventType").and_then(|field| field.as_str()) == Some("NEW_COMMENT"))
        .expect("NEW_COMMENT notification");
    assert_eq!(
        new_comment
            .get("enabled")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        false
    );
}
