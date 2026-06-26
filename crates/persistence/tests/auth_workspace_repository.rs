use sea_orm::{Database, EntityName};
use yoram_migration::Migrator;
use yoram_persistence::{
    AppRepository, AppUserInput, AppUserRepository, CreateUserInput, DefaultLandingRepository,
    RepositoryConfig,
};

#[test]
fn persistence_crate_reexports_seaorm_entities() {
    assert_eq!(yoram_persistence::issue::Entity.table_name(), "issue");
    assert_eq!(yoram_persistence::project::Entity.table_name(), "project");
}

#[tokio::test]
async fn app_repository_uses_injected_config_for_guest_classification() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let repo = AppRepository::new_with_config(
        db,
        RepositoryConfig::from_pairs([("YONA_GUEST_LOGIN_PREFIX", "guest_")]),
    );
    let created = repo
        .create_user(CreateUserInput {
            display_name: "Guest".to_string(),
            email_address: "guest@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "guest_alice".to_string(),
            password_hash: "bcrypt-hash".to_string(),
        })
        .await
        .expect("create guest user");

    assert!(created.is_guest);
}

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
    assert!(users
        .find_by_identifier("missing@example.com")
        .await
        .expect("lookup missing user")
        .is_none());
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
