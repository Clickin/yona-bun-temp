use axum::body::Body;
use base64::{engine::general_purpose, Engine as _};
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ConnectionTrait, Database, DatabaseConnection};
use serde_json::json;
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

fn yona_data_env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn svn_tools_available() -> bool {
    Command::new("svnadmin")
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
        && Command::new("svnlook")
            .arg("--version")
            .output()
            .is_ok_and(|output| output.status.success())
}

async fn build_app_with_repository() -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());
    let app = create_router_with_app_repository(
        RuntimeConfig {
            base_path: "/yona".to_string(),
            public_origin: "http://localhost".to_string(),
        },
        app_repo.clone(),
    );

    (app, app_repo, db)
}

async fn response_json(response: Response<Body>) -> serde_json::Value {
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(status, StatusCode::OK, "{text}");
    serde_json::from_str(&text).expect("json response")
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
    let cookies = response
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
        .collect::<Vec<_>>()
        .join("; ");
    (csrf, cookies)
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    response_json(
        rest_test_support::pilot_rest(
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

async fn create_project(app: axum::Router, cookie: &str, csrf: &str, scope: &str) {
    response_json(
        rest_test_support::pilot_rest(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "overview": "SVN protocol parity",
                "projectScope": scope
            }),
        )
        .await,
    )
    .await;
}

async fn mark_project_as_svn(
    repository: &AppRepository,
    db: &DatabaseConnection,
    data_root: &std::path::Path,
) -> (i64, Option<i64>) {
    let project = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .expect("project lookup")
        .expect("project exists");
    db.execute_unprepared(&format!(
        "UPDATE \"project\" SET vcs = 'Subversion' WHERE id = {}",
        project.id
    ))
    .await
    .expect("mark project as svn");
    let repo_path = yona_rust_vcs::svn_repository_path(data_root, project.id);
    let youngest_revision = if svn_tools_available() {
        yona_rust_vcs::create_svn_repository(&repo_path).expect("seed executable svn storage");
        Some(yona_rust_vcs::svn_youngest_revision(&repo_path).expect("read youngest revision"))
    } else {
        std::fs::create_dir_all(&repo_path).expect("seed svn storage");
        None
    };
    (project.id, youngest_revision)
}

async fn direct_request(
    app: axum::Router,
    method: Method,
    path: &str,
    authorization: Option<&str>,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(format!("/yona{path}"));
    if let Some(authorization) = authorization {
        builder = builder.header(http::header::AUTHORIZATION, authorization);
    }
    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
}

fn basic(login_id: &str, password: &str) -> String {
    format!(
        "Basic {}",
        general_purpose::STANDARD.encode(format!("{login_id}:{password}"))
    )
}

#[tokio::test]
async fn svn_protocol_route_preserves_legacy_path_and_auth_boundary() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repository, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let (project_id, youngest_revision) =
        mark_project_as_svn(&repository, &db, data_dir.path()).await;

    let response = direct_request(
        app.clone(),
        Method::GET,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_IMPLEMENTED);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    assert_eq!(
        response
            .headers()
            .get("ms-author-via")
            .and_then(|value| value.to_str().ok()),
        Some("DAV")
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request(app.clone(), propfind, "/svn/owner/projectYobi", None).await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    assert_eq!(
        response
            .headers()
            .get("ms-author-via")
            .and_then(|value| value.to_str().ok()),
        Some("DAV")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:multistatus") && text.contains("<D:collection/>"),
        "SVN root PROPFIND should return a WebDAV collection multistatus: {text}"
    );
    if let Some(revision) = youngest_revision {
        assert!(
            text.contains(&format!("<D:version-name>{revision}</D:version-name>")),
            "SVN root PROPFIND should include executable-backed youngest revision metadata: {text}"
        );
    }

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    assert_eq!(
        response
            .headers()
            .get("ms-author-via")
            .and_then(|value| value.to_str().ok()),
        Some("DAV")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("/svn/owner/projectYobi/!svn/vcc/default")
            && text.contains("<D:collection/>"),
        "SVN default VCC PROPFIND should return a WebDAV collection multistatus: {text}"
    );
    if let Some(revision) = youngest_revision {
        assert!(
            text.contains(&format!("<D:version-name>{revision}</D:version-name>")),
            "SVN default VCC PROPFIND should include executable-backed youngest revision metadata: {text}"
        );
    }

    let response =
        direct_request(app.clone(), Method::OPTIONS, "/svn/owner/projectYobi", None).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    assert_eq!(
        response
            .headers()
            .get("ms-author-via")
            .and_then(|value| value.to_str().ok()),
        Some("DAV")
    );
    assert!(
        response
            .headers()
            .get(http::header::ALLOW)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|allow| {
                allow.contains("OPTIONS") && allow.contains("PROPFIND") && allow.contains("REPORT")
            }),
        "SVN OPTIONS should advertise WebDAV methods"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_IMPLEMENTED);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    assert_eq!(
        response
            .headers()
            .get("ms-author-via")
            .and_then(|value| value.to_str().ok()),
        Some("DAV")
    );

    db.execute_unprepared(&format!(
        "UPDATE \"project\" SET vcs = 'GIT' WHERE id = {project_id}"
    ))
    .await
    .expect("mark project as git");
    let response = direct_request(app, Method::GET, "/svn/owner/projectYobi", None).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn svn_protocol_private_project_uses_basic_auth_challenge() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repository, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    mark_project_as_svn(&repository, &db, data_dir.path()).await;

    let response = direct_request(app.clone(), Method::GET, "/svn/owner/projectYobi", None).await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        response
            .headers()
            .get(http::header::WWW_AUTHENTICATE)
            .and_then(|value| value.to_str().ok()),
        Some("Basic realm=\"Yona\"")
    );

    let response = direct_request(
        app,
        Method::GET,
        "/svn/owner/projectYobi",
        Some(&basic("owner", "doorpass1")),
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_IMPLEMENTED);
}
