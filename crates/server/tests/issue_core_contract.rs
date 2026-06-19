use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{Database, EntityName};
use serde_json::json;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

#[test]
fn issue_entity_reexport_preserves_legacy_table_name() {
    assert_eq!(yona_rust_persistence::issue::Entity.table_name(), "issue");
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

async fn response_json_with_status(
    response: Response<Body>,
    expected_status: StatusCode,
) -> serde_json::Value {
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(status, expected_status, "{text}");
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

#[tokio::test]
async fn issue_core_contract_creates_reads_updates_and_deletes_over_rest() {
    // Guards issue route-owned detail/state helpers, detail projections, REST response DTOs, mutation, and the issues/comments.rs split.
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie, _) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "reviewer").await;
    let _ = register_user(app.clone(), "assigned").await;

    let project = rpc(
        app.clone(),
        "CreateProject",
        Some(&cookie),
        Some(&csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "overview": "Issue parity",
            "projectScope": "public"
        }),
    )
    .await;
    response_json(project).await;

    let created = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "assigneeLoginId": "assigned",
                "title": "Markdown issue",
                "bodyMarkdown": "Hello **Yona** @reviewer #1 owner/projectYobi#1 https://example.com/docs?x=1\n\n![logo](https://example.com/logo.png \"Logo\") ![bad](javascript:alert(1))\n\n- [x] done\n- [ ] todo\n\n```rust\nfn main() {\n    let count = 1;\n}\n```\n\n`<script>alert(1)</script> @reviewer #1 https://example.com/code`"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(created["issueNumber"], "1");
    assert_eq!(created["ownerName"], "owner");
    assert_eq!(created["projectName"], "projectYobi");
    assert_eq!(created["title"], "Markdown issue");
    assert_eq!(created["state"], "open");
    assert_eq!(created["isWatching"], true);
    assert_eq!(created["bodyHtml"].as_str().unwrap_or(""), "");
    assert!(created["bodyMarkdown"]
        .as_str()
        .unwrap()
        .contains("Hello **Yona** @reviewer #1"));

    let detail = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(detail["title"], "Markdown issue");
    assert_eq!(detail["issueNumber"], "1");
    assert_eq!(detail["ownerName"], "owner");
    assert_eq!(detail["projectName"], "projectYobi");
    let issue_author_avatar_url = detail["authorAvatarUrl"]
        .as_str()
        .expect("issue detail author avatar url");
    assert!(
        issue_author_avatar_url.starts_with("https://www.gravatar.com/avatar/")
            && issue_author_avatar_url.ends_with("?s=256&d=identicon"),
        "{issue_author_avatar_url}"
    );
    let issue_assignee_avatar_url = detail["assigneeAvatarUrl"]
        .as_str()
        .expect("issue detail assignee avatar url");
    assert!(
        issue_assignee_avatar_url.starts_with("https://www.gravatar.com/avatar/")
            && issue_assignee_avatar_url.ends_with("?s=256&d=identicon"),
        "{issue_assignee_avatar_url}"
    );

    let commented = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/comments",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "contentsMarkdown": "A [safe](https://example.com) comment"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(commented["comments"].as_array().unwrap().len(), 1);
    assert_eq!(commented["timeline"].as_array().unwrap().len(), 1);
    let author_avatar_url = commented["comments"][0]["authorAvatarUrl"]
        .as_str()
        .expect("issue comment author avatar url");
    assert!(
        author_avatar_url.starts_with("https://www.gravatar.com/avatar/")
            && author_avatar_url.ends_with("?s=256&d=identicon"),
        "{author_avatar_url}"
    );
    assert_eq!(
        commented["timeline"][0]["comment"]["authorAvatarUrl"],
        commented["comments"][0]["authorAvatarUrl"]
    );
    assert_eq!(
        commented["comments"][0]["contentsHtml"]
            .as_str()
            .unwrap_or(""),
        ""
    );
    assert_eq!(
        commented["comments"][0]["contentsMarkdown"],
        "A [safe](https://example.com) comment"
    );

    let direct_updated_comment = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/owner/projectYobi/issue/1/comments/1")
                .header(http::header::COOKIE, &cookie)
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from(format!(
                    "csrfToken={csrf}&contents=Legacy+direct+comment+edit"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(direct_updated_comment.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        direct_updated_comment
            .headers()
            .get(http::header::LOCATION)
            .unwrap()
            .to_str()
            .unwrap(),
        "/yona/owner/projectYobi/issue/1#comment-1"
    );
    let directly_updated_detail = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        directly_updated_detail["comments"][0]["contentsMarkdown"],
        "Legacy direct comment edit"
    );

    let updated_comment = response_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/comments/1",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "contentsMarkdown": "Edited comment"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        updated_comment["comments"][0]["contentsMarkdown"],
        "Edited comment"
    );

    let state_updated = response_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/state",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "state": "closed"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(state_updated["state"], "closed");

    let listed = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues?state=closed&pageNum=1",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(listed["items"].as_array().unwrap().len(), 1);
    assert_eq!(listed["items"][0]["issueNumber"], 1);
    assert_eq!(listed["items"][0]["state"], "closed");
    assert_eq!(listed["items"][0]["commentCount"], 1);

    let deleted_comment = response_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/comments/1",
            Some(&cookie),
            Some(&csrf),
            None,
        )
        .await,
    )
    .await;
    assert!(deleted_comment
        .get("comments")
        .and_then(serde_json::Value::as_array)
        .is_none_or(|comments| comments.is_empty()));

    let legacy_external_comment = response_json_with_status(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "body": "legacy external issue comment"
            })),
        )
        .await,
        StatusCode::CREATED,
    )
    .await;
    assert_eq!(legacy_external_comment["status"], 201);
    let legacy_external_comment_id = legacy_external_comment["location"]
        .as_str()
        .expect("legacy external issue comment location")
        .rsplit_once("#comment-")
        .expect("legacy external issue comment anchor")
        .1
        .parse::<i64>()
        .expect("legacy external issue comment id");

    let legacy_external_comment_updated = response_json(
        rest(
            app.clone(),
            Method::PUT,
            &format!(
                "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/comments/{legacy_external_comment_id}"
            ),
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "content": "legacy external issue comment updated",
                "original": "legacy external issue comment"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_external_comment_updated["result"]["contents"],
        "legacy external issue comment updated"
    );
    let direct_created_comment = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/owner/projectYobi/issue/1/comments")
                .header(http::header::COOKIE, &cookie)
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from(format!(
                    "csrfToken={csrf}&contents=Legacy+direct+comment+create"
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
    assert!(direct_created_location.starts_with("/yona/owner/projectYobi/issue/1#comment-"));
    let direct_created_detail = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&cookie),
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
        .find(|comment| comment["contentsMarkdown"] == "Legacy direct comment create")
        .and_then(|comment| {
            comment["id"]
                .as_i64()
                .or_else(|| comment["id"].as_str().and_then(|value| value.parse().ok()))
        })
        .expect("direct legacy issue comment id");
    let direct_deleted_comment = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!(
                    "/yona/owner/projectYobi/issue/1/comment/{direct_comment_id}/delete"
                ))
                .header(http::header::COOKIE, &cookie)
                .header("x-csrf-token", &csrf)
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
        "/yona/owner/projectYobi/issue/1"
    );

    let deleted_issue = response_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&cookie),
            Some(&csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted_issue["issueNumber"], "1");

    let missing = rest(
        app,
        Method::GET,
        "/yona/api/v1/projects/owner/projectYobi/issues/1",
        Some(&cookie),
        None,
        None,
    )
    .await;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn issue_list_format_xls_exports_filtered_issues_from_legacy_route() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie, _) = register_user(app.clone(), "owner").await;

    response_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "overview": "Issue export parity",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;

    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "Open export issue",
                "bodyMarkdown": "export me"
            })),
        )
        .await,
    )
    .await;
    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "Closed export issue",
                "bodyMarkdown": "do not export me"
            })),
        )
        .await,
    )
    .await;
    response_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/2/state",
            Some(&cookie),
            Some(&csrf),
            Some(json!({ "state": "closed" })),
        )
        .await,
    )
    .await;

    let response = rest(
        app,
        Method::GET,
        "/yona/owner/projectYobi/issues?state=open&format=xls",
        Some(&cookie),
        None,
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("application/vnd.ms-excel; charset=utf-8")
    );
    assert_eq!(
        response
            .headers()
            .get(http::header::CONTENT_DISPOSITION)
            .and_then(|value| value.to_str().ok()),
        Some("attachment; filename=\"projectYobi-issues.xls\"")
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(text.starts_with('\u{feff}'));
    assert!(text.contains("Number\tTitle\tState\tAuthor"));
    assert!(text.contains("Open export issue"));
    assert!(!text.contains("Closed export issue"));
}

#[tokio::test]
async fn project_issue_list_filters_unassigned_issues_by_legacy_assignee_id_zero() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie, _) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "assigned").await;

    let project = rpc(
        app.clone(),
        "CreateProject",
        Some(&cookie),
        Some(&csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "overview": "Issue filter parity",
            "projectScope": "public"
        }),
    )
    .await;
    response_json(project).await;

    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "assigneeLoginId": "assigned",
                "bodyMarkdown": "assigned",
                "title": "Assigned open issue"
            })),
        )
        .await,
    )
    .await;
    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "bodyMarkdown": "unassigned",
                "title": "Unassigned open issue"
            })),
        )
        .await,
    )
    .await;

    let listed = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues?state=open&assigneeId=0",
            None,
            None,
            None,
        )
        .await,
    )
    .await;

    assert_eq!(listed["totalCount"], 1);
    assert_eq!(listed["items"][0]["title"], "Unassigned open issue");
    assert!(listed["items"][0]
        .get("assigneeLabel")
        .and_then(serde_json::Value::as_str)
        .is_none_or(str::is_empty));
}

#[tokio::test]
async fn issue_mutation_contract_preserves_legacy_public_project_permissions() {
    // Guards route-utils-owned authenticated-user and project resource-create authorization for issue routes.
    let (app, repo) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, guest_id) = register_user(app.clone(), "guest").await;
    let (guest_outsider_csrf, guest_outsider_cookie, _) =
        register_user(app.clone(), "guest-outsider").await;
    let (outsider_csrf, outsider_cookie, _) = register_user(app.clone(), "outsider").await;
    repo.toggle_site_user_guest_mode("guest")
        .await
        .expect("mark public issue actor as guest");
    repo.toggle_site_user_guest_mode("guest-outsider")
        .await
        .expect("mark public issue outsider as guest");

    response_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "overview": "Issue parity",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;

    let created = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({
                "title": "Public guest issue",
                "bodyMarkdown": "body"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(created["issueNumber"], "1");

    let forbidden = rest(
        app.clone(),
        Method::PUT,
        "/yona/api/v1/projects/owner/projectYobi/issues/1",
        Some(&outsider_cookie),
        Some(&outsider_csrf),
        Some(json!({
            "title": "forbidden",
            "bodyMarkdown": "forbidden"
        })),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let updated = response_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({
                "title": "edited by guest author",
                "bodyMarkdown": "updated"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["title"], "edited by guest author");
    assert_eq!(updated["historyMarkdown"], "body");
    assert_eq!(updated["historyHtml"].as_str().unwrap_or(""), "");

    let legacy_content_updated = response_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/content",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({
                "content": "legacy external content update",
                "original": "updated"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_content_updated["body"],
        "legacy external content update"
    );

    let legacy_detect_change = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/detectChange",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({
                "issueBodyChecksum": "stale",
                "numOfComments": 0
            })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_detect_change["result"], "ok");
    assert_eq!(legacy_detect_change["issueBodyChanged"], true);

    let legacy_read = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1",
            Some(&guest_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_read["result"]["body"],
        "legacy external content update"
    );
    assert_eq!(legacy_read["result"]["number"], 1);

    let legacy_updated = response_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({
                "title": "legacy external issue update",
                "body": "legacy external full update",
                "state": "open"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_updated["result"]["title"],
        "legacy external issue update"
    );
    assert_eq!(
        legacy_updated["result"]["body"],
        "legacy external full update"
    );

    let legacy_state_updated = response_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({ "state": "closed" })),
        )
        .await,
    )
    .await;
    assert_eq!(legacy_state_updated["result"]["state"], "closed");

    let state_updated = response_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/state",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({ "state": "closed" })),
        )
        .await,
    )
    .await;
    assert_eq!(state_updated["state"], "closed");

    let watched_by_author = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(watched_by_author["isWatching"], true);

    let voted_by_author = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/vote",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(voted_by_author["hasVoted"], true);

    let legacy_weight_up = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/upvoteWeight",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_weight_up["weight"], 1);

    let legacy_weight_down = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/issues/1/downvoteWeight",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_weight_down["weight"], 0);

    let watch_forbidden = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
        Some(&guest_outsider_cookie),
        Some(&guest_outsider_csrf),
        None,
    )
    .await;
    assert_eq!(watch_forbidden.status(), StatusCode::FORBIDDEN);

    let vote_forbidden = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/vote",
        Some(&guest_outsider_cookie),
        Some(&guest_outsider_csrf),
        None,
    )
    .await;
    assert_eq!(vote_forbidden.status(), StatusCode::FORBIDDEN);

    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    repo.add_project_membership(project.id, guest_id, "member")
        .await
        .unwrap();

    // Guards the issue route-module mass-update body DTO split.
    let mass_updated = response_json(
        rest(
            app,
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/mass-update",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({
                "issueNumbers": ["1"],
                "state": "closed"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(mass_updated["items"][0]["state"], "closed");
}

#[tokio::test]
// Guards the issue-owned direct issue form query DTO and options response.
async fn issue_core_contract_restores_direct_issue_from_comment_flow() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie, _) = register_user(app.clone(), "owner").await;

    response_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "overview": "Direct issue parity",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;
    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/workspace/recent-projects",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "ownerName": "owner",
                "projectName": "projectYobi"
            })),
        )
        .await,
    )
    .await;
    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "Source issue",
                "bodyMarkdown": "source body"
            })),
        )
        .await,
    )
    .await;
    let commented = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/comments",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "contentsMarkdown": "Source comment body"
            })),
        )
        .await,
    )
    .await;
    let comment_id = commented["comments"][0]["id"].as_str().unwrap().to_string();

    let options = response_json(
        rest(
            app.clone(),
            Method::GET,
            &format!("/yona/api/v1/user/issues/new-options?commentId={comment_id}"),
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(options["selectedProject"]["ownerName"], "owner");
    assert_eq!(options["selectedProject"]["projectName"], "projectYobi");
    assert_eq!(options["referCommentId"], comment_id);
    let body_markdown = options["bodyMarkdown"].as_str().unwrap();
    assert!(
        body_markdown.contains("Source comment body"),
        "{body_markdown}"
    );
    assert!(
        body_markdown.contains(&format!(
            "_Originally posted by @owner in http://localhost:3001/yona/owner/projectYobi/issue/1#comment-{comment_id}_"
        )),
        "{body_markdown}"
    );

    let created = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "Derived issue",
                "bodyMarkdown": body_markdown,
                "referCommentId": comment_id
            })),
        )
        .await,
    )
    .await;
    assert_eq!(created["issueNumber"], "2");

    let source = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(source["commentCount"], 2);
    assert!(
        source["comments"]
            .as_array()
            .unwrap()
            .iter()
            .any(|comment| {
                comment["contentsMarkdown"]
                    == "issue.derived:http://localhost:3001/yona/owner/projectYobi/issue/2"
            }),
        "{source}"
    );
}

#[tokio::test]
async fn issue_core_contract_restores_direct_my_issue_project_selection() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie, _) = register_user(app.clone(), "nori").await;

    response_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "nori",
                "projectName": "publicYobi",
                "overview": "Public fallback",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;
    let public_options = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/user/issues/new-options?mine=true",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(public_options["selectedProject"]["ownerName"], "nori");
    assert_eq!(
        public_options["selectedProject"]["projectName"],
        "publicYobi"
    );
    assert_eq!(public_options["bodyMarkdown"], "");
    assert_eq!(public_options["referCommentId"], "");

    response_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "nori",
                "projectName": "privateYobi",
                "overview": "Private fallback",
                "projectScope": "private"
            }),
        )
        .await,
    )
    .await;
    let private_options = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/user/issues/new-options?mine=true",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        private_options["selectedProject"]["projectName"],
        "privateYobi"
    );

    response_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "nori",
                "projectName": "_private",
                "overview": "Legacy private inbox",
                "projectScope": "private"
            }),
        )
        .await,
    )
    .await;
    let private_alias_options = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/user/issues/new-options?mine=true",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        private_alias_options["selectedProject"]["projectName"],
        "_private"
    );

    response_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "nori",
                "projectName": "inbox",
                "overview": "Legacy inbox",
                "projectScope": "private"
            }),
        )
        .await,
    )
    .await;
    let inbox_options = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/user/issues/new-options?mine=true",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(inbox_options["selectedProject"]["projectName"], "inbox");
}
