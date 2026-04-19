use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

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
        .map(|value| value.to_str().unwrap().split(';').next().unwrap().to_string())
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

async fn rpc(
    app: axum::Router,
    method_name: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: serde_json::Value,
) -> Response<Body> {
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
        .and_then(|value| value.as_i64().or_else(|| value.as_str().and_then(|value| value.parse().ok())))
        .expect("actor id");

    (csrf, cookie_header, actor_id)
}

#[tokio::test]
async fn issue_core_contract_creates_reads_comments_and_sanitizes_markdown() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie, _) = register_user(app.clone(), "owner").await;

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
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Markdown issue",
                "bodyMarkdown": "Hello **Yona** <script>alert(1)</script>"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(created["issueNumber"], "1");
    assert_eq!(created["state"], "open");
    assert_eq!(created["isWatching"], true);
    assert!(created["bodyHtml"].as_str().unwrap().contains("<strong>Yona</strong>"));
    assert!(!created["bodyHtml"].as_str().unwrap().contains("<script>"));

    let commented = response_json(
        rpc(
            app.clone(),
            "CreateIssueComment",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "contentsMarkdown": "A [safe](https://example.com) comment"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(commented["comments"].as_array().unwrap().len(), 1);
    assert_eq!(commented["timeline"].as_array().unwrap().len(), 1);
    assert!(commented["comments"][0]["contentsHtml"]
        .as_str()
        .unwrap()
        .contains("https://example.com"));

    let listed = response_json(
        rpc(
            app,
            "ListProjectIssues",
            None,
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "state": "open",
                "pageNum": 1
            }),
        )
        .await,
    )
    .await;
    assert_eq!(listed["items"].as_array().unwrap().len(), 1);
    assert_eq!(listed["items"][0]["commentCount"], 1);
}

#[tokio::test]
async fn issue_mutation_contract_preserves_legacy_public_project_permissions() {
    let (app, repo) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, guest_id) = register_user(app.clone(), "guest").await;
    let (outsider_csrf, outsider_cookie, _) = register_user(app.clone(), "outsider").await;

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
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Public guest issue",
                "bodyMarkdown": "body"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(created["issueNumber"], "1");

    let forbidden = rpc(
        app.clone(),
        "UpdateIssue",
        Some(&outsider_cookie),
        Some(&outsider_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "title": "forbidden",
            "bodyMarkdown": "forbidden"
        }),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    repo.add_project_membership(project.id, guest_id, "member")
        .await
        .unwrap();

    let updated = response_json(
        rpc(
            app.clone(),
            "UpdateIssue",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "title": "edited by member",
                "bodyMarkdown": "updated"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(updated["title"], "edited by member");

    let mass_updated = response_json(
        rpc(
            app,
            "MassUpdateIssues",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumbers": ["1"],
                "state": "closed"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(mass_updated["items"][0]["state"], "closed");
}
