use axum::{
    extract::Query,
    http::HeaderMap,
    response::{IntoResponse, Redirect, Response},
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::{
    base_path_href, normalize_default_landing_path, redirect_to, session::SessionManager,
    ConnectError, PilotBackend, RestRouteError,
};

#[derive(Deserialize)]
struct DirectDefaultLoginPageQuery {
    path: Option<String>,
}

#[derive(Serialize)]
struct DirectDefaultLoginPageResponse {
    #[serde(rename = "defaultLoginPage")]
    default_login_page: String,
}

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    let reset_visited_session_manager = session_manager.clone();
    let reset_visited_backend = backend.clone();
    let reset_visited_base_path = base_path.clone();
    let default_login_page_session_manager = session_manager.clone();
    let default_login_page_backend = backend.clone();
    let legacy_default_login_page_session_manager = session_manager.clone();
    let legacy_default_login_page_backend = backend.clone();

    Router::new()
        .route(
            "/user/resetVisitedList",
            post(move |headers: HeaderMap| {
                async move {
                    direct_reset_user_visited_list(
                        headers,
                        reset_visited_session_manager.clone(),
                        reset_visited_backend.clone(),
                        reset_visited_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/defultLoginPage",
            post(move |headers: HeaderMap, Query(query): Query<DirectDefaultLoginPageQuery>| {
                async move {
                    direct_set_default_login_page(
                        headers,
                        query,
                        default_login_page_session_manager.clone(),
                        default_login_page_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/user/defultLoginPage",
            post(move |headers: HeaderMap, Query(query): Query<DirectDefaultLoginPageQuery>| {
                async move {
                    direct_set_default_login_page(
                        headers,
                        query,
                        legacy_default_login_page_session_manager.clone(),
                        legacy_default_login_page_backend.clone(),
                    )
                    .await
                }
            }),
        )
}

async fn direct_reset_user_visited_list(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let login_redirect = base_path_href(
        &base_path,
        "/users/loginform?redirectUrl=%2Fuser%2Feditform",
    );
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return Redirect::to(&login_redirect).into_response();
    };
    let Some(user_id) = session.user_id else {
        return Redirect::to(&login_redirect).into_response();
    };

    match &backend {
        PilotBackend::Repository(repository) => {
            match repository.clear_recent_projects_for_user(user_id).await {
                Ok(()) => redirect_to(&base_path, "/user/editform"),
                Err(error) => RestRouteError::internal(error.to_string()).into_response(),
            }
        }
        _ => {
            RestRouteError::not_implemented("workspace requires repository backend").into_response()
        }
    }
}

async fn direct_set_default_login_page(
    headers: HeaderMap,
    query: DirectDefaultLoginPageQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
        .into_response();
    };
    let Some(user_id) = session.user_id else {
        return RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
        .into_response();
    };
    let Some(path) = normalize_default_landing_path(query.path.as_deref()) else {
        return RestRouteError::bad_request("invalid default landing path").into_response();
    };

    match &backend {
        PilotBackend::Repository(repository) => match repository
            .set_default_landing_path(user_id, Some(path.clone()))
            .await
        {
            Ok(_) => Json(DirectDefaultLoginPageResponse {
                default_login_page: path,
            })
            .into_response(),
            Err(error) => RestRouteError::internal(error.to_string()).into_response(),
        },
        _ => {
            RestRouteError::not_implemented("workspace requires repository backend").into_response()
        }
    }
}
