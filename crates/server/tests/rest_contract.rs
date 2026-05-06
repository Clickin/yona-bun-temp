use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use serde_json::Value;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router, create_router_with_app_repository, RuntimeConfig};

fn build_router() -> axum::Router {
    create_router(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    })
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).unwrap()
}

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

async fn response_text(response: axum::response::Response) -> String {
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

async fn ok_json(response: axum::response::Response) -> Value {
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
    payload: Value,
) -> axum::response::Response {
    let mut builder = Request::builder()
        .method(Method::POST)
        .uri(format!(
            "/yona/rpc/yona.pilot.v1.PilotService/{method_name}"
        ))
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

async fn rest(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Option<Value>,
) -> axum::response::Response {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }
    if payload.is_some() {
        builder = builder.header(http::header::CONTENT_TYPE, "application/json");
    }
    app.oneshot(
        builder
            .body(Body::from(
                payload.map_or_else(String::new, |value| value.to_string()),
            ))
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
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
    assert_eq!(response.status(), StatusCode::OK);
    (csrf, cookie_header)
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str, scope: &str) {
    let response = rpc(
        app,
        "CreateProject",
        Some(cookie),
        Some(csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "overview": "rest parity",
            "projectScope": scope
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

async fn create_issue(app: axum::Router, cookie: &str, csrf: &str, title: &str) -> Value {
    ok_json(
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
    .await
}

async fn create_issue_comment(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    issue_number: i64,
    contents: &str,
) -> Value {
    ok_json(
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

#[tokio::test]
async fn rest_session_route_coexists_with_bootstrap_and_rpc() {
    let app = build_router();

    let rest_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(rest_response.status(), StatusCode::OK);
    assert!(rest_response.headers().get("x-csrf-token").is_some());
    assert!(rest_response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .any(|cookie| cookie.to_str().unwrap().starts_with("yona_session=")));
    let rest_json = response_json(rest_response).await;
    assert_eq!(
        rest_json.get("isAnonymous").and_then(Value::as_bool),
        Some(true)
    );
    assert!(rest_json
        .get("defaultLandingPath")
        .and_then(Value::as_str)
        .is_some());

    let bootstrap_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/auth/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(bootstrap_response.status(), StatusCode::OK);
    assert!(bootstrap_response.headers().get("x-csrf-token").is_some());

    let rpc_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadCurrentSession")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(rpc_response.status(), StatusCode::OK);
}

#[tokio::test]
async fn unknown_rest_route_returns_shared_json_error_envelope() {
    let response = build_router()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/unknown")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let body = response_json(response).await;
    assert_eq!(body["error"]["code"], "not_found");
    assert_eq!(body["error"]["message"], "REST endpoint not found.");
    assert_eq!(body["error"]["status"], 404);
}

#[tokio::test]
async fn rest_issue_meta_routes_manage_participation_assignment_sharing_and_comment_votes() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "REST issue").await;
    let commented = create_issue_comment(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        1,
        "comment worth agreeing with",
    )
    .await;
    let comment_id = commented["comments"][0]["id"].as_str().unwrap();

    let anonymous_watch = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
        None,
        None,
        None,
    )
    .await;
    assert_eq!(anonymous_watch.status(), StatusCode::UNAUTHORIZED);
    let anonymous_watch_body = response_json(anonymous_watch).await;
    assert_eq!(anonymous_watch_body["error"]["code"], "unauthorized");

    let watched = ok_json(
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
    assert_eq!(watched["isWatching"], true);
    assert!(watched["watcherCount"].as_u64().unwrap_or_default() >= 1);

    let voted = ok_json(
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
    assert_eq!(voted["hasVoted"], true);
    assert_eq!(voted["voterCount"], 1);

    let favorited = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/favorite",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(favorited["isFavorited"], true);

    let comment_voted = ok_json(
        rest(
            app.clone(),
            Method::POST,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/comments/{comment_id}/vote"
            ),
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(comment_voted["comments"][0]["viewerHasVoted"], true);
    assert_eq!(comment_voted["comments"][0]["voterCount"], 1);

    let assigned = ok_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignee",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "assigneeLoginId": "guest" })),
        )
        .await,
    )
    .await;
    assert_eq!(assigned["assigneeLoginId"], "guest");

    let unassigned = ok_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignee",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "assigneeLoginId": "" })),
        )
        .await,
    )
    .await;
    assert_eq!(
        unassigned
            .get("assigneeLoginId")
            .and_then(Value::as_str)
            .unwrap_or(""),
        ""
    );

    let shared = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharers",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "loginId": "guest" })),
        )
        .await,
    )
    .await;
    assert_eq!(shared["sharers"].as_array().unwrap().len(), 1);
    assert_eq!(shared["sharers"][0]["loginId"], "guest");

    let unshared = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharers/guest",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        unshared["sharers"]
            .as_array()
            .map(Vec::len)
            .unwrap_or_default(),
        0
    );

    let comment_unvoted = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/comments/{comment_id}/vote"
            ),
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        comment_unvoted["comments"][0]["viewerHasVoted"]
            .as_bool()
            .unwrap_or(false),
        false
    );

    let unwatched = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(unwatched["isWatching"].as_bool().unwrap_or(false), false);
}

#[tokio::test]
async fn rest_label_routes_manage_labels_and_categories() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;

    let created_category = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels/categories",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryName": "Priority",
                "categoryIsExclusive": false
            })),
        )
        .await,
    )
    .await;
    let category_id = created_category["category"]["id"].as_str().unwrap();
    assert_eq!(created_category["created"], true);

    let created_label = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryName": "Type",
                "categoryIsExclusive": true,
                "labelColor": "#f44336",
                "labelName": "Bug"
            })),
        )
        .await,
    )
    .await;
    let label_id = created_label["label"]["id"].as_str().unwrap();
    assert_eq!(created_label["label"]["name"], "Bug");

    let labels = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(labels["labels"].as_array().unwrap().len(), 1);

    let updated_category = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/labels/categories/{category_id}"
            ),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryName": "Priority+",
                "categoryIsExclusive": true
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated_category["category"]["name"], "Priority+");
    assert_eq!(updated_category["category"]["isExclusive"], true);

    let updated_label = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/labels/{label_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "categoryId": created_label["label"]["categoryId"].as_str().unwrap().parse::<i64>().unwrap(),
                "labelColor": "#00ff00",
                "labelName": "Task"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated_label["label"]["name"], "Task");
    assert_eq!(updated_label["label"]["color"], "#00ff00");

    let deleted_label = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/labels/{label_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted_label["ok"], true);

    let deleted_category = ok_json(
        rest(
            app,
            Method::DELETE,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/labels/categories/{category_id}"
            ),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted_category["ok"], true);
}

#[tokio::test]
async fn rest_milestone_routes_manage_crud_and_state() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;

    let created = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/milestones",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "v1.0",
                "contentsMarkdown": "Ship **parity**",
                "dueDate": "2026-05-09",
                "state": "open",
                "attachmentIds": []
            })),
        )
        .await,
    )
    .await;
    let milestone_id = created["milestone"]["id"].as_str().unwrap();
    assert_eq!(created["milestone"]["title"], "v1.0");

    let listed = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/milestones?state=open&orderBy=dueDate&orderDir=asc",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(listed["milestones"].as_array().unwrap().len(), 1);

    let detail = ok_json(
        rest(
            app.clone(),
            Method::GET,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/milestones/{milestone_id}"),
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(detail["milestone"]["title"], "v1.0");

    let updated = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/milestones/{milestone_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "v1.0 patched",
                "contentsMarkdown": "Updated",
                "dueDate": "2026-05-11",
                "state": "closed",
                "attachmentIds": []
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["milestone"]["title"], "v1.0 patched");
    assert_eq!(updated["milestone"]["state"], "closed");

    let opened = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/milestones/{milestone_id}/state"
            ),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "state": "open" })),
        )
        .await,
    )
    .await;
    assert_eq!(opened["milestone"]["state"], "open");

    let deleted = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/milestones/{milestone_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted["ok"], true);

    let empty_list = ok_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/milestones?state=all&orderBy=dueDate&orderDir=asc",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        empty_list["milestones"]
            .as_array()
            .map(Vec::len)
            .unwrap_or_default(),
        0
    );
}
