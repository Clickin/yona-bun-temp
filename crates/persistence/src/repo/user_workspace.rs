use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn list_workspace_emails_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<WorkspaceEmailRecord>, DbErr> {
        let rows = email::Entity::find()
            .filter(email::Column::UserId.eq(Some(user_id)))
            .order_by_asc(email::Column::Id)
            .all(&self.db)
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| {
                Some(WorkspaceEmailRecord {
                    email_address: row.email?,
                    id: row.id.to_string(),
                    valid: row.valid.unwrap_or_default() != 0,
                })
            })
            .collect())
    }

    pub async fn read_api_token_for_user(&self, user_id: i64) -> Result<Option<String>, DbErr> {
        Ok(n4user::Entity::find_by_id(user_id)
            .one(&self.db)
            .await?
            .and_then(|row| row.token))
    }

    pub async fn read_user_id_by_api_token(&self, token: &str) -> Result<Option<i64>, DbErr> {
        let token = token.trim();
        if token.is_empty() {
            return Ok(None);
        }
        Ok(n4user::Entity::find()
            .filter(n4user::Column::Token.eq(Some(token.to_string())))
            .one(&self.db)
            .await?
            .filter(|user| {
                !matches!(
                    normalize_optional(user.state.as_deref()).as_deref(),
                    Some("locked" | "deleted")
                )
            })
            .map(|row| row.id))
    }

    pub async fn reset_api_token_for_user(&self, user_id: i64) -> Result<String, DbErr> {
        let Some(model) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };
        let token = random_workspace_token();
        let mut active = n4user::ActiveModel::from(model);
        active.token = Set(Some(token.clone()));
        active.update(&self.db).await?;
        Ok(token)
    }

    pub async fn update_profile_for_user(
        &self,
        user_id: i64,
        name: &str,
        email_address: &str,
    ) -> Result<AppUserRecord, DbErr> {
        let Some(model) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };
        let normalized_email = normalize_identity(email_address);
        if normalized_email.is_empty() {
            return Err(DbErr::Custom("Email address is required.".to_string()));
        }
        if !looks_like_email_address(&normalized_email) {
            return Err(DbErr::Custom("Email address is invalid.".to_string()));
        }

        let duplicate_email = n4user::Entity::find()
            .filter(n4user::Column::Id.ne(user_id))
            .all(&self.db)
            .await?
            .into_iter()
            .any(|row| {
                normalize_optional(row.email.as_deref()).as_deref()
                    == Some(normalized_email.as_str())
            });
        if duplicate_email {
            return Err(DbErr::Custom(
                "Email address is already in use.".to_string(),
            ));
        }
        let duplicate_valid_secondary = email::Entity::find()
            .filter(email::Column::Email.eq(Some(normalized_email.clone())))
            .filter(email::Column::Valid.eq(Some(1)))
            .one(&self.db)
            .await?;
        if duplicate_valid_secondary.is_some() {
            return Err(DbErr::Custom(
                "Email address is already in use.".to_string(),
            ));
        }

        let mut active = n4user::ActiveModel::from(model);
        active.name = Set(Some(name.trim().to_string()));
        active.email = Set(Some(normalized_email));
        let updated = active.update(&self.db).await?;
        self.app_user_record_from_model(updated).await
    }

    pub async fn update_password_hash_for_user(
        &self,
        user_id: i64,
        password_hash: &str,
    ) -> Result<(), DbErr> {
        let Some(model) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };
        let mut active = n4user::ActiveModel::from(model);
        active.password = Set(Some(password_hash.to_string()));
        active.update(&self.db).await?;
        Ok(())
    }

    pub async fn mark_user_confirmed(&self, user_id: i64) -> Result<AppUserRecord, DbErr> {
        let Some(model) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Err(DbErr::Custom("User not found.".to_string()));
        };
        let mut active = n4user::ActiveModel::from(model);
        active.state = Set(user_state_from_confirmed(true));
        let updated = active.update(&self.db).await?;
        self.app_user_record_from_model(updated).await
    }

    pub async fn create_password_reset_verification_for_user(
        &self,
        user_id: i64,
        login_id: &str,
    ) -> Result<String, DbErr> {
        let code = prefixed_verification_code(PASSWORD_RESET_VERIFICATION_PREFIX);
        let rows = user_verification::Entity::find()
            .filter(user_verification::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        for row in rows.into_iter().filter(|row| {
            row.verification_code
                .as_deref()
                .unwrap_or_default()
                .starts_with(PASSWORD_RESET_VERIFICATION_PREFIX)
        }) {
            user_verification::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        user_verification::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            login_id: Set(Some(login_id.to_string())),
            verification_code: Set(Some(code.clone())),
            timestamp: Set(Some(current_timestamp_millis())),
        }
        .insert(&self.db)
        .await?;
        Ok(code)
    }

    pub async fn create_signup_verification_for_user(
        &self,
        user_id: i64,
        login_id: &str,
    ) -> Result<String, DbErr> {
        let code = prefixed_verification_code(SIGNUP_VERIFICATION_PREFIX);
        let rows = user_verification::Entity::find()
            .filter(user_verification::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        for row in rows.into_iter().filter(|row| {
            row.verification_code
                .as_deref()
                .unwrap_or_default()
                .starts_with(SIGNUP_VERIFICATION_PREFIX)
        }) {
            user_verification::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        user_verification::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            login_id: Set(Some(login_id.to_string())),
            verification_code: Set(Some(code.clone())),
            timestamp: Set(Some(current_timestamp_millis())),
        }
        .insert(&self.db)
        .await?;
        Ok(code)
    }

    pub async fn find_valid_password_reset_user_id(
        &self,
        verification_code: &str,
    ) -> Result<Option<i64>, DbErr> {
        let Some(verification) = user_verification::Entity::find()
            .filter(
                user_verification::Column::VerificationCode.eq(Some(verification_code.to_string())),
            )
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if !verification
            .verification_code
            .as_deref()
            .unwrap_or_default()
            .starts_with(PASSWORD_RESET_VERIFICATION_PREFIX)
        {
            return Ok(None);
        }

        let age_millis = current_timestamp_millis() - verification.timestamp.unwrap_or_default();
        if age_millis > 60 * 60 * 1000 {
            user_verification::Entity::delete_by_id(verification.id)
                .exec(&self.db)
                .await?;
            return Ok(None);
        }

        Ok(verification.user_id)
    }

    pub async fn find_valid_signup_verification_user_id(
        &self,
        login_id: &str,
        verification_code: &str,
    ) -> Result<Option<i64>, DbErr> {
        let normalized_login_id = normalize_identity(login_id);
        let Some(verification) = user_verification::Entity::find()
            .filter(user_verification::Column::LoginId.eq(Some(normalized_login_id)))
            .filter(
                user_verification::Column::VerificationCode.eq(Some(verification_code.to_string())),
            )
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if !verification
            .verification_code
            .as_deref()
            .unwrap_or_default()
            .starts_with(SIGNUP_VERIFICATION_PREFIX)
        {
            return Ok(None);
        }
        let age_millis = current_timestamp_millis() - verification.timestamp.unwrap_or_default();
        if age_millis > 24 * 60 * 60 * 1000 {
            user_verification::Entity::delete_by_id(verification.id)
                .exec(&self.db)
                .await?;
            return Ok(None);
        }
        Ok(verification.user_id)
    }

    pub async fn delete_password_reset_verification(
        &self,
        verification_code: &str,
    ) -> Result<(), DbErr> {
        let rows = user_verification::Entity::find()
            .filter(
                user_verification::Column::VerificationCode.eq(Some(verification_code.to_string())),
            )
            .all(&self.db)
            .await?;
        for row in rows {
            user_verification::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn delete_signup_verification(&self, verification_code: &str) -> Result<(), DbErr> {
        let rows = user_verification::Entity::find()
            .filter(
                user_verification::Column::VerificationCode.eq(Some(verification_code.to_string())),
            )
            .all(&self.db)
            .await?;
        for row in rows.into_iter().filter(|row| {
            row.verification_code
                .as_deref()
                .unwrap_or_default()
                .starts_with(SIGNUP_VERIFICATION_PREFIX)
        }) {
            user_verification::Entity::delete_by_id(row.id)
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }
}
