use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{Database, EntityName};
use serde_json::json;
use std::path::Path;
use std::sync::{Mutex, OnceLock};
use tempfile::tempdir;
use tower::ServiceExt;
use yoram_integrations::{clear_test_webhook_outbox, snapshot_test_webhook_outbox};
use yoram_migration::Migrator;
use yoram_persistence::AppRepository;
use yoram_server::{
    create_router_with_app_repository, create_router_with_repository_and_app_config,
    AppRuntimeConfig, RuntimeConfig,
};

mod rest_test_support;

#[test]
fn issue_entity_reexport_preserves_legacy_table_name() {
    assert_eq!(yoram_persistence::issue::Entity.table_name(), "issue");
}

fn webhook_outbox_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
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

async fn build_app_with_repository_in_data_root(data_root: &Path) -> (axum::Router, AppRepository) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db);
    let app = create_router_with_repository_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
        AppRuntimeConfig {
            data_root: data_root.to_path_buf(),
            ..AppRuntimeConfig::default()
        },
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
async fn project_issue_list_reports_legacy_sidebar_counts_following_search_filter() {
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
                "overview": "Issue sidebar count parity",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;

    for (title, assignee_login_id) in [("Open issue", "owner"), ("Closed issue", "")] {
        response_json(
            rest(
                app.clone(),
                Method::POST,
                "/yona/api/v1/projects/owner/projectYobi/issues",
                Some(&cookie),
                Some(&csrf),
                Some(json!({
                    "title": title,
                    "bodyMarkdown": title,
                    "assigneeLoginId": assignee_login_id,
                })),
            )
            .await,
        )
        .await;
    }
    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/comments",
            Some(&cookie),
            Some(&csrf),
            Some(json!({ "contentsMarkdown": "Owner comment" })),
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

    // Legacy Issue.countIssuesBy(project.id, param.clone().setState(state))
    // counts every tab with the current search params, so a non-matching
    // filter zeroes the counts too (partial_list_wrap.scala.html:53).
    let no_match = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues?state=open&filter=no-match&pageNum=9",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(no_match["totalCount"], 0);
    assert_eq!(no_match["openIssueCount"], 0);
    assert_eq!(no_match["closedIssueCount"], 0);
    assert_eq!(no_match["assignedToMeCount"], 0);
    assert_eq!(no_match["authoredByMeCount"], 0);
    assert_eq!(no_match["commentedByMeCount"], 0);

    // A matching filter keeps the counts scoped to it: only "Open issue"
    // matches, so the closed tab count drops to 0.
    let open = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues?state=open&filter=Open",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(open["totalCount"], 1);
    assert_eq!(open["openIssueCount"], 1);
    assert_eq!(open["closedIssueCount"], 0);
    assert_eq!(open["assignedToMeCount"], 1);
    assert_eq!(open["authoredByMeCount"], 1);
    assert_eq!(open["commentedByMeCount"], 1);

    // Without a filter the counts are the project totals again.
    let all = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues?state=open",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(all["totalCount"], 1);
    assert_eq!(all["openIssueCount"], 1);
    assert_eq!(all["closedIssueCount"], 1);
    assert_eq!(all["assignedToMeCount"], 1);
    assert_eq!(all["authoredByMeCount"], 1);
    assert_eq!(all["commentedByMeCount"], 1);

    let closed = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues?state=closed&filter=no-match&pageNum=9",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(closed["totalCount"], 0);
    assert_eq!(closed["openIssueCount"], 0);
    assert_eq!(closed["closedIssueCount"], 0);
    assert_eq!(closed["assignedToMeCount"], 0);
    assert_eq!(closed["authoredByMeCount"], 0);
    assert_eq!(closed["commentedByMeCount"], 0);
}

#[tokio::test]
async fn issue_core_contract_enqueues_legacy_body_changed_webhook_payload() {
    // Guards legacy NotificationEvent.afterIssueBodyChanged -> Webhook fan-out
    // from the issue lifecycle route using the app-scoped integration snapshot.
    let _outbox_guard = webhook_outbox_lock().lock().unwrap();
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");

    let (app, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (csrf, cookie, _) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "assigned").await;
    response_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "overview": "Issue webhook parity",
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
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&cookie),
            Some(&csrf),
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
    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "Issue body webhook parity",
                "bodyMarkdown": "Original issue body",
            })),
        )
        .await,
    )
    .await;
    let listed = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues?state=open",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(listed["totalCount"], 1);
    assert_eq!(listed["items"][0]["title"], "Issue body webhook parity");
    clear_test_webhook_outbox();

    response_json(
        rest(
            app,
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "Issue body webhook parity",
                "bodyMarkdown": "Updated issue body",
            })),
        )
        .await,
    )
    .await;

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    let delivery = &deliveries[0];
    assert_eq!(delivery.event_type, "ISSUE_BODY_CHANGED");
    assert_eq!(delivery.webhook_type, "SIMPLE");
    let payload: serde_json::Value =
        serde_json::from_str(&delivery.body).expect("issue body webhook payload");
    let text = payload["text"].as_str().unwrap_or_default();
    assert!(text.contains("notification.type.issue.body.changed"));
    assert!(text.contains("/yona/owner/projectYobi/issue/1|#1: Issue body webhook parity"));

    clear_test_webhook_outbox();
}

#[tokio::test]
async fn issue_core_contract_enqueues_legacy_state_assignee_milestone_webhooks() {
    // Guards legacy NotificationEvent issue mutation webhook fan-out from the
    // issue lifecycle routes using the app-scoped integration snapshot.
    let _outbox_guard = webhook_outbox_lock().lock().unwrap();
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");

    let (app, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (csrf, cookie, _) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "assigned").await;
    response_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "overview": "Issue webhook parity",
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
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/issue-mutations",
                "secret": "mutation-secret",
                "webhookType": "SIMPLE",
                "gitPush": false,
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
                "title": "Issue mutation webhook parity",
                "bodyMarkdown": "Issue mutation body",
            })),
        )
        .await,
    )
    .await;
    clear_test_webhook_outbox();

    response_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/state",
            Some(&cookie),
            Some(&csrf),
            Some(json!({ "state": "closed" })),
        )
        .await,
    )
    .await;
    let state_deliveries = snapshot_test_webhook_outbox();
    assert_eq!(state_deliveries.len(), 1);
    assert_eq!(state_deliveries[0].event_type, "ISSUE_STATE_CHANGED");
    let state_payload: serde_json::Value =
        serde_json::from_str(&state_deliveries[0].body).expect("state webhook payload");
    let state_text = state_payload["text"].as_str().unwrap_or_default();
    assert!(state_text.contains("notification.type.issue.state.changed"));
    assert!(
        state_text.contains("/yona/owner/projectYobi/issue/1|#1: Issue mutation webhook parity")
    );
    clear_test_webhook_outbox();

    response_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "Issue mutation webhook parity",
                "bodyMarkdown": "Issue mutation body",
                "assigneeLoginId": "assigned",
            })),
        )
        .await,
    )
    .await;
    let assignee_deliveries = snapshot_test_webhook_outbox();
    assert_eq!(assignee_deliveries.len(), 1);
    assert_eq!(assignee_deliveries[0].event_type, "ISSUE_ASSIGNEE_CHANGED");
    let assignee_payload: serde_json::Value =
        serde_json::from_str(&assignee_deliveries[0].body).expect("assignee webhook payload");
    let assignee_text = assignee_payload["text"].as_str().unwrap_or_default();
    assert!(assignee_text.contains("notification.type.issue.assignee.changed"));
    assert!(
        assignee_text.contains("/yona/owner/projectYobi/issue/1|#1: Issue mutation webhook parity")
    );
    clear_test_webhook_outbox();

    let milestone = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/milestones",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "v1.0",
                "contentsMarkdown": "Ship issue webhook parity",
                "dueDate": "2026-05-09",
                "state": "open",
                "attachmentIds": []
            })),
        )
        .await,
    )
    .await;
    let milestone_id = milestone["milestone"]["id"]
        .as_i64()
        .or_else(|| {
            milestone["milestone"]["id"]
                .as_str()
                .and_then(|value| value.parse().ok())
        })
        .expect("milestone id");

    response_json(
        rest(
            app,
            Method::PUT,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "Issue mutation webhook parity",
                "bodyMarkdown": "Issue mutation body",
                "assigneeLoginId": "assigned",
                "milestoneId": milestone_id,
            })),
        )
        .await,
    )
    .await;
    let milestone_deliveries = snapshot_test_webhook_outbox();
    assert_eq!(milestone_deliveries.len(), 1);
    assert_eq!(
        milestone_deliveries[0].event_type,
        "ISSUE_MILESTONE_CHANGED"
    );
    let milestone_payload: serde_json::Value =
        serde_json::from_str(&milestone_deliveries[0].body).expect("milestone webhook payload");
    let milestone_text = milestone_payload["text"].as_str().unwrap_or_default();
    assert!(milestone_text.contains("notification.type.milestone.changed"));
    assert!(milestone_text
        .contains("/yona/owner/projectYobi/issue/1|#1: Issue mutation webhook parity"));

    clear_test_webhook_outbox();
}

#[tokio::test]
async fn issue_core_contract_mass_update_updates_due_dates() {
    // Guards legacy IssueMassUpdate.isDueDateChanged / dueDate scalar parity.
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
                "overview": "Issue mass update due date parity",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;

    for title in ["First due date issue", "Second due date issue"] {
        response_json(
            rest(
                app.clone(),
                Method::POST,
                "/yona/api/v1/projects/owner/projectYobi/issues",
                Some(&cookie),
                Some(&csrf),
                Some(json!({
                    "title": title,
                    "bodyMarkdown": "Mass-update due date body",
                })),
            )
            .await,
        )
        .await;
    }

    let mass_updated = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/mass-update",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "issueNumbers": ["1", "2"],
                "isDueDateChanged": true,
                "dueDate": "2026-05-09"
            })),
        )
        .await,
    )
    .await;
    let items = mass_updated["items"].as_array().expect("mass-update items");
    assert_eq!(items.len(), 2);
    assert!(items.iter().any(|item| item["issueNumber"] == 1));
    assert!(items.iter().any(|item| item["issueNumber"] == 2));

    let first_detail = response_json(
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
    assert_eq!(first_detail["dueDateLabel"], "2026-05-09");

    let second_detail = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues/2",
            Some(&cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(second_detail["dueDateLabel"], "2026-05-09");
}

#[tokio::test]
async fn issue_core_contract_mass_update_deletes_selected_issues() {
    // Guards legacy IssueMassUpdate.delete bulk deletion over selected non-draft issues.
    let _outbox_guard = webhook_outbox_lock().lock().unwrap();
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");

    let (app, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
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
                "overview": "Issue mass update delete parity",
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
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/issue-mass-delete",
                "secret": "mass-delete-secret",
                "webhookType": "SIMPLE",
                "gitPush": false,
            })),
        )
        .await,
    )
    .await;

    for title in ["First mass delete issue", "Second mass delete issue"] {
        response_json(
            rest(
                app.clone(),
                Method::POST,
                "/yona/api/v1/projects/owner/projectYobi/issues",
                Some(&cookie),
                Some(&csrf),
                Some(json!({
                    "title": title,
                    "bodyMarkdown": "Mass-update delete body",
                })),
            )
            .await,
        )
        .await;
    }
    clear_test_webhook_outbox();

    let mass_deleted = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/mass-update",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "issueNumbers": ["1", "2"],
                "delete": true
            })),
        )
        .await,
    )
    .await;
    assert!(mass_deleted
        .get("items")
        .and_then(|items| items.as_array())
        .is_none_or(Vec::is_empty));

    for issue_number in [1, 2] {
        let detail = rest(
            app.clone(),
            Method::GET,
            &format!("/yona/api/v1/projects/owner/projectYobi/issues/{issue_number}"),
            Some(&cookie),
            None,
            None,
        )
        .await;
        assert_eq!(detail.status(), StatusCode::NOT_FOUND);
    }

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 2);
    assert!(deliveries.iter().all(|delivery| {
        delivery.event_type == "RESOURCE_DELETED" && delivery.webhook_type == "SIMPLE"
    }));

    clear_test_webhook_outbox();
}

#[tokio::test]
async fn issue_core_contract_enqueues_legacy_mass_update_state_assignee_milestone_webhooks() {
    // Guards legacy IssueApp.massUpdate -> NotificationEvent.afterStateChanged
    // webhook fan-out for every issue whose state actually changed.
    let _outbox_guard = webhook_outbox_lock().lock().unwrap();
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");

    let (app, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (csrf, cookie, _) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "assigned").await;
    response_json(
        rpc(
            app.clone(),
            "CreateProject",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "overview": "Issue mass update webhook parity",
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
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/issue-mass-update",
                "secret": "mass-secret",
                "webhookType": "SIMPLE",
                "gitPush": false,
            })),
        )
        .await,
    )
    .await;
    let milestone = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/milestones",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "v1.0",
                "contentsMarkdown": "Ship mass-update webhook parity",
                "dueDate": "2026-05-09",
                "state": "open",
                "attachmentIds": []
            })),
        )
        .await,
    )
    .await;
    let milestone_id = milestone["milestone"]["id"]
        .as_i64()
        .or_else(|| {
            milestone["milestone"]["id"]
                .as_str()
                .and_then(|value| value.parse().ok())
        })
        .expect("milestone id");
    let label = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "categoryName": "Type",
                "categoryIsExclusive": false,
                "labelColor": "#f44336",
                "labelName": "Bug"
            })),
        )
        .await,
    )
    .await;
    let label_id = label["label"]["id"]
        .as_i64()
        .or_else(|| {
            label["label"]["id"]
                .as_str()
                .and_then(|value| value.parse().ok())
        })
        .expect("label id");
    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "title": "First mass update webhook issue",
                "bodyMarkdown": "First issue body",
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
                "title": "Second mass update webhook issue",
                "bodyMarkdown": "Second issue body",
            })),
        )
        .await,
    )
    .await;
    clear_test_webhook_outbox();

    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/mass-update",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "issueNumbers": ["1", "2"],
                "state": "closed",
            })),
        )
        .await,
    )
    .await;

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 2);
    let texts = deliveries
        .iter()
        .map(|delivery| {
            assert_eq!(delivery.event_type, "ISSUE_STATE_CHANGED");
            assert_eq!(delivery.webhook_type, "SIMPLE");
            let payload: serde_json::Value =
                serde_json::from_str(&delivery.body).expect("mass update webhook payload");
            payload["text"].as_str().unwrap_or_default().to_string()
        })
        .collect::<Vec<_>>();
    assert!(texts
        .iter()
        .all(|text| text.contains("notification.type.issue.state.changed")));
    assert!(texts.iter().any(|text| {
        text.contains("/yona/owner/projectYobi/issue/1|#1: First mass update webhook issue")
    }));
    assert!(texts.iter().any(|text| {
        text.contains("/yona/owner/projectYobi/issue/2|#2: Second mass update webhook issue")
    }));

    clear_test_webhook_outbox();

    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/mass-update",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "issueNumbers": ["1", "2"],
                "assigneeUpdate": true,
                "assigneeLoginId": "assigned",
            })),
        )
        .await,
    )
    .await;
    let assignee_deliveries = snapshot_test_webhook_outbox();
    assert_eq!(assignee_deliveries.len(), 2);
    assert!(assignee_deliveries.iter().all(|delivery| {
        delivery.event_type == "ISSUE_ASSIGNEE_CHANGED" && delivery.webhook_type == "SIMPLE"
    }));
    let first_after_assignee = response_json(
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
    assert_eq!(first_after_assignee["assigneeLoginId"], "assigned");
    let assignee_event = first_after_assignee["timeline"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| {
            item["eventType"] == "ISSUE_ASSIGNEE_CHANGED" && item["targetLoginId"] == "assigned"
        })
        .expect("assignee changed timeline event");
    assert_eq!(assignee_event["senderLoginId"], "owner");
    assert_eq!(assignee_event["targetLoginId"], "assigned");
    assert_eq!(assignee_event["targetLabel"], "assigned");
    clear_test_webhook_outbox();

    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/mass-update",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "issueNumbers": ["1", "2"],
                "milestoneUpdate": true,
                "milestoneId": milestone_id,
            })),
        )
        .await,
    )
    .await;
    let milestone_deliveries = snapshot_test_webhook_outbox();
    assert_eq!(milestone_deliveries.len(), 2);
    assert!(milestone_deliveries.iter().all(|delivery| {
        delivery.event_type == "ISSUE_MILESTONE_CHANGED" && delivery.webhook_type == "SIMPLE"
    }));
    let first_after_milestone = response_json(
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
        first_after_milestone["milestoneId"]
            .as_i64()
            .or_else(|| {
                first_after_milestone["milestoneId"]
                    .as_str()
                    .and_then(|value| value.parse().ok())
            })
            .expect("issue milestone id"),
        milestone_id
    );
    let milestone_event = first_after_milestone["timeline"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["eventType"] == "ISSUE_MILESTONE_CHANGED")
        .expect("milestone changed timeline event");
    assert_eq!(
        milestone_event["resourceHref"],
        format!("/owner/projectYobi/milestone/{milestone_id}")
    );
    assert_eq!(milestone_event["resourceLabel"], "v1.0");

    clear_test_webhook_outbox();

    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/mass-update",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "issueNumbers": ["1", "2"],
                "addLabelIds": [label_id],
            })),
        )
        .await,
    )
    .await;
    let first_after_label_add = response_json(
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
    assert!(first_after_label_add["timeline"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["eventType"] == "ISSUE_LABEL_CHANGED"
            && item["newValue"] == "Bug"
            && item["oldValue"].as_str().unwrap_or_default().is_empty()));

    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/mass-update",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "issueNumbers": ["1", "2"],
                "removeLabelIds": [label_id],
            })),
        )
        .await,
    )
    .await;
    let first_after_label_remove = response_json(
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
    let label_events = first_after_label_remove["timeline"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|item| item["eventType"] == "ISSUE_LABEL_CHANGED")
        .collect::<Vec<_>>();
    assert!(label_events.iter().any(|item| item["newValue"] == "Bug"
        && item["oldValue"].as_str().unwrap_or_default().is_empty()));
    assert!(label_events.iter().any(|item| item["newValue"]
        .as_str()
        .unwrap_or_default()
        .is_empty()
        && item["oldValue"] == "Bug"));
}

#[tokio::test]
async fn issue_core_contract_enqueues_legacy_deleted_webhook_payload() {
    // Guards legacy NotificationEvent.afterResourceDeleted -> Webhook fan-out
    // from the issue lifecycle delete route.
    let _outbox_guard = webhook_outbox_lock().lock().unwrap();
    clear_test_webhook_outbox();
    let data_dir = tempdir().expect("yona data tempdir");

    let (app, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
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
                "overview": "Issue delete webhook parity",
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
            "/yona/api/v1/owners/owner/projects/projectYobi/webhooks",
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "payloadUrl": "https://hooks.example/issue-delete",
                "secret": "delete-secret",
                "webhookType": "SIMPLE",
                "gitPush": false,
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
                "title": "Issue delete webhook parity",
                "bodyMarkdown": "Issue delete body",
            })),
        )
        .await,
    )
    .await;
    clear_test_webhook_outbox();

    response_json(
        rest(
            app,
            Method::DELETE,
            "/yona/api/v1/projects/owner/projectYobi/issues/1",
            Some(&cookie),
            Some(&csrf),
            None,
        )
        .await,
    )
    .await;

    let deliveries = snapshot_test_webhook_outbox();
    assert_eq!(deliveries.len(), 1);
    let delivery = &deliveries[0];
    assert_eq!(delivery.event_type, "RESOURCE_DELETED");
    assert_eq!(delivery.webhook_type, "SIMPLE");
    let payload: serde_json::Value =
        serde_json::from_str(&delivery.body).expect("issue delete webhook payload");
    let text = payload["text"].as_str().unwrap_or_default();
    assert!(text.contains("notification.type.issue.deleted"));
    assert!(text.contains("/yona/owner/projectYobi/issue/1|#1: Issue delete webhook parity"));

    clear_test_webhook_outbox();
}

#[tokio::test]
async fn issue_core_contract_creates_reads_updates_and_deletes_over_rest() {
    // Guards issue route-owned detail/state helpers, detail/timeline/list
    // projections, REST response DTOs, mutation, issues/comments.rs,
    // issues/legacy_external.rs split, and the service-snapshot legacy
    // external auth helper.
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
    assert_eq!(created["issueNumber"], 1);
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
    assert_eq!(detail["issueNumber"], 1);
    assert_eq!(detail["ownerName"], "owner");
    assert_eq!(detail["projectName"], "projectYobi");
    let issue_author_avatar_url = detail["authorAvatarUrl"]
        .as_str()
        .expect("issue detail author avatar url");
    assert!(
        issue_author_avatar_url.starts_with("https://www.gravatar.com/avatar/")
            && issue_author_avatar_url.ends_with("?s=256&d=https%3A%2F%2Fko.gravatar.com%2Fuserimage%2F53495145%2F0eaeeb47c620542ad089f17377298af6.png"),
        "{issue_author_avatar_url}"
    );
    let issue_assignee_avatar_url = detail["assigneeAvatarUrl"]
        .as_str()
        .expect("issue detail assignee avatar url");
    assert!(
        issue_assignee_avatar_url.starts_with("https://www.gravatar.com/avatar/")
            && issue_assignee_avatar_url.ends_with("?s=256&d=https%3A%2F%2Fko.gravatar.com%2Fuserimage%2F53495145%2F0eaeeb47c620542ad089f17377298af6.png"),
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
            && author_avatar_url.ends_with("?s=256&d=https%3A%2F%2Fko.gravatar.com%2Fuserimage%2F53495145%2F0eaeeb47c620542ad089f17377298af6.png"),
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
    let detail_with_timeline = response_json(
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
        detail_with_timeline["comments"][0]["contentsMarkdown"],
        "A [safe](https://example.com) comment"
    );
    assert_eq!(detail_with_timeline["timeline"][0]["kind"], "comment");
    assert_eq!(
        detail_with_timeline["timeline"][0]["comment"]["contentsMarkdown"],
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
    let pjax_requested_list = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/projects/owner/projectYobi/issues?state=closed&pageNum=1")
                .header("X-Requested-With", "XMLHttpRequest")
                .header("X-PJAX", "true")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(pjax_requested_list.status(), StatusCode::OK);
    assert!(pjax_requested_list
        .headers()
        .get(http::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.starts_with("application/json")));
    let pjax_requested_list = response_json(pjax_requested_list).await;
    assert_eq!(pjax_requested_list["items"].as_array().unwrap().len(), 1);
    assert_eq!(pjax_requested_list["items"][0]["issueNumber"], 1);
    assert_eq!(pjax_requested_list["items"][0]["commentCount"], 1);

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
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/comments/new",
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
                "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/comments/{legacy_external_comment_id}/update"
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
    assert_eq!(deleted_issue["issueNumber"], 1);

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
        // Legacy XLS export is dispatched through the asset fallback path.
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
async fn project_issue_list_sql_filters_labels_assignee_commenter() {
    // Pins the sea-query filter path of the issue list: label-set, commenter,
    // assignee-login, and author-login filters on the same project.
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "assignee").await;
    let (commenter_csrf, commenter_cookie, commenter_id) =
        register_user(app.clone(), "commenter").await;

    let project = rpc(
        app.clone(),
        "CreateProject",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "overview": "SQL filter parity",
            "projectScope": "public"
        }),
    )
    .await;
    response_json(project).await;

    let label_response = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/labels",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "labelName": "bug",
                "labelColor": "#f00",
                "categoryName": ""
            })),
        )
        .await,
    )
    .await;
    let label_id = label_response["label"]["id"]
        .as_i64()
        .expect("created label id");

    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "bodyMarkdown": "labeled",
                "labelIds": [label_id],
                "title": "Labeled and commented"
            })),
        )
        .await,
    )
    .await;
    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues/1/comments",
            Some(&commenter_cookie),
            Some(&commenter_csrf),
            Some(json!({"contentsMarkdown": "comment body"})),
        )
        .await,
    )
    .await;
    response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/projects/owner/projectYobi/issues",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "assigneeLoginId": "assignee",
                "bodyMarkdown": "assigned",
                "title": "Assignee filtered"
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
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({
                "bodyMarkdown": "plain",
                "title": "Plain open issue"
            })),
        )
        .await,
    )
    .await;

    let labeled = response_json(
        rest(
            app.clone(),
            Method::GET,
            &format!(
                "/yona/api/v1/projects/owner/projectYobi/issues?state=open&labelIds[]={label_id}"
            ),
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(labeled["totalCount"], 1);
    assert_eq!(labeled["items"][0]["title"], "Labeled and commented");

    let commented = response_json(
        rest(
            app.clone(),
            Method::GET,
            &format!(
                "/yona/api/v1/projects/owner/projectYobi/issues?state=open&commenterId={commenter_id}"
            ),
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(commented["totalCount"], 1);
    assert_eq!(commented["items"][0]["title"], "Labeled and commented");

    let assigned = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues?state=open&assigneeLoginId=assignee",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(assigned["totalCount"], 1);
    assert_eq!(assigned["items"][0]["title"], "Assignee filtered");

    let authored = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/projects/owner/projectYobi/issues?state=open&authorLoginId=owner",
            None,
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(authored["totalCount"], 3);
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
    assert_eq!(created["issueNumber"], 1);

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
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/content/update",
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

    let rest_content_updated = response_json(
        rest(
            app.clone(),
            Method::PATCH,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/content",
            Some(&guest_cookie),
            Some(&guest_csrf),
            Some(json!({
                "content": "rest content update",
                "original": "legacy external content update"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(rest_content_updated["body"], "rest content update");

    let legacy_detect_change = response_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/detect-change",
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
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1",
            Some(&guest_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_read["result"]["body"], "rest content update");
    assert_eq!(legacy_read["result"]["number"], 1);

    let legacy_updated = response_json(
        rest(
            app.clone(),
            Method::PUT,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1",
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
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1",
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
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/weight/upvote",
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
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/weight/downvote",
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
    let comment_id = commented["comments"][0]["id"]
        .as_i64()
        .map(|value| value.to_string())
        .or_else(|| commented["comments"][0]["id"].as_str().map(str::to_string))
        .expect("comment id");

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
    assert_eq!(created["issueNumber"], 2);

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
                    == "Derived issue: http://localhost:3001/yona/owner/projectYobi/issue/2"
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

#[tokio::test]
async fn issue_comment_update_rejects_stale_original_like_legacy() {
    // Legacy IssueApi.updateIssueComment returns 409 {message, storedContent} when the
    // stored contents differ from the submitted original (P9).
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
                "overview": "Comment conflict parity",
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
                "title": "Conflict issue",
                "bodyMarkdown": "body"
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
                "contentsMarkdown": "stored comment body"
            })),
        )
        .await,
    )
    .await;
    let comment_id = commented["comments"][0]["id"].as_i64().expect("comment id");

    let stale = rest(
        app.clone(),
        Method::PUT,
        &format!("/yona/api/v1/projects/owner/projectYobi/issues/1/comments/{comment_id}"),
        Some(&cookie),
        Some(&csrf),
        Some(json!({
            "contentsMarkdown": "fresh body",
            "original": "stale original body"
        })),
    )
    .await;
    assert_eq!(stale.status(), StatusCode::CONFLICT);
    let conflict = response_json_with_status(stale, StatusCode::CONFLICT).await;
    assert_eq!(conflict["message"], "Already modified by someone.");
    assert_eq!(conflict["storedContent"], "stored comment body");

    let matching = response_json(
        rest(
            app.clone(),
            Method::PUT,
            &format!("/yona/api/v1/projects/owner/projectYobi/issues/1/comments/{comment_id}"),
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "contentsMarkdown": "updated comment body",
                "original": "stored comment body"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        matching["comments"]
            .as_array()
            .unwrap()
            .iter()
            .find(|comment| comment["id"] == comment_id)
            .expect("updated comment")["contentsMarkdown"],
        "updated comment body"
    );

    let without_original = response_json(
        rest(
            app.clone(),
            Method::PUT,
            &format!("/yona/api/v1/projects/owner/projectYobi/issues/1/comments/{comment_id}"),
            Some(&cookie),
            Some(&csrf),
            Some(json!({
                "contentsMarkdown": "updated again without original"
            })),
        )
        .await,
    )
    .await;
    assert_eq!(
        without_original["comments"]
            .as_array()
            .unwrap()
            .iter()
            .find(|comment| comment["id"] == comment_id)
            .expect("updated comment")["contentsMarkdown"],
        "updated again without original"
    );
}

#[tokio::test]
async fn issue_comment_patch_direct_route_rejects_stale_original_like_legacy() {
    // Legacy routes PATCH /:user/:project/issue/:n/comments/:cid to
    // IssueApi.updateIssueComment: JSON {content, original}, 409
    // {"message":"Already modified by someone.","storedContent":...} when the
    // normalized stored contents differ from the submitted original, and no
    // conflict when they differ only by \r / surrounding whitespace
    // (IssueApi.isModifiedByOthers hashes trim()+'\r'-stripped text).
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
                "overview": "Comment patch parity",
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
                "title": "Patch conflict issue",
                "bodyMarkdown": "body"
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
                "contentsMarkdown": "stored patch body"
            })),
        )
        .await,
    )
    .await;
    let comment_id = commented["comments"][0]["id"].as_i64().expect("comment id");
    let patch_path = format!("/yona/owner/projectYobi/issue/1/comments/{comment_id}");

    let stale = rest(
        app.clone(),
        Method::PATCH,
        &patch_path,
        Some(&cookie),
        Some(&csrf),
        Some(json!({
            "content": "fresh content",
            "original": "stale original"
        })),
    )
    .await;
    assert_eq!(stale.status(), StatusCode::CONFLICT);
    let conflict = response_json_with_status(stale, StatusCode::CONFLICT).await;
    assert_eq!(conflict["message"], "Already modified by someone.");
    assert_eq!(conflict["storedContent"], "stored patch body");

    // Only \r and surrounding whitespace differ -> legacy treats it as unchanged.
    let normalized = rest(
        app.clone(),
        Method::PATCH,
        &patch_path,
        Some(&cookie),
        Some(&csrf),
        Some(json!({
            "content": "patched via direct route",
            "original": "\r\n  stored patch body  \r\n"
        })),
    )
    .await;
    assert_eq!(normalized.status(), StatusCode::OK);
}
