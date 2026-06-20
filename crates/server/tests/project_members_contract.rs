use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ColumnTrait, Database, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
};
use serde_json::{json, Value};
use tower::ServiceExt;
use yona_rust_persistence::{
    notification_event, notification_mail, project_user, user_enrolled_project, AppRepository,
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

async fn response_text(response: Response<Body>) -> String {
    String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .expect("response body")
            .to_bytes()
            .to_vec(),
    )
    .expect("utf-8 response")
}

async fn ok_json(response: Response<Body>) -> Value {
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

async fn rest(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Option<Value>,
) -> Response<Body> {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }
    if payload.is_some() {
        builder = builder.header(http::header::CONTENT_TYPE, "application/json");
    }

    app.oneshot(
        builder
            .body(Body::from(
                payload.map_or_else(String::new, |value| value.to_string()),
            ))
            .unwrap(),
    )
    .await
    .unwrap()
}

async fn rest_form(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    form_body: &str,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header(
            http::header::CONTENT_TYPE,
            "application/x-www-form-urlencoded",
        )
        .header(http::header::ACCEPT, "application/json");
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }

    app.oneshot(builder.body(Body::from(form_body.to_string())).unwrap())
        .await
        .unwrap()
}

async fn register_user(app: axum::Router, login_id: &str) -> (String, String, i64) {
    let (csrf, cookie_header) = bootstrap(app.clone()).await;
    let response = rest_test_support::pilot_rest(
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
    let payload = ok_json(response).await;
    let actor_id = payload["actorId"]
        .as_i64()
        .or_else(|| {
            payload["actorId"]
                .as_str()
                .and_then(|value| value.parse().ok())
        })
        .expect("actor id");
    (csrf, cookie_header, actor_id)
}

async fn create_project_with_scope(
    app: axum::Router,
    cookie: &str,
    csrf: &str,
    project_name: &str,
    project_scope: &str,
) {
    let response = rest(
        app,
        Method::POST,
        "/yona/api/v1/owners/owner/projects",
        Some(cookie),
        Some(csrf),
        Some(json!({
            "overview": "member parity",
            "projectName": project_name,
            "projectScope": project_scope,
        })),
    )
    .await;
    ok_json(response).await;
}

async fn create_project(app: axum::Router, cookie: &str, csrf: &str) {
    create_project_with_scope(app, cookie, csrf, "projectYobi", "public").await;
}

fn member<'a>(payload: &'a Value, login_id: &str) -> &'a Value {
    payload["members"]
        .as_array()
        .expect("members array")
        .iter()
        .find(|member| member["loginId"] == login_id)
        .unwrap_or_else(|| panic!("member {login_id} missing from {payload}"))
}

#[tokio::test]
// Guards the `routes/projects/members.rs` REST membership module: add,
// directory projection, role update, self-leave, and delete authorization stay
// together while route registration remains in the parent project module. The
// legacy direct aliases also reuse the app-scoped service/runtime config.
async fn project_member_management_preserves_legacy_add_role_delete_guards() {
    let (app, repository, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, owner_id) = register_user(app.clone(), "owner").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    let (guest_csrf, guest_cookie, guest_id) = register_user(app.clone(), "guest").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let project = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .expect("project lookup")
        .expect("project exists");

    let guest_add = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/members",
        Some(&guest_cookie),
        Some(&guest_csrf),
        Some(json!({ "loginId": "member" })),
    )
    .await;
    assert_eq!(guest_add.status(), StatusCode::FORBIDDEN);

    let initial = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(initial["ownerName"], "owner");
    assert_eq!(initial["projectName"], "projectYobi");
    assert_eq!(initial["members"].as_array().unwrap().len(), 1);
    assert_eq!(initial["roleOptions"][0]["role"], "manager");
    assert_eq!(initial["roleOptions"][1]["role"], "member");
    assert_eq!(member(&initial, "owner")["role"], "manager");
    assert_eq!(member(&initial, "owner")["userId"], owner_id);
    assert_eq!(member(&initial, "owner")["isOwner"], true);
    assert_eq!(initial["viewerCanUpdate"], true);
    assert!(member(&initial, "owner")["avatarUrl"]
        .as_str()
        .unwrap()
        .starts_with("https://www.gravatar.com/avatar/"));

    let direct_added = rest_form(
        app.clone(),
        Method::POST,
        "/yona/owner/projectYobi/members",
        Some(&owner_cookie),
        Some(&owner_csrf),
        "loginId=member",
    )
    .await;
    assert_eq!(direct_added.status(), StatusCode::OK);
    assert_eq!(response_text(direct_added).await, "{}");
    let added = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(member(&added, "member")["role"], "member");
    assert_eq!(member(&added, "member")["userId"], member_id);
    assert_eq!(member(&added, "member")["isOwner"], false);

    let duplicate = rest(
        app.clone(),
        Method::POST,
        "/yona/api/v1/owners/owner/projects/projectYobi/members",
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({ "loginId": "member" })),
    )
    .await;
    assert_eq!(duplicate.status(), StatusCode::BAD_REQUEST);

    let direct_promoted = rest_form(
        app.clone(),
        Method::POST,
        &format!("/yona/owner/projectYobi/member/{member_id}/edit"),
        Some(&owner_cookie),
        Some(&owner_csrf),
        "id=1",
    )
    .await;
    assert_eq!(direct_promoted.status(), StatusCode::NO_CONTENT);
    assert_eq!(response_text(direct_promoted).await, "");
    let promoted = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert_eq!(member(&promoted, "member")["role"], "manager");

    let owner_role_change = rest(
        app.clone(),
        Method::PATCH,
        &format!("/yona/api/v1/owners/owner/projects/projectYobi/members/{owner_id}"),
        Some(&owner_cookie),
        Some(&owner_csrf),
        Some(json!({ "role": "member" })),
    )
    .await;
    assert_eq!(owner_role_change.status(), StatusCode::BAD_REQUEST);

    let owner_delete = rest(
        app.clone(),
        Method::DELETE,
        &format!("/yona/api/v1/owners/owner/projects/projectYobi/members/{owner_id}"),
        Some(&owner_cookie),
        Some(&owner_csrf),
        None,
    )
    .await;
    assert_eq!(owner_delete.status(), StatusCode::FORBIDDEN);

    let direct_removed = rest(
        app.clone(),
        Method::DELETE,
        &format!("/yona/owner/projectYobi/member/{member_id}/delete"),
        Some(&owner_cookie),
        Some(&owner_csrf),
        None,
    )
    .await;
    assert_eq!(direct_removed.status(), StatusCode::OK);
    let direct_removed_payload = response_text(direct_removed).await;
    assert_eq!(
        serde_json::from_str::<Value>(&direct_removed_payload).unwrap()["location"],
        "/owner/projectYobi/members"
    );
    let removed = ok_json(
        rest(
            app.clone(),
            Method::GET,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&owner_cookie),
            None,
            None,
        )
        .await,
    )
    .await;
    assert!(removed["members"]
        .as_array()
        .unwrap()
        .iter()
        .all(|member| member["loginId"] != "member"));

    repository
        .create_project_enrollment_request(project.id, guest_id)
        .await
        .expect("seed project enrollment request");
    let added_guest = ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "loginId": "guest" })),
        )
        .await,
    )
    .await;
    assert_eq!(member(&added_guest, "guest")["role"], "member");
    assert!(added_guest["enrollmentRequests"]
        .as_array()
        .unwrap()
        .is_empty());
    assert!(
        user_enrolled_project::Entity::find_by_id((guest_id, project.id))
            .one(&db)
            .await
            .expect("enrollment lookup")
            .is_none()
    );
    assert_eq!(
        notification_event::Entity::find()
            .filter(
                notification_event::Column::EventType
                    .eq(Some(String::from("MEMBER_ENROLL_ACCEPT"))),
            )
            .filter(notification_event::Column::ResourceType.eq(Some(String::from("project"))))
            .filter(notification_event::Column::ResourceId.eq(Some(project.id.to_string())))
            .count(&db)
            .await
            .expect("notification event count"),
        2
    );
    assert_eq!(
        notification_mail::Entity::find()
            .count(&db)
            .await
            .expect("notification mail count"),
        2
    );

    let self_leave = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/owners/owner/projects/projectYobi/members/{guest_id}"),
            Some(&guest_cookie),
            Some(&guest_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(self_leave["redirectPath"], "/owner/projectYobi");
    assert!(project_user::Entity::find()
        .filter(project_user::Column::ProjectId.eq(Some(project.id)))
        .filter(project_user::Column::UserId.eq(Some(guest_id)))
        .one(&db)
        .await
        .expect("project member lookup")
        .is_none());

    let member_delete_without_update = rest(
        app.clone(),
        Method::DELETE,
        &format!("/yona/api/v1/owners/owner/projects/projectYobi/members/{owner_id}"),
        Some(&member_cookie),
        Some(&member_csrf),
        None,
    )
    .await;
    assert_eq!(member_delete_without_update.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
// Guards the private-project self-leave response owned by
// `routes/projects/members.rs`; the former member must not receive the private
// directory after removal.
async fn project_member_self_leave_private_project_does_not_leak_directory() {
    let (app, repository, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "privateMember").await;
    create_project_with_scope(
        app.clone(),
        &owner_cookie,
        &owner_csrf,
        "projectSecret",
        "private",
    )
    .await;
    let project = repository
        .read_project_by_owner_and_name("owner", "projectSecret")
        .await
        .expect("project lookup")
        .expect("project exists");

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectSecret/members",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "loginId": "privateMember" })),
        )
        .await,
    )
    .await;

    let self_leave = ok_json(
        rest(
            app.clone(),
            Method::DELETE,
            &format!("/yona/api/v1/owners/owner/projects/projectSecret/members/{member_id}"),
            Some(&member_cookie),
            Some(&member_csrf),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(self_leave["redirectPath"], "/");
    assert_eq!(self_leave["viewerCanUpdate"], false);
    assert!(self_leave["members"].as_array().unwrap().is_empty());
    assert!(self_leave["enrollmentRequests"]
        .as_array()
        .unwrap()
        .is_empty());
    assert!(project_user::Entity::find()
        .filter(project_user::Column::ProjectId.eq(Some(project.id)))
        .filter(project_user::Column::UserId.eq(Some(member_id)))
        .one(&db)
        .await
        .expect("project member lookup")
        .is_none());
}

#[tokio::test]
// Guards the workspace legacy alias that reuses the project-member delete
// helper through the parent `routes/projects.rs` re-export.
async fn direct_legacy_info_leave_route_removes_current_user_and_redirects_to_profile_projects() {
    let (app, repository, db) = build_app_with_repository().await;
    let (owner_csrf, owner_cookie, _) = register_user(app.clone(), "owner").await;
    let (_member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    create_project(app.clone(), &owner_cookie, &owner_csrf).await;
    let project = repository
        .read_project_by_owner_and_name("owner", "projectYobi")
        .await
        .expect("project lookup")
        .expect("project exists");

    ok_json(
        rest(
            app.clone(),
            Method::POST,
            "/yona/api/v1/owners/owner/projects/projectYobi/members",
            Some(&owner_cookie),
            Some(&owner_csrf),
            Some(json!({ "loginId": "member" })),
        )
        .await,
    )
    .await;

    let legacy_leave = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/info/leave/owner/projectYobi")
                .header(http::header::COOKIE, &member_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(legacy_leave.status(), StatusCode::SEE_OTHER);
    assert_eq!(
        legacy_leave.headers().get(http::header::LOCATION).unwrap(),
        "/yona/member?daysAgo=14&selected=projects"
    );
    assert!(project_user::Entity::find()
        .filter(project_user::Column::ProjectId.eq(Some(project.id)))
        .filter(project_user::Column::UserId.eq(Some(member_id)))
        .one(&db)
        .await
        .expect("project member lookup")
        .is_none());
}
