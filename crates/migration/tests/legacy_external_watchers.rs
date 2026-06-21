use yona_rust_pilot_migration::legacy_external::{
    find_endpoint,
    watchers::{
        favorite_helper_boundaries, find_fixture, fixtures, AuthRequirement, MigrationDirection,
        WatcherResourceType,
    },
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
    assert_eq!(fixture.accepted_type_values, &["issues", "posts"]);
    assert_eq!(
        fixture.empty_ok_type_values,
        &["", "issue", "pullRequests", "ISSUES"]
    );
    assert_eq!(fixture.empty_ok_status, 200);
    assert_eq!(fixture.empty_ok_body, None);
    assert_eq!(fixture.payloads.len(), 2);
}

#[test]
fn watcher_payload_examples_preserve_issues_and_posts_response_shape() {
    let fixture = find_fixture(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
    )
    .unwrap();

    let resource_types: Vec<_> = fixture
        .payloads
        .iter()
        .map(|payload| payload.resource_type)
        .collect();
    assert_eq!(
        resource_types,
        vec![WatcherResourceType::Issues, WatcherResourceType::Posts]
    );

    for payload in fixture.payloads {
        assert_eq!(payload.success_status, 200);
        assert!(
            payload
                .sample_path
                .starts_with("/-_-api/v1/owners/alice/projects/demo/posts/"),
            "sample keeps the legacy route posts segment even when type=issues: {}",
            payload.sample_path
        );
        assert!(
            payload
                .sample_path
                .ends_with(&format!("type={}", payload.resource_type.query_value())),
            "sample path does not preserve type query: {}",
            payload.sample_path
        );

        let success: serde_json::Value = serde_json::from_str(payload.success_json).unwrap();
        let object = success.as_object().unwrap();
        assert_eq!(object.len(), 3);
        assert!(object.contains_key("totalWatchers"));
        assert!(object.contains_key("watchersInList"));
        assert!(object.contains_key("watchers"));

        let watchers = success["watchers"].as_array().unwrap();
        assert_eq!(
            success["watchersInList"].as_u64().unwrap(),
            watchers.len() as u64
        );
        assert!(
            success["totalWatchers"].as_u64().unwrap()
                >= success["watchersInList"].as_u64().unwrap()
        );
        assert!(watchers.len() <= fixture.list_limit);

        for watcher in watchers {
            let mut keys: Vec<&str> = watcher
                .as_object()
                .unwrap()
                .keys()
                .map(String::as_str)
                .collect();
            keys.sort_unstable();
            assert_eq!(keys, vec!["name", "url"]);
            let name = watcher["name"].as_str().unwrap();
            assert!(name.contains("Watcher") || name == "Alice Owner");
            assert!(watcher["url"].as_str().unwrap().starts_with('/'));
        }
    }
}

#[test]
fn watcher_and_favorite_boundaries_remain_app_server_owned_runtime_helpers() {
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

    assert_eq!(favorite_helper_boundaries().len(), 6);
    for boundary in favorite_helper_boundaries() {
        assert!(
            find_fixture(boundary.method, boundary.path).is_none(),
            "favorite helper leaked into WatcherApi fixture: {} {}",
            boundary.method,
            boundary.path
        );
        assert!(boundary.app_server_owned);
        assert!(!boundary.watcher_api_owned);
        assert_eq!(boundary.status, EndpointStatus::AppOwned);

        let inventory = find_endpoint(boundary.method, boundary.path).unwrap_or_else(|| {
            panic!(
                "missing favorite helper inventory entry: {} {}",
                boundary.method, boundary.path
            )
        });
        assert_eq!(
            inventory.status, boundary.status,
            "favorite helper boundary status drifted: {} {}",
            boundary.method, boundary.path
        );
        assert_eq!(inventory.source.controller, boundary.legacy_controller);
        assert_eq!(inventory.source.action, boundary.legacy_action);
        assert_eq!(boundary.legacy_controller, "controllers.api.UserApi");
    }
}
