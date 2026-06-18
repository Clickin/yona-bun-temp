use axum::{
    extract::{Multipart, Path, Query, RawQuery},
    http::HeaderMap,
    routing::get,
    Router,
};

use crate::{
    delete_uploaded_file, get_uploaded_file, list_uploaded_files, session::SessionManager,
    upload_file, AttachmentListQuery, PilotBackend,
};

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    max_uploaded_file_size: usize,
) -> Router {
    let file_session_manager = session_manager.clone();
    let file_backend = backend.clone();
    let file_base_path = base_path.clone();
    let file_list_session_manager = session_manager.clone();
    let file_list_backend = backend.clone();
    let file_list_base_path = base_path.clone();
    let file_read_session_manager = session_manager.clone();
    let file_read_backend = backend.clone();
    let file_read_trailing_session_manager = session_manager.clone();
    let file_read_trailing_backend = backend.clone();
    let file_delete_post_session_manager = session_manager.clone();
    let file_delete_post_backend = backend.clone();
    let file_delete_post_trailing_session_manager = session_manager.clone();
    let file_delete_post_trailing_backend = backend.clone();
    let file_delete_session_manager = session_manager;
    let file_delete_backend = backend;

    Router::new()
        .route(
            "/files",
            get(
                move |headers: HeaderMap, Query(query): Query<AttachmentListQuery>| {
                    async move {
                        list_uploaded_files(
                            headers,
                            query,
                            file_list_session_manager.clone(),
                            file_list_backend.clone(),
                            file_list_base_path.clone(),
                        )
                        .await
                    }
                },
            )
            .post(move |headers: HeaderMap, multipart: Multipart| {
                async move {
                    upload_file(
                        headers,
                        multipart,
                        file_session_manager.clone(),
                        file_backend.clone(),
                        file_base_path.clone(),
                        max_uploaded_file_size,
                    )
                    .await
                }
            }),
        )
        .route(
            "/files/{id}",
            get(
                move |headers: HeaderMap, Path(id): Path<i64>, RawQuery(raw_query): RawQuery| {
                    async move {
                        get_uploaded_file(
                            headers,
                            id,
                            raw_query,
                            file_read_session_manager.clone(),
                            file_read_backend.clone(),
                        )
                        .await
                    }
                },
            )
            .post(move |headers: HeaderMap, Path(id): Path<i64>| {
                async move {
                    delete_uploaded_file(
                        headers,
                        id,
                        file_delete_post_session_manager.clone(),
                        file_delete_post_backend.clone(),
                    )
                    .await
                }
            })
            .delete(move |headers: HeaderMap, Path(id): Path<i64>| {
                async move {
                    delete_uploaded_file(
                        headers,
                        id,
                        file_delete_session_manager.clone(),
                        file_delete_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/files/{id}/",
            get(
                move |headers: HeaderMap, Path(id): Path<i64>, RawQuery(raw_query): RawQuery| {
                    async move {
                        get_uploaded_file(
                            headers,
                            id,
                            raw_query,
                            file_read_trailing_session_manager.clone(),
                            file_read_trailing_backend.clone(),
                        )
                        .await
                    }
                },
            )
            .post(move |headers: HeaderMap, Path(id): Path<i64>| {
                async move {
                    delete_uploaded_file(
                        headers,
                        id,
                        file_delete_post_trailing_session_manager.clone(),
                        file_delete_post_trailing_backend.clone(),
                    )
                    .await
                }
            }),
        )
}
