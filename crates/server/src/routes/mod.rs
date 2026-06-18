use axum::Router;

mod auth;
mod messages;

pub(crate) use auth::routes as auth_routes;

pub(crate) fn static_compat_routes() -> Router {
    Router::new().merge(messages::routes())
}
