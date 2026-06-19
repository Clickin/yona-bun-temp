use crate::base_path_href;

use super::SvnProtocolRoute;

pub(crate) fn resource(route: &SvnProtocolRoute, path: &str, collection: bool) -> String {
    let clean_path = path.trim_matches('/');
    let suffix = if clean_path.is_empty() {
        String::new()
    } else if collection {
        format!("/{clean_path}/")
    } else {
        format!("/{clean_path}")
    };
    format!("{}{}", project(route), suffix)
}

pub(crate) fn propfind_tree(route: &SvnProtocolRoute, path: &str, collection: bool) -> String {
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
        let suffix = suffix(path, collection);
        return format!("{}/!svn/{kind}/{revision}{suffix}", project(route));
    }
    if trimmed.starts_with("!svn/vcc/default/") {
        let path = path.trim_matches('/');
        let suffix = suffix(path, collection);
        return format!("{}/!svn/vcc/default{suffix}", project(route));
    }
    resource(route, path, collection)
}

pub(crate) fn repo_relative_request_path(route: &SvnProtocolRoute, requested_path: &str) -> String {
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

pub(crate) fn project(route: &SvnProtocolRoute) -> String {
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

pub(crate) fn version(route: &SvnProtocolRoute, revision: i64, path: &str) -> String {
    let path = path.trim_matches('/');
    if path.is_empty() {
        format!("{}/!svn/ver/{revision}/", project(route))
    } else {
        format!("{}/!svn/ver/{revision}/{path}", project(route))
    }
}

pub(crate) fn merge(project_href: &str, path: &str, collection: bool) -> String {
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

pub(crate) fn merge_version(project_href: &str, revision: i64, path: &str) -> String {
    let path = path.trim_matches('/');
    if path.is_empty() {
        format!("{project_href}/!svn/ver/{revision}/")
    } else {
        format!("{project_href}/!svn/ver/{revision}/{path}")
    }
}

pub(crate) fn baseline_collection(route: &SvnProtocolRoute, revision: i64, path: &str) -> String {
    let path = path.trim_matches('/');
    if path.is_empty() {
        format!("{}/!svn/bc/{revision}/", project(route))
    } else {
        format!("{}/!svn/bc/{revision}/{path}", project(route))
    }
}

fn suffix(path: &str, collection: bool) -> String {
    if path.is_empty() {
        String::new()
    } else if collection {
        format!("/{path}/")
    } else {
        format!("/{path}")
    }
}
