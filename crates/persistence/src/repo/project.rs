use super::*;

impl AppRepository {
    pub async fn create_project(&self, input: CreateProjectInput) -> Result<ProjectRecord, DbErr> {
        let created = project::ActiveModel {
            id: NotSet,
            name: Set(Some(input.project_name.trim().to_string())),
            overview: Set(empty_to_none(input.overview)),
            vcs: Set(Some(input.vcs.trim().to_string())),
            siteurl: Set(None),
            owner: Set(Some(input.owner_name.trim().to_string())),
            created_date: Set(Some(current_datetime())),
            last_issue_number: Set(Some(0)),
            last_posting_number: Set(Some(0)),
            original_project_id: Set(None),
            last_pushed_date: Set(None),
            default_reviewer_count: Set(Some(1)),
            is_using_reviewer_count: Set(Some(0)),
            organization_id: Set(input.organization_id),
            project_scope: Set(Some(normalize_identity(&input.project_scope))),
            previous_owner_login_id: Set(None),
            previous_name: Set(None),
            previous_name_changed_time: Set(None),
            is_code_accessible_member_only: Set(Some(0)),
        }
        .insert(&self.db)
        .await?;

        let menu_settings = configured_project_default_menu_settings();
        self.set_project_menu_settings(created.id, menu_settings)
            .await?;

        self.project_record_from_model(created)
            .await?
            .ok_or_else(|| DbErr::Custom("project owner/name missing".to_string()))
    }

    pub async fn create_fork_project(
        &self,
        input: CreateForkProjectInput,
    ) -> Result<ProjectRecord, DbErr> {
        let created = project::ActiveModel {
            id: NotSet,
            name: Set(Some(input.project_name.trim().to_string())),
            overview: Set(empty_to_none(input.overview)),
            vcs: Set(Some(input.vcs.trim().to_string())),
            siteurl: Set(None),
            owner: Set(Some(input.owner_name.trim().to_string())),
            created_date: Set(Some(current_datetime())),
            last_issue_number: Set(Some(0)),
            last_posting_number: Set(Some(0)),
            original_project_id: Set(Some(input.original_project_id)),
            last_pushed_date: Set(None),
            default_reviewer_count: Set(Some(1)),
            is_using_reviewer_count: Set(Some(0)),
            organization_id: Set(input.organization_id),
            project_scope: Set(Some(normalize_identity(&input.project_scope))),
            previous_owner_login_id: Set(None),
            previous_name: Set(None),
            previous_name_changed_time: Set(None),
            is_code_accessible_member_only: Set(Some(0)),
        }
        .insert(&self.db)
        .await?;

        let menu_settings = configured_project_default_menu_settings();
        self.set_project_menu_settings(created.id, menu_settings)
            .await?;

        self.project_record_from_model(created)
            .await?
            .ok_or_else(|| DbErr::Custom("project owner/name missing".to_string()))
    }

    pub async fn list_project_forks(
        &self,
        original_project_id: i64,
    ) -> Result<Vec<ProjectRecord>, DbErr> {
        let rows = project::Entity::find()
            .filter(project::Column::OriginalProjectId.eq(Some(original_project_id)))
            .all(&self.db)
            .await?;
        let mut forks = Vec::new();
        for row in rows {
            if let Some(record) = self.project_record_from_model(row).await? {
                forks.push(record);
            }
        }
        forks.sort_by(|left, right| {
            left.owner_name
                .cmp(&right.owner_name)
                .then_with(|| left.project_name.cmp(&right.project_name))
        });
        Ok(forks)
    }

    pub async fn change_project_vcs(
        &self,
        project_id: i64,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let Some(row) = project::Entity::find_by_id(project_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        let next_vcs = next_project_vcs(row.vcs.as_deref().unwrap_or("GIT"));
        let txn = self.db.begin().await?;
        for posting in posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project_id)))
            .filter(posting::Column::Readme.eq(Some(1)))
            .all(&txn)
            .await?
        {
            let mut active = posting::ActiveModel::from(posting);
            active.readme = Set(Some(0));
            active.update(&txn).await?;
        }
        let mut active = project::ActiveModel::from(row);
        active.vcs = Set(Some(next_vcs));
        let updated = active.update(&txn).await?;
        txn.commit().await?;

        self.project_record_from_model(updated).await
    }

    pub async fn add_project_membership(
        &self,
        project_id: i64,
        user_id: i64,
        role_name: &str,
    ) -> Result<(), DbErr> {
        let role_id = self.ensure_role_id(role_name).await?;

        if let Some(existing) = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .filter(project_user::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            let mut active = project_user::ActiveModel::from(existing);
            active.role_id = Set(Some(role_id));
            active.update(&self.db).await?;
            return Ok(());
        }

        project_user::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            project_id: Set(Some(project_id)),
            role_id: Set(Some(role_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(())
    }

    pub async fn delete_project_membership(
        &self,
        project_id: i64,
        user_id: i64,
    ) -> Result<(), DbErr> {
        if let Some(existing) = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .filter(project_user::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            project_user::Entity::delete_by_id(existing.id)
                .exec(&self.db)
                .await?;
        }
        Ok(())
    }

    pub async fn create_project_member_accept_notification(
        &self,
        project_id: i64,
        actor_id: i64,
        target_user_id: i64,
    ) -> Result<(), DbErr> {
        self.create_notification_event_for_receivers(
            actor_id,
            "project",
            &project_id.to_string(),
            "MEMBER_ENROLL_ACCEPT",
            "",
            "",
            &[target_user_id],
        )
        .await
    }

    pub async fn read_public_project_by_id(
        &self,
        project_id: i64,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let Some(project) = self.read_project_by_id(project_id).await? else {
            return Ok(None);
        };
        if normalize_identity(&project.project_scope) != "public" {
            return Ok(None);
        }
        Ok(Some(project))
    }

    pub async fn list_project_member_users(
        &self,
        project_id: i64,
    ) -> Result<Vec<AppUserRecord>, DbErr> {
        let memberships = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?;
        let mut users = Vec::new();
        for membership in memberships {
            let Some(user_id) = membership.user_id else {
                continue;
            };
            if let Some(user) = self.find_user_by_id(user_id).await? {
                users.push(user);
            }
        }
        users.sort_by(|left, right| left.login_id.cmp(&right.login_id));
        users.dedup_by(|left, right| left.id == right.id);
        Ok(users)
    }

    pub(super) async fn assignable_member_user_ids(
        &self,
        project_record: &ProjectRecord,
    ) -> Result<HashSet<i64>, DbErr> {
        let mut user_ids = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_record.id)))
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|membership| membership.user_id)
            .collect::<HashSet<_>>();

        if let Some(organization_id) = project_record.organization_id {
            user_ids.extend(
                organization_user::Entity::find()
                    .filter(organization_user::Column::OrganizationId.eq(Some(organization_id)))
                    .all(&self.db)
                    .await?
                    .into_iter()
                    .filter_map(|membership| membership.user_id),
            );
        }

        Ok(user_ids)
    }

    pub async fn update_project(
        &self,
        input: UpdateProjectInput,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let Some(current_record) = self
            .read_project_by_owner_and_name(&input.current_owner_name, &input.current_project_name)
            .await?
        else {
            return Ok(None);
        };

        let Some(current) = project::Entity::find_by_id(current_record.id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };

        let mut active = project::ActiveModel::from(current.clone());
        active.name = Set(Some(input.project_name.trim().to_string()));
        active.overview = Set(empty_to_none(input.overview));
        active.project_scope = Set(Some(normalize_identity(&input.project_scope)));
        active.previous_name = Set(current.name.clone());
        active.previous_owner_login_id = Set(current.owner.clone());
        active.previous_name_changed_time = Set(Some(current_timestamp_millis()));
        let updated = active.update(&self.db).await?;
        self.sync_project_label_cache(&updated).await?;

        self.project_record_from_model(updated).await
    }

    pub async fn read_organization_authorization(
        &self,
        organization_name: &str,
        actor_id: Option<i64>,
    ) -> Result<Option<OrganizationAuthorizationRecord>, DbErr> {
        let Some(organization) = self.read_organization_by_name(organization_name).await? else {
            return Ok(None);
        };

        let mut viewer = OrganizationViewerRecord {
            is_guest: false,
            is_organization_admin: false,
            is_organization_member: false,
            is_site_admin: false,
        };
        let mut enrollment_requested = false;

        if let Some(actor_id) = actor_id {
            if let Some(user) = self.find_user_by_id(actor_id).await? {
                viewer.is_guest = user.is_guest;
                viewer.is_site_admin = user.is_site_admin;
            }

            if let Some(membership) = organization_user::Entity::find()
                .filter(organization_user::Column::OrganizationId.eq(Some(organization.id)))
                .filter(organization_user::Column::UserId.eq(Some(actor_id)))
                .one(&self.db)
                .await?
            {
                let role_name = self.role_name_for_id(membership.role_id).await?;
                viewer.is_organization_admin = role_name == "org_admin";
                viewer.is_organization_member =
                    viewer.is_organization_admin || role_name == "org_member";
            }

            enrollment_requested =
                user_enrolled_organization::Entity::find_by_id((actor_id, organization.id))
                    .one(&self.db)
                    .await?
                    .is_some();
        }

        Ok(Some(OrganizationAuthorizationRecord {
            organization,
            viewer,
            enrollment_requested,
        }))
    }

    pub async fn read_organization_members(
        &self,
        organization_name: &str,
    ) -> Result<OrganizationMemberDirectoryRecord, DbErr> {
        let Some(organization) = self.read_organization_by_name(organization_name).await? else {
            return Ok(OrganizationMemberDirectoryRecord {
                enrollment_requests: vec![],
                members: vec![],
            });
        };

        let memberships = organization_user::Entity::find()
            .filter(organization_user::Column::OrganizationId.eq(Some(organization.id)))
            .all(&self.db)
            .await?;

        let mut member_user_ids = HashSet::new();
        let mut members = Vec::new();
        for membership in memberships {
            let Some(user_id) = membership.user_id else {
                continue;
            };
            let Some(user) = self.find_user_by_id(user_id).await? else {
                continue;
            };
            member_user_ids.insert(user_id);

            members.push(OrganizationMemberRecord {
                email_address: user.email_address,
                login_id: user.login_id,
                role: self.role_name_for_id(membership.role_id).await?,
                user_id,
                user_label: user.display_name,
            });
        }

        members.sort_by(|left, right| {
            let left_rank = if left.role == "org_admin" { 0 } else { 1 };
            let right_rank = if right.role == "org_admin" { 0 } else { 1 };
            left_rank
                .cmp(&right_rank)
                .then_with(|| left.login_id.cmp(&right.login_id))
        });

        let requests = user_enrolled_organization::Entity::find()
            .filter(user_enrolled_organization::Column::OrganizationId.eq(organization.id))
            .all(&self.db)
            .await?;
        let mut enrollment_requests = Vec::new();
        for request in requests {
            if member_user_ids.contains(&request.user_id) {
                continue;
            }
            let Some(user) = self.find_user_by_id(request.user_id).await? else {
                continue;
            };
            enrollment_requests.push(OrganizationEnrollmentRequestRecord {
                email_address: user.email_address,
                login_id: user.login_id,
                user_id: user.id,
                user_label: user.display_name,
            });
        }
        enrollment_requests.sort_by(|left, right| left.login_id.cmp(&right.login_id));

        Ok(OrganizationMemberDirectoryRecord {
            enrollment_requests,
            members,
        })
    }

    pub async fn read_project_authorization(
        &self,
        owner_name: &str,
        project_name: &str,
        actor_id: Option<i64>,
    ) -> Result<Option<ProjectAuthorizationRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        let mut viewer = ProjectViewerRecord {
            is_guest: false,
            is_organization_admin: false,
            is_organization_member: false,
            is_project_manager: false,
            is_project_member: false,
            is_site_admin: false,
        };
        let mut enrollment_requested = false;
        let mut is_favorited = false;

        if let Some(actor_id) = actor_id {
            if let Some(user) = n4user::Entity::find_by_id(actor_id).one(&self.db).await? {
                viewer.is_guest = user.is_guest.unwrap_or_default() != 0;
                viewer.is_site_admin = self.user_is_site_admin(user.id).await?;
            }

            if let Some(organization_id) = project.organization_id {
                if let Some(membership) = organization_user::Entity::find()
                    .filter(organization_user::Column::OrganizationId.eq(Some(organization_id)))
                    .filter(organization_user::Column::UserId.eq(Some(actor_id)))
                    .one(&self.db)
                    .await?
                {
                    let role_name = self.role_name_for_id(membership.role_id).await?;
                    viewer.is_organization_admin = role_name == "org_admin";
                    viewer.is_organization_member =
                        viewer.is_organization_admin || role_name == "org_member";
                }
            }

            if let Some(membership) = project_user::Entity::find()
                .filter(project_user::Column::ProjectId.eq(Some(project.id)))
                .filter(project_user::Column::UserId.eq(Some(actor_id)))
                .one(&self.db)
                .await?
            {
                let role_name = self.role_name_for_id(membership.role_id).await?;
                viewer.is_project_manager = role_name == "manager";
                viewer.is_project_member = viewer.is_project_manager || role_name == "member";
            }

            enrollment_requested =
                user_enrolled_project::Entity::find_by_id((actor_id, project.id))
                    .one(&self.db)
                    .await?
                    .is_some();
            is_favorited = favorite_project::Entity::find()
                .filter(favorite_project::Column::UserId.eq(Some(actor_id)))
                .filter(favorite_project::Column::ProjectId.eq(Some(project.id)))
                .one(&self.db)
                .await?
                .is_some();
        }

        Ok(Some(ProjectAuthorizationRecord {
            project,
            viewer,
            enrollment_requested,
            is_favorited,
        }))
    }

    pub async fn read_project_members(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<ProjectMemberDirectoryRecord, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(ProjectMemberDirectoryRecord {
                enrollment_requests: vec![],
                members: vec![],
            });
        };

        let memberships = project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project.id)))
            .all(&self.db)
            .await?;
        let mut members = Vec::new();
        for membership in memberships {
            let Some(user_id) = membership.user_id else {
                continue;
            };
            let Some(user) = self.find_user_by_id(user_id).await? else {
                continue;
            };
            members.push(ProjectMemberRecord {
                email_address: user.email_address,
                login_id: user.login_id,
                role: self.role_name_for_id(membership.role_id).await?,
                user_id,
                user_label: user.display_name,
            });
        }
        members.sort_by(|left, right| {
            let left_rank = if left.role == "manager" { 0 } else { 1 };
            let right_rank = if right.role == "manager" { 0 } else { 1 };
            left_rank
                .cmp(&right_rank)
                .then_with(|| left.login_id.cmp(&right.login_id))
        });

        let requests = user_enrolled_project::Entity::find()
            .filter(user_enrolled_project::Column::ProjectId.eq(project.id))
            .all(&self.db)
            .await?;
        let mut enrollment_requests = Vec::new();
        for request in requests {
            let Some(user) = self.find_user_by_id(request.user_id).await? else {
                continue;
            };
            enrollment_requests.push(ProjectEnrollmentRequestRecord {
                email_address: user.email_address,
                login_id: user.login_id,
                user_id: user.id,
                user_label: user.display_name,
            });
        }

        Ok(ProjectMemberDirectoryRecord {
            enrollment_requests,
            members,
        })
    }

    pub async fn list_projects_for_organization(
        &self,
        organization_id: i64,
    ) -> Result<Vec<ProjectRecord>, DbErr> {
        let models = project::Entity::find()
            .filter(project::Column::OrganizationId.eq(Some(organization_id)))
            .all(&self.db)
            .await?;
        let mut projects = Vec::new();
        for model in models {
            if let Some(record) = self.project_record_from_model(model).await? {
                projects.push(record);
            }
        }
        Ok(projects)
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

        if !issue_comment_ids.is_empty() {
            issue_comment_voter::Entity::delete_many()
                .filter(
                    issue_comment_voter::Column::IssueCommentId
                        .is_in(issue_comment_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
        }
        if !issue_ids.is_empty() {
            favorite_issue::Entity::delete_many()
                .filter(favorite_issue::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            recent_issue::Entity::delete_many()
                .filter(recent_issue::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue_event::Entity::delete_many()
                .filter(issue_event::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue_issue_label::Entity::delete_many()
                .filter(issue_issue_label::Column::IssueId.is_in(issue_ids.iter().copied()))
                .exec(&self.db)
                .await?;
            issue_sharer::Entity::delete_many()
                .filter(issue_sharer::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue_voter::Entity::delete_many()
                .filter(issue_voter::Column::IssueId.is_in(issue_ids.iter().copied()))
                .exec(&self.db)
                .await?;
            issue_comment::Entity::delete_many()
                .filter(issue_comment::Column::IssueId.is_in(issue_ids.iter().copied().map(Some)))
                .exec(&self.db)
                .await?;
            issue::Entity::delete_many()
                .filter(issue::Column::Id.is_in(issue_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }

        if !posting_ids.is_empty() {
            recent_issue::Entity::delete_many()
                .filter(
                    recent_issue::Column::PostingId.is_in(posting_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            posting_issue_label::Entity::delete_many()
                .filter(posting_issue_label::Column::PostingId.is_in(posting_ids.iter().copied()))
                .exec(&self.db)
                .await?;
            posting_comment::Entity::delete_many()
                .filter(
                    posting_comment::Column::PostingId.is_in(posting_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            posting::Entity::delete_many()
                .filter(posting::Column::Id.is_in(posting_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }

        if !thread_ids.is_empty() {
            review_comment::Entity::delete_many()
                .filter(
                    review_comment::Column::ThreadId.is_in(thread_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            comment_thread_n4user::Entity::delete_many()
                .filter(
                    comment_thread_n4user::Column::CommentThreadId
                        .is_in(thread_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
            comment_thread::Entity::delete_many()
                .filter(comment_thread::Column::Id.is_in(thread_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }

        if !pull_request_ids.is_empty() {
            pull_request_reviewers::Entity::delete_many()
                .filter(
                    pull_request_reviewers::Column::PullRequestId
                        .is_in(pull_request_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
            pull_request_commit::Entity::delete_many()
                .filter(
                    pull_request_commit::Column::PullRequestId
                        .is_in(pull_request_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            pull_request_event::Entity::delete_many()
                .filter(
                    pull_request_event::Column::PullRequestId
                        .is_in(pull_request_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            pull_request::Entity::delete_many()
                .filter(pull_request::Column::Id.is_in(pull_request_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }

        if !issue_label_ids.is_empty() {
            issue_issue_label::Entity::delete_many()
                .filter(
                    issue_issue_label::Column::IssueLabelId.is_in(issue_label_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
            posting_issue_label::Entity::delete_many()
                .filter(
                    posting_issue_label::Column::IssueLabelId
                        .is_in(issue_label_ids.iter().copied()),
                )
                .exec(&self.db)
                .await?;
            issue_label::Entity::delete_many()
                .filter(issue_label::Column::Id.is_in(issue_label_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }
        issue_label_category::Entity::delete_many()
            .filter(issue_label_category::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        milestone::Entity::delete_many()
            .filter(milestone::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        assignee::Entity::delete_many()
            .filter(assignee::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        commit_comment::Entity::delete_many()
            .filter(commit_comment::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_transfer::Entity::delete_many()
            .filter(project_transfer::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_pushed_branch::Entity::delete_many()
            .filter(project_pushed_branch::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        if !webhook_ids.is_empty() {
            webhook_delivery::Entity::delete_many()
                .filter(
                    webhook_delivery::Column::WebhookId
                        .is_in(webhook_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            webhook_thread::Entity::delete_many()
                .filter(
                    webhook_thread::Column::WebhookId.is_in(webhook_ids.iter().copied().map(Some)),
                )
                .exec(&self.db)
                .await?;
            webhook::Entity::delete_many()
                .filter(webhook::Column::Id.is_in(webhook_ids.iter().copied()))
                .exec(&self.db)
                .await?;
        }
        project_label::Entity::delete_many()
            .filter(project_label::Column::ProjectId.eq(project_id))
            .exec(&self.db)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_resource_id.clone())))
            .exec(&self.db)
            .await?;
        unwatch::Entity::delete_many()
            .filter(unwatch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(unwatch::Column::ResourceId.eq(Some(project_resource_id)))
            .exec(&self.db)
            .await?;
        user_project_notification::Entity::delete_many()
            .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_visitation::Entity::delete_many()
            .filter(project_visitation::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        recent_project::Entity::delete_many()
            .filter(recent_project::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        user_enrolled_project::Entity::delete_many()
            .filter(user_enrolled_project::Column::ProjectId.eq(project_id))
            .exec(&self.db)
            .await?;
        favorite_project::Entity::delete_many()
            .filter(favorite_project::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_user::Entity::delete_many()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project_menu_setting::Entity::delete_many()
            .filter(project_menu_setting::Column::ProjectId.eq(Some(project_id)))
            .exec(&self.db)
            .await?;
        project::Entity::delete_by_id(project_id)
            .exec(&self.db)
            .await?;
        Ok(true)
    }

    pub async fn count_project_members(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(Some(project_id)))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn count_project_watchers(&self, project_id: i64) -> Result<u32, DbErr> {
        Ok(watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .count(&self.db)
            .await? as u32)
    }

    pub async fn list_project_watchers(
        &self,
        project_id: i64,
    ) -> Result<ProjectWatcherListRecord, DbErr> {
        let watch_rows = watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(project_id.to_string())))
            .all(&self.db)
            .await?;

        let mut watchers = Vec::new();
        for watch_row in watch_rows {
            let Some(user_id) = watch_row.user_id else {
                continue;
            };
            let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
                continue;
            };
            let login_id = user.login_id.unwrap_or_default();
            if login_id.is_empty() {
                continue;
            }
            watchers.push(ProjectWatcherRecord {
                email_address: user.email.unwrap_or_default(),
                login_id,
                user_id,
                user_label: user.name.unwrap_or_default(),
            });
        }
        watchers.sort_by(|left, right| left.login_id.cmp(&right.login_id));

        Ok(ProjectWatcherListRecord { watchers })
    }

    pub async fn list_legacy_external_post_watchers(
        &self,
        owner_name: &str,
        project_name: &str,
        number: i64,
        legacy_type: &str,
        limit: u64,
    ) -> Result<LegacyExternalWatcherListRecord, DbErr> {
        let target = match legacy_type {
            "issues" => self
                .read_project_issue_model(owner_name, project_name, number)
                .await?
                .map(|model| ("ISSUE", model.1.id)),
            "posts" => self
                .read_project_posting_model(owner_name, project_name, number)
                .await?
                .map(|model| ("POSTING", model.1.id)),
            _ => None,
        };
        let Some((resource_type, resource_id)) = target else {
            return Ok(LegacyExternalWatcherListRecord {
                total_watchers: 0,
                watchers: Vec::new(),
            });
        };

        let total_watchers = watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(watch::Column::ResourceId.eq(Some(resource_id.to_string())))
            .count(&self.db)
            .await? as u32;
        let watch_rows = watch::Entity::find()
            .filter(watch::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(watch::Column::ResourceId.eq(Some(resource_id.to_string())))
            .order_by_asc(watch::Column::Id)
            .limit(limit)
            .all(&self.db)
            .await?;
        let mut watchers = Vec::new();
        for watch_row in watch_rows {
            let Some(user_id) = watch_row.user_id else {
                continue;
            };
            let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
                continue;
            };
            let login_id = user.login_id.unwrap_or_default();
            if login_id.is_empty() {
                continue;
            }
            watchers.push(LegacyExternalWatcherRecord {
                login_id,
                name: user.name.unwrap_or_default(),
                user_id,
            });
        }

        Ok(LegacyExternalWatcherListRecord {
            total_watchers,
            watchers,
        })
    }

    pub async fn list_legacy_project_title_heads(
        &self,
        owner_name: &str,
        project_name: &str,
        query: &str,
    ) -> Result<Vec<LegacyProjectTitleHeadRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(Vec::new());
        };
        let needle = query.to_ascii_lowercase();
        let mut title_heads = title_head::Entity::find()
            .filter(title_head::Column::ProjectId.eq(Some(project.id)))
            .order_by_asc(title_head::Column::HeadKeyword)
            .all(&self.db)
            .await?
            .into_iter()
            .filter_map(|row| {
                let name = row.head_keyword.unwrap_or_default();
                if !name.to_ascii_lowercase().contains(&needle) {
                    return None;
                }
                Some(LegacyProjectTitleHeadRecord {
                    frequency: row.frequency.unwrap_or_default(),
                    name,
                })
            })
            .collect::<Vec<_>>();
        title_heads.sort_by(|left, right| left.name.cmp(&right.name));
        Ok(title_heads)
    }
}
