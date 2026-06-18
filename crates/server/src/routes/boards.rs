use axum::{
    extract::Path,
    http::HeaderMap,
    routing::{patch, post},
    Json, Router,
};

use crate::{
    legacy_external_create_board_postings, legacy_external_update_board_posting_content,
    session::SessionManager, PilotBackend,
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
}
