use axum::body::Body;
use http::{HeaderMap, Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, Database, DatabaseConnection, NotSet, Set, Statement,
};
use serde_json::json;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_persistence::{original_email, AppRepository};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

fn yona_data_env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

async fn build_app_with_repository() -> (axum::Router, AppRepository) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db);
    let app = create_router_with_app_repository(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
    );

    (app, app_repo)
}

async fn build_app_with_repository_and_db() -> (axum::Router, AppRepository, DatabaseConnection) {
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

async fn response_json(response: Response<Body>) -> serde_json::Value {
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(status, StatusCode::OK, "{text}");
    serde_json::from_str(&text).expect("json response")
}

async fn rest_get(app: axum::Router, path: &str, cookie_header: Option<&str>) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::GET)
        .uri(format!("/yona/api/v1{path}"));
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }

    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
}

async fn rest_post_json(
    app: axum::Router,
    path: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: serde_json::Value,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::POST)
        .uri(format!("/yona/api/v1{path}"))
        .header(http::header::CONTENT_TYPE, "application/json");
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }

    app.oneshot(builder.body(Body::from(payload.to_string())).unwrap())
        .await
        .unwrap()
}

async fn rest_patch_json(
    app: axum::Router,
    path: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: serde_json::Value,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::PATCH)
        .uri(format!("/yona/api/v1{path}"))
        .header(http::header::CONTENT_TYPE, "application/json");
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }

    app.oneshot(builder.body(Body::from(payload.to_string())).unwrap())
        .await
        .unwrap()
}

async fn rest_delete_json(
    app: axum::Router,
    path: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: serde_json::Value,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::DELETE)
        .uri(format!("/yona/api/v1{path}"))
        .header(http::header::CONTENT_TYPE, "application/json");
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }

    app.oneshot(builder.body(Body::from(payload.to_string())).unwrap())
        .await
        .unwrap()
}

async fn count_event_rows(db: &DatabaseConnection, event_type: &str) -> u64 {
    let backend = db.get_database_backend();
    let rows = db
        .query_all(Statement::from_sql_and_values(
            backend,
            "SELECT id FROM notification_event WHERE event_type = ?",
            vec![event_type.to_string().into()],
        ))
        .await
        .expect("count notification events");
    rows.len() as u64
}

async fn direct_get(app: axum::Router, path: &str, cookie_header: Option<&str>) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::GET)
        .uri(format!("/yona{path}"));
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
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

fn json_bool(value: &serde_json::Value, key: &str) -> bool {
    value
        .get(key)
        .and_then(|item| item.as_bool())
        .unwrap_or(false)
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

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    response_json(
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

    (csrf, cookie_header)
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
                "overview": "Code browser parity",
                "projectScope": scope
            }),
        )
        .await,
    )
    .await;
}

#[tokio::test]
async fn rest_project_create_provisions_empty_bare_git_repository() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo, db) = build_app_with_repository_and_db().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;

    let response = response_json(
        rest_post_json(
            app.clone(),
            "/owners/owner/projects",
            Some(&cookie),
            Some(&csrf),
            json!({
                "projectName": "projectYobi",
                "overview": "Repository provisioning parity",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(response["ownerName"], "owner");
    assert_eq!(response["projectName"], "projectYobi");

    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("created project");
    let backend = db.get_database_backend();
    let rows = db
        .query_all(Statement::from_sql_and_values(
            backend,
            "SELECT vcs FROM project WHERE id = ?",
            vec![project.id.into()],
        ))
        .await
        .expect("read project vcs");
    assert_eq!(
        rows[0].try_get::<String>("", "vcs").unwrap(),
        "GIT",
        "legacy project create defaults to Git"
    );
    let bare_repo = data_dir
        .path()
        .join("repo")
        .join(format!("{}.git", project.id));
    assert!(bare_repo.is_dir(), "bare repo path should be created");

    let output = Command::new("git")
        .args([
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "rev-parse",
            "--is-bare-repository",
        ])
        .output()
        .expect("inspect bare repository");
    assert!(
        output.status.success(),
        "git rev-parse failed\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(String::from_utf8_lossy(&output.stdout).trim(), "true");

    let code =
        response_json(rest_get(app, "/projects/owner/projectYobi/code", Some(&cookie)).await).await;
    assert!(json_bool(&code, "noHead"));
    assert_eq!(
        code.get("branches")
            .and_then(|value| value.as_array())
            .map_or(0, Vec::len),
        0
    );
}

fn run_git(args: &[&str], cwd: Option<&Path>) {
    let mut command = Command::new("git");
    command.args(args);
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

fn seed_bare_repository(yona_data: &Path, project_id: i64) {
    let repo_root = yona_data.join("repo");
    fs::create_dir_all(&repo_root).expect("repo root");
    let bare_repo = repo_root.join(format!("{project_id}.git"));
    let work = tempdir().expect("work repo");

    run_git(&["init", "--bare", bare_repo.to_str().unwrap()], None);
    fs::write(work.path().join("README.md"), "# Hello Yona\n").expect("readme");
    fs::create_dir_all(work.path().join("src")).expect("src dir");
    fs::write(work.path().join("src").join("main.rs"), "fn main() {}\n").expect("main");
    fs::create_dir_all(work.path().join("assets")).expect("assets dir");
    fs::write(
        work.path().join("assets").join("logo.png"),
        b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR",
    )
    .expect("png");
    fs::create_dir_all(work.path().join("bin")).expect("bin dir");
    fs::write(work.path().join("bin").join("archive.bin"), b"\0binary").expect("binary");
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

fn append_bare_repository_commit(
    yona_data: &Path,
    project_id: i64,
    path: &str,
    contents: &str,
    message: &str,
) {
    let bare_repo = yona_data.join("repo").join(format!("{project_id}.git"));
    let work = tempdir().expect("work repo");
    run_git(
        &[
            "clone",
            bare_repo.to_str().unwrap(),
            work.path().to_str().unwrap(),
        ],
        None,
    );
    let file_path = work.path().join(path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).expect("commit parent");
    }
    fs::write(&file_path, contents).expect("commit file");
    run_git(&["add", "."], Some(work.path()));
    run_git(
        &[
            "-c",
            "user.email=second@example.com",
            "-c",
            "user.name=Second Author",
            "commit",
            "-m",
            message,
        ],
        Some(work.path()),
    );
    run_git(&["push", "origin", "main"], Some(work.path()));
}

fn create_bare_repository_branch(yona_data: &Path, project_id: i64, branch: &str) {
    let bare_repo = yona_data.join("repo").join(format!("{project_id}.git"));
    run_git(
        &[
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "branch",
            branch,
            "main",
        ],
        None,
    );
}

fn create_bare_repository_tag(yona_data: &Path, project_id: i64, tag: &str) {
    let bare_repo = yona_data.join("repo").join(format!("{project_id}.git"));
    run_git(
        &["--git-dir", bare_repo.to_str().unwrap(), "tag", tag, "main"],
        None,
    );
}

fn bare_repository_head_commit_id(yona_data: &Path, project_id: i64) -> String {
    let bare_repo = yona_data.join("repo").join(format!("{project_id}.git"));
    let output = Command::new("git")
        .args([
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "rev-parse",
            "main",
        ])
        .output()
        .expect("rev-parse main");
    assert!(
        output.status.success(),
        "rev-parse main failed\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout)
        .expect("utf8 commit id")
        .trim()
        .to_string()
}

#[tokio::test]
async fn code_browser_reads_root_folder_and_text_file_from_git_repo() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "author").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let root = response_json(
        rpc(
            app.clone(),
            "ReadCodeBrowser",
            None,
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi"
            }),
        )
        .await,
    )
    .await;

    assert_eq!(root["ownerName"], "owner");
    assert_eq!(root["projectName"], "projectYobi");
    assert_eq!(root["path"], "");
    assert_eq!(root["selectedBranch"], "main");
    assert!(!json_bool(&root, "noHead"));
    assert!(root["branches"]
        .as_array()
        .unwrap()
        .iter()
        .any(|branch| branch["name"] == "main"));
    assert!(root["entries"]
        .as_array()
        .unwrap()
        .iter()
        .any(|entry| entry["name"] == "src" && entry["kind"] == "folder"));
    assert!(root["entries"]
        .as_array()
        .unwrap()
        .iter()
        .any(|entry| entry["name"] == "README.md" && entry["kind"] == "file"));
    let src_entry = root["entries"]
        .as_array()
        .unwrap()
        .iter()
        .find(|entry| entry["name"] == "src" && entry["kind"] == "folder")
        .expect("src entry");
    assert_eq!(src_entry["authorLabel"], "Author");
    assert_eq!(src_entry["authorLoginId"], "author");
    assert!(src_entry["authorAvatarUrl"]
        .as_str()
        .unwrap()
        .contains("gravatar.com/avatar/"));

    let file = response_json(
        rpc(
            app,
            "ReadCodeBrowser",
            None,
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "branch": "main",
                "path": "src/main.rs"
            }),
        )
        .await,
    )
    .await;

    assert_eq!(file["file"]["name"], "main.rs");
    assert_eq!(file["file"]["path"], "src/main.rs");
    assert_eq!(file["file"]["text"], "fn main() {}\n");
    assert_eq!(file["file"]["commitMessage"], "Initial commit");
    assert_eq!(file["file"]["commitShortId"].as_str().unwrap().len(), 7);
    assert!(file["file"]["commitId"].as_str().unwrap().len() >= 7);
    assert_eq!(file["file"]["commentCount"], 0);
    assert!(!file["file"]["commitDate"].as_str().unwrap().is_empty());
    assert_eq!(file["file"]["authorLabel"], "Author");
    assert!(!json_bool(&file["file"], "isBinary"));
}

#[tokio::test]
async fn rest_code_browser_reads_root_folder_and_text_file_from_git_repo() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "author").await;
    assert!(repo
        .find_user_by_identifier("author@example.com")
        .await
        .unwrap()
        .is_some());
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let root =
        response_json(rest_get(app.clone(), "/projects/owner/projectYobi/code", None).await).await;

    assert_eq!(root["ownerName"], "owner");
    assert_eq!(root["projectName"], "projectYobi");
    assert_eq!(root["selectedBranch"], "main");
    assert!(!json_bool(&root, "noHead"));
    assert!(root["branches"]
        .as_array()
        .unwrap()
        .iter()
        .any(|branch| branch["name"] == "main"));
    assert!(root["entries"]
        .as_array()
        .unwrap()
        .iter()
        .any(|entry| entry["name"] == "src" && entry["kind"] == "folder"));
    assert!(root["entries"]
        .as_array()
        .unwrap()
        .iter()
        .any(|entry| entry["name"] == "README.md" && entry["kind"] == "file"));

    let history =
        response_json(rest_get(app.clone(), "/projects/owner/projectYobi/commits", None).await)
            .await;
    assert_eq!(history["commits"].as_array().unwrap().len(), 1);
    assert_eq!(history["commits"][0]["shortMessage"], "Initial commit");

    let file = response_json(
        rest_get(
            app,
            "/projects/owner/projectYobi/code?branch=main&path=src%2Fmain.rs",
            None,
        )
        .await,
    )
    .await;

    assert_eq!(file["file"]["name"], "main.rs");
    assert_eq!(file["file"]["path"], "src/main.rs");
    assert_eq!(file["file"]["text"], "fn main() {}\n");
    assert_eq!(file["file"]["commitMessage"], "Initial commit");
    assert_eq!(file["file"]["authorLabel"], "Author");
    assert_eq!(file["file"]["authorLoginId"], "author");
    assert!(file["file"]["authorAvatarUrl"]
        .as_str()
        .unwrap()
        .contains("gravatar.com/avatar/"));
    assert!(!json_bool(&file["file"], "isBinary"));
}

#[tokio::test]
async fn rest_code_browser_selector_includes_tags_and_reads_tagged_files() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    append_bare_repository_commit(
        data_dir.path(),
        project.id,
        "src/main.rs",
        "fn main() {\n    println!(\"v1\");\n}\n",
        "Prepare release tag",
    );
    create_bare_repository_tag(data_dir.path(), project.id, "v1.0.0");
    append_bare_repository_commit(
        data_dir.path(),
        project.id,
        "src/main.rs",
        "fn main() {\n    println!(\"main\");\n}\n",
        "Move main after tag",
    );

    let root =
        response_json(rest_get(app.clone(), "/projects/owner/projectYobi/code", None).await).await;
    assert!(root["branches"]
        .as_array()
        .unwrap()
        .iter()
        .any(|branch| branch["name"] == "v1.0.0"));

    let tagged_file = response_json(
        rest_get(
            app.clone(),
            "/projects/owner/projectYobi/code?branch=v1.0.0&path=src%2Fmain.rs",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(tagged_file["selectedBranch"], "v1.0.0");
    assert_eq!(
        tagged_file["file"]["text"],
        "fn main() {\n    println!(\"v1\");\n}\n"
    );

    let history = response_json(
        rest_get(
            app,
            "/projects/owner/projectYobi/commits?branch=v1.0.0&path=src%2Fmain.rs",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(history["selectedBranch"], "v1.0.0");
    assert!(history["branches"]
        .as_array()
        .unwrap()
        .iter()
        .any(|branch| branch["name"] == "v1.0.0"));
    assert_eq!(history["commits"][0]["shortMessage"], "Prepare release tag");
}

#[tokio::test]
async fn direct_code_ajax_compat_routes_return_legacy_metadata_json() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "author").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let root =
        response_json(direct_get(app.clone(), "/owner/projectYobi/code/!", None).await).await;
    assert_eq!(root["type"], "folder");
    assert_eq!(root["path"], "");
    assert_eq!(root["data"]["src"]["type"], "folder");
    assert_eq!(root["data"]["src"]["msg"], "Initial commit");
    assert_eq!(root["data"]["src"]["userLoginId"], "author");
    assert!(root["data"]["src"]["avatar"]
        .as_str()
        .unwrap()
        .contains("gravatar.com/avatar/"));
    assert_eq!(
        root["data"]["src"]["commitUrl"],
        format!(
            "/yona/owner/projectYobi/commit/{}",
            root["data"]["src"]["commitId"].as_str().unwrap()
        )
    );
    let root_with_slash =
        response_json(direct_get(app.clone(), "/owner/projectYobi/code/!/", None).await).await;
    assert_eq!(root_with_slash["type"], "folder");
    assert_eq!(root_with_slash["path"], "");

    let branch_root =
        response_json(direct_get(app.clone(), "/owner/projectYobi/code/main/!/", None).await).await;
    assert_eq!(branch_root["type"], "folder");
    assert_eq!(branch_root["path"], "");
    let branch_root_without_slash =
        response_json(direct_get(app.clone(), "/owner/projectYobi/code/main/!", None).await).await;
    assert_eq!(branch_root_without_slash["type"], "folder");
    assert_eq!(branch_root_without_slash["path"], "");

    let src =
        response_json(direct_get(app.clone(), "/owner/projectYobi/code/main/!/src", None).await)
            .await;
    assert_eq!(src["type"], "folder");
    assert_eq!(src["path"], "src");
    assert_eq!(src["data"]["main.rs"]["type"], "file");
    assert_eq!(src["data"]["main.rs"]["msg"], "Initial commit");

    let file = response_json(
        direct_get(
            app.clone(),
            "/owner/projectYobi/code/main/!/src/main.rs",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(file["type"], "file");
    assert_eq!(file["data"], "fn main() {}\n");
    assert_eq!(file["commitMessage"], "Initial commit");
    assert_eq!(file["userLoginId"], "author");
    assert!(!json_bool(&file, "isBinary"));
    assert_eq!(file["mimeType"], "text/x-rust");

    let missing = direct_get(app, "/owner/projectYobi/code/main/!/missing.rs", None).await;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn rest_code_browser_renders_markdown_file_with_legacy_local_image_links() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    append_bare_repository_commit(
        data_dir.path(),
        project.id,
        "README.md",
        "# Hello Yona\n\n@owner @owner/projectYobi @ghost @owner/missing\n\n![logo](./assets/logo.png)\n\n[Guide](./docs/guide.md)\n",
        "Render markdown README links",
    );

    let file = response_json(
        rest_get(
            app,
            "/projects/owner/projectYobi/code?branch=main&path=README.md",
            Some(&cookie),
        )
        .await,
    )
    .await;

    assert_eq!(file["file"]["name"], "README.md");
    assert_eq!(
        file["file"]["html"].as_str().expect("markdown html"),
        "",
        "code-browser Markdown files must leave rendering to React"
    );
    let markdown = file["file"]["text"].as_str().expect("markdown text");
    assert!(markdown.contains("# Hello Yona"), "{markdown}");
    assert!(
        markdown.contains("@owner @owner/projectYobi @ghost @owner/missing"),
        "{markdown}"
    );
    assert!(
        markdown.contains(r#"![logo](/yona/owner/projectYobi/files/main/assets/logo.png)"#),
        "{markdown}"
    );
    assert!(
        markdown.contains("[Guide](./docs/guide.md)"),
        "code-browser markdown should only rewrite local images like legacy renderFileInCodeBrowser: {markdown}"
    );
    let mention_references = file["file"]["mentionReferences"]
        .as_array()
        .expect("code-browser markdown mention references");
    assert!(
        mention_references
            .iter()
            .any(|reference| reference["loginId"] == "owner"),
        "{mention_references:?}"
    );
    assert!(
        mention_references
            .iter()
            .any(|reference| reference["ownerName"] == "owner"
                && reference["projectName"] == "projectYobi"),
        "{mention_references:?}"
    );
    assert!(
        !mention_references
            .iter()
            .any(|reference| reference["loginId"] == "ghost"
                || reference["projectName"] == "missing"),
        "{mention_references:?}"
    );
}

#[tokio::test]
async fn rest_commit_history_lists_branch_and_path_commits_from_git_repo() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "second").await;
    assert!(repo
        .find_user_by_identifier("second@example.com")
        .await
        .unwrap()
        .is_some());
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    append_bare_repository_commit(
        data_dir.path(),
        project.id,
        "src/main.rs",
        "fn main() {\n    println!(\"history\");\n}\n",
        "Update main function",
    );

    let response = response_json(
        rest_get(
            app,
            "/projects/owner/projectYobi/commits?branch=main&path=src%2Fmain.rs",
            None,
        )
        .await,
    )
    .await;

    assert_eq!(response["ownerName"], "owner");
    assert_eq!(response["projectName"], "projectYobi");
    assert_eq!(response["selectedBranch"], "main");
    assert_eq!(response["path"], "src/main.rs");
    assert_eq!(response["page"], 0);
    assert_eq!(response["hasNewer"], false);
    assert_eq!(response["hasOlder"], false);
    assert!(response["branches"]
        .as_array()
        .unwrap()
        .iter()
        .any(|branch| branch["name"] == "main"));
    assert_eq!(response["breadcrumbs"][0]["name"], "src");
    assert_eq!(response["breadcrumbs"][1]["path"], "src/main.rs");

    let commits = response["commits"].as_array().unwrap();
    assert_eq!(commits.len(), 2);
    assert_eq!(commits[0]["shortMessage"], "Update main function");
    assert_eq!(commits[0]["authorName"], "Second Author");
    assert_eq!(commits[0]["authorEmail"], "second@example.com");
    assert_eq!(commits[0]["authorLoginId"], "second");
    assert!(commits[0]["authorAvatarUrl"]
        .as_str()
        .unwrap()
        .contains("gravatar.com/avatar/"));
    assert_eq!(commits[0]["commentCount"], 0);
    assert_eq!(commits[1]["shortMessage"], "Initial commit");
    assert!(commits[0]["commitId"].as_str().unwrap().len() >= 40);
    assert!(commits[0]["commitShortId"].as_str().unwrap().len() >= 7);
}

#[tokio::test]
async fn rest_commit_detail_reads_commit_metadata_and_diff_from_git_repo() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    let parent_commit_id = bare_repository_head_commit_id(data_dir.path(), project.id);
    append_bare_repository_commit(
        data_dir.path(),
        project.id,
        "src/main.rs",
        "fn main() {\n    println!(\"detail\");\n}\n",
        "Update main function",
    );
    let commit_id = bare_repository_head_commit_id(data_dir.path(), project.id);

    let response = response_json(
        rest_get(
            app,
            &format!(
                "/projects/owner/projectYobi/commit/{commit_id}?branch=main&path=src%2Fmain.rs"
            ),
            None,
        )
        .await,
    )
    .await;

    assert_eq!(response["ownerName"], "owner");
    assert_eq!(response["projectName"], "projectYobi");
    assert_eq!(response["selectedBranch"], "main");
    assert_eq!(response["path"], "src/main.rs");
    assert!(!json_bool(&response, "noHead"));
    assert!(response["branches"]
        .as_array()
        .unwrap()
        .iter()
        .any(|branch| branch["name"] == "main"));
    assert_eq!(response["breadcrumbs"][0]["name"], "src");
    assert_eq!(response["breadcrumbs"][1]["path"], "src/main.rs");
    assert_eq!(response["commit"]["commitId"], commit_id);
    assert_eq!(response["commit"]["shortMessage"], "Update main function");
    assert_eq!(response["commit"]["authorName"], "Second Author");
    assert_eq!(response["commit"]["authorEmail"], "second@example.com");
    assert_eq!(response["commit"]["commentCount"], 0);
    assert_eq!(response["parentCommit"]["commitId"], parent_commit_id);
    assert_eq!(
        response["parentCommit"]["commitShortId"]
            .as_str()
            .unwrap()
            .len(),
        7
    );

    let files = response["files"].as_array().unwrap();
    assert_eq!(files.len(), 1);
    assert_eq!(files[0]["path"], "src/main.rs");
    let patch = files[0]["patch"].as_str().unwrap();
    assert!(patch.contains("diff --git a/src/main.rs b/src/main.rs"));
    assert!(patch.contains("+    println!(\"detail\");"));
}

#[tokio::test]
async fn rest_commit_detail_creates_comments_and_updates_threads_from_git_repo() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo, db) = build_app_with_repository_and_db().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let linked_issue = response_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Commit linked issue",
                "bodyMarkdown": "issue target"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(linked_issue["issueNumber"], "1");
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    append_bare_repository_commit(
        data_dir.path(),
        project.id,
        "src/main.rs",
        "fn main() {\n    println!(\"discussion\");\n}\n",
        "Discuss main function",
    );
    let commit_id = bare_repository_head_commit_id(data_dir.path(), project.id);
    let detail_path = format!("/projects/owner/projectYobi/commit/{commit_id}?branch=main");
    let comments_path = format!("/projects/owner/projectYobi/commit/{commit_id}/comments");

    let initial = response_json(rest_get(app.clone(), &detail_path, Some(&cookie)).await).await;
    assert_eq!(initial["permissions"]["canComment"], true);
    assert_eq!(initial["threads"].as_array().unwrap().len(), 0);

    let created = response_json(
        rest_post_json(
            app.clone(),
            &comments_path,
            Some(&cookie),
            Some(&csrf),
            json!({
                "contentsMarkdown": "First **commit** note @owner @owner/projectYobi @ghost @owner/missing #1 owner/projectYobi#1 `<script>alert(1)</script> @owner #1`"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(created["commit"]["commentCount"], 1);
    assert_eq!(created["threads"].as_array().unwrap().len(), 1);
    assert_eq!(created["threads"][0]["state"], "open");
    assert_eq!(created["threads"][0]["commitId"], commit_id);
    assert_eq!(created["threads"][0]["authorLoginId"], "owner");
    assert_eq!(
        created["threads"][0]["comments"][0]["contentsMarkdown"],
        "First **commit** note @owner @owner/projectYobi @ghost @owner/missing #1 owner/projectYobi#1 `<script>alert(1)</script> @owner #1`"
    );
    let mention_targets = created["threads"][0]["comments"][0]["mentionReferences"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| {
            (
                item["kind"].as_str().unwrap().to_string(),
                item["loginId"].as_str().unwrap_or_default().to_string(),
                item["ownerName"].as_str().unwrap_or_default().to_string(),
                item["projectName"].as_str().unwrap_or_default().to_string(),
            )
        })
        .collect::<Vec<_>>();
    assert!(mention_targets.contains(&(
        "user".to_string(),
        "owner".to_string(),
        String::new(),
        String::new()
    )));
    assert!(mention_targets.contains(&(
        "project".to_string(),
        String::new(),
        "owner".to_string(),
        "projectYobi".to_string()
    )));
    assert!(
        !mention_targets
            .iter()
            .any(|(_, login_id, owner_name, project_name)| {
                login_id == "ghost" || owner_name == "owner" && project_name == "missing"
            }),
        "{mention_targets:?}"
    );
    assert_eq!(
        created["threads"][0]["comments"][0]["contentsHtml"]
            .as_str()
            .unwrap_or(""),
        ""
    );
    assert_eq!(created["threads"][0]["comments"][0]["canDelete"], true);
    let thread_id = created["threads"][0]["id"].as_i64().unwrap();
    let comment_id = created["threads"][0]["comments"][0]["id"].as_i64().unwrap();

    let updated = response_json(
        rest_patch_json(
            app.clone(),
            &format!("/projects/owner/projectYobi/commit/{commit_id}/comments/{comment_id}"),
            Some(&cookie),
            Some(&csrf),
            json!({
                "contentsMarkdown": "Updated **commit** note",
                "attachmentIds": []
            }),
        )
        .await,
    )
    .await;
    assert_eq!(
        updated["threads"][0]["comments"][0]["contentsMarkdown"],
        "Updated **commit** note"
    );
    assert_eq!(
        updated["threads"][0]["comments"][0]["contentsHtml"]
            .as_str()
            .unwrap_or(""),
        ""
    );

    original_email::ActiveModel {
        id: NotSet,
        message_id: Set(Some("<commit-comment-1@example.com>".to_string())),
        resource_type: Set(Some("REVIEW_COMMENT".to_string())),
        resource_id: Set(Some(comment_id.to_string())),
        handled_date: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();

    let via_email_detail =
        response_json(rest_get(app.clone(), &detail_path, Some(&cookie)).await).await;
    assert_eq!(
        via_email_detail["threads"][0]["comments"][0]["viaEmail"],
        true
    );

    let replied = response_json(
        rest_post_json(
            app.clone(),
            &comments_path,
            Some(&cookie),
            Some(&csrf),
            json!({
                "contentsMarkdown": "Reply on the same thread",
                "threadId": thread_id
            }),
        )
        .await,
    )
    .await;
    assert_eq!(
        replied["threads"][0]["comments"].as_array().unwrap().len(),
        2
    );
    let reply_id = replied["threads"][0]["comments"][1]["id"].as_i64().unwrap();

    let closed = response_json(
        rest_post_json(
            app.clone(),
            &format!("/projects/owner/projectYobi/commit/{commit_id}/threads/{thread_id}/close"),
            Some(&cookie),
            Some(&csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(closed["state"], "closed");

    let reopened = response_json(
        rest_post_json(
            app.clone(),
            &format!("/projects/owner/projectYobi/commit/{commit_id}/threads/{thread_id}/open"),
            Some(&cookie),
            Some(&csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(reopened["state"], "open");

    let after_delete = response_json(
        rest_delete_json(
            app.clone(),
            &format!("/projects/owner/projectYobi/commit/{commit_id}/comments/{reply_id}"),
            Some(&cookie),
            Some(&csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(
        after_delete["threads"][0]["comments"]
            .as_array()
            .unwrap()
            .len(),
        1
    );

    let refreshed = response_json(rest_get(app, &detail_path, Some(&cookie)).await).await;
    assert_eq!(refreshed["commit"]["commentCount"], 1);
    assert_eq!(
        refreshed["threads"][0]["comments"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(count_event_rows(&db, "NEW_REVIEW_COMMENT").await, 2);
    assert_eq!(
        count_event_rows(&db, "REVIEW_THREAD_STATE_CHANGED").await,
        2
    );
}

#[tokio::test]
async fn rest_commit_comment_create_requires_authenticated_session() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    let commit_id = bare_repository_head_commit_id(data_dir.path(), project.id);

    let response = rest_post_json(
        app,
        &format!("/projects/owner/projectYobi/commit/{commit_id}/comments"),
        None,
        None,
        json!({
            "contentsMarkdown": "Anonymous commit note"
        }),
    )
    .await;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn rest_commit_comment_allows_legacy_guest_nonmember_on_public_project() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    let commit_id = bare_repository_head_commit_id(data_dir.path(), project.id);
    let guest = repo
        .toggle_site_user_guest_mode("guest")
        .await
        .expect("toggle guest mode")
        .expect("guest exists");
    assert!(guest.is_guest);

    let created = response_json(
        rest_post_json(
            app,
            &format!("/projects/owner/projectYobi/commit/{commit_id}/comments"),
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "contentsMarkdown": "Guest public commit note"
            }),
        )
        .await,
    )
    .await;

    assert_eq!(created["commit"]["commentCount"], 1);
    assert_eq!(created["threads"][0]["authorLoginId"], "guest");
    assert_eq!(
        created["threads"][0]["comments"][0]["contentsMarkdown"],
        "Guest public commit note"
    );
}

#[tokio::test]
async fn rest_commit_detail_reports_missing_commit_as_not_found() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let missing = rest_get(
        app,
        "/projects/owner/projectYobi/commit/doesnotexist?branch=main",
        None,
    )
    .await;

    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn rest_compare_reads_commit_pair_and_diff_from_git_repo() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    let base_commit_id = bare_repository_head_commit_id(data_dir.path(), project.id);
    append_bare_repository_commit(
        data_dir.path(),
        project.id,
        "src/main.rs",
        "fn main() {\n    println!(\"compare\");\n}\n",
        "Update main function",
    );
    let head_commit_id = bare_repository_head_commit_id(data_dir.path(), project.id);

    let response = response_json(
        rest_get(
            app,
            &format!("/projects/owner/projectYobi/compare/{base_commit_id}..{head_commit_id}"),
            None,
        )
        .await,
    )
    .await;

    assert_eq!(response["ownerName"], "owner");
    assert_eq!(response["projectName"], "projectYobi");
    assert!(!json_bool(&response, "noHead"));
    assert_eq!(response["revA"], base_commit_id);
    assert_eq!(response["revB"], head_commit_id);
    assert_eq!(response["commitA"]["commitId"], base_commit_id);
    assert_eq!(response["commitA"]["shortMessage"], "Initial commit");
    assert_eq!(response["commitB"]["commitId"], head_commit_id);
    assert_eq!(response["commitB"]["shortMessage"], "Update main function");

    let files = response["files"].as_array().unwrap();
    assert_eq!(files.len(), 1);
    assert_eq!(files[0]["path"], "src/main.rs");
    let patch = files[0]["patch"].as_str().unwrap();
    assert!(patch.contains("diff --git a/src/main.rs b/src/main.rs"));
    assert!(patch.contains("+    println!(\"compare\");"));
}

#[tokio::test]
async fn rest_compare_reports_missing_commit_as_not_found() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    let head_commit_id = bare_repository_head_commit_id(data_dir.path(), project.id);

    let missing = rest_get(
        app,
        &format!("/projects/owner/projectYobi/compare/doesnotexist..{head_commit_id}"),
        None,
    )
    .await;

    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn rest_branch_list_renders_default_branch_first_with_legacy_actions() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    create_bare_repository_branch(data_dir.path(), project.id, "topic/branch-admin");
    let created_pull_request = response_json(
        rest_post_json(
            app.clone(),
            "/owners/owner/projects/projectYobi/pull-requests",
            Some(&cookie),
            Some(&csrf),
            json!({
                "fromProjectId": project.id,
                "toProjectId": project.id,
                "fromBranch": "topic/branch-admin",
                "toBranch": "main",
                "title": "Branch admin pull request",
                "bodyMarkdown": "Branch admin body"
            }),
        )
        .await,
    )
    .await;

    let response =
        response_json(rest_get(app, "/projects/owner/projectYobi/branches", Some(&cookie)).await)
            .await;

    assert_eq!(response["ownerName"], "owner");
    assert_eq!(response["projectName"], "projectYobi");
    assert_eq!(response["defaultBranch"], "main");
    assert!(!json_bool(&response, "noHead"));
    assert_eq!(response["permissions"]["canUpdate"], true);
    assert_eq!(response["permissions"]["canDelete"], true);
    let branches = response["branches"].as_array().unwrap();
    assert_eq!(branches[0]["name"], "main");
    assert_eq!(branches[0]["isDefault"], true);
    assert_eq!(branches[0]["commitShortId"].as_str().unwrap().len(), 7);
    assert_eq!(branches[0]["commitMessage"], "Initial commit");
    assert!(branches
        .iter()
        .any(|branch| branch["name"] == "topic/branch-admin"
            && branch["shortName"] == "topic/branch-admin"
            && branch["isDefault"] == false
            && branch["pullRequest"]["ownerName"] == "owner"
            && branch["pullRequest"]["projectName"] == "projectYobi"
            && branch["pullRequest"]["pullRequestNumber"]
                == created_pull_request["pullRequestNumber"]
            && branch["pullRequest"]["state"] == "open"));
}

#[tokio::test]
async fn rest_branch_default_mutation_moves_git_head() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    create_bare_repository_branch(data_dir.path(), project.id, "topic/default");

    let response = response_json(
        rest_post_json(
            app,
            "/projects/owner/projectYobi/branches/default",
            Some(&cookie),
            Some(&csrf),
            json!({ "branchName": "topic/default" }),
        )
        .await,
    )
    .await;

    assert_eq!(response["defaultBranch"], "topic/default");
    assert_eq!(response["branches"][0]["name"], "topic/default");
    assert_eq!(response["branches"][0]["isDefault"], true);
    let bare_repo = data_dir
        .path()
        .join("repo")
        .join(format!("{}.git", project.id));
    let output = Command::new("git")
        .args([
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "symbolic-ref",
            "--short",
            "HEAD",
        ])
        .output()
        .expect("symbolic-ref HEAD");
    assert!(output.status.success());
    assert_eq!(
        String::from_utf8(output.stdout).unwrap().trim(),
        "topic/default"
    );
}

#[tokio::test]
async fn rest_branch_delete_removes_non_default_branch_and_rejects_default() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    create_bare_repository_branch(data_dir.path(), project.id, "topic/delete-me");

    let response = response_json(
        rest_delete_json(
            app.clone(),
            "/projects/owner/projectYobi/branches",
            Some(&cookie),
            Some(&csrf),
            json!({ "branchName": "topic/delete-me" }),
        )
        .await,
    )
    .await;
    assert!(!response["branches"]
        .as_array()
        .unwrap()
        .iter()
        .any(|branch| branch["name"] == "topic/delete-me"));

    let rejected = rest_delete_json(
        app,
        "/projects/owner/projectYobi/branches",
        Some(&cookie),
        Some(&csrf),
        json!({ "branchName": "main" }),
    )
    .await;
    assert_eq!(rejected.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn rest_branch_mutation_requires_project_update_permission() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    create_bare_repository_branch(data_dir.path(), project.id, "topic/forbidden");
    let (reader_csrf, reader_cookie) = register_user(app.clone(), "reader").await;

    let rejected = rest_post_json(
        app,
        "/projects/owner/projectYobi/branches/default",
        Some(&reader_cookie),
        Some(&reader_csrf),
        json!({ "branchName": "topic/forbidden" }),
    )
    .await;

    assert_eq!(rejected.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn direct_code_file_routes_stream_raw_open_and_image_bytes() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    let head_commit_id = bare_repository_head_commit_id(data_dir.path(), project.id);

    let (raw_status, raw_headers, raw_body) = response_bytes(
        direct_get(
            app.clone(),
            "/owner/projectYobi/rawcode/main/src/main.rs",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(raw_status, StatusCode::OK);
    assert_eq!(raw_body, b"fn main() {}\n");
    assert!(raw_headers[http::header::CONTENT_TYPE]
        .to_str()
        .unwrap()
        .starts_with("text/plain"));

    let (commit_raw_status, _commit_raw_headers, commit_raw_body) = response_bytes(
        direct_get(
            app.clone(),
            &format!("/owner/projectYobi/rawcode/{head_commit_id}/src/main.rs"),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(commit_raw_status, StatusCode::OK);
    assert_eq!(commit_raw_body, raw_body);

    let (open_status, open_headers, open_body) = response_bytes(
        direct_get(
            app.clone(),
            "/owner/projectYobi/files/main/assets/logo.png",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(open_status, StatusCode::OK);
    assert_eq!(&open_body[..8], b"\x89PNG\r\n\x1a\n");
    assert_eq!(
        open_headers[http::header::CONTENT_TYPE].to_str().unwrap(),
        "image/png"
    );
    assert!(open_headers[http::header::CONTENT_DISPOSITION]
        .to_str()
        .unwrap()
        .contains("inline"));

    let (image_status, image_headers, image_body) = response_bytes(
        direct_get(
            app.clone(),
            "/owner/projectYobi/image/main/assets/logo.png",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(image_status, StatusCode::OK);
    assert_eq!(image_body, open_body);
    assert_eq!(
        image_headers[http::header::CONTENT_TYPE].to_str().unwrap(),
        "image/png"
    );

    let (binary_status, binary_headers, binary_body) = response_bytes(
        direct_get(app, "/owner/projectYobi/files/main/bin/archive.bin", None).await,
    )
    .await;
    assert_eq!(binary_status, StatusCode::OK);
    assert_eq!(binary_body, b"\0binary");
    assert_eq!(
        binary_headers[http::header::CONTENT_TYPE].to_str().unwrap(),
        "application/octet-stream"
    );
}

#[tokio::test]
async fn direct_code_archive_download_streams_branch_zip() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let (status, headers, body) = response_bytes(
        direct_get(app.clone(), "/owner/projectYobi/code/main/download", None).await,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        headers[http::header::CONTENT_TYPE].to_str().unwrap(),
        "application/zip"
    );
    assert!(headers[http::header::CONTENT_DISPOSITION]
        .to_str()
        .unwrap()
        .contains("attachment; filename=\"projectYobi-main.zip\""));
    assert!(body.starts_with(b"PK"));
    assert!(body
        .windows(b"README.md".len())
        .any(|window| window == b"README.md"));
    assert!(body
        .windows(b"src/main.rs".len())
        .any(|window| window == b"src/main.rs"));

    let missing = direct_get(app, "/owner/projectYobi/code/missing/download", None).await;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn direct_code_file_and_archive_routes_decode_legacy_encoded_branch_names() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    create_bare_repository_branch(data_dir.path(), project.id, "topic/encoded+plus");

    let (raw_status, _raw_headers, raw_body) = response_bytes(
        direct_get(
            app.clone(),
            "/owner/projectYobi/rawcode/topic%2Fencoded%2Bplus/src/main.rs",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(raw_status, StatusCode::OK);
    assert_eq!(raw_body, b"fn main() {}\n");

    let (open_status, open_headers, open_body) = response_bytes(
        direct_get(
            app.clone(),
            "/owner/projectYobi/files/topic%2Fencoded%2Bplus/src/main.rs",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(open_status, StatusCode::OK);
    assert_eq!(open_body, raw_body);
    assert!(open_headers[http::header::CONTENT_DISPOSITION]
        .to_str()
        .unwrap()
        .contains("inline"));

    let (archive_status, archive_headers, archive_body) = response_bytes(
        direct_get(
            app,
            "/owner/projectYobi/code/topic%2Fencoded%2Bplus/download",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(archive_status, StatusCode::OK);
    assert_eq!(
        archive_headers[http::header::CONTENT_TYPE]
            .to_str()
            .unwrap(),
        "application/zip"
    );
    assert!(archive_body.starts_with(b"PK"));
    assert!(archive_body
        .windows(b"README.md".len())
        .any(|window| window == b"README.md"));
}

#[tokio::test]
async fn direct_code_file_routes_redirect_missing_raw_and_reject_path_traversal() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let missing = direct_get(
        app.clone(),
        "/owner/projectYobi/rawcode/main/missing.rs",
        None,
    )
    .await;
    assert_eq!(missing.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        missing
            .headers()
            .get(http::header::LOCATION)
            .unwrap()
            .to_str()
            .unwrap(),
        "/yona/owner/projectYobi/code/main/missing.rs"
    );

    let raw_traversal = direct_get(
        app.clone(),
        "/owner/projectYobi/rawcode/main/..%2Fsecret.txt",
        None,
    )
    .await;
    assert_eq!(raw_traversal.status(), StatusCode::BAD_REQUEST);

    let files_traversal = direct_get(
        app.clone(),
        "/owner/projectYobi/files/main/..%2Fsecret.txt",
        None,
    )
    .await;
    assert_eq!(files_traversal.status(), StatusCode::BAD_REQUEST);

    let image_traversal =
        direct_get(app, "/owner/projectYobi/image/main/..%2Fsecret.txt", None).await;
    assert_eq!(image_traversal.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn code_browser_reports_no_head_for_missing_repository() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("created project");
    fs::remove_dir_all(
        data_dir
            .path()
            .join("repo")
            .join(format!("{}.git", project.id)),
    )
    .expect("remove provisioned repository to cover missing repo no-head state");

    let response = response_json(
        rpc(
            app,
            "ReadCodeBrowser",
            None,
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi"
            }),
        )
        .await,
    )
    .await;

    assert_eq!(response["noHead"], true);
}

#[tokio::test]
async fn rest_code_browser_rejects_path_traversal() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let response = rest_get(
        app,
        "/projects/owner/projectYobi/code?branch=main&path=..%2Fsecret.txt",
        None,
    )
    .await;

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn code_browser_rejects_path_traversal() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let response = rpc(
        app,
        "ReadCodeBrowser",
        None,
        None,
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "branch": "main",
            "path": "../secret.txt"
        }),
    )
    .await;

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
