use super::EndpointStatus;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuthRequirement {
    AuthorizationTokenHeader,
    AuthorizationTokenOrImportSession,
    AnonymousCheck,
    CurrentUserSession,
    IssueCreatePermission,
    IssueUpdatePermission,
    ProjectReadJsonAccept,
    AnonymousJsonAccept,
    LoginSession,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MigrationDirection {
    Export,
    Import,
    Deferred,
    AppOwned,
}

impl MigrationDirection {
    pub const fn endpoint_status(self) -> EndpointStatus {
        match self {
            Self::Export => EndpointStatus::MigratorExport,
            Self::Import => EndpointStatus::MigratorImport,
            Self::Deferred => EndpointStatus::MigratorDeferred,
            Self::AppOwned => EndpointStatus::AppOwned,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct FixtureShape {
    pub path_fields: &'static [&'static str],
    pub query_fields: &'static [&'static str],
    pub header_fields: &'static [&'static str],
    pub body_fields: &'static [&'static str],
    pub response_fields: &'static [&'static str],
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct IssueEndpointFixture {
    pub method: &'static str,
    pub path: &'static str,
    pub legacy_controller: &'static str,
    pub legacy_action: &'static str,
    pub direction: MigrationDirection,
    pub auth: AuthRequirement,
    pub request: FixtureShape,
    pub response: FixtureShape,
    pub migration_payload: Option<IssueMigrationPayloadFixture>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct IssueMigrationPayloadFixture {
    pub sample_path: &'static str,
    pub request_json: Option<&'static str>,
    pub success_status: u16,
    pub success_json: &'static str,
    pub alternate_status: Option<u16>,
    pub alternate_json: Option<&'static str>,
}

pub fn fixtures() -> &'static [IssueEndpointFixture] {
    ISSUE_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static IssueEndpointFixture> {
    ISSUE_ENDPOINT_FIXTURES
        .iter()
        .find(|fixture| fixture.method == method && fixture.path == path)
}

const fn shape(
    path_fields: &'static [&'static str],
    query_fields: &'static [&'static str],
    header_fields: &'static [&'static str],
    body_fields: &'static [&'static str],
    response_fields: &'static [&'static str],
) -> FixtureShape {
    FixtureShape {
        path_fields,
        query_fields,
        header_fields,
        body_fields,
        response_fields,
    }
}

const ISSUE_ENDPOINT_FIXTURES: &[IssueEndpointFixture] = &[
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "imports",
        direction: MigrationDirection::Import,
        auth: AuthRequirement::AnonymousCheck,
        request: shape(
            &["owner", "projectName"],
            &["postNumber"],
            &[],
            &[],
            &["badRequest"],
        ),
        response: shape(&[], &[], &[], &[], &["number"]),
        migration_payload: Some(ISSUE_IMPORTS_PAYLOAD),
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "newIssues",
        direction: MigrationDirection::Import,
        auth: AuthRequirement::IssueCreatePermission,
        request: shape(
            &["owner", "projectName"],
            &[],
            &[],
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
            ],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["status", "location"]),
        migration_payload: Some(ISSUE_BULK_IMPORT_PAYLOAD),
    },
    IssueEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "getIssue",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AuthorizationTokenHeader,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &["Authorization"],
            &[],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "result",
                "id",
                "number",
                "title",
                "body",
                "state",
                "author",
                "assignee",
                "labels",
                "milestone",
                "comments",
                "events",
                "eventType",
                "oldValue",
                "newValue",
                "actor",
            ],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "PUT",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateIssue",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AuthorizationTokenHeader,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &["Authorization"],
            &["title", "body", "state", "assignees", "milestoneTitle"],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["result", "events"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "PATCH",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateIssueState",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AuthorizationTokenHeader,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &["Authorization"],
            &["state"],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["result", "state", "events"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "PATCH",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/content",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateIssueContent",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["content", "original"],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["storedContent", "body"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "newIssueComment",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AuthorizationTokenOrImportSession,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &["Authorization"],
            &[
                "comment",
                "author",
                "body",
                "createdAt",
                "temporaryUploadFiles",
            ],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["status", "location", "result"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "PUT",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments/:commentId",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateIssueComment",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number", "commentId"],
            &[],
            &[],
            &["content", "original"],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &["result", "id", "contents", "createdDate", "author"],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/commentNotiReceivers",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "commentNotiRecivers",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::CurrentUserSession,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["comment", "parentCommentId"],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["receivers", "loginId", "name"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issuelabel/:number",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateIssueLabel",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::CurrentUserSession,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["labelId"],
            &[],
        ),
        response: shape(&[], &[], &[], &[], &["id", "labels"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignableUsers",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "findAssignableUsers",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::ProjectReadJsonAccept,
        request: shape(
            &["owner", "projectName", "number"],
            &["query", "type"],
            &["Accept"],
            &[],
            &[],
        ),
        response: shape(
            &[],
            &[],
            &["Content-Range"],
            &[],
            &["loginId", "name", "avatarUrl"],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/assignableUsers",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "findAssignableUsersOfProject",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::ProjectReadJsonAccept,
        request: shape(
            &["owner", "projectName"],
            &["query", "type"],
            &["Accept"],
            &[],
            &[],
        ),
        response: shape(
            &[],
            &[],
            &["Content-Range"],
            &[],
            &["loginId", "name", "avatarUrl"],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateAssginees",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["assignees"],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &["assignee", "loginId", "name", "issue"],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/findSharer",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "findSharerByloginIds",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AnonymousJsonAccept,
        request: shape(
            &["owner", "projectName", "number"],
            &["query"],
            &["Accept"],
            &[],
            &[],
        ),
        response: shape(&[], &[], &[], &[], &["loginId", "name", "avatarUrl"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/sharableUsers",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "findSharableUsers",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::ProjectReadJsonAccept,
        request: shape(
            &["owner", "projectName", "number"],
            &["query", "type"],
            &["Accept"],
            &[],
            &[],
        ),
        response: shape(
            &[],
            &[],
            &["Content-Range"],
            &[],
            &["loginId", "name", "avatarUrl", "projectName"],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "updateSharer",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["sharer", "type", "loginId", "action"],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["action", "sharer"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/upvoteWeight",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "upvoteWeight",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &[],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["weight"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/downvoteWeight",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "downvoteWeight",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &[],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["weight"]),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/detectChange",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "detectChange",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::CurrentUserSession,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["issueBodyChecksum", "numOfComments"],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "result",
                "commentAuthorName",
                "issueBodyChanged",
                "numOfComments",
                "issueBodyChecksum",
                "issueUpdateDate",
            ],
        ),
        migration_payload: None,
    },
    IssueEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/translation",
        legacy_controller: "controllers.api.IssueApi",
        legacy_action: "translate",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::LoginSession,
        request: shape(
            &[],
            &[],
            &[],
            &["owner", "projectName", "type", "number"],
            &[],
        ),
        response: shape(&[], &[], &[], &[], &["translated", "Precondition Failed"]),
        migration_payload: None,
    },
];

const ISSUE_IMPORTS_PAYLOAD: IssueMigrationPayloadFixture = IssueMigrationPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/issues/imports?postNumber=4",
    request_json: None,
    success_status: 200,
    success_json: r##"{
  "number": 5
}"##,
    alternate_status: Some(400),
    alternate_json: None,
};

const ISSUE_BULK_IMPORT_PAYLOAD: IssueMigrationPayloadFixture = IssueMigrationPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/issues",
    request_json: Some(
        r##"{
  "sendNotification": true,
  "issues": [
    {
      "number": 3,
      "author": {
        "loginId": "author",
        "name": "Author User",
        "email": "author@example.com"
      },
      "title": "Legacy issue",
      "body": "legacy issue body",
      "state": "CLOSED",
      "createdAt": "2026-06-01 AM 09:00:00 +0900",
      "updatedAt": "2026-06-02 PM 03:30:00 +0900",
      "assignees": [
        {
          "loginId": "assignee",
          "name": "Assignee User",
          "email": "assignee@example.com"
        }
      ],
      "milestoneTitle": "M1",
      "dueDate": "2026-06-30 PM 11:59:59 +0900",
      "labels": [
        {
          "labelName": "Bug",
          "labelColor": "#2196f3",
          "category": "Type"
        }
      ],
      "temporaryUploadFiles": [
        "tmp-issue-upload"
      ]
    }
  ]
}"##,
    ),
    success_status: 201,
    success_json: r##"[
  {
    "status": 201,
    "location": "/alice/demo/issue/3"
  }
]"##,
    alternate_status: Some(400),
    alternate_json: Some(
        r##"{
  "message": "No issues key exists or value wasn't array!"
}"##,
    ),
};
