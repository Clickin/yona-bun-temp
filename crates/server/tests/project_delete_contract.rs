use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ColumnTrait, Condition, ConnectionTrait, Database, DatabaseConnection, EntityTrait,
    PaginatorTrait, QueryFilter,
};
use serde_json::{json, Value};
use tempfile::tempdir;
use tower::ServiceExt;
use yoram_migration::Migrator;
use yoram_persistence::{
    comment_thread, commit_comment, favorite_project, issue, issue_label, issue_label_category,
    posting, project_label, project_pushed_branch, project_transfer, project_user, pull_request,
    user_enrolled_project, webhook, AppRepository,
};
use yoram_server::{create_router_with_repository_and_app_config, AppRuntimeConfig, RuntimeConfig};

mod rest_test_support;

async fn build_app_with_repository() -> (axum::Router, AppRepository, DatabaseConnection) {
    build_app_with_repository_and_app_config(AppRuntimeConfig::default()).await
}

async fn build_app_with_repository_and_app_config(
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

async fn response_text(response: Response<Body>) -> String {
    String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .expect("response body")
            .to_bytes()
            .to_vec(),
    )
    .expect("utf-8 response")
}

async fn ok_json(response: Response<Body>) -> Value {
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

async fn rest(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Option<Value>,
) -> Response<Body> {
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

async fn register_user(app: axum::Router, login_id: &str) -> (String, String, i64) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = rest_test_support::pilot_rest(
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
    let payload = ok_json(response).await;
    let actor_id = payload["actorId"]
        .as_i64()
        .or_else(|| {
            payload["actorId"]
                .as_str()
                .and_then(|value| value.parse().ok())
        })
        .expect("actor id");
    (csrf, cookie_header, actor_id)
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str) {
    let response = rest(
        app,
        Method::POST,
        "/yona/api/v1/owners/owner/projects",
        Some(cookie),
        Some(csrf),
        Some(json!({
            "overview": "delete parity",
            "projectName": "projectYobi",
            "projectScope": "public",
        })),
    )
    .await;
    ok_json(response).await;
}

async fn seed_dependent_project_rows(db: &DatabaseConnection, project_id: i64, user_id: i64) {
    for statement in [
        format!(
            "INSERT INTO \"issue_label_category\" (id, project_id, name, is_exclusive) VALUES (901, {project_id}, 'Type', 0)"
        ),
        format!(
            "INSERT INTO \"issue_label\" (id, category_id, color, name, project_id) VALUES (902, 901, '#fff', 'Bug', {project_id})"
        ),
        format!(
            "INSERT INTO \"issue\" (id, title, project_id, number, state, weight, is_draft) VALUES (903, 'Delete cascade issue', {project_id}, 901, 0, 0, 0)"
        ),
        "INSERT INTO \"issue_issue_label\" (issue_id, issue_label_id) VALUES (903, 902)"
            .to_string(),
        format!(
            "INSERT INTO \"posting\" (id, title, project_id, number, num_of_comments, notice, readme) VALUES (904, 'Delete cascade post', {project_id}, 901, 0, 0, 0)"
        ),
        "INSERT INTO \"posting_issue_label\" (posting_id, issue_label_id) VALUES (904, 902)"
            .to_string(),
        format!(
            "INSERT INTO \"pull_request\" (id, title, to_project_id, from_project_id, to_branch, from_branch, state, number) VALUES (905, 'Delete cascade PR', {project_id}, {project_id}, 'main', 'topic', 0, 901)"
        ),
        "INSERT INTO \"pull_request_commit\" (id, pull_request_id, commit_id) VALUES (906, 905, 'abc123')"
            .to_string(),
        "INSERT INTO \"pull_request_event\" (id, pull_request_id, event_type) VALUES (907, 905, 'NEW_PULL_REQUEST')"
            .to_string(),
        format!(
            "INSERT INTO \"pull_request_reviewers\" (pull_request_id, user_id) VALUES (905, {user_id})"
        ),
        format!(
            "INSERT INTO \"comment_thread\" (dtype, id, state, pull_request_id, project_id) VALUES ('ReviewThread', 908, 'OPEN', 905, {project_id})"
        ),
        format!(
            "INSERT INTO \"comment_thread_n4user\" (comment_thread_id, n4user_id) VALUES (908, {user_id})"
        ),
        "INSERT INTO \"review_comment\" (id, contents, thread_id) VALUES (909, 'review', 908)"
            .to_string(),
        format!(
            "INSERT INTO \"commit_comment\" (id, project_id, contents, commit_id) VALUES (910, {project_id}, 'commit', 'abc123')"
        ),
        format!(
            "INSERT INTO \"milestone\" (id, title, project_id, state) VALUES (911, 'M1', {project_id}, 0)"
        ),
        format!(
            "INSERT INTO \"assignee\" (id, user_id, project_id) VALUES (912, {user_id}, {project_id})"
        ),
        format!(
            "INSERT INTO \"project_transfer\" (id, sender_id, destination, project_id, accepted) VALUES (913, {user_id}, 'target', {project_id}, 0)"
        ),
        format!(
            "INSERT INTO \"project_pushed_branch\" (id, name, project_id) VALUES (914, 'main', {project_id})"
        ),
        format!(
            "INSERT INTO \"webhook\" (id, project_id, payload_url, git_push, webhook_type) VALUES (915, {project_id}, 'https://example.com/hook', 1, 0)"
        ),
        "INSERT INTO \"webhook_thread\" (id, webhook_id, resource_type, resource_id) VALUES (916, 915, 'PROJECT', '915')"
            .to_string(),
        "INSERT INTO \"label\" (id, category, name) VALUES (917, 'project', 'delete-cascade')"
            .to_string(),
        format!("INSERT INTO \"project_label\" (project_id, label_id) VALUES ({project_id}, 917)"),
    ] {
        db.execute_unprepared(&statement)
            .await
            .expect("seed dependent project row");
    }
}

#[tokio::test]
async fn project_delete_requires_update_authority_and_removes_project_state() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repository, db) = build_app_with_repository_and_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, guest_id) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let project = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .expect("project lookup")
        .expect("project exists");
    let repo_path =
        yoram_vcs::repository_path(data_dir.path(), &project.owner_name, &project.project_name)
            .expect("repository path");
    let svn_repo_path =
        yoram_vcs::svn_repository_path(data_dir.path(), &project.owner_name, &project.project_name)
            .expect("repository path");
    assert!(
        repo_path.exists(),
        "project create should provision bare repo"
    );
    std::fs::create_dir_all(&svn_repo_path).expect("seed stale svn repository path");
    seed_dependent_project_rows(&db, project.id, guest_id).await;
    repository
        .create_project_enrollment_request(project.id, guest_id)
        .await
        .expect("seed project enrollment request");
    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/favorite",
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;

    let forbidden = rest(
        app.clone(),
        Method::DELETE,
        "/yona/api/v1/owners/owner/projects/projectYobi",
        Some(&guest_cookie),
        Some(&guest_csrf),
        None,
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let deleted = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            "/yona/api/v1/owners/owner/projects/projectYobi",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(deleted["ok"], true);
    assert_eq!(deleted["redirectPath"], "/");

    assert!(repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .expect("project lookup")
        .is_none());
    assert_eq!(
        project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("project member count"),
        0
    );
    assert_eq!(
        user_enrolled_project::Entity::find_by_id((guest_id, project.id))
            .count(&db)
            .await
            .expect("enrollment count"),
        0
    );
    assert_eq!(
        favorite_project::Entity::find()
            .filter(favorite_project::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("favorite count"),
        0
    );
    assert_eq!(
        issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("issue count"),
        0
    );
    assert_eq!(
        posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("posting count"),
        0
    );
    assert_eq!(
        pull_request::Entity::find()
            .filter(
                Condition::any()
                    .add(pull_request::Column::ToProjectId.eq(Some(project.id)))
                    .add(pull_request::Column::FromProjectId.eq(Some(project.id))),
            )
            .count(&db)
            .await
            .expect("pull request count"),
        0
    );
    assert_eq!(
        comment_thread::Entity::find()
            .filter(comment_thread::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("comment thread count"),
        0
    );
    assert_eq!(
        issue_label::Entity::find()
            .filter(issue_label::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("issue label count"),
        0
    );
    assert_eq!(
        issue_label_category::Entity::find()
            .filter(issue_label_category::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("issue label category count"),
        0
    );
    assert_eq!(
        commit_comment::Entity::find()
            .filter(commit_comment::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("commit comment count"),
        0
    );
    assert_eq!(
        project_transfer::Entity::find()
            .filter(project_transfer::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("project transfer count"),
        0
    );
    assert_eq!(
        project_pushed_branch::Entity::find()
            .filter(project_pushed_branch::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("project pushed branch count"),
        0
    );
    assert_eq!(
        webhook::Entity::find()
            .filter(webhook::Column::ProjectId.eq(Some(project.id)))
            .count(&db)
            .await
            .expect("webhook count"),
        0
    );
    assert_eq!(
        project_label::Entity::find()
            .filter(project_label::Column::ProjectId.eq(project.id))
            .count(&db)
            .await
            .expect("project label count"),
        0
    );
    assert!(
        !repo_path.exists(),
        "project delete should remove the provisioned bare repo"
    );
    assert!(
        !svn_repo_path.exists(),
        "project delete should also remove executable-backed SVN repository storage"
    );

    let missing = rest(
        app,
        Method::GET,
        "/yona/api/v1/owners/owner/projects/projectYobi",
        Some(&owner_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}
