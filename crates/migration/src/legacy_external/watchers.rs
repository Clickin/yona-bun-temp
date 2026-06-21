use super::{EndpointDescriptor, EndpointStatus, LegacySource};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuthRequirement {
    LegacyReadProjection,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MigrationDirection {
    AppOwned,
}

impl MigrationDirection {
    pub const fn endpoint_status(self) -> EndpointStatus {
        match self {
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
    pub accepted_type_values: &'static [&'static str],
    pub empty_ok_type_values: &'static [&'static str],
    pub empty_ok_status: u16,
    pub empty_ok_body: Option<&'static str>,
    pub payloads: &'static [WatcherPayloadFixture],
    pub app_server_owned: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum WatcherResourceType {
    Issues,
    Posts,
}

impl WatcherResourceType {
    pub const fn query_value(self) -> &'static str {
        match self {
            Self::Issues => "issues",
            Self::Posts => "posts",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct WatcherPayloadFixture {
    pub resource_type: WatcherResourceType,
    pub sample_path: &'static str,
    pub success_status: u16,
    pub success_json: &'static str,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct FavoriteHelperBoundary {
    pub method: &'static str,
    pub path: &'static str,
    pub legacy_controller: &'static str,
    pub legacy_action: &'static str,
    pub status: EndpointStatus,
    pub app_server_owned: bool,
    pub watcher_api_owned: bool,
}

pub fn fixtures() -> &'static [WatcherEndpointFixture] {
    WATCHER_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static WatcherEndpointFixture> {
    WATCHER_ENDPOINT_FIXTURES
        .iter()
        .find(|fixture| fixture.method == method && fixture.path == path)
}

pub fn favorite_helper_boundaries() -> &'static [FavoriteHelperBoundary] {
    FAVORITE_HELPER_BOUNDARIES
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
    status: EndpointStatus::AppOwned,
}];

const ACCEPTED_WATCHER_TYPES: &[&str] = &["issues", "posts"];
const EMPTY_OK_WATCHER_TYPES: &[&str] = &["", "issue", "pullRequests", "ISSUES"];

const WATCHER_ENDPOINT_FIXTURES: &[WatcherEndpointFixture] = &[WatcherEndpointFixture {
    method: "GET",
    path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
    legacy_controller: "controllers.api.WatcherApi",
    legacy_action: "getWatchers",
    direction: MigrationDirection::AppOwned,
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
    accepted_type_values: ACCEPTED_WATCHER_TYPES,
    empty_ok_type_values: EMPTY_OK_WATCHER_TYPES,
    empty_ok_status: 200,
    empty_ok_body: None,
    payloads: WATCHER_PAYLOAD_FIXTURES,
    app_server_owned: true,
}];

const WATCHER_PAYLOAD_FIXTURES: &[WatcherPayloadFixture] = &[
    WatcherPayloadFixture {
        resource_type: WatcherResourceType::Issues,
        sample_path: "/-_-api/v1/owners/alice/projects/demo/posts/3/watchers?type=issues",
        success_status: 200,
        success_json: r##"{
  "totalWatchers": 2,
  "watchersInList": 2,
  "watchers": [
    {
      "name": "Alice Owner",
      "url": "/alice"
    },
    {
      "name": "Issue Watcher",
      "url": "/issue-watcher"
    }
  ]
}"##,
    },
    WatcherPayloadFixture {
        resource_type: WatcherResourceType::Posts,
        sample_path: "/-_-api/v1/owners/alice/projects/demo/posts/4/watchers?type=posts",
        success_status: 200,
        success_json: r##"{
  "totalWatchers": 1,
  "watchersInList": 1,
  "watchers": [
    {
      "name": "Board Watcher",
      "url": "/board-watcher"
    }
  ]
}"##,
    },
];

const FAVORITE_HELPER_BOUNDARIES: &[FavoriteHelperBoundary] = &[
    FavoriteHelperBoundary {
        method: "GET",
        path: "/-_-api/v1/favoriteProjects",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "getFoveriteProjects",
        status: EndpointStatus::AppOwned,
        app_server_owned: true,
        watcher_api_owned: false,
    },
    FavoriteHelperBoundary {
        method: "POST",
        path: "/-_-api/v1/favoriteProjects/:projectId",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "toggleFoveriteProject",
        status: EndpointStatus::AppOwned,
        app_server_owned: true,
        watcher_api_owned: false,
    },
    FavoriteHelperBoundary {
        method: "GET",
        path: "/-_-api/v1/favoriteOrganizations",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "getFoveriteOrganizations",
        status: EndpointStatus::AppOwned,
        app_server_owned: true,
        watcher_api_owned: false,
    },
    FavoriteHelperBoundary {
        method: "POST",
        path: "/-_-api/v1/favoriteOrganizations/:organizationId",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "toggleFoveriteOrganization",
        status: EndpointStatus::AppOwned,
        app_server_owned: true,
        watcher_api_owned: false,
    },
    FavoriteHelperBoundary {
        method: "GET",
        path: "/-_-api/v1/favoriteIssues",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "getFoveriteIssues",
        status: EndpointStatus::AppOwned,
        app_server_owned: true,
        watcher_api_owned: false,
    },
    FavoriteHelperBoundary {
        method: "POST",
        path: "/-_-api/v1/favoriteIssues/:issueId",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "toggleFoveriteIssue",
        status: EndpointStatus::AppOwned,
        app_server_owned: true,
        watcher_api_owned: false,
    },
];
