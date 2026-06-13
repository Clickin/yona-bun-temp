#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProjectScope {
    Public,
    Protected,
    Private,
}

impl ProjectScope {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Public => "public",
            Self::Protected => "protected",
            Self::Private => "private",
        }
    }
}

impl TryFrom<&str> for ProjectScope {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match normalize_identity(value).as_str() {
            "public" => Ok(Self::Public),
            "protected" => Ok(Self::Protected),
            "private" => Ok(Self::Private),
            _ => Err(()),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProjectOperation {
    Read,
    Update,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProjectAccessReason {
    GuestPublicReadDenied,
    OrganizationAdminRead,
    OrganizationAdminUpdate,
    OrganizationMemberRead,
    PrivateProjectDenied,
    ProjectManagerRead,
    ProjectManagerUpdate,
    ProjectMemberRead,
    ProjectUpdateDenied,
    PublicRead,
    SiteAdminRead,
    SiteAdminUpdate,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ProjectAccessDecision {
    pub allowed: bool,
    pub reason: ProjectAccessReason,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ProjectAccessFacts {
    pub is_anonymous: bool,
    pub is_guest: bool,
    pub is_organization_admin: bool,
    pub is_organization_member: bool,
    pub is_project_manager: bool,
    pub is_project_member: bool,
    pub is_site_admin: bool,
    pub project_scope: ProjectScope,
}

pub fn normalize_identity(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn is_identifier_char(value: char) -> bool {
    value.is_ascii_alphanumeric() || value.is_alphanumeric() || matches!(value, '-' | '_' | '.')
}

pub fn is_valid_organization_name(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty()
        || trimmed.len() > 255
        || trimmed.starts_with('.')
        || trimmed.starts_with('_')
        || trimmed.ends_with('.')
        || trimmed.ends_with('_')
        || trimmed.contains(' ')
    {
        return false;
    }

    trimmed.chars().all(is_identifier_char)
}

pub fn is_valid_project_name(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty()
        || trimmed.len() > 255
        || matches!(trimmed, "." | ".." | ".git")
        || trimmed.contains(' ')
    {
        return false;
    }

    trimmed.chars().all(is_identifier_char)
}

pub fn can_update_organization(is_organization_admin: bool, is_site_admin: bool) -> bool {
    is_organization_admin || is_site_admin
}

pub fn can_create_personal_project(actor_login_id: Option<&str>, owner_name: &str) -> bool {
    let Some(actor_login_id) = actor_login_id else {
        return false;
    };

    normalize_identity(actor_login_id) == normalize_identity(owner_name)
}

pub fn can_create_organization_project(is_organization_admin: bool) -> bool {
    is_organization_admin
}

pub fn authorize_project_access(
    facts: &ProjectAccessFacts,
    operation: ProjectOperation,
) -> ProjectAccessDecision {
    if facts.is_site_admin {
        return ProjectAccessDecision {
            allowed: true,
            reason: match operation {
                ProjectOperation::Read => ProjectAccessReason::SiteAdminRead,
                ProjectOperation::Update => ProjectAccessReason::SiteAdminUpdate,
            },
        };
    }

    if operation == ProjectOperation::Update {
        if facts.is_organization_admin {
            return ProjectAccessDecision {
                allowed: true,
                reason: ProjectAccessReason::OrganizationAdminUpdate,
            };
        }

        if facts.is_project_manager {
            return ProjectAccessDecision {
                allowed: true,
                reason: ProjectAccessReason::ProjectManagerUpdate,
            };
        }

        return ProjectAccessDecision {
            allowed: false,
            reason: ProjectAccessReason::ProjectUpdateDenied,
        };
    }

    if facts.is_organization_admin {
        return ProjectAccessDecision {
            allowed: true,
            reason: ProjectAccessReason::OrganizationAdminRead,
        };
    }

    if facts.is_project_manager {
        return ProjectAccessDecision {
            allowed: true,
            reason: ProjectAccessReason::ProjectManagerRead,
        };
    }

    if facts.is_project_member {
        return ProjectAccessDecision {
            allowed: true,
            reason: ProjectAccessReason::ProjectMemberRead,
        };
    }

    if facts.project_scope == ProjectScope::Public && !facts.is_guest {
        return ProjectAccessDecision {
            allowed: true,
            reason: ProjectAccessReason::PublicRead,
        };
    }

    if facts.project_scope == ProjectScope::Public {
        return ProjectAccessDecision {
            allowed: false,
            reason: ProjectAccessReason::GuestPublicReadDenied,
        };
    }

    if facts.project_scope == ProjectScope::Protected && facts.is_organization_member {
        return ProjectAccessDecision {
            allowed: true,
            reason: ProjectAccessReason::OrganizationMemberRead,
        };
    }

    ProjectAccessDecision {
        allowed: false,
        reason: ProjectAccessReason::PrivateProjectDenied,
    }
}

pub fn can_request_project_enrollment(
    is_authenticated: bool,
    is_guest: bool,
    is_organization_admin: bool,
    is_organization_member: bool,
    is_project_manager: bool,
    is_project_member: bool,
    is_site_admin: bool,
) -> bool {
    is_authenticated
        && is_guest
        && !is_organization_admin
        && !is_organization_member
        && !is_project_manager
        && !is_project_member
        && !is_site_admin
}

#[cfg(test)]
mod tests {
    use super::*;

    fn facts(project_scope: ProjectScope) -> ProjectAccessFacts {
        ProjectAccessFacts {
            is_anonymous: false,
            is_guest: false,
            is_organization_admin: false,
            is_organization_member: false,
            is_project_manager: false,
            is_project_member: false,
            is_site_admin: false,
            project_scope,
        }
    }

    #[test]
    fn project_read_access_matches_legacy_scope_rules() {
        assert_eq!(
            authorize_project_access(&facts(ProjectScope::Public), ProjectOperation::Read),
            ProjectAccessDecision {
                allowed: true,
                reason: ProjectAccessReason::PublicRead,
            },
        );

        assert_eq!(
            authorize_project_access(&facts(ProjectScope::Protected), ProjectOperation::Read),
            ProjectAccessDecision {
                allowed: false,
                reason: ProjectAccessReason::PrivateProjectDenied,
            },
        );

        let mut organization_member = facts(ProjectScope::Protected);
        organization_member.is_organization_member = true;
        assert_eq!(
            authorize_project_access(&organization_member, ProjectOperation::Read),
            ProjectAccessDecision {
                allowed: true,
                reason: ProjectAccessReason::OrganizationMemberRead,
            },
        );

        assert_eq!(
            authorize_project_access(&facts(ProjectScope::Private), ProjectOperation::Read),
            ProjectAccessDecision {
                allowed: false,
                reason: ProjectAccessReason::PrivateProjectDenied,
            },
        );

        let mut project_member = facts(ProjectScope::Private);
        project_member.is_project_member = true;
        assert_eq!(
            authorize_project_access(&project_member, ProjectOperation::Read),
            ProjectAccessDecision {
                allowed: true,
                reason: ProjectAccessReason::ProjectMemberRead,
            },
        );
    }

    #[test]
    fn site_admin_can_read_and_update_any_project_scope() {
        for project_scope in [
            ProjectScope::Public,
            ProjectScope::Protected,
            ProjectScope::Private,
        ] {
            let mut site_admin = facts(project_scope);
            site_admin.is_site_admin = true;

            assert_eq!(
                authorize_project_access(&site_admin, ProjectOperation::Read),
                ProjectAccessDecision {
                    allowed: true,
                    reason: ProjectAccessReason::SiteAdminRead,
                },
            );
            assert_eq!(
                authorize_project_access(&site_admin, ProjectOperation::Update),
                ProjectAccessDecision {
                    allowed: true,
                    reason: ProjectAccessReason::SiteAdminUpdate,
                },
            );
        }
    }
}
