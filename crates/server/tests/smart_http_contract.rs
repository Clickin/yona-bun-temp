use axum::body::Body;
use base64::{engine::general_purpose, Engine as _};
use bcrypt::{hash, DEFAULT_COST};
use http::{HeaderMap, Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ColumnTrait, Database, DatabaseConnection, EntityTrait, QueryFilter};
use serde_json::json;
use std::fs;
use std::path::Path;
use std::process::Command;
use tempfile::tempdir;
use tokio::sync::oneshot;
use tower::ServiceExt;
use yona_rust_integrations::{clear_test_webhook_outbox, snapshot_test_webhook_outbox};
use yona_rust_persistence::{
    notification_event, project_pushed_branch, pull_request_commit, AppRepository,
    CreateProjectInput, CreateProjectWebhookInput, CreatePullRequestInput, CreatePullRequestResult,
    CreateUserInput, PullRequestMutationInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router_with_repository_and_app_config, AppRuntimeConfig, AuthUiConfig, LdapFixtureUser,
    LdapRuntimeConfig, RuntimeConfig,
};
use yona_rust_vcs::MAX_SMART_HTTP_RPC_BYTES;

mod rest_test_support;

async fn build_app_with_data_root(
    data_root: &Path,
) -> (axum::Router, AppRepository, DatabaseConnection) {
    build_app_with_app_config(AppRuntimeConfig {
        data_root: data_root.to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await
}

async fn build_app_with_app_config(
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
            public_origin: "http://localhost".to_string(),
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

async fn direct_request_with_body(
    app: axum::Router,
    method: Method,
    path: &str,
    authorization: Option<&str>,
    headers: &[(&str, String)],
    body: &'static [u8],
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(format!("/yona{path}"));
    if let Some(authorization) = authorization {
        builder = builder.header(http::header::AUTHORIZATION, authorization);
    }
    for (name, value) in headers {
        builder = builder.header(*name, value);
    }

    app.oneshot(builder.body(Body::from(body)).unwrap())
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
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_data_root(data_dir.path()).await;
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
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_data_root(data_dir.path()).await;
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

    let (status, headers, body) = response_bytes(
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
    assert_eq!(String::from_utf8_lossy(&body), "user.login.required");
    assert_eq!(
        headers
            .get(http::header::WWW_AUTHENTICATE)
            .and_then(|value| value.to_str().ok()),
        Some("Basic realm=\"Yona\"")
    );
}

#[tokio::test]
// Guards Smart HTTP reuse of route-utils-owned confirmation-session and project ACL helpers.
async fn smart_http_allows_basic_member_write_advertisement_and_rejects_outsider() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_data_root(data_dir.path()).await;
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
async fn smart_http_basic_auth_routes_ldap_and_preserves_local_fallback_and_tokens() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ldap: LdapRuntimeConfig {
            enabled: true,
            fallback_to_local_login: true,
            use_email_base_login: true,
            fixture_users: vec![LdapFixtureUser {
                department: "Dev".to_string(),
                display_name: "Directory Member".to_string(),
                email: "member@example.com".to_string(),
                english_name: String::new(),
                login_id: "ldap-member".to_string(),
                password: "ldap-pass".to_string(),
            }],
            ..LdapRuntimeConfig::default()
        },
        ..AppRuntimeConfig::default()
    })
    .await;
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
    let api_token = repo
        .reset_api_token_for_user(member_id)
        .await
        .expect("member api token");
    seed_bare_repository(data_dir.path(), project.id);

    let (status, _, body) = response_bytes(
        direct_request(
            app.clone(),
            Method::GET,
            "/owner/projectYobi.git/info/refs?service=git-receive-pack",
            Some(&basic("member", "doorpass1")),
        )
        .await,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{}", String::from_utf8_lossy(&body));

    let (status, _, body) = response_bytes(
        direct_request(
            app.clone(),
            Method::GET,
            "/owner/projectYobi.git/info/refs?service=git-receive-pack",
            Some(&basic("member", "ldap-pass")),
        )
        .await,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{}", String::from_utf8_lossy(&body));

    let (status, _, body) = response_bytes(
        direct_request(
            app.clone(),
            Method::GET,
            "/owner/projectYobi.git/info/refs?service=git-receive-pack",
            Some(&basic("member", &api_token)),
        )
        .await,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{}", String::from_utf8_lossy(&body));

    let (status, headers, _) = response_bytes(
        direct_request(
            app,
            Method::GET,
            "/owner/projectYobi.git/info/refs?service=git-receive-pack",
            Some(&basic("member", "wrong-pass")),
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
async fn smart_http_basic_auth_uses_injected_confirmation_config_without_env_mutation() {
    // Guards Smart HTTP asset fallback dispatch using the app-scoped service snapshot.
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_app_config(AppRuntimeConfig {
        auth_ui: AuthUiConfig {
            signup_require_confirm: true,
            ..AuthUiConfig::default()
        },
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let password_hash = hash("doorpass1", DEFAULT_COST).expect("bcrypt test password");
    let owner = repo
        .create_user(CreateUserInput {
            display_name: "owner".to_string(),
            email_address: "owner@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "owner".to_string(),
            password_hash: password_hash.clone(),
        })
        .await
        .expect("create owner");
    let member = repo
        .create_user(CreateUserInput {
            display_name: "member".to_string(),
            email_address: "member@example.com".to_string(),
            is_confirmed: false,
            is_site_admin: false,
            login_id: "member".to_string(),
            password_hash,
        })
        .await
        .expect("create member");
    let project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: owner.login_id,
            overview: Some("Smart HTTP parity".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .expect("create project");
    repo.add_project_membership(project.id, member.id, "member")
        .await
        .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

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

    assert_eq!(
        status,
        StatusCode::UNAUTHORIZED,
        "{}",
        String::from_utf8_lossy(&body)
    );
    assert_eq!(
        headers
            .get(http::header::WWW_AUTHENTICATE)
            .and_then(|value| value.to_str().ok()),
        Some("Basic realm=\"Yona\"")
    );
}

#[tokio::test]
async fn smart_http_receive_pack_rejects_oversized_content_length_before_git_execution() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_data_root(data_dir.path()).await;
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

    let (status, _, body) = response_bytes(
        direct_request_with_body(
            app,
            Method::POST,
            "/owner/projectYobi.git/git-receive-pack",
            Some(&basic("member", "doorpass1")),
            &[
                (
                    http::header::CONTENT_TYPE.as_str(),
                    "application/x-git-receive-pack-request".to_string(),
                ),
                (
                    http::header::CONTENT_LENGTH.as_str(),
                    (MAX_SMART_HTTP_RPC_BYTES + 1).to_string(),
                ),
            ],
            b"0000",
        )
        .await,
    )
    .await;

    assert_eq!(status, StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(String::from_utf8_lossy(&body), "Request Entity Too Large");
}

#[tokio::test]
async fn smart_http_supports_real_git_clone_and_authenticated_push() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_data_root(data_dir.path()).await;
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

#[tokio::test]
// Guards Smart HTTP webhook payload reuse of the route-utils-owned absolute app URL helper.
async fn smart_http_push_records_legacy_post_receive_side_effects() {
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, db) = build_app_with_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
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
    repo.set_project_watch(owner_id, project.id, true)
        .await
        .unwrap();
    repo.create_project_webhook(CreateProjectWebhookInput {
        git_push: true,
        payload_url: "http://example.test/push".to_string(),
        project_id: project.id,
        secret: "push-secret".to_string(),
        webhook_type: 3,
    })
    .await
    .unwrap();
    repo.create_project_webhook(CreateProjectWebhookInput {
        git_push: false,
        payload_url: "http://example.test/issue".to_string(),
        project_id: project.id,
        secret: "issue-secret".to_string(),
        webhook_type: 0,
    })
    .await
    .unwrap();
    seed_bare_repository(data_dir.path(), project.id);

    let (base_url, shutdown) = spawn_app_server(app).await;
    let client_parent = tempdir().expect("client parent");
    let clone_path = client_parent.path().join("clone");
    run_git_blocking(
        vec![
            "clone".to_string(),
            format!("{base_url}/yona/owner/projectYobi.git"),
            clone_path.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    fs::write(clone_path.join("PUSHED.md"), "post receive parity\n").expect("pushed file");
    run_git_blocking(
        vec!["add".to_string(), "PUSHED.md".to_string()],
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
            "Trigger post receive side effects".to_string(),
        ],
        Some(clone_path.clone()),
    )
    .await;
    let pushed_head = git_stdout(&["rev-parse", "HEAD"], Some(&clone_path));
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

    let refreshed_project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("refreshed project");
    assert!(
        refreshed_project.last_pushed_date.is_some(),
        "push should update project.last_pushed_date"
    );
    let pushed_branch = project_pushed_branch::Entity::find()
        .filter(project_pushed_branch::Column::ProjectId.eq(Some(project.id)))
        .filter(project_pushed_branch::Column::Name.eq(Some("main".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("pushed branch row");
    assert!(
        pushed_branch.pushed_date.is_some(),
        "push should update branch pushed_date"
    );
    let commit_events = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("NEW_COMMIT".to_string())))
        .filter(notification_event::Column::ResourceType.eq(Some("PROJECT".to_string())))
        .filter(notification_event::Column::ResourceId.eq(Some(project.id.to_string())))
        .all(&db)
        .await
        .unwrap();
    assert_eq!(commit_events.len(), 1);

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    assert_eq!(deliveries[0].event_type, "NEW_COMMIT");
    assert_eq!(deliveries[0].webhook_type, "JSON");
    let payload: serde_json::Value =
        serde_json::from_str(&deliveries[0].body).expect("push webhook payload");
    assert_eq!(payload["ref"], json!(["refs/heads/main"]));
    assert_eq!(payload["commits"][0]["id"], pushed_head.trim());
    assert_eq!(payload["head_commit"]["id"], pushed_head.trim());
    assert_eq!(payload["sender"]["login"], "member");
    assert_eq!(payload["pusher"]["name"], "member");
    assert_eq!(payload["repository"]["id"], project.id);
    assert_eq!(payload["repository"]["name"], "projectYobi");
    assert_eq!(payload["repository"]["owner"], "owner");

    let _ = shutdown.send(());
}

#[tokio::test]
async fn smart_http_push_records_pull_request_commit_changed_side_effects() {
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, db) = build_app_with_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
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
    repo.create_project_webhook(CreateProjectWebhookInput {
        git_push: false,
        payload_url: "http://example.test/pr".to_string(),
        project_id: project.id,
        secret: "pr-secret".to_string(),
        webhook_type: 0,
    })
    .await
    .unwrap();
    seed_bare_repository(data_dir.path(), project.id);
    let pull_request = match repo
        .create_pull_request(CreatePullRequestInput {
            actor_display_name: "Owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            from_branch: "topic/pr".to_string(),
            from_project_id: project.id,
            to_branch: "main".to_string(),
            to_project_id: project.id,
            values: PullRequestMutationInput {
                attachment_ids: Vec::new(),
                body_markdown: "PR body".to_string(),
                title: "Smart PR".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("pull request created")
    {
        CreatePullRequestResult::Created(record) => record,
        CreatePullRequestResult::Duplicate(_) => panic!("unexpected duplicate pull request"),
    };
    clear_test_webhook_outbox();

    let (base_url, shutdown) = spawn_app_server(app).await;
    let client_parent = tempdir().expect("client parent");
    let clone_path = client_parent.path().join("clone");
    run_git_blocking(
        vec![
            "clone".to_string(),
            format!("{base_url}/yona/owner/projectYobi.git"),
            clone_path.to_string_lossy().to_string(),
        ],
        None,
    )
    .await;
    run_git_blocking(
        vec![
            "checkout".to_string(),
            "-b".to_string(),
            "topic/pr".to_string(),
        ],
        Some(clone_path.clone()),
    )
    .await;
    fs::write(clone_path.join("PR.md"), "pull request commit changed\n").expect("pr file");
    run_git_blocking(
        vec!["add".to_string(), "PR.md".to_string()],
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
            "Push PR commit changed".to_string(),
        ],
        Some(clone_path.clone()),
    )
    .await;
    let pushed_head = git_stdout(&["rev-parse", "HEAD"], Some(&clone_path));
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
        vec![
            "push".to_string(),
            "origin".to_string(),
            "topic/pr".to_string(),
        ],
        Some(clone_path.clone()),
    )
    .await;

    let commit_rows = pull_request_commit::Entity::find()
        .filter(pull_request_commit::Column::PullRequestId.eq(Some(pull_request.id)))
        .all(&db)
        .await
        .unwrap();
    assert_eq!(commit_rows.len(), 1);
    assert_eq!(
        commit_rows[0].commit_id.as_deref(),
        Some(pushed_head.trim())
    );
    let detail = repo
        .read_pull_request_detail(
            "owner",
            "projectYobi",
            pull_request.pull_request_number,
            Some(owner_id),
        )
        .await
        .unwrap()
        .expect("pull request detail");
    assert_eq!(detail.commits.len(), 1);
    assert_eq!(detail.commits[0].commit_id, pushed_head.trim());
    assert_eq!(detail.commits[0].commit_message, "Push PR commit changed");
    let changed_event = detail
        .events
        .iter()
        .find(|event| event.event_type == "PULL_REQUEST_COMMIT_CHANGED")
        .expect("commit changed event");
    assert_eq!(changed_event.sender_login_id, "member");
    assert_eq!(changed_event.new_value, commit_rows[0].id.to_string());
    let notification_events = notification_event::Entity::find()
        .filter(
            notification_event::Column::EventType
                .eq(Some("PULL_REQUEST_COMMIT_CHANGED".to_string())),
        )
        .filter(notification_event::Column::ResourceType.eq(Some("PULL_REQUEST".to_string())))
        .filter(notification_event::Column::ResourceId.eq(Some(pull_request.id.to_string())))
        .all(&db)
        .await
        .unwrap();
    assert_eq!(notification_events.len(), 1);

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    assert_eq!(deliveries[0].event_type, "PULL_REQUEST_COMMIT_CHANGED");
    assert_eq!(deliveries[0].webhook_type, "SIMPLE");
    let payload: serde_json::Value =
        serde_json::from_str(&deliveries[0].body).expect("commit changed webhook payload");
    assert!(payload["text"]
        .as_str()
        .unwrap_or_default()
        .contains("PULL_REQUEST_COMMIT_CHANGED"));
    assert!(payload["text"]
        .as_str()
        .unwrap_or_default()
        .contains("#1: Smart PR"));

    let _ = shutdown.send(());
}
