use super::{EndpointDescriptor, EndpointStatus, LegacySource};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuthRequirement {
    LegacyReadProjection,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MigrationDirection {
    Deferred,
}

impl MigrationDirection {
    pub const fn endpoint_status(self) -> EndpointStatus {
        match self {
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
pub struct WatcherEndpointFixture {
    pub method: &'static str,
    pub path: &'static str,
    pub legacy_controller: &'static str,
    pub legacy_action: &'static str,
    pub direction: MigrationDirection,
    pub auth: AuthRequirement,
    pub request: FixtureShape,
    pub response: FixtureShape,
    pub list_limit: usize,
    pub app_server_owned: bool,
}

pub fn fixtures() -> &'static [WatcherEndpointFixture] {
    WATCHER_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static WatcherEndpointFixture> {
    WATCHER_ENDPOINT_FIXTURES
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
    method: "GET",
    path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
    source: source("controllers.api.WatcherApi", "getWatchers"),
    status: EndpointStatus::MigratorDeferred,
}];

const WATCHER_ENDPOINT_FIXTURES: &[WatcherEndpointFixture] = &[WatcherEndpointFixture {
    method: "GET",
    path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
    legacy_controller: "controllers.api.WatcherApi",
    legacy_action: "getWatchers",
    direction: MigrationDirection::Deferred,
    auth: AuthRequirement::LegacyReadProjection,
    request: shape(
        &["owner", "projectName", "number"],
        &["type"],
        &[],
        &[],
        &[],
    ),
    response: shape(
        &[],
        &[],
        &[],
        &[],
        &["totalWatchers", "watchersInList", "watchers", "name", "url"],
    ),
    list_limit: 100,
    app_server_owned: false,
}];
