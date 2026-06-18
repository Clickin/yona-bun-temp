impl AppRepository {
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
        let mut old_value_to_write = old_value.to_string();
        if issue_event_uses_draft_merge(event_type) {
            if let Some(previous) = self
                .recent_mergeable_issue_event(issue_id, sender_login_id, event_type)
                .await?
            {
                old_value_to_write = self
                    .read_text_column("issue_event", "old_value", previous.id)
                    .await?;
                issue_event::Entity::delete_by_id(previous.id)
                    .exec(&self.db)
                    .await?;
                if old_value_to_write == new_value {
                    return Ok(());
                }
            }
        }

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
        self.write_text_column("issue_event", "old_value", created.id, &old_value_to_write)
            .await?;
        self.write_text_column("issue_event", "new_value", created.id, new_value)
            .await?;
        Ok(())
    }

    async fn recent_mergeable_issue_event(
        &self,
        issue_id: i64,
        sender_login_id: &str,
        event_type: &str,
    ) -> Result<Option<issue_event::Model>, DbErr> {
        let now = current_datetime();
        let events = issue_event::Entity::find()
            .filter(issue_event::Column::IssueId.eq(Some(issue_id)))
            .filter(issue_event::Column::SenderLoginId.eq(Some(sender_login_id.to_string())))
            .filter(issue_event::Column::EventType.eq(Some(event_type.to_string())))
            .order_by_desc(issue_event::Column::Id)
            .all(&self.db)
            .await?;
        Ok(events.into_iter().find(|event| {
            event.created.is_some_and(|created| {
                now.signed_duration_since(created).num_milliseconds()
                    < issue_event_draft_time_in_millis()
            })
        }))
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

        let now = current_datetime();
        let mut old_value_to_write = old_value.to_string();
        if notification_event_uses_draft_merge(event_type) {
            if let Some(previous) = self
                .recent_mergeable_notification_event(
                    sender_id,
                    resource_type,
                    resource_id,
                    event_type,
                    now,
                )
                .await?
            {
                old_value_to_write = self
                    .read_text_column("notification_event", "old_value", previous.id)
                    .await?;
                self.delete_notification_event_rows(previous.id).await?;
                if old_value_to_write == new_value {
                    return Ok(());
                }
            }
        }

        let created = notification_event::ActiveModel {
            id: NotSet,
            title: Set(None),
            sender_id: Set(Some(sender_id)),
            created: Set(Some(now)),
            resource_type: Set(Some(resource_type.to_string())),
            resource_id: Set(Some(resource_id.to_string())),
            event_type: Set(Some(event_type.to_string())),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "notification_event",
            "old_value",
            created.id,
            &old_value_to_write,
        )
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

    async fn recent_mergeable_notification_event(
        &self,
        sender_id: i64,
        resource_type: &str,
        resource_id: &str,
        event_type: &str,
        now: DateTime,
    ) -> Result<Option<notification_event::Model>, DbErr> {
        let events = notification_event::Entity::find()
            .filter(notification_event::Column::SenderId.eq(Some(sender_id)))
            .filter(notification_event::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(notification_event::Column::ResourceId.eq(Some(resource_id.to_string())))
            .filter(notification_event::Column::EventType.eq(Some(event_type.to_string())))
            .order_by_desc(notification_event::Column::Id)
            .all(&self.db)
            .await?;
        Ok(events.into_iter().find(|event| {
            event.created.is_some_and(|created| {
                now.signed_duration_since(created).num_milliseconds()
                    < notification_draft_time_in_millis()
            })
        }))
    }

    async fn delete_notification_event_rows(&self, event_id: i64) -> Result<(), DbErr> {
        notification_event_n4user::Entity::delete_many()
            .filter(notification_event_n4user::Column::NotificationEventId.eq(event_id))
            .exec(&self.db)
            .await?;
        notification_mail::Entity::delete_many()
            .filter(notification_mail::Column::NotificationEventId.eq(Some(event_id)))
            .exec(&self.db)
            .await?;
        notification_event::Entity::delete_by_id(event_id)
            .exec(&self.db)
            .await?;
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

    async fn push_issue_notification_receiver_id(
        &self,
        project: &ProjectRecord,
        issue: &issue::Model,
        assignee_user_id: Option<i64>,
        direct_sharer_ids: &HashSet<i64>,
        user_ids: &mut Vec<i64>,
        seen: &mut HashSet<i64>,
        user_id: Option<i64>,
    ) -> Result<(), DbErr> {
        let Some(user_id) = user_id else {
            return Ok(());
        };
        if seen.contains(&user_id) {
            return Ok(());
        }
        if !self
            .find_user_model_by_id(user_id)
            .await?
            .is_some_and(|user| n4user_is_active(&user))
        {
            return Ok(());
        }
        let has_issue_access = issue.author_id == Some(user_id)
            || assignee_user_id == Some(user_id)
            || direct_sharer_ids.contains(&user_id);
        if !has_issue_access
            && !self
                .search_project_visible_for_actor(project, Some(user_id))
                .await?
        {
            return Ok(());
        }
        seen.insert(user_id);
        user_ids.push(user_id);
        Ok(())
    }

    async fn issue_notification_receiver_ids(
        &self,
        project: &ProjectRecord,
        issue: &issue::Model,
        event_type: &str,
    ) -> Result<Vec<i64>, DbErr> {
        let mut receivers = Vec::new();
        let mut seen = HashSet::new();
        let assignee_user_id = self
            .search_issue_assignee_user_id(issue.assignee_id)
            .await?;
        let direct_sharer_ids = issue_sharer::Entity::find()
            .filter(issue_sharer::Column::IssueId.eq(Some(issue.id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.user_id)
            .collect::<HashSet<_>>();

        self.push_issue_notification_receiver_id(
            project,
            issue,
            assignee_user_id,
            &direct_sharer_ids,
            &mut receivers,
            &mut seen,
            issue.author_id,
        )
        .await?;
        self.push_issue_notification_receiver_id(
            project,
            issue,
            assignee_user_id,
            &direct_sharer_ids,
            &mut receivers,
            &mut seen,
            assignee_user_id,
        )
        .await?;
        for user_id in direct_sharer_ids.iter().copied() {
            self.push_issue_notification_receiver_id(
                project,
                issue,
                assignee_user_id,
                &direct_sharer_ids,
                &mut receivers,
                &mut seen,
                Some(user_id),
            )
            .await?;
        }

        for user_id in self
            .active_watch_user_ids("ISSUE", &issue.id.to_string())
            .await?
        {
            self.push_issue_notification_receiver_id(
                project,
                issue,
                assignee_user_id,
                &direct_sharer_ids,
                &mut receivers,
                &mut seen,
                Some(user_id),
            )
            .await?;
        }

        for user_id in self
            .active_watch_user_ids("PROJECT", &project.id.to_string())
            .await?
        {
            if self
                .project_notification_enabled_for_user(user_id, project.id, event_type)
                .await?
            {
                self.push_issue_notification_receiver_id(
                    project,
                    issue,
                    assignee_user_id,
                    &direct_sharer_ids,
                    &mut receivers,
                    &mut seen,
                    Some(user_id),
                )
                .await?;
            }
        }

        for user_id in self
            .explicit_project_notification_user_ids(project.id, event_type, true)
            .await?
        {
            self.push_issue_notification_receiver_id(
                project,
                issue,
                assignee_user_id,
                &direct_sharer_ids,
                &mut receivers,
                &mut seen,
                Some(user_id),
            )
            .await?;
        }

        let issue_unwatchers = self
            .active_unwatch_user_ids("ISSUE", &issue.id.to_string())
            .await?
            .into_iter()
            .collect::<HashSet<_>>();
        let event_unwatchers = self
            .explicit_project_notification_user_ids(project.id, event_type, false)
            .await?
            .into_iter()
            .collect::<HashSet<_>>();
        receivers.retain(|user_id| !issue_unwatchers.contains(user_id));
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

        if let Some(project) = self.read_project_by_id(project_id).await? {
            for user_id in self
                .pull_request_review_comment_author_ids(pull_request_id)
                .await?
            {
                self.push_readable_pull_request_watcher_id(
                    &project,
                    &mut receivers,
                    &mut seen,
                    Some(user_id),
                )
                .await?;
            }
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
        let pull_request_body = self
            .read_text_column("pull_request", "body", pull_request_id)
            .await?;
        receivers.extend(self.mentioned_active_user_ids(&pull_request_body).await?);
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
        let reply_target = self
            .notification_reply_target(
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
            reply_resource_id: reply_target
                .as_ref()
                .map(|(_, resource_id)| resource_id.to_string())
                .unwrap_or_default(),
            reply_resource_type: reply_target
                .as_ref()
                .map(|(resource_type, _)| resource_type.clone())
                .unwrap_or_default(),
            resource_id: event.resource_id.unwrap_or_default(),
            resource_type: event.resource_type.unwrap_or_default(),
            target_path: target.0,
            target_title: target.1,
            type_icon: notification_type_icon(&event_type, &new_value).to_string(),
        })
    }

    async fn notification_reply_target(
        &self,
        resource_type: &str,
        resource_id: &str,
    ) -> Result<Option<(String, i64)>, DbErr> {
        let Some(resource_id) = resource_id.parse::<i64>().ok() else {
            return Ok(None);
        };
        let normalized_type = normalize_identity(resource_type);
        match normalized_type.as_str() {
            "issue" | "issue_post" => Ok(Some(("issue_post".to_string(), resource_id))),
            "issue_comment" => {
                let Some(comment) = issue_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                Ok(comment
                    .issue_id
                    .map(|issue_id| ("issue_post".to_string(), issue_id)))
            }
            "posting" | "board_post" => Ok(Some(("board_post".to_string(), resource_id))),
            "posting_comment" | "nonissue_comment" => {
                let Some(comment) = posting_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                Ok(comment
                    .posting_id
                    .map(|posting_id| ("board_post".to_string(), posting_id)))
            }
            "review_comment" => {
                let Some(comment) = review_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                Ok(comment
                    .thread_id
                    .map(|thread_id| ("comment_thread".to_string(), thread_id)))
            }
            _ => Ok(None),
        }
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
}
