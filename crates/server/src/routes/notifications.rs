use axum::{extract::Query, http::HeaderMap, routing::get, Router};

use crate::{session::SessionManager, DirectNotificationPartialQuery, PilotBackend};

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    Router::new().route(
        "/notification",
        get(
            move |headers: HeaderMap, Query(query): Query<DirectNotificationPartialQuery>| {
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                async move {
                    crate::direct_notification_partial(
                        headers,
                        query,
                        session_manager,
                        backend,
                        base_path,
                    )
                    .await
                }
            },
        ),
    )
}
