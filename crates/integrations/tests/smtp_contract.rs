use yoram_integrations::IntegrationConfig;

#[test]
fn smtp_ssl_env_accepts_legacy_yona_alias() {
    let default_config = IntegrationConfig::default().smtp_delivery_config();
    assert_eq!(default_config.ssl_enabled, None);
    assert_eq!(default_config.default_port, 587);

    let ssl_config =
        IntegrationConfig::from_pairs([("YONA_SMTP_SSL", "true")]).smtp_delivery_config();
    assert_eq!(ssl_config.ssl_enabled, Some(true));
    assert_eq!(ssl_config.default_port, 465);

    let plain_config =
        IntegrationConfig::from_pairs([("YONA_SMTP_SSL", "false")]).smtp_delivery_config();
    assert_eq!(plain_config.ssl_enabled, Some(false));
    assert_eq!(plain_config.default_port, 25);

    let legacy_config = IntegrationConfig::from_pairs([("SMTP_SSL", "on")]).smtp_delivery_config();
    assert_eq!(legacy_config.ssl_enabled, Some(true));
    assert_eq!(legacy_config.default_port, 465);
}
