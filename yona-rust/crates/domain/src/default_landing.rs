use crate::DEFAULT_LANDING_FALLBACK_PATH;

const MAX_DEFAULT_LANDING_PATH_LENGTH: usize = 255;
const DEFAULT_SEARCH_PAGE_SIZE: usize = 20;

fn normalize_pathname(pathname: &str) -> String {
    if pathname.len() > 1 && pathname.ends_with('/') {
        pathname.trim_end_matches('/').to_string()
    } else {
        pathname.to_string()
    }
}

fn safe_segment(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_DEFAULT_LANDING_PATH_LENGTH
        && !value.contains('/')
        && value
            .chars()
            .all(|char| char.is_ascii_alphanumeric() || matches!(char, '-' | '_' | '.'))
}

fn safe_positive_segment(value: &str) -> bool {
    !value.is_empty() && value.chars().all(|char| char.is_ascii_digit()) && value != "0"
}

fn safe_commit_oid(value: &str) -> bool {
    !value.trim().is_empty()
        && value.len() <= MAX_DEFAULT_LANDING_PATH_LENGTH
        && !value.contains('/')
}

fn normalize_search_path(query: &str) -> Option<String> {
    let mut scope = "global".to_string();
    let mut page_size = DEFAULT_SEARCH_PAGE_SIZE;
    let mut query_value: Option<String> = None;
    let mut cursor: Option<String> = None;
    let mut organization_name: Option<String> = None;
    let mut owner_name: Option<String> = None;
    let mut project_name: Option<String> = None;
    let mut types = Vec::new();

    for pair in query.split('&').filter(|pair| !pair.is_empty()) {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        let value = value.trim();
        match key {
            "scope" if matches!(value, "global" | "organization" | "project") => {
                scope = value.to_string();
            }
            "pageSize" => {
                if let Ok(parsed) = value.parse::<usize>() {
                    if (1..=100).contains(&parsed) {
                        page_size = parsed;
                    }
                }
            }
            "query" if !value.is_empty() => {
                query_value = Some(
                    value
                        .chars()
                        .take(MAX_DEFAULT_LANDING_PATH_LENGTH)
                        .collect(),
                );
            }
            "cursor" if !value.is_empty() => cursor = Some(value.to_string()),
            "organizationName" if safe_segment(value) => {
                organization_name = Some(value.to_string())
            }
            "ownerName" if safe_segment(value) => owner_name = Some(value.to_string()),
            "projectName" if safe_segment(value) => project_name = Some(value.to_string()),
            "types" if !value.is_empty() => types.push(value.to_string()),
            _ => {}
        }
    }

    let mut params = vec![format!("pageSize={page_size}"), format!("scope={scope}")];
    if let Some(query_value) = query_value {
        params.push(format!("query={query_value}"));
    }
    if let Some(cursor) = cursor {
        params.push(format!("cursor={cursor}"));
    }
    if scope == "organization" {
        if let Some(organization_name) = organization_name {
            params.push(format!("organizationName={organization_name}"));
        }
    }
    if scope == "project" {
        if let Some(owner_name) = owner_name {
            params.push(format!("ownerName={owner_name}"));
        }
        if let Some(project_name) = project_name {
            params.push(format!("projectName={project_name}"));
        }
    }
    for value in types {
        params.push(format!("types={value}"));
    }

    let normalized = format!("/search?{}", params.join("&"));
    if normalized.len() <= MAX_DEFAULT_LANDING_PATH_LENGTH {
        Some(normalized)
    } else {
        None
    }
}

fn normalize_project_or_profile_path(pathname: &str) -> Option<String> {
    let parts: Vec<&str> = pathname
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect();
    if parts.is_empty() {
        return None;
    }

    if parts[0] == "users" {
        return (parts.len() == 2 && safe_segment(parts[1]))
            .then(|| format!("/users/{}", parts[1]));
    }

    if parts[0] == "organizations" {
        return (parts.len() == 2 && parts[1] != "new" && safe_segment(parts[1]))
            .then(|| format!("/organizations/{}", parts[1]));
    }

    if matches!(
        parts[0],
        "api"
            | "forgot-password"
            | "login"
            | "me"
            | "organizations"
            | "projects"
            | "protected"
            | "register"
            | "reset-password"
            | "search"
    ) {
        return None;
    }

    if parts.len() < 2 || !safe_segment(parts[0]) || !safe_segment(parts[1]) {
        return None;
    }

    if parts.len() == 2 {
        return Some(format!("/{}/{}", parts[0], parts[1]));
    }

    if parts.len() == 3
        && matches!(
            parts[2],
            "code" | "branches" | "issues" | "pulls" | "discussions"
        )
    {
        return Some(format!("/{}/{}/{}", parts[0], parts[1], parts[2]));
    }

    if parts.len() == 4 && parts[2] == "commit" && safe_commit_oid(parts[3]) {
        return Some(format!("/{}/{}/commit/{}", parts[0], parts[1], parts[3]));
    }

    if parts.len() == 4 && parts[2] == "issues" && safe_positive_segment(parts[3]) {
        return Some(format!("/{}/{}/issues/{}", parts[0], parts[1], parts[3]));
    }

    if parts.len() == 4 && parts[2] == "pulls" && safe_positive_segment(parts[3]) {
        return Some(format!("/{}/{}/pulls/{}", parts[0], parts[1], parts[3]));
    }

    if parts.len() == 4 && parts[2] == "discussions" && safe_positive_segment(parts[3]) {
        return Some(format!(
            "/{}/{}/discussions/{}",
            parts[0], parts[1], parts[3]
        ));
    }

    None
}

pub fn normalize_default_landing_path(path: Option<&str>) -> Option<String> {
    let trimmed = path?.trim();
    if trimmed.is_empty()
        || trimmed.len() > MAX_DEFAULT_LANDING_PATH_LENGTH
        || !trimmed.starts_with('/')
    {
        return None;
    }

    let (pathname, query) = trimmed
        .split_once('?')
        .map_or((trimmed, ""), |(pathname, query)| (pathname, query));
    let pathname = normalize_pathname(pathname);

    if matches!(
        pathname.as_str(),
        "/" | "/protected" | "/login" | "/register" | "/forgot-password" | "/reset-password"
    ) {
        return None;
    }

    if pathname == "/me" {
        return Some("/me".to_string());
    }

    if pathname == "/search" {
        return normalize_search_path(query);
    }

    let normalized = normalize_project_or_profile_path(&pathname)?;
    (normalized.len() <= MAX_DEFAULT_LANDING_PATH_LENGTH).then_some(normalized)
}

pub fn resolve_post_auth_landing_path(
    redirect_path: Option<&str>,
    saved_default_landing_path: Option<&str>,
) -> String {
    normalize_default_landing_path(redirect_path)
        .or_else(|| normalize_default_landing_path(saved_default_landing_path))
        .unwrap_or_else(|| DEFAULT_LANDING_FALLBACK_PATH.to_string())
}
