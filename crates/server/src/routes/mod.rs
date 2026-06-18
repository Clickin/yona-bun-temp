use axum::Router;

mod auth;
mod boards;
mod messages;
mod notifications;
mod projects;
mod search;
mod site_admin;
mod workspace;

pub(crate) use auth::routes as auth_routes;
pub(crate) use boards::routes as board_routes;
pub(crate) use notifications::routes as notification_routes;
pub(crate) use projects::routes as project_routes;
pub(crate) use search::routes as search_routes;
pub(crate) use site_admin::routes as site_admin_routes;
pub(crate) use workspace::routes as workspace_routes;

pub(crate) fn static_compat_routes() -> Router {
    Router::new().merge(messages::routes())
}
