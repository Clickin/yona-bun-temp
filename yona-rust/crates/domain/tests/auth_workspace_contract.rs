use yona_rust_domain::{
    build_anonymous_app_session, build_authenticated_app_session, normalize_default_landing_path,
    resolve_post_auth_landing_path, AppUserSummary,
};

#[test]
fn anonymous_session_projection_stays_minimal() {
    let session = build_anonymous_app_session();

    assert!(session.is_anonymous);
    assert_eq!(session.actor_id, None);
    assert_eq!(session.login_id, None);
    assert_eq!(session.email_address, None);
    assert_eq!(session.default_landing_path, None);
}

#[test]
fn authenticated_session_projection_carries_identity_and_default_landing() {
    let session = build_authenticated_app_session(
        &AppUserSummary {
            email_address: "door@example.com".to_string(),
            id: 1,
            is_confirmed: true,
            is_site_admin: false,
            login_id: "door".to_string(),
            name: "Door".to_string(),
        },
        Some("/search?scope=global&pageSize=20"),
    );

    assert!(!session.is_anonymous);
    assert_eq!(session.actor_id, Some(1));
    assert_eq!(session.login_id.as_deref(), Some("door"));
    assert_eq!(
        session.default_landing_path.as_deref(),
        Some("/search?pageSize=20&scope=global"),
    );
}

#[test]
fn default_landing_allows_me_search_and_project_routes_only() {
    assert_eq!(
        normalize_default_landing_path(Some("/me")),
        Some("/me".to_string())
    );
    assert_eq!(
        normalize_default_landing_path(Some("/search?scope=global&pageSize=20")),
        Some("/search?pageSize=20&scope=global".to_string()),
    );
    assert_eq!(
        normalize_default_landing_path(Some("/owner/project/issues/1")),
        Some("/owner/project/issues/1".to_string()),
    );
    assert_eq!(normalize_default_landing_path(Some("/login")), None);
    assert_eq!(
        normalize_default_landing_path(Some("/forgot-password")),
        None
    );
}

#[test]
fn post_auth_redirect_prefers_query_then_saved_default_then_me() {
    assert_eq!(
        resolve_post_auth_landing_path(
            Some("/owner/project/pulls/1"),
            Some("/search?scope=global&pageSize=20"),
        ),
        "/owner/project/pulls/1".to_string(),
    );
    assert_eq!(
        resolve_post_auth_landing_path(None, Some("/search?scope=global&pageSize=20")),
        "/search?pageSize=20&scope=global".to_string(),
    );
    assert_eq!(
        resolve_post_auth_landing_path(None, None),
        "/me".to_string()
    );
}
