use axum::{
    extract::{Path, Query, RawQuery},
    http::HeaderMap,
    routing::{delete, get, patch, post, put},
    Form, Json, Router,
};
use std::collections::HashMap;

use crate::generated::yona::pilot::v1::*;
use crate::{
    absolute_app_url, direct_copy_issue_labels, direct_create_issue_comment,
    direct_create_issue_label, direct_create_issue_label_category, direct_delete_issue_comment,
    direct_delete_issue_label, direct_delete_issue_label_category, direct_issue_comment_vote,
    direct_issue_label_css, direct_list_issue_label_categories, direct_list_issue_labels,
    direct_update_issue_comment, direct_update_issue_label, direct_update_issue_label_category,
    dispatch_issue_webhooks, internal_error,
    issue_detail_response_from_record_with_repository_issue_references,
    issue_detail_response_from_record_with_sharer_flags, legacy_external_create_issue_comment,
    legacy_external_detect_issue_change, legacy_external_find_issue_sharer,
    legacy_external_issue_assignable_users, legacy_external_issue_comment_notification_receivers,
    legacy_external_issue_sharable_users, legacy_external_read_issue, legacy_external_update_issue,
    legacy_external_update_issue_assignee, legacy_external_update_issue_comment,
    legacy_external_update_issue_content, legacy_external_update_issue_labels,
    legacy_external_update_issue_sharer, legacy_external_update_issue_state,
    legacy_external_update_issue_weight, markdown_issue_references_for_project,
    markdown_mention_references, normalize_identifier, persistence, project_read_allowed,
    require_authenticated_user, require_project_authorization, require_project_read,
    require_project_resource_create, require_session, require_valid_csrf, rest_assign_issue,
    rest_copy_project_labels, rest_create_project_label, rest_create_project_label_category,
    rest_create_project_milestone, rest_delete_project_label, rest_delete_project_label_category,
    rest_delete_project_milestone, rest_issue_comment_participation,
    rest_issue_detail_response_from_record_with_sharer_flags_and_references,
    rest_issue_list_item_from_record, rest_issue_mutation_input_from_body,
    rest_issue_participation, rest_issue_reference_metadata_from_resolved,
    rest_list_project_label_categories, rest_list_project_labels, rest_list_project_milestones,
    rest_mention_reference_metadata_from_resolved, rest_project_issue_filter_from_query,
    rest_read_project_milestone, rest_set_project_milestone_state, rest_share_issue,
    rest_toggle_favorite_issue, rest_unshare_issue, rest_update_project_label,
    rest_update_project_label_category, rest_update_project_milestone, session::SessionManager,
    user_issue_filter_name, user_issue_state, visible_projects_for_organization,
    visible_user_issue_items, ConnectError, ErrorCode, MarkdownIssueReference,
    MarkdownMentionReference, PilotBackend, PilotRepository, PilotServiceImpl,
    ProjectCreatableResource, RestDirectIssueFormOptionsResponse, RestDirectIssueFormProject,
    RestDirectIssueFormQuery, RestIssueAssignableUserItem, RestIssueAssignableUsersQuery,
    RestIssueAssignableUsersResponse, RestIssueAssigneeBody, RestIssueCommentBody,
    RestIssueDetailResponse, RestIssueMentionUserItem, RestIssueMentionUsersQuery,
    RestIssueMentionUsersResponse, RestIssueMutationBody, RestIssueParentOption,
    RestIssueParentOptionsQuery, RestIssueParentOptionsResponse, RestIssueSharerBody,
    RestIssueSharerDeleteQuery, RestIssueStateBody, RestIssueWeightResponse,
    RestMassUpdateIssuesBody, RestMilestoneListQuery, RestOrganizationIssueListResponse,
    RestOrganizationIssuesQuery, RestProjectIssueListResponse, RestProjectIssueReferenceItem,
    RestProjectIssueReferencesQuery, RestProjectIssueReferencesResponse, RestProjectIssuesQuery,
    RestProjectLabelCategoryBody, RestProjectLabelCopyBody, RestProjectLabelCreateBody,
    RestProjectLabelUpdateBody, RestProjectMilestoneBody, RestProjectMilestoneStateBody,
    RestRouteError, RestUserIssueListResponse, RestUserIssueSideFilterCounts, RestUserIssuesQuery,
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

pub(crate) async fn rest_list_project_issues(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestProjectIssuesQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestProjectIssueListResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid pilot project issue list request",
        ));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "project issues require repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization = require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let mut filter = rest_project_issue_filter_from_query(query);
    if let Some(actor_id) = actor_id {
        filter.draft_author_login_id = repository
            .find_user_by_id(actor_id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
            .map(|user| user.login_id);
    }
    let record = repository
        .list_project_issues_filtered(&owner_name, &project_name, filter)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;

    Ok(Json(RestProjectIssueListResponse {
        draft_items: record
            .draft_items
            .into_iter()
            .map(rest_issue_list_item_from_record)
            .collect(),
        items: record
            .items
            .into_iter()
            .map(rest_issue_list_item_from_record)
            .collect(),
        owner_name: authorization.project.owner_name,
        page_num: record.page_num,
        page_size: record.page_size,
        project_name: authorization.project.project_name,
        total_count: record.total_count,
    }))
}

pub(crate) async fn rest_list_issue_parent_options(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestIssueParentOptionsQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestIssueParentOptionsResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid issue parent options request",
        ));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue parent options require repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let options = repository
        .list_project_issue_parent_options(&owner_name, &project_name, query.current_issue_number)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(RestIssueParentOptionsResponse {
        items: options
            .into_iter()
            .map(|option| RestIssueParentOption {
                id: option.id,
                issue_number: option.issue_number,
                selected: option.selected,
                title: option.title,
            })
            .collect(),
    }))
}

pub(crate) async fn rest_list_organization_issues(
    headers: HeaderMap,
    organization_name: String,
    query: RestOrganizationIssuesQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestOrganizationIssueListResponse>, RestRouteError> {
    if organization_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid organization issue list request",
        ));
    }
    let state = if query.state.trim().is_empty() {
        "open".to_string()
    } else {
        normalize_identifier(&query.state)
    };
    if !matches!(state.as_str(), "open" | "closed") {
        return Err(RestRouteError::bad_request(
            "invalid organization issue state",
        ));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "organization issues require repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization = repository
        .read_organization_authorization(&organization_name, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("organization not found"))?;
    let visible_projects =
        visible_projects_for_organization(repository, authorization.organization.id, actor_id)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    let current_user_filter = |value: i64| {
        if value > 0 {
            actor_id.or(Some(-1))
        } else {
            None
        }
    };
    let record = repository
        .list_organization_issues_filtered(
            &authorization.organization.organization_name,
            visible_projects,
            persistence::OrganizationIssueListFilter {
                assignee_user_id: current_user_filter(query.assignee_id),
                author_id: current_user_filter(query.author_id),
                filter: Some(query.filter).filter(|value| !value.trim().is_empty()),
                items_per_page: query.items_per_page,
                mention_user_id: current_user_filter(query.mention_id),
                order_by: query.order_by,
                order_dir: query.order_dir,
                page_num: query.page_num,
                project_names: query.project_names,
                state,
            },
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;

    Ok(Json(RestOrganizationIssueListResponse {
        closed_issue_count: record.closed_issue_count,
        items: record
            .items
            .into_iter()
            .map(rest_issue_list_item_from_record)
            .collect(),
        open_issue_count: record.open_issue_count,
        organization_name: record.organization_name,
        page_num: record.page_num,
        page_size: record.page_size,
        total_count: record.total_count,
        visible_projects: record
            .visible_projects
            .into_iter()
            .map(|project| OrganizationIssueProjectOption {
                owner_name: project.owner_name,
                project_name: project.project_name,
                ..Default::default()
            })
            .collect(),
    }))
}

pub(crate) async fn rest_list_user_issues(
    headers: HeaderMap,
    query: RestUserIssuesQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestUserIssueListResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "user issues require repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let filter_name =
        user_issue_filter_name(&query.filter).map_err(RestRouteError::from_connect_error)?;
    let state = user_issue_state(&query.state).map_err(RestRouteError::from_connect_error)?;
    const DEFAULT_PAGE_SIZE: u32 = 15;
    const MAX_PAGE_SIZE: u32 = 45;
    let build_filter = |state: &str| persistence::UserIssueListFilter {
        filter: filter_name.clone(),
        order_by: if query.order_by.trim().is_empty() {
            "updatedDate".to_string()
        } else {
            query.order_by.trim().to_string()
        },
        order_dir: if query.order_dir.trim().is_empty() {
            "desc".to_string()
        } else {
            query.order_dir.trim().to_string()
        },
        page_num: query.page_num.max(1),
        page_size: if query.page_size == 0 {
            DEFAULT_PAGE_SIZE
        } else {
            query.page_size.min(MAX_PAGE_SIZE)
        },
        query: (!query.query.trim().is_empty()).then(|| query.query.trim().to_string()),
        state: state.to_string(),
    };
    let selected_filter = build_filter(&state);
    let open_filter = build_filter("open");
    let closed_filter = build_filter("closed");

    let mut selected_items =
        visible_user_issue_items(repository, actor.id, selected_filter.clone())
            .await
            .map_err(RestRouteError::from_connect_error)?;
    let open_issue_count = visible_user_issue_items(repository, actor.id, open_filter)
        .await
        .map_err(RestRouteError::from_connect_error)?
        .len() as u32;
    let closed_issue_count = visible_user_issue_items(repository, actor.id, closed_filter)
        .await
        .map_err(RestRouteError::from_connect_error)?
        .len() as u32;
    let side_filter_counts = {
        let build_side_filter = |filter: &str| persistence::UserIssueListFilter {
            filter: filter.to_string(),
            order_by: "updatedDate".to_string(),
            order_dir: "desc".to_string(),
            page_num: 1,
            page_size: MAX_PAGE_SIZE,
            query: None,
            state: "open".to_string(),
        };
        RestUserIssueSideFilterCounts {
            favorite: visible_user_issue_items(repository, actor.id, build_side_filter("favorite"))
                .await
                .map_err(RestRouteError::from_connect_error)?
                .len() as u32,
            mentioned: visible_user_issue_items(
                repository,
                actor.id,
                build_side_filter("mentioned"),
            )
            .await
            .map_err(RestRouteError::from_connect_error)?
            .len() as u32,
            shared: visible_user_issue_items(repository, actor.id, build_side_filter("shared"))
                .await
                .map_err(RestRouteError::from_connect_error)?
                .len() as u32,
        }
    };
    let page_num = selected_filter.page_num.max(1);
    let page_size = selected_filter.page_size.max(1);
    let total_count = selected_items.len() as u32;
    let offset = ((page_num - 1) * page_size) as usize;
    let items = selected_items
        .drain(..)
        .skip(offset)
        .take(page_size as usize)
        .map(rest_issue_list_item_from_record)
        .collect();

    Ok(Json(RestUserIssueListResponse {
        closed_issue_count,
        filter: filter_name,
        items,
        open_issue_count,
        page_num,
        page_size,
        side_filter_counts,
        state,
        total_count,
        viewer_user_id: actor.id,
    }))
}

pub(crate) async fn rest_read_direct_issue_form_options(
    headers: HeaderMap,
    query: RestDirectIssueFormQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Result<Json<RestDirectIssueFormOptionsResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "direct issue form requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let selected_project = if query.mine {
        repository
            .read_direct_my_issue_project(&actor.login_id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
            .map(|project| persistence::ProjectListEntry {
                owner_name: project.owner_name,
                project_name: project.project_name,
            })
    } else {
        repository
            .list_recent_projects_for_user(actor.id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
            .into_iter()
            .next()
    }
    .ok_or_else(|| RestRouteError::not_found("project.is.empty"))?;
    require_project_read(
        repository,
        &selected_project.owner_name,
        &selected_project.project_name,
        session.user_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;

    let mut body_markdown = String::new();
    let mut refer_comment_id = String::new();
    if let Some(comment_id) = query.comment_id.filter(|comment_id| *comment_id > 0) {
        let origin = repository
            .read_issue_comment_origin(comment_id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
            .ok_or_else(|| RestRouteError::not_found("issue comment not found"))?;
        require_project_read(
            repository,
            &origin.owner_name,
            &origin.project_name,
            session.user_id,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?;
        body_markdown =
            direct_issue_body_markdown_from_comment(&origin, &public_origin, &base_path);
        refer_comment_id = origin.comment_id.to_string();
    }

    Ok(Json(RestDirectIssueFormOptionsResponse {
        body_markdown,
        refer_comment_id,
        selected_project: RestDirectIssueFormProject {
            owner_name: selected_project.owner_name,
            project_name: selected_project.project_name,
        },
    }))
}

fn issue_comment_path(origin: &persistence::IssueCommentOriginRecord) -> String {
    format!(
        "/{}/{}/issue/{}#comment-{}",
        origin.owner_name, origin.project_name, origin.issue_number, origin.comment_id
    )
}

fn direct_issue_body_markdown_from_comment(
    origin: &persistence::IssueCommentOriginRecord,
    public_origin: &str,
    base_path: &str,
) -> String {
    let source_url = absolute_app_url(public_origin, base_path, &issue_comment_path(origin));
    format!(
        "{}\n\n_Originally posted by @{} in {}_",
        origin.contents_markdown, origin.author_login_id, source_url
    )
}

fn derived_issue_comment_markdown(
    issue: &persistence::IssueRecord,
    public_origin: &str,
    base_path: &str,
) -> String {
    let path = format!(
        "/{}/{}/issue/{}",
        issue.owner_name, issue.project_name, issue.issue_number
    );
    format!(
        "issue.derived:{}",
        absolute_app_url(public_origin, base_path, &path)
    )
}

pub(crate) async fn rest_read_issue_detail(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() || issue_number <= 0 {
        return Err(RestRouteError::bad_request(
            "invalid pilot issue detail request",
        ));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let access = read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        actor_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(
        rest_issue_detail_response_from_access_with_repository_issue_references(
            repository, &access, actor_id, &base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

fn rest_issue_assignable_users_response(
    record: persistence::IssueAssignableUserSearchRecord,
) -> RestIssueAssignableUsersResponse {
    RestIssueAssignableUsersResponse {
        items: record
            .items
            .into_iter()
            .map(|item| RestIssueAssignableUserItem {
                avatar_url: item.avatar_url,
                display_name: item.display_name,
                login_id: item.login_id,
                pure_name_only: item.pure_name_only,
                r#type: item.item_type,
            })
            .collect(),
        total: record.total,
        truncated: record.truncated,
    }
}

pub(crate) async fn rest_list_project_assignable_users(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestIssueAssignableUsersQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestIssueAssignableUsersResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid project assignable users request",
        ));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "project assignable users require repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .list_project_assignable_users(
            &owner_name,
            &project_name,
            actor_id,
            &query.query,
            &query.search_type,
            10,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot project not found"))?;

    Ok(Json(rest_issue_assignable_users_response(record)))
}

pub(crate) async fn rest_list_issue_assignable_users(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    query: RestIssueAssignableUsersQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestIssueAssignableUsersResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() || issue_number <= 0 {
        return Err(RestRouteError::bad_request(
            "invalid issue assignable users request",
        ));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue assignable users require repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        actor_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .list_issue_assignable_users(
            &owner_name,
            &project_name,
            issue_number,
            actor_id,
            &query.query,
            &query.search_type,
            10,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;

    Ok(Json(rest_issue_assignable_users_response(record)))
}

pub(crate) async fn rest_list_issue_sharable_users(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    query: RestIssueAssignableUsersQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestIssueAssignableUsersResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() || issue_number <= 0 {
        return Err(RestRouteError::bad_request(
            "invalid issue sharable users request",
        ));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue sharable users require repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        actor_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .list_issue_sharable_users(
            &owner_name,
            &project_name,
            issue_number,
            &query.query,
            &query.search_type,
            10,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;

    Ok(Json(rest_issue_assignable_users_response(record)))
}

fn rest_issue_mention_users_response(
    record: persistence::IssueMentionUserSearchRecord,
) -> RestIssueMentionUsersResponse {
    RestIssueMentionUsersResponse {
        items: record
            .items
            .into_iter()
            .map(|item| RestIssueMentionUserItem {
                avatar_url: item.avatar_url,
                display_name: item.display_name,
                login_id: item.login_id,
                search_text: item.search_text,
                r#type: item.item_type,
            })
            .collect(),
        total: record.total,
        truncated: record.truncated,
    }
}

pub(crate) async fn rest_list_issue_mention_users(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    query: RestIssueMentionUsersQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestIssueMentionUsersResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() || issue_number <= 0 {
        return Err(RestRouteError::bad_request(
            "invalid issue mention users request",
        ));
    }

    let context = if query.context.trim().is_empty() {
        "issue-comment"
    } else {
        query.context.trim()
    };
    if !matches!(context, "issue-body" | "issue-comment") {
        return Err(RestRouteError::bad_request("invalid issue mention context"));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue mention users require repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        actor_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .list_issue_mention_users(
            &owner_name,
            &project_name,
            issue_number,
            actor_id,
            &query.query,
            context,
            10,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;

    Ok(Json(rest_issue_mention_users_response(record)))
}

fn rest_project_issue_references_response(
    record: persistence::ProjectIssueReferenceSearchRecord,
) -> RestProjectIssueReferencesResponse {
    RestProjectIssueReferencesResponse {
        items: record
            .items
            .into_iter()
            .map(|item| RestProjectIssueReferenceItem {
                issue_number: item.issue_number,
                state: item.state,
                title: item.title,
            })
            .collect(),
        total: record.total,
        truncated: record.truncated,
    }
}

pub(crate) async fn resolve_issue_reference_search_project(
    repository: &PilotRepository,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
) -> Result<persistence::ProjectRecord, ConnectError> {
    let Some(origin_project_id) = authorization.project.original_project_id else {
        return Ok(authorization.project.clone());
    };
    let Some(origin_project) = repository
        .read_project_by_id(origin_project_id)
        .await
        .map_err(internal_error)?
    else {
        return Ok(authorization.project.clone());
    };

    match require_project_read(
        repository,
        &origin_project.owner_name,
        &origin_project.project_name,
        actor_id,
    )
    .await
    {
        Ok(origin_authorization) => Ok(origin_authorization.project),
        Err(error)
            if matches!(
                error.code,
                ErrorCode::NotFound | ErrorCode::PermissionDenied
            ) =>
        {
            Ok(authorization.project.clone())
        }
        Err(error) => Err(error),
    }
}

pub(crate) async fn rest_list_project_issue_references(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestProjectIssueReferencesQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestProjectIssueReferencesResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid project issue references request",
        ));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "project issue references require repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization = require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let search_project =
        resolve_issue_reference_search_project(repository, &authorization, actor_id)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .list_project_issue_references(search_project.id, &query.query, 10)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;

    Ok(Json(rest_project_issue_references_response(record)))
}

pub(crate) async fn rest_update_issue_state(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    body: RestIssueStateBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let state = normalize_identifier(&body.state);
    if issue_number <= 0 || !matches!(state.as_str(), "open" | "closed") {
        return Err(RestRouteError::bad_request(
            "invalid pilot issue state request",
        ));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization =
        require_project_authorization(repository, &owner_name, &project_name, session.user_id)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    let existing = repository
        .read_issue_detail(&owner_name, &project_name, issue_number)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    if !issue_can_mutate(&authorization, &existing, &actor) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("issue state update is not allowed"),
        ));
    }
    let issue = repository
        .update_issue_state_as_actor(
            &owner_name,
            &project_name,
            issue_number,
            &state,
            actor.id,
            &actor.login_id,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    Ok(Json(
        rest_issue_detail_response_from_record_with_authorization_issue_references(
            repository,
            &issue,
            &authorization,
            true,
            true,
            session.user_id,
            &base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_create_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestIssueMutationBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if body.title.trim().is_empty() {
        return Err(RestRouteError::bad_request("issue.error.emptyTitle"));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization = require_project_resource_create(
        repository,
        &owner_name,
        &project_name,
        session.user_id,
        ProjectCreatableResource::IssuePost,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let refer_comment_id = body.refer_comment_id.filter(|comment_id| *comment_id > 0);
    let refer_comment_origin = match refer_comment_id {
        Some(comment_id) => {
            let origin = repository
                .read_issue_comment_origin(comment_id)
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?
                .ok_or_else(|| RestRouteError::not_found("issue comment not found"))?;
            require_project_read(
                repository,
                &origin.owner_name,
                &origin.project_name,
                session.user_id,
            )
            .await
            .map_err(RestRouteError::from_connect_error)?;
            Some(origin)
        }
        None => None,
    };
    let issue = repository
        .create_issue(persistence::CreateIssueInput {
            actor_display_name: actor.display_name.clone(),
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name,
            project_name,
            values: rest_issue_mutation_input_from_body(body)
                .map_err(RestRouteError::from_connect_error)?,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    if !issue.is_draft {
        if let (Some(origin), Some(parent_comment_id)) = (refer_comment_origin, refer_comment_id) {
            repository
                .create_issue_comment(persistence::CreateIssueCommentInput {
                    actor_display_name: actor.display_name.clone(),
                    actor_id: actor.id,
                    actor_login_id: actor.login_id.clone(),
                    attachment_ids: Vec::new(),
                    contents_markdown: derived_issue_comment_markdown(
                        &issue,
                        &public_origin,
                        &base_path,
                    ),
                    issue_number: origin.issue_number,
                    owner_name: origin.owner_name,
                    parent_comment_id: Some(parent_comment_id),
                    project_name: origin.project_name,
                })
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?
                .ok_or_else(|| RestRouteError::not_found("source issue not found"))?;
        }
        dispatch_issue_webhooks(
            repository,
            &issue,
            &actor,
            "NEW_ISSUE",
            &issue.body_markdown,
            None,
            &public_origin,
            &base_path,
        )
        .await;
    }
    Ok(Json(
        rest_issue_detail_response_from_record_with_authorization_issue_references(
            repository,
            &issue,
            &authorization,
            true,
            true,
            session.user_id,
            &base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_update_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    body: RestIssueMutationBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if issue_number <= 0 || body.title.trim().is_empty() {
        return Err(RestRouteError::bad_request("invalid issue update request"));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization =
        require_project_authorization(repository, &owner_name, &project_name, session.user_id)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    let existing = repository
        .read_issue_detail(&owner_name, &project_name, issue_number)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    if !issue_can_mutate(&authorization, &existing, &actor) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("issue update is not allowed"),
        ));
    }
    let issue = repository
        .update_issue(persistence::UpdateIssueInput {
            actor_login_id: actor.login_id,
            issue_number,
            owner_name,
            project_name,
            values: rest_issue_mutation_input_from_body(body)
                .map_err(RestRouteError::from_connect_error)?,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    Ok(Json(
        rest_issue_detail_response_from_record_with_authorization_issue_references(
            repository,
            &issue,
            &authorization,
            true,
            true,
            session.user_id,
            &base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_delete_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<DeleteIssueResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization =
        require_project_read(repository, &owner_name, &project_name, session.user_id)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    let existing = repository
        .read_issue_detail(&owner_name, &project_name, issue_number)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    if !issue_can_mutate(&authorization, &existing, &actor) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("issue delete is not allowed"),
        ));
    }
    if !repository
        .delete_issue(&owner_name, &project_name, issue_number)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
    {
        return Err(RestRouteError::not_found("pilot issue not found"));
    }
    Ok(Json(DeleteIssueResponse {
        issue_number,
        owner_name,
        project_name,
        ..Default::default()
    }))
}

pub(crate) async fn rest_create_issue_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    body: RestIssueCommentBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if issue_number <= 0 || body.contents_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request("invalid issue comment request"));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        Some(actor.id),
    )
    .await;
    let authorization = match &access {
        Ok(access) if access.viewer_can_comment() => access.authorization.clone(),
        Ok(_) => {
            return Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("issue comment create is not allowed"),
            ));
        }
        Err(_) => require_project_resource_create(
            repository,
            &owner_name,
            &project_name,
            session.user_id,
            ProjectCreatableResource::IssueComment,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    };
    let issue = repository
        .create_issue_comment(persistence::CreateIssueCommentInput {
            actor_display_name: actor.display_name.clone(),
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            attachment_ids: body.attachment_ids,
            contents_markdown: body.contents_markdown.clone(),
            issue_number,
            owner_name,
            parent_comment_id: body.parent_comment_id,
            project_name,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    let created_comment = issue.comments.iter().max_by_key(|comment| comment.id);
    let target_fragment = created_comment
        .map(|comment| format!("#comment-{}", comment.id))
        .unwrap_or_default();
    let detail_markdown = created_comment
        .map(|comment| comment.contents_markdown.as_str())
        .unwrap_or_else(|| body.contents_markdown.as_str());
    dispatch_issue_webhooks(
        repository,
        &issue,
        &actor,
        "NEW_COMMENT",
        detail_markdown,
        (!target_fragment.is_empty()).then_some(target_fragment.as_str()),
        &public_origin,
        &base_path,
    )
    .await;
    Ok(Json(
        rest_issue_detail_response_from_record_with_authorization_issue_references(
            repository,
            &issue,
            &authorization,
            issue_can_mutate(&authorization, &issue, &actor),
            true,
            session.user_id,
            &base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_update_issue_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    comment_id: i64,
    body: RestIssueCommentBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if issue_number <= 0 || comment_id <= 0 {
        return Err(RestRouteError::bad_request("invalid issue comment request"));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        Some(actor.id),
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let comment_author = access
        .issue
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
        .and_then(|comment| comment.author_id);
    if comment_author != Some(actor.id) && !access.viewer_can_manage() {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("issue comment update is not allowed"),
        ));
    }
    let issue = repository
        .update_issue_comment(persistence::UpdateIssueCommentInput {
            actor_id: actor.id,
            attachment_ids: body.attachment_ids,
            comment_id,
            contents_markdown: body.contents_markdown,
            issue_number,
            owner_name,
            project_name,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    Ok(Json(
        rest_issue_detail_response_from_record_with_access_issue_references(
            repository,
            &issue,
            &access,
            session.user_id,
            &base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_delete_issue_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    comment_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        Some(actor.id),
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let comment_author = access
        .issue
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
        .and_then(|comment| comment.author_id);
    if comment_author != Some(actor.id) && !access.viewer_can_manage() {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("issue comment delete is not allowed"),
        ));
    }
    let issue = repository
        .delete_issue_comment(&owner_name, &project_name, issue_number, comment_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    Ok(Json(
        rest_issue_detail_response_from_record_with_access_issue_references(
            repository,
            &issue,
            &access,
            session.user_id,
            &base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_update_issue_weight(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    delta: i16,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestIssueWeightResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if issue_number <= 0 {
        return Err(RestRouteError::bad_request("invalid issue weight request"));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        Some(actor.id),
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    if !issue_can_mutate(&access.authorization, &access.issue, &actor) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("issue weight update is not allowed"),
        ));
    }
    let issue = repository
        .update_issue_weight(
            &owner_name,
            &project_name,
            issue_number,
            delta,
            session.user_id,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    Ok(Json(RestIssueWeightResponse {
        weight: issue.weight,
    }))
}

pub(crate) async fn rest_mass_update_issues(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestMassUpdateIssuesBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<MassUpdateIssuesResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization =
        require_project_read(repository, &owner_name, &project_name, session.user_id)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    for issue_number in body.issue_numbers.iter().copied() {
        let issue = repository
            .read_issue_detail(&owner_name, &project_name, issue_number)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
            .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
        if !issue_can_mutate(&authorization, &issue, &actor) {
            return Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("issue mass update is not allowed"),
            ));
        }
    }
    let updated_issues = repository
        .mass_update_issues(
            persistence::MassUpdateIssuesInput {
                add_label_ids: body.add_label_ids,
                assignee_login_id: (!body.assignee_login_id.trim().is_empty())
                    .then(|| body.assignee_login_id.trim().to_string()),
                assignee_update: body.assignee_update,
                issue_numbers: body.issue_numbers,
                milestone_id: body.milestone_id.filter(|value| *value > 0),
                milestone_update: body.milestone_update,
                owner_name,
                project_name,
                remove_label_ids: body.remove_label_ids,
                state: (!body.state.trim().is_empty()).then(|| body.state.trim().to_string()),
            },
            actor.id,
            &actor.login_id,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let mut items = Vec::with_capacity(updated_issues.len());
    for issue in updated_issues {
        items.push(
            issue_detail_response_from_record_with_repository_issue_references(
                repository,
                &issue,
                true,
                true,
                session.user_id,
                &base_path,
            )
            .await
            .map_err(RestRouteError::from_connect_error)?,
        );
    }
    Ok(Json(MassUpdateIssuesResponse {
        items,
        ..Default::default()
    }))
}

pub(crate) fn issue_can_mutate(
    authorization: &persistence::ProjectAuthorizationRecord,
    issue: &persistence::IssueRecord,
    actor: &persistence::AppUserRecord,
) -> bool {
    authorization.viewer.is_site_admin
        || authorization.viewer.is_organization_admin
        || authorization.viewer.is_project_manager
        || authorization.viewer.is_project_member
        || issue.author_id == Some(actor.id)
        || (!issue.assignee_login_id.is_empty()
            && issue
                .assignee_login_id
                .eq_ignore_ascii_case(&actor.login_id))
}

pub(crate) struct IssueAccessContext {
    pub(crate) authorization: persistence::ProjectAuthorizationRecord,
    pub(crate) issue: persistence::IssueRecord,
    pub(crate) actor: Option<persistence::AppUserRecord>,
    pub(crate) project_can_read: bool,
    pub(crate) share_status: persistence::IssueShareStatus,
}

impl IssueAccessContext {
    pub(crate) fn viewer_can_manage(&self) -> bool {
        self.actor
            .as_ref()
            .is_some_and(|actor| issue_can_mutate(&self.authorization, &self.issue, actor))
    }

    pub(crate) fn viewer_can_comment(&self) -> bool {
        self.actor.is_some() && (self.project_can_read || self.share_status.direct)
    }
}

pub(crate) async fn read_issue_access(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    issue_number: i64,
    actor_id: Option<i64>,
) -> Result<IssueAccessContext, ConnectError> {
    let authorization = repository
        .read_project_authorization(owner_name, project_name, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let issue = repository
        .read_issue_detail_for_viewer(owner_name, project_name, issue_number, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
    let actor = match actor_id {
        Some(user_id) => repository
            .find_user_by_id(user_id)
            .await
            .map_err(internal_error)?,
        None => None,
    };
    let project_can_read = project_read_allowed(&authorization, actor_id.is_none())?;
    let share_status = match actor_id {
        Some(user_id) => repository
            .read_issue_share_status(issue.id, user_id)
            .await
            .map_err(internal_error)?,
        None => persistence::IssueShareStatus::default(),
    };
    if issue.is_draft
        && !actor
            .as_ref()
            .is_some_and(|actor| issue.author_id == Some(actor.id))
    {
        return Err(ConnectError::permission_denied(
            "draft issue read is not allowed",
        ));
    }
    let issue_specific_can_read = actor
        .as_ref()
        .is_some_and(|actor| issue_can_mutate(&authorization, &issue, actor));
    if project_can_read
        || share_status.direct
        || share_status.inherited_from_parent
        || issue_specific_can_read
    {
        Ok(IssueAccessContext {
            authorization,
            issue,
            actor,
            project_can_read,
            share_status,
        })
    } else {
        Err(ConnectError::permission_denied("issue read is not allowed"))
    }
}

async fn rest_issue_detail_response_from_record_with_access_issue_references(
    repository: &PilotRepository,
    issue: &persistence::IssueRecord,
    access: &IssueAccessContext,
    viewer_id: Option<i64>,
    base_path: &str,
) -> Result<RestIssueDetailResponse, ConnectError> {
    let mut markdowns = vec![
        issue.body_markdown.as_str(),
        issue.history_markdown.as_str(),
    ];
    markdowns.extend(
        issue
            .comments
            .iter()
            .map(|comment| comment.contents_markdown.as_str()),
    );
    let issue_references = markdown_issue_references_for_project(
        repository,
        &access.authorization,
        viewer_id,
        &markdowns,
    )
    .await?;
    let mention_references = markdown_mention_references(repository, &markdowns).await?;
    Ok(
        rest_issue_detail_response_from_record_with_sharer_flags_and_references(
            issue,
            access.viewer_can_manage(),
            access.viewer_can_comment(),
            access.share_status.direct,
            access.share_status.inherited_from_parent,
            viewer_id,
            base_path,
            &issue_references,
            &mention_references,
        ),
    )
}

async fn rest_issue_detail_response_from_record_with_authorization_issue_references(
    repository: &PilotRepository,
    issue: &persistence::IssueRecord,
    authorization: &persistence::ProjectAuthorizationRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_id: Option<i64>,
    base_path: &str,
) -> Result<RestIssueDetailResponse, ConnectError> {
    let mut markdowns = vec![
        issue.body_markdown.as_str(),
        issue.history_markdown.as_str(),
    ];
    markdowns.extend(
        issue
            .comments
            .iter()
            .map(|comment| comment.contents_markdown.as_str()),
    );
    let issue_references =
        markdown_issue_references_for_project(repository, authorization, viewer_id, &markdowns)
            .await?;
    let mention_references = markdown_mention_references(repository, &markdowns).await?;
    Ok(
        rest_issue_detail_response_from_record_with_sharer_flags_and_references(
            issue,
            viewer_can_manage,
            viewer_can_comment,
            false,
            false,
            viewer_id,
            base_path,
            &issue_references,
            &mention_references,
        ),
    )
}

pub(crate) fn issue_detail_response_from_access(
    access: &IssueAccessContext,
    viewer_id: Option<i64>,
    base_path: &str,
) -> ReadIssueDetailResponse {
    issue_detail_response_from_record_with_sharer_flags(
        &access.issue,
        access.viewer_can_manage(),
        access.viewer_can_comment(),
        access.share_status.direct,
        access.share_status.inherited_from_parent,
        viewer_id,
        base_path,
    )
}

pub(crate) async fn rest_issue_detail_response_from_access_with_repository_issue_references(
    repository: &PilotRepository,
    access: &IssueAccessContext,
    viewer_id: Option<i64>,
    base_path: &str,
) -> Result<RestIssueDetailResponse, ConnectError> {
    let mut markdowns = vec![
        access.issue.body_markdown.as_str(),
        access.issue.history_markdown.as_str(),
    ];
    markdowns.extend(
        access
            .issue
            .comments
            .iter()
            .map(|comment| comment.contents_markdown.as_str()),
    );
    let issue_references = markdown_issue_references_for_project(
        repository,
        &access.authorization,
        viewer_id,
        &markdowns,
    )
    .await?;
    let mention_references = markdown_mention_references(repository, &markdowns).await?;
    Ok(
        rest_issue_detail_response_from_record_with_sharer_flags_and_references(
            &access.issue,
            access.viewer_can_manage(),
            access.viewer_can_comment(),
            access.share_status.direct,
            access.share_status.inherited_from_parent,
            viewer_id,
            base_path,
            &issue_references,
            &mention_references,
        ),
    )
}
