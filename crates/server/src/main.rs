use tracing_subscriber::EnvFilter;
use yoram_migration::{seed_pilot_data, Migrator};
use yoram_server::persistence::PilotRepository;
use yoram_server::runtime_config::load_startup_config_from_env;
use yoram_server::{
    create_router_with_repository_and_app_config,
    create_router_with_repository_and_embedded_assets_and_app_config,
    create_router_with_repository_and_filesystem_assets_and_app_config,
    mailbox_polling_config_from_startup, notification_mail_scheduler_config_from_startup,
    reconcile_site_import_staging_uploads_for_startup, repository_config_from_startup,
    spawn_mailbox_polling_scheduler, spawn_notification_mail_scheduler, AppRuntimeConfig,
    NotificationMailDeliveryConfig, RuntimeConfig,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let startup = load_startup_config_from_env()?;
    let config: RuntimeConfig = startup.runtime.clone();
    let base_path = config.base_path.clone();
    let app_config = AppRuntimeConfig::from_startup(&startup);
    let repository_config = repository_config_from_startup(&startup);
    println!(
        "yoram starting: bind_addr={} base_path={} config={} database={} assets={}",
        startup.bind_addr,
        base_path,
        startup.config_source,
        redact_database_url(&startup.database_url),
        asset_mode_label(&startup)
    );
    let db = sea_orm::Database::connect(&startup.database_url).await?;
    Migrator::ensure_runtime_schema_with_policy(&db, startup.schema_policy).await?;
    if startup.seed_pilot {
        seed_pilot_data(&db).await?;
    }

    let repository = PilotRepository::new_with_config(db, repository_config);
    reconcile_site_import_staging_uploads_for_startup(&app_config.data_root, &repository)
        .await
        .map_err(anyhow::Error::msg)?;
    let _notification_mail_scheduler = spawn_notification_mail_scheduler(
        repository.clone(),
        config.public_origin.clone(),
        config.base_path.clone(),
        notification_mail_scheduler_config_from_startup(&startup),
        NotificationMailDeliveryConfig::from_startup(&startup),
    );
    let _mailbox_polling_scheduler = spawn_mailbox_polling_scheduler(
        repository.clone(),
        mailbox_polling_config_from_startup(&startup),
    );
    let app = if startup.use_embedded_assets {
        create_router_with_repository_and_embedded_assets_and_app_config(
            config, repository, app_config,
        )
    } else if let Some(asset_root) = startup.asset_root {
        create_router_with_repository_and_filesystem_assets_and_app_config(
            config,
            repository,
            asset_root.into(),
            app_config,
        )
    } else {
        create_router_with_repository_and_app_config(config, repository, app_config)
    };
    let listener = tokio::net::TcpListener::bind(&startup.bind_addr).await?;
    println!(
        "yoram listening: http://{}{}",
        startup.bind_addr,
        if base_path == "/" {
            "/"
        } else {
            base_path.as_str()
        }
    );
    axum::serve(listener, app).await?;
    Ok(())
}

fn asset_mode_label(startup: &yoram_server::runtime_config::StartupConfig) -> &'static str {
    if startup.use_embedded_assets {
        "embedded"
    } else if startup.asset_root.is_some() {
        "filesystem"
    } else {
        "none"
    }
}

fn redact_database_url(url: &str) -> String {
    let Some((scheme, rest)) = url.split_once("://") else {
        return url.to_string();
    };
    if rest.contains('@') {
        format!("{scheme}://<redacted>@{}", rest.rsplit_once('@').unwrap().1)
    } else {
        url.to_string()
    }
}
