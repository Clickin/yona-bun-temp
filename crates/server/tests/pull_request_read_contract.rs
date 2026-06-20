use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::entity::prelude::{DateTime, DateTimeUtc};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, Database, DatabaseConnection, NotSet, Set, Statement,
};
use serde_json::json;
use std::time::{Duration, SystemTime};
use tower::ServiceExt;
use yona_rust_persistence::{
    attachment, comment_thread, original_email, project_pushed_branch, pull_request,
    pull_request_commit, pull_request_event, pull_request_reviewers, review_comment, watch,
    AppRepository,
};
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

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

async fn response_json(response: Response<Body>) -> serde_json::Value {
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
    payload: serde_json::Value,
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

async fn rest_get_with_headers(
    app: axum::Router,
    uri: &str,
    cookie_header: Option<&str>,
    headers: &[(&str, &str)],
) -> Response<Body> {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    for (key, value) in headers {
        builder = builder.header(*key, *value);
    }
    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
}

async fn direct_delete(
    app: axum::Router,
    uri: &str,
    cookie_header: &str,
    csrf: &str,
) -> Response<Body> {
    app.oneshot(
        Request::builder()
            .method(Method::DELETE)
            .uri(uri)
            .header(http::header::COOKIE, cookie_header)
            .header("x-csrf-token", csrf)
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String, i64) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = rpc(
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

async fn create_organization(app: axum::Router, cookie: &str, csrf: &str, organization: &str) {
    response_json(
        rpc(
            app,
            "CreateOrganization",
            Some(cookie),
            Some(csrf),
            json!({
                "organizationName": organization,
                "description": "Phase 4A org"
            }),
        )
        .await,
    )
    .await;
}

async fn create_project(
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
                "overview": "Phase 4A PR read parity",
                "projectScope": scope
            }),
        )
        .await,
    )
    .await;
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

async fn set_code_member_only(db: &DatabaseConnection, project_id: i64) {
    let backend = db.get_database_backend();
    db.execute(Statement::from_sql_and_values(
        backend,
        "UPDATE project SET is_code_accessible_member_only = ? WHERE id = ?",
        vec![1_i32.into(), project_id.into()],
    ))
    .await
    .expect("update project code ACL");
}

async fn seed_pull_request(
    db: &DatabaseConnection,
    repo: &AppRepository,
    owner_name: &str,
    project_name: &str,
    contributor_id: i64,
    receiver_id: i64,
    number: i64,
    title: &str,
    state: i32,
    conflict: bool,
) -> pull_request::Model {
    seed_pull_request_between(
        db,
        repo,
        owner_name,
        project_name,
        owner_name,
        project_name,
        contributor_id,
        receiver_id,
        number,
        title,
        state,
        conflict,
    )
    .await
}

async fn seed_pull_request_between(
    db: &DatabaseConnection,
    repo: &AppRepository,
    from_owner_name: &str,
    from_project_name: &str,
    to_owner_name: &str,
    to_project_name: &str,
    contributor_id: i64,
    receiver_id: i64,
    number: i64,
    title: &str,
    state: i32,
    conflict: bool,
) -> pull_request::Model {
    let from_project = repo
        .read_project_by_owner_and_name(from_owner_name, from_project_name)
        .await
        .unwrap()
        .expect("from project");
    let to_project = repo
        .read_project_by_owner_and_name(to_owner_name, to_project_name)
        .await
        .unwrap()
        .expect("to project");
    let created = pull_request::ActiveModel {
        id: NotSet,
        title: Set(Some(title.to_string())),
        to_project_id: Set(Some(to_project.id)),
        from_project_id: Set(Some(from_project.id)),
        to_branch: Set(Some("main".to_string())),
        from_branch: Set(Some(format!("topic/pr-{number}"))),
        contributor_id: Set(Some(contributor_id)),
        receiver_id: Set(Some(receiver_id)),
        created: Set(Some(days_ago_datetime(number as u64))),
        updated: Set(Some(days_ago_datetime(number as u64))),
        received: Set(None),
        state: Set(Some(state)),
        is_conflict: Set(Some(if conflict { 1 } else { 0 })),
        is_merging: Set(Some(0)),
        last_commit_id: Set(Some(format!("commit-{number}"))),
        merged_commit_id_from: Set(None),
        merged_commit_id_to: Set(None),
        number: Set(Some(number)),
    }
    .insert(db)
    .await
    .unwrap();
    let body = if number == 1 {
        format!(
            "{title} markdown body @reviewer @owner/projectYobi @ghost @owner/missing #1 owner/projectYobi#1 `<script>alert(1)</script> @reviewer #1`"
        )
    } else {
        format!("{title} markdown body")
    };
    write_text_column(db, "pull_request", "body", created.id, &body).await;
    created
}

async fn seed_pull_request_detail_rows(
    db: &DatabaseConnection,
    pull_request: &pull_request::Model,
    contributor_id: i64,
    reviewer_id: i64,
) {
    let commit = pull_request_commit::ActiveModel {
        id: NotSet,
        pull_request_id: Set(Some(pull_request.id)),
        commit_id: Set(Some("abcdef123456".to_string())),
        author_date: Set(Some(days_ago_datetime(1))),
        created: Set(Some(days_ago_datetime(1))),
        commit_short_id: Set(Some("abcdef1".to_string())),
        author_email: Set(Some("author@example.com".to_string())),
        state: Set(Some("CURRENT".to_string())),
    }
    .insert(db)
    .await
    .unwrap();
    write_text_column(
        db,
        "pull_request_commit",
        "commit_message",
        commit.id,
        "Read surface",
    )
    .await;
    let prior_commit = pull_request_commit::ActiveModel {
        id: NotSet,
        pull_request_id: Set(Some(pull_request.id)),
        commit_id: Set(Some("1234567890ab".to_string())),
        author_date: Set(Some(days_ago_datetime(0))),
        created: Set(Some(days_ago_datetime(0))),
        commit_short_id: Set(Some("1234567".to_string())),
        author_email: Set(Some("author2@example.com".to_string())),
        state: Set(Some("PRIOR".to_string())),
    }
    .insert(db)
    .await
    .unwrap();
    write_text_column(
        db,
        "pull_request_commit",
        "commit_message",
        prior_commit.id,
        "Prior surface\nfull details",
    )
    .await;

    let event = pull_request_event::ActiveModel {
        id: NotSet,
        sender_login_id: Set(Some("owner".to_string())),
        pull_request_id: Set(Some(pull_request.id)),
        event_type: Set(Some("NEW_PULL_REQUEST".to_string())),
        created: Set(Some(days_ago_datetime(1))),
    }
    .insert(db)
    .await
    .unwrap();
    write_text_column(db, "pull_request_event", "old_value", event.id, "").await;
    write_text_column(
        db,
        "pull_request_event",
        "new_value",
        event.id,
        pull_request.title.as_deref().unwrap_or_default(),
    )
    .await;
    let commit_event = pull_request_event::ActiveModel {
        id: NotSet,
        sender_login_id: Set(Some("owner".to_string())),
        pull_request_id: Set(Some(pull_request.id)),
        event_type: Set(Some("PULL_REQUEST_COMMIT_CHANGED".to_string())),
        created: Set(Some(days_ago_datetime(0))),
    }
    .insert(db)
    .await
    .unwrap();
    write_text_column(
        db,
        "pull_request_event",
        "old_value",
        commit_event.id,
        "basehash",
    )
    .await;
    write_text_column(
        db,
        "pull_request_event",
        "new_value",
        commit_event.id,
        &format!("{},{}", commit.id, prior_commit.id),
    )
    .await;

    pull_request_reviewers::ActiveModel {
        pull_request_id: Set(pull_request.id),
        user_id: Set(reviewer_id),
    }
    .insert(db)
    .await
    .unwrap();

    let thread = comment_thread::ActiveModel {
        dtype: Set("ReviewThread".to_string()),
        id: NotSet,
        author_id: Set(Some(contributor_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        state: Set(Some("open".to_string())),
        created_date: Set(Some(days_ago_datetime(1))),
        pull_request_id: Set(Some(pull_request.id)),
        project_id: Set(pull_request.to_project_id),
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
        "Review comment body @reviewer @owner/projectYobi @ghost @owner/missing #1 owner/projectYobi#1 `<script>alert(1)</script> @reviewer #1`",
    )
    .await;
    original_email::ActiveModel {
        id: NotSet,
        message_id: Set(Some("<pr-review-comment-1@example.com>".to_string())),
        resource_type: Set(Some("REVIEW_COMMENT".to_string())),
        resource_id: Set(Some(comment.id.to_string())),
        handled_date: Set(None),
    }
    .insert(db)
    .await
    .unwrap();
    attachment::ActiveModel {
        id: NotSet,
        name: Set(Some("review-note.png".to_string())),
        hash: Set(Some("review-note-hash".to_string())),
        container_type: Set(Some("REVIEW_COMMENT".to_string())),
        mime_type: Set(Some("image/png".to_string())),
        size: Set(Some(512)),
        container_id: Set(comment.id),
        created_date: Set(Some(DateTimeUtc::from(SystemTime::now()).naive_utc())),
        owner_login_id: Set(Some("reviewer".to_string())),
    }
    .insert(db)
    .await
    .unwrap();

    let non_ranged_thread = comment_thread::ActiveModel {
        dtype: Set("NonRangedCodeCommentThread".to_string()),
        id: NotSet,
        author_id: Set(Some(contributor_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        state: Set(Some("open".to_string())),
        created_date: Set(Some(days_ago_datetime(1))),
        pull_request_id: Set(Some(pull_request.id)),
        project_id: Set(pull_request.to_project_id),
        prev_commit_id: Set(Some("base".to_string())),
        commit_id: Set(Some("abcdef123456".to_string())),
        path: Set(None),
        start_side: Set(None),
        start_line: Set(None),
        start_column: Set(None),
        end_side: Set(None),
        end_line: Set(None),
        end_column: Set(None),
    }
    .insert(db)
    .await
    .unwrap();
    let non_ranged_comment = review_comment::ActiveModel {
        id: NotSet,
        created_date: Set(Some(days_ago_datetime(1))),
        author_id: Set(Some(reviewer_id)),
        author_login_id: Set(Some("reviewer".to_string())),
        author_name: Set(Some("reviewer".to_string())),
        thread_id: Set(Some(non_ranged_thread.id)),
    }
    .insert(db)
    .await
    .unwrap();
    write_text_column(
        db,
        "review_comment",
        "contents",
        non_ranged_comment.id,
        "Non-ranged review body",
    )
    .await;

    let commit_only_thread = comment_thread::ActiveModel {
        dtype: Set("ReviewThread".to_string()),
        id: NotSet,
        author_id: Set(Some(contributor_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        state: Set(Some("open".to_string())),
        created_date: Set(Some(days_ago_datetime(1))),
        pull_request_id: Set(Some(pull_request.id)),
        project_id: Set(pull_request.to_project_id),
        prev_commit_id: Set(None),
        commit_id: Set(Some("abcdef123456".to_string())),
        path: Set(Some("src/commit-only.rs".to_string())),
        start_side: Set(None),
        start_line: Set(Some(8)),
        start_column: Set(None),
        end_side: Set(None),
        end_line: Set(Some(8)),
        end_column: Set(None),
    }
    .insert(db)
    .await
    .unwrap();
    let commit_only_comment = review_comment::ActiveModel {
        id: NotSet,
        created_date: Set(Some(days_ago_datetime(1))),
        author_id: Set(Some(reviewer_id)),
        author_login_id: Set(Some("reviewer".to_string())),
        author_name: Set(Some("reviewer".to_string())),
        thread_id: Set(Some(commit_only_thread.id)),
    }
    .insert(db)
    .await
    .unwrap();
    write_text_column(
        db,
        "review_comment",
        "contents",
        commit_only_comment.id,
        "Specific commit review body",
    )
    .await;

    watch::ActiveModel {
        id: NotSet,
        user_id: Set(Some(contributor_id)),
        resource_type: Set(Some("PULL_REQUEST".to_string())),
        resource_id: Set(Some(pull_request.id.to_string())),
    }
    .insert(db)
    .await
    .unwrap();
}

#[tokio::test]
async fn pull_request_read_contract_serves_legacy_direct_state_helper() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, outsider_cookie, outsider_id) = register_user(app.clone(), "outsider").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;
    let pull_request = seed_pull_request(
        &db,
        &repo,
        "owner",
        "projectYobi",
        owner_id,
        owner_id,
        1,
        "Legacy state helper",
        6,
        false,
    )
    .await;
    pull_request::ActiveModel {
        id: Set(pull_request.id),
        is_merging: Set(Some(1)),
        merged_commit_id_to: Set(Some("merge-target".to_string())),
        ..Default::default()
    }
    .update(&db)
    .await
    .expect("mark PR merging");

    let state_json = response_json(
        rest_get_with_headers(
            app.clone(),
            "/yona/owner/projectYobi/pullRequest/1/state",
            Some(&owner_cookie),
            &[("x-requested-with", "XMLHttpRequest")],
        )
        .await,
    )
    .await;
    assert_eq!(state_json["id"], 1);
    assert_eq!(state_json["isOpen"], false);
    assert_eq!(state_json["isClosed"], false);
    assert_eq!(state_json["isMerged"], true);
    assert_eq!(state_json["isMerging"], true);
    assert_eq!(state_json["isConflict"], false);
    assert_eq!(state_json["canDeleteBranch"], false);
    assert_eq!(state_json["canRestoreBranch"], true);
    assert!(state_json["html"]
        .as_str()
        .unwrap()
        .contains(r#"id="pullRequestState""#));

    let state_html = rest_get(
        app.clone(),
        "/yona/owner/projectYobi/pullRequest/1/state",
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(state_html.status(), StatusCode::OK);
    let content_type = state_html
        .headers()
        .get(http::header::CONTENT_TYPE)
        .unwrap()
        .to_str()
        .unwrap()
        .to_string();
    let body = response_text(state_html).await;
    assert!(content_type.starts_with("text/html"));
    assert!(body.contains(r#"data-state="merged""#));

    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    set_code_member_only(&db, project.id).await;
    let denied = rest_get_with_headers(
        app,
        "/yona/owner/projectYobi/pullRequest/1/state",
        Some(&outsider_cookie),
        &[("x-requested-with", "XMLHttpRequest")],
    )
    .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
    assert_ne!(outsider_id, owner_id);
}

#[tokio::test]
// Guards PR read JSON plus route-utils-owned query parsing and code project filtering.
async fn pull_request_read_surface_returns_lists_detail_changes_reviews_and_org_aggregate() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (reviewer_csrf, reviewer_cookie, reviewer_id) =
        register_user(app.clone(), "reviewer").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;
    let linked_issue = response_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "PR linked issue",
                "bodyMarkdown": "issue target"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(linked_issue["issueNumber"], "1");
    create_organization(app.clone(), &owner_cookie, &owner_csrf, "acme").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "targetRepo",
        "public",
    )
    .await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "forkRepo",
        "public",
    )
    .await;
    create_project(
        app.clone(),
        &reviewer_cookie,
        &reviewer_csrf,
        "reviewer",
        "projectYobi",
        "public",
    )
    .await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "acme",
        "orgRepo",
        "public",
    )
    .await;

    let origin_project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    let reviewer_fork = repo
        .read_project_by_owner_and_name("reviewer", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    db.execute(Statement::from_sql_and_values(
        db.get_database_backend(),
        "UPDATE project SET original_project_id = ? WHERE id = ?",
        vec![origin_project.id.into(), reviewer_fork.id.into()],
    ))
    .await
    .expect("link reviewer fork origin");
    let recent_pushed_branch = project_pushed_branch::ActiveModel {
        id: NotSet,
        pushed_date: Set(Some(DateTimeUtc::from(SystemTime::now()).naive_utc())),
        name: Set(Some("refs/heads/topic/recent".to_string())),
        project_id: Set(Some(reviewer_fork.id)),
    }
    .insert(&db)
    .await
    .expect("seed recently pushed branch");

    let open = seed_pull_request(
        &db,
        &repo,
        "owner",
        "projectYobi",
        owner_id,
        reviewer_id,
        1,
        "Open read surface",
        1,
        false,
    )
    .await;
    seed_pull_request_detail_rows(&db, &open, owner_id, reviewer_id).await;
    seed_pull_request(
        &db,
        &repo,
        "owner",
        "projectYobi",
        owner_id,
        reviewer_id,
        2,
        "Closed read surface",
        2,
        false,
    )
    .await;
    seed_pull_request_between(
        &db,
        &repo,
        "owner",
        "forkRepo",
        "owner",
        "projectYobi",
        owner_id,
        reviewer_id,
        6,
        "Merged read surface",
        6,
        false,
    )
    .await;
    seed_pull_request(
        &db,
        &repo,
        "owner",
        "projectYobi",
        owner_id,
        reviewer_id,
        3,
        "Conflict read surface",
        1,
        true,
    )
    .await;
    seed_pull_request_between(
        &db,
        &repo,
        "owner",
        "projectYobi",
        "owner",
        "targetRepo",
        owner_id,
        reviewer_id,
        4,
        "Outbound sent surface",
        1,
        false,
    )
    .await;
    seed_pull_request_between(
        &db,
        &repo,
        "owner",
        "forkRepo",
        "owner",
        "projectYobi",
        owner_id,
        reviewer_id,
        5,
        "Inbound fork surface",
        1,
        false,
    )
    .await;
    seed_pull_request(
        &db,
        &repo,
        "acme",
        "orgRepo",
        owner_id,
        reviewer_id,
        1,
        "Organization read surface",
        1,
        false,
    )
    .await;

    let open_list = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests?category=open&filter=read&pageNum=1",
            Some(&reviewer_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(open_list["category"], "open");
    assert_eq!(open_list["pageSize"], 15);
    assert_eq!(open_list["totalCount"], 2);
    assert_eq!(open_list["openCount"], 2);
    assert_eq!(open_list["closedCount"], 2);
    assert_eq!(open_list["items"].as_array().unwrap().len(), 2);
    assert!(open_list["contributors"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["loginId"] == "owner"));
    assert_eq!(open_list["items"][0]["title"], "Open read surface");
    assert_eq!(open_list["items"][0]["projectName"], "projectYobi");
    assert_eq!(open_list["items"][0]["pullRequestNumber"], 1);
    assert_eq!(open_list["items"][0]["closedCommentThreadCount"], 0);
    assert_eq!(
        open_list["recentlyPushedBranches"][0]["ownerName"],
        "reviewer"
    );
    assert_eq!(
        open_list["recentlyPushedBranches"][0]["projectName"],
        "projectYobi"
    );
    assert_eq!(
        open_list["recentlyPushedBranches"][0]["branchName"],
        "refs/heads/topic/recent"
    );
    assert_eq!(
        open_list["recentlyPushedBranches"][0]["shortName"],
        "topic/recent"
    );
    assert_eq!(
        open_list["recentlyPushedBranches"][0]["defaultBranch"],
        "HEAD"
    );
    let delete_response = direct_delete(
        app.clone(),
        &format!(
            "/yona/reviewer/projectYobi/pushedBranch/{}/delete",
            recent_pushed_branch.id
        ),
        &reviewer_cookie,
        &reviewer_csrf,
    )
    .await;
    assert_eq!(delete_response.status(), StatusCode::OK);
    let open_list_after_delete = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests?category=open&filter=read&pageNum=1",
            Some(&reviewer_cookie),
        )
        .await,
    )
    .await;
    assert!(open_list_after_delete["recentlyPushedBranches"]
        .as_array()
        .unwrap()
        .is_empty());
    assert!(open_list["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["state"] == "conflict"));

    let closed_list = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests?category=closed",
            Some(&reviewer_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(closed_list["totalCount"], 2);
    assert!(!closed_list["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["state"] == "conflict"));
    assert!(closed_list["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["state"] == "merged"));

    let sent_list = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests?category=sent",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(sent_list["category"], "sent");
    assert_eq!(sent_list["totalCount"], 4);
    assert_eq!(sent_list["sentCount"], 4);
    assert!(sent_list["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["title"] == "Outbound sent surface"));
    assert!(!sent_list["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["title"] == "Inbound fork surface"));

    let detail = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1",
            Some(&reviewer_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(detail["pullRequestNumber"], 1);
    assert_eq!(
        detail["bodyMarkdown"],
        "Open read surface markdown body @reviewer @owner/projectYobi @ghost @owner/missing #1 owner/projectYobi#1 `<script>alert(1)</script> @reviewer #1`"
    );
    assert_eq!(detail["bodyHtml"].as_str().unwrap_or(""), "");
    let mention_targets = detail["mentionReferences"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| {
            (
                item["kind"].as_str().unwrap().to_string(),
                item["loginId"].as_str().unwrap_or_default().to_string(),
                item["ownerName"].as_str().unwrap_or_default().to_string(),
                item["projectName"].as_str().unwrap_or_default().to_string(),
            )
        })
        .collect::<Vec<_>>();
    assert!(mention_targets.contains(&(
        "user".to_string(),
        "reviewer".to_string(),
        String::new(),
        String::new()
    )));
    assert!(mention_targets.contains(&(
        "project".to_string(),
        String::new(),
        "owner".to_string(),
        "projectYobi".to_string()
    )));
    assert!(
        !mention_targets
            .iter()
            .any(|(_, login_id, owner_name, project_name)| {
                login_id == "ghost" || owner_name == "owner" && project_name == "missing"
            }),
        "{mention_targets:?}"
    );
    assert_eq!(detail["contributor"]["loginId"], "owner");
    assert!(detail["contributor"]["avatarUrl"]
        .as_str()
        .unwrap_or_default()
        .starts_with("https://www.gravatar.com/avatar/"));
    assert_eq!(detail["receiver"]["loginId"], "reviewer");
    assert_eq!(detail["reviewers"][0]["loginId"], "reviewer");
    assert!(detail["reviewers"][0]["avatarUrl"]
        .as_str()
        .unwrap_or_default()
        .starts_with("https://www.gravatar.com/avatar/"));
    assert_eq!(detail["commits"][0]["commitShortId"], "abcdef1");
    assert_eq!(detail["events"][0]["eventType"], "NEW_PULL_REQUEST");
    assert_eq!(
        detail["events"][1]["eventType"],
        "PULL_REQUEST_COMMIT_CHANGED"
    );
    assert_eq!(detail["events"][1]["oldValue"], "basehash");
    assert_eq!(
        detail["events"][1]["commits"][0]["commitShortId"],
        "1234567"
    );
    assert_eq!(detail["events"][1]["commits"][0]["state"], "PRIOR");
    assert_eq!(
        detail["events"][1]["commits"][1]["commitShortId"],
        "abcdef1"
    );
    assert_eq!(
        detail["threads"][0]["comments"][0]["contentsMarkdown"],
        "Review comment body @reviewer @owner/projectYobi @ghost @owner/missing #1 owner/projectYobi#1 `<script>alert(1)</script> @reviewer #1`"
    );
    assert!(
        detail["threads"][0]["authorAvatarUrl"]
            .as_str()
            .unwrap_or_default()
            .contains("gravatar.com/avatar/"),
        "{}",
        detail["threads"][0]["authorAvatarUrl"]
    );
    assert_eq!(
        detail["threads"][0]["comments"][0]["mentionReferences"],
        detail["mentionReferences"]
    );
    assert_eq!(detail["threads"][0]["comments"][0]["viaEmail"], true);
    assert_eq!(
        detail["threads"][0]["comments"][0]["attachments"][0]["name"],
        "review-note.png"
    );
    assert_eq!(
        detail["threads"][0]["comments"][0]["attachments"][0]["url"],
        "/yona/files/1"
    );
    assert_eq!(
        detail["threads"][0]["comments"][0]["contentsHtml"]
            .as_str()
            .unwrap_or(""),
        ""
    );
    assert_eq!(detail["watcherCount"], 2);
    assert_eq!(detail["isWatching"], true);
    assert_eq!(detail["permissions"]["canRead"], true);
    assert_eq!(detail["permissions"]["canReadChanges"], true);
    assert_eq!(detail["permissions"]["canComment"], true);
    assert_eq!(detail["permissions"]["canReview"], true);

    let changes = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/changes",
            Some(&reviewer_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(changes["pullRequest"]["pullRequestNumber"], 1);
    assert_eq!(changes["commits"].as_array().unwrap().len(), 0);
    assert_eq!(changes["files"].as_array().unwrap().len(), 0);
    assert_eq!(changes["threads"][0]["path"], "src/lib.rs");
    assert!(
        changes["threads"][0]["authorAvatarUrl"]
            .as_str()
            .unwrap_or_default()
            .contains("gravatar.com/avatar/"),
        "{}",
        changes["threads"][0]["authorAvatarUrl"]
    );
    assert_eq!(changes["threads"][0]["comments"][0]["viaEmail"], true);
    assert_eq!(
        changes["threads"][0]["comments"][0]["attachments"][0]["mimeType"],
        "image/png"
    );
    assert_eq!(changes["cardThreads"].as_array().unwrap().len(), 3);
    assert!(
        changes["cardThreads"][0]["authorAvatarUrl"]
            .as_str()
            .unwrap_or_default()
            .contains("gravatar.com/avatar/"),
        "{}",
        changes["cardThreads"][0]["authorAvatarUrl"]
    );
    assert_eq!(changes["inlineThreads"].as_array().unwrap().len(), 1);
    assert_eq!(changes["inlineThreads"][0]["path"], "src/lib.rs");
    assert_eq!(changes["nonRangedThreads"].as_array().unwrap().len(), 1);
    assert_eq!(
        changes["nonRangedThreads"][0]["comments"][0]["contentsMarkdown"],
        "Non-ranged review body"
    );

    let specific_changes = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1/changes?commitId=abcdef123456",
            Some(&reviewer_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(specific_changes["cardThreads"].as_array().unwrap().len(), 3);
    assert_eq!(
        specific_changes["inlineThreads"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|thread| thread["path"].as_str().unwrap_or_default() == "src/lib.rs")
            .count(),
        1
    );
    assert_eq!(
        specific_changes["inlineThreads"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|thread| thread["path"].as_str().unwrap_or_default() == "src/commit-only.rs")
            .count(),
        1
    );
    assert_eq!(
        specific_changes["nonRangedThreads"]
            .as_array()
            .unwrap()
            .len(),
        1
    );

    let older_thread_with_newer_comment = comment_thread::ActiveModel {
        dtype: Set("ReviewThread".to_string()),
        id: NotSet,
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        state: Set(Some("open".to_string())),
        created_date: Set(Some(days_ago_datetime(10))),
        pull_request_id: Set(Some(open.id)),
        project_id: Set(open.to_project_id),
        prev_commit_id: Set(Some("base".to_string())),
        commit_id: Set(Some("abcdef123456".to_string())),
        path: Set(Some("src/newer-comment.rs".to_string())),
        start_side: Set(None),
        start_line: Set(Some(3)),
        start_column: Set(None),
        end_side: Set(None),
        end_line: Set(Some(4)),
        end_column: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    let newer_comment = review_comment::ActiveModel {
        id: NotSet,
        created_date: Set(Some(days_ago_datetime(0))),
        author_id: Set(Some(reviewer_id)),
        author_login_id: Set(Some("reviewer".to_string())),
        author_name: Set(Some("reviewer".to_string())),
        thread_id: Set(Some(older_thread_with_newer_comment.id)),
    }
    .insert(&db)
    .await
    .unwrap();
    write_text_column(
        &db,
        "review_comment",
        "contents",
        newer_comment.id,
        "Newest update comment",
    )
    .await;
    original_email::ActiveModel {
        id: NotSet,
        message_id: Set(Some("<pr-review-comment-newest@example.com>".to_string())),
        resource_type: Set(Some("REVIEW_COMMENT".to_string())),
        resource_id: Set(Some(newer_comment.id.to_string())),
        handled_date: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();

    let reviews = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/reviews?state=open&filter=comment&participantId=2&orderBy=updatedDate&orderDir=desc",
            Some(&reviewer_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(reviews["state"], "open");
    assert_eq!(reviews["pageSize"], 15);
    assert_eq!(reviews["allCount"], 2);
    assert_eq!(reviews["participantCount"], 2);
    assert_eq!(reviews["authorCount"], 0);
    assert_eq!(reviews["openCount"], 2);
    assert_eq!(reviews["closedCount"], 0);
    assert_eq!(reviews["items"][0]["path"], "src/newer-comment.rs");
    assert_eq!(reviews["items"][0]["pullRequestNumber"], 1);
    assert_eq!(
        reviews["items"][0]["comments"][0]["authorLoginId"],
        "reviewer"
    );
    assert_eq!(reviews["items"][0]["comments"][0]["viaEmail"], true);
    assert!(
        reviews["items"]
            .as_array()
            .unwrap()
            .iter()
            .flat_map(|item| item["comments"].as_array().unwrap().iter())
            .any(|comment| comment["attachments"][0]["name"] == "review-note.png"),
        "{}",
        reviews["items"]
    );

    comment_thread::ActiveModel {
        dtype: Set("ReviewThread".to_string()),
        id: NotSet,
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        state: Set(Some("CLOSED".to_string())),
        created_date: Set(Some(days_ago_datetime(2))),
        pull_request_id: Set(Some(open.id)),
        project_id: Set(open.to_project_id),
        prev_commit_id: Set(Some("base".to_string())),
        commit_id: Set(Some("abcdef123456".to_string())),
        path: Set(Some("src/closed-thread.rs".to_string())),
        start_side: Set(None),
        start_line: Set(Some(5)),
        start_column: Set(None),
        end_side: Set(None),
        end_line: Set(Some(6)),
        end_column: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    let closed_reviews = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/owners/owner/projects/projectYobi/reviews?state=closed",
            Some(&reviewer_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(closed_reviews["state"], "closed");
    assert_eq!(closed_reviews["openCount"], 4);
    assert_eq!(closed_reviews["closedCount"], 1);
    assert_eq!(closed_reviews["totalCount"], 1);
    assert_eq!(closed_reviews["items"][0]["path"], "src/closed-thread.rs");
    assert!(
        closed_reviews["items"][0]["authorAvatarUrl"]
            .as_str()
            .unwrap_or_default()
            .contains("gravatar.com/avatar/"),
        "{}",
        closed_reviews["items"][0]["authorAvatarUrl"]
    );

    let org_list = response_json(
        rest_get(
            app,
            "/yona/api/v1/organizations/acme/pull-requests?category=open&filter=organization",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_list["category"], "open");
    assert_eq!(org_list["totalCount"], 1);
    assert_eq!(org_list["items"][0]["ownerName"], "acme");
}

#[tokio::test]
async fn pull_request_read_surface_maps_forbidden_and_not_found() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, guest_cookie, guest_id) = register_user(app.clone(), "guest").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;
    let public_project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    seed_pull_request(
        &db,
        &repo,
        "owner",
        "projectYobi",
        owner_id,
        owner_id,
        1,
        "Member-only code PR",
        1,
        false,
    )
    .await;
    set_code_member_only(&db, public_project.id).await;

    let forbidden = rest_get(
        app.clone(),
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/1",
        Some(&guest_cookie),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    create_organization(app.clone(), &owner_cookie, &owner_csrf, "acme").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "acme",
        "memberOnlyRepo",
        "public",
    )
    .await;
    let org_project = repo
        .read_project_by_owner_and_name("acme", "memberOnlyRepo")
        .await
        .unwrap()
        .unwrap();
    seed_pull_request(
        &db,
        &repo,
        "acme",
        "memberOnlyRepo",
        owner_id,
        owner_id,
        1,
        "Organization member-only code PR",
        1,
        false,
    )
    .await;
    set_code_member_only(&db, org_project.id).await;
    let org_hidden = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/organizations/acme/pull-requests?category=open",
            Some(&guest_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(org_hidden["totalCount"], 0);

    let missing = rest_get(
        app.clone(),
        "/yona/api/v1/owners/owner/projects/projectYobi/pull-requests/404",
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);

    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "privateRepo",
        "private",
    )
    .await;
    seed_pull_request(
        &db,
        &repo,
        "owner",
        "privateRepo",
        owner_id,
        owner_id,
        1,
        "Private PR",
        1,
        false,
    )
    .await;

    let private_forbidden = rest_get(
        app,
        "/yona/api/v1/owners/owner/projects/privateRepo/pull-requests/1",
        Some(&guest_cookie),
    )
    .await;
    assert_eq!(private_forbidden.status(), StatusCode::FORBIDDEN);
    assert_ne!(guest_id, owner_id);
}
