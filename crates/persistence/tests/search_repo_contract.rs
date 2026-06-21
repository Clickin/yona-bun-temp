use sea_orm::Database;
use yona_rust_persistence::{
    AppRepository, CreateIssueInput, CreateProjectInput, CreateUserInput, IssueMutationInput,
    SearchRepositoryInput, SearchScope,
};
use yona_rust_pilot_migration::Migrator;

#[tokio::test]
async fn search_repository_preserves_literal_matches_when_sqlite_fts_candidates_are_narrower() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let repo = AppRepository::new(db);
    let user = repo
        .create_user(CreateUserInput {
            display_name: "Search User".to_string(),
            email_address: "search-user@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "search-user".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create user");

    repo.create_project(CreateProjectInput {
        organization_id: None,
        owner_name: "search-user".to_string(),
        overview: Some("Search repository sqlite contract".to_string()),
        project_name: "projectYobi".to_string(),
        project_scope: "public".to_string(),
        vcs: "GIT".to_string(),
    })
    .await
    .expect("create project");

    repo.create_issue(CreateIssueInput {
        actor_display_name: "Search User".to_string(),
        actor_id: user.id,
        actor_login_id: "search-user".to_string(),
        owner_name: "search-user".to_string(),
        project_name: "projectYobi".to_string(),
        values: IssueMutationInput {
            assignee_login_id: None,
            attachment_ids: Vec::new(),
            body_markdown: "legacy CamelNeedle substring body".to_string(),
            due_date: None,
            is_draft: false,
            is_publish: false,
            label_ids: Vec::new(),
            milestone_id: None,
            parent_issue_id: None,
            title: "Literal fallback issue".to_string(),
        },
    })
    .await
    .expect("create issue");

    let result = repo
        .search_app(SearchRepositoryInput {
            actor_id: Some(user.id),
            keyword: "Needle".to_string(),
            organization_name: None,
            owner_name: None,
            page_num: 1,
            project_name: None,
            requested_search_type: "issue".to_string(),
            search_type: "issue".to_string(),
            scope: SearchScope::Global,
        })
        .await
        .expect("search")
        .expect("search context");

    assert_eq!(result.counts.issues, 1);
    assert_eq!(result.items.len(), 1);
    assert_eq!(result.items[0].title, "Literal fallback issue");
}
