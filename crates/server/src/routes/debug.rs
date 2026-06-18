use axum::{extract::Path, http::HeaderMap, routing::post, Json, Router};

use crate::{rest_debug_method, AuthUiConfig, PilotServiceImpl};

#[cfg(debug_assertions)]
pub(crate) fn routes(service: PilotServiceImpl, auth_ui: AuthUiConfig) -> Router {
    Router::new().route(
        "/_pilot/{method_name}",
        post(
            move |headers: HeaderMap,
                  Path(method_name): Path<String>,
                  Json(payload): Json<serde_json::Value>| {
                let service = service.clone();
                let auth_ui = auth_ui.clone();
                async move { rest_debug_method(headers, method_name, payload, service, auth_ui).await }
            },
        ),
    )
}
