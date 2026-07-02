use super::*;

impl AppRepositoryImpl<'_> {
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

    pub async fn list_project_issue_search_users(
        &self,
        owner_name: &str,
        project_name: &str,
        actor_id: Option<i64>,
        role: &str,
    ) -> Result<Option<ProjectIssueSearchUserListRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        let user_ids = match role {
            "author" => issue::Entity::find()
                .filter(issue::Column::ProjectId.eq(Some(project_record.id)))
                .all(&self.db)
                .await?
                .into_iter()
                .filter_map(|issue| issue.author_id)
                .collect::<HashSet<_>>(),
            "assignee" => assignee::Entity::find()
                .filter(assignee::Column::ProjectId.eq(Some(project_record.id)))
                .all(&self.db)
                .await?
                .into_iter()
                .filter_map(|assignee| assignee.user_id)
                .collect::<HashSet<_>>(),
            _ => return Ok(Some(ProjectIssueSearchUserListRecord { items: Vec::new() })),
        };

        let mut users = n4user::Entity::find()
            .all(&self.db)
            .await?
            .into_iter()
            .filter(|user| user_ids.contains(&user.id) || actor_id == Some(user.id))
            .map(project_issue_search_user_record)
            .collect::<Vec<_>>();

        users.sort_by(|left, right| {
            normalize_identity(&left.display_name)
                .cmp(&normalize_identity(&right.display_name))
                .then_with(|| {
                    normalize_identity(&left.login_id).cmp(&normalize_identity(&right.login_id))
                })
        });
        users.dedup_by_key(|user| user.user_id);

        Ok(Some(ProjectIssueSearchUserListRecord { items: users }))
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
}
