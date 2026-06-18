use super::*;

impl AppRepository {
    pub async fn add_issue_sharer(
        &self,
        issue_id: i64,
        user_id: i64,
        login_id: &str,
    ) -> Result<bool, DbErr> {
        if self.has_direct_issue_share(issue_id, user_id).await? {
            return Ok(false);
        }

        issue_sharer::ActiveModel {
            id: NotSet,
            created: Set(Some(current_datetime().date())),
            login_id: Set(Some(normalize_identity(login_id))),
            user_id: Set(Some(user_id)),
            issue_id: Set(Some(issue_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(true)
    }

    pub async fn remove_issue_sharer(&self, issue_id: i64, user_id: i64) -> Result<bool, DbErr> {
        let result = issue_sharer::Entity::delete_many()
            .filter(issue_sharer::Column::IssueId.eq(Some(issue_id)))
            .filter(issue_sharer::Column::UserId.eq(Some(user_id)))
            .exec(&self.db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    pub async fn record_issue_sharer_changed(
        &self,
        issue_id: i64,
        actor_id: i64,
        actor_login_id: &str,
        sharer_user_id: i64,
        sharer_login_id: &str,
        action: &str,
    ) -> Result<(), DbErr> {
        let (old_value, new_value) = if action == "share" {
            ("", sharer_login_id)
        } else {
            (sharer_login_id, "")
        };
        self.create_issue_event(
            issue_id,
            actor_login_id,
            "ISSUE_SHARER_CHANGED",
            old_value,
            new_value,
        )
        .await?;
        self.create_notification_event_for_receivers(
            actor_id,
            "issue",
            &issue_id.to_string(),
            "ISSUE_SHARER_CHANGED",
            old_value,
            new_value,
            &[sharer_user_id],
        )
        .await
    }

    pub async fn is_issue_favorited_by(&self, issue_id: i64, user_id: i64) -> Result<bool, DbErr> {
        Ok(favorite_issue::Entity::find()
            .filter(favorite_issue::Column::IssueId.eq(Some(issue_id)))
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_some())
    }

    pub async fn toggle_favorite_issue(
        &self,
        issue_id: i64,
        user_id: i64,
    ) -> Result<ToggleFavoriteIssueResult, DbErr> {
        if let Some(existing) = favorite_issue::Entity::find()
            .filter(favorite_issue::Column::IssueId.eq(Some(issue_id)))
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            favorite_issue::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
            return Ok(ToggleFavoriteIssueResult {
                favorited: false,
                issue_id,
            });
        }

        favorite_issue::ActiveModel {
            id: NotSet,
            issue_id: Set(Some(issue_id)),
            user_id: Set(Some(user_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(ToggleFavoriteIssueResult {
            favorited: true,
            issue_id,
        })
    }

    pub async fn read_legacy_favorite_issue_target(
        &self,
        issue_id: i64,
    ) -> Result<Option<(String, String, i64)>, DbErr> {
        let Some(issue_row) = issue::Entity::find_by_id(issue_id).one(&self.db).await? else {
            return Ok(None);
        };
        let Some(project_id) = issue_row.project_id else {
            return Ok(None);
        };
        let Some(issue_number) = issue_row.number else {
            return Ok(None);
        };
        let Some(project_row) = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(owner_name) = project_row.owner else {
            return Ok(None);
        };
        let Some(project_name) = project_row.name else {
            return Ok(None);
        };
        Ok(Some((owner_name, project_name, issue_number)))
    }

    pub async fn list_legacy_favorite_issues_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<(i64, String, String)>, DbErr> {
        let rows = favorite_issue::Entity::find()
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .order_by_desc(favorite_issue::Column::Id)
            .all(&self.db)
            .await?;
        let mut issues = Vec::new();
        for row in rows {
            let Some(issue_id) = row.issue_id else {
                continue;
            };
            let Some(issue_row) = issue::Entity::find_by_id(issue_id).one(&self.db).await? else {
                continue;
            };
            let title = issue_row.title.unwrap_or_default();
            let author_name = if let Some(author_id) = issue_row.author_id {
                n4user::Entity::find_by_id(author_id)
                    .one(&self.db)
                    .await?
                    .and_then(|user| user.name)
                    .unwrap_or_else(|| issue_row.author_name.clone().unwrap_or_default())
            } else {
                issue_row.author_name.clone().unwrap_or_default()
            };
            issues.push((issue_id, title, author_name));
        }
        Ok(issues)
    }

    pub async fn list_user_issue_candidates(
        &self,
        user_id: i64,
        filter: UserIssueListFilter,
    ) -> Result<Vec<UserIssueCandidateRecord>, DbErr> {
        let normalized_filter = normalize_identity(&filter.filter);
        let assignee_ids = assignee::Entity::find()
            .filter(assignee::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<HashSet<_>>();
        let commented_issue_ids = issue_comment::Entity::find()
            .filter(issue_comment::Column::AuthorId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.issue_id)
            .collect::<HashSet<_>>();
        let mention_rows = mention::Entity::find()
            .filter(mention::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        let mut mentioned_issue_ids = HashSet::new();
        let mut mentioned_comment_ids = Vec::new();
        for row in mention_rows {
            let Some(resource_id) = row.resource_id.and_then(|value| value.parse::<i64>().ok())
            else {
                continue;
            };
            let resource_type = row
                .resource_type
                .as_deref()
                .map(normalize_identity)
                .unwrap_or_default();
            match resource_type.as_str() {
                "issue" | "issue_post" => {
                    mentioned_issue_ids.insert(resource_id);
                }
                "issue_comment" => mentioned_comment_ids.push(resource_id),
                _ => {}
            }
        }
        for comment in issue_comment::Entity::find()
            .filter(issue_comment::Column::Id.is_in(mentioned_comment_ids))
            .all(&self.db)
            .await?
        {
            if let Some(issue_id) = comment.issue_id {
                mentioned_issue_ids.insert(issue_id);
            }
        }
        let shared_issue_ids = issue_sharer::Entity::find()
            .filter(issue_sharer::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.issue_id)
            .collect::<HashSet<_>>();
        let favorite_issue_ids = favorite_issue::Entity::find()
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.issue_id)
            .collect::<HashSet<_>>();

        let rows = issue::Entity::find().all(&self.db).await?;
        let mut matches = Vec::new();
        for row in rows {
            if row.is_draft.unwrap_or_default() != 0 {
                continue;
            }
            let issue_id = row.id;
            let filter_matches = match normalized_filter.as_str() {
                "authored" => row.author_id == Some(user_id),
                "commented" => commented_issue_ids.contains(&issue_id),
                "mentioned" => mentioned_issue_ids.contains(&issue_id),
                "shared" => shared_issue_ids.contains(&issue_id),
                "favorite" => favorite_issue_ids.contains(&issue_id),
                _ => row
                    .assignee_id
                    .is_some_and(|assignee_id| assignee_ids.contains(&assignee_id)),
            };
            if !filter_matches {
                continue;
            }
            if issue_state_from_raw(row.state) != normalize_identity(&filter.state) {
                continue;
            }
            if let Some(query) = filter.query.as_deref() {
                if !self.issue_model_matches_text_filter(&row, query).await? {
                    continue;
                }
            }
            let Some(project_id) = row.project_id else {
                continue;
            };
            let Some(project) = self.read_project_by_id(project_id).await? else {
                continue;
            };
            matches.push((row, project));
        }

        sort_issue_models_for_organization(&mut matches, &filter.order_by, &filter.order_dir);

        let mut candidates = Vec::new();
        for (row, project) in matches {
            let issue_id = row.id;
            candidates.push(UserIssueCandidateRecord {
                issue_id,
                item: self
                    .project_issue_list_item_from_model(row, &project)
                    .await?,
            });
        }

        Ok(candidates)
    }
}
