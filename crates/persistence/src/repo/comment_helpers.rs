use super::*;

impl AppRepository {
    pub(super) async fn list_issue_comments(
        &self,
        issue_id: i64,
        viewer_id: Option<i64>,
    ) -> Result<Vec<IssueCommentRecord>, DbErr> {
        let rows = issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(issue_id)))
            .order_by_asc(issue_comment::Column::CreatedDate)
            .order_by_asc(issue_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut comments = Vec::new();
        for row in rows {
            comments.push(self.issue_comment_record(row, viewer_id).await?);
        }
        Ok(comments)
    }

    pub(super) async fn list_posting_comments(
        &self,
        posting_id: i64,
    ) -> Result<Vec<PostingCommentRecord>, DbErr> {
        let rows = posting_comment::Entity::find()
            .filter(posting_comment::Column::PostingId.eq(Some(posting_id)))
            .order_by_asc(posting_comment::Column::CreatedDate)
            .order_by_asc(posting_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut comments = Vec::new();
        for row in rows {
            comments.push(self.posting_comment_record(row).await?);
        }
        Ok(comments)
    }

    pub(super) async fn posting_comment_record(
        &self,
        row: posting_comment::Model,
    ) -> Result<PostingCommentRecord, DbErr> {
        let via_email = original_email::Entity::find()
            .filter(
                original_email::Column::ResourceType
                    .eq(Some(BOARD_COMMENT_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(original_email::Column::ResourceId.eq(Some(row.id.to_string())))
            .one(&self.db)
            .await?
            .is_some();
        Ok(PostingCommentRecord {
            attachments: self
                .list_issue_attachments(BOARD_COMMENT_ATTACHMENT_CONTAINER, row.id)
                .await?,
            author_id: row.author_id,
            author_label: row.author_name.unwrap_or_default(),
            author_login_id: row.author_login_id.unwrap_or_default(),
            contents_markdown: self
                .read_text_column("posting_comment", "contents", row.id)
                .await?,
            created_at: row.created_date,
            created_label: format_workspace_date_label(row.created_date),
            id: row.id,
            parent_comment_id: row.parent_comment_id,
            via_email,
        })
    }

    pub(super) async fn issue_comment_record(
        &self,
        row: issue_comment::Model,
        viewer_id: Option<i64>,
    ) -> Result<IssueCommentRecord, DbErr> {
        let author_id = row.author_id;
        let author_login_id = row.author_login_id.unwrap_or_default();
        let author_label = row.author_name.unwrap_or_default();
        let author_email_address = self
            .user_email_for_id_or_login(author_id, &author_login_id)
            .await?;
        let voters = self.list_issue_comment_voters(row.id).await?;
        let viewer_has_voted = viewer_id
            .is_some_and(|viewer_id| voters.iter().any(|voter| voter.user_id == viewer_id));
        let via_email = original_email::Entity::find()
            .filter(
                original_email::Column::ResourceType
                    .eq(Some(ISSUE_COMMENT_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(original_email::Column::ResourceId.eq(Some(row.id.to_string())))
            .one(&self.db)
            .await?
            .is_some();
        Ok(IssueCommentRecord {
            attachments: self
                .list_issue_attachments(ISSUE_COMMENT_ATTACHMENT_CONTAINER, row.id)
                .await?,
            author_email_address,
            author_id,
            author_label,
            author_login_id,
            contents_markdown: self
                .read_text_column("issue_comment", "contents", row.id)
                .await?,
            created_at: row.created_date,
            created_label: format_workspace_date_label(row.created_date),
            id: row.id,
            parent_comment_id: row.parent_comment_id,
            via_email,
            viewer_has_voted,
            voter_count: voters.len() as u32,
            voters,
        })
    }

    pub(super) async fn list_issue_comment_voters(
        &self,
        comment_id: i64,
    ) -> Result<Vec<IssueCommentVoterRecord>, DbErr> {
        let rows = issue_comment_voter::Entity::find()
            .filter(issue_comment_voter::Column::IssueCommentId.eq(comment_id))
            .all(&self.db)
            .await?;
        let mut voters = Vec::new();
        for row in rows {
            if let Some(user) = n4user::Entity::find_by_id(row.user_id)
                .one(&self.db)
                .await?
            {
                voters.push(IssueCommentVoterRecord {
                    email_address: user.email.unwrap_or_default(),
                    login_id: user.login_id.unwrap_or_default(),
                    user_id: user.id,
                    user_label: user.name.unwrap_or_default(),
                });
            }
        }
        voters.sort_by(|left, right| {
            left.login_id
                .cmp(&right.login_id)
                .then(left.user_id.cmp(&right.user_id))
        });
        Ok(voters)
    }

    pub(super) async fn list_issue_timeline_items(
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
                IssueTimelineItemRecord::Comment(self.issue_comment_record(row, viewer_id).await?),
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

    pub(super) async fn user_email_for_id_or_login(
        &self,
        user_id: Option<i64>,
        login_id: &str,
    ) -> Result<String, DbErr> {
        let email_address = if let Some(user_id) = user_id {
            n4user::Entity::find_by_id(user_id)
                .one(&self.db)
                .await?
                .and_then(|user| user.email)
                .unwrap_or_default()
        } else {
            String::new()
        };
        if !email_address.is_empty() || login_id.trim().is_empty() {
            return Ok(email_address);
        }
        Ok(n4user::Entity::find()
            .filter(n4user::Column::LoginId.eq(Some(normalize_identity(login_id))))
            .one(&self.db)
            .await?
            .and_then(|user| user.email)
            .unwrap_or_default())
    }

    pub(super) async fn list_issue_attachments(
        &self,
        container_type: &str,
        container_id: i64,
    ) -> Result<Vec<IssueAttachmentRecord>, DbErr> {
        Ok(attachment::Entity::find()
            .filter(
                attachment::Column::ContainerType.is_in(
                    attachment_container_aliases(container_type)
                        .into_iter()
                        .map(Some),
                ),
            )
            .filter(attachment::Column::ContainerId.eq(container_id))
            .order_by_asc(attachment::Column::Id)
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| IssueAttachmentRecord {
                hash: row.hash.unwrap_or_default(),
                id: row.id,
                mime_type: row.mime_type.unwrap_or_default(),
                name: row.name.unwrap_or_default(),
                size: row.size.unwrap_or_default(),
            })
            .collect())
    }

    pub(super) async fn bind_attachments(
        &self,
        container_type: &str,
        container_id: i64,
        attachment_ids: &[i64],
        actor_id: Option<i64>,
    ) -> Result<(), DbErr> {
        for attachment_id in attachment_ids {
            if let Some(row) = attachment::Entity::find_by_id(*attachment_id)
                .one(&self.db)
                .await?
            {
                if !can_bind_attachment(
                    row.container_type.as_deref().unwrap_or_default(),
                    row.container_id,
                    container_type,
                    container_id,
                    actor_id,
                ) {
                    continue;
                }
                let mut active = attachment::ActiveModel::from(row);
                active.container_type = Set(Some(container_type.to_string()));
                active.container_id = Set(container_id);
                active.update(&self.db).await?;
            }
        }
        Ok(())
    }

    pub(super) async fn sync_attachments(
        &self,
        container_type: &str,
        container_id: i64,
        attachment_ids: &[i64],
        actor_id: Option<i64>,
    ) -> Result<(), DbErr> {
        let keep: HashSet<i64> = attachment_ids.iter().copied().collect();
        let existing = attachment::Entity::find()
            .filter(
                attachment::Column::ContainerType.is_in(
                    attachment_container_aliases(container_type)
                        .into_iter()
                        .map(Some),
                ),
            )
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
        self.bind_attachments(container_type, container_id, attachment_ids, actor_id)
            .await
    }
}
