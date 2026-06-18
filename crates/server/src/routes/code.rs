use axum::{extract::Path, http::HeaderMap, routing::get, Router};

use crate::{
    direct_code_ajax_compat, direct_code_archive, direct_code_file, session::SessionManager,
    DirectCodeFileMode, PilotBackend,
};

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
