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
mod report_file_revs;
mod report_filters;
mod report_items;
mod report_list;
mod report_locations;
mod report_log;
mod report_mergeinfo;
mod report_replay;
mod report_revisions;
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
        let youngest_revision = path::label_revision(&parts.headers)
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
        let propfind_route = path::labeled_route(&route, &parts.headers);
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

fn svn_protocol_root_propfind_response(
    route: &SvnProtocolRoute,
    repo_path: &StdPath,
    youngest_revision: Option<i64>,
    repository_uuid: Option<String>,
    request: &str,
) -> Response {
    let href = href::project(route);
    let checked_in_href =
        youngest_revision.map(|revision| format!("{}/!svn/bln/{revision}", href::project(route)));
    let vcc_href = format!("{}/!svn/vcc/default", href::project(route));
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
    let href = format!("{}/{}", href::project(route), route.svn_path);
    let checked_in_href = if route.svn_path == "!svn/vcc/default" {
        youngest_revision.map(|revision| format!("{}/!svn/bln/{revision}", href::project(route)))
    } else {
        None
    };
    let activity_collection_href = (route.svn_path == "!svn/vcc/default")
        .then(|| format!("{}/!svn/act/", href::project(route)));
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

fn svn_protocol_revision_provenance(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    revision: Option<i64>,
    request: &str,
) -> Option<propfind_items::RevisionProvenance> {
    let revision = revision?;
    if !(propfind::is_propname(request)
        || propfind::wants(request, "creationdate")
        || propfind::wants(request, "creator-displayname")
        || propfind::wants(request, "getlastmodified"))
    {
        return None;
    }
    match yona_rust_vcs::svn_log_entries(repo_path, revision, revision, 1) {
        Ok(mut entries) => entries
            .pop()
            .map(|entry| propfind_items::RevisionProvenance {
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
    provenance: Option<&propfind_items::RevisionProvenance>,
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
    if propfind::is_propname(request) {
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
    let version_name = (propfind::wants(request, "version-name")
        || propfind::wants(request, "allprop"))
    .then_some(youngest_revision)
    .flatten()
    .map(|revision| format!("        <D:version-name>{revision}</D:version-name>\n"))
    .unwrap_or_default();
    let repository_uuid = (propfind::wants(request, "repository-uuid")
        || propfind::wants(request, "allprop"))
    .then_some(repository_uuid)
    .flatten()
    .map(|uuid| {
        format!(
            "        <S:repository-uuid>{}</S:repository-uuid>\n",
            xml_escape(&uuid)
        )
    })
    .unwrap_or_default();
    let checked_in = (propfind::wants(request, "checked-in")
        || propfind::wants(request, "allprop"))
    .then_some(checked_in_href)
    .flatten()
    .map(|href| {
        format!(
            "        <D:checked-in><D:href>{}</D:href></D:checked-in>\n",
            xml_escape(href)
        )
    })
    .unwrap_or_default();
    let version_controlled_configuration = (propfind::wants(
        request,
        "version-controlled-configuration",
    ) || propfind::wants(request, "allprop"))
    .then_some(vcc_href)
    .flatten()
        .map(|href| {
            format!(
                "        <D:version-controlled-configuration><D:href>{}</D:href></D:version-controlled-configuration>\n",
                xml_escape(href)
            )
        })
        .unwrap_or_default();
    let baseline_collection = (propfind::wants(request, "baseline-collection")
        || propfind::wants(request, "allprop"))
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
        if vcc_href.is_some() && propfind::wants(request, "baseline-relative-path") {
            "        <S:baseline-relative-path></S:baseline-relative-path>\n"
        } else {
            ""
        };
    let activity_collection_set =
        propfind::activity_collection_set_item(activity_collection_href, request);
    let creationdate = propfind::wants(request, "creationdate")
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
    let creator_displayname = propfind::wants(request, "creator-displayname")
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
    let getlastmodified = propfind::wants(request, "getlastmodified")
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
        || propfind::wants(request, "resourcetype")
        || propfind::wants(request, "allprop")
    {
        "        <D:resourcetype><D:collection/></D:resourcetype>\n"
    } else {
        ""
    };
    let displayname = propfind::displayname_item(href, request);
    let supportedlock = propfind::supportedlock_item(request);
    let supported_report_set = propfind::supported_report_set_item(request);
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
    let href = format!("{}/!svn/bln/{revision}", href::project(route));
    let baseline_collection = format!("{}/!svn/bc/{revision}", href::project(route));
    let wants_creation_metadata = propfind::is_propname(request)
        || propfind::wants(request, "creationdate")
        || propfind::wants(request, "creator-displayname")
        || propfind::wants(request, "getlastmodified");
    let repository_uuid = if propfind::is_propname(request)
        || propfind::wants(request, "repository-uuid")
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
    let prop_items = if propfind::is_propname(request) {
        "        <D:resourcetype/>\n        <D:displayname/>\n        <D:supportedlock/>\n        <D:version-name/>\n        <D:baseline-collection/>\n        <D:creationdate/>\n        <D:creator-displayname/>\n        <D:getlastmodified/>\n        <D:supported-report-set/>\n        <S:repository-uuid/>\n".to_string()
    } else {
        let resourcetype = propfind::wants(request, "resourcetype")
            .then_some("        <D:resourcetype><D:baseline/></D:resourcetype>\n")
            .unwrap_or_default();
        let displayname = propfind::displayname_item(&href, request);
        let supportedlock = propfind::supportedlock_item(request);
        let version_name = propfind::wants(request, "version-name")
            .then_some(format!(
                "        <D:version-name>{revision}</D:version-name>\n"
            ))
            .unwrap_or_default();
        let baseline_collection_item = propfind::wants(request, "baseline-collection")
            .then_some(format!(
                "        <D:baseline-collection><D:href>{}</D:href></D:baseline-collection>\n",
                xml_escape(&baseline_collection)
            ))
            .unwrap_or_default();
        let creationdate = propfind::wants(request, "creationdate")
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
        let creator_displayname = propfind::wants(request, "creator-displayname")
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
        let getlastmodified = propfind::wants(request, "getlastmodified")
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
        let repository_uuid = propfind::wants(request, "repository-uuid")
            .then_some(repository_uuid.as_deref())
            .flatten()
            .map(|uuid| {
                format!(
                    "        <S:repository-uuid>{}</S:repository-uuid>\n",
                    xml_escape(uuid)
                )
            })
            .unwrap_or_default();
        let supported_report_set = propfind::supported_report_set_item(request);
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

fn svn_protocol_file_propfind_response(
    repo_path: &StdPath,
    route: &SvnProtocolRoute,
    request: &str,
) -> Response {
    let Some((revision, path)) = path::file_lookup_for_route(route) else {
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
        href::project(route),
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
            href::project(route),
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
    let (revision, path) = path::file_lookup_for_route(route)?;
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
    provenance: Option<&propfind_items::RevisionProvenance>,
    request: &str,
) -> Response {
    let mut responses = String::new();
    let collection_href = href::propfind_tree(route, &tree.path, true);
    responses.push_str(&propfind_items::collection(
        route,
        &collection_href,
        &tree.path,
        version_revision,
        repository_uuid,
        provenance,
        request,
    ));
    if let Some(alias_href) = collection_href.strip_suffix('/') {
        responses.push_str(&propfind_items::collection(
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
            let href = href::propfind_tree(route, &entry.path, entry.is_dir);
            if entry.is_dir {
                responses.push_str(&propfind_items::collection(
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
                        href::project(route),
                        revision,
                        entry.path.trim_matches('/')
                    )
                });
                responses.push_str(&propfind_items::file(
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
    provenance: Option<&propfind_items::RevisionProvenance>,
    request: &str,
) -> Response {
    let item = propfind_items::file(
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
        return svn_protocol_update_report_response(repo_path, route, &request);
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
        return svn_protocol_inherited_props_report_response(repo_path, route, &request);
    }
    if request.contains("get-locks-report") {
        return svn_protocol_get_locks_report_response(repo_path, route);
    }
    if request.contains("get-location-segments") {
        return report_locations::location_segments(repo_path, route, &request);
    }
    if request.contains("get-locations") {
        return report_locations::locations(repo_path, route, &request);
    }
    svn_protocol_not_implemented_response(route, "REPORT")
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
    .map(|path| href::repo_relative_request_path(route, &path))
    .unwrap_or_default();
    let base_path = path::file_lookup_for_route(route)
        .map(|(_, path)| path)
        .unwrap_or_default();
    let update_path = path::join_report_path(&base_path, &requested_path);
    let depth = update::depth(request);
    let start_empty = update::start_empty(request);
    let base_revision = update::entry_revision(request).unwrap_or(target_revision);
    let inline_text_deltas = update::inline_text_deltas(request);
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
        update::entries_recursive(
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
            .filter(|entry| update::depth_includes(entry, &depth))
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
            .filter(|entry| update::depth_includes(entry, &depth))
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
                    xml_escape(&href::baseline_collection(
                        route,
                        target_revision,
                        entry.path.trim_matches('/')
                    )),
                    xml_escape(&href::version(
                        route,
                        target_revision,
                        entry.path.trim_matches('/')
                    )),
                    update::entry_props(&revision_log, 3)
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
                entries.push_str(&update::file_entry(
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
        href::version(route, target_revision, &update_path),
        update::entry_props(&revision_log, 2)
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
