pub mod default_landing;
pub mod org_project;

pub const DEFAULT_LANDING_FALLBACK_PATH: &str = "/me";

pub use default_landing::{normalize_default_landing_path, resolve_post_auth_landing_path};
pub use org_project::{
    authorize_project_access, can_create_organization_project, can_create_personal_project,
    can_request_project_enrollment, can_update_organization, is_valid_organization_name,
    is_valid_project_name, normalize_identity, ProjectAccessDecision, ProjectAccessFacts,
    ProjectAccessReason, ProjectOperation, ProjectScope,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AppUserSummary {
    pub email_address: String,
    pub id: i64,
    pub is_confirmed: bool,
    pub is_site_admin: bool,
    pub login_id: String,
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SessionProjection {
    pub actor_id: Option<i64>,
    pub login_id: Option<String>,
    pub is_anonymous: bool,
    pub is_confirmed: bool,
    pub is_site_admin: bool,
    pub email_address: Option<String>,
    pub user_label: Option<String>,
    pub default_landing_path: Option<String>,
}

impl SessionProjection {
    pub fn anonymous() -> Self {
        Self {
            actor_id: None,
            default_landing_path: None,
            email_address: None,
            is_anonymous: true,
            is_confirmed: false,
            is_site_admin: false,
            login_id: None,
            user_label: None,
        }
    }

    pub fn authenticated(
        actor_id: i64,
        login_id: impl Into<String>,
        email_address: impl Into<String>,
        user_label: impl Into<String>,
        is_confirmed: bool,
        is_site_admin: bool,
        default_landing_path: Option<String>,
    ) -> Self {
        Self {
            actor_id: Some(actor_id),
            default_landing_path,
            email_address: Some(email_address.into()),
            is_anonymous: false,
            is_confirmed,
            is_site_admin,
            login_id: Some(login_id.into()),
            user_label: Some(user_label.into()),
        }
    }
}

pub fn build_anonymous_app_session() -> SessionProjection {
    SessionProjection::anonymous()
}

pub fn build_authenticated_app_session(
    user: &AppUserSummary,
    default_landing_path: Option<&str>,
) -> SessionProjection {
    SessionProjection::authenticated(
        user.id,
        user.login_id.clone(),
        user.email_address.clone(),
        user.name.clone(),
        user.is_confirmed,
        user.is_site_admin,
        normalize_default_landing_path(default_landing_path),
    )
}
