use yoram_migration::legacy_external::{
    boards::{
        find_fixture, fixtures, parse_board_comment_import_request,
        parse_board_content_update_request, parse_board_label_replace_request,
        parse_board_post_import_request, AuthRequirement, BoardAdapterError, MigrationDirection,
    },
    find_endpoint, EndpointStatus,
};

#[test]
fn board_fixtures_cover_legacy_board_external_routes() {
    let expected = [
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/posts",
            MigrationDirection::AppOwned,
        ),
        (
            "PATCH",
            "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments",
            MigrationDirection::AppOwned,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number",
            MigrationDirection::AppOwned,
        ),
    ];

    assert_eq!(fixtures().len(), expected.len());

    for (method, path, direction) in expected {
        let fixture = find_fixture(method, path)
            .unwrap_or_else(|| panic!("missing board fixture: {method} {path}"));
        let inventory = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing endpoint inventory entry: {method} {path}"));

        assert_eq!(fixture.direction, direction);
        assert_eq!(fixture.direction.endpoint_status(), inventory.status);
        assert_eq!(fixture.legacy_controller, inventory.source.controller);
        assert_eq!(fixture.legacy_action, inventory.source.action);
    }
}

#[test]
fn board_post_import_preserves_bulk_post_shape() {
    let fixture = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts",
    )
    .unwrap();

    assert_eq!(fixture.legacy_controller, "controllers.api.BoardApi");
    assert_eq!(fixture.legacy_action, "newPostings");
    assert_eq!(fixture.direction, MigrationDirection::AppOwned);
    assert_eq!(fixture.auth, AuthRequirement::BoardPostCreatePermission);
    assert_eq!(fixture.request.path_fields, &["owner", "projectName"]);
    assert_eq!(
        fixture.request.body_fields,
        &[
            "posts",
            "author",
            "title",
            "body",
            "createdAt",
            "updatedAt",
            "temporaryUploadFiles",
            "number",
        ]
    );
    assert_eq!(fixture.response.response_fields, &["status", "location"]);

    assert_eq!(
        fixture.payload.sample_path,
        "/-_-api/v1/owners/alice/projects/demo/posts"
    );
    assert_eq!(fixture.payload.success_status, 201);
    let request: serde_json::Value = serde_json::from_str(fixture.payload.request_json).unwrap();
    let post = &request["import"]["posts"][0];
    assert_eq!(post["author"]["loginId"], "author");
    assert_eq!(post["metadata"]["number"], 4);
    assert_eq!(post["content"]["title"], "Legacy post");
    assert_eq!(post["files"]["temporaryUploadFiles"][0], "901");

    let success: serde_json::Value = serde_json::from_str(fixture.payload.success_json).unwrap();
    assert_eq!(success[0]["status"], 201);
    assert_eq!(success[0]["location"], "/alice/demo/post/4");

    let missing_posts: serde_json::Value =
        serde_json::from_str(fixture.payload.alternate_json.unwrap()).unwrap();
    assert_eq!(fixture.payload.alternate_status, Some(400));
    assert_eq!(
        missing_posts["message"],
        "No posts key exists or value wasn't array!"
    );
}

#[test]
fn board_comment_import_preserves_legacy_comment_shape() {
    let fixture = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments",
    )
    .unwrap();

    assert_eq!(fixture.legacy_action, "newPostingComment");
    assert_eq!(fixture.direction, MigrationDirection::AppOwned);
    assert_eq!(
        fixture.auth,
        AuthRequirement::NonIssueCommentCreatePermission
    );
    assert_eq!(
        fixture.request.path_fields,
        &["owner", "projectName", "number"]
    );
    assert_eq!(
        fixture.request.body_fields,
        &["author", "body", "createdAt", "temporaryUploadFiles"]
    );
    assert_eq!(fixture.response.response_fields, &["status", "location"]);

    let request: serde_json::Value = serde_json::from_str(fixture.payload.request_json).unwrap();
    assert_eq!(fixture.payload.success_status, 201);
    assert_eq!(
        request["comment"]["author"]["email"],
        "commenter@example.com"
    );
    assert_eq!(request["comment"]["body"], "legacy post comment");
    assert_eq!(request["comment"]["temporaryUploadFiles"][0], "951");

    let success: serde_json::Value = serde_json::from_str(fixture.payload.success_json).unwrap();
    assert_eq!(success["status"], 201);
    assert_eq!(success["location"], "/alice/demo/post/4#comment-51");
}

#[test]
fn board_app_owned_mutations_preserve_conflict_and_label_metadata() {
    let content = find_fixture(
        "PATCH",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content",
    )
    .unwrap();

    assert_eq!(content.legacy_action, "updatePostingContent");
    assert_eq!(content.direction, MigrationDirection::AppOwned);
    assert_eq!(content.auth, AuthRequirement::BoardPostUpdatePermission);
    assert_eq!(content.request.body_fields, &["content", "original"]);
    assert!(content.response.response_fields.contains(&"storedContent"));
    assert!(content.response.response_fields.contains(&"comments"));

    let request: serde_json::Value = serde_json::from_str(content.payload.request_json).unwrap();
    assert_eq!(request["edit"]["content"], "legacy post body updated");
    assert_eq!(request["edit"]["original"], "legacy post body");

    let success: serde_json::Value = serde_json::from_str(content.payload.success_json).unwrap();
    assert_eq!(content.payload.success_status, 200);
    assert_eq!(success["number"], 4);
    assert_eq!(success["type"], "BOARD_POST");
    assert_eq!(success["attachments"][0]["containerType"], "BOARD_POST");
    assert_eq!(success["comments"][0]["type"], "NONISSUE_COMMENT");
    assert_eq!(
        success["comments"][0]["childComments"][0]["body"],
        "legacy child comment"
    );

    let conflict: serde_json::Value =
        serde_json::from_str(content.payload.alternate_json.unwrap()).unwrap();
    assert_eq!(content.payload.alternate_status, Some(409));
    assert_eq!(conflict["message"], "Already modified by someone.");
    assert_eq!(conflict["storedContent"], "stored legacy post body");

    let labels = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number",
    )
    .unwrap();

    assert_eq!(labels.legacy_action, "updatePostLabel");
    assert_eq!(labels.direction, MigrationDirection::AppOwned);
    assert_eq!(labels.auth, AuthRequirement::LegacyJsonMutation);
    assert_eq!(labels.request.body_fields, &["labelId"]);
    assert_eq!(labels.response.response_fields, &["id", "labels"]);

    let request: serde_json::Value = serde_json::from_str(labels.payload.request_json).unwrap();
    assert_eq!(request.as_array().unwrap().len(), 2);
    assert_eq!(request[0], 301);
    let success: serde_json::Value = serde_json::from_str(labels.payload.success_json).unwrap();
    assert_eq!(labels.payload.success_status, 200);
    assert_eq!(success["id"], "alice");
    assert_eq!(success["labels"], 2);
}

#[test]
fn board_payload_fixtures_are_app_owned_adapter_metadata_only() {
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
        assert!(fixture
            .payload
            .sample_path
            .starts_with("/-_-api/v1/owners/alice/projects/demo"));
        serde_json::from_str::<serde_json::Value>(fixture.payload.request_json).unwrap();
        serde_json::from_str::<serde_json::Value>(fixture.payload.success_json).unwrap();
        if let Some(alternate_json) = fixture.payload.alternate_json {
            serde_json::from_str::<serde_json::Value>(alternate_json).unwrap();
            assert!(fixture.payload.alternate_status.is_some());
        }
    }
}

#[test]
fn board_adapter_normalizes_recursive_legacy_post_import_payload() {
    let fixture = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts",
    )
    .unwrap();

    let batch =
        parse_board_post_import_request(fixture.payload.sample_path, fixture.payload.request_json)
            .unwrap();

    assert_eq!(batch.endpoint_method, "POST");
    assert_eq!(
        batch.endpoint_path,
        "/-_-api/v1/owners/:owner/projects/:projectName/posts"
    );
    assert_eq!(batch.owner, "alice");
    assert_eq!(batch.project_name, "demo");
    assert_eq!(batch.entries.len(), 1);

    let post = &batch.entries[0];
    assert_eq!(post.source_index, 0);
    assert_eq!(
        post.author.as_ref().unwrap().login_id.as_deref(),
        Some("author")
    );
    assert_eq!(
        post.author.as_ref().unwrap().email.as_deref(),
        Some("author@example.com")
    );
    assert_eq!(post.title, "Legacy post");
    assert_eq!(post.body, "legacy post body");
    assert_eq!(post.requested_number, Some(4));
    assert_eq!(post.created_at.as_deref(), Some("2026-06-04T00:00:00Z"));
    assert_eq!(post.updated_at.as_deref(), Some("2026-06-05T00:00:00Z"));
    assert_eq!(post.temporary_upload_files, vec!["901", "902"]);
}

#[test]
fn board_adapter_preserves_find_value_first_match_and_scalar_fallbacks() {
    let payload = r#"{
      "outer": {
        "posts": [
          {
            "wrapper": {
              "author": { "loginId": 1001, "email": "numeric@example.com" },
              "content": { "title": 77, "body": true },
              "createdAt": false,
              "number": "42",
              "temporaryUploadFiles": 951
            }
          }
        ]
      }
    }"#;

    let batch =
        parse_board_post_import_request("/-_-api/v1/owners/alice/projects/demo/posts", payload)
            .unwrap();

    let post = &batch.entries[0];
    assert_eq!(
        post.author.as_ref().unwrap().login_id.as_deref(),
        Some("1001")
    );
    assert_eq!(post.title, "77");
    assert_eq!(post.body, "true");
    assert_eq!(post.created_at.as_deref(), Some("false"));
    assert_eq!(post.requested_number, Some(42));
    assert_eq!(post.temporary_upload_files, vec!["951"]);
}

#[test]
fn board_adapter_normalizes_content_comment_and_label_payloads() {
    let content = find_fixture(
        "PATCH",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content",
    )
    .unwrap();
    let update = parse_board_content_update_request(
        content.payload.sample_path,
        content.payload.request_json,
    )
    .unwrap();

    assert_eq!(update.endpoint_method, "PATCH");
    assert_eq!(update.owner, "alice");
    assert_eq!(update.project_name, "demo");
    assert_eq!(update.number, 4);
    assert_eq!(update.content, "legacy post body updated");
    assert_eq!(update.original, "legacy post body");

    let comment = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments",
    )
    .unwrap();
    let import = parse_board_comment_import_request(
        comment.payload.sample_path,
        comment.payload.request_json,
    )
    .unwrap();

    assert_eq!(import.endpoint_method, "POST");
    assert_eq!(
        import.endpoint_path,
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments"
    );
    assert_eq!(import.post_number, 4);
    assert_eq!(
        import.author.as_ref().unwrap().login_id.as_deref(),
        Some("commenter")
    );
    assert_eq!(import.body, "legacy post comment");
    assert_eq!(import.created_at.as_deref(), Some("2026-06-06T00:00:00Z"));
    assert_eq!(import.temporary_upload_files, vec!["951"]);

    let labels = find_fixture(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number",
    )
    .unwrap();
    let replace =
        parse_board_label_replace_request(labels.payload.sample_path, labels.payload.request_json)
            .unwrap();

    assert_eq!(replace.endpoint_method, "POST");
    assert_eq!(
        replace.endpoint_path,
        "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number"
    );
    assert_eq!(replace.post_number, 4);
    assert_eq!(replace.label_ids, vec![301, 302]);
}

#[test]
fn board_adapter_rejects_legacy_bad_request_boundaries_before_tool_consumption() {
    let missing_posts = parse_board_post_import_request(
        "/-_-api/v1/owners/alice/projects/demo/posts",
        r#"{"posts":{"title":"not an array"}}"#,
    )
    .unwrap_err();
    assert_eq!(missing_posts, BoardAdapterError::MissingPostsArray);

    let bad_path = parse_board_content_update_request(
        "/-_-api/v1/owners/alice/projects/demo/posts/not-a-number/content",
        r#"{"content":"new","original":"old"}"#,
    )
    .unwrap_err();
    assert_eq!(
        bad_path,
        BoardAdapterError::InvalidNumber {
            segment: "not-a-number".to_string()
        }
    );

    let bad_label = parse_board_label_replace_request(
        "/-_-api/v1/owners/alice/projects/demo/postlabel/4",
        r#"[301, {"id": 302}]"#,
    )
    .unwrap_err();
    assert_eq!(
        bad_label,
        BoardAdapterError::InvalidLabelId {
            index: 1,
            value: r#"{"id":302}"#.to_string()
        }
    );
}
