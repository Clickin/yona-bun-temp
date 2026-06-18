use axum::{
    extract::{Form, Path},
    http::HeaderMap,
    routing::{delete, patch, post},
    Json, Router,
};
use std::collections::HashMap;

use crate::{
    direct_create_posting_comment, direct_delete_posting_comment, direct_update_posting_comment,
    legacy_external_create_board_posting_comment, legacy_external_create_board_postings,
    legacy_external_update_board_posting_content, legacy_external_update_board_posting_labels,
    legacy_update_posting_comment, session::SessionManager, PilotBackend,
};

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
