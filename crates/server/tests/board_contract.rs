use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::{Arc, Mutex, OnceLock};

use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, NotSet, QueryFilter,
    Set,
};
use serde_json::json;
use tempfile::tempdir;
use tokio::sync::Barrier;
use tower::ServiceExt;
use yoram_integrations::{clear_test_webhook_outbox, snapshot_test_webhook_outbox};
use yoram_migration::Migrator;
use yoram_persistence::{
    issue, mention, original_email, posting, project, AppRepository, CreateIssueInput,
    CreateOrganizationInput, CreatePostingInput, CreateProjectInput, IssueMutationInput,
    PostingMutationInput, ProjectTransferRequestInput,
};
use yoram_server::{
    create_router_with_app_repository, create_router_with_repository_and_app_config,
    AppRuntimeConfig, RuntimeConfig,
};

mod rest_test_support;

fn webhook_outbox_lock() -> &'static Mutex<()> {
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
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
    );

    (app, app_repo, db)
}

async fn build_app_with_data_root(
    data_root: &Path,
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
        AppRuntimeConfig {
            data_root: data_root.to_path_buf(),
            ..AppRuntimeConfig::default()
        },
    );

    (app, app_repo, db)
}

fn run_git_output(args: &[&str], cwd: Option<&Path>) -> String {
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
    String::from_utf8_lossy(&output.stdout).to_string()
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

async fn ok_json(response: Response<Body>) -> serde_json::Value {
    let status = response.status();
    let text = response_text(response).await;
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

async fn rest(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Option<serde_json::Value>,
) -> Response<Body> {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }
    let body = if let Some(payload) = payload {
        builder = builder.header(http::header::CONTENT_TYPE, "application/json");
        Body::from(payload.to_string())
    } else {
        Body::empty()
    };

    app.oneshot(builder.body(body).unwrap()).await.unwrap()
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String, i64) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let payload = ok_json(
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

async fn create_project(app: axum::Router, cookie: &str, csrf: &str) {
    ok_json(
        rpc(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "overview": "Board parity",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;
}

async fn create_label(app: axum::Router, cookie: &str, csrf: &str) -> String {
    let payload = ok_json(
        rest(
            app,
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels",
            Some(cookie),
            Some(csrf),
            Some(json!({
                "categoryName": "Type",
                "categoryIsExclusive": false,
                "labelColor": "#f44336",
                "labelName": "Guide"
            })),
        )
        .await,
    )
    .await;
    payload["label"]["id"].as_i64().unwrap().to_string()
}

fn mention_targets(payload: &serde_json::Value) -> Vec<(String, String, String, String)> {
    payload["mentionReferences"]
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
        .collect()
}

#[tokio::test]
async fn legacy_external_board_post_create_and_content_routes_follow_legacy_json_shape() {
    // Guards routes/boards/legacy_external.rs import/content/comment/label
    // handlers through the app-scoped service snapshot.
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    let created_response = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/posts",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "posts": [
                {
                    "body": "legacy board body",
                    "number": 77,
                    "title": "legacy board title"
                }
            ]
        })),
    )
    .await;
    assert_eq!(created_response.status(), StatusCode::CREATED);
    assert!(created_response
        .headers()
        .get(http::header::LOCATION)
        .is_none());
    let created_text = response_text(created_response).await;
    let created: serde_json::Value = serde_json::from_str(&created_text).expect("created json");
    assert_eq!(created[0]["status"], 201);
    assert_eq!(created[0]["location"], "/yona/owner/projectYobi/post/77");

    let comment_response = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/posts/77/comments",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "body": "legacy board comment"
        })),
    )
    .await;
    assert_eq!(comment_response.status(), StatusCode::CREATED);
    let comment_text = response_text(comment_response).await;
    let comment: serde_json::Value = serde_json::from_str(&comment_text).expect("comment json");
    assert_eq!(comment["status"], 201);
    assert!(comment["location"]
        .as_str()
        .is_some_and(|location| location.starts_with("/yona/owner/projectYobi/post/77#comment-")));

    let label_id = create_label(app.clone(), &owner_cookie, &owner_csrf).await;
    let label_update = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/posts/77/labels",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!([label_id])),
        )
        .await,
    )
    .await;
    assert_eq!(label_update["id"], "owner");
    assert_eq!(label_update["labels"], 1);

    let updated = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/owners/owner/projects/projectYobi/posts/77/content",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "content": "legacy board body updated",
                "original": "legacy board body"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["number"], 77);
    assert_eq!(updated["title"], "legacy board title");
    assert_eq!(updated["body"], "legacy board body updated");
    assert_eq!(updated["type"], "BOARD_POST");

    let rest_updated = ok_json(
        rest(
            app,
            Method::PATCH,
            "/yona/api/v1/projects/owner/projectYobi/posts/77/content",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "content": "rest board body updated",
                "original": "legacy board body updated"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(rest_updated["number"], 77);
    assert_eq!(rest_updated["title"], "legacy board title");
    assert_eq!(rest_updated["body"], "rest board body updated");
    assert_eq!(rest_updated["type"], "BOARD_POST");
}

#[tokio::test]
async fn board_post_create_dispatches_legacy_new_posting_webhooks() {
    // Guards legacy Webhook.sendRequestToPayloadUrl(NEW_POSTING, Posting) parity
    // through the app-scoped board route integration config snapshot.
    // Also guards board posting service snapshot use for runtime config DI.
    let _outbox_guard = webhook_outbox_lock().lock().unwrap();
    clear_test_webhook_outbox();
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/board",
                "secret": "board-secret",
                "webhookType": "SIMPLE",
                "gitPush": false
            })),
        )
        .await,
    )
    .await;
    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/push",
                "secret": "push-secret",
                "webhookType": "JSON",
                "gitPush": true
            })),
        )
        .await,
    )
    .await;

    let created = ok_json(
        rest(
            app,
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Board webhook parity",
                "bodyMarkdown": "Created from board webhook test"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(created["postNumber"], "1");

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    let delivery = &deliveries[0];
    assert_eq!(delivery.payload_url, "https://hooks.example/board");
    assert_eq!(delivery.event_type, "NEW_POSTING");
    assert_eq!(delivery.webhook_type, "SIMPLE");
    assert!(delivery
        .headers
        .iter()
        .any(|header| header.name == "Authorization" && header.value == "token board-secret "));
    let payload: serde_json::Value =
        serde_json::from_str(&delivery.body).expect("posting webhook payload");
    let text = payload["text"].as_str().unwrap_or_default();
    assert!(text.contains("[projectYobi] owner"));
    assert!(text.contains("notification.type.new.posting"));
    assert!(text.contains("/yona/owner/projectYobi/post/1|#1: Board webhook parity"));

    clear_test_webhook_outbox();
}

#[tokio::test]
async fn board_comment_create_and_update_dispatch_legacy_webhooks() {
    // Guards legacy Webhook.sendRequestToPayloadUrl(NEW_COMMENT/COMMENT_UPDATED, Comment)
    // parity for board posting comments through the board route service snapshot.
    let _outbox_guard = webhook_outbox_lock().lock().unwrap();
    clear_test_webhook_outbox();
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/board-comment",
                "secret": "comment-secret",
                "webhookType": "SIMPLE",
                "gitPush": false
            })),
        )
        .await,
    )
    .await;
    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/board-json",
                "secret": "json-secret",
                "webhookType": "JSON",
                "gitPush": true
            })),
        )
        .await,
    )
    .await;

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Board comment webhook parity",
                "bodyMarkdown": "Created before comment webhook test"
            })),
        )
        .await,
    )
    .await;
    clear_test_webhook_outbox();

    let commented = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts/1/comments",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "First board comment body"
            })),
        )
        .await,
    )
    .await;
    let comment_id = commented["comments"][0]["id"].as_str().unwrap();
    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    assert_eq!(deliveries[0].event_type, "NEW_COMMENT");
    assert_eq!(deliveries[0].webhook_type, "SIMPLE");
    let payload: serde_json::Value =
        serde_json::from_str(&deliveries[0].body).expect("comment webhook payload");
    let text = payload["text"].as_str().unwrap_or_default();
    assert!(text.contains("notification.type.new.comment"));
    assert!(text.contains(&format!(
        "/yona/owner/projectYobi/post/1#comment-{comment_id}|#1: Board comment webhook parity"
    )));
    clear_test_webhook_outbox();

    ok_json(
        rest(
            app,
            Method::PATCH,
            &format!("/yona/api/v1/projects/owner/projectYobi/posts/1/comments/{comment_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "Updated board comment body"
            })),
        )
        .await,
    )
    .await;
    let updated_deliveries = snapshot_test_webhook_outbox();
    assert_eq!(updated_deliveries.len(), 1);
    assert_eq!(updated_deliveries[0].event_type, "COMMENT_UPDATED");
    let updated_payload: serde_json::Value =
        serde_json::from_str(&updated_deliveries[0].body).expect("comment update webhook payload");
    let updated_text = updated_payload["text"].as_str().unwrap_or_default();
    assert!(updated_text.contains("notification.type.comment.updated"));
    assert!(updated_text.contains(&format!(
        "/yona/owner/projectYobi/post/1#comment-{comment_id}|#1: Board comment webhook parity"
    )));

    clear_test_webhook_outbox();
}

#[tokio::test]
// Guards the board route-module body DTO and adapter split for README/online-commit posting.
async fn board_readme_posting_commits_git_readme_file() {
    let data_dir = tempdir().expect("yona data");

    let (app, _, _) = build_app_with_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    let repo_path = data_dir
        .path()
        .join("repo")
        .join("git")
        .join("owner")
        .join("projectYobi.git");
    assert!(fs::metadata(&repo_path).unwrap().is_dir());

    let created = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Project README",
                "bodyMarkdown": "# Git README\nCreated from board",
                "readme": true
            })),
        )
        .await,
    )
    .await;
    assert_eq!(created["title"], "Project README");
    assert_eq!(created["readme"], true);
    assert_eq!(
        run_git_output(
            &[
                "--git-dir",
                repo_path.to_str().unwrap(),
                "show",
                "HEAD:README.md"
            ],
            None
        ),
        "# Git README\nCreated from board"
    );

    let updated = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Updated README",
                "bodyMarkdown": "Updated Git README",
                "readme": true
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["readme"], true);
    assert_eq!(
        run_git_output(
            &[
                "--git-dir",
                repo_path.to_str().unwrap(),
                "show",
                "HEAD:README.md"
            ],
            None
        ),
        "Updated Git README"
    );

    let readme_form_options = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/form-options?readme=true",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(readme_form_options["readme"], true);
    assert_eq!(readme_form_options["onlineCommit"]["path"], "");
    assert_eq!(
        readme_form_options["onlineCommit"]["title"],
        "Update README.md"
    );
    assert_eq!(
        readme_form_options["onlineCommit"]["preparedBodyMarkdown"],
        "Updated Git README"
    );

    assert_eq!(
        run_git_output(
            &[
                "--git-dir",
                repo_path.to_str().unwrap(),
                "rev-list",
                "--count",
                "HEAD"
            ],
            None
        )
        .trim(),
        "2"
    );

    let container = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/container",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(container["readmeFile"]["name"], "README.md");
    assert_eq!(
        container["readmeFile"]["bodyMarkdown"],
        "Updated Git README"
    );
}

#[tokio::test]
async fn board_postform_online_commit_updates_issue_template_and_code_files() {
    let data_dir = tempdir().expect("yona data");

    let (app, repo, _) = build_app_with_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    let repo_path = data_dir
        .path()
        .join("repo")
        .join("git")
        .join(&project.owner_name)
        .join(format!("{}.git", project.project_name));
    assert!(fs::metadata(&repo_path).unwrap().is_dir());

    let issue_template_options = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/form-options?issueTemplate=true",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(issue_template_options["canAttachFiles"], false);
    assert_eq!(
        issue_template_options["onlineCommit"]["issueTemplate"],
        true
    );
    assert_eq!(
        issue_template_options["onlineCommit"]["path"],
        "ISSUE_TEMPLATE.md"
    );
    assert_eq!(
        issue_template_options["onlineCommit"]["title"],
        "ISSUE_TEMPLATE.md: Project Issue Template"
    );

    let issue_template_commit = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "ISSUE_TEMPLATE.md: Project Issue Template",
                "bodyMarkdown": "## Please describe\n",
                "issueTemplate": true
            })),
        )
        .await,
    )
    .await;
    assert_eq!(issue_template_commit["onlineCommit"], true);
    let default_branch = issue_template_commit["branch"].as_str().unwrap();
    assert_eq!(issue_template_commit["path"], "ISSUE_TEMPLATE.md");
    assert_eq!(
        run_git_output(
            &[
                "--git-dir",
                repo_path.to_str().unwrap(),
                "show",
                "HEAD:ISSUE_TEMPLATE.md"
            ],
            None
        ),
        "## Please describe\n"
    );

    let new_file_commit = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Add docs guide",
                "bodyMarkdown": "# Guide\n",
                "branch": default_branch,
                "path": "docs",
                "newFileName": "guide.md"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(new_file_commit["onlineCommit"], true);
    assert_eq!(new_file_commit["path"], "docs/guide.md");
    assert_eq!(
        run_git_output(
            &[
                "--git-dir",
                repo_path.to_str().unwrap(),
                "show",
                "HEAD:docs/guide.md"
            ],
            None
        ),
        "# Guide\n"
    );

    let edit_options = ok_json(
        rest(
            app.clone(),
            Method::GET,
            &format!("/yona/api/v1/projects/owner/projectYobi/posts/form-options?branch={default_branch}&path=docs%2Fguide.md&edit=true"),
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(edit_options["onlineCommit"]["edit"], true);
    assert_eq!(
        edit_options["onlineCommit"]["preparedBodyMarkdown"],
        "# Guide\n"
    );

    let edited_file_commit = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Update docs guide",
                "bodyMarkdown": "# Updated Guide\n",
                "branch": default_branch,
                "edit": true,
                "path": "docs/guide.md"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(edited_file_commit["onlineCommit"], true);
    assert_eq!(edited_file_commit["path"], "docs/guide.md");
    assert_eq!(
        run_git_output(
            &[
                "--git-dir",
                repo_path.to_str().unwrap(),
                "show",
                "HEAD:docs/guide.md"
            ],
            None
        ),
        "# Updated Guide\n"
    );

    let list = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(list["totalCount"], 0);
}

#[tokio::test]
// Guards the board route query parser boundary, shared label mapper, body adapter,
// direct comment helper split, and app-scoped service snapshot access without dummy base-path fragments.
async fn board_contract_manages_project_posts_comments_watch_and_notifications() {
    let data_dir = tempdir().expect("yona data");
    let (app, repository, db) = build_app_with_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    repository
        .toggle_site_user_guest_mode("guest")
        .await
        .expect("mark board watch actor as guest");
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let label_id = create_label(app.clone(), &owner_cookie, &owner_csrf).await;
    let linked_issue = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Board linked issue",
                "bodyMarkdown": "issue target"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(linked_issue["issueNumber"], 1);

    let form_options = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/form-options",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(form_options["canMarkNotice"], true);
    assert_eq!(form_options["canMarkReadme"], true);
    assert_eq!(form_options["canAttachFiles"], true);
    assert_eq!(form_options["defaultPermissions"]["canCreate"], true);
    assert_eq!(form_options["labels"].as_array().unwrap().len(), 1);
    assert_eq!(form_options["labels"][0]["name"], "Guide");

    let readme = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Project README",
                "bodyMarkdown": "# README\n@guest should link, @nforge @nforge/yobi should not #1 owner/projectYobi#1",
                "labelIds": [label_id],
                "readme": true
            })),
        )
        .await,
    )
    .await;
    assert_eq!(readme["postNumber"], "1");
    assert_eq!(readme["title"], "Project README");
    assert_eq!(readme["readme"], true);
    assert_eq!(readme["isWatching"], true);
    assert_eq!(readme["bodyHtml"], "");
    assert_eq!(
        readme["bodyMarkdown"],
        "# README\n@guest should link, @nforge @nforge/yobi should not #1 owner/projectYobi#1"
    );

    let notice = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Pinned notice",
                "bodyMarkdown": "Pinned board post",
                "notice": true
            })),
        )
        .await,
    )
    .await;
    assert_eq!(notice["postNumber"], "2");
    assert_eq!(notice["notice"], true);

    let normal = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Daily discussion",
                "bodyMarkdown": "A normal board post"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(normal["postNumber"], "3");
    assert!(normal["labels"].as_array().unwrap().is_empty());

    let relabeled_normal = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/projects/owner/projectYobi/posts/3/labels",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "labelIds": [label_id]
            })),
        )
        .await,
    )
    .await;
    assert_eq!(relabeled_normal["postNumber"], "3");
    assert_eq!(relabeled_normal["labels"][0]["name"], "Guide");

    let list = ok_json(
        rest(
            app.clone(),
            Method::GET,
            &format!("/yona/api/v1/projects/owner/projectYobi/posts?filter=readme&labelIds={label_id}&pageNum=1"),
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(list["pageNum"], 1);
    assert_eq!(list["pageSize"], 15);
    assert_eq!(list["totalCount"], 1);
    assert_eq!(list["items"].as_array().unwrap().len(), 1);
    assert_eq!(list["items"][0]["postNumber"], "1");
    assert_eq!(list["items"][0]["projectName"], "projectYobi");
    assert_eq!(list["items"][0]["title"], "Project README");
    assert!(list["items"][0]["authorAvatarUrl"]
        .as_str()
        .unwrap_or_default()
        .contains("gravatar"));
    assert_eq!(list["items"][0]["labels"][0]["name"], "Guide");
    assert_eq!(list["notices"].as_array().unwrap().len(), 1);
    assert_eq!(list["notices"][0]["postNumber"], "2");
    assert_eq!(list["notices"][0]["title"], "Pinned notice");
    assert_eq!(list["readme"]["postNumber"], "1");
    assert_eq!(
        list["readme"]["bodyMarkdown"],
        "# README\n@guest should link, @nforge @nforge/yobi should not #1 owner/projectYobi#1"
    );

    let detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(detail["title"], "Project README");
    assert_eq!(detail["postNumber"], "1");
    assert_eq!(detail["permissions"]["canRead"], true);
    assert_eq!(detail["permissions"]["canCreate"], true);
    assert_eq!(detail["permissions"]["canUpdate"], true);
    assert_eq!(detail["permissions"]["canDelete"], true);
    assert_eq!(detail["permissions"]["canComment"], true);
    assert_eq!(detail["permissions"]["canSetNotice"], true);
    assert_eq!(detail["permissions"]["canWatch"], true);
    assert_eq!(detail["watcherCount"], 1);
    let detail_mentions = mention_targets(&detail);
    assert!(detail_mentions.contains(&(
        "user".to_string(),
        "guest".to_string(),
        String::new(),
        String::new()
    )));
    assert!(!detail_mentions
        .iter()
        .any(|(_, login_id, owner_name, project_name)| {
            login_id == "nforge" || owner_name == "nforge" || project_name == "yobi"
        }));

    let commented = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts/1/comments",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "First **comment** @owner/projectYobi @nforge #1"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(commented["commentCount"], 1);
    assert_eq!(commented["comments"].as_array().unwrap().len(), 1);
    assert_eq!(commented["comments"][0]["contentsHtml"], "");
    assert_eq!(
        commented["comments"][0]["contentsMarkdown"],
        "First **comment** @owner/projectYobi @nforge #1"
    );
    for timestamp in [
        &list["items"][0]["createdAt"],
        &list["notices"][0]["createdAt"],
        &detail["createdAt"],
        &commented["comments"][0]["createdAt"],
    ] {
        chrono::DateTime::parse_from_rfc3339(timestamp.as_str().expect("board timestamp"))
            .expect("board timestamps preserve time and timezone for legacy relative dates");
    }
    assert_eq!(list["items"][0]["createdAt"], detail["createdAt"]);
    let comment_mentions = mention_targets(&commented["comments"][0]);
    assert!(comment_mentions.contains(&(
        "project".to_string(),
        String::new(),
        "owner".to_string(),
        "projectYobi".to_string()
    )));
    assert!(!comment_mentions
        .iter()
        .any(|(_, login_id, _, _)| login_id == "nforge"));

    let comment_id = commented["comments"][0]["id"].as_str().unwrap();
    let child_commented = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts/1/comments",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "Child board comment",
                "parentCommentId": comment_id.parse::<i64>().unwrap()
            })),
        )
        .await,
    )
    .await;
    assert_eq!(child_commented["commentCount"], 2);
    let child_comment = child_commented["comments"]
        .as_array()
        .unwrap()
        .iter()
        .find(|comment| comment["contentsMarkdown"] == "Child board comment")
        .expect("child comment");
    assert_eq!(child_comment["parentCommentId"], comment_id);
    let child_comment_id = child_comment["id"].as_str().unwrap();
    let child_deleted = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/projects/owner/projectYobi/posts/1/comments/{child_comment_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(child_deleted["commentCount"], 1);
    original_email::ActiveModel {
        id: NotSet,
        message_id: Set(Some("<board-comment-1@example.com>".to_string())),
        resource_type: Set(Some("NONISSUE_COMMENT".to_string())),
        resource_id: Set(Some(comment_id.to_string())),
        handled_date: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    let via_email_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(via_email_detail["comments"][0]["viaEmail"], true);

    let edited_comment = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!("/yona/api/v1/projects/owner/projectYobi/posts/1/comments/{comment_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "Edited comment",
                "original": "First **comment** @owner/projectYobi @nforge #1"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        edited_comment["comments"][0]["contentsMarkdown"],
        "Edited comment"
    );
    let stale_comment = rest(
        app.clone(),
        Method::PATCH,
        &format!("/yona/api/v1/projects/owner/projectYobi/posts/1/comments/{comment_id}"),
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "contentsMarkdown": "Stale overwrite",
            "original": "First **comment** @owner/projectYobi @nforge #1"
        })),
    )
    .await;
    assert_eq!(stale_comment.status(), StatusCode::CONFLICT);
    let persisted = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        persisted["comments"][0]["contentsMarkdown"],
        "Edited comment"
    );

    let direct_edited_comment = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "/yona/owner/projectYobi/post/1/comment/{comment_id}"
                ))
                .header(http::header::COOKIE, &owner_cookie)
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from(format!(
                    "csrfToken={owner_csrf}&id={comment_id}&contents=Legacy+board+comment+edit"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(direct_edited_comment.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        direct_edited_comment
            .headers()
            .get(http::header::LOCATION)
            .unwrap()
            .to_str()
            .unwrap(),
        format!("/yona/owner/projectYobi/post/1#comment-{comment_id}")
    );
    let direct_edited_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        direct_edited_detail["comments"][0]["contentsMarkdown"],
        "Legacy board comment edit"
    );

    let guest_watch_forbidden = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/projects/owner/projectYobi/posts/1/watch",
        Some(&guest_cookie),
        Some(&guest_csrf),
        None,
    )
    .await;
    assert_eq!(guest_watch_forbidden.status(), StatusCode::FORBIDDEN);

    let unwatched = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/projects/owner/projectYobi/posts/1/watch",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(unwatched["isWatching"], false);
    assert_eq!(unwatched["watcherCount"], 0);

    let watched = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts/1/watch",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(watched["isWatching"], true);
    assert_eq!(watched["watcherCount"], 1);

    let updated = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Updated README",
                "bodyMarkdown": "Updated body",
                "labelIds": []
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["title"], "Updated README");
    assert_eq!(updated["bodyMarkdown"], "Updated body");
    assert_eq!(
        updated["historyMarkdown"],
        "# README\n@guest should link, @nforge @nforge/yobi should not #1 owner/projectYobi#1"
    );
    assert_eq!(updated["historyHtml"].as_str().unwrap_or(""), "");

    let deleted_comment = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/projects/owner/projectYobi/posts/1/comments/{comment_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted_comment["commentCount"], 0);
    assert_eq!(deleted_comment["isWatching"], true);
    assert_eq!(deleted_comment["watcherCount"], 1);

    let direct_created_comment = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/owner/projectYobi/post/1/comment")
                .header(http::header::COOKIE, &owner_cookie)
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from(format!(
                    "csrfToken={owner_csrf}&contentsMarkdown=Legacy+board+comment+create"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(direct_created_comment.status(), StatusCode::SEE_OTHER);
    let direct_created_location = direct_created_comment
        .headers()
        .get(http::header::LOCATION)
        .unwrap()
        .to_str()
        .unwrap();
    assert!(direct_created_location.starts_with("/yona/owner/projectYobi/post/1#comment-"));
    let direct_created_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    let direct_comment_id = direct_created_detail["comments"]
        .as_array()
        .unwrap()
        .iter()
        .find(|comment| comment["contentsMarkdown"] == "Legacy board comment create")
        .and_then(|comment| comment["id"].as_str())
        .expect("direct legacy board comment id")
        .to_string();
    let direct_deleted_comment = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!(
                    "/yona/owner/projectYobi/post/1/comment/{direct_comment_id}/delete"
                ))
                .header(http::header::COOKIE, &owner_cookie)
                .header("x-csrf-token", &owner_csrf)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(direct_deleted_comment.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        direct_deleted_comment
            .headers()
            .get(http::header::LOCATION)
            .unwrap()
            .to_str()
            .unwrap(),
        "/yona/owner/projectYobi/post/1"
    );
    let direct_deleted_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert!(direct_deleted_detail["comments"]
        .as_array()
        .unwrap()
        .iter()
        .all(|comment| comment["id"] != direct_comment_id));

    let deleted = rest(
        app.clone(),
        Method::DELETE,
        "/yona/api/v1/projects/owner/projectYobi/posts/3",
        Some(&owner_cookie),
        Some(&owner_csrf),
        None,
    )
    .await;
    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);

    let notifications = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/notifications?from=0&size=5",
            Some(&guest_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(notifications["total"], 1);
    assert_eq!(notifications["items"][0]["eventType"], "NEW_POSTING");
    assert_eq!(
        notifications["items"][0]["message"],
        "# README\n@guest should link, @nforge @nforge/yobi should not #1 owner/projectYobi#1"
    );
    assert_eq!(notifications["items"][0]["typeIcon"], "edit2");
    assert_eq!(
        notifications["items"][0]["targetHref"],
        "/yona/owner/projectYobi/post/1"
    );
    assert_eq!(notifications["items"][0]["targetTitle"], "Updated README");
}

#[tokio::test]
async fn board_update_notification_mail_preserves_author_rules_and_mentions() {
    let (app, repository, db) = build_app_with_repository().await;
    let (author_csrf, author_cookie, author_id) = register_user(app.clone(), "owner").await;
    let (editor_csrf, editor_cookie, editor_id) = register_user(app.clone(), "editor").await;
    let (_, _, recipient_id) = register_user(app.clone(), "recipient").await;
    let (_, _, previous_id) = register_user(app.clone(), "previous").await;
    create_project(app.clone(), &author_cookie, &author_csrf).await;
    let project = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    repository
        .add_project_membership(project.id, editor_id, "manager")
        .await
        .unwrap();
    let created = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&author_cookie),
            Some(&author_csrf),
            Some(json!({ "title": "Notification rules", "bodyMarkdown": "@previous" })),
        )
        .await,
    )
    .await;
    let posting_id: i64 = created["id"].as_str().unwrap().parse().unwrap();
    repository
        .watch_posting(posting_id, recipient_id)
        .await
        .unwrap();
    let due =
        sea_orm::prelude::DateTime::parse_from_str("2099-01-01 00:00:00", "%Y-%m-%d %H:%M:%S")
            .unwrap();
    repository
        .drain_due_notification_mail_deliveries(due, 0)
        .await
        .unwrap();

    for (cookie, csrf, selected, body, expected_mentions, expected_recipients) in [
        (
            &author_cookie,
            &author_csrf,
            false,
            "Silent edit @recipient",
            vec![recipient_id],
            vec![],
        ),
        (
            &author_cookie,
            &author_csrf,
            true,
            "Notified edit @recipient @previous",
            vec![recipient_id, previous_id],
            vec!["previous", "recipient"],
        ),
        (
            &editor_cookie,
            &editor_csrf,
            false,
            "Manager edit @recipient",
            vec![recipient_id],
            vec!["owner", "recipient"],
        ),
    ] {
        let updated = ok_json(
            rest(
                app.clone(),
                Method::PATCH,
                "/yona/api/v1/projects/owner/projectYobi/posts/1",
                Some(cookie),
                Some(csrf),
                Some(json!({
                    "title": "Notification rules",
                    "bodyMarkdown": body,
                    "notificationMail": selected,
                })),
            )
            .await,
        )
        .await;
        assert_eq!(updated["bodyMarkdown"], body);
        let persisted = repository
            .read_posting_detail_for_viewer("owner", "projectYobi", 1, Some(author_id))
            .await
            .unwrap()
            .unwrap();
        assert_eq!(persisted.body_markdown, body);
        let mentioned = mention::Entity::find()
            .filter(mention::Column::ResourceType.eq("posting"))
            .filter(mention::Column::ResourceId.eq(posting_id.to_string()))
            .all(&db)
            .await
            .unwrap()
            .into_iter()
            .filter_map(|row| row.user_id)
            .collect::<HashSet<_>>();
        assert_eq!(mentioned, expected_mentions.into_iter().collect(), "{body}");
        let deliveries = repository
            .drain_due_notification_mail_deliveries(due, 0)
            .await
            .unwrap();
        let mut recipients = deliveries
            .iter()
            .map(|delivery| delivery.recipient_login_id.as_str())
            .collect::<Vec<_>>();
        recipients.sort_unstable();
        assert_eq!(recipients, expected_recipients, "{body}");
        assert!(deliveries
            .iter()
            .all(|delivery| delivery.item.event_type == "POSTING_BODY_CHANGED"));
    }
}

#[tokio::test]
async fn board_contract_preserves_legacy_acl_for_project_group_and_public_users() {
    // Guards route-utils-owned project resource create authorization for board routes.
    let data_dir = tempdir().expect("yona data");
    let (app, repo, _) = build_app_with_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    let (public_csrf, public_cookie, public_id) = register_user(app.clone(), "public").await;
    let (org_member_csrf, org_member_cookie, org_member_id) =
        register_user(app.clone(), "orgmember").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    repo.add_project_membership(project.id, member_id, "member")
        .await
        .unwrap();

    let owner_post = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Owner post",
                "bodyMarkdown": "owner body"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(owner_post["postNumber"], "1");

    let member_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&member_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(member_detail["permissions"]["canUpdate"], true);
    assert_eq!(member_detail["permissions"]["canDelete"], true);
    assert_eq!(member_detail["permissions"]["canSetNotice"], true);
    assert_eq!(member_detail["permissions"]["canComment"], true);
    assert_eq!(member_detail["permissions"]["canWatch"], true);

    let member_updated = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&member_cookie),
            Some(&member_csrf),
            Some(json!({
                "title": "Member edited notice",
                "bodyMarkdown": "member body",
                "notice": true
            })),
        )
        .await,
    )
    .await;
    assert_eq!(member_updated["notice"], true);

    let public_post = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&public_cookie),
            Some(&public_csrf),
            Some(json!({
                "title": "Public user post",
                "bodyMarkdown": "public body"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(public_post["postNumber"], "2");

    let public_notice = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/projects/owner/projectYobi/posts",
        Some(&public_cookie),
        Some(&public_csrf),
        Some(json!({
            "title": "Forbidden notice",
            "bodyMarkdown": "public body",
            "notice": true
        })),
    )
    .await;
    assert_eq!(public_notice.status(), StatusCode::FORBIDDEN);

    let public_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            Some(&public_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(public_detail["permissions"]["canUpdate"], false);
    assert_eq!(public_detail["permissions"]["canDelete"], false);
    assert_eq!(public_detail["permissions"]["canSetNotice"], false);
    assert_eq!(public_detail["permissions"]["canComment"], true);
    assert_eq!(public_detail["permissions"]["canWatch"], true);

    let anonymous_detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/posts/1",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous_detail["permissions"]["canRead"], true);
    assert_eq!(anonymous_detail["permissions"]["canComment"], false);
    assert_eq!(anonymous_detail["permissions"]["canWatch"], false);
    let anonymous_comment = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/projects/owner/projectYobi/posts/1/comments",
        None,
        None,
        Some(json!({
            "contentsMarkdown": "anonymous comment"
        })),
    )
    .await;
    assert_eq!(anonymous_comment.status(), StatusCode::UNAUTHORIZED);

    let organization = repo
        .create_organization(CreateOrganizationInput {
            description: None,
            organization_name: "weblabs".to_string(),
        })
        .await
        .unwrap();
    repo.add_organization_membership(organization.id, owner_id, "org_admin")
        .await
        .unwrap();
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();
    let protected_project = repo
        .create_project(CreateProjectInput {
            organization_id: Some(organization.id),
            owner_name: "weblabs".to_string(),
            overview: None,
            project_name: "protectedBoard".to_string(),
            project_scope: "protected".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .unwrap();
    assert_eq!(protected_project.owner_name, "weblabs");

    let protected_post = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/weblabs/protectedBoard/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Protected board post",
                "bodyMarkdown": "protected body"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(protected_post["postNumber"], "1");

    let group_updated = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/projects/weblabs/protectedBoard/posts/1",
            Some(&org_member_cookie),
            Some(&org_member_csrf),
            Some(json!({
                "title": "Group member update",
                "bodyMarkdown": "updated by org member"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(group_updated["title"], "Group member update");

    let group_delete = rest(
        app,
        Method::DELETE,
        "/yona/api/v1/projects/weblabs/protectedBoard/posts/1",
        Some(&org_member_cookie),
        Some(&org_member_csrf),
        None,
    )
    .await;
    assert_eq!(group_delete.status(), StatusCode::FORBIDDEN);
    assert_ne!(public_id, org_member_id);
}

#[tokio::test]
async fn board_contract_allocates_unique_resource_numbers_under_concurrent_create() {
    let data_dir = tempdir().expect("yona data");
    let (app, repo, _) = build_app_with_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let task_count = 24;
    let barrier = Arc::new(Barrier::new(task_count));
    let mut tasks = Vec::new();

    for index in 0..task_count {
        let repo = repo.clone();
        let barrier = barrier.clone();
        tasks.push(tokio::spawn(async move {
            barrier.wait().await;
            let posting = repo
                .create_posting(CreatePostingInput {
                    actor_display_name: "owner".to_string(),
                    actor_id: owner_id,
                    actor_login_id: "owner".to_string(),
                    owner_name: "owner".to_string(),
                    project_name: "projectYobi".to_string(),
                    values: PostingMutationInput {
                        attachment_ids: vec![],
                        body_markdown: format!("body {index}"),
                        label_ids: vec![],
                        notice: false,
                        readme: false,
                        title: format!("post {index}"),
                    },
                })
                .await
                .unwrap()
                .unwrap();
            let issue = repo
                .create_issue(CreateIssueInput {
                    actor_display_name: "owner".to_string(),
                    actor_id: owner_id,
                    actor_login_id: "owner".to_string(),
                    owner_name: "owner".to_string(),
                    project_name: "projectYobi".to_string(),
                    values: IssueMutationInput {
                        assignee_login_id: None,
                        attachment_ids: vec![],
                        body_markdown: format!("body {index}"),
                        due_date: None,
                        is_draft: false,
                        is_publish: false,
                        label_ids: vec![],
                        milestone_id: None,
                        parent_issue_id: None,
                        title: format!("issue {index}"),
                    },
                })
                .await
                .unwrap()
                .unwrap();
            (posting.post_number, issue.issue_number)
        }));
    }

    let mut post_numbers = Vec::new();
    let mut issue_numbers = Vec::new();
    for task in tasks {
        let (post_number, issue_number) = task.await.unwrap();
        post_numbers.push(post_number);
        issue_numbers.push(issue_number);
    }

    for (resource, field, numbers) in [
        ("posts", "postNumber", post_numbers),
        ("issues", "issueNumber", issue_numbers),
    ] {
        let unique_numbers: HashSet<i64> = numbers.iter().copied().collect();
        assert_eq!(unique_numbers.len(), task_count);
        assert_eq!(numbers.iter().min().copied(), Some(1));
        assert_eq!(numbers.iter().max().copied(), Some(task_count as i64));
        // Delete every row so the next result depends on the durable counter,
        // not MAX(number), even when concurrent inserts completed out of order.
        let path = format!("/yona/api/v1/projects/owner/projectYobi/{resource}");
        for number in numbers {
            let deleted = rest(
                app.clone(),
                Method::DELETE,
                &format!("{path}/{number}"),
                Some(&owner_cookie),
                Some(&owner_csrf),
                None,
            )
            .await;
            assert!(deleted.status().is_success());
        }
        let created = ok_json(
            rest(
                app.clone(),
                Method::POST,
                &path,
                Some(&owner_cookie),
                Some(&owner_csrf),
                Some(json!({"title": "After deletion", "bodyMarkdown": "body"})),
            )
            .await,
        )
        .await;
        assert_eq!(
            created[field],
            if resource == "issues" {
                json!(task_count + 1)
            } else {
                json!((task_count + 1).to_string())
            }
        );
    }
}

#[tokio::test]
async fn resource_numbers_preserve_imported_high_water_and_project_transfer() {
    let data_dir = tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_data_root(data_dir.path()).await;
    let (csrf, cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (recipient_csrf, recipient_cookie, _) = register_user(app.clone(), "recipient").await;
    create_project(app.clone(), &cookie, &csrf).await;
    let project_record = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();

    for (resource, field) in [("issues", "issueNumber"), ("posts", "postNumber")] {
        let path = format!("/yona/api/v1/projects/owner/projectYobi/{resource}");
        for expected in [1, 2] {
            let created = ok_json(
                rest(
                    app.clone(),
                    Method::POST,
                    &path,
                    Some(&cookie),
                    Some(&csrf),
                    Some(json!({"title": "Lifecycle", "bodyMarkdown": "body"})),
                )
                .await,
            )
            .await;
            assert_eq!(
                created[field],
                if resource == "issues" {
                    json!(expected)
                } else {
                    json!(expected.to_string())
                }
            );
            if expected == 1 {
                let deleted = rest(
                    app.clone(),
                    Method::DELETE,
                    &format!("{path}/1"),
                    Some(&cookie),
                    Some(&csrf),
                    None,
                )
                .await;
                assert!(deleted.status().is_success());
            }
        }

        // Imported counters can legitimately exceed every surviving row.
        let mut counter = project::ActiveModel {
            id: Set(project_record.id),
            ..Default::default()
        };
        if resource == "issues" {
            counter.last_issue_number = Set(Some(40));
        } else {
            counter.last_posting_number = Set(Some(40));
        }
        counter.update(&db).await.unwrap();
        let created = ok_json(
            rest(
                app.clone(),
                Method::POST,
                &path,
                Some(&cookie),
                Some(&csrf),
                Some(json!({"title": "Imported high water", "bodyMarkdown": "body"})),
            )
            .await,
        )
        .await;
        assert_eq!(
            created[field],
            if resource == "issues" {
                json!(41)
            } else {
                json!("41")
            }
        );

        // Old imports may instead leave a missing/stale counter beneath rows.
        let mut counter = project::ActiveModel {
            id: Set(project_record.id),
            ..Default::default()
        };
        if resource == "issues" {
            let id = created["issueId"].as_i64().unwrap();
            counter.last_issue_number = Set(None);
            issue::ActiveModel {
                id: Set(id),
                number: Set(Some(70)),
                ..Default::default()
            }
            .update(&db)
            .await
            .unwrap();
        } else {
            let id = created["id"].as_str().unwrap().parse::<i64>().unwrap();
            counter.last_posting_number = Set(Some(3));
            posting::ActiveModel {
                id: Set(id),
                number: Set(Some(70)),
                ..Default::default()
            }
            .update(&db)
            .await
            .unwrap();
        }
        counter.update(&db).await.unwrap();
        let created = ok_json(
            rest(
                app.clone(),
                Method::POST,
                &path,
                Some(&cookie),
                Some(&csrf),
                Some(json!({"title": "After stale import", "bodyMarkdown": "body"})),
            )
            .await,
        )
        .await;
        assert_eq!(
            created[field],
            if resource == "issues" {
                json!(71)
            } else {
                json!("71")
            }
        );
        let deleted = rest(
            app.clone(),
            Method::DELETE,
            &format!("{path}/71"),
            Some(&cookie),
            Some(&csrf),
            None,
        )
        .await;
        assert!(deleted.status().is_success());
    }

    let transfer = repo
        .request_project_transfer(ProjectTransferRequestInput {
            destination: "recipient".to_string(),
            new_project_name: "transferred".to_string(),
            project_id: project_record.id,
            sender_id: owner_id,
        })
        .await
        .unwrap();
    repo.accept_project_transfer(transfer.id, "transferred")
        .await
        .unwrap()
        .unwrap();
    for (resource, field) in [("issues", "issueNumber"), ("posts", "postNumber")] {
        let created = ok_json(
            rest(
                app.clone(),
                Method::POST,
                &format!("/yona/api/v1/projects/recipient/transferred/{resource}"),
                Some(&recipient_cookie),
                Some(&recipient_csrf),
                Some(json!({"title": "After transfer", "bodyMarkdown": "body"})),
            )
            .await,
        )
        .await;
        assert_eq!(
            created[field],
            if resource == "issues" {
                json!(72)
            } else {
                json!("72")
            }
        );
    }
    // The create form can select another project: allocate in that destination,
    // not in the source URL's sequence, even after its highest issue was deleted.
    ok_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner", "projectName": "source",
                "overview": "Destination sequence", "projectScope": "public"
            }),
        )
        .await,
    )
    .await;
    let deleted = rest(
        app.clone(),
        Method::DELETE,
        "/yona/api/v1/projects/recipient/transferred/issues/72",
        Some(&recipient_cookie),
        Some(&recipient_csrf),
        None,
    )
    .await;
    assert!(deleted.status().is_success());
    let selected = ok_json(
        rest(
            app,
            Method::POST,
            "/yona/api/v1/projects/owner/source/issues",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "Selected destination", "bodyMarkdown": "body",
                "targetProjectId": project_record.id
            })),
        )
        .await,
    )
    .await;
    assert_eq!(selected["ownerName"], "recipient");
    assert_eq!(selected["projectName"], "transferred");
    assert_eq!(selected["issueNumber"], 73);
}

#[tokio::test]
async fn resource_imports_do_not_lower_number_high_water() {
    let data_dir = tempdir().expect("yona data");
    let (app, repo, _) = build_app_with_data_root(data_dir.path()).await;
    let (csrf, cookie, owner_id) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &cookie, &csrf).await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();

    for (resource, field) in [("issues", "issueNumber"), ("posts", "postNumber")] {
        // Explicit imports can complete out of numeric order.
        for number in [80, 7] {
            if resource == "issues" {
                repo.insert_site_import_issue(
                    0,
                    project.id,
                    number,
                    "Imported issue",
                    "body",
                    "",
                    "open",
                    owner_id,
                    "owner",
                    "owner",
                    None,
                    None,
                    None,
                    None,
                    vec![],
                    vec![],
                )
                .await
                .unwrap()
                .unwrap();
            } else {
                repo.insert_site_import_posting(
                    0,
                    project.id,
                    number,
                    "Imported post",
                    "body",
                    "",
                    owner_id,
                    "owner",
                    "owner",
                    false,
                    false,
                    None,
                    None,
                    vec![],
                    vec![],
                )
                .await
                .unwrap()
                .unwrap();
            }
        }
        let path = format!("/yona/api/v1/projects/owner/projectYobi/{resource}");
        let deleted = rest(
            app.clone(),
            Method::DELETE,
            &format!("{path}/80"),
            Some(&cookie),
            Some(&csrf),
            None,
        )
        .await;
        assert!(deleted.status().is_success());
        let created = ok_json(
            rest(
                app.clone(),
                Method::POST,
                &path,
                Some(&cookie),
                Some(&csrf),
                Some(json!({"title": "After imported deletion", "bodyMarkdown": "body"})),
            )
            .await,
        )
        .await;
        assert_eq!(
            created[field],
            if resource == "issues" {
                json!(81)
            } else {
                json!("81")
            }
        );
    }
}
