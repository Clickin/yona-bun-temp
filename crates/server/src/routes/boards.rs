use axum::{
    extract::{Form, Path, RawQuery},
    http::HeaderMap,
    routing::{delete, get, patch, post},
    Json, Router,
};
use std::collections::HashMap;

use crate::{
    direct_create_posting_comment, direct_delete_posting_comment, direct_update_posting_comment,
    legacy_external_create_board_posting_comment, legacy_external_create_board_postings,
    legacy_external_update_board_posting_content, legacy_external_update_board_posting_labels,
    legacy_update_posting_comment, rest_create_posting, rest_create_posting_comment,
    rest_delete_posting, rest_delete_posting_comment, rest_list_organization_boards,
    rest_list_project_posts, rest_project_post_form_options, rest_read_posting_detail,
    rest_update_posting, rest_update_posting_comment, rest_watch_posting, session::SessionManager,
    PilotBackend, RestOrganizationBoardsQuery, RestPostCommentBody, RestPostFormOptionsQuery,
    RestPostMutationBody, RestProjectPostsQuery,
};

pub(crate) fn rest_routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    Router::new()
        .route(
            "/projects/{owner_name}/{project_name}/posts",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      RawQuery(raw_query): RawQuery| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        let query = RestProjectPostsQuery::from_raw_query(raw_query.as_deref())?;
                        rest_list_project_posts(
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
            })
            .post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestPostMutationBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_create_posting(
                            headers,
                            owner_name,
                            project_name,
                            body,
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
            "/projects/{owner_name}/{project_name}/posts/form-options",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      RawQuery(raw_query): RawQuery| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        let query = RestPostFormOptionsQuery::from_raw_query(raw_query.as_deref())?;
                        rest_project_post_form_options(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/posts/{post_number}",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_read_posting_detail(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            })
            .patch({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestPostMutationBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_update_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            body,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            })
            .delete({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_delete_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/posts/{post_number}/comments",
            post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestPostCommentBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_create_posting_comment(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            body,
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
            "/projects/{owner_name}/{project_name}/posts/{post_number}/comments/{comment_id}",
            patch({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Json(body): Json<RestPostCommentBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_update_posting_comment(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            comment_id,
                            body,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            })
            .delete({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_delete_posting_comment(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            comment_id,
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
            "/projects/{owner_name}/{project_name}/posts/{post_number}/watch",
            post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_watch_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            session_manager,
                            backend,
                            base_path,
                            true,
                        )
                        .await
                    }
                }
            })
            .delete({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_watch_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            session_manager,
                            backend,
                            base_path,
                            false,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/boards",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      RawQuery(raw_query): RawQuery| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        let query =
                            RestOrganizationBoardsQuery::from_raw_query(raw_query.as_deref())?;
                        rest_list_organization_boards(
                            headers,
                            organization_name,
                            query,
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
    let legacy_board_posts_backend = backend.clone();
    let legacy_board_posts_session_manager = session_manager.clone();
    let legacy_board_posts_base_path = base_path.clone();
    let legacy_board_content_backend = backend.clone();
    let legacy_board_content_session_manager = session_manager.clone();
    let legacy_board_comment_backend = backend.clone();
    let legacy_board_comment_session_manager = session_manager.clone();
    let legacy_board_comment_base_path = base_path.clone();
    let legacy_board_label_backend = backend.clone();
    let board_comment_create_backend = backend.clone();
    let board_comment_create_session_manager = session_manager.clone();
    let board_comment_create_base_path = base_path.clone();
    let board_comment_update_backend = backend.clone();
    let board_comment_update_session_manager = session_manager.clone();
    let board_comment_update_base_path = base_path.clone();
    let legacy_board_comment_update_backend = backend.clone();
    let legacy_board_comment_update_session_manager = session_manager.clone();
    let board_comment_delete_backend = backend.clone();
    let board_comment_delete_session_manager = session_manager.clone();
    let board_comment_delete_base_path = base_path.clone();

    Router::new()
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/posts",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_create_board_postings(
                            headers,
                            owner,
                            project_name,
                            body,
                            legacy_board_posts_session_manager.clone(),
                            legacy_board_posts_backend.clone(),
                            legacy_board_posts_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/posts/{number}/content",
            patch(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_board_posting_content(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_board_content_session_manager.clone(),
                            legacy_board_content_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/posts/{number}/comments",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_create_board_posting_comment(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_board_comment_session_manager.clone(),
                            legacy_board_comment_backend.clone(),
                            legacy_board_comment_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/postlabel/{number}",
            post(
                move |Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<Vec<serde_json::Value>>| {
                    async move {
                        legacy_external_update_board_posting_labels(
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_board_label_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/post/{number}/comment",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number)): Path<(String, String, i64)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_posting_comment(
                            headers,
                            owner,
                            project,
                            number,
                            form,
                            board_comment_create_session_manager.clone(),
                            board_comment_create_backend.clone(),
                            board_comment_create_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/post/{number}/comment/{comment_id}",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_update_posting_comment(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            form,
                            board_comment_update_session_manager.clone(),
                            board_comment_update_backend.clone(),
                            board_comment_update_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/post/{number}/comment/{comment_id}",
            patch(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_update_posting_comment(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            body,
                            legacy_board_comment_update_session_manager.clone(),
                            legacy_board_comment_update_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/post/{number}/comment/{comment_id}/delete",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    async move {
                        direct_delete_posting_comment(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            board_comment_delete_session_manager.clone(),
                            board_comment_delete_backend.clone(),
                            board_comment_delete_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}
