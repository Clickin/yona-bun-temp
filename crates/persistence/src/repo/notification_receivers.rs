use super::*;

impl AppRepositoryImpl<'_> {
    pub(super) async fn active_watch_user_ids(
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

    pub(super) async fn active_unwatch_user_ids(
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

    pub(super) async fn explicit_project_notification_user_ids(
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

    pub(super) async fn project_notification_enabled_for_user(
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

    pub(super) async fn posting_notification_receiver_ids(
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

    pub(super) async fn push_issue_notification_receiver_id(
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

    pub(super) async fn issue_notification_receiver_ids(
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

    pub(super) async fn pull_request_notification_receiver_ids(
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
                self.push_readable_project_watcher_id(
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

    pub(super) async fn commit_notification_receiver_ids(
        &self,
        project_id: i64,
        actor_id: i64,
        event_type: &str,
        commit: Option<(&str, Option<i64>)>,
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

        if let Some((commit_id, author_id)) = commit {
            let Some(project) = self.read_project_by_id(project_id).await? else {
                return Ok(Vec::new());
            };
            let resource_id = format!("{project_id}:{commit_id}");
            let commenters = review_comment::Entity::find()
                .select_only()
                .column(review_comment::Column::AuthorId)
                .distinct()
                .join(
                    JoinType::InnerJoin,
                    review_comment::Relation::CommentThread.def(),
                )
                .filter(comment_thread::Column::ProjectId.eq(Some(project_id)))
                .filter(comment_thread::Column::CommitId.eq(Some(commit_id.to_string())))
                .filter(comment_thread::Column::PullRequestId.is_null())
                .into_tuple::<Option<i64>>()
                .all(&self.db)
                .await?;
            let watchers = self.active_watch_user_ids("COMMIT", &resource_id).await?;
            for user_id in author_id
                .into_iter()
                .chain(commenters.into_iter().flatten())
                .chain(watchers)
            {
                if user_id != actor_id
                    && self
                        .project_notification_enabled_for_user(user_id, project_id, event_type)
                        .await?
                {
                    self.push_readable_project_watcher_id(
                        &project,
                        &mut receivers,
                        &mut seen,
                        Some(user_id),
                    )
                    .await?;
                }
            }
            let unwatchers: HashSet<_> = self
                .active_unwatch_user_ids("COMMIT", &resource_id)
                .await?
                .into_iter()
                .collect();
            for index in (0..receivers.len()).rev() {
                if unwatchers.contains(&receivers[index])
                    || !self
                        .search_project_visible_for_actor(&project, Some(receivers[index]))
                        .await?
                {
                    receivers.swap_remove(index);
                }
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
}
