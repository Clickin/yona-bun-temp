use axum::{
    body::Bytes,
    extract::{Form, Path, Query},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{delete, get, patch, post, put},
    Json, Router,
};
use serde::Deserialize;
use std::collections::HashMap;

use crate::{
    accepts_legacy_json, direct_accept_project_transfer, direct_create_project_milestone,
    direct_delete_project_milestone, direct_delete_project_pushed_branch, direct_render_markdown,
    direct_toggle_project_watch, direct_update_project_milestone,
    direct_update_project_milestone_state, direct_update_project_overview,
    legacy_external_api_auth_error_response, legacy_external_assignable_users_result,
    legacy_external_authenticated_user_id, legacy_external_create_milestones,
    legacy_external_watchers, legacy_json_find_value, normalize_issue_label_color, persistence,
    project_update_allowed, require_project_read, rest_accept_organization_enrollment,
    rest_add_organization_member, rest_add_project_member, rest_cancel_enroll_organization,
    rest_cancel_enroll_project, rest_change_project_vcs, rest_create_organization,
    rest_create_project, rest_create_project_webhook, rest_delete_organization,
    rest_delete_organization_member, rest_delete_project, rest_delete_project_member,
    rest_delete_project_webhook, rest_enroll_organization, rest_enroll_project, rest_fork_project,
    rest_leave_organization, rest_list_organizations, rest_list_projects,
    rest_project_create_form_options, rest_read_organization_admin,
    rest_read_organization_container, rest_read_organization_detail,
    rest_read_organization_members, rest_read_organization_settings, rest_read_project_change_vcs,
    rest_read_project_container, rest_read_project_detail, rest_read_project_fork_options,
    rest_read_project_members, rest_read_project_settings, rest_read_project_transfer,
    rest_read_project_watchers, rest_read_project_webhooks, rest_request_project_transfer,
    rest_toggle_favorite_project, rest_toggle_project_watch, rest_update_organization,
    rest_update_organization_member_role, rest_update_project, rest_update_project_member_role,
    rest_update_project_overview, session::SessionManager, ConnectError, DirectMarkdownRenderBody,
    LegacyExternalWatchersQuery, PilotBackend, PilotServiceImpl, RestIssueAssignableUsersQuery,
    RestOrganizationBody, RestOrganizationMemberBody, RestOrganizationMemberRoleBody,
    RestProjectCreateBody, RestProjectCreateFormOptionsQuery, RestProjectForkBody,
    RestProjectMemberBody, RestProjectMemberRoleBody, RestProjectOverviewBody,
    RestProjectTransferBody, RestProjectUpdateBody, RestProjectWebhookBody, RestRouteError,
};

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/projects",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_list_projects(headers, service).await }
                }
            }),
        )
        .route(
            "/projects/form-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestProjectCreateFormOptionsQuery>| {
                    let service = service.clone();
                    async move { rest_project_create_form_options(headers, query, service).await }
                }
            }),
        )
        .route(
            "/organizations",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_list_organizations(headers, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestOrganizationBody>| {
                    let service = service.clone();
                    async move { rest_create_organization(headers, body, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_organization_detail(headers, organization_name, service).await }
                }
            })
            .patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      Json(body): Json<RestOrganizationBody>| {
                    let service = service.clone();
                    async move { rest_update_organization(headers, organization_name, body, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_delete_organization(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/admin",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_organization_admin(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/container",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_organization_container(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/settings",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_organization_settings(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/members",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_organization_members(headers, organization_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      Json(body): Json<RestOrganizationMemberBody>| {
                    let service = service.clone();
                    async move { rest_add_organization_member(headers, organization_name, body, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/members/{user_id}",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((organization_name, user_id)): Path<(String, i64)>,
                      Json(body): Json<RestOrganizationMemberRoleBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_organization_member_role(
                            headers,
                            organization_name,
                            user_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path((organization_name, user_id)): Path<(String, i64)>| {
                    let service = service.clone();
                    async move { rest_delete_organization_member(headers, organization_name, user_id, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/enrollments/{user_id}/accept",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path((organization_name, user_id)): Path<(String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_accept_organization_enrollment(
                            headers,
                            organization_name,
                            user_id,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/enroll",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_enroll_organization(headers, organization_name, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_cancel_enroll_organization(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/leave",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_leave_organization(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(owner_name): Path<String>,
                      Json(body): Json<RestProjectCreateBody>| {
                    let service = service.clone();
                    async move { rest_create_project(headers, owner_name, body, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_detail(headers, owner_name, project_name, service).await }
                }
            })
            .patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectUpdateBody>| {
                    let service = service.clone();
                    async move { rest_update_project(headers, owner_name, project_name, body, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_delete_project(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/container",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_container(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/settings",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_settings(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/members",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_members(headers, owner_name, project_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectMemberBody>| {
                    let service = service.clone();
                    async move {
                        rest_add_project_member(headers, owner_name, project_name, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/members/{user_id}",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, user_id)): Path<(String, String, i64)>,
                      Json(body): Json<RestProjectMemberRoleBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_project_member_role(
                            headers,
                            owner_name,
                            project_name,
                            user_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, user_id)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_delete_project_member(
                            headers,
                            owner_name,
                            project_name,
                            user_id,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/watchers",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_watchers(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/webhooks",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_webhooks(headers, owner_name, project_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectWebhookBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_project_webhook(headers, owner_name, project_name, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/webhooks/{webhook_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, webhook_id)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_delete_project_webhook(
                            headers,
                            owner_name,
                            project_name,
                            webhook_id,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/transfer",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_transfer(headers, owner_name, project_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectTransferBody>| {
                    let service = service.clone();
                    async move {
                        rest_request_project_transfer(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/fork-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_fork_options(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/fork",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectForkBody>| {
                    let service = service.clone();
                    async move { rest_fork_project(headers, owner_name, project_name, body, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/change-vcs",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_change_vcs(headers, owner_name, project_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_change_project_vcs(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/overview",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectOverviewBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_project_overview(headers, owner_name, project_name, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/enroll",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_enroll_project(headers, owner_name, project_name, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_cancel_enroll_project(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/favorite",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_toggle_favorite_project(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/watch",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_toggle_project_watch(headers, owner_name, project_name, true, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_toggle_project_watch(headers, owner_name, project_name, false, service).await }
                }
            }),
        )
}

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    let direct_project_watch_backend = backend.clone();
    let direct_project_watch_session_manager = session_manager.clone();
    let direct_project_unwatch_backend = backend.clone();
    let direct_project_unwatch_session_manager = session_manager.clone();
    let legacy_watchers_backend = backend.clone();
    let legacy_watchers_base_path = base_path.clone();
    let legacy_project_labels_backend = backend.clone();
    let legacy_project_labels_session_manager = session_manager.clone();
    let legacy_title_heads_backend = backend.clone();
    let legacy_title_heads_session_manager = session_manager.clone();
    let legacy_project_assignable_backend = backend.clone();
    let legacy_project_assignable_session_manager = session_manager.clone();
    let legacy_milestone_backend = backend.clone();
    let legacy_milestone_session_manager = session_manager.clone();
    let milestone_create_backend = backend.clone();
    let milestone_create_session_manager = session_manager.clone();
    let milestone_create_base_path = base_path.clone();
    let milestone_update_backend = backend.clone();
    let milestone_update_session_manager = session_manager.clone();
    let milestone_update_base_path = base_path.clone();
    let milestone_delete_backend = backend.clone();
    let milestone_delete_session_manager = session_manager.clone();
    let milestone_delete_base_path = base_path.clone();
    let milestone_open_backend = backend.clone();
    let milestone_open_session_manager = session_manager.clone();
    let milestone_open_base_path = base_path.clone();
    let milestone_close_backend = backend.clone();
    let milestone_close_session_manager = session_manager.clone();
    let milestone_close_base_path = base_path.clone();
    let pushed_branch_delete_backend = backend.clone();
    let pushed_branch_delete_session_manager = session_manager.clone();
    let transfer_accept_backend = backend.clone();
    let transfer_accept_session_manager = session_manager.clone();
    let transfer_accept_base_path = base_path.clone();
    let markdown_render_backend = backend.clone();
    let markdown_render_session_manager = session_manager.clone();
    let markdown_render_base_path = base_path.clone();
    let project_overview_update_backend = backend;
    let project_overview_update_session_manager = session_manager;

    Router::new()
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/milestones",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_create_milestones(
                            headers,
                            owner,
                            project_name,
                            body,
                            legacy_milestone_session_manager.clone(),
                            legacy_milestone_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestones",
            post(
                move |headers: HeaderMap,
                      Path((owner, project)): Path<(String, String)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_project_milestone(
                            headers,
                            owner,
                            project,
                            form,
                            milestone_create_session_manager.clone(),
                            milestone_create_backend.clone(),
                            milestone_create_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/edit",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_update_project_milestone(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            form,
                            milestone_update_session_manager.clone(),
                            milestone_update_backend.clone(),
                            milestone_update_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/delete",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_delete_project_milestone(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            milestone_delete_session_manager.clone(),
                            milestone_delete_backend.clone(),
                            milestone_delete_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/open",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_update_project_milestone_state(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            "open",
                            milestone_open_session_manager.clone(),
                            milestone_open_backend.clone(),
                            milestone_open_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/close",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_update_project_milestone_state(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            "closed",
                            milestone_close_session_manager.clone(),
                            milestone_close_backend.clone(),
                            milestone_close_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/labels",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_project_create_labels(
                            headers,
                            owner,
                            project_name,
                            body,
                            legacy_project_labels_session_manager.clone(),
                            legacy_project_labels_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/titleHeads",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Query(query): Query<LegacyProjectTitleHeadsQuery>| {
                    async move {
                        legacy_project_title_heads(
                            headers,
                            owner,
                            project_name,
                            query,
                            legacy_title_heads_session_manager.clone(),
                            legacy_title_heads_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/assignableUsers",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    async move {
                        legacy_external_project_assignable_users(
                            headers,
                            owner,
                            project_name,
                            query,
                            legacy_project_assignable_session_manager.clone(),
                            legacy_project_assignable_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/posts/{number}/watchers",
            get(
                move |Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Query(query): Query<LegacyExternalWatchersQuery>| {
                    async move {
                        legacy_external_watchers(
                            owner,
                            project_name,
                            number,
                            query,
                            legacy_watchers_base_path.clone(),
                            legacy_watchers_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner_name}/{project_name}/watch",
            post(
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    async move {
                        direct_toggle_project_watch(
                            headers,
                            owner_name,
                            project_name,
                            true,
                            direct_project_watch_session_manager.clone(),
                            direct_project_watch_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner_name}/{project_name}/unwatch",
            post(
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    async move {
                        direct_toggle_project_watch(
                            headers,
                            owner_name,
                            project_name,
                            false,
                            direct_project_unwatch_session_manager.clone(),
                            direct_project_unwatch_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}",
            put(
                move |headers: HeaderMap,
                      Path((owner, project)): Path<(String, String)>,
                      body: Bytes| {
                    async move {
                        direct_update_project_overview(
                            headers,
                            owner,
                            project,
                            body,
                            project_overview_update_session_manager.clone(),
                            project_overview_update_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/pushedBranch/{pushed_branch_id}/delete",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, pushed_branch_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_delete_project_pushed_branch(
                            headers,
                            owner,
                            project,
                            pushed_branch_id,
                            pushed_branch_delete_session_manager.clone(),
                            pushed_branch_delete_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/project/transfer/{transfer_id}/{confirm_key}",
            get(
                move |headers: HeaderMap,
                      Path((transfer_id, confirm_key)): Path<(i64, String)>| {
                    async move {
                        direct_accept_project_transfer(
                            headers,
                            transfer_id,
                            confirm_key,
                            transfer_accept_session_manager.clone(),
                            transfer_accept_backend.clone(),
                            transfer_accept_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/markdown/{owner}/{project}",
            post(
                move |headers: HeaderMap,
                      Path((owner, project)): Path<(String, String)>,
                      Json(body): Json<DirectMarkdownRenderBody>| {
                    async move {
                        direct_render_markdown(
                            headers,
                            owner,
                            project,
                            body,
                            markdown_render_session_manager.clone(),
                            markdown_render_backend.clone(),
                            markdown_render_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}

#[derive(Clone, Debug, Default, Deserialize)]
struct LegacyProjectTitleHeadsQuery {
    query: Option<String>,
}

async fn legacy_project_title_heads(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    query: LegacyProjectTitleHeadsQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("project title heads require repository backend")
            .into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization =
        match require_project_read(repository, &owner, &project_name, actor_id).await {
            Ok(authorization) => authorization,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };

    let query = query.query.unwrap_or_default();
    let title_heads = match repository
        .list_legacy_project_title_heads(&owner, &project_name, &query)
        .await
    {
        Ok(title_heads) => title_heads,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let labels = match repository
        .list_project_labels(
            &authorization.project.owner_name,
            &authorization.project.project_name,
        )
        .await
    {
        Ok(labels) => labels,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };

    let mut result = Vec::new();
    for title_head in title_heads {
        result.push(serde_json::json!({
            "name": title_head.name,
            "frequency": title_head.frequency,
            "category": "",
            "searchText": title_head.name,
        }));
    }
    for label in labels {
        result.push(serde_json::json!({
            "name": label.name,
            "frequency": 0,
            "category": label.category_name,
            "categoryId": label.category_id,
            "id": label.id,
            "labelColor": label.color,
            "isExclusive": label.category_is_exclusive,
            "searchText": format!("{}/{}", label.name, label.category_name),
        }));
    }

    Json(serde_json::json!({ "result": result })).into_response()
}

async fn legacy_external_project_assignable_users(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    query: RestIssueAssignableUsersQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented(
            "project assignable users require repository backend",
        )
        .into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if let Err(error) = require_project_read(repository, &owner, &project_name, actor_id).await {
        return RestRouteError::from_connect_error(error).into_response();
    }
    let record = match repository
        .list_project_assignable_users(
            &owner,
            &project_name,
            actor_id,
            &query.query,
            &query.search_type,
            10,
        )
        .await
    {
        Ok(Some(record)) => record,
        Ok(None) => return RestRouteError::not_found("pilot project not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(legacy_external_assignable_users_result(record)).into_response()
}

async fn legacy_project_create_labels(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let Some(labels) = legacy_json_find_value(&body, "labels").and_then(|value| value.as_array())
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No issues key exists or value wasn't array!",
            })),
        )
            .into_response();
    };
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("project labels require repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let authorization =
        match require_project_read(repository, &owner, &project_name, Some(actor_id)).await {
            Ok(authorization) => authorization,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let can_update = match project_update_allowed(&authorization) {
        Ok(can_update) => can_update,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    if !can_update {
        return RestRouteError::from_connect_error(ConnectError::permission_denied(
            "issue label create is not allowed",
        ))
        .into_response();
    }

    let mut results = Vec::new();
    for label in labels {
        let Some(label) = legacy_project_label_body_from_value(label) else {
            return RestRouteError::bad_request("invalid project label payload").into_response();
        };
        let color = match normalize_issue_label_color(&label.label_color) {
            Ok(color) => color,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
        let create_result = match repository
            .create_project_label(persistence::CreateProjectLabelInput {
                category_is_exclusive: label.is_exclusive.is_some(),
                category_name: label.category_name.trim().to_string(),
                label_color: color,
                label_name: label.label_name.trim().to_string(),
                owner_name: owner.clone(),
                project_name: project_name.clone(),
            })
            .await
        {
            Ok(Some(result)) => result,
            Ok(None) => return RestRouteError::not_found("project not found").into_response(),
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        let (created_label, created) = create_result;
        if created {
            results.push(serde_json::json!({
                "status": 201,
                "label": created_label.name,
                "category": created_label.category_name,
                "labelColor": created_label.color,
                "isExclusive": created_label.category_is_exclusive,
            }));
        } else {
            results.push(serde_json::json!({
                "status": 409,
                "reason": "Conflict",
                "message": "Failed to create a new label. The label may already exist.",
                "user": label.original,
            }));
        }
    }

    (StatusCode::CREATED, Json(results)).into_response()
}

#[derive(Clone, Debug)]
struct LegacyProjectLabelCreateItem {
    category_name: String,
    is_exclusive: Option<bool>,
    label_color: String,
    label_name: String,
    original: serde_json::Value,
}

fn legacy_project_label_body_from_value(
    value: &serde_json::Value,
) -> Option<LegacyProjectLabelCreateItem> {
    let category_name = legacy_json_find_value(value, "category")?
        .as_str()?
        .to_string();
    let label_color = legacy_json_find_value(value, "labelColor")?
        .as_str()?
        .to_string();
    let label_name = legacy_json_find_value(value, "labelName")?
        .as_str()?
        .to_string();
    let is_exclusive = legacy_json_find_value(value, "isExclusive")
        .filter(|value| value.is_boolean())
        .and_then(|value| value.as_bool());

    Some(LegacyProjectLabelCreateItem {
        category_name,
        is_exclusive,
        label_color,
        label_name,
        original: value.clone(),
    })
}
