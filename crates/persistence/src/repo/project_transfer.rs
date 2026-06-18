use super::*;

impl AppRepository {
    pub async fn next_project_transfer_name(
        &self,
        destination: &str,
        project_name: &str,
    ) -> Result<String, DbErr> {
        let base = project_name.trim();
        if base.is_empty() {
            return Ok(String::new());
        }
        if self
            .read_project_by_owner_and_name(destination, base)
            .await?
            .is_none()
        {
            return Ok(base.to_string());
        }
        for suffix in 1..1000 {
            let candidate = format!("{base}-{suffix}");
            if self
                .read_project_by_owner_and_name(destination, &candidate)
                .await?
                .is_none()
            {
                return Ok(candidate);
            }
        }
        Ok(format!("{base}-{}", current_timestamp_millis()))
    }

    pub async fn request_project_transfer(
        &self,
        input: ProjectTransferRequestInput,
    ) -> Result<ProjectTransferRecord, DbErr> {
        let destination = input.destination.trim().to_string();
        let confirm_key = random_transfer_confirm_key();
        let now = current_datetime();

        let row = if let Some(existing) = project_transfer::Entity::find()
            .filter(project_transfer::Column::ProjectId.eq(Some(input.project_id)))
            .filter(project_transfer::Column::SenderId.eq(Some(input.sender_id)))
            .filter(project_transfer::Column::Destination.eq(Some(destination.clone())))
            .one(&self.db)
            .await?
        {
            let mut active = project_transfer::ActiveModel::from(existing);
            active.requested = Set(Some(now));
            active.confirm_key = Set(Some(confirm_key));
            active.accepted = Set(Some(0));
            active.new_project_name = Set(Some(input.new_project_name));
            active.update(&self.db).await?
        } else {
            project_transfer::ActiveModel {
                id: NotSet,
                sender_id: Set(Some(input.sender_id)),
                destination: Set(Some(destination)),
                project_id: Set(Some(input.project_id)),
                requested: Set(Some(now)),
                confirm_key: Set(Some(confirm_key)),
                accepted: Set(Some(0)),
                new_project_name: Set(Some(input.new_project_name)),
            }
            .insert(&self.db)
            .await?
        };

        project_transfer_record_from_model(row).ok_or_else(|| {
            DbErr::Custom("project transfer row missing required fields".to_string())
        })
    }

    pub async fn read_valid_project_transfer(
        &self,
        transfer_id: i64,
    ) -> Result<Option<ProjectTransferRecord>, DbErr> {
        let Some(row) = project_transfer::Entity::find_by_id(transfer_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(record) = project_transfer_record_from_model(row) else {
            return Ok(None);
        };
        if record.accepted {
            return Ok(None);
        }
        if let Some(requested) = record.requested {
            if current_datetime()
                .signed_duration_since(requested)
                .num_seconds()
                > 24 * 60 * 60
            {
                return Ok(None);
            }
        }
        Ok(Some(record))
    }

    pub async fn accept_project_transfer(
        &self,
        transfer_id: i64,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let Some(transfer) = self.read_valid_project_transfer(transfer_id).await? else {
            return Ok(None);
        };
        let Some(project) = project::Entity::find_by_id(transfer.project_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };

        let destination_user = self.find_user_by_login_id(&transfer.destination).await?;
        let destination_organization = if destination_user.is_none() {
            self.read_organization_by_name(&transfer.destination)
                .await?
        } else {
            None
        };
        let organization_id = destination_organization
            .as_ref()
            .map(|organization| organization.id);

        let previous_owner = project.owner.clone();
        let previous_name = project.name.clone();
        let new_project_name = self
            .next_project_transfer_name(
                &transfer.destination,
                previous_name.as_deref().unwrap_or_default(),
            )
            .await?;
        let mut active_project = project::ActiveModel::from(project);
        active_project.owner = Set(Some(transfer.destination.clone()));
        active_project.name = Set(Some(new_project_name.clone()));
        active_project.organization_id = Set(organization_id);
        active_project.previous_owner_login_id = Set(previous_owner);
        active_project.previous_name = Set(previous_name);
        active_project.previous_name_changed_time = Set(Some(current_timestamp_millis()));
        let updated_project = active_project.update(&self.db).await?;

        if let Some(sender_membership) = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(updated_project.id)))
            .filter(project_user::Column::UserId.eq(Some(transfer.sender_id)))
            .one(&self.db)
            .await?
        {
            if self.role_name_for_id(sender_membership.role_id).await? == "manager" {
                self.add_project_membership(updated_project.id, transfer.sender_id, "member")
                    .await?;
            }
        }
        if let Some(destination_user) = destination_user {
            self.add_project_membership(updated_project.id, destination_user.id, "manager")
                .await?;
        }

        if let Some(row) = project_transfer::Entity::find_by_id(transfer.id)
            .one(&self.db)
            .await?
        {
            let mut active_transfer = project_transfer::ActiveModel::from(row);
            active_transfer.accepted = Set(Some(1));
            active_transfer.new_project_name = Set(Some(new_project_name));
            active_transfer.update(&self.db).await?;
        }
        self.sync_project_label_cache(&updated_project).await?;

        self.project_record_from_model(updated_project).await
    }
}
