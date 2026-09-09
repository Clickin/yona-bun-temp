use super::*;

impl AppRepositoryImpl<'_> {
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
            let prev_commit_id = input
                .prev_commit_id
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned)
                .or_else(|| model.merged_commit_id_from.clone());
            let path = input
                .path
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned);
            let start_side = review_thread_side(input.start_side.as_deref());
            let end_side = review_thread_side(input.end_side.as_deref());
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
                pull_request_id: Set(Some(model.id)),
                project_id: Set(Some(project.id)),
                prev_commit_id: Set(prev_commit_id),
                commit_id: Set(commit_id),
                path: Set(path),
                start_side: Set(start_side),
                start_line: Set(input.start_line),
                start_column: Set(None),
                end_side: Set(end_side),
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

    pub async fn update_pull_request_comment(
        &self,
        input: UpdatePullRequestCommentInput,
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
        if thread.pull_request_id != Some(model.id) {
            return Ok(None);
        }
        self.write_text_column(
            "review_comment",
            "contents",
            input.comment_id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_attachments(
            REVIEW_COMMENT_ATTACHMENT_CONTAINER,
            input.comment_id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.pull_request_detail_from_model(model, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn delete_pull_request_comment(
        &self,
        input: DeletePullRequestCommentInput,
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
        if thread.pull_request_id != Some(model.id) {
            return Ok(None);
        }
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(REVIEW_COMMENT_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(input.comment_id))
            .exec(&self.db)
            .await?;
        review_comment::Entity::delete_by_id(input.comment_id)
            .exec(&self.db)
            .await?;
        let remaining = review_comment::Entity::find()
            .filter(review_comment::Column::ThreadId.eq(Some(thread_id)))
            .count(&self.db)
            .await?;
        if remaining == 0 {
            attachment::Entity::delete_many()
                .filter(attachment::Column::ContainerType.eq(Some("COMMENT_THREAD".to_string())))
                .filter(attachment::Column::ContainerId.eq(thread_id))
                .exec(&self.db)
                .await?;
            comment_thread::Entity::delete_by_id(thread_id)
                .exec(&self.db)
                .await?;
        }
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

    pub async fn read_review_thread_route_context(
        &self,
        thread_id: i64,
    ) -> Result<Option<ReviewThreadRouteContext>, DbErr> {
        let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };

        let pull_request = if let Some(pull_request_id) = thread.pull_request_id {
            pull_request::Entity::find_by_id(pull_request_id)
                .one(&self.db)
                .await?
        } else {
            None
        };
        let project_id = thread
            .project_id
            .or_else(|| pull_request.as_ref().and_then(|row| row.to_project_id));
        let Some(project_id) = project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };

        Ok(Some(ReviewThreadRouteContext {
            author_id: thread.author_id,
            commit_id: thread.commit_id.unwrap_or_default(),
            owner_name: project.owner_name,
            project_name: project.project_name,
            pull_request_number: pull_request.and_then(|row| row.number),
            thread_id: thread.id,
        }))
    }

    pub async fn create_review_comment_via_email(
        &self,
        input: CreateReviewCommentViaEmailInput,
    ) -> Result<Option<ReviewThreadRecord>, DbErr> {
        let Some(thread) = comment_thread::Entity::find_by_id(input.thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let created = review_comment::ActiveModel {
            id: NotSet,
            created_date: Set(Some(current_datetime())),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(input.actor_login_id)),
            author_name: Set(Some(input.actor_display_name)),
            thread_id: Set(Some(thread.id)),
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
        self.record_original_email(
            REVIEW_COMMENT_ATTACHMENT_CONTAINER,
            created.id,
            &input.message_id,
        )
        .await?;
        let comments = self.list_review_comments(thread.id).await?;
        self.review_thread_record(thread, comments).await.map(Some)
    }
}
