use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use tower::ServiceExt;
use yona_rust_pilot_server::{create_router, RuntimeConfig};

#[tokio::test]
async fn mounts_session_bootstrap_under_base_path() {
    let app = create_router(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

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

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn session_bootstrap_issues_cookies_and_csrf_header() {
    let app = create_router(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

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

    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get("x-csrf-token").is_some());

    let cookies: Vec<String> = response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().to_string())
        .collect();
    assert!(cookies
        .iter()
        .any(|cookie| cookie.starts_with("yona_session=")));
    assert!(cookies
        .iter()
        .any(|cookie| cookie.starts_with("yona_csrf_token=")));

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"session\":null"));
    assert!(json.contains("\"user\":null"));
}

#[tokio::test]
async fn read_current_session_works_over_connect_json() {
    let app = create_router(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadCurrentSession")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"isAnonymous\":true"));
    assert!(json.contains("\"defaultLandingPath\":\"/me\""));
}

#[tokio::test]
async fn list_projects_works_over_connect_json() {
    let app = create_router(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ListProjects")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"ownerName\":\"pilot\""));
    assert!(json.contains("\"projectName\":\"yona\""));
    assert!(json.contains("\"projectScope\":\"public\""));
}

#[tokio::test]
async fn list_organizations_works_over_connect_json() {
    let app = create_router(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ListOrganizations")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"organizationName\":\"pilot\""));
    assert!(json.contains("\"description\":\"Pilot organization directory route"));
}

#[tokio::test]
async fn read_issue_detail_applies_the_go_pilot_status_contract() {
    let app = create_router(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let invalid = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadIssueDetail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    "{\"ownerName\":\"pilot\",\"projectName\":\"yona\",\"issueNumber\":\"0\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);

    let missing = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadIssueDetail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    "{\"ownerName\":\"missing\",\"projectName\":\"yona\",\"issueNumber\":\"1\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn update_issue_state_requires_bootstrapped_csrf() {
    let app = create_router(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let unauthorized = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/UpdateIssueState")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{\"ownerName\":\"pilot\",\"projectName\":\"yona\",\"issueNumber\":\"1\",\"state\":\"closed\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(unauthorized.status(), StatusCode::UNAUTHORIZED);

    let bootstrap = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/auth/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let csrf = bootstrap
        .headers()
        .get("x-csrf-token")
        .unwrap()
        .to_str()
        .unwrap()
        .to_string();
    let cookies: Vec<String> = bootstrap
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
    let cookie_header = cookies.join("; ");

    let forbidden = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/UpdateIssueState")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", "wrong-csrf")
                .body(Body::from("{\"ownerName\":\"pilot\",\"projectName\":\"yona\",\"issueNumber\":\"1\",\"state\":\"closed\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let success = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/UpdateIssueState")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from("{\"ownerName\":\"pilot\",\"projectName\":\"yona\",\"issueNumber\":\"1\",\"state\":\"closed\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(success.status(), StatusCode::OK);
    let body = success.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"state\":\"closed\""));
}
