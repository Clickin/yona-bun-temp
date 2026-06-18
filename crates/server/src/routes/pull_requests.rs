use axum::{
    extract::{Path, Query},
    http::HeaderMap,
    routing::{delete, get, post},
    Json, Router,
};

use crate::{
    direct_accept_pull_request, direct_update_pull_request_source_branch,
    direct_update_review_thread_state, rest_accept_pull_request, rest_create_pull_request,
    rest_create_pull_request_comment, rest_delete_pull_request_comment,
    rest_delete_pull_request_source_branch, rest_list_organization_pull_requests,
    rest_list_project_pull_requests, rest_list_project_reviews, rest_read_pull_request_changes,
    rest_read_pull_request_create_form_options, rest_read_pull_request_detail,
    rest_read_pull_request_edit_form_options, rest_read_pull_request_merge_result,
    rest_restore_pull_request_source_branch, rest_set_pull_request_review,
    rest_set_pull_request_watch, rest_update_pull_request, rest_update_pull_request_comment,
    rest_update_pull_request_state, rest_update_pull_request_thread_state, session::SessionManager,
    PilotBackend, PilotServiceImpl, PullRequestSourceBranchAction,
    RestOrganizationPullRequestListQuery, RestPullRequestChangesQuery, RestPullRequestCommentBody,
    RestPullRequestCreateBody, RestPullRequestEditBody, RestPullRequestFormQuery,
    RestPullRequestListQuery, RestReviewThreadListQuery,
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
