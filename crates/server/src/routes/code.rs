use axum::{
    extract::{Form, Path, Query},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Redirect, Response},
    routing::{delete, get, post},
    Json, Router,
};
use http::HeaderValue;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use yoram_vcs::{
    CodeBranchListSnapshot, CodeBrowserSnapshot, CodeCommitDetailSnapshot,
    CodeCommitFileDiffRecord, CodeCommitParentRecord, CodeCommitRecord, CodeCompareSnapshot,
    CodeEntryRecord, CodeFileBytesRecord, CodeFileRecord, CodeHistorySnapshot, VcsError,
};

use crate::persistence::{self, PilotRepository};
use crate::{
    base_path_href, code_branch_error, code_browser_error, code_file_record_is_renderable_markdown,
    code_path_is_markdown, form_value, gravatar_url, internal_error,
    markdown_issue_references_for_project, markdown_mention_references, normalize_identifier,
    parse_attachment_ids, project_code_menu_visible, project_read_allowed, project_update_allowed,
    require_authenticated_user, require_project_resource_create, require_session,
    require_valid_csrf, rest_commit_thread_from_record,
    rest_issue_reference_metadata_from_resolved, rest_mention_reference_metadata_from_resolved,
    rest_repository, rest_require_project_code_read, rewrite_code_browser_markdown_image_links,
    workspace_avatar_url, ConnectError, MarkdownIssueReference, MarkdownMentionReference,
    PilotBackend, PilotServiceImpl, ProjectCreatableResource, RestIssueReferenceMetadata,
    RestMentionReferenceMetadata, RestReviewThread, RestRouteError,
};

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/projects/{owner_name}/{project_name}/code",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestCodeBrowserQuery>| {
                    let service = service.clone();
                    async move {
                        rest_read_code_browser(headers, owner_name, project_name, query, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/commits",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestCodeHistoryQuery>| {
                    let service = service.clone();
                    async move {
                        rest_read_code_history(headers, owner_name, project_name, query, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/commit/{commit_id}",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id)): Path<(
                    String,
                    String,
                    String,
                )>,
                      Query(query): Query<RestCodeCommitDetailQuery>| {
                    let service = service.clone();
                    async move {
                        rest_read_code_commit_detail(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/commit/{commit_id}/comments",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id)): Path<(
                    String,
                    String,
                    String,
                )>,
                      Json(body): Json<RestCommitCommentBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_commit_discussion_comment(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/commit/{commit_id}/comments/{comment_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id, comment_id)): Path<(
                    String,
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_delete_commit_discussion_comment(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
                            comment_id,
                            service,
                        )
                        .await
                    }
                }
            })
            .patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id, comment_id)): Path<(
                    String,
                    String,
                    String,
                    i64,
                )>,
                      Json(body): Json<RestCommitCommentBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_commit_discussion_comment(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
                            comment_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/commit/{commit_id}/threads/{thread_id}/close",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id, thread_id)): Path<(
                    String,
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_commit_discussion_thread_state(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
                            thread_id,
                            "closed".to_string(),
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/commit/{commit_id}/threads/{thread_id}/open",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, commit_id, thread_id)): Path<(
                    String,
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_commit_discussion_thread_state(
                            headers,
                            owner_name,
                            project_name,
                            commit_id,
                            thread_id,
                            "open".to_string(),
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/compare/{revision_range}",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, revision_range)): Path<(
                    String,
                    String,
                    String,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_read_code_compare(
                            headers,
                            owner_name,
                            project_name,
                            revision_range,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/branches",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move {
                        rest_read_code_branches(headers, owner_name, project_name, service).await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestCodeBranchMutationBody>| {
                    let service = service.clone();
                    async move {
                        rest_delete_code_branch(headers, owner_name, project_name, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/branches/default",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestCodeBranchMutationBody>| {
                    let service = service.clone();
                    async move {
                        rest_set_default_code_branch(
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
}

pub(crate) fn routes(service: PilotServiceImpl) -> Router {
    let raw_code_service = service.clone();
    let open_code_service = service.clone();
    let image_code_service = service.clone();
    let archive_code_service = service.clone();
    let code_ajax_service = service.clone();
    let code_ajax_root_service = service.clone();
    let code_ajax_root_slash_service = service.clone();
    let code_ajax_branch_service = service.clone();
    let code_ajax_branch_root_service = service.clone();
    let code_ajax_branch_root_slash_service = service.clone();
    let direct_commit_comment_create_service = service.clone();
    let direct_commit_comment_delete_service = service;

    Router::new()
        .route(
            "/{owner}/{project}/rawcode/{revision}/{*path}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, revision, path)): Path<(
                    String,
                    String,
                    String,
                    String,
                )>| {
                    async move {
                        direct_code_file(
                            headers,
                            owner,
                            project,
                            revision,
                            path,
                            DirectCodeFileMode::Raw,
                            raw_code_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/files/{revision}/{*path}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, revision, path)): Path<(
                    String,
                    String,
                    String,
                    String,
                )>| {
                    async move {
                        direct_code_file(
                            headers,
                            owner,
                            project,
                            revision,
                            path,
                            DirectCodeFileMode::Open,
                            open_code_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/image/{revision}/{*path}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, revision, path)): Path<(
                    String,
                    String,
                    String,
                    String,
                )>| {
                    async move {
                        direct_code_file(
                            headers,
                            owner,
                            project,
                            revision,
                            path,
                            DirectCodeFileMode::Image,
                            image_code_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/{revision}/download",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, revision)): Path<(String, String, String)>| {
                    async move {
                        direct_code_archive(
                            headers,
                            owner,
                            project,
                            revision,
                            archive_code_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/!/{*path}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, path)): Path<(String, String, String)>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            None,
                            path,
                            code_ajax_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/!",
            get(
                move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            None,
                            String::new(),
                            code_ajax_root_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/!/",
            get(
                move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            None,
                            String::new(),
                            code_ajax_root_slash_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/{branch}/!/{*path}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, branch, path)): Path<(
                    String,
                    String,
                    String,
                    String,
                )>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            Some(branch),
                            path,
                            code_ajax_branch_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/{branch}/!",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, branch)): Path<(String, String, String)>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            Some(branch),
                            String::new(),
                            code_ajax_branch_root_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/code/{branch}/!/",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, branch)): Path<(String, String, String)>| {
                    async move {
                        direct_code_ajax_compat(
                            headers,
                            owner,
                            project,
                            Some(branch),
                            String::new(),
                            code_ajax_branch_root_slash_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/commit/{commit_id}/comments",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, commit_id)): Path<(String, String, String)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_commit_discussion_comment(
                            headers,
                            owner,
                            project,
                            commit_id,
                            form,
                            direct_commit_comment_create_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/commit/{commit_id}/comments/{comment_id}/delete",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, commit_id, comment_id)): Path<(
                    String,
                    String,
                    String,
                    i64,
                )>| {
                    async move {
                        direct_delete_commit_discussion_comment(
                            headers,
                            owner,
                            project,
                            commit_id,
                            comment_id,
                            direct_commit_comment_delete_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestCodeBrowserQuery {
    branch: String,
    path: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestCodeHistoryQuery {
    branch: String,
    page: u32,
    path: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestCodeCommitDetailQuery {
    branch: String,
    path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestCommitCommentBody {
    #[serde(default)]
    attachment_ids: Vec<i64>,
    contents_markdown: String,
    end_line: Option<i32>,
    path: Option<String>,
    start_line: Option<i32>,
    thread_id: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeHistoryResponse {
    branches: Vec<RestCodeBranch>,
    breadcrumbs: Vec<RestCodeBreadcrumb>,
    commits: Vec<RestCodeCommit>,
    has_newer: bool,
    has_older: bool,
    no_head: bool,
    owner_name: String,
    page: u32,
    path: String,
    project_name: String,
    selected_branch: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeBrowserResponse {
    branches: Vec<RestCodeBranch>,
    breadcrumbs: Vec<RestCodeBreadcrumb>,
    entries: Vec<RestCodeEntry>,
    file: Option<RestCodeFile>,
    no_head: bool,
    owner_name: String,
    path: String,
    project_name: String,
    selected_branch: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeEntry {
    author_avatar_url: String,
    #[serde(skip_serializing)]
    author_email: String,
    author_label: String,
    author_login_id: String,
    commit_date: String,
    commit_message: String,
    commit_short_id: String,
    kind: String,
    name: String,
    path: String,
    size: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeFile {
    author_avatar_url: String,
    #[serde(skip_serializing)]
    author_email: String,
    author_label: String,
    author_login_id: String,
    commit_date: String,
    commit_id: String,
    comment_count: u32,
    commit_message: String,
    commit_short_id: String,
    html: String,
    is_binary: bool,
    is_too_large: bool,
    mime_type: String,
    mention_references: Vec<RestMentionReferenceMetadata>,
    name: String,
    path: String,
    size: i64,
    text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeCommitDetailResponse {
    branches: Vec<RestCodeBranch>,
    breadcrumbs: Vec<RestCodeBreadcrumb>,
    commit: Option<RestCodeCommit>,
    files: Vec<RestCodeCommitFileDiff>,
    issue_references: Vec<RestIssueReferenceMetadata>,
    no_head: bool,
    owner_name: String,
    parent_commit: Option<RestCodeCommitParent>,
    path: String,
    permissions: RestCodeCommitPermissions,
    project_name: String,
    selected_branch: String,
    threads: Vec<RestReviewThread>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeCommitPermissions {
    can_comment: bool,
    can_update_thread_state: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeCompareResponse {
    commit_a: Option<RestCodeCommit>,
    commit_b: Option<RestCodeCommit>,
    files: Vec<RestCodeCommitFileDiff>,
    no_head: bool,
    owner_name: String,
    project_name: String,
    rev_a: String,
    rev_b: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestCodeBranchMutationBody {
    branch_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeBranchListResponse {
    branches: Vec<RestCodeBranchListItem>,
    default_branch: String,
    no_head: bool,
    owner_name: String,
    permissions: RestCodeBranchPermissions,
    project_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeBranchListItem {
    commit_date: String,
    commit_id: String,
    commit_message: String,
    commit_short_id: String,
    is_default: bool,
    name: String,
    pull_request: Option<RestCodeBranchPullRequest>,
    short_name: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeBranchPullRequest {
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    state: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeBranchPermissions {
    can_delete: bool,
    can_update: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeCommitParent {
    commit_id: String,
    commit_short_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeCommitFileDiff {
    path: String,
    patch: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeBranch {
    name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeBreadcrumb {
    name: String,
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestCodeCommit {
    author_avatar_url: String,
    author_date: String,
    author_email: String,
    author_login_id: String,
    author_name: String,
    comment_count: u32,
    commit_id: String,
    commit_short_id: String,
    message: String,
    short_message: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum DirectCodeFileMode {
    Image,
    Open,
    Raw,
}

pub(crate) async fn direct_code_ajax_compat(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    branch: Option<String>,
    path: String,
    service: PilotServiceImpl,
) -> Response {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let authorization = match repository
        .read_project_authorization(&owner_name, &project_name, actor_id)
        .await
    {
        Ok(Some(authorization)) => authorization,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let read_allowed = match project_read_allowed(&authorization, actor_id.is_none()) {
        Ok(allowed) => allowed,
        Err(_) => return StatusCode::BAD_REQUEST.into_response(),
    };
    if !read_allowed || !project_code_menu_visible(&authorization, true) {
        return if actor_id.is_none() {
            StatusCode::UNAUTHORIZED.into_response()
        } else {
            StatusCode::FORBIDDEN.into_response()
        };
    }

    let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    let snapshot = match yoram_vcs::read_code_browser(
        &repo_path,
        branch.as_deref().filter(|value| !value.trim().is_empty()),
        &path,
    ) {
        Ok(snapshot) if snapshot.no_head => return StatusCode::NOT_FOUND.into_response(),
        Ok(snapshot) => snapshot,
        Err(error) => return direct_code_file_error(error),
    };
    let mut response = code_browser_rest_response_from_snapshot(
        &authorization.project.owner_name,
        &authorization.project.project_name,
        snapshot,
        &service.base_path,
    );
    if let Err(error) = enrich_code_browser_author_metadata(
        repository,
        authorization.project.id,
        &mut response,
        &service.base_path,
    )
    .await
    {
        return error.into_response();
    }

    Json(legacy_code_ajax_json_from_rest(
        &service.base_path,
        response,
    ))
    .into_response()
}

pub(crate) async fn direct_code_file(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    revision: String,
    path: String,
    mode: DirectCodeFileMode,
    service: PilotServiceImpl,
) -> Response {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let authorization = match repository
        .read_project_authorization(&owner_name, &project_name, actor_id)
        .await
    {
        Ok(Some(authorization)) => authorization,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let read_allowed = match project_read_allowed(&authorization, actor_id.is_none()) {
        Ok(allowed) => allowed,
        Err(_) => return StatusCode::BAD_REQUEST.into_response(),
    };
    if !read_allowed || !project_code_menu_visible(&authorization, true) {
        return if actor_id.is_none() {
            StatusCode::UNAUTHORIZED.into_response()
        } else {
            StatusCode::FORBIDDEN.into_response()
        };
    }

    let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    match yoram_vcs::read_file_bytes(&repo_path, &revision, &path) {
        Ok(file) => direct_code_file_response(file, mode),
        Err(VcsError::NotFound) if mode == DirectCodeFileMode::Raw => {
            direct_code_raw_missing_redirect(
                &service.base_path,
                &owner_name,
                &project_name,
                &revision,
                &path,
            )
        }
        Err(error) => direct_code_file_error(error),
    }
}

fn legacy_code_ajax_json_from_rest(
    base_path: &str,
    response: RestCodeBrowserResponse,
) -> serde_json::Value {
    if let Some(file) = response.file {
        return legacy_code_ajax_file_json(file);
    }

    let mut data = serde_json::Map::new();
    let owner_name = response.owner_name.clone();
    let project_name = response.project_name.clone();
    for entry in response.entries {
        data.insert(
            entry.name.clone(),
            legacy_code_ajax_entry_json(base_path, &owner_name, &project_name, entry),
        );
    }
    serde_json::json!({
        "type": "folder",
        "path": response.path,
        "data": data,
    })
}

fn legacy_code_ajax_entry_json(
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    entry: RestCodeEntry,
) -> serde_json::Value {
    let mut value = serde_json::Map::new();
    value.insert(
        "type".to_string(),
        serde_json::Value::String(entry.kind.clone()),
    );
    value.insert(
        "msg".to_string(),
        serde_json::Value::String(entry.commit_message.clone()),
    );
    value.insert(
        "author".to_string(),
        serde_json::Value::String(entry.author_label.clone()),
    );
    value.insert(
        "createdDate".to_string(),
        serde_json::Value::String(entry.commit_date.clone()),
    );
    value.insert(
        "commitId".to_string(),
        serde_json::Value::String(entry.commit_short_id.clone()),
    );
    value.insert("size".to_string(), serde_json::json!(entry.size));
    value.insert(
        "commitUrl".to_string(),
        serde_json::Value::String(base_path_href(
            base_path,
            &format!(
                "/{}/{}/commit/{}",
                owner_name, project_name, entry.commit_short_id
            ),
        )),
    );
    if !entry.author_login_id.trim().is_empty() {
        value.insert(
            "userLoginId".to_string(),
            serde_json::Value::String(entry.author_login_id),
        );
    }
    if !entry.author_avatar_url.trim().is_empty() {
        value.insert(
            "avatar".to_string(),
            serde_json::Value::String(entry.author_avatar_url),
        );
    }
    serde_json::Value::Object(value)
}

fn legacy_code_ajax_file_json(file: RestCodeFile) -> serde_json::Value {
    let mut value = serde_json::Map::new();
    value.insert("type".to_string(), serde_json::json!("file"));
    value.insert("msg".to_string(), serde_json::json!(file.commit_message));
    value.insert("author".to_string(), serde_json::json!(file.author_label));
    value.insert(
        "createdDate".to_string(),
        serde_json::json!(file.commit_date),
    );
    value.insert(
        "commitMessage".to_string(),
        serde_json::json!(file.commit_message),
    );
    value.insert("commiter".to_string(), serde_json::json!(file.author_label));
    value.insert(
        "commitDate".to_string(),
        serde_json::json!(file.commit_date),
    );
    value.insert("commitId".to_string(), serde_json::json!(file.commit_id));
    value.insert("size".to_string(), serde_json::json!(file.size));
    value.insert("isBinary".to_string(), serde_json::json!(file.is_binary));
    value.insert("mimeType".to_string(), serde_json::json!(file.mime_type));
    if !file.author_login_id.trim().is_empty() {
        value.insert(
            "userLoginId".to_string(),
            serde_json::json!(file.author_login_id),
        );
    }
    if !file.author_avatar_url.trim().is_empty() {
        value.insert(
            "avatar".to_string(),
            serde_json::json!(file.author_avatar_url),
        );
    }
    if !file.is_binary && !file.is_too_large {
        value.insert("data".to_string(), serde_json::json!(file.text));
    }
    serde_json::Value::Object(value)
}

pub(crate) async fn direct_code_archive(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    revision: String,
    service: PilotServiceImpl,
) -> Response {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let authorization = match repository
        .read_project_authorization(&owner_name, &project_name, actor_id)
        .await
    {
        Ok(Some(authorization)) => authorization,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let read_allowed = match project_read_allowed(&authorization, actor_id.is_none()) {
        Ok(allowed) => allowed,
        Err(_) => return StatusCode::BAD_REQUEST.into_response(),
    };
    if !read_allowed || !project_code_menu_visible(&authorization, true) {
        return if actor_id.is_none() {
            StatusCode::UNAUTHORIZED.into_response()
        } else {
            StatusCode::FORBIDDEN.into_response()
        };
    }

    let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    match yoram_vcs::read_archive_zip(&repo_path, &revision) {
        Ok(bytes) => direct_code_archive_response(bytes, &project_name, &revision),
        Err(error) => direct_code_file_error(error),
    }
}

fn direct_code_archive_response(bytes: Vec<u8>, project_name: &str, revision: &str) -> Response {
    let filename = format!(
        "{}-{}.zip",
        sanitize_download_filename(project_name),
        sanitize_download_filename(revision)
    );
    let disposition = format!("attachment; filename=\"{filename}\"");
    let mut response = bytes.into_response();
    response.headers_mut().insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/zip"),
    );
    if let Ok(header_value) = HeaderValue::from_str(&disposition) {
        response
            .headers_mut()
            .insert(http::header::CONTENT_DISPOSITION, header_value);
    }
    response
}

fn sanitize_download_filename(value: &str) -> String {
    value
        .chars()
        .filter(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.')
        })
        .collect::<String>()
        .trim_matches('.')
        .to_string()
}

fn direct_code_file_response(file: CodeFileBytesRecord, mode: DirectCodeFileMode) -> Response {
    let content_type = match mode {
        DirectCodeFileMode::Raw => "text/plain; charset=utf-8".to_string(),
        DirectCodeFileMode::Image | DirectCodeFileMode::Open => file.mime_type,
    };
    let disposition = match mode {
        DirectCodeFileMode::Open => format!("inline; filename=\"{}\"", file.name.replace('"', "")),
        DirectCodeFileMode::Image | DirectCodeFileMode::Raw => String::new(),
    };
    let mut response = file.bytes.into_response();
    if let Ok(header_value) = HeaderValue::from_str(&content_type) {
        response
            .headers_mut()
            .insert(http::header::CONTENT_TYPE, header_value);
    }
    if !disposition.is_empty() {
        if let Ok(header_value) = HeaderValue::from_str(&disposition) {
            response
                .headers_mut()
                .insert(http::header::CONTENT_DISPOSITION, header_value);
        }
    }
    response
}

fn direct_code_file_error(error: VcsError) -> Response {
    let error = code_browser_error(error);
    error.code.http_status().into_response()
}

fn direct_code_raw_missing_redirect(
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    revision: &str,
    path: &str,
) -> Response {
    let redirect_path = format!(
        "/{owner_name}/{project_name}/code/{revision}/{}",
        path.trim_start_matches('/')
    );
    Redirect::to(&base_path_href(base_path, &redirect_path)).into_response()
}

async fn rest_read_code_browser(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestCodeBrowserQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestCodeBrowserResponse>, RestRouteError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::from_connect_error(
            ConnectError::unimplemented("code browser requires repository backend"),
        ));
    };
    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    if !project_read_allowed(&authorization, actor_id.is_none())
        .map_err(RestRouteError::from_connect_error)?
        || !project_code_menu_visible(&authorization, true)
    {
        return if actor_id.is_none() {
            Err(RestRouteError::from_connect_error(
                ConnectError::unauthenticated("project read is not allowed"),
            ))
        } else {
            Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("project read is not allowed"),
            ))
        };
    }

    let branch = Some(query.branch.as_str()).filter(|value| !value.trim().is_empty());
    let snapshot = if authorization.project.vcs == "Subversion" {
        let repo_path =
            yoram_vcs::svn_repository_path(&service.data_root, authorization.project.id);
        yoram_vcs::read_svn_code_browser(&repo_path, branch, &query.path)
    } else {
        let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
        yoram_vcs::read_code_browser(&repo_path, branch, &query.path)
    }
    .map_err(code_browser_error)
    .map_err(RestRouteError::from_connect_error)?;

    let mut response = code_browser_rest_response_from_snapshot(
        &authorization.project.owner_name,
        &authorization.project.project_name,
        snapshot,
        &service.base_path,
    );
    for entry in &mut response.entries {
        if entry.author_email.trim().is_empty() {
            continue;
        }
        let Some(author) = repository
            .find_user_by_identifier(&entry.author_email)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
        else {
            continue;
        };
        entry.author_login_id = author.login_id.clone();
        entry.author_avatar_url = workspace_avatar_url(
            repository,
            author.id,
            &author.email_address,
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?;
    }
    if let Some(file) = response.file.as_mut() {
        if !file.author_email.trim().is_empty() {
            if let Some(author) = repository
                .find_user_by_identifier(&file.author_email)
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?
            {
                file.author_login_id = author.login_id.clone();
                file.author_avatar_url = workspace_avatar_url(
                    repository,
                    author.id,
                    &author.email_address,
                    &service.base_path,
                )
                .await
                .map_err(RestRouteError::from_connect_error)?;
            }
        }
        if !file.commit_id.trim().is_empty() {
            let comment_counts = repository
                .count_commit_discussion_threads_by_commit(
                    authorization.project.id,
                    &[file.commit_id.clone()],
                    Some(&file.path),
                )
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?;
            file.comment_count = *comment_counts.get(&file.commit_id).unwrap_or(&0);
        }
        if !file.is_binary
            && !file.is_too_large
            && (code_path_is_markdown(&file.path) || code_path_is_markdown(&file.name))
        {
            let markdown = file.text.clone();
            file.mention_references = markdown_mention_references(repository, &[markdown.as_str()])
                .await
                .map_err(RestRouteError::from_connect_error)?
                .iter()
                .map(rest_mention_reference_metadata_from_resolved)
                .collect();
        }
    }

    Ok(Json(response))
}

async fn enrich_code_browser_author_metadata(
    repository: &PilotRepository,
    project_id: i64,
    response: &mut RestCodeBrowserResponse,
    base_path: &str,
) -> Result<(), RestRouteError> {
    for entry in &mut response.entries {
        if entry.author_email.trim().is_empty() {
            continue;
        }
        let Some(author) = repository
            .find_user_by_identifier(&entry.author_email)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
        else {
            continue;
        };
        entry.author_login_id = author.login_id.clone();
        entry.author_avatar_url =
            workspace_avatar_url(repository, author.id, &author.email_address, base_path)
                .await
                .map_err(RestRouteError::from_connect_error)?;
    }
    if let Some(file) = response.file.as_mut() {
        if !file.author_email.trim().is_empty() {
            if let Some(author) = repository
                .find_user_by_identifier(&file.author_email)
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?
            {
                file.author_login_id = author.login_id.clone();
                file.author_avatar_url =
                    workspace_avatar_url(repository, author.id, &author.email_address, base_path)
                        .await
                        .map_err(RestRouteError::from_connect_error)?;
            }
        }
        if !file.commit_id.trim().is_empty() {
            let comment_counts = repository
                .count_commit_discussion_threads_by_commit(
                    project_id,
                    &[file.commit_id.clone()],
                    Some(&file.path),
                )
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?;
            file.comment_count = *comment_counts.get(&file.commit_id).unwrap_or(&0);
        }
        if !file.is_binary
            && !file.is_too_large
            && (code_path_is_markdown(&file.path) || code_path_is_markdown(&file.name))
        {
            let markdown = file.text.clone();
            file.mention_references = markdown_mention_references(repository, &[markdown.as_str()])
                .await
                .map_err(RestRouteError::from_connect_error)?
                .iter()
                .map(rest_mention_reference_metadata_from_resolved)
                .collect();
        }
    }

    Ok(())
}

async fn rest_read_code_history(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestCodeHistoryQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestCodeHistoryResponse>, RestRouteError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::from_connect_error(
            ConnectError::unimplemented("code history requires repository backend"),
        ));
    };
    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    if !project_read_allowed(&authorization, actor_id.is_none())
        .map_err(RestRouteError::from_connect_error)?
        || !project_code_menu_visible(&authorization, true)
    {
        return if actor_id.is_none() {
            Err(RestRouteError::from_connect_error(
                ConnectError::unauthenticated("project read is not allowed"),
            ))
        } else {
            Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("project read is not allowed"),
            ))
        };
    }

    let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    let mut snapshot = yoram_vcs::read_code_history(
        &repo_path,
        Some(query.branch.as_str()).filter(|value| !value.trim().is_empty()),
        &query.path,
        query.page,
    )
    .map_err(code_browser_error)
    .map_err(RestRouteError::from_connect_error)?;
    let commit_ids = snapshot
        .commits
        .iter()
        .map(|commit| commit.commit_id.clone())
        .collect::<Vec<_>>();
    let comment_counts = repository
        .count_commit_discussion_threads_by_commit(
            authorization.project.id,
            &commit_ids,
            Some(&query.path),
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    for commit in &mut snapshot.commits {
        commit.comment_count = *comment_counts.get(&commit.commit_id).unwrap_or(&0);
    }
    let mut response = code_history_response_from_snapshot(
        &authorization.project.owner_name,
        &authorization.project.project_name,
        snapshot,
    );
    for commit in &mut response.commits {
        if commit.author_email.trim().is_empty() {
            continue;
        }
        let Some(author) = repository
            .find_user_by_identifier(&commit.author_email)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
        else {
            continue;
        };
        commit.author_login_id = author.login_id.clone();
        commit.author_avatar_url = workspace_avatar_url(
            repository,
            author.id,
            &author.email_address,
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?;
    }

    Ok(Json(response))
}

async fn rest_read_code_commit_detail(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    commit_id: String,
    query: RestCodeCommitDetailQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestCodeCommitDetailResponse>, RestRouteError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::from_connect_error(
            ConnectError::unimplemented("commit detail requires repository backend"),
        ));
    };
    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    if !project_read_allowed(&authorization, actor_id.is_none())
        .map_err(RestRouteError::from_connect_error)?
        || !project_code_menu_visible(&authorization, true)
    {
        return if actor_id.is_none() {
            Err(RestRouteError::from_connect_error(
                ConnectError::unauthenticated("project read is not allowed"),
            ))
        } else {
            Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("project read is not allowed"),
            ))
        };
    }

    Ok(Json(
        rest_code_commit_detail_response(
            repository,
            &authorization,
            actor_id,
            &commit_id,
            &query,
            &service,
        )
        .await?,
    ))
}

async fn rest_code_commit_detail_response(
    repository: &PilotRepository,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
    commit_id: &str,
    query: &RestCodeCommitDetailQuery,
    service: &PilotServiceImpl,
) -> Result<RestCodeCommitDetailResponse, RestRouteError> {
    let mut snapshot = if authorization.project.vcs == "Subversion" {
        let repo_path =
            yoram_vcs::svn_repository_path(&service.data_root, authorization.project.id);
        yoram_vcs::read_svn_commit_detail(&repo_path, commit_id, &query.path)
    } else {
        let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
        yoram_vcs::read_commit_detail(
            &repo_path,
            commit_id,
            Some(query.branch.as_str()).filter(|value| !value.trim().is_empty()),
            &query.path,
        )
    }
    .map_err(code_browser_error)
    .map_err(RestRouteError::from_connect_error)?;
    let threads = repository
        .list_commit_discussion_threads(authorization.project.id, commit_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    if let Some(commit) = snapshot.commit.as_mut() {
        commit.comment_count = threads.len() as u32;
    }
    let mut markdowns = Vec::new();
    for thread in &threads {
        markdowns.extend(
            thread
                .comments
                .iter()
                .map(|comment| comment.contents_markdown.as_str()),
        );
    }
    let issue_references =
        markdown_issue_references_for_project(repository, authorization, actor_id, &markdowns)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    let mention_references = markdown_mention_references(repository, &markdowns)
        .await
        .map_err(RestRouteError::from_connect_error)?;

    Ok(code_commit_detail_response_from_snapshot(
        authorization,
        actor_id,
        snapshot,
        threads,
        &service.base_path,
        &issue_references,
        &mention_references,
    ))
}

fn direct_commit_comment_body(form: &HashMap<String, String>) -> RestCommitCommentBody {
    RestCommitCommentBody {
        attachment_ids: parse_attachment_ids(form_value(
            form,
            &["attachmentIds", "attachment_ids", "temporaryUploadFiles"],
        )),
        contents_markdown: form_value(form, &["contents", "contentsMarkdown"])
            .trim()
            .to_string(),
        end_line: form_value(form, &["endLine", "end_line"]).parse().ok(),
        path: Some(form_value(form, &["path"]).trim().to_string())
            .filter(|value| !value.is_empty()),
        start_line: form_value(form, &["startLine", "start_line"]).parse().ok(),
        thread_id: form_value(form, &["thread.id", "threadId", "thread_id"])
            .parse()
            .ok(),
    }
}

fn direct_commit_detail_redirect(
    base_path: &str,
    owner: &str,
    project: &str,
    commit_id: &str,
) -> Response {
    Redirect::to(&base_path_href(
        base_path,
        &format!("/{owner}/{project}/commit/{commit_id}"),
    ))
    .into_response()
}

async fn direct_create_commit_discussion_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    commit_id: String,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_create_commit_discussion_comment(
        headers,
        owner_name.clone(),
        project_name.clone(),
        commit_id.clone(),
        direct_commit_comment_body(&form),
        service,
    )
    .await
    {
        Ok(_) => direct_commit_detail_redirect(&base_path, &owner_name, &project_name, &commit_id),
        Err(error) => error.into_response(),
    }
}

async fn direct_delete_commit_discussion_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    commit_id: String,
    comment_id: i64,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_delete_commit_discussion_comment(
        headers,
        owner_name.clone(),
        project_name.clone(),
        commit_id.clone(),
        comment_id,
        service,
    )
    .await
    {
        Ok(_) => direct_commit_detail_redirect(&base_path, &owner_name, &project_name, &commit_id),
        Err(error) => error.into_response(),
    }
}

async fn rest_create_commit_discussion_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    commit_id: String,
    body: RestCommitCommentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestCodeCommitDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if body.contents_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request("commit comment is required"));
    }
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization = require_project_resource_create(
        repository,
        &owner_name,
        &project_name,
        Some(actor.id),
        ProjectCreatableResource::CommitComment,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let query = RestCodeCommitDetailQuery::default();
    let current = rest_code_commit_detail_response(
        repository,
        &authorization,
        Some(actor.id),
        &commit_id,
        &query,
        &service,
    )
    .await?;
    if !current.permissions.can_comment {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("commit comment is not allowed"),
        ));
    }
    repository
        .create_commit_discussion_comment(persistence::CreateCommitDiscussionCommentInput {
            actor_display_name: actor.display_name.clone(),
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            attachment_ids: body.attachment_ids,
            commit_id: commit_id.clone(),
            contents_markdown: body.contents_markdown,
            end_line: body.end_line,
            owner_name: owner_name.clone(),
            path: body.path,
            project_name: project_name.clone(),
            start_line: body.start_line,
            thread_id: body.thread_id,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("commit discussion thread not found"))?;
    Ok(Json(
        rest_code_commit_detail_response(
            repository,
            &authorization,
            Some(actor.id),
            &commit_id,
            &query,
            &service,
        )
        .await?,
    ))
}

pub(crate) async fn rest_update_commit_discussion_thread_state(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    commit_id: String,
    thread_id: i64,
    state: String,
    service: PilotServiceImpl,
) -> Result<Json<RestReviewThread>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let query = RestCodeCommitDetailQuery::default();
    let current = rest_code_commit_detail_response(
        repository,
        &authorization,
        Some(actor.id),
        &commit_id,
        &query,
        &service,
    )
    .await?;
    let thread = current
        .threads
        .iter()
        .find(|thread| thread.id == thread_id)
        .ok_or_else(|| RestRouteError::not_found("commit discussion thread not found"))?;
    let can_moderate = project_update_allowed(&authorization).unwrap_or(false);
    if !(can_moderate || thread.author_id == actor.id) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("commit discussion thread update is not allowed"),
        ));
    }
    let next_state = normalize_identifier(&state);
    if next_state != "open" && next_state != "closed" {
        return Err(RestRouteError::bad_request(
            "invalid commit discussion thread state",
        ));
    }
    let record = repository
        .update_commit_discussion_thread_state(persistence::CommitDiscussionThreadStateInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            commit_id,
            owner_name: owner_name.clone(),
            project_name: project_name.clone(),
            state: next_state,
            thread_id,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("commit discussion thread not found"))?;
    Ok(Json(rest_commit_thread_from_record(
        record,
        Some(actor.id),
        can_moderate,
        &service.base_path,
        &[],
        &[],
    )))
}

async fn rest_update_commit_discussion_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    commit_id: String,
    comment_id: i64,
    body: RestCommitCommentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestCodeCommitDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let query = RestCodeCommitDetailQuery::default();
    let current = rest_code_commit_detail_response(
        repository,
        &authorization,
        Some(actor.id),
        &commit_id,
        &query,
        &service,
    )
    .await?;
    let comment = current
        .threads
        .iter()
        .flat_map(|thread| thread.comments.iter())
        .find(|comment| comment.id == comment_id)
        .ok_or_else(|| RestRouteError::not_found("commit comment not found"))?;
    if !comment.can_delete {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("commit comment update is not allowed"),
        ));
    }
    let contents_markdown = body.contents_markdown.trim().to_string();
    if contents_markdown.is_empty() {
        return Err(RestRouteError::from_connect_error(
            ConnectError::invalid_argument("commit comment contents is required"),
        ));
    }
    repository
        .update_commit_discussion_comment(persistence::UpdateCommitDiscussionCommentInput {
            actor_id: actor.id,
            attachment_ids: body.attachment_ids,
            comment_id,
            commit_id: commit_id.clone(),
            contents_markdown,
            owner_name: owner_name.clone(),
            project_name: project_name.clone(),
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("commit comment not found"))?;
    Ok(Json(
        rest_code_commit_detail_response(
            repository,
            &authorization,
            Some(actor.id),
            &commit_id,
            &query,
            &service,
        )
        .await?,
    ))
}

async fn rest_delete_commit_discussion_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    commit_id: String,
    comment_id: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestCodeCommitDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let query = RestCodeCommitDetailQuery::default();
    let current = rest_code_commit_detail_response(
        repository,
        &authorization,
        Some(actor.id),
        &commit_id,
        &query,
        &service,
    )
    .await?;
    let can_moderate = project_update_allowed(&authorization).unwrap_or(false);
    let comment = current
        .threads
        .iter()
        .flat_map(|thread| thread.comments.iter())
        .find(|comment| comment.id == comment_id)
        .ok_or_else(|| RestRouteError::not_found("commit comment not found"))?;
    if !(can_moderate || comment.author_id == actor.id) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("commit comment delete is not allowed"),
        ));
    }
    repository
        .delete_commit_discussion_comment(persistence::DeleteCommitDiscussionCommentInput {
            actor_id: actor.id,
            comment_id,
            commit_id: commit_id.clone(),
            owner_name,
            project_name,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("commit comment not found"))?;
    Ok(Json(
        rest_code_commit_detail_response(
            repository,
            &authorization,
            Some(actor.id),
            &commit_id,
            &query,
            &service,
        )
        .await?,
    ))
}

async fn rest_read_code_compare(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    revision_range: String,
    service: PilotServiceImpl,
) -> Result<Json<RestCodeCompareResponse>, RestRouteError> {
    let Some((rev_a, rev_b)) = revision_range.split_once("..") else {
        return Err(RestRouteError::bad_request(
            "compare revision range must use revA..revB",
        ));
    };
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::from_connect_error(
            ConnectError::unimplemented("compare requires repository backend"),
        ));
    };
    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    if !project_read_allowed(&authorization, actor_id.is_none())
        .map_err(RestRouteError::from_connect_error)?
        || !project_code_menu_visible(&authorization, true)
    {
        return if actor_id.is_none() {
            Err(RestRouteError::from_connect_error(
                ConnectError::unauthenticated("project read is not allowed"),
            ))
        } else {
            Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("project read is not allowed"),
            ))
        };
    }

    let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    let snapshot = yoram_vcs::read_compare_diff(&repo_path, rev_a, rev_b)
        .map_err(code_browser_error)
        .map_err(RestRouteError::from_connect_error)?;

    Ok(Json(code_compare_response_from_snapshot(
        &authorization.project.owner_name,
        &authorization.project.project_name,
        snapshot,
    )))
}

async fn rest_read_code_branches(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Json<RestCodeBranchListResponse>, RestRouteError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "code branches require repository backend",
        ));
    };
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, actor_id).await?;
    let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    let snapshot = yoram_vcs::read_branch_list(&repo_path)
        .map_err(code_branch_error)
        .map_err(RestRouteError::from_connect_error)?;
    let pull_requests =
        code_branch_pull_requests(repository, &authorization.project, &snapshot).await?;
    Ok(Json(code_branch_list_response_from_snapshot(
        &authorization,
        actor_id,
        snapshot,
        pull_requests,
    )))
}

async fn rest_set_default_code_branch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestCodeBranchMutationBody,
    service: PilotServiceImpl,
) -> Result<Json<RestCodeBranchListResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "code branches require repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    if !project_update_allowed(&authorization).map_err(RestRouteError::from_connect_error)? {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("branch default update is not allowed"),
        ));
    }
    let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    let snapshot = yoram_vcs::set_default_branch(&repo_path, &body.branch_name)
        .map_err(code_branch_error)
        .map_err(RestRouteError::from_connect_error)?;
    let pull_requests =
        code_branch_pull_requests(repository, &authorization.project, &snapshot).await?;
    Ok(Json(code_branch_list_response_from_snapshot(
        &authorization,
        Some(actor.id),
        snapshot,
        pull_requests,
    )))
}

async fn rest_delete_code_branch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestCodeBranchMutationBody,
    service: PilotServiceImpl,
) -> Result<Json<RestCodeBranchListResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "code branches require repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    if !project_update_allowed(&authorization).map_err(RestRouteError::from_connect_error)? {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("branch delete is not allowed"),
        ));
    }
    let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    let snapshot = yoram_vcs::delete_branch(&repo_path, &body.branch_name)
        .map_err(code_branch_error)
        .map_err(RestRouteError::from_connect_error)?;
    let pull_requests =
        code_branch_pull_requests(repository, &authorization.project, &snapshot).await?;
    Ok(Json(code_branch_list_response_from_snapshot(
        &authorization,
        Some(actor.id),
        snapshot,
        pull_requests,
    )))
}

fn code_browser_rest_response_from_snapshot(
    owner_name: &str,
    project_name: &str,
    snapshot: CodeBrowserSnapshot,
    base_path: &str,
) -> RestCodeBrowserResponse {
    let selected_branch = snapshot.selected_branch.clone();
    RestCodeBrowserResponse {
        branches: snapshot
            .branches
            .into_iter()
            .map(|branch| RestCodeBranch { name: branch.name })
            .collect(),
        breadcrumbs: snapshot
            .breadcrumbs
            .into_iter()
            .map(|breadcrumb| RestCodeBreadcrumb {
                name: breadcrumb.name,
                path: breadcrumb.path,
            })
            .collect(),
        entries: snapshot
            .entries
            .into_iter()
            .map(code_entry_to_rest)
            .collect(),
        file: snapshot.file.map(|file| {
            code_file_to_rest(file, base_path, owner_name, project_name, &selected_branch)
        }),
        no_head: snapshot.no_head,
        owner_name: owner_name.to_string(),
        path: snapshot.path,
        project_name: project_name.to_string(),
        selected_branch,
    }
}

fn code_entry_to_rest(entry: CodeEntryRecord) -> RestCodeEntry {
    RestCodeEntry {
        author_avatar_url: String::new(),
        author_email: entry.author_email,
        author_label: entry.author_label,
        author_login_id: String::new(),
        commit_date: entry.commit_date,
        commit_message: entry.commit_message,
        commit_short_id: entry.commit_short_id,
        kind: entry.kind,
        name: entry.name,
        path: entry.path,
        size: entry.size,
    }
}

fn code_file_to_rest(
    file: CodeFileRecord,
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    branch: &str,
) -> RestCodeFile {
    let (html, text) = if code_file_record_is_renderable_markdown(&file) {
        (
            String::new(),
            rewrite_code_browser_markdown_image_links(
                &file.text,
                base_path,
                owner_name,
                project_name,
                branch,
            ),
        )
    } else {
        (String::new(), file.text)
    };
    RestCodeFile {
        author_avatar_url: String::new(),
        author_email: file.author_email,
        author_label: file.author_label,
        author_login_id: String::new(),
        commit_date: file.commit_date,
        commit_id: file.commit_id,
        comment_count: 0,
        commit_message: file.commit_message,
        commit_short_id: file.commit_short_id,
        html,
        is_binary: file.is_binary,
        is_too_large: file.is_too_large,
        mime_type: file.mime_type,
        mention_references: Vec::new(),
        name: file.name,
        path: file.path,
        size: file.size,
        text,
    }
}

fn code_history_response_from_snapshot(
    owner_name: &str,
    project_name: &str,
    snapshot: CodeHistorySnapshot,
) -> RestCodeHistoryResponse {
    RestCodeHistoryResponse {
        branches: snapshot
            .branches
            .into_iter()
            .map(|branch| RestCodeBranch { name: branch.name })
            .collect(),
        breadcrumbs: snapshot
            .breadcrumbs
            .into_iter()
            .map(|breadcrumb| RestCodeBreadcrumb {
                name: breadcrumb.name,
                path: breadcrumb.path,
            })
            .collect(),
        commits: snapshot
            .commits
            .into_iter()
            .map(code_commit_to_rest)
            .collect(),
        has_newer: snapshot.has_newer,
        has_older: snapshot.has_older,
        no_head: snapshot.no_head,
        owner_name: owner_name.to_string(),
        page: snapshot.page,
        path: snapshot.path,
        project_name: project_name.to_string(),
        selected_branch: snapshot.selected_branch,
    }
}

fn code_commit_detail_response_from_snapshot(
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
    snapshot: CodeCommitDetailSnapshot,
    threads: Vec<persistence::ReviewThreadRecord>,
    base_path: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> RestCodeCommitDetailResponse {
    let can_moderate = actor_id.is_some() && project_update_allowed(authorization).unwrap_or(false);
    RestCodeCommitDetailResponse {
        branches: snapshot
            .branches
            .into_iter()
            .map(|branch| RestCodeBranch { name: branch.name })
            .collect(),
        breadcrumbs: snapshot
            .breadcrumbs
            .into_iter()
            .map(|breadcrumb| RestCodeBreadcrumb {
                name: breadcrumb.name,
                path: breadcrumb.path,
            })
            .collect(),
        commit: snapshot.commit.map(code_commit_to_rest),
        files: snapshot
            .files
            .into_iter()
            .map(code_commit_file_diff_to_rest)
            .collect(),
        issue_references: issue_references
            .iter()
            .map(rest_issue_reference_metadata_from_resolved)
            .collect(),
        no_head: snapshot.no_head,
        owner_name: authorization.project.owner_name.clone(),
        parent_commit: snapshot.parent_commit.map(code_commit_parent_to_rest),
        path: snapshot.path,
        permissions: RestCodeCommitPermissions {
            can_comment: actor_id.is_some(),
            can_update_thread_state: can_moderate,
        },
        project_name: authorization.project.project_name.clone(),
        selected_branch: snapshot.selected_branch,
        threads: threads
            .into_iter()
            .map(|thread| {
                rest_commit_thread_from_record(
                    thread,
                    actor_id,
                    can_moderate,
                    base_path,
                    issue_references,
                    mention_references,
                )
            })
            .collect(),
    }
}

fn code_compare_response_from_snapshot(
    owner_name: &str,
    project_name: &str,
    snapshot: CodeCompareSnapshot,
) -> RestCodeCompareResponse {
    RestCodeCompareResponse {
        commit_a: snapshot.commit_a.map(code_commit_to_rest),
        commit_b: snapshot.commit_b.map(code_commit_to_rest),
        files: snapshot
            .files
            .into_iter()
            .map(code_commit_file_diff_to_rest)
            .collect(),
        no_head: snapshot.no_head,
        owner_name: owner_name.to_string(),
        project_name: project_name.to_string(),
        rev_a: snapshot.rev_a,
        rev_b: snapshot.rev_b,
    }
}

fn code_branch_list_response_from_snapshot(
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
    snapshot: CodeBranchListSnapshot,
    pull_requests: HashMap<String, RestCodeBranchPullRequest>,
) -> RestCodeBranchListResponse {
    let can_update = actor_id.is_some() && project_update_allowed(authorization).unwrap_or(false);
    RestCodeBranchListResponse {
        branches: snapshot
            .branches
            .into_iter()
            .map(|branch| RestCodeBranchListItem {
                commit_date: branch.commit_date,
                commit_id: branch.commit_id,
                commit_message: branch.commit_message,
                commit_short_id: branch.commit_short_id,
                is_default: branch.is_default,
                pull_request: pull_requests.get(&branch.name).cloned(),
                name: branch.name,
                short_name: branch.short_name,
            })
            .collect(),
        default_branch: snapshot.default_branch,
        no_head: snapshot.no_head,
        owner_name: authorization.project.owner_name.clone(),
        permissions: RestCodeBranchPermissions {
            can_delete: can_update,
            can_update,
        },
        project_name: authorization.project.project_name.clone(),
    }
}

async fn code_branch_pull_requests(
    repository: &PilotRepository,
    project: &persistence::ProjectRecord,
    snapshot: &CodeBranchListSnapshot,
) -> Result<HashMap<String, RestCodeBranchPullRequest>, RestRouteError> {
    let branch_names = snapshot
        .branches
        .iter()
        .map(|branch| branch.name.clone())
        .collect::<Vec<_>>();
    let records = repository
        .latest_pull_requests_from_branches(project, &branch_names)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(records
        .into_iter()
        .map(|(branch_name, record)| {
            (
                branch_name,
                RestCodeBranchPullRequest {
                    owner_name: record.owner_name,
                    project_name: record.project_name,
                    pull_request_number: record.pull_request_number,
                    state: record.state,
                },
            )
        })
        .collect())
}

fn code_commit_to_rest(commit: CodeCommitRecord) -> RestCodeCommit {
    RestCodeCommit {
        author_avatar_url: if commit.author_email.trim().is_empty() {
            String::new()
        } else {
            gravatar_url(&commit.author_email)
        },
        author_date: commit.author_date,
        author_email: commit.author_email,
        author_login_id: String::new(),
        author_name: commit.author_name,
        comment_count: commit.comment_count,
        commit_id: commit.commit_id,
        commit_short_id: commit.commit_short_id,
        message: commit.message,
        short_message: commit.short_message,
    }
}

fn code_commit_parent_to_rest(parent: CodeCommitParentRecord) -> RestCodeCommitParent {
    RestCodeCommitParent {
        commit_id: parent.commit_id,
        commit_short_id: parent.commit_short_id,
    }
}

fn code_commit_file_diff_to_rest(file: CodeCommitFileDiffRecord) -> RestCodeCommitFileDiff {
    RestCodeCommitFileDiff {
        path: file.path,
        patch: file.patch,
    }
}
