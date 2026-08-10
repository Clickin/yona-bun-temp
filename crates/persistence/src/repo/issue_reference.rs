use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn list_project_issue_references(
        &self,
        project_id: i64,
        query: &str,
        limit: usize,
    ) -> Result<ProjectIssueReferenceSearchRecord, DbErr> {
        let query = query.trim();
        let normalized_query = query.to_lowercase();
        let mut models = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .order_by_desc(issue::Column::CreatedDate)
            .all(&self.db)
            .await?;

        if !query.is_empty() {
            models.retain(|model| {
                let issue_number = model.number.unwrap_or_default().to_string();
                let number_prefix_match = issue_number.starts_with(&normalized_query);
                let title_match = model
                    .title
                    .as_deref()
                    .is_some_and(|title| title.to_lowercase().contains(&normalized_query));
                number_prefix_match || title_match
            });
        }

        let total = models.len() as u32;
        let truncated = models.len() > limit;
        models.truncate(limit);

        let backend = self.db.get_database_backend();
        Ok(ProjectIssueReferenceSearchRecord {
            items: models
                .iter()
                .map(|model| project_issue_reference_record(model, backend))
                .collect(),
            total,
            truncated,
        })
    }

    pub async fn list_project_issue_references_by_numbers(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_numbers: &[i64],
    ) -> Result<Vec<ProjectIssueReferenceRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        let mut numbers = issue_numbers
            .iter()
            .copied()
            .filter(|number| *number > 0)
            .collect::<Vec<_>>();
        numbers.sort_unstable();
        numbers.dedup();
        if numbers.is_empty() {
            return Ok(Vec::new());
        }

        let mut models = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::Number.is_in(numbers.into_iter().map(Some)))
            .all(&self.db)
            .await?;
        models.sort_by(|left, right| {
            left.number
                .unwrap_or_default()
                .cmp(&right.number.unwrap_or_default())
        });

        let backend = self.db.get_database_backend();
        Ok(models
            .iter()
            .map(|model| project_issue_reference_record(model, backend))
            .collect())
    }
}
