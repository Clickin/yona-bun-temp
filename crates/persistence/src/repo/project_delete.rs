use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn list_project_attachments_for_cleanup(
        &self,
        project_id: i64,
    ) -> Result<Vec<AttachmentRecord>, DbErr> {
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
        let posting_comment_ids = if posting_ids.is_empty() {
            Vec::new()
        } else {
            posting_comment::Entity::find()
                .filter(
                    posting_comment::Column::PostingId.is_in(posting_ids.iter().copied().map(Some)),
                )
                .all(&self.db)
                .await?
                .into_iter()
                .map(|row| row.id)
                .collect::<Vec<_>>()
        };
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
        let review_comment_ids = if thread_ids.is_empty() {
            Vec::new()
        } else {
            review_comment::Entity::find()
                .filter(
                    review_comment::Column::ThreadId.is_in(thread_ids.iter().copied().map(Some)),
                )
                .all(&self.db)
                .await?
                .into_iter()
                .map(|row| row.id)
                .collect::<Vec<_>>()
        };
        let milestone_ids = milestone::Entity::find()
            .filter(milestone::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();

        let mut filter = Condition::any().add(
            Condition::all()
                .add(
                    attachment::Column::ContainerType
                        .eq(Some(PROJECT_ATTACHMENT_CONTAINER.to_string())),
                )
                .add(attachment::Column::ContainerId.eq(project_id)),
        );
        if !issue_ids.is_empty() {
            filter = filter.add(
                Condition::all()
                    .add(
                        attachment::Column::ContainerType.is_in(
                            attachment_container_aliases(ISSUE_ATTACHMENT_CONTAINER)
                                .into_iter()
                                .map(Some),
                        ),
                    )
                    .add(attachment::Column::ContainerId.is_in(issue_ids.iter().copied())),
            );
        }
        if !issue_comment_ids.is_empty() {
            filter = filter.add(
                Condition::all()
                    .add(
                        attachment::Column::ContainerType
                            .eq(Some(ISSUE_COMMENT_ATTACHMENT_CONTAINER.to_string())),
                    )
                    .add(attachment::Column::ContainerId.is_in(issue_comment_ids.iter().copied())),
            );
        }
        if !posting_ids.is_empty() {
            filter = filter.add(
                Condition::all()
                    .add(
                        attachment::Column::ContainerType
                            .eq(Some(BOARD_POST_ATTACHMENT_CONTAINER.to_string())),
                    )
                    .add(attachment::Column::ContainerId.is_in(posting_ids.iter().copied())),
            );
        }
        if !posting_comment_ids.is_empty() {
            filter = filter.add(
                Condition::all()
                    .add(
                        attachment::Column::ContainerType.is_in(
                            attachment_container_aliases(BOARD_COMMENT_ATTACHMENT_CONTAINER)
                                .into_iter()
                                .map(Some),
                        ),
                    )
                    .add(
                        attachment::Column::ContainerId.is_in(posting_comment_ids.iter().copied()),
                    ),
            );
        }
        if !pull_request_ids.is_empty() {
            filter = filter.add(
                Condition::all()
                    .add(
                        attachment::Column::ContainerType
                            .eq(Some(PULL_REQUEST_ATTACHMENT_CONTAINER.to_string())),
                    )
                    .add(attachment::Column::ContainerId.is_in(pull_request_ids.iter().copied())),
            );
        }
        if !milestone_ids.is_empty() {
            filter = filter.add(
                Condition::all()
                    .add(
                        attachment::Column::ContainerType
                            .eq(Some(MILESTONE_ATTACHMENT_CONTAINER.to_string())),
                    )
                    .add(attachment::Column::ContainerId.is_in(milestone_ids.iter().copied())),
            );
        }
        if !thread_ids.is_empty() {
            filter = filter.add(
                Condition::all()
                    .add(attachment::Column::ContainerType.eq(Some("COMMENT_THREAD".to_string())))
                    .add(attachment::Column::ContainerId.is_in(thread_ids.iter().copied())),
            );
        }
        if !review_comment_ids.is_empty() {
            filter = filter.add(
                Condition::all()
                    .add(
                        attachment::Column::ContainerType
                            .eq(Some(REVIEW_COMMENT_ATTACHMENT_CONTAINER.to_string())),
                    )
                    .add(attachment::Column::ContainerId.is_in(review_comment_ids.iter().copied())),
            );
        }

        Ok(attachment::Entity::find()
            .filter(filter)
            .order_by_asc(attachment::Column::Id)
            .all(&self.db)
            .await?
            .into_iter()
            .map(|model| AttachmentRecord {
                container_id: model.container_id,
                container_type: model.container_type.unwrap_or_default(),
                created_at: model.created_date,
                hash: model.hash.unwrap_or_default(),
                id: model.id,
                mime_type: model.mime_type.unwrap_or_default(),
                name: model.name.unwrap_or_default(),
                owner_login_id: model.owner_login_id.unwrap_or_default(),
                size: model.size.unwrap_or_default(),
            })
            .collect())
    }

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
        let review_comment_ids = if thread_ids.is_empty() {
            Vec::new()
        } else {
            review_comment::Entity::find()
                .filter(
                    review_comment::Column::ThreadId.is_in(thread_ids.iter().copied().map(Some)),
                )
                .all(&self.db)
                .await?
                .into_iter()
                .map(|row| row.id)
                .collect::<Vec<_>>()
        };
        let milestone_ids = milestone::Entity::find()
            .filter(milestone::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        let posting_comment_ids = if posting_ids.is_empty() {
            Vec::new()
        } else {
            posting_comment::Entity::find()
                .filter(
                    posting_comment::Column::PostingId.is_in(posting_ids.iter().copied().map(Some)),
                )
                .all(&self.db)
                .await?
                .into_iter()
                .map(|row| row.id)
                .collect::<Vec<_>>()
        };

        let (_write_guard, txn, txn_started_at) = self.begin_serialized_write().await?;
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(PROJECT_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(project_id))
            .exec(&txn)
            .await?;
        if !issue_ids.is_empty() {
            attachment::Entity::delete_many()
                .filter(
                    attachment::Column::ContainerType.is_in(
                        attachment_container_aliases(ISSUE_ATTACHMENT_CONTAINER)
                            .into_iter()
                            .map(Some),
                    ),
                )
                .filter(attachment::Column::ContainerId.is_in(issue_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }
        if !issue_comment_ids.is_empty() {
            attachment::Entity::delete_many()
                .filter(
                    attachment::Column::ContainerType
                        .eq(Some(ISSUE_COMMENT_ATTACHMENT_CONTAINER.to_string())),
                )
                .filter(attachment::Column::ContainerId.is_in(issue_comment_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }
        if !posting_ids.is_empty() {
            attachment::Entity::delete_many()
                .filter(
                    attachment::Column::ContainerType
                        .eq(Some(BOARD_POST_ATTACHMENT_CONTAINER.to_string())),
                )
                .filter(attachment::Column::ContainerId.is_in(posting_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }
        if !pull_request_ids.is_empty() {
            attachment::Entity::delete_many()
                .filter(
                    attachment::Column::ContainerType
                        .eq(Some(PULL_REQUEST_ATTACHMENT_CONTAINER.to_string())),
                )
                .filter(attachment::Column::ContainerId.is_in(pull_request_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(MILESTONE_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.is_in(milestone_ids.iter().copied()))
            .exec(&txn)
            .await?;
        if !thread_ids.is_empty() {
            attachment::Entity::delete_many()
                .filter(attachment::Column::ContainerType.eq(Some("COMMENT_THREAD".to_string())))
                .filter(attachment::Column::ContainerId.is_in(thread_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }
        if !review_comment_ids.is_empty() {
            attachment::Entity::delete_many()
                .filter(
                    attachment::Column::ContainerType
                        .eq(Some(REVIEW_COMMENT_ATTACHMENT_CONTAINER.to_string())),
                )
                .filter(attachment::Column::ContainerId.is_in(review_comment_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }
        if !posting_ids.is_empty() {
            if !posting_comment_ids.is_empty() {
                attachment::Entity::delete_many()
                    .filter(
                        attachment::Column::ContainerType.is_in(
                            attachment_container_aliases(BOARD_COMMENT_ATTACHMENT_CONTAINER)
                                .into_iter()
                                .map(Some),
                        ),
                    )
                    .filter(
                        attachment::Column::ContainerId.is_in(posting_comment_ids.iter().copied()),
                    )
                    .exec(&txn)
                    .await?;
            }
        }
        if !issue_comment_ids.is_empty() {
            issue_comment_voter::Entity::delete_many()
                .filter(
                    issue_comment_voter::Column::IssueCommentId
                        .is_in(issue_comment_ids.iter().copied()),
                )
                .exec(&txn)
                .await?;
        }
        if !issue_ids.is_empty() {
            favorite_issue::Entity::delete_many()
                .filter(favorite_issue::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&txn)
                .await?;
            recent_issue::Entity::delete_many()
                .filter(recent_issue::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&txn)
                .await?;
            issue_event::Entity::delete_many()
                .filter(issue_event::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&txn)
                .await?;
            issue_issue_label::Entity::delete_many()
                .filter(issue_issue_label::Column::IssueId.is_in(issue_ids.iter().copied()))
                .exec(&txn)
                .await?;
            issue_sharer::Entity::delete_many()
                .filter(issue_sharer::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&txn)
                .await?;
            issue_voter::Entity::delete_many()
                .filter(issue_voter::Column::IssueId.is_in(issue_ids.iter().copied()))
                .exec(&txn)
                .await?;
            issue_comment::Entity::delete_many()
                .filter(issue_comment::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&txn)
                .await?;
            issue::Entity::delete_many()
                .filter(issue::Column::Id.is_in(issue_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }

        if !posting_ids.is_empty() {
            recent_issue::Entity::delete_many()
                .filter(
                    recent_issue::Column::PostingId.is_in(posting_ids.iter().copied().map(Some)),
                )
                .exec(&txn)
                .await?;
            posting_issue_label::Entity::delete_many()
                .filter(posting_issue_label::Column::PostingId.is_in(posting_ids.iter().copied()))
                .exec(&txn)
                .await?;
            posting_comment::Entity::delete_many()
                .filter(
                    posting_comment::Column::PostingId.is_in(posting_ids.iter().copied().map(Some)),
                )
                .exec(&txn)
                .await?;
            posting::Entity::delete_many()
                .filter(posting::Column::Id.is_in(posting_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }

        if !thread_ids.is_empty() {
            review_comment::Entity::delete_many()
                .filter(
                    review_comment::Column::ThreadId.is_in(thread_ids.iter().copied().map(Some)),
                )
                .exec(&txn)
                .await?;
            comment_thread_n4user::Entity::delete_many()
                .filter(
                    comment_thread_n4user::Column::CommentThreadId
                        .is_in(thread_ids.iter().copied()),
                )
                .exec(&txn)
                .await?;
            comment_thread::Entity::delete_many()
                .filter(comment_thread::Column::Id.is_in(thread_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }

        if !pull_request_ids.is_empty() {
            pull_request_reviewers::Entity::delete_many()
                .filter(
                    pull_request_reviewers::Column::PullRequestId
                        .is_in(pull_request_ids.iter().copied()),
                )
                .exec(&txn)
                .await?;
            pull_request_commit::Entity::delete_many()
                .filter(
                    pull_request_commit::Column::PullRequestId
                        .is_in(pull_request_ids.iter().copied().map(Some)),
                )
                .exec(&txn)
                .await?;
            pull_request_event::Entity::delete_many()
                .filter(
                    pull_request_event::Column::PullRequestId
                        .is_in(pull_request_ids.iter().copied().map(Some)),
                )
                .exec(&txn)
                .await?;
            pull_request::Entity::delete_many()
                .filter(pull_request::Column::Id.is_in(pull_request_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }

        if !issue_label_ids.is_empty() {
            issue_issue_label::Entity::delete_many()
                .filter(
                    issue_issue_label::Column::IssueLabelId.is_in(issue_label_ids.iter().copied()),
                )
                .exec(&txn)
                .await?;
            posting_issue_label::Entity::delete_many()
                .filter(
                    posting_issue_label::Column::IssueLabelId
                        .is_in(issue_label_ids.iter().copied()),
                )
                .exec(&txn)
                .await?;
            issue_label::Entity::delete_many()
                .filter(issue_label::Column::Id.is_in(issue_label_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }
        issue_label_category::Entity::delete_many()
            .filter(issue_label_category::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        milestone::Entity::delete_many()
            .filter(milestone::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        assignee::Entity::delete_many()
            .filter(assignee::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        commit_comment::Entity::delete_many()
            .filter(commit_comment::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_transfer::Entity::delete_many()
            .filter(project_transfer::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_pushed_branch::Entity::delete_many()
            .filter(project_pushed_branch::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        if !webhook_ids.is_empty() {
            webhook_delivery::Entity::delete_many()
                .filter(
                    webhook_delivery::Column::WebhookId
                        .is_in(webhook_ids.iter().copied().map(Some)),
                )
                .exec(&txn)
                .await?;
            webhook_thread::Entity::delete_many()
                .filter(
                    webhook_thread::Column::WebhookId.is_in(webhook_ids.iter().copied().map(Some)),
                )
                .exec(&txn)
                .await?;
            webhook::Entity::delete_many()
                .filter(webhook::Column::Id.is_in(webhook_ids.iter().copied()))
                .exec(&txn)
                .await?;
        }
        project_label::Entity::delete_many()
            .filter(project_label::Column::ProjectId.eq(project_id))
            .exec(&txn)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_resource_id.clone())))
            .exec(&txn)
            .await?;
        unwatch::Entity::delete_many()
            .filter(unwatch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(unwatch::Column::ResourceId.eq(Some(project_resource_id)))
            .exec(&txn)
            .await?;
        user_project_notification::Entity::delete_many()
            .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_visitation::Entity::delete_many()
            .filter(project_visitation::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        recent_project::Entity::delete_many()
            .filter(recent_project::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        user_enrolled_project::Entity::delete_many()
            .filter(user_enrolled_project::Column::ProjectId.eq(project_id))
            .exec(&txn)
            .await?;
        favorite_project::Entity::delete_many()
            .filter(favorite_project::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_user::Entity::delete_many()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project_menu_setting::Entity::delete_many()
            .filter(project_menu_setting::Column::ProjectId.eq(Some(project_id)))
            .exec(&txn)
            .await?;
        project::Entity::delete_by_id(project_id).exec(&txn).await?;
        self.commit_serialized_write(txn, _write_guard, txn_started_at)
            .await?;
        Ok(true)
    }
}
