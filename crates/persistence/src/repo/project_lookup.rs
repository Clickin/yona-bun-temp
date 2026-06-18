use super::*;

impl AppRepository {
    pub async fn read_project_by_owner_and_name(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let owner_name = normalize_identity(owner_name);
        let project_name = normalize_identity(project_name);
        if owner_name.is_empty() || project_name.is_empty() {
            return Ok(None);
        }

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
            .column(project::Column::PreviousName)
            .column(project::Column::PreviousNameChangedTime)
            .column(project::Column::PreviousOwnerLoginId)
            .column(project::Column::ProjectScope)
            .column(project::Column::Vcs)
            .into_model::<ProjectRow>()
            .all(&self.db)
            .await?;
        let mut previous_match: Option<ProjectRow> = None;
        for row in rows {
            let owner_matches =
                normalize_optional(row.owner.as_deref()).as_deref() == Some(owner_name.as_str());
            let project_matches =
                normalize_optional(row.name.as_deref()).as_deref() == Some(project_name.as_str());
            if owner_matches && project_matches {
                return self.project_record_from_row(row).await;
            }
            let previous_owner_matches = normalize_optional(row.previous_owner_login_id.as_deref())
                .as_deref()
                == Some(owner_name.as_str());
            let previous_project_matches = normalize_optional(row.previous_name.as_deref())
                .as_deref()
                == Some(project_name.as_str());
            if previous_owner_matches && previous_project_matches {
                let should_replace = previous_match
                    .as_ref()
                    .and_then(|current| current.previous_name_changed_time)
                    .unwrap_or_default()
                    <= row.previous_name_changed_time.unwrap_or_default();
                if should_replace {
                    previous_match = Some(row);
                }
            }
        }

        match previous_match {
            Some(row) => self.project_record_from_row(row).await,
            None => Ok(None),
        }
    }

    pub async fn project_identifier_exists(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<bool, DbErr> {
        Ok(self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
            .is_some())
    }

    pub async fn read_direct_my_issue_project(
        &self,
        login_id: &str,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let owner_name = normalize_identity(login_id);
        if owner_name.is_empty() {
            return Ok(None);
        }

        for project_name in ["inbox", "_private"] {
            if let Some(project) = self
                .read_project_by_owner_and_name(&owner_name, project_name)
                .await?
            {
                return Ok(Some(project));
            }
        }

        if let Some(project) = self
            .read_latest_project_by_owner_and_scope(&owner_name, "private")
            .await?
        {
            return Ok(Some(project));
        }

        self.read_latest_project_by_owner_and_scope(&owner_name, "public")
            .await
    }

    pub(super) async fn read_latest_project_by_owner_and_scope(
        &self,
        owner_name: &str,
        project_scope: &str,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let owner_name = normalize_identity(owner_name);
        let project_scope = normalize_identity(project_scope);
        if owner_name.is_empty() || project_scope.is_empty() {
            return Ok(None);
        }

        let row = project::Entity::find()
            .filter(project::Column::Owner.eq(owner_name))
            .filter(project::Column::ProjectScope.eq(project_scope))
            .order_by_desc(project::Column::CreatedDate)
            .order_by_desc(project::Column::Id)
            .one(&self.db)
            .await?;

        match row {
            Some(row) => self.project_record_from_model(row).await,
            None => Ok(None),
        }
    }
}
