use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;
use yoram_migration::Migrator;
use yoram_persistence::{AppRepository, CreateIssueInput, CreateProjectInput, IssueMutationInput};
use yoram_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

async fn build_app_with_repository() -> (axum::Router, AppRepository) {
    let db = sea_orm::Database::connect("sqlite::memory:")
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

async fn response_json(response: axum::response::Response) -> Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).unwrap()
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
    rest_test_support::pilot_rest(app, method_name, cookie_header, csrf, payload).await
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

async fn rest_with_headers(
    app: axum::Router,
    method: Method,
    uri: &str,
    headers: &[(&str, &str)],
    payload: Option<Value>,
) -> axum::response::Response {
    let mut builder = Request::builder().method(method).uri(uri);
    for (name, value) in headers {
        builder = builder.header(*name, *value);
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

#[tokio::test]
async fn legacy_external_user_issues_returns_legacy_result_shape() {
    let (app, repository) = build_app_with_repository().await;
    let (_owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "owner".to_string(),
            overview: Some("rest parity".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();

    let owner = repository
        .find_user_by_identifier("owner")
        .await
        .unwrap()
        .expect("owner user");
    let issue = repository
        .create_issue(CreateIssueInput {
            actor_display_name: owner.display_name.clone(),
            actor_id: owner.id,
            actor_login_id: owner.login_id.clone(),
            owner_name: "owner".to_string(),
            project_name: "projectYobi".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: Vec::new(),
                body_markdown: "Legacy user issue body".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
                title: "Legacy user issue".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("legacy user issue");
    assert_eq!(issue.issue_number, 1);

    let legacy_user_issues = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/user/issues/search?filter=authored&page=1&pageNum=5",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    let legacy_user_issues = legacy_user_issues["result"]
        .as_array()
        .expect("legacy user issue list result");
    let legacy_user_issue = legacy_user_issues
        .iter()
        .find(|listed_issue| listed_issue["id"] == issue.id)
        .expect("legacy user issue list contains created issue");
    assert_eq!(legacy_user_issue["number"], 1);
    assert_eq!(legacy_user_issue["state"], "OPEN");
    assert_eq!(legacy_user_issue["title"], "Legacy user issue");
    assert_eq!(legacy_user_issue["author"]["id"], owner.id);
    assert_eq!(legacy_user_issue["author"]["loginId"], "owner");
    assert_eq!(legacy_user_issue["author"]["name"], "owner");
    assert_eq!(legacy_user_issue["assignee"], json!({}));
    assert_eq!(legacy_user_issue["project"]["name"], "projectYobi");
    assert_eq!(legacy_user_issue["owner"], "owner");
    assert_eq!(legacy_user_issue["refUrl"], "owner/projectYobi/issue/1");

    let token_response = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/auth/token",
        None,
        None,
        Some(json!({
            "id": "owner",
            "password": "doorpass1"
        })),
    )
    .await;
    assert_eq!(token_response.status(), StatusCode::OK);
    let api_token = response_json(token_response).await["access_token"]
        .as_str()
        .expect("legacy access token")
        .to_string();
    let authorization_header = format!("token {api_token}");
    let token_user_issues = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/api/v1/user/issues/search?filter=authored&page=1&pageNum=5",
            &[("Authorization", &authorization_header)],
            None,
        )
        .await,
    )
    .await;
    assert!(token_user_issues["result"]
        .as_array()
        .expect("legacy token user issues")
        .iter()
        .any(|listed_issue| listed_issue["id"] == issue.id));

    let anonymous_user_issues = rest(
        app,
        Method::GET,
        "/yona/api/v1/user/issues/search?filter=authored&page=1&pageNum=5",
        None,
        None,
        None,
    )
    .await;
    assert_eq!(anonymous_user_issues.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        response_json(anonymous_user_issues).await,
        json!({ "message": "unauthorized request" })
    );
}
