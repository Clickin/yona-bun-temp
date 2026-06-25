use serde::{Deserialize, Serialize};

pub type OwnedView<T> = T;

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadCurrentSessionRequest {
    // Empty request
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignOutRequest {
    // Empty request
}

// ResetVisitedProjectsRequest already defined below

// Request view type aliases for backward compatibility
pub type ReadCurrentSessionRequestView<'a> = ReadCurrentSessionRequest;
pub type SignInWithPasswordRequestView<'a> = SignInWithPasswordRequest;
pub type RegisterWithPasswordRequestView<'a> = RegisterWithPasswordRequest;
pub type VerifyUserRequestView<'a> = VerifyUserRequest;
pub type SignOutRequestView<'a> = SignOutRequest; // Empty request
pub type ResetVisitedProjectsRequestView<'a> = ResetVisitedProjectsRequest;
pub type ResetApiTokenRequestView<'a> = ResetApiTokenRequest;
pub type ToggleWorkspaceNotificationRequestView<'a> = ToggleWorkspaceNotificationRequest;
pub type CreateOrganizationRequestView<'a> = CreateOrganizationRequest;
pub type ReadOrganizationDetailRequestView<'a> = ReadOrganizationDetailRequest;
pub type ReadOrganizationSettingsRequestView<'a> = ReadOrganizationSettingsRequest;
pub type ReadOrganizationAdminRequestView<'a> = ReadOrganizationAdminRequest;
pub type ReadOrganizationContainerRequestView<'a> = ReadOrganizationContainerRequest;
pub type UpdateOrganizationRequestView<'a> = UpdateOrganizationRequest;
pub type AddOrganizationMemberRequestView<'a> = AddOrganizationMemberRequest;
pub type UpdateOrganizationMemberRoleRequestView<'a> = UpdateOrganizationMemberRoleRequest;
pub type DeleteOrganizationMemberRequestView<'a> = DeleteOrganizationMemberRequest;
pub type AcceptOrganizationEnrollmentRequestView<'a> = AcceptOrganizationEnrollmentRequest;
pub type EnrollOrganizationRequestView<'a> = EnrollOrganizationRequest;
pub type CancelEnrollOrganizationRequestView<'a> = CancelEnrollOrganizationRequest;
pub type LeaveOrganizationRequestView<'a> = LeaveOrganizationRequest;
pub type DeleteOrganizationRequestView<'a> = DeleteOrganizationRequest;
pub type CreateProjectRequestView<'a> = CreateProjectRequest;
pub type ReadProjectDetailRequestView<'a> = ReadProjectDetailRequest;
pub type ReadProjectSettingsRequestView<'a> = ReadProjectSettingsRequest;
pub type ReadProjectContainerRequestView<'a> = ReadProjectContainerRequest;
pub type UpdateProjectOverviewRequestView<'a> = UpdateProjectOverviewRequest;
pub type ToggleProjectWatchRequestView<'a> = ToggleProjectWatchRequest;
pub type EnrollProjectRequestView<'a> = EnrollProjectRequest;
pub type CancelEnrollProjectRequestView<'a> = CancelEnrollProjectRequest;
pub type ToggleFavoriteProjectRequestView<'a> = ToggleFavoriteProjectRequest;
pub type RecordRecentProjectVisitRequestView<'a> = RecordRecentProjectVisitRequest;
pub type ListProjectsRequestView<'a> = ListProjectsRequest;
pub type ListOrganizationsRequestView<'a> = ListOrganizationsRequest;
pub type ListOrganizationIssuesRequestView<'a> = ListOrganizationIssuesRequest;
pub type ListProjectIssuesRequestView<'a> = ListProjectIssuesRequest;
pub type ReadIssueDetailRequestView<'a> = ReadIssueDetailRequest;
pub type UpdateIssueStateRequestView<'a> = UpdateIssueStateRequest;
pub type IssueParticipationRequestView<'a> = IssueParticipationRequest;
pub type IssueCommentParticipationRequestView<'a> = IssueCommentParticipationRequest;
pub type ListProjectLabelsRequestView<'a> = ListProjectLabelsRequest;
pub type CreateProjectLabelRequestView<'a> = CreateProjectLabelRequest;
pub type UpdateProjectLabelRequestView<'a> = UpdateProjectLabelRequest;
pub type DeleteProjectLabelRequestView<'a> = DeleteProjectLabelRequest;
pub type CreateProjectLabelCategoryRequestView<'a> = CreateProjectLabelCategoryRequest;
pub type UpdateProjectLabelCategoryRequestView<'a> = UpdateProjectLabelCategoryRequest;
pub type DeleteProjectLabelCategoryRequestView<'a> = DeleteProjectLabelCategoryRequest;
pub type ListProjectMilestonesRequestView<'a> = ListProjectMilestonesRequest;
pub type ReadProjectMilestoneRequestView<'a> = ReadProjectMilestoneRequest;
pub type CreateProjectMilestoneRequestView<'a> = CreateProjectMilestoneRequest;
pub type UpdateProjectMilestoneRequestView<'a> = UpdateProjectMilestoneRequest;
pub type DeleteProjectMilestoneRequestView<'a> = DeleteProjectMilestoneRequest;
pub type MilestoneStateMutationRequestView<'a> = MilestoneStateMutationRequest;

// Additional view aliases needed by route files
pub type UpdateProjectRequestView<'a> = UpdateProjectRequest;
pub type ReadWorkspaceOverviewRequestView<'a> = ReadWorkspaceOverviewRequest;
pub type SetDefaultLandingPathRequestView<'a> = SetDefaultLandingPathRequest;
pub type UpdateProfileRequestView<'a> = UpdateProfileRequest;
pub type ChangePasswordRequestView<'a> = ChangePasswordRequest;
pub type AddWorkspaceEmailRequestView<'a> = AddWorkspaceEmailRequest;
pub type DeleteWorkspaceEmailRequestView<'a> = DeleteWorkspaceEmailRequest;
pub type SendWorkspaceEmailValidationRequestView<'a> = SendWorkspaceEmailValidationRequest;
pub type SetMainWorkspaceEmailRequestView<'a> = SetMainWorkspaceEmailRequest;

// Additional missing view aliases
pub type ReadAuthUiCapabilitiesRequestView<'a> = ReadAuthUiCapabilitiesRequest;
pub type IssueShareRequestView<'a> = IssueShareRequest;
pub type AssignIssueRequestView<'a> = AssignIssueRequest;
pub type ListUserIssuesRequestView<'a> = ListUserIssuesRequest;
pub type ReadOrganizationMembersRequestView<'a> = ReadOrganizationMembersRequest;

// Missing response types
#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteIssueResponse {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
    #[serde(default)]
    pub ok: bool,
}

// Additional missing types used by issue handlers
#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MassUpdateIssuesResponse {
    #[serde(default)]
    pub items: Vec<ReadIssueDetailResponse>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueComment {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub contents_markdown: String,
    #[serde(default)]
    pub contents_html: String,
    #[serde(default)]
    pub author_login_id: String,
    #[serde(default)]
    pub author_label: String,
    #[serde(default)]
    pub created_label: String,
    #[serde(default)]
    pub viewer_can_update: bool,
    #[serde(default)]
    pub viewer_can_delete: bool,
    #[serde(default)]
    pub attachments: Vec<IssueAttachment>,
    #[serde(default)]
    pub voter_count: u32,
    #[serde(default)]
    pub viewer_has_voted: bool,
    #[serde(default)]
    pub voters: Vec<IssueCommentVoter>,
    #[serde(default)]
    pub via_email: bool,
    #[serde(default)]
    pub author_avatar_url: String,
    #[serde(default)]
    pub issue_references: Vec<IssueReferenceMetadata>,
    #[serde(default)]
    pub mention_references: Vec<MentionReferenceMetadata>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueCommentVoter {
    #[serde(default)]
    pub user_id: i64,
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub user_label: String,
    #[serde(default)]
    pub avatar_url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueTimelineItem {
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub event_type: String,
    #[serde(default)]
    pub old_value: String,
    #[serde(default)]
    pub new_value: String,
    #[serde(default)]
    pub sender_login_id: String,
    #[serde(default)]
    pub created_label: String,
    pub comment: Option<IssueComment>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueMilestone {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub due_date_label: String,
    #[serde(default)]
    pub open_issue_count: u32,
    #[serde(default)]
    pub closed_issue_count: u32,
    #[serde(default)]
    pub completion_percent: u32,
    #[serde(default)]
    pub contents_markdown: String,
    #[serde(default)]
    pub contents_html: String,
    #[serde(default)]
    pub attachments: Vec<IssueAttachment>,
    #[serde(default)]
    pub open_issues: Vec<ProjectIssueListItem>,
    #[serde(default)]
    pub closed_issues: Vec<ProjectIssueListItem>,
    #[serde(default)]
    pub viewer_can_update: bool,
    #[serde(default)]
    pub viewer_can_delete: bool,
    #[serde(default)]
    pub issue_references: Vec<IssueReferenceMetadata>,
    #[serde(default)]
    pub mention_references: Vec<MentionReferenceMetadata>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueSharer {
    #[serde(default)]
    pub user_id: i64,
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub user_label: String,
}

// Enrollment request sub-message used in ReadOrganizationMembersResponse
#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationEnrollmentRequest {
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub user_label: String,
}

// ============================================================================
// Response/Data types (used as API return types)
// ============================================================================

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadCurrentSessionResponse {
    #[serde(default)]
    pub is_anonymous: bool,
    #[serde(default)]
    pub actor_id: i64,
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub user_label: String,
    #[serde(default)]
    pub email_address: String,
    #[serde(default)]
    pub is_confirmed: bool,
    #[serde(default)]
    pub is_site_admin: bool,
    #[serde(default)]
    pub default_landing_path: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadAuthUiCapabilitiesResponse {
    #[serde(default)]
    pub email_verification_enabled: bool,
    #[serde(default)]
    pub enabled_social_providers: Vec<String>,
    #[serde(default)]
    pub signup_require_confirm: bool,
    #[serde(default)]
    pub social_login_only: bool,
    #[serde(default)]
    pub login_id_placeholder: String,
    #[serde(default)]
    pub password_placeholder: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationDetail {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub viewer_can_update: bool,
    #[serde(default)]
    pub logo_url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationContainer {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub viewer_can_update: bool,
    #[serde(default)]
    pub viewer_can_create_project: bool,
    #[serde(default)]
    pub admin_members: Vec<OrganizationMemberSummary>,
    #[serde(default)]
    pub member_members: Vec<OrganizationMemberSummary>,
    #[serde(default)]
    pub visible_projects: Vec<OrganizationProjectCard>,
    #[serde(default)]
    pub viewer_can_enroll: bool,
    #[serde(default)]
    pub enrollment_requested: bool,
    #[serde(default)]
    pub viewer_can_leave: bool,
    #[serde(default)]
    pub logo_url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationAdminView {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub viewer_can_update: bool,
    #[serde(default)]
    pub delete_allowed: bool,
    #[serde(default)]
    pub members: Vec<OrganizationAdminMember>,
    #[serde(default)]
    pub enrollment_requests: Vec<OrganizationEnrollmentRequestSummary>,
    #[serde(default)]
    pub role_options: Vec<OrganizationRoleOption>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationProjectCard {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub overview: String,
    #[serde(default)]
    pub project_scope: String,
    #[serde(default)]
    pub created_label: String,
    #[serde(default)]
    pub is_watching: bool,
    #[serde(default)]
    pub last_pushed_label: String,
    #[serde(default)]
    pub member_count: u32,
    #[serde(default)]
    pub origin_owner_name: String,
    #[serde(default)]
    pub origin_project_name: String,
    #[serde(default)]
    pub watch_count: u32,
    #[serde(default)]
    pub logo_url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationMemberSummary {
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub user_label: String,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub avatar_url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationEnrollmentRequestSummary {
    #[serde(default)]
    pub user_id: i64,
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub user_label: String,
    #[serde(default)]
    pub avatar_url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationRoleOption {
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub label: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationMember {
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub user_label: String,
    #[serde(default)]
    pub role: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationAdminMember {
    #[serde(default)]
    pub user_id: i64,
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub user_label: String,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub avatar_url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectContainer {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub overview: String,
    #[serde(default)]
    pub project_scope: String,
    #[serde(default)]
    pub vcs: String,
    #[serde(default)]
    pub is_forked: bool,
    #[serde(default)]
    pub origin_owner_name: String,
    #[serde(default)]
    pub origin_project_name: String,
    #[serde(default)]
    pub logo_url: String,
    #[serde(default)]
    pub background_url: String,
    #[serde(default)]
    pub viewer_can_update: bool,
    #[serde(default)]
    pub viewer_can_enroll: bool,
    #[serde(default)]
    pub enrollment_requested: bool,
    #[serde(default)]
    pub is_favorited: bool,
    #[serde(default)]
    pub viewer_can_watch: bool,
    #[serde(default)]
    pub viewer_can_leave: bool,
    #[serde(default)]
    pub viewer_user_id: i64,
    #[serde(default)]
    pub is_watching: bool,
    #[serde(default)]
    pub watch_count: u32,
    #[serde(default)]
    pub clone_url: String,
    #[serde(default)]
    pub overview_editable: bool,
    #[serde(default)]
    pub show_code: bool,
    #[serde(default)]
    pub code_member_only: bool,
    #[serde(default)]
    pub show_issue: bool,
    #[serde(default)]
    pub show_pull_request: bool,
    #[serde(default)]
    pub show_review: bool,
    #[serde(default)]
    pub show_milestone: bool,
    #[serde(default)]
    pub show_board: bool,
    #[serde(default)]
    pub show_admin: bool,
    #[serde(default)]
    pub open_issue_count: u32,
    #[serde(default)]
    pub open_pull_request_count: u32,
    #[serde(default)]
    pub review_count: u32,
    #[serde(default)]
    pub board_count: u32,
    #[serde(default)]
    pub member_count: u32,
    #[serde(default)]
    pub members: Vec<ProjectMemberSummary>,
    #[serde(default)]
    pub current_milestone: Option<ProjectMilestoneSummary>,
    #[serde(default)]
    pub default_tab: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDetail {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub overview: String,
    #[serde(default)]
    pub project_scope: String,
    #[serde(default)]
    pub viewer_can_update: bool,
    #[serde(default)]
    pub viewer_can_enroll: bool,
    #[serde(default)]
    pub enrollment_requested: bool,
    #[serde(default)]
    pub is_favorited: bool,
    #[serde(default)]
    pub logo_url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIssueListItem {
    #[serde(default)]
    pub issue_number: i64,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub author_label: String,
    #[serde(default)]
    pub updated_label: String,
    #[serde(default)]
    pub comment_count: u32,
    #[serde(default)]
    pub assignee_label: String,
    #[serde(default)]
    pub milestone_id: i64,
    #[serde(default)]
    pub milestone_title: String,
    #[serde(default)]
    pub voter_count: u32,
    #[serde(default)]
    pub watcher_count: u32,
    #[serde(default)]
    pub labels: Vec<IssueLabel>,
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMemberSummary {
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub user_label: String,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub avatar_url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMilestoneSummary {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub due_date_label: String,
    #[serde(default)]
    pub open_issue_count: u32,
    #[serde(default)]
    pub closed_issue_count: u32,
    #[serde(default)]
    pub completion_percent: u32,
    #[serde(default)]
    pub id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueLabel {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub category_id: i64,
    #[serde(default)]
    pub category_name: String,
    #[serde(default)]
    pub category_is_exclusive: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueLabelCategory {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub is_exclusive: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationIssueListItem {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub author_label: String,
    #[serde(default)]
    pub updated_label: String,
    #[serde(default)]
    pub comment_count: u32,
    #[serde(default)]
    pub assignee_label: String,
    #[serde(default)]
    pub milestone_id: i64,
    #[serde(default)]
    pub milestone_title: String,
    #[serde(default)]
    pub voter_count: u32,
    #[serde(default)]
    pub watcher_count: u32,
    #[serde(default)]
    pub labels: Vec<IssueLabel>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueReferenceMetadata {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub title: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MentionReferenceMetadata {
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub label: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceIssueItem {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub author_label: String,
    #[serde(default)]
    pub author_login_id: String,
    #[serde(default)]
    pub assignee_label: String,
    #[serde(default)]
    pub assignee_login_id: String,
    #[serde(default)]
    pub updated_label: String,
    #[serde(default)]
    pub comment_count: u32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueAttachment {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub mime_type: String,
    #[serde(default)]
    pub size: i64,
    #[serde(default)]
    pub url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMemberProjectItem {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub logo_url: String,
    #[serde(default)]
    pub overview: String,
    #[serde(default)]
    pub project_scope: String,
    #[serde(default)]
    pub created_label: String,
    #[serde(default)]
    pub is_watching: bool,
    #[serde(default)]
    pub last_pushed_label: String,
    #[serde(default)]
    pub member_count: u32,
    #[serde(default)]
    pub origin_owner_name: String,
    #[serde(default)]
    pub origin_project_name: String,
    #[serde(default)]
    pub viewer_can_leave: bool,
    #[serde(default)]
    pub viewer_can_watch: bool,
    #[serde(default)]
    pub watch_count: u32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceProfile {
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub english_name: String,
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub primary_email_address: String,
    #[serde(default)]
    pub is_site_admin: bool,
    #[serde(default)]
    pub is_blocked: bool,
    #[serde(default)]
    pub since_label: String,
    #[serde(default)]
    pub connected_social_providers: Vec<String>,
    #[serde(default)]
    pub avatar_url: String,
    #[serde(default)]
    pub is_guest: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePullRequestItem {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub pull_request_number: i64,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub contributor_label: String,
    #[serde(default)]
    pub contributor_login_id: String,
    #[serde(default)]
    pub receiver_label: String,
    #[serde(default)]
    pub receiver_login_id: String,
    #[serde(default)]
    pub updated_label: String,
    #[serde(default)]
    pub comment_count: u32,
}

// Additional response types
#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectsResponse {
    #[serde(default)]
    pub items: Vec<ProjectListItem>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectListItem {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub overview: String,
    #[serde(default)]
    pub project_scope: String,
    #[serde(default)]
    pub created_label: String,
    #[serde(default)]
    pub last_pushed_label: String,
    #[serde(default)]
    pub is_favorited: bool,
    #[serde(default)]
    pub is_watching: bool,
    #[serde(default)]
    pub member_count: u32,
    #[serde(default)]
    pub watch_count: u32,
    #[serde(default)]
    pub logo_url: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListOrganizationsResponse {
    #[serde(default)]
    pub items: Vec<OrganizationListItem>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationListItem {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub created_label: String,
    #[serde(default)]
    pub is_enrolled: bool,
    #[serde(default)]
    pub logo_url: String,
}

// ============================================================================
// Request types (used as input parameters via rest_owned_view)
// ============================================================================

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptOrganizationEnrollmentRequest {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub user_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddOrganizationMemberRequest {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub login_id: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddWorkspaceEmailRequest {
    #[serde(default)]
    pub email: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignIssueRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
    #[serde(default)]
    pub assignee_login_id: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelEnrollOrganizationRequest {
    #[serde(default)]
    pub organization_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelEnrollProjectRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordRequest {
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub old_password: String,
    #[serde(default)]
    pub password: String,
    #[serde(default)]
    pub retyped_password: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOrganizationRequest {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub description: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectLabelCategoryRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub category_name: String,
    #[serde(default)]
    pub category_is_exclusive: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectLabelRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub label_name: String,
    #[serde(default)]
    pub label_color: String,
    #[serde(default)]
    pub category_name: String,
    #[serde(default)]
    pub category_is_exclusive: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectMilestoneRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub contents_markdown: String,
    #[serde(default)]
    pub due_date: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub attachment_ids: Vec<i64>,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub overview: String,
    #[serde(default)]
    pub project_scope: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteOrganizationMemberRequest {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub user_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteOrganizationRequest {
    #[serde(default)]
    pub organization_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteProjectLabelCategoryRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub category_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteProjectLabelRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub label_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteProjectMilestoneRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub milestone_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteWorkspaceEmailRequest {
    #[serde(default)]
    pub id: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnrollOrganizationRequest {
    #[serde(default)]
    pub organization_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnrollProjectRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueCommentParticipationRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
    #[serde(default)]
    pub comment_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueParticipationRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueShareRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
    #[serde(default)]
    pub login_id: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaveOrganizationRequest {
    #[serde(default)]
    pub organization_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListOrganizationsRequest {
    // Empty request
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectLabelsRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectMilestonesRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub order_by: String,
    #[serde(default)]
    pub order_dir: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectsRequest {
    // Empty request
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MilestoneStateMutationRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub milestone_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadAuthUiCapabilitiesRequest {
    // Empty request
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadOrganizationAdminRequest {
    #[serde(default)]
    pub organization_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadOrganizationContainerRequest {
    #[serde(default)]
    pub organization_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadOrganizationDetailRequest {
    #[serde(default)]
    pub organization_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadOrganizationMembersRequest {
    #[serde(default)]
    pub organization_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadOrganizationSettingsRequest {
    #[serde(default)]
    pub organization_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadProjectContainerRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadProjectDetailRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadProjectMilestoneRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub milestone_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadProjectSettingsRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadWorkspaceOverviewRequest {
    // Empty request
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordRecentProjectVisitRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterWithPasswordRequest {
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub email_address: String,
    #[serde(default)]
    pub password: String,
    #[serde(default)]
    pub retyped_password: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetApiTokenRequest {
    // Empty request
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetVisitedProjectsRequest {
    // Empty request
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendWorkspaceEmailValidationRequest {
    #[serde(default)]
    pub id: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetDefaultLandingPathRequest {
    #[serde(default)]
    pub path: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetMainWorkspaceEmailRequest {
    #[serde(default)]
    pub id: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignInWithPasswordRequest {
    #[serde(default)]
    pub identifier: String,
    #[serde(default)]
    pub password: String,
    #[serde(default)]
    pub remember_me: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleFavoriteProjectRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleProjectWatchRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub watching: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleWorkspaceNotificationRequest {
    #[serde(default)]
    pub project_id: String,
    #[serde(default)]
    pub event_type: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOrganizationMemberRoleRequest {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub user_id: i64,
    #[serde(default)]
    pub role: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOrganizationRequest {
    #[serde(default)]
    pub current_organization_name: String,
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub logo_attachment_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileRequest {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub avatar_attachment_id: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectLabelCategoryRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub category_id: i64,
    #[serde(default)]
    pub category_name: String,
    #[serde(default)]
    pub category_is_exclusive: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectLabelRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub label_id: i64,
    #[serde(default)]
    pub label_name: String,
    #[serde(default)]
    pub label_color: String,
    #[serde(default)]
    pub category_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectMilestoneRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub milestone_id: i64,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub contents_markdown: String,
    #[serde(default)]
    pub due_date: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub attachment_ids: Vec<i64>,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectOverviewRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub overview: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectRequest {
    #[serde(default)]
    pub current_owner_name: String,
    #[serde(default)]
    pub current_project_name: String,
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub overview: String,
    #[serde(default)]
    pub project_scope: String,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyUserRequest {
    #[serde(default)]
    pub login_id: String,
    #[serde(default)]
    pub verification_code: String,
}

// Additional request/response types from star imports
#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectIssuesRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub assignee_login_id: String,
    #[serde(default)]
    pub author_login_id: String,
    #[serde(default)]
    pub label_ids: Vec<i64>,
    #[serde(default)]
    pub milestone_id: i64,
    #[serde(default)]
    pub page_num: u32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectIssuesResponse {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub items: Vec<ProjectIssueListItem>,
    #[serde(default)]
    pub page_num: u32,
    #[serde(default)]
    pub page_size: u32,
    #[serde(default)]
    pub total_count: u32,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListOrganizationIssuesRequest {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub page_num: u32,
    #[serde(default)]
    pub items_per_page: u32,
    #[serde(default)]
    pub project_names: Vec<String>,
    #[serde(default)]
    pub filter: String,
    #[serde(default)]
    pub order_by: String,
    #[serde(default)]
    pub order_dir: String,
    #[serde(default)]
    pub author_id: i64,
    #[serde(default)]
    pub assignee_id: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListOrganizationIssuesResponse {
    #[serde(default)]
    pub organization_name: String,
    #[serde(default)]
    pub visible_projects: Vec<OrganizationIssueProjectOption>,
    #[serde(default)]
    pub items: Vec<OrganizationIssueListItem>,
    #[serde(default)]
    pub page_num: u32,
    #[serde(default)]
    pub page_size: u32,
    #[serde(default)]
    pub total_count: u32,
    #[serde(default)]
    pub open_issue_count: u32,
    #[serde(default)]
    pub closed_issue_count: u32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationIssueProjectOption {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_count: u32,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListUserIssuesRequest {
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub filter: String,
    #[serde(default)]
    pub query: String,
    #[serde(default)]
    pub order_by: String,
    #[serde(default)]
    pub order_dir: String,
    #[serde(default)]
    pub page_num: u32,
    #[serde(default)]
    pub page_size: u32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListUserIssuesResponse {
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub filter: String,
    #[serde(default)]
    pub items: Vec<WorkspaceIssueItem>,
    #[serde(default)]
    pub page_num: u32,
    #[serde(default)]
    pub page_size: u32,
    #[serde(default)]
    pub total_count: u32,
    #[serde(default)]
    pub open_issue_count: u32,
    #[serde(default)]
    pub closed_issue_count: u32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadWorkspaceOverviewResponse {
    #[serde(default)]
    pub session: Option<ReadCurrentSessionResponse>,
    #[serde(default)]
    pub default_landing_path: String,
    #[serde(default)]
    pub favorite_projects: Vec<WorkspaceMemberProjectItem>,
    #[serde(default)]
    pub recent_projects: Vec<WorkspaceMemberProjectItem>,
    #[serde(default)]
    pub watched_projects: Vec<WatchedProjectNotifications>,
    #[serde(default)]
    pub emails: Vec<WorkspaceEmail>,
    #[serde(default)]
    pub api_token: String,
    #[serde(default)]
    pub profile: Option<WorkspaceProfile>,
    #[serde(default)]
    pub issue_items: Vec<WorkspaceIssueItem>,
    #[serde(default)]
    pub pull_request_items: Vec<WorkspacePullRequestItem>,
    #[serde(default)]
    pub member_projects: Vec<WorkspaceMemberProjectItem>,
    #[serde(default)]
    pub days_ago: u32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceNotificationPreference {
    #[serde(default)]
    pub event_type: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub enabled: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchedProjectNotifications {
    #[serde(default)]
    pub project_id: String,
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub notifications: Vec<WorkspaceNotificationPreference>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceEmail {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub email_address: String,
    #[serde(default)]
    pub valid: bool,
}

// Additional response types that are referenced
#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadIssueDetailRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadIssueDetailResponse {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub body_markdown: String,
    #[serde(default)]
    pub body_html: String,
    #[serde(default)]
    pub author_login_id: String,
    #[serde(default)]
    pub author_label: String,
    #[serde(default)]
    pub assignee_login_id: String,
    #[serde(default)]
    pub assignee_label: String,
    #[serde(default)]
    pub milestone_id: i64,
    #[serde(default)]
    pub milestone_title: String,
    #[serde(default)]
    pub labels: Vec<IssueLabel>,
    #[serde(default)]
    pub comment_count: u32,
    #[serde(default)]
    pub voter_count: u32,
    #[serde(default)]
    pub watcher_count: u32,
    #[serde(default)]
    pub is_watching: bool,
    #[serde(default)]
    pub has_voted: bool,
    #[serde(default)]
    pub viewer_can_update: bool,
    #[serde(default)]
    pub viewer_can_delete: bool,
    #[serde(default)]
    pub viewer_can_comment: bool,
    #[serde(default)]
    pub attachments: Vec<IssueAttachment>,
    #[serde(default)]
    pub viewer_is_direct_sharer: bool,
    #[serde(default)]
    pub viewer_has_inherited_share: bool,
    #[serde(default)]
    pub viewer_can_manage_sharers: bool,
    #[serde(default)]
    pub is_favorited: bool,
    #[serde(default)]
    pub author_avatar_url: String,
    #[serde(default)]
    pub assignee_avatar_url: String,
    #[serde(default)]
    pub issue_references: Vec<IssueReferenceMetadata>,
    #[serde(default)]
    pub mention_references: Vec<MentionReferenceMetadata>,
    #[serde(default)]
    pub comments: Vec<IssueComment>,
    #[serde(default)]
    pub timeline: Vec<IssueTimelineItem>,
    #[serde(default)]
    pub sharers: Vec<IssueSharer>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectLabelsResponse {
    #[serde(default)]
    pub labels: Vec<IssueLabel>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectLabelCategoriesResponse {
    #[serde(default)]
    pub categories: Vec<IssueLabelCategory>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectLabelMutationResponse {
    #[serde(default)]
    pub created: bool,
    #[serde(default)]
    pub label: Option<IssueLabel>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectLabelCategoryMutationResponse {
    #[serde(default)]
    pub created: bool,
    #[serde(default)]
    pub category: Option<IssueLabelCategory>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectLabelDeleteResponse {
    #[serde(default)]
    pub ok: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectMilestonesResponse {
    #[serde(default)]
    pub milestones: Vec<ProjectMilestoneSummary>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMilestoneMutationResponse {
    #[serde(default)]
    pub milestone: Option<ProjectMilestoneSummary>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMilestoneDeleteResponse {
    #[serde(default)]
    pub ok: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyUserResponse {
    #[serde(default)]
    pub login_id: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleFavoriteProjectResponse {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub favorited: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordRecentProjectVisitResponse {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnrollmentMutationResult {
    #[serde(default)]
    pub ok: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationRedirectResult {
    #[serde(default)]
    pub ok: bool,
    #[serde(default)]
    pub redirect_path: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadOrganizationMembersResponse {
    #[serde(default)]
    pub members: Vec<OrganizationMember>,
    #[serde(default)]
    pub enrollment_requests: Vec<OrganizationEnrollmentRequest>,
}

#[derive(Clone, Debug, Default, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIssueStateRequest {
    #[serde(default)]
    pub owner_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub issue_number: i64,
    #[serde(default)]
    pub state: String,
}
