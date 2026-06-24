use sea_orm::Database;
use yoram_migration::{seed_pilot_data, Migrator};
use yoram_server::persistence::PilotRepository;

#[tokio::test]
async fn env_backed_db_matrix_smokes_the_seeded_repository_flow() {
    let mut cases = vec![("sqlite", "sqlite::memory:".to_string())];

    if let Ok(url) = std::env::var("YONA_SPIKE_TEST_PG_URL") {
        cases.push(("postgres", url));
    }
    if let Ok(url) = std::env::var("YONA_SPIKE_TEST_MYSQL_URL") {
        cases.push(("mysql", url));
    }
    if let Ok(url) = std::env::var("YONA_SPIKE_TEST_MARIADB_URL") {
        cases.push(("mariadb", url));
    }

    for (name, url) in cases {
        run_case(name, &url).await;
    }
}

async fn run_case(name: &str, url: &str) {
    let db = connect_with_retry(name, url).await;
    Migrator::fresh(&db)
        .await
        .unwrap_or_else(|error| panic!("{name}: fresh migration failed: {error}"));
    seed_pilot_data(&db)
        .await
        .unwrap_or_else(|error| panic!("{name}: seeding failed: {error}"));

    let repo = PilotRepository::new(db);
    let projects = repo
        .list_projects()
        .await
        .unwrap_or_else(|error| panic!("{name}: list_projects failed: {error}"));
    assert_eq!(projects.len(), 1, "{name}: expected one seeded project");

    let issue = repo
        .read_issue_detail("pilot", "yona", 1)
        .await
        .unwrap_or_else(|error| panic!("{name}: read_issue_detail failed: {error}"))
        .unwrap_or_else(|| panic!("{name}: seeded issue missing"));
    assert_eq!(issue.state, "open", "{name}: seeded issue state");

    let updated = repo
        .update_issue_state("pilot", "yona", 1, "closed")
        .await
        .unwrap_or_else(|error| panic!("{name}: update_issue_state failed: {error}"))
        .unwrap_or_else(|| panic!("{name}: updated issue missing"));
    assert_eq!(updated.state, "closed", "{name}: updated issue state");
}

async fn connect_with_retry(name: &str, url: &str) -> sea_orm::DatabaseConnection {
    let mut last_error = None;

    for _ in 0..60 {
        match Database::connect(url).await {
            Ok(db) => return db,
            Err(error) => {
                last_error = Some(error.to_string());
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }
        }
    }

    panic!(
        "{name}: failed to connect after retries: {}",
        last_error.unwrap_or_else(|| "unknown error".to_string())
    );
}
