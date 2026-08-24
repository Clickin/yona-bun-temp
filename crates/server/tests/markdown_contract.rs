use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::{json, Value};
use std::path::Path;
use tempfile::tempdir;
use tower::ServiceExt;
use yoram_migration::Migrator;
use yoram_persistence::{AppRepository, CreateOrganizationInput, CreateUserInput};
use yoram_server::{
    create_router_with_app_repository, create_router_with_repository_and_app_config,
    AppRuntimeConfig, RuntimeConfig,
};

async fn build_app_with_repository() -> axum::Router {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    create_router_with_app_repository(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        AppRepository::new(db),
    )
}

async fn build_reference_app(data_root: &Path) -> (axum::Router, AppRepository) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let repository = AppRepository::new(db);
    let app = create_router_with_repository_and_app_config(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/tenant/yona".to_string(),
            public_origin: String::new(),
        },
        repository.clone(),
        AppRuntimeConfig {
            data_root: data_root.to_path_buf(),
            ..AppRuntimeConfig::default()
        },
    );
    (app, repository)
}

async fn response_text(response: axum::response::Response) -> String {
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

async fn rpc(
    app: axum::Router,
    method_name: &str,
    cookie_header: &str,
    csrf: &str,
    payload: Value,
) -> axum::response::Response {
    app.oneshot(
        Request::builder()
            .method(Method::POST)
            .uri(format!("/yona/api/v1/_pilot/{method_name}"))
            .header(http::header::COOKIE, cookie_header)
            .header("x-csrf-token", csrf)
            .header(http::header::CONTENT_TYPE, "application/json")
            .body(Body::from(payload.to_string()))
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn bootstrap_at(app: axum::Router, base_path: &str) -> (String, String) {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("{base_path}/api/auth/session"))
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

async fn rpc_at(
    app: axum::Router,
    base_path: &str,
    method_name: &str,
    cookie_header: &str,
    csrf: &str,
    payload: Value,
) -> Response<Body> {
    app.oneshot(
        Request::builder()
            .method(Method::POST)
            .uri(format!("{base_path}/api/v1/_pilot/{method_name}"))
            .header(http::header::COOKIE, cookie_header)
            .header("x-csrf-token", csrf)
            .header(http::header::CONTENT_TYPE, "application/json")
            .body(Body::from(payload.to_string()))
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn register_user_at(app: axum::Router, base_path: &str, login_id: &str) -> (String, String) {
    let (csrf, cookie_header) = bootstrap_at(app.clone(), base_path).await;
    let response = rpc_at(
        app,
        base_path,
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
    assert_eq!(response.status(), StatusCode::OK);
    (csrf, cookie_header)
}

async fn create_project_at(
    app: axum::Router,
    base_path: &str,
    cookie_header: &str,
    csrf: &str,
    owner_name: &str,
    project_name: &str,
    project_scope: &str,
) {
    let response = rpc_at(
        app,
        base_path,
        "CreateProject",
        cookie_header,
        csrf,
        json!({
            "ownerName": owner_name,
            "projectName": project_name,
            "overview": "markdown reference parity",
            "projectScope": project_scope
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

async fn create_issue_at(
    app: axum::Router,
    base_path: &str,
    cookie_header: &str,
    csrf: &str,
    owner_name: &str,
    project_name: &str,
    title: &str,
) {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "{base_path}/api/v1/projects/{owner_name}/{project_name}/issues"
                ))
                .header(http::header::COOKIE, cookie_header)
                .header("x-csrf-token", csrf)
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({
                        "title": title,
                        "bodyMarkdown": title
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

async fn markdown_references(
    app: axum::Router,
    base_path: &str,
    cookie_header: &str,
    owner_name: &str,
    project_name: &str,
    body_markdown: &str,
) -> Response<Body> {
    app.oneshot(
        Request::builder()
            .method(Method::POST)
            .uri(format!(
                "{base_path}/api/v1/owners/{owner_name}/projects/{project_name}/markdown-references"
            ))
            .header(http::header::COOKIE, cookie_header)
            .header(http::header::CONTENT_TYPE, "application/json")
            .body(Body::from(
                json!({ "bodyMarkdown": body_markdown }).to_string(),
            ))
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn ok_payload(response: Response<Body>) -> Value {
    let status = response.status();
    let text = response_text(response).await;
    assert_eq!(status, StatusCode::OK, "{text}");
    serde_json::from_str(&text).expect("json response")
}

async fn project_commit(
    repository: &AppRepository,
    data_root: &Path,
    owner_name: &str,
    project_name: &str,
) -> String {
    let project = repository
        .read_project_by_owner_and_name(owner_name, project_name)
        .await
        .unwrap()
        .expect("project");
    yoram_vcs::commit_text_file(
        &(yoram_vcs::repository_path(data_root, &project.owner_name, &project.project_name)
            .expect("repository path")),
        None,
        "README.md",
        &format!("{owner_name}/{project_name}\n"),
        "Initial markdown reference commit",
        owner_name,
        &format!("{owner_name}@example.com"),
    )
    .expect("commit file")
    .expect("commit id")
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
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
    assert_eq!(response.status(), StatusCode::OK);
    (csrf, cookie_header)
}

async fn create_project(app: axum::Router, cookie_header: &str, csrf: &str) {
    let response = rpc(
        app,
        "CreateProject",
        cookie_header,
        csrf,
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "overview": "markdown parity",
            "projectScope": "public"
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

async fn create_issue(app: axum::Router, cookie_header: &str, csrf: &str, title: &str) {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/projects/owner/projectYobi/issues")
                .header(http::header::COOKIE, cookie_header)
                .header("x-csrf-token", csrf)
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({
                        "title": title,
                        "bodyMarkdown": "target issue"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn legacy_markdown_preview_route_is_not_replicated() {
    // Preview rendering is owned by the React client; the legacy POST /markdown
    // server-render endpoint is intentionally absent (product decision 2026-08-24).
    let app = build_app_with_repository().await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/markdown/owner/projectYobi")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({ "body": "hello", "breaks": true }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn markdown_reference_metadata_resolves_legacy_tokens_under_nested_base_path() {
    const BASE_PATH: &str = "/tenant/yona";
    let data_dir = tempdir().expect("markdown reference data root");
    let (app, repository) = build_reference_app(data_dir.path()).await;
    let (owner_csrf, owner_cookie) = register_user_at(app.clone(), BASE_PATH, "owner").await;
    let (other_csrf, other_cookie) = register_user_at(app.clone(), BASE_PATH, "other").await;
    let _ = register_user_at(app.clone(), BASE_PATH, "mentioner").await;
    let _ = register_user_at(app.clone(), BASE_PATH, "koreanmention").await;

    for (cookie, csrf, owner_name, project_name) in [
        (&owner_cookie, &owner_csrf, "owner", "main"),
        (&other_cookie, &other_csrf, "other", "main"),
        (&other_cookie, &other_csrf, "other", "cross"),
    ] {
        create_project_at(
            app.clone(),
            BASE_PATH,
            cookie,
            csrf,
            owner_name,
            project_name,
            "public",
        )
        .await;
        create_issue_at(
            app.clone(),
            BASE_PATH,
            cookie,
            csrf,
            owner_name,
            project_name,
            &format!("{owner_name}/{project_name} issue"),
        )
        .await;
    }
    repository
        .create_organization(CreateOrganizationInput {
            description: Some("Markdown team".to_string()),
            organization_name: "team".to_string(),
        })
        .await
        .unwrap();

    let local_commit = project_commit(&repository, data_dir.path(), "owner", "main").await;
    let owner_commit = project_commit(&repository, data_dir.path(), "other", "main").await;
    let cross_commit = project_commit(&repository, data_dir.path(), "other", "cross").await;
    let local_short = &local_commit[..7];
    let body = format!(
        "#1 other#1 other/cross#1 missing/project#9 \
         {local_short} {local_short} @{local_commit} other@{owner_commit} other/cross@{cross_commit} @deadbeef \
         @mentioner 한@koreanmention @team @other/cross @missing \
         A#1B Aother/cross#1B A{local_commit}B x@mentioner"
    );
    let payload = ok_payload(
        markdown_references(app, BASE_PATH, &owner_cookie, "owner", "main", &body).await,
    )
    .await;
    assert!(payload.get("html").is_none());
    assert!(payload.get("bodyHtml").is_none());

    let issues = payload["issueReferences"].as_array().unwrap();
    assert_eq!(issues.len(), 3);
    for (token, owner_name, project_name, title) in [
        ("#1", "owner", "main", "owner/main issue"),
        ("other#1", "other", "main", "other/main issue"),
        ("other/cross#1", "other", "cross", "other/cross issue"),
    ] {
        let item = issues
            .iter()
            .find(|item| item["token"] == token)
            .expect("issue reference");
        assert_eq!(item["ownerName"], owner_name);
        assert_eq!(item["projectName"], project_name);
        assert_eq!(item["issueNumber"], 1);
        assert_eq!(item["title"], title);
        assert_eq!(item["state"], "open");
    }

    let commits = payload["commitReferences"].as_array().unwrap();
    assert_eq!(commits.len(), 4);
    assert_eq!(
        commits
            .iter()
            .filter(|item| item["token"] == local_short)
            .count(),
        1
    );
    for (token, owner_name, project_name, commit_id) in [
        (
            local_short.to_string(),
            "owner",
            "main",
            local_commit.as_str(),
        ),
        (
            format!("@{local_commit}"),
            "owner",
            "main",
            local_commit.as_str(),
        ),
        (
            format!("other@{owner_commit}"),
            "other",
            "main",
            owner_commit.as_str(),
        ),
        (
            format!("other/cross@{cross_commit}"),
            "other",
            "cross",
            cross_commit.as_str(),
        ),
    ] {
        let item = commits
            .iter()
            .find(|item| item["token"] == token)
            .expect("commit reference");
        assert_eq!(item["ownerName"], owner_name);
        assert_eq!(item["projectName"], project_name);
        assert_eq!(item["commitId"], commit_id);
        let short_id = item["shortId"].as_str().expect("short commit id");
        assert!(commit_id.starts_with(short_id));
        assert!(short_id.len() >= 7);
    }

    let mentions = payload["mentionReferences"].as_array().unwrap();
    assert_eq!(mentions.len(), 4);
    let user = mentions
        .iter()
        .find(|item| item["token"] == "@mentioner")
        .expect("user mention");
    assert_eq!(user["kind"], "user");
    assert_eq!(user["loginId"], "mentioner");
    assert_eq!(user["label"], "mentioner");
    let korean_boundary_user = mentions
        .iter()
        .find(|item| item["token"] == "@koreanmention")
        .expect("mention after a non-ASCII Java word boundary");
    assert_eq!(korean_boundary_user["kind"], "user");
    assert_eq!(korean_boundary_user["loginId"], "koreanmention");
    let organization = mentions
        .iter()
        .find(|item| item["token"] == "@team")
        .expect("organization mention");
    assert_eq!(organization["kind"], "organization");
    assert_eq!(organization["loginId"], "team");
    assert_eq!(organization["label"], "team");
    let project = mentions
        .iter()
        .find(|item| item["token"] == "@other/cross")
        .expect("project mention");
    assert_eq!(project["kind"], "project");
    assert_eq!(project["loginId"], "other/cross");
    assert_eq!(project["ownerName"], "other");
    assert_eq!(project["projectName"], "cross");
    assert_eq!(project["label"], "other/cross");
}

#[tokio::test]
async fn markdown_reference_metadata_bounds_resolution_work_and_request_size() {
    const BASE_PATH: &str = "/tenant/yona";
    const CANDIDATE_LIMIT: usize = 32;
    const BODY_MAX_BYTES: usize = yoram_vcs::MAX_ISSUE_TEMPLATE_BYTES - 64 * 1024;
    let data_dir = tempdir().expect("bounded markdown metadata data root");
    let (app, repository) = build_reference_app(data_dir.path()).await;
    let (owner_csrf, owner_cookie) = register_user_at(app.clone(), BASE_PATH, "owner").await;
    create_project_at(
        app.clone(),
        BASE_PATH,
        &owner_cookie,
        &owner_csrf,
        "owner",
        "main",
        "public",
    )
    .await;

    for number in 1..=34 {
        create_issue_at(
            app.clone(),
            BASE_PATH,
            &owner_cookie,
            &owner_csrf,
            "owner",
            "main",
            &format!("Bounded issue {number}"),
        )
        .await;
        repository
            .create_user(CreateUserInput {
                display_name: format!("Bounded user {number}"),
                email_address: format!("bounded{number}@example.com"),
                is_confirmed: true,
                is_site_admin: false,
                login_id: format!("bounded{number}"),
                password_hash: String::new(),
            })
            .await
            .expect("bounded mention user");
    }

    let mut issue_tokens = vec![
        "#1".to_string(),
        "#1".to_string(),
        "owner/main#1".to_string(),
    ];
    issue_tokens.extend((2..=34).map(|number| format!("#{number}")));
    let mut mention_tokens = vec![
        "@bounded1".to_string(),
        "@bounded1".to_string(),
        "@BOUNDED1".to_string(),
    ];
    mention_tokens.extend((2..=34).map(|number| format!("@bounded{number}")));
    let body = format!("{} {}", issue_tokens.join(" "), mention_tokens.join(" "));
    let payload = ok_payload(
        markdown_references(
            app.clone(),
            BASE_PATH,
            &owner_cookie,
            "owner",
            "main",
            &body,
        )
        .await,
    )
    .await;

    let issues = payload["issueReferences"].as_array().unwrap();
    assert_eq!(issues.len(), CANDIDATE_LIMIT);
    assert_eq!(
        issues.iter().filter(|item| item["token"] == "#1").count(),
        1
    );
    assert!(issues.iter().any(|item| item["token"] == "owner/main#1"));
    assert!(issues.iter().any(|item| item["token"] == "#31"));
    assert!(issues.iter().all(|item| item["token"] != "#32"));

    let mentions = payload["mentionReferences"].as_array().unwrap();
    assert_eq!(mentions.len(), CANDIDATE_LIMIT);
    assert_eq!(
        mentions
            .iter()
            .filter(|item| item["token"] == "@bounded1")
            .count(),
        1
    );
    assert!(mentions.iter().any(|item| item["token"] == "@BOUNDED1"));
    assert!(mentions.iter().any(|item| item["token"] == "@bounded31"));
    assert!(mentions.iter().all(|item| item["token"] != "@bounded32"));

    let supported_large_body = "x".repeat(1_200_000);
    let supported_large = markdown_references(
        app.clone(),
        BASE_PATH,
        &owner_cookie,
        "owner",
        "main",
        &supported_large_body,
    )
    .await;
    assert_eq!(supported_large.status(), StatusCode::OK);

    let oversized = "x".repeat(BODY_MAX_BYTES + 1);
    let response =
        markdown_references(app, BASE_PATH, &owner_cookie, "owner", "main", &oversized).await;
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    let error: Value = serde_json::from_str(&response_text(response).await).unwrap();
    assert_eq!(error["error"]["code"], "payload_too_large");
    assert_eq!(error["error"]["status"], 413);
}

#[tokio::test]
async fn markdown_commit_reference_work_is_bounded_before_resolution() {
    const BASE_PATH: &str = "/tenant/yona";
    let data_dir = tempdir().expect("bounded markdown reference data root");
    let (app, repository) = build_reference_app(data_dir.path()).await;
    let (owner_csrf, owner_cookie) = register_user_at(app.clone(), BASE_PATH, "owner").await;
    create_project_at(
        app.clone(),
        BASE_PATH,
        &owner_cookie,
        &owner_csrf,
        "owner",
        "main",
        "public",
    )
    .await;
    let commit_id = project_commit(&repository, data_dir.path(), "owner", "main").await;
    let candidates = (7..=40)
        .map(|length| commit_id[..length].to_string())
        .collect::<Vec<_>>();
    let body = format!(
        "{} {} {}",
        candidates[0],
        candidates[0],
        candidates.join(" ")
    );

    let payload = ok_payload(
        markdown_references(app, BASE_PATH, &owner_cookie, "owner", "main", &body).await,
    )
    .await;
    let commits = payload["commitReferences"].as_array().unwrap();
    assert_eq!(commits.len(), 32);
    assert_eq!(
        commits
            .iter()
            .filter(|item| item["token"] == candidates[0])
            .count(),
        1
    );
    for candidate in candidates.iter().take(32) {
        let reference = commits
            .iter()
            .find(|item| item["token"] == candidate.as_str())
            .expect("bounded commit reference");
        assert_eq!(reference["commitId"], commit_id);
        assert_eq!(reference["shortId"], commit_id[..7]);
    }
    for candidate in candidates.iter().skip(32) {
        assert!(commits
            .iter()
            .all(|item| item["token"] != candidate.as_str()));
    }
}

#[tokio::test]
async fn markdown_reference_metadata_enforces_source_and_target_read_acl() {
    const BASE_PATH: &str = "/tenant/yona";
    let data_dir = tempdir().expect("markdown reference ACL data root");
    let (app, repository) = build_reference_app(data_dir.path()).await;
    let (owner_csrf, owner_cookie) = register_user_at(app.clone(), BASE_PATH, "owner").await;
    let (_, outsider_cookie) = register_user_at(app.clone(), BASE_PATH, "outsider").await;
    for (project_name, project_scope) in [("main", "public"), ("secret", "private")] {
        create_project_at(
            app.clone(),
            BASE_PATH,
            &owner_cookie,
            &owner_csrf,
            "owner",
            project_name,
            project_scope,
        )
        .await;
        create_issue_at(
            app.clone(),
            BASE_PATH,
            &owner_cookie,
            &owner_csrf,
            "owner",
            project_name,
            &format!("{project_name} issue"),
        )
        .await;
    }
    let secret_commit = project_commit(&repository, data_dir.path(), "owner", "secret").await;

    let filtered = ok_payload(
        markdown_references(
            app.clone(),
            BASE_PATH,
            &outsider_cookie,
            "owner",
            "main",
            &format!("owner/secret#1 owner/secret@{secret_commit} @owner/secret"),
        )
        .await,
    )
    .await;
    assert!(filtered["issueReferences"].as_array().unwrap().is_empty());
    assert!(filtered["commitReferences"].as_array().unwrap().is_empty());
    assert!(filtered["mentionReferences"].as_array().unwrap().is_empty());

    let denied =
        markdown_references(app, BASE_PATH, &outsider_cookie, "owner", "secret", "#1").await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
}
