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

fn svn_client_available() -> bool {
    Command::new("svn")
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
}

fn file_url(path: &std::path::Path) -> String {
    format!("file:///{}", path.display().to_string().replace('\\', "/"))
}

fn seed_svn_readme(repo_path: &std::path::Path, contents: &str) -> Option<i64> {
    if !svn_tools_available() || !svn_client_available() {
        return None;
    }
    let import_dir = tempdir().expect("svn import tempdir");
    let trunk_dir = import_dir.path().join("trunk");
    std::fs::create_dir_all(&trunk_dir).expect("create svn trunk");
    std::fs::write(trunk_dir.join("README.md"), contents).expect("write svn readme");
    let output = Command::new("svn")
        .args(["import", "-m", "seed svn readme"])
        .arg(import_dir.path())
        .arg(file_url(repo_path))
        .output()
        .expect("run svn import");
    assert!(
        output.status.success(),
        "svn import should seed executable-backed repository: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    Some(yona_rust_vcs::svn_youngest_revision(repo_path).expect("read seeded revision"))
}

fn seed_svn_mergeinfo(repo_path: &std::path::Path, path: &str, mergeinfo: &str) -> Option<i64> {
    if !svn_tools_available() || !svn_client_available() {
        return None;
    }
    let checkout_dir = tempdir().expect("svn mergeinfo checkout tempdir");
    let output = Command::new("svn")
        .arg("checkout")
        .arg(file_url(repo_path))
        .arg(checkout_dir.path())
        .output()
        .expect("run svn checkout");
    assert!(
        output.status.success(),
        "svn checkout should prepare mergeinfo fixture: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let target = checkout_dir.path().join(path.trim_start_matches('/'));
    let output = Command::new("svn")
        .args(["propset", "svn:mergeinfo", mergeinfo])
        .arg(&target)
        .output()
        .expect("run svn propset svn:mergeinfo");
    assert!(
        output.status.success(),
        "svn propset should seed mergeinfo: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let output = Command::new("svn")
        .args(["commit", "-m", "seed svn mergeinfo"])
        .arg(checkout_dir.path())
        .output()
        .expect("run svn commit");
    assert!(
        output.status.success(),
        "svn commit should persist mergeinfo fixture: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    Some(yona_rust_vcs::svn_youngest_revision(repo_path).expect("read mergeinfo revision"))
}

fn svn_propget(repo_path: &std::path::Path, property_name: &str, path: &str) -> Option<String> {
    let output = Command::new("svn")
        .arg("propget")
        .arg(property_name)
        .arg(format!(
            "{}/{}",
            file_url(repo_path).trim_end_matches('/'),
            path.trim_start_matches('/')
        ))
        .output()
        .expect("run svn propget");
    if !output.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
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
    direct_request_with_body(app, method, path, authorization, Body::empty()).await
}

async fn direct_request_with_body(
    app: axum::Router,
    method: Method,
    path: &str,
    authorization: Option<&str>,
    body: Body,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(format!("/yona{path}"));
    if let Some(authorization) = authorization {
        builder = builder.header(http::header::AUTHORIZATION, authorization);
    }
    app.oneshot(builder.body(body).unwrap()).await.unwrap()
}

async fn direct_request_with_body_and_header(
    app: axum::Router,
    method: Method,
    path: &str,
    authorization: Option<&str>,
    header_name: &'static str,
    header_value: &str,
    body: Body,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(format!("/yona{path}"))
        .header(header_name, header_value);
    if let Some(authorization) = authorization {
        builder = builder.header(http::header::AUTHORIZATION, authorization);
    }
    app.oneshot(builder.body(body).unwrap()).await.unwrap()
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
    assert!(
        response.status() == StatusCode::NOT_IMPLEMENTED
            || response.status() == StatusCode::NOT_FOUND
    );
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
        let repo_path = yona_rust_vcs::svn_repository_path(data_dir.path(), project_id);
        let uuid = yona_rust_vcs::svn_repository_uuid(&repo_path).expect("read repository uuid");
        assert!(
            text.contains(&format!("<S:repository-uuid>{uuid}</S:repository-uuid>")),
            "SVN root PROPFIND should include executable-backed repository UUID metadata: {text}"
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
        let repo_path = yona_rust_vcs::svn_repository_path(data_dir.path(), project_id);
        let uuid = yona_rust_vcs::svn_repository_uuid(&repo_path).expect("read repository uuid");
        assert!(
            text.contains(&format!("<S:repository-uuid>{uuid}</S:repository-uuid>")),
            "SVN default VCC PROPFIND should include executable-backed repository UUID metadata: {text}"
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
async fn svn_protocol_get_serves_repository_file_with_svnlook() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping executable SVN content test because svnadmin/svnlook/svn is unavailable"
        );
        return;
    }

    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repository, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let (project_id, _) = mark_project_as_svn(&repository, &db, data_dir.path()).await;
    let repo_path = yona_rust_vcs::svn_repository_path(data_dir.path(), project_id);
    let revision = seed_svn_readme(&repo_path, "hello from svn\n").expect("seed svn readme");

    let response = direct_request(
        app.clone(),
        Method::GET,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        String::from_utf8(body.to_vec()).unwrap(),
        "hello from svn\n"
    );

    let response = direct_request(
        app.clone(),
        Method::GET,
        &format!("/svn/owner/projectYobi/!svn/rvr/{revision}/trunk/README.md"),
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        String::from_utf8(body.to_vec()).unwrap(),
        "hello from svn\n"
    );

    let response = direct_request(
        app.clone(),
        Method::GET,
        &format!("/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md"),
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        String::from_utf8(body.to_vec()).unwrap(),
        "hello from svn\n"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:resourcetype/>")
            && text.contains("<D:getcontentlength>15</D:getcontentlength>")
            && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && text.contains(&format!(
                "<D:href>/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md</D:href>"
            ))
            && text
                .contains("<S:baseline-relative-path>trunk/README.md</S:baseline-relative-path>")
            && text.contains("/svn/owner/projectYobi/trunk/README.md"),
        "SVN file PROPFIND should return file metadata: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request(
        app.clone(),
        propfind,
        &format!("/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md"),
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:resourcetype/>")
            && text.contains("<D:getcontentlength>15</D:getcontentlength>")
            && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && text
                .contains("<S:baseline-relative-path>trunk/README.md</S:baseline-relative-path>")
            && text.contains(&format!(
                "/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md"
            )),
        "SVN version resource file PROPFIND should return file metadata: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response =
        direct_request(app.clone(), propfind, "/svn/owner/projectYobi/trunk", None).await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("/svn/owner/projectYobi/trunk/")
            && text.contains("<D:resourcetype><D:collection/></D:resourcetype>")
            && text.contains("/svn/owner/projectYobi/trunk/README.md")
            && text.contains("<D:resourcetype/>")
            && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && text.contains(&format!(
                "<D:href>/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md</D:href>"
            ))
            && text
                .contains("<S:baseline-relative-path>trunk/README.md</S:baseline-relative-path>"),
        "SVN collection PROPFIND should return directory and child metadata: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request(
        app.clone(),
        propfind,
        &format!("/svn/owner/projectYobi/!svn/bc/{revision}"),
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("/svn/owner/projectYobi/")
            && text.contains("<D:resourcetype><D:collection/></D:resourcetype>")
            && text.contains("/svn/owner/projectYobi/trunk/"),
        "SVN baseline collection PROPFIND should expose the revision root tree: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        &format!("/svn/owner/projectYobi/!svn/bc/{revision}/trunk"),
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:log-report xmlns:S="svn:" xmlns:D="DAV:">
  <S:start-revision>{revision}</S:start-revision>
  <S:end-revision>{revision}</S:end-revision>
  <S:path></S:path>
</S:log-report>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<S:log-report")
            && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && text.contains("<D:comment>seed svn readme</D:comment>"),
        "SVN log REPORT should return executable-backed revision metadata: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:dated-rev-report xmlns:S="svn:" xmlns:D="DAV:">
  <D:creationdate>2999-01-01T00:00:00.000000Z</D:creationdate>
</S:dated-rev-report>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<S:dated-rev-report")
            && text.contains(&format!("<D:version-name>{revision}</D:version-name>")),
        "SVN dated-rev REPORT should return the latest revision at or before the requested date: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:get-locks-report xmlns:S="svn:" xmlns:D="DAV:">
</S:get-locks-report>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<S:get-locks-report") && !text.contains("<S:lock>"),
        "SVN get-locks REPORT should return an empty lock report for an unlocked path: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        &format!("/svn/owner/projectYobi/!svn/bc/{revision}/trunk"),
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:get-locations xmlns:S="svn:">
  <S:path></S:path>
  <S:peg-revision>{revision}</S:peg-revision>
  <S:location-revision>{revision}</S:location-revision>
</S:get-locations>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<S:get-locations-report")
            && text.contains(&format!(r#"<S:location rev="{revision}" path="/trunk"/>"#)),
        "SVN get-locations REPORT should return the path location at the requested revision: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        &format!("/svn/owner/projectYobi/!svn/bc/{revision}/trunk"),
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:get-location-segments xmlns:S="svn:">
  <S:path></S:path>
  <S:peg-revision>{revision}</S:peg-revision>
  <S:start-revision>{revision}</S:start-revision>
  <S:end-revision>{revision}</S:end-revision>
</S:get-location-segments>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<S:get-location-segments-report")
            && text.contains(&format!(
                r#"<S:location-segment path="/trunk" range-start="{revision}" range-end="{revision}"/>"#
            )),
        "SVN get-location-segments REPORT should return the path segment for the requested revision range: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:update-report xmlns:S="svn:">
  <S:src-path>trunk</S:src-path>
  <S:target-revision>{revision}</S:target-revision>
</S:update-report>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<S:update-report")
            && text.contains(&format!(r#"<S:target-revision rev="{revision}"/>"#))
            && text.contains(&format!(r#"<S:open-root rev="{revision}">"#))
            && text.contains(r#"<S:add-file name="README.md">"#)
            && text.contains(&format!(
                "<D:href>/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md</D:href>"
            ))
            && text.contains("<S:fetch-file/>"),
        "SVN update-report should expose target revision and versioned file entries: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:file-revs-report xmlns:S="svn:" xmlns:D="DAV:">
  <S:start-revision>0</S:start-revision>
  <S:end-revision>{revision}</S:end-revision>
  <S:path>trunk/README.md</S:path>
</S:file-revs-report>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<S:file-revs-report")
            && text.contains(&format!(
                r#"<S:file-rev path="/trunk/README.md" rev="{revision}">"#
            ))
            && text.contains(r#"<S:rev-prop name="svn:author">"#)
            && text.contains("<S:rev-prop name=\"svn:log\">seed svn readme</S:rev-prop>"),
        "SVN file-revs REPORT should expose executable-backed file revision metadata: {text}"
    );

    let mergeinfo_revision =
        seed_svn_mergeinfo(&repo_path, "trunk", "/branches/topic:1").expect("seed svn mergeinfo");
    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:mergeinfo-report xmlns:S="svn:">
  <S:revision>{mergeinfo_revision}</S:revision>
  <S:inherit>explicit</S:inherit>
  <S:path>trunk</S:path>
</S:mergeinfo-report>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<S:mergeinfo-report")
            && text.contains("<S:mergeinfo-item>")
            && text.contains("<S:mergeinfo-path>/trunk</S:mergeinfo-path>")
            && text.contains("<S:mergeinfo-info>/branches/topic:1</S:mergeinfo-info>"),
        "SVN mergeinfo REPORT should expose executable-backed svn:mergeinfo metadata: {text}"
    );

    let lock = Method::from_bytes(b"LOCK").expect("LOCK method");
    let owner_basic = basic("owner", "doorpass1");
    let response = direct_request_with_body(
        app.clone(),
        lock,
        "/svn/owner/projectYobi/trunk/README.md",
        Some(&owner_basic),
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:lockinfo xmlns:D="DAV:">
  <D:lockscope><D:exclusive/></D:lockscope>
  <D:locktype><D:write/></D:locktype>
  <D:owner>owner</D:owner>
</D:lockinfo>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let lock_token = response
        .headers()
        .get("lock-token")
        .and_then(|value| value.to_str().ok())
        .expect("LOCK should return lock-token")
        .to_string();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:lockdiscovery>")
            && text.contains("<D:owner>owner</D:owner>")
            && text.contains("<D:locktype><D:write/></D:locktype>")
            && text.contains("<D:lockscope><D:exclusive/></D:lockscope>")
            && text.contains("/svn/owner/projectYobi/trunk/README.md")
            && text.contains(lock_token.trim_matches(['<', '>'])),
        "SVN LOCK should create executable-backed lock discovery metadata: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:get-locks-report xmlns:S="svn:" xmlns:D="DAV:">
</S:get-locks-report>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<S:get-locks-report")
            && text.contains("<S:lock>")
            && text.contains("<S:owner>owner</S:owner>")
            && text.contains(lock_token.trim_matches(['<', '>'])),
        "SVN get-locks REPORT should expose the executable-backed lock after LOCK: {text}"
    );

    let unlock = Method::from_bytes(b"UNLOCK").expect("UNLOCK method");
    let response = direct_request_with_body_and_header(
        app.clone(),
        unlock,
        "/svn/owner/projectYobi/trunk/README.md",
        Some(&owner_basic),
        "lock-token",
        &lock_token,
        Body::empty(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );

    let put = Method::from_bytes(b"PUT").expect("PUT method");
    let response = direct_request_with_body(
        app.clone(),
        put,
        "/svn/owner/projectYobi/trunk/README.md",
        Some(&owner_basic),
        Body::from("updated through put\n"),
    )
    .await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let put_revision = response
        .headers()
        .get("svn-revision")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<i64>().ok())
        .expect("PUT should return committed SVN revision");
    assert!(
        put_revision > revision,
        "SVN PUT should commit a newer repository revision"
    );

    let response = direct_request(
        app.clone(),
        Method::GET,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        String::from_utf8(body.to_vec()).unwrap(),
        "updated through put\n"
    );

    let proppatch = Method::from_bytes(b"PROPPATCH").expect("PROPPATCH method");
    let response = direct_request_with_body(
        app.clone(),
        proppatch.clone(),
        "/svn/owner/projectYobi/trunk/README.md",
        Some(&owner_basic),
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propertyupdate xmlns:D="DAV:" xmlns:C="http://example.com/yona">
  <D:set>
    <D:prop>
      <C:reviewed>true</C:reviewed>
    </D:prop>
  </D:set>
</D:propertyupdate>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let proppatch_revision = response
        .headers()
        .get("svn-revision")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<i64>().ok())
        .expect("PROPPATCH should return committed SVN revision");
    assert!(
        proppatch_revision > put_revision,
        "SVN PROPPATCH should commit a newer repository revision"
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:multistatus") && text.contains("<D:reviewed/>"),
        "SVN PROPPATCH should return multistatus metadata for the patched property: {text}"
    );
    assert_eq!(
        svn_propget(&repo_path, "reviewed", "trunk/README.md").as_deref(),
        Some("true")
    );

    let response = direct_request_with_body(
        app.clone(),
        proppatch,
        "/svn/owner/projectYobi/trunk/README.md",
        Some(&owner_basic),
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propertyupdate xmlns:D="DAV:" xmlns:C="http://example.com/yona">
  <D:remove>
    <D:prop>
      <C:reviewed/>
    </D:prop>
  </D:remove>
</D:propertyupdate>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let remove_revision = response
        .headers()
        .get("svn-revision")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<i64>().ok())
        .expect("PROPPATCH remove should return committed SVN revision");
    assert!(
        remove_revision > proppatch_revision,
        "SVN PROPPATCH remove should commit a newer repository revision"
    );
    assert_eq!(
        svn_propget(&repo_path, "reviewed", "trunk/README.md").unwrap_or_default(),
        ""
    );

    let response = direct_request(
        app.clone(),
        Method::HEAD,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get(http::header::CONTENT_LENGTH)
            .and_then(|value| value.to_str().ok()),
        Some("20")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert!(body.is_empty());

    let response = direct_request(
        app.clone(),
        Method::DELETE,
        "/svn/owner/projectYobi/trunk/README.md",
        Some(&owner_basic),
    )
    .await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let delete_revision = response
        .headers()
        .get("svn-revision")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<i64>().ok())
        .expect("DELETE should return committed SVN revision");
    assert!(
        delete_revision > remove_revision,
        "SVN DELETE should commit a newer repository revision"
    );

    let response = direct_request(
        app.clone(),
        Method::GET,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:get-deleted-rev-report xmlns:S="svn:">
  <S:path>trunk/README.md</S:path>
  <S:peg-revision>{revision}</S:peg-revision>
  <S:end-revision>{delete_revision}</S:end-revision>
</S:get-deleted-rev-report>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<S:get-deleted-rev-report")
            && text.contains(&format!(
                "<D:version-name>{delete_revision}</D:version-name>"
            )),
        "SVN get-deleted-rev REPORT should expose the revision where the path disappeared: {text}"
    );

    let mkcol = Method::from_bytes(b"MKCOL").expect("MKCOL method");
    let response = direct_request(
        app.clone(),
        mkcol,
        "/svn/owner/projectYobi/trunk/docs",
        Some(&owner_basic),
    )
    .await;
    assert_eq!(response.status(), StatusCode::CREATED);
    assert_eq!(
        response
            .headers()
            .get("dav")
            .and_then(|value| value.to_str().ok()),
        Some("1,2")
    );
    let mkcol_revision = response
        .headers()
        .get("svn-revision")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<i64>().ok())
        .expect("MKCOL should return committed SVN revision");
    assert!(
        mkcol_revision > delete_revision,
        "SVN MKCOL should commit a newer repository revision"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request(app, propfind, "/svn/owner/projectYobi/trunk/docs", None).await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("/svn/owner/projectYobi/trunk/docs/")
            && text.contains("<D:resourcetype><D:collection/></D:resourcetype>"),
        "SVN MKCOL should create a WebDAV collection visible through PROPFIND: {text}"
    );
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
