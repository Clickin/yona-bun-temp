use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use serde_json::json;
use tower::ServiceExt;
use yoram_migration::Migrator;
use yoram_persistence::AppRepository;
use yoram_server::{create_router_with_app_repository, RuntimeConfig};

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

async fn register_user(app: axum::Router, login_id: &str) -> (String, String) {
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
    assert_eq!(response.status(), StatusCode::OK);
    (csrf, cookie_header)
}

async fn create_public_project(app: axum::Router, cookie: &str, csrf: &str) {
    let response = rpc(
        app,
        "CreateProject",
        Some(cookie),
        Some(csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "overview": "milestone parity",
            "projectScope": "public"
        }),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
// Guards projects/milestones.rs RPC helpers and issue-owned milestone projections.
// Companion REST adapter coverage for issues/milestones.rs lives in
// rest_contract::rest_milestone_routes_manage_crud_and_state.
async fn milestone_rpc_manages_crud_state_sorting_and_linked_issues() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    let _ = register_user(app.clone(), "guest").await;
    create_public_project(app.clone(), &cookie, &csrf).await;

    let created = response_json(
        rpc(
            app.clone(),
            "CreateProjectMilestone",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "v1.0",
                "contentsMarkdown": "Ship **parity** @guest @owner/projectYobi @nforge @nforge/yobi <script>alert(1)</script>",
                "dueDate": "2026-05-09",
                "state": "open"
            }),
        )
        .await,
    )
    .await;
    let milestone_id = created["milestone"]["id"].as_i64().unwrap();
    assert_eq!(created["milestone"]["title"], "v1.0");
    assert_eq!(created["milestone"]["dueDateLabel"], "2026-05-09");
    assert_eq!(created["milestone"]["dueDateOverdue"], true);
    assert!(created["milestone"]["untilLabel"]
        .as_str()
        .unwrap_or_default()
        .contains("days past"));
    assert_eq!(
        created["milestone"]["contentsMarkdown"],
        "Ship **parity** @guest @owner/projectYobi @nforge @nforge/yobi <script>alert(1)</script>"
    );
    assert!(created["milestone"]["attachments"]
        .as_array()
        .unwrap()
        .is_empty());
    assert_eq!(
        created["milestone"]["contentsHtml"].as_str().unwrap_or(""),
        ""
    );

    let duplicate = rpc(
        app.clone(),
        "CreateProjectMilestone",
        Some(&cookie),
        Some(&csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "title": "v1.0",
            "dueDate": "2026-05-10",
            "state": "open"
        }),
    )
    .await;
    assert_eq!(duplicate.status(), StatusCode::BAD_REQUEST);

    let issue_one = response_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Open milestone issue",
                "bodyMarkdown": "open",
                "milestoneId": milestone_id
            }),
        )
        .await,
    )
    .await;
    assert_eq!(issue_one["milestoneTitle"], "v1.0");

    response_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Closed milestone issue",
                "bodyMarkdown": "closed",
                "milestoneId": milestone_id
            }),
        )
        .await,
    )
    .await;
    response_json(
        rpc(
            app.clone(),
            "UpdateIssueState",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "issueNumber": "2",
                "state": "closed"
            }),
        )
        .await,
    )
    .await;

    let listed = response_json(
        rpc(
            app.clone(),
            "ListProjectMilestones",
            None,
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "state": "open",
                "orderBy": "dueDate",
                "orderDir": "asc"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(listed["milestones"].as_array().unwrap().len(), 1);
    assert_eq!(listed["milestones"][0]["openIssueCount"], 1);
    assert_eq!(listed["milestones"][0]["closedIssueCount"], 1);
    assert_eq!(listed["milestones"][0]["completionPercent"], 50);
    assert_eq!(listed["milestones"][0]["dueDateOverdue"], true);
    assert!(listed["milestones"][0]["untilLabel"]
        .as_str()
        .unwrap_or_default()
        .contains("days past"));
    assert_eq!(
        listed["milestones"][0]["openIssues"][0]["title"],
        "Open milestone issue"
    );
    assert_eq!(
        listed["milestones"][0]["closedIssues"][0]["title"],
        "Closed milestone issue"
    );
    assert_eq!(listed["milestones"][0]["openIssues"][0]["commentCount"], 0);
    assert!(listed["milestones"][0]["openIssues"][0]["labels"].is_array());

    let detail = response_json(
        rpc(
            app.clone(),
            "ReadProjectMilestone",
            None,
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "milestoneId": milestone_id
            }),
        )
        .await,
    )
    .await;
    assert_eq!(detail["milestone"]["openIssueCount"], 1);
    assert_eq!(detail["milestone"]["closedIssueCount"], 1);
    assert_eq!(
        detail["milestone"]["contentsMarkdown"],
        created["milestone"]["contentsMarkdown"]
    );
    assert_eq!(detail["milestone"]["openIssues"][0]["issueNumber"], 1);
    assert_eq!(detail["milestone"]["closedIssues"][0]["issueNumber"], 2);

    let updated = response_json(
        rpc(
            app.clone(),
            "UpdateProjectMilestone",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "milestoneId": milestone_id,
                "title": "v1.0 patched",
                "contentsMarkdown": "Updated #1 owner/projectYobi#1",
                "dueDate": "2026-05-11",
                "state": "closed"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(updated["milestone"]["title"], "v1.0 patched");

    response_json(
        rpc(
            app.clone(),
            "OpenProjectMilestone",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "milestoneId": milestone_id
            }),
        )
        .await,
    )
    .await;

    let reopened_list = response_json(
        rpc(
            app.clone(),
            "ListProjectMilestones",
            None,
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "state": "open",
                "orderBy": "dueDate",
                "orderDir": "asc"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(reopened_list["milestones"].as_array().unwrap().len(), 1);

    response_json(
        rpc(
            app.clone(),
            "CloseProjectMilestone",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "milestoneId": milestone_id
            }),
        )
        .await,
    )
    .await;

    let closed_list = response_json(
        rpc(
            app.clone(),
            "ListProjectMilestones",
            None,
            None,
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "state": "closed",
                "orderBy": "dueDate",
                "orderDir": "asc"
            }),
        )
        .await,
    )
    .await;
    assert_eq!(closed_list["milestones"].as_array().unwrap().len(), 1);

    let issue_after_close = response_json(
        rpc(
            app.clone(),
            "ReadIssueDetail",
            None,
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
    assert_eq!(issue_after_close["state"], "open");
    assert_eq!(issue_after_close["milestoneTitle"], "v1.0 patched");

    let deleted = response_json(
        rpc(
            app.clone(),
            "DeleteProjectMilestone",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "milestoneId": milestone_id
            }),
        )
        .await,
    )
    .await;
    assert_eq!(deleted["ok"], true);

    let issue_after_delete = response_json(
        rpc(
            app,
            "ReadIssueDetail",
            None,
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
    assert!(issue_after_delete["milestoneId"].is_null() || issue_after_delete["milestoneId"] == 0);
    assert!(
        issue_after_delete["milestoneTitle"].is_null()
            || issue_after_delete["milestoneTitle"] == ""
    );
}

#[tokio::test]
async fn milestone_rpc_validates_due_date_and_project_permissions() {
    let (app, _) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie) = register_user(app.clone(), "owner").await;
    let (guest_csrf, guest_cookie) = register_user(app.clone(), "guest").await;
    create_public_project(app.clone(), &owner_cookie, &owner_csrf).await;

    let invalid_due_date = rpc(
        app.clone(),
        "CreateProjectMilestone",
        Some(&owner_cookie),
        Some(&owner_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "title": "invalid date",
            "dueDate": "05/09/2026",
            "state": "open"
        }),
    )
    .await;
    assert_eq!(invalid_due_date.status(), StatusCode::BAD_REQUEST);

    let forbidden = rpc(
        app,
        "CreateProjectMilestone",
        Some(&guest_cookie),
        Some(&guest_csrf),
        json!({
            "ownerName": "owner",
            "projectName": "projectYobi",
            "title": "forbidden",
            "dueDate": "2026-05-09",
            "state": "open"
        }),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn milestone_read_preserves_the_legacy_global_id_projection() {
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_public_project(app.clone(), &cookie, &csrf).await;

    let created = response_json(
        rpc(
            app.clone(),
            "CreateProjectMilestone",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Global legacy milestone",
                "dueDate": "2026-07-31",
                "state": "open"
            }),
        )
        .await,
    )
    .await;
    let milestone_id = created["milestone"]["id"].as_i64().unwrap();

    let second_project = rpc(
        app.clone(),
        "CreateProject",
        Some(&cookie),
        Some(&csrf),
        json!({
            "ownerName": "owner",
            "projectName": "secondProject",
            "overview": "legacy milestone route context",
            "projectScope": "public"
        }),
    )
    .await;
    assert_eq!(second_project.status(), StatusCode::OK);

    response_json(
        rpc(
            app.clone(),
            "CreateIssue",
            Some(&cookie),
            Some(&csrf),
            json!({
                "ownerName": "owner",
                "projectName": "projectYobi",
                "title": "Source project issue",
                "bodyMarkdown": "legacy global milestone projection",
                "dueDate": "2026-07-24",
                "milestoneId": milestone_id
            }),
        )
        .await,
    )
    .await;

    let projected = response_json(
        rpc(
            app,
            "ReadProjectMilestone",
            Some(&cookie),
            None,
            json!({
                "ownerName": "owner",
                "projectName": "secondProject",
                "milestoneId": milestone_id
            }),
        )
        .await,
    )
    .await;
    assert_eq!(projected["milestone"]["title"], "Global legacy milestone");
    assert_eq!(projected["milestone"]["openIssueCount"], 0);
    assert_eq!(projected["milestone"]["closedIssueCount"], 0);
    assert_eq!(
        projected["milestone"]["openIssues"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        projected["milestone"]["openIssues"][0]["title"],
        "Source project issue"
    );
    assert_eq!(
        projected["milestone"]["openIssues"][0]["authorLoginId"],
        "owner"
    );
    assert_eq!(
        projected["milestone"]["openIssues"][0]["authorLabel"],
        "owner"
    );
    assert_eq!(
        projected["milestone"]["openIssues"][0]["dueDateLabel"],
        "2026-07-24"
    );
    assert!(!projected["milestone"]["openIssues"][0]["dueDateText"]
        .as_str()
        .unwrap()
        .is_empty());
}

#[tokio::test]
async fn milestone_legacy_mutation_routes_preserve_redirects() {
    // Guards projects/milestones.rs direct and legacy external milestone routes
    // through the service-snapshot project update guard.
    let (app, _) = build_app_with_repository().await;
    let (csrf, cookie) = register_user(app.clone(), "owner").await;
    create_public_project(app.clone(), &cookie, &csrf).await;

    let legacy_external_create = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/api/v1/owners/owner/projects/projectYobi/milestones/bulk")
                .header(http::header::COOKIE, &cookie)
                .header("x-csrf-token", &csrf)
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({
                        "milestones": [{
                            "title": "Legacy external",
                            "description": "Legacy external body",
                            "due_on": "2026-06-03",
                            "state": "open"
                        }]
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(legacy_external_create.status(), StatusCode::CREATED);
    let legacy_external_payload: serde_json::Value =
        serde_json::from_str(&response_text(legacy_external_create).await).unwrap();
    assert_eq!(legacy_external_payload[0]["title"], "Legacy external");
    assert_eq!(legacy_external_payload[0]["due_on"], "2026-06-03");

    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/owner/projectYobi/milestones")
                .header(http::header::COOKIE, &cookie)
                .header("x-csrf-token", &csrf)
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from(
                    "title=Direct&contents=Direct+body&dueDate=2026-06-01&state=open",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create_response.status(), StatusCode::SEE_OTHER);
    let location = create_response
        .headers()
        .get(http::header::LOCATION)
        .unwrap()
        .to_str()
        .unwrap()
        .to_string();
    assert!(location.starts_with("/yona/owner/projectYobi/milestone/"));
    let milestone_id = location.rsplit('/').next().unwrap().to_string();

    let edit_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "/yona/owner/projectYobi/milestone/{milestone_id}/edit"
                ))
                .header(http::header::COOKIE, &cookie)
                .header("x-csrf-token", &csrf)
                .header(
                    http::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded",
                )
                .body(Body::from(
                    "title=Direct+edited&contents=Edited&dueDate=2026-06-02&state=open",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(edit_response.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        edit_response
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some(location.as_str())
    );

    for action in ["close", "open"] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri(format!(
                        "/yona/owner/projectYobi/milestone/{milestone_id}/{action}"
                    ))
                    .header(http::header::COOKIE, &cookie)
                    .header("x-csrf-token", &csrf)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::SEE_OTHER);
        assert_eq!(
            response
                .headers()
                .get(http::header::LOCATION)
                .and_then(|value| value.to_str().ok()),
            Some(location.as_str())
        );
    }

    let delete_response = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!(
                    "/yona/owner/projectYobi/milestone/{milestone_id}/delete"
                ))
                .header(http::header::COOKIE, &cookie)
                .header("x-csrf-token", &csrf)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(delete_response.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        delete_response
            .headers()
            .get(http::header::LOCATION)
            .and_then(|value| value.to_str().ok()),
        Some("/yona/owner/projectYobi/milestones")
    );
}
