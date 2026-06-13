use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, NotSet,
    PaginatorTrait, QueryFilter, Set,
};
use serde_json::json;
use tower::ServiceExt;
use yona_rust_persistence::{
    issue, issue_event, n4user, notification_event, notification_event_n4user, AppRepository,
    CreateProjectInput,
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

fn json_bool(value: &serde_json::Value, key: &str) -> bool {
    value
        .get(key)
        .and_then(|item| item.as_bool())
        .unwrap_or(false)
}

fn json_array_len(value: &serde_json::Value, key: &str) -> usize {
    value
        .get(key)
        .and_then(|item| item.as_array())
        .map(Vec::len)
        .unwrap_or_default()
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

async fn rest(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
) -> Response<Body> {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }

    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
}

async fn rest_json(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: serde_json::Value,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header(http::header::CONTENT_TYPE, "application/json");
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }

    app.oneshot(builder.body(Body::from(payload.to_string())).unwrap())
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

async fn update_user_profile(
    db: &DatabaseConnection,
    login_id: &str,
    name: &str,
    english_name: Option<&str>,
    state: &str,
) {
    let user = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some(login_id.to_string())))
        .one(db)
        .await
        .unwrap()
        .expect("user");
    let mut active = n4user::ActiveModel::from(user);
    active.name = Set(Some(name.to_string()));
    active.english_name = Set(english_name.map(str::to_string));
    active.state = Set(Some(state.to_string()));
    active.update(db).await.unwrap();
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str, scope: &str) {
    response_json(
        rpc(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "overview": "Issue sharer parity",
                "projectScope": scope
            }),
        )
        .await,
    )
    .await;
}

async fn create_issue(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    title: &str,
) -> serde_json::Value {
    response_json(
        rpc(
            app,
            "CreateIssue",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": title,
                "bodyMarkdown": "body"
            }),
        )
        .await,
    )
    .await
}

fn login_ids(payload: &serde_json::Value) -> Vec<String> {
    payload["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["loginId"].as_str().unwrap().to_string())
        .collect()
}

fn item_types(payload: &serde_json::Value) -> Vec<String> {
    payload["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["type"].as_str().unwrap().to_string())
        .collect()
}

#[tokio::test]
async fn issue_sharer_contract_searches_sharable_active_users_with_issue_read_acl() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, outsider_cookie, _) = register_user(app.clone(), "outsider").await;
    register_user(app.clone(), "matchterm-login").await;
    register_user(app.clone(), "name-holder").await;
    register_user(app.clone(), "english-holder").await;
    register_user(app.clone(), "matchterm-locked").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;

    update_user_profile(&db, "name-holder", "Matchterm Name", None, "active").await;
    update_user_profile(
        &db,
        "english-holder",
        "Plain Name",
        Some("Matchterm English"),
        "active",
    )
    .await;
    update_user_profile(&db, "matchterm-locked", "Matchterm Locked", None, "locked").await;

    let blank = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharable-users?query=",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(blank["total"], 0);
    assert_eq!(blank["items"].as_array().unwrap().len(), 0);

    let broad = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharable-users?query=matchterm",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(broad["total"], 3);
    assert_eq!(broad["truncated"], false);
    let broad_login_ids = login_ids(&broad);
    assert!(broad_login_ids.contains(&"matchterm-login".to_string()));
    assert!(broad_login_ids.contains(&"name-holder".to_string()));
    assert!(broad_login_ids.contains(&"english-holder".to_string()));
    assert!(!broad_login_ids.contains(&"matchterm-locked".to_string()));

    let exact_name = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharable-users?query=Matchterm%20Name&type=name",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&exact_name), vec!["name-holder".to_string()]);

    let denied = rest(
        app,
        Method::GET,
        "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharable-users?query=matchterm",
        Some(&outsider_cookie),
    )
    .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn issue_sharer_contract_searches_public_project_targets() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    register_user(app.clone(), "member").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;
    let public_project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "member".to_string(),
            overview: Some("Target public project".to_string()),
            project_name: "targetShare".to_string(),
            project_scope: "public".to_string(),
        })
        .await
        .unwrap();
    repo.create_project(CreateProjectInput {
        organization_id: None,
        owner_name: "member".to_string(),
        overview: Some("Target private project".to_string()),
        project_name: "targetSecret".to_string(),
        project_scope: "private".to_string(),
    })
    .await
    .unwrap();

    let payload = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharable-users?query=target",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;

    let project_id = public_project.id.to_string();
    assert!(login_ids(&payload).contains(&project_id));
    assert!(item_types(&payload).contains(&"project".to_string()));
    assert!(payload["items"].as_array().unwrap().iter().any(|item| {
        item["loginId"] == project_id
            && item["displayName"] == "member/targetShare"
            && item["type"] == "project"
    }));
    assert!(!payload["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| { item["displayName"] == "member/targetSecret" }));
    drop(db);
}

#[tokio::test]
async fn issue_sharer_contract_caps_large_sharable_results_by_user_and_project() {
    let (app, repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;

    for index in 0..6 {
        register_user(app.clone(), &format!("target-user-{index}")).await;
    }

    for index in 0..6 {
        repo.create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "owner".to_string(),
            overview: Some(format!("Target project {index}")),
            project_name: format!("targetProject{index}"),
            project_scope: "public".to_string(),
        })
        .await
        .unwrap();
    }

    let payload = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharable-users?query=target",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;

    assert_eq!(payload["total"], 12);
    assert_eq!(payload["truncated"], true);
    assert_eq!(payload["items"].as_array().unwrap().len(), 10);
    assert_eq!(
        item_types(&payload)
            .into_iter()
            .filter(|item_type| item_type == "user")
            .count(),
        5
    );
    assert_eq!(
        item_types(&payload)
            .into_iter()
            .filter(|item_type| item_type == "project")
            .count(),
        5
    );
}

#[tokio::test]
async fn issue_sharer_contract_project_target_mutation_expands_project_members() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, _, guest_id) = register_user(app.clone(), "guest").await;
    let (_, _, other_id) = register_user(app.clone(), "other").await;
    register_user(app.clone(), "target-owner").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;

    let target_project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "target-owner".to_string(),
            overview: Some("Bulk target".to_string()),
            project_name: "targetShare".to_string(),
            project_scope: "public".to_string(),
        })
        .await
        .unwrap();
    repo.add_project_membership(target_project.id, guest_id, "member")
        .await
        .unwrap();
    repo.add_project_membership(target_project.id, other_id, "member")
        .await
        .unwrap();

    let shared = response_json(
        rest_json(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharers",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "loginId": target_project.id.to_string(),
                "targetType": "project"
            }),
        )
        .await,
    )
    .await;
    let mut sharers = shared["sharers"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["loginId"].as_str().unwrap().to_string())
        .collect::<Vec<_>>();
    sharers.sort();
    assert_eq!(sharers, vec!["guest".to_string(), "other".to_string()]);

    let noti_events = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("ISSUE_SHARER_CHANGED".to_string())))
        .all(&db)
        .await
        .unwrap();
    assert_eq!(noti_events.len(), 2);
    assert!(noti_events
        .iter()
        .all(|event| event.sender_id == Some(owner_id)));
    assert_eq!(
        notification_event_n4user::Entity::find_by_id((noti_events[0].id, guest_id))
            .one(&db)
            .await
            .unwrap()
            .is_some()
            || notification_event_n4user::Entity::find_by_id((noti_events[1].id, guest_id))
                .one(&db)
                .await
                .unwrap()
                .is_some(),
        true
    );

    let unshared = response_json(
        rest_json(
            app,
            Method::DELETE,
            &format!(
                "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharers/{}?targetType=project",
                target_project.id
            ),
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({}),
        )
        .await,
    )
    .await;
    assert_eq!(json_array_len(&unshared, "sharers"), 0);
}

#[tokio::test]
async fn issue_sharer_contract_rejects_unsupported_target_type() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Public issue").await;

    let unsupported = rest_json(
        app,
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/sharers",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({
            "loginId": "guest",
            "targetType": "group"
        }),
    )
    .await;

    assert_eq!(unsupported.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn issue_sharer_contract_records_timeline_and_notification_only_on_changed_rows() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, _, guest_id) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;

    response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;

    let after_duplicate = response_json(
        rpc(
            app.clone(),
            "ReadIssueDetail",
            Some(&owner_cookie),
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1"
            }),
        )
        .await,
    )
    .await;
    let share_events = after_duplicate["timeline"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|item| item["eventType"] == "ISSUE_SHARER_CHANGED")
        .collect::<Vec<_>>();
    assert_eq!(share_events.len(), 1);
    assert_eq!(
        share_events[0]
            .get("oldValue")
            .and_then(|value| value.as_str())
            .unwrap_or_default(),
        ""
    );
    assert_eq!(share_events[0]["newValue"], "guest");

    let noti_events = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("ISSUE_SHARER_CHANGED".to_string())))
        .all(&db)
        .await
        .unwrap();
    assert_eq!(noti_events.len(), 1);
    assert_eq!(noti_events[0].sender_id, Some(owner_id));
    let receiver = notification_event_n4user::Entity::find_by_id((noti_events[0].id, guest_id))
        .one(&db)
        .await
        .unwrap();
    assert!(receiver.is_some());

    response_json(
        rpc(
            app.clone(),
            "UnshareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    response_json(
        rpc(
            app.clone(),
            "UnshareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;

    let all_events = issue_event::Entity::find()
        .filter(issue_event::Column::EventType.eq(Some("ISSUE_SHARER_CHANGED".to_string())))
        .all(&db)
        .await
        .unwrap();
    assert_eq!(all_events.len(), 2);
    assert_eq!(
        notification_event::Entity::find()
            .filter(
                notification_event::Column::EventType.eq(Some("ISSUE_SHARER_CHANGED".to_string()))
            )
            .count(&db)
            .await
            .unwrap(),
        2
    );
}

#[tokio::test]
async fn issue_sharer_contract_shares_unshares_and_keeps_duplicate_single_row() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, _, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;

    let shared = response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(shared["sharers"].as_array().unwrap().len(), 1);
    assert_eq!(shared["sharers"][0]["loginId"], "guest");
    assert_eq!(shared["viewerCanManageSharers"], true);

    let duplicate = response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(duplicate["sharers"].as_array().unwrap().len(), 1);

    let unshared = response_json(
        rpc(
            app.clone(),
            "UnshareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(json_array_len(&unshared, "sharers"), 0);

    let unchanged = response_json(
        rpc(
            app,
            "UnshareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(json_array_len(&unchanged, "sharers"), 0);
}

#[tokio::test]
async fn issue_sharer_contract_allows_direct_shared_read_and_comment_only() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    let (outsider_csrf, outsider_cookie, _) = register_user(app.clone(), "outsider").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Private issue").await;

    let forbidden_before_share = rpc(
        app.clone(),
        "ReadIssueDetail",
        Some(&guest_cookie),
        None,
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1"
        }),
    )
    .await;
    assert_eq!(forbidden_before_share.status(), StatusCode::FORBIDDEN);

    response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;

    let guest_detail = response_json(
        rpc(
            app.clone(),
            "ReadIssueDetail",
            Some(&guest_cookie),
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1"
            }),
        )
        .await,
    )
    .await;
    assert!(json_bool(&guest_detail, "viewerIsDirectSharer"));
    assert!(!json_bool(&guest_detail, "viewerHasInheritedShare"));
    assert!(json_bool(&guest_detail, "viewerCanComment"));
    assert!(!json_bool(&guest_detail, "viewerCanUpdate"));
    assert!(!json_bool(&guest_detail, "viewerCanDelete"));
    assert!(!json_bool(&guest_detail, "viewerCanManageSharers"));

    let commented = response_json(
        rpc(
            app.clone(),
            "CreateIssueComment",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "contentsMarkdown": "shared comment"
            }),
        )
        .await,
    )
    .await;
    let comment_id = commented["comments"][0]["id"].clone();
    assert_eq!(commented["comments"][0]["authorLoginId"], "guest");

    let denied_update = rpc(
        app.clone(),
        "UpdateIssue",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "title": "forbidden",
            "bodyMarkdown": "forbidden"
        }),
    )
    .await;
    assert_eq!(denied_update.status(), StatusCode::FORBIDDEN);

    let denied_state = rpc(
        app.clone(),
        "UpdateIssueState",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "state": "closed"
        }),
    )
    .await;
    assert_eq!(denied_state.status(), StatusCode::FORBIDDEN);

    let updated_own_comment = response_json(
        rpc(
            app.clone(),
            "UpdateIssueComment",
            Some(&guest_cookie),
            Some(&guest_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "commentId": comment_id,
                "contentsMarkdown": "edited shared comment"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(
        updated_own_comment["comments"][0]["contentsMarkdown"],
        "edited shared comment"
    );

    let denied_other_comment = rpc(
        app,
        "UpdateIssueComment",
        Some(&outsider_cookie),
        Some(&outsider_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "commentId": comment_id,
            "contentsMarkdown": "outsider edit"
        }),
    )
    .await;
    assert_eq!(denied_other_comment.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn issue_sharer_contract_parent_share_grants_child_read_only() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "private").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Parent issue").await;

    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    let parent = repo
        .read_issue_detail("owner", "projectYobi", 1)
        .await
        .unwrap()
        .unwrap();
    issue::ActiveModel {
        id: NotSet,
        title: Set(Some("Child issue".to_string())),
        created_date: Set(None),
        updated_date: Set(None),
        author_id: Set(Some(owner_id)),
        author_login_id: Set(Some("owner".to_string())),
        author_name: Set(Some("owner".to_string())),
        project_id: Set(Some(project.id)),
        number: Set(Some(2)),
        num_of_comments: Set(Some(0)),
        state: Set(Some(0)),
        due_date: Set(None),
        milestone_id: Set(None),
        assignee_id: Set(None),
        parent_id: Set(Some(parent.id)),
        weight: Set(None),
        updated_by_author_id: Set(None),
        is_draft: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();

    response_json(
        rpc(
            app.clone(),
            "ShareIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "loginId": "guest"
            }),
        )
        .await,
    )
    .await;

    let child_detail = response_json(
        rpc(
            app.clone(),
            "ReadIssueDetail",
            Some(&guest_cookie),
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "2"
            }),
        )
        .await,
    )
    .await;
    assert!(!json_bool(&child_detail, "viewerIsDirectSharer"));
    assert!(json_bool(&child_detail, "viewerHasInheritedShare"));
    assert!(!json_bool(&child_detail, "viewerCanComment"));
    assert!(!json_bool(&child_detail, "viewerCanUpdate"));

    let denied_child_comment = rpc(
        app.clone(),
        "CreateIssueComment",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "2",
            "contentsMarkdown": "not directly shared"
        }),
    )
    .await;
    assert_eq!(denied_child_comment.status(), StatusCode::FORBIDDEN);

    let parent_from_child_share = rpc(
        app,
        "ReadIssueDetail",
        Some(&guest_cookie),
        None,
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1"
        }),
    )
    .await;
    assert_eq!(parent_from_child_share.status(), StatusCode::OK);
}

#[tokio::test]
async fn issue_sharer_contract_rejects_unknown_login_and_unauthorized_manager() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie, _) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf, "public").await;
    create_issue(app.clone(), &owner_cookie, &owner_csrf, "Public issue").await;

    let unknown = rpc(
        app.clone(),
        "ShareIssue",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "loginId": "missing"
        }),
    )
    .await;
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);

    let denied = rpc(
        app,
        "ShareIssue",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "issueNumber": "1",
            "loginId": "owner"
        }),
    )
    .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
}
