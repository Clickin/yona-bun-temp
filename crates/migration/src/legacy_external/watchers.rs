use super::{EndpointDescriptor, EndpointStatus, LegacySource};
use serde_json::Value;

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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedWatcherRequest {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub number: i64,
    pub expectation: WatcherRequestExpectation,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum WatcherRequestExpectation {
    JsonProjection(WatcherResourceType),
    EmptyOk { type_value: Option<String> },
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedWatcherResponse {
    pub total_watchers: i64,
    pub watchers_in_list: i64,
    pub watchers: Vec<NormalizedWatcher>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedWatcher {
    pub name: String,
    pub url: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FavoriteProjectListResponse {
    pub project_ids: Vec<i64>,
    pub projects: Vec<FavoriteProjectRef>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FavoriteProjectRef {
    pub project_id: Option<i64>,
    pub project_name: Option<String>,
    pub owner: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FavoriteOrganizationListResponse {
    pub organization_ids: Vec<i64>,
    pub organizations: Vec<FavoriteOrganizationRef>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FavoriteOrganizationRef {
    pub organization_id: Option<i64>,
    pub organization_name: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FavoriteIssueListResponse {
    pub issue_ids: Vec<i64>,
    pub issues: Vec<FavoriteIssueRef>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FavoriteIssueRef {
    pub issue_id: Option<i64>,
    pub issue_title: Option<String>,
    pub issue_author_name: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FavoriteToggleResponse {
    pub resource_id_field: &'static str,
    pub resource_id: String,
    pub favored: bool,
    pub message: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum WatcherAdapterError {
    InvalidJson(String),
    InvalidPath(String),
    InvalidNumber(String),
    MissingField(&'static str),
    InvalidInteger { field: &'static str, value: String },
    InvalidBoolean { field: &'static str, value: String },
    InvalidWatchersArray,
    InvalidWatcherItem { index: usize },
    InvalidIdArray(&'static str),
    InvalidFavoriteArray(&'static str),
}

impl std::fmt::Display for WatcherAdapterError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidJson(error) => {
                write!(formatter, "invalid watcher/favorite legacy JSON: {error}")
            }
            Self::InvalidPath(path) => write!(formatter, "invalid watcher legacy path `{path}`"),
            Self::InvalidNumber(number) => {
                write!(formatter, "invalid watcher resource number `{number}`")
            }
            Self::MissingField(field) => write!(
                formatter,
                "missing required watcher/favorite field `{field}`"
            ),
            Self::InvalidInteger { field, value } => {
                write!(
                    formatter,
                    "invalid integer-compatible `{field}` value `{value}`"
                )
            }
            Self::InvalidBoolean { field, value } => {
                write!(
                    formatter,
                    "invalid boolean-compatible `{field}` value `{value}`"
                )
            }
            Self::InvalidWatchersArray => {
                write!(formatter, "watchers response `watchers` must be an array")
            }
            Self::InvalidWatcherItem { index } => {
                write!(
                    formatter,
                    "watcher response item at index {index} must be a JSON object"
                )
            }
            Self::InvalidIdArray(field) => {
                write!(formatter, "favorite response `{field}` must be an array")
            }
            Self::InvalidFavoriteArray(field) => {
                write!(formatter, "favorite response `{field}` must be an array")
            }
        }
    }
}

impl std::error::Error for WatcherAdapterError {}

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

pub fn parse_watcher_request(path: &str) -> Result<NormalizedWatcherRequest, WatcherAdapterError> {
    let (path_only, type_value) = split_type_query(path);
    let parts: Vec<&str> = path_only
        .split('/')
        .filter(|part| !part.is_empty())
        .collect();
    let (owner, project_name, number) = match parts.as_slice() {
        ["-_-api", "v1", "owners", owner, "projects", project_name, "posts", number, "watchers"] => {
            if number.is_empty() || !number.bytes().all(|byte| byte.is_ascii_digit()) {
                return Err(WatcherAdapterError::InvalidNumber((*number).to_string()));
            }
            let number = number
                .parse::<i64>()
                .map_err(|_| WatcherAdapterError::InvalidNumber((*number).to_string()))?;
            ((*owner).to_string(), (*project_name).to_string(), number)
        }
        _ => return Err(WatcherAdapterError::InvalidPath(path.to_string())),
    };

    let expectation = match type_value.as_deref() {
        Some("issues") => WatcherRequestExpectation::JsonProjection(WatcherResourceType::Issues),
        Some("posts") => WatcherRequestExpectation::JsonProjection(WatcherResourceType::Posts),
        other => WatcherRequestExpectation::EmptyOk {
            type_value: other.map(str::to_string),
        },
    };

    Ok(NormalizedWatcherRequest {
        endpoint_method: "GET",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
        owner,
        project_name,
        number,
        expectation,
    })
}

pub fn parse_watcher_response(
    response_json: &str,
) -> Result<NormalizedWatcherResponse, WatcherAdapterError> {
    let payload = parse_json(response_json)?;
    let total_watchers = required_integer(&payload, "totalWatchers")?;
    let watchers_in_list = required_integer(&payload, "watchersInList")?;
    let watchers = find_value(&payload, "watchers")
        .and_then(Value::as_array)
        .ok_or(WatcherAdapterError::InvalidWatchersArray)?;

    let mut entries = Vec::with_capacity(watchers.len());
    for (index, watcher) in watchers.iter().enumerate() {
        if !watcher.is_object() {
            return Err(WatcherAdapterError::InvalidWatcherItem { index });
        }
        entries.push(NormalizedWatcher {
            name: text_field(watcher, "name").ok_or(WatcherAdapterError::MissingField("name"))?,
            url: text_field(watcher, "url").ok_or(WatcherAdapterError::MissingField("url"))?,
        });
    }

    Ok(NormalizedWatcherResponse {
        total_watchers,
        watchers_in_list,
        watchers: entries,
    })
}

pub fn parse_favorite_projects_response(
    response_json: &str,
) -> Result<FavoriteProjectListResponse, WatcherAdapterError> {
    let payload = parse_json(response_json)?;
    let project_ids = integer_array(&payload, "projectIds")?;
    let projects = favorite_array(&payload, "projects")?
        .iter()
        .map(|project| FavoriteProjectRef {
            project_id: integer_field(project, "projectId"),
            project_name: text_field(project, "projectName"),
            owner: text_field(project, "owner"),
        })
        .collect();

    Ok(FavoriteProjectListResponse {
        project_ids,
        projects,
    })
}

pub fn parse_favorite_organizations_response(
    response_json: &str,
) -> Result<FavoriteOrganizationListResponse, WatcherAdapterError> {
    let payload = parse_json(response_json)?;
    let organization_ids = integer_array(&payload, "organizationIds")?;
    let organizations = favorite_array(&payload, "organizations")?
        .iter()
        .map(|organization| FavoriteOrganizationRef {
            organization_id: integer_field(organization, "organizationId"),
            organization_name: text_field(organization, "organizationName"),
        })
        .collect();

    Ok(FavoriteOrganizationListResponse {
        organization_ids,
        organizations,
    })
}

pub fn parse_favorite_issues_response(
    response_json: &str,
) -> Result<FavoriteIssueListResponse, WatcherAdapterError> {
    let payload = parse_json(response_json)?;
    let issue_ids = integer_array(&payload, "projectIds")?;
    let issues = favorite_array(&payload, "projects")?
        .iter()
        .map(|issue| FavoriteIssueRef {
            issue_id: integer_field(issue, "issueId"),
            issue_title: text_field(issue, "issueTitle"),
            issue_author_name: text_field(issue, "issueAuthorName"),
        })
        .collect();

    Ok(FavoriteIssueListResponse { issue_ids, issues })
}

pub fn parse_favorite_toggle_response(
    response_json: &str,
    resource_id_field: &'static str,
) -> Result<FavoriteToggleResponse, WatcherAdapterError> {
    let payload = parse_json(response_json)?;
    let resource_id = text_field(&payload, resource_id_field)
        .ok_or(WatcherAdapterError::MissingField(resource_id_field))?;
    let favored = required_bool(&payload, "favored")?;

    Ok(FavoriteToggleResponse {
        resource_id_field,
        resource_id,
        favored,
        message: text_field(&payload, "message"),
    })
}

fn split_type_query(path: &str) -> (&str, Option<String>) {
    let Some((path_only, query)) = path.split_once('?') else {
        return (path, None);
    };
    let type_value = query.split('&').find_map(|pair| {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        (key == "type").then(|| value.to_string())
    });
    (path_only, type_value)
}

fn parse_json(response_json: &str) -> Result<Value, WatcherAdapterError> {
    serde_json::from_str(response_json)
        .map_err(|error| WatcherAdapterError::InvalidJson(error.to_string()))
}

fn required_integer(value: &Value, field: &'static str) -> Result<i64, WatcherAdapterError> {
    let found = find_value(value, field).ok_or(WatcherAdapterError::MissingField(field))?;
    integer_value(found).ok_or_else(|| WatcherAdapterError::InvalidInteger {
        field,
        value: scalar_text(found),
    })
}

fn integer_field(value: &Value, field: &'static str) -> Option<i64> {
    find_value(value, field).and_then(integer_value)
}

fn integer_array(value: &Value, field: &'static str) -> Result<Vec<i64>, WatcherAdapterError> {
    let values = find_value(value, field)
        .and_then(Value::as_array)
        .ok_or(WatcherAdapterError::InvalidIdArray(field))?;
    values
        .iter()
        .map(|value| {
            integer_value(value).ok_or_else(|| WatcherAdapterError::InvalidInteger {
                field,
                value: scalar_text(value),
            })
        })
        .collect()
}

fn favorite_array<'a>(
    value: &'a Value,
    field: &'static str,
) -> Result<&'a Vec<Value>, WatcherAdapterError> {
    find_value(value, field)
        .and_then(Value::as_array)
        .ok_or(WatcherAdapterError::InvalidFavoriteArray(field))
}

fn required_bool(value: &Value, field: &'static str) -> Result<bool, WatcherAdapterError> {
    let found = find_value(value, field).ok_or(WatcherAdapterError::MissingField(field))?;
    bool_value(found).ok_or_else(|| WatcherAdapterError::InvalidBoolean {
        field,
        value: scalar_text(found),
    })
}

fn integer_value(value: &Value) -> Option<i64> {
    match value {
        Value::Number(number) => number.as_i64(),
        Value::String(text) => text.parse::<i64>().ok(),
        _ => None,
    }
}

fn bool_value(value: &Value) -> Option<bool> {
    match value {
        Value::Bool(flag) => Some(*flag),
        Value::String(text) if text.eq_ignore_ascii_case("true") => Some(true),
        Value::String(text) if text.eq_ignore_ascii_case("false") => Some(false),
        _ => None,
    }
}

fn text_field(value: &Value, key: &'static str) -> Option<String> {
    find_value(value, key).map(scalar_text)
}

fn scalar_text(value: &Value) -> String {
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
