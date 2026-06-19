use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yona_rust_vcs::VcsError;

use super::{
    add_svn_dav_headers, path, report_items, svn_protocol_not_implemented_response,
    svn_protocol_status_response, xml, SvnProtocolRoute,
};

pub(crate) fn file_revs(repo_path: &StdPath, route: &SvnProtocolRoute, request: &str) -> Response {
    let youngest_revision = match yona_rust_vcs::svn_youngest_revision(repo_path) {
        Ok(revision) => revision,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let start_revision = xml::i64(request, "start-revision").unwrap_or(0);
    let end_revision = xml::i64(request, "end-revision").unwrap_or(youngest_revision);
    let requested_path = xml::text(request, "path").unwrap_or_default();
    let base_path = path::file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let file_path = path::join_report_path(&base_path, &requested_path);
    if file_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let entries = match yona_rust_vcs::svn_log_entries(repo_path, start_revision, end_revision, 0) {
        Ok(entries) => entries,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let mut file_revs = String::new();
    for entry in entries {
        match yona_rust_vcs::svn_cat_file(repo_path, Some(entry.revision), &file_path) {
            Ok(contents) => {
                file_revs.push_str(&report_items::file_rev(&file_path, &entry, &contents))
            }
            Err(VcsError::NotFound) => {}
            Err(VcsError::InvalidPath) => {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            }
            Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "REPORT");
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        }
    }
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:file-revs-report xmlns:S="svn:" xmlns:D="DAV:">
{file_revs}</S:file-revs-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}
