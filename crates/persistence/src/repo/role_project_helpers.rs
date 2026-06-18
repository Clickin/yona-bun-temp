use super::*;

impl AppRepository {
    pub(super) async fn ensure_site_admin(&self, user_id: i64) -> Result<(), DbErr> {
        if site_admin::Entity::find()
            .filter(site_admin::Column::AdminId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_none()
        {
            site_admin::ActiveModel {
                id: NotSet,
                admin_id: Set(Some(user_id)),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(())
    }

    pub(super) async fn ensure_role_id(&self, role_name: &str) -> Result<i64, DbErr> {
        let normalized = normalize_identity(role_name);
        let roles = role::Entity::find().all(&self.db).await?;
        for existing in roles {
            if normalize_optional(existing.name.as_deref()).as_deref() == Some(normalized.as_str())
            {
                return Ok(existing.id);
            }
        }

        let created = role::ActiveModel {
            id: NotSet,
            name: Set(Some(role_name.to_string())),
            active: Set(Some(1)),
        }
        .insert(&self.db)
        .await?;

        Ok(created.id)
    }

    pub(super) async fn role_name_for_id(&self, role_id: Option<i64>) -> Result<String, DbErr> {
        let Some(role_id) = role_id else {
            return Ok(String::new());
        };

        Ok(role::Entity::find_by_id(role_id)
            .one(&self.db)
            .await?
            .and_then(|row| row.name)
            .unwrap_or_default())
    }

    pub(super) async fn sync_project_label_cache(
        &self,
        project_model: &project::Model,
    ) -> Result<(), DbErr> {
        let owner = project_model.owner.clone();
        let name = project_model.name.clone();

        let favorites = favorite_project::Entity::find()
            .filter(favorite_project::Column::ProjectId.eq(Some(project_model.id)))
            .all(&self.db)
            .await?;
        for favorite in favorites {
            let mut active = favorite_project::ActiveModel::from(favorite);
            active.owner = Set(owner.clone());
            active.project_name = Set(name.clone());
            active.update(&self.db).await?;
        }

        let recents = recent_project::Entity::find()
            .filter(recent_project::Column::ProjectId.eq(Some(project_model.id)))
            .all(&self.db)
            .await?;
        for recent in recents {
            let mut active = recent_project::ActiveModel::from(recent);
            active.owner = Set(owner.clone());
            active.project_name = Set(name.clone());
            active.update(&self.db).await?;
        }

        Ok(())
    }
}
