use axum::body::Body;
use http::{header, Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ActiveModelTrait, Database, DatabaseConnection, NotSet, Set,
};
use serde_json::{json, Value};
use tower::ServiceExt;
use yoram_migration::Migrator;
use yoram_persistence::{
    attachment, site_admin, AppRepository, CreateIssueCommentInput, CreateIssueInput,
    CreatePostingInput, CreateProjectLabelInput, IssueMutationInput, MilestoneMutationInput,
    PostingMutationInput,
};
use yoram_server::{
    create_router_with_app_repository, create_router_with_repository_and_app_config,
    AppRuntimeConfig, RuntimeConfig,
};

mod rest_test_support;

async fn build_app_with_repository() -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());
    let app = create_router_with_app_repository(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
    );

    (app, app_repo, db)
}

async fn build_app_with_app_config(
    app_config: AppRuntimeConfig,
) -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());
    let app = create_router_with_repository_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
        app_config,
    );

    (app, app_repo, db)
}

async fn rpc(
    app: axum::Router,
    method_name: &str,
    cookie_header: &str,
    csrf: &str,
    payload: Value,
) -> Response<Body> {
    rest_test_support::pilot_rest(app, method_name, Some(cookie_header), Some(csrf), payload).await
}

async fn response_text(response: Response<Body>) -> String {
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

async fn response_json(response: Response<Body>) -> Value {
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
        .get_all(header::SET_COOKIE)
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

async fn register_user(app: axum::Router, login_id: &str) -> (String, String, i64) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = rpc(
        app,
        "RegisterWithPassword",
        &cookie_header,
        &csrf,
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
        .and_then(|value| {
            value
                .as_i64()
                .or_else(|| value.as_str().and_then(|value| value.parse().ok()))
        })
        .expect("actor id");

    (csrf, cookie_header, actor_id)
}

async fn create_project(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    owner_name: &str,
    project_name: &str,
) {
    response_json(
        rpc(
            app,
            "CreateProject",
            cookie,
            csrf,
            json!({
                "ownerName": owner_name,
                "projectName": project_name,
                "overview": "project export contract",
                "projectScope": "public"
            }),
        )
        .await,
    )
    .await;
}

async fn rest_raw_post(
    app: axum::Router,
    uri: &str,
    cookie_header: Option<&str>,
    content_type: &str,
    body: &str,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::POST)
        .uri(uri)
        .header(header::CONTENT_TYPE, content_type);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(header::COOKIE, cookie_header);
    }
    app.oneshot(builder.body(Body::from(body.to_string())).unwrap())
        .await
        .unwrap()
}

async fn rest_get(app: axum::Router, uri: &str, cookie_header: Option<&str>) -> Response<Body> {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(header::COOKIE, cookie_header);
    }
    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
}

async fn insert_attachment(
    db: &DatabaseConnection,
    container_type: &str,
    container_id: i64,
    owner_login_id: &str,
    name: &str,
    mime_type: &str,
) -> attachment::Model {
    attachment::ActiveModel {
        id: NotSet,
        name: Set(Some(name.to_string())),
        hash: Set(Some(format!("{container_type}-{container_id}-{name}"))),
        container_type: Set(Some(container_type.to_string())),
        mime_type: Set(Some(mime_type.to_string())),
        size: Set(Some(256)),
        container_id: Set(container_id),
        created_date: Set(None),
        owner_login_id: Set(Some(owner_login_id.to_string())),
    }
    .insert(db)
    .await
    .expect("attachment insert")
}

fn write_uploaded_test_file(
    data_dir: &tempfile::TempDir,
    attachment: &attachment::Model,
    bytes: &[u8],
) {
    let hash = attachment.hash.as_deref().expect("attachment hash");
    let upload_dir = data_dir.path().join("uploads");
    std::fs::create_dir_all(&upload_dir).expect("upload dir");
    std::fs::write(upload_dir.join(hash), bytes).expect("upload bytes");
}

/// Creates a project with one label, one milestone, one issue (with a comment
/// and an attachment) and one post (with an attachment).
async fn seed_exportable_project(
    app: &axum::Router,
    repo: &AppRepository,
    db: &DatabaseConnection,
    data_dir: &tempfile::TempDir,
    cookie: &str,
    csrf: &str,
    user_id: i64,
) -> (i64, i64) {
    create_project(app.clone(), cookie, csrf, "member", "dataproj").await;
    let post_attachment =
        insert_attachment(&db, "USER", user_id, "member", "post-export.png", "image/png").await;
    let issue_attachment =
        insert_attachment(&db, "USER", user_id, "member", "issue-export.png", "image/png").await;
    write_uploaded_test_file(data_dir, &post_attachment, &[b'x'; 256]);
    write_uploaded_test_file(data_dir, &issue_attachment, &[b'y'; 256]);

    repo.create_project_label(CreateProjectLabelInput {
        category_is_exclusive: true,
        category_name: "Priority".to_string(),
        label_color: "#ff9800".to_string(),
        label_name: "High".to_string(),
        owner_name: "member".to_string(),
        project_name: "dataproj".to_string(),
    })
    .await
    .expect("create export label")
    .expect("export label created");

    let milestone = repo
        .create_project_milestone(MilestoneMutationInput {
            actor_id: Some(user_id),
            attachment_ids: vec![],
            contents_markdown: "milestone body".to_string(),
            due_date: None,
            owner_name: "member".to_string(),
            project_name: "dataproj".to_string(),
            state: "open".to_string(),
            title: "M1".to_string(),
        })
        .await
        .expect("create export milestone")
        .expect("export milestone created");

    repo.create_posting(CreatePostingInput {
        actor_display_name: "Member Name".to_string(),
        actor_id: user_id,
        actor_login_id: "member".to_string(),
        owner_name: "member".to_string(),
        project_name: "dataproj".to_string(),
        values: PostingMutationInput {
            attachment_ids: vec![post_attachment.id],
            body_markdown: "post body".to_string(),
            label_ids: vec![],
            notice: false,
            readme: false,
            title: "Post 1".to_string(),
        },
    })
    .await
    .expect("create export posting")
    .expect("posting created");

    let issue = repo
        .create_issue(CreateIssueInput {
            actor_display_name: "Member Name".to_string(),
            actor_id: user_id,
            actor_login_id: "member".to_string(),
            owner_name: "member".to_string(),
            project_name: "dataproj".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: vec![issue_attachment.id],
                body_markdown: "issue body".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: vec![],
                milestone_id: Some(milestone.id),
                parent_issue_id: None,
                title: "Issue 1".to_string(),
            },
        })
        .await
        .expect("create export issue")
        .expect("issue created");

    repo.create_issue_comment(CreateIssueCommentInput {
        actor_display_name: "Member Name".to_string(),
        actor_id: user_id,
        actor_login_id: "member".to_string(),
        attachment_ids: vec![],
        contents_markdown: "issue comment".to_string(),
        issue_number: issue.issue_number,
        owner_name: "member".to_string(),
        parent_comment_id: None,
        project_name: "dataproj".to_string(),
    })
    .await
    .expect("create export issue comment")
    .expect("issue comment created");

    (post_attachment.id, milestone.id)
}

fn parse_ndjson(text: &str) -> Vec<Value> {
    text.lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| serde_json::from_str(line).expect("ndjson line"))
        .collect()
}

#[tokio::test]
async fn project_export_streams_ndjson_lines_for_project_content() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (csrf, cookie, user_id) = register_user(app.clone(), "member").await;
    seed_exportable_project(&app, &repo, &db, &data_dir, &cookie, &csrf, user_id).await;

    let response = rest_get(
        app,
        "/yona/api/v1/owners/member/projects/dataproj/exports",
        Some(&cookie),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).unwrap(),
        "application/x-ndjson"
    );
    let lines = parse_ndjson(&response_text(response).await);

    let kinds: Vec<&str> = lines
        .iter()
        .map(|line| line["kind"].as_str().expect("kind"))
        .collect();
    assert_eq!(kinds.first(), Some(&"project"));
    assert_eq!(kinds.last(), Some(&"done"));

    let project = &lines[0];
    assert_eq!(project["owner"], "member");
    assert_eq!(project["projectName"], "dataproj");
    assert_eq!(project["projectDescription"], "project export contract");
    assert_eq!(project["projectScope"], "public");

    let label = lines
        .iter()
        .find(|line| line["kind"] == "label")
        .expect("label line");
    assert_eq!(label["name"], "High");
    assert_eq!(label["ownerName"], "member");

    let milestone = lines
        .iter()
        .find(|line| line["kind"] == "milestone")
        .expect("milestone line");
    assert_eq!(milestone["title"], "M1");
    assert_eq!(milestone["contentsMarkdown"], "milestone body");
    assert_eq!(milestone["ownerName"], "member");

    let issue = lines
        .iter()
        .find(|line| line["kind"] == "issue")
        .expect("issue line");
    assert_eq!(issue["title"], "Issue 1");
    assert_eq!(issue["bodyMarkdown"], "issue body");
    assert_eq!(issue["milestoneTitle"], "M1");
    assert_eq!(issue["ownerName"], "member");
    assert_eq!(issue["comments"][0]["contentsMarkdown"], "issue comment");
    assert!(!issue["attachments"][0]["contentBase64"]
        .as_str()
        .expect("attachment content")
        .is_empty());

    let post = lines
        .iter()
        .find(|line| line["kind"] == "post")
        .expect("post line");
    assert_eq!(post["title"], "Post 1");
    assert_eq!(post["bodyMarkdown"], "post body");
    assert!(!post["attachments"][0]["contentBase64"]
        .as_str()
        .expect("post attachment content")
        .is_empty());

    let done = lines.last().expect("done line");
    assert_eq!(
        done["issueCount"],
        lines.iter().filter(|line| line["kind"] == "issue").count() as u64
    );
    assert_eq!(
        done["postCount"],
        lines.iter().filter(|line| line["kind"] == "post").count() as u64
    );
    assert_eq!(done["milestoneCount"], 1);
    assert_eq!(
        done["memberCount"],
        lines.iter().filter(|line| line["kind"] == "member").count() as u64
    );
}

#[tokio::test]
async fn project_export_returns_not_found_for_missing_project() {
    let (app, _repo, _db) = build_app_with_repository().await;
    let (_csrf, cookie, _user_id) = register_user(app.clone(), "member").await;

    let response = rest_get(
        app,
        "/yona/api/v1/owners/member/projects/missing/exports",
        Some(&cookie),
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn project_import_restores_exported_ndjson_records() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (csrf, cookie, user_id) = register_user(app.clone(), "member").await;
    seed_exportable_project(&app, &repo, &db, &data_dir, &cookie, &csrf, user_id).await;

    let exported = response_text(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/member/projects/dataproj/exports",
            Some(&cookie),
        )
        .await,
    )
    .await;

    let response = rest_raw_post(
        app,
        "/yona/api/v1/owners/member/projects/dataproj/imports",
        Some(&cookie),
        "application/x-ndjson",
        &exported,
    )
    .await;
    let imported = response_json(response).await;
    assert_eq!(imported["dryRun"], false);
    assert_eq!(imported["streaming"], true);
    // The export carries legacy ids, so re-importing the same instance is
    // idempotent: the existing project/issue/post rows are skipped.
    assert_eq!(imported["importedIssues"], 0);
    assert_eq!(imported["importedPosts"], 0);
    assert_eq!(imported["importedMilestones"], 0);
    assert_eq!(imported["importedLabels"], 0);
    assert_eq!(imported["skippedIssues"], 1);
    assert_eq!(imported["skippedPosts"], 1);

    // The pre-existing seeded data is untouched.
    let issue = repo
        .read_issue_detail("member", "dataproj", 1)
        .await
        .expect("read seeded issue")
        .expect("seeded issue exists");
    assert_eq!(issue.title, "Issue 1");
    assert_eq!(issue.body_markdown, "issue body");
    assert_eq!(issue.attachments.len(), 1);
    assert_eq!(issue.comments.len(), 1);

    let post = repo
        .read_posting_detail_for_viewer("member", "dataproj", 1, None)
        .await
        .expect("read seeded post")
        .expect("seeded post exists");
    assert_eq!(post.title, "Post 1");
    assert_eq!(post.body_markdown, "post body");
    assert_eq!(post.attachments.len(), 1);
}

#[tokio::test]
async fn project_import_dry_run_parses_stream_without_writing() {
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (csrf, cookie, user_id) = register_user(app.clone(), "member").await;
    seed_exportable_project(&app, &repo, &db, &data_dir, &cookie, &csrf, user_id).await;

    let exported = response_text(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/member/projects/dataproj/exports",
            Some(&cookie),
        )
        .await,
    )
    .await;

    let response = rest_raw_post(
        app,
        "/yona/api/v1/owners/member/projects/dataproj/imports?dryRun=true",
        Some(&cookie),
        "application/x-ndjson",
        &exported,
    )
    .await;
    let report = response_json(response).await;
    assert_eq!(report["dryRun"], true);
    assert_eq!(report["streaming"], true);
    assert_eq!(report["wouldImportIssues"], 1);
    assert_eq!(report["wouldImportPosts"], 1);
    assert_eq!(report["wouldImportMilestones"], 1);
    assert_eq!(report["wouldImportLabels"], 1);
    assert_eq!(report["wouldImportAttachments"], 2);

    assert!(repo
        .read_issue_detail("member", "dataproj", 2)
        .await
        .expect("read issue")
        .is_none());
    assert!(repo
        .read_posting_detail_for_viewer("member", "dataproj", 2, None)
        .await
        .expect("read post")
        .is_none());
}

#[tokio::test]
async fn project_import_rejects_project_metadata_mismatch() {
    let (app, _repo, _db) = build_app_with_repository().await;
    let (_csrf, cookie, _user_id) = register_user(app.clone(), "member").await;
    create_project(app.clone(), &cookie, &_csrf, "member", "dataproj").await;

    let body = r#"{"kind":"project","owner":"other","projectName":"dataproj","projectDescription":"","projectVcs":"GIT","projectScope":"public"}
{"kind":"done","memberCount":0,"issueCount":0,"postCount":0,"milestoneCount":0}
"#;
    let response = rest_raw_post(
        app,
        "/yona/api/v1/owners/member/projects/dataproj/imports?dryRun=true",
        Some(&cookie),
        "application/x-ndjson",
        body,
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn project_import_requires_manager_or_site_admin() {
    let (app, _repo, _db) = build_app_with_repository().await;
    let (_member_csrf, member_cookie, _member_id) = register_user(app.clone(), "member").await;
    create_project(app.clone(), &member_cookie, &_member_csrf, "member", "dataproj").await;
    let (_outsider_csrf, outsider_cookie, _outsider_id) = register_user(app.clone(), "outsider").await;

    let body = r#"{"kind":"project","owner":"member","projectName":"dataproj","projectDescription":"","projectVcs":"GIT","projectScope":"public"}
{"kind":"done","memberCount":0,"issueCount":0,"postCount":0,"milestoneCount":0}
"#;
    let response = rest_raw_post(
        app,
        "/yona/api/v1/owners/member/projects/dataproj/imports?dryRun=true",
        Some(&outsider_cookie),
        "application/x-ndjson",
        body,
    )
    .await;
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn project_export_answers_bearer_token_for_private_projects() {
    // Yoram→Yoram: the migration tool reads the project export with a Bearer
    // API token, including for private projects (the token owner must have
    // read access). Previously the export only resolved session actors.
    let data_dir = tempfile::tempdir().expect("yona data");
    let (app, repo, db) = build_app_with_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (_csrf, cookie, user_id) = register_user(app.clone(), "member").await;
    seed_exportable_project(&app, &repo, &db, &data_dir, &cookie, &_csrf, user_id).await;
    let token = repo
        .reset_api_token_for_user(user_id)
        .await
        .expect("api token");

    let response = rest_get_with_bearer(
        app,
        "/yona/api/v1/owners/member/projects/dataproj/exports",
        &token,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let lines = parse_ndjson(&response_text(response).await);
    assert_eq!(lines[0]["kind"], "project");
    assert_eq!(lines[0]["projectName"], "dataproj");
}

#[tokio::test]
async fn project_import_bootstraps_missing_project_for_site_admin() {
    // Yoram→Yoram into a fresh instance: the NDJSON `project` record creates
    // the project when it does not exist yet, gated on the caller being a
    // site admin (the owner user must already exist on the target).
    let (app, repo, db) = build_app_with_repository().await;
    let (_csrf, _cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    mark_site_admin(&db, admin_id).await;
    let token = repo
        .reset_api_token_for_user(admin_id)
        .await
        .expect("api token");
    let (_owner_csrf, _owner_cookie, _owner_id) = register_user(app.clone(), "member").await;

    let body = r#"{"kind":"project","id":77,"owner":"member","projectName":"newproj","projectDescription":"bootstrap","projectVcs":"GIT","projectScope":"private"}
{"kind":"done","memberCount":0,"issueCount":0,"postCount":0,"milestoneCount":0}
"#;
    let response = rest_raw_post_with_bearer(
        app,
        "/yona/api/v1/owners/member/projects/newproj/imports",
        &token,
        "application/x-ndjson",
        body,
    )
    .await;
    let imported = response_json(response).await;
    assert_eq!(imported["dryRun"], false);
    assert_eq!(imported["importedProjects"], 1);
    let project = repo
        .read_project_by_owner_and_name("member", "newproj")
        .await
        .expect("read project")
        .expect("project created by import");
    assert_eq!(project.id, 77);
    assert_eq!(project.project_scope, "private");
}

#[tokio::test]
async fn project_import_denies_missing_project_for_non_admin() {
    let (app, _repo, _db) = build_app_with_repository().await;
    // The first registered user becomes the initial site admin; register one
    // first so `member` is a plain non-admin user.
    let (_admin_csrf, _admin_cookie, _admin_id) = register_user(app.clone(), "siteboss").await;
    let (_csrf, cookie, _user_id) = register_user(app.clone(), "member").await;

    let body = r#"{"kind":"project","owner":"member","projectName":"newproj","projectDescription":"","projectVcs":"GIT","projectScope":"public"}
{"kind":"done","memberCount":0,"issueCount":0,"postCount":0,"milestoneCount":0}
"#;
    let response = rest_raw_post(
        app,
        "/yona/api/v1/owners/member/projects/newproj/imports?dryRun=true",
        Some(&cookie),
        "application/x-ndjson",
        body,
    )
    .await;
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}


async fn mark_site_admin(db: &DatabaseConnection, user_id: i64) {
    site_admin::ActiveModel {
        id: NotSet,
        admin_id: Set(Some(user_id)),
    }
    .insert(db)
    .await
    .expect("site admin insert");
}

async fn rest_get_with_bearer(app: axum::Router, uri: &str, token: &str) -> Response<Body> {
    app.oneshot(
        Request::builder()
            .method(Method::GET)
            .uri(uri)
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn rest_raw_post_with_bearer(
    app: axum::Router,
    uri: &str,
    token: &str,
    content_type: &str,
    body: &str,
) -> Response<Body> {
    app.oneshot(
        Request::builder()
            .method(Method::POST)
            .uri(uri)
            .header(header::CONTENT_TYPE, content_type)
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .body(Body::from(body.to_string()))
            .unwrap(),
    )
    .await
    .unwrap()
}
