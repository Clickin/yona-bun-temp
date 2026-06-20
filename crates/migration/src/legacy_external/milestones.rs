use super::{EndpointDescriptor, EndpointStatus, LegacySource};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuthRequirement {
    MilestoneCreatePermission,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MigrationDirection {
    AppOwned,
    Import,
}

impl MigrationDirection {
    pub const fn endpoint_status(self) -> EndpointStatus {
        match self {
            Self::AppOwned => EndpointStatus::AppOwned,
            Self::Import => EndpointStatus::MigratorImport,
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
pub struct MilestoneEndpointFixture {
    pub method: &'static str,
    pub path: &'static str,
    pub legacy_controller: &'static str,
    pub legacy_action: &'static str,
    pub direction: MigrationDirection,
    pub auth: AuthRequirement,
    pub request: FixtureShape,
    pub response: FixtureShape,
}

pub fn fixtures() -> &'static [MilestoneEndpointFixture] {
    MILESTONE_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static MilestoneEndpointFixture> {
    MILESTONE_ENDPOINT_FIXTURES
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

pub const ENDPOINT_DESCRIPTORS: &[EndpointDescriptor] = &[EndpointDescriptor {
    method: "POST",
    path: "/-_-api/v1/owners/:owner/projects/:projectName/milestones",
    source: source("controllers.api.MilestoneApi", "newMilestone"),
    status: EndpointStatus::AppOwned,
}];

const MILESTONE_ENDPOINT_FIXTURES: &[MilestoneEndpointFixture] = &[MilestoneEndpointFixture {
    method: "POST",
    path: "/-_-api/v1/owners/:owner/projects/:projectName/milestones",
    legacy_controller: "controllers.api.MilestoneApi",
    legacy_action: "newMilestone",
    direction: MigrationDirection::AppOwned,
    auth: AuthRequirement::MilestoneCreatePermission,
    request: shape(
        &["owner", "projectName"],
        &[],
        &[],
        &["milestones", "title", "description", "due_on", "state"],
        &["message"],
    ),
    response: shape(
        &[],
        &[],
        &[],
        &[],
        &[
            "id",
            "title",
            "state",
            "description",
            "due_on",
            "milestone",
            "message",
        ],
    ),
}];
