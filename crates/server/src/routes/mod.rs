use axum::Router;

mod auth;
mod boards;
mod code;
mod files;
mod issues;
mod messages;
mod notifications;
mod projects;
mod pull_requests;
mod search;
mod site_admin;
mod workspace;

pub(crate) use auth::routes as auth_routes;
pub(crate) use boards::routes as board_routes;
pub(crate) use code::routes as code_routes;
pub(crate) use files::routes as file_routes;
pub(crate) use issues::routes as issue_routes;
pub(crate) use notifications::routes as notification_routes;
pub(crate) use projects::routes as project_routes;
pub(crate) use pull_requests::routes as pull_request_routes;
pub(crate) use search::routes as search_routes;
pub(crate) use site_admin::routes as site_admin_routes;
pub(crate) use workspace::routes as workspace_routes;

pub(crate) fn static_compat_routes() -> Router {
    Router::new().merge(messages::routes())
}
