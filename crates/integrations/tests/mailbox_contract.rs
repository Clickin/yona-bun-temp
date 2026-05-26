use yona_rust_integrations::{
    mailbox_extract_content, mailbox_message_id_left, EmailAddressWithDetail, MailboxMimePart,
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
