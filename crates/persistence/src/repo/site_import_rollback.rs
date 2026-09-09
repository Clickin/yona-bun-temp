use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn read_site_import_project_counter_snapshot(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Option<SiteImportProjectCounterSnapshot>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        let Some(row) = project::Entity::find_by_id(project_record.id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        Ok(Some(SiteImportProjectCounterSnapshot {
            id: row.id,
            last_issue_number: row.last_issue_number.unwrap_or_default(),
            last_posting_number: row.last_posting_number.unwrap_or_default(),
            owner_name: project_record.owner_name,
            project_name: project_record.project_name,
        }))
    }

    pub async fn restore_site_import_project_counter_snapshot(
        &self,
        snapshot: &SiteImportProjectCounterSnapshot,
        max_import_issue_number: i64,
        max_import_posting_number: i64,
    ) -> Result<bool, DbErr> {
        let Some(current) = project::Entity::find_by_id(snapshot.id)
            .one(&self.db)
            .await?
        else {
            return Ok(false);
        };
        let mut active = project::ActiveModel {
            id: Set(snapshot.id),
            ..Default::default()
        };
        let mut changed = false;
        let current_issue_number = current.last_issue_number.unwrap_or_default();
        if max_import_issue_number > snapshot.last_issue_number
            && current_issue_number <= max_import_issue_number
        {
            active.last_issue_number = Set(Some(snapshot.last_issue_number));
            changed = true;
        }
        let current_posting_number = current.last_posting_number.unwrap_or_default();
        if max_import_posting_number > snapshot.last_posting_number
            && current_posting_number <= max_import_posting_number
        {
            active.last_posting_number = Set(Some(snapshot.last_posting_number));
            changed = true;
        }
        if changed {
            active.update(&self.db).await?;
        }
        Ok(changed)
    }

    pub async fn restore_site_import_project_created_at(
        &self,
        owner_name: &str,
        project_name: &str,
        created_at: Option<DateTime>,
    ) -> Result<bool, DbErr> {
        let Some(created_at) = created_at else {
            return Ok(false);
        };
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(false);
        };
        project::ActiveModel {
            id: Set(project_record.id),
            created_date: Set(Some(created_at)),
            ..Default::default()
        }
        .update(&self.db)
        .await?;
        Ok(true)
    }

    pub async fn restore_site_import_user_timestamps(
        &self,
        login_id: &str,
        created_at: Option<DateTime>,
        last_state_modified_at: Option<DateTime>,
    ) -> Result<bool, DbErr> {
        let normalized_login_id = normalize_identity(login_id);
        if normalized_login_id.is_empty()
            || (created_at.is_none() && last_state_modified_at.is_none())
        {
            return Ok(false);
        }
        let Some(user) = n4user::Entity::find()
            .filter(n4user::Column::LoginId.eq(Some(normalized_login_id)))
            .one(&self.db)
            .await?
        else {
            return Ok(false);
        };
        let mut active = n4user::ActiveModel {
            id: Set(user.id),
            ..Default::default()
        };
        if let Some(created_at) = created_at {
            active.created_date = Set(Some(created_at));
        }
        if let Some(last_state_modified_at) = last_state_modified_at {
            active.last_state_modified_date = Set(Some(last_state_modified_at));
        }
        active.update(&self.db).await?;
        Ok(true)
    }

    pub async fn restore_site_import_attachment_created_at(
        &self,
        attachment_id: i64,
        created_at: Option<DateTime>,
    ) -> Result<bool, DbErr> {
        let Some(created_at) = created_at else {
            return Ok(false);
        };
        if attachment::Entity::find_by_id(attachment_id)
            .one(&self.db)
            .await?
            .is_none()
        {
            return Ok(false);
        }
        attachment::ActiveModel {
            id: Set(attachment_id),
            created_date: Set(Some(created_at)),
            ..Default::default()
        }
        .update(&self.db)
        .await?;
        Ok(true)
    }

    pub async fn delete_site_import_attachment_row(
        &self,
        attachment_id: i64,
    ) -> Result<Option<(AttachmentRecord, bool)>, DbErr> {
        let Some(model) = attachment::Entity::find_by_id(attachment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
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
        let (_write_guard, txn, txn_started_at) = self.begin_serialized_write().await?;
        attachment::Entity::delete_by_id(model.id)
            .exec(&txn)
            .await?;
        let has_reference = !record.hash.is_empty()
            && attachment::Entity::find()
                .filter(attachment::Column::Hash.eq(Some(record.hash.clone())))
                .one(&txn)
                .await?
                .is_some();
        self.commit_serialized_write(txn, _write_guard, txn_started_at)
            .await?;
        Ok(Some((record, !has_reference)))
    }

    pub async fn read_site_import_attachment_snapshot(
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

    pub async fn restore_site_import_attachment_snapshot(
        &self,
        snapshot: &AttachmentRecord,
    ) -> Result<bool, DbErr> {
        if attachment::Entity::find_by_id(snapshot.id)
            .one(&self.db)
            .await?
            .is_none()
        {
            return Ok(false);
        }
        attachment::ActiveModel {
            id: Set(snapshot.id),
            container_id: Set(snapshot.container_id),
            container_type: Set(Some(snapshot.container_type.clone())),
            created_date: Set(snapshot.created_at),
            hash: Set(Some(snapshot.hash.clone())),
            mime_type: Set(Some(snapshot.mime_type.clone())),
            name: Set(Some(snapshot.name.clone())),
            owner_login_id: Set(Some(snapshot.owner_login_id.clone())),
            size: Set(Some(snapshot.size)),
            ..Default::default()
        }
        .update(&self.db)
        .await?;
        Ok(true)
    }

    pub async fn delete_site_import_posting_by_number(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
    ) -> Result<bool, DbErr> {
        let Some((_project, model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(false);
        };
        let comment_ids = posting_comment::Entity::find()
            .filter(posting_comment::Column::PostingId.eq(Some(model.id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|comment| comment.id)
            .collect::<Vec<_>>();
        if !comment_ids.is_empty() {
            attachment::Entity::delete_many()
                .filter(
                    attachment::Column::ContainerType.is_in(
                        attachment_container_aliases(BOARD_COMMENT_ATTACHMENT_CONTAINER)
                            .into_iter()
                            .map(Some),
                    ),
                )
                .filter(attachment::Column::ContainerId.is_in(comment_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(BOARD_POST_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(model.id))
            .exec(&self.db)
            .await?;
        recent_issue::Entity::delete_many()
            .filter(recent_issue::Column::PostingId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        posting_issue_label::Entity::delete_many()
            .filter(posting_issue_label::Column::PostingId.eq(model.id))
            .exec(&self.db)
            .await?;
        if !comment_ids.is_empty() {
            mention::Entity::delete_many()
                .filter(mention::Column::ResourceType.eq(Some("posting_comment".to_string())))
                .filter(
                    mention::Column::ResourceId
                        .is_in(comment_ids.iter().map(|id| Some(id.to_string()))),
                )
                .exec(&self.db)
                .await?;
        }
        posting_comment::Entity::delete_many()
            .filter(posting_comment::Column::PostingId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(model.id.to_string())))
            .exec(&self.db)
            .await?;
        mention::Entity::delete_many()
            .filter(mention::Column::ResourceType.eq(Some("posting".to_string())))
            .filter(mention::Column::ResourceId.eq(Some(model.id.to_string())))
            .exec(&self.db)
            .await?;
        posting::Entity::delete_by_id(model.id)
            .exec(&self.db)
            .await?;
        Ok(true)
    }

    pub async fn restore_site_import_posting_timestamps(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
        created_at: Option<DateTime>,
        updated_at: Option<DateTime>,
    ) -> Result<bool, DbErr> {
        let Some((_project, model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(false);
        };
        if created_at.is_none() && updated_at.is_none() {
            return Ok(false);
        }
        let mut active = posting::ActiveModel {
            id: Set(model.id),
            ..Default::default()
        };
        if let Some(created_at) = created_at {
            active.created_date = Set(Some(created_at));
        }
        if let Some(updated_at) = updated_at {
            active.updated_date = Set(Some(updated_at));
        }
        active.update(&self.db).await?;
        Ok(true)
    }

    pub async fn restore_site_import_issue_timestamps(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        created_at: Option<DateTime>,
        updated_at: Option<DateTime>,
    ) -> Result<bool, DbErr> {
        let Some((_project, model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(false);
        };
        if created_at.is_none() && updated_at.is_none() {
            return Ok(false);
        }
        let mut active = issue::ActiveModel {
            id: Set(model.id),
            ..Default::default()
        };
        if let Some(created_at) = created_at {
            active.created_date = Set(Some(created_at));
        }
        if let Some(updated_at) = updated_at {
            active.updated_date = Set(Some(updated_at));
        }
        active.update(&self.db).await?;
        Ok(true)
    }

    pub async fn restore_site_import_issue_comment_created_at(
        &self,
        comment_id: i64,
        created_at: Option<DateTime>,
    ) -> Result<bool, DbErr> {
        let Some(created_at) = created_at else {
            return Ok(false);
        };
        if issue_comment::Entity::find_by_id(comment_id)
            .one(&self.db)
            .await?
            .is_none()
        {
            return Ok(false);
        }
        issue_comment::ActiveModel {
            id: Set(comment_id),
            created_date: Set(Some(created_at)),
            ..Default::default()
        }
        .update(&self.db)
        .await?;
        Ok(true)
    }

    pub async fn delete_site_import_issue_by_number(
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
        let comment_ids = issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(model.id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|comment| comment.id)
            .collect::<Vec<_>>();
        if !comment_ids.is_empty() {
            attachment::Entity::delete_many()
                .filter(
                    attachment::Column::ContainerType
                        .eq(Some(ISSUE_COMMENT_ATTACHMENT_CONTAINER.to_string())),
                )
                .filter(attachment::Column::ContainerId.is_in(comment_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }
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
        favorite_issue::Entity::delete_many()
            .filter(favorite_issue::Column::IssueId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        recent_issue::Entity::delete_many()
            .filter(recent_issue::Column::IssueId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
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
        issue_sharer::Entity::delete_many()
            .filter(issue_sharer::Column::IssueId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        if !comment_ids.is_empty() {
            issue_comment_voter::Entity::delete_many()
                .filter(issue_comment_voter::Column::IssueCommentId.is_in(comment_ids.clone()))
                .exec(&self.db)
                .await?;
            mention::Entity::delete_many()
                .filter(mention::Column::ResourceType.eq(Some("issue_comment".to_string())))
                .filter(
                    mention::Column::ResourceId
                        .is_in(comment_ids.iter().map(|id| Some(id.to_string()))),
                )
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
        mention::Entity::delete_many()
            .filter(mention::Column::ResourceType.eq(Some("issue_post".to_string())))
            .filter(mention::Column::ResourceId.eq(Some(model.id.to_string())))
            .exec(&self.db)
            .await?;
        issue::Entity::delete_by_id(model.id).exec(&self.db).await?;
        Ok(true)
    }

    pub async fn delete_site_import_milestone_by_id(
        &self,
        owner_name: &str,
        project_name: &str,
        milestone_id: i64,
    ) -> Result<bool, DbErr> {
        let Some((project, row)) = self
            .read_project_milestone_model(owner_name, project_name, milestone_id)
            .await?
        else {
            return Ok(false);
        };
        issue::Entity::update_many()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .col_expr(issue::Column::MilestoneId, Expr::value(Option::<i64>::None))
            .exec(&self.db)
            .await?;
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(MILESTONE_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(row.id))
            .exec(&self.db)
            .await?;
        milestone::Entity::delete_by_id(row.id)
            .exec(&self.db)
            .await?;
        Ok(true)
    }

    pub async fn delete_site_import_project_shell_by_id(
        &self,
        project_id: i64,
    ) -> Result<bool, DbErr> {
        let Some(project) = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?
        else {
            return Ok(false);
        };
        let issue_ids = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        let issue_comment_ids = if issue_ids.is_empty() {
            Vec::new()
        } else {
            issue_comment::Entity::find()
                .filter(issue_comment::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .all(&self.db)
                .await?
                .into_iter()
                .map(|row| row.id)
                .collect::<Vec<_>>()
        };
        let posting_ids = posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        let project_attachments = self
            .list_project_attachments_for_cleanup(project_id)
            .await?;
        if !project_attachments.is_empty() {
            attachment::Entity::delete_many()
                .filter(
                    attachment::Column::Id
                        .is_in(project_attachments.iter().map(|attachment| attachment.id)),
                )
                .exec(&self.db)
                .await?;
        }
        let project_resource_id = project_id.to_string();
        let issue_label_ids = issue_label::Entity::find()
            .filter(issue_label::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        if !issue_comment_ids.is_empty() {
            issue_comment_voter::Entity::delete_many()
                .filter(
                    issue_comment_voter::Column::IssueCommentId
                        .is_in(issue_comment_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
        }
        if !issue_ids.is_empty() {
            favorite_issue::Entity::delete_many()
                .filter(favorite_issue::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            recent_issue::Entity::delete_many()
                .filter(recent_issue::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue_event::Entity::delete_many()
                .filter(issue_event::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue_issue_label::Entity::delete_many()
                .filter(issue_issue_label::Column::IssueId.is_in(issue_ids.iter().copied()))
                .exec(&self.db)
                .await?;
            issue_sharer::Entity::delete_many()
                .filter(issue_sharer::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue_voter::Entity::delete_many()
                .filter(issue_voter::Column::IssueId.is_in(issue_ids.iter().copied()))
                .exec(&self.db)
                .await?;
            issue_comment::Entity::delete_many()
                .filter(issue_comment::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue::Entity::delete_many()
                .filter(issue::Column::Id.is_in(issue_ids))
                .exec(&self.db)
                .await?;
        }
        if !posting_ids.is_empty() {
            recent_issue::Entity::delete_many()
                .filter(
                    recent_issue::Column::PostingId.is_in(posting_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            posting_issue_label::Entity::delete_many()
                .filter(posting_issue_label::Column::PostingId.is_in(posting_ids.iter().copied()))
                .exec(&self.db)
                .await?;
            posting_comment::Entity::delete_many()
                .filter(
                    posting_comment::Column::PostingId.is_in(posting_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            posting::Entity::delete_many()
                .filter(posting::Column::Id.is_in(posting_ids))
                .exec(&self.db)
                .await?;
        }
        if !issue_label_ids.is_empty() {
            issue_issue_label::Entity::delete_many()
                .filter(
                    issue_issue_label::Column::IssueLabelId.is_in(issue_label_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
            posting_issue_label::Entity::delete_many()
                .filter(
                    posting_issue_label::Column::IssueLabelId
                        .is_in(issue_label_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
            issue_label::Entity::delete_many()
                .filter(issue_label::Column::Id.is_in(issue_label_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }
        issue_label_category::Entity::delete_many()
            .filter(issue_label_category::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        milestone::Entity::delete_many()
            .filter(milestone::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        assignee::Entity::delete_many()
            .filter(assignee::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        commit_comment::Entity::delete_many()
            .filter(commit_comment::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_transfer::Entity::delete_many()
            .filter(project_transfer::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_pushed_branch::Entity::delete_many()
            .filter(project_pushed_branch::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_label::Entity::delete_many()
            .filter(project_label::Column::ProjectId.eq(project_id))
            .exec(&self.db)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_resource_id.clone())))
            .exec(&self.db)
            .await?;
        unwatch::Entity::delete_many()
            .filter(unwatch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(unwatch::Column::ResourceId.eq(Some(project_resource_id)))
            .exec(&self.db)
            .await?;
        project_user::Entity::delete_many()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_menu_setting::Entity::delete_many()
            .filter(project_menu_setting::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        user_project_notification::Entity::delete_many()
            .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_visitation::Entity::delete_many()
            .filter(project_visitation::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        recent_project::Entity::delete_many()
            .filter(recent_project::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        favorite_project::Entity::delete_many()
            .filter(favorite_project::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        user_enrolled_project::Entity::delete_many()
            .filter(user_enrolled_project::Column::ProjectId.eq(project_id))
            .exec(&self.db)
            .await?;
        project::Entity::delete_by_id(project.id)
            .exec(&self.db)
            .await?;
        Ok(true)
    }

    pub async fn delete_site_import_user_by_id(&self, user_id: i64) -> Result<bool, DbErr> {
        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Ok(false);
        };
        let credential_ids = user_credential::Entity::find()
            .filter(user_credential::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        if !credential_ids.is_empty() {
            linked_account::Entity::delete_many()
                .filter(linked_account::Column::UserCredentialId.is_in(credential_ids.clone()))
                .exec(&self.db)
                .await?;
            user_credential::Entity::delete_many()
                .filter(user_credential::Column::Id.is_in(credential_ids))
                .exec(&self.db)
                .await?;
        }
        site_admin::Entity::delete_many()
            .filter(site_admin::Column::AdminId.eq(Some(user_id)))
            .exec(&self.db)
            .await?;
        project_user::Entity::delete_many()
            .filter(project_user::Column::UserId.eq(Some(user_id)))
            .exec(&self.db)
            .await?;
        user_enrolled_project::Entity::delete_many()
            .filter(user_enrolled_project::Column::UserId.eq(user_id))
            .exec(&self.db)
            .await?;
        user_enrolled_organization::Entity::delete_many()
            .filter(user_enrolled_organization::Column::UserId.eq(user_id))
            .exec(&self.db)
            .await?;
        user_project_notification::Entity::delete_many()
            .filter(user_project_notification::Column::UserId.eq(Some(user_id)))
            .exec(&self.db)
            .await?;
        user_setting::Entity::delete_many()
            .filter(user_setting::Column::UserId.eq(Some(user_id)))
            .exec(&self.db)
            .await?;
        user_verification::Entity::delete_many()
            .filter(user_verification::Column::UserId.eq(Some(user_id)))
            .exec(&self.db)
            .await?;
        recent_issue::Entity::delete_many()
            .filter(recent_issue::Column::UserId.eq(Some(user_id)))
            .exec(&self.db)
            .await?;
        notification_event_n4user::Entity::delete_many()
            .filter(notification_event_n4user::Column::N4userId.eq(user_id))
            .exec(&self.db)
            .await?;
        mention::Entity::delete_many()
            .filter(mention::Column::UserId.eq(Some(user_id)))
            .exec(&self.db)
            .await?;
        let sent_notification_ids = notification_event::Entity::find()
            .filter(notification_event::Column::SenderId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        for notification_id in sent_notification_ids {
            self.delete_notification_event_rows(notification_id).await?;
        }
        n4user::Entity::delete_by_id(user.id).exec(&self.db).await?;
        Ok(true)
    }
}
