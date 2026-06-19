use axum::{
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Redirect, Response},
    Json,
};
use bcrypt::{hash, DEFAULT_COST};
use buffa::view::{MessageView, OwnedView};
use md5::{Digest, Md5};
use rand::RngCore;
use sea_orm::entity::prelude::DateTime;
use serde::{Deserialize, Deserializer, Serialize};
use std::collections::HashMap;
use yona_rust_vcs::{CodeFileRecord, VcsError};

use crate::{
    absolute_app_url,
    generated::yona::pilot::v1::{
        IssueLabel, IssueLabelCategory, OrganizationAdminMember, OrganizationAdminView,
        OrganizationContainer, OrganizationDetail, OrganizationEnrollmentRequestSummary,
        OrganizationIssueListItem, OrganizationMemberSummary, OrganizationProjectCard,
        OrganizationRoleOption, ProjectContainer, ProjectDetail, ProjectIssueListItem,
        ProjectMemberSummary, ProjectMilestoneSummary, ReadCurrentSessionResponse,
    },
    internal_error, persistence, project_read_allowed, project_update_allowed,
    require_project_read,
    session::{Session, SessionManager},
    ConnectError, Context, ErrorCode, PilotBackend, PilotRepository, PilotServiceImpl,
};
use yona_rust_domain::{
    can_create_organization_project, can_request_project_enrollment, can_update_organization,
    ProjectScope, DEFAULT_LANDING_FALLBACK_PATH,
};

pub(crate) fn normalize_identifier(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

pub(crate) fn map_project_scope(value: &str) -> Result<ProjectScope, ConnectError> {
    ProjectScope::try_from(value)
        .map_err(|_| ConnectError::invalid_argument("invalid project scope"))
}

pub(crate) fn percent_encode_uri_component(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        if uri_component_unescaped(byte) {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

fn uri_component_unescaped(byte: u8) -> bool {
    matches!(
        byte,
        b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'-'
            | b'_'
            | b'.'
            | b'!'
            | b'~'
            | b'*'
            | b'\''
            | b'('
            | b')'
    )
}

#[derive(Serialize)]
struct RestErrorEnvelope {
    error: RestErrorPayload,
}

#[derive(Serialize)]
struct RestErrorPayload {
    code: &'static str,
    message: String,
    status: u16,
}

pub(crate) struct RestRouteError {
    code: Option<&'static str>,
    message: String,
    status: StatusCode,
}

impl RestRouteError {
    pub(crate) fn from_connect_error(error: ConnectError) -> Self {
        let status = error.code.http_status();
        let message = error.message.clone().unwrap_or_else(|| error.to_string());
        Self {
            code: None,
            message,
            status,
        }
    }

    pub(crate) fn bad_request(message: impl Into<String>) -> Self {
        Self {
            code: None,
            message: message.into(),
            status: StatusCode::BAD_REQUEST,
        }
    }

    pub(crate) fn not_found(message: impl Into<String>) -> Self {
        Self {
            code: None,
            message: message.into(),
            status: StatusCode::NOT_FOUND,
        }
    }

    pub(crate) fn not_implemented(message: impl Into<String>) -> Self {
        Self {
            code: None,
            message: message.into(),
            status: StatusCode::NOT_IMPLEMENTED,
        }
    }

    pub(crate) fn forbidden_code(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code: Some(code),
            message: message.into(),
            status: StatusCode::FORBIDDEN,
        }
    }

    pub(crate) fn internal(message: impl Into<String>) -> Self {
        Self {
            code: None,
            message: message.into(),
            status: StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoResponse for RestRouteError {
    fn into_response(self) -> Response {
        let code = self.code.unwrap_or(match self.status {
            StatusCode::BAD_REQUEST => "bad_request",
            StatusCode::UNAUTHORIZED => "unauthorized",
            StatusCode::FORBIDDEN => "forbidden",
            StatusCode::NOT_FOUND => "not_found",
            StatusCode::CONFLICT => "already_exists",
            StatusCode::NOT_IMPLEMENTED => "not_implemented",
            _ => "internal_error",
        });
        (
            self.status,
            Json(RestErrorEnvelope {
                error: RestErrorPayload {
                    code,
                    message: self.message,
                    status: self.status.as_u16(),
                },
            }),
        )
            .into_response()
    }
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestIssueAssignableUsersQuery {
    pub(crate) query: String,
    #[serde(rename = "type")]
    pub(crate) search_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestProjectDeleteResponse {
    pub(crate) ok: bool,
    pub(crate) redirect_path: String,
}

pub(crate) fn rest_owned_view<V>(message: &V::Owned) -> Result<OwnedView<V>, RestRouteError>
where
    V: MessageView<'static>,
{
    OwnedView::<V>::from_owned(message).map_err(|error| {
        RestRouteError::internal(format!("failed to encode REST request: {error}"))
    })
}

pub(crate) fn append_response_headers(target: &mut HeaderMap, source: &HeaderMap) {
    for (name, value) in source {
        target.append(name, value.clone());
    }
}

pub(crate) fn rest_json_response<T: Serialize>(payload: T, ctx: Context) -> Response {
    let mut response = Json(payload).into_response();
    append_response_headers(response.headers_mut(), &ctx.response_headers);
    response
}

pub(crate) async fn rest_read_current_session(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Response, RestRouteError> {
    let session = session_manager.ensure_anonymous_session(&headers);
    let payload = resolve_current_session_response(&backend, Some(&session))
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let mut response = Json(payload).into_response();
    response.headers_mut().insert(
        "X-CSRF-Token",
        session.csrf_token.parse().expect("csrf token header"),
    );
    for cookie in session_manager.build_set_cookie_headers(&session) {
        response.headers_mut().append(
            axum::http::header::SET_COOKIE,
            cookie.parse().expect("set-cookie header"),
        );
    }
    Ok(response)
}

pub(crate) fn current_session_response_from_user(
    user: &persistence::AppUserRecord,
    default_landing_path: Option<String>,
) -> ReadCurrentSessionResponse {
    ReadCurrentSessionResponse {
        actor_id: user.id,
        default_landing_path: default_landing_path
            .unwrap_or_else(|| DEFAULT_LANDING_FALLBACK_PATH.to_string()),
        email_address: user.email_address.clone(),
        is_anonymous: false,
        is_confirmed: user.is_confirmed,
        is_site_admin: user.is_site_admin,
        login_id: user.login_id.clone(),
        user_label: user.display_name.clone(),
        ..Default::default()
    }
}

pub(crate) fn anonymous_current_session_response() -> ReadCurrentSessionResponse {
    ReadCurrentSessionResponse {
        is_anonymous: true,
        default_landing_path: DEFAULT_LANDING_FALLBACK_PATH.to_string(),
        ..Default::default()
    }
}

pub(crate) async fn resolve_current_session_response(
    backend: &PilotBackend,
    session: Option<&Session>,
) -> Result<ReadCurrentSessionResponse, ConnectError> {
    let Some(session) = session else {
        return Ok(anonymous_current_session_response());
    };

    let Some(user_id) = session.user_id else {
        return Ok(anonymous_current_session_response());
    };

    match backend {
        PilotBackend::Repository(repository) => {
            let Some(user) = repository
                .find_user_by_id(user_id)
                .await
                .map_err(internal_error)?
            else {
                return Ok(anonymous_current_session_response());
            };
            let default_landing_path = repository
                .read_default_landing_path(user_id)
                .await
                .map_err(internal_error)?;
            Ok(current_session_response_from_user(
                &user,
                default_landing_path,
            ))
        }
        PilotBackend::Static => Ok(anonymous_current_session_response()),
    }
}

pub(crate) fn require_session(
    session_manager: &SessionManager,
    headers: &HeaderMap,
) -> Result<Session, ConnectError> {
    session_manager
        .read_session_from_headers(headers)
        .ok_or_else(|| ConnectError::unauthenticated("missing pilot session"))
}

pub(crate) fn require_valid_csrf(
    session_manager: &SessionManager,
    headers: &HeaderMap,
    session: &Session,
) -> Result<(), ConnectError> {
    if session_manager.validate_csrf(headers, session) {
        Ok(())
    } else {
        Err(ConnectError::permission_denied("invalid csrf token"))
    }
}

pub(crate) fn attach_session_headers(
    ctx: &mut Context,
    session_manager: &SessionManager,
    session: &Session,
) {
    ctx.response_headers.insert(
        "x-csrf-token",
        HeaderValue::from_str(&session.csrf_token).expect("csrf header"),
    );
    for cookie in session_manager.build_set_cookie_headers(session) {
        ctx.response_headers.append(
            axum::http::header::SET_COOKIE,
            HeaderValue::from_str(&cookie).expect("set-cookie header"),
        );
    }
}

pub(crate) fn rest_not_found_response() -> Response {
    RestRouteError::not_found("REST endpoint not found.").into_response()
}

pub(crate) async fn legacy_external_api_hello() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "I'm alive!",
        "ok": true,
    }))
}

pub(crate) fn rest_repository(
    service: &PilotServiceImpl,
) -> Result<&PilotRepository, RestRouteError> {
    match &service.backend {
        PilotBackend::Repository(repository) => Ok(repository),
        PilotBackend::Static => Err(RestRouteError::not_implemented(
            "pull request reads require repository backend",
        )),
    }
}

pub(crate) fn rest_actor_id(service: &PilotServiceImpl, headers: &HeaderMap) -> Option<i64> {
    service
        .session_manager
        .read_session_from_headers(headers)
        .and_then(|session| session.user_id)
}

pub(crate) async fn rest_require_project_code_read(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    actor_id: Option<i64>,
) -> Result<persistence::ProjectAuthorizationRecord, RestRouteError> {
    let authorization = require_project_read(repository, owner_name, project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    if !project_code_menu_visible(&authorization, true) {
        let error = ConnectError::permission_denied("project code access is not allowed");
        return Err(RestRouteError::from_connect_error(error));
    }
    Ok(authorization)
}

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

pub(crate) fn format_project_date_label(value: Option<DateTime>) -> String {
    value
        .map(|value| value.format("%Y-%m-%d").to_string())
        .unwrap_or_default()
}

pub(crate) fn organization_member_summary_from_record(
    record: &persistence::OrganizationMemberRecord,
) -> OrganizationMemberSummary {
    OrganizationMemberSummary {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id.clone(),
        role: record.role.clone(),
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

pub(crate) fn organization_admin_member_from_record(
    record: &persistence::OrganizationMemberRecord,
) -> OrganizationAdminMember {
    OrganizationAdminMember {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id.clone(),
        role: record.role.clone(),
        user_id: record.user_id,
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

pub(crate) fn organization_enrollment_request_summary_from_record(
    record: &persistence::OrganizationEnrollmentRequestRecord,
) -> OrganizationEnrollmentRequestSummary {
    OrganizationEnrollmentRequestSummary {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id.clone(),
        user_id: record.user_id,
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

pub(crate) fn organization_role_options() -> Vec<OrganizationRoleOption> {
    vec![
        OrganizationRoleOption {
            role: "org_admin".to_string(),
            label: "org_admin".to_string(),
            ..Default::default()
        },
        OrganizationRoleOption {
            role: "org_member".to_string(),
            label: "org_member".to_string(),
            ..Default::default()
        },
    ]
}

pub(crate) fn project_code_menu_visible(
    authorization: &persistence::ProjectAuthorizationRecord,
    show_code: bool,
) -> bool {
    show_code
        && (!authorization.project.is_code_accessible_member_only
            || authorization.viewer.is_project_member
            || authorization.viewer.is_project_manager
            || authorization.viewer.is_organization_admin
            || authorization.viewer.is_site_admin)
}

pub(crate) fn code_browser_error(error: VcsError) -> ConnectError {
    match error {
        VcsError::GitUnavailable => ConnectError::unimplemented("git executable is unavailable"),
        VcsError::SvnAdminUnavailable => {
            ConnectError::unimplemented("svnadmin executable is unavailable")
        }
        VcsError::SvnUnavailable => ConnectError::unimplemented("svn executable is unavailable"),
        VcsError::InvalidBranch | VcsError::InvalidPath | VcsError::InvalidRepositoryPath => {
            ConnectError::invalid_argument(error.to_string())
        }
        VcsError::NotFound => ConnectError::not_found("repository path not found"),
        VcsError::GitTimedOut
        | VcsError::GitFailed(_)
        | VcsError::SvnAdminFailed(_)
        | VcsError::SvnFailed(_)
        | VcsError::SvnLookFailed(_)
        | VcsError::SvnLookUnavailable
        | VcsError::FilesystemFailed(_) => internal_error(error),
    }
}

pub(crate) fn code_branch_error(error: VcsError) -> ConnectError {
    match error {
        VcsError::GitUnavailable => ConnectError::unimplemented("git executable is unavailable"),
        VcsError::SvnAdminUnavailable => {
            ConnectError::unimplemented("svnadmin executable is unavailable")
        }
        VcsError::SvnUnavailable => ConnectError::unimplemented("svn executable is unavailable"),
        VcsError::InvalidBranch | VcsError::InvalidPath | VcsError::InvalidRepositoryPath => {
            ConnectError::invalid_argument(error.to_string())
        }
        VcsError::NotFound => ConnectError::not_found("branch not found"),
        VcsError::GitTimedOut
        | VcsError::GitFailed(_)
        | VcsError::SvnAdminFailed(_)
        | VcsError::SvnFailed(_)
        | VcsError::SvnLookFailed(_)
        | VcsError::SvnLookUnavailable
        | VcsError::FilesystemFailed(_) => internal_error(error),
    }
}

pub(crate) fn code_file_record_is_renderable_markdown(file: &CodeFileRecord) -> bool {
    !file.is_binary && !file.is_too_large && code_path_is_markdown(&file.path)
}

pub(crate) fn code_path_is_markdown(path: &str) -> bool {
    let extension = path
        .rsplit_once('.')
        .map(|(_, extension)| extension.to_ascii_lowercase())
        .unwrap_or_default();
    matches!(
        extension.as_str(),
        "markdown" | "mdown" | "mkdn" | "mkd" | "md" | "mdwn"
    )
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

async fn resolve_project_origin(
    repository: &PilotRepository,
    project: &persistence::ProjectRecord,
) -> Result<(String, String), ConnectError> {
    let Some(origin_project_id) = project.original_project_id else {
        return Ok((String::new(), String::new()));
    };
    let Some(origin_project) = repository
        .read_project_by_id(origin_project_id)
        .await
        .map_err(internal_error)?
    else {
        return Ok((String::new(), String::new()));
    };
    Ok((origin_project.owner_name, origin_project.project_name))
}

pub(crate) async fn build_organization_container_response(
    repository: &PilotRepository,
    base_path: &str,
    authorization: &persistence::OrganizationAuthorizationRecord,
    actor_id: Option<i64>,
) -> Result<OrganizationContainer, ConnectError> {
    let can_view_roster = authorization.viewer.is_organization_member
        || authorization.viewer.is_organization_admin
        || authorization.viewer.is_site_admin;
    let viewer_can_update = can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    );
    let viewer_can_create_project =
        can_create_organization_project(authorization.viewer.is_organization_admin)
            || authorization.viewer.is_site_admin;

    let directory = if can_view_roster {
        Some(
            repository
                .read_organization_members(&authorization.organization.organization_name)
                .await
                .map_err(internal_error)?,
        )
    } else {
        None
    };
    let admin_count = directory
        .as_ref()
        .map(|directory| {
            directory
                .members
                .iter()
                .filter(|member| member.role == "org_admin")
                .count()
        })
        .unwrap_or(0);
    let viewer_can_enroll = actor_id.is_some()
        && authorization.viewer.is_guest
        && !authorization.viewer.is_organization_admin
        && !authorization.viewer.is_organization_member
        && !authorization.viewer.is_site_admin;
    let viewer_can_leave = actor_id.is_some()
        && (authorization.viewer.is_organization_member
            || authorization.viewer.is_organization_admin)
        && (!authorization.viewer.is_organization_admin || admin_count > 1);

    let projects = repository
        .list_projects_for_organization(authorization.organization.id)
        .await
        .map_err(internal_error)?;
    let mut visible_projects = Vec::new();
    for project in projects {
        let Some(project_authorization) = repository
            .read_project_authorization(&project.owner_name, &project.project_name, actor_id)
            .await
            .map_err(internal_error)?
        else {
            continue;
        };
        if !project_read_allowed(&project_authorization, actor_id.is_none())? {
            continue;
        }
        let (origin_owner_name, origin_project_name) =
            resolve_project_origin(repository, &project_authorization.project).await?;
        let is_watching = if let Some(user_id) = actor_id {
            repository
                .is_watching_project(user_id, project_authorization.project.id)
                .await
                .map_err(internal_error)?
        } else {
            false
        };
        visible_projects.push(OrganizationProjectCard {
            created_label: format_project_date_label(project_authorization.project.created_date),
            is_watching,
            last_pushed_label: format_project_date_label(
                project_authorization.project.last_pushed_date,
            ),
            logo_url: project_logo_url(repository, base_path, project_authorization.project.id)
                .await?,
            member_count: repository
                .count_project_members(project_authorization.project.id)
                .await
                .map_err(internal_error)?,
            origin_owner_name,
            origin_project_name,
            overview: project_authorization
                .project
                .overview
                .clone()
                .unwrap_or_default(),
            owner_name: project_authorization.project.owner_name.clone(),
            project_name: project_authorization.project.project_name.clone(),
            project_scope: project_authorization.project.project_scope.clone(),
            watch_count: repository
                .count_project_watchers(project_authorization.project.id)
                .await
                .map_err(internal_error)?,
            ..Default::default()
        });
    }

    let admin_members = directory
        .as_ref()
        .map(|directory| {
            directory
                .members
                .iter()
                .filter(|member| member.role == "org_admin")
                .map(organization_member_summary_from_record)
                .collect()
        })
        .unwrap_or_default();
    let member_members = directory
        .as_ref()
        .map(|directory| {
            directory
                .members
                .iter()
                .filter(|member| member.role != "org_admin")
                .map(organization_member_summary_from_record)
                .collect()
        })
        .unwrap_or_default();

    Ok(OrganizationContainer {
        admin_members,
        description: authorization
            .organization
            .description
            .clone()
            .unwrap_or_default(),
        enrollment_requested: authorization.enrollment_requested,
        logo_url: organization_logo_url(repository, base_path, authorization.organization.id)
            .await?,
        member_members,
        organization_name: authorization.organization.organization_name.clone(),
        viewer_can_create_project,
        viewer_can_enroll,
        viewer_can_leave,
        viewer_can_update,
        visible_projects,
        ..Default::default()
    })
}

pub(crate) async fn visible_projects_for_organization(
    repository: &PilotRepository,
    organization_id: i64,
    actor_id: Option<i64>,
) -> Result<Vec<persistence::ProjectRecord>, ConnectError> {
    let projects = repository
        .list_projects_for_organization(organization_id)
        .await
        .map_err(internal_error)?;
    let mut visible_projects = Vec::new();
    for project in projects {
        let Some(project_authorization) = repository
            .read_project_authorization(&project.owner_name, &project.project_name, actor_id)
            .await
            .map_err(internal_error)?
        else {
            continue;
        };
        if project_read_allowed(&project_authorization, actor_id.is_none())? {
            visible_projects.push(project_authorization.project);
        }
    }
    Ok(visible_projects)
}

pub(crate) async fn visible_code_projects_for_organization(
    repository: &PilotRepository,
    organization_id: i64,
    actor_id: Option<i64>,
) -> Result<Vec<persistence::ProjectRecord>, ConnectError> {
    let projects = repository
        .list_projects_for_organization(organization_id)
        .await
        .map_err(internal_error)?;
    let mut visible_projects = Vec::new();
    for project in projects {
        let Some(project_authorization) = repository
            .read_project_authorization(&project.owner_name, &project.project_name, actor_id)
            .await
            .map_err(internal_error)?
        else {
            continue;
        };
        if project_read_allowed(&project_authorization, actor_id.is_none())?
            && project_code_menu_visible(&project_authorization, true)
        {
            visible_projects.push(project_authorization.project);
        }
    }
    Ok(visible_projects)
}

pub(crate) async fn build_organization_admin_response(
    repository: &PilotRepository,
    authorization: &persistence::OrganizationAuthorizationRecord,
) -> Result<OrganizationAdminView, ConnectError> {
    let directory = repository
        .read_organization_members(&authorization.organization.organization_name)
        .await
        .map_err(internal_error)?;
    let delete_allowed = repository
        .list_projects_for_organization(authorization.organization.id)
        .await
        .map_err(internal_error)?
        .is_empty();

    Ok(OrganizationAdminView {
        delete_allowed,
        enrollment_requests: directory
            .enrollment_requests
            .iter()
            .map(organization_enrollment_request_summary_from_record)
            .collect(),
        members: directory
            .members
            .iter()
            .map(organization_admin_member_from_record)
            .collect(),
        organization_name: authorization.organization.organization_name.clone(),
        role_options: organization_role_options(),
        viewer_can_update: can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ),
        ..Default::default()
    })
}

pub(crate) async fn build_project_container_response(
    repository: &PilotRepository,
    public_origin: &str,
    base_path: &str,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
) -> Result<ProjectContainer, ConnectError> {
    let viewer_can_update = if actor_id.is_some() {
        project_update_allowed(authorization)?
    } else {
        false
    };
    let viewer_can_enroll = can_request_project_enrollment(
        actor_id.is_some(),
        authorization.viewer.is_guest,
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_organization_member,
        authorization.viewer.is_project_manager,
        authorization.viewer.is_project_member,
        authorization.viewer.is_site_admin,
    );
    let viewer_can_watch = actor_id.is_some() && project_read_allowed(authorization, false)?;
    let member_count = repository
        .count_project_members(authorization.project.id)
        .await
        .map_err(internal_error)?;
    let watch_count = repository
        .count_project_watchers(authorization.project.id)
        .await
        .map_err(internal_error)?;
    let menu_settings = repository
        .read_project_menu_settings(authorization.project.id)
        .await
        .map_err(internal_error)?;
    let show_code = project_code_menu_visible(authorization, menu_settings.code);
    let show_pull_request = show_code && menu_settings.pull_request;
    let show_review = show_code && menu_settings.review;
    let show_issue = menu_settings.issue;
    let show_milestone = menu_settings.milestone;
    let show_board = menu_settings.board;
    let show_admin = viewer_can_update;
    let is_watching = if let Some(user_id) = actor_id {
        repository
            .is_watching_project(user_id, authorization.project.id)
            .await
            .map_err(internal_error)?
    } else {
        false
    };
    let project_directory = repository
        .read_project_members(
            &authorization.project.owner_name,
            &authorization.project.project_name,
        )
        .await
        .map_err(internal_error)?;
    let members = project_directory
        .members
        .iter()
        .map(project_member_summary_from_record)
        .collect();
    let current_milestone = if show_milestone {
        repository
            .read_current_milestone_for_project(authorization.project.id)
            .await
            .map_err(internal_error)?
            .map(|record| project_milestone_summary_from_record(&record))
            .into()
    } else {
        None.into()
    };
    let (origin_owner_name, origin_project_name) =
        resolve_project_origin(repository, &authorization.project).await?;

    Ok(ProjectContainer {
        background_url: String::new(),
        board_count: if show_board {
            repository
                .count_project_boards(authorization.project.id)
                .await
                .map_err(internal_error)?
        } else {
            0
        },
        clone_url: if show_code {
            absolute_app_url(
                public_origin,
                base_path,
                &format!(
                    "/{}/{}.git",
                    authorization.project.owner_name, authorization.project.project_name
                ),
            )
        } else {
            String::new()
        },
        code_member_only: authorization.project.is_code_accessible_member_only,
        current_milestone,
        default_tab: "readme".to_string(),
        enrollment_requested: authorization.enrollment_requested,
        is_favorited: authorization.is_favorited,
        is_forked: authorization.project.original_project_id.is_some(),
        is_watching,
        logo_url: project_logo_url(repository, base_path, authorization.project.id).await?,
        member_count,
        members,
        open_issue_count: if show_issue {
            repository
                .count_open_issues_for_project(authorization.project.id)
                .await
                .map_err(internal_error)?
        } else {
            0
        },
        open_pull_request_count: if show_pull_request {
            repository
                .count_open_pull_requests_for_project(authorization.project.id)
                .await
                .map_err(internal_error)?
        } else {
            0
        },
        organization_name: authorization
            .project
            .organization_name
            .clone()
            .unwrap_or_default(),
        origin_owner_name,
        origin_project_name,
        overview: authorization.project.overview.clone().unwrap_or_default(),
        overview_editable: viewer_can_update,
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        project_scope: authorization.project.project_scope.clone(),
        review_count: if show_review {
            repository
                .count_project_reviews(authorization.project.id)
                .await
                .map_err(internal_error)?
        } else {
            0
        },
        show_admin,
        show_board,
        show_code,
        show_issue,
        show_milestone,
        show_pull_request,
        show_review,
        viewer_can_enroll,
        viewer_can_update,
        viewer_can_watch,
        watch_count,
        ..Default::default()
    })
}

pub(crate) fn base_path_href(base_path: &str, path: &str) -> String {
    if base_path == "/" {
        path.to_string()
    } else {
        format!("{base_path}{path}")
    }
}

pub(crate) async fn direct_project_update_allowed(
    headers: &HeaderMap,
    owner: &str,
    project: &str,
    session_manager: &SessionManager,
    repository: &PilotRepository,
    check_csrf: bool,
) -> Result<Session, Response> {
    let session = match require_session(session_manager, headers) {
        Ok(session) => session,
        Err(_) => return Err(StatusCode::UNAUTHORIZED.into_response()),
    };
    if check_csrf && require_valid_csrf(session_manager, headers, &session).is_err() {
        return Err(StatusCode::FORBIDDEN.into_response());
    }
    let Some(user_id) = session.user_id else {
        return Err(StatusCode::UNAUTHORIZED.into_response());
    };
    let authorization = match repository
        .read_project_authorization(owner, project, Some(user_id))
        .await
    {
        Ok(Some(authorization)) => authorization,
        Ok(None) => return Err(StatusCode::NOT_FOUND.into_response()),
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR.into_response()),
    };
    match project_update_allowed(&authorization) {
        Ok(true) => Ok(session),
        Ok(false) => Err(StatusCode::FORBIDDEN.into_response()),
        Err(_) => Err(StatusCode::BAD_REQUEST.into_response()),
    }
}

pub(crate) fn redirect_to(base_path: &str, path: &str) -> Response {
    Redirect::to(&base_path_href(base_path, path)).into_response()
}

pub(crate) fn direct_status_from_connect_error(error: ConnectError) -> StatusCode {
    let message = error.to_string().to_ascii_lowercase();
    if message.contains("missing authenticated") {
        StatusCode::UNAUTHORIZED
    } else if message.contains("not found") {
        StatusCode::NOT_FOUND
    } else if message.contains("permission")
        || message.contains("forbidden")
        || message.contains("not allowed")
        || message.contains("invalid csrf")
    {
        StatusCode::FORBIDDEN
    } else if message.contains("invalid") || message.contains("required") {
        StatusCode::BAD_REQUEST
    } else {
        StatusCode::INTERNAL_SERVER_ERROR
    }
}

pub(crate) fn normalize_milestone_state(value: &str) -> Result<String, ConnectError> {
    let normalized = value.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "" => Ok("open".to_string()),
        "open" => Ok("open".to_string()),
        "closed" => Ok("closed".to_string()),
        _ => Err(ConnectError::invalid_argument("invalid milestone state")),
    }
}

pub(crate) fn parse_milestone_due_date(value: &str) -> Result<Option<DateTime>, ConnectError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    DateTime::parse_from_str(&format!("{trimmed} 23:59:59.999"), "%Y-%m-%d %H:%M:%S%.3f")
        .map(Some)
        .map_err(|_| ConnectError::invalid_argument("invalid milestone due date"))
}

pub(crate) fn parse_attachment_ids(value: &str) -> Vec<i64> {
    value
        .split(',')
        .filter_map(|item| item.trim().parse::<i64>().ok())
        .filter(|item| *item > 0)
        .collect()
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ProjectCreatableResource {
    BoardPost,
    CommitComment,
    Fork,
    IssueComment,
    IssuePost,
    NonIssueComment,
    ReviewComment,
}

fn project_group_member_create_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
) -> bool {
    authorization.project.organization_id.is_some()
        && authorization.viewer.is_organization_member
        && matches!(
            normalize_identifier(&authorization.project.project_scope).as_str(),
            "public" | "protected"
        )
}

fn project_member_or_admin_create_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
) -> bool {
    authorization.viewer.is_site_admin
        || authorization.viewer.is_organization_admin
        || authorization.viewer.is_project_manager
        || authorization.viewer.is_project_member
}

pub(crate) fn project_resource_create_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
    resource_type: ProjectCreatableResource,
) -> bool {
    if project_member_or_admin_create_allowed(authorization)
        || project_group_member_create_allowed(authorization)
    {
        return true;
    }
    normalize_identifier(&authorization.project.project_scope) == "public"
        && matches!(
            resource_type,
            ProjectCreatableResource::BoardPost
                | ProjectCreatableResource::CommitComment
                | ProjectCreatableResource::Fork
                | ProjectCreatableResource::IssueComment
                | ProjectCreatableResource::IssuePost
                | ProjectCreatableResource::NonIssueComment
                | ProjectCreatableResource::ReviewComment
        )
}

pub(crate) async fn require_project_resource_create(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    actor_id: Option<i64>,
    resource_type: ProjectCreatableResource,
) -> Result<persistence::ProjectAuthorizationRecord, ConnectError> {
    let Some(actor_id) = actor_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let authorization = repository
        .read_project_authorization(owner_name, project_name, Some(actor_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    if project_resource_create_allowed(&authorization, resource_type) {
        Ok(authorization)
    } else {
        Err(ConnectError::permission_denied(
            "project resource create is not allowed",
        ))
    }
}

pub(crate) fn escape_html_text(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

pub(crate) fn escape_html_attr(value: &str) -> String {
    escape_html_text(value)
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
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

#[derive(Deserialize)]
#[serde(untagged)]
enum RestStringOrNumber {
    String(String),
    Signed(i64),
    Unsigned(u64),
}

fn parse_rest_i64(value: RestStringOrNumber) -> Result<i64, String> {
    match value {
        RestStringOrNumber::String(value) => value
            .trim()
            .parse::<i64>()
            .map_err(|_| format!("invalid integer value: {value}")),
        RestStringOrNumber::Signed(value) => Ok(value),
        RestStringOrNumber::Unsigned(value) => {
            i64::try_from(value).map_err(|_| format!("integer is too large: {value}"))
        }
    }
}

pub(crate) fn deserialize_optional_i64_from_string_or_number<'de, D>(
    deserializer: D,
) -> Result<Option<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<RestStringOrNumber>::deserialize(deserializer)?;
    match value {
        Some(RestStringOrNumber::String(value)) if value.trim().is_empty() => Ok(None),
        Some(value) => parse_rest_i64(value)
            .map(Some)
            .map_err(serde::de::Error::custom),
        None => Ok(None),
    }
}

pub(crate) fn deserialize_i64_vec_from_strings_or_numbers<'de, D>(
    deserializer: D,
) -> Result<Vec<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    let values = Vec::<RestStringOrNumber>::deserialize(deserializer)?;
    values
        .into_iter()
        .map(parse_rest_i64)
        .collect::<Result<Vec<_>, _>>()
        .map_err(serde::de::Error::custom)
}

pub(crate) fn parse_rest_query_i64(value: &str) -> Result<i64, RestRouteError> {
    if value.trim().is_empty() {
        return Ok(0);
    }
    value
        .parse()
        .map_err(|_| RestRouteError::bad_request("invalid organization issue query"))
}

pub(crate) fn parse_rest_query_u32(value: &str) -> Result<u32, RestRouteError> {
    if value.trim().is_empty() {
        return Ok(0);
    }
    value
        .parse()
        .map_err(|_| RestRouteError::bad_request("invalid organization issue query"))
}

pub(crate) fn decode_query_component(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                decoded.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < bytes.len() => {
                let high = (bytes[index + 1] as char).to_digit(16);
                let low = (bytes[index + 2] as char).to_digit(16);
                if let (Some(high), Some(low)) = (high, low) {
                    decoded.push(((high << 4) | low) as u8);
                    index += 3;
                } else {
                    decoded.push(bytes[index]);
                    index += 1;
                }
            }
            byte => {
                decoded.push(byte);
                index += 1;
            }
        }
    }

    String::from_utf8_lossy(&decoded).into_owned()
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
