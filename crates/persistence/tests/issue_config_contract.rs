use yoram_persistence::RepositoryConfig;

#[test]
fn repository_config_parses_issue_and_project_legacy_env_style_values_without_process_env() {
    let config = RepositoryConfig::from_pairs([
        ("YONA_GUEST_LOGIN_PREFIX", "guest_, pt-"),
        ("YONA_NOTIFICATION_DRAFT_TIME", "2s"),
        ("YONA_ISSUE_EVENT_DRAFT_TIME", "750ms"),
        ("YONA_PROJECT_DEFAULT_MENUS", "code, issue, pull-request"),
    ]);

    assert!(config.login_id_matches_guest_prefix("guest_alice"));
    assert!(config.login_id_matches_guest_prefix("pt-bob"));
    assert!(!config.login_id_matches_guest_prefix("member"));
    assert_eq!(config.notification_draft_time_in_millis(), 2_000);
    assert_eq!(config.issue_event_draft_time_in_millis(), 750);

    let menu = config.project_default_menu_settings();
    assert!(!menu.board);
    assert!(menu.code);
    assert!(menu.issue);
    assert!(!menu.milestone);
    assert!(menu.pull_request);
    assert!(!menu.review);
}
