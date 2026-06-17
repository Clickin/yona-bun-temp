use sea_orm::Database;
use yona_rust_persistence::{AppUserInput, AppUserRepository, DefaultLandingRepository};
use yona_rust_pilot_migration::Migrator;

#[tokio::test]
async fn app_user_repository_creates_and_finds_users_by_login_or_email() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let users = AppUserRepository::new(db.clone());
    let created = users
        .create_user(AppUserInput {
            display_name: "Door".to_string(),
            email_address: "door@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "door".to_string(),
            password_hash: "bcrypt-hash".to_string(),
        })
        .await
        .expect("create user");

    assert_eq!(created.login_id, "door");
    assert_eq!(
        users
            .find_by_identifier("door")
            .await
            .expect("lookup by login")
            .unwrap()
            .id,
        created.id,
    );
    assert_eq!(
        users
            .find_by_identifier("door@example.com")
            .await
            .expect("lookup by email")
            .unwrap()
            .id,
        created.id,
    );
}

#[tokio::test]
async fn default_landing_repository_reads_and_writes_preferences() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let users = AppUserRepository::new(db.clone());
    let defaults = DefaultLandingRepository::new(db.clone());
    let user = users
        .create_user(AppUserInput {
            display_name: "Door".to_string(),
            email_address: "door@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "door".to_string(),
            password_hash: "bcrypt-hash".to_string(),
        })
        .await
        .expect("create user");

    assert_eq!(
        defaults
            .read_default_landing_path(user.id)
            .await
            .expect("read default"),
        None,
    );

    defaults
        .set_default_landing_path(user.id, "/me")
        .await
        .expect("set default");

    assert_eq!(
        defaults
            .read_default_landing_path(user.id)
            .await
            .expect("read updated default"),
        Some("/me".to_string()),
    );

    defaults
        .set_default_landing_path(user.id, "/projects")
        .await
        .expect("replace default");

    assert_eq!(
        defaults
            .read_default_landing_path(user.id)
            .await
            .expect("read replaced default"),
        Some("/projects".to_string()),
    );
}
