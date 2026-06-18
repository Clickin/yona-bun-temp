impl AppRepository {
    pub async fn read_project_menu_settings(
        &self,
        project_id: i64,
    ) -> Result<ProjectMenuSettingsRecord, DbErr> {
        let Some(row) = project_menu_setting::Entity::find()
            .filter(project_menu_setting::Column::ProjectId.eq(Some(project_id)))
            .one(&self.db)
            .await?
        else {
            return Ok(all_project_menu_settings_enabled());
        };

        Ok(ProjectMenuSettingsRecord {
            board: row.board.unwrap_or(1) != 0,
            code: row.code.unwrap_or(1) != 0,
            issue: row.issue.unwrap_or(1) != 0,
            milestone: row.milestone.unwrap_or(1) != 0,
            pull_request: row.pull_request.unwrap_or(1) != 0,
            review: row.review.unwrap_or(1) != 0,
        })
    }

    pub async fn set_project_menu_settings(
        &self,
        project_id: i64,
        settings: ProjectMenuSettingsRecord,
    ) -> Result<(), DbErr> {
        let existing = project_menu_setting::Entity::find()
            .filter(project_menu_setting::Column::ProjectId.eq(Some(project_id)))
            .one(&self.db)
            .await?;

        if let Some(row) = existing {
            let mut active = project_menu_setting::ActiveModel::from(row);
            active.code = Set(Some(bool_to_i16(settings.code)));
            active.issue = Set(Some(bool_to_i16(settings.issue)));
            active.pull_request = Set(Some(bool_to_i16(settings.pull_request)));
            active.review = Set(Some(bool_to_i16(settings.review)));
            active.milestone = Set(Some(bool_to_i16(settings.milestone)));
            active.board = Set(Some(bool_to_i16(settings.board)));
            active.update(&self.db).await?;
        } else {
            project_menu_setting::ActiveModel {
                id: NotSet,
                project_id: Set(Some(project_id)),
                code: Set(Some(bool_to_i16(settings.code))),
                issue: Set(Some(bool_to_i16(settings.issue))),
                pull_request: Set(Some(bool_to_i16(settings.pull_request))),
                review: Set(Some(bool_to_i16(settings.review))),
                milestone: Set(Some(bool_to_i16(settings.milestone))),
                board: Set(Some(bool_to_i16(settings.board))),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(())
    }

    pub async fn set_project_reviewer_settings(
        &self,
        project_id: i64,
        default_reviewer_count: u32,
        is_using_reviewer_count: bool,
    ) -> Result<(), DbErr> {
        let Some(row) = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?
        else {
            return Ok(());
        };
        let mut active = project::ActiveModel::from(row);
        active.default_reviewer_count = Set(Some(default_reviewer_count.max(1) as i32));
        active.is_using_reviewer_count = Set(Some(bool_to_i16(is_using_reviewer_count)));
        active.update(&self.db).await?;
        Ok(())
    }
}
