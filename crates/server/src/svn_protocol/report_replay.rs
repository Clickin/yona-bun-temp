use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yona_rust_vcs::VcsError;

use super::{
    add_svn_dav_headers, path, report_filters, svn_protocol_not_implemented_response,
    svn_protocol_status_response, xml, SvnProtocolRoute,
};

pub(crate) fn replay(repo_path: &StdPath, route: &SvnProtocolRoute, request: &str) -> Response {
    let revision = match xml::i64(request, "revision")
        .or_else(|| path::file_lookup_for_route(route).and_then(|(revision, _)| revision))
    {
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
    let low_water_mark = xml::i64(request, "low-water-mark").unwrap_or(0);
    let include_path = xml::text(request, "include-path")
        .map(|path| path.trim_matches('/').to_string())
        .filter(|path| !path.is_empty());
    let base_path = path::file_lookup_for_route(route)
        .map(|(_, path)| path.trim_matches('/').to_string())
        .filter(|path| !path.is_empty());
    let filter_path = include_path.or(base_path);
    let changed_paths = match yona_rust_vcs::svn_changed_paths(repo_path, revision) {
        Ok(paths) => paths,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let operations = changed_paths
        .iter()
        .filter(|path| report_filters::replay_included(&path.path, filter_path.as_deref()))
        .map(|path| report_filters::replay_operation(path, low_water_mark))
        .collect::<String>();
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:editor-report xmlns:S="svn:">
  <S:target-revision rev="{revision}"/>
  <S:open-root rev="{low_water_mark}">
{operations}  </S:open-root>
</S:editor-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}
