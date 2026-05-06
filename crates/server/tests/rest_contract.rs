use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::Value;
use tower::ServiceExt;
use yona_rust_pilot_server::{create_router, RuntimeConfig};

fn build_router() -> axum::Router {
    create_router(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    })
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).unwrap()
}

#[tokio::test]
async fn rest_session_route_coexists_with_bootstrap_and_rpc() {
    let app = build_router();

    let rest_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(rest_response.status(), StatusCode::OK);
    assert!(rest_response.headers().get("x-csrf-token").is_some());
    assert!(rest_response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .any(|cookie| cookie.to_str().unwrap().starts_with("yona_session=")));
    let rest_json = response_json(rest_response).await;
    assert_eq!(
        rest_json.get("isAnonymous").and_then(Value::as_bool),
        Some(true)
    );
    assert!(rest_json
        .get("defaultLandingPath")
        .and_then(Value::as_str)
        .is_some());

    let bootstrap_response = app
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

    assert_eq!(bootstrap_response.status(), StatusCode::OK);
    assert!(bootstrap_response.headers().get("x-csrf-token").is_some());

    let rpc_response = app
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

    assert_eq!(rpc_response.status(), StatusCode::OK);
}

#[tokio::test]
async fn unknown_rest_route_returns_shared_json_error_envelope() {
    let response = build_router()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/unknown")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let body = response_json(response).await;
    assert_eq!(body["error"]["code"], "not_found");
    assert_eq!(body["error"]["message"], "REST endpoint not found.");
    assert_eq!(body["error"]["status"], 404);
}
