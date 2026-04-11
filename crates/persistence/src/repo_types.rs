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
    pub issue_number: i64,
    pub owner_name: String,
    pub project_name: String,
    pub state: String,
    pub title: String,
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
    pub login_id: String,
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
