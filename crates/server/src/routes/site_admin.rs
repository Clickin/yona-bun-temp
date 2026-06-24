use axum::{
    body::Bytes,
    extract::{Path, Query},
    http::StatusCode,
    http::{HeaderMap, Method},
    response::{IntoResponse, Redirect, Response},
    routing::{delete, get, post},
    Json, Router,
};
use base64::{engine::general_purpose, Engine as _};
use bcrypt::{hash, DEFAULT_COST};
use http::HeaderValue;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    path::{Path as StdPath, PathBuf},
    sync::atomic::Ordering,
};
use yoram_domain::ProjectScope;
use yoram_integrations::{deliver_with_config, OutboundMail};

use crate::assets::serve_frontend_page;
use crate::persistence::PilotRepository;
use crate::{
    base_path_href, decode_query_component, delete_project_repository_storage,
    detect_upload_mime_type, gravatar_url, headers_with_form_csrf, internal_error,
    legacy_external_date_string, legacy_external_parse_datetime, map_project_scope,
    normalize_identifier, normalize_issue_label_color, normalize_milestone_state,
    parse_milestone_due_date, percent_encode_uri_component, persistence, project_logo_url,
    random_site_admin_password, random_storage_token, redirect_to, require_authenticated_user,
    require_session, require_valid_csrf, rest_board_label_from_record, rest_repository,
    site_export_filename_stamp, site_import_staging_lock, workspace_avatar_url, AssetMode,
    BrowserRuntimeConfig, ConnectError, PilotServiceImpl, RestBoardLabel,
    RestProjectDeleteResponse, RestRouteError, SmtpRuntimeConfig, SITE_UPDATE_NOTIFICATION_WATCHED,
};

use super::uploaded_file_path_with_root;

mod update;

use update::{
    rest_download_site_update, rest_download_site_update_file, rest_read_site_update,
    rest_site_update_download_file_response, rest_site_update_download_redirect,
};

const SITE_IMPORT_CHECKPOINT_KEY_LIMIT: usize = 256;

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteUsersQuery {
    page: Option<u32>,
    query: Option<String>,
    state: Option<String>,
}

fn direct_site_user_list_href(state: Option<&str>, query: Option<&str>) -> String {
    let mut params = Vec::new();
    if let Some(state) = state.map(str::trim).filter(|state| !state.is_empty()) {
        params.push(format!("state={}", percent_encode_uri_component(state)));
    }
    if let Some(query) = query.map(str::trim).filter(|query| !query.is_empty()) {
        params.push(format!("query={}", percent_encode_uri_component(query)));
    }
    if params.is_empty() {
        "/sites/userList".to_string()
    } else {
        format!("/sites/userList?{}", params.join("&"))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteUserItem {
    avatar_url: String,
    created_at: String,
    display_name: String,
    email_address: String,
    id: i64,
    is_guest: bool,
    is_site_admin: bool,
    last_state_modified_at: String,
    login_id: String,
    state: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteUserListResponse {
    page: u32,
    page_size: u32,
    query: String,
    site_admin_count: u32,
    state: String,
    total: u32,
    total_pages: u32,
    users: Vec<RestSiteUserItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteNoAvatarUserItem {
    email: String,
    login_id: String,
    name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteNoAvatarUsersResponse {
    users: Vec<RestSiteNoAvatarUserItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteUserMutationResponse {
    user: RestSiteUserItem,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteAvatarFromAttachmentBody {
    avatar_file_id: i64,
    email: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteLegacyOkResponse {
    message: String,
    status: u16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteUserPasswordResetResponse {
    is_success: bool,
    login_id: String,
    name: String,
    new_password: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteProjectsQuery {
    filter: Option<String>,
    page: Option<u32>,
    page_num: Option<u32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteProjectItem {
    created_at: String,
    id: i64,
    owner_name: String,
    overview: String,
    project_logo_url: String,
    project_name: String,
    project_scope: String,
    vcs: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteProjectListResponse {
    filter: String,
    page: u32,
    page_size: u32,
    projects: Vec<RestSiteProjectItem>,
    total: u32,
    total_pages: u32,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSitePostsQuery {
    page: Option<u32>,
    page_num: Option<u32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSitePostListResponse {
    page: u32,
    page_size: u32,
    posts: Vec<RestSitePostItem>,
    total: u32,
    total_pages: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSitePostItem {
    author_avatar_url: String,
    author_label: String,
    author_login_id: String,
    comment_count: u32,
    created_label: String,
    created_title: String,
    labels: Vec<RestBoardLabel>,
    notice: bool,
    owner_name: String,
    post_number: String,
    project_logo_url: String,
    project_name: String,
    readme: bool,
    title: String,
    updated_label: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteIssuesQuery {
    page: Option<u32>,
    page_num: Option<u32>,
    state: Option<String>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteImportQuery {
    #[serde(alias = "dry_run", alias = "dry-run")]
    dry_run: Option<String>,
    #[serde(
        alias = "validate_only",
        alias = "validate-only",
        alias = "validateonly"
    )]
    validate_only: Option<String>,
}

impl RestSiteImportQuery {
    fn is_dry_run(&self) -> bool {
        site_import_query_flag(self.dry_run.as_deref())
            || site_import_query_flag(self.validate_only.as_deref())
    }
}

fn site_import_query_flag(value: Option<&str>) -> bool {
    matches!(
        value.map(str::trim).map(str::to_ascii_lowercase).as_deref(),
        Some("true" | "1" | "yes" | "on")
    )
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteIssueItem {
    assignee_label: String,
    author_avatar_url: String,
    author_label: String,
    author_login_id: String,
    comment_count: u32,
    created_label: String,
    created_title: String,
    issue_number: String,
    labels: Vec<RestBoardLabel>,
    milestone_title: String,
    owner_name: String,
    project_logo_url: String,
    project_name: String,
    state: String,
    title: String,
    updated_label: String,
    voter_count: u32,
    watcher_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteIssueListResponse {
    issues: Vec<RestSiteIssueItem>,
    page: u32,
    page_size: u32,
    state: String,
    total: u32,
    total_pages: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteDiagnosticsResponse {
    error_count: u32,
    errors: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteMailOptionsResponse {
    not_configured_items: Vec<String>,
    sender: String,
    sent: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteMailSendBody {
    from: String,
    to: String,
    subject: String,
    body: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteMailListBody {
    all: bool,
    projects: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteMailListResponse {
    recipients: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteExportResponse {
    format: String,
    provenance: String,
    users: Vec<RestSiteUserItem>,
    projects: Vec<RestSiteProjectItem>,
    project_members: Vec<RestSiteExportProjectMemberItem>,
    labels: Vec<RestSiteExportProjectLabelItem>,
    milestones: Vec<RestSiteExportMilestoneItem>,
    posts: Vec<RestSiteExportPostItem>,
    issues: Vec<RestSiteExportIssueItem>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteImportPayload {
    format: String,
    users: Vec<RestSiteImportUserItem>,
    projects: Vec<RestSiteImportProjectItem>,
    project_members: Vec<RestSiteExportProjectMemberItem>,
    labels: Vec<RestSiteExportProjectLabelItem>,
    milestones: Vec<RestSiteExportMilestoneItem>,
    posts: Vec<RestSiteExportPostItem>,
    issues: Vec<RestSiteExportIssueItem>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteImportUserItem {
    #[serde(alias = "createdDate")]
    created_at: String,
    display_name: String,
    email_address: String,
    is_site_admin: bool,
    #[serde(alias = "lastStateModifiedDate")]
    last_state_modified_at: String,
    login_id: String,
    state: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteImportProjectItem {
    #[serde(alias = "projectCreatedDate")]
    created_at: String,
    owner_name: String,
    overview: String,
    project_name: String,
    project_scope: String,
    #[serde(alias = "projectVcs")]
    vcs: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportProjectMemberItem {
    login_id: String,
    owner_name: String,
    project_name: String,
    role: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportProjectLabelItem {
    category_is_exclusive: bool,
    category_name: String,
    color: String,
    #[serde(alias = "labelName")]
    name: String,
    owner_name: String,
    project_name: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportMilestoneItem {
    attachments: Vec<RestSiteExportAttachmentItem>,
    contents_markdown: String,
    due_date: String,
    owner_name: String,
    project_name: String,
    state: String,
    title: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportPostItem {
    author_login_id: String,
    attachments: Vec<RestSiteExportAttachmentItem>,
    body_markdown: String,
    comments: Vec<RestSiteExportCommentItem>,
    #[serde(skip_serializing_if = "String::is_empty")]
    created_at: String,
    history_markdown: String,
    labels: Vec<RestSiteExportLabelItem>,
    notice: bool,
    owner_name: String,
    post_number: String,
    project_name: String,
    readme: bool,
    title: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    updated_at: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportIssueItem {
    assignee_login_id: String,
    author_login_id: String,
    attachments: Vec<RestSiteExportAttachmentItem>,
    body_markdown: String,
    comments: Vec<RestSiteExportCommentItem>,
    #[serde(skip_serializing_if = "String::is_empty")]
    created_at: String,
    history_markdown: String,
    issue_number: String,
    labels: Vec<RestSiteExportLabelItem>,
    milestone_title: String,
    owner_name: String,
    project_name: String,
    state: String,
    title: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    updated_at: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportCommentItem {
    author_login_id: String,
    attachments: Vec<RestSiteExportAttachmentItem>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    child_comments: Vec<RestSiteExportCommentItem>,
    contents_markdown: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    created_at: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportAttachmentItem {
    #[serde(skip_serializing_if = "Option::is_none")]
    content_base64: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    content_sha256: Option<String>,
    #[serde(alias = "createdDate")]
    #[serde(skip_serializing_if = "String::is_empty")]
    created_at: String,
    id: i64,
    mime_type: String,
    name: String,
    size: i64,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportLabelItem {
    category_is_exclusive: bool,
    category_name: String,
    color: String,
    #[serde(alias = "labelName")]
    name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteImportResponse {
    checkpoint: RestSiteImportCheckpoint,
    dry_run: bool,
    imported_projects: u32,
    imported_project_members: u32,
    imported_issues: u32,
    imported_labels: u32,
    imported_milestones: u32,
    imported_posts: u32,
    imported_users: u32,
    skipped_issues: u32,
    skipped_labels: u32,
    skipped_milestones: u32,
    skipped_posts: u32,
    skipped_projects: u32,
    skipped_project_members: u32,
    skipped_users: u32,
    unsupported_sections: Vec<String>,
    validation_errors: Vec<RestSiteImportValidationError>,
    would_import_attachments: u32,
    would_import_projects: u32,
    would_import_project_members: u32,
    would_import_issues: u32,
    would_import_labels: u32,
    would_import_milestones: u32,
    would_import_posts: u32,
    would_import_users: u32,
    would_skip_attachments: u32,
    would_skip_projects: u32,
    would_skip_project_members: u32,
    would_skip_issues: u32,
    would_skip_labels: u32,
    would_skip_milestones: u32,
    would_skip_posts: u32,
    would_skip_users: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteImportValidationError {
    field: String,
    index: u32,
    message: String,
    section: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteImportCheckpoint {
    failure: Option<RestSiteImportCheckpointFailure>,
    sections: Vec<RestSiteImportCheckpointSection>,
    version: u32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteImportCheckpointSection {
    completed: u32,
    next_index: u32,
    resource_keys: Vec<String>,
    resource_keys_truncated: bool,
    section: String,
    skipped: u32,
    total: u32,
    validated: u32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteImportCheckpointFailure {
    index: u32,
    message: String,
    resource_key: String,
    section: String,
}

impl RestSiteImportCheckpoint {
    fn from_payload(payload: &RestSiteImportPayload) -> Self {
        let mut checkpoint = Self {
            failure: None,
            sections: Vec::new(),
            version: 1,
        };
        checkpoint.push_section(
            "users",
            payload
                .users
                .iter()
                .map(|user| rest_site_import_user_key(user.login_id.trim())),
        );
        checkpoint.push_section(
            "projects",
            payload.projects.iter().map(|project| {
                rest_site_import_project_key(project.owner_name.trim(), project.project_name.trim())
            }),
        );
        checkpoint.push_section(
            "projectMembers",
            payload.project_members.iter().map(|member| {
                rest_site_import_project_member_key(
                    member.owner_name.trim(),
                    member.project_name.trim(),
                    member.login_id.trim(),
                )
            }),
        );
        checkpoint.push_section(
            "labels",
            payload.labels.iter().map(|label| {
                rest_site_import_label_key(
                    label.owner_name.trim(),
                    label.project_name.trim(),
                    rest_site_import_label_category_name(label.category_name.trim()),
                    label.name.trim(),
                )
            }),
        );
        checkpoint.push_section(
            "milestones",
            payload.milestones.iter().map(|milestone| {
                rest_site_import_milestone_key(
                    milestone.owner_name.trim(),
                    milestone.project_name.trim(),
                    milestone.title.trim(),
                )
            }),
        );
        checkpoint.push_section(
            "posts",
            payload.posts.iter().map(|post| {
                rest_site_import_post_key(
                    post.owner_name.trim(),
                    post.project_name.trim(),
                    post.post_number.trim(),
                    post.title.trim(),
                )
            }),
        );
        checkpoint.push_section(
            "issues",
            payload.issues.iter().map(|issue| {
                rest_site_import_issue_key(
                    issue.owner_name.trim(),
                    issue.project_name.trim(),
                    issue.issue_number.trim(),
                    issue.title.trim(),
                )
            }),
        );
        checkpoint.push_section(
            "attachments",
            rest_site_import_attachment_keys(payload).into_iter(),
        );
        checkpoint
    }

    fn mark_all_validated(&mut self) {
        for section in &mut self.sections {
            section.validated = section.total;
        }
    }

    fn mark_completed(&mut self, section: &str, index: usize) {
        if let Some(section) = self.section_mut(section) {
            section.completed = section.completed.saturating_add(1);
            section.next_index = (index as u32).saturating_add(1);
        }
    }

    fn mark_counts(&mut self, would_skip: &RestSiteImportCountSet) {
        for section in &mut self.sections {
            section.skipped = match section.section.as_str() {
                "attachments" => would_skip.attachments,
                "issues" => would_skip.issues,
                "labels" => would_skip.labels,
                "milestones" => would_skip.milestones,
                "posts" => would_skip.posts,
                "projects" => would_skip.projects,
                "projectMembers" => would_skip.project_members,
                "users" => would_skip.users,
                _ => 0,
            };
        }
    }

    fn mark_skipped(&mut self, section: &str, index: usize) {
        if let Some(section) = self.section_mut(section) {
            section.skipped = section.skipped.saturating_add(1);
            section.next_index = (index as u32).saturating_add(1);
        }
    }

    fn set_failure(
        &mut self,
        section: &str,
        index: usize,
        resource_key: impl Into<String>,
        message: impl Into<String>,
    ) {
        if self.failure.is_some() {
            return;
        }
        self.failure = Some(RestSiteImportCheckpointFailure {
            index: index as u32,
            message: message.into(),
            resource_key: resource_key.into(),
            section: section.to_string(),
        });
    }

    fn push_section(&mut self, section: &str, keys: impl Iterator<Item = String>) {
        let mut resource_keys = Vec::new();
        let mut total = 0u32;
        let mut truncated = false;
        for key in keys {
            total = total.saturating_add(1);
            if resource_keys.len() < SITE_IMPORT_CHECKPOINT_KEY_LIMIT {
                resource_keys.push(key);
            } else {
                truncated = true;
            }
        }
        self.sections.push(RestSiteImportCheckpointSection {
            completed: 0,
            next_index: 0,
            resource_keys,
            resource_keys_truncated: truncated,
            section: section.to_string(),
            skipped: 0,
            total,
            validated: 0,
        });
    }

    fn section_mut(&mut self, section: &str) -> Option<&mut RestSiteImportCheckpointSection> {
        self.sections
            .iter_mut()
            .find(|candidate| candidate.section == section)
    }
}

fn rest_site_import_user_key(login_id: &str) -> String {
    format!("users:{}", rest_site_import_key_part(login_id))
}

fn rest_site_import_project_key(owner_name: &str, project_name: &str) -> String {
    format!(
        "projects:{}/{}",
        rest_site_import_key_part(owner_name),
        rest_site_import_key_part(project_name)
    )
}

fn rest_site_import_project_member_key(
    owner_name: &str,
    project_name: &str,
    login_id: &str,
) -> String {
    format!(
        "projectMembers:{}/{}:{}",
        rest_site_import_key_part(owner_name),
        rest_site_import_key_part(project_name),
        rest_site_import_key_part(login_id)
    )
}

fn rest_site_import_label_key(
    owner_name: &str,
    project_name: &str,
    category_name: &str,
    label_name: &str,
) -> String {
    format!(
        "labels:{}/{}:{}:{}",
        rest_site_import_key_part(owner_name),
        rest_site_import_key_part(project_name),
        rest_site_import_key_part(category_name),
        rest_site_import_key_part(label_name)
    )
}

fn rest_site_import_milestone_key(owner_name: &str, project_name: &str, title: &str) -> String {
    format!(
        "milestones:{}/{}:{}",
        rest_site_import_key_part(owner_name),
        rest_site_import_key_part(project_name),
        rest_site_import_key_part(title)
    )
}

fn rest_site_import_post_key(
    owner_name: &str,
    project_name: &str,
    post_number: &str,
    title: &str,
) -> String {
    let local_key = if post_number.is_empty() {
        format!("title={}", rest_site_import_key_part(title))
    } else {
        format!("number={}", rest_site_import_key_part(post_number))
    };
    format!(
        "posts:{}/{}:{}",
        rest_site_import_key_part(owner_name),
        rest_site_import_key_part(project_name),
        local_key
    )
}

fn rest_site_import_issue_key(
    owner_name: &str,
    project_name: &str,
    issue_number: &str,
    title: &str,
) -> String {
    let local_key = if issue_number.is_empty() {
        format!("title={}", rest_site_import_key_part(title))
    } else {
        format!("number={}", rest_site_import_key_part(issue_number))
    };
    format!(
        "issues:{}/{}:{}",
        rest_site_import_key_part(owner_name),
        rest_site_import_key_part(project_name),
        local_key
    )
}

fn rest_site_import_comment_key(
    section: &str,
    owner_name: &str,
    project_name: &str,
    parent_number: i64,
    contents_markdown: &str,
) -> String {
    format!(
        "{section}:{}/{}#{}:{}",
        rest_site_import_key_part(owner_name),
        rest_site_import_key_part(project_name),
        parent_number,
        rest_site_import_key_part(contents_markdown)
    )
}

fn rest_site_import_attachment_keys(payload: &RestSiteImportPayload) -> Vec<String> {
    let mut keys = Vec::new();
    for attachment in payload
        .milestones
        .iter()
        .flat_map(|milestone| milestone.attachments.iter())
        .chain(
            payload
                .posts
                .iter()
                .flat_map(|post| post.attachments.iter()),
        )
        .chain(
            payload
                .issues
                .iter()
                .flat_map(|issue| issue.attachments.iter()),
        )
    {
        keys.push(rest_site_import_attachment_key(attachment));
    }
    for post in &payload.posts {
        rest_site_import_comment_attachment_keys(&post.comments, &mut keys);
    }
    for issue in &payload.issues {
        rest_site_import_comment_attachment_keys(&issue.comments, &mut keys);
    }
    keys
}

fn rest_site_import_comment_attachment_keys(
    comments: &[RestSiteExportCommentItem],
    keys: &mut Vec<String>,
) {
    for comment in comments {
        keys.extend(
            comment
                .attachments
                .iter()
                .map(rest_site_import_attachment_key),
        );
        rest_site_import_comment_attachment_keys(&comment.child_comments, keys);
    }
}

fn rest_site_import_attachment_key(attachment: &RestSiteExportAttachmentItem) -> String {
    format!(
        "attachments:{}:{}",
        attachment.id,
        rest_site_import_key_part(attachment.name.trim())
    )
}

fn rest_site_import_key_part(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return "<empty>".to_string();
    }
    trimmed.chars().take(120).collect()
}

#[derive(Default)]
struct RestSiteImportCountSet {
    attachments: u32,
    projects: u32,
    project_members: u32,
    issues: u32,
    labels: u32,
    milestones: u32,
    posts: u32,
    users: u32,
}

impl RestSiteImportResponse {
    fn imported(
        imported: RestSiteImportCountSet,
        skipped: RestSiteImportCountSet,
        unsupported_sections: Vec<String>,
        checkpoint: RestSiteImportCheckpoint,
    ) -> Self {
        Self {
            checkpoint,
            dry_run: false,
            imported_projects: imported.projects,
            imported_project_members: imported.project_members,
            imported_issues: imported.issues,
            imported_labels: imported.labels,
            imported_milestones: imported.milestones,
            imported_posts: imported.posts,
            imported_users: imported.users,
            skipped_issues: skipped.issues,
            skipped_labels: skipped.labels,
            skipped_milestones: skipped.milestones,
            skipped_posts: skipped.posts,
            skipped_projects: skipped.projects,
            skipped_project_members: skipped.project_members,
            skipped_users: skipped.users,
            unsupported_sections,
            validation_errors: Vec::new(),
            would_import_attachments: 0,
            would_import_projects: 0,
            would_import_project_members: 0,
            would_import_issues: 0,
            would_import_labels: 0,
            would_import_milestones: 0,
            would_import_posts: 0,
            would_import_users: 0,
            would_skip_attachments: 0,
            would_skip_projects: 0,
            would_skip_project_members: 0,
            would_skip_issues: 0,
            would_skip_labels: 0,
            would_skip_milestones: 0,
            would_skip_posts: 0,
            would_skip_users: 0,
        }
    }

    fn dry_run(
        would_import: RestSiteImportCountSet,
        would_skip: RestSiteImportCountSet,
        validation_errors: Vec<RestSiteImportValidationError>,
        unsupported_sections: Vec<String>,
        checkpoint: RestSiteImportCheckpoint,
    ) -> Self {
        Self {
            checkpoint,
            dry_run: true,
            imported_projects: 0,
            imported_project_members: 0,
            imported_issues: 0,
            imported_labels: 0,
            imported_milestones: 0,
            imported_posts: 0,
            imported_users: 0,
            skipped_issues: 0,
            skipped_labels: 0,
            skipped_milestones: 0,
            skipped_posts: 0,
            skipped_projects: 0,
            skipped_project_members: 0,
            skipped_users: 0,
            unsupported_sections,
            validation_errors,
            would_import_attachments: would_import.attachments,
            would_import_projects: would_import.projects,
            would_import_project_members: would_import.project_members,
            would_import_issues: would_import.issues,
            would_import_labels: would_import.labels,
            would_import_milestones: would_import.milestones,
            would_import_posts: would_import.posts,
            would_import_users: would_import.users,
            would_skip_attachments: would_skip.attachments,
            would_skip_projects: would_skip.projects,
            would_skip_project_members: would_skip.project_members,
            would_skip_issues: would_skip.issues,
            would_skip_labels: would_skip.labels,
            would_skip_milestones: would_skip.milestones,
            would_skip_posts: would_skip.posts,
            would_skip_users: would_skip.users,
        }
    }

    fn failed(checkpoint: RestSiteImportCheckpoint) -> Self {
        Self {
            checkpoint,
            dry_run: false,
            imported_projects: 0,
            imported_project_members: 0,
            imported_issues: 0,
            imported_labels: 0,
            imported_milestones: 0,
            imported_posts: 0,
            imported_users: 0,
            skipped_issues: 0,
            skipped_labels: 0,
            skipped_milestones: 0,
            skipped_posts: 0,
            skipped_projects: 0,
            skipped_project_members: 0,
            skipped_users: 0,
            unsupported_sections: Vec::new(),
            validation_errors: Vec::new(),
            would_import_attachments: 0,
            would_import_projects: 0,
            would_import_project_members: 0,
            would_import_issues: 0,
            would_import_labels: 0,
            would_import_milestones: 0,
            would_import_posts: 0,
            would_import_users: 0,
            would_skip_attachments: 0,
            would_skip_projects: 0,
            would_skip_project_members: 0,
            would_skip_issues: 0,
            would_skip_labels: 0,
            would_skip_milestones: 0,
            would_skip_posts: 0,
            would_skip_users: 0,
        }
    }
}

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/site/users",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestSiteUsersQuery>| {
                    let service = service.clone();
                    async move { rest_read_site_users(headers, query, service).await }
                }
            }),
        )
        .route(
            "/site/no-avatar-users",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_read_site_no_avatar_users(headers, service).await }
                }
            }),
        )
        .route(
            "/site/users/avatar-from-attachment",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestSiteAvatarFromAttachmentBody>| {
                    let service = service.clone();
                    async move {
                        rest_set_site_user_avatar_from_attachment(headers, body, service).await
                    }
                }
            }),
        )
        .route(
            "/site/users/{login_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_delete_site_user(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/site/users/{login_id}/site-admin/toggle",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_toggle_site_user_admin(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/site/users/{login_id}/account-lock/toggle",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_toggle_site_user_account_lock(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/site/users/{login_id}/guest/toggle",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_toggle_site_user_guest(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/site/users/{login_id}/password/reset",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_reset_site_user_password(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/site/projects",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestSiteProjectsQuery>| {
                    let service = service.clone();
                    async move { rest_read_site_projects(headers, query, service).await }
                }
            }),
        )
        .route(
            "/site/posts",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestSitePostsQuery>| {
                    let service = service.clone();
                    async move { rest_read_site_posts(headers, query, service).await }
                }
            }),
        )
        .route(
            "/site/issues",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestSiteIssuesQuery>| {
                    let service = service.clone();
                    async move { rest_read_site_issues(headers, query, service).await }
                }
            }),
        )
        .route(
            "/site/diagnostics",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_read_site_diagnostics(headers, service).await }
                }
            }),
        )
        .route(
            "/site/update",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move {
                        rest_read_site_update(headers, service).await
                    }
                }
            }),
        )
        .route(
            "/site/update/download",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move {
                        rest_download_site_update(headers, service).await
                    }
                }
            }),
        )
        .route(
            "/site/update/download-file",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move {
                        rest_download_site_update_file(headers, service).await
                    }
                }
            }),
        )
        .route(
            "/site/mail",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_read_site_mail(headers, service).await }
                }
            }),
        )
        .route(
            "/site/mail/test",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestSiteMailSendBody>| {
                    let service = service.clone();
                    async move { rest_send_site_test_mail(headers, body, service).await }
                }
            }),
        )
        .route(
            "/site/mail-list",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestSiteMailListBody>| {
                    let service = service.clone();
                    async move { rest_read_site_mail_list(headers, body, service).await }
                }
            }),
        )
        .route(
            "/site/projects/{project_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap, Path(project_id): Path<i64>| {
                    let service = service.clone();
                    async move { rest_delete_site_project(headers, project_id, service).await }
                }
            }),
        )
}

pub(crate) fn routes(
    service: PilotServiceImpl,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
) -> Router {
    let site_diagnostic_shell_assets = assets.clone();
    let site_diagnostic_shell_browser_runtime = browser_runtime.clone();
    let site_mail_shell_assets = assets;
    let site_mail_shell_browser_runtime = browser_runtime;
    let unwatch_service = service.clone();
    let site_update_download_service = service.clone();
    let site_update_download_file_service = service.clone();
    let site_toggle_admin_service = service.clone();
    let site_toggle_lock_service = service.clone();
    let site_toggle_guest_service = service.clone();
    let site_delete_user_service = service.clone();
    let site_delete_project_service = service.clone();
    let site_reset_user_password_service = service.clone();
    let site_diagnostic_shell_service = service.clone();
    let site_no_avatar_service = service.clone();
    let site_set_avatar_service = service.clone();
    let site_mail_send_service = service.clone();
    let site_mail_list_service = service.clone();
    let site_export_service = service.clone();
    let site_import_service = service;

    Router::new()
        .route(
            "/sites/export",
            get(move |headers: HeaderMap| {
                async move {
                    direct_export_site_data(
                        headers,
                        site_export_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/import",
            post(move |headers: HeaderMap, Query(query): Query<RestSiteImportQuery>, body: Bytes| {
                async move {
                    direct_import_site_data(
                        headers,
                        query,
                        body,
                        site_import_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/diagnostic",
            get(move |headers: HeaderMap| {
                let assets = site_diagnostic_shell_assets.clone();
                let browser_runtime = site_diagnostic_shell_browser_runtime.clone();
                async move {
                    direct_read_site_diagnostic_shell(
                        headers,
                        site_diagnostic_shell_service.clone(),
                        assets,
                        browser_runtime,
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/noAvatarUsers",
            get(move |headers: HeaderMap| {
                async move {
                    direct_read_site_no_avatar_users(
                        headers,
                        site_no_avatar_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/setAttachmentToUserAvatar",
            post(move |headers: HeaderMap, body: Bytes| {
                async move {
                    direct_set_attachment_to_user_avatar(
                        headers,
                        body,
                        site_set_avatar_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/mail",
            get({
                let assets = site_mail_shell_assets.clone();
                let browser_runtime = site_mail_shell_browser_runtime.clone();
                move || {
                    let assets = assets.clone();
                    let browser_runtime = browser_runtime.clone();
                    async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
                }
            })
            .post(move |headers: HeaderMap, body: Bytes| {
                async move {
                    direct_send_site_mail(
                        headers,
                        body,
                        site_mail_send_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/mailList",
            post(move |headers: HeaderMap, body: Bytes| {
                async move {
                    direct_read_site_mail_list(
                        headers,
                        body,
                        site_mail_list_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/unwatchUpdate",
            post(move |headers: HeaderMap| {
                let service = unwatch_service.clone();
                async move { direct_unwatch_site_update(headers, service).await }
            }),
        )
        .route(
            "/sites/update/download",
            get(move |headers: HeaderMap| async move {
                direct_download_site_update(
                    headers,
                    site_update_download_service.clone(),
                )
                .await
            }),
        )
        .route(
            "/sites/update/download-file",
            get(move |headers: HeaderMap| async move {
                direct_download_site_update_file(
                    headers,
                    site_update_download_file_service.clone(),
                )
                .await
            }),
        )
        .route(
            "/sites/toggleSiteAdminRole/{login_id}",
            post(move |headers: HeaderMap, Path(login_id): Path<String>| {
                async move {
                    direct_toggle_site_admin_role(
                        headers,
                        login_id,
                        site_toggle_admin_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/toggleAccountLock",
            post(
                move |headers: HeaderMap, Query(query): Query<RestSiteDirectUserMutationQuery>| {
                    async move {
                        direct_toggle_site_user_account_lock(
                            headers,
                            query,
                            site_toggle_lock_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/sites/toggleGuestMode",
            post(
                move |headers: HeaderMap, Query(query): Query<RestSiteDirectUserMutationQuery>| {
                    async move {
                        direct_toggle_site_user_guest(
                            headers,
                            query,
                            site_toggle_guest_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/sites/user/{*legacy_path}",
            axum::routing::delete(move |headers: HeaderMap, Path(legacy_path): Path<String>| {
                async move {
                    direct_delete_site_user_by_legacy_path(
                        headers,
                        legacy_path,
                        site_delete_user_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/project/delete/{project_id}",
            axum::routing::delete(move |headers: HeaderMap, Path(project_id): Path<i64>| {
                async move {
                    direct_delete_site_project(
                        headers,
                        project_id,
                        site_delete_project_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{login_id}",
            post(move |headers: HeaderMap, Path(login_id): Path<String>| {
                async move {
                    direct_reset_site_user_password(
                        headers,
                        login_id,
                        site_reset_user_password_service.clone(),
                    )
                    .await
                }
            }),
        )
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteDirectUserMutationQuery {
    login_id: String,
    query: Option<String>,
    state: Option<String>,
}

async fn direct_read_site_diagnostic_shell(
    headers: HeaderMap,
    service: PilotServiceImpl,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    match rest_read_site_diagnostics(headers, service).await {
        Ok(payload) => match assets {
            AssetMode::None => payload.into_response(),
            assets => serve_frontend_page(assets, Method::GET, browser_runtime).await,
        },
        Err(error) => error.into_response(),
    }
}

async fn direct_read_site_no_avatar_users(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Response {
    match rest_read_site_no_avatar_users(headers, service).await {
        Ok(payload) => payload.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_export_site_data(headers: HeaderMap, service: PilotServiceImpl) -> Response {
    match rest_export_site_data(headers, service).await {
        Ok(payload) => direct_site_export_response(&payload),
        Err(error) => error.into_response(),
    }
}

async fn direct_import_site_data(
    headers: HeaderMap,
    query: RestSiteImportQuery,
    body: Bytes,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let (form, payload, is_multipart, has_data_file) = direct_site_import_payload(&headers, &body);
    if is_multipart && !has_data_file {
        return Redirect::to(&base_path_href(&base_path, "/sites/data")).into_response();
    }
    let headers = headers_with_form_csrf(headers, &form);
    match rest_import_site_data(headers, &payload, service, query.is_dry_run()).await {
        Ok((status, payload)) => {
            let payload = payload.0;
            if is_multipart && status == StatusCode::OK && !payload.dry_run {
                Redirect::to(&base_path_href(&base_path, "/")).into_response()
            } else {
                (status, Json(payload)).into_response()
            }
        }
        Err(error) => error.into_response(),
    }
}

fn direct_site_export_response(payload: &RestSiteExportResponse) -> Response {
    match serde_json::to_vec(payload) {
        Ok(body) => {
            let mut response = body.into_response();
            let headers = response.headers_mut();
            headers.insert(
                axum::http::header::CONTENT_TYPE,
                HeaderValue::from_static("application/x-download"),
            );
            if let Ok(header_value) = HeaderValue::from_str(&format!(
                "attachment; filename=yobi-data-{}.json",
                site_export_filename_stamp()
            )) {
                headers.insert(axum::http::header::CONTENT_DISPOSITION, header_value);
            }
            response
        }
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
}

fn direct_site_import_payload(
    headers: &HeaderMap,
    body: &[u8],
) -> (HashMap<String, String>, String, bool, bool) {
    let content_type = headers
        .get(http::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    if !content_type
        .to_ascii_lowercase()
        .starts_with("multipart/form-data")
    {
        return (
            HashMap::new(),
            String::from_utf8_lossy(body).to_string(),
            false,
            true,
        );
    }
    let Some(boundary) = content_type
        .split(';')
        .map(str::trim)
        .find_map(|part| part.strip_prefix("boundary="))
        .map(|part| part.trim_matches('"').to_string())
    else {
        return (HashMap::new(), String::new(), true, false);
    };
    let mut form = HashMap::new();
    let mut data = String::new();
    let mut has_data_file = false;
    let text = String::from_utf8_lossy(body);
    for part in text.split(&format!("--{boundary}")) {
        let Some((headers, value)) = part.split_once("\r\n\r\n") else {
            continue;
        };
        let Some(name) = headers
            .split(';')
            .find_map(|segment| segment.trim().strip_prefix("name=\""))
            .and_then(|segment| segment.split('"').next())
        else {
            continue;
        };
        let value = value
            .trim_start_matches("\r\n")
            .trim_end_matches("\r\n")
            .trim_end_matches("--")
            .to_string();
        if name == "data" {
            has_data_file = headers.contains("filename=");
            data = value;
        } else {
            form.insert(name.to_string(), value);
        }
    }
    (form, data, true, has_data_file)
}

async fn direct_set_attachment_to_user_avatar(
    headers: HeaderMap,
    body: Bytes,
    service: PilotServiceImpl,
) -> Response {
    let Ok(body) = serde_json::from_slice::<RestSiteAvatarFromAttachmentBody>(&body) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "message": "Expecting Json data" })),
        )
            .into_response();
    };
    match rest_set_site_user_avatar_from_attachment(headers, body, service).await {
        Ok(payload) => payload.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_read_site_mail_list(
    headers: HeaderMap,
    body: Bytes,
    service: PilotServiceImpl,
) -> Response {
    let body = direct_site_mail_list_body(&body);
    match rest_read_site_mail_list(headers, body, service).await {
        Ok(payload) => Json(payload.0.recipients).into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_send_site_mail(
    headers: HeaderMap,
    body: Bytes,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let form = direct_site_mail_form(&body);
    let headers = headers_with_form_csrf(headers, &form);
    let body = RestSiteMailSendBody {
        from: form.get("from").cloned().unwrap_or_default(),
        to: form.get("to").cloned().unwrap_or_default(),
        subject: form.get("subject").cloned().unwrap_or_default(),
        body: form.get("body").cloned().unwrap_or_default(),
    };
    match rest_send_site_test_mail(headers, body, service).await {
        Ok(_) => {
            Redirect::to(&base_path_href(&base_path, "/sites/mail?sended=true")).into_response()
        }
        Err(error) => error.into_response(),
    }
}

fn direct_site_mail_form(body: &[u8]) -> HashMap<String, String> {
    if let Ok(body) = serde_json::from_slice::<RestSiteMailSendBody>(body) {
        return HashMap::from([
            ("from".to_string(), body.from),
            ("to".to_string(), body.to),
            ("subject".to_string(), body.subject),
            ("body".to_string(), body.body),
        ]);
    }
    let raw = std::str::from_utf8(body).unwrap_or_default();
    let mut parsed = HashMap::new();
    for pair in raw.split('&').filter(|pair| !pair.is_empty()) {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        parsed.insert(decode_query_component(key), decode_query_component(value));
    }
    parsed
}

fn direct_site_mail_list_body(body: &[u8]) -> RestSiteMailListBody {
    if let Ok(body) = serde_json::from_slice::<RestSiteMailListBody>(body) {
        return body;
    }
    let raw = std::str::from_utf8(body).unwrap_or_default();
    let mut parsed = RestSiteMailListBody::default();
    for pair in raw.split('&').filter(|pair| !pair.is_empty()) {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        let key = decode_query_component(key);
        let value = decode_query_component(value);
        if key == "all" {
            parsed.all = value.trim().eq_ignore_ascii_case("true");
            if parsed.all {
                parsed.projects.clear();
            }
        } else if !parsed.all && !value.trim().is_empty() {
            parsed.projects.push(value);
        }
    }
    parsed
}

async fn direct_unwatch_site_update(headers: HeaderMap, service: PilotServiceImpl) -> Response {
    match rest_require_site_admin_repository(&service, &headers, true).await {
        Ok(_) => {
            SITE_UPDATE_NOTIFICATION_WATCHED.store(false, Ordering::SeqCst);
            StatusCode::OK.into_response()
        }
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_admin_role(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_toggle_site_user_admin(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, "/sites/userList"),
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_user_account_lock(
    headers: HeaderMap,
    query: RestSiteDirectUserMutationQuery,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let login_id = query.login_id.trim().to_string();
    if login_id.is_empty() {
        return RestRouteError::bad_request("loginId is required").into_response();
    }
    let redirect_path = direct_site_user_list_href(query.state.as_deref(), query.query.as_deref());
    match rest_toggle_site_user_account_lock(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_user_guest(
    headers: HeaderMap,
    query: RestSiteDirectUserMutationQuery,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let login_id = query.login_id.trim().to_string();
    if login_id.is_empty() {
        return RestRouteError::bad_request("loginId is required").into_response();
    }
    let redirect_path = direct_site_user_list_href(query.state.as_deref(), query.query.as_deref());
    match rest_toggle_site_user_guest(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

async fn direct_reset_site_user_password(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Response {
    match rest_reset_site_user_password(headers, login_id, service).await {
        Ok(payload) => payload.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_delete_site_user_by_legacy_path(
    headers: HeaderMap,
    legacy_path: String,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let user_id = match direct_site_user_delete_id(&legacy_path) {
        Ok(user_id) => user_id,
        Err(error) => return error.into_response(),
    };
    let repository = match rest_require_site_admin_repository(&service, &headers, true).await {
        Ok(repository) => repository,
        Err(error) => return error.into_response(),
    };
    let user = match repository.find_user_by_id(user_id).await {
        Ok(Some(user)) => user,
        Ok(None) => return RestRouteError::not_found("user not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    match repository.delete_site_user(&user.login_id).await {
        Ok(persistence::SiteUserDeleteResult::Deleted(_)) => {
            redirect_to(&base_path, "/sites/userList")
        }
        Ok(persistence::SiteUserDeleteResult::NotFound) => {
            RestRouteError::not_found("user not found").into_response()
        }
        Ok(persistence::SiteUserDeleteResult::OnlyManager) => RestRouteError::from_connect_error(
            ConnectError::permission_denied("site.userList.deleteAlert"),
        )
        .into_response(),
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
}

async fn direct_delete_site_project(
    headers: HeaderMap,
    project_id: i64,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_delete_site_project(headers, project_id, service).await {
        Ok(_) => redirect_to(&base_path, "/sites/projectList"),
        Err(error) => error.into_response(),
    }
}

fn direct_site_user_delete_id(legacy_path: &str) -> Result<i64, RestRouteError> {
    let Some(candidate) = legacy_path
        .strip_prefix("delete/")
        .or_else(|| legacy_path.strip_prefix("delete"))
    else {
        return Err(RestRouteError::not_found("user not found"));
    };
    candidate
        .trim()
        .parse()
        .map_err(|_| RestRouteError::bad_request("invalid user id"))
}

async fn direct_download_site_update(headers: HeaderMap, service: PilotServiceImpl) -> Response {
    match rest_require_site_admin_repository(&service, &headers, false).await {
        Ok(_) => match rest_site_update_download_redirect(&service.site_update) {
            Ok(redirect) => redirect.into_response(),
            Err(error) => error.into_response(),
        },
        Err(error) => error.into_response(),
    }
}

async fn direct_download_site_update_file(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Response {
    match rest_require_site_admin_repository(&service, &headers, false).await {
        Ok(_) => match rest_site_update_download_file_response(&service.site_update) {
            Ok(response) => response,
            Err(error) => error.into_response(),
        },
        Err(error) => error.into_response(),
    }
}

async fn rest_read_site_users(
    headers: HeaderMap,
    query: RestSiteUsersQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserListResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let state = rest_site_user_state(query.state)?;
    let record = repository
        .list_site_users(persistence::SiteUserListFilter {
            page: query.page.unwrap_or(1).max(1),
            query: query.query.unwrap_or_default(),
            state,
        })
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    Ok(Json(
        rest_site_user_list_from_record(&repository, &service.base_path, record)
            .await
            .map_err(RestRouteError::from_connect_error)?,
    ))
}

async fn rest_read_site_no_avatar_users(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteNoAvatarUsersResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let users = repository
        .list_site_no_avatar_users()
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    Ok(Json(RestSiteNoAvatarUsersResponse {
        users: users
            .into_iter()
            .map(rest_site_no_avatar_user_from_record)
            .collect(),
    }))
}

async fn rest_set_site_user_avatar_from_attachment(
    headers: HeaderMap,
    body: RestSiteAvatarFromAttachmentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteLegacyOkResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    if body.avatar_file_id <= 0 {
        return Err(RestRouteError::bad_request("avatarFileId is required"));
    }
    if body.email.trim().is_empty() {
        return Err(RestRouteError::bad_request("email is required"));
    }

    match repository
        .set_user_avatar_from_attachment_by_email(&body.email, body.avatar_file_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
    {
        persistence::SiteUserAvatarFromAttachmentResult::Applied
        | persistence::SiteUserAvatarFromAttachmentResult::Ignored => {
            Ok(Json(rest_site_legacy_ok_response()))
        }
        persistence::SiteUserAvatarFromAttachmentResult::AttachmentNotFound => {
            Err(RestRouteError::not_found("attachment not found"))
        }
        persistence::SiteUserAvatarFromAttachmentResult::UserNotFound => {
            Err(RestRouteError::not_found("user not found"))
        }
    }
}

async fn rest_toggle_site_user_admin(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserMutationResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let user = repository
        .toggle_site_admin_role(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .ok_or_else(|| RestRouteError::not_found("user not found"))?;

    Ok(Json(RestSiteUserMutationResponse {
        user: rest_site_user_from_record(&repository, &service.base_path, user)
            .await
            .map_err(RestRouteError::from_connect_error)?,
    }))
}

async fn rest_toggle_site_user_account_lock(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserMutationResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let user = repository
        .toggle_site_user_account_lock(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .ok_or_else(|| RestRouteError::not_found("user not found"))?;

    Ok(Json(RestSiteUserMutationResponse {
        user: rest_site_user_from_record(&repository, &service.base_path, user)
            .await
            .map_err(RestRouteError::from_connect_error)?,
    }))
}

async fn rest_toggle_site_user_guest(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserMutationResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let user = repository
        .toggle_site_user_guest_mode(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .ok_or_else(|| RestRouteError::not_found("user not found"))?;

    Ok(Json(RestSiteUserMutationResponse {
        user: rest_site_user_from_record(&repository, &service.base_path, user)
            .await
            .map_err(RestRouteError::from_connect_error)?,
    }))
}

async fn rest_delete_site_user(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserMutationResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let user = match repository
        .delete_site_user(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
    {
        persistence::SiteUserDeleteResult::Deleted(user) => user,
        persistence::SiteUserDeleteResult::NotFound => {
            return Err(RestRouteError::not_found("user not found"));
        }
        persistence::SiteUserDeleteResult::OnlyManager => {
            return Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("site.userList.deleteAlert"),
            ));
        }
    };

    Ok(Json(RestSiteUserMutationResponse {
        user: rest_site_user_from_record(&repository, &service.base_path, user)
            .await
            .map_err(RestRouteError::from_connect_error)?,
    }))
}

async fn rest_reset_site_user_password(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserPasswordResetResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let user = repository
        .find_user_by_login_id(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .filter(|user| normalize_identifier(&user.login_id) != "anonymous")
        .ok_or_else(|| RestRouteError::not_found("user not found"))?;
    let new_password = random_site_admin_password();
    let password_hash = hash(&new_password, DEFAULT_COST)
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    repository
        .update_password_hash_for_user(user.id, &password_hash)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    Ok(Json(RestSiteUserPasswordResetResponse {
        is_success: true,
        login_id: user.login_id,
        name: user.display_name,
        new_password,
    }))
}

async fn rest_read_site_projects(
    headers: HeaderMap,
    query: RestSiteProjectsQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteProjectListResponse>, RestRouteError> {
    const SITE_PROJECT_PAGE_SIZE: usize = 30;

    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let filter = query.filter.unwrap_or_default().trim().to_string();
    let normalized_filter = normalize_identifier(&filter);
    let page = query.page.or(query.page_num).unwrap_or(1).max(1);
    let mut projects = repository
        .list_projects()
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .into_iter()
        .filter(|project| {
            normalized_filter.is_empty()
                || normalize_identifier(&project.project_name).contains(&normalized_filter)
        })
        .collect::<Vec<_>>();
    projects.sort_by(|left, right| {
        right
            .created_date
            .cmp(&left.created_date)
            .then_with(|| left.owner_name.cmp(&right.owner_name))
            .then_with(|| left.project_name.cmp(&right.project_name))
    });

    let total = projects.len();
    let offset = ((page - 1) as usize).saturating_mul(SITE_PROJECT_PAGE_SIZE);
    let mut page_projects = Vec::new();
    for project in projects
        .into_iter()
        .skip(offset)
        .take(SITE_PROJECT_PAGE_SIZE)
    {
        page_projects.push(
            rest_site_project_from_record(&repository, &service.base_path, project)
                .await
                .map_err(RestRouteError::from_connect_error)?,
        );
    }
    let total_pages = if total == 0 {
        0
    } else {
        total.div_ceil(SITE_PROJECT_PAGE_SIZE)
    };

    Ok(Json(RestSiteProjectListResponse {
        filter,
        page,
        page_size: SITE_PROJECT_PAGE_SIZE as u32,
        projects: page_projects,
        total: total as u32,
        total_pages: total_pages as u32,
    }))
}

async fn rest_read_site_posts(
    headers: HeaderMap,
    query: RestSitePostsQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestSitePostListResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let record = repository
        .list_site_postings(query.page.or(query.page_num).unwrap_or(1))
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    let mut posts = Vec::new();
    for post in &record.posts {
        posts.push(
            rest_site_post_from_record(&repository, &service.base_path, post)
                .await
                .map_err(RestRouteError::from_connect_error)?,
        );
    }

    Ok(Json(RestSitePostListResponse {
        page: record.page,
        page_size: record.page_size,
        posts,
        total: record.total,
        total_pages: record.total_pages,
    }))
}

async fn rest_read_site_issues(
    headers: HeaderMap,
    query: RestSiteIssuesQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteIssueListResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let state = rest_site_issue_state(query.state)?;
    let record = repository
        .list_site_issues(&state, query.page.or(query.page_num).unwrap_or(1))
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    let mut issues = Vec::new();
    for issue in &record.issues {
        issues.push(
            rest_site_issue_from_record(&repository, &service.base_path, issue)
                .await
                .map_err(RestRouteError::from_connect_error)?,
        );
    }

    Ok(Json(RestSiteIssueListResponse {
        issues,
        page: record.page,
        page_size: record.page_size,
        state: record.state,
        total: record.total,
        total_pages: record.total_pages,
    }))
}

async fn rest_read_site_diagnostics(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteDiagnosticsResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let errors = repository
        .site_diagnostic_errors()
        .await
        .map_err(|error| RestRouteError::internal(format!("Failed to diagnose: {error}")))?;

    Ok(Json(RestSiteDiagnosticsResponse {
        error_count: errors.len() as u32,
        errors,
    }))
}

async fn rest_export_site_data(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<RestSiteExportResponse, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let users = rest_export_site_users(repository, &service.base_path).await?;
    let project_records = repository
        .list_projects()
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    let mut projects = Vec::new();
    let mut milestone_project_refs = Vec::new();
    for project in project_records {
        milestone_project_refs.push((project.owner_name.clone(), project.project_name.clone()));
        projects.push(
            rest_site_project_from_record(repository, &service.base_path, project)
                .await
                .map_err(RestRouteError::from_connect_error)?,
        );
    }
    let labels = rest_export_site_labels(repository, &milestone_project_refs).await?;
    let milestones =
        rest_export_site_milestones(repository, &milestone_project_refs, &service.data_root)
            .await?;
    let project_members =
        rest_export_site_project_members(repository, &milestone_project_refs).await?;
    let posts = rest_export_site_posts(repository, &service.data_root).await?;
    let issues = rest_export_site_issues(repository, &service.data_root).await?;

    Ok(RestSiteExportResponse {
        format: "yobi-data".to_string(),
        provenance: "rust-app-runtime".to_string(),
        users,
        projects,
        project_members,
        labels,
        milestones,
        posts,
        issues,
    })
}

async fn rest_import_site_data(
    headers: HeaderMap,
    payload: &str,
    service: PilotServiceImpl,
    dry_run: bool,
) -> Result<(StatusCode, Json<RestSiteImportResponse>), RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let payload: RestSiteImportPayload = serde_json::from_str(payload)
        .map_err(|_| RestRouteError::bad_request("invalid site data import payload"))?;
    if payload.format.trim() != "yobi-data" {
        return Err(RestRouteError::bad_request(
            "unsupported site data import format",
        ));
    }
    if dry_run {
        return Ok((
            StatusCode::OK,
            Json(rest_site_import_dry_run_report(&service, repository, &payload).await?),
        ));
    }
    let preflight = rest_site_import_dry_run_report(&service, repository, &payload).await?;
    if let Some(error) = preflight.validation_errors.first() {
        return Err(RestRouteError::bad_request(error.message.clone()));
    }
    let _site_import_guard = site_import_staging_lock().lock().await;
    reconcile_site_import_staging_uploads(&service, repository).await?;
    cleanup_site_import_staging_uploads(&service)?;
    let mut checkpoint = RestSiteImportCheckpoint::from_payload(&payload);
    checkpoint.mark_all_validated();

    let transaction = repository
        .begin_transaction()
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    let transaction_repository = repository.with_transaction(&transaction);
    let mut rollback = RestSiteImportRollbackLedger::default();
    let result = rest_import_site_data_live(
        &service,
        &transaction_repository,
        payload,
        &mut rollback,
        &mut checkpoint,
    )
    .await;
    match result {
        Ok(response) => {
            if let Err(error) = transaction.commit().await {
                rollback.cleanup_staged_uploads();
                return Err(RestRouteError::internal(error.to_string()));
            }
            rollback
                .promote_staged_uploads()
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
            Ok((StatusCode::OK, Json(response)))
        }
        Err(_error) => {
            let _ = transaction.rollback().await;
            rollback.rollback(&service, repository).await;
            if checkpoint.failure.is_none() {
                checkpoint.set_failure("import", 0, "import:<unknown>", "site.import.failed");
            }
            Ok((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(RestSiteImportResponse::failed(checkpoint)),
            ))
        }
    }
}

#[derive(Default)]
struct RestSiteImportRollbackLedger {
    attachments: Vec<persistence::AttachmentRecord>,
    existing_attachments: Vec<persistence::AttachmentRecord>,
    issues: Vec<(String, String, i64)>,
    labels: Vec<(String, String, i64)>,
    milestones: Vec<(String, String, i64)>,
    posts: Vec<(String, String, i64)>,
    project_counters: Vec<RestSiteImportRollbackProjectCounters>,
    project_members: Vec<RestSiteImportRollbackProjectMember>,
    projects: Vec<RestSiteImportRollbackProject>,
    staged_uploads: Vec<RestSiteImportStagedUpload>,
    users: Vec<i64>,
}

struct RestSiteImportStagedUpload {
    attachment_id: i64,
    final_path: PathBuf,
    hash: String,
    journal_path: PathBuf,
    staging_path: PathBuf,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteImportStagedUploadJournal {
    attachment_id: i64,
    hash: String,
    version: u32,
}

struct RestSiteImportRollbackProjectCounters {
    max_import_issue_number: i64,
    max_import_posting_number: i64,
    snapshot: persistence::SiteImportProjectCounterSnapshot,
}

struct RestSiteImportRollbackProject {
    id: i64,
}

struct RestSiteImportRollbackProjectMember {
    previous_role: Option<String>,
    project_id: i64,
    user_id: i64,
}

impl RestSiteImportRollbackLedger {
    fn record_attachments(&mut self, attachments: &[persistence::AttachmentRecord]) {
        self.attachments.extend(attachments.iter().cloned());
    }

    fn record_staged_upload(
        &mut self,
        attachment_id: i64,
        hash: String,
        staging_path: PathBuf,
        final_path: PathBuf,
        journal_path: PathBuf,
    ) {
        self.staged_uploads.push(RestSiteImportStagedUpload {
            attachment_id,
            final_path,
            hash,
            journal_path,
            staging_path,
        });
    }

    async fn record_existing_attachment(
        &mut self,
        repository: &persistence::AppRepositoryImpl<'_>,
        attachment_id: i64,
    ) -> Result<(), RestRouteError> {
        if self
            .existing_attachments
            .iter()
            .any(|attachment| attachment.id == attachment_id)
        {
            return Ok(());
        }
        if let Some(snapshot) = repository
            .read_site_import_attachment_snapshot(attachment_id)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        {
            self.existing_attachments.push(snapshot);
        }
        Ok(())
    }

    fn record_issue(&mut self, owner_name: &str, project_name: &str, issue_number: i64) {
        self.record_project_counter_issue(owner_name, project_name, issue_number);
        self.issues.push((
            owner_name.trim().to_string(),
            project_name.trim().to_string(),
            issue_number,
        ));
    }

    fn record_label(&mut self, owner_name: &str, project_name: &str, label_id: i64) {
        self.labels.push((
            owner_name.trim().to_string(),
            project_name.trim().to_string(),
            label_id,
        ));
    }

    fn record_milestone(&mut self, owner_name: &str, project_name: &str, milestone_id: i64) {
        self.milestones.push((
            owner_name.trim().to_string(),
            project_name.trim().to_string(),
            milestone_id,
        ));
    }

    fn record_post(&mut self, owner_name: &str, project_name: &str, post_number: i64) {
        self.record_project_counter_post(owner_name, project_name, post_number);
        self.posts.push((
            owner_name.trim().to_string(),
            project_name.trim().to_string(),
            post_number,
        ));
    }

    fn record_project(&mut self, project: &persistence::ProjectRecord) {
        self.projects
            .push(RestSiteImportRollbackProject { id: project.id });
    }

    fn record_project_member(
        &mut self,
        project_id: i64,
        user_id: i64,
        previous_role: Option<String>,
    ) {
        self.project_members
            .push(RestSiteImportRollbackProjectMember {
                previous_role,
                project_id,
                user_id,
            });
    }

    fn record_user(&mut self, user: &persistence::AppUserRecord) {
        self.users.push(user.id);
    }

    async fn record_project_counter_snapshot(
        &mut self,
        repository: &persistence::AppRepositoryImpl<'_>,
        owner_name: &str,
        project_name: &str,
    ) -> Result<(), RestRouteError> {
        let owner_name = owner_name.trim();
        let project_name = project_name.trim();
        if self.project_counters.iter().any(|entry| {
            entry.snapshot.owner_name == owner_name && entry.snapshot.project_name == project_name
        }) {
            return Ok(());
        }
        if let Some(snapshot) = repository
            .read_site_import_project_counter_snapshot(owner_name, project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        {
            self.project_counters
                .push(RestSiteImportRollbackProjectCounters {
                    max_import_issue_number: snapshot.last_issue_number,
                    max_import_posting_number: snapshot.last_posting_number,
                    snapshot,
                });
        }
        Ok(())
    }

    fn record_project_counter_issue(
        &mut self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) {
        let owner_name = owner_name.trim();
        let project_name = project_name.trim();
        if let Some(entry) = self.project_counters.iter_mut().find(|entry| {
            entry.snapshot.owner_name == owner_name && entry.snapshot.project_name == project_name
        }) {
            entry.max_import_issue_number = entry.max_import_issue_number.max(issue_number);
        }
    }

    fn record_project_counter_post(
        &mut self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
    ) {
        let owner_name = owner_name.trim();
        let project_name = project_name.trim();
        if let Some(entry) = self.project_counters.iter_mut().find(|entry| {
            entry.snapshot.owner_name == owner_name && entry.snapshot.project_name == project_name
        }) {
            entry.max_import_posting_number = entry.max_import_posting_number.max(post_number);
        }
    }

    async fn rollback(
        &self,
        service: &PilotServiceImpl,
        repository: &persistence::AppRepositoryImpl<'_>,
    ) {
        for attachment in self.attachments.iter().rev() {
            let deleted = repository
                .delete_site_import_attachment_row(attachment.id)
                .await
                .ok()
                .flatten();
            let hash = deleted
                .as_ref()
                .map(|record| record.hash.as_str())
                .filter(|hash| !hash.is_empty())
                .unwrap_or(attachment.hash.as_str());
            if !hash.is_empty() {
                let _ =
                    std::fs::remove_file(uploaded_file_path_with_root(&service.data_root, hash));
            }
        }
        for (owner_name, project_name, issue_number) in self.issues.iter().rev() {
            let _ = repository
                .delete_site_import_issue_by_number(owner_name, project_name, *issue_number)
                .await;
        }
        for (owner_name, project_name, post_number) in self.posts.iter().rev() {
            let _ = repository
                .delete_site_import_posting_by_number(owner_name, project_name, *post_number)
                .await;
        }
        for entry in self.project_counters.iter().rev() {
            let _ = repository
                .restore_site_import_project_counter_snapshot(
                    &entry.snapshot,
                    entry.max_import_issue_number,
                    entry.max_import_posting_number,
                )
                .await;
        }
        for attachment in self.existing_attachments.iter().rev() {
            let _ = repository
                .restore_site_import_attachment_snapshot(attachment)
                .await;
        }
        for (owner_name, project_name, milestone_id) in self.milestones.iter().rev() {
            let _ = repository
                .delete_site_import_milestone_by_id(owner_name, project_name, *milestone_id)
                .await;
        }
        for (owner_name, project_name, label_id) in self.labels.iter().rev() {
            let _ = repository
                .delete_project_label(owner_name, project_name, *label_id)
                .await;
        }
        for member in self.project_members.iter().rev() {
            if let Some(previous_role) = &member.previous_role {
                let _ = repository
                    .add_project_membership(member.project_id, member.user_id, previous_role)
                    .await;
            } else {
                let _ = repository
                    .delete_project_membership(member.project_id, member.user_id)
                    .await;
            }
        }
        for project in self.projects.iter().rev() {
            let _ = repository
                .delete_site_import_project_shell_by_id(project.id)
                .await;
        }
        for user_id in self.users.iter().rev() {
            let _ = repository.delete_site_import_user_by_id(*user_id).await;
        }
        self.cleanup_staged_uploads();
    }

    fn promote_staged_uploads(&self) -> std::io::Result<()> {
        for upload in &self.staged_uploads {
            promote_site_import_staged_upload_file(upload)?;
        }
        Ok(())
    }

    fn cleanup_staged_uploads(&self) {
        for upload in self.staged_uploads.iter().rev() {
            let _ = std::fs::remove_file(&upload.staging_path);
            let _ = std::fs::remove_file(&upload.journal_path);
            cleanup_empty_parent_dirs(upload.staging_path.parent(), upload.final_path.parent());
        }
    }
}

fn cleanup_empty_parent_dirs(mut current: Option<&StdPath>, stop_before: Option<&StdPath>) {
    while let Some(directory) = current {
        if Some(directory) == stop_before {
            break;
        }
        match std::fs::remove_dir(directory) {
            Ok(()) => current = directory.parent(),
            Err(_) => break,
        }
    }
}

async fn rest_import_site_data_live(
    service: &PilotServiceImpl,
    repository: &persistence::AppRepositoryImpl<'_>,
    payload: RestSiteImportPayload,
    rollback: &mut RestSiteImportRollbackLedger,
    checkpoint: &mut RestSiteImportCheckpoint,
) -> Result<RestSiteImportResponse, RestRouteError> {
    let mut imported_users = 0;
    let mut skipped_users = 0;
    for (index, user) in payload.users.into_iter().enumerate() {
        let login_id = user.login_id.trim();
        let email_address = user.email_address.trim();
        if login_id.is_empty()
            || repository
                .find_user_by_login_id(login_id)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .is_some()
        {
            skipped_users += 1;
            checkpoint.mark_skipped("users", index);
            continue;
        }
        let imported_password_hash = hash(
            format!(
                "imported-user-disabled:{login_id}:{}",
                site_export_filename_stamp()
            ),
            DEFAULT_COST,
        )
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
        let created_user = repository
            .create_user(persistence::CreateUserInput {
                display_name: user.display_name.trim().to_string(),
                email_address: email_address.to_string(),
                is_confirmed: !user.state.trim().eq_ignore_ascii_case("LOCKED"),
                is_site_admin: user.is_site_admin,
                login_id: login_id.to_string(),
                password_hash: imported_password_hash,
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        repository
            .restore_site_import_user_timestamps(
                login_id,
                rest_site_import_parse_legacy_datetime(&user.created_at),
                rest_site_import_parse_legacy_datetime(&user.last_state_modified_at),
            )
            .await
            .map_err(|error| {
                let message = error.to_string();
                checkpoint.set_failure("users", index, format!("user:{login_id}"), message.clone());
                RestRouteError::internal(message)
            })?;
        rollback.record_user(&created_user);
        imported_users += 1;
        checkpoint.mark_completed("users", index);
    }

    let mut imported_projects = 0;
    let mut skipped_projects = 0;
    for (index, project) in payload.projects.into_iter().enumerate() {
        let owner_name = project.owner_name.trim();
        let project_name = project.project_name.trim();
        if owner_name.is_empty()
            || project_name.is_empty()
            || repository
                .find_user_by_login_id(owner_name)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .is_none()
            || repository
                .read_project_by_owner_and_name(owner_name, project_name)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .is_some()
        {
            skipped_projects += 1;
            checkpoint.mark_skipped("projects", index);
            continue;
        }
        let created_project = repository
            .create_project(persistence::CreateProjectInput {
                organization_id: None,
                owner_name: owner_name.to_string(),
                overview: Some(project.overview.trim().to_string()),
                project_name: project_name.to_string(),
                project_scope: normalize_site_import_project_scope(&project.project_scope)
                    .map_err(RestRouteError::from_connect_error)?,
                vcs: normalize_site_import_project_vcs(&project.vcs),
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        repository
            .restore_site_import_project_created_at(
                owner_name,
                project_name,
                rest_site_import_parse_legacy_datetime(&project.created_at),
            )
            .await
            .map_err(|error| {
                let message = error.to_string();
                checkpoint.set_failure(
                    "projects",
                    index,
                    rest_site_import_project_key(owner_name, project_name),
                    message.clone(),
                );
                RestRouteError::internal(message)
            })?;
        rollback.record_project(&created_project);
        imported_projects += 1;
        checkpoint.mark_completed("projects", index);
    }

    let mut imported_project_members = 0;
    let mut skipped_project_members = 0;
    for (index, member) in payload.project_members.into_iter().enumerate() {
        let owner_name = member.owner_name.trim();
        let project_name = member.project_name.trim();
        let login_id = member.login_id.trim();
        let role = normalize_site_import_project_member_role(&member.role);
        let Some(project) = repository
            .read_project_by_owner_and_name(owner_name, project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        else {
            skipped_project_members += 1;
            checkpoint.mark_skipped("projectMembers", index);
            continue;
        };
        let Some(user) = repository
            .find_user_by_login_id(login_id)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        else {
            skipped_project_members += 1;
            checkpoint.mark_skipped("projectMembers", index);
            continue;
        };
        let previous_role = repository
            .read_project_members(owner_name, project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
            .members
            .into_iter()
            .find(|member| member.user_id == user.id)
            .map(|member| member.role);
        repository
            .add_project_membership(project.id, user.id, &role)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        rollback.record_project_member(project.id, user.id, previous_role);
        imported_project_members += 1;
        checkpoint.mark_completed("projectMembers", index);
    }

    let mut imported_labels = 0;
    let mut skipped_labels = 0;
    for (index, label) in payload.labels.into_iter().enumerate() {
        let owner_name = label.owner_name.trim();
        let project_name = label.project_name.trim();
        let label_name = label.name.trim();
        if owner_name.is_empty()
            || project_name.is_empty()
            || label_name.is_empty()
            || repository
                .read_project_by_owner_and_name(owner_name, project_name)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .is_none()
        {
            skipped_labels += 1;
            checkpoint.mark_skipped("labels", index);
            continue;
        }
        let label_color = if label.color.trim().is_empty() {
            "#999999".to_string()
        } else {
            normalize_issue_label_color(label.color.trim())
                .map_err(RestRouteError::from_connect_error)?
        };
        let category_name = if label.category_name.trim().is_empty() {
            "Imported"
        } else {
            label.category_name.trim()
        };
        match repository
            .create_project_label(persistence::CreateProjectLabelInput {
                category_is_exclusive: label.category_is_exclusive,
                category_name: category_name.to_string(),
                label_color,
                label_name: label_name.to_string(),
                owner_name: owner_name.to_string(),
                project_name: project_name.to_string(),
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        {
            Some((record, true)) => {
                rollback.record_label(owner_name, project_name, record.id);
                imported_labels += 1;
                checkpoint.mark_completed("labels", index);
            }
            Some((_record, false)) => {
                skipped_labels += 1;
                checkpoint.mark_skipped("labels", index);
            }
            None => {
                skipped_labels += 1;
                checkpoint.mark_skipped("labels", index);
            }
        }
    }

    let mut imported_milestones = 0;
    let mut skipped_milestones = 0;
    for (index, milestone) in payload.milestones.into_iter().enumerate() {
        let owner_name = milestone.owner_name.trim();
        let project_name = milestone.project_name.trim();
        let title = milestone.title.trim();
        let Some(actor) = rest_site_import_actor(repository, "", owner_name).await? else {
            skipped_milestones += 1;
            checkpoint.mark_skipped("milestones", index);
            continue;
        };
        if title.is_empty()
            || repository
                .read_project_by_owner_and_name(owner_name, project_name)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .is_none()
            || repository
                .project_milestone_title_exists(owner_name, project_name, title, None)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
        {
            skipped_milestones += 1;
            checkpoint.mark_skipped("milestones", index);
            continue;
        }
        let imported_attachments = rest_site_import_attachments(
            &service,
            repository,
            &actor,
            &milestone.attachments,
            rollback,
        )
        .await?;
        rollback.record_attachments(&imported_attachments.created_attachments);
        let contents_markdown = rewrite_site_import_file_links(
            &milestone.contents_markdown,
            &imported_attachments.link_rewrites,
        );
        let due_date = match parse_milestone_due_date(&milestone.due_date) {
            Ok(due_date) => due_date,
            Err(error) => {
                rest_site_import_cleanup_attachments(
                    &service,
                    repository,
                    &actor,
                    &imported_attachments.created_attachments,
                )
                .await;
                return Err(RestRouteError::from_connect_error(error));
            }
        };
        let state = match normalize_milestone_state(&milestone.state) {
            Ok(state) => state,
            Err(error) => {
                rest_site_import_cleanup_attachments(
                    &service,
                    repository,
                    &actor,
                    &imported_attachments.created_attachments,
                )
                .await;
                return Err(RestRouteError::from_connect_error(error));
            }
        };
        let created_milestone = match repository
            .create_project_milestone(persistence::MilestoneMutationInput {
                actor_id: Some(actor.id),
                attachment_ids: imported_attachments.ids.clone(),
                contents_markdown,
                due_date,
                owner_name: owner_name.to_string(),
                project_name: project_name.to_string(),
                state,
                title: title.to_string(),
            })
            .await
        {
            Ok(created) => created,
            Err(error) => {
                let message = error.to_string();
                rest_site_import_cleanup_attachments(
                    &service,
                    repository,
                    &actor,
                    &imported_attachments.created_attachments,
                )
                .await;
                checkpoint.set_failure(
                    "milestones",
                    index,
                    rest_site_import_milestone_key(owner_name, project_name, title),
                    message.clone(),
                );
                return Err(RestRouteError::internal(message));
            }
        };
        if let Some(created_milestone) = created_milestone {
            rollback.record_milestone(owner_name, project_name, created_milestone.id);
            imported_milestones += 1;
            checkpoint.mark_completed("milestones", index);
        } else {
            rest_site_import_cleanup_attachments(
                &service,
                repository,
                &actor,
                &imported_attachments.created_attachments,
            )
            .await;
            skipped_milestones += 1;
            checkpoint.mark_skipped("milestones", index);
        }
    }

    let mut imported_posts = 0;
    let mut skipped_posts = 0;
    for (index, post) in payload.posts.into_iter().enumerate() {
        let Some(actor) =
            rest_site_import_actor(repository, &post.author_login_id, &post.owner_name).await?
        else {
            skipped_posts += 1;
            checkpoint.mark_skipped("posts", index);
            continue;
        };
        if repository
            .read_project_by_owner_and_name(&post.owner_name, &post.project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
            .is_none()
        {
            skipped_posts += 1;
            checkpoint.mark_skipped("posts", index);
            continue;
        }
        rollback
            .record_project_counter_snapshot(repository, &post.owner_name, &post.project_name)
            .await?;
        let label_ids = rest_site_import_label_ids(
            repository,
            &post.owner_name,
            &post.project_name,
            &post.labels,
            rollback,
        )
        .await?;
        let imported_attachments =
            rest_site_import_attachments(&service, repository, &actor, &post.attachments, rollback)
                .await?;
        rollback.record_attachments(&imported_attachments.created_attachments);
        let body_markdown = rewrite_site_import_file_links(
            &post.body_markdown,
            &imported_attachments.link_rewrites,
        );
        let imported_created_at = rest_site_import_parse_legacy_datetime(&post.created_at);
        let imported_updated_at = rest_site_import_parse_legacy_datetime(&post.updated_at);
        let created = repository
            .create_legacy_external_posting(persistence::CreateLegacyExternalPostingInput {
                actor_display_name: actor.display_name.clone(),
                actor_id: actor.id,
                actor_login_id: actor.login_id.clone(),
                attachment_actor_id: Some(actor.id),
                created_at: imported_created_at,
                owner_name: post.owner_name.trim().to_string(),
                post_number: None,
                project_name: post.project_name.trim().to_string(),
                updated_at: imported_updated_at,
                values: persistence::PostingMutationInput {
                    attachment_ids: imported_attachments.ids.clone(),
                    body_markdown,
                    label_ids,
                    notice: post.notice,
                    readme: post.readme,
                    title: post.title,
                },
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()));
        let created = match created {
            Ok(created) => created,
            Err(error) => {
                rest_site_import_cleanup_attachments(
                    &service,
                    repository,
                    &actor,
                    &imported_attachments.created_attachments,
                )
                .await;
                return Err(error);
            }
        };
        let Some(created) = created else {
            rest_site_import_cleanup_attachments(
                &service,
                repository,
                &actor,
                &imported_attachments.created_attachments,
            )
            .await;
            skipped_posts += 1;
            checkpoint.mark_skipped("posts", index);
            continue;
        };
        rollback.record_post(&post.owner_name, &post.project_name, created.post_number);
        if !post.history_markdown.trim().is_empty() {
            repository
                .restore_posting_history(
                    &post.owner_name,
                    &post.project_name,
                    created.post_number,
                    &post.history_markdown,
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
        }
        rest_site_import_post_comments(
            &service,
            repository,
            &post.owner_name,
            &post.project_name,
            created.post_number,
            &post.comments,
            &actor,
            None,
            rollback,
            checkpoint,
        )
        .await?;
        repository
            .restore_site_import_posting_timestamps(
                &post.owner_name,
                &post.project_name,
                created.post_number,
                imported_created_at,
                imported_updated_at,
            )
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        imported_posts += 1;
        checkpoint.mark_completed("posts", index);
    }

    let mut imported_issues = 0;
    let mut skipped_issues = 0;
    for (index, issue) in payload.issues.into_iter().enumerate() {
        let Some(actor) =
            rest_site_import_actor(repository, &issue.author_login_id, &issue.owner_name).await?
        else {
            skipped_issues += 1;
            checkpoint.mark_skipped("issues", index);
            continue;
        };
        if repository
            .read_project_by_owner_and_name(&issue.owner_name, &issue.project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
            .is_none()
        {
            skipped_issues += 1;
            checkpoint.mark_skipped("issues", index);
            continue;
        }
        rollback
            .record_project_counter_snapshot(repository, &issue.owner_name, &issue.project_name)
            .await?;
        let label_ids = rest_site_import_label_ids(
            repository,
            &issue.owner_name,
            &issue.project_name,
            &issue.labels,
            rollback,
        )
        .await?;
        let milestone_id = rest_site_import_milestone_id(
            repository,
            &issue.owner_name,
            &issue.project_name,
            &issue.milestone_title,
            &actor,
            rollback,
        )
        .await?;
        let imported_attachments = rest_site_import_attachments(
            &service,
            repository,
            &actor,
            &issue.attachments,
            rollback,
        )
        .await?;
        rollback.record_attachments(&imported_attachments.created_attachments);
        let body_markdown = rewrite_site_import_file_links(
            &issue.body_markdown,
            &imported_attachments.link_rewrites,
        );
        let imported_created_at = rest_site_import_parse_legacy_datetime(&issue.created_at);
        let imported_updated_at = rest_site_import_parse_legacy_datetime(&issue.updated_at);
        let created = repository
            .create_issue(persistence::CreateIssueInput {
                actor_display_name: actor.display_name.clone(),
                actor_id: actor.id,
                actor_login_id: actor.login_id.clone(),
                owner_name: issue.owner_name.trim().to_string(),
                project_name: issue.project_name.trim().to_string(),
                values: persistence::IssueMutationInput {
                    assignee_login_id: empty_string_as_none(issue.assignee_login_id.trim()),
                    attachment_ids: imported_attachments.ids.clone(),
                    body_markdown,
                    due_date: None,
                    is_draft: false,
                    is_publish: false,
                    label_ids,
                    milestone_id,
                    parent_issue_id: None,
                    title: issue.title,
                },
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()));
        let created = match created {
            Ok(created) => created,
            Err(error) => {
                rest_site_import_cleanup_attachments(
                    &service,
                    repository,
                    &actor,
                    &imported_attachments.created_attachments,
                )
                .await;
                return Err(error);
            }
        };
        let Some(created) = created else {
            rest_site_import_cleanup_attachments(
                &service,
                repository,
                &actor,
                &imported_attachments.created_attachments,
            )
            .await;
            skipped_issues += 1;
            checkpoint.mark_skipped("issues", index);
            continue;
        };
        rollback.record_issue(&issue.owner_name, &issue.project_name, created.issue_number);
        if !issue.history_markdown.trim().is_empty() {
            repository
                .restore_issue_history(
                    &issue.owner_name,
                    &issue.project_name,
                    created.issue_number,
                    &issue.history_markdown,
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
        }
        if issue.state.trim().eq_ignore_ascii_case("closed") {
            repository
                .update_issue_state_as_actor(
                    &created.owner_name,
                    &created.project_name,
                    created.issue_number,
                    "closed",
                    actor.id,
                    &actor.login_id,
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
        }
        rest_site_import_issue_comments(
            &service,
            repository,
            &issue.owner_name,
            &issue.project_name,
            created.issue_number,
            &issue.comments,
            &actor,
            None,
            rollback,
            checkpoint,
        )
        .await?;
        repository
            .restore_site_import_issue_timestamps(
                &issue.owner_name,
                &issue.project_name,
                created.issue_number,
                imported_created_at,
                imported_updated_at,
            )
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        imported_issues += 1;
        checkpoint.mark_completed("issues", index);
    }

    Ok(RestSiteImportResponse::imported(
        RestSiteImportCountSet {
            issues: imported_issues,
            labels: imported_labels,
            milestones: imported_milestones,
            posts: imported_posts,
            projects: imported_projects,
            project_members: imported_project_members,
            users: imported_users,
            ..RestSiteImportCountSet::default()
        },
        RestSiteImportCountSet {
            issues: skipped_issues,
            labels: skipped_labels,
            milestones: skipped_milestones,
            posts: skipped_posts,
            projects: skipped_projects,
            project_members: skipped_project_members,
            users: skipped_users,
            ..RestSiteImportCountSet::default()
        },
        Vec::new(),
        checkpoint.clone(),
    ))
}

#[derive(Default)]
struct RestSiteImportDryRunState {
    labels: HashSet<(String, String, String, String)>,
    milestones: HashSet<(String, String, String)>,
    payload_issues: HashSet<(String, String, String)>,
    payload_labels: HashSet<(String, String, String, String)>,
    payload_milestones: HashSet<(String, String, String)>,
    payload_portable_attachment_ids: HashSet<i64>,
    payload_posts: HashSet<(String, String, String)>,
    payload_project_members: HashSet<(String, String, String)>,
    payload_projects: HashSet<(String, String)>,
    payload_users: HashSet<String>,
    projects: HashSet<(String, String)>,
    users: HashSet<String>,
}

async fn rest_site_import_dry_run_report(
    service: &PilotServiceImpl,
    repository: &persistence::AppRepositoryImpl<'_>,
    payload: &RestSiteImportPayload,
) -> Result<RestSiteImportResponse, RestRouteError> {
    let mut state = RestSiteImportDryRunState::default();
    let mut would_import = RestSiteImportCountSet::default();
    let mut would_skip = RestSiteImportCountSet::default();
    let mut validation_errors = Vec::new();

    for (index, user) in payload.users.iter().enumerate() {
        let login_id = user.login_id.trim();
        if !login_id.is_empty() && !state.payload_users.insert(login_id.to_string()) {
            rest_site_import_push_validation_error(
                &mut validation_errors,
                "users",
                index,
                "loginId",
                "site.import.duplicateResource",
            );
            would_skip.users += 1;
            continue;
        }
        if login_id.is_empty()
            || rest_site_import_dry_run_user_available(repository, &mut state, login_id).await?
        {
            would_skip.users += 1;
            continue;
        }
        would_import.users += 1;
        state.users.insert(login_id.to_string());
    }

    for (index, project) in payload.projects.iter().enumerate() {
        let owner_name = project.owner_name.trim();
        let project_name = project.project_name.trim();
        let mut invalid = false;
        if let Err(error) = normalize_site_import_project_scope(&project.project_scope) {
            rest_site_import_push_validation_error(
                &mut validation_errors,
                "projects",
                index,
                "projectScope",
                error.to_string(),
            );
            invalid = true;
        }
        if !owner_name.is_empty()
            && !project_name.is_empty()
            && !state
                .payload_projects
                .insert((owner_name.to_string(), project_name.to_string()))
        {
            rest_site_import_push_validation_error(
                &mut validation_errors,
                "projects",
                index,
                "projectName",
                "site.import.duplicateResource",
            );
            invalid = true;
        }
        if owner_name.is_empty()
            || project_name.is_empty()
            || invalid
            || !rest_site_import_dry_run_user_available(repository, &mut state, owner_name).await?
            || rest_site_import_dry_run_project_available(
                repository,
                &mut state,
                owner_name,
                project_name,
            )
            .await?
        {
            would_skip.projects += 1;
            continue;
        }
        would_import.projects += 1;
        state
            .projects
            .insert((owner_name.to_string(), project_name.to_string()));
    }

    for (index, member) in payload.project_members.iter().enumerate() {
        let owner_name = member.owner_name.trim();
        let project_name = member.project_name.trim();
        let login_id = member.login_id.trim();
        if !owner_name.is_empty()
            && !project_name.is_empty()
            && !login_id.is_empty()
            && !state.payload_project_members.insert((
                owner_name.to_string(),
                project_name.to_string(),
                login_id.to_string(),
            ))
        {
            rest_site_import_push_validation_error(
                &mut validation_errors,
                "projectMembers",
                index,
                "loginId",
                "site.import.duplicateResource",
            );
            would_skip.project_members += 1;
            continue;
        }
        if !rest_site_import_dry_run_project_available(
            repository,
            &mut state,
            owner_name,
            project_name,
        )
        .await?
            || !rest_site_import_dry_run_user_available(repository, &mut state, login_id).await?
        {
            would_skip.project_members += 1;
            continue;
        }
        would_import.project_members += 1;
    }

    for (index, label) in payload.labels.iter().enumerate() {
        let owner_name = label.owner_name.trim();
        let project_name = label.project_name.trim();
        let label_name = label.name.trim();
        let category_name = rest_site_import_label_category_name(label.category_name.trim());
        let mut invalid = false;
        if !label.color.trim().is_empty() {
            if let Err(error) = normalize_issue_label_color(label.color.trim()) {
                rest_site_import_push_validation_error(
                    &mut validation_errors,
                    "labels",
                    index,
                    "color",
                    error.to_string(),
                );
                invalid = true;
            }
        }
        if !owner_name.is_empty()
            && !project_name.is_empty()
            && !label_name.is_empty()
            && !state.payload_labels.insert((
                owner_name.to_string(),
                project_name.to_string(),
                category_name.to_string(),
                label_name.to_string(),
            ))
        {
            rest_site_import_push_validation_error(
                &mut validation_errors,
                "labels",
                index,
                "name",
                "site.import.duplicateResource",
            );
            invalid = true;
        }
        if invalid {
            would_skip.labels += 1;
            continue;
        }
        if owner_name.is_empty()
            || project_name.is_empty()
            || label_name.is_empty()
            || !rest_site_import_dry_run_project_available(
                repository,
                &mut state,
                owner_name,
                project_name,
            )
            .await?
            || rest_site_import_dry_run_label_available(
                repository,
                &mut state,
                owner_name,
                project_name,
                category_name,
                label_name,
            )
            .await?
        {
            would_skip.labels += 1;
            continue;
        }
        would_import.labels += 1;
        state.labels.insert((
            owner_name.to_string(),
            project_name.to_string(),
            category_name.to_string(),
            label_name.to_string(),
        ));
    }

    for (index, milestone) in payload.milestones.iter().enumerate() {
        let attachment_errors_before = validation_errors.len();
        rest_site_import_dry_run_attachments(
            service,
            &mut state,
            "milestones.attachments",
            index,
            &milestone.attachments,
            &mut would_import,
            &mut would_skip,
            &mut validation_errors,
        );
        let attachment_invalid = validation_errors.len() != attachment_errors_before;
        let owner_name = milestone.owner_name.trim();
        let project_name = milestone.project_name.trim();
        let title = milestone.title.trim();
        let mut invalid = false;
        if let Err(error) = parse_milestone_due_date(&milestone.due_date) {
            rest_site_import_push_validation_error(
                &mut validation_errors,
                "milestones",
                index,
                "dueDate",
                error.to_string(),
            );
            invalid = true;
        }
        if let Err(error) = normalize_milestone_state(&milestone.state) {
            rest_site_import_push_validation_error(
                &mut validation_errors,
                "milestones",
                index,
                "state",
                error.to_string(),
            );
            invalid = true;
        }
        if !owner_name.is_empty()
            && !project_name.is_empty()
            && !title.is_empty()
            && !state.payload_milestones.insert((
                owner_name.to_string(),
                project_name.to_string(),
                title.to_string(),
            ))
        {
            rest_site_import_push_validation_error(
                &mut validation_errors,
                "milestones",
                index,
                "title",
                "site.import.duplicateResource",
            );
            invalid = true;
        }
        if title.is_empty()
            || invalid
            || attachment_invalid
            || !rest_site_import_dry_run_actor_available(repository, &mut state, "", owner_name)
                .await?
            || !rest_site_import_dry_run_project_available(
                repository,
                &mut state,
                owner_name,
                project_name,
            )
            .await?
            || rest_site_import_dry_run_milestone_available(
                repository,
                &mut state,
                owner_name,
                project_name,
                title,
            )
            .await?
        {
            would_skip.milestones += 1;
            continue;
        }
        would_import.milestones += 1;
        state.milestones.insert((
            owner_name.to_string(),
            project_name.to_string(),
            title.to_string(),
        ));
    }

    for (index, post) in payload.posts.iter().enumerate() {
        let attachment_errors_before = validation_errors.len();
        rest_site_import_dry_run_attachments(
            service,
            &mut state,
            "posts.attachments",
            index,
            &post.attachments,
            &mut would_import,
            &mut would_skip,
            &mut validation_errors,
        );
        rest_site_import_dry_run_comment_attachments(
            service,
            &mut state,
            "posts.comments.attachments",
            &post.comments,
            &mut would_import,
            &mut would_skip,
            &mut validation_errors,
        );
        let attachment_invalid = validation_errors.len() != attachment_errors_before;
        let owner_name = post.owner_name.trim();
        let project_name = post.project_name.trim();
        let post_number = post.post_number.trim();
        let title = post.title.trim();
        let duplicate_key = if post_number.is_empty() {
            title
        } else {
            post_number
        };
        let mut invalid = false;
        if !owner_name.is_empty()
            && !project_name.is_empty()
            && !duplicate_key.is_empty()
            && !state.payload_posts.insert((
                owner_name.to_string(),
                project_name.to_string(),
                duplicate_key.to_string(),
            ))
        {
            rest_site_import_push_validation_error(
                &mut validation_errors,
                "posts",
                index,
                if post_number.is_empty() {
                    "title"
                } else {
                    "postNumber"
                },
                "site.import.duplicateResource",
            );
            invalid = true;
        }
        if rest_site_import_dry_run_validate_labels(
            &post.labels,
            "posts.labels",
            index,
            &mut validation_errors,
        ) || invalid
            || !rest_site_import_dry_run_actor_available(
                repository,
                &mut state,
                &post.author_login_id,
                owner_name,
            )
            .await?
            || attachment_invalid
            || !rest_site_import_dry_run_project_available(
                repository,
                &mut state,
                owner_name,
                project_name,
            )
            .await?
        {
            would_skip.posts += 1;
            continue;
        }
        would_import.posts += 1;
    }

    for (index, issue) in payload.issues.iter().enumerate() {
        let attachment_errors_before = validation_errors.len();
        rest_site_import_dry_run_attachments(
            service,
            &mut state,
            "issues.attachments",
            index,
            &issue.attachments,
            &mut would_import,
            &mut would_skip,
            &mut validation_errors,
        );
        rest_site_import_dry_run_comment_attachments(
            service,
            &mut state,
            "issues.comments.attachments",
            &issue.comments,
            &mut would_import,
            &mut would_skip,
            &mut validation_errors,
        );
        let attachment_invalid = validation_errors.len() != attachment_errors_before;
        let owner_name = issue.owner_name.trim();
        let project_name = issue.project_name.trim();
        let issue_number = issue.issue_number.trim();
        let title = issue.title.trim();
        let duplicate_key = if issue_number.is_empty() {
            title
        } else {
            issue_number
        };
        let mut invalid = false;
        if !owner_name.is_empty()
            && !project_name.is_empty()
            && !duplicate_key.is_empty()
            && !state.payload_issues.insert((
                owner_name.to_string(),
                project_name.to_string(),
                duplicate_key.to_string(),
            ))
        {
            rest_site_import_push_validation_error(
                &mut validation_errors,
                "issues",
                index,
                if issue_number.is_empty() {
                    "title"
                } else {
                    "issueNumber"
                },
                "site.import.duplicateResource",
            );
            invalid = true;
        }
        if rest_site_import_dry_run_validate_labels(
            &issue.labels,
            "issues.labels",
            index,
            &mut validation_errors,
        ) || invalid
            || !rest_site_import_dry_run_actor_available(
                repository,
                &mut state,
                &issue.author_login_id,
                owner_name,
            )
            .await?
            || attachment_invalid
            || !rest_site_import_dry_run_project_available(
                repository,
                &mut state,
                owner_name,
                project_name,
            )
            .await?
        {
            would_skip.issues += 1;
            continue;
        }
        would_import.issues += 1;
    }

    let mut checkpoint = RestSiteImportCheckpoint::from_payload(payload);
    checkpoint.mark_all_validated();
    checkpoint.mark_counts(&would_skip);

    Ok(RestSiteImportResponse::dry_run(
        would_import,
        would_skip,
        validation_errors,
        Vec::new(),
        checkpoint,
    ))
}

async fn rest_site_import_dry_run_user_available(
    repository: &persistence::AppRepositoryImpl<'_>,
    state: &mut RestSiteImportDryRunState,
    login_id: &str,
) -> Result<bool, RestRouteError> {
    let login_id = login_id.trim();
    if login_id.is_empty() {
        return Ok(false);
    }
    if state.users.contains(login_id) {
        return Ok(true);
    }
    let exists = repository
        .find_user_by_login_id(login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .is_some();
    if exists {
        state.users.insert(login_id.to_string());
    }
    Ok(exists)
}

async fn rest_site_import_dry_run_project_available(
    repository: &persistence::AppRepositoryImpl<'_>,
    state: &mut RestSiteImportDryRunState,
    owner_name: &str,
    project_name: &str,
) -> Result<bool, RestRouteError> {
    let owner_name = owner_name.trim();
    let project_name = project_name.trim();
    if owner_name.is_empty() || project_name.is_empty() {
        return Ok(false);
    }
    let key = (owner_name.to_string(), project_name.to_string());
    if state.projects.contains(&key) {
        return Ok(true);
    }
    let exists = repository
        .read_project_by_owner_and_name(owner_name, project_name)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .is_some();
    if exists {
        state.projects.insert(key);
    }
    Ok(exists)
}

async fn rest_site_import_dry_run_actor_available(
    repository: &persistence::AppRepositoryImpl<'_>,
    state: &mut RestSiteImportDryRunState,
    preferred_login_id: &str,
    owner_name: &str,
) -> Result<bool, RestRouteError> {
    for candidate in [preferred_login_id.trim(), owner_name.trim()] {
        if rest_site_import_dry_run_user_available(repository, state, candidate).await? {
            return Ok(true);
        }
    }
    Ok(false)
}

async fn rest_site_import_dry_run_label_available(
    repository: &persistence::AppRepositoryImpl<'_>,
    state: &mut RestSiteImportDryRunState,
    owner_name: &str,
    project_name: &str,
    category_name: &str,
    label_name: &str,
) -> Result<bool, RestRouteError> {
    let key = (
        owner_name.trim().to_string(),
        project_name.trim().to_string(),
        category_name.trim().to_string(),
        label_name.trim().to_string(),
    );
    if state.labels.contains(&key) {
        return Ok(true);
    }
    let labels = repository
        .list_project_labels(owner_name.trim(), project_name.trim())
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    let exists = labels
        .iter()
        .any(|label| label.category_name == category_name && label.name == label_name);
    if exists {
        state.labels.insert(key);
    }
    Ok(exists)
}

async fn rest_site_import_dry_run_milestone_available(
    repository: &persistence::AppRepositoryImpl<'_>,
    state: &mut RestSiteImportDryRunState,
    owner_name: &str,
    project_name: &str,
    title: &str,
) -> Result<bool, RestRouteError> {
    let key = (
        owner_name.trim().to_string(),
        project_name.trim().to_string(),
        title.trim().to_string(),
    );
    if state.milestones.contains(&key) {
        return Ok(true);
    }
    let exists = repository
        .project_milestone_title_exists(owner_name.trim(), project_name.trim(), title.trim(), None)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    if exists {
        state.milestones.insert(key);
    }
    Ok(exists)
}

fn rest_site_import_dry_run_validate_labels(
    labels: &[RestSiteExportLabelItem],
    section: &str,
    section_index: usize,
    validation_errors: &mut Vec<RestSiteImportValidationError>,
) -> bool {
    let mut invalid = false;
    for label in labels {
        if label.color.trim().is_empty() {
            continue;
        }
        if let Err(error) = normalize_issue_label_color(label.color.trim()) {
            rest_site_import_push_validation_error(
                validation_errors,
                section,
                section_index,
                "color",
                error.to_string(),
            );
            invalid = true;
        }
    }
    invalid
}

fn rest_site_import_dry_run_comment_attachments(
    service: &PilotServiceImpl,
    state: &mut RestSiteImportDryRunState,
    section: &str,
    comments: &[RestSiteExportCommentItem],
    would_import: &mut RestSiteImportCountSet,
    would_skip: &mut RestSiteImportCountSet,
    validation_errors: &mut Vec<RestSiteImportValidationError>,
) {
    for (index, comment) in comments.iter().enumerate() {
        rest_site_import_dry_run_attachments(
            service,
            state,
            section,
            index,
            &comment.attachments,
            would_import,
            would_skip,
            validation_errors,
        );
        rest_site_import_dry_run_comment_attachments(
            service,
            state,
            section,
            &comment.child_comments,
            would_import,
            would_skip,
            validation_errors,
        );
    }
}

fn rest_site_import_dry_run_attachments(
    service: &PilotServiceImpl,
    state: &mut RestSiteImportDryRunState,
    section: &str,
    section_index: usize,
    attachments: &[RestSiteExportAttachmentItem],
    would_import: &mut RestSiteImportCountSet,
    would_skip: &mut RestSiteImportCountSet,
    validation_errors: &mut Vec<RestSiteImportValidationError>,
) {
    for attachment in attachments {
        match rest_site_import_portable_attachment_bytes(service, attachment) {
            Ok(Some(_bytes)) => {
                if attachment.id <= 0 {
                    would_skip.attachments += 1;
                    rest_site_import_push_validation_error(
                        validation_errors,
                        section,
                        section_index,
                        "id",
                        "site.import.attachment.invalidId",
                    );
                    continue;
                }
                if attachment.id > 0 && !state.payload_portable_attachment_ids.insert(attachment.id)
                {
                    would_skip.attachments += 1;
                    rest_site_import_push_validation_error(
                        validation_errors,
                        section,
                        section_index,
                        "id",
                        "site.import.attachment.duplicateId",
                    );
                    continue;
                }
                would_import.attachments += 1;
            }
            Ok(None) => {}
            Err(message) => {
                would_skip.attachments += 1;
                rest_site_import_push_validation_error(
                    validation_errors,
                    section,
                    section_index,
                    rest_site_import_attachment_validation_field(&message),
                    message,
                );
            }
        }
    }
}

fn rest_site_import_attachment_validation_field(message: &str) -> &'static str {
    match message {
        "site.import.attachment.sha256Mismatch" => "contentSha256",
        _ => "contentBase64",
    }
}

fn rest_site_import_push_validation_error(
    validation_errors: &mut Vec<RestSiteImportValidationError>,
    section: &str,
    index: usize,
    field: &str,
    message: impl Into<String>,
) {
    validation_errors.push(RestSiteImportValidationError {
        field: field.to_string(),
        index: index as u32,
        message: message.into(),
        section: section.to_string(),
    });
}

async fn rest_site_import_post_comments(
    service: &PilotServiceImpl,
    repository: &persistence::AppRepositoryImpl<'_>,
    owner_name: &str,
    project_name: &str,
    post_number: i64,
    comments: &[RestSiteExportCommentItem],
    fallback_actor: &persistence::AppUserRecord,
    parent_comment_id: Option<i64>,
    rollback: &mut RestSiteImportRollbackLedger,
    checkpoint: &mut RestSiteImportCheckpoint,
) -> Result<(), RestRouteError> {
    for (index, comment) in comments.iter().enumerate() {
        let contents_markdown = comment.contents_markdown.trim();
        if contents_markdown.is_empty() {
            continue;
        }
        let actor =
            rest_site_import_comment_actor(repository, &comment.author_login_id, fallback_actor)
                .await?;
        let imported_attachments = rest_site_import_attachments(
            service,
            repository,
            &actor,
            &comment.attachments,
            rollback,
        )
        .await?;
        rollback.record_attachments(&imported_attachments.created_attachments);
        let contents_markdown =
            rewrite_site_import_file_links(contents_markdown, &imported_attachments.link_rewrites);
        let failure_resource_key = rest_site_import_comment_key(
            "posts.comments",
            owner_name,
            project_name,
            post_number,
            contents_markdown.as_str(),
        );
        let detail = repository
            .create_posting_comment(persistence::CreatePostingCommentInput {
                actor_display_name: actor.display_name.clone(),
                actor_id: actor.id,
                actor_login_id: actor.login_id.clone(),
                attachment_actor_id: None,
                attachment_ids: imported_attachments.ids,
                contents_markdown,
                created_at: rest_site_import_parse_legacy_datetime(&comment.created_at),
                owner_name: owner_name.trim().to_string(),
                parent_comment_id,
                post_number,
                project_name: project_name.trim().to_string(),
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()));
        let detail = match detail {
            Ok(detail) => detail,
            Err(error) => {
                rest_site_import_cleanup_attachments(
                    service,
                    repository,
                    &actor,
                    &imported_attachments.created_attachments,
                )
                .await;
                checkpoint.set_failure(
                    "posts.comments",
                    index,
                    failure_resource_key,
                    "site.import.failed",
                );
                return Err(error);
            }
        };
        if detail.is_none() {
            rest_site_import_cleanup_attachments(
                service,
                repository,
                &actor,
                &imported_attachments.created_attachments,
            )
            .await;
            continue;
        }
        if let Some(created_comment_id) = detail
            .as_ref()
            .and_then(|posting| posting.comments.iter().map(|comment| comment.id).max())
        {
            Box::pin(rest_site_import_post_comments(
                service,
                repository,
                owner_name,
                project_name,
                post_number,
                &comment.child_comments,
                &actor,
                Some(created_comment_id),
                rollback,
                checkpoint,
            ))
            .await?;
        }
    }
    Ok(())
}

async fn rest_site_import_issue_comments(
    service: &PilotServiceImpl,
    repository: &persistence::AppRepositoryImpl<'_>,
    owner_name: &str,
    project_name: &str,
    issue_number: i64,
    comments: &[RestSiteExportCommentItem],
    fallback_actor: &persistence::AppUserRecord,
    parent_comment_id: Option<i64>,
    rollback: &mut RestSiteImportRollbackLedger,
    checkpoint: &mut RestSiteImportCheckpoint,
) -> Result<(), RestRouteError> {
    for (index, comment) in comments.iter().enumerate() {
        let contents_markdown = comment.contents_markdown.trim();
        if contents_markdown.is_empty() {
            continue;
        }
        let actor =
            rest_site_import_comment_actor(repository, &comment.author_login_id, fallback_actor)
                .await?;
        let imported_attachments = rest_site_import_attachments(
            service,
            repository,
            &actor,
            &comment.attachments,
            rollback,
        )
        .await?;
        rollback.record_attachments(&imported_attachments.created_attachments);
        let contents_markdown =
            rewrite_site_import_file_links(contents_markdown, &imported_attachments.link_rewrites);
        let failure_resource_key = rest_site_import_comment_key(
            "issues.comments",
            owner_name,
            project_name,
            issue_number,
            contents_markdown.as_str(),
        );
        let detail = repository
            .create_issue_comment(persistence::CreateIssueCommentInput {
                actor_display_name: actor.display_name.clone(),
                actor_id: actor.id,
                actor_login_id: actor.login_id.clone(),
                attachment_ids: imported_attachments.ids,
                contents_markdown,
                issue_number,
                owner_name: owner_name.trim().to_string(),
                parent_comment_id,
                project_name: project_name.trim().to_string(),
            })
            .await;
        let detail = match detail {
            Ok(detail) => detail,
            Err(error) => {
                let message = error.to_string();
                rest_site_import_cleanup_attachments(
                    service,
                    repository,
                    &actor,
                    &imported_attachments.created_attachments,
                )
                .await;
                checkpoint.set_failure(
                    "issues.comments",
                    index,
                    failure_resource_key,
                    message.clone(),
                );
                return Err(RestRouteError::internal(message));
            }
        };
        if detail.is_none() {
            rest_site_import_cleanup_attachments(
                service,
                repository,
                &actor,
                &imported_attachments.created_attachments,
            )
            .await;
            continue;
        }
        if let Some(created_comment_id) = detail
            .as_ref()
            .and_then(|issue| issue.comments.iter().map(|comment| comment.id).max())
        {
            repository
                .restore_site_import_issue_comment_created_at(
                    created_comment_id,
                    rest_site_import_parse_legacy_datetime(&comment.created_at),
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
            Box::pin(rest_site_import_issue_comments(
                service,
                repository,
                owner_name,
                project_name,
                issue_number,
                &comment.child_comments,
                &actor,
                Some(created_comment_id),
                rollback,
                checkpoint,
            ))
            .await?;
        }
    }
    Ok(())
}

async fn rest_site_import_comment_actor(
    repository: &persistence::AppRepositoryImpl<'_>,
    preferred_login_id: &str,
    fallback_actor: &persistence::AppUserRecord,
) -> Result<persistence::AppUserRecord, RestRouteError> {
    if !preferred_login_id.trim().is_empty() {
        if let Some(user) = repository
            .find_user_by_login_id(preferred_login_id.trim())
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        {
            return Ok(user);
        }
    }
    Ok(fallback_actor.clone())
}

fn rest_site_import_parse_legacy_datetime(
    value: &str,
) -> Option<sea_orm::entity::prelude::DateTime> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    let json_value = serde_json::Value::String(trimmed.to_string());
    legacy_external_parse_datetime(Some(&json_value))
}

struct RestSiteImportedAttachments {
    ids: Vec<i64>,
    link_rewrites: Vec<(i64, i64)>,
    created_attachments: Vec<persistence::AttachmentRecord>,
}

async fn rest_site_import_cleanup_attachments(
    service: &PilotServiceImpl,
    repository: &persistence::AppRepositoryImpl<'_>,
    actor: &persistence::AppUserRecord,
    attachments: &[persistence::AttachmentRecord],
) {
    for attachment in attachments.iter().rev() {
        if let Ok(persistence::DeleteAttachmentResult::Deleted(deleted)) = repository
            .delete_attachment_for_actor(attachment.id, actor.id, &actor.login_id, true)
            .await
        {
            if !deleted.hash.is_empty() {
                let _ = std::fs::remove_file(uploaded_file_path_with_root(
                    &service.data_root,
                    &deleted.hash,
                ));
            }
        }
    }
}

fn rest_site_import_portable_attachment_bytes(
    service: &PilotServiceImpl,
    attachment: &RestSiteExportAttachmentItem,
) -> Result<Option<Vec<u8>>, String> {
    let Some(content_base64) = attachment
        .content_base64
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Ok(None);
    };
    let bytes = general_purpose::STANDARD
        .decode(content_base64)
        .map_err(|_| "site.import.attachment.invalidContent".to_string())?;
    if attachment.size >= 0 && attachment.size != bytes.len() as i64 {
        return Err("site.import.attachment.sizeMismatch".to_string());
    }
    if bytes.len() > service.max_uploaded_file_size {
        return Err("site.import.attachment.tooLarge".to_string());
    }
    if let Some(expected_sha256) = attachment
        .content_sha256
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let actual_sha256 = sha256_hex(&bytes);
        if !actual_sha256.eq_ignore_ascii_case(expected_sha256) {
            return Err("site.import.attachment.sha256Mismatch".to_string());
        }
    }
    Ok(Some(bytes))
}

async fn rest_site_import_attachments(
    service: &PilotServiceImpl,
    repository: &persistence::AppRepositoryImpl<'_>,
    actor: &persistence::AppUserRecord,
    attachments: &[RestSiteExportAttachmentItem],
    rollback: &mut RestSiteImportRollbackLedger,
) -> Result<RestSiteImportedAttachments, RestRouteError> {
    let mut attachment_ids = Vec::new();
    let mut link_rewrites = Vec::new();
    let mut created_attachments = Vec::new();
    for attachment in attachments {
        if let Some(bytes) = match rest_site_import_portable_attachment_bytes(service, attachment) {
            Ok(bytes) => bytes,
            Err(message) => {
                rest_site_import_cleanup_attachments(
                    service,
                    repository,
                    actor,
                    &created_attachments,
                )
                .await;
                return Err(RestRouteError::bad_request(message));
            }
        } {
            let file_name = attachment
                .name
                .trim()
                .is_empty()
                .then(|| "attachment.bin".to_string())
                .unwrap_or_else(|| attachment.name.trim().to_string());
            let mime_type = attachment
                .mime_type
                .trim()
                .is_empty()
                .then(|| detect_upload_mime_type(&file_name, None, &bytes))
                .unwrap_or_else(|| attachment.mime_type.trim().to_string());
            let hash = random_storage_token();
            let final_path = uploaded_file_path_with_root(&service.data_root, &hash);
            let staging_path = site_import_staging_upload_path(service, &hash);
            let journal_path = site_import_staging_upload_journal_path(&staging_path);
            if let Some(parent) = staging_path.parent() {
                if let Err(error) = std::fs::create_dir_all(parent) {
                    rest_site_import_cleanup_attachments(
                        service,
                        repository,
                        actor,
                        &created_attachments,
                    )
                    .await;
                    return Err(RestRouteError::internal(error.to_string()));
                }
            }
            if let Err(error) = std::fs::write(&staging_path, &bytes) {
                let _ = std::fs::remove_file(&staging_path);
                rest_site_import_cleanup_attachments(
                    service,
                    repository,
                    actor,
                    &created_attachments,
                )
                .await;
                return Err(RestRouteError::internal(error.to_string()));
            }
            let created = match repository
                .create_user_attachment_upload(
                    actor.id,
                    &actor.login_id,
                    &file_name,
                    &mime_type,
                    bytes.len() as i64,
                    &hash,
                )
                .await
            {
                Ok(created) => created,
                Err(error) => {
                    let _ = std::fs::remove_file(&staging_path);
                    rest_site_import_cleanup_attachments(
                        service,
                        repository,
                        actor,
                        &created_attachments,
                    )
                    .await;
                    return Err(RestRouteError::internal(error.to_string()));
                }
            };
            if let Err(error) =
                write_site_import_staged_upload_journal(&journal_path, created.id, &hash)
            {
                let _ = std::fs::remove_file(&staging_path);
                let _ = std::fs::remove_file(&journal_path);
                rest_site_import_cleanup_attachments(
                    service,
                    repository,
                    actor,
                    &created_attachments,
                )
                .await;
                return Err(RestRouteError::internal(error.to_string()));
            }
            rollback.record_staged_upload(
                created.id,
                hash.clone(),
                staging_path.clone(),
                final_path.clone(),
                journal_path,
            );
            repository
                .restore_site_import_attachment_created_at(
                    created.id,
                    rest_site_import_parse_legacy_datetime(&attachment.created_at),
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
            attachment_ids.push(created.id);
            if attachment.id > 0 && attachment.id != created.id {
                link_rewrites.push((attachment.id, created.id));
            }
            created_attachments.push(created);
            continue;
        }

        if attachment.id > 0 {
            rollback
                .record_existing_attachment(repository, attachment.id)
                .await?;
            attachment_ids.push(attachment.id);
        }
    }
    Ok(RestSiteImportedAttachments {
        ids: attachment_ids,
        link_rewrites,
        created_attachments,
    })
}

fn site_import_staging_upload_path(service: &PilotServiceImpl, hash: &str) -> PathBuf {
    site_import_staging_upload_root(service)
        .join(random_storage_token())
        .join(hash)
}

fn site_import_staging_upload_journal_path(staging_path: &StdPath) -> PathBuf {
    staging_path.with_extension("json")
}

fn site_import_staging_upload_root(service: &PilotServiceImpl) -> PathBuf {
    site_import_staging_upload_root_at(&service.data_root)
}

fn site_import_staging_upload_root_at(data_root: &StdPath) -> PathBuf {
    data_root.join("uploads").join(".site-import-staging")
}

fn cleanup_site_import_staging_uploads(service: &PilotServiceImpl) -> Result<(), RestRouteError> {
    let staging_root = site_import_staging_upload_root(service);
    cleanup_site_import_staging_uploads_at(&staging_root)
}

fn cleanup_site_import_staging_uploads_at(staging_root: &StdPath) -> Result<(), RestRouteError> {
    match std::fs::remove_dir_all(staging_root) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(RestRouteError::internal(error.to_string())),
    }
}

fn write_site_import_staged_upload_journal(
    journal_path: &StdPath,
    attachment_id: i64,
    hash: &str,
) -> std::io::Result<()> {
    let journal = RestSiteImportStagedUploadJournal {
        attachment_id,
        hash: hash.to_string(),
        version: 1,
    };
    if let Some(parent) = journal_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let bytes = serde_json::to_vec(&journal)
        .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error))?;
    let mut file = std::fs::File::create(journal_path)?;
    use std::io::Write as _;
    file.write_all(&bytes)?;
    file.sync_all()?;
    Ok(())
}

fn promote_site_import_staged_upload_file(
    upload: &RestSiteImportStagedUpload,
) -> std::io::Result<()> {
    if upload.attachment_id <= 0 || upload.hash.trim().is_empty() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "invalid site import staged upload journal",
        ));
    }
    if upload
        .staging_path
        .file_name()
        .and_then(|value| value.to_str())
        != Some(upload.hash.as_str())
    {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "site import staged upload hash mismatch",
        ));
    }
    if let Some(parent) = upload.final_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if upload.final_path.exists() {
        let final_bytes = std::fs::read(&upload.final_path)?;
        let staged_bytes = std::fs::read(&upload.staging_path)?;
        if final_bytes != staged_bytes {
            return Err(std::io::Error::new(
                std::io::ErrorKind::AlreadyExists,
                "site import staged upload final file mismatch",
            ));
        }
        std::fs::remove_file(&upload.staging_path)?;
    } else {
        std::fs::rename(&upload.staging_path, &upload.final_path)?;
    }
    let _ = std::fs::remove_file(&upload.journal_path);
    cleanup_empty_parent_dirs(upload.staging_path.parent(), upload.final_path.parent());
    Ok(())
}

async fn reconcile_site_import_staging_uploads(
    service: &PilotServiceImpl,
    repository: &persistence::AppRepositoryImpl<'_>,
) -> Result<(), RestRouteError> {
    reconcile_site_import_staging_uploads_at(&service.data_root, repository).await
}

pub(crate) async fn reconcile_site_import_staging_uploads_for_startup(
    data_root: &StdPath,
    repository: &persistence::AppRepositoryImpl<'_>,
) -> Result<(), RestRouteError> {
    let _site_import_guard = site_import_staging_lock().lock().await;
    reconcile_site_import_staging_uploads_at(data_root, repository).await
}

async fn reconcile_site_import_staging_uploads_at(
    data_root: &StdPath,
    repository: &persistence::AppRepositoryImpl<'_>,
) -> Result<(), RestRouteError> {
    let staging_root = site_import_staging_upload_root_at(data_root);
    let entries = match std::fs::read_dir(&staging_root) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(RestRouteError::internal(error.to_string())),
    };
    for entry in entries.filter_map(Result::ok) {
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if !file_type.is_dir() {
            continue;
        }
        let child_entries = match std::fs::read_dir(entry.path()) {
            Ok(entries) => entries,
            Err(_) => continue,
        };
        for child in child_entries.filter_map(Result::ok) {
            let journal_path = child.path();
            if journal_path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }
            let Ok(bytes) = std::fs::read(&journal_path) else {
                continue;
            };
            let Ok(journal) = serde_json::from_slice::<RestSiteImportStagedUploadJournal>(&bytes)
            else {
                continue;
            };
            if journal.version != 1 || journal.attachment_id <= 0 || journal.hash.trim().is_empty()
            {
                continue;
            }
            let Some(attachment) = repository
                .read_attachment_by_id(journal.attachment_id)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
            else {
                continue;
            };
            if attachment.hash != journal.hash {
                continue;
            }
            let staging_path = journal_path.with_extension("");
            if !staging_path.exists() {
                let _ = std::fs::remove_file(&journal_path);
                continue;
            }
            let upload = RestSiteImportStagedUpload {
                attachment_id: journal.attachment_id,
                final_path: uploaded_file_path_with_root(data_root, &journal.hash),
                hash: journal.hash,
                journal_path,
                staging_path,
            };
            promote_site_import_staged_upload_file(&upload)
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
        }
    }
    Ok(())
}

fn rewrite_site_import_file_links(markdown: &str, rewrites: &[(i64, i64)]) -> String {
    if rewrites.is_empty() || !markdown.contains("/files/") {
        return markdown.to_string();
    }
    let rewrite_map = rewrites
        .iter()
        .copied()
        .collect::<std::collections::BTreeMap<_, _>>();
    let bytes = markdown.as_bytes();
    let mut rewritten = String::with_capacity(markdown.len());
    let mut index = 0;
    while let Some(relative_start) = markdown[index..].find("/files/") {
        let start = index + relative_start;
        rewritten.push_str(&markdown[index..start]);
        let number_start = start + "/files/".len();
        let mut number_end = number_start;
        while number_end < bytes.len() && bytes[number_end].is_ascii_digit() {
            number_end += 1;
        }
        if number_end == number_start {
            rewritten.push_str("/files/");
            index = number_start;
            continue;
        }
        let old_id = markdown[number_start..number_end].parse::<i64>().ok();
        if let Some(new_id) = old_id.and_then(|id| rewrite_map.get(&id)) {
            rewritten.push_str("/files/");
            rewritten.push_str(&new_id.to_string());
        } else {
            rewritten.push_str(&markdown[start..number_end]);
        }
        index = number_end;
    }
    rewritten.push_str(&markdown[index..]);
    rewritten
}

async fn rest_site_import_label_ids(
    repository: &persistence::AppRepositoryImpl<'_>,
    owner_name: &str,
    project_name: &str,
    labels: &[RestSiteExportLabelItem],
    rollback: &mut RestSiteImportRollbackLedger,
) -> Result<Vec<i64>, RestRouteError> {
    let mut label_ids = Vec::new();
    for label in labels {
        let label_name = label.name.trim();
        if label_name.is_empty() {
            continue;
        }
        let category_name = if label.category_name.trim().is_empty() {
            "Imported"
        } else {
            label.category_name.trim()
        };
        let label_color = if label.color.trim().is_empty() {
            "#999999".to_string()
        } else {
            normalize_issue_label_color(label.color.trim())
                .map_err(RestRouteError::from_connect_error)?
        };
        let Some((record, created)) = repository
            .create_project_label(persistence::CreateProjectLabelInput {
                category_is_exclusive: label.category_is_exclusive,
                category_name: category_name.to_string(),
                label_color,
                label_name: label_name.to_string(),
                owner_name: owner_name.trim().to_string(),
                project_name: project_name.trim().to_string(),
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        else {
            continue;
        };
        if created {
            rollback.record_label(owner_name, project_name, record.id);
        }
        label_ids.push(record.id);
    }
    Ok(label_ids)
}

async fn rest_site_import_milestone_id(
    repository: &persistence::AppRepositoryImpl<'_>,
    owner_name: &str,
    project_name: &str,
    milestone_title: &str,
    actor: &persistence::AppUserRecord,
    rollback: &mut RestSiteImportRollbackLedger,
) -> Result<Option<i64>, RestRouteError> {
    let title = milestone_title.trim();
    if title.is_empty() {
        return Ok(None);
    }
    let milestones = repository
        .list_project_milestones(
            owner_name,
            project_name,
            persistence::MilestoneListFilter {
                order_by: String::new(),
                order_dir: String::new(),
                state: String::new(),
            },
        )
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    if let Some(existing) = milestones.iter().find(|milestone| milestone.title == title) {
        return Ok(Some(existing.id));
    }
    let created = repository
        .create_project_milestone(persistence::MilestoneMutationInput {
            actor_id: Some(actor.id),
            attachment_ids: Vec::new(),
            contents_markdown: String::new(),
            due_date: None,
            owner_name: owner_name.trim().to_string(),
            project_name: project_name.trim().to_string(),
            state: "open".to_string(),
            title: title.to_string(),
        })
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    if let Some(milestone) = created {
        rollback.record_milestone(owner_name, project_name, milestone.id);
        Ok(Some(milestone.id))
    } else {
        Ok(None)
    }
}

async fn rest_site_import_actor(
    repository: &persistence::AppRepositoryImpl<'_>,
    preferred_login_id: &str,
    owner_name: &str,
) -> Result<Option<persistence::AppUserRecord>, RestRouteError> {
    for candidate in [preferred_login_id.trim(), owner_name.trim()] {
        if candidate.is_empty() {
            continue;
        }
        if let Some(user) = repository
            .find_user_by_login_id(candidate)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        {
            return Ok(Some(user));
        }
    }
    Ok(None)
}

fn normalize_site_import_project_scope(value: &str) -> Result<String, ConnectError> {
    let trimmed = value.trim();
    let scope = if trimmed.is_empty() {
        ProjectScope::Public
    } else {
        map_project_scope(trimmed)?
    };
    Ok(scope.as_str().to_string())
}

fn normalize_site_import_project_vcs(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "svn" | "subversion" => "Subversion".to_string(),
        _ => "GIT".to_string(),
    }
}

fn normalize_site_import_project_member_role(value: &str) -> String {
    if value.trim().eq_ignore_ascii_case("manager") {
        "manager".to_string()
    } else {
        "member".to_string()
    }
}

fn rest_site_import_label_category_name(value: &str) -> &str {
    let value = value.trim();
    if value.is_empty() {
        "Imported"
    } else {
        value
    }
}

async fn rest_export_site_users(
    repository: &PilotRepository,
    base_path: &str,
) -> Result<Vec<RestSiteUserItem>, RestRouteError> {
    let mut users_by_id = HashMap::new();
    for state in ["ACTIVE", "LOCKED", "DELETED", "GUEST", "SITE_ADMIN"] {
        let mut page = 1;
        loop {
            let record = repository
                .list_site_users(persistence::SiteUserListFilter {
                    page,
                    query: String::new(),
                    state: state.to_string(),
                })
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
            for user in record.users {
                if !users_by_id.contains_key(&user.id) {
                    let rest_user = rest_site_user_from_record(repository, base_path, user)
                        .await
                        .map_err(RestRouteError::from_connect_error)?;
                    users_by_id.insert(rest_user.id, rest_user);
                }
            }
            if record.total_pages == 0 || page >= record.total_pages {
                break;
            }
            page += 1;
        }
    }
    let mut users = users_by_id.into_values().collect::<Vec<_>>();
    users.sort_by(|left, right| left.login_id.cmp(&right.login_id));
    Ok(users)
}

async fn rest_export_site_milestones(
    repository: &PilotRepository,
    project_refs: &[(String, String)],
    data_root: &StdPath,
) -> Result<Vec<RestSiteExportMilestoneItem>, RestRouteError> {
    let mut milestones = Vec::new();
    for (owner_name, project_name) in project_refs {
        let records = repository
            .list_project_milestones(
                owner_name,
                project_name,
                persistence::MilestoneListFilter {
                    order_by: "dueDate".to_string(),
                    order_dir: "asc".to_string(),
                    state: "all".to_string(),
                },
            )
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        for record in records {
            milestones.push(rest_site_export_milestone_from_record(
                data_root,
                owner_name,
                project_name,
                &record,
            ));
        }
    }
    Ok(milestones)
}

async fn rest_export_site_labels(
    repository: &PilotRepository,
    project_refs: &[(String, String)],
) -> Result<Vec<RestSiteExportProjectLabelItem>, RestRouteError> {
    let mut labels = Vec::new();
    for (owner_name, project_name) in project_refs {
        let records = repository
            .list_project_labels(owner_name, project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        for record in records {
            labels.push(rest_site_export_project_label_from_record(
                owner_name,
                project_name,
                &record,
            ));
        }
    }
    Ok(labels)
}

async fn rest_export_site_project_members(
    repository: &PilotRepository,
    project_refs: &[(String, String)],
) -> Result<Vec<RestSiteExportProjectMemberItem>, RestRouteError> {
    let mut project_members = Vec::new();
    for (owner_name, project_name) in project_refs {
        let records = repository
            .read_project_members(owner_name, project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        for member in records.members {
            project_members.push(RestSiteExportProjectMemberItem {
                login_id: member.login_id,
                owner_name: owner_name.to_string(),
                project_name: project_name.to_string(),
                role: normalize_site_import_project_member_role(&member.role),
            });
        }
    }
    Ok(project_members)
}

fn rest_site_export_project_label_from_record(
    owner_name: &str,
    project_name: &str,
    label: &persistence::IssueLabelRecord,
) -> RestSiteExportProjectLabelItem {
    RestSiteExportProjectLabelItem {
        category_is_exclusive: label.category_is_exclusive,
        category_name: label.category_name.clone(),
        color: label.color.clone(),
        name: label.name.clone(),
        owner_name: owner_name.to_string(),
        project_name: project_name.to_string(),
    }
}

fn rest_site_export_milestone_from_record(
    data_root: &StdPath,
    owner_name: &str,
    project_name: &str,
    milestone: &persistence::IssueMilestoneRecord,
) -> RestSiteExportMilestoneItem {
    RestSiteExportMilestoneItem {
        attachments: milestone
            .attachments
            .iter()
            .map(|record| rest_site_export_attachment_from_record(data_root, record))
            .collect(),
        contents_markdown: milestone.contents_markdown.clone(),
        due_date: milestone.due_date_label.clone(),
        owner_name: owner_name.to_string(),
        project_name: project_name.to_string(),
        state: milestone.state.clone(),
        title: milestone.title.clone(),
    }
}

async fn rest_export_site_posts(
    repository: &PilotRepository,
    data_root: &StdPath,
) -> Result<Vec<RestSiteExportPostItem>, RestRouteError> {
    let mut posts = Vec::new();
    let mut page = 1;
    loop {
        let record = repository
            .list_site_postings(page)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        for post in record.posts {
            let post_number = post.post_number;
            let detail = repository
                .read_posting_detail_for_viewer(
                    &post.owner_name,
                    &post.project_name,
                    post_number,
                    None,
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .ok_or_else(|| RestRouteError::internal("site export post disappeared"))?;
            posts.push(rest_site_export_post_from_record(data_root, &detail));
        }
        if record.total_pages == 0 || page >= record.total_pages {
            break;
        }
        page += 1;
    }
    Ok(posts)
}

async fn rest_export_site_issues(
    repository: &PilotRepository,
    data_root: &StdPath,
) -> Result<Vec<RestSiteExportIssueItem>, RestRouteError> {
    let mut issues = Vec::new();
    for state in ["open", "closed"] {
        let mut page = 1;
        loop {
            let record = repository
                .list_site_issues(state, page)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
            for issue in record.issues {
                let detail = repository
                    .read_issue_detail(&issue.owner_name, &issue.project_name, issue.issue_number)
                    .await
                    .map_err(|error| RestRouteError::internal(error.to_string()))?
                    .ok_or_else(|| RestRouteError::internal("site export issue disappeared"))?;
                issues.push(rest_site_export_issue_from_record(data_root, &detail));
            }
            if record.total_pages == 0 || page >= record.total_pages {
                break;
            }
            page += 1;
        }
    }
    Ok(issues)
}

async fn rest_read_site_mail(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteMailOptionsResponse>, RestRouteError> {
    rest_require_site_admin_repository(&service, &headers, false).await?;
    Ok(Json(rest_site_mail_options(false, &service.smtp)))
}

async fn rest_send_site_test_mail(
    headers: HeaderMap,
    body: RestSiteMailSendBody,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteMailOptionsResponse>, RestRouteError> {
    rest_require_site_admin_repository(&service, &headers, true).await?;
    let from = required_site_mail_field(body.from, "from")?;
    let to = required_site_mail_field(body.to, "to")?;
    let subject = required_site_mail_field(body.subject, "subject")?;
    let body = required_site_mail_field(body.body, "body")?;
    deliver_with_config(
        OutboundMail {
            bcc: Vec::new(),
            body,
            from,
            html: false,
            reply_to: None,
            subject,
            to,
        },
        &service.integrations,
    )
    .map_err(RestRouteError::internal)?;

    Ok(Json(rest_site_mail_options(true, &service.smtp)))
}

async fn rest_read_site_mail_list(
    headers: HeaderMap,
    body: RestSiteMailListBody,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteMailListResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let recipients = if body.all {
        repository
            .list_site_mail_recipients()
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
    } else {
        rest_site_mail_recipients_for_projects(repository, &body.projects).await?
    };

    Ok(Json(RestSiteMailListResponse { recipients }))
}

fn rest_site_mail_options(sent: bool, smtp: &SmtpRuntimeConfig) -> RestSiteMailOptionsResponse {
    RestSiteMailOptionsResponse {
        not_configured_items: smtp.not_configured_items(),
        sender: smtp.default_from(),
        sent,
    }
}

fn required_site_mail_field(value: String, name: &str) -> Result<String, RestRouteError> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        return Err(RestRouteError::bad_request(format!("{name} is required")));
    }
    Ok(trimmed)
}

async fn rest_site_mail_recipients_for_projects(
    repository: &PilotRepository,
    projects: &[String],
) -> Result<Vec<String>, RestRouteError> {
    let mut recipients = Vec::new();
    for project_label in projects {
        let project_label = project_label.trim();
        if project_label.is_empty() {
            continue;
        }
        let Some(project) = rest_find_site_mail_project(repository, project_label).await? else {
            continue;
        };
        recipients.extend(
            repository
                .list_project_member_users(project.id)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .into_iter()
                .map(|user| user.email_address.trim().to_string())
                .filter(|email| !email.is_empty()),
        );
    }
    recipients.sort();
    recipients.dedup();
    Ok(recipients)
}

async fn rest_find_site_mail_project(
    repository: &PilotRepository,
    project_label: &str,
) -> Result<Option<persistence::ProjectRecord>, RestRouteError> {
    if let Some((owner_name, project_name)) = project_label.split_once('/') {
        return repository
            .read_project_by_owner_and_name(owner_name, project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()));
    }
    let normalized = normalize_identifier(project_label);
    let project = repository
        .list_projects()
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .into_iter()
        .find(|project| normalize_identifier(&project.project_name) == normalized);
    Ok(project)
}

pub(crate) async fn rest_delete_site_project(
    headers: HeaderMap,
    project_id: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestProjectDeleteResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let project = repository
        .read_project_by_id(project_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    repository
        .delete_project_by_owner_and_name(&project.owner_name, &project.project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    delete_project_repository_storage(&service, project.id)?;

    Ok(Json(RestProjectDeleteResponse {
        ok: true,
        redirect_path: "/sites/projectList".to_string(),
    }))
}

async fn rest_require_site_admin_repository<'a>(
    service: &'a PilotServiceImpl,
    headers: &HeaderMap,
    validate_csrf: bool,
) -> Result<&'a PilotRepository, RestRouteError> {
    let session = require_session(&service.session_manager, headers)
        .map_err(RestRouteError::from_connect_error)?;
    if validate_csrf {
        require_valid_csrf(&service.session_manager, headers, &session)
            .map_err(RestRouteError::from_connect_error)?;
    }
    let repository = rest_repository(service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    if !actor.is_site_admin {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("site admin is required"),
        ));
    }
    Ok(repository)
}

fn rest_site_user_state(state: Option<String>) -> Result<String, RestRouteError> {
    let normalized = state
        .as_deref()
        .map(normalize_identifier)
        .unwrap_or_default()
        .to_ascii_uppercase();
    let normalized = if normalized.is_empty() {
        "ACTIVE".to_string()
    } else {
        normalized
    };
    match normalized.as_str() {
        "ACTIVE" | "LOCKED" | "DELETED" | "GUEST" | "SITE_ADMIN" => Ok(normalized),
        _ => Err(RestRouteError::bad_request("invalid site user state")),
    }
}

fn rest_site_issue_state(state: Option<String>) -> Result<String, RestRouteError> {
    let normalized = state
        .as_deref()
        .map(normalize_identifier)
        .unwrap_or_default();
    let normalized = if normalized.is_empty() {
        "open".to_string()
    } else {
        normalized
    };
    match normalized.as_str() {
        "open" | "closed" => Ok(normalized),
        _ => Err(RestRouteError::bad_request("invalid site issue state")),
    }
}

async fn rest_site_user_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: persistence::SiteUserRecord,
) -> Result<RestSiteUserItem, ConnectError> {
    let avatar_url =
        workspace_avatar_url(repository, record.id, &record.email_address, base_path).await?;
    Ok(RestSiteUserItem {
        avatar_url,
        created_at: record
            .created_at
            .map(|value| value.to_string())
            .unwrap_or_default(),
        display_name: record.display_name,
        email_address: record.email_address,
        id: record.id,
        is_guest: record.is_guest,
        is_site_admin: record.is_site_admin,
        last_state_modified_at: record
            .last_state_modified_at
            .map(|value| value.to_string())
            .unwrap_or_default(),
        login_id: record.login_id,
        state: record.state,
    })
}

async fn rest_site_user_list_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: persistence::SiteUserListRecord,
) -> Result<RestSiteUserListResponse, ConnectError> {
    let mut users = Vec::new();
    for user in record.users {
        users.push(rest_site_user_from_record(repository, base_path, user).await?);
    }

    Ok(RestSiteUserListResponse {
        page: record.page,
        page_size: record.page_size,
        query: record.query,
        site_admin_count: record.site_admin_count,
        state: record.state,
        total: record.total,
        total_pages: record.total_pages,
        users,
    })
}

fn rest_site_no_avatar_user_from_record(
    record: persistence::SiteNoAvatarUserRecord,
) -> RestSiteNoAvatarUserItem {
    RestSiteNoAvatarUserItem {
        email: record.email,
        login_id: record.login_id,
        name: record.name,
    }
}

fn rest_site_legacy_ok_response() -> RestSiteLegacyOkResponse {
    RestSiteLegacyOkResponse {
        message: "OK".to_string(),
        status: 200,
    }
}

fn empty_string_as_none(value: &str) -> Option<String> {
    let value = value.trim();
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

async fn rest_site_project_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: persistence::ProjectRecord,
) -> Result<RestSiteProjectItem, ConnectError> {
    let project_logo_url = project_logo_url(repository, base_path, record.id).await?;
    Ok(RestSiteProjectItem {
        created_at: record
            .created_date
            .map(|value| value.to_string())
            .unwrap_or_default(),
        id: record.id,
        owner_name: record.owner_name,
        overview: record.overview.unwrap_or_default(),
        project_logo_url,
        project_name: record.project_name,
        project_scope: record.project_scope,
        vcs: record.vcs,
    })
}

fn rest_site_export_post_from_record(
    data_root: &StdPath,
    record: &persistence::PostingRecord,
) -> RestSiteExportPostItem {
    RestSiteExportPostItem {
        author_login_id: record.author_login_id.clone(),
        attachments: record
            .attachments
            .iter()
            .map(|record| rest_site_export_attachment_from_record(data_root, record))
            .collect(),
        body_markdown: record.body_markdown.clone(),
        comments: rest_site_export_post_comments_from_records(data_root, &record.comments),
        created_at: legacy_external_date_string(record.created_at),
        history_markdown: record.history_markdown.clone(),
        labels: record
            .labels
            .iter()
            .map(rest_site_export_label_from_record)
            .collect(),
        notice: record.notice,
        owner_name: record.owner_name.clone(),
        post_number: record.post_number.to_string(),
        project_name: record.project_name.clone(),
        readme: record.readme,
        title: record.title.clone(),
        updated_at: legacy_external_date_string(record.updated_at),
    }
}

fn rest_site_export_issue_from_record(
    data_root: &StdPath,
    record: &persistence::IssueRecord,
) -> RestSiteExportIssueItem {
    RestSiteExportIssueItem {
        assignee_login_id: record.assignee_login_id.clone(),
        author_login_id: record.author_login_id.clone(),
        attachments: record
            .attachments
            .iter()
            .map(|record| rest_site_export_attachment_from_record(data_root, record))
            .collect(),
        body_markdown: record.body_markdown.clone(),
        comments: rest_site_export_issue_comments_from_records(data_root, &record.comments),
        created_at: legacy_external_date_string(record.created_at),
        history_markdown: record.history_markdown.clone(),
        issue_number: record.issue_number.to_string(),
        labels: record
            .labels
            .iter()
            .map(rest_site_export_label_from_record)
            .collect(),
        milestone_title: record.milestone_title.clone(),
        owner_name: record.owner_name.clone(),
        project_name: record.project_name.clone(),
        state: record.state.clone(),
        title: record.title.clone(),
        updated_at: legacy_external_date_string(record.updated_at),
    }
}

fn rest_site_export_post_comment_from_record(
    data_root: &StdPath,
    record: &persistence::PostingCommentRecord,
    child_comments: Vec<RestSiteExportCommentItem>,
) -> RestSiteExportCommentItem {
    RestSiteExportCommentItem {
        author_login_id: record.author_login_id.clone(),
        attachments: record
            .attachments
            .iter()
            .map(|record| rest_site_export_attachment_from_record(data_root, record))
            .collect(),
        child_comments,
        contents_markdown: record.contents_markdown.clone(),
        created_at: legacy_external_date_string(record.created_at),
    }
}

fn rest_site_export_issue_comment_from_record(
    data_root: &StdPath,
    record: &persistence::IssueCommentRecord,
    child_comments: Vec<RestSiteExportCommentItem>,
) -> RestSiteExportCommentItem {
    RestSiteExportCommentItem {
        author_login_id: record.author_login_id.clone(),
        attachments: record
            .attachments
            .iter()
            .map(|record| rest_site_export_attachment_from_record(data_root, record))
            .collect(),
        child_comments,
        contents_markdown: record.contents_markdown.clone(),
        created_at: legacy_external_date_string(record.created_at),
    }
}

fn rest_site_export_post_comments_from_records(
    data_root: &StdPath,
    records: &[persistence::PostingCommentRecord],
) -> Vec<RestSiteExportCommentItem> {
    records
        .iter()
        .filter(|record| record.parent_comment_id.is_none())
        .map(|record| rest_site_export_post_comment_tree(data_root, record, records))
        .collect()
}

fn rest_site_export_post_comment_tree(
    data_root: &StdPath,
    record: &persistence::PostingCommentRecord,
    records: &[persistence::PostingCommentRecord],
) -> RestSiteExportCommentItem {
    let children = records
        .iter()
        .filter(|child| child.parent_comment_id == Some(record.id))
        .map(|child| rest_site_export_post_comment_tree(data_root, child, records))
        .collect();
    rest_site_export_post_comment_from_record(data_root, record, children)
}

fn rest_site_export_issue_comments_from_records(
    data_root: &StdPath,
    records: &[persistence::IssueCommentRecord],
) -> Vec<RestSiteExportCommentItem> {
    records
        .iter()
        .filter(|record| record.parent_comment_id.is_none())
        .map(|record| rest_site_export_issue_comment_tree(data_root, record, records))
        .collect()
}

fn rest_site_export_issue_comment_tree(
    data_root: &StdPath,
    record: &persistence::IssueCommentRecord,
    records: &[persistence::IssueCommentRecord],
) -> RestSiteExportCommentItem {
    let children = records
        .iter()
        .filter(|child| child.parent_comment_id == Some(record.id))
        .map(|child| rest_site_export_issue_comment_tree(data_root, child, records))
        .collect();
    rest_site_export_issue_comment_from_record(data_root, record, children)
}

fn rest_site_export_attachment_from_record(
    data_root: &StdPath,
    record: &persistence::IssueAttachmentRecord,
) -> RestSiteExportAttachmentItem {
    let content_bytes = rest_site_export_attachment_content_bytes(data_root, record);
    RestSiteExportAttachmentItem {
        content_base64: content_bytes
            .as_ref()
            .map(|bytes| general_purpose::STANDARD.encode(bytes)),
        content_sha256: content_bytes.as_deref().map(sha256_hex),
        created_at: legacy_external_date_string(record.created_at),
        id: record.id,
        mime_type: record.mime_type.clone(),
        name: record.name.clone(),
        size: record.size,
    }
}

fn rest_site_export_attachment_content_bytes(
    data_root: &StdPath,
    record: &persistence::IssueAttachmentRecord,
) -> Option<Vec<u8>> {
    let hash = record.hash.trim();
    if hash.is_empty() {
        return None;
    }
    std::fs::read(uploaded_file_path_with_root(data_root, hash)).ok()
}

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut hex = String::with_capacity(digest.len() * 2);
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(&mut hex, "{byte:02x}");
    }
    hex
}

fn rest_site_export_label_from_record(
    record: &persistence::IssueLabelRecord,
) -> RestSiteExportLabelItem {
    RestSiteExportLabelItem {
        category_is_exclusive: record.category_is_exclusive,
        category_name: record.category_name.clone(),
        color: record.color.clone(),
        name: record.name.clone(),
    }
}

async fn rest_site_post_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: &persistence::ProjectPostingListItemRecord,
) -> Result<RestSitePostItem, ConnectError> {
    Ok(RestSitePostItem {
        author_avatar_url: gravatar_url(&record.author_email_address),
        author_label: record.author_label.clone(),
        author_login_id: record.author_login_id.clone(),
        comment_count: record.comment_count,
        created_label: record.created_label.clone(),
        created_title: record.created_title.clone(),
        labels: record
            .labels
            .iter()
            .map(rest_board_label_from_record)
            .collect(),
        notice: record.notice,
        owner_name: record.owner_name.clone(),
        post_number: record.post_number.to_string(),
        project_logo_url: project_logo_url(repository, base_path, record.project_id).await?,
        project_name: record.project_name.clone(),
        readme: record.readme,
        title: record.title.clone(),
        updated_label: record.updated_label.clone(),
    })
}

async fn rest_site_issue_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: &persistence::ProjectIssueListItemRecord,
) -> Result<RestSiteIssueItem, ConnectError> {
    Ok(RestSiteIssueItem {
        assignee_label: record.assignee_label.clone(),
        author_avatar_url: gravatar_url(&record.author_email_address),
        author_label: record.author_label.clone(),
        author_login_id: record.author_login_id.clone(),
        comment_count: record.comment_count,
        created_label: record.created_label.clone(),
        created_title: record.created_title.clone(),
        issue_number: record.issue_number.to_string(),
        labels: record
            .labels
            .iter()
            .map(rest_board_label_from_record)
            .collect(),
        milestone_title: record.milestone_title.clone(),
        owner_name: record.owner_name.clone(),
        project_logo_url: project_logo_url(repository, base_path, record.project_id).await?,
        project_name: record.project_name.clone(),
        state: record.state.clone(),
        title: record.title.clone(),
        updated_label: record.updated_label.clone(),
        voter_count: record.voter_count,
        watcher_count: record.watcher_count,
    })
}
