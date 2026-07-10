use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, QueryFilter, Set,
};
use serde_json::{json, Value};
use tower::ServiceExt;
use yoram_migration::Migrator;
use yoram_persistence::{project, AppRepository};
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

async fn response_json(response: Response<Body>) -> Value {
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
                "overview": "Issue reference parity",
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
) -> Value {
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
    .await
}

fn item_numbers(payload: &Value) -> Vec<i64> {
    payload["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["issueNumber"].as_i64().unwrap())
        .collect()
}

async fn project_model(
    db: &DatabaseConnection,
    owner_name: &str,
    project_name: &str,
) -> project::Model {
    project::Entity::find()
        .filter(project::Column::Owner.eq(Some(owner_name.to_string())))
        .filter(project::Column::Name.eq(Some(project_name.to_string())))
        .one(db)
        .await
        .unwrap()
        .expect("project")
}

async fn set_project_origin(
    db: &DatabaseConnection,
    fork_owner_name: &str,
    fork_project_name: &str,
    origin_project_id: i64,
) {
    let fork = project_model(db, fork_owner_name, fork_project_name).await;
    let mut active = project::ActiveModel::from(fork);
    active.original_project_id = Set(Some(origin_project_id));
    active.update(db).await.unwrap();
}

#[tokio::test]
// Guards the issues/lookups.rs autocomplete adapter split for issue references.
async fn issue_reference_autocomplete_contract_searches_and_orders_project_issues() {
    let (app, _, _) = build_app_with_repository().await;
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

    for number in 1..=25 {
        let title = if number == 5 {
            "Needle title 1 24".to_string()
        } else {
            format!("Issue candidate 1 24 number {number}")
        };
        create_issue(
            app.clone(),
            &owner_cookie,
            &owner_csrf,
            "owner",
            "projectYobi",
            &title,
        )
        .await;
    }

    let blank = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issue-references?query=",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(blank["total"], 25);
    assert_eq!(blank["truncated"], true);
    assert_eq!(item_numbers(&blank), (6..=25).rev().collect::<Vec<_>>());
    assert_eq!(blank["items"][0]["issueNumber"], 25);
    assert_eq!(blank["items"][0]["state"], "open");

    let old_exact = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issue-references?query=1",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(old_exact["total"], 25);
    assert_eq!(item_numbers(&old_exact), (6..=25).rev().collect::<Vec<_>>());
    assert!(!item_numbers(&old_exact).contains(&1));

    let recent_exact = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issue-references?query=24",
            None,
        )
        .await,
    )
    .await;
    let recent_numbers = item_numbers(&recent_exact);
    assert_eq!(recent_numbers[0], 25);
    assert_eq!(recent_numbers[1], 24);
    assert_eq!(recent_exact["total"], 25);
    assert_eq!(recent_exact["truncated"], true);

    let direct_recent_exact = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/owner/projectYobi/mentionList?mentionType=issue&query=24",
            None,
        )
        .await,
    )
    .await;
    let direct_items = direct_recent_exact["result"]
        .as_array()
        .expect("direct issue reference items");
    assert_eq!(direct_items.len(), 20);
    assert_eq!(direct_items[0]["issueNo"], "25");
    assert!(direct_items.iter().any(|item| item["issueNo"] == "24"));

    let title = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/issue-references?query=needle",
            None,
        )
        .await,
    )
    .await;
    assert_eq!(item_numbers(&title), vec![5]);
    assert_eq!(title["items"][0]["title"], "Needle title 1 24");
    assert_eq!(title["total"], 1);
    assert_eq!(title["truncated"], false);
}

#[tokio::test]
async fn issue_reference_autocomplete_contract_enforces_project_read_acl() {
    let (app, _, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, outsider_cookie, _) = register_user(app.clone(), "outsider").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "privateYobi",
        "private",
    )
    .await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "privateYobi",
        "Private issue",
    )
    .await;

    let denied = rest(
        app.clone(),
        Method::GET,
        "/yona/api/v1/owners/owner/projects/privateYobi/issue-references?query=",
        Some(&outsider_cookie),
    )
    .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);

    let missing = rest(
        app,
        Method::GET,
        "/yona/api/v1/owners/owner/projects/missingYobi/issue-references?query=",
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn issue_reference_autocomplete_contract_searches_readable_origin_for_forks() {
    let (app, _, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_, outsider_cookie, _) = register_user(app.clone(), "outsider").await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "originYobi",
        "private",
    )
    .await;
    create_project(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "forkYobi",
        "public",
    )
    .await;
    let origin = project_model(&db, "owner", "originYobi").await;
    set_project_origin(&db, "owner", "forkYobi", origin.id).await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "originYobi",
        "Origin readable issue",
    )
    .await;
    create_issue(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "owner",
        "forkYobi",
        "Fork fallback issue",
    )
    .await;

    let owner_origin = response_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/forkYobi/issue-references?query=origin",
            Some(&owner_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(item_numbers(&owner_origin), vec![1]);
    assert_eq!(owner_origin["items"][0]["title"], "Origin readable issue");

    let outsider_fallback = response_json(
        rest(
            app,
            Method::GET,
            "/yona/api/v1/owners/owner/projects/forkYobi/issue-references?query=fork",
            Some(&outsider_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(item_numbers(&outsider_fallback), vec![1]);
    assert_eq!(
        outsider_fallback["items"][0]["title"],
        "Fork fallback issue"
    );
}
