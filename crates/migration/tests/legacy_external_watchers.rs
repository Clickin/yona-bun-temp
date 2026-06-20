use yona_rust_pilot_migration::legacy_external::{
    find_endpoint,
    watchers::{find_fixture, fixtures, AuthRequirement, MigrationDirection},
    EndpointStatus,
};

#[test]
fn watcher_fixtures_cover_only_watcher_api_external_route() {
    let expected = [(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
        MigrationDirection::AppOwned,
    )];

    assert_eq!(fixtures().len(), expected.len());

    for (method, path, direction) in expected {
        let fixture = find_fixture(method, path)
            .unwrap_or_else(|| panic!("missing watcher fixture: {method} {path}"));
        let inventory = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing endpoint inventory entry: {method} {path}"));

        assert_eq!(fixture.direction, direction);
        assert_eq!(fixture.direction.endpoint_status(), inventory.status);
        assert_eq!(fixture.legacy_controller, inventory.source.controller);
        assert_eq!(fixture.legacy_action, inventory.source.action);
    }
}

#[test]
fn watcher_projection_preserves_type_query_and_limit_metadata() {
    let fixture = find_fixture(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
    )
    .unwrap();

    assert_eq!(fixture.legacy_controller, "controllers.api.WatcherApi");
    assert_eq!(fixture.legacy_action, "getWatchers");
    assert_eq!(fixture.direction, MigrationDirection::AppOwned);
    assert_eq!(fixture.auth, AuthRequirement::LegacyReadProjection);
    assert_eq!(
        fixture.request.path_fields,
        &["owner", "projectName", "number"]
    );
    assert_eq!(fixture.request.query_fields, &["type"]);
    assert_eq!(
        fixture.response.response_fields,
        &["totalWatchers", "watchersInList", "watchers", "name", "url"]
    );
    assert_eq!(fixture.list_limit, 100);
}

#[test]
fn watcher_route_is_app_server_owned_runtime_helper() {
    let fixture = find_fixture(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
    )
    .unwrap();
    let inventory = find_endpoint(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
    )
    .unwrap();

    assert!(fixture.app_server_owned);
    assert_eq!(
        fixture.direction.endpoint_status(),
        EndpointStatus::AppOwned
    );
    assert_eq!(inventory.status, EndpointStatus::AppOwned);
    assert!(!inventory.status.is_migrator_scope());

    for app_owned_path in [
        "/-_-api/v1/favoriteProjects",
        "/-_-api/v1/favoriteIssues",
        "/-_-api/v1/favoriteOrganizations",
    ] {
        assert!(
            find_fixture("GET", app_owned_path).is_none(),
            "favorite helper leaked into WatcherApi fixture: {app_owned_path}"
        );
        assert_eq!(
            find_endpoint("GET", app_owned_path).unwrap().status,
            EndpointStatus::AppOwned
        );
    }
}
