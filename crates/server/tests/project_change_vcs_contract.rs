use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ColumnTrait, ConnectionTrait, Database, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter,
};
use serde_json::{json, Value};
use std::process::Command;
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_persistence::{posting, project, AppRepository};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
    create_router_with_repository_and_app_config, AppRuntimeConfig, RuntimeConfig,
};
use yona_rust_vcs::{repository_path, svn_repository_path};

mod rest_test_support;

fn svnadmin_available() -> bool {
    Command::new("svnadmin")
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
}

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

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
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
    ok_json(response).await;
    (csrf, cookie_header)
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str) {
    ok_json(
        rest(
            app,
            Method::POST,
            "/yona/api/v1/owners/owner/projects",
            Some(cookie),
            Some(csrf),
            Some(json!({
                "overview": "change VCS parity",
                "projectName": "projectYobi",
                "projectScope": "public",
            })),
        )
        .await,
    )
    .await;
}

#[tokio::test]
// Guards the `routes/projects/vcs.rs` ownership boundary: change-vcs form,
// update gate, Git/SVN repository reset, and unavailable-svnadmin errors stay
// together while route registration remains in the parent project module.
async fn project_change_vcs_follows_legacy_update_gate_and_resets_repository() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repository, db) = build_app_with_repository_and_app_config(AppRuntimeConfig {
        data_root: data_dir.path().to_path_buf(),
        ..AppRuntimeConfig::default()
    })
    .await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let project = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .expect("project lookup")
        .expect("project exists");
    let repo_path = repository_path(data_dir.path(), project.id);
    let svn_repo_path = svn_repository_path(data_dir.path(), project.id);
    assert!(
        repo_path.exists(),
        "project create should provision the original repository"
    );
    std::fs::write(repo_path.join("sentinel.txt"), "old repository")
        .expect("write repository sentinel");
    db.execute_unprepared(&format!(
        "INSERT INTO \"posting\" (id, title, project_id, number, num_of_comments, notice, readme) VALUES (701, 'README', {}, 1, 0, 0, 1)",
        project.id
    ))
    .await
    .expect("seed readme posting");

    let forbidden = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/owners/owner/projects/projectYobi/change-vcs",
        Some(&guest_cookie),
        None,
        None,
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let form = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/change-vcs",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(form["ownerName"], "owner");
    assert_eq!(form["projectName"], "projectYobi");
    assert_eq!(form["currentVcs"], "GIT");
    assert_eq!(form["nextVcs"], "Subversion");
    assert_eq!(form["viewerCanChange"], true);

    let forbidden_mutation = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/change-vcs",
        Some(&guest_cookie),
        Some(&guest_csrf),
        None,
    )
    .await;
    assert_eq!(forbidden_mutation.status(), StatusCode::FORBIDDEN);

    if !svnadmin_available() {
        let missing_svn = rest(
            app.clone(),
            Method::POST,
            "/yona/owner/projectYobi/changeVCS",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await;
        assert_eq!(missing_svn.status(), StatusCode::NOT_IMPLEMENTED);
        let stored = project::Entity::find_by_id(project.id)
            .one(&db)
            .await
            .expect("read project")
            .expect("project row");
        assert_eq!(
            stored.vcs.as_deref(),
            Some("GIT"),
            "missing svnadmin should be rejected before changing project metadata"
        );
        assert!(
            repo_path.join("sentinel.txt").exists(),
            "missing svnadmin should not reset the Git repository"
        );
        return;
    }

    let changed = rest(
        app.clone(),
        Method::POST,
        "/yona/owner/projectYobi/changeVCS",
        Some(&owner_cookie),
        Some(&owner_csrf),
        None,
    )
    .await;
    // The legacy direct changeVCS alias shares the app-scoped service/runtime
    // config with the REST mutation path.
    assert_eq!(changed.status(), StatusCode::NO_CONTENT);
    assert_eq!(
        changed.headers().get(http::header::LOCATION).unwrap(),
        "/owner/projectYobi"
    );
    assert_eq!(response_text(changed).await, "");
    assert!(
        !repo_path.exists(),
        "change VCS to SVN should remove the previous Git repository storage"
    );
    assert!(
        svn_repo_path.exists(),
        "change VCS to SVN should create executable-backed SVN repository storage"
    );
    assert!(
        !repo_path.join("sentinel.txt").exists(),
        "change VCS should reset the previous repository contents"
    );

    let stored = project::Entity::find_by_id(project.id)
        .one(&db)
        .await
        .expect("read project")
        .expect("project row");
    assert_eq!(stored.vcs.as_deref(), Some("Subversion"));
    let readme_count = posting::Entity::find()
        .filter(posting::Column::ProjectId.eq(Some(project.id)))
        .filter(posting::Column::Readme.eq(Some(1)))
        .count(&db)
        .await
        .expect("readme count");
    assert_eq!(
        readme_count, 0,
        "legacy changeVCS clears the DB-backed README posting flag"
    );

    let changed_back = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/change-vcs",
            Some(&owner_cookie),
            Some(&owner_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(changed_back["currentVcs"], "GIT");
    assert_eq!(changed_back["nextVcs"], "Subversion");
    assert_eq!(changed_back["redirectPath"], "/owner/projectYobi");
    assert!(
        repo_path.exists(),
        "change VCS back to Git should create fresh bare Git repository storage"
    );
    assert!(
        !svn_repo_path.exists(),
        "change VCS back to Git should remove previous SVN repository storage"
    );

    let stored_back = project::Entity::find_by_id(project.id)
        .one(&db)
        .await
        .expect("read project")
        .expect("project row");
    assert_eq!(stored_back.vcs.as_deref(), Some("GIT"));
}
