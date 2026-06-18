use axum::{
    http::HeaderMap,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use std::sync::atomic::Ordering;

use crate::{
    rest_require_site_admin_repository, rest_site_update_download_file_response,
    rest_site_update_download_redirect, session::SessionManager, AuthUiConfig, PilotBackend,
    PilotServiceImpl, SiteUpdateConfig, SITE_UPDATE_NOTIFICATION_WATCHED,
};

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    site_update: SiteUpdateConfig,
) -> Router {
    let unwatch_session_manager = session_manager.clone();
    let unwatch_backend = backend.clone();
    let site_update_download_session_manager = session_manager.clone();
    let site_update_download_backend = backend.clone();
    let site_update_download_config = site_update.clone();
    let site_update_download_file_session_manager = session_manager.clone();
    let site_update_download_file_backend = backend.clone();
    let site_update_download_file_config = site_update.clone();

    Router::new()
        .route(
            "/sites/unwatchUpdate",
            post(move |headers: HeaderMap| {
                let session_manager = unwatch_session_manager.clone();
                let backend = unwatch_backend.clone();
                async move { direct_unwatch_site_update(headers, session_manager, backend).await }
            }),
        )
        .route(
            "/sites/update/download",
            get(move |headers: HeaderMap| async move {
                direct_download_site_update(
                    headers,
                    site_update_download_session_manager.clone(),
                    site_update_download_backend.clone(),
                    site_update_download_config.clone(),
                )
                .await
            }),
        )
        .route(
            "/sites/update/download-file",
            get(move |headers: HeaderMap| async move {
                direct_download_site_update_file(
                    headers,
                    site_update_download_file_session_manager.clone(),
                    site_update_download_file_backend.clone(),
                    site_update_download_file_config.clone(),
                )
                .await
            }),
        )
}

async fn direct_unwatch_site_update(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_require_site_admin_repository(&service, &headers, true).await {
        Ok(_) => {
            SITE_UPDATE_NOTIFICATION_WATCHED.store(false, Ordering::SeqCst);
            StatusCode::OK.into_response()
        }
        Err(error) => error.into_response(),
    }
}

async fn direct_download_site_update(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
    site_update: SiteUpdateConfig,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_require_site_admin_repository(&service, &headers, false).await {
        Ok(_) => match rest_site_update_download_redirect(&site_update) {
            Ok(redirect) => redirect.into_response(),
            Err(error) => error.into_response(),
        },
        Err(error) => error.into_response(),
    }
}

async fn direct_download_site_update_file(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
    site_update: SiteUpdateConfig,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_require_site_admin_repository(&service, &headers, false).await {
        Ok(_) => match rest_site_update_download_file_response(&site_update) {
            Ok(response) => response,
            Err(error) => error.into_response(),
        },
        Err(error) => error.into_response(),
    }
}
