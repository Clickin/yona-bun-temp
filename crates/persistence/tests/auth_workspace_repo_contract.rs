use sea_orm::{ConnectionTrait, Database};
use yoram_migration::Migrator;
use yoram_persistence::{AppRepository, CreateUserInput};

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

#[tokio::test]
async fn oauth_password_repair_reaches_later_batches_and_propagates_write_failures() {
    let db = Database::connect("sqlite::memory:").await.unwrap();
    Migrator::fresh(&db).await.unwrap();
    let repo = AppRepository::new(db.clone());
    let local_hash = bcrypt::hash("legitimate-local-password", 4).unwrap();
    // A full batch of unaffected accounts must not hide a later vulnerable one.
    for index in 0..129 {
        let login_id = format!("oauth-{index}");
        repo.link_or_create_oauth_user(yoram_persistence::OAuthUserInput {
            email_address: format!("{login_id}@example.com"),
            display_name: login_id.clone(),
            login_id_hint: login_id.clone(),
            password_hash: if index == 128 {
                bcrypt::hash(format!("github:{login_id}:oauth"), 4).unwrap()
            } else {
                local_hash.clone()
            },
            provider: "github".to_string(),
            provider_display_name: "GitHub".to_string(),
            provider_user_id: login_id,
        })
        .await
        .unwrap();
    }
    db.execute_unprepared(
        "CREATE TRIGGER deny_password_repair BEFORE UPDATE OF password ON n4user \
         BEGIN SELECT RAISE(ABORT, 'repair write denied'); END",
    )
    .await
    .unwrap();
    assert!(repo.revoke_predictable_oauth_passwords().await.is_err());
    db.execute_unprepared("DROP TRIGGER deny_password_repair")
        .await
        .unwrap();
    assert_eq!(repo.revoke_predictable_oauth_passwords().await.unwrap(), 1);
    assert_eq!(repo.revoke_predictable_oauth_passwords().await.unwrap(), 0);
    let vulnerable = repo
        .find_user_by_identifier("oauth-128")
        .await
        .unwrap()
        .unwrap();
    assert!(!bcrypt::verify("github:oauth-128:oauth", &vulnerable.password_hash).unwrap_or(false));
    let unaffected = repo
        .find_user_by_identifier("oauth-0")
        .await
        .unwrap()
        .unwrap();
    assert!(bcrypt::verify("legitimate-local-password", &unaffected.password_hash).unwrap());
}
