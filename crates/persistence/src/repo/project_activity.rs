use super::*;

impl AppRepositoryImpl<'_> {
    pub async fn count_open_issues_for_project(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw(
                self.db.get_database_backend(),
                "open",
            ))))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn count_unassigned_open_issues_for_project(
        &self,
        project_id: i64,
    ) -> Result<u32, DbErr> {
        Ok(issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw(
                self.db.get_database_backend(),
                "open",
            ))))
            .filter(issue::Column::AssigneeId.is_null())
            .count(&self.db)
            .await? as u32)
    }

    pub async fn list_project_dashboard_assignees(
        &self,
        project_id: i64,
    ) -> Result<Vec<ProjectDashboardAssigneeRecord>, DbErr> {
        let assignees = assignee::Entity::find()
            .filter(assignee::Column::ProjectId.eq(Some(project_id)))
            .order_by_asc(assignee::Column::Id)
            .all(&self.db)
            .await?;
        let mut records = Vec::new();
        for assignee in assignees {
            let open_issue_count = issue::Entity::find()
                .filter(issue::Column::ProjectId.eq(Some(project_id)))
                .filter(issue::Column::State.eq(Some(issue_state_to_raw(
                    self.db.get_database_backend(),
                    "open",
                ))))
                .filter(issue::Column::AssigneeId.eq(Some(assignee.id)))
                .count(&self.db)
                .await? as u32;
            if open_issue_count == 0 {
                continue;
            }
            let Some(user_id) = assignee.user_id else {
                continue;
            };
            let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
                continue;
            };
            records.push(ProjectDashboardAssigneeRecord {
                email_address: user.email.unwrap_or_default(),
                login_id: user.login_id.unwrap_or_default(),
                open_issue_count,
                user_id: user.id,
                user_label: user.name.unwrap_or_default(),
            });
        }
        Ok(records)
    }

    pub async fn list_project_dashboard_labels(
        &self,
        project_id: i64,
    ) -> Result<Vec<ProjectDashboardLabelRecord>, DbErr> {
        let labels = issue_label::Entity::find()
            .filter(issue_label::Column::ProjectId.eq(Some(project_id)))
            .order_by_asc(issue_label::Column::CategoryId)
            .order_by_asc(issue_label::Column::Name)
            .all(&self.db)
            .await?;
        let mut records = Vec::new();
        for label in labels {
            let issue_ids = issue_issue_label::Entity::find()
                .filter(issue_issue_label::Column::IssueLabelId.eq(label.id))
                .all(&self.db)
                .await?
                .into_iter()
                .map(|link| link.issue_id)
                .collect::<Vec<_>>();
            let open_issue_count = if issue_ids.is_empty() {
                0
            } else {
                issue::Entity::find()
                    .filter(issue::Column::Id.is_in(issue_ids))
                    .filter(issue::Column::ProjectId.eq(Some(project_id)))
                    .filter(issue::Column::State.eq(Some(issue_state_to_raw(
                        self.db.get_database_backend(),
                        "open",
                    ))))
                    .count(&self.db)
                    .await? as u32
            };
            let record = self.issue_label_record(label).await?;
            records.push(ProjectDashboardLabelRecord {
                category_id: record.category_id,
                category_is_exclusive: record.category_is_exclusive,
                category_name: record.category_name,
                color: record.color,
                id: record.id,
                name: record.name,
                open_issue_count,
            });
        }
        Ok(records)
    }

    pub async fn count_open_pull_requests_for_project(
        &self,
        project_id: i64,
    ) -> Result<u32, DbErr> {
        Ok(pull_request::Entity::find()
            .filter(pull_request::Column::ToProjectId.eq(Some(project_id)))
            .filter(pull_request_open_condition())
            .count(&self.db)
            .await? as u32)
    }

    pub async fn count_project_reviews(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(comment_thread::Entity::find()
            .filter(comment_thread::Column::ProjectId.eq(Some(project_id)))
            .filter(review_thread_open_condition())
            .count(&self.db)
            .await? as u32)
    }

    pub async fn count_project_boards(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_id)))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn read_current_milestone_for_project(
        &self,
        project_id: i64,
    ) -> Result<Option<ProjectMilestoneSummaryRecord>, DbErr> {
        let Some(row) = milestone::Entity::find()
            .filter(milestone::Column::ProjectId.eq(Some(project_id)))
            .filter(milestone::Column::State.eq(Some(issue_state_to_raw(
                self.db.get_database_backend(),
                "open",
            ))))
            .order_by_asc(milestone::Column::DueDate)
            .order_by_asc(milestone::Column::Id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };

        let open_issue_count = issue::Entity::find()
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw(
                self.db.get_database_backend(),
                "open",
            ))))
            .count(&self.db)
            .await? as u32;
        let closed_issue_count = issue::Entity::find()
            .filter(issue::Column::MilestoneId.eq(Some(row.id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw(
                self.db.get_database_backend(),
                "closed",
            ))))
            .count(&self.db)
            .await? as u32;
        let total = open_issue_count + closed_issue_count;
        let completion_percent = if total == 0 {
            0
        } else {
            closed_issue_count.saturating_mul(100) / total
        };

        Ok(Some(ProjectMilestoneSummaryRecord {
            closed_issue_count,
            completion_percent,
            due_date: row.due_date,
            due_date_label: format_workspace_date_label(row.due_date),
            id: row.id,
            open_issue_count,
            state: issue_state_from_raw(self.db.get_database_backend(), row.state),
            title: row.title.unwrap_or_default(),
        }))
    }

    pub async fn list_project_dashboard_open_milestones(
        &self,
        project_id: i64,
    ) -> Result<Vec<ProjectDashboardMilestoneRecord>, DbErr> {
        let rows = milestone::Entity::find()
            .filter(milestone::Column::ProjectId.eq(Some(project_id)))
            .filter(
                Condition::any()
                    .add(milestone::Column::State.ne(Some(1)))
                    .add(milestone::Column::State.is_null()),
            )
            .order_by_asc(milestone::Column::DueDate)
            .order_by_asc(milestone::Column::Id)
            .all(&self.db)
            .await?;
        let mut records = Vec::new();
        for row in rows {
            let open_issue_count = issue::Entity::find()
                .filter(issue::Column::ProjectId.eq(Some(project_id)))
                .filter(issue::Column::MilestoneId.eq(Some(row.id)))
                .filter(issue::Column::State.eq(Some(issue_state_to_raw(
                    self.db.get_database_backend(),
                    "open",
                ))))
                .count(&self.db)
                .await? as u32;
            let closed_issue_count = issue::Entity::find()
                .filter(issue::Column::ProjectId.eq(Some(project_id)))
                .filter(issue::Column::MilestoneId.eq(Some(row.id)))
                .filter(issue::Column::State.ne(Some(issue_state_to_raw(
                    self.db.get_database_backend(),
                    "open",
                ))))
                .count(&self.db)
                .await? as u32;
            let total = open_issue_count + closed_issue_count;
            let completion_percent = if total == 0 {
                0
            } else {
                closed_issue_count.saturating_mul(100) / total
            };
            records.push(ProjectDashboardMilestoneRecord {
                closed_issue_count,
                completion_percent,
                id: row.id,
                open_issue_count,
                title: row.title.unwrap_or_default(),
            });
        }
        Ok(records)
    }

    pub async fn count_no_milestone_open_issues_for_project(
        &self,
        project_id: i64,
    ) -> Result<u32, DbErr> {
        Ok(issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(Some(project_id)))
            .filter(issue::Column::State.eq(Some(issue_state_to_raw(
                self.db.get_database_backend(),
                "open",
            ))))
            .filter(issue::Column::MilestoneId.is_null())
            .count(&self.db)
            .await? as u32)
    }

    pub async fn list_project_dashboard_pull_requests(
        &self,
        project_id: i64,
        limit: u64,
    ) -> Result<Vec<ProjectDashboardPullRequestRecord>, DbErr> {
        let rows = pull_request::Entity::find()
            .filter(pull_request::Column::ToProjectId.eq(Some(project_id)))
            .filter(pull_request_open_condition())
            .order_by_desc(pull_request::Column::Created)
            .order_by_desc(pull_request::Column::Id)
            .limit(limit)
            .all(&self.db)
            .await?;
        let mut records = Vec::new();
        for row in rows {
            let contributor = self.user_record_for_optional_id(row.contributor_id).await?;
            records.push(ProjectDashboardPullRequestRecord {
                contributor_email_address: contributor.email_address,
                contributor_login_id: contributor.login_id,
                contributor_user_id: contributor.user_id,
                contributor_user_label: contributor.user_label,
                created_label: format_workspace_date_label(row.created),
                pull_request_number: row.number.unwrap_or_default(),
                title: row.title.unwrap_or_default(),
            });
        }
        Ok(records)
    }

    pub async fn create_project_enrollment_request(
        &self,
        project_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        if user_enrolled_project::Entity::find_by_id((user_id, project_id))
            .one(&self.db)
            .await?
            .is_none()
        {
            user_enrolled_project::ActiveModel {
                user_id: Set(user_id),
                project_id: Set(project_id),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(())
    }

    pub async fn delete_project_enrollment_request(
        &self,
        project_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        user_enrolled_project::Entity::delete_by_id((user_id, project_id))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn toggle_favorite_project(
        &self,
        user_id: i64,
        owner_name: &str,
        project_name: &str,
    ) -> Result<ToggleFavoriteProjectResult, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Err(DbErr::Custom("Project not found.".to_string()));
        };

        let txn = self.db.begin().await?;
        let favorited = if let Some(existing) = favorite_project::Entity::find()
            .filter(favorite_project::Column::UserId.eq(Some(user_id)))
            .filter(favorite_project::Column::ProjectId.eq(Some(project.id)))
            .one(&txn)
            .await?
        {
            favorite_project::Entity::delete_by_id(existing.id)
                .exec(&txn)
                .await?;
            recent_project::Entity::delete_many()
                .filter(recent_project::Column::UserId.eq(Some(user_id)))
                .filter(recent_project::Column::ProjectId.eq(Some(project.id)))
                .exec(&txn)
                .await?;
            false
        } else {
            favorite_project::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                project_id: Set(Some(project.id)),
                owner: Set(Some(project.owner_name.clone())),
                project_name: Set(Some(project.project_name.clone())),
            }
            .insert(&txn)
            .await?;
            true
        };
        txn.commit().await?;

        Ok(ToggleFavoriteProjectResult {
            favorited,
            owner_name: project.owner_name,
            project_name: project.project_name,
        })
    }

    pub async fn record_recent_project_visit(
        &self,
        user_id: i64,
        owner_name: &str,
        project_name: &str,
    ) -> Result<ProjectListEntry, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Err(DbErr::Custom("Project not found.".to_string()));
        };

        if let Some(existing) = recent_project::Entity::find()
            .filter(recent_project::Column::UserId.eq(Some(user_id)))
            .filter(recent_project::Column::ProjectId.eq(Some(project.id)))
            .one(&self.db)
            .await?
        {
            recent_project::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
        }

        recent_project::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            owner: Set(Some(project.owner_name.clone())),
            project_id: Set(Some(project.id)),
            project_name: Set(Some(project.project_name.clone())),
        }
        .insert(&self.db)
        .await?;

        Ok(ProjectListEntry {
            owner_name: project.owner_name,
            project_name: project.project_name,
        })
    }

    pub async fn list_favorite_projects_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<ProjectListEntry>, DbErr> {
        Ok(self
            .list_legacy_favorite_projects_for_user(user_id)
            .await?
            .into_iter()
            .map(|(_, owner_name, project_name)| ProjectListEntry {
                owner_name,
                project_name,
            })
            .collect())
    }

    pub async fn list_legacy_favorite_projects_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<(i64, String, String)>, DbErr> {
        let rows = favorite_project::Entity::find()
            .filter(favorite_project::Column::UserId.eq(Some(user_id)))
            .order_by_desc(favorite_project::Column::Id)
            .all(&self.db)
            .await?;
        let project_rows = project::Entity::find()
            .filter(project::Column::Id.is_in(rows.iter().filter_map(|row| row.project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| (row.id, row))
            .collect::<HashMap<_, _>>();
        let mut projects = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };

            let project_row = project_rows.get(&project_id);
            let owner_name = row
                .owner
                .or_else(|| project_row.and_then(|item| item.owner.clone()));
            let project_name = row
                .project_name
                .or_else(|| project_row.and_then(|item| item.name.clone()));
            if let (Some(owner_name), Some(project_name)) = (owner_name, project_name) {
                projects.push((project_id, owner_name, project_name));
            }
        }
        Ok(projects)
    }

    pub async fn list_favorite_organization_ids_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<i64>, DbErr> {
        Ok(favorite_organization::Entity::find()
            .filter(favorite_organization::Column::UserId.eq(Some(user_id)))
            .order_by_desc(favorite_organization::Column::Id)
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.organization_id)
            .collect())
    }

    pub async fn list_favorite_project_ids_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<i64>, DbErr> {
        Ok(favorite_project::Entity::find()
            .filter(favorite_project::Column::UserId.eq(Some(user_id)))
            .order_by_desc(favorite_project::Column::Id)
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.project_id)
            .collect())
    }

    pub async fn list_recent_project_ids_for_user(&self, user_id: i64) -> Result<Vec<i64>, DbErr> {
        Ok(recent_project::Entity::find()
            .filter(recent_project::Column::UserId.eq(Some(user_id)))
            .order_by_desc(recent_project::Column::Id)
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.project_id)
            .collect())
    }

    pub async fn list_member_project_ids_for_user(&self, user_id: i64) -> Result<Vec<i64>, DbErr> {
        Ok(project_user::Entity::find()
            .filter(project_user::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| row.project_id)
            .collect())
    }

    pub async fn list_recent_projects_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<ProjectListEntry>, DbErr> {
        let rows = recent_project::Entity::find()
            .filter(recent_project::Column::UserId.eq(Some(user_id)))
            .order_by_desc(recent_project::Column::Id)
            .all(&self.db)
            .await?;
        let project_rows = project::Entity::find()
            .filter(project::Column::Id.is_in(rows.iter().filter_map(|row| row.project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| (row.id, row))
            .collect::<HashMap<_, _>>();
        let mut projects = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };

            let project_row = project_rows.get(&project_id);
            let owner_name = row
                .owner
                .or_else(|| project_row.and_then(|item| item.owner.clone()));
            let project_name = row
                .project_name
                .or_else(|| project_row.and_then(|item| item.name.clone()));
            if let (Some(owner_name), Some(project_name)) = (owner_name, project_name) {
                projects.push(ProjectListEntry {
                    owner_name,
                    project_name,
                });
            }
        }
        Ok(projects)
    }

    pub async fn read_workspace_profile_for_user(
        &self,
        user_id: i64,
    ) -> Result<Option<WorkspaceProfileRecord>, DbErr> {
        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Ok(None);
        };
        let is_site_admin = site_admin::Entity::find()
            .filter(site_admin::Column::AdminId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_some();

        Ok(Some(WorkspaceProfileRecord {
            connected_social_providers: self
                .list_connected_social_providers_for_user(user_id)
                .await?,
            display_name: user.name.unwrap_or_default(),
            english_name: user.english_name.unwrap_or_default(),
            is_blocked: normalize_optional(user.state.as_deref()).as_deref() == Some("locked"),
            is_guest: user.is_guest.unwrap_or_default() != 0,
            is_site_admin,
            login_id: user.login_id.unwrap_or_default(),
            primary_email_address: user.email.unwrap_or_default(),
            since_label: user
                .created_date
                .map(|value| value.format("%b %d, %Y").to_string())
                .unwrap_or_default(),
        }))
    }

    pub async fn list_workspace_project_catalog(
        &self,
        project_ids: &[i64],
        owner_name: Option<&str>,
        organization_ids: &[i64],
    ) -> Result<Vec<ProjectRecord>, DbErr> {
        let owner_name = owner_name
            .map(normalize_identity)
            .filter(|owner_name| !owner_name.is_empty());
        if project_ids.is_empty() && owner_name.is_none() && organization_ids.is_empty() {
            return Ok(Vec::new());
        }

        let mut scope = Condition::any();
        if !project_ids.is_empty() {
            scope = scope.add(project::Column::Id.is_in(project_ids.iter().copied()));
        }
        if let Some(owner_name) = owner_name {
            scope = scope.add(
                Expr::expr(sea_orm::sea_query::Func::lower(Expr::col(
                    project::Column::Owner,
                )))
                .eq(owner_name),
            );
        }
        if !organization_ids.is_empty() {
            scope = scope.add(
                project::Column::OrganizationId.is_in(organization_ids.iter().copied().map(Some)),
            );
        }

        let rows = project::Entity::find().filter(scope).all(&self.db).await?;
        let mut projects = Vec::with_capacity(rows.len());
        for row in rows {
            let owner_name = row.owner.unwrap_or_default();
            let project_name = row.name.unwrap_or_default();
            if owner_name.is_empty() || project_name.is_empty() {
                continue;
            }
            projects.push(ProjectRecord {
                created_date: row.created_date,
                default_reviewer_count: row.default_reviewer_count.unwrap_or_default().max(0)
                    as u32,
                is_code_accessible_member_only: row
                    .is_code_accessible_member_only
                    .unwrap_or_default()
                    != 0,
                is_using_reviewer_count: row.is_using_reviewer_count.unwrap_or_default() != 0,
                last_pushed_date: row.last_pushed_date,
                id: row.id,
                original_project_id: row.original_project_id,
                organization_id: row.organization_id,
                organization_name: row.organization_id.map(|_| owner_name.clone()),
                owner_name,
                overview: row.overview,
                previous_owner_name: row.previous_owner_login_id,
                previous_project_name: row.previous_name,
                project_name,
                project_scope: row.project_scope.unwrap_or_else(|| "public".to_string()),
                vcs: row.vcs.unwrap_or_else(|| "GIT".to_string()),
            });
        }
        Ok(projects)
    }

    pub async fn list_workspace_organizations_for_user(
        &self,
        user_id: i64,
        organization_ids: &[i64],
    ) -> Result<Vec<(OrganizationRecord, String)>, DbErr> {
        if organization_ids.is_empty() {
            return Ok(Vec::new());
        }

        let organizations = organization::Entity::find()
            .filter(organization::Column::Id.is_in(organization_ids.iter().copied()))
            .all(&self.db)
            .await?;
        let memberships = organization_user::Entity::find()
            .filter(organization_user::Column::UserId.eq(Some(user_id)))
            .filter(
                organization_user::Column::OrganizationId
                    .is_in(organization_ids.iter().copied().map(Some)),
            )
            .all(&self.db)
            .await?;
        let role_names = role::Entity::find()
            .filter(
                role::Column::Id.is_in(
                    memberships
                        .iter()
                        .filter_map(|membership| membership.role_id),
                ),
            )
            .all(&self.db)
            .await?
            .into_iter()
            .map(|role| (role.id, role.name.unwrap_or_default()))
            .collect::<HashMap<_, _>>();
        let mut role_names_by_organization = memberships
            .into_iter()
            .filter_map(|membership| {
                Some((
                    membership.organization_id?,
                    role_names
                        .get(&membership.role_id?)
                        .cloned()
                        .unwrap_or_default(),
                ))
            })
            .collect::<HashMap<_, _>>();

        Ok(organizations
            .into_iter()
            .filter_map(|organization| self.organization_record_from_model(organization))
            .map(|organization| {
                let role_name = role_names_by_organization
                    .remove(&organization.id)
                    .unwrap_or_default();
                (organization, role_name)
            })
            .collect())
    }

    pub async fn list_member_projects_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<WorkspaceMemberProjectRecord>, DbErr> {
        let memberships = project_user::Entity::find()
            .filter(project_user::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;
        let project_ids = memberships
            .into_iter()
            .filter_map(|membership| membership.project_id)
            .collect::<HashSet<_>>();
        if project_ids.is_empty() {
            return Ok(Vec::new());
        }

        // Keep the legacy ordering below, but load the member project catalog in
        // sets. The previous implementation performed one project lookup,
        // organization lookup, member count, watch count, and fork-origin lookup
        // per membership row.
        let mut project_models = project::Entity::find()
            .filter(project::Column::Id.is_in(project_ids.iter().copied()))
            .all(&self.db)
            .await?;
        let organization_ids = project_models
            .iter()
            .filter_map(|model| model.organization_id)
            .collect::<HashSet<_>>();
        let organization_names = if organization_ids.is_empty() {
            HashMap::new()
        } else {
            organization::Entity::find()
                .filter(organization::Column::Id.is_in(organization_ids.iter().copied()))
                .all(&self.db)
                .await?
                .into_iter()
                .filter_map(|model| model.name.map(|name| (model.id, name)))
                .collect::<HashMap<_, _>>()
        };
        let member_counts = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.is_in(project_ids.iter().copied().map(Some)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|membership| membership.project_id)
            .fold(HashMap::<i64, u32>::new(), |mut counts, project_id| {
                *counts.entry(project_id).or_default() += 1;
                counts
            });
        let project_resource_ids = project_ids
            .iter()
            .map(|project_id| project_id.to_string())
            .collect::<HashSet<_>>();
        let watch_counts = watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.is_in(project_resource_ids.iter().cloned().map(Some)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|watch| watch.resource_id)
            .fold(HashMap::<String, u32>::new(), |mut counts, resource_id| {
                *counts.entry(resource_id).or_default() += 1;
                counts
            });
        let origin_ids = project_models
            .iter()
            .filter_map(|model| model.original_project_id)
            .collect::<HashSet<_>>();
        let origin_names = if origin_ids.is_empty() {
            HashMap::new()
        } else {
            project::Entity::find()
                .filter(project::Column::Id.is_in(origin_ids.iter().copied()))
                .all(&self.db)
                .await?
                .into_iter()
                .filter_map(|model| Some((model.id, (model.owner?, model.name?))))
                .collect::<HashMap<_, _>>()
        };

        project_models.sort_by(|left, right| {
            let left_name = left.name.clone().unwrap_or_default();
            let right_name = right.name.clone().unwrap_or_default();
            let left_owner = left.owner.clone().unwrap_or_default();
            let right_owner = right.owner.clone().unwrap_or_default();

            match (
                left.last_pushed_date.clone(),
                right.last_pushed_date.clone(),
            ) {
                (Some(left_date), Some(right_date)) => right_date
                    .cmp(&left_date)
                    .then_with(|| left_name.cmp(&right_name))
                    .then_with(|| left_owner.cmp(&right_owner)),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => left_name
                    .cmp(&right_name)
                    .then_with(|| left_owner.cmp(&right_owner)),
            }
        });

        let mut projects = Vec::new();
        for project_model in project_models {
            if let Some(record) = self.project_record_from_model_with_organization_name(
                project_model.clone(),
                project_model
                    .organization_id
                    .and_then(|organization_id| organization_names.get(&organization_id).cloned()),
            ) {
                let (origin_owner_name, origin_project_name) = project_model
                    .original_project_id
                    .and_then(|origin_id| origin_names.get(&origin_id).cloned())
                    .unwrap_or_default();

                projects.push(WorkspaceMemberProjectRecord {
                    created_at: project_model.created_date,
                    last_pushed_at: project_model.last_pushed_date,
                    member_count: member_counts
                        .get(&project_model.id)
                        .copied()
                        .unwrap_or_default(),
                    origin_owner_name,
                    origin_project_name,
                    owner_name: record.owner_name,
                    overview: record.overview.unwrap_or_default(),
                    project_id: project_model.id,
                    project_name: record.project_name,
                    project_scope: record.project_scope,
                    watch_count: watch_counts
                        .get(&project_model.id.to_string())
                        .copied()
                        .unwrap_or_default(),
                });
            }
        }

        Ok(projects)
    }

    pub async fn list_recent_workspace_issues_for_user(
        &self,
        user_id: i64,
        days_ago: u64,
    ) -> Result<Vec<WorkspaceIssueListItemRecord>, DbErr> {
        let cutoff = days_ago_datetime(days_ago);
        let assignee_ids: Vec<i64> = assignee::Entity::find()
            .filter(assignee::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect();

        let mut filter = Condition::any().add(issue::Column::AuthorId.eq(Some(user_id)));
        for assignee_id in assignee_ids {
            filter = filter.add(issue::Column::AssigneeId.eq(Some(assignee_id)));
        }

        let rows = issue::Entity::find()
            .filter(filter)
            .filter(issue::Column::UpdatedDate.gte(cutoff))
            .order_by_desc(issue::Column::UpdatedDate)
            .order_by_asc(issue::Column::State)
            .all(&self.db)
            .await?;

        let mut issues = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };
            let Some(project_record) = self.read_project_by_id(project_id).await? else {
                continue;
            };
            let Some(issue_number) = row.number else {
                continue;
            };
            let author_login_id = row.author_login_id.unwrap_or_default();
            let author_label = row.author_name.unwrap_or_default();
            let labels = self.list_issue_labels(row.id).await?;
            let due_date = row.due_date;
            let (milestone_id, milestone_title) =
                self.issue_milestone_summary(row.milestone_id).await?;
            let (parent_issue_number, parent_issue_title) =
                self.issue_parent_summary(row.parent_id).await?;
            let child_group_issue_id = row.parent_id.unwrap_or(row.id);
            let child_issues = self
                .list_issue_child_records(child_group_issue_id, &author_login_id)
                .await?;
            let direct_child_issues = self
                .list_issue_child_records(row.id, &author_login_id)
                .await?;
            let child_open_count = direct_child_issues
                .iter()
                .filter(|child| child.state == "open")
                .count() as u32;
            let child_closed_count = direct_child_issues
                .iter()
                .filter(|child| child.state == "closed")
                .count() as u32;
            let (assignee_login_id, assignee_label) = match row.assignee_id {
                Some(assignee_id) => {
                    let assignee_user_id = assignee::Entity::find_by_id(assignee_id)
                        .one(&self.db)
                        .await?
                        .and_then(|model| model.user_id);
                    match assignee_user_id {
                        Some(user_id) => self
                            .find_user_by_id(user_id)
                            .await?
                            .map(|user| (user.login_id, user.display_name))
                            .unwrap_or_default(),
                        None => (String::new(), String::new()),
                    }
                }
                None => (String::new(), String::new()),
            };

            issues.push(WorkspaceIssueListItemRecord {
                assignee_label,
                assignee_login_id,
                author_label,
                author_login_id,
                child_closed_count,
                child_issues,
                child_open_count,
                comment_count: row.num_of_comments.unwrap_or_default() as u32,
                due_date_label: format_workspace_date_label(due_date),
                due_date_overdue: due_date
                    .is_some_and(|value| value < DateTimeUtc::from(SystemTime::now()).naive_utc()),
                due_date_text: format_legacy_issue_until_label(due_date),
                issue_number,
                labels,
                milestone_id,
                milestone_title,
                owner_name: project_record.owner_name,
                parent_issue_number,
                parent_issue_title,
                project_name: project_record.project_name,
                state: issue_state_from_raw(self.db.get_database_backend(), row.state),
                title: row.title.unwrap_or_default(),
                updated_label: format_workspace_date_label(row.updated_date.or(row.created_date)),
            });
        }

        Ok(issues)
    }

    pub async fn list_recent_workspace_pull_requests_for_user(
        &self,
        user_id: i64,
        days_ago: u64,
    ) -> Result<Vec<WorkspacePullRequestListItemRecord>, DbErr> {
        let cutoff = days_ago_datetime(days_ago);
        let rows = pull_request::Entity::find()
            .filter(pull_request::Column::ContributorId.eq(Some(user_id)))
            .filter(pull_request::Column::Updated.gte(cutoff))
            .order_by_desc(pull_request::Column::Updated)
            .order_by_asc(pull_request::Column::State)
            .order_by_desc(pull_request::Column::Created)
            .all(&self.db)
            .await?;

        let mut pull_requests = Vec::new();
        for row in rows {
            let Some(project_id) = row.to_project_id else {
                continue;
            };
            let Some(project_record) = self.read_project_by_id(project_id).await? else {
                continue;
            };
            let Some(pull_request_number) = row.number else {
                continue;
            };
            let (contributor_login_id, contributor_label) = match row.contributor_id {
                Some(contributor_id) => self
                    .find_user_by_id(contributor_id)
                    .await?
                    .map(|user| (user.login_id, user.display_name))
                    .unwrap_or_default(),
                None => (String::new(), String::new()),
            };
            let (receiver_login_id, receiver_label) = match row.receiver_id {
                Some(receiver_id) => self
                    .find_user_by_id(receiver_id)
                    .await?
                    .map(|user| (user.login_id, user.display_name))
                    .unwrap_or_default(),
                None => (String::new(), String::new()),
            };
            let comment_count = comment_thread::Entity::find()
                .filter(comment_thread::Column::PullRequestId.eq(Some(row.id)))
                .count(&self.db)
                .await? as u32;

            pull_requests.push(WorkspacePullRequestListItemRecord {
                comment_count,
                contributor_label,
                contributor_login_id,
                owner_name: project_record.owner_name,
                project_name: project_record.project_name,
                pull_request_number,
                receiver_label,
                receiver_login_id,
                state: pull_request_state_from_raw(row.state, row.is_conflict),
                title: row.title.unwrap_or_default(),
                updated_label: format_workspace_date_label(row.updated.or(row.created)),
            });
        }

        Ok(pull_requests)
    }

    pub async fn read_user_statistics(&self, user_id: i64) -> Result<UserStatisticsRecord, DbErr> {
        let issue = issue::Entity::find()
            .filter(issue::Column::AuthorId.eq(Some(user_id)))
            .count(&self.db)
            .await? as u32;
        let posting = posting::Entity::find()
            .filter(posting::Column::AuthorId.eq(Some(user_id)))
            .count(&self.db)
            .await? as u32;
        let issue_comment = issue_comment::Entity::find()
            .filter(issue_comment::Column::AuthorId.eq(Some(user_id)))
            .count(&self.db)
            .await? as u32;
        let posting_comment = posting_comment::Entity::find()
            .filter(posting_comment::Column::AuthorId.eq(Some(user_id)))
            .count(&self.db)
            .await? as u32;
        let issue_voter = issue_voter::Entity::find()
            .filter(issue_voter::Column::UserId.eq(Some(user_id)))
            .count(&self.db)
            .await? as u32;
        let issue_comment_voter = issue_comment_voter::Entity::find()
            .filter(issue_comment_voter::Column::UserId.eq(Some(user_id)))
            .count(&self.db)
            .await? as u32;

        let assignee_ids = assignee::Entity::find()
            .filter(assignee::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        let assigned_issue = if assignee_ids.is_empty() {
            0
        } else {
            issue::Entity::find()
                .filter(issue::Column::AssigneeId.is_in(assignee_ids.into_iter().map(Some)))
                .count(&self.db)
                .await? as u32
        };

        Ok(UserStatisticsRecord {
            assigned_issue,
            issue,
            issue_comment,
            issue_comment_voter,
            issue_voter,
            posting,
            posting_comment,
        })
    }
}
