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
    pub login_id: String,
    pub role: String,
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
    pub id: i64,
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
    pub login_id: String,
    pub role: String,
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
pub struct ProjectListEntry {
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ToggleFavoriteProjectResult {
    pub favorited: bool,
    pub owner_name: String,
    pub project_name: String,
}

pub type AppUserInput = CreateUserInput;
