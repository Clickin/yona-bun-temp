use sea_orm::{ConnectionTrait, Database, DatabaseBackend, Statement};
use yoram_migration::Migrator;
use yoram_persistence::{
    AppRepository, CreateIssueInput, CreateProjectInput, CreateUserInput, IssueMutationInput,
    SearchRepositoryInput, SearchScope,
};

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

#[tokio::test]
async fn search_repository_refreshes_sqlite_persistent_fts_index_for_update_and_delete() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");

    let repo = AppRepository::new(db.clone());
    let user = repo
        .create_user(CreateUserInput {
            display_name: "Search User".to_string(),
            email_address: "search-refresh@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "search-refresh".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .expect("create user");

    repo.create_project(CreateProjectInput {
        organization_id: None,
        owner_name: "search-refresh".to_string(),
        overview: Some("Search repository sqlite refresh contract".to_string()),
        project_name: "refreshProject".to_string(),
        project_scope: "public".to_string(),
        vcs: "GIT".to_string(),
    })
    .await
    .expect("create project");

    let issue = repo
        .create_issue(CreateIssueInput {
            actor_display_name: "Search User".to_string(),
            actor_id: user.id,
            actor_login_id: "search-refresh".to_string(),
            owner_name: "search-refresh".to_string(),
            project_name: "refreshProject".to_string(),
            values: IssueMutationInput {
                assignee_login_id: None,
                attachment_ids: Vec::new(),
                body_markdown: "persistent fts body".to_string(),
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: Vec::new(),
                milestone_id: None,
                parent_issue_id: None,
                title: "PersistentToken issue".to_string(),
            },
        })
        .await
        .expect("create issue")
        .expect("created issue");

    let initial = search_issue_keyword(&repo, user.id, "PersistentToken").await;
    assert_eq!(initial.counts.issues, 1);
    assert_eq!(initial.items[0].id, issue.id.to_string());

    db.execute(Statement::from_sql_and_values(
        DatabaseBackend::Sqlite,
        "UPDATE issue SET title = ?, body = ? WHERE id = ?",
        vec![
            "Updated issue".to_string().into(),
            "updated body".to_string().into(),
            issue.id.into(),
        ],
    ))
    .await
    .expect("update source issue");

    let after_update = search_issue_keyword(&repo, user.id, "PersistentToken").await;
    assert_eq!(after_update.counts.issues, 0);
    assert!(after_update.items.is_empty());

    db.execute(Statement::from_sql_and_values(
        DatabaseBackend::Sqlite,
        "UPDATE issue SET title = ?, body = ? WHERE id = ?",
        vec![
            "PersistentToken restored".to_string().into(),
            "restored body".to_string().into(),
            issue.id.into(),
        ],
    ))
    .await
    .expect("restore source issue");

    let after_restore = search_issue_keyword(&repo, user.id, "PersistentToken").await;
    assert_eq!(after_restore.counts.issues, 1);
    assert_eq!(after_restore.items[0].id, issue.id.to_string());
    let restored_body = search_issue_keyword(&repo, user.id, "restored body").await;
    assert_eq!(restored_body.counts.issues, 1);
    assert_eq!(restored_body.items[0].id, issue.id.to_string());

    db.execute(Statement::from_sql_and_values(
        DatabaseBackend::Sqlite,
        "DELETE FROM issue WHERE id = ?",
        vec![issue.id.into()],
    ))
    .await
    .expect("delete source issue");

    let after_delete = search_issue_keyword(&repo, user.id, "PersistentToken").await;
    assert_eq!(after_delete.counts.issues, 0);
    assert!(after_delete.items.is_empty());
}

async fn search_issue_keyword(
    repo: &AppRepository,
    actor_id: i64,
    keyword: &str,
) -> yoram_persistence::SearchResultRecord {
    repo.search_app(SearchRepositoryInput {
        actor_id: Some(actor_id),
        keyword: keyword.to_string(),
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
    .expect("search context")
}
