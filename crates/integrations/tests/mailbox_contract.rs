use yona_rust_integrations::{
    mailbox_collect_thread_message_ids, mailbox_extract_content, mailbox_message_id_left,
    mailbox_normalize_parsed_message, mailbox_parse_message_ids, mailbox_parse_raw_message,
    mailbox_project_detail, mailbox_recipients_to_yona, mailbox_resource_path_from_detail,
    EmailAddressWithDetail, MailboxMimePart, MailboxParsedMessageInput,
};

#[test]
fn mailbox_email_address_detail_matches_legacy_plus_address_semantics() {
    let plain = EmailAddressWithDetail::new("test@mail.com");
    let detailed = EmailAddressWithDetail::new("test+1234@mail.com");

    assert_eq!(plain.user(), "test");
    assert_eq!(plain.domain(), "mail.com");
    assert_eq!(plain.detail(), "");
    assert_eq!(detailed.user(), "test");
    assert_eq!(detailed.domain(), "mail.com");
    assert_eq!(detailed.detail(), "1234");
    assert!(plain.equals_except_details(&detailed));
}

#[test]
fn mailbox_message_id_left_matches_legacy_imap_message_util() {
    assert_eq!(
        mailbox_message_id_left("<issue/123@yona.local>").as_deref(),
        Some("issue/123")
    );
    assert_eq!(
        mailbox_message_id_left("</pullRequest/7@yona.local>").as_deref(),
        Some("pullRequest/7")
    );
    assert_eq!(mailbox_message_id_left("<@yona.local>"), None);
    assert_eq!(mailbox_message_id_left("missing-at-sign"), None);
}

#[test]
fn mailbox_message_id_header_parsing_matches_legacy_email_handler() {
    assert_eq!(
        mailbox_parse_message_ids(
            "abc (comment) <first@example.com> folded text <second@example.com>"
        ),
        vec![
            "<first@example.com>".to_string(),
            "<second@example.com>".to_string()
        ]
    );
    assert!(mailbox_parse_message_ids("missing angle").is_empty());
    assert!(mailbox_parse_message_ids("<unterminated").is_empty());
}

#[test]
fn mailbox_thread_message_id_collection_matches_legacy_email_handler() {
    assert_eq!(
        mailbox_collect_thread_message_ids(
            Some("<reply-to@example.com>"),
            &[
                "prefix <first@example.com> <second@example.com>".to_string(),
                "<reply-to@example.com> <third@example.com>".to_string(),
            ],
        ),
        vec![
            "<reply-to@example.com>".to_string(),
            "<first@example.com>".to_string(),
            "<second@example.com>".to_string(),
            "<third@example.com>".to_string(),
        ]
    );
}

#[test]
fn mailbox_recipient_detail_routing_matches_legacy_yona_address_filter() {
    let recipients = mailbox_recipients_to_yona(
        &[
            "noreply+yobi/projectYobi@mail.com".to_string(),
            "noreply+help@mail.com".to_string(),
            "other+yobi/projectYobi@mail.com".to_string(),
        ],
        "noreply@mail.com",
    );

    assert_eq!(recipients.len(), 2);
    assert_eq!(recipients[0].detail(), "yobi/projectYobi");
    assert_eq!(recipients[1].detail(), "help");
}

#[test]
fn mailbox_detail_parsing_matches_legacy_project_and_resource_rules() {
    let project = mailbox_project_detail("yobi/projectYobi/issue/1").expect("project detail");
    assert_eq!(project.owner_name, "yobi");
    assert_eq!(project.project_name, "projectYobi");
    assert_eq!(mailbox_project_detail("owner-only"), None);
    assert_eq!(mailbox_project_detail("/project"), None);

    assert_eq!(
        mailbox_resource_path_from_detail("yobi/projectYobi/issue/1").as_deref(),
        Some("issue/1")
    );
    assert_eq!(mailbox_resource_path_from_detail("yobi/projectYobi"), None);
}

#[test]
fn mailbox_mime_extraction_prefers_plain_for_normal_alternative() {
    let content = mailbox_extract_content(&multipart(
        "multipart/alternative",
        vec![
            text("text/html; charset=UTF-8", "<p>html</p>"),
            text("text/plain; charset=UTF-8", "plain"),
        ],
    ));

    assert_eq!(content.body, "plain");
    assert_eq!(content.content_type, "text/plain; charset=UTF-8");
    assert!(content.attachments.is_empty());
}

#[test]
fn mailbox_mime_extraction_prefers_html_inside_related_root() {
    let content = mailbox_extract_content(&MailboxMimePart {
        body: String::new(),
        content_id: None,
        content_type: "multipart/related; start=\"<root>\"".to_string(),
        parts: vec![
            attachment("<image-1>", "image/png"),
            MailboxMimePart {
                body: String::new(),
                content_id: Some("<root>".to_string()),
                content_type: "multipart/alternative".to_string(),
                parts: vec![
                    text("text/plain", "plain"),
                    text("text/html", "<img src=\"cid:image-1\">"),
                ],
            },
        ],
    });

    assert_eq!(content.body, "<img src=\"cid:image-1\">");
    assert_eq!(content.content_type, "text/html");
    assert_eq!(content.attachments.len(), 1);
    assert_eq!(
        content.attachments[0].content_id.as_deref(),
        Some("<image-1>")
    );
}

#[test]
fn mailbox_mime_extraction_joins_mixed_multipart_text_in_order() {
    let content = mailbox_extract_content(&multipart(
        "multipart/mixed",
        vec![
            text("text/plain", "first"),
            text("text/plain", " second"),
            attachment("<file-1>", "application/octet-stream"),
        ],
    ));

    assert_eq!(content.body, "first second");
    assert_eq!(content.content_type, "text/plain");
    assert!(content.attachments.is_empty());
}

#[test]
fn mailbox_parsed_message_normalization_collects_legacy_routing_inputs() {
    let normalized = mailbox_normalize_parsed_message(MailboxParsedMessageInput {
        from_addresses: vec!["member@example.com".to_string()],
        imap_address: "noreply@yona.local".to_string(),
        in_reply_to: Some("<reply@example.com>".to_string()),
        message_id: "<message@example.com>".to_string(),
        recipients: vec![
            "noreply+yobi/projectYobi/comment_thread/1@yona.local".to_string(),
            "noreply+help@yona.local".to_string(),
            "other+yobi/projectYobi@yona.local".to_string(),
        ],
        references: vec![
            "<first@example.com> <second@example.com>".to_string(),
            "<reply@example.com> <third@example.com>".to_string(),
        ],
        root_part: multipart(
            "multipart/alternative",
            vec![
                text("text/html; charset=UTF-8", "<p>html</p>"),
                text("text/plain; charset=UTF-8", "plain body"),
            ],
        ),
        subject: "mail subject".to_string(),
    });

    assert_eq!(normalized.title, "mail subject");
    assert_eq!(normalized.message_id, "<message@example.com>");
    assert_eq!(normalized.from_addresses, vec!["member@example.com"]);
    assert_eq!(normalized.body_markdown, "plain body");
    assert_eq!(normalized.content_type, "text/plain; charset=UTF-8");
    assert_eq!(
        normalized.recipient_details,
        vec![
            "yobi/projectYobi/comment_thread/1".to_string(),
            "help".to_string()
        ]
    );
    assert_eq!(
        normalized.reply_message_ids,
        vec![
            "<reply@example.com>".to_string(),
            "<first@example.com>".to_string(),
            "<second@example.com>".to_string(),
            "<third@example.com>".to_string(),
        ]
    );
}

#[test]
fn mailbox_raw_message_parsing_feeds_legacy_normalization_inputs() {
    let parsed = mailbox_parse_raw_message(
        concat!(
            "Message-ID: <raw-message@example.com>\r\n",
            "Subject: Raw\r\n",
            " subject\r\n",
            "From: Mailbox Member <member@example.com>\r\n",
            "To: noreply+yobi/projectYobi/comment_thread/1@yona.local\r\n",
            "Cc: Other <other@example.com>\r\n",
            "In-Reply-To: <reply@example.com>\r\n",
            "References: <first@example.com> <reply@example.com>\r\n",
            "Content-Type: multipart/alternative; boundary=\"mail-boundary\"\r\n",
            "\r\n",
            "--mail-boundary\r\n",
            "Content-Type: text/html; charset=UTF-8\r\n",
            "\r\n",
            "<p>html body</p>\r\n",
            "--mail-boundary\r\n",
            "Content-Type: text/plain; charset=UTF-8\r\n",
            "Content-Transfer-Encoding: quoted-printable\r\n",
            "\r\n",
            "plain=20body=\r\n",
            " continued\r\n",
            "--mail-boundary--\r\n",
        ),
        "noreply@yona.local",
    )
    .expect("raw message");

    assert_eq!(parsed.subject, "Raw subject");
    assert_eq!(parsed.message_id, "<raw-message@example.com>");
    assert_eq!(parsed.from_addresses, vec!["member@example.com"]);
    assert_eq!(
        parsed.recipients,
        vec![
            "noreply+yobi/projectYobi/comment_thread/1@yona.local".to_string(),
            "other@example.com".to_string(),
        ]
    );

    let normalized = mailbox_normalize_parsed_message(parsed);
    assert_eq!(normalized.body_markdown, "plain body continued");
    assert_eq!(
        normalized.recipient_details,
        vec!["yobi/projectYobi/comment_thread/1".to_string()]
    );
    assert_eq!(
        normalized.reply_message_ids,
        vec![
            "<reply@example.com>".to_string(),
            "<first@example.com>".to_string()
        ]
    );
}

#[test]
fn mailbox_raw_message_parsing_decodes_base64_transfer_bodies_like_javamail() {
    let parsed = mailbox_parse_raw_message(
        concat!(
            "Message-ID: <raw-base64@example.com>\r\n",
            "Subject: Base64 raw\r\n",
            "From: Mailbox Member <member@example.com>\r\n",
            "To: noreply+yobi/projectYobi@yona.local\r\n",
            "Content-Type: text/plain; charset=UTF-8\r\n",
            "Content-Transfer-Encoding: base64\r\n",
            "\r\n",
            "YmFzZTY0IHJlcGx5\r\n",
            "IGJvZHk=\r\n",
        ),
        "noreply@yona.local",
    )
    .expect("raw base64 message");

    let normalized = mailbox_normalize_parsed_message(parsed);
    assert_eq!(normalized.body_markdown, "base64 reply body");
    assert_eq!(
        normalized.recipient_details,
        vec!["yobi/projectYobi".to_string()]
    );
}

fn text(content_type: &str, body: &str) -> MailboxMimePart {
    MailboxMimePart {
        body: body.to_string(),
        content_id: None,
        content_type: content_type.to_string(),
        parts: Vec::new(),
    }
}

fn multipart(content_type: &str, parts: Vec<MailboxMimePart>) -> MailboxMimePart {
    MailboxMimePart {
        body: String::new(),
        content_id: None,
        content_type: content_type.to_string(),
        parts,
    }
}

fn attachment(content_id: &str, content_type: &str) -> MailboxMimePart {
    MailboxMimePart {
        body: String::new(),
        content_id: Some(content_id.to_string()),
        content_type: content_type.to_string(),
        parts: Vec::new(),
    }
}
