use axum::body::Body;
use base64::{engine::general_purpose, Engine as _};
use http::{Request, StatusCode};
use http_body_util::BodyExt;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, Database, DatabaseConnection, EntityTrait,
    NotSet, QueryFilter, Set,
};
use std::collections::BTreeMap;
use tower::ServiceExt;
use yoram_integrations::{MailboxMimePart, MailboxParsedMessageInput};
use yoram_migration::Migrator;
use yoram_persistence::{
    comment_thread, email, original_email, AppRepository, CreateIssueCommentViaEmailInput,
    CreateIssueViaEmailInput, CreatePostingCommentViaEmailInput, CreatePostingInput,
    CreateProjectInput, CreateReviewCommentViaEmailInput, CreateUserInput,
    MailboxActionExecutionInput, MailboxNormalizedMessageInput, MailboxReplyTargetRecord,
    PostingMutationInput,
};
use yoram_server::runtime_config::load_startup_config;
use yoram_server::{
    mailbox_polling_config_from_startup, poll_mailbox_scheduler_tick,
    process_mailbox_parsed_message, process_mailbox_raw_message, MailboxPollingConfig,
};

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

#[test]
fn mailbox_polling_config_reexport_preserves_default_scheduler_shape() {
    assert_eq!(
        MailboxPollingConfig::default(),
        MailboxPollingConfig {
            enabled: false,
            fetch_command: String::new(),
            imap_address: "noreply@yoram.local".to_string(),
            initial_delay_ms: 5_000,
            interval_ms: 60_000,
        }
    );
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
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
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

    let posting = repo
        .create_posting(CreatePostingInput {
            actor_display_name: member.display_name.clone(),
            actor_id: member.id,
            actor_login_id: member.login_id.clone(),
            owner_name: "yobi".to_string(),
            project_name: "projectYobi".to_string(),
            values: PostingMutationInput {
                attachment_ids: Vec::new(),
                body_markdown: "posting body".to_string(),
                label_ids: Vec::new(),
                notice: false,
                readme: false,
                title: "posting title".to_string(),
            },
        })
        .await
        .unwrap()
        .expect("posting");
    let posting_with_comment = repo
        .create_posting_comment_via_email(CreatePostingCommentViaEmailInput {
            actor_display_name: member.display_name.clone(),
            actor_id: member.id,
            actor_login_id: member.login_id.clone(),
            contents_markdown: "posting comment body".to_string(),
            message_id: "<message-id-board-comment@domain>".to_string(),
            owner_name: "yobi".to_string(),
            post_number: posting.post_number,
            project_name: "projectYobi".to_string(),
        })
        .await
        .unwrap()
        .expect("posting comment via email");
    let posting_comment = posting_with_comment
        .comments
        .iter()
        .find(|comment| comment.contents_markdown == "posting comment body")
        .expect("created posting comment");
    assert_eq!(posting_comment.author_id, Some(member.id));
    assert!(posting_comment.via_email);
    assert!(
        original_email_exists(
            &db,
            "NONISSUE_COMMENT",
            posting_comment.id,
            "<message-id-board-comment@domain>"
        )
        .await
    );

    let thread = comment_thread::ActiveModel {
        dtype: Set("non_ranged".to_string()),
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

    let empty_project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "yobi".to_string(),
            overview: None,
            project_name: "projectWithoutThread".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .unwrap();
    let actions = repo
        .plan_mailbox_resource_actions(
            &[project.clone(), empty_project.clone()],
            &[
                MailboxReplyTargetRecord {
                    resource_id: review_comment.id,
                    resource_type: "review_comment".to_string(),
                },
                MailboxReplyTargetRecord {
                    resource_id: issue.id,
                    resource_type: "issue_post".to_string(),
                },
            ],
        )
        .await
        .unwrap();
    assert_eq!(actions.len(), 3);
    assert_eq!(actions[0].action, "create_review_comment");
    assert_eq!(actions[0].owner_name, "yobi");
    assert_eq!(actions[0].project_name, "projectYobi");
    assert_eq!(actions[0].resource_type.as_deref(), Some("comment_thread"));
    assert_eq!(actions[0].resource_id, Some(thread.id));
    assert_eq!(actions[1].action, "create_issue_comment");
    assert_eq!(actions[1].resource_type.as_deref(), Some("issue_post"));
    assert_eq!(actions[1].resource_id, Some(issue.id));
    assert_eq!(actions[2].action, "create_issue");
    assert_eq!(actions[2].project_name, "projectWithoutThread");
    assert_eq!(actions[2].resource_type, None);
    assert_eq!(actions[2].resource_id, None);

    let normalized = repo
        .process_mailbox_normalized_message(MailboxNormalizedMessageInput {
            attachments: Vec::new(),
            base_path: String::new(),
            content_type: "text/plain".into(),
            body_markdown: "normalized reply body".to_string(),
            from_addresses: vec!["MEMBER@example.com".to_string()],
            message_id: "<message-id-normalized@domain>".to_string(),
            recipient_details: vec!["yobi/projectYobi".to_string()],
            reply_message_ids: vec!["<message-id-3@domain>".to_string()],
            title: "normalized title".to_string(),
        })
        .await
        .unwrap();
    assert_eq!(normalized.status, "processed");
    assert_eq!(normalized.sender_id, Some(member.id));
    assert_eq!(normalized.actions.len(), 1);
    assert_eq!(normalized.actions[0].action, "create_review_comment");
    assert_eq!(normalized.actions[0].status, "created");
    let normalized_targets = repo
        .find_mailbox_reply_targets_by_message_ids(&["<message-id-normalized@domain>".to_string()])
        .await
        .unwrap();
    assert_eq!(normalized_targets.len(), 1);
    assert_eq!(normalized_targets[0].resource_type, "REVIEW_COMMENT");

    let parsed = process_mailbox_parsed_message(
        &repo,
        std::path::Path::new("."),
        "",
        MailboxParsedMessageInput {
            from_addresses: vec!["member@example.com".to_string()],
            imap_address: "noreply@yona.local".to_string(),
            in_reply_to: Some("<message-id-3@domain>".to_string()),
            message_id: "<message-id-parsed@domain>".to_string(),
            recipients: vec!["noreply+yobi/projectYobi@yona.local".to_string()],
            references: Vec::new(),
            root_part: MailboxMimePart {
                body: b"parsed reply body".to_vec(),
                filename: None,
                content_id: None,
                content_type: "text/plain; charset=UTF-8".to_string(),
                parts: Vec::new(),
            },
            subject: "parsed title".to_string(),
        },
    )
    .await
    .unwrap();
    assert_eq!(parsed.status, "processed");
    assert_eq!(parsed.sender_id, Some(member.id));
    assert_eq!(parsed.actions.len(), 1);
    assert_eq!(parsed.actions[0].action, "create_review_comment");
    assert_eq!(parsed.actions[0].status, "created");
    let parsed_targets = repo
        .find_mailbox_reply_targets_by_message_ids(&["<message-id-parsed@domain>".to_string()])
        .await
        .unwrap();
    assert_eq!(parsed_targets.len(), 1);
    assert_eq!(parsed_targets[0].resource_type, "REVIEW_COMMENT");

    let raw = process_mailbox_raw_message(
        &repo,
        std::path::Path::new("."),
        "",
        concat!(
            "Message-ID: <message-id-raw@domain>\r\n",
            "Subject: raw title\r\n",
            "From: Mailbox Member <member@example.com>\r\n",
            "To: noreply+yobi/projectYobi@yona.local\r\n",
            "In-Reply-To: <message-id-3@domain>\r\n",
            "Content-Type: multipart/alternative; boundary=\"raw-boundary\"\r\n",
            "\r\n",
            "--raw-boundary\r\n",
            "Content-Type: text/html; charset=UTF-8\r\n",
            "\r\n",
            "<p>raw html body</p>\r\n",
            "--raw-boundary\r\n",
            "Content-Type: text/plain; charset=UTF-8\r\n",
            "Content-Transfer-Encoding: quoted-printable\r\n",
            "\r\n",
            "raw=20reply=20body\r\n",
            "--raw-boundary--\r\n",
        ),
        "noreply@yona.local",
    )
    .await
    .unwrap();
    assert_eq!(raw.status, "processed");
    assert_eq!(raw.sender_id, Some(member.id));
    assert_eq!(raw.actions.len(), 1);
    assert_eq!(raw.actions[0].action, "create_review_comment");
    assert_eq!(raw.actions[0].status, "created");
    let raw_targets = repo
        .find_mailbox_reply_targets_by_message_ids(&["<message-id-raw@domain>".to_string()])
        .await
        .unwrap();
    assert_eq!(raw_targets.len(), 1);
    assert_eq!(raw_targets[0].resource_type, "REVIEW_COMMENT");

    let no_sender = repo
        .process_mailbox_normalized_message(MailboxNormalizedMessageInput {
            attachments: Vec::new(),
            base_path: String::new(),
            content_type: "text/plain".into(),
            body_markdown: "body".to_string(),
            from_addresses: vec!["missing@example.com".to_string()],
            message_id: "<message-id-no-sender@domain>".to_string(),
            recipient_details: vec!["yobi/projectYobi".to_string()],
            reply_message_ids: Vec::new(),
            title: "title".to_string(),
        })
        .await
        .unwrap();
    assert_eq!(no_sender.status, "no_sender");
    assert_eq!(no_sender.sender_id, None);
    assert!(no_sender.actions.is_empty());

    let no_project = repo
        .process_mailbox_normalized_message(MailboxNormalizedMessageInput {
            attachments: Vec::new(),
            base_path: String::new(),
            content_type: "text/plain".into(),
            body_markdown: "body".to_string(),
            from_addresses: vec!["member@example.com".to_string()],
            message_id: "<message-id-no-project@domain>".to_string(),
            recipient_details: vec!["help".to_string(), "missing/project".to_string()],
            reply_message_ids: Vec::new(),
            title: "title".to_string(),
        })
        .await
        .unwrap();
    assert_eq!(no_project.status, "no_project");
    assert_eq!(no_project.sender_id, Some(member.id));
    assert!(no_project.actions.is_empty());

    let execution = repo
        .execute_mailbox_resource_actions(
            &actions,
            MailboxActionExecutionInput {
                attachments: Vec::new(),
                base_path: String::new(),
                content_type: "text/plain".into(),
                actor_display_name: member.display_name.clone(),
                actor_id: member.id,
                actor_login_id: member.login_id.clone(),
                body_markdown: "reply execution body".to_string(),
                message_id: "<message-id-execution@domain>".to_string(),
                title: "execution title".to_string(),
            },
        )
        .await
        .unwrap();
    assert_eq!(execution.len(), 3);
    assert_eq!(execution[0].status, "created");
    assert_eq!(execution[1].status, "created");
    assert_eq!(execution[2].status, "created");
    let executed_review_thread = repo
        .find_mailbox_reply_targets_by_message_ids(&["<message-id-execution@domain>".to_string()])
        .await
        .unwrap();
    assert_eq!(executed_review_thread.len(), 1);
    assert!(executed_review_thread
        .iter()
        .any(|target| target.resource_type == "REVIEW_COMMENT"));
    let created_issue = repo
        .read_issue_detail("yobi", "projectWithoutThread", 1)
        .await
        .unwrap()
        .expect("created issue from fallback");
    assert_eq!(created_issue.title, "execution title");
    assert!(
        !original_email_exists(
            &db,
            "ISSUE_POST",
            created_issue.id,
            "<message-id-execution@domain>"
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

    let detail_targets = repo
        .find_mailbox_reply_targets_by_details(&[
            format!("yobi/projectYobi/comment_thread/{}", thread.id),
            format!("yobi/projectYobi/issue_post/{}", issue.id),
            format!("yobi/projectYobi/COMMENT_THREAD/{}", thread.id),
            format!("yobi/projectYobi/ISSUE_POST/{}", issue.id),
            format!("yobi/projectYobi/comment_thread/{}", thread.id),
            "yobi/projectYobi/issue_post/not-a-number".to_string(),
            "yobi/projectYobi/unknown/1".to_string(),
            "yobi/projectYobi".to_string(),
        ])
        .await
        .unwrap();
    assert_eq!(detail_targets.len(), 2);
    assert_eq!(detail_targets[0].resource_type, "comment_thread");
    assert_eq!(detail_targets[0].resource_id, thread.id);
    assert_eq!(detail_targets[1].resource_type, "issue_post");
    assert_eq!(detail_targets[1].resource_id, issue.id);

    let legacy_enum_detail_targets = repo
        .find_mailbox_reply_targets_by_details(&[
            format!("yobi/projectYobi/COMMENT_THREAD/{}", thread.id),
            format!("yobi/projectYobi/ISSUE_POST/{}", issue.id),
        ])
        .await
        .unwrap();
    assert_eq!(legacy_enum_detail_targets.len(), 2);
    assert_eq!(
        legacy_enum_detail_targets[0].resource_type,
        "comment_thread"
    );
    assert_eq!(legacy_enum_detail_targets[0].resource_id, thread.id);
    assert_eq!(legacy_enum_detail_targets[1].resource_type, "issue_post");
    assert_eq!(legacy_enum_detail_targets[1].resource_id, issue.id);
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

#[tokio::test]
async fn mailbox_processing_keeps_message_id_idempotent() {
    let (repo, _) = build_repository().await;
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
    repo.create_project(CreateProjectInput {
        organization_id: None,
        owner_name: "mailbox".to_string(),
        overview: None,
        project_name: "projectYobi".to_string(),
        project_scope: "public".to_string(),
        vcs: "GIT".to_string(),
        initial_manager_user_id: None,
    })
    .await
    .unwrap();
    let issue = repo
        .create_issue_via_email(CreateIssueViaEmailInput {
            actor_display_name: member.display_name.clone(),
            actor_id: member.id,
            actor_login_id: member.login_id.clone(),
            body_markdown: "seed body".to_string(),
            message_id: "<seed-message@domain>".to_string(),
            owner_name: "mailbox".to_string(),
            project_name: "projectYobi".to_string(),
            title: "seed title".to_string(),
        })
        .await
        .unwrap()
        .expect("seed issue via email");

    let first = repo
        .process_mailbox_normalized_message(MailboxNormalizedMessageInput {
            attachments: Vec::new(),
            base_path: String::new(),
            content_type: "text/plain".into(),
            body_markdown: "reply body".to_string(),
            from_addresses: vec!["member@example.com".to_string()],
            message_id: "<duplicate-message@domain>".to_string(),
            recipient_details: vec!["mailbox/projectYobi".to_string()],
            reply_message_ids: vec!["<seed-message@domain>".to_string()],
            title: "reply title".to_string(),
        })
        .await
        .unwrap();
    assert_eq!(first.status, "processed");
    assert_eq!(first.actions.len(), 1);
    assert_eq!(first.actions[0].status, "created");

    let second = repo
        .process_mailbox_normalized_message(MailboxNormalizedMessageInput {
            attachments: Vec::new(),
            base_path: String::new(),
            content_type: "text/plain".into(),
            body_markdown: "reply body".to_string(),
            from_addresses: vec!["member@example.com".to_string()],
            message_id: "<duplicate-message@domain>".to_string(),
            recipient_details: vec!["mailbox/projectYobi".to_string()],
            reply_message_ids: vec!["<seed-message@domain>".to_string()],
            title: "reply title".to_string(),
        })
        .await
        .unwrap();
    assert_eq!(second.status, "duplicate");
    assert_eq!(second.sender_id, Some(member.id));
    assert!(second.actions.is_empty());

    let detail = repo
        .read_issue_detail("mailbox", "projectYobi", issue.issue_number)
        .await
        .unwrap()
        .expect("issue detail");
    let reply_comments = detail
        .comments
        .iter()
        .filter(|comment| comment.contents_markdown == "reply body")
        .count();
    assert_eq!(reply_comments, 1);
}

async fn mailbox_register(app: axum::Router, login: &str) -> (String, i64) {
    let session = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/yona/api/auth/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let csrf = session.headers()["x-csrf-token"]
        .to_str()
        .unwrap()
        .to_string();
    let cookie = session
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().split(';').next().unwrap())
        .collect::<Vec<_>>()
        .join("; ");
    let response = app.oneshot(Request::builder().method("POST")
        .uri("/yona/api/v1/auth/register")
        .header("cookie", &cookie).header("x-csrf-token", csrf)
        .header("content-type", "application/json")
        .body(Body::from(serde_json::json!({
            "loginId": login, "name": login, "emailAddress": format!("{login}@example.com"),
            "password": "doorpass1", "retypedPassword": "doorpass1"
        }).to_string())).unwrap()).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let cookie = response
        .headers()
        .get_all(http::header::SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().split(';').next().unwrap())
        .collect::<Vec<_>>()
        .join("; ");
    let body: serde_json::Value =
        serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    let id = body["actorId"]
        .as_i64()
        .or_else(|| body["actorId"].as_str()?.parse().ok())
        .unwrap();
    (cookie, id)
}

fn mailbox_attachment_message(message_id: &str, reply_to: Option<&str>) -> String {
    format!(
        "Message-ID: <{message_id}@example.com>\r\n\
         Subject: MIME files\r\n\
         From: member@example.com\r\n\
         To: noreply+member/private@yona.local\r\n\
         {}\
         MIME-Version: 1.0\r\n\
         Content-Type: multipart/mixed; boundary=\"outer\"\r\n\r\n\
         --outer\r\n\
         Content-Type: multipart/related; boundary=\"related\"\r\n\r\n\
         --related\r\n\
         Content-Type: text/html; charset=UTF-8\r\n\r\n\
         <p>Mail image</p><div data-label=\"a > b\" src=\"cid:picture@example.com\"></div><a title='a < b' href='CID:picture@example.com'>image</a>\r\n\
         --related\r\n\
         Content-Type: image/png; name=\"picture.png\"\r\n\
         Content-Disposition: inline; filename=\"picture.png\"\r\n\
         Content-ID: <picture@example.com>\r\n\
         Content-Transfer-Encoding: base64\r\n\r\n\
         iVBORw0KGgoA/w==\r\n\
         --related--\r\n\
         --outer\r\n\
         Content-Type: text/plain; charset=UTF-8\r\n\
         Content-Disposition: attachment; filename=\"notes.txt\"\r\n\
         Content-Transfer-Encoding: quoted-printable\r\n\r\n\
         original=00=FF=0D=0A\r\n\
         --outer--\r\n",
        reply_to.map(|id| format!("In-Reply-To: <{id}@example.com>\r\n")).unwrap_or_default()
    )
}

#[tokio::test]
async fn mailbox_rfc822_attachments_survive_issue_reply_deduplication_and_acl() {
    let directory = tempfile::tempdir().unwrap();
    let (repo, db) = build_repository().await;
    let app = yoram_server::create_router_with_repository_and_app_config(
        yoram_server::RuntimeConfig {
            allow_anonymous_access: true,
            base_path: "/yona".into(),
            public_origin: String::new(),
        },
        repo.clone(),
        yoram_server::AppRuntimeConfig {
            data_root: directory.path().to_path_buf(),
            ..Default::default()
        },
    );
    let (member_cookie, member_id) = mailbox_register(app.clone(), "member").await;
    let (outsider_cookie, _) = mailbox_register(app.clone(), "outsider").await;
    repo.create_project(CreateProjectInput {
        organization_id: None,
        owner_name: "member".into(),
        overview: None,
        project_name: "private".into(),
        project_scope: "private".into(),
        vcs: "GIT".into(),
        initial_manager_user_id: Some(member_id),
    })
    .await
    .unwrap();

    for (message, reply, container) in [
        ("issue-files", None, "ISSUE_POST"),
        ("reply-files", Some("issue-files"), "ISSUE_COMMENT"),
    ] {
        let raw = mailbox_attachment_message(message, reply);
        let result = process_mailbox_raw_message(
            &repo,
            directory.path(),
            "/yona",
            &raw,
            "noreply@yona.local",
        )
        .await
        .unwrap();
        assert_eq!(result.status, "processed");
        let target = repo
            .find_mailbox_reply_targets_by_message_ids(&[format!("<{message}@example.com>")])
            .await
            .unwrap()
            .remove(0);
        assert_eq!(target.resource_type, container);
        let attachments = repo
            .list_attachments_by_container(container, target.resource_id)
            .await
            .unwrap();
        assert_eq!(
            attachments
                .iter()
                .map(|file| file.name.as_str())
                .collect::<Vec<_>>(),
            ["picture.png", "notes.txt"]
        );
        let issue = repo
            .read_issue_detail("member", "private", 1)
            .await
            .unwrap()
            .unwrap();
        let body = if reply.is_some() {
            &issue.comments[0].contents_markdown
        } else {
            &issue.body_markdown
        };
        let image_url = format!("/yona/files/{}", attachments[0].id);
        assert!(body.contains(&format!("src=\"{image_url}\"")));
        assert!(body.contains(&format!("href='{image_url}'")));
        assert!(body.contains("data-label=\"a > b\""));
        assert!(body.contains("title='a < b'"));
        assert!(!body.contains("original"));
        assert!(!body.to_ascii_lowercase().contains("cid:"));
        for (file, expected) in attachments.iter().zip([
            b"\x89PNG\r\n\x1a\n\0\xff".as_slice(),
            b"original\0\xff\r\n".as_slice(),
        ]) {
            let uri = format!("/yona/files/{}", file.id);
            let allowed = app
                .clone()
                .oneshot(
                    Request::builder()
                        .uri(&uri)
                        .header("cookie", &member_cookie)
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(allowed.status(), StatusCode::OK);
            assert_eq!(
                allowed
                    .into_body()
                    .collect()
                    .await
                    .unwrap()
                    .to_bytes()
                    .as_ref(),
                expected
            );
            let denied = app
                .clone()
                .oneshot(
                    Request::builder()
                        .uri(&uri)
                        .header("cookie", &outsider_cookie)
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(denied.status(), StatusCode::FORBIDDEN);
        }
        assert_eq!(
            process_mailbox_raw_message(
                &repo,
                directory.path(),
                "/yona",
                &raw,
                "noreply@yona.local"
            )
            .await
            .unwrap()
            .status,
            "duplicate"
        );
        assert_eq!(
            repo.list_attachments_by_container(container, target.resource_id)
                .await
                .unwrap(),
            attachments
        );
    }
    assert_eq!(
        yoram_persistence::issue::Entity::find()
            .all(&db)
            .await
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        yoram_persistence::issue_comment::Entity::find()
            .all(&db)
            .await
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        yoram_persistence::attachment::Entity::find()
            .all(&db)
            .await
            .unwrap()
            .len(),
        4
    );
}

#[tokio::test]
async fn mailbox_attachment_failure_rolls_back_receipt_and_can_retry_without_losing_shared_bytes() {
    use sha2::{Digest, Sha256};
    let directory = tempfile::tempdir().unwrap();
    let (repo, db) = build_repository().await;
    let member = repo
        .create_user(CreateUserInput {
            display_name: "Member".into(),
            email_address: "member@example.com".into(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "member".into(),
            password_hash: "pw".into(),
        })
        .await
        .unwrap();
    repo.create_project(CreateProjectInput {
        organization_id: None,
        owner_name: "member".into(),
        overview: None,
        project_name: "private".into(),
        project_scope: "private".into(),
        vcs: "GIT".into(),
        initial_manager_user_id: Some(member.id),
    })
    .await
    .unwrap();
    let image = b"\x89PNG\r\n\x1a\n\0\xff";
    let image_hash = format!("{:x}", Sha256::digest(image));
    let uploads = directory.path().join("uploads");
    std::fs::create_dir_all(&uploads).unwrap();
    std::fs::write(uploads.join(&image_hash), image).unwrap();
    let shared = repo
        .create_user_attachment_upload(
            member.id,
            "member",
            "picture.png",
            "image/png",
            image.len() as i64,
            &image_hash,
        )
        .await
        .unwrap();
    let newly_written_file = uploads.join(format!("{:x}", Sha256::digest(b"original\0\xff\r\n")));
    let raw = mailbox_attachment_message("retry-files", None).replace(
        "--outer--",
        "--outer\r\nContent-Disposition: attachment; filename=last.txt\r\n\r\nlast\r\n--outer--",
    );
    let blocked_file = uploads.join(format!("{:x}", Sha256::digest(b"last")));
    std::fs::create_dir(&blocked_file).unwrap();
    assert!(process_mailbox_raw_message(
        &repo,
        directory.path(),
        "/yona",
        &raw,
        "noreply@yona.local"
    )
    .await
    .is_err());
    assert!(repo
        .read_issue_detail("member", "private", 1)
        .await
        .unwrap()
        .is_none());
    assert!(repo
        .find_mailbox_reply_targets_by_message_ids(&["<retry-files@example.com>".into()])
        .await
        .unwrap()
        .is_empty());
    assert_eq!(
        repo.read_attachment_by_id(shared.id).await.unwrap(),
        Some(shared)
    );
    assert_eq!(std::fs::read(uploads.join(&image_hash)).unwrap(), image);
    assert!(
        !newly_written_file.exists(),
        "earlier uploads must roll back"
    );
    assert_eq!(std::fs::read_dir(&uploads).unwrap().count(), 2);
    assert_eq!(
        yoram_persistence::attachment::Entity::find()
            .all(&db)
            .await
            .unwrap()
            .len(),
        1
    );
    std::fs::remove_dir(blocked_file).unwrap();
    assert_eq!(
        process_mailbox_raw_message(&repo, directory.path(), "/yona", &raw, "noreply@yona.local")
            .await
            .unwrap()
            .status,
        "processed"
    );
    assert_eq!(
        process_mailbox_raw_message(&repo, directory.path(), "/yona", &raw, "noreply@yona.local")
            .await
            .unwrap()
            .status,
        "duplicate"
    );

    db.execute_unprepared(
        "CREATE TABLE mailbox_commit_failure (
             user_id INTEGER REFERENCES n4user(id) DEFERRABLE INITIALLY DEFERRED
         );
         CREATE TRIGGER reject_mail_commit AFTER INSERT ON original_email BEGIN
             INSERT INTO mailbox_commit_failure(user_id) VALUES(-1);
         END;",
    )
    .await
    .unwrap();
    let commit_raw = mailbox_attachment_message("commit-failure", None)
        .replace("original=00=FF=0D=0A", "commit=00=FF=0D=0A");
    let commit_upload = uploads.join(format!("{:x}", Sha256::digest(b"commit\0\xff\r\n")));
    assert!(process_mailbox_raw_message(
        &repo,
        directory.path(),
        "/yona",
        &commit_raw,
        "noreply@yona.local"
    )
    .await
    .is_err());
    assert!(
        !commit_upload.exists(),
        "commit failure must remove new blobs"
    );
    assert_eq!(std::fs::read_dir(&uploads).unwrap().count(), 3);
    assert_eq!(std::fs::read(uploads.join(&image_hash)).unwrap(), image);
    assert!(repo
        .find_mailbox_reply_targets_by_message_ids(&["<commit-failure@example.com>".into()])
        .await
        .unwrap()
        .is_empty());
    assert!(repo
        .read_issue_detail("member", "private", 2)
        .await
        .unwrap()
        .is_none());
    db.execute_unprepared("DROP TRIGGER reject_mail_commit; DROP TABLE mailbox_commit_failure;")
        .await
        .unwrap();

    db.execute_unprepared("CREATE TRIGGER reject_mail_receipt BEFORE INSERT ON original_email BEGIN SELECT RAISE(FAIL, 'receipt unavailable'); END").await.unwrap();
    let reply = mailbox_attachment_message("retry-reply", Some("retry-files"))
        .replace("original=00=FF=0D=0A", "reply=00=FF=0D=0A");
    let reply_upload = uploads.join(format!("{:x}", Sha256::digest(b"reply\0\xff\r\n")));
    assert!(process_mailbox_raw_message(
        &repo,
        directory.path(),
        "/yona",
        &reply,
        "noreply@yona.local"
    )
    .await
    .is_err());
    assert!(
        !reply_upload.exists(),
        "DB write failure must not publish blobs"
    );
    assert_eq!(std::fs::read(uploads.join(&image_hash)).unwrap(), image);
    assert!(repo
        .read_issue_detail("member", "private", 1)
        .await
        .unwrap()
        .unwrap()
        .comments
        .is_empty());
    assert_eq!(
        yoram_persistence::attachment::Entity::find()
            .all(&db)
            .await
            .unwrap()
            .len(),
        3
    );
    db.execute_unprepared("DROP TRIGGER reject_mail_receipt")
        .await
        .unwrap();
    assert_eq!(
        process_mailbox_raw_message(
            &repo,
            directory.path(),
            "/yona",
            &reply,
            "noreply@yona.local"
        )
        .await
        .unwrap()
        .status,
        "processed"
    );
    assert_eq!(
        repo.read_issue_detail("member", "private", 1)
            .await
            .unwrap()
            .unwrap()
            .comments
            .len(),
        1
    );
    assert_eq!(std::fs::read(uploads.join(&image_hash)).unwrap(), image);
}

#[tokio::test]
async fn mailbox_ignored_pull_request_does_not_publish_attachments() {
    let directory = tempfile::tempdir().unwrap();
    let (repo, db) = build_repository().await;
    let member = repo
        .create_user(CreateUserInput {
            display_name: "Member".into(),
            email_address: "member@example.com".into(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "member".into(),
            password_hash: "pw".into(),
        })
        .await
        .unwrap();
    let project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "member".into(),
            overview: None,
            project_name: "private".into(),
            project_scope: "private".into(),
            vcs: "GIT".into(),
            initial_manager_user_id: Some(member.id),
        })
        .await
        .unwrap();
    let pull_request = yoram_persistence::pull_request::ActiveModel {
        to_project_id: Set(Some(project.id)),
        from_project_id: Set(Some(project.id)),
        title: Set(Some("Ignored mailbox target".into())),
        number: Set(Some(1)),
        state: Set(Some(0)),
        ..Default::default()
    }
    .insert(&db)
    .await
    .unwrap();
    let raw = mailbox_attachment_message(
        "ignored-files",
        Some(&format!("pull_request/{}", pull_request.id)),
    );
    let result =
        process_mailbox_raw_message(&repo, directory.path(), "/yona", &raw, "noreply@yona.local")
            .await
            .unwrap();
    assert_eq!(result.actions.len(), 1);
    assert_eq!(result.actions[0].action, "ignore_resource");
    assert_eq!(result.actions[0].status, "ignored");
    assert!(!directory.path().join("uploads").exists());
    assert!(yoram_persistence::attachment::Entity::find()
        .all(&db)
        .await
        .unwrap()
        .is_empty());
    assert!(repo
        .read_issue_detail("member", "private", 1)
        .await
        .unwrap()
        .is_none());
}

#[tokio::test]
async fn mailbox_project_targets_follow_legacy_detail_and_read_filtering() {
    let (repo, _) = build_repository().await;
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
    let outsider = repo
        .create_user(CreateUserInput {
            display_name: "Mailbox Outsider".to_string(),
            email_address: "outsider@example.com".to_string(),
            is_confirmed: true,
            is_site_admin: false,
            login_id: "outsider".to_string(),
            password_hash: "pw".to_string(),
        })
        .await
        .unwrap();

    let public_project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "mailbox".to_string(),
            overview: None,
            project_name: "public".to_string(),
            project_scope: "public".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .unwrap();
    let private_project = repo
        .create_project(CreateProjectInput {
            organization_id: None,
            owner_name: "mailbox".to_string(),
            overview: None,
            project_name: "private".to_string(),
            project_scope: "private".to_string(),
            vcs: "GIT".to_string(),
            initial_manager_user_id: None,
        })
        .await
        .unwrap();
    repo.add_project_membership(private_project.id, member.id, "member")
        .await
        .unwrap();

    let details = vec![
        "help".to_string(),
        "mailbox/public".to_string(),
        "mailbox/private/issue/1".to_string(),
        "mailbox/public".to_string(),
        "missing/project".to_string(),
    ];
    let member_targets = repo
        .find_mailbox_project_targets_by_details(member.id, &details)
        .await
        .unwrap();
    assert_eq!(member_targets.len(), 2);
    assert_eq!(member_targets[0].id, public_project.id);
    assert_eq!(member_targets[1].id, private_project.id);

    let outsider_targets = repo
        .find_mailbox_project_targets_by_details(outsider.id, &details)
        .await
        .unwrap();
    assert_eq!(outsider_targets.len(), 1);
    assert_eq!(outsider_targets[0].id, public_project.id);
}

#[tokio::test]
async fn mailbox_polling_tick_fetches_raw_messages_and_threads_replies() {
    let (repo, _) = build_repository().await;
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
    repo.create_project(CreateProjectInput {
        organization_id: None,
        owner_name: "mailbox".to_string(),
        overview: None,
        project_name: "projectYobi".to_string(),
        project_scope: "public".to_string(),
        vcs: "GIT".to_string(),
        initial_manager_user_id: None,
    })
    .await
    .unwrap();

    let fake_fetch_dir = std::env::temp_dir().join(format!(
        "yona-mailbox-fetch-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos()
    ));
    std::fs::create_dir_all(&fake_fetch_dir).expect("fake fetch tempdir");
    let fake_fetch = fake_fetch_dir.join("fake-mailbox-fetch.sh");
    let args_path = fake_fetch_dir.join("args.txt");
    let first = concat!(
        "Message-ID: <poll-root@domain>\r\n",
        "Subject: Polled issue\r\n",
        "From: Mailbox Member <member@example.com>\r\n",
        "To: noreply+mailbox/projectYobi@yona.local\r\n",
        "Content-Type: multipart/mixed; boundary=binary\r\n\r\n",
        "--binary\r\nContent-Type: text/plain\r\n\r\npolled issue body\r\n",
        "--binary\r\nContent-Type: application/octet-stream\r\n",
        "Content-Disposition: attachment; filename=octets.bin\r\n",
        "Content-Transfer-Encoding: binary\r\n\r\n",
    );
    let octets = b"\0\xff\r\nunchanged\0";
    let mut first = first.as_bytes().to_vec();
    first.extend_from_slice(octets);
    first.extend_from_slice(b"\r\n--binary--\r\n");
    let second = concat!(
        "Message-ID: <poll-reply@domain>\r\n",
        "Subject: Re: Polled issue\r\n",
        "From: Mailbox Member <member@example.com>\r\n",
        "To: noreply+mailbox/projectYobi@yona.local\r\n",
        "In-Reply-To: <poll-root@domain>\r\n",
        "Content-Type: text/plain; charset=UTF-8\r\n\r\n",
        "polled reply body",
    );
    let payload = serde_json::to_string(&[
        general_purpose::STANDARD.encode(&first),
        general_purpose::STANDARD.encode(second),
    ])
    .unwrap();
    std::fs::write(
        &fake_fetch,
        format!(
            "#!/bin/sh\nprintf '%s' \"$*\" > \"{}\"\nprintf '%s' '{}'\n",
            args_path.display(),
            payload,
        ),
    )
    .expect("write fake fetch");

    let config = MailboxPollingConfig {
        enabled: true,
        fetch_command: format!("sh {}", fake_fetch.display()),
        imap_address: "noreply@yona.local".to_string(),
        initial_delay_ms: 0,
        interval_ms: 1,
    };
    let results = poll_mailbox_scheduler_tick(&repo, &fake_fetch_dir, "", &config)
        .await
        .expect("polling tick succeeds");
    assert_eq!(results.len(), 2);
    assert_eq!(results[0].status, "processed");
    assert_eq!(results[0].actions[0].action, "create_issue");
    assert_eq!(results[1].status, "processed");
    assert_eq!(results[1].actions[0].action, "create_issue_comment");

    let detail = repo
        .read_issue_detail("mailbox", "projectYobi", 1)
        .await
        .unwrap()
        .expect("polled issue detail");
    assert_eq!(detail.author_id, Some(member.id));
    assert_eq!(detail.title, "Polled issue");
    assert_eq!(detail.comments.len(), 1);
    assert_eq!(detail.comments[0].contents_markdown, "polled reply body");
    let attachments = repo
        .list_attachments_by_container("ISSUE_POST", detail.id)
        .await
        .unwrap();
    assert_eq!(attachments.len(), 1);
    assert_eq!(
        std::fs::read(fake_fetch_dir.join("uploads").join(&attachments[0].hash)).unwrap(),
        octets
    );
    assert!(std::fs::read_to_string(args_path)
        .expect("captured args")
        .contains("noreply@yona.local"));
    std::fs::write(&fake_fetch, "#!/bin/sh\nprintf '[]'\n").unwrap();
    assert!(
        poll_mailbox_scheduler_tick(&repo, &fake_fetch_dir, "", &config)
            .await
            .unwrap()
            .is_empty()
    );
    for invalid_payload in ["Message-ID: <unframed@domain>\n\nraw", "[\"%%%\"]"] {
        std::fs::write(
            &fake_fetch,
            format!("#!/bin/sh\nprintf '%s' '{invalid_payload}'\n"),
        )
        .unwrap();
        assert!(
            poll_mailbox_scheduler_tick(&repo, &fake_fetch_dir, "", &config)
                .await
                .is_err()
        );
    }

    let disabled = poll_mailbox_scheduler_tick(
        &repo,
        &fake_fetch_dir,
        "",
        &MailboxPollingConfig {
            enabled: false,
            ..config
        },
    )
    .await
    .expect("disabled polling succeeds");
    assert!(disabled.is_empty());
    let _ = std::fs::remove_dir_all(fake_fetch_dir);
}

#[test]
fn mailbox_polling_config_from_startup_uses_init_snapshot_without_env_mutation() {
    let current_dir = tempfile::tempdir().expect("temp dir");
    let startup = load_startup_config(
        BTreeMap::from([
            (
                "YONA_MAILBOX_POLLING_ENABLED".to_string(),
                "true".to_string(),
            ),
            (
                "YONA_MAILBOX_POLLING_INITIAL_DELAY".to_string(),
                "2s".to_string(),
            ),
            (
                "YONA_MAILBOX_POLLING_INTERVAL".to_string(),
                "750ms".to_string(),
            ),
            (
                "YONA_MAILBOX_IMAP_ADDRESS".to_string(),
                "noreply@yona.local".to_string(),
            ),
            (
                "YONA_MAILBOX_FETCH_COMMAND".to_string(),
                "fetch-mailbox --unseen".to_string(),
            ),
        ]),
        current_dir.path(),
    )
    .expect("startup config");

    assert_eq!(
        mailbox_polling_config_from_startup(&startup),
        MailboxPollingConfig {
            enabled: true,
            fetch_command: "fetch-mailbox --unseen".to_string(),
            imap_address: "noreply@yona.local".to_string(),
            initial_delay_ms: 2_000,
            interval_ms: 750,
        }
    );
}
