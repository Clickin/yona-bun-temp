use super::EndpointStatus;
use serde_json::Value;
use std::collections::BTreeSet;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LegacyUserRef {
    pub id: Option<i64>,
    pub login_id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UserCreateAction {
    Create,
    DuplicateExistingEmail,
    DuplicateEarlierInBatchEmail,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedUserCreate {
    pub source_index: usize,
    pub login_id: String,
    pub name: String,
    pub email: String,
    pub action: UserCreateAction,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserCreateBatch {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub entries: Vec<NormalizedUserCreate>,
}

impl UserCreateBatch {
    pub fn creatable_entries(&self) -> impl Iterator<Item = &NormalizedUserCreate> {
        self.entries
            .iter()
            .filter(|entry| entry.action == UserCreateAction::Create)
    }

    pub fn duplicate_entries(&self) -> impl Iterator<Item = &NormalizedUserCreate> {
        self.entries
            .iter()
            .filter(|entry| entry.action != UserCreateAction::Create)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedTokenRequest {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub id: String,
    pub password: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedTokenResponse {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub access_token: Option<String>,
    pub message: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserIssueQuery {
    pub filter: String,
    pub page: usize,
    pub page_num: usize,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedUserIssue {
    pub id: Option<i64>,
    pub number: Option<i64>,
    pub state: Option<String>,
    pub title: Option<String>,
    pub created_date: Option<String>,
    pub updated_date: Option<String>,
    pub author: LegacyUserRef,
    pub assignee: LegacyUserRef,
    pub project_id: Option<i64>,
    pub project_name: Option<String>,
    pub owner: Option<String>,
    pub ref_url: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserIssueExport {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub query: UserIssueQuery,
    pub issues: Vec<NormalizedUserIssue>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserStatistics {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub login_id: String,
    pub issue: i64,
    pub posting: i64,
    pub assigned_issue: i64,
    pub issue_comment: i64,
    pub posting_comment: i64,
    pub issue_voter: i64,
    pub issue_comment_voter: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DefaultLoginPageResponse {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub requested_path: Option<String>,
    pub default_login_page: Option<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LegacyUserState {
    Active,
    Locked,
    Deleted,
    Guest,
    SiteAdmin,
}

impl LegacyUserState {
    pub const fn as_legacy_str(self) -> &'static str {
        match self {
            Self::Active => "ACTIVE",
            Self::Locked => "LOCKED",
            Self::Deleted => "DELETED",
            Self::Guest => "GUEST",
            Self::SiteAdmin => "SITE_ADMIN",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedAdminUser {
    pub id: Option<i64>,
    pub login_id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub state: Option<LegacyUserState>,
    pub is_guest: Option<bool>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminUserList {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub users: Vec<NormalizedAdminUser>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminUserStateRequest {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub login_id: String,
    pub state: LegacyUserState,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminUserStateResponse {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub id: Option<i64>,
    pub login_id: Option<String>,
    pub state: Option<LegacyUserState>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum UserAdapterError {
    InvalidJson(String),
    InvalidPath {
        path: String,
        expected: &'static str,
    },
    MissingUsersArray,
    InvalidUserItem {
        index: usize,
    },
    MissingUserField {
        index: usize,
        field: &'static str,
    },
    MissingTokenField(&'static str),
    MissingState,
    InvalidState(String),
    InvalidIssuesPayload,
    InvalidAdminUsersPayload,
}

impl std::fmt::Display for UserAdapterError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidJson(error) => write!(formatter, "invalid user legacy JSON: {error}"),
            Self::InvalidPath { path, expected } => {
                write!(
                    formatter,
                    "invalid user legacy path `{path}`; expected {expected}"
                )
            }
            Self::MissingUsersArray => {
                write!(formatter, "No users key exists or value must be array!")
            }
            Self::InvalidUserItem { index } => {
                write!(
                    formatter,
                    "user item at index {index} must be a JSON object"
                )
            }
            Self::MissingUserField { index, field } => {
                write!(formatter, "user item at index {index} is missing `{field}`")
            }
            Self::MissingTokenField(field) => {
                write!(formatter, "token request is missing `{field}`")
            }
            Self::MissingState => write!(formatter, "admin user state request is missing `state`"),
            Self::InvalidState(state) => write!(formatter, "invalid admin user state `{state}`"),
            Self::InvalidIssuesPayload => {
                write!(
                    formatter,
                    "user issue export payload must contain a result array"
                )
            }
            Self::InvalidAdminUsersPayload => {
                write!(formatter, "admin user list payload must be an array")
            }
        }
    }
}

impl std::error::Error for UserAdapterError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuthRequirement {
    AnonymousJsonMentionLookup,
    SiteManagerSession,
    CredentialJson,
    AuthorizationTokenHeader,
    LoginSession,
    CurrentUserSession,
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
pub struct UserEndpointFixture {
    pub method: &'static str,
    pub path: &'static str,
    pub legacy_controller: &'static str,
    pub legacy_action: &'static str,
    pub direction: MigrationDirection,
    pub auth: AuthRequirement,
    pub request: FixtureShape,
    pub response: FixtureShape,
    pub payload: UserPayloadFixture,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct UserPayloadFixture {
    pub sample_path: &'static str,
    pub request_json: Option<&'static str>,
    pub success_status: u16,
    pub success_json: &'static str,
    pub alternate_status: Option<u16>,
    pub alternate_json: Option<&'static str>,
}

pub fn fixtures() -> &'static [UserEndpointFixture] {
    USER_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static UserEndpointFixture> {
    USER_ENDPOINT_FIXTURES
        .iter()
        .find(|fixture| fixture.method == method && fixture.path == path)
}

pub fn parse_user_create_request(
    sample_path: &str,
    request_json: &str,
    existing_emails: &[&str],
) -> Result<UserCreateBatch, UserAdapterError> {
    expect_exact_path(sample_path, "/-_-api/v1/users")?;
    let payload = parse_json(request_json)?;
    let users = find_value(&payload, "users")
        .and_then(Value::as_array)
        .ok_or(UserAdapterError::MissingUsersArray)?;
    let mut seen_emails: BTreeSet<String> = existing_emails
        .iter()
        .map(|email| (*email).to_string())
        .collect();
    let existing_email_set = seen_emails.clone();
    let mut entries = Vec::with_capacity(users.len());

    for (source_index, user) in users.iter().enumerate() {
        if !user.is_object() {
            return Err(UserAdapterError::InvalidUserItem {
                index: source_index,
            });
        }
        let login_id = required_text(user, "loginId", source_index)?;
        let name = required_text(user, "name", source_index)?;
        let email = required_text(user, "email", source_index)?;
        let action = if existing_email_set.contains(&email) {
            UserCreateAction::DuplicateExistingEmail
        } else if seen_emails.contains(&email) {
            UserCreateAction::DuplicateEarlierInBatchEmail
        } else {
            UserCreateAction::Create
        };

        seen_emails.insert(email.clone());
        entries.push(NormalizedUserCreate {
            source_index,
            login_id,
            name,
            email,
            action,
        });
    }

    Ok(UserCreateBatch {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/users",
        entries,
    })
}

pub fn parse_user_token_request(
    sample_path: &str,
    request_json: &str,
) -> Result<NormalizedTokenRequest, UserAdapterError> {
    expect_exact_path(sample_path, "/-_-api/v1/users/token")?;
    let payload = parse_json(request_json)?;
    let id = text_field(&payload, "id").ok_or(UserAdapterError::MissingTokenField("id"))?;
    let password =
        text_field(&payload, "password").ok_or(UserAdapterError::MissingTokenField("password"))?;

    Ok(NormalizedTokenRequest {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/users/token",
        id,
        password,
    })
}

pub fn parse_user_token_response(
    sample_path: &str,
    response_json: &str,
) -> Result<NormalizedTokenResponse, UserAdapterError> {
    expect_exact_path(sample_path, "/-_-api/v1/users/token")?;
    let payload = parse_json(response_json)?;

    Ok(NormalizedTokenResponse {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/users/token",
        access_token: text_field(&payload, "access_token"),
        message: text_field(&payload, "message"),
    })
}

pub fn parse_user_issue_export_response(
    sample_path: &str,
    response_json: &str,
) -> Result<UserIssueExport, UserAdapterError> {
    let query = parse_user_issue_path(sample_path)?;
    let payload = parse_json(response_json)?;
    let issues = find_value(&payload, "result")
        .and_then(Value::as_array)
        .ok_or(UserAdapterError::InvalidIssuesPayload)?
        .iter()
        .map(normalized_issue)
        .collect();

    Ok(UserIssueExport {
        endpoint_method: "GET",
        endpoint_path: "/-_-api/v1/user/issues",
        query,
        issues,
    })
}

pub fn parse_user_statistics_response(
    sample_path: &str,
    response_json: &str,
) -> Result<UserStatistics, UserAdapterError> {
    let login_id = parse_user_statistics_path(sample_path)?;
    let payload = parse_json(response_json)?;

    Ok(UserStatistics {
        endpoint_method: "GET",
        endpoint_path: "/-_-api/v1/users/:user/statistics",
        login_id,
        issue: integer_field(find_value(&payload, "issue")).unwrap_or_default(),
        posting: integer_field(find_value(&payload, "posting")).unwrap_or_default(),
        assigned_issue: integer_field(find_value(&payload, "assignedIssue")).unwrap_or_default(),
        issue_comment: integer_field(find_value(&payload, "issueComment")).unwrap_or_default(),
        posting_comment: integer_field(find_value(&payload, "postingComment")).unwrap_or_default(),
        issue_voter: integer_field(find_value(&payload, "issueVoter")).unwrap_or_default(),
        issue_comment_voter: integer_field(find_value(&payload, "issueCommentVoter"))
            .unwrap_or_default(),
    })
}

pub fn parse_default_login_page_response(
    sample_path: &str,
    response_json: &str,
) -> Result<DefaultLoginPageResponse, UserAdapterError> {
    let requested_path = parse_default_login_path(sample_path)?;
    let payload = parse_json(response_json)?;

    Ok(DefaultLoginPageResponse {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/user/defultLoginPage",
        requested_path,
        default_login_page: text_field(&payload, "defaultLoginPage"),
    })
}

pub fn parse_admin_user_list_response(
    sample_path: &str,
    response_json: &str,
) -> Result<AdminUserList, UserAdapterError> {
    expect_exact_path(sample_path, "/-_-api/v1/admin/users")?;
    let payload = parse_json(response_json)?;
    let users = payload
        .as_array()
        .ok_or(UserAdapterError::InvalidAdminUsersPayload)?
        .iter()
        .map(|user| NormalizedAdminUser {
            id: integer_field(find_value(user, "id")),
            login_id: text_field(user, "login_id"),
            name: text_field(user, "name"),
            email: text_field(user, "email"),
            state: text_field(user, "state").and_then(|state| parse_state(&state)),
            is_guest: find_value(user, "is_guest").and_then(bool_field),
        })
        .collect();

    Ok(AdminUserList {
        endpoint_method: "GET",
        endpoint_path: "/-_-api/v1/admin/users",
        users,
    })
}

pub fn parse_admin_user_state_request(
    sample_path: &str,
    request_json: &str,
) -> Result<AdminUserStateRequest, UserAdapterError> {
    let login_id = parse_admin_user_state_path(sample_path)?;
    let payload = parse_json(request_json)?;
    let state_text = text_field(&payload, "state").ok_or(UserAdapterError::MissingState)?;
    let state =
        parse_state(&state_text).ok_or_else(|| UserAdapterError::InvalidState(state_text))?;

    Ok(AdminUserStateRequest {
        endpoint_method: "PATCH",
        endpoint_path: "/-_-api/v1/admin/users/:user",
        login_id,
        state,
    })
}

pub fn parse_admin_user_state_response(
    sample_path: &str,
    response_json: &str,
) -> Result<AdminUserStateResponse, UserAdapterError> {
    parse_admin_user_state_path(sample_path)?;
    let payload = parse_json(response_json)?;

    Ok(AdminUserStateResponse {
        endpoint_method: "PATCH",
        endpoint_path: "/-_-api/v1/admin/users/:user",
        id: integer_field(find_value(&payload, "id")),
        login_id: text_field(&payload, "login_id"),
        state: text_field(&payload, "state").and_then(|state| parse_state(&state)),
    })
}

fn parse_json(input: &str) -> Result<Value, UserAdapterError> {
    serde_json::from_str(input).map_err(|error| UserAdapterError::InvalidJson(error.to_string()))
}

fn expect_exact_path(path: &str, expected: &'static str) -> Result<(), UserAdapterError> {
    let path_only = path.split('?').next().unwrap_or(path);
    if path_only == expected {
        Ok(())
    } else {
        Err(UserAdapterError::InvalidPath {
            path: path.to_string(),
            expected,
        })
    }
}

fn parse_user_issue_path(path: &str) -> Result<UserIssueQuery, UserAdapterError> {
    expect_exact_path(path, "/-_-api/v1/user/issues")?;
    Ok(UserIssueQuery {
        filter: query_param(path, "filter").unwrap_or_else(|| "assigned".to_string()),
        page: query_param(path, "page")
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or(1),
        page_num: query_param(path, "pageNum")
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or(10),
    })
}

fn parse_user_statistics_path(path: &str) -> Result<String, UserAdapterError> {
    let path_only = path.split('?').next().unwrap_or(path);
    let segments: Vec<&str> = path_only
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect();
    if segments.len() == 5
        && segments[0] == "-_-api"
        && segments[1] == "v1"
        && segments[2] == "users"
        && segments[4] == "statistics"
    {
        Ok(segments[3].to_string())
    } else {
        Err(UserAdapterError::InvalidPath {
            path: path.to_string(),
            expected: "/-_-api/v1/users/:user/statistics",
        })
    }
}

fn parse_default_login_path(path: &str) -> Result<Option<String>, UserAdapterError> {
    expect_exact_path(path, "/-_-api/v1/user/defultLoginPage")?;
    Ok(query_param(path, "path"))
}

fn parse_admin_user_state_path(path: &str) -> Result<String, UserAdapterError> {
    let path_only = path.split('?').next().unwrap_or(path);
    let segments: Vec<&str> = path_only
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect();
    if segments.len() == 5
        && segments[0] == "-_-api"
        && segments[1] == "v1"
        && segments[2] == "admin"
        && segments[3] == "users"
    {
        Ok(segments[4].to_string())
    } else {
        Err(UserAdapterError::InvalidPath {
            path: path.to_string(),
            expected: "/-_-api/v1/admin/users/:user",
        })
    }
}

fn query_param(path: &str, key: &str) -> Option<String> {
    let query = path.split_once('?')?.1;
    query.split('&').find_map(|pair| {
        let (name, value) = pair.split_once('=').unwrap_or((pair, ""));
        (name == key).then(|| value.to_string())
    })
}

fn normalized_issue(issue: &Value) -> NormalizedUserIssue {
    let project = find_value(issue, "project");
    NormalizedUserIssue {
        id: integer_field(find_value(issue, "id")),
        number: integer_field(find_value(issue, "number")),
        state: text_field(issue, "state"),
        title: text_field(issue, "title"),
        created_date: text_field(issue, "createdDate"),
        updated_date: text_field(issue, "updatedDate"),
        author: user_ref(find_value(issue, "author")),
        assignee: user_ref(find_value(issue, "assignee")),
        project_id: project.and_then(|project| integer_field(find_value(project, "id"))),
        project_name: project.and_then(|project| text_field(project, "name")),
        owner: text_field(issue, "owner"),
        ref_url: text_field(issue, "refUrl"),
    }
}

fn user_ref(value: Option<&Value>) -> LegacyUserRef {
    match value {
        Some(value) => LegacyUserRef {
            id: integer_field(find_value(value, "id")),
            login_id: text_field(value, "loginId").or_else(|| text_field(value, "login_id")),
            name: text_field(value, "name"),
            email: text_field(value, "email"),
        },
        None => LegacyUserRef {
            id: None,
            login_id: None,
            name: None,
            email: None,
        },
    }
}

fn required_text(
    value: &Value,
    field: &'static str,
    index: usize,
) -> Result<String, UserAdapterError> {
    text_field(value, field).ok_or(UserAdapterError::MissingUserField { index, field })
}

fn text_field(value: &Value, key: &str) -> Option<String> {
    find_value(value, key).and_then(|value| match value {
        Value::Null => None,
        Value::String(text) => Some(text.clone()),
        Value::Bool(flag) => Some(flag.to_string()),
        Value::Number(number) => Some(number.to_string()),
        other => Some(other.to_string()),
    })
}

fn integer_field(value: Option<&Value>) -> Option<i64> {
    match value? {
        Value::Number(number) => number.as_i64(),
        Value::String(text) => text.parse::<i64>().ok(),
        Value::Bool(flag) => Some(i64::from(*flag)),
        _ => None,
    }
}

fn bool_field(value: &Value) -> Option<bool> {
    match value {
        Value::Bool(flag) => Some(*flag),
        Value::String(text) if text.eq_ignore_ascii_case("true") => Some(true),
        Value::String(text) if text.eq_ignore_ascii_case("false") => Some(false),
        Value::Number(number) => number.as_i64().map(|value| value != 0),
        _ => None,
    }
}

fn parse_state(value: &str) -> Option<LegacyUserState> {
    match value.to_ascii_uppercase().as_str() {
        "ACTIVE" => Some(LegacyUserState::Active),
        "LOCKED" => Some(LegacyUserState::Locked),
        "DELETED" => Some(LegacyUserState::Deleted),
        "GUEST" => Some(LegacyUserState::Guest),
        "SITE_ADMIN" => Some(LegacyUserState::SiteAdmin),
        _ => None,
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

const USER_ENDPOINT_FIXTURES: &[UserEndpointFixture] = &[
    UserEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/users",
        legacy_controller: "controllers.UserApp",
        legacy_action: "users",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AnonymousJsonMentionLookup,
        request: shape(
            &[],
            &["query"],
            &["Accept", "referer"],
            &[],
            &["info", "loginId"],
        ),
        response: shape(&[], &[], &["Content-Range"], &[], &["info", "loginId"]),
        payload: USER_MENTION_LOOKUP_PAYLOAD,
    },
    UserEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/users",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "newUser",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::SiteManagerSession,
        request: shape(&[], &[], &[], &["users", "loginId", "name", "email"], &[]),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "status", "reason", "message", "user", "id", "loginId", "name", "email",
            ],
        ),
        payload: USER_CREATE_PAYLOAD,
    },
    UserEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/users/token",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "newToken",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::CredentialJson,
        request: shape(&[], &[], &[], &["id", "password"], &[]),
        response: shape(&[], &[], &[], &[], &["access_token", "message"]),
        payload: USER_TOKEN_PAYLOAD,
    },
    UserEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/user/issues",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "getIssuesByUser",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::AuthorizationTokenHeader,
        request: shape(
            &[],
            &["filter", "page", "pageNum"],
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
                "state",
                "title",
                "createdDate",
                "updatedDate",
                "author",
                "loginId",
                "name",
                "assignee",
                "project",
                "owner",
                "refUrl",
            ],
        ),
        payload: USER_ISSUES_PAYLOAD,
    },
    UserEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/users/:user/statistics",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "statistics",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::LoginSession,
        request: shape(&["user"], &[], &[], &[], &[]),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &[
                "issue",
                "posting",
                "assignedIssue",
                "issueComment",
                "postingComment",
                "issueVoter",
                "issueCommentVoter",
            ],
        ),
        payload: USER_STATISTICS_PAYLOAD,
    },
    UserEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/user/defultLoginPage",
        legacy_controller: "controllers.UserApp",
        legacy_action: "setDefaultLoginPage",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::CurrentUserSession,
        request: shape(&[], &["path"], &[], &[], &[]),
        response: shape(&[], &[], &[], &[], &["defaultLoginPage"]),
        payload: USER_DEFAULT_LOGIN_PAGE_PAYLOAD,
    },
    UserEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/admin/users",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "users",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::SiteManagerSession,
        request: shape(&[], &[], &[], &[], &[]),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &["id", "login_id", "name", "email", "state", "is_guest"],
        ),
        payload: ADMIN_USERS_PAYLOAD,
    },
    UserEndpointFixture {
        method: "PATCH",
        path: "/-_-api/v1/admin/users/:user",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "updateUserState",
        direction: MigrationDirection::AppOwned,
        auth: AuthRequirement::SiteManagerSession,
        request: shape(&["user"], &[], &[], &["state"], &["Empty json body"]),
        response: shape(&[], &[], &[], &[], &["id", "login_id", "state"]),
        payload: ADMIN_USER_STATE_PAYLOAD,
    },
];

const USER_MENTION_LOOKUP_PAYLOAD: UserPayloadFixture = UserPayloadFixture {
    sample_path: "/-_-api/v1/users?query=ali",
    request_json: None,
    success_status: 200,
    success_json: r##"[
  {
    "info": "<img class='mention_image' src='/assets/images/default-avatar-128.png'><b class='mention_name'>Alice Owner</b><span class='mention_username'> @alice</span>",
    "loginId": "alice"
  }
]"##,
    alternate_status: None,
    alternate_json: None,
};

const USER_CREATE_PAYLOAD: UserPayloadFixture = UserPayloadFixture {
    sample_path: "/-_-api/v1/users",
    request_json: Some(
        r##"{
  "migration": {
    "users": [
      {
        "profile": {
          "loginId": "alice",
          "name": "Alice Owner",
          "email": "alice@example.com"
        }
      },
      {
        "profile": {
          "loginId": "existing",
          "name": "Existing User",
          "email": "existing@example.com"
        }
      }
    ]
  }
}"##,
    ),
    success_status: 201,
    success_json: r##"[
  {
    "status": 201,
    "reason": "Created",
    "user": {
      "id": 1,
      "loginId": "alice",
      "name": "Alice Owner",
      "email": "alice@example.com"
    }
  },
  {
    "status": 409,
    "reason": "Conflict",
    "message": "Already exists!",
    "user": {
      "loginId": "existing",
      "name": "Existing User",
      "email": "existing@example.com"
    }
  }
]"##,
    alternate_status: Some(400),
    alternate_json: Some(
        r##"{
  "message": "No users key exists or value must be array!"
}"##,
    ),
};

const USER_TOKEN_PAYLOAD: UserPayloadFixture = UserPayloadFixture {
    sample_path: "/-_-api/v1/users/token",
    request_json: Some(
        r##"{
  "credentials": {
    "id": "alice",
    "password": "correct horse battery staple"
  }
}"##,
    ),
    success_status: 200,
    success_json: r##"{
  "access_token": "token-alice-20260621"
}"##,
    alternate_status: Some(401),
    alternate_json: Some(
        r##"{
  "message": "No user by id and password"
}"##,
    ),
};

const USER_ISSUES_PAYLOAD: UserPayloadFixture = UserPayloadFixture {
    sample_path: "/-_-api/v1/user/issues?filter=assigned&page=1&pageNum=10",
    request_json: None,
    success_status: 200,
    success_json: r##"{
  "result": [
    {
      "id": 30,
      "number": 3,
      "state": "CLOSED",
      "title": "Legacy issue",
      "createdDate": "2026-06-01T00:00:00Z",
      "updatedDate": "2026-06-02T00:00:00Z",
      "author": {
        "id": 1,
        "loginId": "author",
        "name": "Author User"
      },
      "assignee": {
        "id": 2,
        "loginId": "alice",
        "name": "Alice Owner"
      },
      "project": {
        "id": 10,
        "name": "demo"
      },
      "owner": "alice",
      "refUrl": "https://yona.example.com/alice/demo/issue/3"
    }
  ]
}"##,
    alternate_status: Some(401),
    alternate_json: Some(
        r##"{
  "message": "unauthorized request"
}"##,
    ),
};

const USER_STATISTICS_PAYLOAD: UserPayloadFixture = UserPayloadFixture {
    sample_path: "/-_-api/v1/users/alice/statistics",
    request_json: None,
    success_status: 200,
    success_json: r##"{
  "issue": 3,
  "posting": 2,
  "assignedIssue": 1,
  "issueComment": 5,
  "postingComment": 4,
  "issueVoter": 6,
  "issueCommentVoter": 7
}"##,
    alternate_status: None,
    alternate_json: None,
};

const USER_DEFAULT_LOGIN_PAGE_PAYLOAD: UserPayloadFixture = UserPayloadFixture {
    sample_path: "/-_-api/v1/user/defultLoginPage?path=/alice/demo",
    request_json: None,
    success_status: 200,
    success_json: r##"{
  "defaultLoginPage": "/alice/demo"
}"##,
    alternate_status: None,
    alternate_json: None,
};

const ADMIN_USERS_PAYLOAD: UserPayloadFixture = UserPayloadFixture {
    sample_path: "/-_-api/v1/admin/users",
    request_json: None,
    success_status: 200,
    success_json: r##"[
  {
    "id": 1,
    "login_id": "alice",
    "name": "Alice Owner",
    "email": "alice@example.com",
    "state": "ACTIVE",
    "is_guest": false
  },
  {
    "id": 2,
    "login_id": "guest-1",
    "name": "Guest User",
    "email": "guest@example.com",
    "state": "ACTIVE",
    "is_guest": true
  }
]"##,
    alternate_status: None,
    alternate_json: None,
};

const ADMIN_USER_STATE_PAYLOAD: UserPayloadFixture = UserPayloadFixture {
    sample_path: "/-_-api/v1/admin/users/alice",
    request_json: Some(
        r##"{
  "admin": {
    "state": "locked"
  }
}"##,
    ),
    success_status: 200,
    success_json: r##"{
  "id": 1,
  "login_id": "alice",
  "state": "LOCKED"
}"##,
    alternate_status: None,
    alternate_json: None,
};
