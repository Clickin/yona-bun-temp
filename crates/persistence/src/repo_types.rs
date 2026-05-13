use sea_orm::entity::prelude::DateTime;
use serde::Serialize;
use yona_rust_search::SearchSnippet;

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
    pub is_favorited: bool,
    pub is_watching: bool,
    pub has_voted: bool,
    pub labels: Vec<IssueLabelRecord>,
    pub sharers: Vec<IssueSharerRecord>,
    pub comments: Vec<IssueCommentRecord>,
    pub timeline: Vec<IssueTimelineItemRecord>,
    pub attachments: Vec<IssueAttachmentRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PostingRecord {
    pub attachments: Vec<IssueAttachmentRecord>,
    pub author_id: Option<i64>,
    pub author_label: String,
    pub author_login_id: String,
    pub body_markdown: String,
    pub comment_count: u32,
    pub comments: Vec<PostingCommentRecord>,
    pub created_label: String,
    pub id: i64,
    pub is_watching: bool,
    pub labels: Vec<IssueLabelRecord>,
    pub notice: bool,
    pub owner_name: String,
    pub post_number: i64,
    pub project_name: String,
    pub readme: bool,
    pub title: String,
    pub updated_label: String,
    pub watcher_count: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PostingCommentRecord {
    pub attachments: Vec<IssueAttachmentRecord>,
    pub author_id: Option<i64>,
    pub author_label: String,
    pub author_login_id: String,
    pub contents_markdown: String,
    pub created_label: String,
    pub id: i64,
    pub parent_comment_id: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueSharerRecord {
    pub user_id: i64,
    pub login_id: String,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueAssignableUserRecord {
    pub avatar_url: String,
    pub display_name: String,
    pub item_type: String,
    pub login_id: String,
    pub pure_name_only: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueAssignableUserSearchRecord {
    pub items: Vec<IssueAssignableUserRecord>,
    pub total: u32,
    pub truncated: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueMentionUserRecord {
    pub avatar_url: String,
    pub display_name: String,
    pub login_id: String,
    pub search_text: String,
    pub item_type: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueMentionUserSearchRecord {
    pub items: Vec<IssueMentionUserRecord>,
    pub total: u32,
    pub truncated: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectIssueReferenceRecord {
    pub issue_number: i64,
    pub state: String,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectIssueReferenceSearchRecord {
    pub items: Vec<ProjectIssueReferenceRecord>,
    pub total: u32,
    pub truncated: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NotificationActorRecord {
    pub avatar_url: String,
    pub display_name: String,
    pub login_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NotificationItemRecord {
    pub actor: NotificationActorRecord,
    pub created: Option<DateTime>,
    pub event_type: String,
    pub id: i64,
    pub message: String,
    pub target_path: String,
    pub target_title: String,
    pub type_icon: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NotificationListRecord {
    pub has_more: bool,
    pub items: Vec<NotificationItemRecord>,
    pub total: u32,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct MentionSyncResult {
    pub mentioned_user_ids: Vec<i64>,
    pub newly_mentioned_user_ids: Vec<i64>,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct IssueShareStatus {
    pub direct: bool,
    pub inherited_from_parent: bool,
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
pub struct ProjectPostingListItemRecord {
    pub author_label: String,
    pub author_login_id: String,
    pub comment_count: u32,
    pub created_label: String,
    pub labels: Vec<IssueLabelRecord>,
    pub notice: bool,
    pub owner_name: String,
    pub post_number: i64,
    pub project_name: String,
    pub readme: bool,
    pub title: String,
    pub updated_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectPostingListRecord {
    pub items: Vec<ProjectPostingListItemRecord>,
    pub notices: Vec<ProjectPostingListItemRecord>,
    pub page_num: u32,
    pub page_size: u32,
    pub readme: Option<PostingRecord>,
    pub total_count: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationIssueProjectOptionRecord {
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationPostingProjectOptionRecord {
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationPostingListRecord {
    pub items: Vec<ProjectPostingListItemRecord>,
    pub notices: Vec<ProjectPostingListItemRecord>,
    pub organization_name: String,
    pub page_num: u32,
    pub page_size: u32,
    pub total_count: u32,
    pub visible_projects: Vec<OrganizationPostingProjectOptionRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationIssueListRecord {
    pub closed_issue_count: u32,
    pub items: Vec<ProjectIssueListItemRecord>,
    pub organization_name: String,
    pub open_issue_count: u32,
    pub page_num: u32,
    pub page_size: u32,
    pub total_count: u32,
    pub visible_projects: Vec<OrganizationIssueProjectOptionRecord>,
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
pub struct OrganizationIssueListFilter {
    pub assignee_user_id: Option<i64>,
    pub author_id: Option<i64>,
    pub filter: Option<String>,
    pub items_per_page: u32,
    pub order_by: String,
    pub order_dir: String,
    pub page_num: u32,
    pub project_names: Vec<String>,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PostingListFilter {
    pub filter: Option<String>,
    pub label_ids: Vec<i64>,
    pub order_by: String,
    pub order_dir: String,
    pub page_num: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationPostingListFilter {
    pub filter: Option<String>,
    pub order_by: String,
    pub order_dir: String,
    pub page_num: u32,
    pub project_names: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UserIssueListFilter {
    pub filter: String,
    pub order_by: String,
    pub order_dir: String,
    pub page_num: u32,
    pub page_size: u32,
    pub query: Option<String>,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UserIssueCandidateRecord {
    pub issue_id: i64,
    pub item: ProjectIssueListItemRecord,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UserIssueListRecord {
    pub closed_issue_count: u32,
    pub filter: String,
    pub items: Vec<ProjectIssueListItemRecord>,
    pub open_issue_count: u32,
    pub page_num: u32,
    pub page_size: u32,
    pub state: String,
    pub total_count: u32,
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
    pub attachments: Vec<IssueAttachmentRecord>,
    pub closed_issue_count: u32,
    pub completion_percent: u32,
    pub contents_markdown: String,
    pub due_date_label: String,
    pub id: i64,
    pub open_issues: Vec<ProjectIssueListItemRecord>,
    pub open_issue_count: u32,
    pub closed_issues: Vec<ProjectIssueListItemRecord>,
    pub state: String,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MilestoneListFilter {
    pub order_by: String,
    pub order_dir: String,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MilestoneMutationInput {
    pub attachment_ids: Vec<i64>,
    pub contents_markdown: String,
    pub due_date: Option<DateTime>,
    pub owner_name: String,
    pub project_name: String,
    pub state: String,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdateMilestoneInput {
    pub milestone_id: i64,
    pub values: MilestoneMutationInput,
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
    pub viewer_has_voted: bool,
    pub voter_count: u32,
    pub voters: Vec<IssueCommentVoterRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueCommentVoterRecord {
    pub email_address: String,
    pub login_id: String,
    pub user_id: i64,
    pub user_label: String,
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
    pub actor_id: i64,
    pub attachment_ids: Vec<i64>,
    pub comment_id: i64,
    pub contents_markdown: String,
    pub issue_number: i64,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PostingMutationInput {
    pub attachment_ids: Vec<i64>,
    pub body_markdown: String,
    pub label_ids: Vec<i64>,
    pub notice: bool,
    pub readme: bool,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreatePostingInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub values: PostingMutationInput,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdatePostingInput {
    pub actor_id: i64,
    pub actor_login_id: String,
    pub owner_name: String,
    pub post_number: i64,
    pub project_name: String,
    pub values: PostingMutationInput,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreatePostingCommentInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub attachment_ids: Vec<i64>,
    pub contents_markdown: String,
    pub owner_name: String,
    pub post_number: i64,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdatePostingCommentInput {
    pub actor_id: i64,
    pub attachment_ids: Vec<i64>,
    pub comment_id: i64,
    pub contents_markdown: String,
    pub owner_name: String,
    pub post_number: i64,
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
pub struct ProjectWatcherRecord {
    pub email_address: String,
    pub login_id: String,
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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SearchScope {
    Global,
    Organization,
    Project,
}

impl SearchScope {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Global => "global",
            Self::Organization => "organization",
            Self::Project => "project",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SearchRepositoryInput {
    pub actor_id: Option<i64>,
    pub keyword: String,
    pub organization_name: Option<String>,
    pub owner_name: Option<String>,
    pub page_num: u32,
    pub project_name: Option<String>,
    pub requested_search_type: String,
    pub search_type: String,
    pub scope: SearchScope,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchCountsRecord {
    pub issues: u32,
    pub users: u32,
    pub projects: u32,
    pub posts: u32,
    pub milestones: u32,
    pub issue_comments: u32,
    pub post_comments: u32,
    pub reviews: u32,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchContextRecord {
    pub organization_name: String,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchItemRecord {
    pub author_label: String,
    pub author_login_id: String,
    pub created_label: String,
    pub href: String,
    pub id: String,
    pub number: String,
    pub owner_name: String,
    pub project_name: String,
    pub snippets: Vec<SearchSnippet>,
    pub state: String,
    pub title: String,
    pub r#type: String,
    pub updated_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultRecord {
    pub context: SearchContextRecord,
    pub counts: SearchCountsRecord,
    pub items: Vec<SearchItemRecord>,
    pub keyword: String,
    pub page_num: u32,
    pub page_size: u32,
    pub requested_search_type: String,
    pub scope: String,
    pub search_type: String,
    pub total_count: u32,
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
pub struct PullRequestListFilter {
    pub category: String,
    pub contributor_id: Option<i64>,
    pub filter: Option<String>,
    pub page_num: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestListItemRecord {
    pub comment_thread_count: u32,
    pub conflict: bool,
    pub contributor_label: String,
    pub contributor_login_id: String,
    pub created_label: String,
    pub from_branch: String,
    pub from_owner_name: String,
    pub from_project_name: String,
    pub id: i64,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
    pub receiver_label: String,
    pub receiver_login_id: String,
    pub reviewer_count: u32,
    pub state: String,
    pub title: String,
    pub to_branch: String,
    pub updated_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BranchPullRequestRecord {
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestListRecord {
    pub category: String,
    pub items: Vec<PullRequestListItemRecord>,
    pub page_num: u32,
    pub page_size: u32,
    pub total_count: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestMutationInput {
    pub attachment_ids: Vec<i64>,
    pub body_markdown: String,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreatePullRequestInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub from_branch: String,
    pub from_project_id: i64,
    pub to_branch: String,
    pub to_project_id: i64,
    pub values: PullRequestMutationInput,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdatePullRequestInput {
    pub actor_id: i64,
    pub actor_login_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
    pub values: PullRequestMutationInput,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CreatePullRequestResult {
    Created(PullRequestDetailRecord),
    Duplicate(PullRequestDetailRecord),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestStateInput {
    pub actor_id: i64,
    pub actor_login_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestReviewInput {
    pub actor_id: i64,
    pub actor_login_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
    pub reviewed: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreatePullRequestCommentInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub attachment_ids: Vec<i64>,
    pub commit_id: Option<String>,
    pub contents_markdown: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
    pub thread_id: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestThreadStateInput {
    pub actor_id: i64,
    pub actor_login_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
    pub state: String,
    pub thread_id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateCommitDiscussionCommentInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub attachment_ids: Vec<i64>,
    pub commit_id: String,
    pub contents_markdown: String,
    pub end_line: Option<i32>,
    pub owner_name: String,
    pub path: Option<String>,
    pub project_name: String,
    pub start_line: Option<i32>,
    pub thread_id: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CommitDiscussionThreadStateInput {
    pub actor_id: i64,
    pub actor_login_id: String,
    pub commit_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub state: String,
    pub thread_id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DeleteCommitDiscussionCommentInput {
    pub actor_id: i64,
    pub comment_id: i64,
    pub commit_id: String,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestUserRecord {
    pub login_id: String,
    pub user_id: i64,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestEventRecord {
    pub created_label: String,
    pub event_type: String,
    pub id: i64,
    pub new_value: String,
    pub old_value: String,
    pub sender_login_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReviewCommentRecord {
    pub author_id: Option<i64>,
    pub author_label: String,
    pub author_login_id: String,
    pub contents_markdown: String,
    pub created_label: String,
    pub id: i64,
    pub thread_id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReviewThreadRecord {
    pub author_id: Option<i64>,
    pub author_label: String,
    pub author_login_id: String,
    pub comments: Vec<ReviewCommentRecord>,
    pub commit_id: String,
    pub created_label: String,
    pub end_line: Option<i32>,
    pub id: i64,
    pub path: String,
    pub prev_commit_id: String,
    pub start_line: Option<i32>,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestCommitRecord {
    pub author_date_label: String,
    pub author_email: String,
    pub commit_id: String,
    pub commit_message: String,
    pub commit_short_id: String,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestDetailRecord {
    pub body_markdown: String,
    pub commits: Vec<PullRequestCommitRecord>,
    pub conflict: bool,
    pub contributor: PullRequestUserRecord,
    pub created_label: String,
    pub events: Vec<PullRequestEventRecord>,
    pub from_branch: String,
    pub from_owner_name: String,
    pub from_project_name: String,
    pub id: i64,
    pub is_watching: bool,
    pub merged_commit_id_from: String,
    pub merged_commit_id_to: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
    pub receiver: PullRequestUserRecord,
    pub reviewers: Vec<PullRequestUserRecord>,
    pub state: String,
    pub threads: Vec<ReviewThreadRecord>,
    pub title: String,
    pub to_branch: String,
    pub updated_label: String,
    pub watcher_count: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReviewThreadListFilter {
    pub author_id: Option<i64>,
    pub filter: Option<String>,
    pub order_by: String,
    pub order_dir: String,
    pub page_num: u32,
    pub participant_id: Option<i64>,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReviewThreadListRecord {
    pub closed_count: u32,
    pub items: Vec<ReviewThreadRecord>,
    pub open_count: u32,
    pub page_num: u32,
    pub page_size: u32,
    pub state: String,
    pub total_count: u32,
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

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ToggleFavoriteIssueResult {
    pub favorited: bool,
    pub issue_id: i64,
}

pub type AppUserInput = CreateUserInput;
