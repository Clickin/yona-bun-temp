use yona_rust_pilot_migration::legacy_external::{
    find_endpoint,
    projects::{find_fixture, fixtures, AuthRequirement, MigrationDirection},
    EndpointStatus,
};

#[test]
fn project_fixtures_cover_legacy_project_external_routes() {
    let expected = [
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/exports",
            MigrationDirection::Export,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects",
            MigrationDirection::Import,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/labels",
            MigrationDirection::AppOwned,
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads",
            MigrationDirection::AppOwned,
        ),
    ];

    assert_eq!(fixtures().len(), expected.len());

    for (method, path, direction) in expected {
        let fixture = find_fixture(method, path)
            .unwrap_or_else(|| panic!("missing project fixture: {method} {path}"));
        let inventory = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing endpoint inventory entry: {method} {path}"));

        assert_eq!(fixture.direction, direction);
        assert_eq!(fixture.direction.endpoint_status(), inventory.status);
        assert_eq!(fixture.legacy_controller, inventory.source.controller);
        assert_eq!(fixture.legacy_action, inventory.source.action);
    }
}

#[test]
fn project_export_descriptor_preserves_export_shape() {
    let fixture = find_fixture(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/exports",
    )
    .unwrap();

    assert_eq!(fixture.legacy_controller, "controllers.api.ProjectApi");
    assert_eq!(fixture.legacy_action, "exports");
    assert_eq!(fixture.direction, MigrationDirection::Export);
    assert_eq!(fixture.auth, AuthRequirement::DeletePermission);
    assert_eq!(fixture.request.path_fields, &["owner", "projectName"]);
    assert_eq!(
        fixture.response.response_fields,
        &[
            "owner",
            "projectName",
            "projectDescription",
            "projectCreatedDate",
            "projectVcs",
            "projectScope",
            "assignees",
            "authors",
            "memberCount",
            "members",
            "issueCount",
            "postCount",
            "milestoneCount",
            "labels",
            "issues",
            "posts",
            "milestones",
        ]
    );
}

#[test]
fn project_export_descriptor_includes_deterministic_migration_payload() {
    let fixture = find_fixture(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/exports",
    )
    .unwrap();
    let payload = fixture
        .migration_payload
        .expect("project export should have a migrator payload fixture");

    assert_eq!(
        payload.sample_path,
        "/-_-api/v1/owners/alice/projects/demo/exports"
    );
    assert_eq!(payload.request_json, None);
    assert_eq!(payload.success_status, 200);
    assert_eq!(payload.alternate_status, None);
    assert_eq!(payload.alternate_json, None);

    let success: serde_json::Value = serde_json::from_str(payload.success_json).unwrap();
    assert_eq!(success["owner"], "alice");
    assert_eq!(success["projectName"], "demo");
    assert_eq!(success["projectDescription"], "Legacy project");
    assert_eq!(
        success["projectCreatedDate"],
        "2026-06-01 AM 09:00:00 +0900"
    );
    assert_eq!(success["projectVcs"], "GIT");
    assert_eq!(success["projectScope"], "PUBLIC");
    assert_eq!(success["assignees"][0]["loginId"], "assignee");
    assert_eq!(success["authors"][0]["email"], "author@example.com");
    assert_eq!(success["memberCount"], 1);
    assert_eq!(success["members"][0]["role"], "manager");
    assert_eq!(success["issueCount"], 1);
    assert_eq!(success["postCount"], 1);
    assert_eq!(success["milestoneCount"], 1);
    assert_eq!(success["labels"][0]["isExclusive"], false);

    let issue = &success["issues"][0];
    assert_eq!(issue["number"], 3);
    assert_eq!(issue["type"], "ISSUE_POST");
    assert_eq!(issue["author"]["loginId"], "author");
    assert_eq!(issue["assignees"][0]["email"], "assignee@example.com");
    assert_eq!(issue["state"], "CLOSED");
    assert_eq!(issue["milestoneTitle"], "M1");
    assert_eq!(issue["attachments"][0]["containerType"], "ISSUE_POST");
    assert_eq!(issue["comments"][0]["type"], "ISSUE_COMMENT");
    assert_eq!(
        issue["comments"][0]["childComments"][0]["body"],
        "child issue comment"
    );

    let post = &success["posts"][0];
    assert_eq!(post["number"], 4);
    assert_eq!(post["type"], "BOARD_POST");
    assert_eq!(post["comments"][0]["type"], "NONISSUE_COMMENT");

    let milestone = &success["milestones"][0];
    assert_eq!(milestone["title"], "M1");
    assert_eq!(milestone["dueDate"], "2026-06-30 PM 11:59:59 +0900");
}

#[test]
fn project_import_descriptor_preserves_body_and_status_classification() {
    let project = find_fixture("POST", "/-_-api/v1/owners/:owner/projects").unwrap();
    assert_eq!(project.direction, MigrationDirection::Import);
    assert_eq!(project.auth, AuthRequirement::SiteManagerSession);
    assert_eq!(project.request.path_fields, &["owner"]);
    assert_eq!(
        project.request.body_fields,
        &[
            "projectName",
            "projectDescription",
            "projectCreatedDate",
            "projectVcs",
            "projectScope",
            "members",
            "email",
            "role",
        ]
    );
}

#[test]
fn project_import_descriptor_includes_site_manager_payload_and_conflict_shape() {
    let fixture = find_fixture("POST", "/-_-api/v1/owners/:owner/projects").unwrap();
    let payload = fixture
        .migration_payload
        .expect("project import should have a migrator payload fixture");

    assert_eq!(payload.sample_path, "/-_-api/v1/owners/alice/projects");
    assert_eq!(payload.success_status, 201);
    assert_eq!(payload.alternate_status, Some(400));

    let request: serde_json::Value =
        serde_json::from_str(payload.request_json.expect("project import request JSON")).unwrap();
    assert_eq!(request["projectName"], "demo");
    assert_eq!(request["projectDescription"], "Legacy project");
    assert_eq!(
        request["projectCreatedDate"],
        "2026-06-01 AM 09:00:00 +0900"
    );
    assert_eq!(request["projectVcs"], "GIT");
    assert_eq!(request["projectScope"], "PUBLIC");
    assert_eq!(request["members"][0]["email"], "alice@example.com");
    assert_eq!(request["members"][0]["role"], "manager");
    assert_eq!(request["members"][1]["role"], "member");

    let created: serde_json::Value = serde_json::from_str(payload.success_json).unwrap();
    assert_eq!(created["id"], 10);
    assert_eq!(created["owner"], "alice");
    assert_eq!(created["name"], "demo");
    assert_eq!(created["overview"], "Legacy project");
    assert_eq!(created["vcs"], "GIT");

    let conflict: serde_json::Value =
        serde_json::from_str(payload.alternate_json.expect("project conflict JSON")).unwrap();
    assert_eq!(conflict["status"], 409);
    assert_eq!(conflict["reason"], "Conflict");
    assert_eq!(conflict["project"]["owner"], "alice");
    assert_eq!(conflict["project"]["name"], "demo");
}

#[test]
fn project_app_owned_helpers_preserve_label_and_title_head_shapes() {
    let labels = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/labels",
    )
    .unwrap();
    assert_eq!(labels.direction, MigrationDirection::AppOwned);
    assert_eq!(labels.auth, AuthRequirement::IssueLabelCreatePermission);
    assert_eq!(
        labels.request.body_fields,
        &[
            "labels",
            "labelName",
            "labelColor",
            "category",
            "isExclusive"
        ]
    );
    assert_eq!(
        labels.response.response_fields,
        &[
            "status",
            "label",
            "category",
            "labelColor",
            "isExclusive",
            "reason",
            "message",
        ]
    );
}

#[test]
fn only_migrator_project_descriptors_carry_migration_payload_samples() {
    for fixture in fixtures() {
        let inventory = find_endpoint(fixture.method, fixture.path).unwrap_or_else(|| {
            panic!(
                "missing endpoint inventory entry: {} {}",
                fixture.method, fixture.path
            )
        });

        if fixture.direction.endpoint_status().is_migrator_scope() {
            assert_ne!(inventory.status, EndpointStatus::AppOwned);
            assert!(
                fixture.migration_payload.is_some(),
                "{} {} should carry a deterministic migration payload",
                fixture.method,
                fixture.path
            );
        } else {
            assert_eq!(inventory.status, EndpointStatus::AppOwned);
            assert!(
                fixture.migration_payload.is_none(),
                "{} {} is app-owned and must not be treated as a migration payload source",
                fixture.method,
                fixture.path
            );
        }
    }
}

#[test]
fn title_heads_action_and_path_are_stable() {
    let fixture = find_fixture(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads",
    )
    .unwrap();

    assert_eq!(
        fixture.path,
        "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads"
    );
    assert_eq!(fixture.legacy_controller, "controllers.api.ProjectApi");
    assert_eq!(fixture.legacy_action, "titleHeads");
    assert_eq!(fixture.direction, MigrationDirection::AppOwned);
    assert_eq!(fixture.auth, AuthRequirement::ReadPermission);
    assert_eq!(fixture.request.query_fields, &["query"]);
    assert_eq!(fixture.request.header_fields, &["Accept"]);
    assert_eq!(
        fixture.response.response_fields,
        &[
            "result",
            "name",
            "frequency",
            "category",
            "searchText",
            "categoryId",
            "id",
            "labelColor",
            "isExclusive",
        ]
    );
}
