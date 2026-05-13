use axum::body::Body;
use http::{HeaderMap, Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use std::fs;
use std::path::Path;
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

async fn build_app_with_repository() -> (axum::Router, AppRepository) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db);
    let app = create_router_with_app_repository(
        RuntimeConfig {
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
    );

    (app, app_repo)
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
    assert!(!json_bool(&file["file"], "isBinary"));
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
async fn direct_raw_code_redirects_missing_file_and_rejects_path_traversal() {
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

    let traversal = direct_get(app, "/owner/projectYobi/rawcode/main/..%2Fsecret.txt", None).await;
    assert_eq!(traversal.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn code_browser_reports_no_head_for_missing_repository() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf, "public").await;

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
