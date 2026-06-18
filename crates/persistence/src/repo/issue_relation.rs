impl AppRepository {
    pub async fn vote_issue(&self, issue_id: i64, user_id: i64) -> Result<(), DbErr> {
        if issue_voter::Entity::find_by_id((issue_id, user_id))
            .one(&self.db)
            .await?
            .is_none()
        {
            issue_voter::ActiveModel {
                issue_id: Set(issue_id),
                user_id: Set(user_id),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn unvote_issue(&self, issue_id: i64, user_id: i64) -> Result<(), DbErr> {
        issue_voter::Entity::delete_by_id((issue_id, user_id))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn vote_issue_comment(&self, comment_id: i64, user_id: i64) -> Result<(), DbErr> {
        if issue_comment_voter::Entity::find_by_id((comment_id, user_id))
            .one(&self.db)
            .await?
            .is_none()
        {
            issue_comment_voter::ActiveModel {
                issue_comment_id: Set(comment_id),
                user_id: Set(user_id),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn unvote_issue_comment(&self, comment_id: i64, user_id: i64) -> Result<bool, DbErr> {
        let result = issue_comment_voter::Entity::delete_by_id((comment_id, user_id))
            .exec(&self.db)
            .await?;
        Ok(result.rows_affected > 0)
    }

    pub async fn assign_issue(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        assignee_login_id: Option<&str>,
        actor_login_id: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let next_assignee_id = self
            .resolve_assignee_id(project_record.id, assignee_login_id)
            .await?;
        let old_assignee_id = issue_model.assignee_id;
        let mut active = issue::ActiveModel::from(issue_model);
        active.assignee_id = Set(next_assignee_id);
        active.updated_date = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        if old_assignee_id != updated.assignee_id {
            self.create_issue_event(
                updated.id,
                actor_login_id,
                "ISSUE_ASSIGNEE_CHANGED",
                &old_assignee_id
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                &updated
                    .assignee_id
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
            )
            .await?;
        }
        self.issue_record_from_model(updated, &project_record, None)
            .await
            .map(Some)
    }

    pub async fn mass_update_issues(
        &self,
        input: MassUpdateIssuesInput,
        actor_id: i64,
        actor_login_id: &str,
    ) -> Result<Vec<IssueRecord>, DbErr> {
        let mut targets = Vec::new();
        for issue_number in input.issue_numbers.iter().copied() {
            let Some((project_record, model)) = self
                .read_project_issue_model(&input.owner_name, &input.project_name, issue_number)
                .await?
            else {
                return Err(DbErr::Custom("Issue not found.".to_string()));
            };
            let next_assignee_id = if input.assignee_update {
                self.resolve_assignee_id(project_record.id, input.assignee_login_id.as_deref())
                    .await?
            } else {
                model.assignee_id
            };
            for label_id in input
                .add_label_ids
                .iter()
                .chain(input.remove_label_ids.iter())
            {
                if !self
                    .label_belongs_to_project(project_record.id, *label_id)
                    .await?
                {
                    return Err(DbErr::Custom("Issue label not found.".to_string()));
                }
            }
            targets.push((project_record, model, next_assignee_id));
        }

        let requested_state = input
            .state
            .as_deref()
            .map(normalize_identity)
            .filter(|value| !value.is_empty());
        let mut state_changes = Vec::new();
        let txn = self.db.begin().await?;
        for (project_record, model, next_assignee_id) in &targets {
            let previous_state = issue_state_from_raw(model.state);
            let was_draft = model.is_draft.unwrap_or_default() != 0;
            let mut active = issue::ActiveModel::from(model.clone());
            if let Some(state) = requested_state.as_deref() {
                active.state = Set(Some(issue_state_to_raw(state)));
            }
            if input.assignee_update {
                active.assignee_id = Set(*next_assignee_id);
            }
            if input.milestone_update {
                active.milestone_id = Set(input.milestone_id.filter(|value| *value > 0));
            }
            active.updated_date = Set(Some(current_datetime()));
            let updated_model = active.update(&txn).await?;
            for label_id in &input.add_label_ids {
                if issue_issue_label::Entity::find_by_id((updated_model.id, *label_id))
                    .one(&txn)
                    .await?
                    .is_none()
                {
                    issue_issue_label::ActiveModel {
                        issue_id: Set(updated_model.id),
                        issue_label_id: Set(*label_id),
                    }
                    .insert(&txn)
                    .await?;
                }
            }
            for label_id in &input.remove_label_ids {
                issue_issue_label::Entity::delete_by_id((updated_model.id, *label_id))
                    .exec(&txn)
                    .await?;
            }
            if let Some(state) = requested_state.as_deref() {
                if previous_state != state && !was_draft {
                    state_changes.push((
                        project_record.clone(),
                        updated_model.clone(),
                        previous_state,
                        state.to_string(),
                    ));
                }
            }
        }
        txn.commit().await?;

        for (project_record, model, old_state, new_state) in state_changes {
            self.create_issue_event(
                model.id,
                actor_login_id,
                "ISSUE_STATE_CHANGED",
                &old_state,
                &new_state,
            )
            .await?;
            let receiver_ids = self
                .issue_notification_receiver_ids(&project_record, &model, "ISSUE_STATE_CHANGED")
                .await?;
            self.create_notification_event_for_receivers(
                actor_id,
                "issue",
                &model.id.to_string(),
                "ISSUE_STATE_CHANGED",
                &old_state,
                &new_state,
                &receiver_ids,
            )
            .await?;
        }

        let mut updated = Vec::new();
        for issue_number in input.issue_numbers {
            if let Some(record) = self
                .read_issue_detail(&input.owner_name, &input.project_name, issue_number)
                .await?
            {
                updated.push(record);
            }
        }
        Ok(updated)
    }
}
