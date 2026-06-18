use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, QueryFilter, Set,
};
use serde_json::{json, Value};
use tower::ServiceExt;
use yona_rust_persistence::{n4user, AppRepository};
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

async fn response_json(response: Response<Body>) -> Value {
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(status, StatusCode::OK, "{text}");
    serde_json::from_str(&text).expect("json response")
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
                "overview": "Assignable users parity",
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
) {
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
                "bodyMarkdown": title
            }),
        )
        .await,
    )
    .await;
}

async fn assign_issue(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    owner_name: &str,
    project_name: &str,
    login_id: &str,
) {
    response_json(
        rpc(
            app,
            "AssignIssue",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": owner_name,
                "projectName": project_name,
                "issueNumber": "1",
                "assigneeLoginId": login_id
            }),
        )
        .await,
    )
    .await;
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
        .expect("find user")
        .expect("user exists");
    let mut active = n4user::ActiveModel::from(user);
    active.name = Set(Some(name.to_string()));
    active.english_name = Set(english_name.map(str::to_string));
    active.state = Set(Some(state.to_string()));
    active.update(db).await.expect("update user");
}

fn login_ids(payload: &Value) -> Vec<String> {
    payload["items"]
        .as_array()
        .expect("items")
        .iter()
        .map(|item| item["loginId"].as_str().unwrap().to_string())
        .collect()
}

fn display_names(payload: &Value) -> Vec<String> {
    payload["items"]
        .as_array()
        .expect("items")
        .iter()
        .map(|item| item["displayName"].as_str().unwrap().to_string())
        .collect()
}

#[tokio::test]
async fn project_assignable_users_blank_query_preserves_legacy_default_rows() {
    let (app, repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_member_csrf, _member_cookie, member_id) = register_user(app.clone(), "member").await;
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
    repo.add_project_membership(project.id, member_id, "member")
        .await
        .unwrap();

    let blank = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/assignable-users",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    let login_ids = login_ids(&blank);
    let display_names = display_names(&blank);
    assert_eq!(login_ids.first().map(String::as_str), Some("owner"));
    assert_eq!(
        display_names.first().map(String::as_str),
        Some("issue.assignToMe")
    );
    assert!(login_ids.contains(&"member".to_string()));
}

#[tokio::test]
async fn issue_assignable_users_blank_query_preserves_legacy_pseudo_rows() {
    let (app, repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
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
    repo.add_project_membership(project.id, member_id, "member")
        .await
        .unwrap();
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "Assignable issue",
    )
    .await;

    let unassigned = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignable-users",
            Some(&member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(
        &login_ids(&unassigned)[0..2],
        &["member".to_string(), "owner".to_string()]
    );
    assert_eq!(
        &display_names(&unassigned)[0..2],
        &[
            "issue.assignToMe".to_string(),
            "issue.assignToAuthor".to_string()
        ]
    );

    assign_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "member",
    )
    .await;
    let assigned = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignable-users",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(
        &login_ids(&assigned)[0..3],
        &[
            "owner".to_string(),
            "anonymous".to_string(),
            "member".to_string()
        ]
    );
    assert_eq!(
        &display_names(&assigned)[0..3],
        &[
            "issue.assignToMe".to_string(),
            "issue.noAssignee".to_string(),
            "member".to_string()
        ]
    );
}

#[tokio::test]
async fn project_assignable_users_searches_active_public_users() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    register_user(app.clone(), "matchterm-login").await;
    register_user(app.clone(), "name-holder").await;
    register_user(app.clone(), "english-holder").await;
    register_user(app.clone(), "matchterm-locked").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;

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

    let broad = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/assignable-users?query=matchterm",
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

    let legacy_alias = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/-_-api/v1/owners/owner/projects/projectYobi/assignableUsers?query=matchterm-login",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(
        legacy_alias
            .as_array()
            .expect("legacy assignable users")
            .len(),
        1
    );
    assert_eq!(legacy_alias[0]["loginId"], "matchterm-login");

    let exact_name = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/assignable-users?query=Matchterm%20Name&type=name",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&exact_name), vec!["name-holder".to_string()]);

    let exact_login = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/assignable-users?query=matchterm-login&type=loginId",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&exact_login), vec!["matchterm-login".to_string()]);

    let exact_english_name = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/assignable-users?query=Matchterm%20English&type=englishName",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(
        login_ids(&exact_english_name),
        vec!["english-holder".to_string()]
    );

    let unknown_type_falls_back_to_broad = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/assignable-users?query=matchterm&type=unknown",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(unknown_type_falls_back_to_broad["total"], 3);
}

#[tokio::test]
async fn project_assignable_users_filters_private_and_protected_candidates() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_project_member_csrf, _project_member_cookie, project_member_id) =
        register_user(app.clone(), "visibility-project").await;
    let (_org_member_csrf, _org_member_cookie, org_member_id) =
        register_user(app.clone(), "visibility-org").await;
    let (_org_admin_csrf, _org_admin_cookie, org_admin_id) =
        register_user(app.clone(), "visibility-admin").await;
    let (_outsider_csrf, outsider_cookie, _) =
        register_user(app.clone(), "visibility-outsider").await;
    register_user(app.clone(), "stale-assignee").await;

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
    repo.add_organization_membership(organization.id, org_admin_id, "org_admin")
        .await
        .unwrap();

    for (project_name, scope) in [("privateYobi", "private"), ("protectedYobi", "protected")] {
        create_project(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            "weblabs",
            project_name,
            scope,
        )
        .await;
        let project = repo
            .read_project_by_owner_and_name("weblabs", project_name)
            .await
            .unwrap()
            .unwrap();
        repo.add_project_membership(project.id, project_member_id, "member")
            .await
            .unwrap();

        let matches = response_json(
            rest(
                app.clone(),
                Method::GET,
                &format!(
                    "/yona/api/v1/owners/weblabs/projects/{project_name}/assignable-users?query=visibility"
                ),
                Some(&owner_cookie),
            )
            .await,
        )
        .await;
        let match_login_ids = login_ids(&matches);
        assert!(match_login_ids.contains(&"visibility-project".to_string()));
        assert!(match_login_ids.contains(&"visibility-org".to_string()));
        assert!(match_login_ids.contains(&"visibility-admin".to_string()));
        assert!(!match_login_ids.contains(&"visibility-outsider".to_string()));
    }

    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "weblabs",
        "privateYobi",
        "Private issue",
    )
    .await;
    assign_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "weblabs",
        "privateYobi",
        "stale-assignee",
    )
    .await;
    update_user_profile(&db, "stale-assignee", "Stale Assignee", None, "locked").await;

    let stale_project_match = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/weblabs/projects/privateYobi/assignable-users?query=stale-assignee&type=loginId",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&stale_project_match), Vec::<String>::new());

    let denied = rest(
        app,
        Method::GET,
        "/yona/api/v1/owners/weblabs/projects/privateYobi/assignable-users?query=visibility",
        Some(&outsider_cookie),
    )
    .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn project_assignable_users_caps_results_at_ten_and_reports_truncation() {
    let (app, _repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "projectYobi",
        "public",
    )
    .await;
    for index in 0..12 {
        register_user(app.clone(), &format!("cap-{index:02}")).await;
    }

    let payload = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/assignable-users?query=cap-",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(payload["total"], 12);
    assert_eq!(payload["truncated"], true);
    assert_eq!(payload["items"].as_array().unwrap().len(), 10);
}

#[tokio::test]
async fn assignable_users_searches_login_name_and_english_name_and_filters_inactive_users() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    register_user(app.clone(), "matchterm-login").await;
    register_user(app.clone(), "name-holder").await;
    register_user(app.clone(), "english-holder").await;
    register_user(app.clone(), "matchterm-locked").await;
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
        "Search issue",
    )
    .await;

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

    let broad = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignable-users?query=matchterm",
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
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignable-users?query=Matchterm%20Name&type=name",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&exact_name), vec!["name-holder".to_string()]);

    let exact_login = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignable-users?query=matchterm-login&type=loginId",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&exact_login), vec!["matchterm-login".to_string()]);

    let exact_english_name = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignable-users?query=Matchterm%20English&type=englishName",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(
        login_ids(&exact_english_name),
        vec!["english-holder".to_string()]
    );

    let unknown_type_falls_back_to_broad = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignable-users?query=matchterm&type=unknown",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(unknown_type_falls_back_to_broad["total"], 3);
}

#[tokio::test]
async fn assignable_users_respects_private_visibility_and_keeps_current_assignee_selectable() {
    let (app, repo, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_project_member_csrf, _project_member_cookie, project_member_id) =
        register_user(app.clone(), "visibility-project").await;
    let (_org_member_csrf, _org_member_cookie, org_member_id) =
        register_user(app.clone(), "visibility-org").await;
    let (_outsider_csrf, outsider_cookie, _) =
        register_user(app.clone(), "visibility-outsider").await;
    register_user(app.clone(), "stale-assignee").await;

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
    repo.add_project_membership(project.id, project_member_id, "member")
        .await
        .unwrap();
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "weblabs",
        "privateYobi",
        "Private issue",
    )
    .await;

    let private_matches = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/weblabs/projects/privateYobi/issues/1/assignable-users?query=visibility",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    let private_login_ids = login_ids(&private_matches);
    assert!(private_login_ids.contains(&"visibility-project".to_string()));
    assert!(private_login_ids.contains(&"visibility-org".to_string()));
    assert!(!private_login_ids.contains(&"visibility-outsider".to_string()));

    assign_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "weblabs",
        "privateYobi",
        "stale-assignee",
    )
    .await;
    update_user_profile(&db, "stale-assignee", "Stale Assignee", None, "locked").await;

    let current_assignee = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/weblabs/projects/privateYobi/issues/1/assignable-users?query=stale-assignee&type=loginId",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(
        login_ids(&current_assignee),
        vec!["stale-assignee".to_string()]
    );

    let denied = rest(
        app,
        Method::GET,
        "/yona/api/v1/owners/weblabs/projects/privateYobi/issues/1/assignable-users?query=visibility",
        Some(&outsider_cookie),
    )
    .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn assignable_users_caps_results_at_ten_and_reports_truncation() {
    let (app, _repo, _db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
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
        "Truncate issue",
    )
    .await;
    for index in 0..12 {
        register_user(app.clone(), &format!("cap-{index:02}")).await;
    }

    let payload = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issues/1/assignable-users?query=cap-",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(payload["total"], 12);
    assert_eq!(payload["truncated"], true);
    assert_eq!(payload["items"].as_array().unwrap().len(), 10);
}
