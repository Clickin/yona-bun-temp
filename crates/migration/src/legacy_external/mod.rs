pub mod boards;
pub mod issues;
pub mod milestones;
pub mod project_export_mapper;
pub mod projects;
pub mod users;
pub mod watchers;
pub mod yona_export_adapter;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EndpointDomain {
    Users,
    Projects,
    Issues,
    Board,
    Milestones,
    Watchers,
    Other,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EndpointStatus {
    AppOwned,
    MigratorDeferred,
    MigratorExport,
    MigratorImport,
}

impl EndpointStatus {
    pub const fn is_migrator_scope(self) -> bool {
        matches!(
            self,
            Self::MigratorDeferred | Self::MigratorExport | Self::MigratorImport
        )
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct LegacySource {
    pub controller: &'static str,
    pub action: &'static str,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct EndpointDescriptor {
    pub method: &'static str,
    pub path: &'static str,
    pub source: LegacySource,
    pub status: EndpointStatus,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct EndpointGroup {
    pub domain: EndpointDomain,
    pub endpoints: &'static [EndpointDescriptor],
}

pub fn endpoint_groups() -> &'static [EndpointGroup] {
    ENDPOINT_GROUPS
}

pub fn endpoints() -> impl Iterator<Item = &'static EndpointDescriptor> {
    ENDPOINT_GROUPS
        .iter()
        .flat_map(|group| group.endpoints.iter())
}

pub fn find_endpoint(method: &str, path: &str) -> Option<&'static EndpointDescriptor> {
    endpoints().find(|endpoint| endpoint.method == method && endpoint.path == path)
}

const fn source(controller: &'static str, action: &'static str) -> LegacySource {
    LegacySource { controller, action }
}

const USERS: &[EndpointDescriptor] = &[
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/users",
        source: source("controllers.UserApp", "users"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/users",
        source: source("controllers.api.UserApi", "newUser"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/users/token",
        source: source("controllers.api.UserApi", "newToken"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/user/issues",
        source: source("controllers.api.UserApi", "getIssuesByUser"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/users/:user/statistics",
        source: source("controllers.api.UserApi", "statistics"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/user/defultLoginPage",
        source: source("controllers.UserApp", "setDefaultLoginPage"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/admin/users",
        source: source("controllers.api.UserApi", "users"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "PATCH",
        path: "/-_-api/v1/admin/users/:user",
        source: source("controllers.api.UserApi", "updateUserState"),
        status: EndpointStatus::MigratorDeferred,
    },
];

const PROJECTS: &[EndpointDescriptor] = &[
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/exports",
        source: source("controllers.api.ProjectApi", "exports"),
        status: EndpointStatus::MigratorExport,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects",
        source: source("controllers.api.ProjectApi", "newProject"),
        status: EndpointStatus::MigratorImport,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/labels",
        source: source("controllers.api.ProjectApi", "newLabel"),
        status: EndpointStatus::MigratorImport,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads",
        source: source("controllers.api.ProjectApi", "titleHeads"),
        status: EndpointStatus::MigratorDeferred,
    },
];

const ISSUES: &[EndpointDescriptor] = &[
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports",
        source: source("controllers.api.IssueApi", "imports"),
        status: EndpointStatus::MigratorImport,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues",
        source: source("controllers.api.IssueApi", "newIssues"),
        status: EndpointStatus::MigratorImport,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        source: source("controllers.api.IssueApi", "getIssue"),
        status: EndpointStatus::MigratorExport,
    },
    EndpointDescriptor {
        method: "PUT",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        source: source("controllers.api.IssueApi", "updateIssue"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "PATCH",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        source: source("controllers.api.IssueApi", "updateIssueState"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "PATCH",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/content",
        source: source("controllers.api.IssueApi", "updateIssueContent"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments",
        source: source("controllers.api.IssueApi", "newIssueComment"),
        status: EndpointStatus::MigratorImport,
    },
    EndpointDescriptor {
        method: "PUT",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments/:commentId",
        source: source("controllers.api.IssueApi", "updateIssueComment"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/commentNotiReceivers",
        source: source("controllers.api.IssueApi", "commentNotiRecivers"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issuelabel/:number",
        source: source("controllers.api.IssueApi", "updateIssueLabel"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignableUsers",
        source: source("controllers.api.IssueApi", "findAssignableUsers"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/assignableUsers",
        source: source("controllers.api.IssueApi", "findAssignableUsersOfProject"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees",
        source: source("controllers.api.IssueApi", "updateAssginees"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/findSharer",
        source: source("controllers.api.IssueApi", "findSharerByloginIds"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/sharableUsers",
        source: source("controllers.api.IssueApi", "findSharableUsers"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share",
        source: source("controllers.api.IssueApi", "updateSharer"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/upvoteWeight",
        source: source("controllers.api.IssueApi", "upvoteWeight"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/downvoteWeight",
        source: source("controllers.api.IssueApi", "downvoteWeight"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/detectChange",
        source: source("controllers.api.IssueApi", "detectChange"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/translation",
        source: source("controllers.api.IssueApi", "translate"),
        status: EndpointStatus::AppOwned,
    },
];

const OTHER: &[EndpointDescriptor] = &[
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/favoriteProjects",
        source: source("controllers.api.UserApi", "getFoveriteProjects"),
        status: EndpointStatus::AppOwned,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/favoriteProjects/:projectId",
        source: source("controllers.api.UserApi", "toggleFoveriteProject"),
        status: EndpointStatus::AppOwned,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/favoriteOrganizations",
        source: source("controllers.api.UserApi", "getFoveriteOrganizations"),
        status: EndpointStatus::AppOwned,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/favoriteOrganizations/:organizationId",
        source: source("controllers.api.UserApi", "toggleFoveriteOrganization"),
        status: EndpointStatus::AppOwned,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/favoriteIssues",
        source: source("controllers.api.UserApi", "getFoveriteIssues"),
        status: EndpointStatus::AppOwned,
    },
    EndpointDescriptor {
        method: "POST",
        path: "/-_-api/v1/favoriteIssues/:issueId",
        source: source("controllers.api.UserApi", "toggleFoveriteIssue"),
        status: EndpointStatus::AppOwned,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api",
        source: source("controllers.Application", "index"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/",
        source: source("controllers.Application", "index"),
        status: EndpointStatus::MigratorDeferred,
    },
    EndpointDescriptor {
        method: "GET",
        path: "/-_-api/v1/hello",
        source: source("controllers.api.GlobalApi", "hello"),
        status: EndpointStatus::AppOwned,
    },
];

const ENDPOINT_GROUPS: &[EndpointGroup] = &[
    EndpointGroup {
        domain: EndpointDomain::Users,
        endpoints: USERS,
    },
    EndpointGroup {
        domain: EndpointDomain::Projects,
        endpoints: PROJECTS,
    },
    EndpointGroup {
        domain: EndpointDomain::Issues,
        endpoints: ISSUES,
    },
    EndpointGroup {
        domain: EndpointDomain::Board,
        endpoints: boards::ENDPOINT_DESCRIPTORS,
    },
    EndpointGroup {
        domain: EndpointDomain::Milestones,
        endpoints: milestones::ENDPOINT_DESCRIPTORS,
    },
    EndpointGroup {
        domain: EndpointDomain::Watchers,
        endpoints: watchers::ENDPOINT_DESCRIPTORS,
    },
    EndpointGroup {
        domain: EndpointDomain::Other,
        endpoints: OTHER,
    },
];
