impl AppRepository {
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

    pub async fn update_commit_discussion_comment(
        &self,
        input: UpdateCommitDiscussionCommentInput,
    ) -> Result<Option<ReviewThreadRecord>, DbErr> {
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
        let Some(updated_thread) = comment_thread::Entity::find_by_id(thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let comments = self.list_review_comments(updated_thread.id).await?;
        self.review_thread_record(updated_thread, comments)
            .await
            .map(Some)
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
        self.list_project_review_threads_with_page_size(project, filter, Some(PAGE_SIZE))
            .await
    }

    pub async fn list_project_review_threads_for_export(
        &self,
        project: &ProjectRecord,
        filter: ReviewThreadListFilter,
    ) -> Result<ReviewThreadListRecord, DbErr> {
        self.list_project_review_threads_with_page_size(project, filter, None)
            .await
    }

    async fn list_project_review_threads_with_page_size(
        &self,
        project: &ProjectRecord,
        filter: ReviewThreadListFilter,
        page_size: Option<u32>,
    ) -> Result<ReviewThreadListRecord, DbErr> {
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
            let rows = if let Some(page_size) = page_size {
                page_select
                    .paginate(&self.db, page_size as u64)
                    .fetch_page((page_num - 1) as u64)
                    .await?
            } else {
                page_select.all(&self.db).await?
            };
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
                page_size: page_size.unwrap_or(total_count.max(1)),
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
        let effective_page_size = page_size.unwrap_or(total_count.max(1));
        let offset = ((page_num - 1) * effective_page_size) as usize;
        let mut items = Vec::new();
        let rows = if page_size.is_some() {
            matched
                .into_iter()
                .skip(offset)
                .take(effective_page_size as usize)
                .collect::<Vec<_>>()
        } else {
            matched
        };
        for (row, comments, _) in rows {
            items.push(self.review_thread_record(row, comments).await?);
        }
        Ok(ReviewThreadListRecord {
            closed_count,
            items,
            open_count,
            page_num,
            page_size: effective_page_size,
            state,
            total_count,
        })
    }
}
