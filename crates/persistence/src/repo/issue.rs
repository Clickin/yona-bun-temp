use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn read_issue_detail(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) -> Result<Option<IssueRecord>, DbErr> {
        self.read_issue_detail_for_viewer(owner_name, project_name, issue_number, None)
            .await
    }

    pub async fn read_issue_updated_at(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) -> Result<Option<DateTime>, DbErr> {
        let Some((_project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        Ok(issue_model.updated_date.or(issue_model.created_date))
    }

    pub async fn restore_issue_history(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        history_markdown: &str,
    ) -> Result<bool, DbErr> {
        let Some((_project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(false);
        };
        self.write_text_column("issue", "history", issue_model.id, history_markdown)
            .await?;
        Ok(true)
    }

    pub async fn read_issue_detail_for_viewer(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        viewer_id: Option<i64>,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        let issue = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::Number.eq(Some(issue_number)))
            .one(&self.db)
            .await?;

        match issue {
            Some(issue) => self
                .issue_record_from_model(issue, &project, viewer_id)
                .await
                .map(Some),
            None => Ok(None),
        }
    }
}
