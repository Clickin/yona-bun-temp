use super::*;

impl AppRepository {
    pub async fn delete_project_by_owner_and_name(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<bool, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(false);
        };
        let project_id = project_record.id;
        let project_resource_id = project_id.to_string();

        let issue_ids = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        let issue_comment_ids = if issue_ids.is_empty() {
            Vec::new()
        } else {
            issue_comment::Entity::find()
                .filter(issue_comment::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .all(&self.db)
                .await?
                .into_iter()
                .map(|row| row.id)
                .collect::<Vec<_>>()
        };
        let posting_ids = posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        let pull_request_ids = pull_request::Entity::find()
            .filter(
                Condition::any()
                    .add(pull_request::Column::ToProjectId.eq(Some(project_id)))
                    .add(pull_request::Column::FromProjectId.eq(Some(project_id))),
            )
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        let issue_label_ids = issue_label::Entity::find()
            .filter(issue_label::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        let webhook_ids = webhook::Entity::find()
            .filter(webhook::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();

        let mut thread_filter =
            Condition::any().add(comment_thread::Column::ProjectId.eq(Some(project_id)));
        if !pull_request_ids.is_empty() {
            thread_filter = thread_filter.add(
                comment_thread::Column::PullRequestId
                    .is_in(pull_request_ids.iter().copied().map(Some)),
            );
        }
        let thread_ids = comment_thread::Entity::find()
            .filter(thread_filter)
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();

        if !issue_comment_ids.is_empty() {
            issue_comment_voter::Entity::delete_many()
                .filter(
                    issue_comment_voter::Column::IssueCommentId
                        .is_in(issue_comment_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
        }
        if !issue_ids.is_empty() {
            favorite_issue::Entity::delete_many()
                .filter(favorite_issue::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            recent_issue::Entity::delete_many()
                .filter(recent_issue::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue_event::Entity::delete_many()
                .filter(issue_event::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue_issue_label::Entity::delete_many()
                .filter(issue_issue_label::Column::IssueId.is_in(issue_ids.iter().copied()))
                .exec(&self.db)
                .await?;
            issue_sharer::Entity::delete_many()
                .filter(issue_sharer::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue_voter::Entity::delete_many()
                .filter(issue_voter::Column::IssueId.is_in(issue_ids.iter().copied()))
                .exec(&self.db)
                .await?;
            issue_comment::Entity::delete_many()
                .filter(issue_comment::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue::Entity::delete_many()
                .filter(issue::Column::Id.is_in(issue_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }

        if !posting_ids.is_empty() {
            recent_issue::Entity::delete_many()
                .filter(
                    recent_issue::Column::PostingId.is_in(posting_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            posting_issue_label::Entity::delete_many()
                .filter(posting_issue_label::Column::PostingId.is_in(posting_ids.iter().copied()))
                .exec(&self.db)
                .await?;
            posting_comment::Entity::delete_many()
                .filter(
                    posting_comment::Column::PostingId.is_in(posting_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            posting::Entity::delete_many()
                .filter(posting::Column::Id.is_in(posting_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }

        if !thread_ids.is_empty() {
            review_comment::Entity::delete_many()
                .filter(
                    review_comment::Column::ThreadId.is_in(thread_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            comment_thread_n4user::Entity::delete_many()
                .filter(
                    comment_thread_n4user::Column::CommentThreadId
                        .is_in(thread_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
            comment_thread::Entity::delete_many()
                .filter(comment_thread::Column::Id.is_in(thread_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }

        if !pull_request_ids.is_empty() {
            pull_request_reviewers::Entity::delete_many()
                .filter(
                    pull_request_reviewers::Column::PullRequestId
                        .is_in(pull_request_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
            pull_request_commit::Entity::delete_many()
                .filter(
                    pull_request_commit::Column::PullRequestId
                        .is_in(pull_request_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            pull_request_event::Entity::delete_many()
                .filter(
                    pull_request_event::Column::PullRequestId
                        .is_in(pull_request_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            pull_request::Entity::delete_many()
                .filter(pull_request::Column::Id.is_in(pull_request_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }

        if !issue_label_ids.is_empty() {
            issue_issue_label::Entity::delete_many()
                .filter(
                    issue_issue_label::Column::IssueLabelId.is_in(issue_label_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
            posting_issue_label::Entity::delete_many()
                .filter(
                    posting_issue_label::Column::IssueLabelId
                        .is_in(issue_label_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
            issue_label::Entity::delete_many()
                .filter(issue_label::Column::Id.is_in(issue_label_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }
        issue_label_category::Entity::delete_many()
            .filter(issue_label_category::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        milestone::Entity::delete_many()
            .filter(milestone::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        assignee::Entity::delete_many()
            .filter(assignee::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        commit_comment::Entity::delete_many()
            .filter(commit_comment::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_transfer::Entity::delete_many()
            .filter(project_transfer::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_pushed_branch::Entity::delete_many()
            .filter(project_pushed_branch::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        if !webhook_ids.is_empty() {
            webhook_delivery::Entity::delete_many()
                .filter(
                    webhook_delivery::Column::WebhookId
                        .is_in(webhook_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            webhook_thread::Entity::delete_many()
                .filter(
                    webhook_thread::Column::WebhookId.is_in(webhook_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            webhook::Entity::delete_many()
                .filter(webhook::Column::Id.is_in(webhook_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }
        project_label::Entity::delete_many()
            .filter(project_label::Column::ProjectId.eq(project_id))
            .exec(&self.db)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_resource_id.clone())))
            .exec(&self.db)
            .await?;
        unwatch::Entity::delete_many()
            .filter(unwatch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(unwatch::Column::ResourceId.eq(Some(project_resource_id)))
            .exec(&self.db)
            .await?;
        user_project_notification::Entity::delete_many()
            .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_visitation::Entity::delete_many()
            .filter(project_visitation::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        recent_project::Entity::delete_many()
            .filter(recent_project::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        user_enrolled_project::Entity::delete_many()
            .filter(user_enrolled_project::Column::ProjectId.eq(project_id))
            .exec(&self.db)
            .await?;
        favorite_project::Entity::delete_many()
            .filter(favorite_project::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_user::Entity::delete_many()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_menu_setting::Entity::delete_many()
            .filter(project_menu_setting::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project::Entity::delete_by_id(project_id)
            .exec(&self.db)
            .await?;
        Ok(true)
    }
}
