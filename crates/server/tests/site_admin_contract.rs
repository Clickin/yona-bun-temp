use axum::body::Body;
use http::{Method, Request, Response, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{ActiveModelTrait, Database, DatabaseConnection, NotSet, Set};
use serde_json::{json, Value};
use tower::ServiceExt;
use yona_rust_persistence::{site_admin, AppRepository};
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

async fn rest_get(app: axum::Router, uri: &str, cookie_header: Option<&str>) -> Response<Body> {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    app.oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap()
}

async fn rest_post(
    app: axum::Router,
    uri: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
) -> Response<Body> {
    let mut builder = Request::builder()
        .method(Method::POST)
        .uri(uri)
        .header(http::header::CONTENT_TYPE, "application/json");
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }
    app.oneshot(builder.body(Body::from("{}")).unwrap())
        .await
        .unwrap()
}

async fn mark_site_admin(db: &DatabaseConnection, user_id: i64) {
    site_admin::ActiveModel {
        id: NotSet,
        admin_id: Set(Some(user_id)),
    }
    .insert(db)
    .await
    .expect("site admin insert");
}

fn user<'a>(payload: &'a Value, login_id: &str) -> &'a Value {
    payload["users"]
        .as_array()
        .expect("users")
        .iter()
        .find(|user| user["loginId"] == login_id)
        .unwrap_or_else(|| panic!("user {login_id} missing from {payload}"))
}

fn login_ids(payload: &Value) -> Vec<String> {
    payload["users"]
        .as_array()
        .expect("users")
        .iter()
        .map(|user| user["loginId"].as_str().unwrap().to_string())
        .collect()
}

#[tokio::test]
async fn site_admin_user_list_and_toggles_follow_legacy_state_buckets() {
    let (app, _repo, db) = build_app_with_repository().await;
    let (admin_csrf, admin_cookie, admin_id) = register_user(app.clone(), "siteboss").await;
    let (member_csrf, member_cookie, member_id) = register_user(app.clone(), "member").await;
    let (guest_csrf, guest_cookie, _guest_id) = register_user(app.clone(), "guest").await;
    mark_site_admin(&db, admin_id).await;

    let unauthenticated = rest_get(app.clone(), "/yona/api/v1/site/users", None).await;
    assert_eq!(unauthenticated.status(), StatusCode::UNAUTHORIZED);

    let forbidden = rest_get(app.clone(), "/yona/api/v1/site/users", Some(&member_cookie)).await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let active = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=ACTIVE&query=mem",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(active["state"], "ACTIVE");
    assert_eq!(active["query"], "mem");
    assert_eq!(login_ids(&active), vec!["member".to_string()]);
    assert_eq!(user(&active, "member")["isSiteAdmin"], false);
    assert_eq!(user(&active, "member")["state"], "ACTIVE");

    let forbidden_toggle = rest_post(
        app.clone(),
        "/yona/api/v1/site/users/member/site-admin/toggle",
        Some(&member_cookie),
        Some(&member_csrf),
    )
    .await;
    assert_eq!(forbidden_toggle.status(), StatusCode::FORBIDDEN);

    let promoted = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/site/users/member/site-admin/toggle",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(promoted["user"]["loginId"], "member");
    assert_eq!(promoted["user"]["isSiteAdmin"], true);

    let site_admins = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=SITE_ADMIN",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(site_admins["state"], "SITE_ADMIN");
    let site_admin_ids = login_ids(&site_admins);
    assert!(site_admin_ids.contains(&"siteboss".to_string()));
    assert!(site_admin_ids.contains(&"member".to_string()));
    assert_eq!(site_admins["siteAdminCount"], 2);

    let locked = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/site/users/member/account-lock/toggle",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(locked["user"]["loginId"], "member");
    assert_eq!(locked["user"]["state"], "LOCKED");

    let locked_bucket = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=LOCKED",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&locked_bucket), vec!["member".to_string()]);

    let unlocked = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/site/users/member/account-lock/toggle",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(unlocked["user"]["state"], "ACTIVE");
    assert_eq!(unlocked["user"]["id"].as_i64(), Some(member_id));

    let guest_forbidden = rest_post(
        app.clone(),
        "/yona/api/v1/site/users/member/guest/toggle",
        Some(&guest_cookie),
        Some(&guest_csrf),
    )
    .await;
    assert_eq!(guest_forbidden.status(), StatusCode::FORBIDDEN);

    let guest_mode = response_json(
        rest_post(
            app.clone(),
            "/yona/api/v1/site/users/member/guest/toggle",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(guest_mode["user"]["loginId"], "member");
    assert_eq!(guest_mode["user"]["isGuest"], true);

    let guest_bucket = response_json(
        rest_get(
            app.clone(),
            "/yona/api/v1/site/users?state=GUEST",
            Some(&admin_cookie),
        )
        .await,
    )
    .await;
    assert_eq!(login_ids(&guest_bucket), vec!["member".to_string()]);

    let normal_mode = response_json(
        rest_post(
            app,
            "/yona/api/v1/site/users/member/guest/toggle",
            Some(&admin_cookie),
            Some(&admin_csrf),
        )
        .await,
    )
    .await;
    assert_eq!(normal_mode["user"]["isGuest"], false);
}
