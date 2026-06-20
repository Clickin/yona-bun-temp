use std::fs;

// Guards asset/runtime helper ownership while server root forwarding and
// embedded asset lookup move into the owning asset module.
use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ActiveModelTrait, Database, DatabaseConnection, NotSet, Set};
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_persistence::{
    site_admin, AppRepository, CreateIssueCommentInput, CreateIssueInput,
    CreatePostingCommentInput, CreatePostingInput, CreateProjectInput,
    CreatePullRequestCommentInput, CreatePullRequestInput, CreatePullRequestResult,
    IssueMutationInput, MilestoneMutationInput, PostingMutationInput, PullRequestMutationInput,
    UpdateIssueCommentInput, UpdateIssueInput, UpdatePostingCommentInput, UpdatePostingInput,
    UpdatePullRequestInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router_with_app_repository, create_router_with_embedded_assets,
    create_router_with_embedded_assets_and_app_config, create_router_with_filesystem_assets,
    create_router_with_repository_and_app_config, AppRuntimeConfig, RuntimeConfig,
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
                allow_anonymous_access: true,
                base_path: "/yona".to_string(),
                public_origin: String::new(),
            },
            app_repo.clone(),
        ),
        app_repo,
        db,
    )
}

async fn build_auth_router_with_app_config(
    app_config: AppRuntimeConfig,
) -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());

    (
        create_router_with_repository_and_app_config(
            RuntimeConfig {
                allow_anonymous_access: true,
                base_path: "/yona".to_string(),
                public_origin: String::new(),
            },
            app_repo.clone(),
            app_config,
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

async fn assert_attachment_container_acl(
    app: axum::Router,
    cookie_header: &str,
    container_type: &str,
    container_id: i64,
    attachment_id: i64,
    expected_status: StatusCode,
) {
    let list_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/yona/files?containerType={container_type}&containerId={container_id}"
                ))
                .header(http::header::COOKIE, cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(list_response.status(), expected_status);

    let read_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{attachment_id}"))
                .header(http::header::COOKIE, cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(read_response.status(), expected_status);
}

#[tokio::test]
// Guards asset-owned filesystem fallback, runtime injection, and base-path SPA routing.
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
            allow_anonymous_access: true,
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
        .clone()
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

    let project_fallback = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/owner/projectYobi")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(project_fallback.status(), StatusCode::OK);
    let project_fallback_body = project_fallback
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let project_fallback_html = String::from_utf8(project_fallback_body.to_vec()).unwrap();
    assert!(project_fallback_html.contains("window.__YONA_RUNTIME_CONFIG__"));

    let head_fallback = app
        .oneshot(
            Request::builder()
                .method(Method::HEAD)
                .uri("/yona/projects")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(head_fallback.status(), StatusCode::OK);
}

#[tokio::test]
// Guards asset-owned embedded fallback, runtime injection, and base-path SPA routing.
async fn embedded_assets_support_base_path_injection_and_spa_fallback() {
    // Guards app-config-owned runtime projection for project scope, site name, languages, and email visibility.
    let app = create_router_with_embedded_assets_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        AppRuntimeConfig {
            project_default_scope: "private".to_string(),
            supported_languages: vec![
                "ko-KR".to_string(),
                "en-US".to_string(),
                "ja-JP".to_string(),
            ],
            show_user_email: false,
            site_name: "Legacy Yona".to_string(),
            ..AppRuntimeConfig::default()
        },
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
    assert!(html.contains("\"projectDefaultScope\":\"private\""));
    assert!(html.contains("\"siteName\":\"Legacy Yona\""));
    assert!(html.contains("\"showUserEmail\":false"));
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
        .clone()
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

    let project_fallback = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/owner/projectYobi")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(project_fallback.status(), StatusCode::OK);
    let project_fallback_body = project_fallback
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let project_fallback_html = String::from_utf8(project_fallback_body.to_vec()).unwrap();
    assert!(project_fallback_html.contains("window.__YONA_RUNTIME_CONFIG__"));
}

#[tokio::test]
async fn legacy_messages_js_returns_global_messages_function_under_base_path() {
    let app = create_router_with_embedded_assets(RuntimeConfig {
        allow_anonymous_access: true,
        base_path: "/yona".to_string(),
        public_origin: String::new(),
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/messages.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let content_type = response
        .headers()
        .get(http::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    assert!(content_type.contains("application/javascript"));
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let script = String::from_utf8(body.to_vec()).unwrap();
    assert!(script.contains("function Messages(key)"));
    assert!(script.contains("global.Messages = Messages"));
    assert!(script.contains("Messages._messages = _messages"));
    assert!(script.contains("return arguments.length > 1 ? format(value"));
    assert!(script.contains("\"app.name\": \"Yona\""));
    assert!(script.contains("\"title.login\": \"Log in\""));
    assert!(script.contains("\"button.cancel\": \"Cancel\""));
    assert!(script.contains("\"button.confirm\": \"Confirm\""));
    assert!(script.contains("\"button.delete\": \"Delete\""));
    assert!(script.contains("\"button.login\": \"Log in\""));
    assert!(script.contains("\"button.save\": \"Save\""));
    assert!(script.contains("\"button.download\": \"Download a file\""));
    assert!(script.contains("\"button.upload\": \"File upload\""));
    assert!(script.contains("\"button.commentAndNextState.closed\": \"Comment & Close issue\""));
    assert!(script.contains("\"button.commentAndNextState.open\": \"Comment & Reopen issue\""));
    assert!(script.contains("\"button.no\": \"No\""));
    assert!(script.contains("\"button.yes\": \"Yes\""));
    assert!(script.contains("\"button.nextState.closed\": \"Close issue\""));
    assert!(script.contains("\"button.nextState.open\": \"Reopen issue\""));
    assert!(script.contains("\"button.prevPage\": \"Previous page\""));
    assert!(script.contains("\"button.nextPage\": \"Next page\""));
    assert!(script.contains(
        "\"common.attach.attachIfYouSave\": \"Selected file will be attached when your comment is saved.\""
    ));
    assert!(script.contains("\"common.attach.clickToPost\": \"Click to post\""));
    assert!(script.contains("\"common.attach.clickbutton\": \"Click upload button\""));
    assert!(
        script.contains("\"common.attach.dropFilesHere\": \"Drag & Drop files here to upload.\"")
    );
    assert!(script.contains("\"common.attach.drophere\": \"Drag & Drop files to attach here or\""));
    assert!(script.contains("\"common.attach.error.upload\": \"Failed to upload. <br>{1} ({0})\""));
    assert!(
        script.contains("\"common.attach.error.delete\": \"Failed to delete file. <br>{1} ({0})\"")
    );
    assert!(script.contains("\"common.attach.pastehere\": \"Paste the clipboard image\""));
    assert!(script.contains("\"common.attachment\": \"Attachment\""));
    assert!(script.contains("\"common.comment.delete\": \"Delete comment\""));
    assert!(script.contains(
        "\"common.comment.beforeunload.confirm\": \" Would you like to exit this page without submitting comment?\""
    ));
    assert!(script.contains("\"code.closeCommentBox\": \"Close comment box\""));
    assert!(script.contains("\"code.copyUrl.copied\": \"URL is copied\""));
    assert!(script.contains("\"code.isBinary\": \"Binary file is not shown\""));
    assert!(script.contains("\"code.openCommentBox\": \"Open comment box\""));
    assert!(script.contains(
        "\"error.toolargefile\": \"Wow, that's huge!<br>Please submit file smaller than {0}.\""
    ));
    assert!(script
        .contains("\"error.badrequest\": \"The request cannot be fulfilled due to bad syntax\""));
    assert!(script.contains("\"error.failedTo\": \"Failed to {0}<br>({1} {2})\""));
    assert!(script.contains("\"error.forbidden\": \"You are not authorized\""));
    assert!(script.contains("\"error.notfound\": \"Page not found\""));
    assert!(script.contains(
        "\"issue.favorite.added\": \"Added as a favorite issue. See it on the My Issues page\""
    ));
    assert!(script.contains("\"issue.favorite.deleted\": \"Removed from favorite issues\""));
    assert!(script.contains(
        "\"issue.error.beforeunload\": \"Issue is not saved yet. Would you like to exit this page without saving?\""
    ));
    assert!(script.contains("\"issue.error.emptyTitle\": \"Issue title is a required field.\""));
    assert!(script
        .contains("\"issue.error.invalid.duedate\": \"Issue due date is not valid date type.\""));
    assert!(script.contains("\"issue.menu.new\": \"New issue\""));
    assert!(script.contains("\"issue.unwatch\": \"Unsubscribe from this issue\""));
    assert!(script.contains(
        "\"issue.unwatch.start\": \"You will no longer get notifications about this issue\""
    ));
    assert!(script.contains("\"issue.update.assignee.id\": \"Update assignee\""));
    assert!(script.contains("\"issue.update.attachLabel\": \"Attach label\""));
    assert!(script.contains("\"issue.update.detachLabel\": \"Detach label\""));
    assert!(script.contains("\"issue.update.dueDate\": \"Update due date\""));
    assert!(script.contains("\"issue.update.labelIds\": \"Update label\""));
    assert!(script.contains("\"issue.update.milestone.id\": \"Update milestone\""));
    assert!(script.contains("\"issue.update.state\": \"Update status\""));
    assert!(script.contains("\"issue.watch\": \"Subscribe\""));
    assert!(script
        .contains("\"issue.watch.start\": \"Now you will get notifications about this issue\""));
    assert!(script.contains("\"label.add\": \"Add label\""));
    assert!(script.contains(
        "\"label.category.new.confirm\": \"{0} is a new category.<br>In this category, you can choose\""
    ));
    assert!(script.contains("\"label.category.option\": \"In this category, you can choose\""));
    assert!(script.contains("\"label.category.option.multiple\": \"multiple labels\""));
    assert!(script.contains("\"label.category.option.single\": \"only a single label\""));
    assert!(script.contains(
        "\"label.confirm.delete\": \"Once you delete this label, instances of this label attached to issues will also be removed. Do you still want to delete this label?\""
    ));
    assert!(script.contains(
        "\"label.error.color\": \"Please define the label color using HEX or RGB values.\""
    ));
    assert!(script.contains(
        "\"label.error.creationFailed\": \"Failed to create a new label. A server error may have occurred or the request may be invalid.\""
    ));
    assert!(script.contains(
        "\"label.error.duplicated\": \"Failed to create a new label. The label may already exist.\""
    ));
    assert!(script.contains(
        "\"label.error.duplicated.in.category\": \"A label with the same name already exists in the category {0}.\""
    ));
    assert!(script
        .contains("\"label.error.empty\": \"Category, Color, and Name are required fields.\""));
    assert!(script.contains("\"label.failedTo\": \"Failed to {0}.\""));
    assert!(script.contains("\"menu.home\": \"Home\""));
    assert!(script
        .contains("\"milestone.error.content\": \"Milestone description is a required field\""));
    assert!(script.contains(
        "\"milestone.error.duedateFormat\": \"Invalid format. Enter the due date in YYYY-MM-DD format.\""
    ));
    assert!(script.contains("\"milestone.error.title\": \"Milestone title is a required field.\""));
    assert!(script.contains("\"milestone.state.all\": \"All\""));
    assert!(script.contains("\"milestone.state.closed\": \"Closed\""));
    assert!(script.contains("\"milestone.state.open\": \"Open\""));
    assert!(script.contains(
        "\"organization.name.alert\": \"Enter the group name in alphanumerical or symbol characters(_-.)\""
    ));
    assert!(script.contains(
        "\"organization.name.duplicate\": \"Already existent user's login id or group name.\""
    ));
    assert!(script.contains(
        "\"organization.member.leave.unknownerror\": \"Failed to leave this group. Please ask site admin\""
    ));
    assert!(script.contains("\"organization.member.unknownOrganization\": \"Non existent group\""));
    assert!(script.contains(
        "\"post.error.beforeunload\": \"This post has not been saved yet. Would you like to exit this page without saving?\""
    ));
    assert!(script.contains("\"post.error.emptyTitle\": \"Title is a required field.\""));
    assert!(script.contains("\"post.unwatch\": \"Stop watching\""));
    assert!(
        script.contains("\"post.unwatch.start\": \"Notifications about this post has been muted\"")
    );
    assert!(script.contains("\"post.watch\": \"Watch\""));
    assert!(
        script.contains("\"post.watch.start\": \"You will receive notifications about this post\"")
    );
    assert!(script.contains("\"project.is.empty\": \"Project is non existent\""));
    assert!(script.contains(
        "\"project.changeVCS.alert\": \"You should agree with changing the repository type.\""
    ));
    assert!(script.contains("\"project.changeVCS.error\": \"Can't change repository type\""));
    assert!(
        script.contains("\"project.delete.alert\": \"You should agree to delete this project.\"")
    );
    assert!(
        script.contains("\"project.delete.error\": \"Error occurred while deleting a project.\"")
    );
    assert!(script
        .contains("\"project.import.error.empty.url\": \"Please type the Git repository URL.\""));
    assert!(script.contains("\"project.logo.alert\": \"This is not an image file.\""));
    assert!(script.contains(
        "\"project.member.deleteConfirm\": \"Are you sure you want this user to leave this project?\""
    ));
    assert!(script.contains(
        "\"project.member.ownerCannotLeave\": \"Project owner cannot leave his own project.\""
    ));
    assert!(script.contains("\"project.member.notExist\": \"User does not exist.\""));
    assert!(script
        .contains("\"project.webhook.payloadUrl.empty\": \"Payload URL is a required field.\""));
    assert!(script.contains(
        "\"project.name.alert\": \"Enter name in alphabetnumerical or symbol characters(_-.)\""
    ));
    assert!(script.contains("\"project.name.duplicate\": \"This project name already exists.\""));
    assert!(script.contains("\"project.name.reserved.alert\": \"You can't use reserved names.\""));
    assert!(script.contains(
        "\"project.transfer.alert\": \"You should agree with the transfer of this project.\""
    ));
    assert!(script.contains(
        "\"project.transfer.error\": \" User or group not available. Please check whether the user's login id or the gorup's name is correct.\""
    ));
    assert!(script.contains("\"project.unwatch\": \"Unwatch\""));
    assert!(script.contains("\"project.watch\": \"Watch\""));
    assert!(script.contains("\"pullRequest.body.required\": \"Enter pull request description.\""));
    assert!(script.contains("\"pullRequest.diff.noChanges\": \"No changes have been made.\""));
    assert!(script.contains(
        "\"pullRequest.fromBranch.required\": \"Select branch that contains the code to be sent.\""
    ));
    assert!(script.contains(
        "\"pullRequest.ignore.conflict\": \"This code seems to have conflicts when merging. Do you really want to continue?\""
    ));
    assert!(script.contains(
        "\"pullRequest.is.merging\": \"We are checking if the code is safe. Please wait for a while to complete this process.\""
    ));
    assert!(script.contains(
        "\"pullRequest.is.not.safe\": \"A conflict occurred when merging. This pull request cannot be merged safely.\""
    ));
    assert!(script.contains("\"pullRequest.is.safe\": \"This pull request can be merged safely.\""));
    assert!(script.contains("\"pullRequest.title.required\": \"Title is a required field.\""));
    assert!(script.contains(
        "\"pullRequest.toBranch.required\": \"Select branch that will receive code to be sent.\""
    ));
    assert!(script.contains(
        "\"pullRequest.unwatch.start\": \"Notifications of this pull request are muted\""
    ));
    assert!(script.contains(
        "\"pullRequest.watch.start\": \"You will receive notifications of this pull request\""
    ));
    assert!(script.contains("\"post.comment.empty\": \"Comment should not be empty. \""));
    assert!(script.contains("\"site.mail.sended\": \"Mail has been sent.\""));
    assert!(script.contains(
        "\"site.resetPasswordEmail.invalidRequest\": \"Invalid password reset request\""
    ));
    assert!(script.contains("\"title.help\": \"Help\""));
    assert!(script.contains("\"title.logout\": \"Log out\""));
    assert!(script.contains("\"title.no.results\": \"No results\""));
    assert!(script.contains("\"title.resetPassword\": \"Reset password\""));
    assert!(script.contains("\"title.signup\": \"Sign up\""));
    assert!(script.contains(
        "\"user.login.failed\": \"Failed to log in. A serve error may have occurred or the request may be invalid.\""
    ));
    assert!(script.contains(
        "\"user.login.failed.client\": \"Failed to log in. The request is invalid.\\nPlease ask site admin.\""
    ));
    assert!(script.contains(
        "\"user.login.failed.network\": \"Failed to log in because of network trouble.\\nPlease ask site admin.\""
    ));
    assert!(script.contains(
        "\"user.login.failed.server\": \"Failed to log in because a server error has occurred.\\nPlease ask site admin.\""
    ));
    assert!(script
        .contains("\"user.avatar.fileSizeAlert\": \"Images should be less than 1MB in size..\""));
    assert!(script
        .contains("\"user.avatar.onlyImage\": \"Only image files are allowed to be uploaded.\""));
    assert!(
        script.contains("\"user.avatar.uploadError\": \"Failed to upload. Please ask site admin\"")
    );
    assert!(script.contains(
        "\"user.enroll.failed\": \"Failed to sign-up. A server error may have occurred or the request may be invalid.\""
    ));
    assert!(script.contains(
        "\"user.enroll.failed.client\": \"Failed to sign-up. The request is invalid.\\nPlease ask site admin.\""
    ));
    assert!(script.contains(
        "\"user.enroll.failed.network\": \"Failed to sign-up because of network trouble.\\nPlease ask site admin.\""
    ));
    assert!(script.contains(
        "\"user.enroll.failed.server\": \"Failed to sign-up because a server error has occurred.\\nPlease ask site admin.\""
    ));
    assert!(script.contains("\"userinfo.changeNotifications\": \"Notification settings\""));
    assert!(script.contains("\"userinfo.leaveProject.confirm\": \"Are you sure to leave {0}?\""));
    assert!(script
        .contains("\"user.login.invalid\": \"Your log in ID, E-mail or password is not valid.\""));
    assert!(script.contains("\"user.loginId.duplicate\": \"This log in ID already exists.\""));
    assert!(script.contains(
        "\"user.login.required\": \"Login ID or E-mail and password is required field.\""
    ));
    assert!(script.contains("\"user.email.duplicate\": \"Email address already exists\""));
    assert!(script.contains("\"user.password\": \"Password\""));
    assert!(script.contains("\"user.wrongPassword.alert\": \"Wrong password!\""));
    assert!(script.contains("\"user.wrongloginId.alert\": \"Enter Valid ID\""));
    assert!(script.contains(
        "\"validation.allowedCharsForLoginId\": \"Login ID may contain alphanumeric characters as well as dashes, underscores or dots, but cannot begin or end with underscores or dots.\""
    ));
    assert!(script.contains("\"validation.duplicated\": \"Already exists!\""));
    assert!(script.contains("\"validation.invalidEmail\": \"Enter valid email address!\""));
    assert!(script.contains("\"validation.passwordMismatch\": \"Retyped password doesn't match\""));
    assert!(script.contains("\"validation.required\": \"Required field!\""));
    assert!(script.contains("\"validation.reservedWord\": \"This is a reserved system word.\""));
    assert!(script.contains(
        "\"validation.tooShortPassword\": \"Password must be at least 4 characters in length.\""
    ));
    assert!(script.contains("\"watchers.more\": \"and {0} others\""));
    assert!(script.contains("Object.prototype.hasOwnProperty.call(_messages, key)"));
    assert!(script.contains("return arguments.length > 1 ? format(value"));
}

#[tokio::test]
// Guards app-scoped data-root injection and repository provisioning lock.
async fn legacy_init_redirects_home_and_recreates_project_repositories() {
    let data_root = tempdir().expect("data root");
    let (app, repository, _) = build_auth_router_with_app_config(AppRuntimeConfig {
        data_root: data_root.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "admin".to_string(),
            overview: Some("Init route parity".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/_init")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        response
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/")
    );
    assert!(
        yona_rust_vcs::repository_path(data_root.path(), project.id)
            .join("HEAD")
            .is_file(),
        "legacy /_init should recreate missing Git repository storage before redirecting"
    );
}

#[tokio::test]
async fn file_upload_requires_auth_and_preserves_general_attachments_under_legacy_default_limit() {
    let data_root = tempdir().expect("file upload data root");
    let (app, repo, _) = build_auth_router_with_app_config(AppRuntimeConfig {
        data_root: data_root.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
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
    let text_file = repo
        .read_attachment_by_id(text_file_id)
        .await
        .unwrap()
        .expect("uploaded text attachment");
    assert_eq!(
        fs::read(data_root.path().join("uploads").join(&text_file.hash)).unwrap(),
        text_bytes
    );
    let expected_text_file_url = format!("/yona/files/{text_file_id}");
    assert_eq!(
        text_upload_json["url"].as_str(),
        Some(expected_text_file_url.as_str())
    );
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
    assert_eq!(ranged_text_file.status(), StatusCode::OK);
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
async fn file_upload_respects_injected_max_file_size() {
    // Guards file routes using the app-scoped max upload size service snapshot.
    let (app, _, _) = build_auth_router_with_app_config(AppRuntimeConfig {
        max_uploaded_file_size: 8,
        ..AppRuntimeConfig::default()
    })
    .await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    register_user(app.clone(), &cookie_header, &csrf, "limit-user").await;

    let (boundary, body) = multipart_body("too-large.txt", "text/plain", b"larger than eight");
    let response = app
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

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
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
            vcs: "GIT".to_string(),
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
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
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
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
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

    let public_issue_file_read = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{replacement_issue_file_id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(public_issue_file_read.status(), StatusCode::OK);

    let private_project = repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "owner".to_string(),
            overview: Some("private attachment ACL".to_string()),
            project_name: "privateYobi".to_string(),
            project_scope: "private".to_string(),
            vcs: "GIT".to_string(),
        })
        .await
        .unwrap();
    repository
        .add_project_membership(private_project.id, owner_id, "manager")
        .await
        .unwrap();
    let private_issue_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "private-issue-attachment.png",
    )
    .await;
    let private_issue = repository
        .create_issue(CreateIssueInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: "privateYobi".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: vec![private_issue_file_id],
                body_markdown: "private issue body".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
                title: "Private issue with attachment".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("private issue");

    let other_private_issue_file_list = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/yona/files?containerType=ISSUE_POST&containerId={}",
                    private_issue.id
                ))
                .header(http::header::COOKIE, &other_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(
        other_private_issue_file_list.status(),
        StatusCode::FORBIDDEN
    );

    let other_private_issue_file_read = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{private_issue_file_id}"))
                .header(http::header::COOKIE, &other_cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(
        other_private_issue_file_read.status(),
        StatusCode::FORBIDDEN
    );

    let owner_private_issue_file_list = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/yona/files?containerType=ISSUE_POST&containerId={}",
                    private_issue.id
                ))
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(owner_private_issue_file_list.status(), StatusCode::OK);

    let private_board_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "private-board-attachment.png",
    )
    .await;
    let private_posting = repository
        .create_posting(CreatePostingInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: "privateYobi".to_string(),
            values: PostingMutationInput {
                attachment_ids: vec![private_board_file_id],
                body_markdown: "private board body".to_string(),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: "Private board post with attachment".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("private posting");
    assert_attachment_container_acl(
        app.clone(),
        &other_cookie_header,
        "BOARD_POST",
        private_posting.id,
        private_board_file_id,
        StatusCode::FORBIDDEN,
    )
    .await;
    assert_attachment_container_acl(
        app.clone(),
        &cookie_header,
        "BOARD_POST",
        private_posting.id,
        private_board_file_id,
        StatusCode::OK,
    )
    .await;

    let private_milestone_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "private-milestone-attachment.png",
    )
    .await;
    let private_milestone = repository
        .create_project_milestone(MilestoneMutationInput {
            actor_id: Some(owner_id),
            attachment_ids: vec![private_milestone_file_id],
            contents_markdown: "private milestone body".to_string(),
            due_date: None,
            owner_name: "owner".to_string(),
            project_name: "privateYobi".to_string(),
            state: "open".to_string(),
            title: "Private milestone with attachment".to_string(),
        })
        .await
        .unwrap()
        .expect("private milestone");
    assert_attachment_container_acl(
        app.clone(),
        &other_cookie_header,
        "MILESTONE",
        private_milestone.id,
        private_milestone_file_id,
        StatusCode::FORBIDDEN,
    )
    .await;
    assert_attachment_container_acl(
        app.clone(),
        &cookie_header,
        "MILESTONE",
        private_milestone.id,
        private_milestone_file_id,
        StatusCode::OK,
    )
    .await;

    let private_pull_request_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "private-pull-request-attachment.png",
    )
    .await;
    let private_pull_request = match repository
        .create_pull_request(CreatePullRequestInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            from_branch: "topic/private-pr".to_string(),
            from_project_id: private_project.id,
            to_branch: "main".to_string(),
            to_project_id: private_project.id,
            values: PullRequestMutationInput {
                attachment_ids: vec![private_pull_request_file_id],
                body_markdown: "private pull request body".to_string(),
                title: "Private pull request with attachment".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("private pull request")
    {
        CreatePullRequestResult::Created(detail) => detail,
        CreatePullRequestResult::Duplicate(_) => {
            panic!("unexpected private duplicate pull request")
        }
    };
    assert_attachment_container_acl(
        app.clone(),
        &other_cookie_header,
        "PULL_REQUEST",
        private_pull_request.id,
        private_pull_request_file_id,
        StatusCode::FORBIDDEN,
    )
    .await;
    assert_attachment_container_acl(
        app.clone(),
        &cookie_header,
        "PULL_REQUEST",
        private_pull_request.id,
        private_pull_request_file_id,
        StatusCode::OK,
    )
    .await;

    let private_review_comment_file_id = upload_image_file(
        app.clone(),
        &cookie_header,
        &csrf,
        "private-review-comment-attachment.png",
    )
    .await;
    let private_pull_request_with_comment = repository
        .create_pull_request_comment(CreatePullRequestCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_ids: vec![private_review_comment_file_id],
            commit_id: None,
            contents_markdown: "private review comment body".to_string(),
            end_line: None,
            end_side: None,
            owner_name: "owner".to_string(),
            path: None,
            prev_commit_id: None,
            project_name: "privateYobi".to_string(),
            pull_request_number: private_pull_request.pull_request_number,
            start_line: None,
            start_side: None,
            thread_id: None,
        })
        .await
        .unwrap()
        .expect("private review comment");
    let private_review_comment = private_pull_request_with_comment
        .threads
        .iter()
        .flat_map(|thread| thread.comments.iter())
        .find(|comment| {
            comment
                .attachments
                .iter()
                .any(|file| file.id == private_review_comment_file_id)
        })
        .expect("private review comment attachment owner");
    assert_attachment_container_acl(
        app.clone(),
        &other_cookie_header,
        "REVIEW_COMMENT",
        private_review_comment.id,
        private_review_comment_file_id,
        StatusCode::FORBIDDEN,
    )
    .await;
    assert_attachment_container_acl(
        app.clone(),
        &cookie_header,
        "REVIEW_COMMENT",
        private_review_comment.id,
        private_review_comment_file_id,
        StatusCode::OK,
    )
    .await;

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
            attachment_actor_id: None,
            attachment_ids: vec![board_comment_file_id],
            contents_markdown: "board comment body".to_string(),
            created_at: None,
            owner_name: "owner".to_string(),
            parent_comment_id: None,
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
async fn project_logo_update_binds_legacy_project_attachment_and_returns_logo_url() {
    let (app, repository, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    register_user(app.clone(), &cookie_header, &csrf, "owner").await;
    let create_project = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/owners/owner/projects")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"projectName\":\"projectYobi\",\"overview\":\"logo project\",\"projectScope\":\"public\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_project.status(), StatusCode::OK);
    let project = repository
        .read_project_authorization("owner", "projectYobi", None)
        .await
        .unwrap()
        .expect("created project")
        .project;

    let logo_id = upload_image_file(app.clone(), &cookie_header, &csrf, "project-logo.png").await;
    let update = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PATCH)
                .uri("/yona/api/v1/owners/owner/projects/projectYobi")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!(
                    "{{\"projectName\":\"projectYobi\",\"overview\":\"logo project\",\"projectScope\":\"public\",\"logoAttachmentId\":{logo_id}}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(update.status(), StatusCode::OK);
    let update_body = update.into_body().collect().await.unwrap().to_bytes();
    let update_json: serde_json::Value = serde_json::from_slice(&update_body).unwrap();
    assert_eq!(update_json["logoUrl"], format!("/yona/files/{logo_id}"));

    let logo = repository
        .read_attachment_by_id(logo_id)
        .await
        .unwrap()
        .expect("project logo attachment");
    assert_eq!(logo.container_type, "PROJECT");
    assert_eq!(logo.container_id, project.id);

    let container = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/owner/projects/projectYobi/container")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(container.status(), StatusCode::OK);
    let container_body = container.into_body().collect().await.unwrap().to_bytes();
    let container_json: serde_json::Value = serde_json::from_slice(&container_body).unwrap();
    assert_eq!(container_json["logoUrl"], format!("/yona/files/{logo_id}"));

    let public_logo = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{logo_id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(public_logo.status(), StatusCode::OK);
}

#[tokio::test]
async fn organization_logo_update_binds_legacy_organization_attachment_and_returns_logo_url() {
    let (app, repository, _) = build_auth_router().await;
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    register_user(app.clone(), &cookie_header, &csrf, "owner").await;
    let create_organization = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/organizations")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(
                    "{\"organizationName\":\"weblabs\",\"description\":\"web labs\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_organization.status(), StatusCode::OK);
    let organization = repository
        .read_organization_by_name("weblabs")
        .await
        .unwrap()
        .expect("created organization");

    let logo_id =
        upload_image_file(app.clone(), &cookie_header, &csrf, "organization-logo.png").await;
    let update = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PATCH)
                .uri("/yona/api/v1/organizations/weblabs")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", &csrf)
                .body(Body::from(format!(
                    "{{\"organizationName\":\"weblabs\",\"description\":\"web labs\",\"logoAttachmentId\":{logo_id}}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(update.status(), StatusCode::OK);
    let update_body = update.into_body().collect().await.unwrap().to_bytes();
    let update_json: serde_json::Value = serde_json::from_slice(&update_body).unwrap();
    assert_eq!(update_json["logoUrl"], format!("/yona/files/{logo_id}"));

    let logo = repository
        .read_attachment_by_id(logo_id)
        .await
        .unwrap()
        .expect("organization logo attachment");
    assert_eq!(logo.container_type, "ORGANIZATION");
    assert_eq!(logo.container_id, organization.id);

    let container = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/organizations/weblabs/container")
                .header(http::header::COOKIE, &cookie_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(container.status(), StatusCode::OK);
    let container_body = container.into_body().collect().await.unwrap().to_bytes();
    let container_json: serde_json::Value = serde_json::from_slice(&container_body).unwrap();
    assert_eq!(container_json["logoUrl"], format!("/yona/files/{logo_id}"));

    let public_logo = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/yona/files/{logo_id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(public_logo.status(), StatusCode::OK);
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
                .uri("/yona/api/v1/workspace/files?filter=avatar&pageNum=1")
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
    assert_eq!(payload["pageSize"], 50);
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
