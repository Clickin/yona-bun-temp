use super::*;

impl AppRepositoryImpl<'_> {
    pub(super) async fn legacy_public_mention_user_ids(
        &self,
        query: &str,
    ) -> Result<Vec<i64>, DbErr> {
        let normalized_query = query.trim().to_lowercase();
        let pattern = format!("%{normalized_query}%");
        let db_matches = Condition::any()
            .add(
                Expr::expr(sea_orm::sea_query::Func::lower(Expr::col(
                    n4user::Column::LoginId,
                )))
                .like(pattern.clone()),
            )
            .add(
                Expr::expr(sea_orm::sea_query::Func::lower(Expr::col(
                    n4user::Column::Name,
                )))
                .like(pattern.clone()),
            )
            .add(
                Expr::expr(sea_orm::sea_query::Func::lower(Expr::col(
                    n4user::Column::EnglishName,
                )))
                .like(pattern.clone()),
            )
            .add(
                Expr::expr(sea_orm::sea_query::Func::lower(Expr::col(
                    n4user::Column::Email,
                )))
                .like(pattern),
            );
        let mut users = n4user::Entity::find()
            .filter(
                Expr::expr(sea_orm::sea_query::Func::lower(Expr::col(
                    n4user::Column::State,
                )))
                .eq("active"),
            )
            .filter(n4user::Column::Id.ne(1))
            .filter(n4user::Column::LoginId.ne(Some(LEGACY_ANONYMOUS_LOGIN_ID.to_string())))
            .filter(db_matches)
            .order_by_desc(n4user::Column::CreatedDate)
            .order_by_desc(n4user::Column::Id)
            .limit(SITE_USER_PAGE_SIZE as u64)
            .all(&self.db)
            .await?;

        if !normalized_query.is_ascii() {
            let batch_size = (SITE_USER_PAGE_SIZE * 4) as u64;
            let mut offset = 0_u64;
            let mut unicode_matches = Vec::with_capacity(SITE_USER_PAGE_SIZE);
            loop {
                let batch = n4user::Entity::find()
                    .filter(
                        Expr::expr(sea_orm::sea_query::Func::lower(Expr::col(
                            n4user::Column::State,
                        )))
                        .eq("active"),
                    )
                    .filter(n4user::Column::Id.ne(1))
                    .filter(n4user::Column::LoginId.ne(Some(LEGACY_ANONYMOUS_LOGIN_ID.to_string())))
                    .order_by_desc(n4user::Column::CreatedDate)
                    .order_by_desc(n4user::Column::Id)
                    .offset(offset)
                    .limit(batch_size)
                    .all(&self.db)
                    .await?;
                let batch_len = batch.len();
                for user in batch {
                    if mention_user_model_matches(&user, query) {
                        unicode_matches.push(user);
                        if unicode_matches.len() == SITE_USER_PAGE_SIZE {
                            break;
                        }
                    }
                }
                if unicode_matches.len() == SITE_USER_PAGE_SIZE || batch_len < batch_size as usize {
                    break;
                }
                offset += batch_len as u64;
            }
            users = unicode_matches;
        }

        Ok(users.into_iter().map(|user| user.id).collect())
    }

    pub(super) async fn mention_user_records_from_ids(
        &self,
        user_ids: Vec<i64>,
        requester_language: Option<&str>,
    ) -> Result<Vec<IssueMentionUserRecord>, DbErr> {
        let mut unique_user_ids = Vec::new();
        let mut emitted = HashSet::new();
        for user_id in user_ids {
            if emitted.insert(user_id) {
                unique_user_ids.push(user_id);
            }
        }
        if unique_user_ids.is_empty() {
            return Ok(Vec::new());
        }
        let mut users_by_id = n4user::Entity::find()
            .filter(n4user::Column::Id.is_in(unique_user_ids.iter().copied()))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|user| (user.id, user))
            .collect::<HashMap<_, _>>();
        let mut records = Vec::with_capacity(unique_user_ids.len());
        for user_id in unique_user_ids {
            if let Some(user) = users_by_id.remove(&user_id) {
                let is_admin = user.login_id.as_deref() == Some("admin");
                if n4user_is_active(&user) && !is_admin {
                    records.push(issue_mention_user_record_for_language(
                        user,
                        requester_language,
                    ));
                }
            }
        }
        Ok(records)
    }

    pub(super) async fn contextual_issue_mention_users(
        &self,
        project_record: &ProjectRecord,
        issue_model: &issue::Model,
        actor_id: Option<i64>,
        requester_language: Option<&str>,
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

        self.mention_user_records_from_ids(user_ids, requester_language)
            .await
    }

    pub(super) async fn append_project_mention_targets(
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
            display_name: "@project all:".to_string(),
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
                display_name: "@group all: ".to_string(),
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

    pub(super) async fn list_issue_sharers(
        &self,
        issue_id: i64,
    ) -> Result<Vec<IssueSharerRecord>, DbErr> {
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

    /// Resolves the legacy notification receiver ids for a new issue comment.
    pub(super) async fn issue_comment_notification_receiver_ids(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        actor_id: i64,
        comment_markdown: &str,
        parent_comment_id: Option<i64>,
    ) -> Result<Option<Vec<i64>>, DbErr> {
        self.issue_comment_notification_receiver_ids_for_event(
            owner_name,
            project_name,
            issue_number,
            actor_id,
            comment_markdown,
            parent_comment_id,
            "NEW_COMMENT",
        )
        .await
    }

    pub(super) async fn issue_comment_update_notification_receiver_ids(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        actor_id: i64,
        comment_markdown: &str,
        parent_comment_id: Option<i64>,
    ) -> Result<Option<Vec<i64>>, DbErr> {
        self.issue_comment_notification_receiver_ids_for_event(
            owner_name,
            project_name,
            issue_number,
            actor_id,
            comment_markdown,
            parent_comment_id,
            "COMMENT_UPDATED",
        )
        .await
    }

    async fn issue_comment_notification_receiver_ids_for_event(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        actor_id: i64,
        comment_markdown: &str,
        parent_comment_id: Option<i64>,
        event_type: &str,
    ) -> Result<Option<Vec<i64>>, DbErr> {
        let Some((project, issue)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let mut seen = HashSet::new();
        let mut receiver_ids = Vec::new();
        for user_id in self
            .issue_notification_receiver_ids(&project, &issue, event_type)
            .await?
        {
            if user_id != actor_id && seen.insert(user_id) {
                receiver_ids.push(user_id);
            }
        }
        if let Some(parent_comment_id) = parent_comment_id {
            if let Some(parent_comment) = issue_comment::Entity::find_by_id(parent_comment_id)
                .one(&self.db)
                .await?
                .filter(|comment| comment.issue_id == Some(issue.id))
            {
                Self::remove_issue_comment_receiver_id(
                    &mut receiver_ids,
                    &mut seen,
                    issue.author_id,
                );
                self.push_active_issue_comment_receiver_id(
                    &mut receiver_ids,
                    &mut seen,
                    Some(actor_id),
                    parent_comment.author_id,
                )
                .await?;
                let parent_comment_contents = self
                    .read_text_column("issue_comment", "contents", parent_comment.id)
                    .await?;
                for user_id in self
                    .mentioned_active_user_ids(&parent_comment_contents)
                    .await?
                {
                    if user_id != actor_id && seen.insert(user_id) {
                        receiver_ids.push(user_id);
                    }
                }
                if parent_comment.author_id == Some(actor_id) {
                    let sibling_comments = issue_comment::Entity::find()
                        .filter(issue_comment::Column::IssueId.eq(Some(issue.id)))
                        .filter(issue_comment::Column::ParentCommentId.eq(Some(parent_comment.id)))
                        .all(&self.db)
                        .await?;
                    for sibling in sibling_comments {
                        self.push_active_issue_comment_receiver_id(
                            &mut receiver_ids,
                            &mut seen,
                            Some(actor_id),
                            sibling.author_id,
                        )
                        .await?;
                    }
                }
            }
        }
        for user_id in self.mentioned_active_user_ids(comment_markdown).await? {
            if seen.insert(user_id) {
                receiver_ids.push(user_id);
            }
        }

        Ok(Some(receiver_ids))
    }

    /// Previews the legacy notification receivers for a new issue comment.
    ///
    /// # Errors
    ///
    /// Returns a database error when the issue or receiver rows cannot be read.
    pub async fn list_issue_comment_notification_receivers(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        actor_id: i64,
        comment_markdown: &str,
        parent_comment_id: Option<i64>,
    ) -> Result<Option<Vec<IssueCommentNotificationReceiverRecord>>, DbErr> {
        let Some(receiver_ids) = self
            .issue_comment_notification_receiver_ids(
                owner_name,
                project_name,
                issue_number,
                actor_id,
                comment_markdown,
                parent_comment_id,
            )
            .await?
        else {
            return Ok(None);
        };
        let mut receivers = Vec::new();
        for user_id in receiver_ids {
            let Some(user) = self.find_user_by_id(user_id).await? else {
                continue;
            };
            receivers.push(IssueCommentNotificationReceiverRecord {
                avatar_url: String::new(),
                display_name: user.display_name.clone(),
                email_address: user.email_address,
                login_id: user.login_id,
                pure_name_only: user.display_name,
            });
        }
        Ok(Some(receivers))
    }

    pub(super) fn remove_issue_comment_receiver_id(
        receiver_ids: &mut Vec<i64>,
        seen: &mut HashSet<i64>,
        user_id: Option<i64>,
    ) {
        let Some(user_id) = user_id else {
            return;
        };
        seen.remove(&user_id);
        receiver_ids.retain(|receiver_id| *receiver_id != user_id);
    }

    pub(super) async fn push_active_issue_comment_receiver_id(
        &self,
        receiver_ids: &mut Vec<i64>,
        seen: &mut HashSet<i64>,
        excluded_user_id: Option<i64>,
        user_id: Option<i64>,
    ) -> Result<(), DbErr> {
        let Some(user_id) = user_id else {
            return Ok(());
        };
        if Some(user_id) == excluded_user_id || seen.contains(&user_id) {
            return Ok(());
        }
        if !self
            .find_user_model_by_id(user_id)
            .await?
            .is_some_and(|user| n4user_is_active(&user))
        {
            return Ok(());
        }
        seen.insert(user_id);
        receiver_ids.push(user_id);
        Ok(())
    }

    pub(super) async fn read_project_issue_model(
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

    pub(super) async fn read_project_milestone_model(
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

    pub(super) async fn read_text_column(
        &self,
        table: &str,
        column: &str,
        id: i64,
    ) -> Result<String, DbErr> {
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

    pub(super) async fn write_text_column(
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

    /// Pull requests use the highest existing number, as in legacy PullRequest.
    async fn next_number_for_table(
        &self,
        table: &str,
        column: &str,
        filter_column: &str,
        filter_value: i64,
    ) -> Result<i64, DbErr> {
        let backend = self.db.get_database_backend();
        let sql = format!(
            "SELECT COALESCE(MAX({column}), 0) + 1 AS next_number FROM {table} WHERE {filter_column} = {}",
            sql_placeholders(backend, 1)[0]
        );
        let row = self
            .db
            .query_one(Statement::from_sql_and_values(
                backend,
                sql,
                vec![filter_value.into()],
            ))
            .await?;
        Ok(row
            .and_then(|row| row.try_get::<i64>("", "next_number").ok())
            .unwrap_or(1))
    }

    /// Reserve the project high-water mark before returning it. The write locks
    /// the project until the read completes, including across server processes.
    async fn reserve_project_number(
        &self,
        project_id: i64,
        table: &str,
        counter: &str,
    ) -> Result<i64, DbErr> {
        let backend = self.db.get_database_backend();
        let placeholder = &sql_placeholders(backend, 1)[0];
        let maximum =
            format!("(SELECT COALESCE(MAX(number), 0) FROM {table} WHERE project_id = project.id)");
        let transaction = self.db.begin().await?;
        transaction
            .execute(Statement::from_sql_and_values(
                backend,
                format!(
                    "UPDATE project SET {counter} = CASE \
                     WHEN COALESCE({counter}, 0) >= {maximum} \
                     THEN COALESCE({counter}, 0) ELSE {maximum} END + 1 \
                     WHERE id = {placeholder}"
                ),
                vec![project_id.into()],
            ))
            .await?;
        let row = transaction
            .query_one(Statement::from_sql_and_values(
                backend,
                format!("SELECT {counter} AS number FROM project WHERE id = {placeholder}"),
                vec![project_id.into()],
            ))
            .await?
            .ok_or_else(|| DbErr::Custom("project missing during number allocation".to_string()))?;
        let number = row.try_get::<i64>("", "number")?;
        transaction.commit().await?;
        Ok(number)
    }

    pub(super) async fn advance_project_number(
        &self,
        project_id: i64,
        counter: &str,
        number: i64,
    ) -> Result<(), DbErr> {
        let backend = self.db.get_database_backend();
        let placeholders = sql_placeholders(backend, 3);
        self.db
            .execute(Statement::from_sql_and_values(
                backend,
                format!(
                    "UPDATE project SET {counter} = {} WHERE id = {} \
                     AND COALESCE({counter}, 0) < {}",
                    placeholders[0], placeholders[1], placeholders[2]
                ),
                vec![number.into(), project_id.into(), number.into()],
            ))
            .await?;
        Ok(())
    }

    pub(super) async fn next_issue_number(&self, project_id: i64) -> Result<i64, DbErr> {
        self.reserve_project_number(project_id, "issue", "last_issue_number")
            .await
    }

    pub(super) async fn next_posting_number(&self, project_id: i64) -> Result<i64, DbErr> {
        self.reserve_project_number(project_id, "posting", "last_posting_number")
            .await
    }

    pub(super) async fn next_pull_request_number(&self, project_id: i64) -> Result<i64, DbErr> {
        self.next_number_for_table("pull_request", "number", "to_project_id", project_id)
            .await
    }

    pub(super) async fn find_duplicate_open_pull_request(
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

    pub(super) async fn resolve_assignee_id(
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

    pub(super) async fn resolve_issue_parent_id(
        &self,
        project_id: i64,
        parent_issue_id: Option<i64>,
        current_issue_id: Option<i64>,
    ) -> Result<Option<i64>, DbErr> {
        let Some(parent_issue_id) = parent_issue_id.filter(|value| *value > 0) else {
            return Ok(None);
        };
        if Some(parent_issue_id) == current_issue_id {
            return Err(DbErr::Custom("issue cannot be its own parent".to_string()));
        }
        let Some(parent) = issue::Entity::find_by_id(parent_issue_id)
            .one(&self.db)
            .await?
        else {
            return Err(DbErr::Custom("issue parent not found".to_string()));
        };
        if parent.project_id != Some(project_id) {
            return Err(DbErr::Custom(
                "issue parent must belong to the same project".to_string(),
            ));
        }
        if parent.parent_id.is_some() {
            return Err(DbErr::Custom(
                "issue parent cannot be another subtask".to_string(),
            ));
        }
        Ok(Some(parent.id))
    }

    pub(super) async fn issue_assignee_summary(
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

    pub(super) async fn issue_assignee_email_address(
        &self,
        assignee_id: Option<i64>,
    ) -> Result<String, DbErr> {
        let Some(assignee_id) = assignee_id else {
            return Ok(String::new());
        };
        let Some(row) = assignee::Entity::find_by_id(assignee_id)
            .one(&self.db)
            .await?
        else {
            return Ok(String::new());
        };
        let Some(user_id) = row.user_id else {
            return Ok(String::new());
        };
        Ok(n4user::Entity::find_by_id(user_id)
            .one(&self.db)
            .await?
            .and_then(|user| user.email)
            .unwrap_or_default())
    }

    pub(super) async fn issue_milestone_summary(
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

    pub(super) async fn issue_parent_summary(
        &self,
        parent_issue_id: Option<i64>,
    ) -> Result<(Option<i64>, String), DbErr> {
        let Some(parent_issue_id) = parent_issue_id else {
            return Ok((None, String::new()));
        };
        let Some(row) = issue::Entity::find_by_id(parent_issue_id)
            .one(&self.db)
            .await?
        else {
            return Ok((None, String::new()));
        };
        Ok((row.number, row.title.unwrap_or_default()))
    }

    pub(super) async fn issue_parent_state(
        &self,
        parent_issue_id: Option<i64>,
    ) -> Result<String, DbErr> {
        let Some(parent_issue_id) = parent_issue_id else {
            return Ok(String::new());
        };
        let Some(row) = issue::Entity::find_by_id(parent_issue_id)
            .one(&self.db)
            .await?
        else {
            return Ok(String::new());
        };
        Ok(issue_state_from_raw(
            self.db.get_database_backend(),
            row.state,
        ))
    }

    pub(super) async fn list_issue_labels(
        &self,
        issue_id: i64,
    ) -> Result<Vec<IssueLabelRecord>, DbErr> {
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
}
