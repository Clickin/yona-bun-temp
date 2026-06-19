use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ColumnTrait, Database, DatabaseConnection, EntityTrait, QueryFilter};
use serde_json::{json, Value};
use std::sync::{Mutex, OnceLock};
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_integrations::{clear_test_outbox, snapshot_test_outbox};
use yona_rust_persistence::{project_transfer, AppRepository};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};
use yona_rust_vcs::repository_path;

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

async fn create_project_named(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    owner: &str,
    project_name: &str,
    overview: &str,
) {
    ok_json(
        rest(
            app,
            Method::POST,
            &format!("/yona/api/v1/owners/{owner}/projects"),
            Some(cookie),
            Some(csrf),
            Some(json!({
                "overview": overview,
                "projectName": project_name,
                "projectScope": "public",
            })),
        )
        .await,
    )
    .await;
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str) {
    create_project_named(app, cookie, csrf, "owner", "projectYobi", "transfer parity").await;
}

#[tokio::test]
// Guards project transfer mail reuse of the route-utils-owned mail and absolute app URL helpers.
async fn project_transfer_requests_and_accept_link_follow_legacy_permissions() {
    // Guards direct project transfer accept handler while project route ownership is split.
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    clear_test_outbox();
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (recipient_csrf, recipient_cookie) = register_user(app.clone(), "recipient").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let repository = AppRepository::new(db.clone());
    let original_project = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .expect("original project lookup")
        .expect("original project");
    let original_repo_path = repository_path(data_dir.path(), original_project.id);
    assert!(original_repo_path.is_dir());

    let forbidden = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/owners/owner/projects/projectYobi/transfer",
        Some(&guest_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let form = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/transfer",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(form["ownerName"], "owner");
    assert_eq!(form["projectName"], "projectYobi");
    assert_eq!(form["viewerCanTransfer"], true);

    let invalid = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/transfer",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({ "destination": "" })),
    )
    .await;
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);

    let forbidden_create = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/transfer",
        Some(&guest_cookie),
        Some(&guest_csrf),
        Some(json!({ "destination": "recipient" })),
    )
    .await;
    assert_eq!(forbidden_create.status(), StatusCode::FORBIDDEN);

    let requested = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/transfer",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "destination": "recipient" })),
        )
        .await,
    )
    .await;
    let transfer_id = requested["transferId"].as_i64().expect("transfer id");
    assert_eq!(requested["destination"], "recipient");
    assert_eq!(requested["newProjectName"], "projectYobi");
    assert_eq!(requested["redirectPath"], "/owner/projectYobi");
    assert_eq!(
        requested["acceptPath"],
        format!(
            "/project/transfer/{transfer_id}/{}",
            requested["confirmKey"].as_str().unwrap()
        )
    );

    let row = project_transfer::Entity::find_by_id(transfer_id)
        .one(&db)
        .await
        .expect("transfer lookup")
        .expect("transfer row");
    assert_eq!(row.destination.as_deref(), Some("recipient"));
    assert_eq!(row.accepted, Some(0));
    assert_eq!(row.new_project_name.as_deref(), Some("projectYobi"));
    let confirm_key = row.confirm_key.clone().expect("confirm key");
    assert_eq!(confirm_key.len(), 50);
    let outbox = snapshot_test_outbox();
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox[0].to, "recipient@example.com");
    assert_eq!(
        outbox[0].subject,
        "[projectYobi] @owner wants to transfer project"
    );
    assert!(outbox[0].body.contains("Hello recipient,"));
    assert!(outbox[0].body.contains("owner/projectYobi"));
    assert!(outbox[0].body.contains("recipient/projectYobi"));
    assert!(outbox[0]
        .body
        .contains(&format!("/project/transfer/{transfer_id}/{confirm_key}")));
    assert!(outbox[0].body.contains("If you do not accept"));

    create_project_named(
        app.clone(),
        &recipient_cookie,
        &recipient_csrf,
        "recipient",
        "projectYobi",
        "recipient already owns this name",
    )
    .await;

    let wrong_user_accept = rest(
        app.clone(),
        Method::GET,
        &format!("/yona/project/transfer/{transfer_id}/{confirm_key}"),
        Some(&guest_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(wrong_user_accept.status(), StatusCode::FORBIDDEN);

    let wrong_key = rest(
        app.clone(),
        Method::GET,
        &format!("/yona/project/transfer/{transfer_id}/wrong"),
        Some(&recipient_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(wrong_key.status(), StatusCode::BAD_REQUEST);

    let accepted = rest(
        app.clone(),
        Method::GET,
        &format!("/yona/project/transfer/{transfer_id}/{confirm_key}"),
        Some(&recipient_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(accepted.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        accepted.headers().get(http::header::LOCATION).unwrap(),
        "/yona/recipient/projectYobi-1"
    );

    let moved = repository
        .read_project_by_owner_and_name("recipient", "projectYobi-1")
        .await
        .expect("moved project lookup")
        .expect("moved project");
    assert_eq!(moved.owner_name, "recipient");
    assert_eq!(moved.project_name, "projectYobi-1");
    assert_eq!(moved.id, original_project.id);
    assert!(original_repo_path.is_dir());
    assert_eq!(moved.previous_owner_name.as_deref(), Some("owner"));
    assert_eq!(moved.previous_project_name.as_deref(), Some("projectYobi"));
    assert!(
        repository
            .read_project_by_owner_and_name("owner", "projectYobi")
            .await
            .expect("previous project lookup")
            .is_some(),
        "previous owner/name should remain a legacy lookup alias"
    );
    let owner_auth = repository
        .read_project_authorization("recipient", "projectYobi-1", Some(1))
        .await
        .expect("owner auth")
        .expect("owner auth record");
    assert!(!owner_auth.viewer.is_project_manager);
    assert!(owner_auth.viewer.is_project_member);
    let recipient_auth = repository
        .read_project_authorization("recipient", "projectYobi-1", Some(2))
        .await
        .expect("recipient auth")
        .expect("recipient auth record");
    assert!(recipient_auth.viewer.is_project_manager);
    let accepted_transfer = project_transfer::Entity::find()
        .filter(project_transfer::Column::Id.eq(transfer_id))
        .one(&db)
        .await
        .expect("accepted transfer lookup")
        .expect("accepted transfer");
    assert_eq!(accepted_transfer.accepted, Some(1));
    assert_eq!(
        accepted_transfer.new_project_name.as_deref(),
        Some("projectYobi-1")
    );
}
