use super::*;

impl AppRepositoryImpl<'_> {
    pub(super) async fn record_original_email(
        &self,
        resource_type: &str,
        resource_id: i64,
        message_id: &str,
    ) -> Result<(), DbErr> {
        let message_id = message_id.trim();
        if message_id.is_empty() {
            return Ok(());
        }
        original_email::ActiveModel {
            id: NotSet,
            message_id: Set(Some(message_id.to_string())),
            resource_type: Set(Some(resource_type.to_string())),
            resource_id: Set(Some(resource_id.to_string())),
            handled_date: Set(None),
        }
        .insert(&self.db)
        .await?;
        Ok(())
    }

    pub(super) async fn mailbox_message_id_already_recorded(
        &self,
        message_id: &str,
    ) -> Result<bool, DbErr> {
        let message_id = message_id.trim();
        if message_id.is_empty() {
            return Ok(false);
        }
        original_email::Entity::find()
            .filter(original_email::Column::MessageId.eq(Some(message_id.to_string())))
            .one(&self.db)
            .await
            .map(|row| row.is_some())
    }

    pub async fn find_mailbox_reply_targets_by_message_ids(
        &self,
        message_ids: &[String],
    ) -> Result<Vec<MailboxReplyTargetRecord>, DbErr> {
        let mut targets = Vec::new();
        let mut seen = HashSet::new();
        for message_id in message_ids {
            let message_id = message_id.trim();
            if message_id.is_empty() {
                continue;
            }
            let rows = original_email::Entity::find()
                .filter(original_email::Column::MessageId.eq(Some(message_id.to_string())))
                .order_by_asc(original_email::Column::Id)
                .all(&self.db)
                .await?;
            let had_exact_rows = !rows.is_empty();
            for row in rows {
                let Some(resource_type) = row.resource_type else {
                    continue;
                };
                let Some(resource_id) = row
                    .resource_id
                    .as_deref()
                    .and_then(|value| value.parse::<i64>().ok())
                else {
                    continue;
                };
                if seen.insert((resource_type.clone(), resource_id)) {
                    targets.push(MailboxReplyTargetRecord {
                        resource_id,
                        resource_type,
                    });
                }
            }
            if had_exact_rows {
                continue;
            }
            if let Some(target) = self
                .mailbox_reply_target_from_message_id_left(message_id)
                .await?
            {
                if seen.insert((target.resource_type.clone(), target.resource_id)) {
                    targets.push(target);
                }
            }
        }

        Ok(targets)
    }

    pub async fn find_mailbox_reply_targets_by_details(
        &self,
        details: &[String],
    ) -> Result<Vec<MailboxReplyTargetRecord>, DbErr> {
        let mut targets = Vec::new();
        let mut seen = HashSet::new();
        for detail in details {
            let Some(resource_path) = mailbox_resource_path_from_detail_local(detail.trim()) else {
                continue;
            };
            let Some((resource_type, resource_id)) = resource_path.split_once('/') else {
                continue;
            };
            let resource_type = mailbox_canonical_resource_type(resource_type);
            let Some(resource_id) = resource_id.parse::<i64>().ok() else {
                continue;
            };
            if !self
                .mailbox_reply_resource_exists(&resource_type, resource_id)
                .await?
            {
                continue;
            }
            if seen.insert((resource_type.clone(), resource_id)) {
                targets.push(MailboxReplyTargetRecord {
                    resource_id,
                    resource_type,
                });
            }
        }
        Ok(targets)
    }

    pub async fn plan_mailbox_resource_actions(
        &self,
        projects: &[ProjectRecord],
        targets: &[MailboxReplyTargetRecord],
    ) -> Result<Vec<MailboxResourceActionRecord>, DbErr> {
        let mut actions = Vec::new();
        for project in projects {
            let mut handled = false;
            for target in targets {
                let Some(action) = self.mailbox_action_for_target(project, target).await? else {
                    continue;
                };
                handled = true;
                actions.push(action);
            }
            if !handled {
                actions.push(MailboxResourceActionRecord {
                    action: "create_issue".to_string(),
                    owner_name: project.owner_name.clone(),
                    project_name: project.project_name.clone(),
                    resource_id: None,
                    resource_type: None,
                });
            }
        }
        Ok(actions)
    }

    pub async fn execute_mailbox_resource_actions(
        &self,
        actions: &[MailboxResourceActionRecord],
        input: MailboxActionExecutionInput,
    ) -> Result<Vec<MailboxActionExecutionRecord>, DbErr> {
        let (guard, transaction, started_at) = self.begin_serialized_write().await?;
        let repository = self.with_transaction(&transaction);
        let mut records = Vec::new();
        let mut message_id_recorded = false;
        for action in actions {
            if action.action == "ignore_resource" {
                records.push(mailbox_execution_record(action, "ignored"));
                continue;
            }
            let mut attachment_ids = Vec::with_capacity(input.attachments.len());
            let mut related = HashMap::new();
            for file in &input.attachments {
                let stored = repository
                    .create_user_attachment_upload(
                        input.actor_id,
                        &input.actor_login_id,
                        &file.filename,
                        &file.mime_type,
                        file.size,
                        &file.hash,
                    )
                    .await?;
                attachment_ids.push(stored.id);
                if let Some(cid) = &file.content_id {
                    related.insert(
                        cid.trim()
                            .trim_start_matches('<')
                            .trim_end_matches('>')
                            .to_string(),
                        format!(
                            "{}/files/{}",
                            input.base_path.trim_end_matches('/'),
                            stored.id
                        ),
                    );
                }
            }
            let body = if input
                .content_type
                .split(';')
                .next()
                .unwrap_or_default()
                .trim()
                .eq_ignore_ascii_case("text/html")
            {
                mailbox_replace_cid_urls(&input.body_markdown, &related)
            } else {
                input.body_markdown.clone()
            };
            let message_id = if message_id_recorded {
                String::new()
            } else {
                input.message_id.clone()
            };
            let created = match action.action.as_str() {
                "create_issue" => repository
                    .create_issue_via_email(CreateIssueViaEmailInput {
                        actor_display_name: input.actor_display_name.clone(),
                        actor_id: input.actor_id,
                        actor_login_id: input.actor_login_id.clone(),
                        body_markdown: body.clone(),
                        message_id,
                        owner_name: action.owner_name.clone(),
                        project_name: action.project_name.clone(),
                        title: input.title.clone(),
                    })
                    .await?
                    .map(|issue| (ISSUE_ATTACHMENT_CONTAINER, issue.id)),
                "create_issue_comment" => {
                    if let Some(issue_number) =
                        repository.mailbox_action_issue_number(action).await?
                    {
                        repository
                            .create_issue_comment_via_email(CreateIssueCommentViaEmailInput {
                                actor_display_name: input.actor_display_name.clone(),
                                actor_id: input.actor_id,
                                actor_login_id: input.actor_login_id.clone(),
                                contents_markdown: body.clone(),
                                issue_number,
                                message_id,
                                owner_name: action.owner_name.clone(),
                                project_name: action.project_name.clone(),
                            })
                            .await?
                            .and_then(|issue| {
                                issue
                                    .comments
                                    .into_iter()
                                    .filter(|comment| {
                                        comment.author_id == Some(input.actor_id)
                                            && comment.contents_markdown == body
                                    })
                                    .max_by_key(|comment| comment.id)
                                    .map(|comment| (ISSUE_COMMENT_ATTACHMENT_CONTAINER, comment.id))
                            })
                    } else {
                        None
                    }
                }
                "create_posting_comment" => {
                    if let Some(post_number) = repository.mailbox_action_post_number(action).await?
                    {
                        repository
                            .create_posting_comment_via_email(CreatePostingCommentViaEmailInput {
                                actor_display_name: input.actor_display_name.clone(),
                                actor_id: input.actor_id,
                                actor_login_id: input.actor_login_id.clone(),
                                contents_markdown: body.clone(),
                                message_id,
                                owner_name: action.owner_name.clone(),
                                post_number,
                                project_name: action.project_name.clone(),
                            })
                            .await?
                            .and_then(|posting| {
                                posting
                                    .comments
                                    .into_iter()
                                    .filter(|comment| {
                                        comment.author_id == Some(input.actor_id)
                                            && comment.contents_markdown == body
                                    })
                                    .max_by_key(|comment| comment.id)
                                    .map(|comment| (BOARD_COMMENT_ATTACHMENT_CONTAINER, comment.id))
                            })
                    } else {
                        None
                    }
                }
                "create_review_comment" => {
                    if let Some(thread_id) = action.resource_id {
                        repository
                            .create_review_comment_via_email(CreateReviewCommentViaEmailInput {
                                actor_display_name: input.actor_display_name.clone(),
                                actor_id: input.actor_id,
                                actor_login_id: input.actor_login_id.clone(),
                                contents_markdown: body.clone(),
                                message_id,
                                thread_id,
                            })
                            .await?
                            .and_then(|thread| {
                                thread
                                    .comments
                                    .into_iter()
                                    .filter(|comment| {
                                        comment.author_id == Some(input.actor_id)
                                            && comment.contents_markdown == body
                                    })
                                    .max_by_key(|comment| comment.id)
                                    .map(|comment| {
                                        (REVIEW_COMMENT_ATTACHMENT_CONTAINER, comment.id)
                                    })
                            })
                    } else {
                        None
                    }
                }
                _ => {
                    if !attachment_ids.is_empty() {
                        return Err(DbErr::Custom(
                            "unsupported mailbox attachment target".into(),
                        ));
                    }
                    records.push(mailbox_execution_record(action, "unsupported"));
                    continue;
                }
            };
            if let Some((container, id)) = created {
                repository
                    .sync_attachments(container, id, &attachment_ids, Some(input.actor_id))
                    .await?;
                message_id_recorded = true;
                records.push(mailbox_execution_record(action, "created"));
            } else if !attachment_ids.is_empty() {
                return Err(DbErr::Custom("mailbox attachment target is missing".into()));
            } else {
                records.push(mailbox_execution_record(action, "missing_target"));
            }
        }
        self.commit_serialized_write(transaction, guard, started_at)
            .await?;
        Ok(records)
    }

    pub async fn process_mailbox_normalized_message(
        &self,
        input: MailboxNormalizedMessageInput,
    ) -> Result<MailboxNormalizedMessageResult, DbErr> {
        let (guard, transaction, started_at) = self.begin_serialized_write().await?;
        let result = self
            .with_transaction(&transaction)
            .process_mailbox_normalized_message_in_transaction(input)
            .await?;
        self.commit_serialized_write(transaction, guard, started_at)
            .await?;
        Ok(result)
    }

    async fn process_mailbox_normalized_message_in_transaction(
        &self,
        input: MailboxNormalizedMessageInput,
    ) -> Result<MailboxNormalizedMessageResult, DbErr> {
        let Some(sender) = self
            .find_mailbox_sender_by_from_addresses(&input.from_addresses)
            .await?
        else {
            return Ok(MailboxNormalizedMessageResult {
                actions: Vec::new(),
                sender_id: None,
                status: "no_sender".to_string(),
            });
        };
        if self
            .mailbox_message_id_already_recorded(&input.message_id)
            .await?
        {
            return Ok(MailboxNormalizedMessageResult {
                actions: Vec::new(),
                sender_id: Some(sender.id),
                status: "duplicate".to_string(),
            });
        }
        let projects = self
            .find_mailbox_project_targets_by_details(sender.id, &input.recipient_details)
            .await?;
        if projects.is_empty() {
            return Ok(MailboxNormalizedMessageResult {
                actions: Vec::new(),
                sender_id: Some(sender.id),
                status: "no_project".to_string(),
            });
        }

        let mut targets = self
            .find_mailbox_reply_targets_by_message_ids(&input.reply_message_ids)
            .await?;
        let mut seen_targets: HashSet<(String, i64)> = targets
            .iter()
            .map(|target| {
                (
                    mailbox_canonical_resource_type(&target.resource_type),
                    target.resource_id,
                )
            })
            .collect();
        for target in self
            .find_mailbox_reply_targets_by_details(&input.recipient_details)
            .await?
        {
            if seen_targets.insert((
                mailbox_canonical_resource_type(&target.resource_type),
                target.resource_id,
            )) {
                targets.push(target);
            }
        }

        let actions = self
            .plan_mailbox_resource_actions(&projects, &targets)
            .await?;
        let executed = self
            .execute_mailbox_resource_actions(
                &actions,
                MailboxActionExecutionInput {
                    actor_display_name: sender.display_name.clone(),
                    actor_id: sender.id,
                    actor_login_id: sender.login_id.clone(),
                    attachments: input.attachments,
                    base_path: input.base_path,
                    body_markdown: input.body_markdown,
                    content_type: input.content_type,
                    message_id: input.message_id,
                    title: input.title,
                },
            )
            .await?;
        let status = if executed.is_empty() {
            "no_action"
        } else {
            "processed"
        };
        Ok(MailboxNormalizedMessageResult {
            actions: executed,
            sender_id: Some(sender.id),
            status: status.to_string(),
        })
    }

    pub(super) async fn mailbox_action_issue_number(
        &self,
        action: &MailboxResourceActionRecord,
    ) -> Result<Option<i64>, DbErr> {
        let Some(resource_id) = action.resource_id else {
            return Ok(None);
        };
        match action.resource_type.as_deref() {
            Some("issue_post") => Ok(issue::Entity::find_by_id(resource_id)
                .one(&self.db)
                .await?
                .and_then(|row| row.number)),
            Some("issue_comment") => {
                let Some(comment) = issue_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(issue_id) = comment.issue_id else {
                    return Ok(None);
                };
                Ok(issue::Entity::find_by_id(issue_id)
                    .one(&self.db)
                    .await?
                    .and_then(|row| row.number))
            }
            _ => Ok(None),
        }
    }

    pub(super) async fn mailbox_action_post_number(
        &self,
        action: &MailboxResourceActionRecord,
    ) -> Result<Option<i64>, DbErr> {
        let Some(resource_id) = action.resource_id else {
            return Ok(None);
        };
        match action.resource_type.as_deref() {
            Some("board_post") => Ok(posting::Entity::find_by_id(resource_id)
                .one(&self.db)
                .await?
                .and_then(|row| row.number)),
            Some("nonissue_comment") => {
                let Some(comment) = posting_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(posting_id) = comment.posting_id else {
                    return Ok(None);
                };
                Ok(posting::Entity::find_by_id(posting_id)
                    .one(&self.db)
                    .await?
                    .and_then(|row| row.number))
            }
            _ => Ok(None),
        }
    }

    pub(super) async fn mailbox_action_for_target(
        &self,
        project: &ProjectRecord,
        target: &MailboxReplyTargetRecord,
    ) -> Result<Option<MailboxResourceActionRecord>, DbErr> {
        let Some((project_id, resource_type, resource_id, action)) =
            self.mailbox_target_action_metadata(target).await?
        else {
            return Ok(None);
        };
        if project_id != project.id {
            return Ok(None);
        }
        Ok(Some(MailboxResourceActionRecord {
            action,
            owner_name: project.owner_name.clone(),
            project_name: project.project_name.clone(),
            resource_id: Some(resource_id),
            resource_type: Some(resource_type),
        }))
    }

    pub(super) async fn mailbox_target_action_metadata(
        &self,
        target: &MailboxReplyTargetRecord,
    ) -> Result<Option<(i64, String, i64, String)>, DbErr> {
        let resource_type = mailbox_canonical_resource_type(&target.resource_type);
        match resource_type.as_str() {
            "issue_post" => {
                let Some(row) = issue::Entity::find_by_id(target.resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(project_id) = row.project_id else {
                    return Ok(None);
                };
                Ok(Some((
                    project_id,
                    resource_type,
                    target.resource_id,
                    "create_issue_comment".to_string(),
                )))
            }
            "issue_comment" => {
                let Some(row) = issue_comment::Entity::find_by_id(target.resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                Ok(Some((
                    row.project_id,
                    resource_type,
                    target.resource_id,
                    "create_issue_comment".to_string(),
                )))
            }
            "board_post" => {
                let Some(row) = posting::Entity::find_by_id(target.resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(project_id) = row.project_id else {
                    return Ok(None);
                };
                Ok(Some((
                    project_id,
                    resource_type,
                    target.resource_id,
                    "create_posting_comment".to_string(),
                )))
            }
            "nonissue_comment" => {
                let Some(row) = posting_comment::Entity::find_by_id(target.resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                Ok(Some((
                    row.project_id,
                    resource_type,
                    target.resource_id,
                    "create_posting_comment".to_string(),
                )))
            }
            "comment_thread" => {
                let Some(row) = comment_thread::Entity::find_by_id(target.resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(project_id) = row.project_id else {
                    return Ok(None);
                };
                Ok(Some((
                    project_id,
                    resource_type,
                    target.resource_id,
                    "create_review_comment".to_string(),
                )))
            }
            "review_comment" => {
                let Some(row) = review_comment::Entity::find_by_id(target.resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(thread_id) = row.thread_id else {
                    return Ok(None);
                };
                let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(project_id) = thread.project_id else {
                    return Ok(None);
                };
                Ok(Some((
                    project_id,
                    "comment_thread".to_string(),
                    thread_id,
                    "create_review_comment".to_string(),
                )))
            }
            "pull_request" => {
                let Some(row) = pull_request::Entity::find_by_id(target.resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(project_id) = row.to_project_id else {
                    return Ok(None);
                };
                Ok(Some((
                    project_id,
                    resource_type,
                    target.resource_id,
                    "ignore_resource".to_string(),
                )))
            }
            _ => Ok(None),
        }
    }

    pub(super) async fn mailbox_reply_target_from_message_id_left(
        &self,
        message_id: &str,
    ) -> Result<Option<MailboxReplyTargetRecord>, DbErr> {
        let Some(left) = mailbox_message_id_left_local(message_id) else {
            return Ok(None);
        };
        let Some((resource_type, resource_id)) = left.split_once('/') else {
            return Ok(None);
        };
        let resource_type = mailbox_canonical_resource_type(resource_type);
        let Some(resource_id) = resource_id.parse::<i64>().ok() else {
            return Ok(None);
        };
        if !self
            .mailbox_reply_resource_exists(&resource_type, resource_id)
            .await?
        {
            return Ok(None);
        }

        Ok(Some(MailboxReplyTargetRecord {
            resource_id,
            resource_type,
        }))
    }

    pub(super) async fn mailbox_reply_resource_exists(
        &self,
        resource_type: &str,
        resource_id: i64,
    ) -> Result<bool, DbErr> {
        match resource_type {
            "issue_post" => Ok(issue::Entity::find_by_id(resource_id)
                .one(&self.db)
                .await?
                .is_some()),
            "issue_comment" => Ok(issue_comment::Entity::find_by_id(resource_id)
                .one(&self.db)
                .await?
                .is_some()),
            "board_post" => Ok(posting::Entity::find_by_id(resource_id)
                .one(&self.db)
                .await?
                .is_some()),
            "nonissue_comment" => Ok(posting_comment::Entity::find_by_id(resource_id)
                .one(&self.db)
                .await?
                .is_some()),
            "comment_thread" => Ok(comment_thread::Entity::find_by_id(resource_id)
                .one(&self.db)
                .await?
                .is_some()),
            "review_comment" => Ok(review_comment::Entity::find_by_id(resource_id)
                .one(&self.db)
                .await?
                .is_some()),
            "pull_request" => Ok(pull_request::Entity::find_by_id(resource_id)
                .one(&self.db)
                .await?
                .is_some()),
            _ => Ok(false),
        }
    }
}

fn mailbox_replace_cid_urls(html: &str, related: &HashMap<String, String>) -> String {
    if related.is_empty() {
        return html.to_string();
    }
    let mut rendered = String::with_capacity(html.len());
    let bytes = html.as_bytes();
    let mut cursor = 0;
    let mut index = 0;
    let mut in_tag = false;
    while index < bytes.len() {
        match bytes[index] {
            b'<' => in_tag = true,
            b'>' => in_tag = false,
            b'=' if in_tag => {
                let name_end = html[..index].trim_end().len();
                let name_start = html[..name_end]
                    .rfind(|ch: char| ch.is_ascii_whitespace() || ch == '<')
                    .map_or(0, |position| position + 1);
                let name = &html[name_start..name_end];
                index += 1;
                while bytes.get(index).is_some_and(u8::is_ascii_whitespace) {
                    index += 1;
                }
                let Some(&first) = bytes.get(index) else {
                    break;
                };
                let quoted = first == b'"' || first == b'\'';
                let start = index + usize::from(quoted);
                let mut end = start;
                while end < bytes.len()
                    && if quoted {
                        bytes[end] != first
                    } else {
                        !bytes[end].is_ascii_whitespace() && bytes[end] != b'>'
                    }
                {
                    end += 1;
                }
                let value = html[start..end].trim();
                if (name.eq_ignore_ascii_case("src") || name.eq_ignore_ascii_case("href"))
                    && value
                        .get(..4)
                        .is_some_and(|scheme| scheme.eq_ignore_ascii_case("cid:"))
                {
                    if let Some(url) = related.get(&value[4..]) {
                        rendered.push_str(&html[cursor..start]);
                        rendered.push_str(url);
                        cursor = end;
                    }
                }
                index = end + usize::from(quoted && end < bytes.len());
                continue;
            }
            _ => {}
        }
        index += 1;
    }
    rendered.push_str(&html[cursor..]);
    rendered
}
