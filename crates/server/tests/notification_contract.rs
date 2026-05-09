use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ColumnTrait, Database, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
};
use serde_json::json;
use tower::ServiceExt;
use yona_rust_persistence::{notification_event, notification_mail, AppRepository};
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

async fn rest_get(app: axum::Router, uri: &str, cookie_header: Option<&str>) -> Response<Body> {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
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
                "overview": "Notification parity",
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
                "bodyMarkdown": "body"
            }),
        )
        .await,
    )
    .await;
}

async fn share_issue(app: axum::Router, cookie: &str, csrf: &str, login_id: &str) {
    response_json(
        rpc(
            app,
            "ShareIssue",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": login_id
            }),
        )
        .await,
    )
    .await;
}

#[tokio::test]
async fn notification_contract_lists_current_user_notifications_with_paging() {
    let (app, _repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;
    share_issue(app.clone(), &owner_cookie, &owner_csrf, "guest").await;

    let payload = response_json(
        rest_get(
            app,
            "/yona/api/v1/notifications?from=0&size=1",
            Some(&guest_cookie),
        )
        .await,
    )
    .await;

    assert_eq!(payload["total"], 1);
    assert_eq!(payload["hasMore"], false);
    let items = payload["items"].as_array().unwrap();
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["eventType"], "ISSUE_SHARER_CHANGED");
    assert_eq!(items[0]["actor"]["loginId"], "owner");
    assert_eq!(items[0]["message"], "Issue is shared with guest");
    assert_eq!(items[0]["targetHref"], "/yona/owner/projectYobi/issue/1");
    assert_eq!(items[0]["targetTitle"], "Private issue");
    assert!(items[0]["createdLabel"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));
}

#[tokio::test]
async fn notification_contract_stages_mail_rows_and_drains_due_events() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;
    share_issue(app, &owner_cookie, &owner_csrf, "guest").await;

    let event = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("ISSUE_SHARER_CHANGED".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("notification event");
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        1
    );

    let created = event.created.expect("event created");
    let not_due = repo.drain_due_notification_mails(created, 1).await.unwrap();
    assert!(not_due.is_empty());
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        1
    );

    let due = repo.drain_due_notification_mails(created, 0).await.unwrap();
    assert_eq!(due, vec![event.id]);
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        0
    );
}
