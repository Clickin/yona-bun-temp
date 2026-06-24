use axum::{
    http::HeaderMap,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};

use crate::api_types::ReadWorkspaceOverviewResponse;
use crate::{
    base_path_href, rest_json_response, Context, PilotBackend, PilotServiceImpl, RestRouteError,
};

use super::workspace_overview_read;

#[derive(Deserialize)]
pub(super) struct DirectUserSidebarQuery {
    hash: Option<String>,
    path: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectUserSidebarResponse {
    iframe_path: String,
    site_name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    workspace: Option<ReadWorkspaceOverviewResponse>,
}

pub(super) async fn direct_user_sidebar(
    headers: HeaderMap,
    query: DirectUserSidebarQuery,
    service: PilotServiceImpl,
    site_name: String,
) -> Response {
    let session = service.session_manager.read_session_from_headers(&headers);
    let iframe_path = legacy_sidebar_iframe_path(&service.base_path, query);
    let user_id = session.as_ref().and_then(|session| session.user_id);
    let ctx = Context::new(headers);

    let workspace = match (&service.backend, user_id) {
        (PilotBackend::Repository(_), Some(_)) => {
            match workspace_overview_read(&service, ctx).await {
                Ok((payload, ctx)) => {
                    return rest_json_response(
                        DirectUserSidebarResponse {
                            iframe_path,
                            site_name,
                            workspace: Some(payload),
                        },
                        ctx,
                    );
                }
                Err(error) => return RestRouteError::from_connect_error(error).into_response(),
            }
        }
        (PilotBackend::Repository(_), None) => None,
        (PilotBackend::Static, Some(_)) => {
            return RestRouteError::not_implemented("sidebar requires repository backend")
                .into_response();
        }
        (PilotBackend::Static, None) => None,
    };

    rest_json_response(
        DirectUserSidebarResponse {
            iframe_path,
            site_name,
            workspace,
        },
        ctx,
    )
}

pub(super) async fn direct_user_menu_tab_content_list(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Response {
    match workspace_overview_read(&service, Context::new(headers)).await {
        Ok((payload, ctx)) => rest_json_response(payload, ctx),
        Err(error) => RestRouteError::from_connect_error(error).into_response(),
    }
}

fn legacy_sidebar_iframe_path(base_path: &str, query: DirectUserSidebarQuery) -> String {
    let path = query
        .path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("/notifications");
    let mut iframe_path = if path.starts_with('/') {
        base_path_href(base_path, path)
    } else {
        base_path_href(base_path, &format!("/{path}"))
    };
    if let Some(hash) = query
        .hash
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        iframe_path.push('#');
        iframe_path.push_str(hash.trim_start_matches('#'));
    }
    iframe_path
}
