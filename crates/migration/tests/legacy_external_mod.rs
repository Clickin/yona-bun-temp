use std::collections::HashSet;

use yona_rust_pilot_migration::legacy_external::{
    endpoint_group_summaries, endpoint_groups, endpoints, find_endpoint, EndpointDomain,
    EndpointGroupSummary, EndpointStatus,
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
            EndpointStatus::MigratorExport,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects",
            EndpointStatus::MigratorImport,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues/imports",
            EndpointStatus::MigratorImport,
        ),
        (
            "POST",
            "/-_-api/v1/owners/:owner/projects/:projectName/issues",
            EndpointStatus::MigratorImport,
        ),
    ];

    for (method, path, status) in broader_endpoints {
        let endpoint = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing migrator endpoint: {method} {path}"));
        assert_eq!(endpoint.status, status);
        assert!(
            endpoint.status.is_migrator_scope(),
            "{method} {path} was {:?}",
            endpoint.status
        );
    }
}

#[test]
fn app_owned_adapter_helpers_remain_outside_migrator_scope() {
    let app_owned_adapter_helpers = [
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
        (
            "GET",
            "/-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers",
        ),
        ("GET", "/-_-api/v1/favoriteProjects"),
        ("POST", "/-_-api/v1/favoriteProjects/:projectId"),
        ("GET", "/-_-api/v1/favoriteIssues"),
        ("POST", "/-_-api/v1/favoriteIssues/:issueId"),
        ("GET", "/-_-api/v1/favoriteOrganizations"),
        ("POST", "/-_-api/v1/favoriteOrganizations/:organizationId"),
    ];

    for (method, path) in app_owned_adapter_helpers {
        let endpoint = find_endpoint(method, path)
            .unwrap_or_else(|| panic!("missing app-owned adapter helper: {method} {path}"));
        assert_eq!(endpoint.status, EndpointStatus::AppOwned);
        assert!(
            !endpoint.status.is_migrator_scope(),
            "{method} {path} must remain app-owned direct compatibility metadata"
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
fn endpoint_group_summaries_pin_shared_registry_shape() {
    let summaries: Vec<_> = endpoint_group_summaries().collect();

    assert_eq!(
        summaries.as_slice(),
        &[
            EndpointGroupSummary {
                domain: EndpointDomain::Users,
                name: "users",
                endpoint_count: 8,
                app_owned_count: 8,
                migrator_export_count: 0,
                migrator_import_count: 0,
                migrator_deferred_count: 0,
            },
            EndpointGroupSummary {
                domain: EndpointDomain::Projects,
                name: "projects",
                endpoint_count: 4,
                app_owned_count: 2,
                migrator_export_count: 1,
                migrator_import_count: 1,
                migrator_deferred_count: 0,
            },
            EndpointGroupSummary {
                domain: EndpointDomain::Issues,
                name: "issues",
                endpoint_count: 20,
                app_owned_count: 18,
                migrator_export_count: 0,
                migrator_import_count: 2,
                migrator_deferred_count: 0,
            },
            EndpointGroupSummary {
                domain: EndpointDomain::Board,
                name: "board",
                endpoint_count: 4,
                app_owned_count: 4,
                migrator_export_count: 0,
                migrator_import_count: 0,
                migrator_deferred_count: 0,
            },
            EndpointGroupSummary {
                domain: EndpointDomain::Milestones,
                name: "milestones",
                endpoint_count: 1,
                app_owned_count: 1,
                migrator_export_count: 0,
                migrator_import_count: 0,
                migrator_deferred_count: 0,
            },
            EndpointGroupSummary {
                domain: EndpointDomain::Watchers,
                name: "watchers",
                endpoint_count: 1,
                app_owned_count: 1,
                migrator_export_count: 0,
                migrator_import_count: 0,
                migrator_deferred_count: 0,
            },
            EndpointGroupSummary {
                domain: EndpointDomain::Other,
                name: "other",
                endpoint_count: 9,
                app_owned_count: 9,
                migrator_export_count: 0,
                migrator_import_count: 0,
                migrator_deferred_count: 0,
            },
        ]
    );

    let totals = summaries.iter().fold(
        (0, 0, 0, 0, 0),
        |(endpoints, app_owned, migrator_export, migrator_import, migrator_deferred), summary| {
            (
                endpoints + summary.endpoint_count,
                app_owned + summary.app_owned_count,
                migrator_export + summary.migrator_export_count,
                migrator_import + summary.migrator_import_count,
                migrator_deferred + summary.migrator_deferred_count,
            )
        },
    );
    assert_eq!(totals, (47, 43, 1, 3, 0));
}

#[test]
fn endpoint_inventory_has_no_duplicate_method_path_entries() {
    let mut seen = HashSet::new();
    let mut total = 0;

    for endpoint in endpoints() {
        total += 1;
        assert!(
            seen.insert((endpoint.method, endpoint.path)),
            "duplicate legacy external endpoint: {} {}",
            endpoint.method,
            endpoint.path
        );
    }

    assert_eq!(seen.len(), total);
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
