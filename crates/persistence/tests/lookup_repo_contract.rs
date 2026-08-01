use sea_orm::{ActiveModelTrait, Database, NotSet, Set};
use yoram_migration::Migrator;
use yoram_persistence::{
    n4user, AppRepository, CreateOrganizationInput, CreateProjectInput, UpdateProjectInput,
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
