use sea_orm::entity::prelude::DateTime;
use serde::Serialize;
use yona_rust_search::SearchSnippet;

mod legacy_external;

pub use legacy_external::*;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AppUserRecord {
    pub id: i64,
    pub display_name: String,
    pub email_address: String,
    pub is_confirmed: bool,
    pub is_guest: bool,
    pub is_site_admin: bool,
    pub login_id: String,
    pub password_hash: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SiteUserListFilter {
    pub page: u32,
    pub query: String,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SiteUserRecord {
    pub created_at: Option<DateTime>,
    pub display_name: String,
    pub email_address: String,
    pub id: i64,
    pub is_guest: bool,
    pub is_site_admin: bool,
    pub last_state_modified_at: Option<DateTime>,
    pub login_id: String,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SiteUserListRecord {
    pub page: u32,
    pub page_size: u32,
    pub query: String,
    pub site_admin_count: u32,
    pub state: String,
    pub total: u32,
    pub total_pages: u32,
    pub users: Vec<SiteUserRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SiteNoAvatarUserRecord {
    pub email: String,
    pub login_id: String,
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AttachmentProjectResourceRecord {
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SiteUserDeleteResult {
    Deleted(SiteUserRecord),
    NotFound,
    OnlyManager,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SiteUserAvatarFromAttachmentResult {
    Applied,
    AttachmentNotFound,
    Ignored,
    UserNotFound,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueRecord {
    pub assignee_email_address: String,
    pub assignee_label: String,
    pub assignee_login_id: String,
    pub author_email_address: String,
    pub author_id: Option<i64>,
    pub author_label: String,
    pub author_login_id: String,
    pub body_markdown: String,
    pub comment_count: u32,
    pub due_date_label: String,
    pub id: i64,
    pub issue_number: i64,
    pub is_draft: bool,
    pub milestone_id: Option<i64>,
    pub milestone_title: String,
    pub owner_name: String,
    pub project_name: String,
    pub state: String,
    pub title: String,
    pub updated_label: String,
    pub voter_count: u32,
    pub voters: Vec<IssueVoterRecord>,
    pub watcher_count: u32,
    pub weight: i16,
    pub is_favorited: bool,
    pub is_watching: bool,
    pub has_voted: bool,
    pub labels: Vec<IssueLabelRecord>,
    pub parent_issue_id: Option<i64>,
    pub parent_issue_number: Option<i64>,
    pub parent_issue_state: String,
    pub parent_issue_title: String,
    pub child_issues: Vec<IssueChildRecord>,
    pub child_open_count: u32,
    pub child_closed_count: u32,
    pub sharers: Vec<IssueSharerRecord>,
    pub comments: Vec<IssueCommentRecord>,
    pub history_markdown: String,
    pub timeline: Vec<IssueTimelineItemRecord>,
    pub attachments: Vec<IssueAttachmentRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueChildRecord {
    pub assignee_label: String,
    pub comment_count: u32,
    pub created_label: String,
    pub is_draft: bool,
    pub issue_number: i64,
    pub labels: Vec<IssueLabelRecord>,
    pub state: String,
    pub title: String,
    pub voter_count: u32,
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
    pub created_at: Option<DateTime>,
    pub created_label: String,
    pub id: i64,
    pub history_markdown: String,
    pub is_watching: bool,
    pub labels: Vec<IssueLabelRecord>,
    pub notice: bool,
    pub owner_name: String,
    pub post_number: i64,
    pub project_name: String,
    pub readme: bool,
    pub title: String,
    pub updated_at: Option<DateTime>,
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
    pub created_at: Option<DateTime>,
    pub created_label: String,
    pub id: i64,
    pub parent_comment_id: Option<i64>,
    pub via_email: bool,
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
    pub reply_resource_id: String,
    pub reply_resource_type: String,
    pub resource_id: String,
    pub resource_type: String,
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

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NotificationMailDeliveryRecord {
    pub item: NotificationItemRecord,
    pub recipient_email: String,
    pub recipient_language: String,
    pub recipient_login_id: String,
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
    pub author_email_address: String,
    pub author_label: String,
    pub author_login_id: String,
    pub assignee_login_id: String,
    pub comment_count: u32,
    pub created_label: String,
    pub created_title: String,
    pub child_closed_count: u32,
    pub child_issues: Vec<IssueChildRecord>,
    pub child_open_count: u32,
    pub id: i64,
    pub is_draft: bool,
    pub issue_number: i64,
    pub owner_name: String,
    pub parent_issue_number: Option<i64>,
    pub parent_issue_title: String,
    pub project_id: i64,
    pub project_name: String,
    pub state: String,
    pub title: String,
    pub updated_label: String,
    pub assignee_label: String,
    pub assignee_email_address: String,
    pub milestone_id: Option<i64>,
    pub milestone_title: String,
    pub due_date_label: String,
    pub due_date_overdue: bool,
    pub voter_count: u32,
    pub watcher_count: u32,
    pub weight: i16,
    pub labels: Vec<IssueLabelRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectIssueListRecord {
    pub draft_items: Vec<ProjectIssueListItemRecord>,
    pub items: Vec<ProjectIssueListItemRecord>,
    pub page_num: u32,
    pub page_size: u32,
    pub total_count: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectIssueParentOptionRecord {
    pub id: i64,
    pub issue_number: i64,
    pub selected: bool,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectPostingListItemRecord {
    pub author_email_address: String,
    pub author_label: String,
    pub author_login_id: String,
    pub comment_count: u32,
    pub created_label: String,
    pub created_title: String,
    pub labels: Vec<IssueLabelRecord>,
    pub notice: bool,
    pub owner_name: String,
    pub post_number: i64,
    pub project_id: i64,
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
pub struct SitePostingListRecord {
    pub page: u32,
    pub page_size: u32,
    pub posts: Vec<ProjectPostingListItemRecord>,
    pub total: u32,
    pub total_pages: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SiteIssueListRecord {
    pub issues: Vec<ProjectIssueListItemRecord>,
    pub page: u32,
    pub page_size: u32,
    pub state: String,
    pub total: u32,
    pub total_pages: u32,
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
    pub assignee_id: Option<i64>,
    pub assignee_login_id: Option<String>,
    pub author_login_id: Option<String>,
    pub draft_author_login_id: Option<String>,
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
    pub mention_user_id: Option<i64>,
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
pub struct ProjectDashboardLabelRecord {
    pub category_id: Option<i64>,
    pub category_is_exclusive: bool,
    pub category_name: String,
    pub color: String,
    pub id: i64,
    pub name: String,
    pub open_issue_count: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectDashboardAssigneeRecord {
    pub email_address: String,
    pub login_id: String,
    pub open_issue_count: u32,
    pub user_id: i64,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectHomeHistoryItemRecord {
    pub actor_email_address: String,
    pub actor_login_id: String,
    pub actor_name: String,
    pub created_at: Option<DateTime>,
    pub created_label: String,
    pub item_type: String,
    pub short_title: String,
    pub title: String,
    pub url_path: String,
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
pub struct CopyProjectLabelsResult {
    pub copied: u32,
    pub labels: Vec<IssueLabelRecord>,
    pub skipped: u32,
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
    pub due_date: Option<DateTime>,
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
    pub actor_id: Option<i64>,
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
    pub hash: String,
    pub id: i64,
    pub mime_type: String,
    pub name: String,
    pub size: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueCommentRecord {
    pub attachments: Vec<IssueAttachmentRecord>,
    pub author_email_address: String,
    pub author_id: Option<i64>,
    pub author_label: String,
    pub author_login_id: String,
    pub contents_markdown: String,
    pub created_label: String,
    pub id: i64,
    pub parent_comment_id: Option<i64>,
    pub via_email: bool,
    pub viewer_has_voted: bool,
    pub voter_count: u32,
    pub voters: Vec<IssueCommentVoterRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueCommentOriginRecord {
    pub author_login_id: String,
    pub comment_id: i64,
    pub contents_markdown: String,
    pub issue_number: i64,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PostingCommentOriginRecord {
    pub comment_id: i64,
    pub contents_markdown: String,
    pub owner_name: String,
    pub post_number: i64,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueCommentVoterRecord {
    pub email_address: String,
    pub login_id: String,
    pub user_id: i64,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueVoterRecord {
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
    pub due_date: Option<DateTime>,
    pub is_draft: bool,
    pub is_publish: bool,
    pub label_ids: Vec<i64>,
    pub milestone_id: Option<i64>,
    pub parent_issue_id: Option<i64>,
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
pub struct CreateIssueViaEmailInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub body_markdown: String,
    pub message_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub title: String,
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
    pub parent_comment_id: Option<i64>,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateIssueCommentViaEmailInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub contents_markdown: String,
    pub issue_number: i64,
    pub message_id: String,
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxReplyTargetRecord {
    pub resource_id: i64,
    pub resource_type: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxResourceActionRecord {
    pub action: String,
    pub owner_name: String,
    pub project_name: String,
    pub resource_id: Option<i64>,
    pub resource_type: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxActionExecutionInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub body_markdown: String,
    pub message_id: String,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxActionExecutionRecord {
    pub action: String,
    pub owner_name: String,
    pub project_name: String,
    pub resource_id: Option<i64>,
    pub resource_type: Option<String>,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxNormalizedMessageInput {
    pub body_markdown: String,
    pub from_addresses: Vec<String>,
    pub message_id: String,
    pub recipient_details: Vec<String>,
    pub reply_message_ids: Vec<String>,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxNormalizedMessageResult {
    pub actions: Vec<MailboxActionExecutionRecord>,
    pub sender_id: Option<i64>,
    pub status: String,
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
pub struct CreateLegacyExternalPostingInput {
    pub attachment_actor_id: Option<i64>,
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub created_at: Option<DateTime>,
    pub owner_name: String,
    pub post_number: Option<i64>,
    pub project_name: String,
    pub updated_at: Option<DateTime>,
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
    pub attachment_actor_id: Option<i64>,
    pub attachment_ids: Vec<i64>,
    pub contents_markdown: String,
    pub created_at: Option<DateTime>,
    pub owner_name: String,
    pub parent_comment_id: Option<i64>,
    pub post_number: i64,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreatePostingCommentViaEmailInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub contents_markdown: String,
    pub message_id: String,
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
    pub due_date: Option<DateTime>,
    pub due_date_update: bool,
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
    pub vcs: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateForkProjectInput {
    pub organization_id: Option<i64>,
    pub original_project_id: i64,
    pub owner_name: String,
    pub overview: Option<String>,
    pub project_name: String,
    pub project_scope: String,
    pub vcs: String,
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
    pub is_guest: bool,
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
    pub default_reviewer_count: u32,
    pub is_code_accessible_member_only: bool,
    pub is_using_reviewer_count: bool,
    pub last_pushed_date: Option<DateTime>,
    pub id: i64,
    pub original_project_id: Option<i64>,
    pub organization_id: Option<i64>,
    pub organization_name: Option<String>,
    pub owner_name: String,
    pub overview: Option<String>,
    pub previous_owner_name: Option<String>,
    pub previous_project_name: Option<String>,
    pub project_name: String,
    pub project_scope: String,
    pub vcs: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LegacyResourceTargetRecord {
    pub owner_name: String,
    pub project_id: i64,
    pub project_name: String,
    pub target_path: String,
    pub target_title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectViewerRecord {
    pub is_guest: bool,
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
    pub email_address: String,
    pub login_id: String,
    pub user_id: i64,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectMemberDirectoryRecord {
    pub enrollment_requests: Vec<ProjectEnrollmentRequestRecord>,
    pub members: Vec<ProjectMemberRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectWatcherRecord {
    pub email_address: String,
    pub login_id: String,
    pub user_id: i64,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectWatcherListRecord {
    pub watchers: Vec<ProjectWatcherRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LegacyExternalWatcherRecord {
    pub login_id: String,
    pub name: String,
    pub user_id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LegacyExternalWatcherListRecord {
    pub total_watchers: u32,
    pub watchers: Vec<LegacyExternalWatcherRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LegacyProjectTitleHeadRecord {
    pub frequency: i32,
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectWebhookRecord {
    pub git_push: bool,
    pub id: i64,
    pub payload_url: String,
    pub secret: String,
    pub webhook_type: i16,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectWebhookListRecord {
    pub webhooks: Vec<ProjectWebhookRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectWebhookDeliveryRecord {
    pub created_at: Option<DateTime>,
    pub error_message: Option<String>,
    pub event_type: String,
    pub id: i64,
    pub payload_url: String,
    pub request_body: String,
    pub response_body: Option<String>,
    pub status: String,
    pub webhook_id: i64,
    pub webhook_type: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateWebhookDeliveryInput {
    pub error_message: Option<String>,
    pub event_type: String,
    pub payload_url: String,
    pub request_body: String,
    pub response_body: Option<String>,
    pub status: String,
    pub webhook_id: i64,
    pub webhook_type: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WebhookThreadRecord {
    pub created_at: Option<DateTime>,
    pub id: i64,
    pub resource_id: String,
    pub resource_type: String,
    pub thread_id: String,
    pub webhook_id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectTransferRecord {
    pub accepted: bool,
    pub confirm_key: String,
    pub destination: String,
    pub id: i64,
    pub new_project_name: String,
    pub project_id: i64,
    pub requested: Option<DateTime>,
    pub sender_id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectTransferRequestInput {
    pub destination: String,
    pub new_project_name: String,
    pub project_id: i64,
    pub sender_id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateProjectWebhookInput {
    pub git_push: bool,
    pub payload_url: String,
    pub project_id: i64,
    pub secret: String,
    pub webhook_type: i16,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateWebhookThreadInput {
    pub resource_id: String,
    pub resource_type: String,
    pub thread_id: String,
    pub webhook_id: i64,
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
    pub id: i64,
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
    pub is_guest: bool,
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
pub struct UserAttachmentRecord {
    pub container_id: i64,
    pub container_type: String,
    pub created_label: String,
    pub id: i64,
    pub mime_type: String,
    pub name: String,
    pub size: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UserAttachmentListRecord {
    pub attachments: Vec<UserAttachmentRecord>,
    pub filter: String,
    pub page: u32,
    pub page_size: u32,
    pub total: u32,
    pub total_pages: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DeleteAttachmentResult {
    Deleted(AttachmentRecord),
    Forbidden,
    NotFound,
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
    pub closed_comment_thread_count: u32,
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
    pub accepted_count: u32,
    pub category: String,
    pub closed_count: u32,
    pub contributors: Vec<PullRequestUserRecord>,
    pub items: Vec<PullRequestListItemRecord>,
    pub open_count: u32,
    pub page_num: u32,
    pub page_size: u32,
    pub recently_pushed_branches: Vec<PullRequestPushedBranchRecord>,
    pub sent_count: u32,
    pub total_count: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestPushedBranchRecord {
    pub branch_name: String,
    pub default_branch_project_id: i64,
    pub id: i64,
    pub owner_name: String,
    pub project_name: String,
    pub pushed_label: String,
    pub short_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestMutationInput {
    pub attachment_ids: Vec<i64>,
    pub body_markdown: String,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestCommitChangedInput {
    pub actor_id: i64,
    pub actor_login_id: String,
    pub branches: Vec<PullRequestCommitChangedBranchInput>,
    pub project_id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestCommitChangedBranchInput {
    pub branch_name: String,
    pub commits: Vec<PullRequestPushedCommitInput>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestPushedCommitInput {
    pub author_email: String,
    pub commit_id: String,
    pub commit_message: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestCommitChangedRecord {
    pub commit_messages: Vec<String>,
    pub pull_request: PullRequestDetailRecord,
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
pub struct PullRequestMergeInput {
    pub actor_id: i64,
    pub actor_login_id: String,
    pub conflict: bool,
    pub merged_commit_id_from: String,
    pub merged_commit_id_to: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
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
    pub end_line: Option<i32>,
    pub owner_name: String,
    pub path: Option<String>,
    pub prev_commit_id: Option<String>,
    pub project_name: String,
    pub pull_request_number: i64,
    pub end_side: Option<String>,
    pub start_line: Option<i32>,
    pub start_side: Option<String>,
    pub thread_id: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateReviewCommentViaEmailInput {
    pub actor_display_name: String,
    pub actor_id: i64,
    pub actor_login_id: String,
    pub contents_markdown: String,
    pub message_id: String,
    pub thread_id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DeletePullRequestCommentInput {
    pub actor_id: i64,
    pub comment_id: i64,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdatePullRequestCommentInput {
    pub actor_id: i64,
    pub attachment_ids: Vec<i64>,
    pub comment_id: i64,
    pub contents_markdown: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
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
pub struct UpdateCommitDiscussionCommentInput {
    pub actor_id: i64,
    pub attachment_ids: Vec<i64>,
    pub comment_id: i64,
    pub commit_id: String,
    pub contents_markdown: String,
    pub owner_name: String,
    pub project_name: String,
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
    pub email_address: String,
    pub login_id: String,
    pub user_id: i64,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestEventRecord {
    pub commits: Vec<PullRequestCommitRecord>,
    pub created_label: String,
    pub event_type: String,
    pub id: i64,
    pub new_value: String,
    pub old_value: String,
    pub sender_login_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReviewCommentRecord {
    pub attachments: Vec<IssueAttachmentRecord>,
    pub author_id: Option<i64>,
    pub author_label: String,
    pub author_login_id: String,
    pub contents_markdown: String,
    pub created_label: String,
    pub id: i64,
    pub thread_id: i64,
    pub via_email: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReviewThreadRecord {
    pub author_id: Option<i64>,
    pub author_email_address: String,
    pub author_label: String,
    pub author_login_id: String,
    pub comments: Vec<ReviewCommentRecord>,
    pub commit_id: String,
    pub created_label: String,
    pub end_line: Option<i32>,
    pub end_side: Option<String>,
    pub id: i64,
    pub path: String,
    pub prev_commit_id: String,
    pub pull_request_number: Option<i64>,
    pub start_line: Option<i32>,
    pub start_side: Option<String>,
    pub state: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReviewThreadRouteContext {
    pub author_id: Option<i64>,
    pub commit_id: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: Option<i64>,
    pub thread_id: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestCommitRecord {
    pub author_date_label: String,
    pub author_email: String,
    pub commit_id: String,
    pub commit_message: String,
    pub commit_short_id: String,
    pub id: i64,
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
    pub lacking_reviewer_count: u32,
    pub merged_commit_id_from: String,
    pub merged_commit_id_to: String,
    pub owner_name: String,
    pub project_name: String,
    pub pull_request_number: i64,
    pub receiver: PullRequestUserRecord,
    pub required_reviewer_count: u32,
    pub reviewed: bool,
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

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct UserStatisticsRecord {
    pub assigned_issue: u32,
    pub issue: u32,
    pub issue_comment: u32,
    pub issue_comment_voter: u32,
    pub issue_voter: u32,
    pub posting: u32,
    pub posting_comment: u32,
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
