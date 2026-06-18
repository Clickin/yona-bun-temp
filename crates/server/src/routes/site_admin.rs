use axum::{
    extract::{Path, Query},
    http::HeaderMap,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use std::sync::atomic::Ordering;

use crate::{
    direct_site_user_list_href, redirect_to, rest_require_site_admin_repository,
    rest_site_update_download_file_response, rest_site_update_download_redirect,
    rest_toggle_site_user_account_lock, rest_toggle_site_user_admin, rest_toggle_site_user_guest,
    session::SessionManager, AuthUiConfig, PilotBackend, PilotServiceImpl, RestRouteError,
    SiteUpdateConfig, SITE_UPDATE_NOTIFICATION_WATCHED,
};

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    site_update: SiteUpdateConfig,
    base_path: String,
) -> Router {
    let unwatch_session_manager = session_manager.clone();
    let unwatch_backend = backend.clone();
    let site_update_download_session_manager = session_manager.clone();
    let site_update_download_backend = backend.clone();
    let site_update_download_config = site_update.clone();
    let site_update_download_file_session_manager = session_manager.clone();
    let site_update_download_file_backend = backend.clone();
    let site_update_download_file_config = site_update.clone();
    let site_toggle_admin_session_manager = session_manager.clone();
    let site_toggle_admin_backend = backend.clone();
    let site_toggle_admin_base_path = base_path.clone();
    let site_toggle_lock_session_manager = session_manager.clone();
    let site_toggle_lock_backend = backend.clone();
    let site_toggle_lock_base_path = base_path.clone();
    let site_toggle_guest_session_manager = session_manager.clone();
    let site_toggle_guest_backend = backend.clone();
    let site_toggle_guest_base_path = base_path.clone();

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
        .route(
            "/sites/toggleSiteAdminRole/{login_id}",
            post(move |headers: HeaderMap, Path(login_id): Path<String>| {
                async move {
                    direct_toggle_site_admin_role(
                        headers,
                        login_id,
                        site_toggle_admin_session_manager.clone(),
                        site_toggle_admin_backend.clone(),
                        site_toggle_admin_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/toggleAccountLock",
            post(
                move |headers: HeaderMap, Query(query): Query<RestSiteDirectUserMutationQuery>| {
                    async move {
                        direct_toggle_site_user_account_lock(
                            headers,
                            query,
                            site_toggle_lock_session_manager.clone(),
                            site_toggle_lock_backend.clone(),
                            site_toggle_lock_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/sites/toggleGuestMode",
            post(
                move |headers: HeaderMap, Query(query): Query<RestSiteDirectUserMutationQuery>| {
                    async move {
                        direct_toggle_site_user_guest(
                            headers,
                            query,
                            site_toggle_guest_session_manager.clone(),
                            site_toggle_guest_backend.clone(),
                            site_toggle_guest_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteDirectUserMutationQuery {
    login_id: String,
    query: Option<String>,
    state: Option<String>,
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

async fn direct_toggle_site_admin_role(
    headers: HeaderMap,
    login_id: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_toggle_site_user_admin(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, "/sites/userList"),
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_user_account_lock(
    headers: HeaderMap,
    query: RestSiteDirectUserMutationQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let login_id = query.login_id.trim().to_string();
    if login_id.is_empty() {
        return RestRouteError::bad_request("loginId is required").into_response();
    }
    let redirect_path = direct_site_user_list_href(query.state.as_deref(), query.query.as_deref());
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_toggle_site_user_account_lock(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_user_guest(
    headers: HeaderMap,
    query: RestSiteDirectUserMutationQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let login_id = query.login_id.trim().to_string();
    if login_id.is_empty() {
        return RestRouteError::bad_request("loginId is required").into_response();
    }
    let redirect_path = direct_site_user_list_href(query.state.as_deref(), query.query.as_deref());
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_toggle_site_user_guest(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, &redirect_path),
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
