use super::*;

impl AppRepository {
    pub async fn read_issue_comment_origin(
        &self,
        comment_id: i64,
    ) -> Result<Option<IssueCommentOriginRecord>, DbErr> {
        let Some(comment) = issue_comment::Entity::find_by_id(comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(issue_id) = comment.issue_id else {
            return Ok(None);
        };
        let Some(issue_model) = issue::Entity::find_by_id(issue_id).one(&self.db).await? else {
            return Ok(None);
        };
        let Some(project_id) = issue_model.project_id else {
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
            .read_text_column("issue_comment", "contents", comment.id)
            .await?;

        Ok(Some(IssueCommentOriginRecord {
            author_login_id: comment.author_login_id.unwrap_or_default(),
            comment_id: comment.id,
            contents_markdown,
            issue_number: issue_model.number.unwrap_or_default(),
            owner_name: project_record.owner_name,
            project_name: project_record.project_name,
        }))
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
            parent_comment_id: Set(input.parent_comment_id),
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
        self.bind_attachments(
            ISSUE_COMMENT_ATTACHMENT_CONTAINER,
            created.id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.recount_issue_comments(issue_model.id).await?;
        self.read_issue_detail(&input.owner_name, &input.project_name, input.issue_number)
            .await
    }

    pub async fn create_issue_comment_via_email(
        &self,
        input: CreateIssueCommentViaEmailInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let issue = self
            .create_issue_comment(CreateIssueCommentInput {
                actor_display_name: input.actor_display_name,
                actor_id: input.actor_id,
                actor_login_id: input.actor_login_id,
                attachment_ids: Vec::new(),
                contents_markdown: input.contents_markdown.clone(),
                issue_number: input.issue_number,
                owner_name: input.owner_name.clone(),
                parent_comment_id: None,
                project_name: input.project_name.clone(),
            })
            .await?;
        let Some(issue) = issue else {
            return Ok(None);
        };
        let Some(comment) = issue
            .comments
            .iter()
            .filter(|comment| {
                comment.author_id == Some(input.actor_id)
                    && comment.contents_markdown == input.contents_markdown
            })
            .max_by_key(|comment| comment.id)
        else {
            return Ok(Some(issue));
        };
        self.record_original_email(
            ISSUE_COMMENT_ATTACHMENT_CONTAINER,
            comment.id,
            &input.message_id,
        )
        .await?;
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
        self.sync_attachments(
            ISSUE_COMMENT_ATTACHMENT_CONTAINER,
            updated.id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
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
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(ISSUE_COMMENT_ATTACHMENT_CONTAINER.to_string())),
            )
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
}
