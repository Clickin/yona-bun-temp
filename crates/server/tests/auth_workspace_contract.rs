use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    entity::prelude::{DateTime, DateTimeUtc},
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, NotSet, QueryFilter,
    Set,
};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tower::ServiceExt;
use yona_rust_integrations::{clear_test_outbox, snapshot_test_outbox};
use yona_rust_persistence::{
    assignee, attachment, comment_thread, email, issue, linked_account, n4user, project,
    pull_request, user_credential, user_project_notification, user_verification, watch,
    AppRepository, CreateOrganizationInput, CreateProjectInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router_with_repository_and_app_config,
    create_router_with_repository_and_filesystem_assets, AppRuntimeConfig, AuthUiConfig,
    RuntimeConfig,
};

// Workspace route-module ownership guard: the legacy `/info/leave/:owner/:project`
// project-leave handler lives with workspace routes, while the membership side effect
// is asserted by project_members_contract::leave_project_redirects_to_member_projects_after_removal.

fn auth_env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

async fn build_auth_router() -> (axum::Router, AppRepository, DatabaseConnection) {
    build_auth_router_with_anonymous_access(true).await
}

async fn build_auth_router_with_anonymous_access(
    allow_anonymous_access: bool,
) -> (axum::Router, AppRepository, DatabaseConnection) {
    build_auth_router_with_anonymous_access_and_app_config(
        allow_anonymous_access,
        AppRuntimeConfig::default(),
    )
    .await
}

async fn build_auth_router_with_anonymous_access_and_app_config(
    allow_anonymous_access: bool,
    app_config: AppRuntimeConfig,
) -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());

    (
        create_router_with_repository_and_app_config(
            RuntimeConfig {
                allow_anonymous_access,
                base_path: "/yona".to_string(),
                public_origin: String::new(),
            },
            app_repo.clone(),
            app_config,
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

fn set_cookie_headers(response: &axum::response::Response) -> Vec<String> {
    response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().to_string())
        .collect()
}

fn named_cookie<'a>(cookies: &'a [String], name: &str) -> &'a str {
    cookies
        .iter()
        .find(|cookie| cookie.starts_with(name))
        .map(String::as_str)
        .unwrap_or_else(|| panic!("missing {name} cookie in {cookies:?}"))
}

fn cookie_header_from_set_cookie_response(response: &axum::response::Response) -> String {
    set_cookie_headers(response)
        .iter()
        .map(|value| value.split(';').next().unwrap().to_string())
        .collect::<Vec<_>>()
        .join("; ")
}

fn days_ago_datetime(days: u64) -> DateTime {
    DateTimeUtc::from(SystemTime::now() - Duration::from_secs(days * 24 * 60 * 60)).naive_utc()
}

#[tokio::test]
async fn anonymous_access_disabled_redirects_pages_and_rejects_non_auth_rest() {
    let (_, repository, _) = build_auth_router_with_anonymous_access(false).await;

    repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "admin".to_string(),
            overview: Some("Public project".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();

    let asset_root = std::env::temp_dir().join(format!(
        "yona-auth-assets-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos()
    ));
    std::fs::create_dir_all(&asset_root).expect("asset root");
    std::fs::write(
        asset_root.join("index.html"),
        "<html><head></head><body>legacy auth shell</body></html>",
    )
    .expect("index html");
    let app = create_router_with_repository_and_filesystem_assets(
        RuntimeConfig {
            allow_anonymous_access: false,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        repository.clone(),
        asset_root,
    );

    let session = app
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
    assert_eq!(session.status(), StatusCode::OK);

    let capabilities = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/auth/capabilities")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(capabilities.status(), StatusCode::OK);

    for path in [
        "/yona/users/loginform",
        "/yona/users/signupform",
        "/yona/lostPassword",
        "/yona/resetPassword",
    ] {
        let public_auth_page = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri(path)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            public_auth_page.status(),
            StatusCode::OK,
            "{path} should remain reachable when anonymous access is disabled"
        );
    }

    let page = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/admin/projectYobi?tab=readme")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(page.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        page.headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/users/loginform?redirectUrl=%2Fadmin%2FprojectYobi")
    );

    let project_container = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi/container")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(project_container.status(), StatusCode::UNAUTHORIZED);
    let json: serde_json::Value =
        serde_json::from_str(&response_text(project_container).await).expect("error json");
    assert_eq!(json["error"]["code"], "unauthorized");
}

#[tokio::test]
async fn read_auth_ui_capabilities_returns_local_password_flags() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");
    std::env::remove_var("YONA_AUTH_SOCIAL_LOGIN_ONLY");
    std::env::remove_var("YONA_AUTH_SOCIAL_LOGIN_SUPPORT");

    let (app, _, _) = build_auth_router().await;

    let rest_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/auth/capabilities")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(rest_response.status(), StatusCode::OK);
    let rest_body = rest_response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let rest_payload: serde_json::Value = serde_json::from_slice(&rest_body).unwrap();

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadAuthUiCapabilities")
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
    assert_eq!(rest_payload, payload);
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
    assert!(payload
        .get("enabledSocialProviders")
        .and_then(|value| value.as_array())
        .map_or(true, |items| items.is_empty()));
}

#[tokio::test]
async fn read_auth_ui_capabilities_reflects_runtime_config_without_env_mutation() {
    let previous_signup_require_confirm = std::env::var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM").ok();
    let previous_email_verification = std::env::var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED").ok();
    let previous_social_login_only = std::env::var("YONA_AUTH_SOCIAL_LOGIN_ONLY").ok();
    let previous_social_login_support = std::env::var("YONA_AUTH_SOCIAL_LOGIN_SUPPORT").ok();
    let previous_login_id_placeholder = std::env::var("YONA_AUTH_LOGIN_ID_PLACEHOLDER").ok();
    let previous_password_placeholder = std::env::var("YONA_AUTH_PASSWORD_PLACEHOLDER").ok();

    let (app, _, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                email_verification_enabled: true,
                enabled_social_providers: vec!["github".to_string(), "google".to_string()],
                login_id_placeholder: "Use employee number".to_string(),
                password_placeholder: "Company password".to_string(),
                signup_require_confirm: true,
                social_login_only: true,
            },
            ..AppRuntimeConfig::default()
        },
    )
    .await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadAuthUiCapabilities")
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
    assert_eq!(
        payload
            .get("enabledSocialProviders")
            .and_then(|value| value.as_array())
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str())
                    .collect::<Vec<_>>()
            }),
        Some(vec!["github", "google"])
    );
    assert_eq!(
        payload
            .get("loginIdPlaceholder")
            .and_then(|value| value.as_str()),
        Some("Use employee number")
    );
    assert_eq!(
        payload
            .get("passwordPlaceholder")
            .and_then(|value| value.as_str()),
        Some("Company password")
    );
    assert_eq!(
        std::env::var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM").ok(),
        previous_signup_require_confirm
    );
    assert_eq!(
        std::env::var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED").ok(),
        previous_email_verification
    );
    assert_eq!(
        std::env::var("YONA_AUTH_SOCIAL_LOGIN_ONLY").ok(),
        previous_social_login_only
    );
    assert_eq!(
        std::env::var("YONA_AUTH_SOCIAL_LOGIN_SUPPORT").ok(),
        previous_social_login_support
    );
    assert_eq!(
        std::env::var("YONA_AUTH_LOGIN_ID_PLACEHOLDER").ok(),
        previous_login_id_placeholder
    );
    assert_eq!(
        std::env::var("YONA_AUTH_PASSWORD_PLACEHOLDER").ok(),
        previous_password_placeholder
    );
}

#[tokio::test]
// Guards auth redirect reuse of the route-utils-owned URI component encoder.
async fn legacy_authenticate_provider_redirects_to_unsupported_login_state() {
    let (app, _, _) = build_auth_router_with_anonymous_access(false).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/authenticate/github")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        response
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/users/loginform?error=unsupported&provider=github")
    );

    let encoded_provider = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/authenticate/git%20hub")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(encoded_provider.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        encoded_provider
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/users/loginform?error=unsupported&provider=git%20hub")
    );
}

#[tokio::test]
// Guards auth denied redirect reuse of the route-utils-owned URI component encoder.
async fn legacy_authenticate_provider_denied_redirects_to_login_error_state() {
    let (app, _, _) = build_auth_router_with_anonymous_access(false).await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/authenticate/github/denied")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        response
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/users/loginform?error=oauthDenied&provider=github")
    );
}

#[tokio::test]
// Guards auth route-owned session/sign-in/sign-out helpers plus auth capability, identifier, and error adapters.
async fn rest_auth_routes_round_trip_with_shared_session_and_error_envelope() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");

    let (app, _, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let capabilities = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/auth/capabilities")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(capabilities.status(), StatusCode::OK);
    let capabilities_payload: serde_json::Value =
        serde_json::from_str(&response_text(capabilities).await).unwrap();
    assert_ne!(
        capabilities_payload
            .get("socialLoginOnly")
            .and_then(|value| value.as_bool()),
        Some(true)
    );

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/register")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);
    let register_json = response_text(register).await;
    assert!(register_json.contains("\"loginId\":\"door\""));

    let current = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/session")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(current.status(), StatusCode::OK);
    let current_json = response_text(current).await;
    assert!(current_json.contains("\"loginId\":\"door\""));

    let verify = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/verify")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    "{\"loginId\":\"door\",\"verificationCode\":\"route-diet:missing\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(verify.status(), StatusCode::NOT_FOUND);
    let verify_json = response_text(verify).await;
    assert!(verify_json.contains("\"error\""));

    let sign_out = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-out")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_out.status(), StatusCode::OK);
    let sign_out_json = response_text(sign_out).await;
    assert!(sign_out_json.contains("\"isAnonymous\":true"));

    let sign_in = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
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
    let sign_in_json = response_text(sign_in).await;
    assert!(sign_in_json.contains("\"loginId\":\"door\""));

    let invalid_register = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/register")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"loginId\":\"bad\",\"name\":\"Bad\",\"emailAddress\":\"bad@example.com\",\"password\":\"bad\",\"retypedPassword\":\"bad\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(invalid_register.status(), StatusCode::BAD_REQUEST);
    let invalid_json: serde_json::Value =
        serde_json::from_str(&response_text(invalid_register).await).unwrap();
    assert_eq!(invalid_json["error"]["code"], "bad_request");
    assert_eq!(
        invalid_json["error"]["message"],
        "validation.tooShortPassword"
    );
    assert_eq!(invalid_json["error"]["status"], 400);
}

#[tokio::test]
async fn direct_legacy_login_and_signup_form_routes_accept_legacy_form_csrf_redirect_and_authenticate(
) {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");

    let (app, _, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let signup = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/users/signup")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::from(format!(
                    "csrfToken={csrf}&loginId=door&name=Door&email=door%40example.com&password=doorpass1&retypedPassword=doorpass1"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(signup.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        signup
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/me")
    );
    let signup_cookie_header = cookie_header_from_set_cookie_response(&signup);
    assert!(!signup_cookie_header.is_empty());

    let signed_up_session = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/session")
                .header(http::header::COOKIE, &signup_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(signed_up_session.status(), StatusCode::OK);
    assert!(response_text(signed_up_session)
        .await
        .contains("\"loginId\":\"door\""));

    let (login_csrf, login_cookie_header) = bootstrap(app.clone()).await;
    let login = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/users/login")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .header(http::header::COOKIE, &login_cookie_header)
                .body(Body::from(format!(
                    "csrfToken={login_csrf}&loginIdOrEmail=door&password=doorpass1&rememberMe=on&redirectUrl=%2Fprojects"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(login.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        login
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/projects")
    );
    let login_cookie_header = cookie_header_from_set_cookie_response(&login);
    assert!(!login_cookie_header.is_empty());

    let signed_in_session = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/session")
                .header(http::header::COOKIE, &login_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(signed_in_session.status(), StatusCode::OK);
    assert!(response_text(signed_in_session)
        .await
        .contains("\"loginId\":\"door\""));

    let (unsafe_csrf, unsafe_cookie_header) = bootstrap(app.clone()).await;
    let unsafe_redirect_login = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/users/login")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .header(http::header::COOKIE, &unsafe_cookie_header)
                .body(Body::from(format!(
                    "csrfToken={unsafe_csrf}&loginIdOrEmail=door&password=doorpass1&rememberMe=on&redirectUrl=https%3A%2F%2Fevil.example%2Fsteal"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(unsafe_redirect_login.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        unsafe_redirect_login
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/me")
    );
}

#[tokio::test]
async fn direct_legacy_logout_routes_clear_session_and_redirect_to_referer() {
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
                .uri("/yona/api/v1/auth/register")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let logout = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/users/logout")
                .header(http::header::COOKIE, &cookie_header)
                .header(http::header::REFERER, "/yona/me")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(logout.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        logout
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/me")
    );
    let logout_cookie_header = set_cookie_headers(&logout)
        .iter()
        .map(|value| value.split(';').next().unwrap().to_string())
        .collect::<Vec<_>>()
        .join("; ");
    assert!(!logout_cookie_header.is_empty());

    let current = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/session")
                .header(http::header::COOKIE, &logout_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(current.status(), StatusCode::OK);
    let current_json = response_text(current).await;
    assert!(current_json.contains("\"isAnonymous\":true"));

    let oauth_logout = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/logout")
                .header(http::header::COOKIE, &logout_cookie_header)
                .header(http::header::REFERER, "/yona/projects")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(oauth_logout.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        oauth_logout
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/projects")
    );
}

#[tokio::test]
// Guards the auth route-owned verify helper through REST verification.
async fn rest_verify_user_confirms_pending_signup() {
    let _guard = auth_env_lock().lock().unwrap();
    clear_test_outbox();

    let (app, _, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                email_verification_enabled: true,
                ..AuthUiConfig::default()
            },
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/register")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let verification = user_verification::Entity::find()
        .one(&db)
        .await
        .unwrap()
        .expect("signup verification");

    let verify = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/verify")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(format!(
                    "{{\"loginId\":\"door\",\"verificationCode\":\"{}\"}}",
                    verification.verification_code.unwrap_or_default()
                )))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(verify.status(), StatusCode::OK);
    let verify_json = response_text(verify).await;
    assert!(verify_json.contains("\"loginId\":\"door\""));
}

#[tokio::test]
async fn register_requires_confirmation_session_from_runtime_config_without_env_mutation() {
    clear_test_outbox();
    let previous_signup_require_confirm = std::env::var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM").ok();

    let (app, _, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                signup_require_confirm: true,
                ..AuthUiConfig::default()
            },
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let register = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(register.status(), StatusCode::OK);
    let register_json = response_text(register).await;
    assert!(register_json.contains("\"isAnonymous\":true"));
    let registered_user = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("door".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("registered user");
    assert_eq!(registered_user.state.as_deref(), Some("locked"));
    assert!(user_verification::Entity::find()
        .all(&db)
        .await
        .unwrap()
        .is_empty());
    assert!(snapshot_test_outbox().is_empty());
    assert_eq!(
        std::env::var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM").ok(),
        previous_signup_require_confirm,
        "signup confirmation runtime config must not mutate process env"
    );
}

#[tokio::test]
// Guards the auth route-owned register helper through REST registration.
async fn register_with_email_verification_creates_signup_verification_and_mail_delivery() {
    let _guard = auth_env_lock().lock().unwrap();
    clear_test_outbox();

    let (app, _, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                email_verification_enabled: true,
                ..AuthUiConfig::default()
            },
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let register = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(register.status(), StatusCode::OK);
    let register_json = response_text(register).await;
    assert!(register_json.contains("\"isAnonymous\":true"));

    let verifications = user_verification::Entity::find().all(&db).await.unwrap();
    assert_eq!(verifications.len(), 1);
    let verification = &verifications[0];
    assert_eq!(verification.login_id.as_deref(), Some("door"));
    assert!(verification
        .verification_code
        .as_deref()
        .unwrap_or_default()
        .starts_with("signup:"));

    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].to, "door@example.com");
    assert!(outbox[0].subject.contains("Sign-up"));
    assert!(outbox[0].body.contains("/verify/door/"));
}

#[tokio::test]
// Guards auth route-owned register/sign-in/sign-out helpers through proto adapters.
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
                .uri("/yona/api/v1/_pilot/ReadCurrentSession")
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
                .uri("/yona/api/v1/_pilot/SignOut")
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
                .uri("/yona/api/v1/_pilot/SignInWithPassword")
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
async fn remember_me_controls_session_cookie_persistence() {
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
                .uri("/yona/api/v1/auth/register")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let sign_in_without_remember = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"identifier\":\"door\",\"password\":\"doorpass1\",\"rememberMe\":false}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_in_without_remember.status(), StatusCode::OK);
    let non_persistent_cookies = set_cookie_headers(&sign_in_without_remember);
    assert!(
        !named_cookie(&non_persistent_cookies, "yona_session=").contains("Max-Age="),
        "non-remember sign-in must leave the session cookie browser-scoped"
    );

    let sign_in_with_remember = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
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
    assert_eq!(sign_in_with_remember.status(), StatusCode::OK);
    let persistent_cookies = set_cookie_headers(&sign_in_with_remember);
    assert!(
        named_cookie(&persistent_cookies, "yona_session=").contains("Max-Age=2592000"),
        "remember sign-in must persist the session cookie for the legacy 30-day window"
    );
}

#[tokio::test]
async fn session_timeout_config_controls_non_remember_cookie_persistence() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");
    let (app, _, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            session_timeout_seconds: Some(1800),
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/register")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"loginId\":\"timeout-user\",\"name\":\"Timeout User\",\"emailAddress\":\"timeout@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let sign_in_without_remember = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"identifier\":\"timeout-user\",\"password\":\"doorpass1\",\"rememberMe\":false}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_in_without_remember.status(), StatusCode::OK);
    let timeout_cookies = set_cookie_headers(&sign_in_without_remember);
    assert!(
        named_cookie(&timeout_cookies, "yona_session=").contains("Max-Age=1800"),
        "configured timeout should persist non-remember sessions for the configured window"
    );

    let sign_in_with_remember = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"identifier\":\"timeout-user\",\"password\":\"doorpass1\",\"rememberMe\":true}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_in_with_remember.status(), StatusCode::OK);
    let remember_cookies = set_cookie_headers(&sign_in_with_remember);
    assert!(
        named_cookie(&remember_cookies, "yona_session=").contains("Max-Age=2592000"),
        "remember-me should keep the legacy 30-day persistence window"
    );
}

#[tokio::test]
async fn register_validation_is_detailed_while_sign_in_failure_uses_legacy_message_keys() {
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"admin\",\"name\":\"admin\",\"emailAddress\":\"admin@test.me\",\"password\":\"bad\",\"retypedPassword\":\"bad\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(short_password.status(), StatusCode::BAD_REQUEST);
    let short_password_json = response_text(short_password).await;
    assert!(short_password_json.contains("\"code\":\"bad_request\""));
    assert!(short_password_json.contains("validation.tooShortPassword"));

    let mismatch = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
    assert!(mismatch_json.contains("\"code\":\"bad_request\""));
    assert!(mismatch_json.contains("validation.passwordMismatch"));

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/SignInWithPassword")
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
    assert!(sign_in_json.contains("\"code\":\"unauthorized\""));
    assert!(sign_in_json.contains("user.login.invalid"));

    let missing_password = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/SignInWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"identifier\":\"admin\",\"password\":\"\",\"rememberMe\":true}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(missing_password.status(), StatusCode::BAD_REQUEST);
    let missing_password_json = response_text(missing_password).await;
    assert!(missing_password_json.contains("\"code\":\"bad_request\""));
    assert!(missing_password_json.contains("user.login.required"));
}

#[tokio::test]
async fn register_rejects_duplicate_login_id_and_email() {
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let duplicate_login = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Other\",\"emailAddress\":\"other@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(duplicate_login.status(), StatusCode::CONFLICT);
    let duplicate_login_json = response_text(duplicate_login).await;
    assert!(duplicate_login_json.contains("user.loginId.duplicate"));

    let duplicate_email = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"other\",\"name\":\"Other\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(duplicate_email.status(), StatusCode::CONFLICT);
    let duplicate_email_json = response_text(duplicate_email).await;
    assert!(duplicate_email_json.contains("user.email.duplicate"));
}

#[tokio::test]
async fn direct_legacy_signup_validators_report_used_reserved_and_email_state() {
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    repository
        .create_organization(CreateOrganizationInput {
            organization_name: "acme".to_string(),
            description: Some("Acme".to_string()),
        })
        .await
        .expect("organization");

    let used_login = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/isUsed?name=Door")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(used_login.status(), StatusCode::OK);
    assert!(used_login
        .headers()
        .get(http::header::CONTENT_TYPE)
        .unwrap()
        .to_str()
        .unwrap()
        .contains("application/json"));
    let used_login_json = response_text(used_login).await;
    assert!(used_login_json.contains("\"isExist\":true"));
    assert!(used_login_json.contains("\"isReserved\":false"));

    let used_organization = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/isUsed?name=acme")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(used_organization.status(), StatusCode::OK);
    let used_organization_json = response_text(used_organization).await;
    assert!(used_organization_json.contains("\"isExist\":true"));
    assert!(used_organization_json.contains("\"isReserved\":false"));

    let reserved_name = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/isUsed?name=messages.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(reserved_name.status(), StatusCode::OK);
    let reserved_name_json = response_text(reserved_name).await;
    assert!(reserved_name_json.contains("\"isExist\":false"));
    assert!(reserved_name_json.contains("\"isReserved\":true"));

    let fresh_name = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/isUsed?name=fresh")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(fresh_name.status(), StatusCode::OK);
    let fresh_name_json = response_text(fresh_name).await;
    assert!(fresh_name_json.contains("\"isExist\":false"));
    assert!(fresh_name_json.contains("\"isReserved\":false"));

    let used_email = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/isEmailExist?email=DOOR%40example.com")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(used_email.status(), StatusCode::OK);
    let used_email_json = response_text(used_email).await;
    assert!(used_email_json.contains("\"isExist\":true"));

    let fresh_email = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/isEmailExist?email=fresh%40example.com")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(fresh_email.status(), StatusCode::OK);
    let fresh_email_json = response_text(fresh_email).await;
    assert!(fresh_email_json.contains("\"isExist\":false"));
}

#[tokio::test]
async fn register_marks_matching_guest_prefix_accounts_as_legacy_guests() {
    let _guard = auth_env_lock().lock().unwrap();
    std::env::remove_var("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM");
    std::env::remove_var("YONA_AUTH_EMAIL_VERIFICATION_ENABLED");
    std::env::set_var("YONA_GUEST_LOGIN_PREFIX", "guest_, pt-");

    let (app, _, db) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let register = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"PT-door\",\"name\":\"Guest Door\",\"emailAddress\":\"pt-door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();

    std::env::remove_var("YONA_GUEST_LOGIN_PREFIX");

    assert_eq!(register.status(), StatusCode::OK);
    let registered_user = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("pt-door".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("registered guest-prefix user");
    assert_eq!(registered_user.is_guest, Some(1));
}

#[tokio::test]
async fn direct_lost_password_and_reset_password_routes_round_trip() {
    // Guards route-utils-owned password reset mail helper and absolute reset URL composition.
    let _guard = auth_env_lock().lock().unwrap();
    clear_test_outbox();
    let previous_site_name = std::env::var("YONA_SITE_NAME").ok();
    let (app, repository, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            site_name: "Yona Test".to_string(),
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
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
    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].to, "door@example.com");

    let verification = user_verification::Entity::find()
        .one(&db)
        .await
        .unwrap()
        .expect("password reset verification");
    let reset_code = verification
        .verification_code
        .clone()
        .expect("verification code");
    assert_eq!(outbox[0].subject, "[Yona Test] Password reset request");
    assert_eq!(
        outbox[0].body,
        format!(
            "Copy the following URL and paste it to browser's URL bar\n\nhttp://localhost:3001/yona/resetPassword?s={reset_code}"
        )
    );

    let reset_password = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/resetPassword")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
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
    assert!(user_verification::Entity::find()
        .all(&db)
        .await
        .unwrap()
        .is_empty());
    assert_eq!(
        std::env::var("YONA_SITE_NAME").ok(),
        previous_site_name,
        "site name app config must not mutate process env"
    );
}

#[tokio::test]
async fn direct_email_validation_send_and_confirm_routes_round_trip() {
    // Guards route-utils-owned workspace email validation mail helper and confirmation URL.
    let _guard = auth_env_lock().lock().unwrap();
    clear_test_outbox();
    let (app, repository, db) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
                .uri(&format!(
                    "/yona/user/email/sendValidationEmail/{}",
                    email_before.id
                ))
                .header(http::header::COOKIE, &cookie_header)
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
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
    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].to, "pending@example.com");
    assert!(outbox[0].subject.contains("Validation"));
    assert!(outbox[0].body.contains("/user/email/confirm/"));

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
// Guards the auth route-owned verify helper through the proto adapter.
async fn verify_user_activates_pending_account_and_rejects_invalid_or_expired_links() {
    let _guard = auth_env_lock().lock().unwrap();
    clear_test_outbox();
    let (app, repository, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                email_verification_enabled: true,
                ..AuthUiConfig::default()
            },
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let invalid = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/VerifyUser")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    "{\"loginId\":\"door\",\"verificationCode\":\"signup:missing\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(invalid.status(), StatusCode::NOT_FOUND);

    let verification = user_verification::Entity::find()
        .one(&db)
        .await
        .unwrap()
        .expect("signup verification");
    let verification_code = verification
        .verification_code
        .clone()
        .expect("verification code");

    let verify = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/VerifyUser")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(format!(
                    "{{\"loginId\":\"door\",\"verificationCode\":\"{verification_code}\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(verify.status(), StatusCode::OK);
    let verify_json = response_text(verify).await;
    assert!(verify_json.contains("\"loginId\":\"door\""));
    assert!(user_verification::Entity::find()
        .all(&db)
        .await
        .unwrap()
        .is_empty());

    let activated_user = repository
        .find_user_by_identifier("door")
        .await
        .unwrap()
        .expect("activated user");
    assert!(activated_user.is_confirmed);

    let sign_in = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/SignInWithPassword")
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

    repository
        .create_signup_verification_for_user(activated_user.id, "door")
        .await
        .unwrap();
    let expired = user_verification::Entity::find()
        .one(&db)
        .await
        .unwrap()
        .expect("expired verification");
    let expired_code = expired.verification_code.clone().expect("expired code");
    let mut expired_active = user_verification::ActiveModel::from(expired);
    expired_active.timestamp = Set(Some(
        DateTimeUtc::from(SystemTime::now() - Duration::from_secs(25 * 60 * 60)).timestamp_millis(),
    ));
    expired_active.update(&db).await.unwrap();

    let expired_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/VerifyUser")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(format!(
                    "{{\"loginId\":\"door\",\"verificationCode\":\"{expired_code}\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(expired_response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn direct_legacy_profile_and_email_routes_accept_form_csrf_redirect_and_mutate_workspace_state(
) {
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let updated_profile = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/user/edit")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::from(format!(
                    "csrfToken={csrf}&name=Door+Updated&email=door-updated%40example.com&avatarAttachmentId="
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(updated_profile.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        updated_profile
            .headers()
            .get(http::header::LOCATION)
            .unwrap(),
        "/yona/user/editform"
    );
    assert_eq!(response_text(updated_profile).await, "");

    let user = repository
        .find_user_by_identifier("door")
        .await
        .unwrap()
        .expect("updated user");
    assert_eq!(user.display_name, "Door Updated");
    assert_eq!(user.email_address, "door-updated@example.com");

    let added_email = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/user/email")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::from(format!(
                    "csrfToken={csrf}&email=alt%40example.com"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(added_email.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        added_email.headers().get(http::header::LOCATION).unwrap(),
        "/yona/user/editform"
    );

    let added_email_row = email::Entity::find()
        .filter(email::Column::UserId.eq(Some(user.id)))
        .filter(email::Column::Email.eq(Some("alt@example.com".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("added workspace email");
    assert_eq!(added_email_row.valid, Some(0));
}

#[tokio::test]
async fn direct_legacy_email_delete_and_set_main_routes_redirect_and_mutate_email_state() {
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
        .add_workspace_email_for_user(user.id, "alt@example.com")
        .await
        .expect("alt email");
    let alt_email = email::Entity::find()
        .filter(email::Column::UserId.eq(Some(user.id)))
        .filter(email::Column::Email.eq(Some("alt@example.com".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("alt email row");
    let mut alt_email_active = email::ActiveModel::from(
        email::Entity::find_by_id(alt_email.id)
            .one(&db)
            .await
            .unwrap()
            .expect("alt email row"),
    );
    alt_email_active.valid = Set(Some(1));
    alt_email_active.update(&db).await.unwrap();

    let set_main = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PUT)
                .uri(format!("/yona/user/email/setAsMain/{}", alt_email.id))
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(set_main.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        set_main.headers().get(http::header::LOCATION).unwrap(),
        "/yona/user/editform"
    );

    let updated_user = repository
        .find_user_by_identifier("door")
        .await
        .unwrap()
        .expect("updated user");
    assert_eq!(updated_user.email_address, "alt@example.com");
    assert!(email::Entity::find_by_id(alt_email.id)
        .one(&db)
        .await
        .unwrap()
        .is_none());
    let old_main_email = email::Entity::find()
        .filter(email::Column::UserId.eq(Some(user.id)))
        .filter(email::Column::Email.eq(Some("door@example.com".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("old main email row");

    let delete_old_main = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/yona/user/email/delete/{}", old_main_email.id))
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(delete_old_main.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        delete_old_main
            .headers()
            .get(http::header::LOCATION)
            .unwrap(),
        "/yona/user/editform"
    );
    assert!(email::Entity::find_by_id(old_main_email.id)
        .one(&db)
        .await
        .unwrap()
        .is_none());
}

#[tokio::test]
async fn direct_legacy_token_reset_route_accepts_form_csrf_redirects_and_rotates_api_token() {
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
    let token_before = n4user::Entity::find_by_id(user.id)
        .one(&db)
        .await
        .unwrap()
        .expect("registered user row")
        .token;

    let reset_token = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/user/editform/token_reset")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::from(format!("csrfToken={csrf}")))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(reset_token.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        reset_token.headers().get(http::header::LOCATION).unwrap(),
        "/yona/user/editform/token"
    );

    let token_after = n4user::Entity::find_by_id(user.id)
        .one(&db)
        .await
        .unwrap()
        .expect("updated user row")
        .token
        .expect("rotated token");
    assert!(!token_after.is_empty());
    assert_ne!(Some(token_after), token_before);
}

#[tokio::test]
async fn direct_legacy_reset_visited_and_default_login_page_routes_match_workspace_state() {
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "door".to_string(),
            overview: Some("Yona project".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();
    repository
        .record_recent_project_visit(user.id, "door", "projectYobi")
        .await
        .unwrap();

    let reset_visited = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/user/resetVisitedList")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(reset_visited.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        reset_visited.headers().get(http::header::LOCATION).unwrap(),
        "/yona/user/editform"
    );
    assert_eq!(response_text(reset_visited).await, "");
    assert!(yona_rust_persistence::recent_project::Entity::find()
        .filter(yona_rust_persistence::recent_project::Column::UserId.eq(Some(user.id)))
        .all(&db)
        .await
        .unwrap()
        .is_empty());

    let set_default = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/user/defultLoginPage?path=%2Fsearch%3Fscope%3Dglobal%26pageSize%3D20")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(set_default.status(), StatusCode::OK);
    let set_default_json = response_text(set_default).await;
    assert!(set_default_json.contains("\"defaultLoginPage\":\"/search?pageSize=20&scope=global\""));
    assert_eq!(
        repository
            .read_default_landing_path(user.id)
            .await
            .unwrap()
            .as_deref(),
        Some("/search?pageSize=20&scope=global")
    );

    let legacy_set_default = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/-_-api/v1/user/defultLoginPage?path=%2Fme")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(legacy_set_default.status(), StatusCode::OK);
    let legacy_set_default_json = response_text(legacy_set_default).await;
    assert!(legacy_set_default_json.contains("\"defaultLoginPage\":\"/me\""));
    assert_eq!(
        repository
            .read_default_landing_path(user.id)
            .await
            .unwrap()
            .as_deref(),
        Some("/me")
    );
}

#[tokio::test]
async fn direct_legacy_usermenu_tab_content_list_returns_legacy_fragment() {
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "door".to_string(),
            overview: Some("Yona project".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();
    repository
        .record_recent_project_visit(user.id, "door", "projectYobi")
        .await
        .unwrap();

    let fragment = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/usermenuTabContentList")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(fragment.status(), StatusCode::OK);
    assert!(fragment.headers().get(http::header::LOCATION).is_none());
    assert_eq!(
        fragment
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("text/html; charset=utf-8")
    );
    let html = response_text(fragment).await;
    assert!(
        html.contains(r#"<div class="tab-pane user-project-list active" id="myOrganizationList">"#)
    );
    assert!(html.contains(r#"<div class="tab-pane user-project-list" id="myProjectList">"#));
    assert!(html.contains(r#"<div class="tab-pane user-project-list" id="myRecentIssueList">"#));
    assert!(html.contains(r#"class="search-input org-search""#));
    assert!(html.contains(r#"class="search-input project-search""#));
    assert!(html.contains(r##"href="#recentlyVisited""##));
    assert!(html.contains(r##"href="#createdByMe""##));
    assert!(html.contains(r##"href="#watching""##));
    assert!(html.contains(r##"href="#joinmember""##));
    assert!(html.contains(r#"id="recentlyVisitedIssues""#));
    assert!(html.contains(r#"href="/yona/door/projectYobi""#));
    assert!(html.contains("projectYobi"));

    let anonymous_fragment = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/usermenuTabContentList")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(anonymous_fragment.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn direct_legacy_user_sidebar_returns_framed_sidebar_shell() {
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "door".to_string(),
            overview: Some("Yona project".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();
    repository
        .record_recent_project_visit(user.id, "door", "projectYobi")
        .await
        .unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/sidebar?path=%2Fdoor%2FprojectYobi%2Fissue%2F1&hash=comment-7")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("text/html; charset=utf-8")
    );
    let html = response_text(response).await;
    assert!(html.contains(r#"<body class="framed-body" id="html-body">"#));
    assert!(html.contains(r#"<div id="sidebar" class="sidebar hide-in-mobile">"#));
    assert!(html.contains(r#"<div class="row-fluid user-menu-wrap">"#));
    assert!(html.contains(r#"<a href="/yona/door" target="mainFrame">"#));
    assert!(html.contains(r#"<span class="caret-text hide-in-mobile">Door</span>"#));
    assert!(html.contains(
        r#"<a href="/yona/user/editform" target="mainFrame">userinfo.accountSetting</a>"#
    ));
    assert!(html.contains(r#"<div class="pin-in-sidebar" data-toggle="tooltip" data-placement="bottom" title="Sidebar">"#));
    assert!(html.contains(r##"<a href="#myOrganizationList" data-toggle="tab">"##));
    assert!(html.contains("title.favorite"));
    assert!(html.contains("title.project"));
    assert!(html.contains("title.recently.visited.issue"));
    assert!(html.contains(r#"<div id="usermenu-tab-content-list" class="tab-content">"#));
    assert!(html.contains(r#"class="search-input org-search""#));
    assert!(html.contains(r#"href="/yona/door/projectYobi""#));
    assert!(html.contains(r#"<div id="mainFrame" class="show-in-mobile-100vh">"#));
    assert!(html.contains(r#"iframe name="mainFrame" id="mainFrameId""#));
    assert!(html.contains(r#"src="/yona/door/projectYobi/issue/1#comment-7""#));
    assert!(html.contains(r#"var UsermenuUrl = "/yona/user/usermenuTabContentList";"#));
    assert!(html.contains(r#"/assets/javascripts/common/yona.Usermenu.js"#));

    let anonymous_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/sidebar")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(anonymous_response.status(), StatusCode::OK);
    let anonymous_html = response_text(anonymous_response).await;
    assert!(anonymous_html.contains(r#"<div id="sidebar" class="sidebar hide-in-mobile">"#));
    assert!(!anonymous_html.contains(r#"<div class="row-fluid user-menu-wrap">"#));
    assert!(anonymous_html.contains(r#"src="/yona/notifications""#));
}

#[tokio::test]
async fn direct_legacy_user_reset_password_route_logs_out_and_accepts_new_password() {
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let changed_password = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/user/resetPassword")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "loginId=door&oldPassword=doorpass1&password=doorpass2&retypedPassword=doorpass2",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(changed_password.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        changed_password
            .headers()
            .get(http::header::LOCATION)
            .unwrap(),
        "/yona/users/loginform"
    );
    assert!(!set_cookie_headers(&changed_password).is_empty());

    let old_password = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/SignInWithPassword")
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
    assert_eq!(old_password.status(), StatusCode::UNAUTHORIZED);

    let new_password = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/SignInWithPassword")
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
    assert_eq!(new_password.status(), StatusCode::OK);
}

#[tokio::test]
// Guards workspace route-owned settings helpers through REST and proto routes.
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
            vcs: "GIT".to_string(),
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

    let workspace_overview = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/workspace")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(workspace_overview.status(), StatusCode::OK);
    let workspace_overview_json = response_text(workspace_overview).await;
    assert!(workspace_overview_json.contains("\"loginId\":\"door\""));
    assert!(workspace_overview_json.contains("\"defaultLandingPath\":\"/me\""));

    let empty_profile_name = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateProfile")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"name\":\"\",\"email\":\"door-updated@example.com\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(empty_profile_name.status(), StatusCode::BAD_REQUEST);
    let empty_profile_name_json = response_text(empty_profile_name).await;
    assert!(empty_profile_name_json.contains("validation.required"));

    let updated_profile = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateProfile")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"name\":\"Door Updated\",\"email\":\"door-updated@example.com\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(updated_profile.status(), StatusCode::OK);
    let updated_profile_json = response_text(updated_profile).await;
    assert!(updated_profile_json.contains("\"userLabel\":\"Door Updated\""));
    assert!(updated_profile_json.contains("\"emailAddress\":\"door-updated@example.com\""));
    assert!(updated_profile_json.contains("\"avatarUrl\":\"https://www.gravatar.com/avatar/"));

    let avatar_attachment = attachment::ActiveModel {
        id: NotSet,
        name: Set(Some("avatar.png".to_string())),
        hash: Set(Some("avatar-upload-hash".to_string())),
        container_type: Set(Some("USER".to_string())),
        mime_type: Set(Some("image/png".to_string())),
        size: Set(Some(256)),
        container_id: Set(user.id),
        created_date: Set(Some(DateTimeUtc::from(SystemTime::now()).naive_utc())),
        owner_login_id: Set(Some("door".to_string())),
    }
    .insert(&db)
    .await
    .unwrap();

    let updated_avatar = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateProfile")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!(
                    "{{\"name\":\"Door Updated\",\"email\":\"door-updated@example.com\",\"avatarAttachmentId\":\"{}\"}}",
                    avatar_attachment.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(updated_avatar.status(), StatusCode::OK);
    let updated_avatar_json = response_text(updated_avatar).await;
    assert!(updated_avatar_json.contains(&format!(
        "\"avatarUrl\":\"/yona/files/{}\"",
        avatar_attachment.id
    )));

    let added_email = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/AddWorkspaceEmail")
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
                .uri("/yona/api/v1/_pilot/SendWorkspaceEmailValidation")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!("{{\"id\":\"{}\"}}", alt_email.id)))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(validation_sent.status(), StatusCode::OK);

    let mut alt_email_active = email::ActiveModel::from(
        email::Entity::find_by_id(alt_email.id)
            .one(&db)
            .await
            .unwrap()
            .unwrap(),
    );
    alt_email_active.valid = Set(Some(1));
    alt_email_active.update(&db).await.unwrap();

    let set_main = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/SetMainWorkspaceEmail")
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
                .uri("/yona/api/v1/_pilot/ResetApiToken")
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
                .uri("/yona/api/v1/_pilot/ToggleWorkspaceNotification")
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
                .uri("/yona/api/v1/_pilot/ResetVisitedProjects")
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
                .uri("/yona/api/v1/_pilot/DeleteWorkspaceEmail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!("{{\"id\":\"{}\"}}", delete_old_main.id)))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(deleted_email.status(), StatusCode::OK);

    let wrong_old_password = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ChangePassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"oldPassword\":\"wrongpass\",\"password\":\"doorpass2\",\"retypedPassword\":\"doorpass2\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(wrong_old_password.status(), StatusCode::BAD_REQUEST);
    let wrong_old_password_json = response_text(wrong_old_password).await;
    assert!(wrong_old_password_json.contains("user.wrongPassword.alert"));

    let mismatched_password = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ChangePassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"oldPassword\":\"doorpass1\",\"password\":\"doorpass2\",\"retypedPassword\":\"doorpass3\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(mismatched_password.status(), StatusCode::BAD_REQUEST);
    let mismatched_password_json = response_text(mismatched_password).await;
    assert!(mismatched_password_json.contains("validation.passwordMismatch"));

    let changed_password = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ChangePassword")
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
                .uri("/yona/api/v1/_pilot/SignInWithPassword")
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
// Guards workspace route-owned notification toggle helper error mapping.
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
            vcs: "GIT".to_string(),
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
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();

    let missing = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ToggleWorkspaceNotification")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"projectId\":\"99999\",\"eventType\":\"NEW_ISSUE\"}",
                ))
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
                .uri("/yona/api/v1/_pilot/ToggleWorkspaceNotification")
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
                .uri("/yona/api/v1/_pilot/ToggleWorkspaceNotification")
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
// Guards the workspace route-owned profile helper through avatar replacement.
async fn update_profile_replaces_existing_avatar_attachment() {
    let _guard = auth_env_lock().lock().unwrap();
    let (app, repository, db) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
    attachment::ActiveModel {
        id: NotSet,
        name: Set(Some("old-avatar.png".to_string())),
        hash: Set(Some("old-avatar-hash".to_string())),
        container_type: Set(Some("USER_AVATAR".to_string())),
        mime_type: Set(Some("image/png".to_string())),
        size: Set(Some(128)),
        container_id: Set(user.id),
        created_date: Set(Some(DateTimeUtc::from(SystemTime::now()).naive_utc())),
        owner_login_id: Set(Some("door".to_string())),
    }
    .insert(&db)
    .await
    .unwrap();
    let new_avatar = attachment::ActiveModel {
        id: NotSet,
        name: Set(Some("new-avatar.png".to_string())),
        hash: Set(Some("new-avatar-hash".to_string())),
        container_type: Set(Some("USER".to_string())),
        mime_type: Set(Some("image/png".to_string())),
        size: Set(Some(256)),
        container_id: Set(user.id),
        created_date: Set(Some(DateTimeUtc::from(SystemTime::now()).naive_utc())),
        owner_login_id: Set(Some("door".to_string())),
    }
    .insert(&db)
    .await
    .unwrap();

    let invalid_avatar_id = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateProfile")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"name\":\"Door\",\"email\":\"door@example.com\",\"avatarAttachmentId\":\"not-a-number\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(invalid_avatar_id.status(), StatusCode::BAD_REQUEST);
    let invalid_avatar_id_json = response_text(invalid_avatar_id).await;
    assert!(invalid_avatar_id_json.contains("user.avatar.uploadError"));

    let text_attachment = attachment::ActiveModel {
        id: NotSet,
        name: Set(Some("avatar.txt".to_string())),
        hash: Set(Some("avatar-text-hash".to_string())),
        container_type: Set(Some("USER".to_string())),
        mime_type: Set(Some("text/plain".to_string())),
        size: Set(Some(256)),
        container_id: Set(user.id),
        created_date: Set(Some(DateTimeUtc::from(SystemTime::now()).naive_utc())),
        owner_login_id: Set(Some("door".to_string())),
    }
    .insert(&db)
    .await
    .unwrap();
    let non_image_avatar = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateProfile")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!(
                    "{{\"name\":\"Door\",\"email\":\"door@example.com\",\"avatarAttachmentId\":\"{}\"}}",
                    text_attachment.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(non_image_avatar.status(), StatusCode::BAD_REQUEST);
    let non_image_avatar_json = response_text(non_image_avatar).await;
    assert!(non_image_avatar_json.contains("user.avatar.onlyImage"));

    let large_attachment = attachment::ActiveModel {
        id: NotSet,
        name: Set(Some("large-avatar.png".to_string())),
        hash: Set(Some("large-avatar-hash".to_string())),
        container_type: Set(Some("USER".to_string())),
        mime_type: Set(Some("image/png".to_string())),
        size: Set(Some(1024 * 1000 + 1)),
        container_id: Set(user.id),
        created_date: Set(Some(DateTimeUtc::from(SystemTime::now()).naive_utc())),
        owner_login_id: Set(Some("door".to_string())),
    }
    .insert(&db)
    .await
    .unwrap();
    let too_large_avatar = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateProfile")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!(
                    "{{\"name\":\"Door\",\"email\":\"door@example.com\",\"avatarAttachmentId\":\"{}\"}}",
                    large_attachment.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(too_large_avatar.status(), StatusCode::BAD_REQUEST);
    let too_large_avatar_json = response_text(too_large_avatar).await;
    assert!(too_large_avatar_json.contains("user.avatar.fileSizeAlert"));

    let updated_avatar = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateProfile")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!(
                    "{{\"name\":\"Door\",\"email\":\"door@example.com\",\"avatarAttachmentId\":\"{}\"}}",
                    new_avatar.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(updated_avatar.status(), StatusCode::OK);

    let avatar_rows = attachment::Entity::find()
        .filter(attachment::Column::ContainerType.eq(Some("USER_AVATAR".to_string())))
        .filter(attachment::Column::ContainerId.eq(user.id))
        .all(&db)
        .await
        .unwrap();
    assert_eq!(avatar_rows.len(), 1);
    assert_eq!(avatar_rows[0].id, new_avatar.id);
}

#[tokio::test]
// Guards workspace route-owned overview/default-landing helpers through proto adapters.
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
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
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
                .uri("/yona/api/v1/_pilot/ReadWorkspaceOverview")
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
                .uri("/yona/api/v1/_pilot/SetDefaultLandingPath")
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
                .uri("/yona/api/v1/_pilot/SetDefaultLandingPath")
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
            vcs: "GIT".to_string(),
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
            vcs: "GIT".to_string(),
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
        state: Set(Some(1)),
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
        state: Set(Some(6)),
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
        state: Set(Some(1)),
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
        state: Set(Some(1)),
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
        state: Set(Some(1)),
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
                .uri("/yona/api/v1/_pilot/ReadWorkspaceOverview")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(enriched_overview.status(), StatusCode::OK);
    let enriched_body = enriched_overview
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
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
    assert!(profile
        .get("sinceLabel")
        .and_then(|value| value.as_str())
        .is_some_and(|value| !value.trim().is_empty()));
    let first_project = watched_projects.first().expect("watched project");
    let notifications = first_project
        .get("notifications")
        .and_then(|value| value.as_array())
        .expect("notifications array");
    let new_comment = notifications
        .iter()
        .find(|value| {
            value.get("eventType").and_then(|field| field.as_str()) == Some("NEW_COMMENT")
        })
        .expect("NEW_COMMENT notification");
    assert_eq!(
        new_comment
            .get("enabled")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        false
    );
}
