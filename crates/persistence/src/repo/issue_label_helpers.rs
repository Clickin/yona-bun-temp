use super::*;

impl AppRepository {
    pub(super) async fn issue_label_record(
        &self,
        label: issue_label::Model,
    ) -> Result<IssueLabelRecord, DbErr> {
        let (category_name, category_is_exclusive) = match label.category_id {
            Some(category_id) => {
                let category = issue_label_category::Entity::find_by_id(category_id)
                    .one(&self.db)
                    .await?;
                (
                    category
                        .as_ref()
                        .and_then(|row| row.name.clone())
                        .unwrap_or_default(),
                    category
                        .as_ref()
                        .and_then(|row| row.is_exclusive)
                        .unwrap_or_default()
                        != 0,
                )
            }
            None => (String::new(), false),
        };
        Ok(IssueLabelRecord {
            category_id: label.category_id,
            category_is_exclusive,
            category_name,
            color: label.color.unwrap_or_default(),
            id: label.id,
            name: label.name.unwrap_or_default(),
        })
    }

    pub(super) async fn read_project_posting_model(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
    ) -> Result<Option<(ProjectRecord, posting::Model)>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        let model = posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_record.id)))
            .filter(posting::Column::Number.eq(Some(post_number)))
            .one(&self.db)
            .await?;
        Ok(model.map(|model| (project_record, model)))
    }

    pub(super) async fn project_posting_list_item_from_model(
        &self,
        model: posting::Model,
        project: &ProjectRecord,
    ) -> Result<ProjectPostingListItemRecord, DbErr> {
        let author_id = model.author_id;
        let author_login_id = model.author_login_id.unwrap_or_default();
        let author_email_address = self
            .user_email_for_id_or_login(author_id, &author_login_id)
            .await?;
        Ok(ProjectPostingListItemRecord {
            author_email_address,
            author_label: model.author_name.unwrap_or_default(),
            author_login_id,
            comment_count: model.num_of_comments.unwrap_or_default().max(0) as u32,
            created_label: format_workspace_date_label(model.created_date),
            created_title: format_legacy_datetime_title(model.created_date),
            labels: self.list_posting_labels(model.id).await?,
            notice: model.notice.unwrap_or_default() != 0,
            owner_name: project.owner_name.clone(),
            post_number: model.number.unwrap_or_default(),
            project_id: project.id,
            project_name: project.project_name.clone(),
            readme: model.readme.unwrap_or_default() != 0,
            title: model.title.unwrap_or_default(),
            updated_label: format_workspace_date_label(model.updated_date.or(model.created_date)),
        })
    }

    pub(super) async fn posting_record_from_model(
        &self,
        model: posting::Model,
        project: &ProjectRecord,
        viewer_id: Option<i64>,
    ) -> Result<PostingRecord, DbErr> {
        let watcher_count = self.count_posting_watchers(model.id).await?;
        let is_watching = match viewer_id {
            Some(viewer_id) => self.is_posting_watched_by(model.id, viewer_id).await?,
            None => false,
        };
        Ok(PostingRecord {
            attachments: self
                .list_issue_attachments(BOARD_POST_ATTACHMENT_CONTAINER, model.id)
                .await?,
            author_id: model.author_id,
            author_label: model.author_name.unwrap_or_default(),
            author_login_id: model.author_login_id.unwrap_or_default(),
            body_markdown: self.read_text_column("posting", "body", model.id).await?,
            comment_count: model.num_of_comments.unwrap_or_default().max(0) as u32,
            comments: self.list_posting_comments(model.id).await?,
            created_at: model.created_date,
            created_label: format_workspace_date_label(model.created_date),
            history_markdown: self
                .read_text_column("posting", "history", model.id)
                .await?,
            id: model.id,
            is_watching,
            labels: self.list_posting_labels(model.id).await?,
            notice: model.notice.unwrap_or_default() != 0,
            owner_name: project.owner_name.clone(),
            post_number: model.number.unwrap_or_default(),
            project_name: project.project_name.clone(),
            readme: model.readme.unwrap_or_default() != 0,
            title: model.title.unwrap_or_default(),
            updated_at: model.updated_date.or(model.created_date),
            updated_label: format_workspace_date_label(model.updated_date.or(model.created_date)),
            watcher_count,
        })
    }

    pub(super) async fn list_posting_labels(
        &self,
        posting_id: i64,
    ) -> Result<Vec<IssueLabelRecord>, DbErr> {
        let links = posting_issue_label::Entity::find()
            .filter(posting_issue_label::Column::PostingId.eq(posting_id))
            .all(&self.db)
            .await?;
        let mut labels = Vec::new();
        for link in links {
            if let Some(label) = issue_label::Entity::find_by_id(link.issue_label_id)
                .one(&self.db)
                .await?
            {
                labels.push(self.issue_label_record(label).await?);
            }
        }
        Ok(labels)
    }

    pub(super) async fn find_or_create_issue_label_category(
        &self,
        project_id: i64,
        category_name: &str,
        is_exclusive: bool,
    ) -> Result<issue_label_category::Model, DbErr> {
        if let Some(existing) = self
            .find_issue_label_category_by_name(project_id, category_name)
            .await?
        {
            return Ok(existing);
        }
        issue_label_category::ActiveModel {
            id: NotSet,
            project_id: Set(Some(project_id)),
            name: Set(Some(category_name.trim().to_string())),
            is_exclusive: Set(Some(bool_to_i16(is_exclusive))),
        }
        .insert(&self.db)
        .await
    }

    pub(super) async fn find_issue_label_category_by_name(
        &self,
        project_id: i64,
        category_name: &str,
    ) -> Result<Option<issue_label_category::Model>, DbErr> {
        issue_label_category::Entity::find()
            .filter(issue_label_category::Column::ProjectId.eq(Some(project_id)))
            .filter(issue_label_category::Column::Name.eq(Some(category_name.trim().to_string())))
            .one(&self.db)
            .await
    }

    pub(super) async fn find_issue_label_by_project_category_name(
        &self,
        project_id: i64,
        category_id: i64,
        label_name: &str,
    ) -> Result<Option<issue_label::Model>, DbErr> {
        issue_label::Entity::find()
            .filter(issue_label::Column::ProjectId.eq(Some(project_id)))
            .filter(issue_label::Column::CategoryId.eq(Some(category_id)))
            .filter(issue_label::Column::Name.eq(Some(label_name.trim().to_string())))
            .one(&self.db)
            .await
    }

    pub(super) async fn project_issue_list_item_record(
        &self,
        model: issue::Model,
        project: &ProjectRecord,
    ) -> Result<ProjectIssueListItemRecord, DbErr> {
        let author_id = model.author_id;
        let author_login_id = model.author_login_id.unwrap_or_default();
        let author_email_address = self
            .user_email_for_id_or_login(author_id, &author_login_id)
            .await?;
        let (assignee_login_id, assignee_label) =
            self.issue_assignee_summary(model.assignee_id).await?;
        let assignee_email_address = self.issue_assignee_email_address(model.assignee_id).await?;
        let (milestone_id, milestone_title) =
            self.issue_milestone_summary(model.milestone_id).await?;
        let (parent_issue_number, parent_issue_title) =
            self.issue_parent_summary(model.parent_id).await?;
        let due_date = model.due_date;
        let child_issues = self
            .list_issue_child_records(model.id, &author_login_id)
            .await?;
        let child_open_count = child_issues
            .iter()
            .filter(|child| child.state == "open")
            .count() as u32;
        let child_closed_count = child_issues
            .iter()
            .filter(|child| child.state == "closed")
            .count() as u32;
        let item = ProjectIssueListItemRecord {
            assignee_label,
            assignee_email_address,
            assignee_login_id,
            author_email_address,
            author_label: model.author_name.unwrap_or_default(),
            child_closed_count,
            child_issues,
            child_open_count,
            author_login_id,
            comment_count: model.num_of_comments.unwrap_or_default().max(0) as u32,
            created_label: format_workspace_date_label(model.created_date),
            created_title: format_legacy_datetime_title(model.created_date),
            due_date_label: format_workspace_date_label(due_date),
            due_date_overdue: due_date
                .is_some_and(|value| value < DateTimeUtc::from(SystemTime::now()).naive_utc()),
            id: model.id,
            is_draft: model.is_draft.unwrap_or_default() != 0,
            issue_number: model.number.unwrap_or_default(),
            labels: self.list_issue_labels(model.id).await?,
            milestone_id,
            milestone_title,
            owner_name: project.owner_name.clone(),
            parent_issue_number,
            parent_issue_title,
            project_id: project.id,
            project_name: project.project_name.clone(),
            state: if model.is_draft.unwrap_or_default() != 0 {
                "draft".to_string()
            } else {
                issue_state_from_raw(model.state)
            },
            title: model.title.unwrap_or_default(),
            updated_label: format_workspace_date_label(model.updated_date),
            voter_count: self.count_issue_voters(model.id).await?,
            watcher_count: self.count_issue_watchers(model.id).await?,
            weight: model.weight.unwrap_or_default(),
        };
        Ok(item)
    }

    pub(super) async fn list_milestone_issues(
        &self,
        project: &ProjectRecord,
        milestone_id: i64,
        state: &str,
    ) -> Result<Vec<ProjectIssueListItemRecord>, DbErr> {
        let rows = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::MilestoneId.eq(Some(milestone_id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw(state))))
            .order_by_desc(issue::Column::Number)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            items.push(self.project_issue_list_item_record(row, project).await?);
        }
        Ok(items)
    }

    pub(super) async fn issue_milestone_record(
        &self,
        row: milestone::Model,
        project: &ProjectRecord,
    ) -> Result<IssueMilestoneRecord, DbErr> {
        let open_issue_count = issue::Entity::find()
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw("open"))))
            .count(&self.db)
            .await? as u32;
        let closed_issue_count = issue::Entity::find()
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw("closed"))))
            .count(&self.db)
            .await? as u32;
        let total = open_issue_count + closed_issue_count;
        let completion_percent = if total == 0 {
            0
        } else {
            closed_issue_count.saturating_mul(100) / total
        };
        let open_issues = self.list_milestone_issues(project, row.id, "open").await?;
        let closed_issues = self
            .list_milestone_issues(project, row.id, "closed")
            .await?;
        Ok(IssueMilestoneRecord {
            attachments: self
                .list_issue_attachments(MILESTONE_ATTACHMENT_CONTAINER, row.id)
                .await?,
            closed_issue_count,
            closed_issues,
            completion_percent,
            contents_markdown: self
                .read_text_column("milestone", "contents", row.id)
                .await?,
            due_date: row.due_date,
            due_date_label: format_workspace_date_label(row.due_date),
            id: row.id,
            open_issue_count,
            open_issues,
            state: issue_state_from_raw(row.state),
            title: row.title.unwrap_or_default(),
        })
    }

    pub(super) async fn replace_issue_labels(
        &self,
        issue_id: i64,
        project_id: i64,
        label_ids: &[i64],
    ) -> Result<(), DbErr> {
        issue_issue_label::Entity::delete_many()
            .filter(issue_issue_label::Column::IssueId.eq(issue_id))
            .exec(&self.db)
            .await?;
        let mut seen = HashSet::new();
        for label_id in label_ids {
            if seen.insert(*label_id)
                && self.label_belongs_to_project(project_id, *label_id).await?
            {
                issue_issue_label::ActiveModel {
                    issue_id: Set(issue_id),
                    issue_label_id: Set(*label_id),
                }
                .insert(&self.db)
                .await?;
            }
        }
        Ok(())
    }

    pub(super) async fn replace_posting_labels(
        &self,
        posting_id: i64,
        project_id: i64,
        label_ids: &[i64],
    ) -> Result<(), DbErr> {
        posting_issue_label::Entity::delete_many()
            .filter(posting_issue_label::Column::PostingId.eq(posting_id))
            .exec(&self.db)
            .await?;
        let mut seen = HashSet::new();
        for label_id in label_ids {
            if seen.insert(*label_id)
                && self.label_belongs_to_project(project_id, *label_id).await?
            {
                posting_issue_label::ActiveModel {
                    posting_id: Set(posting_id),
                    issue_label_id: Set(*label_id),
                }
                .insert(&self.db)
                .await?;
            }
        }
        Ok(())
    }

    pub(super) async fn label_belongs_to_project(
        &self,
        project_id: i64,
        label_id: i64,
    ) -> Result<bool, DbErr> {
        Ok(issue_label::Entity::find_by_id(label_id)
            .one(&self.db)
            .await?
            .is_some_and(|row| row.project_id == Some(project_id)))
    }
}
