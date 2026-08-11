use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;

// Guards auth/workspace behavior while server root helper forwarding is
// replaced with module-local imports.
use sea_orm::{
    entity::prelude::{DateTime, DateTimeUtc},
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, NotSet, QueryFilter,
    Set,
};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tower::ServiceExt;
use yoram_integrations::{clear_test_outbox, snapshot_test_outbox};
use yoram_migration::Migrator;
use yoram_persistence::{
    assignee, attachment, comment_thread, email, issue, linked_account, n4user, project,
    pull_request, site_admin, user_credential, user_project_notification, user_verification, watch,
    AppRepository, CreateOrganizationInput, CreateProjectInput, RepositoryConfig,
};
use yoram_server::{
    create_router_with_repository_and_app_config,
    create_router_with_repository_and_filesystem_assets, AppRuntimeConfig, AuthUiConfig,
    LdapFixtureUser, LdapRuntimeConfig, RuntimeConfig, SmtpRuntimeConfig,
};

// Workspace route-module ownership guard: the legacy `/info/leave/:owner/:project`
// project-leave handler lives with workspace routes, while the membership side effect
// is asserted by project_members_contract::leave_project_redirects_to_member_projects_after_removal.

fn auth_outbox_lock() -> &'static Mutex<()> {
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
    build_auth_router_with_configs(
        allow_anonymous_access,
        app_config,
        RepositoryConfig::default(),
    )
    .await
}

async fn build_auth_router_with_configs(
    allow_anonymous_access: bool,
    app_config: AppRuntimeConfig,
    repository_config: RepositoryConfig,
) -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new_with_config(db.clone(), repository_config);

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
    // Guards `/api/auth/session` service-snapshot threading for anonymous session
    // bootstrap, CSRF header, and set-cookie emission.
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

async fn oauth_start_state(app: &axum::Router, provider: &str) -> (String, String) {
    // Runs the OAuth start redirect and returns (state, cookie header carrying oauth_state_{provider}).
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/authenticate/{provider}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    let set_cookies = set_cookie_headers(&response);
    let state_cookie = named_cookie(&set_cookies, &format!("oauth_state_{provider}="));
    let state = state_cookie
        .split(';')
        .next()
        .and_then(|pair| pair.split_once('='))
        .map(|(_, value)| value.to_string())
        .unwrap_or_else(|| panic!("oauth state cookie value missing in {state_cookie}"));
    let cookie_header = cookie_header_from_set_cookie_response(&response);
    (state, cookie_header)
}

async fn spawn_oauth_provider_stub(provider: &str) -> String {
    let app = match provider {
        "github" => axum::Router::new()
            .route(
                "/token",
                axum::routing::post(|| async {
                    axum::Json(serde_json::json!({
                        "access_token": "github-access-token",
                        "token_type": "bearer"
                    }))
                }),
            )
            .route(
                "/user",
                axum::routing::get(|| async {
                    axum::Json(serde_json::json!({
                        "id": 42,
                        "login": "octo-provider",
                        "name": "GitHub Provider",
                        "email": null
                    }))
                }),
            )
            .route(
                "/emails",
                axum::routing::get(|| async {
                    axum::Json(serde_json::json!([
                        {
                            "email": "secondary@example.com",
                            "primary": false,
                            "verified": true
                        },
                        {
                            "email": "provider-octo@example.com",
                            "primary": true,
                            "verified": true
                        }
                    ]))
                }),
            ),
        "google" => axum::Router::new()
            .route(
                "/token",
                axum::routing::post(|| async {
                    axum::Json(serde_json::json!({
                        "access_token": "google-access-token",
                        "token_type": "Bearer"
                    }))
                }),
            )
            .route(
                "/userinfo",
                axum::routing::get(|| async {
                    axum::Json(serde_json::json!({
                        "sub": "google-provider-7",
                        "email": "provider-door@example.com",
                        "name": "Google Provider"
                    }))
                }),
            ),
        _ => panic!("unsupported oauth stub provider: {provider}"),
    };
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("oauth stub listener");
    let address = listener.local_addr().expect("oauth stub address");
    tokio::spawn(async move {
        axum::serve(listener, app).await.expect("oauth stub server");
    });
    format!("http://{address}")
}

fn days_ago_datetime(days: u64) -> DateTime {
    DateTimeUtc::from(SystemTime::now() - Duration::from_secs(days * 24 * 60 * 60)).naive_utc()
}

#[tokio::test]
async fn anonymous_access_disabled_redirects_pages_and_rejects_non_auth_rest() {
    // Guards the runtime anonymous-access gate's page redirect and REST rejection boundary.
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
// Guards app-config-owned auth UI projection without process-env fallback.
async fn read_auth_ui_capabilities_reflects_runtime_config_without_env_mutation() {
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
// Guards legacy PlayAuthenticate-style configured provider start without contacting GitHub.
async fn legacy_oauth_start_redirects_to_configured_github_authorization_endpoint() {
    let (app, _, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                enabled_social_providers: vec!["github".to_string()],
                ..AuthUiConfig::default()
            },
            oauth: yoram_server::OAuthRuntimeConfig::from_providers([(
                "github",
                yoram_server::OAuthProviderRuntimeConfig {
                    authorization_url: "https://github.example/login/oauth/authorize".to_string(),
                    client_id: "github-client".to_string(),
                    client_secret: "github-secret".to_string(),
                    scope: "user:email".to_string(),
                    ..Default::default()
                },
            )]),
            ..AppRuntimeConfig::default()
        },
    )
    .await;

    let response = app
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
    let location = response
        .headers()
        .get(http::header::LOCATION)
        .and_then(|value| value.to_str().ok())
        .expect("location");
    assert!(location.starts_with("https://github.example/login/oauth/authorize?"));
    assert!(location.contains("client_id=github-client"));
    assert!(location
        .contains("redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fyona%2Fauthenticate%2Fgithub"));
    assert!(location.contains("scope=user%3Aemail"));
    assert!(location.contains("response_type=code"));
    assert!(
        !location.contains("state=yona-oauth"),
        "start redirect must use a fresh random state, not the legacy fixed literal"
    );
    let set_cookies = set_cookie_headers(&response);
    let state_cookie = named_cookie(&set_cookies, "oauth_state_github=");
    assert!(state_cookie.contains("HttpOnly"), "state cookie: {state_cookie}");
    assert!(state_cookie.contains("SameSite=Lax"), "state cookie: {state_cookie}");
    assert!(state_cookie.contains("Max-Age=600"), "state cookie: {state_cookie}");
    let state = state_cookie
        .split(';')
        .next()
        .and_then(|pair| pair.split_once('='))
        .map(|(_, value)| value)
        .expect("state cookie value");
    assert!(
        location.contains(&format!("state={state}")),
        "location must echo the cookie state: {location}"
    );
}

#[tokio::test]
// Guards OAuth callback local-user creation, credential persistence, session creation, and profile provider projection.
async fn legacy_oauth_callback_creates_local_user_persists_provider_and_signs_in() {
    let (app, repository, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                enabled_social_providers: vec!["github".to_string()],
                ..AuthUiConfig::default()
            },
            oauth: yoram_server::OAuthRuntimeConfig::from_providers([(
                "github",
                yoram_server::OAuthProviderRuntimeConfig {
                    authorization_url: "https://github.example/login/oauth/authorize".to_string(),
                    client_id: "github-client".to_string(),
                    client_secret: "github-secret".to_string(),
                    scope: "user:email".to_string(),
                    ..Default::default()
                },
            )]),
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (state, state_cookie_header) = oauth_start_state(&app, "github").await;

    let callback = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/authenticate/github?code=fixture-code&providerUserId=octo-1&email=octo@example.com&name=Octo%20Cat&state={state}"))
                .header(http::header::COOKIE, state_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(callback.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        callback
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/")
    );
    let callback_cookie_header = cookie_header_from_set_cookie_response(&callback);
    assert!(!callback_cookie_header.is_empty());

    let user = repository
        .find_user_by_identifier("octo@example.com")
        .await
        .unwrap()
        .expect("oauth-created user");
    assert_eq!(user.login_id, "octo");
    assert_eq!(user.display_name, "Octo Cat");

    let workspace = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadWorkspaceOverview")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, callback_cookie_header)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(workspace.status(), StatusCode::OK);
    let payload: serde_json::Value = serde_json::from_str(&response_text(workspace).await).unwrap();
    assert_eq!(
        payload
            .pointer("/profile/connectedSocialProviders")
            .and_then(|value| value.as_array())
            .map(|providers| providers
                .iter()
                .filter_map(|provider| provider.as_str())
                .collect::<Vec<_>>()),
        Some(vec!["github"])
    );
}

#[tokio::test]
// Guards legacy Application.oAuthLogout parity: even for configured OAuth users,
// logout is local PlayAuthenticate/session cleanup plus Referer redirect, not a
// provider-specific external logout redirect or network interaction.
async fn legacy_oauth_logout_clears_local_session_without_provider_logout_redirect() {
    let (app, _, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                enabled_social_providers: vec!["github".to_string()],
                ..AuthUiConfig::default()
            },
            oauth: yoram_server::OAuthRuntimeConfig::from_providers([(
                "github",
                yoram_server::OAuthProviderRuntimeConfig {
                    authorization_url: "https://github.example/login/oauth/authorize".to_string(),
                    client_id: "github-client".to_string(),
                    client_secret: "github-secret".to_string(),
                    scope: "user:email".to_string(),
                    ..Default::default()
                },
            )]),
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (state, state_cookie_header) = oauth_start_state(&app, "github").await;

    let callback = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/authenticate/github?code=fixture-code&providerUserId=octo-logout&email=octo-logout@example.com&name=Octo%20Logout&state={state}"))
                .header(http::header::COOKIE, state_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(callback.status(), StatusCode::SEE_OTHER);
    let authenticated_cookie_header = cookie_header_from_set_cookie_response(&callback);

    let logout = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/logout")
                .header(http::header::COOKIE, &authenticated_cookie_header)
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

    let logout_cookie_header = cookie_header_from_set_cookie_response(&logout);
    let current = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/session")
                .header(http::header::COOKIE, logout_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(current.status(), StatusCode::OK);
    let current_json = response_text(current).await;
    assert!(current_json.contains("\"isAnonymous\":true"));
}

#[tokio::test]
// Guards configured GitHub OAuth callback token exchange plus user/email profile mapping without external network.
async fn legacy_oauth_callback_exchanges_github_code_for_provider_identity() {
    let provider_base = spawn_oauth_provider_stub("github").await;
    let (app, repository, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                enabled_social_providers: vec!["github".to_string()],
                ..AuthUiConfig::default()
            },
            oauth: yoram_server::OAuthRuntimeConfig::from_providers([(
                "github",
                yoram_server::OAuthProviderRuntimeConfig {
                    access_token_url: format!("{provider_base}/token"),
                    authorization_url: "https://github.example/login/oauth/authorize".to_string(),
                    client_id: "github-client".to_string(),
                    client_secret: "github-secret".to_string(),
                    email_url: format!("{provider_base}/emails"),
                    scope: "user:email".to_string(),
                    user_info_url: format!("{provider_base}/user"),
                },
            )]),
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (state, state_cookie_header) = oauth_start_state(&app, "github").await;

    let callback = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/authenticate/github?code=real-provider-code&state={state}"))
                .header(http::header::COOKIE, state_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(callback.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        callback
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/")
    );
    let user = repository
        .find_user_by_identifier("provider-octo@example.com")
        .await
        .unwrap()
        .expect("oauth-created GitHub user");
    assert_eq!(user.login_id, "provider-octo");
    assert_eq!(user.display_name, "GitHub Provider");
    let provider_rows = linked_account::Entity::find()
        .filter(linked_account::Column::ProviderKey.eq("github"))
        .all(&db)
        .await
        .unwrap();
    assert_eq!(provider_rows.len(), 1);
    assert_eq!(provider_rows[0].provider_user_id.as_deref(), Some("42"));
}

#[tokio::test]
// Guards configured Google OAuth callback token exchange plus userinfo profile mapping without external network.
async fn legacy_oauth_callback_exchanges_google_code_for_provider_identity() {
    let provider_base = spawn_oauth_provider_stub("google").await;
    let (app, repository, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                enabled_social_providers: vec!["google".to_string()],
                ..AuthUiConfig::default()
            },
            oauth: yoram_server::OAuthRuntimeConfig::from_providers([(
                "google",
                yoram_server::OAuthProviderRuntimeConfig {
                    access_token_url: format!("{provider_base}/token"),
                    authorization_url: "https://accounts.example/o/oauth2/auth".to_string(),
                    client_id: "google-client".to_string(),
                    client_secret: "google-secret".to_string(),
                    scope: "profile email".to_string(),
                    user_info_url: format!("{provider_base}/userinfo"),
                    ..Default::default()
                },
            )]),
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (state, state_cookie_header) = oauth_start_state(&app, "google").await;

    let callback = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/authenticate/google?code=real-provider-code&state={state}"))
                .header(http::header::COOKIE, state_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(callback.status(), StatusCode::SEE_OTHER);
    let user = repository
        .find_user_by_identifier("provider-door@example.com")
        .await
        .unwrap()
        .expect("oauth-created Google user");
    assert_eq!(user.login_id, "provider-door");
    assert_eq!(user.display_name, "Google Provider");
    let provider_rows = linked_account::Entity::find()
        .filter(linked_account::Column::ProviderKey.eq("google"))
        .all(&db)
        .await
        .unwrap();
    assert_eq!(provider_rows.len(), 1);
    assert_eq!(
        provider_rows[0].provider_user_id.as_deref(),
        Some("google-provider-7")
    );
}

#[tokio::test]
// Guards legacy OAuth callback linking by email instead of creating a duplicate local user.
async fn legacy_oauth_callback_links_existing_local_user_by_email() {
    let (app, repository, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                enabled_social_providers: vec!["google".to_string()],
                ..AuthUiConfig::default()
            },
            oauth: yoram_server::OAuthRuntimeConfig::from_providers([(
                "google",
                yoram_server::OAuthProviderRuntimeConfig {
                    authorization_url: "https://accounts.example/o/oauth2/auth".to_string(),
                    client_id: "google-client".to_string(),
                    client_secret: "google-secret".to_string(),
                    scope: "profile email".to_string(),
                    ..Default::default()
                },
            )]),
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let existing = repository
        .create_user(yoram_persistence::CreateUserInput {
            display_name: "Existing Door".to_string(),
            email_address: "door@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "door".to_string(),
            password_hash: bcrypt::hash("doorpass1", bcrypt::DEFAULT_COST).unwrap(),
        })
        .await
        .unwrap();
    repository
        .set_default_landing_path(existing.id, Some("notifications".to_string()))
        .await
        .unwrap();
    let (state, state_cookie_header) = oauth_start_state(&app, "google").await;

    let callback = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/authenticate/google?providerUserId=google-door&email=door@example.com&name=Google%20Door&state={state}"))
                .header(http::header::COOKIE, state_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(callback.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        callback
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/notifications")
    );

    let user = repository
        .find_user_by_identifier("door@example.com")
        .await
        .unwrap()
        .expect("existing user");
    assert_eq!(user.id, existing.id);
    assert_eq!(user.login_id, "door");

    let callback_cookie_header = cookie_header_from_set_cookie_response(&callback);
    let workspace = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadWorkspaceOverview")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, callback_cookie_header)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_str(&response_text(workspace).await).unwrap();
    assert_eq!(
        payload
            .pointer("/profile/connectedSocialProviders")
            .and_then(|value| value.as_array())
            .map(|providers| providers
                .iter()
                .filter_map(|provider| provider.as_str())
                .collect::<Vec<_>>()),
        Some(vec!["google"])
    );
}

#[tokio::test]
// Guards OAuth state CSRF closure: a callback without a state param (no start round trip) is
// denied, no session cookie is issued, and no local user or linked_account row is persisted.
async fn legacy_oauth_callback_without_state_is_denied_without_session_or_linked_account() {
    let (app, repository, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                enabled_social_providers: vec!["github".to_string()],
                ..AuthUiConfig::default()
            },
            oauth: yoram_server::OAuthRuntimeConfig::from_providers([(
                "github",
                yoram_server::OAuthProviderRuntimeConfig {
                    authorization_url: "https://github.example/login/oauth/authorize".to_string(),
                    client_id: "github-client".to_string(),
                    client_secret: "github-secret".to_string(),
                    scope: "user:email".to_string(),
                    ..Default::default()
                },
            )]),
            ..AppRuntimeConfig::default()
        },
    )
    .await;

    let callback = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/authenticate/github?providerUserId=evil-1&email=evil@example.com&name=Evil")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(callback.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        callback
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/users/loginform?error=oauthDenied&provider=github")
    );
    let set_cookies = set_cookie_headers(&callback);
    assert!(
        set_cookies
            .iter()
            .all(|cookie| !cookie.starts_with("yona_session=")),
        "denied callback must not issue a session cookie: {set_cookies:?}"
    );
    assert!(
        repository
            .find_user_by_identifier("evil@example.com")
            .await
            .unwrap()
            .is_none(),
        "denied callback must not create a local user"
    );
    let provider_rows = linked_account::Entity::find()
        .filter(linked_account::Column::ProviderKey.eq("github"))
        .all(&db)
        .await
        .unwrap();
    assert!(
        provider_rows.is_empty(),
        "denied callback must not persist a linked account"
    );
}

#[tokio::test]
// Guards OAuth state CSRF closure: a callback whose state does not match the start-issued cookie
// is denied even when the identity-hook parameters are present.
async fn legacy_oauth_callback_with_mismatched_state_is_denied() {
    let (app, _, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                enabled_social_providers: vec!["github".to_string()],
                ..AuthUiConfig::default()
            },
            oauth: yoram_server::OAuthRuntimeConfig::from_providers([(
                "github",
                yoram_server::OAuthProviderRuntimeConfig {
                    authorization_url: "https://github.example/login/oauth/authorize".to_string(),
                    client_id: "github-client".to_string(),
                    client_secret: "github-secret".to_string(),
                    scope: "user:email".to_string(),
                    ..Default::default()
                },
            )]),
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (_, state_cookie_header) = oauth_start_state(&app, "github").await;

    let callback = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/authenticate/github?providerUserId=evil-1&email=evil@example.com&name=Evil&state=attacker-chosen-state")
                .header(http::header::COOKIE, state_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(callback.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        callback
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/users/loginform?error=oauthDenied&provider=github")
    );
    let set_cookies = set_cookie_headers(&callback);
    assert!(
        set_cookies
            .iter()
            .all(|cookie| !cookie.starts_with("yona_session=")),
        "mismatched-state callback must not issue a session cookie: {set_cookies:?}"
    );
}

#[tokio::test]
// Guards that the query-identity callback hook stays usable with a valid start-issued state:
// login succeeds and the provider shows in the connectedSocialProviders projection.
async fn legacy_oauth_callback_identity_hook_works_with_valid_state() {
    let (app, _, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                enabled_social_providers: vec!["github".to_string()],
                ..AuthUiConfig::default()
            },
            oauth: yoram_server::OAuthRuntimeConfig::from_providers([(
                "github",
                yoram_server::OAuthProviderRuntimeConfig {
                    authorization_url: "https://github.example/login/oauth/authorize".to_string(),
                    client_id: "github-client".to_string(),
                    client_secret: "github-secret".to_string(),
                    scope: "user:email".to_string(),
                    ..Default::default()
                },
            )]),
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    let (state, state_cookie_header) = oauth_start_state(&app, "github").await;

    let callback = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/authenticate/github?providerUserId=hook-1&email=hook@example.com&name=Hook%20User&state={state}"))
                .header(http::header::COOKIE, state_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(callback.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        callback
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/")
    );
    let callback_cookie_header = cookie_header_from_set_cookie_response(&callback);

    let workspace = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadWorkspaceOverview")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, callback_cookie_header)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(workspace.status(), StatusCode::OK);
    let payload: serde_json::Value = serde_json::from_str(&response_text(workspace).await).unwrap();
    assert_eq!(
        payload
            .pointer("/profile/connectedSocialProviders")
            .and_then(|value| value.as_array())
            .map(|providers| providers
                .iter()
                .filter_map(|provider| provider.as_str())
                .collect::<Vec<_>>()),
        Some(vec!["github"])
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
// Guards auth route-owned session/sign-in/sign-out helpers plus service-snapshot auth capability adapters.
async fn rest_auth_routes_round_trip_with_shared_session_and_error_envelope() {
    let (app, _, db) = build_auth_router().await;
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
    assert_eq!(
        site_admin::Entity::find().all(&db).await.unwrap().len(),
        1,
        "first registered user should become the initial site admin"
    );

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

    let bootstrap_session = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/auth/session")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(bootstrap_session.status(), StatusCode::OK);
    let bootstrap_session_json = response_text(bootstrap_session).await;
    assert!(bootstrap_session_json.contains("\"loginId\":\"door\""));

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
async fn secret_admin_setup_rest_updates_legacy_default_admin_and_form_post_is_not_a_mutation() {
    let (app, _repo, db) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let capabilities_before_setup = app
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
    assert_eq!(capabilities_before_setup.status(), StatusCode::OK);
    let capabilities_before_setup_json: serde_json::Value =
        serde_json::from_str(&response_text(capabilities_before_setup).await).unwrap();
    assert_eq!(capabilities_before_setup_json["secretSetupRequired"], true);

    let rest_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/secret")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"name\":\"Root Admin\",\"emailAddress\":\"root@example.com\",\"password\":\"rootpass1\",\"retypedPassword\":\"rootpass1\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(rest_response.status(), StatusCode::OK);
    let rest_json: serde_json::Value =
        serde_json::from_str(&response_text(rest_response).await).unwrap();
    assert_eq!(rest_json["restartPath"], "/restart");

    let admin = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("admin".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("default admin user");
    assert_eq!(admin.name.as_deref(), Some("Root Admin"));
    assert_eq!(admin.email.as_deref(), Some("root@example.com"));
    assert_eq!(admin.state.as_deref(), Some("active"));
    assert!(bcrypt::verify("rootpass1", admin.password.as_deref().unwrap()).unwrap());
    assert_eq!(
        site_admin::Entity::find()
            .filter(site_admin::Column::AdminId.eq(Some(admin.id)))
            .all(&db)
            .await
            .unwrap()
            .len(),
        1
    );

    let form_post_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/secret")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from(
                    "loginId=admin&name=Fallback+Admin&email=fallback%40example.com&password=fallback1&retypedPassword=fallback1",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(form_post_response.status(), StatusCode::METHOD_NOT_ALLOWED);

    let admin_after_form_post = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("admin".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("default admin user after form post");
    assert_eq!(admin_after_form_post.name.as_deref(), Some("Root Admin"));
    assert_eq!(
        admin_after_form_post.email.as_deref(),
        Some("root@example.com")
    );
    assert!(bcrypt::verify(
        "rootpass1",
        admin_after_form_post.password.as_deref().unwrap()
    )
    .unwrap());

    let capabilities_after_setup = app
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
    assert_eq!(capabilities_after_setup.status(), StatusCode::OK);
    let capabilities_after_setup_json: serde_json::Value =
        serde_json::from_str(&response_text(capabilities_after_setup).await).unwrap();
    assert_eq!(capabilities_after_setup_json["secretSetupRequired"], false);

    let configured_secret_get = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(configured_secret_get.status(), StatusCode::NOT_FOUND);

    let configured_rest_retry = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/secret")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"name\":\"Other Admin\",\"emailAddress\":\"other@example.com\",\"password\":\"otherpass1\",\"retypedPassword\":\"otherpass1\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(configured_rest_retry.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
// Guards direct auth aliases through the app-scoped service/runtime config
// supplied by router bootstrap; no process env mutation is needed for defaults.
async fn direct_legacy_login_and_signup_form_routes_accept_legacy_form_csrf_redirect_and_authenticate(
) {
    let (app, repository, _) = build_auth_router().await;
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
        Some("/yona/")
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
    let signed_up_session_json: serde_json::Value =
        serde_json::from_str(&response_text(signed_up_session).await).unwrap();
    assert_eq!(signed_up_session_json["loginId"], "door");
    assert_eq!(signed_up_session_json["defaultLandingPath"], "/");

    let user = repository
        .find_user_by_identifier("door")
        .await
        .unwrap()
        .expect("registered user");
    repository
        .set_default_landing_path(user.id, Some("notifications".to_string()))
        .await
        .unwrap();
    let migrated_session = app
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
    assert_eq!(migrated_session.status(), StatusCode::OK);
    let migrated_session_json: serde_json::Value =
        serde_json::from_str(&response_text(migrated_session).await).unwrap();
    assert_eq!(
        migrated_session_json["defaultLandingPath"],
        "/notifications"
    );
    assert_eq!(migrated_session_json["isGuest"], false);

    let migrated_workspace = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/workspace")
                .header(http::header::COOKIE, &signup_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(migrated_workspace.status(), StatusCode::OK);
    let migrated_workspace_json: serde_json::Value =
        serde_json::from_str(&response_text(migrated_workspace).await).unwrap();
    assert_eq!(
        migrated_workspace_json["defaultLandingPath"],
        "/notifications"
    );
    assert_eq!(
        migrated_workspace_json["session"]["defaultLandingPath"],
        "/notifications"
    );

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

    let (default_csrf, default_cookie_header) = bootstrap(app.clone()).await;
    let default_redirect_login = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/users/login")
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .header(http::header::COOKIE, &default_cookie_header)
                .body(Body::from(format!(
                    "csrfToken={default_csrf}&loginIdOrEmail=door&password=doorpass1"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(default_redirect_login.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        default_redirect_login
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/notifications")
    );

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
        Some("/yona/notifications")
    );
}

#[tokio::test]
async fn direct_legacy_logout_routes_clear_session_and_redirect_to_referer() {
    // Guards auth route service-snapshot threading for the legacy logout aliases:
    // session replacement and redirect behavior must not depend on process env.
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
        .clone()
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

    let self_referer_logout = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/users/logout")
                .header(http::header::COOKIE, &logout_cookie_header)
                .header(http::header::REFERER, "/yona/users/logout")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(self_referer_logout.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        self_referer_logout
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/")
    );
}

#[tokio::test]
// Guards the auth route-owned verify helper through REST verification.
async fn rest_verify_user_confirms_pending_signup() {
    let _outbox_guard = auth_outbox_lock().lock().unwrap();
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
    let _outbox_guard = auth_outbox_lock().lock().unwrap();
    clear_test_outbox();

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
}

#[tokio::test]
// Guards the auth route-owned register helper through REST registration.
async fn register_with_email_verification_creates_signup_verification_and_mail_delivery() {
    let _outbox_guard = auth_outbox_lock().lock().unwrap();
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
async fn register_email_verification_uses_runtime_smtp_sender_without_env_mutation() {
    let _outbox_guard = auth_outbox_lock().lock().unwrap();
    clear_test_outbox();

    let (app, _, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            auth_ui: AuthUiConfig {
                email_verification_enabled: true,
                ..AuthUiConfig::default()
            },
            smtp: SmtpRuntimeConfig {
                from: "startup-sender@example.com".to_string(),
                ..SmtpRuntimeConfig::default()
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
    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].from, "startup-sender@example.com");
    assert_eq!(outbox[0].to, "door@example.com");
}

#[tokio::test]
// Guards service-owned `_pilot` auth delegates and route-owned auth helpers.
async fn register_sign_in_sign_out_and_current_session_round_trip() {
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
async fn auth_session_persists_legacy_preferred_language_from_request_context() {
    let (app, _, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            supported_languages: vec![
                "ko-KR".to_string(),
                "en-US".to_string(),
                "ja-JP".to_string(),
            ],
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
                .header(http::header::ACCEPT_LANGUAGE, "fr-FR, ko;q=0.9, en-US;q=0.8")
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);
    let authenticated_cookie_header = cookie_header_from_set_cookie_response(&register);

    let user = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("door".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("registered user");
    assert_eq!(user.lang.as_deref(), Some("ko-KR"));

    let current = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/session")
                .header(
                    http::header::COOKIE,
                    format!("PLAY_LANG=ja-JP; {authenticated_cookie_header}"),
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(current.status(), StatusCode::OK);

    let user = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("door".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("registered user");
    assert_eq!(user.lang.as_deref(), Some("ja-JP"));
}

#[tokio::test]
async fn remember_me_controls_session_cookie_persistence() {
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

const LEGACY_PASSWORD_HASH: &str = "r0egKhZzB4AkoXUp9kRF1BNxv9LWeaLAhV0yhz1lgmU=";
const LEGACY_PASSWORD_SALT: &str = "c2FsdC1mb3ItdGVzdA==";

async fn seed_legacy_password_user(
    repository: &AppRepository,
    db: &DatabaseConnection,
    login_id: &str,
) {
    let user = repository
        .create_user(yoram_persistence::CreateUserInput {
            display_name: "Legacy User".to_string(),
            email_address: format!("{login_id}@example.com"),
            is_confirmed: true,
            is_site_admin: false,
            login_id: login_id.to_string(),
            password_hash: LEGACY_PASSWORD_HASH.to_string(),
        })
        .await
        .expect("create legacy user");
    let model = n4user::Entity::find_by_id(user.id)
        .one(db)
        .await
        .expect("find legacy user")
        .expect("legacy user model");
    let mut active = n4user::ActiveModel::from(model);
    active.password_salt = Set(Some(LEGACY_PASSWORD_SALT.to_string()));
    active.update(db).await.expect("store legacy password salt");
}

#[tokio::test]
async fn legacy_sha256_login_preserves_hash_by_default_and_hides_hash_errors() {
    let (app, repository, db) = build_auth_router().await;
    seed_legacy_password_user(&repository, &db, "legacy-default").await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let failed = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"identifier\":\"legacy-default\",\"password\":\"wrong\",\"rememberMe\":false}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(failed.status(), StatusCode::UNAUTHORIZED);
    let failed_body = response_text(failed).await;
    assert!(failed_body.contains("user.login.invalid"));
    assert!(!failed_body.contains(LEGACY_PASSWORD_HASH));

    let sign_in = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"identifier\":\"legacy-default\",\"password\":\"pass\",\"rememberMe\":false}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_in.status(), StatusCode::OK);

    let user = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("legacy-default".to_string())))
        .one(&db)
        .await
        .expect("read default migration user")
        .expect("default migration user");
    assert_eq!(user.password.as_deref(), Some(LEGACY_PASSWORD_HASH));
    assert_eq!(user.password_salt.as_deref(), Some(LEGACY_PASSWORD_SALT));
}

#[tokio::test]
async fn legacy_sha256_login_silently_migrates_to_argon2id_when_enabled() {
    let (app, repository, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            password_hashing_silent_migration_to_argon2id: true,
            ..AppRuntimeConfig::default()
        },
    )
    .await;
    seed_legacy_password_user(&repository, &db, "legacy-argon2").await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let sign_in = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"identifier\":\"legacy-argon2\",\"password\":\"pass\",\"rememberMe\":false}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sign_in.status(), StatusCode::OK);

    let user = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("legacy-argon2".to_string())))
        .one(&db)
        .await
        .expect("read migrated user")
        .expect("migrated user");
    assert!(user
        .password
        .as_deref()
        .is_some_and(|hash| hash.starts_with("$argon2id$")));
    assert_eq!(user.password_salt, None);
}

#[tokio::test]
async fn register_rejects_duplicate_login_id_and_email() {
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
    let (app, repository, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            site_name: "Legacy Yona".to_string(),
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
    let (app, _, db) = build_auth_router_with_configs(
        true,
        AppRuntimeConfig::default(),
        RepositoryConfig::from_pairs([("YONA_GUEST_LOGIN_PREFIX", "guest_, pt-")]),
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
                .body(Body::from("{\"loginId\":\"PT-door\",\"name\":\"Guest Door\",\"emailAddress\":\"pt-door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(register.status(), StatusCode::OK);
    let registered_session: serde_json::Value =
        serde_json::from_str(&response_text(register).await).unwrap();
    assert_eq!(registered_session["isGuest"], true);
    let registered_user = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("pt-door".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("registered guest-prefix user");
    assert_eq!(registered_user.is_guest, Some(1));
}

#[tokio::test]
async fn ldap_sign_in_provisions_fixture_user_and_guest_prefix() {
    let ldap = LdapRuntimeConfig {
        enabled: true,
        fixture_users: vec![LdapFixtureUser {
            department: "QA".to_string(),
            display_name: "PT Door".to_string(),
            email: "pt-door@example.com".to_string(),
            english_name: "Peter".to_string(),
            login_id: "PT-door".to_string(),
            password: "ldap-pass".to_string(),
        }],
        ..LdapRuntimeConfig::default()
    };
    let (app, _repo, db) = build_auth_router_with_configs(
        true,
        AppRuntimeConfig {
            ldap,
            ..AppRuntimeConfig::default()
        },
        RepositoryConfig::from_pairs([("YONA_GUEST_LOGIN_PREFIX", "pt-")]),
    )
    .await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
                .header("content-type", "application/json")
                .header("cookie", cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from(
                    "{\"identifier\":\"pt-door\",\"password\":\"ldap-pass\",\"rememberMe\":false}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response_text(response).await;
    assert!(body.contains("\"loginId\":\"pt-door\""));
    let created = n4user::Entity::find()
        .filter(n4user::Column::Email.eq(Some("pt-door@example.com".to_string())))
        .one(&db)
        .await
        .expect("query user")
        .expect("ldap-provisioned user");
    assert_eq!(created.name.as_deref(), Some("PT Door [QA]"));
    assert_eq!(created.is_guest, Some(1));
    assert!(bcrypt::verify("ldap-pass", created.password.as_deref().unwrap()).unwrap());
}

#[tokio::test]
async fn ldap_sign_in_uses_email_base_login_and_updates_existing_local_user() {
    let ldap = LdapRuntimeConfig {
        enabled: true,
        use_email_base_login: true,
        fixture_users: vec![LdapFixtureUser {
            department: "Ops".to_string(),
            display_name: "Directory Door".to_string(),
            email: "door@example.com".to_string(),
            english_name: "Directory English".to_string(),
            login_id: "pt-door".to_string(),
            password: "new-ldap-pass".to_string(),
        }],
        ..LdapRuntimeConfig::default()
    };
    let (app, _repo, db) = build_auth_router_with_configs(
        true,
        AppRuntimeConfig {
            ldap,
            ..AppRuntimeConfig::default()
        },
        RepositoryConfig::from_pairs([("YONA_GUEST_LOGIN_PREFIX", "pt-")]),
    )
    .await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/register")
                .header("content-type", "application/json")
                .header("cookie", cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"oldpass1\",\"retypedPassword\":\"oldpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);
    let registered = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("door".to_string())))
        .one(&db)
        .await
        .expect("query registered user")
        .expect("registered local user");
    let mut registered_active = n4user::ActiveModel::from(registered);
    registered_active.english_name = Set(Some("Old English".to_string()));
    registered_active.is_guest = Set(Some(0));
    registered_active.update(&db).await.unwrap();
    let (login_csrf, login_cookie_header) = bootstrap(app.clone()).await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
                .header("content-type", "application/json")
                .header("cookie", login_cookie_header)
                .header("x-csrf-token", login_csrf)
                .body(Body::from(
                    "{\"identifier\":\"door\",\"password\":\"new-ldap-pass\",\"rememberMe\":false}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let updated = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some("door".to_string())))
        .one(&db)
        .await
        .expect("query user")
        .expect("updated local user");
    assert_eq!(updated.name.as_deref(), Some("Directory Door [Ops]"));
    assert_eq!(updated.email.as_deref(), Some("door@example.com"));
    assert_eq!(updated.english_name.as_deref(), Some("Directory English"));
    assert_eq!(updated.is_guest, Some(1));
    assert!(bcrypt::verify("new-ldap-pass", updated.password.as_deref().unwrap()).unwrap());
}

#[tokio::test]
async fn ldap_sign_in_falls_back_to_local_password_when_configured() {
    let ldap = LdapRuntimeConfig {
        enabled: true,
        fallback_to_local_login: true,
        ..LdapRuntimeConfig::default()
    };
    let (app, _repo, _db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            ldap,
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
                .header("content-type", "application/json")
                .header("cookie", cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);
    let (login_csrf, login_cookie_header) = bootstrap(app.clone()).await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/sign-in")
                .header("content-type", "application/json")
                .header("cookie", login_cookie_header)
                .header("x-csrf-token", login_csrf)
                .body(Body::from(
                    "{\"identifier\":\"door\",\"password\":\"doorpass1\",\"rememberMe\":false}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response_text(response).await;
    assert!(body.contains("\"loginId\":\"door\""));
}

#[tokio::test]
async fn direct_lost_password_and_reset_password_routes_round_trip() {
    // Guards route-utils-owned password reset mail helper and absolute reset URL composition.
    let _outbox_guard = auth_outbox_lock().lock().unwrap();
    clear_test_outbox();
    let (app, repository, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            site_name: "Yona Test".to_string(),
            smtp: SmtpRuntimeConfig {
                from: "reset-sender@example.com".to_string(),
                ..SmtpRuntimeConfig::default()
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
    assert_eq!(outbox[0].from, "reset-sender@example.com");
    assert_eq!(outbox[0].to, "door@example.com");
    assert_eq!(outbox[0].bcc, Vec::<String>::new());
    assert_eq!(outbox[0].reply_to, None);
    assert!(!outbox[0].html);

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
}

#[tokio::test]
async fn rest_password_reset_routes_round_trip() {
    let _outbox_guard = auth_outbox_lock().lock().unwrap();
    clear_test_outbox();
    let (app, repository, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            site_name: "Yona Test".to_string(),
            smtp: SmtpRuntimeConfig {
                from: "reset-sender@example.com".to_string(),
                ..SmtpRuntimeConfig::default()
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
                .uri("/yona/api/v1/auth/password-reset/request")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"loginId\":\"door\",\"emailAddress\":\"door@example.com\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(request_reset.status(), StatusCode::OK);
    let request_payload: serde_json::Value =
        serde_json::from_str(&response_text(request_reset).await).unwrap();
    assert_eq!(
        request_payload
            .get("redirectPath")
            .and_then(|value| value.as_str()),
        Some("/lostPassword?requested=1")
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

    let reset_password = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/auth/password-reset/complete")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!(
                    "{{\"hashString\":\"{reset_code}\",\"password\":\"renewpass1\",\"retypedPassword\":\"renewpass1\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(reset_password.status(), StatusCode::OK);
    let reset_payload: serde_json::Value =
        serde_json::from_str(&response_text(reset_password).await).unwrap();
    assert_eq!(
        reset_payload
            .get("redirectPath")
            .and_then(|value| value.as_str()),
        Some("/users/loginform?password=reset")
    );

    let user = repository
        .find_user_by_identifier("door")
        .await
        .unwrap()
        .expect("user after reset");
    assert!(bcrypt::verify("renewpass1", &user.password_hash).unwrap());
}

#[tokio::test]
async fn direct_email_validation_send_and_confirm_routes_round_trip() {
    // Guards route-utils-owned workspace email validation mail helper and confirmation URL.
    let _outbox_guard = auth_outbox_lock().lock().unwrap();
    clear_test_outbox();
    let (app, repository, db) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            smtp: SmtpRuntimeConfig {
                from: "workspace-sender@example.com".to_string(),
                ..SmtpRuntimeConfig::default()
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
    assert_eq!(outbox[0].from, "workspace-sender@example.com");
    assert_eq!(outbox[0].to, "pending@example.com");
    assert_eq!(outbox[0].bcc, Vec::<String>::new());
    assert_eq!(outbox[0].reply_to, None);
    assert!(!outbox[0].html);
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
// Guards the auth route-owned verify helper through the api adapter.
async fn verify_user_activates_pending_account_and_rejects_invalid_or_expired_links() {
    let _outbox_guard = auth_outbox_lock().lock().unwrap();
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
// Guards direct workspace profile/email aliases through the app-scoped
// service/runtime config supplied by router bootstrap.
async fn direct_legacy_profile_and_email_routes_accept_form_csrf_redirect_and_mutate_workspace_state(
) {
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
// Guards direct workspace email delete/main aliases through the app-scoped
// service/runtime config supplied by router bootstrap.
async fn direct_legacy_email_delete_and_set_main_routes_redirect_and_mutate_email_state() {
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
// Guards direct visited-list reset through the app-scoped service/runtime config
// supplied by router bootstrap.
async fn direct_legacy_reset_visited_and_default_login_page_routes_match_workspace_state() {
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
    assert!(yoram_persistence::recent_project::Entity::find()
        .filter(yoram_persistence::recent_project::Column::UserId.eq(Some(user.id)))
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

    let relative_set_default = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/user/defultLoginPage?path=notifications")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(relative_set_default.status(), StatusCode::OK);
    let relative_set_default_json = response_text(relative_set_default).await;
    assert!(relative_set_default_json.contains("\"defaultLoginPage\":\"/notifications\""));
    assert_eq!(
        repository
            .read_default_landing_path(user.id)
            .await
            .unwrap()
            .as_deref(),
        Some("/notifications")
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
async fn direct_legacy_usermenu_tab_content_list_returns_workspace_api_payload() {
    // Guards workspace sidebar/usermenu service-snapshot threading for the
    // authenticated legacy fragment route.
    let (app, repository, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            site_name: "Legacy Yona".to_string(),
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
                .uri("/yona/user/usermenuTabContentList")
                .header(http::header::ACCEPT, "text/html")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get(http::header::LOCATION).is_none());
    let content_type = response
        .headers()
        .get(http::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    assert!(content_type.starts_with("application/json"));
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(payload["profile"]["loginId"], "door");
    assert!(payload["recentProjects"]
        .as_array()
        .unwrap()
        .iter()
        .any(|project| project["ownerName"] == "door" && project["projectName"] == "projectYobi"));

    let anonymous_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/user/usermenuTabContentList")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(anonymous_response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn direct_legacy_user_sidebar_returns_api_payload() {
    // Guards the legacy sidebar/usermenu direct route as React-owned API data,
    // while preserving the old framed target path/hash metadata.
    let (app, repository, _) = build_auth_router_with_anonymous_access_and_app_config(
        true,
        AppRuntimeConfig {
            site_name: "Legacy Yona".to_string(),
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
                .header(http::header::ACCEPT, "text/html")
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
        Some("application/json")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(payload["siteName"], "Legacy Yona");
    assert_eq!(
        payload["iframePath"],
        "/yona/door/projectYobi/issue/1#comment-7"
    );
    assert_eq!(payload["workspace"]["profile"]["loginId"], "door");
    assert!(payload["workspace"]["recentProjects"]
        .as_array()
        .unwrap()
        .iter()
        .any(|project| project["ownerName"] == "door" && project["projectName"] == "projectYobi"));

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
    assert_eq!(
        anonymous_response
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("application/json")
    );
    let anonymous_body = anonymous_response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let anonymous_payload: serde_json::Value = serde_json::from_slice(&anonymous_body).unwrap();
    assert_eq!(anonymous_payload["siteName"], "Legacy Yona");
    assert_eq!(anonymous_payload["iframePath"], "/yona/notifications");
    assert!(anonymous_payload.get("workspace").is_none());
}

#[tokio::test]
// Guards direct password reset through the app-scoped service/runtime config
// supplied by router bootstrap.
async fn direct_legacy_user_reset_password_route_logs_out_and_accepts_new_password() {
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
// Guards workspace route-owned settings/password helpers through REST and API routes.
async fn workspace_settings_mutations_round_trip_through_workspace_overview() {
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
    assert!(workspace_overview_json.contains("\"defaultLandingPath\":\"/\""));

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
    let (app, repository, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    // The first registered user is promoted to site admin; register one first
    // so "door" stays a regular user and the 403/private branches are live.
    let register_admin = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"admin\",\"name\":\"Admin\",\"emailAddress\":\"admin@test.me\",\"password\":\"adminpass1\",\"retypedPassword\":\"adminpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register_admin.status(), StatusCode::OK);

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
// Guards workspace route-owned overview/default-landing helpers through api adapters.
async fn workspace_overview_reads_and_updates_default_landing() {
    let (app, repository, db) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    // The first registered user is promoted to site admin; register one first
    // so "door" stays a regular user and private content stays hidden.
    let register_admin = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"admin\",\"name\":\"Admin\",\"emailAddress\":\"admin@test.me\",\"password\":\"adminpass1\",\"retypedPassword\":\"adminpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register_admin.status(), StatusCode::OK);

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
    assert!(overview_json.contains("\"defaultLandingPath\":\"/\""));

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
