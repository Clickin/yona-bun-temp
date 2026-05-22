use yona_rust_integrations::EmailAddressWithDetail;

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
