use super::*;

impl AppRepository {
    pub async fn list_legacy_project_labels(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Option<Vec<LegacyProjectLabelRecord>>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        let links = project_label::Entity::find()
            .filter(project_label::Column::ProjectId.eq(project.id))
            .order_by_asc(project_label::Column::LabelId)
            .all(&self.db)
            .await?;

        let mut labels = Vec::new();
        for link in links {
            if let Some(label) = label::Entity::find_by_id(link.label_id)
                .one(&self.db)
                .await?
            {
                labels.push(legacy_project_label_record(label));
            }
        }
        Ok(Some(labels))
    }

    pub async fn attach_legacy_project_label(
        &self,
        owner_name: &str,
        project_name: &str,
        category_name: Option<&str>,
        label_name: &str,
    ) -> Result<Option<LegacyProjectLabelAttachResult>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        let category = normalize_legacy_project_label_category(category_name);
        let name = label_name.trim();

        let existing_label = label::Entity::find()
            .filter(label::Column::Category.eq(Some(category.clone())))
            .filter(label::Column::Name.eq(Some(name.to_string())))
            .one(&self.db)
            .await?;
        let (label, created) = match existing_label {
            Some(label) => (label, false),
            None => {
                let created = label::ActiveModel {
                    category: Set(Some(category)),
                    id: NotSet,
                    name: Set(Some(name.to_string())),
                }
                .insert(&self.db)
                .await?;
                (created, true)
            }
        };

        let attached = project_label::Entity::find_by_id((project.id, label.id))
            .one(&self.db)
            .await?
            .is_none();
        if attached {
            project_label::ActiveModel {
                label_id: Set(label.id),
                project_id: Set(project.id),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(Some(LegacyProjectLabelAttachResult {
            attached,
            created,
            label: legacy_project_label_record(label),
        }))
    }

    pub async fn detach_legacy_project_label(
        &self,
        owner_name: &str,
        project_name: &str,
        label_id: i64,
    ) -> Result<Option<bool>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        if label::Entity::find_by_id(label_id)
            .one(&self.db)
            .await?
            .is_none()
        {
            return Ok(Some(false));
        }

        project_label::Entity::delete_by_id((project.id, label_id))
            .exec(&self.db)
            .await?;

        let remaining = project_label::Entity::find()
            .filter(project_label::Column::LabelId.eq(label_id))
            .count(&self.db)
            .await?;
        if remaining == 0 {
            label::Entity::delete_by_id(label_id).exec(&self.db).await?;
        }

        Ok(Some(true))
    }
}

fn normalize_legacy_project_label_category(category_name: Option<&str>) -> String {
    let category = category_name.unwrap_or("Label").trim();
    if category.is_empty() {
        "Label".to_string()
    } else {
        category.to_string()
    }
}

fn legacy_project_label_record(label: label::Model) -> LegacyProjectLabelRecord {
    LegacyProjectLabelRecord {
        category: label.category.unwrap_or_else(|| "Label".to_string()),
        id: label.id,
        name: label.name.unwrap_or_default(),
    }
}
