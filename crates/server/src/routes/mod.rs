use axum::Router;

mod auth;
mod boards;
mod code;
#[cfg(debug_assertions)]
mod debug;
mod files;
mod issues;
mod legacy_runtime;
mod messages;
mod notifications;
mod projects;
mod pull_requests;
mod search;
mod site_admin;
mod users;
mod workspace;

pub(crate) use auth::rest_routes as auth_rest_routes;
pub(crate) use auth::routes as auth_routes;
pub(crate) use boards::rest_routes as board_rest_routes;
pub(crate) use boards::routes as board_routes;
pub(crate) use code::rest_routes as code_rest_routes;
pub(crate) use code::routes as code_routes;
#[cfg(debug_assertions)]
pub(crate) use debug::routes as debug_routes;
pub(crate) use files::routes as file_routes;
pub(crate) use issues::rest_routes as issue_rest_routes;
pub(crate) use issues::routes as issue_routes;
pub(crate) use legacy_runtime::routes as legacy_runtime_routes;
pub(crate) use notifications::rest_routes as notification_rest_routes;
pub(crate) use notifications::routes as notification_routes;
pub(crate) use projects::rest_routes as project_rest_routes;
pub(crate) use projects::routes as project_routes;
pub(crate) use pull_requests::rest_routes as pull_request_rest_routes;
pub(crate) use pull_requests::routes as pull_request_routes;
pub(crate) use search::routes as search_routes;
pub(crate) use site_admin::rest_routes as site_admin_rest_routes;
pub(crate) use site_admin::routes as site_admin_routes;
pub(crate) use users::rest_routes as user_rest_routes;
pub(crate) use users::routes as user_routes;
pub(crate) use workspace::rest_routes as workspace_rest_routes;
pub(crate) use workspace::routes as workspace_routes;

pub(crate) fn static_compat_routes() -> Router {
    Router::new().merge(messages::routes())
}
