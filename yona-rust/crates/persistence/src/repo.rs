use crate::repo_types::{
    AppUserInput, AppUserRecord, CreateOrganizationInput, CreateProjectInput, CreateUserInput,
    IssueRecord, OrganizationAuthorizationRecord, OrganizationMemberDirectoryRecord,
    OrganizationMemberRecord, OrganizationRecord, OrganizationViewerRecord,
    ProjectAuthorizationRecord, ProjectEnrollmentRequestRecord, ProjectListEntry,
    ProjectMemberDirectoryRecord, ProjectMemberRecord, ProjectRecord, ProjectViewerRecord,
    ToggleFavoriteProjectResult, UpdateOrganizationInput, UpdateProjectInput,
};
use crate::{
    favorite_project, issue, n4user, organization, organization_user, project, project_user,
    recent_project, role, site_admin, user_enrolled_project, user_setting,
};
use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait,
    FromQueryResult, NotSet, QueryFilter, QueryOrder, QuerySelect, Set,
};

fn normalize_identity(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn normalize_optional(value: Option<&str>) -> Option<String> {
    value
        .map(normalize_identity)
        .filter(|item| !item.is_empty())
}

fn empty_to_none(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    })
}

fn user_state_from_confirmed(is_confirmed: bool) -> Option<String> {
    Some(if is_confirmed { "active" } else { "pending" }.to_string())
}

fn issue_state_to_raw(value: &str) -> i32 {
    if normalize_identity(value) == "open" {
        0
    } else {
        1
    }
}

fn issue_state_from_raw(value: Option<i32>) -> String {
    if value.unwrap_or(0) == 0 {
        "open".to_string()
    } else {
        "closed".to_string()
    }
}

#[derive(Debug, FromQueryResult)]
struct ProjectRow {
    id: i64,
    name: Option<String>,
    overview: Option<String>,
    owner: Option<String>,
    organization_id: Option<i64>,
    project_scope: Option<String>,
}

#[derive(Debug, FromQueryResult)]
struct IssueRow {
    title: Option<String>,
    number: Option<i64>,
    state: Option<i32>,
}

#[derive(Clone)]
pub struct AppRepository {
    db: DatabaseConnection,
}

#[derive(Clone)]
pub struct AppUserRepository {
    inner: AppRepository,
}

#[derive(Clone)]
pub struct DefaultLandingRepository {
    inner: AppRepository,
}

impl AppRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create_user(&self, input: CreateUserInput) -> Result<AppUserRecord, DbErr> {
        let created = n4user::ActiveModel {
            id: NotSet,
            name: Set(Some(input.display_name.clone())),
            login_id: Set(Some(normalize_identity(&input.login_id))),
            password: Set(Some(input.password_hash.clone())),
            password_salt: Set(None),
            email: Set(Some(normalize_identity(&input.email_address))),
            remember_me: Set(Some(0)),
            state: Set(user_state_from_confirmed(input.is_confirmed)),
            last_state_modified_date: Set(None),
            created_date: Set(None),
            lang: Set(None),
            token: Set(None),
            is_guest: Set(Some(0)),
            english_name: Set(None),
        }
        .insert(&self.db)
        .await?;

        if input.is_site_admin {
            self.ensure_site_admin(created.id).await?;
        }

        self.find_user_by_id(created.id)
            .await?
            .ok_or_else(|| DbErr::Custom("created user missing".to_string()))
    }

    pub async fn find_user_by_identifier(
        &self,
        identifier: &str,
    ) -> Result<Option<AppUserRecord>, DbErr> {
        let normalized = normalize_identity(identifier);
        if normalized.is_empty() {
            return Ok(None);
        }

        let users = n4user::Entity::find().all(&self.db).await?;
        for user in users {
            let login_matches = normalize_optional(user.login_id.as_deref()).as_deref()
                == Some(normalized.as_str());
            let email_matches =
                normalize_optional(user.email.as_deref()).as_deref() == Some(normalized.as_str());
            if login_matches || email_matches {
                return self.app_user_record_from_model(user).await.map(Some);
            }
        }

        Ok(None)
    }

    pub async fn find_user_by_id(&self, user_id: i64) -> Result<Option<AppUserRecord>, DbErr> {
        let Some(user) = n4user::Entity::find_by_id(user_id).one(&self.db).await? else {
            return Ok(None);
        };

        self.app_user_record_from_model(user).await.map(Some)
    }

    pub async fn user_login_id_exists(&self, login_id: &str) -> Result<bool, DbErr> {
        let normalized = normalize_identity(login_id);
        if normalized.is_empty() {
            return Ok(false);
        }

        let users = n4user::Entity::find().all(&self.db).await?;
        Ok(users.into_iter().any(|user| {
            normalize_optional(user.login_id.as_deref()).as_deref() == Some(normalized.as_str())
        }))
    }

    pub async fn list_projects(&self) -> Result<Vec<ProjectRecord>, DbErr> {
        let rows = project::Entity::find()
            .select_only()
            .column(project::Column::Id)
            .column(project::Column::Name)
            .column(project::Column::Overview)
            .column(project::Column::Owner)
            .column(project::Column::OrganizationId)
            .column(project::Column::ProjectScope)
            .order_by_asc(project::Column::Owner)
            .order_by_asc(project::Column::Name)
            .into_model::<ProjectRow>()
            .all(&self.db)
            .await?;

        let mut projects = Vec::new();
        for row in rows {
            if let Some(record) = self.project_record_from_row(row).await? {
                projects.push(record);
            }
        }

        Ok(projects)
    }

    pub async fn list_organizations(&self) -> Result<Vec<OrganizationRecord>, DbErr> {
        let rows = organization::Entity::find()
            .order_by_asc(organization::Column::Name)
            .all(&self.db)
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| self.organization_record_from_model(row))
            .collect())
    }

    pub async fn read_issue_detail(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        let issue = issue::Entity::find()
            .select_only()
            .column(issue::Column::Title)
            .column(issue::Column::Number)
            .column(issue::Column::State)
            .filter(issue::Column::ProjectId.eq(Some(project.id)))
            .filter(issue::Column::Number.eq(Some(issue_number)))
            .into_model::<IssueRow>()
            .one(&self.db)
            .await?;

        Ok(issue.and_then(|row| self.issue_record_from_row(row, &project)))
    }

    pub async fn update_issue_state(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        state: &str,
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(None);
        };

        let update_result = issue::Entity::update_many()
            .col_expr(
                issue::Column::State,
                Expr::value(Some(issue_state_to_raw(state))),
            )
            .filter(issue::Column::ProjectId.eq(Some(project_record.id)))
            .filter(issue::Column::Number.eq(Some(issue_number)))
            .exec(&self.db)
            .await?
            .rows_affected;

        if update_result == 0 {
            return Ok(None);
        }

        self.read_issue_detail(owner_name, project_name, issue_number)
            .await
    }

    pub async fn read_project_by_owner_and_name(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let owner_name = normalize_identity(owner_name);
        let project_name = normalize_identity(project_name);
        if owner_name.is_empty() || project_name.is_empty() {
            return Ok(None);
        }

        let rows = project::Entity::find()
            .select_only()
            .column(project::Column::Id)
            .column(project::Column::Name)
            .column(project::Column::Overview)
            .column(project::Column::Owner)
            .column(project::Column::OrganizationId)
            .column(project::Column::ProjectScope)
            .into_model::<ProjectRow>()
            .all(&self.db)
            .await?;
        for row in rows {
            let owner_matches =
                normalize_optional(row.owner.as_deref()).as_deref() == Some(owner_name.as_str());
            let project_matches =
                normalize_optional(row.name.as_deref()).as_deref() == Some(project_name.as_str());
            if owner_matches && project_matches {
                return self.project_record_from_row(row).await;
            }
        }

        Ok(None)
    }

    pub async fn project_identifier_exists(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Result<bool, DbErr> {
        Ok(self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
            .is_some())
    }

    pub async fn create_organization(
        &self,
        input: CreateOrganizationInput,
    ) -> Result<OrganizationRecord, DbErr> {
        let created = organization::ActiveModel {
            id: NotSet,
            name: Set(Some(input.organization_name.trim().to_string())),
            created: Set(None),
            descr: Set(empty_to_none(input.description)),
        }
        .insert(&self.db)
        .await?;

        self.organization_record_from_model(created)
            .ok_or_else(|| DbErr::Custom("organization name missing".to_string()))
    }

    pub async fn organization_name_exists(&self, organization_name: &str) -> Result<bool, DbErr> {
        let normalized = normalize_identity(organization_name);
        if normalized.is_empty() {
            return Ok(false);
        }

        let rows = organization::Entity::find().all(&self.db).await?;
        Ok(rows.into_iter().any(|row| {
            normalize_optional(row.name.as_deref()).as_deref() == Some(normalized.as_str())
        }))
    }

    pub async fn read_organization_by_name(
        &self,
        organization_name: &str,
    ) -> Result<Option<OrganizationRecord>, DbErr> {
        let normalized = normalize_identity(organization_name);
        if normalized.is_empty() {
            return Ok(None);
        }

        let rows = organization::Entity::find().all(&self.db).await?;
        for row in rows {
            if normalize_optional(row.name.as_deref()).as_deref() == Some(normalized.as_str()) {
                return Ok(self.organization_record_from_model(row));
            }
        }

        Ok(None)
    }

    pub async fn add_organization_membership(
        &self,
        organization_id: i64,
        user_id: i64,
        role_name: &str,
    ) -> Result<(), DbErr> {
        let role_id = self.ensure_role_id(role_name).await?;

        if let Some(existing) = organization_user::Entity::find()
            .filter(organization_user::Column::OrganizationId.eq(Some(organization_id)))
            .filter(organization_user::Column::UserId.eq(Some(user_id)))
            .one(&self.db)
            .await?
        {
            let mut active = organization_user::ActiveModel::from(existing);
            active.role_id = Set(Some(role_id));
            active.update(&self.db).await?;
            return Ok(());
        }

        organization_user::ActiveModel {
            id: NotSet,
            user_id: Set(Some(user_id)),
            organization_id: Set(Some(organization_id)),
            role_id: Set(Some(role_id)),
        }
        .insert(&self.db)
        .await?;

        Ok(())
    }

    pub async fn update_organization(
        &self,
        input: UpdateOrganizationInput,
    ) -> Result<Option<OrganizationRecord>, DbErr> {
        let normalized_current = normalize_identity(&input.current_organization_name);
        let rows = organization::Entity::find().all(&self.db).await?;
        let Some(current) = rows.into_iter().find(|row| {
            normalize_optional(row.name.as_deref()).as_deref() == Some(normalized_current.as_str())
        }) else {
            return Ok(None);
        };

        let previous_name = current.name.clone().unwrap_or_default();
        let mut active = organization::ActiveModel::from(current);
        active.name = Set(Some(input.organization_name.trim().to_string()));
        active.descr = Set(empty_to_none(input.description));
        let updated = active.update(&self.db).await?;
        let updated_record = self
            .organization_record_from_model(updated.clone())
            .ok_or_else(|| DbErr::Custom("organization name missing after update".to_string()))?;

        if normalize_identity(&previous_name)
            != normalize_identity(&updated_record.organization_name)
        {
            let projects = project::Entity::find()
                .filter(project::Column::OrganizationId.eq(Some(updated.id)))
                .all(&self.db)
                .await?;
            for row in projects {
                let mut active_project = project::ActiveModel::from(row.clone());
                active_project.owner = Set(Some(updated_record.organization_name.clone()));
                let updated_project = active_project.update(&self.db).await?;
                self.sync_project_label_cache(&updated_project).await?;
            }
        }

        Ok(Some(updated_record))
    }

    pub async fn create_project(&self, input: CreateProjectInput) -> Result<ProjectRecord, DbErr> {
        let created = project::ActiveModel {
            id: NotSet,
            name: Set(Some(input.project_name.trim().to_string())),
            overview: Set(empty_to_none(input.overview)),
            vcs: Set(None),
            siteurl: Set(None),
            owner: Set(Some(input.owner_name.trim().to_string())),
            created_date: Set(None),
            last_issue_number: Set(Some(0)),
            last_posting_number: Set(Some(0)),
            original_project_id: Set(None),
            last_pushed_date: Set(None),
            default_reviewer_count: Set(Some(0)),
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

        self.project_record_from_model(created)
            .await?
            .ok_or_else(|| DbErr::Custom("project owner/name missing".to_string()))
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
            is_organization_admin: false,
            is_organization_member: false,
            is_site_admin: false,
        };

        if let Some(actor_id) = actor_id {
            if let Some(user) = self.find_user_by_id(actor_id).await? {
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
        }

        Ok(Some(OrganizationAuthorizationRecord {
            organization,
            viewer,
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

        let mut members = Vec::new();
        for membership in memberships {
            let Some(user_id) = membership.user_id else {
                continue;
            };
            let Some(user) = self.find_user_by_id(user_id).await? else {
                continue;
            };

            members.push(OrganizationMemberRecord {
                login_id: user.login_id,
                role: self.role_name_for_id(membership.role_id).await?,
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

        Ok(OrganizationMemberDirectoryRecord {
            enrollment_requests: vec![],
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
            is_organization_admin: false,
            is_organization_member: false,
            is_project_manager: false,
            is_project_member: false,
            is_site_admin: false,
        };
        let mut enrollment_requested = false;
        let mut is_favorited = false;

        if let Some(actor_id) = actor_id {
            if let Some(user) = self.find_user_by_id(actor_id).await? {
                viewer.is_site_admin = user.is_site_admin;
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
                login_id: user.login_id,
                role: self.role_name_for_id(membership.role_id).await?,
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
                login_id: user.login_id,
                user_label: user.display_name,
            });
        }

        Ok(ProjectMemberDirectoryRecord {
            enrollment_requests,
            members,
        })
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

        let favorited = if let Some(existing) = favorite_project::Entity::find()
            .filter(favorite_project::Column::UserId.eq(Some(user_id)))
            .filter(favorite_project::Column::ProjectId.eq(Some(project.id)))
            .one(&self.db)
            .await?
        {
            favorite_project::Entity::delete_by_id(existing.id)
                .exec(&self.db)
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
            .insert(&self.db)
            .await?;
            true
        };

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
        let rows = favorite_project::Entity::find()
            .filter(favorite_project::Column::UserId.eq(Some(user_id)))
            .order_by_desc(favorite_project::Column::Id)
            .all(&self.db)
            .await?;
        let mut projects = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };

            let project_row = project::Entity::find_by_id(project_id)
                .one(&self.db)
                .await?;
            let owner_name = row
                .owner
                .or_else(|| project_row.as_ref().and_then(|item| item.owner.clone()));
            let project_name = row
                .project_name
                .or_else(|| project_row.as_ref().and_then(|item| item.name.clone()));
            if let (Some(owner_name), Some(project_name)) = (owner_name, project_name) {
                projects.push(ProjectListEntry {
                    owner_name,
                    project_name,
                });
            }
        }
        Ok(projects)
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
        let mut projects = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };

            let project_row = project::Entity::find_by_id(project_id)
                .one(&self.db)
                .await?;
            let owner_name = row
                .owner
                .or_else(|| project_row.as_ref().and_then(|item| item.owner.clone()));
            let project_name = row
                .project_name
                .or_else(|| project_row.as_ref().and_then(|item| item.name.clone()));
            if let (Some(owner_name), Some(project_name)) = (owner_name, project_name) {
                projects.push(ProjectListEntry {
                    owner_name,
                    project_name,
                });
            }
        }
        Ok(projects)
    }

    pub async fn read_default_landing_path(&self, user_id: i64) -> Result<Option<String>, DbErr> {
        let row = user_setting::Entity::find()
            .filter(user_setting::Column::UserId.eq(Some(user_id)))
            .order_by_desc(user_setting::Column::Id)
            .one(&self.db)
            .await?;
        Ok(row.and_then(|model| model.login_default_page))
    }

    pub async fn set_default_landing_path(
        &self,
        user_id: i64,
        path: Option<String>,
    ) -> Result<Option<String>, DbErr> {
        let existing = user_setting::Entity::find()
            .filter(user_setting::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;

        if let Some(path) = path {
            let normalized_path = path.trim().to_string();
            if let Some(current) = existing.into_iter().next() {
                let mut active = user_setting::ActiveModel::from(current);
                active.login_default_page = Set(Some(normalized_path.clone()));
                active.update(&self.db).await?;
            } else {
                user_setting::ActiveModel {
                    id: NotSet,
                    user_id: Set(Some(user_id)),
                    login_default_page: Set(Some(normalized_path.clone())),
                }
                .insert(&self.db)
                .await?;
            }

            Ok(Some(normalized_path))
        } else {
            for row in existing {
                user_setting::Entity::delete_by_id(row.id)
                    .exec(&self.db)
                    .await?;
            }
            Ok(None)
        }
    }

    async fn app_user_record_from_model(
        &self,
        model: n4user::Model,
    ) -> Result<AppUserRecord, DbErr> {
        let is_site_admin = site_admin::Entity::find()
            .filter(site_admin::Column::AdminId.eq(Some(model.id)))
            .one(&self.db)
            .await?
            .is_some();

        Ok(AppUserRecord {
            id: model.id,
            display_name: model.name.unwrap_or_default(),
            email_address: model.email.unwrap_or_default(),
            is_confirmed: normalize_optional(model.state.as_deref()).as_deref() == Some("active"),
            is_site_admin,
            login_id: model.login_id.unwrap_or_default(),
            password_hash: model.password.unwrap_or_default(),
        })
    }

    fn organization_record_from_model(
        &self,
        model: organization::Model,
    ) -> Option<OrganizationRecord> {
        Some(OrganizationRecord {
            id: model.id,
            organization_name: model.name?,
            description: model.descr,
        })
    }

    async fn project_record_from_row(
        &self,
        row: ProjectRow,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let organization_name = match row.organization_id {
            Some(organization_id) => organization::Entity::find_by_id(organization_id)
                .one(&self.db)
                .await?
                .and_then(|item| item.name),
            None => None,
        };

        let owner_name = row.owner.unwrap_or_default();
        let project_name = row.name.unwrap_or_default();
        if owner_name.is_empty() || project_name.is_empty() {
            return Ok(None);
        }

        Ok(Some(ProjectRecord {
            id: row.id,
            organization_id: row.organization_id,
            organization_name,
            owner_name,
            overview: row.overview,
            project_name,
            project_scope: row.project_scope.unwrap_or_else(|| "public".to_string()),
        }))
    }

    async fn project_record_from_model(
        &self,
        model: project::Model,
    ) -> Result<Option<ProjectRecord>, DbErr> {
        let organization_name = match model.organization_id {
            Some(organization_id) => organization::Entity::find_by_id(organization_id)
                .one(&self.db)
                .await?
                .and_then(|row| row.name),
            None => None,
        };

        let owner_name = model.owner.unwrap_or_default();
        let project_name = model.name.unwrap_or_default();
        if owner_name.is_empty() || project_name.is_empty() {
            return Ok(None);
        }

        Ok(Some(ProjectRecord {
            id: model.id,
            organization_id: model.organization_id,
            organization_name,
            owner_name,
            overview: model.overview,
            project_name,
            project_scope: model.project_scope.unwrap_or_else(|| "public".to_string()),
        }))
    }

    fn issue_record_from_row(&self, row: IssueRow, project: &ProjectRecord) -> Option<IssueRecord> {
        Some(IssueRecord {
            issue_number: row.number?,
            owner_name: project.owner_name.clone(),
            project_name: project.project_name.clone(),
            state: issue_state_from_raw(row.state),
            title: row.title.unwrap_or_default(),
        })
    }

    async fn ensure_site_admin(&self, user_id: i64) -> Result<(), DbErr> {
        if site_admin::Entity::find()
            .filter(site_admin::Column::AdminId.eq(Some(user_id)))
            .one(&self.db)
            .await?
            .is_none()
        {
            site_admin::ActiveModel {
                id: NotSet,
                admin_id: Set(Some(user_id)),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(())
    }

    async fn ensure_role_id(&self, role_name: &str) -> Result<i64, DbErr> {
        let normalized = normalize_identity(role_name);
        let roles = role::Entity::find().all(&self.db).await?;
        for existing in roles {
            if normalize_optional(existing.name.as_deref()).as_deref() == Some(normalized.as_str())
            {
                return Ok(existing.id);
            }
        }

        let created = role::ActiveModel {
            id: NotSet,
            name: Set(Some(role_name.to_string())),
            active: Set(Some(1)),
        }
        .insert(&self.db)
        .await?;

        Ok(created.id)
    }

    async fn role_name_for_id(&self, role_id: Option<i64>) -> Result<String, DbErr> {
        let Some(role_id) = role_id else {
            return Ok(String::new());
        };

        Ok(role::Entity::find_by_id(role_id)
            .one(&self.db)
            .await?
            .and_then(|row| row.name)
            .unwrap_or_default())
    }

    async fn sync_project_label_cache(&self, project_model: &project::Model) -> Result<(), DbErr> {
        let owner = project_model.owner.clone();
        let name = project_model.name.clone();

        let favorites = favorite_project::Entity::find()
            .filter(favorite_project::Column::ProjectId.eq(Some(project_model.id)))
            .all(&self.db)
            .await?;
        for favorite in favorites {
            let mut active = favorite_project::ActiveModel::from(favorite);
            active.owner = Set(owner.clone());
            active.project_name = Set(name.clone());
            active.update(&self.db).await?;
        }

        let recents = recent_project::Entity::find()
            .filter(recent_project::Column::ProjectId.eq(Some(project_model.id)))
            .all(&self.db)
            .await?;
        for recent in recents {
            let mut active = recent_project::ActiveModel::from(recent);
            active.owner = Set(owner.clone());
            active.project_name = Set(name.clone());
            active.update(&self.db).await?;
        }

        Ok(())
    }
}

impl AppUserRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            inner: AppRepository::new(db),
        }
    }

    pub async fn create_user(&self, input: AppUserInput) -> Result<AppUserRecord, DbErr> {
        self.inner.create_user(input).await
    }

    pub async fn find_by_identifier(
        &self,
        identifier: &str,
    ) -> Result<Option<AppUserRecord>, DbErr> {
        self.inner.find_user_by_identifier(identifier).await
    }
}

impl DefaultLandingRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            inner: AppRepository::new(db),
        }
    }

    pub async fn read_default_landing_path(&self, user_id: i64) -> Result<Option<String>, DbErr> {
        self.inner.read_default_landing_path(user_id).await
    }

    pub async fn set_default_landing_path(&self, user_id: i64, path: &str) -> Result<(), DbErr> {
        self.inner
            .set_default_landing_path(user_id, Some(path.to_string()))
            .await
            .map(|_| ())
    }
}
