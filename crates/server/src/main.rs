use tracing_subscriber::EnvFilter;
use yona_rust_pilot_migration::{seed_pilot_data, Migrator};
use yona_rust_pilot_server::persistence::PilotRepository;
use yona_rust_pilot_server::runtime_config::load_startup_config_from_env;
use yona_rust_pilot_server::{
    create_router_with_repository, create_router_with_repository_and_embedded_assets,
    create_router_with_repository_and_filesystem_assets, mailbox_polling_config_from_env,
    notification_mail_scheduler_config_from_env, spawn_mailbox_polling_scheduler,
    spawn_notification_mail_scheduler, RuntimeConfig,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let startup = load_startup_config_from_env()?;
    let config: RuntimeConfig = startup.runtime.clone();
    let db = sea_orm::Database::connect(&startup.database_url).await?;
    Migrator::ensure_runtime_schema_with_policy(&db, startup.schema_policy).await?;
    if startup.seed_pilot {
        seed_pilot_data(&db).await?;
    }

    let repository = PilotRepository::new(db);
    let _notification_mail_scheduler = spawn_notification_mail_scheduler(
        repository.clone(),
        config.public_origin.clone(),
        config.base_path.clone(),
        notification_mail_scheduler_config_from_env(),
    );
    let _mailbox_polling_scheduler =
        spawn_mailbox_polling_scheduler(repository.clone(), mailbox_polling_config_from_env());
    let app = if startup.use_embedded_assets {
        create_router_with_repository_and_embedded_assets(config, repository)
    } else if let Some(asset_root) = startup.asset_root {
        create_router_with_repository_and_filesystem_assets(config, repository, asset_root.into())
    } else {
        create_router_with_repository(config, repository)
    };
    let listener = tokio::net::TcpListener::bind(&startup.bind_addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
