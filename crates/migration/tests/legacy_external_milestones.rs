use yona_rust_pilot_migration::legacy_external::{
    find_endpoint,
    milestones::{find_fixture, fixtures, AuthRequirement, MigrationDirection},
    EndpointStatus,
};

#[test]
fn milestone_fixtures_cover_legacy_milestone_external_routes() {
    let expected = [(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/milestones",
        MigrationDirection::AppOwned,
    )];

    assert_eq!(fixtures().len(), expected.len());

    for (method, path, direction) in expected {
        let fixture = find_fixture(method, path)
            .unwrap_or_else(|| panic!("missing milestone fixture: {method} {path}"));
        let inventory = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing endpoint inventory entry: {method} {path}"));

        assert_eq!(fixture.direction, direction);
        assert_eq!(fixture.direction.endpoint_status(), inventory.status);
        assert_eq!(fixture.legacy_controller, inventory.source.controller);
        assert_eq!(fixture.legacy_action, inventory.source.action);
    }
}

#[test]
fn milestone_import_preserves_bulk_payload_and_duplicate_response_metadata() {
    let fixture = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/milestones",
    )
    .unwrap();

    assert_eq!(fixture.legacy_controller, "controllers.api.MilestoneApi");
    assert_eq!(fixture.legacy_action, "newMilestone");
    assert_eq!(fixture.direction, MigrationDirection::AppOwned);
    assert_eq!(fixture.auth, AuthRequirement::MilestoneCreatePermission);
    assert_eq!(fixture.request.path_fields, &["owner", "projectName"]);
    assert_eq!(
        fixture.request.body_fields,
        &["milestones", "title", "description", "due_on", "state"]
    );
    assert_eq!(
        fixture.response.response_fields,
        &[
            "id",
            "title",
            "state",
            "description",
            "due_on",
            "milestone",
            "message",
        ]
    );

    assert_eq!(
        fixture.payload.sample_path,
        "/-_-api/v1/owners/alice/projects/demo/milestones"
    );
    assert_eq!(fixture.payload.success_status, 201);
    let request: serde_json::Value = serde_json::from_str(fixture.payload.request_json).unwrap();
    let milestones = request["import"]["milestones"].as_array().unwrap();
    assert_eq!(milestones.len(), 2);
    assert_eq!(milestones[0]["meta"]["title"], "Legacy Milestone");
    assert_eq!(milestones[0]["meta"]["state"], "closed");
    assert_eq!(
        milestones[0]["body"]["description"],
        "legacy milestone body"
    );
    assert_eq!(milestones[0]["schedule"]["due_on"], "2026-07-15");
    assert_eq!(milestones[1]["body"]["description"], "fallback title body");

    let success: serde_json::Value = serde_json::from_str(fixture.payload.success_json).unwrap();
    assert_eq!(success[0]["id"], 7);
    assert_eq!(success[0]["title"], "Legacy Milestone");
    assert_eq!(success[0]["state"], "closed");
    assert_eq!(success[0]["description"], "legacy milestone body");
    assert_eq!(success[0]["due_on"], "2026-07-15");
    assert_eq!(success[1]["title"], "No title");
    assert_eq!(success[1]["state"], "open");

    let duplicate: serde_json::Value =
        serde_json::from_str(fixture.payload.alternate_json.unwrap()).unwrap();
    assert_eq!(fixture.payload.alternate_status, Some(201));
    assert_eq!(
        duplicate[0]["message"],
        "This milestone title already exists. Please enter a different title."
    );
    assert_eq!(duplicate[0]["milestone"]["title"], "Legacy Milestone");
}

#[test]
fn milestone_payload_fixture_stays_app_owned_adapter_metadata_only() {
    for fixture in fixtures() {
        let inventory = find_endpoint(fixture.method, fixture.path).unwrap_or_else(|| {
            panic!(
                "missing endpoint inventory entry: {} {}",
                fixture.method, fixture.path
            )
        });

        assert_eq!(
            fixture.direction.endpoint_status(),
            EndpointStatus::AppOwned
        );
        assert_eq!(inventory.status, EndpointStatus::AppOwned);
        assert!(
            !fixture.direction.endpoint_status().is_migrator_scope(),
            "{} {} must not be classified as a broad migrator route",
            fixture.method,
            fixture.path
        );
        serde_json::from_str::<serde_json::Value>(fixture.payload.request_json).unwrap();
        serde_json::from_str::<serde_json::Value>(fixture.payload.success_json).unwrap();
        serde_json::from_str::<serde_json::Value>(fixture.payload.alternate_json.unwrap()).unwrap();
    }
}
