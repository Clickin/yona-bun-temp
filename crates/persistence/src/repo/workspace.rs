use super::*;

impl AppRepository {
    pub async fn clear_recent_projects_for_user(&self, user_id: i64) -> Result<(), DbErr> {
        let rows = recent_project::Entity::find()
            .filter(recent_project::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        for row in rows {
            recent_project::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn add_workspace_email_for_user(
        &self,
        user_id: i64,
        email_address: &str,
    ) -> Result<(), DbErr> {
        let normalized_email = normalize_identity(email_address);
        if normalized_email.is_empty() {
            return Err(DbErr::Custom("Email address is required.".to_string()));
        }
        if !looks_like_email_address(&normalized_email) {
            return Err(DbErr::Custom("Email address is invalid.".to_string()));
        }

        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };
        if normalize_optional(user.email.as_deref()).as_deref() == Some(normalized_email.as_str()) {
            return Err(DbErr::Custom(
                "Email address is already in use.".to_string(),
            ));
        }

        let duplicate = email::Entity::find()
            .filter(email::Column::Email.eq(Some(normalized_email.clone())))
            .one(&self.db)
            .await?;
        if duplicate.is_some() {
            return Err(DbErr::Custom(
                "Email address is already in use.".to_string(),
            ));
        }

        email::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            email: Set(Some(normalized_email)),
            valid: Set(Some(0)),
            token: Set(Some(random_workspace_token())),
        }
        .insert(&self.db)
        .await?;

        Ok(())
    }

    pub async fn delete_workspace_email_for_user(
        &self,
        user_id: i64,
        email_id: i64,
    ) -> Result<(), DbErr> {
        let Some(model) = email::Entity::find_by_id(email_id).one(&self.db).await? else {
            return Err(DbErr::Custom("Email not found.".to_string()));
        };
        if model.user_id != Some(user_id) {
            return Err(DbErr::Custom("Email not found.".to_string()));
        }
        email::Entity::delete_by_id(email_id).exec(&self.db).await?;
        Ok(())
    }

    pub async fn send_workspace_email_validation_for_user(
        &self,
        user_id: i64,
        email_id: i64,
    ) -> Result<(), DbErr> {
        let Some(model) = email::Entity::find_by_id(email_id).one(&self.db).await? else {
            return Err(DbErr::Custom("Email not found.".to_string()));
        };
        if model.user_id != Some(user_id) {
            return Err(DbErr::Custom("Email not found.".to_string()));
        }
        let mut active = email::ActiveModel::from(model);
        active.token = Set(Some(random_workspace_token()));
        active.update(&self.db).await?;
        Ok(())
    }

    pub async fn read_workspace_email_token_for_user(
        &self,
        user_id: i64,
        email_id: i64,
    ) -> Result<Option<(String, String)>, DbErr> {
        let Some(model) = email::Entity::find_by_id(email_id).one(&self.db).await? else {
            return Ok(None);
        };
        if model.user_id != Some(user_id) {
            return Ok(None);
        }
        match (model.email, model.token) {
            (Some(address), Some(token)) => Ok(Some((address, token))),
            _ => Ok(None),
        }
    }

    pub async fn confirm_workspace_email_for_user(
        &self,
        email_id: i64,
        token: &str,
    ) -> Result<Option<i64>, DbErr> {
        let Some(model) = email::Entity::find_by_id(email_id).one(&self.db).await? else {
            return Ok(None);
        };
        if model.token.as_deref() != Some(token) {
            return Ok(None);
        }

        let user_id = model.user_id;
        let email_address = model.email.clone();
        let mut active = email::ActiveModel::from(model);
        active.valid = Set(Some(1));
        active.token = Set(None);
        active.update(&self.db).await?;

        if let Some(email_address) = email_address {
            let invalid_rows = email::Entity::find()
                .filter(email::Column::Email.eq(Some(email_address)))
                .filter(email::Column::Valid.eq(Some(0)))
                .all(&self.db)
                .await?;
            for row in invalid_rows {
                email::Entity::delete_by_id(row.id).exec(&self.db).await?;
            }
        }

        Ok(user_id)
    }

    pub async fn set_main_workspace_email_for_user(
        &self,
        user_id: i64,
        email_id: i64,
    ) -> Result<AppUserRecord, DbErr> {
        let Some(selected_email) = email::Entity::find_by_id(email_id).one(&self.db).await? else {
            return Err(DbErr::Custom("Email not found.".to_string()));
        };
        if selected_email.user_id != Some(user_id) {
            return Err(DbErr::Custom("Email not found.".to_string()));
        }
        if selected_email.valid.unwrap_or_default() == 0 {
            return Err(DbErr::Custom("Email must be validated first.".to_string()));
        }
        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };

        let old_main_email = user.email.clone().unwrap_or_default();
        let selected_value = selected_email.email.clone().unwrap_or_default();

        let mut user_active = n4user::ActiveModel::from(user);
        user_active.email = Set(Some(selected_value));
        let updated_user = user_active.update(&self.db).await?;

        email::Entity::delete_by_id(email_id).exec(&self.db).await?;
        if !old_main_email.is_empty() {
            email::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                email: Set(Some(normalize_identity(&old_main_email))),
                valid: Set(Some(1)),
                token: Set(None),
            }
            .insert(&self.db)
            .await?;
        }

        self.app_user_record_from_model(updated_user).await
    }
}
