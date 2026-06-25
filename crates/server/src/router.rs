use axum::extract::Request;
use axum::middleware::{from_fn, Next};
use axum::Router;
use std::path::PathBuf;

use crate::anonymous_access::anonymous_access_gate;
use crate::assets::{apply_asset_routes, mount_base_path};
use crate::persistence::PilotRepository;
use crate::runtime_config::normalize_base_path;
use crate::session::{SessionConfig, SessionManager};
use crate::{
    routes, AppRuntimeConfig, AssetMode, BrowserRuntimeConfig, PilotBackend, PilotServiceImpl,
    RuntimeConfig, RuntimeRegistry,
};

pub fn create_router(config: RuntimeConfig) -> Router {
    build_router(config, PilotBackend::Static, AssetMode::None)
}

pub fn create_router_with_repository(config: RuntimeConfig, repository: PilotRepository) -> Router {
    build_router(
        config,
        PilotBackend::Repository(repository),
        AssetMode::None,
    )
}

pub fn create_router_with_repository_and_app_config(
    config: RuntimeConfig,
    repository: PilotRepository,
    app_config: AppRuntimeConfig,
) -> Router {
    build_router_with_app_config(
        config,
        PilotBackend::Repository(repository),
        AssetMode::None,
        app_config,
    )
}

pub fn create_router_with_app_repository(
    config: RuntimeConfig,
    repository: PilotRepository,
) -> Router {
    create_router_with_repository(config, repository)
}

pub fn create_router_with_filesystem_assets(config: RuntimeConfig, asset_root: PathBuf) -> Router {
    build_router(
        config,
        PilotBackend::Static,
        AssetMode::Filesystem(asset_root),
    )
}

pub fn create_router_with_filesystem_assets_and_app_config(
    config: RuntimeConfig,
    asset_root: PathBuf,
    app_config: AppRuntimeConfig,
) -> Router {
    build_router_with_app_config(
        config,
        PilotBackend::Static,
        AssetMode::Filesystem(asset_root),
        app_config,
    )
}

pub fn create_router_with_embedded_assets(config: RuntimeConfig) -> Router {
    build_router(config, PilotBackend::Static, AssetMode::Embedded)
}

pub fn create_router_with_embedded_assets_and_app_config(
    config: RuntimeConfig,
    app_config: AppRuntimeConfig,
) -> Router {
    build_router_with_app_config(
        config,
        PilotBackend::Static,
        AssetMode::Embedded,
        app_config,
    )
}

pub fn create_router_with_repository_and_filesystem_assets(
    config: RuntimeConfig,
    repository: PilotRepository,
    asset_root: PathBuf,
) -> Router {
    build_router(
        config,
        PilotBackend::Repository(repository),
        AssetMode::Filesystem(asset_root),
    )
}

pub fn create_router_with_repository_and_filesystem_assets_and_app_config(
    config: RuntimeConfig,
    repository: PilotRepository,
    asset_root: PathBuf,
    app_config: AppRuntimeConfig,
) -> Router {
    build_router_with_app_config(
        config,
        PilotBackend::Repository(repository),
        AssetMode::Filesystem(asset_root),
        app_config,
    )
}

pub fn create_router_with_repository_and_embedded_assets(
    config: RuntimeConfig,
    repository: PilotRepository,
) -> Router {
    build_router(
        config,
        PilotBackend::Repository(repository),
        AssetMode::Embedded,
    )
}

pub fn create_router_with_repository_and_embedded_assets_and_app_config(
    config: RuntimeConfig,
    repository: PilotRepository,
    app_config: AppRuntimeConfig,
) -> Router {
    build_router_with_app_config(
        config,
        PilotBackend::Repository(repository),
        AssetMode::Embedded,
        app_config,
    )
}

fn build_router(config: RuntimeConfig, backend: PilotBackend, assets: AssetMode) -> Router {
    build_router_with_app_config(config, backend, assets, AppRuntimeConfig::default())
}

fn build_router_with_app_config(
    config: RuntimeConfig,
    backend: PilotBackend,
    assets: AssetMode,
    app_config: AppRuntimeConfig,
) -> Router {
    let base_path = normalize_base_path(&config.base_path);
    let public_origin = crate::default_public_origin(&config.public_origin);
    let allow_anonymous_access = config.allow_anonymous_access;
    let runtime = RuntimeRegistry::from_app_config(&app_config);
    let session_manager = SessionManager::new(SessionConfig {
        cookie_path: base_path.clone(),
        public_origin: public_origin.clone(),
        session_timeout_seconds: app_config.session_timeout_seconds,
    });
    let pilot_service = PilotServiceImpl {
        auth_ui: runtime.auth_ui.clone(),
        base_path: base_path.clone(),
        data_root: runtime.data_root.clone(),
        public_origin: public_origin.clone(),
        integrations: runtime.integrations.clone(),
        ldap: runtime.ldap.clone(),
        max_uploaded_file_size: runtime.max_uploaded_file_size,
        oauth: runtime.oauth.clone(),
        session_manager: session_manager.clone(),
        backend: backend.clone(),
        project_default_scope: runtime.project_default_scope.clone(),
        site_name: runtime.site_name.clone(),
        site_update: runtime.site_update.clone(),
        slack_webhook_colors: runtime.slack_webhook_colors.clone(),
        smtp: runtime.smtp.clone(),
        supported_languages: app_config.supported_languages.clone(),
        translation_proxy: runtime.translation_proxy.clone(),
    };
    let browser_runtime = BrowserRuntimeConfig::from_base_path(
        &base_path,
        app_config.project_default_menus.clone(),
        runtime.project_default_scope.clone(),
        app_config.feedback_url.clone(),
        app_config.navbar_custom_link_name.clone(),
        app_config.navbar_custom_link_url.clone(),
        runtime.site_name.clone(),
        app_config.supported_languages.clone(),
        app_config.show_user_email,
        app_config.send_yona_usage,
    );
    let anonymous_gate_session_manager = session_manager.clone();
    let anonymous_gate_base_path = base_path.clone();
    let anonymous_gate_allow_anonymous_access = allow_anonymous_access;
    let rest_router = routes::rest_api_routes(pilot_service.clone());

    let mut base_router = routes::app_routes(
        pilot_service.clone(),
        assets.clone(),
        browser_runtime.clone(),
        runtime.clone(),
        rest_router,
    );

    base_router = apply_asset_routes(
        base_router,
        assets.clone(),
        browser_runtime.clone(),
        pilot_service.clone(),
    );

    base_router = base_router.layer(from_fn(move |request: Request, next: Next| {
        let session_manager = anonymous_gate_session_manager.clone();
        let base_path = anonymous_gate_base_path.clone();
        let allow_anonymous_access = anonymous_gate_allow_anonymous_access;
        async move {
            anonymous_access_gate(
                request,
                next,
                session_manager,
                base_path,
                allow_anonymous_access,
            )
            .await
        }
    }));

    mount_base_path(base_router, assets, browser_runtime, base_path)
}
