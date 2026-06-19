use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yona_rust_vcs::VcsError;

use super::{
    add_svn_dav_headers, path, svn_protocol_not_implemented_response, svn_protocol_status_response,
    xml, SvnProtocolRoute,
};

pub(crate) fn dated_rev(repo_path: &StdPath, route: &SvnProtocolRoute, request: &str) -> Response {
    let Some(creation_date) = xml::text(request, "creationdate") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let revision = match yona_rust_vcs::svn_revision_at_or_before(repo_path, &creation_date) {
        Ok(Some(revision)) => revision,
        Ok(None) | Err(VcsError::NotFound) => {
            return svn_protocol_status_response(StatusCode::NOT_FOUND);
        }
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:dated-rev-report xmlns:S="svn:" xmlns:D="DAV:">
  <D:version-name>{revision}</D:version-name>
</S:dated-rev-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

pub(crate) fn deleted_rev(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let Some(requested_path) = xml::text(request, "path") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let Some(peg_revision) = xml::i64(request, "peg-revision") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let end_revision = match xml::i64(request, "end-revision") {
        Some(revision) => revision,
        None => match yona_rust_vcs::svn_youngest_revision(repo_path) {
            Ok(revision) => revision,
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "REPORT");
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        },
    };
    let base_path = path::file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let path = path::join_report_path(&base_path, &requested_path);
    let deleted_revision =
        match yona_rust_vcs::svn_deleted_revision(repo_path, &path, peg_revision, end_revision) {
            Ok(revision) => revision,
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::InvalidPath) => {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            }
            Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "REPORT");
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
    let version_name = deleted_revision
        .map(|revision| format!("  <D:version-name>{revision}</D:version-name>\n"))
        .unwrap_or_default();
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:get-deleted-rev-report xmlns:S="svn:" xmlns:D="DAV:">
{version_name}</S:get-deleted-rev-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}
