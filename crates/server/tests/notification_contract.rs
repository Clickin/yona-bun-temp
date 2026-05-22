use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::entity::prelude::DateTimeUtc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, NotSet,
    PaginatorTrait, QueryFilter, Set,
};
use serde_json::json;
use std::sync::{Mutex, OnceLock};
use std::time::SystemTime;
use tower::ServiceExt;
use yona_rust_integrations::{clear_test_outbox, snapshot_test_outbox};
use yona_rust_persistence::{
    issue_event, n4user, notification_event, notification_event_n4user, notification_mail,
    AppRepository,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router_with_app_repository, deliver_due_notification_mails, RuntimeConfig,
};

mod rest_test_support;

fn notification_mail_env_lock() -> &'static Mutex<()> {
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

async fn update_issue_body(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    title: &str,
    body_markdown: &str,
) {
    response_json(
        rpc(
            app,
            "UpdateIssue",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "title": title,
                "bodyMarkdown": body_markdown
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
async fn notification_contract_stages_issue_state_change_rows_for_watchers() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (watcher_csrf, watcher_cookie, _) = register_user(app.clone(), "watcher").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "State change watched issue",
    )
    .await;

    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
            Some(&watcher_cookie),
            Some(&watcher_csrf),
            None,
        )
        .await,
    )
    .await;

    let updated = response_json(
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
    assert_eq!(updated["state"], "closed");

    let payload = response_json(
        rest_get(
            app,
            "/yona/api/v1/notifications?from=0&size=5",
            Some(&watcher_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(payload["total"], 1);
    let items = payload["items"].as_array().unwrap();
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["eventType"], "ISSUE_STATE_CHANGED");
    assert_eq!(items[0]["actor"]["loginId"], "owner");
    assert_eq!(items[0]["message"], "notification.issue.closed");
    assert_eq!(items[0]["targetHref"], "/yona/owner/projectYobi/issue/1");
    assert_eq!(items[0]["targetTitle"], "State change watched issue");
    assert_eq!(items[0]["typeIcon"], "list-alt closed");

    let event = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("ISSUE_STATE_CHANGED".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("notification event");
    assert_eq!(event.resource_type.as_deref(), Some("issue"));
    assert_eq!(event.resource_id.as_deref(), Some("1"));

    let mail_count = notification_mail::Entity::find()
        .filter(notification_mail::Column::NotificationEventId.eq(Some(event.id)))
        .count(&db)
        .await
        .unwrap();
    assert_eq!(mail_count, 1);

    let issue_event = issue_event::Entity::find()
        .filter(issue_event::Column::IssueId.eq(Some(1)))
        .filter(issue_event::Column::EventType.eq(Some("ISSUE_STATE_CHANGED".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("issue event");
    assert_eq!(issue_event.sender_login_id.as_deref(), Some("owner"));
}

#[tokio::test]
async fn notification_contract_stages_mass_update_issue_state_rows_for_watchers() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (watcher_csrf, watcher_cookie, _) = register_user(app.clone(), "watcher").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Mass state issue A",
    )
    .await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Mass state issue B",
    )
    .await;

    for issue_number in [1, 2] {
        response_json(
            rest(
                app.clone(),
                Method::POST,
                &format!(
                    "/yona/api/v1/owners/owner/projects/projectYobi/issues/{issue_number}/watch"
                ),
                Some(&watcher_cookie),
                Some(&watcher_csrf),
                None,
            )
            .await,
        )
        .await;
    }

    let updated = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/mass-update",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "issueNumbers": ["1", "2"],
                "state": "closed"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(updated["items"].as_array().unwrap().len(), 2);
    assert!(updated["items"]
        .as_array()
        .unwrap()
        .iter()
        .all(|item| item["state"] == "closed"));

    let payload = response_json(
        rest_get(
            app,
            "/yona/api/v1/notifications?from=0&size=5",
            Some(&watcher_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(payload["total"], 2);
    let items = payload["items"].as_array().unwrap();
    let target_titles = items
        .iter()
        .map(|item| item["targetTitle"].as_str().unwrap())
        .collect::<std::collections::HashSet<_>>();
    assert_eq!(
        target_titles,
        std::collections::HashSet::from(["Mass state issue A", "Mass state issue B"])
    );
    assert!(items.iter().all(|item| {
        item["eventType"] == "ISSUE_STATE_CHANGED"
            && item["actor"]["loginId"] == "owner"
            && item["message"] == "notification.issue.closed"
            && item["typeIcon"] == "list-alt closed"
    }));

    let notification_count = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("ISSUE_STATE_CHANGED".to_string())))
        .count(&db)
        .await
        .unwrap();
    assert_eq!(notification_count, 2);

    let mail_count = notification_mail::Entity::find().count(&db).await.unwrap();
    assert_eq!(mail_count, 2);

    let issue_event_count = issue_event::Entity::find()
        .filter(issue_event::Column::EventType.eq(Some("ISSUE_STATE_CHANGED".to_string())))
        .count(&db)
        .await
        .unwrap();
    assert_eq!(issue_event_count, 2);
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

#[tokio::test]
async fn notification_contract_delivers_due_mail_rows_to_receivers() {
    let _guard = notification_mail_env_lock().lock().unwrap();
    std::env::remove_var("YONA_ALLOWED_MAIL_DOMAINS");
    std::env::set_var("YONA_NOTIFICATION_MAIL_HIDE_ADDRESS", "false");
    clear_test_outbox();
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (watcher_csrf, watcher_cookie, _) = register_user(app.clone(), "watcher").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Mail fan-out watched issue",
    )
    .await;
    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
            Some(&watcher_cookie),
            Some(&watcher_csrf),
            None,
        )
        .await,
    )
    .await;
    response_json(
        rest(
            app,
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/state",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "state": "closed" })),
        )
        .await,
    )
    .await;

    let event = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("ISSUE_STATE_CHANGED".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("state change event");
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        1
    );

    let delivered = deliver_due_notification_mails(
        &repo,
        event.created.expect("event created"),
        0,
        "https://yona.example",
        "/yona",
    )
    .await
    .unwrap();
    assert_eq!(delivered, 1);
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        0
    );

    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].to, "watcher@example.com");
    assert_eq!(outbox[0].subject, "Mail fan-out watched issue");
    assert!(outbox[0].body.contains("notification.issue.closed"));
    assert!(outbox[0]
        .body
        .contains("https://yona.example/yona/owner/projectYobi/issue/1"));
    clear_test_outbox();
    std::env::remove_var("YONA_NOTIFICATION_MAIL_HIDE_ADDRESS");
}

#[tokio::test]
async fn notification_contract_filters_due_mail_receivers_by_allowed_domains() {
    let _guard = notification_mail_env_lock().lock().unwrap();
    std::env::set_var("YONA_ALLOWED_MAIL_DOMAINS", "allowed.example.com");
    std::env::set_var("YONA_NOTIFICATION_MAIL_HIDE_ADDRESS", "false");
    clear_test_outbox();
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (allowed_csrf, allowed_cookie, allowed_id) = register_user(app.clone(), "allowed").await;
    let (blocked_csrf, blocked_cookie, _) = register_user(app.clone(), "blocked").await;
    let allowed_user = n4user::Entity::find_by_id(allowed_id)
        .one(&db)
        .await
        .unwrap()
        .expect("allowed user");
    let mut allowed_user = n4user::ActiveModel::from(allowed_user);
    allowed_user.email = Set(Some("allowed@allowed.example.com".to_string()));
    allowed_user.update(&db).await.unwrap();

    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Allowed-domain watched issue",
    )
    .await;
    for (cookie, csrf) in [
        (allowed_cookie.as_str(), allowed_csrf.as_str()),
        (blocked_cookie.as_str(), blocked_csrf.as_str()),
    ] {
        response_json(
            rest(
                app.clone(),
                Method::POST,
                "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
                Some(cookie),
                Some(csrf),
                None,
            )
            .await,
        )
        .await;
    }
    response_json(
        rest(
            app,
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/state",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "state": "closed" })),
        )
        .await,
    )
    .await;

    let event = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("ISSUE_STATE_CHANGED".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("state change event");

    let delivered = deliver_due_notification_mails(
        &repo,
        event.created.expect("event created"),
        0,
        "https://yona.example",
        "/yona",
    )
    .await
    .unwrap();

    assert_eq!(delivered, 1);
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        0
    );
    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].to, "allowed@allowed.example.com");
    clear_test_outbox();
    std::env::remove_var("YONA_ALLOWED_MAIL_DOMAINS");
    std::env::remove_var("YONA_NOTIFICATION_MAIL_HIDE_ADDRESS");
}

#[tokio::test]
async fn notification_contract_skips_due_mail_when_resource_no_longer_exists() {
    let _guard = notification_mail_env_lock().lock().unwrap();
    std::env::remove_var("YONA_ALLOWED_MAIL_DOMAINS");
    std::env::remove_var("YONA_NOTIFICATION_MAIL_HIDE_ADDRESS");
    clear_test_outbox();
    let (app, repo, db) = build_app_with_repository().await;
    let (_, _, owner_id) = register_user(app.clone(), "owner").await;
    let (_, _, watcher_id) = register_user(app, "watcher").await;

    let event = notification_event::ActiveModel {
        id: NotSet,
        title: Set(None),
        sender_id: Set(Some(owner_id)),
        created: Set(Some(DateTimeUtc::from(SystemTime::now()).naive_utc())),
        resource_type: Set(Some("ISSUE".to_string())),
        resource_id: Set(Some("999999".to_string())),
        event_type: Set(Some("ISSUE_STATE_CHANGED".to_string())),
    }
    .insert(&db)
    .await
    .unwrap();
    notification_mail::ActiveModel {
        id: NotSet,
        notification_event_id: Set(Some(event.id)),
    }
    .insert(&db)
    .await
    .unwrap();
    notification_event_n4user::ActiveModel {
        notification_event_id: Set(event.id),
        n4user_id: Set(watcher_id),
    }
    .insert(&db)
    .await
    .unwrap();

    let delivered = deliver_due_notification_mails(
        &repo,
        event.created.expect("event created"),
        0,
        "https://yona.example",
        "/yona",
    )
    .await
    .unwrap();

    assert_eq!(delivered, 0);
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        0
    );
    assert!(snapshot_test_outbox().is_empty());
    clear_test_outbox();
}

#[tokio::test]
async fn notification_contract_hides_recipient_addresses_in_bcc_mode() {
    let _guard = notification_mail_env_lock().lock().unwrap();
    std::env::remove_var("YONA_ALLOWED_MAIL_DOMAINS");
    std::env::set_var("YONA_NOTIFICATION_MAIL_HIDE_ADDRESS", "true");
    std::env::remove_var("YONA_NOTIFICATION_MAIL_RECIPIENT_LIMIT");
    std::env::set_var("SMTP_FROM", "notifications@yona.local");
    clear_test_outbox();
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (watcher_csrf, watcher_cookie, _) = register_user(app.clone(), "watcher").await;
    let (observer_csrf, observer_cookie, _) = register_user(app.clone(), "observer").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Hidden recipient watched issue",
    )
    .await;
    for (cookie, csrf) in [
        (watcher_cookie.as_str(), watcher_csrf.as_str()),
        (observer_cookie.as_str(), observer_csrf.as_str()),
    ] {
        response_json(
            rest(
                app.clone(),
                Method::POST,
                "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
                Some(cookie),
                Some(csrf),
                None,
            )
            .await,
        )
        .await;
    }
    response_json(
        rest(
            app,
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/state",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "state": "closed" })),
        )
        .await,
    )
    .await;

    let event = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("ISSUE_STATE_CHANGED".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("state change event");

    let delivered = deliver_due_notification_mails(
        &repo,
        event.created.expect("event created"),
        0,
        "https://yona.example",
        "/yona",
    )
    .await
    .unwrap();

    assert_eq!(delivered, 1);
    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].to, "notifications@yona.local");
    assert_eq!(
        outbox[0].bcc,
        vec![
            "observer@example.com".to_string(),
            "watcher@example.com".to_string()
        ]
    );
    clear_test_outbox();
    std::env::remove_var("SMTP_FROM");
    std::env::remove_var("YONA_NOTIFICATION_MAIL_HIDE_ADDRESS");
}

#[tokio::test]
async fn notification_contract_partitions_bcc_mail_by_recipient_limit() {
    let _guard = notification_mail_env_lock().lock().unwrap();
    std::env::remove_var("YONA_ALLOWED_MAIL_DOMAINS");
    std::env::set_var("YONA_NOTIFICATION_MAIL_HIDE_ADDRESS", "true");
    std::env::set_var("YONA_NOTIFICATION_MAIL_RECIPIENT_LIMIT", "2");
    std::env::set_var("SMTP_FROM", "notifications@yona.local");
    clear_test_outbox();
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (watcher_csrf, watcher_cookie, _) = register_user(app.clone(), "watcher").await;
    let (observer_csrf, observer_cookie, _) = register_user(app.clone(), "observer").await;
    let (reviewer_csrf, reviewer_cookie, _) = register_user(app.clone(), "reviewer").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Limited recipient watched issue",
    )
    .await;
    for (cookie, csrf) in [
        (watcher_cookie.as_str(), watcher_csrf.as_str()),
        (observer_cookie.as_str(), observer_csrf.as_str()),
        (reviewer_cookie.as_str(), reviewer_csrf.as_str()),
    ] {
        response_json(
            rest(
                app.clone(),
                Method::POST,
                "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/watch",
                Some(cookie),
                Some(csrf),
                None,
            )
            .await,
        )
        .await;
    }
    response_json(
        rest(
            app,
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/state",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "state": "closed" })),
        )
        .await,
    )
    .await;

    let event = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("ISSUE_STATE_CHANGED".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("state change event");

    let delivered = deliver_due_notification_mails(
        &repo,
        event.created.expect("event created"),
        0,
        "https://yona.example",
        "/yona",
    )
    .await
    .unwrap();

    assert_eq!(delivered, 3);
    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 3);
    assert!(outbox
        .iter()
        .all(|mail| mail.to == "notifications@yona.local" && mail.bcc.len() == 1));
    let mut recipients = outbox
        .into_iter()
        .flat_map(|mail| mail.bcc)
        .collect::<Vec<_>>();
    recipients.sort();
    assert_eq!(
        recipients,
        vec![
            "observer@example.com".to_string(),
            "reviewer@example.com".to_string(),
            "watcher@example.com".to_string()
        ]
    );
    clear_test_outbox();
    std::env::remove_var("SMTP_FROM");
    std::env::remove_var("YONA_NOTIFICATION_MAIL_HIDE_ADDRESS");
    std::env::remove_var("YONA_NOTIFICATION_MAIL_RECIPIENT_LIMIT");
}

#[tokio::test]
async fn notification_contract_merges_same_sender_resource_events_within_draft_time() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, guest_cookie, guest_id) = register_user(app.clone(), "guest").await;
    let (_, other_cookie, other_id) = register_user(app.clone(), "other").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Draft merge issue").await;

    update_issue_body(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Draft merge issue",
        "first edit @guest",
    )
    .await;
    update_issue_body(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Draft merge issue",
        "second edit @other",
    )
    .await;

    let event = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("ISSUE_BODY_CHANGED".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("merged issue body event");
    assert_eq!(
        notification_event::Entity::find()
            .filter(
                notification_event::Column::EventType.eq(Some("ISSUE_BODY_CHANGED".to_string()))
            )
            .count(&db)
            .await
            .unwrap(),
        1
    );
    assert_eq!(
        notification_event_n4user::Entity::find_by_id((event.id, guest_id))
            .one(&db)
            .await
            .unwrap(),
        None
    );
    assert!(
        notification_event_n4user::Entity::find_by_id((event.id, other_id))
            .one(&db)
            .await
            .unwrap()
            .is_some()
    );
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        1
    );

    let guest_notifications = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/notifications?from=0&size=5",
            Some(&guest_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(guest_notifications["total"], 0);

    let other_notifications = response_json(
        rest_get(
            app,
            "/yona/api/v1/notifications?from=0&size=5",
            Some(&other_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(other_notifications["total"], 1);
    assert_eq!(
        other_notifications["items"][0]["eventType"],
        "ISSUE_BODY_CHANGED"
    );
    assert_eq!(
        other_notifications["items"][0]["message"],
        "Issue body changed"
    );
}
