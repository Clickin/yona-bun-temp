use axum::body::Body;
use http::{Method, Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::Database;
use tower::ServiceExt;
use yona_rust_pilot_migration::{seed_pilot_data, Migrator};
use yona_rust_pilot_server::persistence::PilotRepository;
use yona_rust_pilot_server::{create_router_with_repository, RuntimeConfig};

#[tokio::test]
async fn db_backed_router_reads_and_updates_seeded_data() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    seed_pilot_data(&db).await.expect("seed pilot data");

    let repo = PilotRepository::new(db);
    repo.create_organization(yona_rust_pilot_server::persistence::CreateOrganizationInput {
        description: Some("Seeded pilot organization".to_string()),
        organization_name: "weblabs".to_string(),
    })
    .await
    .expect("create seeded organization");
    let app = create_router_with_repository(
        RuntimeConfig {
            base_path: "/yona".to_string(),
            public_origin: String::new(),
        },
        repo,
    );

    let list_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ListProjects")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(list_response.status(), StatusCode::OK);

    let issue_list_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ListProjectIssues")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    "{\"ownerName\":\"pilot\",\"projectName\":\"yona\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(issue_list_response.status(), StatusCode::OK);
    let issue_list_body = issue_list_response.into_body().collect().await.unwrap().to_bytes();
    let issue_list_json = String::from_utf8(issue_list_body.to_vec()).unwrap();
    assert!(issue_list_json.contains("\"title\":\"Pilot issue\""));
    assert!(issue_list_json.contains("\"state\":\"open\""));

    let org_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ListOrganizations")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(org_response.status(), StatusCode::OK);
    let org_body = org_response.into_body().collect().await.unwrap().to_bytes();
    let org_json = String::from_utf8(org_body.to_vec()).unwrap();
    assert!(org_json.contains("\"organizationName\":\"weblabs\""));

    let bootstrap = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/yona/api/auth/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let csrf = bootstrap
        .headers()
        .get("x-csrf-token")
        .unwrap()
        .to_str()
        .unwrap()
        .to_string();
    let cookies: Vec<String> = bootstrap
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
    let cookie_header = cookies.join("; ");

    let update_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/UpdateIssueState")
                .header(http::header::CONTENT_TYPE, "application/json")
                .header(http::header::COOKIE, &cookie_header)
                .header("x-csrf-token", csrf)
                .body(Body::from("{\"ownerName\":\"pilot\",\"projectName\":\"yona\",\"issueNumber\":\"1\",\"state\":\"closed\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(update_response.status(), StatusCode::OK);

    let detail_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/yona/rpc/yona.pilot.v1.PilotService/ReadIssueDetail")
                .header(http::header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    "{\"ownerName\":\"pilot\",\"projectName\":\"yona\",\"issueNumber\":\"1\"}",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(detail_response.status(), StatusCode::OK);
    let body = detail_response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let json = String::from_utf8(body.to_vec()).unwrap();
    assert!(json.contains("\"state\":\"closed\""));
}
