use axum::body::Body;
use http::{Method, Request, Response};
use serde_json::{Map, Value};
use tower::ServiceExt;

pub async fn pilot_rest(
    app: axum::Router,
    method_name: &str,
    cookie_header: Option<&str>,
    csrf: Option<&str>,
    payload: Value,
) -> Response<Body> {
    let (method, path, body) = route_request(method_name, payload);
    let mut builder = Request::builder().method(method).uri(path);
    if let Some(cookie_header) = cookie_header {
        builder = builder.header(http::header::COOKIE, cookie_header);
    }
    if let Some(csrf) = csrf {
        builder = builder.header("x-csrf-token", csrf);
    }

    let body = if let Some(body) = body {
        builder = builder.header(http::header::CONTENT_TYPE, "application/json");
        Body::from(body.to_string())
    } else {
        Body::empty()
    };

    app.oneshot(builder.body(body).unwrap()).await.unwrap()
}

fn route_request(method_name: &str, mut payload: Value) -> (Method, String, Option<Value>) {
    match method_name {
        "ReadCurrentSession" => (Method::GET, api("/session"), None),
        "ReadAuthUiCapabilities" => (Method::GET, api("/auth/capabilities"), None),
        "SignOut" => (Method::POST, api("/auth/sign-out"), None),
        "SignInWithPassword" => {
            ensure_bool(&mut payload, "rememberMe", false);
            (Method::POST, api("/auth/sign-in"), Some(payload.clone()))
        }
        "RegisterWithPassword" => (Method::POST, api("/auth/register"), Some(payload.clone())),
        "VerifyUser" => (Method::POST, api("/auth/verify"), Some(payload.clone())),
        "ReadWorkspaceOverview" => (Method::GET, api("/workspace"), None),
        "SetDefaultLandingPath" => (
            Method::PUT,
            api("/workspace/default-landing-path"),
            Some(payload.clone()),
        ),
        "UpdateProfile" => (
            Method::PATCH,
            api("/workspace/profile"),
            Some(payload.clone()),
        ),
        "ChangePassword" => (
            Method::POST,
            api("/workspace/password"),
            Some(payload.clone()),
        ),
        "ResetVisitedProjects" => (Method::DELETE, api("/workspace/recent-projects"), None),
        "AddWorkspaceEmail" => {
            let body = object_with("email", string_any(&payload, &["email", "emailAddress"]));
            (Method::POST, api("/workspace/emails"), Some(body))
        }
        "DeleteWorkspaceEmail" => (
            Method::DELETE,
            api(&format!(
                "/workspace/emails/{}",
                string(&payload, "emailId")
            )),
            None,
        ),
        "SendWorkspaceEmailValidation" => (
            Method::POST,
            api(&format!(
                "/workspace/emails/{}/validation",
                string(&payload, "emailId")
            )),
            None,
        ),
        "SetMainWorkspaceEmail" => (
            Method::POST,
            api(&format!(
                "/workspace/emails/{}/main",
                string(&payload, "emailId")
            )),
            None,
        ),
        "ResetApiToken" => (Method::POST, api("/workspace/api-token/reset"), None),
        "ToggleWorkspaceNotification" => (
            Method::POST,
            api("/workspace/notifications"),
            Some(payload.clone()),
        ),
        "RecordRecentProjectVisit" => (
            Method::POST,
            api("/workspace/recent-projects"),
            Some(payload.clone()),
        ),
        "ListProjects" => (Method::GET, api("/projects"), None),
        "ListOrganizations" => (Method::GET, api("/organizations"), None),
        "CreateOrganization" => (Method::POST, api("/organizations"), Some(payload.clone())),
        "ReadOrganizationDetail" => (
            Method::GET,
            api(&format!(
                "/organizations/{}",
                string(&payload, "organizationName")
            )),
            None,
        ),
        "ReadOrganizationAdmin" => (
            Method::GET,
            api(&format!(
                "/organizations/{}/admin",
                string(&payload, "organizationName")
            )),
            None,
        ),
        "ReadOrganizationContainer" => (
            Method::GET,
            api(&format!(
                "/organizations/{}/container",
                string(&payload, "organizationName")
            )),
            None,
        ),
        "ReadOrganizationSettings" => (
            Method::GET,
            api(&format!(
                "/organizations/{}/settings",
                string(&payload, "organizationName")
            )),
            None,
        ),
        "ReadOrganizationMembers" => (
            Method::GET,
            api(&format!(
                "/organizations/{}/members",
                string(&payload, "organizationName")
            )),
            None,
        ),
        "UpdateOrganization" => (
            Method::PATCH,
            api(&format!(
                "/organizations/{}",
                string(&payload, "organizationName")
            )),
            Some(payload.clone()),
        ),
        "DeleteOrganization" => (
            Method::DELETE,
            api(&format!(
                "/organizations/{}",
                string(&payload, "organizationName")
            )),
            None,
        ),
        "AddOrganizationMember" => (
            Method::POST,
            api(&format!(
                "/organizations/{}/members",
                string(&payload, "organizationName")
            )),
            Some(object_with("loginId", string(&payload, "loginId"))),
        ),
        "UpdateOrganizationMemberRole" => (
            Method::PATCH,
            api(&format!(
                "/organizations/{}/members/{}",
                string(&payload, "organizationName"),
                int(&payload, "userId")
            )),
            Some(object_with("role", string(&payload, "role"))),
        ),
        "DeleteOrganizationMember" => (
            Method::DELETE,
            api(&format!(
                "/organizations/{}/members/{}",
                string(&payload, "organizationName"),
                int(&payload, "userId")
            )),
            None,
        ),
        "AcceptOrganizationEnrollment" => (
            Method::POST,
            api(&format!(
                "/organizations/{}/enrollments/{}/accept",
                string(&payload, "organizationName"),
                int(&payload, "userId")
            )),
            None,
        ),
        "EnrollOrganization" => (
            Method::POST,
            api(&format!(
                "/organizations/{}/enroll",
                string(&payload, "organizationName")
            )),
            None,
        ),
        "CancelEnrollOrganization" => (
            Method::DELETE,
            api(&format!(
                "/organizations/{}/enroll",
                string(&payload, "organizationName")
            )),
            None,
        ),
        "LeaveOrganization" => (
            Method::POST,
            api(&format!(
                "/organizations/{}/leave",
                string(&payload, "organizationName")
            )),
            None,
        ),
        "CreateProject" => (
            Method::POST,
            api(&format!(
                "/owners/{}/projects",
                string(&payload, "ownerName")
            )),
            Some(payload.clone()),
        ),
        "ReadProjectDetail" => project(Method::GET, "", &payload, None),
        "ReadProjectSettings" => project(Method::GET, "/settings", &payload, None),
        "ReadProjectContainer" => project(Method::GET, "/container", &payload, None),
        "ReadProjectMembers" => project(Method::GET, "/members", &payload, None),
        "UpdateProject" => project(Method::PATCH, "", &payload, Some(payload.clone())),
        "UpdateProjectOverview" => {
            project(Method::PATCH, "/overview", &payload, Some(payload.clone()))
        }
        "EnrollProject" => project(Method::POST, "/enroll", &payload, None),
        "CancelEnrollProject" => project(Method::DELETE, "/enroll", &payload, None),
        "ToggleFavoriteProject" => project(Method::POST, "/favorite", &payload, None),
        "ToggleProjectWatch" => {
            let method = if payload
                .get("watch")
                .and_then(Value::as_bool)
                .unwrap_or(true)
            {
                Method::POST
            } else {
                Method::DELETE
            };
            project(method, "/watch", &payload, None)
        }
        "ListProjectIssues" => (
            Method::GET,
            api(&format!(
                "/projects/{}/{}/issues{}",
                string(&payload, "ownerName"),
                string(&payload, "projectName"),
                query(
                    &payload,
                    &[
                        "state",
                        "pageNum",
                        "assigneeLoginId",
                        "authorLoginId",
                        "labelIds",
                        "milestoneId",
                    ],
                )
            )),
            None,
        ),
        "ListOrganizationIssues" => (
            Method::GET,
            api(&format!(
                "/organizations/{}/issues{}",
                string(&payload, "organizationName"),
                query(
                    &payload,
                    &[
                        "state",
                        "filter",
                        "pageNum",
                        "itemsPerPage",
                        "orderBy",
                        "orderDir",
                        "query",
                        "projectNames",
                        "authorId",
                        "assigneeId",
                    ],
                )
            )),
            None,
        ),
        "ListUserIssues" => (
            Method::GET,
            api(&format!(
                "/user/issues{}",
                query(
                    &payload,
                    &["filter", "state", "query", "pageNum", "pageSize", "orderBy", "orderDir"],
                )
            )),
            None,
        ),
        "CreateIssue" => (
            Method::POST,
            api(&format!(
                "/projects/{}/{}/issues",
                string(&payload, "ownerName"),
                string(&payload, "projectName")
            )),
            Some(payload.clone()),
        ),
        "ReadIssueDetail" => issue(Method::GET, "", &payload, None),
        "UpdateIssue" => issue(Method::PUT, "", &payload, Some(payload.clone())),
        "DeleteIssue" => issue(Method::DELETE, "", &payload, None),
        "UpdateIssueState" => issue(
            Method::PUT,
            "/state",
            &payload,
            Some(object_with("state", string(&payload, "state"))),
        ),
        "CreateIssueComment" => issue(Method::POST, "/comments", &payload, Some(payload.clone())),
        "UpdateIssueComment" => issue_comment(Method::PUT, "", &payload, Some(payload.clone())),
        "DeleteIssueComment" => issue_comment(Method::DELETE, "", &payload, None),
        "ToggleFavoriteIssue" => owner_issue(Method::POST, "/favorite", &payload, None),
        "AssignIssue" => owner_issue(
            Method::PUT,
            "/assignee",
            &payload,
            Some(object_with(
                "assigneeLoginId",
                string_any(&payload, &["assigneeLoginId", "loginId"]),
            )),
        ),
        "ShareIssue" => owner_issue(
            Method::POST,
            "/sharers",
            &payload,
            Some(object_with("loginId", string(&payload, "loginId"))),
        ),
        "UnshareIssue" => (
            Method::DELETE,
            api(&format!(
                "/owners/{}/projects/{}/issues/{}/sharers/{}",
                string(&payload, "ownerName"),
                string(&payload, "projectName"),
                int(&payload, "issueNumber"),
                string(&payload, "loginId")
            )),
            None,
        ),
        "VoteIssueComment" => owner_comment(Method::POST, "/vote", &payload, None),
        "UnvoteIssueComment" => owner_comment(Method::DELETE, "/vote", &payload, None),
        "ListProjectLabels" => owner_project(Method::GET, "/labels", &payload, None),
        "CreateProjectLabel" => {
            owner_project(Method::POST, "/labels", &payload, Some(payload.clone()))
        }
        "UpdateProjectLabel" => (
            Method::PATCH,
            api(&format!(
                "/owners/{}/projects/{}/labels/{}",
                string(&payload, "ownerName"),
                string(&payload, "projectName"),
                int(&payload, "labelId")
            )),
            Some(payload.clone()),
        ),
        "DeleteProjectLabel" => (
            Method::DELETE,
            api(&format!(
                "/owners/{}/projects/{}/labels/{}",
                string(&payload, "ownerName"),
                string(&payload, "projectName"),
                int(&payload, "labelId")
            )),
            None,
        ),
        "ListProjectLabelCategories" => {
            owner_project(Method::GET, "/labels/categories", &payload, None)
        }
        "CreateProjectLabelCategory" => owner_project(
            Method::POST,
            "/labels/categories",
            &payload,
            Some(payload.clone()),
        ),
        "UpdateProjectLabelCategory" => (
            Method::PATCH,
            api(&format!(
                "/owners/{}/projects/{}/labels/categories/{}",
                string(&payload, "ownerName"),
                string(&payload, "projectName"),
                int(&payload, "categoryId")
            )),
            Some(payload.clone()),
        ),
        "DeleteProjectLabelCategory" => (
            Method::DELETE,
            api(&format!(
                "/owners/{}/projects/{}/labels/categories/{}",
                string(&payload, "ownerName"),
                string(&payload, "projectName"),
                int(&payload, "categoryId")
            )),
            None,
        ),
        "ListProjectMilestones" => (
            Method::GET,
            api(&format!(
                "/owners/{}/projects/{}/milestones{}",
                string(&payload, "ownerName"),
                string(&payload, "projectName"),
                query(&payload, &["state", "orderBy", "orderDir"])
            )),
            None,
        ),
        "CreateProjectMilestone" => {
            owner_project(Method::POST, "/milestones", &payload, Some(payload.clone()))
        }
        "ReadProjectMilestone" => milestone(Method::GET, "", &payload, None),
        "UpdateProjectMilestone" => milestone(Method::PATCH, "", &payload, Some(payload.clone())),
        "DeleteProjectMilestone" => milestone(Method::DELETE, "", &payload, None),
        "OpenProjectMilestone" => milestone(
            Method::PATCH,
            "/state",
            &payload,
            Some(object_with("state", "open".to_string())),
        ),
        "CloseProjectMilestone" => milestone(
            Method::PATCH,
            "/state",
            &payload,
            Some(object_with("state", "closed".to_string())),
        ),
        "ReadCodeBrowser" => (
            Method::GET,
            api(&format!(
                "/projects/{}/{}/code{}",
                string(&payload, "ownerName"),
                string(&payload, "projectName"),
                query(&payload, &["branch", "path"])
            )),
            None,
        ),
        unknown => panic!("REST test support does not map method {unknown}"),
    }
}

fn api(path: &str) -> String {
    format!("/yona/api/v1{path}")
}

fn project(
    method: Method,
    suffix: &str,
    payload: &Value,
    body: Option<Value>,
) -> (Method, String, Option<Value>) {
    owner_project(method, suffix, payload, body)
}

fn owner_project(
    method: Method,
    suffix: &str,
    payload: &Value,
    body: Option<Value>,
) -> (Method, String, Option<Value>) {
    (
        method,
        api(&format!(
            "/owners/{}/projects/{}{}",
            string(payload, "ownerName"),
            string(payload, "projectName"),
            suffix
        )),
        body,
    )
}

fn issue(
    method: Method,
    suffix: &str,
    payload: &Value,
    body: Option<Value>,
) -> (Method, String, Option<Value>) {
    (
        method,
        api(&format!(
            "/projects/{}/{}/issues/{}{}",
            string(payload, "ownerName"),
            string(payload, "projectName"),
            int(payload, "issueNumber"),
            suffix
        )),
        body,
    )
}

fn owner_issue(
    method: Method,
    suffix: &str,
    payload: &Value,
    body: Option<Value>,
) -> (Method, String, Option<Value>) {
    (
        method,
        api(&format!(
            "/owners/{}/projects/{}/issues/{}{}",
            string(payload, "ownerName"),
            string(payload, "projectName"),
            int(payload, "issueNumber"),
            suffix
        )),
        body,
    )
}

fn issue_comment(
    method: Method,
    suffix: &str,
    payload: &Value,
    body: Option<Value>,
) -> (Method, String, Option<Value>) {
    issue(
        method,
        &format!("/comments/{}{}", int(payload, "commentId"), suffix),
        payload,
        body,
    )
}

fn owner_comment(
    method: Method,
    suffix: &str,
    payload: &Value,
    body: Option<Value>,
) -> (Method, String, Option<Value>) {
    owner_issue(
        method,
        &format!("/comments/{}{}", int(payload, "commentId"), suffix),
        payload,
        body,
    )
}

fn milestone(
    method: Method,
    suffix: &str,
    payload: &Value,
    body: Option<Value>,
) -> (Method, String, Option<Value>) {
    owner_project(
        method,
        &format!("/milestones/{}{}", int(payload, "milestoneId"), suffix),
        payload,
        body,
    )
}

fn query(payload: &Value, keys: &[&str]) -> String {
    let pairs: Vec<String> = keys
        .iter()
        .filter_map(|key| {
            payload.get(*key).and_then(|value| match value {
                Value::Null => None,
                Value::String(value) if value.is_empty() => None,
                Value::String(value) => Some(format!("{key}={value}")),
                Value::Number(value) => Some(format!("{key}={value}")),
                Value::Bool(value) => Some(format!("{key}={value}")),
                Value::Array(values) => {
                    let joined = values
                        .iter()
                        .filter_map(|value| query_value(key, value))
                        .collect::<Vec<_>>()
                        .join("&");
                    (!joined.is_empty()).then_some(joined)
                }
                _ => None,
            })
        })
        .collect();
    if pairs.is_empty() {
        String::new()
    } else {
        format!("?{}", pairs.join("&"))
    }
}

fn query_value(key: &str, value: &Value) -> Option<String> {
    match value {
        Value::Null => None,
        Value::String(value) if value.is_empty() => None,
        Value::String(value) => Some(format!("{key}={value}")),
        Value::Number(value) => Some(format!("{key}={value}")),
        Value::Bool(value) => Some(format!("{key}={value}")),
        _ => None,
    }
}

fn object_with(key: &str, value: String) -> Value {
    let mut object = Map::new();
    object.insert(key.to_string(), Value::String(value));
    Value::Object(object)
}

fn ensure_bool(payload: &mut Value, key: &str, default_value: bool) {
    if let Value::Object(object) = payload {
        object
            .entry(key.to_string())
            .or_insert(Value::Bool(default_value));
    }
}

fn string(payload: &Value, key: &str) -> String {
    string_any(payload, &[key])
}

fn string_any(payload: &Value, keys: &[&str]) -> String {
    keys.iter()
        .find_map(|key| {
            payload.get(*key).and_then(|value| {
                value
                    .as_str()
                    .map(ToString::to_string)
                    .or_else(|| value.as_i64().map(|value| value.to_string()))
            })
        })
        .unwrap_or_default()
}

fn int(payload: &Value, key: &str) -> i64 {
    payload
        .get(key)
        .and_then(|value| {
            value
                .as_i64()
                .or_else(|| value.as_str().and_then(|value| value.parse().ok()))
        })
        .unwrap_or_default()
}
