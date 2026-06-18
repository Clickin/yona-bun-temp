use super::*;

impl AppRepository {
    pub async fn read_project_by_id(
        &self,
        project_id: i64,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let row = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?;
        let Some(row) = row else {
            return Ok(None);
        };
        self.project_record_from_model(row).await
    }

    pub async fn set_project_watch(
        &self,
        user_id: i64,
        project_id: i64,
        watching: bool,
    ) -> Result<(), DbErr> {
        let existing = watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .all(&self.db)
            .await?;

        if watching {
            if existing.is_empty() {
                watch::ActiveModel {
                    id: NotSet,
                    user_id: Set(Some(user_id)),
                    resource_type: Set(Some("PROJECT".to_string())),
                    resource_id: Set(Some(project_id.to_string())),
                }
                .insert(&self.db)
                .await?;
            }
        } else {
            for row in existing {
                watch::Entity::delete_by_id(row.id).exec(&self.db).await?;
            }
            user_project_notification::Entity::delete_many()
                .filter(user_project_notification::Column::UserId.eq(Some(user_id)))
                .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
                .exec(&self.db)
                .await?;
        }

        Ok(())
    }

    pub async fn record_git_push(
        &self,
        project_id: i64,
        actor_id: i64,
        updated_branch_names: &[String],
        deleted_branch_names: &[String],
        notification_message: &str,
    ) -> Result<(), DbErr> {
        let now = current_datetime();
        if let Some(row) = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?
        {
            let mut active = project::ActiveModel::from(row);
            active.last_pushed_date = Set(Some(now));
            active.update(&self.db).await?;
        }

        let mut deleted = deleted_branch_names
            .iter()
            .map(|name| name.trim())
            .filter(|name| !name.is_empty())
            .collect::<Vec<_>>();
        deleted.sort_unstable();
        deleted.dedup();
        for branch_name in deleted {
            project_pushed_branch::Entity::delete_many()
                .filter(project_pushed_branch::Column::ProjectId.eq(Some(project_id)))
                .filter(project_pushed_branch::Column::Name.eq(Some(branch_name.to_string())))
                .exec(&self.db)
                .await?;
        }

        let mut updated = updated_branch_names
            .iter()
            .map(|name| name.trim())
            .filter(|name| !name.is_empty())
            .collect::<Vec<_>>();
        updated.sort_unstable();
        updated.dedup();
        for branch_name in updated {
            if let Some(row) = project_pushed_branch::Entity::find()
                .filter(project_pushed_branch::Column::ProjectId.eq(Some(project_id)))
                .filter(project_pushed_branch::Column::Name.eq(Some(branch_name.to_string())))
                .one(&self.db)
                .await?
            {
                let mut active = project_pushed_branch::ActiveModel::from(row);
                active.pushed_date = Set(Some(now));
                active.update(&self.db).await?;
            } else {
                project_pushed_branch::ActiveModel {
                    id: NotSet,
                    pushed_date: Set(Some(now)),
                    name: Set(Some(branch_name.to_string())),
                    project_id: Set(Some(project_id)),
                }
                .insert(&self.db)
                .await?;
            }
        }

        let receivers = self
            .commit_notification_receiver_ids(project_id, actor_id, "NEW_COMMIT")
            .await?;
        self.create_notification_event_for_receivers(
            actor_id,
            "PROJECT",
            &project_id.to_string(),
            "NEW_COMMIT",
            "",
            notification_message,
            &receivers,
        )
        .await
    }

    pub async fn record_pull_request_commit_changes(
        &self,
        input: PullRequestCommitChangedInput,
    ) -> Result<Vec<PullRequestCommitChangedRecord>, DbErr> {
        let mut commits_by_branch = HashMap::new();
        for branch in input.branches {
            let branch_name = branch.branch_name.trim().to_string();
            if branch_name.is_empty() || branch.commits.is_empty() {
                continue;
            }
            commits_by_branch.insert(branch_name, branch.commits);
        }
        if commits_by_branch.is_empty() {
            return Ok(Vec::new());
        }

        let branch_names = commits_by_branch.keys().cloned().collect::<Vec<_>>();
        let rows = pull_request::Entity::find()
            .filter(pull_request::Column::FromProjectId.eq(Some(input.project_id)))
            .filter(pull_request::Column::FromBranch.is_in(branch_names))
            .filter(pull_request_open_condition())
            .order_by_asc(pull_request::Column::Id)
            .all(&self.db)
            .await?;

        let mut changed = Vec::new();
        for row in rows {
            let branch_name = row.from_branch.clone().unwrap_or_default();
            let Some(commits) = commits_by_branch.get(&branch_name) else {
                continue;
            };
            if commits.is_empty() {
                continue;
            }

            let now = current_datetime();
            let mut commit_row_ids = Vec::new();
            let mut commit_messages = Vec::new();
            let mut last_commit_id = None;
            for commit in commits {
                let commit_id = commit.commit_id.trim();
                if commit_id.is_empty() {
                    continue;
                }
                let commit_short_id = commit_id.chars().take(7).collect::<String>();
                let created = pull_request_commit::ActiveModel {
                    id: NotSet,
                    pull_request_id: Set(Some(row.id)),
                    commit_id: Set(Some(commit_id.to_string())),
                    author_date: Set(Some(now)),
                    created: Set(Some(now)),
                    commit_short_id: Set(Some(commit_short_id)),
                    author_email: Set(empty_to_none(Some(commit.author_email.clone()))),
                    state: Set(Some("NEW".to_string())),
                }
                .insert(&self.db)
                .await?;
                self.write_text_column(
                    "pull_request_commit",
                    "commit_message",
                    created.id,
                    &commit.commit_message,
                )
                .await?;
                commit_row_ids.push(created.id.to_string());
                commit_messages.push(commit.commit_message.clone());
                last_commit_id = Some(commit_id.to_string());
            }
            if commit_row_ids.is_empty() {
                continue;
            }

            let mut active = pull_request::ActiveModel::from(row.clone());
            active.updated = Set(Some(now));
            if let Some(commit_id) = last_commit_id {
                active.last_commit_id = Set(Some(commit_id));
            }
            let updated = active.update(&self.db).await?;
            let event_value = commit_row_ids.join(",");
            self.create_pull_request_event(
                updated.id,
                &input.actor_login_id,
                "PULL_REQUEST_COMMIT_CHANGED",
                "",
                &event_value,
            )
            .await?;
            let receiver_ids = self
                .pull_request_notification_receiver_ids(
                    updated.to_project_id.unwrap_or_default(),
                    updated.id,
                    updated.contributor_id,
                    updated.receiver_id,
                    "PULL_REQUEST_COMMIT_CHANGED",
                )
                .await?;
            self.create_notification_event_for_receivers(
                input.actor_id,
                "PULL_REQUEST",
                &updated.id.to_string(),
                "PULL_REQUEST_COMMIT_CHANGED",
                "",
                &updated.title.clone().unwrap_or_default(),
                &receiver_ids,
            )
            .await?;

            let Some(to_project_id) = updated.to_project_id else {
                continue;
            };
            let Some(to_project) = self.read_project_by_id(to_project_id).await? else {
                continue;
            };
            let pull_request = self
                .pull_request_detail_from_model(updated, &to_project, Some(input.actor_id))
                .await?;
            changed.push(PullRequestCommitChangedRecord {
                commit_messages,
                pull_request,
            });
        }

        Ok(changed)
    }

    pub async fn delete_project_pushed_branch(
        &self,
        project_id: i64,
        branch_name: &str,
    ) -> Result<(), DbErr> {
        let branch_name = branch_name.trim();
        if branch_name.is_empty() {
            return Ok(());
        }
        project_pushed_branch::Entity::delete_many()
            .filter(project_pushed_branch::Column::ProjectId.eq(Some(project_id)))
            .filter(project_pushed_branch::Column::Name.eq(Some(branch_name.to_string())))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn delete_project_pushed_branch_by_id(
        &self,
        project_id: i64,
        pushed_branch_id: i64,
    ) -> Result<bool, DbErr> {
        let result = project_pushed_branch::Entity::delete_many()
            .filter(project_pushed_branch::Column::ProjectId.eq(Some(project_id)))
            .filter(project_pushed_branch::Column::Id.eq(pushed_branch_id))
            .exec(&self.db)
            .await?;
        Ok(result.rows_affected > 0)
    }

    pub async fn upsert_project_pushed_branch(
        &self,
        project_id: i64,
        branch_name: &str,
    ) -> Result<(), DbErr> {
        let branch_name = branch_name.trim();
        if branch_name.is_empty() {
            return Ok(());
        }
        let now = current_datetime();
        if let Some(row) = project_pushed_branch::Entity::find()
            .filter(project_pushed_branch::Column::ProjectId.eq(Some(project_id)))
            .filter(project_pushed_branch::Column::Name.eq(Some(branch_name.to_string())))
            .one(&self.db)
            .await?
        {
            let mut active = project_pushed_branch::ActiveModel::from(row);
            active.pushed_date = Set(Some(now));
            active.update(&self.db).await?;
        } else {
            project_pushed_branch::ActiveModel {
                id: NotSet,
                pushed_date: Set(Some(now)),
                name: Set(Some(branch_name.to_string())),
                project_id: Set(Some(project_id)),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn is_watching_project(&self, user_id: i64, project_id: i64) -> Result<bool, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .one(&self.db)
            .await?
            .is_some())
    }
}
