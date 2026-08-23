use sea_orm::{ActiveModelTrait, Database, NotSet, Set};
use yoram_migration::Migrator;
use yoram_persistence::{
    n4user, AppRepository, CreateOrganizationInput, CreateProjectInput, CreateUserInput,
    RepositoryConfig, SiteUserListFilter, UpdateProjectInput,
};

#[tokio::test]
async fn lookup_predicates_preserve_case_insensitive_and_previous_project_semantics() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let _mixed_case_user = n4user::ActiveModel {
        id: NotSet,
        name: Set(Some("Mixed Case User".to_string())),
        login_id: Set(Some("MiXeDLogin".to_string())),
        password: Set(Some("hashed".to_string())),
        password_salt: Set(None),
        email: Set(Some("mixed@example.com".to_string())),
        remember_me: Set(Some(0)),
        state: Set(Some("active".to_string())),
        last_state_modified_date: Set(None),
        created_date: Set(None),
        lang: Set(None),
        token: Set(None),
        is_guest: Set(Some(0)),
        english_name: Set(None),
    }
    .insert(&db)
    .await
    .expect("insert mixed-case user");
    let user = AppRepository::new(db.clone())
        .find_user_by_login_id(" mixedlogin ")
        .await
        .expect("find mixed-case user")
        .expect("mixed-case user exists");
    assert_eq!(user.login_id, "MiXeDLogin");

    let repo = AppRepository::new(db);
    let organization = repo
        .create_organization(CreateOrganizationInput {
            description: None,
            organization_name: "MixedOrganization".to_string(),
        })
        .await
        .expect("create organization");
    assert!(repo
        .organization_name_exists(" mixedorganization ")
        .await
        .expect("check organization name"));
    assert_eq!(
        repo.read_organization_by_name("MIXEDORGANIZATION")
            .await
            .expect("read organization")
            .expect("organization exists")
            .id,
        organization.id
    );

    let project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "MixedOwner".to_string(),
            overview: None,
            project_name: "MixedProject".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .expect("create project");
    assert_eq!(
        repo.read_project_by_owner_and_name("mixedowner", "mixedproject")
            .await
            .expect("read project")
            .expect("project exists")
            .id,
        project.id
    );

    let renamed = repo
        .update_project(UpdateProjectInput {
            current_owner_name: "MIXEDOWNER".to_string(),
            current_project_name: "MIXEDPROJECT".to_string(),
            is_code_accessible_member_only: None,
            overview: None,
            project_name: "RenamedProject".to_string(),
            project_scope: "public".to_string(),
        })
        .await
        .expect("rename project")
        .expect("renamed project exists");
    assert_eq!(renamed.id, project.id);

    let previous_alias = repo
        .read_project_by_owner_and_name("MIXEDOWNER", "MIXEDPROJECT")
        .await
        .expect("read previous project location")
        .expect("previous project location exists");
    assert_eq!(previous_alias.id, project.id);
    assert_eq!(previous_alias.project_name, "RenamedProject");
}

#[tokio::test]
async fn site_project_list_filters_and_paginates_in_the_database() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let repo = AppRepository::new(db);

    for index in 0..27 {
        repo.create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "site-owner".to_string(),
            overview: None,
            project_name: format!("site-page-{index:02}"),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .expect("create site-admin project");
    }

    let first_page = repo
        .list_site_projects("", 1)
        .await
        .expect("read first site-admin project page");
    assert_eq!(first_page.page, 1);
    assert_eq!(first_page.page_size, 25);
    assert_eq!(first_page.total, 27);
    assert_eq!(first_page.total_pages, 2);
    assert_eq!(first_page.projects.len(), 25);

    let second_page = repo
        .list_site_projects("", 2)
        .await
        .expect("read second site-admin project page");
    assert_eq!(second_page.projects.len(), 2);

    let filtered = repo
        .list_site_projects("SITE-PAGE-26", 1)
        .await
        .expect("read filtered site-admin project page");
    assert_eq!(filtered.total, 1);
    assert_eq!(filtered.total_pages, 1);
    assert_eq!(filtered.projects.len(), 1);
    assert_eq!(filtered.projects[0].project_name, "site-page-26");
}

#[tokio::test]
async fn site_user_list_filters_and_paginates_in_the_database() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    let repo = AppRepository::new_with_config(
        db,
        RepositoryConfig::from_pairs([("YONA_GUEST_LOGIN_PREFIX", "guest-")]),
    );

    repo.create_user(CreateUserInput {
        display_name: "Initial User".to_string(),
        email_address: "initial@example.test".to_string(),
        is_confirmed: true,
        is_site_admin: false,
        login_id: "initial-user".to_string(),
        password_hash: "hashed".to_string(),
    })
    .await
    .expect("create initial user");

    for index in 0..31 {
        repo.create_user(CreateUserInput {
            display_name: if index == 30 {
                "Needle User".to_string()
            } else {
                format!("Active User {index:02}")
            },
            email_address: format!("active-{index:02}@example.test"),
            is_confirmed: true,
            is_site_admin: index == 0,
            login_id: if index == 30 {
                "needle-user".to_string()
            } else {
                format!("active-{index:02}")
            },
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create active user");
    }

    repo.create_user(CreateUserInput {
        display_name: "Guest User".to_string(),
        email_address: "guest@example.test".to_string(),
        is_confirmed: true,
        is_site_admin: false,
        login_id: "guest-account".to_string(),
        password_hash: "hashed".to_string(),
    })
    .await
    .expect("create guest user");
    repo.create_user(CreateUserInput {
        display_name: "Locked User".to_string(),
        email_address: "locked@example.test".to_string(),
        is_confirmed: false,
        is_site_admin: false,
        login_id: "locked-user".to_string(),
        password_hash: "hashed".to_string(),
    })
    .await
    .expect("create locked user");

    let active_page = repo
        .list_site_users(SiteUserListFilter {
            exclude_site_manager: true,
            page: 1,
            query: String::new(),
            state: "ACTIVE".to_string(),
        })
        .await
        .expect("read active site-admin user page");
    assert_eq!(active_page.page_size, 30);
    assert_eq!(active_page.total, 32);
    assert_eq!(active_page.total_pages, 2);
    assert_eq!(active_page.users.len(), 30);
    assert_eq!(active_page.site_admin_count, 1);

    let active_second_page = repo
        .list_site_users(SiteUserListFilter {
            exclude_site_manager: true,
            page: 2,
            query: String::new(),
            state: "ACTIVE".to_string(),
        })
        .await
        .expect("read second active site-admin user page");
    assert_eq!(active_second_page.users.len(), 2);

    let filtered = repo
        .list_site_users(SiteUserListFilter {
            exclude_site_manager: true,
            page: 1,
            query: "NEEDLE".to_string(),
            state: "ACTIVE".to_string(),
        })
        .await
        .expect("read filtered site-admin user page");
    assert_eq!(filtered.total, 1);
    assert_eq!(filtered.total_pages, 1);
    assert_eq!(filtered.users.len(), 1);
    assert_eq!(filtered.users[0].login_id, "needle-user");

    let guest = repo
        .list_site_users(SiteUserListFilter {
            exclude_site_manager: true,
            page: 1,
            query: String::new(),
            state: "GUEST".to_string(),
        })
        .await
        .expect("read guest site-admin user page");
    assert_eq!(guest.total, 1);
    assert_eq!(guest.users[0].login_id, "guest-account");

    let locked = repo
        .list_site_users(SiteUserListFilter {
            exclude_site_manager: true,
            page: 1,
            query: String::new(),
            state: "LOCKED".to_string(),
        })
        .await
        .expect("read locked site-admin user page");
    assert_eq!(locked.total, 1);
    assert_eq!(locked.users[0].login_id, "locked-user");

    let site_admin = repo
        .list_site_users(SiteUserListFilter {
            exclude_site_manager: true,
            page: 1,
            query: String::new(),
            state: "SITE_ADMIN".to_string(),
        })
        .await
        .expect("read site-admin user page");
    assert_eq!(site_admin.total, 1);
    assert_eq!(site_admin.users[0].is_site_admin, true);
}
