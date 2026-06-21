use super::EndpointStatus;
use serde_json::Value;
use std::collections::BTreeSet;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuthRequirement {
    AuthorizationTokenHeader,
    AuthorizationTokenOrImportSession,
    AnonymousCheck,
    CurrentUserSession,
    IssueCreatePermission,
    IssueUpdatePermission,
    ProjectReadJsonAccept,
    AnonymousJsonAccept,
    LoginSession,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MigrationDirection {
    Export,
    Import,
    Deferred,
    AppOwned,
}

impl MigrationDirection {
    pub const fn endpoint_status(self) -> EndpointStatus {
        match self {
            Self::Export => EndpointStatus::MigratorExport,
            Self::Import => EndpointStatus::MigratorImport,
            Self::Deferred => EndpointStatus::MigratorDeferred,
            Self::AppOwned => EndpointStatus::AppOwned,
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
pub struct IssueEndpointFixture {
    pub method: &'static str,
    pub path: &'static str,
    pub legacy_controller: &'static str,
    pub legacy_action: &'static str,
    pub direction: MigrationDirection,
    pub auth: AuthRequirement,
    pub request: FixtureShape,
    pub response: FixtureShape,
    pub migration_payload: Option<IssueMigrationPayloadFixture>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct IssueMigrationPayloadFixture {
    pub sample_path: &'static str,
    pub request_json: Option<&'static str>,
    pub success_status: u16,
    pub success_json: &'static str,
    pub alternate_status: Option<u16>,
    pub alternate_json: Option<&'static str>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyAuthorRef {
    pub login_id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyIssueLabelRef {
    pub label_name: Option<String>,
    pub label_color: Option<String>,
    pub category: Option<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum IssueState {
    Open,
    Closed,
}

impl IssueState {
    pub const fn as_legacy_str(self) -> &'static str {
        match self {
            Self::Open => "OPEN",
            Self::Closed => "CLOSED",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum IssueImportAction {
    Create,
    ConflictExistingNumber,
    ConflictEarlierInBatch,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedIssueImport {
    pub source_index: usize,
    pub author: Option<LegacyAuthorRef>,
    pub title: String,
    pub body: String,
    pub state: IssueState,
    pub requested_number: Option<i64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub assignees: Vec<LegacyAuthorRef>,
    pub milestone_title: Option<String>,
    pub due_date: Option<String>,
    pub labels: Vec<LegacyIssueLabelRef>,
    pub temporary_upload_files: Vec<String>,
    pub action: IssueImportAction,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueImportBatch {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub send_notification: bool,
    pub entries: Vec<NormalizedIssueImport>,
}

impl IssueImportBatch {
    pub fn creatable_entries(&self) -> impl Iterator<Item = &NormalizedIssueImport> {
        self.entries
            .iter()
            .filter(|entry| entry.action == IssueImportAction::Create)
    }

    pub fn conflict_entries(&self) -> impl Iterator<Item = &NormalizedIssueImport> {
        self.entries
            .iter()
            .filter(|entry| entry.action != IssueImportAction::Create)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum IssueAdapterError {
    InvalidJson(String),
    InvalidPath(String),
    MissingIssuesArray,
    InvalidIssueItem { index: usize },
    MissingField { index: usize, field: &'static str },
}

impl std::fmt::Display for IssueAdapterError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidJson(error) => write!(formatter, "invalid issue import JSON: {error}"),
            Self::InvalidPath(path) => write!(
                formatter,
                "invalid issue import path `{path}`; expected /-_-api/v1/owners/:owner/projects/:projectName/issues"
            ),
            Self::MissingIssuesArray => {
                write!(formatter, "No issues key exists or value wasn't array!")
            }
            Self::InvalidIssueItem { index } => {
                write!(formatter, "issue item at index {index} must be a JSON object")
            }
            Self::MissingField { index, field } => {
                write!(formatter, "missing required issue field `{field}` at index {index}")
            }
        }
    }
}

impl std::error::Error for IssueAdapterError {}

pub fn fixtures() -> &'static [IssueEndpointFixture] {
    ISSUE_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static IssueEndpointFixture> {
    ISSUE_ENDPOINT_FIXTURES
        .iter()
        .find(|fixture| fixture.method == method && fixture.path == path)
}

pub fn parse_issue_import_request(
    sample_path: &str,
    request_json: &str,
    existing_numbers: &[i64],
) -> Result<IssueImportBatch, IssueAdapterError> {
    let (owner, project_name) = parse_issue_import_path(sample_path)?;
    let payload: Value = serde_json::from_str(request_json)
        .map_err(|error| IssueAdapterError::InvalidJson(error.to_string()))?;
    let issues = find_value(&payload, "issues")
        .and_then(Value::as_array)
        .ok_or(IssueAdapterError::MissingIssuesArray)?;
    let send_notification = find_value(&payload, "sendNotification")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let mut seen_numbers: BTreeSet<i64> = existing_numbers.iter().copied().collect();
    let existing_number_set = seen_numbers.clone();
    let mut entries = Vec::with_capacity(issues.len());

    for (source_index, issue) in issues.iter().enumerate() {
        if !issue.is_object() {
            return Err(IssueAdapterError::InvalidIssueItem {
                index: source_index,
            });
        }

        let requested_number = find_value(issue, "number").and_then(integer_field);
        let action = match requested_number {
            Some(number) if existing_number_set.contains(&number) => {
                IssueImportAction::ConflictExistingNumber
            }
            Some(number) if seen_numbers.contains(&number) => {
                IssueImportAction::ConflictEarlierInBatch
            }
            _ => IssueImportAction::Create,
        };
        if let Some(number) = requested_number {
            seen_numbers.insert(number);
        }

        entries.push(NormalizedIssueImport {
            source_index,
            author: find_value(issue, "author").map(author_ref),
            title: required_text_field(issue, source_index, "title")?,
            body: required_text_field(issue, source_index, "body")?,
            state: match text_field(issue, "state") {
                Some(state) if state.eq_ignore_ascii_case("OPEN") => IssueState::Open,
                Some(_) => IssueState::Closed,
                None => IssueState::Open,
            },
            requested_number,
            created_at: text_field(issue, "createdAt"),
            updated_at: text_field(issue, "updatedAt"),
            assignees: author_refs(issue, "assignees"),
            milestone_title: text_field(issue, "milestoneTitle"),
            due_date: text_field(issue, "dueDate"),
            labels: label_refs(issue),
            temporary_upload_files: upload_files(issue),
            action,
        });
    }

    Ok(IssueImportBatch {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/issues",
        owner,
        project_name,
        send_notification,
        entries,
    })
}

fn parse_issue_import_path(path: &str) -> Result<(String, String), IssueAdapterError> {
    let parts: Vec<&str> = path.split('/').filter(|part| !part.is_empty()).collect();
    match parts.as_slice() {
        ["-_-api", "v1", "owners", owner, "projects", project_name, "issues"] => {
            Ok(((*owner).to_string(), (*project_name).to_string()))
        }
        _ => Err(IssueAdapterError::InvalidPath(path.to_string())),
    }
}

fn author_ref(value: &Value) -> LegacyAuthorRef {
    LegacyAuthorRef {
        login_id: text_field(value, "loginId"),
        name: text_field(value, "name"),
        email: text_field(value, "email"),
    }
}

fn author_refs(value: &Value, key: &str) -> Vec<LegacyAuthorRef> {
    match find_value(value, key) {
        Some(Value::Array(values)) => values.iter().map(author_ref).collect(),
        Some(value) if value.is_object() => vec![author_ref(value)],
        _ => Vec::new(),
    }
}

fn label_refs(value: &Value) -> Vec<LegacyIssueLabelRef> {
    match find_value(value, "labels") {
        Some(Value::Array(labels)) => labels
            .iter()
            .map(|label| LegacyIssueLabelRef {
                label_name: text_field(label, "labelName"),
                label_color: text_field(label, "labelColor"),
                category: text_field(label, "category"),
            })
            .collect(),
        _ => Vec::new(),
    }
}

fn required_text_field(
    value: &Value,
    index: usize,
    key: &'static str,
) -> Result<String, IssueAdapterError> {
    text_field(value, key).ok_or(IssueAdapterError::MissingField { index, field: key })
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

fn upload_files(value: &Value) -> Vec<String> {
    match find_value(value, "temporaryUploadFiles") {
        Some(Value::Array(files)) => files
            .iter()
            .filter_map(|file| match file {
                Value::Null => None,
                Value::String(text) => Some(text.clone()),
                Value::Bool(flag) => Some(flag.to_string()),
                Value::Number(number) => Some(number.to_string()),
                other => Some(other.to_string()),
            })
            .collect(),
        Some(Value::Null) => Vec::new(),
        Some(Value::String(text)) if text.is_empty() => Vec::new(),
        Some(value) => vec![scalar_text(value)],
        None => Vec::new(),
    }
}

fn scalar_text(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(text) => text.clone(),
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => number.to_string(),
        other => other.to_string(),
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

const ISSUE_ENDPOINT_FIXTURES: &[IssueEndpointFixture] = &[
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "imports",
        direction: MigrationDirection::Import,
        auth: AuthRequirement::AnonymousCheck,
        request: shape(
            &["owner", "projectName"],
            &["postNumber"],
            &[],
            &[],
            &["badRequest"],
        ),
        response: shape(&[], &[], &[], &[], &["number"]),
        migration_payload: Some(ISSUE_IMPORTS_PAYLOAD),
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "newIssues",
        direction: MigrationDirection::Import,
        auth: AuthRequirement::IssueCreatePermission,
        request: shape(
            &["owner", "projectName"],
            &[],
            &[],
            &[
                "issues",
                "sendNotification",
                "author",
                "loginId",
                "name",
                "email",
                "title",
                "body",
                "state",
                "createdAt",
                "updatedAt",
                "assignees",
                "milestoneTitle",
                "dueDate",
                "labels",
                "labelName",
                "category",
                "temporaryUploadFiles",
                "number",
            ],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["status", "location"]),
        migration_payload: Some(ISSUE_BULK_IMPORT_PAYLOAD),
    },
    IssueEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "getIssue",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AuthorizationTokenHeader,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &["Authorization"],
            &[],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "result",
                "id",
                "number",
                "title",
                "body",
                "state",
                "author",
                "assignee",
                "labels",
                "milestone",
                "comments",
                "events",
                "eventType",
                "oldValue",
                "newValue",
                "actor",
            ],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "PUT",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateIssue",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AuthorizationTokenHeader,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &["Authorization"],
            &["title", "body", "state", "assignees", "milestoneTitle"],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["result", "events"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "PATCH",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateIssueState",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AuthorizationTokenHeader,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &["Authorization"],
            &["state"],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["result", "state", "events"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "PATCH",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/content",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateIssueContent",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["content", "original"],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["storedContent", "body"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "newIssueComment",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AuthorizationTokenOrImportSession,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &["Authorization"],
            &[
                "comment",
                "author",
                "body",
                "createdAt",
                "temporaryUploadFiles",
            ],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["status", "location", "result"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "PUT",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments/:commentId",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateIssueComment",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number", "commentId"],
            &[],
            &[],
            &["content", "original"],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &["result", "id", "contents", "createdDate", "author"],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/commentNotiReceivers",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "commentNotiRecivers",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::CurrentUserSession,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["comment", "parentCommentId"],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["receivers", "loginId", "name"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issuelabel/:number",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateIssueLabel",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::CurrentUserSession,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["labelId"],
            &[],
        ),
        response: shape(&[], &[], &[], &[], &["id", "labels"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignableUsers",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "findAssignableUsers",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::ProjectReadJsonAccept,
        request: shape(
            &["owner", "projectName", "number"],
            &["query", "type"],
            &["Accept"],
            &[],
            &[],
        ),
        response: shape(
            &[],
            &[],
            &["Content-Range"],
            &[],
            &["loginId", "name", "avatarUrl"],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/assignableUsers",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "findAssignableUsersOfProject",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::ProjectReadJsonAccept,
        request: shape(
            &["owner", "projectName"],
            &["query", "type"],
            &["Accept"],
            &[],
            &[],
        ),
        response: shape(
            &[],
            &[],
            &["Content-Range"],
            &[],
            &["loginId", "name", "avatarUrl"],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateAssginees",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["assignees"],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &["assignee", "loginId", "name", "issue"],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/findSharer",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "findSharerByloginIds",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AnonymousJsonAccept,
        request: shape(
            &["owner", "projectName", "number"],
            &["query"],
            &["Accept"],
            &[],
            &[],
        ),
        response: shape(&[], &[], &[], &[], &["loginId", "name", "avatarUrl"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/sharableUsers",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "findSharableUsers",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::ProjectReadJsonAccept,
        request: shape(
            &["owner", "projectName", "number"],
            &["query", "type"],
            &["Accept"],
            &[],
            &[],
        ),
        response: shape(
            &[],
            &[],
            &["Content-Range"],
            &[],
            &["loginId", "name", "avatarUrl", "projectName"],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateSharer",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["sharer", "type", "loginId", "action"],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["action", "sharer"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/upvoteWeight",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "upvoteWeight",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &[],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["weight"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/downvoteWeight",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "downvoteWeight",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &[],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["weight"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/detectChange",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "detectChange",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::CurrentUserSession,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["issueBodyChecksum", "numOfComments"],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "result",
                "commentAuthorName",
                "issueBodyChanged",
                "numOfComments",
                "issueBodyChecksum",
                "issueUpdateDate",
            ],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/translation",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "translate",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::LoginSession,
        request: shape(
            &[],
            &[],
            &[],
            &["owner", "projectName", "type", "number"],
            &[],
        ),
        response: shape(&[], &[], &[], &[], &["translated", "Precondition Failed"]),
        migration_payload: None,
    },
];

const ISSUE_IMPORTS_PAYLOAD: IssueMigrationPayloadFixture = IssueMigrationPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
    request_json: None,
    success_status: 200,
    success_json: r##"{
  "number": 5
}"##,
    alternate_status: Some(400),
    alternate_json: None,
};

const ISSUE_BULK_IMPORT_PAYLOAD: IssueMigrationPayloadFixture = IssueMigrationPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/issues",
    request_json: Some(
        r##"{
  "sendNotification": true,
  "issues": [
    {
      "number": 3,
      "author": {
        "loginId": "author",
        "name": "Author User",
        "email": "author@example.com"
      },
      "title": "Legacy issue",
      "body": "legacy issue body",
      "state": "CLOSED",
      "createdAt": "2026-06-01 AM 09:00:00 +0900",
      "updatedAt": "2026-06-02 PM 03:30:00 +0900",
      "assignees": [
        {
          "loginId": "assignee",
          "name": "Assignee User",
          "email": "assignee@example.com"
        }
      ],
      "milestoneTitle": "M1",
      "dueDate": "2026-06-30 PM 11:59:59 +0900",
      "labels": [
        {
          "labelName": "Bug",
          "labelColor": "#2196f3",
          "category": "Type"
        }
      ],
      "temporaryUploadFiles": [
        "tmp-issue-upload"
      ]
    }
  ]
}"##,
    ),
    success_status: 201,
    success_json: r##"[
  {
    "status": 201,
    "location": "/alice/demo/issue/3"
  }
]"##,
    alternate_status: Some(400),
    alternate_json: Some(
        r##"{
  "message": "No issues key exists or value wasn't array!"
}"##,
    ),
};
