use axum::body::Bytes;
use axum::extract::Request;
use axum::response::{IntoResponse, Response};
use base64::{engine::general_purpose, Engine as _};
use http::{HeaderMap, HeaderValue, StatusCode};
use http_body_util::BodyExt;
use md5::{Digest, Md5};
use std::path::Path as StdPath;

use crate::session::SessionManager;
use crate::{
    base_path_href, internal_error, persistence, smart_http_authorization,
    smart_http_basic_challenge_response, smart_http_principal_from_headers, yona_data_root,
    PilotBackend, RestRouteError, SmartHttpAccessFailure, SmartHttpPermission,
};
use yona_rust_vcs::VcsError;

mod date;
mod lock;
mod svndiff;
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
        return svn_protocol_options_response(
            &repo_path,
            &route,
            youngest_revision,
            repository_uuid,
        );
    }
    if method == "PROPFIND" && route.svn_path.is_empty() {
        let body_bytes = match body.collect().await {
            Ok(collected) => collected.to_bytes(),
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
        let request = String::from_utf8_lossy(&body_bytes);
        let youngest_revision = svn_protocol_label_revision(&parts.headers)
            .or_else(|| yona_rust_vcs::svn_youngest_revision(&repo_path).ok());
        let repository_uuid = yona_rust_vcs::svn_repository_uuid(&repo_path).ok();
        return svn_protocol_root_propfind_response(
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
        let youngest_revision = svn_protocol_label_revision(&parts.headers)
            .or_else(|| yona_rust_vcs::svn_youngest_revision(&repo_path).ok());
        let repository_uuid = yona_rust_vcs::svn_repository_uuid(&repo_path).ok();
        return svn_protocol_collection_propfind_response(
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
        return svn_protocol_baseline_propfind_response(&repo_path, &route, &request);
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
        let propfind_route = svn_protocol_labeled_route(&route, &parts.headers);
        if let Some(response) = svn_protocol_tree_propfind_response(
            &repo_path,
            &propfind_route,
            include_children,
            recursive_children,
            &request,
        ) {
            return response;
        }
        return svn_protocol_file_propfind_response(&repo_path, &propfind_route, &request);
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
        if svn_protocol_activity_id(&route.svn_path).is_some() {
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

fn svn_protocol_options_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    youngest_revision: Option<i64>,
    repository_uuid: Option<String>,
) -> Response {
    let activity_collection = format!("{}/!svn/act/", svn_protocol_project_href(route));
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
        .insert("dav", HeaderValue::from_static("1,2"));
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
    if svn_protocol_options_targets_file(repo_path, route) {
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

fn svn_protocol_options_targets_file(repo_path: &StdPath, route: &SvnProtocolRoute) -> bool {
    let path = route.svn_path.trim_matches('/');
    if path.is_empty() || path.starts_with("!svn/") {
        return false;
    }
    yona_rust_vcs::svn_cat_file(repo_path, None, path).is_ok()
}

fn svn_protocol_root_propfind_response(
    route: &SvnProtocolRoute,
    repo_path: &StdPath,
    youngest_revision: Option<i64>,
    repository_uuid: Option<String>,
    request: &str,
) -> Response {
    let href = svn_protocol_project_href(route);
    let checked_in_href = youngest_revision
        .map(|revision| format!("{}/!svn/bln/{revision}", svn_protocol_project_href(route)));
    let vcc_href = format!("{}/!svn/vcc/default", svn_protocol_project_href(route));
    let activity_collection_href = format!("{href}/!svn/act/");
    svn_protocol_propfind_collection_response(
        &href,
        youngest_revision,
        repository_uuid,
        checked_in_href.as_deref(),
        Some(&vcc_href),
        Some(&activity_collection_href),
        svn_protocol_revision_provenance(repo_path, route, youngest_revision, request).as_ref(),
        request,
    )
}

fn svn_protocol_collection_propfind_response(
    route: &SvnProtocolRoute,
    repo_path: &StdPath,
    youngest_revision: Option<i64>,
    repository_uuid: Option<String>,
    request: &str,
) -> Response {
    let href = format!("{}/{}", svn_protocol_project_href(route), route.svn_path);
    let checked_in_href = if route.svn_path == "!svn/vcc/default" {
        youngest_revision
            .map(|revision| format!("{}/!svn/bln/{revision}", svn_protocol_project_href(route)))
    } else {
        None
    };
    let activity_collection_href = (route.svn_path == "!svn/vcc/default")
        .then(|| format!("{}/!svn/act/", svn_protocol_project_href(route)));
    svn_protocol_propfind_collection_response(
        &href,
        youngest_revision,
        repository_uuid,
        checked_in_href.as_deref(),
        None,
        activity_collection_href.as_deref(),
        svn_protocol_revision_provenance(repo_path, route, youngest_revision, request).as_ref(),
        request,
    )
}

struct SvnProtocolRevisionProvenance {
    creationdate: String,
    creator_displayname: String,
    getlastmodified: String,
}

fn svn_protocol_revision_provenance(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    revision: Option<i64>,
    request: &str,
) -> Option<SvnProtocolRevisionProvenance> {
    let revision = revision?;
    if !(svn_protocol_propfind_is_propname(request)
        || svn_protocol_propfind_wants(request, "creationdate")
        || svn_protocol_propfind_wants(request, "creator-displayname")
        || svn_protocol_propfind_wants(request, "getlastmodified"))
    {
        return None;
    }
    match yona_rust_vcs::svn_log_entries(repo_path, revision, revision, 1) {
        Ok(mut entries) => entries.pop().map(|entry| SvnProtocolRevisionProvenance {
            creationdate: date::committed_date(&entry.date),
            creator_displayname: entry.author,
            getlastmodified: date::http_date(&entry.date),
        }),
        Err(VcsError::NotFound) | Err(VcsError::InvalidPath) => None,
        Err(VcsError::SvnLookUnavailable) => None,
        Err(error) => {
            tracing::warn!(?error, route = ?route.svn_path, "failed to read SVN revision provenance for PROPFIND");
            None
        }
    }
}

fn svn_protocol_propfind_collection_response(
    href: &str,
    youngest_revision: Option<i64>,
    repository_uuid: Option<String>,
    checked_in_href: Option<&str>,
    vcc_href: Option<&str>,
    activity_collection_href: Option<&str>,
    provenance: Option<&SvnProtocolRevisionProvenance>,
    request: &str,
) -> Response {
    let baseline_collection_href = checked_in_href.map(|href| {
        let href = href.replace("/!svn/bln/", "/!svn/bc/");
        if href.ends_with('/') {
            href
        } else {
            format!("{href}/")
        }
    });
    if svn_protocol_propfind_is_propname(request) {
        let displayname = "        <D:displayname/>\n";
        let supportedlock = "        <D:supportedlock/>\n";
        let version_name = youngest_revision
            .is_some()
            .then_some("        <D:version-name/>\n")
            .unwrap_or_default();
        let repository_uuid = repository_uuid
            .is_some()
            .then_some("        <S:repository-uuid/>\n")
            .unwrap_or_default();
        let checked_in = checked_in_href
            .is_some()
            .then_some("        <D:checked-in/>\n")
            .unwrap_or_default();
        let version_controlled_configuration = vcc_href
            .is_some()
            .then_some("        <D:version-controlled-configuration/>\n")
            .unwrap_or_default();
        let baseline_collection = baseline_collection_href
            .is_some()
            .then_some("        <D:baseline-collection/>\n")
            .unwrap_or_default();
        let baseline_relative_path = vcc_href
            .is_some()
            .then_some("        <S:baseline-relative-path/>\n")
            .unwrap_or_default();
        let activity_collection_set = activity_collection_href
            .is_some()
            .then_some("        <D:activity-collection-set/>\n")
            .unwrap_or_default();
        let creationdate = provenance
            .is_some()
            .then_some("        <D:creationdate/>\n")
            .unwrap_or_default();
        let creator_displayname = provenance
            .is_some()
            .then_some("        <D:creator-displayname/>\n")
            .unwrap_or_default();
        let getlastmodified = provenance
            .is_some()
            .then_some("        <D:getlastmodified/>\n")
            .unwrap_or_default();
        let supported_report_set = "        <D:supported-report-set/>\n";
        let body = format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:S="http://subversion.tigris.org/xmlns/dav/">
  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype/>
{displayname}{supportedlock}{version_name}{repository_uuid}{checked_in}{version_controlled_configuration}{baseline_collection}{baseline_relative_path}{activity_collection_set}{creationdate}{creator_displayname}{getlastmodified}{supported_report_set}      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>"#,
            xml_escape(href)
        );
        let mut response = (StatusCode::MULTI_STATUS, body).into_response();
        add_svn_dav_headers(&mut response);
        response.headers_mut().insert(
            http::header::CONTENT_TYPE,
            HeaderValue::from_static("application/xml; charset=utf-8"),
        );
        return response;
    }
    let version_name = (svn_protocol_propfind_wants(request, "version-name")
        || svn_protocol_propfind_wants(request, "allprop"))
    .then_some(youngest_revision)
    .flatten()
    .map(|revision| format!("        <D:version-name>{revision}</D:version-name>\n"))
    .unwrap_or_default();
    let repository_uuid = (svn_protocol_propfind_wants(request, "repository-uuid")
        || svn_protocol_propfind_wants(request, "allprop"))
    .then_some(repository_uuid)
    .flatten()
    .map(|uuid| {
        format!(
            "        <S:repository-uuid>{}</S:repository-uuid>\n",
            xml_escape(&uuid)
        )
    })
    .unwrap_or_default();
    let checked_in = (svn_protocol_propfind_wants(request, "checked-in")
        || svn_protocol_propfind_wants(request, "allprop"))
    .then_some(checked_in_href)
    .flatten()
    .map(|href| {
        format!(
            "        <D:checked-in><D:href>{}</D:href></D:checked-in>\n",
            xml_escape(href)
        )
    })
    .unwrap_or_default();
    let version_controlled_configuration = (svn_protocol_propfind_wants(
        request,
        "version-controlled-configuration",
    ) || svn_protocol_propfind_wants(request, "allprop"))
    .then_some(vcc_href)
    .flatten()
        .map(|href| {
            format!(
                "        <D:version-controlled-configuration><D:href>{}</D:href></D:version-controlled-configuration>\n",
                xml_escape(href)
            )
        })
        .unwrap_or_default();
    let baseline_collection = (svn_protocol_propfind_wants(request, "baseline-collection")
        || svn_protocol_propfind_wants(request, "allprop"))
    .then_some(baseline_collection_href.as_deref())
    .flatten()
    .map(|href| {
        format!(
            "        <D:baseline-collection><D:href>{}</D:href></D:baseline-collection>\n",
            xml_escape(href)
        )
    })
    .unwrap_or_default();
    let baseline_relative_path =
        if vcc_href.is_some() && svn_protocol_propfind_wants(request, "baseline-relative-path") {
            "        <S:baseline-relative-path></S:baseline-relative-path>\n"
        } else {
            ""
        };
    let activity_collection_set =
        svn_protocol_activity_collection_set_item(activity_collection_href, request);
    let creationdate = svn_protocol_propfind_wants(request, "creationdate")
        .then_some(
            provenance
                .map(|metadata| metadata.creationdate.as_str())
                .unwrap_or_default(),
        )
        .filter(|value| !value.trim().is_empty())
        .map(|value| {
            format!(
                "        <D:creationdate>{}</D:creationdate>\n",
                xml_escape(value)
            )
        })
        .unwrap_or_default();
    let creator_displayname = svn_protocol_propfind_wants(request, "creator-displayname")
        .then_some(
            provenance
                .map(|metadata| metadata.creator_displayname.as_str())
                .unwrap_or_default(),
        )
        .filter(|value| !value.trim().is_empty())
        .map(|value| {
            format!(
                "        <D:creator-displayname>{}</D:creator-displayname>\n",
                xml_escape(value)
            )
        })
        .unwrap_or_default();
    let getlastmodified = svn_protocol_propfind_wants(request, "getlastmodified")
        .then_some(
            provenance
                .map(|metadata| metadata.getlastmodified.as_str())
                .unwrap_or_default(),
        )
        .filter(|value| !value.trim().is_empty())
        .map(|value| {
            format!(
                "        <D:getlastmodified>{}</D:getlastmodified>\n",
                xml_escape(value)
            )
        })
        .unwrap_or_default();
    let resourcetype = if request.trim().is_empty()
        || svn_protocol_propfind_wants(request, "resourcetype")
        || svn_protocol_propfind_wants(request, "allprop")
    {
        "        <D:resourcetype><D:collection/></D:resourcetype>\n"
    } else {
        ""
    };
    let displayname = svn_protocol_displayname_item(href, request);
    let supportedlock = svn_protocol_supportedlock_item(request);
    let supported_report_set = svn_protocol_supported_report_set_item(request);
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:S="http://subversion.tigris.org/xmlns/dav/">
  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
{resourcetype}
{displayname}
{supportedlock}
{version_name}
{repository_uuid}
{checked_in}
{version_controlled_configuration}
{baseline_collection}
{baseline_relative_path}
{activity_collection_set}
{creationdate}
{creator_displayname}
{getlastmodified}
{supported_report_set}
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>"#,
        xml_escape(href)
    );
    let mut response = (StatusCode::MULTI_STATUS, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

fn svn_protocol_baseline_propfind_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let Some(revision) = route
        .svn_path
        .strip_prefix("!svn/bln/")
        .and_then(|value| value.trim_matches('/').parse::<i64>().ok())
    else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if revision < 0 {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    match yona_rust_vcs::svn_youngest_revision(repo_path) {
        Ok(youngest) if revision <= youngest => {}
        Ok(_) | Err(VcsError::NotFound) => {
            return svn_protocol_status_response(StatusCode::NOT_FOUND);
        }
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "PROPFIND");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    }
    let href = format!("{}/!svn/bln/{revision}", svn_protocol_project_href(route));
    let baseline_collection = format!("{}/!svn/bc/{revision}", svn_protocol_project_href(route));
    let wants_creation_metadata = svn_protocol_propfind_is_propname(request)
        || svn_protocol_propfind_wants(request, "creationdate")
        || svn_protocol_propfind_wants(request, "creator-displayname")
        || svn_protocol_propfind_wants(request, "getlastmodified");
    let repository_uuid = if svn_protocol_propfind_is_propname(request)
        || svn_protocol_propfind_wants(request, "repository-uuid")
    {
        match yona_rust_vcs::svn_repository_uuid(repo_path) {
            Ok(uuid) => Some(uuid),
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "PROPFIND");
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        }
    } else {
        None
    };
    let log_entry = if wants_creation_metadata {
        match yona_rust_vcs::svn_log_entries(repo_path, revision, revision, 1) {
            Ok(mut entries) => entries.pop(),
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::InvalidPath) => {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            }
            Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "PROPFIND");
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        }
    } else {
        None
    };
    let prop_items = if svn_protocol_propfind_is_propname(request) {
        "        <D:resourcetype/>\n        <D:displayname/>\n        <D:supportedlock/>\n        <D:version-name/>\n        <D:baseline-collection/>\n        <D:creationdate/>\n        <D:creator-displayname/>\n        <D:getlastmodified/>\n        <D:supported-report-set/>\n        <S:repository-uuid/>\n".to_string()
    } else {
        let resourcetype = svn_protocol_propfind_wants(request, "resourcetype")
            .then_some("        <D:resourcetype><D:baseline/></D:resourcetype>\n")
            .unwrap_or_default();
        let displayname = svn_protocol_displayname_item(&href, request);
        let supportedlock = svn_protocol_supportedlock_item(request);
        let version_name = svn_protocol_propfind_wants(request, "version-name")
            .then_some(format!(
                "        <D:version-name>{revision}</D:version-name>\n"
            ))
            .unwrap_or_default();
        let baseline_collection_item = svn_protocol_propfind_wants(request, "baseline-collection")
            .then_some(format!(
                "        <D:baseline-collection><D:href>{}</D:href></D:baseline-collection>\n",
                xml_escape(&baseline_collection)
            ))
            .unwrap_or_default();
        let creationdate = svn_protocol_propfind_wants(request, "creationdate")
            .then_some(
                log_entry
                    .as_ref()
                    .map(|entry| date::committed_date(&entry.date))
                    .unwrap_or_default(),
            )
            .filter(|date| !date.trim().is_empty())
            .map(|date| {
                format!(
                    "        <D:creationdate>{}</D:creationdate>\n",
                    xml_escape(&date)
                )
            })
            .unwrap_or_default();
        let creator_displayname = svn_protocol_propfind_wants(request, "creator-displayname")
            .then_some(
                log_entry
                    .as_ref()
                    .map(|entry| entry.author.as_str())
                    .unwrap_or_default(),
            )
            .filter(|author| !author.trim().is_empty())
            .map(|author| {
                format!(
                    "        <D:creator-displayname>{}</D:creator-displayname>\n",
                    xml_escape(author)
                )
            })
            .unwrap_or_default();
        let getlastmodified = svn_protocol_propfind_wants(request, "getlastmodified")
            .then_some(
                log_entry
                    .as_ref()
                    .map(|entry| date::http_date(&entry.date))
                    .unwrap_or_default(),
            )
            .filter(|date| !date.trim().is_empty())
            .map(|date| {
                format!(
                    "        <D:getlastmodified>{}</D:getlastmodified>\n",
                    xml_escape(&date)
                )
            })
            .unwrap_or_default();
        let repository_uuid = svn_protocol_propfind_wants(request, "repository-uuid")
            .then_some(repository_uuid.as_deref())
            .flatten()
            .map(|uuid| {
                format!(
                    "        <S:repository-uuid>{}</S:repository-uuid>\n",
                    xml_escape(uuid)
                )
            })
            .unwrap_or_default();
        let supported_report_set = svn_protocol_supported_report_set_item(request);
        format!(
            "{resourcetype}{displayname}{supportedlock}{version_name}{baseline_collection_item}{creationdate}{creator_displayname}{getlastmodified}{repository_uuid}{supported_report_set}"
        )
    };
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:S="http://subversion.tigris.org/xmlns/dav/">
  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
{prop_items}
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>"#,
        xml_escape(&href)
    );
    let mut response = (StatusCode::MULTI_STATUS, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

fn svn_protocol_file_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    head_only: bool,
) -> Response {
    let Some((revision, path)) = svn_protocol_file_lookup_for_route(route) else {
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

fn svn_protocol_file_propfind_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let Some((revision, path)) = svn_protocol_file_lookup_for_route(route) else {
        return svn_protocol_not_implemented_response(route, "PROPFIND");
    };
    let bytes = match yona_rust_vcs::svn_cat_file(repo_path, revision, &path) {
        Ok(bytes) => bytes,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "PROPFIND");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let href = format!(
        "{}/{}",
        svn_protocol_project_href(route),
        route.svn_path.trim_matches('/')
    );
    let version_revision = match revision {
        Some(revision) => Some(revision),
        None => match yona_rust_vcs::svn_youngest_revision(repo_path) {
            Ok(revision) => Some(revision),
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::SvnLookUnavailable) => None,
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        },
    };
    let version_href = version_revision.map(|revision| {
        format!(
            "{}/!svn/ver/{}/{}",
            svn_protocol_project_href(route),
            revision,
            path.trim_matches('/')
        )
    });
    let properties = match yona_rust_vcs::svn_properties(repo_path, version_revision, &path) {
        Ok(properties) => properties,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "PROPFIND");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let lock = if revision.is_none() {
        match yona_rust_vcs::svn_lock(repo_path, &path) {
            Ok(lock) => lock,
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::InvalidPath) => {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            }
            Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "PROPFIND");
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        }
    } else {
        None
    };
    let provenance = version_revision.and_then(|revision| {
        svn_protocol_revision_provenance(repo_path, route, Some(revision), request)
    });
    svn_protocol_propfind_file_response(
        route,
        &href,
        bytes.len(),
        version_revision,
        version_href,
        &path,
        &properties,
        lock.as_ref().map(|lock| (route, lock)),
        yona_rust_vcs::svn_repository_uuid(repo_path)
            .ok()
            .as_deref(),
        provenance.as_ref(),
        request,
    )
}

fn svn_protocol_tree_propfind_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    include_children: bool,
    recursive_children: bool,
    request: &str,
) -> Option<Response> {
    let (revision, path) = svn_protocol_file_lookup_for_route(route)?;
    let tree_result = if recursive_children {
        yona_rust_vcs::svn_list_tree_recursive(repo_path, revision, &path)
    } else {
        yona_rust_vcs::svn_list_tree(repo_path, revision, &path)
    };
    let tree = match tree_result {
        Ok(tree) => tree,
        Err(VcsError::NotFound) => return None,
        Err(VcsError::InvalidPath) => {
            return Some(svn_protocol_status_response(StatusCode::BAD_REQUEST));
        }
        Err(VcsError::SvnLookUnavailable) => {
            return Some(svn_protocol_not_implemented_response(route, "PROPFIND"));
        }
        Err(error) => {
            return Some(RestRouteError::from_connect_error(internal_error(error)).into_response());
        }
    };
    let version_revision = match revision {
        Some(revision) => Some(revision),
        None => match yona_rust_vcs::svn_youngest_revision(repo_path) {
            Ok(revision) => Some(revision),
            Err(VcsError::NotFound) => {
                return Some(svn_protocol_status_response(StatusCode::NOT_FOUND));
            }
            Err(VcsError::SvnLookUnavailable) => None,
            Err(error) => {
                return Some(
                    RestRouteError::from_connect_error(internal_error(error)).into_response(),
                );
            }
        },
    };
    let provenance = version_revision.and_then(|revision| {
        svn_protocol_revision_provenance(repo_path, route, Some(revision), request)
    });
    Some(svn_protocol_propfind_tree_response(
        route,
        &tree,
        version_revision,
        include_children,
        yona_rust_vcs::svn_repository_uuid(repo_path)
            .ok()
            .as_deref(),
        provenance.as_ref(),
        request,
    ))
}

fn svn_protocol_propfind_tree_response(
    route: &SvnProtocolRoute,
    tree: &yona_rust_vcs::SvnTree,
    version_revision: Option<i64>,
    include_children: bool,
    repository_uuid: Option<&str>,
    provenance: Option<&SvnProtocolRevisionProvenance>,
    request: &str,
) -> Response {
    let mut responses = String::new();
    let collection_href = svn_protocol_propfind_tree_href(route, &tree.path, true);
    responses.push_str(&svn_protocol_propfind_collection_item(
        route,
        &collection_href,
        &tree.path,
        version_revision,
        repository_uuid,
        provenance,
        request,
    ));
    if let Some(alias_href) = collection_href.strip_suffix('/') {
        responses.push_str(&svn_protocol_propfind_collection_item(
            route,
            alias_href,
            &tree.path,
            version_revision,
            repository_uuid,
            provenance,
            request,
        ));
    }
    if include_children {
        for entry in &tree.entries {
            let href = svn_protocol_propfind_tree_href(route, &entry.path, entry.is_dir);
            if entry.is_dir {
                responses.push_str(&svn_protocol_propfind_collection_item(
                    route,
                    &href,
                    &entry.path,
                    version_revision,
                    repository_uuid,
                    provenance,
                    request,
                ));
            } else {
                let version_href = version_revision.map(|revision| {
                    format!(
                        "{}/!svn/ver/{}/{}",
                        svn_protocol_project_href(route),
                        revision,
                        entry.path.trim_matches('/')
                    )
                });
                responses.push_str(&svn_protocol_propfind_file_item(
                    route,
                    &href,
                    None,
                    version_revision,
                    version_href.as_deref(),
                    Some(&entry.path),
                    &[],
                    None,
                    repository_uuid,
                    provenance,
                    request,
                ));
            }
        }
    }
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:S="http://subversion.tigris.org/xmlns/dav/" xmlns:SD="http://subversion.tigris.org/xmlns/dav/">
{responses}</D:multistatus>"#
    );
    let mut response = (StatusCode::MULTI_STATUS, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

fn svn_protocol_propfind_file_response(
    route: &SvnProtocolRoute,
    href: &str,
    content_length: usize,
    version_revision: Option<i64>,
    version_href: Option<String>,
    baseline_relative_path: &str,
    properties: &[yona_rust_vcs::SvnProperty],
    lock: Option<(&SvnProtocolRoute, &yona_rust_vcs::SvnLock)>,
    repository_uuid: Option<&str>,
    provenance: Option<&SvnProtocolRevisionProvenance>,
    request: &str,
) -> Response {
    let item = svn_protocol_propfind_file_item(
        route,
        href,
        Some(content_length),
        version_revision,
        version_href.as_deref(),
        Some(baseline_relative_path),
        properties,
        lock,
        repository_uuid,
        provenance,
        request,
    );
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:S="http://subversion.tigris.org/xmlns/dav/" xmlns:SD="http://subversion.tigris.org/xmlns/dav/" xmlns:SVN="http://subversion.tigris.org/xmlns/svn/" xmlns:C="http://subversion.tigris.org/xmlns/custom/">
{item}
</D:multistatus>"#,
    );
    let mut response = (StatusCode::MULTI_STATUS, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

fn svn_protocol_propfind_collection_item(
    route: &SvnProtocolRoute,
    href: &str,
    path: &str,
    version_revision: Option<i64>,
    repository_uuid: Option<&str>,
    provenance: Option<&SvnProtocolRevisionProvenance>,
    request: &str,
) -> String {
    if svn_protocol_propfind_is_propname(request) {
        let displayname = "        <D:displayname/>\n";
        let supportedlock = "        <D:supportedlock/>\n";
        let version_name = version_revision
            .is_some()
            .then_some("        <D:version-name/>\n")
            .unwrap_or_default();
        let checked_in = version_revision
            .is_some()
            .then_some("        <D:checked-in/>\n")
            .unwrap_or_default();
        let baseline_collection = version_revision
            .is_some()
            .then_some("        <D:baseline-collection/>\n")
            .unwrap_or_default();
        let repository_uuid = repository_uuid
            .is_some()
            .then_some("        <S:repository-uuid/>\n")
            .unwrap_or_default();
        let baseline_relative_path = (!path.trim_matches('/').is_empty())
            .then_some("        <S:baseline-relative-path/>\n")
            .unwrap_or_default();
        let creationdate = provenance
            .is_some()
            .then_some("        <D:creationdate/>\n")
            .unwrap_or_default();
        let creator_displayname = provenance
            .is_some()
            .then_some("        <D:creator-displayname/>\n")
            .unwrap_or_default();
        let getlastmodified = provenance
            .is_some()
            .then_some("        <D:getlastmodified/>\n")
            .unwrap_or_default();
        let supported_report_set = "        <D:supported-report-set/>\n";
        return format!(
            r#"  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype/>
{displayname}{supportedlock}{version_name}{checked_in}{baseline_collection}{repository_uuid}        <D:version-controlled-configuration/>
{baseline_relative_path}{creationdate}{creator_displayname}{getlastmodified}{supported_report_set}      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
"#,
            xml_escape(href)
        );
    }
    let checked_in = version_revision
        .filter(|_| {
            svn_protocol_propfind_wants(request, "checked-in")
                || svn_protocol_propfind_wants(request, "version-controlled-configuration")
        })
        .map(|revision| {
            format!(
                "        <D:checked-in><D:href>{}</D:href></D:checked-in>\n",
                xml_escape(&svn_protocol_version_href(route, revision, path))
            )
        })
        .unwrap_or_default();
    let baseline_collection = version_revision
        .filter(|_| {
            svn_protocol_propfind_wants(request, "baseline-collection")
                || svn_protocol_propfind_wants(request, "version-controlled-configuration")
        })
        .map(|revision| {
            format!(
                "        <D:baseline-collection><D:href>{}</D:href></D:baseline-collection>\n",
                xml_escape(&svn_protocol_baseline_collection_href(route, revision, ""))
            )
        })
        .unwrap_or_default();
    let version_name = version_revision
        .filter(|_| {
            svn_protocol_propfind_wants(request, "version-name")
                || svn_protocol_propfind_wants(request, "version-controlled-configuration")
        })
        .map(|revision| format!("        <D:version-name>{revision}</D:version-name>\n"))
        .unwrap_or_default();
    let vcc_href = format!("{}/!svn/vcc/default", svn_protocol_project_href(route));
    let repository_uuid = repository_uuid
        .filter(|_| svn_protocol_propfind_wants(request, "repository-uuid"))
        .map(|uuid| {
            format!(
                "        <S:repository-uuid>{}</S:repository-uuid>\n",
                xml_escape(uuid)
            )
        })
        .unwrap_or_default();
    let baseline_relative_path = path.trim_matches('/');
    let baseline_relative_path = if baseline_relative_path.is_empty() {
        String::new()
    } else {
        format!(
            "        <S:baseline-relative-path>{}</S:baseline-relative-path>\n",
            xml_escape(baseline_relative_path)
        )
    };
    let baseline_relative_path = if svn_protocol_propfind_wants(request, "baseline-relative-path") {
        baseline_relative_path
    } else {
        String::new()
    };
    let resourcetype = if svn_protocol_propfind_wants(request, "resourcetype") {
        "        <D:resourcetype><D:collection/></D:resourcetype>\n"
    } else {
        ""
    };
    let displayname = svn_protocol_displayname_item(href, request);
    let supportedlock = svn_protocol_supportedlock_item(request);
    let supported_report_set = svn_protocol_supported_report_set_item(request);
    let version_controlled_configuration = if svn_protocol_propfind_wants(
        request,
        "version-controlled-configuration",
    ) {
        format!(
            "        <D:version-controlled-configuration><D:href>{}</D:href></D:version-controlled-configuration>\n",
            xml_escape(&vcc_href)
        )
    } else {
        String::new()
    };
    let creationdate = svn_protocol_propfind_wants(request, "creationdate")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:creationdate>{}</D:creationdate>\n",
                xml_escape(&metadata.creationdate)
            )
        })
        .unwrap_or_default();
    let creator_displayname = svn_protocol_propfind_wants(request, "creator-displayname")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:creator-displayname>{}</D:creator-displayname>\n",
                xml_escape(&metadata.creator_displayname)
            )
        })
        .unwrap_or_default();
    let getlastmodified = svn_protocol_propfind_wants(request, "getlastmodified")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:getlastmodified>{}</D:getlastmodified>\n",
                xml_escape(&metadata.getlastmodified)
            )
        })
        .unwrap_or_default();
    format!(
        r#"  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
{resourcetype}{displayname}{supportedlock}{version_name}{checked_in}{baseline_collection}{repository_uuid}{version_controlled_configuration}{baseline_relative_path}{creationdate}{creator_displayname}{getlastmodified}{supported_report_set}
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
"#,
        xml_escape(href)
    )
}

fn svn_protocol_propfind_file_item(
    route: &SvnProtocolRoute,
    href: &str,
    content_length: Option<usize>,
    version_revision: Option<i64>,
    version_href: Option<&str>,
    baseline_relative_path: Option<&str>,
    properties: &[yona_rust_vcs::SvnProperty],
    lock: Option<(&SvnProtocolRoute, &yona_rust_vcs::SvnLock)>,
    repository_uuid: Option<&str>,
    provenance: Option<&SvnProtocolRevisionProvenance>,
    request: &str,
) -> String {
    if svn_protocol_propfind_is_propname(request) {
        let content_length = content_length
            .is_some()
            .then_some("        <D:getcontentlength/>\n")
            .unwrap_or_default();
        let displayname = "        <D:displayname/>\n";
        let supportedlock = "        <D:supportedlock/>\n";
        let content_type = "        <D:getcontenttype/>\n";
        let etag = svn_protocol_file_etag(version_revision, baseline_relative_path)
            .is_some()
            .then_some("        <D:getetag/>\n")
            .unwrap_or_default();
        let version_name = version_revision
            .is_some()
            .then_some("        <D:version-name/>\n")
            .unwrap_or_default();
        let checked_in = version_href
            .is_some()
            .then_some("        <D:checked-in/>\n")
            .unwrap_or_default();
        let baseline_collection = version_revision
            .is_some()
            .then_some("        <D:baseline-collection/>\n")
            .unwrap_or_default();
        let baseline_relative_path = baseline_relative_path
            .is_some()
            .then_some("        <S:baseline-relative-path/>\n")
            .unwrap_or_default();
        let repository_uuid = repository_uuid
            .is_some()
            .then_some("        <S:repository-uuid/>\n")
            .unwrap_or_default();
        let creationdate = provenance
            .is_some()
            .then_some("        <D:creationdate/>\n")
            .unwrap_or_default();
        let creator_displayname = provenance
            .is_some()
            .then_some("        <D:creator-displayname/>\n")
            .unwrap_or_default();
        let getlastmodified = provenance
            .is_some()
            .then_some("        <D:getlastmodified/>\n")
            .unwrap_or_default();
        let supported_report_set = "        <D:supported-report-set/>\n";
        let property_items = svn_protocol_property_name_items(properties);
        return format!(
            r#"  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype/>
{displayname}{supportedlock}{content_length}{content_type}{etag}{version_name}{checked_in}{baseline_collection}{baseline_relative_path}{repository_uuid}{creationdate}{creator_displayname}{getlastmodified}{supported_report_set}        <D:version-controlled-configuration/>
{property_items}      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
"#,
            xml_escape(href)
        );
    }
    let resourcetype = svn_protocol_propfind_wants(request, "resourcetype")
        .then_some("        <D:resourcetype/>\n")
        .unwrap_or_default();
    let displayname = svn_protocol_displayname_item(href, request);
    let supportedlock = svn_protocol_supportedlock_item(request);
    let content_length = svn_protocol_propfind_wants(request, "getcontentlength")
        .then_some(content_length)
        .flatten()
        .map(|length| format!("        <D:getcontentlength>{length}</D:getcontentlength>\n"))
        .unwrap_or_default();
    let content_type = svn_protocol_propfind_wants(request, "getcontenttype")
        .then_some("        <D:getcontenttype>application/octet-stream</D:getcontenttype>\n")
        .unwrap_or_default();
    let etag = svn_protocol_propfind_wants(request, "getetag")
        .then(|| svn_protocol_file_etag(version_revision, baseline_relative_path))
        .flatten()
        .map(|etag| format!("        <D:getetag>{}</D:getetag>\n", xml_escape(&etag)))
        .unwrap_or_default();
    let wants_vcc = svn_protocol_propfind_wants(request, "version-controlled-configuration");
    let version_name = (svn_protocol_propfind_wants(request, "version-name") || wants_vcc)
        .then_some(version_revision)
        .flatten()
        .map(|revision| format!("        <D:version-name>{revision}</D:version-name>\n"))
        .unwrap_or_default();
    let checked_in = (svn_protocol_propfind_wants(request, "checked-in") || wants_vcc)
        .then_some(version_href)
        .flatten()
        .map(|href| {
            format!(
                "        <D:checked-in><D:href>{}</D:href></D:checked-in>\n",
                xml_escape(href)
            )
        })
        .unwrap_or_default();
    let baseline_collection = (svn_protocol_propfind_wants(request, "baseline-collection")
        || wants_vcc)
        .then_some(version_revision)
        .flatten()
        .map(|revision| {
            format!(
                "        <D:baseline-collection><D:href>{}</D:href></D:baseline-collection>\n",
                xml_escape(&svn_protocol_baseline_collection_href(route, revision, ""))
            )
        })
        .unwrap_or_default();
    let baseline_relative_path = svn_protocol_propfind_wants(request, "baseline-relative-path")
        .then_some(baseline_relative_path)
        .flatten()
        .map(|path| {
            format!(
                "        <S:baseline-relative-path>{}</S:baseline-relative-path>\n",
                xml_escape(path.trim_matches('/'))
            )
        })
        .unwrap_or_default();
    let vcc_href = format!("{}/!svn/vcc/default", svn_protocol_project_href(route));
    let repository_uuid = svn_protocol_propfind_wants(request, "repository-uuid")
        .then_some(repository_uuid)
        .flatten()
        .map(|uuid| {
            format!(
                "        <S:repository-uuid>{}</S:repository-uuid>\n",
                xml_escape(uuid)
            )
        })
        .unwrap_or_default();
    let creationdate = svn_protocol_propfind_wants(request, "creationdate")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:creationdate>{}</D:creationdate>\n",
                xml_escape(&metadata.creationdate)
            )
        })
        .unwrap_or_default();
    let creator_displayname = svn_protocol_propfind_wants(request, "creator-displayname")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:creator-displayname>{}</D:creator-displayname>\n",
                xml_escape(&metadata.creator_displayname)
            )
        })
        .unwrap_or_default();
    let getlastmodified = svn_protocol_propfind_wants(request, "getlastmodified")
        .then_some(provenance)
        .flatten()
        .map(|metadata| {
            format!(
                "        <D:getlastmodified>{}</D:getlastmodified>\n",
                xml_escape(&metadata.getlastmodified)
            )
        })
        .unwrap_or_default();
    let version_controlled_configuration = if wants_vcc {
        format!(
            "        <D:version-controlled-configuration><D:href>{}</D:href></D:version-controlled-configuration>\n",
            xml_escape(&vcc_href)
        )
    } else {
        String::new()
    };
    let property_items = svn_protocol_property_items_for_request(properties, request);
    let supported_report_set = svn_protocol_supported_report_set_item(request);
    let deadprop_count = if property_items.is_empty() {
        String::new()
    } else {
        "        <SD:deadprop-count>1</SD:deadprop-count>\n".to_string()
    };
    let lock_discovery = lock
        .map(|(route, lock)| lock::discovery_item(&svn_protocol_project_href(route), lock))
        .unwrap_or_default();
    format!(
        r#"  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
{resourcetype}{displayname}{supportedlock}{content_length}{content_type}{etag}{version_name}{checked_in}{baseline_collection}{baseline_relative_path}{repository_uuid}{creationdate}{creator_displayname}{getlastmodified}{version_controlled_configuration}{supported_report_set}
{deadprop_count}{property_items}{lock_discovery}      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
"#,
        xml_escape(href)
    )
}

fn svn_protocol_supportedlock_item(request: &str) -> String {
    if !svn_protocol_propfind_wants(request, "supportedlock") {
        return String::new();
    }
    "        <D:supportedlock>\n    <D:lockentry>\n      <D:lockscope><D:exclusive/></D:lockscope>\n      <D:locktype><D:write/></D:locktype>\n    </D:lockentry>\n  </D:supportedlock>\n".to_string()
}

fn svn_protocol_supported_report_set_item(request: &str) -> String {
    if !svn_protocol_propfind_wants(request, "supported-report-set") {
        return String::new();
    }
    let report_names = [
        "log-report",
        "dated-rev-report",
        "update-report",
        "replay-report",
        "file-revs-report",
        "mergeinfo-report",
        "get-deleted-rev-report",
        "list-report",
        "inherited-props-report",
        "get-locks-report",
        "get-location-segments-report",
        "get-locations-report",
    ];
    let reports = report_names
        .iter()
        .map(|name| {
            format!(
                r#"          <D:supported-report><D:report><S:{name}/></D:report></D:supported-report>
"#
            )
        })
        .collect::<String>();
    format!(
        r#"        <D:supported-report-set>
{reports}        </D:supported-report-set>
"#
    )
}

fn svn_protocol_activity_collection_set_item(
    activity_collection_href: Option<&str>,
    request: &str,
) -> String {
    if !svn_protocol_propfind_wants(request, "activity-collection-set") {
        return String::new();
    }
    let Some(href) = activity_collection_href else {
        return String::new();
    };
    format!(
        "        <D:activity-collection-set><D:href>{}</D:href></D:activity-collection-set>\n",
        xml_escape(href)
    )
}

fn svn_protocol_displayname_item(href: &str, request: &str) -> String {
    if !svn_protocol_propfind_wants(request, "displayname") {
        return String::new();
    }
    let displayname = href
        .trim_end_matches('/')
        .rsplit('/')
        .find(|segment| !segment.is_empty())
        .unwrap_or_default();
    if displayname.is_empty() {
        String::new()
    } else {
        format!(
            "        <D:displayname>{}</D:displayname>\n",
            xml_escape(displayname)
        )
    }
}

fn svn_protocol_file_etag(
    revision: Option<i64>,
    baseline_relative_path: Option<&str>,
) -> Option<String> {
    let revision = revision?;
    let path = baseline_relative_path?.trim_matches('/');
    (!path.is_empty()).then(|| format!("\"{revision}:{path}\""))
}

fn svn_protocol_property_items(properties: &[yona_rust_vcs::SvnProperty]) -> String {
    properties
        .iter()
        .filter_map(|property| {
            let (prefix, name) = svn_protocol_property_xml_name(&property.name)?;
            Some(format!(
                "        <{prefix}:{name}>{}</{prefix}:{name}>\n",
                xml_escape(&property.value)
            ))
        })
        .collect()
}

fn svn_protocol_property_items_for_request(
    properties: &[yona_rust_vcs::SvnProperty],
    request: &str,
) -> String {
    if svn_protocol_propfind_is_propname(request) {
        return svn_protocol_property_name_items(properties);
    }
    if svn_protocol_propfind_wants(request, "allprop") {
        return svn_protocol_property_items(properties);
    }
    properties
        .iter()
        .filter(|property| svn_protocol_propfind_wants(request, property.name.as_str()))
        .filter_map(|property| {
            let (prefix, name) = svn_protocol_property_xml_name(&property.name)?;
            Some(format!(
                "        <{prefix}:{name}>{}</{prefix}:{name}>\n",
                xml_escape(&property.value)
            ))
        })
        .collect()
}

fn svn_protocol_property_name_items(properties: &[yona_rust_vcs::SvnProperty]) -> String {
    properties
        .iter()
        .filter_map(|property| {
            let (prefix, name) = svn_protocol_property_xml_name(&property.name)?;
            Some(format!("        <{prefix}:{name}/>\n"))
        })
        .collect()
}

fn svn_protocol_property_xml_name(name: &str) -> Option<(&'static str, String)> {
    let clean = name.trim();
    if clean.is_empty() {
        return None;
    }
    if let Some(rest) = clean.strip_prefix("svn:") {
        if svn_protocol_xml_local_name(rest) {
            return Some(("SVN", rest.to_string()));
        }
        return None;
    }
    if svn_protocol_xml_local_name(clean) {
        return Some(("C", clean.to_string()));
    }
    None
}

fn svn_protocol_xml_local_name(name: &str) -> bool {
    let mut chars = name.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    if !(first.is_ascii_alphabetic() || first == '_') {
        return false;
    }
    chars.all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '_' | '-' | '.'))
}

fn svn_protocol_href(route: &SvnProtocolRoute, path: &str, collection: bool) -> String {
    let clean_path = path.trim_matches('/');
    let suffix = if clean_path.is_empty() {
        String::new()
    } else if collection {
        format!("/{clean_path}/")
    } else {
        format!("/{clean_path}")
    };
    format!("{}{}", svn_protocol_project_href(route), suffix)
}

fn svn_protocol_propfind_tree_href(
    route: &SvnProtocolRoute,
    path: &str,
    collection: bool,
) -> String {
    let trimmed = route.svn_path.trim_matches('/');
    let version_prefix = trimmed
        .strip_prefix("!svn/ver/")
        .and_then(|rest| rest.split('/').next())
        .and_then(|revision| revision.parse::<i64>().ok())
        .map(|revision| ("ver", revision));
    let baseline_prefix = trimmed
        .strip_prefix("!svn/bc/")
        .and_then(|rest| rest.split('/').next())
        .and_then(|revision| revision.parse::<i64>().ok())
        .map(|revision| ("bc", revision));
    if let Some((kind, revision)) = version_prefix.or(baseline_prefix) {
        let path = path.trim_matches('/');
        let suffix = if path.is_empty() {
            String::new()
        } else if collection {
            format!("/{path}/")
        } else {
            format!("/{path}")
        };
        return format!(
            "{}/!svn/{kind}/{revision}{suffix}",
            svn_protocol_project_href(route)
        );
    }
    if trimmed.starts_with("!svn/vcc/default/") {
        let path = path.trim_matches('/');
        let suffix = if path.is_empty() {
            String::new()
        } else if collection {
            format!("/{path}/")
        } else {
            format!("/{path}")
        };
        return format!(
            "{}/!svn/vcc/default{suffix}",
            svn_protocol_project_href(route)
        );
    }
    svn_protocol_href(route, path, collection)
}

fn svn_protocol_propfind_wants(request: &str, property_name: &str) -> bool {
    let request = request.trim();
    request.is_empty()
        || request.contains("<D:allprop")
        || request.contains("<allprop")
        || request.contains(&format!(":{property_name}"))
        || request.contains(&format!("<{property_name}"))
}

fn svn_protocol_propfind_is_propname(request: &str) -> bool {
    let request = request.trim();
    request.contains("<D:propname") || request.contains("<propname")
}

fn svn_protocol_repo_relative_request_path(
    route: &SvnProtocolRoute,
    requested_path: &str,
) -> String {
    let mut path = requested_path.trim();
    if let Some(origin) = &route.request_origin {
        if let Some(stripped) = path.strip_prefix(origin) {
            path = stripped;
        }
    }
    let project_path = base_path_href(
        &route.base_path,
        &format!("/svn/{}/{}", route.owner_name, route.project_name),
    );
    if path == project_path || path == format!("{project_path}/") {
        return String::new();
    }
    if let Some(stripped) = path.strip_prefix(&format!("{project_path}/")) {
        return stripped.trim_matches('/').to_string();
    }
    path.trim_matches('/').to_string()
}

fn svn_protocol_project_href(route: &SvnProtocolRoute) -> String {
    let path = base_path_href(
        &route.base_path,
        &format!("/svn/{}/{}", route.owner_name, route.project_name),
    );
    if let Some(origin) = &route.request_origin {
        format!("{origin}{path}")
    } else {
        path
    }
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
        return svn_protocol_log_report_response(repo_path, route, &request);
    }
    if request.contains("dated-rev-report") {
        return svn_protocol_dated_rev_report_response(repo_path, route, &request);
    }
    if request.contains("update-report") {
        return svn_protocol_update_report_response(repo_path, route, &request);
    }
    if request.contains("replay-report") {
        return svn_protocol_replay_report_response(repo_path, route, &request);
    }
    if request.contains("file-revs-report") {
        return svn_protocol_file_revs_report_response(repo_path, route, &request);
    }
    if request.contains("mergeinfo-report") {
        return svn_protocol_mergeinfo_report_response(repo_path, route, &request);
    }
    if request.contains("get-deleted-rev-report") {
        return svn_protocol_get_deleted_rev_report_response(repo_path, route, &request);
    }
    if request.contains("list-report") {
        return svn_protocol_list_report_response(repo_path, route, &request);
    }
    if request.contains("inherited-props-report") {
        return svn_protocol_inherited_props_report_response(repo_path, route, &request);
    }
    if request.contains("get-locks-report") {
        return svn_protocol_get_locks_report_response(repo_path, route);
    }
    if request.contains("get-location-segments") {
        return svn_protocol_get_location_segments_report_response(repo_path, route, &request);
    }
    if request.contains("get-locations") {
        return svn_protocol_get_locations_report_response(repo_path, route, &request);
    }
    svn_protocol_not_implemented_response(route, "REPORT")
}

fn svn_protocol_log_report_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let youngest_revision = match yona_rust_vcs::svn_youngest_revision(repo_path) {
        Ok(revision) => revision,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let start_revision = xml::i64(request, "start-revision").unwrap_or(youngest_revision);
    let end_revision = xml::i64(request, "end-revision").unwrap_or(start_revision);
    let limit = xml::i64(request, "limit")
        .and_then(|value| usize::try_from(value).ok())
        .unwrap_or(0);
    let entries =
        match yona_rust_vcs::svn_log_entries(repo_path, start_revision, end_revision, limit) {
            Ok(entries) => entries,
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::InvalidPath) => {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            }
            Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "REPORT");
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
    let include_changed_paths = request.contains("discover-changed-paths");
    let path_filter = xml::text(request, "path")
        .map(|path| path.trim_matches('/').to_string())
        .filter(|path| !path.is_empty());
    let items = entries
        .iter()
        .filter_map(|entry| {
            let changed_paths =
                if (include_changed_paths || path_filter.is_some()) && entry.revision > 0 {
                    yona_rust_vcs::svn_changed_paths(repo_path, entry.revision).unwrap_or_default()
                } else {
                    Vec::new()
                };
            if let Some(path_filter) = path_filter.as_deref() {
                if !changed_paths
                    .iter()
                    .any(|path| svn_protocol_log_path_included(&path.path, path_filter))
                {
                    return None;
                }
            }
            Some(if include_changed_paths && entry.revision > 0 {
                svn_protocol_log_item(entry, &changed_paths)
            } else {
                svn_protocol_log_item(entry, &[])
            })
        })
        .collect::<String>();
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:log-report xmlns:S="svn:" xmlns:D="DAV:">
{items}</S:log-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

fn svn_protocol_dated_rev_report_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let Some(creation_date) = xml::text(request, "creationdate") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let revision = match yona_rust_vcs::svn_revision_at_or_before(repo_path, &creation_date) {
        Ok(Some(revision)) => revision,
        Ok(None) | Err(VcsError::NotFound) => {
            return svn_protocol_status_response(StatusCode::NOT_FOUND);
        }
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:dated-rev-report xmlns:S="svn:" xmlns:D="DAV:">
  <D:version-name>{revision}</D:version-name>
</S:dated-rev-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

fn svn_protocol_update_report_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let target_revision =
        xml::i64(request, "target-revision").or_else(|| xml::i64(request, "revision"));
    let target_revision = match target_revision {
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
    let requested_path = if request.contains("<S:update-target>") {
        xml::text(request, "src-path")
    } else {
        xml::text(request, "dst-path").or_else(|| xml::text(request, "src-path"))
    }
    .map(|path| svn_protocol_repo_relative_request_path(route, &path))
    .unwrap_or_default();
    let base_path = svn_protocol_file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let update_path = join_svn_report_path(&base_path, &requested_path);
    let depth = svn_protocol_update_depth(request);
    let start_empty = svn_protocol_update_start_empty(request);
    let base_revision = svn_protocol_update_entry_revision(request).unwrap_or(target_revision);
    let inline_text_deltas = svn_protocol_update_inline_text_deltas(request);
    let recursive = depth.eq_ignore_ascii_case("infinity") || depth.eq_ignore_ascii_case("unknown");
    let tree_result = if recursive {
        yona_rust_vcs::svn_list_tree_recursive(repo_path, Some(target_revision), &update_path)
    } else {
        yona_rust_vcs::svn_list_tree(repo_path, Some(target_revision), &update_path)
    };
    let tree = match tree_result {
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
    let base_entries = if !start_empty && base_revision != target_revision {
        let base_tree_result = if recursive {
            yona_rust_vcs::svn_list_tree_recursive(repo_path, Some(base_revision), &update_path)
        } else {
            yona_rust_vcs::svn_list_tree(repo_path, Some(base_revision), &update_path)
        };
        match base_tree_result {
            Ok(tree) => tree.entries,
            Err(VcsError::NotFound) => Vec::new(),
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
        Vec::new()
    };
    let revision_log =
        match yona_rust_vcs::svn_log_entries(repo_path, target_revision, target_revision, 1) {
            Ok(mut entries) => entries.pop().unwrap_or(yona_rust_vcs::SvnLogEntry {
                revision: target_revision,
                author: String::new(),
                date: String::new(),
                message: String::new(),
            }),
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::InvalidPath) => {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            }
            Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "REPORT");
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
    let entries = if recursive {
        svn_protocol_update_entries_recursive(
            route,
            &tree.entries,
            &base_entries,
            &update_path,
            target_revision,
            base_revision,
            &revision_log,
            2,
            start_empty,
            repo_path,
            inline_text_deltas,
        )
    } else {
        let mut entries = String::new();
        let target_paths = tree
            .entries
            .iter()
            .map(|entry| entry.path.trim_matches('/').to_string())
            .collect::<std::collections::BTreeSet<_>>();
        for entry in base_entries
            .iter()
            .filter(|entry| svn_protocol_update_depth_includes(entry, &depth))
            .filter(|entry| !target_paths.contains(entry.path.trim_matches('/')))
        {
            let name = entry
                .path
                .trim_matches('/')
                .rsplit('/')
                .next()
                .unwrap_or(entry.path.as_str());
            entries.push_str(&format!(
                r#"    <S:delete-entry name="{}" rev="{base_revision}"/>
"#,
                xml_escape(name)
            ));
        }
        for entry in tree
            .entries
            .iter()
            .filter(|entry| svn_protocol_update_depth_includes(entry, &depth))
        {
            let name = entry
                .path
                .trim_matches('/')
                .rsplit('/')
                .next()
                .unwrap_or(entry.path.as_str());
            if entry.is_dir {
                let indent = "    ";
                let child_indent = "      ";
                let directory_element = if start_empty {
                    "add-directory"
                } else {
                    "open-directory"
                };
                let revision_attribute = if start_empty {
                    String::new()
                } else {
                    format!(r#" rev="{base_revision}""#)
                };
                entries.push_str(&format!(
                    r#"{indent}<S:{directory_element} name="{}"{revision_attribute} bc-url="{}">
{child_indent}<D:checked-in><D:href>{}</D:href></D:checked-in>
{}{indent}</S:{directory_element}>
"#,
                    xml_escape(name),
                    xml_escape(&svn_protocol_baseline_collection_href(
                        route,
                        target_revision,
                        entry.path.trim_matches('/')
                    )),
                    xml_escape(&svn_protocol_version_href(
                        route,
                        target_revision,
                        entry.path.trim_matches('/')
                    )),
                    svn_protocol_update_entry_props(&revision_log, 3)
                ));
            } else {
                let inline_delta = if inline_text_deltas {
                    match yona_rust_vcs::svn_cat_file(
                        repo_path,
                        Some(target_revision),
                        entry.path.trim_matches('/'),
                    ) {
                        Ok(contents) => Some(contents),
                        Err(VcsError::NotFound) => {
                            return svn_protocol_status_response(StatusCode::NOT_FOUND);
                        }
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
                    }
                } else {
                    None
                };
                entries.push_str(&svn_protocol_update_file_entry(
                    route,
                    entry,
                    target_revision,
                    base_revision,
                    &revision_log,
                    2,
                    start_empty,
                    inline_delta.as_deref(),
                ));
            }
        }
        entries
    };
    let open_directory_revision = if start_empty {
        target_revision
    } else {
        base_revision
    };
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:update-report xmlns:S="svn:" xmlns:D="DAV:"{}>
  <S:target-revision rev="{target_revision}"/>
  <S:open-directory rev="{open_directory_revision}">
    <D:checked-in><D:href>{}</D:href></D:checked-in>
{}
{entries}  </S:open-directory>
</S:update-report>"#,
        if inline_text_deltas {
            r#" send-all="true""#
        } else {
            ""
        },
        svn_protocol_version_href(route, target_revision, &update_path),
        svn_protocol_update_entry_props(&revision_log, 2)
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

fn svn_protocol_file_revs_report_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let youngest_revision = match yona_rust_vcs::svn_youngest_revision(repo_path) {
        Ok(revision) => revision,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let start_revision = xml::i64(request, "start-revision").unwrap_or(0);
    let end_revision = xml::i64(request, "end-revision").unwrap_or(youngest_revision);
    let requested_path = xml::text(request, "path").unwrap_or_default();
    let base_path = svn_protocol_file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let file_path = join_svn_report_path(&base_path, &requested_path);
    if file_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let entries = match yona_rust_vcs::svn_log_entries(repo_path, start_revision, end_revision, 0) {
        Ok(entries) => entries,
        Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => return svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnLookUnavailable) => {
            return svn_protocol_not_implemented_response(route, "REPORT");
        }
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let mut file_revs = String::new();
    for entry in entries {
        match yona_rust_vcs::svn_cat_file(repo_path, Some(entry.revision), &file_path) {
            Ok(contents) => {
                file_revs.push_str(&svn_protocol_file_rev_item(&file_path, &entry, &contents))
            }
            Err(VcsError::NotFound) => {}
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
    }
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:file-revs-report xmlns:S="svn:" xmlns:D="DAV:">
{file_revs}</S:file-revs-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

fn svn_protocol_replay_report_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let revision = match xml::i64(request, "revision")
        .or_else(|| svn_protocol_file_lookup_for_route(route).and_then(|(revision, _)| revision))
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
    let base_path = svn_protocol_file_lookup_for_route(route)
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
        .filter(|path| svn_protocol_replay_included(&path.path, filter_path.as_deref()))
        .map(|path| svn_protocol_replay_operation(path, low_water_mark))
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

fn svn_protocol_mergeinfo_report_response(
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
    let base_path = svn_protocol_file_lookup_for_route(route)
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
        let path = join_svn_report_path(&base_path, requested_path);
        let mergeinfo =
            match yona_rust_vcs::svn_property(repo_path, Some(revision), &path, "svn:mergeinfo") {
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
        items.push_str(&svn_protocol_mergeinfo_item(response_path, &mergeinfo));
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

fn svn_protocol_get_deleted_rev_report_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let Some(requested_path) = xml::text(request, "path") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let Some(peg_revision) = xml::i64(request, "peg-revision") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let end_revision = match xml::i64(request, "end-revision") {
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
    let base_path = svn_protocol_file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let path = join_svn_report_path(&base_path, &requested_path);
    let deleted_revision =
        match yona_rust_vcs::svn_deleted_revision(repo_path, &path, peg_revision, end_revision) {
            Ok(revision) => revision,
            Err(VcsError::NotFound) => return svn_protocol_status_response(StatusCode::NOT_FOUND),
            Err(VcsError::InvalidPath) => {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            }
            Err(VcsError::SvnLookUnavailable) => {
                return svn_protocol_not_implemented_response(route, "REPORT");
            }
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        };
    let version_name = deleted_revision
        .map(|revision| format!("  <D:version-name>{revision}</D:version-name>\n"))
        .unwrap_or_default();
    let body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<S:get-deleted-rev-report xmlns:S="svn:" xmlns:D="DAV:">
{version_name}</S:get-deleted-rev-report>"#
    );
    let mut response = (StatusCode::OK, body).into_response();
    add_svn_dav_headers(&mut response);
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );
    response
}

fn svn_protocol_list_report_response(
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
    let base_path = svn_protocol_file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let list_path = join_svn_report_path(&base_path, &requested_path);
    let tree = match yona_rust_vcs::svn_list_tree(repo_path, Some(revision), &list_path) {
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
    let log_entry = match yona_rust_vcs::svn_log_entries(repo_path, revision, revision, 1) {
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
        items.push_str(&svn_protocol_list_item(
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

fn svn_protocol_get_locks_report_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
) -> Response {
    let path = svn_protocol_file_lookup_for_route(route)
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
    let lock_item = lock
        .as_ref()
        .map(svn_protocol_lock_item)
        .unwrap_or_default();
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

fn svn_protocol_inherited_props_report_response(
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
    let base_path = svn_protocol_file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let path = join_svn_report_path(&base_path, &requested_path);
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
        .map(svn_protocol_inherited_props_item)
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

fn svn_protocol_mkactivity_response(route: &SvnProtocolRoute) -> Response {
    if svn_protocol_activity_id(&route.svn_path).is_none() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    svn_protocol_status_response(StatusCode::CREATED)
}

fn svn_protocol_checkout_response(route: &SvnProtocolRoute, body: &Bytes) -> Response {
    let request = String::from_utf8_lossy(body);
    let Some(activity_href) = xml::text(&request, "href") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let Some(activity_id) = svn_protocol_activity_id(&activity_href) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let working_path =
        if route.svn_path == "!svn/vcc/default" || route.svn_path.starts_with("!svn/bln/") {
            String::new()
        } else {
            let Some((_, path)) = svn_protocol_file_lookup_for_route(route) else {
                return svn_protocol_status_response(StatusCode::BAD_REQUEST);
            };
            path
        };
    let mut location = format!(
        "{}/!svn/wrk/{}",
        svn_protocol_project_href(route),
        xml_escape(&activity_id)
    );
    if !working_path.is_empty() {
        location.push('/');
        location.push_str(&working_path);
    }
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
    if svn_protocol_activity_id(&activity_href).is_none() {
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
    let merge_path = svn_protocol_file_lookup_for_route(route)
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
        let href = svn_protocol_merge_href(&project_href, path, changed_path.is_dir);
        let checked_in_href = svn_protocol_merge_version_href(&project_href, revision, path);
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
        let href = svn_protocol_merge_href(&project_href, &merge_path, true);
        let checked_in_href = svn_protocol_merge_version_href(&project_href, revision, &merge_path);
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
    let Some((revision, path)) = svn_protocol_file_lookup_for_route(route) else {
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
    let contents = match svn_protocol_put_contents(repo_path, &path, body) {
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
            let mut response = status.into_response();
            add_svn_dav_headers(&mut response);
            if let Ok(value) = HeaderValue::from_str(&revision.to_string()) {
                response.headers_mut().insert("svn-revision", value);
            }
            response
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
    let Some((source_revision, source_path)) = svn_protocol_file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if source_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let Some(destination) = headers
        .get("destination")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| svn_protocol_destination_file_lookup(route, value))
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
        Ok(revision) => {
            let mut response = StatusCode::CREATED.into_response();
            add_svn_dav_headers(&mut response);
            if let Ok(value) = HeaderValue::from_str(&revision.to_string()) {
                response.headers_mut().insert("svn-revision", value);
            }
            response
        }
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
    let Some((source_revision, source_path)) = svn_protocol_file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if source_revision.is_some() || source_path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let Some(destination) = headers
        .get("destination")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| svn_protocol_destination_file_lookup(route, value))
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
        Ok(revision) => {
            let mut response = StatusCode::CREATED.into_response();
            add_svn_dav_headers(&mut response);
            if let Ok(value) = HeaderValue::from_str(&revision.to_string()) {
                response.headers_mut().insert("svn-revision", value);
            }
            response
        }
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
    let Some((revision, path)) = svn_protocol_file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if revision.is_some() || path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let message = format!("Create {path} through WebDAV by {}", actor.login_id);
    match yona_rust_vcs::svn_make_collection(repo_path, &path, &message) {
        Ok(revision) => {
            let mut response = StatusCode::CREATED.into_response();
            add_svn_dav_headers(&mut response);
            if let Ok(value) = HeaderValue::from_str(&revision.to_string()) {
                response.headers_mut().insert("svn-revision", value);
            }
            response
        }
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
    let Some((revision, path)) = svn_protocol_file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if svn_protocol_working_activity_id(&route.svn_path).is_some() && path.trim().is_empty() {
        let mut response = (
            StatusCode::MULTI_STATUS,
            svn_protocol_proppatch_multistatus(route, "", &[]),
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
                svn_protocol_proppatch_multistatus(route, &path, &patches),
            )
                .into_response();
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
    let Some((revision, path)) = svn_protocol_file_lookup_for_route(route) else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    if revision.is_some() || path.trim().is_empty() {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    }
    let message = format!("Delete {path} through WebDAV by {}", actor.login_id);
    match yona_rust_vcs::svn_delete_path(repo_path, &path, &message) {
        Ok(revision) => {
            let mut response = StatusCode::NO_CONTENT.into_response();
            add_svn_dav_headers(&mut response);
            if let Ok(value) = HeaderValue::from_str(&revision.to_string()) {
                response.headers_mut().insert("svn-revision", value);
            }
            response
        }
        Err(VcsError::NotFound) => svn_protocol_status_response(StatusCode::NOT_FOUND),
        Err(VcsError::InvalidPath) => svn_protocol_status_response(StatusCode::BAD_REQUEST),
        Err(VcsError::SvnUnavailable) => svn_protocol_not_implemented_response(route, "DELETE"),
        Err(VcsError::SvnFailed(_)) => svn_protocol_status_response(StatusCode::CONFLICT),
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

fn svn_protocol_put_contents(
    repo_path: &StdPath,
    path: &str,
    body: &Bytes,
) -> Result<Bytes, VcsError> {
    if !body.starts_with(b"SVN\0") {
        return Ok(body.clone());
    }
    let source = match yona_rust_vcs::svn_cat_file(repo_path, None, path) {
        Ok(bytes) => bytes,
        Err(VcsError::NotFound) => Vec::new(),
        Err(error) => return Err(error),
    };
    svndiff::apply_svndiff0(&source, body).map(Bytes::from)
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
    let Some((_, path)) = svn_protocol_file_lookup_for_route(route) else {
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
    let body = lock::discovery_body(&svn_protocol_project_href(route), &lock);
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
    let Some((_, path)) = svn_protocol_file_lookup_for_route(route) else {
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

fn svn_protocol_get_locations_report_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let Some(location_revision) = xml::i64(request, "location-revision") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let requested_path = xml::text(request, "path").unwrap_or_default();
    let base_path = svn_protocol_file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let location_path = join_svn_report_path(&base_path, &requested_path);
    let exists =
        match yona_rust_vcs::svn_path_exists(repo_path, Some(location_revision), &location_path) {
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

fn svn_protocol_get_location_segments_report_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let Some(start_revision) = xml::i64(request, "start-revision") else {
        return svn_protocol_status_response(StatusCode::BAD_REQUEST);
    };
    let end_revision = xml::i64(request, "end-revision").unwrap_or(start_revision);
    let requested_path = xml::text(request, "path").unwrap_or_default();
    let base_path = svn_protocol_file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let location_path = join_svn_report_path(&base_path, &requested_path);
    let exists =
        match yona_rust_vcs::svn_path_exists(repo_path, Some(start_revision), &location_path) {
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
        match svn_protocol_location_segments(
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

struct SvnLocationSegment {
    path: String,
    range_start: i64,
    range_end: i64,
}

fn svn_protocol_location_segments(
    repo_path: &StdPath,
    path: &str,
    start_revision: i64,
    end_revision: i64,
) -> Result<Vec<SvnLocationSegment>, VcsError> {
    if start_revision < 0 || end_revision < 0 {
        return Err(VcsError::InvalidPath);
    }
    let mut segments = Vec::new();
    let mut current_path = path.trim_matches('/').to_string();
    let mut current_range_end = start_revision;
    let mut revision = start_revision;
    while revision >= end_revision && revision > 0 {
        let copy = yona_rust_vcs::svn_changed_paths(repo_path, revision)?
            .into_iter()
            .find(|changed_path| {
                changed_path.path.trim_matches('/') == current_path.trim_matches('/')
                    && changed_path.copy_from_path.is_some()
                    && changed_path.copy_from_revision.is_some()
            });
        if let Some(copy) = copy {
            segments.push(SvnLocationSegment {
                path: current_path.clone(),
                range_start: revision,
                range_end: current_range_end,
            });
            current_path = copy.copy_from_path.unwrap_or_default();
            current_range_end = copy
                .copy_from_revision
                .unwrap_or(revision.saturating_sub(1));
            revision = current_range_end;
            continue;
        }
        revision -= 1;
    }
    let range_start = end_revision.max(1);
    if current_range_end >= range_start {
        segments.push(SvnLocationSegment {
            path: current_path,
            range_start,
            range_end: current_range_end,
        });
    }
    Ok(segments)
}

fn svn_protocol_lock_item(lock: &yona_rust_vcs::SvnLock) -> String {
    let comment = if lock.comment.is_empty() {
        String::new()
    } else {
        format!("    <S:comment>{}</S:comment>\n", xml_escape(&lock.comment))
    };
    let expiration = lock
        .expires
        .as_ref()
        .map(|value| {
            format!(
                "    <S:expirationdate>{}</S:expirationdate>\n",
                xml_escape(value)
            )
        })
        .unwrap_or_default();
    format!(
        r#"  <S:lock>
    <S:path>{}</S:path>
    <S:token>{}</S:token>
    <S:owner>{}</S:owner>
{comment}    <S:creationdate>{}</S:creationdate>
{expiration}  </S:lock>
"#,
        xml_escape(&lock.path),
        xml_escape(&lock.token),
        xml_escape(&lock.owner),
        xml_escape(&lock.created)
    )
}

fn svn_protocol_log_item(
    entry: &yona_rust_vcs::SvnLogEntry,
    changed_paths: &[yona_rust_vcs::SvnChangedPath],
) -> String {
    let changed_paths = changed_paths
        .iter()
        .map(svn_protocol_log_changed_path_item)
        .collect::<String>();
    format!(
        r#"  <S:log-item>
    <D:version-name>{}</D:version-name>
    <S:creator-displayname>{}</S:creator-displayname>
    <S:date>{}</S:date>
{changed_paths}    <D:comment>{}</D:comment>
  </S:log-item>
"#,
        entry.revision,
        xml_escape(&entry.author),
        xml_escape(&date::committed_date(&entry.date)),
        xml_escape(&entry.message)
    )
}

fn svn_protocol_log_changed_path_item(changed_path: &yona_rust_vcs::SvnChangedPath) -> String {
    let tag_name = match changed_path.action {
        yona_rust_vcs::SvnChangedAction::Added => "added-path",
        yona_rust_vcs::SvnChangedAction::Modified => "modified-path",
        yona_rust_vcs::SvnChangedAction::Deleted => "deleted-path",
        yona_rust_vcs::SvnChangedAction::Replaced => "replaced-path",
    };
    let node_kind = if changed_path.is_dir { "dir" } else { "file" };
    let copyfrom = match (
        changed_path.copy_from_path.as_deref(),
        changed_path.copy_from_revision,
    ) {
        (Some(path), Some(revision)) => format!(
            r#" copyfrom-path="/{}" copyfrom-rev="{revision}""#,
            xml_escape(path.trim_matches('/'))
        ),
        _ => String::new(),
    };
    format!(
        r#"    <S:{tag_name} node-kind="{node_kind}"{copyfrom}>/{}</S:{tag_name}>
"#,
        xml_escape(changed_path.path.trim_matches('/'))
    )
}

fn svn_protocol_file_rev_item(
    path: &str,
    entry: &yona_rust_vcs::SvnLogEntry,
    contents: &[u8],
) -> String {
    let txdelta = general_purpose::STANDARD.encode(svndiff::svndiff0_fulltext(contents));
    format!(
        r#"  <S:file-rev path="/{}" rev="{}">
    <S:rev-prop name="svn:author">{}</S:rev-prop>
    <S:rev-prop name="svn:date">{}</S:rev-prop>
    <S:rev-prop name="svn:log">{}</S:rev-prop>
    <S:txdelta>{}</S:txdelta>
  </S:file-rev>
"#,
        xml_escape(path.trim_matches('/')),
        entry.revision,
        xml_escape(&entry.author),
        xml_escape(&date::committed_date(&entry.date)),
        xml_escape(&entry.message),
        txdelta
    )
}

fn svn_protocol_replay_included(path: &str, filter_path: Option<&str>) -> bool {
    let Some(filter_path) = filter_path else {
        return true;
    };
    let path = path.trim_matches('/');
    let filter_path = filter_path.trim_matches('/');
    path == filter_path || path.starts_with(&format!("{filter_path}/"))
}

fn svn_protocol_log_path_included(changed_path: &str, filter_path: &str) -> bool {
    let changed_path = changed_path.trim_matches('/');
    let filter_path = filter_path.trim_matches('/');
    changed_path == filter_path
        || changed_path.starts_with(&format!("{filter_path}/"))
        || filter_path.starts_with(&format!("{changed_path}/"))
}

fn svn_protocol_update_depth_includes(entry: &yona_rust_vcs::SvnTreeEntry, depth: &str) -> bool {
    match depth.to_ascii_lowercase().as_str() {
        "empty" => false,
        "files" => !entry.is_dir,
        _ => true,
    }
}

fn svn_protocol_update_entries_recursive(
    route: &SvnProtocolRoute,
    entries: &[yona_rust_vcs::SvnTreeEntry],
    base_entries: &[yona_rust_vcs::SvnTreeEntry],
    parent_path: &str,
    revision: i64,
    base_revision: i64,
    revision_log: &yona_rust_vcs::SvnLogEntry,
    indent_level: usize,
    start_empty: bool,
    repo_path: &StdPath,
    inline_text_deltas: bool,
) -> String {
    let parent_path = parent_path.trim_matches('/');
    let child_names = entries
        .iter()
        .filter_map(|entry| svn_protocol_immediate_child_name(parent_path, &entry.path))
        .chain(
            base_entries
                .iter()
                .filter_map(|entry| svn_protocol_immediate_child_name(parent_path, &entry.path)),
        )
        .collect::<std::collections::BTreeSet<_>>();
    let mut output = String::new();
    for name in child_names {
        let child_path = if parent_path.is_empty() {
            name.clone()
        } else {
            format!("{parent_path}/{name}")
        };
        let child_entry = entries
            .iter()
            .find(|entry| entry.path.trim_matches('/') == child_path);
        let is_dir = child_entry.map(|entry| entry.is_dir).unwrap_or_else(|| {
            entries.iter().any(|entry| {
                entry
                    .path
                    .trim_matches('/')
                    .starts_with(&format!("{child_path}/"))
            })
        });
        let base_child_exists = base_entries
            .iter()
            .any(|entry| entry.path.trim_matches('/') == child_path);
        let target_child_exists = child_entry.is_some()
            || entries.iter().any(|entry| {
                entry
                    .path
                    .trim_matches('/')
                    .starts_with(&format!("{child_path}/"))
            });
        if base_child_exists && !target_child_exists {
            let indent = "  ".repeat(indent_level);
            output.push_str(&format!(
                r#"{indent}<S:delete-entry name="{}" rev="{base_revision}"/>
"#,
                xml_escape(&name)
            ));
            continue;
        }
        if is_dir {
            let indent = "  ".repeat(indent_level);
            let child_indent = "  ".repeat(indent_level + 1);
            let nested = svn_protocol_update_entries_recursive(
                route,
                entries,
                base_entries,
                &child_path,
                revision,
                base_revision,
                revision_log,
                indent_level + 1,
                start_empty,
                repo_path,
                inline_text_deltas,
            );
            let directory_element = if start_empty {
                "add-directory"
            } else {
                "open-directory"
            };
            let revision_attribute = if start_empty {
                String::new()
            } else {
                format!(r#" rev="{base_revision}""#)
            };
            output.push_str(&format!(
                r#"{indent}<S:{directory_element} name="{}"{revision_attribute} bc-url="{}">
{child_indent}<D:checked-in><D:href>{}</D:href></D:checked-in>
{}
{}{indent}</S:{directory_element}>
"#,
                xml_escape(&name),
                xml_escape(&svn_protocol_baseline_collection_href(
                    route,
                    revision,
                    &child_path
                )),
                xml_escape(&svn_protocol_version_href(route, revision, &child_path)),
                svn_protocol_update_entry_props(revision_log, indent_level + 1),
                nested
            ));
        } else if let Some(entry) = child_entry {
            let inline_delta = if inline_text_deltas {
                yona_rust_vcs::svn_cat_file(repo_path, Some(revision), entry.path.trim_matches('/'))
                    .ok()
            } else {
                None
            };
            output.push_str(&svn_protocol_update_file_entry(
                route,
                entry,
                revision,
                base_revision,
                revision_log,
                indent_level,
                start_empty,
                inline_delta.as_deref(),
            ));
        }
    }
    output
}

fn svn_protocol_immediate_child_name(parent_path: &str, path: &str) -> Option<String> {
    let path = path.trim_matches('/');
    if path.is_empty() || path == parent_path {
        return None;
    }
    let relative = if parent_path.is_empty() {
        path
    } else {
        path.strip_prefix(&format!("{parent_path}/"))?
    };
    relative.split('/').next().map(str::to_string)
}

fn svn_protocol_update_file_entry(
    route: &SvnProtocolRoute,
    entry: &yona_rust_vcs::SvnTreeEntry,
    revision: i64,
    base_revision: i64,
    revision_log: &yona_rust_vcs::SvnLogEntry,
    indent_level: usize,
    start_empty: bool,
    inline_delta: Option<&[u8]>,
) -> String {
    let indent = "  ".repeat(indent_level);
    let child_indent = "  ".repeat(indent_level + 1);
    let name = entry
        .path
        .trim_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or(entry.path.as_str());
    let checked_in_revision = if inline_delta.is_some() && !start_empty {
        base_revision
    } else {
        revision
    };
    let version_href =
        svn_protocol_version_href(route, checked_in_revision, entry.path.trim_matches('/'));
    let file_element = if start_empty { "add-file" } else { "open-file" };
    let revision_attribute = if start_empty {
        String::new()
    } else {
        format!(r#" rev="{base_revision}""#)
    };
    let inline_props = if let Some(contents) = inline_delta {
        format!(
            r#"{child_indent}<S:prop><V:md5-checksum xmlns:V="{}">{}</V:md5-checksum></S:prop>
"#,
            "http://subversion.tigris.org/xmlns/dav/",
            svn_protocol_md5_hex(contents)
        )
    } else {
        String::new()
    };
    let file_text = if let Some(contents) = inline_delta {
        format!(
            r#"{child_indent}<S:txdelta>{}</S:txdelta>
"#,
            general_purpose::STANDARD.encode(svndiff::svndiff0_fulltext(contents))
        )
    } else {
        format!("{child_indent}<S:fetch-file/>\n")
    };
    format!(
        r#"{indent}<S:{file_element} name="{}"{revision_attribute}>
{child_indent}<D:checked-in><D:href>{}</D:href></D:checked-in>
{}
{inline_props}
{child_indent}<S:baseline-relative-path>{}</S:baseline-relative-path>
{file_text}
{indent}</S:{file_element}>
"#,
        xml_escape(name),
        xml_escape(&version_href),
        svn_protocol_update_entry_props(revision_log, indent_level + 1),
        xml_escape(entry.path.trim_matches('/'))
    )
}

fn svn_protocol_md5_hex(contents: &[u8]) -> String {
    let mut hasher = Md5::new();
    hasher.update(contents);
    format!("{:x}", hasher.finalize())
}

fn svn_protocol_update_inline_text_deltas(request: &str) -> bool {
    request.contains("<S:dst-path>")
        && !xml::text(request, "text-deltas")
            .as_deref()
            .is_some_and(|value| value.eq_ignore_ascii_case("no"))
}

fn svn_protocol_update_entry_props(
    revision_log: &yona_rust_vcs::SvnLogEntry,
    indent_level: usize,
) -> String {
    let indent = "  ".repeat(indent_level);
    let mut props = format!(
        r#"{indent}<S:set-prop name="svn:entry:committed-rev">{}</S:set-prop>
"#,
        revision_log.revision
    );
    if !revision_log.date.is_empty() {
        props.push_str(&format!(
            r#"{indent}<S:set-prop name="svn:entry:committed-date">{}</S:set-prop>
"#,
            xml_escape(&date::committed_date(&revision_log.date))
        ));
    }
    if !revision_log.author.is_empty() {
        props.push_str(&format!(
            r#"{indent}<S:set-prop name="svn:entry:last-author">{}</S:set-prop>
"#,
            xml_escape(&revision_log.author)
        ));
    }
    props
}

fn svn_protocol_version_href(route: &SvnProtocolRoute, revision: i64, path: &str) -> String {
    let path = path.trim_matches('/');
    if path.is_empty() {
        format!("{}/!svn/ver/{revision}/", svn_protocol_project_href(route))
    } else {
        format!(
            "{}/!svn/ver/{revision}/{path}",
            svn_protocol_project_href(route)
        )
    }
}

fn svn_protocol_merge_href(project_href: &str, path: &str, collection: bool) -> String {
    let path = path.trim_matches('/');
    if path.is_empty() {
        return format!("{project_href}/");
    }
    if collection {
        format!("{project_href}/{path}/")
    } else {
        format!("{project_href}/{path}")
    }
}

fn svn_protocol_merge_version_href(project_href: &str, revision: i64, path: &str) -> String {
    let path = path.trim_matches('/');
    if path.is_empty() {
        format!("{project_href}/!svn/ver/{revision}/")
    } else {
        format!("{project_href}/!svn/ver/{revision}/{path}")
    }
}

fn svn_protocol_baseline_collection_href(
    route: &SvnProtocolRoute,
    revision: i64,
    path: &str,
) -> String {
    let path = path.trim_matches('/');
    if path.is_empty() {
        format!("{}/!svn/bc/{revision}/", svn_protocol_project_href(route))
    } else {
        format!(
            "{}/!svn/bc/{revision}/{path}",
            svn_protocol_project_href(route)
        )
    }
}

fn svn_protocol_update_depth(request: &str) -> String {
    if let Some(depth) = xml::text(request, "depth") {
        return depth;
    }
    if xml::text(request, "recursive")
        .as_deref()
        .is_some_and(|value| value.eq_ignore_ascii_case("no"))
    {
        return "files".to_string();
    }
    "infinity".to_string()
}

fn svn_protocol_update_start_empty(request: &str) -> bool {
    if !request.contains("<S:entry") {
        return true;
    }
    request.contains("start-empty=\"true\"") || request.contains("start-empty='true'")
}

fn svn_protocol_update_entry_revision(request: &str) -> Option<i64> {
    let entry_start = request.find("<S:entry")?;
    let entry_end = request[entry_start..].find('>')? + entry_start;
    let entry = &request[entry_start..entry_end];
    ["rev=\"", "rev='"].iter().find_map(|marker| {
        let value = entry.split_once(marker)?.1;
        let quote = if *marker == "rev=\"" { '"' } else { '\'' };
        value.split_once(quote)?.0.parse::<i64>().ok()
    })
}

fn svn_protocol_replay_operation(
    path: &yona_rust_vcs::SvnChangedPath,
    low_water_mark: i64,
) -> String {
    let name = xml_escape(path.path.trim_matches('/'));
    match (&path.action, path.is_dir) {
        (yona_rust_vcs::SvnChangedAction::Added, true)
        | (yona_rust_vcs::SvnChangedAction::Replaced, true) => format!(
            r#"    <S:add-directory name="{name}">
    </S:add-directory>
"#
        ),
        (yona_rust_vcs::SvnChangedAction::Added, false)
        | (yona_rust_vcs::SvnChangedAction::Replaced, false) => format!(
            r#"    <S:add-file name="{name}">
      <S:close-file/>
    </S:add-file>
"#
        ),
        (yona_rust_vcs::SvnChangedAction::Deleted, _) => {
            format!(r#"    <S:delete-entry name="{name}" rev="{low_water_mark}"/>"#) + "\n"
        }
        (yona_rust_vcs::SvnChangedAction::Modified, true) => format!(
            r#"    <S:open-directory name="{name}" rev="{low_water_mark}">
    </S:open-directory>
"#
        ),
        (yona_rust_vcs::SvnChangedAction::Modified, false) => format!(
            r#"    <S:open-file name="{name}" rev="{low_water_mark}">
      <S:close-file/>
    </S:open-file>
"#
        ),
    }
}

fn svn_protocol_mergeinfo_item(path: &str, mergeinfo: &str) -> String {
    let response_path = if path.trim_matches('/').is_empty() {
        String::new()
    } else {
        format!("/{}", xml_escape(path.trim_matches('/')))
    };
    format!(
        r#"  <S:mergeinfo-item>
    <S:mergeinfo-path>{}</S:mergeinfo-path>
    <S:mergeinfo-info>{}</S:mergeinfo-info>
  </S:mergeinfo-item>
"#,
        response_path,
        xml_escape(mergeinfo)
    )
}

fn svn_protocol_list_item(
    repo_path: &StdPath,
    revision: i64,
    entry: &yona_rust_vcs::SvnTreeEntry,
    author: &str,
    date: &str,
) -> String {
    let node_kind = if entry.is_dir { "dir" } else { "file" };
    let size = if entry.is_dir {
        String::new()
    } else {
        match yona_rust_vcs::svn_cat_file(repo_path, Some(revision), &entry.path) {
            Ok(bytes) => format!(r#" size="{}""#, bytes.len()),
            Err(_) => String::new(),
        }
    };
    let date_attr = if date.trim().is_empty() {
        String::new()
    } else {
        format!(r#" date="{}""#, xml_escape(date))
    };
    let author_element = if author.trim().is_empty() {
        String::new()
    } else {
        format!(
            "    <D:creator-displayname>{}</D:creator-displayname>\n",
            xml_escape(author)
        )
    };
    format!(
        r#"  <S:item node-kind="{node_kind}"{size} created-rev="{revision}"{date_attr}>
{author_element}    {}
  </S:item>
"#,
        xml_escape(entry.path.trim_matches('/'))
    )
}

fn svn_protocol_inherited_props_item(item: &yona_rust_vcs::SvnInheritedPropertySet) -> String {
    item.properties
        .iter()
        .map(|property| {
            format!(
                "  <S:iprop-item>\n    <S:iprop-path>{}</S:iprop-path>\n    <S:iprop-propname>{}</S:iprop-propname>\n    <S:iprop-propval>{}</S:iprop-propval>\n  </S:iprop-item>\n",
                xml_escape(&item.path),
                xml_escape(&property.name),
                xml_escape(&property.value)
            )
        })
        .collect()
}

fn svn_protocol_proppatch_multistatus(
    route: &SvnProtocolRoute,
    path: &str,
    patches: &[yona_rust_vcs::SvnPropertyPatch],
) -> String {
    let href = svn_protocol_href(route, path, false);
    let mut properties = String::new();
    for patch in patches {
        properties.push_str(&format!("        <D:{}/>\n", xml_escape(&patch.name)));
    }
    format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>{}</D:href>
    <D:propstat>
      <D:prop>
{properties}      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>"#,
        xml_escape(&href)
    )
}

fn join_svn_report_path(base_path: &str, requested_path: &str) -> String {
    let base_path = base_path.trim_matches('/');
    let requested_path = requested_path.trim_matches('/');
    if base_path.is_empty() {
        requested_path.to_string()
    } else if requested_path.is_empty() {
        base_path.to_string()
    } else {
        format!("{base_path}/{requested_path}")
    }
}

fn svn_protocol_file_lookup(svn_path: &str) -> Option<(Option<i64>, String)> {
    let trimmed = svn_path.trim_matches('/');
    if trimmed.is_empty() {
        return None;
    }
    if let Some(rest) = trimmed.strip_prefix("!svn/wrk/") {
        let (_, path) = rest.split_once('/').unwrap_or((rest, ""));
        return Some((None, path.to_string()));
    }
    if let Some(rest) = trimmed.strip_prefix("!svn/vcc/default/") {
        return Some((None, rest.to_string()));
    }
    if let Some(rest) = trimmed.strip_prefix("!svn/rvr/") {
        return svn_protocol_revision_path(rest);
    }
    if let Some(rest) = trimmed.strip_prefix("!svn/bc/") {
        return svn_protocol_revision_path(rest);
    }
    if let Some(rest) = trimmed.strip_prefix("!svn/ver/") {
        return svn_protocol_revision_path(rest);
    }
    if trimmed.starts_with("!svn/") {
        return None;
    }
    Some((None, trimmed.to_string()))
}

fn svn_protocol_file_lookup_for_route(route: &SvnProtocolRoute) -> Option<(Option<i64>, String)> {
    let (revision, path) = svn_protocol_file_lookup(&route.svn_path)?;
    Some((
        revision,
        svn_protocol_strip_project_path_alias(route, &path),
    ))
}

fn svn_protocol_labeled_route(route: &SvnProtocolRoute, headers: &HeaderMap) -> SvnProtocolRoute {
    let Some(revision) = svn_protocol_label_revision(headers) else {
        return route.clone();
    };
    let path = route.svn_path.trim_matches('/');
    let svn_path = if path.is_empty() {
        format!("!svn/bc/{revision}")
    } else if path.starts_with("!svn/") {
        path.to_string()
    } else {
        format!("!svn/ver/{revision}/{path}")
    };
    SvnProtocolRoute {
        svn_path,
        ..route.clone()
    }
}

fn svn_protocol_label_revision(headers: &HeaderMap) -> Option<i64> {
    headers
        .get("label")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.trim().parse::<i64>().ok())
}

fn svn_protocol_destination_file_lookup(
    route: &SvnProtocolRoute,
    destination: &str,
) -> Option<(Option<i64>, String)> {
    let svn_path = svn_protocol_repo_relative_request_path(route, destination);
    let destination_route = SvnProtocolRoute {
        base_path: route.base_path.clone(),
        request_origin: route.request_origin.clone(),
        owner_name: route.owner_name.clone(),
        project_name: route.project_name.clone(),
        svn_path,
    };
    svn_protocol_file_lookup_for_route(&destination_route)
}

fn svn_protocol_strip_project_path_alias(route: &SvnProtocolRoute, path: &str) -> String {
    let trimmed = path.trim_matches('/');
    if trimmed == route.project_name {
        return String::new();
    }
    if let Some(stripped) = trimmed.strip_prefix(&format!("{}/", route.project_name)) {
        return stripped.to_string();
    }
    path.to_string()
}

fn svn_protocol_revision_path(rest: &str) -> Option<(Option<i64>, String)> {
    let (revision, path) = rest.split_once('/').unwrap_or((rest, ""));
    let revision = revision.parse::<i64>().ok()?;
    Some((Some(revision), path.to_string()))
}

fn svn_protocol_activity_id(value: &str) -> Option<String> {
    let marker = "!svn/act/";
    let rest = value.split(marker).nth(1)?;
    let activity_id = rest
        .trim_start_matches('/')
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default()
        .trim();
    if activity_id.is_empty() {
        None
    } else {
        Some(activity_id.to_string())
    }
}

fn svn_protocol_working_activity_id(value: &str) -> Option<String> {
    let marker = "!svn/wrk/";
    let rest = value.split(marker).nth(1)?;
    let activity_id = rest
        .trim_start_matches('/')
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default()
        .trim();
    if activity_id.is_empty() {
        None
    } else {
        Some(activity_id.to_string())
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
