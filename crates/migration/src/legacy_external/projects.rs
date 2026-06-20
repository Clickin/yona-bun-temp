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
    },
];
