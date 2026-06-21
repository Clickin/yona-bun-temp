use super::{EndpointDescriptor, EndpointStatus, LegacySource};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuthRequirement {
    BoardPostCreatePermission,
    BoardPostUpdatePermission,
    NonIssueCommentCreatePermission,
    LegacyJsonMutation,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MigrationDirection {
    Import,
    AppOwned,
    Deferred,
}

impl MigrationDirection {
    pub const fn endpoint_status(self) -> EndpointStatus {
        match self {
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
pub struct BoardEndpointFixture {
    pub method: &'static str,
    pub path: &'static str,
    pub legacy_controller: &'static str,
    pub legacy_action: &'static str,
    pub direction: MigrationDirection,
    pub auth: AuthRequirement,
    pub request: FixtureShape,
    pub response: FixtureShape,
    pub payload: LegacyPayloadFixture,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct LegacyPayloadFixture {
    pub sample_path: &'static str,
    pub request_json: &'static str,
    pub success_status: u16,
    pub success_json: &'static str,
    pub alternate_status: Option<u16>,
    pub alternate_json: Option<&'static str>,
}

pub fn fixtures() -> &'static [BoardEndpointFixture] {
    BOARD_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static BoardEndpointFixture> {
    BOARD_ENDPOINT_FIXTURES
        .iter()
        .find(|fixture| fixture.method == method && fixture.path == path)
}

const fn source(controller: &'static str, action: &'static str) -> LegacySource {
    LegacySource { controller, action }
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

pub const ENDPOINT_DESCRIPTORS: &[EndpointDescriptor] = &[
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts",
        source: source("controllers.api.BoardApi", "newPostings"),
        status: EndpointStatus::AppOwned,
    },
    EndpointDescriptor {
        method: "PATCH",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content",
        source: source("controllers.api.BoardApi", "updatePostingContent"),
        status: EndpointStatus::AppOwned,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments",
        source: source("controllers.api.BoardApi", "newPostingComment"),
        status: EndpointStatus::AppOwned,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number",
        source: source("controllers.api.BoardApi", "updatePostLabel"),
        status: EndpointStatus::AppOwned,
    },
];

const BOARD_ENDPOINT_FIXTURES: &[BoardEndpointFixture] = &[
    BoardEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts",
        legacy_controller: "controllers.api.BoardApi",
        legacy_action: "newPostings",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::BoardPostCreatePermission,
        request: shape(
            &["owner", "projectName"],
            &[],
            &[],
            &[
                "posts",
                "author",
                "title",
                "body",
                "createdAt",
                "updatedAt",
                "temporaryUploadFiles",
                "number",
            ],
            &["message"],
        ),
        response: shape(&[], &[], &[], &[], &["status", "location"]),
        payload: BOARD_POST_CREATE_PAYLOAD,
    },
    BoardEndpointFixture {
        method: "PATCH",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content",
        legacy_controller: "controllers.api.BoardApi",
        legacy_action: "updatePostingContent",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::BoardPostUpdatePermission,
        request: shape(
            &["owner", "projectName", "number"],
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
            &[
                "number",
                "id",
                "title",
                "type",
                "author",
                "createdAt",
                "updatedAt",
                "body",
                "owner",
                "projectName",
                "attachments",
                "comments",
                "storedContent",
            ],
        ),
        payload: BOARD_POST_CONTENT_PAYLOAD,
    },
    BoardEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments",
        legacy_controller: "controllers.api.BoardApi",
        legacy_action: "newPostingComment",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::NonIssueCommentCreatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["author", "body", "createdAt", "temporaryUploadFiles"],
            &["Expecting Json data"],
        ),
        response: shape(&[], &[], &[], &[], &["status", "location"]),
        payload: BOARD_COMMENT_CREATE_PAYLOAD,
    },
    BoardEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number",
        legacy_controller: "controllers.api.BoardApi",
        legacy_action: "updatePostLabel",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::LegacyJsonMutation,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["labelId"],
            &["Expecting Json data"],
        ),
        response: shape(&[], &[], &[], &[], &["id", "labels"]),
        payload: BOARD_LABEL_REPLACE_PAYLOAD,
    },
];

const BOARD_POST_CREATE_PAYLOAD: LegacyPayloadFixture = LegacyPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/posts",
    request_json: r##"{
  "import": {
    "posts": [
      {
        "author": {
          "loginId": "author",
          "name": "Author User",
          "email": "author@example.com"
        },
        "metadata": {
          "number": 4,
          "createdAt": "2026-06-04T00:00:00Z",
          "updatedAt": "2026-06-05T00:00:00Z"
        },
        "content": {
          "title": "Legacy post",
          "body": "legacy post body"
        },
        "files": {
          "temporaryUploadFiles": ["901", "902"]
        }
      }
    ]
  }
}"##,
    success_status: 201,
    success_json: r##"[
  {
    "status": 201,
    "location": "/alice/demo/post/4"
  }
]"##,
    alternate_status: Some(400),
    alternate_json: Some(
        r##"{
  "message": "No posts key exists or value wasn't array!"
}"##,
    ),
};

const BOARD_POST_CONTENT_PAYLOAD: LegacyPayloadFixture = LegacyPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/posts/4/content",
    request_json: r##"{
  "edit": {
    "content": "legacy post body updated",
    "original": "legacy post body"
  }
}"##,
    success_status: 200,
    success_json: r##"{
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
  "body": "legacy post body updated",
  "owner": "alice",
  "projectName": "demo",
  "attachments": [
    {
      "id": 901,
      "name": "post.png",
      "hash": "post-hash",
      "mimeType": "image/png",
      "size": 123,
      "containerType": "BOARD_POST",
      "containerId": "50",
      "ownerLoginId": "author"
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
      "body": "legacy post comment",
      "attachments": [
        {
          "id": 951,
          "name": "comment.txt",
          "hash": "comment-hash",
          "mimeType": "text/plain",
          "size": 45,
          "containerType": "NONISSUE_COMMENT",
          "containerId": "51",
          "ownerLoginId": "commenter"
        }
      ],
      "childComments": [
        {
          "id": 52,
          "type": "NONISSUE_COMMENT",
          "author": {
            "loginId": "child",
            "name": "Child User",
            "email": "child@example.com"
          },
          "createdAt": "2026-06-06T01:00:00Z",
          "body": "legacy child comment"
        }
      ]
    }
  ]
}"##,
    alternate_status: Some(409),
    alternate_json: Some(
        r##"{
  "message": "Already modified by someone.",
  "storedContent": "stored legacy post body"
}"##,
    ),
};

const BOARD_COMMENT_CREATE_PAYLOAD: LegacyPayloadFixture = LegacyPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/posts/4/comments",
    request_json: r##"{
  "comment": {
    "author": {
      "loginId": "commenter",
      "name": "Commenter User",
      "email": "commenter@example.com"
    },
    "body": "legacy post comment",
    "createdAt": "2026-06-06T00:00:00Z",
    "temporaryUploadFiles": ["951"]
  }
}"##,
    success_status: 201,
    success_json: r##"{
  "status": 201,
  "location": "/alice/demo/post/4#comment-51"
}"##,
    alternate_status: None,
    alternate_json: None,
};

const BOARD_LABEL_REPLACE_PAYLOAD: LegacyPayloadFixture = LegacyPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/postlabel/4",
    request_json: r##"[
  301,
  302
]"##,
    success_status: 200,
    success_json: r##"{
  "id": "alice",
  "labels": 2
}"##,
    alternate_status: None,
    alternate_json: None,
};
