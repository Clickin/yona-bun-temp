use crate::repo_types::{
    AppUserInput, AppUserRecord, AttachmentProjectResourceRecord, AttachmentRecord,
    BranchPullRequestRecord, CommitDiscussionThreadStateInput, CopyProjectLabelsResult,
    CreateCommitDiscussionCommentInput, CreateForkProjectInput, CreateIssueCommentInput,
    CreateIssueCommentViaEmailInput, CreateIssueInput, CreateIssueViaEmailInput,
    CreateLegacyExternalPostingInput, CreateOrganizationInput, CreatePostingCommentInput,
    CreatePostingCommentViaEmailInput, CreatePostingInput, CreateProjectInput,
    CreateProjectLabelCategoryInput, CreateProjectLabelInput, CreateProjectWebhookInput,
    CreatePullRequestCommentInput, CreatePullRequestInput, CreatePullRequestResult,
    CreateReviewCommentViaEmailInput, CreateUserInput, CreateWebhookDeliveryInput,
    CreateWebhookThreadInput, DeleteAttachmentResult, DeleteCommitDiscussionCommentInput,
    DeletePullRequestCommentInput, IssueAssignableUserRecord, IssueAssignableUserSearchRecord,
    IssueAttachmentRecord, IssueChildRecord, IssueCommentNotificationReceiverRecord,
    IssueCommentOriginRecord, IssueCommentRecord, IssueCommentVoterRecord,
    IssueLabelCategoryRecord, IssueLabelRecord, IssueListFilter, IssueMentionUserRecord,
    IssueMentionUserSearchRecord, IssueMilestoneRecord, IssueMutationInput, IssueRecord,
    IssueShareStatus, IssueSharerRecord, IssueTimelineItemRecord, IssueVoterRecord,
    LegacyExternalWatcherListRecord, LegacyExternalWatcherRecord, LegacyProjectLabelAttachResult,
    LegacyProjectLabelRecord, LegacyProjectTitleHeadRecord, LegacyResourceTargetRecord,
    LegacyReviewCommentDeleteTarget, LegacyReviewCommentDeleteTargetKind,
    MailboxActionExecutionInput, MailboxActionExecutionRecord, MailboxNormalizedMessageInput,
    MailboxNormalizedMessageResult, MailboxReplyTargetRecord, MailboxResourceActionRecord,
    MassUpdateIssuesInput, MentionSyncResult, MilestoneListFilter, MilestoneMutationInput,
    NotificationActorRecord, NotificationItemRecord, NotificationListRecord,
    NotificationMailDeliveryRecord, OAuthUserInput, OrganizationAuthorizationRecord,
    OrganizationEnrollmentRequestRecord, OrganizationIssueListFilter, OrganizationIssueListRecord,
    OrganizationIssueProjectOptionRecord, OrganizationMemberDirectoryRecord,
    OrganizationMemberRecord, OrganizationPostingListFilter, OrganizationPostingListRecord,
    OrganizationPostingProjectOptionRecord, OrganizationRecord, OrganizationViewerRecord,
    PostingCommentOriginRecord, PostingCommentRecord, PostingListFilter, PostingRecord,
    ProjectAuthorizationRecord, ProjectDashboardAssigneeRecord, ProjectDashboardLabelRecord,
    ProjectDashboardMilestoneRecord, ProjectDashboardPullRequestRecord,
    ProjectEnrollmentRequestRecord, ProjectHomeHistoryItemRecord, ProjectIssueListItemRecord,
    ProjectIssueListRecord, ProjectIssueListRow, ProjectIssueParentOptionRecord,
    ProjectIssueReferenceRecord, ProjectIssueReferenceSearchRecord,
    ProjectIssueSearchUserListRecord, ProjectIssueSearchUserRecord, ProjectListEntry,
    ProjectMemberDirectoryRecord, ProjectMemberRecord, ProjectMenuSettingsRecord,
    ProjectMilestoneSummaryRecord, ProjectPostingListItemRecord, ProjectPostingListRecord,
    ProjectRecord, ProjectTransferRecord, ProjectTransferRequestInput, ProjectViewerRecord,
    ProjectWatcherListRecord, ProjectWatcherRecord, ProjectWebhookDeliveryRecord,
    ProjectWebhookListRecord, ProjectWebhookRecord, PullRequestCommitChangedInput,
    PullRequestCommitChangedRecord, PullRequestCommitRecord, PullRequestDetailRecord,
    PullRequestEventRecord, PullRequestListFilter, PullRequestListItemRecord,
    PullRequestListRecord, PullRequestMergeInput, PullRequestPushedBranchRecord,
    PullRequestReviewInput, PullRequestStateInput, PullRequestThreadStateInput,
    PullRequestUserRecord, ReviewCommentRecord, ReviewThreadListFilter, ReviewThreadListRecord,
    ReviewThreadRecord, ReviewThreadRouteContext, SearchContextRecord, SearchCountsRecord,
    SearchItemRecord, SearchRepositoryInput, SearchResultRecord, SearchScope,
    SiteAdminToggleResult, SiteImportProjectCounterSnapshot, SiteIssueListRecord,
    SiteNoAvatarUserRecord, SitePostingListRecord, SiteProjectListRecord,
    SiteUserAvatarFromAttachmentResult, SiteUserDeleteResult, SiteUserListFilter,
    SiteUserListRecord, SiteUserRecord, ToggleFavoriteIssueResult, ToggleFavoriteProjectResult,
    UpdateCommitDiscussionCommentInput, UpdateIssueCommentInput, UpdateIssueInput,
    UpdateMilestoneInput, UpdateOrganizationInput, UpdatePostingCommentInput, UpdatePostingInput,
    UpdateProjectInput, UpdateProjectLabelCategoryInput, UpdateProjectLabelInput,
    UpdatePullRequestCommentInput, UpdatePullRequestInput, UserAttachmentListRecord,
    UserAttachmentRecord, UserIssueCandidateRecord, UserIssueListFilter, UserStatisticsRecord,
    WatchedProjectNotificationsRecord, WebhookThreadRecord, WorkspaceEmailRecord,
    WorkspaceIssueListItemRecord, WorkspaceMemberProjectRecord,
    WorkspaceNotificationPreferenceRecord, WorkspaceProfileRecord,
    WorkspacePullRequestListItemRecord,
};
use crate::{
    assignee, attachment, comment_thread, comment_thread_n4user, commit_comment, email,
    favorite_issue, favorite_organization, favorite_project, issue, issue_comment,
    issue_comment_voter, issue_event, issue_issue_label, issue_label, issue_label_category,
    issue_sharer, issue_voter, label, linked_account, mention, milestone, n4user,
    notification_event, notification_event_n4user, notification_mail, organization,
    organization_user, original_email, posting, posting_comment, posting_issue_label, project,
    project_label, project_menu_setting, project_pushed_branch, project_transfer, project_user,
    project_visitation, pull_request, pull_request_commit, pull_request_event,
    pull_request_reviewers, recent_issue, recent_project, review_comment, role, site_admin,
    title_head, unwatch, user_credential, user_enrolled_organization, user_enrolled_project,
    user_project_notification, user_setting, user_verification, watch, webhook, webhook_delivery,
    webhook_thread,
};
use rand::{distributions::Alphanumeric, Rng};
use sea_orm::entity::prelude::{DateTime, DateTimeUtc};
use sea_orm::{
    sea_query::{Expr, Func},
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, DatabaseBackend, DatabaseConnection,
    DatabaseTransaction, DbBackend, DbErr, EntityTrait, ExecResult, FromQueryResult, JoinType,
    NotSet, PaginatorTrait, QueryFilter, QueryOrder, QueryResult, QuerySelect, QueryTrait,
    RelationTrait, Set, Statement, TransactionTrait,
};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use yoram_search::{
    keyword_matches, make_snippets, relevance_score, resolve_search_type, SearchSnippet,
    SearchType, SearchTypeCounts,
};

mod app_user;
mod default_landing;
mod stable_list_cache;

pub use stable_list_cache::StableListStore;
use stable_list_cache::{MokaCacheStore, StableLists};

#[derive(Clone)]
pub struct AppRepositoryImpl<'db> {
    config: RepositoryConfig,
    db: RepositoryDb<'db>,
    stable_lists: StableLists,
    /// Single-writer coordinator for file-backed SQLite. When `Some`, every
    /// top-level write transaction is serialized through this mutex so
    /// concurrent writers cannot interleave on the WAL. `None` for in-memory
    /// SQLite (unit/contract tests) and non-SQLite backends.
    sqlite_write_coordinator: Option<std::sync::Arc<tokio::sync::Mutex<()>>>,
}

pub type AppRepository = AppRepositoryImpl<'static>;

#[derive(Clone)]
enum RepositoryDb<'db> {
    Connection(DatabaseConnection),
    Transaction(&'db DatabaseTransaction),
}

#[async_trait::async_trait]
impl ConnectionTrait for RepositoryDb<'_> {
    fn get_database_backend(&self) -> DbBackend {
        match self {
            Self::Connection(db) => db.get_database_backend(),
            Self::Transaction(txn) => txn.get_database_backend(),
        }
    }

    async fn execute(&self, stmt: Statement) -> Result<ExecResult, DbErr> {
        match self {
            Self::Connection(db) => db.execute(stmt).await,
            Self::Transaction(txn) => txn.execute(stmt).await,
        }
    }

    async fn execute_unprepared(&self, sql: &str) -> Result<ExecResult, DbErr> {
        match self {
            Self::Connection(db) => db.execute_unprepared(sql).await,
            Self::Transaction(txn) => txn.execute_unprepared(sql).await,
        }
    }

    async fn query_one(&self, stmt: Statement) -> Result<Option<QueryResult>, DbErr> {
        match self {
            Self::Connection(db) => db.query_one(stmt).await,
            Self::Transaction(txn) => txn.query_one(stmt).await,
        }
    }

    async fn query_all(&self, stmt: Statement) -> Result<Vec<QueryResult>, DbErr> {
        match self {
            Self::Connection(db) => db.query_all(stmt).await,
            Self::Transaction(txn) => txn.query_all(stmt).await,
        }
    }

    fn support_returning(&self) -> bool {
        match self {
            Self::Connection(db) => db.support_returning(),
            Self::Transaction(txn) => txn.support_returning(),
        }
    }

    fn is_mock_connection(&self) -> bool {
        match self {
            Self::Connection(db) => db.is_mock_connection(),
            Self::Transaction(txn) => txn.is_mock_connection(),
        }
    }
}

#[async_trait::async_trait]
impl TransactionTrait for RepositoryDb<'_> {
    async fn begin(&self) -> Result<DatabaseTransaction, DbErr> {
        match self {
            Self::Connection(db) => db.begin().await,
            Self::Transaction(txn) => txn.begin().await,
        }
    }

    async fn begin_with_config(
        &self,
        isolation_level: Option<sea_orm::IsolationLevel>,
        access_mode: Option<sea_orm::AccessMode>,
    ) -> Result<DatabaseTransaction, DbErr> {
        match self {
            Self::Connection(db) => db.begin_with_config(isolation_level, access_mode).await,
            Self::Transaction(txn) => txn.begin_with_config(isolation_level, access_mode).await,
        }
    }

    async fn transaction<F, T, E>(&self, callback: F) -> Result<T, sea_orm::TransactionError<E>>
    where
        F: for<'c> FnOnce(
                &'c DatabaseTransaction,
            ) -> Pin<Box<dyn Future<Output = Result<T, E>> + Send + 'c>>
            + Send,
        T: Send,
        E: std::fmt::Display + std::fmt::Debug + Send,
    {
        match self {
            Self::Connection(db) => db.transaction(callback).await,
            Self::Transaction(txn) => txn.transaction(callback).await,
        }
    }

    async fn transaction_with_config<F, T, E>(
        &self,
        callback: F,
        isolation_level: Option<sea_orm::IsolationLevel>,
        access_mode: Option<sea_orm::AccessMode>,
    ) -> Result<T, sea_orm::TransactionError<E>>
    where
        F: for<'c> FnOnce(
                &'c DatabaseTransaction,
            ) -> Pin<Box<dyn Future<Output = Result<T, E>> + Send + 'c>>
            + Send,
        T: Send,
        E: std::fmt::Display + std::fmt::Debug + Send,
    {
        match self {
            Self::Connection(db) => {
                db.transaction_with_config(callback, isolation_level, access_mode)
                    .await
            }
            Self::Transaction(txn) => {
                txn.transaction_with_config(callback, isolation_level, access_mode)
                    .await
            }
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RepositoryConfig {
    values: BTreeMap<String, String>,
}

impl Default for RepositoryConfig {
    fn default() -> Self {
        Self {
            values: BTreeMap::new(),
        }
    }
}

impl AppRepositoryImpl<'_> {
    pub fn with_sqlite_write_coordinator(
        mut self,
        coordinator: std::sync::Arc<tokio::sync::Mutex<()>>,
    ) -> Self {
        self.sqlite_write_coordinator = Some(coordinator);
        self
    }

    /// Begin a write transaction serialized through the single-writer
    /// coordinator (file-backed SQLite only). Returns the guard, the
    /// transaction, and the instant the transaction began (for commit-duration
    /// logging). The guard MUST be released immediately after commit — never
    /// held across the notifications/webhook/file work that follows.
    ///
    /// `RepositoryDb::Transaction` (nested transaction) and non-SQLite
    /// backends return `None` for the guard: serializing there would
    /// self-deadlock when the outer write already holds the coordinator.
    pub async fn begin_serialized_write(
        &self,
    ) -> Result<
        (
            Option<tokio::sync::OwnedMutexGuard<()>>,
            DatabaseTransaction,
            std::time::Instant,
        ),
        DbErr,
    > {
        let acquire_started_at = std::time::Instant::now();
        let guard = match (&self.sqlite_write_coordinator, &self.db) {
            (Some(lock), RepositoryDb::Connection(_)) => {
                Some(std::sync::Arc::clone(lock).lock_owned().await)
            }
            _ => None,
        };
        if guard.is_some() {
            tracing::debug!(
                target: "yoram_persistence::sqlite_write",
                sqlite_write_queue_wait_ms = acquire_started_at.elapsed().as_millis() as u64,
                "sqlite write coordinator acquired"
            );
        }
        let txn_started_at = std::time::Instant::now();
        let txn = self.db.begin().await;
        match txn {
            Ok(txn) => Ok((guard, txn, txn_started_at)),
            Err(error) => {
                if sqlite_busy_error(&error) {
                    tracing::warn!(
                        target: "yoram_persistence::sqlite_write",
                        error = %error,
                        "sqlite busy while beginning write transaction"
                    );
                }
                Err(error)
            }
        }
    }

    /// Commit a serialized write transaction, log its duration, and release
    /// the coordinator guard (dropped immediately after commit, even on error).
    pub async fn commit_serialized_write(
        &self,
        txn: DatabaseTransaction,
        _write_guard: Option<tokio::sync::OwnedMutexGuard<()>>,
        txn_started_at: std::time::Instant,
    ) -> Result<(), DbErr> {
        let result = txn.commit().await;
        if let Err(error) = &result {
            if sqlite_busy_error(error) {
                tracing::warn!(
                    target: "yoram_persistence::sqlite_write",
                    error = %error,
                    "sqlite busy while committing write transaction"
                );
            }
        }
        tracing::debug!(
            target: "yoram_persistence::sqlite_write",
            sqlite_write_transaction_duration_ms = txn_started_at.elapsed().as_millis() as u64,
            "sqlite write transaction finished"
        );
        drop(_write_guard);
        result
    }
}

fn sqlite_busy_error(error: &DbErr) -> bool {
    let message = error.to_string().to_ascii_lowercase();
    message.contains("database is locked")
        || message.contains("sqlite_busy")
        || message.contains("busy_snapshot")
}

impl RepositoryConfig {
    pub fn from_pairs<I, K, V>(pairs: I) -> Self
    where
        I: IntoIterator<Item = (K, V)>,
        K: Into<String>,
        V: Into<String>,
    {
        Self {
            values: pairs
                .into_iter()
                .map(|(key, value)| (key.into(), value.into()))
                .collect(),
        }
    }

    fn value(&self, name: &str) -> Option<&str> {
        self.values
            .get(name)
            .map(String::as_str)
            .filter(|value| !value.trim().is_empty())
    }

    pub fn login_id_matches_guest_prefix(&self, login_id: &str) -> bool {
        let normalized_login_id = normalize_identity(login_id);
        if normalized_login_id.is_empty() {
            return false;
        }
        let Some(prefixes) = self.value("YONA_GUEST_LOGIN_PREFIX") else {
            return false;
        };
        prefixes
            .replace(' ', "")
            .split(',')
            .map(normalize_identity)
            .filter(|prefix| !prefix.is_empty())
            .any(|prefix| normalized_login_id.starts_with(&prefix))
    }

    pub fn notification_draft_time_in_millis(&self) -> i64 {
        self.value("YONA_NOTIFICATION_DRAFT_TIME")
            .and_then(parse_legacy_duration_ms)
            .unwrap_or(NOTIFICATION_DRAFT_TIME_IN_MILLIS)
    }

    pub fn issue_event_draft_time_in_millis(&self) -> i64 {
        self.value("YONA_ISSUE_EVENT_DRAFT_TIME")
            .and_then(parse_legacy_duration_ms)
            .unwrap_or(ISSUE_EVENT_DRAFT_TIME_IN_MILLIS)
    }

    pub fn project_default_menu_settings(&self) -> ProjectMenuSettingsRecord {
        configured_project_default_menu_settings_from_value(
            self.value("YONA_PROJECT_DEFAULT_MENUS"),
        )
    }

    /// Stable-list cache store selected by `YONA_STABLE_LIST_CACHE`. A shared
    /// redis/valkey URL requires the `cache-redis` feature; anything else
    /// (unset or `memory`) uses the in-process moka store.
    pub fn stable_list_store(&self) -> Arc<dyn StableListStore> {
        match self.value("YONA_STABLE_LIST_CACHE") {
            Some(url) if !url.eq_ignore_ascii_case("memory") => {
                #[cfg(feature = "cache-redis")]
                {
                    Arc::new(stable_list_cache::RedisCacheStore::new(url))
                }
                #[cfg(not(feature = "cache-redis"))]
                {
                    tracing::warn!(
                        "YONA_STABLE_LIST_CACHE set but cache-redis feature is off; falling back to in-memory cache"
                    );
                    Arc::new(MokaCacheStore::new())
                }
            }
            _ => Arc::new(MokaCacheStore::new()),
        }
    }
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
#[path = "issue.rs"]
mod repo_issue;
#[path = "issue_comment.rs"]
mod repo_issue_comment;
#[path = "issue_event.rs"]
mod repo_issue_event;
#[path = "issue_label.rs"]
mod repo_issue_label;
#[path = "issue_label_helpers.rs"]
mod repo_issue_label_helpers;
#[path = "issue_list.rs"]
mod repo_issue_list;
#[path = "issue_mutation.rs"]
mod repo_issue_mutation;
#[path = "issue_picker.rs"]
mod repo_issue_picker;
#[path = "issue_reference.rs"]
mod repo_issue_reference;
#[path = "issue_relation.rs"]
mod repo_issue_relation;
#[path = "issue_relation_helpers.rs"]
mod repo_issue_relation_helpers;
#[path = "issue_user_list.rs"]
mod repo_issue_user_list;
#[path = "mailbox.rs"]
mod repo_mailbox;
#[path = "mention_sync.rs"]
mod repo_mention_sync;
#[path = "milestone.rs"]
mod repo_milestone;
#[path = "notification.rs"]
mod repo_notification;
#[path = "notification_event.rs"]
mod repo_notification_event;
#[path = "notification_receivers.rs"]
mod repo_notification_receivers;
#[path = "notification_targets.rs"]
mod repo_notification_targets;
#[path = "organization.rs"]
mod repo_organization;
#[path = "posting.rs"]
mod repo_posting;
#[path = "posting_comment.rs"]
mod repo_posting_comment;
#[path = "posting_event_helpers.rs"]
mod repo_posting_event_helpers;
#[path = "project.rs"]
mod repo_project;
#[path = "project_activity.rs"]
mod repo_project_activity;
#[path = "project_delete.rs"]
mod repo_project_delete;
#[path = "project_home_helpers.rs"]
mod repo_project_home_helpers;
#[path = "project_legacy_label.rs"]
mod repo_project_legacy_label;
#[path = "project_lookup.rs"]
mod repo_project_lookup;
#[path = "project_membership.rs"]
mod repo_project_membership;
#[path = "project_setting.rs"]
mod repo_project_setting;
#[path = "project_transfer.rs"]
mod repo_project_transfer;
#[path = "project_vcs.rs"]
mod repo_project_vcs;
#[path = "project_watchers.rs"]
mod repo_project_watchers;
#[path = "pull_request.rs"]
mod repo_pull_request;
#[path = "pull_request_commit.rs"]
mod repo_pull_request_commit;
#[path = "pull_request_event.rs"]
mod repo_pull_request_event;
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
#[path = "site_import_rollback.rs"]
mod repo_site_import_rollback;
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
