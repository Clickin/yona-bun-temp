use crate::repo_types::{
    AppUserInput, AppUserRecord, AttachmentRecord, CreateIssueCommentInput, CreateIssueInput,
    CreateOrganizationInput, CreateProjectInput, CreateProjectLabelCategoryInput,
    CreateProjectLabelInput, CreateUserInput, IssueAttachmentRecord, IssueCommentRecord,
    IssueLabelCategoryRecord, IssueLabelRecord, IssueListFilter, IssueMilestoneRecord, IssueRecord,
    IssueTimelineItemRecord, MassUpdateIssuesInput, MilestoneListFilter, MilestoneMutationInput,
    OrganizationAuthorizationRecord, OrganizationEnrollmentRequestRecord,
    OrganizationMemberDirectoryRecord, OrganizationMemberRecord, OrganizationRecord,
    OrganizationViewerRecord, ProjectAuthorizationRecord, ProjectEnrollmentRequestRecord,
    ProjectIssueListItemRecord, ProjectIssueListRecord, ProjectListEntry,
    ProjectMemberDirectoryRecord, ProjectMemberRecord, ProjectMenuSettingsRecord,
    ProjectMilestoneSummaryRecord, ProjectRecord, ProjectViewerRecord, ToggleFavoriteProjectResult,
    UpdateIssueCommentInput, UpdateIssueInput, UpdateMilestoneInput, UpdateOrganizationInput,
    UpdateProjectInput, UpdateProjectLabelCategoryInput, UpdateProjectLabelInput,
    WatchedProjectNotificationsRecord, WorkspaceEmailRecord, WorkspaceIssueListItemRecord,
    WorkspaceMemberProjectRecord, WorkspaceNotificationPreferenceRecord, WorkspaceProfileRecord,
    WorkspacePullRequestListItemRecord,
};
use crate::{
    assignee, attachment, comment_thread, email, favorite_organization, favorite_project, issue,
    issue_comment, issue_event, issue_issue_label, issue_label, issue_label_category, issue_voter,
    linked_account, milestone, n4user, organization, organization_user, posting,
    posting_issue_label, project, project_menu_setting, project_user, pull_request, recent_project,
    role, site_admin, user_credential, user_enrolled_organization, user_enrolled_project,
    user_project_notification, user_setting, user_verification, watch,
};
use rand::{distributions::Alphanumeric, Rng};
use sea_orm::entity::prelude::{DateTime, DateTimeUtc};
use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, DatabaseBackend,
    DatabaseConnection, DbErr, EntityTrait, FromQueryResult, NotSet, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, Set, Statement, TransactionTrait,
};
use std::collections::HashSet;
use std::time::{Duration, SystemTime};

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

fn workspace_notification_enabled_by_default(event_type: &str) -> bool {
    !matches!(event_type, "NEW_COMMENT")
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

fn bool_to_i16(value: bool) -> i16 {
    if value {
        1
    } else {
        0
    }
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

    match value.unwrap_or(0) {
        2 => "merged".to_string(),
        1 => "closed".to_string(),
        _ => "open".to_string(),
    }
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

    pub async fn read_issue_detail(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
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
                .issue_record_from_model(issue, &project, None)
                .await
                .map(Some),
            None => Ok(None),
        }
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
        let mut active = issue::ActiveModel::from(model);
        active.title = Set(Some(input.values.title.trim().to_string()));
        active.assignee_id = Set(assignee_id);
        active.milestone_id = Set(input.values.milestone_id.filter(|value| *value > 0));
        active.updated_date = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        self.write_text_column("issue", "body", updated.id, &input.values.body_markdown)
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
        let active = issue_comment::ActiveModel::from(comment);
        let updated = active.update(&self.db).await?;
        self.write_text_column(
            "issue_comment",
            "contents",
            updated.id,
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
            vcs: Set(None),
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
                login_id: user.login_id,
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
            is_watching,
            issue_number: model.number.unwrap_or_default(),
            labels,
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
        _viewer_id: Option<i64>,
    ) -> Result<Vec<IssueCommentRecord>, DbErr> {
        let rows = issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(issue_id)))
            .order_by_asc(issue_comment::Column::CreatedDate)
            .order_by_asc(issue_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut comments = Vec::new();
        for row in rows {
            comments.push(self.issue_comment_record(row).await?);
        }
        Ok(comments)
    }

    async fn issue_comment_record(
        &self,
        row: issue_comment::Model,
    ) -> Result<IssueCommentRecord, DbErr> {
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
        })
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
                IssueTimelineItemRecord::Comment(self.issue_comment_record(row).await?),
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

    async fn is_issue_watched_by(&self, issue_id: i64, user_id: i64) -> Result<bool, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
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
