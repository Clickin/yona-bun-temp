use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ConnectionTrait, Database, DatabaseConnection, Statement};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

async fn build_app_with_repository() -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());
    let app = create_router_with_app_repository(
        RuntimeConfig {
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

fn write_repo_file(repo_path: &Path, relative_path: &str, contents: &str) {
    let path = repo_path.join(relative_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, contents).unwrap();
}

fn clone_bare(work_path: &Path, repo_path: &Path) {
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
    fs::create_dir_all(repo_path.parent().unwrap()).unwrap();
    clone_bare(&work_path, &repo_path);
    fs::remove_dir_all(work_path).unwrap();
}

#[tokio::test]
async fn pull_request_interaction_surface_mutates_state_review_comments_threads_and_events() {
    let data_root = temp_path("data");
    fs::create_dir_all(&data_root).unwrap();
    std::env::set_var("YONA_DATA", &data_root);

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
    repo.add_project_membership(project.id, reviewer_id, "member")
        .await
        .unwrap();
    seed_bare_repo_with_branches(&data_root, project.id);

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
                "bodyMarkdown": "Updated body",
                "attachmentIds": []
            }),
        )
        .await,
    )
    .await;
    assert_eq!(updated["title"], "Updated interaction parity");
    assert_eq!(updated["bodyMarkdown"], "Updated body");
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
    assert_eq!(
        reviewed["events"].as_array().unwrap().last().unwrap()["eventType"],
        "PULL_REQUEST_REVIEW_STATE_CHANGED"
    );

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

    let commented = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/comments",
            Some(&reviewer_cookie),
            Some(&reviewer_csrf),
            json!({
                "contentsMarkdown": "Review comment body",
                "commitId": "topic-head"
            }),
        )
        .await,
    )
    .await;
    let thread_id = commented["threads"][0]["id"].as_i64().unwrap();
    assert_eq!(
        commented["threads"][0]["comments"][0]["contentsMarkdown"],
        "Review comment body"
    );
    assert_eq!(
        commented["events"].as_array().unwrap().last().unwrap()["eventType"],
        "NEW_REVIEW_COMMENT"
    );

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
        2
    );

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
