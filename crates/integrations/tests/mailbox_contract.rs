use yona_rust_integrations::{mailbox_message_id_left, EmailAddressWithDetail};

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
