use super::EndpointStatus;
use serde_json::Value;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyProjectUserRef {
    pub login_id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyProjectMemberRef {
    pub login_id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyProjectLabelRef {
    pub label_name: Option<String>,
    pub label_color: Option<String>,
    pub category: Option<String>,
    pub is_exclusive: Option<bool>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyProjectMilestoneRef {
    pub id: Option<i64>,
    pub title: Option<String>,
    pub state: Option<String>,
    pub description: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyProjectMenuSettings {
    pub code: Option<bool>,
    pub issue: Option<bool>,
    pub pull_request: Option<bool>,
    pub review: Option<bool>,
    pub milestone: Option<bool>,
    pub board: Option<bool>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyProjectResourceSummary {
    pub number: Option<i64>,
    pub id: Option<i64>,
    pub title: Option<String>,
    pub resource_type: Option<String>,
    pub author: Option<LegacyProjectUserRef>,
    pub state: Option<String>,
    pub milestone_id: Option<i64>,
    pub milestone_title: Option<String>,
    pub labels: Vec<LegacyProjectLabelRef>,
    pub attachment_count: usize,
    pub comment_count: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProjectScope {
    Private,
    Protected,
    Public,
}

impl ProjectScope {
    pub const fn as_legacy_str(self) -> &'static str {
        match self {
            Self::Private => "PRIVATE",
            Self::Protected => "PROTECTED",
            Self::Public => "PUBLIC",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProjectImportAction {
    Create,
    ConflictExistingProject,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedProjectExport {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub project_description: String,
    pub project_created_date: Option<String>,
    pub project_vcs: String,
    pub project_scope: ProjectScope,
    pub assignees: Vec<LegacyProjectUserRef>,
    pub authors: Vec<LegacyProjectUserRef>,
    pub member_count: usize,
    pub members: Vec<LegacyProjectMemberRef>,
    pub issue_count: usize,
    pub post_count: usize,
    pub milestone_count: usize,
    pub labels: Vec<LegacyProjectLabelRef>,
    pub issues: Vec<LegacyProjectResourceSummary>,
    pub posts: Vec<LegacyProjectResourceSummary>,
    pub milestones: Vec<LegacyProjectMilestoneRef>,
    pub menu_settings: Option<LegacyProjectMenuSettings>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedProjectImport {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub project_description: String,
    pub project_created_date: Option<String>,
    pub project_vcs: String,
    pub project_scope: ProjectScope,
    pub members: Vec<LegacyProjectMemberRef>,
    pub menu_settings: LegacyProjectMenuSettings,
    pub action: ProjectImportAction,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProjectLabelAction {
    Create,
    ConflictExistingLabel,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedProjectLabelImport {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub labels: Vec<NormalizedProjectLabelItem>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedProjectLabelItem {
    pub label_name: String,
    pub label_color: String,
    pub category: String,
    pub is_exclusive_token_is_boolean: bool,
    pub action: ProjectLabelAction,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedProjectLabelResponse {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub labels: Vec<NormalizedProjectLabelResponseItem>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedProjectLabelResponseItem {
    pub status: Option<i64>,
    pub label: Option<String>,
    pub category: Option<String>,
    pub label_color: Option<String>,
    pub is_exclusive: Option<bool>,
    pub reason: Option<String>,
    pub message: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedProjectTitleHeads {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub query: String,
    pub entries: Vec<NormalizedProjectTitleHeadEntry>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedProjectTitleHeadEntry {
    pub name: Option<String>,
    pub frequency: Option<i64>,
    pub category: Option<String>,
    pub search_text: Option<String>,
    pub category_id: Option<i64>,
    pub id: Option<i64>,
    pub label_color: Option<String>,
    pub is_exclusive: Option<bool>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProjectAdapterError {
    InvalidJson(String),
    InvalidPath {
        path: String,
        expected: &'static str,
    },
    MissingProjectName,
    InvalidExportPayload,
    InvalidLabelPayload,
    InvalidLabelItem,
    InvalidTitleHeadsPayload,
}

impl std::fmt::Display for ProjectAdapterError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidJson(error) => write!(formatter, "invalid project legacy JSON: {error}"),
            Self::InvalidPath { path, expected } => {
                write!(
                    formatter,
                    "invalid project legacy path `{path}`; expected {expected}"
                )
            }
            Self::MissingProjectName => {
                write!(formatter, "missing required project field `projectName`")
            }
            Self::InvalidExportPayload => {
                write!(formatter, "project export payload must be a JSON object")
            }
            Self::InvalidLabelPayload => {
                write!(
                    formatter,
                    "project label payload must include a JSON labels array"
                )
            }
            Self::InvalidLabelItem => {
                write!(
                    formatter,
                    "project label item is missing legacy scalar fields"
                )
            }
            Self::InvalidTitleHeadsPayload => {
                write!(
                    formatter,
                    "project titleHeads payload must include a JSON result array"
                )
            }
        }
    }
}

impl std::error::Error for ProjectAdapterError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuthRequirement {
    DeletePermission,
    SiteManagerSession,
    IssueLabelCreatePermission,
    ReadPermission,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MigrationDirection {
    Export,
    Import,
    AppOwned,
    Deferred,
}

impl MigrationDirection {
    pub const fn endpoint_status(self) -> EndpointStatus {
        match self {
            Self::Export => EndpointStatus::MigratorExport,
            Self::Import => EndpointStatus::MigratorImport,
            Self::AppOwned => EndpointStatus::AppOwned,
            Self::Deferred => EndpointStatus::MigratorDeferred,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct FixtureShape {
    pub path_fields: &'static [&'static str],
    pub query_fields: &'static [&'static str],
    pub header_fields: &'static [&'static str],
    pub body_fields: &'static [&'static str],
    pub response_fields: &'static [&'static str],
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ProjectEndpointFixture {
    pub method: &'static str,
    pub path: &'static str,
    pub legacy_controller: &'static str,
    pub legacy_action: &'static str,
    pub direction: MigrationDirection,
    pub auth: AuthRequirement,
    pub request: FixtureShape,
    pub response: FixtureShape,
    pub migration_payload: Option<ProjectMigrationPayloadFixture>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ProjectMigrationPayloadFixture {
    pub sample_path: &'static str,
    pub request_json: Option<&'static str>,
    pub success_status: u16,
    pub success_json: &'static str,
    pub alternate_status: Option<u16>,
    pub alternate_json: Option<&'static str>,
}

pub fn fixtures() -> &'static [ProjectEndpointFixture] {
    PROJECT_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static ProjectEndpointFixture> {
    PROJECT_ENDPOINT_FIXTURES
        .iter()
        .find(|fixture| fixture.method == method && fixture.path == path)
}

pub fn parse_project_export_response(
    sample_path: &str,
    response_json: &str,
) -> Result<NormalizedProjectExport, ProjectAdapterError> {
    let (path_owner, path_project_name) = parse_project_export_path(sample_path)?;
    let payload = parse_json(response_json)?;
    if !payload.is_object() {
        return Err(ProjectAdapterError::InvalidExportPayload);
    }

    let owner = text_field(&payload, "owner").unwrap_or(path_owner);
    let project_name = text_field(&payload, "projectName").unwrap_or(path_project_name);
    let members = member_refs(&payload, "members");
    let issues = resource_summaries(&payload, "issues");
    let posts = resource_summaries(&payload, "posts");
    let milestones = milestone_refs(&payload, "milestones");

    Ok(NormalizedProjectExport {
        endpoint_method: "GET",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/exports",
        owner,
        project_name,
        project_description: text_field(&payload, "projectDescription").unwrap_or_default(),
        project_created_date: text_field(&payload, "projectCreatedDate"),
        project_vcs: text_field(&payload, "projectVcs").unwrap_or_else(|| "GIT".to_string()),
        project_scope: project_scope(&payload),
        assignees: user_refs(&payload, "assignees"),
        authors: user_refs(&payload, "authors"),
        member_count: text_field(&payload, "memberCount")
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or(members.len()),
        members,
        issue_count: text_field(&payload, "issueCount")
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or(issues.len()),
        post_count: text_field(&payload, "postCount")
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or(posts.len()),
        milestone_count: text_field(&payload, "milestoneCount")
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or(milestones.len()),
        labels: label_refs(&payload, "labels"),
        issues,
        posts,
        milestones,
        menu_settings: find_value(&payload, "menuSettings")
            .or_else(|| find_value(&payload, "projectMenuSetting"))
            .map(menu_settings),
    })
}

pub fn parse_project_import_request(
    sample_path: &str,
    request_json: &str,
    existing_projects: &[(&str, &str)],
) -> Result<NormalizedProjectImport, ProjectAdapterError> {
    let owner = parse_project_import_path(sample_path)?;
    let payload = parse_json(request_json)?;
    let project_name =
        text_field(&payload, "projectName").ok_or(ProjectAdapterError::MissingProjectName)?;
    let action = if existing_projects
        .iter()
        .any(|(existing_owner, existing_project_name)| {
            existing_owner.eq_ignore_ascii_case(&owner)
                && existing_project_name.eq_ignore_ascii_case(&project_name)
        }) {
        ProjectImportAction::ConflictExistingProject
    } else {
        ProjectImportAction::Create
    };

    Ok(NormalizedProjectImport {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/owners/:owner/projects",
        owner,
        project_name,
        project_description: text_field(&payload, "projectDescription").unwrap_or_default(),
        project_created_date: text_field(&payload, "projectCreatedDate"),
        project_vcs: text_field(&payload, "projectVcs").unwrap_or_else(|| "GIT".to_string()),
        project_scope: project_scope(&payload),
        members: member_refs(&payload, "members"),
        menu_settings: find_value(&payload, "menuSettings")
            .or_else(|| find_value(&payload, "projectMenuSetting"))
            .map(menu_settings)
            .unwrap_or_else(default_import_menu_settings),
        action,
    })
}

pub fn parse_project_label_import_request(
    sample_path: &str,
    request_json: &str,
    existing_labels: &[(&str, &str)],
) -> Result<NormalizedProjectLabelImport, ProjectAdapterError> {
    let (owner, project_name) = parse_project_label_path(sample_path)?;
    let payload = parse_json(request_json)?;
    let labels = find_value(&payload, "labels")
        .and_then(Value::as_array)
        .ok_or(ProjectAdapterError::InvalidLabelPayload)?
        .iter()
        .map(|label| normalize_label_item(label, existing_labels))
        .collect::<Result<Vec<_>, _>>()?;

    Ok(NormalizedProjectLabelImport {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/labels",
        owner,
        project_name,
        labels,
    })
}

pub fn parse_project_label_response(
    response_json: &str,
) -> Result<NormalizedProjectLabelResponse, ProjectAdapterError> {
    let payload = parse_json(response_json)?;
    let labels = payload
        .as_array()
        .ok_or(ProjectAdapterError::InvalidLabelPayload)?
        .iter()
        .map(|label| NormalizedProjectLabelResponseItem {
            status: find_value(label, "status").and_then(integer_field),
            label: text_field(label, "label"),
            category: text_field(label, "category"),
            label_color: text_field(label, "labelColor"),
            is_exclusive: find_value(label, "isExclusive").and_then(bool_field),
            reason: text_field(label, "reason"),
            message: text_field(label, "message"),
        })
        .collect();

    Ok(NormalizedProjectLabelResponse {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/labels",
        labels,
    })
}

pub fn parse_project_title_heads_response(
    sample_path: &str,
    response_json: &str,
) -> Result<NormalizedProjectTitleHeads, ProjectAdapterError> {
    let (owner, project_name, query) = parse_project_title_heads_path(sample_path)?;
    let payload = parse_json(response_json)?;
    let entries = find_value(&payload, "result")
        .and_then(Value::as_array)
        .ok_or(ProjectAdapterError::InvalidTitleHeadsPayload)?
        .iter()
        .map(|entry| NormalizedProjectTitleHeadEntry {
            name: text_field(entry, "name"),
            frequency: find_value(entry, "frequency").and_then(integer_field),
            category: text_field(entry, "category"),
            search_text: text_field(entry, "searchText"),
            category_id: find_value(entry, "categoryId").and_then(integer_field),
            id: find_value(entry, "id").and_then(integer_field),
            label_color: text_field(entry, "labelColor"),
            is_exclusive: find_value(entry, "isExclusive").and_then(bool_field),
        })
        .collect();

    Ok(NormalizedProjectTitleHeads {
        endpoint_method: "GET",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads",
        owner,
        project_name,
        query,
        entries,
    })
}

fn parse_json(payload: &str) -> Result<Value, ProjectAdapterError> {
    serde_json::from_str(payload)
        .map_err(|error| ProjectAdapterError::InvalidJson(error.to_string()))
}

fn parse_project_export_path(path: &str) -> Result<(String, String), ProjectAdapterError> {
    let parts: Vec<&str> = path.split('/').filter(|part| !part.is_empty()).collect();
    match parts.as_slice() {
        ["-_-api", "v1", "owners", owner, "projects", project_name, "exports"] => {
            Ok(((*owner).to_string(), (*project_name).to_string()))
        }
        _ => Err(ProjectAdapterError::InvalidPath {
            path: path.to_string(),
            expected: "/-_-api/v1/owners/:owner/projects/:projectName/exports",
        }),
    }
}

fn parse_project_import_path(path: &str) -> Result<String, ProjectAdapterError> {
    let parts: Vec<&str> = path.split('/').filter(|part| !part.is_empty()).collect();
    match parts.as_slice() {
        ["-_-api", "v1", "owners", owner, "projects"] => Ok((*owner).to_string()),
        _ => Err(ProjectAdapterError::InvalidPath {
            path: path.to_string(),
            expected: "/-_-api/v1/owners/:owner/projects",
        }),
    }
}

fn parse_project_label_path(path: &str) -> Result<(String, String), ProjectAdapterError> {
    let path_without_query = path.split_once('?').map_or(path, |(path, _query)| path);
    let parts: Vec<&str> = path_without_query
        .split('/')
        .filter(|part| !part.is_empty())
        .collect();
    match parts.as_slice() {
        ["-_-api", "v1", "owners", owner, "projects", project_name, "labels"] => {
            Ok(((*owner).to_string(), (*project_name).to_string()))
        }
        _ => Err(ProjectAdapterError::InvalidPath {
            path: path.to_string(),
            expected: "/-_-api/v1/owners/:owner/projects/:projectName/labels",
        }),
    }
}

fn parse_project_title_heads_path(
    path: &str,
) -> Result<(String, String, String), ProjectAdapterError> {
    let (path_without_query, query_string) = path.split_once('?').unwrap_or((path, ""));
    let parts: Vec<&str> = path_without_query
        .split('/')
        .filter(|part| !part.is_empty())
        .collect();
    match parts.as_slice() {
        ["-_-api", "v1", "owners", owner, "projects", project_name, "titleHeads"] => Ok((
            (*owner).to_string(),
            (*project_name).to_string(),
            query_param(query_string, "query").unwrap_or_default(),
        )),
        _ => Err(ProjectAdapterError::InvalidPath {
            path: path.to_string(),
            expected: "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads",
        }),
    }
}

fn query_param(query_string: &str, key: &str) -> Option<String> {
    query_string.split('&').find_map(|pair| {
        let (name, value) = pair.split_once('=').unwrap_or((pair, ""));
        (name == key).then(|| value.to_string())
    })
}

fn user_ref(value: &Value) -> LegacyProjectUserRef {
    LegacyProjectUserRef {
        login_id: text_field(value, "loginId"),
        name: text_field(value, "name"),
        email: text_field(value, "email"),
    }
}

fn user_refs(value: &Value, key: &str) -> Vec<LegacyProjectUserRef> {
    match find_value(value, key) {
        Some(Value::Array(values)) => values.iter().map(user_ref).collect(),
        Some(value) if value.is_object() => vec![user_ref(value)],
        _ => Vec::new(),
    }
}

fn member_refs(value: &Value, key: &str) -> Vec<LegacyProjectMemberRef> {
    match find_value(value, key) {
        Some(Value::Array(values)) => values
            .iter()
            .map(|member| LegacyProjectMemberRef {
                login_id: text_field(member, "loginId"),
                name: text_field(member, "name"),
                email: text_field(member, "email"),
                role: text_field(member, "role"),
            })
            .collect(),
        Some(value) if value.is_object() => vec![LegacyProjectMemberRef {
            login_id: text_field(value, "loginId"),
            name: text_field(value, "name"),
            email: text_field(value, "email"),
            role: text_field(value, "role"),
        }],
        _ => Vec::new(),
    }
}

fn normalize_label_item(
    label: &Value,
    existing_labels: &[(&str, &str)],
) -> Result<NormalizedProjectLabelItem, ProjectAdapterError> {
    let label_name = text_field(label, "labelName").ok_or(ProjectAdapterError::InvalidLabelItem)?;
    let label_color =
        text_field(label, "labelColor").ok_or(ProjectAdapterError::InvalidLabelItem)?;
    let category = text_field(label, "category").ok_or(ProjectAdapterError::InvalidLabelItem)?;
    let is_exclusive_token_is_boolean =
        find_value(label, "isExclusive").is_some_and(Value::is_boolean);
    let action = if existing_labels
        .iter()
        .any(|(name, existing_category)| name == &label_name && existing_category == &category)
    {
        ProjectLabelAction::ConflictExistingLabel
    } else {
        ProjectLabelAction::Create
    };

    Ok(NormalizedProjectLabelItem {
        label_name,
        label_color,
        category,
        is_exclusive_token_is_boolean,
        action,
    })
}

fn label_refs(value: &Value, key: &str) -> Vec<LegacyProjectLabelRef> {
    match find_value(value, key) {
        Some(Value::Array(values)) => values
            .iter()
            .map(|label| LegacyProjectLabelRef {
                label_name: text_field(label, "labelName"),
                label_color: text_field(label, "labelColor"),
                category: text_field(label, "category"),
                is_exclusive: find_value(label, "isExclusive").and_then(bool_field),
            })
            .collect(),
        _ => Vec::new(),
    }
}

fn milestone_refs(value: &Value, key: &str) -> Vec<LegacyProjectMilestoneRef> {
    match find_value(value, key) {
        Some(Value::Array(values)) => values
            .iter()
            .map(|milestone| LegacyProjectMilestoneRef {
                id: find_value(milestone, "id").and_then(integer_field),
                title: text_field(milestone, "title"),
                state: text_field(milestone, "state"),
                description: text_field(milestone, "description"),
                due_date: text_field(milestone, "dueDate"),
            })
            .collect(),
        _ => Vec::new(),
    }
}

fn resource_summaries(value: &Value, key: &str) -> Vec<LegacyProjectResourceSummary> {
    match find_value(value, key) {
        Some(Value::Array(values)) => values
            .iter()
            .map(|resource| LegacyProjectResourceSummary {
                number: find_value(resource, "number").and_then(integer_field),
                id: find_value(resource, "id").and_then(integer_field),
                title: text_field(resource, "title"),
                resource_type: text_field(resource, "type"),
                author: find_value(resource, "author").map(user_ref),
                state: text_field(resource, "state"),
                milestone_id: find_value(resource, "milestoneId").and_then(integer_field),
                milestone_title: text_field(resource, "milestoneTitle"),
                labels: label_refs(resource, "labels"),
                attachment_count: find_value(resource, "attachments")
                    .and_then(Value::as_array)
                    .map_or(0, Vec::len),
                comment_count: find_value(resource, "comments")
                    .and_then(Value::as_array)
                    .map_or(0, Vec::len),
            })
            .collect(),
        _ => Vec::new(),
    }
}

fn menu_settings(value: &Value) -> LegacyProjectMenuSettings {
    LegacyProjectMenuSettings {
        code: find_value(value, "code").and_then(bool_field),
        issue: find_value(value, "issue").and_then(bool_field),
        pull_request: find_value(value, "pullRequest").and_then(bool_field),
        review: find_value(value, "review").and_then(bool_field),
        milestone: find_value(value, "milestone").and_then(bool_field),
        board: find_value(value, "board").and_then(bool_field),
    }
}

fn default_import_menu_settings() -> LegacyProjectMenuSettings {
    LegacyProjectMenuSettings {
        code: Some(true),
        issue: Some(true),
        pull_request: Some(true),
        review: Some(true),
        milestone: Some(true),
        board: Some(true),
    }
}

fn project_scope(value: &Value) -> ProjectScope {
    match text_field(value, "projectScope").as_deref() {
        Some("PUBLIC") => ProjectScope::Public,
        Some("PROTECTED") => ProjectScope::Protected,
        _ => ProjectScope::Private,
    }
}

fn text_field(value: &Value, key: &str) -> Option<String> {
    find_value(value, key).and_then(|value| match value {
        Value::Null => None,
        Value::String(text) => Some(text.clone()),
        Value::Bool(flag) => Some(flag.to_string()),
        Value::Number(number) => Some(number.to_string()),
        other => Some(other.to_string()),
    })
}

fn integer_field(value: &Value) -> Option<i64> {
    match value {
        Value::Number(number) => number.as_i64(),
        Value::String(text) => text.parse::<i64>().ok(),
        Value::Bool(flag) => Some(i64::from(*flag)),
        _ => None,
    }
}

fn bool_field(value: &Value) -> Option<bool> {
    match value {
        Value::Bool(flag) => Some(*flag),
        Value::String(text) if text.eq_ignore_ascii_case("true") => Some(true),
        Value::String(text) if text.eq_ignore_ascii_case("false") => Some(false),
        Value::Number(number) => number.as_i64().map(|value| value != 0),
        _ => None,
    }
}

fn find_value<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
    match value {
        Value::Object(map) => {
            if let Some(found) = map.get(key) {
                return Some(found);
            }
            map.values().find_map(|nested| find_value(nested, key))
        }
        Value::Array(values) => values.iter().find_map(|nested| find_value(nested, key)),
        _ => None,
    }
}

const fn shape(
    path_fields: &'static [&'static str],
    query_fields: &'static [&'static str],
    header_fields: &'static [&'static str],
    body_fields: &'static [&'static str],
    response_fields: &'static [&'static str],
) -> FixtureShape {
    FixtureShape {
        path_fields,
        query_fields,
        header_fields,
        body_fields,
        response_fields,
    }
}

const PROJECT_ENDPOINT_FIXTURES: &[ProjectEndpointFixture] = &[
    ProjectEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/exports",
        legacy_controller: "controllers.api.ProjectApi",
        legacy_action: "exports",
        direction: MigrationDirection::Export,
        auth: AuthRequirement::DeletePermission,
        request: shape(&["owner", "projectName"], &[], &[], &[], &[]),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "owner",
                "projectName",
                "projectDescription",
                "projectCreatedDate",
                "projectVcs",
                "projectScope",
                "assignees",
                "authors",
                "memberCount",
                "members",
                "issueCount",
                "postCount",
                "milestoneCount",
                "labels",
                "issues",
                "posts",
                "milestones",
            ],
        ),
        migration_payload: Some(PROJECT_EXPORT_PAYLOAD),
    },
    ProjectEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects",
        legacy_controller: "controllers.api.ProjectApi",
        legacy_action: "newProject",
        direction: MigrationDirection::Import,
        auth: AuthRequirement::SiteManagerSession,
        request: shape(
            &["owner"],
            &[],
            &[],
            &[
                "projectName",
                "projectDescription",
                "projectCreatedDate",
                "projectVcs",
                "projectScope",
                "members",
                "email",
                "role",
            ],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "id", "owner", "name", "overview", "vcs", "status", "reason", "project",
            ],
        ),
        migration_payload: Some(PROJECT_IMPORT_PAYLOAD),
    },
    ProjectEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/labels",
        legacy_controller: "controllers.api.ProjectApi",
        legacy_action: "newLabel",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueLabelCreatePermission,
        request: shape(
            &["owner", "projectName"],
            &[],
            &[],
            &[
                "labels",
                "labelName",
                "labelColor",
                "category",
                "isExclusive",
            ],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "status",
                "label",
                "category",
                "labelColor",
                "isExclusive",
                "reason",
                "message",
            ],
        ),
        migration_payload: None,
    },
    ProjectEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads",
        legacy_controller: "controllers.api.ProjectApi",
        legacy_action: "titleHeads",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::ReadPermission,
        request: shape(&["owner", "projectName"], &["query"], &["Accept"], &[], &[]),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "result",
                "name",
                "frequency",
                "category",
                "searchText",
                "categoryId",
                "id",
                "labelColor",
                "isExclusive",
            ],
        ),
        migration_payload: None,
    },
];

const PROJECT_EXPORT_PAYLOAD: ProjectMigrationPayloadFixture = ProjectMigrationPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/exports",
    request_json: None,
    success_status: 200,
    success_json: r##"{
  "owner": "alice",
  "projectName": "demo",
  "projectDescription": "Legacy project",
  "projectCreatedDate": "2026-06-01 AM 09:00:00 +0900",
  "projectVcs": "GIT",
  "projectScope": "PUBLIC",
  "assignees": [
    {
      "loginId": "assignee",
      "name": "Assignee User",
      "email": "assignee@example.com"
    }
  ],
  "authors": [
    {
      "loginId": "author",
      "name": "Author User",
      "email": "author@example.com"
    }
  ],
  "memberCount": 1,
  "members": [
    {
      "loginId": "alice",
      "name": "Alice Owner",
      "role": "manager",
      "email": "alice@example.com"
    }
  ],
  "issueCount": 1,
  "postCount": 1,
  "milestoneCount": 1,
  "labels": [
    {
      "labelName": "Bug",
      "labelColor": "#2196f3",
      "category": "Type",
      "isExclusive": false
    }
  ],
  "issues": [
    {
      "number": 3,
      "id": 30,
      "title": "Legacy issue",
      "type": "ISSUE_POST",
      "author": {
        "loginId": "author",
        "name": "Author User",
        "email": "author@example.com"
      },
      "createdAt": "2026-06-01T00:00:00Z",
      "updatedAt": "2026-06-02T00:00:00Z",
      "body": "legacy issue body",
      "owner": "alice",
      "projectName": "demo",
      "assignees": [
        {
          "loginId": "assignee",
          "name": "Assignee User",
          "email": "assignee@example.com"
        }
      ],
      "state": "CLOSED",
      "labels": [
        {
          "labelName": "Bug",
          "labelColor": "#2196f3",
          "category": "Type"
        }
      ],
      "milestoneId": 7,
      "milestoneTitle": "M1",
      "dueDate": "2026-06-30 PM 11:59:59 +0900",
      "refUrl": "https://yona.example.com/alice/demo/issue/3",
      "attachments": [
        {
          "id": 301,
          "name": "issue.png",
          "hash": "issue-hash",
          "mimeType": "image/png",
          "size": 123,
          "containerType": "ISSUE_POST",
          "containerId": "30",
          "ownerLoginId": "author"
        }
      ],
      "comments": [
        {
          "id": 40,
          "type": "ISSUE_COMMENT",
          "author": {
            "loginId": "commenter",
            "name": "Commenter User",
            "email": "commenter@example.com"
          },
          "createdAt": "2026-06-03T00:00:00Z",
          "body": "issue comment",
          "attachments": [
            {
              "id": 401,
              "name": "issue-comment.txt",
              "hash": "issue-comment-hash",
              "mimeType": "text/plain",
              "size": 45,
              "containerType": "ISSUE_COMMENT",
              "containerId": "40",
              "ownerLoginId": "commenter"
            }
          ],
          "childComments": [
            {
              "id": 41,
              "type": "ISSUE_COMMENT",
              "author": {
                "loginId": "commenter",
                "name": "Commenter User",
                "email": "commenter@example.com"
              },
              "createdAt": "2026-06-03T01:00:00Z",
              "body": "child issue comment"
            }
          ]
        }
      ]
    }
  ],
  "posts": [
    {
      "number": 4,
      "id": 50,
      "title": "Legacy post",
      "type": "BOARD_POST",
      "author": {
        "loginId": "author",
        "name": "Author User",
        "email": "author@example.com"
      },
      "createdAt": "2026-06-04T00:00:00Z",
      "updatedAt": "2026-06-05T00:00:00Z",
      "body": "legacy post body",
      "owner": "alice",
      "projectName": "demo",
      "labels": [
        {
          "labelName": "Bug",
          "labelColor": "#2196f3",
          "category": "Type"
        }
      ],
      "comments": [
        {
          "id": 51,
          "type": "NONISSUE_COMMENT",
          "author": {
            "loginId": "commenter",
            "name": "Commenter User",
            "email": "commenter@example.com"
          },
          "createdAt": "2026-06-06T00:00:00Z",
          "body": "post comment"
        }
      ]
    }
  ],
  "milestones": [
    {
      "id": 7,
      "title": "M1",
      "state": "open",
      "description": "First milestone",
      "dueDate": "2026-06-30 PM 11:59:59 +0900"
    }
  ]
}"##,
    alternate_status: None,
    alternate_json: None,
};

const PROJECT_IMPORT_PAYLOAD: ProjectMigrationPayloadFixture = ProjectMigrationPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects",
    request_json: Some(
        r##"{
  "projectName": "demo",
  "projectDescription": "Legacy project",
  "projectCreatedDate": "2026-06-01 AM 09:00:00 +0900",
  "projectVcs": "GIT",
  "projectScope": "PUBLIC",
  "members": [
    {
      "loginId": "alice",
      "name": "Alice Owner",
      "email": "alice@example.com",
      "role": "manager"
    },
    {
      "loginId": "member",
      "name": "Member User",
      "email": "member@example.com",
      "role": "member"
    }
  ]
}"##,
    ),
    success_status: 201,
    success_json: r##"{
  "id": 10,
  "owner": "alice",
  "name": "demo",
  "overview": "Legacy project",
  "vcs": "GIT"
}"##,
    alternate_status: Some(400),
    alternate_json: Some(
        r##"{
  "status": 409,
  "reason": "Conflict",
  "project": {
    "id": 10,
    "owner": "alice",
    "name": "demo",
    "overview": "Legacy project",
    "vcs": "GIT"
  }
}"##,
    ),
};
