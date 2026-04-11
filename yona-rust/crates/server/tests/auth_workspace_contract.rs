use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    entity::prelude::{DateTime, DateTimeUtc},
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, NotSet,
    QueryFilter, Set,
};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime};
use tower::ServiceExt;
use yona_rust_persistence::{
    assignee, comment_thread, email, issue, linked_account, n4user, project, pull_request, user_credential,
    user_project_notification, user_verification, watch, AppRepository, CreateProjectInput,
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

async fn response_text(response: axum::response::Response) -> String {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    String::from_utf8(body.to_vec()).unwrap()
}

fn days_ago_datetime(days: u64) -> DateTime {
    DateTimeUtc::from(SystemTime::now() - Duration::from_secs(days * 24 * 60 * 60)).naive_utc()
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
async fn register_requires_confirmation_session_when_signup_confirm_or_email_verification_is_enabled() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::set_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM", "true");

    let (app, _, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let register = app
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

    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");

    assert_eq!(register.status(), StatusCode::OK);
    let register_json = response_text(register).await;
    assert!(register_json.contains("\"isAnonymous\":true"));
}

#[tokio::test]
async fn register_sign_in_sign_out_and_current_session_round_trip() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");
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
async fn register_validation_is_detailed_while_sign_in_failure_stays_generic() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");
    let (app, _, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let short_password = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"admin\",\"name\":\"admin\",\"emailAddress\":\"admin@test.me\",\"password\":\"admin\",\"retypedPassword\":\"admin\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(short_password.status(), StatusCode::BAD_REQUEST);
    let short_password_json = response_text(short_password).await;
    assert!(short_password_json.contains("\"code\":\"invalid_argument\""));
    assert!(short_password_json.contains("Password must be at least 8 characters."));

    let mismatch = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"admin\",\"name\":\"admin\",\"emailAddress\":\"admin@test.me\",\"password\":\"adminpass\",\"retypedPassword\":\"adminpass2\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(mismatch.status(), StatusCode::BAD_REQUEST);
    let mismatch_json = response_text(mismatch).await;
    assert!(mismatch_json.contains("\"code\":\"invalid_argument\""));
    assert!(mismatch_json.contains("Passwords do not match."));

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"admin\",\"name\":\"admin\",\"emailAddress\":\"admin@test.me\",\"password\":\"adminpass\",\"retypedPassword\":\"adminpass\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let sign_in = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/SignInWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"identifier\":\"admin\",\"password\":\"wrongpass\",\"rememberMe\":true}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_in.status(), StatusCode::UNAUTHORIZED);
    let sign_in_json = response_text(sign_in).await;
    assert!(sign_in_json.contains("\"code\":\"unauthenticated\""));
    assert!(sign_in_json.contains("Invalid login ID, email, or password."));
}

#[tokio::test]
async fn direct_lost_password_and_reset_password_routes_round_trip() {
    let _guard = auth_env_lock().lock().unwrap();
    let (app, repository, db) = build_auth_router().await;
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

    let request_reset = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/lostPassword")
                .header(http::header::CONTENT_TYPE, "application/x-www-form-urlencoded")
                .body(Body::from("loginId=door&emailAddress=door%40example.com"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(request_reset.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        request_reset
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/lostPassword?requested=1")
    );

    let verification = user_verification::Entity::find()
        .one(&db)
        .await
        .unwrap()
        .expect("password reset verification");
    let reset_code = verification
        .verification_code
        .clone()
        .expect("verification code");

    let reset_password = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/resetPassword")
                .header(http::header::CONTENT_TYPE, "application/x-www-form-urlencoded")
                .body(Body::from(format!(
                    "hashString={reset_code}&password=renewpass1&retypedPassword=renewpass1"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(reset_password.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        reset_password
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/users/loginform?password=reset")
    );

    let user = repository
        .find_user_by_identifier("door")
        .await
        .unwrap()
        .expect("user after reset");
    assert!(bcrypt::verify("renewpass1", &user.password_hash).unwrap());
    assert!(user_verification::Entity::find().all(&db).await.unwrap().is_empty());
}

#[tokio::test]
async fn direct_email_validation_send_and_confirm_routes_round_trip() {
    let _guard = auth_env_lock().lock().unwrap();
    let (app, repository, db) = build_auth_router().await;
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

    let user = repository
        .find_user_by_identifier("door")
        .await
        .unwrap()
        .expect("registered user");
    repository
        .add_workspace_email_for_user(user.id, "pending@example.com")
        .await
        .unwrap();
    let email_before = email::Entity::find()
        .filter(email::Column::UserId.eq(Some(user.id)))
        .filter(email::Column::Email.eq(Some("pending@example.com".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("secondary email");
    let old_token = email_before.token.clone();

    let send_validation = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(&format!("/yona/user/email/sendValidationEmail/{}", email_before.id))
                .header(http::header::COOKIE, &cookie_header)
                .header(http::header::CONTENT_TYPE, "application/x-www-form-urlencoded")
                .body(Body::from(format!("csrfToken={csrf}")))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(send_validation.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        send_validation
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/user/editform/emails?validation=sent")
    );

    let email_after_send = email::Entity::find_by_id(email_before.id)
        .one(&db)
        .await
        .unwrap()
        .expect("email after send");
    assert_ne!(email_after_send.token, old_token);
    let token = email_after_send.token.clone().expect("validation token");

    let confirm_email = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(&format!(
                    "/yona/user/email/confirm/{}/{}",
                    email_after_send.id, token
                ))
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(confirm_email.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        confirm_email
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/user/editform/emails?confirmed=1")
    );

    let email_after_confirm = email::Entity::find_by_id(email_after_send.id)
        .one(&db)
        .await
        .unwrap()
        .expect("email after confirm");
    assert_eq!(email_after_confirm.valid, Some(1));
}

#[tokio::test]
async fn workspace_settings_mutations_round_trip_through_workspace_overview() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");
    let (app, repository, db) = build_auth_router().await;
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
    watch::ActiveModel {
        id: NotSet,
        user_id: Set(Some(user.id)),
        resource_type: Set(Some("PROJECT".to_string())),
        resource_id: Set(Some(project.id.to_string())),
    }
    .insert(&db)
    .await
    .unwrap();
    repository
        .record_recent_project_visit(user.id, "admin", "projectYobi")
        .await
        .unwrap();

    let updated_profile = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/UpdateProfile")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"name\":\"Door Updated\",\"email\":\"door-updated@example.com\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(updated_profile.status(), StatusCode::OK);
    let updated_profile_json = response_text(updated_profile).await;
    assert!(updated_profile_json.contains("\"userLabel\":\"Door Updated\""));
    assert!(updated_profile_json.contains("\"emailAddress\":\"door-updated@example.com\""));

    let added_email = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/AddWorkspaceEmail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"email\":\"alt@example.com\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(added_email.status(), StatusCode::OK);
    let added_email_json = response_text(added_email).await;
    assert!(added_email_json.contains("\"emailAddress\":\"alt@example.com\""));

    let alt_email = email::Entity::find()
        .filter(email::Column::UserId.eq(Some(user.id)))
        .filter(email::Column::Email.eq(Some("alt@example.com".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("alt email");

    let validation_sent = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/SendWorkspaceEmailValidation")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!("{{\"id\":\"{}\"}}", alt_email.id)))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(validation_sent.status(), StatusCode::OK);

    let mut alt_email_active =
        email::ActiveModel::from(email::Entity::find_by_id(alt_email.id).one(&db).await.unwrap().unwrap());
    alt_email_active.valid = Set(Some(1));
    alt_email_active.update(&db).await.unwrap();

    let set_main = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/SetMainWorkspaceEmail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!("{{\"id\":\"{}\"}}", alt_email.id)))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(set_main.status(), StatusCode::OK);
    let set_main_json = response_text(set_main).await;
    assert!(set_main_json.contains("\"emailAddress\":\"alt@example.com\""));

    let reset_token = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ResetApiToken")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(reset_token.status(), StatusCode::OK);
    let reset_token_json = response_text(reset_token).await;
    assert!(reset_token_json.contains("\"apiToken\":\""));

    let toggled_notification = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ToggleWorkspaceNotification")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!(
                    "{{\"projectId\":\"{}\",\"eventType\":\"NEW_COMMENT\"}}",
                    project.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(toggled_notification.status(), StatusCode::OK);
    let toggled_notification_json = response_text(toggled_notification).await;
    assert!(toggled_notification_json.contains("\"eventType\":\"NEW_COMMENT\""));
    assert!(toggled_notification_json.contains("\"enabled\":true"));

    let reset_visited = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ResetVisitedProjects")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(reset_visited.status(), StatusCode::OK);
    let reset_visited_json = response_text(reset_visited).await;
    assert!(!reset_visited_json.contains("\"recentProjects\":[{\""));

    let delete_old_main = email::Entity::find()
        .filter(email::Column::UserId.eq(Some(user.id)))
        .filter(email::Column::Email.eq(Some("door-updated@example.com".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("old main email row");
    let deleted_email = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/DeleteWorkspaceEmail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!("{{\"id\":\"{}\"}}", delete_old_main.id)))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(deleted_email.status(), StatusCode::OK);

    let changed_password = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ChangePassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"oldPassword\":\"doorpass1\",\"password\":\"doorpass2\",\"retypedPassword\":\"doorpass2\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(changed_password.status(), StatusCode::OK);
    let changed_password_json = response_text(changed_password).await;
    assert!(changed_password_json.contains("\"isAnonymous\":true"));

    let sign_in_new_password = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/SignInWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"identifier\":\"door\",\"password\":\"doorpass2\",\"rememberMe\":true}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_in_new_password.status(), StatusCode::OK);
}

#[tokio::test]
async fn toggle_workspace_notification_preserves_missing_forbidden_and_unwatched_statuses() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");
    let (app, repository, _) = build_auth_router().await;
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

    let public_project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "admin".to_string(),
            overview: Some("Public".to_string()),
            project_name: "publicProject".to_string(),
            project_scope: "public".to_string(),
        })
        .await
        .unwrap();
    let private_project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "admin".to_string(),
            overview: Some("Private".to_string()),
            project_name: "privateProject".to_string(),
            project_scope: "private".to_string(),
        })
        .await
        .unwrap();

    let missing = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ToggleWorkspaceNotification")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"projectId\":\"99999\",\"eventType\":\"NEW_ISSUE\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);

    let forbidden = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ToggleWorkspaceNotification")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!(
                    "{{\"projectId\":\"{}\",\"eventType\":\"NEW_ISSUE\"}}",
                    private_project.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let unwatched = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ToggleWorkspaceNotification")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!(
                    "{{\"projectId\":\"{}\",\"eventType\":\"NEW_ISSUE\"}}",
                    public_project.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(unwatched.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn workspace_overview_reads_and_updates_default_landing() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");
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
    let private_project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "secret".to_string(),
            overview: Some("Private project".to_string()),
            project_name: "hiddenYobi".to_string(),
            project_scope: "private".to_string(),
        })
        .await
        .unwrap();

    let user_model = n4user::Entity::find_by_id(user.id)
        .one(&db)
        .await
        .unwrap()
        .expect("user row");
    let mut user_active = n4user::ActiveModel::from(user_model);
    user_active.english_name = Set(Some("Door English".to_string()));
    user_active.token = Set(Some("door-token".to_string()));
    user_active.update(&db).await.unwrap();
    let project_model = project::Entity::find_by_id(project.id)
        .one(&db)
        .await
        .unwrap()
        .expect("project row");
    let mut project_active = project::ActiveModel::from(project_model);
    project_active.last_pushed_date = Set(Some(days_ago_datetime(1)));
    project_active.update(&db).await.unwrap();
    let issue_assignee = assignee::ActiveModel {
        id: NotSet,
        user_id: Set(Some(user.id)),
        project_id: Set(Some(project.id)),
    }
    .insert(&db)
    .await
    .unwrap();

    repository
        .add_project_membership(project.id, user.id, "member")
        .await
        .unwrap();

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
    let credential = user_credential::ActiveModel {
        id: NotSet,
        user_id: Set(Some(user.id)),
        login_id: Set(Some("door".to_string())),
        email: Set(Some("door@example.com".to_string())),
        name: Set(Some("Door".to_string())),
        active: Set(Some(1)),
        email_validated: Set(Some(1)),
        image: Set(None),
        created_at: Set(None),
        updated_at: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    linked_account::ActiveModel {
        id: NotSet,
        user_credential_id: Set(Some(credential.id)),
        provider_user_id: Set(Some("door-github".to_string())),
        provider_key: Set(Some("github".to_string())),
        provider_display_name: Set(Some("GitHub".to_string())),
        avatar_url: Set(None),
        password: Set(None),
        access_token_expires_at: Set(None),
        refresh_token_expires_at: Set(None),
        scope: Set(None),
        created_at: Set(None),
        updated_at: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    linked_account::ActiveModel {
        id: NotSet,
        user_credential_id: Set(Some(credential.id)),
        provider_user_id: Set(Some("door-google".to_string())),
        provider_key: Set(Some("google".to_string())),
        provider_display_name: Set(Some("Google".to_string())),
        avatar_url: Set(None),
        password: Set(None),
        access_token_expires_at: Set(None),
        refresh_token_expires_at: Set(None),
        scope: Set(None),
        created_at: Set(None),
        updated_at: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Fix login redirect".to_string())),
        created_date: Set(None),
        updated_date: Set(Some(days_ago_datetime(2))),
        author_id: Set(Some(user.id)),
        author_login_id: Set(Some("door".to_string())),
        author_name: Set(Some("Door".to_string())),
        project_id: Set(Some(project.id)),
        number: Set(Some(7)),
        num_of_comments: Set(Some(3)),
        state: Set(Some(0)),
        due_date: Set(None),
        milestone_id: Set(None),
        assignee_id: Set(Some(issue_assignee.id)),
        parent_id: Set(None),
        weight: Set(None),
        updated_by_author_id: Set(None),
        is_draft: Set(Some(0)),
    }
    .insert(&db)
    .await
    .unwrap();
    issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Close the stale issue".to_string())),
        created_date: Set(None),
        updated_date: Set(Some(days_ago_datetime(3))),
        author_id: Set(Some(user.id)),
        author_login_id: Set(Some("door".to_string())),
        author_name: Set(Some("Door".to_string())),
        project_id: Set(Some(project.id)),
        number: Set(Some(3)),
        num_of_comments: Set(Some(0)),
        state: Set(Some(1)),
        due_date: Set(None),
        milestone_id: Set(None),
        assignee_id: Set(None),
        parent_id: Set(None),
        weight: Set(None),
        updated_by_author_id: Set(None),
        is_draft: Set(Some(0)),
    }
    .insert(&db)
    .await
    .unwrap();
    issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Stale issue should stay hidden".to_string())),
        created_date: Set(None),
        updated_date: Set(Some(days_ago_datetime(30))),
        author_id: Set(Some(user.id)),
        author_login_id: Set(Some("door".to_string())),
        author_name: Set(Some("Door".to_string())),
        project_id: Set(Some(project.id)),
        number: Set(Some(11)),
        num_of_comments: Set(Some(0)),
        state: Set(Some(0)),
        due_date: Set(None),
        milestone_id: Set(None),
        assignee_id: Set(None),
        parent_id: Set(None),
        weight: Set(None),
        updated_by_author_id: Set(None),
        is_draft: Set(Some(0)),
    }
    .insert(&db)
    .await
    .unwrap();
    issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Private issue should stay hidden".to_string())),
        created_date: Set(None),
        updated_date: Set(Some(days_ago_datetime(2))),
        author_id: Set(Some(user.id)),
        author_login_id: Set(Some("door".to_string())),
        author_name: Set(Some("Door".to_string())),
        project_id: Set(Some(private_project.id)),
        number: Set(Some(13)),
        num_of_comments: Set(Some(0)),
        state: Set(Some(0)),
        due_date: Set(None),
        milestone_id: Set(None),
        assignee_id: Set(None),
        parent_id: Set(None),
        weight: Set(None),
        updated_by_author_id: Set(None),
        is_draft: Set(Some(0)),
    }
    .insert(&db)
    .await
    .unwrap();
    let open_pull_request = pull_request::ActiveModel {
        id: NotSet,
        title: Set(Some("Review queue".to_string())),
        to_project_id: Set(Some(project.id)),
        from_project_id: Set(Some(project.id)),
        to_branch: Set(Some("main".to_string())),
        from_branch: Set(Some("topic/login-redirect".to_string())),
        contributor_id: Set(Some(user.id)),
        receiver_id: Set(Some(user.id)),
        created: Set(None),
        updated: Set(Some(days_ago_datetime(1))),
        received: Set(None),
        state: Set(Some(0)),
        is_conflict: Set(Some(0)),
        is_merging: Set(Some(0)),
        last_commit_id: Set(None),
        merged_commit_id_from: Set(None),
        merged_commit_id_to: Set(None),
        number: Set(Some(4)),
    }
    .insert(&db)
    .await
    .unwrap();
    comment_thread::ActiveModel {
        dtype: Set("ReviewThread".to_string()),
        id: NotSet,
        author_id: Set(Some(user.id)),
        author_login_id: Set(Some("door".to_string())),
        author_name: Set(Some("Door".to_string())),
        state: Set(Some("open".to_string())),
        created_date: Set(Some(days_ago_datetime(1))),
        pull_request_id: Set(Some(open_pull_request.id)),
        project_id: Set(Some(project.id)),
        prev_commit_id: Set(None),
        commit_id: Set(None),
        path: Set(None),
        start_side: Set(None),
        start_line: Set(None),
        start_column: Set(None),
        end_side: Set(None),
        end_line: Set(None),
        end_column: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    comment_thread::ActiveModel {
        dtype: Set("ReviewThread".to_string()),
        id: NotSet,
        author_id: Set(Some(user.id)),
        author_login_id: Set(Some("door".to_string())),
        author_name: Set(Some("Door".to_string())),
        state: Set(Some("open".to_string())),
        created_date: Set(Some(days_ago_datetime(1))),
        pull_request_id: Set(Some(open_pull_request.id)),
        project_id: Set(Some(project.id)),
        prev_commit_id: Set(None),
        commit_id: Set(None),
        path: Set(None),
        start_side: Set(None),
        start_line: Set(None),
        start_column: Set(None),
        end_side: Set(None),
        end_line: Set(None),
        end_column: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    pull_request::ActiveModel {
        id: NotSet,
        title: Set(Some("Recently merged queue".to_string())),
        to_project_id: Set(Some(project.id)),
        from_project_id: Set(Some(project.id)),
        to_branch: Set(Some("main".to_string())),
        from_branch: Set(Some("topic/closed".to_string())),
        contributor_id: Set(Some(user.id)),
        receiver_id: Set(Some(user.id)),
        created: Set(None),
        updated: Set(Some(days_ago_datetime(4))),
        received: Set(None),
        state: Set(Some(2)),
        is_conflict: Set(Some(0)),
        is_merging: Set(Some(0)),
        last_commit_id: Set(None),
        merged_commit_id_from: Set(None),
        merged_commit_id_to: Set(None),
        number: Set(Some(5)),
    }
    .insert(&db)
    .await
    .unwrap();
    pull_request::ActiveModel {
        id: NotSet,
        title: Set(Some("Conflict review queue".to_string())),
        to_project_id: Set(Some(project.id)),
        from_project_id: Set(Some(project.id)),
        to_branch: Set(Some("main".to_string())),
        from_branch: Set(Some("topic/conflict".to_string())),
        contributor_id: Set(Some(user.id)),
        receiver_id: Set(Some(user.id)),
        created: Set(None),
        updated: Set(Some(days_ago_datetime(2))),
        received: Set(None),
        state: Set(Some(0)),
        is_conflict: Set(Some(1)),
        is_merging: Set(Some(0)),
        last_commit_id: Set(None),
        merged_commit_id_from: Set(None),
        merged_commit_id_to: Set(None),
        number: Set(Some(9)),
    }
    .insert(&db)
    .await
    .unwrap();
    pull_request::ActiveModel {
        id: NotSet,
        title: Set(Some("Old review queue".to_string())),
        to_project_id: Set(Some(project.id)),
        from_project_id: Set(Some(project.id)),
        to_branch: Set(Some("main".to_string())),
        from_branch: Set(Some("topic/old".to_string())),
        contributor_id: Set(Some(user.id)),
        receiver_id: Set(Some(user.id)),
        created: Set(None),
        updated: Set(Some(days_ago_datetime(30))),
        received: Set(None),
        state: Set(Some(0)),
        is_conflict: Set(Some(0)),
        is_merging: Set(Some(0)),
        last_commit_id: Set(None),
        merged_commit_id_from: Set(None),
        merged_commit_id_to: Set(None),
        number: Set(Some(6)),
    }
    .insert(&db)
    .await
    .unwrap();
    pull_request::ActiveModel {
        id: NotSet,
        title: Set(Some("Private review queue".to_string())),
        to_project_id: Set(Some(private_project.id)),
        from_project_id: Set(Some(private_project.id)),
        to_branch: Set(Some("main".to_string())),
        from_branch: Set(Some("topic/private".to_string())),
        contributor_id: Set(Some(user.id)),
        receiver_id: Set(Some(user.id)),
        created: Set(None),
        updated: Set(Some(days_ago_datetime(2))),
        received: Set(None),
        state: Set(Some(0)),
        is_conflict: Set(Some(0)),
        is_merging: Set(Some(0)),
        last_commit_id: Set(None),
        merged_commit_id_from: Set(None),
        merged_commit_id_to: Set(None),
        number: Set(Some(8)),
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
    assert!(enriched_json.contains("\"daysAgo\":14"));
    assert!(enriched_json.contains("\"emails\":["));
    assert!(enriched_json.contains("\"emailAddress\":\"alt@example.com\""));
    assert!(enriched_json.contains("\"emailAddress\":\"pending@example.com\""));
    assert!(enriched_json.contains("\"profile\":{"));
    assert!(enriched_json.contains("\"englishName\":\"Door English\""));
    assert!(enriched_json.contains("\"connectedSocialProviders\":[\"github\",\"google\"]"));
    assert!(enriched_json.contains("\"issueItems\":["));
    assert!(enriched_json.contains("\"title\":\"Fix login redirect\""));
    assert!(enriched_json.contains("\"title\":\"Close the stale issue\""));
    assert!(enriched_json.contains("\"authorLabel\":\"Door\""));
    assert!(enriched_json.contains("\"assigneeLabel\":\"Door\""));
    assert!(enriched_json.contains("\"commentCount\":3"));
    assert!(!enriched_json.contains("Stale issue should stay hidden"));
    assert!(!enriched_json.contains("Private issue should stay hidden"));
    assert!(enriched_json.contains("\"pullRequestItems\":["));
    assert!(enriched_json.contains("\"title\":\"Review queue\""));
    assert!(enriched_json.contains("\"title\":\"Recently merged queue\""));
    assert!(enriched_json.contains("\"title\":\"Conflict review queue\""));
    assert!(enriched_json.contains("\"contributorLabel\":\"Door\""));
    assert!(enriched_json.contains("\"receiverLabel\":\"Door\""));
    assert!(enriched_json.contains("\"commentCount\":2"));
    assert!(enriched_json.contains("\"state\":\"merged\""));
    assert!(enriched_json.contains("\"state\":\"conflict\""));
    assert!(!enriched_json.contains("Old review queue"));
    assert!(!enriched_json.contains("Private review queue"));
    assert!(enriched_json.contains("\"memberProjects\":["));
    assert!(enriched_json.contains("\"projectName\":\"projectYobi\""));
    assert!(enriched_json.contains("\"memberCount\":1"));
    assert!(enriched_json.contains("\"watchCount\":1"));
    assert!(enriched_json.contains("\"watchedProjects\":["));
    assert!(enriched_json.contains(&format!("\"projectId\":\"{}\"", project.id)));
    assert!(enriched_json.contains("\"projectName\":\"projectYobi\""));
    assert!(enriched_json.contains("\"eventType\":\"NEW_ISSUE\""));

    let watched_projects = enriched_payload
        .get("watchedProjects")
        .and_then(|value| value.as_array())
        .expect("watched projects array");
    let profile = enriched_payload.get("profile").expect("profile payload");
    assert!(
        profile
            .get("sinceLabel")
            .and_then(|value| value.as_str())
            .is_some_and(|value| !value.trim().is_empty())
    );
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
