use super::*;

impl AppRepositoryImpl<'_> {
    /// Lists users for the legacy site-admin user-management surface.
    ///
    /// # Errors
    ///
    /// Returns a database error when user or site-admin rows cannot be read.
    pub async fn list_site_users(
        &self,
        filter: SiteUserListFilter,
    ) -> Result<SiteUserListRecord, DbErr> {
        let state = site_user_filter_state(&filter.state)?;
        let query = filter.query.trim().to_string();
        let page = filter.page.max(1);
        let initial_user_id = self.first_registered_user_id().await?;
        let site_admin_ids = self.site_admin_user_ids().await?;
        let mut users: Vec<n4user::Model> = n4user::Entity::find()
            .all(&self.db)
            .await?
            .into_iter()
            .filter(|user| {
                normalize_optional(user.login_id.as_deref()).as_deref()
                    != Some(LEGACY_ANONYMOUS_LOGIN_ID)
            })
            .filter(|user| site_user_state_matches(user, &state, &site_admin_ids))
            .filter(|user| site_user_query_matches(user, &query))
            .collect();
        users.sort_by(|left, right| {
            right
                .created_date
                .cmp(&left.created_date)
                .then_with(|| left.login_id.cmp(&right.login_id))
        });

        let total = users.len();
        let offset = ((page - 1) as usize).saturating_mul(SITE_USER_PAGE_SIZE);
        let users = users
            .into_iter()
            .skip(offset)
            .take(SITE_USER_PAGE_SIZE)
            .map(|user| {
                let is_site_admin = site_admin_ids.contains(&user.id);
                site_user_record_from_model(user, is_site_admin)
            })
            .collect();
        let site_admin_count = self.site_admin_count(&site_admin_ids).await?;
        let total_pages = if total == 0 {
            0
        } else {
            total.div_ceil(SITE_USER_PAGE_SIZE)
        };

        Ok(SiteUserListRecord {
            initial_user_id,
            page,
            page_size: usize_to_u32_saturating(SITE_USER_PAGE_SIZE),
            query,
            site_admin_count: usize_to_u32_saturating(site_admin_count),
            state,
            total: usize_to_u32_saturating(total),
            total_pages: usize_to_u32_saturating(total_pages),
            users,
        })
    }

    /// Lists active users without a promoted avatar attachment for the legacy
    /// site-admin JSON avatar repair route.
    ///
    /// # Errors
    ///
    /// Returns a database error when user or attachment rows cannot be read.
    pub async fn list_site_no_avatar_users(&self) -> Result<Vec<SiteNoAvatarUserRecord>, DbErr> {
        let avatar_user_ids = attachment::Entity::find()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(USER_AVATAR_ATTACHMENT_CONTAINER.to_string())),
            )
            .all(&self.db)
            .await?
            .into_iter()
            .map(|attachment| attachment.container_id)
            .collect::<HashSet<_>>();

        let mut users = n4user::Entity::find()
            .all(&self.db)
            .await?
            .into_iter()
            .filter(n4user_is_active)
            .filter(|user| {
                normalize_optional(user.login_id.as_deref()).as_deref()
                    != Some(LEGACY_ANONYMOUS_LOGIN_ID)
            })
            .filter(|user| !avatar_user_ids.contains(&user.id))
            .map(|user| SiteNoAvatarUserRecord {
                email: user.email.unwrap_or_default(),
                login_id: user.login_id.unwrap_or_default(),
                name: user.name.unwrap_or_default(),
            })
            .collect::<Vec<_>>();
        users.sort_by(|left, right| left.login_id.cmp(&right.login_id));
        Ok(users)
    }

    /// Lists active user email addresses for the legacy site-admin mass-mail surface.
    ///
    /// # Errors
    ///
    /// Returns a database error when user rows cannot be read.
    pub async fn list_site_mail_recipients(&self) -> Result<Vec<String>, DbErr> {
        let mut recipients = n4user::Entity::find()
            .all(&self.db)
            .await?
            .into_iter()
            .filter(n4user_is_active)
            .filter(|user| {
                normalize_optional(user.login_id.as_deref()).as_deref()
                    != Some(LEGACY_ANONYMOUS_LOGIN_ID)
            })
            .filter_map(|user| {
                user.email
                    .map(|email| email.trim().to_string())
                    .filter(|email| !email.is_empty())
            })
            .collect::<Vec<_>>();
        recipients.sort();
        recipients.dedup();
        Ok(recipients)
    }

    /// Toggles whether a user has the legacy site-admin role.
    ///
    /// # Errors
    ///
    /// Returns a database error when the user or site-admin rows cannot be read
    /// or updated.
    pub async fn toggle_site_admin_role(
        &self,
        login_id: &str,
    ) -> Result<SiteAdminToggleResult, DbErr> {
        let Some(user) = self.find_user_model_by_login_id(login_id).await? else {
            return Ok(SiteAdminToggleResult::NotFound);
        };
        let existing = site_admin::Entity::find()
            .filter(site_admin::Column::AdminId.eq(Some(user.id)))
            .all(&self.db)
            .await?;
        let is_site_admin = if existing.is_empty() {
            self.ensure_site_admin(user.id).await?;
            true
        } else {
            if self.first_registered_user_id().await? == Some(user.id) {
                return Ok(SiteAdminToggleResult::ProtectedInitialAdmin);
            }
            for row in existing {
                site_admin::Entity::delete_by_id(row.id)
                    .exec(&self.db)
                    .await?;
            }
            false
        };

        Ok(SiteAdminToggleResult::Updated(site_user_record_from_model(
            user,
            is_site_admin,
        )))
    }

    /// Toggles a user's account between `ACTIVE` and `LOCKED`.
    ///
    /// # Errors
    ///
    /// Returns a database error when the user row cannot be read or updated.
    pub async fn toggle_site_user_account_lock(
        &self,
        login_id: &str,
    ) -> Result<Option<SiteUserRecord>, DbErr> {
        let Some(user) = self.find_user_model_by_login_id(login_id).await? else {
            return Ok(None);
        };
        let is_active = normalize_optional(user.state.as_deref()).as_deref() == Some("active");
        let mut active = n4user::ActiveModel::from(user);
        active.state = Set(Some(
            if is_active { "locked" } else { "active" }.to_string(),
        ));
        active.last_state_modified_date = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        let is_site_admin = self.user_is_site_admin(updated.id).await?;

        Ok(Some(site_user_record_from_model(updated, is_site_admin)))
    }

    /// Sets a user's legacy account state directly.
    ///
    /// # Errors
    ///
    /// Returns a database error when the user row cannot be read or updated, or
    /// when `state` is not one of the row-backed legacy states.
    pub async fn set_site_user_state(
        &self,
        login_id: &str,
        state: &str,
    ) -> Result<Option<SiteUserRecord>, DbErr> {
        let normalized = site_user_filter_state(state)?;
        let state = match normalized.as_str() {
            "ACTIVE" | "LOCKED" | "DELETED" | "GUEST" => normalized.to_ascii_lowercase(),
            _ => return Err(DbErr::Custom("invalid site user row state".to_string())),
        };
        let Some(user) = self.find_user_model_by_login_id(login_id).await? else {
            return Ok(None);
        };
        let mut active = n4user::ActiveModel::from(user);
        if normalized == "GUEST" {
            active.is_guest = Set(Some(1));
        }
        active.state = Set(Some(state));
        active.last_state_modified_date = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        let is_site_admin = self.user_is_site_admin(updated.id).await?;

        Ok(Some(site_user_record_from_model(updated, is_site_admin)))
    }

    /// Toggles whether a user is treated as a legacy guest-mode account.
    ///
    /// # Errors
    ///
    /// Returns a database error when the user row cannot be read or updated.
    pub async fn toggle_site_user_guest_mode(
        &self,
        login_id: &str,
    ) -> Result<Option<SiteUserRecord>, DbErr> {
        let Some(user) = self.find_user_model_by_login_id(login_id).await? else {
            return Ok(None);
        };
        let is_guest = user.is_guest.unwrap_or_default() != 0;
        let mut active = n4user::ActiveModel::from(user);
        active.is_guest = Set(Some(if is_guest { 0 } else { 1 }));
        let updated = active.update(&self.db).await?;
        let is_site_admin = self.user_is_site_admin(updated.id).await?;

        Ok(Some(site_user_record_from_model(updated, is_site_admin)))
    }

    /// Marks a user as deleted through the legacy site-admin user-management flow.
    ///
    /// # Errors
    ///
    /// Returns a database error when the user, membership, or association rows
    /// cannot be read or updated.
    pub async fn delete_site_user(&self, login_id: &str) -> Result<SiteUserDeleteResult, DbErr> {
        let Some(user) = self.find_user_model_by_login_id(login_id).await? else {
            return Ok(SiteUserDeleteResult::NotFound);
        };
        if self.first_registered_user_id().await? == Some(user.id) {
            return Ok(SiteUserDeleteResult::ProtectedInitialAdmin);
        }
        if self.site_user_is_only_project_manager(user.id).await? {
            return Ok(SiteUserDeleteResult::OnlyManager);
        }

        let is_site_admin = self.user_is_site_admin(user.id).await?;
        let user_id = user.id;
        let login_id = user.login_id.clone().unwrap_or_default();
        let display_name = user.name.clone().unwrap_or_default();
        let assignee_ids: Vec<i64> = assignee::Entity::find()
            .filter(assignee::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect();

        let txn = self.db.begin().await?;
        if !assignee_ids.is_empty() {
            issue::Entity::update_many()
                .filter(issue::Column::AssigneeId.is_in(assignee_ids.iter().copied().map(Some)))
                .col_expr(issue::Column::AssigneeId, Expr::value(Option::<i64>::None))
                .exec(&txn)
                .await?;
            assignee::Entity::delete_many()
                .filter(assignee::Column::Id.is_in(assignee_ids))
                .exec(&txn)
                .await?;
        }
        project_user::Entity::delete_many()
            .filter(project_user::Column::UserId.eq(Some(user_id)))
            .exec(&txn)
            .await?;
        user_enrolled_project::Entity::delete_many()
            .filter(user_enrolled_project::Column::UserId.eq(user_id))
            .exec(&txn)
            .await?;
        notification_event_n4user::Entity::delete_many()
            .filter(notification_event_n4user::Column::N4userId.eq(user_id))
            .exec(&txn)
            .await?;

        let mut active = n4user::ActiveModel::from(user);
        active.state = Set(Some("deleted".to_string()));
        active.last_state_modified_date = Set(Some(current_datetime()));
        active.name = Set(Some(format!("[DELETED]{display_name}")));
        active.password = Set(Some(String::new()));
        active.password_salt = Set(Some(String::new()));
        active.email = Set(Some(format!("deleted-{login_id}@noreply.yona.io")));
        active.remember_me = Set(Some(0));
        let updated = active.update(&txn).await?;
        txn.commit().await?;

        Ok(SiteUserDeleteResult::Deleted(site_user_record_from_model(
            updated,
            is_site_admin,
        )))
    }

    pub async fn list_projects(&self) -> Result<Vec<ProjectRecord>, DbErr> {
        let rows = project::Entity::find()
            .select_only()
            .column(project::Column::CreatedDate)
            .column(project::Column::DefaultReviewerCount)
            .column(project::Column::Id)
            .column(project::Column::IsCodeAccessibleMemberOnly)
            .column(project::Column::IsUsingReviewerCount)
            .column(project::Column::LastPushedDate)
            .column(project::Column::Name)
            .column(project::Column::OriginalProjectId)
            .column(project::Column::Overview)
            .column(project::Column::Owner)
            .column(project::Column::OrganizationId)
            .column(project::Column::ProjectScope)
            .column(project::Column::Vcs)
            .order_by_asc(project::Column::Owner)
            .order_by_asc(project::Column::Name)
            .into_model::<ProjectRow>()
            .all(&self.db)
            .await?;

        let mut projects = Vec::new();
        for row in rows {
            if let Some(record) = self.project_record_from_row(row).await? {
                projects.push(record);
            }
        }

        Ok(projects)
    }

    pub async fn list_site_projects(
        &self,
        filter: &str,
        page: u32,
    ) -> Result<SiteProjectListRecord, DbErr> {
        const PAGE_SIZE: u64 = 25;

        let filter = filter.trim().to_string();
        let page = page.max(1);
        let mut query = project::Entity::find()
            .select_only()
            .column(project::Column::CreatedDate)
            .column(project::Column::DefaultReviewerCount)
            .column(project::Column::Id)
            .column(project::Column::IsCodeAccessibleMemberOnly)
            .column(project::Column::IsUsingReviewerCount)
            .column(project::Column::LastPushedDate)
            .column(project::Column::Name)
            .column(project::Column::OriginalProjectId)
            .column(project::Column::Overview)
            .column(project::Column::Owner)
            .column(project::Column::OrganizationId)
            .column(project::Column::ProjectScope)
            .column(project::Column::Vcs);

        if filter.is_empty() {
            query = query.order_by_desc(project::Column::CreatedDate);
        } else {
            query = query.filter(project::Column::Name.like(format!("%{filter}%")));
        }

        let total = query.clone().count(&self.db).await? as u32;
        let rows = query
            .into_model::<ProjectRow>()
            .paginate(&self.db, PAGE_SIZE)
            .fetch_page((page - 1) as u64)
            .await?;
        let mut projects = Vec::with_capacity(rows.len());
        for row in rows {
            if let Some(record) = self.project_record_from_row(row).await? {
                projects.push(record);
            }
        }

        let page_size = PAGE_SIZE as u32;
        let total_pages = if total == 0 {
            0
        } else {
            total.div_ceil(page_size)
        };

        Ok(SiteProjectListRecord {
            page,
            page_size,
            filter,
            total,
            total_pages,
            projects,
        })
    }

    pub async fn list_site_postings(&self, page: u32) -> Result<SitePostingListRecord, DbErr> {
        const PAGE_SIZE: u32 = 30;

        let page = page.max(1);
        let project_by_id = self
            .list_projects()
            .await?
            .into_iter()
            .map(|project| (project.id, project))
            .collect::<HashMap<_, _>>();
        let rows = posting::Entity::find()
            .order_by_desc(posting::Column::CreatedDate)
            .order_by_desc(posting::Column::Id)
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| {
                let project_id = row.project_id?;
                let project = project_by_id.get(&project_id)?.clone();
                Some((row, project))
            })
            .collect::<Vec<_>>();

        let total = rows.len() as u32;
        let offset = ((page - 1) * PAGE_SIZE) as usize;
        let page_rows = rows
            .into_iter()
            .skip(offset)
            .take(PAGE_SIZE as usize)
            .collect::<Vec<_>>();
        let mut posts = Vec::new();
        for (row, project) in page_rows {
            posts.push(
                self.project_posting_list_item_from_model(row, &project)
                    .await?,
            );
        }
        let total_pages = if total == 0 {
            0
        } else {
            total.div_ceil(PAGE_SIZE)
        };

        Ok(SitePostingListRecord {
            page,
            page_size: PAGE_SIZE,
            posts,
            total,
            total_pages,
        })
    }

    pub async fn list_site_issues(
        &self,
        state: &str,
        page: u32,
    ) -> Result<SiteIssueListRecord, DbErr> {
        const PAGE_SIZE: u32 = 30;

        let state = normalize_identity(state);
        let page = page.max(1);
        let project_by_id = self
            .list_projects()
            .await?
            .into_iter()
            .map(|project| (project.id, project))
            .collect::<HashMap<_, _>>();
        let rows = issue::Entity::find()
            .filter(issue::Column::State.eq(Some(issue_state_to_raw(&state))))
            .order_by_desc(issue::Column::CreatedDate)
            .order_by_desc(issue::Column::Id)
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| {
                let project_id = row.project_id?;
                let project = project_by_id.get(&project_id)?.clone();
                Some((row, project))
            })
            .collect::<Vec<_>>();

        let total = rows.len() as u32;
        let offset = ((page - 1) * PAGE_SIZE) as usize;
        let page_rows = rows
            .into_iter()
            .skip(offset)
            .take(PAGE_SIZE as usize)
            .collect::<Vec<_>>();
        let mut issues = Vec::new();
        for (row, project) in page_rows {
            issues.push(
                self.project_issue_list_item_from_model(row, &project)
                    .await?,
            );
        }
        let total_pages = if total == 0 {
            0
        } else {
            total.div_ceil(PAGE_SIZE)
        };

        Ok(SiteIssueListRecord {
            issues,
            page,
            page_size: PAGE_SIZE,
            state,
            total,
            total_pages,
        })
    }

    pub async fn site_diagnostic_errors(&self) -> Result<Vec<String>, DbErr> {
        let backend = self.db.get_database_backend();
        self.db
            .query_one(Statement::from_sql_and_values(
                backend,
                "SELECT 1",
                Vec::new(),
            ))
            .await?;
        Ok(Vec::new())
    }

    pub async fn list_organizations(&self) -> Result<Vec<OrganizationRecord>, DbErr> {
        let rows = organization::Entity::find()
            .order_by_asc(organization::Column::Name)
            .all(&self.db)
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| self.organization_record_from_model(row))
            .collect())
    }
}
