use yoram_migration::legacy_external::{
    find_endpoint,
    users::{
        find_fixture, fixtures, parse_admin_user_list_response, parse_admin_user_state_request,
        parse_admin_user_state_response, parse_default_login_page_response,
        parse_user_create_request, parse_user_issue_export_response,
        parse_user_statistics_response, parse_user_token_request, parse_user_token_response,
        AuthRequirement, LegacyUserState, MigrationDirection, UserAdapterError, UserCreateAction,
    },
    EndpointStatus,
};

#[test]
fn user_fixtures_cover_legacy_users_auth_token_routes() {
    let expected = [
        ("GET", "/-_-api/v1/users"),
        ("POST", "/-_-api/v1/users"),
        ("POST", "/-_-api/v1/users/token"),
        ("GET", "/-_-api/v1/user/issues"),
        ("GET", "/-_-api/v1/users/:user/statistics"),
        ("POST", "/-_-api/v1/user/defultLoginPage"),
        ("GET", "/-_-api/v1/admin/users"),
        ("PATCH", "/-_-api/v1/admin/users/:user"),
    ];

    assert_eq!(fixtures().len(), expected.len());

    for (method, path) in expected {
        let fixture = find_fixture(method, path)
            .unwrap_or_else(|| panic!("missing users fixture: {method} {path}"));
        let inventory = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing endpoint inventory entry: {method} {path}"));

        assert_eq!(fixture.direction, MigrationDirection::AppOwned);
        assert_eq!(
            fixture.direction.endpoint_status(),
            EndpointStatus::AppOwned
        );
        assert_eq!(inventory.status, EndpointStatus::AppOwned);
        assert_eq!(fixture.legacy_controller, inventory.source.controller);
        assert_eq!(fixture.legacy_action, inventory.source.action);
    }
}

#[test]
fn token_fixture_preserves_credential_request_and_access_token_response() {
    let fixture = find_fixture("POST", "/-_-api/v1/users/token").unwrap();

    assert_eq!(fixture.legacy_controller, "controllers.api.UserApi");
    assert_eq!(fixture.legacy_action, "newToken");
    assert_eq!(fixture.auth, AuthRequirement::CredentialJson);
    assert_eq!(fixture.request.body_fields, &["id", "password"]);
    assert_eq!(
        fixture.response.response_fields,
        &["access_token", "message"]
    );

    assert_eq!(fixture.payload.sample_path, "/-_-api/v1/users/token");
    assert_eq!(fixture.payload.success_status, 200);
    assert_eq!(fixture.payload.alternate_status, Some(401));

    let request: serde_json::Value =
        serde_json::from_str(fixture.payload.request_json.expect("token request JSON")).unwrap();
    assert_eq!(request["credentials"]["id"], "alice");
    assert_eq!(
        request["credentials"]["password"],
        "correct horse battery staple"
    );

    let success: serde_json::Value = serde_json::from_str(fixture.payload.success_json).unwrap();
    assert_eq!(success["access_token"], "token-alice-20260621");

    let invalid: serde_json::Value =
        serde_json::from_str(fixture.payload.alternate_json.expect("token error JSON")).unwrap();
    assert_eq!(invalid["message"], "No user by id and password");
}

#[test]
fn typo_preserving_default_login_page_route_and_action_are_stable() {
    let fixture = find_fixture("POST", "/-_-api/v1/user/defultLoginPage").unwrap();

    assert_eq!(fixture.path, "/-_-api/v1/user/defultLoginPage");
    assert_eq!(fixture.legacy_controller, "controllers.UserApp");
    assert_eq!(fixture.legacy_action, "setDefaultLoginPage");
    assert_eq!(fixture.auth, AuthRequirement::CurrentUserSession);
    assert_eq!(fixture.request.query_fields, &["path"]);
    assert_eq!(fixture.response.response_fields, &["defaultLoginPage"]);
    assert_eq!(
        fixture.payload.sample_path,
        "/-_-api/v1/user/defultLoginPage?path=/alice/demo"
    );

    let success: serde_json::Value = serde_json::from_str(fixture.payload.success_json).unwrap();
    assert_eq!(success["defaultLoginPage"], "/alice/demo");
}

#[test]
fn token_auth_and_site_manager_classifications_are_explicit() {
    let issues = find_fixture("GET", "/-_-api/v1/user/issues").unwrap();
    assert_eq!(issues.auth, AuthRequirement::AuthorizationTokenHeader);
    assert_eq!(issues.request.header_fields, &["Authorization"]);
    assert_eq!(issues.request.query_fields, &["filter", "page", "pageNum"]);

    let admin_users = find_fixture("GET", "/-_-api/v1/admin/users").unwrap();
    let admin_update = find_fixture("PATCH", "/-_-api/v1/admin/users/:user").unwrap();
    assert_eq!(admin_users.auth, AuthRequirement::SiteManagerSession);
    assert_eq!(admin_update.auth, AuthRequirement::SiteManagerSession);
    assert_eq!(admin_update.request.body_fields, &["state"]);
    assert_eq!(
        admin_update.response.response_fields,
        &["id", "login_id", "state"]
    );
}

#[test]
fn user_mention_lookup_preserves_sample_path_and_legacy_response_keys() {
    let fixture = find_fixture("GET", "/-_-api/v1/users").unwrap();

    assert_eq!(fixture.legacy_controller, "controllers.UserApp");
    assert_eq!(fixture.legacy_action, "users");
    assert_eq!(fixture.direction, MigrationDirection::AppOwned);
    assert_eq!(fixture.auth, AuthRequirement::AnonymousJsonMentionLookup);
    assert_eq!(fixture.request.query_fields, &["query"]);
    assert_eq!(fixture.request.header_fields, &["Accept", "referer"]);
    assert_eq!(fixture.response.header_fields, &["Content-Range"]);
    assert_eq!(fixture.payload.sample_path, "/-_-api/v1/users?query=ali");
    assert_eq!(fixture.payload.success_status, 200);

    let success: serde_json::Value = serde_json::from_str(fixture.payload.success_json).unwrap();
    assert_eq!(success[0]["loginId"], "alice");
    assert!(success[0]["info"]
        .as_str()
        .unwrap()
        .contains("mention_username"));
}

#[test]
fn user_create_payload_covers_recursive_users_shape_and_item_responses() {
    let fixture = find_fixture("POST", "/-_-api/v1/users").unwrap();

    assert_eq!(fixture.legacy_controller, "controllers.api.UserApi");
    assert_eq!(fixture.legacy_action, "newUser");
    assert_eq!(fixture.direction, MigrationDirection::AppOwned);
    assert_eq!(fixture.auth, AuthRequirement::SiteManagerSession);
    assert_eq!(
        fixture.request.body_fields,
        &["users", "loginId", "name", "email"]
    );
    assert_eq!(fixture.payload.sample_path, "/-_-api/v1/users");
    assert_eq!(fixture.payload.success_status, 201);
    assert_eq!(fixture.payload.alternate_status, Some(400));

    let request: serde_json::Value = serde_json::from_str(
        fixture
            .payload
            .request_json
            .expect("user create request JSON"),
    )
    .unwrap();
    assert!(request["migration"]["users"].is_array());
    assert_eq!(
        request["migration"]["users"][0]["profile"]["loginId"],
        "alice"
    );
    assert_eq!(
        request["migration"]["users"][1]["profile"]["email"],
        "existing@example.com"
    );

    let success: serde_json::Value = serde_json::from_str(fixture.payload.success_json).unwrap();
    assert_eq!(success[0]["status"], 201);
    assert_eq!(success[0]["reason"], "Created");
    assert_eq!(success[0]["user"]["loginId"], "alice");
    assert_eq!(success[1]["status"], 409);
    assert_eq!(success[1]["reason"], "Conflict");
    assert_eq!(success[1]["message"], "Already exists!");

    let missing_users: serde_json::Value = serde_json::from_str(
        fixture
            .payload
            .alternate_json
            .expect("user create missing-users error JSON"),
    )
    .unwrap();
    assert_eq!(
        missing_users["message"],
        "No users key exists or value must be array!"
    );
}

#[test]
fn user_issue_export_payload_preserves_token_query_and_nested_issue_response() {
    let fixture = find_fixture("GET", "/-_-api/v1/user/issues").unwrap();

    assert_eq!(fixture.legacy_action, "getIssuesByUser");
    assert_eq!(fixture.auth, AuthRequirement::AuthorizationTokenHeader);
    assert_eq!(fixture.request.header_fields, &["Authorization"]);
    assert_eq!(fixture.request.query_fields, &["filter", "page", "pageNum"]);
    assert_eq!(
        fixture.payload.sample_path,
        "/-_-api/v1/user/issues?filter=assigned&page=1&pageNum=10"
    );
    assert_eq!(fixture.payload.success_status, 200);
    assert_eq!(fixture.payload.alternate_status, Some(401));

    let success: serde_json::Value = serde_json::from_str(fixture.payload.success_json).unwrap();
    let issue = &success["result"][0];
    assert_eq!(issue["id"], 30);
    assert_eq!(issue["number"], 3);
    assert_eq!(issue["state"], "CLOSED");
    assert_eq!(issue["author"]["loginId"], "author");
    assert_eq!(issue["assignee"]["loginId"], "alice");
    assert_eq!(issue["project"]["name"], "demo");
    assert_eq!(issue["owner"], "alice");
    assert_eq!(
        issue["refUrl"],
        "https://yona.example.com/alice/demo/issue/3"
    );

    let unauthorized: serde_json::Value =
        serde_json::from_str(fixture.payload.alternate_json.unwrap()).unwrap();
    assert_eq!(unauthorized["message"], "unauthorized request");
}

#[test]
fn statistics_and_admin_user_payloads_preserve_legacy_keys() {
    let statistics = find_fixture("GET", "/-_-api/v1/users/:user/statistics").unwrap();
    assert_eq!(statistics.auth, AuthRequirement::LoginSession);
    assert_eq!(statistics.request.path_fields, &["user"]);
    assert_eq!(
        statistics.payload.sample_path,
        "/-_-api/v1/users/alice/statistics"
    );

    let stats: serde_json::Value = serde_json::from_str(statistics.payload.success_json).unwrap();
    for key in [
        "issue",
        "posting",
        "assignedIssue",
        "issueComment",
        "postingComment",
        "issueVoter",
        "issueCommentVoter",
    ] {
        assert!(stats.get(key).is_some(), "missing statistics key: {key}");
    }

    let admin_users = find_fixture("GET", "/-_-api/v1/admin/users").unwrap();
    assert_eq!(admin_users.auth, AuthRequirement::SiteManagerSession);
    assert_eq!(admin_users.payload.sample_path, "/-_-api/v1/admin/users");
    let users: serde_json::Value = serde_json::from_str(admin_users.payload.success_json).unwrap();
    assert_eq!(users[0]["login_id"], "alice");
    assert_eq!(users[0]["state"], "ACTIVE");
    assert_eq!(users[0]["is_guest"], false);
    assert_eq!(users[1]["is_guest"], true);
}

#[test]
fn admin_user_state_payload_covers_recursive_state_shape() {
    let fixture = find_fixture("PATCH", "/-_-api/v1/admin/users/:user").unwrap();

    assert_eq!(fixture.legacy_controller, "controllers.api.UserApi");
    assert_eq!(fixture.legacy_action, "updateUserState");
    assert_eq!(fixture.direction, MigrationDirection::AppOwned);
    assert_eq!(fixture.auth, AuthRequirement::SiteManagerSession);
    assert_eq!(fixture.request.path_fields, &["user"]);
    assert_eq!(fixture.request.body_fields, &["state"]);
    assert_eq!(fixture.payload.sample_path, "/-_-api/v1/admin/users/alice");

    let request: serde_json::Value =
        serde_json::from_str(fixture.payload.request_json.expect("state request JSON")).unwrap();
    assert_eq!(request["admin"]["state"], "locked");

    let success: serde_json::Value = serde_json::from_str(fixture.payload.success_json).unwrap();
    assert_eq!(success["id"], 1);
    assert_eq!(success["login_id"], "alice");
    assert_eq!(success["state"], "LOCKED");
}

#[test]
fn all_user_payload_fixtures_are_app_owned_and_json_valid() {
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
            "{} {} must remain an app-owned legacy helper descriptor",
            fixture.method,
            fixture.path
        );
        assert!(
            fixture.payload.sample_path.starts_with("/-_-api/v1/"),
            "{} {} sample path must use the legacy external prefix",
            fixture.method,
            fixture.path
        );
        assert!(
            !fixture.payload.sample_path.contains(':'),
            "{} {} sample path must be deterministic and contain no placeholders",
            fixture.method,
            fixture.path
        );

        if let Some(request_json) = fixture.payload.request_json {
            serde_json::from_str::<serde_json::Value>(request_json).unwrap_or_else(|error| {
                panic!(
                    "{} {} request sample is not valid JSON: {error}",
                    fixture.method, fixture.path
                )
            });
        }

        serde_json::from_str::<serde_json::Value>(fixture.payload.success_json).unwrap_or_else(
            |error| {
                panic!(
                    "{} {} success sample is not valid JSON: {error}",
                    fixture.method, fixture.path
                )
            },
        );

        if let Some(alternate_json) = fixture.payload.alternate_json {
            assert!(
                fixture.payload.alternate_status.is_some(),
                "{} {} alternate JSON must carry a status",
                fixture.method,
                fixture.path
            );
            serde_json::from_str::<serde_json::Value>(alternate_json).unwrap_or_else(|error| {
                panic!(
                    "{} {} alternate sample is not valid JSON: {error}",
                    fixture.method, fixture.path
                )
            });
        }
    }
}

#[test]
fn user_create_parser_normalizes_recursive_payload_and_duplicate_email_preflight() {
    let fixture = find_fixture("POST", "/-_-api/v1/users").unwrap();
    let batch = parse_user_create_request(
        fixture.payload.sample_path,
        fixture.payload.request_json.unwrap(),
        &["existing@example.com"],
    )
    .unwrap();

    assert_eq!(batch.endpoint_method, "POST");
    assert_eq!(batch.endpoint_path, "/-_-api/v1/users");
    assert_eq!(batch.entries.len(), 2);
    assert_eq!(batch.entries[0].login_id, "alice");
    assert_eq!(batch.entries[0].name, "Alice Owner");
    assert_eq!(batch.entries[0].email, "alice@example.com");
    assert_eq!(batch.entries[0].action, UserCreateAction::Create);
    assert_eq!(
        batch.entries[1].action,
        UserCreateAction::DuplicateExistingEmail
    );
    assert_eq!(batch.creatable_entries().count(), 1);
    assert_eq!(batch.duplicate_entries().count(), 1);
}

#[test]
fn user_create_parser_preserves_scalar_fallbacks_and_batch_duplicate_detection() {
    let request = r#"{
      "outer": {
        "users": [
          { "profile": { "loginId": 101, "name": true, "email": "one@example.com" } },
          { "profile": { "loginId": "two", "name": "Two", "email": "one@example.com" } }
        ]
      }
    }"#;

    let batch = parse_user_create_request("/-_-api/v1/users", request, &[]).unwrap();

    assert_eq!(batch.entries[0].login_id, "101");
    assert_eq!(batch.entries[0].name, "true");
    assert_eq!(batch.entries[0].action, UserCreateAction::Create);
    assert_eq!(
        batch.entries[1].action,
        UserCreateAction::DuplicateEarlierInBatchEmail
    );
}

#[test]
fn user_create_parser_rejects_invalid_json_path_and_payload_boundaries() {
    assert!(matches!(
        parse_user_create_request("/-_-api/v1/users", "{", &[]),
        Err(UserAdapterError::InvalidJson(_))
    ));
    assert!(matches!(
        parse_user_create_request("/-_-api/v1/admin/users", r#"{"users":[]}"#, &[]),
        Err(UserAdapterError::InvalidPath { .. })
    ));
    assert!(matches!(
        parse_user_create_request("/-_-api/v1/users", r#"{"users":{}}"#, &[]),
        Err(UserAdapterError::MissingUsersArray)
    ));
    assert!(matches!(
        parse_user_create_request("/-_-api/v1/users", r#"{"users":[1]}"#, &[]),
        Err(UserAdapterError::InvalidUserItem { index: 0 })
    ));
    assert!(matches!(
        parse_user_create_request(
            "/-_-api/v1/users",
            r#"{"users":[{"loginId":"alice","email":"alice@example.com"}]}"#,
            &[],
        ),
        Err(UserAdapterError::MissingUserField { field: "name", .. })
    ));
}

#[test]
fn token_parser_normalizes_recursive_request_success_and_error_payloads() {
    let fixture = find_fixture("POST", "/-_-api/v1/users/token").unwrap();
    let request = parse_user_token_request(
        fixture.payload.sample_path,
        fixture.payload.request_json.unwrap(),
    )
    .unwrap();
    assert_eq!(request.id, "alice");
    assert_eq!(request.password, "correct horse battery staple");

    let success =
        parse_user_token_response(fixture.payload.sample_path, fixture.payload.success_json)
            .unwrap();
    assert_eq!(
        success.access_token.as_deref(),
        Some("token-alice-20260621")
    );
    assert_eq!(success.message, None);

    let error = parse_user_token_response(
        fixture.payload.sample_path,
        fixture.payload.alternate_json.unwrap(),
    )
    .unwrap();
    assert_eq!(error.access_token, None);
    assert_eq!(error.message.as_deref(), Some("No user by id and password"));

    let scalar_request = parse_user_token_request(
        "/-_-api/v1/users/token",
        r#"{"outer":{"id":42,"password":false}}"#,
    )
    .unwrap();
    assert_eq!(scalar_request.id, "42");
    assert_eq!(scalar_request.password, "false");
}

#[test]
fn token_parser_rejects_invalid_json_path_and_missing_fields() {
    assert!(matches!(
        parse_user_token_request("/-_-api/v1/users/token", "{"),
        Err(UserAdapterError::InvalidJson(_))
    ));
    assert!(matches!(
        parse_user_token_request("/-_-api/v1/users", r#"{"id":"alice","password":"pw"}"#),
        Err(UserAdapterError::InvalidPath { .. })
    ));
    assert!(matches!(
        parse_user_token_request("/-_-api/v1/users/token", r#"{"id":"alice"}"#),
        Err(UserAdapterError::MissingTokenField("password"))
    ));
}

#[test]
fn user_issue_export_parser_normalizes_query_defaults_and_nested_issue_rows() {
    let fixture = find_fixture("GET", "/-_-api/v1/user/issues").unwrap();
    let export =
        parse_user_issue_export_response(fixture.payload.sample_path, fixture.payload.success_json)
            .unwrap();

    assert_eq!(export.query.filter, "assigned");
    assert_eq!(export.query.page, 1);
    assert_eq!(export.query.page_num, 10);
    assert_eq!(export.issues.len(), 1);
    assert_eq!(export.issues[0].id, Some(30));
    assert_eq!(export.issues[0].number, Some(3));
    assert_eq!(export.issues[0].state.as_deref(), Some("CLOSED"));
    assert_eq!(export.issues[0].author.login_id.as_deref(), Some("author"));
    assert_eq!(export.issues[0].assignee.login_id.as_deref(), Some("alice"));
    assert_eq!(export.issues[0].project_id, Some(10));
    assert_eq!(export.issues[0].project_name.as_deref(), Some("demo"));
    assert_eq!(export.issues[0].owner.as_deref(), Some("alice"));

    let defaults =
        parse_user_issue_export_response("/-_-api/v1/user/issues", r#"{"result":[]}"#).unwrap();
    assert_eq!(defaults.query.filter, "assigned");
    assert_eq!(defaults.query.page, 1);
    assert_eq!(defaults.query.page_num, 10);
}

#[test]
fn user_issue_export_parser_rejects_invalid_path_json_and_result_shape() {
    assert!(matches!(
        parse_user_issue_export_response("/-_-api/v1/user/issues", "{"),
        Err(UserAdapterError::InvalidJson(_))
    ));
    assert!(matches!(
        parse_user_issue_export_response("/-_-api/v1/users", r#"{"result":[]}"#),
        Err(UserAdapterError::InvalidPath { .. })
    ));
    assert!(matches!(
        parse_user_issue_export_response("/-_-api/v1/user/issues", r#"{"result":{}}"#),
        Err(UserAdapterError::InvalidIssuesPayload)
    ));
}

#[test]
fn statistics_default_login_and_admin_user_responses_are_normalized() {
    let statistics = find_fixture("GET", "/-_-api/v1/users/:user/statistics").unwrap();
    let stats = parse_user_statistics_response(
        statistics.payload.sample_path,
        statistics.payload.success_json,
    )
    .unwrap();
    assert_eq!(stats.login_id, "alice");
    assert_eq!(stats.issue, 3);
    assert_eq!(stats.posting, 2);
    assert_eq!(stats.assigned_issue, 1);
    assert_eq!(stats.issue_comment, 5);
    assert_eq!(stats.posting_comment, 4);
    assert_eq!(stats.issue_voter, 6);
    assert_eq!(stats.issue_comment_voter, 7);

    let scalar_stats = parse_user_statistics_response(
        "/-_-api/v1/users/bob/statistics",
        r#"{"issue":"8","posting":true}"#,
    )
    .unwrap();
    assert_eq!(scalar_stats.login_id, "bob");
    assert_eq!(scalar_stats.issue, 8);
    assert_eq!(scalar_stats.posting, 1);
    assert_eq!(scalar_stats.assigned_issue, 0);

    let default_login = find_fixture("POST", "/-_-api/v1/user/defultLoginPage").unwrap();
    let default_login_response = parse_default_login_page_response(
        default_login.payload.sample_path,
        default_login.payload.success_json,
    )
    .unwrap();
    assert_eq!(
        default_login_response.requested_path.as_deref(),
        Some("/alice/demo")
    );
    assert_eq!(
        default_login_response.default_login_page.as_deref(),
        Some("/alice/demo")
    );

    let admin_users = find_fixture("GET", "/-_-api/v1/admin/users").unwrap();
    let users = parse_admin_user_list_response(
        admin_users.payload.sample_path,
        admin_users.payload.success_json,
    )
    .unwrap();
    assert_eq!(users.users.len(), 2);
    assert_eq!(users.users[0].login_id.as_deref(), Some("alice"));
    assert_eq!(users.users[0].state, Some(LegacyUserState::Active));
    assert_eq!(users.users[0].is_guest, Some(false));
    assert_eq!(users.users[1].is_guest, Some(true));
}

#[test]
fn admin_user_state_parser_normalizes_recursive_state_and_response() {
    let fixture = find_fixture("PATCH", "/-_-api/v1/admin/users/:user").unwrap();
    let request = parse_admin_user_state_request(
        fixture.payload.sample_path,
        fixture.payload.request_json.unwrap(),
    )
    .unwrap();
    assert_eq!(request.login_id, "alice");
    assert_eq!(request.state, LegacyUserState::Locked);
    assert_eq!(request.state.as_legacy_str(), "LOCKED");

    let response =
        parse_admin_user_state_response(fixture.payload.sample_path, fixture.payload.success_json)
            .unwrap();
    assert_eq!(response.id, Some(1));
    assert_eq!(response.login_id.as_deref(), Some("alice"));
    assert_eq!(response.state, Some(LegacyUserState::Locked));

    let scalar_request =
        parse_admin_user_state_request("/-_-api/v1/admin/users/bob", r#"{"state":"guest"}"#)
            .unwrap();
    assert_eq!(scalar_request.login_id, "bob");
    assert_eq!(scalar_request.state, LegacyUserState::Guest);
}

#[test]
fn admin_user_parsers_reject_invalid_boundaries() {
    assert!(matches!(
        parse_admin_user_list_response("/-_-api/v1/admin/users", r#"{"users":[]}"#),
        Err(UserAdapterError::InvalidAdminUsersPayload)
    ));
    assert!(matches!(
        parse_admin_user_state_request("/-_-api/v1/admin/users/alice", r#"{}"#),
        Err(UserAdapterError::MissingState)
    ));
    assert!(matches!(
        parse_admin_user_state_request(
            "/-_-api/v1/admin/users/alice",
            r#"{"state":"site-manager"}"#
        ),
        Err(UserAdapterError::InvalidState(_))
    ));
    assert!(matches!(
        parse_admin_user_state_request("/-_-api/v1/admin", r#"{"state":"ACTIVE"}"#),
        Err(UserAdapterError::InvalidPath { .. })
    ));
}
