use axum::{
    extract::{Form, Path, RawQuery},
    http::{HeaderMap, StatusCode},
    routing::{delete, get, patch, post},
    Json, Router,
};
use std::collections::HashMap;
use yona_rust_vcs::VcsError;

use crate::{
    code_browser_error, direct_create_posting_comment, direct_delete_posting_comment,
    direct_update_posting_comment, escape_html_attr, escape_html_text, internal_error,
    issue_attachment_from_record, issue_label_from_record,
    legacy_external_create_board_posting_comment, legacy_external_create_board_postings,
    legacy_external_update_board_posting_content, legacy_external_update_board_posting_labels,
    legacy_update_posting_comment, markdown_issue_references_for_project,
    markdown_mention_references, normalize_identifier, persistence, project_read_allowed,
    project_resource_create_allowed, project_update_allowed, require_authenticated_user,
    require_project_read, require_project_resource_create, require_session, require_valid_csrf,
    rest_board_label_from_record, rest_issue_reference_metadata_from_resolved,
    rest_mention_reference_metadata_from_resolved,
    rest_post_detail_response_from_record_with_access_issue_references,
    rest_post_detail_response_from_record_with_repository_issue_references,
    rest_post_list_item_from_record, rest_post_mutation_input_from_body,
    rewrite_project_readme_markdown_links, session::SessionManager,
    visible_projects_for_organization, yona_data_root, ConnectError, MarkdownIssueReference,
    MarkdownMentionReference, PilotBackend, PilotRepository, ProjectCreatableResource,
    RestIssueReferenceMetadata, RestMentionReferenceMetadata, RestOrganizationBoardProjectOption,
    RestOrganizationBoardsQuery, RestOrganizationBoardsResponse, RestPostCommentBody,
    RestPostDefaultPermissions, RestPostDetailResponse, RestPostFormOptionsQuery,
    RestPostMutationBody, RestPostMutationResponse, RestPostOnlineCommitOptions,
    RestPostOnlineCommitResponse, RestProjectPostFormOptionsResponse, RestProjectPostsQuery,
    RestProjectPostsResponse, RestRouteError,
};

pub(crate) fn rest_routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    Router::new()
        .route(
            "/projects/{owner_name}/{project_name}/posts",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      RawQuery(raw_query): RawQuery| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        let query = RestProjectPostsQuery::from_raw_query(raw_query.as_deref())?;
                        rest_list_project_posts(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            })
            .post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestPostMutationBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_create_posting(
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
            "/projects/{owner_name}/{project_name}/posts/form-options",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      RawQuery(raw_query): RawQuery| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        let query = RestPostFormOptionsQuery::from_raw_query(raw_query.as_deref())?;
                        rest_project_post_form_options(
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
            "/projects/{owner_name}/{project_name}/posts/{post_number}",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_read_posting_detail(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            session_manager,
                            backend,
                            base_path,
                        )
                        .await
                    }
                }
            })
            .patch({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestPostMutationBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_update_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
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
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_delete_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/posts/{post_number}/comments",
            post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestPostCommentBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_create_posting_comment(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
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
            "/projects/{owner_name}/{project_name}/posts/{post_number}/comments/{comment_id}",
            patch({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Json(body): Json<RestPostCommentBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_update_posting_comment(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
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
                      Path((owner_name, project_name, post_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_delete_posting_comment(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
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
            "/projects/{owner_name}/{project_name}/posts/{post_number}/watch",
            post({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_watch_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            session_manager,
                            backend,
                            base_path,
                            true,
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
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    async move {
                        rest_watch_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            session_manager,
                            backend,
                            base_path,
                            false,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/boards",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      RawQuery(raw_query): RawQuery| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        let query =
                            RestOrganizationBoardsQuery::from_raw_query(raw_query.as_deref())?;
                        rest_list_organization_boards(
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
}

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    let legacy_board_posts_backend = backend.clone();
    let legacy_board_posts_session_manager = session_manager.clone();
    let legacy_board_posts_base_path = base_path.clone();
    let legacy_board_content_backend = backend.clone();
    let legacy_board_content_session_manager = session_manager.clone();
    let legacy_board_comment_backend = backend.clone();
    let legacy_board_comment_session_manager = session_manager.clone();
    let legacy_board_comment_base_path = base_path.clone();
    let legacy_board_label_backend = backend.clone();
    let board_comment_create_backend = backend.clone();
    let board_comment_create_session_manager = session_manager.clone();
    let board_comment_create_base_path = base_path.clone();
    let board_comment_update_backend = backend.clone();
    let board_comment_update_session_manager = session_manager.clone();
    let board_comment_update_base_path = base_path.clone();
    let legacy_board_comment_update_backend = backend.clone();
    let legacy_board_comment_update_session_manager = session_manager.clone();
    let board_comment_delete_backend = backend.clone();
    let board_comment_delete_session_manager = session_manager.clone();
    let board_comment_delete_base_path = base_path.clone();

    Router::new()
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/posts",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_create_board_postings(
                            headers,
                            owner,
                            project_name,
                            body,
                            legacy_board_posts_session_manager.clone(),
                            legacy_board_posts_backend.clone(),
                            legacy_board_posts_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/posts/{number}/content",
            patch(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_board_posting_content(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_board_content_session_manager.clone(),
                            legacy_board_content_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/posts/{number}/comments",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_create_board_posting_comment(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_board_comment_session_manager.clone(),
                            legacy_board_comment_backend.clone(),
                            legacy_board_comment_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/postlabel/{number}",
            post(
                move |Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<Vec<serde_json::Value>>| {
                    async move {
                        legacy_external_update_board_posting_labels(
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_board_label_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/post/{number}/comment",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number)): Path<(String, String, i64)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_posting_comment(
                            headers,
                            owner,
                            project,
                            number,
                            form,
                            board_comment_create_session_manager.clone(),
                            board_comment_create_backend.clone(),
                            board_comment_create_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/post/{number}/comment/{comment_id}",
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
                        direct_update_posting_comment(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            form,
                            board_comment_update_session_manager.clone(),
                            board_comment_update_backend.clone(),
                            board_comment_update_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/post/{number}/comment/{comment_id}",
            patch(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_update_posting_comment(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            body,
                            legacy_board_comment_update_session_manager.clone(),
                            legacy_board_comment_update_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/post/{number}/comment/{comment_id}/delete",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    async move {
                        direct_delete_posting_comment(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            board_comment_delete_session_manager.clone(),
                            board_comment_delete_backend.clone(),
                            board_comment_delete_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}

struct RestPostOnlineCommitInput {
    branch: String,
    contents: String,
    edit: bool,
    enabled: bool,
    issue_template: bool,
    path: String,
    title: String,
}

fn rest_post_online_commit_input(body: &RestPostMutationBody) -> RestPostOnlineCommitInput {
    let issue_template = body.issue_template;
    let has_path = !body.path.trim().is_empty();
    let mut path = if issue_template {
        "ISSUE_TEMPLATE.md".to_string()
    } else {
        body.path.trim().trim_matches('/').to_string()
    };
    if !issue_template && !body.edit && !body.new_file_name.trim().is_empty() {
        let file_name = body.new_file_name.trim().trim_matches('/');
        path = if path.is_empty() {
            file_name.to_string()
        } else {
            format!("{path}/{file_name}")
        };
    }
    let contents = normalize_online_commit_line_endings(&body.body_markdown, &body.line_ending);
    let title = if !body.title.trim().is_empty() {
        body.title.trim().to_string()
    } else if issue_template {
        "ISSUE_TEMPLATE.md: Project Issue Template".to_string()
    } else {
        format!("Update {path}")
    };
    RestPostOnlineCommitInput {
        branch: body.branch.trim().to_string(),
        contents,
        edit: body.edit,
        enabled: issue_template || has_path,
        issue_template,
        path,
        title,
    }
}

fn normalize_online_commit_line_endings(contents: &str, line_ending: &str) -> String {
    let normalized = contents.replace("\r\n", "\n").replace('\r', "\n");
    if line_ending.eq_ignore_ascii_case("CRLF") {
        normalized.replace('\n', "\r\n")
    } else {
        normalized
    }
}

fn rest_project_posting_filter_from_query(
    query: RestProjectPostsQuery,
) -> persistence::PostingListFilter {
    persistence::PostingListFilter {
        filter: (!query.filter.trim().is_empty()).then(|| query.filter.trim().to_string()),
        label_ids: query.label_ids,
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
    }
}

pub(crate) async fn rest_list_project_posts(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestProjectPostsQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestProjectPostsResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid project posting list request",
        ));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "project postings require repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization = require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .list_project_postings_filtered(
            &owner_name,
            &project_name,
            rest_project_posting_filter_from_query(query),
            actor_id,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let viewer_can_set_notice = actor_id.is_some() && posting_can_set_notice(&authorization);
    let viewer_can_create = actor_id.is_some() && posting_can_create(&authorization);
    let viewer_can_watch = actor_id.is_some() && posting_can_watch(&authorization);
    let readme = if let Some(readme) = record.readme.as_ref() {
        Some(
            rest_post_detail_response_from_record_with_repository_issue_references(
                repository,
                readme,
                actor_id,
                &base_path,
                viewer_can_create,
                false,
                false,
                viewer_can_create,
                viewer_can_set_notice,
                viewer_can_watch,
            )
            .await
            .map_err(RestRouteError::from_connect_error)?,
        )
    } else {
        None
    };

    Ok(Json(RestProjectPostsResponse {
        items: record
            .items
            .iter()
            .map(rest_post_list_item_from_record)
            .collect(),
        notices: record
            .notices
            .iter()
            .map(rest_post_list_item_from_record)
            .collect(),
        owner_name: authorization.project.owner_name,
        page_num: record.page_num,
        page_size: record.page_size,
        project_name: authorization.project.project_name,
        readme,
        total_count: record.total_count,
    }))
}

pub(crate) async fn rest_project_post_form_options(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestPostFormOptionsQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestProjectPostFormOptionsResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid project posting form options request",
        ));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "project posting form options require repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization = require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let labels = repository
        .list_project_labels(&owner_name, &project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let can_create = actor_id.is_some() && posting_can_create(&authorization);
    let can_mark_notice = actor_id.is_some() && posting_can_set_notice(&authorization);
    let can_mark_readme = can_mark_notice;
    let online_commit = rest_post_online_commit_options(&authorization, &query)
        .map_err(RestRouteError::from_connect_error)?;
    let can_attach_files =
        can_create && online_commit.path.is_empty() && !online_commit.issue_template;
    Ok(Json(RestProjectPostFormOptionsResponse {
        can_attach_files,
        can_mark_notice,
        can_mark_readme,
        default_permissions: RestPostDefaultPermissions {
            can_attach_files,
            can_create,
            can_mark_notice,
            can_mark_readme,
        },
        online_commit,
        labels: labels.iter().map(rest_board_label_from_record).collect(),
    }))
}

pub(crate) async fn rest_list_organization_boards(
    headers: HeaderMap,
    organization_name: String,
    query: RestOrganizationBoardsQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<RestOrganizationBoardsResponse>, RestRouteError> {
    if organization_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid organization board list request",
        ));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "organization boards require repository backend",
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
    let record = repository
        .list_organization_postings_filtered(
            &authorization.organization.organization_name,
            visible_projects,
            persistence::OrganizationPostingListFilter {
                filter: Some(query.filter).filter(|value| !value.trim().is_empty()),
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
                project_names: query.project_names,
            },
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;

    Ok(Json(RestOrganizationBoardsResponse {
        items: record
            .items
            .iter()
            .map(rest_post_list_item_from_record)
            .collect(),
        organization_name: record.organization_name,
        page_num: record.page_num,
        page_size: record.page_size,
        total_count: record.total_count,
        visible_projects: record
            .visible_projects
            .iter()
            .map(|project| RestOrganizationBoardProjectOption {
                owner_name: project.owner_name.clone(),
                project_name: project.project_name.clone(),
            })
            .collect(),
    }))
}

pub(crate) async fn rest_read_posting_detail(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    if post_number <= 0 {
        return Err(RestRouteError::bad_request(
            "invalid posting detail request",
        ));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "posting requires repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let access = read_posting_access(
        repository,
        &owner_name,
        &project_name,
        post_number,
        actor_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(
        rest_post_detail_response_from_record_with_repository_issue_references(
            repository,
            &access.posting,
            actor_id,
            &base_path,
            access.viewer_can_create(),
            access.viewer_can_update(),
            access.viewer_can_delete(),
            access.viewer_can_comment(),
            access.viewer_can_set_notice(),
            access.viewer_can_watch(),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_create_posting(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestPostMutationBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestPostMutationResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let online_commit = rest_post_online_commit_input(&body);
    if !online_commit.enabled && body.title.trim().is_empty() {
        return Err(RestRouteError::bad_request("post.error.emptyTitle"));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "posting requires repository backend",
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
        ProjectCreatableResource::BoardPost,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    if !posting_can_create(&authorization) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("posting create is not allowed"),
        ));
    }
    if online_commit.enabled {
        let response = create_online_commit_from_posting_form(
            &authorization,
            &online_commit,
            &actor,
            &base_path,
        )?;
        return Ok(Json(RestPostMutationResponse::OnlineCommit(response)));
    }
    if (body.notice || body.readme) && !posting_can_set_notice(&authorization) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("posting notice or readme update is not allowed"),
        ));
    }
    let should_sync_readme = body.readme;
    let readme_body_markdown = body.body_markdown.clone();
    let owner_name_for_sync = owner_name.clone();
    let project_name_for_sync = project_name.clone();
    let posting = repository
        .create_posting(persistence::CreatePostingInput {
            actor_display_name: actor.display_name.clone(),
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name,
            project_name,
            values: rest_post_mutation_input_from_body(body),
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    if should_sync_readme && posting.readme {
        sync_readme_posting_to_git(
            &authorization,
            &owner_name_for_sync,
            &project_name_for_sync,
            &readme_body_markdown,
            &actor,
        )?;
    }
    Ok(Json(RestPostMutationResponse::Detail(
        rest_post_detail_response_from_record_with_access_issue_references(
            repository,
            &authorization,
            &posting,
            session.user_id,
            &base_path,
            posting_can_create(&authorization),
            posting_can_update(&authorization, &posting, &actor),
            posting_can_delete(&authorization, &posting, &actor),
            posting_can_comment(&authorization, &posting, &actor),
            posting_can_set_notice(&authorization),
            posting_can_watch(&authorization),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    )))
}

pub(crate) async fn rest_update_posting(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    body: RestPostMutationBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if post_number <= 0 || body.title.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid posting update request",
        ));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "posting requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_posting_access(
        repository,
        &owner_name,
        &project_name,
        post_number,
        session.user_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    if !posting_can_update(&access.authorization, &access.posting, &actor) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("posting update is not allowed"),
        ));
    }
    if (body.notice != access.posting.notice || body.readme != access.posting.readme)
        && !posting_can_set_notice(&access.authorization)
    {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("posting notice or readme update is not allowed"),
        ));
    }
    let should_sync_readme = body.readme;
    let readme_body_markdown = body.body_markdown.clone();
    let owner_name_for_sync = owner_name.clone();
    let project_name_for_sync = project_name.clone();
    let posting = repository
        .update_posting(persistence::UpdatePostingInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name,
            post_number,
            project_name,
            values: rest_post_mutation_input_from_body(body),
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot posting not found"))?;
    if should_sync_readme && posting.readme {
        sync_readme_posting_to_git(
            &access.authorization,
            &owner_name_for_sync,
            &project_name_for_sync,
            &readme_body_markdown,
            &actor,
        )?;
    }
    Ok(Json(
        rest_post_detail_response_from_record_with_repository_issue_references(
            repository,
            &posting,
            session.user_id,
            &base_path,
            posting_can_create(&access.authorization),
            posting_can_update(&access.authorization, &posting, &actor),
            posting_can_delete(&access.authorization, &posting, &actor),
            posting_can_comment(&access.authorization, &posting, &actor),
            posting_can_set_notice(&access.authorization),
            posting_can_watch(&access.authorization),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_delete_posting(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<StatusCode, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "posting requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_posting_access(
        repository,
        &owner_name,
        &project_name,
        post_number,
        session.user_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    if !posting_can_delete(&access.authorization, &access.posting, &actor) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("posting delete is not allowed"),
        ));
    }
    if !repository
        .delete_posting(
            &owner_name,
            &project_name,
            post_number,
            actor.id,
            &actor.login_id,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
    {
        return Err(RestRouteError::not_found("pilot posting not found"));
    }
    Ok(StatusCode::NO_CONTENT)
}

pub(crate) async fn rest_create_posting_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    body: RestPostCommentBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if post_number <= 0 || body.contents_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid posting comment request",
        ));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "posting requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_posting_comment_create_access(
        repository,
        &owner_name,
        &project_name,
        post_number,
        &actor,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let posting = repository
        .create_posting_comment(persistence::CreatePostingCommentInput {
            actor_display_name: actor.display_name.clone(),
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            attachment_actor_id: None,
            attachment_ids: body.attachment_ids,
            contents_markdown: body.contents_markdown,
            created_at: None,
            owner_name,
            parent_comment_id: body.parent_comment_id,
            post_number,
            project_name,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot posting not found"))?;
    Ok(Json(
        rest_post_detail_response_from_record_with_access_issue_references(
            repository,
            &access.authorization,
            &posting,
            session.user_id,
            &base_path,
            posting_can_create(&access.authorization),
            posting_can_update(&access.authorization, &posting, &actor),
            posting_can_delete(&access.authorization, &posting, &actor),
            posting_can_comment(&access.authorization, &posting, &actor),
            posting_can_set_notice(&access.authorization),
            posting_can_watch(&access.authorization),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_update_posting_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    comment_id: i64,
    body: RestPostCommentBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if post_number <= 0 || comment_id <= 0 || body.contents_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid posting comment update request",
        ));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "posting requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_posting_access(
        repository,
        &owner_name,
        &project_name,
        post_number,
        session.user_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let can_edit_comment = access
        .posting
        .comments
        .iter()
        .any(|comment| comment.id == comment_id && comment.author_id == Some(actor.id))
        || posting_can_update(&access.authorization, &access.posting, &actor);
    if !can_edit_comment {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("posting comment update is not allowed"),
        ));
    }
    let posting = repository
        .update_posting_comment(persistence::UpdatePostingCommentInput {
            actor_id: actor.id,
            attachment_ids: body.attachment_ids,
            comment_id,
            contents_markdown: body.contents_markdown,
            owner_name,
            post_number,
            project_name,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("posting comment not found"))?;
    Ok(Json(
        rest_post_detail_response_from_record_with_repository_issue_references(
            repository,
            &posting,
            session.user_id,
            &base_path,
            posting_can_create(&access.authorization),
            posting_can_update(&access.authorization, &posting, &actor),
            posting_can_delete(&access.authorization, &posting, &actor),
            posting_can_comment(&access.authorization, &posting, &actor),
            posting_can_set_notice(&access.authorization),
            posting_can_watch(&access.authorization),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_delete_posting_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    comment_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if post_number <= 0 || comment_id <= 0 {
        return Err(RestRouteError::bad_request(
            "invalid posting comment delete request",
        ));
    }
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "posting requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_posting_access(
        repository,
        &owner_name,
        &project_name,
        post_number,
        session.user_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let can_delete_comment = access
        .posting
        .comments
        .iter()
        .any(|comment| comment.id == comment_id && comment.author_id == Some(actor.id))
        || posting_can_delete(&access.authorization, &access.posting, &actor);
    if !can_delete_comment {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("posting comment delete is not allowed"),
        ));
    }
    let posting = repository
        .delete_posting_comment(
            &owner_name,
            &project_name,
            post_number,
            comment_id,
            Some(actor.id),
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("posting comment not found"))?;
    Ok(Json(
        rest_post_detail_response_from_record_with_repository_issue_references(
            repository,
            &posting,
            session.user_id,
            &base_path,
            posting_can_create(&access.authorization),
            posting_can_update(&access.authorization, &posting, &actor),
            posting_can_delete(&access.authorization, &posting, &actor),
            posting_can_comment(&access.authorization, &posting, &actor),
            posting_can_set_notice(&access.authorization),
            posting_can_watch(&access.authorization),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_watch_posting(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    watch: bool,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    let session =
        require_session(&session_manager, &headers).map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "posting requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_posting_access(
        repository,
        &owner_name,
        &project_name,
        post_number,
        session.user_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    if !access.viewer_can_watch() {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("posting watch is not allowed"),
        ));
    }
    if watch {
        repository
            .watch_posting(access.posting.id, actor.id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
    } else {
        repository
            .unwatch_posting(access.posting.id, actor.id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
    }
    let updated = repository
        .read_posting_detail_for_viewer(&owner_name, &project_name, post_number, Some(actor.id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot posting not found"))?;
    Ok(Json(
        rest_post_detail_response_from_record_with_repository_issue_references(
            repository,
            &updated,
            session.user_id,
            &base_path,
            posting_can_create(&access.authorization),
            posting_can_update(&access.authorization, &updated, &actor),
            posting_can_delete(&access.authorization, &updated, &actor),
            posting_can_comment(&access.authorization, &updated, &actor),
            posting_can_set_notice(&access.authorization),
            posting_can_watch(&access.authorization),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

fn posting_project_scope(authorization: &persistence::ProjectAuthorizationRecord) -> String {
    normalize_identifier(&authorization.project.project_scope)
}

fn posting_public_logged_in_access(
    authorization: &persistence::ProjectAuthorizationRecord,
) -> bool {
    posting_project_scope(authorization) == "public"
}

fn posting_group_member_access(authorization: &persistence::ProjectAuthorizationRecord) -> bool {
    authorization.project.organization_id.is_some()
        && authorization.viewer.is_organization_member
        && matches!(
            posting_project_scope(authorization).as_str(),
            "public" | "protected"
        )
}

fn posting_member_or_admin_access(authorization: &persistence::ProjectAuthorizationRecord) -> bool {
    authorization.viewer.is_site_admin
        || authorization.viewer.is_organization_admin
        || authorization.viewer.is_project_manager
        || authorization.viewer.is_project_member
}

pub(crate) fn posting_can_create(authorization: &persistence::ProjectAuthorizationRecord) -> bool {
    posting_member_or_admin_access(authorization)
        || posting_group_member_access(authorization)
        || posting_public_logged_in_access(authorization)
}

pub(crate) fn posting_can_update(
    authorization: &persistence::ProjectAuthorizationRecord,
    posting: &persistence::PostingRecord,
    actor: &persistence::AppUserRecord,
) -> bool {
    posting_member_or_admin_access(authorization)
        || posting_group_member_access(authorization)
        || posting.author_id == Some(actor.id)
}

fn posting_can_delete(
    authorization: &persistence::ProjectAuthorizationRecord,
    posting: &persistence::PostingRecord,
    actor: &persistence::AppUserRecord,
) -> bool {
    posting_member_or_admin_access(authorization) || posting.author_id == Some(actor.id)
}

fn posting_can_set_notice(authorization: &persistence::ProjectAuthorizationRecord) -> bool {
    posting_member_or_admin_access(authorization) || posting_group_member_access(authorization)
}

fn sync_readme_posting_to_git(
    authorization: &persistence::ProjectAuthorizationRecord,
    owner_name: &str,
    project_name: &str,
    body_markdown: &str,
    actor: &persistence::AppUserRecord,
) -> Result<(), RestRouteError> {
    if !authorization.project.vcs.eq_ignore_ascii_case("GIT") {
        return Ok(());
    }
    let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), authorization.project.id);
    if !repo_path.exists() {
        return Ok(());
    }
    yona_rust_vcs::commit_readme_file(
        &repo_path,
        body_markdown,
        &actor.display_name,
        &actor.email_address,
    )
    .map(|_| ())
    .map_err(|error| {
        RestRouteError::from_connect_error(internal_error(format!(
            "failed to sync README posting for {owner_name}/{project_name}: {error}"
        )))
    })
}

fn rest_post_online_commit_options(
    authorization: &persistence::ProjectAuthorizationRecord,
    query: &RestPostFormOptionsQuery,
) -> Result<RestPostOnlineCommitOptions, ConnectError> {
    if !authorization.project.vcs.eq_ignore_ascii_case("GIT") {
        return Ok(RestPostOnlineCommitOptions::default());
    }
    let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), authorization.project.id);
    let issue_template = query.issue_template;
    let path = if issue_template {
        "ISSUE_TEMPLATE.md".to_string()
    } else {
        query
            .path
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or_default()
            .to_string()
    };
    if path.is_empty() {
        return Ok(RestPostOnlineCommitOptions::default());
    }
    let branch = query
        .branch
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .or_else(|| {
            yona_rust_vcs::read_branch_list(&repo_path)
                .ok()
                .map(|snapshot| snapshot.default_branch)
                .filter(|value| !value.is_empty())
        })
        .unwrap_or_else(|| "main".to_string());
    let prepared_body_markdown =
        match yona_rust_vcs::read_code_browser(&repo_path, Some(&branch), &path) {
            Ok(snapshot) => snapshot
                .file
                .filter(|file| !file.is_binary && !file.is_too_large)
                .map(|file| file.text)
                .unwrap_or_default(),
            Err(VcsError::NotFound) if !query.edit || issue_template => String::new(),
            Err(error) => return Err(code_browser_error(error)),
        };
    let title = if issue_template {
        "ISSUE_TEMPLATE.md: Project Issue Template".to_string()
    } else if query.edit {
        format!("Update {path}")
    } else {
        String::new()
    };
    Ok(RestPostOnlineCommitOptions {
        branch,
        edit: query.edit,
        issue_template,
        path,
        prepared_body_markdown,
        title,
    })
}

fn create_online_commit_from_posting_form(
    authorization: &persistence::ProjectAuthorizationRecord,
    input: &RestPostOnlineCommitInput,
    actor: &persistence::AppUserRecord,
    _base_path: &str,
) -> Result<RestPostOnlineCommitResponse, RestRouteError> {
    if !authorization.project.vcs.eq_ignore_ascii_case("GIT") {
        return Err(RestRouteError::bad_request(
            "online code editing requires a Git project",
        ));
    }
    if !project_update_allowed(authorization).map_err(RestRouteError::from_connect_error)? {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("online code editing is not allowed"),
        ));
    }
    if input.path.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "online code editing requires a file path",
        ));
    }
    let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), authorization.project.id);
    let branch = if input.branch.trim().is_empty() {
        None
    } else {
        Some(input.branch.as_str())
    };
    if input.edit && !input.issue_template {
        let snapshot = yona_rust_vcs::read_code_browser(&repo_path, branch, &input.path)
            .map_err(code_browser_error)
            .map_err(RestRouteError::from_connect_error)?;
        if snapshot.file.is_none() {
            return Err(RestRouteError::bad_request(
                "online code editing requires an existing file",
            ));
        }
    }
    let commit_id = yona_rust_vcs::commit_text_file(
        &repo_path,
        branch,
        &input.path,
        &input.contents,
        &input.title,
        &actor.display_name,
        &actor.email_address,
    )
    .map_err(code_browser_error)
    .map_err(RestRouteError::from_connect_error)?;
    let snapshot = yona_rust_vcs::read_code_browser(&repo_path, branch, &input.path)
        .map_err(code_browser_error)
        .map_err(RestRouteError::from_connect_error)?;
    let redirect_href = format!(
        "/{}/{}/code/{}/{}",
        authorization.project.owner_name,
        authorization.project.project_name,
        snapshot.selected_branch,
        snapshot.path
    );
    Ok(RestPostOnlineCommitResponse {
        branch: snapshot.selected_branch,
        commit_id,
        online_commit: true,
        path: snapshot.path,
        redirect_href,
    })
}

fn posting_can_comment(
    authorization: &persistence::ProjectAuthorizationRecord,
    posting: &persistence::PostingRecord,
    actor: &persistence::AppUserRecord,
) -> bool {
    posting_can_create(authorization) || posting.author_id == Some(actor.id)
}

fn posting_can_watch(authorization: &persistence::ProjectAuthorizationRecord) -> bool {
    posting_member_or_admin_access(authorization)
        || posting_group_member_access(authorization)
        || posting_public_logged_in_access(authorization)
}

pub(crate) struct PostingAccessContext {
    pub(crate) authorization: persistence::ProjectAuthorizationRecord,
    pub(crate) posting: persistence::PostingRecord,
    pub(crate) actor: Option<persistence::AppUserRecord>,
}

impl PostingAccessContext {
    fn viewer_can_update(&self) -> bool {
        self.actor
            .as_ref()
            .is_some_and(|actor| posting_can_update(&self.authorization, &self.posting, actor))
    }

    fn viewer_can_delete(&self) -> bool {
        self.actor
            .as_ref()
            .is_some_and(|actor| posting_can_delete(&self.authorization, &self.posting, actor))
    }

    fn viewer_can_comment(&self) -> bool {
        self.actor
            .as_ref()
            .is_some_and(|actor| posting_can_comment(&self.authorization, &self.posting, actor))
    }

    fn viewer_can_set_notice(&self) -> bool {
        self.actor.is_some() && posting_can_set_notice(&self.authorization)
    }

    fn viewer_can_create(&self) -> bool {
        self.actor.is_some() && posting_can_create(&self.authorization)
    }

    fn viewer_can_watch(&self) -> bool {
        self.actor.is_some() && posting_can_watch(&self.authorization)
    }
}

pub(crate) async fn read_posting_access(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    post_number: i64,
    actor_id: Option<i64>,
) -> Result<PostingAccessContext, ConnectError> {
    let authorization =
        require_project_read(repository, owner_name, project_name, actor_id).await?;
    let posting = repository
        .read_posting_detail_for_viewer(owner_name, project_name, post_number, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot posting not found"))?;
    let actor = match actor_id {
        Some(user_id) => repository
            .find_user_by_id(user_id)
            .await
            .map_err(internal_error)?,
        None => None,
    };
    Ok(PostingAccessContext {
        authorization,
        posting,
        actor,
    })
}

pub(crate) async fn read_posting_comment_create_access(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    post_number: i64,
    actor: &persistence::AppUserRecord,
) -> Result<PostingAccessContext, ConnectError> {
    let authorization = repository
        .read_project_authorization(owner_name, project_name, Some(actor.id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let posting = repository
        .read_posting_detail_for_viewer(owner_name, project_name, post_number, Some(actor.id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot posting not found"))?;
    if !project_resource_create_allowed(&authorization, ProjectCreatableResource::NonIssueComment)
        && posting.author_id != Some(actor.id)
    {
        return Err(ConnectError::permission_denied(
            "posting comment create is not allowed",
        ));
    }
    Ok(PostingAccessContext {
        authorization,
        posting,
        actor: Some(actor.clone()),
    })
}
