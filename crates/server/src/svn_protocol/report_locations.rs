use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yoram_vcs::VcsError;

use super::{
    add_svn_dav_headers, path, report_filters, svn_protocol_not_implemented_response,
    svn_protocol_status_response, xml, xml_escape, SvnProtocolRoute,
};

pub(crate) fn locations(repo_path: &StdPath, route: &SvnProtocolRoute, request: &str) -> Response {
    let Some(location_revision) = xml::i64(request, "location-revision") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let requested_path = xml::text(request, "path").unwrap_or_default();
    let base_path = path::file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let location_path = path::join_report_path(&base_path, &requested_path);
    let exists =
        match yoram_vcs::svn_path_exists(repo_path, Some(location_revision), &location_path) {
            Ok(exists) => exists,
            Err(VcsError::InvalidPath) => {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            }
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "REPORT");
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
    let location = if exists {
        format!(
            r#"  <S:location rev="{location_revision}" path="/{}"/>
"#,
            xml_escape(location_path.trim_matches('/'))
        )
    } else {
        String::new()
    };
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:get-locations-report xmlns:S="svn:" xmlns:D="DAV:">
{location}</S:get-locations-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

pub(crate) fn location_segments(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let Some(start_revision) = xml::i64(request, "start-revision") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let end_revision = xml::i64(request, "end-revision").unwrap_or(start_revision);
    let requested_path = xml::text(request, "path").unwrap_or_default();
    let base_path = path::file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let location_path = path::join_report_path(&base_path, &requested_path);
    let exists = match yoram_vcs::svn_path_exists(repo_path, Some(start_revision), &location_path) {
        Ok(exists) => exists,
        Err(VcsError::InvalidPath) => {
            return svn_protocol_status_response(StatusCode::BAD_REQUEST);
        }
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let segment = if exists {
        match report_filters::location_segments(
            repo_path,
            &location_path,
            start_revision,
            end_revision,
        ) {
            Ok(segments) => segments
                .into_iter()
                .map(|segment| {
                    format!(
                        r#"  <S:location-segment path="{}" range-start="{}" range-end="{}"/>
"#,
                        xml_escape(segment.path.trim_matches('/')),
                        segment.range_start,
                        segment.range_end
                    )
                })
                .collect::<String>(),
            Err(VcsError::NotFound) => String::new(),
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
    } else {
        String::new()
    };
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:get-location-segments-report xmlns:S="svn:" xmlns:D="DAV:">
{segment}</S:get-location-segments-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}
