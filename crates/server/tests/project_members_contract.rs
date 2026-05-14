use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::{json, Value};
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

async fn build_app_with_repository() -> axum::Router {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db);
    create_router_with_app_repository(
        RuntimeConfig {
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo,
    )
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

async fn error_json(response: axum::response::Response, expected_status: StatusCode) -> Value {
    let status = response.status();
    let text = response_text(response).await;
    assert_eq!(status, expected_status, "{text}");
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

async fn create_project(app: axum::Router, cookie: &str, csrf: &str) {
    let response = rpc(
        app,
        "CreateProject",
        Some(cookie),
        Some(csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "overview": "member parity",
            "projectScope": "public"
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

fn user_id_for(body: &Value, login_id: &str) -> i64 {
    body["members"]
        .as_array()
        .expect("members array")
        .iter()
        .find(|member| member["loginId"] == login_id)
        .and_then(|member| member["userId"].as_i64())
        .expect("member user id")
}

#[tokio::test]
async fn rest_project_members_manage_member_lifecycle_and_enrollment_acceptance() {
    let app = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (alice_csrf, alice_cookie) = register_user(app.clone(), "alice").await;
    let (outsider_csrf, outsider_cookie) = register_user(app.clone(), "outsider").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;

    let initial = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(initial["permissions"]["canUpdate"], true);
    assert_eq!(initial["members"][0]["loginId"], "owner");
    assert_eq!(initial["members"][0]["role"], "manager");
    assert_eq!(initial["members"][0]["isOwner"], true);
    assert_eq!(initial["roleOptions"][0]["role"], "manager");
    assert_eq!(initial["roleOptions"][1]["role"], "member");

    error_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&outsider_cookie),
            Some(&outsider_csrf),
            Some(json!({ "loginId": "alice" })),
        )
        .await,
        StatusCode::FORBIDDEN,
    )
    .await;

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/enroll",
            Some(&alice_cookie),
            Some(&alice_csrf),
            None,
        )
        .await,
    )
    .await;
    let with_request = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(with_request["enrollmentRequests"][0]["loginId"], "alice");
    assert!(with_request["enrollmentRequests"][0]["userId"].is_i64());

    let added = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "loginId": "alice" })),
        )
        .await,
    )
    .await;
    assert_eq!(added["enrollmentRequests"].as_array().unwrap().len(), 0);
    assert_eq!(added["members"][1]["loginId"], "alice");
    assert_eq!(added["members"][1]["role"], "member");
    assert_eq!(added["members"][1]["isOwner"], false);
    let alice_user_id = user_id_for(&added, "alice");
    let owner_user_id = user_id_for(&added, "owner");

    let watchers = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/watchers",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(watchers["watchers"][0]["loginId"], "alice");

    let promoted = ok_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/members/{alice_user_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "role": "manager" })),
        )
        .await,
    )
    .await;
    assert_eq!(
        promoted["members"]
            .as_array()
            .unwrap()
            .iter()
            .find(|member| member["loginId"] == "alice")
            .unwrap()["role"],
        "manager"
    );

    error_json(
        rest(
            app.clone(),
            Method::PATCH,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/members/{owner_user_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "role": "member" })),
        )
        .await,
        StatusCode::BAD_REQUEST,
    )
    .await;

    let left = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/members/{alice_user_id}"),
            Some(&alice_cookie),
            Some(&alice_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(left["redirectPath"], "/owner/projectYobi");
    assert!(left["members"]
        .as_array()
        .unwrap()
        .iter()
        .all(|member| member["loginId"] != "alice"));

    error_json(
        rest(
            app,
            Method::DELETE,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/members/{owner_user_id}"),
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
        StatusCode::FORBIDDEN,
    )
    .await;
}
