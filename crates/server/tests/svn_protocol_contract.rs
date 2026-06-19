use axum::body::Body;
use base64::{engine::general_purpose, Engine as _};
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;

// Guards SVN protocol href, path, PROPFIND property, delta, date, XML, lock,
// and report item behavior while focused helpers move out of the request
// dispatch module.
use sea_orm::{ConnectionTrait, Database, DatabaseConnection};
use serde_json::json;
use std::path::Path;
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use tempfile::tempdir;
use tokio::sync::oneshot;
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
    Command::new(yona_rust_vcs::svn_executable("svnadmin"))
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
        && Command::new(yona_rust_vcs::svn_executable("svnlook"))
            .arg("--version")
            .output()
            .is_ok_and(|output| output.status.success())
}

fn svn_client_available() -> bool {
    Command::new(yona_rust_vcs::svn_executable("svn"))
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
}

fn run_svn(args: &[&str], cwd: Option<&Path>) {
    let mut command = Command::new(yona_rust_vcs::svn_executable("svn"));
    command.args(args);
    command.env("SVN_NONINTERACTIVE", "1");
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    let output = command.output().expect("run svn");
    assert!(
        output.status.success(),
        "svn {:?} failed\nstdout: {}\nstderr: {}",
        args,
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

fn run_svn_capture(args: &[&str], cwd: Option<&Path>) -> std::process::Output {
    let mut command = Command::new(yona_rust_vcs::svn_executable("svn"));
    command.args(args);
    command.env("SVN_NONINTERACTIVE", "1");
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    command.output().expect("run svn")
}

async fn run_svn_blocking(args: Vec<String>, cwd: Option<std::path::PathBuf>) {
    tokio::task::spawn_blocking(move || {
        let borrowed = args.iter().map(String::as_str).collect::<Vec<_>>();
        run_svn(&borrowed, cwd.as_deref());
    })
    .await
    .expect("svn task");
}

fn file_url(path: &std::path::Path) -> String {
    format!("file:///{}", path.display().to_string().replace('\\', "/"))
}

fn list_relative_paths(root: &std::path::Path) -> Vec<String> {
    fn visit(root: &std::path::Path, path: &std::path::Path, output: &mut Vec<String>) {
        let Ok(entries) = std::fs::read_dir(path) else {
            return;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if let Ok(relative) = path.strip_prefix(root) {
                output.push(relative.display().to_string().replace('\\', "/"));
            }
            if path.is_dir() {
                visit(root, &path, output);
            }
        }
    }

    let mut paths = Vec::new();
    visit(root, root, &mut paths);
    paths.sort();
    paths
}

fn dav_response_for_href<'a>(text: &'a str, href: &str) -> &'a str {
    let href_marker = format!("<D:href>{href}</D:href>");
    let href_index = text.find(&href_marker).expect("DAV href marker");
    let start = text[..href_index]
        .rfind("<D:response>")
        .expect("DAV response start");
    let end = text[href_index..]
        .find("</D:response>")
        .map(|offset| href_index + offset + "</D:response>".len())
        .expect("DAV response end");
    &text[start..end]
}

fn seed_svn_readme(repo_path: &std::path::Path, contents: &str) -> Option<i64> {
    if !svn_tools_available() || !svn_client_available() {
        return None;
    }
    let import_dir = tempdir().expect("svn import tempdir");
    let trunk_dir = import_dir.path().join("trunk");
    std::fs::create_dir_all(&trunk_dir).expect("create svn trunk");
    std::fs::write(trunk_dir.join("README.md"), contents).expect("write svn readme");
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
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

fn seed_svn_nested_tree(repo_path: &std::path::Path) -> Option<i64> {
    if !svn_tools_available() || !svn_client_available() {
        return None;
    }
    let checkout_dir = tempdir().expect("svn nested checkout tempdir");
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
        .arg("checkout")
        .arg(file_url(repo_path))
        .arg(checkout_dir.path())
        .output()
        .expect("run svn checkout");
    assert!(
        output.status.success(),
        "svn checkout should prepare nested fixture: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let manual_dir = checkout_dir.path().join("trunk").join("manual");
    std::fs::create_dir_all(&manual_dir).expect("create svn manual");
    std::fs::write(manual_dir.join("guide.md"), "nested guide\n").expect("write svn guide");
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
        .args(["add", "trunk/manual"])
        .current_dir(checkout_dir.path())
        .output()
        .expect("run svn add");
    assert!(
        output.status.success(),
        "svn add should stage nested executable-backed fixture: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
        .args(["commit", "-m", "seed svn nested tree"])
        .arg(checkout_dir.path())
        .output()
        .expect("run svn commit");
    assert!(
        output.status.success(),
        "svn commit should persist nested executable-backed fixture: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    Some(yona_rust_vcs::svn_youngest_revision(repo_path).expect("read seeded revision"))
}

fn seed_svn_mergeinfo(repo_path: &std::path::Path, path: &str, mergeinfo: &str) -> Option<i64> {
    if !svn_tools_available() || !svn_client_available() {
        return None;
    }
    let checkout_dir = tempdir().expect("svn mergeinfo checkout tempdir");
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
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
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
        .args(["propset", "svn:mergeinfo", mergeinfo])
        .arg(&target)
        .output()
        .expect("run svn propset svn:mergeinfo");
    assert!(
        output.status.success(),
        "svn propset should seed mergeinfo: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
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

fn seed_svn_copied_file(repo_path: &std::path::Path, source_revision: i64) -> Option<i64> {
    if !svn_tools_available() || !svn_client_available() {
        return None;
    }
    let checkout_dir = tempdir().expect("svn copy checkout tempdir");
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
        .arg("checkout")
        .arg(file_url(repo_path))
        .arg(checkout_dir.path())
        .output()
        .expect("run svn checkout");
    assert!(
        output.status.success(),
        "svn checkout should prepare copy fixture: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let source = checkout_dir.path().join("trunk").join("README.md");
    let copied = checkout_dir.path().join("trunk").join("README_COPY.md");
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
        .arg("copy")
        .arg(&source)
        .arg(&copied)
        .output()
        .expect("run svn copy");
    assert!(
        output.status.success(),
        "svn copy should preserve copyfrom metadata: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
        .args(["commit", "-m", "seed svn copied file"])
        .arg(checkout_dir.path())
        .output()
        .expect("run svn commit");
    assert!(
        output.status.success(),
        "svn commit should persist copy fixture: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let copied_revision =
        yona_rust_vcs::svn_youngest_revision(repo_path).expect("read copied revision");
    assert!(
        copied_revision > source_revision,
        "svn copy fixture should create a newer revision than the source"
    );
    Some(copied_revision)
}

fn svn_propget(repo_path: &std::path::Path, property_name: &str, path: &str) -> Option<String> {
    let output = Command::new(yona_rust_vcs::svn_executable("svn"))
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
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: "http://localhost".to_string(),
        },
        app_repo.clone(),
    );

    (app, app_repo, db)
}

async fn spawn_app_server(app: axum::Router) -> (String, oneshot::Sender<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind test server");
    let address = listener.local_addr().expect("local address");
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await
            .expect("serve test app");
    });

    (format!("http://{address}"), shutdown_tx)
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
        text.contains("<D:multistatus")
            && text.contains("<D:href>/yona/svn/owner/projectYobi</D:href>")
            && text.contains("<D:collection/>")
            && text.contains("<D:displayname>projectYobi</D:displayname>")
            && text.contains(
                "<D:version-controlled-configuration><D:href>/yona/svn/owner/projectYobi/!svn/vcc/default</D:href></D:version-controlled-configuration>"
            ),
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
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:propname/>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    let repo_path = yona_rust_vcs::svn_repository_path(data_dir.path(), project_id);
    let repository_uuid = yona_rust_vcs::svn_repository_uuid(&repo_path).ok();
    assert!(
        text.contains("<D:resourcetype/>")
            && text.contains("<D:displayname/>")
            && text.contains("<D:supportedlock/>")
            && text.contains("<D:version-controlled-configuration/>")
            && text.contains("<D:activity-collection-set/>")
            && text.contains("<D:supported-report-set/>")
            && !text.contains("<D:collection/>")
            && !text.contains("<D:href>/yona/svn/owner/projectYobi/!svn/vcc/default</D:href>"),
        "SVN root PROPFIND propname should expose live property names without values: {text}"
    );
    if youngest_revision.is_some() {
        assert!(
            text.contains("<D:version-name/>"),
            "SVN root PROPFIND propname should expose executable-backed version-name when youngest revision is available: {text}"
        );
    }
    if repository_uuid.is_some() {
        assert!(
            text.contains("<S:repository-uuid/>"),
            "SVN root PROPFIND propname should expose executable-backed repository UUID when svnlook metadata is available: {text}"
        );
    }

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:activity-collection-set/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:activity-collection-set><D:href>/yona/svn/owner/projectYobi/!svn/act/</D:href></D:activity-collection-set>")
            && !text.contains("<D:version-controlled-configuration>")
            && !text.contains("<D:supported-report-set>"),
        "SVN root PROPFIND should expose activity collection discovery only when requested: {text}"
    );

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
        text.contains("/yona/svn/owner/projectYobi/!svn/vcc/default")
            && text.contains("<D:collection/>"),
        "SVN default VCC PROPFIND should return a WebDAV collection multistatus: {text}"
    );
    if let Some(revision) = youngest_revision {
        assert!(
            text.contains(&format!("<D:version-name>{revision}</D:version-name>")),
            "SVN default VCC PROPFIND should include executable-backed youngest revision metadata: {text}"
        );
        assert!(
            text.contains("<D:displayname>default</D:displayname>"),
            "SVN default VCC PROPFIND should include display name metadata: {text}"
        );
        assert!(
            text.contains(&format!(
                "<D:checked-in><D:href>/yona/svn/owner/projectYobi/!svn/bln/{revision}</D:href></D:checked-in>"
            )),
            "SVN default VCC PROPFIND should expose the latest baseline resource for ra_serf discovery: {text}"
        );
        let repo_path = yona_rust_vcs::svn_repository_path(data_dir.path(), project_id);
        let uuid = yona_rust_vcs::svn_repository_uuid(&repo_path).expect("read repository uuid");
        assert!(
            text.contains(&format!("<S:repository-uuid>{uuid}</S:repository-uuid>")),
            "SVN default VCC PROPFIND should include executable-backed repository UUID metadata: {text}"
        );

        let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
        let response = direct_request(
            app.clone(),
            propfind,
            &format!("/svn/owner/projectYobi/!svn/bln/{revision}"),
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
            text.contains("<D:resourcetype><D:baseline/></D:resourcetype>")
                && text.contains(&format!("<D:displayname>{revision}</D:displayname>"))
                && text.contains("<D:supportedlock>")
                && text.contains("<D:lockscope><D:exclusive/></D:lockscope>")
                && text.contains("<D:locktype><D:write/></D:locktype>")
                && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
                && text.contains(&format!(
                    "<D:baseline-collection><D:href>/yona/svn/owner/projectYobi/!svn/bc/{revision}</D:href></D:baseline-collection>"
                )),
            "SVN baseline resource PROPFIND should expose baseline collection metadata: {text}"
        );

        let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
        let response = direct_request_with_body(
            app.clone(),
            propfind,
            &format!("/svn/owner/projectYobi/!svn/bln/{revision}"),
            None,
            Body::from(
                r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:propname/>
</D:propfind>"#,
            ),
        )
        .await;
        assert_eq!(response.status(), StatusCode::MULTI_STATUS);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let text = String::from_utf8(body.to_vec()).unwrap();
        assert!(
            text.contains("<D:resourcetype/>")
                && text.contains("<D:displayname/>")
                && text.contains("<D:supportedlock/>")
                && text.contains("<D:version-name/>")
                && text.contains("<D:baseline-collection/>")
                && text.contains("<D:supported-report-set/>")
                && text.contains("<S:repository-uuid/>")
                && !text.contains("<D:baseline/>")
                && !text.contains("<D:href>/yona/svn/owner/projectYobi/!svn/bc/"),
            "SVN baseline resource PROPFIND propname should expose live property names without values: {text}"
        );

        let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
        let response = direct_request_with_body(
            app.clone(),
            propfind,
            &format!("/svn/owner/projectYobi/!svn/bln/{revision}"),
            None,
            Body::from(
                r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:supported-report-set/>
  </D:prop>
</D:propfind>"#,
            ),
        )
        .await;
        assert_eq!(response.status(), StatusCode::MULTI_STATUS);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let text = String::from_utf8(body.to_vec()).unwrap();
        assert!(
            text.contains("<D:supported-report-set>")
                && text.contains("<S:log-report/>")
                && text.contains("<S:update-report/>")
                && text.contains("<S:file-revs-report/>")
                && text.contains("<S:get-location-segments-report/>")
                && !text.contains("<D:baseline-collection>"),
            "SVN baseline resource PROPFIND should expose supported REPORT capabilities only when requested: {text}"
        );

        let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
        let response = direct_request_with_body(
            app.clone(),
            propfind,
            &format!("/svn/owner/projectYobi/!svn/bln/{revision}"),
            None,
            Body::from(
                r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
    <D:prop>
    <D:resourcetype/>
    <D:displayname/>
    <D:supportedlock/>
  </D:prop>
</D:propfind>"#,
            ),
        )
        .await;
        assert_eq!(response.status(), StatusCode::MULTI_STATUS);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let text = String::from_utf8(body.to_vec()).unwrap();
        assert!(
            text.contains("<D:resourcetype><D:baseline/></D:resourcetype>")
                && text.contains(&format!("<D:displayname>{revision}</D:displayname>"))
                && text.contains("<D:supportedlock>")
                && text.contains("<D:lockscope><D:exclusive/></D:lockscope>")
                && text.contains("<D:locktype><D:write/></D:locktype>")
                && !text.contains("<D:version-name>")
                && !text.contains("<D:baseline-collection>"),
            "SVN baseline resource PROPFIND should only return explicitly requested metadata: {text}"
        );

        let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
        let response = direct_request_with_body(
            app.clone(),
            propfind,
            &format!("/svn/owner/projectYobi/!svn/bln/{revision}"),
            None,
            Body::from(
                r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:allprop/>
</D:propfind>"#,
            ),
        )
        .await;
        assert_eq!(response.status(), StatusCode::MULTI_STATUS);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let text = String::from_utf8(body.to_vec()).unwrap();
        assert!(
            text.contains("<D:resourcetype><D:baseline/></D:resourcetype>")
                && text.contains(&format!("<D:displayname>{revision}</D:displayname>"))
                && text.contains("<D:supportedlock>")
                && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
                && text.contains(&format!(
                    "<D:baseline-collection><D:href>/yona/svn/owner/projectYobi/!svn/bc/{revision}</D:href></D:baseline-collection>"
                ))
                && text.contains(&format!("<S:repository-uuid>{uuid}</S:repository-uuid>"))
                && text.contains("<D:supported-report-set>"),
            "SVN baseline resource PROPFIND allprop should expose baseline live metadata: {text}"
        );
    }

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:propname/>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:resourcetype/>")
            && text.contains("<D:displayname/>")
            && text.contains("<D:supportedlock/>")
            && text.contains("<D:activity-collection-set/>")
            && text.contains("<D:supported-report-set/>")
            && !text.contains("<D:collection/>")
            && !text.contains("<D:href>/yona/svn/owner/projectYobi/!svn/bln/"),
        "SVN VCC PROPFIND propname should expose live property names without values: {text}"
    );
    if youngest_revision.is_some() {
        assert!(
            text.contains("<D:version-name/>")
                && text.contains("<D:checked-in/>")
                && text.contains("<D:baseline-collection/>")
                && text.contains("<D:creationdate/>")
                && text.contains("<D:creator-displayname/>"),
            "SVN VCC PROPFIND propname should expose executable-backed revision metadata names when youngest revision is available: {text}"
        );
    }
    if repository_uuid.is_some() {
        assert!(
            text.contains("<S:repository-uuid/>"),
            "SVN VCC PROPFIND propname should expose executable-backed repository UUID when svnlook metadata is available: {text}"
        );
    }

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:activity-collection-set/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:activity-collection-set><D:href>/yona/svn/owner/projectYobi/!svn/act/</D:href></D:activity-collection-set>")
            && !text.contains("<D:checked-in>")
            && !text.contains("<D:supported-report-set>"),
        "SVN VCC PROPFIND should expose activity collection discovery only when requested: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:supported-report-set/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:supported-report-set>")
            && text.contains("<S:log-report/>")
            && text.contains("<S:dated-rev-report/>")
            && text.contains("<S:update-report/>")
            && text.contains("<S:replay-report/>")
            && text.contains("<S:mergeinfo-report/>")
            && !text.contains("<D:checked-in>"),
        "SVN VCC PROPFIND should expose supported REPORT capabilities only when requested: {text}"
    );

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
    assert_eq!(
        response
            .headers()
            .get("svn-repository-mergeinfo")
            .and_then(|value| value.to_str().ok()),
        Some("yes")
    );
    assert!(
        response
            .headers()
            .get(http::header::ALLOW)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|allow| {
                [
                    "OPTIONS",
                    "GET",
                    "HEAD",
                    "POST",
                    "PUT",
                    "COPY",
                    "MOVE",
                    "DELETE",
                    "MKCOL",
                    "MKACTIVITY",
                    "PROPFIND",
                    "PROPPATCH",
                    "REPORT",
                    "LOCK",
                    "UNLOCK",
                    "CHECKOUT",
                    "MERGE",
                ]
                .into_iter()
                .all(|method| allow.contains(method))
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
            && text.contains("<D:displayname>README.md</D:displayname>")
            && text.contains("<D:supportedlock>")
            && text.contains("<D:lockscope><D:exclusive/></D:lockscope>")
            && text.contains("<D:locktype><D:write/></D:locktype>")
            && text.contains("<D:getcontentlength>15</D:getcontentlength>")
            && text.contains("<D:getcontenttype>application/octet-stream</D:getcontenttype>")
            && text.contains(&format!(
                "<D:getetag>&quot;{revision}:trunk/README.md&quot;</D:getetag>"
            ))
            && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && text.contains(&format!(
                "<D:href>/yona/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md</D:href>"
            ))
            && text
                .contains("<S:baseline-relative-path>trunk/README.md</S:baseline-relative-path>")
            && text.contains("/yona/svn/owner/projectYobi/trunk/README.md"),
        "SVN file PROPFIND should return file metadata: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:S="http://subversion.tigris.org/xmlns/dav/">
  <D:prop>
    <D:version-controlled-configuration/>
    <D:resourcetype/>
    <S:baseline-relative-path/>
    <S:repository-uuid/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:resourcetype/>")
            && text.contains(&format!(
                "<D:checked-in><D:href>/yona/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md</D:href></D:checked-in>"
            ))
            && text.contains("<D:version-controlled-configuration><D:href>/yona/svn/owner/projectYobi/!svn/vcc/default</D:href></D:version-controlled-configuration>")
            && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && text.contains(&format!(
                "<D:baseline-collection><D:href>/yona/svn/owner/projectYobi/!svn/bc/{revision}/</D:href></D:baseline-collection>"
            ))
            && text
                .contains("<S:baseline-relative-path>trunk/README.md</S:baseline-relative-path>")
            && text.contains("<S:repository-uuid>")
            && !text.contains("<D:getcontentlength>"),
        "SVN file PROPFIND should include checked-in href for VCC metadata resolution without reverting to allprop: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:supported-report-set/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:supported-report-set>")
            && text.contains("<S:file-revs-report/>")
            && text.contains("<S:get-locks-report/>")
            && text.contains("<S:log-report/>")
            && !text.contains("<D:getcontentlength>"),
        "SVN file PROPFIND should expose requested supported REPORT capabilities without falling back to allprop: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/!svn/vcc/default/trunk/README.md",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:S="http://subversion.tigris.org/xmlns/dav/">
  <D:prop>
    <D:version-controlled-configuration/>
    <D:checked-in/>
    <D:baseline-collection/>
    <D:resourcetype/>
    <S:baseline-relative-path/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("/yona/svn/owner/projectYobi/!svn/vcc/default/trunk/README.md")
            && text.contains("<D:resourcetype/>")
            && text.contains(&format!(
                "<D:checked-in><D:href>/yona/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md</D:href></D:checked-in>"
            ))
            && text.contains("<D:version-controlled-configuration><D:href>/yona/svn/owner/projectYobi/!svn/vcc/default</D:href></D:version-controlled-configuration>")
            && text.contains(&format!(
                "<D:baseline-collection><D:href>/yona/svn/owner/projectYobi/!svn/bc/{revision}/</D:href></D:baseline-collection>"
            ))
            && text
                .contains("<S:baseline-relative-path>trunk/README.md</S:baseline-relative-path>"),
        "SVN VCC file PROPFIND should resolve default-VCC child paths to version metadata: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/!svn/vcc/default/trunk",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("/yona/svn/owner/projectYobi/!svn/vcc/default/trunk/")
            && text.contains("<D:resourcetype><D:collection/></D:resourcetype>")
            && text.contains("<D:displayname>trunk</D:displayname>")
            && text.contains("/yona/svn/owner/projectYobi/!svn/vcc/default/trunk/README.md")
            && text.contains(&format!(
                "<D:href>/yona/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md</D:href>"
            )),
        "SVN VCC collection PROPFIND should preserve default-VCC child hrefs and version metadata: {text}"
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
            && text.contains("<D:displayname>README.md</D:displayname>")
            && text.contains("<D:supportedlock>")
            && text.contains("<D:lockscope><D:exclusive/></D:lockscope>")
            && text.contains("<D:locktype><D:write/></D:locktype>")
            && text.contains("<D:getcontentlength>15</D:getcontentlength>")
            && text.contains("<D:getcontenttype>application/octet-stream</D:getcontenttype>")
            && text.contains(&format!(
                "<D:getetag>&quot;{revision}:trunk/README.md&quot;</D:getetag>"
            ))
            && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && text
                .contains("<S:baseline-relative-path>trunk/README.md</S:baseline-relative-path>")
            && text.contains(&format!(
                "/yona/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md"
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
        text.contains("/yona/svn/owner/projectYobi/trunk/")
            && text.contains("<D:resourcetype><D:collection/></D:resourcetype>")
            && text.contains("<D:displayname>trunk</D:displayname>")
            && text.contains("<D:supportedlock>")
            && text.contains("/yona/svn/owner/projectYobi/trunk/README.md")
            && text.contains("<D:resourcetype/>")
            && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && text.contains(&format!(
                "<D:href>/yona/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md</D:href>"
            ))
            && text
                .contains("<S:baseline-relative-path>trunk/README.md</S:baseline-relative-path>"),
        "SVN collection PROPFIND should return directory and child metadata: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/trunk",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:propname/>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("/yona/svn/owner/projectYobi/trunk/")
            && text.contains("<D:resourcetype/>")
            && text.contains("<D:displayname/>")
            && text.contains("<D:supportedlock/>")
            && text.contains("<D:version-name/>")
            && text.contains("<D:checked-in/>")
            && text.contains("<D:baseline-collection/>")
            && text.contains("<S:baseline-relative-path/>")
            && text.contains("/yona/svn/owner/projectYobi/trunk/README.md")
            && !text.contains("<D:resourcetype><D:collection/></D:resourcetype>")
            && !text.contains("<D:href>/yona/svn/owner/projectYobi/!svn/ver/"),
        "SVN collection PROPFIND propname should expose directory and child property names without values: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/trunk",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:creationdate/>
    <D:creator-displayname/>
    <D:getlastmodified/>
    <D:displayname/>
    <D:supportedlock/>
    <D:getcontenttype/>
    <D:getetag/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    let readme_response =
        dav_response_for_href(&text, "/yona/svn/owner/projectYobi/trunk/README.md");
    assert!(
        readme_response.contains("<D:creationdate>")
            && readme_response.contains("</D:creationdate>")
            && readme_response.contains("<D:creator-displayname>")
            && readme_response.contains("</D:creator-displayname>")
            && readme_response.contains("<D:getlastmodified>")
            && readme_response.contains("GMT</D:getlastmodified>")
            && readme_response.contains("<D:displayname>README.md</D:displayname>")
            && readme_response.contains("<D:supportedlock>")
            && readme_response.contains(
                "<D:getcontenttype>application/octet-stream</D:getcontenttype>"
            )
            && readme_response.contains(&format!(
                "<D:getetag>&quot;{revision}:trunk/README.md&quot;</D:getetag>"
            ))
            && !readme_response.contains("<D:checked-in>")
            && !readme_response.contains("<S:repository-uuid>"),
        "SVN collection PROPFIND should expose requested revision provenance metadata on child files only: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        &format!("/svn/owner/projectYobi/!svn/bln/{revision}"),
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:creationdate/>
    <D:creator-displayname/>
    <S:repository-uuid/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:creationdate>")
            && text.contains("</D:creationdate>")
            && text.contains("<D:creator-displayname>")
            && text.contains("</D:creator-displayname>")
            && text.contains("<S:repository-uuid>")
            && text.contains("</S:repository-uuid>")
            && !text.contains("<D:baseline-collection>"),
        "SVN baseline resource PROPFIND should expose requested revision provenance metadata only: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:creationdate/>
    <D:creator-displayname/>
    <D:getlastmodified/>
    <D:displayname/>
    <D:supportedlock/>
    <D:getcontenttype/>
    <D:getetag/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:creationdate>")
            && text.contains("</D:creationdate>")
            && text.contains("<D:creator-displayname>")
            && text.contains("</D:creator-displayname>")
            && !text.contains("<D:checked-in>")
            && !text.contains("<S:repository-uuid>"),
        "SVN VCC PROPFIND should expose requested latest-revision author/date metadata only: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        &format!("/svn/owner/projectYobi/!svn/bc/{revision}/trunk/README.md"),
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:creationdate/>
    <D:creator-displayname/>
    <D:getlastmodified/>
    <D:displayname/>
    <D:supportedlock/>
    <D:getcontenttype/>
    <D:getetag/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:creationdate>")
            && text.contains("</D:creationdate>")
            && text.contains("<D:creator-displayname>")
            && text.contains("</D:creator-displayname>")
            && text.contains("<D:displayname>README.md</D:displayname>")
            && text.contains("<D:supportedlock>")
            && text.contains("<D:getcontenttype>application/octet-stream</D:getcontenttype>")
            && text.contains(&format!(
                "<D:getetag>&quot;{revision}:trunk/README.md&quot;</D:getetag>"
            ))
            && !text.contains("<D:getcontentlength>")
            && !text.contains("<D:checked-in>")
            && !text.contains("<S:repository-uuid>"),
        "SVN baseline file PROPFIND should expose requested revision provenance metadata only: {text}"
    );

    let nested_revision = seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");
    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body_and_header(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/trunk",
        None,
        "depth",
        "infinity",
        Body::empty(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("/yona/svn/owner/projectYobi/trunk/manual/")
            && text.contains("/yona/svn/owner/projectYobi/trunk/manual/guide.md")
            && text.contains(&format!(
                "<D:href>/yona/svn/owner/projectYobi/!svn/ver/{nested_revision}/trunk/manual/guide.md</D:href>"
            )),
        "SVN collection PROPFIND depth=infinity should recursively expose nested entries: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body_and_header(
        app.clone(),
        propfind,
        &format!("/svn/owner/projectYobi/!svn/bc/{nested_revision}/trunk"),
        None,
        "depth",
        "infinity",
        Body::empty(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains(&format!(
            "/yona/svn/owner/projectYobi/!svn/bc/{nested_revision}/trunk/manual/"
        )) && text.contains(&format!(
            "/yona/svn/owner/projectYobi/!svn/bc/{nested_revision}/trunk/manual/guide.md"
        )) && text.contains(&format!(
            "<D:href>/yona/svn/owner/projectYobi/!svn/ver/{nested_revision}/trunk/manual/guide.md</D:href>"
        )),
        "SVN baseline collection PROPFIND depth=infinity should recursively expose revision-pinned nested entries: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body_and_header(
        app.clone(),
        propfind,
        &format!("/svn/owner/projectYobi/!svn/bc/{nested_revision}/trunk"),
        None,
        "depth",
        "1",
        Body::empty(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains(&format!(
            "/yona/svn/owner/projectYobi/!svn/bc/{nested_revision}/trunk/manual/"
        )) && text.contains(&format!(
            "/yona/svn/owner/projectYobi/!svn/bc/{nested_revision}/trunk/README.md"
        )) && !text.contains(&format!(
            "/yona/svn/owner/projectYobi/!svn/bc/{nested_revision}/trunk/manual/guide.md"
        )),
        "SVN baseline collection PROPFIND depth=1 should expose direct children without recursive nested files: {text}"
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
        text.contains("/yona/svn/owner/projectYobi/")
            && text.contains("<D:resourcetype><D:collection/></D:resourcetype>")
            && text.contains(&format!("<D:displayname>{revision}</D:displayname>"))
            && text.contains("<D:displayname>trunk</D:displayname>")
            && text.contains(&format!(
                "/yona/svn/owner/projectYobi/!svn/bc/{revision}/trunk/"
            )),
        "SVN baseline collection PROPFIND should expose the revision root tree: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body_and_header(
        app.clone(),
        propfind,
        &format!("/svn/owner/projectYobi/!svn/bc/{revision}"),
        None,
        "depth",
        "0",
        Body::empty(),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains(&format!("/yona/svn/owner/projectYobi/!svn/bc/{revision}"))
            && !text.contains(&format!(
                "/yona/svn/owner/projectYobi/!svn/bc/{revision}/trunk/"
            )),
        "SVN baseline collection PROPFIND depth=0 should only expose the requested collection: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        &format!("/svn/owner/projectYobi/!svn/bc/{revision}/trunk"),
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:allprop/>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    let trunk_response = dav_response_for_href(
        &text,
        &format!("/yona/svn/owner/projectYobi/!svn/bc/{revision}/trunk/"),
    );
    assert!(
        trunk_response.contains("<D:resourcetype><D:collection/></D:resourcetype>")
            && trunk_response.contains("<D:displayname>trunk</D:displayname>")
            && trunk_response.contains("<D:supportedlock>")
            && trunk_response.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && trunk_response.contains(&format!(
                "<D:href>/yona/svn/owner/projectYobi/!svn/ver/{revision}/trunk</D:href>"
            ))
            && trunk_response.contains(&format!(
                "<D:href>/yona/svn/owner/projectYobi/!svn/bc/{revision}/</D:href>"
            ))
            && trunk_response
                .contains("<S:baseline-relative-path>trunk</S:baseline-relative-path>")
            && trunk_response.contains("<D:creationdate>")
            && trunk_response.contains("<D:creator-displayname>")
            && trunk_response.contains("<D:getlastmodified>")
            && trunk_response.contains("<D:supported-report-set>"),
        "SVN baseline collection PROPFIND allprop should expose collection live metadata: {text}"
    );
    let readme_response = dav_response_for_href(
        &text,
        &format!("/yona/svn/owner/projectYobi/!svn/bc/{revision}/trunk/README.md"),
    );
    assert!(
        readme_response.contains("<D:resourcetype/>")
            && readme_response.contains("<D:displayname>README.md</D:displayname>")
            && readme_response
                .contains("<D:getcontenttype>application/octet-stream</D:getcontenttype>")
            && readme_response.contains(&format!(
                "<D:getetag>&quot;{revision}:trunk/README.md&quot;</D:getetag>"
            ))
            && readme_response.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && readme_response.contains(&format!(
                "<D:href>/yona/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md</D:href>"
            ))
            && readme_response
                .contains("<S:baseline-relative-path>trunk/README.md</S:baseline-relative-path>")
            && readme_response.contains("<D:supported-report-set>"),
        "SVN baseline collection PROPFIND allprop should expose child file live metadata: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body_and_header(
        app.clone(),
        propfind,
        &format!("/svn/owner/projectYobi/!svn/bc/{revision}/trunk"),
        None,
        "depth",
        "0",
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:supported-report-set/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:supported-report-set>")
            && text.contains("<S:log-report/>")
            && text.contains("<S:update-report/>")
            && text.contains("<S:list-report/>")
            && !text.contains("<D:displayname>README.md</D:displayname>"),
        "SVN baseline collection PROPFIND should expose requested supported REPORT capabilities on the collection itself: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        &format!("/svn/owner/projectYobi/!svn/bc/{revision}/trunk"),
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:creationdate/>
    <D:creator-displayname/>
    <D:getlastmodified/>
    <D:displayname/>
    <D:supportedlock/>
    <D:getcontenttype/>
    <D:getetag/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    let readme_response = dav_response_for_href(
        &text,
        &format!("/yona/svn/owner/projectYobi/!svn/bc/{revision}/trunk/README.md"),
    );
    assert!(
        readme_response.contains("<D:creationdate>")
            && readme_response.contains("</D:creationdate>")
            && readme_response.contains("<D:creator-displayname>")
            && readme_response.contains("</D:creator-displayname>")
            && readme_response.contains("<D:getlastmodified>")
            && readme_response.contains("GMT</D:getlastmodified>")
            && readme_response.contains("<D:displayname>README.md</D:displayname>")
            && readme_response.contains("<D:supportedlock>")
            && readme_response.contains(
                "<D:getcontenttype>application/octet-stream</D:getcontenttype>"
            )
            && readme_response.contains(&format!(
                "<D:getetag>&quot;{revision}:trunk/README.md&quot;</D:getetag>"
            ))
            && !readme_response.contains("<D:checked-in>")
            && !readme_response.contains("<S:repository-uuid>"),
        "SVN baseline collection PROPFIND should expose requested revision provenance metadata on child files only: {text}"
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
    let status = response.status();
    let dav_header = response
        .headers()
        .get("dav")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(
        status,
        StatusCode::OK,
        "SVN log REPORT should succeed: {text}"
    );
    assert_eq!(dav_header.as_deref(), Some("1,2"));
    assert!(
        text.contains("<S:log-report")
            && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
            && text.contains("<D:comment>seed svn readme</D:comment>"),
        "SVN log REPORT should return executable-backed revision metadata: {text}"
    );

    let copied_revision =
        seed_svn_copied_file(&repo_path, nested_revision).expect("seed svn copied file");
    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:log-report xmlns:S="svn:" xmlns:D="DAV:">
  <S:start-revision>{copied_revision}</S:start-revision>
  <S:end-revision>{copied_revision}</S:end-revision>
  <S:discover-changed-paths/>
  <S:path></S:path>
</S:log-report>"#
        )),
    )
    .await;
    let status = response.status();
    let dav_header = response
        .headers()
        .get("dav")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(
        status,
        StatusCode::OK,
        "SVN log REPORT with changed paths should succeed: {text}"
    );
    assert_eq!(dav_header.as_deref(), Some("1,2"));
    assert!(
        text.contains(&format!(
            r#"<S:added-path node-kind="file" copyfrom-path="/trunk/README.md" copyfrom-rev="{nested_revision}">/trunk/README_COPY.md</S:added-path>"#
        )),
        "SVN log REPORT discover-changed-paths should preserve copyfrom metadata for copied paths: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:log-report xmlns:S="svn:" xmlns:D="DAV:">
  <S:start-revision>{nested_revision}</S:start-revision>
  <S:end-revision>1</S:end-revision>
  <S:discover-changed-paths/>
  <S:path>trunk/README.md</S:path>
</S:log-report>"#
        )),
    )
    .await;
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(
        status,
        StatusCode::OK,
        "SVN log REPORT with a path filter should succeed: {text}"
    );
    assert!(
        text.contains("<D:comment>seed svn readme</D:comment>")
            && !text.contains("<D:comment>seed svn nested tree</D:comment>"),
        "SVN log REPORT should filter unrelated revisions when a path is requested: {text}"
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
    let status = response.status();
    let dav_header = response
        .headers()
        .get("dav")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(
        status,
        StatusCode::OK,
        "SVN dated-rev REPORT should succeed: {text}"
    );
    assert_eq!(dav_header.as_deref(), Some("1,2"));
    assert!(
        text.contains("<S:dated-rev-report")
            && text.contains(&format!("<D:version-name>{copied_revision}</D:version-name>")),
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
    let status = response.status();
    let dav_header = response
        .headers()
        .get("dav")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(
        status,
        StatusCode::OK,
        "SVN get-locks REPORT should succeed: {text}"
    );
    assert_eq!(dav_header.as_deref(), Some("1,2"));
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
    let status = response.status();
    let dav_header = response
        .headers()
        .get("dav")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(
        status,
        StatusCode::OK,
        "SVN get-locations REPORT should succeed: {text}"
    );
    assert_eq!(dav_header.as_deref(), Some("1,2"));
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
                r#"<S:location-segment path="trunk" range-start="{revision}" range-end="{revision}"/>"#
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
            && text.contains(&format!(r#"<S:open-directory rev="{revision}">"#))
            && text.contains(r#"<S:set-prop name="svn:entry:committed-rev">"#)
            && text.contains(r#"<S:add-file name="README.md">"#)
            && text.contains(&format!(
                "<D:href>/yona/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md</D:href>"
            ))
            && text.contains("<S:fetch-file/>"),
        "SVN update-report should expose target revision and versioned file entries: {text}"
    );

    let nested_dir_revision =
        yona_rust_vcs::svn_make_collection(&repo_path, "trunk/guides", "seed nested svn directory")
            .expect("seed nested svn directory");
    let nested_revision = yona_rust_vcs::svn_put_file(
        &repo_path,
        "trunk/guides/Guide.md",
        b"nested guide\n",
        "seed nested svn file",
    )
    .expect("seed nested svn file");
    assert!(
        nested_revision > nested_dir_revision,
        "nested file fixture should advance the repository revision"
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
  <S:target-revision>{nested_revision}</S:target-revision>
  <S:depth>empty</S:depth>
</S:update-report>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains(&format!(r#"<S:target-revision rev="{nested_revision}"/>"#))
            && text.contains(&format!(r#"<S:open-directory rev="{nested_revision}">"#))
            && !text.contains("<S:add-file")
            && !text.contains("<S:add-directory"),
        "SVN update-report depth=empty should open the target without child entries: {text}"
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
  <S:target-revision>{nested_revision}</S:target-revision>
  <S:depth>files</S:depth>
</S:update-report>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains(r#"<S:add-file name="README.md">"#)
            && !text.contains(r#"<S:add-directory name="guides"/>"#)
            && !text.contains("Guide.md"),
        "SVN update-report depth=files should include direct files but not child directories: {text}"
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
  <S:target-revision>{nested_revision}</S:target-revision>
  <S:recursive>no</S:recursive>
</S:update-report>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains(r#"<S:add-file name="README.md">"#)
            && !text.contains(r#"<S:add-directory name="guides"/>"#)
            && !text.contains("Guide.md"),
        "SVN update-report recursive=no should follow legacy non-recursive file listing: {text}"
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
  <S:target-revision>{nested_revision}</S:target-revision>
  <S:depth>infinity</S:depth>
</S:update-report>"#
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains(r#"<S:add-directory name="guides" bc-url="#)
            && text.contains(r#"<S:add-file name="Guide.md">"#)
            && text.contains(&format!(
                "<D:href>/yona/svn/owner/projectYobi/!svn/ver/{nested_revision}/trunk/guides/Guide.md</D:href>"
            )),
        "SVN update-report depth=infinity should include nested executable-backed entries: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:replay-report xmlns:S="svn:">
  <S:revision>{revision}</S:revision>
  <S:low-water-mark>0</S:low-water-mark>
  <S:send-deltas>0</S:send-deltas>
</S:replay-report>"#
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
        text.contains("<S:editor-report")
            && text.contains(&format!(r#"<S:target-revision rev="{revision}"/>"#))
            && text.contains(r#"<S:open-root rev="0">"#)
            && text.contains(r#"<S:add-directory name="trunk">"#)
            && text.contains(r#"<S:add-file name="trunk/README.md">"#)
            && text.contains("<S:close-file")
            && text.contains("</S:editor-report>"),
        "SVN replay-report should expose executable-backed ra_serf editor operations: {text}"
    );

    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:list-report xmlns:S="svn:">
  <S:path>trunk</S:path>
  <S:revision>{revision}</S:revision>
  <S:depth>immediates</S:depth>
</S:list-report>"#
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
        text.contains("<S:list-report")
            && text.contains(&format!(
                r#"<S:item node-kind="file" size="15" created-rev="{revision}""#
            ))
            && text.contains("<D:creator-displayname>")
            && text.contains("trunk/README.md")
            && text.contains("</S:item>"),
        "SVN list-report should expose executable-backed directory entries in ra_serf shape: {text}"
    );

    let inherited_revision = yona_rust_vcs::svn_patch_properties(
        &repo_path,
        "trunk",
        &[yona_rust_vcs::SvnPropertyPatch {
            name: "reviewed".to_string(),
            value: Some("true".to_string()),
        }],
        "seed inherited property",
    )
    .expect("seed inherited svn property");
    let report = Method::from_bytes(b"REPORT").expect("REPORT method");
    let response = direct_request_with_body(
        app.clone(),
        report,
        "/svn/owner/projectYobi/!svn/vcc/default",
        None,
        Body::from(format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<S:inherited-props-report xmlns:S="svn:">
  <S:revision>{inherited_revision}</S:revision>
  <S:path>trunk/README.md</S:path>
</S:inherited-props-report>"#
        )),
    )
    .await;
    let status = response.status();
    let dav_header = response
        .headers()
        .get("dav")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(
        status,
        StatusCode::OK,
        "SVN inherited-props REPORT should succeed: {text}"
    );
    assert_eq!(dav_header.as_deref(), Some("1,2"));
    assert!(
        text.contains("<S:inherited-props-report")
            && text.contains("<S:iprop-item>")
            && text.contains("<S:iprop-path>trunk</S:iprop-path>")
            && text.contains("<S:iprop-propname>reviewed</S:iprop-propname>")
            && text.contains("<S:iprop-propval>true</S:iprop-propval>"),
        "SVN inherited-props REPORT should expose executable-backed inherited regular properties: {text}"
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
    let status = response.status();
    let dav_header = response
        .headers()
        .get("dav")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(
        status,
        StatusCode::OK,
        "SVN file-revs REPORT should succeed: {text}"
    );
    assert_eq!(dav_header.as_deref(), Some("1,2"));
    assert!(
        text.contains("<S:file-revs-report")
            && text.contains(&format!(
                r#"<S:file-rev path="/trunk/README.md" rev="{revision}">"#
            ))
            && text.contains(r#"<S:rev-prop name="svn:author">"#)
            && text.contains("<S:txdelta>")
            && text.contains("<S:rev-prop name=\"svn:log\">seed svn readme</S:rev-prop>"),
        "SVN file-revs REPORT should expose executable-backed file revision metadata and content delta: {text}"
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
            && text.contains("/yona/svn/owner/projectYobi/trunk/README.md")
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
        text.contains("<D:lockdiscovery>")
            && text.contains("<D:owner>owner</D:owner>")
            && text.contains("<D:supportedlock>")
            && text.contains("<D:lockscope><D:exclusive/></D:lockscope>")
            && text.contains("<D:locktype><D:write/></D:locktype>")
            && text.contains(lock_token.trim_matches(['<', '>']))
            && text.contains(
                "<D:lockroot><D:href>/yona/svn/owner/projectYobi/trunk/README.md</D:href></D:lockroot>"
            ),
        "SVN file PROPFIND should expose executable-backed lock discovery metadata: {text}"
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
        text.contains(r#"xmlns:C="http://subversion.tigris.org/xmlns/custom/""#)
            && text.contains("<SD:deadprop-count>1</SD:deadprop-count>")
            && text.contains("<C:reviewed>true</C:reviewed>"),
        "SVN file PROPFIND should expose executable-backed regular properties: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind.clone(),
        "/svn/owner/projectYobi/trunk/README.md",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:propname/>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<C:reviewed/>") && !text.contains("<C:reviewed>true</C:reviewed>"),
        "SVN file PROPFIND propname should expose custom property names without values: {text}"
    );
    assert!(
        text.contains("<D:resourcetype/>")
            && text.contains("<D:displayname/>")
            && text.contains("<D:supportedlock/>")
            && text.contains("<D:getcontentlength/>")
            && text.contains("<D:getcontenttype/>")
            && text.contains("<D:getetag/>")
            && text.contains("<D:version-name/>")
            && text.contains("<D:checked-in/>")
            && text.contains("<D:baseline-collection/>")
            && text.contains("<S:baseline-relative-path/>")
            && text.contains("<S:repository-uuid/>")
            && text.contains("<D:version-controlled-configuration/>")
            && !text.contains("<D:href>/yona/svn/owner/projectYobi/!svn/ver/"),
        "SVN file PROPFIND propname should expose live property names without values: {text}"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request_with_body(
        app.clone(),
        propfind,
        "/svn/owner/projectYobi/trunk/README.md",
        None,
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:S="http://subversion.tigris.org/xmlns/dav/">
  <D:prop>
    <D:resourcetype/>
    <D:displayname/>
    <D:supportedlock/>
    <D:getcontenttype/>
    <D:getetag/>
    <S:baseline-relative-path/>
    <S:repository-uuid/>
  </D:prop>
</D:propfind>"#,
        ),
    )
    .await;
    assert_eq!(response.status(), StatusCode::MULTI_STATUS);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        text.contains("<D:resourcetype/>")
            && text.contains("<D:displayname>README.md</D:displayname>")
            && text.contains("<D:supportedlock>")
            && text.contains("<D:getcontenttype>application/octet-stream</D:getcontenttype>")
            && text.contains("<D:getetag>&quot;")
            && text.contains(":trunk/README.md&quot;</D:getetag>")
            && text.contains("<S:baseline-relative-path>trunk/README.md</S:baseline-relative-path>")
            && text.contains("<S:repository-uuid>")
            && !text.contains("<D:getcontentlength>")
            && !text.contains("<D:checked-in>")
            && !text.contains("<D:version-controlled-configuration>")
            && !text.contains("<C:reviewed>true</C:reviewed>"),
        "SVN file PROPFIND should only return requested metadata unless allprop was requested: {text}"
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
    let status = response.status();
    let dav_header = response
        .headers()
        .get("dav")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(
        status,
        StatusCode::OK,
        "SVN get-deleted-rev REPORT should succeed: {text}"
    );
    assert_eq!(dav_header.as_deref(), Some("1,2"));
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
        text.contains("/yona/svn/owner/projectYobi/trunk/docs/")
            && text.contains("<D:resourcetype><D:collection/></D:resourcetype>"),
        "SVN MKCOL should create a WebDAV collection visible through PROPFIND: {text}"
    );
}

#[tokio::test]
async fn svn_protocol_external_client_can_info_public_project() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN client smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello from external svn client\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    run_svn_blocking(
        vec![
            "info".to_string(),
            "--non-interactive".to_string(),
            svn_url.clone(),
        ],
        None,
    )
    .await;

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_ls_cat_and_log_public_project() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN read smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello from external svn read\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let ls_output = tokio::task::spawn_blocking({
        let svn_url = svn_url.clone();
        move || {
            run_svn_capture(
                &["ls", "--non-interactive", "--verbose", svn_url.as_str()],
                None,
            )
        }
    })
    .await
    .expect("svn ls task");
    assert!(
        ls_output.status.success(),
        "svn ls should list repository root entries\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&ls_output.stdout),
        String::from_utf8_lossy(&ls_output.stderr)
    );
    assert!(
        String::from_utf8_lossy(&ls_output.stdout).contains("trunk/"),
        "svn ls should expose the seeded trunk directory\nstdout: {}",
        String::from_utf8_lossy(&ls_output.stdout)
    );
    assert!(
        !String::from_utf8_lossy(&ls_output.stdout).contains("invalid date"),
        "svn ls should receive client-parseable repository dates\nstdout: {}",
        String::from_utf8_lossy(&ls_output.stdout)
    );

    let cat_output = tokio::task::spawn_blocking({
        let readme_url = format!("{svn_url}/trunk/README.md");
        move || run_svn_capture(&["cat", "--non-interactive", readme_url.as_str()], None)
    })
    .await
    .expect("svn cat task");
    assert!(
        cat_output.status.success(),
        "svn cat should read repository file contents\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&cat_output.stdout),
        String::from_utf8_lossy(&cat_output.stderr)
    );
    assert_eq!(
        String::from_utf8_lossy(&cat_output.stdout),
        "hello from external svn read\n"
    );

    let log_output = tokio::task::spawn_blocking({
        let svn_url = svn_url.clone();
        move || {
            run_svn_capture(
                &["log", "--non-interactive", "-l", "1", svn_url.as_str()],
                None,
            )
        }
    })
    .await
    .expect("svn log task");
    assert!(
        log_output.status.success(),
        "svn log should read repository revision metadata\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&log_output.stdout),
        String::from_utf8_lossy(&log_output.stderr)
    );
    let log_stdout = String::from_utf8_lossy(&log_output.stdout);
    assert!(
        log_stdout.contains("seed svn readme"),
        "svn log should include the seeded repository commit message\nstdout: {log_stdout}"
    );
    assert!(
        !log_stdout.contains("invalid date"),
        "svn log should receive client-parseable repository dates\nstdout: {log_stdout}"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_ls_recursive_public_project() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN recursive ls smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before external svn recursive ls\n")
        .expect("seed svn readme");
    seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let ls_output = tokio::task::spawn_blocking(move || {
        run_svn_capture(&["ls", "--non-interactive", "-R", svn_url.as_str()], None)
    })
    .await
    .expect("svn recursive ls task");
    assert!(
        ls_output.status.success(),
        "svn ls -R should recursively list repository entries\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&ls_output.stdout),
        String::from_utf8_lossy(&ls_output.stderr)
    );
    let stdout = String::from_utf8_lossy(&ls_output.stdout);
    assert!(
        stdout.contains("trunk/README.md") && stdout.contains("trunk/manual/guide.md"),
        "svn ls -R should expose nested repository entries\nstdout: {stdout}"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_log_verbose_public_project() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN verbose log smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before external svn verbose log\n")
        .expect("seed svn readme");
    seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let log_output = tokio::task::spawn_blocking({
        let svn_url = svn_url.clone();
        move || {
            run_svn_capture(
                &[
                    "log",
                    "--non-interactive",
                    "--verbose",
                    "-l",
                    "2",
                    svn_url.as_str(),
                ],
                None,
            )
        }
    })
    .await
    .expect("svn verbose log task");
    assert!(
        log_output.status.success(),
        "svn log --verbose should read changed path metadata\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&log_output.stdout),
        String::from_utf8_lossy(&log_output.stderr)
    );
    let log_stdout = String::from_utf8_lossy(&log_output.stdout);
    assert!(
        log_stdout.contains("Changed paths:"),
        "svn log --verbose should include the changed-paths section\nstdout: {log_stdout}"
    );
    assert!(
        log_stdout.contains("A /trunk/manual") && log_stdout.contains("A /trunk/manual/guide.md"),
        "svn log --verbose should include executable-backed changed paths\nstdout: {log_stdout}"
    );
    assert!(
        log_stdout.contains("seed svn nested tree"),
        "svn log --verbose should include the nested fixture commit message\nstdout: {log_stdout}"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_read_mergeinfo() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN mergeinfo smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before external svn mergeinfo\n").expect("seed svn readme");
    yona_rust_vcs::svn_copy_path(&repo_path, None, "trunk", "topic", "seed mergeinfo branch")
        .expect("seed mergeinfo branch");
    seed_svn_mergeinfo(&repo_path, "trunk", "/topic:2").expect("seed svn mergeinfo");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let trunk_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let branch_url = format!("{base_url}/yona/svn/owner/projectYobi/topic");
    let mergeinfo_output = tokio::task::spawn_blocking(move || {
        run_svn_capture(
            &[
                "mergeinfo",
                "--non-interactive",
                "--show-revs",
                "merged",
                branch_url.as_str(),
                trunk_url.as_str(),
            ],
            None,
        )
    })
    .await
    .expect("svn mergeinfo task");
    assert!(
        mergeinfo_output.status.success(),
        "svn mergeinfo should consume mergeinfo-report metadata\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&mergeinfo_output.stdout),
        String::from_utf8_lossy(&mergeinfo_output.stderr)
    );
    let mergeinfo_stdout = String::from_utf8_lossy(&mergeinfo_output.stdout);
    assert!(
        mergeinfo_stdout.contains("r2"),
        "svn mergeinfo should expose the merged branch revision\nstdout: {mergeinfo_stdout}"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_blame_public_file() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN blame smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello from external svn blame\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let readme_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk/README.md");
    let blame_output = tokio::task::spawn_blocking(move || {
        run_svn_capture(&["blame", "--non-interactive", readme_url.as_str()], None)
    })
    .await
    .expect("svn blame task");
    assert!(
        blame_output.status.success(),
        "svn blame should consume file-revs REPORT metadata\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&blame_output.stdout),
        String::from_utf8_lossy(&blame_output.stderr)
    );
    let blame_stdout = String::from_utf8_lossy(&blame_output.stdout);
    assert!(
        blame_stdout.contains("hello from external svn blame"),
        "svn blame should annotate the seeded file contents\nstdout: {blame_stdout}"
    );
    assert!(
        !blame_stdout.contains("invalid date"),
        "svn blame should receive client-parseable revision dates\nstdout: {blame_stdout}"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_diff_public_file() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN diff smoke because svnadmin/svnlook/svn is unavailable");
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
    let base_revision =
        seed_svn_readme(&repo_path, "hello before external svn diff\n").expect("seed svn readme");
    let target_revision = yona_rust_vcs::svn_put_file(
        &repo_path,
        "trunk/README.md",
        b"hello after external svn diff\n",
        "external svn diff fixture",
    )
    .expect("seed svn diff target revision");
    assert!(
        target_revision > base_revision,
        "diff fixture should advance the repository revision"
    );

    let (base_url, shutdown) = spawn_app_server(app).await;
    let readme_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk/README.md");
    let base_cat_output = tokio::task::spawn_blocking({
        let readme_url = readme_url.clone();
        let base_revision = base_revision.to_string();
        move || {
            run_svn_capture(
                &[
                    "cat",
                    "--non-interactive",
                    "-r",
                    base_revision.as_str(),
                    readme_url.as_str(),
                ],
                None,
            )
        }
    })
    .await
    .expect("svn cat base revision task");
    assert!(
        base_cat_output.status.success(),
        "svn cat should read the base revision\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&base_cat_output.stdout),
        String::from_utf8_lossy(&base_cat_output.stderr)
    );
    assert_eq!(
        String::from_utf8_lossy(&base_cat_output.stdout),
        "hello before external svn diff\n"
    );

    let old_readme_url =
        format!("{base_url}/yona/svn/owner/projectYobi/trunk/README.md@{base_revision}");
    let new_readme_url =
        format!("{base_url}/yona/svn/owner/projectYobi/trunk/README.md@{target_revision}");
    let diff_output = tokio::task::spawn_blocking(move || {
        run_svn_capture(
            &[
                "diff",
                "--non-interactive",
                "--old",
                old_readme_url.as_str(),
                "--new",
                new_readme_url.as_str(),
            ],
            None,
        )
    })
    .await
    .expect("svn diff task");
    assert!(
        diff_output.status.success(),
        "svn diff should consume update-report deltas\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&diff_output.stdout),
        String::from_utf8_lossy(&diff_output.stderr)
    );
    let diff_stdout = String::from_utf8_lossy(&diff_output.stdout);
    assert!(
        diff_stdout.contains("-hello before external svn diff")
            && diff_stdout.contains("+hello after external svn diff"),
        "svn diff should expose old and new README contents\nstdout: {diff_stdout}"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_checkout_public_project() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN checkout smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello from external svn checkout\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let checkout_dir = tempdir().expect("svn checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("trunk").join("README.md");
    let contents = std::fs::read_to_string(&readme).unwrap_or_else(|error| {
        panic!(
            "checkout should materialize README at {}; error: {error}; paths: {:?}",
            readme.display(),
            list_relative_paths(checkout_dir.path())
        )
    });
    assert_eq!(contents, "hello from external svn checkout\n");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_checkout_depth_empty() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN depth-empty checkout smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello from external svn depth empty checkout\n")
        .expect("seed svn readme");
    seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let trunk_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let checkout_dir = tempdir().expect("svn depth-empty checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            "--depth".to_string(),
            "empty".to_string(),
            trunk_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let checkout_root = checkout_dir.path();
    assert!(
        checkout_root.join(".svn").is_dir(),
        "depth-empty checkout should still create a working copy root; paths: {:?}",
        list_relative_paths(checkout_root)
    );
    assert!(
        !checkout_root.join("README.md").exists(),
        "depth-empty checkout should not materialize direct files; paths: {:?}",
        list_relative_paths(checkout_root)
    );
    assert!(
        !checkout_root.join("manual").exists(),
        "depth-empty checkout should not materialize direct child directories; paths: {:?}",
        list_relative_paths(checkout_root)
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_deepen_depth_empty_checkout() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN depth-deepen smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello from external svn depth-deepen update\n")
        .expect("seed svn readme");
    seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let trunk_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let checkout_dir = tempdir().expect("svn depth-deepen checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            "--depth".to_string(),
            "empty".to_string(),
            trunk_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    run_svn_blocking(
        vec![
            "update".to_string(),
            "--non-interactive".to_string(),
            "--set-depth".to_string(),
            "infinity".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("README.md");
    let contents = std::fs::read_to_string(&readme).unwrap_or_else(|error| {
        panic!(
            "depth-deepen update should materialize direct README at {}; error: {error}; paths: {:?}",
            readme.display(),
            list_relative_paths(checkout_dir.path())
        )
    });
    assert_eq!(contents, "hello from external svn depth-deepen update\n");
    let nested_guide = checkout_dir.path().join("manual").join("guide.md");
    let contents = std::fs::read_to_string(&nested_guide).unwrap_or_else(|error| {
        panic!(
            "depth-deepen update should materialize nested guide at {}; error: {error}; paths: {:?}",
            nested_guide.display(),
            list_relative_paths(checkout_dir.path())
        )
    });
    assert_eq!(contents, "nested guide\n");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_update_depth_empty_checkout_to_files() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN depth-files update smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello from external svn depth-files update\n")
        .expect("seed svn readme");
    seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let trunk_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let checkout_dir = tempdir().expect("svn depth-files update tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            "--depth".to_string(),
            "empty".to_string(),
            trunk_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    run_svn_blocking(
        vec![
            "update".to_string(),
            "--non-interactive".to_string(),
            "--set-depth".to_string(),
            "files".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("README.md");
    let contents = std::fs::read_to_string(&readme).unwrap_or_else(|error| {
        panic!(
            "depth-files update should materialize direct README at {}; error: {error}; paths: {:?}",
            readme.display(),
            list_relative_paths(checkout_dir.path())
        )
    });
    assert_eq!(contents, "hello from external svn depth-files update\n");
    let manual = checkout_dir.path().join("manual");
    assert!(
        !manual.exists(),
        "depth-files update should keep child directories absent; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_shrink_checkout_depth_to_files() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN depth-files shrink smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello from external svn depth-files shrink\n")
        .expect("seed svn readme");
    seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let trunk_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let checkout_dir = tempdir().expect("svn depth-files shrink tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            trunk_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("README.md");
    let manual = checkout_dir.path().join("manual");
    assert!(
        readme.is_file() && manual.join("guide.md").is_file(),
        "full checkout should materialize direct and nested files before files-depth shrink; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );

    run_svn_blocking(
        vec![
            "update".to_string(),
            "--non-interactive".to_string(),
            "--set-depth".to_string(),
            "files".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let contents = std::fs::read_to_string(&readme).unwrap_or_else(|error| {
        panic!(
            "depth-files shrink should keep direct README at {}; error: {error}; paths: {:?}",
            readme.display(),
            list_relative_paths(checkout_dir.path())
        )
    });
    assert_eq!(contents, "hello from external svn depth-files shrink\n");
    assert!(
        !manual.exists(),
        "depth-files shrink should remove child directories from the working copy; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_exclude_child_directory_depth() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN depth-exclude smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello from external svn depth exclude\n")
        .expect("seed svn readme");
    seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let trunk_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let checkout_dir = tempdir().expect("svn depth-exclude tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            trunk_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let manual = checkout_dir.path().join("manual");
    assert!(
        manual.join("guide.md").is_file(),
        "full checkout should materialize manual/guide.md before depth exclude; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );

    run_svn_blocking(
        vec![
            "update".to_string(),
            "--non-interactive".to_string(),
            "--set-depth".to_string(),
            "exclude".to_string(),
            manual.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    assert!(
        !manual.exists(),
        "depth exclude should remove the excluded child directory from the working copy; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_shrink_checkout_depth_to_empty() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN depth-shrink smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello from external svn depth-shrink update\n")
        .expect("seed svn readme");
    seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let trunk_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let checkout_dir = tempdir().expect("svn depth-shrink checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            trunk_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("README.md");
    let nested_guide = checkout_dir.path().join("manual").join("guide.md");
    assert!(
        readme.is_file() && nested_guide.is_file(),
        "full checkout should materialize direct and nested files before shrinking depth; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );

    run_svn_blocking(
        vec![
            "update".to_string(),
            "--non-interactive".to_string(),
            "--set-depth".to_string(),
            "empty".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    assert!(
        checkout_dir.path().join(".svn").is_dir(),
        "depth-shrink update should keep the working-copy root; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );
    assert!(
        !readme.exists(),
        "depth-shrink update should remove direct files from the working copy; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );
    assert!(
        !checkout_dir.path().join("manual").exists(),
        "depth-shrink update should remove child directories from the working copy; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_checkout_depth_files() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN depth-files checkout smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello from external svn depth files checkout\n")
        .expect("seed svn readme");
    seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let trunk_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let checkout_dir = tempdir().expect("svn depth checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            "--depth".to_string(),
            "files".to_string(),
            trunk_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("README.md");
    let contents = std::fs::read_to_string(&readme).unwrap_or_else(|error| {
        panic!(
            "depth-files checkout should materialize direct README at {}; error: {error}; paths: {:?}",
            readme.display(),
            list_relative_paths(checkout_dir.path())
        )
    });
    assert_eq!(contents, "hello from external svn depth files checkout\n");
    let manual = checkout_dir.path().join("manual");
    assert!(
        !manual.exists(),
        "depth-files checkout should not materialize child directories; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_checkout_depth_immediates() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN depth-immediates checkout smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(
        &repo_path,
        "hello from external svn depth immediates checkout\n",
    )
    .expect("seed svn readme");
    seed_svn_nested_tree(&repo_path).expect("seed svn nested tree");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let trunk_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let checkout_dir = tempdir().expect("svn depth-immediates checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            "--depth".to_string(),
            "immediates".to_string(),
            trunk_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("README.md");
    let contents = std::fs::read_to_string(&readme).unwrap_or_else(|error| {
        panic!(
            "depth-immediates checkout should materialize direct README at {}; error: {error}; paths: {:?}",
            readme.display(),
            list_relative_paths(checkout_dir.path())
        )
    });
    assert_eq!(
        contents,
        "hello from external svn depth immediates checkout\n"
    );
    let manual = checkout_dir.path().join("manual");
    assert!(
        manual.is_dir(),
        "depth-immediates checkout should materialize direct child directories; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );
    let nested_guide = manual.join("guide.md");
    assert!(
        !nested_guide.exists(),
        "depth-immediates checkout should not materialize nested child files; paths: {:?}",
        list_relative_paths(checkout_dir.path())
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_switch_working_copy_directory() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN switch smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello from trunk before svn switch\n").expect("seed svn readme");
    yona_rust_vcs::svn_copy_path(
        &repo_path,
        None,
        "trunk",
        "branch-switch",
        "seed switch branch",
    )
    .expect("seed switch branch copy");
    yona_rust_vcs::svn_put_file(
        &repo_path,
        "branch-switch/README.md",
        b"hello from branch after svn switch\n",
        "seed switch branch contents",
    )
    .expect("seed switch branch contents");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let trunk_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let branch_url = format!("{base_url}/yona/svn/owner/projectYobi/branch-switch");
    let checkout_dir = tempdir().expect("svn switch checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            trunk_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    run_svn_blocking(
        vec![
            "switch".to_string(),
            "--non-interactive".to_string(),
            branch_url.clone(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("README.md");
    let contents = std::fs::read_to_string(&readme).unwrap_or_else(|error| {
        panic!(
            "switch should materialize branch README at {}; error: {error}; paths: {:?}",
            readme.display(),
            list_relative_paths(checkout_dir.path())
        )
    });
    assert_eq!(contents, "hello from branch after svn switch\n");
    let info_output = tokio::task::spawn_blocking({
        let checkout_path = checkout_dir.path().to_path_buf();
        move || run_svn_capture(&["info", "--non-interactive"], Some(&checkout_path))
    })
    .await
    .expect("svn switch info task");
    assert!(
        info_output.status.success(),
        "svn info should succeed after switch\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&info_output.stdout),
        String::from_utf8_lossy(&info_output.stderr)
    );
    let info_stdout = String::from_utf8_lossy(&info_output.stdout);
    assert!(
        info_stdout.contains(&format!("URL: {branch_url}")),
        "svn info should report switched URL\nstdout: {info_stdout}"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_export_public_project() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN export smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello from external svn export\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let export_root = tempdir().expect("svn export tempdir");
    let export_dir = export_root.path().join("exported");
    run_svn_blocking(
        vec![
            "export".to_string(),
            "--non-interactive".to_string(),
            svn_url,
            export_dir.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = export_dir.join("trunk").join("README.md");
    let contents = std::fs::read_to_string(&readme).unwrap_or_else(|error| {
        panic!(
            "export should materialize README at {}; error: {error}; paths: {:?}",
            readme.display(),
            list_relative_paths(export_root.path())
        )
    });
    assert_eq!(contents, "hello from external svn export\n");
    assert!(
        !export_dir.join(".svn").exists(),
        "svn export should not create working-copy metadata"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_checkout_requested_revision() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN revision-pinned checkout smoke because svnadmin/svnlook/svn is unavailable"
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
    let initial_revision = seed_svn_readme(
        &repo_path,
        "hello from external svn requested revision checkout\n",
    )
    .expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let writer_checkout = tempdir().expect("svn writer checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url.clone(),
            writer_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let writer_readme = writer_checkout.path().join("trunk").join("README.md");
    std::fs::write(
        &writer_readme,
        "hello after external svn requested revision checkout\n",
    )
    .expect("edit writer checkout readme");
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn requested revision checkout smoke".to_string(),
            writer_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let old_checkout = tempdir().expect("svn requested revision checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            "-r".to_string(),
            initial_revision.to_string(),
            svn_url,
            old_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let old_readme = old_checkout.path().join("trunk").join("README.md");
    let contents = std::fs::read_to_string(&old_readme).unwrap_or_else(|error| {
        panic!(
            "revision-pinned checkout should materialize README at {}; error: {error}; paths: {:?}",
            old_readme.display(),
            list_relative_paths(old_checkout.path())
        )
    });
    assert_eq!(
        contents,
        "hello from external svn requested revision checkout\n"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_commit_file_update() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN commit smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello before external svn commit\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let checkout_dir = tempdir().expect("svn checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("trunk").join("README.md");
    std::fs::write(&readme, "hello after external svn commit\n").expect("edit checkout readme");
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn commit smoke".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let committed = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README.md")
        .expect("read committed readme");
    assert_eq!(committed, b"hello after external svn commit\n");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_update_after_remote_commit() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN update smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello before external svn update\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let writer_checkout = tempdir().expect("svn writer checkout tempdir");
    let reader_checkout = tempdir().expect("svn reader checkout tempdir");
    for checkout_dir in [&writer_checkout, &reader_checkout] {
        run_svn_blocking(
            vec![
                "checkout".to_string(),
                "--non-interactive".to_string(),
                svn_url.clone(),
                checkout_dir.path().to_string_lossy().to_string(),
            ],
            None,
        )
        .await;
    }

    let writer_readme = writer_checkout.path().join("trunk").join("README.md");
    std::fs::write(&writer_readme, "hello after external svn update\n")
        .expect("edit writer checkout readme");
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn update smoke".to_string(),
            writer_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let status_output = tokio::task::spawn_blocking({
        let reader_checkout = reader_checkout.path().to_path_buf();
        move || {
            run_svn_capture(
                &["status", "--non-interactive", "-u"],
                Some(&reader_checkout),
            )
        }
    })
    .await
    .expect("svn status -u task");
    assert!(
        status_output.status.success(),
        "svn status -u should report remote changes before update\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&status_output.stdout),
        String::from_utf8_lossy(&status_output.stderr)
    );
    let status_stdout = String::from_utf8_lossy(&status_output.stdout);
    assert!(
        status_stdout.contains('*') && status_stdout.contains("README.md"),
        "svn status -u should mark README as remotely changed\nstdout: {status_stdout}"
    );

    run_svn_blocking(
        vec![
            "update".to_string(),
            "--non-interactive".to_string(),
            reader_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let reader_readme = reader_checkout.path().join("trunk").join("README.md");
    let contents = std::fs::read_to_string(&reader_readme).expect("read updated checkout readme");
    assert_eq!(contents, "hello after external svn update\n");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_update_to_older_revision_and_back_to_head() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN revision update smoke because svnadmin/svnlook/svn is unavailable"
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
    let initial_revision = seed_svn_readme(&repo_path, "hello before revision-targeted update\n")
        .expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let writer_checkout = tempdir().expect("svn writer checkout tempdir");
    let reader_checkout = tempdir().expect("svn reader checkout tempdir");
    for checkout_dir in [&writer_checkout, &reader_checkout] {
        run_svn_blocking(
            vec![
                "checkout".to_string(),
                "--non-interactive".to_string(),
                svn_url.clone(),
                checkout_dir.path().to_string_lossy().to_string(),
            ],
            None,
        )
        .await;
    }

    let writer_readme = writer_checkout.path().join("trunk").join("README.md");
    std::fs::write(&writer_readme, "hello after revision-targeted update\n")
        .expect("edit writer checkout readme");
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn revision-targeted update smoke".to_string(),
            writer_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    run_svn_blocking(
        vec![
            "update".to_string(),
            "--non-interactive".to_string(),
            "-r".to_string(),
            initial_revision.to_string(),
            reader_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let reader_readme = reader_checkout.path().join("trunk").join("README.md");
    let contents =
        std::fs::read_to_string(&reader_readme).expect("read old-revision checkout readme");
    assert_eq!(contents, "hello before revision-targeted update\n");

    run_svn_blocking(
        vec![
            "update".to_string(),
            "--non-interactive".to_string(),
            reader_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let contents =
        std::fs::read_to_string(&reader_readme).expect("read head-revision checkout readme");
    assert_eq!(contents, "hello after revision-targeted update\n");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_update_after_remote_delete() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN delete update smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before external svn delete update\n")
        .expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let writer_checkout = tempdir().expect("svn delete writer checkout tempdir");
    let reader_checkout = tempdir().expect("svn delete reader checkout tempdir");
    for checkout_dir in [&writer_checkout, &reader_checkout] {
        run_svn_blocking(
            vec![
                "checkout".to_string(),
                "--non-interactive".to_string(),
                svn_url.clone(),
                checkout_dir.path().to_string_lossy().to_string(),
            ],
            None,
        )
        .await;
    }

    let writer_readme = writer_checkout.path().join("trunk").join("README.md");
    run_svn_blocking(
        vec![
            "delete".to_string(),
            "--non-interactive".to_string(),
            writer_readme.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn delete update smoke".to_string(),
            writer_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    run_svn_blocking(
        vec![
            "update".to_string(),
            "--non-interactive".to_string(),
            reader_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let reader_readme = reader_checkout.path().join("trunk").join("README.md");
    assert!(
        !reader_readme.exists(),
        "svn update should remove files deleted in the remote repository"
    );

    let deleted = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README.md");
    assert!(
        matches!(deleted, Err(yona_rust_vcs::VcsError::NotFound)),
        "fixture should delete README.md from the executable-backed repository"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_reports_conflict_on_update() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN conflict smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before external svn conflict\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let writer_checkout = tempdir().expect("svn writer checkout tempdir");
    let conflicted_checkout = tempdir().expect("svn conflicted checkout tempdir");
    for checkout_dir in [&writer_checkout, &conflicted_checkout] {
        run_svn_blocking(
            vec![
                "checkout".to_string(),
                "--non-interactive".to_string(),
                svn_url.clone(),
                checkout_dir.path().to_string_lossy().to_string(),
            ],
            None,
        )
        .await;
    }

    let writer_readme = writer_checkout.path().join("trunk").join("README.md");
    std::fs::write(&writer_readme, "remote update line\n").expect("edit writer checkout readme");
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn conflict remote edit".to_string(),
            writer_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let local_readme = conflicted_checkout.path().join("trunk").join("README.md");
    std::fs::write(&local_readme, "local conflicting line\n")
        .expect("edit conflicted checkout readme");
    let update_output = tokio::task::spawn_blocking({
        let checkout = conflicted_checkout.path().to_path_buf();
        move || {
            run_svn_capture(
                &[
                    "update",
                    "--non-interactive",
                    checkout.to_string_lossy().as_ref(),
                ],
                None,
            )
        }
    })
    .await
    .expect("svn update task");
    assert!(
        update_output.status.success(),
        "svn update should complete after recording conflict\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&update_output.stdout),
        String::from_utf8_lossy(&update_output.stderr)
    );

    let status_output = tokio::task::spawn_blocking({
        let checkout = conflicted_checkout.path().to_path_buf();
        move || run_svn_capture(&["status", checkout.to_string_lossy().as_ref()], None)
    })
    .await
    .expect("svn status task");
    assert!(
        status_output.status.success(),
        "svn status should complete\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&status_output.stdout),
        String::from_utf8_lossy(&status_output.stderr)
    );
    let status = String::from_utf8_lossy(&status_output.stdout);
    let contents = std::fs::read_to_string(&local_readme).expect("read conflicted checkout readme");
    assert!(
        status.contains("C       ") || contents.contains("<<<<<<<"),
        "svn update should leave a local conflict marker or C status\nstatus: {status}\ncontents: {contents}"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_add_file_and_commit() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN add smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello before external svn add\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let checkout_dir = tempdir().expect("svn checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let added = checkout_dir.path().join("trunk").join("ADDED.txt");
    std::fs::write(&added, "hello from external svn add\n").expect("write added file");
    run_svn_blocking(
        vec![
            "add".to_string(),
            "--non-interactive".to_string(),
            added.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn add smoke".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let committed =
        yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/ADDED.txt").expect("read added file");
    assert_eq!(committed, b"hello from external svn add\n");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_delete_file_and_commit() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN delete smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello before external svn delete\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let checkout_dir = tempdir().expect("svn checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("trunk").join("README.md");
    run_svn_blocking(
        vec![
            "delete".to_string(),
            "--non-interactive".to_string(),
            readme.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn delete smoke".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let deleted = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README.md");
    assert!(matches!(deleted, Err(yona_rust_vcs::VcsError::NotFound)));

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_delete_direct_url() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN direct URL delete smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before direct URL svn delete\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let readme_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk/README.md");
    let delete_output = tokio::task::spawn_blocking(move || {
        run_svn_capture(
            &[
                "delete",
                "--non-interactive",
                "--username",
                "owner",
                "--password",
                "doorpass1",
                "-m",
                "external svn direct URL delete smoke",
                readme_url.as_str(),
            ],
            None,
        )
    })
    .await
    .expect("svn direct URL delete task");
    assert!(
        delete_output.status.success(),
        "svn delete URL should commit directly against the mounted DAV boundary\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&delete_output.stdout),
        String::from_utf8_lossy(&delete_output.stderr)
    );

    let deleted = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README.md");
    assert!(
        matches!(deleted, Err(yona_rust_vcs::VcsError::NotFound)),
        "svn direct URL delete should remove README.md"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_mkdir_and_commit() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN mkdir smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello before external svn mkdir\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let checkout_dir = tempdir().expect("svn checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let docs_dir = checkout_dir.path().join("trunk").join("docs");
    run_svn_blocking(
        vec![
            "mkdir".to_string(),
            "--non-interactive".to_string(),
            docs_dir.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn mkdir smoke".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let tree =
        yona_rust_vcs::svn_list_tree(&repo_path, None, "trunk").expect("read committed tree");
    assert!(
        tree.entries
            .iter()
            .any(|entry| entry.is_dir && entry.path == "trunk/docs"),
        "svn mkdir commit should create trunk/docs; tree: {:?}",
        tree.entries
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_mkdir_direct_url() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN direct URL mkdir smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before direct URL svn mkdir\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let direct_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk/direct-url");
    let mkdir_output = tokio::task::spawn_blocking(move || {
        run_svn_capture(
            &[
                "mkdir",
                "--non-interactive",
                "--username",
                "owner",
                "--password",
                "doorpass1",
                "-m",
                "external svn direct URL mkdir smoke",
                direct_url.as_str(),
            ],
            None,
        )
    })
    .await
    .expect("svn direct URL mkdir task");
    assert!(
        mkdir_output.status.success(),
        "svn mkdir URL should commit directly against the mounted DAV boundary\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&mkdir_output.stdout),
        String::from_utf8_lossy(&mkdir_output.stderr)
    );

    let tree =
        yona_rust_vcs::svn_list_tree(&repo_path, None, "trunk").expect("read committed tree");
    assert!(
        tree.entries
            .iter()
            .any(|entry| entry.is_dir && entry.path == "trunk/direct-url"),
        "svn direct URL mkdir should create trunk/direct-url; tree: {:?}",
        tree.entries
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_import_direct_url() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN direct URL import smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before direct URL svn import\n").expect("seed svn readme");

    let import_dir = tempdir().expect("svn import tempdir");
    std::fs::write(
        import_dir.path().join("IMPORTED.txt"),
        "hello from direct URL svn import\n",
    )
    .expect("write import file");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let import_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk/imported");
    let import_output = tokio::task::spawn_blocking({
        let import_path = import_dir.path().to_path_buf();
        move || {
            run_svn_capture(
                &[
                    "import",
                    "--non-interactive",
                    "--username",
                    "owner",
                    "--password",
                    "doorpass1",
                    "-m",
                    "external svn direct URL import smoke",
                    import_path.to_string_lossy().as_ref(),
                    import_url.as_str(),
                ],
                None,
            )
        }
    })
    .await
    .expect("svn direct URL import task");
    assert!(
        import_output.status.success(),
        "svn import PATH URL should commit directly against the mounted DAV boundary\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&import_output.stdout),
        String::from_utf8_lossy(&import_output.stderr)
    );

    let imported = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/imported/IMPORTED.txt")
        .expect("read direct URL imported file");
    assert_eq!(imported, b"hello from direct URL svn import\n");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_propset_and_commit() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN propset smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before external svn propset\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let checkout_dir = tempdir().expect("svn checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url.clone(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("trunk").join("README.md");
    run_svn_blocking(
        vec![
            "propset".to_string(),
            "--non-interactive".to_string(),
            "yona:test".to_string(),
            "external-prop".to_string(),
            readme.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_svn_blocking(
        vec![
            "propset".to_string(),
            "--non-interactive".to_string(),
            "reviewed".to_string(),
            "external-reviewed".to_string(),
            readme.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn propset smoke".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let properties =
        yona_rust_vcs::svn_properties(&repo_path, None, "trunk/README.md").expect("read props");
    assert!(
        properties
            .iter()
            .any(|property| property.name == "yona:test" && property.value == "external-prop"),
        "svn propset commit should persist yona:test; properties: {:?}",
        properties
    );
    assert!(
        properties
            .iter()
            .any(|property| property.name == "reviewed" && property.value == "external-reviewed"),
        "svn propset commit should persist reviewed; properties: {:?}",
        properties
    );
    run_svn_blocking(
        vec![
            "update".to_string(),
            "--non-interactive".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    let propget_output = tokio::task::spawn_blocking({
        let readme = readme.clone();
        move || {
            run_svn_capture(
                &[
                    "propget",
                    "--non-interactive",
                    "yona:test",
                    readme.to_string_lossy().as_ref(),
                ],
                None,
            )
        }
    })
    .await
    .expect("svn propget task");
    assert!(
        propget_output.status.success(),
        "svn propget should read the committed custom property\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&propget_output.stdout),
        String::from_utf8_lossy(&propget_output.stderr)
    );
    assert_eq!(
        String::from_utf8_lossy(&propget_output.stdout).trim(),
        "external-prop"
    );
    let fresh_checkout = tempdir().expect("svn fresh checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url.clone(),
            fresh_checkout.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    let fresh_readme = fresh_checkout.path().join("trunk").join("README.md");
    let remote_propget_output = tokio::task::spawn_blocking({
        let fresh_readme = fresh_readme.clone();
        move || {
            run_svn_capture(
                &[
                    "propget",
                    "--non-interactive",
                    "reviewed",
                    fresh_readme.to_string_lossy().as_ref(),
                ],
                None,
            )
        }
    })
    .await
    .expect("svn fresh checkout propget task");
    assert!(
        remote_propget_output.status.success(),
        "fresh svn checkout should materialize the committed XML-safe custom property\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&remote_propget_output.stdout),
        String::from_utf8_lossy(&remote_propget_output.stderr)
    );
    assert_eq!(
        String::from_utf8_lossy(&remote_propget_output.stdout).trim(),
        "external-reviewed"
    );
    let direct_url_propget_output = tokio::task::spawn_blocking({
        let direct_readme_url = format!("{svn_url}/trunk/README.md");
        move || {
            run_svn_capture(
                &[
                    "propget",
                    "--non-interactive",
                    "reviewed",
                    direct_readme_url.as_str(),
                ],
                None,
            )
        }
    })
    .await
    .expect("svn direct URL propget task");
    assert!(
        direct_url_propget_output.status.success(),
        "direct URL svn propget should read the committed XML-safe custom property\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&direct_url_propget_output.stdout),
        String::from_utf8_lossy(&direct_url_propget_output.stderr)
    );
    assert_eq!(
        String::from_utf8_lossy(&direct_url_propget_output.stdout).trim(),
        "external-reviewed"
    );
    let direct_url_proplist_output = tokio::task::spawn_blocking({
        let direct_readme_url = format!("{svn_url}/trunk/README.md");
        move || {
            run_svn_capture(
                &[
                    "proplist",
                    "--non-interactive",
                    "--verbose",
                    direct_readme_url.as_str(),
                ],
                None,
            )
        }
    })
    .await
    .expect("svn direct URL proplist task");
    assert!(
        direct_url_proplist_output.status.success(),
        "direct URL svn proplist should read committed custom properties\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&direct_url_proplist_output.stdout),
        String::from_utf8_lossy(&direct_url_proplist_output.stderr)
    );
    let direct_url_proplist_stdout = String::from_utf8_lossy(&direct_url_proplist_output.stdout);
    assert!(
        direct_url_proplist_stdout.contains("reviewed")
            && direct_url_proplist_stdout.contains("external-reviewed"),
        "direct URL svn proplist should include reviewed property and value: {direct_url_proplist_stdout}"
    );

    run_svn_blocking(
        vec![
            "propdel".to_string(),
            "--non-interactive".to_string(),
            "yona:test".to_string(),
            readme.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_svn_blocking(
        vec![
            "propdel".to_string(),
            "--non-interactive".to_string(),
            "reviewed".to_string(),
            readme.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn propdel smoke".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let properties =
        yona_rust_vcs::svn_properties(&repo_path, None, "trunk/README.md").expect("read props");
    assert!(
        properties
            .iter()
            .all(|property| property.name != "yona:test" && property.name != "reviewed"),
        "svn propdel commit should remove yona:test and reviewed; properties: {:?}",
        properties
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_lock_and_unlock_file() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN lock smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello before external svn lock\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let checkout_dir = tempdir().expect("svn checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let readme = checkout_dir.path().join("trunk").join("README.md");
    run_svn_blocking(
        vec![
            "lock".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn lock smoke".to_string(),
            readme.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    let lock = yona_rust_vcs::svn_lock(&repo_path, "trunk/README.md")
        .expect("read lock")
        .expect("external svn lock should persist lock metadata");
    assert_eq!(lock.owner, "owner");

    run_svn_blocking(
        vec![
            "unlock".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            readme.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    let lock = yona_rust_vcs::svn_lock(&repo_path, "trunk/README.md").expect("read lock");
    assert!(lock.is_none(), "external svn unlock should clear the lock");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_copy_file_and_commit() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN copy smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello before external svn copy\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let checkout_dir = tempdir().expect("svn checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let source = checkout_dir.path().join("trunk").join("README.md");
    let copied = checkout_dir.path().join("trunk").join("README_COPY.md");
    run_svn_blocking(
        vec![
            "copy".to_string(),
            "--non-interactive".to_string(),
            source.to_string_lossy().to_string(),
            copied.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn copy smoke".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let committed = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README_COPY.md")
        .expect("read copied file");
    assert_eq!(committed, b"hello before external svn copy\n");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_copy_direct_url() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN direct URL copy smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before direct URL svn copy\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let source_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk/README.md");
    let copied_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk/README_DIRECT_COPY.md");
    let copy_output = tokio::task::spawn_blocking(move || {
        run_svn_capture(
            &[
                "copy",
                "--non-interactive",
                "--username",
                "owner",
                "--password",
                "doorpass1",
                "-m",
                "external svn direct URL copy smoke",
                source_url.as_str(),
                copied_url.as_str(),
            ],
            None,
        )
    })
    .await
    .expect("svn direct URL copy task");
    assert!(
        copy_output.status.success(),
        "svn copy URL URL should commit directly against the mounted DAV boundary\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&copy_output.stdout),
        String::from_utf8_lossy(&copy_output.stderr)
    );

    let committed = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README_DIRECT_COPY.md")
        .expect("read direct URL copied file");
    assert_eq!(committed, b"hello before direct URL svn copy\n");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_copy_directory_direct_url() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN direct URL directory copy smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before direct URL svn directory copy\n")
        .expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let source_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let copied_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk-copy");
    let copy_output = tokio::task::spawn_blocking(move || {
        run_svn_capture(
            &[
                "copy",
                "--non-interactive",
                "--username",
                "owner",
                "--password",
                "doorpass1",
                "-m",
                "external svn direct URL directory copy smoke",
                source_url.as_str(),
                copied_url.as_str(),
            ],
            None,
        )
    })
    .await
    .expect("svn direct URL directory copy task");
    assert!(
        copy_output.status.success(),
        "svn copy URL URL should copy directories against the mounted DAV boundary\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&copy_output.stdout),
        String::from_utf8_lossy(&copy_output.stderr)
    );

    let committed = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk-copy/README.md")
        .expect("read direct URL copied directory file");
    assert_eq!(committed, b"hello before direct URL svn directory copy\n");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_move_file_and_commit() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!("skipping external SVN move smoke because svnadmin/svnlook/svn is unavailable");
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
    seed_svn_readme(&repo_path, "hello before external svn move\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let svn_url = format!("{base_url}/yona/svn/owner/projectYobi");
    let checkout_dir = tempdir().expect("svn checkout tempdir");
    run_svn_blocking(
        vec![
            "checkout".to_string(),
            "--non-interactive".to_string(),
            svn_url,
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let source = checkout_dir.path().join("trunk").join("README.md");
    let moved = checkout_dir.path().join("trunk").join("README_MOVED.md");
    run_svn_blocking(
        vec![
            "move".to_string(),
            "--non-interactive".to_string(),
            source.to_string_lossy().to_string(),
            moved.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_svn_blocking(
        vec![
            "commit".to_string(),
            "--non-interactive".to_string(),
            "--username".to_string(),
            "owner".to_string(),
            "--password".to_string(),
            "doorpass1".to_string(),
            "-m".to_string(),
            "external svn move smoke".to_string(),
            checkout_dir.path().to_string_lossy().to_string(),
        ],
        None,
    )
    .await;

    let moved_contents = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README_MOVED.md")
        .expect("read moved file");
    assert_eq!(moved_contents, b"hello before external svn move\n");
    let original = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README.md");
    assert!(matches!(original, Err(yona_rust_vcs::VcsError::NotFound)));

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_move_direct_url() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN direct URL move smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before direct URL svn move\n").expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let source_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk/README.md");
    let moved_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk/README_DIRECT_MOVED.md");
    let move_output = tokio::task::spawn_blocking(move || {
        run_svn_capture(
            &[
                "move",
                "--non-interactive",
                "--username",
                "owner",
                "--password",
                "doorpass1",
                "-m",
                "external svn direct URL move smoke",
                source_url.as_str(),
                moved_url.as_str(),
            ],
            None,
        )
    })
    .await
    .expect("svn direct URL move task");
    assert!(
        move_output.status.success(),
        "svn move URL URL should commit directly against the mounted DAV boundary\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&move_output.stdout),
        String::from_utf8_lossy(&move_output.stderr)
    );

    let moved = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README_DIRECT_MOVED.md")
        .expect("read direct URL moved file");
    assert_eq!(moved, b"hello before direct URL svn move\n");
    let original = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README.md");
    assert!(
        matches!(original, Err(yona_rust_vcs::VcsError::NotFound)),
        "svn direct URL move should remove the original README.md"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_external_client_can_move_directory_direct_url() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping external SVN direct URL directory move smoke because svnadmin/svnlook/svn is unavailable"
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
    seed_svn_readme(&repo_path, "hello before direct URL svn directory move\n")
        .expect("seed svn readme");

    let (base_url, shutdown) = spawn_app_server(app).await;
    let source_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk");
    let moved_url = format!("{base_url}/yona/svn/owner/projectYobi/trunk-moved");
    let move_output = tokio::task::spawn_blocking(move || {
        run_svn_capture(
            &[
                "move",
                "--non-interactive",
                "--username",
                "owner",
                "--password",
                "doorpass1",
                "-m",
                "external svn direct URL directory move smoke",
                source_url.as_str(),
                moved_url.as_str(),
            ],
            None,
        )
    })
    .await
    .expect("svn direct URL directory move task");
    assert!(
        move_output.status.success(),
        "svn move URL URL should move directories against the mounted DAV boundary\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&move_output.stdout),
        String::from_utf8_lossy(&move_output.stderr)
    );

    let moved = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk-moved/README.md")
        .expect("read direct URL moved directory file");
    assert_eq!(moved, b"hello before direct URL svn directory move\n");
    let original = yona_rust_vcs::svn_cat_file(&repo_path, None, "trunk/README.md");
    assert!(
        matches!(original, Err(yona_rust_vcs::VcsError::NotFound)),
        "svn direct URL directory move should remove the original trunk/README.md"
    );

    let _ = shutdown.send(());
}

#[tokio::test]
async fn svn_protocol_root_and_default_vcc_propfind_honor_label_revision() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping executable SVN Label PROPFIND test because svnadmin/svnlook/svn is unavailable"
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
    let old_revision =
        seed_svn_readme(&repo_path, "hello before label propfind\n").expect("seed svn readme");
    let latest_revision = seed_svn_nested_tree(&repo_path).expect("seed second svn revision");
    assert!(
        latest_revision > old_revision,
        "Label fixture should have a newer revision to prove old revision selection"
    );

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    for path in [
        "/svn/owner/projectYobi",
        "/svn/owner/projectYobi/!svn/vcc/default",
    ] {
        let response = direct_request_with_body_and_header(
            app.clone(),
            propfind.clone(),
            path,
            None,
            "Label",
            &old_revision.to_string(),
            Body::empty(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::MULTI_STATUS);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let text = String::from_utf8(body.to_vec()).unwrap();
        assert!(
            text.contains(&format!("<D:version-name>{old_revision}</D:version-name>"))
                && text.contains(&format!(
                    "<D:checked-in><D:href>/yona/svn/owner/projectYobi/!svn/bln/{old_revision}</D:href></D:checked-in>"
                ))
                && !text.contains(&format!("<D:version-name>{latest_revision}</D:version-name>"))
                && !text.contains(&format!("/!svn/bln/{latest_revision}</D:href>")),
            "SVN PROPFIND should honor Label: {old_revision} for {path}: {text}"
        );
    }
}

#[tokio::test]
async fn svn_protocol_root_and_default_vcc_propfind_allprop_exposes_deltav_metadata() {
    if !svn_tools_available() || !svn_client_available() {
        eprintln!(
            "skipping executable SVN root/VCC allprop PROPFIND test because svnadmin/svnlook/svn is unavailable"
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
    let revision =
        seed_svn_readme(&repo_path, "hello before root vcc allprop\n").expect("seed svn readme");
    let uuid = yona_rust_vcs::svn_repository_uuid(&repo_path).expect("read repository uuid");

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    for (path, href, displayname) in [
        (
            "/svn/owner/projectYobi",
            "/yona/svn/owner/projectYobi",
            "projectYobi",
        ),
        (
            "/svn/owner/projectYobi/!svn/vcc/default",
            "/yona/svn/owner/projectYobi/!svn/vcc/default",
            "default",
        ),
    ] {
        let response = direct_request_with_body(
            app.clone(),
            propfind.clone(),
            path,
            None,
            Body::from(
                r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:allprop/>
</D:propfind>"#,
            ),
        )
        .await;
        assert_eq!(response.status(), StatusCode::MULTI_STATUS);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let text = String::from_utf8(body.to_vec()).unwrap();
        assert!(
            text.contains(&format!("<D:href>{href}</D:href>"))
                && text.contains("<D:resourcetype><D:collection/></D:resourcetype>")
                && text.contains(&format!("<D:displayname>{displayname}</D:displayname>"))
                && text.contains("<D:supportedlock>")
                && text.contains(&format!("<D:version-name>{revision}</D:version-name>"))
                && text.contains(&format!(
                    "<D:checked-in><D:href>/yona/svn/owner/projectYobi/!svn/bln/{revision}</D:href></D:checked-in>"
                ))
                && text.contains(&format!(
                    "<D:baseline-collection><D:href>/yona/svn/owner/projectYobi/!svn/bc/{revision}/</D:href></D:baseline-collection>"
                ))
                && text.contains(&format!("<S:repository-uuid>{uuid}</S:repository-uuid>"))
                && text.contains(
                    "<D:activity-collection-set><D:href>/yona/svn/owner/projectYobi/!svn/act/</D:href></D:activity-collection-set>"
                )
                && text.contains("<D:supported-report-set>")
                && text.contains("<S:log-report/>")
                && text.contains("<S:update-report/>"),
            "SVN root/default VCC PROPFIND allprop should expose DeltaV live metadata for {path}: {text}"
        );
    }
}

#[tokio::test]
async fn svn_protocol_baseline_propfind_maps_invalid_and_out_of_range_revisions() {
    if !svn_tools_available() {
        eprintln!(
            "skipping executable SVN baseline revision mapping test because svnadmin/svnlook is unavailable"
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
    let (_, youngest_revision) = mark_project_as_svn(&repository, &db, data_dir.path()).await;
    let youngest_revision = youngest_revision.expect("svnadmin-backed repository revision");

    let propfind = Method::from_bytes(b"PROPFIND").expect("PROPFIND method");
    let response = direct_request(
        app.clone(),
        propfind.clone(),
        "/svn/owner/projectYobi/!svn/bln/not-a-number",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let response = direct_request(
        app,
        propfind,
        &format!("/svn/owner/projectYobi/!svn/bln/{}", youngest_revision + 1),
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn svn_protocol_supports_checkout_merge_choreography() {
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
    let Some(revision) = seed_svn_readme(&repo_path, "initial content\n") else {
        eprintln!(
            "skipping executable SVN checkout/merge test because svnadmin/svnlook/svn is unavailable"
        );
        return;
    };

    let owner_basic = basic("owner", "doorpass1");
    let mkactivity = Method::from_bytes(b"MKACTIVITY").expect("MKACTIVITY method");
    let response = direct_request(
        app.clone(),
        mkactivity,
        "/svn/owner/projectYobi/!svn/act/yona-test-activity",
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

    let checkout = Method::from_bytes(b"CHECKOUT").expect("CHECKOUT method");
    let checkout_body = r#"<?xml version="1.0" encoding="utf-8"?>
<D:checkout xmlns:D="DAV:">
  <D:activity-set>
    <D:href>/svn/owner/projectYobi/!svn/act/yona-test-activity</D:href>
  </D:activity-set>
  <D:apply-to-version/>
</D:checkout>"#;
    let response = direct_request_with_body(
        app.clone(),
        checkout.clone(),
        &format!("/svn/owner/projectYobi/!svn/ver/{revision}/trunk/README.md"),
        Some(&owner_basic),
        Body::from(checkout_body),
    )
    .await;
    assert_eq!(response.status(), StatusCode::CREATED);
    let working_href = response
        .headers()
        .get(http::header::LOCATION)
        .and_then(|value| value.to_str().ok())
        .expect("CHECKOUT should return working resource Location")
        .to_string();
    assert!(
        working_href.ends_with("/!svn/wrk/yona-test-activity/trunk/README.md"),
        "CHECKOUT should map the version resource to an activity working resource: {working_href}"
    );

    let put = Method::from_bytes(b"PUT").expect("PUT method");
    let response = direct_request_with_body(
        app.clone(),
        put,
        working_href
            .strip_prefix("/yona")
            .unwrap_or(working_href.as_str()),
        Some(&owner_basic),
        Body::from("updated through checkout choreography\n"),
    )
    .await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
    let put_revision = response
        .headers()
        .get("svn-revision")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<i64>().ok())
        .expect("working resource PUT should return committed SVN revision");
    assert!(
        put_revision > revision,
        "working resource PUT should commit a newer repository revision"
    );

    let merge = Method::from_bytes(b"MERGE").expect("MERGE method");
    let response = direct_request_with_body(
        app.clone(),
        merge,
        "/svn/owner/projectYobi",
        Some(&owner_basic),
        Body::from(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:merge xmlns:D="DAV:">
  <D:source>
    <D:href>/svn/owner/projectYobi/!svn/act/yona-test-activity</D:href>
  </D:source>
  <D:no-auto-merge/>
  <D:no-checkout/>
  <D:prop>
    <D:checked-in/>
    <D:version-name/>
    <D:resourcetype/>
    <D:creationdate/>
    <D:creator-displayname/>
  </D:prop>
</D:merge>"#,
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
        text.contains("<D:merge-response")
            && text.contains("<D:updated-set>")
            && text.contains(&format!("<D:version-name>{put_revision}</D:version-name>"))
            && text.contains(&format!(
                "/yona/svn/owner/projectYobi/!svn/bln/{put_revision}"
            ))
            && text.contains(&format!(
                "/yona/svn/owner/projectYobi/!svn/ver/{put_revision}/trunk/README.md"
            )),
        "SVN MERGE should expose ra_serf commit info and checked-in metadata: {text}"
    );

    let delete = Method::DELETE;
    let response = direct_request(
        app,
        delete,
        "/svn/owner/projectYobi/!svn/act/yona-test-activity",
        Some(&owner_basic),
    )
    .await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
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
