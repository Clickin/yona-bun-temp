use yoram_migration::legacy_external::{
    find_endpoint,
    watchers::{
        favorite_helper_boundaries, find_fixture, fixtures, parse_favorite_issues_response,
        parse_favorite_organizations_response, parse_favorite_projects_response,
        parse_favorite_toggle_response, parse_watcher_request, parse_watcher_response,
        AuthRequirement, MigrationDirection, WatcherAdapterError, WatcherRequestExpectation,
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

#[test]
fn watcher_request_parser_preserves_legacy_path_query_and_empty_ok_boundary() {
    let issues =
        parse_watcher_request("/-_-api/v1/owners/alice/projects/demo/posts/3/watchers?type=issues")
            .unwrap();
    assert_eq!(issues.owner, "alice");
    assert_eq!(issues.project_name, "demo");
    assert_eq!(issues.number, 3);
    assert_eq!(
        issues.expectation,
        WatcherRequestExpectation::JsonProjection(WatcherResourceType::Issues)
    );

    let posts = parse_watcher_request(
        "/-_-api/v1/owners/alice/projects/demo/posts/4/watchers?unused=1&type=posts",
    )
    .unwrap();
    assert_eq!(
        posts.expectation,
        WatcherRequestExpectation::JsonProjection(WatcherResourceType::Posts)
    );

    let invalid_type =
        parse_watcher_request("/-_-api/v1/owners/alice/projects/demo/posts/4/watchers?type=ISSUES")
            .unwrap();
    assert_eq!(
        invalid_type.expectation,
        WatcherRequestExpectation::EmptyOk {
            type_value: Some("ISSUES".to_string())
        }
    );

    let missing_type =
        parse_watcher_request("/-_-api/v1/owners/alice/projects/demo/posts/4/watchers").unwrap();
    assert_eq!(
        missing_type.expectation,
        WatcherRequestExpectation::EmptyOk { type_value: None }
    );
}

#[test]
fn watcher_request_parser_rejects_non_route_paths_and_numbers() {
    assert!(matches!(
        parse_watcher_request("/-_-api/v1/favoriteProjects").unwrap_err(),
        WatcherAdapterError::InvalidPath(_)
    ));
    assert!(matches!(
        parse_watcher_request("/-_-api/v1/owners/alice/projects/demo/posts/not-a-number/watchers")
            .unwrap_err(),
        WatcherAdapterError::InvalidNumber(value) if value == "not-a-number"
    ));
    assert!(matches!(
        parse_watcher_request("/-_-api/v1/owners/alice/projects/demo/posts/-1/watchers")
            .unwrap_err(),
        WatcherAdapterError::InvalidNumber(value) if value == "-1"
    ));
}

#[test]
fn watcher_response_parser_normalizes_recursive_payload_and_scalar_counts() {
    let response = parse_watcher_response(
        r#"{
          "wrapper": {
            "totalWatchers": "2",
            "watchersInList": 2,
            "watchers": [
              {"profile": {"name": "Alice Owner", "url": "/alice"}},
              {"name": 42, "url": true}
            ]
          }
        }"#,
    )
    .unwrap();

    assert_eq!(response.total_watchers, 2);
    assert_eq!(response.watchers_in_list, 2);
    assert_eq!(response.watchers.len(), 2);
    assert_eq!(response.watchers[0].name, "Alice Owner");
    assert_eq!(response.watchers[0].url, "/alice");
    assert_eq!(response.watchers[1].name, "42");
    assert_eq!(response.watchers[1].url, "true");
}

#[test]
fn watcher_response_parser_rejects_bad_payload_boundaries() {
    assert!(matches!(
        parse_watcher_response("{not json").unwrap_err(),
        WatcherAdapterError::InvalidJson(_)
    ));
    assert!(matches!(
        parse_watcher_response(r#"{"totalWatchers": 1, "watchersInList": 1}"#).unwrap_err(),
        WatcherAdapterError::InvalidWatchersArray
    ));
    assert!(matches!(
        parse_watcher_response(
            r#"{"totalWatchers": "many", "watchersInList": 1, "watchers": []}"#
        )
        .unwrap_err(),
        WatcherAdapterError::InvalidInteger {
            field: "totalWatchers",
            value
        } if value == "many"
    ));
    assert!(matches!(
        parse_watcher_response(
            r#"{"totalWatchers": 1, "watchersInList": 1, "watchers": ["alice"]}"#
        )
        .unwrap_err(),
        WatcherAdapterError::InvalidWatcherItem { index: 0 }
    ));
}

#[test]
fn favorite_project_and_organization_parsers_preserve_legacy_list_shapes() {
    let projects = parse_favorite_projects_response(
        r#"{
          "outer": {
            "projectIds": ["10", 11],
            "projects": [
              {"projectId": "10", "projectName": "demo", "owner": "alice"},
              {"projectId": 11, "projectName": 99, "owner": true}
            ]
          }
        }"#,
    )
    .unwrap();
    assert_eq!(projects.project_ids, vec![10, 11]);
    assert_eq!(projects.projects[0].project_id, Some(10));
    assert_eq!(projects.projects[0].project_name.as_deref(), Some("demo"));
    assert_eq!(projects.projects[1].project_name.as_deref(), Some("99"));
    assert_eq!(projects.projects[1].owner.as_deref(), Some("true"));

    let organizations = parse_favorite_organizations_response(
        r#"{
          "organizationIds": [7],
          "organizations": [{"organizationId": "7", "organizationName": "team"}]
        }"#,
    )
    .unwrap();
    assert_eq!(organizations.organization_ids, vec![7]);
    assert_eq!(organizations.organizations[0].organization_id, Some(7));
    assert_eq!(
        organizations.organizations[0].organization_name.as_deref(),
        Some("team")
    );
}

#[test]
fn favorite_issue_and_toggle_parsers_preserve_legacy_misspelled_shapes() {
    let issues = parse_favorite_issues_response(
        r#"{
          "projectIds": [21],
          "projects": [
            {
              "issueId": "21",
              "issueTitle": "Legacy favorite",
              "issueAuthorName": "Alice"
            }
          ]
        }"#,
    )
    .unwrap();
    assert_eq!(issues.issue_ids, vec![21]);
    assert_eq!(issues.issues[0].issue_id, Some(21));
    assert_eq!(
        issues.issues[0].issue_title.as_deref(),
        Some("Legacy favorite")
    );
    assert_eq!(issues.issues[0].issue_author_name.as_deref(), Some("Alice"));

    let project_toggle =
        parse_favorite_toggle_response(r#"{"projectId": 10, "favored": "true"}"#, "projectId")
            .unwrap();
    assert_eq!(project_toggle.resource_id, "10");
    assert!(project_toggle.favored);
    assert_eq!(project_toggle.message, None);

    let issue_toggle = parse_favorite_toggle_response(
        r#"{"issueId": "21", "favored": false, "message": "issue.favorite.deleted"}"#,
        "issueId",
    )
    .unwrap();
    assert_eq!(issue_toggle.resource_id_field, "issueId");
    assert_eq!(issue_toggle.resource_id, "21");
    assert!(!issue_toggle.favored);
    assert_eq!(
        issue_toggle.message.as_deref(),
        Some("issue.favorite.deleted")
    );
}

#[test]
fn favorite_parsers_reject_invalid_id_array_and_toggle_flags() {
    assert!(matches!(
        parse_favorite_projects_response(r#"{"projectIds": "10", "projects": []}"#).unwrap_err(),
        WatcherAdapterError::InvalidIdArray("projectIds")
    ));
    assert!(matches!(
        parse_favorite_organizations_response(
            r#"{"organizationIds": [1], "organizations": "not-array"}"#
        )
        .unwrap_err(),
        WatcherAdapterError::InvalidFavoriteArray("organizations")
    ));
    assert!(matches!(
        parse_favorite_toggle_response(r#"{"projectId": "10", "favored": "yes"}"#, "projectId")
            .unwrap_err(),
        WatcherAdapterError::InvalidBoolean {
            field: "favored",
            value
        } if value == "yes"
    ));
}
