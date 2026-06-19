use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yona_rust_vcs::VcsError;

use super::{
    add_svn_dav_headers, path, report_items, svn_protocol_not_implemented_response,
    svn_protocol_status_response, xml, SvnProtocolRoute,
};

pub(crate) fn get_locks(repo_path: &StdPath, route: &SvnProtocolRoute) -> Response {
    let path = path::file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let lock = match yona_rust_vcs::svn_lock(repo_path, &path) {
        Ok(lock) => lock,
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let lock_item = lock.as_ref().map(report_items::lock).unwrap_or_default();
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:get-locks-report xmlns:S="svn:" xmlns:D="DAV:">
{lock_item}</S:get-locks-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

pub(crate) fn inherited_props(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let revision = match xml::i64(request, "revision") {
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
    let requested_path = xml::text(request, "path").unwrap_or_default();
    let base_path = path::file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let path = path::join_report_path(&base_path, &requested_path);
    let inherited = match yona_rust_vcs::svn_inherited_properties(repo_path, revision, &path) {
        Ok(inherited) => inherited,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let items = inherited
        .iter()
        .map(report_items::inherited_props)
        .collect::<String>();
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:inherited-props-report xmlns:S="svn:" xmlns:V="http://subversion.tigris.org/xmlns/dav/">
{items}</S:inherited-props-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}
