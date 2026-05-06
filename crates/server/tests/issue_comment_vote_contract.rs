use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ActiveModelTrait, Database, DatabaseConnection, NotSet, Set};
use serde_json::json;
use tower::ServiceExt;
use yona_rust_persistence::{issue, AppRepository};
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

async fn response_json(response: Response<Body>) -> serde_json::Value {
    let status = response.status();
    let text = response_text(response).await;
    assert_eq!(status, StatusCode::OK, "{text}");
    serde_json::from_str(&text).expect("json response")
}

fn json_bool(value: &serde_json::Value, key: &str) -> bool {
    value
        .get(key)
        .and_then(|item| item.as_bool())
        .unwrap_or(false)
}

fn json_u64(value: &serde_json::Value, key: &str) -> u64 {
    value.get(key).and_then(|item| item.as_u64()).unwrap_or(0)
}

fn json_array_len(value: &serde_json::Value, key: &str) -> usize {
    value
        .get(key)
        .and_then(|item| item.as_array())
        .map(Vec::len)
        .unwrap_or_default()
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

async fn direct_comment_vote(
    app: axum::Router,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    issue_number: i64,
    comment_id: &serde_json::Value,
    action: &str,
) -> Response<Body> {
    let comment_id = comment_id
        .as_str()
        .map(str::to_string)
        .or_else(|| comment_id.as_i64().map(|value| value.to_string()))
        .expect("comment id");
    let mut builder = Request::builder().method(Method::POST).uri(format!(
        "/yona/owner/projectYobi/issue/{issue_number}/comment/{comment_id}/{action}"
    ));
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }

    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
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
                "overview": "Issue comment vote parity",
                "projectScope": scope
            }),
        )
        .await,
    )
    .await;
}

async fn create_issue(app: axum::Router, cookie: &str, csrf: &str, title: &str) {
    response_json(
        rpc(
            app,
            "CreateIssue",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": title,
                "bodyMarkdown": title
            }),
        )
        .await,
    )
    .await;
}

async fn create_comment(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    issue_number: i64,
    contents: &str,
) -> serde_json::Value {
    response_json(
        rpc(
            app,
            "CreateIssueComment",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": issue_number.to_string(),
                "contentsMarkdown": contents
            }),
        )
        .await,
    )
    .await
}

async fn share_issue(app: axum::Router, cookie: &str, csrf: &str, issue_number: i64) {
    response_json(
        rpc(
            app,
            "ShareIssue",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": issue_number.to_string(),
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
}

#[tokio::test]
async fn issue_comment_vote_contract_updates_projection_and_preserves_unvote_policy() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Public issue").await;
    let commented = create_comment(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        1,
        "comment worth agreeing with",
    )
    .await;
    let comment_id = commented["comments"][0]["id"].clone();

    let voted = response_json(
        rpc(
            app.clone(),
            "VoteIssueComment",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "commentId": comment_id
            }),
        )
        .await,
    )
    .await;
    assert_eq!(json_u64(&voted["comments"][0], "voterCount"), 1);
    assert!(json_bool(&voted["comments"][0], "viewerHasVoted"));
    assert_eq!(voted["comments"][0]["voters"][0]["loginId"], "guest");
    assert_eq!(json_u64(&voted["timeline"][0]["comment"], "voterCount"), 1);
    assert!(json_bool(
        &voted["timeline"][0]["comment"],
        "viewerHasVoted"
    ));

    let duplicate_vote = response_json(
        rpc(
            app.clone(),
            "VoteIssueComment",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "commentId": comment_id
            }),
        )
        .await,
    )
    .await;
    assert_eq!(json_u64(&duplicate_vote["comments"][0], "voterCount"), 1);

    let unvoted = response_json(
        rpc(
            app.clone(),
            "UnvoteIssueComment",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "commentId": comment_id
            }),
        )
        .await,
    )
    .await;
    assert_eq!(json_u64(&unvoted["comments"][0], "voterCount"), 0);
    assert!(!json_bool(&unvoted["comments"][0], "viewerHasVoted"));
    assert_eq!(json_array_len(&unvoted["comments"][0], "voters"), 0);

    let not_voted = rpc(
        app,
        "UnvoteIssueComment",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "commentId": comment_id
        }),
    )
    .await;
    assert_eq!(not_voted.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn issue_comment_vote_contract_rejects_anonymous_and_wrong_issue_pairing() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "First issue").await;
    let commented =
        create_comment(app.clone(), &owner_cookie, &owner_csrf, 1, "first comment").await;
    let comment_id = commented["comments"][0]["id"].clone();
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Second issue").await;

    let anonymous = rpc(
        app.clone(),
        "VoteIssueComment",
        None,
        None,
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "commentId": comment_id
        }),
    )
    .await;
    assert_eq!(anonymous.status(), StatusCode::UNAUTHORIZED);

    let wrong_issue = rpc(
        app,
        "VoteIssueComment",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "2",
            "commentId": comment_id
        }),
    )
    .await;
    assert_eq!(wrong_issue.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn issue_comment_vote_contract_allows_direct_share_and_denies_inherited_share() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Parent issue").await;
    let parent_comment =
        create_comment(app.clone(), &owner_cookie, &owner_csrf, 1, "parent comment").await;
    let parent_comment_id = parent_comment["comments"][0]["id"].clone();

    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    let parent = repo
        .read_issue_detail("owner", "projectYobi", 1)
        .await
        .unwrap()
        .unwrap();
    issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Child issue".to_string())),
        created_date: Set(None),
        updated_date: Set(None),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        project_id: Set(Some(project.id)),
        number: Set(Some(2)),
        num_of_comments: Set(Some(0)),
        state: Set(Some(0)),
        due_date: Set(None),
        milestone_id: Set(None),
        assignee_id: Set(None),
        parent_id: Set(Some(parent.id)),
        weight: Set(None),
        updated_by_author_id: Set(None),
        is_draft: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    let child_comment =
        create_comment(app.clone(), &owner_cookie, &owner_csrf, 2, "child comment").await;
    let child_comment_id = child_comment["comments"][0]["id"].clone();
    share_issue(app.clone(), &owner_cookie, &owner_csrf, 1).await;

    let direct_share_vote = response_json(
        rpc(
            app.clone(),
            "VoteIssueComment",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "commentId": parent_comment_id
            }),
        )
        .await,
    )
    .await;
    assert_eq!(json_u64(&direct_share_vote["comments"][0], "voterCount"), 1);
    assert!(json_bool(
        &direct_share_vote["comments"][0],
        "viewerHasVoted"
    ));

    let inherited_share_vote = rpc(
        app,
        "VoteIssueComment",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "2",
            "commentId": child_comment_id
        }),
    )
    .await;
    assert_eq!(inherited_share_vote.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn issue_comment_vote_legacy_post_routes_redirect_and_preserve_unvote_policy() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Public issue").await;
    let commented =
        create_comment(app.clone(), &owner_cookie, &owner_csrf, 1, "direct route").await;
    let comment_id = commented["comments"][0]["id"].clone();
    let comment_id_string = comment_id.as_str().unwrap().to_string();

    let vote = direct_comment_vote(
        app.clone(),
        Some(&guest_cookie),
        Some(&guest_csrf),
        1,
        &comment_id,
        "vote",
    )
    .await;
    assert_eq!(vote.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        vote.headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some(format!("/yona/owner/projectYobi/issue/1#comment-{comment_id_string}").as_str())
    );

    let detail = response_json(
        rpc(
            app.clone(),
            "ReadIssueDetail",
            Some(&guest_cookie),
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(json_u64(&detail["comments"][0], "voterCount"), 1);
    assert!(json_bool(&detail["comments"][0], "viewerHasVoted"));

    let unvote = direct_comment_vote(
        app.clone(),
        Some(&guest_cookie),
        Some(&guest_csrf),
        1,
        &comment_id,
        "unvote",
    )
    .await;
    assert_eq!(unvote.status(), StatusCode::SEE_OTHER);

    let not_voted = direct_comment_vote(
        app,
        Some(&guest_cookie),
        Some(&guest_csrf),
        1,
        &comment_id,
        "unvote",
    )
    .await;
    assert_eq!(not_voted.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn issue_comment_vote_legacy_post_routes_reject_anonymous_wrong_issue_and_inherited_share() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Parent issue").await;
    let parent_comment =
        create_comment(app.clone(), &owner_cookie, &owner_csrf, 1, "parent direct").await;
    let parent_comment_id = parent_comment["comments"][0]["id"].clone();

    let anonymous =
        direct_comment_vote(app.clone(), None, None, 1, &parent_comment_id, "vote").await;
    assert_eq!(anonymous.status(), StatusCode::UNAUTHORIZED);

    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    let parent = repo
        .read_issue_detail("owner", "projectYobi", 1)
        .await
        .unwrap()
        .unwrap();
    issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Child issue".to_string())),
        created_date: Set(None),
        updated_date: Set(None),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        project_id: Set(Some(project.id)),
        number: Set(Some(2)),
        num_of_comments: Set(Some(0)),
        state: Set(Some(0)),
        due_date: Set(None),
        milestone_id: Set(None),
        assignee_id: Set(None),
        parent_id: Set(Some(parent.id)),
        weight: Set(None),
        updated_by_author_id: Set(None),
        is_draft: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    let child_comment =
        create_comment(app.clone(), &owner_cookie, &owner_csrf, 2, "child direct").await;
    let child_comment_id = child_comment["comments"][0]["id"].clone();

    let wrong_issue = direct_comment_vote(
        app.clone(),
        Some(&owner_cookie),
        Some(&owner_csrf),
        2,
        &parent_comment_id,
        "vote",
    )
    .await;
    assert_eq!(wrong_issue.status(), StatusCode::NOT_FOUND);

    share_issue(app.clone(), &owner_cookie, &owner_csrf, 1).await;
    let inherited_share = direct_comment_vote(
        app,
        Some(&guest_cookie),
        Some(&guest_csrf),
        2,
        &child_comment_id,
        "vote",
    )
    .await;
    assert_eq!(inherited_share.status(), StatusCode::FORBIDDEN);
}
