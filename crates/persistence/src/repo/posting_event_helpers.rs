use super::*;

impl AppRepository {
    pub(super) async fn clear_other_readme_postings(
        &self,
        project_id: i64,
        keep_posting_id: i64,
    ) -> Result<(), DbErr> {
        for row in posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_id)))
            .filter(posting::Column::Readme.eq(Some(1)))
            .all(&self.db)
            .await?
        {
            if row.id == keep_posting_id {
                continue;
            }
            let mut active = posting::ActiveModel::from(row);
            active.readme = Set(Some(0));
            active.update(&self.db).await?;
        }
        Ok(())
    }
}
