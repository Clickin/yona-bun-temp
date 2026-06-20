const CODE_ROUTES: &str = include_str!("../src/routes/code.rs");
const ISSUE_ROUTES: &str = include_str!("../src/routes/issues.rs");
const PROJECT_ROUTES: &str = include_str!("../src/routes/projects.rs");
const WORKSPACE_ROUTES: &str = include_str!("../src/routes/workspace.rs");
const SERVICE: &str = include_str!("../src/service.rs");

#[test]
fn route_split_private_handlers_stay_module_private() {
    for signature in [
        "pub(crate) async fn rest_read_code_browser",
        "pub(crate) async fn rest_read_code_history",
        "pub(crate) async fn rest_read_code_commit_detail",
        "pub(crate) async fn rest_create_commit_discussion_comment",
        "pub(crate) async fn rest_update_commit_discussion_comment",
        "pub(crate) async fn rest_delete_commit_discussion_comment",
        "pub(crate) async fn rest_read_code_compare",
        "pub(crate) async fn rest_read_code_branches",
        "pub(crate) async fn rest_set_default_code_branch",
        "pub(crate) async fn rest_delete_code_branch",
    ] {
        assert!(
            !CODE_ROUTES.contains(signature),
            "{signature} should remain module-private after the route split"
        );
    }

    for signature in [
        "pub(crate) async fn rest_list_project_issues",
        "pub(crate) async fn rest_list_organization_issues",
        "pub(crate) async fn rest_read_issue_detail",
        "pub(crate) async fn rest_update_issue_state",
        "pub(crate) async fn rest_create_issue",
        "pub(crate) async fn rest_update_issue",
        "pub(crate) async fn rest_update_issue_weight",
        "pub(crate) async fn rest_issue_detail_response_from_access_with_repository_issue_references",
    ] {
        assert!(
            !ISSUE_ROUTES.contains(signature),
            "{signature} should remain module-private after the route split"
        );
    }

    for signature in [
        "pub(crate) async fn rest_create_project",
        "pub(crate) async fn rest_project_create_form_options",
        "pub(crate) async fn rest_update_project",
    ] {
        assert!(
            !PROJECT_ROUTES.contains(signature),
            "{signature} should remain module-private after the route split"
        );
    }

    assert!(
        !WORKSPACE_ROUTES.contains("pub(crate) async fn rest_list_workspace_files"),
        "workspace file-list REST handler should remain module-private after the route split"
    );
}

#[test]
fn stale_service_facade_wrappers_do_not_return() {
    for signature in [
        "pub(crate) async fn read_organization_members",
        "pub(crate) async fn update_project",
        "pub(crate) async fn assign_issue",
    ] {
        let exact_signature = format!("{signature}(");
        assert!(
            !SERVICE.contains(&exact_signature),
            "{signature} should stay removed; routes call the owning module functions directly"
        );
    }
}
