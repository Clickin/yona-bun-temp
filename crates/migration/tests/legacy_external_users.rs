use yona_rust_pilot_migration::legacy_external::{
    find_endpoint,
    users::{find_fixture, fixtures, AuthRequirement},
    EndpointStatus,
};

#[test]
fn user_fixtures_cover_legacy_users_auth_token_routes() {
    let expected = [
        ("GET", "/-_-api/v1/users"),
        ("POST", "/-_-api/v1/users"),
        ("POST", "/-_-api/v1/users/token"),
        ("GET", "/-_-api/v1/user/issues"),
        ("GET", "/-_-api/v1/users/:user/statistics"),
        ("POST", "/-_-api/v1/user/defultLoginPage"),
        ("GET", "/-_-api/v1/admin/users"),
        ("PATCH", "/-_-api/v1/admin/users/:user"),
    ];

    assert_eq!(fixtures().len(), expected.len());

    for (method, path) in expected {
        let fixture = find_fixture(method, path)
            .unwrap_or_else(|| panic!("missing users fixture: {method} {path}"));
        let inventory = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing endpoint inventory entry: {method} {path}"));

        assert_eq!(inventory.status, EndpointStatus::AppOwned);
        assert_eq!(fixture.legacy_controller, inventory.source.controller);
        assert_eq!(fixture.legacy_action, inventory.source.action);
    }
}

#[test]
fn token_fixture_preserves_credential_request_and_access_token_response() {
    let fixture = find_fixture("POST", "/-_-api/v1/users/token").unwrap();

    assert_eq!(fixture.legacy_controller, "controllers.api.UserApi");
    assert_eq!(fixture.legacy_action, "newToken");
    assert_eq!(fixture.auth, AuthRequirement::CredentialJson);
    assert_eq!(fixture.request.body_fields, &["id", "password"]);
    assert_eq!(
        fixture.response.response_fields,
        &["access_token", "message"]
    );
}

#[test]
fn typo_preserving_default_login_page_route_and_action_are_stable() {
    let fixture = find_fixture("POST", "/-_-api/v1/user/defultLoginPage").unwrap();

    assert_eq!(fixture.path, "/-_-api/v1/user/defultLoginPage");
    assert_eq!(fixture.legacy_controller, "controllers.UserApp");
    assert_eq!(fixture.legacy_action, "setDefaultLoginPage");
    assert_eq!(fixture.auth, AuthRequirement::CurrentUserSession);
    assert_eq!(fixture.request.query_fields, &["path"]);
    assert_eq!(fixture.response.response_fields, &["defaultLoginPage"]);
}

#[test]
fn token_auth_and_site_manager_classifications_are_explicit() {
    let issues = find_fixture("GET", "/-_-api/v1/user/issues").unwrap();
    assert_eq!(issues.auth, AuthRequirement::AuthorizationTokenHeader);
    assert_eq!(issues.request.header_fields, &["Authorization"]);
    assert_eq!(issues.request.query_fields, &["filter", "page", "pageNum"]);

    let admin_users = find_fixture("GET", "/-_-api/v1/admin/users").unwrap();
    let admin_update = find_fixture("PATCH", "/-_-api/v1/admin/users/:user").unwrap();
    assert_eq!(admin_users.auth, AuthRequirement::SiteManagerSession);
    assert_eq!(admin_update.auth, AuthRequirement::SiteManagerSession);
    assert_eq!(admin_update.request.body_fields, &["state"]);
    assert_eq!(
        admin_update.response.response_fields,
        &["id", "login_id", "state"]
    );
}
