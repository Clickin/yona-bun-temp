use super::*;

impl AppRepositoryImpl<'_> {
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
            created_label: row
                .created_date
                .map(|created| created.and_utc().to_rfc3339())
                .unwrap_or_default(),
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
            let event_type = row.event_type.unwrap_or_default();
            let old_value = self
                .read_text_column("issue_event", "old_value", row.id)
                .await?;
            let new_value = self
                .read_text_column("issue_event", "new_value", row.id)
                .await?;
            let sender_login_id = row.sender_login_id.unwrap_or_default();
            let sender_label = self
                .find_user_by_login_id(&sender_login_id)
                .await?
                .map(|user| user.display_name)
                .filter(|label| !label.is_empty())
                .unwrap_or_else(|| sender_login_id.clone());
            let event_target = self
                .issue_event_target(issue_id, &event_type, &old_value, &new_value)
                .await?;
            items.push((
                row.created,
                row.id,
                IssueTimelineItemRecord::Event {
                    created_label: row
                        .created
                        .map(|created| created.and_utc().to_rfc3339())
                        .unwrap_or_default(),
                    event_type,
                    id: row.id,
                    new_value,
                    old_value,
                    resource_href: event_target.resource_href,
                    resource_label: event_target.resource_label,
                    resource_title: event_target.resource_title,
                    sender_login_id,
                    sender_label,
                    target_login_id: event_target.target_login_id,
                    target_label: event_target.target_label,
                },
            ));
        }
        let _ = viewer_id;
        items.sort_by_key(|(created, id, _)| (*created, *id));
        Ok(items.into_iter().map(|(_, _, item)| item).collect())
    }

    async fn issue_event_target(
        &self,
        issue_id: i64,
        event_type: &str,
        old_value: &str,
        new_value: &str,
    ) -> Result<IssueEventTargetRecord, DbErr> {
        let mut target = IssueEventTargetRecord::default();
        let value = if new_value.trim().is_empty() {
            old_value.trim()
        } else {
            new_value.trim()
        };
        match event_type {
            "ISSUE_ASSIGNEE_CHANGED" => {
                if let Ok(user_id) = value.parse::<i64>() {
                    if let Some(assignee) =
                        assignee::Entity::find_by_id(user_id).one(&self.db).await?
                    {
                        if let Some(user_id) = assignee.user_id {
                            if let Some(user) = self.find_user_by_id(user_id).await? {
                                target.target_login_id = user.login_id;
                                target.target_label = user.display_name;
                            }
                        }
                    } else if let Some(user) = self.find_user_by_id(user_id).await? {
                        target.target_login_id = user.login_id;
                        target.target_label = user.display_name;
                    }
                } else if !value.is_empty() {
                    if let Some(user) = self.find_user_by_login_id(value).await? {
                        target.target_login_id = user.login_id;
                        target.target_label = user.display_name;
                    }
                }
            }
            "ISSUE_SHARER_CHANGED" => {
                if !value.is_empty() {
                    if let Some(user) = self.find_user_by_login_id(value).await? {
                        target.target_login_id = user.login_id;
                        target.target_label = user.display_name;
                    } else {
                        target.target_login_id = value.to_string();
                        target.target_label = value.to_string();
                    }
                }
            }
            "ISSUE_MILESTONE_CHANGED" => {
                if let Ok(milestone_id) = value.parse::<i64>() {
                    if let Some(row) = milestone::Entity::find_by_id(milestone_id)
                        .one(&self.db)
                        .await?
                    {
                        target.resource_href = format!("/milestone/{}", row.id);
                        target.resource_label = row.title.unwrap_or_default();
                        target.resource_title = "milestone".to_string();
                    }
                }
            }
            "ISSUE_REFERRED_FROM_COMMIT" => {
                if !value.is_empty() {
                    target.resource_href = format!("/commit/{}", value);
                    target.resource_label = format!("@{}", value);
                    target.resource_title = "code.commits".to_string();
                }
            }
            "ISSUE_REFERRED_FROM_PULL_REQUEST" => {
                if let Ok(pull_request_id) = value.parse::<i64>() {
                    if let Some(row) = pull_request::Entity::find_by_id(pull_request_id)
                        .one(&self.db)
                        .await?
                    {
                        let number = row.number.unwrap_or_default();
                        target.resource_href = format!("/pullRequest/{}", number);
                        target.resource_label =
                            format!("pullRequest -{} {}", number, row.title.unwrap_or_default());
                        target.resource_title = "pullRequest".to_string();
                    }
                }
            }
            "ISSUE_MOVED" => {
                let project_path = old_value.trim();
                if project_path.contains('/') {
                    target.resource_href = format!("/{}", project_path);
                    target.resource_label = project_path.to_string();
                }
            }
            "ISSUE_LABEL_CHANGED" => {
                target.resource_label = value.to_string();
            }
            _ => {}
        }
        if target.resource_href.starts_with('/')
            && matches!(
                event_type,
                "ISSUE_MILESTONE_CHANGED"
                    | "ISSUE_REFERRED_FROM_COMMIT"
                    | "ISSUE_REFERRED_FROM_PULL_REQUEST"
            )
        {
            let Some(issue_row) = issue::Entity::find_by_id(issue_id).one(&self.db).await? else {
                return Ok(target);
            };
            if let Some(project_id) = issue_row.project_id {
                if let Some(project) = project::Entity::find_by_id(project_id)
                    .one(&self.db)
                    .await?
                {
                    target.resource_href = format!(
                        "/{}/{}{}",
                        project.owner.unwrap_or_default(),
                        project.name.unwrap_or_default(),
                        target.resource_href
                    );
                }
            }
        }
        Ok(target)
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
                created_at: row.created_date,
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

#[derive(Default)]
struct IssueEventTargetRecord {
    resource_href: String,
    resource_label: String,
    resource_title: String,
    target_login_id: String,
    target_label: String,
}
