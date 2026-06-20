use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;

// Guards notification scheduler config parsing while server config helpers are
// imported from their owning module instead of the root.
use sea_orm::entity::prelude::DateTimeUtc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, NotSet,
    PaginatorTrait, QueryFilter, Set,
};
use serde_json::json;
use std::collections::BTreeMap;
use std::sync::{Mutex, OnceLock};
use std::time::SystemTime;
use tower::ServiceExt;
use yona_rust_integrations::{clear_test_outbox, snapshot_test_outbox};
use yona_rust_persistence::{
    comment_thread, issue, issue_comment, issue_event, n4user, notification_event,
    notification_event_n4user, notification_mail, posting, posting_comment, project,
    review_comment, unwatch, user_project_notification, watch, AppRepository,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::runtime_config::load_startup_config;
use yona_rust_pilot_server::{
    create_router_with_app_repository, deliver_due_notification_mails,
    deliver_due_notification_mails_with_config, deliver_notification_mail_scheduler_tick,
    notification_mail_add_noreferrer_to_external_links,
    notification_mail_apply_legacy_html_postprocessing,
    notification_mail_scheduler_config_from_startup, NotificationMailDeliveryConfig,
    NotificationMailSchedulerConfig, RuntimeConfig,
};

mod rest_test_support;

fn notification_mail_env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn notification_outbox_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn notification_delivery_config() -> NotificationMailDeliveryConfig {
    NotificationMailDeliveryConfig {
        reply_to_address: Some("noreply@yona.example".to_string()),
        ..NotificationMailDeliveryConfig::default()
    }
}

fn notification_bcc_delivery_config(
    recipient_limit: Option<usize>,
) -> NotificationMailDeliveryConfig {
    NotificationMailDeliveryConfig {
        default_from: "notifications@yona.local".to_string(),
        hide_address: true,
        recipient_limit,
        reply_to_address: Some("noreply@yona.example".to_string()),
        ..NotificationMailDeliveryConfig::default()
    }
}

#[test]
fn notification_contract_mail_links_add_noreferrer_like_legacy() {
    let html = concat!(
        "<a href=\"http://y/foo/bar\">external link</a>",
        "<a href=\"http://y/foo/bar\" rel=\"nofollow\">external link</a>",
        "<a href=\"http://yobi.io/foo/bar\">internal link</a>",
        "<a href=\"/foo/bar\">relative link</a>",
        "<a href=\"foo/baz\">relative path link</a>",
        "<a href = \"/space/link\">spaced relative link</a>",
        "<a href=/unquoted/link>unquoted relative link</a>",
        "<A HREF=\"http://outside.example/case\">case external link</A>",
        "<a href=\"http://yobi.io/%ag\">malformed link</a>",
        "<a href=\"mailto:team@yobi.io\">mail link</a>",
    );

    let rendered = notification_mail_add_noreferrer_to_external_links(html, "http://yobi.io");

    assert!(rendered.contains("<a href=\"http://y/foo/bar\" rel=\" noreferrer\">"));
    assert!(rendered.contains("<a href=\"http://y/foo/bar\" rel=\"nofollow noreferrer\">"));
    assert!(rendered.contains("<a href=\"http://yobi.io/foo/bar\">internal link</a>"));
    assert!(rendered.contains("<a href=\"http://yobi.io/foo/bar\">relative link</a>"));
    assert!(rendered.contains("<a href=\"http://yobi.io/foo/baz\">relative path link</a>"));
    assert!(rendered.contains("<a href=\"http://yobi.io/space/link\">spaced relative link</a>"));
    assert!(
        rendered.contains("<a href=\"http://yobi.io/unquoted/link\">unquoted relative link</a>")
    );
    assert!(
        rendered.contains("http://outside.example/case")
            && rendered.contains("case external link")
            && rendered.contains("rel=\" noreferrer\"")
    );
    assert!(rendered.contains("<a href=\"http://yobi.io/%ag\" rel=\" noreferrer\">"));
    assert!(rendered.contains("<a href=\"mailto:team@yobi.io\">mail link</a>"));
}

#[test]
fn notification_contract_mail_links_scan_tags_case_insensitively_like_jsoup() {
    let html = "<A HREF=\"http://outside.example/case\">case external link</A>";

    let rendered = notification_mail_add_noreferrer_to_external_links(html, "http://yobi.io");

    assert!(rendered.contains("HREF=\"http://outside.example/case\""));
    assert!(rendered.contains("rel=\" noreferrer\""));
    assert!(rendered.contains(">case external link</A>"));
}

#[test]
fn notification_contract_mail_href_attrs_on_non_anchor_tags_follow_legacy_selector() {
    let html = concat!(
        "<link rel=\"stylesheet\" href=/assets/mail.css>",
        "<area href=\"http://outside.example/map\">"
    );

    let rendered = notification_mail_add_noreferrer_to_external_links(html, "https://yobi.io");

    assert!(rendered.contains("<link rel=\"stylesheet\" href=\"https://yobi.io/assets/mail.css\">"));
    assert!(rendered.contains("<area href=\"http://outside.example/map\" rel=\" noreferrer\">"));
}

#[test]
fn notification_contract_mail_src_attrs_are_absolutized_like_legacy() {
    let html = concat!(
        "<video src=\"/media/demo.mp4\"></video>",
        "<source SRC=\"assets/demo.webm\">",
        "<track src = '/captions/demo.vtt'>",
        "<audio src=/media/unquoted.ogg></audio>",
        "<img src=\"https://cdn.example/already.png\">"
    );

    let rendered = notification_mail_add_noreferrer_to_external_links(html, "https://yobi.io");

    assert!(rendered.contains("<video src=\"https://yobi.io/media/demo.mp4\"></video>"));
    assert!(rendered.contains("<source src=\"https://yobi.io/assets/demo.webm\">"));
    assert!(rendered.contains("<track src=\"https://yobi.io/captions/demo.vtt\">"));
    assert!(rendered.contains("<audio src=\"https://yobi.io/media/unquoted.ogg\"></audio>"));
    assert!(rendered.contains("<img src=\"https://cdn.example/already.png\">"));
}

#[test]
fn notification_contract_mail_images_are_wrapped_like_legacy() {
    let html = concat!(
        "<p>body</p>",
        "<img src=\"https://cdn.example/image.png\">",
        "<img src=\"/files/1\" style=\"border:1px solid red;\">",
        "<img src = \"/files/space.png\" style = \"border:2px solid blue;\">",
        "<img src=/files/unquoted.png style=border:3px>",
        "<IMG SRC=\"relative/image.png\">"
    );

    let rendered = notification_mail_apply_legacy_html_postprocessing(html, "https://yobi.io");

    assert!(rendered.contains(
        "<a href=\"https://cdn.example/image.png\" target=\"_blank\" style=\"border:0;outline:0;\"><img src=\"https://cdn.example/image.png\" style=\"max-width:1024px;\"></a>"
    ));
    assert!(rendered.contains(
        "<a href=\"https://yobi.io/files/1\" target=\"_blank\" style=\"border:0;outline:0;\"><img src=\"https://yobi.io/files/1\" style=\"max-width:1024px;border:1px solid red;\"></a>"
    ));
    assert!(rendered.contains(
        "<a href=\"https://yobi.io/files/space.png\" target=\"_blank\" style=\"border:0;outline:0;\"><img src=\"https://yobi.io/files/space.png\" style=\"max-width:1024px;border:2px solid blue;\"></a>"
    ));
    assert!(rendered.contains(
        "<a href=\"https://yobi.io/files/unquoted.png\" target=\"_blank\" style=\"border:0;outline:0;\"><img src=\"https://yobi.io/files/unquoted.png\" style=\"max-width:1024px;border:3px\"></a>"
    ));
    assert!(rendered.contains(
        "<a href=\"https://yobi.io/relative/image.png\" target=\"_blank\" style=\"border:0;outline:0;\"><IMG src=\"https://yobi.io/relative/image.png\" style=\"max-width:1024px;\"></a>"
    ));
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

fn restore_env_var(name: &str, value: Option<String>) {
    match value {
        Some(value) => std::env::set_var(name, value),
        None => std::env::remove_var(name),
    }
}

struct EnvVarRestore {
    name: &'static str,
    previous: Option<String>,
}

impl EnvVarRestore {
    fn remove(name: &'static str) -> Self {
        let previous = std::env::var(name).ok();
        std::env::remove_var(name);
        Self { name, previous }
    }

    fn set(name: &'static str, value: &str) -> Self {
        let previous = std::env::var(name).ok();
        std::env::set_var(name, value);
        Self { name, previous }
    }
}

impl Drop for EnvVarRestore {
    fn drop(&mut self) {
        restore_env_var(self.name, self.previous.clone());
    }
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

async fn rest_get_accept(
    app: axum::Router,
    uri: &str,
    cookie_header: Option<&str>,
    accept: &str,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::GET)
        .uri(uri)
        .header(http::header::ACCEPT, accept);
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

async fn create_project(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    scope: &str,
) -> serde_json::Value {
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
    .await
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

async fn update_issue_assignee(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    title: &str,
    assignee_login_id: &str,
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
                "bodyMarkdown": "",
                "assigneeLoginId": assignee_login_id
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
    let (watcher_csrf, watcher_cookie, watcher_id) = register_user(app.clone(), "watcher").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    let project_id = project::Entity::find()
        .filter(project::Column::Owner.eq(Some("owner".to_string())))
        .filter(project::Column::Name.eq(Some("projectYobi".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("project row")
        .id;
    watch::ActiveModel {
        id: NotSet,
        user_id: Set(Some(watcher_id)),
        resource_type: Set(Some("PROJECT".to_string())),
        resource_id: Set(Some(project_id.to_string())),
    }
    .insert(&db)
    .await
    .unwrap();
    let direct_toggle_notification = rest(
        app.clone(),
        Method::POST,
        &format!("/yona/noti/toggle/{project_id}/NEW_COMMENT"),
        Some(&watcher_cookie),
        Some(&watcher_csrf),
        None,
    )
    .await;
    assert_eq!(direct_toggle_notification.status(), StatusCode::OK);
    assert!(direct_toggle_notification
        .headers()
        .get(http::header::LOCATION)
        .is_none());
    assert!(response_text(direct_toggle_notification).await.is_empty());
    assert!(user_project_notification::Entity::find()
        .filter(user_project_notification::Column::UserId.eq(Some(watcher_id)))
        .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
        .filter(
            user_project_notification::Column::NotificationType.eq(Some("NEW_COMMENT".to_string()))
        )
        .one(&db)
        .await
        .unwrap()
        .is_some());
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
// Guards notification fan-out for the issue route-module mass-update body DTO split.
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
    // Guards the `/api/v1/notifications` route-module ownership split.
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
    assert!(items[0]["targetHref"]
        .as_str()
        .unwrap()
        .starts_with("/yona/"));
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
async fn notification_contract_direct_notification_route_returns_legacy_partial_fragment() {
    // Guards route-utils-owned HTML escaping used by legacy notification fragments.
    let (app, _repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;
    share_issue(app.clone(), &owner_cookie, &owner_csrf, "guest").await;

    let response = rest_get(
        app,
        "/yona/notification?from=0&limit=1",
        Some(&guest_cookie),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let html = response_text(response).await;

    assert!(html.contains(r#"<li class="notification-stream">"#));
    assert!(html.contains(r#"<div class="stream-type megaphone">"#));
    assert!(html.contains(r#"data-toggle="learnmore""#));
    assert!(html.contains(r#"id="message-"#));
    assert!(html.contains(r#"class="message-wrap nowrap""#));
    assert!(html.contains(r#"<div class="message">Issue is shared with guest</div>"#));
    assert!(html.contains(r#"<a href="/yona/owner/projectYobi/issue/1">Private issue</a>"#));
    assert!(html.contains(r#"class="avatar-wrap smaller""#));
    assert!(html.contains(r#"<a href="/yona/owner" class="author">owner</a>@owner"#));
    assert!(html.contains(r#"data-target="message-"#));
    assert!(html.contains(r#"class="ago pull-right""#));
    assert!(html
        .contains(r#"<a href="javascript:void(0);" id="notification-more" class="ybtn">More</a>"#));
    assert!(html.contains(r#"/yona/notification?from=1&amp;size=1"#));
    assert!(html.contains(r#"$('.activity-streams').append(data);"#));
    assert!(!html.contains("page-wrap-outer"));
    assert!(!html.contains("common/mySeriesMenuTab"));
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
async fn notification_contract_scheduler_config_and_tick_follow_legacy_defaults() {
    clear_test_outbox();

    let current_dir = tempfile::tempdir().expect("temp dir");
    let default_startup =
        load_startup_config(BTreeMap::new(), current_dir.path()).expect("default startup config");
    let defaults = notification_mail_scheduler_config_from_startup(&default_startup);
    assert_eq!(
        defaults,
        NotificationMailSchedulerConfig {
            enabled: true,
            initial_delay_ms: 5_000,
            interval_ms: 60_000,
            delay_ms: 180_000,
        }
    );

    let disabled_startup = load_startup_config(
        BTreeMap::from([
            (
                "YONA_NOTIFICATION_MAIL_ENABLED".to_string(),
                "false".to_string(),
            ),
            (
                "YONA_NOTIFICATION_MAIL_INITIAL_DELAY".to_string(),
                "2s".to_string(),
            ),
            (
                "YONA_NOTIFICATION_MAIL_INTERVAL".to_string(),
                "750ms".to_string(),
            ),
            ("YONA_NOTIFICATION_MAIL_DELAY".to_string(), "0".to_string()),
        ]),
        current_dir.path(),
    )
    .expect("disabled startup config");
    let disabled_config = notification_mail_scheduler_config_from_startup(&disabled_startup);
    assert_eq!(
        disabled_config,
        NotificationMailSchedulerConfig {
            enabled: false,
            initial_delay_ms: 2_000,
            interval_ms: 750,
            delay_ms: 0,
        }
    );

    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (watcher_csrf, watcher_cookie, _) = register_user(app.clone(), "watcher").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Scheduled mail watched issue",
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
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        1
    );

    let delivered = deliver_notification_mail_scheduler_tick(
        &repo,
        &disabled_config,
        "https://yona.example",
        "/yona",
        &notification_delivery_config(),
    )
    .await
    .unwrap();
    assert_eq!(delivered, 0);
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        1
    );

    let enabled_config = NotificationMailSchedulerConfig {
        enabled: true,
        initial_delay_ms: 2_000,
        interval_ms: 750,
        delay_ms: 0,
    };
    let delivered = deliver_notification_mail_scheduler_tick(
        &repo,
        &enabled_config,
        "https://yona.example",
        "/yona",
        &notification_delivery_config(),
    )
    .await
    .unwrap();
    assert_eq!(delivered, 1);
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        0
    );
    assert_eq!(snapshot_test_outbox().len(), 1);
    clear_test_outbox();
}

#[test]
fn notification_scheduler_config_from_startup_uses_init_snapshot_without_env_mutation() {
    let current_dir = tempfile::tempdir().expect("temp dir");
    let previous_enabled = std::env::var("YONA_NOTIFICATION_MAIL_ENABLED").ok();
    let startup = load_startup_config(
        BTreeMap::from([
            (
                "YONA_NOTIFICATION_MAIL_ENABLED".to_string(),
                "false".to_string(),
            ),
            (
                "YONA_NOTIFICATION_MAIL_INITIAL_DELAY".to_string(),
                "2s".to_string(),
            ),
            (
                "YONA_NOTIFICATION_MAIL_INTERVAL".to_string(),
                "750ms".to_string(),
            ),
            ("YONA_NOTIFICATION_MAIL_DELAY".to_string(), "0".to_string()),
        ]),
        current_dir.path(),
    )
    .expect("startup config");

    assert_eq!(
        notification_mail_scheduler_config_from_startup(&startup),
        NotificationMailSchedulerConfig {
            enabled: false,
            initial_delay_ms: 2_000,
            interval_ms: 750,
            delay_ms: 0,
        }
    );
    assert_eq!(
        std::env::var("YONA_NOTIFICATION_MAIL_ENABLED").ok(),
        previous_enabled,
        "startup snapshot conversion must not mutate process env"
    );
}

#[test]
fn notification_delivery_config_from_startup_uses_smtp_sender_snapshot_without_env_mutation() {
    let current_dir = tempfile::tempdir().expect("temp dir");
    let previous_smtp_from = std::env::var("SMTP_FROM").ok();
    let startup = load_startup_config(
        BTreeMap::from([
            (
                "SMTP_FROM".to_string(),
                "startup-notify@example.com".to_string(),
            ),
            (
                "YONA_ALLOWED_MAIL_DOMAINS".to_string(),
                "allowed.example.com".to_string(),
            ),
        ]),
        current_dir.path(),
    )
    .expect("startup config");
    std::env::set_var("SMTP_FROM", "request-time@example.com");

    let delivery_config = NotificationMailDeliveryConfig::from_startup(&startup);
    let smtp_from_after_conversion = std::env::var("SMTP_FROM").ok();
    restore_env_var("SMTP_FROM", previous_smtp_from);

    assert_eq!(delivery_config.default_from, "startup-notify@example.com");
    assert_eq!(
        delivery_config.allowed_domains,
        vec!["allowed.example.com".to_string()]
    );
    assert_eq!(
        smtp_from_after_conversion.as_deref(),
        Some("request-time@example.com"),
        "notification delivery config conversion must not mutate process env"
    );
}

#[tokio::test]
// Guards notification mail reuse of route-utils-owned public-origin, URL, URI, and SMTP helpers.
async fn notification_contract_delivers_due_mail_rows_to_receivers() {
    let _outbox_guard = notification_outbox_lock().lock().unwrap();
    clear_test_outbox();
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (watcher_csrf, watcher_cookie, watcher_id) = register_user(app.clone(), "watcher").await;
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
        &notification_delivery_config(),
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
    assert!(outbox[0].html);
    assert_eq!(
        outbox[0].reply_to.as_deref(),
        Some("noreply+owner/projectYobi/issue_post/1@yona.example")
    );
    assert_eq!(outbox[0].subject, "Mail fan-out watched issue");
    assert!(outbox[0].body.contains("<div style=\"font-family:"));
    assert!(outbox[0]
        .body
        .contains("<hr style=\"border:0; border-bottom:1px solid #ddd; margin:20px 0;\">"));
    assert!(outbox[0].body.contains("notification.issue.closed"));
    assert!(outbox[0]
        .body
        .contains("Reply to this email directly or <a href=\"https://yona.example/yona/owner/projectYobi/issue/1\" target=\"_blank\">View it on Yona</a>"));
    assert!(outbox[0]
        .body
        .contains("<a href=\"https://yona.example/yona/owner/projectYobi/issue/1\" target=\"_blank\">View it on Yona</a>"));
    assert!(outbox[0]
        .body
        .contains("<a href=\"https://yona.example/yona/unwatch?resource.type=issue_post&amp;resource.id=1\" target=\"_blank\" style=\"color:#4399e2; text-decoration:underline;\">Unwatch</a>"));
    assert!(outbox[0]
        .body
        .contains("<a href=\"https://yona.example/yona/user/editform/notifications\" target=\"_blank\" style=\"color:#4399e2; text-decoration:underline;\">Notification settings</a>"));
    assert!(!outbox[0].body.contains("rel=\" noreferrer\""));

    let unwatch_response = rest_get(
        app.clone(),
        "/yona/unwatch?resource.type=issue_post&resource.id=1",
        Some(&watcher_cookie),
    )
    .await;
    assert_eq!(unwatch_response.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        unwatch_response
            .headers()
            .get(http::header::LOCATION)
            .unwrap()
            .to_str()
            .unwrap(),
        "/yona/owner/projectYobi/issue/1"
    );
    let json_unwatch_response = rest_get_accept(
        app.clone(),
        "/yona/unwatch?resource.type=ISSUE_POST&resource.id=1",
        Some(&watcher_cookie),
        "application/json",
    )
    .await;
    assert_eq!(json_unwatch_response.status(), StatusCode::OK);
    assert!(json_unwatch_response
        .headers()
        .get(http::header::LOCATION)
        .is_none());
    assert!(json_unwatch_response
        .headers()
        .get(http::header::CONTENT_TYPE)
        .is_none());
    assert!(response_text(json_unwatch_response).await.is_empty());
    let issue_unwatch_count = unwatch::Entity::find()
        .filter(unwatch::Column::UserId.eq(Some(watcher_id)))
        .filter(unwatch::Column::ResourceType.eq(Some("ISSUE".to_string())))
        .filter(unwatch::Column::ResourceId.eq(Some("1".to_string())))
        .count(&db)
        .await
        .unwrap();
    assert_eq!(issue_unwatch_count, 1);

    let direct_watch_response = rest(
        app.clone(),
        Method::POST,
        "/yona/watch?resource.type=issue_post&resource.id=1",
        Some(&watcher_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(direct_watch_response.status(), StatusCode::OK);
    assert!(direct_watch_response
        .headers()
        .get(http::header::LOCATION)
        .is_none());
    assert!(response_text(direct_watch_response).await.is_empty());
    let issue_watch_count = watch::Entity::find()
        .filter(watch::Column::UserId.eq(Some(watcher_id)))
        .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
        .filter(watch::Column::ResourceId.eq(Some("1".to_string())))
        .count(&db)
        .await
        .unwrap();
    assert_eq!(issue_watch_count, 1);
    let issue_unwatch_count_after_watch = unwatch::Entity::find()
        .filter(unwatch::Column::UserId.eq(Some(watcher_id)))
        .filter(unwatch::Column::ResourceType.eq(Some("ISSUE".to_string())))
        .filter(unwatch::Column::ResourceId.eq(Some("1".to_string())))
        .count(&db)
        .await
        .unwrap();
    assert_eq!(issue_unwatch_count_after_watch, 0);

    clear_test_outbox();
}

#[tokio::test]
async fn notification_contract_issue_comment_mail_replies_to_parent_issue_like_legacy() {
    let _outbox_guard = notification_outbox_lock().lock().unwrap();
    clear_test_outbox();
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, _, watcher_id) = register_user(app.clone(), "watcher").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Comment reply target issue",
    )
    .await;
    let issue_model = issue::Entity::find()
        .one(&db)
        .await
        .unwrap()
        .expect("issue row");
    let comment = issue_comment::ActiveModel {
        id: NotSet,
        issue_id: Set(Some(issue_model.id)),
        project_id: Set(issue_model.project_id.expect("issue project id")),
        author_id: Set(issue_model.author_id),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        created_date: Set(issue_model.created_date),
        ..Default::default()
    }
    .insert(&db)
    .await
    .unwrap();
    let event = notification_event::ActiveModel {
        id: NotSet,
        title: Set(None),
        sender_id: Set(issue_model.author_id),
        created: Set(issue_model.created_date),
        resource_type: Set(Some("ISSUE_COMMENT".to_string())),
        resource_id: Set(Some(comment.id.to_string())),
        event_type: Set(Some("NEW_COMMENT".to_string())),
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
        &notification_delivery_config(),
    )
    .await
    .unwrap();
    assert_eq!(delivered, 1);

    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].to, "watcher@example.com");
    assert_eq!(
        outbox[0].reply_to.as_deref(),
        Some("noreply+owner/projectYobi/issue_post/1@yona.example")
    );
    assert!(!outbox[0]
        .reply_to
        .as_deref()
        .unwrap_or_default()
        .contains("issue_comment"));
    clear_test_outbox();
}

#[tokio::test]
async fn notification_contract_board_comment_mail_replies_to_parent_post_like_legacy() {
    let _outbox_guard = notification_outbox_lock().lock().unwrap();
    clear_test_outbox();
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, _, watcher_id) = register_user(app.clone(), "watcher").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Project fixture for board reply target",
    )
    .await;
    let issue_model = issue::Entity::find()
        .one(&db)
        .await
        .unwrap()
        .expect("issue row");
    let project_id = issue_model.project_id.expect("issue project id");
    let post = posting::ActiveModel {
        id: NotSet,
        title: Set(Some("Board reply target post".to_string())),
        created_date: Set(issue_model.created_date),
        updated_date: Set(issue_model.created_date),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        project_id: Set(Some(project_id)),
        number: Set(Some(1)),
        num_of_comments: Set(Some(1)),
        notice: Set(Some(0)),
        readme: Set(Some(0)),
        parent_id: Set(None),
        updated_by_author_id: Set(Some(owner_id)),
        ..Default::default()
    }
    .insert(&db)
    .await
    .unwrap();
    let comment = posting_comment::ActiveModel {
        id: NotSet,
        created_date: Set(issue_model.created_date),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        posting_id: Set(Some(post.id)),
        project_id: Set(project_id),
        parent_comment_id: Set(None),
        ..Default::default()
    }
    .insert(&db)
    .await
    .unwrap();
    let event = notification_event::ActiveModel {
        id: NotSet,
        title: Set(None),
        sender_id: Set(Some(owner_id)),
        created: Set(issue_model.created_date),
        resource_type: Set(Some("POSTING_COMMENT".to_string())),
        resource_id: Set(Some(comment.id.to_string())),
        event_type: Set(Some("NEW_COMMENT".to_string())),
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
        &notification_delivery_config(),
    )
    .await
    .unwrap();
    assert_eq!(delivered, 1);

    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].to, "watcher@example.com");
    let expected_reply_to = format!(
        "noreply+owner/projectYobi/board_post/{}@yona.example",
        post.id
    );
    assert_eq!(
        outbox[0].reply_to.as_deref(),
        Some(expected_reply_to.as_str())
    );
    assert!(!outbox[0]
        .reply_to
        .as_deref()
        .unwrap_or_default()
        .contains("posting_comment"));
    clear_test_outbox();
}

#[tokio::test]
async fn notification_contract_review_comment_mail_replies_to_parent_thread_like_legacy() {
    let _outbox_guard = notification_outbox_lock().lock().unwrap();
    clear_test_outbox();
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, _, watcher_id) = register_user(app.clone(), "watcher").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Project fixture for review reply target",
    )
    .await;
    let issue_model = issue::Entity::find()
        .one(&db)
        .await
        .unwrap()
        .expect("issue row");
    let project_id = issue_model.project_id.expect("issue project id");
    let thread = comment_thread::ActiveModel {
        dtype: Set("NonRangedCodeCommentThread".to_string()),
        id: NotSet,
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        state: Set(Some("open".to_string())),
        created_date: Set(issue_model.created_date),
        pull_request_id: Set(None),
        project_id: Set(Some(project_id)),
        prev_commit_id: Set(None),
        commit_id: Set(Some("123321".to_string())),
        path: Set(None),
        start_side: Set(None),
        start_line: Set(None),
        start_column: Set(None),
        end_side: Set(None),
        end_line: Set(None),
        end_column: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    let comment = review_comment::ActiveModel {
        id: NotSet,
        created_date: Set(issue_model.created_date),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        thread_id: Set(Some(thread.id)),
    }
    .insert(&db)
    .await
    .unwrap();
    let event = notification_event::ActiveModel {
        id: NotSet,
        title: Set(None),
        sender_id: Set(Some(owner_id)),
        created: Set(issue_model.created_date),
        resource_type: Set(Some("REVIEW_COMMENT".to_string())),
        resource_id: Set(Some(comment.id.to_string())),
        event_type: Set(Some("NEW_REVIEW_COMMENT".to_string())),
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
        &notification_delivery_config(),
    )
    .await
    .unwrap();
    assert_eq!(delivered, 1);

    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].to, "watcher@example.com");
    let expected_reply_to = format!(
        "noreply+owner/projectYobi/comment_thread/{}@yona.example",
        thread.id
    );
    assert_eq!(
        outbox[0].reply_to.as_deref(),
        Some(expected_reply_to.as_str())
    );
    assert!(!outbox[0]
        .reply_to
        .as_deref()
        .unwrap_or_default()
        .contains("review_comment"));
    clear_test_outbox();
}

#[tokio::test]
async fn notification_contract_filters_due_mail_receivers_by_allowed_domains() {
    let _guard = notification_mail_env_lock().lock().unwrap();
    let previous_allowed_domains = std::env::var("YONA_ALLOWED_MAIL_DOMAINS").ok();
    let previous_smtp_from = std::env::var("SMTP_FROM").ok();
    std::env::set_var("SMTP_FROM", "request-time@example.com");
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

    let delivered = deliver_due_notification_mails_with_config(
        &repo,
        event.created.expect("event created"),
        0,
        "https://yona.example",
        "/yona",
        &NotificationMailDeliveryConfig {
            allowed_domains: vec!["allowed.example.com".to_string()],
            default_from: "configured-notify@example.com".to_string(),
            hide_address: false,
            recipient_limit: None,
            reply_to_address: Some("noreply@yona.example".to_string()),
            site_name: "Yona".to_string(),
        },
    )
    .await
    .unwrap();

    assert_eq!(delivered, 1);
    assert_eq!(
        notification_mail::Entity::find().count(&db).await.unwrap(),
        0
    );
    let outbox = snapshot_test_outbox();
    let smtp_from_after_delivery = std::env::var("SMTP_FROM").ok();
    restore_env_var("SMTP_FROM", previous_smtp_from);
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].from, "configured-notify@example.com");
    assert_eq!(outbox[0].to, "allowed@allowed.example.com");
    assert_eq!(
        smtp_from_after_delivery.as_deref(),
        Some("request-time@example.com"),
        "notification delivery config must not mutate SMTP env"
    );
    clear_test_outbox();
    assert_eq!(
        std::env::var("YONA_ALLOWED_MAIL_DOMAINS").ok(),
        previous_allowed_domains,
        "delivery config must not mutate process env"
    );
}

#[tokio::test]
async fn notification_contract_skips_due_mail_when_resource_no_longer_exists() {
    let _outbox_guard = notification_outbox_lock().lock().unwrap();
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
        &notification_delivery_config(),
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
    let _outbox_guard = notification_outbox_lock().lock().unwrap();
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
        &notification_bcc_delivery_config(None),
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
}

#[tokio::test]
async fn notification_contract_partitions_bcc_mail_by_recipient_limit() {
    let _outbox_guard = notification_outbox_lock().lock().unwrap();
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
        &notification_bcc_delivery_config(Some(2)),
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
}

#[tokio::test]
async fn notification_contract_groups_bcc_mail_by_recipient_language() {
    let _outbox_guard = notification_outbox_lock().lock().unwrap();
    clear_test_outbox();
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (watcher_csrf, watcher_cookie, watcher_id) = register_user(app.clone(), "watcher").await;
    let (observer_csrf, observer_cookie, observer_id) =
        register_user(app.clone(), "observer").await;
    let (reviewer_csrf, reviewer_cookie, reviewer_id) =
        register_user(app.clone(), "reviewer").await;
    for (user_id, lang) in [
        (watcher_id, "ko-KR"),
        (observer_id, "ko-KR"),
        (reviewer_id, "en-US"),
    ] {
        let user = n4user::Entity::find_by_id(user_id)
            .one(&db)
            .await
            .unwrap()
            .expect("user");
        let mut user = n4user::ActiveModel::from(user);
        user.lang = Set(Some(lang.to_string()));
        user.update(&db).await.unwrap();
    }
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Language grouped watched issue",
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
        &notification_bcc_delivery_config(None),
    )
    .await
    .unwrap();

    assert_eq!(delivered, 2);
    let mut bcc_groups = snapshot_test_outbox()
        .into_iter()
        .map(|mail| {
            assert_eq!(mail.to, "notifications@yona.local");
            let mut bcc = mail.bcc;
            bcc.sort();
            bcc
        })
        .collect::<Vec<_>>();
    bcc_groups.sort();
    assert_eq!(
        bcc_groups,
        vec![
            vec![
                "observer@example.com".to_string(),
                "watcher@example.com".to_string()
            ],
            vec!["reviewer@example.com".to_string()],
        ]
    );
    clear_test_outbox();
}

#[tokio::test]
async fn notification_contract_merges_same_sender_resource_events_within_draft_time() {
    let _guard = notification_mail_env_lock().lock().unwrap();
    let _env = EnvVarRestore::remove("YONA_NOTIFICATION_DRAFT_TIME");
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

#[tokio::test]
async fn notification_contract_honors_configured_issue_event_draft_time_override() {
    let _guard = notification_mail_env_lock().lock().unwrap();
    let _env = EnvVarRestore::set("YONA_ISSUE_EVENT_DRAFT_TIME", "0");
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, _guest_cookie, _) = register_user(app.clone(), "guest").await;
    let (_, _other_cookie, _) = register_user(app.clone(), "other").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Issue event draft override issue",
    )
    .await;

    update_issue_assignee(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Issue event draft override issue",
        "guest",
    )
    .await;
    update_issue_assignee(
        app,
        &owner_cookie,
        &owner_csrf,
        "Issue event draft override issue",
        "other",
    )
    .await;

    assert_eq!(
        issue_event::Entity::find()
            .filter(issue_event::Column::EventType.eq(Some("ISSUE_ASSIGNEE_CHANGED".to_string())))
            .count(&db)
            .await
            .unwrap(),
        2
    );
}

#[tokio::test]
async fn notification_contract_merges_issue_events_within_issue_event_draft_time() {
    let _guard = notification_mail_env_lock().lock().unwrap();
    let _env = EnvVarRestore::remove("YONA_ISSUE_EVENT_DRAFT_TIME");
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, _guest_cookie, _) = register_user(app.clone(), "guest").await;
    let (_, _other_cookie, _) = register_user(app.clone(), "other").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Issue event draft merge issue",
    )
    .await;

    update_issue_assignee(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Issue event draft merge issue",
        "guest",
    )
    .await;
    update_issue_assignee(
        app,
        &owner_cookie,
        &owner_csrf,
        "Issue event draft merge issue",
        "other",
    )
    .await;

    assert_eq!(
        issue_event::Entity::find()
            .filter(issue_event::Column::EventType.eq(Some("ISSUE_ASSIGNEE_CHANGED".to_string())))
            .count(&db)
            .await
            .unwrap(),
        1
    );
}

#[tokio::test]
async fn notification_contract_honors_configured_draft_time_override() {
    let _guard = notification_mail_env_lock().lock().unwrap();
    let _env = EnvVarRestore::set("YONA_NOTIFICATION_DRAFT_TIME", "0");
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, _guest_cookie, _) = register_user(app.clone(), "guest").await;
    let (_, _other_cookie, _) = register_user(app.clone(), "other").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Draft override issue",
    )
    .await;

    update_issue_body(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "Draft override issue",
        "first edit @guest",
    )
    .await;
    update_issue_body(
        app,
        &owner_cookie,
        &owner_csrf,
        "Draft override issue",
        "second edit @other",
    )
    .await;

    assert_eq!(
        notification_event::Entity::find()
            .filter(
                notification_event::Column::EventType.eq(Some("ISSUE_BODY_CHANGED".to_string()))
            )
            .count(&db)
            .await
            .unwrap(),
        2
    );
}
