use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn list_project_labels(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Vec<IssueLabelRecord>, DbErr> {
        if let Some(records) = self.stable_lists.labels(owner_name, project_name).await {
            return Ok(records);
        }
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        let labels = issue_label::Entity::find()
            .filter(issue_label::Column::ProjectId.eq(Some(project.id)))
            .all(&self.db)
            .await?;
        let mut records = Vec::new();
        for label in labels {
            records.push(self.issue_label_record(label).await?);
        }
        records.sort_by(|left, right| {
            left.category_name
                .cmp(&right.category_name)
                .then_with(|| left.name.cmp(&right.name))
        });
        self.stable_lists
            .insert_labels(owner_name, project_name, &records)
            .await;
        Ok(records)
    }

    pub async fn list_project_label_categories(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Vec<IssueLabelCategoryRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        Ok(issue_label_category::Entity::find()
            .filter(issue_label_category::Column::ProjectId.eq(Some(project.id)))
            .order_by_asc(issue_label_category::Column::Name)
            .all(&self.db)
            .await?
            .into_iter()
            .map(issue_label_category_record)
            .collect())
    }

    pub async fn create_project_label(
        &self,
        input: CreateProjectLabelInput,
    ) -> Result<Option<(IssueLabelRecord, bool)>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let category = self
            .find_or_create_issue_label_category(
                project.id,
                input.category_name.trim(),
                input.category_is_exclusive,
            )
            .await?;
        if let Some(existing) = self
            .find_issue_label_by_project_category_name(
                project.id,
                category.id,
                input.label_name.trim(),
            )
            .await?
        {
            return Ok(Some((self.issue_label_record(existing).await?, false)));
        }
        let created = issue_label::ActiveModel {
            id: NotSet,
            category_id: Set(Some(category.id)),
            color: Set(Some(input.label_color)),
            name: Set(Some(input.label_name.trim().to_string())),
            project_id: Set(Some(project.id)),
        }
        .insert(&self.db)
        .await?;
        self.stable_lists
            .invalidate_labels(&input.owner_name, &input.project_name)
            .await;
        Ok(Some((self.issue_label_record(created).await?, true)))
    }

    pub async fn copy_project_labels(
        &self,
        from_owner_name: &str,
        from_project_name: &str,
        to_owner_name: &str,
        to_project_name: &str,
    ) -> Result<Option<CopyProjectLabelsResult>, DbErr> {
        let Some(from_project) = self
            .read_project_by_owner_and_name(from_owner_name, from_project_name)
            .await?
        else {
            return Ok(None);
        };
        let Some(to_project) = self
            .read_project_by_owner_and_name(to_owner_name, to_project_name)
            .await?
        else {
            return Ok(None);
        };

        let source_labels = issue_label::Entity::find()
            .filter(issue_label::Column::ProjectId.eq(Some(from_project.id)))
            .order_by_asc(issue_label::Column::Name)
            .all(&self.db)
            .await?;
        let mut copied = 0;
        let mut skipped = 0;

        for source_label in source_labels {
            let source = self.issue_label_record(source_label).await?;
            let category = self
                .find_or_create_issue_label_category(
                    to_project.id,
                    &source.category_name,
                    source.category_is_exclusive,
                )
                .await?;
            if self
                .find_issue_label_by_project_category_name(to_project.id, category.id, &source.name)
                .await?
                .is_some()
            {
                skipped += 1;
                continue;
            }
            issue_label::ActiveModel {
                id: NotSet,
                category_id: Set(Some(category.id)),
                color: Set(Some(source.color)),
                name: Set(Some(source.name)),
                project_id: Set(Some(to_project.id)),
            }
            .insert(&self.db)
            .await?;
            copied += 1;
        }

        self.stable_lists
            .invalidate_labels(to_owner_name, to_project_name)
            .await;
        Ok(Some(CopyProjectLabelsResult {
            copied,
            labels: self
                .list_project_labels(to_owner_name, to_project_name)
                .await?,
            skipped,
        }))
    }

    pub async fn update_project_label(
        &self,
        input: UpdateProjectLabelInput,
    ) -> Result<Option<IssueLabelRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        if issue_label_category::Entity::find_by_id(input.category_id)
            .one(&self.db)
            .await?
            .is_none_or(|category| category.project_id != Some(project.id))
        {
            return Err(DbErr::Custom("Issue label category not found.".to_string()));
        }
        let Some(label) = issue_label::Entity::find_by_id(input.label_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if label.project_id != Some(project.id) {
            return Ok(None);
        }
        if let Some(existing) = self
            .find_issue_label_by_project_category_name(
                project.id,
                input.category_id,
                input.label_name.trim(),
            )
            .await?
        {
            if existing.id != input.label_id {
                return Err(DbErr::Custom("Issue label already exists.".to_string()));
            }
        }
        let mut active = issue_label::ActiveModel::from(label);
        active.category_id = Set(Some(input.category_id));
        active.color = Set(Some(input.label_color));
        active.name = Set(Some(input.label_name.trim().to_string()));
        let updated = active.update(&self.db).await?;
        self.stable_lists
            .invalidate_labels(&input.owner_name, &input.project_name)
            .await;
        self.issue_label_record(updated).await.map(Some)
    }

    pub async fn delete_project_label(
        &self,
        owner_name: &str,
        project_name: &str,
        label_id: i64,
    ) -> Result<bool, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(false);
        };
        let Some(label) = issue_label::Entity::find_by_id(label_id)
            .one(&self.db)
            .await?
        else {
            return Ok(false);
        };
        if label.project_id != Some(project.id) {
            return Ok(false);
        }
        let category_id = label.category_id;
        let (_write_guard, txn, txn_started_at) = self.begin_serialized_write().await?;
        issue_issue_label::Entity::delete_many()
            .filter(issue_issue_label::Column::IssueLabelId.eq(label_id))
            .exec(&txn)
            .await?;
        posting_issue_label::Entity::delete_many()
            .filter(posting_issue_label::Column::IssueLabelId.eq(label_id))
            .exec(&txn)
            .await?;
        issue_label::Entity::delete_by_id(label_id)
            .exec(&txn)
            .await?;
        if let Some(category_id) = category_id {
            let remaining = issue_label::Entity::find()
                .filter(issue_label::Column::CategoryId.eq(Some(category_id)))
                .count(&txn)
                .await?;
            if remaining == 0 {
                issue_label_category::Entity::delete_by_id(category_id)
                    .exec(&txn)
                    .await?;
            }
        }
        self.commit_serialized_write(txn, _write_guard, txn_started_at)
            .await?;
        self.stable_lists
            .invalidate_labels(owner_name, project_name)
            .await;
        Ok(true)
    }

    pub async fn create_project_label_category(
        &self,
        input: CreateProjectLabelCategoryInput,
    ) -> Result<Option<(IssueLabelCategoryRecord, bool)>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        if let Some(existing) = self
            .find_issue_label_category_by_name(project.id, input.category_name.trim())
            .await?
        {
            return Ok(Some((issue_label_category_record(existing), false)));
        }
        let created = issue_label_category::ActiveModel {
            id: NotSet,
            project_id: Set(Some(project.id)),
            name: Set(Some(input.category_name.trim().to_string())),
            is_exclusive: Set(Some(bool_to_i16(input.category_is_exclusive))),
        }
        .insert(&self.db)
        .await?;
        self.stable_lists
            .invalidate_labels(&input.owner_name, &input.project_name)
            .await;
        Ok(Some((issue_label_category_record(created), true)))
    }

    pub async fn update_project_label_category(
        &self,
        input: UpdateProjectLabelCategoryInput,
    ) -> Result<Option<IssueLabelCategoryRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let Some(category) = issue_label_category::Entity::find_by_id(input.category_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if category.project_id != Some(project.id) {
            return Ok(None);
        }
        if let Some(existing) = self
            .find_issue_label_category_by_name(project.id, input.category_name.trim())
            .await?
        {
            if existing.id != input.category_id {
                return Err(DbErr::Custom(
                    "Issue label category already exists.".to_string(),
                ));
            }
        }
        let mut active = issue_label_category::ActiveModel::from(category);
        active.name = Set(Some(input.category_name.trim().to_string()));
        active.is_exclusive = Set(Some(bool_to_i16(input.category_is_exclusive)));
        let updated = active.update(&self.db).await?;
        self.stable_lists
            .invalidate_labels(&input.owner_name, &input.project_name)
            .await;
        Ok(Some(issue_label_category_record(updated)))
    }

    pub async fn delete_project_label_category(
        &self,
        owner_name: &str,
        project_name: &str,
        category_id: i64,
    ) -> Result<bool, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(false);
        };
        let Some(category) = issue_label_category::Entity::find_by_id(category_id)
            .one(&self.db)
            .await?
        else {
            return Ok(false);
        };
        if category.project_id != Some(project.id) {
            return Ok(false);
        }
        let labels = issue_label::Entity::find()
            .filter(issue_label::Column::CategoryId.eq(Some(category_id)))
            .all(&self.db)
            .await?;
        let (_write_guard, txn, txn_started_at) = self.begin_serialized_write().await?;
        for label in labels {
            issue_issue_label::Entity::delete_many()
                .filter(issue_issue_label::Column::IssueLabelId.eq(label.id))
                .exec(&txn)
                .await?;
            posting_issue_label::Entity::delete_many()
                .filter(posting_issue_label::Column::IssueLabelId.eq(label.id))
                .exec(&txn)
                .await?;
            issue_label::Entity::delete_by_id(label.id)
                .exec(&txn)
                .await?;
        }
        issue_label_category::Entity::delete_by_id(category_id)
            .exec(&txn)
            .await?;
        self.commit_serialized_write(txn, _write_guard, txn_started_at)
            .await?;
        self.stable_lists
            .invalidate_labels(owner_name, project_name)
            .await;
        Ok(true)
    }
}
