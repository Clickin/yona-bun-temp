use yona_rust_pilot_migration::legacy_external::{
    find_endpoint,
    issues::{find_fixture, fixtures, AuthRequirement, MigrationDirection},
    EndpointStatus,
};

#[test]
fn issue_fixtures_cover_legacy_issue_comment_external_routes() {
    let expected = [
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports",
            MigrationDirection::Import,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues",
            MigrationDirection::Import,
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
            MigrationDirection::AppOwned,
        ),
        (
            "PUT",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
            MigrationDirection::AppOwned,
        ),
        (
            "PATCH",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
            MigrationDirection::AppOwned,
        ),
        (
            "PATCH",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/content",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments",
            MigrationDirection::AppOwned,
        ),
        (
            "PUT",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments/:commentId",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/commentNotiReceivers",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issuelabel/:number",
            MigrationDirection::AppOwned,
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignableUsers",
            MigrationDirection::AppOwned,
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/assignableUsers",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees",
            MigrationDirection::AppOwned,
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/findSharer",
            MigrationDirection::AppOwned,
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/sharableUsers",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/upvoteWeight",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/downvoteWeight",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/detectChange",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/translation",
            MigrationDirection::AppOwned,
        ),
    ];

    assert_eq!(fixtures().len(), expected.len());

    for (method, path, direction) in expected {
        let fixture = find_fixture(method, path)
            .unwrap_or_else(|| panic!("missing issue fixture: {method} {path}"));
        let inventory = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing endpoint inventory entry: {method} {path}"));

        assert_eq!(fixture.direction, direction);
        assert_eq!(fixture.direction.endpoint_status(), inventory.status);
        assert_eq!(fixture.legacy_controller, inventory.source.controller);
        assert_eq!(fixture.legacy_action, inventory.source.action);
    }
}

#[test]
fn translation_boundary_is_app_owned_not_migrator_scoped() {
    let fixture = find_fixture("POST", "/-_-api/v1/translation").unwrap();
    let inventory = find_endpoint("POST", "/-_-api/v1/translation").unwrap();

    assert_eq!(fixture.legacy_controller, "controllers.api.IssueApi");
    assert_eq!(fixture.legacy_action, "translate");
    assert_eq!(fixture.direction, MigrationDirection::AppOwned);
    assert_eq!(
        fixture.direction.endpoint_status(),
        EndpointStatus::AppOwned
    );
    assert_eq!(inventory.status, EndpointStatus::AppOwned);
    assert!(!inventory.status.is_migrator_scope());
    assert_eq!(fixture.auth, AuthRequirement::LoginSession);
    assert_eq!(
        fixture.request.body_fields,
        &["owner", "projectName", "type", "number"]
    );
    assert_eq!(
        fixture.response.response_fields,
        &["translated", "Precondition Failed"]
    );
}

#[test]
fn typo_preserving_issue_action_names_are_stable() {
    let comment_receivers = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/commentNotiReceivers",
    )
    .unwrap();
    assert_eq!(comment_receivers.legacy_action, "commentNotiRecivers");
    assert_eq!(
        comment_receivers.request.body_fields,
        &["comment", "parentCommentId"]
    );
    assert_eq!(
        comment_receivers.response.response_fields,
        &["receivers", "loginId", "name"]
    );

    let assignees = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees",
    )
    .unwrap();
    assert_eq!(assignees.legacy_action, "updateAssginees");
    assert_eq!(assignees.request.body_fields, &["assignees"]);
    assert_eq!(
        assignees.response.response_fields,
        &["assignee", "loginId", "name", "issue"]
    );
}

#[test]
fn token_auth_issue_endpoints_are_explicit() {
    for (method, path, body_fields) in [
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
            &[][..],
        ),
        (
            "PUT",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
            &["title", "body", "state", "assignees", "milestoneTitle"][..],
        ),
        (
            "PATCH",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
            &["state"][..],
        ),
    ] {
        let fixture = find_fixture(method, path).unwrap();
        assert_eq!(fixture.auth, AuthRequirement::AuthorizationTokenHeader);
        assert_eq!(fixture.request.header_fields, &["Authorization"]);
        assert_eq!(fixture.request.body_fields, body_fields);
    }

    let comment = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments",
    )
    .unwrap();
    assert_eq!(
        comment.auth,
        AuthRequirement::AuthorizationTokenOrImportSession
    );
    assert_eq!(comment.request.header_fields, &["Authorization"]);
    assert!(comment.request.body_fields.contains(&"comment"));
    assert!(comment.request.body_fields.contains(&"body"));
}

#[test]
fn import_classification_and_app_owned_export_shape_match_legacy_inventory() {
    let imports = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports",
    )
    .unwrap();
    assert_eq!(imports.direction, MigrationDirection::Import);
    assert_eq!(imports.auth, AuthRequirement::AnonymousCheck);
    assert_eq!(imports.request.query_fields, &["postNumber"]);
    assert_eq!(imports.response.response_fields, &["number"]);

    let bulk = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues",
    )
    .unwrap();
    assert_eq!(bulk.direction, MigrationDirection::Import);
    assert_eq!(bulk.auth, AuthRequirement::IssueCreatePermission);
    assert!(bulk.request.body_fields.contains(&"issues"));
    assert!(bulk.request.body_fields.contains(&"sendNotification"));
    assert!(bulk.request.body_fields.contains(&"email"));
    assert!(bulk.request.body_fields.contains(&"labelName"));
    assert!(bulk.request.body_fields.contains(&"category"));
    assert!(bulk.request.body_fields.contains(&"temporaryUploadFiles"));

    let app_owned_export = find_fixture(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
    )
    .unwrap();
    assert_eq!(app_owned_export.direction, MigrationDirection::AppOwned);
    assert_eq!(
        app_owned_export.auth,
        AuthRequirement::AuthorizationTokenHeader
    );
    assert!(app_owned_export
        .response
        .response_fields
        .contains(&"events"));
    assert!(app_owned_export.response.response_fields.contains(&"actor"));
}

#[test]
fn issue_imports_descriptor_includes_post_to_issue_payload_fixture() {
    let fixture = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports",
    )
    .unwrap();
    let payload = fixture
        .migration_payload
        .expect("IssueApi.imports should have a migrator payload fixture");

    assert_eq!(fixture.legacy_controller, "controllers.api.IssueApi");
    assert_eq!(fixture.legacy_action, "imports");
    assert_eq!(fixture.direction, MigrationDirection::Import);
    assert_eq!(fixture.auth, AuthRequirement::AnonymousCheck);
    assert_eq!(
        payload.sample_path,
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4"
    );
    assert_eq!(payload.request_json, None);
    assert_eq!(payload.success_status, 200);
    assert_eq!(payload.alternate_status, Some(400));
    assert_eq!(payload.alternate_json, None);

    let success: serde_json::Value = serde_json::from_str(payload.success_json).unwrap();
    assert_eq!(success["number"], 5);
}

#[test]
fn bulk_issue_import_descriptor_includes_deterministic_payload_and_error_shape() {
    let fixture = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues",
    )
    .unwrap();
    let payload = fixture
        .migration_payload
        .expect("IssueApi.newIssues should have a migrator payload fixture");

    assert_eq!(fixture.legacy_controller, "controllers.api.IssueApi");
    assert_eq!(fixture.legacy_action, "newIssues");
    assert_eq!(fixture.direction, MigrationDirection::Import);
    assert_eq!(fixture.auth, AuthRequirement::IssueCreatePermission);
    assert_eq!(
        fixture.request.body_fields,
        &[
            "issues",
            "sendNotification",
            "author",
            "loginId",
            "name",
            "email",
            "title",
            "body",
            "state",
            "createdAt",
            "updatedAt",
            "assignees",
            "milestoneTitle",
            "dueDate",
            "labels",
            "labelName",
            "category",
            "temporaryUploadFiles",
            "number",
        ]
    );
    assert_eq!(
        payload.sample_path,
        "/-_-api/v1/owners/alice/projects/demo/issues"
    );
    assert_eq!(payload.success_status, 201);
    assert_eq!(payload.alternate_status, Some(400));

    let request: serde_json::Value =
        serde_json::from_str(payload.request_json.expect("issue import request JSON")).unwrap();
    assert_eq!(request["sendNotification"], true);

    let issue = &request["issues"][0];
    assert_eq!(issue["number"], 3);
    assert_eq!(issue["author"]["loginId"], "author");
    assert_eq!(issue["author"]["email"], "author@example.com");
    assert_eq!(issue["title"], "Legacy issue");
    assert_eq!(issue["body"], "legacy issue body");
    assert_eq!(issue["state"], "CLOSED");
    assert_eq!(issue["createdAt"], "2026-06-01 AM 09:00:00 +0900");
    assert_eq!(issue["updatedAt"], "2026-06-02 PM 03:30:00 +0900");
    assert_eq!(issue["assignees"][0]["email"], "assignee@example.com");
    assert_eq!(issue["milestoneTitle"], "M1");
    assert_eq!(issue["dueDate"], "2026-06-30 PM 11:59:59 +0900");
    assert_eq!(issue["labels"][0]["labelName"], "Bug");
    assert_eq!(issue["labels"][0]["category"], "Type");
    assert_eq!(issue["temporaryUploadFiles"][0], "tmp-issue-upload");

    let success: serde_json::Value = serde_json::from_str(payload.success_json).unwrap();
    assert_eq!(success[0]["status"], 201);
    assert_eq!(success[0]["location"], "/alice/demo/issue/3");

    let alternate: serde_json::Value =
        serde_json::from_str(payload.alternate_json.expect("issue import error JSON")).unwrap();
    assert_eq!(
        alternate["message"],
        "No issues key exists or value wasn't array!"
    );
}

#[test]
fn only_migrator_issue_descriptors_carry_payload_samples() {
    for fixture in fixtures() {
        let inventory = find_endpoint(fixture.method, fixture.path).unwrap_or_else(|| {
            panic!(
                "missing endpoint inventory entry: {} {}",
                fixture.method, fixture.path
            )
        });

        assert_eq!(fixture.direction.endpoint_status(), inventory.status);
        assert_ne!(fixture.direction, MigrationDirection::Deferred);

        if fixture.direction.endpoint_status().is_migrator_scope() {
            assert_eq!(fixture.direction, MigrationDirection::Import);
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
fn json_search_endpoints_preserve_accept_and_content_range_metadata() {
    for (method, path) in [
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignableUsers",
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/assignableUsers",
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/findSharer",
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/sharableUsers",
        ),
    ] {
        let fixture = find_fixture(method, path).unwrap();
        assert_eq!(fixture.request.header_fields, &["Accept"]);
        assert!(fixture.request.query_fields.contains(&"query"));
        assert!(matches!(
            fixture.auth,
            AuthRequirement::ProjectReadJsonAccept | AuthRequirement::AnonymousJsonAccept
        ));

        if path.contains("assignableUsers") || path.contains("sharableUsers") {
            assert_eq!(fixture.response.header_fields, &["Content-Range"]);
        }
    }
}
