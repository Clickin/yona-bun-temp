use super::*;

impl AppRepository {
    pub async fn list_project_milestones(
        &self,
        owner_name: &str,
        project_name: &str,
        filter: MilestoneListFilter,
    ) -> Result<Vec<IssueMilestoneRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        let mut query =
            milestone::Entity::find().filter(milestone::Column::ProjectId.eq(Some(project.id)));
        let state = normalize_identity(&filter.state);
        if matches!(state.as_str(), "open" | "closed") {
            query = query.filter(milestone::Column::State.eq(Some(issue_state_to_raw(&state))));
        }
        let order_by = normalize_identity(&filter.order_by);
        let order_dir = normalize_identity(&filter.order_dir);
        if order_by != "completionrate" {
            query = if order_dir == "desc" {
                query
                    .order_by_desc(milestone::Column::DueDate)
                    .order_by_desc(milestone::Column::Id)
            } else {
                query
                    .order_by_asc(milestone::Column::DueDate)
                    .order_by_asc(milestone::Column::Id)
            };
        }
        let rows = query.all(&self.db).await?;
        let mut records = Vec::new();
        for row in rows {
            records.push(self.issue_milestone_record(row, &project).await?);
        }
        if order_by == "completionrate" {
            records.sort_by_key(|record| (record.completion_percent, record.id));
            if order_dir == "desc" {
                records.reverse();
            }
        }
        Ok(records)
    }

    pub async fn read_project_milestone(
        &self,
        owner_name: &str,
        project_name: &str,
        milestone_id: i64,
    ) -> Result<Option<IssueMilestoneRecord>, DbErr> {
        let Some((project, row)) = self
            .read_project_milestone_model(owner_name, project_name, milestone_id)
            .await?
        else {
            return Ok(None);
        };
        self.issue_milestone_record(row, &project).await.map(Some)
    }

    pub async fn project_milestone_title_exists(
        &self,
        owner_name: &str,
        project_name: &str,
        title: &str,
        except_milestone_id: Option<i64>,
    ) -> Result<bool, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(false);
        };
        if title.is_empty() {
            return Ok(false);
        }
        let mut query = milestone::Entity::find()
            .filter(milestone::Column::ProjectId.eq(Some(project.id)))
            .filter(milestone::Column::Title.eq(Some(title.to_string())));
        if let Some(except_milestone_id) = except_milestone_id {
            query = query.filter(milestone::Column::Id.ne(except_milestone_id));
        }
        query.one(&self.db).await.map(|row| row.is_some())
    }

    pub async fn create_project_milestone(
        &self,
        input: MilestoneMutationInput,
    ) -> Result<Option<IssueMilestoneRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let created = milestone::ActiveModel {
            id: NotSet,
            title: Set(Some(input.title)),
            due_date: Set(input.due_date),
            state: Set(Some(issue_state_to_raw(&input.state))),
            project_id: Set(Some(project.id)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "milestone",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_attachments(
            MILESTONE_ATTACHMENT_CONTAINER,
            created.id,
            &input.attachment_ids,
            input.actor_id,
        )
        .await?;
        self.issue_milestone_record(created, &project)
            .await
            .map(Some)
    }

    pub async fn update_project_milestone(
        &self,
        input: UpdateMilestoneInput,
    ) -> Result<Option<IssueMilestoneRecord>, DbErr> {
        let Some((project, row)) = self
            .read_project_milestone_model(
                &input.values.owner_name,
                &input.values.project_name,
                input.milestone_id,
            )
            .await?
        else {
            return Ok(None);
        };
        let mut active = milestone::ActiveModel::from(row);
        active.title = Set(Some(input.values.title.trim().to_string()));
        active.due_date = Set(input.values.due_date);
        active.state = Set(Some(issue_state_to_raw(&input.values.state)));
        let updated = active.update(&self.db).await?;
        self.write_text_column(
            "milestone",
            "contents",
            updated.id,
            &input.values.contents_markdown,
        )
        .await?;
        self.sync_attachments(
            MILESTONE_ATTACHMENT_CONTAINER,
            updated.id,
            &input.values.attachment_ids,
            input.values.actor_id,
        )
        .await?;
        self.issue_milestone_record(updated, &project)
            .await
            .map(Some)
    }

    pub async fn update_project_milestone_state(
        &self,
        owner_name: &str,
        project_name: &str,
        milestone_id: i64,
        state: &str,
    ) -> Result<Option<IssueMilestoneRecord>, DbErr> {
        let Some((project, row)) = self
            .read_project_milestone_model(owner_name, project_name, milestone_id)
            .await?
        else {
            return Ok(None);
        };
        let mut active = milestone::ActiveModel::from(row);
        active.state = Set(Some(issue_state_to_raw(state)));
        let updated = active.update(&self.db).await?;
        self.issue_milestone_record(updated, &project)
            .await
            .map(Some)
    }

    pub async fn delete_project_milestone(
        &self,
        owner_name: &str,
        project_name: &str,
        milestone_id: i64,
    ) -> Result<bool, DbErr> {
        let Some((project, row)) = self
            .read_project_milestone_model(owner_name, project_name, milestone_id)
            .await?
        else {
            return Ok(false);
        };
        let txn = self.db.begin().await?;
        issue::Entity::update_many()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .col_expr(issue::Column::MilestoneId, Expr::value(Option::<i64>::None))
            .exec(&txn)
            .await?;
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(MILESTONE_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(row.id))
            .exec(&txn)
            .await?;
        milestone::Entity::delete_by_id(row.id).exec(&txn).await?;
        txn.commit().await?;
        Ok(true)
    }
}
