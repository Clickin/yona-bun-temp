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
    pub auth: AuthRequirement,
    pub request: FixtureShape,
    pub response: FixtureShape,
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
        auth: AuthRequirement::AnonymousJsonMentionLookup,
        request: shape(
            &[],
            &["query"],
            &["Accept", "referer"],
            &[],
            &["info", "loginId"],
        ),
        response: shape(&[], &[], &["Content-Range"], &[], &["info", "loginId"]),
    },
    UserEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/users",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "newUser",
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
    },
    UserEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/users/token",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "newToken",
        auth: AuthRequirement::CredentialJson,
        request: shape(&[], &[], &[], &["id", "password"], &[]),
        response: shape(&[], &[], &[], &[], &["access_token", "message"]),
    },
    UserEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/user/issues",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "getIssuesByUser",
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
    },
    UserEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/users/:user/statistics",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "statistics",
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
    },
    UserEndpointFixture {
        method: "POST",
        path: "/-_-api/v1/user/defultLoginPage",
        legacy_controller: "controllers.UserApp",
        legacy_action: "setDefaultLoginPage",
        auth: AuthRequirement::CurrentUserSession,
        request: shape(&[], &["path"], &[], &[], &[]),
        response: shape(&[], &[], &[], &[], &["defaultLoginPage"]),
    },
    UserEndpointFixture {
        method: "GET",
        path: "/-_-api/v1/admin/users",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "users",
        auth: AuthRequirement::SiteManagerSession,
        request: shape(&[], &[], &[], &[], &[]),
        response: shape(
            &[],
            &[],
            &[],
            &[],
            &["id", "login_id", "name", "email", "state", "is_guest"],
        ),
    },
    UserEndpointFixture {
        method: "PATCH",
        path: "/-_-api/v1/admin/users/:user",
        legacy_controller: "controllers.api.UserApi",
        legacy_action: "updateUserState",
        auth: AuthRequirement::SiteManagerSession,
        request: shape(&["user"], &[], &[], &["state"], &["Empty json body"]),
        response: shape(&[], &[], &[], &[], &["id", "login_id", "state"]),
    },
];
