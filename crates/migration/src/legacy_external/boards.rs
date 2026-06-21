use super::{EndpointDescriptor, EndpointStatus, LegacySource};
use serde_json::Value;

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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyAuthorRef {
    pub login_id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedBoardPostImport {
    pub source_index: usize,
    pub author: Option<LegacyAuthorRef>,
    pub title: String,
    pub body: String,
    pub requested_number: Option<i64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub temporary_upload_files: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BoardPostImportBatch {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub entries: Vec<NormalizedBoardPostImport>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedBoardContentUpdate {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub number: i64,
    pub content: String,
    pub original: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedBoardCommentImport {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub post_number: i64,
    pub author: Option<LegacyAuthorRef>,
    pub body: String,
    pub created_at: Option<String>,
    pub temporary_upload_files: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedBoardLabelReplace {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub post_number: i64,
    pub label_ids: Vec<i64>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BoardAdapterError {
    InvalidJson(String),
    InvalidPath {
        path: String,
        expected: &'static str,
    },
    InvalidNumber {
        segment: String,
    },
    MissingPostsArray,
    InvalidPostItem {
        index: usize,
    },
    MissingField {
        field: &'static str,
    },
    InvalidLabelArray,
    InvalidLabelId {
        index: usize,
        value: String,
    },
}

impl std::fmt::Display for BoardAdapterError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidJson(error) => write!(formatter, "invalid board legacy JSON: {error}"),
            Self::InvalidPath { path, expected } => {
                write!(formatter, "invalid board legacy path `{path}`; expected {expected}")
            }
            Self::InvalidNumber { segment } => {
                write!(formatter, "invalid board post number `{segment}`")
            }
            Self::MissingPostsArray => {
                write!(formatter, "No posts key exists or value wasn't array!")
            }
            Self::InvalidPostItem { index } => {
                write!(formatter, "board post item at index {index} must be a JSON object")
            }
            Self::MissingField { field } => {
                write!(formatter, "missing required board field `{field}`")
            }
            Self::InvalidLabelArray => write!(formatter, "board post labels payload must be an array"),
            Self::InvalidLabelId { index, value } => write!(
                formatter,
                "invalid board label id `{value}` at index {index}; expected integer-compatible scalar"
            ),
        }
    }
}

impl std::error::Error for BoardAdapterError {}

pub fn fixtures() -> &'static [BoardEndpointFixture] {
    BOARD_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static BoardEndpointFixture> {
    BOARD_ENDPOINT_FIXTURES
        .iter()
        .find(|fixture| fixture.method == method && fixture.path == path)
}

pub fn parse_board_post_import_request(
    sample_path: &str,
    request_json: &str,
) -> Result<BoardPostImportBatch, BoardAdapterError> {
    let (owner, project_name) = parse_owner_project_path(
        sample_path,
        "posts",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts",
    )?;
    let payload = parse_json(request_json)?;
    let posts = find_value(&payload, "posts")
        .and_then(Value::as_array)
        .ok_or(BoardAdapterError::MissingPostsArray)?;
    let mut entries = Vec::with_capacity(posts.len());

    for (source_index, post) in posts.iter().enumerate() {
        if !post.is_object() {
            return Err(BoardAdapterError::InvalidPostItem {
                index: source_index,
            });
        }

        entries.push(NormalizedBoardPostImport {
            source_index,
            author: find_value(post, "author").map(author_ref),
            title: required_text_field(post, "title")?,
            body: required_text_field(post, "body")?,
            requested_number: find_value(post, "number").and_then(integer_field),
            created_at: optional_text_field(post, "createdAt"),
            updated_at: optional_text_field(post, "updatedAt"),
            temporary_upload_files: upload_files(post),
        });
    }

    Ok(BoardPostImportBatch {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/posts",
        owner,
        project_name,
        entries,
    })
}

pub fn parse_board_content_update_request(
    sample_path: &str,
    request_json: &str,
) -> Result<NormalizedBoardContentUpdate, BoardAdapterError> {
    let (owner, project_name, number) = parse_post_path(
        sample_path,
        "content",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content",
    )?;
    let payload = parse_json(request_json)?;

    Ok(NormalizedBoardContentUpdate {
        endpoint_method: "PATCH",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content",
        owner,
        project_name,
        number,
        content: required_text_field(&payload, "content")?,
        original: required_text_field(&payload, "original")?,
    })
}

pub fn parse_board_comment_import_request(
    sample_path: &str,
    request_json: &str,
) -> Result<NormalizedBoardCommentImport, BoardAdapterError> {
    let (owner, project_name, post_number) = parse_post_path(
        sample_path,
        "comments",
        "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments",
    )?;
    let payload = parse_json(request_json)?;

    Ok(NormalizedBoardCommentImport {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments",
        owner,
        project_name,
        post_number,
        author: find_value(&payload, "author").map(author_ref),
        body: required_text_field(&payload, "body")?,
        created_at: optional_text_field(&payload, "createdAt"),
        temporary_upload_files: upload_files(&payload),
    })
}

pub fn parse_board_label_replace_request(
    sample_path: &str,
    request_json: &str,
) -> Result<NormalizedBoardLabelReplace, BoardAdapterError> {
    let (owner, project_name, post_number) = parse_post_path(
        sample_path,
        "postlabel",
        "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number",
    )?;
    let payload = parse_json(request_json)?;
    let labels = payload
        .as_array()
        .ok_or(BoardAdapterError::InvalidLabelArray)?;
    let mut label_ids = Vec::with_capacity(labels.len());

    for (index, label) in labels.iter().enumerate() {
        let Some(label_id) = integer_field(label) else {
            return Err(BoardAdapterError::InvalidLabelId {
                index,
                value: label.to_string(),
            });
        };
        label_ids.push(label_id);
    }

    Ok(NormalizedBoardLabelReplace {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number",
        owner,
        project_name,
        post_number,
        label_ids,
    })
}

fn parse_json(request_json: &str) -> Result<Value, BoardAdapterError> {
    serde_json::from_str(request_json)
        .map_err(|error| BoardAdapterError::InvalidJson(error.to_string()))
}

fn parse_owner_project_path(
    path: &str,
    terminal: &str,
    expected: &'static str,
) -> Result<(String, String), BoardAdapterError> {
    let parts: Vec<&str> = path.split('/').filter(|part| !part.is_empty()).collect();
    match parts.as_slice() {
        ["-_-api", "v1", "owners", owner, "projects", project_name, found]
            if *found == terminal =>
        {
            Ok(((*owner).to_string(), (*project_name).to_string()))
        }
        _ => Err(BoardAdapterError::InvalidPath {
            path: path.to_string(),
            expected,
        }),
    }
}

fn parse_post_path(
    path: &str,
    terminal: &str,
    expected: &'static str,
) -> Result<(String, String, i64), BoardAdapterError> {
    let parts: Vec<&str> = path.split('/').filter(|part| !part.is_empty()).collect();
    match parts.as_slice() {
        ["-_-api", "v1", "owners", owner, "projects", project_name, "posts", number, found]
            if terminal != "postlabel" && *found == terminal =>
        {
            Ok((
                (*owner).to_string(),
                (*project_name).to_string(),
                parse_i64(number)?,
            ))
        }
        ["-_-api", "v1", "owners", owner, "projects", project_name, "postlabel", number]
            if terminal == "postlabel" =>
        {
            Ok((
                (*owner).to_string(),
                (*project_name).to_string(),
                parse_i64(number)?,
            ))
        }
        _ => Err(BoardAdapterError::InvalidPath {
            path: path.to_string(),
            expected,
        }),
    }
}

fn parse_i64(value: &str) -> Result<i64, BoardAdapterError> {
    value
        .parse::<i64>()
        .map_err(|_| BoardAdapterError::InvalidNumber {
            segment: value.to_string(),
        })
}

fn author_ref(value: &Value) -> LegacyAuthorRef {
    LegacyAuthorRef {
        login_id: optional_text_field(value, "loginId"),
        name: optional_text_field(value, "name"),
        email: optional_text_field(value, "email"),
    }
}

fn required_text_field(value: &Value, key: &'static str) -> Result<String, BoardAdapterError> {
    optional_text_field(value, key).ok_or(BoardAdapterError::MissingField { field: key })
}

fn optional_text_field(value: &Value, key: &str) -> Option<String> {
    find_value(value, key).and_then(|value| match value {
        Value::Null => None,
        Value::String(text) => Some(text.clone()),
        Value::Bool(flag) => Some(flag.to_string()),
        Value::Number(number) => Some(number.to_string()),
        other => Some(other.to_string()),
    })
}

fn integer_field(value: &Value) -> Option<i64> {
    match value {
        Value::Number(number) => number.as_i64(),
        Value::String(text) => text.parse::<i64>().ok(),
        Value::Bool(flag) => Some(i64::from(*flag)),
        _ => None,
    }
}

fn upload_files(value: &Value) -> Vec<String> {
    match find_value(value, "temporaryUploadFiles") {
        Some(Value::Array(files)) => files
            .iter()
            .filter_map(|file| match file {
                Value::Null => None,
                Value::String(text) => Some(text.clone()),
                Value::Bool(flag) => Some(flag.to_string()),
                Value::Number(number) => Some(number.to_string()),
                other => Some(other.to_string()),
            })
            .collect(),
        Some(Value::Null) => Vec::new(),
        Some(Value::String(text)) if text.is_empty() => Vec::new(),
        Some(value) => vec![optional_scalar_text(value)],
        None => Vec::new(),
    }
}

fn optional_scalar_text(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(text) => text.clone(),
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => number.to_string(),
        other => other.to_string(),
    }
}

fn find_value<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
    match value {
        Value::Object(map) => {
            if let Some(found) = map.get(key) {
                return Some(found);
            }
            map.values().find_map(|nested| find_value(nested, key))
        }
        Value::Array(values) => values.iter().find_map(|nested| find_value(nested, key)),
        _ => None,
    }
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
