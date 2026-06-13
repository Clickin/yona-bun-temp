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
    Deferred,
}

impl MigrationDirection {
    pub const fn endpoint_status(self) -> EndpointStatus {
        match self {
            Self::Import => EndpointStatus::MigratorImport,
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
        status: EndpointStatus::MigratorImport,
    },
    EndpointDescriptor {
        method: "PATCH",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content",
        source: source("controllers.api.BoardApi", "updatePostingContent"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments",
        source: source("controllers.api.BoardApi", "newPostingComment"),
        status: EndpointStatus::MigratorImport,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number",
        source: source("controllers.api.BoardApi", "updatePostLabel"),
        status: EndpointStatus::MigratorDeferred,
    },
];

const BOARD_ENDPOINT_FIXTURES: &[BoardEndpointFixture] = &[
    BoardEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts",
        legacy_controller: "controllers.api.BoardApi",
        legacy_action: "newPostings",
        direction: MigrationDirection::Import,
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
    },
    BoardEndpointFixture {
        method: "PATCH",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content",
        legacy_controller: "controllers.api.BoardApi",
        legacy_action: "updatePostingContent",
        direction: MigrationDirection::Deferred,
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
    },
    BoardEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments",
        legacy_controller: "controllers.api.BoardApi",
        legacy_action: "newPostingComment",
        direction: MigrationDirection::Import,
        auth: AuthRequirement::NonIssueCommentCreatePermission,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["author", "body", "createdAt", "temporaryUploadFiles"],
            &["Expecting Json data"],
        ),
        response: shape(&[], &[], &[], &[], &["status", "location"]),
    },
    BoardEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number",
        legacy_controller: "controllers.api.BoardApi",
        legacy_action: "updatePostLabel",
        direction: MigrationDirection::Deferred,
        auth: AuthRequirement::LegacyJsonMutation,
        request: shape(
            &["owner", "projectName", "number"],
            &[],
            &[],
            &["labelId"],
            &["Expecting Json data"],
        ),
        response: shape(&[], &[], &[], &[], &["id", "labels"]),
    },
];
