use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
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

async fn rpc(
    app: axum::Router,
    method_name: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: serde_json::Value,
) -> Response<Body> {
    rest_test_support::pilot_rest(app, method_name, cookie_header, csrf, payload).await
}

async fn rest_get(app: axum::Router, path: &str, cookie_header: &str) -> Response<Body> {
    app.oneshot(
        Request::builder()
            .method(Method::GET)
            .uri(path)
            .header(http::header::COOKIE, cookie_header)
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn rest_post(
    app: axum::Router,
    path: &str,
    cookie_header: &str,
    csrf: &str,
) -> Response<Body> {
    app.oneshot(
        Request::builder()
            .method(Method::POST)
            .uri(path)
            .header(http::header::COOKIE, cookie_header)
            .header("x-csrf-token", csrf)
            .body(Body::empty())
            .unwrap(),
    )
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
                "overview": "Favorite issue parity",
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
    body: &str,
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
                "bodyMarkdown": body
            }),
        )
        .await,
    )
    .await
}

#[tokio::test]
// Guards the issues/meta.rs favorite and assignment helpers used by proto adapters.
async fn favorite_issue_toggle_updates_issue_detail_and_rejects_unreadable_issues() {
    let (app, repo) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Private favorite",
        "body",
    )
    .await;

    let anonymous = rpc(
        app.clone(),
        "ToggleFavoriteIssue",
        None,
        None,
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1"
        }),
    )
    .await;
    assert_eq!(anonymous.status(), StatusCode::UNAUTHORIZED);

    let unreadable = rpc(
        app.clone(),
        "ToggleFavoriteIssue",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1"
        }),
    )
    .await;
    assert_eq!(unreadable.status(), StatusCode::FORBIDDEN);

    let favored = response_json(
        rpc(
            app.clone(),
            "ToggleFavoriteIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(favored["isFavorited"].as_bool().unwrap_or(false), true);
    let issue_id = repo
        .read_issue_detail("owner", "projectYobi", 1)
        .await
        .unwrap()
        .expect("favorite issue")
        .id;
    let legacy_favorites =
        response_json(rest_get(app.clone(), "/yona/-_-api/v1/favoriteIssues", &owner_cookie).await)
            .await;
    assert_eq!(legacy_favorites["projectIds"], json!([issue_id]));
    assert_eq!(legacy_favorites["projects"][0]["issueId"], issue_id);

    let unfavored = response_json(
        rest_post(
            app.clone(),
            &format!("/yona/-_-api/v1/favoriteIssues/{issue_id}"),
            &owner_cookie,
            &owner_csrf,
        )
        .await,
    )
    .await;
    assert_eq!(unfavored["issueId"], issue_id.to_string());
    assert_eq!(unfavored["favored"], false);

    let legacy_favorites_after_toggle =
        response_json(rest_get(app, "/yona/-_-api/v1/favoriteIssues", &owner_cookie).await).await;
    assert_eq!(legacy_favorites_after_toggle["projectIds"], json!([]));
}

#[tokio::test]
// Guards users route reuse of issue-owned user issue query DTO, projection, visibility, and filters.
async fn user_issue_list_defaults_to_assigned_and_filters_comment_shared_and_favorite() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, guest_id) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Assigned private issue",
        "body",
    )
    .await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Commented shared issue",
        "body",
    )
    .await;

    response_json(
        rpc(
            app.clone(),
            "AssignIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "assigneeLoginId": "guest"
            }),
        )
        .await,
    )
    .await;
    response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "2",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    response_json(
        rpc(
            app.clone(),
            "CreateIssueComment",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "2",
                "contentsMarkdown": "guest comment"
            }),
        )
        .await,
    )
    .await;
    response_json(
        rpc(
            app.clone(),
            "ToggleFavoriteIssue",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "2"
            }),
        )
        .await,
    )
    .await;

    let assigned_default = response_json(
        rpc(
            app.clone(),
            "ListUserIssues",
            Some(&guest_cookie),
            None,
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(assigned_default["filter"], "assigned");
    assert_eq!(assigned_default["items"].as_array().unwrap().len(), 1);
    assert_eq!(
        assigned_default["items"][0]["title"],
        "Assigned private issue"
    );

    let commented = response_json(
        rpc(
            app.clone(),
            "ListUserIssues",
            Some(&guest_cookie),
            None,
            json!({
                "filter": "commented",
                "state": "open",
                "query": "shared"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(commented["items"].as_array().unwrap().len(), 1);
    assert_eq!(commented["items"][0]["title"], "Commented shared issue");

    let shared = response_json(
        rpc(
            app.clone(),
            "ListUserIssues",
            Some(&guest_cookie),
            None,
            json!({
                "filter": "shared"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(shared["openIssueCount"], 1);
    assert_eq!(shared["sideFilterCounts"]["shared"], 1);
    assert_eq!(shared["sideFilterCounts"]["favorite"], 1);
    assert_eq!(shared["sideFilterCounts"]["mentioned"], 0);
    assert_eq!(shared["items"].as_array().unwrap().len(), 1);
    assert_eq!(shared["items"][0]["title"], "Commented shared issue");

    let shared_rest = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/user/issues?filter=shared",
            &guest_cookie,
        )
        .await,
    )
    .await;
    assert_eq!(shared_rest["filter"], "shared");
    assert_eq!(shared_rest["viewerUserId"], guest_id);
    assert_eq!(shared_rest["sideFilterCounts"]["shared"], 1);
    assert_eq!(shared_rest["items"].as_array().unwrap().len(), 1);

    let favorite = response_json(
        rpc(
            app,
            "ListUserIssues",
            Some(&guest_cookie),
            None,
            json!({
                "filter": "favorite"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(favorite["openIssueCount"], 1);
    assert_eq!(favorite["sideFilterCounts"]["shared"], 1);
    assert_eq!(favorite["sideFilterCounts"]["favorite"], 1);
    assert_eq!(favorite["sideFilterCounts"]["mentioned"], 0);
    assert_eq!(favorite["items"].as_array().unwrap().len(), 1);
    assert_eq!(favorite["items"][0]["title"], "Commented shared issue");
}
