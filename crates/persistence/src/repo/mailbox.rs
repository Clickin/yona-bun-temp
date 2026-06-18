impl AppRepository {
    async fn record_original_email(
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

    async fn mailbox_message_id_already_recorded(&self, message_id: &str) -> Result<bool, DbErr> {
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
        let mut records = Vec::new();
        let mut message_id_recorded = false;
        for action in actions {
            let message_id = if message_id_recorded {
                String::new()
            } else {
                input.message_id.clone()
            };
            let status = match action.action.as_str() {
                "create_issue" => self
                    .create_issue_via_email(CreateIssueViaEmailInput {
                        actor_display_name: input.actor_display_name.clone(),
                        actor_id: input.actor_id,
                        actor_login_id: input.actor_login_id.clone(),
                        body_markdown: input.body_markdown.clone(),
                        message_id,
                        owner_name: action.owner_name.clone(),
                        project_name: action.project_name.clone(),
                        title: input.title.clone(),
                    })
                    .await?
                    .map(|_| "created")
                    .unwrap_or("missing_target"),
                "create_issue_comment" => {
                    let Some(issue_number) = self.mailbox_action_issue_number(action).await? else {
                        records.push(mailbox_execution_record(action, "missing_target"));
                        continue;
                    };
                    self.create_issue_comment_via_email(CreateIssueCommentViaEmailInput {
                        actor_display_name: input.actor_display_name.clone(),
                        actor_id: input.actor_id,
                        actor_login_id: input.actor_login_id.clone(),
                        contents_markdown: input.body_markdown.clone(),
                        issue_number,
                        message_id,
                        owner_name: action.owner_name.clone(),
                        project_name: action.project_name.clone(),
                    })
                    .await?
                    .map(|_| "created")
                    .unwrap_or("missing_target")
                }
                "create_posting_comment" => {
                    let Some(post_number) = self.mailbox_action_post_number(action).await? else {
                        records.push(mailbox_execution_record(action, "missing_target"));
                        continue;
                    };
                    self.create_posting_comment_via_email(CreatePostingCommentViaEmailInput {
                        actor_display_name: input.actor_display_name.clone(),
                        actor_id: input.actor_id,
                        actor_login_id: input.actor_login_id.clone(),
                        contents_markdown: input.body_markdown.clone(),
                        message_id,
                        owner_name: action.owner_name.clone(),
                        post_number,
                        project_name: action.project_name.clone(),
                    })
                    .await?
                    .map(|_| "created")
                    .unwrap_or("missing_target")
                }
                "create_review_comment" => {
                    let Some(thread_id) = action.resource_id else {
                        records.push(mailbox_execution_record(action, "missing_target"));
                        continue;
                    };
                    self.create_review_comment_via_email(CreateReviewCommentViaEmailInput {
                        actor_display_name: input.actor_display_name.clone(),
                        actor_id: input.actor_id,
                        actor_login_id: input.actor_login_id.clone(),
                        contents_markdown: input.body_markdown.clone(),
                        message_id,
                        thread_id,
                    })
                    .await?
                    .map(|_| "created")
                    .unwrap_or("missing_target")
                }
                "ignore_resource" => "ignored",
                _ => "unsupported",
            };
            if status == "created" && !message_id_recorded {
                message_id_recorded = true;
            }
            records.push(mailbox_execution_record(action, status));
        }
        Ok(records)
    }

    pub async fn process_mailbox_normalized_message(
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
                    body_markdown: input.body_markdown,
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

    async fn mailbox_action_issue_number(
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

    async fn mailbox_action_post_number(
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

    async fn mailbox_action_for_target(
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

    async fn mailbox_target_action_metadata(
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

    async fn mailbox_reply_target_from_message_id_left(
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

    async fn mailbox_reply_resource_exists(
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
