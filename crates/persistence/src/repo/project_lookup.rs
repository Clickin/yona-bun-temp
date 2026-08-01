use super::*;

impl AppRepositoryImpl<'_> {
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

        let project_lookup = || {
            project::Entity::find()
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
        };

        let current = project_lookup()
            .filter(project::Column::Owner.eq(owner_name.clone()))
            .filter(project::Column::Name.eq(project_name.clone()))
            .into_model::<ProjectRow>()
            .one(&self.db)
            .await?;
        if let Some(row) = current {
            return self.project_record_from_row(row).await;
        }

        let current = project_lookup()
            .filter(
                Expr::expr(sea_orm::sea_query::Func::lower(
                    sea_orm::sea_query::Func::cust(sea_orm::sea_query::Alias::new("TRIM"))
                        .arg(Expr::col(project::Column::Owner)),
                ))
                .eq(owner_name.clone()),
            )
            .filter(
                Expr::expr(sea_orm::sea_query::Func::lower(
                    sea_orm::sea_query::Func::cust(sea_orm::sea_query::Alias::new("TRIM"))
                        .arg(Expr::col(project::Column::Name)),
                ))
                .eq(project_name.clone()),
            )
            .into_model::<ProjectRow>()
            .one(&self.db)
            .await?;
        if let Some(row) = current {
            return self.project_record_from_row(row).await;
        }

        let previous = project_lookup()
            .filter(project::Column::PreviousOwnerLoginId.eq(owner_name.clone()))
            .filter(project::Column::PreviousName.eq(project_name.clone()))
            .order_by_desc(project::Column::PreviousNameChangedTime)
            .into_model::<ProjectRow>()
            .one(&self.db)
            .await?;
        if let Some(row) = previous {
            return self.project_record_from_row(row).await;
        }

        let previous = project_lookup()
            .filter(
                Expr::expr(sea_orm::sea_query::Func::lower(
                    sea_orm::sea_query::Func::cust(sea_orm::sea_query::Alias::new("TRIM"))
                        .arg(Expr::col(project::Column::PreviousOwnerLoginId)),
                ))
                .eq(owner_name),
            )
            .filter(
                Expr::expr(sea_orm::sea_query::Func::lower(
                    sea_orm::sea_query::Func::cust(sea_orm::sea_query::Alias::new("TRIM"))
                        .arg(Expr::col(project::Column::PreviousName)),
                ))
                .eq(project_name),
            )
            .order_by_desc(project::Column::PreviousNameChangedTime)
            .into_model::<ProjectRow>()
            .one(&self.db)
            .await?;

        match previous {
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
