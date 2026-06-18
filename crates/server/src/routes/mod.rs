use axum::Router;

mod messages;

pub(crate) fn static_compat_routes() -> Router {
    Router::new().merge(messages::routes())
}
