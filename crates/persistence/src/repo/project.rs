use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn create_project(&self, input: CreateProjectInput) -> Result<ProjectRecord, DbErr> {
        let created = project::ActiveModel {
            id: NotSet,
            name: Set(Some(input.project_name.trim().to_string())),
            overview: Set(empty_to_none(input.overview)),
            vcs: Set(Some(input.vcs.trim().to_string())),
            siteurl: Set(None),
            owner: Set(Some(input.owner_name.trim().to_string())),
            created_date: Set(Some(current_datetime())),
            last_issue_number: Set(Some(0)),
            last_posting_number: Set(Some(0)),
            original_project_id: Set(None),
            last_pushed_date: Set(None),
            default_reviewer_count: Set(Some(1)),
            is_using_reviewer_count: Set(Some(0)),
            organization_id: Set(input.organization_id),
            project_scope: Set(Some(normalize_identity(&input.project_scope))),
            previous_owner_login_id: Set(None),
            previous_name: Set(None),
            previous_name_changed_time: Set(None),
            is_code_accessible_member_only: Set(Some(0)),
        }
        .insert(&self.db)
        .await?;

        let menu_settings = self.config.project_default_menu_settings();
        self.set_project_menu_settings(created.id, menu_settings)
            .await?;

        self.project_record_from_model(created)
            .await?
            .ok_or_else(|| DbErr::Custom("project owner/name missing".to_string()))
    }

    pub async fn create_fork_project(
        &self,
        input: CreateForkProjectInput,
    ) -> Result<ProjectRecord, DbErr> {
        let created = project::ActiveModel {
            id: NotSet,
            name: Set(Some(input.project_name.trim().to_string())),
            overview: Set(empty_to_none(input.overview)),
            vcs: Set(Some(input.vcs.trim().to_string())),
            siteurl: Set(None),
            owner: Set(Some(input.owner_name.trim().to_string())),
            created_date: Set(Some(current_datetime())),
            last_issue_number: Set(Some(0)),
            last_posting_number: Set(Some(0)),
            original_project_id: Set(Some(input.original_project_id)),
            last_pushed_date: Set(None),
            default_reviewer_count: Set(Some(1)),
            is_using_reviewer_count: Set(Some(0)),
            organization_id: Set(input.organization_id),
            project_scope: Set(Some(normalize_identity(&input.project_scope))),
            previous_owner_login_id: Set(None),
            previous_name: Set(None),
            previous_name_changed_time: Set(None),
            is_code_accessible_member_only: Set(Some(0)),
        }
        .insert(&self.db)
        .await?;

        let menu_settings = self.config.project_default_menu_settings();
        self.set_project_menu_settings(created.id, menu_settings)
            .await?;

        self.project_record_from_model(created)
            .await?
            .ok_or_else(|| DbErr::Custom("project owner/name missing".to_string()))
    }

    pub async fn list_project_forks(
        &self,
        original_project_id: i64,
    ) -> Result<Vec<ProjectRecord>, DbErr> {
        let rows = project::Entity::find()
            .filter(project::Column::OriginalProjectId.eq(Some(original_project_id)))
            .all(&self.db)
            .await?;
        let mut forks = Vec::new();
        for row in rows {
            if let Some(record) = self.project_record_from_model(row).await? {
                forks.push(record);
            }
        }
        forks.sort_by(|left, right| {
            left.owner_name
                .cmp(&right.owner_name)
                .then_with(|| left.project_name.cmp(&right.project_name))
        });
        Ok(forks)
    }

    pub async fn change_project_vcs(
        &self,
        project_id: i64,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let Some(row) = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let next_vcs = next_project_vcs(row.vcs.as_deref().unwrap_or("GIT"));
        let txn = self.db.begin().await?;
        for posting in posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_id)))
            .filter(posting::Column::Readme.eq(Some(1)))
            .all(&txn)
            .await?
        {
            let mut active = posting::ActiveModel::from(posting);
            active.readme = Set(Some(0));
            active.update(&txn).await?;
        }
        let mut active = project::ActiveModel::from(row);
        active.vcs = Set(Some(next_vcs));
        let updated = active.update(&txn).await?;
        txn.commit().await?;

        self.project_record_from_model(updated).await
    }

    pub async fn update_project(
        &self,
        input: UpdateProjectInput,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let Some(current_record) = self
            .read_project_by_owner_and_name(&input.current_owner_name, &input.current_project_name)
            .await?
        else {
            return Ok(None);
        };

        let Some(current) = project::Entity::find_by_id(current_record.id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };

        let mut active = project::ActiveModel::from(current.clone());
        active.name = Set(Some(input.project_name.trim().to_string()));
        active.overview = Set(empty_to_none(input.overview));
        active.project_scope = Set(Some(normalize_identity(&input.project_scope)));
        active.previous_name = Set(current.name.clone());
        active.previous_owner_login_id = Set(current.owner.clone());
        active.previous_name_changed_time = Set(Some(current_timestamp_millis()));
        let updated = active.update(&self.db).await?;
        self.sync_project_label_cache(&updated).await?;

        self.project_record_from_model(updated).await
    }

    pub async fn list_projects_for_organization(
        &self,
        organization_id: i64,
    ) -> Result<Vec<ProjectRecord>, DbErr> {
        let models = project::Entity::find()
            .filter(project::Column::OrganizationId.eq(Some(organization_id)))
            .all(&self.db)
            .await?;
        let mut projects = Vec::new();
        for model in models {
            if let Some(record) = self.project_record_from_model(model).await? {
                projects.push(record);
            }
        }
        Ok(projects)
    }
}
