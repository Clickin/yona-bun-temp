use crate::base_path_href;

use super::{href, path, xml_escape, SvnProtocolRoute};

pub(crate) fn checkout_location(route: &SvnProtocolRoute, activity_id: &str) -> Option<String> {
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

pub(crate) fn merge_updated_responses(
    route: &SvnProtocolRoute,
    revision: i64,
    merge_path: &str,
    changed_paths: &[yona_rust_vcs::SvnChangedPath],
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
