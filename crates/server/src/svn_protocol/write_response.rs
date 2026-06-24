use axum::body::Bytes;
use axum::response::{IntoResponse, Response};
use http::{HeaderMap, HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, persistence, smart_http_basic_challenge_response, RestRouteError};
use yoram_vcs::VcsError;

use super::{
    add_svn_dav_headers, href, lock as lock_helpers, path, report_items,
    svn_protocol_not_implemented_response, svn_protocol_status_response, write, xml,
    SvnProtocolRoute,
};

pub(super) fn put(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    body: &Bytes,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((revision, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if revision.is_some() || path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let existed = match yoram_vcs::svn_path_exists(repo_path, None, &path) {
        Ok(exists) => exists,
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "PUT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let contents = match write::put_contents(repo_path, &path, body) {
        Ok(contents) => contents,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "PUT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let message = format!("Update {path} through WebDAV by {}", actor.login_id);
    match yoram_vcs::svn_put_file(repo_path, &path, &contents, &message) {
        Ok(revision) => {
            let status = if existed {
                StatusCode::NO_CONTENT
            } else {
                StatusCode::CREATED
            };
            write::revision_response(status, revision)
        }
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) | Err(VcsError::SvnLookUnavailable) => {
            svn_protocol_not_implemented_response(route, "PUT")
        }
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

pub(super) fn copy(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    headers: &HeaderMap,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((source_revision, source_path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if source_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let Some(destination) = headers
        .get("destination")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| path::destination_file_lookup(route, value))
    else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let (destination_revision, destination_path) = destination;
    if destination_revision.is_some() || destination_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let message = format!(
        "Copy {source_path} to {destination_path} through WebDAV by {}",
        actor.login_id
    );
    match yoram_vcs::svn_copy_path(
        repo_path,
        source_revision,
        &source_path,
        &destination_path,
        &message,
    ) {
        Ok(revision) => write::revision_response(StatusCode::CREATED, revision),
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) | Err(VcsError::SvnLookUnavailable) => {
            svn_protocol_not_implemented_response(route, "COPY")
        }
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

pub(super) fn move_path(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    headers: &HeaderMap,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((source_revision, source_path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if source_revision.is_some() || source_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let Some(destination) = headers
        .get("destination")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| path::destination_file_lookup(route, value))
    else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let (destination_revision, destination_path) = destination;
    if destination_revision.is_some() || destination_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let message = format!(
        "Move {source_path} to {destination_path} through WebDAV by {}",
        actor.login_id
    );
    match yoram_vcs::svn_move_path(repo_path, &source_path, &destination_path, &message) {
        Ok(revision) => write::revision_response(StatusCode::CREATED, revision),
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) | Err(VcsError::SvnLookUnavailable) => {
            svn_protocol_not_implemented_response(route, "MOVE")
        }
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

pub(super) fn mkcol(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((revision, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if revision.is_some() || path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let message = format!("Create {path} through WebDAV by {}", actor.login_id);
    match yoram_vcs::svn_make_collection(repo_path, &path, &message) {
        Ok(revision) => write::revision_response(StatusCode::CREATED, revision),
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) => svn_protocol_not_implemented_response(route, "MKCOL"),
        Err(VcsError::SvnFailed(_)) | Err(VcsError::FilesystemFailed(_)) => {
            svn_protocol_status_response(StatusCode::CONFLICT)
        }
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

pub(super) fn proppatch(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    body: &Bytes,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((revision, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if path::working_activity_id(&route.svn_path).is_some() && path.trim().is_empty() {
        let mut response = (
            StatusCode::MULTI_STATUS,
            report_items::proppatch_multistatus(&href::resource(route, "", false), &[]),
        )
            .into_response();
        add_svn_dav_headers(&mut response);
        response.headers_mut().insert(
            http::header::CONTENT_TYPE,
            HeaderValue::from_static("application/xml; charset=utf-8"),
        );
        return response;
    }
    if revision.is_some() || path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let request = String::from_utf8_lossy(body);
    let patches = match xml::property_patches(&request) {
        Some(patches) if !patches.is_empty() => patches,
        _ => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
    };
    let message = format!(
        "Update properties on {path} through WebDAV by {}",
        actor.login_id
    );
    match yoram_vcs::svn_patch_properties(repo_path, &path, &patches, &message) {
        Ok(revision) => {
            let mut response = (
                StatusCode::MULTI_STATUS,
                report_items::proppatch_multistatus(&href::resource(route, &path, false), &patches),
            )
                .into_response();
            add_svn_dav_headers(&mut response);
            response.headers_mut().insert(
                http::header::CONTENT_TYPE,
                HeaderValue::from_static("application/xml; charset=utf-8"),
            );
            write::insert_revision_header(&mut response, revision);
            response
        }
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) => svn_protocol_not_implemented_response(route, "PROPPATCH"),
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

pub(super) fn delete(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((revision, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if revision.is_some() || path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let message = format!("Delete {path} through WebDAV by {}", actor.login_id);
    match yoram_vcs::svn_delete_path(repo_path, &path, &message) {
        Ok(revision) => write::revision_response(StatusCode::NO_CONTENT, revision),
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) => svn_protocol_not_implemented_response(route, "DELETE"),
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

pub(super) fn lock(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    body: &Bytes,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((_, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let request = String::from_utf8_lossy(body);
    let comment = xml::text(&request, "comment")
        .or_else(|| xml::text(&request, "owner"))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "Yona WebDAV lock".to_string());
    let token = lock_helpers::new_token();
    let lock =
        match yoram_vcs::svn_lock_path(repo_path, &path, &actor.login_id, &comment, &token) {
            Ok(lock) => lock,
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::InvalidPath) => {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            }
            Err(VcsError::SvnAdminUnavailable) | Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "LOCK");
            }
            Err(VcsError::SvnAdminFailed(_)) => {
                return svn_protocol_status_response(
                    StatusCode::from_u16(423).expect("valid WebDAV Locked status"),
                );
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
    let body = lock_helpers::discovery_body(&href::project(route), &lock);
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    if let Ok(value) = HeaderValue::from_str(&format!("<{}>", lock.token)) {
        response.headers_mut().insert("lock-token", value);
    }
    response
}

pub(super) fn unlock(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    headers: &HeaderMap,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((_, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let Some(token) = lock_helpers::token_header(headers) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    match yoram_vcs::svn_unlock_path(repo_path, &path, &actor.login_id, &token) {
        Ok(()) => svn_protocol_status_response(StatusCode::NO_CONTENT),
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnAdminUnavailable) => {
            svn_protocol_not_implemented_response(route, "UNLOCK")
        }
        Err(VcsError::SvnAdminFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}
