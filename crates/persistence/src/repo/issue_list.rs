use super::*;

impl AppRepositoryImpl<'_> {
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
                    author_id: None,
                    author_login_id: None,
                    commenter_id: None,
                    due_date: None,
                    draft_author_login_id: None,
                    filter: None,
                    label_ids: Vec::new(),
                    milestone_id: None,
                    order_by: "updatedDate".to_string(),
                    order_dir: "desc".to_string(),
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
        let simple_closed_page = page_size.is_some()
            && filter
                .state
                .as_deref()
                .is_some_and(|state| normalize_identity(state) == "closed")
            && filter.assignee_id.is_none()
            && filter
                .assignee_login_id
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
            && filter.author_id.is_none()
            && filter
                .author_login_id
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
            && filter.commenter_id.is_none()
            && filter.due_date.is_none()
            && filter.draft_author_login_id.is_none()
            && filter
                .filter
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
            && filter.label_ids.is_empty()
            && filter.milestone_id.is_none();
        if simple_closed_page {
            return self
                .list_simple_closed_project_issues_page(
                    &project,
                    &filter,
                    page_size.expect("simple closed page size"),
                )
                .await;
        }


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
            if let Some(author_id) = filter.author_id {
                if author_id > 0 && model.author_id != Some(author_id) {
                    continue;
                }
            }
            if let Some(commenter_id) = filter.commenter_id {
                if commenter_id > 0
                    && !issue_comment::Entity::find()
                        .filter(issue_comment::Column::IssueId.eq(Some(model.id)))
                        .filter(issue_comment::Column::AuthorId.eq(Some(commenter_id)))
                        .one(&self.db)
                        .await?
                        .is_some()
                {
                    continue;
                }
            }
            if let Some(due_date) = filter.due_date {
                if model.due_date.map(|value| value.date()) != Some(due_date.date()) {
                    continue;
                }
            }
            if let Some(text_filter) = filter.filter.as_deref() {
                if !self
                    .issue_model_matches_text_filter(&model, text_filter)
                    .await?
                {
                    continue;
                }
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

            filtered.push(model);
        }

        sort_issue_models_for_project(&mut filtered, &filter.order_by, &filter.order_dir);

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

        let mut records = Vec::new();
        for model in items {
            records.push(
                self.project_issue_list_item_from_model(model, &project)
                    .await?,
            );
        }

        Ok(ProjectIssueListRecord {
            draft_items,
            items: records,
            page_num,
            page_size: effective_page_size,
            total_count,
        })
    }

    async fn list_simple_closed_project_issues_page(
        &self,
        project: &ProjectRecord,
        filter: &IssueListFilter,
        page_size: u32,
    ) -> Result<ProjectIssueListRecord, DbErr> {
        let page_num = filter.page_num.max(1);
        let page_size = page_size.max(1);
        let descending = normalize_identity(&filter.order_dir) != "asc";
        let mut query = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::ParentId.is_null())
            .filter(issue::Column::State.eq(Some(issue_closed_state_raw())))
            .filter(issue::Column::IsDraft.eq(Some(0)));

        match normalize_identity(&filter.order_by).as_str() {
            "duedate" => {
                query = if descending {
                    query.order_by_desc(issue::Column::DueDate)
                } else {
                    query.order_by_asc(issue::Column::DueDate)
                };
            }
            "updateddate" => {
                query = if descending {
                    query.order_by_desc(issue::Column::UpdatedDate)
                } else {
                    query.order_by_asc(issue::Column::UpdatedDate)
                };
            }
            "numofcomments" => {
                query = if descending {
                    query.order_by_desc(issue::Column::NumOfComments)
                } else {
                    query.order_by_asc(issue::Column::NumOfComments)
                };
            }
            _ => {
                query = if descending {
                    query.order_by_desc(issue::Column::CreatedDate)
                } else {
                    query.order_by_asc(issue::Column::CreatedDate)
                };
            }
        }
        query = if descending {
            query
                .order_by_desc(issue::Column::Number)
                .order_by_desc(issue::Column::Id)
        } else {
            query
                .order_by_asc(issue::Column::Number)
                .order_by_asc(issue::Column::Id)
        };

        let total_count = query.clone().count(&self.db).await? as u32;
        let models = query
            .paginate(&self.db, page_size as u64)
            .fetch_page((page_num - 1) as u64)
            .await?;
        let mut records = Vec::with_capacity(models.len());
        for model in models {
            records.push(
                self.project_issue_list_item_from_model(model, project)
                    .await?,
            );
        }

        Ok(ProjectIssueListRecord {
            draft_items: Vec::new(),
            items: records,
            page_num,
            page_size,
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
}

fn sort_issue_models_for_project(items: &mut [issue::Model], order_by: &str, order_dir: &str) {
    let descending = normalize_identity(order_dir) != "asc";
    let normalized_order = normalize_identity(order_by);
    items.sort_by(|left, right| {
        let ordering = match normalized_order.as_str() {
            "duedate" => left.due_date.cmp(&right.due_date),
            "updateddate" => left.updated_date.cmp(&right.updated_date),
            "numofcomments" => left
                .num_of_comments
                .unwrap_or_default()
                .cmp(&right.num_of_comments.unwrap_or_default()),
            _ => left.created_date.cmp(&right.created_date),
        }
        .then_with(|| left.number.cmp(&right.number))
        .then_with(|| left.id.cmp(&right.id));

        if descending {
            ordering.reverse()
        } else {
            ordering
        }
    });
}
