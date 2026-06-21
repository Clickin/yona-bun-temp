use super::EndpointStatus;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuthRequirement {
    DeletePermission,
    SiteManagerSession,
    IssueLabelCreatePermission,
    ReadPermission,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MigrationDirection {
    Export,
    Import,
    AppOwned,
    Deferred,
}

impl MigrationDirection {
    pub const fn endpoint_status(self) -> EndpointStatus {
        match self {
            Self::Export => EndpointStatus::MigratorExport,
            Self::Import => EndpointStatus::MigratorImport,
            Self::AppOwned => EndpointStatus::AppOwned,
            Self::Deferred => EndpointStatus::MigratorDeferred,
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
pub struct ProjectEndpointFixture {
    pub method: &'static str,
    pub path: &'static str,
    pub legacy_controller: &'static str,
    pub legacy_action: &'static str,
    pub direction: MigrationDirection,
    pub auth: AuthRequirement,
    pub request: FixtureShape,
    pub response: FixtureShape,
    pub migration_payload: Option<ProjectMigrationPayloadFixture>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ProjectMigrationPayloadFixture {
    pub sample_path: &'static str,
    pub request_json: Option<&'static str>,
    pub success_status: u16,
    pub success_json: &'static str,
    pub alternate_status: Option<u16>,
    pub alternate_json: Option<&'static str>,
}

pub fn fixtures() -> &'static [ProjectEndpointFixture] {
    PROJECT_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static ProjectEndpointFixture> {
    PROJECT_ENDPOINT_FIXTURES
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

const PROJECT_ENDPOINT_FIXTURES: &[ProjectEndpointFixture] = &[
    ProjectEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/exports",
        legacy_controller: "controllers.api.ProjectApi",
        legacy_action: "exports",
        direction: MigrationDirection::Export,
        auth: AuthRequirement::DeletePermission,
        request: shape(&["owner", "projectName"], &[], &[], &[], &[]),
        response: shape(
            &[],
            &[],
            &[],
            &[],
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
            ],
        ),
        migration_payload: Some(PROJECT_EXPORT_PAYLOAD),
    },
    ProjectEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects",
        legacy_controller: "controllers.api.ProjectApi",
        legacy_action: "newProject",
        direction: MigrationDirection::Import,
        auth: AuthRequirement::SiteManagerSession,
        request: shape(
            &["owner"],
            &[],
            &[],
            &[
                "projectName",
                "projectDescription",
                "projectCreatedDate",
                "projectVcs",
                "projectScope",
                "members",
                "email",
                "role",
            ],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "id", "owner", "name", "overview", "vcs", "status", "reason", "project",
            ],
        ),
        migration_payload: Some(PROJECT_IMPORT_PAYLOAD),
    },
    ProjectEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/labels",
        legacy_controller: "controllers.api.ProjectApi",
        legacy_action: "newLabel",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::IssueLabelCreatePermission,
        request: shape(
            &["owner", "projectName"],
            &[],
            &[],
            &[
                "labels",
                "labelName",
                "labelColor",
                "category",
                "isExclusive",
            ],
            &["message"],
        ),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "status",
                "label",
                "category",
                "labelColor",
                "isExclusive",
                "reason",
                "message",
            ],
        ),
        migration_payload: None,
    },
    ProjectEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads",
        legacy_controller: "controllers.api.ProjectApi",
        legacy_action: "titleHeads",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::ReadPermission,
        request: shape(&["owner", "projectName"], &["query"], &["Accept"], &[], &[]),
        response: shape(
            &[],
            &[],
            &[],
            &[],
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
            ],
        ),
        migration_payload: None,
    },
];

const PROJECT_EXPORT_PAYLOAD: ProjectMigrationPayloadFixture = ProjectMigrationPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/exports",
    request_json: None,
    success_status: 200,
    success_json: r##"{
  "owner": "alice",
  "projectName": "demo",
  "projectDescription": "Legacy project",
  "projectCreatedDate": "2026-06-01 AM 09:00:00 +0900",
  "projectVcs": "GIT",
  "projectScope": "PUBLIC",
  "assignees": [
    {
      "loginId": "assignee",
      "name": "Assignee User",
      "email": "assignee@example.com"
    }
  ],
  "authors": [
    {
      "loginId": "author",
      "name": "Author User",
      "email": "author@example.com"
    }
  ],
  "memberCount": 1,
  "members": [
    {
      "loginId": "alice",
      "name": "Alice Owner",
      "role": "manager",
      "email": "alice@example.com"
    }
  ],
  "issueCount": 1,
  "postCount": 1,
  "milestoneCount": 1,
  "labels": [
    {
      "labelName": "Bug",
      "labelColor": "#2196f3",
      "category": "Type",
      "isExclusive": false
    }
  ],
  "issues": [
    {
      "number": 3,
      "id": 30,
      "title": "Legacy issue",
      "type": "ISSUE_POST",
      "author": {
        "loginId": "author",
        "name": "Author User",
        "email": "author@example.com"
      },
      "createdAt": "2026-06-01T00:00:00Z",
      "updatedAt": "2026-06-02T00:00:00Z",
      "body": "legacy issue body",
      "owner": "alice",
      "projectName": "demo",
      "assignees": [
        {
          "loginId": "assignee",
          "name": "Assignee User",
          "email": "assignee@example.com"
        }
      ],
      "state": "CLOSED",
      "labels": [
        {
          "labelName": "Bug",
          "labelColor": "#2196f3",
          "category": "Type"
        }
      ],
      "milestoneId": 7,
      "milestoneTitle": "M1",
      "dueDate": "2026-06-30 PM 11:59:59 +0900",
      "refUrl": "https://yona.example.com/alice/demo/issue/3",
      "attachments": [
        {
          "id": 301,
          "name": "issue.png",
          "hash": "issue-hash",
          "mimeType": "image/png",
          "size": 123,
          "containerType": "ISSUE_POST",
          "containerId": "30",
          "ownerLoginId": "author"
        }
      ],
      "comments": [
        {
          "id": 40,
          "type": "ISSUE_COMMENT",
          "author": {
            "loginId": "commenter",
            "name": "Commenter User",
            "email": "commenter@example.com"
          },
          "createdAt": "2026-06-03T00:00:00Z",
          "body": "issue comment",
          "attachments": [
            {
              "id": 401,
              "name": "issue-comment.txt",
              "hash": "issue-comment-hash",
              "mimeType": "text/plain",
              "size": 45,
              "containerType": "ISSUE_COMMENT",
              "containerId": "40",
              "ownerLoginId": "commenter"
            }
          ],
          "childComments": [
            {
              "id": 41,
              "type": "ISSUE_COMMENT",
              "author": {
                "loginId": "commenter",
                "name": "Commenter User",
                "email": "commenter@example.com"
              },
              "createdAt": "2026-06-03T01:00:00Z",
              "body": "child issue comment"
            }
          ]
        }
      ]
    }
  ],
  "posts": [
    {
      "number": 4,
      "id": 50,
      "title": "Legacy post",
      "type": "BOARD_POST",
      "author": {
        "loginId": "author",
        "name": "Author User",
        "email": "author@example.com"
      },
      "createdAt": "2026-06-04T00:00:00Z",
      "updatedAt": "2026-06-05T00:00:00Z",
      "body": "legacy post body",
      "owner": "alice",
      "projectName": "demo",
      "labels": [
        {
          "labelName": "Bug",
          "labelColor": "#2196f3",
          "category": "Type"
        }
      ],
      "comments": [
        {
          "id": 51,
          "type": "NONISSUE_COMMENT",
          "author": {
            "loginId": "commenter",
            "name": "Commenter User",
            "email": "commenter@example.com"
          },
          "createdAt": "2026-06-06T00:00:00Z",
          "body": "post comment"
        }
      ]
    }
  ],
  "milestones": [
    {
      "id": 7,
      "title": "M1",
      "state": "open",
      "description": "First milestone",
      "dueDate": "2026-06-30 PM 11:59:59 +0900"
    }
  ]
}"##,
    alternate_status: None,
    alternate_json: None,
};

const PROJECT_IMPORT_PAYLOAD: ProjectMigrationPayloadFixture = ProjectMigrationPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects",
    request_json: Some(
        r##"{
  "projectName": "demo",
  "projectDescription": "Legacy project",
  "projectCreatedDate": "2026-06-01 AM 09:00:00 +0900",
  "projectVcs": "GIT",
  "projectScope": "PUBLIC",
  "members": [
    {
      "loginId": "alice",
      "name": "Alice Owner",
      "email": "alice@example.com",
      "role": "manager"
    },
    {
      "loginId": "member",
      "name": "Member User",
      "email": "member@example.com",
      "role": "member"
    }
  ]
}"##,
    ),
    success_status: 201,
    success_json: r##"{
  "id": 10,
  "owner": "alice",
  "name": "demo",
  "overview": "Legacy project",
  "vcs": "GIT"
}"##,
    alternate_status: Some(400),
    alternate_json: Some(
        r##"{
  "status": 409,
  "reason": "Conflict",
  "project": {
    "id": 10,
    "owner": "alice",
    "name": "demo",
    "overview": "Legacy project",
    "vcs": "GIT"
  }
}"##,
    ),
};
