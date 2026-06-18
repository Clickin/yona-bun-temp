use super::*;

impl AppRepository {
    pub async fn read_issue_detail(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) -> Result<Option<IssueRecord>, DbErr> {
        self.read_issue_detail_for_viewer(owner_name, project_name, issue_number, None)
            .await
    }

    pub async fn read_issue_updated_at(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) -> Result<Option<DateTime>, DbErr> {
        let Some((_project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        Ok(issue_model.updated_date.or(issue_model.created_date))
    }

    pub async fn restore_issue_history(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        history_markdown: &str,
    ) -> Result<bool, DbErr> {
        let Some((_project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(false);
        };
        self.write_text_column("issue", "history", issue_model.id, history_markdown)
            .await?;
        Ok(true)
    }

    pub async fn read_issue_detail_for_viewer(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        viewer_id: Option<i64>,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        let issue = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::Number.eq(Some(issue_number)))
            .one(&self.db)
            .await?;

        match issue {
            Some(issue) => self
                .issue_record_from_model(issue, &project, viewer_id)
                .await
                .map(Some),
            None => Ok(None),
        }
    }

    pub async fn read_issue_comment_origin(
        &self,
        comment_id: i64,
    ) -> Result<Option<IssueCommentOriginRecord>, DbErr> {
        let Some(comment) = issue_comment::Entity::find_by_id(comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(issue_id) = comment.issue_id else {
            return Ok(None);
        };
        let Some(issue_model) = issue::Entity::find_by_id(issue_id).one(&self.db).await? else {
            return Ok(None);
        };
        let Some(project_id) = issue_model.project_id else {
            return Ok(None);
        };
        let Some(project_model) = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(project_record) = self.project_record_from_model(project_model).await? else {
            return Ok(None);
        };
        let contents_markdown = self
            .read_text_column("issue_comment", "contents", comment.id)
            .await?;

        Ok(Some(IssueCommentOriginRecord {
            author_login_id: comment.author_login_id.unwrap_or_default(),
            comment_id: comment.id,
            contents_markdown,
            issue_number: issue_model.number.unwrap_or_default(),
            owner_name: project_record.owner_name,
            project_name: project_record.project_name,
        }))
    }

    pub async fn read_posting_comment_origin(
        &self,
        comment_id: i64,
    ) -> Result<Option<PostingCommentOriginRecord>, DbErr> {
        let Some(comment) = posting_comment::Entity::find_by_id(comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(posting_id) = comment.posting_id else {
            return Ok(None);
        };
        let Some(posting_model) = posting::Entity::find_by_id(posting_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(project_id) = posting_model.project_id else {
            return Ok(None);
        };
        let Some(project_model) = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(project_record) = self.project_record_from_model(project_model).await? else {
            return Ok(None);
        };
        let contents_markdown = self
            .read_text_column("posting_comment", "contents", comment.id)
            .await?;

        Ok(Some(PostingCommentOriginRecord {
            comment_id: comment.id,
            contents_markdown,
            owner_name: project_record.owner_name,
            post_number: posting_model.number.unwrap_or_default(),
            project_name: project_record.project_name,
        }))
    }

    pub async fn read_issue_share_status(
        &self,
        issue_id: i64,
        user_id: i64,
    ) -> Result<IssueShareStatus, DbErr> {
        let direct = self.has_direct_issue_share(issue_id, user_id).await?;
        let inherited_from_parent = match issue::Entity::find_by_id(issue_id).one(&self.db).await? {
            Some(model) => match model.parent_id {
                Some(parent_id) => self.has_direct_issue_share(parent_id, user_id).await?,
                None => false,
            },
            None => false,
        };

        Ok(IssueShareStatus {
            direct,
            inherited_from_parent,
        })
    }

    pub(super) async fn list_assignable_users_for_project(
        &self,
        project_record: &ProjectRecord,
        actor_id: Option<i64>,
        current_assignee_user_id: Option<i64>,
        query: &str,
        search_type: &str,
        limit: usize,
    ) -> Result<IssueAssignableUserSearchRecord, DbErr> {
        let query = query.trim();
        if query.is_empty() {
            let mut items = Vec::new();
            if let Some(actor_id) = actor_id {
                if let Some(actor) = n4user::Entity::find_by_id(actor_id).one(&self.db).await? {
                    items.push(issue_assignable_custom_user_record(
                        &actor,
                        "issue.assignToMe",
                    ));
                }
            }

            let assignable_user_ids = self.assignable_member_user_ids(project_record).await?;
            let mut users = n4user::Entity::find()
                .order_by_asc(n4user::Column::LoginId)
                .all(&self.db)
                .await?
                .into_iter()
                .filter(|user| assignable_user_ids.contains(&user.id))
                .filter(n4user_is_active)
                .map(issue_assignable_user_record)
                .collect::<Vec<_>>();
            users.sort_by(|left, right| {
                normalize_identity(&left.display_name)
                    .cmp(&normalize_identity(&right.display_name))
                    .then_with(|| {
                        normalize_identity(&left.login_id).cmp(&normalize_identity(&right.login_id))
                    })
            });
            items.extend(users);
            let total = items.len() as u32;
            return Ok(IssueAssignableUserSearchRecord {
                items,
                total,
                truncated: false,
            });
        }

        let visible_user_ids = if normalize_identity(&project_record.project_scope) == "public" {
            None
        } else {
            Some(self.assignable_member_user_ids(project_record).await?)
        };
        let mut matches = n4user::Entity::find()
            .order_by_asc(n4user::Column::LoginId)
            .all(&self.db)
            .await?
            .into_iter()
            .filter(|user| issue_assignable_user_matches(user, query, search_type))
            .filter(|user| {
                let is_current_assignee = current_assignee_user_id == Some(user.id);
                let is_active =
                    normalize_optional(user.state.as_deref()).as_deref() == Some("active");
                let is_visible = visible_user_ids
                    .as_ref()
                    .is_none_or(|user_ids| user_ids.contains(&user.id));
                is_current_assignee || (is_active && is_visible)
            })
            .map(issue_assignable_user_record)
            .collect::<Vec<_>>();

        matches.sort_by(|left, right| {
            normalize_identity(&left.display_name)
                .cmp(&normalize_identity(&right.display_name))
                .then_with(|| {
                    normalize_identity(&left.login_id).cmp(&normalize_identity(&right.login_id))
                })
        });
        let total = matches.len() as u32;
        let truncated = matches.len() > limit;
        matches.truncate(limit);

        Ok(IssueAssignableUserSearchRecord {
            items: matches,
            total,
            truncated,
        })
    }

    pub async fn list_project_assignable_users(
        &self,
        owner_name: &str,
        project_name: &str,
        actor_id: Option<i64>,
        query: &str,
        search_type: &str,
        limit: usize,
    ) -> Result<Option<IssueAssignableUserSearchRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        self.list_assignable_users_for_project(
            &project_record,
            actor_id,
            None,
            query,
            search_type,
            limit,
        )
        .await
        .map(Some)
    }

    pub async fn list_issue_assignable_users(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        actor_id: Option<i64>,
        query: &str,
        search_type: &str,
        limit: usize,
    ) -> Result<Option<IssueAssignableUserSearchRecord>, DbErr> {
        let Some((project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };

        let current_assignee_user_id = match issue_model.assignee_id {
            Some(assignee_id) => assignee::Entity::find_by_id(assignee_id)
                .one(&self.db)
                .await?
                .and_then(|row| row.user_id),
            None => None,
        };

        if query.trim().is_empty() {
            let actor = match actor_id {
                Some(actor_id) => n4user::Entity::find_by_id(actor_id).one(&self.db).await?,
                None => None,
            };
            let issue_author = match issue_model.author_id {
                Some(author_id) => n4user::Entity::find_by_id(author_id).one(&self.db).await?,
                None => None,
            };
            let current_assignee = match current_assignee_user_id {
                Some(user_id) => n4user::Entity::find_by_id(user_id).one(&self.db).await?,
                None => None,
            };

            let mut items = Vec::new();
            if current_assignee.is_some() {
                if let (Some(actor), Some(assignee)) = (actor.as_ref(), current_assignee.as_ref()) {
                    if actor.id != assignee.id {
                        items.push(issue_assignable_custom_user_record(
                            actor,
                            "issue.assignToMe",
                        ));
                    }
                }
                if let (Some(author), Some(actor), Some(assignee)) = (
                    issue_author.as_ref(),
                    actor.as_ref(),
                    current_assignee.as_ref(),
                ) {
                    if author.id != actor.id && author.id != assignee.id {
                        items.push(issue_assignable_custom_user_record(
                            author,
                            "issue.assignToAuthor",
                        ));
                    }
                }
                items.push(issue_assignable_no_assignee_record());
                if let Some(assignee) = current_assignee.as_ref() {
                    items.push(issue_assignable_user_record(assignee.clone()));
                }
            } else {
                if let Some(actor) = actor.as_ref() {
                    items.push(issue_assignable_custom_user_record(
                        actor,
                        "issue.assignToMe",
                    ));
                }
                if let (Some(author), Some(actor)) = (issue_author.as_ref(), actor.as_ref()) {
                    if author.id != actor.id {
                        items.push(issue_assignable_custom_user_record(
                            author,
                            "issue.assignToAuthor",
                        ));
                    }
                }
            }

            let assignable_user_ids = self.assignable_member_user_ids(&project_record).await?;
            let mut users = n4user::Entity::find()
                .order_by_asc(n4user::Column::LoginId)
                .all(&self.db)
                .await?
                .into_iter()
                .filter(|user| {
                    assignable_user_ids.contains(&user.id)
                        || current_assignee_user_id == Some(user.id)
                })
                .filter(|user| current_assignee_user_id == Some(user.id) || n4user_is_active(user))
                .map(issue_assignable_user_record)
                .collect::<Vec<_>>();
            users.sort_by(|left, right| {
                normalize_identity(&left.display_name)
                    .cmp(&normalize_identity(&right.display_name))
                    .then_with(|| {
                        normalize_identity(&left.login_id).cmp(&normalize_identity(&right.login_id))
                    })
            });
            items.extend(users);
            let mut seen = HashSet::new();
            items.retain(|item| {
                seen.insert((
                    item.avatar_url.clone(),
                    item.display_name.clone(),
                    item.item_type.clone(),
                    item.login_id.clone(),
                    item.pure_name_only.clone(),
                ))
            });
            let total = items.len() as u32;
            return Ok(Some(IssueAssignableUserSearchRecord {
                items,
                total,
                truncated: false,
            }));
        }

        self.list_assignable_users_for_project(
            &project_record,
            actor_id,
            current_assignee_user_id,
            query,
            search_type,
            limit,
        )
        .await
        .map(Some)
    }

    pub async fn list_issue_sharable_users(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        query: &str,
        search_type: &str,
        limit: usize,
    ) -> Result<Option<IssueAssignableUserSearchRecord>, DbErr> {
        if self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
            .is_none()
        {
            return Ok(None);
        }

        let query = query.trim();
        if query.is_empty() {
            return Ok(Some(IssueAssignableUserSearchRecord {
                items: vec![],
                total: 0,
                truncated: false,
            }));
        }

        let mut user_matches = n4user::Entity::find()
            .order_by_asc(n4user::Column::LoginId)
            .all(&self.db)
            .await?
            .into_iter()
            .filter(n4user_is_active)
            .filter(|user| issue_assignable_user_matches(user, query, search_type))
            .map(issue_assignable_user_record)
            .collect::<Vec<_>>();
        let mut project_matches = self
            .list_projects()
            .await?
            .into_iter()
            .filter(|project| normalize_identity(&project.project_scope) == "public")
            .filter(|project| {
                normalize_identity(&project.project_name).contains(&normalize_identity(query))
            })
            .map(issue_sharable_project_record)
            .collect::<Vec<_>>();
        let total = (user_matches.len() + project_matches.len()) as u32;
        let truncated = user_matches.len() + project_matches.len() > limit;
        if truncated {
            let per_type_limit = limit / 2;
            user_matches.truncate(per_type_limit);
            project_matches.truncate(per_type_limit);
        }
        user_matches.extend(project_matches);

        Ok(Some(IssueAssignableUserSearchRecord {
            items: user_matches,
            total,
            truncated,
        }))
    }

    pub async fn list_issue_mention_users(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        actor_id: Option<i64>,
        query: &str,
        _context: &str,
        limit: usize,
    ) -> Result<Option<IssueMentionUserSearchRecord>, DbErr> {
        let Some((project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };

        let query = query.trim();
        let mut records =
            if query.is_empty() || normalize_identity(&project_record.project_scope) != "public" {
                self.contextual_issue_mention_users(&project_record, &issue_model, actor_id)
                    .await?
            } else {
                n4user::Entity::find()
                    .order_by_asc(n4user::Column::LoginId)
                    .all(&self.db)
                    .await?
                    .into_iter()
                    .filter(n4user_is_active)
                    .filter(|user| issue_assignable_user_matches(user, query, ""))
                    .map(issue_mention_user_record)
                    .collect::<Vec<_>>()
            };

        if !query.is_empty() {
            records.retain(|record| mention_text_matches(record, query));
        }
        self.append_project_mention_targets(&project_record, query, &mut records)
            .await?;

        let total = records.len() as u32;
        let truncated = records.len() > limit;
        records.truncate(limit);

        Ok(Some(IssueMentionUserSearchRecord {
            items: records,
            total,
            truncated,
        }))
    }

    pub async fn list_project_issue_references(
        &self,
        project_id: i64,
        query: &str,
        limit: usize,
    ) -> Result<ProjectIssueReferenceSearchRecord, DbErr> {
        let query = query.trim();
        let normalized_query = normalize_identity(query);
        let mut models = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?;

        if query.is_empty() {
            models.sort_by(|left, right| {
                right.created_date.cmp(&left.created_date).then_with(|| {
                    right
                        .number
                        .unwrap_or_default()
                        .cmp(&left.number.unwrap_or_default())
                })
            });
            let total = models.len() as u32;
            let truncated = models.len() > limit;
            models.truncate(limit);
            return Ok(ProjectIssueReferenceSearchRecord {
                items: models.iter().map(project_issue_reference_record).collect(),
                total,
                truncated,
            });
        }

        let mut matches = models
            .into_iter()
            .filter_map(|model| {
                let issue_number = model.number.unwrap_or_default().to_string();
                let exact_number_match = issue_number == normalized_query;
                let number_prefix_match = issue_number.starts_with(&normalized_query);
                let title_match = model
                    .title
                    .as_deref()
                    .is_some_and(|title| normalize_identity(title).contains(&normalized_query));
                (number_prefix_match || title_match).then_some((
                    model,
                    exact_number_match,
                    number_prefix_match,
                    title_match,
                ))
            })
            .collect::<Vec<_>>();

        matches.sort_by(|left, right| {
            right
                .1
                .cmp(&left.1)
                .then_with(|| right.2.cmp(&left.2))
                .then_with(|| right.3.cmp(&left.3))
                .then_with(|| right.0.created_date.cmp(&left.0.created_date))
                .then_with(|| {
                    right
                        .0
                        .number
                        .unwrap_or_default()
                        .cmp(&left.0.number.unwrap_or_default())
                })
        });

        let total = matches.len() as u32;
        let truncated = matches.len() > limit;
        matches.truncate(limit);

        Ok(ProjectIssueReferenceSearchRecord {
            items: matches
                .iter()
                .map(|(model, _, _, _)| project_issue_reference_record(model))
                .collect(),
            total,
            truncated,
        })
    }

    pub async fn list_project_issue_references_by_numbers(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_numbers: &[i64],
    ) -> Result<Vec<ProjectIssueReferenceRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        let mut numbers = issue_numbers
            .iter()
            .copied()
            .filter(|number| *number > 0)
            .collect::<Vec<_>>();
        numbers.sort_unstable();
        numbers.dedup();
        if numbers.is_empty() {
            return Ok(Vec::new());
        }

        let mut models = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::Number.is_in(numbers.into_iter().map(Some)))
            .all(&self.db)
            .await?;
        models.sort_by(|left, right| {
            left.number
                .unwrap_or_default()
                .cmp(&right.number.unwrap_or_default())
        });

        Ok(models.iter().map(project_issue_reference_record).collect())
    }

    pub async fn add_issue_sharer(
        &self,
        issue_id: i64,
        user_id: i64,
        login_id: &str,
    ) -> Result<bool, DbErr> {
        if self.has_direct_issue_share(issue_id, user_id).await? {
            return Ok(false);
        }

        issue_sharer::ActiveModel {
            id: NotSet,
            created: Set(Some(current_datetime().date())),
            login_id: Set(Some(normalize_identity(login_id))),
            user_id: Set(Some(user_id)),
            issue_id: Set(Some(issue_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(true)
    }

    pub async fn remove_issue_sharer(&self, issue_id: i64, user_id: i64) -> Result<bool, DbErr> {
        let result = issue_sharer::Entity::delete_many()
            .filter(issue_sharer::Column::IssueId.eq(Some(issue_id)))
            .filter(issue_sharer::Column::UserId.eq(Some(user_id)))
            .exec(&self.db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    pub async fn record_issue_sharer_changed(
        &self,
        issue_id: i64,
        actor_id: i64,
        actor_login_id: &str,
        sharer_user_id: i64,
        sharer_login_id: &str,
        action: &str,
    ) -> Result<(), DbErr> {
        let (old_value, new_value) = if action == "share" {
            ("", sharer_login_id)
        } else {
            (sharer_login_id, "")
        };
        self.create_issue_event(
            issue_id,
            actor_login_id,
            "ISSUE_SHARER_CHANGED",
            old_value,
            new_value,
        )
        .await?;
        self.create_notification_event_for_receivers(
            actor_id,
            "issue",
            &issue_id.to_string(),
            "ISSUE_SHARER_CHANGED",
            old_value,
            new_value,
            &[sharer_user_id],
        )
        .await
    }

    pub async fn is_issue_favorited_by(&self, issue_id: i64, user_id: i64) -> Result<bool, DbErr> {
        Ok(favorite_issue::Entity::find()
            .filter(favorite_issue::Column::IssueId.eq(Some(issue_id)))
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_some())
    }

    pub async fn toggle_favorite_issue(
        &self,
        issue_id: i64,
        user_id: i64,
    ) -> Result<ToggleFavoriteIssueResult, DbErr> {
        if let Some(existing) = favorite_issue::Entity::find()
            .filter(favorite_issue::Column::IssueId.eq(Some(issue_id)))
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            favorite_issue::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
            return Ok(ToggleFavoriteIssueResult {
                favorited: false,
                issue_id,
            });
        }

        favorite_issue::ActiveModel {
            id: NotSet,
            issue_id: Set(Some(issue_id)),
            user_id: Set(Some(user_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(ToggleFavoriteIssueResult {
            favorited: true,
            issue_id,
        })
    }

    pub async fn read_legacy_favorite_issue_target(
        &self,
        issue_id: i64,
    ) -> Result<Option<(String, String, i64)>, DbErr> {
        let Some(issue_row) = issue::Entity::find_by_id(issue_id).one(&self.db).await? else {
            return Ok(None);
        };
        let Some(project_id) = issue_row.project_id else {
            return Ok(None);
        };
        let Some(issue_number) = issue_row.number else {
            return Ok(None);
        };
        let Some(project_row) = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(owner_name) = project_row.owner else {
            return Ok(None);
        };
        let Some(project_name) = project_row.name else {
            return Ok(None);
        };
        Ok(Some((owner_name, project_name, issue_number)))
    }

    pub async fn list_legacy_favorite_issues_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<(i64, String, String)>, DbErr> {
        let rows = favorite_issue::Entity::find()
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .order_by_desc(favorite_issue::Column::Id)
            .all(&self.db)
            .await?;
        let mut issues = Vec::new();
        for row in rows {
            let Some(issue_id) = row.issue_id else {
                continue;
            };
            let Some(issue_row) = issue::Entity::find_by_id(issue_id).one(&self.db).await? else {
                continue;
            };
            let title = issue_row.title.unwrap_or_default();
            let author_name = if let Some(author_id) = issue_row.author_id {
                n4user::Entity::find_by_id(author_id)
                    .one(&self.db)
                    .await?
                    .and_then(|user| user.name)
                    .unwrap_or_else(|| issue_row.author_name.clone().unwrap_or_default())
            } else {
                issue_row.author_name.clone().unwrap_or_default()
            };
            issues.push((issue_id, title, author_name));
        }
        Ok(issues)
    }

    pub async fn list_user_issue_candidates(
        &self,
        user_id: i64,
        filter: UserIssueListFilter,
    ) -> Result<Vec<UserIssueCandidateRecord>, DbErr> {
        let normalized_filter = normalize_identity(&filter.filter);
        let assignee_ids = assignee::Entity::find()
            .filter(assignee::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<HashSet<_>>();
        let commented_issue_ids = issue_comment::Entity::find()
            .filter(issue_comment::Column::AuthorId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.issue_id)
            .collect::<HashSet<_>>();
        let mention_rows = mention::Entity::find()
            .filter(mention::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        let mut mentioned_issue_ids = HashSet::new();
        let mut mentioned_comment_ids = Vec::new();
        for row in mention_rows {
            let Some(resource_id) = row.resource_id.and_then(|value| value.parse::<i64>().ok())
            else {
                continue;
            };
            let resource_type = row
                .resource_type
                .as_deref()
                .map(normalize_identity)
                .unwrap_or_default();
            match resource_type.as_str() {
                "issue" | "issue_post" => {
                    mentioned_issue_ids.insert(resource_id);
                }
                "issue_comment" => mentioned_comment_ids.push(resource_id),
                _ => {}
            }
        }
        for comment in issue_comment::Entity::find()
            .filter(issue_comment::Column::Id.is_in(mentioned_comment_ids))
            .all(&self.db)
            .await?
        {
            if let Some(issue_id) = comment.issue_id {
                mentioned_issue_ids.insert(issue_id);
            }
        }
        let shared_issue_ids = issue_sharer::Entity::find()
            .filter(issue_sharer::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.issue_id)
            .collect::<HashSet<_>>();
        let favorite_issue_ids = favorite_issue::Entity::find()
            .filter(favorite_issue::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.issue_id)
            .collect::<HashSet<_>>();

        let rows = issue::Entity::find().all(&self.db).await?;
        let mut matches = Vec::new();
        for row in rows {
            if row.is_draft.unwrap_or_default() != 0 {
                continue;
            }
            let issue_id = row.id;
            let filter_matches = match normalized_filter.as_str() {
                "authored" => row.author_id == Some(user_id),
                "commented" => commented_issue_ids.contains(&issue_id),
                "mentioned" => mentioned_issue_ids.contains(&issue_id),
                "shared" => shared_issue_ids.contains(&issue_id),
                "favorite" => favorite_issue_ids.contains(&issue_id),
                _ => row
                    .assignee_id
                    .is_some_and(|assignee_id| assignee_ids.contains(&assignee_id)),
            };
            if !filter_matches {
                continue;
            }
            if issue_state_from_raw(row.state) != normalize_identity(&filter.state) {
                continue;
            }
            if let Some(query) = filter.query.as_deref() {
                if !self.issue_model_matches_text_filter(&row, query).await? {
                    continue;
                }
            }
            let Some(project_id) = row.project_id else {
                continue;
            };
            let Some(project) = self.read_project_by_id(project_id).await? else {
                continue;
            };
            matches.push((row, project));
        }

        sort_issue_models_for_organization(&mut matches, &filter.order_by, &filter.order_dir);

        let mut candidates = Vec::new();
        for (row, project) in matches {
            let issue_id = row.id;
            candidates.push(UserIssueCandidateRecord {
                issue_id,
                item: self
                    .project_issue_list_item_from_model(row, &project)
                    .await?,
            });
        }

        Ok(candidates)
    }

    pub async fn list_project_issues(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Vec<ProjectIssueListItemRecord>, DbErr> {
        Ok(self
            .list_project_issues_filtered(
                owner_name,
                project_name,
                IssueListFilter {
                    assignee_id: None,
                    assignee_login_id: None,
                    author_login_id: None,
                    draft_author_login_id: None,
                    label_ids: Vec::new(),
                    milestone_id: None,
                    page_num: 1,
                    state: None,
                },
            )
            .await?
            .items)
    }

    pub async fn list_project_issues_filtered(
        &self,
        owner_name: &str,
        project_name: &str,
        filter: IssueListFilter,
    ) -> Result<ProjectIssueListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        self.list_project_issues_filtered_with_page_size(
            owner_name,
            project_name,
            filter,
            Some(PAGE_SIZE),
        )
        .await
    }

    pub async fn list_project_issues_for_export(
        &self,
        owner_name: &str,
        project_name: &str,
        filter: IssueListFilter,
    ) -> Result<ProjectIssueListRecord, DbErr> {
        self.list_project_issues_filtered_with_page_size(owner_name, project_name, filter, None)
            .await
    }

    pub async fn list_project_issue_parent_options(
        &self,
        owner_name: &str,
        project_name: &str,
        current_issue_number: Option<i64>,
    ) -> Result<Vec<ProjectIssueParentOptionRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        let current_issue = match current_issue_number.filter(|number| *number > 0) {
            Some(number) => {
                issue::Entity::find()
                    .filter(issue::Column::ProjectId.eq(Some(project.id)))
                    .filter(issue::Column::Number.eq(Some(number)))
                    .one(&self.db)
                    .await?
            }
            None => None,
        };
        let current_issue_id = current_issue.as_ref().map(|model| model.id);
        let selected_parent_id = current_issue.as_ref().and_then(|model| model.parent_id);
        let mut models = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .order_by_desc(issue::Column::Number)
            .all(&self.db)
            .await?;
        models.retain(|model| {
            Some(model.id) != current_issue_id
                && (model.parent_id.is_none() || Some(model.id) == selected_parent_id)
        });
        models.truncate(300);
        Ok(models
            .into_iter()
            .map(|model| ProjectIssueParentOptionRecord {
                id: model.id,
                issue_number: model.number.unwrap_or_default(),
                selected: Some(model.id) == selected_parent_id,
                title: model.title.unwrap_or_default(),
            })
            .collect())
    }

    pub(super) async fn list_project_issues_filtered_with_page_size(
        &self,
        owner_name: &str,
        project_name: &str,
        filter: IssueListFilter,
        page_size: Option<u32>,
    ) -> Result<ProjectIssueListRecord, DbErr> {
        const DEFAULT_PAGE_SIZE: u32 = 15;
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(ProjectIssueListRecord {
                draft_items: Vec::new(),
                items: Vec::new(),
                page_num: filter.page_num.max(1),
                page_size: page_size.unwrap_or(DEFAULT_PAGE_SIZE),
                total_count: 0,
            });
        };

        let models = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .order_by_desc(issue::Column::CreatedDate)
            .order_by_desc(issue::Column::Number)
            .all(&self.db)
            .await?;

        let can_show_drafts = filter.page_num.max(1) == 1
            && filter
                .state
                .as_deref()
                .map(normalize_identity)
                .filter(|state| !state.is_empty())
                .as_deref()
                != Some("closed")
            && filter
                .author_login_id
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
            && filter
                .assignee_login_id
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
            && filter.assignee_id.is_none()
            && filter.milestone_id.is_none()
            && filter.label_ids.is_empty();
        let draft_author_login_id = filter
            .draft_author_login_id
            .as_deref()
            .map(normalize_identity)
            .filter(|value| !value.is_empty());
        let mut draft_items = Vec::new();
        let mut filtered = Vec::new();
        for model in models {
            if model.is_draft.unwrap_or_default() != 0 {
                if can_show_drafts
                    && draft_author_login_id.as_deref()
                        == model
                            .author_login_id
                            .as_deref()
                            .map(normalize_identity)
                            .as_deref()
                {
                    draft_items.push(
                        self.project_issue_list_item_from_model(model, &project)
                            .await?,
                    );
                }
                continue;
            }
            if filter.state.as_deref().is_some_and(|state| {
                !state.trim().is_empty()
                    && issue_state_from_raw(model.state) != normalize_identity(state)
            }) {
                continue;
            }
            if filter.author_login_id.as_deref().is_some_and(|login_id| {
                !login_id.trim().is_empty()
                    && model.author_login_id.as_deref().map(normalize_identity)
                        != Some(normalize_identity(login_id))
            }) {
                continue;
            }
            if let Some(milestone_id) = filter.milestone_id {
                if model.milestone_id != Some(milestone_id) {
                    continue;
                }
            }
            if let Some(assignee_user_id) = filter.assignee_id {
                if assignee_user_id <= 0 {
                    if model.assignee_id.is_some() {
                        continue;
                    }
                } else {
                    let Some(issue_assignee_id) = model.assignee_id else {
                        continue;
                    };
                    let Some(issue_assignee) = assignee::Entity::find_by_id(issue_assignee_id)
                        .one(&self.db)
                        .await?
                    else {
                        continue;
                    };
                    if issue_assignee.user_id != Some(assignee_user_id) {
                        continue;
                    }
                }
            }
            if let Some(assignee_login_id) = filter.assignee_login_id.as_deref() {
                if !assignee_login_id.trim().is_empty() {
                    let assignee = self.issue_assignee_summary(model.assignee_id).await?;
                    if assignee.0 != normalize_identity(assignee_login_id) {
                        continue;
                    }
                }
            }
            let labels = self.list_issue_labels(model.id).await?;
            if !filter.label_ids.is_empty()
                && !filter
                    .label_ids
                    .iter()
                    .all(|id| labels.iter().any(|label| label.id == *id))
            {
                continue;
            }

            filtered.push(
                self.project_issue_list_item_from_model(model, &project)
                    .await?,
            );
        }

        let page_num = filter.page_num.max(1);
        let total_count = filtered.len() as u32;
        let effective_page_size = page_size.unwrap_or(total_count.max(1));
        let items = if page_size.is_some() {
            let offset = ((page_num - 1) * effective_page_size) as usize;
            filtered
                .into_iter()
                .skip(offset)
                .take(effective_page_size as usize)
                .collect()
        } else {
            filtered
        };

        Ok(ProjectIssueListRecord {
            draft_items,
            items,
            page_num,
            page_size: effective_page_size,
            total_count,
        })
    }

    pub async fn list_organization_issues_filtered(
        &self,
        organization_name: &str,
        visible_projects: Vec<ProjectRecord>,
        filter: OrganizationIssueListFilter,
    ) -> Result<OrganizationIssueListRecord, DbErr> {
        const DEFAULT_PAGE_SIZE: u32 = 15;
        const MAX_PAGE_SIZE: u32 = 45;

        let page_num = filter.page_num.max(1);
        let page_size = if filter.items_per_page == 0 {
            DEFAULT_PAGE_SIZE
        } else {
            filter.items_per_page.min(MAX_PAGE_SIZE)
        };
        let visible_projects = {
            let mut projects = visible_projects;
            projects.sort_by(|left, right| left.project_name.cmp(&right.project_name));
            projects
        };
        let visible_project_options = visible_projects
            .iter()
            .map(|project| OrganizationIssueProjectOptionRecord {
                owner_name: project.owner_name.clone(),
                project_name: project.project_name.clone(),
            })
            .collect::<Vec<_>>();
        let project_by_id = visible_projects
            .iter()
            .cloned()
            .map(|project| (project.id, project))
            .collect::<HashMap<_, _>>();

        if project_by_id.is_empty() {
            return Ok(OrganizationIssueListRecord {
                closed_issue_count: 0,
                items: Vec::new(),
                organization_name: organization_name.to_string(),
                open_issue_count: 0,
                page_num,
                page_size,
                total_count: 0,
                visible_projects: visible_project_options,
            });
        }

        let project_name_filter = filter
            .project_names
            .iter()
            .map(|name| normalize_identity(name))
            .filter(|name| !name.is_empty())
            .collect::<HashSet<_>>();
        let assignee_ids = match filter.assignee_user_id {
            Some(user_id) => assignee::Entity::find()
                .filter(assignee::Column::UserId.eq(Some(user_id)))
                .all(&self.db)
                .await?
                .into_iter()
                .map(|row| row.id)
                .collect::<HashSet<_>>(),
            None => HashSet::new(),
        };
        let mentioned_issue_ids = if let Some(user_id) = filter.mention_user_id {
            let mention_rows = mention::Entity::find()
                .filter(mention::Column::UserId.eq(Some(user_id)))
                .all(&self.db)
                .await?;
            let mut issue_ids = HashSet::new();
            let mut comment_ids = Vec::new();
            for row in mention_rows {
                let Some(resource_id) = row.resource_id.and_then(|value| value.parse::<i64>().ok())
                else {
                    continue;
                };
                let resource_type = row
                    .resource_type
                    .as_deref()
                    .map(normalize_identity)
                    .unwrap_or_default();
                match resource_type.as_str() {
                    "issue" | "issue_post" => {
                        issue_ids.insert(resource_id);
                    }
                    "issue_comment" => comment_ids.push(resource_id),
                    _ => {}
                }
            }
            for comment in issue_comment::Entity::find()
                .filter(issue_comment::Column::Id.is_in(comment_ids))
                .all(&self.db)
                .await?
            {
                if let Some(issue_id) = comment.issue_id {
                    issue_ids.insert(issue_id);
                }
            }
            issue_ids
        } else {
            HashSet::new()
        };

        let rows = issue::Entity::find()
            .filter(issue::Column::ProjectId.is_in(project_by_id.keys().copied().map(Some)))
            .all(&self.db)
            .await?;
        let mut matches_without_state = Vec::new();
        for row in rows {
            if row.is_draft.unwrap_or_default() != 0 {
                continue;
            }
            let Some(project_id) = row.project_id else {
                continue;
            };
            let Some(project) = project_by_id.get(&project_id) else {
                continue;
            };
            if !project_name_filter.is_empty()
                && !project_name_filter.contains(&normalize_identity(&project.project_name))
            {
                continue;
            }
            if filter.author_id.is_some() && row.author_id != filter.author_id {
                continue;
            }
            if filter.assignee_user_id.is_some()
                && !row
                    .assignee_id
                    .is_some_and(|assignee_id| assignee_ids.contains(&assignee_id))
            {
                continue;
            }
            if filter.mention_user_id.is_some() && !mentioned_issue_ids.contains(&row.id) {
                continue;
            }
            if let Some(text_filter) = filter.filter.as_deref() {
                if !self
                    .issue_model_matches_text_filter(&row, text_filter)
                    .await?
                {
                    continue;
                }
            }
            matches_without_state.push((row, project.clone()));
        }

        let open_issue_count = matches_without_state
            .iter()
            .filter(|(row, _)| issue_state_from_raw(row.state) == "open")
            .count() as u32;
        let closed_issue_count = matches_without_state
            .iter()
            .filter(|(row, _)| issue_state_from_raw(row.state) == "closed")
            .count() as u32;

        let state = normalize_identity(&filter.state);
        let mut state_matches = matches_without_state
            .into_iter()
            .filter(|(row, _)| issue_state_from_raw(row.state) == state)
            .collect::<Vec<_>>();
        sort_issue_models_for_organization(&mut state_matches, &filter.order_by, &filter.order_dir);

        let total_count = state_matches.len() as u32;
        let offset = ((page_num - 1) * page_size) as usize;
        let page_models = state_matches
            .into_iter()
            .skip(offset)
            .take(page_size as usize)
            .collect::<Vec<_>>();
        let mut items = Vec::new();
        for (row, project) in page_models {
            items.push(
                self.project_issue_list_item_from_model(row, &project)
                    .await?,
            );
        }

        Ok(OrganizationIssueListRecord {
            closed_issue_count,
            items,
            organization_name: organization_name.to_string(),
            open_issue_count,
            page_num,
            page_size,
            total_count,
            visible_projects: visible_project_options,
        })
    }

    pub async fn update_issue_state(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        state: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        self.update_issue_state_for_actor(owner_name, project_name, issue_number, state, None, "")
            .await
    }

    pub async fn update_issue_state_as_actor(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        state: &str,
        actor_id: i64,
        actor_login_id: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        self.update_issue_state_for_actor(
            owner_name,
            project_name,
            issue_number,
            state,
            Some(actor_id),
            actor_login_id,
        )
        .await
    }

    pub(super) async fn update_issue_state_for_actor(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        state: &str,
        actor_id: Option<i64>,
        actor_login_id: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let old_state = issue_state_from_raw(model.state);
        let new_state = normalize_identity(state);
        let mut active = issue::ActiveModel::from(model);
        active.state = Set(Some(issue_state_to_raw(&new_state)));
        active.updated_date = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        if old_state != new_state && !actor_login_id.trim().is_empty() {
            self.create_issue_event(
                updated.id,
                actor_login_id,
                "ISSUE_STATE_CHANGED",
                &old_state,
                &new_state,
            )
            .await?;
            if let Some(actor_id) = actor_id {
                let receiver_ids = self
                    .issue_notification_receiver_ids(
                        &project_record,
                        &updated,
                        "ISSUE_STATE_CHANGED",
                    )
                    .await?;
                self.create_notification_event_for_receivers(
                    actor_id,
                    "issue",
                    &updated.id.to_string(),
                    "ISSUE_STATE_CHANGED",
                    &old_state,
                    &new_state,
                    &receiver_ids,
                )
                .await?;
            }
        }

        self.issue_record_from_model(updated, &project_record, None)
            .await
            .map(Some)
    }

    pub async fn create_issue(
        &self,
        input: CreateIssueInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let issue_number = self.next_issue_number(project_record.id).await?;
        let is_draft = input.values.is_draft;
        let assignee_id = self
            .resolve_assignee_id(project_record.id, input.values.assignee_login_id.as_deref())
            .await?;
        let parent_id = self
            .resolve_issue_parent_id(project_record.id, input.values.parent_issue_id, None)
            .await?;
        let now = current_datetime();
        let created = issue::ActiveModel {
            id: NotSet,
            title: Set(Some(input.values.title.trim().to_string())),
            created_date: Set(Some(now)),
            updated_date: Set(Some(now)),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
            author_name: Set(Some(input.actor_display_name)),
            project_id: Set(Some(project_record.id)),
            number: Set(Some(issue_number)),
            num_of_comments: Set(Some(0)),
            state: Set(Some(issue_state_to_raw(if is_draft {
                "draft"
            } else {
                "open"
            }))),
            due_date: Set(input.values.due_date),
            milestone_id: Set(input.values.milestone_id.filter(|value| *value > 0)),
            assignee_id: Set(assignee_id),
            parent_id: Set(parent_id),
            weight: Set(None),
            updated_by_author_id: Set(Some(input.actor_id)),
            is_draft: Set(Some(if is_draft { 1 } else { 0 })),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("issue", "body", created.id, &input.values.body_markdown)
            .await?;
        if is_draft {
            let mentioned_user_ids = self
                .mentioned_active_user_ids(&input.values.body_markdown)
                .await?;
            self.sync_mentions_for_resource("issue_post", created.id, mentioned_user_ids)
                .await?;
        } else {
            self.sync_mentions_and_notify(
                input.actor_id,
                "issue_post",
                created.id,
                &input.values.body_markdown,
                "NEW_ISSUE",
                "",
                &input.values.body_markdown,
            )
            .await?;
        }

        let mut project_active = project::ActiveModel {
            id: Set(project_record.id),
            ..Default::default()
        };
        project_active.last_issue_number = Set(Some(issue_number));
        project_active.update(&self.db).await?;

        self.replace_issue_labels(created.id, project_record.id, &input.values.label_ids)
            .await?;
        self.bind_attachments(
            ISSUE_ATTACHMENT_CONTAINER,
            created.id,
            &input.values.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.watch_issue(created.id, input.actor_id).await?;
        self.issue_record_from_model(created, &project_record, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn create_issue_via_email(
        &self,
        input: CreateIssueViaEmailInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let issue = self
            .create_issue(CreateIssueInput {
                actor_display_name: input.actor_display_name,
                actor_id: input.actor_id,
                actor_login_id: input.actor_login_id,
                owner_name: input.owner_name,
                project_name: input.project_name,
                values: IssueMutationInput {
                    assignee_login_id: None,
                    attachment_ids: Vec::new(),
                    body_markdown: input.body_markdown,
                    due_date: None,
                    label_ids: Vec::new(),
                    is_draft: false,
                    is_publish: false,
                    milestone_id: None,
                    parent_issue_id: None,
                    title: input.title,
                },
            })
            .await?;
        if let Some(issue) = issue {
            self.record_original_email(ISSUE_ATTACHMENT_CONTAINER, issue.id, &input.message_id)
                .await?;
            Ok(Some(issue))
        } else {
            Ok(None)
        }
    }

    pub async fn update_issue(
        &self,
        input: UpdateIssueInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_issue_model(&input.owner_name, &input.project_name, input.issue_number)
            .await?
        else {
            return Ok(None);
        };
        let assignee_id = self
            .resolve_assignee_id(project_record.id, input.values.assignee_login_id.as_deref())
            .await?;
        let parent_id = self
            .resolve_issue_parent_id(
                project_record.id,
                input.values.parent_issue_id,
                Some(model.id),
            )
            .await?;
        let old_state = issue_state_from_raw(model.state);
        let was_draft = model.is_draft.unwrap_or_default() != 0;
        let old_assignee = model.assignee_id;
        let old_milestone = model.milestone_id;
        let old_body = self.read_text_column("issue", "body", model.id).await?;
        let next_history = append_posting_history(
            model.history.as_deref(),
            &old_body,
            &input.values.body_markdown,
        );
        let actor_id = self
            .find_user_by_login_id(&input.actor_login_id)
            .await?
            .map(|user| user.id)
            .unwrap_or_default();
        let mut active = issue::ActiveModel::from(model);
        active.title = Set(Some(input.values.title.trim().to_string()));
        active.assignee_id = Set(assignee_id);
        active.due_date = Set(input.values.due_date);
        active.milestone_id = Set(input.values.milestone_id.filter(|value| *value > 0));
        active.parent_id = Set(parent_id);
        if input.values.is_publish {
            active.created_date = Set(Some(current_datetime()));
            active.is_draft = Set(Some(0));
            active.state = Set(Some(issue_state_to_raw("open")));
            if was_draft {
                let next_issue_number = self.next_issue_number(project_record.id).await?;
                active.number = Set(Some(next_issue_number));
            }
        } else if input.values.is_draft {
            active.is_draft = Set(Some(1));
            active.state = Set(Some(issue_state_to_raw("draft")));
        }
        active.updated_date = Set(Some(current_datetime()));
        let mut updated = active.update(&self.db).await?;
        self.write_text_column("issue", "body", updated.id, &input.values.body_markdown)
            .await?;
        self.write_text_column(
            "issue",
            "history",
            updated.id,
            next_history.as_deref().unwrap_or(""),
        )
        .await?;
        updated.history = next_history;
        if updated.is_draft.unwrap_or_default() != 0 {
            let mentioned_user_ids = self
                .mentioned_active_user_ids(&input.values.body_markdown)
                .await?;
            self.sync_mentions_for_resource("issue_post", updated.id, mentioned_user_ids)
                .await?;
        } else if input.values.is_publish && was_draft {
            self.sync_mentions_and_notify(
                actor_id,
                "issue_post",
                updated.id,
                &input.values.body_markdown,
                "NEW_ISSUE",
                "",
                &input.values.body_markdown,
            )
            .await?;
            let mut project_active = project::ActiveModel {
                id: Set(project_record.id),
                ..Default::default()
            };
            project_active.last_issue_number = Set(updated.number);
            project_active.update(&self.db).await?;
        } else {
            self.sync_mentions_and_notify(
                actor_id,
                "issue_post",
                updated.id,
                &input.values.body_markdown,
                "ISSUE_BODY_CHANGED",
                &old_body,
                &input.values.body_markdown,
            )
            .await?;
        }

        self.replace_issue_labels(updated.id, project_record.id, &input.values.label_ids)
            .await?;
        self.sync_attachments(
            ISSUE_ATTACHMENT_CONTAINER,
            updated.id,
            &input.values.attachment_ids,
            Some(actor_id),
        )
        .await?;
        if old_assignee != updated.assignee_id {
            self.create_issue_event(
                updated.id,
                &input.actor_login_id,
                "ISSUE_ASSIGNEE_CHANGED",
                &old_assignee
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                &updated
                    .assignee_id
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
            )
            .await?;
        }
        if old_milestone != updated.milestone_id {
            self.create_issue_event(
                updated.id,
                &input.actor_login_id,
                "ISSUE_MILESTONE_CHANGED",
                &old_milestone
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
                &updated
                    .milestone_id
                    .map(|value| value.to_string())
                    .unwrap_or_default(),
            )
            .await?;
        }
        let _ = old_state;

        self.issue_record_from_model(updated, &project_record, None)
            .await
            .map(Some)
    }

    pub async fn update_issue_body(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        actor_id: i64,
        _actor_login_id: &str,
        body_markdown: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let old_body = self.read_text_column("issue", "body", model.id).await?;
        let next_history =
            append_posting_history(model.history.as_deref(), &old_body, body_markdown);
        let mut active = issue::ActiveModel::from(model);
        active.updated_date = Set(Some(current_datetime()));
        let mut updated = active.update(&self.db).await?;
        self.write_text_column("issue", "body", updated.id, body_markdown)
            .await?;
        self.write_text_column(
            "issue",
            "history",
            updated.id,
            next_history.as_deref().unwrap_or(""),
        )
        .await?;
        updated.history = next_history;
        self.sync_mentions_and_notify(
            actor_id,
            "issue_post",
            updated.id,
            body_markdown,
            "ISSUE_BODY_CHANGED",
            &old_body,
            body_markdown,
        )
        .await?;
        self.issue_record_from_model(updated, &project_record, Some(actor_id))
            .await
            .map(Some)
    }

    pub async fn delete_issue(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) -> Result<bool, DbErr> {
        let Some((_project, model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(false);
        };
        issue_issue_label::Entity::delete_many()
            .filter(issue_issue_label::Column::IssueId.eq(model.id))
            .exec(&self.db)
            .await?;
        issue_event::Entity::delete_many()
            .filter(issue_event::Column::IssueId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        issue_voter::Entity::delete_many()
            .filter(issue_voter::Column::IssueId.eq(model.id))
            .exec(&self.db)
            .await?;
        for comment in issue_comment::Entity::find()
            .filter(issue_comment::Column::IssueId.eq(Some(model.id)))
            .all(&self.db)
            .await?
        {
            issue_comment_voter::Entity::delete_many()
                .filter(issue_comment_voter::Column::IssueCommentId.eq(comment.id))
                .exec(&self.db)
                .await?;
        }
        issue_comment::Entity::delete_many()
            .filter(issue_comment::Column::IssueId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(model.id.to_string())))
            .exec(&self.db)
            .await?;
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType.is_in(
                    attachment_container_aliases(ISSUE_ATTACHMENT_CONTAINER)
                        .into_iter()
                        .map(Some),
                ),
            )
            .filter(attachment::Column::ContainerId.eq(model.id))
            .exec(&self.db)
            .await?;
        issue::Entity::delete_by_id(model.id).exec(&self.db).await?;
        Ok(true)
    }

    pub async fn create_issue_comment(
        &self,
        input: CreateIssueCommentInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, issue_model)) = self
            .read_project_issue_model(&input.owner_name, &input.project_name, input.issue_number)
            .await?
        else {
            return Ok(None);
        };
        let created = issue_comment::ActiveModel {
            id: NotSet,
            created_date: Set(Some(current_datetime())),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
            author_name: Set(Some(input.actor_display_name)),
            issue_id: Set(Some(issue_model.id)),
            project_id: Set(project_record.id),
            parent_comment_id: Set(input.parent_comment_id),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "issue_comment",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_mentions_and_notify(
            input.actor_id,
            "issue_comment",
            created.id,
            &input.contents_markdown,
            "NEW_COMMENT",
            "",
            &input.contents_markdown,
        )
        .await?;
        self.bind_attachments(
            ISSUE_COMMENT_ATTACHMENT_CONTAINER,
            created.id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.recount_issue_comments(issue_model.id).await?;
        self.read_issue_detail(&input.owner_name, &input.project_name, input.issue_number)
            .await
    }

    pub async fn create_issue_comment_via_email(
        &self,
        input: CreateIssueCommentViaEmailInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let issue = self
            .create_issue_comment(CreateIssueCommentInput {
                actor_display_name: input.actor_display_name,
                actor_id: input.actor_id,
                actor_login_id: input.actor_login_id,
                attachment_ids: Vec::new(),
                contents_markdown: input.contents_markdown.clone(),
                issue_number: input.issue_number,
                owner_name: input.owner_name.clone(),
                parent_comment_id: None,
                project_name: input.project_name.clone(),
            })
            .await?;
        let Some(issue) = issue else {
            return Ok(None);
        };
        let Some(comment) = issue
            .comments
            .iter()
            .filter(|comment| {
                comment.author_id == Some(input.actor_id)
                    && comment.contents_markdown == input.contents_markdown
            })
            .max_by_key(|comment| comment.id)
        else {
            return Ok(Some(issue));
        };
        self.record_original_email(
            ISSUE_COMMENT_ATTACHMENT_CONTAINER,
            comment.id,
            &input.message_id,
        )
        .await?;
        self.read_issue_detail(&input.owner_name, &input.project_name, input.issue_number)
            .await
    }

    pub async fn update_issue_comment(
        &self,
        input: UpdateIssueCommentInput,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((_project_record, issue_model)) = self
            .read_project_issue_model(&input.owner_name, &input.project_name, input.issue_number)
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = issue_comment::Entity::find_by_id(input.comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if comment.issue_id != Some(issue_model.id) {
            return Ok(None);
        }
        let old_contents = self
            .read_text_column("issue_comment", "contents", comment.id)
            .await?;
        let active = issue_comment::ActiveModel::from(comment);
        let updated = active.update(&self.db).await?;
        self.write_text_column(
            "issue_comment",
            "contents",
            updated.id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_mentions_and_notify(
            input.actor_id,
            "issue_comment",
            updated.id,
            &input.contents_markdown,
            "COMMENT_UPDATED",
            &old_contents,
            &input.contents_markdown,
        )
        .await?;
        self.sync_attachments(
            ISSUE_COMMENT_ATTACHMENT_CONTAINER,
            updated.id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.read_issue_detail(&input.owner_name, &input.project_name, input.issue_number)
            .await
    }

    pub async fn delete_issue_comment(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        comment_id: i64,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((_project_record, issue_model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = issue_comment::Entity::find_by_id(comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if comment.issue_id != Some(issue_model.id) {
            return Ok(None);
        }
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(ISSUE_COMMENT_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(comment_id))
            .exec(&self.db)
            .await?;
        issue_comment_voter::Entity::delete_many()
            .filter(issue_comment_voter::Column::IssueCommentId.eq(comment_id))
            .exec(&self.db)
            .await?;
        issue_comment::Entity::delete_by_id(comment_id)
            .exec(&self.db)
            .await?;
        self.recount_issue_comments(issue_model.id).await?;
        self.read_issue_detail(owner_name, project_name, issue_number)
            .await
    }

    pub async fn watch_issue(&self, issue_id: i64, user_id: i64) -> Result<(), DbErr> {
        if watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
            .one(&self.db)
            .await?
            .is_none()
        {
            watch::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                resource_type: Set(Some("ISSUE".to_string())),
                resource_id: Set(Some(issue_id.to_string())),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn unwatch_issue(&self, issue_id: i64, user_id: i64) -> Result<(), DbErr> {
        watch::Entity::delete_many()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("ISSUE".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(issue_id.to_string())))
            .exec(&self.db)
            .await?;
        Ok(())
    }
}
