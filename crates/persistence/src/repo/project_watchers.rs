use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn count_project_members(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn count_project_watchers(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn list_project_watchers(
        &self,
        project_id: i64,
    ) -> Result<ProjectWatcherListRecord, DbErr> {
        let watch_rows = watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .all(&self.db)
            .await?;

        let mut watchers = Vec::new();
        for watch_row in watch_rows {
            let Some(user_id) = watch_row.user_id else {
                continue;
            };
            let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
                continue;
            };
            let login_id = user.login_id.unwrap_or_default();
            if login_id.is_empty() {
                continue;
            }
            watchers.push(ProjectWatcherRecord {
                email_address: user.email.unwrap_or_default(),
                login_id,
                user_id,
                user_label: user.name.unwrap_or_default(),
            });
        }
        watchers.sort_by(|left, right| {
            left.user_label
                .cmp(&right.user_label)
                .then_with(|| left.login_id.cmp(&right.login_id))
        });

        Ok(ProjectWatcherListRecord { watchers })
    }

    pub async fn list_legacy_external_post_watchers(
        &self,
        owner_name: &str,
        project_name: &str,
        number: i64,
        legacy_type: &str,
        limit: u64,
    ) -> Result<LegacyExternalWatcherListRecord, DbErr> {
        let target = match legacy_type {
            "issues" => self
                .read_project_issue_model(owner_name, project_name, number)
                .await?
                .map(|model| ("ISSUE", model.1.id)),
            "posts" => self
                .read_project_posting_model(owner_name, project_name, number)
                .await?
                .map(|model| ("POSTING", model.1.id)),
            _ => None,
        };
        let Some((resource_type, resource_id)) = target else {
            return Ok(LegacyExternalWatcherListRecord {
                total_watchers: 0,
                watchers: Vec::new(),
            });
        };

        let total_watchers = watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(watch::Column::ResourceId.eq(Some(resource_id.to_string())))
            .count(&self.db)
            .await? as u32;
        let watch_rows = watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(watch::Column::ResourceId.eq(Some(resource_id.to_string())))
            .order_by_asc(watch::Column::Id)
            .limit(limit)
            .all(&self.db)
            .await?;
        let mut watchers = Vec::new();
        for watch_row in watch_rows {
            let Some(user_id) = watch_row.user_id else {
                continue;
            };
            let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
                continue;
            };
            let login_id = user.login_id.unwrap_or_default();
            if login_id.is_empty() {
                continue;
            }
            watchers.push(LegacyExternalWatcherRecord {
                login_id,
                name: user.name.unwrap_or_default(),
                user_id,
            });
        }

        Ok(LegacyExternalWatcherListRecord {
            total_watchers,
            watchers,
        })
    }

    pub async fn list_legacy_project_title_heads(
        &self,
        owner_name: &str,
        project_name: &str,
        query: &str,
    ) -> Result<Vec<LegacyProjectTitleHeadRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        let needle = query.to_ascii_lowercase();
        let mut title_heads = title_head::Entity::find()
            .filter(title_head::Column::ProjectId.eq(Some(project.id)))
            .order_by_asc(title_head::Column::HeadKeyword)
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| {
                let name = row.head_keyword.unwrap_or_default();
                if !name.to_ascii_lowercase().contains(&needle) {
                    return None;
                }
                Some(LegacyProjectTitleHeadRecord {
                    frequency: row.frequency.unwrap_or_default(),
                    name,
                })
            })
            .collect::<Vec<_>>();
        title_heads.sort_by(|left, right| left.name.cmp(&right.name));
        Ok(title_heads)
    }
}
