use axum::extract::Request;
use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use http_body_util::BodyExt;

use crate::{
    internal_error, smart_http_authorization, smart_http_basic_challenge_response,
    smart_http_principal_from_headers, PilotBackend, PilotServiceImpl, RestRouteError,
    SmartHttpAccessFailure, SmartHttpPermission,
};
mod activity;
mod date;
mod file_response;
mod href;
mod lock;
mod options;
mod path;
mod propfind;
mod propfind_items;
mod propfind_response;
mod report_file_revs;
mod report_filters;
mod report_items;
mod report_list;
mod report_locations;
mod report_log;
mod report_mergeinfo;
mod report_misc;
mod report_replay;
mod report_response;
mod report_revisions;
mod report_update;
mod svndiff;
mod update;
mod write;
mod write_response;
mod xml;

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct SvnProtocolRoute {
    base_path: String,
    request_origin: Option<String>,
    owner_name: String,
    project_name: String,
    svn_path: String,
}

pub(crate) async fn direct_request(request: Request, service: PilotServiceImpl) -> Response {
    let Some(mut route) = route_from_path(request.uri().path(), &service.base_path) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let (parts, body) = request.into_parts();
    let method = parts.method.as_str().to_ascii_uppercase();
    route.request_origin = parts
        .headers
        .get(http::header::HOST)
        .and_then(|value| value.to_str().ok())
        .filter(|host| !host.trim().is_empty())
        .map(|host| format!("http://{host}"));
    let permission = if matches!(
        method.as_str(),
        "GET" | "HEAD" | "OPTIONS" | "PROPFIND" | "REPORT"
    ) {
        SmartHttpPermission::Read
    } else {
        SmartHttpPermission::Write
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let principal = match smart_http_principal_from_headers(
        &parts.headers,
        &service.session_manager,
        repository,
        &service.auth_ui,
        &service.ldap,
    )
    .await
    {
        Ok(principal) => principal,
        Err(response) => return response,
    };
    let actor_id = principal.as_ref().map(|user| user.id);
    let authorization = match repository
        .read_project_authorization(&route.owner_name, &route.project_name, actor_id)
        .await
    {
        Ok(Some(authorization)) => authorization,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    if authorization.project.vcs != "Subversion" {
        return StatusCode::NOT_FOUND.into_response();
    }
    match smart_http_authorization(&authorization, actor_id.is_none(), permission) {
        Ok(()) => {}
        Err(SmartHttpAccessFailure::AuthenticationRequired) => {
            return smart_http_basic_challenge_response();
        }
        Err(SmartHttpAccessFailure::Forbidden) => return StatusCode::FORBIDDEN.into_response(),
        Err(SmartHttpAccessFailure::InvalidProjectScope(error)) => {
            return RestRouteError::from_connect_error(error).into_response();
        }
    }

    let repo_path =
        yoram_vcs::svn_repository_path(&service.data_root, authorization.project.id);
    if !repo_path.exists() || !repo_path.is_dir() {
        return StatusCode::NOT_FOUND.into_response();
    }
    if method == "OPTIONS" {
        let youngest_revision = yoram_vcs::svn_youngest_revision(&repo_path).ok();
        let repository_uuid = yoram_vcs::svn_repository_uuid(&repo_path).ok();
        return options::response(&repo_path, &route, youngest_revision, repository_uuid);
    }
    if method == "PROPFIND" && route.svn_path.is_empty() {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        let request = String::from_utf8_lossy(&body_bytes);
        let youngest_revision = path::label_revision(&parts.headers)
            .or_else(|| yoram_vcs::svn_youngest_revision(&repo_path).ok());
        let repository_uuid = yoram_vcs::svn_repository_uuid(&repo_path).ok();
        return propfind_response::root(
            &route,
            &repo_path,
            youngest_revision,
            repository_uuid,
            &request,
        );
    }
    if method == "PROPFIND" && route.svn_path == "!svn/vcc/default" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        let request = String::from_utf8_lossy(&body_bytes);
        let youngest_revision = path::label_revision(&parts.headers)
            .or_else(|| yoram_vcs::svn_youngest_revision(&repo_path).ok());
        let repository_uuid = yoram_vcs::svn_repository_uuid(&repo_path).ok();
        return propfind_response::collection(
            &route,
            &repo_path,
            youngest_revision,
            repository_uuid,
            &request,
        );
    }
    if method == "PROPFIND" && route.svn_path.starts_with("!svn/bln/") {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        let request = String::from_utf8_lossy(&body_bytes);
        return propfind_response::baseline(&repo_path, &route, &request);
    }
    if method == "PROPFIND" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        let request = String::from_utf8_lossy(&body_bytes);
        let depth = parts
            .headers
            .get("depth")
            .and_then(|value| value.to_str().ok())
            .map(str::trim);
        let include_children = depth.map(|value| value != "0").unwrap_or(true);
        let recursive_children = depth
            .map(|value| value.eq_ignore_ascii_case("infinity"))
            .unwrap_or(false);
        let propfind_route = path::labeled_route(&route, &parts.headers);
        if let Some(response) = propfind_response::tree(
            &repo_path,
            &propfind_route,
            include_children,
            recursive_children,
            &request,
        ) {
            return response;
        }
        return propfind_response::file(&repo_path, &propfind_route, &request);
    }
    if method == "GET" || method == "HEAD" {
        return file_response::file(&repo_path, &route, method == "HEAD");
    }
    if method == "MKACTIVITY" {
        return activity::mkactivity(&route);
    }
    if method == "CHECKOUT" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return activity::checkout(&route, &body_bytes);
    }
    if method == "MERGE" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return activity::merge(&repo_path, &route, &body_bytes);
    }
    if method == "PUT" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return write_response::put(&repo_path, &route, principal.as_ref(), &body_bytes);
    }
    if method == "COPY" {
        return write_response::copy(&repo_path, &route, principal.as_ref(), &parts.headers);
    }
    if method == "MOVE" {
        return write_response::move_path(&repo_path, &route, principal.as_ref(), &parts.headers);
    }
    if method == "DELETE" {
        if path::activity_id(&route.svn_path).is_some() {
            return svn_protocol_status_response(StatusCode::NO_CONTENT);
        }
        return write_response::delete(&repo_path, &route, principal.as_ref());
    }
    if method == "MKCOL" {
        return write_response::mkcol(&repo_path, &route, principal.as_ref());
    }
    if method == "PROPPATCH" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return write_response::proppatch(&repo_path, &route, principal.as_ref(), &body_bytes);
    }
    if method == "REPORT" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return report_response::report(&repo_path, &route, &body_bytes);
    }
    if method == "LOCK" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return write_response::lock(&repo_path, &route, principal.as_ref(), &body_bytes);
    }
    if method == "UNLOCK" {
        return write_response::unlock(&repo_path, &route, principal.as_ref(), &parts.headers);
    }
    svn_protocol_not_implemented_response(&route, &method)
}

fn svn_protocol_status_response(status: StatusCode) -> Response {
    let mut response = status.into_response();
    add_svn_dav_headers(&mut response);
    response
}

fn add_svn_dav_headers(response: &mut Response) {
    response
        .headers_mut()
        .insert("dav", HeaderValue::from_static("1,2"));
    response
        .headers_mut()
        .insert("ms-author-via", HeaderValue::from_static("DAV"));
}

fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn svn_protocol_not_implemented_response(route: &SvnProtocolRoute, method: &str) -> Response {
    let mut response = (
        StatusCode::NOT_IMPLEMENTED,
        format!(
            "SVN protocol serving is not implemented yet for {}/{} ({method} {})",
            route.owner_name, route.project_name, route.svn_path
        ),
    )
        .into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("text/plain; charset=utf-8"),
    );
    response
}

pub(crate) fn route_from_path(path: &str, base_path: &str) -> Option<SvnProtocolRoute> {
    let mut relative = path;
    if base_path != "/" {
        if relative == base_path {
            relative = "/";
        } else if let Some(stripped) = relative.strip_prefix(&format!("{base_path}/")) {
            relative = stripped;
        }
    }
    let segments = relative
        .trim_start_matches('/')
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();
    if segments.len() < 3 || segments[0] != "svn" {
        return None;
    }
    let owner_name = segments[1].to_string();
    let project_name = segments[2].to_string();
    if owner_name.is_empty() || project_name.is_empty() {
        return None;
    }
    Some(SvnProtocolRoute {
        base_path: base_path.to_string(),
        request_origin: None,
        owner_name,
        project_name,
        svn_path: segments[3..].join("/"),
    })
}
