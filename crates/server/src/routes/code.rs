use axum::{
    extract::{Path, Query},
    http::HeaderMap,
    routing::{delete, get, patch, post},
    Json, Router,
};

use crate::{
    direct_code_ajax_compat, direct_code_archive, direct_code_file,
    rest_create_commit_discussion_comment, rest_delete_code_branch,
    rest_delete_commit_discussion_comment, rest_read_code_branches, rest_read_code_browser,
    rest_read_code_commit_detail, rest_read_code_compare, rest_read_code_history,
    rest_set_default_code_branch, rest_update_commit_discussion_comment,
    rest_update_commit_discussion_thread_state, session::SessionManager, DirectCodeFileMode,
    PilotBackend, PilotServiceImpl, RestCodeBranchMutationBody, RestCodeBrowserQuery,
    RestCodeCommitDetailQuery, RestCodeHistoryQuery, RestCommitCommentBody,
};

pub(crate) fn rest_routes(
    service: PilotServiceImpl,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    Router::new()
        .route(
            "/projects/{owner_name}/{project_name}/code",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestCodeBrowserQuery>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_read_code_browser(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/commits",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestCodeHistoryQuery>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_read_code_history(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/commit/{commit_id}",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id)): Path<(
                    String,
                    String,
                    String,
                )>,
                      Query(query): Query<RestCodeCommitDetailQuery>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_read_code_commit_detail(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
                            query,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/commit/{commit_id}/comments",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id)): Path<(
                    String,
                    String,
                    String,
                )>,
                      Json(body): Json<RestCommitCommentBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_commit_discussion_comment(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/commit/{commit_id}/comments/{comment_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id, comment_id)): Path<(
                    String,
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_delete_commit_discussion_comment(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
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
                      Path((owner_name, project_name, commit_id, comment_id)): Path<(
                    String,
                    String,
                    String,
                    i64,
                )>,
                      Json(body): Json<RestCommitCommentBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_commit_discussion_comment(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
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
            "/projects/{owner_name}/{project_name}/commit/{commit_id}/threads/{thread_id}/close",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id, thread_id)): Path<(
                    String,
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_commit_discussion_thread_state(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
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
            "/projects/{owner_name}/{project_name}/commit/{commit_id}/threads/{thread_id}/open",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id, thread_id)): Path<(
                    String,
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_commit_discussion_thread_state(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
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
            "/projects/{owner_name}/{project_name}/compare/{revision_range}",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, revision_range)): Path<(
                    String,
                    String,
                    String,
                )>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_read_code_compare(
                            headers,
                            owner_name,
                            project_name,
                            revision_range,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/branches",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_read_code_branches(
                            headers,
                            owner_name,
                            project_name,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            })
            .delete({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestCodeBranchMutationBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_delete_code_branch(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/branches/default",
            post({
                let session_manager = session_manager;
                let backend = backend;
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestCodeBranchMutationBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_set_default_code_branch(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
}

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    let raw_code_backend = backend.clone();
    let raw_code_session_manager = session_manager.clone();
    let raw_code_base_path = base_path.clone();
    let open_code_backend = backend.clone();
    let open_code_session_manager = session_manager.clone();
    let open_code_base_path = base_path.clone();
    let image_code_backend = backend.clone();
    let image_code_session_manager = session_manager.clone();
    let image_code_base_path = base_path.clone();
    let archive_code_backend = backend.clone();
    let archive_code_session_manager = session_manager.clone();
    let code_ajax_backend = backend.clone();
    let code_ajax_session_manager = session_manager.clone();
    let code_ajax_base_path = base_path.clone();
    let code_ajax_root_backend = backend.clone();
    let code_ajax_root_session_manager = session_manager.clone();
    let code_ajax_root_base_path = base_path.clone();
    let code_ajax_root_slash_backend = backend.clone();
    let code_ajax_root_slash_session_manager = session_manager.clone();
    let code_ajax_root_slash_base_path = base_path.clone();
    let code_ajax_branch_backend = backend.clone();
    let code_ajax_branch_session_manager = session_manager.clone();
    let code_ajax_branch_base_path = base_path.clone();
    let code_ajax_branch_root_backend = backend.clone();
    let code_ajax_branch_root_session_manager = session_manager.clone();
    let code_ajax_branch_root_base_path = base_path.clone();
    let code_ajax_branch_root_slash_backend = backend;
    let code_ajax_branch_root_slash_session_manager = session_manager;
    let code_ajax_branch_root_slash_base_path = base_path;

    Router::new()
        .route(
            "/{owner}/{project}/rawcode/{revision}/{*path}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, revision, path)): Path<(
                    String,
                    String,
                    String,
                    String,
                )>| {
                    async move {
                        direct_code_file(
                            headers,
                            owner,
                            project,
                            revision,
                            path,
                            DirectCodeFileMode::Raw,
                            raw_code_session_manager.clone(),
                            raw_code_backend.clone(),
                            raw_code_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/files/{revision}/{*path}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, revision, path)): Path<(
                    String,
                    String,
                    String,
                    String,
                )>| {
                    async move {
                        direct_code_file(
                            headers,
                            owner,
                            project,
                            revision,
                            path,
                            DirectCodeFileMode::Open,
                            open_code_session_manager.clone(),
                            open_code_backend.clone(),
                            open_code_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/image/{revision}/{*path}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, revision, path)): Path<(
                    String,
                    String,
                    String,
                    String,
                )>| {
                    async move {
                        direct_code_file(
                            headers,
                            owner,
                            project,
                            revision,
                            path,
                            DirectCodeFileMode::Image,
                            image_code_session_manager.clone(),
                            image_code_backend.clone(),
                            image_code_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/{revision}/download",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, revision)): Path<(String, String, String)>| {
                    async move {
                        direct_code_archive(
                            headers,
                            owner,
                            project,
                            revision,
                            archive_code_session_manager.clone(),
                            archive_code_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/!/{*path}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, path)): Path<(String, String, String)>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            None,
                            path,
                            code_ajax_session_manager.clone(),
                            code_ajax_backend.clone(),
                            code_ajax_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/!",
            get(
                move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            None,
                            String::new(),
                            code_ajax_root_session_manager.clone(),
                            code_ajax_root_backend.clone(),
                            code_ajax_root_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/!/",
            get(
                move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            None,
                            String::new(),
                            code_ajax_root_slash_session_manager.clone(),
                            code_ajax_root_slash_backend.clone(),
                            code_ajax_root_slash_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/{branch}/!/{*path}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, branch, path)): Path<(
                    String,
                    String,
                    String,
                    String,
                )>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            Some(branch),
                            path,
                            code_ajax_branch_session_manager.clone(),
                            code_ajax_branch_backend.clone(),
                            code_ajax_branch_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/{branch}/!",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, branch)): Path<(String, String, String)>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            Some(branch),
                            String::new(),
                            code_ajax_branch_root_session_manager.clone(),
                            code_ajax_branch_root_backend.clone(),
                            code_ajax_branch_root_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/{branch}/!/",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, branch)): Path<(String, String, String)>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            Some(branch),
                            String::new(),
                            code_ajax_branch_root_slash_session_manager.clone(),
                            code_ajax_branch_root_slash_backend.clone(),
                            code_ajax_branch_root_slash_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}
