use super::EndpointStatus;

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
