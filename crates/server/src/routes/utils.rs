use axum::{
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use bcrypt::{hash, DEFAULT_COST};
use md5::{Digest, Md5};
use rand::RngCore;
use sea_orm::entity::prelude::DateTime;
use serde::Serialize;
use std::collections::HashMap;

use crate::{
    generated::yona::pilot::v1::{
        IssueLabel, IssueLabelCategory, OrganizationDetail, OrganizationIssueListItem,
        ProjectDetail, ProjectIssueListItem, ProjectMemberSummary, ProjectMilestoneSummary,
    },
    internal_error, normalize_identifier, persistence, require_valid_csrf,
    session::SessionManager,
    ConnectError, ErrorCode, PilotRepository, RestRouteError,
};

pub(crate) fn legacy_external_random_storage_token() -> String {
    use base64::Engine;

    let mut bytes = [0_u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

pub(crate) fn legacy_external_user_statistics_result(
    record: &persistence::UserStatisticsRecord,
) -> serde_json::Value {
    serde_json::json!({
        "assignedIssue": record.assigned_issue,
        "issue": record.issue,
        "issueComment": record.issue_comment,
        "issueCommentVoter": record.issue_comment_voter,
        "issueVoter": record.issue_voter,
        "posting": record.posting,
        "postingComment": record.posting_comment,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestBoardLabel {
    category_id: String,
    category_is_exclusive: bool,
    category_name: String,
    color: String,
    id: String,
    name: String,
}

pub(crate) fn optional_i64_string(value: Option<i64>) -> String {
    value.map(|value| value.to_string()).unwrap_or_default()
}

pub(crate) fn rest_board_label_from_record(
    label: &persistence::IssueLabelRecord,
) -> RestBoardLabel {
    RestBoardLabel {
        category_id: optional_i64_string(label.category_id),
        category_is_exclusive: label.category_is_exclusive,
        category_name: label.category_name.clone(),
        color: label.color.clone(),
        id: label.id.to_string(),
        name: label.name.clone(),
    }
}

pub(crate) fn issue_label_from_record(record: &persistence::IssueLabelRecord) -> IssueLabel {
    IssueLabel {
        category_id: record.category_id.unwrap_or_default(),
        category_is_exclusive: record.category_is_exclusive,
        category_name: record.category_name.clone(),
        color: record.color.clone(),
        id: record.id,
        name: record.name.clone(),
        ..Default::default()
    }
}

pub(crate) fn issue_label_category_from_record(
    record: &persistence::IssueLabelCategoryRecord,
) -> IssueLabelCategory {
    IssueLabelCategory {
        id: record.id,
        is_exclusive: record.is_exclusive,
        name: record.name.clone(),
        ..Default::default()
    }
}

pub(crate) fn project_issue_list_item_to_proto(
    item: persistence::ProjectIssueListItemRecord,
) -> ProjectIssueListItem {
    ProjectIssueListItem {
        assignee_label: item.assignee_label,
        author_label: item.author_label,
        comment_count: item.comment_count,
        issue_number: item.issue_number,
        labels: item.labels.iter().map(issue_label_from_record).collect(),
        milestone_id: item.milestone_id.unwrap_or_default(),
        milestone_title: item.milestone_title,
        owner_name: item.owner_name,
        project_name: item.project_name,
        state: item.state,
        title: item.title,
        updated_label: item.updated_label,
        voter_count: item.voter_count,
        watcher_count: item.watcher_count,
        ..Default::default()
    }
}

pub(crate) fn organization_issue_list_item_to_proto(
    item: persistence::ProjectIssueListItemRecord,
) -> OrganizationIssueListItem {
    OrganizationIssueListItem {
        assignee_label: item.assignee_label,
        author_label: item.author_label,
        comment_count: item.comment_count,
        issue_number: item.issue_number,
        labels: item.labels.iter().map(issue_label_from_record).collect(),
        milestone_id: item.milestone_id.unwrap_or_default(),
        milestone_title: item.milestone_title,
        owner_name: item.owner_name,
        project_name: item.project_name,
        state: item.state,
        title: item.title,
        updated_label: item.updated_label,
        voter_count: item.voter_count,
        watcher_count: item.watcher_count,
        ..Default::default()
    }
}

pub(crate) fn user_issue_filter_name(value: &str) -> Result<String, ConnectError> {
    let normalized = normalize_identifier(value);
    let resolved = if normalized.is_empty() {
        "assigned".to_string()
    } else {
        normalized
    };
    match resolved.as_str() {
        "assigned" | "authored" | "commented" | "mentioned" | "shared" | "favorite" => Ok(resolved),
        _ => Err(ConnectError::invalid_argument("invalid user issue filter")),
    }
}

pub(crate) fn user_issue_state(value: &str) -> Result<String, ConnectError> {
    let normalized = normalize_identifier(value);
    let resolved = if normalized.is_empty() {
        "open".to_string()
    } else {
        normalized
    };
    match resolved.as_str() {
        "open" | "closed" => Ok(resolved),
        _ => Err(ConnectError::invalid_argument("invalid user issue state")),
    }
}

pub(crate) fn organization_detail_from_record(
    record: &persistence::OrganizationRecord,
    viewer_can_update: bool,
) -> OrganizationDetail {
    OrganizationDetail {
        organization_name: record.organization_name.clone(),
        description: record.description.clone().unwrap_or_default(),
        viewer_can_update,
        ..Default::default()
    }
}

pub(crate) async fn organization_logo_url(
    repository: &PilotRepository,
    base_path: &str,
    organization_id: i64,
) -> Result<String, ConnectError> {
    Ok(repository
        .read_organization_logo_attachment(organization_id)
        .await
        .map_err(internal_error)?
        .map(|attachment| base_path_href(base_path, &format!("/files/{}", attachment.id)))
        .unwrap_or_default())
}

pub(crate) async fn organization_detail_with_logo_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: &persistence::OrganizationRecord,
    viewer_can_update: bool,
) -> Result<OrganizationDetail, ConnectError> {
    let mut detail = organization_detail_from_record(record, viewer_can_update);
    detail.logo_url = organization_logo_url(repository, base_path, record.id).await?;
    Ok(detail)
}

pub(crate) fn project_detail_from_record(
    authorization: &persistence::ProjectAuthorizationRecord,
    viewer_can_update: bool,
    viewer_can_enroll: bool,
) -> ProjectDetail {
    ProjectDetail {
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        organization_name: authorization
            .project
            .organization_name
            .clone()
            .unwrap_or_default(),
        overview: authorization.project.overview.clone().unwrap_or_default(),
        project_scope: authorization.project.project_scope.clone(),
        viewer_can_update,
        viewer_can_enroll,
        enrollment_requested: authorization.enrollment_requested,
        is_favorited: authorization.is_favorited,
        ..Default::default()
    }
}

pub(crate) async fn project_logo_url(
    repository: &PilotRepository,
    base_path: &str,
    project_id: i64,
) -> Result<String, ConnectError> {
    Ok(repository
        .read_project_logo_attachment(project_id)
        .await
        .map_err(internal_error)?
        .map(|attachment| base_path_href(base_path, &format!("/files/{}", attachment.id)))
        .unwrap_or_default())
}

pub(crate) async fn project_detail_with_logo_from_record(
    repository: &PilotRepository,
    base_path: &str,
    authorization: &persistence::ProjectAuthorizationRecord,
    viewer_can_update: bool,
    viewer_can_enroll: bool,
) -> Result<ProjectDetail, ConnectError> {
    let mut detail =
        project_detail_from_record(authorization, viewer_can_update, viewer_can_enroll);
    detail.logo_url = project_logo_url(repository, base_path, authorization.project.id).await?;
    Ok(detail)
}

pub(crate) fn project_member_summary_from_record(
    record: &persistence::ProjectMemberRecord,
) -> ProjectMemberSummary {
    ProjectMemberSummary {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id.clone(),
        role: record.role.clone(),
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

pub(crate) fn project_milestone_summary_from_record(
    record: &persistence::ProjectMilestoneSummaryRecord,
) -> ProjectMilestoneSummary {
    ProjectMilestoneSummary {
        closed_issue_count: record.closed_issue_count,
        completion_percent: record.completion_percent,
        due_date_label: record.due_date_label.clone(),
        id: record.id,
        open_issue_count: record.open_issue_count,
        title: record.title.clone(),
        ..Default::default()
    }
}

pub(crate) fn base_path_href(base_path: &str, path: &str) -> String {
    if base_path == "/" {
        path.to_string()
    } else {
        format!("{base_path}{path}")
    }
}

pub(crate) fn gravatar_url(email_address: &str) -> String {
    let normalized = email_address.trim().to_ascii_lowercase();
    let mut hasher = Md5::new();
    hasher.update(normalized.as_bytes());
    format!(
        "https://www.gravatar.com/avatar/{:x}?s=256&d=identicon",
        hasher.finalize()
    )
}

pub(crate) fn legacy_json_find_value<'a>(
    value: &'a serde_json::Value,
    field_name: &str,
) -> Option<&'a serde_json::Value> {
    match value {
        serde_json::Value::Object(map) => {
            if let Some(value) = map.get(field_name) {
                return Some(value);
            }
            map.values()
                .find_map(|value| legacy_json_find_value(value, field_name))
        }
        serde_json::Value::Array(items) => items
            .iter()
            .find_map(|value| legacy_json_find_value(value, field_name)),
        _ => None,
    }
}

pub(crate) fn legacy_external_api_token_from_headers(headers: &HeaderMap) -> Option<String> {
    if let Some(value) = headers
        .get("Yona-Token")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return Some(value.to_string());
    }

    let authorization = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())?;
    let token = authorization
        .strip_prefix("token ")
        .or_else(|| authorization.strip_prefix("token"))?
        .trim();
    if token.is_empty() {
        None
    } else {
        Some(token.to_string())
    }
}

pub(crate) fn legacy_external_api_auth_error_response(error: ConnectError) -> Response {
    if error.code == ErrorCode::Unauthenticated {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "message": "unauthorized request",
            })),
        )
            .into_response();
    }
    RestRouteError::from_connect_error(error).into_response()
}

pub(crate) fn headers_with_form_csrf(
    mut headers: HeaderMap,
    form: &HashMap<String, String>,
) -> HeaderMap {
    if headers.contains_key("x-csrf-token") {
        return headers;
    }
    let Some(csrf_token) = form.get("csrfToken").map(|value| value.trim()) else {
        return headers;
    };
    if csrf_token.is_empty() {
        return headers;
    }
    if let Ok(value) = HeaderValue::from_str(csrf_token) {
        headers.insert("x-csrf-token", value);
    }
    headers
}

pub(crate) fn form_value<'a>(form: &'a HashMap<String, String>, keys: &[&str]) -> &'a str {
    keys.iter()
        .find_map(|key| form.get(*key).map(String::as_str))
        .unwrap_or("")
}

pub(crate) fn form_bool(form: &HashMap<String, String>, keys: &[&str]) -> bool {
    matches!(
        form_value(form, keys).trim().to_ascii_lowercase().as_str(),
        "true" | "1" | "on" | "yes"
    )
}

pub(crate) fn normalize_issue_label_color(value: &str) -> Result<String, ConnectError> {
    let trimmed = value.trim().trim_start_matches('#');
    let expanded = match trimmed.len() {
        3 if trimmed.chars().all(|item| item.is_ascii_hexdigit()) => trimmed
            .chars()
            .flat_map(|item| [item, item])
            .collect::<String>(),
        6 if trimmed.chars().all(|item| item.is_ascii_hexdigit()) => trimmed.to_string(),
        _ => return Err(ConnectError::invalid_argument("invalid issue label color")),
    };
    Ok(format!("#{}", expanded.to_ascii_lowercase()))
}

fn issue_label_text_color(background: &str) -> &'static str {
    let normalized =
        normalize_issue_label_color(background).unwrap_or_else(|_| "#ffffff".to_string());
    let hex = normalized.trim_start_matches('#');
    let red = u8::from_str_radix(&hex[0..2], 16).unwrap_or(255) as f64;
    let green = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255) as f64;
    let blue = u8::from_str_radix(&hex[4..6], 16).unwrap_or(255) as f64;
    let color_space = (red * 0.21) + (green * 0.72) + (blue * 0.07);
    if color_space > 192.0 {
        "dimgray"
    } else {
        "white"
    }
}

pub(crate) fn issue_label_css(labels: &[persistence::IssueLabelRecord]) -> String {
    labels
        .iter()
        .map(|label| {
            let color = normalize_issue_label_color(&label.color)
                .unwrap_or_else(|_| "#ffffff".to_string());
            let text_color = issue_label_text_color(&color);
            format!(
                ".issue-label[data-label-id=\"{}\"]{{\n    box-shadow: inset 2px 0 0px {};\n    -webkit-box-shadow: inset 2px 0 0px {};\n    -moz-box-shadow: inset 2px 0 0px {};\n}}\n.issue-label.active[data-label-id=\"{}\"]{{\n    background-color: {};\n    color: {};\n}}\n",
                label.id, color, color, color, label.id, color, text_color
            )
        })
        .collect()
}

#[derive(Clone, Debug)]
pub(crate) struct LegacyBoardContentUpdateBody {
    pub(crate) content: String,
    pub(crate) original: String,
}

pub(crate) fn legacy_content_update_body_from_value(
    value: &serde_json::Value,
) -> LegacyBoardContentUpdateBody {
    LegacyBoardContentUpdateBody {
        content: legacy_json_find_value(value, "content")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        original: legacy_json_find_value(value, "original")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
    }
}

#[derive(Clone, Debug)]
pub(crate) struct LegacyIssueDetectChangeBody {
    pub(crate) issue_body_checksum: String,
    pub(crate) num_of_comments: u32,
}

pub(crate) fn legacy_issue_detect_change_body_from_value(
    value: &serde_json::Value,
) -> LegacyIssueDetectChangeBody {
    LegacyIssueDetectChangeBody {
        issue_body_checksum: legacy_json_find_value(value, "issueBodyChecksum")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        num_of_comments: legacy_json_find_value(value, "numOfComments")
            .and_then(|value| {
                value
                    .as_u64()
                    .or_else(|| value.as_str()?.trim().parse::<u64>().ok())
            })
            .and_then(|value| u32::try_from(value).ok())
            .unwrap_or_default(),
    }
}

#[derive(Clone, Debug)]
pub(crate) struct LegacyIssueCommentCreateBody {
    pub(crate) author: Option<serde_json::Value>,
    pub(crate) body: String,
    pub(crate) comment: String,
    pub(crate) temporary_upload_files: Option<serde_json::Value>,
}

pub(crate) fn legacy_issue_comment_create_body_from_value(
    value: &serde_json::Value,
) -> LegacyIssueCommentCreateBody {
    LegacyIssueCommentCreateBody {
        author: legacy_json_find_value(value, "author").cloned(),
        body: legacy_json_find_value(value, "body")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        comment: legacy_json_find_value(value, "comment")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        temporary_upload_files: legacy_json_find_value(value, "temporaryUploadFiles").cloned(),
    }
}

#[derive(Clone, Debug)]
pub(crate) struct LegacyIssueUpdateBody {
    pub(crate) assignees: Vec<LegacyIssueAssigneeBody>,
    pub(crate) body: String,
    pub(crate) state: String,
    pub(crate) title: String,
}

pub(crate) fn legacy_issue_update_body_from_value(
    value: &serde_json::Value,
) -> LegacyIssueUpdateBody {
    LegacyIssueUpdateBody {
        assignees: legacy_json_find_value(value, "assignees")
            .and_then(|value| value.as_array())
            .map(|items| {
                items
                    .iter()
                    .map(legacy_issue_assignee_body_from_value)
                    .collect()
            })
            .unwrap_or_default(),
        body: legacy_json_find_value(value, "body")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        state: legacy_json_find_value(value, "state")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        title: legacy_json_find_value(value, "title")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
    }
}

#[derive(Clone, Debug)]
pub(crate) struct LegacyIssueAssigneeBody {
    pub(crate) login_id: String,
}

fn legacy_issue_assignee_body_from_value(value: &serde_json::Value) -> LegacyIssueAssigneeBody {
    LegacyIssueAssigneeBody {
        login_id: legacy_json_find_value(value, "loginId")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
    }
}

pub(crate) fn legacy_external_attachment_result(
    attachment: &persistence::IssueAttachmentRecord,
) -> serde_json::Value {
    serde_json::json!({
        "id": attachment.id,
        "name": attachment.name,
        "mimeType": attachment.mime_type,
        "size": attachment.size,
    })
}

pub(crate) fn legacy_external_date_string(date: Option<DateTime>) -> String {
    date.map(|date| date.format("%Y-%m-%dT%H:%M:%S+0000").to_string())
        .unwrap_or_default()
}

pub(crate) fn legacy_external_parse_datetime(
    value: Option<&serde_json::Value>,
) -> Option<DateTime> {
    let value = value?;
    let text = value.as_str()?.trim();
    if text.is_empty() {
        return None;
    }
    for format in [
        "%Y-%m-%d %p %I:%M:%S %z",
        "%Y-%m-%d %p %I:%M:%S",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S%.f%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%.f",
    ] {
        if let Ok(parsed) = DateTime::parse_from_str(text, format) {
            return Some(parsed);
        }
    }
    None
}

pub(crate) fn legacy_external_temporary_upload_file_ids(
    value: Option<&serde_json::Value>,
) -> Vec<i64> {
    let Some(files) = value.and_then(|value| value.as_array()) else {
        return Vec::new();
    };
    files
        .iter()
        .filter_map(|file| {
            file.as_i64()
                .or_else(|| file.as_str()?.trim().parse::<i64>().ok())
        })
        .filter(|id| *id > 0)
        .collect()
}

fn legacy_external_author_identifier(author: Option<&serde_json::Value>) -> Option<&str> {
    let author = author?;
    for field in ["email", "loginId", "login_id", "login"] {
        if let Some(value) = legacy_external_json_text_field(author, field) {
            return Some(value);
        }
    }
    author
        .as_str()
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn legacy_external_json_text_field<'a>(
    value: &'a serde_json::Value,
    field: &str,
) -> Option<&'a str> {
    value
        .get(field)
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

pub(crate) async fn legacy_external_post_author(
    repository: &PilotRepository,
    fallback: &persistence::AppUserRecord,
    author: Option<&serde_json::Value>,
) -> Result<persistence::AppUserRecord, sea_orm::DbErr> {
    let Some(identifier) = legacy_external_author_identifier(author) else {
        return Ok(fallback.clone());
    };
    match repository.find_user_by_identifier(identifier).await? {
        Some(author) => Ok(author),
        None => {
            let Some(author) = author else {
                return Ok(fallback.clone());
            };
            let Some(email_address) = legacy_external_json_text_field(author, "email") else {
                return Ok(fallback.clone());
            };
            let Some(login_id) = legacy_external_json_text_field(author, "loginId")
                .or_else(|| legacy_external_json_text_field(author, "login_id"))
                .or_else(|| legacy_external_json_text_field(author, "login"))
            else {
                return Ok(fallback.clone());
            };
            if repository.user_login_id_exists(login_id).await? {
                return Ok(fallback.clone());
            }
            let display_name = legacy_external_json_text_field(author, "name").unwrap_or(login_id);
            let password_hash = hash(
                format!(
                    "legacy-external-import-disabled:{login_id}:{}",
                    legacy_external_random_storage_token()
                ),
                DEFAULT_COST,
            )
            .map_err(|error| sea_orm::DbErr::Custom(error.to_string()))?;
            repository
                .create_user(persistence::CreateUserInput {
                    display_name: display_name.to_string(),
                    email_address: email_address.to_string(),
                    is_confirmed: true,
                    is_site_admin: false,
                    login_id: login_id.to_string(),
                    password_hash,
                })
                .await
        }
    }
}

pub(crate) async fn legacy_external_authenticated_user_id(
    headers: &HeaderMap,
    session_manager: &SessionManager,
    repository: &PilotRepository,
    require_csrf_for_session: bool,
) -> Result<i64, ConnectError> {
    let session = session_manager.read_session_from_headers(headers);
    if let Some(session) = session.as_ref() {
        if let Some(user_id) = session.user_id {
            if !require_csrf_for_session
                || require_valid_csrf(session_manager, headers, session).is_ok()
            {
                return Ok(user_id);
            }
        }
    }

    if let Some(token) = legacy_external_api_token_from_headers(headers) {
        match repository.read_user_id_by_api_token(&token).await {
            Ok(Some(user_id)) => return Ok(user_id),
            Ok(None) => {}
            Err(error) => {
                return Err(ConnectError::new(
                    ErrorCode::Internal,
                    format!("failed to read api token: {error}"),
                ));
            }
        }
    }

    if let Some(session) = session.as_ref() {
        if session.user_id.is_some() && require_csrf_for_session {
            require_valid_csrf(session_manager, headers, session)?;
        }
    }

    Err(ConnectError::unauthenticated(
        "missing authenticated session",
    ))
}

pub(crate) fn accepts_legacy_json(headers: &HeaderMap) -> bool {
    let Some(value) = headers.get(http::header::ACCEPT) else {
        return true;
    };
    let Ok(value) = value.to_str() else {
        return false;
    };
    value.split(',').any(|part| {
        let media_type = part
            .split(';')
            .next()
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase();
        matches!(
            media_type.as_str(),
            "application/json" | "application/*" | "*/*"
        )
    })
}
