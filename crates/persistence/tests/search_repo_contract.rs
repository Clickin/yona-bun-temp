use sea_orm::{ConnectionTrait, Database, DatabaseBackend, DatabaseConnection, Statement};
use yoram_migration::Migrator;
use yoram_persistence::{
    AppRepository, CreateIssueInput, CreateOrganizationInput, CreateProjectInput, CreateUserInput,
    IssueMutationInput, SearchRepositoryInput, SearchResultRecord, SearchScope,
};

#[tokio::test]
async fn search_repository_preserves_literal_substring_matches() {
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
        initial_manager_user_id: None,
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
async fn search_repository_reflects_content_update_and_delete() {
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
        initial_manager_user_id: None,
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

async fn legacy_search_fixture() -> (AppRepository, DatabaseConnection, i64, i64) {
    let db = Database::connect("sqlite::memory:").await.unwrap();
    Migrator::fresh(&db).await.unwrap();
    let repo = AppRepository::new(db.clone());
    let user = repo
        .create_user(CreateUserInput {
            display_name: "Search author".to_string(),
            email_address: "author@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "author".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .unwrap();
    let organization = repo
        .create_organization(CreateOrganizationInput {
            description: None,
            organization_name: "search-org".to_string(),
        })
        .await
        .unwrap();
    let project = repo
        .create_project(CreateProjectInput {
            organization_id: Some(organization.id),
            owner_name: "search-org".to_string(),
            overview: None,
            project_name: "documents".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: Some(user.id),
        })
        .await
        .unwrap();
    (repo, db, user.id, project.id)
}

async fn insert_search_documents(
    db: &DatabaseConnection,
    project_id: i64,
    author_id: i64,
    id: i64,
    title: &str,
    body: &str,
    date: &str,
) {
    for table in ["issue", "posting"] {
        db.execute(Statement::from_sql_and_values(
            DatabaseBackend::Sqlite,
            format!("INSERT INTO {table} (id, project_id, author_id, number, title, body, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)"),
            vec![id.into(), project_id.into(), author_id.into(), id.into(), title.into(), body.into(), date.into()],
        )).await.unwrap();
    }
    db.execute(Statement::from_sql_and_values(
        DatabaseBackend::Sqlite,
        "INSERT INTO milestone (id, project_id, title, contents, due_date) VALUES (?, ?, ?, ?, ?)",
        vec![
            id.into(),
            project_id.into(),
            format!("{title} {id}").into(),
            body.into(),
            date.into(),
        ],
    ))
    .await
    .unwrap();
    for (table, parent) in [
        ("issue_comment", "issue_id"),
        ("posting_comment", "posting_id"),
    ] {
        db.execute(Statement::from_sql_and_values(
            DatabaseBackend::Sqlite,
            format!("INSERT INTO {table} (id, {parent}, project_id, author_id, contents, created_date) VALUES (?, ?, ?, ?, ?, ?)"),
            vec![id.into(), id.into(), project_id.into(), author_id.into(), body.into(), date.into()],
        )).await.unwrap();
    }
    db.execute(Statement::from_sql_and_values(
        DatabaseBackend::Sqlite,
        "INSERT INTO comment_thread (id, dtype, project_id, commit_id) VALUES (?, 'nonranged', ?, 'abcdef123456')",
        vec![id.into(), project_id.into()],
    )).await.unwrap();
    db.execute(Statement::from_sql_and_values(
        DatabaseBackend::Sqlite,
        "INSERT INTO review_comment (id, thread_id, author_id, contents, created_date) VALUES (?, ?, ?, ?, ?)",
        vec![id.into(), id.into(), author_id.into(), body.into(), date.into()],
    )).await.unwrap();
}

async fn legacy_search(
    repo: &AppRepository,
    scope: SearchScope,
    actor_id: Option<i64>,
    search_type: &str,
    keyword: &str,
    page_num: u32,
) -> SearchResultRecord {
    repo.search_app(SearchRepositoryInput {
        actor_id,
        keyword: keyword.to_string(),
        organization_name: Some("search-org".to_string()),
        owner_name: Some("search-org".to_string()),
        project_name: Some("documents".to_string()),
        page_num,
        requested_search_type: search_type.to_string(),
        search_type: search_type.to_string(),
        scope,
    })
    .await
    .unwrap()
    .unwrap()
}

fn result_ids(result: &SearchResultRecord) -> Vec<&str> {
    result.items.iter().map(|item| item.id.as_str()).collect()
}

#[tokio::test]
async fn search_preserves_legacy_type_order_without_title_or_repeated_hit_boosts_in_all_scopes() {
    let (repo, db, author_id, project_id) = legacy_search_fixture().await;
    for (id, title, body, date) in [
        (
            1,
            "needle needle needle",
            "needle needle needle",
            "2020-01-01 00:00:00",
        ),
        (2, "needle title", "needle body", "2020-01-02 00:00:00"),
        (3, "new body match", "needle", "2020-01-03 00:00:00"),
    ] {
        insert_search_documents(&db, project_id, author_id, id, title, body, date).await;
    }
    for scope in [
        SearchScope::Global,
        SearchScope::Project,
        SearchScope::Organization,
    ] {
        for search_type in [
            "issue",
            "post",
            "milestone",
            "issue_comment",
            "post_comment",
            "review",
        ] {
            let result = legacy_search(&repo, scope, None, search_type, "needle", 1).await;
            assert_eq!(result.total_count, 3, "{scope:?}/{search_type}");
            assert_eq!(
                result_ids(&result),
                ["3", "2", "1"],
                "{scope:?}/{search_type}"
            );
            assert_eq!(result.counts.issues, 3);
            assert_eq!(result.counts.posts, 3);
            assert_eq!(result.counts.milestones, 3);
            assert_eq!(result.counts.issue_comments, 3);
            assert_eq!(result.counts.post_comments, 3);
            assert_eq!(result.counts.reviews, 3);
            if search_type == "review" {
                assert!(!result.items[0].review_thread_on_pull_request);
                assert_eq!(
                    result.items[0].href,
                    "/search-org/documents/commit/abcdef123456#thread-3"
                );
            }
        }
    }
}

#[tokio::test]
async fn search_requires_literal_multiword_punctuation_whitespace_and_korean_matches() {
    let (repo, db, author_id, project_id) = legacy_search_fixture().await;
    for (id, body) in [
        (1, "alpha beta"),
        (2, "alpha-beta"),
        (3, "alpha   beta"),
        (4, "alpha\tbeta"),
        (5, "CamelNeedle"),
        (6, "앞 검색어 뒤"),
    ] {
        insert_search_documents(
            &db,
            project_id,
            author_id,
            id,
            "unrelated",
            body,
            "2020-01-01 00:00:00",
        )
        .await;
    }
    for (keyword, expected) in [
        ("alpha beta", "1"),
        ("alpha-beta", "2"),
        ("alpha   beta", "3"),
        ("alpha\tbeta", "4"),
        ("Needle", "5"),
        ("검색", "6"),
    ] {
        for search_type in [
            "issue",
            "post",
            "milestone",
            "issue_comment",
            "post_comment",
            "review",
        ] {
            let result =
                legacy_search(&repo, SearchScope::Global, None, search_type, keyword, 1).await;
            assert_eq!(result.total_count, 1, "{search_type}/{keyword:?}");
            assert_eq!(result_ids(&result), [expected], "{search_type}/{keyword:?}");
        }
    }
}

#[tokio::test]
async fn search_paginates_after_legacy_order_and_keeps_counts_in_all_scopes() {
    let (repo, db, author_id, project_id) = legacy_search_fixture().await;
    for id in 1..=21 {
        let title = if id == 1 {
            "needle needle"
        } else {
            "unrelated"
        };
        insert_search_documents(
            &db,
            project_id,
            author_id,
            id,
            title,
            "needle",
            &format!("2020-01-{id:02} 00:00:00"),
        )
        .await;
    }
    for scope in [
        SearchScope::Global,
        SearchScope::Project,
        SearchScope::Organization,
    ] {
        let first = legacy_search(&repo, scope, None, "issue", "needle", 1).await;
        let second = legacy_search(&repo, scope, None, "issue", "needle", 2).await;
        let beyond = legacy_search(&repo, scope, None, "issue", "needle", 3).await;
        assert_eq!(first.total_count, 21);
        assert_eq!(second.total_count, 21);
        assert_eq!(beyond.total_count, 21);
        assert_eq!(first.page_size, 20);
        let expected: Vec<_> = (2..=21).rev().map(|id| id.to_string()).collect();
        assert_eq!(result_ids(&first), expected);
        assert_eq!(result_ids(&second), ["1"]);
        assert!(beyond.items.is_empty());
        let last_possible = legacy_search(&repo, scope, None, "issue", "needle", u32::MAX).await;
        assert_eq!(last_possible.total_count, 21);
        assert!(last_possible.items.is_empty());
    }
}

#[tokio::test]
async fn search_acl_filters_counts_before_paging_without_global_admin_expansion() {
    let (repo, db, author_id, project_id) = legacy_search_fixture().await;
    insert_search_documents(
        &db,
        project_id,
        author_id,
        1,
        "needle",
        "needle",
        "2020-01-01 00:00:00",
    )
    .await;
    let hidden = repo
        .create_project(CreateProjectInput {
            organization_id: repo
                .read_project_by_id(project_id)
                .await
                .unwrap()
                .unwrap()
                .organization_id,
            owner_name: "search-org".to_string(),
            overview: None,
            project_name: "private-documents".to_string(),
            project_scope: "private".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .unwrap();
    insert_search_documents(
        &db,
        hidden.id,
        author_id,
        2,
        "needle needle",
        "needle needle",
        "2020-01-02 00:00:00",
    )
    .await;
    let admin = repo
        .create_user(CreateUserInput {
            display_name: "Admin".to_string(),
            email_address: "admin@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: true,
            login_id: "admin".to_string(),
            password_hash: "hashed".to_string(),
        })
        .await
        .unwrap();
    for scope in [SearchScope::Global, SearchScope::Organization] {
        for search_type in [
            "issue",
            "post",
            "milestone",
            "issue_comment",
            "post_comment",
            "review",
        ] {
            for actor_id in [None, Some(admin.id)] {
                let visible = legacy_search(&repo, scope, actor_id, search_type, "needle", 1).await;
                assert_eq!(
                    visible.total_count, 1,
                    "{scope:?}/{search_type}/{actor_id:?}"
                );
                assert_eq!(result_ids(&visible), ["1"]);
            }
            let authored =
                legacy_search(&repo, scope, Some(author_id), search_type, "needle", 1).await;
            if search_type == "milestone" {
                assert_eq!(result_ids(&authored), ["1"]);
            } else {
                assert_eq!(authored.total_count, 2);
                assert_eq!(result_ids(&authored), ["2", "1"]);
            }
        }
    }
}

#[tokio::test]
async fn user_search_uses_only_name_and_login_and_project_membership() {
    let (repo, db, _, project_id) = legacy_search_fixture().await;
    let organization_id = repo
        .read_project_by_id(project_id)
        .await
        .unwrap()
        .unwrap()
        .organization_id
        .unwrap();
    let mut ids = Vec::new();
    for (login, name, email) in [
        ("needle-login", "A first", "first@example.com"),
        ("last", "Z needle needle", "last@example.com"),
        ("unrelated", "Email only", "needle@example.com"),
    ] {
        let user = repo
            .create_user(CreateUserInput {
                display_name: name.to_string(),
                email_address: email.to_string(),
                is_confirmed: true,
                is_site_admin: false,
                login_id: login.to_string(),
                password_hash: "hashed".to_string(),
            })
            .await
            .unwrap();
        repo.add_organization_membership(organization_id, user.id, "org_member")
            .await
            .unwrap();
        ids.push(user.id);
    }
    db.execute(Statement::from_sql_and_values(
        DatabaseBackend::Sqlite,
        "UPDATE n4user SET english_name = 'needle' WHERE id = ?",
        vec![ids[2].into()],
    ))
    .await
    .unwrap();
    for scope in [SearchScope::Global, SearchScope::Organization] {
        let result = legacy_search(&repo, scope, None, "user", "needle", 1).await;
        assert_eq!(result.total_count, 2);
        assert_eq!(
            result_ids(&result),
            [ids[0].to_string(), ids[1].to_string()]
        );
    }
    let scoped = legacy_search(&repo, SearchScope::Project, None, "user", "needle", 1).await;
    assert_eq!(scoped.total_count, 0);
    assert!(scoped.items.is_empty());
}

#[tokio::test]
async fn project_search_matches_name_or_overview_and_orders_by_name_not_owner() {
    let (repo, _, _, _) = legacy_search_fixture().await;
    let mut ids = Vec::new();
    for (owner, name, overview) in [
        ("a-owner", "z-needle-needle", ""),
        ("z-owner", "a-first", "needle"),
        ("needle-owner", "unrelated", ""),
    ] {
        let project = repo
            .create_project(CreateProjectInput {
                organization_id: None,
                owner_name: owner.to_string(),
                overview: Some(overview.to_string()),
                project_name: name.to_string(),
                project_scope: "public".to_string(),
                vcs: "GIT".to_string(),
                initial_manager_user_id: None,
            })
            .await
            .unwrap();
        ids.push(project.id);
    }
    let result = legacy_search(&repo, SearchScope::Global, None, "project", "needle", 1).await;
    assert_eq!(result.total_count, 2);
    assert_eq!(
        result_ids(&result),
        [ids[1].to_string(), ids[0].to_string()]
    );
}
