use axum::{
    extract::{Form, Path, Query},
    http::HeaderMap,
    response::{IntoResponse, Redirect, Response},
    routing::{delete, get, post, put},
    Json, Router,
};
use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::{
    base_path_href, direct_add_workspace_email, direct_change_user_password,
    direct_confirm_workspace_email, direct_delete_workspace_email, direct_legacy_leave_project,
    direct_reset_api_token_from_settings_form, direct_send_workspace_email_validation,
    direct_set_main_workspace_email, direct_update_user_profile, direct_user_menu_tab_content_list,
    direct_user_sidebar, legacy_external_favorite_issues, legacy_external_favorite_organizations,
    legacy_external_favorite_projects, legacy_external_toggle_favorite_issue,
    legacy_external_toggle_favorite_organization, legacy_external_toggle_favorite_project,
    normalize_default_landing_path, redirect_to, session::SessionManager, ConnectError,
    DirectUserSidebarQuery, PilotBackend, RestRouteError,
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
    public_origin: String,
) -> Router {
    let reset_visited_session_manager = session_manager.clone();
    let reset_visited_backend = backend.clone();
    let reset_visited_base_path = base_path.clone();
    let default_login_page_session_manager = session_manager.clone();
    let default_login_page_backend = backend.clone();
    let legacy_default_login_page_session_manager = session_manager.clone();
    let legacy_default_login_page_backend = backend.clone();
    let user_sidebar_session_manager = session_manager.clone();
    let user_sidebar_backend = backend.clone();
    let user_sidebar_base_path = base_path.clone();
    let usermenu_tab_session_manager = session_manager.clone();
    let usermenu_tab_backend = backend.clone();
    let usermenu_tab_base_path = base_path.clone();
    let update_profile_session_manager = session_manager.clone();
    let update_profile_backend = backend.clone();
    let update_profile_base_path = base_path.clone();
    let change_user_password_session_manager = session_manager.clone();
    let change_user_password_backend = backend.clone();
    let change_user_password_base_path = base_path.clone();
    let add_workspace_email_session_manager = session_manager.clone();
    let add_workspace_email_backend = backend.clone();
    let add_workspace_email_base_path = base_path.clone();
    let reset_api_token_session_manager = session_manager.clone();
    let reset_api_token_backend = backend.clone();
    let reset_api_token_base_path = base_path.clone();
    let delete_email_session_manager = session_manager.clone();
    let delete_email_backend = backend.clone();
    let delete_email_base_path = base_path.clone();
    let set_main_email_session_manager = session_manager.clone();
    let set_main_email_backend = backend.clone();
    let set_main_email_base_path = base_path.clone();
    let send_validation_session_manager = session_manager.clone();
    let send_validation_backend = backend.clone();
    let send_validation_base_path = base_path.clone();
    let send_validation_public_origin = public_origin.clone();
    let confirm_email_session_manager = session_manager.clone();
    let confirm_email_backend = backend.clone();
    let confirm_email_base_path = base_path.clone();
    let info_leave_session_manager = session_manager.clone();
    let info_leave_backend = backend.clone();
    let info_leave_base_path = base_path.clone();
    let legacy_favorite_projects_list_backend = backend.clone();
    let legacy_favorite_projects_list_session_manager = session_manager.clone();
    let legacy_favorite_project_toggle_backend = backend.clone();
    let legacy_favorite_project_toggle_session_manager = session_manager.clone();
    let legacy_favorite_issues_list_backend = backend.clone();
    let legacy_favorite_issues_list_session_manager = session_manager.clone();
    let legacy_favorite_issue_toggle_backend = backend.clone();
    let legacy_favorite_issue_toggle_session_manager = session_manager.clone();
    let legacy_favorite_organizations_list_backend = backend.clone();
    let legacy_favorite_organizations_list_session_manager = session_manager.clone();
    let legacy_favorite_organization_toggle_backend = backend.clone();
    let legacy_favorite_organization_toggle_session_manager = session_manager.clone();

    Router::new()
        .route(
            "/-_-api/v1/favoriteProjects",
            get(move |headers: HeaderMap| {
                async move {
                    legacy_external_favorite_projects(
                        headers,
                        legacy_favorite_projects_list_session_manager.clone(),
                        legacy_favorite_projects_list_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteProjects/{project_id}",
            post(move |headers: HeaderMap, Path(project_id): Path<i64>| {
                async move {
                    legacy_external_toggle_favorite_project(
                        headers,
                        project_id,
                        legacy_favorite_project_toggle_session_manager.clone(),
                        legacy_favorite_project_toggle_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteIssues",
            get(move |headers: HeaderMap| {
                async move {
                    legacy_external_favorite_issues(
                        headers,
                        legacy_favorite_issues_list_session_manager.clone(),
                        legacy_favorite_issues_list_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteIssues/{issue_id}",
            post(move |headers: HeaderMap, Path(issue_id): Path<i64>| {
                async move {
                    legacy_external_toggle_favorite_issue(
                        headers,
                        issue_id,
                        legacy_favorite_issue_toggle_session_manager.clone(),
                        legacy_favorite_issue_toggle_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteOrganizations",
            get(move |headers: HeaderMap| {
                async move {
                    legacy_external_favorite_organizations(
                        headers,
                        legacy_favorite_organizations_list_session_manager.clone(),
                        legacy_favorite_organizations_list_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteOrganizations/{organization_id}",
            post(
                move |headers: HeaderMap, Path(organization_id): Path<i64>| {
                    async move {
                        legacy_external_toggle_favorite_organization(
                            headers,
                            organization_id,
                            legacy_favorite_organization_toggle_session_manager.clone(),
                            legacy_favorite_organization_toggle_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/user/sidebar",
            axum::routing::get(
                move |headers: HeaderMap, Query(query): Query<DirectUserSidebarQuery>| {
                    async move {
                        direct_user_sidebar(
                            headers,
                            query,
                            user_sidebar_session_manager.clone(),
                            user_sidebar_backend.clone(),
                            user_sidebar_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/user/usermenuTabContentList",
            axum::routing::get(move |headers: HeaderMap| {
                async move {
                    direct_user_menu_tab_content_list(
                        headers,
                        usermenu_tab_session_manager.clone(),
                        usermenu_tab_backend.clone(),
                        usermenu_tab_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/edit",
            post(move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_update_user_profile(
                        headers,
                        form,
                        update_profile_session_manager.clone(),
                        update_profile_backend.clone(),
                        update_profile_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/resetPassword",
            post(move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_change_user_password(
                        headers,
                        form,
                        change_user_password_session_manager.clone(),
                        change_user_password_backend.clone(),
                        change_user_password_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/email",
            post(move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_add_workspace_email(
                        headers,
                        form,
                        add_workspace_email_session_manager.clone(),
                        add_workspace_email_backend.clone(),
                        add_workspace_email_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/editform/token_reset",
            post(move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_reset_api_token_from_settings_form(
                        headers,
                        form,
                        reset_api_token_session_manager.clone(),
                        reset_api_token_backend.clone(),
                        reset_api_token_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/email/delete/{email_id}",
            delete(move |headers: HeaderMap, Path(email_id): Path<String>| {
                async move {
                    direct_delete_workspace_email(
                        headers,
                        email_id,
                        delete_email_session_manager.clone(),
                        delete_email_backend.clone(),
                        delete_email_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/email/setAsMain/{email_id}",
            put(move |headers: HeaderMap, Path(email_id): Path<String>| {
                async move {
                    direct_set_main_workspace_email(
                        headers,
                        email_id,
                        set_main_email_session_manager.clone(),
                        set_main_email_backend.clone(),
                        set_main_email_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/email/sendValidationEmail/{email_id}",
            post(
                move |headers: HeaderMap,
                      Path(email_id): Path<String>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_send_workspace_email_validation(
                            headers,
                            email_id,
                            form,
                            send_validation_session_manager.clone(),
                            send_validation_backend.clone(),
                            send_validation_base_path.clone(),
                            send_validation_public_origin.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/user/email/confirm/{email_id}/{token}",
            get(
                move |headers: HeaderMap, Path((email_id, token)): Path<(String, String)>| {
                    async move {
                        direct_confirm_workspace_email(
                            headers,
                            email_id,
                            token,
                            confirm_email_session_manager.clone(),
                            confirm_email_backend.clone(),
                            confirm_email_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/info/leave/{owner_name}/{project_name}",
            get(
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    async move {
                        direct_legacy_leave_project(
                            headers,
                            owner_name,
                            project_name,
                            info_leave_session_manager.clone(),
                            info_leave_backend.clone(),
                            info_leave_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
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
