use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_persistence::{
    AppRepository, CreatePostingInput, CreateProjectLabelInput, CreatePullRequestInput,
    PostingMutationInput, PullRequestMutationInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};
use yona_rust_vcs::{repository_path, svn_repository_path};

fn svnadmin_available() -> bool {
    Command::new("svnadmin")
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
}

fn yona_data_env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

async fn build_app_with_repository() -> (axum::Router, AppRepository) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db);
    let app = create_router_with_app_repository(
        RuntimeConfig {
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
    );

    (app, app_repo)
}

async fn build_app() -> axum::Router {
    build_app_with_repository().await.0
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

async fn response_json(response: Response<Body>) -> String {
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
    let json = response_json(response).await;
    let payload: serde_json::Value = serde_json::from_str(&json).expect("register response json");
    payload
        .get("actorId")
        .and_then(|value| {
            value
                .as_i64()
                .or_else(|| value.as_str().and_then(|value| value.parse().ok()))
        })
        .expect("registered actor id")
}

async fn create_organization(
    app: axum::Router,
    cookie_header: &str,
    csrf: &str,
    organization_name: &str,
    description: &str,
) {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/CreateOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from(format!(
                    "{{\"organizationName\":\"{organization_name}\",\"description\":\"{description}\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

async fn create_project(
    app: axum::Router,
    cookie_header: &str,
    csrf: &str,
    owner_name: &str,
    project_name: &str,
    overview: &str,
    project_scope: &str,
) {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/CreateProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from(format!(
                    "{{\"ownerName\":\"{owner_name}\",\"projectName\":\"{project_name}\",\"overview\":\"{overview}\",\"projectScope\":\"{project_scope}\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

fn run_git(args: &[&str], cwd: Option<&Path>) {
    let mut command = Command::new("git");
    command.args(args);
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    let output = command.output().expect("run git");
    assert!(
        output.status.success(),
        "git {:?} failed\nstdout: {}\nstderr: {}",
        args,
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

fn seed_bare_repository_readme(yona_data: &Path, project_id: i64, readme: &str) {
    let repo_root = yona_data.join("repo");
    fs::create_dir_all(&repo_root).expect("repo root");
    let bare_repo = repo_root.join(format!("{project_id}.git"));
    if !bare_repo.exists() {
        run_git(&["init", "--bare", bare_repo.to_str().unwrap()], None);
    }
    let work = tempdir().expect("work repo");
    fs::write(work.path().join("README.md"), readme).expect("readme");
    fs::create_dir_all(work.path().join("assets")).expect("assets dir");
    fs::write(
        work.path().join("assets").join("logo.png"),
        b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR",
    )
    .expect("png");
    fs::create_dir_all(work.path().join("docs")).expect("docs dir");
    fs::write(work.path().join("docs").join("guide.md"), "# Guide\n").expect("guide");
    run_git(
        &[
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "--work-tree",
            work.path().to_str().unwrap(),
            "add",
            ".",
        ],
        None,
    );
    run_git(
        &[
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "--work-tree",
            work.path().to_str().unwrap(),
            "-c",
            "user.email=author@example.com",
            "-c",
            "user.name=Author",
            "commit",
            "-m",
            "Initial README",
        ],
        None,
    );
    run_git(
        &[
            "--git-dir",
            bare_repo.to_str().unwrap(),
            "branch",
            "-M",
            "main",
        ],
        None,
    );
}

#[tokio::test]
async fn organization_and_project_settings_contracts_require_expected_authority() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    let create_org = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/CreateOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"organizationName\":\"weblabs\",\"description\":\"web labs\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_org.status(), StatusCode::OK);

    let detail = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationDetail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(detail.status(), StatusCode::OK);

    let anonymous_settings = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationSettings")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(anonymous_settings.status(), StatusCode::UNAUTHORIZED);

    let authorized_settings = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationSettings")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(authorized_settings.status(), StatusCode::OK);
    let authorized_settings_json: serde_json::Value =
        serde_json::from_str(&response_json(authorized_settings).await).expect("settings json");
    assert!(authorized_settings_json.get("logoUrl").is_none());

    let create_project = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/CreateProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from("{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\",\"overview\":\"Yona\",\"projectScope\":\"public\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_project.status(), StatusCode::OK);

    let guest_settings = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadProjectSettings")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(guest_settings.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn create_project_uses_configured_default_scope_when_request_omits_scope() {
    let _guard = yona_data_env_lock().lock().unwrap();
    std::env::set_var("YONA_PROJECT_DEFAULT_SCOPE", "private");
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let create_project = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/CreateProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\",\"overview\":\"Yona\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    std::env::remove_var("YONA_PROJECT_DEFAULT_SCOPE");
    assert_eq!(create_project.status(), StatusCode::OK);

    let json = response_json(create_project).await;
    assert!(json.contains("\"projectScope\":\"private\""));
}

#[tokio::test]
async fn create_project_uses_configured_default_menus_for_new_project_container() {
    let _guard = yona_data_env_lock().lock().unwrap();
    std::env::set_var("YONA_PROJECT_DEFAULT_MENUS", "issue, board");
    let (app, app_repo) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Yona",
        "public",
    )
    .await;
    std::env::remove_var("YONA_PROJECT_DEFAULT_MENUS");

    let authorization = app_repo
        .read_project_authorization("admin", "projectYobi", None)
        .await
        .expect("read project authorization")
        .expect("created project authorization");
    let menu_settings = app_repo
        .read_project_menu_settings(authorization.project.id)
        .await
        .expect("read project menu settings");
    assert!(menu_settings.issue);
    assert!(menu_settings.board);
    assert!(!menu_settings.code);
    assert!(!menu_settings.pull_request);
    assert!(!menu_settings.review);
    assert!(!menu_settings.milestone);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi/container")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = response_json(response).await;
    let payload: serde_json::Value = serde_json::from_str(&json).expect("container json");
    assert_eq!(payload["showIssue"], true);
    assert_eq!(payload["showBoard"], true);
    assert!(payload.get("showCode").is_none());
    assert!(payload.get("showPullRequest").is_none());
    assert!(payload.get("showReview").is_none());
    assert!(payload.get("showMilestone").is_none());
}

#[tokio::test]
async fn public_directory_lists_project_and_organization_logo_urls() {
    let (app, repository) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = bootstrap(app.clone()).await;
    let owner_id = register_user(app.clone(), &owner_cookie, &owner_csrf, "owner").await;
    create_organization(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "weblabs",
        "web labs",
    )
    .await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "logo project",
        "public",
    )
    .await;

    let project_logo = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "project-logo.png",
            "image/png",
            128,
            "project-directory-logo-hash",
        )
        .await
        .expect("project logo upload");
    let organization_logo = repository
        .create_user_attachment_upload(
            owner_id,
            "owner",
            "organization-logo.png",
            "image/png",
            128,
            "organization-directory-logo-hash",
        )
        .await
        .expect("organization logo upload");

    let project_update = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PATCH)
                .uri("/yona/api/v1/owners/owner/projects/projectYobi")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &owner_cookie)
                .header("x-csrf-token", &owner_csrf)
                .body(Body::from(format!(
                    "{{\"projectName\":\"projectYobi\",\"overview\":\"logo project\",\"projectScope\":\"public\",\"logoAttachmentId\":{}}}",
                    project_logo.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(project_update.status(), StatusCode::OK);

    let organization_update = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PATCH)
                .uri("/yona/api/v1/organizations/weblabs")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &owner_cookie)
                .header("x-csrf-token", &owner_csrf)
                .body(Body::from(format!(
                    "{{\"organizationName\":\"weblabs\",\"description\":\"web labs\",\"logoAttachmentId\":{}}}",
                    organization_logo.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(organization_update.status(), StatusCode::OK);

    let projects = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/projects")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(projects.status(), StatusCode::OK);
    let projects_json: serde_json::Value =
        serde_json::from_str(&response_json(projects).await).expect("projects json");
    assert_eq!(
        projects_json["items"][0]["logoUrl"],
        format!("/yona/files/{}", project_logo.id)
    );

    let organizations = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/organizations")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(organizations.status(), StatusCode::OK);
    let organizations_json: serde_json::Value =
        serde_json::from_str(&response_json(organizations).await).expect("organizations json");
    assert_eq!(
        organizations_json["items"][0]["logoUrl"],
        format!("/yona/files/{}", organization_logo.id)
    );
}

#[tokio::test]
async fn project_create_and_settings_mutations_persist_legacy_menu_checkboxes() {
    let _guard = yona_data_env_lock()
        .lock()
        .expect("serialize YONA_DATA mutation");
    let data_dir = tempdir().expect("yona data tempdir");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, app_repo) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;
    let (reviewer_csrf, reviewer_cookie) = bootstrap(app.clone()).await;
    let reviewer_id =
        register_user(app.clone(), &reviewer_cookie, &reviewer_csrf, "reviewer").await;

    let create_project = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/owners/admin/projects")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"projectName\":\"projectYobi\",\"overview\":\"Yona\",\"projectScope\":\"public\",\"vcs\":\"SVN\",\"code\":false,\"issue\":true,\"pullRequest\":false,\"review\":false,\"milestone\":false,\"board\":true}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    if !svnadmin_available() {
        assert_eq!(create_project.status(), StatusCode::NOT_IMPLEMENTED);
        std::env::remove_var("YONA_DATA");
        return;
    }
    assert_eq!(create_project.status(), StatusCode::OK);

    let authorization = app_repo
        .read_project_authorization("admin", "projectYobi", None)
        .await
        .expect("read project authorization")
        .expect("created project authorization");
    assert_eq!(authorization.project.vcs, "Subversion");
    assert!(
        !repository_path(data_dir.path(), authorization.project.id).exists(),
        "SVN project creation should not leave Git repository storage"
    );
    assert!(
        svn_repository_path(data_dir.path(), authorization.project.id).exists(),
        "SVN project creation should provision executable-backed SVN storage"
    );
    let menu_settings = app_repo
        .read_project_menu_settings(authorization.project.id)
        .await
        .expect("read project menu settings");
    assert!(!menu_settings.code);
    assert!(menu_settings.issue);
    assert!(!menu_settings.pull_request);
    assert!(!menu_settings.review);
    assert!(!menu_settings.milestone);
    assert!(menu_settings.board);
    assert_eq!(authorization.project.default_reviewer_count, 1);
    assert!(!authorization.project.is_using_reviewer_count);
    app_repo
        .add_project_membership(authorization.project.id, reviewer_id, "member")
        .await
        .expect("add reviewer member");

    let settings = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi/settings")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(settings.status(), StatusCode::OK);
    let payload: serde_json::Value =
        serde_json::from_str(&response_json(settings).await).expect("settings json");
    assert_eq!(payload["showCode"], false);
    assert_eq!(payload["showIssue"], true);
    assert_eq!(payload["showPullRequest"], false);
    assert_eq!(payload["showReview"], false);
    assert_eq!(payload["showMilestone"], false);
    assert_eq!(payload["showBoard"], true);
    assert!(payload.get("logoUrl").is_none());
    assert_eq!(payload["defaultReviewerCount"], 1);
    assert_eq!(payload["isUsingReviewerCount"], false);
    assert_eq!(payload["maxReviewerCount"], 2);

    let update_project = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PATCH)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"projectName\":\"projectYobi\",\"overview\":\"Yona\",\"projectScope\":\"protected\",\"code\":true,\"issue\":false,\"pullRequest\":true,\"review\":true,\"milestone\":true,\"board\":false,\"isUsingReviewerCount\":true,\"defaultReviewerCount\":2}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(update_project.status(), StatusCode::OK);

    let updated_menu_settings = app_repo
        .read_project_menu_settings(authorization.project.id)
        .await
        .expect("read updated project menu settings");
    assert!(updated_menu_settings.code);
    assert!(!updated_menu_settings.issue);
    assert!(updated_menu_settings.pull_request);
    assert!(updated_menu_settings.review);
    assert!(updated_menu_settings.milestone);
    assert!(!updated_menu_settings.board);

    let updated_authorization = app_repo
        .read_project_authorization("admin", "projectYobi", None)
        .await
        .expect("read updated project authorization")
        .expect("updated project authorization");
    assert!(updated_authorization.project.is_using_reviewer_count);
    assert_eq!(updated_authorization.project.default_reviewer_count, 2);

    let updated_settings = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi/settings")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(updated_settings.status(), StatusCode::OK);
    let updated_payload: serde_json::Value =
        serde_json::from_str(&response_json(updated_settings).await)
            .expect("updated settings json");
    assert_eq!(updated_payload["defaultReviewerCount"], 2);
    assert_eq!(updated_payload["isUsingReviewerCount"], true);
    assert_eq!(updated_payload["maxReviewerCount"], 2);
    std::env::remove_var("YONA_DATA");
}

#[tokio::test]
async fn project_create_form_options_expose_legacy_owner_selector_choices() {
    let (app, _) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;
    create_organization(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "web labs",
    )
    .await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/projects/form-options?owner=weblabs")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json: serde_json::Value =
        serde_json::from_str(&response_json(response).await).expect("form options json");
    assert_eq!(json["selectedOwnerName"], "weblabs");
    assert_eq!(json["ownerOptions"][0]["ownerName"], "admin");
    assert_eq!(json["ownerOptions"][0]["organization"], false);
    assert_eq!(json["ownerOptions"][0]["selected"], false);
    assert_eq!(json["ownerOptions"][1]["ownerName"], "weblabs");
    assert_eq!(json["ownerOptions"][1]["organization"], true);
    assert_eq!(json["ownerOptions"][1]["selected"], true);
}

#[tokio::test]
async fn project_detail_enrollment_favorites_recent_and_workspace_overview_round_trip() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    let create_project = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/CreateProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from("{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\",\"overview\":\"Yona\",\"projectScope\":\"public\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_project.status(), StatusCode::OK);

    let first_detail = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadProjectDetail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(first_detail.status(), StatusCode::OK);

    let enroll = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/EnrollProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(enroll.status(), StatusCode::OK);

    let favorite = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ToggleFavoriteProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(favorite.status(), StatusCode::OK);

    let overview = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadWorkspaceOverview")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(overview.status(), StatusCode::OK);
    let body = overview.into_body().collect().await.unwrap().to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"favoriteProjects\":["));
    assert!(json.contains("\"recentProjects\":["));
    assert!(json.contains("\"ownerName\":\"admin\""));
    assert!(json.contains("\"projectName\":\"projectYobi\""));

    let cancel = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/CancelEnrollProject")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(cancel.status(), StatusCode::OK);
}

#[tokio::test]
async fn organization_container_contract_returns_project_cards_and_gated_rosters() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    create_organization(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "web labs",
    )
    .await;
    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "projectYobi",
        "Wave 2A home",
        "public",
    )
    .await;

    let anonymous_container = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationContainer")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(anonymous_container.status(), StatusCode::OK);

    let anonymous_json = String::from_utf8(
        anonymous_container
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap();
    assert!(anonymous_json.contains("\"organizationName\":\"weblabs\""));
    assert!(!anonymous_json.contains("\"viewerCanUpdate\":true"));
    assert!(!anonymous_json.contains("\"viewerCanCreateProject\":true"));
    assert!(!anonymous_json.contains("\"adminMembers\":[{"));
    assert!(!anonymous_json.contains("\"memberMembers\":[{"));
    assert!(anonymous_json.contains("\"visibleProjects\":["));

    let admin_container = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationContainer")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(admin_container.status(), StatusCode::OK);

    let admin_json = String::from_utf8(
        admin_container
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap();
    assert!(admin_json.contains("\"viewerCanUpdate\":true"));
    assert!(admin_json.contains("\"viewerCanCreateProject\":true"));
    assert!(admin_json.contains("\"ownerName\":\"weblabs\""));
    assert!(admin_json.contains("\"projectName\":\"projectYobi\""));
}

#[tokio::test]
async fn project_container_contract_returns_header_menu_and_summary_shells() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Wave 2A home",
        "public",
    )
    .await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadProjectContainer")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap();
    assert!(json.contains("\"ownerName\":\"admin\""));
    assert!(json.contains("\"projectName\":\"projectYobi\""));
    assert!(json.contains("\"defaultTab\":\"readme\""));
    assert!(json.contains("\"showIssue\":"));
    assert!(json.contains("\"members\":["));
}

#[tokio::test]
async fn rest_project_container_includes_git_readme_with_legacy_readme_link_rewrites() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Project README fallback",
        "public",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("admin", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_bare_repository_readme(
        data_dir.path(),
        project.id,
        "# Git README\n\n![logo](./assets/logo.png)\n\n[Guide](./docs/guide.md)\n",
    );

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi/container")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = response_json(response).await;
    let payload: serde_json::Value = serde_json::from_str(&json).expect("container json");
    let readme = &payload["readmeFile"];
    assert_eq!(readme["name"], "README.md");
    assert_eq!(
        readme["bodyHtml"].as_str().expect("readme body html"),
        "",
        "Git README fallback must leave Markdown rendering to React"
    );
    let body_markdown = readme["bodyMarkdown"]
        .as_str()
        .expect("readme body markdown");
    assert!(body_markdown.contains("# Git README"), "{body_markdown}");
    assert!(
        body_markdown.contains(r#"![logo](/yona/admin/projectYobi/files/main/assets/logo.png)"#),
        "{body_markdown}"
    );
    assert!(
        body_markdown.contains(r#"[Guide](/yona/admin/projectYobi/code/main/docs/guide.md)"#),
        "{body_markdown}"
    );
    std::env::remove_var("YONA_DATA");
}

#[tokio::test]
async fn rest_project_container_includes_dashboard_open_issue_counts_by_label() {
    let (app, repo) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Project dashboard labels",
        "public",
    )
    .await;

    let guide_label = repo
        .create_project_label(CreateProjectLabelInput {
            category_is_exclusive: false,
            category_name: "Type".to_string(),
            label_color: "#00aa55".to_string(),
            label_name: "Guide".to_string(),
            owner_name: "admin".to_string(),
            project_name: "projectYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("created guide label")
        .0;
    let chore_label = repo
        .create_project_label(CreateProjectLabelInput {
            category_is_exclusive: false,
            category_name: "Type".to_string(),
            label_color: "#5577ff".to_string(),
            label_name: "Chore".to_string(),
            owner_name: "admin".to_string(),
            project_name: "projectYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("created chore label")
        .0;

    let create_open_issue = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/projects/admin/projectYobi/issues")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(format!(
                    "{{\"title\":\"Open guide issue\",\"bodyMarkdown\":\"open\",\"labelIds\":[{}]}}",
                    guide_label.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_open_issue.status(), StatusCode::OK);

    let create_closed_issue = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/projects/admin/projectYobi/issues")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(format!(
                    "{{\"title\":\"Closed guide issue\",\"bodyMarkdown\":\"closed\",\"labelIds\":[{}]}}",
                    guide_label.id
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_closed_issue.status(), StatusCode::OK);
    let closed_issue: serde_json::Value =
        serde_json::from_str(&response_json(create_closed_issue).await).expect("issue json");
    let closed_issue_number = closed_issue["issueNumber"]
        .as_str()
        .expect("closed issue number");

    let close_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PUT)
                .uri(format!(
                    "/yona/api/v1/projects/admin/projectYobi/issues/{closed_issue_number}/state"
                ))
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from("{\"state\":\"closed\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(close_response.status(), StatusCode::OK);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi/container")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = response_json(response).await;
    let payload: serde_json::Value = serde_json::from_str(&json).expect("container json");
    let labels = payload["dashboard"]["labels"]
        .as_array()
        .expect("dashboard labels");
    let guide = labels
        .iter()
        .find(|label| label["id"].as_i64() == Some(guide_label.id))
        .expect("guide dashboard label");
    assert_eq!(guide["name"], "Guide");
    assert_eq!(guide["categoryName"], "Type");
    assert_eq!(guide["color"], "#00aa55");
    assert_eq!(guide["openIssueCount"], 1);

    let chore = labels
        .iter()
        .find(|label| label["id"].as_i64() == Some(chore_label.id))
        .expect("chore dashboard label");
    assert_eq!(chore["name"], "Chore");
    assert_eq!(chore["openIssueCount"], 0);
}

#[tokio::test]
async fn rest_project_container_includes_dashboard_open_issue_counts_by_assignee() {
    let (app, _repo) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (member_csrf, member_cookie) = bootstrap(app.clone()).await;
    let member_id = register_user(app.clone(), &member_cookie, &member_csrf, "assigned").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Project dashboard assignees",
        "public",
    )
    .await;

    let create_assigned_open = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/projects/admin/projectYobi/issues")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"title\":\"Open assigned issue\",\"bodyMarkdown\":\"open\",\"assigneeLoginId\":\"assigned\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_assigned_open.status(), StatusCode::OK);

    let create_assigned_closed = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/projects/admin/projectYobi/issues")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"title\":\"Closed assigned issue\",\"bodyMarkdown\":\"closed\",\"assigneeLoginId\":\"assigned\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_assigned_closed.status(), StatusCode::OK);
    let closed_issue: serde_json::Value =
        serde_json::from_str(&response_json(create_assigned_closed).await).expect("issue json");
    let closed_issue_number = closed_issue["issueNumber"]
        .as_str()
        .expect("closed issue number");
    let close_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PUT)
                .uri(format!(
                    "/yona/api/v1/projects/admin/projectYobi/issues/{closed_issue_number}/state"
                ))
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from("{\"state\":\"closed\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(close_response.status(), StatusCode::OK);

    let create_unassigned_open = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/projects/admin/projectYobi/issues")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"title\":\"Open unassigned issue\",\"bodyMarkdown\":\"open\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_unassigned_open.status(), StatusCode::OK);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi/container")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = response_json(response).await;
    let payload: serde_json::Value = serde_json::from_str(&json).expect("container json");
    let assignees = payload["dashboard"]["assignees"]
        .as_array()
        .expect("dashboard assignees");
    let assigned = assignees
        .iter()
        .find(|assignee| assignee["userId"].as_i64() == Some(member_id))
        .expect("assigned dashboard row");
    assert_eq!(assigned["loginId"], "assigned");
    assert_eq!(assigned["userLabel"], "assigned");
    assert_eq!(assigned["openIssueCount"], 1);
    assert_eq!(payload["dashboard"]["unassignedOpenIssueCount"], 1);
}

#[tokio::test]
async fn rest_project_container_includes_legacy_project_home_history_rows() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    std::env::remove_var("YONA_DATA");
    let (app, repo) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    let admin_id = register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Project home history",
        "public",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("admin", "projectYobi")
        .await
        .unwrap()
        .expect("project");

    let create_issue = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/projects/admin/projectYobi/issues")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"title\":\"History issue\",\"bodyMarkdown\":\"issue history\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_issue.status(), StatusCode::OK);
    repo.create_posting(CreatePostingInput {
        actor_display_name: "admin".to_string(),
        actor_id: admin_id,
        actor_login_id: "admin".to_string(),
        owner_name: "admin".to_string(),
        project_name: "projectYobi".to_string(),
        values: PostingMutationInput {
            attachment_ids: Vec::new(),
            body_markdown: "posting history".to_string(),
            label_ids: Vec::new(),
            notice: false,
            readme: false,
            title: "History post".to_string(),
        },
    })
    .await
    .unwrap()
    .expect("posting");
    repo.create_pull_request(CreatePullRequestInput {
        actor_display_name: "admin".to_string(),
        actor_id: admin_id,
        actor_login_id: "admin".to_string(),
        from_branch: "topic".to_string(),
        from_project_id: project.id,
        to_branch: "main".to_string(),
        to_project_id: project.id,
        values: PullRequestMutationInput {
            attachment_ids: Vec::new(),
            body_markdown: "pull request history".to_string(),
            title: "History pull request".to_string(),
        },
    })
    .await
    .unwrap()
    .expect("pull request");

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi/container")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = response_json(response).await;
    let payload: serde_json::Value = serde_json::from_str(&json).expect("container json");
    let items = payload["history"]["items"]
        .as_array()
        .expect("history items");

    let issue = items
        .iter()
        .find(|item| item["itemType"] == "issue")
        .expect("issue history row");
    assert_eq!(issue["actorName"], "admin");
    assert_eq!(issue["actorUrl"], "/yona/admin");
    assert_eq!(issue["shortTitle"], "#1");
    assert_eq!(issue["title"], "History issue");
    assert_eq!(issue["url"], "/yona/admin/projectYobi/issue/1");

    let post = items
        .iter()
        .find(|item| item["itemType"] == "post")
        .expect("post history row");
    assert_eq!(post["shortTitle"], "#1");
    assert_eq!(post["title"], "History post");
    assert_eq!(post["url"], "/yona/admin/projectYobi/post/1");

    let pull_request = items
        .iter()
        .find(|item| item["itemType"] == "pullrequest")
        .expect("pull request history row");
    assert_eq!(pull_request["shortTitle"], "#1");
    assert_eq!(pull_request["title"], "History pull request");
    assert_eq!(pull_request["url"], "/yona/admin/projectYobi/pullRequest/1");
}

#[tokio::test]
async fn rest_project_container_includes_legacy_project_home_commit_history_rows() {
    let _guard = yona_data_env_lock()
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    let data_dir = tempdir().expect("yona data");
    std::env::set_var("YONA_DATA", data_dir.path());
    let (app, repo) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Project commit history",
        "public",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("admin", "projectYobi")
        .await
        .unwrap()
        .expect("project");
    seed_bare_repository_readme(data_dir.path(), project.id, "# Git README\n");

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi/container")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = response_json(response).await;
    let payload: serde_json::Value = serde_json::from_str(&json).expect("container json");
    let items = payload["history"]["items"]
        .as_array()
        .expect("history items");
    let commit = items
        .iter()
        .find(|item| item["itemType"] == "commit")
        .expect("commit history row");
    assert_eq!(commit["actorName"], "Author");
    assert_eq!(commit["actorUrl"], "#");
    assert_eq!(commit["title"], "Initial README");
    let created_label = commit["createdLabel"].as_str().expect("commit date label");
    assert_eq!(created_label.len(), "YYYY-MM-DD".len());
    let short_title = commit["shortTitle"].as_str().expect("short commit title");
    assert_eq!(short_title.len(), 7);
    let url = commit["url"].as_str().expect("commit url");
    assert!(url.starts_with("/yona/admin/projectYobi/commit/"));
    assert!(url.len() > "/yona/admin/projectYobi/commit/".len() + 7);
    std::env::remove_var("YONA_DATA");
}

#[tokio::test]
async fn update_project_overview_returns_refreshed_project_container() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Before overview update",
        "public",
    )
    .await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateProjectOverview")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\",\"overview\":\"After overview update\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap();
    assert!(json.contains("\"overview\":\"After overview update\""));

    let direct_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PUT)
                .uri("/yona/admin/projectYobi")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from("{\"overview\":\"Direct overview update\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(direct_response.status(), StatusCode::OK);
    let direct_json: serde_json::Value =
        serde_json::from_str(&response_json(direct_response).await).expect("overview json");
    assert_eq!(direct_json["overview"], "Direct overview update");

    let container = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/v1/owners/admin/projects/projectYobi/container")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(container.status(), StatusCode::OK);
    let container_json: serde_json::Value =
        serde_json::from_str(&response_json(container).await).expect("container json");
    assert_eq!(container_json["overview"], "Direct overview update");
}

#[tokio::test]
async fn toggle_project_watch_returns_refreshed_project_container() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "admin",
        "projectYobi",
        "Watchable project",
        "public",
    )
    .await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ToggleProjectWatch")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from(
                    "{\"ownerName\":\"admin\",\"projectName\":\"projectYobi\",\"watching\":true}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let json = String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap();
    assert!(json.contains("\"isWatching\":true"));
    assert!(json.contains("\"watchCount\":1"));
}

#[tokio::test]
async fn organization_container_contract_returns_guest_member_and_last_admin_cta_flags() {
    let (app, repository) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (member_csrf, member_cookie) = bootstrap(app.clone()).await;
    let member_id = register_user(app.clone(), &member_cookie, &member_csrf, "member").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    create_organization(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "web labs",
    )
    .await;

    let organization = repository
        .read_organization_by_name("weblabs")
        .await
        .expect("read organization")
        .expect("organization exists");
    repository
        .add_organization_membership(organization.id, member_id, "org_member")
        .await
        .expect("grant org member");

    let guest_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationContainer")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(guest_response.status(), StatusCode::OK);
    let guest_json = response_json(guest_response).await;
    assert!(guest_json.contains("\"viewerCanEnroll\":true"));
    assert!(!guest_json.contains("\"enrollmentRequested\":true"));
    assert!(!guest_json.contains("\"viewerCanLeave\":true"));

    let member_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationContainer")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &member_cookie)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(member_response.status(), StatusCode::OK);
    let member_json = response_json(member_response).await;
    assert!(member_json.contains("\"viewerCanLeave\":true"));
    assert!(!member_json.contains("\"viewerCanEnroll\":true"));

    let admin_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationContainer")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(admin_response.status(), StatusCode::OK);
    let admin_json = response_json(admin_response).await;
    assert!(admin_json.contains("\"viewerCanUpdate\":true"));
    assert!(!admin_json.contains("\"viewerCanLeave\":true"));
}

#[tokio::test]
async fn organization_admin_contract_requires_update_permission_and_exposes_member_directory() {
    let (app, repository) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (member_csrf, member_cookie) = bootstrap(app.clone()).await;
    let member_id = register_user(app.clone(), &member_cookie, &member_csrf, "member").await;

    let (outsider_csrf, outsider_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &outsider_cookie, &outsider_csrf, "outsider").await;

    create_organization(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "web labs",
    )
    .await;

    let organization = repository
        .read_organization_by_name("weblabs")
        .await
        .expect("read organization")
        .expect("organization exists");
    repository
        .add_organization_membership(organization.id, member_id, "org_member")
        .await
        .expect("grant org member");

    let forbidden_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationAdmin")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &outsider_cookie)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(forbidden_response.status(), StatusCode::FORBIDDEN);

    let admin_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationAdmin")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(admin_response.status(), StatusCode::OK);

    let admin_json = response_json(admin_response).await;
    assert!(admin_json.contains("\"organizationName\":\"weblabs\""));
    assert!(admin_json.contains("\"viewerCanUpdate\":true"));
    assert!(admin_json.contains("\"deleteAllowed\":true"));
    assert!(admin_json.contains("\"loginId\":\"member\""));
    assert!(admin_json.contains("\"roleOptions\":["));
}

#[tokio::test]
async fn organization_enrollment_mutations_toggle_guest_request_state() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    create_organization(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "web labs",
    )
    .await;

    let enroll_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/EnrollOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(enroll_response.status(), StatusCode::OK);
    let enroll_json = response_json(enroll_response).await;
    assert!(enroll_json.contains("\"viewerCanEnroll\":true"));
    assert!(enroll_json.contains("\"enrollmentRequested\":true"));

    let cancel_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/CancelEnrollOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(cancel_response.status(), StatusCode::OK);
    let cancel_json = response_json(cancel_response).await;
    assert!(cancel_json.contains("\"viewerCanEnroll\":true"));
    assert!(!cancel_json.contains("\"enrollmentRequested\":true"));
}

#[tokio::test]
async fn organization_admin_mutations_add_accept_promote_and_delete_members() {
    let (app, repository) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (member_csrf, member_cookie) = bootstrap(app.clone()).await;
    let member_id = register_user(app.clone(), &member_cookie, &member_csrf, "member").await;

    let (guest_csrf, guest_cookie) = bootstrap(app.clone()).await;
    let guest_id = register_user(app.clone(), &guest_cookie, &guest_csrf, "guest").await;

    create_organization(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "web labs",
    )
    .await;

    let add_member_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/AddOrganizationMember")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(
                    "{\"organizationName\":\"weblabs\",\"loginId\":\"member\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(add_member_response.status(), StatusCode::OK);
    let add_member_json = response_json(add_member_response).await;
    assert!(add_member_json.contains("\"loginId\":\"member\""));
    assert!(add_member_json.contains("\"role\":\"org_member\""));

    let enroll_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/EnrollOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &guest_cookie)
                .header("x-csrf-token", &guest_csrf)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(enroll_response.status(), StatusCode::OK);

    let admin_before_accept = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/ReadOrganizationAdmin")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(admin_before_accept.status(), StatusCode::OK);
    let admin_before_accept_json = response_json(admin_before_accept).await;
    assert!(admin_before_accept_json.contains("\"loginId\":\"guest\""));

    let accept_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/AcceptOrganizationEnrollment")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(format!(
                    "{{\"organizationName\":\"weblabs\",\"userId\":\"{guest_id}\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(accept_response.status(), StatusCode::OK);
    let accept_json = response_json(accept_response).await;
    assert!(accept_json.contains("\"loginId\":\"guest\""));
    assert!(accept_json.contains("\"role\":\"org_member\""));

    let promote_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/UpdateOrganizationMemberRole")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(format!(
                    "{{\"organizationName\":\"weblabs\",\"userId\":\"{member_id}\",\"role\":\"org_admin\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(promote_response.status(), StatusCode::OK);
    let promote_json = response_json(promote_response).await;
    assert!(promote_json.contains("\"loginId\":\"member\""));
    assert!(promote_json.contains("\"role\":\"org_admin\""));

    let delete_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/DeleteOrganizationMember")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from(format!(
                    "{{\"organizationName\":\"weblabs\",\"userId\":\"{member_id}\"}}"
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(delete_response.status(), StatusCode::OK);
    let delete_json = response_json(delete_response).await;
    assert!(!delete_json.contains("\"loginId\":\"member\""));

    let organization = repository
        .read_organization_by_name("weblabs")
        .await
        .expect("read organization")
        .expect("organization exists");
    let directory = repository
        .read_organization_members(&organization.organization_name)
        .await
        .expect("read members after delete");
    assert!(directory
        .members
        .iter()
        .any(|member| member.login_id == "guest"));
    assert!(!directory
        .members
        .iter()
        .any(|member| member.login_id == "member"));
}

#[tokio::test]
async fn organization_leave_mutation_redirects_members_and_blocks_last_admins() {
    let (app, repository) = build_app_with_repository().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    let (member_csrf, member_cookie) = bootstrap(app.clone()).await;
    let member_id = register_user(app.clone(), &member_cookie, &member_csrf, "member").await;

    create_organization(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "web labs",
    )
    .await;
    let organization = repository
        .read_organization_by_name("weblabs")
        .await
        .expect("read organization")
        .expect("organization exists");
    repository
        .add_organization_membership(organization.id, member_id, "org_member")
        .await
        .expect("grant org member");

    let member_leave = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/LeaveOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &member_cookie)
                .header("x-csrf-token", &member_csrf)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(member_leave.status(), StatusCode::OK);
    let member_leave_json = response_json(member_leave).await;
    assert!(member_leave_json.contains("\"ok\":true"));
    assert!(member_leave_json.contains("\"redirectPath\":\"/organizations/weblabs\""));

    let last_admin_leave = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/LeaveOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(last_admin_leave.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn organization_delete_mutation_redirects_root_and_blocks_orgs_with_projects() {
    let app = build_app().await;

    let (admin_csrf, admin_cookie) = bootstrap(app.clone()).await;
    register_user(app.clone(), &admin_cookie, &admin_csrf, "admin").await;

    create_organization(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "web labs",
    )
    .await;
    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "weblabs",
        "projectYobi",
        "Wave 2B delete guard",
        "public",
    )
    .await;

    let blocked_delete = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/DeleteOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from("{\"organizationName\":\"weblabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(blocked_delete.status(), StatusCode::BAD_REQUEST);

    create_organization(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "emptylabs",
        "empty labs",
    )
    .await;
    let success_delete = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/_pilot/DeleteOrganization")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &admin_cookie)
                .header("x-csrf-token", &admin_csrf)
                .body(Body::from("{\"organizationName\":\"emptylabs\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(success_delete.status(), StatusCode::OK);
    let success_delete_json = response_json(success_delete).await;
    assert!(success_delete_json.contains("\"ok\":true"));
    assert!(success_delete_json.contains("\"redirectPath\":\"/\""));
}
