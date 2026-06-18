use axum::Router;

mod auth;
mod messages;
mod notifications;
mod search;

pub(crate) use auth::routes as auth_routes;
pub(crate) use notifications::routes as notification_routes;
pub(crate) use search::routes as search_routes;

pub(crate) fn static_compat_routes() -> Router {
    Router::new().merge(messages::routes())
}
