use yona_rust_pilot_migration::legacy_external::{
    find_endpoint,
    projects::{find_fixture, fixtures, AuthRequirement, MigrationDirection},
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
