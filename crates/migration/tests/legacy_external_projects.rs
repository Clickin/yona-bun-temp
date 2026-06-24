use yoram_migration::legacy_external::{
    find_endpoint,
    projects::{
        find_fixture, fixtures, parse_project_export_response, parse_project_import_request,
        parse_project_label_import_request, parse_project_label_response,
        parse_project_title_heads_response, AuthRequirement, MigrationDirection,
        ProjectAdapterError, ProjectImportAction, ProjectLabelAction, ProjectScope,
    },
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

#[test]
fn project_export_parser_normalizes_fixture_payload_depth() {
    let fixture = find_fixture(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/exports",
    )
    .unwrap();
    let payload = fixture.migration_payload.unwrap();
    let export = parse_project_export_response(payload.sample_path, payload.success_json).unwrap();

    assert_eq!(export.endpoint_method, "GET");
    assert_eq!(
        export.endpoint_path,
        "/-_-api/v1/owners/:owner/projects/:projectName/exports"
    );
    assert_eq!(export.owner, "alice");
    assert_eq!(export.project_name, "demo");
    assert_eq!(export.project_description, "Legacy project");
    assert_eq!(
        export.project_created_date.as_deref(),
        Some("2026-06-01 AM 09:00:00 +0900")
    );
    assert_eq!(export.project_vcs, "GIT");
    assert_eq!(export.project_scope, ProjectScope::Public);
    assert_eq!(export.project_scope.as_legacy_str(), "PUBLIC");
    assert_eq!(export.member_count, 1);
    assert_eq!(export.members[0].role.as_deref(), Some("manager"));
    assert_eq!(export.assignees[0].login_id.as_deref(), Some("assignee"));
    assert_eq!(
        export.authors[0].email.as_deref(),
        Some("author@example.com")
    );
    assert_eq!(export.issue_count, 1);
    assert_eq!(export.post_count, 1);
    assert_eq!(export.milestone_count, 1);
    assert_eq!(export.labels[0].label_name.as_deref(), Some("Bug"));
    assert_eq!(export.labels[0].is_exclusive, Some(false));
    assert_eq!(export.issues[0].number, Some(3));
    assert_eq!(
        export.issues[0].resource_type.as_deref(),
        Some("ISSUE_POST")
    );
    assert_eq!(export.issues[0].milestone_title.as_deref(), Some("M1"));
    assert_eq!(export.issues[0].attachment_count, 1);
    assert_eq!(export.issues[0].comment_count, 1);
    assert_eq!(export.posts[0].resource_type.as_deref(), Some("BOARD_POST"));
    assert_eq!(export.milestones[0].title.as_deref(), Some("M1"));
    assert_eq!(export.menu_settings, None);
}

#[test]
fn project_export_parser_preserves_recursive_wrappers_and_defaults() {
    let wrapped = r#"{
      "envelope": {
        "project": {
          "owner": "bob",
          "projectName": "wrapped",
          "members": [{"email": "bob@example.com", "role": "manager"}],
          "labels": [{"labelName": "Docs", "isExclusive": "true"}],
          "issues": [{"number": "8", "title": "Nested issue", "attachments": [{}]}],
          "posts": [{"number": true, "type": "BOARD_POST", "comments": [{}]}],
          "milestones": [{"id": "5", "title": "Later"}],
          "menuSettings": {"code": true, "issue": false, "pullRequest": 1}
        }
      }
    }"#;

    let export = parse_project_export_response(
        "/-_-api/v1/owners/path/projects/path-project/exports",
        wrapped,
    )
    .unwrap();

    assert_eq!(export.owner, "bob");
    assert_eq!(export.project_name, "wrapped");
    assert_eq!(export.project_description, "");
    assert_eq!(export.project_vcs, "GIT");
    assert_eq!(export.project_scope, ProjectScope::Private);
    assert_eq!(export.member_count, 1);
    assert_eq!(export.issue_count, 1);
    assert_eq!(export.post_count, 1);
    assert_eq!(export.milestone_count, 1);
    assert_eq!(export.labels[0].is_exclusive, Some(true));
    assert_eq!(export.issues[0].number, Some(8));
    assert_eq!(export.posts[0].number, Some(1));
    let menu = export.menu_settings.unwrap();
    assert_eq!(menu.code, Some(true));
    assert_eq!(menu.issue, Some(false));
    assert_eq!(menu.pull_request, Some(true));
    assert_eq!(menu.review, None);
}

#[test]
fn project_import_parser_normalizes_fixture_payload_and_defaults() {
    let fixture = find_fixture("POST", "/-_-api/v1/owners/:owner/projects").unwrap();
    let payload = fixture.migration_payload.unwrap();
    let import = parse_project_import_request(
        payload.sample_path,
        payload.request_json.unwrap(),
        &[("other", "demo")],
    )
    .unwrap();

    assert_eq!(import.endpoint_method, "POST");
    assert_eq!(import.endpoint_path, "/-_-api/v1/owners/:owner/projects");
    assert_eq!(import.owner, "alice");
    assert_eq!(import.project_name, "demo");
    assert_eq!(import.project_description, "Legacy project");
    assert_eq!(
        import.project_created_date.as_deref(),
        Some("2026-06-01 AM 09:00:00 +0900")
    );
    assert_eq!(import.project_vcs, "GIT");
    assert_eq!(import.project_scope, ProjectScope::Public);
    assert_eq!(import.members.len(), 2);
    assert_eq!(
        import.members[0].email.as_deref(),
        Some("alice@example.com")
    );
    assert_eq!(import.members[1].role.as_deref(), Some("member"));
    assert_eq!(import.menu_settings.code, Some(true));
    assert_eq!(import.menu_settings.issue, Some(true));
    assert_eq!(import.menu_settings.pull_request, Some(true));
    assert_eq!(import.menu_settings.review, Some(true));
    assert_eq!(import.menu_settings.milestone, Some(true));
    assert_eq!(import.menu_settings.board, Some(true));
    assert_eq!(import.action, ProjectImportAction::Create);
}

#[test]
fn project_import_parser_preserves_recursive_shape_scalar_fallbacks_and_conflict() {
    let wrapped = r#"{
      "outer": {
        "projectName": 77,
        "projectDescription": false,
        "projectVcs": "SVN",
        "projectScope": "BOGUS",
        "members": [{"email": "member@example.com", "role": "manager"}],
        "projectMenuSetting": {"code": false, "board": "true"}
      }
    }"#;

    let import = parse_project_import_request(
        "/-_-api/v1/owners/alice/projects",
        wrapped,
        &[("ALICE", "77")],
    )
    .unwrap();

    assert_eq!(import.project_name, "77");
    assert_eq!(import.project_description, "false");
    assert_eq!(import.project_vcs, "SVN");
    assert_eq!(import.project_scope, ProjectScope::Private);
    assert_eq!(import.members[0].role.as_deref(), Some("manager"));
    assert_eq!(import.menu_settings.code, Some(false));
    assert_eq!(import.menu_settings.board, Some(true));
    assert_eq!(import.action, ProjectImportAction::ConflictExistingProject);
}

#[test]
fn project_parsers_reject_invalid_path_and_payload_boundaries() {
    assert!(matches!(
        parse_project_export_response("/-_-api/v1/owners/alice/projects/demo", "{}"),
        Err(ProjectAdapterError::InvalidPath { .. })
    ));
    assert!(matches!(
        parse_project_export_response("/-_-api/v1/owners/alice/projects/demo/exports", "[]"),
        Err(ProjectAdapterError::InvalidExportPayload)
    ));
    assert!(matches!(
        parse_project_import_request("/-_-api/v1/owners/alice/projects/demo", "{}", &[]),
        Err(ProjectAdapterError::InvalidPath { .. })
    ));
    assert!(matches!(
        parse_project_import_request("/-_-api/v1/owners/alice/projects", "{}", &[]),
        Err(ProjectAdapterError::MissingProjectName)
    ));
    assert!(matches!(
        parse_project_import_request("/-_-api/v1/owners/alice/projects", "{", &[]),
        Err(ProjectAdapterError::InvalidJson(_))
    ));
}

#[test]
fn project_label_parser_normalizes_recursive_request_and_response_payloads() {
    let request = r##"{
      "payload": {
        "labels": [
          {
            "wrapper": {
              "labelName": "Bug",
              "labelColor": "#ff0000",
              "category": "Type",
              "isExclusive": false
            }
          },
          {
            "labelName": 77,
            "labelColor": true,
            "category": "Type",
            "isExclusive": "false"
          }
        ]
      }
    }"##;

    let import = parse_project_label_import_request(
        "/-_-api/v1/owners/alice/projects/demo/labels",
        request,
        &[("Bug", "Type")],
    )
    .unwrap();

    assert_eq!(import.endpoint_method, "POST");
    assert_eq!(
        import.endpoint_path,
        "/-_-api/v1/owners/:owner/projects/:projectName/labels"
    );
    assert_eq!(import.owner, "alice");
    assert_eq!(import.project_name, "demo");
    assert_eq!(import.labels.len(), 2);
    assert_eq!(import.labels[0].label_name, "Bug");
    assert_eq!(import.labels[0].label_color, "#ff0000");
    assert_eq!(import.labels[0].category, "Type");
    assert!(import.labels[0].is_exclusive_token_is_boolean);
    assert_eq!(
        import.labels[0].action,
        ProjectLabelAction::ConflictExistingLabel
    );
    assert_eq!(import.labels[1].label_name, "77");
    assert_eq!(import.labels[1].label_color, "true");
    assert!(!import.labels[1].is_exclusive_token_is_boolean);
    assert_eq!(import.labels[1].action, ProjectLabelAction::Create);

    let response = parse_project_label_response(
        r##"[
          {
            "status": "201",
            "label": "Bug",
            "category": "Type",
            "labelColor": "#ff0000",
            "isExclusive": true
          },
          {
            "status": 409,
            "reason": "Conflict",
            "message": "label.error.duplicated"
          }
        ]"##,
    )
    .unwrap();

    assert_eq!(response.endpoint_method, "POST");
    assert_eq!(response.labels[0].status, Some(201));
    assert_eq!(response.labels[0].label.as_deref(), Some("Bug"));
    assert_eq!(response.labels[0].is_exclusive, Some(true));
    assert_eq!(response.labels[1].status, Some(409));
    assert_eq!(response.labels[1].reason.as_deref(), Some("Conflict"));
}

#[test]
fn project_title_heads_parser_normalizes_wrapped_result_entries() {
    let title_heads = parse_project_title_heads_response(
        "/-_-api/v1/owners/alice/projects/demo/titleHeads?query=bug&type=ignored",
        r##"{
          "outer": {
            "result": [
              {
                "name": "Crash",
                "frequency": "3",
                "category": "",
                "searchText": "Crash"
              },
              {
                "name": "Bug",
                "frequency": 0,
                "category": "Type",
                "categoryId": "5",
                "id": 7,
                "labelColor": "#ff0000",
                "isExclusive": "true",
                "searchText": "Bug/Type"
              }
            ]
          }
        }"##,
    )
    .unwrap();

    assert_eq!(title_heads.endpoint_method, "GET");
    assert_eq!(
        title_heads.endpoint_path,
        "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads"
    );
    assert_eq!(title_heads.owner, "alice");
    assert_eq!(title_heads.project_name, "demo");
    assert_eq!(title_heads.query, "bug");
    assert_eq!(title_heads.entries.len(), 2);
    assert_eq!(title_heads.entries[0].name.as_deref(), Some("Crash"));
    assert_eq!(title_heads.entries[0].frequency, Some(3));
    assert_eq!(title_heads.entries[0].search_text.as_deref(), Some("Crash"));
    assert_eq!(title_heads.entries[1].category_id, Some(5));
    assert_eq!(title_heads.entries[1].id, Some(7));
    assert_eq!(title_heads.entries[1].is_exclusive, Some(true));
}

#[test]
fn project_helper_parsers_reject_invalid_boundaries_and_stay_app_owned() {
    assert!(matches!(
        parse_project_label_import_request(
            "/-_-api/v1/owners/alice/projects/demo",
            r#"{"labels":[]}"#,
            &[]
        ),
        Err(ProjectAdapterError::InvalidPath { .. })
    ));
    assert!(matches!(
        parse_project_label_import_request(
            "/-_-api/v1/owners/alice/projects/demo/labels",
            r#"{"labels":{}}"#,
            &[]
        ),
        Err(ProjectAdapterError::InvalidLabelPayload)
    ));
    assert!(matches!(
        parse_project_label_import_request(
            "/-_-api/v1/owners/alice/projects/demo/labels",
            r#"{"labels":[{"labelName":"Bug"}]}"#,
            &[]
        ),
        Err(ProjectAdapterError::InvalidLabelItem)
    ));
    assert!(matches!(
        parse_project_label_response(r#"{"status":201}"#),
        Err(ProjectAdapterError::InvalidLabelPayload)
    ));
    assert!(matches!(
        parse_project_title_heads_response(
            "/-_-api/v1/owners/alice/projects/demo/titleHeads",
            r#"{"result":{}}"#
        ),
        Err(ProjectAdapterError::InvalidTitleHeadsPayload)
    ));
    assert!(matches!(
        parse_project_title_heads_response(
            "/-_-api/v1/owners/alice/projects/demo/labels",
            r#"{"result":[]}"#
        ),
        Err(ProjectAdapterError::InvalidPath { .. })
    ));

    assert_eq!(
        find_endpoint(
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/labels"
        )
        .unwrap()
        .status,
        EndpointStatus::AppOwned
    );
    assert_eq!(
        find_endpoint(
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads"
        )
        .unwrap()
        .status,
        EndpointStatus::AppOwned
    );
}

#[test]
fn project_migrator_adapters_do_not_promote_broad_runtime_routes() {
    let export = find_endpoint(
        "GET",
        "/-_-api/v1/owners/:owner/projects/:projectName/exports",
    )
    .unwrap();
    let import = find_endpoint("POST", "/-_-api/v1/owners/:owner/projects").unwrap();

    assert_eq!(export.status, EndpointStatus::MigratorExport);
    assert_eq!(import.status, EndpointStatus::MigratorImport);
    assert_ne!(export.status, EndpointStatus::AppOwned);
    assert_ne!(import.status, EndpointStatus::AppOwned);
    assert!(find_endpoint("GET", "/-_-api/v1/owners/:owner/projects").is_none());
    assert!(find_endpoint(
        "POST",
        "/-_-api/v1/owners/:owner/projects/:projectName/exports"
    )
    .is_none());
}
