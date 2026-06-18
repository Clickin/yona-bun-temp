use axum::{
    extract::Form,
    http::{HeaderMap, Method},
    routing::{get, post},
    Router,
};
use std::collections::HashMap;

use crate::{
    direct_import_project, direct_legacy_init, direct_legacy_migration_disabled,
    direct_legacy_migration_json_disabled, legacy_external_api_hello, serve_frontend_page,
    session::SessionManager, AssetMode, BrowserRuntimeConfig, PilotBackend,
};

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
    base_path: String,
    project_default_scope: String,
) -> Router {
    let legacy_api_index_assets = assets.clone();
    let legacy_api_index_browser_runtime = browser_runtime.clone();
    let legacy_api_v1_index_assets = assets;
    let legacy_api_v1_index_browser_runtime = browser_runtime;
    let legacy_init_backend = backend.clone();
    let legacy_init_base_path = base_path.clone();
    let project_import_session_manager = session_manager.clone();
    let project_import_backend = backend;
    let project_import_base_path = base_path.clone();
    let project_import_default_scope = project_default_scope;
    let legacy_migration_session_manager = session_manager.clone();
    let legacy_migration_base_path = base_path.clone();
    let legacy_migration_json_session_manager = session_manager;
    let legacy_migration_json_base_path = base_path;

    Router::new()
        .route(
            "/-_-api",
            get(move || {
                let assets = legacy_api_index_assets.clone();
                let browser_runtime = legacy_api_index_browser_runtime.clone();
                async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
            }),
        )
        .route(
            "/-_-api/v1/",
            get(move || {
                let assets = legacy_api_v1_index_assets.clone();
                let browser_runtime = legacy_api_v1_index_browser_runtime.clone();
                async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
            }),
        )
        .route("/-_-api/v1/hello", get(legacy_external_api_hello))
        .route(
            "/_init",
            get(move || {
                let backend = legacy_init_backend.clone();
                let base_path = legacy_init_base_path.clone();
                async move { direct_legacy_init(backend, base_path).await }
            }),
        )
        .route(
            "/_import",
            post(
                move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| async move {
                    direct_import_project(
                        headers,
                        form,
                        project_import_session_manager.clone(),
                        project_import_backend.clone(),
                        project_import_base_path.clone(),
                        project_import_default_scope.clone(),
                    )
                    .await
                },
            ),
        )
        .route(
            "/migration",
            get(move |headers: HeaderMap| {
                let session_manager = legacy_migration_session_manager.clone();
                let base_path = legacy_migration_base_path.clone();
                async move {
                    direct_legacy_migration_disabled(headers, session_manager, base_path).await
                }
            }),
        )
        .route(
            "/migration/{*legacy_path}",
            get(move |headers: HeaderMap| {
                let session_manager = legacy_migration_json_session_manager.clone();
                let base_path = legacy_migration_json_base_path.clone();
                async move {
                    direct_legacy_migration_json_disabled(headers, session_manager, base_path).await
                }
            }),
        )
}
