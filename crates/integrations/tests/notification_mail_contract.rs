use yona_rust_integrations::{
    notification_mail_batches, IntegrationConfig, NotificationMailAddress,
    NotificationMailRecipient,
};

#[test]
fn notification_mail_env_uses_legacy_yona_hide_address_and_recipient_limit_keys() {
    let defaults = IntegrationConfig::default();
    assert!(defaults.notification_mail_hide_address());
    assert_eq!(defaults.notification_mail_recipient_limit(), None);

    let configured = IntegrationConfig::from_pairs([
        ("YONA_NOTIFICATION_MAIL_HIDE_ADDRESS", "false"),
        ("YONA_NOTIFICATION_MAIL_RECIPIENT_LIMIT", "100"),
    ]);
    assert!(!configured.notification_mail_hide_address());
    assert_eq!(configured.notification_mail_recipient_limit(), Some(100));

    let disabled_limit =
        IntegrationConfig::from_pairs([("YONA_NOTIFICATION_MAIL_RECIPIENT_LIMIT", "0")]);
    assert_eq!(disabled_limit.notification_mail_recipient_limit(), None);
}

#[test]
fn notification_mail_batches_group_by_language_and_hide_addresses_like_legacy() {
    let batches = notification_mail_batches(
        &[
            recipient("alice@example.com", "Alice", "ko-KR"),
            recipient("bob@example.com", "Bob", "en"),
            recipient("carol@example.com", "Carol", "ko-KR"),
            recipient("dave@example.com", "Dave", "ko-KR"),
        ],
        "noreply@yona.example",
        "Yona",
        true,
        Some(3),
    );

    assert_eq!(batches.len(), 3);
    assert_eq!(batches[0].language, "ko-KR");
    assert_eq!(batches[0].to, vec![address("noreply@yona.example", "Yona")]);
    assert_eq!(
        batches[0].bcc,
        vec![
            address("alice@example.com", "Alice"),
            address("carol@example.com", "Carol"),
        ]
    );
    assert_eq!(batches[1].language, "ko-KR");
    assert_eq!(batches[1].bcc, vec![address("dave@example.com", "Dave")]);
    assert_eq!(batches[2].language, "en");
    assert_eq!(batches[2].bcc, vec![address("bob@example.com", "Bob")]);
}

#[test]
fn notification_mail_batches_send_direct_to_when_addresses_are_not_hidden() {
    let batches = notification_mail_batches(
        &[
            recipient("alice@example.com", "Alice", "en"),
            recipient("bob@example.com", "Bob", "en"),
            recipient("carol@example.com", "Carol", "en"),
        ],
        "noreply@yona.example",
        "Yona",
        false,
        Some(2),
    );

    assert_eq!(batches.len(), 2);
    assert_eq!(
        batches[0].to,
        vec![
            address("alice@example.com", "Alice"),
            address("bob@example.com", "Bob"),
        ]
    );
    assert!(batches[0].bcc.is_empty());
    assert_eq!(batches[1].to, vec![address("carol@example.com", "Carol")]);
    assert!(batches[1].bcc.is_empty());
}

#[test]
fn notification_mail_batches_skip_delivery_when_hidden_limit_cannot_fit_default_to() {
    assert!(notification_mail_batches(
        &[recipient("alice@example.com", "Alice", "en")],
        "noreply@yona.example",
        "Yona",
        true,
        Some(1),
    )
    .is_empty());
}

fn recipient(email: &str, name: &str, preferred_language: &str) -> NotificationMailRecipient {
    NotificationMailRecipient {
        email: email.to_string(),
        name: name.to_string(),
        preferred_language: preferred_language.to_string(),
    }
}

fn address(email: &str, name: &str) -> NotificationMailAddress {
    NotificationMailAddress {
        email: email.to_string(),
        name: name.to_string(),
    }
}
