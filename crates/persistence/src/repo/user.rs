use super::*;

impl AppRepositoryImpl<'_> {
    pub fn new(db: DatabaseConnection) -> Self {
        Self::new_with_config(db, RepositoryConfig::default())
    }

    pub fn new_with_config(db: DatabaseConnection, config: RepositoryConfig) -> Self {
        let stable_lists = StableLists::new(config.stable_list_store());
        Self {
            config,
            db: RepositoryDb::Connection(db),
            stable_lists,
        }
    }

    pub async fn begin_transaction(&self) -> Result<DatabaseTransaction, DbErr> {
        self.db.begin().await
    }

    pub async fn has_registered_users(&self) -> Result<bool, DbErr> {
        let users = n4user::Entity::find().all(&self.db).await?;
        Ok(users.into_iter().any(|user| {
            normalize_optional(user.login_id.as_deref()).as_deref()
                != Some(LEGACY_ANONYMOUS_LOGIN_ID)
        }))
    }

    pub fn with_transaction<'tx>(
        &self,
        transaction: &'tx DatabaseTransaction,
    ) -> AppRepositoryImpl<'tx> {
        AppRepositoryImpl {
            config: self.config.clone(),
            db: RepositoryDb::Transaction(transaction),
            // Share the parent's store: transaction-scoped mutations must
            // invalidate the same cache the shared repository reads from.
            stable_lists: self.stable_lists.clone(),
        }
    }

    pub async fn create_user(&self, input: CreateUserInput) -> Result<AppUserRecord, DbErr> {
        let login_id = normalize_identity(&input.login_id);
        let created = n4user::ActiveModel {
            id: NotSet,
            name: Set(Some(input.display_name.clone())),
            login_id: Set(Some(login_id.clone())),
            password: Set(Some(input.password_hash.clone())),
            password_salt: Set(None),
            email: Set(Some(normalize_identity(&input.email_address))),
            remember_me: Set(Some(0)),
            state: Set(user_state_from_confirmed(input.is_confirmed)),
            last_state_modified_date: Set(None),
            created_date: Set(Some(current_datetime())),
            lang: Set(None),
            token: Set(None),
            is_guest: Set(Some(
                if self.config.login_id_matches_guest_prefix(&login_id) {
                    1
                } else {
                    0
                },
            )),
            english_name: Set(None),
        }
        .insert(&self.db)
        .await?;

        if input.is_site_admin {
            self.ensure_site_admin(created.id).await?;
        }

        self.find_user_by_id(created.id)
            .await?
            .ok_or_else(|| DbErr::Custom("created user missing".to_string()))
    }

    pub async fn find_user_by_identifier(
        &self,
        identifier: &str,
    ) -> Result<Option<AppUserRecord>, DbErr> {
        let normalized = normalize_identity(identifier);
        if normalized.is_empty() {
            return Ok(None);
        }

        let users = n4user::Entity::find().all(&self.db).await?;
        for user in users {
            let login_matches = normalize_optional(user.login_id.as_deref()).as_deref()
                == Some(normalized.as_str());
            let email_matches =
                normalize_optional(user.email.as_deref()).as_deref() == Some(normalized.as_str());
            if login_matches || email_matches {
                return self.app_user_record_from_model(user).await.map(Some);
            }
        }

        Ok(None)
    }

    pub async fn find_user_by_login_id(
        &self,
        login_id: &str,
    ) -> Result<Option<AppUserRecord>, DbErr> {
        let normalized = normalize_identity(login_id);
        if normalized.is_empty() {
            return Ok(None);
        }

        let user = n4user::Entity::find()
            .filter(n4user::Column::LoginId.eq(normalized.clone()))
            .one(&self.db)
            .await?;
        let user = match user {
            Some(user) => Some(user),
            None => {
                n4user::Entity::find()
                    .filter(
                        Expr::expr(sea_orm::sea_query::Func::lower(
                            sea_orm::sea_query::Func::cust(sea_orm::sea_query::Alias::new("TRIM"))
                                .arg(Expr::col(n4user::Column::LoginId)),
                        ))
                        .eq(normalized),
                    )
                    .one(&self.db)
                    .await?
            }
        };

        match user {
            Some(user) => self.app_user_record_from_model(user).await.map(Some),
            None => Ok(None),
        }
    }

    pub async fn find_user_by_id(&self, user_id: i64) -> Result<Option<AppUserRecord>, DbErr> {
        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Ok(None);
        };

        self.app_user_record_from_model(user).await.map(Some)
    }

    pub async fn update_user_preferred_language(
        &self,
        user_id: i64,
        language: &str,
    ) -> Result<(), DbErr> {
        let Some(model) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Ok(());
        };
        let language = language.trim().chars().take(255).collect::<String>();
        if language.is_empty() || model.lang.as_deref() == Some(language.as_str()) {
            return Ok(());
        }

        let mut active = n4user::ActiveModel::from(model);
        active.lang = Set(Some(language));
        active.update(&self.db).await?;
        Ok(())
    }

    pub async fn update_default_site_admin(
        &self,
        display_name: &str,
        email_address: &str,
        password_hash: &str,
    ) -> Result<AppUserRecord, DbErr> {
        let normalized_email = normalize_identity(email_address);
        if normalized_email.is_empty() {
            return Err(DbErr::Custom("Email address is required.".to_string()));
        }
        if !looks_like_email_address(&normalized_email) {
            return Err(DbErr::Custom("Email address is invalid.".to_string()));
        }
        let existing_admin = self.find_user_model_by_login_id("admin").await?;
        let existing_admin_id = existing_admin.as_ref().map(|model| model.id);

        let duplicate_email = n4user::Entity::find()
            .all(&self.db)
            .await?
            .into_iter()
            .filter(|row| Some(row.id) != existing_admin_id)
            .any(|row| {
                normalize_optional(row.email.as_deref()).as_deref()
                    == Some(normalized_email.as_str())
            });
        if duplicate_email {
            return Err(DbErr::Custom(
                "Email address is already in use.".to_string(),
            ));
        }

        let Some(model) = existing_admin else {
            return self
                .create_user(CreateUserInput {
                    display_name: display_name.trim().to_string(),
                    email_address: normalized_email,
                    is_confirmed: true,
                    is_site_admin: true,
                    login_id: "admin".to_string(),
                    password_hash: password_hash.to_string(),
                })
                .await;
        };

        let mut active = n4user::ActiveModel::from(model);
        active.name = Set(Some(display_name.trim().to_string()));
        active.email = Set(Some(normalized_email));
        active.password = Set(Some(password_hash.to_string()));
        active.password_salt = Set(None);
        active.state = Set(Some("active".to_string()));
        let updated = active.update(&self.db).await?;
        self.ensure_site_admin(updated.id).await?;
        self.app_user_record_from_model(updated).await
    }

    pub async fn update_ldap_user_profile(
        &self,
        user_id: i64,
        name: &str,
        email_address: &str,
        english_name: Option<&str>,
        ldap_login_id: &str,
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
        if let Some(english_name) = english_name
            .map(str::trim)
            .filter(|english_name| !english_name.is_empty())
        {
            active.english_name = Set(Some(english_name.to_string()));
        }
        active.is_guest = Set(Some(
            if self.config.login_id_matches_guest_prefix(ldap_login_id) {
                1
            } else {
                0
            },
        ));
        let updated = active.update(&self.db).await?;
        self.app_user_record_from_model(updated).await
    }

    pub async fn link_or_create_oauth_user(
        &self,
        input: OAuthUserInput,
    ) -> Result<AppUserRecord, DbErr> {
        let provider = normalize_identity(&input.provider);
        let provider_user_id = input.provider_user_id.trim().to_string();
        if provider.is_empty() || provider_user_id.is_empty() {
            return Err(DbErr::Custom("missing oauth provider identity".to_string()));
        }

        if let Some(user) = self
            .find_user_by_oauth_identity(&provider, &provider_user_id)
            .await?
        {
            return Ok(user);
        }

        let email = normalize_identity(&input.email_address);
        if email.is_empty() {
            return Err(DbErr::Custom("missing oauth email".to_string()));
        }

        let user = if let Some(user) = self.find_user_by_identifier(&email).await? {
            user
        } else {
            let login_id = self
                .unique_oauth_login_id(&input.login_id_hint, &email)
                .await?;
            self.create_user(CreateUserInput {
                display_name: input.display_name.trim().to_string(),
                email_address: email.clone(),
                is_confirmed: true,
                is_site_admin: false,
                login_id,
                password_hash: input.password_hash.clone(),
            })
            .await?
        };

        self.ensure_oauth_credential_for_user(&user, &input, &provider, &provider_user_id)
            .await?;
        self.find_user_by_id(user.id)
            .await?
            .ok_or_else(|| DbErr::Custom("oauth user missing after link".to_string()))
    }

    async fn find_user_by_oauth_identity(
        &self,
        provider: &str,
        provider_user_id: &str,
    ) -> Result<Option<AppUserRecord>, DbErr> {
        let Some(account) = linked_account::Entity::find()
            .filter(linked_account::Column::ProviderKey.eq(Some(provider.to_string())))
            .filter(linked_account::Column::ProviderUserId.eq(Some(provider_user_id.to_string())))
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(credential_id) = account.user_credential_id else {
            return Ok(None);
        };
        let Some(credential) = user_credential::Entity::find_by_id(credential_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(user_id) = credential.user_id else {
            return Ok(None);
        };
        self.find_user_by_id(user_id).await
    }

    async fn unique_oauth_login_id(&self, hint: &str, email: &str) -> Result<String, DbErr> {
        let hint = normalize_identity(hint);
        let candidate = if hint.is_empty() {
            email
                .split_once('@')
                .map(|(local, _)| normalize_identity(local))
                .filter(|local| !local.is_empty())
                .unwrap_or_else(|| "user".to_string())
        } else {
            hint
        };
        if !self.user_login_id_exists(&candidate).await? {
            return Ok(candidate);
        }
        let yona_candidate = format!("{candidate}-yona");
        if !self.user_login_id_exists(&yona_candidate).await? {
            return Ok(yona_candidate);
        }
        let mut index = 2;
        loop {
            let proposed = format!("{candidate}{index}");
            if !self.user_login_id_exists(&proposed).await? {
                return Ok(proposed);
            }
            index += 1;
        }
    }

    async fn ensure_oauth_credential_for_user(
        &self,
        user: &AppUserRecord,
        input: &OAuthUserInput,
        provider: &str,
        provider_user_id: &str,
    ) -> Result<(), DbErr> {
        let credential = match user_credential::Entity::find()
            .filter(user_credential::Column::UserId.eq(Some(user.id)))
            .filter(user_credential::Column::Active.eq(Some(1)))
            .one(&self.db)
            .await?
        {
            Some(credential) => credential,
            None => {
                user_credential::ActiveModel {
                    id: NotSet,
                    user_id: Set(Some(user.id)),
                    login_id: Set(Some(user.login_id.clone())),
                    email: Set(Some(user.email_address.clone())),
                    name: Set(Some(user.display_name.clone())),
                    active: Set(Some(1)),
                    email_validated: Set(Some(1)),
                    image: Set(None),
                    created_at: Set(Some(current_datetime())),
                    updated_at: Set(Some(current_datetime())),
                }
                .insert(&self.db)
                .await?
            }
        };

        if linked_account::Entity::find()
            .filter(linked_account::Column::UserCredentialId.eq(Some(credential.id)))
            .filter(linked_account::Column::ProviderKey.eq(Some(provider.to_string())))
            .one(&self.db)
            .await?
            .is_some()
        {
            return Ok(());
        }

        linked_account::ActiveModel {
            id: NotSet,
            user_credential_id: Set(Some(credential.id)),
            provider_user_id: Set(Some(provider_user_id.to_string())),
            provider_key: Set(Some(provider.to_string())),
            provider_display_name: Set(Some(input.provider_display_name.clone())),
            avatar_url: Set(None),
            password: Set(None),
            access_token_expires_at: Set(None),
            refresh_token_expires_at: Set(None),
            scope: Set(None),
            created_at: Set(Some(current_datetime())),
            updated_at: Set(Some(current_datetime())),
        }
        .insert(&self.db)
        .await?;
        Ok(())
    }

    pub async fn find_mailbox_sender_by_from_addresses(
        &self,
        from_addresses: &[String],
    ) -> Result<Option<AppUserRecord>, DbErr> {
        for address in from_addresses {
            let Some(user) = self.find_mailbox_sender_model_by_email(address).await? else {
                continue;
            };
            let is_anonymous = normalize_optional(user.login_id.as_deref()).as_deref()
                == Some(LEGACY_ANONYMOUS_LOGIN_ID);
            if !is_anonymous {
                return self.app_user_record_from_model(user).await.map(Some);
            }
        }

        Ok(None)
    }

    pub async fn find_mailbox_project_targets_by_details(
        &self,
        actor_id: i64,
        details: &[String],
    ) -> Result<Vec<ProjectRecord>, DbErr> {
        let mut projects = Vec::new();
        let mut seen_project_ids = HashSet::new();
        for detail in details {
            let Some((owner_name, project_name)) = mailbox_project_detail_local(detail) else {
                continue;
            };
            let Some(project) = self
                .read_project_by_owner_and_name(&owner_name, &project_name)
                .await?
            else {
                continue;
            };
            if !self
                .search_project_visible_for_actor(&project, Some(actor_id))
                .await?
            {
                continue;
            }
            if seen_project_ids.insert(project.id) {
                projects.push(project);
            }
        }
        Ok(projects)
    }

    pub async fn user_login_id_exists(&self, login_id: &str) -> Result<bool, DbErr> {
        let normalized = normalize_identity(login_id);
        if normalized.is_empty() {
            return Ok(false);
        }

        let exact = n4user::Entity::find()
            .filter(n4user::Column::LoginId.eq(normalized.clone()))
            .one(&self.db)
            .await?;
        if exact.is_some() {
            return Ok(true);
        }

        Ok(n4user::Entity::find()
            .filter(
                Expr::expr(sea_orm::sea_query::Func::lower(
                    sea_orm::sea_query::Func::cust(sea_orm::sea_query::Alias::new("TRIM"))
                        .arg(Expr::col(n4user::Column::LoginId)),
                ))
                .eq(normalized),
            )
            .one(&self.db)
            .await?
            .is_some())
    }

    pub async fn user_email_exists(&self, email_address: &str) -> Result<bool, DbErr> {
        let normalized = normalize_identity(email_address);
        if normalized.is_empty() {
            return Ok(false);
        }

        let users = n4user::Entity::find().all(&self.db).await?;
        Ok(users.into_iter().any(|user| {
            normalize_optional(user.email.as_deref()).as_deref() == Some(normalized.as_str())
        }))
    }
}
