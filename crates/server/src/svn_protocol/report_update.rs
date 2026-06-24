use axum::response::{IntoResponse, Response};
use http::{HeaderValue, StatusCode};
use std::collections::BTreeSet;
use std::path::Path as StdPath;

use crate::{internal_error, RestRouteError};
use yoram_vcs::VcsError;

use super::{
    add_svn_dav_headers, href, path, svn_protocol_not_implemented_response,
    svn_protocol_status_response, update, xml, xml_escape, SvnProtocolRoute,
};

pub(crate) fn update(repo_path: &StdPath, route: &SvnProtocolRoute, request: &str) -> Response {
    let target_revision =
        xml::i64(request, "target-revision").or_else(|| xml::i64(request, "revision"));
    let target_revision = match target_revision {
        Some(revision) => revision,
        None => match yoram_vcs::svn_youngest_revision(repo_path) {
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
        yoram_vcs::svn_list_tree_recursive(repo_path, Some(target_revision), &update_path)
    } else {
        yoram_vcs::svn_list_tree(repo_path, Some(target_revision), &update_path)
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
            yoram_vcs::svn_list_tree_recursive(repo_path, Some(base_revision), &update_path)
        } else {
            yoram_vcs::svn_list_tree(repo_path, Some(base_revision), &update_path)
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
        match yoram_vcs::svn_log_entries(repo_path, target_revision, target_revision, 1) {
            Ok(mut entries) => entries.pop().unwrap_or(yoram_vcs::SvnLogEntry {
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
            .collect::<BTreeSet<_>>();
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
                    match yoram_vcs::svn_cat_file(
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
