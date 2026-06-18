use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{Database, DatabaseConnection};
use std::fs;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router, create_router_with_app_repository, create_router_with_filesystem_assets,
    RuntimeConfig,
};

async fn build_app_with_repository() -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());
    let app = create_router_with_app_repository(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
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
async fn legacy_migration_root_returns_disabled_shell_not_spa_fallback() {
    let (app, _, _) = build_app_with_repository().await;
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
    assert!(html.contains("yobi-migration"));
    assert!(html.contains("Yona to Github"));
    assert!(html.contains("Source 프로젝트를 선택해 주세요"));
    assert!(html.contains("Destination 프로젝트를 선택해 주세요"));
    assert!(html.contains("Migration 대상"));
    assert!(html.contains("마일스톤 옮기기"));
    assert!(html.contains("이슈 옮기기"));
    assert!(html.contains("게시글 옮기기"));
    assert!(html.contains("error.forbidden.or.not.allowed"));
    assert!(!html.contains("window.__YONA_RUNTIME_CONFIG__"));
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
