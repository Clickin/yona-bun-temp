use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn create_user_attachment_upload(
        &self,
        user_id: i64,
        login_id: &str,
        file_name: &str,
        mime_type: &str,
        size: i64,
        hash: &str,
    ) -> Result<AttachmentRecord, DbErr> {
        let created = attachment::ActiveModel {
            id: NotSet,
            name: Set(Some(file_name.to_string())),
            hash: Set(Some(hash.to_string())),
            container_type: Set(Some(USER_ATTACHMENT_CONTAINER.to_string())),
            mime_type: Set(Some(mime_type.to_string())),
            size: Set(Some(size)),
            container_id: Set(user_id),
            created_date: Set(Some(current_datetime())),
            owner_login_id: Set(Some(login_id.to_string())),
        }
        .insert(&self.db)
        .await?;
        Ok(AttachmentRecord {
            container_id: created.container_id,
            container_type: created.container_type.unwrap_or_default(),
            created_at: created.created_date,
            hash: created.hash.unwrap_or_default(),
            id: created.id,
            mime_type: created.mime_type.unwrap_or_default(),
            name: created.name.unwrap_or_default(),
            owner_login_id: created.owner_login_id.unwrap_or_default(),
            size: created.size.unwrap_or_default(),
        })
    }

    pub async fn read_attachment_by_id(
        &self,
        attachment_id: i64,
    ) -> Result<Option<AttachmentRecord>, DbErr> {
        let Some(model) = attachment::Entity::find_by_id(attachment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        Ok(Some(AttachmentRecord {
            container_id: model.container_id,
            container_type: model.container_type.unwrap_or_default(),
            created_at: model.created_date,
            hash: model.hash.unwrap_or_default(),
            id: model.id,
            mime_type: model.mime_type.unwrap_or_default(),
            name: model.name.unwrap_or_default(),
            owner_login_id: model.owner_login_id.unwrap_or_default(),
            size: model.size.unwrap_or_default(),
        }))
    }

    pub async fn list_attachments_by_container(
        &self,
        container_type: &str,
        container_id: i64,
    ) -> Result<Vec<AttachmentRecord>, DbErr> {
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
            .map(|model| AttachmentRecord {
                container_id: model.container_id,
                container_type: model.container_type.unwrap_or_default(),
                created_at: model.created_date,
                hash: model.hash.unwrap_or_default(),
                id: model.id,
                mime_type: model.mime_type.unwrap_or_default(),
                name: model.name.unwrap_or_default(),
                owner_login_id: model.owner_login_id.unwrap_or_default(),
                size: model.size.unwrap_or_default(),
            })
            .collect())
    }

    pub async fn read_attachment_project_resource(
        &self,
        container_type: &str,
        container_id: i64,
    ) -> Result<Option<AttachmentProjectResourceRecord>, DbErr> {
        let normalized = container_type.trim().to_ascii_uppercase();
        let project_id = match normalized.as_str() {
            PROJECT_ATTACHMENT_CONTAINER => Some(container_id),
            ISSUE_ATTACHMENT_CONTAINER | RUST_ISSUE_ATTACHMENT_CONTAINER => {
                issue::Entity::find_by_id(container_id)
                    .one(&self.db)
                    .await?
                    .and_then(|row| row.project_id)
            }
            ISSUE_COMMENT_ATTACHMENT_CONTAINER => issue_comment::Entity::find_by_id(container_id)
                .one(&self.db)
                .await?
                .map(|row| row.project_id),
            BOARD_POST_ATTACHMENT_CONTAINER => posting::Entity::find_by_id(container_id)
                .one(&self.db)
                .await?
                .and_then(|row| row.project_id),
            BOARD_COMMENT_ATTACHMENT_CONTAINER | RUST_BOARD_COMMENT_ATTACHMENT_CONTAINER => {
                posting_comment::Entity::find_by_id(container_id)
                    .one(&self.db)
                    .await?
                    .map(|row| row.project_id)
            }
            MILESTONE_ATTACHMENT_CONTAINER => milestone::Entity::find_by_id(container_id)
                .one(&self.db)
                .await?
                .and_then(|row| row.project_id),
            PULL_REQUEST_ATTACHMENT_CONTAINER => pull_request::Entity::find_by_id(container_id)
                .one(&self.db)
                .await?
                .and_then(|row| row.to_project_id),
            REVIEW_COMMENT_ATTACHMENT_CONTAINER => {
                let Some(comment) = review_comment::Entity::find_by_id(container_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(thread_id) = comment.thread_id else {
                    return Ok(None);
                };
                let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                if thread.project_id.is_some() {
                    thread.project_id
                } else if let Some(pull_request_id) = thread.pull_request_id {
                    pull_request::Entity::find_by_id(pull_request_id)
                        .one(&self.db)
                        .await?
                        .and_then(|row| row.to_project_id)
                } else {
                    None
                }
            }
            "COMMENT_THREAD" => {
                let Some(thread) = comment_thread::Entity::find_by_id(container_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                if thread.project_id.is_some() {
                    thread.project_id
                } else if let Some(pull_request_id) = thread.pull_request_id {
                    pull_request::Entity::find_by_id(pull_request_id)
                        .one(&self.db)
                        .await?
                        .and_then(|row| row.to_project_id)
                } else {
                    None
                }
            }
            _ => None,
        };

        let Some(project_id) = project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        Ok(Some(AttachmentProjectResourceRecord {
            owner_name: project.owner_name,
            project_name: project.project_name,
        }))
    }

    pub async fn read_attachment_location_path(
        &self,
        container_type: &str,
        container_id: i64,
    ) -> Result<Option<String>, DbErr> {
        let normalized = container_type.trim().to_ascii_uppercase();
        match normalized.as_str() {
            USER_ATTACHMENT_CONTAINER | USER_AVATAR_ATTACHMENT_CONTAINER => Ok(None),
            PROJECT_ATTACHMENT_CONTAINER => {
                let Some(project) = self.read_project_by_id(container_id).await? else {
                    return Ok(None);
                };
                Ok(Some(format!(
                    "/{}/{}",
                    project.owner_name, project.project_name
                )))
            }
            ISSUE_ATTACHMENT_CONTAINER | RUST_ISSUE_ATTACHMENT_CONTAINER => {
                self.issue_location_path(container_id, None).await
            }
            ISSUE_COMMENT_ATTACHMENT_CONTAINER => {
                let Some(comment) = issue_comment::Entity::find_by_id(container_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                self.issue_location_path(comment.issue_id.unwrap_or_default(), Some(comment.id))
                    .await
            }
            BOARD_POST_ATTACHMENT_CONTAINER => self.posting_location_path(container_id, None).await,
            BOARD_COMMENT_ATTACHMENT_CONTAINER | RUST_BOARD_COMMENT_ATTACHMENT_CONTAINER => {
                let Some(comment) = posting_comment::Entity::find_by_id(container_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                self.posting_location_path(comment.posting_id.unwrap_or_default(), Some(comment.id))
                    .await
            }
            MILESTONE_ATTACHMENT_CONTAINER => self.milestone_location_path(container_id).await,
            PULL_REQUEST_ATTACHMENT_CONTAINER => {
                self.pull_request_location_path(container_id, None, None)
                    .await
            }
            REVIEW_COMMENT_ATTACHMENT_CONTAINER => {
                let Some(comment) = review_comment::Entity::find_by_id(container_id)
                    .one(&self.db)
                    .await?
                else {
                    return Ok(None);
                };
                let Some(thread_id) = comment.thread_id else {
                    return Ok(None);
                };
                self.comment_thread_location_path(thread_id, Some(comment.id))
                    .await
            }
            "COMMENT_THREAD" => self.comment_thread_location_path(container_id, None).await,
            _ => Ok(None),
        }
    }

    async fn issue_location_path(
        &self,
        issue_id: i64,
        comment_id: Option<i64>,
    ) -> Result<Option<String>, DbErr> {
        let Some(issue) = issue::Entity::find_by_id(issue_id).one(&self.db).await? else {
            return Ok(None);
        };
        let Some(project_id) = issue.project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        let mut path = format!(
            "/{}/{}/issue/{}",
            project.owner_name,
            project.project_name,
            issue.number.unwrap_or_default()
        );
        if let Some(comment_id) = comment_id {
            path.push_str(&format!("#comment-{comment_id}"));
        }
        Ok(Some(path))
    }

    async fn posting_location_path(
        &self,
        posting_id: i64,
        comment_id: Option<i64>,
    ) -> Result<Option<String>, DbErr> {
        let Some(posting) = posting::Entity::find_by_id(posting_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(project_id) = posting.project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        let mut path = format!(
            "/{}/{}/post/{}",
            project.owner_name,
            project.project_name,
            posting.number.unwrap_or_default()
        );
        if let Some(comment_id) = comment_id {
            path.push_str(&format!("#comment-{comment_id}"));
        }
        Ok(Some(path))
    }

    async fn milestone_location_path(&self, milestone_id: i64) -> Result<Option<String>, DbErr> {
        let Some(milestone) = milestone::Entity::find_by_id(milestone_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(project_id) = milestone.project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        Ok(Some(format!(
            "/{}/{}/milestone/{}",
            project.owner_name, project.project_name, milestone.id
        )))
    }

    async fn pull_request_location_path(
        &self,
        pull_request_id: i64,
        thread_id: Option<i64>,
        comment_id: Option<i64>,
    ) -> Result<Option<String>, DbErr> {
        let Some(pull_request) = pull_request::Entity::find_by_id(pull_request_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(project_id) = pull_request.to_project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        let mut path = format!(
            "/{}/{}/pullRequest/{}",
            project.owner_name,
            project.project_name,
            pull_request.number.unwrap_or_default()
        );
        if let Some(comment_id) = comment_id {
            path.push_str(&format!("#comment-{comment_id}"));
        } else if let Some(thread_id) = thread_id {
            path.push_str(&format!("#thread-{thread_id}"));
        }
        Ok(Some(path))
    }

    async fn comment_thread_location_path(
        &self,
        thread_id: i64,
        comment_id: Option<i64>,
    ) -> Result<Option<String>, DbErr> {
        let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if let Some(pull_request_id) = thread.pull_request_id {
            return self
                .pull_request_location_path(pull_request_id, Some(thread.id), comment_id)
                .await;
        }
        let Some(project_id) = thread.project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        let commit_id = thread.commit_id.unwrap_or_default();
        if commit_id.trim().is_empty() {
            return Ok(Some(format!(
                "/{}/{}",
                project.owner_name, project.project_name
            )));
        }
        let mut path = format!(
            "/{}/{}/commit/{}",
            project.owner_name, project.project_name, commit_id
        );
        if let Some(comment_id) = comment_id {
            path.push_str(&format!("#comment-{comment_id}"));
        } else {
            path.push_str(&format!("#thread-{}", thread.id));
        }
        Ok(Some(path))
    }

    pub async fn list_user_attachments(
        &self,
        owner_login_id: &str,
        filter: &str,
        page: u32,
        page_size: u32,
    ) -> Result<UserAttachmentListRecord, DbErr> {
        let page = page.max(1);
        let page_size = page_size.max(1);
        let filter = filter.trim().to_string();
        let normalized_filter = normalize_identity(&filter);
        let mut rows = attachment::Entity::find()
            .filter(attachment::Column::OwnerLoginId.eq(Some(owner_login_id.to_string())))
            .order_by_desc(attachment::Column::Id)
            .all(&self.db)
            .await?
            .into_iter()
            .filter(|row| {
                normalized_filter.is_empty()
                    || normalize_identity(row.name.as_deref().unwrap_or_default())
                        .contains(&normalized_filter)
            })
            .collect::<Vec<_>>();

        let total = rows.len() as u32;
        let offset = page.saturating_sub(1).saturating_mul(page_size) as usize;
        let attachments = rows
            .drain(..)
            .skip(offset)
            .take(page_size as usize)
            .map(|model| UserAttachmentRecord {
                container_id: model.container_id,
                container_type: model.container_type.unwrap_or_default(),
                created_label: model
                    .created_date
                    .map(|value| value.format("%Y-%m-%d %I:%M %p").to_string())
                    .unwrap_or_default(),
                id: model.id,
                mime_type: model.mime_type.unwrap_or_default(),
                name: model.name.unwrap_or_default(),
                size: model.size.unwrap_or_default(),
            })
            .collect();
        let total_pages = if total == 0 {
            0
        } else {
            total.div_ceil(page_size)
        };

        Ok(UserAttachmentListRecord {
            attachments,
            filter,
            page,
            page_size,
            total,
            total_pages,
        })
    }

    pub async fn read_avatar_attachment_for_user(
        &self,
        user_id: i64,
    ) -> Result<Option<AttachmentRecord>, DbErr> {
        let Some(model) = attachment::Entity::find()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(USER_AVATAR_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(user_id))
            .order_by_desc(attachment::Column::Id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        Ok(Some(AttachmentRecord {
            container_id: model.container_id,
            container_type: model.container_type.unwrap_or_default(),
            created_at: model.created_date,
            hash: model.hash.unwrap_or_default(),
            id: model.id,
            mime_type: model.mime_type.unwrap_or_default(),
            name: model.name.unwrap_or_default(),
            owner_login_id: model.owner_login_id.unwrap_or_default(),
            size: model.size.unwrap_or_default(),
        }))
    }

    pub async fn read_project_logo_attachment(
        &self,
        project_id: i64,
    ) -> Result<Option<AttachmentRecord>, DbErr> {
        let Some(model) = attachment::Entity::find()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(PROJECT_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(project_id))
            .order_by_desc(attachment::Column::Id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        Ok(Some(AttachmentRecord {
            container_id: model.container_id,
            container_type: model.container_type.unwrap_or_default(),
            created_at: model.created_date,
            hash: model.hash.unwrap_or_default(),
            id: model.id,
            mime_type: model.mime_type.unwrap_or_default(),
            name: model.name.unwrap_or_default(),
            owner_login_id: model.owner_login_id.unwrap_or_default(),
            size: model.size.unwrap_or_default(),
        }))
    }

    pub async fn set_project_logo_attachment(
        &self,
        project_id: i64,
        attachment_id: i64,
        actor_id: i64,
    ) -> Result<Option<AttachmentRecord>, DbErr> {
        let Some(current) = self.read_attachment_by_id(attachment_id).await? else {
            return Ok(None);
        };
        if !can_bind_attachment(
            &current.container_type,
            current.container_id,
            PROJECT_ATTACHMENT_CONTAINER,
            project_id,
            Some(actor_id),
        ) {
            return Ok(None);
        }
        self.sync_attachments(
            PROJECT_ATTACHMENT_CONTAINER,
            project_id,
            &[attachment_id],
            Some(actor_id),
        )
        .await?;
        let Some(updated) = self.read_attachment_by_id(attachment_id).await? else {
            return Ok(None);
        };
        if updated.container_type != PROJECT_ATTACHMENT_CONTAINER
            || updated.container_id != project_id
        {
            return Ok(None);
        }
        Ok(Some(updated))
    }

    pub async fn read_organization_logo_attachment(
        &self,
        organization_id: i64,
    ) -> Result<Option<AttachmentRecord>, DbErr> {
        let Some(model) = attachment::Entity::find()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(ORGANIZATION_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(organization_id))
            .order_by_desc(attachment::Column::Id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        Ok(Some(AttachmentRecord {
            container_id: model.container_id,
            container_type: model.container_type.unwrap_or_default(),
            created_at: model.created_date,
            hash: model.hash.unwrap_or_default(),
            id: model.id,
            mime_type: model.mime_type.unwrap_or_default(),
            name: model.name.unwrap_or_default(),
            owner_login_id: model.owner_login_id.unwrap_or_default(),
            size: model.size.unwrap_or_default(),
        }))
    }

    pub async fn set_organization_logo_attachment(
        &self,
        organization_id: i64,
        attachment_id: i64,
        actor_id: i64,
    ) -> Result<Option<AttachmentRecord>, DbErr> {
        let Some(current) = self.read_attachment_by_id(attachment_id).await? else {
            return Ok(None);
        };
        if !can_bind_attachment(
            &current.container_type,
            current.container_id,
            ORGANIZATION_ATTACHMENT_CONTAINER,
            organization_id,
            Some(actor_id),
        ) {
            return Ok(None);
        }
        self.sync_attachments(
            ORGANIZATION_ATTACHMENT_CONTAINER,
            organization_id,
            &[attachment_id],
            Some(actor_id),
        )
        .await?;
        let Some(updated) = self.read_attachment_by_id(attachment_id).await? else {
            return Ok(None);
        };
        if updated.container_type != ORGANIZATION_ATTACHMENT_CONTAINER
            || updated.container_id != organization_id
        {
            return Ok(None);
        }
        Ok(Some(updated))
    }

    pub async fn delete_attachment_for_actor(
        &self,
        attachment_id: i64,
        actor_id: i64,
        actor_login_id: &str,
        actor_is_site_admin: bool,
    ) -> Result<DeleteAttachmentResult, DbErr> {
        let Some(model) = attachment::Entity::find_by_id(attachment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(DeleteAttachmentResult::NotFound);
        };

        let record = AttachmentRecord {
            container_id: model.container_id,
            container_type: model.container_type.clone().unwrap_or_default(),
            created_at: model.created_date,
            hash: model.hash.clone().unwrap_or_default(),
            id: model.id,
            mime_type: model.mime_type.clone().unwrap_or_default(),
            name: model.name.clone().unwrap_or_default(),
            owner_login_id: model.owner_login_id.clone().unwrap_or_default(),
            size: model.size.unwrap_or_default(),
        };
        let actor_login_id = normalize_identity(actor_login_id);
        let owner_login_id = normalize_identity(&record.owner_login_id);
        let owns_temporary_upload = matches!(
            record.container_type.as_str(),
            USER_ATTACHMENT_CONTAINER | USER_AVATAR_ATTACHMENT_CONTAINER
        ) && record.container_id == actor_id;
        let owns_uploaded_file = !owner_login_id.is_empty() && owner_login_id == actor_login_id;
        if !actor_is_site_admin && !owns_temporary_upload && !owns_uploaded_file {
            return Ok(DeleteAttachmentResult::Forbidden);
        }

        attachment::Entity::delete_by_id(model.id)
            .exec(&self.db)
            .await?;

        Ok(DeleteAttachmentResult::Deleted(record))
    }

    pub async fn promote_avatar_attachment_for_user(
        &self,
        user_id: i64,
        attachment_id: i64,
    ) -> Result<Option<AttachmentRecord>, DbErr> {
        let Some(model) = attachment::Entity::find_by_id(attachment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if model.container_id != user_id
            || model.container_type.as_deref() != Some(USER_ATTACHMENT_CONTAINER)
        {
            return Ok(None);
        }
        let previous_rows = attachment::Entity::find()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(USER_AVATAR_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(user_id))
            .all(&self.db)
            .await?;
        for row in previous_rows {
            attachment::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        let mut active = attachment::ActiveModel::from(model);
        active.container_type = Set(Some(USER_AVATAR_ATTACHMENT_CONTAINER.to_string()));
        let updated = active.update(&self.db).await?;
        Ok(Some(AttachmentRecord {
            container_id: updated.container_id,
            container_type: updated.container_type.unwrap_or_default(),
            created_at: updated.created_date,
            hash: updated.hash.unwrap_or_default(),
            id: updated.id,
            mime_type: updated.mime_type.unwrap_or_default(),
            name: updated.name.unwrap_or_default(),
            owner_login_id: updated.owner_login_id.unwrap_or_default(),
            size: updated.size.unwrap_or_default(),
        }))
    }

    /// Moves an existing attachment into the avatar resource for the user with
    /// the given email address, matching the legacy site-admin repair route.
    ///
    /// # Errors
    ///
    /// Returns a database error when attachment, user, or avatar rows cannot be
    /// read or updated.
    pub async fn set_user_avatar_from_attachment_by_email(
        &self,
        email_address: &str,
        attachment_id: i64,
    ) -> Result<SiteUserAvatarFromAttachmentResult, DbErr> {
        let Some(attachment_model) = attachment::Entity::find_by_id(attachment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(SiteUserAvatarFromAttachmentResult::AttachmentNotFound);
        };
        let Some(user) = self.find_user_model_by_email(email_address).await? else {
            return Ok(SiteUserAvatarFromAttachmentResult::UserNotFound);
        };
        let mime_type = attachment_model.mime_type.clone().unwrap_or_default();
        let mime_family = mime_type
            .split('/')
            .next()
            .unwrap_or_default()
            .to_ascii_lowercase();
        let is_anonymous = normalize_optional(user.login_id.as_deref()).as_deref()
            == Some(LEGACY_ANONYMOUS_LOGIN_ID);
        if mime_family != "image" || is_anonymous {
            return Ok(SiteUserAvatarFromAttachmentResult::Ignored);
        }

        let txn = self.db.begin().await?;
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(USER_AVATAR_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(user.id))
            .filter(attachment::Column::Id.ne(attachment_model.id))
            .exec(&txn)
            .await?;
        let mut active = attachment::ActiveModel::from(attachment_model);
        active.container_type = Set(Some(USER_AVATAR_ATTACHMENT_CONTAINER.to_string()));
        active.container_id = Set(user.id);
        active.update(&txn).await?;
        txn.commit().await?;

        Ok(SiteUserAvatarFromAttachmentResult::Applied)
    }
}
