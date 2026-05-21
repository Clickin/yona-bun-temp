use axum::body::Body;
use base64::{engine::general_purpose, Engine as _};
use http::{HeaderMap, Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{Database, DatabaseConnection};
use serde_json::json;
use std::fs;
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

async fn response_json(response: Response<Body>) -> serde_json::Value {
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(status, StatusCode::OK, "{text}");
    serde_json::from_str(&text).expect("json response")
}

async fn rpc(
    app: axum::Router,
    method_name: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: serde_json::Value,
) -> Response<Body> {
    rest_test_support::pilot_rest(app, method_name, cookie_header, csrf, payload).await
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String, i64) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = response_json(
        rpc(
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

    let actor_id = response
        .get("actorId")
        .and_then(|value| {
            value
                .as_i64()
                .or_else(|| value.as_str().and_then(|text| text.parse::<i64>().ok()))
        })
        .expect("actor id");

    (csrf, cookie_header, actor_id)
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str, scope: &str) {
    response_json(
        rpc(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "overview": "Smart HTTP parity",
                "projectScope": scope
            }),
        )
        .await,
    )
    .await;
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

async fn response_bytes(response: Response<Body>) -> (StatusCode, HeaderMap, Vec<u8>) {
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, headers, bytes.to_vec())
}

fn basic(login_id: &str, password: &str) -> String {
    format!(
        "Basic {}",
        general_purpose::STANDARD.encode(format!("{login_id}:{password}"))
    )
}

fn run_git(args: &[&str], cwd: Option<&Path>) {
    let mut command = Command::new("git");
    command.args(args);
    command.env("GIT_TERMINAL_PROMPT", "0");
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    let output = command.output().expect("run git");
    assert!(
        output.status.success(),
        "git {:?} failed\nstdout: {}\nstderr: {}",
        args,
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

fn git_stdout(args: &[&str], cwd: Option<&Path>) -> String {
    let mut command = Command::new("git");
    command.args(args);
    command.env("GIT_TERMINAL_PROMPT", "0");
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    let output = command.output().expect("run git");
    assert!(
        output.status.success(),
        "git {:?} failed\nstdout: {}\nstderr: {}",
        args,
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout).expect("git stdout utf8")
}

async fn run_git_blocking(args: Vec<String>, cwd: Option<std::path::PathBuf>) {
    tokio::task::spawn_blocking(move || {
        let borrowed = args.iter().map(String::as_str).collect::<Vec<_>>();
        run_git(&borrowed, cwd.as_deref());
    })
    .await
    .expect("git task");
}

fn seed_bare_repository(yona_data: &Path, project_id: i64) {
    let repo_root = yona_data.join("repo");
    fs::create_dir_all(&repo_root).expect("repo root");
    let bare_repo = repo_root.join(format!("{project_id}.git"));
    let work = tempdir().expect("work repo");

    run_git(&["init", "--bare", bare_repo.to_str().unwrap()], None);
    fs::write(work.path().join("README.md"), "# Smart HTTP\n").expect("readme");
    run_git(
        &[
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "--work-tree",
            work.path().to_str().unwrap(),
            "add",
            ".",
        ],
        None,
    );
    run_git(
        &[
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "--work-tree",
            work.path().to_str().unwrap(),
            "-c",
            "user.email=author@example.com",
            "-c",
            "user.name=Author",
            "commit",
            "-m",
            "Initial commit",
        ],
        None,
    );
    run_git(
        &[
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "branch",
            "-M",
            "main",
        ],
        None,
    );
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

#[tokio::test]
async fn smart_http_advertises_public_upload_pack_for_clone_url() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("project");
    seed_bare_repository(data_dir.path(), project.id);

    let (status, headers, body) = response_bytes(
        direct_request(
            app,
            Method::GET,
            "/owner/projectYobi.git/info/refs?service=git-upload-pack",
            None,
        )
        .await,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        headers
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("application/x-git-upload-pack-advertisement")
    );
    assert!(
        String::from_utf8_lossy(&body).contains("# service=git-upload-pack"),
        "{}",
        String::from_utf8_lossy(&body)
    );
}

#[tokio::test]
async fn smart_http_rejects_getanyfile_and_challenges_anonymous_push() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("project");
    seed_bare_repository(data_dir.path(), project.id);

    let (status, _, body) = response_bytes(
        direct_request(
            app.clone(),
            Method::GET,
            "/owner/projectYobi.git/info/refs",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(
        String::from_utf8_lossy(&body),
        "Unsupported service: getanyfile"
    );

    let (status, headers, _) = response_bytes(
        direct_request(
            app,
            Method::GET,
            "/owner/projectYobi.git/info/refs?service=git-receive-pack",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(
        headers
            .get(http::header::WWW_AUTHENTICATE)
            .and_then(|value| value.to_str().ok()),
        Some("Basic realm=\"Yona\"")
    );
}

#[tokio::test]
async fn smart_http_allows_basic_member_write_advertisement_and_rejects_outsider() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, _, member_id) = register_user(app.clone(), "member").await;
    register_user(app.clone(), "outsider").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("project");
    repo.add_project_membership(project.id, member_id, "member")
        .await
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let (status, _, _) = response_bytes(
        direct_request(
            app.clone(),
            Method::GET,
            "/owner/projectYobi.git/info/refs?service=git-receive-pack",
            Some(&basic("outsider", "doorpass1")),
        )
        .await,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    let (status, headers, body) = response_bytes(
        direct_request(
            app,
            Method::GET,
            "/owner/projectYobi.git/info/refs?service=git-receive-pack",
            Some(&basic("member", "doorpass1")),
        )
        .await,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        headers
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("application/x-git-receive-pack-advertisement")
    );
    assert!(
        String::from_utf8_lossy(&body).contains("# service=git-receive-pack"),
        "{}",
        String::from_utf8_lossy(&body)
    );
}

#[tokio::test]
async fn smart_http_supports_real_git_clone_and_authenticated_push() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, _, member_id) = register_user(app.clone(), "member").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("project");
    repo.add_project_membership(project.id, member_id, "member")
        .await
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let (base_url, shutdown) = spawn_app_server(app).await;
    let client_parent = tempdir().expect("client parent");
    let clone_path = client_parent.path().join("clone");
    let clone_url = format!("{base_url}/yona/owner/projectYobi.git");
    run_git_blocking(
        vec![
            "clone".to_string(),
            clone_url,
            clone_path.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    assert_eq!(
        fs::read_to_string(clone_path.join("README.md"))
            .unwrap()
            .replace("\r\n", "\n"),
        "# Smart HTTP\n"
    );

    fs::write(clone_path.join("CHANGE.md"), "pushed over smart http\n").expect("change");
    run_git_blocking(
        vec!["add".to_string(), "CHANGE.md".to_string()],
        Some(clone_path.clone()),
    )
    .await;
    run_git_blocking(
        vec![
            "-c".to_string(),
            "user.email=member@example.com".to_string(),
            "-c".to_string(),
            "user.name=Member".to_string(),
            "commit".to_string(),
            "-m".to_string(),
            "Push over Smart HTTP".to_string(),
        ],
        Some(clone_path.clone()),
    )
    .await;
    let authenticated_url = base_url.replacen("http://", "http://member:doorpass1@", 1);
    run_git_blocking(
        vec![
            "remote".to_string(),
            "set-url".to_string(),
            "origin".to_string(),
            format!("{authenticated_url}/yona/owner/projectYobi.git"),
        ],
        Some(clone_path.clone()),
    )
    .await;
    run_git_blocking(
        vec!["push".to_string(), "origin".to_string(), "main".to_string()],
        Some(clone_path.clone()),
    )
    .await;

    let bare_repo = data_dir
        .path()
        .join("repo")
        .join(format!("{}.git", project.id));
    let pushed_head = git_stdout(&["rev-parse", "HEAD"], Some(&clone_path));
    let server_head = git_stdout(
        &[
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "rev-parse",
            "main",
        ],
        None,
    );
    assert_eq!(server_head.trim(), pushed_head.trim());

    let _ = shutdown.send(());
}
