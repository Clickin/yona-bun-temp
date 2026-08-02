use super::*;
use sea_query::{Order, Query};

#[derive(Debug, FromQueryResult)]
struct ProjectIssueCountsRow {
    closed_issue_count: Option<i64>,
    open_issue_count: Option<i64>,
    assigned_to_me_count: Option<i64>,
    authored_by_me_count: Option<i64>,
    commented_by_me_count: Option<i64>,
}

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

    pub async fn count_project_issue_summary(
        &self,
        owner_name: &str,
        project_name: &str,
        state: &str,
        actor_id: Option<i64>,
    ) -> Result<(u32, u32, u32, u32, u32), DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok((0, 0, 0, 0, 0));
        };

        let open_condition = Condition::all()
            .add(issue::Column::State.eq(Some(issue_state_to_raw("open"))))
            .add(issue::Column::ParentId.is_null());
        let closed_condition = Condition::all()
            .add(issue::Column::State.eq(Some(issue_state_to_raw("closed"))))
            .add(issue::Column::ParentId.is_null());
        let assigned_condition = actor_id
            .map(|actor_id| {
                Condition::all()
                    .add(issue::Column::State.eq(Some(issue_state_to_raw(state))))
                    .add(assignee::Column::UserId.eq(Some(actor_id)))
                    .add(assignee::Column::ProjectId.eq(Some(project.id)))
            })
            .unwrap_or_else(|| Condition::all().add(Expr::val(false).eq(true)));
        let authored_condition = actor_id
            .map(|actor_id| {
                Condition::all()
                    .add(issue::Column::State.eq(Some(issue_state_to_raw(state))))
                    .add(issue::Column::AuthorId.eq(Some(actor_id)))
            })
            .unwrap_or_else(|| Condition::all().add(Expr::val(false).eq(true)));
        let commented_condition = actor_id
            .map(|actor_id| {
                let issue_ids = issue_comment::Entity::find()
                    .select_only()
                    .column(issue_comment::Column::IssueId)
                    .filter(issue_comment::Column::AuthorId.eq(Some(actor_id)))
                    .into_query();
                Condition::all()
                    .add(issue::Column::State.eq(Some(issue_state_to_raw(state))))
                    .add(issue::Column::Id.in_subquery(issue_ids))
            })
            .unwrap_or_else(|| Condition::all().add(Expr::val(false).eq(true)));

        let row = issue::Entity::find()
            .select_only()
            .join(JoinType::LeftJoin, issue::Relation::Assignee.def())
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::IsDraft.eq(Some(0)));
        let row = row
            .expr_as(
                Func::count_distinct(Expr::case(
                    open_condition,
                    Expr::col((issue::Entity, issue::Column::Id)),
                )),
                "open_issue_count",
            )
            .expr_as(
                Func::count_distinct(Expr::case(
                    closed_condition,
                    Expr::col((issue::Entity, issue::Column::Id)),
                )),
                "closed_issue_count",
            )
            .expr_as(
                Func::count_distinct(Expr::case(
                    assigned_condition,
                    Expr::col((issue::Entity, issue::Column::Id)),
                )),
                "assigned_to_me_count",
            )
            .expr_as(
                Func::count_distinct(Expr::case(
                    authored_condition,
                    Expr::col((issue::Entity, issue::Column::Id)),
                )),
                "authored_by_me_count",
            )
            .expr_as(
                Func::count_distinct(Expr::case(
                    commented_condition,
                    Expr::col((issue::Entity, issue::Column::Id)),
                )),
                "commented_by_me_count",
            )
            .into_model::<ProjectIssueCountsRow>()
            .one(&self.db)
            .await?
            .unwrap_or(ProjectIssueCountsRow {
                closed_issue_count: Some(0),
                open_issue_count: Some(0),
                assigned_to_me_count: Some(0),
                authored_by_me_count: Some(0),
                commented_by_me_count: Some(0),
            });

        Ok((
            row.open_issue_count.unwrap_or_default().max(0) as u32,
            row.closed_issue_count.unwrap_or_default().max(0) as u32,
            row.assigned_to_me_count.unwrap_or_default().max(0) as u32,
            row.authored_by_me_count.unwrap_or_default().max(0) as u32,
            row.commented_by_me_count.unwrap_or_default().max(0) as u32,
        ))
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
        let simple_state_page = page_size.is_some()
            && filter.state.as_deref().is_some_and(|state| {
                matches!(normalize_identity(state).as_str(), "open" | "closed")
            })
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
        if simple_state_page {
            return self
                .list_simple_project_issues_page(
                    &project,
                    &filter,
                    page_size.expect("simple closed page size"),
                )
                .await;
        }


        let backend = self.db.get_database_backend();
        let condition = project_issue_list_condition(project.id, &filter, backend);
        let page_num = filter.page_num.max(1);

        // Draft items: unpaginated as today, assembled from a simple find.
        let can_show_drafts = page_num == 1
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
        let draft_items = if can_show_drafts && draft_author_login_id.is_some() {
            let draft_models = issue::Entity::find()
                .filter(issue::Column::ProjectId.eq(Some(project.id)))
                .filter(issue::Column::IsDraft.eq(Some(1)))
                .filter(
                    Expr::expr(Func::lower(Expr::col(issue::Column::AuthorLoginId)))
                        .eq(draft_author_login_id.expect("checked above")),
                )
                .order_by_desc(issue::Column::CreatedDate)
                .order_by_desc(issue::Column::Number)
                .all(&self.db)
                .await?;
            let draft_rows = draft_models
                .into_iter()
                .map(Into::into)
                .collect::<Vec<ProjectIssueListRow>>();
            self.project_issue_list_items_from_rows(&draft_rows, &project)
                .await?
        } else {
            Vec::new()
        };

        // Count: one bounded statement, only when paging (export uses rows.len()).
        let total_count = if page_size.is_some() {
            let mut count_stmt = Query::select();
            count_stmt
                .expr_as(
                    Func::count(Expr::col((issue::Entity, issue::Column::Id))),
                    "count",
                )
                .from(issue::Entity)
                .cond_where(condition.clone());
            let (count_sql, count_values) =
                count_stmt.build_any(backend.get_query_builder().as_ref());
            self.db
                .query_one(Statement::from_sql_and_values(
                    backend,
                    count_sql,
                    count_values,
                ))
                .await?
                .and_then(|row| row.try_get::<i64>("", "count").ok())
                .unwrap_or(0)
                .max(0) as u32
        } else {
            0
        };

        // List: one bounded statement projecting only the 16 lean columns.
        let descending = normalize_identity(&filter.order_dir) != "asc";
        let mut list_stmt = Query::select();
        list_stmt
            .columns([
                (issue::Entity, issue::Column::Id),
                (issue::Entity, issue::Column::Title),
                (issue::Entity, issue::Column::CreatedDate),
                (issue::Entity, issue::Column::UpdatedDate),
                (issue::Entity, issue::Column::AuthorId),
                (issue::Entity, issue::Column::AuthorLoginId),
                (issue::Entity, issue::Column::AuthorName),
                (issue::Entity, issue::Column::Number),
                (issue::Entity, issue::Column::NumOfComments),
                (issue::Entity, issue::Column::State),
                (issue::Entity, issue::Column::DueDate),
                (issue::Entity, issue::Column::MilestoneId),
                (issue::Entity, issue::Column::AssigneeId),
                (issue::Entity, issue::Column::ParentId),
                (issue::Entity, issue::Column::Weight),
                (issue::Entity, issue::Column::IsDraft),
            ])
            .from(issue::Entity)
            .cond_where(condition);
        match normalize_identity(&filter.order_by).as_str() {
            "duedate" => list_stmt.order_by(
                (issue::Entity, issue::Column::DueDate),
                if descending { Order::Desc } else { Order::Asc },
            ),
            "updateddate" => list_stmt.order_by(
                (issue::Entity, issue::Column::UpdatedDate),
                if descending { Order::Desc } else { Order::Asc },
            ),
            "numofcomments" => list_stmt.order_by_expr(
                Expr::cust("COALESCE(num_of_comments, 0)"),
                if descending { Order::Desc } else { Order::Asc },
            ),
            _ => list_stmt.order_by(
                (issue::Entity, issue::Column::CreatedDate),
                if descending { Order::Desc } else { Order::Asc },
            ),
        };
        list_stmt
            .order_by(
                (issue::Entity, issue::Column::Number),
                if descending { Order::Desc } else { Order::Asc },
            )
            .order_by(
                (issue::Entity, issue::Column::Id),
                if descending { Order::Desc } else { Order::Asc },
            );
        if let Some(page_size) = page_size {
            list_stmt
                .limit(page_size as u64)
                .offset(((page_num - 1) * page_size) as u64);
        }
        let (list_sql, list_values) = list_stmt.build_any(backend.get_query_builder().as_ref());
        let rows = self
            .db
            .query_all(Statement::from_sql_and_values(
                backend,
                list_sql,
                list_values,
            ))
            .await?
            .into_iter()
            .map(|row| ProjectIssueListRow::from_query_result(&row, ""))
            .collect::<Result<Vec<_>, DbErr>>()?;

        let total_count = if page_size.is_some() {
            total_count
        } else {
            rows.len() as u32
        };
        let effective_page_size = page_size.unwrap_or(total_count.max(1));
        let records = self
            .project_issue_list_items_from_rows(&rows, &project)
            .await?;

        Ok(ProjectIssueListRecord {
            draft_items,
            items: records,
            page_num,
            page_size: effective_page_size,
            total_count,
        })
    }

    async fn list_simple_project_issues_page(
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
            .filter(issue::Column::State.eq(Some(issue_state_to_raw(
                filter.state.as_deref().unwrap_or("open"),
            ))))
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
        let rows = models
            .into_iter()
            .map(Into::into)
            .collect::<Vec<ProjectIssueListRow>>();
        let records = self
            .project_issue_list_items_from_rows(&rows, project)
            .await?;

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
        let mut rows_by_project = HashMap::<i64, Vec<ProjectIssueListRow>>::new();
        for (row, project) in &page_models {
            rows_by_project
                .entry(project.id)
                .or_default()
                .push(row.clone().into());
        }
        let mut items_by_project = HashMap::<i64, Vec<ProjectIssueListItemRecord>>::new();
        for (project_id, rows) in rows_by_project {
            let project = project_by_id.get(&project_id).expect("page project");
            items_by_project.insert(
                project_id,
                self.project_issue_list_items_from_rows(&rows, project)
                    .await?,
            );
        }
        let mut items = Vec::with_capacity(page_models.len());
        for (_row, project) in page_models {
            let batch = items_by_project
                .get_mut(&project.id)
                .expect("page project batch");
            items.push(batch.remove(0));
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

/// Escapes a LIKE pattern so `%`, `_`, and `\` match literally.
fn escape_like(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for ch in value.chars() {
        match ch {
            '\\' => escaped.push_str("\\\\"),
            '%' => escaped.push_str("\\%"),
            '_' => escaped.push_str("\\_"),
            _ => escaped.push(ch),
        }
    }
    escaped
}

/// SQL predicate mirroring the legacy Rust-side filter loop of
/// `list_project_issues_filtered_with_page_size`. Drafts are excluded here
/// (they are handled by the separate draft query); the non-simple path
/// deliberately includes subtasks as flat rows — that difference vs. the
/// simple path is the contract.
fn project_issue_list_condition(
    project_id: i64,
    filter: &IssueListFilter,
    backend: DatabaseBackend,
) -> Condition {
    let mut condition = Condition::all()
        .add(Expr::col((issue::Entity, issue::Column::ProjectId)).eq(project_id))
        .add(Expr::col((issue::Entity, issue::Column::IsDraft)).eq(0));

    if let Some(state) = filter.state.as_deref() {
        if !state.trim().is_empty() {
            condition = condition
                .add(Expr::col((issue::Entity, issue::Column::State)).eq(issue_state_to_raw(state)));
        }
    }
    if filter.author_id.is_some_and(|author_id| author_id > 0) {
        condition = condition.add(
            Expr::col((issue::Entity, issue::Column::AuthorId)).eq(filter.author_id.unwrap()),
        );
    }
    if let Some(login_id) = filter.author_login_id.as_deref() {
        if !login_id.trim().is_empty() {
            condition = condition.add(
                Expr::expr(Func::lower(Expr::col((
                    issue::Entity,
                    issue::Column::AuthorLoginId,
                ))))
                .eq(normalize_identity(login_id)),
            );
        }
    }
    if filter.commenter_id.is_some_and(|commenter_id| commenter_id > 0) {
        let mut commenter_sub = Query::select();
        commenter_sub
            .column((issue_comment::Entity, issue_comment::Column::IssueId))
            .from(issue_comment::Entity)
            .and_where(
                Expr::col((issue_comment::Entity, issue_comment::Column::AuthorId))
                    .eq(filter.commenter_id.unwrap()),
            );
        condition = condition
            .add(Expr::col((issue::Entity, issue::Column::Id)).in_subquery(commenter_sub));
    }
    if let Some(due_date) = filter.due_date {
        let date = due_date.date();
        let start = date.and_hms_opt(0, 0, 0).expect("midnight");
        let end = date
            .succ_opt()
            .expect("max date has no successor")
            .and_hms_opt(0, 0, 0)
            .expect("midnight");
        condition = condition
            .add(Expr::col((issue::Entity, issue::Column::DueDate)).gte(start))
            .add(Expr::col((issue::Entity, issue::Column::DueDate)).lt(end));
    }
    if let Some(milestone_id) = filter.milestone_id {
        condition = condition.add(
            Expr::col((issue::Entity, issue::Column::MilestoneId)).eq(milestone_id),
        );
    }
    if let Some(assignee_user_id) = filter.assignee_id {
        if assignee_user_id <= 0 {
            condition = condition
                .add(Expr::col((issue::Entity, issue::Column::AssigneeId)).is_null());
        } else {
            let mut assignee_sub = Query::select();
            assignee_sub
                .column((assignee::Entity, assignee::Column::Id))
                .from(assignee::Entity)
                .and_where(
                    Expr::col((assignee::Entity, assignee::Column::UserId)).eq(assignee_user_id),
                );
            condition = condition
                .add(Expr::col((issue::Entity, issue::Column::AssigneeId)).in_subquery(assignee_sub));
        }
    }
    if let Some(assignee_login_id) = filter.assignee_login_id.as_deref() {
        if !assignee_login_id.trim().is_empty() {
            let mut assignee_sub = Query::select();
            assignee_sub
                .column((assignee::Entity, assignee::Column::Id))
                .from(assignee::Entity)
                .inner_join(
                    n4user::Entity,
                    Expr::col((assignee::Entity, assignee::Column::UserId))
                        .equals((n4user::Entity, n4user::Column::Id)),
                )
                .and_where(
                    Expr::expr(Func::lower(Expr::col((n4user::Entity, n4user::Column::LoginId))))
                        .eq(normalize_identity(assignee_login_id)),
                );
            condition = condition
                .add(Expr::col((issue::Entity, issue::Column::AssigneeId)).in_subquery(assignee_sub));
        }
    }
    if !filter.label_ids.is_empty() {
        let mut labeled_sub = Query::select();
        labeled_sub
            .column((issue_issue_label::Entity, issue_issue_label::Column::IssueId))
            .from(issue_issue_label::Entity)
            .and_where(
                Expr::col((issue_issue_label::Entity, issue_issue_label::Column::IssueLabelId))
                    .is_in(filter.label_ids.iter().copied()),
            )
            .group_by_col((issue_issue_label::Entity, issue_issue_label::Column::IssueId))
            .and_having(
                Expr::expr(Func::count_distinct(Expr::col((
                    issue_issue_label::Entity,
                    issue_issue_label::Column::IssueLabelId,
                ))))
                .eq(filter.label_ids.len() as u64),
            );
        condition = condition
            .add(Expr::col((issue::Entity, issue::Column::Id)).in_subquery(labeled_sub));
    }
    if let Some(text_filter) = filter.filter.as_deref() {
        let needle = normalize_identity(text_filter);
        if !needle.is_empty() {
            let placeholder = sql_placeholders(backend, 1)[0].clone();
            let needle = format!("%{}%", escape_like(&needle));
            // MySQL processes backslash escapes inside string literals (its
            // ESCAPE literal needs a doubled backslash); SQLite and PostgreSQL
            // treat them literally.
            let escape_literal = match backend {
                DatabaseBackend::MySql => "\\\\",
                _ => "\\",
            };
            let like_clause = format!("LIKE {placeholder} ESCAPE '{escape_literal}'");
            let title_like = Expr::cust_with_values(
                format!("LOWER(TRIM(issue.title)) {like_clause}"),
                vec![sea_orm::Value::from(needle.clone())],
            );
            let body_like = Expr::cust_with_values(
                format!("LOWER(TRIM(issue.body)) {like_clause}"),
                vec![sea_orm::Value::from(needle.clone())],
            );
            let mut comment_sub = Query::select();
            comment_sub
                .column((issue_comment::Entity, issue_comment::Column::IssueId))
                .from(issue_comment::Entity)
                .and_where(Expr::cust_with_values(
                    format!("LOWER(TRIM(contents)) {like_clause}"),
                    vec![sea_orm::Value::from(needle)],
                ));
            condition = condition.add(
                Condition::any()
                    .add(title_like)
                    .add(body_like)
                    .add(Expr::col((issue::Entity, issue::Column::Id)).in_subquery(comment_sub)),
            );
        }
    }
    condition
}
