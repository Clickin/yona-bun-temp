use std::fs;

use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{Database, DatabaseConnection};
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router_with_app_repository, create_router_with_embedded_assets,
    create_router_with_filesystem_assets, RuntimeConfig,
};

async fn build_auth_router() -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());

    (
        create_router_with_app_repository(
            RuntimeConfig {
                base_path: "/yona".to_string(),
                public_origin: String::new(),
            },
            app_repo.clone(),
        ),
        app_repo,
        db,
    )
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

fn multipart_body(file_name: &str, mime_type: &str, bytes: &[u8]) -> (String, Vec<u8>) {
    let boundary = "yona-boundary";
    let mut body = Vec::new();
    body.extend_from_slice(
        format!(
            "--{boundary}\r\nContent-Disposition: form-data; name=\"filePath\"; filename=\"{file_name}\"\r\nContent-Type: {mime_type}\r\n\r\n"
        )
        .as_bytes(),
    );
    body.extend_from_slice(bytes);
    body.extend_from_slice(format!("\r\n--{boundary}--\r\n").as_bytes());
    (boundary.to_string(), body)
}

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

#[tokio::test]
async fn avatar_file_upload_requires_auth_and_rejects_non_image_or_oversized_payloads() {
    let (app, _, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let unauthorized = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/files")
                .header(
                    http::header::CONTENT_TYPE,
                    "multipart/form-data; boundary=yona-boundary",
                )
                .body(Body::from("--yona-boundary--\r\n"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(unauthorized.status(), StatusCode::UNAUTHORIZED);

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let (text_boundary, text_body) = multipart_body("avatar.txt", "text/plain", b"nope");
    let text_upload = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/files")
                .header(
                    http::header::CONTENT_TYPE,
                    format!("multipart/form-data; boundary={text_boundary}"),
                )
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(text_body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(text_upload.status(), StatusCode::BAD_REQUEST);

    let oversized_bytes = vec![0_u8; 1024 * 1000 + 1];
    let (oversized_boundary, oversized_body) =
        multipart_body("avatar.png", "image/png", &oversized_bytes);
    let oversized_upload = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/files")
                .header(
                    http::header::CONTENT_TYPE,
                    format!("multipart/form-data; boundary={oversized_boundary}"),
                )
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(oversized_body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(oversized_upload.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn avatar_file_upload_returns_metadata_and_serves_bytes_for_owner() {
    let (app, _, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;

    let register = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from("{\"loginId\":\"door\",\"name\":\"Door\",\"emailAddress\":\"door@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(register.status(), StatusCode::OK);

    let png_bytes = b"\x89PNG\r\n\x1a\nfake-png";
    let (boundary, body) = multipart_body("avatar.png", "image/png", png_bytes);
    let upload = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/files")
                .header(
                    http::header::CONTENT_TYPE,
                    format!("multipart/form-data; boundary={boundary}"),
                )
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(upload.status(), StatusCode::CREATED);
    let upload_body = upload.into_body().collect().await.unwrap().to_bytes();
    let upload_json: serde_json::Value = serde_json::from_slice(&upload_body).unwrap();
    let file_id = upload_json
        .get("id")
        .and_then(|value| value.as_i64())
        .unwrap();
    let expected_url = format!("/yona/files/{file_id}");
    assert_eq!(
        upload_json.get("mimeType").and_then(|value| value.as_str()),
        Some("image/png")
    );
    assert_eq!(
        upload_json.get("name").and_then(|value| value.as_str()),
        Some("avatar.png")
    );
    assert_eq!(
        upload_json.get("url").and_then(|value| value.as_str()),
        Some(expected_url.as_str()),
    );

    let get_file = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{file_id}"))
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(get_file.status(), StatusCode::OK);
    let get_file_body = get_file.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(get_file_body.as_ref(), png_bytes);

    let forbidden = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{file_id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);
}
