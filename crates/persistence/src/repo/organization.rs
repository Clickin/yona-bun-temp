use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn create_organization(
        &self,
        input: CreateOrganizationInput,
    ) -> Result<OrganizationRecord, DbErr> {
        let created = organization::ActiveModel {
            id: NotSet,
            name: Set(Some(input.organization_name.trim().to_string())),
            created: Set(None),
            descr: Set(empty_to_none(input.description)),
        }
        .insert(&self.db)
        .await?;

        self.organization_record_from_model(created)
            .ok_or_else(|| DbErr::Custom("organization name missing".to_string()))
    }

    pub async fn organization_name_exists(&self, organization_name: &str) -> Result<bool, DbErr> {
        let normalized = normalize_identity(organization_name);
        if normalized.is_empty() {
            return Ok(false);
        }

        let rows = organization::Entity::find().all(&self.db).await?;
        Ok(rows.into_iter().any(|row| {
            normalize_optional(row.name.as_deref()).as_deref() == Some(normalized.as_str())
        }))
    }

    pub async fn read_organization_by_name(
        &self,
        organization_name: &str,
    ) -> Result<Option<OrganizationRecord>, DbErr> {
        let normalized = normalize_identity(organization_name);
        if normalized.is_empty() {
            return Ok(None);
        }

        let rows = organization::Entity::find().all(&self.db).await?;
        for row in rows {
            if normalize_optional(row.name.as_deref()).as_deref() == Some(normalized.as_str()) {
                return Ok(self.organization_record_from_model(row));
            }
        }

        Ok(None)
    }

    pub async fn read_organization_by_id(
        &self,
        organization_id: i64,
    ) -> Result<Option<OrganizationRecord>, DbErr> {
        let Some(row) = organization::Entity::find_by_id(organization_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        Ok(self.organization_record_from_model(row))
    }

    pub async fn toggle_favorite_organization(
        &self,
        user_id: i64,
        organization_id: i64,
    ) -> Result<Option<bool>, DbErr> {
        let Some(organization) = self.read_organization_by_id(organization_id).await? else {
            return Ok(None);
        };

        if let Some(existing) = favorite_organization::Entity::find()
            .filter(favorite_organization::Column::UserId.eq(Some(user_id)))
            .filter(favorite_organization::Column::OrganizationId.eq(Some(organization.id)))
            .one(&self.db)
            .await?
        {
            favorite_organization::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
            return Ok(Some(false));
        }

        favorite_organization::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            organization_id: Set(Some(organization.id)),
            organization_name: Set(Some(organization.organization_name)),
        }
        .insert(&self.db)
        .await?;
        Ok(Some(true))
    }

    pub async fn list_legacy_favorite_organizations_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<(i64, String)>, DbErr> {
        let rows = favorite_organization::Entity::find()
            .filter(favorite_organization::Column::UserId.eq(Some(user_id)))
            .order_by_desc(favorite_organization::Column::Id)
            .all(&self.db)
            .await?;
        let mut organizations = Vec::new();
        for row in rows {
            let Some(organization_id) = row.organization_id else {
                continue;
            };
            let organization_row = organization::Entity::find_by_id(organization_id)
                .one(&self.db)
                .await?;
            let organization_name = row
                .organization_name
                .or_else(|| organization_row.as_ref().and_then(|item| item.name.clone()));
            if let Some(organization_name) = organization_name {
                organizations.push((organization_id, organization_name));
            }
        }
        Ok(organizations)
    }

    pub async fn add_organization_membership(
        &self,
        organization_id: i64,
        user_id: i64,
        role_name: &str,
    ) -> Result<(), DbErr> {
        let role_id = self.ensure_role_id(role_name).await?;

        if let Some(existing) = organization_user::Entity::find()
            .filter(organization_user::Column::OrganizationId.eq(Some(organization_id)))
            .filter(organization_user::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            let mut active = organization_user::ActiveModel::from(existing);
            active.role_id = Set(Some(role_id));
            active.update(&self.db).await?;
            return Ok(());
        }

        organization_user::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            organization_id: Set(Some(organization_id)),
            role_id: Set(Some(role_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(())
    }

    pub async fn delete_organization_membership(
        &self,
        organization_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        if let Some(existing) = organization_user::Entity::find()
            .filter(organization_user::Column::OrganizationId.eq(Some(organization_id)))
            .filter(organization_user::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            organization_user::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn create_organization_enrollment_request(
        &self,
        organization_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        if user_enrolled_organization::Entity::find_by_id((user_id, organization_id))
            .one(&self.db)
            .await?
            .is_none()
        {
            user_enrolled_organization::ActiveModel {
                user_id: Set(user_id),
                organization_id: Set(organization_id),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn delete_organization_enrollment_request(
        &self,
        organization_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        user_enrolled_organization::Entity::delete_by_id((user_id, organization_id))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn delete_organization_by_name(
        &self,
        organization_name: &str,
    ) -> Result<bool, DbErr> {
        let Some(organization) = self.read_organization_by_name(organization_name).await? else {
            return Ok(false);
        };

        user_enrolled_organization::Entity::delete_many()
            .filter(user_enrolled_organization::Column::OrganizationId.eq(organization.id))
            .exec(&self.db)
            .await?;
        organization_user::Entity::delete_many()
            .filter(organization_user::Column::OrganizationId.eq(Some(organization.id)))
            .exec(&self.db)
            .await?;
        favorite_organization::Entity::delete_many()
            .filter(favorite_organization::Column::OrganizationId.eq(Some(organization.id)))
            .exec(&self.db)
            .await?;
        organization::Entity::delete_by_id(organization.id)
            .exec(&self.db)
            .await?;
        Ok(true)
    }

    pub async fn update_organization(
        &self,
        input: UpdateOrganizationInput,
    ) -> Result<Option<OrganizationRecord>, DbErr> {
        let normalized_current = normalize_identity(&input.current_organization_name);
        let rows = organization::Entity::find().all(&self.db).await?;
        let Some(current) = rows.into_iter().find(|row| {
            normalize_optional(row.name.as_deref()).as_deref() == Some(normalized_current.as_str())
        }) else {
            return Ok(None);
        };

        let previous_name = current.name.clone().unwrap_or_default();
        let mut active = organization::ActiveModel::from(current);
        active.name = Set(Some(input.organization_name.trim().to_string()));
        active.descr = Set(empty_to_none(input.description));
        let updated = active.update(&self.db).await?;
        let updated_record = self
            .organization_record_from_model(updated.clone())
            .ok_or_else(|| DbErr::Custom("organization name missing after update".to_string()))?;

        if normalize_identity(&previous_name)
            != normalize_identity(&updated_record.organization_name)
        {
            let projects = project::Entity::find()
                .filter(project::Column::OrganizationId.eq(Some(updated.id)))
                .all(&self.db)
                .await?;
            for row in projects {
                let mut active_project = project::ActiveModel::from(row.clone());
                active_project.owner = Set(Some(updated_record.organization_name.clone()));
                let updated_project = active_project.update(&self.db).await?;
                self.sync_project_label_cache(&updated_project).await?;
            }
        }

        Ok(Some(updated_record))
    }
}
