use axum::{
    extract::{Multipart, Path, Query, RawQuery},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::{
    base_path_href, persistence, project_read_allowed, random_storage_token, PilotBackend,
    PilotServiceImpl,
};

fn uploaded_files_root(data_root: &std::path::Path) -> PathBuf {
    data_root.join("uploads")
}

pub(crate) fn uploaded_file_path_with_root(data_root: &std::path::Path, hash: &str) -> PathBuf {
    uploaded_files_root(data_root).join(hash)
}

fn looks_like_utf8_text(bytes: &[u8]) -> bool {
    !bytes.is_empty()
        && std::str::from_utf8(bytes).is_ok()
        && bytes
            .iter()
            .all(|byte| matches!(*byte, b'\t' | b'\n' | b'\r' | 0x20..=0x7e | 0x80..=0xff))
}

fn upload_mime_from_magic(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Some("image/png");
    }
    if bytes.starts_with(b"\xff\xd8\xff") {
        return Some("image/jpeg");
    }
    if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        return Some("image/gif");
    }
    if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        return Some("image/webp");
    }
    if bytes.starts_with(b"%PDF-") {
        return Some("application/pdf");
    }
    if bytes.starts_with(b"PK\x03\x04")
        || bytes.starts_with(b"PK\x05\x06")
        || bytes.starts_with(b"PK\x07\x08")
    {
        return Some("application/zip");
    }
    None
}

pub(crate) fn detect_upload_mime_type(
    file_name: &str,
    declared_mime_type: Option<&str>,
    bytes: &[u8],
) -> String {
    if let Some(mime_type) = upload_mime_from_magic(bytes) {
        return mime_type.to_string();
    }

    let guessed = mime_guess::from_path(file_name).first();
    if looks_like_utf8_text(bytes) {
        if let Some(mime_type) = guessed.as_ref().map(|mime| mime.as_ref()) {
            if mime_type == "image/svg+xml" {
                return mime_type.to_string();
            }
            if mime_type.starts_with("text/") {
                return format!("{mime_type}; charset=UTF-8");
            }
        }
        return "text/plain; charset=UTF-8".to_string();
    }

    if let Some(mime_type) = guessed.as_ref().map(|mime| mime.as_ref()) {
        if mime_type != "application/octet-stream" {
            return mime_type.to_string();
        }
    }

    declared_mime_type
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("application/octet-stream")
        .to_string()
}

fn attachment_query_action(raw_query: Option<&str>) -> Option<&str> {
    raw_query
        .unwrap_or_default()
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .find_map(|(key, value)| (key == "action").then_some(value))
}

pub(crate) fn legacy_content_disposition_filename(file_name: &str) -> String {
    let normalized = file_name
        .chars()
        .map(|character| match character {
            ':' | '\\' | '/' | '{' | '?' => '_',
            _ => character,
        })
        .collect::<String>();
    let mut encoded = String::new();
    for byte in normalized.as_bytes() {
        match *byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'.' | b'-' | b'_' | b'*' => {
                encoded.push(char::from(*byte));
            }
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    format!("filename*=UTF-8''{encoded}")
}

#[derive(Serialize)]
struct UploadFileResponse {
    id: i64,
    #[serde(rename = "mimeType")]
    mime_type: String,
    name: String,
    size: i64,
    url: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct AttachmentListQuery {
    container_id: Option<String>,
    container_type: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AttachmentListResponse {
    attachments: Vec<UploadFileResponse>,
    temp_files: Vec<UploadFileResponse>,
}

fn attachment_upload_response(
    attachment: persistence::AttachmentRecord,
    base_path: &str,
) -> UploadFileResponse {
    UploadFileResponse {
        id: attachment.id,
        mime_type: attachment.mime_type,
        name: attachment.name,
        size: attachment.size,
        url: base_path_href(base_path, &format!("/files/{}", attachment.id)),
    }
}

async fn project_attachment_read_allowed(
    repository: &crate::persistence::PilotRepository,
    owner_name: &str,
    project_name: &str,
    actor_id: Option<i64>,
) -> Result<bool, ()> {
    let authorization = repository
        .read_project_authorization(owner_name, project_name, actor_id)
        .await
        .map_err(|_| ())?
        .ok_or(())?;
    project_read_allowed(&authorization, actor_id.is_none()).map_err(|_| ())
}

async fn attachment_container_read_allowed(
    repository: &crate::persistence::PilotRepository,
    container_type: &str,
    container_id: i64,
    actor_id: Option<i64>,
) -> Result<bool, ()> {
    match container_type.trim().to_ascii_uppercase().as_str() {
        "USER" => Ok(actor_id == Some(container_id)),
        "USER_AVATAR" | "ORGANIZATION" => Ok(true),
        "PROJECT" => {
            let Some(project) = repository
                .read_project_by_id(container_id)
                .await
                .map_err(|_| ())?
            else {
                return Ok(false);
            };
            project_attachment_read_allowed(
                repository,
                &project.owner_name,
                &project.project_name,
                actor_id,
            )
            .await
        }
        _ => {
            let Some(resource) = repository
                .read_attachment_project_resource(container_type, container_id)
                .await
                .map_err(|_| ())?
            else {
                return Ok(false);
            };
            project_attachment_read_allowed(
                repository,
                &resource.owner_name,
                &resource.project_name,
                actor_id,
            )
            .await
        }
    }
}

pub(crate) async fn list_uploaded_files(
    headers: HeaderMap,
    query: AttachmentListQuery,
    service: PilotServiceImpl,
) -> Response {
    let Some(session) = service.session_manager.read_session_from_headers(&headers) else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    let Some(actor_id) = session.user_id else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let Ok(Some(actor)) = repository.find_user_by_id(actor_id).await else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    let container_type = query.container_type.unwrap_or_default();
    let container_id = query
        .container_id
        .as_deref()
        .and_then(|value| value.parse::<i64>().ok());
    let attachments = if !container_type.trim().is_empty() {
        if let Some(container_id) = container_id {
            match attachment_container_read_allowed(
                repository,
                container_type.trim(),
                container_id,
                Some(actor.id),
            )
            .await
            {
                Ok(true) => {}
                Ok(false) => return StatusCode::FORBIDDEN.into_response(),
                Err(()) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
            }
            match repository
                .list_attachments_by_container(container_type.trim(), container_id)
                .await
            {
                Ok(attachments) => attachments,
                Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
            }
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    };
    let temp_files = if container_id.is_none() {
        match repository
            .list_attachments_by_container("USER", actor.id)
            .await
        {
            Ok(files) => files
                .into_iter()
                .filter(|record| record.container_type == "USER" && record.container_id == actor.id)
                .filter(|record| record.owner_login_id == actor.login_id)
                .map(|record| attachment_upload_response(record, &service.base_path))
                .collect(),
            Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
        }
    } else {
        Vec::new()
    };

    Json(AttachmentListResponse {
        attachments: attachments
            .into_iter()
            .map(|record| attachment_upload_response(record, &service.base_path))
            .collect(),
        temp_files,
    })
    .into_response()
}

pub(crate) async fn upload_file(
    headers: HeaderMap,
    mut multipart: Multipart,
    service: PilotServiceImpl,
) -> Response {
    let data_root = service.data_root.clone();
    let Some(session) = service.session_manager.read_session_from_headers(&headers) else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    if !service.session_manager.validate_csrf(&headers, &session) {
        return StatusCode::FORBIDDEN.into_response();
    }
    let Some(user_id) = session.user_id else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let Ok(Some(user)) = repository.find_user_by_id(user_id).await else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() != Some("filePath") {
            continue;
        }
        let file_name = field
            .file_name()
            .map(ToString::to_string)
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "upload.bin".to_string());
        let declared_mime_type = field.content_type().map(ToString::to_string);
        let Ok(bytes) = field.bytes().await else {
            return StatusCode::BAD_REQUEST.into_response();
        };
        if bytes.len() > service.max_uploaded_file_size {
            return StatusCode::BAD_REQUEST.into_response();
        }
        let mime_type =
            detect_upload_mime_type(&file_name, declared_mime_type.as_deref(), bytes.as_ref());
        let hash = random_storage_token();
        let path = uploaded_file_path_with_root(&data_root, &hash);
        if let Some(parent) = path.parent() {
            if std::fs::create_dir_all(parent).is_err() {
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
        if std::fs::write(&path, &bytes).is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
        let Ok(attachment) = repository
            .create_user_attachment_upload(
                user.id,
                &user.login_id,
                &file_name,
                &mime_type,
                bytes.len() as i64,
                &hash,
            )
            .await
        else {
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        };

        let response = UploadFileResponse {
            id: attachment.id,
            mime_type,
            name: file_name,
            size: bytes.len() as i64,
            url: base_path_href(&service.base_path, &format!("/files/{}", attachment.id)),
        };
        return (StatusCode::CREATED, Json(response)).into_response();
    }

    StatusCode::BAD_REQUEST.into_response()
}

pub(crate) async fn get_uploaded_file(
    headers: HeaderMap,
    attachment_id: i64,
    raw_query: Option<String>,
    service: PilotServiceImpl,
) -> Response {
    let data_root = service.data_root.clone();
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let Ok(Some(attachment)) = repository.read_attachment_by_id(attachment_id).await else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let is_avatar = attachment.container_type == "USER_AVATAR";
    if !is_avatar {
        let actor_id = service
            .session_manager
            .read_session_from_headers(&headers)
            .and_then(|session| session.user_id);
        match attachment_container_read_allowed(
            repository,
            &attachment.container_type,
            attachment.container_id,
            actor_id,
        )
        .await
        {
            Ok(true) => {}
            Ok(false) => return StatusCode::FORBIDDEN.into_response(),
            Err(()) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
        }
    }
    let Ok(bytes) = std::fs::read(uploaded_file_path_with_root(&data_root, &attachment.hash))
    else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let disposition_type = if attachment_query_action(raw_query.as_deref()) == Some("download") {
        "attachment"
    } else {
        "inline"
    };
    let etag = format!("\"{}-{disposition_type}\"", attachment.hash);
    if headers
        .get(http::header::IF_NONE_MATCH)
        .and_then(|value| value.to_str().ok())
        == Some(etag.as_str())
    {
        let mut response = StatusCode::NOT_MODIFIED.into_response();
        response.headers_mut().insert(
            http::header::CACHE_CONTROL,
            HeaderValue::from_static("private, max-age=3600"),
        );
        if let Ok(header_value) = HeaderValue::from_str(&etag) {
            response
                .headers_mut()
                .insert(http::header::ETAG, header_value);
        }
        return response;
    }
    let disposition = format!(
        "{disposition_type}; {}",
        legacy_content_disposition_filename(&attachment.name)
    );
    let mut response = bytes.into_response();
    if let Ok(header_value) = HeaderValue::from_str(&attachment.mime_type) {
        response
            .headers_mut()
            .insert(http::header::CONTENT_TYPE, header_value);
    }
    response.headers_mut().insert(
        http::header::CACHE_CONTROL,
        HeaderValue::from_static("private, max-age=3600"),
    );
    if let Ok(header_value) = HeaderValue::from_str(&etag) {
        response
            .headers_mut()
            .insert(http::header::ETAG, header_value);
    }
    if headers.contains_key(http::header::RANGE) {
        response.headers_mut().insert(
            http::header::ACCEPT_RANGES,
            HeaderValue::from_static("bytes"),
        );
    }
    if let Ok(header_value) = HeaderValue::from_str(&disposition) {
        response
            .headers_mut()
            .insert(http::header::CONTENT_DISPOSITION, header_value);
    }
    response
}

pub(crate) async fn delete_uploaded_file(
    headers: HeaderMap,
    attachment_id: i64,
    service: PilotServiceImpl,
) -> Response {
    let data_root = service.data_root.clone();
    let Some(session) = service.session_manager.read_session_from_headers(&headers) else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    if !service.session_manager.validate_csrf(&headers, &session) {
        return StatusCode::FORBIDDEN.into_response();
    }
    let Some(actor_id) = session.user_id else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let Ok(Some(actor)) = repository.find_user_by_id(actor_id).await else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    match repository
        .delete_attachment_for_actor(
            attachment_id,
            actor.id,
            &actor.login_id,
            actor.is_site_admin,
        )
        .await
    {
        Ok(persistence::DeleteAttachmentResult::Deleted(attachment)) => {
            if !attachment.hash.is_empty() {
                let _ = std::fs::remove_file(uploaded_file_path_with_root(
                    &data_root,
                    &attachment.hash,
                ));
            }
            (
                StatusCode::OK,
                "Both the attachment and its origin file are removed successfully.",
            )
                .into_response()
        }
        Ok(persistence::DeleteAttachmentResult::Forbidden) => StatusCode::FORBIDDEN.into_response(),
        Ok(persistence::DeleteAttachmentResult::NotFound) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) fn routes(service: PilotServiceImpl) -> Router {
    let file_service = service.clone();
    let file_list_service = service.clone();
    let file_read_service = service.clone();
    let file_read_trailing_service = service.clone();
    let file_delete_post_service = service.clone();
    let file_delete_post_trailing_service = service.clone();
    let file_delete_service = service;

    Router::new()
        .route(
            "/files",
            get(
                move |headers: HeaderMap, Query(query): Query<AttachmentListQuery>| {
                    async move {
                        list_uploaded_files(headers, query, file_list_service.clone()).await
                    }
                },
            )
            .post(move |headers: HeaderMap, multipart: Multipart| {
                async move { upload_file(headers, multipart, file_service.clone()).await }
            }),
        )
        .route(
            "/files/{id}",
            get(
                move |headers: HeaderMap, Path(id): Path<i64>, RawQuery(raw_query): RawQuery| {
                    async move {
                        get_uploaded_file(headers, id, raw_query, file_read_service.clone()).await
                    }
                },
            )
            .post(move |headers: HeaderMap, Path(id): Path<i64>| {
                async move { delete_uploaded_file(headers, id, file_delete_post_service.clone()).await }
            })
            .delete(move |headers: HeaderMap, Path(id): Path<i64>| {
                async move { delete_uploaded_file(headers, id, file_delete_service.clone()).await }
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
                            file_read_trailing_service.clone(),
                        )
                        .await
                    }
                },
            )
            .post(move |headers: HeaderMap, Path(id): Path<i64>| {
                async move {
                    delete_uploaded_file(headers, id, file_delete_post_trailing_service.clone())
                        .await
                }
            }),
        )
}
