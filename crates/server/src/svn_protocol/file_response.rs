use axum::body::Bytes;
use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yona_rust_vcs::VcsError;

use super::{
    add_svn_dav_headers, path, svn_protocol_not_implemented_response, svn_protocol_status_response,
    SvnProtocolRoute,
};

pub(super) fn file(repo_path: &StdPath, route: &SvnProtocolRoute, head_only: bool) -> Response {
    let Some((revision, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_not_implemented_response(
            route,
            if head_only { "HEAD" } else { "GET" },
        );
    };
    let bytes = match yona_rust_vcs::svn_cat_file(repo_path, revision, &path) {
        Ok(bytes) => bytes,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(
                route,
                if head_only { "HEAD" } else { "GET" },
            );
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let body = if head_only {
        Bytes::new()
    } else {
        Bytes::from(bytes.clone())
    };
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/octet-stream"),
    );
    if let Ok(value) = HeaderValue::from_str(&bytes.len().to_string()) {
        response
            .headers_mut()
            .insert(http::header::CONTENT_LENGTH, value);
    }
    response
}
