use std::fs;

use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_pilot_server::{
    create_router_with_embedded_assets, create_router_with_filesystem_assets, RuntimeConfig,
};

#[tokio::test]
async fn filesystem_assets_support_base_path_injection_and_spa_fallback() {
    let temp = tempdir().expect("tempdir");
    let asset_root = temp.path();
    fs::create_dir_all(asset_root.join("assets")).expect("assets dir");
    fs::write(
        asset_root.join("index.html"),
        "<!doctype html><html><head><title>Yona</title></head><body><div id=\"root\"></div><script type=\"module\" src=\"./assets/app.js\"></script></body></html>",
    )
    .expect("write index");
    fs::write(
        asset_root.join("assets").join("app.js"),
        "console.log('pilot');",
    )
    .expect("write asset");

    let app = create_router_with_filesystem_assets(
        RuntimeConfig {
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        asset_root.to_path_buf(),
    );

    let index = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(index.status(), StatusCode::OK);
    let index_body = index.into_body().collect().await.unwrap().to_bytes();
    let html = String::from_utf8(index_body.to_vec()).unwrap();
    assert!(html.contains("window.__YONA_RUNTIME_CONFIG__"));
    assert!(html.contains("\"basePath\":\"/yona\""));
    assert!(html.contains("\"rpcBaseUrl\":\"/yona/rpc\""));
    assert!(html.contains("\"apiBaseUrl\":\"/yona/api\""));

    let asset = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/assets/app.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(asset.status(), StatusCode::OK);
    let asset_body = asset.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        String::from_utf8(asset_body.to_vec()).unwrap(),
        "console.log('pilot');"
    );

    let fallback = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/projects")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(fallback.status(), StatusCode::OK);
    let fallback_body = fallback.into_body().collect().await.unwrap().to_bytes();
    let fallback_html = String::from_utf8(fallback_body.to_vec()).unwrap();
    assert!(fallback_html.contains("window.__YONA_RUNTIME_CONFIG__"));
}

#[tokio::test]
async fn embedded_assets_support_base_path_injection_and_spa_fallback() {
    let app = create_router_with_embedded_assets(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let index = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(index.status(), StatusCode::OK);
    let index_body = index.into_body().collect().await.unwrap().to_bytes();
    let html = String::from_utf8(index_body.to_vec()).unwrap();
    assert!(html.contains("window.__YONA_RUNTIME_CONFIG__"));
    assert!(html.contains("\"basePath\":\"/yona\""));

    let asset = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/assets/app.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(asset.status(), StatusCode::OK);
    let asset_body = asset.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        String::from_utf8(asset_body.to_vec()).unwrap().trim_end(),
        "console.log('embedded-pilot');"
    );

    let fallback = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/projects")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(fallback.status(), StatusCode::OK);
    let fallback_body = fallback.into_body().collect().await.unwrap().to_bytes();
    let fallback_html = String::from_utf8(fallback_body.to_vec()).unwrap();
    assert!(fallback_html.contains("window.__YONA_RUNTIME_CONFIG__"));
}
