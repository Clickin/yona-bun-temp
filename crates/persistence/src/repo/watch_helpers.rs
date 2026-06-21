use super::*;

impl AppRepositoryImpl<'_> {
    pub(super) async fn count_issue_voters(&self, issue_id: i64) -> Result<u32, DbErr> {
        Ok(issue_voter::Entity::find()
            .filter(issue_voter::Column::IssueId.eq(issue_id))
            .count(&self.db)
            .await? as u32)
    }

    pub(super) async fn list_issue_voters(
        &self,
        issue_id: i64,
        viewer_id: Option<i64>,
    ) -> Result<Vec<IssueVoterRecord>, DbErr> {
        let rows = issue_voter::Entity::find()
            .filter(issue_voter::Column::IssueId.eq(issue_id))
            .all(&self.db)
            .await?;
        let mut voters = Vec::new();
        for row in rows {
            if let Some(user) = n4user::Entity::find_by_id(row.user_id)
                .one(&self.db)
                .await?
            {
                voters.push(IssueVoterRecord {
                    email_address: user.email.unwrap_or_default(),
                    login_id: user.login_id.unwrap_or_default(),
                    user_id: user.id,
                    user_label: user.name.unwrap_or_default(),
                });
            }
        }
        voters.sort_by(|left, right| {
            let left_is_viewer = Some(left.user_id) == viewer_id;
            let right_is_viewer = Some(right.user_id) == viewer_id;
            right_is_viewer.cmp(&left_is_viewer).then(
                left.login_id
                    .cmp(&right.login_id)
                    .then(left.user_id.cmp(&right.user_id)),
            )
        });
        Ok(voters)
    }

    pub(super) async fn count_issue_watchers(&self, issue_id: i64) -> Result<u32, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
            .count(&self.db)
            .await? as u32)
    }

    pub(super) async fn count_pull_request_watchers(
        &self,
        project: &ProjectRecord,
        pull_request_id: i64,
        contributor_id: Option<i64>,
    ) -> Result<u32, DbErr> {
        Ok(usize_to_u32_saturating(
            self.pull_request_watcher_ids(project, pull_request_id, contributor_id)
                .await?
                .len(),
        ))
    }

    pub(super) async fn count_posting_watchers(&self, posting_id: i64) -> Result<u32, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(posting_id.to_string())))
            .count(&self.db)
            .await? as u32)
    }

    pub(super) async fn is_issue_watched_by(
        &self,
        issue_id: i64,
        user_id: i64,
    ) -> Result<bool, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
            .one(&self.db)
            .await?
            .is_some())
    }

    pub(super) async fn is_pull_request_watched_by(
        &self,
        project: &ProjectRecord,
        pull_request_id: i64,
        contributor_id: Option<i64>,
        user_id: i64,
    ) -> Result<bool, DbErr> {
        Ok(self
            .pull_request_watcher_ids(project, pull_request_id, contributor_id)
            .await?
            .contains(&user_id))
    }

    pub async fn watch_pull_request(
        &self,
        pull_request_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        let resource_id = pull_request_id.to_string();
        if !self
            .has_explicit_pull_request_watch(pull_request_id, user_id)
            .await?
        {
            watch::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                resource_type: Set(Some("PULL_REQUEST".to_string())),
                resource_id: Set(Some(resource_id.clone())),
            }
            .insert(&self.db)
            .await?;
        }
        unwatch::Entity::delete_many()
            .filter(unwatch::Column::UserId.eq(Some(user_id)))
            .filter(unwatch::Column::ResourceType.eq(Some("PULL_REQUEST".to_string())))
            .filter(unwatch::Column::ResourceId.eq(Some(resource_id)))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn unwatch_pull_request(
        &self,
        pull_request_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        let resource_id = pull_request_id.to_string();
        if unwatch::Entity::find()
            .filter(unwatch::Column::UserId.eq(Some(user_id)))
            .filter(unwatch::Column::ResourceType.eq(Some("PULL_REQUEST".to_string())))
            .filter(unwatch::Column::ResourceId.eq(Some(resource_id.clone())))
            .one(&self.db)
            .await?
            .is_none()
        {
            unwatch::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                resource_type: Set(Some("PULL_REQUEST".to_string())),
                resource_id: Set(Some(resource_id.clone())),
            }
            .insert(&self.db)
            .await?;
        }
        watch::Entity::delete_many()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("PULL_REQUEST".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(resource_id)))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn unwatch_notification_resource(
        &self,
        user_id: i64,
        resource_type: &str,
        resource_id: &str,
    ) -> Result<(), DbErr> {
        let resource_types = notification_unwatch_resource_types(resource_type);
        for resource_type in resource_types {
            if unwatch::Entity::find()
                .filter(unwatch::Column::UserId.eq(Some(user_id)))
                .filter(unwatch::Column::ResourceType.eq(Some(resource_type.clone())))
                .filter(unwatch::Column::ResourceId.eq(Some(resource_id.to_string())))
                .one(&self.db)
                .await?
                .is_none()
            {
                unwatch::ActiveModel {
                    id: NotSet,
                    user_id: Set(Some(user_id)),
                    resource_type: Set(Some(resource_type.clone())),
                    resource_id: Set(Some(resource_id.to_string())),
                }
                .insert(&self.db)
                .await?;
            }
            watch::Entity::delete_many()
                .filter(watch::Column::UserId.eq(Some(user_id)))
                .filter(watch::Column::ResourceType.eq(Some(resource_type)))
                .filter(watch::Column::ResourceId.eq(Some(resource_id.to_string())))
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn watch_notification_resource(
        &self,
        user_id: i64,
        resource_type: &str,
        resource_id: &str,
    ) -> Result<(), DbErr> {
        let resource_types = notification_unwatch_resource_types(resource_type);
        for resource_type in resource_types {
            if watch::Entity::find()
                .filter(watch::Column::UserId.eq(Some(user_id)))
                .filter(watch::Column::ResourceType.eq(Some(resource_type.clone())))
                .filter(watch::Column::ResourceId.eq(Some(resource_id.to_string())))
                .one(&self.db)
                .await?
                .is_none()
            {
                watch::ActiveModel {
                    id: NotSet,
                    user_id: Set(Some(user_id)),
                    resource_type: Set(Some(resource_type.clone())),
                    resource_id: Set(Some(resource_id.to_string())),
                }
                .insert(&self.db)
                .await?;
            }
            unwatch::Entity::delete_many()
                .filter(unwatch::Column::UserId.eq(Some(user_id)))
                .filter(unwatch::Column::ResourceType.eq(Some(resource_type)))
                .filter(unwatch::Column::ResourceId.eq(Some(resource_id.to_string())))
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn resolve_legacy_resource_target(
        &self,
        resource_type: &str,
        resource_id: &str,
    ) -> Result<Option<LegacyResourceTargetRecord>, DbErr> {
        let Some(resource_id) = resource_id.parse::<i64>().ok() else {
            return Ok(None);
        };
        let normalized_type = normalize_identity(resource_type);
        match normalized_type.as_str() {
            "project" => self.legacy_project_resource_target(resource_id).await,
            "issue" | "issue_post" | "issue_comment" => {
                self.legacy_issue_resource_target(&normalized_type, resource_id)
                    .await
            }
            "posting" | "board_post" | "posting_comment" | "nonissue_comment" => {
                self.legacy_posting_resource_target(&normalized_type, resource_id)
                    .await
            }
            "pull_request" | "review_comment" => {
                self.legacy_pull_request_resource_target(&normalized_type, resource_id)
                    .await
            }
            _ => Ok(None),
        }
    }

    pub(super) async fn legacy_project_resource_target(
        &self,
        project_id: i64,
    ) -> Result<Option<LegacyResourceTargetRecord>, DbErr> {
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        Ok(Some(LegacyResourceTargetRecord {
            owner_name: project.owner_name.clone(),
            project_id: project.id,
            project_name: project.project_name.clone(),
            target_path: format!("/{}/{}", project.owner_name, project.project_name),
            target_title: project.project_name,
        }))
    }

    pub(super) async fn legacy_issue_resource_target(
        &self,
        resource_type: &str,
        resource_id: i64,
    ) -> Result<Option<LegacyResourceTargetRecord>, DbErr> {
        let issue_model = match resource_type {
            "issue" | "issue_post" => issue::Entity::find_by_id(resource_id).one(&self.db).await?,
            "issue_comment" => {
                let Some(comment) = issue_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                match comment.issue_id {
                    Some(issue_id) => issue::Entity::find_by_id(issue_id).one(&self.db).await?,
                    None => None,
                }
            }
            _ => None,
        };
        let Some(issue_model) = issue_model else {
            return Ok(None);
        };
        let Some(project_id) = issue_model.project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        let issue_number = issue_model.number.unwrap_or_default();
        Ok(Some(LegacyResourceTargetRecord {
            owner_name: project.owner_name.clone(),
            project_id: project.id,
            project_name: project.project_name.clone(),
            target_path: format!(
                "/{}/{}/issue/{}",
                project.owner_name, project.project_name, issue_number
            ),
            target_title: issue_model.title.unwrap_or_default(),
        }))
    }

    pub(super) async fn legacy_posting_resource_target(
        &self,
        resource_type: &str,
        resource_id: i64,
    ) -> Result<Option<LegacyResourceTargetRecord>, DbErr> {
        let mut comment_anchor = String::new();
        let posting_model = match resource_type {
            "posting" | "board_post" => {
                posting::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
            }
            "posting_comment" | "nonissue_comment" => {
                let Some(comment) = posting_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                comment_anchor = format!("#comment-{}", comment.id);
                match comment.posting_id {
                    Some(posting_id) => {
                        posting::Entity::find_by_id(posting_id)
                            .one(&self.db)
                            .await?
                    }
                    None => None,
                }
            }
            _ => None,
        };
        let Some(posting_model) = posting_model else {
            return Ok(None);
        };
        let Some(project_id) = posting_model.project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        let post_number = posting_model.number.unwrap_or_default();
        Ok(Some(LegacyResourceTargetRecord {
            owner_name: project.owner_name.clone(),
            project_id: project.id,
            project_name: project.project_name.clone(),
            target_path: format!(
                "/{}/{}/post/{}{}",
                project.owner_name, project.project_name, post_number, comment_anchor
            ),
            target_title: posting_model.title.unwrap_or_default(),
        }))
    }

    pub(super) async fn legacy_pull_request_resource_target(
        &self,
        resource_type: &str,
        resource_id: i64,
    ) -> Result<Option<LegacyResourceTargetRecord>, DbErr> {
        let mut comment_anchor = String::new();
        let pull_request_model = match resource_type {
            "pull_request" => {
                pull_request::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
            }
            "review_comment" => {
                let Some(comment) = review_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                comment_anchor = format!("#comment-{}", comment.id);
                let Some(thread_id) = comment.thread_id else {
                    return Ok(None);
                };
                let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(pull_request_id) = thread.pull_request_id else {
                    return Ok(None);
                };
                comment_anchor = format!("/changes{comment_anchor}");
                pull_request::Entity::find_by_id(pull_request_id)
                    .one(&self.db)
                    .await?
            }
            _ => None,
        };
        let Some(pull_request_model) = pull_request_model else {
            return Ok(None);
        };
        let Some(project_id) = pull_request_model.to_project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        let pull_request_number = pull_request_model.number.unwrap_or_default();
        Ok(Some(LegacyResourceTargetRecord {
            owner_name: project.owner_name.clone(),
            project_id: project.id,
            project_name: project.project_name.clone(),
            target_path: format!(
                "/{}/{}/pullRequest/{}{}",
                project.owner_name, project.project_name, pull_request_number, comment_anchor
            ),
            target_title: pull_request_model.title.unwrap_or_default(),
        }))
    }

    pub(super) async fn has_explicit_pull_request_watch(
        &self,
        pull_request_id: i64,
        user_id: i64,
    ) -> Result<bool, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("PULL_REQUEST".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(pull_request_id.to_string())))
            .one(&self.db)
            .await?
            .is_some())
    }

    pub(super) async fn pull_request_watcher_ids(
        &self,
        project: &ProjectRecord,
        pull_request_id: i64,
        contributor_id: Option<i64>,
    ) -> Result<Vec<i64>, DbErr> {
        let mut user_ids = Vec::new();
        let mut seen = HashSet::new();
        self.push_readable_pull_request_watcher_id(
            project,
            &mut user_ids,
            &mut seen,
            contributor_id,
        )
        .await?;

        for user_id in self
            .active_watch_user_ids("PULL_REQUEST", &pull_request_id.to_string())
            .await?
        {
            self.push_readable_pull_request_watcher_id(
                project,
                &mut user_ids,
                &mut seen,
                Some(user_id),
            )
            .await?;
        }

        for user_id in self
            .active_watch_user_ids("PROJECT", &project.id.to_string())
            .await?
        {
            self.push_readable_pull_request_watcher_id(
                project,
                &mut user_ids,
                &mut seen,
                Some(user_id),
            )
            .await?;
        }

        for user_id in self
            .pull_request_review_comment_author_ids(pull_request_id)
            .await?
        {
            self.push_readable_pull_request_watcher_id(
                project,
                &mut user_ids,
                &mut seen,
                Some(user_id),
            )
            .await?;
        }

        let pull_request_unwatchers = self
            .active_unwatch_user_ids("PULL_REQUEST", &pull_request_id.to_string())
            .await?
            .into_iter()
            .collect::<HashSet<_>>();
        user_ids.retain(|user_id| !pull_request_unwatchers.contains(user_id));
        Ok(user_ids)
    }

    pub(super) async fn pull_request_review_comment_author_ids(
        &self,
        pull_request_id: i64,
    ) -> Result<Vec<i64>, DbErr> {
        let thread_ids = comment_thread::Entity::find()
            .filter(comment_thread::Column::PullRequestId.eq(Some(pull_request_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        if thread_ids.is_empty() {
            return Ok(Vec::new());
        }
        let rows = review_comment::Entity::find()
            .filter(review_comment::Column::ThreadId.is_in(thread_ids.into_iter().map(Some)))
            .all(&self.db)
            .await?;
        Ok(rows.into_iter().filter_map(|row| row.author_id).collect())
    }

    pub(super) async fn push_readable_pull_request_watcher_id(
        &self,
        project: &ProjectRecord,
        user_ids: &mut Vec<i64>,
        seen: &mut HashSet<i64>,
        user_id: Option<i64>,
    ) -> Result<(), DbErr> {
        let Some(user_id) = user_id else {
            return Ok(());
        };
        if seen.contains(&user_id) {
            return Ok(());
        }
        if !self
            .find_user_model_by_id(user_id)
            .await?
            .is_some_and(|user| n4user_is_active(&user))
        {
            return Ok(());
        }
        if !self
            .search_project_visible_for_actor(project, Some(user_id))
            .await?
        {
            return Ok(());
        }
        seen.insert(user_id);
        user_ids.push(user_id);
        Ok(())
    }

    pub(super) async fn is_posting_watched_by(
        &self,
        posting_id: i64,
        user_id: i64,
    ) -> Result<bool, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(posting_id.to_string())))
            .one(&self.db)
            .await?
            .is_some())
    }

    pub(super) async fn recount_issue_comments(&self, issue_id: i64) -> Result<(), DbErr> {
        let count = issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(issue_id)))
            .count(&self.db)
            .await? as i32;
        let mut active = issue::ActiveModel {
            id: Set(issue_id),
            ..Default::default()
        };
        active.num_of_comments = Set(Some(count));
        active.updated_date = Set(Some(current_datetime()));
        active.update(&self.db).await?;
        Ok(())
    }

    pub(super) async fn recount_posting_comments(&self, posting_id: i64) -> Result<(), DbErr> {
        let count = posting_comment::Entity::find()
            .filter(posting_comment::Column::PostingId.eq(Some(posting_id)))
            .count(&self.db)
            .await? as i32;
        let mut active = posting::ActiveModel {
            id: Set(posting_id),
            ..Default::default()
        };
        active.num_of_comments = Set(Some(count));
        active.updated_date = Set(Some(current_datetime()));
        active.update(&self.db).await?;
        Ok(())
    }
}
