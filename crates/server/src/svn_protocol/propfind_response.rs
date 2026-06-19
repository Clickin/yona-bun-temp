use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yona_rust_vcs::VcsError;

use super::{
    add_svn_dav_headers, date, href, path, propfind, propfind_items,
    svn_protocol_not_implemented_response, svn_protocol_status_response, xml_escape,
    SvnProtocolRoute,
};

pub(super) fn root(
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
    propfind_collection(
        &href,
        youngest_revision,
        repository_uuid,
        checked_in_href.as_deref(),
        Some(&vcc_href),
        Some(&activity_collection_href),
        revision_provenance(repo_path, route, youngest_revision, request).as_ref(),
        request,
    )
}

pub(super) fn collection(
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
    propfind_collection(
        &href,
        youngest_revision,
        repository_uuid,
        checked_in_href.as_deref(),
        None,
        activity_collection_href.as_deref(),
        revision_provenance(repo_path, route, youngest_revision, request).as_ref(),
        request,
    )
}

fn revision_provenance(
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

fn propfind_collection(
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

pub(super) fn baseline(repo_path: &StdPath, route: &SvnProtocolRoute, request: &str) -> Response {
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

pub(super) fn file(repo_path: &StdPath, route: &SvnProtocolRoute, request: &str) -> Response {
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
    let provenance = version_revision
        .and_then(|revision| revision_provenance(repo_path, route, Some(revision), request));
    propfind_file(
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

pub(super) fn tree(
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
    let provenance = version_revision
        .and_then(|revision| revision_provenance(repo_path, route, Some(revision), request));
    Some(propfind_tree(
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

fn propfind_tree(
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

fn propfind_file(
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
