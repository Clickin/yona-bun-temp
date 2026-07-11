use super::*;

impl AppRepositoryImpl<'_> {
    pub(super) async fn notification_item_record(
        &self,
        event: notification_event::Model,
    ) -> Result<NotificationItemRecord, DbErr> {
        let old_value = self
            .read_text_column("notification_event", "old_value", event.id)
            .await?;
        let new_value = self
            .read_text_column("notification_event", "new_value", event.id)
            .await?;
        let event_type = event.event_type.unwrap_or_default();
        let actor = match event.sender_id {
            Some(sender_id) => self.find_user_by_id(sender_id).await?,
            None => None,
        };
        let actor = actor
            .map(|user| NotificationActorRecord {
                avatar_url: String::new(),
                display_name: user.display_name,
                login_id: user.login_id,
            })
            .unwrap_or_else(|| NotificationActorRecord {
                avatar_url: String::new(),
                display_name: String::new(),
                login_id: String::new(),
            });
        let target = self
            .notification_target(
                event.resource_type.as_deref().unwrap_or_default(),
                event.resource_id.as_deref().unwrap_or_default(),
            )
            .await?;
        let target_title = event
            .title
            .as_deref()
            .filter(|title| !title.trim().is_empty())
            .unwrap_or(&target.1)
            .to_string();
        let reply_target = self
            .notification_reply_target(
                event.resource_type.as_deref().unwrap_or_default(),
                event.resource_id.as_deref().unwrap_or_default(),
            )
            .await?;

        Ok(NotificationItemRecord {
            actor,
            created: event.created,
            event_type: event_type.clone(),
            id: event.id,
            message: notification_message(&event_type, &old_value, &new_value),
            reply_resource_id: reply_target
                .as_ref()
                .map(|(_, resource_id)| resource_id.to_string())
                .unwrap_or_default(),
            reply_resource_type: reply_target
                .as_ref()
                .map(|(resource_type, _)| resource_type.clone())
                .unwrap_or_default(),
            resource_id: event.resource_id.unwrap_or_default(),
            resource_type: event.resource_type.unwrap_or_default(),
            target_path: target.0,
            target_title,
            type_icon: notification_type_icon(&event_type, &new_value).to_string(),
        })
    }

    pub(super) async fn notification_reply_target(
        &self,
        resource_type: &str,
        resource_id: &str,
    ) -> Result<Option<(String, i64)>, DbErr> {
        let Some(resource_id) = resource_id.parse::<i64>().ok() else {
            return Ok(None);
        };
        let normalized_type = normalize_identity(resource_type);
        match normalized_type.as_str() {
            "issue" | "issue_post" => Ok(Some(("issue_post".to_string(), resource_id))),
            "issue_comment" => {
                let Some(comment) = issue_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                Ok(comment
                    .issue_id
                    .map(|issue_id| ("issue_post".to_string(), issue_id)))
            }
            "posting" | "board_post" => Ok(Some(("board_post".to_string(), resource_id))),
            "posting_comment" | "nonissue_comment" => {
                let Some(comment) = posting_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                Ok(comment
                    .posting_id
                    .map(|posting_id| ("board_post".to_string(), posting_id)))
            }
            "review_comment" => {
                let Some(comment) = review_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                Ok(comment
                    .thread_id
                    .map(|thread_id| ("comment_thread".to_string(), thread_id)))
            }
            _ => Ok(None),
        }
    }

    pub(super) async fn notification_target(
        &self,
        resource_type: &str,
        resource_id: &str,
    ) -> Result<(String, String), DbErr> {
        let Some(resource_id) = resource_id.parse::<i64>().ok() else {
            return Ok((String::new(), String::new()));
        };
        let normalized_type = normalize_identity(resource_type);
        if matches!(normalized_type.as_str(), "posting" | "posting_comment") {
            return self
                .notification_posting_target(&normalized_type, resource_id)
                .await;
        }
        if matches!(normalized_type.as_str(), "pull_request" | "review_comment") {
            return self
                .notification_pull_request_target(&normalized_type, resource_id)
                .await;
        }
        if normalized_type == "project" {
            return self.notification_project_target(resource_id).await;
        }
        self.notification_issue_target(&normalized_type, resource_id)
            .await
    }

    pub(super) async fn notification_project_target(
        &self,
        project_id: i64,
    ) -> Result<(String, String), DbErr> {
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok((String::new(), String::new()));
        };
        Ok((
            format!("/{}/{}", project.owner_name, project.project_name),
            project.project_name,
        ))
    }

    pub(super) async fn notification_issue_target(
        &self,
        resource_type: &str,
        resource_id: i64,
    ) -> Result<(String, String), DbErr> {
        let mut comment_anchor = String::new();
        let issue_model = match resource_type {
            "issue" | "issue_post" => issue::Entity::find_by_id(resource_id).one(&self.db).await?,
            "issue_comment" => {
                let Some(comment) = issue_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok((String::new(), String::new()));
                };
                comment_anchor = format!("#comment-{}", comment.id);
                match comment.issue_id {
                    Some(issue_id) => issue::Entity::find_by_id(issue_id).one(&self.db).await?,
                    None => None,
                }
            }
            _ => None,
        };
        let Some(issue_model) = issue_model else {
            return Ok((String::new(), String::new()));
        };
        let Some(project_id) = issue_model.project_id else {
            return Ok((String::new(), String::new()));
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok((String::new(), String::new()));
        };
        let issue_number = issue_model.number.unwrap_or_default();
        Ok((
            format!(
                "/{}/{}/issue/{}{}",
                project.owner_name, project.project_name, issue_number, comment_anchor
            ),
            issue_model.title.unwrap_or_default(),
        ))
    }

    pub(super) async fn notification_posting_target(
        &self,
        resource_type: &str,
        resource_id: i64,
    ) -> Result<(String, String), DbErr> {
        let mut comment_anchor = String::new();
        let posting_model = match resource_type {
            "posting" => {
                posting::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
            }
            "posting_comment" => {
                let Some(comment) = posting_comment::Entity::find_by_id(resource_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok((String::new(), String::new()));
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
            return Ok((String::new(), String::new()));
        };
        let Some(project_id) = posting_model.project_id else {
            return Ok((String::new(), String::new()));
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok((String::new(), String::new()));
        };
        let post_number = posting_model.number.unwrap_or_default();
        Ok((
            format!(
                "/{}/{}/post/{}{}",
                project.owner_name, project.project_name, post_number, comment_anchor
            ),
            posting_model.title.unwrap_or_default(),
        ))
    }

    pub(super) async fn notification_pull_request_target(
        &self,
        resource_type: &str,
        resource_id: i64,
    ) -> Result<(String, String), DbErr> {
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
                    return Ok((String::new(), String::new()));
                };
                comment_anchor = format!("#comment-{}", comment.id);
                let Some(thread_id) = comment.thread_id else {
                    return Ok((String::new(), String::new()));
                };
                let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok((String::new(), String::new()));
                };
                match thread.pull_request_id {
                    Some(pull_request_id) => {
                        comment_anchor = format!("/changes{comment_anchor}");
                        pull_request::Entity::find_by_id(pull_request_id)
                            .one(&self.db)
                            .await?
                    }
                    None => {
                        let Some(project_id) = thread.project_id else {
                            return Ok((String::new(), String::new()));
                        };
                        let Some(project) = self.read_project_by_id(project_id).await? else {
                            return Ok((String::new(), String::new()));
                        };
                        let commit_id = thread.commit_id.unwrap_or_default();
                        return Ok((
                            format!(
                                "/{}/{}/commit/{}{}",
                                project.owner_name, project.project_name, commit_id, comment_anchor
                            ),
                            commit_id,
                        ));
                    }
                }
            }
            _ => None,
        };
        let Some(pull_request_model) = pull_request_model else {
            return Ok((String::new(), String::new()));
        };
        let Some(project_id) = pull_request_model.to_project_id else {
            return Ok((String::new(), String::new()));
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok((String::new(), String::new()));
        };
        let pull_request_number = pull_request_model.number.unwrap_or_default();
        Ok((
            format!(
                "/{}/{}/pullRequest/{}{}",
                project.owner_name, project.project_name, pull_request_number, comment_anchor
            ),
            pull_request_model.title.unwrap_or_default(),
        ))
    }
}
