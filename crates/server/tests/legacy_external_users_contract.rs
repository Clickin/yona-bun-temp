use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;
use yoram_migration::Migrator;
use yoram_persistence::AppRepository;
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
// Guards the users route-module split for legacy external user search/statistics surfaces.
async fn legacy_external_users_search_preserves_members_helper_contract() {
    let (app, _repository) = build_app_with_repository().await;
    register_user(app.clone(), "owner").await;
    let (_, visitor_cookie_header) = register_user(app.clone(), "visitor").await;

    let legacy_users_empty = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/users?query=",
            &[
                ("Accept", "application/json"),
                ("Referer", "http://localhost/yona/owner/projectYobi/members"),
            ],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_users_empty, json!([]));

    let legacy_users = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/users?query=vis",
            &[
                ("Accept", "application/json"),
                ("Referer", "http://localhost/yona/owner/projectYobi/members"),
            ],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_users
            .as_array()
            .expect("legacy users search results")
            .len(),
        1
    );
    assert_eq!(legacy_users[0]["loginId"], "visitor");
    assert!(legacy_users[0]["info"]
        .as_str()
        .expect("legacy user info html")
        .contains("mention_username"));
    assert!(legacy_users[0]["info"]
        .as_str()
        .expect("legacy user info html")
        .contains("mention_image"));

    // Legacy UserApp.users() excludes only DELETED users and never drops the
    // first-registered user (who is the initial site admin), so a search that
    // matches "owner" must return them.
    let legacy_users_owner = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/users?query=own",
            &[
                ("Accept", "application/json"),
                ("Referer", "http://localhost/yona/owner/projectYobi/members"),
            ],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_users_owner
            .as_array()
            .expect("legacy users search results")
            .len(),
        1
    );
    assert_eq!(legacy_users_owner[0]["loginId"], "owner");

    let legacy_users_html = rest_with_headers(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/users?query=vis",
        &[
            ("Accept", "text/html"),
            ("Referer", "http://localhost/yona/owner/projectYobi/members"),
        ],
        None,
    )
    .await;
    assert_eq!(legacy_users_html.status(), StatusCode::NOT_ACCEPTABLE);

    let legacy_users_without_members_referer = rest_with_headers(
        app.clone(),
        Method::GET,
        "/yona/-_-api/v1/users?query=vis",
        &[("Accept", "application/json")],
        None,
    )
    .await;
    assert_eq!(
        legacy_users_without_members_referer.status(),
        StatusCode::NOT_ACCEPTABLE
    );

    let legacy_statistics = ok_json(
        rest_with_headers(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/users/visitor/statistics",
            &[("Cookie", &visitor_cookie_header)],
            None,
        )
        .await,
    )
    .await;
    assert_eq!(legacy_statistics["assignedIssue"], 0);
    assert_eq!(legacy_statistics["issueComment"], 0);
}
