use yona_rust_pilot_migration::legacy_external::{
    find_endpoint,
    issues::{find_fixture, fixtures, AuthRequirement, MigrationDirection},
    issues::{
        parse_issue_assignee_replace_request, parse_issue_comment_create_request,
        parse_issue_comment_update_request, parse_issue_detect_change_request,
        parse_issue_detect_change_response, parse_issue_import_request,
        parse_issue_label_replace_request, parse_issue_post_conversion_request,
        parse_issue_post_conversion_response, parse_issue_share_update_request,
        parse_issue_weight_response, IssueAdapterError, IssueImportAction,
        IssuePostConversionAction, IssueState,
    },
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
fn issue_adapter_normalizes_recursive_legacy_bulk_import_payload() {
    let fixture = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues",
    )
    .unwrap();
    let payload = fixture
        .migration_payload
        .expect("IssueApi.newIssues should have a migrator payload fixture");

    let batch = parse_issue_import_request(
        payload.sample_path,
        payload.request_json.expect("issue import request JSON"),
        &[],
    )
    .unwrap();

    assert_eq!(batch.endpoint_method, "POST");
    assert_eq!(
        batch.endpoint_path,
        "/-_-api/v1/owners/:owner/projects/:projectName/issues"
    );
    assert_eq!(batch.owner, "alice");
    assert_eq!(batch.project_name, "demo");
    assert_eq!(batch.send_notification, true);
    assert_eq!(batch.entries.len(), 1);

    let issue = &batch.entries[0];
    assert_eq!(issue.source_index, 0);
    assert_eq!(
        issue.author.as_ref().unwrap().login_id.as_deref(),
        Some("author")
    );
    assert_eq!(
        issue.author.as_ref().unwrap().email.as_deref(),
        Some("author@example.com")
    );
    assert_eq!(issue.title, "Legacy issue");
    assert_eq!(issue.body, "legacy issue body");
    assert_eq!(issue.state, IssueState::Closed);
    assert_eq!(issue.state.as_legacy_str(), "CLOSED");
    assert_eq!(issue.requested_number, Some(3));
    assert_eq!(
        issue.created_at.as_deref(),
        Some("2026-06-01 AM 09:00:00 +0900")
    );
    assert_eq!(
        issue.updated_at.as_deref(),
        Some("2026-06-02 PM 03:30:00 +0900")
    );
    assert_eq!(issue.assignees.len(), 1);
    assert_eq!(
        issue.assignees[0].email.as_deref(),
        Some("assignee@example.com")
    );
    assert_eq!(issue.milestone_title.as_deref(), Some("M1"));
    assert_eq!(
        issue.due_date.as_deref(),
        Some("2026-06-30 PM 11:59:59 +0900")
    );
    assert_eq!(issue.labels.len(), 1);
    assert_eq!(issue.labels[0].label_name.as_deref(), Some("Bug"));
    assert_eq!(issue.labels[0].category.as_deref(), Some("Type"));
    assert_eq!(issue.temporary_upload_files, vec!["tmp-issue-upload"]);
    assert_eq!(issue.action, IssueImportAction::Create);
    assert_eq!(batch.creatable_entries().count(), 1);
    assert_eq!(batch.conflict_entries().count(), 0);
}

#[test]
fn issue_imports_adapter_normalizes_post_to_issue_conversion_fixture() {
    let source_post = r##"{
      "export": {
        "number": 4,
        "author": {
          "loginId": "post-author",
          "name": "Post Author",
          "email": "post-author@example.com"
        },
        "content": {
          "title": "Legacy post title",
          "body": "legacy post body"
        },
        "createdAt": "2026-06-01 AM 09:00:00 +0900",
        "updatedAt": "2026-06-02 PM 03:30:00 +0900",
        "state": "CLOSED",
        "labels": [
          { "labelName": "Question", "labelColor": "#ff9800", "category": "Kind" }
        ],
        "milestoneTitle": "Imported milestone",
        "attachments": [
          {
            "id": 901,
            "name": "post.png",
            "hash": "post-hash",
            "containerType": "BOARD_POST",
            "containerId": 11,
            "mimeType": "image/png",
            "size": 1024
          }
        ],
        "comments": [
          {
            "id": 51,
            "author": { "loginId": "commenter", "name": "Commenter", "email": "c@example.com" },
            "contents": "top-level post comment",
            "createdAt": "2026-06-03 AM 10:00:00 +0900",
            "attachments": [
              { "id": "951", "name": "comment.txt", "containerType": "NONISSUE_COMMENT", "containerId": "51" }
            ]
          },
          {
            "id": 52,
            "parentCommentId": 51,
            "author": { "loginId": "child", "name": "Child", "email": "child@example.com" },
            "body": "child post comment"
          }
        ]
      }
    }"##;

    let request = parse_issue_post_conversion_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
        Some(source_post),
        5,
        &[],
    )
    .unwrap();

    assert_eq!(request.endpoint_method, "POST");
    assert_eq!(
        request.endpoint_path,
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports"
    );
    assert_eq!(request.owner, "alice");
    assert_eq!(request.project_name, "demo");
    assert_eq!(request.post_number, 4);
    assert_eq!(request.source_post_number, Some(4));
    assert_eq!(
        request.author.as_ref().unwrap().login_id.as_deref(),
        Some("post-author")
    );
    assert_eq!(request.title.as_deref(), Some("Legacy post title"));
    assert_eq!(request.body.as_deref(), Some("legacy post body"));
    assert_eq!(request.state, IssueState::Open);
    assert_eq!(request.state.as_legacy_str(), "OPEN");
    assert_eq!(
        request.created_at.as_deref(),
        Some("2026-06-01 AM 09:00:00 +0900")
    );
    assert_eq!(request.labels.len(), 1);
    assert_eq!(request.labels[0].label_name.as_deref(), Some("Question"));
    assert_eq!(
        request.milestone_title.as_deref(),
        Some("Imported milestone")
    );
    assert_eq!(request.attachments.len(), 1);
    assert_eq!(
        request.attachments[0].container_type.as_deref(),
        Some("BOARD_POST")
    );
    assert_eq!(request.comments.len(), 2);
    assert_eq!(request.comments[0].source_comment_id.as_deref(), Some("51"));
    assert_eq!(
        request.comments[0].attachments[0].container_type.as_deref(),
        Some("NONISSUE_COMMENT")
    );
    assert_eq!(
        request.comments[1].parent_source_comment_id.as_deref(),
        Some("51")
    );
    assert_eq!(request.action, IssuePostConversionAction::Create);

    let response = parse_issue_post_conversion_response(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
        r#"{"number":5}"#,
    )
    .unwrap();
    assert_eq!(response.issue_number, 5);
    assert_eq!(response.post_number, 4);
}

#[test]
fn issue_imports_adapter_preserves_defaults_and_scalar_fallbacks() {
    let source_post = r#"{
      "number": "4",
      "author": { "loginId": 1001, "name": false, "email": "scalar@example.com" },
      "title": 77,
      "body": true,
      "labels": [
        { "labelName": 9, "labelColor": false, "category": "Type" }
      ],
      "comments": [
        {
          "id": 51,
          "parentId": 50,
          "body": 123,
          "attachments": { "id": 951, "size": 3, "containerType": "NONISSUE_COMMENT" }
        }
      ],
      "attachments": { "id": 901, "size": 4, "containerType": "BOARD_POST" }
    }"#;

    let request = parse_issue_post_conversion_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
        Some(source_post),
        6,
        &[],
    )
    .unwrap();

    assert_eq!(
        request.author.as_ref().unwrap().login_id.as_deref(),
        Some("1001")
    );
    assert_eq!(
        request.author.as_ref().unwrap().name.as_deref(),
        Some("false")
    );
    assert_eq!(request.title.as_deref(), Some("77"));
    assert_eq!(request.body.as_deref(), Some("true"));
    assert_eq!(request.state, IssueState::Open);
    assert_eq!(request.labels[0].label_name.as_deref(), Some("9"));
    assert_eq!(request.labels[0].label_color.as_deref(), Some("false"));
    assert_eq!(request.comments[0].body, "123");
    assert_eq!(
        request.comments[0].parent_source_comment_id.as_deref(),
        Some("50")
    );
    assert_eq!(request.attachments[0].size.as_deref(), Some("4"));
}

#[test]
fn issue_imports_adapter_rejects_bad_path_query_and_response_boundaries() {
    let missing_post_number = parse_issue_post_conversion_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports",
        None,
        5,
        &[],
    )
    .unwrap_err();
    assert_eq!(missing_post_number, IssueAdapterError::MissingPostNumber);

    let invalid_post_number = parse_issue_post_conversion_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=0",
        None,
        5,
        &[],
    )
    .unwrap_err();
    assert_eq!(
        invalid_post_number,
        IssueAdapterError::InvalidPostNumber("0".to_string())
    );

    let invalid_path = parse_issue_post_conversion_request(
        "/-_-api/v1/owners/alice/projects/demo/issues?postNumber=4",
        None,
        5,
        &[],
    )
    .unwrap_err();
    assert_eq!(
        invalid_path,
        IssueAdapterError::InvalidPath(
            "/-_-api/v1/owners/alice/projects/demo/issues?postNumber=4".to_string()
        )
    );

    let invalid_snapshot = parse_issue_post_conversion_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
        Some(r#"["not", "a", "post"]"#),
        5,
        &[],
    )
    .unwrap_err();
    assert_eq!(invalid_snapshot, IssueAdapterError::InvalidPostSnapshot);

    let missing_response_number = parse_issue_post_conversion_response(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
        r#"{"ok":true}"#,
    )
    .unwrap_err();
    assert_eq!(
        missing_response_number,
        IssueAdapterError::MissingResponseNumber
    );

    let invalid_response_number = parse_issue_post_conversion_response(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
        r#"{"number":"nope"}"#,
    )
    .unwrap_err();
    assert_eq!(
        invalid_response_number,
        IssueAdapterError::InvalidResponseNumber("nope".to_string())
    );
}

#[test]
fn issue_imports_adapter_classifies_missing_mismatch_and_next_number_conflict() {
    let missing = parse_issue_post_conversion_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
        None,
        5,
        &[],
    )
    .unwrap();
    assert_eq!(missing.action, IssuePostConversionAction::MissingSourcePost);

    let mismatch = parse_issue_post_conversion_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
        Some(r#"{"number":5,"title":"other","body":"body"}"#),
        6,
        &[],
    )
    .unwrap();
    assert_eq!(
        mismatch.action,
        IssuePostConversionAction::SourcePostNumberMismatch
    );

    let conflict = parse_issue_post_conversion_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
        Some(r#"{"number":4,"title":"post","body":"body"}"#),
        6,
        &[6],
    )
    .unwrap();
    assert_eq!(
        conflict.action,
        IssuePostConversionAction::ConflictNextIssueNumber
    );
}

#[test]
fn issue_adapter_preserves_find_value_defaults_and_scalar_fallbacks() {
    let payload = r#"{
      "wrapper": {
        "issues": [
          {
            "outer": {
              "author": { "loginId": 1001, "name": false, "email": "numeric@example.com" },
              "content": { "title": 77, "body": true },
              "number": "42",
              "assignees": { "email": "solo@example.com", "loginId": "solo" },
              "labels": [
                { "labelName": 9, "labelColor": false, "category": "Type" }
              ],
              "temporaryUploadFiles": 951
            }
          }
        ]
      }
    }"#;

    let batch =
        parse_issue_import_request("/-_-api/v1/owners/alice/projects/demo/issues", payload, &[])
            .unwrap();

    assert_eq!(batch.send_notification, false);
    let issue = &batch.entries[0];
    assert_eq!(
        issue.author.as_ref().unwrap().login_id.as_deref(),
        Some("1001")
    );
    assert_eq!(
        issue.author.as_ref().unwrap().name.as_deref(),
        Some("false")
    );
    assert_eq!(issue.title, "77");
    assert_eq!(issue.body, "true");
    assert_eq!(issue.state, IssueState::Open);
    assert_eq!(issue.state.as_legacy_str(), "OPEN");
    assert_eq!(issue.requested_number, Some(42));
    assert_eq!(
        issue.assignees[0].email.as_deref(),
        Some("solo@example.com")
    );
    assert_eq!(issue.labels[0].label_name.as_deref(), Some("9"));
    assert_eq!(issue.labels[0].label_color.as_deref(), Some("false"));
    assert_eq!(issue.temporary_upload_files, vec!["951"]);
}

#[test]
fn issue_adapter_classifies_requested_number_conflicts_for_migration_preflight() {
    let payload = r#"{
      "issues": [
        { "number": 3, "title": "existing", "body": "body" },
        { "number": 4, "title": "first", "body": "body" },
        { "number": "4", "title": "duplicate in batch", "body": "body" },
        { "title": "auto-number", "body": "body" }
      ]
    }"#;

    let batch = parse_issue_import_request(
        "/-_-api/v1/owners/alice/projects/demo/issues",
        payload,
        &[3],
    )
    .unwrap();

    assert_eq!(
        batch
            .entries
            .iter()
            .map(|entry| entry.action)
            .collect::<Vec<_>>(),
        vec![
            IssueImportAction::ConflictExistingNumber,
            IssueImportAction::Create,
            IssueImportAction::ConflictEarlierInBatch,
            IssueImportAction::Create,
        ]
    );
    assert_eq!(batch.creatable_entries().count(), 2);
    assert_eq!(batch.conflict_entries().count(), 2);
}

#[test]
fn issue_adapter_rejects_legacy_bad_request_boundaries_before_tool_consumption() {
    let missing_issues = parse_issue_import_request(
        "/-_-api/v1/owners/alice/projects/demo/issues",
        r#"{"issues":{"title":"not an array"}}"#,
        &[],
    )
    .unwrap_err();
    assert_eq!(missing_issues, IssueAdapterError::MissingIssuesArray);

    let invalid_item = parse_issue_import_request(
        "/-_-api/v1/owners/alice/projects/demo/issues",
        r#"{"issues":["not an object"]}"#,
        &[],
    )
    .unwrap_err();
    assert_eq!(
        invalid_item,
        IssueAdapterError::InvalidIssueItem { index: 0 }
    );

    let missing_title = parse_issue_import_request(
        "/-_-api/v1/owners/alice/projects/demo/issues",
        r#"{"issues":[{"body":"body"}]}"#,
        &[],
    )
    .unwrap_err();
    assert_eq!(
        missing_title,
        IssueAdapterError::MissingField {
            index: 0,
            field: "title"
        }
    );

    let invalid_path = parse_issue_import_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/3",
        r#"{"issues":[{"title":"title","body":"body"}]}"#,
        &[],
    )
    .unwrap_err();
    assert_eq!(
        invalid_path,
        IssueAdapterError::InvalidPath(
            "/-_-api/v1/owners/alice/projects/demo/issues/3".to_string()
        )
    );
}

#[test]
fn issue_helper_adapter_normalizes_comment_create_update_and_labels() {
    let create = parse_issue_comment_create_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/comments",
        r#"{
          "wrapper": {
            "author": { "loginId": 1001, "name": false, "email": "a@example.com" },
            "body": 77,
            "createdAt": "2026-06-03 AM 10:00:00 +0900",
            "temporaryUploadFiles": 951
          }
        }"#,
    )
    .unwrap();

    assert_eq!(create.path.endpoint_method, "POST");
    assert_eq!(
        create.path.endpoint_path,
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments"
    );
    assert_eq!(create.path.owner, "alice");
    assert_eq!(create.path.project_name, "demo");
    assert_eq!(create.path.number, 7);
    assert_eq!(
        create.author.as_ref().unwrap().login_id.as_deref(),
        Some("1001")
    );
    assert_eq!(
        create.author.as_ref().unwrap().name.as_deref(),
        Some("false")
    );
    assert_eq!(create.body.as_deref(), Some("77"));
    assert_eq!(create.token_comment, None);
    assert_eq!(
        create.created_at.as_deref(),
        Some("2026-06-03 AM 10:00:00 +0900")
    );
    assert_eq!(create.temporary_upload_files, vec!["951"]);

    let token_create = parse_issue_comment_create_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/comments",
        r#"{"nest":{"comment":true}}"#,
    )
    .unwrap();
    assert_eq!(token_create.token_comment.as_deref(), Some("true"));

    let update = parse_issue_comment_update_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/comments/51",
        r#"{"outer":{"content":123,"original":false}}"#,
    )
    .unwrap();
    assert_eq!(update.path.comment_id, Some(51));
    assert_eq!(update.content, "123");
    assert_eq!(update.original, "false");

    let labels = parse_issue_label_replace_request(
        "/-_-api/v1/owners/alice/projects/demo/issuelabel/7",
        r#"["1", 2, "3"]"#,
    )
    .unwrap();
    assert_eq!(labels.label_ids, vec![1, 2, 3]);
}

#[test]
fn issue_helper_adapter_normalizes_assignee_share_weight_and_detect_change() {
    let assignees = parse_issue_assignee_replace_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/assignees",
        r#"{"outer":{"assignees":["bob", 1001, false]}}"#,
    )
    .unwrap();
    assert_eq!(
        assignees.path.endpoint_path,
        "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees"
    );
    assert_eq!(assignees.login_ids, vec!["bob", "1001", "false"]);

    let share_user = parse_issue_share_update_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/share",
        r#"{"outer":{"sharer":{"type":"user","loginId":1001},"action":"add"}}"#,
    )
    .unwrap();
    assert_eq!(share_user.action, "add");
    assert_eq!(share_user.sharer.sharer_type.as_deref(), Some("user"));
    assert_eq!(share_user.sharer.login_id.as_deref(), Some("1001"));
    assert_eq!(share_user.sharer.project_id, Some(1001));

    let share_project = parse_issue_share_update_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/share",
        r#"{"sharer":{"type":"project","loginId":"42"},"action":"delete"}"#,
    )
    .unwrap();
    assert_eq!(share_project.sharer.sharer_type.as_deref(), Some("project"));
    assert_eq!(share_project.sharer.project_id, Some(42));

    let weight = parse_issue_weight_response(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/upvoteWeight",
        r#"{"outer":{"weight":"9"}}"#,
    )
    .unwrap();
    assert_eq!(weight.path.number, 7);
    assert_eq!(weight.weight, 9);

    let detect_request = parse_issue_detect_change_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/detectChange",
        r#"{"wrapper":{"issueBodyChecksum":123,"numOfComments":"2"}}"#,
    )
    .unwrap();
    assert_eq!(detect_request.issue_body_checksum, "123");
    assert_eq!(detect_request.num_of_comments, 2);

    let detect_response = parse_issue_detect_change_response(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/detectChange",
        r#"{
          "result": "ok",
          "commentAuthorName": false,
          "issueBodyChanged": true,
          "numOfComments": 3,
          "issueBodyChecksum": "abc",
          "issueUpdateDate": "1781970000000"
        }"#,
    )
    .unwrap();
    assert_eq!(detect_response.result.as_deref(), Some("ok"));
    assert_eq!(
        detect_response.comment_author_name.as_deref(),
        Some("false")
    );
    assert!(detect_response.issue_body_changed);
    assert_eq!(detect_response.num_of_comments, 3);
    assert_eq!(detect_response.issue_body_checksum, "abc");
    assert_eq!(detect_response.issue_update_date, 1_781_970_000_000);
}

#[test]
fn issue_helper_adapter_rejects_bad_json_path_and_payload_boundaries() {
    let invalid_json = parse_issue_comment_create_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/comments",
        "{",
    )
    .unwrap_err();
    assert!(matches!(invalid_json, IssueAdapterError::InvalidJson(_)));

    let invalid_path = parse_issue_comment_update_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/0/comments/51",
        r#"{"content":"new","original":"old"}"#,
    )
    .unwrap_err();
    assert_eq!(
        invalid_path,
        IssueAdapterError::InvalidPath(
            "/-_-api/v1/owners/alice/projects/demo/issues/0/comments/51".to_string()
        )
    );

    let missing_comment = parse_issue_comment_create_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/comments",
        r#"{"author":{"loginId":"alice"}}"#,
    )
    .unwrap_err();
    assert_eq!(missing_comment, IssueAdapterError::MissingCommentBody);

    let missing_original = parse_issue_comment_update_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/comments/51",
        r#"{"content":"new"}"#,
    )
    .unwrap_err();
    assert_eq!(missing_original, IssueAdapterError::MissingOriginal);

    let missing_label_array = parse_issue_label_replace_request(
        "/-_-api/v1/owners/alice/projects/demo/issuelabel/7",
        r#"{"labels":[1]}"#,
    )
    .unwrap_err();
    assert_eq!(missing_label_array, IssueAdapterError::MissingLabelArray);

    let invalid_label = parse_issue_label_replace_request(
        "/-_-api/v1/owners/alice/projects/demo/issuelabel/7",
        r#"[{}]"#,
    )
    .unwrap_err();
    assert_eq!(
        invalid_label,
        IssueAdapterError::InvalidLabelId {
            index: 0,
            value: String::new()
        }
    );

    let missing_assignees = parse_issue_assignee_replace_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/assignees",
        r#"{"assignees":[]}"#,
    )
    .unwrap_err();
    assert_eq!(missing_assignees, IssueAdapterError::MissingAssignees);

    let missing_sharer = parse_issue_share_update_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/share",
        r#"{"action":"add"}"#,
    )
    .unwrap_err();
    assert_eq!(missing_sharer, IssueAdapterError::MissingSharer);

    let missing_weight = parse_issue_weight_response(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/downvoteWeight",
        r#"{"ok":true}"#,
    )
    .unwrap_err();
    assert_eq!(missing_weight, IssueAdapterError::MissingWeight);

    let invalid_detect_count = parse_issue_detect_change_request(
        "/-_-api/v1/owners/alice/projects/demo/issues/7/detectChange",
        r#"{"issueBodyChecksum":"abc","numOfComments":"many"}"#,
    )
    .unwrap_err();
    assert_eq!(
        invalid_detect_count,
        IssueAdapterError::InvalidCommentCount("many".to_string())
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
fn issue_migration_adapter_does_not_mount_broad_app_runtime_routes() {
    let migrator = find_endpoint(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues",
    )
    .unwrap();
    assert_eq!(migrator.status, EndpointStatus::MigratorImport);
    assert!(migrator.status.is_migrator_scope());

    assert!(find_endpoint(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/issues"
    )
    .is_none());
    assert!(find_endpoint("POST", "/-_-api/v1/**").is_none());
    assert!(find_endpoint("GET", "/-_-api/v1/**").is_none());
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
