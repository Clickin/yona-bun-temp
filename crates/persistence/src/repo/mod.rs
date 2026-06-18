use crate::repo_types::{
    AppUserInput, AppUserRecord, AttachmentRecord, BranchPullRequestRecord,
    CommitDiscussionThreadStateInput, CopyProjectLabelsResult, CreateCommitDiscussionCommentInput,
    CreateForkProjectInput, CreateIssueCommentInput, CreateIssueCommentViaEmailInput,
    CreateIssueInput, CreateIssueViaEmailInput, CreateLegacyExternalPostingInput,
    CreateOrganizationInput, CreatePostingCommentInput, CreatePostingCommentViaEmailInput,
    CreatePostingInput, CreateProjectInput, CreateProjectLabelCategoryInput,
    CreateProjectLabelInput, CreateProjectWebhookInput, CreatePullRequestCommentInput,
    CreatePullRequestInput, CreatePullRequestResult, CreateReviewCommentViaEmailInput,
    CreateUserInput, CreateWebhookDeliveryInput, CreateWebhookThreadInput, DeleteAttachmentResult,
    DeleteCommitDiscussionCommentInput, DeletePullRequestCommentInput, IssueAssignableUserRecord,
    IssueAssignableUserSearchRecord, IssueAttachmentRecord, IssueChildRecord,
    IssueCommentNotificationReceiverRecord, IssueCommentOriginRecord, IssueCommentRecord,
    IssueCommentVoterRecord, IssueLabelCategoryRecord, IssueLabelRecord, IssueListFilter,
    IssueMentionUserRecord, IssueMentionUserSearchRecord, IssueMilestoneRecord, IssueMutationInput,
    IssueRecord, IssueShareStatus, IssueSharerRecord, IssueTimelineItemRecord, IssueVoterRecord,
    LegacyExternalWatcherListRecord, LegacyExternalWatcherRecord, LegacyProjectTitleHeadRecord,
    LegacyResourceTargetRecord, MailboxActionExecutionInput, MailboxActionExecutionRecord,
    MailboxNormalizedMessageInput, MailboxNormalizedMessageResult, MailboxReplyTargetRecord,
    MailboxResourceActionRecord, MassUpdateIssuesInput, MentionSyncResult, MilestoneListFilter,
    MilestoneMutationInput, NotificationActorRecord, NotificationItemRecord,
    NotificationListRecord, NotificationMailDeliveryRecord, OrganizationAuthorizationRecord,
    OrganizationEnrollmentRequestRecord, OrganizationIssueListFilter, OrganizationIssueListRecord,
    OrganizationIssueProjectOptionRecord, OrganizationMemberDirectoryRecord,
    OrganizationMemberRecord, OrganizationPostingListFilter, OrganizationPostingListRecord,
    OrganizationPostingProjectOptionRecord, OrganizationRecord, OrganizationViewerRecord,
    PostingCommentOriginRecord, PostingCommentRecord, PostingListFilter, PostingRecord,
    ProjectAuthorizationRecord, ProjectDashboardAssigneeRecord, ProjectDashboardLabelRecord,
    ProjectEnrollmentRequestRecord, ProjectHomeHistoryItemRecord, ProjectIssueListItemRecord,
    ProjectIssueListRecord, ProjectIssueParentOptionRecord, ProjectIssueReferenceRecord,
    ProjectIssueReferenceSearchRecord, ProjectListEntry, ProjectMemberDirectoryRecord,
    ProjectMemberRecord, ProjectMenuSettingsRecord, ProjectMilestoneSummaryRecord,
    ProjectPostingListItemRecord, ProjectPostingListRecord, ProjectRecord, ProjectTransferRecord,
    ProjectTransferRequestInput, ProjectViewerRecord, ProjectWatcherListRecord,
    ProjectWatcherRecord, ProjectWebhookDeliveryRecord, ProjectWebhookListRecord,
    ProjectWebhookRecord, PullRequestCommitChangedInput, PullRequestCommitChangedRecord,
    PullRequestCommitRecord, PullRequestDetailRecord, PullRequestEventRecord,
    PullRequestListFilter, PullRequestListItemRecord, PullRequestListRecord, PullRequestMergeInput,
    PullRequestPushedBranchRecord, PullRequestReviewInput, PullRequestStateInput,
    PullRequestThreadStateInput, PullRequestUserRecord, ReviewCommentRecord,
    ReviewThreadListFilter, ReviewThreadListRecord, ReviewThreadRecord, ReviewThreadRouteContext,
    SearchContextRecord, SearchCountsRecord, SearchItemRecord, SearchRepositoryInput,
    SearchResultRecord, SearchScope, SiteIssueListRecord, SiteNoAvatarUserRecord,
    SitePostingListRecord, SiteUserAvatarFromAttachmentResult, SiteUserDeleteResult,
    SiteUserListFilter, SiteUserListRecord, SiteUserRecord, ToggleFavoriteIssueResult,
    ToggleFavoriteProjectResult, UpdateCommitDiscussionCommentInput, UpdateIssueCommentInput,
    UpdateIssueInput, UpdateMilestoneInput, UpdateOrganizationInput, UpdatePostingCommentInput,
    UpdatePostingInput, UpdateProjectInput, UpdateProjectLabelCategoryInput,
    UpdateProjectLabelInput, UpdatePullRequestCommentInput, UpdatePullRequestInput,
    UserAttachmentListRecord, UserAttachmentRecord, UserIssueCandidateRecord, UserIssueListFilter,
    UserStatisticsRecord, WatchedProjectNotificationsRecord, WebhookThreadRecord,
    WorkspaceEmailRecord, WorkspaceIssueListItemRecord, WorkspaceMemberProjectRecord,
    WorkspaceNotificationPreferenceRecord, WorkspaceProfileRecord,
    WorkspacePullRequestListItemRecord,
};
use crate::{
    assignee, attachment, comment_thread, comment_thread_n4user, commit_comment, email,
    favorite_issue, favorite_organization, favorite_project, issue, issue_comment,
    issue_comment_voter, issue_event, issue_issue_label, issue_label, issue_label_category,
    issue_sharer, issue_voter, linked_account, mention, milestone, n4user, notification_event,
    notification_event_n4user, notification_mail, organization, organization_user, original_email,
    posting, posting_comment, posting_issue_label, project, project_label, project_menu_setting,
    project_pushed_branch, project_transfer, project_user, project_visitation, pull_request,
    pull_request_commit, pull_request_event, pull_request_reviewers, recent_issue, recent_project,
    review_comment, role, site_admin, title_head, unwatch, user_credential,
    user_enrolled_organization, user_enrolled_project, user_project_notification, user_setting,
    user_verification, watch, webhook, webhook_delivery, webhook_thread,
};
use rand::{distributions::Alphanumeric, Rng};
use sea_orm::entity::prelude::{DateTime, DateTimeUtc};
use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, DatabaseBackend,
    DatabaseConnection, DbErr, EntityTrait, FromQueryResult, NotSet, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, Set, Statement, TransactionTrait,
};
use std::collections::{HashMap, HashSet};
use std::time::{Duration, SystemTime};
use yona_rust_search::{
    keyword_matches, make_snippets, relevance_score, resolve_search_type, SearchSnippet,
    SearchType, SearchTypeCounts,
};

mod app_user;
mod default_landing;

#[derive(Clone)]
pub struct AppRepository {
    db: DatabaseConnection,
}

#[derive(Clone)]
pub struct AppUserRepository {
    inner: AppRepository,
}

#[derive(Clone)]
pub struct DefaultLandingRepository {
    inner: AppRepository,
}

include!("common.rs");
include!("user.rs");
include!("site_admin.rs");
include!("search.rs");
include!("issue.rs");
include!("posting.rs");
include!("issue_relation.rs");
include!("issue_label.rs");
include!("milestone.rs");
include!("project_lookup.rs");
include!("organization.rs");
include!("project.rs");
include!("project_transfer.rs");
include!("project_setting.rs");
include!("project_activity.rs");
include!("pull_request.rs");
include!("mailbox.rs");
include!("pull_request_review.rs");
include!("user_workspace.rs");
include!("attachment.rs");
include!("project_vcs.rs");
include!("workspace.rs");
include!("notification.rs");
include!("user_helpers.rs");
include!("record_helpers.rs");
include!("issue_relation_helpers.rs");
include!("project_home_helpers.rs");
include!("issue_label_helpers.rs");
include!("comment_helpers.rs");
include!("watch_helpers.rs");
include!("event_notification_helpers.rs");
include!("role_project_helpers.rs");
