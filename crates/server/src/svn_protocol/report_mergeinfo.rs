use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yoram_vcs::VcsError;

use super::{
    add_svn_dav_headers, path, report_items, svn_protocol_not_implemented_response,
    svn_protocol_status_response, xml, SvnProtocolRoute,
};

pub(crate) fn mergeinfo(repo_path: &StdPath, route: &SvnProtocolRoute, request: &str) -> Response {
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
    let base_path = path::file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let requested_paths = xml::sections(request, "path");
    let requested_paths = if requested_paths.is_empty() {
        vec![base_path.as_str()]
    } else {
        requested_paths
    };

    let mut items = String::new();
    for requested_path in requested_paths {
        let path = path::join_report_path(&base_path, requested_path);
        let mergeinfo =
            match yoram_vcs::svn_property(repo_path, Some(revision), &path, "svn:mergeinfo") {
                Ok(Some(mergeinfo)) => mergeinfo,
                Ok(None) => continue,
                Err(VcsError::NotFound) => continue,
                Err(VcsError::InvalidPath) => {
                    return svn_protocol_status_response(StatusCode::BAD_REQUEST);
                }
                Err(VcsError::SvnLookUnavailable) => {
                    return svn_protocol_not_implemented_response(route, "REPORT");
                }
                Err(error) => {
                    return RestRouteError::from_connect_error(internal_error(error))
                        .into_response();
                }
            };
        let response_path = if base_path.is_empty() {
            path.as_str()
        } else {
            requested_path.trim_matches('/')
        };
        items.push_str(&report_items::mergeinfo(response_path, &mergeinfo));
    }

    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:mergeinfo-report xmlns:S="svn:" xmlns:D="DAV:">
{items}</S:mergeinfo-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}
