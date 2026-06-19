use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yona_rust_vcs::VcsError;

use super::{
    add_svn_dav_headers, report_filters, report_items, svn_protocol_not_implemented_response,
    svn_protocol_status_response, xml, SvnProtocolRoute,
};

pub(crate) fn log(repo_path: &StdPath, route: &SvnProtocolRoute, request: &str) -> Response {
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
    let start_revision = xml::i64(request, "start-revision").unwrap_or(youngest_revision);
    let end_revision = xml::i64(request, "end-revision").unwrap_or(start_revision);
    let limit = xml::i64(request, "limit")
        .and_then(|value| usize::try_from(value).ok())
        .unwrap_or(0);
    let entries =
        match yona_rust_vcs::svn_log_entries(repo_path, start_revision, end_revision, limit) {
            Ok(entries) => entries,
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
    let include_changed_paths = request.contains("discover-changed-paths");
    let path_filter = xml::text(request, "path")
        .map(|path| path.trim_matches('/').to_string())
        .filter(|path| !path.is_empty());
    let items = entries
        .iter()
        .filter_map(|entry| {
            let changed_paths =
                if (include_changed_paths || path_filter.is_some()) && entry.revision > 0 {
                    yona_rust_vcs::svn_changed_paths(repo_path, entry.revision).unwrap_or_default()
                } else {
                    Vec::new()
                };
            if let Some(path_filter) = path_filter.as_deref() {
                if !changed_paths
                    .iter()
                    .any(|path| report_filters::log_path_included(&path.path, path_filter))
                {
                    return None;
                }
            }
            Some(if include_changed_paths && entry.revision > 0 {
                report_items::log(entry, &changed_paths)
            } else {
                report_items::log(entry, &[])
            })
        })
        .collect::<String>();
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:log-report xmlns:S="svn:" xmlns:D="DAV:">
{items}</S:log-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}
