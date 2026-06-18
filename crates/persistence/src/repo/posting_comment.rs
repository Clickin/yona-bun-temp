use super::*;

impl AppRepository {
    pub async fn read_posting_comment_origin(
        &self,
        comment_id: i64,
    ) -> Result<Option<PostingCommentOriginRecord>, DbErr> {
        let Some(comment) = posting_comment::Entity::find_by_id(comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(posting_id) = comment.posting_id else {
            return Ok(None);
        };
        let Some(posting_model) = posting::Entity::find_by_id(posting_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(project_id) = posting_model.project_id else {
            return Ok(None);
        };
        let Some(project_model) = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(project_record) = self.project_record_from_model(project_model).await? else {
            return Ok(None);
        };
        let contents_markdown = self
            .read_text_column("posting_comment", "contents", comment.id)
            .await?;

        Ok(Some(PostingCommentOriginRecord {
            comment_id: comment.id,
            contents_markdown,
            owner_name: project_record.owner_name,
            post_number: posting_model.number.unwrap_or_default(),
            project_name: project_record.project_name,
        }))
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
            created_date: Set(Some(input.created_at.unwrap_or_else(current_datetime))),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
            author_name: Set(Some(input.actor_display_name)),
            posting_id: Set(Some(posting_model.id)),
            project_id: Set(project_record.id),
            parent_comment_id: Set(input.parent_comment_id),
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
        self.bind_attachments(
            BOARD_COMMENT_ATTACHMENT_CONTAINER,
            created.id,
            &input.attachment_ids,
            Some(input.attachment_actor_id.unwrap_or(input.actor_id)),
        )
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

    pub async fn create_posting_comment_via_email(
        &self,
        input: CreatePostingCommentViaEmailInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let posting = self
            .create_posting_comment(CreatePostingCommentInput {
                actor_display_name: input.actor_display_name,
                actor_id: input.actor_id,
                actor_login_id: input.actor_login_id,
                attachment_actor_id: None,
                attachment_ids: Vec::new(),
                contents_markdown: input.contents_markdown.clone(),
                created_at: None,
                owner_name: input.owner_name.clone(),
                parent_comment_id: None,
                post_number: input.post_number,
                project_name: input.project_name.clone(),
            })
            .await?;
        let Some(posting) = posting else {
            return Ok(None);
        };
        let Some(comment) = posting
            .comments
            .iter()
            .filter(|comment| {
                comment.author_id == Some(input.actor_id)
                    && comment.contents_markdown == input.contents_markdown
            })
            .max_by_key(|comment| comment.id)
        else {
            return Ok(Some(posting));
        };
        self.record_original_email(
            BOARD_COMMENT_ATTACHMENT_CONTAINER,
            comment.id,
            &input.message_id,
        )
        .await?;
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
        self.sync_attachments(
            BOARD_COMMENT_ATTACHMENT_CONTAINER,
            updated.id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
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
            .filter(
                attachment::Column::ContainerType.is_in(
                    attachment_container_aliases(BOARD_COMMENT_ATTACHMENT_CONTAINER)
                        .into_iter()
                        .map(Some),
                ),
            )
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
}
