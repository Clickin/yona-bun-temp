use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn update_issue_state(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        state: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        self.update_issue_state_for_actor(owner_name, project_name, issue_number, state, None, "")
            .await
    }

    pub async fn update_issue_state_as_actor(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        state: &str,
        actor_id: i64,
        actor_login_id: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        self.update_issue_state_for_actor(
            owner_name,
            project_name,
            issue_number,
            state,
            Some(actor_id),
            actor_login_id,
        )
        .await
    }

    pub(super) async fn update_issue_state_for_actor(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        state: &str,
        actor_id: Option<i64>,
        actor_login_id: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let old_state = issue_state_from_raw(model.state);
        let new_state = normalize_identity(state);
        let mut active = issue::ActiveModel::from(model);
        active.state = Set(Some(issue_state_to_raw(&new_state)));
        active.updated_date = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        if old_state != new_state && !actor_login_id.trim().is_empty() {
            self.create_issue_event(
                updated.id,
                actor_login_id,
                "ISSUE_STATE_CHANGED",
                &old_state,
                &new_state,
            )
            .await?;
            if let Some(actor_id) = actor_id {
                let receiver_ids = self
                    .issue_notification_receiver_ids(
                        &project_record,
                        &updated,
                        "ISSUE_STATE_CHANGED",
                    )
                    .await?;
                self.create_notification_event_for_receivers(
                    actor_id,
                    "issue",
                    &updated.id.to_string(),
                    "ISSUE_STATE_CHANGED",
                    &old_state,
                    &new_state,
                    &receiver_ids,
                )
                .await?;
            }
        }

        self.issue_record_from_model(updated, &project_record, None)
            .await
            .map(Some)
    }

    pub async fn create_issue(
        &self,
        input: CreateIssueInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let issue_number = self.next_issue_number(project_record.id).await?;
        let is_draft = input.values.is_draft;
        let assignee_id = self
            .resolve_assignee_id(project_record.id, input.values.assignee_login_id.as_deref())
            .await?;
        let parent_id = self
            .resolve_issue_parent_id(project_record.id, input.values.parent_issue_id, None)
            .await?;
        let now = current_datetime();
        let created = issue::ActiveModel {
            id: NotSet,
            title: Set(Some(input.values.title.trim().to_string())),
            created_date: Set(Some(now)),
            updated_date: Set(Some(now)),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
            author_name: Set(Some(input.actor_display_name)),
            project_id: Set(Some(project_record.id)),
            number: Set(Some(issue_number)),
            num_of_comments: Set(Some(0)),
            state: Set(Some(issue_state_to_raw(if is_draft {
                "draft"
            } else {
                "open"
            }))),
            due_date: Set(input.values.due_date),
            milestone_id: Set(input.values.milestone_id.filter(|value| *value > 0)),
            assignee_id: Set(assignee_id),
            parent_id: Set(parent_id),
            weight: Set(None),
            updated_by_author_id: Set(Some(input.actor_id)),
            is_draft: Set(Some(if is_draft { 1 } else { 0 })),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("issue", "body", created.id, &input.values.body_markdown)
            .await?;
        if is_draft {
            let mentioned_user_ids = self
                .mentioned_active_user_ids(&input.values.body_markdown)
                .await?;
            self.sync_mentions_for_resource("issue_post", created.id, mentioned_user_ids)
                .await?;
        } else {
            self.sync_mentions_and_notify(
                input.actor_id,
                "issue_post",
                created.id,
                &input.values.body_markdown,
                "NEW_ISSUE",
                "",
                &input.values.body_markdown,
            )
            .await?;
        }

        let mut project_active = project::ActiveModel {
            id: Set(project_record.id),
            ..Default::default()
        };
        project_active.last_issue_number = Set(Some(issue_number));
        project_active.update(&self.db).await?;

        self.replace_issue_labels(created.id, project_record.id, &input.values.label_ids)
            .await?;
        self.bind_attachments(
            ISSUE_ATTACHMENT_CONTAINER,
            created.id,
            &input.values.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.watch_issue(created.id, input.actor_id).await?;
        self.issue_record_from_model(created, &project_record, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn create_issue_via_email(
        &self,
        input: CreateIssueViaEmailInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let issue = self
            .create_issue(CreateIssueInput {
                actor_display_name: input.actor_display_name,
                actor_id: input.actor_id,
                actor_login_id: input.actor_login_id,
                owner_name: input.owner_name,
                project_name: input.project_name,
                values: IssueMutationInput {
                    assignee_login_id: None,
                    attachment_ids: Vec::new(),
                    body_markdown: input.body_markdown,
                    due_date: None,
                    label_ids: Vec::new(),
                    is_draft: false,
                    is_publish: false,
                    milestone_id: None,
                    parent_issue_id: None,
                    title: input.title,
                },
            })
            .await?;
        if let Some(issue) = issue {
            self.record_original_email(ISSUE_ATTACHMENT_CONTAINER, issue.id, &input.message_id)
                .await?;
            Ok(Some(issue))
        } else {
            Ok(None)
        }
    }

    pub async fn update_issue(
        &self,
        input: UpdateIssueInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_issue_model(&input.owner_name, &input.project_name, input.issue_number)
            .await?
        else {
            return Ok(None);
        };
        let assignee_id = self
            .resolve_assignee_id(project_record.id, input.values.assignee_login_id.as_deref())
            .await?;
        let parent_id = self
            .resolve_issue_parent_id(
                project_record.id,
                input.values.parent_issue_id,
                Some(model.id),
            )
            .await?;
        let old_state = issue_state_from_raw(model.state);
        let was_draft = model.is_draft.unwrap_or_default() != 0;
        let old_assignee = model.assignee_id;
        let old_milestone = model.milestone_id;
        let old_body = self.read_text_column("issue", "body", model.id).await?;
        let next_history = append_posting_history(
            model.history.as_deref(),
            &old_body,
            &input.values.body_markdown,
        );
        let actor_id = self
            .find_user_by_login_id(&input.actor_login_id)
            .await?
            .map(|user| user.id)
            .unwrap_or_default();
        let mut active = issue::ActiveModel::from(model);
        active.title = Set(Some(input.values.title.trim().to_string()));
        active.assignee_id = Set(assignee_id);
        active.due_date = Set(input.values.due_date);
        active.milestone_id = Set(input.values.milestone_id.filter(|value| *value > 0));
        active.parent_id = Set(parent_id);
        if input.values.is_publish {
            active.created_date = Set(Some(current_datetime()));
            active.is_draft = Set(Some(0));
            active.state = Set(Some(issue_state_to_raw("open")));
            if was_draft {
                let next_issue_number = self.next_issue_number(project_record.id).await?;
                active.number = Set(Some(next_issue_number));
            }
        } else if input.values.is_draft {
            active.is_draft = Set(Some(1));
            active.state = Set(Some(issue_state_to_raw("draft")));
        }
        active.updated_date = Set(Some(current_datetime()));
        let mut updated = active.update(&self.db).await?;
        self.write_text_column("issue", "body", updated.id, &input.values.body_markdown)
            .await?;
        self.write_text_column(
            "issue",
            "history",
            updated.id,
            next_history.as_deref().unwrap_or(""),
        )
        .await?;
        updated.history = next_history;
        if updated.is_draft.unwrap_or_default() != 0 {
            let mentioned_user_ids = self
                .mentioned_active_user_ids(&input.values.body_markdown)
                .await?;
            self.sync_mentions_for_resource("issue_post", updated.id, mentioned_user_ids)
                .await?;
        } else if input.values.is_publish && was_draft {
            self.sync_mentions_and_notify(
                actor_id,
                "issue_post",
                updated.id,
                &input.values.body_markdown,
                "NEW_ISSUE",
                "",
                &input.values.body_markdown,
            )
            .await?;
            let mut project_active = project::ActiveModel {
                id: Set(project_record.id),
                ..Default::default()
            };
            project_active.last_issue_number = Set(updated.number);
            project_active.update(&self.db).await?;
        } else {
            self.sync_mentions_and_notify(
                actor_id,
                "issue_post",
                updated.id,
                &input.values.body_markdown,
                "ISSUE_BODY_CHANGED",
                &old_body,
                &input.values.body_markdown,
            )
            .await?;
        }

        self.replace_issue_labels(updated.id, project_record.id, &input.values.label_ids)
            .await?;
        self.sync_attachments(
            ISSUE_ATTACHMENT_CONTAINER,
            updated.id,
            &input.values.attachment_ids,
            Some(actor_id),
        )
        .await?;
        if old_assignee != updated.assignee_id {
            self.create_issue_event(
                updated.id,
                &input.actor_login_id,
                "ISSUE_ASSIGNEE_CHANGED",
                &old_assignee
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                &updated
                    .assignee_id
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
            )
            .await?;
        }
        if old_milestone != updated.milestone_id {
            self.create_issue_event(
                updated.id,
                &input.actor_login_id,
                "ISSUE_MILESTONE_CHANGED",
                &old_milestone
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                &updated
                    .milestone_id
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
            )
            .await?;
        }
        let _ = old_state;

        self.issue_record_from_model(updated, &project_record, None)
            .await
            .map(Some)
    }

    pub async fn update_issue_body(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        actor_id: i64,
        _actor_login_id: &str,
        body_markdown: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let old_body = self.read_text_column("issue", "body", model.id).await?;
        let next_history =
            append_posting_history(model.history.as_deref(), &old_body, body_markdown);
        let mut active = issue::ActiveModel::from(model);
        active.updated_date = Set(Some(current_datetime()));
        let mut updated = active.update(&self.db).await?;
        self.write_text_column("issue", "body", updated.id, body_markdown)
            .await?;
        self.write_text_column(
            "issue",
            "history",
            updated.id,
            next_history.as_deref().unwrap_or(""),
        )
        .await?;
        updated.history = next_history;
        self.sync_mentions_and_notify(
            actor_id,
            "issue_post",
            updated.id,
            body_markdown,
            "ISSUE_BODY_CHANGED",
            &old_body,
            body_markdown,
        )
        .await?;
        self.issue_record_from_model(updated, &project_record, Some(actor_id))
            .await
            .map(Some)
    }

    pub async fn delete_issue(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) -> Result<bool, DbErr> {
        let Some((_project, model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(false);
        };
        issue_issue_label::Entity::delete_many()
            .filter(issue_issue_label::Column::IssueId.eq(model.id))
            .exec(&self.db)
            .await?;
        issue_event::Entity::delete_many()
            .filter(issue_event::Column::IssueId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        issue_voter::Entity::delete_many()
            .filter(issue_voter::Column::IssueId.eq(model.id))
            .exec(&self.db)
            .await?;
        for comment in issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(model.id)))
            .all(&self.db)
            .await?
        {
            issue_comment_voter::Entity::delete_many()
                .filter(issue_comment_voter::Column::IssueCommentId.eq(comment.id))
                .exec(&self.db)
                .await?;
        }
        issue_comment::Entity::delete_many()
            .filter(issue_comment::Column::IssueId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(model.id.to_string())))
            .exec(&self.db)
            .await?;
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType.is_in(
                    attachment_container_aliases(ISSUE_ATTACHMENT_CONTAINER)
                        .into_iter()
                        .map(Some),
                ),
            )
            .filter(attachment::Column::ContainerId.eq(model.id))
            .exec(&self.db)
            .await?;
        issue::Entity::delete_by_id(model.id).exec(&self.db).await?;
        Ok(true)
    }

    pub async fn watch_issue(&self, issue_id: i64, user_id: i64) -> Result<(), DbErr> {
        if watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
            .one(&self.db)
            .await?
            .is_none()
        {
            watch::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                resource_type: Set(Some("ISSUE".to_string())),
                resource_id: Set(Some(issue_id.to_string())),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn unwatch_issue(&self, issue_id: i64, user_id: i64) -> Result<(), DbErr> {
        watch::Entity::delete_many()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
            .exec(&self.db)
            .await?;
        Ok(())
    }
}
