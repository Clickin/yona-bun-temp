use yona_rust_pilot_migration::legacy_external::{
    boards::{find_fixture, fixtures, AuthRequirement, MigrationDirection},
    find_endpoint,
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
}
