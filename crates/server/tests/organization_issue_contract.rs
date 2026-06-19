use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use tower::ServiceExt;
use yona_rust_persistence::AppRepository;
use yona_rust_pilot_migration::Migrator;
use yona_rust_pilot_server::{create_router_with_app_repository, RuntimeConfig};

mod rest_test_support;

async fn build_app_with_repository() -> (axum::Router, AppRepository) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let app_repo = AppRepository::new(db);
    let app = create_router_with_app_repository(
        RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        app_repo.clone(),
    );

    (app, app_repo)
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

async fn response_json(response: Response<Body>) -> serde_json::Value {
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(status, StatusCode::OK, "{text}");
    serde_json::from_str(&text).expect("json response")
}

async fn rest_get(app: axum::Router, uri: &str, cookie_header: Option<&str>) -> Response<Body> {
    let mut request = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie_header) = cookie_header {
        request = request.header(http::header::COOKIE, cookie_header);
    }
    app.oneshot(request.body(Body::empty()).unwrap())
        .await
        .unwrap()
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

async fn create_organization(app: axum::Router, cookie: &str, csrf: &str) {
    response_json(
        rpc(
            app,
            "CreateOrganization",
            Some(cookie),
            Some(csrf),
            json!({
                "organizationName": "weblabs",
                "description": "web labs"
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
    project_name: &str,
    project_scope: &str,
) {
    response_json(
        rpc(
            app,
            "CreateProject",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "weblabs",
                "projectName": project_name,
                "overview": format!("{project_name} overview"),
                "projectScope": project_scope
            }),
        )
        .await,
    )
    .await;
}

async fn create_issue_with_body(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    project_name: &str,
    title: &str,
    body_markdown: &str,
) -> serde_json::Value {
    response_json(
        rpc(
            app,
            "CreateIssue",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "weblabs",
                "projectName": project_name,
                "title": title,
                "bodyMarkdown": body_markdown
            }),
        )
        .await,
    )
    .await
}

async fn create_issue(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    project_name: &str,
    title: &str,
) -> serde_json::Value {
    create_issue_with_body(
        app,
        cookie,
        csrf,
        project_name,
        title,
        &format!("body for {title}"),
    )
    .await
}

async fn close_issue(app: axum::Router, cookie: &str, csrf: &str, project_name: &str) {
    response_json(
        rpc(
            app,
            "UpdateIssueState",
            Some(cookie),
            Some(csrf),
            json!({
                "ownerName": "weblabs",
                "projectName": project_name,
                "issueNumber": "1",
                "state": "closed"
            }),
        )
        .await,
    )
    .await;
}

#[tokio::test]
async fn organization_issue_list_contract_respects_visible_projects_and_counts() {
    // Guards issue route-owned organization list helper, projection, and visible-project aggregation.
    let (app, repo) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, _) = register_user(app.clone(), "admin").await;
    let (_, member_cookie, member_id) = register_user(app.clone(), "member").await;
    create_organization(app.clone(), &admin_cookie, &admin_csrf).await;
    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "publicProject",
        "public",
    )
    .await;
    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "protectedProject",
        "protected",
    )
    .await;
    create_project(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "privateProject",
        "private",
    )
    .await;
    create_issue(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "publicProject",
        "Public open issue",
    )
    .await;
    create_issue(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "protectedProject",
        "Protected closed issue",
    )
    .await;
    close_issue(app.clone(), &admin_cookie, &admin_csrf, "protectedProject").await;
    create_issue(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "privateProject",
        "Private admin issue",
    )
    .await;

    let organization = repo
        .read_organization_by_name("weblabs")
        .await
        .unwrap()
        .unwrap();
    repo.add_organization_membership(organization.id, member_id, "org_member")
        .await
        .unwrap();

    let anonymous = response_json(
        rpc(
            app.clone(),
            "ListOrganizationIssues",
            None,
            None,
            json!({
                "organizationName": "weblabs",
                "state": "open",
                "pageNum": 1
            }),
        )
        .await,
    )
    .await;
    assert_eq!(anonymous["items"].as_array().unwrap().len(), 1);
    assert_eq!(anonymous["items"][0]["projectName"], "publicProject");
    assert_eq!(anonymous["openIssueCount"], 1);
    assert_eq!(
        anonymous
            .get("closedIssueCount")
            .and_then(|value| value.as_u64())
            .unwrap_or_default(),
        0
    );

    let member = response_json(
        rpc(
            app.clone(),
            "ListOrganizationIssues",
            Some(&member_cookie),
            None,
            json!({
                "organizationName": "weblabs",
                "state": "open",
                "pageNum": 1
            }),
        )
        .await,
    )
    .await;
    assert_eq!(member["items"].as_array().unwrap().len(), 1);
    assert_eq!(member["items"][0]["projectName"], "publicProject");
    assert_eq!(member["openIssueCount"], 1);
    assert_eq!(member["closedIssueCount"], 1);
    assert_eq!(member["visibleProjects"].as_array().unwrap().len(), 2);

    let admin = response_json(
        rpc(
            app,
            "ListOrganizationIssues",
            Some(&admin_cookie),
            None,
            json!({
                "organizationName": "weblabs",
                "state": "open",
                "pageNum": 1
            }),
        )
        .await,
    )
    .await;
    assert_eq!(admin["items"].as_array().unwrap().len(), 2);
    assert_eq!(admin["openIssueCount"], 2);
    assert_eq!(admin["closedIssueCount"], 1);
    assert!(admin["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["projectName"] == "privateProject"));
}

#[tokio::test]
async fn organization_issue_list_contract_filters_sorts_and_pages_visible_issues() {
    let (app, repo) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, _) = register_user(app.clone(), "admin").await;
    let (_, member_cookie, member_id) = register_user(app.clone(), "member").await;
    create_organization(app.clone(), &admin_cookie, &admin_csrf).await;
    create_project(app.clone(), &admin_cookie, &admin_csrf, "alpha", "public").await;
    create_project(app.clone(), &admin_cookie, &admin_csrf, "beta", "protected").await;
    create_issue(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "alpha",
        "Alpha query match",
    )
    .await;
    create_issue_with_body(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "beta",
        "Beta query match",
        "Beta body mentions @member",
    )
    .await;
    create_issue(
        app.clone(),
        &admin_cookie,
        &admin_csrf,
        "beta",
        "Beta other issue",
    )
    .await;

    let organization = repo
        .read_organization_by_name("weblabs")
        .await
        .unwrap()
        .unwrap();
    repo.add_organization_membership(organization.id, member_id, "org_member")
        .await
        .unwrap();

    let filtered = response_json(
        rpc(
            app.clone(),
            "ListOrganizationIssues",
            Some(&member_cookie),
            None,
            json!({
                "organizationName": "weblabs",
                "state": "open",
                "projectNames": ["beta"],
                "filter": "query",
                "orderBy": "createdDate",
                "orderDir": "asc",
                "pageNum": 1,
                "itemsPerPage": 1
            }),
        )
        .await,
    )
    .await;

    assert_eq!(filtered["items"].as_array().unwrap().len(), 1);
    assert_eq!(filtered["items"][0]["title"], "Beta query match");
    assert_eq!(filtered["pageNum"], 1);
    assert_eq!(filtered["pageSize"], 1);
    assert_eq!(filtered["totalCount"], 1);
    assert_eq!(filtered["openIssueCount"], 1);

    let mentioned = response_json(
        rest_get(
            app.clone(),
            &format!(
                "/yona/api/v1/organizations/weblabs/issues?state=open&mentionId={member_id}&pageNum=1"
            ),
            Some(&member_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(mentioned["items"].as_array().unwrap().len(), 1);
    assert_eq!(mentioned["items"][0]["title"], "Beta query match");
    assert_eq!(mentioned["openIssueCount"], 1);

    let authored_by_me = response_json(
        rpc(
            app,
            "ListOrganizationIssues",
            Some(&member_cookie),
            None,
            json!({
                "organizationName": "weblabs",
                "state": "open",
                "authorId": member_id,
                "pageNum": 1
            }),
        )
        .await,
    )
    .await;
    assert_eq!(
        authored_by_me
            .get("items")
            .and_then(|value| value.as_array())
            .map(Vec::len)
            .unwrap_or_default(),
        0
    );
    assert_eq!(
        authored_by_me
            .get("openIssueCount")
            .and_then(|value| value.as_u64())
            .unwrap_or_default(),
        0
    );
}

#[tokio::test]
async fn organization_issue_list_contract_returns_not_found_for_unknown_organization() {
    let (app, _) = build_app_with_repository().await;
    let response = rpc(
        app,
        "ListOrganizationIssues",
        None,
        None,
        json!({
            "organizationName": "missing",
            "state": "open",
            "pageNum": 1
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
