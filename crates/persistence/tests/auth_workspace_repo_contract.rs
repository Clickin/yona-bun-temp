use sea_orm::Database;
use yoram_persistence::{AppRepository, CreateUserInput};
use yoram_migration::Migrator;

#[tokio::test]
async fn creates_users_reads_them_by_identifier_and_stores_default_landing() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let repo = AppRepository::new(db);
    let created = repo
        .create_user(CreateUserInput {
            display_name: "Door".to_string(),
            email_address: "door@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "door".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create user");

    let by_login = repo
        .find_user_by_identifier("door")
        .await
        .expect("find by login")
        .expect("user by login");
    assert_eq!(by_login.id, created.id);

    let by_email = repo
        .find_user_by_identifier("door@example.com")
        .await
        .expect("find by email")
        .expect("user by email");
    assert_eq!(by_email.id, created.id);

    repo.set_default_landing_path(created.id, Some("/yobi/yona".to_string()))
        .await
        .expect("save default landing");
    assert_eq!(
        repo.read_default_landing_path(created.id)
            .await
            .expect("read default landing"),
        Some("/yobi/yona".to_string())
    );
}
