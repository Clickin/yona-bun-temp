use super::*;

impl AppRepositoryImpl<'_> {
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
            left.user_label
                .cmp(&right.user_label)
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
}
