use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ConnectionTrait, Database, DatabaseConnection, EntityTrait, PaginatorTrait, Statement,
};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;
use yona_rust_integrations::{
    clear_test_webhook_outbox, queue_test_webhook_response, snapshot_test_webhook_outbox,
};
use yona_rust_persistence::{webhook_thread, AppRepository};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

static YONA_DATA_TEST_LOCK: OnceLock<tokio::sync::Mutex<()>> = OnceLock::new();

async fn lock_yona_data_tests() -> tokio::sync::MutexGuard<'static, ()> {
    YONA_DATA_TEST_LOCK
        .get_or_init(|| tokio::sync::Mutex::new(()))
        .lock()
        .await
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
            public_origin: String::new(),
        },
        app_repo.clone(),
    );

    (app, app_repo, db)
}

async fn response_text(response: Response<Body>) -> String {
    String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap()
}

async fn response_json(response: Response<Body>) -> serde_json::Value {
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
    let response = rpc(
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
    let payload = response_json(response).await;
    let actor_id = payload
        .get("actorId")
        .and_then(|value| {
            value
                .as_i64()
                .or_else(|| value.as_str().and_then(|value| value.parse().ok()))
        })
        .expect("actor id");

    (csrf, cookie_header, actor_id)
}

async fn create_project(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    owner_name: &str,
    project_name: &str,
    scope: &str,
) {
    response_json(
        rpc(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": owner_name,
                "projectName": project_name,
                "overview": "Phase 4B PR interaction parity",
                "projectScope": scope
            }),
        )
        .await,
    )
    .await;
}

async fn rest_get(app: axum::Router, uri: &str, cookie_header: Option<&str>) -> Response<Body> {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
}

async fn rest_json(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: serde_json::Value,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
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

async fn count_rows(db: &DatabaseConnection, table: &str, event_type: &str) -> u64 {
    let backend = db.get_database_backend();
    let rows = db
        .query_all(Statement::from_sql_and_values(
            backend,
            format!("SELECT id FROM {table} WHERE event_type = ?"),
            vec![event_type.to_string().into()],
        ))
        .await
        .expect("count rows");
    rows.len() as u64
}

async fn notification_receivers_for_event(
    db: &DatabaseConnection,
    event_type: &str,
    resource_type: &str,
    resource_id: i64,
) -> Vec<i64> {
    let backend = db.get_database_backend();
    let rows = db
        .query_all(Statement::from_sql_and_values(
            backend,
            r#"
            SELECT neu.n4user_id AS n4user_id
            FROM notification_event ne
            JOIN notification_event_n4user neu ON neu.notification_event_id = ne.id
            WHERE ne.event_type = ? AND ne.resource_type = ? AND ne.resource_id = ?
            ORDER BY neu.n4user_id
            "#,
            vec![
                event_type.to_string().into(),
                resource_type.to_string().into(),
                resource_id.to_string().into(),
            ],
        ))
        .await
        .expect("notification receivers");
    rows.into_iter()
        .map(|row| row.try_get("", "n4user_id").expect("receiver id"))
        .collect()
}

fn temp_path(label: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before unix epoch")
        .as_nanos();
    std::env::temp_dir().join(format!(
        "yona-pr-mutation-{label}-{}-{nanos}",
        std::process::id()
    ))
}

fn run_git(repo_path: &Path, args: &[&str]) {
    let status = Command::new("git")
        .arg("-C")
        .arg(repo_path)
        .args(args)
        .status()
        .expect("run git");
    assert!(status.success(), "git {:?} failed", args);
}

fn git_dir_output(repo_path: &Path, args: &[&str]) -> String {
    let output = Command::new("git")
        .arg("--git-dir")
        .arg(repo_path)
        .args(args)
        .output()
        .expect("run git --git-dir");
    assert!(
        output.status.success(),
        "git --git-dir {:?} {:?} failed: {}",
        repo_path,
        args,
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout).expect("git stdout utf8")
}

fn git_dir_success(repo_path: &Path, args: &[&str]) -> bool {
    Command::new("git")
        .arg("--git-dir")
        .arg(repo_path)
        .args(args)
        .output()
        .expect("run git --git-dir")
        .status
        .success()
}

async fn count_project_pushed_branch(
    db: &DatabaseConnection,
    project_id: i64,
    branch_name: &str,
) -> u64 {
    let backend = db.get_database_backend();
    let rows = db
        .query_all(Statement::from_sql_and_values(
            backend,
            "SELECT id FROM project_pushed_branch WHERE project_id = ? AND name = ?",
            vec![project_id.into(), branch_name.to_string().into()],
        ))
        .await
        .expect("count pushed branch rows");
    rows.len() as u64
}

async fn insert_resource_watch(
    db: &DatabaseConnection,
    user_id: i64,
    resource_type: &str,
    resource_id: i64,
) {
    db.execute(Statement::from_sql_and_values(
        db.get_database_backend(),
        "INSERT INTO watch (user_id, resource_type, resource_id) VALUES (?, ?, ?)",
        vec![
            user_id.into(),
            resource_type.to_string().into(),
            resource_id.to_string().into(),
        ],
    ))
    .await
    .expect("insert watch row");
}

fn write_repo_file(repo_path: &Path, relative_path: &str, contents: &str) {
    let path = repo_path.join(relative_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, contents).unwrap();
}

fn clone_bare(work_path: &Path, repo_path: &Path) {
    if repo_path.exists() {
        fs::remove_dir_all(repo_path).expect("replace provisioned bare repository");
    }
    let status = Command::new("git")
        .args(["clone", "--bare"])
        .arg(work_path)
        .arg(repo_path)
        .status()
        .expect("clone bare repository");
    assert!(status.success(), "git clone --bare failed");
}

fn seed_bare_repo_with_branches(data_root: &Path, project_id: i64) {
    let repo_path = data_root.join("repo").join(format!("{project_id}.git"));
    let work_path = temp_path("work");
    fs::create_dir_all(&work_path).unwrap();
    run_git(&work_path, &["init", "-b", "main"]);
    run_git(&work_path, &["config", "user.email", "test@example.com"]);
    run_git(&work_path, &["config", "user.name", "Test User"]);
    write_repo_file(&work_path, "README.md", "main\n");
    run_git(&work_path, &["add", "README.md"]);
    run_git(&work_path, &["commit", "-m", "initial"]);
    run_git(&work_path, &["checkout", "-b", "topic/pr"]);
    write_repo_file(&work_path, "README.md", "topic\n");
    run_git(&work_path, &["add", "README.md"]);
    run_git(&work_path, &["commit", "-m", "topic"]);
    run_git(&work_path, &["checkout", "main"]);
    run_git(&work_path, &["checkout", "-b", "topic/conflict"]);
    write_repo_file(&work_path, "README.md", "conflict\n");
    run_git(&work_path, &["add", "README.md"]);
    run_git(&work_path, &["commit", "-m", "conflict"]);
    run_git(&work_path, &["checkout", "main"]);
    run_git(&work_path, &["checkout", "-b", "topic/direct"]);
    write_repo_file(&work_path, "DIRECT.md", "direct\n");
    run_git(&work_path, &["add", "DIRECT.md"]);
    run_git(&work_path, &["commit", "-m", "direct accept"]);
    run_git(&work_path, &["checkout", "main"]);
    fs::create_dir_all(repo_path.parent().unwrap()).unwrap();
    clone_bare(&work_path, &repo_path);
    fs::remove_dir_all(work_path).unwrap();
}

#[tokio::test]
async fn pull_request_watcher_projection_matches_legacy_get_watchers() {
    let _yona_data_guard = lock_yona_data_tests().await;
    let data_root = temp_path("watchers-data");
    fs::create_dir_all(&data_root).unwrap();
    std::env::set_var("YONA_DATA", &data_root);
    clear_test_webhook_outbox();

    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "watchowner").await;
    let (commenter_csrf, commenter_cookie, _) = register_user(app.clone(), "watchcommenter").await;
    let (project_watcher_csrf, project_watcher_cookie, project_watcher_id) =
        register_user(app.clone(), "projectwatcher").await;
    let (explicit_watcher_csrf, explicit_watcher_cookie, _explicit_watcher_id) =
        register_user(app.clone(), "explicitwatcher").await;
    let (_, _, private_outsider_id) = register_user(app.clone(), "privateoutsider").await;

    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "watchowner",
        "watchPublic",
        "public",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("watchowner", "watchPublic")
        .await
        .unwrap()
        .expect("public project");
    seed_bare_repo_with_branches(&data_root, project.id);

    let created = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/watchowner/projects/watchPublic/pull-requests",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "fromProjectId": project.id,
                "toProjectId": project.id,
                "fromBranch": "topic/pr",
                "toBranch": "main",
                "title": "Watcher projection parity",
                "bodyMarkdown": "Watcher projection body"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(created["watcherCount"], 1);
    assert_eq!(created["isWatching"], true);

    insert_resource_watch(&db, project_watcher_id, "PROJECT", project.id).await;
    let with_project_watcher = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/watchowner/projects/watchPublic/pull-requests/1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(with_project_watcher["watcherCount"], 2);
    let project_watcher_detail = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/watchowner/projects/watchPublic/pull-requests/1",
            Some(&project_watcher_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(project_watcher_detail["isWatching"], true);

    let commented = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/watchowner/projects/watchPublic/pull-requests/1/comments",
            Some(&commenter_cookie),
            Some(&commenter_csrf),
            json!({
                "contentsMarkdown": "Comment author watches by participation",
                "commitId": "topic-head"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(commented["watcherCount"], 3);

    let with_explicit_watcher = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/watchowner/projects/watchPublic/pull-requests/1/watch",
            Some(&explicit_watcher_cookie),
            Some(&explicit_watcher_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(with_explicit_watcher["watcherCount"], 4);
    assert_eq!(with_explicit_watcher["isWatching"], true);

    let after_unwatch = response_json(
        rest_json(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/owners/watchowner/projects/watchPublic/pull-requests/1/watch",
            Some(&project_watcher_cookie),
            Some(&project_watcher_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(after_unwatch["watcherCount"], 3);
    assert_eq!(after_unwatch["isWatching"], false);

    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "watchowner",
        "watchPrivate",
        "private",
    )
    .await;
    let private_project = repo
        .read_project_by_owner_and_name("watchowner", "watchPrivate")
        .await
        .unwrap()
        .expect("private project");
    seed_bare_repo_with_branches(&data_root, private_project.id);
    let private_created = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/watchowner/projects/watchPrivate/pull-requests",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "fromProjectId": private_project.id,
                "toProjectId": private_project.id,
                "fromBranch": "topic/pr",
                "toBranch": "main",
                "title": "Private watcher filtering",
                "bodyMarkdown": "Private watcher body"
            }),
        )
        .await,
    )
    .await;
    insert_resource_watch(
        &db,
        private_outsider_id,
        "PULL_REQUEST",
        private_created["id"].as_i64().unwrap(),
    )
    .await;
    let private_detail = response_json(
        rest_get(
            app,
            "/yona/api/v1/owners/watchowner/projects/watchPrivate/pull-requests/1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(private_detail["watcherCount"], 1);

    fs::remove_dir_all(data_root).unwrap();
}

#[tokio::test]
async fn pull_request_review_comment_allows_legacy_guest_nonmember_on_public_project() {
    let _yona_data_guard = lock_yona_data_tests().await;
    let data_root = temp_path("data");
    fs::create_dir_all(&data_root).unwrap();
    std::env::set_var("YONA_DATA", &data_root);
    clear_test_webhook_outbox();

    let (app, repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _owner_id) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _guest_id) = register_user(app.clone(), "guest").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("project");
    seed_bare_repo_with_branches(&data_root, project.id);
    let created = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "fromProjectId": project.id,
                "toProjectId": project.id,
                "fromBranch": "topic/pr",
                "toBranch": "main",
                "title": "Guest review comment target",
                "bodyMarkdown": "PR body",
                "attachmentIds": []
            }),
        )
        .await,
    )
    .await;
    assert_eq!(created["pullRequestNumber"], 1);
    let guest = repo
        .toggle_site_user_guest_mode("guest")
        .await
        .expect("toggle guest mode")
        .expect("guest exists");
    assert!(guest.is_guest);

    let commented = response_json(
        rest_json(
            app,
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/comments",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "contentsMarkdown": "Guest public PR review note"
            }),
        )
        .await,
    )
    .await;

    assert_eq!(commented["threads"][0]["authorLoginId"], "guest");
    assert_eq!(
        commented["threads"][0]["comments"][0]["contentsMarkdown"],
        "Guest public PR review note"
    );
    assert_eq!(
        commented["events"].as_array().unwrap().last().unwrap()["eventType"],
        "NEW_REVIEW_COMMENT"
    );

    fs::remove_dir_all(data_root).unwrap();
}

#[tokio::test]
async fn pull_request_create_rejects_legacy_project_guest_nonmember() {
    let _yona_data_guard = lock_yona_data_tests().await;
    let data_root = temp_path("guest-pr-create-data");
    fs::create_dir_all(&data_root).unwrap();
    std::env::set_var("YONA_DATA", &data_root);
    clear_test_webhook_outbox();

    let (app, repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _owner_id) = register_user(app.clone(), "owner").await;
    let (outsider_csrf, outsider_cookie, _outsider_id) =
        register_user(app.clone(), "outsider").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("project");
    seed_bare_repo_with_branches(&data_root, project.id);

    let form_options_forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/form-options?fromBranch=topic/pr&toBranch=main",
        Some(&outsider_cookie),
    )
    .await;
    assert_eq!(form_options_forbidden.status(), StatusCode::FORBIDDEN);

    let merge_result_forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/merge-result?fromBranch=topic/pr&toBranch=main",
        Some(&outsider_cookie),
    )
    .await;
    assert_eq!(merge_result_forbidden.status(), StatusCode::FORBIDDEN);

    let forbidden = rest_json(
        app,
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests",
        Some(&outsider_cookie),
        Some(&outsider_csrf),
        json!({
            "fromProjectId": project.id,
            "toProjectId": project.id,
            "fromBranch": "topic/pr",
            "toBranch": "main",
            "title": "Guest PR create",
            "bodyMarkdown": "PR body",
            "attachmentIds": []
        }),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    fs::remove_dir_all(data_root).unwrap();
}

#[tokio::test]
async fn pull_request_state_notifications_include_legacy_review_comment_watchers() {
    let _yona_data_guard = lock_yona_data_tests().await;
    let data_root = temp_path("notification-watchers-data");
    fs::create_dir_all(&data_root).unwrap();
    std::env::set_var("YONA_DATA", &data_root);
    clear_test_webhook_outbox();

    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "notifyowner").await;
    let (commenter_csrf, commenter_cookie, commenter_id) =
        register_user(app.clone(), "notifycommenter").await;
    let (_, mentioned_cookie, mentioned_id) = register_user(app.clone(), "notifymentioned").await;

    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "notifyowner",
        "notifyProject",
        "public",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("notifyowner", "notifyProject")
        .await
        .unwrap()
        .expect("project");
    seed_bare_repo_with_branches(&data_root, project.id);

    let created = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/notifyowner/projects/notifyProject/pull-requests",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "fromProjectId": project.id,
                "toProjectId": project.id,
                "fromBranch": "topic/pr",
                "toBranch": "main",
                "title": "Notification watcher parity",
                "bodyMarkdown": "Notification watcher body @notifymentioned"
            }),
        )
        .await,
    )
    .await;
    let pull_request_id = created["id"].as_i64().unwrap();
    assert_eq!(
        notification_receivers_for_event(&db, "NEW_PULL_REQUEST", "PULL_REQUEST", pull_request_id)
            .await,
        vec![mentioned_id]
    );
    let mentioned_notifications = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/notifications?from=0&size=5",
            Some(&mentioned_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(mentioned_notifications["total"], 1);
    assert_eq!(
        mentioned_notifications["items"][0]["eventType"],
        "NEW_PULL_REQUEST"
    );
    assert_eq!(
        mentioned_notifications["items"][0]["message"],
        "Notification watcher parity"
    );
    assert_eq!(mentioned_notifications["items"][0]["typeIcon"], "merge");

    response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/notifyowner/projects/notifyProject/pull-requests/1/comments",
            Some(&commenter_cookie),
            Some(&commenter_csrf),
            json!({
                "contentsMarkdown": "Comment author participates in PR watcher set",
                "commitId": "topic-head"
            }),
        )
        .await,
    )
    .await;

    response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/notifyowner/projects/notifyProject/pull-requests/1/close",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({}),
        )
        .await,
    )
    .await;

    assert_eq!(
        notification_receivers_for_event(
            &db,
            "PULL_REQUEST_STATE_CHANGED",
            "PULL_REQUEST",
            pull_request_id
        )
        .await,
        vec![commenter_id, mentioned_id]
    );

    let commenter_notifications = response_json(
        rest_get(
            app,
            "/yona/api/v1/notifications?from=0&size=5",
            Some(&commenter_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(commenter_notifications["total"], 1);
    assert_eq!(
        commenter_notifications["items"][0]["eventType"],
        "PULL_REQUEST_STATE_CHANGED"
    );
    assert_eq!(
        commenter_notifications["items"][0]["message"],
        "notification.pullrequest.closed"
    );
    assert_eq!(
        commenter_notifications["items"][0]["typeIcon"],
        "merge closed"
    );

    fs::remove_dir_all(data_root).unwrap();
}

#[tokio::test]
async fn pull_request_hangout_webhooks_persist_thread_names_for_followups() {
    let _yona_data_guard = lock_yona_data_tests().await;
    let data_root = temp_path("hangout-webhook-data");
    fs::create_dir_all(&data_root).unwrap();
    std::env::set_var("YONA_DATA", &data_root);
    clear_test_webhook_outbox();

    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "hangoutowner").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "hangoutowner",
        "hangoutProject",
        "public",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("hangoutowner", "hangoutProject")
        .await
        .unwrap()
        .expect("project");
    seed_bare_repo_with_branches(&data_root, project.id);

    let created_webhook = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/hangoutowner/projects/hangoutProject/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "payloadUrl": "https://hooks.example/pr-hangout",
                "secret": "",
                "webhookType": "DETAIL_HANGOUT_CHAT",
                "gitPush": false,
            }),
        )
        .await,
    )
    .await;
    let webhook_id = created_webhook["webhooks"][0]["id"]
        .as_i64()
        .expect("webhook id");

    queue_test_webhook_response(json!({
        "thread": {
            "name": "spaces/BBBB/threads/pr-1"
        }
    }));
    let created = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/hangoutowner/projects/hangoutProject/pull-requests",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "fromProjectId": project.id,
                "toProjectId": project.id,
                "fromBranch": "topic/pr",
                "toBranch": "main",
                "title": "Hangout PR thread",
                "bodyMarkdown": "Create PR body"
            }),
        )
        .await,
    )
    .await;
    let pull_request_id = created["id"].as_i64().expect("pull request id");
    let pull_request_id_text = pull_request_id.to_string();

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    assert_eq!(deliveries[0].webhook_type, "DETAIL_HANGOUT_CHAT");
    let created_payload: Value =
        serde_json::from_str(&deliveries[0].body).expect("created PR hangout payload");
    assert_eq!(created_payload["thread"], json!({}));

    let rows = webhook_thread::Entity::find()
        .all(&db)
        .await
        .expect("webhook thread rows");
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].webhook_id, Some(webhook_id));
    assert_eq!(rows[0].resource_type.as_deref(), Some("PULL_REQUEST"));
    assert_eq!(
        rows[0].resource_id.as_deref(),
        Some(pull_request_id_text.as_str())
    );
    assert_eq!(
        rows[0].thread_id.as_deref(),
        Some("spaces/BBBB/threads/pr-1")
    );

    response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/hangoutowner/projects/hangoutProject/pull-requests/1/comments",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "contentsMarkdown": "Hangout PR follow-up"
            }),
        )
        .await,
    )
    .await;

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 2);
    let commented_payload: Value =
        serde_json::from_str(&deliveries[1].body).expect("comment PR hangout payload");
    assert_eq!(
        commented_payload["thread"],
        json!({
            "name": "spaces/BBBB/threads/pr-1"
        })
    );
    assert_eq!(
        webhook_thread::Entity::find()
            .count(&db)
            .await
            .expect("webhook thread count"),
        1
    );

    fs::remove_dir_all(data_root).unwrap();
}

#[tokio::test]
async fn pull_request_interaction_surface_mutates_state_review_comments_threads_and_events() {
    let _yona_data_guard = lock_yona_data_tests().await;
    let data_root = temp_path("data");
    fs::create_dir_all(&data_root).unwrap();
    std::env::set_var("YONA_DATA", &data_root);
    clear_test_webhook_outbox();

    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (reviewer_csrf, reviewer_cookie, reviewer_id) =
        register_user(app.clone(), "reviewer").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("project");
    db.execute(Statement::from_string(
        db.get_database_backend(),
        format!(
            "UPDATE project SET default_reviewer_count = 1, is_using_reviewer_count = 1 WHERE id = {}",
            project.id
        ),
    ))
    .await
    .expect("set reviewer threshold");
    repo.add_project_membership(project.id, reviewer_id, "member")
        .await
        .unwrap();
    seed_bare_repo_with_branches(&data_root, project.id);
    response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "payloadUrl": "https://hooks.example/pr",
                "secret": "pr-secret",
                "webhookType": "SIMPLE",
                "gitPush": false,
            }),
        )
        .await,
    )
    .await;
    response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "payloadUrl": "https://hooks.example/json",
                "secret": "json-secret",
                "webhookType": "JSON",
                "gitPush": true,
            }),
        )
        .await,
    )
    .await;

    let form_options = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/form-options?fromBranch=topic/pr&toBranch=main",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(form_options["mode"], "create");
    assert_eq!(form_options["selected"]["fromProjectId"], project.id);
    assert!(form_options["fromBranches"]
        .as_array()
        .unwrap()
        .iter()
        .any(|branch| branch["name"] == "topic/pr" && branch["selected"] == true));
    assert!(form_options["toBranches"]
        .as_array()
        .unwrap()
        .iter()
        .any(|branch| branch["name"] == "main" && branch["selected"] == true));

    let merge_result = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/merge-result?fromBranch=topic/pr&toBranch=main",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(merge_result["conflict"], false);
    assert_eq!(merge_result["noHead"], false);
    assert!(merge_result["commits"]
        .as_array()
        .unwrap()
        .iter()
        .any(|commit| commit["commitMessage"] == "topic"));

    let invalid_create = rest_json(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({
            "fromProjectId": project.id,
            "toProjectId": project.id,
            "fromBranch": "",
            "toBranch": "main",
            "title": "",
            "bodyMarkdown": ""
        }),
    )
    .await;
    assert_eq!(invalid_create.status(), StatusCode::BAD_REQUEST);
    assert_eq!(snapshot_test_webhook_outbox().len(), 0);

    let created = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "fromProjectId": project.id,
                "toProjectId": project.id,
                "fromBranch": "topic/pr",
                "toBranch": "main",
                "title": "Interaction parity",
                "bodyMarkdown": "Create PR body",
                "attachmentIds": []
            }),
        )
        .await,
    )
    .await;
    assert_eq!(created["pullRequestNumber"], 1);
    assert_eq!(created["title"], "Interaction parity");
    assert_eq!(created["state"], "open");
    assert_eq!(created["requiredReviewerCount"], 1);
    assert_eq!(created["lackingReviewerCount"], 1);
    assert_eq!(created["reviewed"], false);
    assert_eq!(created["events"][0]["eventType"], "NEW_PULL_REQUEST");
    assert_eq!(created["contributor"]["userId"], owner_id);
    assert_eq!(created["receiver"]["userId"], owner_id);
    assert_eq!(
        count_rows(&db, "pull_request_event", "NEW_PULL_REQUEST").await,
        1
    );
    assert_eq!(
        count_rows(&db, "notification_event", "NEW_PULL_REQUEST").await,
        0
    );
    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    let created_delivery = &deliveries[0];
    assert_eq!(created_delivery.payload_url, "https://hooks.example/pr");
    assert_eq!(created_delivery.event_type, "NEW_PULL_REQUEST");
    assert_eq!(created_delivery.webhook_type, "SIMPLE");
    assert!(created_delivery
        .headers
        .iter()
        .any(|header| header.name == "Authorization" && header.value == "token pr-secret "));
    let created_payload: Value =
        serde_json::from_str(&created_delivery.body).expect("created PR webhook payload");
    let created_text = created_payload["text"].as_str().unwrap_or_default();
    assert!(created_text.contains("[projectYobi] owner"));
    assert!(created_text.contains("notification.type.new.pullrequest"));
    assert!(created_text.contains("/yona/owner/projectYobi/pullRequest/1|#1: Interaction parity"));
    let repo_path = data_root.join("repo").join(format!("{}.git", project.id));
    let base_commit_id = git_dir_output(&repo_path, &["rev-parse", "refs/heads/main"])
        .trim()
        .to_string();
    let head_commit_id = git_dir_output(&repo_path, &["rev-parse", "refs/heads/topic/pr"])
        .trim()
        .to_string();
    db.execute(Statement::from_sql_and_values(
        db.get_database_backend(),
        "UPDATE pull_request SET merged_commit_id_from = ?, merged_commit_id_to = ? WHERE id = ?",
        vec![
            base_commit_id.into(),
            head_commit_id.into(),
            created["id"].as_i64().unwrap().into(),
        ],
    ))
    .await
    .expect("seed PR diff endpoints");
    let all_changes = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/changes",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(all_changes["commits"][0]["state"], "CURRENT");
    let created_commit_id = all_changes["commits"][0]["commitId"]
        .as_str()
        .expect("created PR changes commit id")
        .to_string();
    let specific_change = response_json(
        rest_get(
            app.clone(),
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/changes?commitId={created_commit_id}"
            ),
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(specific_change["commits"][0]["state"], "CURRENT");
    assert!(specific_change["files"][0]["patch"]
        .as_str()
        .unwrap()
        .contains("+topic"));

    let duplicate = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "fromProjectId": project.id,
                "toProjectId": project.id,
                "fromBranch": "topic/pr",
                "toBranch": "main",
                "title": "Duplicate title",
                "bodyMarkdown": "Duplicate body"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(duplicate["id"], created["id"]);
    assert_eq!(
        count_rows(&db, "pull_request_event", "NEW_PULL_REQUEST").await,
        1
    );
    assert_eq!(snapshot_test_webhook_outbox().len(), 1);

    let edit_options = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/form-options",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(edit_options["mode"], "edit");
    assert_eq!(edit_options["pullRequest"]["title"], "Interaction parity");
    assert_eq!(edit_options["selected"]["fromBranch"], "topic/pr");

    let updated = response_json(
        rest_json(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "title": "Updated interaction parity",
                "bodyMarkdown": "Updated body @reviewer #1 owner/projectYobi#1 `<script>alert(1)</script> @reviewer #1`",
                "attachmentIds": []
            }),
        )
        .await,
    )
    .await;
    assert_eq!(updated["title"], "Updated interaction parity");
    assert_eq!(
        updated["bodyMarkdown"],
        "Updated body @reviewer #1 owner/projectYobi#1 `<script>alert(1)</script> @reviewer #1`"
    );
    assert_eq!(updated["bodyHtml"].as_str().unwrap_or(""), "");
    assert_eq!(updated["fromBranch"], "topic/pr");
    assert_eq!(updated["toBranch"], "main");

    let reviewed = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/review",
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert!(reviewed["reviewers"]
        .as_array()
        .unwrap()
        .iter()
        .any(|reviewer| reviewer["loginId"] == "reviewer"));
    assert_eq!(reviewed["requiredReviewerCount"], 1);
    assert_eq!(reviewed["lackingReviewerCount"], 0);
    assert_eq!(reviewed["reviewed"], true);
    assert_eq!(
        reviewed["events"].as_array().unwrap().last().unwrap()["eventType"],
        "PULL_REQUEST_REVIEW_STATE_CHANGED"
    );
    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 2);
    let reviewed_payload: Value =
        serde_json::from_str(&deliveries[1].body).expect("reviewed webhook payload");
    let reviewed_text = reviewed_payload["text"].as_str().unwrap_or_default();
    assert_eq!(
        deliveries[1].event_type,
        "PULL_REQUEST_REVIEW_STATE_CHANGED"
    );
    assert!(reviewed_text.contains("[projectYobi]"));
    assert!(reviewed_text.contains("notification.pullrequest.reviewed"));
    assert!(reviewed_text.contains("reviewer"));
    assert!(reviewed_text
        .contains("/yona/owner/projectYobi/pullRequest/1|#1: Updated interaction parity"));

    let unreviewed = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/unreview",
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert!(!unreviewed["reviewers"]
        .as_array()
        .unwrap()
        .iter()
        .any(|reviewer| reviewer["loginId"] == "reviewer"));
    assert_eq!(unreviewed["requiredReviewerCount"], 1);
    assert_eq!(unreviewed["lackingReviewerCount"], 1);
    assert_eq!(unreviewed["reviewed"], false);
    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 3);
    let unreviewed_payload: Value =
        serde_json::from_str(&deliveries[2].body).expect("unreviewed webhook payload");
    let unreviewed_text = unreviewed_payload["text"].as_str().unwrap_or_default();
    assert_eq!(
        deliveries[2].event_type,
        "PULL_REQUEST_REVIEW_STATE_CHANGED"
    );
    assert!(unreviewed_text.contains("notification.pullrequest.unreviewed"));
    assert!(unreviewed_text.contains("reviewer"));

    let commented = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/comments",
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({
                "contentsMarkdown": "Review comment body @reviewer #1 owner/projectYobi#1 `<script>alert(1)</script> @reviewer #1`",
                "commitId": "topic-head"
            }),
        )
        .await,
    )
    .await;
    let thread_id = commented["threads"][0]["id"].as_i64().unwrap();
    assert_eq!(
        commented["threads"][0]["comments"][0]["contentsMarkdown"],
        "Review comment body @reviewer #1 owner/projectYobi#1 `<script>alert(1)</script> @reviewer #1`"
    );
    assert_eq!(
        commented["threads"][0]["comments"][0]["contentsHtml"]
            .as_str()
            .unwrap_or(""),
        ""
    );
    assert_eq!(
        commented["events"].as_array().unwrap().last().unwrap()["eventType"],
        "NEW_REVIEW_COMMENT"
    );
    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 4);
    let commented_payload: Value =
        serde_json::from_str(&deliveries[3].body).expect("review comment webhook payload");
    let commented_text = commented_payload["text"].as_str().unwrap_or_default();
    assert_eq!(deliveries[3].event_type, "NEW_REVIEW_COMMENT");
    assert!(commented_text.contains("[projectYobi] reviewer"));
    assert!(commented_text.contains("notification.type.new.simple.comment"));
    assert!(commented_text.contains("/yona/owner/projectYobi/pullRequest/1#comment-"));
    assert!(commented_text.contains("|#1: Updated interaction parity"));

    let direct_close = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/yona/threads/{thread_id}/close"))
                .header(http::header::COOKIE, reviewer_cookie.as_str())
                .header("x-csrf-token", reviewer_csrf.as_str())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(direct_close.status(), StatusCode::OK);
    let directly_closed = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1",
            Some(&reviewer_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(directly_closed["threads"][0]["state"], "closed");

    let direct_open = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/yona/threads/{thread_id}/open"))
                .header(http::header::COOKIE, reviewer_cookie.as_str())
                .header("x-csrf-token", reviewer_csrf.as_str())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(direct_open.status(), StatusCode::OK);
    let directly_opened = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1",
            Some(&reviewer_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(directly_opened["threads"][0]["state"], "open");

    let review_export = rest_get(
        app.clone(),
        "/yona/owner/projectYobi/reviews?state=open&filter=Review+comment&format=xls",
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(review_export.status(), StatusCode::OK);
    assert_eq!(
        review_export
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("application/vnd.ms-excel; charset=utf-8")
    );
    assert_eq!(
        review_export
            .headers()
            .get(http::header::CONTENT_DISPOSITION)
            .and_then(|value| value.to_str().ok()),
        Some("attachment; filename=\"projectYobi-reviews.xls\"")
    );
    let review_export_body = review_export
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let review_export_text = String::from_utf8(review_export_body.to_vec()).unwrap();
    assert!(review_export_text.contains("Thread\tState\tAuthor\tPath"));
    assert!(review_export_text.contains("Review comment body"));
    assert!(review_export_text.contains("topic-head"));

    let ranged_commented = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/comments",
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({
                "contentsMarkdown": "Inline review body",
                "commitId": "topic-head",
                "prevCommitId": "base-head",
                "path": "src/lib.rs",
                "startSide": "A",
                "startLine": 2,
                "endSide": "A",
                "endLine": 4
            }),
        )
        .await,
    )
    .await;
    let ranged_thread = ranged_commented["threads"]
        .as_array()
        .unwrap()
        .iter()
        .find(|thread| thread["path"] == "src/lib.rs")
        .expect("ranged thread");
    assert_eq!(ranged_thread["commitId"], "topic-head");
    assert_eq!(ranged_thread["prevCommitId"], "base-head");
    assert_eq!(ranged_thread["startSide"], "A");
    assert_eq!(ranged_thread["startLine"], 2);
    assert_eq!(ranged_thread["endSide"], "A");
    assert_eq!(ranged_thread["endLine"], 4);
    assert_eq!(
        ranged_thread["comments"][0]["contentsMarkdown"],
        "Inline review body"
    );
    assert_eq!(ranged_thread["comments"][0]["canDelete"], true);
    assert_eq!(
        ranged_commented["events"]
            .as_array()
            .unwrap()
            .last()
            .unwrap()["eventType"],
        "NEW_REVIEW_COMMENT"
    );
    assert_eq!(
        count_rows(&db, "pull_request_event", "NEW_REVIEW_COMMENT").await,
        2
    );
    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 5);
    assert_eq!(deliveries[4].event_type, "NEW_REVIEW_COMMENT");

    let ranged_comment_id = ranged_thread["comments"][0]["id"].as_i64().unwrap();
    let forbidden_ranged_edit = rest_json(
        app.clone(),
        Method::PATCH,
        &format!(
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/comments/{ranged_comment_id}"
        ),
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "contentsMarkdown": "Forbidden inline edit"
        }),
    )
    .await;
    assert_eq!(forbidden_ranged_edit.status(), StatusCode::FORBIDDEN);

    let ranged_edited = response_json(
        rest_json(
            app.clone(),
            Method::PATCH,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/comments/{ranged_comment_id}"
            ),
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({
                "contentsMarkdown": "Edited inline review body @owner #1"
            }),
        )
        .await,
    )
    .await;
    let edited_thread = ranged_edited["threads"]
        .as_array()
        .unwrap()
        .iter()
        .find(|thread| thread["path"] == "src/lib.rs")
        .expect("edited ranged thread");
    assert_eq!(
        edited_thread["comments"][0]["contentsMarkdown"],
        "Edited inline review body @owner #1"
    );
    assert_eq!(
        edited_thread["comments"][0]["contentsHtml"]
            .as_str()
            .unwrap_or(""),
        ""
    );
    assert_eq!(
        count_rows(&db, "pull_request_event", "NEW_REVIEW_COMMENT").await,
        2
    );
    assert_eq!(snapshot_test_webhook_outbox().len(), 5);

    let forbidden_ranged_delete = rest_json(
        app.clone(),
        Method::DELETE,
        &format!(
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/comments/{ranged_comment_id}"
        ),
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({}),
    )
    .await;
    assert_eq!(forbidden_ranged_delete.status(), StatusCode::FORBIDDEN);

    let ranged_deleted = response_json(
        rest_json(
            app.clone(),
            Method::DELETE,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/comments/{ranged_comment_id}"
            ),
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert!(!ranged_deleted["threads"]
        .as_array()
        .unwrap()
        .iter()
        .any(|thread| thread["path"] == "src/lib.rs"));

    let closed_thread = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/threads/{thread_id}/close"
            ),
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(closed_thread["state"], "closed");
    let opened_thread = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/threads/{thread_id}/open"
            ),
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(opened_thread["state"], "open");

    let forbidden_close = rest_json(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/close",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({}),
    )
    .await;
    assert_eq!(forbidden_close.status(), StatusCode::FORBIDDEN);

    let closed = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/close",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(closed["state"], "closed");
    assert_eq!(
        closed["events"].as_array().unwrap().last().unwrap()["eventType"],
        "PULL_REQUEST_STATE_CHANGED"
    );

    let reopened = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/open",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(reopened["state"], "open");
    assert_eq!(
        count_rows(&db, "pull_request_event", "PULL_REQUEST_STATE_CHANGED").await,
        2
    );
    assert_eq!(
        count_rows(&db, "pull_request_event", "REVIEW_THREAD_STATE_CHANGED").await,
        4
    );
    assert_eq!(snapshot_test_webhook_outbox().len(), 5);

    let forbidden_accept = rest_json(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/accept",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({}),
    )
    .await;
    assert_eq!(forbidden_accept.status(), StatusCode::FORBIDDEN);

    let under_reviewed_accept = rest_json(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/accept",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({}),
    )
    .await;
    assert_eq!(under_reviewed_accept.status(), StatusCode::BAD_REQUEST);
    let under_reviewed_accept_text = response_text(under_reviewed_accept).await;
    assert!(
        under_reviewed_accept_text.contains("pullRequest.not.enough.review.point"),
        "{under_reviewed_accept_text}"
    );
    assert_eq!(
        count_rows(&db, "pull_request_event", "PULL_REQUEST_MERGED").await,
        0
    );
    assert_eq!(snapshot_test_webhook_outbox().len(), 5);

    let reviewed_for_merge = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/review",
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(reviewed_for_merge["reviewed"], true);
    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 6);
    assert_eq!(
        deliveries[5].event_type,
        "PULL_REQUEST_REVIEW_STATE_CHANGED"
    );

    let accepted = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/accept",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(accepted["state"], "merged");
    assert_eq!(accepted["conflict"], false);
    assert_ne!(accepted["mergedCommitIdFrom"], "");
    assert_ne!(accepted["mergedCommitIdTo"], "");
    assert_eq!(accepted["sourceBranchExists"], true);
    assert_eq!(accepted["permissions"]["canDeleteSourceBranch"], true);
    assert_eq!(accepted["permissions"]["canRestoreSourceBranch"], false);
    assert_eq!(
        accepted["events"].as_array().unwrap().last().unwrap()["eventType"],
        "PULL_REQUEST_MERGED"
    );
    assert_eq!(
        count_rows(&db, "pull_request_event", "PULL_REQUEST_MERGED").await,
        1
    );
    let repo_path = data_root.join("repo").join(format!("{}.git", project.id));
    let merged_head = git_dir_output(&repo_path, &["rev-parse", "refs/heads/main"])
        .trim()
        .to_string();
    assert_eq!(
        accepted["mergedCommitIdTo"].as_str().unwrap_or_default(),
        merged_head
    );
    assert_eq!(
        git_dir_output(&repo_path, &["show", "refs/heads/main:README.md"]),
        "topic\n"
    );
    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 7);
    assert_eq!(deliveries[6].event_type, "PULL_REQUEST_MERGED");
    let merged_payload: Value =
        serde_json::from_str(&deliveries[6].body).expect("merged webhook payload");
    let merged_text = merged_payload["text"].as_str().unwrap_or_default();
    assert!(merged_text.contains("pullRequest.event.message.merged"));
    assert!(merged_text
        .contains("/yona/owner/projectYobi/pullRequest/1|#1: Updated interaction parity"));

    let forbidden_delete_source_branch = rest_json(
        app.clone(),
        Method::DELETE,
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/source-branch",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({}),
    )
    .await;
    assert_eq!(
        forbidden_delete_source_branch.status(),
        StatusCode::FORBIDDEN
    );

    let deleted_source_branch = response_json(
        rest_json(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/source-branch",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(deleted_source_branch["state"], "merged");
    assert_eq!(deleted_source_branch["sourceBranchExists"], false);
    assert_eq!(
        deleted_source_branch["permissions"]["canDeleteSourceBranch"],
        false
    );
    assert_eq!(
        deleted_source_branch["permissions"]["canRestoreSourceBranch"],
        true
    );
    assert!(!git_dir_success(
        &repo_path,
        &["rev-parse", "--verify", "refs/heads/topic/pr"]
    ));
    assert_eq!(
        count_project_pushed_branch(&db, project.id, "topic/pr").await,
        0
    );
    assert_eq!(
        count_rows(&db, "pull_request_event", "PULL_REQUEST_MERGED").await,
        1
    );

    let restored_source_branch = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/source-branch",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(restored_source_branch["state"], "merged");
    assert_eq!(restored_source_branch["sourceBranchExists"], true);
    assert_eq!(
        restored_source_branch["permissions"]["canDeleteSourceBranch"],
        true
    );
    assert_eq!(
        restored_source_branch["permissions"]["canRestoreSourceBranch"],
        false
    );
    assert_eq!(
        git_dir_output(&repo_path, &["show", "refs/heads/topic/pr:README.md"]),
        "topic\n"
    );
    assert_eq!(
        count_project_pushed_branch(&db, project.id, "topic/pr").await,
        1
    );

    let direct_created = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "fromProjectId": project.id,
                "toProjectId": project.id,
                "fromBranch": "topic/direct",
                "toBranch": "main",
                "title": "Direct accept parity",
                "bodyMarkdown": "Direct accept body",
                "attachmentIds": []
            }),
        )
        .await,
    )
    .await;
    assert_eq!(direct_created["pullRequestNumber"], 2);
    let direct_reviewed = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/2/review",
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(direct_reviewed["reviewed"], true);
    let direct_accept = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/owner/projectYobi/pullRequest/2/accept")
                .header(http::header::COOKIE, owner_cookie.as_str())
                .header("x-csrf-token", owner_csrf.as_str())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(direct_accept.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        direct_accept.headers().get(http::header::LOCATION).unwrap(),
        "/yona/owner/projectYobi/pullRequest/2"
    );
    let direct_detail = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/2",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(direct_detail["state"], "merged");
    assert_eq!(
        git_dir_output(&repo_path, &["show", "refs/heads/main:DIRECT.md"]),
        "direct\n"
    );
    assert_eq!(
        count_rows(&db, "pull_request_event", "PULL_REQUEST_MERGED").await,
        2
    );
    assert_eq!(direct_detail["permissions"]["canDeleteSourceBranch"], true);
    let direct_delete_source_branch = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri("/yona/owner/projectYobi/pullRequest/2/deletefrombranch")
                .header(http::header::COOKIE, owner_cookie.as_str())
                .header("x-csrf-token", owner_csrf.as_str())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(direct_delete_source_branch.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        direct_delete_source_branch
            .headers()
            .get(http::header::LOCATION)
            .unwrap(),
        "/yona/owner/projectYobi/pullRequest/2"
    );
    assert!(!git_dir_success(
        &repo_path,
        &["rev-parse", "--verify", "refs/heads/topic/direct"]
    ));

    let direct_restore_source_branch = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/owner/projectYobi/pullRequest/2/restorefrombranch")
                .header(http::header::COOKIE, owner_cookie.as_str())
                .header("x-csrf-token", owner_csrf.as_str())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(direct_restore_source_branch.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        git_dir_output(&repo_path, &["show", "refs/heads/topic/direct:DIRECT.md"]),
        "direct\n"
    );

    let conflict_created = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "fromProjectId": project.id,
                "toProjectId": project.id,
                "fromBranch": "topic/conflict",
                "toBranch": "main",
                "title": "Conflict accept parity",
                "bodyMarkdown": "Conflict accept body",
                "attachmentIds": []
            }),
        )
        .await,
    )
    .await;
    assert_eq!(conflict_created["pullRequestNumber"], 3);
    let conflict_reviewed = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/3/review",
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(conflict_reviewed["reviewed"], true);
    let webhook_count_before_conflict_accept = snapshot_test_webhook_outbox().len();
    let conflict_accept = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/3/accept",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(conflict_accept["state"], "conflict");
    assert_eq!(conflict_accept["conflict"], true);
    assert_eq!(conflict_accept["permissions"]["canUpdateState"], true);
    assert_eq!(
        count_rows(&db, "pull_request_event", "PULL_REQUEST_MERGED").await,
        2
    );
    assert_eq!(
        snapshot_test_webhook_outbox().len(),
        webhook_count_before_conflict_accept
    );
    let repeated_conflict_accept = rest_json(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/3/accept",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({}),
    )
    .await;
    assert_eq!(repeated_conflict_accept.status(), StatusCode::BAD_REQUEST);

    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "emptyRepo",
        "public",
    )
    .await;
    let empty_form_options = rest_get(
        app,
        "/yona/api/v1/owners/owner/projects/emptyRepo/pull-requests/form-options",
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(empty_form_options.status(), StatusCode::BAD_REQUEST);

    fs::remove_dir_all(data_root).unwrap();
}
