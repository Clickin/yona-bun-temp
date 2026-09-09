use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, Database, DatabaseConnection, EntityTrait, NotSet, Set,
    Statement,
};
use serde_json::{json, Value};
use std::path::Path;
use tower::ServiceExt;
use yoram_migration::Migrator;
use yoram_persistence::{
    attachment, issue, issue_comment, milestone, posting, pull_request, AppRepository,
    CreateProjectInput,
};
use yoram_server::{create_router_with_repository_and_app_config, AppRuntimeConfig, RuntimeConfig};

mod rest_test_support;

async fn build_app(data_root: &Path) -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let repository = AppRepository::new(db.clone());
    let app = create_router_with_repository_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        repository.clone(),
        AppRuntimeConfig {
            data_root: data_root.to_path_buf(),
            ..AppRuntimeConfig::default()
        },
    );
    (app, repository, db)
}

async fn response_bytes(response: Response<Body>) -> (StatusCode, Vec<u8>) {
    let status = response.status();
    let body = response
        .into_body()
        .collect()
        .await
        .expect("response body")
        .to_bytes()
        .to_vec();
    (status, body)
}

async fn response_json(response: Response<Body>) -> Value {
    let (status, body) = response_bytes(response).await;
    let text = String::from_utf8(body).expect("utf8 response");
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
        .expect("csrf")
        .to_str()
        .unwrap()
        .to_string();
    let cookies = response
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
        .collect::<Vec<_>>()
        .join("; ");
    (csrf, cookies)
}

async fn request(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie: Option<&str>,
    csrf: Option<&str>,
    payload: Option<Value>,
) -> Response<Body> {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(cookie) = cookie {
        builder = builder.header(http::header::COOKIE, cookie);
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

async fn register_user(app: axum::Router, login_id: &str) -> (String, String, i64) {
    let (csrf, cookie) = bootstrap(app.clone()).await;
    let payload = response_json(
        rest_test_support::pilot_rest(
            app,
            "RegisterWithPassword",
            Some(&cookie),
            Some(&csrf),
            json!({
                "loginId": login_id,
                "name": login_id,
                "emailAddress": format!("{login_id}@example.com"),
                "password": "doorpass1",
                "retypedPassword": "doorpass1"
            }),
        )
        .await,
    )
    .await;
    let id = payload["actorId"]
        .as_i64()
        .or_else(|| {
            payload["actorId"]
                .as_str()
                .and_then(|value| value.parse().ok())
        })
        .expect("actor id");
    (csrf, cookie, id)
}

async fn insert_attachment(
    db: &DatabaseConnection,
    container_type: &str,
    container_id: i64,
    owner_login_id: &str,
    hash: &str,
    name: &str,
) -> attachment::Model {
    attachment::ActiveModel {
        id: NotSet,
        name: Set(Some(name.to_string())),
        hash: Set(Some(hash.to_string())),
        container_type: Set(Some(container_type.to_string())),
        mime_type: Set(Some("text/plain".to_string())),
        size: Set(Some(11)),
        container_id: Set(container_id),
        created_date: Set(None),
        owner_login_id: Set(Some(owner_login_id.to_string())),
    }
    .insert(db)
    .await
    .expect("attachment insert")
}

fn write_upload(data_root: &Path, hash: &str, bytes: &[u8]) {
    let uploads = data_root.join("uploads");
    std::fs::create_dir_all(&uploads).expect("uploads directory");
    std::fs::write(uploads.join(hash), bytes).expect("upload bytes");
}

async fn create_project(
    repository: &AppRepository,
    owner_name: &str,
    project_name: &str,
    scope: &str,
    manager_id: i64,
) -> yoram_persistence::ProjectRecord {
    repository
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: owner_name.to_string(),
            overview: Some("attachment ACL contract".to_string()),
            project_name: project_name.to_string(),
            project_scope: scope.to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: Some(manager_id),
        })
        .await
        .expect("project")
}

async fn delete_attachment(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    attachment_id: i64,
) -> StatusCode {
    request(
        app,
        Method::DELETE,
        &format!("/yona/files/{attachment_id}"),
        Some(cookie),
        Some(csrf),
        None,
    )
    .await
    .status()
}

async fn get_attachment(
    app: axum::Router,
    cookie: Option<&str>,
    attachment_id: i64,
) -> (StatusCode, Vec<u8>) {
    response_bytes(
        request(
            app,
            Method::GET,
            &format!("/yona/files/{attachment_id}"),
            cookie,
            None,
            None,
        )
        .await,
    )
    .await
}

#[tokio::test]
async fn shared_hash_lifetime_keeps_bytes_until_last_http_reference() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let (app, repository, db) = build_app(data_dir.path()).await;
    let (csrf, cookie, owner_id) = register_user(app.clone(), "owner").await;
    let bytes = b"shared attachment bytes";
    let hash = "shared-hash-lifetime";

    let first = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "first.txt",
            "text/plain",
            bytes.len() as i64,
            hash,
        )
        .await
        .expect("first attachment");
    let second = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "second.txt",
            "text/plain",
            bytes.len() as i64,
            hash,
        )
        .await
        .expect("second attachment");
    let third = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "third.txt",
            "text/plain",
            bytes.len() as i64,
            hash,
        )
        .await
        .expect("third attachment");
    write_upload(data_dir.path(), hash, bytes);

    assert_eq!(
        get_attachment(app.clone(), Some(&cookie), first.id).await.0,
        StatusCode::OK
    );
    assert_eq!(
        delete_attachment(app.clone(), &cookie, &csrf, first.id).await,
        StatusCode::OK
    );
    assert_eq!(
        std::fs::read(data_dir.path().join("uploads").join(hash)).expect("shared file"),
        bytes
    );
    assert_eq!(
        get_attachment(app.clone(), Some(&cookie), second.id).await,
        (StatusCode::OK, bytes.to_vec())
    );

    assert_eq!(
        delete_attachment(app.clone(), &cookie, &csrf, second.id).await,
        StatusCode::OK
    );
    assert!(
        data_dir.path().join("uploads").join(hash).exists(),
        "the final reference must still own the blob"
    );
    assert_eq!(
        get_attachment(app.clone(), Some(&cookie), third.id).await,
        (StatusCode::OK, bytes.to_vec())
    );

    assert_eq!(
        delete_attachment(app.clone(), &cookie, &csrf, third.id).await,
        StatusCode::OK
    );
    assert!(
        !data_dir.path().join("uploads").join(hash).exists(),
        "the last reference removes the physical blob"
    );
    assert_eq!(
        attachment::Entity::find_by_id(third.id)
            .one(&db)
            .await
            .expect("third lookup"),
        None
    );
}

#[tokio::test]
async fn missing_blob_delete_removes_row_without_panicking() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let (app, repository, db) = build_app(data_dir.path()).await;
    let (csrf, cookie, owner_id) = register_user(app.clone(), "owner").await;
    let attachment = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "missing.txt",
            "text/plain",
            0,
            "missing-physical-blob",
        )
        .await
        .expect("attachment");

    assert_eq!(
        delete_attachment(app, &cookie, &csrf, attachment.id).await,
        StatusCode::OK
    );
    assert_eq!(
        attachment::Entity::find_by_id(attachment.id)
            .one(&db)
            .await
            .expect("missing attachment lookup"),
        None
    );
}

#[tokio::test]
async fn project_container_cleanup_deletes_rows_but_preserves_shared_blob() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let (app, repository, db) = build_app(data_dir.path()).await;
    let (csrf, cookie, owner_id) = register_user(app.clone(), "owner").await;
    let project = create_project(&repository, "owner", "cleanup", "private", owner_id).await;
    let hash = "container-cleanup-shared-hash";
    let bytes = b"container cleanup bytes";
    let project_attachment =
        insert_attachment(&db, "PROJECT", project.id, "owner", hash, "project.txt").await;
    let nested_issue = issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Nested issue".to_string())),
        project_id: Set(Some(project.id)),
        number: Set(Some(1)),
        state: Set(Some(0)),
        is_draft: Set(Some(0)),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        ..Default::default()
    }
    .insert(&db)
    .await
    .expect("nested issue");
    let nested_comment = issue_comment::ActiveModel {
        id: NotSet,
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        created_date: Set(nested_issue.created_date),
        issue_id: Set(Some(nested_issue.id)),
        project_id: Set(project.id),
        parent_comment_id: Set(None),
        ..Default::default()
    }
    .insert(&db)
    .await
    .expect("nested comment");
    let nested_issue_attachment = insert_attachment(
        &db,
        "ISSUE_POST",
        nested_issue.id,
        "owner",
        hash,
        "issue.txt",
    )
    .await;
    let nested_comment_attachment = insert_attachment(
        &db,
        "ISSUE_COMMENT",
        nested_comment.id,
        "owner",
        hash,
        "comment.txt",
    )
    .await;
    let surviving_attachment = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "survivor.txt",
            "text/plain",
            bytes.len() as i64,
            hash,
        )
        .await
        .expect("surviving attachment");
    write_upload(data_dir.path(), hash, bytes);

    let response = request(
        app.clone(),
        Method::DELETE,
        "/yona/api/v1/owners/owner/projects/cleanup",
        Some(&cookie),
        Some(&csrf),
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        attachment::Entity::find_by_id(project_attachment.id)
            .one(&db)
            .await
            .expect("project attachment lookup"),
        None,
        "container cleanup must delete its attachment rows"
    );
    assert_eq!(
        attachment::Entity::find_by_id(nested_issue_attachment.id)
            .one(&db)
            .await
            .expect("nested issue attachment lookup"),
        None,
        "project cleanup must delete nested issue attachment rows"
    );
    assert_eq!(
        attachment::Entity::find_by_id(nested_comment_attachment.id)
            .one(&db)
            .await
            .expect("nested comment attachment lookup"),
        None,
        "project cleanup must delete nested comment attachment rows"
    );
    assert!(attachment::Entity::find_by_id(surviving_attachment.id)
        .one(&db)
        .await
        .expect("survivor lookup")
        .is_some());
    assert_eq!(
        get_attachment(app.clone(), Some(&cookie), surviving_attachment.id).await,
        (StatusCode::OK, bytes.to_vec())
    );
    assert_eq!(
        std::fs::read(data_dir.path().join("uploads").join(hash)).expect("surviving bytes"),
        bytes
    );
}

#[tokio::test]
async fn issue_and_comment_cleanup_preserve_shared_blobs_until_last_reference() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let (app, repository, db) = build_app(data_dir.path()).await;
    let (csrf, cookie, owner_id) = register_user(app.clone(), "owner").await;
    let project = create_project(&repository, "owner", "cleanup", "private", owner_id).await;

    let issue = issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Issue with comment".to_string())),
        project_id: Set(Some(project.id)),
        number: Set(Some(1)),
        state: Set(Some(0)),
        is_draft: Set(Some(0)),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        ..Default::default()
    }
    .insert(&db)
    .await
    .expect("issue");
    let comment = issue_comment::ActiveModel {
        id: NotSet,
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        created_date: Set(issue.created_date),
        issue_id: Set(Some(issue.id)),
        project_id: Set(project.id),
        parent_comment_id: Set(None),
        ..Default::default()
    }
    .insert(&db)
    .await
    .expect("issue comment");

    let comment_hash = "issue-comment-shared-hash";
    let comment_bytes = b"issue comment shared bytes";
    let comment_attachment = insert_attachment(
        &db,
        "ISSUE_COMMENT",
        comment.id,
        "owner",
        comment_hash,
        "comment.txt",
    )
    .await;
    let comment_survivor = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "comment-survivor.txt",
            "text/plain",
            comment_bytes.len() as i64,
            comment_hash,
        )
        .await
        .expect("comment survivor");
    write_upload(data_dir.path(), comment_hash, comment_bytes);

    let response = request(
        app.clone(),
        Method::DELETE,
        &format!(
            "/yona/api/v1/projects/owner/cleanup/issues/1/comments/{}",
            comment.id
        ),
        Some(&cookie),
        Some(&csrf),
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        attachment::Entity::find_by_id(comment_attachment.id)
            .one(&db)
            .await
            .expect("comment attachment lookup"),
        None
    );
    assert_eq!(
        get_attachment(app.clone(), Some(&cookie), comment_survivor.id).await,
        (StatusCode::OK, comment_bytes.to_vec())
    );
    assert_eq!(
        delete_attachment(app.clone(), &cookie, &csrf, comment_survivor.id).await,
        StatusCode::OK
    );
    assert!(!data_dir.path().join("uploads").join(comment_hash).exists());

    let issue_hash = "issue-shared-hash";
    let issue_bytes = b"issue shared bytes";
    let issue_attachment = insert_attachment(
        &db,
        "ISSUE_POST",
        issue.id,
        "owner",
        issue_hash,
        "issue.txt",
    )
    .await;
    let issue_survivor = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "issue-survivor.txt",
            "text/plain",
            issue_bytes.len() as i64,
            issue_hash,
        )
        .await
        .expect("issue survivor");
    write_upload(data_dir.path(), issue_hash, issue_bytes);

    let response = request(
        app.clone(),
        Method::DELETE,
        "/yona/api/v1/projects/owner/cleanup/issues/1",
        Some(&cookie),
        Some(&csrf),
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        attachment::Entity::find_by_id(issue_attachment.id)
            .one(&db)
            .await
            .expect("issue attachment lookup"),
        None
    );
    assert_eq!(
        get_attachment(app.clone(), Some(&cookie), issue_survivor.id).await,
        (StatusCode::OK, issue_bytes.to_vec())
    );
    assert_eq!(
        delete_attachment(app.clone(), &cookie, &csrf, issue_survivor.id).await,
        StatusCode::OK
    );
    assert!(!data_dir.path().join("uploads").join(issue_hash).exists());
}

#[tokio::test]
async fn attachment_acl_uses_issue_sharer_and_container_update_roles() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let (app, repository, db) = build_app(data_dir.path()).await;
    let (_owner_csrf, _owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (sharer_csrf, sharer_cookie, sharer_id) = register_user(app.clone(), "sharer").await;
    let (outsider_csrf, outsider_cookie, outsider_id) =
        register_user(app.clone(), "outsider").await;
    let (_editor_csrf, editor_cookie, editor_id) = register_user(app.clone(), "editor").await;
    let (manager_csrf, manager_cookie, manager_id) = register_user(app.clone(), "manager").await;
    let (admin_csrf, admin_cookie, _admin_id) = register_user(app.clone(), "admin").await;
    repository
        .toggle_site_admin_role("admin")
        .await
        .expect("site admin role");

    let private_project =
        create_project(&repository, "owner", "private", "private", owner_id).await;
    let private_issue = issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Shared issue".to_string())),
        project_id: Set(Some(private_project.id)),
        number: Set(Some(1)),
        state: Set(Some(0)),
        is_draft: Set(Some(0)),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        ..Default::default()
    }
    .insert(&db)
    .await
    .expect("private issue");
    repository
        .add_issue_sharer(private_issue.id, sharer_id, "sharer")
        .await
        .expect("issue sharer");
    let private_hash = "private-issue-sharer-hash";
    let private_attachment = insert_attachment(
        &db,
        "ISSUE_POST",
        private_issue.id,
        "owner",
        private_hash,
        "private.txt",
    )
    .await;
    write_upload(data_dir.path(), private_hash, b"private issue bytes");

    assert_eq!(
        get_attachment(app.clone(), Some(&sharer_cookie), private_attachment.id)
            .await
            .0,
        StatusCode::OK,
        "issue sharer must inherit attachment READ"
    );
    assert_eq!(
        get_attachment(app.clone(), Some(&outsider_cookie), private_attachment.id)
            .await
            .0,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        delete_attachment(
            app.clone(),
            &sharer_cookie,
            &sharer_csrf,
            private_attachment.id
        )
        .await,
        StatusCode::FORBIDDEN,
        "issue sharer has READ but not container UPDATE"
    );

    let public_project = create_project(&repository, "owner", "public", "public", owner_id).await;
    repository
        .add_project_membership(public_project.id, editor_id, "member")
        .await
        .expect("editor membership");
    repository
        .add_project_membership(public_project.id, manager_id, "manager")
        .await
        .expect("manager membership");

    let public_issue = issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Public issue".to_string())),
        project_id: Set(Some(public_project.id)),
        number: Set(Some(1)),
        state: Set(Some(0)),
        is_draft: Set(Some(0)),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        ..Default::default()
    }
    .insert(&db)
    .await
    .expect("public issue");
    let public_comment = issue_comment::ActiveModel {
        id: NotSet,
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        created_date: Set(public_issue.created_date),
        issue_id: Set(Some(public_issue.id)),
        project_id: Set(public_project.id),
        parent_comment_id: Set(None),
        ..Default::default()
    }
    .insert(&db)
    .await
    .expect("public issue comment");
    let public_post = posting::ActiveModel {
        id: NotSet,
        title: Set(Some("Public post".to_string())),
        project_id: Set(Some(public_project.id)),
        number: Set(Some(1)),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        ..Default::default()
    }
    .insert(&db)
    .await
    .expect("public post");
    let public_milestone = milestone::ActiveModel {
        id: NotSet,
        title: Set(Some("Public milestone".to_string())),
        project_id: Set(Some(public_project.id)),
        state: Set(Some(0)),
        ..Default::default()
    }
    .insert(&db)
    .await
    .expect("public milestone");
    let public_pull_request = pull_request::ActiveModel {
        id: NotSet,
        title: Set(Some("Public pull request".to_string())),
        to_project_id: Set(Some(public_project.id)),
        from_project_id: Set(Some(public_project.id)),
        to_branch: Set(Some("main".to_string())),
        from_branch: Set(Some("feature".to_string())),
        contributor_id: Set(Some(outsider_id)),
        receiver_id: Set(Some(owner_id)),
        state: Set(Some(0)),
        number: Set(Some(1)),
        ..Default::default()
    }
    .insert(&db)
    .await
    .expect("public pull request");

    let resources = [
        ("ISSUE_POST", public_issue.id, "issue"),
        ("BOARD_POST", public_post.id, "post"),
        ("ISSUE_COMMENT", public_comment.id, "comment"),
        ("MILESTONE", public_milestone.id, "milestone"),
        ("PULL_REQUEST", public_pull_request.id, "pull-request"),
    ];
    let mut attachments = Vec::new();
    for (container_type, container_id, name) in resources {
        let hash = format!("public-{name}-attachment-hash");
        let attachment = insert_attachment(
            &db,
            container_type,
            container_id,
            "outsider",
            &hash,
            &format!("{name}.txt"),
        )
        .await;
        write_upload(data_dir.path(), &hash, format!("{name} bytes").as_bytes());
        attachments.push(attachment);
    }

    for attachment in &attachments {
        assert_eq!(
            get_attachment(app.clone(), Some(&outsider_cookie), attachment.id)
                .await
                .0,
            StatusCode::OK,
            "public container READ must not depend on uploader identity"
        );
        assert_eq!(
            delete_attachment(app.clone(), &outsider_cookie, &outsider_csrf, attachment.id).await,
            StatusCode::FORBIDDEN,
            "uploader without container UPDATE must not delete"
        );
        assert_eq!(
            get_attachment(app.clone(), Some(&editor_cookie), attachment.id)
                .await
                .0,
            StatusCode::OK,
            "project member still has container READ"
        );
    }

    for attachment in &attachments[..2] {
        assert_eq!(
            delete_attachment(app.clone(), &manager_cookie, &manager_csrf, attachment.id).await,
            StatusCode::OK,
            "project manager must have container UPDATE"
        );
    }
    for attachment in &attachments[2..4] {
        assert_eq!(
            delete_attachment(app.clone(), &admin_cookie, &admin_csrf, attachment.id).await,
            StatusCode::OK,
            "site admin must have legacy UPDATE access"
        );
    }
    assert_eq!(
        delete_attachment(app, &admin_cookie, &admin_csrf, attachments[4].id).await,
        StatusCode::OK
    );
}

#[tokio::test]
async fn public_avatar_is_readable_without_a_session() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let (app, _repository, db) = build_app(data_dir.path()).await;
    let (_, _, user_id) = register_user(app.clone(), "avatar-owner").await;
    let attachment = insert_attachment(
        &db,
        "USER_AVATAR",
        user_id,
        "avatar-owner",
        "public-avatar-hash",
        "avatar.png",
    )
    .await;
    write_upload(data_dir.path(), "public-avatar-hash", b"avatar bytes");

    assert_eq!(
        get_attachment(app, None, attachment.id).await,
        (StatusCode::OK, b"avatar bytes".to_vec())
    );
}

#[tokio::test]
async fn site_admin_cleanup_preserves_an_existing_shared_hash_reference() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let (app, repository, db) = build_app(data_dir.path()).await;
    let (admin_csrf, admin_cookie, _admin_id) = register_user(app.clone(), "siteboss").await;
    let (_, _, member_id) = register_user(app.clone(), "member").await;
    repository
        .toggle_site_admin_role("siteboss")
        .await
        .expect("site admin role");
    create_project(&repository, "member", "portable", "public", member_id).await;

    let hash = "site-import-shared-hash";
    let bytes = b"existing shared bytes";
    let existing = repository
        .create_user_attachment_upload(
            member_id,
            "member",
            "existing.txt",
            "text/plain",
            bytes.len() as i64,
            hash,
        )
        .await
        .expect("existing attachment");
    write_upload(data_dir.path(), hash, bytes);

    db.execute(Statement::from_string(
        db.get_database_backend(),
        "CREATE TRIGGER fail_attachment_cleanup_milestone BEFORE INSERT ON milestone \
         BEGIN SELECT RAISE(FAIL, 'forced attachment cleanup failure'); END"
            .to_string(),
    ))
    .await
    .expect("failure trigger");
    let response = request(
        app,
        Method::POST,
        "/yona/sites/import",
        Some(&admin_cookie),
        Some(&admin_csrf),
        Some(json!({
            "format": "yobi-data",
            "users": [],
            "projects": [],
            "milestones": [{
                "attachments": [{
                    "hash": hash,
                    "id": 9901,
                    "mimeType": "text/plain",
                    "name": "imported.txt",
                    "size": bytes.len()
                }],
                "contentsMarkdown": "milestone with shared attachment",
                "dueDate": "",
                "ownerName": "member",
                "projectName": "portable",
                "state": "open",
                "title": "Rollback milestone"
            }],
            "posts": [],
            "issues": []
        })),
    )
    .await;
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    assert!(String::from_utf8(response_bytes(response).await.1)
        .expect("error text")
        .contains("forced attachment cleanup failure"));
    assert!(attachment::Entity::find_by_id(existing.id)
        .one(&db)
        .await
        .expect("existing attachment lookup")
        .is_some());
    assert_eq!(
        std::fs::read(data_dir.path().join("uploads").join(hash)).expect("existing shared bytes"),
        bytes
    );
}
