use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{Database, DatabaseConnection};
use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::process::Command;
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router_with_repository_and_app_config, AppRuntimeConfig, RuntimeConfig,
};
use yona_rust_vcs::repository_path;

mod rest_test_support;

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

async fn response_text(response: Response<Body>) -> String {
    String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .expect("response body")
            .to_bytes()
            .to_vec(),
    )
    .expect("utf-8 response")
}

async fn ok_json(response: Response<Body>) -> Value {
    let status = response.status();
    let text = response_text(response).await;
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

async fn rest(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Option<Value>,
) -> Response<Body> {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }
    if payload.is_some() {
        builder = builder.header(http::header::CONTENT_TYPE, "application/json");
    }

    app.oneshot(
        builder
            .body(Body::from(
                payload.map_or_else(String::new, |value| value.to_string()),
            ))
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn rest_form(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    form: &[(&str, &str)],
) -> Response<Body> {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    builder = builder.header(
        http::header::CONTENT_TYPE,
        "application/x-www-form-urlencoded",
    );
    let body = form
        .iter()
        .map(|(key, value)| format!("{key}={value}"))
        .collect::<Vec<_>>()
        .join("&");

    app.oneshot(builder.body(Body::from(body)).unwrap())
        .await
        .unwrap()
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = rest_test_support::pilot_rest(
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
    .await;
    ok_json(response).await;
    (csrf, cookie_header)
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str) {
    ok_json(
        rest(
            app,
            Method::POST,
            "/yona/api/v1/owners/owner/projects",
            Some(cookie),
            Some(csrf),
            Some(json!({
                "overview": "fork parity",
                "projectName": "projectYobi",
                "projectScope": "public",
            })),
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
    fs::write(work.path().join("README.md"), "# Fork me\n").expect("readme");
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

fn head_commit(repo_path: &Path) -> String {
    let output = Command::new("git")
        .args([
            "--git-dir",
            repo_path.to_str().unwrap(),
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
        .expect("utf8 commit")
        .trim()
        .to_string()
}

#[tokio::test]
// Guards the `routes/projects/forks.rs` ownership boundary: fork options,
// repository clone, origin persistence, and duplicate-name rejection stay
// together while route registration remains in the parent project module.
async fn project_fork_clones_bare_repository_and_records_origin() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repository, _db) = build_app_with_repository_and_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    let (_, cloner_cookie) = register_user(app.clone(), "cloner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let source = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .expect("source lookup")
        .expect("source exists");
    seed_bare_repository(data_dir.path(), source.id);
    let source_repo_path = repository_path(data_dir.path(), source.id);
    let source_head = head_commit(&source_repo_path);

    let form = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/fork-options",
            Some(&guest_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(form["source"]["ownerName"], "owner");
    assert_eq!(form["source"]["projectName"], "projectYobi");
    assert_eq!(form["selected"]["ownerName"], "guest");
    assert_eq!(form["selected"]["projectName"], "projectYobi");
    assert_eq!(form["canFork"], true);
    assert_eq!(form["ownerOptions"][0]["ownerName"], "guest");

    let direct_clone = ok_json(
        rest_form(
            app.clone(),
            Method::POST,
            "/yona/owner/projectYobi/clone",
            Some(&cloner_cookie),
            &[
                ("owner", "cloner"),
                ("name", "projectYobi"),
                ("projectScope", "public"),
            ],
        )
        .await,
    )
    .await;
    assert_eq!(direct_clone["status"], "success");
    assert_eq!(direct_clone["url"], "/yona/cloner/projectYobi");
    let direct_fork = repository
        .read_project_by_owner_and_name("cloner", "projectYobi")
        .await
        .expect("direct fork lookup")
        .expect("direct fork exists");
    assert_eq!(direct_fork.original_project_id, Some(source.id));
    assert_eq!(
        head_commit(&repository_path(data_dir.path(), direct_fork.id)),
        source_head
    );

    let direct_missing = ok_json(
        rest_form(
            app.clone(),
            Method::POST,
            "/yona/missing/projectYobi/clone",
            Some(&cloner_cookie),
            &[
                ("owner", "cloner"),
                ("name", "missingFork"),
                ("projectScope", "public"),
            ],
        )
        .await,
    )
    .await;
    assert_eq!(direct_missing["status"], "failed");
    assert_eq!(direct_missing["url"], "/yona/");

    let guest = repository
        .toggle_site_user_guest_mode("guest")
        .await
        .expect("toggle guest mode")
        .expect("guest exists");
    assert!(guest.is_guest);

    let forked = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/fork",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({
                "name": "projectYobi",
                "owner": "guest",
                "projectScope": "public"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(forked["ok"], true);
    assert_eq!(forked["redirectPath"], "/guest/projectYobi");
    assert_eq!(forked["project"]["ownerName"], "guest");
    assert_eq!(forked["project"]["projectName"], "projectYobi");

    let fork = repository
        .read_project_by_owner_and_name("guest", "projectYobi")
        .await
        .expect("fork lookup")
        .expect("fork exists");
    assert_eq!(fork.original_project_id, Some(source.id));
    let fork_repo_path = repository_path(data_dir.path(), fork.id);
    assert!(fork_repo_path.is_dir());
    assert_eq!(head_commit(&fork_repo_path), source_head);

    let duplicate = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/fork",
        Some(&guest_cookie),
        Some(&guest_csrf),
        Some(json!({
            "name": "projectYobi",
            "owner": "guest",
            "projectScope": "public"
        })),
    )
    .await;
    assert_eq!(duplicate.status(), StatusCode::CONFLICT);
}
