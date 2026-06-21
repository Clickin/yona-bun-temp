use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn list_project_issue_references(
        &self,
        project_id: i64,
        query: &str,
        limit: usize,
    ) -> Result<ProjectIssueReferenceSearchRecord, DbErr> {
        let query = query.trim();
        let normalized_query = normalize_identity(query);
        let mut models = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?;

        if query.is_empty() {
            models.sort_by(|left, right| {
                right.created_date.cmp(&left.created_date).then_with(|| {
                    right
                        .number
                        .unwrap_or_default()
                        .cmp(&left.number.unwrap_or_default())
                })
            });
            let total = models.len() as u32;
            let truncated = models.len() > limit;
            models.truncate(limit);
            return Ok(ProjectIssueReferenceSearchRecord {
                items: models.iter().map(project_issue_reference_record).collect(),
                total,
                truncated,
            });
        }

        let mut matches = models
            .into_iter()
            .filter_map(|model| {
                let issue_number = model.number.unwrap_or_default().to_string();
                let exact_number_match = issue_number == normalized_query;
                let number_prefix_match = issue_number.starts_with(&normalized_query);
                let title_match = model
                    .title
                    .as_deref()
                    .is_some_and(|title| normalize_identity(title).contains(&normalized_query));
                (number_prefix_match || title_match).then_some((
                    model,
                    exact_number_match,
                    number_prefix_match,
                    title_match,
                ))
            })
            .collect::<Vec<_>>();

        matches.sort_by(|left, right| {
            right
                .1
                .cmp(&left.1)
                .then_with(|| right.2.cmp(&left.2))
                .then_with(|| right.3.cmp(&left.3))
                .then_with(|| right.0.created_date.cmp(&left.0.created_date))
                .then_with(|| {
                    right
                        .0
                        .number
                        .unwrap_or_default()
                        .cmp(&left.0.number.unwrap_or_default())
                })
        });

        let total = matches.len() as u32;
        let truncated = matches.len() > limit;
        matches.truncate(limit);

        Ok(ProjectIssueReferenceSearchRecord {
            items: matches
                .iter()
                .map(|(model, _, _, _)| project_issue_reference_record(model))
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

        Ok(models.iter().map(project_issue_reference_record).collect())
    }
}
