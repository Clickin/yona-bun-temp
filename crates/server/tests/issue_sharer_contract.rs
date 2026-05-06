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
                "overview": "Issue sharer parity",
                "projectScope": scope
            }),
        )
        .await,
    )
    .await;
}

async fn create_issue(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    title: &str,
) -> serde_json::Value {
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
                "bodyMarkdown": "body"
            }),
        )
        .await,
    )
    .await
}

#[tokio::test]
async fn issue_sharer_contract_shares_unshares_and_keeps_duplicate_single_row() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, _, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;

    let shared = response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(shared["sharers"].as_array().unwrap().len(), 1);
    assert_eq!(shared["sharers"][0]["loginId"], "guest");
    assert_eq!(shared["viewerCanManageSharers"], true);

    let duplicate = response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(duplicate["sharers"].as_array().unwrap().len(), 1);

    let unshared = response_json(
        rpc(
            app.clone(),
            "UnshareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(json_array_len(&unshared, "sharers"), 0);

    let unchanged = response_json(
        rpc(
            app,
            "UnshareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(json_array_len(&unchanged, "sharers"), 0);
}

#[tokio::test]
async fn issue_sharer_contract_allows_direct_shared_read_and_comment_only() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    let (outsider_csrf, outsider_cookie, _) = register_user(app.clone(), "outsider").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;

    let forbidden_before_share = rpc(
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
    .await;
    assert_eq!(forbidden_before_share.status(), StatusCode::FORBIDDEN);

    response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;

    let guest_detail = response_json(
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
    assert!(json_bool(&guest_detail, "viewerIsDirectSharer"));
    assert!(!json_bool(&guest_detail, "viewerHasInheritedShare"));
    assert!(json_bool(&guest_detail, "viewerCanComment"));
    assert!(!json_bool(&guest_detail, "viewerCanUpdate"));
    assert!(!json_bool(&guest_detail, "viewerCanDelete"));
    assert!(!json_bool(&guest_detail, "viewerCanManageSharers"));

    let commented = response_json(
        rpc(
            app.clone(),
            "CreateIssueComment",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "contentsMarkdown": "shared comment"
            }),
        )
        .await,
    )
    .await;
    let comment_id = commented["comments"][0]["id"].clone();
    assert_eq!(commented["comments"][0]["authorLoginId"], "guest");

    let denied_update = rpc(
        app.clone(),
        "UpdateIssue",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "title": "forbidden",
            "bodyMarkdown": "forbidden"
        }),
    )
    .await;
    assert_eq!(denied_update.status(), StatusCode::FORBIDDEN);

    let denied_state = rpc(
        app.clone(),
        "UpdateIssueState",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "state": "closed"
        }),
    )
    .await;
    assert_eq!(denied_state.status(), StatusCode::FORBIDDEN);

    let updated_own_comment = response_json(
        rpc(
            app.clone(),
            "UpdateIssueComment",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "commentId": comment_id,
                "contentsMarkdown": "edited shared comment"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(
        updated_own_comment["comments"][0]["contentsMarkdown"],
        "edited shared comment"
    );

    let denied_other_comment = rpc(
        app,
        "UpdateIssueComment",
        Some(&outsider_cookie),
        Some(&outsider_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "commentId": comment_id,
            "contentsMarkdown": "outsider edit"
        }),
    )
    .await;
    assert_eq!(denied_other_comment.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn issue_sharer_contract_parent_share_grants_child_read_only() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Parent issue").await;

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

    response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;

    let child_detail = response_json(
        rpc(
            app.clone(),
            "ReadIssueDetail",
            Some(&guest_cookie),
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "2"
            }),
        )
        .await,
    )
    .await;
    assert!(!json_bool(&child_detail, "viewerIsDirectSharer"));
    assert!(json_bool(&child_detail, "viewerHasInheritedShare"));
    assert!(!json_bool(&child_detail, "viewerCanComment"));
    assert!(!json_bool(&child_detail, "viewerCanUpdate"));

    let denied_child_comment = rpc(
        app.clone(),
        "CreateIssueComment",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "2",
            "contentsMarkdown": "not directly shared"
        }),
    )
    .await;
    assert_eq!(denied_child_comment.status(), StatusCode::FORBIDDEN);

    let parent_from_child_share = rpc(
        app,
        "ReadIssueDetail",
        Some(&guest_cookie),
        None,
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1"
        }),
    )
    .await;
    assert_eq!(parent_from_child_share.status(), StatusCode::OK);
}

#[tokio::test]
async fn issue_sharer_contract_rejects_unknown_login_and_unauthorized_manager() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Public issue").await;

    let unknown = rpc(
        app.clone(),
        "ShareIssue",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "loginId": "missing"
        }),
    )
    .await;
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);

    let denied = rpc(
        app,
        "ShareIssue",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "loginId": "owner"
        }),
    )
    .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
}
