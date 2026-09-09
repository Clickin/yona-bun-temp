use super::*;

impl AppRepositoryImpl<'_> {
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
                    "ranged".to_string()
                } else {
                    "non_ranged".to_string()
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
        self.bind_attachments(
            REVIEW_COMMENT_ATTACHMENT_CONTAINER,
            created.id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
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
}
