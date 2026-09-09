use sea_orm::{ActiveModelTrait, Database, EntityName, Set};
use yoram_migration::Migrator;
use yoram_persistence::{
    user_enrolled_organization, AppRepository, CreateOrganizationInput, CreateProjectInput,
    CreateUserInput, UpdateOrganizationInput, UpdateProjectInput,
};

#[test]
fn project_entity_reexport_preserves_legacy_table_name() {
    assert_eq!(yoram_persistence::project::Entity.table_name(), "project");
}

#[tokio::test]
async fn creates_organizations_and_rewrites_org_owned_project_owner_on_rename() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let repo = AppRepository::new(db);
    let admin = repo
        .create_user(CreateUserInput {
            display_name: "Door".to_string(),
            email_address: "door@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "door".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create admin");

    let organization = repo
        .create_organization(CreateOrganizationInput {
            description: Some("We build web labs".to_string()),
            organization_name: "labs".to_string(),
        })
        .await
        .expect("create organization");
    repo.add_organization_membership(organization.id, admin.id, "org_admin")
        .await
        .expect("grant org admin");

    repo.create_project(CreateProjectInput {
        organization_id: Some(organization.id),
        owner_name: "labs".to_string(),
        overview: Some("org project".to_string()),
        project_name: "projectYobi".to_string(),
        project_scope: "public".to_string(),
        vcs: "GIT".to_string(),
        initial_manager_user_id: None,
    })
    .await
    .expect("create org project");

    let updated = repo
        .update_organization(UpdateOrganizationInput {
            current_organization_name: "labs".to_string(),
            description: Some("renamed".to_string()),
            organization_name: "weblabs".to_string(),
        })
        .await
        .expect("update organization")
        .expect("updated organization");

    assert_eq!(updated.organization_name, "weblabs");
    let project = repo
        .read_project_by_owner_and_name("weblabs", "projectYobi")
        .await
        .expect("read renamed project")
        .expect("renamed project exists");
    assert_eq!(project.owner_name, "weblabs");
    let project = repo
        .update_project(UpdateProjectInput {
            current_owner_name: "weblabs".to_string(),
            current_project_name: "projectYobi".to_string(),
            is_code_accessible_member_only: None,
            overview: Some("org project".to_string()),
            project_name: "ProjectYobiNext".to_string(),
            project_scope: "public".to_string(),
        })
        .await
        .expect("rename project")
        .expect("renamed project exists");
    let own_project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "Door".to_string(),
            overview: None,
            project_name: "ownProject".to_string(),
            project_scope: "private".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .expect("create own project");
    let favorite_organization = repo
        .create_organization(CreateOrganizationInput {
            description: None,
            organization_name: "favorite-labs".to_string(),
        })
        .await
        .expect("create favorite organization");
    let favorite_organization_project = repo
        .create_project(CreateProjectInput {
            organization_id: Some(favorite_organization.id),
            owner_name: "favorite-labs".to_string(),
            overview: None,
            project_name: "favoriteProject".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .expect("create favorite organization project");
    let unrelated_project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "unrelated".to_string(),
            overview: None,
            project_name: "noise".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .expect("create unrelated project");
    let catalog = repo
        .list_workspace_project_catalog(&[project.id], Some("door"), &[favorite_organization.id])
        .await
        .expect("targeted workspace project catalog");
    assert_eq!(catalog.len(), 3);
    assert!(catalog.iter().any(|item| item.id == project.id));
    assert!(catalog.iter().any(|item| item.id == own_project.id));
    assert!(catalog
        .iter()
        .any(|item| item.id == favorite_organization_project.id));
    assert!(!catalog.iter().any(|item| item.id == unrelated_project.id));
    let catalog_project = catalog
        .into_iter()
        .find(|item| item.id == project.id)
        .expect("renamed project in workspace catalog");
    assert_eq!(catalog_project.owner_name, "weblabs");
    assert_eq!(catalog_project.project_name, "ProjectYobiNext");
    assert_eq!(
        catalog_project.previous_owner_name.as_deref(),
        Some("weblabs")
    );
    assert_eq!(
        catalog_project.previous_project_name.as_deref(),
        Some("projectYobi")
    );
}

#[tokio::test]
async fn duplicate_project_memberships_preserve_manager_authority() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let repo = AppRepository::new(db.clone());
    let actor = repo
        .create_user(CreateUserInput {
            display_name: "Manager".to_string(),
            email_address: "manager@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "manager".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create manager");
    let project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "manager".to_string(),
            overview: None,
            project_name: "legacy-roles".to_string(),
            project_scope: "private".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .expect("create project");
    repo.add_project_membership(project.id, actor.id, "manager")
        .await
        .expect("initialize manager role");
    repo.add_project_membership(project.id, actor.id, "member")
        .await
        .expect("retain an earlier member row");
    sea_orm::ConnectionTrait::execute(
        &db,
        sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Sqlite,
            "INSERT INTO project_user (project_id, user_id, role_id) \
             SELECT ?, ?, id FROM role WHERE name = 'manager'",
            [project.id.into(), actor.id.into()],
        ),
    )
    .await
    .expect("restore a second legacy membership");

    let authorization = repo
        .read_project_authorization("manager", "legacy-roles", Some(actor.id))
        .await
        .expect("read authorization")
        .expect("project exists");
    assert!(authorization.viewer.is_project_manager);
    assert!(authorization.viewer.is_project_member);
}

#[tokio::test]
async fn reads_project_members_enrollment_requests_and_workspace_project_lists() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let repo = AppRepository::new(db);
    let manager = repo
        .create_user(CreateUserInput {
            display_name: "Manager".to_string(),
            email_address: "manager@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "manager".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create manager");
    let member = repo
        .create_user(CreateUserInput {
            display_name: "Member".to_string(),
            email_address: "member@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "member".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create member");
    let guest = repo
        .create_user(CreateUserInput {
            display_name: "Guest".to_string(),
            email_address: "guest@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "guest".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create guest");

    let project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "manager".to_string(),
            overview: Some("member directory".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .expect("create project");
    repo.add_project_membership(project.id, manager.id, "manager")
        .await
        .expect("add manager");
    repo.add_project_membership(project.id, member.id, "member")
        .await
        .expect("add member");
    repo.create_project_enrollment_request(project.id, guest.id)
        .await
        .expect("create enrollment");

    let directory = repo
        .read_project_members("manager", "projectYobi")
        .await
        .expect("read member directory");
    assert_eq!(directory.members.len(), 2);
    assert_eq!(directory.enrollment_requests.len(), 1);

    let favorite = repo
        .toggle_favorite_project(guest.id, "manager", "projectYobi")
        .await
        .expect("toggle favorite");
    assert!(favorite.favorited);
    repo.record_recent_project_visit(guest.id, "manager", "projectYobi")
        .await
        .expect("record recent");

    let favorites = repo
        .list_favorite_projects_for_user(guest.id)
        .await
        .expect("list favorites");
    assert_eq!(favorites.len(), 1);
    let recent = repo
        .list_recent_projects_for_user(guest.id)
        .await
        .expect("list recent");
    assert_eq!(recent.len(), 1);

    let unfavorite = repo
        .toggle_favorite_project(guest.id, "manager", "projectYobi")
        .await
        .expect("unfavorite project");
    assert!(!unfavorite.favorited);
    assert!(repo
        .list_favorite_projects_for_user(guest.id)
        .await
        .expect("list favorites after unfavorite")
        .is_empty());
    assert!(repo
        .list_recent_projects_for_user(guest.id)
        .await
        .expect("list recent after unfavorite")
        .is_empty());

    let refavorite = repo
        .toggle_favorite_project(guest.id, "manager", "projectYobi")
        .await
        .expect("refavorite project");
    assert!(refavorite.favorited);
    assert!(repo
        .list_recent_projects_for_user(guest.id)
        .await
        .expect("list recent after refavorite")
        .is_empty());
}

#[tokio::test]
async fn project_member_and_watcher_lists_follow_legacy_user_label_order() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let repo = AppRepository::new(db);
    let admin = repo
        .create_user(CreateUserInput {
            display_name: "Site Admin".to_string(),
            email_address: "admin@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: true,
            login_id: "admin".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create admin");
    let carol = repo
        .create_user(CreateUserInput {
            display_name: "Carol Lee".to_string(),
            email_address: "carol@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "carol".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create carol");

    let project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "admin".to_string(),
            overview: Some("portal parity".to_string()),
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .expect("create project");
    repo.add_project_membership(project.id, admin.id, "manager")
        .await
        .expect("add admin membership");
    repo.add_project_membership(project.id, carol.id, "member")
        .await
        .expect("add carol membership");
    repo.set_project_watch(admin.id, project.id, true)
        .await
        .expect("watch as admin");
    repo.set_project_watch(carol.id, project.id, true)
        .await
        .expect("watch as carol");

    let members = repo
        .read_project_members("admin", "projectYobi")
        .await
        .expect("read project members");
    assert_eq!(
        members
            .members
            .iter()
            .map(|member| member.login_id.as_str())
            .collect::<Vec<_>>(),
        vec!["carol", "admin"]
    );

    let watchers = repo
        .list_project_watchers(project.id)
        .await
        .expect("read project watchers");
    assert_eq!(
        watchers
            .watchers
            .iter()
            .map(|watcher| watcher.login_id.as_str())
            .collect::<Vec<_>>(),
        vec!["carol", "admin"]
    );
}

#[tokio::test]
async fn reads_organization_members_together_with_pending_enrollment_requests() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let repo = AppRepository::new(db.clone());
    let admin = repo
        .create_user(CreateUserInput {
            display_name: "A Admin".to_string(),
            email_address: "org-admin@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "org-admin".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create admin");
    let member = repo
        .create_user(CreateUserInput {
            display_name: "B Member".to_string(),
            email_address: "org-member@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "org-member".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create member");
    let pending = repo
        .create_user(CreateUserInput {
            display_name: "C Pending".to_string(),
            email_address: "org-pending@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "org-pending".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create pending user");
    let accepted = repo
        .create_user(CreateUserInput {
            display_name: "D Accepted".to_string(),
            email_address: "org-accepted@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "org-accepted".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create accepted user");

    let organization = repo
        .create_organization(CreateOrganizationInput {
            description: Some("member organization".to_string()),
            organization_name: "member-org".to_string(),
        })
        .await
        .expect("create organization");
    repo.add_organization_membership(organization.id, admin.id, "org_admin")
        .await
        .expect("add org admin");
    repo.add_organization_membership(organization.id, member.id, "org_member")
        .await
        .expect("add org member");
    repo.add_organization_membership(organization.id, accepted.id, "org_member")
        .await
        .expect("add accepted org member");

    user_enrolled_organization::ActiveModel {
        user_id: Set(pending.id),
        organization_id: Set(organization.id),
    }
    .insert(&db)
    .await
    .expect("insert pending enrollment request");
    user_enrolled_organization::ActiveModel {
        user_id: Set(accepted.id),
        organization_id: Set(organization.id),
    }
    .insert(&db)
    .await
    .expect("insert accepted enrollment request row");

    let directory = repo
        .read_organization_members("member-org")
        .await
        .expect("read org members");

    assert_eq!(
        directory.enrollment_requests,
        vec![yoram_persistence::OrganizationEnrollmentRequestRecord {
            email_address: "org-pending@example.com".to_string(),
            login_id: "org-pending".to_string(),
            user_id: pending.id,
            user_label: "C Pending".to_string(),
        }]
    );
    assert_eq!(
        directory.members,
        vec![
            yoram_persistence::OrganizationMemberRecord {
                email_address: "org-admin@example.com".to_string(),
                login_id: "org-admin".to_string(),
                role: "org_admin".to_string(),
                user_id: admin.id,
                user_label: "A Admin".to_string(),
            },
            yoram_persistence::OrganizationMemberRecord {
                email_address: "org-accepted@example.com".to_string(),
                login_id: "org-accepted".to_string(),
                role: "org_member".to_string(),
                user_id: accepted.id,
                user_label: "D Accepted".to_string(),
            },
            yoram_persistence::OrganizationMemberRecord {
                email_address: "org-member@example.com".to_string(),
                login_id: "org-member".to_string(),
                role: "org_member".to_string(),
                user_id: member.id,
                user_label: "B Member".to_string(),
            },
        ]
    );
}
