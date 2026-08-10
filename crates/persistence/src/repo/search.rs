use super::*;

struct NativeSearchCandidates {
    ids: HashSet<i64>,
    source: NativeSearchCandidateSource,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum NativeSearchCandidateSource {
    DbNativeFts,
    FallbackScan,
}

impl NativeSearchCandidates {
    fn fallback_scan() -> Self {
        Self {
            ids: HashSet::new(),
            source: NativeSearchCandidateSource::FallbackScan,
        }
    }

    fn db_native(ids: HashSet<i64>) -> Self {
        Self {
            ids,
            source: NativeSearchCandidateSource::DbNativeFts,
        }
    }

    fn is_native_match(&self, id: i64) -> bool {
        self.source == NativeSearchCandidateSource::DbNativeFts && self.ids.contains(&id)
    }
}

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
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
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
        let candidates = self
            .search_native_text_candidates("issue", &["title", "body"], &input.keyword)
            .await?;
        let rows = issue::Entity::find()
            .order_by_desc(issue::Column::CreatedDate)
            .order_by_desc(issue::Column::Id)
            .all(&self.db)
            .await?;
        let mut ranked_items = Vec::new();
        for row in rows {
            let Some(project) = self.search_project_for_id(row.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(
                        &project,
                        input.actor_id,
                        row.author_id,
                        self.search_issue_assignee_user_id(row.assignee_id).await?,
                    )
                    .await?
            {
                continue;
            }

            let title = row.title.clone().unwrap_or_default();
            let body = self.read_text_column("issue", "body", row.id).await?;
            if !Self::search_text_matches(
                candidates.is_native_match(row.id),
                &[&title, &body],
                &input.keyword,
            ) {
                continue;
            }
            let snippets = self.search_snippets(&title, &body, &input.keyword);
            let score = relevance_score(&title, &body, &input.keyword);
            let ordinal = ranked_items.len();
            ranked_items.push((
                score,
                ordinal,
                SearchItemRecord {
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
                    updated_label: format_workspace_date_label(
                        row.updated_date.or(row.created_date),
                    ),
                },
            ));
        }
        Ok(finish_ranked_search_items(ranked_items))
    }

    pub(super) async fn search_user_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let candidates = self
            .search_native_text_candidates(
                "n4user",
                &["login_id", "name", "email", "english_name"],
                &input.keyword,
            )
            .await?;
        let scoped_user_ids = self.search_scope_user_ids(input).await?;
        let rows = n4user::Entity::find()
            .order_by_asc(n4user::Column::Name)
            .order_by_asc(n4user::Column::LoginId)
            .all(&self.db)
            .await?;
        let mut ranked_items = Vec::new();
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
            let english_name = row.english_name.clone().unwrap_or_default();
            if !Self::search_text_matches(
                candidates.is_native_match(row.id),
                &[
                    login_id.as_str(),
                    display_name.as_str(),
                    email.as_str(),
                    english_name.as_str(),
                ],
                &input.keyword,
            ) {
                continue;
            }
            let snippets = self.search_snippets(&display_name, &email, &input.keyword);
            let score = relevance_score(
                &display_name,
                &[login_id.as_str(), email.as_str(), english_name.as_str()].join(" "),
                &input.keyword,
            );
            let ordinal = ranked_items.len();
            ranked_items.push((
                score,
                ordinal,
                SearchItemRecord {
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
                },
            ));
        }
        Ok(finish_ranked_search_items(ranked_items))
    }

    pub(super) async fn search_project_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let candidates = self
            .search_native_text_candidates(
                "project",
                &["owner", "name", "overview"],
                &input.keyword,
            )
            .await?;
        let mut ranked_items = Vec::new();
        for project in self.list_projects().await? {
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_for_actor(&project, input.actor_id)
                    .await?
            {
                continue;
            }
            let title = format!("{}/{}", project.owner_name, project.project_name);
            let overview = project.overview.clone().unwrap_or_default();
            if !Self::search_text_matches(
                candidates.is_native_match(project.id),
                &[&title, &overview],
                &input.keyword,
            ) {
                continue;
            }
            let snippets = self.search_snippets(&title, &overview, &input.keyword);
            let score = relevance_score(&title, &overview, &input.keyword);
            let ordinal = ranked_items.len();
            let origin_project = if let Some(original_project_id) = project.original_project_id {
                self.read_project_by_id(original_project_id).await?
            } else {
                None
            };
            ranked_items.push((
                score,
                ordinal,
                SearchItemRecord {
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
                },
            ));
        }
        Ok(finish_ranked_search_items(ranked_items))
    }

    pub(super) async fn search_post_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let candidates = self
            .search_native_text_candidates("posting", &["title", "body"], &input.keyword)
            .await?;
        let rows = posting::Entity::find()
            .order_by_desc(posting::Column::CreatedDate)
            .order_by_desc(posting::Column::Id)
            .all(&self.db)
            .await?;
        let mut ranked_items = Vec::new();
        for row in rows {
            let Some(project) = self.search_project_for_id(row.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(&project, input.actor_id, row.author_id, None)
                    .await?
            {
                continue;
            }
            let title = row.title.clone().unwrap_or_default();
            let body = self.read_text_column("posting", "body", row.id).await?;
            if !Self::search_text_matches(
                candidates.is_native_match(row.id),
                &[&title, &body],
                &input.keyword,
            ) {
                continue;
            }
            let snippets = self.search_snippets(&title, &body, &input.keyword);
            let score = relevance_score(&title, &body, &input.keyword);
            let ordinal = ranked_items.len();
            ranked_items.push((
                score,
                ordinal,
                SearchItemRecord {
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
                    updated_label: format_workspace_date_label(
                        row.updated_date.or(row.created_date),
                    ),
                },
            ));
        }
        Ok(finish_ranked_search_items(ranked_items))
    }

    pub(super) async fn search_milestone_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let candidates = self
            .search_native_text_candidates("milestone", &["title", "contents"], &input.keyword)
            .await?;
        let rows = milestone::Entity::find()
            .order_by_desc(milestone::Column::DueDate)
            .order_by_desc(milestone::Column::Id)
            .all(&self.db)
            .await?;
        let mut ranked_items = Vec::new();
        for row in rows {
            let Some(project) = self.search_project_for_id(row.project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_for_actor(&project, input.actor_id)
                    .await?
            {
                continue;
            }
            let title = row.title.clone().unwrap_or_default();
            let contents = self
                .read_text_column("milestone", "contents", row.id)
                .await?;
            if !Self::search_text_matches(
                candidates.is_native_match(row.id),
                &[&title, &contents],
                &input.keyword,
            ) {
                continue;
            }
            let snippets = self.search_snippets(&title, &contents, &input.keyword);
            let score = relevance_score(&title, &contents, &input.keyword);
            let ordinal = ranked_items.len();
            ranked_items.push((
                score,
                ordinal,
                SearchItemRecord {
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
                },
            ));
        }
        Ok(finish_ranked_search_items(ranked_items))
    }

    pub(super) async fn search_issue_comment_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let candidates = self
            .search_native_text_candidates("issue_comment", &["contents"], &input.keyword)
            .await?;
        let rows = issue_comment::Entity::find()
            .order_by_desc(issue_comment::Column::CreatedDate)
            .order_by_desc(issue_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut ranked_items = Vec::new();
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
                    .search_project_visible_or_self(&project, input.actor_id, row.author_id, None)
                    .await?
            {
                continue;
            }
            let contents = self
                .read_text_column("issue_comment", "contents", row.id)
                .await?;
            if !Self::search_text_matches(
                candidates.is_native_match(row.id),
                &[&contents],
                &input.keyword,
            ) {
                continue;
            }
            let title = format!("Re) {}", issue.title.unwrap_or_default());
            let score = relevance_score("", &contents, &input.keyword);
            let ordinal = ranked_items.len();
            ranked_items.push((
                score,
                ordinal,
                SearchItemRecord {
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
                },
            ));
        }
        Ok(finish_ranked_search_items(ranked_items))
    }

    pub(super) async fn search_post_comment_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let candidates = self
            .search_native_text_candidates("posting_comment", &["contents"], &input.keyword)
            .await?;
        let rows = posting_comment::Entity::find()
            .order_by_desc(posting_comment::Column::CreatedDate)
            .order_by_desc(posting_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut ranked_items = Vec::new();
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
                    .search_project_visible_or_self(&project, input.actor_id, row.author_id, None)
                    .await?
            {
                continue;
            }
            let contents = self
                .read_text_column("posting_comment", "contents", row.id)
                .await?;
            if !Self::search_text_matches(
                candidates.is_native_match(row.id),
                &[&contents],
                &input.keyword,
            ) {
                continue;
            }
            let title = format!("Re) {}", posting.title.unwrap_or_default());
            let score = relevance_score("", &contents, &input.keyword);
            let ordinal = ranked_items.len();
            ranked_items.push((
                score,
                ordinal,
                SearchItemRecord {
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
                },
            ));
        }
        Ok(finish_ranked_search_items(ranked_items))
    }

    pub(super) async fn search_review_items(
        &self,
        input: &SearchRepositoryInput,
    ) -> Result<Vec<SearchItemRecord>, DbErr> {
        let candidates = self
            .search_native_text_candidates("review_comment", &["contents"], &input.keyword)
            .await?;
        let rows = review_comment::Entity::find()
            .order_by_desc(review_comment::Column::CreatedDate)
            .order_by_desc(review_comment::Column::Id)
            .all(&self.db)
            .await?;
        let mut ranked_items = Vec::new();
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
            let Some(pull_request_id) = thread.pull_request_id else {
                continue;
            };
            let Some(pull_request) = pull_request::Entity::find_by_id(pull_request_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            let project_id = thread.project_id.or(pull_request.to_project_id);
            let Some(project) = self.search_project_for_id(project_id).await? else {
                continue;
            };
            if !self.search_project_matches_scope(&project, input)
                || !self
                    .search_project_visible_or_self(&project, input.actor_id, row.author_id, None)
                    .await?
            {
                continue;
            }
            let contents = self
                .read_text_column("review_comment", "contents", row.id)
                .await?;
            let pull_title = pull_request.title.clone().unwrap_or_default();
            if !Self::search_text_matches(
                candidates.is_native_match(row.id),
                &[&contents, &pull_title],
                &input.keyword,
            ) {
                continue;
            }
            let snippets = self.search_snippets(&pull_title, &contents, &input.keyword);
            let score = relevance_score(&pull_title, &contents, &input.keyword);
            let ordinal = ranked_items.len();
            ranked_items.push((
                score,
                ordinal,
                SearchItemRecord {
                    author_label: row.author_name.unwrap_or_default(),
                    author_login_id: row.author_login_id.unwrap_or_default(),
                    avatar_url: String::new(),
                    created_label: format_workspace_date_label(row.created_date),
                    due_date_until_label: String::new(),
                    href: format!(
                        "/{}/{}/pullRequest/{}#comment-{}",
                        project.owner_name,
                        project.project_name,
                        pull_request.number.unwrap_or_default(),
                        row.id
                    ),
                    id: row.id.to_string(),
                    number: pull_request.number.unwrap_or_default().to_string(),
                    origin_owner_name: String::new(),
                    origin_project_name: String::new(),
                    owner_name: project.owner_name,
                    project_name: project.project_name,
                    project_logo_url: String::new(),
                    review_thread_on_pull_request: true,
                    snippets,
                    state: pull_request_state_from_raw(
                        pull_request.state,
                        pull_request.is_conflict,
                    ),
                    title: format!("Re) {pull_title}"),
                    r#type: "review".to_string(),
                    updated_label: String::new(),
                },
            ));
        }
        Ok(finish_ranked_search_items(ranked_items))
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
        actor_id: Option<i64>,
        author_id: Option<i64>,
        assignee_user_id: Option<i64>,
    ) -> Result<bool, DbErr> {
        if self
            .search_project_visible_for_actor(project, actor_id)
            .await?
        {
            return Ok(true);
        }
        Ok(actor_id.is_some_and(|actor_id| {
            author_id == Some(actor_id) || assignee_user_id == Some(actor_id)
        }))
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
                let mut user_ids = project_user::Entity::find()
                    .filter(project_user::Column::ProjectId.eq(Some(project.id)))
                    .all(&self.db)
                    .await?
                    .into_iter()
                    .filter_map(|row| row.user_id)
                    .collect::<HashSet<_>>();
                if let Some(organization_id) = project.organization_id {
                    user_ids.extend(
                        organization_user::Entity::find()
                            .filter(
                                organization_user::Column::OrganizationId.eq(Some(organization_id)),
                            )
                            .all(&self.db)
                            .await?
                            .into_iter()
                            .filter_map(|row| row.user_id),
                    );
                }
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

    fn search_text_matches(native_match: bool, values: &[&str], keyword: &str) -> bool {
        // Native FTS broadens candidate retrieval while the literal path preserves legacy icontains matches.
        let literal_match = values.iter().any(|value| keyword_matches(value, keyword));
        native_match || literal_match
    }

    async fn search_native_text_candidates(
        &self,
        table: &str,
        columns: &[&str],
        keyword: &str,
    ) -> Result<NativeSearchCandidates, DbErr> {
        if columns.is_empty() || keyword.trim().is_empty() {
            return Ok(NativeSearchCandidates::fallback_scan());
        }

        match self.db.get_database_backend() {
            DatabaseBackend::Sqlite => {
                self.search_sqlite_fts5_candidates(table, columns, keyword)
                    .await
            }
            DatabaseBackend::Postgres => {
                self.search_postgres_text_candidates(table, columns, keyword)
                    .await
            }
            DatabaseBackend::MySql => {
                self.search_mysql_fulltext_candidates(table, columns, keyword)
                    .await
            }
        }
    }

    async fn search_sqlite_fts5_candidates(
        &self,
        table: &str,
        columns: &[&str],
        keyword: &str,
    ) -> Result<NativeSearchCandidates, DbErr> {
        let backend = DatabaseBackend::Sqlite;
        let fts_table = persistent_sqlite_fts_table_name(table);
        let quoted_fts_table = quote_sql_identifier(backend, &fts_table);
        let fts_columns = columns
            .iter()
            .map(|column| quote_sql_identifier(backend, column))
            .collect::<Vec<_>>()
            .join(", ");
        let create_sql = format!(
            "CREATE VIRTUAL TABLE IF NOT EXISTS {quoted_fts_table} USING fts5({fts_columns}, content={}, content_rowid='id')",
            quote_sql_string(table)
        );
        if self
            .db
            .execute(Statement::from_string(backend, create_sql))
            .await
            .is_err()
        {
            return Ok(NativeSearchCandidates::fallback_scan());
        }

        if self
            .db
            .execute(Statement::from_string(
                backend,
                format!("INSERT INTO {quoted_fts_table}({quoted_fts_table}) VALUES ('rebuild')"),
            ))
            .await
            .is_err()
        {
            return Ok(NativeSearchCandidates::fallback_scan());
        }

        let query_sql =
            format!("SELECT rowid AS id FROM {quoted_fts_table} WHERE {quoted_fts_table} MATCH ?");
        self.search_candidate_ids_from_statement(
            backend,
            query_sql,
            vec![sqlite_fts_phrase(keyword).into()],
        )
        .await
    }

    async fn search_postgres_text_candidates(
        &self,
        table: &str,
        columns: &[&str],
        keyword: &str,
    ) -> Result<NativeSearchCandidates, DbErr> {
        let backend = DatabaseBackend::Postgres;
        let vector = columns
            .iter()
            .map(|column| format!("COALESCE({}, '')", quote_sql_identifier(backend, column)))
            .collect::<Vec<_>>()
            .join(" || ' ' || ");
        if self
            .db
            .execute(Statement::from_string(
                backend,
                postgres_fts_index_sql(table, columns, &vector),
            ))
            .await
            .is_err()
        {
            return Ok(NativeSearchCandidates::fallback_scan());
        }
        let sql = format!(
            "SELECT id FROM {} WHERE to_tsvector('simple', {vector}) @@ plainto_tsquery('simple', $1)",
            quote_sql_identifier(backend, table)
        );
        self.search_candidate_ids_from_statement(backend, sql, vec![keyword.to_string().into()])
            .await
    }

    async fn search_mysql_fulltext_candidates(
        &self,
        table: &str,
        columns: &[&str],
        keyword: &str,
    ) -> Result<NativeSearchCandidates, DbErr> {
        let backend = DatabaseBackend::MySql;
        if self
            .ensure_mysql_fulltext_index(table, columns)
            .await
            .is_err()
        {
            return Ok(NativeSearchCandidates::fallback_scan());
        }
        let column_list = columns
            .iter()
            .map(|column| quote_sql_identifier(backend, column))
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "SELECT id FROM {} WHERE MATCH ({column_list}) AGAINST (? IN NATURAL LANGUAGE MODE)",
            quote_sql_identifier(backend, table)
        );
        self.search_candidate_ids_from_statement(backend, sql, vec![keyword.to_string().into()])
            .await
    }

    async fn ensure_mysql_fulltext_index(
        &self,
        table: &str,
        columns: &[&str],
    ) -> Result<(), DbErr> {
        let backend = DatabaseBackend::MySql;
        let index_name = native_fts_index_name(table, columns);
        let rows = self
            .db
            .query_all(Statement::from_sql_and_values(
                backend,
                "SELECT index_name AS name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1".to_string(),
                vec![table.to_string().into(), index_name.clone().into()],
            ))
            .await?;
        if !rows.is_empty() {
            return Ok(());
        }

        self.db
            .execute(Statement::from_string(
                backend,
                mysql_fulltext_index_sql(table, columns),
            ))
            .await?;
        Ok(())
    }

    async fn search_candidate_ids_from_statement(
        &self,
        backend: DatabaseBackend,
        sql: String,
        values: Vec<sea_orm::Value>,
    ) -> Result<NativeSearchCandidates, DbErr> {
        let rows = match self
            .db
            .query_all(Statement::from_sql_and_values(backend, sql, values))
            .await
        {
            Ok(rows) => rows,
            Err(_) => return Ok(NativeSearchCandidates::fallback_scan()),
        };

        let mut ids = HashSet::new();
        for row in rows {
            if let Ok(id) = row.try_get::<i64>("", "id") {
                ids.insert(id);
            }
        }
        Ok(NativeSearchCandidates::db_native(ids))
    }
}

fn quote_sql_identifier(backend: DatabaseBackend, value: &str) -> String {
    let quote = match backend {
        DatabaseBackend::MySql => '`',
        DatabaseBackend::Postgres | DatabaseBackend::Sqlite => '"',
    };
    let escaped = value.replace(quote, &format!("{quote}{quote}"));
    format!("{quote}{escaped}{quote}")
}

fn persistent_sqlite_fts_table_name(table: &str) -> String {
    format!("yona_search_fts_{}", sanitize_sqlite_identifier_part(table))
}

fn sanitize_sqlite_identifier_part(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect()
}

fn quote_sql_string(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn sqlite_fts_phrase(keyword: &str) -> String {
    format!("\"{}\"", keyword.replace('"', "\"\""))
}

fn native_fts_index_name(table: &str, columns: &[&str]) -> String {
    let mut name = format!(
        "yona_search_ft_{}_{}",
        sanitize_sqlite_identifier_part(table),
        sanitize_sqlite_identifier_part(&columns.join("_"))
    );
    if name.len() > 60 {
        name.truncate(60);
    }
    name.trim_end_matches('_').to_string()
}

fn postgres_fts_index_sql(table: &str, columns: &[&str], vector: &str) -> String {
    let backend = DatabaseBackend::Postgres;
    format!(
        "CREATE INDEX IF NOT EXISTS {} ON {} USING GIN (to_tsvector('simple', {vector}))",
        quote_sql_identifier(backend, &native_fts_index_name(table, columns)),
        quote_sql_identifier(backend, table)
    )
}

fn mysql_fulltext_index_sql(table: &str, columns: &[&str]) -> String {
    let backend = DatabaseBackend::MySql;
    let column_list = columns
        .iter()
        .map(|column| quote_sql_identifier(backend, column))
        .collect::<Vec<_>>()
        .join(", ");
    format!(
        "ALTER TABLE {} ADD FULLTEXT INDEX {} ({column_list})",
        quote_sql_identifier(backend, table),
        quote_sql_identifier(backend, &native_fts_index_name(table, columns))
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{ConnectionTrait, Database, Statement};

    async fn sqlite_probe_repo() -> AppRepository {
        let db = Database::connect("sqlite::memory:")
            .await
            .expect("sqlite connection");
        db.execute(Statement::from_string(
            DatabaseBackend::Sqlite,
            "CREATE TABLE search_probe (id INTEGER PRIMARY KEY, title TEXT, body TEXT)".to_string(),
        ))
        .await
        .expect("create probe table");
        db.execute(Statement::from_string(
            DatabaseBackend::Sqlite,
            "INSERT INTO search_probe (id, title, body) VALUES (1, 'Native FTS title', 'body token'), (2, 'Other title', 'fallback-only CamelNeedle')".to_string(),
        ))
        .await
        .expect("insert probe rows");
        AppRepository::new(db)
    }

    #[tokio::test]
    async fn sqlite_fts5_candidate_lookup_uses_db_native_source_for_token_match() {
        let repo = sqlite_probe_repo().await;

        let candidates = repo
            .search_native_text_candidates("search_probe", &["title", "body"], "Native")
            .await
            .expect("candidate lookup");

        assert_eq!(candidates.source, NativeSearchCandidateSource::DbNativeFts);
        assert!(candidates.is_native_match(1));
        assert!(!candidates.is_native_match(2));
    }

    #[tokio::test]
    async fn sqlite_fts5_candidate_lookup_refreshes_persistent_index() {
        let repo = sqlite_probe_repo().await;

        let initial = repo
            .search_native_text_candidates("search_probe", &["title", "body"], "Native")
            .await
            .expect("initial candidate lookup");
        assert!(initial.is_native_match(1));

        repo.db
            .execute(Statement::from_string(
                DatabaseBackend::Sqlite,
                "UPDATE search_probe SET title = 'Updated title', body = 'updated body' WHERE id = 1"
                    .to_string(),
            ))
            .await
            .expect("update source row");

        let refreshed = repo
            .search_native_text_candidates("search_probe", &["title", "body"], "Native")
            .await
            .expect("refreshed candidate lookup");
        assert_eq!(refreshed.source, NativeSearchCandidateSource::DbNativeFts);
        assert!(!refreshed.is_native_match(1));

        repo.db
            .execute(Statement::from_string(
                DatabaseBackend::Sqlite,
                "DELETE FROM search_probe WHERE id = 2".to_string(),
            ))
            .await
            .expect("delete source row");

        let deleted = repo
            .search_native_text_candidates("search_probe", &["title", "body"], "CamelNeedle")
            .await
            .expect("deleted candidate lookup");
        assert_eq!(deleted.source, NativeSearchCandidateSource::DbNativeFts);
        assert!(!deleted.is_native_match(2));
    }

    #[tokio::test]
    async fn sqlite_fts5_candidate_lookup_falls_back_when_table_is_unavailable() {
        let repo = sqlite_probe_repo().await;

        let candidates = repo
            .search_native_text_candidates("missing_probe", &["title", "body"], "Native")
            .await
            .expect("candidate lookup");

        assert_eq!(candidates.source, NativeSearchCandidateSource::FallbackScan);
        assert!(!candidates.is_native_match(1));
    }

    #[test]
    fn sqlite_fts_phrase_escapes_user_quotes() {
        assert_eq!(
            sqlite_fts_phrase("a \"quoted\" value"),
            "\"a \"\"quoted\"\" value\""
        );
    }

    #[test]
    fn persistent_sqlite_fts_table_name_sanitizes_source_table() {
        assert_eq!(
            persistent_sqlite_fts_table_name("issue-comment"),
            "yona_search_fts_issue_comment"
        );
    }

    #[test]
    fn postgres_fts_index_sql_uses_db_native_gin_index() {
        let vector = "COALESCE(\"title\", '') || ' ' || COALESCE(\"body\", '')";

        assert_eq!(
            postgres_fts_index_sql("issue", &["title", "body"], vector),
            "CREATE INDEX IF NOT EXISTS \"yona_search_ft_issue_title_body\" ON \"issue\" USING GIN (to_tsvector('simple', COALESCE(\"title\", '') || ' ' || COALESCE(\"body\", '')))"
        );
    }

    #[test]
    fn mysql_fulltext_index_sql_uses_db_native_fulltext_index() {
        assert_eq!(
            mysql_fulltext_index_sql("posting_comment", &["contents"]),
            "ALTER TABLE `posting_comment` ADD FULLTEXT INDEX `yona_search_ft_posting_comment_contents` (`contents`)"
        );
    }

    #[test]
    fn search_text_matches_accepts_native_or_literal_candidates() {
        assert!(AppRepository::search_text_matches(
            true,
            &["unrelated"],
            "needle"
        ));
        assert!(AppRepository::search_text_matches(
            false,
            &["literal needle"],
            "needle"
        ));
        assert!(!AppRepository::search_text_matches(
            false,
            &["unrelated"],
            "needle"
        ));
    }
}
