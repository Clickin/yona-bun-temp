use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, NotSet, QueryFilter,
    Set,
};
use yona_rust_persistence::{
    comment_thread, email, original_email, AppRepository, CreateIssueCommentViaEmailInput,
    CreateIssueViaEmailInput, CreateProjectInput, CreateReviewCommentViaEmailInput,
    CreateUserInput,
};
use yona_rust_pilot_migration::Migrator;

async fn build_repository() -> (AppRepository, DatabaseConnection) {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    Migrator::fresh(&db).await.expect("fresh migration");
    (AppRepository::new(db.clone()), db)
}

async fn original_email_exists(
    db: &DatabaseConnection,
    resource_type: &str,
    resource_id: i64,
    message_id: &str,
) -> bool {
    original_email::Entity::find()
        .filter(original_email::Column::ResourceType.eq(Some(resource_type.to_string())))
        .filter(original_email::Column::ResourceId.eq(Some(resource_id.to_string())))
        .filter(original_email::Column::MessageId.eq(Some(message_id.to_string())))
        .one(db)
        .await
        .unwrap()
        .is_some()
}

#[tokio::test]
async fn mailbox_creation_via_email_creates_issue_comment_and_review_comment_resources() {
    let (repo, db) = build_repository().await;
    let member = repo
        .create_user(CreateUserInput {
            display_name: "Mailbox Member".to_string(),
            email_address: "member@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "member".to_string(),
            password_hash: "pw".to_string(),
        })
        .await
        .unwrap();
    let project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "yobi".to_string(),
            overview: None,
            project_name: "projectYobi".to_string(),
            project_scope: "public".to_string(),
        })
        .await
        .unwrap();

    let issue = repo
        .create_issue_via_email(CreateIssueViaEmailInput {
            actor_display_name: member.display_name.clone(),
            actor_id: member.id,
            actor_login_id: member.login_id.clone(),
            body_markdown: "body".to_string(),
            message_id: "<message-id@domain>".to_string(),
            owner_name: "yobi".to_string(),
            project_name: "projectYobi".to_string(),
            title: "title".to_string(),
        })
        .await
        .unwrap()
        .expect("issue via email");
    assert_eq!(issue.author_id, Some(member.id));
    assert_eq!(issue.title, "title");
    assert_eq!(issue.body_markdown, "body");
    assert!(original_email_exists(&db, "ISSUE_POST", issue.id, "<message-id@domain>").await);

    let issue_with_comment = repo
        .create_issue_comment_via_email(CreateIssueCommentViaEmailInput {
            actor_display_name: member.display_name.clone(),
            actor_id: member.id,
            actor_login_id: member.login_id.clone(),
            contents_markdown: "comment body".to_string(),
            issue_number: issue.issue_number,
            message_id: "<message-id-2@domain>".to_string(),
            owner_name: "yobi".to_string(),
            project_name: "projectYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("issue comment via email");
    let issue_comment = issue_with_comment
        .comments
        .iter()
        .find(|comment| comment.contents_markdown == "comment body")
        .expect("created issue comment");
    assert_eq!(issue_comment.author_id, Some(member.id));
    assert!(issue_comment.via_email);
    assert!(
        original_email_exists(
            &db,
            "ISSUE_COMMENT",
            issue_comment.id,
            "<message-id-2@domain>"
        )
        .await
    );

    let thread = comment_thread::ActiveModel {
        dtype: Set("NonRangedCodeCommentThread".to_string()),
        id: NotSet,
        author_id: Set(Some(member.id)),
        author_login_id: Set(Some(member.login_id.clone())),
        author_name: Set(Some(member.display_name.clone())),
        state: Set(Some("open".to_string())),
        created_date: Set(None),
        pull_request_id: Set(None),
        project_id: Set(Some(project.id)),
        prev_commit_id: Set(None),
        commit_id: Set(Some("123321".to_string())),
        path: Set(None),
        start_side: Set(None),
        start_line: Set(None),
        start_column: Set(None),
        end_side: Set(None),
        end_line: Set(None),
        end_column: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();

    let review_thread = repo
        .create_review_comment_via_email(CreateReviewCommentViaEmailInput {
            actor_display_name: member.display_name.clone(),
            actor_id: member.id,
            actor_login_id: member.login_id.clone(),
            contents_markdown: "review body".to_string(),
            message_id: "<message-id-3@domain>".to_string(),
            thread_id: thread.id,
        })
        .await
        .unwrap()
        .expect("review comment via email");
    let review_comment = review_thread
        .comments
        .iter()
        .find(|comment| comment.contents_markdown == "review body")
        .expect("created review comment");
    assert_eq!(review_comment.author_id, Some(member.id));
    assert_eq!(review_comment.thread_id, thread.id);
    assert!(review_comment.via_email);
    assert!(
        original_email_exists(
            &db,
            "REVIEW_COMMENT",
            review_comment.id,
            "<message-id-3@domain>"
        )
        .await
    );

    let reply_targets = repo
        .find_mailbox_reply_targets_by_message_ids(&[
            "<message-id-2@domain>".to_string(),
            "<message-id-3@domain>".to_string(),
            "<message-id-2@domain>".to_string(),
        ])
        .await
        .unwrap();
    assert_eq!(reply_targets.len(), 2);
    assert_eq!(reply_targets[0].resource_type, "ISSUE_COMMENT");
    assert_eq!(reply_targets[0].resource_id, issue_comment.id);
    assert_eq!(reply_targets[1].resource_type, "REVIEW_COMMENT");
    assert_eq!(reply_targets[1].resource_id, review_comment.id);

    let path_fallback_targets = repo
        .find_mailbox_reply_targets_by_message_ids(&[
            format!("<issue_post/{}@yona.local>", issue.id),
            format!("<comment_thread/{}@yona.local>", thread.id),
            "<issue_post/not-a-number@yona.local>".to_string(),
            "<unknown/1@yona.local>".to_string(),
        ])
        .await
        .unwrap();
    assert_eq!(path_fallback_targets.len(), 2);
    assert_eq!(path_fallback_targets[0].resource_type, "issue_post");
    assert_eq!(path_fallback_targets[0].resource_id, issue.id);
    assert_eq!(path_fallback_targets[1].resource_type, "comment_thread");
    assert_eq!(path_fallback_targets[1].resource_id, thread.id);
}

#[tokio::test]
async fn mailbox_sender_lookup_matches_legacy_from_address_order() {
    let (repo, db) = build_repository().await;
    let member = repo
        .create_user(CreateUserInput {
            display_name: "Mailbox Member".to_string(),
            email_address: "member@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "member".to_string(),
            password_hash: "pw".to_string(),
        })
        .await
        .unwrap();
    let secondary_owner = repo
        .create_user(CreateUserInput {
            display_name: "Secondary Owner".to_string(),
            email_address: "owner@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "owner".to_string(),
            password_hash: "pw".to_string(),
        })
        .await
        .unwrap();

    email::ActiveModel {
        id: NotSet,
        user_id: Set(Some(secondary_owner.id)),
        email: Set(Some("alias@example.com".to_string())),
        valid: Set(Some(1)),
        token: Set(None),
    }
    .insert(&db)
    .await
    .unwrap();
    email::ActiveModel {
        id: NotSet,
        user_id: Set(Some(member.id)),
        email: Set(Some("unconfirmed@example.com".to_string())),
        valid: Set(Some(0)),
        token: Set(Some("token".to_string())),
    }
    .insert(&db)
    .await
    .unwrap();

    let first_matching_sender = repo
        .find_mailbox_sender_by_from_addresses(&[
            "missing@example.com".to_string(),
            "MEMBER@example.com".to_string(),
            "alias@example.com".to_string(),
        ])
        .await
        .unwrap()
        .expect("first matching sender");
    assert_eq!(first_matching_sender.id, member.id);

    let secondary_sender = repo
        .find_mailbox_sender_by_from_addresses(&["alias@example.com".to_string()])
        .await
        .unwrap()
        .expect("valid secondary sender");
    assert_eq!(secondary_sender.id, secondary_owner.id);

    assert!(repo
        .find_mailbox_sender_by_from_addresses(&["unconfirmed@example.com".to_string()])
        .await
        .unwrap()
        .is_none());
    assert!(repo
        .find_mailbox_sender_by_from_addresses(&["missing@example.com".to_string()])
        .await
        .unwrap()
        .is_none());
}
