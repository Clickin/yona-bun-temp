use super::*;

impl AppRepositoryImpl<'_> {
    pub(super) fn organization_record_from_model(
        &self,
        model: organization::Model,
    ) -> Option<OrganizationRecord> {
        Some(OrganizationRecord {
            id: model.id,
            organization_name: model.name?,
            description: model.descr,
            created_date: model.created,
        })
    }

    pub(super) async fn project_record_from_row(
        &self,
        row: ProjectRow,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let organization_name = match row.organization_id {
            Some(organization_id) => organization::Entity::find_by_id(organization_id)
                .one(&self.db)
                .await?
                .and_then(|item| item.name),
            None => None,
        };

        let owner_name = row.owner.unwrap_or_default();
        let project_name = row.name.unwrap_or_default();
        if owner_name.is_empty() || project_name.is_empty() {
            return Ok(None);
        }

        Ok(Some(ProjectRecord {
            created_date: row.created_date,
            default_reviewer_count: row.default_reviewer_count.unwrap_or_default().max(0) as u32,
            is_code_accessible_member_only: row.is_code_accessible_member_only.unwrap_or_default()
                != 0,
            is_using_reviewer_count: row.is_using_reviewer_count.unwrap_or_default() != 0,
            last_pushed_date: row.last_pushed_date,
            id: row.id,
            original_project_id: row.original_project_id,
            organization_id: row.organization_id,
            organization_name,
            owner_name,
            overview: row.overview,
            previous_owner_name: row.previous_owner_login_id,
            previous_project_name: row.previous_name,
            project_name,
            project_scope: row.project_scope.unwrap_or_else(|| "public".to_string()),
            vcs: row.vcs.unwrap_or_else(|| "GIT".to_string()),
        }))
    }

    pub(super) async fn project_record_from_model(
        &self,
        model: project::Model,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let organization_name = match model.organization_id {
            Some(organization_id) => organization::Entity::find_by_id(organization_id)
                .one(&self.db)
                .await?
                .and_then(|row| row.name),
            None => None,
        };

        Ok(self.project_record_from_model_with_organization_name(model, organization_name))
    }

    pub(super) fn project_record_from_model_with_organization_name(
        &self,
        model: project::Model,
        organization_name: Option<String>,
    ) -> Option<ProjectRecord> {
        let owner_name = model.owner.unwrap_or_default();
        let project_name = model.name.unwrap_or_default();
        if owner_name.is_empty() || project_name.is_empty() {
            return None;
        }

        Some(ProjectRecord {
            created_date: model.created_date,
            default_reviewer_count: model.default_reviewer_count.unwrap_or_default().max(0) as u32,
            is_code_accessible_member_only: model
                .is_code_accessible_member_only
                .unwrap_or_default()
                != 0,
            is_using_reviewer_count: model.is_using_reviewer_count.unwrap_or_default() != 0,
            last_pushed_date: model.last_pushed_date,
            id: model.id,
            original_project_id: model.original_project_id,
            organization_id: model.organization_id,
            organization_name,
            owner_name,
            overview: model.overview,
            previous_owner_name: model.previous_owner_login_id,
            previous_project_name: model.previous_name,
            project_name,
            project_scope: model.project_scope.unwrap_or_else(|| "public".to_string()),
            vcs: model.vcs.unwrap_or_else(|| "GIT".to_string()),
        })
    }

    pub(super) async fn issue_record_from_model(
        &self,
        model: issue::Model,
        project: &ProjectRecord,
        viewer_id: Option<i64>,
    ) -> Result<IssueRecord, DbErr> {
        let author_id = model.author_id;
        let author_login_id = model.author_login_id.unwrap_or_default();
        let author_label = model.author_name.unwrap_or_default();
        let author_email_address = self
            .user_email_for_id_or_login(author_id, &author_login_id)
            .await?;
        let (assignee_login_id, assignee_label) =
            self.issue_assignee_summary(model.assignee_id).await?;
        let assignee_email_address = self.issue_assignee_email_address(model.assignee_id).await?;
        let (milestone_id, milestone_title) =
            self.issue_milestone_summary(model.milestone_id).await?;
        let parent_issue_id = model.parent_id;
        let (parent_issue_number, parent_issue_title) =
            self.issue_parent_summary(parent_issue_id).await?;
        let parent_issue_state = self.issue_parent_state(parent_issue_id).await?;
        let parent_group_issue_id = parent_issue_id.unwrap_or(model.id);
        let child_issues = self
            .list_issue_child_records(parent_group_issue_id, &author_login_id)
            .await?;
        let child_open_count = child_issues
            .iter()
            .filter(|child| child.state == "open")
            .count() as u32;
        let child_closed_count = child_issues
            .iter()
            .filter(|child| child.state == "closed")
            .count() as u32;
        let labels = self.list_issue_labels(model.id).await?;
        let sharers = self.list_issue_sharers(model.id).await?;
        let comments = self.list_issue_comments(model.id, viewer_id).await?;
        let timeline = self.list_issue_timeline_items(model.id, viewer_id).await?;
        let attachments = self
            .list_issue_attachments(ISSUE_ATTACHMENT_CONTAINER, model.id)
            .await?;
        let voters = self.list_issue_voters(model.id, viewer_id).await?;
        let voter_count = voters.len() as u32;
        let watcher_count = self.count_issue_watchers(model.id).await?;
        let has_voted = match viewer_id {
            Some(user_id) => issue_voter::Entity::find_by_id((model.id, user_id))
                .one(&self.db)
                .await?
                .is_some(),
            None => false,
        };
        let is_favorited = match viewer_id {
            Some(user_id) => self.is_issue_favorited_by(model.id, user_id).await?,
            None => false,
        };
        let is_watching = match viewer_id {
            Some(user_id) => self.is_issue_watched_by(model.id, user_id).await?,
            None => false,
        };

        Ok(IssueRecord {
            assignee_label,
            assignee_login_id,
            assignee_email_address,
            attachments,
            author_email_address,
            author_id,
            author_label,
            author_login_id,
            body_markdown: self.read_text_column("issue", "body", model.id).await?,
            comment_count: model.num_of_comments.unwrap_or_default().max(0) as u32,
            comments,
            created_at: model.created_date,
            due_date_label: format_workspace_date_label(model.due_date),
            due_date_overdue: model
                .due_date
                .is_some_and(|value| value < DateTimeUtc::from(SystemTime::now()).naive_utc()),
            due_date_until_label: format_legacy_issue_until_label(model.due_date),
            has_voted,
            history_markdown: self.read_text_column("issue", "history", model.id).await?,
            id: model.id,
            is_favorited,
            is_watching,
            issue_number: model.number.unwrap_or_default(),
            is_draft: model.is_draft.unwrap_or_default() != 0,
            labels,
            sharers,
            milestone_id,
            milestone_title,
            owner_name: project.owner_name.clone(),
            parent_issue_id: model.parent_id,
            parent_issue_number,
            parent_issue_state,
            parent_issue_title,
            child_closed_count,
            child_issues,
            child_open_count,
            project_name: project.project_name.clone(),
            state: if model.is_draft.unwrap_or_default() != 0 {
                "draft".to_string()
            } else {
                issue_state_from_raw(model.state)
            },
            timeline,
            title: model.title.unwrap_or_default(),
            updated_at: model.updated_date,
            updated_label: format_workspace_date_label(model.updated_date),
            voter_count,
            voters,
            watcher_count,
            weight: model.weight.unwrap_or_default(),
        })
    }

    pub async fn update_issue_weight(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        delta: i16,
        viewer_id: Option<i64>,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let next_weight = model.weight.unwrap_or_default().saturating_add(delta);
        let mut active = issue::ActiveModel::from(model);
        active.weight = Set(Some(next_weight));
        active.updated_date = Set(Some(current_datetime()));
        active.update(&self.db).await?;
        self.read_issue_detail_for_viewer(
            &project_record.owner_name,
            &project_record.project_name,
            issue_number,
            viewer_id,
        )
        .await
    }

    pub(super) async fn list_issue_child_records(
        &self,
        parent_issue_id: i64,
        viewer_login_id: &str,
    ) -> Result<Vec<IssueChildRecord>, DbErr> {
        let rows = issue::Entity::find()
            .filter(issue::Column::ParentId.eq(Some(parent_issue_id)))
            .order_by_asc(issue::Column::State)
            .order_by_desc(issue::Column::CreatedDate)
            .order_by_desc(issue::Column::Number)
            .all(&self.db)
            .await?;
        let viewer_login_id = normalize_identity(viewer_login_id);
        let mut items = Vec::new();
        for row in rows {
            let is_draft = row.is_draft.unwrap_or_default() != 0;
            if is_draft
                && row
                    .author_login_id
                    .as_deref()
                    .map(normalize_identity)
                    .as_deref()
                    != Some(viewer_login_id.as_str())
            {
                continue;
            }
            let (_assignee_login_id, assignee_label) =
                self.issue_assignee_summary(row.assignee_id).await?;
            let voter_count = self.count_issue_voters(row.id).await?;
            items.push(IssueChildRecord {
                assignee_label,
                comment_count: row.num_of_comments.unwrap_or_default().max(0) as u32,
                created_label: format_workspace_date_label(row.created_date),
                id: row.id,
                is_draft,
                issue_number: row.number.unwrap_or_default(),
                labels: self.list_issue_labels(row.id).await?,
                state: if is_draft {
                    "draft".to_string()
                } else {
                    issue_state_from_raw(row.state)
                },
                title: row.title.unwrap_or_default(),
                voter_count,
            });
        }
        items.sort_by(|a, b| {
            child_issue_state_order(&a.state)
                .cmp(&child_issue_state_order(&b.state))
                .then_with(|| b.issue_number.cmp(&a.issue_number))
        });
        Ok(items)
    }

    pub(super) async fn read_project_pull_request_model(
        &self,
        owner_name: &str,
        project_name: &str,
        pull_request_number: i64,
    ) -> Result<Option<(ProjectRecord, pull_request::Model)>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };
        let row = pull_request::Entity::find()
            .filter(pull_request::Column::ToProjectId.eq(Some(project.id)))
            .filter(pull_request::Column::Number.eq(Some(pull_request_number)))
            .one(&self.db)
            .await?;
        Ok(row.map(|row| (project, row)))
    }

    pub(super) async fn user_record_for_optional_id(
        &self,
        user_id: Option<i64>,
    ) -> Result<PullRequestUserRecord, DbErr> {
        let Some(user_id) = user_id else {
            return Ok(PullRequestUserRecord {
                email_address: String::new(),
                login_id: String::new(),
                user_id: 0,
                user_label: String::new(),
            });
        };
        Ok(self
            .find_user_by_id(user_id)
            .await?
            .map(|user| PullRequestUserRecord {
                email_address: user.email_address,
                login_id: user.login_id,
                user_id: user.id,
                user_label: user.display_name,
            })
            .unwrap_or(PullRequestUserRecord {
                email_address: String::new(),
                login_id: String::new(),
                user_id,
                user_label: String::new(),
            }))
    }

    pub(super) async fn pull_request_list_item_from_model(
        &self,
        row: pull_request::Model,
        project: &ProjectRecord,
    ) -> Result<PullRequestListItemRecord, DbErr> {
        let contributor = self.user_record_for_optional_id(row.contributor_id).await?;
        let receiver = self.user_record_for_optional_id(row.receiver_id).await?;
        let from_project = match row.from_project_id {
            Some(from_project_id) => self.read_project_by_id(from_project_id).await?,
            None => None,
        }
        .unwrap_or_else(|| project.clone());
        let comment_thread_count = comment_thread::Entity::find()
            .filter(comment_thread::Column::PullRequestId.eq(Some(row.id)))
            .count(&self.db)
            .await? as u32;
        let closed_comment_thread_count = comment_thread::Entity::find()
            .filter(comment_thread::Column::PullRequestId.eq(Some(row.id)))
            .filter(review_thread_closed_condition())
            .count(&self.db)
            .await? as u32;
        let reviewers = self.list_pull_request_reviewers(row.id).await?;
        let reviewer_count = reviewers.len() as u32;
        let reviewer_names = reviewers
            .into_iter()
            .map(|reviewer| reviewer.user_label)
            .collect();

        Ok(PullRequestListItemRecord {
            closed_comment_thread_count,
            comment_thread_count,
            conflict: row.is_conflict.unwrap_or_default() != 0,
            contributor_label: contributor.user_label,
            contributor_login_id: contributor.login_id,
            created_label: format_workspace_date_label(row.created),
            from_branch: row.from_branch.unwrap_or_default(),
            from_owner_name: from_project.owner_name,
            from_project_name: from_project.project_name,
            id: row.id,
            owner_name: project.owner_name.clone(),
            project_name: project.project_name.clone(),
            pull_request_number: row.number.unwrap_or_default(),
            receiver_label: receiver.user_label,
            receiver_login_id: receiver.login_id,
            reviewer_count,
            reviewer_names,
            state: pull_request_state_from_raw(row.state, row.is_conflict),
            title: row.title.unwrap_or_default(),
            to_branch: row.to_branch.unwrap_or_default(),
            updated_label: format_workspace_date_label(row.updated.or(row.created)),
        })
    }

    pub(super) async fn pull_request_detail_from_model(
        &self,
        row: pull_request::Model,
        project: &ProjectRecord,
        viewer_id: Option<i64>,
    ) -> Result<PullRequestDetailRecord, DbErr> {
        let list_item = self
            .pull_request_list_item_from_model(row.clone(), project)
            .await?;
        let contributor = self.user_record_for_optional_id(row.contributor_id).await?;
        let receiver = self.user_record_for_optional_id(row.receiver_id).await?;
        let reviewers = self.list_pull_request_reviewers(row.id).await?;
        let required_reviewer_count = if project.is_using_reviewer_count {
            project.default_reviewer_count
        } else {
            0
        };
        let lacking_reviewer_count = required_reviewer_count.saturating_sub(reviewers.len() as u32);
        let reviewed = lacking_reviewer_count == 0;
        let threads = self.list_pull_request_review_threads(row.id).await?;
        let commits = self.list_pull_request_commits(row.id).await?;
        let events = self.list_pull_request_events(row.id).await?;
        let attachments = self
            .list_issue_attachments(PULL_REQUEST_ATTACHMENT_CONTAINER, row.id)
            .await?;
        let watcher_count = self
            .count_pull_request_watchers(project, row.id, row.contributor_id)
            .await?;
        let is_watching = match viewer_id {
            Some(user_id) => {
                self.is_pull_request_watched_by(project, row.id, row.contributor_id, user_id)
                    .await?
            }
            None => false,
        };

        Ok(PullRequestDetailRecord {
            attachments,
            body_markdown: self
                .read_text_column("pull_request", "body", row.id)
                .await?,
            commits,
            conflict: list_item.conflict,
            contributor,
            created_label: list_item.created_label,
            events,
            from_branch: list_item.from_branch,
            from_owner_name: list_item.from_owner_name,
            from_project_name: list_item.from_project_name,
            id: row.id,
            is_watching,
            is_merging: row.is_merging.unwrap_or_default() != 0,
            lacking_reviewer_count,
            merged_commit_id_from: row.merged_commit_id_from.unwrap_or_default(),
            merged_commit_id_to: row.merged_commit_id_to.unwrap_or_default(),
            owner_name: project.owner_name.clone(),
            project_name: project.project_name.clone(),
            pull_request_number: list_item.pull_request_number,
            receiver,
            required_reviewer_count,
            reviewed,
            reviewers,
            state: list_item.state,
            threads,
            title: list_item.title,
            to_branch: list_item.to_branch,
            updated_label: list_item.updated_label,
            watcher_count,
        })
    }

    pub(super) async fn list_pull_request_reviewers(
        &self,
        pull_request_id: i64,
    ) -> Result<Vec<PullRequestUserRecord>, DbErr> {
        let rows = pull_request_reviewers::Entity::find()
            .filter(pull_request_reviewers::Column::PullRequestId.eq(pull_request_id))
            .all(&self.db)
            .await?;
        let mut reviewers = Vec::new();
        for row in rows {
            reviewers.push(self.user_record_for_optional_id(Some(row.user_id)).await?);
        }
        reviewers.sort_by(|left, right| {
            left.login_id
                .cmp(&right.login_id)
                .then_with(|| left.user_id.cmp(&right.user_id))
        });
        Ok(reviewers)
    }

    pub(super) async fn list_pull_request_review_threads(
        &self,
        pull_request_id: i64,
    ) -> Result<Vec<ReviewThreadRecord>, DbErr> {
        let rows = comment_thread::Entity::find()
            .filter(comment_thread::Column::PullRequestId.eq(Some(pull_request_id)))
            .order_by_asc(comment_thread::Column::CreatedDate)
            .order_by_asc(comment_thread::Column::Id)
            .all(&self.db)
            .await?;
        let mut threads = Vec::new();
        for row in rows {
            let comments = self.list_review_comments(row.id).await?;
            threads.push(self.review_thread_record(row, comments).await?);
        }
        Ok(threads)
    }

    pub(super) async fn list_review_comments(
        &self,
        thread_id: i64,
    ) -> Result<Vec<ReviewCommentRecord>, DbErr> {
        Ok(self.list_review_comments_with_latest(thread_id).await?.0)
    }

    pub(super) async fn list_review_comments_with_latest(
        &self,
        thread_id: i64,
    ) -> Result<(Vec<ReviewCommentRecord>, Option<DateTime>), DbErr> {
        let rows = review_comment::Entity::find()
            .filter(review_comment::Column::ThreadId.eq(Some(thread_id)))
            .order_by_asc(review_comment::Column::CreatedDate)
            .order_by_asc(review_comment::Column::Id)
            .all(&self.db)
            .await?;
        let latest_comment_created = rows.iter().filter_map(|row| row.created_date).max();
        let mut comments = Vec::new();
        for row in rows {
            let author_id = row.author_id;
            let author_login_id = row.author_login_id.unwrap_or_default();
            let author_email_address = self
                .user_email_for_id_or_login(author_id, &author_login_id)
                .await?;
            let via_email = original_email::Entity::find()
                .filter(
                    original_email::Column::ResourceType
                        .eq(Some(REVIEW_COMMENT_ATTACHMENT_CONTAINER.to_string())),
                )
                .filter(original_email::Column::ResourceId.eq(Some(row.id.to_string())))
                .one(&self.db)
                .await?
                .is_some();
            comments.push(ReviewCommentRecord {
                attachments: self
                    .list_issue_attachments(REVIEW_COMMENT_ATTACHMENT_CONTAINER, row.id)
                    .await?,
                author_email_address,
                author_id,
                author_label: row.author_name.unwrap_or_default(),
                author_login_id,
                contents_markdown: self
                    .read_text_column("review_comment", "contents", row.id)
                    .await?,
                created_label: format_workspace_date_label(row.created_date),
                id: row.id,
                thread_id,
                via_email,
            });
        }
        Ok((comments, latest_comment_created))
    }

    pub(super) async fn review_thread_record(
        &self,
        row: comment_thread::Model,
        comments: Vec<ReviewCommentRecord>,
    ) -> Result<ReviewThreadRecord, DbErr> {
        let author_id = row.author_id;
        let author_login_id = row.author_login_id.unwrap_or_default();
        let author_email_address = self
            .user_email_for_id_or_login(author_id, &author_login_id)
            .await?;
        let pull_request_number = if let Some(pull_request_id) = row.pull_request_id {
            pull_request::Entity::find_by_id(pull_request_id)
                .one(&self.db)
                .await?
                .and_then(|pull_request| pull_request.number)
        } else {
            None
        };
        Ok(ReviewThreadRecord {
            author_id,
            author_email_address,
            author_label: row.author_name.unwrap_or_default(),
            author_login_id,
            comments,
            commit_id: row.commit_id.unwrap_or_default(),
            created_label: format_workspace_date_label(row.created_date),
            end_line: row.end_line,
            end_side: row.end_side,
            id: row.id,
            path: row.path.unwrap_or_default(),
            prev_commit_id: row.prev_commit_id.unwrap_or_default(),
            pull_request_number,
            start_line: row.start_line,
            start_side: row.start_side,
            state: review_thread_state(row.state.as_deref()),
        })
    }

    pub(super) async fn list_pull_request_commits(
        &self,
        pull_request_id: i64,
    ) -> Result<Vec<PullRequestCommitRecord>, DbErr> {
        let rows = pull_request_commit::Entity::find()
            .filter(pull_request_commit::Column::PullRequestId.eq(Some(pull_request_id)))
            .order_by_asc(pull_request_commit::Column::AuthorDate)
            .order_by_asc(pull_request_commit::Column::Id)
            .all(&self.db)
            .await?;
        let mut commits = Vec::new();
        for row in rows {
            commits.push(self.pull_request_commit_record_from_model(row).await?);
        }
        Ok(commits)
    }

    pub(super) async fn pull_request_commit_record_from_model(
        &self,
        row: pull_request_commit::Model,
    ) -> Result<PullRequestCommitRecord, DbErr> {
        Ok(PullRequestCommitRecord {
            author_date_label: format_workspace_date_label(row.author_date.or(row.created)),
            author_email: row.author_email.unwrap_or_default(),
            commit_id: row.commit_id.unwrap_or_default(),
            commit_message: self
                .read_text_column("pull_request_commit", "commit_message", row.id)
                .await?,
            commit_short_id: row.commit_short_id.unwrap_or_default(),
            id: row.id,
            state: row.state.unwrap_or_default(),
        })
    }

    pub(super) async fn list_pull_request_event_commits(
        &self,
        event_type: &str,
        new_value: &str,
    ) -> Result<Vec<PullRequestCommitRecord>, DbErr> {
        if event_type != "PULL_REQUEST_COMMIT_CHANGED" {
            return Ok(Vec::new());
        }
        let commit_row_ids = new_value
            .split(',')
            .filter_map(|value| value.trim().parse::<i64>().ok())
            .collect::<Vec<_>>();
        if commit_row_ids.is_empty() {
            return Ok(Vec::new());
        }
        let rows = pull_request_commit::Entity::find()
            .filter(pull_request_commit::Column::Id.is_in(commit_row_ids))
            .order_by_desc(pull_request_commit::Column::AuthorDate)
            .order_by_desc(pull_request_commit::Column::Id)
            .all(&self.db)
            .await?;
        let mut commits = Vec::new();
        for row in rows {
            commits.push(self.pull_request_commit_record_from_model(row).await?);
        }
        Ok(commits)
    }

    pub(super) async fn list_pull_request_events(
        &self,
        pull_request_id: i64,
    ) -> Result<Vec<PullRequestEventRecord>, DbErr> {
        let rows = pull_request_event::Entity::find()
            .filter(pull_request_event::Column::PullRequestId.eq(Some(pull_request_id)))
            .order_by_asc(pull_request_event::Column::Created)
            .order_by_asc(pull_request_event::Column::Id)
            .all(&self.db)
            .await?;
        let mut events = Vec::new();
        for row in rows {
            let event_type = row.event_type.unwrap_or_default();
            let sender_login_id = row.sender_login_id.unwrap_or_default();
            let sender = if sender_login_id.is_empty() {
                None
            } else {
                n4user::Entity::find()
                    .filter(n4user::Column::LoginId.eq(Some(sender_login_id.clone())))
                    .one(&self.db)
                    .await?
            };
            let sender_label = sender
                .as_ref()
                .and_then(|user| user.name.clone())
                .filter(|name| !name.trim().is_empty())
                .unwrap_or_else(|| sender_login_id.clone());
            let sender_email_address = sender.and_then(|user| user.email).unwrap_or_default();
            let new_value = self
                .read_text_column("pull_request_event", "new_value", row.id)
                .await?;
            let commits = self
                .list_pull_request_event_commits(&event_type, &new_value)
                .await?;
            events.push(PullRequestEventRecord {
                commits,
                created_label: format_workspace_date_label(row.created),
                event_type,
                id: row.id,
                new_value,
                old_value: self
                    .read_text_column("pull_request_event", "old_value", row.id)
                    .await?,
                sender_email_address,
                sender_label,
                sender_login_id,
            });
        }
        Ok(events)
    }

    pub(super) async fn project_issue_list_item_from_model(
        &self,
        model: issue::Model,
        project: &ProjectRecord,
    ) -> Result<ProjectIssueListItemRecord, DbErr> {
        let author_id = model.author_id;
        let author_login_id = model.author_login_id.unwrap_or_default();
        let author_email_address = self
            .user_email_for_id_or_login(author_id, &author_login_id)
            .await?;
        let labels = self.list_issue_labels(model.id).await?;
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
        Ok(ProjectIssueListItemRecord {
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
            due_date_text: format_legacy_issue_until_label(due_date),
            id: model.id,
            is_draft: model.is_draft.unwrap_or_default() != 0,
            issue_number: model.number.unwrap_or_default(),
            labels,
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
            updated_label: format_workspace_date_label(model.updated_date.or(model.created_date)),
            voter_count: self.count_issue_voters(model.id).await?,
            watcher_count: self.count_issue_watchers(model.id).await?,
            weight: model.weight.unwrap_or_default(),
        })
    }

    pub(super) async fn issue_model_matches_text_filter(
        &self,
        model: &issue::Model,
        text_filter: &str,
    ) -> Result<bool, DbErr> {
        let needle = normalize_identity(text_filter);
        if needle.is_empty() {
            return Ok(true);
        }
        if model
            .title
            .as_deref()
            .is_some_and(|title| normalize_identity(title).contains(&needle))
        {
            return Ok(true);
        }
        if normalize_identity(&self.read_text_column("issue", "body", model.id).await?)
            .contains(&needle)
        {
            return Ok(true);
        }

        let comments = issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(model.id)))
            .all(&self.db)
            .await?;
        for comment in comments {
            let contents = self
                .read_text_column("issue_comment", "contents", comment.id)
                .await?;
            if normalize_identity(&contents).contains(&needle) {
                return Ok(true);
            }
        }

        Ok(false)
    }

    pub(super) async fn posting_model_matches_text_filter(
        &self,
        model: &posting::Model,
        text_filter: &str,
    ) -> Result<bool, DbErr> {
        let needle = normalize_identity(text_filter);
        if needle.is_empty() {
            return Ok(true);
        }
        if model
            .title
            .as_deref()
            .is_some_and(|title| normalize_identity(title).contains(&needle))
        {
            return Ok(true);
        }
        if normalize_identity(&self.read_text_column("posting", "body", model.id).await?)
            .contains(&needle)
        {
            return Ok(true);
        }

        let comments = posting_comment::Entity::find()
            .filter(posting_comment::Column::PostingId.eq(Some(model.id)))
            .all(&self.db)
            .await?;
        for comment in comments {
            let contents = self
                .read_text_column("posting_comment", "contents", comment.id)
                .await?;
            if normalize_identity(&contents).contains(&needle) {
                return Ok(true);
            }
        }

        Ok(false)
    }

    pub(super) async fn has_direct_issue_share(
        &self,
        issue_id: i64,
        user_id: i64,
    ) -> Result<bool, DbErr> {
        Ok(issue_sharer::Entity::find()
            .filter(issue_sharer::Column::IssueId.eq(Some(issue_id)))
            .filter(issue_sharer::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_some())
    }

    pub(super) async fn find_user_model_by_id(
        &self,
        user_id: i64,
    ) -> Result<Option<n4user::Model>, DbErr> {
        n4user::Entity::find_by_id(user_id).one(&self.db).await
    }
}
