use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn search_app(
        &self,
        input: SearchRepositoryInput,
    ) -> Result<Option<SearchResultRecord>, DbErr> {
        const PAGE_SIZE: u32 = 20;

        let context = match input.scope {
            SearchScope::Global => SearchContextRecord {
                organization_name: String::new(),
                owner_name: String::new(),
                project_name: String::new(),
            },
            SearchScope::Organization => {
                let organization_name = input.organization_name.clone().unwrap_or_default();
                let Some(organization) = self.read_organization_by_name(&organization_name).await?
                else {
                    return Ok(None);
                };
                SearchContextRecord {
                    organization_name: organization.organization_name,
                    owner_name: String::new(),
                    project_name: String::new(),
                }
            }
            SearchScope::Project => {
                let owner_name = input.owner_name.clone().unwrap_or_default();
                let project_name = input.project_name.clone().unwrap_or_default();
                let Some(project) = self
                    .read_project_by_owner_and_name(&owner_name, &project_name)
                    .await?
                else {
                    return Ok(None);
                };
                SearchContextRecord {
                    organization_name: project.organization_name.unwrap_or_default(),
                    owner_name: project.owner_name,
                    project_name: project.project_name,
                }
            }
        };

        let issues = self.search_issue_items(&input).await?;
        let users = self.search_user_items(&input).await?;
        let projects = if input.scope == SearchScope::Project {
            Vec::new()
        } else {
            self.search_project_items(&input).await?
        };
        let posts = self.search_post_items(&input).await?;
        let milestones = self.search_milestone_items(&input).await?;
        let issue_comments = self.search_issue_comment_items(&input).await?;
        let post_comments = self.search_post_comment_items(&input).await?;
        let reviews = self.search_review_items(&input).await?;

        let counts = SearchCountsRecord {
            issues: issues.len() as u32,
            users: users.len() as u32,
            projects: projects.len() as u32,
            posts: posts.len() as u32,
            milestones: milestones.len() as u32,
            issue_comments: issue_comments.len() as u32,
            post_comments: post_comments.len() as u32,
            reviews: reviews.len() as u32,
        };
        let resolved = resolve_search_type(
            SearchType::from_wire(&input.search_type).unwrap_or(SearchType::Issue),
            &SearchTypeCounts {
                issues: counts.issues,
                users: counts.users,
                projects: counts.projects,
                posts: counts.posts,
                milestones: counts.milestones,
                issue_comments: counts.issue_comments,
                post_comments: counts.post_comments,
                reviews: counts.reviews,
            },
            input.scope != SearchScope::Project,
        );
        let selected = match resolved {
            SearchType::Issue | SearchType::Auto => issues,
            SearchType::User => users,
            SearchType::Project => projects,
            SearchType::Post => posts,
            SearchType::Milestone => milestones,
            SearchType::IssueComment => issue_comments,
            SearchType::PostComment => post_comments,
            SearchType::Review => reviews,
        };
        let total_count = selected.len() as u32;
        let page_num = input.page_num.max(1);
        let offset =
            usize::try_from(u64::from(page_num - 1) * u64::from(PAGE_SIZE)).unwrap_or(usize::MAX);
        let items = selected
            .into_iter()
            .skip(offset)
            .take(PAGE_SIZE as usize)
            .collect();

        Ok(Some(SearchResultRecord {
            context,
            counts,
            items,
            keyword: input.keyword,
            page_num,
            page_size: PAGE_SIZE,
            requested_search_type: input.requested_search_type,
            scope: input.scope.as_str().to_string(),
            search_type: resolved.as_wire().to_string(),
            total_count,
        }))
    }

    pub(super) async fn search_issue_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = issue::Entity::find()
            .order_by_desc(issue::Column::CreatedDate)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(project) = self.search_project_for_id(row.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(
                        &project,
                        input,
                        row.author_id,
                        self.search_issue_assignee_user_id(row.assignee_id).await?,
                    )
                    .await?
            {
                continue;
            }

            let title = row.title.clone().unwrap_or_default();
            let body = self.read_text_column("issue", "body", row.id).await?;
            if !Self::search_text_matches(&[&title, &body], &input.keyword) {
                continue;
            }
            let snippets = self.search_snippets(&title, &body, &input.keyword);

            items.push(SearchItemRecord {
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                avatar_url: String::new(),
                created_label: format_workspace_date_label(row.created_date),
                due_date_until_label: String::new(),
                href: format!(
                    "/{}/{}/issue/{}",
                    project.owner_name,
                    project.project_name,
                    row.number.unwrap_or_default()
                ),
                id: row.id.to_string(),
                number: row.number.unwrap_or_default().to_string(),
                origin_owner_name: String::new(),
                origin_project_name: String::new(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                project_logo_url: String::new(),
                review_thread_on_pull_request: false,
                snippets,
                state: issue_state_from_raw(self.db.get_database_backend(), row.state),
                title,
                r#type: "issue".to_string(),
                updated_label: format_workspace_date_label(row.updated_date.or(row.created_date)),
            });
        }
        Ok(items)
    }

    pub(super) async fn search_user_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let scoped_user_ids = self.search_scope_user_ids(input).await?;
        let rows = n4user::Entity::find()
            .order_by_asc(n4user::Column::Name)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            if !n4user_is_active(&row) {
                continue;
            }
            if let Some(scoped_user_ids) = scoped_user_ids.as_ref() {
                if !scoped_user_ids.contains(&row.id) {
                    continue;
                }
            }
            let login_id = row.login_id.clone().unwrap_or_default();
            let display_name = row.name.clone().unwrap_or_else(|| login_id.clone());
            let email = row.email.clone().unwrap_or_default();
            if !Self::search_text_matches(&[&login_id, &display_name], &input.keyword) {
                continue;
            }
            let snippets = self.search_snippets(&display_name, &email, &input.keyword);

            items.push(SearchItemRecord {
                author_label: display_name.clone(),
                author_login_id: login_id.clone(),
                avatar_url: String::new(),
                created_label: format_workspace_date_label(row.created_date),
                due_date_until_label: String::new(),
                href: format!("/{login_id}"),
                id: row.id.to_string(),
                number: String::new(),
                origin_owner_name: String::new(),
                origin_project_name: String::new(),
                owner_name: String::new(),
                project_name: String::new(),
                project_logo_url: String::new(),
                review_thread_on_pull_request: false,
                snippets,
                state: row.state.unwrap_or_default(),
                title: display_name,
                r#type: "user".to_string(),
                updated_label: String::new(),
            });
        }
        Ok(items)
    }

    pub(super) async fn search_project_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let mut items = Vec::new();
        let project_ids = project::Entity::find()
            .select_only()
            .column(project::Column::Id)
            .order_by_asc(project::Column::Name)
            .into_tuple::<i64>()
            .all(&self.db)
            .await?;
        for project_id in project_ids {
            let Some(project) = self.read_project_by_id(project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_in_scope(&project, input)
                    .await?
            {
                continue;
            }
            let title = format!("{}/{}", project.owner_name, project.project_name);
            let overview = project.overview.clone().unwrap_or_default();
            if !Self::search_text_matches(&[&project.project_name, &overview], &input.keyword) {
                continue;
            }
            let snippets = self.search_snippets(&title, &overview, &input.keyword);

            let origin_project = if let Some(original_project_id) = project.original_project_id {
                self.read_project_by_id(original_project_id).await?
            } else {
                None
            };
            items.push(SearchItemRecord {
                author_label: project.owner_name.clone(),
                author_login_id: project.owner_name.clone(),
                avatar_url: String::new(),
                created_label: format_workspace_date_label(project.created_date),
                due_date_until_label: String::new(),
                href: format!("/{}/{}", project.owner_name, project.project_name),
                id: project.id.to_string(),
                number: String::new(),
                origin_owner_name: origin_project
                    .as_ref()
                    .map(|project| project.owner_name.clone())
                    .unwrap_or_default(),
                origin_project_name: origin_project
                    .as_ref()
                    .map(|project| project.project_name.clone())
                    .unwrap_or_default(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                project_logo_url: String::new(),
                review_thread_on_pull_request: false,
                snippets,
                state: project.project_scope,
                title,
                r#type: "project".to_string(),
                updated_label: format_workspace_date_label(project.last_pushed_date),
            });
        }
        Ok(items)
    }

    pub(super) async fn search_post_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = posting::Entity::find()
            .order_by_desc(posting::Column::CreatedDate)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(project) = self.search_project_for_id(row.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(&project, input, row.author_id, None)
                    .await?
            {
                continue;
            }
            let title = row.title.clone().unwrap_or_default();
            let body = self.read_text_column("posting", "body", row.id).await?;
            if !Self::search_text_matches(&[&title, &body], &input.keyword) {
                continue;
            }
            let snippets = self.search_snippets(&title, &body, &input.keyword);

            items.push(SearchItemRecord {
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                avatar_url: String::new(),
                created_label: format_workspace_date_label(row.created_date),
                due_date_until_label: String::new(),
                href: format!(
                    "/{}/{}/post/{}",
                    project.owner_name,
                    project.project_name,
                    row.number.unwrap_or_default()
                ),
                id: row.id.to_string(),
                number: row.number.unwrap_or_default().to_string(),
                origin_owner_name: String::new(),
                origin_project_name: String::new(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                project_logo_url: String::new(),
                review_thread_on_pull_request: false,
                snippets,
                state: String::new(),
                title,
                r#type: "post".to_string(),
                updated_label: format_workspace_date_label(row.updated_date.or(row.created_date)),
            });
        }
        Ok(items)
    }

    pub(super) async fn search_milestone_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = milestone::Entity::find()
            .order_by_desc(milestone::Column::DueDate)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(project) = self.search_project_for_id(row.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_in_scope(&project, input)
                    .await?
            {
                continue;
            }
            let title = row.title.clone().unwrap_or_default();
            let contents = self
                .read_text_column("milestone", "contents", row.id)
                .await?;
            if !Self::search_text_matches(&[&title, &contents], &input.keyword) {
                continue;
            }
            let snippets = self.search_snippets(&title, &contents, &input.keyword);

            items.push(SearchItemRecord {
                author_label: String::new(),
                author_login_id: String::new(),
                avatar_url: String::new(),
                created_label: String::new(),
                due_date_until_label: format_legacy_milestone_until_label(row.due_date),
                href: format!(
                    "/{}/{}/milestone/{}",
                    project.owner_name, project.project_name, row.id
                ),
                id: row.id.to_string(),
                number: row.id.to_string(),
                origin_owner_name: String::new(),
                origin_project_name: String::new(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                project_logo_url: String::new(),
                review_thread_on_pull_request: false,
                snippets,
                state: issue_state_from_raw(self.db.get_database_backend(), row.state),
                title,
                r#type: "milestone".to_string(),
                updated_label: format_workspace_date_label(row.due_date),
            });
        }
        Ok(items)
    }

    pub(super) async fn search_issue_comment_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = issue_comment::Entity::find()
            .order_by_desc(issue_comment::Column::CreatedDate)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(issue_id) = row.issue_id else {
                continue;
            };
            let Some(issue) = issue::Entity::find_by_id(issue_id).one(&self.db).await? else {
                continue;
            };
            let Some(project) = self.search_project_for_id(issue.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(&project, input, row.author_id, None)
                    .await?
            {
                continue;
            }
            let contents = self
                .read_text_column("issue_comment", "contents", row.id)
                .await?;
            if !Self::search_text_matches(&[&contents], &input.keyword) {
                continue;
            }
            let title = format!("Re) {}", issue.title.unwrap_or_default());

            items.push(SearchItemRecord {
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                avatar_url: String::new(),
                created_label: format_workspace_date_label(row.created_date),
                due_date_until_label: String::new(),
                href: format!(
                    "/{}/{}/issue/{}#comment-{}",
                    project.owner_name,
                    project.project_name,
                    issue.number.unwrap_or_default(),
                    row.id
                ),
                id: row.id.to_string(),
                number: issue.number.unwrap_or_default().to_string(),
                origin_owner_name: String::new(),
                origin_project_name: String::new(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                project_logo_url: String::new(),
                review_thread_on_pull_request: false,
                snippets: make_snippets(&contents, &input.keyword, 40),
                state: issue_state_from_raw(self.db.get_database_backend(), issue.state),
                title,
                r#type: "issue_comment".to_string(),
                updated_label: String::new(),
            });
        }
        Ok(items)
    }

    pub(super) async fn search_post_comment_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = posting_comment::Entity::find()
            .order_by_desc(posting_comment::Column::CreatedDate)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(posting_id) = row.posting_id else {
                continue;
            };
            let Some(posting) = posting::Entity::find_by_id(posting_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            let Some(project) = self.search_project_for_id(posting.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(&project, input, row.author_id, None)
                    .await?
            {
                continue;
            }
            let contents = self
                .read_text_column("posting_comment", "contents", row.id)
                .await?;
            if !Self::search_text_matches(&[&contents], &input.keyword) {
                continue;
            }
            let title = format!("Re) {}", posting.title.unwrap_or_default());

            items.push(SearchItemRecord {
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                avatar_url: String::new(),
                created_label: format_workspace_date_label(row.created_date),
                due_date_until_label: String::new(),
                href: format!(
                    "/{}/{}/post/{}#comment-{}",
                    project.owner_name,
                    project.project_name,
                    posting.number.unwrap_or_default(),
                    row.id
                ),
                id: row.id.to_string(),
                number: posting.number.unwrap_or_default().to_string(),
                origin_owner_name: String::new(),
                origin_project_name: String::new(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                project_logo_url: String::new(),
                review_thread_on_pull_request: false,
                snippets: make_snippets(&contents, &input.keyword, 40),
                state: String::new(),
                title,
                r#type: "post_comment".to_string(),
                updated_label: String::new(),
            });
        }
        Ok(items)
    }

    pub(super) async fn search_review_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let rows = review_comment::Entity::find()
            .order_by_desc(review_comment::Column::CreatedDate)
            .all(&self.db)
            .await?;
        let mut items = Vec::new();
        for row in rows {
            let Some(thread_id) = row.thread_id else {
                continue;
            };
            let Some(thread) = comment_thread::Entity::find_by_id(thread_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            let pull_request = match thread.pull_request_id {
                Some(id) => pull_request::Entity::find_by_id(id).one(&self.db).await?,
                None => None,
            };
            let project_id = thread.project_id;
            let Some(project) = self.search_project_for_id(project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(&project, input, row.author_id, None)
                    .await?
            {
                continue;
            }
            let contents = self
                .read_text_column("review_comment", "contents", row.id)
                .await?;
            if !Self::search_text_matches(&[&contents], &input.keyword) {
                continue;
            }
            let snippets = make_snippets(&contents, &input.keyword, 40);
            let (href, number, state, title) = if let Some(pull_request) = pull_request.as_ref() {
                (
                    format!(
                        "/{}/{}/pullRequest/{}#comment-{}",
                        project.owner_name,
                        project.project_name,
                        pull_request.number.unwrap_or_default(),
                        row.id
                    ),
                    pull_request.number.unwrap_or_default().to_string(),
                    pull_request_state_from_raw(pull_request.state, pull_request.is_conflict),
                    format!("Re) {}", pull_request.title.as_deref().unwrap_or_default()),
                )
            } else {
                (
                    format!(
                        "/{}/{}/commit/{}#thread-{}",
                        project.owner_name,
                        project.project_name,
                        thread.commit_id.as_deref().unwrap_or_default(),
                        thread.id
                    ),
                    String::new(),
                    String::new(),
                    String::new(),
                )
            };
            items.push(SearchItemRecord {
                author_label: row.author_name.unwrap_or_default(),
                author_login_id: row.author_login_id.unwrap_or_default(),
                avatar_url: String::new(),
                created_label: format_workspace_date_label(row.created_date),
                due_date_until_label: String::new(),
                href,
                id: row.id.to_string(),
                number,
                origin_owner_name: String::new(),
                origin_project_name: String::new(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                project_logo_url: String::new(),
                review_thread_on_pull_request: pull_request.is_some(),
                snippets,
                state,
                title,
                r#type: "review".to_string(),
                updated_label: String::new(),
            });
        }
        Ok(items)
    }

    pub(super) async fn search_project_for_id(
        &self,
        project_id: Option<i64>,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let Some(project_id) = project_id else {
            return Ok(None);
        };
        self.read_project_by_id(project_id).await
    }

    pub(super) async fn search_issue_assignee_user_id(
        &self,
        assignee_id: Option<i64>,
    ) -> Result<Option<i64>, DbErr> {
        let Some(assignee_id) = assignee_id else {
            return Ok(None);
        };
        Ok(assignee::Entity::find_by_id(assignee_id)
            .one(&self.db)
            .await?
            .and_then(|row| row.user_id))
    }

    pub(super) fn search_project_matches_scope(
        &self,
        project: &ProjectRecord,
        input: &SearchRepositoryInput,
    ) -> bool {
        match input.scope {
            SearchScope::Global => true,
            SearchScope::Organization => {
                input
                    .organization_name
                    .as_deref()
                    .is_some_and(|organization_name| {
                        project
                            .organization_name
                            .as_deref()
                            .is_some_and(|project_organization| {
                                normalize_identity(project_organization)
                                    == normalize_identity(organization_name)
                            })
                    })
            }
            SearchScope::Project => {
                let owner_matches = input.owner_name.as_deref().is_some_and(|owner_name| {
                    normalize_identity(&project.owner_name) == normalize_identity(owner_name)
                });
                let project_matches = input.project_name.as_deref().is_some_and(|project_name| {
                    normalize_identity(&project.project_name) == normalize_identity(project_name)
                });
                owner_matches && project_matches
            }
        }
    }

    pub(super) async fn search_project_visible_or_self(
        &self,
        project: &ProjectRecord,
        input: &SearchRepositoryInput,
        author_id: Option<i64>,
        assignee_user_id: Option<i64>,
    ) -> Result<bool, DbErr> {
        if self.search_project_visible_in_scope(project, input).await? {
            return Ok(true);
        }
        Ok(input.actor_id.is_some_and(|actor_id| {
            author_id == Some(actor_id) || assignee_user_id == Some(actor_id)
        }))
    }

    async fn search_project_visible_in_scope(
        &self,
        project: &ProjectRecord,
        input: &SearchRepositoryInput,
    ) -> Result<bool, DbErr> {
        if input.scope == SearchScope::Project {
            return self
                .search_project_visible_for_actor(project, input.actor_id)
                .await;
        }
        if project.project_scope == "public" {
            return Ok(true);
        }
        let Some(actor_id) = input.actor_id else {
            return Ok(false);
        };
        // Global/group Search.java uses membership, not the broader project READ admin grant.
        if project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(project.id))
            .filter(project_user::Column::UserId.eq(actor_id))
            .one(&self.db)
            .await?
            .is_some()
        {
            return Ok(true);
        }
        if project.project_scope == "protected" {
            if let Some(organization_id) = project.organization_id {
                return Ok(organization_user::Entity::find()
                    .filter(organization_user::Column::OrganizationId.eq(organization_id))
                    .filter(organization_user::Column::UserId.eq(actor_id))
                    .one(&self.db)
                    .await?
                    .is_some());
            }
        }
        Ok(false)
    }

    pub(super) async fn search_project_visible_for_actor(
        &self,
        project: &ProjectRecord,
        actor_id: Option<i64>,
    ) -> Result<bool, DbErr> {
        let project_scope = normalize_identity(&project.project_scope);
        if project_scope == "public" {
            return Ok(true);
        }
        let Some(actor_id) = actor_id else {
            return Ok(false);
        };
        let Some(authorization) = self
            .read_project_authorization(&project.owner_name, &project.project_name, Some(actor_id))
            .await?
        else {
            return Ok(false);
        };
        let viewer = authorization.viewer;
        if viewer.is_site_admin || viewer.is_organization_admin {
            return Ok(true);
        }
        if viewer.is_project_manager || viewer.is_project_member {
            return Ok(true);
        }
        Ok(project_scope == "protected" && viewer.is_organization_member)
    }

    pub(super) async fn search_scope_user_ids(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Option<HashSet<i64>>, DbErr> {
        match input.scope {
            SearchScope::Global => Ok(None),
            SearchScope::Organization => {
                let organization_name = input.organization_name.clone().unwrap_or_default();
                let Some(organization) = self.read_organization_by_name(&organization_name).await?
                else {
                    return Ok(Some(HashSet::new()));
                };
                let rows = organization_user::Entity::find()
                    .filter(organization_user::Column::OrganizationId.eq(Some(organization.id)))
                    .all(&self.db)
                    .await?;
                Ok(Some(
                    rows.into_iter().filter_map(|row| row.user_id).collect(),
                ))
            }
            SearchScope::Project => {
                let owner_name = input.owner_name.clone().unwrap_or_default();
                let project_name = input.project_name.clone().unwrap_or_default();
                let Some(project) = self
                    .read_project_by_owner_and_name(&owner_name, &project_name)
                    .await?
                else {
                    return Ok(Some(HashSet::new()));
                };
                let user_ids = project_user::Entity::find()
                    .filter(project_user::Column::ProjectId.eq(Some(project.id)))
                    .all(&self.db)
                    .await?
                    .into_iter()
                    .filter_map(|row| row.user_id)
                    .collect::<HashSet<_>>();
                Ok(Some(user_ids))
            }
        }
    }

    pub(super) fn search_snippets(
        &self,
        title: &str,
        body: &str,
        keyword: &str,
    ) -> Vec<SearchSnippet> {
        let title_snippets = make_snippets(title, keyword, 40);
        if !title_snippets.is_empty() {
            return title_snippets;
        }
        make_snippets(body, keyword, 40)
    }

    fn search_text_matches(values: &[&str], keyword: &str) -> bool {
        // Legacy icontains matches the complete keyword, not normalized FTS tokens.
        values.iter().any(|value| keyword_matches(value, keyword))
    }
}
