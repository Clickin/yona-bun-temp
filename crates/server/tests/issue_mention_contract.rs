use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter, Set,
};
use serde_json::json;
use tower::ServiceExt;
use yoram_persistence::{
    mention, n4user, notification_event, notification_event_n4user, AppRepository,
};
use yoram_migration::Migrator;
use yoram_server::{create_router_with_app_repository, RuntimeConfig};

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

async fn update_user_state(db: &DatabaseConnection, login_id: &str, state: &str) {
    let user = n4user::Entity::find()
        .filter(n4user::Column::LoginId.eq(Some(login_id.to_string())))
        .one(db)
        .await
        .unwrap()
        .expect("user");
    let mut active = n4user::ActiveModel::from(user);
    active.state = Set(Some(state.to_string()));
    active.update(db).await.unwrap();
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
                "overview": "Issue mention parity",
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
    owner_name: &str,
    project_name: &str,
    title: &str,
    body: &str,
) -> serde_json::Value {
    response_json(
        rpc(
            app,
            "CreateIssue",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": owner_name,
                "projectName": project_name,
                "title": title,
                "bodyMarkdown": body
            }),
        )
        .await,
    )
    .await
}

fn int64_json(value: &serde_json::Value) -> i64 {
    value
        .as_i64()
        .or_else(|| value.as_str().and_then(|value| value.parse().ok()))
        .expect("int64 json")
}

async fn mentioned_user_ids(
    db: &DatabaseConnection,
    resource_type: &str,
    resource_id: i64,
) -> Vec<i64> {
    let mut ids = mention::Entity::find()
        .filter(mention::Column::ResourceType.eq(Some(resource_type.to_string())))
        .filter(mention::Column::ResourceId.eq(Some(resource_id.to_string())))
        .all(db)
        .await
        .unwrap()
        .into_iter()
        .filter_map(|row| row.user_id)
        .collect::<Vec<_>>();
    ids.sort_unstable();
    ids.dedup();
    ids
}

fn item_login_ids(payload: &serde_json::Value) -> Vec<String> {
    payload["items"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|item| item["type"] == "user")
        .map(|item| item["loginId"].as_str().unwrap().to_string())
        .collect()
}

#[tokio::test]
async fn issue_mention_contract_returns_renderable_mention_metadata_for_existing_targets() {
    let (app, _repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "testOwner").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "testOwner",
        "testProject",
        "public",
    )
    .await;

    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "testOwner",
        "testProject",
        "Mention metadata",
        "@testOwner @testOwner/testProject @nforge @nforge/yobi",
    )
    .await;
    response_json(
        rpc(
            app.clone(),
            "CreateIssueComment",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "testOwner",
                "projectName": "testProject",
                "issueNumber": 1,
                "contentsMarkdown": "@testOwner @testOwner/testProject @nforge"
            }),
        )
        .await,
    )
    .await;

    let detail = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/projects/testOwner/testProject/issues/1",
            None,
        )
        .await,
    )
    .await;
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
        "testowner".to_string(),
        String::new(),
        String::new()
    )));
    assert!(
        mention_targets.contains(&(
            "project".to_string(),
            String::new(),
            "testOwner".to_string(),
            "testProject".to_string()
        )),
        "{mention_targets:?}"
    );
    assert!(!mention_targets
        .iter()
        .any(|(_, login_id, owner_name, project_name)| {
            login_id == "nforge" || owner_name == "nforge" || project_name == "yobi"
        }));
    assert_eq!(
        detail["comments"][0]["mentionReferences"],
        detail["mentionReferences"]
    );
}

#[tokio::test]
// Guards the issues/lookups.rs autocomplete adapter split for mention users.
async fn issue_mention_contract_suggests_contextual_users_and_filters_private_search() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (member_csrf, member_cookie, member_id) =
        register_user(app.clone(), "project-member").await;
    let (_, _, org_member_id) = register_user(app.clone(), "org-member").await;
    let (_, _, shared_id) = register_user(app.clone(), "shared-user").await;
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
        .unwrap();
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "weblabs",
        "privateYobi",
        "private",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("weblabs", "privateYobi")
        .await
        .unwrap()
        .unwrap();
    repo.add_project_membership(project.id, member_id, "member")
        .await
        .unwrap();
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "weblabs",
        "privateYobi",
        "Private mention",
        "body",
    )
    .await;
    response_json(
        rpc(
            app.clone(),
            "CreateIssueComment",
            Some(&member_cookie),
            Some(&member_csrf),
            json!({
                "ownerName": "weblabs",
                "projectName": "privateYobi",
                "issueNumber": "1",
                "contentsMarkdown": "member comment"
            }),
        )
        .await,
    )
    .await;
    repo.add_issue_sharer(1, shared_id, "shared-user")
        .await
        .unwrap();

    let blank = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/weblabs/projects/privateYobi/issues/1/mention-users?query=&context=issue-comment",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    let blank_login_ids = item_login_ids(&blank);
    assert!(blank_login_ids.contains(&"owner".to_string()));
    assert!(blank_login_ids.contains(&"project-member".to_string()));
    assert!(blank_login_ids.contains(&"org-member".to_string()));
    assert!(blank_login_ids.contains(&"shared-user".to_string()));
    assert_eq!(blank_login_ids.last(), Some(&"owner".to_string()));
    assert!(blank["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["type"] == "organization" && item["loginId"] == "weblabs"));
    assert!(blank["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| { item["type"] == "project" && item["loginId"] == "weblabs/privateYobi" }));

    let private_nonblank = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/weblabs/projects/privateYobi/issues/1/mention-users?query=outsider&context=issue-comment",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert!(!item_login_ids(&private_nonblank).contains(&"outsider".to_string()));

    let denied = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/owners/weblabs/projects/privateYobi/issues/1/mention-users?query=project&context=issue-comment",
        Some(&outsider_cookie),
    )
    .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);

    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "publicYobi",
        "public",
    )
    .await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "publicYobi",
        "Public mention",
        "body",
    )
    .await;
    let public_nonblank = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/publicYobi/issues/1/mention-users?query=outsider&context=issue-body",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert!(item_login_ids(&public_nonblank).contains(&"outsider".to_string()));
    assert_eq!(owner_id, 1);
    drop(db);
}

#[tokio::test]
// Guards legacy project mention-list helpers through the app-scoped service
// snapshot used by direct project routes.
async fn issue_mention_contract_serves_legacy_project_mention_list_helpers() {
    let (app, repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, _, member_id) = register_user(app.clone(), "project-member").await;
    let (_, _, org_member_id) = register_user(app.clone(), "org-member").await;
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
        .unwrap();
    repo.add_organization_membership(organization.id, org_member_id, "org_member")
        .await
        .unwrap();
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "weblabs",
        "privateYobi",
        "private",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("weblabs", "privateYobi")
        .await
        .unwrap()
        .unwrap();
    repo.add_project_membership(project.id, member_id, "member")
        .await
        .unwrap();
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "weblabs",
        "privateYobi",
        "Legacy mention target",
        "body",
    )
    .await;

    let users = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/weblabs/privateYobi/mentionList?number=1&resourceType=ISSUE_POST&mentionType=user&query=",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    let user_items = users["result"].as_array().unwrap();
    assert!(user_items
        .iter()
        .any(|item| item["loginid"] == "owner" && item["name"] == "owner"));
    assert!(user_items
        .iter()
        .any(|item| item["loginid"] == "project-member"));
    assert!(user_items
        .iter()
        .any(|item| item["loginid"] == "weblabs/privateYobi"
            && item["name"] == "@project all:"
            && item["searchText"] == "weblabs/privateYobi/project/member/all"));
    assert!(user_items.iter().any(|item| item["loginid"] == "weblabs"
        && item["name"] == "@group all: "
        && item["searchText"] == "weblabs/group/org/member/all"));

    let issues = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/weblabs/privateYobi/mentionList?mentionType=issue&query=Legacy",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert!(issues["result"].as_array().unwrap().iter().any(|item| {
        item["issueNo"] == "1"
            && item["title"] == "Legacy mention target"
            && item["name"] == "1Legacy mention target"
    }));

    let commit_diff_alias = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/weblabs/privateYobi/mentionListAtCommitDiff?mentionType=user&query=project-member&commitId=abc123",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert!(commit_diff_alias["result"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["loginid"] == "project-member"));

    let denied = rest(
        app,
        Method::GET,
        "/yona/weblabs/privateYobi/mentionListAtPullRequest?mentionType=issue&pullRequestId=1",
        Some(&outsider_cookie),
    )
    .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn issue_mention_contract_indexes_issue_body_mentions_and_notifies_new_active_users() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (_, _, guest_id) = register_user(app.clone(), "guest").await;
    let (_, _, other_id) = register_user(app.clone(), "other").await;
    let (_, _, locked_id) = register_user(app.clone(), "locked-user").await;
    let (_, _, project_member_id) = register_user(app.clone(), "project-member").await;
    update_user_state(&db, "locked-user", "locked").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;
    let project = repo
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .unwrap()
        .unwrap();
    repo.add_project_membership(project.id, project_member_id, "member")
        .await
        .unwrap();

    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "Mentioned issue",
        "hello @guest @owner @owner/projectYobi @locked-user",
    )
    .await;
    let issue_id = repo
        .read_issue_detail("owner", "projectYobi", 1)
        .await
        .unwrap()
        .unwrap()
        .id;
    let mentioned_ids = mentioned_user_ids(&db, "issue_post", issue_id).await;
    assert!(mentioned_ids.contains(&guest_id));
    assert!(mentioned_ids.contains(&owner_id));
    assert!(mentioned_ids.contains(&project_member_id));
    assert!(!mentioned_ids.contains(&locked_id));

    let event = notification_event::Entity::find()
        .filter(notification_event::Column::EventType.eq(Some("NEW_ISSUE".to_string())))
        .one(&db)
        .await
        .unwrap()
        .expect("new issue mention event");
    assert_eq!(event.sender_id, Some(owner_id));
    assert!(
        notification_event_n4user::Entity::find_by_id((event.id, guest_id))
            .one(&db)
            .await
            .unwrap()
            .is_some()
    );
    assert!(
        notification_event_n4user::Entity::find_by_id((event.id, owner_id))
            .one(&db)
            .await
            .unwrap()
            .is_none()
    );
    assert_eq!(
        notification_event_n4user::Entity::find()
            .filter(notification_event_n4user::Column::NotificationEventId.eq(event.id))
            .filter(notification_event_n4user::Column::N4userId.eq(guest_id))
            .count(&db)
            .await
            .unwrap(),
        1
    );

    let mentioned = response_json(
        rpc(
            app.clone(),
            "ListUserIssues",
            Some(&owner_cookie),
            None,
            json!({
                "filter": "mentioned",
                "state": "open"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(mentioned["items"].as_array().unwrap().len(), 1);
    assert_eq!(mentioned["sideFilterCounts"]["mentioned"], 1);
    assert_eq!(mentioned["sideFilterCounts"]["shared"], 0);
    assert_eq!(mentioned["sideFilterCounts"]["favorite"], 0);

    response_json(
        rpc(
            app.clone(),
            "UpdateIssue",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "title": "Mentioned issue",
                "bodyMarkdown": "hello @guest @other contact@project-member.example"
            }),
        )
        .await,
    )
    .await;
    let updated_ids = mentioned_user_ids(&db, "issue_post", issue_id).await;
    assert!(updated_ids.contains(&guest_id));
    assert!(updated_ids.contains(&other_id));
    assert!(!updated_ids.contains(&project_member_id));
    assert_eq!(
        notification_event::Entity::find()
            .filter(
                notification_event::Column::EventType.eq(Some("ISSUE_BODY_CHANGED".to_string()))
            )
            .count(&db)
            .await
            .unwrap(),
        1
    );
}

#[tokio::test]
async fn issue_mention_contract_indexes_comment_mentions_and_replaces_them_on_update() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, guest_cookie, guest_id) = register_user(app.clone(), "guest").await;
    let (_, other_cookie, other_id) = register_user(app.clone(), "other").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "Comment mention",
        "body",
    )
    .await;

    let commented = response_json(
        rpc(
            app.clone(),
            "CreateIssueComment",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "contentsMarkdown": "hello @guest"
            }),
        )
        .await,
    )
    .await;
    let comment_id = int64_json(&commented["comments"][0]["id"]);
    assert_eq!(
        mentioned_user_ids(&db, "issue_comment", comment_id).await,
        vec![guest_id]
    );
    let guest_notifications = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/notifications?from=0&size=5",
            Some(&guest_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(guest_notifications["total"], 1);
    assert_eq!(guest_notifications["items"][0]["eventType"], "NEW_COMMENT");
    assert_eq!(guest_notifications["items"][0]["message"], "hello @guest");
    assert_eq!(guest_notifications["items"][0]["typeIcon"], "comment2");

    let guest_mentioned = response_json(
        rpc(
            app.clone(),
            "ListUserIssues",
            Some(&owner_cookie),
            None,
            json!({
                "filter": "mentioned",
                "state": "open"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(
        guest_mentioned
            .get("items")
            .and_then(|items| items.as_array())
            .map(Vec::len)
            .unwrap_or_default(),
        0
    );

    response_json(
        rpc(
            app.clone(),
            "UpdateIssueComment",
            Some(&owner_cookie),
            Some(&owner_csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "1",
                "commentId": comment_id,
                "contentsMarkdown": "hello @other"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(
        mentioned_user_ids(&db, "issue_comment", comment_id).await,
        vec![other_id]
    );
    assert_eq!(
        notification_event::Entity::find()
            .filter(notification_event::Column::EventType.eq(Some("NEW_COMMENT".to_string())))
            .count(&db)
            .await
            .unwrap(),
        1
    );
    assert_eq!(
        notification_event::Entity::find()
            .filter(notification_event::Column::EventType.eq(Some("COMMENT_UPDATED".to_string())))
            .count(&db)
            .await
            .unwrap(),
        1
    );
    let other_notifications = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/notifications?from=0&size=5",
            Some(&other_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(other_notifications["total"], 1);
    assert_eq!(
        other_notifications["items"][0]["eventType"],
        "COMMENT_UPDATED"
    );
    assert_eq!(other_notifications["items"][0]["message"], "hello @other");
    assert_eq!(
        other_notifications["items"][0]["typeIcon"],
        "ellipsis-horizontal"
    );
}
