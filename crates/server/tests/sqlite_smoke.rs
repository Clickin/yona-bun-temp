use sea_orm::Database;
use yoram_migration::{seed_pilot_data, Migrator};
use yoram_server::persistence::PilotRepository;

#[tokio::test]
async fn sqlite_smoke_covers_migrate_seed_read_and_update() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");

    Migrator::fresh(&db).await.expect("fresh migration");
    seed_pilot_data(&db).await.expect("seed pilot data");

    let repo = PilotRepository::new(db.clone());

    let projects = repo.list_projects().await.expect("list projects");
    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0].owner_name, "pilot");
    assert_eq!(projects[0].project_name, "yona");
    assert_eq!(projects[0].overview.as_deref(), Some("Yona project"));

    let issue = repo
        .read_issue_detail("pilot", "yona", 1)
        .await
        .expect("read issue")
        .expect("seeded issue");
    assert_eq!(issue.state, "open");

    let updated = repo
        .update_issue_state("pilot", "yona", 1, "closed")
        .await
        .expect("update issue")
        .expect("updated issue");
    assert_eq!(updated.state, "closed");
}
