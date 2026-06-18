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

mod common;
use common::*;
#[path = "attachment.rs"]
mod repo_attachment;
#[path = "comment_helpers.rs"]
mod repo_comment_helpers;
#[path = "event_notification_helpers.rs"]
mod repo_event_notification_helpers;
#[path = "issue.rs"]
mod repo_issue;
#[path = "issue_comment.rs"]
mod repo_issue_comment;
#[path = "issue_label.rs"]
mod repo_issue_label;
#[path = "issue_label_helpers.rs"]
mod repo_issue_label_helpers;
#[path = "issue_relation.rs"]
mod repo_issue_relation;
#[path = "issue_relation_helpers.rs"]
mod repo_issue_relation_helpers;
#[path = "mailbox.rs"]
mod repo_mailbox;
#[path = "milestone.rs"]
mod repo_milestone;
#[path = "notification.rs"]
mod repo_notification;
#[path = "organization.rs"]
mod repo_organization;
#[path = "posting.rs"]
mod repo_posting;
#[path = "posting_comment.rs"]
mod repo_posting_comment;
#[path = "project.rs"]
mod repo_project;
#[path = "project_activity.rs"]
mod repo_project_activity;
#[path = "project_home_helpers.rs"]
mod repo_project_home_helpers;
#[path = "project_lookup.rs"]
mod repo_project_lookup;
#[path = "project_setting.rs"]
mod repo_project_setting;
#[path = "project_transfer.rs"]
mod repo_project_transfer;
#[path = "project_vcs.rs"]
mod repo_project_vcs;
#[path = "pull_request.rs"]
mod repo_pull_request;
#[path = "pull_request_commit.rs"]
mod repo_pull_request_commit;
#[path = "pull_request_review.rs"]
mod repo_pull_request_review;
#[path = "pull_request_review_actions.rs"]
mod repo_pull_request_review_actions;
#[path = "record_helpers.rs"]
mod repo_record_helpers;
#[path = "role_project_helpers.rs"]
mod repo_role_project_helpers;
#[path = "search.rs"]
mod repo_search;
#[path = "site_admin.rs"]
mod repo_site_admin;
#[path = "user.rs"]
mod repo_user;
#[path = "user_helpers.rs"]
mod repo_user_helpers;
#[path = "user_workspace.rs"]
mod repo_user_workspace;
#[path = "watch_helpers.rs"]
mod repo_watch_helpers;
#[path = "webhook.rs"]
mod repo_webhook;
#[path = "workspace.rs"]
mod repo_workspace;
