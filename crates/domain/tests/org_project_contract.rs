use yoram_domain::{
    authorize_project_access, can_create_organization_project, can_create_personal_project,
    can_request_project_enrollment, can_update_organization, is_valid_organization_name,
    is_valid_project_name, ProjectAccessFacts, ProjectOperation, ProjectScope,
};

#[test]
fn organization_name_validation_matches_legacy_examples() {
    assert!(is_valid_organization_name("foo"));
    assert!(!is_valid_organization_name(".foo"));
    assert!(is_valid_organization_name("foo.bar"));
    assert!(!is_valid_organization_name("foo."));
    assert!(!is_valid_organization_name("_foo"));
    assert!(is_valid_organization_name("foo_bar"));
    assert!(!is_valid_organization_name("foo_"));
    assert!(is_valid_organization_name("-foo"));
    assert!(is_valid_organization_name("foo-"));
    assert!(!is_valid_organization_name("foo bar"));
}

#[test]
fn project_name_validation_respects_reserved_and_allowed_patterns() {
    assert!(is_valid_project_name("projectYobi"));
    assert!(is_valid_project_name("HelloSocialApp-1"));
    assert!(!is_valid_project_name("."));
    assert!(!is_valid_project_name(".."));
    assert!(!is_valid_project_name(".git"));
    assert!(!is_valid_project_name("bad name"));
}

#[test]
fn organization_update_authority_is_admin_only() {
    assert!(can_update_organization(true, false));
    assert!(can_update_organization(false, true));
    assert!(!can_update_organization(false, false));
}

#[test]
fn project_access_preserves_public_protected_private_rules() {
    assert_eq!(
        authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: true,
                is_guest: false,
                is_organization_admin: false,
                is_organization_member: false,
                is_project_manager: false,
                is_project_member: false,
                is_site_admin: false,
                project_scope: ProjectScope::Public,
            },
            ProjectOperation::Read,
        )
        .allowed,
        true,
    );
    assert_eq!(
        authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_guest: false,
                is_organization_admin: false,
                is_organization_member: true,
                is_project_manager: false,
                is_project_member: false,
                is_site_admin: false,
                project_scope: ProjectScope::Protected,
            },
            ProjectOperation::Read,
        )
        .allowed,
        true,
    );
    assert_eq!(
        authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_guest: false,
                is_organization_admin: false,
                is_organization_member: true,
                is_project_manager: false,
                is_project_member: false,
                is_site_admin: false,
                project_scope: ProjectScope::Private,
            },
            ProjectOperation::Read,
        )
        .allowed,
        false,
    );
    assert_eq!(
        authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_guest: false,
                is_organization_admin: false,
                is_organization_member: false,
                is_project_manager: true,
                is_project_member: true,
                is_site_admin: false,
                project_scope: ProjectScope::Private,
            },
            ProjectOperation::Update,
        )
        .allowed,
        true,
    );
}

#[test]
fn project_access_denies_nonmember_guest_public_read() {
    assert!(
        !authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_guest: true,
                is_organization_admin: false,
                is_organization_member: false,
                is_project_manager: false,
                is_project_member: false,
                is_site_admin: false,
                project_scope: ProjectScope::Public,
            },
            ProjectOperation::Read,
        )
        .allowed
    );

    assert!(
        authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_guest: true,
                is_organization_admin: false,
                is_organization_member: false,
                is_project_manager: false,
                is_project_member: true,
                is_site_admin: false,
                project_scope: ProjectScope::Public,
            },
            ProjectOperation::Read,
        )
        .allowed
    );
}

#[test]
fn project_creation_rules_distinguish_self_owner_and_org_admin_paths() {
    assert!(can_create_personal_project(Some("door"), "door"));
    assert!(!can_create_personal_project(Some("door"), "weblabs"));
    assert!(!can_create_personal_project(None, "door"));

    assert!(can_create_organization_project(true));
    assert!(!can_create_organization_project(false));
}

#[test]
fn project_enrollment_is_guest_only() {
    assert!(can_request_project_enrollment(
        true, true, false, false, false, false, false
    ));
    assert!(!can_request_project_enrollment(
        false, true, false, false, false, false, false
    ));
    assert!(!can_request_project_enrollment(
        true, false, false, false, false, false, false
    ));
    assert!(!can_request_project_enrollment(
        true, true, true, false, false, false, false
    ));
    assert!(!can_request_project_enrollment(
        true, true, false, true, false, false, false
    ));
    assert!(!can_request_project_enrollment(
        true, true, false, false, true, false, false
    ));
    assert!(!can_request_project_enrollment(
        true, true, false, false, false, true, false
    ));
    assert!(!can_request_project_enrollment(
        true, true, false, false, false, false, true
    ));
}
