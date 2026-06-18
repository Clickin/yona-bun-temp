use axum::{
    http::HeaderMap,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
    Router,
};
use std::sync::atomic::Ordering;

use crate::{
    rest_require_site_admin_repository, session::SessionManager, AuthUiConfig, PilotBackend,
    PilotServiceImpl, SITE_UPDATE_NOTIFICATION_WATCHED,
};

pub(crate) fn routes(session_manager: SessionManager, backend: PilotBackend) -> Router {
    Router::new().route(
        "/sites/unwatchUpdate",
        post(move |headers: HeaderMap| {
            let session_manager = session_manager.clone();
            let backend = backend.clone();
            async move { direct_unwatch_site_update(headers, session_manager, backend).await }
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
