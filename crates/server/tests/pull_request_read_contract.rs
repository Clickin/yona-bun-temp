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
    comment_thread, pull_request, pull_request_commit, pull_request_event, pull_request_reviewers,
    review_comment, watch, AppRepository,
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
    write_text_column(
        db,
        "pull_request",
        "body",
        created.id,
        &format!("{title} markdown body"),
    )
    .await;
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
        "Review comment body",
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
async fn pull_request_read_surface_returns_lists_detail_changes_reviews_and_org_aggregate() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, reviewer_cookie, reviewer_id) = register_user(app.clone(), "reviewer").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;
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
        &owner_cookie,
        &owner_csrf,
        "acme",
        "orgRepo",
        "public",
    )
    .await;

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
    assert_eq!(open_list["items"][0]["title"], "Open read surface");
    assert_eq!(open_list["items"][0]["pullRequestNumber"], 1);
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
    assert_eq!(detail["bodyMarkdown"], "Open read surface markdown body");
    assert!(detail["bodyHtml"]
        .as_str()
        .unwrap()
        .contains("Open read surface markdown body"));
    assert_eq!(detail["contributor"]["loginId"], "owner");
    assert_eq!(detail["receiver"]["loginId"], "reviewer");
    assert_eq!(detail["reviewers"][0]["loginId"], "reviewer");
    assert_eq!(detail["commits"][0]["commitShortId"], "abcdef1");
    assert_eq!(detail["events"][0]["eventType"], "NEW_PULL_REQUEST");
    assert_eq!(
        detail["threads"][0]["comments"][0]["contentsMarkdown"],
        "Review comment body"
    );
    assert_eq!(detail["watcherCount"], 1);
    assert_eq!(detail["isWatching"], false);
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
    assert_eq!(reviews["openCount"], 2);
    assert_eq!(reviews["closedCount"], 0);
    assert_eq!(reviews["items"][0]["path"], "src/newer-comment.rs");
    assert_eq!(
        reviews["items"][0]["comments"][0]["authorLoginId"],
        "reviewer"
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
    assert_eq!(closed_reviews["openCount"], 2);
    assert_eq!(closed_reviews["closedCount"], 1);
    assert_eq!(closed_reviews["totalCount"], 1);
    assert_eq!(closed_reviews["items"][0]["path"], "src/closed-thread.rs");

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
