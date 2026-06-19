use axum::{
    extract::{Path, Query},
    http::HeaderMap,
    routing::{delete, get, post},
    Json, Router,
};
use std::collections::HashMap;
use yona_rust_vcs::VcsError;

use crate::{
    code_browser_error, direct_accept_pull_request, direct_update_pull_request_source_branch,
    direct_update_review_thread_state, dispatch_pull_request_webhooks, internal_error,
    normalize_identifier, persistence, project_code_menu_visible, project_read_allowed,
    require_authenticated_user, require_project_resource_create, require_session,
    require_valid_csrf, rest_actor_id, rest_project_pull_request_list_from_record,
    rest_pull_request_changed_file_from_code_commit_record,
    rest_pull_request_changed_file_from_vcs_record,
    rest_pull_request_commit_from_vcs_record_with_state,
    rest_pull_request_detail_from_record_with_repository_issue_references,
    rest_pull_request_list_from_record, rest_repository, rest_require_project_code_read,
    rest_review_thread_from_record, session::SessionManager,
    visible_code_projects_for_organization, yona_data_root, ConnectError, PilotBackend,
    PilotRepository, PilotServiceImpl, ProjectCreatableResource, PullRequestSourceBranchAction,
    RestOrganizationPullRequestListQuery, RestPullRequestBranchOption, RestPullRequestChangesQuery,
    RestPullRequestChangesResponse, RestPullRequestCommentBody, RestPullRequestCommit,
    RestPullRequestCreateBody, RestPullRequestDetailResponse, RestPullRequestEditBody,
    RestPullRequestFormOptionsResponse, RestPullRequestFormQuery, RestPullRequestFormSelected,
    RestPullRequestListQuery, RestPullRequestListResponse, RestPullRequestMergeResultResponse,
    RestPullRequestProjectOption, RestReviewThread, RestReviewThreadListQuery,
    RestReviewThreadListResponse, RestRouteError,
};

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Router {
    let thread_open_backend = backend.clone();
    let thread_open_session_manager = session_manager.clone();
    let thread_close_backend = backend.clone();
    let thread_close_session_manager = session_manager.clone();
    let pull_request_accept_backend = backend.clone();
    let pull_request_accept_session_manager = session_manager.clone();
    let pull_request_accept_base_path = base_path.clone();
    let pull_request_accept_public_origin = public_origin.clone();
    let pull_request_delete_source_branch_backend = backend.clone();
    let pull_request_delete_source_branch_session_manager = session_manager.clone();
    let pull_request_delete_source_branch_base_path = base_path.clone();
    let pull_request_restore_source_branch_backend = backend;
    let pull_request_restore_source_branch_session_manager = session_manager;
    let pull_request_restore_source_branch_base_path = base_path;

    Router::new()
        .route(
            "/threads/{thread_id}/open",
            post(move |headers: HeaderMap, Path(thread_id): Path<i64>| {
                async move {
                    direct_update_review_thread_state(
                        headers,
                        thread_id,
                        "open",
                        thread_open_session_manager.clone(),
                        thread_open_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/threads/{thread_id}/close",
            post(move |headers: HeaderMap, Path(thread_id): Path<i64>| {
                async move {
                    direct_update_review_thread_state(
                        headers,
                        thread_id,
                        "closed",
                        thread_close_session_manager.clone(),
                        thread_close_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{owner}/{project}/pullRequest/{pull_request_number}/accept",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    async move {
                        direct_accept_pull_request(
                            headers,
                            owner,
                            project,
                            pull_request_number,
                            pull_request_accept_session_manager.clone(),
                            pull_request_accept_backend.clone(),
                            pull_request_accept_base_path.clone(),
                            pull_request_accept_public_origin.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/pullRequest/{pull_request_number}/deletefrombranch",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    async move {
                        direct_update_pull_request_source_branch(
                            headers,
                            owner,
                            project,
                            pull_request_number,
                            PullRequestSourceBranchAction::Delete,
                            pull_request_delete_source_branch_session_manager.clone(),
                            pull_request_delete_source_branch_backend.clone(),
                            pull_request_delete_source_branch_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/pullRequest/{pull_request_number}/restorefrombranch",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    async move {
                        direct_update_pull_request_source_branch(
                            headers,
                            owner,
                            project,
                            pull_request_number,
                            PullRequestSourceBranchAction::Restore,
                            pull_request_restore_source_branch_session_manager.clone(),
                            pull_request_restore_source_branch_backend.clone(),
                            pull_request_restore_source_branch_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestPullRequestListQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_project_pull_requests(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            service,
                        )
                        .await
                    }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestPullRequestCreateBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_pull_request(headers, owner_name, project_name, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/form-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestPullRequestFormQuery>| {
                    let service = service.clone();
                    async move {
                        rest_read_pull_request_create_form_options(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/merge-result",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestPullRequestFormQuery>| {
                    let service = service.clone();
                    async move {
                        rest_read_pull_request_merge_result(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_read_pull_request_detail(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            service,
                        )
                        .await
                    }
                }
            })
            .patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>,
                      Json(body): Json<RestPullRequestEditBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/form-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_read_pull_request_edit_form_options(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/close",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request_state(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            "closed".to_string(),
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/open",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request_state(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            "open".to_string(),
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/accept",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_accept_pull_request(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/source-branch",
            delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_delete_pull_request_source_branch(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            service,
                        )
                        .await
                    }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_restore_pull_request_source_branch(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/review",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_set_pull_request_review(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            true,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/unreview",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_set_pull_request_review(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            false,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/watch",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_set_pull_request_watch(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            true,
                            service,
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_set_pull_request_watch(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            false,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/comments",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>,
                      Json(body): Json<RestPullRequestCommentBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_pull_request_comment(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/comments/{comment_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_delete_pull_request_comment(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            comment_id,
                            service,
                        )
                        .await
                    }
                }
            })
            .patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Json(body): Json<RestPullRequestCommentBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request_comment(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            comment_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/threads/{thread_id}/close",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number, thread_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request_thread_state(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            thread_id,
                            "closed".to_string(),
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/threads/{thread_id}/open",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number, thread_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request_thread_state(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            thread_id,
                            "open".to_string(),
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/changes",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Query(query): Query<RestPullRequestChangesQuery>,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_read_pull_request_changes(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/reviews",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestReviewThreadListQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_project_reviews(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/pull-requests",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      Query(query): Query<RestOrganizationPullRequestListQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_organization_pull_requests(
                            headers,
                            organization_name,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
}

fn rest_pull_request_filter(
    query: RestPullRequestListQuery,
    _actor_id: Option<i64>,
) -> persistence::PullRequestListFilter {
    let category = normalize_identifier(&query.category);
    persistence::PullRequestListFilter {
        category: if category.is_empty() {
            "open".to_string()
        } else {
            category.clone()
        },
        contributor_id: if query.contributor_id > 0 {
            Some(query.contributor_id)
        } else {
            None
        },
        filter: (!query.filter.trim().is_empty()).then(|| query.filter.trim().to_string()),
        page_num: query.page_num.max(1),
    }
}

fn rest_organization_pull_request_filter(
    query: RestOrganizationPullRequestListQuery,
) -> persistence::PullRequestListFilter {
    persistence::PullRequestListFilter {
        category: if normalize_identifier(&query.category) == "closed" {
            "closed".to_string()
        } else {
            "open".to_string()
        },
        contributor_id: None,
        filter: (!query.filter.trim().is_empty()).then(|| query.filter.trim().to_string()),
        page_num: query.page_num.max(1),
    }
}

pub(crate) fn rest_review_thread_filter(
    query: RestReviewThreadListQuery,
) -> persistence::ReviewThreadListFilter {
    persistence::ReviewThreadListFilter {
        author_id: (query.author_id > 0).then_some(query.author_id),
        filter: (!query.filter.trim().is_empty()).then(|| query.filter.trim().to_string()),
        order_by: if query.order_by.trim().is_empty() {
            "createdDate".to_string()
        } else {
            query.order_by.trim().to_string()
        },
        order_dir: if query.order_dir.trim().is_empty() {
            "desc".to_string()
        } else {
            query.order_dir.trim().to_string()
        },
        page_num: query.page_num.max(1),
        participant_id: (query.participant_id > 0).then_some(query.participant_id),
        state: if normalize_identifier(&query.state) == "closed" {
            "closed".to_string()
        } else {
            "open".to_string()
        },
    }
}

fn rest_pull_request_branch_error(error: VcsError) -> RestRouteError {
    match error {
        VcsError::NotFound => RestRouteError::bad_request("pull request repository is empty"),
        _ => RestRouteError::from_connect_error(internal_error(error)),
    }
}

async fn rest_require_pull_request_option_project(
    repository: &PilotRepository,
    project_id: i64,
    actor_id: Option<i64>,
) -> Result<persistence::ProjectAuthorizationRecord, RestRouteError> {
    let project = repository
        .read_project_by_id(project_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    rest_require_project_code_read(
        repository,
        &project.owner_name,
        &project.project_name,
        actor_id,
    )
    .await
}

async fn rest_pull_request_project_options(
    repository: &PilotRepository,
    actor_id: Option<i64>,
    selected_project_id: i64,
) -> Result<Vec<RestPullRequestProjectOption>, RestRouteError> {
    let projects = repository
        .list_projects()
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let mut options = Vec::new();
    for project in projects {
        let Some(authorization) = repository
            .read_project_authorization(&project.owner_name, &project.project_name, actor_id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
        else {
            continue;
        };
        if project_read_allowed(&authorization, actor_id.is_none())
            .map_err(RestRouteError::from_connect_error)?
            && project_code_menu_visible(&authorization, true)
        {
            options.push(RestPullRequestProjectOption {
                id: authorization.project.id,
                owner_name: authorization.project.owner_name,
                project_name: authorization.project.project_name,
                selected: authorization.project.id == selected_project_id,
            });
        }
    }
    Ok(options)
}

fn rest_pull_request_branch_options(
    project: &persistence::ProjectRecord,
    selected_branch: &str,
) -> Result<(Vec<RestPullRequestBranchOption>, String), RestRouteError> {
    let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), project.id);
    let branches = yona_rust_vcs::list_repository_branches(&repo_path)
        .map_err(rest_pull_request_branch_error)?;
    if branches.is_empty() {
        return Err(RestRouteError::bad_request(
            "pull request repository is empty",
        ));
    }
    let selected = selected_branch.trim();
    let selected = if selected.is_empty() {
        branches[0].name.clone()
    } else if branches.iter().any(|branch| branch.name == selected) {
        selected.to_string()
    } else {
        return Err(RestRouteError::bad_request(
            "pull request branch is not available",
        ));
    };
    let options = branches
        .into_iter()
        .map(|branch| RestPullRequestBranchOption {
            selected: branch.name == selected,
            name: branch.name,
        })
        .collect();
    Ok((options, selected))
}

fn rest_pull_request_mutation_input(
    title: String,
    body_markdown: String,
    attachment_ids: Vec<i64>,
) -> Result<persistence::PullRequestMutationInput, RestRouteError> {
    if title.trim().is_empty() {
        return Err(RestRouteError::bad_request("pullRequest.title.required"));
    }
    if body_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request("pullRequest.body.required"));
    }
    Ok(persistence::PullRequestMutationInput {
        attachment_ids,
        body_markdown,
        title,
    })
}

fn require_pull_request_create_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
) -> Result<(), RestRouteError> {
    if authorization.viewer.is_site_admin || authorization.viewer.is_project_member {
        return Ok(());
    }
    Err(RestRouteError::from_connect_error(
        ConnectError::permission_denied("Guest is not allowed this request"),
    ))
}

async fn rest_pull_request_detail_response(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    pull_request_number: i64,
    actor_id: Option<i64>,
    base_path: &str,
) -> Result<RestPullRequestDetailResponse, RestRouteError> {
    let authorization =
        rest_require_project_code_read(repository, owner_name, project_name, actor_id).await?;
    let record = repository
        .read_pull_request_detail(owner_name, project_name, pull_request_number, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    rest_pull_request_detail_from_record_with_repository_issue_references(
        repository,
        record,
        &authorization,
        actor_id,
        base_path,
    )
    .await
    .map_err(RestRouteError::from_connect_error)
}

pub(crate) async fn rest_read_pull_request_create_form_options(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestPullRequestFormQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestFormOptionsResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let target_authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    require_pull_request_create_allowed(&target_authorization)?;
    let from_project_id = if query.from_project_id > 0 {
        query.from_project_id
    } else {
        target_authorization.project.id
    };
    let to_project_id = if query.to_project_id > 0 {
        query.to_project_id
    } else {
        target_authorization.project.id
    };
    let from_authorization =
        rest_require_pull_request_option_project(repository, from_project_id, Some(actor.id))
            .await?;
    let to_authorization =
        rest_require_pull_request_option_project(repository, to_project_id, Some(actor.id)).await?;
    let project_options = rest_pull_request_project_options(
        repository,
        Some(actor.id),
        target_authorization.project.id,
    )
    .await?;
    let (from_branches, selected_from_branch) =
        rest_pull_request_branch_options(&from_authorization.project, &query.from_branch)?;
    let (to_branches, selected_to_branch) =
        rest_pull_request_branch_options(&to_authorization.project, &query.to_branch)?;

    Ok(Json(RestPullRequestFormOptionsResponse {
        from_branches,
        from_projects: project_options
            .iter()
            .map(|option| RestPullRequestProjectOption {
                id: option.id,
                owner_name: option.owner_name.clone(),
                project_name: option.project_name.clone(),
                selected: option.id == from_project_id,
            })
            .collect(),
        mode: "create".to_string(),
        pull_request: None,
        selected: RestPullRequestFormSelected {
            from_branch: selected_from_branch,
            from_project_id,
            to_branch: selected_to_branch,
            to_project_id,
        },
        to_branches,
        to_projects: project_options
            .into_iter()
            .map(|option| RestPullRequestProjectOption {
                selected: option.id == to_project_id,
                ..option
            })
            .collect(),
    }))
}

pub(crate) async fn rest_read_pull_request_edit_form_options(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestFormOptionsResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let pull_request = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        &service.base_path,
    )
    .await?;
    let from_project = repository
        .read_project_by_owner_and_name(
            &pull_request.from_owner_name,
            &pull_request.from_project_name,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("source project not found"))?;
    let to_project = repository
        .read_project_by_owner_and_name(&pull_request.owner_name, &pull_request.project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("target project not found"))?;
    rest_require_pull_request_option_project(repository, from_project.id, Some(actor.id)).await?;
    rest_require_pull_request_option_project(repository, to_project.id, Some(actor.id)).await?;
    let project_options =
        rest_pull_request_project_options(repository, Some(actor.id), to_project.id).await?;
    let (from_branches, selected_from_branch) =
        rest_pull_request_branch_options(&from_project, &pull_request.from_branch)?;
    let (to_branches, selected_to_branch) =
        rest_pull_request_branch_options(&to_project, &pull_request.to_branch)?;

    Ok(Json(RestPullRequestFormOptionsResponse {
        from_branches,
        from_projects: project_options
            .iter()
            .map(|option| RestPullRequestProjectOption {
                id: option.id,
                owner_name: option.owner_name.clone(),
                project_name: option.project_name.clone(),
                selected: option.id == from_project.id,
            })
            .collect(),
        mode: "edit".to_string(),
        pull_request: Some(pull_request),
        selected: RestPullRequestFormSelected {
            from_branch: selected_from_branch,
            from_project_id: from_project.id,
            to_branch: selected_to_branch,
            to_project_id: to_project.id,
        },
        to_branches,
        to_projects: project_options
            .into_iter()
            .map(|option| RestPullRequestProjectOption {
                selected: option.id == to_project.id,
                ..option
            })
            .collect(),
    }))
}

pub(crate) async fn rest_read_pull_request_merge_result(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestPullRequestFormQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestMergeResultResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let route_authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    require_pull_request_create_allowed(&route_authorization)?;
    let from_project_id = if query.from_project_id > 0 {
        query.from_project_id
    } else {
        route_authorization.project.id
    };
    let to_project_id = if query.to_project_id > 0 {
        query.to_project_id
    } else {
        route_authorization.project.id
    };
    if route_authorization.project.id != to_project_id {
        return Err(RestRouteError::bad_request(
            "pull request target project does not match route",
        ));
    }
    let from_authorization =
        rest_require_pull_request_option_project(repository, from_project_id, Some(actor.id))
            .await?;
    let to_authorization =
        rest_require_pull_request_option_project(repository, to_project_id, Some(actor.id)).await?;
    let (_, selected_from_branch) =
        rest_pull_request_branch_options(&from_authorization.project, &query.from_branch)?;
    let (_, selected_to_branch) =
        rest_pull_request_branch_options(&to_authorization.project, &query.to_branch)?;

    let source_repo_path =
        yona_rust_vcs::repository_path(&yona_data_root(), from_authorization.project.id);
    let target_repo_path =
        yona_rust_vcs::repository_path(&yona_data_root(), to_authorization.project.id);
    let preview = yona_rust_vcs::preview_pull_request_merge(
        &source_repo_path,
        &target_repo_path,
        &selected_from_branch,
        &selected_to_branch,
    )
    .map_err(rest_pull_request_branch_error)?;
    Ok(Json(RestPullRequestMergeResultResponse {
        commits: preview
            .commits
            .into_iter()
            .map(|record| {
                rest_pull_request_commit_from_vcs_record_with_state(record, &HashMap::new())
            })
            .collect(),
        conflict: preview.conflict,
        no_head: preview.no_head,
    }))
}

pub(crate) async fn rest_create_pull_request(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestPullRequestCreateBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if body.from_project_id <= 0 || body.to_project_id <= 0 {
        return Err(RestRouteError::bad_request(
            "pull request project is required",
        ));
    }
    if body.from_branch.trim().is_empty() || body.to_branch.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "pull request branch is required",
        ));
    }
    let values =
        rest_pull_request_mutation_input(body.title, body.body_markdown, body.attachment_ids)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let route_authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    if route_authorization.project.id != body.to_project_id {
        return Err(RestRouteError::bad_request(
            "pull request target project does not match route",
        ));
    }
    require_pull_request_create_allowed(&route_authorization)?;
    let from_authorization =
        rest_require_pull_request_option_project(repository, body.from_project_id, Some(actor.id))
            .await?;
    let to_authorization =
        rest_require_pull_request_option_project(repository, body.to_project_id, Some(actor.id))
            .await?;
    rest_pull_request_branch_options(&from_authorization.project, &body.from_branch)?;
    rest_pull_request_branch_options(&to_authorization.project, &body.to_branch)?;

    let detail = repository
        .create_pull_request(persistence::CreatePullRequestInput {
            actor_display_name: actor.display_name.clone(),
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            from_branch: body.from_branch,
            from_project_id: body.from_project_id,
            to_branch: body.to_branch,
            to_project_id: body.to_project_id,
            values,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    let record = match detail {
        persistence::CreatePullRequestResult::Created(record) => {
            dispatch_pull_request_webhooks(
                repository,
                &record,
                &actor,
                "NEW_PULL_REQUEST",
                &record.body_markdown,
                None,
                None,
                &service.public_origin,
                &service.base_path,
            )
            .await;
            record
        }
        persistence::CreatePullRequestResult::Duplicate(record) => record,
    };
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &to_authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_update_pull_request(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    body: RestPullRequestEditBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let values =
        rest_pull_request_mutation_input(body.title, body.body_markdown, body.attachment_ids)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        &service.base_path,
    )
    .await?;
    if !current.permissions.can_update {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request update is not allowed"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let record = repository
        .update_pull_request(persistence::UpdatePullRequestInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name,
            project_name,
            pull_request_number,
            values,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_update_pull_request_state(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    state: String,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        &service.base_path,
    )
    .await?;
    if !current.permissions.can_update_state {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request state update is not allowed"),
        ));
    }
    let next_state = normalize_identifier(&state);
    match next_state.as_str() {
        "closed" if current.state != "open" && current.state != "conflict" => {
            return Err(RestRouteError::bad_request("pull request is not open"));
        }
        "open" if current.state != "closed" => {
            return Err(RestRouteError::bad_request("pull request is not closed"));
        }
        "open" | "closed" => {}
        _ => return Err(RestRouteError::bad_request("invalid pull request state")),
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let record = repository
        .update_pull_request_state(persistence::PullRequestStateInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name,
            project_name,
            pull_request_number,
            state: next_state,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_accept_pull_request(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let (record, authorization) = accept_pull_request_for_actor(
        repository,
        &actor,
        owner_name,
        project_name,
        pull_request_number,
        &service.public_origin,
        &service.base_path,
    )
    .await?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

async fn accept_pull_request_for_actor(
    repository: &PilotRepository,
    actor: &persistence::AppUserRecord,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    public_origin: &str,
    base_path: &str,
) -> Result<
    (
        persistence::PullRequestDetailRecord,
        persistence::ProjectAuthorizationRecord,
    ),
    RestRouteError,
> {
    let current = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        base_path,
    )
    .await?;
    if !current.permissions.can_update_state {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request merge is not allowed"),
        ));
    }
    if current.conflict || current.state == "conflict" {
        return Err(RestRouteError::bad_request("pull request has conflicts"));
    }
    if current.state != "open" {
        return Err(RestRouteError::bad_request("pull request is not open"));
    }
    if current.required_reviewer_count > 0 && !current.reviewed {
        return Err(RestRouteError::bad_request(
            "pullRequest.not.enough.review.point",
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let from_project = repository
        .read_project_by_owner_and_name(&current.from_owner_name, &current.from_project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("source project not found"))?;
    let source_repo_path = yona_rust_vcs::repository_path(&yona_data_root(), from_project.id);
    let target_repo_path =
        yona_rust_vcs::repository_path(&yona_data_root(), authorization.project.id);
    let merge = yona_rust_vcs::merge_pull_request(
        &source_repo_path,
        &target_repo_path,
        &current.from_branch,
        &current.to_branch,
    )
    .map_err(code_browser_error)
    .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .merge_pull_request(persistence::PullRequestMergeInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            conflict: merge.conflict,
            merged_commit_id_from: merge.target_commit_id_before,
            merged_commit_id_to: merge.merged_commit_id,
            owner_name,
            project_name,
            pull_request_number,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    if !merge.conflict {
        dispatch_pull_request_webhooks(
            repository,
            &record,
            actor,
            "PULL_REQUEST_MERGED",
            &record.body_markdown,
            None,
            None,
            public_origin,
            base_path,
        )
        .await;
    }

    Ok((record, authorization))
}

pub(crate) async fn rest_delete_pull_request_source_branch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        &service.base_path,
    )
    .await?;
    if !current.permissions.can_delete_source_branch {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request source branch delete is not allowed"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let source_project = repository
        .read_project_by_owner_and_name(&current.from_owner_name, &current.from_project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("source project not found"))?;
    let source_repo_path = yona_rust_vcs::repository_path(&yona_data_root(), source_project.id);
    yona_rust_vcs::delete_branch(&source_repo_path, &current.from_branch)
        .map_err(code_browser_error)
        .map_err(RestRouteError::from_connect_error)?;
    repository
        .delete_project_pushed_branch(source_project.id, &current.from_branch)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .read_pull_request_detail(
            &owner_name,
            &project_name,
            pull_request_number,
            Some(actor.id),
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_restore_pull_request_source_branch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        &service.base_path,
    )
    .await?;
    if !current.permissions.can_restore_source_branch {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request source branch restore is not allowed"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let source_project = repository
        .read_project_by_owner_and_name(&current.from_owner_name, &current.from_project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("source project not found"))?;
    let source_repo_path = yona_rust_vcs::repository_path(&yona_data_root(), source_project.id);
    let target_repo_path =
        yona_rust_vcs::repository_path(&yona_data_root(), authorization.project.id);
    yona_rust_vcs::restore_branch_from_merge(
        &source_repo_path,
        &target_repo_path,
        &current.from_branch,
        &current.merged_commit_id_to,
    )
    .map_err(code_browser_error)
    .map_err(RestRouteError::from_connect_error)?;
    repository
        .upsert_project_pushed_branch(source_project.id, &current.from_branch)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .read_pull_request_detail(
            &owner_name,
            &project_name,
            pull_request_number,
            Some(actor.id),
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_set_pull_request_review(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    reviewed: bool,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        &service.base_path,
    )
    .await?;
    if !current.permissions.can_review {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request review is not allowed"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let record = repository
        .set_pull_request_review(persistence::PullRequestReviewInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name,
            project_name,
            pull_request_number,
            reviewed,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    dispatch_pull_request_webhooks(
        repository,
        &record,
        &actor,
        "PULL_REQUEST_REVIEW_STATE_CHANGED",
        &record.body_markdown,
        None,
        Some(reviewed),
        &service.public_origin,
        &service.base_path,
    )
    .await;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_set_pull_request_watch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    watching: bool,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        &service.base_path,
    )
    .await?;
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    if watching {
        repository
            .watch_pull_request(current.id, actor.id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
    } else {
        repository
            .unwatch_pull_request(current.id, actor.id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
    }
    let record = repository
        .read_pull_request_detail(
            &owner_name,
            &project_name,
            pull_request_number,
            Some(actor.id),
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_create_pull_request_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    body: RestPullRequestCommentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if body.contents_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "pull request comment is required",
        ));
    }
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization = require_project_resource_create(
        repository,
        &owner_name,
        &project_name,
        Some(actor.id),
        ProjectCreatableResource::ReviewComment,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let comment_markdown = body.contents_markdown.clone();
    let record = repository
        .create_pull_request_comment(persistence::CreatePullRequestCommentInput {
            actor_display_name: actor.display_name.clone(),
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            attachment_ids: body.attachment_ids,
            commit_id: body.commit_id,
            contents_markdown: body.contents_markdown,
            end_line: body.end_line,
            end_side: body.end_side,
            owner_name,
            path: body.path,
            prev_commit_id: body.prev_commit_id,
            project_name,
            pull_request_number,
            start_line: body.start_line,
            start_side: body.start_side,
            thread_id: body.thread_id,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    let created_comment = record
        .threads
        .iter()
        .flat_map(|thread| thread.comments.iter())
        .max_by_key(|comment| comment.id);
    let target_fragment = created_comment.map(|comment| format!("#comment-{}", comment.id));
    let detail_markdown = created_comment
        .map(|comment| comment.contents_markdown.clone())
        .unwrap_or(comment_markdown);
    dispatch_pull_request_webhooks(
        repository,
        &record,
        &actor,
        "NEW_REVIEW_COMMENT",
        &detail_markdown,
        target_fragment.as_deref(),
        None,
        &service.public_origin,
        &service.base_path,
    )
    .await;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_update_pull_request_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    comment_id: i64,
    body: RestPullRequestCommentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        &service.base_path,
    )
    .await?;
    let comment = current
        .threads
        .iter()
        .flat_map(|thread| thread.comments.iter())
        .find(|comment| comment.id == comment_id)
        .ok_or_else(|| RestRouteError::not_found("pull request comment not found"))?;
    if !comment.can_delete {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request comment update is not allowed"),
        ));
    }
    let contents_markdown = body.contents_markdown.trim().to_string();
    if contents_markdown.is_empty() {
        return Err(RestRouteError::from_connect_error(
            ConnectError::invalid_argument("pull request comment contents is required"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let record = repository
        .update_pull_request_comment(persistence::UpdatePullRequestCommentInput {
            actor_id: actor.id,
            attachment_ids: body.attachment_ids,
            comment_id,
            contents_markdown,
            owner_name,
            project_name,
            pull_request_number,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request comment not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_delete_pull_request_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    comment_id: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        &service.base_path,
    )
    .await?;
    let comment = current
        .threads
        .iter()
        .flat_map(|thread| thread.comments.iter())
        .find(|comment| comment.id == comment_id)
        .ok_or_else(|| RestRouteError::not_found("pull request comment not found"))?;
    if !comment.can_delete {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request comment delete is not allowed"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let record = repository
        .delete_pull_request_comment(persistence::DeletePullRequestCommentInput {
            actor_id: actor.id,
            comment_id,
            owner_name,
            project_name,
            pull_request_number,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request comment not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            Some(actor.id),
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_update_pull_request_thread_state(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    thread_id: i64,
    state: String,
    service: PilotServiceImpl,
) -> Result<Json<RestReviewThread>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
        &service.base_path,
    )
    .await?;
    let thread = current
        .threads
        .iter()
        .find(|thread| thread.id == thread_id)
        .ok_or_else(|| RestRouteError::not_found("review thread not found"))?;
    if !(current.permissions.can_review
        || current.permissions.can_update_state
        || thread.author_id == actor.id)
    {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("review thread state update is not allowed"),
        ));
    }
    let next_state = normalize_identifier(&state);
    if next_state != "open" && next_state != "closed" {
        return Err(RestRouteError::bad_request("invalid review thread state"));
    }
    let record = repository
        .update_pull_request_thread_state(persistence::PullRequestThreadStateInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name: owner_name.clone(),
            project_name: project_name.clone(),
            pull_request_number,
            state: next_state,
            thread_id,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("review thread not found"))?;
    Ok(Json(rest_review_thread_from_record(
        record,
        &service.base_path,
    )))
}

pub(crate) async fn rest_list_project_pull_requests(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestPullRequestListQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestListResponse>, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, actor_id).await?;
    let record = repository
        .list_project_pull_requests(
            &authorization.project,
            rest_pull_request_filter(query, actor_id),
            actor_id,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(rest_project_pull_request_list_from_record(record)))
}

pub(crate) async fn rest_read_pull_request_detail(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, actor_id).await?;
    let record = repository
        .read_pull_request_detail(&owner_name, &project_name, pull_request_number, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            repository,
            record,
            &authorization,
            actor_id,
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

fn rest_review_thread_is_outdated(
    thread: &RestReviewThread,
    pull_request: &RestPullRequestDetailResponse,
) -> bool {
    !thread.path.trim().is_empty()
        && !thread.prev_commit_id.trim().is_empty()
        && !thread.commit_id.trim().is_empty()
        && !pull_request.merged_commit_id_to.trim().is_empty()
        && thread.commit_id != pull_request.merged_commit_id_to
}

fn rest_review_thread_is_inline_for_changes(
    thread: &RestReviewThread,
    pull_request: &RestPullRequestDetailResponse,
    selected_commit_id: &str,
) -> bool {
    if thread.path.trim().is_empty() {
        return false;
    }
    let selected_commit_id = selected_commit_id.trim();
    if !selected_commit_id.is_empty() {
        return thread.commit_id.trim() == selected_commit_id;
    }
    !thread.prev_commit_id.trim().is_empty()
        && !rest_review_thread_is_outdated(thread, pull_request)
}

fn rest_review_thread_is_non_ranged_for_changes(
    thread: &RestReviewThread,
    selected_commit_id: &str,
) -> bool {
    if !thread.path.trim().is_empty() {
        return false;
    }
    let selected_commit_id = selected_commit_id.trim();
    selected_commit_id.is_empty() || thread.commit_id.trim() == selected_commit_id
}

pub(crate) async fn rest_read_pull_request_changes(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    query: RestPullRequestChangesQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestChangesResponse>, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, actor_id).await?;
    let record = repository
        .read_pull_request_detail(&owner_name, &project_name, pull_request_number, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    let merged_commit_id_from = record.merged_commit_id_from.clone();
    let merged_commit_id_to = record.merged_commit_id_to.clone();
    let detail = rest_pull_request_detail_from_record_with_repository_issue_references(
        repository,
        record,
        &authorization,
        actor_id,
        &service.base_path,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), authorization.project.id);
    let diff = if merged_commit_id_from.trim().is_empty() || merged_commit_id_to.trim().is_empty() {
        yona_rust_vcs::PullRequestDiffSnapshot {
            commits: Vec::new(),
            files: Vec::new(),
            no_head: true,
        }
    } else {
        yona_rust_vcs::read_pull_request_diff_between_revisions(
            &repo_path,
            &merged_commit_id_from,
            &merged_commit_id_to,
        )
        .map_err(code_browser_error)
        .map_err(RestRouteError::from_connect_error)?
    };
    let selected_commit_id = query.commit_id.trim();
    let known_commit_state_by_id: HashMap<String, String> = detail
        .commits
        .iter()
        .map(|commit| (commit.commit_id.clone(), commit.state.clone()))
        .collect();
    let (commits, files) = if diff.no_head {
        (Vec::new(), Vec::new())
    } else {
        let commits: Vec<RestPullRequestCommit> = diff
            .commits
            .into_iter()
            .map(|record| {
                rest_pull_request_commit_from_vcs_record_with_state(
                    record,
                    &known_commit_state_by_id,
                )
            })
            .collect();
        let files = if selected_commit_id.is_empty() {
            diff.files
                .into_iter()
                .map(rest_pull_request_changed_file_from_vcs_record)
                .collect()
        } else if detail
            .commits
            .iter()
            .any(|commit| commit.commit_id == selected_commit_id)
            || commits
                .iter()
                .any(|commit| commit.commit_id == selected_commit_id)
        {
            yona_rust_vcs::read_commit_detail(&repo_path, selected_commit_id, None, "")
                .map_err(code_browser_error)
                .map_err(RestRouteError::from_connect_error)?
                .files
                .into_iter()
                .map(rest_pull_request_changed_file_from_code_commit_record)
                .collect()
        } else {
            return Err(RestRouteError::not_found("pull request commit not found"));
        };
        (commits, files)
    };
    let inline_threads = detail
        .threads
        .iter()
        .filter(|thread| {
            rest_review_thread_is_inline_for_changes(thread, &detail, selected_commit_id)
        })
        .cloned()
        .collect();
    let non_ranged_threads = detail
        .threads
        .iter()
        .filter(|thread| rest_review_thread_is_non_ranged_for_changes(thread, selected_commit_id))
        .cloned()
        .collect();
    Ok(Json(RestPullRequestChangesResponse {
        card_threads: detail.threads.clone(),
        commits,
        files,
        inline_threads,
        non_ranged_threads,
        threads: detail.threads.clone(),
        pull_request: detail,
    }))
}

pub(crate) async fn rest_list_project_reviews(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestReviewThreadListQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestReviewThreadListResponse>, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, actor_id).await?;
    let side_filter_counts = rest_project_review_side_filter_counts(
        repository,
        &authorization.project,
        &query,
        actor_id,
    )
    .await?;
    let record = repository
        .list_project_review_threads(&authorization.project, rest_review_thread_filter(query))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(RestReviewThreadListResponse {
        all_count: side_filter_counts.0,
        author_count: side_filter_counts.2,
        closed_count: record.closed_count,
        items: record
            .items
            .into_iter()
            .map(|thread| rest_review_thread_from_record(thread, &service.base_path))
            .collect(),
        open_count: record.open_count,
        page_num: record.page_num,
        page_size: record.page_size,
        participant_count: side_filter_counts.1,
        state: record.state,
        total_count: record.total_count,
    }))
}

async fn rest_project_review_side_filter_counts(
    repository: &PilotRepository,
    project: &persistence::ProjectRecord,
    query: &RestReviewThreadListQuery,
    actor_id: Option<i64>,
) -> Result<(u32, u32, u32), RestRouteError> {
    let mut all_query = query.clone();
    all_query.author_id = 0;
    all_query.participant_id = 0;
    let all_count = repository
        .list_project_review_threads(project, rest_review_thread_filter(all_query))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .total_count;

    let Some(actor_id) = actor_id else {
        return Ok((all_count, 0, 0));
    };

    let mut participant_query = query.clone();
    participant_query.author_id = 0;
    participant_query.participant_id = actor_id;
    let participant_count = repository
        .list_project_review_threads(project, rest_review_thread_filter(participant_query))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .total_count;

    let mut author_query = query.clone();
    author_query.author_id = actor_id;
    author_query.participant_id = 0;
    let author_count = repository
        .list_project_review_threads(project, rest_review_thread_filter(author_query))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .total_count;

    Ok((all_count, participant_count, author_count))
}

pub(crate) async fn rest_list_organization_pull_requests(
    headers: HeaderMap,
    organization_name: String,
    query: RestOrganizationPullRequestListQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestListResponse>, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let authorization = repository
        .read_organization_authorization(&organization_name, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("organization not found"))?;
    let visible_projects =
        visible_code_projects_for_organization(repository, authorization.organization.id, actor_id)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .list_organization_pull_requests(
            visible_projects,
            rest_organization_pull_request_filter(query),
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(rest_pull_request_list_from_record(record)))
}
