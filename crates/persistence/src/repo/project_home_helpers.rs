impl AppRepository {
    pub async fn list_project_home_history_items(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Vec<ProjectHomeHistoryItemRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        let project_path = format!("/{}/{}", project.owner_name, project.project_name);
        let mut items = Vec::new();

        for row in issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::IsDraft.ne(Some(1)))
            .order_by_desc(issue::Column::CreatedDate)
            .order_by_desc(issue::Column::Id)
            .limit(10)
            .all(&self.db)
            .await?
        {
            items.push(
                self.project_home_history_item(
                    row.author_id,
                    row.author_login_id.as_deref(),
                    row.author_name.as_deref(),
                    row.created_date,
                    "issue",
                    row.number,
                    row.title.as_deref(),
                    &format!("{project_path}/issue/{}", row.number.unwrap_or_default()),
                )
                .await?,
            );
        }

        for row in posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project.id)))
            .order_by_desc(posting::Column::CreatedDate)
            .order_by_desc(posting::Column::Id)
            .limit(10)
            .all(&self.db)
            .await?
        {
            items.push(
                self.project_home_history_item(
                    row.author_id,
                    row.author_login_id.as_deref(),
                    row.author_name.as_deref(),
                    row.created_date,
                    "post",
                    row.number,
                    row.title.as_deref(),
                    &format!("{project_path}/post/{}", row.number.unwrap_or_default()),
                )
                .await?,
            );
        }

        for row in pull_request::Entity::find()
            .filter(pull_request::Column::ToProjectId.eq(Some(project.id)))
            .order_by_desc(pull_request::Column::Created)
            .order_by_desc(pull_request::Column::Id)
            .limit(10)
            .all(&self.db)
            .await?
        {
            let contributor = match row.contributor_id {
                Some(id) => self.find_user_by_id(id).await?,
                None => None,
            };
            items.push(ProjectHomeHistoryItemRecord {
                actor_email_address: contributor
                    .as_ref()
                    .map(|user| user.email_address.clone())
                    .unwrap_or_default(),
                actor_login_id: contributor
                    .as_ref()
                    .map(|user| user.login_id.clone())
                    .unwrap_or_default(),
                actor_name: contributor
                    .as_ref()
                    .map(|user| user.display_name.clone())
                    .unwrap_or_default(),
                created_at: row.created,
                created_label: format_workspace_date_label(row.created),
                item_type: "pullrequest".to_string(),
                short_title: format!("#{}", row.number.unwrap_or_default()),
                title: row.title.unwrap_or_default(),
                url_path: format!(
                    "{project_path}/pullRequest/{}",
                    row.number.unwrap_or_default()
                ),
            });
        }

        items.sort_by(|left, right| {
            right
                .created_at
                .cmp(&left.created_at)
                .then(right.url_path.cmp(&left.url_path))
        });
        Ok(items)
    }

    async fn project_home_history_item(
        &self,
        actor_id: Option<i64>,
        actor_login_id: Option<&str>,
        actor_name: Option<&str>,
        created_at: Option<DateTime>,
        item_type: &str,
        number: Option<i64>,
        title: Option<&str>,
        url_path: &str,
    ) -> Result<ProjectHomeHistoryItemRecord, DbErr> {
        let actor = match actor_id {
            Some(id) => self.find_user_by_id(id).await?,
            None => match actor_login_id {
                Some(login_id) => self.find_user_by_login_id(login_id).await?,
                None => None,
            },
        };
        Ok(ProjectHomeHistoryItemRecord {
            actor_email_address: actor
                .as_ref()
                .map(|user| user.email_address.clone())
                .unwrap_or_default(),
            actor_login_id: actor
                .as_ref()
                .map(|user| user.login_id.clone())
                .unwrap_or_else(|| actor_login_id.unwrap_or_default().to_string()),
            actor_name: actor
                .as_ref()
                .map(|user| user.display_name.clone())
                .unwrap_or_else(|| actor_name.unwrap_or_default().to_string()),
            created_at,
            created_label: format_workspace_date_label(created_at),
            item_type: item_type.to_string(),
            short_title: format!("#{}", number.unwrap_or_default()),
            title: title.unwrap_or_default().to_string(),
            url_path: url_path.to_string(),
        })
    }
}
