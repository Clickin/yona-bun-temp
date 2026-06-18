impl AppRepository {
    pub async fn list_project_pull_requests(
        &self,
        project: &ProjectRecord,
        filter: PullRequestListFilter,
        actor_id: Option<i64>,
    ) -> Result<PullRequestListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        let page_num = filter.page_num.max(1);
        let category = match normalize_identity(&filter.category).as_str() {
            "closed" => "closed".to_string(),
            "sent" => "sent".to_string(),
            _ => "open".to_string(),
        };
        let text_filter = filter
            .filter
            .as_deref()
            .map(normalize_identity)
            .filter(|value| !value.is_empty());
        let open_count = self
            .count_project_pull_requests_for_category(
                project,
                "open",
                filter.contributor_id,
                text_filter.as_deref(),
            )
            .await?;
        let closed_count = self
            .count_project_pull_requests_for_category(
                project,
                "closed",
                filter.contributor_id,
                text_filter.as_deref(),
            )
            .await?;
        let sent_count = self
            .count_project_pull_requests_for_category(
                project,
                "sent",
                filter.contributor_id,
                text_filter.as_deref(),
            )
            .await?;
        let accepted_count = self
            .count_project_pull_requests_for_category(
                project,
                "accepted",
                filter.contributor_id,
                text_filter.as_deref(),
            )
            .await?;
        let contributors = self
            .list_pull_request_contributors_for_project(project.id)
            .await?;
        let recently_pushed_branches = self
            .list_recently_pushed_branches_for_pull_request_list(project, actor_id)
            .await?;
        let project_column = if category == "sent" {
            pull_request::Column::FromProjectId
        } else {
            pull_request::Column::ToProjectId
        };
        let mut select = pull_request::Entity::find().filter(project_column.eq(Some(project.id)));
        select = match category.as_str() {
            "closed" => select.filter(pull_request_closed_condition()),
            "sent" => select,
            _ => select.filter(pull_request_open_condition()),
        };
        if category != "sent" {
            if let Some(contributor_id) = filter.contributor_id {
                select =
                    select.filter(pull_request::Column::ContributorId.eq(Some(contributor_id)));
            }
        }
        if text_filter.is_none() {
            let total_count = select.clone().count(&self.db).await? as u32;
            let select = if category == "closed" {
                select
                    .order_by_desc(pull_request::Column::Updated)
                    .order_by_desc(pull_request::Column::Number)
            } else {
                select
                    .order_by_desc(pull_request::Column::Created)
                    .order_by_desc(pull_request::Column::Number)
            };
            let rows = select
                .paginate(&self.db, PAGE_SIZE as u64)
                .fetch_page((page_num - 1) as u64)
                .await?;
            let mut items = Vec::new();
            for row in rows {
                items.push(self.pull_request_list_item_from_model(row, project).await?);
            }
            return Ok(PullRequestListRecord {
                accepted_count,
                category,
                closed_count,
                contributors,
                items,
                open_count,
                page_num,
                page_size: PAGE_SIZE,
                recently_pushed_branches,
                sent_count,
                total_count,
            });
        }
        let rows = select.all(&self.db).await?;
        let mut filtered = Vec::new();
        for row in rows {
            if let Some(text_filter) = text_filter.as_deref() {
                let title_matches = row
                    .title
                    .as_deref()
                    .is_some_and(|title| normalize_identity(title).contains(text_filter));
                let body_matches = normalize_identity(
                    &self
                        .read_text_column("pull_request", "body", row.id)
                        .await?,
                )
                .contains(text_filter);
                if !title_matches && !body_matches {
                    continue;
                }
            }
            filtered.push(row);
        }
        filtered.sort_by(|left, right| {
            if category == "closed" {
                right
                    .updated
                    .cmp(&left.updated)
                    .then_with(|| right.number.cmp(&left.number))
            } else {
                right
                    .created
                    .cmp(&left.created)
                    .then_with(|| right.number.cmp(&left.number))
            }
        });
        let total_count = filtered.len() as u32;
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let mut items = Vec::new();
        for row in filtered.into_iter().skip(offset).take(PAGE_SIZE as usize) {
            items.push(self.pull_request_list_item_from_model(row, project).await?);
        }
        Ok(PullRequestListRecord {
            accepted_count,
            category,
            closed_count,
            contributors,
            items,
            open_count,
            page_num,
            page_size: PAGE_SIZE,
            recently_pushed_branches,
            sent_count,
            total_count,
        })
    }

    async fn list_recently_pushed_branches_for_pull_request_list(
        &self,
        project: &ProjectRecord,
        actor_id: Option<i64>,
    ) -> Result<Vec<PullRequestPushedBranchRecord>, DbErr> {
        let source_projects = if project.original_project_id.is_some() {
            vec![project.clone()]
        } else {
            let Some(actor_id) = actor_id else {
                return Ok(Vec::new());
            };
            let Some(actor) = n4user::Entity::find_by_id(actor_id).one(&self.db).await? else {
                return Ok(Vec::new());
            };
            let Some(actor_login_id) = actor.login_id.filter(|value| !value.trim().is_empty())
            else {
                return Ok(Vec::new());
            };
            let rows = project::Entity::find()
                .filter(project::Column::Owner.eq(actor_login_id))
                .filter(project::Column::OriginalProjectId.eq(Some(project.id)))
                .all(&self.db)
                .await?;
            let mut projects = Vec::new();
            for row in rows {
                if let Some(record) = self.project_record_from_model(row).await? {
                    projects.push(record);
                }
            }
            projects
        };
        if source_projects.is_empty() {
            return Ok(Vec::new());
        }
        let project_by_id = source_projects
            .into_iter()
            .map(|project| (project.id, project))
            .collect::<HashMap<_, _>>();
        let cutoff = SystemTime::now()
            .checked_sub(Duration::from_millis(
                PROJECT_PUSHED_BRANCH_DRAFT_TIME_IN_MILLIS as u64,
            ))
            .unwrap_or(SystemTime::UNIX_EPOCH);
        let cutoff = DateTimeUtc::from(cutoff).naive_utc();
        let rows = project_pushed_branch::Entity::find()
            .filter(
                project_pushed_branch::Column::ProjectId
                    .is_in(project_by_id.keys().copied().map(Some)),
            )
            .filter(project_pushed_branch::Column::PushedDate.gt(cutoff))
            .order_by_desc(project_pushed_branch::Column::PushedDate)
            .order_by_desc(project_pushed_branch::Column::Id)
            .all(&self.db)
            .await?;
        let mut records = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };
            let Some(project) = project_by_id.get(&project_id) else {
                continue;
            };
            let branch_name = row.name.unwrap_or_default();
            if branch_name.trim().is_empty() {
                continue;
            }
            records.push(PullRequestPushedBranchRecord {
                branch_name: branch_name.clone(),
                default_branch_project_id: project.original_project_id.unwrap_or(project.id),
                id: row.id,
                owner_name: project.owner_name.clone(),
                project_name: project.project_name.clone(),
                pushed_label: format_workspace_date_label(row.pushed_date),
                short_name: branch_name
                    .strip_prefix("refs/heads/")
                    .unwrap_or(&branch_name)
                    .to_string(),
            });
        }
        Ok(records)
    }

    async fn list_pull_request_contributors_for_project(
        &self,
        project_id: i64,
    ) -> Result<Vec<PullRequestUserRecord>, DbErr> {
        let rows = pull_request::Entity::find()
            .filter(pull_request::Column::ToProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?;
        let mut contributor_ids = rows
            .into_iter()
            .filter_map(|row| row.contributor_id)
            .collect::<Vec<_>>();
        contributor_ids.sort_unstable();
        contributor_ids.dedup();
        let mut contributors = Vec::new();
        for contributor_id in contributor_ids {
            let contributor = self
                .user_record_for_optional_id(Some(contributor_id))
                .await?;
            if contributor.login_id.is_empty() && contributor.user_label.is_empty() {
                continue;
            }
            contributors.push(contributor);
        }
        contributors.sort_by(|left, right| {
            left.user_label
                .cmp(&right.user_label)
                .then_with(|| left.login_id.cmp(&right.login_id))
                .then_with(|| left.user_id.cmp(&right.user_id))
        });
        Ok(contributors)
    }

    async fn count_project_pull_requests_for_category(
        &self,
        project: &ProjectRecord,
        category: &str,
        contributor_id: Option<i64>,
        text_filter: Option<&str>,
    ) -> Result<u32, DbErr> {
        let project_column = if category == "sent" || category == "accepted" {
            pull_request::Column::FromProjectId
        } else {
            pull_request::Column::ToProjectId
        };
        let mut select = pull_request::Entity::find().filter(project_column.eq(Some(project.id)));
        select = match category {
            "closed" => select.filter(pull_request_closed_condition()),
            "accepted" => select.filter(pull_request::Column::State.eq(Some(6))),
            "sent" => select,
            _ => select.filter(pull_request_open_condition()),
        };
        if let Some(contributor_id) = contributor_id {
            select = select.filter(pull_request::Column::ContributorId.eq(Some(contributor_id)));
        }
        if text_filter.is_none() {
            return Ok(select.count(&self.db).await? as u32);
        }
        let rows = select.all(&self.db).await?;
        self.count_pull_request_rows_matching_filter(rows, text_filter)
            .await
    }

    async fn count_pull_request_rows_matching_filter(
        &self,
        rows: Vec<pull_request::Model>,
        text_filter: Option<&str>,
    ) -> Result<u32, DbErr> {
        let Some(text_filter) = text_filter else {
            return Ok(rows.len() as u32);
        };
        let mut count = 0;
        for row in rows {
            let title_matches = row
                .title
                .as_deref()
                .is_some_and(|title| normalize_identity(title).contains(text_filter));
            let body_matches = normalize_identity(
                &self
                    .read_text_column("pull_request", "body", row.id)
                    .await?,
            )
            .contains(text_filter);
            if title_matches || body_matches {
                count += 1;
            }
        }
        Ok(count)
    }

    pub async fn latest_pull_requests_from_branches(
        &self,
        project: &ProjectRecord,
        branch_names: &[String],
    ) -> Result<HashMap<String, BranchPullRequestRecord>, DbErr> {
        let branch_names = branch_names
            .iter()
            .map(|branch| branch.trim().to_string())
            .filter(|branch| !branch.is_empty())
            .collect::<Vec<_>>();
        if branch_names.is_empty() {
            return Ok(HashMap::new());
        }
        let target_project_ids = match project.original_project_id {
            Some(original_project_id) => vec![Some(project.id), Some(original_project_id)],
            None => vec![Some(project.id)],
        };
        let rows = pull_request::Entity::find()
            .filter(pull_request::Column::FromProjectId.eq(Some(project.id)))
            .filter(pull_request::Column::FromBranch.is_in(branch_names))
            .filter(pull_request::Column::ToProjectId.is_in(target_project_ids))
            .order_by_desc(pull_request::Column::Number)
            .order_by_desc(pull_request::Column::Id)
            .all(&self.db)
            .await?;
        let mut latest_by_branch = HashMap::new();
        for row in rows {
            let Some(from_branch) = row.from_branch.clone().filter(|branch| !branch.is_empty())
            else {
                continue;
            };
            if latest_by_branch.contains_key(&from_branch) {
                continue;
            }
            let to_project = match row.to_project_id {
                Some(project_id) => self.read_project_by_id(project_id).await?,
                None => None,
            }
            .unwrap_or_else(|| project.clone());
            latest_by_branch.insert(
                from_branch,
                BranchPullRequestRecord {
                    owner_name: to_project.owner_name,
                    project_name: to_project.project_name,
                    pull_request_number: row.number.unwrap_or_default(),
                    state: pull_request_state_from_raw(row.state, row.is_conflict),
                },
            );
        }
        Ok(latest_by_branch)
    }

    pub async fn list_organization_pull_requests(
        &self,
        visible_projects: Vec<ProjectRecord>,
        filter: PullRequestListFilter,
    ) -> Result<PullRequestListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        let page_num = filter.page_num.max(1);
        let category = match normalize_identity(&filter.category).as_str() {
            "closed" => "closed".to_string(),
            _ => "open".to_string(),
        };
        let project_by_id = visible_projects
            .into_iter()
            .map(|project| (project.id, project))
            .collect::<HashMap<_, _>>();
        if project_by_id.is_empty() {
            return Ok(PullRequestListRecord {
                accepted_count: 0,
                category,
                closed_count: 0,
                contributors: Vec::new(),
                items: Vec::new(),
                open_count: 0,
                page_num,
                page_size: PAGE_SIZE,
                recently_pushed_branches: Vec::new(),
                sent_count: 0,
                total_count: 0,
            });
        }
        let text_filter = filter
            .filter
            .as_deref()
            .map(normalize_identity)
            .filter(|value| !value.is_empty());
        let open_count = self
            .count_organization_pull_requests_for_category(
                project_by_id.keys().copied().collect::<Vec<_>>(),
                "open",
                text_filter.as_deref(),
            )
            .await?;
        let closed_count = self
            .count_organization_pull_requests_for_category(
                project_by_id.keys().copied().collect::<Vec<_>>(),
                "closed",
                text_filter.as_deref(),
            )
            .await?;
        let mut select = pull_request::Entity::find().filter(
            pull_request::Column::ToProjectId.is_in(project_by_id.keys().copied().map(Some)),
        );
        select = if category == "closed" {
            select.filter(pull_request_closed_condition())
        } else {
            select.filter(pull_request_open_condition())
        };
        if text_filter.is_none() {
            let total_count = select.clone().count(&self.db).await? as u32;
            let rows = select
                .order_by_desc(pull_request::Column::Updated)
                .order_by_desc(pull_request::Column::Created)
                .order_by_desc(pull_request::Column::Number)
                .paginate(&self.db, PAGE_SIZE as u64)
                .fetch_page((page_num - 1) as u64)
                .await?;
            let mut items = Vec::new();
            for row in rows {
                if let Some(project_id) = row.to_project_id {
                    if let Some(project) = project_by_id.get(&project_id) {
                        items.push(self.pull_request_list_item_from_model(row, project).await?);
                    }
                }
            }
            return Ok(PullRequestListRecord {
                accepted_count: 0,
                category,
                closed_count,
                contributors: Vec::new(),
                items,
                open_count,
                page_num,
                page_size: PAGE_SIZE,
                recently_pushed_branches: Vec::new(),
                sent_count: 0,
                total_count,
            });
        }
        let rows = select.all(&self.db).await?;
        let mut filtered = Vec::new();
        for row in rows {
            if let Some(text_filter) = text_filter.as_deref() {
                let title_matches = row
                    .title
                    .as_deref()
                    .is_some_and(|title| normalize_identity(title).contains(text_filter));
                let body_matches = normalize_identity(
                    &self
                        .read_text_column("pull_request", "body", row.id)
                        .await?,
                )
                .contains(text_filter);
                if !title_matches && !body_matches {
                    continue;
                }
            }
            if let Some(project_id) = row.to_project_id {
                if let Some(project) = project_by_id.get(&project_id) {
                    filtered.push((row, project.clone()));
                }
            }
        }
        filtered.sort_by(|(left, _), (right, _)| {
            right
                .updated
                .cmp(&left.updated)
                .then_with(|| right.created.cmp(&left.created))
                .then_with(|| right.number.cmp(&left.number))
        });
        let total_count = filtered.len() as u32;
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let mut items = Vec::new();
        for (row, project) in filtered.into_iter().skip(offset).take(PAGE_SIZE as usize) {
            items.push(
                self.pull_request_list_item_from_model(row, &project)
                    .await?,
            );
        }
        Ok(PullRequestListRecord {
            accepted_count: 0,
            category,
            closed_count,
            contributors: Vec::new(),
            items,
            open_count,
            page_num,
            page_size: PAGE_SIZE,
            recently_pushed_branches: Vec::new(),
            sent_count: 0,
            total_count,
        })
    }

    async fn count_organization_pull_requests_for_category(
        &self,
        project_ids: Vec<i64>,
        category: &str,
        text_filter: Option<&str>,
    ) -> Result<u32, DbErr> {
        if project_ids.is_empty() {
            return Ok(0);
        }
        let mut select = pull_request::Entity::find()
            .filter(pull_request::Column::ToProjectId.is_in(project_ids.into_iter().map(Some)));
        select = if category == "closed" {
            select.filter(pull_request_closed_condition())
        } else {
            select.filter(pull_request_open_condition())
        };
        if text_filter.is_none() {
            return Ok(select.count(&self.db).await? as u32);
        }
        let rows = select.all(&self.db).await?;
        self.count_pull_request_rows_matching_filter(rows, text_filter)
            .await
    }

    pub async fn read_pull_request_detail(
        &self,
        owner_name: &str,
        project_name: &str,
        pull_request_number: i64,
        viewer_id: Option<i64>,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(owner_name, project_name, pull_request_number)
            .await?
        else {
            return Ok(None);
        };
        self.pull_request_detail_from_model(model, &project, viewer_id)
            .await
            .map(Some)
    }

    pub async fn create_pull_request(
        &self,
        input: CreatePullRequestInput,
    ) -> Result<Option<CreatePullRequestResult>, DbErr> {
        let Some(from_project) = self.read_project_by_id(input.from_project_id).await? else {
            return Ok(None);
        };
        let Some(to_project) = self.read_project_by_id(input.to_project_id).await? else {
            return Ok(None);
        };
        let from_branch = input.from_branch.trim().to_string();
        let to_branch = input.to_branch.trim().to_string();

        if let Some(duplicate) = self
            .find_duplicate_open_pull_request(
                from_project.id,
                to_project.id,
                &from_branch,
                &to_branch,
            )
            .await?
        {
            let detail = self
                .pull_request_detail_from_model(duplicate, &to_project, Some(input.actor_id))
                .await?;
            return Ok(Some(CreatePullRequestResult::Duplicate(detail)));
        }

        let receiver_id = self
            .find_user_by_login_id(&to_project.owner_name)
            .await?
            .map(|user| user.id)
            .unwrap_or(input.actor_id);
        let pull_request_number = self.next_pull_request_number(to_project.id).await?;
        let now = current_datetime();
        let created = pull_request::ActiveModel {
            id: NotSet,
            title: Set(Some(input.values.title.trim().to_string())),
            to_project_id: Set(Some(to_project.id)),
            from_project_id: Set(Some(from_project.id)),
            to_branch: Set(Some(to_branch)),
            from_branch: Set(Some(from_branch)),
            contributor_id: Set(Some(input.actor_id)),
            receiver_id: Set(Some(receiver_id)),
            created: Set(Some(now)),
            updated: Set(Some(now)),
            received: Set(None),
            state: Set(Some(1)),
            is_conflict: Set(Some(0)),
            is_merging: Set(Some(0)),
            last_commit_id: Set(None),
            merged_commit_id_from: Set(None),
            merged_commit_id_to: Set(None),
            number: Set(Some(pull_request_number)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "pull_request",
            "body",
            created.id,
            &input.values.body_markdown,
        )
        .await?;
        self.bind_attachments(
            PULL_REQUEST_ATTACHMENT_CONTAINER,
            created.id,
            &input.values.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.watch_pull_request(created.id, input.actor_id).await?;
        self.create_pull_request_event(
            created.id,
            &input.actor_login_id,
            "NEW_PULL_REQUEST",
            "",
            &input.values.title,
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                to_project.id,
                created.id,
                created.contributor_id,
                created.receiver_id,
                "NEW_PULL_REQUEST",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "PULL_REQUEST",
            &created.id.to_string(),
            "NEW_PULL_REQUEST",
            "",
            &input.values.title,
            &receiver_ids,
        )
        .await?;

        let detail = self
            .pull_request_detail_from_model(created, &to_project, Some(input.actor_id))
            .await?;
        Ok(Some(CreatePullRequestResult::Created(detail)))
    }

    pub async fn update_pull_request(
        &self,
        input: UpdatePullRequestInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let mut active = pull_request::ActiveModel::from(model);
        active.title = Set(Some(input.values.title.trim().to_string()));
        active.updated = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        self.write_text_column(
            "pull_request",
            "body",
            updated.id,
            &input.values.body_markdown,
        )
        .await?;
        self.sync_attachments(
            PULL_REQUEST_ATTACHMENT_CONTAINER,
            updated.id,
            &input.values.attachment_ids,
            Some(input.actor_id),
        )
        .await?;

        self.pull_request_detail_from_model(updated, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn update_pull_request_state(
        &self,
        input: PullRequestStateInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let old_state = pull_request_lifecycle_state(model.state);
        let next_state = if normalize_identity(&input.state) == "closed" {
            "closed"
        } else {
            "open"
        };
        let next_raw = if next_state == "closed" { 2 } else { 1 };
        let mut active = pull_request::ActiveModel::from(model.clone());
        active.state = Set(Some(next_raw));
        active.is_conflict = Set(Some(0));
        active.updated = Set(Some(current_datetime()));
        let updated = active.update(&self.db).await?;
        self.create_pull_request_event(
            updated.id,
            &input.actor_login_id,
            "PULL_REQUEST_STATE_CHANGED",
            &old_state,
            next_state,
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                project.id,
                updated.id,
                updated.contributor_id,
                updated.receiver_id,
                "PULL_REQUEST_STATE_CHANGED",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "PULL_REQUEST",
            &updated.id.to_string(),
            "PULL_REQUEST_STATE_CHANGED",
            &old_state,
            next_state,
            &receiver_ids,
        )
        .await?;

        self.pull_request_detail_from_model(updated, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn merge_pull_request(
        &self,
        input: PullRequestMergeInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let old_state = pull_request_state_from_raw(model.state, model.is_conflict);
        let now = current_datetime();
        let mut active = pull_request::ActiveModel::from(model.clone());
        active.is_merging = Set(Some(0));
        active.updated = Set(Some(now));

        if input.conflict {
            active.is_conflict = Set(Some(1));
            let updated = active.update(&self.db).await?;
            return self
                .pull_request_detail_from_model(updated, &project, Some(input.actor_id))
                .await
                .map(Some);
        }

        active.state = Set(Some(6));
        active.is_conflict = Set(Some(0));
        active.received = Set(Some(now));
        active.last_commit_id = Set(Some(input.merged_commit_id_to.clone()));
        active.merged_commit_id_from = Set(Some(input.merged_commit_id_from.clone()));
        active.merged_commit_id_to = Set(Some(input.merged_commit_id_to.clone()));
        let updated = active.update(&self.db).await?;
        self.create_pull_request_event(
            updated.id,
            &input.actor_login_id,
            "PULL_REQUEST_MERGED",
            &old_state,
            "merged",
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                project.id,
                updated.id,
                updated.contributor_id,
                updated.receiver_id,
                "PULL_REQUEST_MERGED",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "PULL_REQUEST",
            &updated.id.to_string(),
            "PULL_REQUEST_MERGED",
            &old_state,
            "merged",
            &receiver_ids,
        )
        .await?;

        self.pull_request_detail_from_model(updated, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn set_pull_request_review(
        &self,
        input: PullRequestReviewInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let existing = pull_request_reviewers::Entity::find_by_id((model.id, input.actor_id))
            .one(&self.db)
            .await?;
        if input.reviewed {
            if existing.is_none() {
                pull_request_reviewers::ActiveModel {
                    pull_request_id: Set(model.id),
                    user_id: Set(input.actor_id),
                }
                .insert(&self.db)
                .await?;
            }
        } else if existing.is_some() {
            pull_request_reviewers::Entity::delete_by_id((model.id, input.actor_id))
                .exec(&self.db)
                .await?;
        }
        let (old_value, new_value) = if input.reviewed {
            ("CANCEL", "DONE")
        } else {
            ("DONE", "CANCEL")
        };
        self.create_pull_request_event(
            model.id,
            &input.actor_login_id,
            "PULL_REQUEST_REVIEW_STATE_CHANGED",
            old_value,
            new_value,
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                project.id,
                model.id,
                model.contributor_id,
                model.receiver_id,
                "PULL_REQUEST_REVIEW_STATE_CHANGED",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "PULL_REQUEST",
            &model.id.to_string(),
            "PULL_REQUEST_REVIEW_STATE_CHANGED",
            old_value,
            new_value,
            &receiver_ids,
        )
        .await?;

        self.pull_request_detail_from_model(model, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn create_pull_request_comment(
        &self,
        input: CreatePullRequestCommentInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let thread_id = if let Some(thread_id) = input.thread_id {
            let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                .one(&self.db)
                .await?
            else {
                return Ok(None);
            };
            if thread.pull_request_id != Some(model.id) {
                return Ok(None);
            }
            thread.id
        } else {
            let commit_id = input
                .commit_id
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned)
                .or_else(|| model.merged_commit_id_to.clone());
            let prev_commit_id = input
                .prev_commit_id
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned)
                .or_else(|| model.merged_commit_id_from.clone());
            let path = input
                .path
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned);
            let start_side = review_thread_side(input.start_side.as_deref());
            let end_side = review_thread_side(input.end_side.as_deref());
            let is_ranged =
                path.is_some() || input.start_line.is_some() || input.end_line.is_some();
            comment_thread::ActiveModel {
                dtype: Set(if is_ranged {
                    "CodeCommentThread".to_string()
                } else {
                    "NonRangedCodeCommentThread".to_string()
                }),
                id: NotSet,
                author_id: Set(Some(input.actor_id)),
                author_login_id: Set(Some(input.actor_login_id.clone())),
                author_name: Set(Some(input.actor_display_name.clone())),
                state: Set(Some("open".to_string())),
                created_date: Set(Some(current_datetime())),
                pull_request_id: Set(Some(model.id)),
                project_id: Set(Some(project.id)),
                prev_commit_id: Set(prev_commit_id),
                commit_id: Set(commit_id),
                path: Set(path),
                start_side: Set(start_side),
                start_line: Set(input.start_line),
                start_column: Set(None),
                end_side: Set(end_side),
                end_line: Set(input.end_line),
                end_column: Set(None),
            }
            .insert(&self.db)
            .await?
            .id
        };
        let created = review_comment::ActiveModel {
            id: NotSet,
            created_date: Set(Some(current_datetime())),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(input.actor_login_id.clone())),
            author_name: Set(Some(input.actor_display_name.clone())),
            thread_id: Set(Some(thread_id)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "review_comment",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.bind_attachments(
            REVIEW_COMMENT_ATTACHMENT_CONTAINER,
            created.id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.create_pull_request_event(
            model.id,
            &input.actor_login_id,
            "NEW_REVIEW_COMMENT",
            "",
            &input.contents_markdown,
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                project.id,
                model.id,
                model.contributor_id,
                model.receiver_id,
                "NEW_REVIEW_COMMENT",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "REVIEW_COMMENT",
            &created.id.to_string(),
            "NEW_REVIEW_COMMENT",
            "",
            &input.contents_markdown,
            &receiver_ids,
        )
        .await?;

        self.pull_request_detail_from_model(model, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn update_pull_request_comment(
        &self,
        input: UpdatePullRequestCommentInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = review_comment::Entity::find_by_id(input.comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(thread_id) = comment.thread_id else {
            return Ok(None);
        };
        let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if thread.pull_request_id != Some(model.id) {
            return Ok(None);
        }
        self.write_text_column(
            "review_comment",
            "contents",
            input.comment_id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_attachments(
            REVIEW_COMMENT_ATTACHMENT_CONTAINER,
            input.comment_id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.pull_request_detail_from_model(model, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn delete_pull_request_comment(
        &self,
        input: DeletePullRequestCommentInput,
    ) -> Result<Option<PullRequestDetailRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = review_comment::Entity::find_by_id(input.comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let Some(thread_id) = comment.thread_id else {
            return Ok(None);
        };
        let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if thread.pull_request_id != Some(model.id) {
            return Ok(None);
        }
        review_comment::Entity::delete_by_id(input.comment_id)
            .exec(&self.db)
            .await?;
        let remaining = review_comment::Entity::find()
            .filter(review_comment::Column::ThreadId.eq(Some(thread_id)))
            .count(&self.db)
            .await?;
        if remaining == 0 {
            comment_thread::Entity::delete_by_id(thread_id)
                .exec(&self.db)
                .await?;
        }
        self.pull_request_detail_from_model(model, &project, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn update_pull_request_thread_state(
        &self,
        input: PullRequestThreadStateInput,
    ) -> Result<Option<ReviewThreadRecord>, DbErr> {
        let Some((_project, model)) = self
            .read_project_pull_request_model(
                &input.owner_name,
                &input.project_name,
                input.pull_request_number,
            )
            .await?
        else {
            return Ok(None);
        };
        let Some(thread) = comment_thread::Entity::find_by_id(input.thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if thread.pull_request_id != Some(model.id) {
            return Ok(None);
        }
        let old_state = review_thread_state(thread.state.as_deref());
        let next_state = if normalize_identity(&input.state) == "closed" {
            "closed"
        } else {
            "open"
        };
        let mut active = comment_thread::ActiveModel::from(thread);
        active.state = Set(Some(next_state.to_string()));
        let updated = active.update(&self.db).await?;
        self.create_pull_request_event(
            model.id,
            &input.actor_login_id,
            "REVIEW_THREAD_STATE_CHANGED",
            &old_state,
            next_state,
        )
        .await?;
        let receiver_ids = self
            .pull_request_notification_receiver_ids(
                updated.project_id.unwrap_or_default(),
                model.id,
                model.contributor_id,
                model.receiver_id,
                "REVIEW_THREAD_STATE_CHANGED",
            )
            .await?;
        self.create_notification_event_for_receivers(
            input.actor_id,
            "PULL_REQUEST",
            &model.id.to_string(),
            "REVIEW_THREAD_STATE_CHANGED",
            &old_state,
            next_state,
            &receiver_ids,
        )
        .await?;
        let comments = self.list_review_comments(updated.id).await?;
        self.review_thread_record(updated, comments).await.map(Some)
    }

    pub async fn read_review_thread_route_context(
        &self,
        thread_id: i64,
    ) -> Result<Option<ReviewThreadRouteContext>, DbErr> {
        let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };

        let pull_request = if let Some(pull_request_id) = thread.pull_request_id {
            pull_request::Entity::find_by_id(pull_request_id)
                .one(&self.db)
                .await?
        } else {
            None
        };
        let project_id = thread
            .project_id
            .or_else(|| pull_request.as_ref().and_then(|row| row.to_project_id));
        let Some(project_id) = project_id else {
            return Ok(None);
        };
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };

        Ok(Some(ReviewThreadRouteContext {
            author_id: thread.author_id,
            commit_id: thread.commit_id.unwrap_or_default(),
            owner_name: project.owner_name,
            project_name: project.project_name,
            pull_request_number: pull_request.and_then(|row| row.number),
            thread_id: thread.id,
        }))
    }

    pub async fn list_commit_discussion_threads(
        &self,
        project_id: i64,
        commit_id: &str,
    ) -> Result<Vec<ReviewThreadRecord>, DbErr> {
        let rows = comment_thread::Entity::find()
            .filter(comment_thread::Column::ProjectId.eq(Some(project_id)))
            .filter(comment_thread::Column::PullRequestId.is_null())
            .filter(comment_thread::Column::CommitId.eq(Some(commit_id.to_string())))
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

    pub async fn count_commit_discussion_threads_by_commit(
        &self,
        project_id: i64,
        commit_ids: &[String],
        path: Option<&str>,
    ) -> Result<HashMap<String, u32>, DbErr> {
        if commit_ids.is_empty() {
            return Ok(HashMap::new());
        }
        let mut base = comment_thread::Entity::find()
            .filter(comment_thread::Column::ProjectId.eq(Some(project_id)))
            .filter(comment_thread::Column::PullRequestId.is_null())
            .filter(comment_thread::Column::CommitId.is_in(commit_ids.iter().cloned().map(Some)));
        if let Some(path) = path.map(str::trim).filter(|value| !value.is_empty()) {
            base = base.filter(
                Condition::any()
                    .add(comment_thread::Column::Path.is_null())
                    .add(comment_thread::Column::Path.eq(Some(path.to_string()))),
            );
        }
        let rows = base.all(&self.db).await?;
        let mut counts = HashMap::new();
        for row in rows {
            if let Some(commit_id) = row.commit_id {
                *counts.entry(commit_id).or_insert(0) += 1;
            }
        }
        Ok(counts)
    }

    pub async fn create_commit_discussion_comment(
        &self,
        input: CreateCommitDiscussionCommentInput,
    ) -> Result<Option<ReviewThreadRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let thread_id = if let Some(thread_id) = input.thread_id {
            let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                .one(&self.db)
                .await?
            else {
                return Ok(None);
            };
            if thread.project_id != Some(project.id)
                || thread.pull_request_id.is_some()
                || thread.commit_id.as_deref() != Some(input.commit_id.as_str())
            {
                return Ok(None);
            }
            thread.id
        } else {
            let path = input
                .path
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned);
            let is_ranged =
                path.is_some() || input.start_line.is_some() || input.end_line.is_some();
            comment_thread::ActiveModel {
                dtype: Set(if is_ranged {
                    "CodeCommentThread".to_string()
                } else {
                    "NonRangedCodeCommentThread".to_string()
                }),
                id: NotSet,
                author_id: Set(Some(input.actor_id)),
                author_login_id: Set(Some(input.actor_login_id.clone())),
                author_name: Set(Some(input.actor_display_name.clone())),
                state: Set(Some("open".to_string())),
                created_date: Set(Some(current_datetime())),
                pull_request_id: Set(None),
                project_id: Set(Some(project.id)),
                prev_commit_id: Set(None),
                commit_id: Set(Some(input.commit_id.clone())),
                path: Set(path),
                start_side: Set(None),
                start_line: Set(input.start_line),
                start_column: Set(None),
                end_side: Set(None),
                end_line: Set(input.end_line),
                end_column: Set(None),
            }
            .insert(&self.db)
            .await?
            .id
        };
        let created = review_comment::ActiveModel {
            id: NotSet,
            created_date: Set(Some(current_datetime())),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(input.actor_login_id.clone())),
            author_name: Set(Some(input.actor_display_name.clone())),
            thread_id: Set(Some(thread_id)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "review_comment",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.bind_attachments(
            REVIEW_COMMENT_ATTACHMENT_CONTAINER,
            created.id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        let receiver_ids = self
            .commit_notification_receiver_ids(project.id, input.actor_id, "NEW_REVIEW_COMMENT")
            .await?;
        self.create_notification_event_for_commit_discussion(
            input.actor_id,
            "REVIEW_COMMENT",
            &created.id.to_string(),
            "NEW_REVIEW_COMMENT",
            "",
            &input.contents_markdown,
            &receiver_ids,
        )
        .await?;

        let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let comments = self.list_review_comments(thread.id).await?;
        self.review_thread_record(thread, comments).await.map(Some)
    }

    pub async fn create_review_comment_via_email(
        &self,
        input: CreateReviewCommentViaEmailInput,
    ) -> Result<Option<ReviewThreadRecord>, DbErr> {
        let Some(thread) = comment_thread::Entity::find_by_id(input.thread_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let created = review_comment::ActiveModel {
            id: NotSet,
            created_date: Set(Some(current_datetime())),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(input.actor_login_id)),
            author_name: Set(Some(input.actor_display_name)),
            thread_id: Set(Some(thread.id)),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "review_comment",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.record_original_email(
            REVIEW_COMMENT_ATTACHMENT_CONTAINER,
            created.id,
            &input.message_id,
        )
        .await?;
        let comments = self.list_review_comments(thread.id).await?;
        self.review_thread_record(thread, comments).await.map(Some)
    }
}
