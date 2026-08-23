//! Phase 2 storage-lifecycle contract tests: canonical owner/project layout,
//! staging namespace rollback, alternate-VCS coexistence, and namespace-lock
//! serialization for concurrent creates.

use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ConnectionTrait, Database, DatabaseConnection};
use serde_json::{json, Value};
use std::process::Command;
use tempfile::tempdir;
use tower::ServiceExt;
use yoram_migration::Migrator;

use yoram_persistence::AppRepository;
use yoram_server::{create_router_with_repository_and_app_config, AppRuntimeConfig, RuntimeConfig};

mod rest_test_support;

async fn build_app_with_data_root(
    data_root: std::path::PathBuf,
) -> (axum::Router, AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db.clone());
    let app_config = AppRuntimeConfig {
        data_root,
        ..AppRuntimeConfig::default()
    };
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
    assert_eq!(response.status(), StatusCode::OK);
    (csrf, cookie_header)
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str) -> Response<Body> {
    rest(
        app,
        Method::POST,
        "/yona/api/v1/owners/owner/projects",
        Some(cookie),
        Some(csrf),
        Some(json!({
            "overview": "lifecycle parity",
            "projectName": "projectYobi",
            "projectScope": "public",
        })),
    )
    .await
}

fn git_dir(data_root: &std::path::Path, owner: &str, project: &str) -> std::path::PathBuf {
    data_root
        .join("repo")
        .join("git")
        .join(owner)
        .join(format!("{project}.git"))
}

fn svn_dir(data_root: &std::path::Path, owner: &str, project: &str) -> std::path::PathBuf {
    data_root.join("repo").join("svn").join(owner).join(project)
}

fn staging_root(data_root: &std::path::Path) -> std::path::PathBuf {
    data_root.join("repo").join(".staging")
}

/// Blocks every UPDATE on the project table to force mid-sequence DB failures.
async fn block_project_updates(db: &DatabaseConnection) {
    db.execute_unprepared(
        "CREATE TRIGGER block_project_update BEFORE UPDATE ON project BEGIN SELECT RAISE(ABORT, 'forced'); END;",
    )
    .await
    .expect("create update blocker");
}

async fn block_project_deletes(db: &DatabaseConnection) {
    db.execute_unprepared(
        "CREATE TRIGGER block_project_delete BEFORE DELETE ON project BEGIN SELECT RAISE(ABORT, 'forced'); END;",
    )
    .await
    .expect("create delete blocker");
}

#[tokio::test]
async fn rename_relocates_repository_directory() {
    let data_dir = tempdir().expect("data root");
    let (app, repository, _db) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    ok(create_project(app.clone(), &cookie, &csrf).await).await;

    let original = git_dir(data_dir.path(), "owner", "projectYobi");
    assert!(original.is_dir(), "creation provisions canonical git dir");
    std::fs::write(original.join("marker.txt"), "same-repo").expect("seed marker");

    let response = rest(
        app,
        Method::PATCH,
        "/yona/api/v1/owners/owner/projects/projectYobi",
        Some(&cookie),
        Some(&csrf),
        Some(json!({
            "projectName": "renamed",
            "overview": "lifecycle parity",
            "projectScope": "public",
        })),
    )
    .await;
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "{}",
        response_text(response).await
    );

    let moved = git_dir(data_dir.path(), "owner", "renamed");
    assert!(
        moved.is_dir(),
        "rename should move the repository directory"
    );
    assert!(!original.exists(), "old repository path should be gone");
    assert_eq!(
        std::fs::read_to_string(moved.join("marker.txt")).unwrap(),
        "same-repo",
        "the same physical repository must be relocated"
    );
    let record = repository
        .read_project_by_owner_and_name("owner", "renamed")
        .await
        .unwrap()
        .expect("renamed project");
    assert_eq!(record.vcs, "GIT");
}

#[tokio::test]
async fn rename_failure_restores_previous_directory() {
    let data_dir = tempdir().expect("data root");
    let (app, _repository, db) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    ok(create_project(app.clone(), &cookie, &csrf).await).await;
    block_project_updates(&db).await;

    let response = rest(
        app,
        Method::PATCH,
        "/yona/api/v1/owners/owner/projects/projectYobi",
        Some(&cookie),
        Some(&csrf),
        Some(json!({
            "projectName": "renamed",
            "overview": "lifecycle parity",
            "projectScope": "public",
        })),
    )
    .await;
    assert!(
        response.status().is_server_error() || response.status() == StatusCode::BAD_REQUEST,
        "forced DB failure must surface as an error"
    );

    // The failed rename must leave the repository at the ORIGINAL canonical path.
    assert!(git_dir(data_dir.path(), "owner", "projectYobi").is_dir());
    assert!(!git_dir(data_dir.path(), "owner", "renamed").exists());
}

#[tokio::test]
async fn delete_restores_both_stores_from_staging_on_db_failure() {
    let data_dir = tempdir().expect("data root");
    let (app, _repository, db) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    ok(create_project(app.clone(), &cookie, &csrf).await).await;

    // Unexpected second store: deletion is the ONE operation allowed to remove both.
    std::fs::create_dir_all(svn_dir(data_dir.path(), "owner", "projectYobi"))
        .expect("seed unexpected svn store");
    block_project_deletes(&db).await;

    let response = rest(
        app.clone(),
        Method::DELETE,
        "/yona/api/v1/owners/owner/projects/projectYobi",
        Some(&cookie),
        Some(&csrf),
        None,
    )
    .await;
    assert!(
        !response.status().is_success(),
        "forced DB failure must fail the deletion"
    );
    assert!(
        git_dir(data_dir.path(), "owner", "projectYobi").is_dir(),
        "git store must be restored when the DB transaction fails"
    );
    assert!(
        svn_dir(data_dir.path(), "owner", "projectYobi").is_dir(),
        "svn store must be restored when the DB transaction fails"
    );

    db.execute_unprepared("DROP TRIGGER block_project_delete")
        .await
        .expect("remove delete blocker");
    let response = rest(
        app,
        Method::DELETE,
        "/yona/api/v1/owners/owner/projects/projectYobi",
        Some(&cookie),
        Some(&csrf),
        None,
    )
    .await;
    assert!(response.status().is_success());
    assert!(!git_dir(data_dir.path(), "owner", "projectYobi").exists());
    assert!(!svn_dir(data_dir.path(), "owner", "projectYobi").exists());
    let staging = staging_root(data_dir.path());
    if staging.is_dir() {
        assert!(
            std::fs::read_dir(&staging).unwrap().count() == 0,
            "successful deletion must not leave staging leftovers"
        );
    }
}

#[tokio::test]
async fn vcs_change_failure_restores_old_store_from_staging() {
    let data_dir = tempdir().expect("data root");
    let (app, _repository, db) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    ok(create_project(app.clone(), &cookie, &csrf).await).await;
    std::fs::write(
        git_dir(data_dir.path(), "owner", "projectYobi").join("marker.txt"),
        "keep",
    )
    .expect("seed marker");
    block_project_updates(&db).await;

    let response = rest(
        app,
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/change-vcs",
        Some(&cookie),
        Some(&csrf),
        None,
    )
    .await;
    assert!(
        !response.status().is_success(),
        "forced DB failure must fail the VCS change"
    );

    // Old git store restored in place, new svn store removed, no staging leftovers.
    let git_path = git_dir(data_dir.path(), "owner", "projectYobi");
    assert!(git_path.is_dir());
    assert_eq!(
        std::fs::read_to_string(git_path.join("marker.txt")).unwrap(),
        "keep"
    );
    assert!(!svn_dir(data_dir.path(), "owner", "projectYobi").exists());
    let staging = staging_root(data_dir.path());
    if staging.is_dir() {
        assert_eq!(std::fs::read_dir(&staging).unwrap().count(), 0);
    }
}

#[tokio::test]
async fn coexistence_blocks_rename_and_vcs_change_without_deleting_either_store() {
    let data_dir = tempdir().expect("data root");
    let (app, _repository, _db) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    ok(create_project(app.clone(), &cookie, &csrf).await).await;

    // Simulate the inconsistent state: BOTH canonical stores exist.
    std::fs::create_dir_all(svn_dir(data_dir.path(), "owner", "projectYobi"))
        .expect("seed svn store");
    let git_before = fs_stamp(&git_dir(data_dir.path(), "owner", "projectYobi"));
    let svn_before = fs_stamp(&svn_dir(data_dir.path(), "owner", "projectYobi"));

    let rename = rest(
        app.clone(),
        Method::PATCH,
        "/yona/api/v1/owners/owner/projects/projectYobi",
        Some(&cookie),
        Some(&csrf),
        Some(json!({
            "projectName": "renamed",
            "overview": "lifecycle parity",
            "projectScope": "public",
        })),
    )
    .await;
    assert_eq!(
        rename.status(),
        StatusCode::CONFLICT,
        "rename must refuse the inconsistent dual-store project"
    );

    let vcs_change = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/change-vcs",
        Some(&cookie),
        Some(&csrf),
        None,
    )
    .await;
    assert_eq!(
        vcs_change.status(),
        StatusCode::CONFLICT,
        "VCS change must refuse the inconsistent dual-store project"
    );

    assert!(
        git_dir(data_dir.path(), "owner", "projectYobi").is_dir(),
        "neither store may be deleted by the refused mutations"
    );
    assert!(svn_dir(data_dir.path(), "owner", "projectYobi").is_dir());
    assert_eq!(
        fs_stamp(&git_dir(data_dir.path(), "owner", "projectYobi")),
        git_before
    );
    assert_eq!(
        fs_stamp(&svn_dir(data_dir.path(), "owner", "projectYobi")),
        svn_before
    );
}

#[tokio::test]
async fn namespace_lock_serializes_concurrent_creates_on_the_same_destination() {
    let data_dir = tempdir().expect("shared data root");
    let (app_a, _repo_a, _db_a) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (app_b, _repo_b, _db_b) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (csrf_a, cookie_a) = register_user(app_a.clone(), "owner").await;
    let (csrf_b, cookie_b) = register_user(app_b.clone(), "owner").await;

    let create_a = create_project(app_a, &cookie_a, &csrf_a);
    let create_b = create_project(app_b, &cookie_b, &csrf_b);
    let (status_a, status_b) = tokio::join!(async { create_a.await.status() }, async {
        create_b.await.status()
    });

    let winners = [status_a, status_b]
        .into_iter()
        .filter(|status| status.is_success())
        .count();
    assert_eq!(winners, 1, "exactly one create may claim the destination");
    assert!(
        git_dir(data_dir.path(), "owner", "projectYobi").is_dir(),
        "the winning create must provision the canonical directory"
    );
}

// --- helpers -------------------------------------------------------------

fn fs_stamp(path: &std::path::Path) -> Option<std::time::SystemTime> {
    std::fs::metadata(path)
        .ok()
        .and_then(|meta| meta.modified().ok())
}

async fn ok(response: Response<Body>) -> Response<Body> {
    assert!(
        response.status().is_success(),
        "{}",
        response_text(response).await
    );
    response
}

// --- section 2.5 additions ------------------------------------------------

async fn create_org_project(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    org: &str,
    name: &str,
) -> Response<Body> {
    rest(
        app,
        Method::POST,
        &format!("/yona/api/v1/owners/{org}/projects"),
        Some(cookie),
        Some(csrf),
        Some(json!({
            "overview": "org fixture",
            "projectName": name,
            "projectScope": "public",
        })),
    )
    .await
}

async fn scalar_i64(db: &DatabaseConnection, sql: String) -> Option<i64> {
    use sea_orm::Statement;
    let row = db
        .query_one(Statement::from_string(db.get_database_backend(), sql))
        .await
        .expect("scalar query");
    row.and_then(|row| row.try_get::<i64>("", "value").ok())
}

#[tokio::test]
async fn organization_rename_moves_owner_directories_and_updates_everything() {
    let data_dir = tempdir().expect("data root");
    let (app, repository, db) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;

    // Org with 2 Git projects and 1 SVN project.
    ok(rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/organizations",
        Some(&cookie),
        Some(&csrf),
        Some(json!({"organizationName": "weblabs", "description": "labs"})),
    )
    .await)
    .await;
    ok(create_org_project(app.clone(), &cookie, &csrf, "weblabs", "alpha").await).await;
    ok(create_org_project(app.clone(), &cookie, &csrf, "weblabs", "beta").await).await;
    ok(rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/weblabs/projects/beta/change-vcs",
        Some(&cookie),
        Some(&csrf),
        None,
    )
    .await)
    .await;
    assert!(svn_dir(data_dir.path(), "weblabs", "beta").is_dir());

    // Seed one git commit into alpha so refs can be compared across the rename.
    let alpha_git = git_dir(data_dir.path(), "weblabs", "alpha");
    let work = tempdir().expect("work tree");
    let run = |args: &[&str], cwd: &std::path::Path| {
        assert!(Command::new("git")
            .args(args)
            .current_dir(cwd)
            .env("GIT_AUTHOR_NAME", "t")
            .env("GIT_AUTHOR_EMAIL", "t@example.com")
            .env("GIT_COMMITTER_NAME", "t")
            .env("GIT_COMMITTER_EMAIL", "t@example.com")
            .status()
            .expect("git")
            .success());
    };
    run(&["init", "-b", "main"], work.path());
    std::fs::write(work.path().join("README.md"), "hello").unwrap();
    run(&["add", "."], work.path());
    run(&["commit", "-m", "seed"], work.path());
    run(&["push", alpha_git.to_str().unwrap(), "main"], work.path());
    let head_before = {
        let out = Command::new("git")
            .args([
                "--git-dir",
                alpha_git.to_str().unwrap(),
                "rev-parse",
                "refs/heads/main",
            ])
            .output()
            .unwrap();
        String::from_utf8_lossy(&out.stdout).trim().to_string()
    };
    let svn_before = yoram_vcs::svn_youngest_revision(&svn_dir(data_dir.path(), "weblabs", "beta"))
        .expect("svn youngest");

    ok(rest(
        app.clone(),
        Method::PATCH,
        "/yona/api/v1/organizations/weblabs",
        Some(&cookie),
        Some(&csrf),
        Some(json!({"organizationName": "weblabs2", "description": "labs"})),
    )
    .await)
    .await;

    // Old owner directories gone; new ones hold every repository.
    let org_names: Vec<String> = {
        use sea_orm::Statement;
        let rows = db
            .query_all(Statement::from_string(
                db.get_database_backend(),
                "SELECT name FROM organization".to_string(),
            ))
            .await
            .unwrap();
        rows.iter()
            .filter_map(|row| row.try_get::<String>("", "name").ok())
            .collect()
    };
    assert!(!data_dir.path().join("repo/git/weblabs").exists());
    assert!(!data_dir.path().join("repo/svn/weblabs").exists());
    assert_eq!(org_names, vec!["weblabs2".to_string()]);
    assert!(git_dir(data_dir.path(), "weblabs2", "alpha").is_dir());
    assert!(svn_dir(data_dir.path(), "weblabs2", "beta").is_dir());
    // beta switched to Subversion, so its git store must NOT have been carried over
    assert!(!git_dir(data_dir.path(), "weblabs2", "beta").exists());

    // DB updated everywhere.
    assert!(repository
        .read_organization_by_name("weblabs2")
        .await
        .unwrap()
        .is_some());
    assert!(repository
        .read_organization_by_name("weblabs")
        .await
        .unwrap()
        .is_none());
    for name in ["alpha", "beta"] {
        let record = repository
            .read_project_by_owner_and_name("weblabs2", name)
            .await
            .unwrap()
            .unwrap_or_else(|| panic!("{name} must move to the renamed org"));
        assert_eq!(record.owner_name, "weblabs2");
    }

    // Repository content unchanged.
    let head_after = {
        let moved = git_dir(data_dir.path(), "weblabs2", "alpha");
        let out = Command::new("git")
            .args([
                "--git-dir",
                moved.to_str().unwrap(),
                "rev-parse",
                "refs/heads/main",
            ])
            .output()
            .unwrap();
        String::from_utf8_lossy(&out.stdout).trim().to_string()
    };
    assert_eq!(head_before, head_after, "git refs must survive the rename");
    let svn_after = yoram_vcs::svn_youngest_revision(&svn_dir(data_dir.path(), "weblabs2", "beta"))
        .expect("svn youngest after rename");
    assert_eq!(svn_before, svn_after, "svn history must survive the rename");

    // Forced DB failure on the NEXT rename restores the filesystem and DB.
    db.execute_unprepared(
        "CREATE TRIGGER block_org_update BEFORE UPDATE ON organization BEGIN SELECT RAISE(ABORT, 'forced'); END;",
    )
    .await
    .expect("block org updates");
    let response = rest(
        app.clone(),
        Method::PATCH,
        "/yona/api/v1/organizations/weblabs2",
        Some(&cookie),
        Some(&csrf),
        Some(json!({"organizationName": "weblabs3", "description": "labs"})),
    )
    .await;
    assert!(
        !response.status().is_success(),
        "forced DB failure must fail the org rename"
    );
    assert!(!data_dir.path().join("repo/git/weblabs3").exists());
    assert!(
        git_dir(data_dir.path(), "weblabs2", "alpha").is_dir(),
        "filesystem restored"
    );
    assert!(
        svn_dir(data_dir.path(), "weblabs2", "beta").is_dir(),
        "filesystem restored"
    );
    assert!(!data_dir.path().join("repo/git/weblabs3").exists());
    assert!(repository
        .read_organization_by_name("weblabs2")
        .await
        .unwrap()
        .is_some());
}

#[tokio::test]
async fn transfer_accept_failure_rolls_back_relocation_and_database() {
    let data_dir = tempdir().expect("data root");
    let (app, repository, db) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (recipient_csrf, recipient_cookie) = register_user(app.clone(), "recipient").await;
    ok(create_project(app.clone(), &owner_cookie, &owner_csrf).await).await;

    let requested = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/transfer",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({"destination": "recipient"})),
    )
    .await;
    assert_eq!(requested.status(), StatusCode::OK);

    let transfer_id = scalar_i64(
        &db,
        "SELECT MAX(id) AS value FROM project_transfer".to_string(),
    )
    .await
    .expect("transfer row");
    let confirm_key: String = {
        use sea_orm::Statement;
        let row = db
            .query_one(Statement::from_string(
                db.get_database_backend(),
                format!("SELECT confirm_key FROM project_transfer WHERE id = {transfer_id}"),
            ))
            .await
            .unwrap()
            .expect("transfer row");
        row.try_get::<String>("", "confirm_key")
            .expect("confirm key")
    };

    block_project_updates(&db).await;

    let accepted = rest(
        app,
        Method::GET,
        &format!("/yona/project/transfer/{transfer_id}/{confirm_key}"),
        Some(&recipient_cookie),
        Some(&recipient_csrf),
        None,
    )
    .await;
    assert!(
        !accepted.status().is_success(),
        "forced DB failure must fail the acceptance"
    );

    // Filesystem relocation rolled back.
    assert!(git_dir(data_dir.path(), "owner", "projectYobi").is_dir());
    assert!(!git_dir(data_dir.path(), "recipient", "projectYobi-1").exists());

    // Database unchanged.
    let project = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("project stays with original owner");
    assert_eq!(project.id, project_id_of(&db, "owner", "projectYobi").await);
}

async fn project_id_of(db: &DatabaseConnection, owner: &str, name: &str) -> i64 {
    scalar_i64(
        db,
        format!("SELECT id AS value FROM project WHERE owner = '{owner}' AND name = '{name}'"),
    )
    .await
    .expect("project id")
}

#[tokio::test]
async fn update_project_label_cache_failure_rolls_back_row_update() {
    let data_dir = tempdir().expect("data root");
    let (app, repository, db) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    ok(create_project(app.clone(), &cookie, &csrf).await).await;
    let project_id = project_id_of(&db, "owner", "projectYobi").await;
    let user_id = scalar_i64(
        &db,
        "SELECT id AS value FROM n4user WHERE login_id = 'owner'".to_string(),
    )
    .await
    .expect("owner user id");
    db.execute_unprepared(&format!(
        "INSERT INTO favorite_project (user_id, project_id, owner, project_name) VALUES ({user_id}, {project_id}, 'owner', 'projectYobi')"
    ))
    .await
    .expect("seed favorite denormalized reference");
    db.execute_unprepared(
        "CREATE TRIGGER block_favorite_update BEFORE UPDATE ON favorite_project BEGIN SELECT RAISE(ABORT, 'forced'); END;",
    )
    .await
    .expect("block favorite updates");

    let response = rest(
        app.clone(),
        Method::PATCH,
        "/yona/api/v1/owners/owner/projects/projectYobi",
        Some(&cookie),
        Some(&csrf),
        Some(json!({
            "projectName": "renamed",
            "overview": "lifecycle parity",
            "projectScope": "public",
        })),
    )
    .await;
    assert!(
        !response.status().is_success(),
        "label-cache sync failure must fail the whole update"
    );

    // The project-name row update is rolled back together with the cache sync.
    let record = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .expect("original project row intact");
    assert_eq!(record.project_name, "projectYobi");
    assert_eq!(record.previous_project_name, None);
    let stale = repository
        .read_project_by_owner_and_name("owner", "renamed")
        .await
        .unwrap();
    assert!(stale.is_none());
}

#[tokio::test]
async fn creation_provisioning_failure_leaves_no_committed_row_or_membership() {
    let data_dir = tempdir().expect("data root");
    let (app, repository, db) = build_app_with_data_root(data_dir.path().to_path_buf()).await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;

    // Make repository provisioning impossible: repo/git exists as a FILE, so
    // the canonical destination can never be created beneath it. The
    // destination-existence check passes (path itself missing), provisioning
    // fails, and the committed row must be compensated away.
    std::fs::create_dir_all(data_dir.path().join("repo")).unwrap();
    std::fs::write(data_dir.path().join("repo/git"), "not a directory").unwrap();

    let response = create_project(app.clone(), &cookie, &csrf).await;
    assert!(
        !response.status().is_success(),
        "provisioning failure must fail creation"
    );

    assert!(
        repository
            .read_project_by_owner_and_name("owner", "projectYobi")
            .await
            .unwrap()
            .is_none(),
        "no orphan committed project row may survive"
    );
    let membership_rows = scalar_i64(
        &db,
        "SELECT COUNT(*) AS value FROM project_user".to_string(),
    )
    .await
    .unwrap_or(0);
    assert_eq!(membership_rows, 0, "no orphan membership may survive");
}
