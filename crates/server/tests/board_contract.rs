use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::{Arc, Mutex, OnceLock};

use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ActiveModelTrait, Database, DatabaseConnection, NotSet, Set};
use serde_json::json;
use tempfile::tempdir;
use tokio::sync::Barrier;
use tower::ServiceExt;
use yona_rust_persistence::{
    original_email, AppRepository, CreateOrganizationInput, CreatePostingInput, CreateProjectInput,
    PostingMutationInput,
};
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
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
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
    payload["label"]["id"].as_str().unwrap().to_string()
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
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    let created_response = rest(
        app.clone(),
        Method::POST,
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts",
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
        "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/77/comments",
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
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/postlabel/77",
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
            app,
            Method::PATCH,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/posts/77/content",
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
}

#[tokio::test]
async fn board_readme_posting_commits_git_readme_file() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());

    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    let repo_path = data_dir.path().join("repo").join("1.git");
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

    std::env::remove_var("YONA_DATA");
}

#[tokio::test]
async fn board_postform_online_commit_updates_issue_template_and_code_files() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());

    let (app, repo, _) = build_app_with_repository().await;
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
        .join(format!("{}.git", project.id));
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

    std::env::remove_var("YONA_DATA");
}

#[tokio::test]
async fn board_contract_manages_project_posts_comments_watch_and_notifications() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repository, db) = build_app_with_repository().await;
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
    assert_eq!(linked_issue["issueNumber"], "1");

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
                "contentsMarkdown": "Edited comment"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        edited_comment["comments"][0]["contentsMarkdown"],
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
                    "csrfToken={owner_csrf}&contents=Legacy+board+comment+edit"
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

    std::env::remove_var("YONA_DATA");
}

#[tokio::test]
async fn board_contract_preserves_legacy_acl_for_project_group_and_public_users() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo, _) = build_app_with_repository().await;
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

    std::env::remove_var("YONA_DATA");
}

#[tokio::test]
async fn board_contract_allocates_unique_post_numbers_under_concurrent_create() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo, _) = build_app_with_repository().await;
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
            repo.create_posting(CreatePostingInput {
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
        }));
    }

    let mut numbers = Vec::new();
    for task in tasks {
        let posting = task.await.unwrap().unwrap().unwrap();
        numbers.push(posting.post_number);
    }

    let unique_numbers: HashSet<i64> = numbers.iter().copied().collect();
    assert_eq!(unique_numbers.len(), task_count);
    assert_eq!(numbers.iter().min().copied(), Some(1));
    assert_eq!(numbers.iter().max().copied(), Some(task_count as i64));

    std::env::remove_var("YONA_DATA");
}
