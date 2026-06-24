use axum::body::Bytes;
use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::base_path_href;
use crate::{internal_error, RestRouteError};
use yoram_vcs::VcsError;

use super::{
    add_svn_dav_headers, href, path, svn_protocol_not_implemented_response,
    svn_protocol_status_response, xml, xml_escape, SvnProtocolRoute,
};

pub(super) fn mkactivity(route: &SvnProtocolRoute) -> Response {
    if path::activity_id(&route.svn_path).is_none() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    svn_protocol_status_response(StatusCode::CREATED)
}

pub(super) fn checkout(route: &SvnProtocolRoute, body: &Bytes) -> Response {
    let request = String::from_utf8_lossy(body);
    let Some(activity_href) = xml::text(&request, "href") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let Some(activity_id) = path::activity_id(&activity_href) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let Some(location) = checkout_location(route, &activity_id) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let mut response = svn_protocol_status_response(StatusCode::CREATED);
    if let Ok(value) = HeaderValue::from_str(&location) {
        response.headers_mut().insert(http::header::LOCATION, value);
    }
    response
}

pub(super) fn merge(repo_path: &StdPath, route: &SvnProtocolRoute, body: &Bytes) -> Response {
    let request = String::from_utf8_lossy(body);
    let Some(activity_href) = xml::text(&request, "href") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if path::activity_id(&activity_href).is_none() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let revision = match yoram_vcs::svn_youngest_revision(repo_path) {
        Ok(revision) => revision,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "MERGE");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let merge_path = path::file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let changed_paths = match yoram_vcs::svn_changed_paths(repo_path, revision) {
        Ok(paths) => paths,
        Err(VcsError::NotFound) => Vec::new(),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "MERGE");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let updated_responses = merge_updated_responses(route, revision, &merge_path, &changed_paths);
    let body = format!(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n\
<D:merge-response xmlns:D=\"DAV:\" xmlns:S=\"svn:\">\n\
  <D:updated-set>\n\
{updated_responses}\
  </D:updated-set>\n\
</D:merge-response>\n"
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    if let Ok(value) = HeaderValue::from_str(&revision.to_string()) {
        response.headers_mut().insert("svn-revision", value);
    }
    response
}

fn checkout_location(route: &SvnProtocolRoute, activity_id: &str) -> Option<String> {
    let working_path =
        if route.svn_path == "!svn/vcc/default" || route.svn_path.starts_with("!svn/bln/") {
            String::new()
        } else {
            let (_, path) = path::file_lookup_for_route(route)?;
            path
        };
    let mut location = format!(
        "{}/!svn/wrk/{}",
        href::project(route),
        xml_escape(activity_id)
    );
    if !working_path.is_empty() {
        location.push('/');
        location.push_str(&working_path);
    }
    Some(location)
}

fn merge_updated_responses(
    route: &SvnProtocolRoute,
    revision: i64,
    merge_path: &str,
    changed_paths: &[yoram_vcs::SvnChangedPath],
) -> String {
    let mut updated_responses = String::new();
    let project_href = base_path_href(
        &route.base_path,
        &format!("/svn/{}/{}", route.owner_name, route.project_name),
    );
    updated_responses.push_str(&format!(
        "    <D:response>\n\
      <D:href>{}/!svn/bln/{revision}</D:href>\n\
      <D:propstat>\n\
        <D:prop>\n\
          <D:resourcetype><D:baseline/></D:resourcetype>\n\
          <D:version-name>{revision}</D:version-name>\n\
        </D:prop>\n\
        <D:status>HTTP/1.1 200 OK</D:status>\n\
      </D:propstat>\n\
    </D:response>\n",
        xml_escape(&project_href)
    ));
    for changed_path in changed_paths.iter().filter(|changed_path| {
        let path = changed_path.path.trim_matches('/');
        let merge_path = merge_path.trim_matches('/');
        merge_path.is_empty() || path == merge_path || path.starts_with(&format!("{merge_path}/"))
    }) {
        let path = changed_path.path.trim_matches('/');
        let href = href::merge(&project_href, path, changed_path.is_dir);
        let checked_in_href = href::merge_version(&project_href, revision, path);
        let resourcetype = if changed_path.is_dir {
            "<D:resourcetype><D:collection/></D:resourcetype>"
        } else {
            "<D:resourcetype/>"
        };
        updated_responses.push_str(&format!(
            "    <D:response>\n\
      <D:href>{}</D:href>\n\
      <D:propstat>\n\
        <D:prop>\n\
          <D:checked-in><D:href>{}</D:href></D:checked-in>\n\
          {resourcetype}\n\
          <D:version-name>{revision}</D:version-name>\n\
        </D:prop>\n\
        <D:status>HTTP/1.1 200 OK</D:status>\n\
      </D:propstat>\n\
    </D:response>\n",
            xml_escape(&href),
            xml_escape(&checked_in_href)
        ));
    }
    if updated_responses.is_empty() {
        let href = href::merge(&project_href, merge_path, true);
        let checked_in_href = href::merge_version(&project_href, revision, merge_path);
        updated_responses.push_str(&format!(
            "    <D:response>\n\
      <D:href>{}</D:href>\n\
      <D:propstat>\n\
        <D:prop>\n\
          <D:checked-in><D:href>{}</D:href></D:checked-in>\n\
          <D:resourcetype><D:collection/></D:resourcetype>\n\
          <D:version-name>{revision}</D:version-name>\n\
        </D:prop>\n\
        <D:status>HTTP/1.1 200 OK</D:status>\n\
      </D:propstat>\n\
    </D:response>\n",
            xml_escape(&href),
            xml_escape(&checked_in_href)
        ));
    }
    updated_responses
}
