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

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum IssuePostConversionAction {
    Create,
    MissingSourcePost,
    SourcePostNumberMismatch,
    ConflictNextIssueNumber,
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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyAttachmentRef {
    pub id: Option<String>,
    pub name: Option<String>,
    pub hash: Option<String>,
    pub container_type: Option<String>,
    pub container_id: Option<String>,
    pub mime_type: Option<String>,
    pub size: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedIssuePostConversionComment {
    pub source_comment_id: Option<String>,
    pub parent_source_comment_id: Option<String>,
    pub author: Option<LegacyAuthorRef>,
    pub body: String,
    pub created_at: Option<String>,
    pub attachments: Vec<LegacyAttachmentRef>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssuePostConversionRequest {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub post_number: i64,
    pub source_post_number: Option<i64>,
    pub author: Option<LegacyAuthorRef>,
    pub title: Option<String>,
    pub body: Option<String>,
    pub state: IssueState,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub labels: Vec<LegacyIssueLabelRef>,
    pub milestone_title: Option<String>,
    pub comments: Vec<NormalizedIssuePostConversionComment>,
    pub attachments: Vec<LegacyAttachmentRef>,
    pub action: IssuePostConversionAction,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssuePostConversionResponse {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub post_number: i64,
    pub issue_number: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueHelperPath {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub number: i64,
    pub comment_id: Option<i64>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueCommentCreateRequest {
    pub path: IssueHelperPath,
    pub token_comment: Option<String>,
    pub author: Option<LegacyAuthorRef>,
    pub body: Option<String>,
    pub created_at: Option<String>,
    pub temporary_upload_files: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueCommentUpdateRequest {
    pub path: IssueHelperPath,
    pub content: String,
    pub original: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueCommentNotificationRequest {
    pub path: IssueHelperPath,
    pub comment: String,
    pub parent_comment_id: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyIssueHelperUser {
    pub login_id: Option<String>,
    pub name: Option<String>,
    pub pure_name_only: Option<String>,
    pub avatar_url: Option<String>,
    pub user_type: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueCommentNotificationResponse {
    pub path: IssueHelperPath,
    pub receivers: Vec<LegacyIssueHelperUser>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueLabelReplaceRequest {
    pub path: IssueHelperPath,
    pub label_ids: Vec<i64>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueAssigneeReplaceRequest {
    pub path: IssueHelperPath,
    pub login_ids: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueAssigneeReplaceResponse {
    pub path: IssueHelperPath,
    pub assignee: Option<LegacyIssueHelperUser>,
    pub issue_url: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueHelperSearchPath {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub number: Option<i64>,
    pub query: Option<String>,
    pub search_type: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyIssueSharableEntry {
    pub login_id: Option<String>,
    pub name: Option<String>,
    pub pure_name_only: Option<String>,
    pub avatar_url: Option<String>,
    pub entry_type: Option<String>,
    pub project_name: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueHelperSearchResponse {
    pub path: IssueHelperSearchPath,
    pub content_range: Option<String>,
    pub entries: Vec<LegacyIssueSharableEntry>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueSharerRef {
    pub sharer_type: Option<String>,
    pub login_id: Option<String>,
    pub project_id: Option<i64>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueShareUpdateRequest {
    pub path: IssueHelperPath,
    pub action: String,
    pub sharer: IssueSharerRef,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueShareUpdateResponse {
    pub path: IssueHelperPath,
    pub action: Option<String>,
    pub sharer: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueWeightResponse {
    pub path: IssueHelperPath,
    pub weight: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueDetectChangeRequest {
    pub path: IssueHelperPath,
    pub issue_body_checksum: String,
    pub num_of_comments: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueDetectChangeResponse {
    pub path: IssueHelperPath,
    pub result: Option<String>,
    pub comment_author_name: Option<String>,
    pub issue_body_changed: bool,
    pub num_of_comments: i64,
    pub issue_body_checksum: String,
    pub issue_update_date: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueTranslationRequest {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub source_type: String,
    pub number: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssueTranslationResponse {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub translated: Option<String>,
    pub precondition_failed: bool,
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
    MissingPostNumber,
    InvalidPostNumber(String),
    InvalidPostSnapshot,
    MissingResponseNumber,
    InvalidResponseNumber(String),
    MissingIssuesArray,
    InvalidIssueItem { index: usize },
    MissingField { index: usize, field: &'static str },
    MissingCommentBody,
    MissingNotificationReceivers,
    MissingContent,
    MissingOriginal,
    MissingLabelArray,
    InvalidLabelId { index: usize, value: String },
    MissingAssignees,
    MissingSharer,
    MissingAction,
    MissingWeight,
    InvalidWeight(String),
    MissingChecksum,
    MissingCommentCount,
    InvalidCommentCount(String),
    MissingIssueBodyChanged,
    MissingIssueUpdateDate,
    InvalidIssueUpdateDate(String),
    MissingTranslationField(&'static str),
    InvalidTranslationNumber(String),
}

impl std::fmt::Display for IssueAdapterError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidJson(error) => write!(formatter, "invalid issue import JSON: {error}"),
            Self::InvalidPath(path) => write!(
                formatter,
                "invalid issue import path `{path}`; expected /-_-api/v1/owners/:owner/projects/:projectName/issues"
            ),
            Self::MissingPostNumber => write!(
                formatter,
                "missing postNumber query for /-_-api/v1/owners/:owner/projects/:projectName/issues/imports"
            ),
            Self::InvalidPostNumber(value) => {
                write!(formatter, "invalid postNumber `{value}`; expected positive integer")
            }
            Self::InvalidPostSnapshot => {
                write!(formatter, "legacy source post snapshot must be a JSON object")
            }
            Self::MissingResponseNumber => {
                write!(formatter, "missing issue number in IssueApi.imports response")
            }
            Self::InvalidResponseNumber(value) => {
                write!(formatter, "invalid IssueApi.imports response number `{value}`")
            }
            Self::MissingIssuesArray => {
                write!(formatter, "No issues key exists or value wasn't array!")
            }
            Self::InvalidIssueItem { index } => {
                write!(formatter, "issue item at index {index} must be a JSON object")
            }
            Self::MissingField { index, field } => {
                write!(formatter, "missing required issue field `{field}` at index {index}")
            }
            Self::MissingCommentBody => {
                write!(formatter, "missing issue comment `comment` or `body` field")
            }
            Self::MissingNotificationReceivers => {
                write!(formatter, "missing comment notification `receivers` array")
            }
            Self::MissingContent => write!(formatter, "missing issue helper `content` field"),
            Self::MissingOriginal => write!(formatter, "missing issue helper `original` field"),
            Self::MissingLabelArray => write!(formatter, "issue label replacement body must be a JSON array"),
            Self::InvalidLabelId { index, value } => {
                write!(formatter, "invalid issue label id `{value}` at index {index}")
            }
            Self::MissingAssignees => write!(formatter, "No assignee"),
            Self::MissingSharer => write!(formatter, "No sharer"),
            Self::MissingAction => write!(formatter, "missing issue share `action` field"),
            Self::MissingWeight => write!(formatter, "missing issue weight response `weight` field"),
            Self::InvalidWeight(value) => write!(formatter, "invalid issue weight `{value}`"),
            Self::MissingChecksum => {
                write!(formatter, "missing detectChange `issueBodyChecksum` field")
            }
            Self::MissingCommentCount => {
                write!(formatter, "missing detectChange `numOfComments` field")
            }
            Self::InvalidCommentCount(value) => {
                write!(formatter, "invalid detectChange numOfComments `{value}`")
            }
            Self::MissingIssueBodyChanged => {
                write!(formatter, "missing detectChange response `issueBodyChanged` field")
            }
            Self::MissingIssueUpdateDate => {
                write!(formatter, "missing detectChange response `issueUpdateDate` field")
            }
            Self::InvalidIssueUpdateDate(value) => {
                write!(formatter, "invalid detectChange issueUpdateDate `{value}`")
            }
            Self::MissingTranslationField(field) => {
                write!(formatter, "missing translation `{field}` field")
            }
            Self::InvalidTranslationNumber(value) => {
                write!(formatter, "invalid translation number `{value}`")
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

pub fn parse_issue_post_conversion_request(
    sample_path: &str,
    source_post_json: Option<&str>,
    next_issue_number: i64,
    existing_issue_numbers: &[i64],
) -> Result<IssuePostConversionRequest, IssueAdapterError> {
    let (owner, project_name, post_number) = parse_issue_imports_path(sample_path)?;
    let Some(source_post_json) = source_post_json else {
        return Ok(IssuePostConversionRequest {
            endpoint_method: "POST",
            endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports",
            owner,
            project_name,
            post_number,
            source_post_number: None,
            author: None,
            title: None,
            body: None,
            state: IssueState::Open,
            created_at: None,
            updated_at: None,
            labels: Vec::new(),
            milestone_title: None,
            comments: Vec::new(),
            attachments: Vec::new(),
            action: IssuePostConversionAction::MissingSourcePost,
        });
    };
    let payload: Value = serde_json::from_str(source_post_json)
        .map_err(|error| IssueAdapterError::InvalidJson(error.to_string()))?;
    if !payload.is_object() {
        return Err(IssueAdapterError::InvalidPostSnapshot);
    }

    let source_post_number = find_value(&payload, "number").and_then(integer_field);
    let action = if source_post_number != Some(post_number) {
        IssuePostConversionAction::SourcePostNumberMismatch
    } else if existing_issue_numbers.contains(&next_issue_number) {
        IssuePostConversionAction::ConflictNextIssueNumber
    } else {
        IssuePostConversionAction::Create
    };

    Ok(IssuePostConversionRequest {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports",
        owner,
        project_name,
        post_number,
        source_post_number,
        author: find_value(&payload, "author").map(author_ref),
        title: source_post_text_field(&payload, "title"),
        body: source_post_text_field(&payload, "body"),
        state: IssueState::Open,
        created_at: text_field(&payload, "createdAt"),
        updated_at: text_field(&payload, "updatedAt"),
        labels: label_refs(&payload),
        milestone_title: text_field(&payload, "milestoneTitle"),
        comments: conversion_comments(&payload),
        attachments: attachment_refs(find_value(&payload, "attachments")),
        action,
    })
}

pub fn parse_issue_post_conversion_response(
    sample_path: &str,
    response_json: &str,
) -> Result<IssuePostConversionResponse, IssueAdapterError> {
    let (owner, project_name, post_number) = parse_issue_imports_path(sample_path)?;
    let payload: Value = serde_json::from_str(response_json)
        .map_err(|error| IssueAdapterError::InvalidJson(error.to_string()))?;
    let number = find_value(&payload, "number").ok_or(IssueAdapterError::MissingResponseNumber)?;
    let issue_number = integer_field(number)
        .filter(|number| *number > 0)
        .ok_or_else(|| IssueAdapterError::InvalidResponseNumber(scalar_text(number)))?;

    Ok(IssuePostConversionResponse {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports",
        owner,
        project_name,
        post_number,
        issue_number,
    })
}

pub fn parse_issue_comment_create_request(
    sample_path: &str,
    request_json: &str,
) -> Result<IssueCommentCreateRequest, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments",
        &["issues", ":number", "comments"],
    )?;
    let payload = parse_json(request_json)?;
    let token_comment = text_field(&payload, "comment");
    let body = text_field(&payload, "body");
    if token_comment.is_none() && body.is_none() {
        return Err(IssueAdapterError::MissingCommentBody);
    }

    Ok(IssueCommentCreateRequest {
        path,
        token_comment,
        author: find_value(&payload, "author").map(author_ref),
        body,
        created_at: text_field(&payload, "createdAt"),
        temporary_upload_files: upload_files(&payload),
    })
}

pub fn parse_issue_comment_update_request(
    sample_path: &str,
    request_json: &str,
) -> Result<IssueCommentUpdateRequest, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "PUT",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments/:commentId",
        &["issues", ":number", "comments", ":commentId"],
    )?;
    let payload = parse_json(request_json)?;
    let content = text_field(&payload, "content").ok_or(IssueAdapterError::MissingContent)?;
    let original = text_field(&payload, "original").ok_or(IssueAdapterError::MissingOriginal)?;

    Ok(IssueCommentUpdateRequest {
        path,
        content,
        original,
    })
}

pub fn parse_issue_comment_notification_request(
    sample_path: &str,
    request_json: &str,
) -> Result<IssueCommentNotificationRequest, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/commentNotiReceivers",
        &["issues", ":number", "commentNotiReceivers"],
    )?;
    let payload = parse_json(request_json)?;
    let comment = text_field(&payload, "comment").ok_or(IssueAdapterError::MissingCommentBody)?;
    let parent_comment_id =
        text_field(&payload, "parentCommentId").filter(|value| !value.is_empty());

    Ok(IssueCommentNotificationRequest {
        path,
        comment,
        parent_comment_id,
    })
}

pub fn parse_issue_comment_notification_response(
    sample_path: &str,
    response_json: &str,
) -> Result<IssueCommentNotificationResponse, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/commentNotiReceivers",
        &["issues", ":number", "commentNotiReceivers"],
    )?;
    let payload = parse_json(response_json)?;
    let receivers = find_value(&payload, "receivers")
        .and_then(Value::as_array)
        .ok_or(IssueAdapterError::MissingNotificationReceivers)?
        .iter()
        .map(issue_helper_user)
        .collect();

    Ok(IssueCommentNotificationResponse { path, receivers })
}

pub fn parse_issue_label_replace_request(
    sample_path: &str,
    request_json: &str,
) -> Result<IssueLabelReplaceRequest, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issuelabel/:number",
        &["issuelabel", ":number"],
    )?;
    let payload = parse_json(request_json)?;
    let labels = payload
        .as_array()
        .ok_or(IssueAdapterError::MissingLabelArray)?;
    let mut label_ids = Vec::with_capacity(labels.len());
    for (index, label) in labels.iter().enumerate() {
        let value = json_node_as_text(label);
        let label_id = value
            .parse::<i64>()
            .map_err(|_| IssueAdapterError::InvalidLabelId {
                index,
                value: value.clone(),
            })?;
        label_ids.push(label_id);
    }

    Ok(IssueLabelReplaceRequest { path, label_ids })
}

pub fn parse_issue_assignee_replace_request(
    sample_path: &str,
    request_json: &str,
) -> Result<IssueAssigneeReplaceRequest, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees",
        &["issues", ":number", "assignees"],
    )?;
    let payload = parse_json(request_json)?;
    let assignees = find_value(&payload, "assignees")
        .and_then(Value::as_array)
        .filter(|assignees| !assignees.is_empty())
        .ok_or(IssueAdapterError::MissingAssignees)?;
    let login_ids = assignees.iter().map(json_node_as_text).collect();

    Ok(IssueAssigneeReplaceRequest { path, login_ids })
}

pub fn parse_issue_assignee_replace_response(
    sample_path: &str,
    response_json: &str,
) -> Result<IssueAssigneeReplaceResponse, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees",
        &["issues", ":number", "assignees"],
    )?;
    let payload = parse_json(response_json)?;
    let assignee = find_value(&payload, "assignee").map(issue_helper_user);
    let issue_url = text_field(&payload, "issue");

    Ok(IssueAssigneeReplaceResponse {
        path,
        assignee,
        issue_url,
    })
}

pub fn parse_issue_helper_search_response(
    sample_path: &str,
    response_json: &str,
    content_range: Option<&str>,
) -> Result<IssueHelperSearchResponse, IssueAdapterError> {
    let path = if sample_path.contains("/issues/") && sample_path.contains("/assignableUsers") {
        parse_issue_search_path(
            sample_path,
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignableUsers",
            &["issues", ":number", "assignableUsers"],
        )?
    } else if sample_path.contains("/issues/") && sample_path.contains("/findSharer") {
        parse_issue_search_path(
            sample_path,
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/findSharer",
            &["issues", ":number", "findSharer"],
        )?
    } else if sample_path.contains("/issues/") && sample_path.contains("/sharableUsers") {
        parse_issue_search_path(
            sample_path,
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/sharableUsers",
            &["issues", ":number", "sharableUsers"],
        )?
    } else {
        parse_issue_search_path(
            sample_path,
            "/-_-api/v1/owners/:owner/projects/:projectName/assignableUsers",
            &["assignableUsers"],
        )?
    };
    let payload = parse_json(response_json)?;
    let entries = payload
        .as_array()
        .ok_or(IssueAdapterError::MissingIssuesArray)?
        .iter()
        .map(issue_sharable_entry)
        .collect();

    Ok(IssueHelperSearchResponse {
        path,
        content_range: content_range.map(str::to_string),
        entries,
    })
}

pub fn parse_issue_share_update_request(
    sample_path: &str,
    request_json: &str,
) -> Result<IssueShareUpdateRequest, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share",
        &["issues", ":number", "share"],
    )?;
    let payload = parse_json(request_json)?;
    let sharer = find_value(&payload, "sharer").ok_or(IssueAdapterError::MissingSharer)?;
    if sharer.as_array().is_some_and(Vec::is_empty) {
        return Err(IssueAdapterError::MissingSharer);
    }
    let action = text_field(&payload, "action").ok_or(IssueAdapterError::MissingAction)?;
    let sharer_type = text_field(sharer, "type");
    let login_id = text_field(sharer, "loginId");
    let project_id = find_value(sharer, "loginId").and_then(integer_field);

    Ok(IssueShareUpdateRequest {
        path,
        action,
        sharer: IssueSharerRef {
            sharer_type,
            login_id,
            project_id,
        },
    })
}

pub fn parse_issue_share_update_response(
    sample_path: &str,
    response_json: &str,
) -> Result<IssueShareUpdateResponse, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share",
        &["issues", ":number", "share"],
    )?;
    let payload = parse_json(response_json)?;

    Ok(IssueShareUpdateResponse {
        path,
        action: text_field(&payload, "action"),
        sharer: text_field(&payload, "sharer"),
    })
}

pub fn parse_issue_weight_response(
    sample_path: &str,
    response_json: &str,
) -> Result<IssueWeightResponse, IssueAdapterError> {
    let path = if sample_path.ends_with("/upvoteWeight") {
        parse_issue_helper_path(
            sample_path,
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/upvoteWeight",
            &["issues", ":number", "upvoteWeight"],
        )?
    } else {
        parse_issue_helper_path(
            sample_path,
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/downvoteWeight",
            &["issues", ":number", "downvoteWeight"],
        )?
    };
    let payload = parse_json(response_json)?;
    let weight = find_value(&payload, "weight").ok_or(IssueAdapterError::MissingWeight)?;
    let weight = integer_field(weight)
        .ok_or_else(|| IssueAdapterError::InvalidWeight(scalar_text(weight)))?;

    Ok(IssueWeightResponse { path, weight })
}

pub fn parse_issue_detect_change_request(
    sample_path: &str,
    request_json: &str,
) -> Result<IssueDetectChangeRequest, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/detectChange",
        &["issues", ":number", "detectChange"],
    )?;
    let payload = parse_json(request_json)?;
    let issue_body_checksum =
        text_field(&payload, "issueBodyChecksum").ok_or(IssueAdapterError::MissingChecksum)?;
    let count =
        find_value(&payload, "numOfComments").ok_or(IssueAdapterError::MissingCommentCount)?;
    let num_of_comments = integer_field(count)
        .ok_or_else(|| IssueAdapterError::InvalidCommentCount(scalar_text(count)))?;

    Ok(IssueDetectChangeRequest {
        path,
        issue_body_checksum,
        num_of_comments,
    })
}

pub fn parse_issue_detect_change_response(
    sample_path: &str,
    response_json: &str,
) -> Result<IssueDetectChangeResponse, IssueAdapterError> {
    let path = parse_issue_helper_path(
        sample_path,
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/detectChange",
        &["issues", ":number", "detectChange"],
    )?;
    let payload = parse_json(response_json)?;
    let issue_body_changed = find_value(&payload, "issueBodyChanged")
        .and_then(Value::as_bool)
        .ok_or(IssueAdapterError::MissingIssueBodyChanged)?;
    let count =
        find_value(&payload, "numOfComments").ok_or(IssueAdapterError::MissingCommentCount)?;
    let num_of_comments = integer_field(count)
        .ok_or_else(|| IssueAdapterError::InvalidCommentCount(scalar_text(count)))?;
    let checksum =
        text_field(&payload, "issueBodyChecksum").ok_or(IssueAdapterError::MissingChecksum)?;
    let update_date =
        find_value(&payload, "issueUpdateDate").ok_or(IssueAdapterError::MissingIssueUpdateDate)?;
    let issue_update_date = integer_field(update_date)
        .ok_or_else(|| IssueAdapterError::InvalidIssueUpdateDate(scalar_text(update_date)))?;

    Ok(IssueDetectChangeResponse {
        path,
        result: text_field(&payload, "result"),
        comment_author_name: text_field(&payload, "commentAuthorName"),
        issue_body_changed,
        num_of_comments,
        issue_body_checksum: checksum,
        issue_update_date,
    })
}

pub fn parse_issue_translation_request(
    request_json: &str,
) -> Result<IssueTranslationRequest, IssueAdapterError> {
    let payload = parse_json(request_json)?;
    let owner =
        text_field(&payload, "owner").ok_or(IssueAdapterError::MissingTranslationField("owner"))?;
    let project_name = text_field(&payload, "projectName")
        .ok_or(IssueAdapterError::MissingTranslationField("projectName"))?;
    let source_type =
        text_field(&payload, "type").ok_or(IssueAdapterError::MissingTranslationField("type"))?;
    let number_value = find_value(&payload, "number")
        .ok_or(IssueAdapterError::MissingTranslationField("number"))?;
    let number = integer_field(number_value)
        .ok_or_else(|| IssueAdapterError::InvalidTranslationNumber(scalar_text(number_value)))?;

    Ok(IssueTranslationRequest {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/translation",
        owner,
        project_name,
        source_type,
        number,
    })
}

pub fn parse_issue_translation_response(
    response_json: &str,
) -> Result<IssueTranslationResponse, IssueAdapterError> {
    if response_json == "Precondition Failed" {
        return Ok(IssueTranslationResponse {
            endpoint_method: "POST",
            endpoint_path: "/-_-api/v1/translation",
            translated: None,
            precondition_failed: true,
        });
    }

    let payload = parse_json(response_json)?;
    Ok(IssueTranslationResponse {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/translation",
        translated: text_field(&payload, "translated"),
        precondition_failed: false,
    })
}

fn parse_json(json: &str) -> Result<Value, IssueAdapterError> {
    serde_json::from_str(json).map_err(|error| IssueAdapterError::InvalidJson(error.to_string()))
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

fn parse_issue_imports_path(path: &str) -> Result<(String, String, i64), IssueAdapterError> {
    let (path_part, query_part) = path.split_once('?').unwrap_or((path, ""));
    let parts: Vec<&str> = path_part
        .split('/')
        .filter(|part| !part.is_empty())
        .collect();
    let (owner, project_name) = match parts.as_slice() {
        ["-_-api", "v1", "owners", owner, "projects", project_name, "issues", "imports"] => {
            ((*owner).to_string(), (*project_name).to_string())
        }
        _ => return Err(IssueAdapterError::InvalidPath(path.to_string())),
    };
    let post_number = query_part
        .split('&')
        .find_map(|pair| {
            let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
            (key == "postNumber").then_some(value)
        })
        .ok_or(IssueAdapterError::MissingPostNumber)?;
    if post_number.is_empty() {
        return Err(IssueAdapterError::InvalidPostNumber(
            post_number.to_string(),
        ));
    }
    let number = post_number
        .parse::<i64>()
        .ok()
        .filter(|number| *number > 0)
        .ok_or_else(|| IssueAdapterError::InvalidPostNumber(post_number.to_string()))?;

    Ok((owner, project_name, number))
}

fn parse_issue_helper_path(
    path: &str,
    method: &'static str,
    endpoint_path: &'static str,
    tail: &[&str],
) -> Result<IssueHelperPath, IssueAdapterError> {
    let path_part = path
        .split_once('?')
        .map_or(path, |(path_part, _)| path_part);
    let parts: Vec<&str> = path_part
        .split('/')
        .filter(|part| !part.is_empty())
        .collect();
    let Some(tail_start) = parts.len().checked_sub(tail.len()) else {
        return Err(IssueAdapterError::InvalidPath(path.to_string()));
    };
    let ["-_-api", "v1", "owners", owner, "projects", project_name] = parts[..tail_start] else {
        return Err(IssueAdapterError::InvalidPath(path.to_string()));
    };

    let mut number = None;
    let mut comment_id = None;
    for (actual, expected) in parts[tail_start..].iter().zip(tail.iter()) {
        match *expected {
            ":number" => {
                number = Some(parse_positive_path_number(path, actual)?);
            }
            ":commentId" => {
                comment_id = Some(parse_positive_path_number(path, actual)?);
            }
            literal if literal == *actual => {}
            _ => return Err(IssueAdapterError::InvalidPath(path.to_string())),
        }
    }

    Ok(IssueHelperPath {
        endpoint_method: method,
        endpoint_path,
        owner: owner.to_string(),
        project_name: project_name.to_string(),
        number: number.ok_or_else(|| IssueAdapterError::InvalidPath(path.to_string()))?,
        comment_id,
    })
}

fn parse_issue_search_path(
    path: &str,
    endpoint_path: &'static str,
    tail: &[&str],
) -> Result<IssueHelperSearchPath, IssueAdapterError> {
    let (path_part, query_part) = path.split_once('?').unwrap_or((path, ""));
    let parts: Vec<&str> = path_part
        .split('/')
        .filter(|part| !part.is_empty())
        .collect();
    let Some(tail_start) = parts.len().checked_sub(tail.len()) else {
        return Err(IssueAdapterError::InvalidPath(path.to_string()));
    };
    let ["-_-api", "v1", "owners", owner, "projects", project_name] = parts[..tail_start] else {
        return Err(IssueAdapterError::InvalidPath(path.to_string()));
    };

    let mut number = None;
    for (actual, expected) in parts[tail_start..].iter().zip(tail.iter()) {
        match *expected {
            ":number" => {
                number = Some(parse_positive_path_number(path, actual)?);
            }
            literal if literal == *actual => {}
            _ => return Err(IssueAdapterError::InvalidPath(path.to_string())),
        }
    }

    Ok(IssueHelperSearchPath {
        endpoint_method: "GET",
        endpoint_path,
        owner: owner.to_string(),
        project_name: project_name.to_string(),
        number,
        query: query_field(query_part, "query"),
        search_type: query_field(query_part, "type"),
    })
}

fn parse_positive_path_number(path: &str, value: &str) -> Result<i64, IssueAdapterError> {
    value
        .parse::<i64>()
        .ok()
        .filter(|number| *number > 0)
        .ok_or_else(|| IssueAdapterError::InvalidPath(path.to_string()))
}

fn query_field(query: &str, field: &str) -> Option<String> {
    query.split('&').find_map(|pair| {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        (key == field).then(|| value.to_string())
    })
}

fn author_ref(value: &Value) -> LegacyAuthorRef {
    LegacyAuthorRef {
        login_id: text_field(value, "loginId"),
        name: text_field(value, "name"),
        email: text_field(value, "email"),
    }
}

fn issue_helper_user(value: &Value) -> LegacyIssueHelperUser {
    LegacyIssueHelperUser {
        login_id: text_field(value, "loginId"),
        name: text_field(value, "name"),
        pure_name_only: text_field(value, "pureNameOnly"),
        avatar_url: text_field(value, "avatarUrl"),
        user_type: text_field(value, "type"),
    }
}

fn issue_sharable_entry(value: &Value) -> LegacyIssueSharableEntry {
    LegacyIssueSharableEntry {
        login_id: text_field(value, "loginId"),
        name: text_field(value, "name"),
        pure_name_only: text_field(value, "pureNameOnly"),
        avatar_url: text_field(value, "avatarUrl"),
        entry_type: text_field(value, "type"),
        project_name: text_field(value, "projectName"),
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

fn source_post_text_field(value: &Value, key: &str) -> Option<String> {
    value
        .as_object()
        .and_then(|map| map.get(key))
        .map(scalar_text)
        .or_else(|| {
            find_value(value, "content")
                .and_then(Value::as_object)
                .and_then(|map| map.get(key))
                .map(scalar_text)
        })
        .or_else(|| text_field(value, key))
}

fn conversion_comments(value: &Value) -> Vec<NormalizedIssuePostConversionComment> {
    match find_value(value, "comments") {
        Some(Value::Array(comments)) => comments
            .iter()
            .filter(|comment| comment.is_object())
            .map(|comment| NormalizedIssuePostConversionComment {
                source_comment_id: text_field(comment, "id"),
                parent_source_comment_id: text_field(comment, "parentCommentId")
                    .or_else(|| text_field(comment, "parentId")),
                author: find_value(comment, "author").map(author_ref),
                body: text_field(comment, "body")
                    .or_else(|| text_field(comment, "contents"))
                    .unwrap_or_default(),
                created_at: text_field(comment, "createdAt"),
                attachments: attachment_refs(find_value(comment, "attachments")),
            })
            .collect(),
        _ => Vec::new(),
    }
}

fn attachment_refs(value: Option<&Value>) -> Vec<LegacyAttachmentRef> {
    match value {
        Some(Value::Array(attachments)) => attachments.iter().map(attachment_ref).collect(),
        Some(value) if value.is_object() => vec![attachment_ref(value)],
        _ => Vec::new(),
    }
}

fn attachment_ref(value: &Value) -> LegacyAttachmentRef {
    LegacyAttachmentRef {
        id: text_field(value, "id"),
        name: text_field(value, "name"),
        hash: text_field(value, "hash"),
        container_type: text_field(value, "containerType"),
        container_id: text_field(value, "containerId"),
        mime_type: text_field(value, "mimeType"),
        size: text_field(value, "size"),
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

fn json_node_as_text(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(text) => text.clone(),
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => number.to_string(),
        Value::Array(_) | Value::Object(_) => String::new(),
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
