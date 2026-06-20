use super::*;

impl AppRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self::new_with_config(db, RepositoryConfig::default())
    }

    pub fn new_with_config(db: DatabaseConnection, config: RepositoryConfig) -> Self {
        Self { config, db }
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

        let users = n4user::Entity::find().all(&self.db).await?;
        for user in users {
            let login_matches = normalize_optional(user.login_id.as_deref()).as_deref()
                == Some(normalized.as_str());
            if login_matches {
                return self.app_user_record_from_model(user).await.map(Some);
            }
        }

        Ok(None)
    }

    pub async fn find_user_by_id(&self, user_id: i64) -> Result<Option<AppUserRecord>, DbErr> {
        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Ok(None);
        };

        self.app_user_record_from_model(user).await.map(Some)
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

        let users = n4user::Entity::find().all(&self.db).await?;
        Ok(users.into_iter().any(|user| {
            normalize_optional(user.login_id.as_deref()).as_deref() == Some(normalized.as_str())
        }))
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
