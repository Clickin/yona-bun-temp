use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::entity::prelude::{DateTime, DateTimeUtc};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, Database, DatabaseConnection, NotSet, Set, Statement,
};
use serde_json::{json, Value};
use std::path::Path;
use std::time::{Duration, SystemTime};
use tempfile::tempdir;
use tower::ServiceExt;
use yona_rust_persistence::{
    comment_thread, pull_request, review_comment, AppRepository, CreateIssueCommentInput,
    CreateIssueInput, CreatePostingCommentInput, CreatePostingInput, IssueMutationInput,
    MilestoneMutationInput, PostingMutationInput,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{
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

async fn build_app_with_repository_in_data_root(
    data_root: &Path,
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
        AppRuntimeConfig {
            data_root: data_root.to_path_buf(),
            ..AppRuntimeConfig::default()
        },
    );

    (app, app_repo, db)
}

fn days_ago_datetime(days: u64) -> DateTime {
    DateTimeUtc::from(SystemTime::now() - Duration::from_secs(days * 24 * 60 * 60)).naive_utc()
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
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Value,
) -> Response<Body> {
    rest_test_support::pilot_rest(app, method_name, cookie_header, csrf, payload).await
}

async fn rest_get(app: axum::Router, uri: &str, cookie_header: Option<&str>) -> Response<Body> {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String, i64) {
    register_user_with_name(app, login_id, login_id).await
}

async fn register_user_with_name(
    app: axum::Router,
    login_id: &str,
    name: &str,
) -> (String, String, i64) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = rpc(
        app,
        "RegisterWithPassword",
        Some(&cookie_header),
        Some(&csrf),
        json!({
            "loginId": login_id,
            "name": name,
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

async fn create_named_project(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    project_name: &str,
    scope: &str,
) {
    response_json(
        rpc(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": project_name,
                "overview": "Needle project overview",
                "projectScope": scope
            }),
        )
        .await,
    )
    .await;
}

async fn create_named_owner_project(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    owner_name: &str,
    project_name: &str,
    scope: &str,
) {
    response_json(
        rpc(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": owner_name,
                "projectName": project_name,
                "overview": "Needle project overview",
                "projectScope": scope
            }),
        )
        .await,
    )
    .await;
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str, scope: &str) {
    create_named_project(app, cookie, csrf, "projectYobi", scope).await;
}

async fn write_text_column(
    db: &DatabaseConnection,
    table: &str,
    column: &str,
    id: i64,
    value: &str,
) {
    let backend = db.get_database_backend();
    db.execute(Statement::from_sql_and_values(
        backend,
        format!("UPDATE {table} SET {column} = ? WHERE id = ?"),
        vec![value.to_string().into(), id.into()],
    ))
    .await
    .expect("write text column");
}

async fn seed_review_comment(
    db: &DatabaseConnection,
    repo: &AppRepository,
    project_owner_id: i64,
    reviewer_id: i64,
) {
    seed_project_review_comment(
        db,
        repo,
        ReviewCommentSeed {
            owner_name: "owner",
            project_name: "projectYobi",
            pull_request_title: "Needle review pull request",
            comment_contents: "Needle review comment",
            number: 7,
        },
        project_owner_id,
        reviewer_id,
    )
    .await;
}

struct ReviewCommentSeed<'a> {
    owner_name: &'a str,
    project_name: &'a str,
    pull_request_title: &'a str,
    comment_contents: &'a str,
    number: i64,
}

async fn seed_project_review_comment(
    db: &DatabaseConnection,
    repo: &AppRepository,
    seed: ReviewCommentSeed<'_>,
    project_owner_id: i64,
    reviewer_id: i64,
) {
    let project = repo
        .read_project_by_owner_and_name(seed.owner_name, seed.project_name)
        .await
        .unwrap()
        .expect("project");
    let pull_request = pull_request::ActiveModel {
        id: NotSet,
        title: Set(Some(seed.pull_request_title.to_string())),
        to_project_id: Set(Some(project.id)),
        from_project_id: Set(Some(project.id)),
        to_branch: Set(Some("main".to_string())),
        from_branch: Set(Some("topic/search".to_string())),
        contributor_id: Set(Some(project_owner_id)),
        receiver_id: Set(Some(project_owner_id)),
        created: Set(Some(days_ago_datetime(1))),
        updated: Set(Some(days_ago_datetime(1))),
        received: Set(None),
        state: Set(Some(0)),
        is_conflict: Set(Some(0)),
        is_merging: Set(Some(0)),
        last_commit_id: Set(Some("abcdef123456".to_string())),
        merged_commit_id_from: Set(None),
        merged_commit_id_to: Set(None),
        number: Set(Some(seed.number)),
    }
    .insert(db)
    .await
    .unwrap();
    write_text_column(
        db,
        "pull_request",
        "body",
        pull_request.id,
        seed.pull_request_title,
    )
    .await;
    let thread = comment_thread::ActiveModel {
        dtype: Set("ReviewThread".to_string()),
        id: NotSet,
        author_id: Set(Some(project_owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        state: Set(Some("open".to_string())),
        created_date: Set(Some(days_ago_datetime(1))),
        pull_request_id: Set(Some(pull_request.id)),
        project_id: Set(Some(project.id)),
        prev_commit_id: Set(Some("base".to_string())),
        commit_id: Set(Some("abcdef123456".to_string())),
        path: Set(Some("src/lib.rs".to_string())),
        start_side: Set(None),
        start_line: Set(Some(1)),
        start_column: Set(None),
        end_side: Set(None),
        end_line: Set(Some(2)),
        end_column: Set(None),
    }
    .insert(db)
    .await
    .unwrap();
    let comment = review_comment::ActiveModel {
        id: NotSet,
        created_date: Set(Some(days_ago_datetime(1))),
        author_id: Set(Some(reviewer_id)),
        author_login_id: Set(Some("reviewer".to_string())),
        author_name: Set(Some("reviewer".to_string())),
        thread_id: Set(Some(thread.id)),
    }
    .insert(db)
    .await
    .unwrap();
    write_text_column(
        db,
        "review_comment",
        "contents",
        comment.id,
        seed.comment_contents,
    )
    .await;
}

async fn seed_search_rows(
    app: axum::Router,
    repo: &AppRepository,
    db: &DatabaseConnection,
) -> (String, i64) {
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, _, reviewer_id) = register_user(app.clone(), "reviewer").await;
    let _ = register_user(app.clone(), "needle-user").await;
    create_project(app, &owner_cookie, &owner_csrf, "public").await;

    let issue = repo
        .create_issue(CreateIssueInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: "projectYobi".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: Vec::new(),
                body_markdown: "Needle issue body".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
                title: "Needle issue title".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("issue");
    repo.create_issue_comment(CreateIssueCommentInput {
        actor_display_name: "owner".to_string(),
        actor_id: owner_id,
        actor_login_id: "owner".to_string(),
        attachment_ids: Vec::new(),
        contents_markdown: "Needle issue comment".to_string(),
        issue_number: issue.issue_number,
        owner_name: "owner".to_string(),
        parent_comment_id: None,
        project_name: "projectYobi".to_string(),
    })
    .await
    .unwrap()
    .expect("issue comment");
    let post = repo
        .create_posting(CreatePostingInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: "projectYobi".to_string(),
            values: PostingMutationInput {
                attachment_ids: Vec::new(),
                body_markdown: "Needle post body".to_string(),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: "Needle post title".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("post");
    repo.create_posting_comment(CreatePostingCommentInput {
        actor_display_name: "owner".to_string(),
        actor_id: owner_id,
        actor_login_id: "owner".to_string(),
        attachment_actor_id: None,
        attachment_ids: Vec::new(),
        contents_markdown: "Needle post comment".to_string(),
        created_at: None,
        owner_name: "owner".to_string(),
        parent_comment_id: None,
        post_number: post.post_number,
        project_name: "projectYobi".to_string(),
    })
    .await
    .unwrap()
    .expect("post comment");
    repo.create_project_milestone(MilestoneMutationInput {
        actor_id: Some(owner_id),
        attachment_ids: Vec::new(),
        contents_markdown: "Needle milestone body".to_string(),
        due_date: Some(days_ago_datetime(3)),
        owner_name: "owner".to_string(),
        project_name: "projectYobi".to_string(),
        state: "open".to_string(),
        title: "Needle milestone".to_string(),
    })
    .await
    .unwrap()
    .expect("milestone");
    seed_review_comment(db, repo, owner_id, reviewer_id).await;

    (owner_cookie, owner_id)
}

#[tokio::test]
async fn global_search_returns_legacy_counts_auto_issue_and_snippet_metadata() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, db) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_cookie, _) = seed_search_rows(app.clone(), &repo, &db).await;

    let payload = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=Needle&searchType=auto&pageNum=1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;

    assert_eq!(payload["scope"], "global");
    assert_eq!(payload["keyword"], "Needle");
    assert_eq!(payload["requestedSearchType"], "auto");
    assert_eq!(payload["searchType"], "issue");
    assert_eq!(payload["pageNum"], 1);
    assert_eq!(payload["pageSize"], 20);
    assert!(!payload["items"].as_array().unwrap().is_empty());
    for key in [
        "issues",
        "users",
        "projects",
        "posts",
        "milestones",
        "issueComments",
        "postComments",
        "reviews",
    ] {
        assert!(payload["counts"][key].as_u64().unwrap() > 0, "{key}");
    }
    assert_eq!(payload["items"][0]["type"], "issue");
    assert_eq!(payload["items"][0]["href"], "/owner/projectYobi/issue/1");
    assert!(payload["items"][0]["snippets"].as_array().is_some());
    assert_eq!(
        payload["items"][0]["snippets"][0]["highlights"][0]["start"],
        0
    );
    assert_eq!(payload["items"][0]["snippets"][0]["truncated"], false);
}

#[tokio::test]
async fn global_project_search_matches_legacy_anonymous_public_private_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, _, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "publicProjectAclNeedle",
        "public",
    )
    .await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "privateProjectAclNeedle",
        "private",
    )
    .await;

    let anonymous = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=ProjectAclNeedle&searchType=project&pageNum=1",
            None,
        )
        .await,
    )
    .await;

    let project_names = anonymous["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["projectName"].as_str().unwrap())
        .collect::<Vec<_>>();

    assert_eq!(anonymous["scope"], "global");
    assert_eq!(anonymous["requestedSearchType"], "project");
    assert_eq!(anonymous["searchType"], "project");
    assert_eq!(anonymous["counts"]["projects"], 1);
    assert_eq!(anonymous["totalCount"], 1);
    assert_eq!(project_names, vec!["publicProjectAclNeedle"]);
    assert_eq!(anonymous["items"][0]["type"], "project");
    assert_eq!(
        anonymous["items"][0]["href"],
        "/owner/publicProjectAclNeedle"
    );
    assert_eq!(anonymous["items"][0]["state"], "public");
}

#[tokio::test]
async fn user_search_matches_legacy_login_id_and_name_lookup() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, _, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    register_user_with_name(app.clone(), "doortts", "suwon").await;

    let by_login_id = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/search?keyword=door&searchType=user&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(by_login_id["counts"]["users"], 1);
    assert_eq!(by_login_id["items"][0]["type"], "user");
    assert_eq!(by_login_id["items"][0]["title"], "suwon");
    assert_eq!(by_login_id["items"][0]["href"], "/users/doortts");

    let by_name = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=suwon&searchType=user&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(by_name["counts"]["users"], 1);
    assert_eq!(by_name["items"][0]["type"], "user");
    assert_eq!(by_name["items"][0]["title"], "suwon");
    assert_eq!(by_name["items"][0]["href"], "/users/doortts");
}

#[tokio::test]
async fn issue_search_ranks_title_matches_before_newer_body_only_matches() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, db) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_cookie, owner_id) = seed_search_rows(app.clone(), &repo, &db).await;

    repo.create_issue(CreateIssueInput {
        actor_display_name: "owner".to_string(),
        actor_id: owner_id,
        actor_login_id: "owner".to_string(),
        owner_name: "owner".to_string(),
        project_name: "projectYobi".to_string(),
        values: IssueMutationInput {
            assignee_login_id: None,
            attachment_ids: Vec::new(),
            body_markdown: "Needle appears only in this newer body".to_string(),
            due_date: None,
            is_draft: false,
            is_publish: false,
            label_ids: Vec::new(),
            milestone_id: None,
            parent_issue_id: None,
            title: "Recent unrelated issue".to_string(),
        },
    })
    .await
    .unwrap()
    .expect("newer body-only issue");

    let payload = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=Needle&searchType=issue&pageNum=1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;

    assert_eq!(payload["items"][0]["title"], "Needle issue title");
    assert_eq!(payload["items"][1]["title"], "Recent unrelated issue");
}

#[tokio::test]
async fn issue_search_visibility_matches_legacy_public_and_private_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "publicIssues",
        "public",
    )
    .await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "privateIssues",
        "private",
    )
    .await;

    for (project_name, title) in [
        ("publicIssues", "IssueNeedle public issue"),
        ("privateIssues", "IssueNeedle private issue"),
    ] {
        repo.create_issue(CreateIssueInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: project_name.to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: Vec::new(),
                body_markdown: format!("IssueNeedle body for {project_name}"),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
                title: title.to_string(),
            },
        })
        .await
        .unwrap()
        .expect("issue");
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/search?keyword=IssueNeedle&searchType=issue&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["counts"]["issues"], 1);
    assert_eq!(anonymous["items"][0]["projectName"], "publicIssues");
    assert_eq!(anonymous["items"][0]["title"], "IssueNeedle public issue");

    let owner = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=IssueNeedle&searchType=issue&pageNum=1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(owner["counts"]["issues"], 2);
    let titles = owner["items"]
        .as_array()
        .expect("owner issue search items")
        .iter()
        .map(|item| item["title"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(titles.contains(&"IssueNeedle public issue"));
    assert!(titles.contains(&"IssueNeedle private issue"));
}

#[tokio::test]
async fn issue_search_protected_visibility_matches_legacy_org_membership_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "issue-org-member").await;
    let (_, outsider_cookie, _) = register_user(app.clone(), "issue-outsider").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "issue-labs",
                "description": "Issue labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("issue-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (project_name, scope, title) in [
        (
            "publicProtectedIssues",
            "public",
            "IssueProtectedNeedle public issue",
        ),
        (
            "protectedIssues",
            "protected",
            "IssueProtectedNeedle protected issue",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            "issue-labs",
            project_name,
            scope,
        )
        .await;
        repo.create_issue(CreateIssueInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "issue-labs".to_string(),
            project_name: project_name.to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: Vec::new(),
                body_markdown: format!("IssueProtectedNeedle body for {project_name}"),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
                title: title.to_string(),
            },
        })
        .await
        .unwrap()
        .expect("issue");
    }

    for cookie in [None, Some(outsider_cookie.as_str())] {
        let payload = response_json(
            rest_get(
                app.clone(),
                "/yona/api/v1/search?keyword=IssueProtectedNeedle&searchType=issue&pageNum=1",
                cookie,
            )
            .await,
        )
        .await;
        assert_eq!(payload["counts"]["issues"], 1);
        assert_eq!(payload["items"][0]["projectName"], "publicProtectedIssues");
        assert_eq!(
            payload["items"][0]["title"],
            "IssueProtectedNeedle public issue"
        );
    }

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=IssueProtectedNeedle&searchType=issue&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["issues"], 2);
    let titles = org_member["items"]
        .as_array()
        .expect("org member issue search items")
        .iter()
        .map(|item| item["title"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(titles.contains(&"IssueProtectedNeedle public issue"));
    assert!(titles.contains(&"IssueProtectedNeedle protected issue"));
}

#[tokio::test]
async fn project_issue_search_matches_legacy_project_scope_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "project-issue-org-member").await;
    let (_, private_member_cookie, private_member_id) =
        register_user(app.clone(), "project-issue-private-member").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "project-issue-labs",
                "description": "Project issue labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("project-issue-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, title) in [
        (
            "project-issue-labs",
            "projectIssueScopePublic",
            "public",
            "ProjectIssueScopeNeedle public issue",
        ),
        (
            "project-issue-labs",
            "projectIssueScopeProtected",
            "protected",
            "ProjectIssueScopeNeedle protected issue",
        ),
        (
            "owner",
            "projectIssueScopePrivate",
            "private",
            "ProjectIssueScopeNeedle private issue",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        repo.create_issue(CreateIssueInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: owner_name.to_string(),
            project_name: project_name.to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: Vec::new(),
                body_markdown: format!("ProjectIssueScopeNeedle body for {project_name}"),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
                title: title.to_string(),
            },
        })
        .await
        .unwrap()
        .expect("issue");
    }

    let private_project = repo
        .read_project_by_owner_and_name("owner", "projectIssueScopePrivate")
        .await
        .unwrap()
        .expect("private project");
    repo.add_project_membership(private_project.id, private_member_id, "member")
        .await
        .unwrap();

    let public = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-issue-labs/projectIssueScopePublic/search?keyword=ProjectIssueScopeNeedle&searchType=issue&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(public["scope"], "project");
    assert_eq!(public["counts"]["issues"], 1);
    assert_eq!(public["items"][0]["projectName"], "projectIssueScopePublic");
    assert_eq!(
        public["items"][0]["title"],
        "ProjectIssueScopeNeedle public issue"
    );

    let protected = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-issue-labs/projectIssueScopeProtected/search?keyword=ProjectIssueScopeNeedle&searchType=issue&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(protected["counts"]["issues"], 1);
    assert_eq!(
        protected["items"][0]["projectName"],
        "projectIssueScopeProtected"
    );
    assert_eq!(
        protected["items"][0]["title"],
        "ProjectIssueScopeNeedle protected issue"
    );

    let private = response_json(
        rest_get(
            app,
            "/yona/api/v1/projects/owner/projectIssueScopePrivate/search?keyword=ProjectIssueScopeNeedle&searchType=issue&pageNum=1",
            Some(&private_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(private["counts"]["issues"], 1);
    assert_eq!(
        private["items"][0]["projectName"],
        "projectIssueScopePrivate"
    );
    assert_eq!(
        private["items"][0]["title"],
        "ProjectIssueScopeNeedle private issue"
    );
}

#[tokio::test]
async fn post_search_ranks_title_matches_before_newer_body_only_matches() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, db) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_cookie, owner_id) = seed_search_rows(app.clone(), &repo, &db).await;

    repo.create_posting(CreatePostingInput {
        actor_display_name: "owner".to_string(),
        actor_id: owner_id,
        actor_login_id: "owner".to_string(),
        owner_name: "owner".to_string(),
        project_name: "projectYobi".to_string(),
        values: PostingMutationInput {
            attachment_ids: Vec::new(),
            body_markdown: "Needle appears only in this newer post body".to_string(),
            label_ids: Vec::new(),
            notice: false,
            readme: false,
            title: "Recent unrelated post".to_string(),
        },
    })
    .await
    .unwrap()
    .expect("newer body-only post");

    let payload = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=Needle&searchType=post&pageNum=1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;

    assert_eq!(payload["items"][0]["title"], "Needle post title");
    assert_eq!(payload["items"][1]["title"], "Recent unrelated post");
}

#[tokio::test]
async fn post_search_visibility_matches_legacy_public_and_private_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "publicSearch",
        "public",
    )
    .await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "privateSearch",
        "private",
    )
    .await;

    for (project_name, title) in [
        ("publicSearch", "ScopeNeedle public post"),
        ("privateSearch", "ScopeNeedle private post"),
    ] {
        repo.create_posting(CreatePostingInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "owner".to_string(),
            project_name: project_name.to_string(),
            values: PostingMutationInput {
                attachment_ids: Vec::new(),
                body_markdown: format!("ScopeNeedle body for {project_name}"),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: title.to_string(),
            },
        })
        .await
        .unwrap()
        .expect("post");
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/search?keyword=ScopeNeedle&searchType=post&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["counts"]["posts"], 1);
    assert_eq!(anonymous["items"][0]["projectName"], "publicSearch");
    assert_eq!(anonymous["items"][0]["title"], "ScopeNeedle public post");

    let owner = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=ScopeNeedle&searchType=post&pageNum=1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(owner["counts"]["posts"], 2);
    let titles = owner["items"]
        .as_array()
        .expect("owner post search items")
        .iter()
        .map(|item| item["title"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(titles.contains(&"ScopeNeedle public post"));
    assert!(titles.contains(&"ScopeNeedle private post"));
}

#[tokio::test]
async fn post_search_protected_visibility_matches_legacy_org_membership_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) = register_user(app.clone(), "org-member").await;
    let (_, outsider_cookie, _) = register_user(app.clone(), "outsider").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "weblabs",
                "description": "Web labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("weblabs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (project_name, scope, title) in [
        (
            "publicProtectedSearch",
            "public",
            "ProtectedNeedle public post",
        ),
        (
            "protectedSearch",
            "protected",
            "ProtectedNeedle protected post",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            "weblabs",
            project_name,
            scope,
        )
        .await;
        repo.create_posting(CreatePostingInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: "weblabs".to_string(),
            project_name: project_name.to_string(),
            values: PostingMutationInput {
                attachment_ids: Vec::new(),
                body_markdown: format!("ProtectedNeedle body for {project_name}"),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: title.to_string(),
            },
        })
        .await
        .unwrap()
        .expect("post");
    }

    for cookie in [None, Some(outsider_cookie.as_str())] {
        let payload = response_json(
            rest_get(
                app.clone(),
                "/yona/api/v1/search?keyword=ProtectedNeedle&searchType=post&pageNum=1",
                cookie,
            )
            .await,
        )
        .await;
        assert_eq!(payload["counts"]["posts"], 1);
        assert_eq!(payload["items"][0]["projectName"], "publicProtectedSearch");
        assert_eq!(payload["items"][0]["title"], "ProtectedNeedle public post");
    }

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=ProtectedNeedle&searchType=post&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["posts"], 2);
    let titles = org_member["items"]
        .as_array()
        .expect("org member post search items")
        .iter()
        .map(|item| item["title"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(titles.contains(&"ProtectedNeedle public post"));
    assert!(titles.contains(&"ProtectedNeedle protected post"));
}

#[tokio::test]
async fn project_post_search_matches_legacy_project_scope_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "project-post-org-member").await;
    let (_, private_member_cookie, private_member_id) =
        register_user(app.clone(), "project-post-private-member").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "project-post-labs",
                "description": "Project post labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("project-post-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, title) in [
        (
            "project-post-labs",
            "projectPostScopePublic",
            "public",
            "ProjectPostScopeNeedle public post",
        ),
        (
            "project-post-labs",
            "projectPostScopeProtected",
            "protected",
            "ProjectPostScopeNeedle protected post",
        ),
        (
            "owner",
            "projectPostScopePrivate",
            "private",
            "ProjectPostScopeNeedle private post",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        repo.create_posting(CreatePostingInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: owner_name.to_string(),
            project_name: project_name.to_string(),
            values: PostingMutationInput {
                attachment_ids: Vec::new(),
                body_markdown: format!("ProjectPostScopeNeedle body for {project_name}"),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: title.to_string(),
            },
        })
        .await
        .unwrap()
        .expect("post");
    }

    let private_project = repo
        .read_project_by_owner_and_name("owner", "projectPostScopePrivate")
        .await
        .unwrap()
        .expect("private project");
    repo.add_project_membership(private_project.id, private_member_id, "member")
        .await
        .unwrap();

    let public = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-post-labs/projectPostScopePublic/search?keyword=ProjectPostScopeNeedle&searchType=post&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(public["scope"], "project");
    assert_eq!(public["counts"]["posts"], 1);
    assert_eq!(public["items"][0]["projectName"], "projectPostScopePublic");
    assert_eq!(
        public["items"][0]["title"],
        "ProjectPostScopeNeedle public post"
    );

    let protected = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-post-labs/projectPostScopeProtected/search?keyword=ProjectPostScopeNeedle&searchType=post&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(protected["counts"]["posts"], 1);
    assert_eq!(
        protected["items"][0]["projectName"],
        "projectPostScopeProtected"
    );
    assert_eq!(
        protected["items"][0]["title"],
        "ProjectPostScopeNeedle protected post"
    );

    let private = response_json(
        rest_get(
            app,
            "/yona/api/v1/projects/owner/projectPostScopePrivate/search?keyword=ProjectPostScopeNeedle&searchType=post&pageNum=1",
            Some(&private_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(private["counts"]["posts"], 1);
    assert_eq!(
        private["items"][0]["projectName"],
        "projectPostScopePrivate"
    );
    assert_eq!(
        private["items"][0]["title"],
        "ProjectPostScopeNeedle private post"
    );
}

#[tokio::test]
async fn organization_post_search_matches_legacy_group_scope_and_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "scope-org-member").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "scope-labs",
                "description": "Scope labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("scope-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, title) in [
        (
            "scope-labs",
            "scopePublic",
            "public",
            "GroupScopeNeedle public org post",
        ),
        (
            "scope-labs",
            "scopeProtected",
            "protected",
            "GroupScopeNeedle protected org post",
        ),
        (
            "owner",
            "scopePersonal",
            "public",
            "GroupScopeNeedle public personal post",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        repo.create_posting(CreatePostingInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: owner_name.to_string(),
            project_name: project_name.to_string(),
            values: PostingMutationInput {
                attachment_ids: Vec::new(),
                body_markdown: format!("GroupScopeNeedle body for {project_name}"),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: title.to_string(),
            },
        })
        .await
        .unwrap()
        .expect("post");
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/organizations/scope-labs/search?keyword=GroupScopeNeedle&searchType=post&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["scope"], "organization");
    assert_eq!(anonymous["context"]["organizationName"], "scope-labs");
    assert_eq!(anonymous["counts"]["posts"], 1);
    assert_eq!(anonymous["items"][0]["projectName"], "scopePublic");
    assert_eq!(
        anonymous["items"][0]["title"],
        "GroupScopeNeedle public org post"
    );

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/organizations/scope-labs/search?keyword=GroupScopeNeedle&searchType=post&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["posts"], 2);
    let titles = org_member["items"]
        .as_array()
        .expect("org member scoped post search items")
        .iter()
        .map(|item| item["title"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(titles.contains(&"GroupScopeNeedle public org post"));
    assert!(titles.contains(&"GroupScopeNeedle protected org post"));
    assert!(!titles.contains(&"GroupScopeNeedle public personal post"));
}

#[tokio::test]
async fn organization_issue_search_matches_legacy_group_scope_and_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "issue-scope-org-member").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "issue-scope-labs",
                "description": "Issue scope labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("issue-scope-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, title) in [
        (
            "issue-scope-labs",
            "issueScopePublic",
            "public",
            "IssueGroupScopeNeedle public org issue",
        ),
        (
            "issue-scope-labs",
            "issueScopeProtected",
            "protected",
            "IssueGroupScopeNeedle protected org issue",
        ),
        (
            "owner",
            "issueScopePersonal",
            "public",
            "IssueGroupScopeNeedle public personal issue",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        repo.create_issue(CreateIssueInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            owner_name: owner_name.to_string(),
            project_name: project_name.to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: Vec::new(),
                body_markdown: format!("IssueGroupScopeNeedle body for {project_name}"),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
                title: title.to_string(),
            },
        })
        .await
        .unwrap()
        .expect("issue");
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/organizations/issue-scope-labs/search?keyword=IssueGroupScopeNeedle&searchType=issue&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["scope"], "organization");
    assert_eq!(anonymous["context"]["organizationName"], "issue-scope-labs");
    assert_eq!(anonymous["counts"]["issues"], 1);
    assert_eq!(anonymous["items"][0]["projectName"], "issueScopePublic");
    assert_eq!(
        anonymous["items"][0]["title"],
        "IssueGroupScopeNeedle public org issue"
    );

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/organizations/issue-scope-labs/search?keyword=IssueGroupScopeNeedle&searchType=issue&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["issues"], 2);
    let titles = org_member["items"]
        .as_array()
        .expect("org member scoped issue search items")
        .iter()
        .map(|item| item["title"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(titles.contains(&"IssueGroupScopeNeedle public org issue"));
    assert!(titles.contains(&"IssueGroupScopeNeedle protected org issue"));
    assert!(!titles.contains(&"IssueGroupScopeNeedle public personal issue"));
}

#[tokio::test]
async fn post_comment_search_visibility_matches_legacy_public_and_private_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "publicComments",
        "public",
    )
    .await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "privateComments",
        "private",
    )
    .await;

    for (project_name, comment) in [
        ("publicComments", "CommentNeedle public comment"),
        ("privateComments", "CommentNeedle private comment"),
    ] {
        let post = repo
            .create_posting(CreatePostingInput {
                actor_display_name: "owner".to_string(),
                actor_id: owner_id,
                actor_login_id: "owner".to_string(),
                owner_name: "owner".to_string(),
                project_name: project_name.to_string(),
                values: PostingMutationInput {
                    attachment_ids: Vec::new(),
                    body_markdown: format!("CommentNeedle post body for {project_name}"),
                    label_ids: Vec::new(),
                    notice: false,
                    readme: false,
                    title: format!("CommentNeedle post {project_name}"),
                },
            })
            .await
            .unwrap()
            .expect("post");
        repo.create_posting_comment(CreatePostingCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_actor_id: None,
            attachment_ids: Vec::new(),
            contents_markdown: comment.to_string(),
            created_at: None,
            owner_name: "owner".to_string(),
            parent_comment_id: None,
            post_number: post.post_number,
            project_name: project_name.to_string(),
        })
        .await
        .unwrap()
        .expect("post comment");
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/search?keyword=CommentNeedle&searchType=post_comment&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["counts"]["postComments"], 1);
    assert_eq!(anonymous["items"][0]["projectName"], "publicComments");
    assert_eq!(anonymous["items"][0]["type"], "post_comment");

    let owner = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=CommentNeedle&searchType=post_comment&pageNum=1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(owner["counts"]["postComments"], 2);
    let projects = owner["items"]
        .as_array()
        .expect("owner post comment search items")
        .iter()
        .map(|item| item["projectName"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(projects.contains(&"publicComments"));
    assert!(projects.contains(&"privateComments"));
}

#[tokio::test]
async fn post_comment_search_protected_visibility_matches_legacy_org_membership_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "post-comment-org-member").await;
    let (_, outsider_cookie, _) = register_user(app.clone(), "post-comment-outsider").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "post-comment-labs",
                "description": "Post comment labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("post-comment-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (project_name, scope, comment) in [
        (
            "publicProtectedPostComments",
            "public",
            "PostCommentProtectedNeedle public comment",
        ),
        (
            "protectedPostComments",
            "protected",
            "PostCommentProtectedNeedle protected comment",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            "post-comment-labs",
            project_name,
            scope,
        )
        .await;
        let post = repo
            .create_posting(CreatePostingInput {
                actor_display_name: "owner".to_string(),
                actor_id: owner_id,
                actor_login_id: "owner".to_string(),
                owner_name: "post-comment-labs".to_string(),
                project_name: project_name.to_string(),
                values: PostingMutationInput {
                    attachment_ids: Vec::new(),
                    body_markdown: format!("PostCommentProtectedNeedle post {project_name}"),
                    label_ids: Vec::new(),
                    notice: false,
                    readme: false,
                    title: format!("PostCommentProtectedNeedle post {project_name}"),
                },
            })
            .await
            .unwrap()
            .expect("post");
        repo.create_posting_comment(CreatePostingCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_actor_id: None,
            attachment_ids: Vec::new(),
            contents_markdown: comment.to_string(),
            created_at: None,
            owner_name: "post-comment-labs".to_string(),
            parent_comment_id: None,
            post_number: post.post_number,
            project_name: project_name.to_string(),
        })
        .await
        .unwrap()
        .expect("post comment");
    }

    for cookie in [None, Some(outsider_cookie.as_str())] {
        let payload = response_json(
            rest_get(
                app.clone(),
                "/yona/api/v1/search?keyword=PostCommentProtectedNeedle&searchType=post_comment&pageNum=1",
                cookie,
            )
            .await,
        )
        .await;
        assert_eq!(payload["counts"]["postComments"], 1);
        assert_eq!(
            payload["items"][0]["projectName"],
            "publicProtectedPostComments"
        );
        assert_eq!(payload["items"][0]["type"], "post_comment");
    }

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=PostCommentProtectedNeedle&searchType=post_comment&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["postComments"], 2);
    let projects = org_member["items"]
        .as_array()
        .expect("org member post comment search items")
        .iter()
        .map(|item| item["projectName"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(projects.contains(&"publicProtectedPostComments"));
    assert!(projects.contains(&"protectedPostComments"));
}

#[tokio::test]
async fn project_post_comment_search_matches_legacy_project_scope_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "project-post-comment-org-member").await;
    let (_, private_member_cookie, private_member_id) =
        register_user(app.clone(), "project-post-comment-private-member").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "project-post-comment-labs",
                "description": "Project post comment labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("project-post-comment-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, comment) in [
        (
            "project-post-comment-labs",
            "projectPostCommentScopePublic",
            "public",
            "ProjectPostCommentScopeNeedle public comment",
        ),
        (
            "project-post-comment-labs",
            "projectPostCommentScopeProtected",
            "protected",
            "ProjectPostCommentScopeNeedle protected comment",
        ),
        (
            "owner",
            "projectPostCommentScopePrivate",
            "private",
            "ProjectPostCommentScopeNeedle private comment",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        let post = repo
            .create_posting(CreatePostingInput {
                actor_display_name: "owner".to_string(),
                actor_id: owner_id,
                actor_login_id: "owner".to_string(),
                owner_name: owner_name.to_string(),
                project_name: project_name.to_string(),
                values: PostingMutationInput {
                    attachment_ids: Vec::new(),
                    body_markdown: format!("ProjectPostCommentScopeNeedle post {project_name}"),
                    label_ids: Vec::new(),
                    notice: false,
                    readme: false,
                    title: format!("ProjectPostCommentScopeNeedle post {project_name}"),
                },
            })
            .await
            .unwrap()
            .expect("post");
        repo.create_posting_comment(CreatePostingCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_actor_id: None,
            attachment_ids: Vec::new(),
            contents_markdown: comment.to_string(),
            created_at: None,
            owner_name: owner_name.to_string(),
            parent_comment_id: None,
            post_number: post.post_number,
            project_name: project_name.to_string(),
        })
        .await
        .unwrap()
        .expect("post comment");
    }

    let private_project = repo
        .read_project_by_owner_and_name("owner", "projectPostCommentScopePrivate")
        .await
        .unwrap()
        .expect("private project");
    repo.add_project_membership(private_project.id, private_member_id, "member")
        .await
        .unwrap();

    let public = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-post-comment-labs/projectPostCommentScopePublic/search?keyword=ProjectPostCommentScopeNeedle&searchType=post_comment&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(public["scope"], "project");
    assert_eq!(public["counts"]["postComments"], 1);
    assert_eq!(
        public["items"][0]["projectName"],
        "projectPostCommentScopePublic"
    );
    assert_eq!(public["items"][0]["type"], "post_comment");

    let protected = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-post-comment-labs/projectPostCommentScopeProtected/search?keyword=ProjectPostCommentScopeNeedle&searchType=post_comment&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(protected["counts"]["postComments"], 1);
    assert_eq!(
        protected["items"][0]["projectName"],
        "projectPostCommentScopeProtected"
    );
    assert_eq!(protected["items"][0]["type"], "post_comment");

    let private = response_json(
        rest_get(
            app,
            "/yona/api/v1/projects/owner/projectPostCommentScopePrivate/search?keyword=ProjectPostCommentScopeNeedle&searchType=post_comment&pageNum=1",
            Some(&private_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(private["counts"]["postComments"], 1);
    assert_eq!(
        private["items"][0]["projectName"],
        "projectPostCommentScopePrivate"
    );
    assert_eq!(private["items"][0]["type"], "post_comment");
}

#[tokio::test]
async fn organization_post_comment_search_matches_legacy_group_scope_and_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "post-comment-scope-org-member").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "post-comment-scope-labs",
                "description": "Post comment scope labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("post-comment-scope-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, comment) in [
        (
            "post-comment-scope-labs",
            "postCommentScopePublic",
            "public",
            "PostCommentGroupScopeNeedle public org comment",
        ),
        (
            "post-comment-scope-labs",
            "postCommentScopeProtected",
            "protected",
            "PostCommentGroupScopeNeedle protected org comment",
        ),
        (
            "owner",
            "postCommentScopePersonal",
            "public",
            "PostCommentGroupScopeNeedle public personal comment",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        let post = repo
            .create_posting(CreatePostingInput {
                actor_display_name: "owner".to_string(),
                actor_id: owner_id,
                actor_login_id: "owner".to_string(),
                owner_name: owner_name.to_string(),
                project_name: project_name.to_string(),
                values: PostingMutationInput {
                    attachment_ids: Vec::new(),
                    body_markdown: format!("PostCommentGroupScopeNeedle post {project_name}"),
                    label_ids: Vec::new(),
                    notice: false,
                    readme: false,
                    title: format!("PostCommentGroupScopeNeedle post {project_name}"),
                },
            })
            .await
            .unwrap()
            .expect("post");
        repo.create_posting_comment(CreatePostingCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_actor_id: None,
            attachment_ids: Vec::new(),
            contents_markdown: comment.to_string(),
            created_at: None,
            owner_name: owner_name.to_string(),
            parent_comment_id: None,
            post_number: post.post_number,
            project_name: project_name.to_string(),
        })
        .await
        .unwrap()
        .expect("post comment");
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/organizations/post-comment-scope-labs/search?keyword=PostCommentGroupScopeNeedle&searchType=post_comment&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["scope"], "organization");
    assert_eq!(
        anonymous["context"]["organizationName"],
        "post-comment-scope-labs"
    );
    assert_eq!(anonymous["counts"]["postComments"], 1);
    assert_eq!(
        anonymous["items"][0]["projectName"],
        "postCommentScopePublic"
    );
    assert_eq!(anonymous["items"][0]["type"], "post_comment");

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/organizations/post-comment-scope-labs/search?keyword=PostCommentGroupScopeNeedle&searchType=post_comment&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["postComments"], 2);
    let projects = org_member["items"]
        .as_array()
        .expect("org member scoped post comment search items")
        .iter()
        .map(|item| item["projectName"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(projects.contains(&"postCommentScopePublic"));
    assert!(projects.contains(&"postCommentScopeProtected"));
    assert!(!projects.contains(&"postCommentScopePersonal"));
}

#[tokio::test]
async fn milestone_search_visibility_matches_legacy_public_and_private_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "publicMilestones",
        "public",
    )
    .await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "privateMilestones",
        "private",
    )
    .await;

    for (project_name, title) in [
        ("publicMilestones", "MilestoneNeedle public milestone"),
        ("privateMilestones", "MilestoneNeedle private milestone"),
    ] {
        repo.create_project_milestone(MilestoneMutationInput {
            actor_id: Some(owner_id),
            attachment_ids: Vec::new(),
            contents_markdown: format!("MilestoneNeedle body for {project_name}"),
            due_date: Some(days_ago_datetime(2)),
            owner_name: "owner".to_string(),
            project_name: project_name.to_string(),
            state: "open".to_string(),
            title: title.to_string(),
        })
        .await
        .unwrap()
        .expect("milestone");
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/search?keyword=MilestoneNeedle&searchType=milestone&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["counts"]["milestones"], 1);
    assert_eq!(anonymous["items"][0]["projectName"], "publicMilestones");
    assert_eq!(
        anonymous["items"][0]["title"],
        "MilestoneNeedle public milestone"
    );

    let owner = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=MilestoneNeedle&searchType=milestone&pageNum=1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(owner["counts"]["milestones"], 2);
    let titles = owner["items"]
        .as_array()
        .expect("owner milestone search items")
        .iter()
        .map(|item| item["title"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(titles.contains(&"MilestoneNeedle public milestone"));
    assert!(titles.contains(&"MilestoneNeedle private milestone"));
}

#[tokio::test]
async fn milestone_search_protected_visibility_matches_legacy_org_membership_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "milestone-org-member").await;
    let (_, outsider_cookie, _) = register_user(app.clone(), "milestone-outsider").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "milestone-labs",
                "description": "Milestone labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("milestone-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (project_name, scope, title) in [
        (
            "publicProtectedMilestones",
            "public",
            "MilestoneProtectedNeedle public milestone",
        ),
        (
            "protectedMilestones",
            "protected",
            "MilestoneProtectedNeedle protected milestone",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            "milestone-labs",
            project_name,
            scope,
        )
        .await;
        repo.create_project_milestone(MilestoneMutationInput {
            actor_id: Some(owner_id),
            attachment_ids: Vec::new(),
            contents_markdown: format!("MilestoneProtectedNeedle body for {project_name}"),
            due_date: Some(days_ago_datetime(2)),
            owner_name: "milestone-labs".to_string(),
            project_name: project_name.to_string(),
            state: "open".to_string(),
            title: title.to_string(),
        })
        .await
        .unwrap()
        .expect("milestone");
    }

    for cookie in [None, Some(outsider_cookie.as_str())] {
        let payload = response_json(
            rest_get(
                app.clone(),
                "/yona/api/v1/search?keyword=MilestoneProtectedNeedle&searchType=milestone&pageNum=1",
                cookie,
            )
            .await,
        )
        .await;
        assert_eq!(payload["counts"]["milestones"], 1);
        assert_eq!(
            payload["items"][0]["projectName"],
            "publicProtectedMilestones"
        );
        assert_eq!(
            payload["items"][0]["title"],
            "MilestoneProtectedNeedle public milestone"
        );
    }

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=MilestoneProtectedNeedle&searchType=milestone&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["milestones"], 2);
    let titles = org_member["items"]
        .as_array()
        .expect("org member milestone search items")
        .iter()
        .map(|item| item["title"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(titles.contains(&"MilestoneProtectedNeedle public milestone"));
    assert!(titles.contains(&"MilestoneProtectedNeedle protected milestone"));
}

#[tokio::test]
async fn project_milestone_search_matches_legacy_project_scope_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "project-milestone-org-member").await;
    let (_, private_member_cookie, private_member_id) =
        register_user(app.clone(), "project-milestone-private-member").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "project-milestone-labs",
                "description": "Project milestone labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("project-milestone-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, title) in [
        (
            "project-milestone-labs",
            "projectMilestoneScopePublic",
            "public",
            "ProjectMilestoneScopeNeedle public milestone",
        ),
        (
            "project-milestone-labs",
            "projectMilestoneScopeProtected",
            "protected",
            "ProjectMilestoneScopeNeedle protected milestone",
        ),
        (
            "owner",
            "projectMilestoneScopePrivate",
            "private",
            "ProjectMilestoneScopeNeedle private milestone",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        repo.create_project_milestone(MilestoneMutationInput {
            actor_id: Some(owner_id),
            attachment_ids: Vec::new(),
            contents_markdown: format!("ProjectMilestoneScopeNeedle body for {project_name}"),
            due_date: Some(days_ago_datetime(2)),
            owner_name: owner_name.to_string(),
            project_name: project_name.to_string(),
            state: "open".to_string(),
            title: title.to_string(),
        })
        .await
        .unwrap()
        .expect("milestone");
    }

    let private_project = repo
        .read_project_by_owner_and_name("owner", "projectMilestoneScopePrivate")
        .await
        .unwrap()
        .expect("private project");
    repo.add_project_membership(private_project.id, private_member_id, "member")
        .await
        .unwrap();

    let public = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-milestone-labs/projectMilestoneScopePublic/search?keyword=ProjectMilestoneScopeNeedle&searchType=milestone&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(public["scope"], "project");
    assert_eq!(public["counts"]["milestones"], 1);
    assert_eq!(
        public["items"][0]["projectName"],
        "projectMilestoneScopePublic"
    );
    assert_eq!(
        public["items"][0]["title"],
        "ProjectMilestoneScopeNeedle public milestone"
    );

    let protected = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-milestone-labs/projectMilestoneScopeProtected/search?keyword=ProjectMilestoneScopeNeedle&searchType=milestone&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(protected["counts"]["milestones"], 1);
    assert_eq!(
        protected["items"][0]["projectName"],
        "projectMilestoneScopeProtected"
    );
    assert_eq!(
        protected["items"][0]["title"],
        "ProjectMilestoneScopeNeedle protected milestone"
    );

    let private = response_json(
        rest_get(
            app,
            "/yona/api/v1/projects/owner/projectMilestoneScopePrivate/search?keyword=ProjectMilestoneScopeNeedle&searchType=milestone&pageNum=1",
            Some(&private_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(private["counts"]["milestones"], 1);
    assert_eq!(
        private["items"][0]["projectName"],
        "projectMilestoneScopePrivate"
    );
    assert_eq!(
        private["items"][0]["title"],
        "ProjectMilestoneScopeNeedle private milestone"
    );
}

#[tokio::test]
async fn organization_milestone_search_matches_legacy_group_scope_and_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "milestone-scope-org-member").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "milestone-scope-labs",
                "description": "Milestone scope labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("milestone-scope-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, title) in [
        (
            "milestone-scope-labs",
            "milestoneScopePublic",
            "public",
            "MilestoneGroupScopeNeedle public org milestone",
        ),
        (
            "milestone-scope-labs",
            "milestoneScopeProtected",
            "protected",
            "MilestoneGroupScopeNeedle protected org milestone",
        ),
        (
            "owner",
            "milestoneScopePersonal",
            "public",
            "MilestoneGroupScopeNeedle public personal milestone",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        repo.create_project_milestone(MilestoneMutationInput {
            actor_id: Some(owner_id),
            attachment_ids: Vec::new(),
            contents_markdown: format!("MilestoneGroupScopeNeedle body for {project_name}"),
            due_date: Some(days_ago_datetime(2)),
            owner_name: owner_name.to_string(),
            project_name: project_name.to_string(),
            state: "open".to_string(),
            title: title.to_string(),
        })
        .await
        .unwrap()
        .expect("milestone");
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/organizations/milestone-scope-labs/search?keyword=MilestoneGroupScopeNeedle&searchType=milestone&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["scope"], "organization");
    assert_eq!(
        anonymous["context"]["organizationName"],
        "milestone-scope-labs"
    );
    assert_eq!(anonymous["counts"]["milestones"], 1);
    assert_eq!(anonymous["items"][0]["projectName"], "milestoneScopePublic");
    assert_eq!(
        anonymous["items"][0]["title"],
        "MilestoneGroupScopeNeedle public org milestone"
    );

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/organizations/milestone-scope-labs/search?keyword=MilestoneGroupScopeNeedle&searchType=milestone&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["milestones"], 2);
    let titles = org_member["items"]
        .as_array()
        .expect("org member scoped milestone search items")
        .iter()
        .map(|item| item["title"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(titles.contains(&"MilestoneGroupScopeNeedle public org milestone"));
    assert!(titles.contains(&"MilestoneGroupScopeNeedle protected org milestone"));
    assert!(!titles.contains(&"MilestoneGroupScopeNeedle public personal milestone"));
}

#[tokio::test]
async fn issue_comment_search_visibility_matches_legacy_public_and_private_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "publicIssueComments",
        "public",
    )
    .await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "privateIssueComments",
        "private",
    )
    .await;

    for (project_name, comment) in [
        ("publicIssueComments", "IssueCommentNeedle public comment"),
        ("privateIssueComments", "IssueCommentNeedle private comment"),
    ] {
        let issue = repo
            .create_issue(CreateIssueInput {
                actor_display_name: "owner".to_string(),
                actor_id: owner_id,
                actor_login_id: "owner".to_string(),
                owner_name: "owner".to_string(),
                project_name: project_name.to_string(),
                values: IssueMutationInput {
                    assignee_login_id: None,
                    attachment_ids: Vec::new(),
                    body_markdown: format!("IssueCommentNeedle issue body for {project_name}"),
                    due_date: None,
                    is_draft: false,
                    is_publish: false,
                    label_ids: Vec::new(),
                    milestone_id: None,
                    parent_issue_id: None,
                    title: format!("IssueCommentNeedle issue {project_name}"),
                },
            })
            .await
            .unwrap()
            .expect("issue");
        repo.create_issue_comment(CreateIssueCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_ids: Vec::new(),
            contents_markdown: comment.to_string(),
            issue_number: issue.issue_number,
            owner_name: "owner".to_string(),
            parent_comment_id: None,
            project_name: project_name.to_string(),
        })
        .await
        .unwrap()
        .expect("issue comment");
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/search?keyword=IssueCommentNeedle&searchType=issue_comment&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["counts"]["issueComments"], 1);
    assert_eq!(anonymous["items"][0]["projectName"], "publicIssueComments");
    assert_eq!(anonymous["items"][0]["type"], "issue_comment");

    let owner = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=IssueCommentNeedle&searchType=issue_comment&pageNum=1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(owner["counts"]["issueComments"], 2);
    let projects = owner["items"]
        .as_array()
        .expect("owner issue comment search items")
        .iter()
        .map(|item| item["projectName"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(projects.contains(&"publicIssueComments"));
    assert!(projects.contains(&"privateIssueComments"));
}

#[tokio::test]
async fn issue_comment_search_protected_visibility_matches_legacy_org_membership_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "issue-comment-org-member").await;
    let (_, outsider_cookie, _) = register_user(app.clone(), "issue-comment-outsider").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "issue-comment-labs",
                "description": "Issue comment labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("issue-comment-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (project_name, scope, comment) in [
        (
            "publicProtectedIssueComments",
            "public",
            "IssueCommentProtectedNeedle public comment",
        ),
        (
            "protectedIssueComments",
            "protected",
            "IssueCommentProtectedNeedle protected comment",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            "issue-comment-labs",
            project_name,
            scope,
        )
        .await;
        let issue = repo
            .create_issue(CreateIssueInput {
                actor_display_name: "owner".to_string(),
                actor_id: owner_id,
                actor_login_id: "owner".to_string(),
                owner_name: "issue-comment-labs".to_string(),
                project_name: project_name.to_string(),
                values: IssueMutationInput {
                    assignee_login_id: None,
                    attachment_ids: Vec::new(),
                    body_markdown: format!("IssueCommentProtectedNeedle issue {project_name}"),
                    due_date: None,
                    is_draft: false,
                    is_publish: false,
                    label_ids: Vec::new(),
                    milestone_id: None,
                    parent_issue_id: None,
                    title: format!("IssueCommentProtectedNeedle issue {project_name}"),
                },
            })
            .await
            .unwrap()
            .expect("issue");
        repo.create_issue_comment(CreateIssueCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_ids: Vec::new(),
            contents_markdown: comment.to_string(),
            issue_number: issue.issue_number,
            owner_name: "issue-comment-labs".to_string(),
            parent_comment_id: None,
            project_name: project_name.to_string(),
        })
        .await
        .unwrap()
        .expect("issue comment");
    }

    for cookie in [None, Some(outsider_cookie.as_str())] {
        let payload = response_json(
            rest_get(
                app.clone(),
                "/yona/api/v1/search?keyword=IssueCommentProtectedNeedle&searchType=issue_comment&pageNum=1",
                cookie,
            )
            .await,
        )
        .await;
        assert_eq!(payload["counts"]["issueComments"], 1);
        assert_eq!(
            payload["items"][0]["projectName"],
            "publicProtectedIssueComments"
        );
        assert_eq!(payload["items"][0]["type"], "issue_comment");
    }

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=IssueCommentProtectedNeedle&searchType=issue_comment&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["issueComments"], 2);
    let projects = org_member["items"]
        .as_array()
        .expect("org member issue comment search items")
        .iter()
        .map(|item| item["projectName"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(projects.contains(&"publicProtectedIssueComments"));
    assert!(projects.contains(&"protectedIssueComments"));
}

#[tokio::test]
async fn project_issue_comment_search_matches_legacy_project_scope_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "project-issue-comment-org-member").await;
    let (_, private_member_cookie, private_member_id) =
        register_user(app.clone(), "project-issue-comment-private-member").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "project-issue-comment-labs",
                "description": "Project issue comment labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("project-issue-comment-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, comment) in [
        (
            "project-issue-comment-labs",
            "projectIssueCommentScopePublic",
            "public",
            "ProjectIssueCommentScopeNeedle public comment",
        ),
        (
            "project-issue-comment-labs",
            "projectIssueCommentScopeProtected",
            "protected",
            "ProjectIssueCommentScopeNeedle protected comment",
        ),
        (
            "owner",
            "projectIssueCommentScopePrivate",
            "private",
            "ProjectIssueCommentScopeNeedle private comment",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        let issue = repo
            .create_issue(CreateIssueInput {
                actor_display_name: "owner".to_string(),
                actor_id: owner_id,
                actor_login_id: "owner".to_string(),
                owner_name: owner_name.to_string(),
                project_name: project_name.to_string(),
                values: IssueMutationInput {
                    assignee_login_id: None,
                    attachment_ids: Vec::new(),
                    body_markdown: format!("ProjectIssueCommentScopeNeedle issue {project_name}"),
                    due_date: None,
                    is_draft: false,
                    is_publish: false,
                    label_ids: Vec::new(),
                    milestone_id: None,
                    parent_issue_id: None,
                    title: format!("ProjectIssueCommentScopeNeedle issue {project_name}"),
                },
            })
            .await
            .unwrap()
            .expect("issue");
        repo.create_issue_comment(CreateIssueCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_ids: Vec::new(),
            contents_markdown: comment.to_string(),
            issue_number: issue.issue_number,
            owner_name: owner_name.to_string(),
            parent_comment_id: None,
            project_name: project_name.to_string(),
        })
        .await
        .unwrap()
        .expect("issue comment");
    }

    let private_project = repo
        .read_project_by_owner_and_name("owner", "projectIssueCommentScopePrivate")
        .await
        .unwrap()
        .expect("private project");
    repo.add_project_membership(private_project.id, private_member_id, "member")
        .await
        .unwrap();

    let public = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-issue-comment-labs/projectIssueCommentScopePublic/search?keyword=ProjectIssueCommentScopeNeedle&searchType=issue_comment&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(public["scope"], "project");
    assert_eq!(public["counts"]["issueComments"], 1);
    assert_eq!(
        public["items"][0]["projectName"],
        "projectIssueCommentScopePublic"
    );
    assert_eq!(public["items"][0]["type"], "issue_comment");

    let protected = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-issue-comment-labs/projectIssueCommentScopeProtected/search?keyword=ProjectIssueCommentScopeNeedle&searchType=issue_comment&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(protected["counts"]["issueComments"], 1);
    assert_eq!(
        protected["items"][0]["projectName"],
        "projectIssueCommentScopeProtected"
    );
    assert_eq!(protected["items"][0]["type"], "issue_comment");

    let private = response_json(
        rest_get(
            app,
            "/yona/api/v1/projects/owner/projectIssueCommentScopePrivate/search?keyword=ProjectIssueCommentScopeNeedle&searchType=issue_comment&pageNum=1",
            Some(&private_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(private["counts"]["issueComments"], 1);
    assert_eq!(
        private["items"][0]["projectName"],
        "projectIssueCommentScopePrivate"
    );
    assert_eq!(private["items"][0]["type"], "issue_comment");
}

#[tokio::test]
async fn organization_issue_comment_search_matches_legacy_group_scope_and_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, _) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "issue-comment-scope-org-member").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "issue-comment-scope-labs",
                "description": "Issue comment scope labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("issue-comment-scope-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, comment) in [
        (
            "issue-comment-scope-labs",
            "issueCommentScopePublic",
            "public",
            "IssueCommentGroupScopeNeedle public org comment",
        ),
        (
            "issue-comment-scope-labs",
            "issueCommentScopeProtected",
            "protected",
            "IssueCommentGroupScopeNeedle protected org comment",
        ),
        (
            "owner",
            "issueCommentScopePersonal",
            "public",
            "IssueCommentGroupScopeNeedle public personal comment",
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        let issue = repo
            .create_issue(CreateIssueInput {
                actor_display_name: "owner".to_string(),
                actor_id: owner_id,
                actor_login_id: "owner".to_string(),
                owner_name: owner_name.to_string(),
                project_name: project_name.to_string(),
                values: IssueMutationInput {
                    assignee_login_id: None,
                    attachment_ids: Vec::new(),
                    body_markdown: format!("IssueCommentGroupScopeNeedle issue {project_name}"),
                    due_date: None,
                    is_draft: false,
                    is_publish: false,
                    label_ids: Vec::new(),
                    milestone_id: None,
                    parent_issue_id: None,
                    title: format!("IssueCommentGroupScopeNeedle issue {project_name}"),
                },
            })
            .await
            .unwrap()
            .expect("issue");
        repo.create_issue_comment(CreateIssueCommentInput {
            actor_display_name: "owner".to_string(),
            actor_id: owner_id,
            actor_login_id: "owner".to_string(),
            attachment_ids: Vec::new(),
            contents_markdown: comment.to_string(),
            issue_number: issue.issue_number,
            owner_name: owner_name.to_string(),
            parent_comment_id: None,
            project_name: project_name.to_string(),
        })
        .await
        .unwrap()
        .expect("issue comment");
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/organizations/issue-comment-scope-labs/search?keyword=IssueCommentGroupScopeNeedle&searchType=issue_comment&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["scope"], "organization");
    assert_eq!(
        anonymous["context"]["organizationName"],
        "issue-comment-scope-labs"
    );
    assert_eq!(anonymous["counts"]["issueComments"], 1);
    assert_eq!(
        anonymous["items"][0]["projectName"],
        "issueCommentScopePublic"
    );
    assert_eq!(anonymous["items"][0]["type"], "issue_comment");

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/organizations/issue-comment-scope-labs/search?keyword=IssueCommentGroupScopeNeedle&searchType=issue_comment&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["issueComments"], 2);
    let projects = org_member["items"]
        .as_array()
        .expect("org member scoped issue comment search items")
        .iter()
        .map(|item| item["projectName"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(projects.contains(&"issueCommentScopePublic"));
    assert!(projects.contains(&"issueCommentScopeProtected"));
    assert!(!projects.contains(&"issueCommentScopePersonal"));
}

#[tokio::test]
async fn review_search_visibility_matches_legacy_public_and_private_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, db) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, _, reviewer_id) = register_user(app.clone(), "reviewer").await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "publicReviews",
        "public",
    )
    .await;
    create_named_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "privateReviews",
        "private",
    )
    .await;

    for (project_name, title, comment, number) in [
        (
            "publicReviews",
            "ReviewNeedle public pull request",
            "ReviewNeedle public review comment",
            21,
        ),
        (
            "privateReviews",
            "ReviewNeedle private pull request",
            "ReviewNeedle private review comment",
            22,
        ),
    ] {
        seed_project_review_comment(
            &db,
            &repo,
            ReviewCommentSeed {
                owner_name: "owner",
                project_name,
                pull_request_title: title,
                comment_contents: comment,
                number,
            },
            owner_id,
            reviewer_id,
        )
        .await;
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/search?keyword=ReviewNeedle&searchType=review&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["counts"]["reviews"], 1);
    assert_eq!(anonymous["items"][0]["projectName"], "publicReviews");
    assert_eq!(anonymous["items"][0]["type"], "review");

    let owner = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=ReviewNeedle&searchType=review&pageNum=1",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(owner["counts"]["reviews"], 2);
    let projects = owner["items"]
        .as_array()
        .expect("owner review search items")
        .iter()
        .map(|item| item["projectName"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(projects.contains(&"publicReviews"));
    assert!(projects.contains(&"privateReviews"));
}

#[tokio::test]
async fn review_search_protected_visibility_matches_legacy_org_membership_acl() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, db) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "review-org-member").await;
    let (_, outsider_cookie, _) = register_user(app.clone(), "review-outsider").await;
    let (_, _, reviewer_id) = register_user(app.clone(), "protected-reviewer").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "review-labs",
                "description": "Review labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("review-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (project_name, scope, title, comment, number) in [
        (
            "publicProtectedReviews",
            "public",
            "ReviewProtectedNeedle public pull request",
            "ReviewProtectedNeedle public review comment",
            31,
        ),
        (
            "protectedReviews",
            "protected",
            "ReviewProtectedNeedle protected pull request",
            "ReviewProtectedNeedle protected review comment",
            32,
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            "review-labs",
            project_name,
            scope,
        )
        .await;
        seed_project_review_comment(
            &db,
            &repo,
            ReviewCommentSeed {
                owner_name: "review-labs",
                project_name,
                pull_request_title: title,
                comment_contents: comment,
                number,
            },
            owner_id,
            reviewer_id,
        )
        .await;
    }

    for cookie in [None, Some(outsider_cookie.as_str())] {
        let payload = response_json(
            rest_get(
                app.clone(),
                "/yona/api/v1/search?keyword=ReviewProtectedNeedle&searchType=review&pageNum=1",
                cookie,
            )
            .await,
        )
        .await;
        assert_eq!(payload["counts"]["reviews"], 1);
        assert_eq!(payload["items"][0]["projectName"], "publicProtectedReviews");
        assert_eq!(payload["items"][0]["type"], "review");
    }

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/search?keyword=ReviewProtectedNeedle&searchType=review&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["reviews"], 2);
    let projects = org_member["items"]
        .as_array()
        .expect("org member review search items")
        .iter()
        .map(|item| item["projectName"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(projects.contains(&"publicProtectedReviews"));
    assert!(projects.contains(&"protectedReviews"));
}

#[tokio::test]
async fn project_review_search_matches_legacy_project_scope_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, db) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "project-review-org-member").await;
    let (_, private_member_cookie, private_member_id) =
        register_user(app.clone(), "project-review-private-member").await;
    let (_, _, reviewer_id) = register_user(app.clone(), "project-review-reviewer").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "project-review-labs",
                "description": "Project review labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("project-review-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, title, comment, number) in [
        (
            "project-review-labs",
            "projectReviewScopePublic",
            "public",
            "ProjectReviewScopeNeedle public pull request",
            "ProjectReviewScopeNeedle public review",
            51,
        ),
        (
            "project-review-labs",
            "projectReviewScopeProtected",
            "protected",
            "ProjectReviewScopeNeedle protected pull request",
            "ProjectReviewScopeNeedle protected review",
            52,
        ),
        (
            "owner",
            "projectReviewScopePrivate",
            "private",
            "ProjectReviewScopeNeedle private pull request",
            "ProjectReviewScopeNeedle private review",
            53,
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        seed_project_review_comment(
            &db,
            &repo,
            ReviewCommentSeed {
                owner_name,
                project_name,
                pull_request_title: title,
                comment_contents: comment,
                number,
            },
            owner_id,
            reviewer_id,
        )
        .await;
    }

    let private_project = repo
        .read_project_by_owner_and_name("owner", "projectReviewScopePrivate")
        .await
        .unwrap()
        .expect("private project");
    repo.add_project_membership(private_project.id, private_member_id, "member")
        .await
        .unwrap();

    let public = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-review-labs/projectReviewScopePublic/search?keyword=ProjectReviewScopeNeedle&searchType=review&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(public["scope"], "project");
    assert_eq!(public["counts"]["reviews"], 1);
    assert_eq!(
        public["items"][0]["projectName"],
        "projectReviewScopePublic"
    );
    assert_eq!(public["items"][0]["type"], "review");

    let protected = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/project-review-labs/projectReviewScopeProtected/search?keyword=ProjectReviewScopeNeedle&searchType=review&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(protected["counts"]["reviews"], 1);
    assert_eq!(
        protected["items"][0]["projectName"],
        "projectReviewScopeProtected"
    );
    assert_eq!(protected["items"][0]["type"], "review");

    let private = response_json(
        rest_get(
            app,
            "/yona/api/v1/projects/owner/projectReviewScopePrivate/search?keyword=ProjectReviewScopeNeedle&searchType=review&pageNum=1",
            Some(&private_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(private["counts"]["reviews"], 1);
    assert_eq!(
        private["items"][0]["projectName"],
        "projectReviewScopePrivate"
    );
    assert_eq!(private["items"][0]["type"], "review");
}

#[tokio::test]
async fn organization_review_search_matches_legacy_group_scope_and_visibility() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, db) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, org_member_cookie, org_member_id) =
        register_user(app.clone(), "review-scope-org-member").await;
    let (_, _, reviewer_id) = register_user(app.clone(), "review-scope-reviewer").await;

    response_json(
        rpc(
            app.clone(),
            "CreateOrganization",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "organizationName": "review-scope-labs",
                "description": "Review scope labs"
            }),
        )
        .await,
    )
    .await;
    let organization = repo
        .read_organization_by_name("review-scope-labs")
        .await
        .unwrap()
        .expect("organization");
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();

    for (owner_name, project_name, scope, title, comment, number) in [
        (
            "review-scope-labs",
            "reviewScopePublic",
            "public",
            "ReviewGroupScopeNeedle public org pull request",
            "ReviewGroupScopeNeedle public org review",
            41,
        ),
        (
            "review-scope-labs",
            "reviewScopeProtected",
            "protected",
            "ReviewGroupScopeNeedle protected org pull request",
            "ReviewGroupScopeNeedle protected org review",
            42,
        ),
        (
            "owner",
            "reviewScopePersonal",
            "public",
            "ReviewGroupScopeNeedle public personal pull request",
            "ReviewGroupScopeNeedle public personal review",
            43,
        ),
    ] {
        create_named_owner_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            owner_name,
            project_name,
            scope,
        )
        .await;
        seed_project_review_comment(
            &db,
            &repo,
            ReviewCommentSeed {
                owner_name,
                project_name,
                pull_request_title: title,
                comment_contents: comment,
                number,
            },
            owner_id,
            reviewer_id,
        )
        .await;
    }

    let anonymous = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/organizations/review-scope-labs/search?keyword=ReviewGroupScopeNeedle&searchType=review&pageNum=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["scope"], "organization");
    assert_eq!(
        anonymous["context"]["organizationName"],
        "review-scope-labs"
    );
    assert_eq!(anonymous["counts"]["reviews"], 1);
    assert_eq!(anonymous["items"][0]["projectName"], "reviewScopePublic");
    assert_eq!(anonymous["items"][0]["type"], "review");

    let org_member = response_json(
        rest_get(
            app,
            "/yona/api/v1/organizations/review-scope-labs/search?keyword=ReviewGroupScopeNeedle&searchType=review&pageNum=1",
            Some(&org_member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_member["counts"]["reviews"], 2);
    let projects = org_member["items"]
        .as_array()
        .expect("org member scoped review search items")
        .iter()
        .map(|item| item["projectName"].as_str().unwrap_or_default())
        .collect::<Vec<_>>();
    assert!(projects.contains(&"reviewScopePublic"));
    assert!(projects.contains(&"reviewScopeProtected"));
    assert!(!projects.contains(&"reviewScopePersonal"));
}

#[tokio::test]
// Guards search route reuse of route-utils-owned query decoding, identifier
// normalization, and app-scoped service snapshot access.
async fn scoped_search_rejects_invalid_project_type_and_returns_review_links() {
    let data_dir = tempdir().expect("yona data tempdir");
    let (app, repo, db) = build_app_with_repository_in_data_root(data_dir.path()).await;
    let (owner_cookie, _) = seed_search_rows(app.clone(), &repo, &db).await;

    let invalid = rest_get(
        app.clone(),
        "/yona/api/v1/projects/owner/projectYobi/search?keyword=Needle&searchType=project",
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);

    let project = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/projects/owner/projectYobi/search?keyword=Needle&searchType=review",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(project["scope"], "project");
    assert_eq!(project["counts"]["projects"], 0);
    assert_eq!(project["items"][0]["type"], "review");
    assert_eq!(
        project["items"][0]["href"],
        "/owner/projectYobi/pullRequest/7#comment-1"
    );

    let missing_keyword = rest_get(
        app,
        "/yona/api/v1/search?searchType=issue&pageNum=1",
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(missing_keyword.status(), StatusCode::BAD_REQUEST);
}
