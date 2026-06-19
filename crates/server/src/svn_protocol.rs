use axum::body::Bytes;
use axum::extract::Request;
use axum::response::{IntoResponse, Response};
use http::{HeaderMap, HeaderValue, StatusCode};
use http_body_util::BodyExt;
use std::path::Path as StdPath;

use crate::session::SessionManager;
use crate::{
    internal_error, persistence, smart_http_authorization, smart_http_basic_challenge_response,
    smart_http_principal_from_headers, yona_data_root, PilotBackend, RestRouteError,
    SmartHttpAccessFailure, SmartHttpPermission,
};
use yona_rust_vcs::VcsError;

mod activity;
mod date;
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
mod report_revisions;
mod report_update;
mod svndiff;
mod update;
mod write;
mod xml;

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct SvnProtocolRoute {
    base_path: String,
    request_origin: Option<String>,
    owner_name: String,
    project_name: String,
    svn_path: String,
}

pub(crate) async fn direct_request(
    request: Request,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let Some(mut route) = route_from_path(request.uri().path(), &base_path) else {
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
    let PilotBackend::Repository(repository) = &backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let principal =
        match smart_http_principal_from_headers(&parts.headers, &session_manager, repository).await
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

    let repo_path = yona_rust_vcs::svn_repository_path(&yona_data_root(), authorization.project.id);
    if !repo_path.exists() || !repo_path.is_dir() {
        return StatusCode::NOT_FOUND.into_response();
    }
    if method == "OPTIONS" {
        let youngest_revision = yona_rust_vcs::svn_youngest_revision(&repo_path).ok();
        let repository_uuid = yona_rust_vcs::svn_repository_uuid(&repo_path).ok();
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
            .or_else(|| yona_rust_vcs::svn_youngest_revision(&repo_path).ok());
        let repository_uuid = yona_rust_vcs::svn_repository_uuid(&repo_path).ok();
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
            .or_else(|| yona_rust_vcs::svn_youngest_revision(&repo_path).ok());
        let repository_uuid = yona_rust_vcs::svn_repository_uuid(&repo_path).ok();
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
        return svn_protocol_file_response(&repo_path, &route, method == "HEAD");
    }
    if method == "MKACTIVITY" {
        return svn_protocol_mkactivity_response(&route);
    }
    if method == "CHECKOUT" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return svn_protocol_checkout_response(&route, &body_bytes);
    }
    if method == "MERGE" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return svn_protocol_merge_response(&repo_path, &route, &body_bytes);
    }
    if method == "PUT" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return svn_protocol_put_response(&repo_path, &route, principal.as_ref(), &body_bytes);
    }
    if method == "COPY" {
        return svn_protocol_copy_response(&repo_path, &route, principal.as_ref(), &parts.headers);
    }
    if method == "MOVE" {
        return svn_protocol_move_response(&repo_path, &route, principal.as_ref(), &parts.headers);
    }
    if method == "DELETE" {
        if path::activity_id(&route.svn_path).is_some() {
            return svn_protocol_status_response(StatusCode::NO_CONTENT);
        }
        return svn_protocol_delete_response(&repo_path, &route, principal.as_ref());
    }
    if method == "MKCOL" {
        return svn_protocol_mkcol_response(&repo_path, &route, principal.as_ref());
    }
    if method == "PROPPATCH" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return svn_protocol_proppatch_response(
            &repo_path,
            &route,
            principal.as_ref(),
            &body_bytes,
        );
    }
    if method == "REPORT" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return svn_protocol_report_response(&repo_path, &route, &body_bytes);
    }
    if method == "LOCK" {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        return svn_protocol_lock_response(&repo_path, &route, principal.as_ref(), &body_bytes);
    }
    if method == "UNLOCK" {
        return svn_protocol_unlock_response(
            &repo_path,
            &route,
            principal.as_ref(),
            &parts.headers,
        );
    }
    svn_protocol_not_implemented_response(&route, &method)
}

fn svn_protocol_file_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    head_only: bool,
) -> Response {
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

fn svn_protocol_status_response(status: StatusCode) -> Response {
    let mut response = status.into_response();
    add_svn_dav_headers(&mut response);
    response
}

fn svn_protocol_report_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    body: &Bytes,
) -> Response {
    let request = String::from_utf8_lossy(body);
    if request.contains("log-report") {
        return report_log::log(repo_path, route, &request);
    }
    if request.contains("dated-rev-report") {
        return report_revisions::dated_rev(repo_path, route, &request);
    }
    if request.contains("update-report") {
        return report_update::update(repo_path, route, &request);
    }
    if request.contains("replay-report") {
        return report_replay::replay(repo_path, route, &request);
    }
    if request.contains("file-revs-report") {
        return report_file_revs::file_revs(repo_path, route, &request);
    }
    if request.contains("mergeinfo-report") {
        return report_mergeinfo::mergeinfo(repo_path, route, &request);
    }
    if request.contains("get-deleted-rev-report") {
        return report_revisions::deleted_rev(repo_path, route, &request);
    }
    if request.contains("list-report") {
        return report_list::list(repo_path, route, &request);
    }
    if request.contains("inherited-props-report") {
        return report_misc::inherited_props(repo_path, route, &request);
    }
    if request.contains("get-locks-report") {
        return report_misc::get_locks(repo_path, route);
    }
    if request.contains("get-location-segments") {
        return report_locations::location_segments(repo_path, route, &request);
    }
    if request.contains("get-locations") {
        return report_locations::locations(repo_path, route, &request);
    }
    svn_protocol_not_implemented_response(route, "REPORT")
}

fn svn_protocol_mkactivity_response(route: &SvnProtocolRoute) -> Response {
    if path::activity_id(&route.svn_path).is_none() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    svn_protocol_status_response(StatusCode::CREATED)
}

fn svn_protocol_checkout_response(route: &SvnProtocolRoute, body: &Bytes) -> Response {
    let request = String::from_utf8_lossy(body);
    let Some(activity_href) = xml::text(&request, "href") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let Some(activity_id) = path::activity_id(&activity_href) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let Some(location) = activity::checkout_location(route, &activity_id) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let mut response = svn_protocol_status_response(StatusCode::CREATED);
    if let Ok(value) = HeaderValue::from_str(&location) {
        response.headers_mut().insert(http::header::LOCATION, value);
    }
    response
}

fn svn_protocol_merge_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    body: &Bytes,
) -> Response {
    let request = String::from_utf8_lossy(body);
    let Some(activity_href) = xml::text(&request, "href") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if path::activity_id(&activity_href).is_none() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let revision = match yona_rust_vcs::svn_youngest_revision(repo_path) {
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
    let changed_paths = match yona_rust_vcs::svn_changed_paths(repo_path, revision) {
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
    let updated_responses =
        activity::merge_updated_responses(route, revision, &merge_path, &changed_paths);
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

fn svn_protocol_put_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    body: &Bytes,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((revision, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if revision.is_some() || path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let existed = match yona_rust_vcs::svn_path_exists(repo_path, None, &path) {
        Ok(exists) => exists,
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "PUT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let contents = match write::put_contents(repo_path, &path, body) {
        Ok(contents) => contents,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "PUT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let message = format!("Update {path} through WebDAV by {}", actor.login_id);
    match yona_rust_vcs::svn_put_file(repo_path, &path, &contents, &message) {
        Ok(revision) => {
            let status = if existed {
                StatusCode::NO_CONTENT
            } else {
                StatusCode::CREATED
            };
            write::revision_response(status, revision)
        }
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) | Err(VcsError::SvnLookUnavailable) => {
            svn_protocol_not_implemented_response(route, "PUT")
        }
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

fn svn_protocol_copy_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    headers: &HeaderMap,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((source_revision, source_path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if source_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let Some(destination) = headers
        .get("destination")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| path::destination_file_lookup(route, value))
    else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let (destination_revision, destination_path) = destination;
    if destination_revision.is_some() || destination_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let message = format!(
        "Copy {source_path} to {destination_path} through WebDAV by {}",
        actor.login_id
    );
    match yona_rust_vcs::svn_copy_path(
        repo_path,
        source_revision,
        &source_path,
        &destination_path,
        &message,
    ) {
        Ok(revision) => write::revision_response(StatusCode::CREATED, revision),
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) | Err(VcsError::SvnLookUnavailable) => {
            svn_protocol_not_implemented_response(route, "COPY")
        }
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

fn svn_protocol_move_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    headers: &HeaderMap,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((source_revision, source_path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if source_revision.is_some() || source_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let Some(destination) = headers
        .get("destination")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| path::destination_file_lookup(route, value))
    else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let (destination_revision, destination_path) = destination;
    if destination_revision.is_some() || destination_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let message = format!(
        "Move {source_path} to {destination_path} through WebDAV by {}",
        actor.login_id
    );
    match yona_rust_vcs::svn_move_path(repo_path, &source_path, &destination_path, &message) {
        Ok(revision) => write::revision_response(StatusCode::CREATED, revision),
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) | Err(VcsError::SvnLookUnavailable) => {
            svn_protocol_not_implemented_response(route, "MOVE")
        }
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

fn svn_protocol_mkcol_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((revision, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if revision.is_some() || path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let message = format!("Create {path} through WebDAV by {}", actor.login_id);
    match yona_rust_vcs::svn_make_collection(repo_path, &path, &message) {
        Ok(revision) => write::revision_response(StatusCode::CREATED, revision),
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) => svn_protocol_not_implemented_response(route, "MKCOL"),
        Err(VcsError::SvnFailed(_)) | Err(VcsError::FilesystemFailed(_)) => {
            svn_protocol_status_response(StatusCode::CONFLICT)
        }
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

fn svn_protocol_proppatch_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    body: &Bytes,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((revision, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if path::working_activity_id(&route.svn_path).is_some() && path.trim().is_empty() {
        let mut response = (
            StatusCode::MULTI_STATUS,
            report_items::proppatch_multistatus(&href::resource(route, "", false), &[]),
        )
            .into_response();
        add_svn_dav_headers(&mut response);
        response.headers_mut().insert(
            http::header::CONTENT_TYPE,
            HeaderValue::from_static("application/xml; charset=utf-8"),
        );
        return response;
    }
    if revision.is_some() || path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let request = String::from_utf8_lossy(body);
    let patches = match xml::property_patches(&request) {
        Some(patches) if !patches.is_empty() => patches,
        _ => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
    };
    let message = format!(
        "Update properties on {path} through WebDAV by {}",
        actor.login_id
    );
    match yona_rust_vcs::svn_patch_properties(repo_path, &path, &patches, &message) {
        Ok(revision) => {
            let mut response = (
                StatusCode::MULTI_STATUS,
                report_items::proppatch_multistatus(&href::resource(route, &path, false), &patches),
            )
                .into_response();
            add_svn_dav_headers(&mut response);
            response.headers_mut().insert(
                http::header::CONTENT_TYPE,
                HeaderValue::from_static("application/xml; charset=utf-8"),
            );
            write::insert_revision_header(&mut response, revision);
            response
        }
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) => svn_protocol_not_implemented_response(route, "PROPPATCH"),
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

fn svn_protocol_delete_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((revision, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if revision.is_some() || path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let message = format!("Delete {path} through WebDAV by {}", actor.login_id);
    match yona_rust_vcs::svn_delete_path(repo_path, &path, &message) {
        Ok(revision) => write::revision_response(StatusCode::NO_CONTENT, revision),
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) => svn_protocol_not_implemented_response(route, "DELETE"),
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

fn svn_protocol_lock_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    body: &Bytes,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((_, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let request = String::from_utf8_lossy(body);
    let comment = xml::text(&request, "comment")
        .or_else(|| xml::text(&request, "owner"))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "Yona WebDAV lock".to_string());
    let token = lock::new_token();
    let lock =
        match yona_rust_vcs::svn_lock_path(repo_path, &path, &actor.login_id, &comment, &token) {
            Ok(lock) => lock,
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::InvalidPath) => {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            }
            Err(VcsError::SvnAdminUnavailable) | Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "LOCK");
            }
            Err(VcsError::SvnAdminFailed(_)) => {
                return svn_protocol_status_response(
                    StatusCode::from_u16(423).expect("valid WebDAV Locked status"),
                );
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
    let body = lock::discovery_body(&href::project(route), &lock);
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    if let Ok(value) = HeaderValue::from_str(&format!("<{}>", lock.token)) {
        response.headers_mut().insert("lock-token", value);
    }
    response
}

fn svn_protocol_unlock_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    principal: Option<&persistence::AppUserRecord>,
    headers: &HeaderMap,
) -> Response {
    let Some(actor) = principal else {
        return smart_http_basic_challenge_response();
    };
    let Some((_, path)) = path::file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let Some(token) = lock::token_header(headers) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    match yona_rust_vcs::svn_unlock_path(repo_path, &path, &actor.login_id, &token) {
        Ok(()) => svn_protocol_status_response(StatusCode::NO_CONTENT),
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnAdminUnavailable) => {
            svn_protocol_not_implemented_response(route, "UNLOCK")
        }
        Err(VcsError::SvnAdminFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
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
