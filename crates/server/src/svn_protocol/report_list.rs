use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yoram_vcs::VcsError;

use super::{
    add_svn_dav_headers, date, path, report_items, svn_protocol_not_implemented_response,
    svn_protocol_status_response, xml, SvnProtocolRoute,
};

pub(crate) fn list(repo_path: &StdPath, route: &SvnProtocolRoute, request: &str) -> Response {
    let revision = match xml::i64(request, "revision") {
        Some(revision) => revision,
        None => match yoram_vcs::svn_youngest_revision(repo_path) {
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
    let requested_path = xml::text(request, "path").unwrap_or_default();
    let base_path = path::file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let list_path = path::join_report_path(&base_path, &requested_path);
    let tree = match yoram_vcs::svn_list_tree(repo_path, Some(revision), &list_path) {
        Ok(tree) => tree,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let log_entry = match yoram_vcs::svn_log_entries(repo_path, revision, revision, 1) {
        Ok(mut entries) => entries.pop(),
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let author = log_entry
        .as_ref()
        .map(|entry| entry.author.as_str())
        .unwrap_or_default();
    let date = log_entry
        .as_ref()
        .map(|entry| date::committed_date(&entry.date))
        .unwrap_or_default();
    let mut items = String::new();
    for entry in &tree.entries {
        items.push_str(&report_items::list(
            repo_path, revision, entry, author, &date,
        ));
    }
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:list-report xmlns:S="svn:" xmlns:D="DAV:">
{items}</S:list-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}
