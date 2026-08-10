use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path;

use crate::base_path_href;

use super::{href, xml_escape, SvnProtocolRoute};

pub(crate) fn response(
    repo_path: &Path,
    route: &SvnProtocolRoute,
    youngest_revision: Option<i64>,
    repository_uuid: Option<String>,
) -> Response {
    let activity_collection = format!("{}/!svn/act/", href::project(route));
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<D:options-response xmlns:D="DAV:">
  <D:activity-collection-set>
    <D:href>{}</D:href>
  </D:activity-collection-set>
</D:options-response>"#,
        xml_escape(&activity_collection)
    );
    let mut response = (StatusCode::OK, body).into_response();
    response
        .headers_mut()
        .insert("dav", HeaderValue::from_static("1,2, SVN-atomic-revprops, SVN-mergeinfo"));
    response
        .headers_mut()
        .insert("ms-author-via", HeaderValue::from_static("DAV"));
    response.headers_mut().insert(
        http::header::ALLOW,
        HeaderValue::from_static(
            "OPTIONS, GET, HEAD, POST, PUT, COPY, MOVE, DELETE, MKCOL, MKACTIVITY, PROPFIND, PROPPATCH, REPORT, LOCK, UNLOCK, CHECKOUT, MERGE",
        ),
    );
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    if let Some(revision) = youngest_revision {
        if let Ok(value) = HeaderValue::from_str(&revision.to_string()) {
            response.headers_mut().insert("svn-youngest-rev", value);
        }
    }
    if let Some(uuid) = repository_uuid {
        if let Ok(value) = HeaderValue::from_str(&uuid) {
            response.headers_mut().insert("svn-repository-uuid", value);
        }
    }
    response
        .headers_mut()
        .insert("svn-repository-mergeinfo", HeaderValue::from_static("yes"));
    if targets_file(repo_path, route) {
        // Subversion expects this HTTP-v2 header to be a server-relative URI;
        // absolute URLs trip VisualSVN 1.14 direct-file property commands.
        let repository_root_uri = base_path_href(
            &route.base_path,
            &format!("/svn/{}/{}", route.owner_name, route.project_name),
        );
        if let Ok(value) = HeaderValue::from_str(&repository_root_uri) {
            response.headers_mut().insert("svn-repository-root", value);
        }
    }
    response
}

fn targets_file(repo_path: &Path, route: &SvnProtocolRoute) -> bool {
    let path = route.svn_path.trim_matches('/');
    if path.is_empty() || path.starts_with("!svn/") {
        return false;
    }
    yoram_vcs::svn_cat_file(repo_path, None, path).is_ok()
}
