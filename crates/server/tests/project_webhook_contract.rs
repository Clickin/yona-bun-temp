use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{Database, DatabaseConnection, EntityTrait, PaginatorTrait};
use serde_json::{json, Value};
use std::sync::{Mutex, OnceLock};
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_integrations::{
    clear_test_webhook_outbox, queue_test_webhook_failure, queue_test_webhook_response,
    snapshot_test_webhook_outbox, IntegrationConfig,
};
use yona_rust_persistence::{webhook, webhook_delivery, webhook_thread, AppRepository};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router_with_app_repository, create_router_with_repository_and_app_config,
    AppRuntimeConfig, RuntimeConfig,
};

mod rest_test_support;

fn yona_data_env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

async fn build_app_with_repository() -> (axum::Router, DatabaseConnection) {
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
        app_repo,
    );
    (app, db)
}

async fn build_app_with_app_config(
    app_config: AppRuntimeConfig,
) -> (axum::Router, DatabaseConnection) {
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
        app_repo,
        app_config,
    );
    (app, db)
}

async fn response_text(response: Response<Body>) -> String {
    String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .expect("response body")
            .to_bytes()
            .to_vec(),
    )
    .expect("utf-8 response")
}

async fn ok_json(response: Response<Body>) -> Value {
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
    let cookies = response
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
        .collect::<Vec<_>>()
        .join("; ");
    (csrf, cookies)
}

async fn rest(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Option<Value>,
) -> Response<Body> {
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

async fn rest_form(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    form_body: &str,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header(
            http::header::CONTENT_TYPE,
            "application/x-www-form-urlencoded",
        )
        .header(http::header::ACCEPT, "application/json");
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }

    app.oneshot(builder.body(Body::from(form_body.to_string())).unwrap())
        .await
        .unwrap()
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = rest_test_support::pilot_rest(
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
    ok_json(response).await;
    (csrf, cookie_header)
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str) {
    ok_json(
        rest(
            app,
            Method::POST,
            "/yona/api/v1/owners/owner/projects",
            Some(cookie),
            Some(csrf),
            Some(json!({
                "overview": "webhook parity",
                "projectName": "projectYobi",
                "projectScope": "public",
            })),
        )
        .await,
    )
    .await;
}

#[tokio::test]
async fn project_webhooks_enqueue_legacy_board_posting_payloads_for_non_json_hooks() {
    // Guards legacy Webhook.sendRequestToPayloadUrl(NEW_POSTING, Posting)
    // through the project-owned webhook dispatch module.
    clear_test_webhook_outbox();
    let (app, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
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
                "gitPush": false,
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
                "gitPush": true,
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
                "bodyMarkdown": "Created from project webhook test",
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
    let payload: Value = serde_json::from_str(&delivery.body).expect("posting webhook payload");
    let text = payload["text"].as_str().unwrap_or_default();
    assert!(text.contains("[projectYobi] owner"));
    assert!(text.contains("notification.type.new.posting"));
    assert!(text.contains("/yona/owner/projectYobi/post/1|#1: Board webhook parity"));

    clear_test_webhook_outbox();
}

#[tokio::test]
async fn project_webhooks_enqueue_legacy_board_comment_payloads_for_non_json_hooks() {
    // Guards legacy Webhook.sendRequestToPayloadUrl(NEW_COMMENT/COMMENT_UPDATED, Comment)
    // for board posting comments through the project-owned webhook dispatch module.
    clear_test_webhook_outbox();
    let (app, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/comment-simple",
                "secret": "comment-secret",
                "webhookType": "SIMPLE",
                "gitPush": false,
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
                "payloadUrl": "https://hooks.example/comment-slack",
                "secret": "",
                "webhookType": "DETAIL_SLACK",
                "gitPush": false,
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
                "payloadUrl": "https://hooks.example/comment-json",
                "secret": "json-secret",
                "webhookType": "JSON",
                "gitPush": true,
            })),
        )
        .await,
    )
    .await;

    let created_post = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Board comment webhook parity",
                "bodyMarkdown": "Created before comment webhook test",
            })),
        )
        .await,
    )
    .await;
    assert_eq!(created_post["postNumber"], "1");
    clear_test_webhook_outbox();

    let commented = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/posts/1/comments",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "First board comment body",
            })),
        )
        .await,
    )
    .await;
    let comment_id = commented["comments"][0]["id"].as_str().expect("comment id");

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 2);
    assert!(deliveries
        .iter()
        .all(|delivery| delivery.event_type == "NEW_COMMENT"));
    let simple = deliveries
        .iter()
        .find(|delivery| delivery.webhook_type == "SIMPLE")
        .expect("simple comment webhook");
    assert_eq!(simple.payload_url, "https://hooks.example/comment-simple");
    assert!(simple
        .headers
        .iter()
        .any(|header| header.name == "Authorization" && header.value == "token comment-secret "));
    let simple_payload: Value =
        serde_json::from_str(&simple.body).expect("simple comment webhook payload");
    let simple_text = simple_payload["text"].as_str().unwrap_or_default();
    assert!(simple_text.contains("[projectYobi] owner"));
    assert!(simple_text.contains("notification.type.new.comment"));
    assert!(simple_text.contains(&format!(
        "/yona/owner/projectYobi/post/1#comment-{comment_id}|#1: Board comment webhook parity"
    )));

    let slack = deliveries
        .iter()
        .find(|delivery| delivery.webhook_type == "DETAIL_SLACK")
        .expect("slack comment webhook");
    let slack_payload: Value =
        serde_json::from_str(&slack.body).expect("slack comment webhook payload");
    assert_eq!(
        slack_payload["attachments"][0]["text"],
        "First board comment body"
    );
    assert_eq!(slack_payload["attachments"][0]["fields"], Value::Null);
    clear_test_webhook_outbox();

    ok_json(
        rest(
            app,
            Method::PATCH,
            &format!("/yona/api/v1/projects/owner/projectYobi/posts/1/comments/{comment_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "Updated board comment body",
            })),
        )
        .await,
    )
    .await;

    let updated_deliveries = snapshot_test_webhook_outbox();
    assert_eq!(updated_deliveries.len(), 2);
    assert!(updated_deliveries
        .iter()
        .all(|delivery| delivery.event_type == "COMMENT_UPDATED"));
    let updated_simple = updated_deliveries
        .iter()
        .find(|delivery| delivery.webhook_type == "SIMPLE")
        .expect("updated simple comment webhook");
    let updated_payload: Value =
        serde_json::from_str(&updated_simple.body).expect("updated comment webhook payload");
    let updated_text = updated_payload["text"].as_str().unwrap_or_default();
    assert!(updated_text.contains("notification.type.comment.updated"));
    assert!(updated_text.contains(&format!(
        "/yona/owner/projectYobi/post/1#comment-{comment_id}|#1: Board comment webhook parity"
    )));

    clear_test_webhook_outbox();
}

#[tokio::test]
async fn project_webhooks_enqueue_legacy_issue_payloads_for_non_json_hooks() {
    // Keeps the route-owned webhook dispatch module covered after the
    // projects.rs -> projects/webhooks.rs split.
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/simple",
                "secret": "s3",
                "webhookType": "SIMPLE",
                "gitPush": false,
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
                "payloadUrl": "https://hooks.example/json",
                "secret": "json-secret",
                "webhookType": "JSON",
                "gitPush": true,
            })),
        )
        .await,
    )
    .await;

    let issue = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "First webhook issue",
                "bodyMarkdown": "Issue body for the webhook payload",
            })),
        )
        .await,
    )
    .await;
    assert_eq!(issue["issueNumber"], "1");

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    let created = &deliveries[0];
    assert_eq!(created.payload_url, "https://hooks.example/simple");
    assert_eq!(created.event_type, "NEW_ISSUE");
    assert_eq!(created.webhook_type, "SIMPLE");
    assert!(created
        .headers
        .iter()
        .any(|header| header.name == "Authorization" && header.value == "token s3 "));
    let created_payload: Value =
        serde_json::from_str(&created.body).expect("created issue webhook payload");
    let created_text = created_payload["text"].as_str().unwrap_or_default();
    assert!(created_text.contains("[projectYobi] owner"));
    assert!(created_text.contains("notification.type.new.issue"));
    assert!(created_text.contains("/yona/owner/projectYobi/issue/1|#1: First webhook issue"));
    let history = webhook_delivery::Entity::find()
        .all(&_db)
        .await
        .expect("webhook delivery history rows");
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].webhook_id, Some(1));
    assert_eq!(history[0].event_type.as_deref(), Some("NEW_ISSUE"));
    assert_eq!(history[0].webhook_type.as_deref(), Some("SIMPLE"));
    assert_eq!(
        history[0].payload_url.as_deref(),
        Some("https://hooks.example/simple")
    );
    assert_eq!(history[0].status.as_deref(), Some("SUCCESS"));
    assert!(history[0].request_body.as_deref().is_some_and(|body| {
        body.contains("notification.type.new.issue")
            && body.contains("/yona/owner/projectYobi/issue/1|#1: First webhook issue")
    }));
    assert!(history[0].error_message.is_none());
    let webhooks_with_history = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    let response_history = webhooks_with_history["deliveries"]
        .as_array()
        .expect("webhook delivery history response");
    assert_eq!(response_history.len(), 1);
    assert_eq!(response_history[0]["webhookId"], 1);
    assert_eq!(response_history[0]["eventType"], "NEW_ISSUE");
    assert_eq!(response_history[0]["webhookType"], "SIMPLE");
    assert_eq!(
        response_history[0]["payloadUrl"],
        "https://hooks.example/simple"
    );
    assert_eq!(response_history[0]["status"], "SUCCESS");
    assert!(response_history[0]["requestBody"]
        .as_str()
        .is_some_and(|body| body.contains("notification.type.new.issue")));

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/comments",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "Webhook comment body",
            })),
        )
        .await,
    )
    .await;

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 2);
    let commented = &deliveries[1];
    assert_eq!(commented.payload_url, "https://hooks.example/simple");
    assert_eq!(commented.event_type, "NEW_COMMENT");
    let commented_payload: Value =
        serde_json::from_str(&commented.body).expect("comment webhook payload");
    let commented_text = commented_payload["text"].as_str().unwrap_or_default();
    assert!(commented_text.contains("notification.type.new.comment"));
    assert!(commented_text.contains("/yona/owner/projectYobi/issue/1#comment-"));
    assert!(commented_text.contains("|#1: First webhook issue"));

    clear_test_webhook_outbox();
    ok_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/state",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "state": "closed" })),
        )
        .await,
    )
    .await;

    let state_deliveries = snapshot_test_webhook_outbox();
    assert_eq!(state_deliveries.len(), 1);
    let state_changed = &state_deliveries[0];
    assert_eq!(state_changed.payload_url, "https://hooks.example/simple");
    assert_eq!(state_changed.event_type, "ISSUE_STATE_CHANGED");
    assert_eq!(state_changed.webhook_type, "SIMPLE");
    let state_payload: Value =
        serde_json::from_str(&state_changed.body).expect("state webhook payload");
    let state_text = state_payload["text"].as_str().unwrap_or_default();
    assert!(state_text.contains("notification.type.issue.state.changed"));
    assert!(state_text.contains("/yona/owner/projectYobi/issue/1|#1: First webhook issue"));

    clear_test_webhook_outbox();
    ok_json(
        rest(
            app,
            Method::DELETE,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;

    let deleted_deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deleted_deliveries.len(), 1);
    let deleted = &deleted_deliveries[0];
    assert_eq!(deleted.payload_url, "https://hooks.example/simple");
    assert_eq!(deleted.event_type, "RESOURCE_DELETED");
    assert_eq!(deleted.webhook_type, "SIMPLE");
    let deleted_payload: Value =
        serde_json::from_str(&deleted.body).expect("deleted issue webhook payload");
    let deleted_text = deleted_payload["text"].as_str().unwrap_or_default();
    assert!(deleted_text.contains("notification.type.issue.deleted"));
    assert!(deleted_text.contains("/yona/owner/projectYobi/issue/1|#1: First webhook issue"));

    clear_test_webhook_outbox();
}

#[tokio::test]
async fn project_webhooks_enqueue_legacy_issue_body_changed_payloads_for_non_json_hooks() {
    // Guards legacy NotificationEvent.afterIssueBodyChanged -> Webhook fan-out.
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/issue-body",
                "secret": "body-secret",
                "webhookType": "SIMPLE",
                "gitPush": false,
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
                "payloadUrl": "https://hooks.example/issue-json",
                "secret": "json-secret",
                "webhookType": "JSON",
                "gitPush": true,
            })),
        )
        .await,
    )
    .await;

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Issue body webhook parity",
                "bodyMarkdown": "Original issue body",
            })),
        )
        .await,
    )
    .await;
    clear_test_webhook_outbox();

    let updated = ok_json(
        rest(
            app,
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Issue body webhook parity",
                "bodyMarkdown": "Updated issue body",
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["bodyMarkdown"], "Updated issue body");

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    let delivery = &deliveries[0];
    assert_eq!(delivery.payload_url, "https://hooks.example/issue-body");
    assert_eq!(delivery.event_type, "ISSUE_BODY_CHANGED");
    assert_eq!(delivery.webhook_type, "SIMPLE");
    assert!(delivery
        .headers
        .iter()
        .any(|header| header.name == "Authorization" && header.value == "token body-secret "));
    let payload: Value = serde_json::from_str(&delivery.body).expect("issue body webhook payload");
    let text = payload["text"].as_str().unwrap_or_default();
    assert!(text.contains("[projectYobi] owner"));
    assert!(text.contains("notification.type.issue.body.changed"));
    assert!(text.contains("/yona/owner/projectYobi/issue/1|#1: Issue body webhook parity"));

    clear_test_webhook_outbox();
}

#[tokio::test]
async fn project_webhooks_retry_transient_delivery_failures_once_configured() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, db) = build_app_with_app_config(AppRuntimeConfig {
        integrations: IntegrationConfig::from_pairs([("YONA_WEBHOOK_DELIVERY_RETRIES", "1")]),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/retry",
                "secret": "s3",
                "webhookType": "SIMPLE",
                "gitPush": false,
            })),
        )
        .await,
    )
    .await;
    queue_test_webhook_failure("temporary delivery failure");
    queue_test_webhook_response("retried-ok");

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Retried webhook issue",
                "bodyMarkdown": "Issue body for retry",
            })),
        )
        .await,
    )
    .await;

    let attempts = snapshot_test_webhook_outbox();
    assert_eq!(attempts.len(), 2);
    assert!(attempts
        .iter()
        .all(|attempt| attempt.payload_url == "https://hooks.example/retry"));
    let history = webhook_delivery::Entity::find()
        .all(&db)
        .await
        .expect("webhook delivery history rows");
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].status.as_deref(), Some("SUCCESS"));
    assert_eq!(history[0].response_body.as_deref(), Some("retried-ok"));
    assert!(history[0].error_message.is_none());

    clear_test_webhook_outbox();
}

#[tokio::test]
async fn project_webhooks_persist_hangout_thread_names_for_resource_followups() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    let created = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/hangout",
                "secret": "",
                "webhookType": "DETAIL_HANGOUT_CHAT",
                "gitPush": false,
            })),
        )
        .await,
    )
    .await;
    let webhook_id = created["webhooks"][0]["id"].as_i64().expect("webhook id");

    queue_test_webhook_response(json!({
        "thread": {
            "name": "spaces/AAAA/threads/issue-1"
        }
    }));
    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "title": "Hangout threaded issue",
                "bodyMarkdown": "Issue body for hangout thread",
            })),
        )
        .await,
    )
    .await;

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    assert_eq!(deliveries[0].webhook_type, "DETAIL_HANGOUT_CHAT");
    let created_payload: Value =
        serde_json::from_str(&deliveries[0].body).expect("created hangout payload");
    assert_eq!(created_payload["thread"], json!({}));

    let rows = webhook_thread::Entity::find()
        .all(&db)
        .await
        .expect("webhook thread rows");
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].webhook_id, Some(webhook_id));
    assert_eq!(rows[0].resource_type.as_deref(), Some("ISSUE_POST"));
    assert_eq!(
        rows[0].thread_id.as_deref(),
        Some("spaces/AAAA/threads/issue-1")
    );
    assert!(rows[0].created_at.is_some());

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/comments",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "contentsMarkdown": "Hangout follow-up",
            })),
        )
        .await,
    )
    .await;

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 2);
    let commented_payload: Value =
        serde_json::from_str(&deliveries[1].body).expect("comment hangout payload");
    assert_eq!(
        commented_payload["thread"],
        json!({
            "name": "spaces/AAAA/threads/issue-1"
        })
    );
    assert_eq!(
        webhook_thread::Entity::find()
            .count(&db)
            .await
            .expect("webhook thread count"),
        1
    );
}

#[tokio::test]
async fn project_webhooks_require_update_and_manage_crud() {
    // Keeps the route-owned webhook CRUD module covered after the
    // projects.rs -> projects/webhooks.rs split. The direct CRUD aliases reuse
    // the app-scoped service/runtime config for redirects and persistence.
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    let forbidden = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
        Some(&guest_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let empty = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(empty["ownerName"], "owner");
    assert_eq!(empty["projectName"], "projectYobi");
    assert_eq!(empty["viewerCanUpdate"], true);
    assert_eq!(
        empty["webhookTypes"],
        json!(["SIMPLE", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT", "JSON"])
    );
    assert_eq!(empty["webhooks"].as_array().unwrap().len(), 0);

    let invalid = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({
            "payloadUrl": "",
            "secret": "",
            "webhookType": "SIMPLE",
            "gitPush": false,
        })),
    )
    .await;
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);

    let direct_created = rest_form(
        app.clone(),
        Method::POST,
        "/yona/owner/projectYobi/webhooks",
        Some(&owner_cookie),
        Some(&owner_csrf),
        "payloadUrl=https%3A%2F%2Fhooks.example%2Fyona&secret=s3&webhookType=DETAIL_SLACK&gitPush=on",
    )
    .await;
    assert_eq!(direct_created.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        direct_created
            .headers()
            .get(http::header::LOCATION)
            .unwrap(),
        "/yona/owner/projectYobi/webhooks"
    );
    let created = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    let items = created["webhooks"].as_array().unwrap();
    assert_eq!(items.len(), 1);
    let created_id = items[0]["id"].as_i64().expect("created webhook id");
    assert_eq!(items[0]["payloadUrl"], "https://hooks.example/yona");
    assert_eq!(items[0]["secret"], "s3");
    assert_eq!(items[0]["webhookType"], "DETAIL_SLACK");
    assert_eq!(items[0]["gitPush"], true);

    let row = webhook::Entity::find()
        .one(&db)
        .await
        .expect("webhook lookup")
        .expect("webhook row");
    assert_eq!(
        row.payload_url.as_deref(),
        Some("https://hooks.example/yona")
    );
    assert_eq!(row.secret.as_deref(), Some("s3"));
    assert_eq!(row.git_push, Some(1));
    assert_eq!(row.webhook_type, Some(1));

    let forbidden_create = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
        Some(&guest_cookie),
        Some(&guest_csrf),
        Some(json!({
            "payloadUrl": "https://hooks.example/guest",
            "secret": "",
            "webhookType": "SIMPLE",
            "gitPush": false,
        })),
    )
    .await;
    assert_eq!(forbidden_create.status(), StatusCode::FORBIDDEN);

    let deleted = rest(
        app.clone(),
        Method::DELETE,
        &format!("/yona/owner/projectYobi/webhooks/{created_id}"),
        Some(&owner_cookie),
        Some(&owner_csrf),
        None,
    )
    .await;
    assert_eq!(deleted.status(), StatusCode::OK);
    assert_eq!(response_text(deleted).await, "");
    let deleted_list = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted_list["webhooks"].as_array().unwrap().len(), 0);
    assert_eq!(
        webhook::Entity::find()
            .count(&db)
            .await
            .expect("webhook count"),
        0
    );

    let missing_delete = rest(
        app,
        Method::DELETE,
        "/yona/api/v1/owners/owner/projects/projectYobi/webhooks/99999",
        Some(&owner_cookie),
        Some(&owner_csrf),
        None,
    )
    .await;
    assert_eq!(missing_delete.status(), StatusCode::NOT_FOUND);
}
