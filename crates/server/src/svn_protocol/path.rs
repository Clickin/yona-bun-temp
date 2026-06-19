use http::HeaderMap;

use super::SvnProtocolRoute;

pub(crate) fn join_report_path(base_path: &str, requested_path: &str) -> String {
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

pub(crate) fn file_lookup_for_route(route: &SvnProtocolRoute) -> Option<(Option<i64>, String)> {
    let (revision, path) = file_lookup(&route.svn_path)?;
    Some((revision, strip_project_path_alias(route, &path)))
}

pub(crate) fn labeled_route(route: &SvnProtocolRoute, headers: &HeaderMap) -> SvnProtocolRoute {
    let Some(revision) = label_revision(headers) else {
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

pub(crate) fn label_revision(headers: &HeaderMap) -> Option<i64> {
    headers
        .get("label")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.trim().parse::<i64>().ok())
}

pub(crate) fn destination_file_lookup(
    route: &SvnProtocolRoute,
    destination: &str,
) -> Option<(Option<i64>, String)> {
    let svn_path = super::href::repo_relative_request_path(route, destination);
    let destination_route = SvnProtocolRoute {
        base_path: route.base_path.clone(),
        request_origin: route.request_origin.clone(),
        owner_name: route.owner_name.clone(),
        project_name: route.project_name.clone(),
        svn_path,
    };
    file_lookup_for_route(&destination_route)
}

pub(crate) fn activity_id(value: &str) -> Option<String> {
    svn_activity_id(value, "!svn/act/")
}

pub(crate) fn working_activity_id(value: &str) -> Option<String> {
    svn_activity_id(value, "!svn/wrk/")
}

fn file_lookup(svn_path: &str) -> Option<(Option<i64>, String)> {
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
        return revision_path(rest);
    }
    if let Some(rest) = trimmed.strip_prefix("!svn/bc/") {
        return revision_path(rest);
    }
    if let Some(rest) = trimmed.strip_prefix("!svn/ver/") {
        return revision_path(rest);
    }
    if trimmed.starts_with("!svn/") {
        return None;
    }
    Some((None, trimmed.to_string()))
}

fn strip_project_path_alias(route: &SvnProtocolRoute, path: &str) -> String {
    let trimmed = path.trim_matches('/');
    if trimmed == route.project_name {
        return String::new();
    }
    if let Some(stripped) = trimmed.strip_prefix(&format!("{}/", route.project_name)) {
        return stripped.to_string();
    }
    path.to_string()
}

fn revision_path(rest: &str) -> Option<(Option<i64>, String)> {
    let (revision, path) = rest.split_once('/').unwrap_or((rest, ""));
    let revision = revision.parse::<i64>().ok()?;
    Some((Some(revision), path.to_string()))
}

fn svn_activity_id(value: &str, marker: &str) -> Option<String> {
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
