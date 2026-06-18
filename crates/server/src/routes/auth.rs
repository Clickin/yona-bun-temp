use axum::{
    http::HeaderMap,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};

use crate::{session::SessionManager, PilotBackend};

pub(crate) fn routes(session_manager: SessionManager, backend: PilotBackend) -> Router {
    Router::new().route(
        "/api/auth/session",
        get(move |headers: HeaderMap| {
            let session_manager = session_manager.clone();
            let backend = backend.clone();
            async move { session_bootstrap(headers, session_manager, backend).await }
        }),
    )
}

async fn session_bootstrap(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let session = session_manager.ensure_anonymous_session(&headers);
    let payload = crate::build_session_route_payload(&backend, &session).await;
    let mut response = Json(payload).into_response();
    response.headers_mut().insert(
        "X-CSRF-Token",
        session.csrf_token.parse().expect("csrf token header"),
    );
    for cookie in session_manager.build_set_cookie_headers(&session) {
        response.headers_mut().append(
            axum::http::header::SET_COOKIE,
            cookie.parse().expect("set-cookie header"),
        );
    }
    response
}
