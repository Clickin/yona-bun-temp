pub mod organization {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "organizations")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: i64,
        pub organization_name: String,
        pub organization_name_normalized: String,
        pub description: Option<String>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod organization_membership {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "organization_memberships")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub organization_id: i64,
        #[sea_orm(primary_key, auto_increment = false)]
        pub user_id: i64,
        pub role: String,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod project {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "projects")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: i64,
        pub organization_id: Option<i64>,
        pub owner_name: String,
        pub owner_name_normalized: String,
        pub project_name: String,
        pub project_name_normalized: String,
        pub overview: Option<String>,
        pub project_scope: String,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod project_membership {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "project_memberships")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub project_id: i64,
        #[sea_orm(primary_key, auto_increment = false)]
        pub user_id: i64,
        pub role: String,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod project_enrollment_request {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "project_enrollment_requests")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub project_id: i64,
        #[sea_orm(primary_key, auto_increment = false)]
        pub user_id: i64,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod favorite_project {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "favorite_projects")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub user_id: i64,
        #[sea_orm(primary_key, auto_increment = false)]
        pub project_id: i64,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod recent_project {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "recent_projects")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub user_id: i64,
        #[sea_orm(primary_key, auto_increment = false)]
        pub project_id: i64,
        pub visited_at: i64,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod issue {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "issues")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub owner_name: String,
        #[sea_orm(primary_key, auto_increment = false)]
        pub project_name: String,
        #[sea_orm(primary_key, auto_increment = false)]
        pub issue_number: i64,
        pub title: String,
        pub state: String,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod app_user {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "app_users")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: i64,
        pub login_id: String,
        pub email_address: String,
        pub display_name: String,
        pub password_hash: String,
        pub is_confirmed: bool,
        pub is_site_admin: bool,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod default_landing_preference {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "default_landing_preferences")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub user_id: i64,
        pub path: String,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateUserInput {
    pub display_name: String,
    pub email_address: String,
    pub is_confirmed: bool,
    pub is_site_admin: bool,
    pub login_id: String,
    pub password_hash: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateOrganizationInput {
    pub description: Option<String>,
    pub organization_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdateOrganizationInput {
    pub current_organization_name: String,
    pub description: Option<String>,
    pub organization_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateProjectInput {
    pub organization_id: Option<i64>,
    pub owner_name: String,
    pub overview: Option<String>,
    pub project_name: String,
    pub project_scope: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdateProjectInput {
    pub current_owner_name: String,
    pub current_project_name: String,
    pub overview: Option<String>,
    pub project_name: String,
    pub project_scope: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationRecord {
    pub id: i64,
    pub organization_name: String,
    pub description: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationViewerRecord {
    pub is_organization_admin: bool,
    pub is_organization_member: bool,
    pub is_site_admin: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationAuthorizationRecord {
    pub organization: OrganizationRecord,
    pub viewer: OrganizationViewerRecord,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationMemberRecord {
    pub login_id: String,
    pub role: String,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationEnrollmentRequestRecord {
    pub login_id: String,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OrganizationMemberDirectoryRecord {
    pub enrollment_requests: Vec<OrganizationEnrollmentRequestRecord>,
    pub members: Vec<OrganizationMemberRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectRecord {
    pub id: i64,
    pub organization_id: Option<i64>,
    pub organization_name: Option<String>,
    pub owner_name: String,
    pub overview: Option<String>,
    pub project_name: String,
    pub project_scope: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectViewerRecord {
    pub is_organization_admin: bool,
    pub is_organization_member: bool,
    pub is_project_manager: bool,
    pub is_project_member: bool,
    pub is_site_admin: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectAuthorizationRecord {
    pub project: ProjectRecord,
    pub viewer: ProjectViewerRecord,
    pub enrollment_requested: bool,
    pub is_favorited: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectMemberRecord {
    pub login_id: String,
    pub role: String,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectEnrollmentRequestRecord {
    pub login_id: String,
    pub user_label: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectMemberDirectoryRecord {
    pub enrollment_requests: Vec<ProjectEnrollmentRequestRecord>,
    pub members: Vec<ProjectMemberRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectListEntry {
    pub owner_name: String,
    pub project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ToggleFavoriteProjectResult {
    pub favorited: bool,
    pub owner_name: String,
    pub project_name: String,
}

pub type AppUserInput = CreateUserInput;
