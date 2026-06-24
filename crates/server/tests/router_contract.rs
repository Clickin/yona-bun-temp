use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{Database, DatabaseConnection};
use std::fs;
use tower::ServiceExt;
use yoram_persistence::AppRepository;
use yoram_migration::Migrator;
use yoram_server::{
    create_router, create_router_with_filesystem_assets,
    create_router_with_repository_and_app_config,
    create_router_with_repository_and_filesystem_assets_and_app_config, AppRuntimeConfig,
    AuthUiConfig, RuntimeConfig,
};

async fn build_app_with_repository() -> (axum::Router, AppRepository, DatabaseConnection) {
    build_app_with_repository_and_app_config(AppRuntimeConfig::default()).await
}

async fn build_app_with_repository_and_app_config(
    app_config: AppRuntimeConfig,
) -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());
    let app = create_router_with_repository_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
        app_config,
    );

    (app, app_repo, db)
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

async fn register_user(app: axum::Router, login_id: &str) -> String {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from(format!(
                    "{{\"loginId\":\"{login_id}\",\"name\":\"{login_id}\",\"emailAddress\":\"{login_id}@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    cookie_header
}

#[tokio::test]
// Guards asset-owned legacy API root fallback to the application index.
async fn legacy_external_api_roots_fall_back_to_application_index() {
    let asset_root = std::env::temp_dir().join(format!(
        "yona-legacy-api-index-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos()
    ));
    fs::create_dir_all(&asset_root).expect("asset root");
    fs::write(
        asset_root.join("index.html"),
        "<!doctype html><html><head></head><body><main id=\"root\">legacy index</main></body></html>",
    )
    .expect("index html");

    let app = create_router_with_filesystem_assets(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        asset_root.clone(),
    );

    for path in ["/yona/-_-api", "/yona/-_-api/v1/"] {
        let response = app
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

        assert_eq!(response.status(), StatusCode::OK, "{path}");
        let content_type = response
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .unwrap_or_default()
            .to_string();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let html = String::from_utf8(body.to_vec()).unwrap();
        assert_eq!(content_type, "text/html; charset=utf-8");
        assert!(html.contains("legacy index"), "{path}: {html}");
        assert!(
            html.contains("window.__YONA_RUNTIME_CONFIG__"),
            "{path}: {html}"
        );
        assert!(html.contains(r#""basePath":"/yona""#), "{path}: {html}");
    }

    fs::remove_dir_all(asset_root).expect("asset cleanup");
}

#[tokio::test]
async fn legacy_root_post_fake_route_returns_bad_request() {
    let app = create_router(RuntimeConfig {
        allow_anonymous_access: true,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert!(body.is_empty());
}

#[tokio::test]
async fn mounts_session_bootstrap_under_base_path() {
    let app = create_router(RuntimeConfig {
        allow_anonymous_access: true,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

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

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
// Guards router-owned session/bootstrap assembly plus route-utils-owned public-origin normalization.
async fn session_bootstrap_issues_cookies_and_csrf_header() {
    let app = create_router(RuntimeConfig {
        allow_anonymous_access: true,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

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

    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get("x-csrf-token").is_some());

    let cookies: Vec<String> = response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().to_string())
        .collect();
    assert!(cookies
        .iter()
        .any(|cookie| cookie.starts_with("yona_session=")));
    assert!(cookies
        .iter()
        .any(|cookie| cookie.starts_with("yona_csrf_token=")));
    assert!(cookies.iter().all(|cookie| cookie.contains("Path=/yona")));

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"session\":null"));
    assert!(json.contains("\"user\":null"));
}

#[tokio::test]
// Guards the service-owned `_pilot` current-session delegate and auth route helper.
async fn read_current_session_works_over_connect_json() {
    let app = create_router(RuntimeConfig {
        allow_anonymous_access: true,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadCurrentSession")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
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
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"isAnonymous\":true"));
    assert!(json.contains("\"defaultLandingPath\":\"/me\""));
    let json: serde_json::Value = serde_json::from_str(&json).unwrap();
    assert_eq!(json["isAnonymous"], true);
    assert_eq!(json["defaultLandingPath"], "/me");
}

#[tokio::test]
async fn list_projects_works_over_connect_json() {
    let app = create_router(RuntimeConfig {
        allow_anonymous_access: true,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ListProjects")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"ownerName\":\"pilot\""));
    assert!(json.contains("\"projectName\":\"yona\""));
    assert!(json.contains("\"projectScope\":\"public\""));
}

#[tokio::test]
async fn list_organizations_works_over_connect_json() {
    let app = create_router(RuntimeConfig {
        allow_anonymous_access: true,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ListOrganizations")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"organizationName\":\"pilot\""));
    assert!(json.contains("\"description\":\"Pilot organization directory route"));
}

#[tokio::test]
// Guards issue route-owned detail helper and no-repository pilot fallback status mapping.
async fn read_issue_detail_applies_the_go_pilot_status_contract() {
    let app = create_router(RuntimeConfig {
        allow_anonymous_access: true,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let invalid = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadIssueDetail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    "{\"ownerName\":\"pilot\",\"projectName\":\"yona\",\"issueNumber\":\"0\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);

    let missing = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadIssueDetail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    "{\"ownerName\":\"missing\",\"projectName\":\"yona\",\"issueNumber\":\"1\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
// Guards state-owned Context/ConnectError through session and CSRF mutation rejection.
async fn update_issue_state_requires_bootstrapped_csrf() {
    let app = create_router(RuntimeConfig {
        allow_anonymous_access: true,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let unauthorized = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateIssueState")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{\"ownerName\":\"pilot\",\"projectName\":\"yona\",\"issueNumber\":\"1\",\"state\":\"closed\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(unauthorized.status(), StatusCode::UNAUTHORIZED);

    let bootstrap = app
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
    let csrf = bootstrap
        .headers()
        .get("x-csrf-token")
        .unwrap()
        .to_str()
        .unwrap()
        .to_string();
    let cookies: Vec<String> = bootstrap
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
    let cookie_header = cookies.join("; ");

    let forbidden = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateIssueState")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", "wrong-csrf")
                .body(Body::from("{\"ownerName\":\"pilot\",\"projectName\":\"yona\",\"issueNumber\":\"1\",\"state\":\"closed\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let success = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateIssueState")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from("{\"ownerName\":\"pilot\",\"projectName\":\"yona\",\"issueNumber\":\"1\",\"state\":\"closed\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(success.status(), StatusCode::OK);
    let body = success.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"state\":\"closed\""));
}

#[tokio::test]
async fn legacy_migration_root_returns_disabled_react_shell_not_server_html() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db);
    let asset_root = std::env::temp_dir().join(format!(
        "yona-migration-index-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos()
    ));
    fs::create_dir_all(&asset_root).expect("asset root");
    fs::write(
        asset_root.join("index.html"),
        "<!doctype html><html><head></head><body><main id=\"root\">legacy index</main></body></html>",
    )
    .expect("index html");
    let app = create_router_with_repository_and_filesystem_assets_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo,
        asset_root.clone(),
        AppRuntimeConfig {
            site_name: "Legacy Yona".to_string(),
            ..AppRuntimeConfig::default()
        },
    );
    let cookie_header = register_user(app.clone(), "migrator").await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/migration")
                .header(http::header::COOKIE, cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    let content_type = response
        .headers()
        .get(http::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    assert!(content_type.contains("text/html"));
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let html = String::from_utf8(body.to_vec()).unwrap();
    assert!(html.contains("legacy index"));
    assert!(html.contains("window.__YONA_RUNTIME_CONFIG__"));
    assert!(html.contains(r#""siteName":"Legacy Yona""#));
    assert!(!html.contains("yobi-migration"));

    fs::remove_dir_all(asset_root).expect("asset cleanup");
}

#[tokio::test]
// Guards runtime_config registry DI across REST and app route assembly.
async fn runtime_config_registry_scopes_app_config_without_env_mutation() {
    // Guards auth capability route assembly reading the per-router service snapshot,
    // without a RuntimeRegistry argument on REST route registration.
    let (app, _, _) = build_app_with_repository_and_app_config(AppRuntimeConfig {
        auth_ui: AuthUiConfig {
            login_id_placeholder: "registry-login".to_string(),
            password_placeholder: "registry-password".to_string(),
            ..AuthUiConfig::default()
        },
        site_name: "Registry Yona".to_string(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (other_app, _, _) = build_app_with_repository_and_app_config(AppRuntimeConfig {
        auth_ui: AuthUiConfig {
            login_id_placeholder: "other-login".to_string(),
            password_placeholder: "other-password".to_string(),
            ..AuthUiConfig::default()
        },
        site_name: "Other Yona".to_string(),
        ..AppRuntimeConfig::default()
    })
    .await;

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
    let body = capabilities.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["loginIdPlaceholder"], "registry-login");
    assert_eq!(json["passwordPlaceholder"], "registry-password");
    let other_capabilities = other_app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/auth/capabilities")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(other_capabilities.status(), StatusCode::OK);
    let body = other_capabilities
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["loginIdPlaceholder"], "other-login");
    assert_eq!(json["passwordPlaceholder"], "other-password");

    let cookie_header = register_user(app.clone(), "registry").await;
    let migration = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/migration")
                .header(http::header::COOKIE, cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(migration.status(), StatusCode::FORBIDDEN);
    let body = migration.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["message"], "error.forbidden.or.not.allowed");
}

#[tokio::test]
async fn legacy_migration_requires_login_when_anonymous_access_is_disabled() {
    let app = create_router(RuntimeConfig {
        allow_anonymous_access: false,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/migration")
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
        .unwrap_or_default();
    assert_eq!(location, "/yona/users/loginform?redirectUrl=%2Fmigration");
}

#[tokio::test]
// Guards the route-utils-owned custom forbidden REST error constructor.
async fn legacy_migration_export_paths_stay_disabled_json_surface() {
    let (app, _, _) = build_app_with_repository().await;
    let cookie_header = register_user(app.clone(), "migration-exporter").await;

    for path in [
        "/yona/migration/projects",
        "/yona/migration/owner/projects/project",
        "/yona/migration/owner/projects/project/labels",
        "/yona/migration/owner/projects/project/issuelabel",
        "/yona/migration/owner/projects/project/milestones",
        "/yona/migration/owner/projects/project/issues",
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri(path)
                    .header(http::header::COOKIE, &cookie_header)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::FORBIDDEN, "{path}");
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(payload["error"]["code"], "forbidden", "{path}");
        assert_eq!(
            payload["error"]["message"], "error.forbidden.or.not.allowed",
            "{path}"
        );
    }
}
