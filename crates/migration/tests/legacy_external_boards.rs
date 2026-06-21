use yona_rust_pilot_migration::legacy_external::{
    boards::{find_fixture, fixtures, AuthRequirement, MigrationDirection},
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
