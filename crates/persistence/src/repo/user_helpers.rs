use super::*;

impl AppRepositoryImpl<'_> {
    pub(super) async fn first_registered_user_id(&self) -> Result<Option<i64>, DbErr> {
        Ok(n4user::Entity::find()
            .filter(n4user::Column::LoginId.ne(Some(LEGACY_ANONYMOUS_LOGIN_ID.to_string())))
            .order_by_asc(n4user::Column::Id)
            .one(&self.db)
            .await?
            .map(|user| user.id))
    }

    pub(super) async fn app_user_record_from_model(
        &self,
        model: n4user::Model,
    ) -> Result<AppUserRecord, DbErr> {
        let is_site_admin = self.user_is_site_admin(model.id).await?;

        Ok(AppUserRecord {
            id: model.id,
            display_name: model.name.unwrap_or_default(),
            email_address: model.email.unwrap_or_default(),
            is_confirmed: normalize_optional(model.state.as_deref()).as_deref() == Some("active"),
            is_guest: model.is_guest.unwrap_or_default() != 0,
            is_site_admin,
            login_id: model.login_id.unwrap_or_default(),
            password_salt: model.password_salt,
            password_hash: model.password.unwrap_or_default(),
        })
    }

    pub(super) async fn find_user_model_by_login_id(
        &self,
        login_id: &str,
    ) -> Result<Option<n4user::Model>, DbErr> {
        let normalized = normalize_identity(login_id);
        if normalized.is_empty() || normalized == LEGACY_ANONYMOUS_LOGIN_ID {
            return Ok(None);
        }

        let exact = n4user::Entity::find()
            .filter(n4user::Column::LoginId.eq(normalized.clone()))
            .one(&self.db)
            .await?;
        if exact.is_some() {
            return Ok(exact);
        }

        n4user::Entity::find()
            .filter(
                Expr::expr(sea_orm::sea_query::Func::lower(
                    sea_orm::sea_query::Func::cust(sea_orm::sea_query::Alias::new("TRIM"))
                        .arg(Expr::col(n4user::Column::LoginId)),
                ))
                .eq(normalized),
            )
            .one(&self.db)
            .await
    }

    pub(super) async fn find_user_model_by_email(
        &self,
        email_address: &str,
    ) -> Result<Option<n4user::Model>, DbErr> {
        let normalized = normalize_identity(email_address);
        if normalized.is_empty() {
            return Ok(None);
        }

        let users = n4user::Entity::find().all(&self.db).await?;
        Ok(users.into_iter().find(|user| {
            normalize_optional(user.email.as_deref()).as_deref() == Some(normalized.as_str())
        }))
    }

    pub(super) async fn find_mailbox_sender_model_by_email(
        &self,
        email_address: &str,
    ) -> Result<Option<n4user::Model>, DbErr> {
        let normalized = normalize_identity(email_address);
        if normalized.is_empty() {
            return Ok(None);
        }

        if let Some(user) = self.find_user_model_by_email(&normalized).await? {
            return Ok(Some(user));
        }

        let Some(workspace_email) = email::Entity::find()
            .filter(email::Column::Email.eq(Some(normalized)))
            .filter(email::Column::Valid.eq(Some(1)))
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(user_id) = workspace_email.user_id else {
            return Ok(None);
        };

        n4user::Entity::find_by_id(user_id).one(&self.db).await
    }

    pub(super) async fn site_user_is_only_project_manager(
        &self,
        user_id: i64,
    ) -> Result<bool, DbErr> {
        let manager_role_id = role::Entity::find()
            .all(&self.db)
            .await?
            .into_iter()
            .find(|row| normalize_optional(row.name.as_deref()).as_deref() == Some("manager"))
            .map(|row| row.id);
        let Some(manager_role_id) = manager_role_id else {
            return Ok(false);
        };
        let memberships = project_user::Entity::find()
            .filter(project_user::Column::UserId.eq(Some(user_id)))
            .filter(project_user::Column::RoleId.eq(Some(manager_role_id)))
            .all(&self.db)
            .await?;

        for membership in memberships {
            let Some(project_id) = membership.project_id else {
                continue;
            };
            let manager_count = project_user::Entity::find()
                .filter(project_user::Column::ProjectId.eq(Some(project_id)))
                .filter(project_user::Column::RoleId.eq(Some(manager_role_id)))
                .count(&self.db)
                .await?;
            if manager_count <= 1 {
                return Ok(true);
            }
        }

        Ok(false)
    }

    pub(super) async fn site_admin_user_ids(&self) -> Result<HashSet<i64>, DbErr> {
        Ok(site_admin::Entity::find()
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.admin_id)
            .collect())
    }

    pub(super) async fn site_admin_count(
        &self,
        site_admin_ids: &HashSet<i64>,
    ) -> Result<usize, DbErr> {
        if site_admin_ids.is_empty() {
            return Ok(0);
        }

        Ok(n4user::Entity::find()
            .filter(n4user::Column::Id.is_in(site_admin_ids.iter().copied()))
            .filter(n4user::Column::LoginId.ne(Some(LEGACY_ANONYMOUS_LOGIN_ID.to_string())))
            .count(&self.db)
            .await? as usize)
    }

    pub(super) async fn user_is_site_admin(&self, user_id: i64) -> Result<bool, DbErr> {
        Ok(site_admin::Entity::find()
            .filter(site_admin::Column::AdminId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_some())
    }

    pub(super) async fn list_connected_social_providers_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<String>, DbErr> {
        let credentials = user_credential::Entity::find()
            .filter(user_credential::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        let credential_ids = credentials
            .into_iter()
            .map(|credential| credential.id)
            .collect::<Vec<_>>();
        if credential_ids.is_empty() {
            return Ok(Vec::new());
        }

        let mut providers = linked_account::Entity::find()
            .filter(
                linked_account::Column::UserCredentialId
                    .is_in(credential_ids.into_iter().map(Some)),
            )
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|account| normalize_optional(account.provider_key.as_deref()))
            .collect::<Vec<_>>();

        providers.sort();
        providers.dedup();
        Ok(providers)
    }
}
