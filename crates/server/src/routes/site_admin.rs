use axum::{http::HeaderMap, routing::post, Router};

use crate::{session::SessionManager, PilotBackend};

pub(crate) fn routes(session_manager: SessionManager, backend: PilotBackend) -> Router {
    Router::new().route(
        "/sites/unwatchUpdate",
        post(move |headers: HeaderMap| {
            let session_manager = session_manager.clone();
            let backend = backend.clone();
            async move { crate::direct_unwatch_site_update(headers, session_manager, backend).await }
        }),
    )
}
