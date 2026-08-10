//! Legacy-ID-preserving inserts for the site-data migration tool.
//!
//! The new app schema adopts the legacy Yona schema (same tables/columns), so
//! when the migration tool supplies legacy `id`/`number` values they are
//! written verbatim and every FK cross-reference survives without rebinding.
//! A zero/absent id falls back to auto-increment / next-number behavior.
//!
//! These functions deliberately skip derived side effects (mentions,
//! notifications, watch rows) — those are excluded from migration.

use super::*;

/// Resolve the raw int state for a legacy pull request state string.
pub(super) fn pull_request_state_to_raw(state: &str) -> i32 {
    match normalize_identity(state).as_str() {
        "closed" | "rejected" | "resolved" => 2,
        "merged" => 6,
        _ => 1,
    }
}

impl AppRepositoryImpl<'_> {
    /// Delete an imported pull request and its events, threads, review
    /// comments and matching commit comments (site-import rollback).
    pub async fn delete_site_import_pull_request(
        &self,
        pull_request_id: i64,
        project_id: i64,
        commit_ids: &[String],
    ) -> Result<bool, DbErr> {
        let Some(model) = pull_request::Entity::find_by_id(pull_request_id)
            .one(&self.db)
            .await?
        else {
            return Ok(false);
        };
        let thread_ids = comment_thread::Entity::find()
            .filter(comment_thread::Column::PullRequestId.eq(Some(pull_request_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|thread| thread.id)
            .collect::<Vec<_>>();
        if !thread_ids.is_empty() {
            review_comment::Entity::delete_many()
                .filter(review_comment::Column::ThreadId.is_in(thread_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            comment_thread_n4user::Entity::delete_many()
                .filter(comment_thread_n4user::Column::CommentThreadId.is_in(thread_ids))
                .exec(&self.db)
                .await?;
        }
        comment_thread::Entity::delete_many()
            .filter(comment_thread::Column::PullRequestId.eq(Some(pull_request_id)))
            .exec(&self.db)
            .await?;
        pull_request_event::Entity::delete_many()
            .filter(pull_request_event::Column::PullRequestId.eq(Some(pull_request_id)))
            .exec(&self.db)
            .await?;
        for commit_id in commit_ids {
            commit_comment::Entity::delete_many()
                .filter(commit_comment::Column::ProjectId.eq(Some(project_id)))
                .filter(commit_comment::Column::CommitId.eq(Some(commit_id.clone())))
                .exec(&self.db)
                .await?;
        }
        pull_request::Entity::delete_by_id(model.id)
            .exec(&self.db)
            .await?;
        Ok(true)
    }

    /// Insert a user preserving the legacy id and password hash/salt.
    pub async fn insert_site_import_user(
        &self,
        id: i64,
        login_id: &str,
        display_name: &str,
        email_address: &str,
        password_hash: Option<String>,
        password_salt: Option<String>,
        is_confirmed: bool,
        is_site_admin: bool,
        created_at: Option<DateTime>,
        last_state_modified_at: Option<DateTime>,
    ) -> Result<AppUserRecord, DbErr> {
        let login_id = normalize_identity(login_id);
        let created = n4user::ActiveModel {
            id: if id > 0 { Set(id) } else { NotSet },
            name: Set(Some(display_name.trim().to_string())),
            login_id: Set(Some(login_id.clone())),
            password: Set(
                password_hash
                    .map(|value| value.trim().to_string())
                    .filter(|value| !value.is_empty()),
            ),
            password_salt: Set(
                password_salt
                    .map(|value| value.trim().to_string())
                    .filter(|value| !value.is_empty()),
            ),
            email: Set(Some(normalize_identity(email_address))),
            remember_me: Set(Some(0)),
            state: Set(user_state_from_confirmed(is_confirmed)),
            last_state_modified_date: Set(last_state_modified_at),
            created_date: Set(created_at),
            lang: Set(None),
            token: Set(None),
            is_guest: Set(Some(
                if self.config.login_id_matches_guest_prefix(&login_id) {
                    1
                } else {
                    0
                },
            )),
            english_name: Set(None),
        }
        .insert(&self.db)
        .await?;

        if is_site_admin {
            self.ensure_site_admin(created.id).await?;
        }

        self.find_user_by_id(created.id)
            .await?
            .ok_or_else(|| DbErr::Custom("created user missing".to_string()))
    }

    /// Insert an organization preserving the legacy id.
    pub async fn insert_site_import_organization(
        &self,
        id: i64,
        name: &str,
        description: &str,
        created_at: Option<DateTime>,
    ) -> Result<OrganizationRecord, DbErr> {
        let created = organization::ActiveModel {
            id: if id > 0 { Set(id) } else { NotSet },
            name: Set(Some(name.trim().to_string())),
            created: Set(created_at),
            descr: Set(empty_to_none(Some(description.to_string()))),
        }
        .insert(&self.db)
        .await?;
        self.organization_record_from_model(created)
            .ok_or_else(|| DbErr::Custom("organization name missing".to_string()))
    }

    /// Insert an organization membership preserving the legacy id. The role
    /// name is resolved (creating the role row if needed) via the shared role
    /// table, mirroring `add_organization_membership`.
    pub async fn insert_site_import_organization_member(
        &self,
        id: i64,
        organization_id: i64,
        user_id: i64,
        role: &str,
    ) -> Result<(), DbErr> {
        if organization::Entity::find_by_id(organization_id)
            .one(&self.db)
            .await?
            .is_none()
        {
            return Ok(());
        }
        let role_id = self.ensure_role_id(role).await?;
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
            id: if id > 0 { Set(id) } else { NotSet },
            user_id: Set(Some(user_id)),
            organization_id: Set(Some(organization_id)),
            role_id: Set(Some(role_id)),
        }
        .insert(&self.db)
        .await?;
        Ok(())
    }

    /// Insert a project preserving the legacy id, organization linkage and
    /// issue/posting number counters.
    pub async fn insert_site_import_project(
        &self,
        id: i64,
        owner_name: &str,
        project_name: &str,
        overview: Option<String>,
        project_scope: &str,
        vcs: &str,
        organization_id: Option<i64>,
        created_at: Option<DateTime>,
        last_issue_number: i64,
        last_posting_number: i64,
    ) -> Result<ProjectRecord, DbErr> {
        let created = project::ActiveModel {
            id: if id > 0 { Set(id) } else { NotSet },
            name: Set(Some(project_name.trim().to_string())),
            overview: Set(overview.map(|value| value.trim().to_string())),
            vcs: Set(Some(vcs.to_string())),
            siteurl: Set(None),
            owner: Set(Some(owner_name.trim().to_string())),
            created_date: Set(created_at),
            last_issue_number: Set(if last_issue_number > 0 {
                Some(last_issue_number)
            } else {
                None
            }),
            last_posting_number: Set(if last_posting_number > 0 {
                Some(last_posting_number)
            } else {
                None
            }),
            original_project_id: Set(None),
            last_pushed_date: Set(None),
            default_reviewer_count: Set(None),
            is_using_reviewer_count: Set(None),
            organization_id: Set(organization_id),
            project_scope: Set(Some(project_scope.to_string())),
            previous_owner_login_id: Set(None),
            previous_name: Set(None),
            previous_name_changed_time: Set(None),
            is_code_accessible_member_only: Set(None),
        }
        .insert(&self.db)
        .await?;
        self.project_record_from_model(created)
            .await?
            .ok_or_else(|| DbErr::Custom("project name missing".to_string()))
    }

    /// Insert a project label preserving the legacy id.
    pub async fn insert_site_import_label(
        &self,
        id: i64,
        owner_name: &str,
        project_name: &str,
        category_name: &str,
        category_is_exclusive: bool,
        label_name: &str,
        color: &str,
    ) -> Result<Option<(IssueLabelRecord, bool)>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        if id > 0 {
            if let Some(existing) = issue_label::Entity::find_by_id(id).one(&self.db).await? {
                return Ok(Some((self.issue_label_record(existing).await?, false)));
            }
        }
        let category = self
            .find_or_create_issue_label_category(
                project.id,
                category_name.trim(),
                category_is_exclusive,
            )
            .await?;
        if let Some(existing) = self
            .find_issue_label_by_project_category_name(
                project.id,
                category.id,
                label_name.trim(),
            )
            .await?
        {
            return Ok(Some((self.issue_label_record(existing).await?, false)));
        }
        let created = issue_label::ActiveModel {
            id: if id > 0 { Set(id) } else { NotSet },
            category_id: Set(Some(category.id)),
            color: Set(Some(color.trim().to_string())),
            name: Set(Some(label_name.trim().to_string())),
            project_id: Set(Some(project.id)),
        }
        .insert(&self.db)
        .await?;
        self.stable_lists
            .invalidate_labels(owner_name, project_name)
            .await;
        Ok(Some((self.issue_label_record(created).await?, true)))
    }

    /// Insert a milestone preserving the legacy id.
    pub async fn insert_site_import_milestone(
        &self,
        id: i64,
        owner_name: &str,
        project_name: &str,
        title: &str,
        contents_markdown: &str,
        due_date: Option<DateTime>,
        state: &str,
        attachment_ids: Vec<i64>,
        actor_id: Option<i64>,
    ) -> Result<Option<IssueMilestoneRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        if id > 0 && milestone::Entity::find_by_id(id).one(&self.db).await?.is_some() {
            return Ok(None);
        }
        let created = milestone::ActiveModel {
            id: if id > 0 { Set(id) } else { NotSet },
            title: Set(Some(title.trim().to_string())),
            due_date: Set(due_date),
            state: Set(Some(issue_state_to_raw(
                self.db.get_database_backend(),
                state,
            ))),
            project_id: Set(Some(project.id)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("milestone", "contents", created.id, contents_markdown)
            .await?;
        self.sync_attachments(
            MILESTONE_ATTACHMENT_CONTAINER,
            created.id,
            &attachment_ids,
            actor_id,
        )
        .await?;
        self.stable_lists
            .invalidate_milestones(owner_name, project_name)
            .await;
        self.issue_milestone_record(created, &project)
            .await
            .map(Some)
    }

    /// Insert an issue preserving the legacy id, number and timestamps.
    /// Idempotent: returns `Ok(None)` when the id or (project, number)
    /// already exists.
    pub async fn insert_site_import_issue(
        &self,
        id: i64,
        project_id: i64,
        number: i64,
        title: &str,
        body_markdown: &str,
        history_markdown: &str,
        state: &str,
        author_id: i64,
        author_login_id: &str,
        author_display_name: &str,
        assignee_id: Option<i64>,
        milestone_id: Option<i64>,
        created_at: Option<DateTime>,
        updated_at: Option<DateTime>,
        label_ids: Vec<i64>,
        attachment_ids: Vec<i64>,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some(project_record) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        if (id > 0 && issue::Entity::find_by_id(id).one(&self.db).await?.is_some())
            || (number > 0
                && issue::Entity::find()
                    .filter(issue::Column::ProjectId.eq(Some(project_record.id)))
                    .filter(issue::Column::Number.eq(Some(number)))
                    .one(&self.db)
                    .await?
                    .is_some())
        {
            return Ok(None);
        }
        let issue_number = if number > 0 {
            number
        } else {
            self.next_issue_number(project_record.id).await?
        };
        // The `issue.assignee_id` FK references the `assignee` join table
        // (project, user), not `n4user`. Resolve/create the row like
        // `resolve_assignee_id` so the explicit-id insert satisfies the FK.
        let resolved_assignee_id = if let Some(user_id) = assignee_id {
            if let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? {
                if let Some(existing) = assignee::Entity::find()
                    .filter(assignee::Column::ProjectId.eq(Some(project_record.id)))
                    .filter(assignee::Column::UserId.eq(Some(user.id)))
                    .one(&self.db)
                    .await?
                {
                    Some(existing.id)
                } else {
                    let created = assignee::ActiveModel {
                        id: NotSet,
                        user_id: Set(Some(user.id)),
                        project_id: Set(Some(project_record.id)),
                    }
                    .insert(&self.db)
                    .await?;
                    Some(created.id)
                }
            } else {
                None
            }
        } else {
            None
        };
        let created = issue::ActiveModel {
            id: if id > 0 { Set(id) } else { NotSet },
            title: Set(Some(title.trim().to_string())),
            created_date: Set(created_at),
            updated_date: Set(updated_at),
            author_id: Set(Some(author_id)),
            author_login_id: Set(Some(normalize_identity(author_login_id))),
            author_name: Set(Some(author_display_name.to_string())),
            project_id: Set(Some(project_record.id)),
            number: Set(Some(issue_number)),
            num_of_comments: Set(Some(0)),
            state: Set(Some(issue_state_to_raw(
                self.db.get_database_backend(),
                state,
            ))),
            due_date: Set(None),
            milestone_id: Set(milestone_id.filter(|value| *value > 0)),
            assignee_id: Set(resolved_assignee_id),
            parent_id: Set(None),
            weight: Set(None),
            updated_by_author_id: Set(Some(author_id)),
            is_draft: Set(Some(0)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("issue", "body", created.id, body_markdown)
            .await?;
        if !history_markdown.trim().is_empty() {
            self.write_text_column("issue", "history", created.id, history_markdown)
                .await?;
        }
        if !label_ids.is_empty() {
            self.replace_issue_labels(created.id, project_record.id, &label_ids)
                .await?;
        }
        if !attachment_ids.is_empty() {
            self.bind_attachments(
                ISSUE_ATTACHMENT_CONTAINER,
                created.id,
                &attachment_ids,
                Some(author_id),
            )
            .await?;
        }
        let Some(project_model) = project::Entity::find_by_id(project_record.id)
            .one(&self.db)
            .await?
        else {
            return Err(DbErr::Custom("project missing after issue insert".to_string()));
        };
        if project_model.last_issue_number.unwrap_or_default() < issue_number {
            let mut project_active = project::ActiveModel {
                id: Set(project_record.id),
                ..Default::default()
            };
            project_active.last_issue_number = Set(Some(issue_number));
            project_active.update(&self.db).await?;
        }
        self.issue_record_from_model(created, &project_record, Some(author_id))
            .await
            .map(Some)
    }

    /// Insert a posting preserving the legacy id, number and timestamps.
    /// Idempotent: returns `Ok(None)` when the id or (project, number)
    /// already exists.
    pub async fn insert_site_import_posting(
        &self,
        id: i64,
        project_id: i64,
        number: i64,
        title: &str,
        body_markdown: &str,
        history_markdown: &str,
        author_id: i64,
        author_login_id: &str,
        author_display_name: &str,
        notice: bool,
        readme: bool,
        created_at: Option<DateTime>,
        updated_at: Option<DateTime>,
        label_ids: Vec<i64>,
        attachment_ids: Vec<i64>,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some(project_record) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        if (id > 0 && posting::Entity::find_by_id(id).one(&self.db).await?.is_some())
            || (number > 0
                && posting::Entity::find()
                    .filter(posting::Column::ProjectId.eq(Some(project_record.id)))
                    .filter(posting::Column::Number.eq(Some(number)))
                    .one(&self.db)
                    .await?
                    .is_some())
        {
            return Ok(None);
        }
        let post_number = if number > 0 {
            number
        } else {
            self.next_posting_number(project_record.id).await?
        };
        let now = current_datetime();
        let created = posting::ActiveModel {
            id: if id > 0 { Set(id) } else { NotSet },
            title: Set(Some(title.trim().to_string())),
            created_date: Set(created_at.or(Some(now))),
            updated_date: Set(updated_at.or(created_at).or(Some(now))),
            author_id: Set(Some(author_id)),
            author_login_id: Set(Some(normalize_identity(author_login_id))),
            author_name: Set(Some(author_display_name.to_string())),
            project_id: Set(Some(project_record.id)),
            number: Set(Some(post_number)),
            num_of_comments: Set(Some(0)),
            notice: Set(Some(bool_to_i16(notice))),
            readme: Set(Some(bool_to_i16(readme))),
            parent_id: Set(None),
            updated_by_author_id: Set(Some(author_id)),
            ..Default::default()
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("posting", "body", created.id, body_markdown)
            .await?;
        if !history_markdown.trim().is_empty() {
            self.write_text_column("posting", "history", created.id, history_markdown)
                .await?;
        }
        if readme {
            self.clear_other_readme_postings(project_record.id, created.id)
                .await?;
        }
        if !label_ids.is_empty() {
            self.replace_posting_labels(created.id, project_record.id, &label_ids)
                .await?;
        }
        if !attachment_ids.is_empty() {
            self.bind_attachments(
                BOARD_POST_ATTACHMENT_CONTAINER,
                created.id,
                &attachment_ids,
                Some(author_id),
            )
            .await?;
        }
        let Some(project_model) = project::Entity::find_by_id(project_record.id)
            .one(&self.db)
            .await?
        else {
            return Err(DbErr::Custom(
                "project missing after posting insert".to_string(),
            ));
        };
        if project_model.last_posting_number.unwrap_or_default() < post_number {
            let mut project_active = project::ActiveModel {
                id: Set(project_record.id),
                ..Default::default()
            };
            project_active.last_posting_number = Set(Some(post_number));
            project_active.update(&self.db).await?;
        }
        self.posting_record_from_model(created, &project_record, Some(author_id))
            .await
            .map(Some)
    }

    /// Insert an issue comment preserving the legacy id and timestamp. The
    /// parent issue is resolved by (owner, project, issue number).
    pub async fn insert_site_import_issue_comment(
        &self,
        id: i64,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        author_id: i64,
        author_login_id: &str,
        author_display_name: &str,
        contents_markdown: &str,
        parent_comment_id: Option<i64>,
        created_at: Option<DateTime>,
        attachment_ids: Vec<i64>,
    ) -> Result<Option<i64>, DbErr> {
        let Some((project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        if id > 0 && issue_comment::Entity::find_by_id(id).one(&self.db).await?.is_some() {
            return Ok(None);
        }
        let created = issue_comment::ActiveModel {
            id: if id > 0 { Set(id) } else { NotSet },
            created_date: Set(Some(created_at.unwrap_or_else(current_datetime))),
            author_id: Set(Some(author_id)),
            author_login_id: Set(Some(normalize_identity(author_login_id))),
            author_name: Set(Some(author_display_name.to_string())),
            issue_id: Set(Some(issue_model.id)),
            project_id: Set(project_record.id),
            parent_comment_id: Set(parent_comment_id),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("issue_comment", "contents", created.id, contents_markdown)
            .await?;
        if !attachment_ids.is_empty() {
            self.bind_attachments(
                ISSUE_COMMENT_ATTACHMENT_CONTAINER,
                created.id,
                &attachment_ids,
                Some(author_id),
            )
            .await?;
        }
        issue::ActiveModel {
            id: Set(issue_model.id),
            num_of_comments: Set(Some(
                issue_comment::Entity::find()
                    .filter(issue_comment::Column::IssueId.eq(Some(issue_model.id)))
                    .count(&self.db)
                    .await? as i32,
            )),
            ..Default::default()
        }
        .update(&self.db)
        .await?;
        Ok(Some(created.id))
    }

    /// Insert a posting comment preserving the legacy id and timestamp. The
    /// parent posting is resolved by (owner, project, post number).
    pub async fn insert_site_import_posting_comment(
        &self,
        id: i64,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
        author_id: i64,
        author_login_id: &str,
        author_display_name: &str,
        contents_markdown: &str,
        parent_comment_id: Option<i64>,
        created_at: Option<DateTime>,
        attachment_ids: Vec<i64>,
    ) -> Result<Option<i64>, DbErr> {
        let Some((project_record, posting_model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(None);
        };
        if id > 0 && posting_comment::Entity::find_by_id(id).one(&self.db).await?.is_some() {
            return Ok(None);
        }
        let created = posting_comment::ActiveModel {
            id: if id > 0 { Set(id) } else { NotSet },
            created_date: Set(Some(created_at.unwrap_or_else(current_datetime))),
            author_id: Set(Some(author_id)),
            author_login_id: Set(Some(normalize_identity(author_login_id))),
            author_name: Set(Some(author_display_name.to_string())),
            posting_id: Set(Some(posting_model.id)),
            project_id: Set(project_record.id),
            parent_comment_id: Set(parent_comment_id),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("posting_comment", "contents", created.id, contents_markdown)
            .await?;
        if !attachment_ids.is_empty() {
            self.bind_attachments(
                RUST_BOARD_COMMENT_ATTACHMENT_CONTAINER,
                created.id,
                &attachment_ids,
                Some(author_id),
            )
            .await?;
        }
        posting::ActiveModel {
            id: Set(posting_model.id),
            num_of_comments: Set(Some(
                posting_comment::Entity::find()
                    .filter(posting_comment::Column::PostingId.eq(Some(posting_model.id)))
                    .count(&self.db)
                    .await? as i32,
            )),
            ..Default::default()
        }
        .update(&self.db)
        .await?;
        Ok(Some(created.id))
    }

    /// Insert a pull request preserving the legacy id/number and all FKs.
    /// Events, threads, review comments and commit comments are inserted
    /// alongside. Returns the created pull request id.
    pub async fn insert_site_import_pull_request(
        &self,
        id: i64,
        project_id: i64,
        contributor_id: i64,
        receiver_id: i64,
        number: i64,
        title: &str,
        body_markdown: &str,
        state: &str,
        is_merged: bool,
        merged_commit_id_from: Option<String>,
        merged_commit_id_to: Option<String>,
        to_branch: Option<String>,
        from_branch: Option<String>,
        created_at: Option<DateTime>,
        updated_at: Option<DateTime>,
        events: &[SiteImportPullRequestEventInput],
        threads: &[SiteImportPullRequestThreadInput],
        review_comments: &[SiteImportPullRequestCommentInput],
        commit_comments: &[SiteImportPullRequestCommentInput],
    ) -> Result<Option<i64>, DbErr> {
        let Some(to_project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        if (id > 0 && pull_request::Entity::find_by_id(id).one(&self.db).await?.is_some())
            || (number > 0
                && pull_request::Entity::find()
                    .filter(pull_request::Column::ToProjectId.eq(Some(to_project.id)))
                    .filter(pull_request::Column::Number.eq(Some(number)))
                    .one(&self.db)
                    .await?
                    .is_some())
        {
            return Ok(None);
        }
        let from_project_id = to_project.original_project_id.unwrap_or(to_project.id);
        let raw_state = if is_merged || normalize_identity(state) == "merged" {
            6
        } else {
            pull_request_state_to_raw(state)
        };
        let is_conflict = normalize_identity(state) == "conflict";
        let pull_request_number = if number > 0 {
            number
        } else {
            let rows = pull_request::Entity::find()
                .filter(pull_request::Column::ToProjectId.eq(Some(to_project.id)))
                .all(&self.db)
                .await?;
            rows.iter()
                .filter_map(|row| row.number)
                .max()
                .map(|value| value + 1)
                .unwrap_or(1)
        };
        let created = pull_request::ActiveModel {
            id: if id > 0 { Set(id) } else { NotSet },
            title: Set(Some(title.trim().to_string())),
            to_project_id: Set(Some(to_project.id)),
            from_project_id: Set(Some(from_project_id)),
            to_branch: Set(to_branch.filter(|value| !value.trim().is_empty())),
            from_branch: Set(from_branch.filter(|value| !value.trim().is_empty())),
            contributor_id: Set(Some(contributor_id)),
            receiver_id: Set(Some(receiver_id)),
            created: Set(created_at),
            updated: Set(updated_at),
            received: Set(None),
            state: Set(Some(raw_state)),
            is_conflict: Set(Some(if is_conflict { 1 } else { 0 })),
            is_merging: Set(Some(0)),
            last_commit_id: Set(None),
            merged_commit_id_from: Set(
                merged_commit_id_from.filter(|value| !value.trim().is_empty()),
            ),
            merged_commit_id_to: Set(merged_commit_id_to.filter(|value| !value.trim().is_empty())),
            number: Set(Some(pull_request_number)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("pull_request", "body", created.id, body_markdown)
            .await?;

        for event in events {
            let created_event = pull_request_event::ActiveModel {
                id: if event.id > 0 { Set(event.id) } else { NotSet },
                sender_login_id: Set(
                    Some(event.sender_login_id.trim().to_string())
                        .filter(|value| !value.is_empty()),
                ),
                pull_request_id: Set(Some(created.id)),
                event_type: Set(
                    Some(event.event_type.trim().to_string()).filter(|value| !value.is_empty()),
                ),
                created: Set(Some(event.created_at.unwrap_or_else(current_datetime))),
            }
            .insert(&self.db)
            .await?;
            // old_value/new_value are stored via the shared text-column table.
            self.write_text_column(
                "pull_request_event",
                "old_value",
                created_event.id,
                &event.old_value,
            )
            .await?;
            self.write_text_column(
                "pull_request_event",
                "new_value",
                created_event.id,
                &event.new_value,
            )
            .await?;
        }

        for thread in threads {
            comment_thread::ActiveModel {
                dtype: Set(
                    if thread.dtype.trim().is_empty() {
                        "review".to_string()
                    } else {
                        thread.dtype.trim().to_string()
                    },
                ),
                id: if thread.id > 0 { Set(thread.id) } else { NotSet },
                author_id: Set(Some(thread.author_id)),
                author_login_id: Set(
                    Some(thread.author_login_id.trim().to_string())
                        .filter(|value| !value.is_empty()),
                ),
                author_name: Set(
                    Some(thread.author_name.trim().to_string()).filter(|value| !value.is_empty()),
                ),
                state: Set(
                    Some(thread.state.trim().to_string()).filter(|value| !value.is_empty()),
                ),
                created_date: Set(Some(thread.created_at.unwrap_or_else(current_datetime))),
                pull_request_id: Set(Some(created.id)),
                project_id: Set(Some(to_project.id)),
                prev_commit_id: Set(None),
                commit_id: Set(
                    Some(thread.commit_id.trim().to_string()).filter(|value| !value.is_empty()),
                ),
                path: Set(
                    Some(thread.path.trim().to_string()).filter(|value| !value.is_empty()),
                ),
                start_side: Set(None),
                start_line: Set(None),
                start_column: Set(None),
                end_side: Set(None),
                end_line: Set(Some(if thread.line > 0 { thread.line as i32 } else { 0 })),
                end_column: Set(None),
            }
            .insert(&self.db)
            .await?;
        }

        for comment in review_comments {
            let created_comment = review_comment::ActiveModel {
                id: if comment.id > 0 { Set(comment.id) } else { NotSet },
                created_date: Set(Some(comment.created_at.unwrap_or_else(current_datetime))),
                author_id: Set(Some(comment.author_id)),
                author_login_id: Set(
                    Some(comment.author_login_id.trim().to_string())
                        .filter(|value| !value.is_empty()),
                ),
                author_name: Set(
                    Some(comment.author_name.trim().to_string()).filter(|value| !value.is_empty()),
                ),
                thread_id: Set(Some(comment.thread_id).filter(|value| *value > 0)),
            }
            .insert(&self.db)
            .await?;
            self.write_text_column(
                "review_comment",
                "contents",
                created_comment.id,
                &comment.body_markdown,
            )
            .await?;
        }

        for comment in commit_comments {
            let created_comment = commit_comment::ActiveModel {
                id: if comment.id > 0 { Set(comment.id) } else { NotSet },
                project_id: Set(Some(to_project.id)),
                path: Set(
                    Some(comment.path.trim().to_string()).filter(|value| !value.is_empty()),
                ),
                line: Set(Some(if comment.line > 0 { comment.line as i32 } else { 0 })),
                side: Set(None),
                created_date: Set(Some(comment.created_at.unwrap_or_else(current_datetime))),
                author_id: Set(Some(comment.author_id)),
                author_login_id: Set(
                    Some(comment.author_login_id.trim().to_string())
                        .filter(|value| !value.is_empty()),
                ),
                author_name: Set(
                    Some(comment.author_name.trim().to_string()).filter(|value| !value.is_empty()),
                ),
                commit_id: Set(
                    Some(comment.commit_id.trim().to_string()).filter(|value| !value.is_empty()),
                ),
            }
            .insert(&self.db)
            .await?;
            self.write_text_column(
                "commit_comment",
                "contents",
                created_comment.id,
                &comment.body_markdown,
            )
            .await?;
        }

        Ok(Some(created.id))
    }
}


