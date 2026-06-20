use yona_rust_pilot_migration::legacy_external::{
    find_endpoint,
    milestones::{find_fixture, fixtures, AuthRequirement, MigrationDirection},
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
}
