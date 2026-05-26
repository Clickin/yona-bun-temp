use std::fs;
use std::sync::{Mutex, OnceLock};

use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ActiveModelTrait, Database, DatabaseConnection, NotSet, Set};
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_persistence::{
    site_admin, AppRepository, CreateIssueCommentInput, CreateIssueInput,
    CreatePostingCommentInput, CreatePostingInput, CreateProjectInput, CreatePullRequestInput,
    CreatePullRequestResult, IssueMutationInput, MilestoneMutationInput, PostingMutationInput,
    PullRequestMutationInput, UpdateIssueCommentInput, UpdateIssueInput, UpdatePostingCommentInput,
    UpdatePostingInput, UpdatePullRequestInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router_with_app_repository, create_router_with_embedded_assets,
    create_router_with_filesystem_assets, RuntimeConfig,
};

fn runtime_config_env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

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

async fn register_user(app: axum::Router, cookie_header: &str, csrf: &str, login_id: &str) -> i64 {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/RegisterWithPassword")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from(format!(
                    "{{\"loginId\":\"{login_id}\",\"name\":\"{login_id}\",\"emailAddress\":\"{login_id}@example.com\",\"password\":\"doorpass1\",\"retypedPassword\":\"doorpass1\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    payload["actorId"]
        .as_i64()
        .or_else(|| {
            payload["actorId"]
                .as_str()
                .and_then(|value| value.parse().ok())
        })
        .expect("registered actor id")
}

async fn upload_image_file(
    app: axum::Router,
    cookie_header: &str,
    csrf: &str,
    file_name: &str,
) -> i64 {
    let (boundary, body) = multipart_body(file_name, "image/png", b"\x89PNG\r\n\x1a\nfake-png");
    let upload = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/files")
                .header(
                    http::header::CONTENT_TYPE,
                    format!("multipart/form-data; boundary={boundary}"),
                )
                .header(http::header::COOKIE, cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(upload.status(), StatusCode::CREATED);
    let upload_body = upload.into_body().collect().await.unwrap().to_bytes();
    let upload_json: serde_json::Value = serde_json::from_slice(&upload_body).unwrap();
    upload_json
        .get("id")
        .and_then(|value| value.as_i64())
        .expect("uploaded file id")
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
    let _guard = runtime_config_env_lock().lock().unwrap();
    std::env::set_var("YONA_PROJECT_DEFAULT_SCOPE", "private");
    std::env::set_var("YONA_LANGS", "ko-KR, en-US, ja-JP");
    let app = create_router_with_embedded_assets(RuntimeConfig {
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });
    std::env::remove_var("YONA_PROJECT_DEFAULT_SCOPE");
    std::env::remove_var("YONA_LANGS");

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
    assert!(html.contains("\"projectDefaultScope\":\"private\""));
    assert!(html.contains("\"supportedLanguages\":[\"ko-KR\",\"en-US\",\"ja-JP\"]"));

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
async fn file_upload_requires_auth_and_preserves_general_attachments_under_legacy_default_limit() {
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

    let text_bytes = b"plain attachment";
    let (text_boundary, text_body) = multipart_body("notes.txt", "text/plain", text_bytes);
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
    assert_eq!(text_upload.status(), StatusCode::CREATED);
    let text_upload_body = text_upload.into_body().collect().await.unwrap().to_bytes();
    let text_upload_json: serde_json::Value = serde_json::from_slice(&text_upload_body).unwrap();
    let text_file_id = text_upload_json["id"].as_i64().expect("text file id");
    assert_eq!(
        text_upload_json["mimeType"].as_str(),
        Some("text/plain; charset=UTF-8"),
    );
    assert_eq!(text_upload_json["name"].as_str(), Some("notes.txt"));

    let get_text_file = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{text_file_id}"))
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(get_text_file.status(), StatusCode::OK);
    assert_eq!(
        get_text_file
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("text/plain; charset=UTF-8")
    );
    assert_eq!(
        get_text_file
            .headers()
            .get(http::header::CONTENT_DISPOSITION)
            .and_then(|value| value.to_str().ok()),
        Some("inline; filename*=UTF-8''notes.txt")
    );
    assert_eq!(
        get_text_file
            .headers()
            .get(http::header::CACHE_CONTROL)
            .and_then(|value| value.to_str().ok()),
        Some("private, max-age=3600")
    );
    let inline_etag = get_text_file
        .headers()
        .get(http::header::ETAG)
        .and_then(|value| value.to_str().ok())
        .expect("inline attachment etag")
        .to_string();
    assert!(inline_etag.starts_with('"'));
    assert!(inline_etag.ends_with("-inline\""));
    let get_text_body = get_text_file
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    assert_eq!(get_text_body.as_ref(), text_bytes);

    let get_text_file_trailing_slash = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{text_file_id}/"))
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(get_text_file_trailing_slash.status(), StatusCode::OK);
    assert_eq!(
        get_text_file_trailing_slash
            .headers()
            .get(http::header::CONTENT_DISPOSITION)
            .and_then(|value| value.to_str().ok()),
        Some("inline; filename*=UTF-8''notes.txt")
    );
    let trailing_slash_body = get_text_file_trailing_slash
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    assert_eq!(trailing_slash_body.as_ref(), text_bytes);

    let download_text_file = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{text_file_id}?action=download"))
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(download_text_file.status(), StatusCode::OK);
    assert_eq!(
        download_text_file
            .headers()
            .get(http::header::CONTENT_DISPOSITION)
            .and_then(|value| value.to_str().ok()),
        Some("attachment; filename*=UTF-8''notes.txt")
    );
    assert_eq!(
        download_text_file
            .headers()
            .get(http::header::CACHE_CONTROL)
            .and_then(|value| value.to_str().ok()),
        Some("private, max-age=3600")
    );
    let download_etag = download_text_file
        .headers()
        .get(http::header::ETAG)
        .and_then(|value| value.to_str().ok())
        .expect("download attachment etag")
        .to_string();
    assert!(download_etag.starts_with('"'));
    assert!(download_etag.ends_with("-attachment\""));
    assert_ne!(inline_etag, download_etag);
    let download_text_body = download_text_file
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    assert_eq!(download_text_body.as_ref(), text_bytes);

    let ranged_text_file = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{text_file_id}"))
                .header(http::header::COOKIE, &cookie_header)
                .header(http::header::RANGE, "bytes=0-3")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(
        ranged_text_file
            .headers()
            .get(http::header::ACCEPT_RANGES)
            .and_then(|value| value.to_str().ok()),
        Some("bytes")
    );

    let not_modified_text_file = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{text_file_id}"))
                .header(http::header::COOKIE, &cookie_header)
                .header(http::header::IF_NONE_MATCH, &inline_etag)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(not_modified_text_file.status(), StatusCode::NOT_MODIFIED);
    assert_eq!(
        not_modified_text_file
            .headers()
            .get(http::header::CACHE_CONTROL)
            .and_then(|value| value.to_str().ok()),
        Some("private, max-age=3600")
    );
    assert_eq!(
        not_modified_text_file
            .headers()
            .get(http::header::ETAG)
            .and_then(|value| value.to_str().ok()),
        Some(inline_etag.as_str())
    );
    let not_modified_body = not_modified_text_file
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    assert!(not_modified_body.is_empty());

    let spoofed_text_bytes = b"plain attachment with spoofed content type";
    let (spoofed_boundary, spoofed_body) =
        multipart_body("payload", "image/png", spoofed_text_bytes);
    let spoofed_upload = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/files")
                .header(
                    http::header::CONTENT_TYPE,
                    format!("multipart/form-data; boundary={spoofed_boundary}"),
                )
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(spoofed_body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(spoofed_upload.status(), StatusCode::CREATED);
    let spoofed_upload_body = spoofed_upload
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let spoofed_upload_json: serde_json::Value =
        serde_json::from_slice(&spoofed_upload_body).unwrap();
    let spoofed_file_id = spoofed_upload_json["id"].as_i64().expect("spoofed file id");
    assert_eq!(
        spoofed_upload_json["mimeType"].as_str(),
        Some("text/plain; charset=UTF-8")
    );

    let get_spoofed_file = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{spoofed_file_id}"))
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(get_spoofed_file.status(), StatusCode::OK);
    assert_eq!(
        get_spoofed_file
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("text/plain; charset=UTF-8")
    );
    let get_spoofed_body = get_spoofed_file
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    assert_eq!(get_spoofed_body.as_ref(), spoofed_text_bytes);

    let legacy_default_size_bytes = vec![0_u8; 1024 * 1000 + 1];
    let (legacy_default_boundary, legacy_default_body) =
        multipart_body("diagram.png", "image/png", &legacy_default_size_bytes);
    let legacy_default_upload = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/files")
                .header(
                    http::header::CONTENT_TYPE,
                    format!("multipart/form-data; boundary={legacy_default_boundary}"),
                )
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(legacy_default_body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(legacy_default_upload.status(), StatusCode::CREATED);
    let legacy_default_upload_body = legacy_default_upload
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let legacy_default_json: serde_json::Value =
        serde_json::from_slice(&legacy_default_upload_body).unwrap();
    assert_eq!(
        legacy_default_json["size"].as_i64(),
        Some(legacy_default_size_bytes.len() as i64)
    );
}

#[tokio::test]
async fn attachment_binding_uses_legacy_container_type_names() {
    let (app, repository, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let owner_id = register_user(app.clone(), &cookie_header, &csrf, "owner").await;
    let (other_csrf, other_cookie_header) = bootstrap(app.clone()).await;
    let other_id = register_user(app.clone(), &other_cookie_header, &other_csrf, "other").await;
    let project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "owner".to_string(),
            overview: Some("attachment container parity".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
        })
        .await
        .unwrap();

    let other_issue_file_id = upload_image_file(
        app.clone(),
        &other_cookie_header,
        &other_csrf,
        "other-user-attachment.png",
    )
    .await;
    let issue_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "issue-body-attachment.png",
    )
    .await;
    let issue_temp_file_list = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/files?containerType=ISSUE_POST")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(issue_temp_file_list.status(), StatusCode::OK);
    let issue_temp_file_list_body = issue_temp_file_list
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let issue_temp_file_list_json: serde_json::Value =
        serde_json::from_slice(&issue_temp_file_list_body).unwrap();
    assert_eq!(
        issue_temp_file_list_json["attachments"]
            .as_array()
            .unwrap()
            .len(),
        0
    );
    assert_eq!(
        issue_temp_file_list_json["tempFiles"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        issue_temp_file_list_json["tempFiles"][0]["id"],
        issue_file_id
    );
    assert_eq!(
        issue_temp_file_list_json["tempFiles"][0]["url"],
        format!("/yona/files/{issue_file_id}")
    );

    let issue = repository
        .create_issue(CreateIssueInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: "projectYobi".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: vec![other_issue_file_id, issue_file_id],
                body_markdown: "issue body".to_string(),
                label_ids: Vec::new(),
                milestone_id: None,
                title: "Issue with attachment".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("issue");
    assert_eq!(issue.attachments.len(), 1);
    assert_eq!(issue.attachments[0].id, issue_file_id);
    let other_issue_file = repository
        .read_attachment_by_id(other_issue_file_id)
        .await
        .unwrap()
        .expect("other issue file");
    assert_eq!(other_issue_file.container_type, "USER");
    assert_eq!(other_issue_file.container_id, other_id);
    let issue_file = repository
        .read_attachment_by_id(issue_file_id)
        .await
        .unwrap()
        .expect("issue file");
    assert_eq!(issue_file.container_type, "ISSUE_POST");
    assert_eq!(issue_file.container_id, issue.id);

    let replacement_issue_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "replacement-issue-body-attachment.png",
    )
    .await;
    repository
        .update_issue(UpdateIssueInput {
            actor_login_id: "owner".to_string(),
            issue_number: issue.issue_number,
            owner_name: "owner".to_string(),
            project_name: "projectYobi".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: vec![replacement_issue_file_id],
                body_markdown: "updated issue body".to_string(),
                label_ids: Vec::new(),
                milestone_id: None,
                title: "Updated issue with attachment".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("updated issue");
    assert!(
        repository
            .read_attachment_by_id(issue_file_id)
            .await
            .unwrap()
            .is_none(),
        "issue edit should remove omitted legacy ISSUE_POST attachments"
    );
    let replacement_issue_file = repository
        .read_attachment_by_id(replacement_issue_file_id)
        .await
        .unwrap()
        .expect("replacement issue file");
    assert_eq!(replacement_issue_file.container_type, "ISSUE_POST");
    assert_eq!(replacement_issue_file.container_id, issue.id);

    let anonymous_issue_file_list = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/yona/files?containerType=ISSUE_POST&containerId={}",
                    issue.id
                ))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(anonymous_issue_file_list.status(), StatusCode::UNAUTHORIZED);

    let issue_file_list = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/yona/files?containerType=ISSUE_POST&containerId={}",
                    issue.id
                ))
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(issue_file_list.status(), StatusCode::OK);
    let issue_file_list_body = issue_file_list
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let issue_file_list_json: serde_json::Value =
        serde_json::from_slice(&issue_file_list_body).unwrap();
    assert_eq!(
        issue_file_list_json["attachments"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        issue_file_list_json["tempFiles"].as_array().unwrap().len(),
        0
    );
    assert_eq!(
        issue_file_list_json["attachments"][0]["id"],
        replacement_issue_file_id
    );
    assert_eq!(
        issue_file_list_json["attachments"][0]["url"],
        format!("/yona/files/{replacement_issue_file_id}")
    );
    assert_eq!(
        issue_file_list_json["attachments"][0]["mimeType"],
        "image/png"
    );
    assert_eq!(
        issue_file_list_json["attachments"][0]["name"],
        "replacement-issue-body-attachment.png"
    );

    let issue_comment_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "issue-comment-attachment.png",
    )
    .await;
    let issue_with_comment = repository
        .create_issue_comment(CreateIssueCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_ids: vec![issue_comment_file_id],
            contents_markdown: "issue comment body".to_string(),
            issue_number: issue.issue_number,
            owner_name: "owner".to_string(),
            parent_comment_id: None,
            project_name: "projectYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("issue comment");
    let issue_comment_id = issue_with_comment.comments[0].id;
    let issue_comment_file = repository
        .read_attachment_by_id(issue_comment_file_id)
        .await
        .unwrap()
        .expect("issue comment file");
    assert_eq!(issue_comment_file.container_type, "ISSUE_COMMENT");
    assert_eq!(issue_comment_file.container_id, issue_comment_id);

    let replacement_issue_comment_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "replacement-issue-comment-attachment.png",
    )
    .await;
    repository
        .update_issue_comment(UpdateIssueCommentInput {
            actor_id: owner_id,
            attachment_ids: vec![replacement_issue_comment_file_id],
            comment_id: issue_comment_id,
            contents_markdown: "updated issue comment body".to_string(),
            issue_number: issue.issue_number,
            owner_name: "owner".to_string(),
            project_name: "projectYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("updated issue comment");
    assert!(
        repository
            .read_attachment_by_id(issue_comment_file_id)
            .await
            .unwrap()
            .is_none(),
        "issue comment edit should remove omitted legacy ISSUE_COMMENT attachments"
    );
    let replacement_issue_comment_file = repository
        .read_attachment_by_id(replacement_issue_comment_file_id)
        .await
        .unwrap()
        .expect("replacement issue comment file");
    assert_eq!(
        replacement_issue_comment_file.container_type,
        "ISSUE_COMMENT"
    );
    assert_eq!(
        replacement_issue_comment_file.container_id,
        issue_comment_id
    );

    let board_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "board-post-attachment.png",
    )
    .await;
    let posting = repository
        .create_posting(CreatePostingInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: "projectYobi".to_string(),
            values: PostingMutationInput {
                attachment_ids: vec![board_file_id],
                body_markdown: "board body".to_string(),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: "Board post with attachment".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("posting");
    let board_file = repository
        .read_attachment_by_id(board_file_id)
        .await
        .unwrap()
        .expect("board file");
    assert_eq!(board_file.container_type, "BOARD_POST");
    assert_eq!(board_file.container_id, posting.id);

    let replacement_board_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "replacement-board-post-attachment.png",
    )
    .await;
    repository
        .update_posting(UpdatePostingInput {
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            post_number: posting.post_number,
            project_name: "projectYobi".to_string(),
            values: PostingMutationInput {
                attachment_ids: vec![replacement_board_file_id],
                body_markdown: "updated board body".to_string(),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: "Updated board post with attachment".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("updated posting");
    assert!(
        repository
            .read_attachment_by_id(board_file_id)
            .await
            .unwrap()
            .is_none(),
        "board post edit should remove omitted legacy BOARD_POST attachments"
    );
    let replacement_board_file = repository
        .read_attachment_by_id(replacement_board_file_id)
        .await
        .unwrap()
        .expect("replacement board file");
    assert_eq!(replacement_board_file.container_type, "BOARD_POST");
    assert_eq!(replacement_board_file.container_id, posting.id);

    let board_comment_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "board-comment-attachment.png",
    )
    .await;
    let posting_with_comment = repository
        .create_posting_comment(CreatePostingCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_ids: vec![board_comment_file_id],
            contents_markdown: "board comment body".to_string(),
            owner_name: "owner".to_string(),
            post_number: posting.post_number,
            project_name: "projectYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("posting comment");
    let board_comment_id = posting_with_comment.comments[0].id;
    let board_comment_file = repository
        .read_attachment_by_id(board_comment_file_id)
        .await
        .unwrap()
        .expect("board comment file");
    assert_eq!(board_comment_file.container_type, "NONISSUE_COMMENT");
    assert_eq!(board_comment_file.container_id, board_comment_id);

    let replacement_board_comment_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "replacement-board-comment-attachment.png",
    )
    .await;
    repository
        .update_posting_comment(UpdatePostingCommentInput {
            actor_id: owner_id,
            attachment_ids: vec![replacement_board_comment_file_id],
            comment_id: board_comment_id,
            contents_markdown: "updated board comment body".to_string(),
            owner_name: "owner".to_string(),
            post_number: posting.post_number,
            project_name: "projectYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("updated posting comment");
    assert!(
        repository
            .read_attachment_by_id(board_comment_file_id)
            .await
            .unwrap()
            .is_none(),
        "board comment edit should remove omitted legacy NONISSUE_COMMENT attachments"
    );
    let replacement_board_comment_file = repository
        .read_attachment_by_id(replacement_board_comment_file_id)
        .await
        .unwrap()
        .expect("replacement board comment file");
    assert_eq!(
        replacement_board_comment_file.container_type,
        "NONISSUE_COMMENT"
    );
    assert_eq!(
        replacement_board_comment_file.container_id,
        board_comment_id
    );

    let other_milestone_file_id = upload_image_file(
        app.clone(),
        &other_cookie_header,
        &other_csrf,
        "other-milestone-attachment.png",
    )
    .await;
    let milestone_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "milestone-attachment.png",
    )
    .await;
    let milestone = repository
        .create_project_milestone(MilestoneMutationInput {
            actor_id: Some(owner_id),
            attachment_ids: vec![other_milestone_file_id, milestone_file_id],
            contents_markdown: "milestone body".to_string(),
            due_date: None,
            owner_name: "owner".to_string(),
            project_name: "projectYobi".to_string(),
            state: "open".to_string(),
            title: "Milestone with attachment".to_string(),
        })
        .await
        .unwrap()
        .expect("milestone");
    assert_eq!(milestone.attachments.len(), 1);
    assert_eq!(milestone.attachments[0].id, milestone_file_id);
    let other_milestone_file = repository
        .read_attachment_by_id(other_milestone_file_id)
        .await
        .unwrap()
        .expect("other milestone file");
    assert_eq!(other_milestone_file.container_type, "USER");
    assert_eq!(other_milestone_file.container_id, other_id);
    let milestone_file = repository
        .read_attachment_by_id(milestone_file_id)
        .await
        .unwrap()
        .expect("milestone file");
    assert_eq!(milestone_file.container_type, "MILESTONE");
    assert_eq!(milestone_file.container_id, milestone.id);

    let milestone_file_list = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/yona/files?containerType=MILESTONE&containerId={}",
                    milestone.id
                ))
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(milestone_file_list.status(), StatusCode::OK);
    let milestone_file_list_body = milestone_file_list
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let milestone_file_list_json: serde_json::Value =
        serde_json::from_slice(&milestone_file_list_body).unwrap();
    assert_eq!(
        milestone_file_list_json["attachments"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        milestone_file_list_json["attachments"][0]["id"],
        milestone_file_id
    );

    let other_pull_request_file_id = upload_image_file(
        app.clone(),
        &other_cookie_header,
        &other_csrf,
        "other-pull-request-attachment.png",
    )
    .await;
    let pull_request_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "pull-request-attachment.png",
    )
    .await;
    let pull_request = match repository
        .create_pull_request(CreatePullRequestInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            from_branch: "topic/pr".to_string(),
            from_project_id: project.id,
            to_branch: "main".to_string(),
            to_project_id: project.id,
            values: PullRequestMutationInput {
                attachment_ids: vec![other_pull_request_file_id, pull_request_file_id],
                body_markdown: "pull request body".to_string(),
                title: "Pull request with attachment".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("pull request")
    {
        CreatePullRequestResult::Created(detail) => detail,
        CreatePullRequestResult::Duplicate(_) => panic!("unexpected duplicate pull request"),
    };
    let other_pull_request_file = repository
        .read_attachment_by_id(other_pull_request_file_id)
        .await
        .unwrap()
        .expect("other pull request file");
    assert_eq!(other_pull_request_file.container_type, "USER");
    assert_eq!(other_pull_request_file.container_id, other_id);
    let pull_request_file = repository
        .read_attachment_by_id(pull_request_file_id)
        .await
        .unwrap()
        .expect("pull request file");
    assert_eq!(pull_request_file.container_type, "PULL_REQUEST");
    assert_eq!(pull_request_file.container_id, pull_request.id);

    let replacement_pull_request_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "replacement-pull-request-attachment.png",
    )
    .await;
    repository
        .update_pull_request(UpdatePullRequestInput {
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: "projectYobi".to_string(),
            pull_request_number: pull_request.pull_request_number,
            values: PullRequestMutationInput {
                attachment_ids: vec![replacement_pull_request_file_id],
                body_markdown: "updated pull request body".to_string(),
                title: "Updated pull request with attachment".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("updated pull request");
    assert!(
        repository
            .read_attachment_by_id(pull_request_file_id)
            .await
            .unwrap()
            .is_none(),
        "PR edit should remove omitted legacy PULL_REQUEST attachments"
    );
    let replacement_pull_request_file = repository
        .read_attachment_by_id(replacement_pull_request_file_id)
        .await
        .unwrap()
        .expect("replacement pull request file");
    assert_eq!(replacement_pull_request_file.container_type, "PULL_REQUEST");
    assert_eq!(replacement_pull_request_file.container_id, pull_request.id);
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

#[tokio::test]
async fn workspace_files_list_returns_current_users_legacy_attachment_rows() {
    let (app, _, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    register_user(app.clone(), &cookie_header, &csrf, "door").await;

    let avatar_id = upload_image_file(app.clone(), &cookie_header, &csrf, "avatar.png").await;
    let (boundary, body) = multipart_body("notes.txt", "text/plain", b"plain notes");
    let text_upload = app
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
    assert_eq!(text_upload.status(), StatusCode::CREATED);

    let anonymous = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/workspace/files")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(anonymous.status(), StatusCode::UNAUTHORIZED);

    let list = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/workspace/files?filter=avatar&page=1")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(list.status(), StatusCode::OK);
    let body = list.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(payload["filter"], "avatar");
    assert_eq!(payload["page"], 1);
    assert_eq!(payload["pageSize"], 30);
    assert_eq!(payload["total"], 1);
    assert_eq!(payload["totalPages"], 1);
    let files = payload["files"].as_array().expect("files");
    assert_eq!(files.len(), 1);
    assert_eq!(files[0]["id"], avatar_id);
    assert_eq!(files[0]["name"], "avatar.png");
    assert_eq!(files[0]["mimeType"], "image/png");
    assert_eq!(files[0]["url"], format!("/yona/files/{avatar_id}"));
    assert_eq!(
        files[0]["downloadUrl"],
        format!("/yona/files/{avatar_id}?action=download")
    );
    assert_eq!(files[0]["previewUrl"], format!("/yona/files/{avatar_id}"));
    assert!(files[0]["sizeLabel"].as_str().unwrap().ends_with("B"));
}

#[tokio::test]
async fn uploaded_file_delete_requires_author_or_site_admin_and_removes_attachment() {
    let (app, repo, db) = build_auth_router().await;
    let (owner_csrf, owner_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &owner_cookie, &owner_csrf, "owner").await;

    let file_id = upload_image_file(app.clone(), &owner_cookie, &owner_csrf, "avatar.png").await;
    assert!(repo.read_attachment_by_id(file_id).await.unwrap().is_some());

    let unauthenticated = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/yona/files/{file_id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let missing_csrf = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/yona/files/{file_id}"))
                .header(http::header::COOKIE, &owner_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(missing_csrf.status(), StatusCode::FORBIDDEN);

    let (other_csrf, other_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &other_cookie, &other_csrf, "other").await;
    let other_delete = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/yona/files/{file_id}"))
                .header(http::header::COOKIE, &other_cookie)
                .header("x-csrf-token", &other_csrf)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(other_delete.status(), StatusCode::FORBIDDEN);
    assert!(repo.read_attachment_by_id(file_id).await.unwrap().is_some());

    let owner_delete = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/yona/files/{file_id}"))
                .header(
                    http::header::CONTENT_TYPE,
                    "multipart/form-data; boundary=yona-boundary",
                )
                .header(http::header::COOKIE, &owner_cookie)
                .header("x-csrf-token", &owner_csrf)
                .body(Body::from(
                    "--yona-boundary\r\nContent-Disposition: form-data; name=\"_method\"\r\n\r\ndelete\r\n--yona-boundary--\r\n",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(owner_delete.status(), StatusCode::OK);
    assert!(repo.read_attachment_by_id(file_id).await.unwrap().is_none());

    let trailing_slash_delete_file_id =
        upload_image_file(app.clone(), &owner_cookie, &owner_csrf, "slash-delete.png").await;
    let trailing_slash_post_delete = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/yona/files/{trailing_slash_delete_file_id}/"))
                .header(
                    http::header::CONTENT_TYPE,
                    "multipart/form-data; boundary=yona-boundary",
                )
                .header(http::header::COOKIE, &owner_cookie)
                .header("x-csrf-token", &owner_csrf)
                .body(Body::from(
                    "--yona-boundary\r\nContent-Disposition: form-data; name=\"_method\"\r\n\r\ndelete\r\n--yona-boundary--\r\n",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(trailing_slash_post_delete.status(), StatusCode::OK);
    assert!(repo
        .read_attachment_by_id(trailing_slash_delete_file_id)
        .await
        .unwrap()
        .is_none());

    let deleted_get = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{file_id}"))
                .header(http::header::COOKIE, &owner_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(deleted_get.status(), StatusCode::NOT_FOUND);

    let admin_deleted_file_id =
        upload_image_file(app.clone(), &owner_cookie, &owner_csrf, "avatar-admin.png").await;
    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    let admin_id = register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;
    site_admin::ActiveModel {
        id: NotSet,
        admin_id: Set(Some(admin_id)),
    }
    .insert(&db)
    .await
    .unwrap();

    let admin_delete = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/yona/files/{admin_deleted_file_id}"))
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(admin_delete.status(), StatusCode::OK);
    assert!(repo
        .read_attachment_by_id(admin_deleted_file_id)
        .await
        .unwrap()
        .is_none());
}
