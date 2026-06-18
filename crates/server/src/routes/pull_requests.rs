use axum::{
    extract::Path,
    http::HeaderMap,
    routing::{delete, post},
    Router,
};

use crate::{
    direct_accept_pull_request, direct_update_pull_request_source_branch,
    direct_update_review_thread_state, session::SessionManager, PilotBackend,
    PullRequestSourceBranchAction,
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
