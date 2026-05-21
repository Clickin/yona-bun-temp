use std::collections::HashSet;
use std::sync::Arc;

use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use tokio::sync::Barrier;
use tower::ServiceExt;
use yona_rust_persistence::{
    AppRepository, CreateOrganizationInput, CreatePostingInput, CreateProjectInput,
    PostingMutationInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

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

#[tokio::test]
async fn board_contract_manages_project_posts_comments_watch_and_notifications() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let label_id = create_label(app.clone(), &owner_cookie, &owner_csrf).await;

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
                "bodyMarkdown": "# README\n@guest should see this board notification",
                "labelIds": [label_id],
                "readme": true
            })),
        )
        .await,
    )
    .await;
    assert_eq!(readme["postNumber"], "1");
    assert_eq!(readme["readme"], true);
    assert_eq!(readme["isWatching"], true);
    assert!(readme["bodyHtml"]
        .as_str()
        .unwrap()
        .contains("<h1>README</h1>"));

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
    assert_eq!(list["items"][0]["labels"][0]["name"], "Guide");
    assert_eq!(list["notices"].as_array().unwrap().len(), 1);
    assert_eq!(list["notices"][0]["postNumber"], "2");
    assert_eq!(list["readme"]["postNumber"], "1");
    assert_eq!(
        list["readme"]["bodyMarkdown"],
        "# README\n@guest should see this board notification"
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
    assert_eq!(detail["permissions"]["canRead"], true);
    assert_eq!(detail["permissions"]["canCreate"], true);
    assert_eq!(detail["permissions"]["canUpdate"], true);
    assert_eq!(detail["permissions"]["canDelete"], true);
    assert_eq!(detail["permissions"]["canComment"], true);
    assert_eq!(detail["permissions"]["canSetNotice"], true);
    assert_eq!(detail["permissions"]["canWatch"], true);
    assert_eq!(detail["watcherCount"], 1);

    let commented = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts/1/comments",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "First **comment**"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(commented["commentCount"], 1);
    assert_eq!(commented["comments"].as_array().unwrap().len(), 1);
    assert!(commented["comments"][0]["contentsHtml"]
        .as_str()
        .unwrap()
        .contains("<strong>comment</strong>"));

    let comment_id = commented["comments"][0]["id"].as_str().unwrap();
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
        notifications["items"][0]["targetHref"],
        "/yona/owner/projectYobi/post/1"
    );
    assert_eq!(notifications["items"][0]["targetTitle"], "Updated README");
}

#[tokio::test]
async fn board_contract_preserves_legacy_acl_for_project_group_and_public_users() {
    let (app, repo) = build_app_with_repository().await;
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
async fn board_contract_allocates_unique_post_numbers_under_concurrent_create() {
    let (app, repo) = build_app_with_repository().await;
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
}
