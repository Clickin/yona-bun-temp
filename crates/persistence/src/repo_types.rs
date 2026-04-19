use sea_orm::entity::prelude::DateTime;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AppUserRecord {
    pub id: i64,
    pub display_name: String,
    pub email_address: String,
    pub is_confirmed: bool,
    pub is_site_admin: bool,
    pub login_id: String,
    pub password_hash: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueRecord {
    pub author_id: Option<i64>,
    pub author_label: String,
    pub author_login_id: String,
    pub body_markdown: String,
    pub comment_count: u32,
    pub id: i64,
    pub issue_number: i64,
    pub milestone_id: Option<i64>,
    pub milestone_title: String,
    pub owner_name: String,
    pub project_name: String,
    pub state: String,
    pub title: String,
    pub assignee_login_id: String,
    pub assignee_label: String,
    pub updated_label: String,
    pub voter_count: u32,
    pub watcher_count: u32,
    pub is_watching: bool,
    pub has_voted: bool,
    pub labels: Vec<IssueLabelRecord>,
    pub comments: Vec<IssueCommentRecord>,
    pub timeline: Vec<IssueTimelineItemRecord>,
    pub attachments: Vec<IssueAttachmentRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectIssueListItemRecord {
    pub author_label: String,
    pub comment_count: u32,
    pub issue_number: i64,
    pub owner_name: String,
    pub project_name: String,
    pub state: String,
    pub title: String,
    pub updated_label: String,
    pub assignee_label: String,
    pub milestone_id: Option<i64>,
    pub milestone_title: String,
    pub voter_count: u32,
    pub watcher_count: u32,
    pub labels: Vec<IssueLabelRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectIssueListRecord {
    pub items: Vec<ProjectIssueListItemRecord>,
    pub page_num: u32,
    pub page_size: u32,
    pub total_count: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueListFilter {
    pub assignee_login_id: Option<String>,
    pub author_login_id: Option<String>,
    pub label_ids: Vec<i64>,
    pub milestone_id: Option<i64>,
    pub page_num: u32,
    pub state: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueLabelRecord {
    pub category_id: Option<i64>,
    pub category_is_exclusive: bool,
    pub category_name: String,
    pub color: String,
    pub id: i64,
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueLabelCategoryRecord {
    pub id: i64,
    pub is_exclusive: bool,
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateProjectLabelInput {
    pub category_is_exclusive: bool,
    pub category_name: String,
    pub label_color: String,
    pub label_name: String,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdateProjectLabelInput {
    pub category_id: i64,
    pub label_color: String,
    pub label_id: i64,
    pub label_name: String,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateProjectLabelCategoryInput {
    pub category_is_exclusive: bool,
    pub category_name: String,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdateProjectLabelCategoryInput {
    pub category_id: i64,
    pub category_is_exclusive: bool,
    pub category_name: String,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueMilestoneRecord {
    pub closed_issue_count: u32,
    pub completion_percent: u32,
    pub due_date_label: String,
    pub id: i64,
    pub open_issue_count: u32,
    pub state: String,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueAttachmentRecord {
    pub id: i64,
    pub mime_type: String,
    pub name: String,
    pub size: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueCommentRecord {
    pub attachments: Vec<IssueAttachmentRecord>,
    pub author_id: Option<i64>,
    pub author_label: String,
    pub author_login_id: String,
    pub contents_markdown: String,
    pub created_label: String,
    pub id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum IssueTimelineItemRecord {
    Comment(IssueCommentRecord),
    Event {
        created_label: String,
        event_type: String,
        id: i64,
        new_value: String,
        old_value: String,
        sender_login_id: String,
    },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueMutationInput {
    pub assignee_login_id: Option<String>,
    pub attachment_ids: Vec<i64>,
    pub body_markdown: String,
    pub label_ids: Vec<i64>,
    pub milestone_id: Option<i64>,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateIssueInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub values: IssueMutationInput,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdateIssueInput {
    pub actor_login_id: String,
    pub issue_number: i64,
    pub owner_name: String,
    pub project_name: String,
    pub values: IssueMutationInput,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateIssueCommentInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub attachment_ids: Vec<i64>,
    pub contents_markdown: String,
    pub issue_number: i64,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdateIssueCommentInput {
    pub attachment_ids: Vec<i64>,
    pub comment_id: i64,
    pub contents_markdown: String,
    pub issue_number: i64,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MassUpdateIssuesInput {
    pub add_label_ids: Vec<i64>,
    pub assignee_login_id: Option<String>,
    pub assignee_update: bool,
    pub issue_numbers: Vec<i64>,
    pub milestone_id: Option<i64>,
    pub milestone_update: bool,
    pub owner_name: String,
    pub project_name: String,
    pub remove_label_ids: Vec<i64>,
    pub state: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateUserInput {
    pub display_name: String,
    pub email_address: String,
    pub is_confirmed: bool,
    pub is_site_admin: bool,
    pub login_id: String,
    pub password_hash: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateOrganizationInput {
    pub description: Option<String>,
    pub organization_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdateOrganizationInput {
    pub current_organization_name: String,
    pub description: Option<String>,
    pub organization_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateProjectInput {
    pub organization_id: Option<i64>,
    pub owner_name: String,
    pub overview: Option<String>,
    pub project_name: String,
    pub project_scope: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdateProjectInput {
    pub current_owner_name: String,
    pub current_project_name: String,
    pub overview: Option<String>,
    pub project_name: String,
    pub project_scope: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationRecord {
    pub id: i64,
    pub organization_name: String,
    pub description: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationViewerRecord {
    pub is_organization_admin: bool,
    pub is_organization_member: bool,
    pub is_site_admin: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationAuthorizationRecord {
    pub organization: OrganizationRecord,
    pub viewer: OrganizationViewerRecord,
    pub enrollment_requested: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationMemberRecord {
    pub email_address: String,
    pub login_id: String,
    pub role: String,
    pub user_id: i64,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationEnrollmentRequestRecord {
    pub email_address: String,
    pub login_id: String,
    pub user_id: i64,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationMemberDirectoryRecord {
    pub enrollment_requests: Vec<OrganizationEnrollmentRequestRecord>,
    pub members: Vec<OrganizationMemberRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectRecord {
    pub created_date: Option<DateTime>,
    pub is_code_accessible_member_only: bool,
    pub last_pushed_date: Option<DateTime>,
    pub id: i64,
    pub original_project_id: Option<i64>,
    pub organization_id: Option<i64>,
    pub organization_name: Option<String>,
    pub owner_name: String,
    pub overview: Option<String>,
    pub project_name: String,
    pub project_scope: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectViewerRecord {
    pub is_organization_admin: bool,
    pub is_organization_member: bool,
    pub is_project_manager: bool,
    pub is_project_member: bool,
    pub is_site_admin: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectAuthorizationRecord {
    pub project: ProjectRecord,
    pub viewer: ProjectViewerRecord,
    pub enrollment_requested: bool,
    pub is_favorited: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectMemberRecord {
    pub email_address: String,
    pub login_id: String,
    pub role: String,
    pub user_id: i64,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectEnrollmentRequestRecord {
    pub login_id: String,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectMemberDirectoryRecord {
    pub enrollment_requests: Vec<ProjectEnrollmentRequestRecord>,
    pub members: Vec<ProjectMemberRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectMenuSettingsRecord {
    pub board: bool,
    pub code: bool,
    pub issue: bool,
    pub milestone: bool,
    pub pull_request: bool,
    pub review: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectMilestoneSummaryRecord {
    pub closed_issue_count: u32,
    pub completion_percent: u32,
    pub due_date_label: String,
    pub open_issue_count: u32,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectListEntry {
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WorkspaceNotificationPreferenceRecord {
    pub enabled: bool,
    pub event_type: String,
    pub label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WatchedProjectNotificationsRecord {
    pub notifications: Vec<WorkspaceNotificationPreferenceRecord>,
    pub owner_name: String,
    pub project_id: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WorkspaceEmailRecord {
    pub email_address: String,
    pub id: String,
    pub valid: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WorkspaceProfileRecord {
    pub connected_social_providers: Vec<String>,
    pub display_name: String,
    pub english_name: String,
    pub is_blocked: bool,
    pub is_site_admin: bool,
    pub login_id: String,
    pub primary_email_address: String,
    pub since_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AttachmentRecord {
    pub container_id: i64,
    pub container_type: String,
    pub hash: String,
    pub id: i64,
    pub mime_type: String,
    pub name: String,
    pub owner_login_id: String,
    pub size: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WorkspaceIssueListItemRecord {
    pub assignee_label: String,
    pub author_label: String,
    pub comment_count: u32,
    pub issue_number: i64,
    pub owner_name: String,
    pub project_name: String,
    pub state: String,
    pub title: String,
    pub updated_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WorkspacePullRequestListItemRecord {
    pub comment_count: u32,
    pub contributor_label: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
    pub receiver_label: String,
    pub state: String,
    pub title: String,
    pub updated_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WorkspaceMemberProjectRecord {
    pub created_label: String,
    pub last_pushed_label: String,
    pub member_count: u32,
    pub owner_name: String,
    pub overview: String,
    pub project_name: String,
    pub project_scope: String,
    pub watch_count: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ToggleFavoriteProjectResult {
    pub favorited: bool,
    pub owner_name: String,
    pub project_name: String,
}

pub type AppUserInput = CreateUserInput;
