use axum::{
    extract::{Path, Query, RawQuery},
    http::HeaderMap,
    routing::{delete, get, patch, post, put},
    Form, Json, Router,
};
use std::collections::HashMap;

use crate::{
    direct_copy_issue_labels, direct_create_issue_comment, direct_create_issue_label,
    direct_create_issue_label_category, direct_delete_issue_comment, direct_delete_issue_label,
    direct_delete_issue_label_category, direct_issue_comment_vote, direct_issue_label_css,
    direct_list_issue_label_categories, direct_list_issue_labels, direct_update_issue_comment,
    direct_update_issue_label, direct_update_issue_label_category,
    legacy_external_create_issue_comment, legacy_external_detect_issue_change,
    legacy_external_find_issue_sharer, legacy_external_issue_assignable_users,
    legacy_external_issue_comment_notification_receivers, legacy_external_issue_sharable_users,
    legacy_external_read_issue, legacy_external_update_issue,
    legacy_external_update_issue_assignee, legacy_external_update_issue_comment,
    legacy_external_update_issue_content, legacy_external_update_issue_labels,
    legacy_external_update_issue_sharer, legacy_external_update_issue_state,
    legacy_external_update_issue_weight, rest_assign_issue, rest_copy_project_labels,
    rest_create_issue, rest_create_issue_comment, rest_create_project_label,
    rest_create_project_label_category, rest_create_project_milestone, rest_delete_issue,
    rest_delete_issue_comment, rest_delete_project_label, rest_delete_project_label_category,
    rest_delete_project_milestone, rest_issue_comment_participation, rest_issue_participation,
    rest_list_issue_assignable_users, rest_list_issue_mention_users,
    rest_list_issue_parent_options, rest_list_issue_sharable_users, rest_list_organization_issues,
    rest_list_project_assignable_users, rest_list_project_issue_references,
    rest_list_project_issues, rest_list_project_label_categories, rest_list_project_labels,
    rest_list_project_milestones, rest_mass_update_issues, rest_read_issue_detail,
    rest_read_project_milestone, rest_set_project_milestone_state, rest_share_issue,
    rest_toggle_favorite_issue, rest_unshare_issue, rest_update_issue, rest_update_issue_comment,
    rest_update_issue_state, rest_update_issue_weight, rest_update_project_label,
    rest_update_project_label_category, rest_update_project_milestone, session::SessionManager,
    PilotBackend, PilotServiceImpl, RestIssueAssignableUsersQuery, RestIssueAssigneeBody,
    RestIssueCommentBody, RestIssueMentionUsersQuery, RestIssueMutationBody,
    RestIssueParentOptionsQuery, RestIssueSharerBody, RestIssueSharerDeleteQuery,
    RestIssueStateBody, RestMassUpdateIssuesBody, RestMilestoneListQuery,
    RestOrganizationIssuesQuery, RestProjectIssueReferencesQuery, RestProjectIssuesQuery,
    RestProjectLabelCategoryBody, RestProjectLabelCopyBody, RestProjectLabelCreateBody,
    RestProjectLabelUpdateBody, RestProjectMilestoneBody, RestProjectMilestoneStateBody,
};

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    let session_manager = service.session_manager.clone();
    let backend = service.backend.clone();
    let base_path = service.base_path.clone();
    let public_origin = service.public_origin.clone();

    Router::new()
        .route(
            "/projects/{owner_name}/{project_name}/issues",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestProjectIssuesQuery>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_list_project_issues(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            })
            .post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                let public_origin = public_origin.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestIssueMutationBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    let public_origin = public_origin.clone();
                    async move {
                        rest_create_issue(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            session_manager,
                            backend,
                            base_path,
                            public_origin,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/issues/mass-update",
            post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestMassUpdateIssuesBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_mass_update_issues(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/issues/parent-options",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestIssueParentOptionsQuery>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_list_issue_parent_options(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/issues/{issue_number}",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_read_issue_detail(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            })
            .put({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestIssueMutationBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_update_issue(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            body,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            })
            .delete({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_delete_issue(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/issues/{issue_number}/state",
            put({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestIssueStateBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_update_issue_state(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            body,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/issues/{issue_number}/upvoteWeight",
            post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_update_issue_weight(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            1,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/issues/{issue_number}/downvoteWeight",
            post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_update_issue_weight(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            -1,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/issues/{issue_number}/comments",
            post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                let public_origin = public_origin.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestIssueCommentBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    let public_origin = public_origin.clone();
                    async move {
                        rest_create_issue_comment(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            body,
                            session_manager,
                            backend,
                            base_path,
                            public_origin,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/issues/{issue_number}/comments/{comment_id}",
            put({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Json(body): Json<RestIssueCommentBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_update_issue_comment(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            comment_id,
                            body,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            })
            .delete({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_delete_issue_comment(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            comment_id,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/issues",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      RawQuery(raw_query): RawQuery| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        let query = RestOrganizationIssuesQuery::from_raw_query(raw_query.as_deref())?;
                        rest_list_organization_issues(
                            headers,
                            organization_name,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/watch",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_issue_participation(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            service,
                            "watch",
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_issue_participation(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            service,
                            "unwatch",
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/vote",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_issue_participation(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            service,
                            "vote",
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_issue_participation(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            service,
                            "unvote",
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/favorite",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_toggle_favorite_issue(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/assignable-users",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    let session_manager = service.session_manager.clone();
                    let backend = service.backend.clone();
                    async move {
                        rest_list_project_assignable_users(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issue-references",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestProjectIssueReferencesQuery>| {
                    let session_manager = service.session_manager.clone();
                    let backend = service.backend.clone();
                    async move {
                        rest_list_project_issue_references(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/assignable-users",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    let session_manager = service.session_manager.clone();
                    let backend = service.backend.clone();
                    async move {
                        rest_list_issue_assignable_users(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/sharable-users",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    let session_manager = service.session_manager.clone();
                    let backend = service.backend.clone();
                    async move {
                        rest_list_issue_sharable_users(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/mention-users",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Query(query): Query<RestIssueMentionUsersQuery>| {
                    let session_manager = service.session_manager.clone();
                    let backend = service.backend.clone();
                    async move {
                        rest_list_issue_mention_users(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/assignee",
            put({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestIssueAssigneeBody>| {
                    let service = service.clone();
                    async move {
                        rest_assign_issue(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/sharers",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestIssueSharerBody>| {
                    let service = service.clone();
                    async move {
                        rest_share_issue(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/sharers/{login_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number, login_id)): Path<(
                    String,
                    String,
                    i64,
                    String,
                )>,
                      Query(query): Query<RestIssueSharerDeleteQuery>| {
                    let service = service.clone();
                    async move {
                        rest_unshare_issue(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            login_id,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/comments/{comment_id}/vote",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_issue_comment_participation(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            comment_id,
                            service,
                            "vote",
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_issue_comment_participation(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            comment_id,
                            service,
                            "unvote",
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/labels/categories",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move {
                        rest_list_project_label_categories(
                            headers,
                            owner_name,
                            project_name,
                            service,
                        )
                        .await
                    }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectLabelCategoryBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_project_label_category(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/labels/categories/{category_id}",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, category_id)): Path<(String, String, i64)>,
                      Json(body): Json<RestProjectLabelCategoryBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_project_label_category(
                            headers,
                            owner_name,
                            project_name,
                            category_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, category_id)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_delete_project_label_category(
                            headers,
                            owner_name,
                            project_name,
                            category_id,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/labels",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_list_project_labels(headers, owner_name, project_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectLabelCreateBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_project_label(headers, owner_name, project_name, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/labels/copy",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectLabelCopyBody>| {
                    let service = service.clone();
                    async move {
                        rest_copy_project_labels(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/labels/{label_id}",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, label_id)): Path<(String, String, i64)>,
                      Json(body): Json<RestProjectLabelUpdateBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_project_label(
                            headers,
                            owner_name,
                            project_name,
                            label_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, label_id)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_delete_project_label(
                            headers,
                            owner_name,
                            project_name,
                            label_id,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/milestones",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestMilestoneListQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_project_milestones(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            service,
                        )
                        .await
                    }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectMilestoneBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_project_milestone(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/milestones/{milestone_id}/state",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, milestone_id)): Path<(String, String, i64)>,
                      Json(body): Json<RestProjectMilestoneStateBody>| {
                    let service = service.clone();
                    async move {
                        rest_set_project_milestone_state(
                            headers,
                            owner_name,
                            project_name,
                            milestone_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/milestones/{milestone_id}",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, milestone_id)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_read_project_milestone(
                            headers,
                            owner_name,
                            project_name,
                            milestone_id,
                            service,
                        )
                        .await
                    }
                }
            })
            .patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, milestone_id)): Path<(String, String, i64)>,
                      Json(body): Json<RestProjectMilestoneBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_project_milestone(
                            headers,
                            owner_name,
                            project_name,
                            milestone_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            })
            .delete(
                move |headers: HeaderMap,
                      Path((owner_name, project_name, milestone_id)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_delete_project_milestone(
                            headers,
                            owner_name,
                            project_name,
                            milestone_id,
                            service,
                        )
                        .await
                    }
                },
            ),
        )
}

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Router {
    let legacy_issue_label_backend = backend.clone();
    let legacy_issue_label_session_manager = session_manager.clone();
    let legacy_issue_weight_up_backend = backend.clone();
    let legacy_issue_weight_up_session_manager = session_manager.clone();
    let legacy_issue_weight_down_backend = backend.clone();
    let legacy_issue_weight_down_session_manager = session_manager.clone();
    let legacy_issue_content_backend = backend.clone();
    let legacy_issue_content_session_manager = session_manager.clone();
    let legacy_issue_detect_change_backend = backend.clone();
    let legacy_issue_detect_change_session_manager = session_manager.clone();
    let legacy_issue_read_backend = backend.clone();
    let legacy_issue_read_session_manager = session_manager.clone();
    let legacy_issue_update_backend = backend.clone();
    let legacy_issue_update_session_manager = session_manager.clone();
    let legacy_issue_state_backend = backend.clone();
    let legacy_issue_state_session_manager = session_manager.clone();
    let legacy_issue_assignee_backend = backend.clone();
    let legacy_issue_assignee_session_manager = session_manager.clone();
    let legacy_issue_share_backend = backend.clone();
    let legacy_issue_share_session_manager = session_manager.clone();
    let legacy_issue_find_sharer_backend = backend.clone();
    let legacy_issue_find_sharer_session_manager = session_manager.clone();
    let legacy_issue_assignable_backend = backend.clone();
    let legacy_issue_assignable_session_manager = session_manager.clone();
    let legacy_issue_sharable_backend = backend.clone();
    let legacy_issue_sharable_session_manager = session_manager.clone();
    let legacy_issue_comment_backend = backend.clone();
    let legacy_issue_comment_session_manager = session_manager.clone();
    let legacy_issue_comment_base_path = base_path.clone();
    let legacy_issue_comment_receivers_backend = backend.clone();
    let legacy_issue_comment_receivers_session_manager = session_manager.clone();
    let legacy_issue_comment_update_backend = backend.clone();
    let legacy_issue_comment_update_session_manager = session_manager.clone();
    let issue_comment_create_backend = backend.clone();
    let issue_comment_create_session_manager = session_manager.clone();
    let issue_comment_create_base_path = base_path.clone();
    let issue_comment_create_public_origin = public_origin.clone();
    let issue_comment_update_backend = backend.clone();
    let issue_comment_update_session_manager = session_manager.clone();
    let issue_comment_update_base_path = base_path.clone();
    let issue_comment_delete_backend = backend.clone();
    let issue_comment_delete_session_manager = session_manager.clone();
    let issue_comment_delete_base_path = base_path.clone();
    let comment_vote_backend = backend.clone();
    let comment_vote_session_manager = session_manager.clone();
    let comment_vote_base_path = base_path.clone();
    let comment_unvote_backend = backend.clone();
    let comment_unvote_session_manager = session_manager.clone();
    let comment_unvote_base_path = base_path.clone();
    let label_list_backend = backend.clone();
    let label_list_session_manager = session_manager.clone();
    let label_create_backend = backend.clone();
    let label_create_session_manager = session_manager.clone();
    let label_css_backend = backend.clone();
    let label_css_session_manager = session_manager.clone();
    let label_update_backend = backend.clone();
    let label_update_session_manager = session_manager.clone();
    let label_delete_backend = backend.clone();
    let label_delete_session_manager = session_manager.clone();
    let label_copy_backend = backend.clone();
    let label_copy_session_manager = session_manager.clone();
    let label_copy_base_path = base_path.clone();
    let category_list_backend = backend.clone();
    let category_list_session_manager = session_manager.clone();
    let category_create_backend = backend.clone();
    let category_create_session_manager = session_manager.clone();
    let category_update_backend = backend.clone();
    let category_update_session_manager = session_manager.clone();
    let category_delete_backend = backend;
    let category_delete_session_manager = session_manager;

    Router::new()
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issuelabel/{number}",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<Vec<serde_json::Value>>| {
                    async move {
                        legacy_external_update_issue_labels(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_label_session_manager.clone(),
                            legacy_issue_label_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/upvoteWeight",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>| {
                    async move {
                        legacy_external_update_issue_weight(
                            headers,
                            owner,
                            project_name,
                            number,
                            1,
                            legacy_issue_weight_up_session_manager.clone(),
                            legacy_issue_weight_up_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/downvoteWeight",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>| {
                    async move {
                        legacy_external_update_issue_weight(
                            headers,
                            owner,
                            project_name,
                            number,
                            -1,
                            legacy_issue_weight_down_session_manager.clone(),
                            legacy_issue_weight_down_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/content",
            patch(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue_content(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_content_session_manager.clone(),
                            legacy_issue_content_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/detectChange",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_detect_issue_change(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_detect_change_session_manager.clone(),
                            legacy_issue_detect_change_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>| {
                    async move {
                        legacy_external_read_issue(
                            headers,
                            owner,
                            project_name,
                            number,
                            legacy_issue_read_session_manager.clone(),
                            legacy_issue_read_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}",
            put(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_update_session_manager.clone(),
                            legacy_issue_update_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}",
            patch(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue_state(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_state_session_manager.clone(),
                            legacy_issue_state_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/assignees",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue_assignee(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_assignee_session_manager.clone(),
                            legacy_issue_assignee_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/share",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue_sharer(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_share_session_manager.clone(),
                            legacy_issue_share_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/findSharer",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    async move {
                        legacy_external_find_issue_sharer(
                            headers,
                            owner,
                            project_name,
                            number,
                            query,
                            legacy_issue_find_sharer_session_manager.clone(),
                            legacy_issue_find_sharer_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/assignableUsers",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    async move {
                        legacy_external_issue_assignable_users(
                            headers,
                            owner,
                            project_name,
                            number,
                            query,
                            legacy_issue_assignable_session_manager.clone(),
                            legacy_issue_assignable_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/sharableUsers",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    async move {
                        legacy_external_issue_sharable_users(
                            headers,
                            owner,
                            project_name,
                            number,
                            query,
                            legacy_issue_sharable_session_manager.clone(),
                            legacy_issue_sharable_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/comments",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_create_issue_comment(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_comment_session_manager.clone(),
                            legacy_issue_comment_backend.clone(),
                            legacy_issue_comment_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/comments/{comment_id}",
            put(
                move |headers: HeaderMap,
                      Path((owner, project_name, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue_comment(
                            headers,
                            owner,
                            project_name,
                            number,
                            comment_id,
                            body,
                            legacy_issue_comment_update_session_manager.clone(),
                            legacy_issue_comment_update_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/commentNotiReceivers",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_issue_comment_notification_receivers(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_comment_receivers_session_manager.clone(),
                            legacy_issue_comment_receivers_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/{number}/comments",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number)): Path<(String, String, i64)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_issue_comment(
                            headers,
                            owner,
                            project,
                            number,
                            form,
                            issue_comment_create_session_manager.clone(),
                            issue_comment_create_backend.clone(),
                            issue_comment_create_base_path.clone(),
                            issue_comment_create_public_origin.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/{number}/comments/{comment_id}",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_update_issue_comment(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            form,
                            issue_comment_update_session_manager.clone(),
                            issue_comment_update_backend.clone(),
                            issue_comment_update_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/{number}/comment/{comment_id}/delete",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    async move {
                        direct_delete_issue_comment(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            issue_comment_delete_session_manager.clone(),
                            issue_comment_delete_backend.clone(),
                            issue_comment_delete_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/{number}/comment/{comment_id}/vote",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    async move {
                        direct_issue_comment_vote(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            "vote",
                            comment_vote_session_manager.clone(),
                            comment_vote_backend.clone(),
                            comment_vote_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/{number}/comment/{comment_id}/unvote",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    async move {
                        direct_issue_comment_vote(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            "unvote",
                            comment_unvote_session_manager.clone(),
                            comment_unvote_backend.clone(),
                            comment_unvote_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/labels",
            get(
                move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>| {
                    async move {
                        direct_list_issue_labels(
                            headers,
                            owner,
                            project,
                            label_list_session_manager.clone(),
                            label_list_backend.clone(),
                        )
                        .await
                    }
                },
            )
            .post(
                move |headers: HeaderMap,
                      Path((owner, project)): Path<(String, String)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_issue_label(
                            headers,
                            owner,
                            project,
                            form,
                            label_create_session_manager.clone(),
                            label_create_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/labels.css",
            get(
                move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>| {
                    async move {
                        direct_issue_label_css(
                            headers,
                            owner,
                            project,
                            label_css_session_manager.clone(),
                            label_css_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/label/{label_id}",
            put(
                move |headers: HeaderMap,
                      Path((owner, project, label_id)): Path<(String, String, i64)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_update_issue_label(
                            headers,
                            owner,
                            project,
                            label_id,
                            form,
                            label_update_session_manager.clone(),
                            label_update_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/label/{label_id}/delete",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, label_id)): Path<(String, String, i64)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_delete_issue_label(
                            headers,
                            owner,
                            project,
                            label_id,
                            form,
                            label_delete_session_manager.clone(),
                            label_delete_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/copyLabels",
            post(
                move |headers: HeaderMap,
                      Path((owner, project)): Path<(String, String)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_copy_issue_labels(
                            headers,
                            owner,
                            project,
                            form,
                            label_copy_session_manager.clone(),
                            label_copy_backend.clone(),
                            label_copy_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/label/categories",
            get(
                move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>| {
                    async move {
                        direct_list_issue_label_categories(
                            headers,
                            owner,
                            project,
                            category_list_session_manager.clone(),
                            category_list_backend.clone(),
                        )
                        .await
                    }
                },
            )
            .post(
                move |headers: HeaderMap,
                      Path((owner, project)): Path<(String, String)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_issue_label_category(
                            headers,
                            owner,
                            project,
                            form,
                            category_create_session_manager.clone(),
                            category_create_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/label/category/{category_id}",
            put(
                move |headers: HeaderMap,
                      Path((owner, project, category_id)): Path<(String, String, i64)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_update_issue_label_category(
                            headers,
                            owner,
                            project,
                            category_id,
                            form,
                            category_update_session_manager.clone(),
                            category_update_backend.clone(),
                        )
                        .await
                    }
                },
            )
            .delete(
                move |headers: HeaderMap,
                      Path((owner, project, category_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_delete_issue_label_category(
                            headers,
                            owner,
                            project,
                            category_id,
                            category_delete_session_manager.clone(),
                            category_delete_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}
