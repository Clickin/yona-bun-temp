use crate::repo_types::{
    AppUserInput, AppUserRecord, AttachmentRecord, BranchPullRequestRecord,
    CommitDiscussionThreadStateInput, CreateCommitDiscussionCommentInput, CreateIssueCommentInput,
    CreateIssueInput, CreateOrganizationInput, CreatePostingCommentInput, CreatePostingInput,
    CreateProjectInput, CreateProjectLabelCategoryInput, CreateProjectLabelInput,
    CreateProjectWebhookInput, CreatePullRequestCommentInput, CreatePullRequestInput,
    CreatePullRequestResult, CreateUserInput, DeleteCommitDiscussionCommentInput,
    IssueAssignableUserRecord, IssueAssignableUserSearchRecord, IssueAttachmentRecord,
    IssueCommentRecord, IssueCommentVoterRecord, IssueLabelCategoryRecord, IssueLabelRecord,
    IssueListFilter, IssueMentionUserRecord, IssueMentionUserSearchRecord, IssueMilestoneRecord,
    IssueRecord, IssueShareStatus, IssueSharerRecord, IssueTimelineItemRecord,
    MassUpdateIssuesInput, MentionSyncResult, MilestoneListFilter, MilestoneMutationInput,
    NotificationActorRecord, NotificationItemRecord, NotificationListRecord,
    OrganizationAuthorizationRecord, OrganizationEnrollmentRequestRecord,
    OrganizationIssueListFilter, OrganizationIssueListRecord, OrganizationIssueProjectOptionRecord,
    OrganizationMemberDirectoryRecord, OrganizationMemberRecord, OrganizationPostingListFilter,
    OrganizationPostingListRecord, OrganizationPostingProjectOptionRecord, OrganizationRecord,
    OrganizationViewerRecord, PostingCommentRecord, PostingListFilter, PostingRecord,
    ProjectAuthorizationRecord, ProjectEnrollmentRequestRecord, ProjectIssueListItemRecord,
    ProjectIssueListRecord, ProjectIssueReferenceRecord, ProjectIssueReferenceSearchRecord,
    ProjectListEntry, ProjectMemberDirectoryRecord, ProjectMemberRecord, ProjectMenuSettingsRecord,
    ProjectMilestoneSummaryRecord, ProjectPostingListItemRecord, ProjectPostingListRecord,
    ProjectRecord, ProjectViewerRecord, ProjectWatcherRecord, ProjectWebhookRecord,
    PullRequestCommitRecord, PullRequestDetailRecord, PullRequestEventRecord,
    PullRequestListFilter, PullRequestListItemRecord, PullRequestListRecord,
    PullRequestReviewInput, PullRequestStateInput, PullRequestThreadStateInput,
    PullRequestUserRecord, ReviewCommentRecord, ReviewThreadListFilter, ReviewThreadListRecord,
    ReviewThreadRecord, SearchContextRecord, SearchCountsRecord, SearchItemRecord,
    SearchRepositoryInput, SearchResultRecord, SearchScope, ToggleFavoriteIssueResult,
    ToggleFavoriteProjectResult, UpdateIssueCommentInput, UpdateIssueInput, UpdateMilestoneInput,
    UpdateOrganizationInput, UpdatePostingCommentInput, UpdatePostingInput, UpdateProjectInput,
    UpdateProjectLabelCategoryInput, UpdateProjectLabelInput, UpdatePullRequestInput,
    UserIssueCandidateRecord, UserIssueListFilter, WatchedProjectNotificationsRecord,
    WorkspaceEmailRecord, WorkspaceIssueListItemRecord, WorkspaceMemberProjectRecord,
    WorkspaceNotificationPreferenceRecord, WorkspaceProfileRecord,
    WorkspacePullRequestListItemRecord,
};
use crate::{
    assignee, attachment, comment_thread, comment_thread_n4user, commit_comment, email,
    favorite_issue, favorite_organization, favorite_project, issue, issue_comment,
    issue_comment_voter, issue_event, issue_issue_label, issue_label, issue_label_category,
    issue_sharer, issue_voter, linked_account, mention, milestone, n4user, notification_event,
    notification_event_n4user, notification_mail, organization, organization_user, posting,
    posting_comment, posting_issue_label, project, project_label, project_menu_setting,
    project_pushed_branch, project_transfer, project_user, project_visitation, pull_request,
    pull_request_commit, pull_request_event, pull_request_reviewers, recent_project,
    review_comment, role, site_admin, title_head, unwatch, user_credential,
    user_enrolled_organization, user_enrolled_project, user_project_notification, user_setting,
    user_verification, watch, webhook,
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
    keyword_matches, make_snippets, resolve_search_type, SearchSnippet, SearchType,
    SearchTypeCounts,
};

fn normalize_identity(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn normalize_optional(value: Option<&str>) -> Option<String> {
    value
        .map(normalize_identity)
        .filter(|item| !item.is_empty())
}

fn empty_to_none(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    })
}

fn user_state_from_confirmed(is_confirmed: bool) -> Option<String> {
    Some(if is_confirmed { "active" } else { "pending" }.to_string())
}

fn issue_assignable_user_matches(user: &n4user::Model, query: &str, search_type: &str) -> bool {
    let query = query.trim();
    let normalized_query = normalize_identity(query);
    match search_type {
        "loginId" => {
            normalize_optional(user.login_id.as_deref()).as_deref()
                == Some(normalized_query.as_str())
        }
        "name" => user
            .name
            .as_deref()
            .is_some_and(|value| value.trim().eq_ignore_ascii_case(query)),
        "englishName" => user
            .english_name
            .as_deref()
            .is_some_and(|value| value.trim().eq_ignore_ascii_case(query)),
        _ => {
            let contains_query = |value: Option<&str>| {
                normalize_optional(value)
                    .is_some_and(|value| value.contains(normalized_query.as_str()))
            };
            contains_query(user.login_id.as_deref())
                || contains_query(user.name.as_deref())
                || contains_query(user.english_name.as_deref())
        }
    }
}

fn issue_assignable_user_record(user: n4user::Model) -> IssueAssignableUserRecord {
    let login_id = user.login_id.unwrap_or_default();
    let display_name = user.name.unwrap_or_else(|| login_id.clone());
    let pure_name_only = pure_user_name(&display_name);
    IssueAssignableUserRecord {
        avatar_url: String::new(),
        display_name,
        item_type: "user".to_string(),
        login_id,
        pure_name_only,
    }
}

fn issue_sharable_project_record(project: ProjectRecord) -> IssueAssignableUserRecord {
    let display_name = format!("{}/{}", project.owner_name, project.project_name);
    IssueAssignableUserRecord {
        avatar_url: String::new(),
        display_name: display_name.clone(),
        item_type: "project".to_string(),
        login_id: project.id.to_string(),
        pure_name_only: display_name,
    }
}

fn n4user_is_active(user: &n4user::Model) -> bool {
    normalize_optional(user.state.as_deref()).as_deref() == Some("active")
}

fn issue_mention_user_record(user: n4user::Model) -> IssueMentionUserRecord {
    let login_id = user.login_id.unwrap_or_default();
    let display_name = user.name.unwrap_or_else(|| login_id.clone());
    let search_text = format!("{display_name}{login_id}");
    IssueMentionUserRecord {
        avatar_url: String::new(),
        display_name,
        login_id,
        search_text,
        item_type: "user".to_string(),
    }
}

fn mention_text_matches(record: &IssueMentionUserRecord, query: &str) -> bool {
    let normalized = normalize_identity(query);
    normalized.is_empty()
        || normalize_identity(&record.login_id).contains(&normalized)
        || normalize_identity(&record.display_name).contains(&normalized)
        || normalize_identity(&record.search_text).contains(&normalized)
}

fn project_issue_reference_record(model: &issue::Model) -> ProjectIssueReferenceRecord {
    ProjectIssueReferenceRecord {
        issue_number: model.number.unwrap_or_default(),
        state: issue_state_from_raw(model.state),
        title: model.title.clone().unwrap_or_default(),
    }
}

fn push_unique_user_id(user_ids: &mut Vec<i64>, seen: &mut HashSet<i64>, user_id: Option<i64>) {
    if let Some(user_id) = user_id {
        if seen.insert(user_id) {
            user_ids.push(user_id);
        }
    }
}

fn extract_mention_tokens(text: &str) -> Vec<String> {
    let chars = text.char_indices().collect::<Vec<_>>();
    let mut tokens = Vec::new();
    let mut index = 0;
    while index < chars.len() {
        let (_, ch) = chars[index];
        if ch != '@' {
            index += 1;
            continue;
        }
        if index > 0 {
            let previous_ch = chars[index - 1].1;
            if previous_ch.is_ascii_alphanumeric() || matches!(previous_ch, '-' | '_' | '.') {
                index += 1;
                continue;
            }
        }
        let start = index + 1;
        let mut end = start;
        while end < chars.len() {
            let (_, token_ch) = chars[end];
            if token_ch.is_ascii_alphanumeric() || matches!(token_ch, '-' | '_' | '.' | '/') {
                end += 1;
            } else {
                break;
            }
        }
        if end > start {
            let byte_start = chars[start].0;
            let byte_end = chars
                .get(end)
                .map(|(byte_index, _)| *byte_index)
                .unwrap_or(text.len());
            let token = text[byte_start..byte_end].trim_matches('/').to_string();
            if !token.is_empty() {
                tokens.push(token);
            }
        }
        index = end.max(index + 1);
    }
    tokens
}

fn pure_user_name(display_name: &str) -> String {
    let bracket_index = ["[", "("]
        .iter()
        .filter_map(|marker| display_name.find(marker))
        .min()
        .unwrap_or(display_name.len());
    display_name[..bracket_index].trim().to_string()
}

fn issue_state_to_raw(value: &str) -> i32 {
    if normalize_identity(value) == "open" {
        0
    } else {
        1
    }
}

const WORKSPACE_NOTIFICATION_TYPES: &[(&str, &str)] = &[
    ("NEW_ISSUE", "New issue"),
    ("NEW_POSTING", "New post"),
    ("NEW_PULL_REQUEST", "New pull request"),
    ("ISSUE_STATE_CHANGED", "Issue state changed"),
    ("ISSUE_ASSIGNEE_CHANGED", "Issue assignee changed"),
    ("PULL_REQUEST_STATE_CHANGED", "Pull request state changed"),
    ("NEW_COMMENT", "New comment"),
    ("NEW_REVIEW_COMMENT", "New simple comment"),
    ("MEMBER_ENROLL_REQUEST", "Member enroll request"),
    ("PULL_REQUEST_MERGED", "Pull request merged"),
    ("ISSUE_REFERRED_FROM_COMMIT", "Issue referred from commit"),
    ("PULL_REQUEST_COMMIT_CHANGED", "Pull request commit changed"),
    ("NEW_COMMIT", "New commit"),
    (
        "PULL_REQUEST_REVIEW_STATE_CHANGED",
        "Pull request review action changed",
    ),
    (
        "ISSUE_REFERRED_FROM_PULL_REQUEST",
        "Issue referred from pull request",
    ),
    ("ISSUE_BODY_CHANGED", "Issue body changed"),
    ("REVIEW_THREAD_STATE_CHANGED", "Review state changed"),
    (
        "ORGANIZATION_MEMBER_ENROLL_REQUEST",
        "Organization member enroll request",
    ),
    ("COMMENT_UPDATED", "Comment updated"),
    ("ISSUE_MOVED", "Issue moved"),
    ("ISSUE_SHARER_CHANGED", "Issue sharer changed"),
    ("ISSUE_LABEL_CHANGED", "Issue label changed"),
    ("ISSUE_MILESTONE_CHANGED", "Milestone changed"),
    ("POSTING_BODY_CHANGED", "Posting body changed"),
    ("RESOURCE_DELETED", "Resource deleted"),
    ("MEMBER_ENROLL_ACCEPT", "Member enroll accept"),
    (
        "ORGANIZATION_MEMBER_ENROLL_ACCEPT",
        "Organization member enroll accept",
    ),
];

const PASSWORD_RESET_VERIFICATION_PREFIX: &str = "password-reset:";
const SIGNUP_VERIFICATION_PREFIX: &str = "signup:";
const USER_ATTACHMENT_CONTAINER: &str = "USER";
const USER_AVATAR_ATTACHMENT_CONTAINER: &str = "USER_AVATAR";

enum PostingMentionNotificationMode {
    All,
    NewOnly,
}

fn workspace_notification_enabled_by_default(event_type: &str) -> bool {
    !matches!(event_type, "NEW_COMMENT")
}

fn notification_message(event_type: &str, old_value: &str, new_value: &str) -> String {
    match event_type {
        "ISSUE_SHARER_CHANGED" if !new_value.trim().is_empty() => {
            format!("Issue is shared with {}", new_value.trim())
        }
        "ISSUE_SHARER_CHANGED" if !old_value.trim().is_empty() => {
            "Issue sharing state is changed".to_string()
        }
        "NEW_ISSUE" => "New issue added".to_string(),
        "NEW_COMMENT" => "New comment on post or issue added".to_string(),
        "ISSUE_BODY_CHANGED" => "Issue body changed".to_string(),
        "COMMENT_UPDATED" => "Comment updated".to_string(),
        _ => event_type.to_string(),
    }
}

fn notification_type_icon(event_type: &str, state: &str) -> &'static str {
    match event_type {
        "NEW_COMMENT" => "comment2",
        "NEW_ISSUE" | "ISSUE_STATE_CHANGED" if state == "closed" => "list-alt closed",
        "NEW_ISSUE" | "ISSUE_STATE_CHANGED" => "list-alt",
        "ISSUE_ASSIGNEE_CHANGED" => "friends changed",
        "ISSUE_BODY_CHANGED" | "COMMENT_UPDATED" => "ellipsis-horizontal",
        _ => "megaphone",
    }
}

fn notification_mail_is_due(created: Option<DateTime>, now: DateTime, delay_ms: i64) -> bool {
    let Some(created) = created else {
        return false;
    };
    now.signed_duration_since(created).num_milliseconds() >= delay_ms.max(0)
}

fn random_workspace_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect()
}

fn prefixed_verification_code(prefix: &str) -> String {
    format!("{prefix}{}", random_workspace_token())
}

fn current_datetime() -> DateTime {
    DateTimeUtc::from(SystemTime::now()).naive_utc()
}

fn project_webhook_record_from_model(row: webhook::Model) -> ProjectWebhookRecord {
    ProjectWebhookRecord {
        git_push: row.git_push.unwrap_or_default() != 0,
        id: row.id,
        payload_url: row.payload_url.unwrap_or_default(),
        secret: row.secret.unwrap_or_default(),
        webhook_type: row.webhook_type.unwrap_or_default(),
    }
}

fn current_timestamp_millis() -> i64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

fn days_ago_datetime(days: u64) -> DateTime {
    let seconds = days.saturating_mul(24 * 60 * 60);
    let cutoff = SystemTime::now()
        .checked_sub(Duration::from_secs(seconds))
        .unwrap_or(SystemTime::UNIX_EPOCH);
    DateTimeUtc::from(cutoff).naive_utc()
}

fn format_workspace_date_label(value: Option<DateTime>) -> String {
    value
        .map(|value| value.format("%Y-%m-%d").to_string())
        .unwrap_or_default()
}

fn looks_like_email_address(value: &str) -> bool {
    let trimmed = value.trim();
    let Some((local, domain)) = trimmed.split_once('@') else {
        return false;
    };
    !local.is_empty()
        && !domain.is_empty()
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && domain.contains('.')
}

fn issue_state_from_raw(value: Option<i32>) -> String {
    if value.unwrap_or(0) == 0 {
        "open".to_string()
    } else {
        "closed".to_string()
    }
}

fn sort_issue_models_for_organization(
    items: &mut [(issue::Model, ProjectRecord)],
    order_by: &str,
    order_dir: &str,
) {
    let descending = normalize_identity(order_dir) != "asc";
    let normalized_order = normalize_identity(order_by);
    items.sort_by(|(left, _), (right, _)| {
        let ordering = match normalized_order.as_str() {
            "duedate" => left.due_date.cmp(&right.due_date),
            "updateddate" => left.updated_date.cmp(&right.updated_date),
            "numofcomments" => left
                .num_of_comments
                .unwrap_or_default()
                .cmp(&right.num_of_comments.unwrap_or_default()),
            _ => left.created_date.cmp(&right.created_date),
        }
        .then_with(|| left.id.cmp(&right.id));

        if descending {
            ordering.reverse()
        } else {
            ordering
        }
    });
}

fn sort_posting_models(
    items: &mut [(posting::Model, ProjectRecord)],
    order_by: &str,
    order_dir: &str,
) {
    let descending = normalize_identity(order_dir) != "asc";
    let normalized_order = normalize_identity(order_by);
    items.sort_by(|(left, _), (right, _)| {
        let ordering = match normalized_order.as_str() {
            "updateddate" => left.updated_date.cmp(&right.updated_date),
            "numofcomments" => left
                .num_of_comments
                .unwrap_or_default()
                .cmp(&right.num_of_comments.unwrap_or_default()),
            _ => left.created_date.cmp(&right.created_date),
        }
        .then_with(|| left.number.cmp(&right.number))
        .then_with(|| left.id.cmp(&right.id));

        if descending {
            ordering.reverse()
        } else {
            ordering
        }
    });
}

fn bool_to_i16(value: bool) -> i16 {
    if value {
        1
    } else {
        0
    }
}

fn is_unique_posting_number_conflict(error: &DbErr) -> bool {
    let message = error.to_string().to_ascii_lowercase();
    (message.contains("unique") || message.contains("duplicate"))
        && message.contains("posting")
        && (message.contains("number") || message.contains("uq_posting_1"))
}

fn issue_label_category_record(row: issue_label_category::Model) -> IssueLabelCategoryRecord {
    IssueLabelCategoryRecord {
        id: row.id,
        is_exclusive: row.is_exclusive.unwrap_or_default() != 0,
        name: row.name.unwrap_or_default(),
    }
}

fn sql_placeholders(backend: DatabaseBackend, count: usize) -> Vec<String> {
    match backend {
        DatabaseBackend::Postgres => (1..=count).map(|index| format!("${index}")).collect(),
        _ => (0..count).map(|_| "?".to_string()).collect(),
    }
}

fn pull_request_state_from_raw(value: Option<i32>, is_conflict: Option<i16>) -> String {
    if is_conflict.unwrap_or_default() != 0 {
        return "conflict".to_string();
    }

    pull_request_lifecycle_state(value)
}

fn pull_request_lifecycle_state(value: Option<i32>) -> String {
    match value.unwrap_or(1) {
        6 => "merged".to_string(),
        2 => "closed".to_string(),
        _ => "open".to_string(),
    }
}

fn pull_request_open_condition() -> Condition {
    Condition::any()
        .add(pull_request::Column::State.eq(Some(1)))
        .add(pull_request::Column::State.is_null())
}

fn pull_request_closed_condition() -> Condition {
    Condition::any()
        .add(pull_request::Column::State.eq(Some(2)))
        .add(pull_request::Column::State.eq(Some(6)))
}

fn review_thread_state(value: Option<&str>) -> String {
    match value.map(normalize_identity).as_deref() {
        Some("closed") => "closed".to_string(),
        _ => "open".to_string(),
    }
}

fn review_thread_open_condition() -> Condition {
    Condition::any()
        .add(comment_thread::Column::State.is_null())
        .add(
            Condition::all()
                .add(comment_thread::Column::State.ne(Some("closed".to_string())))
                .add(comment_thread::Column::State.ne(Some("CLOSED".to_string()))),
        )
}

fn review_thread_closed_condition() -> Condition {
    Condition::any()
        .add(comment_thread::Column::State.eq(Some("closed".to_string())))
        .add(comment_thread::Column::State.eq(Some("CLOSED".to_string())))
}

#[derive(Debug, FromQueryResult)]
struct ProjectRow {
    created_date: Option<DateTime>,
    id: i64,
    is_code_accessible_member_only: Option<i16>,
    last_pushed_date: Option<DateTime>,
    name: Option<String>,
    original_project_id: Option<i64>,
    overview: Option<String>,
    owner: Option<String>,
    organization_id: Option<i64>,
    project_scope: Option<String>,
}

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

impl AppRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create_user(&self, input: CreateUserInput) -> Result<AppUserRecord, DbErr> {
        let created = n4user::ActiveModel {
            id: NotSet,
            name: Set(Some(input.display_name.clone())),
            login_id: Set(Some(normalize_identity(&input.login_id))),
            password: Set(Some(input.password_hash.clone())),
            password_salt: Set(None),
            email: Set(Some(normalize_identity(&input.email_address))),
            remember_me: Set(Some(0)),
            state: Set(user_state_from_confirmed(input.is_confirmed)),
            last_state_modified_date: Set(None),
            created_date: Set(Some(current_datetime())),
            lang: Set(None),
            token: Set(None),
            is_guest: Set(Some(0)),
            english_name: Set(None),
        }
        .insert(&self.db)
        .await?;

        if input.is_site_admin {
            self.ensure_site_admin(created.id).await?;
        }

        self.find_user_by_id(created.id)
            .await?
            .ok_or_else(|| DbErr::Custom("created user missing".to_string()))
    }

    pub async fn find_user_by_identifier(
        &self,
        identifier: &str,
    ) -> Result<Option<AppUserRecord>, DbErr> {
        let normalized = normalize_identity(identifier);
        if normalized.is_empty() {
            return Ok(None);
        }

        let users = n4user::Entity::find().all(&self.db).await?;
        for user in users {
            let login_matches = normalize_optional(user.login_id.as_deref()).as_deref()
                == Some(normalized.as_str());
            let email_matches =
                normalize_optional(user.email.as_deref()).as_deref() == Some(normalized.as_str());
            if login_matches || email_matches {
                return self.app_user_record_from_model(user).await.map(Some);
            }
        }

        Ok(None)
    }

    pub async fn find_user_by_login_id(
        &self,
        login_id: &str,
    ) -> Result<Option<AppUserRecord>, DbErr> {
        let normalized = normalize_identity(login_id);
        if normalized.is_empty() {
            return Ok(None);
        }

        let users = n4user::Entity::find().all(&self.db).await?;
        for user in users {
            let login_matches = normalize_optional(user.login_id.as_deref()).as_deref()
                == Some(normalized.as_str());
            if login_matches {
                return self.app_user_record_from_model(user).await.map(Some);
            }
        }

        Ok(None)
    }

    pub async fn find_user_by_id(&self, user_id: i64) -> Result<Option<AppUserRecord>, DbErr> {
        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Ok(None);
        };

        self.app_user_record_from_model(user).await.map(Some)
    }

    pub async fn user_login_id_exists(&self, login_id: &str) -> Result<bool, DbErr> {
        let normalized = normalize_identity(login_id);
        if normalized.is_empty() {
            return Ok(false);
        }

        let users = n4user::Entity::find().all(&self.db).await?;
        Ok(users.into_iter().any(|user| {
            normalize_optional(user.login_id.as_deref()).as_deref() == Some(normalized.as_str())
        }))
    }

    pub async fn list_projects(&self) -> Result<Vec<ProjectRecord>, DbErr> {
        let rows = project::Entity::find()
            .select_only()
            .column(project::Column::CreatedDate)
            .column(project::Column::Id)
            .column(project::Column::IsCodeAccessibleMemberOnly)
            .column(project::Column::LastPushedDate)
            .column(project::Column::Name)
            .column(project::Column::OriginalProjectId)
            .column(project::Column::Overview)
            .column(project::Column::Owner)
            .column(project::Column::OrganizationId)
            .column(project::Column::ProjectScope)
            .order_by_asc(project::Column::Owner)
            .order_by_asc(project::Column::Name)
            .into_model::<ProjectRow>()
            .all(&self.db)
            .await?;

        let mut projects = Vec::new();
        for row in rows {
            if let Some(record) = self.project_record_from_row(row).await? {
                projects.push(record);
            }
        }

        Ok(projects)
    }

    pub async fn list_organizations(&self) -> Result<Vec<OrganizationRecord>, DbErr> {
        let rows = organization::Entity::find()
            .order_by_asc(organization::Column::Name)
            .all(&self.db)
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| self.organization_record_from_model(row))
            .collect())
    }

    pub async fn search_app(
        &self,
        input: SearchRepositoryInput,
    ) -> Result<Option<SearchResultRecord>, DbErr> {
        const PAGE_SIZE: u32 = 20;

        let context = match input.scope {
            SearchScope::Global => SearchContextRecord {
                organization_name: String::new(),
                owner_name: String::new(),
                project_name: String::new(),
            },
            SearchScope::Organization => {
                let organization_name = input.organization_name.clone().unwrap_or_default();
                let Some(organization) = self.read_organization_by_name(&organization_name).await?
                else {
                    return Ok(None);
                };
                SearchContextRecord {
                    organization_name: organization.organization_name,
                    owner_name: String::new(),
                    project_name: String::new(),
                }
            }
            SearchScope::Project => {
                let owner_name = input.owner_name.clone().unwrap_or_default();
                let project_name = input.project_name.clone().unwrap_or_default();
                let Some(project) = self
                    .read_project_by_owner_and_name(&owner_name, &project_name)
                    .await?
                else {
                    return Ok(None);
                };
                SearchContextRecord {
                    organization_name: project.organization_name.unwrap_or_default(),
                    owner_name: project.owner_name,
                    project_name: project.project_name,
                }
            }
        };

        let issues = self.search_issue_items(&input).await?;
        let users = self.search_user_items(&input).await?;
        let projects = if input.scope == SearchScope::Project {
            Vec::new()
        } else {
            self.search_project_items(&input).await?
        };
        let posts = self.search_post_items(&input).await?;
        let milestones = self.search_milestone_items(&input).await?;
        let issue_comments = self.search_issue_comment_items(&input).await?;
        let post_comments = self.search_post_comment_items(&input).await?;
        let reviews = self.search_review_items(&input).await?;

        let counts = SearchCountsRecord {
            issues: issues.len() as u32,
            users: users.len() as u32,
            projects: projects.len() as u32,
            posts: posts.len() as u32,
            milestones: milestones.len() as u32,
            issue_comments: issue_comments.len() as u32,
            post_comments: post_comments.len() as u32,
            reviews: reviews.len() as u32,
        };
        let resolved = resolve_search_type(
            SearchType::from_wire(&input.search_type).unwrap_or(SearchType::Issue),
            &SearchTypeCounts {
                issues: counts.issues,
                users: counts.users,
                projects: counts.projects,
                posts: counts.posts,
                milestones: counts.milestones,
                issue_comments: counts.issue_comments,
                post_comments: counts.post_comments,
                reviews: counts.reviews,
            },
            input.scope != SearchScope::Project,
        );
        let selected = match resolved {
            SearchType::Issue | SearchType::Auto => issues,
            SearchType::User => users,
            SearchType::Project => projects,
            SearchType::Post => posts,
            SearchType::Milestone => milestones,
            SearchType::IssueComment => issue_comments,
            SearchType::PostComment => post_comments,
            SearchType::Review => reviews,
        };
        let total_count = selected.len() as u32;
        let page_num = input.page_num.max(1);
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let items = selected
            .into_iter()
            .skip(offset)
            .take(PAGE_SIZE as usize)
            .collect();

        Ok(Some(SearchResultRecord {
            context,
            counts,
            items,
            keyword: input.keyword,
            page_num,
            page_size: PAGE_SIZE,
            requested_search_type: input.requested_search_type,
            scope: input.scope.as_str().to_string(),
            search_type: resolved.as_wire().to_string(),
            total_count,
        }))
    }

    async fn search_issue_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = issue::Entity::find()
            .order_by_desc(issue::Column::CreatedDate)
            .order_by_desc(issue::Column::Id)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(project) = self.search_project_for_id(row.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(
                        &project,
                        input.actor_id,
                        row.author_id,
                        self.search_issue_assignee_user_id(row.assignee_id).await?,
                    )
                    .await?
            {
                continue;
            }

            let title = row.title.clone().unwrap_or_default();
            let body = self.read_text_column("issue", "body", row.id).await?;
            if !keyword_matches(&title, &input.keyword) && !keyword_matches(&body, &input.keyword) {
                continue;
            }
            let snippets = self.search_snippets(&title, &body, &input.keyword);
            items.push(SearchItemRecord {
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                created_label: format_workspace_date_label(row.created_date),
                href: format!(
                    "/{}/{}/issue/{}",
                    project.owner_name,
                    project.project_name,
                    row.number.unwrap_or_default()
                ),
                id: row.id.to_string(),
                number: row.number.unwrap_or_default().to_string(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                snippets,
                state: issue_state_from_raw(row.state),
                title,
                r#type: "issue".to_string(),
                updated_label: format_workspace_date_label(row.updated_date.or(row.created_date)),
            });
        }
        Ok(items)
    }

    async fn search_user_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let scoped_user_ids = self.search_scope_user_ids(input).await?;
        let rows = n4user::Entity::find()
            .order_by_asc(n4user::Column::Name)
            .order_by_asc(n4user::Column::LoginId)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            if !n4user_is_active(&row) {
                continue;
            }
            if let Some(scoped_user_ids) = scoped_user_ids.as_ref() {
                if !scoped_user_ids.contains(&row.id) {
                    continue;
                }
            }
            let login_id = row.login_id.clone().unwrap_or_default();
            let display_name = row.name.clone().unwrap_or_else(|| login_id.clone());
            let email = row.email.clone().unwrap_or_default();
            let english_name = row.english_name.clone().unwrap_or_default();
            if ![
                login_id.as_str(),
                display_name.as_str(),
                email.as_str(),
                english_name.as_str(),
            ]
            .iter()
            .any(|value| keyword_matches(value, &input.keyword))
            {
                continue;
            }
            let snippets = self.search_snippets(&display_name, &email, &input.keyword);
            items.push(SearchItemRecord {
                author_label: display_name.clone(),
                author_login_id: login_id.clone(),
                created_label: format_workspace_date_label(row.created_date),
                href: format!("/users/{login_id}"),
                id: row.id.to_string(),
                number: String::new(),
                owner_name: String::new(),
                project_name: String::new(),
                snippets,
                state: row.state.unwrap_or_default(),
                title: display_name,
                r#type: "user".to_string(),
                updated_label: String::new(),
            });
        }
        Ok(items)
    }

    async fn search_project_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let mut items = Vec::new();
        for project in self.list_projects().await? {
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_for_actor(&project, input.actor_id)
                    .await?
            {
                continue;
            }
            let title = format!("{}/{}", project.owner_name, project.project_name);
            let overview = project.overview.clone().unwrap_or_default();
            if !keyword_matches(&title, &input.keyword)
                && !keyword_matches(&overview, &input.keyword)
            {
                continue;
            }
            let snippets = self.search_snippets(&title, &overview, &input.keyword);
            items.push(SearchItemRecord {
                author_label: project.owner_name.clone(),
                author_login_id: project.owner_name.clone(),
                created_label: format_workspace_date_label(project.created_date),
                href: format!("/{}/{}", project.owner_name, project.project_name),
                id: project.id.to_string(),
                number: String::new(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                snippets,
                state: project.project_scope,
                title,
                r#type: "project".to_string(),
                updated_label: format_workspace_date_label(project.last_pushed_date),
            });
        }
        Ok(items)
    }

    async fn search_post_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = posting::Entity::find()
            .order_by_desc(posting::Column::CreatedDate)
            .order_by_desc(posting::Column::Id)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(project) = self.search_project_for_id(row.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(&project, input.actor_id, row.author_id, None)
                    .await?
            {
                continue;
            }
            let title = row.title.clone().unwrap_or_default();
            let body = self.read_text_column("posting", "body", row.id).await?;
            if !keyword_matches(&title, &input.keyword) && !keyword_matches(&body, &input.keyword) {
                continue;
            }
            let snippets = self.search_snippets(&title, &body, &input.keyword);
            items.push(SearchItemRecord {
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                created_label: format_workspace_date_label(row.created_date),
                href: format!(
                    "/{}/{}/post/{}",
                    project.owner_name,
                    project.project_name,
                    row.number.unwrap_or_default()
                ),
                id: row.id.to_string(),
                number: row.number.unwrap_or_default().to_string(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                snippets,
                state: String::new(),
                title,
                r#type: "post".to_string(),
                updated_label: format_workspace_date_label(row.updated_date.or(row.created_date)),
            });
        }
        Ok(items)
    }

    async fn search_milestone_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = milestone::Entity::find()
            .order_by_desc(milestone::Column::DueDate)
            .order_by_desc(milestone::Column::Id)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(project) = self.search_project_for_id(row.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_for_actor(&project, input.actor_id)
                    .await?
            {
                continue;
            }
            let title = row.title.clone().unwrap_or_default();
            let contents = self
                .read_text_column("milestone", "contents", row.id)
                .await?;
            if !keyword_matches(&title, &input.keyword)
                && !keyword_matches(&contents, &input.keyword)
            {
                continue;
            }
            let snippets = self.search_snippets(&title, &contents, &input.keyword);
            items.push(SearchItemRecord {
                author_label: String::new(),
                author_login_id: String::new(),
                created_label: String::new(),
                href: format!(
                    "/{}/{}/milestone/{}",
                    project.owner_name, project.project_name, row.id
                ),
                id: row.id.to_string(),
                number: row.id.to_string(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                snippets,
                state: issue_state_from_raw(row.state),
                title,
                r#type: "milestone".to_string(),
                updated_label: format_workspace_date_label(row.due_date),
            });
        }
        Ok(items)
    }

    async fn search_issue_comment_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = issue_comment::Entity::find()
            .order_by_desc(issue_comment::Column::CreatedDate)
            .order_by_desc(issue_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(issue_id) = row.issue_id else {
                continue;
            };
            let Some(issue) = issue::Entity::find_by_id(issue_id).one(&self.db).await? else {
                continue;
            };
            let Some(project) = self.search_project_for_id(issue.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(&project, input.actor_id, row.author_id, None)
                    .await?
            {
                continue;
            }
            let contents = self
                .read_text_column("issue_comment", "contents", row.id)
                .await?;
            if !keyword_matches(&contents, &input.keyword) {
                continue;
            }
            let title = format!("Re) {}", issue.title.unwrap_or_default());
            items.push(SearchItemRecord {
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                created_label: format_workspace_date_label(row.created_date),
                href: format!(
                    "/{}/{}/issue/{}#comment-{}",
                    project.owner_name,
                    project.project_name,
                    issue.number.unwrap_or_default(),
                    row.id
                ),
                id: row.id.to_string(),
                number: issue.number.unwrap_or_default().to_string(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                snippets: make_snippets(&contents, &input.keyword, 40),
                state: issue_state_from_raw(issue.state),
                title,
                r#type: "issue_comment".to_string(),
                updated_label: String::new(),
            });
        }
        Ok(items)
    }

    async fn search_post_comment_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = posting_comment::Entity::find()
            .order_by_desc(posting_comment::Column::CreatedDate)
            .order_by_desc(posting_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(posting_id) = row.posting_id else {
                continue;
            };
            let Some(posting) = posting::Entity::find_by_id(posting_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            let Some(project) = self.search_project_for_id(posting.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(&project, input.actor_id, row.author_id, None)
                    .await?
            {
                continue;
            }
            let contents = self
                .read_text_column("posting_comment", "contents", row.id)
                .await?;
            if !keyword_matches(&contents, &input.keyword) {
                continue;
            }
            let title = format!("Re) {}", posting.title.unwrap_or_default());
            items.push(SearchItemRecord {
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                created_label: format_workspace_date_label(row.created_date),
                href: format!(
                    "/{}/{}/post/{}#comment-{}",
                    project.owner_name,
                    project.project_name,
                    posting.number.unwrap_or_default(),
                    row.id
                ),
                id: row.id.to_string(),
                number: posting.number.unwrap_or_default().to_string(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                snippets: make_snippets(&contents, &input.keyword, 40),
                state: String::new(),
                title,
                r#type: "post_comment".to_string(),
                updated_label: String::new(),
            });
        }
        Ok(items)
    }

    async fn search_review_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = review_comment::Entity::find()
            .order_by_desc(review_comment::Column::CreatedDate)
            .order_by_desc(review_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(thread_id) = row.thread_id else {
                continue;
            };
            let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            let Some(pull_request_id) = thread.pull_request_id else {
                continue;
            };
            let Some(pull_request) = pull_request::Entity::find_by_id(pull_request_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            let project_id = thread.project_id.or(pull_request.to_project_id);
            let Some(project) = self.search_project_for_id(project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(&project, input.actor_id, row.author_id, None)
                    .await?
            {
                continue;
            }
            let contents = self
                .read_text_column("review_comment", "contents", row.id)
                .await?;
            let pull_title = pull_request.title.clone().unwrap_or_default();
            if !keyword_matches(&contents, &input.keyword)
                && !keyword_matches(&pull_title, &input.keyword)
            {
                continue;
            }
            let snippets = self.search_snippets(&pull_title, &contents, &input.keyword);
            items.push(SearchItemRecord {
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                created_label: format_workspace_date_label(row.created_date),
                href: format!(
                    "/{}/{}/pullRequest/{}#comment-{}",
                    project.owner_name,
                    project.project_name,
                    pull_request.number.unwrap_or_default(),
                    row.id
                ),
                id: row.id.to_string(),
                number: pull_request.number.unwrap_or_default().to_string(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                snippets,
                state: pull_request_state_from_raw(pull_request.state, pull_request.is_conflict),
                title: format!("Re) {pull_title}"),
                r#type: "review".to_string(),
                updated_label: String::new(),
            });
        }
        Ok(items)
    }

    async fn search_project_for_id(
        &self,
        project_id: Option<i64>,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let Some(project_id) = project_id else {
            return Ok(None);
        };
        self.read_project_by_id(project_id).await
    }

    async fn search_issue_assignee_user_id(
        &self,
        assignee_id: Option<i64>,
    ) -> Result<Option<i64>, DbErr> {
        let Some(assignee_id) = assignee_id else {
            return Ok(None);
        };
        Ok(assignee::Entity::find_by_id(assignee_id)
            .one(&self.db)
            .await?
            .and_then(|row| row.user_id))
    }

    fn search_project_matches_scope(
        &self,
        project: &ProjectRecord,
        input: &SearchRepositoryInput,
    ) -> bool {
        match input.scope {
            SearchScope::Global => true,
            SearchScope::Organization => {
                input
                    .organization_name
                    .as_deref()
                    .is_some_and(|organization_name| {
                        project
                            .organization_name
                            .as_deref()
                            .is_some_and(|project_organization| {
                                normalize_identity(project_organization)
                                    == normalize_identity(organization_name)
                            })
                    })
            }
            SearchScope::Project => {
                let owner_matches = input.owner_name.as_deref().is_some_and(|owner_name| {
                    normalize_identity(&project.owner_name) == normalize_identity(owner_name)
                });
                let project_matches = input.project_name.as_deref().is_some_and(|project_name| {
                    normalize_identity(&project.project_name) == normalize_identity(project_name)
                });
                owner_matches && project_matches
            }
        }
    }

    async fn search_project_visible_or_self(
        &self,
        project: &ProjectRecord,
        actor_id: Option<i64>,
        author_id: Option<i64>,
        assignee_user_id: Option<i64>,
    ) -> Result<bool, DbErr> {
        if self
            .search_project_visible_for_actor(project, actor_id)
            .await?
        {
            return Ok(true);
        }
        Ok(actor_id.is_some_and(|actor_id| {
            author_id == Some(actor_id) || assignee_user_id == Some(actor_id)
        }))
    }

    async fn search_project_visible_for_actor(
        &self,
        project: &ProjectRecord,
        actor_id: Option<i64>,
    ) -> Result<bool, DbErr> {
        let project_scope = normalize_identity(&project.project_scope);
        if project_scope == "public" {
            return Ok(true);
        }
        let Some(actor_id) = actor_id else {
            return Ok(false);
        };
        let Some(authorization) = self
            .read_project_authorization(&project.owner_name, &project.project_name, Some(actor_id))
            .await?
        else {
            return Ok(false);
        };
        let viewer = authorization.viewer;
        if viewer.is_site_admin || viewer.is_organization_admin {
            return Ok(true);
        }
        if viewer.is_project_manager || viewer.is_project_member {
            return Ok(true);
        }
        Ok(project_scope == "protected" && viewer.is_organization_member)
    }

    async fn search_scope_user_ids(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Option<HashSet<i64>>, DbErr> {
        match input.scope {
            SearchScope::Global => Ok(None),
            SearchScope::Organization => {
                let organization_name = input.organization_name.clone().unwrap_or_default();
                let Some(organization) = self.read_organization_by_name(&organization_name).await?
                else {
                    return Ok(Some(HashSet::new()));
                };
                let rows = organization_user::Entity::find()
                    .filter(organization_user::Column::OrganizationId.eq(Some(organization.id)))
                    .all(&self.db)
                    .await?;
                Ok(Some(
                    rows.into_iter().filter_map(|row| row.user_id).collect(),
                ))
            }
            SearchScope::Project => {
                let owner_name = input.owner_name.clone().unwrap_or_default();
                let project_name = input.project_name.clone().unwrap_or_default();
                let Some(project) = self
                    .read_project_by_owner_and_name(&owner_name, &project_name)
                    .await?
                else {
                    return Ok(Some(HashSet::new()));
                };
                let mut user_ids = project_user::Entity::find()
                    .filter(project_user::Column::ProjectId.eq(Some(project.id)))
                    .all(&self.db)
                    .await?
                    .into_iter()
                    .filter_map(|row| row.user_id)
                    .collect::<HashSet<_>>();
                if let Some(organization_id) = project.organization_id {
                    user_ids.extend(
                        organization_user::Entity::find()
                            .filter(
                                organization_user::Column::OrganizationId.eq(Some(organization_id)),
                            )
                            .all(&self.db)
                            .await?
                            .into_iter()
                            .filter_map(|row| row.user_id),
                    );
                }
                Ok(Some(user_ids))
            }
        }
    }

    fn search_snippets(&self, title: &str, body: &str, keyword: &str) -> Vec<SearchSnippet> {
        let title_snippets = make_snippets(title, keyword, 40);
        if !title_snippets.is_empty() {
            return title_snippets;
        }
        make_snippets(body, keyword, 40)
    }

    pub async fn read_issue_detail(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) -> Result<Option<IssueRecord>, DbErr> {
        self.read_issue_detail_for_viewer(owner_name, project_name, issue_number, None)
            .await
    }

    pub async fn read_issue_detail_for_viewer(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        viewer_id: Option<i64>,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        let issue = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::Number.eq(Some(issue_number)))
            .one(&self.db)
            .await?;

        match issue {
            Some(issue) => self
                .issue_record_from_model(issue, &project, viewer_id)
                .await
                .map(Some),
            None => Ok(None),
        }
    }

    pub async fn read_issue_share_status(
        &self,
        issue_id: i64,
        user_id: i64,
    ) -> Result<IssueShareStatus, DbErr> {
        let direct = self.has_direct_issue_share(issue_id, user_id).await?;
        let inherited_from_parent = match issue::Entity::find_by_id(issue_id).one(&self.db).await? {
            Some(model) => match model.parent_id {
                Some(parent_id) => self.has_direct_issue_share(parent_id, user_id).await?,
                None => false,
            },
            None => false,
        };

        Ok(IssueShareStatus {
            direct,
            inherited_from_parent,
        })
    }

    async fn list_assignable_users_for_project(
        &self,
        project_record: &ProjectRecord,
        current_assignee_user_id: Option<i64>,
        query: &str,
        search_type: &str,
        limit: usize,
    ) -> Result<IssueAssignableUserSearchRecord, DbErr> {
        let query = query.trim();
        if query.is_empty() {
            return Ok(IssueAssignableUserSearchRecord {
                items: vec![],
                total: 0,
                truncated: false,
            });
        }

        let visible_user_ids = if normalize_identity(&project_record.project_scope) == "public" {
            None
        } else {
            Some(self.assignable_member_user_ids(project_record).await?)
        };
        let mut matches = n4user::Entity::find()
            .order_by_asc(n4user::Column::LoginId)
            .all(&self.db)
            .await?
            .into_iter()
            .filter(|user| issue_assignable_user_matches(user, query, search_type))
            .filter(|user| {
                let is_current_assignee = current_assignee_user_id == Some(user.id);
                let is_active =
                    normalize_optional(user.state.as_deref()).as_deref() == Some("active");
                let is_visible = visible_user_ids
                    .as_ref()
                    .is_none_or(|user_ids| user_ids.contains(&user.id));
                is_current_assignee || (is_active && is_visible)
            })
            .map(issue_assignable_user_record)
            .collect::<Vec<_>>();

        matches.sort_by(|left, right| {
            normalize_identity(&left.display_name)
                .cmp(&normalize_identity(&right.display_name))
                .then_with(|| {
                    normalize_identity(&left.login_id).cmp(&normalize_identity(&right.login_id))
                })
        });
        let total = matches.len() as u32;
        let truncated = matches.len() > limit;
        matches.truncate(limit);

        Ok(IssueAssignableUserSearchRecord {
            items: matches,
            total,
            truncated,
        })
    }

    pub async fn list_project_assignable_users(
        &self,
        owner_name: &str,
        project_name: &str,
        query: &str,
        search_type: &str,
        limit: usize,
    ) -> Result<Option<IssueAssignableUserSearchRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        self.list_assignable_users_for_project(&project_record, None, query, search_type, limit)
            .await
            .map(Some)
    }

    pub async fn list_issue_assignable_users(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        query: &str,
        search_type: &str,
        limit: usize,
    ) -> Result<Option<IssueAssignableUserSearchRecord>, DbErr> {
        let Some((project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };

        let current_assignee_user_id = match issue_model.assignee_id {
            Some(assignee_id) => assignee::Entity::find_by_id(assignee_id)
                .one(&self.db)
                .await?
                .and_then(|row| row.user_id),
            None => None,
        };

        self.list_assignable_users_for_project(
            &project_record,
            current_assignee_user_id,
            query,
            search_type,
            limit,
        )
        .await
        .map(Some)
    }

    pub async fn list_issue_sharable_users(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        query: &str,
        search_type: &str,
        limit: usize,
    ) -> Result<Option<IssueAssignableUserSearchRecord>, DbErr> {
        if self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
            .is_none()
        {
            return Ok(None);
        }

        let query = query.trim();
        if query.is_empty() {
            return Ok(Some(IssueAssignableUserSearchRecord {
                items: vec![],
                total: 0,
                truncated: false,
            }));
        }

        let mut matches = n4user::Entity::find()
            .order_by_asc(n4user::Column::LoginId)
            .all(&self.db)
            .await?
            .into_iter()
            .filter(n4user_is_active)
            .filter(|user| issue_assignable_user_matches(user, query, search_type))
            .map(issue_assignable_user_record)
            .collect::<Vec<_>>();
        matches.extend(
            self.list_projects()
                .await?
                .into_iter()
                .filter(|project| normalize_identity(&project.project_scope) == "public")
                .filter(|project| {
                    normalize_identity(&project.project_name).contains(&normalize_identity(query))
                })
                .map(issue_sharable_project_record),
        );
        let total = matches.len() as u32;
        let truncated = matches.len() > limit;
        matches.truncate(limit);

        Ok(Some(IssueAssignableUserSearchRecord {
            items: matches,
            total,
            truncated,
        }))
    }

    pub async fn list_issue_mention_users(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        actor_id: Option<i64>,
        query: &str,
        _context: &str,
        limit: usize,
    ) -> Result<Option<IssueMentionUserSearchRecord>, DbErr> {
        let Some((project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };

        let query = query.trim();
        let mut records =
            if query.is_empty() || normalize_identity(&project_record.project_scope) != "public" {
                self.contextual_issue_mention_users(&project_record, &issue_model, actor_id)
                    .await?
            } else {
                n4user::Entity::find()
                    .order_by_asc(n4user::Column::LoginId)
                    .all(&self.db)
                    .await?
                    .into_iter()
                    .filter(n4user_is_active)
                    .filter(|user| issue_assignable_user_matches(user, query, ""))
                    .map(issue_mention_user_record)
                    .collect::<Vec<_>>()
            };

        if !query.is_empty() {
            records.retain(|record| mention_text_matches(record, query));
        }
        self.append_project_mention_targets(&project_record, query, &mut records)
            .await?;

        let total = records.len() as u32;
        let truncated = records.len() > limit;
        records.truncate(limit);

        Ok(Some(IssueMentionUserSearchRecord {
            items: records,
            total,
            truncated,
        }))
    }

    pub async fn list_project_issue_references(
        &self,
        project_id: i64,
        query: &str,
        limit: usize,
    ) -> Result<ProjectIssueReferenceSearchRecord, DbErr> {
        let query = query.trim();
        let normalized_query = normalize_identity(query);
        let mut models = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?;

        if query.is_empty() {
            models.sort_by(|left, right| {
                right.created_date.cmp(&left.created_date).then_with(|| {
                    right
                        .number
                        .unwrap_or_default()
                        .cmp(&left.number.unwrap_or_default())
                })
            });
            let total = models.len() as u32;
            let truncated = models.len() > limit;
            models.truncate(limit);
            return Ok(ProjectIssueReferenceSearchRecord {
                items: models.iter().map(project_issue_reference_record).collect(),
                total,
                truncated,
            });
        }

        let mut matches = models
            .into_iter()
            .filter_map(|model| {
                let issue_number = model.number.unwrap_or_default().to_string();
                let exact_number_match = issue_number == normalized_query;
                let number_prefix_match = issue_number.starts_with(&normalized_query);
                let title_match = model
                    .title
                    .as_deref()
                    .is_some_and(|title| normalize_identity(title).contains(&normalized_query));
                (number_prefix_match || title_match).then_some((
                    model,
                    exact_number_match,
                    number_prefix_match,
                    title_match,
                ))
            })
            .collect::<Vec<_>>();

        matches.sort_by(|left, right| {
            right
                .1
                .cmp(&left.1)
                .then_with(|| right.2.cmp(&left.2))
                .then_with(|| right.3.cmp(&left.3))
                .then_with(|| right.0.created_date.cmp(&left.0.created_date))
                .then_with(|| {
                    right
                        .0
                        .number
                        .unwrap_or_default()
                        .cmp(&left.0.number.unwrap_or_default())
                })
        });

        let total = matches.len() as u32;
        let truncated = matches.len() > limit;
        matches.truncate(limit);

        Ok(ProjectIssueReferenceSearchRecord {
            items: matches
                .iter()
                .map(|(model, _, _, _)| project_issue_reference_record(model))
                .collect(),
            total,
            truncated,
        })
    }

    pub async fn add_issue_sharer(
        &self,
        issue_id: i64,
        user_id: i64,
        login_id: &str,
    ) -> Result<bool, DbErr> {
        if self.has_direct_issue_share(issue_id, user_id).await? {
            return Ok(false);
        }

        issue_sharer::ActiveModel {
            id: NotSet,
            created: Set(Some(current_datetime().date())),
            login_id: Set(Some(normalize_identity(login_id))),
            user_id: Set(Some(user_id)),
            issue_id: Set(Some(issue_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(true)
    }

    pub async fn remove_issue_sharer(&self, issue_id: i64, user_id: i64) -> Result<bool, DbErr> {
        let result = issue_sharer::Entity::delete_many()
            .filter(issue_sharer::Column::IssueId.eq(Some(issue_id)))
            .filter(issue_sharer::Column::UserId.eq(Some(user_id)))
            .exec(&self.db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    pub async fn record_issue_sharer_changed(
        &self,
        issue_id: i64,
        actor_id: i64,
        actor_login_id: &str,
        sharer_user_id: i64,
        sharer_login_id: &str,
        action: &str,
    ) -> Result<(), DbErr> {
        let (old_value, new_value) = if action == "share" {
            ("", sharer_login_id)
        } else {
            (sharer_login_id, "")
        };
        self.create_issue_event(
            issue_id,
            actor_login_id,
            "ISSUE_SHARER_CHANGED",
            old_value,
            new_value,
        )
        .await?;
        self.create_notification_event_for_receivers(
            actor_id,
            "issue",
            &issue_id.to_string(),
            "ISSUE_SHARER_CHANGED",
            old_value,
            new_value,
            &[sharer_user_id],
        )
        .await
    }

    pub async fn is_issue_favorited_by(&self, issue_id: i64, user_id: i64) -> Result<bool, DbErr> {
        Ok(favorite_issue::Entity::find()
            .filter(favorite_issue::Column::IssueId.eq(Some(issue_id)))
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_some())
    }

    pub async fn toggle_favorite_issue(
        &self,
        issue_id: i64,
        user_id: i64,
    ) -> Result<ToggleFavoriteIssueResult, DbErr> {
        if let Some(existing) = favorite_issue::Entity::find()
            .filter(favorite_issue::Column::IssueId.eq(Some(issue_id)))
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            favorite_issue::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
            return Ok(ToggleFavoriteIssueResult {
                favorited: false,
                issue_id,
            });
        }

        favorite_issue::ActiveModel {
            id: NotSet,
            issue_id: Set(Some(issue_id)),
            user_id: Set(Some(user_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(ToggleFavoriteIssueResult {
            favorited: true,
            issue_id,
        })
    }

    pub async fn list_user_issue_candidates(
        &self,
        user_id: i64,
        filter: UserIssueListFilter,
    ) -> Result<Vec<UserIssueCandidateRecord>, DbErr> {
        let normalized_filter = normalize_identity(&filter.filter);
        let assignee_ids = assignee::Entity::find()
            .filter(assignee::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<HashSet<_>>();
        let commented_issue_ids = issue_comment::Entity::find()
            .filter(issue_comment::Column::AuthorId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.issue_id)
            .collect::<HashSet<_>>();
        let mention_rows = mention::Entity::find()
            .filter(mention::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        let mut mentioned_issue_ids = HashSet::new();
        let mut mentioned_comment_ids = Vec::new();
        for row in mention_rows {
            let Some(resource_id) = row.resource_id.and_then(|value| value.parse::<i64>().ok())
            else {
                continue;
            };
            let resource_type = row
                .resource_type
                .as_deref()
                .map(normalize_identity)
                .unwrap_or_default();
            match resource_type.as_str() {
                "issue" | "issue_post" => {
                    mentioned_issue_ids.insert(resource_id);
                }
                "issue_comment" => mentioned_comment_ids.push(resource_id),
                _ => {}
            }
        }
        for comment in issue_comment::Entity::find()
            .filter(issue_comment::Column::Id.is_in(mentioned_comment_ids))
            .all(&self.db)
            .await?
        {
            if let Some(issue_id) = comment.issue_id {
                mentioned_issue_ids.insert(issue_id);
            }
        }
        let shared_issue_ids = issue_sharer::Entity::find()
            .filter(issue_sharer::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.issue_id)
            .collect::<HashSet<_>>();
        let favorite_issue_ids = favorite_issue::Entity::find()
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.issue_id)
            .collect::<HashSet<_>>();

        let rows = issue::Entity::find().all(&self.db).await?;
        let mut matches = Vec::new();
        for row in rows {
            if row.is_draft.unwrap_or_default() != 0 {
                continue;
            }
            let issue_id = row.id;
            let filter_matches = match normalized_filter.as_str() {
                "authored" => row.author_id == Some(user_id),
                "commented" => commented_issue_ids.contains(&issue_id),
                "mentioned" => mentioned_issue_ids.contains(&issue_id),
                "shared" => shared_issue_ids.contains(&issue_id),
                "favorite" => favorite_issue_ids.contains(&issue_id),
                _ => row
                    .assignee_id
                    .is_some_and(|assignee_id| assignee_ids.contains(&assignee_id)),
            };
            if !filter_matches {
                continue;
            }
            if issue_state_from_raw(row.state) != normalize_identity(&filter.state) {
                continue;
            }
            if let Some(query) = filter.query.as_deref() {
                if !self.issue_model_matches_text_filter(&row, query).await? {
                    continue;
                }
            }
            let Some(project_id) = row.project_id else {
                continue;
            };
            let Some(project) = self.read_project_by_id(project_id).await? else {
                continue;
            };
            matches.push((row, project));
        }

        sort_issue_models_for_organization(&mut matches, &filter.order_by, &filter.order_dir);

        let mut candidates = Vec::new();
        for (row, project) in matches {
            let issue_id = row.id;
            candidates.push(UserIssueCandidateRecord {
                issue_id,
                item: self
                    .project_issue_list_item_from_model(row, &project)
                    .await?,
            });
        }

        Ok(candidates)
    }

    pub async fn list_project_issues(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Vec<ProjectIssueListItemRecord>, DbErr> {
        Ok(self
            .list_project_issues_filtered(
                owner_name,
                project_name,
                IssueListFilter {
                    assignee_login_id: None,
                    author_login_id: None,
                    label_ids: Vec::new(),
                    milestone_id: None,
                    page_num: 1,
                    state: None,
                },
            )
            .await?
            .items)
    }

    pub async fn list_project_issues_filtered(
        &self,
        owner_name: &str,
        project_name: &str,
        filter: IssueListFilter,
    ) -> Result<ProjectIssueListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(ProjectIssueListRecord {
                items: Vec::new(),
                page_num: filter.page_num.max(1),
                page_size: PAGE_SIZE,
                total_count: 0,
            });
        };

        let models = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .order_by_desc(issue::Column::CreatedDate)
            .order_by_desc(issue::Column::Number)
            .all(&self.db)
            .await?;

        let mut filtered = Vec::new();
        for model in models {
            if filter.state.as_deref().is_some_and(|state| {
                !state.trim().is_empty()
                    && issue_state_from_raw(model.state) != normalize_identity(state)
            }) {
                continue;
            }
            if filter.author_login_id.as_deref().is_some_and(|login_id| {
                !login_id.trim().is_empty()
                    && model.author_login_id.as_deref().map(normalize_identity)
                        != Some(normalize_identity(login_id))
            }) {
                continue;
            }
            if let Some(milestone_id) = filter.milestone_id {
                if model.milestone_id != Some(milestone_id) {
                    continue;
                }
            }
            if let Some(assignee_login_id) = filter.assignee_login_id.as_deref() {
                if !assignee_login_id.trim().is_empty() {
                    let assignee = self.issue_assignee_summary(model.assignee_id).await?;
                    if assignee.0 != normalize_identity(assignee_login_id) {
                        continue;
                    }
                }
            }
            let labels = self.list_issue_labels(model.id).await?;
            if !filter.label_ids.is_empty()
                && !filter
                    .label_ids
                    .iter()
                    .all(|id| labels.iter().any(|label| label.id == *id))
            {
                continue;
            }

            let (assignee_login_id, assignee_label) =
                self.issue_assignee_summary(model.assignee_id).await?;
            let (milestone_id, milestone_title) =
                self.issue_milestone_summary(model.milestone_id).await?;
            filtered.push(ProjectIssueListItemRecord {
                assignee_label,
                author_label: model.author_name.unwrap_or_default(),
                comment_count: model.num_of_comments.unwrap_or_default().max(0) as u32,
                issue_number: model.number.unwrap_or_default(),
                labels,
                milestone_id,
                milestone_title,
                owner_name: project.owner_name.clone(),
                project_name: project.project_name.clone(),
                state: issue_state_from_raw(model.state),
                title: model.title.unwrap_or_default(),
                updated_label: format_workspace_date_label(model.updated_date),
                voter_count: self.count_issue_voters(model.id).await?,
                watcher_count: self.count_issue_watchers(model.id).await?,
            });
            drop(assignee_login_id);
        }

        let page_num = filter.page_num.max(1);
        let total_count = filtered.len() as u32;
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let items = filtered
            .into_iter()
            .skip(offset)
            .take(PAGE_SIZE as usize)
            .collect();

        Ok(ProjectIssueListRecord {
            items,
            page_num,
            page_size: PAGE_SIZE,
            total_count,
        })
    }

    pub async fn list_organization_issues_filtered(
        &self,
        organization_name: &str,
        visible_projects: Vec<ProjectRecord>,
        filter: OrganizationIssueListFilter,
    ) -> Result<OrganizationIssueListRecord, DbErr> {
        const DEFAULT_PAGE_SIZE: u32 = 15;
        const MAX_PAGE_SIZE: u32 = 45;

        let page_num = filter.page_num.max(1);
        let page_size = if filter.items_per_page == 0 {
            DEFAULT_PAGE_SIZE
        } else {
            filter.items_per_page.min(MAX_PAGE_SIZE)
        };
        let visible_projects = {
            let mut projects = visible_projects;
            projects.sort_by(|left, right| left.project_name.cmp(&right.project_name));
            projects
        };
        let visible_project_options = visible_projects
            .iter()
            .map(|project| OrganizationIssueProjectOptionRecord {
                owner_name: project.owner_name.clone(),
                project_name: project.project_name.clone(),
            })
            .collect::<Vec<_>>();
        let project_by_id = visible_projects
            .iter()
            .cloned()
            .map(|project| (project.id, project))
            .collect::<HashMap<_, _>>();

        if project_by_id.is_empty() {
            return Ok(OrganizationIssueListRecord {
                closed_issue_count: 0,
                items: Vec::new(),
                organization_name: organization_name.to_string(),
                open_issue_count: 0,
                page_num,
                page_size,
                total_count: 0,
                visible_projects: visible_project_options,
            });
        }

        let project_name_filter = filter
            .project_names
            .iter()
            .map(|name| normalize_identity(name))
            .filter(|name| !name.is_empty())
            .collect::<HashSet<_>>();
        let assignee_ids = match filter.assignee_user_id {
            Some(user_id) => assignee::Entity::find()
                .filter(assignee::Column::UserId.eq(Some(user_id)))
                .all(&self.db)
                .await?
                .into_iter()
                .map(|row| row.id)
                .collect::<HashSet<_>>(),
            None => HashSet::new(),
        };

        let rows = issue::Entity::find()
            .filter(issue::Column::ProjectId.is_in(project_by_id.keys().copied().map(Some)))
            .all(&self.db)
            .await?;
        let mut matches_without_state = Vec::new();
        for row in rows {
            if row.is_draft.unwrap_or_default() != 0 {
                continue;
            }
            let Some(project_id) = row.project_id else {
                continue;
            };
            let Some(project) = project_by_id.get(&project_id) else {
                continue;
            };
            if !project_name_filter.is_empty()
                && !project_name_filter.contains(&normalize_identity(&project.project_name))
            {
                continue;
            }
            if filter.author_id.is_some() && row.author_id != filter.author_id {
                continue;
            }
            if filter.assignee_user_id.is_some()
                && !row
                    .assignee_id
                    .is_some_and(|assignee_id| assignee_ids.contains(&assignee_id))
            {
                continue;
            }
            if let Some(text_filter) = filter.filter.as_deref() {
                if !self
                    .issue_model_matches_text_filter(&row, text_filter)
                    .await?
                {
                    continue;
                }
            }
            matches_without_state.push((row, project.clone()));
        }

        let open_issue_count = matches_without_state
            .iter()
            .filter(|(row, _)| issue_state_from_raw(row.state) == "open")
            .count() as u32;
        let closed_issue_count = matches_without_state
            .iter()
            .filter(|(row, _)| issue_state_from_raw(row.state) == "closed")
            .count() as u32;

        let state = normalize_identity(&filter.state);
        let mut state_matches = matches_without_state
            .into_iter()
            .filter(|(row, _)| issue_state_from_raw(row.state) == state)
            .collect::<Vec<_>>();
        sort_issue_models_for_organization(&mut state_matches, &filter.order_by, &filter.order_dir);

        let total_count = state_matches.len() as u32;
        let offset = ((page_num - 1) * page_size) as usize;
        let page_models = state_matches
            .into_iter()
            .skip(offset)
            .take(page_size as usize)
            .collect::<Vec<_>>();
        let mut items = Vec::new();
        for (row, project) in page_models {
            items.push(
                self.project_issue_list_item_from_model(row, &project)
                    .await?,
            );
        }

        Ok(OrganizationIssueListRecord {
            closed_issue_count,
            items,
            organization_name: organization_name.to_string(),
            open_issue_count,
            page_num,
            page_size,
            total_count,
            visible_projects: visible_project_options,
        })
    }

    pub async fn update_issue_state(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        state: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        let update_result = issue::Entity::update_many()
            .col_expr(
                issue::Column::State,
                Expr::value(Some(issue_state_to_raw(state))),
            )
            .filter(issue::Column::ProjectId.eq(Some(project_record.id)))
            .filter(issue::Column::Number.eq(Some(issue_number)))
            .exec(&self.db)
            .await?
            .rows_affected;

        if update_result == 0 {
            return Ok(None);
        }

        self.read_issue_detail(owner_name, project_name, issue_number)
            .await
    }

    pub async fn create_issue(
        &self,
        input: CreateIssueInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let issue_number = self.next_issue_number(project_record.id).await?;
        let assignee_id = self
            .resolve_assignee_id(project_record.id, input.values.assignee_login_id.as_deref())
            .await?;
        let now = current_datetime();
        let created = issue::ActiveModel {
            id: NotSet,
            title: Set(Some(input.values.title.trim().to_string())),
            created_date: Set(Some(now)),
            updated_date: Set(Some(now)),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
            author_name: Set(Some(input.actor_display_name)),
            project_id: Set(Some(project_record.id)),
            number: Set(Some(issue_number)),
            num_of_comments: Set(Some(0)),
            state: Set(Some(issue_state_to_raw("open"))),
            due_date: Set(None),
            milestone_id: Set(input.values.milestone_id.filter(|value| *value > 0)),
            assignee_id: Set(assignee_id),
            parent_id: Set(None),
            weight: Set(None),
            updated_by_author_id: Set(Some(input.actor_id)),
            is_draft: Set(Some(0)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("issue", "body", created.id, &input.values.body_markdown)
            .await?;
        self.sync_mentions_and_notify(
            input.actor_id,
            "issue_post",
            created.id,
            &input.values.body_markdown,
            "NEW_ISSUE",
            "",
            &input.values.body_markdown,
        )
        .await?;

        let mut project_active = project::ActiveModel {
            id: Set(project_record.id),
            ..Default::default()
        };
        project_active.last_issue_number = Set(Some(issue_number));
        project_active.update(&self.db).await?;

        self.replace_issue_labels(created.id, project_record.id, &input.values.label_ids)
            .await?;
        self.bind_attachments("ISSUE", created.id, &input.values.attachment_ids)
            .await?;
        self.watch_issue(created.id, input.actor_id).await?;
        self.issue_record_from_model(created, &project_record, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn update_issue(
        &self,
        input: UpdateIssueInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_issue_model(&input.owner_name, &input.project_name, input.issue_number)
            .await?
        else {
            return Ok(None);
        };
        let assignee_id = self
            .resolve_assignee_id(project_record.id, input.values.assignee_login_id.as_deref())
            .await?;
        let old_state = issue_state_from_raw(model.state);
        let old_assignee = model.assignee_id;
        let old_milestone = model.milestone_id;
        let old_body = self.read_text_column("issue", "body", model.id).await?;
        let actor_id = self
            .find_user_by_login_id(&input.actor_login_id)
            .await?
            .map(|user| user.id)
            .unwrap_or_default();
        let mut active = issue::ActiveModel::from(model);
        active.title = Set(Some(input.values.title.trim().to_string()));
        active.assignee_id = Set(assignee_id);
        active.milestone_id = Set(input.values.milestone_id.filter(|value| *value > 0));
        active.updated_date = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        self.write_text_column("issue", "body", updated.id, &input.values.body_markdown)
            .await?;
        self.sync_mentions_and_notify(
            actor_id,
            "issue_post",
            updated.id,
            &input.values.body_markdown,
            "ISSUE_BODY_CHANGED",
            &old_body,
            &input.values.body_markdown,
        )
        .await?;

        self.replace_issue_labels(updated.id, project_record.id, &input.values.label_ids)
            .await?;
        self.bind_attachments("ISSUE", updated.id, &input.values.attachment_ids)
            .await?;
        if old_assignee != updated.assignee_id {
            self.create_issue_event(
                updated.id,
                &input.actor_login_id,
                "ISSUE_ASSIGNEE_CHANGED",
                &old_assignee
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                &updated
                    .assignee_id
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
            )
            .await?;
        }
        if old_milestone != updated.milestone_id {
            self.create_issue_event(
                updated.id,
                &input.actor_login_id,
                "ISSUE_MILESTONE_CHANGED",
                &old_milestone
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                &updated
                    .milestone_id
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
            )
            .await?;
        }
        let _ = old_state;

        self.issue_record_from_model(updated, &project_record, None)
            .await
            .map(Some)
    }

    pub async fn delete_issue(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) -> Result<bool, DbErr> {
        let Some((_project, model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(false);
        };
        issue_issue_label::Entity::delete_many()
            .filter(issue_issue_label::Column::IssueId.eq(model.id))
            .exec(&self.db)
            .await?;
        issue_event::Entity::delete_many()
            .filter(issue_event::Column::IssueId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        issue_voter::Entity::delete_many()
            .filter(issue_voter::Column::IssueId.eq(model.id))
            .exec(&self.db)
            .await?;
        for comment in issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(model.id)))
            .all(&self.db)
            .await?
        {
            issue_comment_voter::Entity::delete_many()
                .filter(issue_comment_voter::Column::IssueCommentId.eq(comment.id))
                .exec(&self.db)
                .await?;
        }
        issue_comment::Entity::delete_many()
            .filter(issue_comment::Column::IssueId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(model.id.to_string())))
            .exec(&self.db)
            .await?;
        attachment::Entity::delete_many()
            .filter(attachment::Column::ContainerType.eq(Some("ISSUE".to_string())))
            .filter(attachment::Column::ContainerId.eq(model.id))
            .exec(&self.db)
            .await?;
        issue::Entity::delete_by_id(model.id).exec(&self.db).await?;
        Ok(true)
    }

    pub async fn create_issue_comment(
        &self,
        input: CreateIssueCommentInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, issue_model)) = self
            .read_project_issue_model(&input.owner_name, &input.project_name, input.issue_number)
            .await?
        else {
            return Ok(None);
        };
        let created = issue_comment::ActiveModel {
            id: NotSet,
            created_date: Set(Some(current_datetime())),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
            author_name: Set(Some(input.actor_display_name)),
            issue_id: Set(Some(issue_model.id)),
            project_id: Set(project_record.id),
            parent_comment_id: Set(None),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "issue_comment",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_mentions_and_notify(
            input.actor_id,
            "issue_comment",
            created.id,
            &input.contents_markdown,
            "NEW_COMMENT",
            "",
            &input.contents_markdown,
        )
        .await?;
        self.bind_attachments("ISSUE_COMMENT", created.id, &input.attachment_ids)
            .await?;
        self.recount_issue_comments(issue_model.id).await?;
        self.read_issue_detail(&input.owner_name, &input.project_name, input.issue_number)
            .await
    }

    pub async fn update_issue_comment(
        &self,
        input: UpdateIssueCommentInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((_project_record, issue_model)) = self
            .read_project_issue_model(&input.owner_name, &input.project_name, input.issue_number)
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = issue_comment::Entity::find_by_id(input.comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if comment.issue_id != Some(issue_model.id) {
            return Ok(None);
        }
        let old_contents = self
            .read_text_column("issue_comment", "contents", comment.id)
            .await?;
        let active = issue_comment::ActiveModel::from(comment);
        let updated = active.update(&self.db).await?;
        self.write_text_column(
            "issue_comment",
            "contents",
            updated.id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_mentions_and_notify(
            input.actor_id,
            "issue_comment",
            updated.id,
            &input.contents_markdown,
            "COMMENT_UPDATED",
            &old_contents,
            &input.contents_markdown,
        )
        .await?;
        self.bind_attachments("ISSUE_COMMENT", updated.id, &input.attachment_ids)
            .await?;
        self.read_issue_detail(&input.owner_name, &input.project_name, input.issue_number)
            .await
    }

    pub async fn delete_issue_comment(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        comment_id: i64,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((_project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = issue_comment::Entity::find_by_id(comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if comment.issue_id != Some(issue_model.id) {
            return Ok(None);
        }
        attachment::Entity::delete_many()
            .filter(attachment::Column::ContainerType.eq(Some("ISSUE_COMMENT".to_string())))
            .filter(attachment::Column::ContainerId.eq(comment_id))
            .exec(&self.db)
            .await?;
        issue_comment_voter::Entity::delete_many()
            .filter(issue_comment_voter::Column::IssueCommentId.eq(comment_id))
            .exec(&self.db)
            .await?;
        issue_comment::Entity::delete_by_id(comment_id)
            .exec(&self.db)
            .await?;
        self.recount_issue_comments(issue_model.id).await?;
        self.read_issue_detail(owner_name, project_name, issue_number)
            .await
    }

    pub async fn watch_issue(&self, issue_id: i64, user_id: i64) -> Result<(), DbErr> {
        if watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
            .one(&self.db)
            .await?
            .is_none()
        {
            watch::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                resource_type: Set(Some("ISSUE".to_string())),
                resource_id: Set(Some(issue_id.to_string())),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn unwatch_issue(&self, issue_id: i64, user_id: i64) -> Result<(), DbErr> {
        watch::Entity::delete_many()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn list_project_postings_filtered(
        &self,
        owner_name: &str,
        project_name: &str,
        filter: PostingListFilter,
        viewer_id: Option<i64>,
    ) -> Result<ProjectPostingListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        let page_num = filter.page_num.max(1);
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(ProjectPostingListRecord {
                items: Vec::new(),
                notices: Vec::new(),
                page_num,
                page_size: PAGE_SIZE,
                readme: None,
                total_count: 0,
            });
        };

        let rows = posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project.id)))
            .all(&self.db)
            .await?;
        let mut normal_matches = Vec::new();
        let mut notice_matches = Vec::new();
        let mut readme_row = None;
        for row in rows {
            if row.readme.unwrap_or_default() != 0
                && readme_row
                    .as_ref()
                    .is_none_or(|existing: &posting::Model| row.id > existing.id)
            {
                readme_row = Some(row.clone());
            }
            if row.notice.unwrap_or_default() != 0 {
                notice_matches.push((row, project.clone()));
                continue;
            }
            if let Some(text_filter) = filter.filter.as_deref() {
                if !self
                    .posting_model_matches_text_filter(&row, text_filter)
                    .await?
                {
                    continue;
                }
            }
            let labels = self.list_posting_labels(row.id).await?;
            if !filter.label_ids.is_empty()
                && !filter
                    .label_ids
                    .iter()
                    .all(|id| labels.iter().any(|label| label.id == *id))
            {
                continue;
            }
            normal_matches.push((row, project.clone()));
        }

        sort_posting_models(&mut normal_matches, &filter.order_by, &filter.order_dir);
        sort_posting_models(&mut notice_matches, "updatedDate", "desc");

        let total_count = normal_matches.len() as u32;
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let page_models = normal_matches
            .into_iter()
            .skip(offset)
            .take(PAGE_SIZE as usize)
            .collect::<Vec<_>>();
        let mut items = Vec::new();
        for (row, project) in page_models {
            items.push(
                self.project_posting_list_item_from_model(row, &project)
                    .await?,
            );
        }
        let mut notices = Vec::new();
        for (row, project) in notice_matches {
            notices.push(
                self.project_posting_list_item_from_model(row, &project)
                    .await?,
            );
        }
        let readme = match readme_row {
            Some(row) => Some(
                self.posting_record_from_model(row, &project, viewer_id)
                    .await?,
            ),
            None => None,
        };

        Ok(ProjectPostingListRecord {
            items,
            notices,
            page_num,
            page_size: PAGE_SIZE,
            readme,
            total_count,
        })
    }

    pub async fn list_organization_postings_filtered(
        &self,
        organization_name: &str,
        visible_projects: Vec<ProjectRecord>,
        filter: OrganizationPostingListFilter,
    ) -> Result<OrganizationPostingListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        let page_num = filter.page_num.max(1);
        let visible_projects = {
            let mut projects = visible_projects;
            projects.sort_by(|left, right| left.project_name.cmp(&right.project_name));
            projects
        };
        let visible_project_options = visible_projects
            .iter()
            .map(|project| OrganizationPostingProjectOptionRecord {
                owner_name: project.owner_name.clone(),
                project_name: project.project_name.clone(),
            })
            .collect::<Vec<_>>();
        let project_by_id = visible_projects
            .iter()
            .cloned()
            .map(|project| (project.id, project))
            .collect::<HashMap<_, _>>();
        if project_by_id.is_empty() {
            return Ok(OrganizationPostingListRecord {
                items: Vec::new(),
                notices: Vec::new(),
                organization_name: organization_name.to_string(),
                page_num,
                page_size: PAGE_SIZE,
                total_count: 0,
                visible_projects: visible_project_options,
            });
        }

        let project_name_filter = filter
            .project_names
            .iter()
            .map(|name| normalize_identity(name))
            .filter(|name| !name.is_empty())
            .collect::<HashSet<_>>();
        let rows = posting::Entity::find()
            .filter(posting::Column::ProjectId.is_in(project_by_id.keys().copied().map(Some)))
            .all(&self.db)
            .await?;
        let mut matches = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };
            let Some(project) = project_by_id.get(&project_id) else {
                continue;
            };
            if !project_name_filter.is_empty()
                && !project_name_filter.contains(&normalize_identity(&project.project_name))
            {
                continue;
            }
            if let Some(text_filter) = filter.filter.as_deref() {
                if !self
                    .posting_model_matches_text_filter(&row, text_filter)
                    .await?
                {
                    continue;
                }
            }
            matches.push((row, project.clone()));
        }

        sort_posting_models(&mut matches, &filter.order_by, &filter.order_dir);
        let total_count = matches.len() as u32;
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let page_models = matches
            .into_iter()
            .skip(offset)
            .take(PAGE_SIZE as usize)
            .collect::<Vec<_>>();
        let mut items = Vec::new();
        for (row, project) in page_models {
            items.push(
                self.project_posting_list_item_from_model(row, &project)
                    .await?,
            );
        }

        Ok(OrganizationPostingListRecord {
            items,
            notices: Vec::new(),
            organization_name: organization_name.to_string(),
            page_num,
            page_size: PAGE_SIZE,
            total_count,
            visible_projects: visible_project_options,
        })
    }

    pub async fn read_posting_detail_for_viewer(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
        viewer_id: Option<i64>,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(None);
        };
        self.posting_record_from_model(model, &project, viewer_id)
            .await
            .map(Some)
    }

    pub async fn create_posting(
        &self,
        input: CreatePostingInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        for _attempt in 0..32 {
            let post_number = self.next_posting_number(project_record.id).await?;
            let now = current_datetime();
            let insert_result = posting::ActiveModel {
                id: NotSet,
                title: Set(Some(input.values.title.trim().to_string())),
                created_date: Set(Some(now)),
                updated_date: Set(Some(now)),
                author_id: Set(Some(input.actor_id)),
                author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
                author_name: Set(Some(input.actor_display_name.clone())),
                project_id: Set(Some(project_record.id)),
                number: Set(Some(post_number)),
                num_of_comments: Set(Some(0)),
                notice: Set(Some(bool_to_i16(input.values.notice))),
                readme: Set(Some(bool_to_i16(input.values.readme))),
                parent_id: Set(None),
                updated_by_author_id: Set(Some(input.actor_id)),
                ..Default::default()
            }
            .insert(&self.db)
            .await;

            let created = match insert_result {
                Ok(created) => created,
                Err(error) if is_unique_posting_number_conflict(&error) => continue,
                Err(error) => return Err(error),
            };

            let mut project_active = project::ActiveModel {
                id: Set(project_record.id),
                ..Default::default()
            };
            project_active.last_posting_number = Set(Some(post_number));
            project_active.update(&self.db).await?;

            self.write_text_column("posting", "body", created.id, &input.values.body_markdown)
                .await?;
            if input.values.readme {
                self.clear_other_readme_postings(project_record.id, created.id)
                    .await?;
            }
            self.sync_posting_mentions_and_notify(
                input.actor_id,
                project_record.id,
                created.id,
                created.author_id,
                "posting",
                created.id,
                &input.values.body_markdown,
                "NEW_POSTING",
                "",
                &input.values.body_markdown,
                PostingMentionNotificationMode::All,
            )
            .await?;

            self.replace_posting_labels(created.id, project_record.id, &input.values.label_ids)
                .await?;
            self.bind_attachments("BOARD_POST", created.id, &input.values.attachment_ids)
                .await?;
            self.watch_posting(created.id, input.actor_id).await?;
            return self
                .posting_record_from_model(created, &project_record, Some(input.actor_id))
                .await
                .map(Some);
        }

        Err(DbErr::Custom(
            "posting number allocation conflicted after retries".to_string(),
        ))
    }

    pub async fn update_posting(
        &self,
        input: UpdatePostingInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_posting_model(&input.owner_name, &input.project_name, input.post_number)
            .await?
        else {
            return Ok(None);
        };
        let old_body = self.read_text_column("posting", "body", model.id).await?;
        let mut active = posting::ActiveModel::from(model);
        active.title = Set(Some(input.values.title.trim().to_string()));
        active.updated_date = Set(Some(current_datetime()));
        active.updated_by_author_id = Set(Some(input.actor_id));
        active.notice = Set(Some(bool_to_i16(input.values.notice)));
        active.readme = Set(Some(bool_to_i16(input.values.readme)));
        let updated = active.update(&self.db).await?;
        self.write_text_column("posting", "body", updated.id, &input.values.body_markdown)
            .await?;
        if input.values.readme {
            self.clear_other_readme_postings(project_record.id, updated.id)
                .await?;
        }
        self.sync_posting_mentions_and_notify(
            input.actor_id,
            project_record.id,
            updated.id,
            updated.author_id,
            "posting",
            updated.id,
            &input.values.body_markdown,
            "POSTING_BODY_CHANGED",
            &old_body,
            &input.values.body_markdown,
            PostingMentionNotificationMode::NewOnly,
        )
        .await?;
        self.replace_posting_labels(updated.id, project_record.id, &input.values.label_ids)
            .await?;
        self.bind_attachments("BOARD_POST", updated.id, &input.values.attachment_ids)
            .await?;
        self.posting_record_from_model(updated, &project_record, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn delete_posting(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
        actor_id: i64,
        actor_login_id: &str,
    ) -> Result<bool, DbErr> {
        let Some((project_record, model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(false);
        };
        let old_body = self.read_text_column("posting", "body", model.id).await?;
        let mut receiver_ids = self
            .posting_notification_receiver_ids(
                project_record.id,
                model.id,
                model.author_id,
                "RESOURCE_DELETED",
            )
            .await?;
        receiver_ids.extend(self.mentioned_active_user_ids(&old_body).await?);
        self.create_notification_event_for_receivers(
            actor_id,
            "project",
            &project_record.id.to_string(),
            "RESOURCE_DELETED",
            &old_body,
            actor_login_id,
            &receiver_ids,
        )
        .await?;
        posting_issue_label::Entity::delete_many()
            .filter(posting_issue_label::Column::PostingId.eq(model.id))
            .exec(&self.db)
            .await?;
        for comment in posting_comment::Entity::find()
            .filter(posting_comment::Column::PostingId.eq(Some(model.id)))
            .all(&self.db)
            .await?
        {
            attachment::Entity::delete_many()
                .filter(
                    attachment::Column::ContainerType.eq(Some("BOARD_POST_COMMENT".to_string())),
                )
                .filter(attachment::Column::ContainerId.eq(comment.id))
                .exec(&self.db)
                .await?;
            mention::Entity::delete_many()
                .filter(mention::Column::ResourceType.eq(Some("posting_comment".to_string())))
                .filter(mention::Column::ResourceId.eq(Some(comment.id.to_string())))
                .exec(&self.db)
                .await?;
        }
        posting_comment::Entity::delete_many()
            .filter(posting_comment::Column::PostingId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(model.id.to_string())))
            .exec(&self.db)
            .await?;
        attachment::Entity::delete_many()
            .filter(attachment::Column::ContainerType.eq(Some("BOARD_POST".to_string())))
            .filter(attachment::Column::ContainerId.eq(model.id))
            .exec(&self.db)
            .await?;
        mention::Entity::delete_many()
            .filter(mention::Column::ResourceType.eq(Some("posting".to_string())))
            .filter(mention::Column::ResourceId.eq(Some(model.id.to_string())))
            .exec(&self.db)
            .await?;
        posting::Entity::delete_by_id(model.id)
            .exec(&self.db)
            .await?;
        Ok(true)
    }

    pub async fn create_posting_comment(
        &self,
        input: CreatePostingCommentInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((project_record, posting_model)) = self
            .read_project_posting_model(&input.owner_name, &input.project_name, input.post_number)
            .await?
        else {
            return Ok(None);
        };
        let created = posting_comment::ActiveModel {
            id: NotSet,
            created_date: Set(Some(current_datetime())),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
            author_name: Set(Some(input.actor_display_name)),
            posting_id: Set(Some(posting_model.id)),
            project_id: Set(project_record.id),
            parent_comment_id: Set(None),
            ..Default::default()
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "posting_comment",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_posting_mentions_and_notify(
            input.actor_id,
            project_record.id,
            posting_model.id,
            posting_model.author_id,
            "posting_comment",
            created.id,
            &input.contents_markdown,
            "NEW_COMMENT",
            "",
            &input.contents_markdown,
            PostingMentionNotificationMode::All,
        )
        .await?;
        self.bind_attachments("BOARD_POST_COMMENT", created.id, &input.attachment_ids)
            .await?;
        self.recount_posting_comments(posting_model.id).await?;
        self.read_posting_detail_for_viewer(
            &input.owner_name,
            &input.project_name,
            input.post_number,
            Some(input.actor_id),
        )
        .await
    }

    pub async fn update_posting_comment(
        &self,
        input: UpdatePostingCommentInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((project_record, posting_model)) = self
            .read_project_posting_model(&input.owner_name, &input.project_name, input.post_number)
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = posting_comment::Entity::find_by_id(input.comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if comment.posting_id != Some(posting_model.id) {
            return Ok(None);
        }
        let old_contents = self
            .read_text_column("posting_comment", "contents", comment.id)
            .await?;
        let active = posting_comment::ActiveModel::from(comment);
        let updated = active.update(&self.db).await?;
        self.write_text_column(
            "posting_comment",
            "contents",
            updated.id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_posting_mentions_and_notify(
            input.actor_id,
            project_record.id,
            posting_model.id,
            posting_model.author_id,
            "posting_comment",
            updated.id,
            &input.contents_markdown,
            "COMMENT_UPDATED",
            &old_contents,
            &input.contents_markdown,
            PostingMentionNotificationMode::All,
        )
        .await?;
        self.bind_attachments("BOARD_POST_COMMENT", updated.id, &input.attachment_ids)
            .await?;
        self.read_posting_detail_for_viewer(
            &input.owner_name,
            &input.project_name,
            input.post_number,
            Some(input.actor_id),
        )
        .await
    }

    pub async fn delete_posting_comment(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
        comment_id: i64,
        viewer_id: Option<i64>,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((_project_record, posting_model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = posting_comment::Entity::find_by_id(comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if comment.posting_id != Some(posting_model.id) {
            return Ok(None);
        }
        attachment::Entity::delete_many()
            .filter(attachment::Column::ContainerType.eq(Some("BOARD_POST_COMMENT".to_string())))
            .filter(attachment::Column::ContainerId.eq(comment_id))
            .exec(&self.db)
            .await?;
        mention::Entity::delete_many()
            .filter(mention::Column::ResourceType.eq(Some("posting_comment".to_string())))
            .filter(mention::Column::ResourceId.eq(Some(comment_id.to_string())))
            .exec(&self.db)
            .await?;
        posting_comment::Entity::delete_by_id(comment_id)
            .exec(&self.db)
            .await?;
        self.recount_posting_comments(posting_model.id).await?;
        self.read_posting_detail_for_viewer(owner_name, project_name, post_number, viewer_id)
            .await
    }

    pub async fn watch_posting(&self, posting_id: i64, user_id: i64) -> Result<(), DbErr> {
        if watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(posting_id.to_string())))
            .one(&self.db)
            .await?
            .is_none()
        {
            watch::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                resource_type: Set(Some("POSTING".to_string())),
                resource_id: Set(Some(posting_id.to_string())),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn unwatch_posting(&self, posting_id: i64, user_id: i64) -> Result<(), DbErr> {
        watch::Entity::delete_many()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(posting_id.to_string())))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn vote_issue(&self, issue_id: i64, user_id: i64) -> Result<(), DbErr> {
        if issue_voter::Entity::find_by_id((issue_id, user_id))
            .one(&self.db)
            .await?
            .is_none()
        {
            issue_voter::ActiveModel {
                issue_id: Set(issue_id),
                user_id: Set(user_id),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn unvote_issue(&self, issue_id: i64, user_id: i64) -> Result<(), DbErr> {
        issue_voter::Entity::delete_by_id((issue_id, user_id))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn vote_issue_comment(&self, comment_id: i64, user_id: i64) -> Result<(), DbErr> {
        if issue_comment_voter::Entity::find_by_id((comment_id, user_id))
            .one(&self.db)
            .await?
            .is_none()
        {
            issue_comment_voter::ActiveModel {
                issue_comment_id: Set(comment_id),
                user_id: Set(user_id),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn unvote_issue_comment(&self, comment_id: i64, user_id: i64) -> Result<bool, DbErr> {
        let result = issue_comment_voter::Entity::delete_by_id((comment_id, user_id))
            .exec(&self.db)
            .await?;
        Ok(result.rows_affected > 0)
    }

    pub async fn assign_issue(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        assignee_login_id: Option<&str>,
        actor_login_id: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let next_assignee_id = self
            .resolve_assignee_id(project_record.id, assignee_login_id)
            .await?;
        let old_assignee_id = issue_model.assignee_id;
        let mut active = issue::ActiveModel::from(issue_model);
        active.assignee_id = Set(next_assignee_id);
        active.updated_date = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        if old_assignee_id != updated.assignee_id {
            self.create_issue_event(
                updated.id,
                actor_login_id,
                "ISSUE_ASSIGNEE_CHANGED",
                &old_assignee_id
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                &updated
                    .assignee_id
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
            )
            .await?;
        }
        self.issue_record_from_model(updated, &project_record, None)
            .await
            .map(Some)
    }

    pub async fn mass_update_issues(
        &self,
        input: MassUpdateIssuesInput,
        actor_login_id: &str,
    ) -> Result<Vec<IssueRecord>, DbErr> {
        let mut targets = Vec::new();
        for issue_number in input.issue_numbers.iter().copied() {
            let Some((project_record, model)) = self
                .read_project_issue_model(&input.owner_name, &input.project_name, issue_number)
                .await?
            else {
                return Err(DbErr::Custom("Issue not found.".to_string()));
            };
            let next_assignee_id = if input.assignee_update {
                self.resolve_assignee_id(project_record.id, input.assignee_login_id.as_deref())
                    .await?
            } else {
                model.assignee_id
            };
            for label_id in input
                .add_label_ids
                .iter()
                .chain(input.remove_label_ids.iter())
            {
                if !self
                    .label_belongs_to_project(project_record.id, *label_id)
                    .await?
                {
                    return Err(DbErr::Custom("Issue label not found.".to_string()));
                }
            }
            targets.push((project_record, model, next_assignee_id));
        }

        let txn = self.db.begin().await?;
        for (_project_record, model, next_assignee_id) in &targets {
            let mut active = issue::ActiveModel::from(model.clone());
            if let Some(state) = input
                .state
                .as_deref()
                .filter(|value| !value.trim().is_empty())
            {
                active.state = Set(Some(issue_state_to_raw(state)));
            }
            if input.assignee_update {
                active.assignee_id = Set(*next_assignee_id);
            }
            if input.milestone_update {
                active.milestone_id = Set(input.milestone_id.filter(|value| *value > 0));
            }
            active.updated_date = Set(Some(current_datetime()));
            let model = active.update(&txn).await?;
            for label_id in &input.add_label_ids {
                if issue_issue_label::Entity::find_by_id((model.id, *label_id))
                    .one(&txn)
                    .await?
                    .is_none()
                {
                    issue_issue_label::ActiveModel {
                        issue_id: Set(model.id),
                        issue_label_id: Set(*label_id),
                    }
                    .insert(&txn)
                    .await?;
                }
            }
            for label_id in &input.remove_label_ids {
                issue_issue_label::Entity::delete_by_id((model.id, *label_id))
                    .exec(&txn)
                    .await?;
            }
            if let Some(state) = input
                .state
                .as_deref()
                .filter(|value| !value.trim().is_empty())
            {
                let created = issue_event::ActiveModel {
                    id: NotSet,
                    created: Set(Some(current_datetime())),
                    sender_login_id: Set(empty_to_none(Some(actor_login_id.to_string()))),
                    sender_email: Set(None),
                    issue_id: Set(Some(model.id)),
                    event_type: Set(Some("ISSUE_STATE_CHANGED".to_string())),
                }
                .insert(&txn)
                .await?;
                let backend = txn.get_database_backend();
                let placeholders = sql_placeholders(backend, 2);
                txn.execute(Statement::from_sql_and_values(
                    backend,
                    format!(
                        "UPDATE issue_event SET new_value = {} WHERE id = {}",
                        placeholders[0], placeholders[1]
                    ),
                    vec![state.to_string().into(), created.id.into()],
                ))
                .await?;
            }
        }
        txn.commit().await?;

        let mut updated = Vec::new();
        for issue_number in input.issue_numbers {
            if let Some(record) = self
                .read_issue_detail(&input.owner_name, &input.project_name, issue_number)
                .await?
            {
                updated.push(record);
            }
        }
        Ok(updated)
    }

    pub async fn list_project_labels(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Vec<IssueLabelRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        let labels = issue_label::Entity::find()
            .filter(issue_label::Column::ProjectId.eq(Some(project.id)))
            .order_by_asc(issue_label::Column::Name)
            .all(&self.db)
            .await?;
        let mut records = Vec::new();
        for label in labels {
            records.push(self.issue_label_record(label).await?);
        }
        Ok(records)
    }

    pub async fn list_project_label_categories(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Vec<IssueLabelCategoryRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        Ok(issue_label_category::Entity::find()
            .filter(issue_label_category::Column::ProjectId.eq(Some(project.id)))
            .order_by_asc(issue_label_category::Column::Name)
            .all(&self.db)
            .await?
            .into_iter()
            .map(issue_label_category_record)
            .collect())
    }

    pub async fn create_project_label(
        &self,
        input: CreateProjectLabelInput,
    ) -> Result<Option<(IssueLabelRecord, bool)>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let category = self
            .find_or_create_issue_label_category(
                project.id,
                input.category_name.trim(),
                input.category_is_exclusive,
            )
            .await?;
        if let Some(existing) = self
            .find_issue_label_by_project_category_name(
                project.id,
                category.id,
                input.label_name.trim(),
            )
            .await?
        {
            return Ok(Some((self.issue_label_record(existing).await?, false)));
        }
        let created = issue_label::ActiveModel {
            id: NotSet,
            category_id: Set(Some(category.id)),
            color: Set(Some(input.label_color)),
            name: Set(Some(input.label_name.trim().to_string())),
            project_id: Set(Some(project.id)),
        }
        .insert(&self.db)
        .await?;
        Ok(Some((self.issue_label_record(created).await?, true)))
    }

    pub async fn update_project_label(
        &self,
        input: UpdateProjectLabelInput,
    ) -> Result<Option<IssueLabelRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        if issue_label_category::Entity::find_by_id(input.category_id)
            .one(&self.db)
            .await?
            .is_none_or(|category| category.project_id != Some(project.id))
        {
            return Err(DbErr::Custom("Issue label category not found.".to_string()));
        }
        let Some(label) = issue_label::Entity::find_by_id(input.label_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if label.project_id != Some(project.id) {
            return Ok(None);
        }
        if let Some(existing) = self
            .find_issue_label_by_project_category_name(
                project.id,
                input.category_id,
                input.label_name.trim(),
            )
            .await?
        {
            if existing.id != input.label_id {
                return Err(DbErr::Custom("Issue label already exists.".to_string()));
            }
        }
        let mut active = issue_label::ActiveModel::from(label);
        active.category_id = Set(Some(input.category_id));
        active.color = Set(Some(input.label_color));
        active.name = Set(Some(input.label_name.trim().to_string()));
        let updated = active.update(&self.db).await?;
        self.issue_label_record(updated).await.map(Some)
    }

    pub async fn delete_project_label(
        &self,
        owner_name: &str,
        project_name: &str,
        label_id: i64,
    ) -> Result<bool, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(false);
        };
        let Some(label) = issue_label::Entity::find_by_id(label_id)
            .one(&self.db)
            .await?
        else {
            return Ok(false);
        };
        if label.project_id != Some(project.id) {
            return Ok(false);
        }
        let category_id = label.category_id;
        let txn = self.db.begin().await?;
        issue_issue_label::Entity::delete_many()
            .filter(issue_issue_label::Column::IssueLabelId.eq(label_id))
            .exec(&txn)
            .await?;
        posting_issue_label::Entity::delete_many()
            .filter(posting_issue_label::Column::IssueLabelId.eq(label_id))
            .exec(&txn)
            .await?;
        issue_label::Entity::delete_by_id(label_id)
            .exec(&txn)
            .await?;
        if let Some(category_id) = category_id {
            let remaining = issue_label::Entity::find()
                .filter(issue_label::Column::CategoryId.eq(Some(category_id)))
                .count(&txn)
                .await?;
            if remaining == 0 {
                issue_label_category::Entity::delete_by_id(category_id)
                    .exec(&txn)
                    .await?;
            }
        }
        txn.commit().await?;
        Ok(true)
    }

    pub async fn create_project_label_category(
        &self,
        input: CreateProjectLabelCategoryInput,
    ) -> Result<Option<(IssueLabelCategoryRecord, bool)>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        if let Some(existing) = self
            .find_issue_label_category_by_name(project.id, input.category_name.trim())
            .await?
        {
            return Ok(Some((issue_label_category_record(existing), false)));
        }
        let created = issue_label_category::ActiveModel {
            id: NotSet,
            project_id: Set(Some(project.id)),
            name: Set(Some(input.category_name.trim().to_string())),
            is_exclusive: Set(Some(bool_to_i16(input.category_is_exclusive))),
        }
        .insert(&self.db)
        .await?;
        Ok(Some((issue_label_category_record(created), true)))
    }

    pub async fn update_project_label_category(
        &self,
        input: UpdateProjectLabelCategoryInput,
    ) -> Result<Option<IssueLabelCategoryRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let Some(category) = issue_label_category::Entity::find_by_id(input.category_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if category.project_id != Some(project.id) {
            return Ok(None);
        }
        if let Some(existing) = self
            .find_issue_label_category_by_name(project.id, input.category_name.trim())
            .await?
        {
            if existing.id != input.category_id {
                return Err(DbErr::Custom(
                    "Issue label category already exists.".to_string(),
                ));
            }
        }
        let mut active = issue_label_category::ActiveModel::from(category);
        active.name = Set(Some(input.category_name.trim().to_string()));
        active.is_exclusive = Set(Some(bool_to_i16(input.category_is_exclusive)));
        let updated = active.update(&self.db).await?;
        Ok(Some(issue_label_category_record(updated)))
    }

    pub async fn delete_project_label_category(
        &self,
        owner_name: &str,
        project_name: &str,
        category_id: i64,
    ) -> Result<bool, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(false);
        };
        let Some(category) = issue_label_category::Entity::find_by_id(category_id)
            .one(&self.db)
            .await?
        else {
            return Ok(false);
        };
        if category.project_id != Some(project.id) {
            return Ok(false);
        }
        let labels = issue_label::Entity::find()
            .filter(issue_label::Column::CategoryId.eq(Some(category_id)))
            .all(&self.db)
            .await?;
        let txn = self.db.begin().await?;
        for label in labels {
            issue_issue_label::Entity::delete_many()
                .filter(issue_issue_label::Column::IssueLabelId.eq(label.id))
                .exec(&txn)
                .await?;
            posting_issue_label::Entity::delete_many()
                .filter(posting_issue_label::Column::IssueLabelId.eq(label.id))
                .exec(&txn)
                .await?;
            issue_label::Entity::delete_by_id(label.id)
                .exec(&txn)
                .await?;
        }
        issue_label_category::Entity::delete_by_id(category_id)
            .exec(&txn)
            .await?;
        txn.commit().await?;
        Ok(true)
    }

    pub async fn list_project_milestones(
        &self,
        owner_name: &str,
        project_name: &str,
        filter: MilestoneListFilter,
    ) -> Result<Vec<IssueMilestoneRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        let mut query =
            milestone::Entity::find().filter(milestone::Column::ProjectId.eq(Some(project.id)));
        let state = normalize_identity(&filter.state);
        if matches!(state.as_str(), "open" | "closed") {
            query = query.filter(milestone::Column::State.eq(Some(issue_state_to_raw(&state))));
        }
        let order_by = normalize_identity(&filter.order_by);
        let order_dir = normalize_identity(&filter.order_dir);
        if order_by != "completionrate" {
            query = if order_dir == "desc" {
                query
                    .order_by_desc(milestone::Column::DueDate)
                    .order_by_desc(milestone::Column::Id)
            } else {
                query
                    .order_by_asc(milestone::Column::DueDate)
                    .order_by_asc(milestone::Column::Id)
            };
        }
        let rows = query.all(&self.db).await?;
        let mut records = Vec::new();
        for row in rows {
            records.push(self.issue_milestone_record(row, &project).await?);
        }
        if order_by == "completionrate" {
            records.sort_by_key(|record| (record.completion_percent, record.id));
            if order_dir == "desc" {
                records.reverse();
            }
        }
        Ok(records)
    }

    pub async fn read_project_milestone(
        &self,
        owner_name: &str,
        project_name: &str,
        milestone_id: i64,
    ) -> Result<Option<IssueMilestoneRecord>, DbErr> {
        let Some((project, row)) = self
            .read_project_milestone_model(owner_name, project_name, milestone_id)
            .await?
        else {
            return Ok(None);
        };
        self.issue_milestone_record(row, &project).await.map(Some)
    }

    pub async fn project_milestone_title_exists(
        &self,
        owner_name: &str,
        project_name: &str,
        title: &str,
        except_milestone_id: Option<i64>,
    ) -> Result<bool, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(false);
        };
        let normalized_title = title.trim();
        if normalized_title.is_empty() {
            return Ok(false);
        }
        let mut query = milestone::Entity::find()
            .filter(milestone::Column::ProjectId.eq(Some(project.id)))
            .filter(milestone::Column::Title.eq(Some(normalized_title.to_string())));
        if let Some(except_milestone_id) = except_milestone_id {
            query = query.filter(milestone::Column::Id.ne(except_milestone_id));
        }
        query.one(&self.db).await.map(|row| row.is_some())
    }

    pub async fn create_project_milestone(
        &self,
        input: MilestoneMutationInput,
    ) -> Result<Option<IssueMilestoneRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let created = milestone::ActiveModel {
            id: NotSet,
            title: Set(Some(input.title.trim().to_string())),
            due_date: Set(input.due_date),
            state: Set(Some(issue_state_to_raw(&input.state))),
            project_id: Set(Some(project.id)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "milestone",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_attachments("MILESTONE", created.id, &input.attachment_ids)
            .await?;
        self.issue_milestone_record(created, &project)
            .await
            .map(Some)
    }

    pub async fn update_project_milestone(
        &self,
        input: UpdateMilestoneInput,
    ) -> Result<Option<IssueMilestoneRecord>, DbErr> {
        let Some((project, row)) = self
            .read_project_milestone_model(
                &input.values.owner_name,
                &input.values.project_name,
                input.milestone_id,
            )
            .await?
        else {
            return Ok(None);
        };
        let mut active = milestone::ActiveModel::from(row);
        active.title = Set(Some(input.values.title.trim().to_string()));
        active.due_date = Set(input.values.due_date);
        active.state = Set(Some(issue_state_to_raw(&input.values.state)));
        let updated = active.update(&self.db).await?;
        self.write_text_column(
            "milestone",
            "contents",
            updated.id,
            &input.values.contents_markdown,
        )
        .await?;
        self.sync_attachments("MILESTONE", updated.id, &input.values.attachment_ids)
            .await?;
        self.issue_milestone_record(updated, &project)
            .await
            .map(Some)
    }

    pub async fn update_project_milestone_state(
        &self,
        owner_name: &str,
        project_name: &str,
        milestone_id: i64,
        state: &str,
    ) -> Result<Option<IssueMilestoneRecord>, DbErr> {
        let Some((project, row)) = self
            .read_project_milestone_model(owner_name, project_name, milestone_id)
            .await?
        else {
            return Ok(None);
        };
        let mut active = milestone::ActiveModel::from(row);
        active.state = Set(Some(issue_state_to_raw(state)));
        let updated = active.update(&self.db).await?;
        self.issue_milestone_record(updated, &project)
            .await
            .map(Some)
    }

    pub async fn delete_project_milestone(
        &self,
        owner_name: &str,
        project_name: &str,
        milestone_id: i64,
    ) -> Result<bool, DbErr> {
        let Some((project, row)) = self
            .read_project_milestone_model(owner_name, project_name, milestone_id)
            .await?
        else {
            return Ok(false);
        };
        let txn = self.db.begin().await?;
        issue::Entity::update_many()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .col_expr(issue::Column::MilestoneId, Expr::value(Option::<i64>::None))
            .exec(&txn)
            .await?;
        attachment::Entity::delete_many()
            .filter(attachment::Column::ContainerType.eq(Some("MILESTONE".to_string())))
            .filter(attachment::Column::ContainerId.eq(row.id))
            .exec(&txn)
            .await?;
        milestone::Entity::delete_by_id(row.id).exec(&txn).await?;
        txn.commit().await?;
        Ok(true)
    }

    pub async fn read_project_by_owner_and_name(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let owner_name = normalize_identity(owner_name);
        let project_name = normalize_identity(project_name);
        if owner_name.is_empty() || project_name.is_empty() {
            return Ok(None);
        }

        let rows = project::Entity::find()
            .select_only()
            .column(project::Column::CreatedDate)
            .column(project::Column::Id)
            .column(project::Column::IsCodeAccessibleMemberOnly)
            .column(project::Column::LastPushedDate)
            .column(project::Column::Name)
            .column(project::Column::OriginalProjectId)
            .column(project::Column::Overview)
            .column(project::Column::Owner)
            .column(project::Column::OrganizationId)
            .column(project::Column::ProjectScope)
            .into_model::<ProjectRow>()
            .all(&self.db)
            .await?;
        for row in rows {
            let owner_matches =
                normalize_optional(row.owner.as_deref()).as_deref() == Some(owner_name.as_str());
            let project_matches =
                normalize_optional(row.name.as_deref()).as_deref() == Some(project_name.as_str());
            if owner_matches && project_matches {
                return self.project_record_from_row(row).await;
            }
        }

        Ok(None)
    }

    pub async fn project_identifier_exists(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<bool, DbErr> {
        Ok(self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
            .is_some())
    }

    pub async fn create_organization(
        &self,
        input: CreateOrganizationInput,
    ) -> Result<OrganizationRecord, DbErr> {
        let created = organization::ActiveModel {
            id: NotSet,
            name: Set(Some(input.organization_name.trim().to_string())),
            created: Set(None),
            descr: Set(empty_to_none(input.description)),
        }
        .insert(&self.db)
        .await?;

        self.organization_record_from_model(created)
            .ok_or_else(|| DbErr::Custom("organization name missing".to_string()))
    }

    pub async fn organization_name_exists(&self, organization_name: &str) -> Result<bool, DbErr> {
        let normalized = normalize_identity(organization_name);
        if normalized.is_empty() {
            return Ok(false);
        }

        let rows = organization::Entity::find().all(&self.db).await?;
        Ok(rows.into_iter().any(|row| {
            normalize_optional(row.name.as_deref()).as_deref() == Some(normalized.as_str())
        }))
    }

    pub async fn read_organization_by_name(
        &self,
        organization_name: &str,
    ) -> Result<Option<OrganizationRecord>, DbErr> {
        let normalized = normalize_identity(organization_name);
        if normalized.is_empty() {
            return Ok(None);
        }

        let rows = organization::Entity::find().all(&self.db).await?;
        for row in rows {
            if normalize_optional(row.name.as_deref()).as_deref() == Some(normalized.as_str()) {
                return Ok(self.organization_record_from_model(row));
            }
        }

        Ok(None)
    }

    pub async fn add_organization_membership(
        &self,
        organization_id: i64,
        user_id: i64,
        role_name: &str,
    ) -> Result<(), DbErr> {
        let role_id = self.ensure_role_id(role_name).await?;

        if let Some(existing) = organization_user::Entity::find()
            .filter(organization_user::Column::OrganizationId.eq(Some(organization_id)))
            .filter(organization_user::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            let mut active = organization_user::ActiveModel::from(existing);
            active.role_id = Set(Some(role_id));
            active.update(&self.db).await?;
            return Ok(());
        }

        organization_user::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            organization_id: Set(Some(organization_id)),
            role_id: Set(Some(role_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(())
    }

    pub async fn delete_organization_membership(
        &self,
        organization_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        if let Some(existing) = organization_user::Entity::find()
            .filter(organization_user::Column::OrganizationId.eq(Some(organization_id)))
            .filter(organization_user::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            organization_user::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn create_organization_enrollment_request(
        &self,
        organization_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        if user_enrolled_organization::Entity::find_by_id((user_id, organization_id))
            .one(&self.db)
            .await?
            .is_none()
        {
            user_enrolled_organization::ActiveModel {
                user_id: Set(user_id),
                organization_id: Set(organization_id),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn delete_organization_enrollment_request(
        &self,
        organization_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        user_enrolled_organization::Entity::delete_by_id((user_id, organization_id))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn delete_organization_by_name(
        &self,
        organization_name: &str,
    ) -> Result<bool, DbErr> {
        let Some(organization) = self.read_organization_by_name(organization_name).await? else {
            return Ok(false);
        };

        user_enrolled_organization::Entity::delete_many()
            .filter(user_enrolled_organization::Column::OrganizationId.eq(organization.id))
            .exec(&self.db)
            .await?;
        organization_user::Entity::delete_many()
            .filter(organization_user::Column::OrganizationId.eq(Some(organization.id)))
            .exec(&self.db)
            .await?;
        favorite_organization::Entity::delete_many()
            .filter(favorite_organization::Column::OrganizationId.eq(Some(organization.id)))
            .exec(&self.db)
            .await?;
        organization::Entity::delete_by_id(organization.id)
            .exec(&self.db)
            .await?;
        Ok(true)
    }

    pub async fn update_organization(
        &self,
        input: UpdateOrganizationInput,
    ) -> Result<Option<OrganizationRecord>, DbErr> {
        let normalized_current = normalize_identity(&input.current_organization_name);
        let rows = organization::Entity::find().all(&self.db).await?;
        let Some(current) = rows.into_iter().find(|row| {
            normalize_optional(row.name.as_deref()).as_deref() == Some(normalized_current.as_str())
        }) else {
            return Ok(None);
        };

        let previous_name = current.name.clone().unwrap_or_default();
        let mut active = organization::ActiveModel::from(current);
        active.name = Set(Some(input.organization_name.trim().to_string()));
        active.descr = Set(empty_to_none(input.description));
        let updated = active.update(&self.db).await?;
        let updated_record = self
            .organization_record_from_model(updated.clone())
            .ok_or_else(|| DbErr::Custom("organization name missing after update".to_string()))?;

        if normalize_identity(&previous_name)
            != normalize_identity(&updated_record.organization_name)
        {
            let projects = project::Entity::find()
                .filter(project::Column::OrganizationId.eq(Some(updated.id)))
                .all(&self.db)
                .await?;
            for row in projects {
                let mut active_project = project::ActiveModel::from(row.clone());
                active_project.owner = Set(Some(updated_record.organization_name.clone()));
                let updated_project = active_project.update(&self.db).await?;
                self.sync_project_label_cache(&updated_project).await?;
            }
        }

        Ok(Some(updated_record))
    }

    pub async fn create_project(&self, input: CreateProjectInput) -> Result<ProjectRecord, DbErr> {
        let created = project::ActiveModel {
            id: NotSet,
            name: Set(Some(input.project_name.trim().to_string())),
            overview: Set(empty_to_none(input.overview)),
            vcs: Set(Some("GIT".to_string())),
            siteurl: Set(None),
            owner: Set(Some(input.owner_name.trim().to_string())),
            created_date: Set(Some(current_datetime())),
            last_issue_number: Set(Some(0)),
            last_posting_number: Set(Some(0)),
            original_project_id: Set(None),
            last_pushed_date: Set(None),
            default_reviewer_count: Set(Some(0)),
            is_using_reviewer_count: Set(Some(0)),
            organization_id: Set(input.organization_id),
            project_scope: Set(Some(normalize_identity(&input.project_scope))),
            previous_owner_login_id: Set(None),
            previous_name: Set(None),
            previous_name_changed_time: Set(None),
            is_code_accessible_member_only: Set(Some(0)),
        }
        .insert(&self.db)
        .await?;

        project_menu_setting::ActiveModel {
            id: NotSet,
            project_id: Set(Some(created.id)),
            code: Set(Some(1)),
            issue: Set(Some(1)),
            pull_request: Set(Some(1)),
            review: Set(Some(1)),
            milestone: Set(Some(1)),
            board: Set(Some(1)),
        }
        .insert(&self.db)
        .await?;

        self.project_record_from_model(created)
            .await?
            .ok_or_else(|| DbErr::Custom("project owner/name missing".to_string()))
    }

    pub async fn delete_project_by_owner_and_name(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<bool, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(false);
        };
        let project_id = project_record.id;
        let txn = self.db.begin().await?;

        let issue_ids = issue::Entity::find()
            .select_only()
            .column(issue::Column::Id)
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .into_tuple::<i64>()
            .all(&txn)
            .await?;
        let posting_ids = posting::Entity::find()
            .select_only()
            .column(posting::Column::Id)
            .filter(posting::Column::ProjectId.eq(Some(project_id)))
            .into_tuple::<i64>()
            .all(&txn)
            .await?;
        let pull_request_ids = pull_request::Entity::find()
            .select_only()
            .column(pull_request::Column::Id)
            .filter(
                Condition::any()
                    .add(pull_request::Column::FromProjectId.eq(Some(project_id)))
                    .add(pull_request::Column::ToProjectId.eq(Some(project_id))),
            )
            .into_tuple::<i64>()
            .all(&txn)
            .await?;
        let thread_ids = comment_thread::Entity::find()
            .select_only()
            .column(comment_thread::Column::Id)
            .filter(
                Condition::any()
                    .add(comment_thread::Column::ProjectId.eq(Some(project_id)))
                    .add(
                        comment_thread::Column::PullRequestId
                            .is_in(pull_request_ids.iter().copied().map(Some)),
                    ),
            )
            .into_tuple::<i64>()
            .all(&txn)
            .await?;
        let issue_comment_ids = issue_comment::Entity::find()
            .select_only()
            .column(issue_comment::Column::Id)
            .filter(issue_comment::Column::ProjectId.eq(project_id))
            .into_tuple::<i64>()
            .all(&txn)
            .await?;

        if !issue_comment_ids.is_empty() {
            issue_comment_voter::Entity::delete_many()
                .filter(issue_comment_voter::Column::IssueCommentId.is_in(issue_comment_ids))
                .exec(&txn)
                .await?;
        }
        issue_comment::Entity::delete_many()
            .filter(issue_comment::Column::ProjectId.eq(project_id))
            .exec(&txn)
            .await?;
        if !issue_ids.is_empty() {
            let issue_id_filter = issue_ids.iter().copied().map(Some);
            favorite_issue::Entity::delete_many()
                .filter(favorite_issue::Column::IssueId.is_in(issue_id_filter.clone()))
                .exec(&txn)
                .await?;
            issue_voter::Entity::delete_many()
                .filter(issue_voter::Column::IssueId.is_in(issue_id_filter.clone()))
                .exec(&txn)
                .await?;
            issue_sharer::Entity::delete_many()
                .filter(issue_sharer::Column::IssueId.is_in(issue_id_filter.clone()))
                .exec(&txn)
                .await?;
            issue_event::Entity::delete_many()
                .filter(issue_event::Column::IssueId.is_in(issue_id_filter.clone()))
                .exec(&txn)
                .await?;
            issue_issue_label::Entity::delete_many()
                .filter(issue_issue_label::Column::IssueId.is_in(issue_id_filter))
                .exec(&txn)
                .await?;
            issue::Entity::delete_many()
                .filter(issue::Column::Id.is_in(issue_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }

        posting_comment::Entity::delete_many()
            .filter(posting_comment::Column::ProjectId.eq(project_id))
            .exec(&txn)
            .await?;
        if !posting_ids.is_empty() {
            posting_issue_label::Entity::delete_many()
                .filter(
                    posting_issue_label::Column::PostingId
                        .is_in(posting_ids.iter().copied().map(Some)),
                )
                .exec(&txn)
                .await?;
            posting::Entity::delete_many()
                .filter(posting::Column::Id.is_in(posting_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }

        if !thread_ids.is_empty() {
            review_comment::Entity::delete_many()
                .filter(
                    review_comment::Column::ThreadId.is_in(thread_ids.iter().copied().map(Some)),
                )
                .exec(&txn)
                .await?;
            comment_thread_n4user::Entity::delete_many()
                .filter(
                    comment_thread_n4user::Column::CommentThreadId
                        .is_in(thread_ids.iter().copied()),
                )
                .exec(&txn)
                .await?;
            comment_thread::Entity::delete_many()
                .filter(comment_thread::Column::Id.is_in(thread_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }
        if !pull_request_ids.is_empty() {
            let pull_request_id_filter = pull_request_ids.iter().copied().map(Some);
            pull_request_commit::Entity::delete_many()
                .filter(
                    pull_request_commit::Column::PullRequestId
                        .is_in(pull_request_id_filter.clone()),
                )
                .exec(&txn)
                .await?;
            pull_request_event::Entity::delete_many()
                .filter(
                    pull_request_event::Column::PullRequestId.is_in(pull_request_id_filter.clone()),
                )
                .exec(&txn)
                .await?;
            pull_request_reviewers::Entity::delete_many()
                .filter(pull_request_reviewers::Column::PullRequestId.is_in(pull_request_id_filter))
                .exec(&txn)
                .await?;
            pull_request::Entity::delete_many()
                .filter(pull_request::Column::Id.is_in(pull_request_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }

        project::Entity::update_many()
            .filter(project::Column::OriginalProjectId.eq(Some(project_id)))
            .col_expr(
                project::Column::OriginalProjectId,
                Expr::value(Option::<i64>::None),
            )
            .exec(&txn)
            .await?;
        assignee::Entity::delete_many()
            .filter(assignee::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        commit_comment::Entity::delete_many()
            .filter(commit_comment::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        favorite_project::Entity::delete_many()
            .filter(favorite_project::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        recent_project::Entity::delete_many()
            .filter(recent_project::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_visitation::Entity::delete_many()
            .filter(project_visitation::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_user::Entity::delete_many()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        user_enrolled_project::Entity::delete_many()
            .filter(user_enrolled_project::Column::ProjectId.eq(project_id))
            .exec(&txn)
            .await?;
        user_project_notification::Entity::delete_many()
            .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_menu_setting::Entity::delete_many()
            .filter(project_menu_setting::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_pushed_branch::Entity::delete_many()
            .filter(project_pushed_branch::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_transfer::Entity::delete_many()
            .filter(project_transfer::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        webhook::Entity::delete_many()
            .filter(webhook::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        title_head::Entity::delete_many()
            .filter(title_head::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_label::Entity::delete_many()
            .filter(project_label::Column::ProjectId.eq(project_id))
            .exec(&txn)
            .await?;
        issue_label::Entity::delete_many()
            .filter(issue_label::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        issue_label_category::Entity::delete_many()
            .filter(issue_label_category::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        milestone::Entity::delete_many()
            .filter(milestone::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .exec(&txn)
            .await?;
        unwatch::Entity::delete_many()
            .filter(unwatch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(unwatch::Column::ResourceId.eq(Some(project_id.to_string())))
            .exec(&txn)
            .await?;

        let result = project::Entity::delete_by_id(project_id).exec(&txn).await?;
        txn.commit().await?;
        Ok(result.rows_affected > 0)
    }

    pub async fn add_project_membership(
        &self,
        project_id: i64,
        user_id: i64,
        role_name: &str,
    ) -> Result<(), DbErr> {
        let role_id = self.ensure_role_id(role_name).await?;

        if let Some(existing) = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .filter(project_user::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            let mut active = project_user::ActiveModel::from(existing);
            active.role_id = Set(Some(role_id));
            active.update(&self.db).await?;
            return Ok(());
        }

        project_user::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            project_id: Set(Some(project_id)),
            role_id: Set(Some(role_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(())
    }

    pub async fn delete_project_membership(
        &self,
        project_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        if let Some(existing) = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .filter(project_user::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            project_user::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn read_public_project_by_id(
        &self,
        project_id: i64,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        if normalize_identity(&project.project_scope) != "public" {
            return Ok(None);
        }
        Ok(Some(project))
    }

    pub async fn list_project_member_users(
        &self,
        project_id: i64,
    ) -> Result<Vec<AppUserRecord>, DbErr> {
        let memberships = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?;
        let mut users = Vec::new();
        for membership in memberships {
            let Some(user_id) = membership.user_id else {
                continue;
            };
            if let Some(user) = self.find_user_by_id(user_id).await? {
                users.push(user);
            }
        }
        users.sort_by(|left, right| left.login_id.cmp(&right.login_id));
        users.dedup_by(|left, right| left.id == right.id);
        Ok(users)
    }

    async fn assignable_member_user_ids(
        &self,
        project_record: &ProjectRecord,
    ) -> Result<HashSet<i64>, DbErr> {
        let mut user_ids = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_record.id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|membership| membership.user_id)
            .collect::<HashSet<_>>();

        if let Some(organization_id) = project_record.organization_id {
            user_ids.extend(
                organization_user::Entity::find()
                    .filter(organization_user::Column::OrganizationId.eq(Some(organization_id)))
                    .all(&self.db)
                    .await?
                    .into_iter()
                    .filter_map(|membership| membership.user_id),
            );
        }

        Ok(user_ids)
    }

    pub async fn update_project(
        &self,
        input: UpdateProjectInput,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let Some(current_record) = self
            .read_project_by_owner_and_name(&input.current_owner_name, &input.current_project_name)
            .await?
        else {
            return Ok(None);
        };

        let Some(current) = project::Entity::find_by_id(current_record.id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };

        let mut active = project::ActiveModel::from(current.clone());
        active.name = Set(Some(input.project_name.trim().to_string()));
        active.overview = Set(empty_to_none(input.overview));
        active.project_scope = Set(Some(normalize_identity(&input.project_scope)));
        active.previous_name = Set(current.name.clone());
        active.previous_owner_login_id = Set(current.owner.clone());
        let updated = active.update(&self.db).await?;
        self.sync_project_label_cache(&updated).await?;

        self.project_record_from_model(updated).await
    }

    pub async fn read_organization_authorization(
        &self,
        organization_name: &str,
        actor_id: Option<i64>,
    ) -> Result<Option<OrganizationAuthorizationRecord>, DbErr> {
        let Some(organization) = self.read_organization_by_name(organization_name).await? else {
            return Ok(None);
        };

        let mut viewer = OrganizationViewerRecord {
            is_organization_admin: false,
            is_organization_member: false,
            is_site_admin: false,
        };
        let mut enrollment_requested = false;

        if let Some(actor_id) = actor_id {
            if let Some(user) = self.find_user_by_id(actor_id).await? {
                viewer.is_site_admin = user.is_site_admin;
            }

            if let Some(membership) = organization_user::Entity::find()
                .filter(organization_user::Column::OrganizationId.eq(Some(organization.id)))
                .filter(organization_user::Column::UserId.eq(Some(actor_id)))
                .one(&self.db)
                .await?
            {
                let role_name = self.role_name_for_id(membership.role_id).await?;
                viewer.is_organization_admin = role_name == "org_admin";
                viewer.is_organization_member =
                    viewer.is_organization_admin || role_name == "org_member";
            }

            enrollment_requested =
                user_enrolled_organization::Entity::find_by_id((actor_id, organization.id))
                    .one(&self.db)
                    .await?
                    .is_some();
        }

        Ok(Some(OrganizationAuthorizationRecord {
            organization,
            viewer,
            enrollment_requested,
        }))
    }

    pub async fn read_organization_members(
        &self,
        organization_name: &str,
    ) -> Result<OrganizationMemberDirectoryRecord, DbErr> {
        let Some(organization) = self.read_organization_by_name(organization_name).await? else {
            return Ok(OrganizationMemberDirectoryRecord {
                enrollment_requests: vec![],
                members: vec![],
            });
        };

        let memberships = organization_user::Entity::find()
            .filter(organization_user::Column::OrganizationId.eq(Some(organization.id)))
            .all(&self.db)
            .await?;

        let mut member_user_ids = HashSet::new();
        let mut members = Vec::new();
        for membership in memberships {
            let Some(user_id) = membership.user_id else {
                continue;
            };
            let Some(user) = self.find_user_by_id(user_id).await? else {
                continue;
            };
            member_user_ids.insert(user_id);

            members.push(OrganizationMemberRecord {
                email_address: user.email_address,
                login_id: user.login_id,
                role: self.role_name_for_id(membership.role_id).await?,
                user_id,
                user_label: user.display_name,
            });
        }

        members.sort_by(|left, right| {
            let left_rank = if left.role == "org_admin" { 0 } else { 1 };
            let right_rank = if right.role == "org_admin" { 0 } else { 1 };
            left_rank
                .cmp(&right_rank)
                .then_with(|| left.login_id.cmp(&right.login_id))
        });

        let requests = user_enrolled_organization::Entity::find()
            .filter(user_enrolled_organization::Column::OrganizationId.eq(organization.id))
            .all(&self.db)
            .await?;
        let mut enrollment_requests = Vec::new();
        for request in requests {
            if member_user_ids.contains(&request.user_id) {
                continue;
            }
            let Some(user) = self.find_user_by_id(request.user_id).await? else {
                continue;
            };
            enrollment_requests.push(OrganizationEnrollmentRequestRecord {
                email_address: user.email_address,
                login_id: user.login_id,
                user_id: user.id,
                user_label: user.display_name,
            });
        }
        enrollment_requests.sort_by(|left, right| left.login_id.cmp(&right.login_id));

        Ok(OrganizationMemberDirectoryRecord {
            enrollment_requests,
            members,
        })
    }

    pub async fn read_project_authorization(
        &self,
        owner_name: &str,
        project_name: &str,
        actor_id: Option<i64>,
    ) -> Result<Option<ProjectAuthorizationRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        let mut viewer = ProjectViewerRecord {
            is_organization_admin: false,
            is_organization_member: false,
            is_project_manager: false,
            is_project_member: false,
            is_site_admin: false,
        };
        let mut enrollment_requested = false;
        let mut is_favorited = false;

        if let Some(actor_id) = actor_id {
            if let Some(user) = self.find_user_by_id(actor_id).await? {
                viewer.is_site_admin = user.is_site_admin;
            }

            if let Some(organization_id) = project.organization_id {
                if let Some(membership) = organization_user::Entity::find()
                    .filter(organization_user::Column::OrganizationId.eq(Some(organization_id)))
                    .filter(organization_user::Column::UserId.eq(Some(actor_id)))
                    .one(&self.db)
                    .await?
                {
                    let role_name = self.role_name_for_id(membership.role_id).await?;
                    viewer.is_organization_admin = role_name == "org_admin";
                    viewer.is_organization_member =
                        viewer.is_organization_admin || role_name == "org_member";
                }
            }

            if let Some(membership) = project_user::Entity::find()
                .filter(project_user::Column::ProjectId.eq(Some(project.id)))
                .filter(project_user::Column::UserId.eq(Some(actor_id)))
                .one(&self.db)
                .await?
            {
                let role_name = self.role_name_for_id(membership.role_id).await?;
                viewer.is_project_manager = role_name == "manager";
                viewer.is_project_member = viewer.is_project_manager || role_name == "member";
            }

            enrollment_requested =
                user_enrolled_project::Entity::find_by_id((actor_id, project.id))
                    .one(&self.db)
                    .await?
                    .is_some();
            is_favorited = favorite_project::Entity::find()
                .filter(favorite_project::Column::UserId.eq(Some(actor_id)))
                .filter(favorite_project::Column::ProjectId.eq(Some(project.id)))
                .one(&self.db)
                .await?
                .is_some();
        }

        Ok(Some(ProjectAuthorizationRecord {
            project,
            viewer,
            enrollment_requested,
            is_favorited,
        }))
    }

    pub async fn read_project_members(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<ProjectMemberDirectoryRecord, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(ProjectMemberDirectoryRecord {
                enrollment_requests: vec![],
                members: vec![],
            });
        };

        let memberships = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project.id)))
            .all(&self.db)
            .await?;
        let mut members = Vec::new();
        for membership in memberships {
            let Some(user_id) = membership.user_id else {
                continue;
            };
            let Some(user) = self.find_user_by_id(user_id).await? else {
                continue;
            };
            members.push(ProjectMemberRecord {
                email_address: user.email_address,
                login_id: user.login_id,
                role: self.role_name_for_id(membership.role_id).await?,
                user_id,
                user_label: user.display_name,
            });
        }
        members.sort_by(|left, right| {
            let left_rank = if left.role == "manager" { 0 } else { 1 };
            let right_rank = if right.role == "manager" { 0 } else { 1 };
            left_rank
                .cmp(&right_rank)
                .then_with(|| left.login_id.cmp(&right.login_id))
        });

        let requests = user_enrolled_project::Entity::find()
            .filter(user_enrolled_project::Column::ProjectId.eq(project.id))
            .all(&self.db)
            .await?;
        let mut enrollment_requests = Vec::new();
        for request in requests {
            let Some(user) = self.find_user_by_id(request.user_id).await? else {
                continue;
            };
            enrollment_requests.push(ProjectEnrollmentRequestRecord {
                email_address: user.email_address,
                login_id: user.login_id,
                user_id: user.id,
                user_label: user.display_name,
            });
        }

        Ok(ProjectMemberDirectoryRecord {
            enrollment_requests,
            members,
        })
    }

    pub async fn list_projects_for_organization(
        &self,
        organization_id: i64,
    ) -> Result<Vec<ProjectRecord>, DbErr> {
        let models = project::Entity::find()
            .filter(project::Column::OrganizationId.eq(Some(organization_id)))
            .all(&self.db)
            .await?;
        let mut projects = Vec::new();
        for model in models {
            if let Some(record) = self.project_record_from_model(model).await? {
                projects.push(record);
            }
        }
        Ok(projects)
    }

    pub async fn count_project_members(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn count_project_watchers(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn list_project_watchers(
        &self,
        project_id: i64,
    ) -> Result<Vec<ProjectWatcherRecord>, DbErr> {
        let rows = watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .all(&self.db)
            .await?;

        let mut watchers = Vec::new();
        for row in rows {
            let Some(user_id) = row.user_id else {
                continue;
            };
            let Some(user) = self.find_user_by_id(user_id).await? else {
                continue;
            };
            watchers.push(ProjectWatcherRecord {
                email_address: user.email_address,
                login_id: user.login_id,
                user_id,
                user_label: user.display_name,
            });
        }
        watchers.sort_by(|left, right| left.login_id.cmp(&right.login_id));
        Ok(watchers)
    }

    pub async fn list_project_webhooks(
        &self,
        project_id: i64,
    ) -> Result<Vec<ProjectWebhookRecord>, DbErr> {
        let rows = webhook::Entity::find()
            .filter(webhook::Column::ProjectId.eq(Some(project_id)))
            .order_by_asc(webhook::Column::Id)
            .all(&self.db)
            .await?;

        Ok(rows
            .into_iter()
            .map(project_webhook_record_from_model)
            .collect())
    }

    pub async fn create_project_webhook(
        &self,
        project_id: i64,
        input: CreateProjectWebhookInput,
    ) -> Result<ProjectWebhookRecord, DbErr> {
        let row = webhook::ActiveModel {
            id: NotSet,
            project_id: Set(Some(project_id)),
            payload_url: Set(Some(input.payload_url)),
            secret: Set(Some(input.secret)),
            created_at: Set(Some(current_datetime())),
            git_push: Set(Some(if input.git_push { 1 } else { 0 })),
            webhook_type: Set(Some(input.webhook_type)),
        }
        .insert(&self.db)
        .await?;

        Ok(project_webhook_record_from_model(row))
    }

    pub async fn delete_project_webhook(
        &self,
        project_id: i64,
        webhook_id: i64,
    ) -> Result<bool, DbErr> {
        let result = webhook::Entity::delete_many()
            .filter(webhook::Column::Id.eq(webhook_id))
            .filter(webhook::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        Ok(result.rows_affected > 0)
    }

    pub async fn read_project_menu_settings(
        &self,
        project_id: i64,
    ) -> Result<ProjectMenuSettingsRecord, DbErr> {
        let Some(row) = project_menu_setting::Entity::find()
            .filter(project_menu_setting::Column::ProjectId.eq(Some(project_id)))
            .one(&self.db)
            .await?
        else {
            return Ok(ProjectMenuSettingsRecord {
                board: true,
                code: true,
                issue: true,
                milestone: true,
                pull_request: true,
                review: true,
            });
        };

        Ok(ProjectMenuSettingsRecord {
            board: row.board.unwrap_or(1) != 0,
            code: row.code.unwrap_or(1) != 0,
            issue: row.issue.unwrap_or(1) != 0,
            milestone: row.milestone.unwrap_or(1) != 0,
            pull_request: row.pull_request.unwrap_or(1) != 0,
            review: row.review.unwrap_or(1) != 0,
        })
    }

    pub async fn count_open_issues_for_project(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .filter(issue::Column::State.eq(Some(0)))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn count_open_pull_requests_for_project(
        &self,
        project_id: i64,
    ) -> Result<u32, DbErr> {
        Ok(pull_request::Entity::find()
            .filter(pull_request::Column::ToProjectId.eq(Some(project_id)))
            .filter(pull_request::Column::State.eq(Some(0)))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn count_project_reviews(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(comment_thread::Entity::find()
            .filter(comment_thread::Column::ProjectId.eq(Some(project_id)))
            .filter(comment_thread::Column::PullRequestId.is_not_null())
            .count(&self.db)
            .await? as u32)
    }

    pub async fn count_project_boards(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_id)))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn read_current_milestone_for_project(
        &self,
        project_id: i64,
    ) -> Result<Option<ProjectMilestoneSummaryRecord>, DbErr> {
        let Some(row) = milestone::Entity::find()
            .filter(milestone::Column::ProjectId.eq(Some(project_id)))
            .order_by_desc(milestone::Column::Id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };

        let open_issue_count = issue::Entity::find()
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .filter(issue::Column::State.eq(Some(0)))
            .count(&self.db)
            .await? as u32;
        let closed_issue_count = issue::Entity::find()
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .filter(issue::Column::State.ne(Some(0)))
            .count(&self.db)
            .await? as u32;
        let total = open_issue_count + closed_issue_count;
        let completion_percent = if total == 0 {
            0
        } else {
            closed_issue_count.saturating_mul(100) / total
        };

        Ok(Some(ProjectMilestoneSummaryRecord {
            closed_issue_count,
            completion_percent,
            due_date_label: format_workspace_date_label(row.due_date),
            open_issue_count,
            title: row.title.unwrap_or_default(),
        }))
    }

    pub async fn create_project_enrollment_request(
        &self,
        project_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        if user_enrolled_project::Entity::find_by_id((user_id, project_id))
            .one(&self.db)
            .await?
            .is_none()
        {
            user_enrolled_project::ActiveModel {
                user_id: Set(user_id),
                project_id: Set(project_id),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(())
    }

    pub async fn delete_project_enrollment_request(
        &self,
        project_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        user_enrolled_project::Entity::delete_by_id((user_id, project_id))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn toggle_favorite_project(
        &self,
        user_id: i64,
        owner_name: &str,
        project_name: &str,
    ) -> Result<ToggleFavoriteProjectResult, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Err(DbErr::Custom("Project not found.".to_string()));
        };

        let favorited = if let Some(existing) = favorite_project::Entity::find()
            .filter(favorite_project::Column::UserId.eq(Some(user_id)))
            .filter(favorite_project::Column::ProjectId.eq(Some(project.id)))
            .one(&self.db)
            .await?
        {
            favorite_project::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
            false
        } else {
            favorite_project::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                project_id: Set(Some(project.id)),
                owner: Set(Some(project.owner_name.clone())),
                project_name: Set(Some(project.project_name.clone())),
            }
            .insert(&self.db)
            .await?;
            true
        };

        Ok(ToggleFavoriteProjectResult {
            favorited,
            owner_name: project.owner_name,
            project_name: project.project_name,
        })
    }

    pub async fn record_recent_project_visit(
        &self,
        user_id: i64,
        owner_name: &str,
        project_name: &str,
    ) -> Result<ProjectListEntry, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Err(DbErr::Custom("Project not found.".to_string()));
        };

        if let Some(existing) = recent_project::Entity::find()
            .filter(recent_project::Column::UserId.eq(Some(user_id)))
            .filter(recent_project::Column::ProjectId.eq(Some(project.id)))
            .one(&self.db)
            .await?
        {
            recent_project::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
        }

        recent_project::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            owner: Set(Some(project.owner_name.clone())),
            project_id: Set(Some(project.id)),
            project_name: Set(Some(project.project_name.clone())),
        }
        .insert(&self.db)
        .await?;

        Ok(ProjectListEntry {
            owner_name: project.owner_name,
            project_name: project.project_name,
        })
    }

    pub async fn list_favorite_projects_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<ProjectListEntry>, DbErr> {
        let rows = favorite_project::Entity::find()
            .filter(favorite_project::Column::UserId.eq(Some(user_id)))
            .order_by_desc(favorite_project::Column::Id)
            .all(&self.db)
            .await?;
        let mut projects = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };

            let project_row = project::Entity::find_by_id(project_id)
                .one(&self.db)
                .await?;
            let owner_name = row
                .owner
                .or_else(|| project_row.as_ref().and_then(|item| item.owner.clone()));
            let project_name = row
                .project_name
                .or_else(|| project_row.as_ref().and_then(|item| item.name.clone()));
            if let (Some(owner_name), Some(project_name)) = (owner_name, project_name) {
                projects.push(ProjectListEntry {
                    owner_name,
                    project_name,
                });
            }
        }
        Ok(projects)
    }

    pub async fn list_recent_projects_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<ProjectListEntry>, DbErr> {
        let rows = recent_project::Entity::find()
            .filter(recent_project::Column::UserId.eq(Some(user_id)))
            .order_by_desc(recent_project::Column::Id)
            .all(&self.db)
            .await?;
        let mut projects = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };

            let project_row = project::Entity::find_by_id(project_id)
                .one(&self.db)
                .await?;
            let owner_name = row
                .owner
                .or_else(|| project_row.as_ref().and_then(|item| item.owner.clone()));
            let project_name = row
                .project_name
                .or_else(|| project_row.as_ref().and_then(|item| item.name.clone()));
            if let (Some(owner_name), Some(project_name)) = (owner_name, project_name) {
                projects.push(ProjectListEntry {
                    owner_name,
                    project_name,
                });
            }
        }
        Ok(projects)
    }

    pub async fn read_workspace_profile_for_user(
        &self,
        user_id: i64,
    ) -> Result<Option<WorkspaceProfileRecord>, DbErr> {
        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Ok(None);
        };
        let is_site_admin = site_admin::Entity::find()
            .filter(site_admin::Column::AdminId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_some();

        Ok(Some(WorkspaceProfileRecord {
            connected_social_providers: self
                .list_connected_social_providers_for_user(user_id)
                .await?,
            display_name: user.name.unwrap_or_default(),
            english_name: user.english_name.unwrap_or_default(),
            is_blocked: normalize_optional(user.state.as_deref()).as_deref() == Some("locked"),
            is_site_admin,
            login_id: user.login_id.unwrap_or_default(),
            primary_email_address: user.email.unwrap_or_default(),
            since_label: user
                .created_date
                .map(|value| value.format("%b %d, %Y").to_string())
                .unwrap_or_default(),
        }))
    }

    pub async fn list_member_projects_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<WorkspaceMemberProjectRecord>, DbErr> {
        let memberships = project_user::Entity::find()
            .filter(project_user::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        let mut seen = HashSet::new();
        let mut project_models = Vec::new();
        for membership in memberships {
            let Some(project_id) = membership.project_id else {
                continue;
            };
            if !seen.insert(project_id) {
                continue;
            }
            let Some(project_model) = project::Entity::find_by_id(project_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            project_models.push(project_model);
        }

        project_models.sort_by(|left, right| {
            let left_name = left.name.clone().unwrap_or_default();
            let right_name = right.name.clone().unwrap_or_default();
            let left_owner = left.owner.clone().unwrap_or_default();
            let right_owner = right.owner.clone().unwrap_or_default();

            match (
                left.last_pushed_date.clone(),
                right.last_pushed_date.clone(),
            ) {
                (Some(left_date), Some(right_date)) => right_date
                    .cmp(&left_date)
                    .then_with(|| left_name.cmp(&right_name))
                    .then_with(|| left_owner.cmp(&right_owner)),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => left_name
                    .cmp(&right_name)
                    .then_with(|| left_owner.cmp(&right_owner)),
            }
        });

        let mut projects = Vec::new();
        for project_model in project_models {
            if let Some(record) = self
                .project_record_from_model(project_model.clone())
                .await?
            {
                let member_count = project_user::Entity::find()
                    .filter(project_user::Column::ProjectId.eq(Some(project_model.id)))
                    .count(&self.db)
                    .await? as u32;
                let watch_count = watch::Entity::find()
                    .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
                    .filter(watch::Column::ResourceId.eq(Some(project_model.id.to_string())))
                    .count(&self.db)
                    .await? as u32;

                projects.push(WorkspaceMemberProjectRecord {
                    created_label: format_workspace_date_label(project_model.created_date),
                    last_pushed_label: format_workspace_date_label(project_model.last_pushed_date),
                    member_count,
                    owner_name: record.owner_name,
                    overview: record.overview.unwrap_or_default(),
                    project_name: record.project_name,
                    project_scope: record.project_scope,
                    watch_count,
                });
            }
        }

        Ok(projects)
    }

    pub async fn list_recent_workspace_issues_for_user(
        &self,
        user_id: i64,
        days_ago: u64,
    ) -> Result<Vec<WorkspaceIssueListItemRecord>, DbErr> {
        let cutoff = days_ago_datetime(days_ago);
        let assignee_ids: Vec<i64> = assignee::Entity::find()
            .filter(assignee::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect();

        let mut filter = Condition::any().add(issue::Column::AuthorId.eq(Some(user_id)));
        for assignee_id in assignee_ids {
            filter = filter.add(issue::Column::AssigneeId.eq(Some(assignee_id)));
        }

        let rows = issue::Entity::find()
            .filter(filter)
            .filter(issue::Column::UpdatedDate.gte(cutoff))
            .order_by_desc(issue::Column::UpdatedDate)
            .order_by_asc(issue::Column::State)
            .all(&self.db)
            .await?;

        let mut issues = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };
            let Some(project_record) = self.read_project_by_id(project_id).await? else {
                continue;
            };
            let Some(issue_number) = row.number else {
                continue;
            };
            let author_label = row.author_name.unwrap_or_default();
            let assignee_label = match row.assignee_id {
                Some(assignee_id) => {
                    let assignee_user_id = assignee::Entity::find_by_id(assignee_id)
                        .one(&self.db)
                        .await?
                        .and_then(|model| model.user_id);
                    match assignee_user_id {
                        Some(user_id) => self
                            .find_user_by_id(user_id)
                            .await?
                            .map(|user| user.display_name)
                            .unwrap_or_default(),
                        None => String::new(),
                    }
                }
                None => String::new(),
            };

            issues.push(WorkspaceIssueListItemRecord {
                assignee_label,
                author_label,
                comment_count: row.num_of_comments.unwrap_or_default() as u32,
                issue_number,
                owner_name: project_record.owner_name,
                project_name: project_record.project_name,
                state: issue_state_from_raw(row.state),
                title: row.title.unwrap_or_default(),
                updated_label: format_workspace_date_label(row.updated_date.or(row.created_date)),
            });
        }

        Ok(issues)
    }

    pub async fn list_recent_workspace_pull_requests_for_user(
        &self,
        user_id: i64,
        days_ago: u64,
    ) -> Result<Vec<WorkspacePullRequestListItemRecord>, DbErr> {
        let cutoff = days_ago_datetime(days_ago);
        let rows = pull_request::Entity::find()
            .filter(pull_request::Column::ContributorId.eq(Some(user_id)))
            .filter(pull_request::Column::Updated.gte(cutoff))
            .order_by_desc(pull_request::Column::Updated)
            .order_by_asc(pull_request::Column::State)
            .order_by_desc(pull_request::Column::Created)
            .all(&self.db)
            .await?;

        let mut pull_requests = Vec::new();
        for row in rows {
            let Some(project_id) = row.to_project_id else {
                continue;
            };
            let Some(project_record) = self.read_project_by_id(project_id).await? else {
                continue;
            };
            let Some(pull_request_number) = row.number else {
                continue;
            };
            let contributor_label = match row.contributor_id {
                Some(contributor_id) => self
                    .find_user_by_id(contributor_id)
                    .await?
                    .map(|user| user.display_name)
                    .unwrap_or_default(),
                None => String::new(),
            };
            let receiver_label = match row.receiver_id {
                Some(receiver_id) => self
                    .find_user_by_id(receiver_id)
                    .await?
                    .map(|user| user.display_name)
                    .unwrap_or_default(),
                None => String::new(),
            };
            let comment_count = comment_thread::Entity::find()
                .filter(comment_thread::Column::PullRequestId.eq(Some(row.id)))
                .count(&self.db)
                .await? as u32;

            pull_requests.push(WorkspacePullRequestListItemRecord {
                comment_count,
                contributor_label,
                owner_name: project_record.owner_name,
                project_name: project_record.project_name,
                pull_request_number,
                receiver_label,
                state: pull_request_state_from_raw(row.state, row.is_conflict),
                title: row.title.unwrap_or_default(),
                updated_label: format_workspace_date_label(row.updated.or(row.created)),
            });
        }

        Ok(pull_requests)
    }

    pub async fn list_project_pull_requests(
        &self,
        project: &ProjectRecord,
        filter: PullRequestListFilter,
    ) -> Result<PullRequestListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        let page_num = filter.page_num.max(1);
        let category = match normalize_identity(&filter.category).as_str() {
            "closed" => "closed".to_string(),
            "sent" => "sent".to_string(),
            _ => "open".to_string(),
        };
        let text_filter = filter
            .filter
            .as_deref()
            .map(normalize_identity)
            .filter(|value| !value.is_empty());
        let project_column = if category == "sent" {
            pull_request::Column::FromProjectId
        } else {
            pull_request::Column::ToProjectId
        };
        let mut select = pull_request::Entity::find().filter(project_column.eq(Some(project.id)));
        select = match category.as_str() {
            "closed" => select.filter(pull_request_closed_condition()),
            "sent" => select,
            _ => select.filter(pull_request_open_condition()),
        };
        if category != "sent" {
            if let Some(contributor_id) = filter.contributor_id {
                select =
                    select.filter(pull_request::Column::ContributorId.eq(Some(contributor_id)));
            }
        }
        if text_filter.is_none() {
            let total_count = select.clone().count(&self.db).await? as u32;
            let select = if category == "closed" {
                select
                    .order_by_desc(pull_request::Column::Updated)
                    .order_by_desc(pull_request::Column::Number)
            } else {
                select
                    .order_by_desc(pull_request::Column::Created)
                    .order_by_desc(pull_request::Column::Number)
            };
            let rows = select
                .paginate(&self.db, PAGE_SIZE as u64)
                .fetch_page((page_num - 1) as u64)
                .await?;
            let mut items = Vec::new();
            for row in rows {
                items.push(self.pull_request_list_item_from_model(row, project).await?);
            }
            return Ok(PullRequestListRecord {
                category,
                items,
                page_num,
                page_size: PAGE_SIZE,
                total_count,
            });
        }
        let rows = select.all(&self.db).await?;
        let mut filtered = Vec::new();
        for row in rows {
            if let Some(text_filter) = text_filter.as_deref() {
                let title_matches = row
                    .title
                    .as_deref()
                    .is_some_and(|title| normalize_identity(title).contains(text_filter));
                let body_matches = normalize_identity(
                    &self
                        .read_text_column("pull_request", "body", row.id)
                        .await?,
                )
                .contains(text_filter);
                if !title_matches && !body_matches {
                    continue;
                }
            }
            filtered.push(row);
        }
        filtered.sort_by(|left, right| {
            if category == "closed" {
                right
                    .updated
                    .cmp(&left.updated)
                    .then_with(|| right.number.cmp(&left.number))
            } else {
                right
                    .created
                    .cmp(&left.created)
                    .then_with(|| right.number.cmp(&left.number))
            }
        });
        let total_count = filtered.len() as u32;
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let mut items = Vec::new();
        for row in filtered.into_iter().skip(offset).take(PAGE_SIZE as usize) {
            items.push(self.pull_request_list_item_from_model(row, project).await?);
        }
        Ok(PullRequestListRecord {
            category,
            items,
            page_num,
            page_size: PAGE_SIZE,
            total_count,
        })
    }

    pub async fn latest_pull_requests_from_branches(
        &self,
        project: &ProjectRecord,
        branch_names: &[String],
    ) -> Result<HashMap<String, BranchPullRequestRecord>, DbErr> {
        let branch_names = branch_names
            .iter()
            .map(|branch| branch.trim().to_string())
            .filter(|branch| !branch.is_empty())
            .collect::<Vec<_>>();
        if branch_names.is_empty() {
            return Ok(HashMap::new());
        }
        let target_project_ids = match project.original_project_id {
            Some(original_project_id) => vec![Some(project.id), Some(original_project_id)],
            None => vec![Some(project.id)],
        };
        let rows = pull_request::Entity::find()
            .filter(pull_request::Column::FromProjectId.eq(Some(project.id)))
            .filter(pull_request::Column::FromBranch.is_in(branch_names))
            .filter(pull_request::Column::ToProjectId.is_in(target_project_ids))
            .order_by_desc(pull_request::Column::Number)
            .order_by_desc(pull_request::Column::Id)
            .all(&self.db)
            .await?;
        let mut latest_by_branch = HashMap::new();
        for row in rows {
            let Some(from_branch) = row.from_branch.clone().filter(|branch| !branch.is_empty())
            else {
                continue;
            };
            if latest_by_branch.contains_key(&from_branch) {
                continue;
            }
            let to_project = match row.to_project_id {
                Some(project_id) => self.read_project_by_id(project_id).await?,
                None => None,
            }
            .unwrap_or_else(|| project.clone());
            latest_by_branch.insert(
                from_branch,
                BranchPullRequestRecord {
                    owner_name: to_project.owner_name,
                    project_name: to_project.project_name,
                    pull_request_number: row.number.unwrap_or_default(),
                    state: pull_request_state_from_raw(row.state, row.is_conflict),
                },
            );
        }
        Ok(latest_by_branch)
    }

    pub async fn list_organization_pull_requests(
        &self,
        visible_projects: Vec<ProjectRecord>,
        filter: PullRequestListFilter,
    ) -> Result<PullRequestListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        let page_num = filter.page_num.max(1);
        let category = match normalize_identity(&filter.category).as_str() {
            "closed" => "closed".to_string(),
            _ => "open".to_string(),
        };
        let project_by_id = visible_projects
            .into_iter()
            .map(|project| (project.id, project))
            .collect::<HashMap<_, _>>();
        if project_by_id.is_empty() {
            return Ok(PullRequestListRecord {
                category,
                items: Vec::new(),
                page_num,
                page_size: PAGE_SIZE,
                total_count: 0,
            });
        }
        let text_filter = filter
            .filter
            .as_deref()
            .map(normalize_identity)
            .filter(|value| !value.is_empty());
        let mut select = pull_request::Entity::find().filter(
            pull_request::Column::ToProjectId.is_in(project_by_id.keys().copied().map(Some)),
        );
        select = if category == "closed" {
            select.filter(pull_request_closed_condition())
        } else {
            select.filter(pull_request_open_condition())
        };
        if text_filter.is_none() {
            let total_count = select.clone().count(&self.db).await? as u32;
            let rows = select
                .order_by_desc(pull_request::Column::Updated)
                .order_by_desc(pull_request::Column::Created)
                .order_by_desc(pull_request::Column::Number)
                .paginate(&self.db, PAGE_SIZE as u64)
                .fetch_page((page_num - 1) as u64)
                .await?;
            let mut items = Vec::new();
            for row in rows {
                if let Some(project_id) = row.to_project_id {
                    if let Some(project) = project_by_id.get(&project_id) {
                        items.push(self.pull_request_list_item_from_model(row, project).await?);
                    }
                }
            }
            return Ok(PullRequestListRecord {
                category,
                items,
                page_num,
                page_size: PAGE_SIZE,
                total_count,
            });
        }
        let rows = select.all(&self.db).await?;
        let mut filtered = Vec::new();
        for row in rows {
            if let Some(text_filter) = text_filter.as_deref() {
                let title_matches = row
                    .title
                    .as_deref()
                    .is_some_and(|title| normalize_identity(title).contains(text_filter));
                let body_matches = normalize_identity(
                    &self
                        .read_text_column("pull_request", "body", row.id)
                        .await?,
                )
                .contains(text_filter);
                if !title_matches && !body_matches {
                    continue;
                }
            }
            if let Some(project_id) = row.to_project_id {
                if let Some(project) = project_by_id.get(&project_id) {
                    filtered.push((row, project.clone()));
                }
            }
        }
        filtered.sort_by(|(left, _), (right, _)| {
            right
                .updated
                .cmp(&left.updated)
                .then_with(|| right.created.cmp(&left.created))
                .then_with(|| right.number.cmp(&left.number))
        });
        let total_count = filtered.len() as u32;
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let mut items = Vec::new();
        for (row, project) in filtered.into_iter().skip(offset).take(PAGE_SIZE as usize) {
            items.push(
                self.pull_request_list_item_from_model(row, &project)
                    .await?,
            );
        }
        Ok(PullRequestListRecord {
            category,
            items,
            page_num,
            page_size: PAGE_SIZE,
            total_count,
        })
    }

    pub async fn read_pull_request_detail(
        &self,
        owner_name: &str,
        project_name: &str,
        pull_request_number: i64,
        viewer_id: Option<i64>,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(owner_name, project_name, pull_request_number)
            .await?
        else {
            return Ok(None);
        };
        self.pull_request_detail_from_model(model, &project, viewer_id)
            .await
            .map(Some)
    }

    pub async fn create_pull_request(
        &self,
        input: CreatePullRequestInput,
    ) -> Result<Option<CreatePullRequestResult>, DbErr> {
        let Some(from_project) = self.read_project_by_id(input.from_project_id).await? else {
            return Ok(None);
        };
        let Some(to_project) = self.read_project_by_id(input.to_project_id).await? else {
            return Ok(None);
        };
        let from_branch = input.from_branch.trim().to_string();
        let to_branch = input.to_branch.trim().to_string();

        if let Some(duplicate) = self
            .find_duplicate_open_pull_request(
                from_project.id,
                to_project.id,
                &from_branch,
                &to_branch,
            )
            .await?
        {
            let detail = self
                .pull_request_detail_from_model(duplicate, &to_project, Some(input.actor_id))
                .await?;
            return Ok(Some(CreatePullRequestResult::Duplicate(detail)));
        }

        let receiver_id = self
            .find_user_by_login_id(&to_project.owner_name)
            .await?
            .map(|user| user.id)
            .unwrap_or(input.actor_id);
        let pull_request_number = self.next_pull_request_number(to_project.id).await?;
        let now = current_datetime();
        let created = pull_request::ActiveModel {
            id: NotSet,
            title: Set(Some(input.values.title.trim().to_string())),
            to_project_id: Set(Some(to_project.id)),
            from_project_id: Set(Some(from_project.id)),
            to_branch: Set(Some(to_branch)),
            from_branch: Set(Some(from_branch)),
            contributor_id: Set(Some(input.actor_id)),
            receiver_id: Set(Some(receiver_id)),
            created: Set(Some(now)),
            updated: Set(Some(now)),
            received: Set(None),
            state: Set(Some(1)),
            is_conflict: Set(Some(0)),
            is_merging: Set(Some(0)),
            last_commit_id: Set(None),
            merged_commit_id_from: Set(None),
            merged_commit_id_to: Set(None),
            number: Set(Some(pull_request_number)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "pull_request",
            "body",
            created.id,
            &input.values.body_markdown,
        )
        .await?;
        self.bind_attachments("PULL_REQUEST", created.id, &input.values.attachment_ids)
            .await?;
        self.watch_pull_request(created.id, input.actor_id).await?;
        self.create_pull_request_event(
            created.id,
            &input.actor_login_id,
            "NEW_PULL_REQUEST",
            "",
            &input.values.title,
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                to_project.id,
                created.id,
                created.contributor_id,
                created.receiver_id,
                "NEW_PULL_REQUEST",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "PULL_REQUEST",
            &created.id.to_string(),
            "NEW_PULL_REQUEST",
            "",
            &input.values.title,
            &receiver_ids,
        )
        .await?;

        let detail = self
            .pull_request_detail_from_model(created, &to_project, Some(input.actor_id))
            .await?;
        Ok(Some(CreatePullRequestResult::Created(detail)))
    }

    pub async fn update_pull_request(
        &self,
        input: UpdatePullRequestInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let mut active = pull_request::ActiveModel::from(model);
        active.title = Set(Some(input.values.title.trim().to_string()));
        active.updated = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        self.write_text_column(
            "pull_request",
            "body",
            updated.id,
            &input.values.body_markdown,
        )
        .await?;
        self.bind_attachments("PULL_REQUEST", updated.id, &input.values.attachment_ids)
            .await?;

        self.pull_request_detail_from_model(updated, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn update_pull_request_state(
        &self,
        input: PullRequestStateInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let old_state = pull_request_lifecycle_state(model.state);
        let next_state = if normalize_identity(&input.state) == "closed" {
            "closed"
        } else {
            "open"
        };
        let next_raw = if next_state == "closed" { 2 } else { 1 };
        let mut active = pull_request::ActiveModel::from(model.clone());
        active.state = Set(Some(next_raw));
        active.is_conflict = Set(Some(0));
        active.updated = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        self.create_pull_request_event(
            updated.id,
            &input.actor_login_id,
            "PULL_REQUEST_STATE_CHANGED",
            &old_state,
            next_state,
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                project.id,
                updated.id,
                updated.contributor_id,
                updated.receiver_id,
                "PULL_REQUEST_STATE_CHANGED",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "PULL_REQUEST",
            &updated.id.to_string(),
            "PULL_REQUEST_STATE_CHANGED",
            &old_state,
            next_state,
            &receiver_ids,
        )
        .await?;

        self.pull_request_detail_from_model(updated, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn set_pull_request_review(
        &self,
        input: PullRequestReviewInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let existing = pull_request_reviewers::Entity::find_by_id((model.id, input.actor_id))
            .one(&self.db)
            .await?;
        if input.reviewed {
            if existing.is_none() {
                pull_request_reviewers::ActiveModel {
                    pull_request_id: Set(model.id),
                    user_id: Set(input.actor_id),
                }
                .insert(&self.db)
                .await?;
            }
        } else if existing.is_some() {
            pull_request_reviewers::Entity::delete_by_id((model.id, input.actor_id))
                .exec(&self.db)
                .await?;
        }
        let (old_value, new_value) = if input.reviewed {
            ("CANCEL", "DONE")
        } else {
            ("DONE", "CANCEL")
        };
        self.create_pull_request_event(
            model.id,
            &input.actor_login_id,
            "PULL_REQUEST_REVIEW_STATE_CHANGED",
            old_value,
            new_value,
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                project.id,
                model.id,
                model.contributor_id,
                model.receiver_id,
                "PULL_REQUEST_REVIEW_STATE_CHANGED",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "PULL_REQUEST",
            &model.id.to_string(),
            "PULL_REQUEST_REVIEW_STATE_CHANGED",
            old_value,
            new_value,
            &receiver_ids,
        )
        .await?;

        self.pull_request_detail_from_model(model, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn create_pull_request_comment(
        &self,
        input: CreatePullRequestCommentInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let thread_id = if let Some(thread_id) = input.thread_id {
            let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                .one(&self.db)
                .await?
            else {
                return Ok(None);
            };
            if thread.pull_request_id != Some(model.id) {
                return Ok(None);
            }
            thread.id
        } else {
            let commit_id = input
                .commit_id
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned)
                .or_else(|| model.merged_commit_id_to.clone());
            comment_thread::ActiveModel {
                dtype: Set("NonRangedCodeCommentThread".to_string()),
                id: NotSet,
                author_id: Set(Some(input.actor_id)),
                author_login_id: Set(Some(input.actor_login_id.clone())),
                author_name: Set(Some(input.actor_display_name.clone())),
                state: Set(Some("open".to_string())),
                created_date: Set(Some(current_datetime())),
                pull_request_id: Set(Some(model.id)),
                project_id: Set(Some(project.id)),
                prev_commit_id: Set(model.merged_commit_id_from.clone()),
                commit_id: Set(commit_id),
                path: Set(None),
                start_side: Set(None),
                start_line: Set(None),
                start_column: Set(None),
                end_side: Set(None),
                end_line: Set(None),
                end_column: Set(None),
            }
            .insert(&self.db)
            .await?
            .id
        };
        let created = review_comment::ActiveModel {
            id: NotSet,
            created_date: Set(Some(current_datetime())),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(input.actor_login_id.clone())),
            author_name: Set(Some(input.actor_display_name.clone())),
            thread_id: Set(Some(thread_id)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "review_comment",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.bind_attachments("REVIEW_COMMENT", created.id, &input.attachment_ids)
            .await?;
        self.create_pull_request_event(
            model.id,
            &input.actor_login_id,
            "NEW_REVIEW_COMMENT",
            "",
            &input.contents_markdown,
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                project.id,
                model.id,
                model.contributor_id,
                model.receiver_id,
                "NEW_REVIEW_COMMENT",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "REVIEW_COMMENT",
            &created.id.to_string(),
            "NEW_REVIEW_COMMENT",
            "",
            &input.contents_markdown,
            &receiver_ids,
        )
        .await?;

        self.pull_request_detail_from_model(model, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn update_pull_request_thread_state(
        &self,
        input: PullRequestThreadStateInput,
    ) -> Result<Option<ReviewThreadRecord>, DbErr> {
        let Some((_project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let Some(thread) = comment_thread::Entity::find_by_id(input.thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if thread.pull_request_id != Some(model.id) {
            return Ok(None);
        }
        let old_state = review_thread_state(thread.state.as_deref());
        let next_state = if normalize_identity(&input.state) == "closed" {
            "closed"
        } else {
            "open"
        };
        let mut active = comment_thread::ActiveModel::from(thread);
        active.state = Set(Some(next_state.to_string()));
        let updated = active.update(&self.db).await?;
        self.create_pull_request_event(
            model.id,
            &input.actor_login_id,
            "REVIEW_THREAD_STATE_CHANGED",
            &old_state,
            next_state,
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                updated.project_id.unwrap_or_default(),
                model.id,
                model.contributor_id,
                model.receiver_id,
                "REVIEW_THREAD_STATE_CHANGED",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "PULL_REQUEST",
            &model.id.to_string(),
            "REVIEW_THREAD_STATE_CHANGED",
            &old_state,
            next_state,
            &receiver_ids,
        )
        .await?;
        let comments = self.list_review_comments(updated.id).await?;
        self.review_thread_record(updated, comments).await.map(Some)
    }

    pub async fn list_commit_discussion_threads(
        &self,
        project_id: i64,
        commit_id: &str,
    ) -> Result<Vec<ReviewThreadRecord>, DbErr> {
        let rows = comment_thread::Entity::find()
            .filter(comment_thread::Column::ProjectId.eq(Some(project_id)))
            .filter(comment_thread::Column::PullRequestId.is_null())
            .filter(comment_thread::Column::CommitId.eq(Some(commit_id.to_string())))
            .order_by_asc(comment_thread::Column::CreatedDate)
            .order_by_asc(comment_thread::Column::Id)
            .all(&self.db)
            .await?;
        let mut threads = Vec::new();
        for row in rows {
            let comments = self.list_review_comments(row.id).await?;
            threads.push(self.review_thread_record(row, comments).await?);
        }
        Ok(threads)
    }

    pub async fn count_commit_discussion_threads_by_commit(
        &self,
        project_id: i64,
        commit_ids: &[String],
        path: Option<&str>,
    ) -> Result<HashMap<String, u32>, DbErr> {
        if commit_ids.is_empty() {
            return Ok(HashMap::new());
        }
        let mut base = comment_thread::Entity::find()
            .filter(comment_thread::Column::ProjectId.eq(Some(project_id)))
            .filter(comment_thread::Column::PullRequestId.is_null())
            .filter(comment_thread::Column::CommitId.is_in(commit_ids.iter().cloned().map(Some)));
        if let Some(path) = path.map(str::trim).filter(|value| !value.is_empty()) {
            base = base.filter(
                Condition::any()
                    .add(comment_thread::Column::Path.is_null())
                    .add(comment_thread::Column::Path.eq(Some(path.to_string()))),
            );
        }
        let rows = base.all(&self.db).await?;
        let mut counts = HashMap::new();
        for row in rows {
            if let Some(commit_id) = row.commit_id {
                *counts.entry(commit_id).or_insert(0) += 1;
            }
        }
        Ok(counts)
    }

    pub async fn create_commit_discussion_comment(
        &self,
        input: CreateCommitDiscussionCommentInput,
    ) -> Result<Option<ReviewThreadRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let thread_id = if let Some(thread_id) = input.thread_id {
            let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                .one(&self.db)
                .await?
            else {
                return Ok(None);
            };
            if thread.project_id != Some(project.id)
                || thread.pull_request_id.is_some()
                || thread.commit_id.as_deref() != Some(input.commit_id.as_str())
            {
                return Ok(None);
            }
            thread.id
        } else {
            let path = input
                .path
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned);
            let is_ranged =
                path.is_some() || input.start_line.is_some() || input.end_line.is_some();
            comment_thread::ActiveModel {
                dtype: Set(if is_ranged {
                    "CodeCommentThread".to_string()
                } else {
                    "NonRangedCodeCommentThread".to_string()
                }),
                id: NotSet,
                author_id: Set(Some(input.actor_id)),
                author_login_id: Set(Some(input.actor_login_id.clone())),
                author_name: Set(Some(input.actor_display_name.clone())),
                state: Set(Some("open".to_string())),
                created_date: Set(Some(current_datetime())),
                pull_request_id: Set(None),
                project_id: Set(Some(project.id)),
                prev_commit_id: Set(None),
                commit_id: Set(Some(input.commit_id.clone())),
                path: Set(path),
                start_side: Set(None),
                start_line: Set(input.start_line),
                start_column: Set(None),
                end_side: Set(None),
                end_line: Set(input.end_line),
                end_column: Set(None),
            }
            .insert(&self.db)
            .await?
            .id
        };
        let created = review_comment::ActiveModel {
            id: NotSet,
            created_date: Set(Some(current_datetime())),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(input.actor_login_id.clone())),
            author_name: Set(Some(input.actor_display_name.clone())),
            thread_id: Set(Some(thread_id)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "review_comment",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.bind_attachments("REVIEW_COMMENT", created.id, &input.attachment_ids)
            .await?;
        let receiver_ids = self
            .commit_notification_receiver_ids(project.id, input.actor_id, "NEW_REVIEW_COMMENT")
            .await?;
        self.create_notification_event_for_commit_discussion(
            input.actor_id,
            "REVIEW_COMMENT",
            &created.id.to_string(),
            "NEW_REVIEW_COMMENT",
            "",
            &input.contents_markdown,
            &receiver_ids,
        )
        .await?;

        let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let comments = self.list_review_comments(thread.id).await?;
        self.review_thread_record(thread, comments).await.map(Some)
    }

    pub async fn update_commit_discussion_thread_state(
        &self,
        input: CommitDiscussionThreadStateInput,
    ) -> Result<Option<ReviewThreadRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let Some(thread) = comment_thread::Entity::find_by_id(input.thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if thread.project_id != Some(project.id)
            || thread.pull_request_id.is_some()
            || thread.commit_id.as_deref() != Some(input.commit_id.as_str())
        {
            return Ok(None);
        }
        let old_state = review_thread_state(thread.state.as_deref());
        let next_state = if normalize_identity(&input.state) == "closed" {
            "closed"
        } else {
            "open"
        };
        let mut active = comment_thread::ActiveModel::from(thread);
        active.state = Set(Some(next_state.to_string()));
        let updated = active.update(&self.db).await?;
        let receiver_ids = self
            .commit_notification_receiver_ids(
                project.id,
                input.actor_id,
                "REVIEW_THREAD_STATE_CHANGED",
            )
            .await?;
        self.create_notification_event_for_commit_discussion(
            input.actor_id,
            "COMMENT_THREAD",
            &updated.id.to_string(),
            "REVIEW_THREAD_STATE_CHANGED",
            &old_state,
            next_state,
            &receiver_ids,
        )
        .await?;
        let comments = self.list_review_comments(updated.id).await?;
        self.review_thread_record(updated, comments).await.map(Some)
    }

    pub async fn delete_commit_discussion_comment(
        &self,
        input: DeleteCommitDiscussionCommentInput,
    ) -> Result<Option<()>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = review_comment::Entity::find_by_id(input.comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(thread_id) = comment.thread_id else {
            return Ok(None);
        };
        let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if thread.project_id != Some(project.id)
            || thread.pull_request_id.is_some()
            || thread.commit_id.as_deref() != Some(input.commit_id.as_str())
        {
            return Ok(None);
        }
        review_comment::Entity::delete_by_id(input.comment_id)
            .exec(&self.db)
            .await?;
        let remaining = review_comment::Entity::find()
            .filter(review_comment::Column::ThreadId.eq(Some(thread_id)))
            .count(&self.db)
            .await?;
        if remaining == 0 {
            comment_thread::Entity::delete_by_id(thread_id)
                .exec(&self.db)
                .await?;
        }
        Ok(Some(()))
    }

    pub async fn list_project_review_threads(
        &self,
        project: &ProjectRecord,
        filter: ReviewThreadListFilter,
    ) -> Result<ReviewThreadListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        let page_num = filter.page_num.max(1);
        let state = match normalize_identity(&filter.state).as_str() {
            "closed" => "closed".to_string(),
            _ => "open".to_string(),
        };
        let text_filter = filter
            .filter
            .as_deref()
            .map(normalize_identity)
            .filter(|value| !value.is_empty());
        let order_by_updated = normalize_identity(&filter.order_by) == "updateddate";
        if text_filter.is_none() && filter.participant_id.is_none() && !order_by_updated {
            let mut base = comment_thread::Entity::find()
                .filter(comment_thread::Column::ProjectId.eq(Some(project.id)))
                .filter(comment_thread::Column::PullRequestId.is_not_null());
            if let Some(author_id) = filter.author_id {
                base = base.filter(comment_thread::Column::AuthorId.eq(Some(author_id)));
            }
            let open_count = base
                .clone()
                .filter(review_thread_open_condition())
                .count(&self.db)
                .await? as u32;
            let closed_count = base
                .clone()
                .filter(review_thread_closed_condition())
                .count(&self.db)
                .await? as u32;
            let mut page_select = if state == "closed" {
                base.filter(review_thread_closed_condition())
            } else {
                base.filter(review_thread_open_condition())
            };
            let total_count = page_select.clone().count(&self.db).await? as u32;
            page_select = if normalize_identity(&filter.order_dir) == "asc" {
                page_select
                    .order_by_asc(comment_thread::Column::CreatedDate)
                    .order_by_asc(comment_thread::Column::Id)
            } else {
                page_select
                    .order_by_desc(comment_thread::Column::CreatedDate)
                    .order_by_desc(comment_thread::Column::Id)
            };
            let rows = page_select
                .paginate(&self.db, PAGE_SIZE as u64)
                .fetch_page((page_num - 1) as u64)
                .await?;
            let mut items = Vec::new();
            for row in rows {
                let comments = self.list_review_comments(row.id).await?;
                items.push(self.review_thread_record(row, comments).await?);
            }
            return Ok(ReviewThreadListRecord {
                closed_count,
                items,
                open_count,
                page_num,
                page_size: PAGE_SIZE,
                state,
                total_count,
            });
        }
        let rows = comment_thread::Entity::find()
            .filter(comment_thread::Column::ProjectId.eq(Some(project.id)))
            .filter(comment_thread::Column::PullRequestId.is_not_null())
            .all(&self.db)
            .await?;
        let mut matched = Vec::new();
        for row in rows {
            if filter.author_id.is_some() && row.author_id != filter.author_id {
                continue;
            }
            let (comments, latest_comment_created) =
                self.list_review_comments_with_latest(row.id).await?;
            if filter.participant_id.is_some()
                && row.author_id != filter.participant_id
                && !comments
                    .iter()
                    .any(|comment| comment.author_id == filter.participant_id)
            {
                continue;
            }
            if let Some(text_filter) = text_filter.as_deref() {
                let path_matches = row
                    .path
                    .as_deref()
                    .is_some_and(|path| normalize_identity(path).contains(text_filter));
                let comment_matches = comments.iter().any(|comment| {
                    normalize_identity(&comment.contents_markdown).contains(text_filter)
                });
                if !path_matches && !comment_matches {
                    continue;
                }
            }
            matched.push((row, comments, latest_comment_created));
        }
        let open_count = matched
            .iter()
            .filter(|(row, _, _)| review_thread_state(row.state.as_deref()) == "open")
            .count() as u32;
        let closed_count = matched
            .iter()
            .filter(|(row, _, _)| review_thread_state(row.state.as_deref()) == "closed")
            .count() as u32;
        matched.retain(|(row, _, _)| review_thread_state(row.state.as_deref()) == state);
        let descending = normalize_identity(&filter.order_dir) != "asc";
        let order_by_updated = normalize_identity(&filter.order_by) == "updateddate";
        matched.sort_by(|(left, _, left_updated), (right, _, right_updated)| {
            let left_key = if order_by_updated {
                left_updated.or(left.created_date)
            } else {
                left.created_date
            };
            let right_key = if order_by_updated {
                right_updated.or(right.created_date)
            } else {
                right.created_date
            };
            let ordering = right_key
                .cmp(&left_key)
                .then_with(|| right.id.cmp(&left.id));
            if descending {
                ordering
            } else {
                ordering.reverse()
            }
        });
        let total_count = matched.len() as u32;
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let mut items = Vec::new();
        for (row, comments, _) in matched.into_iter().skip(offset).take(PAGE_SIZE as usize) {
            items.push(self.review_thread_record(row, comments).await?);
        }
        Ok(ReviewThreadListRecord {
            closed_count,
            items,
            open_count,
            page_num,
            page_size: PAGE_SIZE,
            state,
            total_count,
        })
    }

    pub async fn list_workspace_emails_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<WorkspaceEmailRecord>, DbErr> {
        let rows = email::Entity::find()
            .filter(email::Column::UserId.eq(Some(user_id)))
            .order_by_asc(email::Column::Id)
            .all(&self.db)
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| {
                Some(WorkspaceEmailRecord {
                    email_address: row.email?,
                    id: row.id.to_string(),
                    valid: row.valid.unwrap_or_default() != 0,
                })
            })
            .collect())
    }

    pub async fn read_api_token_for_user(&self, user_id: i64) -> Result<Option<String>, DbErr> {
        Ok(n4user::Entity::find_by_id(user_id)
            .one(&self.db)
            .await?
            .and_then(|row| row.token))
    }

    pub async fn reset_api_token_for_user(&self, user_id: i64) -> Result<String, DbErr> {
        let Some(model) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };
        let token = random_workspace_token();
        let mut active = n4user::ActiveModel::from(model);
        active.token = Set(Some(token.clone()));
        active.update(&self.db).await?;
        Ok(token)
    }

    pub async fn update_profile_for_user(
        &self,
        user_id: i64,
        name: &str,
        email_address: &str,
    ) -> Result<AppUserRecord, DbErr> {
        let Some(model) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };
        let normalized_email = normalize_identity(email_address);
        if normalized_email.is_empty() {
            return Err(DbErr::Custom("Email address is required.".to_string()));
        }
        if !looks_like_email_address(&normalized_email) {
            return Err(DbErr::Custom("Email address is invalid.".to_string()));
        }

        let duplicate_email = n4user::Entity::find()
            .filter(n4user::Column::Id.ne(user_id))
            .all(&self.db)
            .await?
            .into_iter()
            .any(|row| {
                normalize_optional(row.email.as_deref()).as_deref()
                    == Some(normalized_email.as_str())
            });
        if duplicate_email {
            return Err(DbErr::Custom(
                "Email address is already in use.".to_string(),
            ));
        }
        let duplicate_valid_secondary = email::Entity::find()
            .filter(email::Column::Email.eq(Some(normalized_email.clone())))
            .filter(email::Column::Valid.eq(Some(1)))
            .one(&self.db)
            .await?;
        if duplicate_valid_secondary.is_some() {
            return Err(DbErr::Custom(
                "Email address is already in use.".to_string(),
            ));
        }

        let mut active = n4user::ActiveModel::from(model);
        active.name = Set(Some(name.trim().to_string()));
        active.email = Set(Some(normalized_email));
        let updated = active.update(&self.db).await?;
        self.app_user_record_from_model(updated).await
    }

    pub async fn update_password_hash_for_user(
        &self,
        user_id: i64,
        password_hash: &str,
    ) -> Result<(), DbErr> {
        let Some(model) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };
        let mut active = n4user::ActiveModel::from(model);
        active.password = Set(Some(password_hash.to_string()));
        active.update(&self.db).await?;
        Ok(())
    }

    pub async fn mark_user_confirmed(&self, user_id: i64) -> Result<AppUserRecord, DbErr> {
        let Some(model) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };
        let mut active = n4user::ActiveModel::from(model);
        active.state = Set(user_state_from_confirmed(true));
        let updated = active.update(&self.db).await?;
        self.app_user_record_from_model(updated).await
    }

    pub async fn create_password_reset_verification_for_user(
        &self,
        user_id: i64,
        login_id: &str,
    ) -> Result<String, DbErr> {
        let code = prefixed_verification_code(PASSWORD_RESET_VERIFICATION_PREFIX);
        let rows = user_verification::Entity::find()
            .filter(user_verification::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        for row in rows.into_iter().filter(|row| {
            row.verification_code
                .as_deref()
                .unwrap_or_default()
                .starts_with(PASSWORD_RESET_VERIFICATION_PREFIX)
        }) {
            user_verification::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        user_verification::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            login_id: Set(Some(login_id.to_string())),
            verification_code: Set(Some(code.clone())),
            timestamp: Set(Some(current_timestamp_millis())),
        }
        .insert(&self.db)
        .await?;
        Ok(code)
    }

    pub async fn create_signup_verification_for_user(
        &self,
        user_id: i64,
        login_id: &str,
    ) -> Result<String, DbErr> {
        let code = prefixed_verification_code(SIGNUP_VERIFICATION_PREFIX);
        let rows = user_verification::Entity::find()
            .filter(user_verification::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        for row in rows.into_iter().filter(|row| {
            row.verification_code
                .as_deref()
                .unwrap_or_default()
                .starts_with(SIGNUP_VERIFICATION_PREFIX)
        }) {
            user_verification::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        user_verification::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            login_id: Set(Some(login_id.to_string())),
            verification_code: Set(Some(code.clone())),
            timestamp: Set(Some(current_timestamp_millis())),
        }
        .insert(&self.db)
        .await?;
        Ok(code)
    }

    pub async fn find_valid_password_reset_user_id(
        &self,
        verification_code: &str,
    ) -> Result<Option<i64>, DbErr> {
        let Some(verification) = user_verification::Entity::find()
            .filter(
                user_verification::Column::VerificationCode.eq(Some(verification_code.to_string())),
            )
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if !verification
            .verification_code
            .as_deref()
            .unwrap_or_default()
            .starts_with(PASSWORD_RESET_VERIFICATION_PREFIX)
        {
            return Ok(None);
        }

        let age_millis = current_timestamp_millis() - verification.timestamp.unwrap_or_default();
        if age_millis > 60 * 60 * 1000 {
            user_verification::Entity::delete_by_id(verification.id)
                .exec(&self.db)
                .await?;
            return Ok(None);
        }

        Ok(verification.user_id)
    }

    pub async fn find_valid_signup_verification_user_id(
        &self,
        login_id: &str,
        verification_code: &str,
    ) -> Result<Option<i64>, DbErr> {
        let normalized_login_id = normalize_identity(login_id);
        let Some(verification) = user_verification::Entity::find()
            .filter(user_verification::Column::LoginId.eq(Some(normalized_login_id)))
            .filter(
                user_verification::Column::VerificationCode.eq(Some(verification_code.to_string())),
            )
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if !verification
            .verification_code
            .as_deref()
            .unwrap_or_default()
            .starts_with(SIGNUP_VERIFICATION_PREFIX)
        {
            return Ok(None);
        }
        let age_millis = current_timestamp_millis() - verification.timestamp.unwrap_or_default();
        if age_millis > 24 * 60 * 60 * 1000 {
            user_verification::Entity::delete_by_id(verification.id)
                .exec(&self.db)
                .await?;
            return Ok(None);
        }
        Ok(verification.user_id)
    }

    pub async fn delete_password_reset_verification(
        &self,
        verification_code: &str,
    ) -> Result<(), DbErr> {
        let rows = user_verification::Entity::find()
            .filter(
                user_verification::Column::VerificationCode.eq(Some(verification_code.to_string())),
            )
            .all(&self.db)
            .await?;
        for row in rows {
            user_verification::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn delete_signup_verification(&self, verification_code: &str) -> Result<(), DbErr> {
        let rows = user_verification::Entity::find()
            .filter(
                user_verification::Column::VerificationCode.eq(Some(verification_code.to_string())),
            )
            .all(&self.db)
            .await?;
        for row in rows.into_iter().filter(|row| {
            row.verification_code
                .as_deref()
                .unwrap_or_default()
                .starts_with(SIGNUP_VERIFICATION_PREFIX)
        }) {
            user_verification::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn create_user_attachment_upload(
        &self,
        user_id: i64,
        login_id: &str,
        file_name: &str,
        mime_type: &str,
        size: i64,
        hash: &str,
    ) -> Result<AttachmentRecord, DbErr> {
        let created = attachment::ActiveModel {
            id: NotSet,
            name: Set(Some(file_name.to_string())),
            hash: Set(Some(hash.to_string())),
            container_type: Set(Some(USER_ATTACHMENT_CONTAINER.to_string())),
            mime_type: Set(Some(mime_type.to_string())),
            size: Set(Some(size)),
            container_id: Set(user_id),
            created_date: Set(Some(current_datetime())),
            owner_login_id: Set(Some(login_id.to_string())),
        }
        .insert(&self.db)
        .await?;
        Ok(AttachmentRecord {
            container_id: created.container_id,
            container_type: created.container_type.unwrap_or_default(),
            hash: created.hash.unwrap_or_default(),
            id: created.id,
            mime_type: created.mime_type.unwrap_or_default(),
            name: created.name.unwrap_or_default(),
            owner_login_id: created.owner_login_id.unwrap_or_default(),
            size: created.size.unwrap_or_default(),
        })
    }

    pub async fn read_attachment_by_id(
        &self,
        attachment_id: i64,
    ) -> Result<Option<AttachmentRecord>, DbErr> {
        let Some(model) = attachment::Entity::find_by_id(attachment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        Ok(Some(AttachmentRecord {
            container_id: model.container_id,
            container_type: model.container_type.unwrap_or_default(),
            hash: model.hash.unwrap_or_default(),
            id: model.id,
            mime_type: model.mime_type.unwrap_or_default(),
            name: model.name.unwrap_or_default(),
            owner_login_id: model.owner_login_id.unwrap_or_default(),
            size: model.size.unwrap_or_default(),
        }))
    }

    pub async fn read_avatar_attachment_for_user(
        &self,
        user_id: i64,
    ) -> Result<Option<AttachmentRecord>, DbErr> {
        let Some(model) = attachment::Entity::find()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(USER_AVATAR_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(user_id))
            .order_by_desc(attachment::Column::Id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        Ok(Some(AttachmentRecord {
            container_id: model.container_id,
            container_type: model.container_type.unwrap_or_default(),
            hash: model.hash.unwrap_or_default(),
            id: model.id,
            mime_type: model.mime_type.unwrap_or_default(),
            name: model.name.unwrap_or_default(),
            owner_login_id: model.owner_login_id.unwrap_or_default(),
            size: model.size.unwrap_or_default(),
        }))
    }

    pub async fn promote_avatar_attachment_for_user(
        &self,
        user_id: i64,
        attachment_id: i64,
    ) -> Result<Option<AttachmentRecord>, DbErr> {
        let Some(model) = attachment::Entity::find_by_id(attachment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if model.container_id != user_id
            || model.container_type.as_deref() != Some(USER_ATTACHMENT_CONTAINER)
        {
            return Ok(None);
        }
        let previous_rows = attachment::Entity::find()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(USER_AVATAR_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(user_id))
            .all(&self.db)
            .await?;
        for row in previous_rows {
            attachment::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        let mut active = attachment::ActiveModel::from(model);
        active.container_type = Set(Some(USER_AVATAR_ATTACHMENT_CONTAINER.to_string()));
        let updated = active.update(&self.db).await?;
        Ok(Some(AttachmentRecord {
            container_id: updated.container_id,
            container_type: updated.container_type.unwrap_or_default(),
            hash: updated.hash.unwrap_or_default(),
            id: updated.id,
            mime_type: updated.mime_type.unwrap_or_default(),
            name: updated.name.unwrap_or_default(),
            owner_login_id: updated.owner_login_id.unwrap_or_default(),
            size: updated.size.unwrap_or_default(),
        }))
    }

    pub async fn read_project_by_id(
        &self,
        project_id: i64,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let row = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?;
        let Some(row) = row else {
            return Ok(None);
        };
        self.project_record_from_model(row).await
    }

    pub async fn set_project_watch(
        &self,
        user_id: i64,
        project_id: i64,
        watching: bool,
    ) -> Result<(), DbErr> {
        let existing = watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .all(&self.db)
            .await?;

        if watching {
            if existing.is_empty() {
                watch::ActiveModel {
                    id: NotSet,
                    user_id: Set(Some(user_id)),
                    resource_type: Set(Some("PROJECT".to_string())),
                    resource_id: Set(Some(project_id.to_string())),
                }
                .insert(&self.db)
                .await?;
            }
        } else {
            for row in existing {
                watch::Entity::delete_by_id(row.id).exec(&self.db).await?;
            }
        }

        Ok(())
    }

    pub async fn is_watching_project(&self, user_id: i64, project_id: i64) -> Result<bool, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .one(&self.db)
            .await?
            .is_some())
    }

    pub async fn clear_recent_projects_for_user(&self, user_id: i64) -> Result<(), DbErr> {
        let rows = recent_project::Entity::find()
            .filter(recent_project::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        for row in rows {
            recent_project::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn add_workspace_email_for_user(
        &self,
        user_id: i64,
        email_address: &str,
    ) -> Result<(), DbErr> {
        let normalized_email = normalize_identity(email_address);
        if normalized_email.is_empty() {
            return Err(DbErr::Custom("Email address is required.".to_string()));
        }
        if !looks_like_email_address(&normalized_email) {
            return Err(DbErr::Custom("Email address is invalid.".to_string()));
        }

        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };
        if normalize_optional(user.email.as_deref()).as_deref() == Some(normalized_email.as_str()) {
            return Err(DbErr::Custom(
                "Email address is already in use.".to_string(),
            ));
        }

        let duplicate = email::Entity::find()
            .filter(email::Column::Email.eq(Some(normalized_email.clone())))
            .one(&self.db)
            .await?;
        if duplicate.is_some() {
            return Err(DbErr::Custom(
                "Email address is already in use.".to_string(),
            ));
        }

        email::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            email: Set(Some(normalized_email)),
            valid: Set(Some(0)),
            token: Set(Some(random_workspace_token())),
        }
        .insert(&self.db)
        .await?;

        Ok(())
    }

    pub async fn delete_workspace_email_for_user(
        &self,
        user_id: i64,
        email_id: i64,
    ) -> Result<(), DbErr> {
        let Some(model) = email::Entity::find_by_id(email_id).one(&self.db).await? else {
            return Err(DbErr::Custom("Email not found.".to_string()));
        };
        if model.user_id != Some(user_id) {
            return Err(DbErr::Custom("Email not found.".to_string()));
        }
        email::Entity::delete_by_id(email_id).exec(&self.db).await?;
        Ok(())
    }

    pub async fn send_workspace_email_validation_for_user(
        &self,
        user_id: i64,
        email_id: i64,
    ) -> Result<(), DbErr> {
        let Some(model) = email::Entity::find_by_id(email_id).one(&self.db).await? else {
            return Err(DbErr::Custom("Email not found.".to_string()));
        };
        if model.user_id != Some(user_id) {
            return Err(DbErr::Custom("Email not found.".to_string()));
        }
        let mut active = email::ActiveModel::from(model);
        active.token = Set(Some(random_workspace_token()));
        active.update(&self.db).await?;
        Ok(())
    }

    pub async fn read_workspace_email_token_for_user(
        &self,
        user_id: i64,
        email_id: i64,
    ) -> Result<Option<(String, String)>, DbErr> {
        let Some(model) = email::Entity::find_by_id(email_id).one(&self.db).await? else {
            return Ok(None);
        };
        if model.user_id != Some(user_id) {
            return Ok(None);
        }
        match (model.email, model.token) {
            (Some(address), Some(token)) => Ok(Some((address, token))),
            _ => Ok(None),
        }
    }

    pub async fn confirm_workspace_email_for_user(
        &self,
        email_id: i64,
        token: &str,
    ) -> Result<Option<i64>, DbErr> {
        let Some(model) = email::Entity::find_by_id(email_id).one(&self.db).await? else {
            return Ok(None);
        };
        if model.token.as_deref() != Some(token) {
            return Ok(None);
        }

        let user_id = model.user_id;
        let email_address = model.email.clone();
        let mut active = email::ActiveModel::from(model);
        active.valid = Set(Some(1));
        active.token = Set(None);
        active.update(&self.db).await?;

        if let Some(email_address) = email_address {
            let invalid_rows = email::Entity::find()
                .filter(email::Column::Email.eq(Some(email_address)))
                .filter(email::Column::Valid.eq(Some(0)))
                .all(&self.db)
                .await?;
            for row in invalid_rows {
                email::Entity::delete_by_id(row.id).exec(&self.db).await?;
            }
        }

        Ok(user_id)
    }

    pub async fn set_main_workspace_email_for_user(
        &self,
        user_id: i64,
        email_id: i64,
    ) -> Result<AppUserRecord, DbErr> {
        let Some(selected_email) = email::Entity::find_by_id(email_id).one(&self.db).await? else {
            return Err(DbErr::Custom("Email not found.".to_string()));
        };
        if selected_email.user_id != Some(user_id) {
            return Err(DbErr::Custom("Email not found.".to_string()));
        }
        if selected_email.valid.unwrap_or_default() == 0 {
            return Err(DbErr::Custom("Email must be validated first.".to_string()));
        }
        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };

        let old_main_email = user.email.clone().unwrap_or_default();
        let selected_value = selected_email.email.clone().unwrap_or_default();

        let mut user_active = n4user::ActiveModel::from(user);
        user_active.email = Set(Some(selected_value));
        let updated_user = user_active.update(&self.db).await?;

        email::Entity::delete_by_id(email_id).exec(&self.db).await?;
        if !old_main_email.is_empty() {
            email::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                email: Set(Some(normalize_identity(&old_main_email))),
                valid: Set(Some(1)),
                token: Set(None),
            }
            .insert(&self.db)
            .await?;
        }

        self.app_user_record_from_model(updated_user).await
    }

    pub async fn list_watched_project_notifications_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<WatchedProjectNotificationsRecord>, DbErr> {
        let watched_rows = watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .order_by_desc(watch::Column::Id)
            .all(&self.db)
            .await?;

        let mut watched_projects = Vec::new();
        for watch_row in watched_rows {
            let Some(project_id) = watch_row
                .resource_id
                .as_deref()
                .and_then(|value| value.parse::<i64>().ok())
            else {
                continue;
            };
            let Some(project_row) = project::Entity::find_by_id(project_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            let (Some(owner_name), Some(project_name)) =
                (project_row.owner.clone(), project_row.name.clone())
            else {
                continue;
            };

            let overrides = user_project_notification::Entity::find()
                .filter(user_project_notification::Column::UserId.eq(Some(user_id)))
                .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
                .all(&self.db)
                .await?;

            let notifications = WORKSPACE_NOTIFICATION_TYPES
                .iter()
                .map(|(event_type, label)| {
                    let enabled = overrides
                        .iter()
                        .find(|row| row.notification_type.as_deref() == Some(*event_type))
                        .map(|row| row.allowed.unwrap_or(1) != 0)
                        .unwrap_or_else(|| workspace_notification_enabled_by_default(event_type));

                    WorkspaceNotificationPreferenceRecord {
                        enabled,
                        event_type: (*event_type).to_string(),
                        label: (*label).to_string(),
                    }
                })
                .collect();

            watched_projects.push(WatchedProjectNotificationsRecord {
                notifications,
                owner_name,
                project_id: project_id.to_string(),
                project_name,
            });
        }

        Ok(watched_projects)
    }

    pub async fn toggle_workspace_notification_for_user(
        &self,
        user_id: i64,
        project_id: i64,
        event_type: &str,
    ) -> Result<(), DbErr> {
        let existing = user_project_notification::Entity::find()
            .filter(user_project_notification::Column::UserId.eq(Some(user_id)))
            .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
            .filter(
                user_project_notification::Column::NotificationType
                    .eq(Some(event_type.to_string())),
            )
            .one(&self.db)
            .await?;

        match existing {
            Some(row) => {
                let current_allowed = row.allowed.unwrap_or(1) != 0;
                let next_allowed = !current_allowed;
                if next_allowed == workspace_notification_enabled_by_default(event_type) {
                    user_project_notification::Entity::delete_by_id(row.id)
                        .exec(&self.db)
                        .await?;
                } else {
                    let mut active = user_project_notification::ActiveModel::from(row);
                    active.allowed = Set(Some(if next_allowed { 1 } else { 0 }));
                    active.update(&self.db).await?;
                }
            }
            None => {
                let next_allowed = !workspace_notification_enabled_by_default(event_type);
                user_project_notification::ActiveModel {
                    id: NotSet,
                    user_id: Set(Some(user_id)),
                    project_id: Set(Some(project_id)),
                    notification_type: Set(Some(event_type.to_string())),
                    allowed: Set(Some(if next_allowed { 1 } else { 0 })),
                }
                .insert(&self.db)
                .await?;
            }
        }

        Ok(())
    }

    pub async fn list_notifications_for_user(
        &self,
        user_id: i64,
        from: u32,
        size: u32,
    ) -> Result<NotificationListRecord, DbErr> {
        let receivers = notification_event_n4user::Entity::find()
            .filter(notification_event_n4user::Column::N4userId.eq(user_id))
            .all(&self.db)
            .await?;
        let mut events = Vec::new();
        for receiver in receivers {
            let event = notification_event::Entity::find_by_id(receiver.notification_event_id)
                .one(&self.db)
                .await?;
            if let Some(event) = event {
                events.push(event);
            }
        }
        events.sort_by(|left, right| {
            right
                .created
                .cmp(&left.created)
                .then_with(|| right.id.cmp(&left.id))
        });

        let total = events.len() as u32;
        let from = from as usize;
        let size = size.clamp(1, 100) as usize;
        let has_more = from.saturating_add(size) < events.len();
        let page = events.into_iter().skip(from).take(size);
        let mut items = Vec::new();
        for event in page {
            items.push(self.notification_item_record(event).await?);
        }

        Ok(NotificationListRecord {
            has_more,
            items,
            total,
        })
    }

    pub async fn drain_due_notification_mails(
        &self,
        now: DateTime,
        delay_ms: i64,
    ) -> Result<Vec<i64>, DbErr> {
        let mails = notification_mail::Entity::find().all(&self.db).await?;
        let mut due = Vec::new();
        for mail in mails {
            let Some(event_id) = mail.notification_event_id else {
                continue;
            };
            let Some(event) = notification_event::Entity::find_by_id(event_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            if notification_mail_is_due(event.created, now, delay_ms) {
                due.push((event.created, event.id, mail.id));
            }
        }
        due.sort_by(|left, right| {
            left.0
                .cmp(&right.0)
                .then_with(|| left.1.cmp(&right.1))
                .then_with(|| left.2.cmp(&right.2))
        });
        let event_ids = due
            .iter()
            .map(|(_, event_id, _)| *event_id)
            .collect::<Vec<_>>();
        let mail_ids = due
            .iter()
            .map(|(_, _, mail_id)| *mail_id)
            .collect::<Vec<_>>();
        if !mail_ids.is_empty() {
            notification_mail::Entity::delete_many()
                .filter(notification_mail::Column::Id.is_in(mail_ids))
                .exec(&self.db)
                .await?;
        }
        Ok(event_ids)
    }

    pub async fn read_default_landing_path(&self, user_id: i64) -> Result<Option<String>, DbErr> {
        let row = user_setting::Entity::find()
            .filter(user_setting::Column::UserId.eq(Some(user_id)))
            .order_by_desc(user_setting::Column::Id)
            .one(&self.db)
            .await?;
        Ok(row.and_then(|model| model.login_default_page))
    }

    pub async fn set_default_landing_path(
        &self,
        user_id: i64,
        path: Option<String>,
    ) -> Result<Option<String>, DbErr> {
        let existing = user_setting::Entity::find()
            .filter(user_setting::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;

        if let Some(path) = path {
            let normalized_path = path.trim().to_string();
            if let Some(current) = existing.into_iter().next() {
                let mut active = user_setting::ActiveModel::from(current);
                active.login_default_page = Set(Some(normalized_path.clone()));
                active.update(&self.db).await?;
            } else {
                user_setting::ActiveModel {
                    id: NotSet,
                    user_id: Set(Some(user_id)),
                    login_default_page: Set(Some(normalized_path.clone())),
                }
                .insert(&self.db)
                .await?;
            }

            Ok(Some(normalized_path))
        } else {
            for row in existing {
                user_setting::Entity::delete_by_id(row.id)
                    .exec(&self.db)
                    .await?;
            }
            Ok(None)
        }
    }

    async fn app_user_record_from_model(
        &self,
        model: n4user::Model,
    ) -> Result<AppUserRecord, DbErr> {
        let is_site_admin = site_admin::Entity::find()
            .filter(site_admin::Column::AdminId.eq(Some(model.id)))
            .one(&self.db)
            .await?
            .is_some();

        Ok(AppUserRecord {
            id: model.id,
            display_name: model.name.unwrap_or_default(),
            email_address: model.email.unwrap_or_default(),
            is_confirmed: normalize_optional(model.state.as_deref()).as_deref() == Some("active"),
            is_site_admin,
            login_id: model.login_id.unwrap_or_default(),
            password_hash: model.password.unwrap_or_default(),
        })
    }

    async fn list_connected_social_providers_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<String>, DbErr> {
        let credentials = user_credential::Entity::find()
            .filter(user_credential::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        let mut providers = Vec::new();

        for credential in credentials {
            let linked_accounts = linked_account::Entity::find()
                .filter(linked_account::Column::UserCredentialId.eq(Some(credential.id)))
                .all(&self.db)
                .await?;
            for account in linked_accounts {
                if let Some(provider_key) = normalize_optional(account.provider_key.as_deref()) {
                    providers.push(provider_key);
                }
            }
        }

        providers.sort();
        providers.dedup();
        Ok(providers)
    }

    fn organization_record_from_model(
        &self,
        model: organization::Model,
    ) -> Option<OrganizationRecord> {
        Some(OrganizationRecord {
            id: model.id,
            organization_name: model.name?,
            description: model.descr,
        })
    }

    async fn project_record_from_row(
        &self,
        row: ProjectRow,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let organization_name = match row.organization_id {
            Some(organization_id) => organization::Entity::find_by_id(organization_id)
                .one(&self.db)
                .await?
                .and_then(|item| item.name),
            None => None,
        };

        let owner_name = row.owner.unwrap_or_default();
        let project_name = row.name.unwrap_or_default();
        if owner_name.is_empty() || project_name.is_empty() {
            return Ok(None);
        }

        Ok(Some(ProjectRecord {
            created_date: row.created_date,
            is_code_accessible_member_only: row.is_code_accessible_member_only.unwrap_or_default()
                != 0,
            last_pushed_date: row.last_pushed_date,
            id: row.id,
            original_project_id: row.original_project_id,
            organization_id: row.organization_id,
            organization_name,
            owner_name,
            overview: row.overview,
            project_name,
            project_scope: row.project_scope.unwrap_or_else(|| "public".to_string()),
        }))
    }

    async fn project_record_from_model(
        &self,
        model: project::Model,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let organization_name = match model.organization_id {
            Some(organization_id) => organization::Entity::find_by_id(organization_id)
                .one(&self.db)
                .await?
                .and_then(|row| row.name),
            None => None,
        };

        let owner_name = model.owner.unwrap_or_default();
        let project_name = model.name.unwrap_or_default();
        if owner_name.is_empty() || project_name.is_empty() {
            return Ok(None);
        }

        Ok(Some(ProjectRecord {
            created_date: model.created_date,
            is_code_accessible_member_only: model
                .is_code_accessible_member_only
                .unwrap_or_default()
                != 0,
            last_pushed_date: model.last_pushed_date,
            id: model.id,
            original_project_id: model.original_project_id,
            organization_id: model.organization_id,
            organization_name,
            owner_name,
            overview: model.overview,
            project_name,
            project_scope: model.project_scope.unwrap_or_else(|| "public".to_string()),
        }))
    }

    async fn issue_record_from_model(
        &self,
        model: issue::Model,
        project: &ProjectRecord,
        viewer_id: Option<i64>,
    ) -> Result<IssueRecord, DbErr> {
        let (assignee_login_id, assignee_label) =
            self.issue_assignee_summary(model.assignee_id).await?;
        let (milestone_id, milestone_title) =
            self.issue_milestone_summary(model.milestone_id).await?;
        let labels = self.list_issue_labels(model.id).await?;
        let sharers = self.list_issue_sharers(model.id).await?;
        let comments = self.list_issue_comments(model.id, viewer_id).await?;
        let timeline = self.list_issue_timeline_items(model.id, viewer_id).await?;
        let attachments = self.list_issue_attachments("ISSUE", model.id).await?;
        let voter_count = self.count_issue_voters(model.id).await?;
        let watcher_count = self.count_issue_watchers(model.id).await?;
        let has_voted = match viewer_id {
            Some(user_id) => issue_voter::Entity::find_by_id((model.id, user_id))
                .one(&self.db)
                .await?
                .is_some(),
            None => false,
        };
        let is_favorited = match viewer_id {
            Some(user_id) => self.is_issue_favorited_by(model.id, user_id).await?,
            None => false,
        };
        let is_watching = match viewer_id {
            Some(user_id) => self.is_issue_watched_by(model.id, user_id).await?,
            None => false,
        };

        Ok(IssueRecord {
            assignee_label,
            assignee_login_id,
            attachments,
            author_id: model.author_id,
            author_label: model.author_name.unwrap_or_default(),
            author_login_id: model.author_login_id.unwrap_or_default(),
            body_markdown: self.read_text_column("issue", "body", model.id).await?,
            comment_count: model.num_of_comments.unwrap_or_default().max(0) as u32,
            comments,
            has_voted,
            id: model.id,
            is_favorited,
            is_watching,
            issue_number: model.number.unwrap_or_default(),
            labels,
            sharers,
            milestone_id,
            milestone_title,
            owner_name: project.owner_name.clone(),
            project_name: project.project_name.clone(),
            state: issue_state_from_raw(model.state),
            timeline,
            title: model.title.unwrap_or_default(),
            updated_label: format_workspace_date_label(model.updated_date),
            voter_count,
            watcher_count,
        })
    }

    async fn read_project_pull_request_model(
        &self,
        owner_name: &str,
        project_name: &str,
        pull_request_number: i64,
    ) -> Result<Option<(ProjectRecord, pull_request::Model)>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        let row = pull_request::Entity::find()
            .filter(pull_request::Column::ToProjectId.eq(Some(project.id)))
            .filter(pull_request::Column::Number.eq(Some(pull_request_number)))
            .one(&self.db)
            .await?;
        Ok(row.map(|row| (project, row)))
    }

    async fn user_record_for_optional_id(
        &self,
        user_id: Option<i64>,
    ) -> Result<PullRequestUserRecord, DbErr> {
        let Some(user_id) = user_id else {
            return Ok(PullRequestUserRecord {
                login_id: String::new(),
                user_id: 0,
                user_label: String::new(),
            });
        };
        Ok(self
            .find_user_by_id(user_id)
            .await?
            .map(|user| PullRequestUserRecord {
                login_id: user.login_id,
                user_id: user.id,
                user_label: user.display_name,
            })
            .unwrap_or(PullRequestUserRecord {
                login_id: String::new(),
                user_id,
                user_label: String::new(),
            }))
    }

    async fn pull_request_list_item_from_model(
        &self,
        row: pull_request::Model,
        project: &ProjectRecord,
    ) -> Result<PullRequestListItemRecord, DbErr> {
        let contributor = self.user_record_for_optional_id(row.contributor_id).await?;
        let receiver = self.user_record_for_optional_id(row.receiver_id).await?;
        let from_project = match row.from_project_id {
            Some(from_project_id) => self.read_project_by_id(from_project_id).await?,
            None => None,
        }
        .unwrap_or_else(|| project.clone());
        let comment_thread_count = comment_thread::Entity::find()
            .filter(comment_thread::Column::PullRequestId.eq(Some(row.id)))
            .count(&self.db)
            .await? as u32;
        let reviewer_count = pull_request_reviewers::Entity::find()
            .filter(pull_request_reviewers::Column::PullRequestId.eq(row.id))
            .count(&self.db)
            .await? as u32;

        Ok(PullRequestListItemRecord {
            comment_thread_count,
            conflict: row.is_conflict.unwrap_or_default() != 0,
            contributor_label: contributor.user_label,
            contributor_login_id: contributor.login_id,
            created_label: format_workspace_date_label(row.created),
            from_branch: row.from_branch.unwrap_or_default(),
            from_owner_name: from_project.owner_name,
            from_project_name: from_project.project_name,
            id: row.id,
            owner_name: project.owner_name.clone(),
            project_name: project.project_name.clone(),
            pull_request_number: row.number.unwrap_or_default(),
            receiver_label: receiver.user_label,
            receiver_login_id: receiver.login_id,
            reviewer_count,
            state: pull_request_state_from_raw(row.state, row.is_conflict),
            title: row.title.unwrap_or_default(),
            to_branch: row.to_branch.unwrap_or_default(),
            updated_label: format_workspace_date_label(row.updated.or(row.created)),
        })
    }

    async fn pull_request_detail_from_model(
        &self,
        row: pull_request::Model,
        project: &ProjectRecord,
        viewer_id: Option<i64>,
    ) -> Result<PullRequestDetailRecord, DbErr> {
        let list_item = self
            .pull_request_list_item_from_model(row.clone(), project)
            .await?;
        let contributor = self.user_record_for_optional_id(row.contributor_id).await?;
        let receiver = self.user_record_for_optional_id(row.receiver_id).await?;
        let reviewers = self.list_pull_request_reviewers(row.id).await?;
        let threads = self.list_pull_request_review_threads(row.id).await?;
        let commits = self.list_pull_request_commits(row.id).await?;
        let events = self.list_pull_request_events(row.id).await?;
        let watcher_count = self.count_pull_request_watchers(row.id).await?;
        let is_watching = match viewer_id {
            Some(user_id) => self.is_pull_request_watched_by(row.id, user_id).await?,
            None => false,
        };

        Ok(PullRequestDetailRecord {
            body_markdown: self
                .read_text_column("pull_request", "body", row.id)
                .await?,
            commits,
            conflict: list_item.conflict,
            contributor,
            created_label: list_item.created_label,
            events,
            from_branch: list_item.from_branch,
            from_owner_name: list_item.from_owner_name,
            from_project_name: list_item.from_project_name,
            id: row.id,
            is_watching,
            merged_commit_id_from: row.merged_commit_id_from.unwrap_or_default(),
            merged_commit_id_to: row.merged_commit_id_to.unwrap_or_default(),
            owner_name: project.owner_name.clone(),
            project_name: project.project_name.clone(),
            pull_request_number: list_item.pull_request_number,
            receiver,
            reviewers,
            state: list_item.state,
            threads,
            title: list_item.title,
            to_branch: list_item.to_branch,
            updated_label: list_item.updated_label,
            watcher_count,
        })
    }

    async fn list_pull_request_reviewers(
        &self,
        pull_request_id: i64,
    ) -> Result<Vec<PullRequestUserRecord>, DbErr> {
        let rows = pull_request_reviewers::Entity::find()
            .filter(pull_request_reviewers::Column::PullRequestId.eq(pull_request_id))
            .all(&self.db)
            .await?;
        let mut reviewers = Vec::new();
        for row in rows {
            reviewers.push(self.user_record_for_optional_id(Some(row.user_id)).await?);
        }
        reviewers.sort_by(|left, right| {
            left.login_id
                .cmp(&right.login_id)
                .then_with(|| left.user_id.cmp(&right.user_id))
        });
        Ok(reviewers)
    }

    async fn list_pull_request_review_threads(
        &self,
        pull_request_id: i64,
    ) -> Result<Vec<ReviewThreadRecord>, DbErr> {
        let rows = comment_thread::Entity::find()
            .filter(comment_thread::Column::PullRequestId.eq(Some(pull_request_id)))
            .order_by_asc(comment_thread::Column::CreatedDate)
            .order_by_asc(comment_thread::Column::Id)
            .all(&self.db)
            .await?;
        let mut threads = Vec::new();
        for row in rows {
            let comments = self.list_review_comments(row.id).await?;
            threads.push(self.review_thread_record(row, comments).await?);
        }
        Ok(threads)
    }

    async fn list_review_comments(
        &self,
        thread_id: i64,
    ) -> Result<Vec<ReviewCommentRecord>, DbErr> {
        Ok(self.list_review_comments_with_latest(thread_id).await?.0)
    }

    async fn list_review_comments_with_latest(
        &self,
        thread_id: i64,
    ) -> Result<(Vec<ReviewCommentRecord>, Option<DateTime>), DbErr> {
        let rows = review_comment::Entity::find()
            .filter(review_comment::Column::ThreadId.eq(Some(thread_id)))
            .order_by_asc(review_comment::Column::CreatedDate)
            .order_by_asc(review_comment::Column::Id)
            .all(&self.db)
            .await?;
        let latest_comment_created = rows.iter().filter_map(|row| row.created_date).max();
        let mut comments = Vec::new();
        for row in rows {
            comments.push(ReviewCommentRecord {
                author_id: row.author_id,
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                contents_markdown: self
                    .read_text_column("review_comment", "contents", row.id)
                    .await?,
                created_label: format_workspace_date_label(row.created_date),
                id: row.id,
                thread_id,
            });
        }
        Ok((comments, latest_comment_created))
    }

    async fn review_thread_record(
        &self,
        row: comment_thread::Model,
        comments: Vec<ReviewCommentRecord>,
    ) -> Result<ReviewThreadRecord, DbErr> {
        Ok(ReviewThreadRecord {
            author_id: row.author_id,
            author_label: row.author_name.unwrap_or_default(),
            author_login_id: row.author_login_id.unwrap_or_default(),
            comments,
            commit_id: row.commit_id.unwrap_or_default(),
            created_label: format_workspace_date_label(row.created_date),
            end_line: row.end_line,
            id: row.id,
            path: row.path.unwrap_or_default(),
            prev_commit_id: row.prev_commit_id.unwrap_or_default(),
            start_line: row.start_line,
            state: review_thread_state(row.state.as_deref()),
        })
    }

    async fn list_pull_request_commits(
        &self,
        pull_request_id: i64,
    ) -> Result<Vec<PullRequestCommitRecord>, DbErr> {
        let rows = pull_request_commit::Entity::find()
            .filter(pull_request_commit::Column::PullRequestId.eq(Some(pull_request_id)))
            .order_by_asc(pull_request_commit::Column::AuthorDate)
            .order_by_asc(pull_request_commit::Column::Id)
            .all(&self.db)
            .await?;
        let mut commits = Vec::new();
        for row in rows {
            commits.push(PullRequestCommitRecord {
                author_date_label: format_workspace_date_label(row.author_date.or(row.created)),
                author_email: row.author_email.unwrap_or_default(),
                commit_id: row.commit_id.unwrap_or_default(),
                commit_message: self
                    .read_text_column("pull_request_commit", "commit_message", row.id)
                    .await?,
                commit_short_id: row.commit_short_id.unwrap_or_default(),
                state: row.state.unwrap_or_default(),
            });
        }
        Ok(commits)
    }

    async fn list_pull_request_events(
        &self,
        pull_request_id: i64,
    ) -> Result<Vec<PullRequestEventRecord>, DbErr> {
        let rows = pull_request_event::Entity::find()
            .filter(pull_request_event::Column::PullRequestId.eq(Some(pull_request_id)))
            .order_by_asc(pull_request_event::Column::Created)
            .order_by_asc(pull_request_event::Column::Id)
            .all(&self.db)
            .await?;
        let mut events = Vec::new();
        for row in rows {
            events.push(PullRequestEventRecord {
                created_label: format_workspace_date_label(row.created),
                event_type: row.event_type.unwrap_or_default(),
                id: row.id,
                new_value: self
                    .read_text_column("pull_request_event", "new_value", row.id)
                    .await?,
                old_value: self
                    .read_text_column("pull_request_event", "old_value", row.id)
                    .await?,
                sender_login_id: row.sender_login_id.unwrap_or_default(),
            });
        }
        Ok(events)
    }

    async fn project_issue_list_item_from_model(
        &self,
        model: issue::Model,
        project: &ProjectRecord,
    ) -> Result<ProjectIssueListItemRecord, DbErr> {
        let labels = self.list_issue_labels(model.id).await?;
        let (_assignee_login_id, assignee_label) =
            self.issue_assignee_summary(model.assignee_id).await?;
        let (milestone_id, milestone_title) =
            self.issue_milestone_summary(model.milestone_id).await?;
        Ok(ProjectIssueListItemRecord {
            assignee_label,
            author_label: model.author_name.unwrap_or_default(),
            comment_count: model.num_of_comments.unwrap_or_default().max(0) as u32,
            issue_number: model.number.unwrap_or_default(),
            labels,
            milestone_id,
            milestone_title,
            owner_name: project.owner_name.clone(),
            project_name: project.project_name.clone(),
            state: issue_state_from_raw(model.state),
            title: model.title.unwrap_or_default(),
            updated_label: format_workspace_date_label(model.updated_date.or(model.created_date)),
            voter_count: self.count_issue_voters(model.id).await?,
            watcher_count: self.count_issue_watchers(model.id).await?,
        })
    }

    async fn issue_model_matches_text_filter(
        &self,
        model: &issue::Model,
        text_filter: &str,
    ) -> Result<bool, DbErr> {
        let needle = normalize_identity(text_filter);
        if needle.is_empty() {
            return Ok(true);
        }
        if model
            .title
            .as_deref()
            .is_some_and(|title| normalize_identity(title).contains(&needle))
        {
            return Ok(true);
        }
        if normalize_identity(&self.read_text_column("issue", "body", model.id).await?)
            .contains(&needle)
        {
            return Ok(true);
        }

        let comments = issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(model.id)))
            .all(&self.db)
            .await?;
        for comment in comments {
            let contents = self
                .read_text_column("issue_comment", "contents", comment.id)
                .await?;
            if normalize_identity(&contents).contains(&needle) {
                return Ok(true);
            }
        }

        Ok(false)
    }

    async fn posting_model_matches_text_filter(
        &self,
        model: &posting::Model,
        text_filter: &str,
    ) -> Result<bool, DbErr> {
        let needle = normalize_identity(text_filter);
        if needle.is_empty() {
            return Ok(true);
        }
        if model
            .title
            .as_deref()
            .is_some_and(|title| normalize_identity(title).contains(&needle))
        {
            return Ok(true);
        }
        if normalize_identity(&self.read_text_column("posting", "body", model.id).await?)
            .contains(&needle)
        {
            return Ok(true);
        }

        let comments = posting_comment::Entity::find()
            .filter(posting_comment::Column::PostingId.eq(Some(model.id)))
            .all(&self.db)
            .await?;
        for comment in comments {
            let contents = self
                .read_text_column("posting_comment", "contents", comment.id)
                .await?;
            if normalize_identity(&contents).contains(&needle) {
                return Ok(true);
            }
        }

        Ok(false)
    }

    async fn has_direct_issue_share(&self, issue_id: i64, user_id: i64) -> Result<bool, DbErr> {
        Ok(issue_sharer::Entity::find()
            .filter(issue_sharer::Column::IssueId.eq(Some(issue_id)))
            .filter(issue_sharer::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_some())
    }

    async fn find_user_model_by_id(&self, user_id: i64) -> Result<Option<n4user::Model>, DbErr> {
        n4user::Entity::find_by_id(user_id).one(&self.db).await
    }

    async fn contextual_issue_mention_users(
        &self,
        project_record: &ProjectRecord,
        issue_model: &issue::Model,
        actor_id: Option<i64>,
    ) -> Result<Vec<IssueMentionUserRecord>, DbErr> {
        let mut user_ids = Vec::new();
        let mut seen = HashSet::new();
        push_unique_user_id(&mut user_ids, &mut seen, issue_model.author_id);

        let comments = issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(issue_model.id)))
            .order_by_desc(issue_comment::Column::CreatedDate)
            .order_by_desc(issue_comment::Column::Id)
            .all(&self.db)
            .await?;
        for comment in comments {
            push_unique_user_id(&mut user_ids, &mut seen, comment.author_id);
        }

        for membership in project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_record.id)))
            .all(&self.db)
            .await?
        {
            push_unique_user_id(&mut user_ids, &mut seen, membership.user_id);
        }

        if let Some(organization_id) = project_record.organization_id {
            for membership in organization_user::Entity::find()
                .filter(organization_user::Column::OrganizationId.eq(Some(organization_id)))
                .all(&self.db)
                .await?
            {
                push_unique_user_id(&mut user_ids, &mut seen, membership.user_id);
            }
        }

        for sharer in issue_sharer::Entity::find()
            .filter(issue_sharer::Column::IssueId.eq(Some(issue_model.id)))
            .all(&self.db)
            .await?
        {
            push_unique_user_id(&mut user_ids, &mut seen, sharer.user_id);
        }

        if let Some(actor_id) = actor_id {
            user_ids.retain(|user_id| *user_id != actor_id);
            user_ids.push(actor_id);
        }

        let mut records = Vec::new();
        let mut emitted = HashSet::new();
        for user_id in user_ids {
            if !emitted.insert(user_id) {
                continue;
            }
            if let Some(user) = self.find_user_model_by_id(user_id).await? {
                if n4user_is_active(&user) {
                    records.push(issue_mention_user_record(user));
                }
            }
        }
        Ok(records)
    }

    async fn append_project_mention_targets(
        &self,
        project_record: &ProjectRecord,
        query: &str,
        records: &mut Vec<IssueMentionUserRecord>,
    ) -> Result<(), DbErr> {
        let project_login_id = format!(
            "{}/{}",
            project_record.owner_name, project_record.project_name
        );
        let project_record_item = IssueMentionUserRecord {
            avatar_url: String::new(),
            display_name: project_record.project_name.clone(),
            login_id: project_login_id.clone(),
            search_text: format!("{project_login_id}/project/member/all"),
            item_type: "project".to_string(),
        };
        if mention_text_matches(&project_record_item, query) {
            records.push(project_record_item);
        }

        if let Some(organization_name) = project_record.organization_name.as_deref() {
            let organization_record_item = IssueMentionUserRecord {
                avatar_url: String::new(),
                display_name: organization_name.to_string(),
                login_id: organization_name.to_string(),
                search_text: format!("{organization_name}/group/org/member/all"),
                item_type: "organization".to_string(),
            };
            if mention_text_matches(&organization_record_item, query) {
                records.push(organization_record_item);
            }
        }

        Ok(())
    }

    async fn list_issue_sharers(&self, issue_id: i64) -> Result<Vec<IssueSharerRecord>, DbErr> {
        let rows = issue_sharer::Entity::find()
            .filter(issue_sharer::Column::IssueId.eq(Some(issue_id)))
            .order_by_asc(issue_sharer::Column::Created)
            .order_by_asc(issue_sharer::Column::Id)
            .all(&self.db)
            .await?;
        let mut sharers = Vec::new();
        for row in rows {
            let Some(user_id) = row.user_id else {
                continue;
            };
            let user = self.find_user_by_id(user_id).await?;
            let login_id = user
                .as_ref()
                .map(|user| user.login_id.clone())
                .or(row.login_id)
                .unwrap_or_default();
            let user_label = user
                .map(|user| user.display_name)
                .unwrap_or_else(|| login_id.clone());
            sharers.push(IssueSharerRecord {
                user_id,
                login_id,
                user_label,
            });
        }

        Ok(sharers)
    }

    async fn read_project_issue_model(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) -> Result<Option<(ProjectRecord, issue::Model)>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        let issue = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_record.id)))
            .filter(issue::Column::Number.eq(Some(issue_number)))
            .one(&self.db)
            .await?;
        Ok(issue.map(|model| (project_record, model)))
    }

    async fn read_project_milestone_model(
        &self,
        owner_name: &str,
        project_name: &str,
        milestone_id: i64,
    ) -> Result<Option<(ProjectRecord, milestone::Model)>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        let row = milestone::Entity::find_by_id(milestone_id)
            .filter(milestone::Column::ProjectId.eq(Some(project_record.id)))
            .one(&self.db)
            .await?;
        Ok(row.map(|model| (project_record, model)))
    }

    async fn read_text_column(&self, table: &str, column: &str, id: i64) -> Result<String, DbErr> {
        let backend = self.db.get_database_backend();
        let placeholders = sql_placeholders(backend, 1);
        let sql = format!(
            "SELECT {column} AS value FROM {table} WHERE id = {}",
            placeholders[0]
        );
        let Some(row) = self
            .db
            .query_one(Statement::from_sql_and_values(
                backend,
                sql,
                vec![id.into()],
            ))
            .await?
        else {
            return Ok(String::new());
        };
        Ok(row
            .try_get::<Option<String>>("", "value")
            .ok()
            .flatten()
            .unwrap_or_default())
    }

    async fn write_text_column(
        &self,
        table: &str,
        column: &str,
        id: i64,
        value: &str,
    ) -> Result<(), DbErr> {
        let backend = self.db.get_database_backend();
        let placeholders = sql_placeholders(backend, 2);
        let sql = format!(
            "UPDATE {table} SET {column} = {} WHERE id = {}",
            placeholders[0], placeholders[1]
        );
        self.db
            .execute(Statement::from_sql_and_values(
                backend,
                sql,
                vec![empty_to_none(Some(value.to_string())).into(), id.into()],
            ))
            .await?;
        Ok(())
    }

    async fn next_issue_number(&self, project_id: i64) -> Result<i64, DbErr> {
        let project_row = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?;
        let project_last = project_row
            .and_then(|row| row.last_issue_number)
            .unwrap_or_default();
        let max_existing = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.number)
            .max()
            .unwrap_or_default();
        Ok(project_last.max(max_existing) + 1)
    }

    async fn next_posting_number(&self, project_id: i64) -> Result<i64, DbErr> {
        let project_row = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?;
        let project_last = project_row
            .and_then(|row| row.last_posting_number)
            .unwrap_or_default();
        let max_existing = posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.number)
            .max()
            .unwrap_or_default();
        Ok(project_last.max(max_existing) + 1)
    }

    async fn next_pull_request_number(&self, project_id: i64) -> Result<i64, DbErr> {
        let max_existing = pull_request::Entity::find()
            .filter(pull_request::Column::ToProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.number)
            .max()
            .unwrap_or_default();
        Ok(max_existing + 1)
    }

    async fn find_duplicate_open_pull_request(
        &self,
        from_project_id: i64,
        to_project_id: i64,
        from_branch: &str,
        to_branch: &str,
    ) -> Result<Option<pull_request::Model>, DbErr> {
        pull_request::Entity::find()
            .filter(pull_request::Column::FromProjectId.eq(Some(from_project_id)))
            .filter(pull_request::Column::ToProjectId.eq(Some(to_project_id)))
            .filter(pull_request::Column::FromBranch.eq(Some(from_branch.to_string())))
            .filter(pull_request::Column::ToBranch.eq(Some(to_branch.to_string())))
            .filter(pull_request_open_condition())
            .order_by_desc(pull_request::Column::Updated)
            .order_by_desc(pull_request::Column::Id)
            .one(&self.db)
            .await
    }

    async fn resolve_assignee_id(
        &self,
        project_id: i64,
        assignee_login_id: Option<&str>,
    ) -> Result<Option<i64>, DbErr> {
        let Some(login_id) = assignee_login_id
            .map(normalize_identity)
            .filter(|value| !value.is_empty())
        else {
            return Ok(None);
        };
        let Some(user) = n4user::Entity::find()
            .filter(n4user::Column::LoginId.eq(Some(login_id)))
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if let Some(existing) = assignee::Entity::find()
            .filter(assignee::Column::ProjectId.eq(Some(project_id)))
            .filter(assignee::Column::UserId.eq(Some(user.id)))
            .one(&self.db)
            .await?
        {
            return Ok(Some(existing.id));
        }
        let created = assignee::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user.id)),
            project_id: Set(Some(project_id)),
        }
        .insert(&self.db)
        .await?;
        Ok(Some(created.id))
    }

    async fn issue_assignee_summary(
        &self,
        assignee_id: Option<i64>,
    ) -> Result<(String, String), DbErr> {
        let Some(assignee_id) = assignee_id else {
            return Ok((String::new(), String::new()));
        };
        let Some(row) = assignee::Entity::find_by_id(assignee_id)
            .one(&self.db)
            .await?
        else {
            return Ok((String::new(), String::new()));
        };
        let Some(user_id) = row.user_id else {
            return Ok((String::new(), String::new()));
        };
        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Ok((String::new(), String::new()));
        };
        Ok((
            user.login_id.unwrap_or_default(),
            user.name.unwrap_or_default(),
        ))
    }

    async fn issue_milestone_summary(
        &self,
        milestone_id: Option<i64>,
    ) -> Result<(Option<i64>, String), DbErr> {
        let Some(milestone_id) = milestone_id else {
            return Ok((None, String::new()));
        };
        let Some(row) = milestone::Entity::find_by_id(milestone_id)
            .one(&self.db)
            .await?
        else {
            return Ok((None, String::new()));
        };
        Ok((Some(row.id), row.title.unwrap_or_default()))
    }

    async fn list_issue_labels(&self, issue_id: i64) -> Result<Vec<IssueLabelRecord>, DbErr> {
        let links = issue_issue_label::Entity::find()
            .filter(issue_issue_label::Column::IssueId.eq(issue_id))
            .all(&self.db)
            .await?;
        let mut labels = Vec::new();
        for link in links {
            if let Some(label) = issue_label::Entity::find_by_id(link.issue_label_id)
                .one(&self.db)
                .await?
            {
                labels.push(self.issue_label_record(label).await?);
            }
        }
        Ok(labels)
    }

    async fn issue_label_record(
        &self,
        label: issue_label::Model,
    ) -> Result<IssueLabelRecord, DbErr> {
        let (category_name, category_is_exclusive) = match label.category_id {
            Some(category_id) => {
                let category = issue_label_category::Entity::find_by_id(category_id)
                    .one(&self.db)
                    .await?;
                (
                    category
                        .as_ref()
                        .and_then(|row| row.name.clone())
                        .unwrap_or_default(),
                    category
                        .as_ref()
                        .and_then(|row| row.is_exclusive)
                        .unwrap_or_default()
                        != 0,
                )
            }
            None => (String::new(), false),
        };
        Ok(IssueLabelRecord {
            category_id: label.category_id,
            category_is_exclusive,
            category_name,
            color: label.color.unwrap_or_default(),
            id: label.id,
            name: label.name.unwrap_or_default(),
        })
    }

    async fn read_project_posting_model(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
    ) -> Result<Option<(ProjectRecord, posting::Model)>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        let model = posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_record.id)))
            .filter(posting::Column::Number.eq(Some(post_number)))
            .one(&self.db)
            .await?;
        Ok(model.map(|model| (project_record, model)))
    }

    async fn project_posting_list_item_from_model(
        &self,
        model: posting::Model,
        project: &ProjectRecord,
    ) -> Result<ProjectPostingListItemRecord, DbErr> {
        Ok(ProjectPostingListItemRecord {
            author_label: model.author_name.unwrap_or_default(),
            author_login_id: model.author_login_id.unwrap_or_default(),
            comment_count: model.num_of_comments.unwrap_or_default().max(0) as u32,
            created_label: format_workspace_date_label(model.created_date),
            labels: self.list_posting_labels(model.id).await?,
            notice: model.notice.unwrap_or_default() != 0,
            owner_name: project.owner_name.clone(),
            post_number: model.number.unwrap_or_default(),
            project_name: project.project_name.clone(),
            readme: model.readme.unwrap_or_default() != 0,
            title: model.title.unwrap_or_default(),
            updated_label: format_workspace_date_label(model.updated_date.or(model.created_date)),
        })
    }

    async fn posting_record_from_model(
        &self,
        model: posting::Model,
        project: &ProjectRecord,
        viewer_id: Option<i64>,
    ) -> Result<PostingRecord, DbErr> {
        let watcher_count = self.count_posting_watchers(model.id).await?;
        let is_watching = match viewer_id {
            Some(viewer_id) => self.is_posting_watched_by(model.id, viewer_id).await?,
            None => false,
        };
        Ok(PostingRecord {
            attachments: self.list_issue_attachments("BOARD_POST", model.id).await?,
            author_id: model.author_id,
            author_label: model.author_name.unwrap_or_default(),
            author_login_id: model.author_login_id.unwrap_or_default(),
            body_markdown: self.read_text_column("posting", "body", model.id).await?,
            comment_count: model.num_of_comments.unwrap_or_default().max(0) as u32,
            comments: self.list_posting_comments(model.id).await?,
            created_label: format_workspace_date_label(model.created_date),
            id: model.id,
            is_watching,
            labels: self.list_posting_labels(model.id).await?,
            notice: model.notice.unwrap_or_default() != 0,
            owner_name: project.owner_name.clone(),
            post_number: model.number.unwrap_or_default(),
            project_name: project.project_name.clone(),
            readme: model.readme.unwrap_or_default() != 0,
            title: model.title.unwrap_or_default(),
            updated_label: format_workspace_date_label(model.updated_date.or(model.created_date)),
            watcher_count,
        })
    }

    async fn list_posting_labels(&self, posting_id: i64) -> Result<Vec<IssueLabelRecord>, DbErr> {
        let links = posting_issue_label::Entity::find()
            .filter(posting_issue_label::Column::PostingId.eq(posting_id))
            .all(&self.db)
            .await?;
        let mut labels = Vec::new();
        for link in links {
            if let Some(label) = issue_label::Entity::find_by_id(link.issue_label_id)
                .one(&self.db)
                .await?
            {
                labels.push(self.issue_label_record(label).await?);
            }
        }
        Ok(labels)
    }

    async fn find_or_create_issue_label_category(
        &self,
        project_id: i64,
        category_name: &str,
        is_exclusive: bool,
    ) -> Result<issue_label_category::Model, DbErr> {
        if let Some(existing) = self
            .find_issue_label_category_by_name(project_id, category_name)
            .await?
        {
            return Ok(existing);
        }
        issue_label_category::ActiveModel {
            id: NotSet,
            project_id: Set(Some(project_id)),
            name: Set(Some(category_name.trim().to_string())),
            is_exclusive: Set(Some(bool_to_i16(is_exclusive))),
        }
        .insert(&self.db)
        .await
    }

    async fn find_issue_label_category_by_name(
        &self,
        project_id: i64,
        category_name: &str,
    ) -> Result<Option<issue_label_category::Model>, DbErr> {
        issue_label_category::Entity::find()
            .filter(issue_label_category::Column::ProjectId.eq(Some(project_id)))
            .filter(issue_label_category::Column::Name.eq(Some(category_name.trim().to_string())))
            .one(&self.db)
            .await
    }

    async fn find_issue_label_by_project_category_name(
        &self,
        project_id: i64,
        category_id: i64,
        label_name: &str,
    ) -> Result<Option<issue_label::Model>, DbErr> {
        issue_label::Entity::find()
            .filter(issue_label::Column::ProjectId.eq(Some(project_id)))
            .filter(issue_label::Column::CategoryId.eq(Some(category_id)))
            .filter(issue_label::Column::Name.eq(Some(label_name.trim().to_string())))
            .one(&self.db)
            .await
    }

    async fn project_issue_list_item_record(
        &self,
        model: issue::Model,
        project: &ProjectRecord,
    ) -> Result<ProjectIssueListItemRecord, DbErr> {
        let (assignee_login_id, assignee_label) =
            self.issue_assignee_summary(model.assignee_id).await?;
        let (milestone_id, milestone_title) =
            self.issue_milestone_summary(model.milestone_id).await?;
        let item = ProjectIssueListItemRecord {
            assignee_label,
            author_label: model.author_name.unwrap_or_default(),
            comment_count: model.num_of_comments.unwrap_or_default().max(0) as u32,
            issue_number: model.number.unwrap_or_default(),
            labels: self.list_issue_labels(model.id).await?,
            milestone_id,
            milestone_title,
            owner_name: project.owner_name.clone(),
            project_name: project.project_name.clone(),
            state: issue_state_from_raw(model.state),
            title: model.title.unwrap_or_default(),
            updated_label: format_workspace_date_label(model.updated_date),
            voter_count: self.count_issue_voters(model.id).await?,
            watcher_count: self.count_issue_watchers(model.id).await?,
        };
        drop(assignee_login_id);
        Ok(item)
    }

    async fn list_milestone_issues(
        &self,
        project: &ProjectRecord,
        milestone_id: i64,
        state: &str,
    ) -> Result<Vec<ProjectIssueListItemRecord>, DbErr> {
        let rows = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::MilestoneId.eq(Some(milestone_id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw(state))))
            .order_by_desc(issue::Column::Number)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            items.push(self.project_issue_list_item_record(row, project).await?);
        }
        Ok(items)
    }

    async fn issue_milestone_record(
        &self,
        row: milestone::Model,
        project: &ProjectRecord,
    ) -> Result<IssueMilestoneRecord, DbErr> {
        let open_issue_count = issue::Entity::find()
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw("open"))))
            .count(&self.db)
            .await? as u32;
        let closed_issue_count = issue::Entity::find()
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw("closed"))))
            .count(&self.db)
            .await? as u32;
        let total = open_issue_count + closed_issue_count;
        let completion_percent = if total == 0 {
            0
        } else {
            closed_issue_count.saturating_mul(100) / total
        };
        let open_issues = self.list_milestone_issues(project, row.id, "open").await?;
        let closed_issues = self
            .list_milestone_issues(project, row.id, "closed")
            .await?;
        Ok(IssueMilestoneRecord {
            attachments: self.list_issue_attachments("MILESTONE", row.id).await?,
            closed_issue_count,
            closed_issues,
            completion_percent,
            contents_markdown: self
                .read_text_column("milestone", "contents", row.id)
                .await?,
            due_date_label: format_workspace_date_label(row.due_date),
            id: row.id,
            open_issue_count,
            open_issues,
            state: issue_state_from_raw(row.state),
            title: row.title.unwrap_or_default(),
        })
    }

    async fn replace_issue_labels(
        &self,
        issue_id: i64,
        project_id: i64,
        label_ids: &[i64],
    ) -> Result<(), DbErr> {
        issue_issue_label::Entity::delete_many()
            .filter(issue_issue_label::Column::IssueId.eq(issue_id))
            .exec(&self.db)
            .await?;
        let mut seen = HashSet::new();
        for label_id in label_ids {
            if seen.insert(*label_id)
                && self.label_belongs_to_project(project_id, *label_id).await?
            {
                issue_issue_label::ActiveModel {
                    issue_id: Set(issue_id),
                    issue_label_id: Set(*label_id),
                }
                .insert(&self.db)
                .await?;
            }
        }
        Ok(())
    }

    async fn replace_posting_labels(
        &self,
        posting_id: i64,
        project_id: i64,
        label_ids: &[i64],
    ) -> Result<(), DbErr> {
        posting_issue_label::Entity::delete_many()
            .filter(posting_issue_label::Column::PostingId.eq(posting_id))
            .exec(&self.db)
            .await?;
        let mut seen = HashSet::new();
        for label_id in label_ids {
            if seen.insert(*label_id)
                && self.label_belongs_to_project(project_id, *label_id).await?
            {
                posting_issue_label::ActiveModel {
                    posting_id: Set(posting_id),
                    issue_label_id: Set(*label_id),
                }
                .insert(&self.db)
                .await?;
            }
        }
        Ok(())
    }

    async fn label_belongs_to_project(
        &self,
        project_id: i64,
        label_id: i64,
    ) -> Result<bool, DbErr> {
        Ok(issue_label::Entity::find_by_id(label_id)
            .one(&self.db)
            .await?
            .is_some_and(|row| row.project_id == Some(project_id)))
    }

    async fn list_issue_comments(
        &self,
        issue_id: i64,
        viewer_id: Option<i64>,
    ) -> Result<Vec<IssueCommentRecord>, DbErr> {
        let rows = issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(issue_id)))
            .order_by_asc(issue_comment::Column::CreatedDate)
            .order_by_asc(issue_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut comments = Vec::new();
        for row in rows {
            comments.push(self.issue_comment_record(row, viewer_id).await?);
        }
        Ok(comments)
    }

    async fn list_posting_comments(
        &self,
        posting_id: i64,
    ) -> Result<Vec<PostingCommentRecord>, DbErr> {
        let rows = posting_comment::Entity::find()
            .filter(posting_comment::Column::PostingId.eq(Some(posting_id)))
            .order_by_asc(posting_comment::Column::CreatedDate)
            .order_by_asc(posting_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut comments = Vec::new();
        for row in rows {
            comments.push(self.posting_comment_record(row).await?);
        }
        Ok(comments)
    }

    async fn posting_comment_record(
        &self,
        row: posting_comment::Model,
    ) -> Result<PostingCommentRecord, DbErr> {
        Ok(PostingCommentRecord {
            attachments: self
                .list_issue_attachments("BOARD_POST_COMMENT", row.id)
                .await?,
            author_id: row.author_id,
            author_label: row.author_name.unwrap_or_default(),
            author_login_id: row.author_login_id.unwrap_or_default(),
            contents_markdown: self
                .read_text_column("posting_comment", "contents", row.id)
                .await?,
            created_label: format_workspace_date_label(row.created_date),
            id: row.id,
            parent_comment_id: row.parent_comment_id,
        })
    }

    async fn issue_comment_record(
        &self,
        row: issue_comment::Model,
        viewer_id: Option<i64>,
    ) -> Result<IssueCommentRecord, DbErr> {
        let voters = self.list_issue_comment_voters(row.id).await?;
        let viewer_has_voted = viewer_id
            .is_some_and(|viewer_id| voters.iter().any(|voter| voter.user_id == viewer_id));
        Ok(IssueCommentRecord {
            attachments: self.list_issue_attachments("ISSUE_COMMENT", row.id).await?,
            author_id: row.author_id,
            author_label: row.author_name.unwrap_or_default(),
            author_login_id: row.author_login_id.unwrap_or_default(),
            contents_markdown: self
                .read_text_column("issue_comment", "contents", row.id)
                .await?,
            created_label: format_workspace_date_label(row.created_date),
            id: row.id,
            viewer_has_voted,
            voter_count: voters.len() as u32,
            voters,
        })
    }

    async fn list_issue_comment_voters(
        &self,
        comment_id: i64,
    ) -> Result<Vec<IssueCommentVoterRecord>, DbErr> {
        let rows = issue_comment_voter::Entity::find()
            .filter(issue_comment_voter::Column::IssueCommentId.eq(comment_id))
            .all(&self.db)
            .await?;
        let mut voters = Vec::new();
        for row in rows {
            if let Some(user) = n4user::Entity::find_by_id(row.user_id)
                .one(&self.db)
                .await?
            {
                voters.push(IssueCommentVoterRecord {
                    email_address: user.email.unwrap_or_default(),
                    login_id: user.login_id.unwrap_or_default(),
                    user_id: user.id,
                    user_label: user.name.unwrap_or_default(),
                });
            }
        }
        voters.sort_by(|left, right| {
            left.login_id
                .cmp(&right.login_id)
                .then(left.user_id.cmp(&right.user_id))
        });
        Ok(voters)
    }

    async fn list_issue_timeline_items(
        &self,
        issue_id: i64,
        viewer_id: Option<i64>,
    ) -> Result<Vec<IssueTimelineItemRecord>, DbErr> {
        let mut items: Vec<(Option<DateTime>, i64, IssueTimelineItemRecord)> = Vec::new();
        for row in issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(issue_id)))
            .all(&self.db)
            .await?
        {
            let sort_id = row.id;
            let created = row.created_date;
            items.push((
                created,
                sort_id,
                IssueTimelineItemRecord::Comment(self.issue_comment_record(row, viewer_id).await?),
            ));
        }
        for row in issue_event::Entity::find()
            .filter(issue_event::Column::IssueId.eq(Some(issue_id)))
            .all(&self.db)
            .await?
        {
            items.push((
                row.created,
                row.id,
                IssueTimelineItemRecord::Event {
                    created_label: format_workspace_date_label(row.created),
                    event_type: row.event_type.unwrap_or_default(),
                    id: row.id,
                    new_value: self
                        .read_text_column("issue_event", "new_value", row.id)
                        .await?,
                    old_value: self
                        .read_text_column("issue_event", "old_value", row.id)
                        .await?,
                    sender_login_id: row.sender_login_id.unwrap_or_default(),
                },
            ));
        }
        let _ = viewer_id;
        items.sort_by_key(|(created, id, _)| (*created, *id));
        Ok(items.into_iter().map(|(_, _, item)| item).collect())
    }

    async fn list_issue_attachments(
        &self,
        container_type: &str,
        container_id: i64,
    ) -> Result<Vec<IssueAttachmentRecord>, DbErr> {
        Ok(attachment::Entity::find()
            .filter(attachment::Column::ContainerType.eq(Some(container_type.to_string())))
            .filter(attachment::Column::ContainerId.eq(container_id))
            .order_by_asc(attachment::Column::Id)
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| IssueAttachmentRecord {
                id: row.id,
                mime_type: row.mime_type.unwrap_or_default(),
                name: row.name.unwrap_or_default(),
                size: row.size.unwrap_or_default(),
            })
            .collect())
    }

    async fn bind_attachments(
        &self,
        container_type: &str,
        container_id: i64,
        attachment_ids: &[i64],
    ) -> Result<(), DbErr> {
        for attachment_id in attachment_ids {
            if let Some(row) = attachment::Entity::find_by_id(*attachment_id)
                .one(&self.db)
                .await?
            {
                let mut active = attachment::ActiveModel::from(row);
                active.container_type = Set(Some(container_type.to_string()));
                active.container_id = Set(container_id);
                active.update(&self.db).await?;
            }
        }
        Ok(())
    }

    async fn sync_attachments(
        &self,
        container_type: &str,
        container_id: i64,
        attachment_ids: &[i64],
    ) -> Result<(), DbErr> {
        let keep: HashSet<i64> = attachment_ids.iter().copied().collect();
        let existing = attachment::Entity::find()
            .filter(attachment::Column::ContainerType.eq(Some(container_type.to_string())))
            .filter(attachment::Column::ContainerId.eq(container_id))
            .all(&self.db)
            .await?;
        for row in existing {
            if !keep.contains(&row.id) {
                attachment::Entity::delete_by_id(row.id)
                    .exec(&self.db)
                    .await?;
            }
        }
        self.bind_attachments(container_type, container_id, attachment_ids)
            .await
    }

    async fn count_issue_voters(&self, issue_id: i64) -> Result<u32, DbErr> {
        Ok(issue_voter::Entity::find()
            .filter(issue_voter::Column::IssueId.eq(issue_id))
            .count(&self.db)
            .await? as u32)
    }

    async fn count_issue_watchers(&self, issue_id: i64) -> Result<u32, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
            .count(&self.db)
            .await? as u32)
    }

    async fn count_pull_request_watchers(&self, pull_request_id: i64) -> Result<u32, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("PULL_REQUEST".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(pull_request_id.to_string())))
            .count(&self.db)
            .await? as u32)
    }

    async fn count_posting_watchers(&self, posting_id: i64) -> Result<u32, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(posting_id.to_string())))
            .count(&self.db)
            .await? as u32)
    }

    async fn is_issue_watched_by(&self, issue_id: i64, user_id: i64) -> Result<bool, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
            .one(&self.db)
            .await?
            .is_some())
    }

    async fn is_pull_request_watched_by(
        &self,
        pull_request_id: i64,
        user_id: i64,
    ) -> Result<bool, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("PULL_REQUEST".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(pull_request_id.to_string())))
            .one(&self.db)
            .await?
            .is_some())
    }

    async fn watch_pull_request(&self, pull_request_id: i64, user_id: i64) -> Result<(), DbErr> {
        if self
            .is_pull_request_watched_by(pull_request_id, user_id)
            .await?
        {
            return Ok(());
        }
        watch::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            resource_type: Set(Some("PULL_REQUEST".to_string())),
            resource_id: Set(Some(pull_request_id.to_string())),
        }
        .insert(&self.db)
        .await?;
        Ok(())
    }

    async fn is_posting_watched_by(&self, posting_id: i64, user_id: i64) -> Result<bool, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(posting_id.to_string())))
            .one(&self.db)
            .await?
            .is_some())
    }

    async fn recount_issue_comments(&self, issue_id: i64) -> Result<(), DbErr> {
        let count = issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(issue_id)))
            .count(&self.db)
            .await? as i32;
        let mut active = issue::ActiveModel {
            id: Set(issue_id),
            ..Default::default()
        };
        active.num_of_comments = Set(Some(count));
        active.updated_date = Set(Some(current_datetime()));
        active.update(&self.db).await?;
        Ok(())
    }

    async fn recount_posting_comments(&self, posting_id: i64) -> Result<(), DbErr> {
        let count = posting_comment::Entity::find()
            .filter(posting_comment::Column::PostingId.eq(Some(posting_id)))
            .count(&self.db)
            .await? as i32;
        let mut active = posting::ActiveModel {
            id: Set(posting_id),
            ..Default::default()
        };
        active.num_of_comments = Set(Some(count));
        active.updated_date = Set(Some(current_datetime()));
        active.update(&self.db).await?;
        Ok(())
    }

    async fn clear_other_readme_postings(
        &self,
        project_id: i64,
        keep_posting_id: i64,
    ) -> Result<(), DbErr> {
        for row in posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_id)))
            .filter(posting::Column::Readme.eq(Some(1)))
            .all(&self.db)
            .await?
        {
            if row.id == keep_posting_id {
                continue;
            }
            let mut active = posting::ActiveModel::from(row);
            active.readme = Set(Some(0));
            active.update(&self.db).await?;
        }
        Ok(())
    }

    async fn create_issue_event(
        &self,
        issue_id: i64,
        sender_login_id: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
    ) -> Result<(), DbErr> {
        let created = issue_event::ActiveModel {
            id: NotSet,
            created: Set(Some(current_datetime())),
            sender_login_id: Set(empty_to_none(Some(sender_login_id.to_string()))),
            sender_email: Set(None),
            issue_id: Set(Some(issue_id)),
            event_type: Set(Some(event_type.to_string())),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("issue_event", "old_value", created.id, old_value)
            .await?;
        self.write_text_column("issue_event", "new_value", created.id, new_value)
            .await?;
        Ok(())
    }

    async fn create_pull_request_event(
        &self,
        pull_request_id: i64,
        sender_login_id: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
    ) -> Result<(), DbErr> {
        let created = pull_request_event::ActiveModel {
            id: NotSet,
            created: Set(Some(current_datetime())),
            sender_login_id: Set(empty_to_none(Some(sender_login_id.to_string()))),
            pull_request_id: Set(Some(pull_request_id)),
            event_type: Set(Some(event_type.to_string())),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("pull_request_event", "old_value", created.id, old_value)
            .await?;
        self.write_text_column("pull_request_event", "new_value", created.id, new_value)
            .await?;
        Ok(())
    }

    async fn create_notification_event_for_receivers(
        &self,
        sender_id: i64,
        resource_type: &str,
        resource_id: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
        receiver_ids: &[i64],
    ) -> Result<(), DbErr> {
        let mut unique_receiver_ids = receiver_ids.to_vec();
        unique_receiver_ids.sort_unstable();
        unique_receiver_ids.dedup();
        unique_receiver_ids.retain(|user_id| *user_id != sender_id);
        if unique_receiver_ids.is_empty() {
            return Ok(());
        }

        let created = notification_event::ActiveModel {
            id: NotSet,
            title: Set(None),
            sender_id: Set(Some(sender_id)),
            created: Set(Some(current_datetime())),
            resource_type: Set(Some(resource_type.to_string())),
            resource_id: Set(Some(resource_id.to_string())),
            event_type: Set(Some(event_type.to_string())),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("notification_event", "old_value", created.id, old_value)
            .await?;
        self.write_text_column("notification_event", "new_value", created.id, new_value)
            .await?;
        notification_mail::ActiveModel {
            id: NotSet,
            notification_event_id: Set(Some(created.id)),
        }
        .insert(&self.db)
        .await?;

        for receiver_id in unique_receiver_ids {
            notification_event_n4user::ActiveModel {
                notification_event_id: Set(created.id),
                n4user_id: Set(receiver_id),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(())
    }

    async fn create_notification_event_for_commit_discussion(
        &self,
        sender_id: i64,
        resource_type: &str,
        resource_id: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
        receiver_ids: &[i64],
    ) -> Result<(), DbErr> {
        let mut unique_receiver_ids = receiver_ids.to_vec();
        unique_receiver_ids.sort_unstable();
        unique_receiver_ids.dedup();
        unique_receiver_ids.retain(|user_id| *user_id != sender_id);

        let created = notification_event::ActiveModel {
            id: NotSet,
            title: Set(None),
            sender_id: Set(Some(sender_id)),
            created: Set(Some(current_datetime())),
            resource_type: Set(Some(resource_type.to_string())),
            resource_id: Set(Some(resource_id.to_string())),
            event_type: Set(Some(event_type.to_string())),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("notification_event", "old_value", created.id, old_value)
            .await?;
        self.write_text_column("notification_event", "new_value", created.id, new_value)
            .await?;
        notification_mail::ActiveModel {
            id: NotSet,
            notification_event_id: Set(Some(created.id)),
        }
        .insert(&self.db)
        .await?;

        for receiver_id in unique_receiver_ids {
            notification_event_n4user::ActiveModel {
                notification_event_id: Set(created.id),
                n4user_id: Set(receiver_id),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(())
    }

    async fn active_watch_user_ids(
        &self,
        resource_type: &str,
        resource_id: &str,
    ) -> Result<Vec<i64>, DbErr> {
        let rows = watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(watch::Column::ResourceId.eq(Some(resource_id.to_string())))
            .all(&self.db)
            .await?;
        let mut user_ids = Vec::new();
        for row in rows {
            if let Some(user_id) = row.user_id {
                if self
                    .find_user_model_by_id(user_id)
                    .await?
                    .is_some_and(|user| n4user_is_active(&user))
                {
                    user_ids.push(user_id);
                }
            }
        }
        Ok(user_ids)
    }

    async fn active_unwatch_user_ids(
        &self,
        resource_type: &str,
        resource_id: &str,
    ) -> Result<Vec<i64>, DbErr> {
        let rows = unwatch::Entity::find()
            .filter(unwatch::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(unwatch::Column::ResourceId.eq(Some(resource_id.to_string())))
            .all(&self.db)
            .await?;
        let mut user_ids = Vec::new();
        for row in rows {
            if let Some(user_id) = row.user_id {
                if self
                    .find_user_model_by_id(user_id)
                    .await?
                    .is_some_and(|user| n4user_is_active(&user))
                {
                    user_ids.push(user_id);
                }
            }
        }
        Ok(user_ids)
    }

    async fn explicit_project_notification_user_ids(
        &self,
        project_id: i64,
        event_type: &str,
        allowed: bool,
    ) -> Result<Vec<i64>, DbErr> {
        let rows = user_project_notification::Entity::find()
            .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
            .filter(
                user_project_notification::Column::NotificationType
                    .eq(Some(event_type.to_string())),
            )
            .filter(
                user_project_notification::Column::Allowed.eq(Some(if allowed { 1 } else { 0 })),
            )
            .all(&self.db)
            .await?;
        let mut user_ids = Vec::new();
        for row in rows {
            if let Some(user_id) = row.user_id {
                if self
                    .find_user_model_by_id(user_id)
                    .await?
                    .is_some_and(|user| n4user_is_active(&user))
                {
                    user_ids.push(user_id);
                }
            }
        }
        Ok(user_ids)
    }

    async fn project_notification_enabled_for_user(
        &self,
        user_id: i64,
        project_id: i64,
        event_type: &str,
    ) -> Result<bool, DbErr> {
        let override_row = user_project_notification::Entity::find()
            .filter(user_project_notification::Column::UserId.eq(Some(user_id)))
            .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
            .filter(
                user_project_notification::Column::NotificationType
                    .eq(Some(event_type.to_string())),
            )
            .one(&self.db)
            .await?;
        Ok(override_row
            .map(|row| row.allowed.unwrap_or(1) != 0)
            .unwrap_or_else(|| workspace_notification_enabled_by_default(event_type)))
    }

    async fn posting_notification_receiver_ids(
        &self,
        project_id: i64,
        posting_id: i64,
        posting_author_id: Option<i64>,
        event_type: &str,
    ) -> Result<Vec<i64>, DbErr> {
        let mut receivers = Vec::new();
        let mut seen = HashSet::new();
        push_unique_user_id(&mut receivers, &mut seen, posting_author_id);

        for user_id in self
            .active_watch_user_ids("POSTING", &posting_id.to_string())
            .await?
        {
            push_unique_user_id(&mut receivers, &mut seen, Some(user_id));
        }

        for user_id in self
            .active_watch_user_ids("PROJECT", &project_id.to_string())
            .await?
        {
            if self
                .project_notification_enabled_for_user(user_id, project_id, event_type)
                .await?
            {
                push_unique_user_id(&mut receivers, &mut seen, Some(user_id));
            }
        }

        for user_id in self
            .explicit_project_notification_user_ids(project_id, event_type, true)
            .await?
        {
            push_unique_user_id(&mut receivers, &mut seen, Some(user_id));
        }

        let posting_unwatchers = self
            .active_unwatch_user_ids("POSTING", &posting_id.to_string())
            .await?
            .into_iter()
            .collect::<HashSet<_>>();
        let event_unwatchers = self
            .explicit_project_notification_user_ids(project_id, event_type, false)
            .await?
            .into_iter()
            .collect::<HashSet<_>>();
        receivers.retain(|user_id| !posting_unwatchers.contains(user_id));
        receivers.retain(|user_id| !event_unwatchers.contains(user_id));
        Ok(receivers)
    }

    async fn pull_request_notification_receiver_ids(
        &self,
        project_id: i64,
        pull_request_id: i64,
        contributor_id: Option<i64>,
        receiver_id: Option<i64>,
        event_type: &str,
    ) -> Result<Vec<i64>, DbErr> {
        let mut receivers = Vec::new();
        let mut seen = HashSet::new();
        push_unique_user_id(&mut receivers, &mut seen, contributor_id);
        push_unique_user_id(&mut receivers, &mut seen, receiver_id);

        for reviewer in pull_request_reviewers::Entity::find()
            .filter(pull_request_reviewers::Column::PullRequestId.eq(pull_request_id))
            .all(&self.db)
            .await?
        {
            push_unique_user_id(&mut receivers, &mut seen, Some(reviewer.user_id));
        }

        for user_id in self
            .active_watch_user_ids("PULL_REQUEST", &pull_request_id.to_string())
            .await?
        {
            push_unique_user_id(&mut receivers, &mut seen, Some(user_id));
        }

        for user_id in self
            .active_watch_user_ids("PROJECT", &project_id.to_string())
            .await?
        {
            if self
                .project_notification_enabled_for_user(user_id, project_id, event_type)
                .await?
            {
                push_unique_user_id(&mut receivers, &mut seen, Some(user_id));
            }
        }

        for user_id in self
            .explicit_project_notification_user_ids(project_id, event_type, true)
            .await?
        {
            push_unique_user_id(&mut receivers, &mut seen, Some(user_id));
        }

        let pull_request_unwatchers = self
            .active_unwatch_user_ids("PULL_REQUEST", &pull_request_id.to_string())
            .await?
            .into_iter()
            .collect::<HashSet<_>>();
        let event_unwatchers = self
            .explicit_project_notification_user_ids(project_id, event_type, false)
            .await?
            .into_iter()
            .collect::<HashSet<_>>();
        receivers.retain(|user_id| !pull_request_unwatchers.contains(user_id));
        receivers.retain(|user_id| !event_unwatchers.contains(user_id));
        Ok(receivers)
    }

    async fn commit_notification_receiver_ids(
        &self,
        project_id: i64,
        actor_id: i64,
        event_type: &str,
    ) -> Result<Vec<i64>, DbErr> {
        let mut receivers = Vec::new();
        let mut seen = HashSet::new();

        for user_id in self
            .active_watch_user_ids("PROJECT", &project_id.to_string())
            .await?
        {
            if user_id != actor_id
                && self
                    .project_notification_enabled_for_user(user_id, project_id, event_type)
                    .await?
            {
                push_unique_user_id(&mut receivers, &mut seen, Some(user_id));
            }
        }

        for user_id in self
            .explicit_project_notification_user_ids(project_id, event_type, true)
            .await?
        {
            if user_id != actor_id {
                push_unique_user_id(&mut receivers, &mut seen, Some(user_id));
            }
        }

        let event_unwatchers = self
            .explicit_project_notification_user_ids(project_id, event_type, false)
            .await?
            .into_iter()
            .collect::<HashSet<_>>();
        receivers.retain(|user_id| !event_unwatchers.contains(user_id));
        Ok(receivers)
    }

    async fn sync_posting_mentions_and_notify(
        &self,
        sender_id: i64,
        project_id: i64,
        posting_id: i64,
        posting_author_id: Option<i64>,
        resource_type: &str,
        resource_id: i64,
        text: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
        mention_mode: PostingMentionNotificationMode,
    ) -> Result<MentionSyncResult, DbErr> {
        let mentioned_user_ids = self.mentioned_active_user_ids(text).await?;
        let sync_result = self
            .sync_mentions_for_resource(resource_type, resource_id, mentioned_user_ids)
            .await?;
        let mut receiver_ids = self
            .posting_notification_receiver_ids(
                project_id,
                posting_id,
                posting_author_id,
                event_type,
            )
            .await?;
        match mention_mode {
            PostingMentionNotificationMode::All => {
                receiver_ids.extend(sync_result.mentioned_user_ids.iter().copied());
            }
            PostingMentionNotificationMode::NewOnly => {
                receiver_ids.extend(sync_result.newly_mentioned_user_ids.iter().copied());
            }
        }
        self.create_notification_event_for_receivers(
            sender_id,
            resource_type,
            &resource_id.to_string(),
            event_type,
            old_value,
            new_value,
            &receiver_ids,
        )
        .await?;
        Ok(sync_result)
    }

    async fn sync_mentions_for_resource(
        &self,
        resource_type: &str,
        resource_id: i64,
        mentioned_user_ids: HashSet<i64>,
    ) -> Result<MentionSyncResult, DbErr> {
        let resource_id_string = resource_id.to_string();
        let existing = mention::Entity::find()
            .filter(mention::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(mention::Column::ResourceId.eq(Some(resource_id_string.clone())))
            .all(&self.db)
            .await?;
        let existing_user_ids = existing
            .iter()
            .filter_map(|row| row.user_id)
            .collect::<HashSet<_>>();

        for row in existing {
            if !row
                .user_id
                .is_some_and(|user_id| mentioned_user_ids.contains(&user_id))
            {
                mention::Entity::delete_by_id(row.id).exec(&self.db).await?;
            }
        }

        let mut newly_mentioned_user_ids = Vec::new();
        for user_id in mentioned_user_ids.iter().copied() {
            if existing_user_ids.contains(&user_id) {
                continue;
            }
            mention::ActiveModel {
                id: NotSet,
                resource_type: Set(Some(resource_type.to_string())),
                resource_id: Set(Some(resource_id_string.clone())),
                user_id: Set(Some(user_id)),
            }
            .insert(&self.db)
            .await?;
            newly_mentioned_user_ids.push(user_id);
        }

        let mut mentioned_user_ids = mentioned_user_ids.into_iter().collect::<Vec<_>>();
        mentioned_user_ids.sort_unstable();
        newly_mentioned_user_ids.sort_unstable();

        Ok(MentionSyncResult {
            mentioned_user_ids,
            newly_mentioned_user_ids,
        })
    }

    async fn mentioned_active_user_ids(&self, text: &str) -> Result<HashSet<i64>, DbErr> {
        let mut user_ids = HashSet::new();
        for token in extract_mention_tokens(text) {
            if let Some((owner_name, project_name)) = token.split_once('/') {
                if let Some(project_record) = self
                    .read_project_by_owner_and_name(owner_name, project_name)
                    .await?
                {
                    for membership in project_user::Entity::find()
                        .filter(project_user::Column::ProjectId.eq(Some(project_record.id)))
                        .all(&self.db)
                        .await?
                    {
                        self.insert_active_mentioned_user_id(&mut user_ids, membership.user_id)
                            .await?;
                    }
                }
                continue;
            }

            if let Some(user) = n4user::Entity::find()
                .filter(n4user::Column::LoginId.eq(Some(normalize_identity(&token))))
                .one(&self.db)
                .await?
            {
                if n4user_is_active(&user) {
                    user_ids.insert(user.id);
                }
            }

            if let Some(organization_record) = self.read_organization_by_name(&token).await? {
                for membership in organization_user::Entity::find()
                    .filter(
                        organization_user::Column::OrganizationId.eq(Some(organization_record.id)),
                    )
                    .all(&self.db)
                    .await?
                {
                    self.insert_active_mentioned_user_id(&mut user_ids, membership.user_id)
                        .await?;
                }
            }
        }
        Ok(user_ids)
    }

    async fn insert_active_mentioned_user_id(
        &self,
        user_ids: &mut HashSet<i64>,
        user_id: Option<i64>,
    ) -> Result<(), DbErr> {
        let Some(user_id) = user_id else {
            return Ok(());
        };
        if let Some(user) = self.find_user_model_by_id(user_id).await? {
            if n4user_is_active(&user) {
                user_ids.insert(user_id);
            }
        }
        Ok(())
    }

    async fn sync_mentions_and_notify(
        &self,
        sender_id: i64,
        resource_type: &str,
        resource_id: i64,
        text: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
    ) -> Result<MentionSyncResult, DbErr> {
        let mentioned_user_ids = self.mentioned_active_user_ids(text).await?;
        let sync_result = self
            .sync_mentions_for_resource(resource_type, resource_id, mentioned_user_ids)
            .await?;
        self.create_notification_event_for_receivers(
            sender_id,
            resource_type,
            &resource_id.to_string(),
            event_type,
            old_value,
            new_value,
            &sync_result.newly_mentioned_user_ids,
        )
        .await?;
        Ok(sync_result)
    }

    async fn notification_item_record(
        &self,
        event: notification_event::Model,
    ) -> Result<NotificationItemRecord, DbErr> {
        let old_value = self
            .read_text_column("notification_event", "old_value", event.id)
            .await?;
        let new_value = self
            .read_text_column("notification_event", "new_value", event.id)
            .await?;
        let event_type = event.event_type.unwrap_or_default();
        let actor = match event.sender_id {
            Some(sender_id) => self.find_user_by_id(sender_id).await?,
            None => None,
        };
        let actor = actor
            .map(|user| NotificationActorRecord {
                avatar_url: String::new(),
                display_name: user.display_name,
                login_id: user.login_id,
            })
            .unwrap_or_else(|| NotificationActorRecord {
                avatar_url: String::new(),
                display_name: String::new(),
                login_id: String::new(),
            });
        let target = self
            .notification_target(
                event.resource_type.as_deref().unwrap_or_default(),
                event.resource_id.as_deref().unwrap_or_default(),
            )
            .await?;

        Ok(NotificationItemRecord {
            actor,
            created: event.created,
            event_type: event_type.clone(),
            id: event.id,
            message: notification_message(&event_type, &old_value, &new_value),
            target_path: target.0,
            target_title: target.1,
            type_icon: notification_type_icon(&event_type, &new_value).to_string(),
        })
    }

    async fn notification_target(
        &self,
        resource_type: &str,
        resource_id: &str,
    ) -> Result<(String, String), DbErr> {
        let Some(resource_id) = resource_id.parse::<i64>().ok() else {
            return Ok((String::new(), String::new()));
        };
        let normalized_type = normalize_identity(resource_type);
        if matches!(normalized_type.as_str(), "posting" | "posting_comment") {
            return self
                .notification_posting_target(&normalized_type, resource_id)
                .await;
        }
        if matches!(normalized_type.as_str(), "pull_request" | "review_comment") {
            return self
                .notification_pull_request_target(&normalized_type, resource_id)
                .await;
        }
        if normalized_type == "project" {
            return self.notification_project_target(resource_id).await;
        }
        self.notification_issue_target(&normalized_type, resource_id)
            .await
    }

    async fn notification_project_target(
        &self,
        project_id: i64,
    ) -> Result<(String, String), DbErr> {
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok((String::new(), String::new()));
        };
        Ok((
            format!("/{}/{}", project.owner_name, project.project_name),
            project.project_name,
        ))
    }

    async fn notification_issue_target(
        &self,
        resource_type: &str,
        resource_id: i64,
    ) -> Result<(String, String), DbErr> {
        let issue_model = match resource_type {
            "issue" | "issue_post" => issue::Entity::find_by_id(resource_id).one(&self.db).await?,
            "issue_comment" => {
                let Some(comment) = issue_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok((String::new(), String::new()));
                };
                match comment.issue_id {
                    Some(issue_id) => issue::Entity::find_by_id(issue_id).one(&self.db).await?,
                    None => None,
                }
            }
            _ => None,
        };
        let Some(issue_model) = issue_model else {
            return Ok((String::new(), String::new()));
        };
        let Some(project_id) = issue_model.project_id else {
            return Ok((String::new(), String::new()));
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok((String::new(), String::new()));
        };
        let issue_number = issue_model.number.unwrap_or_default();
        Ok((
            format!(
                "/{}/{}/issue/{}",
                project.owner_name, project.project_name, issue_number
            ),
            issue_model.title.unwrap_or_default(),
        ))
    }

    async fn notification_posting_target(
        &self,
        resource_type: &str,
        resource_id: i64,
    ) -> Result<(String, String), DbErr> {
        let mut comment_anchor = String::new();
        let posting_model = match resource_type {
            "posting" => {
                posting::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
            }
            "posting_comment" => {
                let Some(comment) = posting_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok((String::new(), String::new()));
                };
                comment_anchor = format!("#comment-{}", comment.id);
                match comment.posting_id {
                    Some(posting_id) => {
                        posting::Entity::find_by_id(posting_id)
                            .one(&self.db)
                            .await?
                    }
                    None => None,
                }
            }
            _ => None,
        };
        let Some(posting_model) = posting_model else {
            return Ok((String::new(), String::new()));
        };
        let Some(project_id) = posting_model.project_id else {
            return Ok((String::new(), String::new()));
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok((String::new(), String::new()));
        };
        let post_number = posting_model.number.unwrap_or_default();
        Ok((
            format!(
                "/{}/{}/post/{}{}",
                project.owner_name, project.project_name, post_number, comment_anchor
            ),
            posting_model.title.unwrap_or_default(),
        ))
    }

    async fn notification_pull_request_target(
        &self,
        resource_type: &str,
        resource_id: i64,
    ) -> Result<(String, String), DbErr> {
        let mut comment_anchor = String::new();
        let pull_request_model = match resource_type {
            "pull_request" => {
                pull_request::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
            }
            "review_comment" => {
                let Some(comment) = review_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok((String::new(), String::new()));
                };
                comment_anchor = format!("#comment-{}", comment.id);
                let Some(thread_id) = comment.thread_id else {
                    return Ok((String::new(), String::new()));
                };
                let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok((String::new(), String::new()));
                };
                match thread.pull_request_id {
                    Some(pull_request_id) => {
                        comment_anchor = format!("/changes{comment_anchor}");
                        pull_request::Entity::find_by_id(pull_request_id)
                            .one(&self.db)
                            .await?
                    }
                    None => {
                        let Some(project_id) = thread.project_id else {
                            return Ok((String::new(), String::new()));
                        };
                        let Some(project) = self.read_project_by_id(project_id).await? else {
                            return Ok((String::new(), String::new()));
                        };
                        let commit_id = thread.commit_id.unwrap_or_default();
                        return Ok((
                            format!(
                                "/{}/{}/commit/{}{}",
                                project.owner_name, project.project_name, commit_id, comment_anchor
                            ),
                            commit_id,
                        ));
                    }
                }
            }
            _ => None,
        };
        let Some(pull_request_model) = pull_request_model else {
            return Ok((String::new(), String::new()));
        };
        let Some(project_id) = pull_request_model.to_project_id else {
            return Ok((String::new(), String::new()));
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok((String::new(), String::new()));
        };
        let pull_request_number = pull_request_model.number.unwrap_or_default();
        Ok((
            format!(
                "/{}/{}/pullRequest/{}{}",
                project.owner_name, project.project_name, pull_request_number, comment_anchor
            ),
            pull_request_model.title.unwrap_or_default(),
        ))
    }

    async fn ensure_site_admin(&self, user_id: i64) -> Result<(), DbErr> {
        if site_admin::Entity::find()
            .filter(site_admin::Column::AdminId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_none()
        {
            site_admin::ActiveModel {
                id: NotSet,
                admin_id: Set(Some(user_id)),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(())
    }

    async fn ensure_role_id(&self, role_name: &str) -> Result<i64, DbErr> {
        let normalized = normalize_identity(role_name);
        let roles = role::Entity::find().all(&self.db).await?;
        for existing in roles {
            if normalize_optional(existing.name.as_deref()).as_deref() == Some(normalized.as_str())
            {
                return Ok(existing.id);
            }
        }

        let created = role::ActiveModel {
            id: NotSet,
            name: Set(Some(role_name.to_string())),
            active: Set(Some(1)),
        }
        .insert(&self.db)
        .await?;

        Ok(created.id)
    }

    async fn role_name_for_id(&self, role_id: Option<i64>) -> Result<String, DbErr> {
        let Some(role_id) = role_id else {
            return Ok(String::new());
        };

        Ok(role::Entity::find_by_id(role_id)
            .one(&self.db)
            .await?
            .and_then(|row| row.name)
            .unwrap_or_default())
    }

    async fn sync_project_label_cache(&self, project_model: &project::Model) -> Result<(), DbErr> {
        let owner = project_model.owner.clone();
        let name = project_model.name.clone();

        let favorites = favorite_project::Entity::find()
            .filter(favorite_project::Column::ProjectId.eq(Some(project_model.id)))
            .all(&self.db)
            .await?;
        for favorite in favorites {
            let mut active = favorite_project::ActiveModel::from(favorite);
            active.owner = Set(owner.clone());
            active.project_name = Set(name.clone());
            active.update(&self.db).await?;
        }

        let recents = recent_project::Entity::find()
            .filter(recent_project::Column::ProjectId.eq(Some(project_model.id)))
            .all(&self.db)
            .await?;
        for recent in recents {
            let mut active = recent_project::ActiveModel::from(recent);
            active.owner = Set(owner.clone());
            active.project_name = Set(name.clone());
            active.update(&self.db).await?;
        }

        Ok(())
    }
}

impl AppUserRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            inner: AppRepository::new(db),
        }
    }

    pub async fn create_user(&self, input: AppUserInput) -> Result<AppUserRecord, DbErr> {
        self.inner.create_user(input).await
    }

    pub async fn find_by_identifier(
        &self,
        identifier: &str,
    ) -> Result<Option<AppUserRecord>, DbErr> {
        self.inner.find_user_by_identifier(identifier).await
    }
}

impl DefaultLandingRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            inner: AppRepository::new(db),
        }
    }

    pub async fn read_default_landing_path(&self, user_id: i64) -> Result<Option<String>, DbErr> {
        self.inner.read_default_landing_path(user_id).await
    }

    pub async fn set_default_landing_path(&self, user_id: i64, path: &str) -> Result<(), DbErr> {
        self.inner
            .set_default_landing_path(user_id, Some(path.to_string()))
            .await
            .map(|_| ())
    }
}
