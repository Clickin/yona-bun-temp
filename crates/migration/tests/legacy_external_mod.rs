use yona_rust_pilot_migration::legacy_external::{
    endpoint_groups, endpoints, find_endpoint, EndpointStatus,
};

#[test]
fn app_server_exceptions_are_marked_app_owned() {
    let app_owned = [
        ("GET", "/-_-api"),
        ("GET", "/-_-api/v1/"),
        ("GET", "/-_-api/v1/hello"),
        ("GET", "/-_-api/v1/users"),
        ("POST", "/-_-api/v1/users"),
        ("POST", "/-_-api/v1/users/token"),
        ("GET", "/-_-api/v1/user/issues"),
        ("GET", "/-_-api/v1/users/:user/statistics"),
        ("POST", "/-_-api/v1/user/defultLoginPage"),
        ("GET", "/-_-api/v1/admin/users"),
        ("PATCH", "/-_-api/v1/admin/users/:user"),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/labels",
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/titleHeads",
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        ),
        (
            "PUT",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        ),
        (
            "PATCH",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number",
        ),
        (
            "PATCH",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/content",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments",
        ),
        (
            "PUT",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments/:commentId",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/commentNotiReceivers",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issuelabel/:number",
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignableUsers",
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/assignableUsers",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees",
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/findSharer",
        ),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/sharableUsers",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/upvoteWeight",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/downvoteWeight",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/:number/detectChange",
        ),
        ("GET", "/-_-api/v1/favoriteProjects"),
        ("POST", "/-_-api/v1/favoriteProjects/:projectId"),
        ("GET", "/-_-api/v1/favoriteIssues"),
        ("POST", "/-_-api/v1/favoriteIssues/:issueId"),
        ("GET", "/-_-api/v1/favoriteOrganizations"),
        ("POST", "/-_-api/v1/favoriteOrganizations/:organizationId"),
        ("POST", "/-_-api/v1/translation"),
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/posts",
        ),
        (
            "PATCH",
            "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/milestones",
        ),
    ];

    for (method, path) in app_owned {
        let endpoint = find_endpoint(method, path).unwrap_or_else(|| {
            panic!("missing app-owned legacy external endpoint: {method} {path}")
        });
        assert_eq!(endpoint.status, EndpointStatus::AppOwned);
    }
}

#[test]
fn broader_legacy_external_endpoints_remain_migrator_scope() {
    let broader_endpoints = [
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/exports",
        ),
        ("POST", "/-_-api/v1/owners/:owner/projects"),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues",
        ),
    ];

    for (method, path) in broader_endpoints {
        let endpoint = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing migrator endpoint: {method} {path}"));
        assert!(
            endpoint.status.is_migrator_scope(),
            "{method} {path} was {:?}",
            endpoint.status
        );
    }
}

#[test]
fn migration_tool_source_adapter_endpoints_do_not_become_app_owned_runtime_api() {
    let migration_tool_source_endpoints = [
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/exports",
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues",
        ),
    ];

    for (method, path) in migration_tool_source_endpoints {
        let endpoint = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing migration-tool source endpoint: {method} {path}"));
        assert_ne!(
            endpoint.status,
            EndpointStatus::AppOwned,
            "{method} {path} must stay a migration-tool adapter descriptor, not Rust runtime API"
        );
    }
}

#[test]
fn inventory_is_grouped_and_contains_only_known_statuses() {
    assert_eq!(endpoint_groups().len(), 7);
    assert_eq!(endpoints().count(), 47);
    assert!(endpoints().all(|endpoint| matches!(
        endpoint.status,
        EndpointStatus::AppOwned
            | EndpointStatus::MigratorDeferred
            | EndpointStatus::MigratorExport
            | EndpointStatus::MigratorImport
    )));
}
