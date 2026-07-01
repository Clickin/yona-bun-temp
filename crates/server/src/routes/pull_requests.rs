use axum::{
    extract::{Form, Path, Query},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use yoram_vcs::{CodeCommitFileDiffRecord, VcsError};

use crate::api_types::IssueAttachment;
use crate::{
    code_browser_error, decode_query_component, dispatch_pull_request_webhooks, gravatar_url,
    internal_error, issue_attachment_from_record, markdown_issue_references_for_project,
    markdown_mention_references, normalize_identifier, parse_rest_query_i64, parse_rest_query_u32,
    persistence, project_code_menu_visible, project_read_allowed, project_update_allowed,
    redirect_to, require_authenticated_user, require_session, require_valid_csrf, rest_actor_id,
    rest_issue_reference_metadata_from_resolved, rest_mention_reference_metadata_from_resolved,
    rest_repository, rest_require_project_code_read, visible_code_projects_for_organization,
    ConnectError, MarkdownIssueReference, MarkdownMentionReference, PilotBackend, PilotRepository,
    PilotServiceImpl, RestIssueReferenceMetadata, RestMentionReferenceMetadata, RestRouteError,
};

mod review_comments;

use review_comments::{
    direct_create_pull_request_comment, direct_update_review_thread_state,
    rest_create_pull_request_comment, rest_delete_pull_request_comment,
    rest_update_pull_request_comment, rest_update_pull_request_thread_state,
    RestPullRequestCommentBody,
};

#[derive(Clone, Copy)]
enum PullRequestSourceBranchAction {
    Delete,
    Restore,
}

async fn direct_accept_pull_request(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Response {
    let redirect_path = format!(
        "/{}/{}/pullRequest/{}",
        owner_name, project_name, pull_request_number
    );
    let base_path = service.base_path.clone();
    match rest_accept_pull_request(
        headers,
        owner_name,
        project_name,
        pull_request_number,
        service,
    )
    .await
    {
        Ok(Json(_)) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

async fn direct_update_pull_request_source_branch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    action: PullRequestSourceBranchAction,
    service: PilotServiceImpl,
) -> Response {
    let redirect_path = format!(
        "/{}/{}/pullRequest/{}",
        owner_name, project_name, pull_request_number
    );
    let base_path = service.base_path.clone();
    let result = match action {
        PullRequestSourceBranchAction::Delete => {
            rest_delete_pull_request_source_branch(
                headers,
                owner_name,
                project_name,
                pull_request_number,
                service,
            )
            .await
        }
        PullRequestSourceBranchAction::Restore => {
            rest_restore_pull_request_source_branch(
                headers,
                owner_name,
                project_name,
                pull_request_number,
                service,
            )
            .await
        }
    };
    match result {
        Ok(Json(_)) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

async fn direct_pull_request_state(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if let Err(error) =
        rest_require_project_code_read(repository, &owner_name, &project_name, actor_id).await
    {
        return error.into_response();
    }
    let record = match repository
        .read_pull_request_detail(&owner_name, &project_name, pull_request_number, actor_id)
        .await
    {
        Ok(Some(record)) => record,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    let source_branch_state = match rest_pull_request_source_branch_state(
        &service, repository, &record, actor_id,
    )
    .await
    {
        Ok(state) => state,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let state = normalize_identifier(&record.state);
    Json(DirectPullRequestStateResponse {
        id: pull_request_number,
        is_open: state == "open",
        is_closed: state == "closed",
        is_merged: state == "merged",
        is_merging: record.is_merging,
        is_conflict: record.conflict,
        can_delete_branch: source_branch_state.can_delete,
        can_restore_branch: source_branch_state.can_restore,
    })
    .into_response()
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestPullRequestListQuery {
    category: String,
    contributor_id: i64,
    filter: String,
    page_num: u32,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestPullRequestFormQuery {
    from_branch: String,
    from_project_id: i64,
    to_branch: String,
    to_project_id: i64,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestPullRequestChangesQuery {
    commit_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestPullRequestCreateBody {
    #[serde(default)]
    attachment_ids: Vec<i64>,
    body_markdown: String,
    from_branch: String,
    from_project_id: i64,
    title: String,
    to_branch: String,
    to_project_id: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestPullRequestEditBody {
    #[serde(default)]
    attachment_ids: Vec<i64>,
    body_markdown: String,
    title: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestOrganizationPullRequestListQuery {
    category: String,
    filter: String,
    page_num: u32,
}

#[derive(Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestReviewThreadListQuery {
    author_id: i64,
    filter: String,
    pub(crate) format: String,
    order_by: String,
    order_dir: String,
    pub(crate) page_num: u32,
    participant_id: i64,
    state: String,
}

impl RestReviewThreadListQuery {
    pub(crate) fn from_raw_query(raw_query: Option<&str>) -> Result<Self, RestRouteError> {
        let mut query = Self::default();
        let Some(raw_query) = raw_query else {
            return Ok(query);
        };

        for pair in raw_query.split('&').filter(|pair| !pair.is_empty()) {
            let (raw_key, raw_value) = pair.split_once('=').unwrap_or((pair, ""));
            let key = decode_query_component(raw_key);
            let value = decode_query_component(raw_value);
            match key.as_str() {
                "authorId" => query.author_id = parse_rest_query_i64(&value)?,
                "filter" => query.filter = value,
                "format" => query.format = value,
                "orderBy" => query.order_by = value,
                "orderDir" => query.order_dir = value,
                "pageNum" => query.page_num = parse_rest_query_u32(&value)?,
                "participantId" => query.participant_id = parse_rest_query_i64(&value)?,
                "state" => query.state = value,
                _ => {}
            }
        }

        Ok(query)
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPullRequestUser {
    avatar_url: String,
    login_id: String,
    user_id: i64,
    user_label: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestReviewComment {
    attachments: Vec<IssueAttachment>,
    author_avatar_url: String,
    pub(crate) author_id: i64,
    author_label: String,
    author_login_id: String,
    pub(crate) can_delete: bool,
    contents_html: String,
    pub(crate) contents_markdown: String,
    created_label: String,
    pub(crate) id: i64,
    issue_references: Vec<RestIssueReferenceMetadata>,
    mention_references: Vec<RestMentionReferenceMetadata>,
    thread_id: i64,
    via_email: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestReviewThread {
    pub(crate) author_id: i64,
    author_avatar_url: String,
    author_label: String,
    author_login_id: String,
    pub(crate) comments: Vec<RestReviewComment>,
    commit_id: String,
    created_label: String,
    end_line: Option<i32>,
    end_side: Option<String>,
    pub(crate) id: i64,
    is_outdated: bool,
    path: String,
    prev_commit_id: String,
    pull_request_number: Option<i64>,
    start_line: Option<i32>,
    start_side: Option<String>,
    state: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPullRequestCommit {
    author_date_label: String,
    author_email: String,
    commit_id: String,
    commit_message: String,
    commit_short_id: String,
    state: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPullRequestEvent {
    commits: Vec<RestPullRequestCommit>,
    created_label: String,
    event_type: String,
    id: i64,
    new_value: String,
    old_value: String,
    sender_avatar_url: String,
    sender_label: String,
    sender_login_id: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPullRequestListItem {
    closed_comment_thread_count: u32,
    comment_thread_count: u32,
    conflict: bool,
    contributor_label: String,
    contributor_login_id: String,
    created_label: String,
    from_branch: String,
    from_owner_name: String,
    from_project_name: String,
    id: i64,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    receiver_label: String,
    receiver_login_id: String,
    reviewer_count: u32,
    reviewer_names: Vec<String>,
    state: String,
    title: String,
    to_branch: String,
    updated_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestPullRequestListResponse {
    accepted_count: u32,
    category: String,
    closed_count: u32,
    contributors: Vec<RestPullRequestUser>,
    current_user_id: i64,
    items: Vec<RestPullRequestListItem>,
    open_count: u32,
    page_num: u32,
    page_size: u32,
    recently_pushed_branches: Vec<RestPullRequestPushedBranch>,
    sent_count: u32,
    total_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPullRequestPushedBranch {
    branch_name: String,
    default_branch: String,
    id: i64,
    owner_name: String,
    project_name: String,
    pushed_label: String,
    short_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPullRequestProjectOption {
    id: i64,
    owner_name: String,
    project_name: String,
    selected: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPullRequestBranchOption {
    name: String,
    selected: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPullRequestFormSelected {
    from_branch: String,
    from_project_id: i64,
    to_branch: String,
    to_project_id: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestPullRequestFormOptionsResponse {
    from_branches: Vec<RestPullRequestBranchOption>,
    from_projects: Vec<RestPullRequestProjectOption>,
    mode: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pull_request: Option<RestPullRequestDetailResponse>,
    selected: RestPullRequestFormSelected,
    to_branches: Vec<RestPullRequestBranchOption>,
    to_projects: Vec<RestPullRequestProjectOption>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPullRequestPermissions {
    can_comment: bool,
    can_delete_source_branch: bool,
    can_read: bool,
    can_read_changes: bool,
    can_review: bool,
    can_restore_source_branch: bool,
    can_update: bool,
    can_update_state: bool,
    can_watch: bool,
}

#[derive(Clone, Copy, Default)]
struct RestPullRequestSourceBranchState {
    can_delete: bool,
    can_restore: bool,
    exists: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestPullRequestDetailResponse {
    attachments: Vec<IssueAttachment>,
    body_html: String,
    body_markdown: String,
    commits: Vec<RestPullRequestCommit>,
    conflict: bool,
    contributor: RestPullRequestUser,
    created_label: String,
    events: Vec<RestPullRequestEvent>,
    from_branch: String,
    from_owner_name: String,
    from_project_name: String,
    id: i64,
    is_merging: bool,
    issue_references: Vec<RestIssueReferenceMetadata>,
    is_watching: bool,
    lacking_reviewer_count: u32,
    mention_references: Vec<RestMentionReferenceMetadata>,
    merged_commit_id_from: String,
    merged_commit_id_to: String,
    owner_name: String,
    permissions: RestPullRequestPermissions,
    project_name: String,
    pull_request_number: i64,
    receiver: RestPullRequestUser,
    required_reviewer_count: u32,
    reviewed: bool,
    reviewers: Vec<RestPullRequestUser>,
    source_branch_exists: bool,
    state: String,
    threads: Vec<RestReviewThread>,
    title: String,
    to_branch: String,
    updated_label: String,
    watcher_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestPullRequestChangesResponse {
    card_threads: Vec<RestReviewThread>,
    commits: Vec<RestPullRequestCommit>,
    files: Vec<RestPullRequestChangedFile>,
    inline_threads: Vec<RestReviewThread>,
    non_ranged_threads: Vec<RestReviewThread>,
    pull_request: RestPullRequestDetailResponse,
    threads: Vec<RestReviewThread>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestPullRequestMergeResultResponse {
    commits: Vec<RestPullRequestCommit>,
    conflict: bool,
    no_head: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectPullRequestStateResponse {
    id: i64,
    is_open: bool,
    is_closed: bool,
    is_merged: bool,
    is_merging: bool,
    is_conflict: bool,
    can_delete_branch: bool,
    can_restore_branch: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPullRequestChangedFile {
    path: String,
    patch: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestReviewThreadListResponse {
    all_count: u32,
    author_count: u32,
    closed_count: u32,
    items: Vec<RestReviewThread>,
    open_count: u32,
    page_num: u32,
    page_size: u32,
    participant_count: u32,
    state: String,
    total_count: u32,
}

pub(crate) fn routes(service: PilotServiceImpl) -> Router {
    let thread_open_service = service.clone();
    let thread_close_service = service.clone();
    let pull_request_accept_service = service.clone();
    let pull_request_delete_source_branch_service = service.clone();
    let pull_request_restore_source_branch_service = service.clone();
    let pull_request_comment_create_service = service.clone();
    let pull_request_state_service = service;

    Router::new()
        .route(
            "/threads/{thread_id}/open",
            post(move |headers: HeaderMap, Path(thread_id): Path<i64>| {
                async move {
                    direct_update_review_thread_state(
                        headers,
                        thread_id,
                        "open",
                        thread_open_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/threads/{thread_id}/close",
            post(move |headers: HeaderMap, Path(thread_id): Path<i64>| {
                async move {
                    direct_update_review_thread_state(
                        headers,
                        thread_id,
                        "closed",
                        thread_close_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{owner}/{project}/pullRequest/{pull_request_number}/comments",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_pull_request_comment(
                            headers,
                            owner,
                            project,
                            pull_request_number,
                            form,
                            pull_request_comment_create_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/pullRequest/{pull_request_number}/accept",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    async move {
                        direct_accept_pull_request(
                            headers,
                            owner,
                            project,
                            pull_request_number,
                            pull_request_accept_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/pullRequest/{pull_request_number}/deletefrombranch",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    async move {
                        direct_update_pull_request_source_branch(
                            headers,
                            owner,
                            project,
                            pull_request_number,
                            PullRequestSourceBranchAction::Delete,
                            pull_request_delete_source_branch_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/pullRequest/{pull_request_number}/restorefrombranch",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    async move {
                        direct_update_pull_request_source_branch(
                            headers,
                            owner,
                            project,
                            pull_request_number,
                            PullRequestSourceBranchAction::Restore,
                            pull_request_restore_source_branch_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/pullRequest/{pull_request_number}/state",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    async move {
                        direct_pull_request_state(
                            headers,
                            owner,
                            project,
                            pull_request_number,
                            pull_request_state_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestPullRequestListQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_project_pull_requests(
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
                      Json(body): Json<RestPullRequestCreateBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_pull_request(headers, owner_name, project_name, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/form-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestPullRequestFormQuery>| {
                    let service = service.clone();
                    async move {
                        rest_read_pull_request_create_form_options(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/merge-result",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestPullRequestFormQuery>| {
                    let service = service.clone();
                    async move {
                        rest_read_pull_request_merge_result(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_read_pull_request_detail(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            service,
                        )
                        .await
                    }
                }
            })
            .patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>,
                      Json(body): Json<RestPullRequestEditBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/form-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_read_pull_request_edit_form_options(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/close",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request_state(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            "closed".to_string(),
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/open",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request_state(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            "open".to_string(),
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/accept",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_accept_pull_request(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/source-branch",
            delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_delete_pull_request_source_branch(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            service,
                        )
                        .await
                    }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_restore_pull_request_source_branch(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/review",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_set_pull_request_review(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            true,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/unreview",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_set_pull_request_review(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            false,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/watch",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_set_pull_request_watch(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            true,
                            service,
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_set_pull_request_watch(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            false,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/comments",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>,
                      Json(body): Json<RestPullRequestCommentBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_pull_request_comment(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/comments/{comment_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_delete_pull_request_comment(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
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
                      Path((owner_name, project_name, pull_request_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Json(body): Json<RestPullRequestCommentBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request_comment(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
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
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/threads/{thread_id}/close",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number, thread_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request_thread_state(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
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
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/threads/{thread_id}/open",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, pull_request_number, thread_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_update_pull_request_thread_state(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
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
            "/owners/{owner_name}/projects/{project_name}/pull-requests/{pull_request_number}/changes",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Query(query): Query<RestPullRequestChangesQuery>,
                      Path((owner_name, project_name, pull_request_number)): Path<(
                    String,
                    String,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_read_pull_request_changes(
                            headers,
                            owner_name,
                            project_name,
                            pull_request_number,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/reviews",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestReviewThreadListQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_project_reviews(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/pull-requests",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      Query(query): Query<RestOrganizationPullRequestListQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_organization_pull_requests(
                            headers,
                            organization_name,
                            query,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
}

fn rest_pull_request_user_from_record(
    record: persistence::PullRequestUserRecord,
) -> RestPullRequestUser {
    RestPullRequestUser {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id,
        user_id: record.user_id,
        user_label: record.user_label,
    }
}

fn rest_pull_request_list_item_from_record(
    record: persistence::PullRequestListItemRecord,
) -> RestPullRequestListItem {
    RestPullRequestListItem {
        closed_comment_thread_count: record.closed_comment_thread_count,
        comment_thread_count: record.comment_thread_count,
        conflict: record.conflict,
        contributor_label: record.contributor_label,
        contributor_login_id: record.contributor_login_id,
        created_label: record.created_label,
        from_branch: record.from_branch,
        from_owner_name: record.from_owner_name,
        from_project_name: record.from_project_name,
        id: record.id,
        owner_name: record.owner_name,
        project_name: record.project_name,
        pull_request_number: record.pull_request_number,
        receiver_label: record.receiver_label,
        receiver_login_id: record.receiver_login_id,
        reviewer_count: record.reviewer_count,
        reviewer_names: record.reviewer_names,
        state: record.state,
        title: record.title,
        to_branch: record.to_branch,
        updated_label: record.updated_label,
    }
}

fn rest_pull_request_list_from_record(
    record: persistence::PullRequestListRecord,
    actor_id: Option<i64>,
) -> RestPullRequestListResponse {
    RestPullRequestListResponse {
        accepted_count: record.accepted_count,
        category: record.category,
        closed_count: record.closed_count,
        contributors: record
            .contributors
            .into_iter()
            .map(rest_pull_request_user_from_record)
            .collect(),
        current_user_id: actor_id.unwrap_or_default(),
        items: record
            .items
            .into_iter()
            .map(rest_pull_request_list_item_from_record)
            .collect(),
        open_count: record.open_count,
        page_num: record.page_num,
        page_size: record.page_size,
        recently_pushed_branches: Vec::new(),
        sent_count: record.sent_count,
        total_count: record.total_count,
    }
}

fn rest_project_pull_request_list_from_record(
    service: &PilotServiceImpl,
    record: persistence::PullRequestListRecord,
    actor_id: Option<i64>,
) -> RestPullRequestListResponse {
    RestPullRequestListResponse {
        accepted_count: record.accepted_count,
        category: record.category,
        closed_count: record.closed_count,
        contributors: record
            .contributors
            .into_iter()
            .map(rest_pull_request_user_from_record)
            .collect(),
        current_user_id: actor_id.unwrap_or_default(),
        items: record
            .items
            .into_iter()
            .map(rest_pull_request_list_item_from_record)
            .collect(),
        open_count: record.open_count,
        page_num: record.page_num,
        page_size: record.page_size,
        recently_pushed_branches: record
            .recently_pushed_branches
            .into_iter()
            .map(|record| rest_pull_request_pushed_branch_from_record(service, record))
            .collect(),
        sent_count: record.sent_count,
        total_count: record.total_count,
    }
}

fn rest_pull_request_pushed_branch_from_record(
    service: &PilotServiceImpl,
    record: persistence::PullRequestPushedBranchRecord,
) -> RestPullRequestPushedBranch {
    RestPullRequestPushedBranch {
        branch_name: record.branch_name,
        default_branch: default_branch_for_project_id(service, record.default_branch_project_id),
        id: record.id,
        owner_name: record.owner_name,
        project_name: record.project_name,
        pushed_label: record.pushed_label,
        short_name: record.short_name,
    }
}

fn default_branch_for_project_id(service: &PilotServiceImpl, project_id: i64) -> String {
    let repo_path = yoram_vcs::repository_path(&service.data_root, project_id);
    yoram_vcs::read_branch_list(&repo_path)
        .ok()
        .map(|snapshot| snapshot.default_branch)
        .filter(|branch| !branch.trim().is_empty())
        .unwrap_or_else(|| "HEAD".to_string())
}

fn rest_review_comment_from_record(
    record: persistence::ReviewCommentRecord,
    base_path: &str,
) -> RestReviewComment {
    rest_review_comment_from_record_with_permissions(record, false, base_path, &[], &[])
}

fn rest_review_comment_from_record_with_permissions(
    record: persistence::ReviewCommentRecord,
    can_delete: bool,
    base_path: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> RestReviewComment {
    RestReviewComment {
        attachments: record
            .attachments
            .iter()
            .map(|attachment| issue_attachment_from_record(attachment, base_path))
            .collect(),
        author_avatar_url: gravatar_url(&record.author_email_address),
        author_id: record.author_id.unwrap_or_default(),
        author_label: record.author_label,
        author_login_id: record.author_login_id,
        can_delete,
        contents_html: String::new(),
        contents_markdown: record.contents_markdown,
        created_label: record.created_label,
        id: record.id,
        issue_references: issue_references
            .iter()
            .map(rest_issue_reference_metadata_from_resolved)
            .collect(),
        mention_references: mention_references
            .iter()
            .map(rest_mention_reference_metadata_from_resolved)
            .collect(),
        thread_id: record.thread_id,
        via_email: record.via_email,
    }
}

fn rest_review_thread_from_record(
    record: persistence::ReviewThreadRecord,
    base_path: &str,
) -> RestReviewThread {
    RestReviewThread {
        author_id: record.author_id.unwrap_or_default(),
        author_avatar_url: gravatar_url(&record.author_email_address),
        author_label: record.author_label,
        author_login_id: record.author_login_id,
        comments: record
            .comments
            .into_iter()
            .map(|comment| rest_review_comment_from_record(comment, base_path))
            .collect(),
        commit_id: record.commit_id,
        created_label: record.created_label,
        end_line: record.end_line,
        end_side: record.end_side,
        id: record.id,
        is_outdated: false,
        path: record.path,
        prev_commit_id: record.prev_commit_id,
        pull_request_number: record.pull_request_number,
        start_line: record.start_line,
        start_side: record.start_side,
        state: record.state,
    }
}

fn rest_pull_request_thread_from_record(
    record: persistence::ReviewThreadRecord,
    actor_id: Option<i64>,
    can_moderate: bool,
    base_path: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> RestReviewThread {
    RestReviewThread {
        author_id: record.author_id.unwrap_or_default(),
        author_avatar_url: gravatar_url(&record.author_email_address),
        author_label: record.author_label,
        author_login_id: record.author_login_id,
        comments: record
            .comments
            .into_iter()
            .map(|comment| {
                let can_delete = can_moderate || comment.author_id == actor_id;
                rest_review_comment_from_record_with_permissions(
                    comment,
                    can_delete,
                    base_path,
                    issue_references,
                    mention_references,
                )
            })
            .collect(),
        commit_id: record.commit_id,
        created_label: record.created_label,
        end_line: record.end_line,
        end_side: record.end_side,
        id: record.id,
        is_outdated: false,
        path: record.path,
        prev_commit_id: record.prev_commit_id,
        pull_request_number: record.pull_request_number,
        start_line: record.start_line,
        start_side: record.start_side,
        state: record.state,
    }
}

pub(crate) fn rest_commit_thread_from_record(
    record: persistence::ReviewThreadRecord,
    actor_id: Option<i64>,
    can_moderate: bool,
    base_path: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> RestReviewThread {
    RestReviewThread {
        author_id: record.author_id.unwrap_or_default(),
        author_avatar_url: gravatar_url(&record.author_email_address),
        author_label: record.author_label,
        author_login_id: record.author_login_id,
        comments: record
            .comments
            .into_iter()
            .map(|comment| {
                let can_delete = can_moderate || comment.author_id == actor_id;
                rest_review_comment_from_record_with_permissions(
                    comment,
                    can_delete,
                    base_path,
                    issue_references,
                    mention_references,
                )
            })
            .collect(),
        commit_id: record.commit_id,
        created_label: record.created_label,
        end_line: record.end_line,
        end_side: record.end_side,
        id: record.id,
        is_outdated: false,
        path: record.path,
        prev_commit_id: record.prev_commit_id,
        pull_request_number: record.pull_request_number,
        start_line: record.start_line,
        start_side: record.start_side,
        state: record.state,
    }
}

fn rest_pull_request_commit_from_record(
    record: persistence::PullRequestCommitRecord,
) -> RestPullRequestCommit {
    RestPullRequestCommit {
        author_date_label: record.author_date_label,
        author_email: record.author_email,
        commit_id: record.commit_id,
        commit_message: record.commit_message,
        commit_short_id: record.commit_short_id,
        state: record.state,
    }
}

fn rest_pull_request_commit_from_vcs_record_with_state(
    record: yoram_vcs::PullRequestDiffCommitRecord,
    known_commit_state_by_id: &HashMap<String, String>,
) -> RestPullRequestCommit {
    let state = known_commit_state_by_id
        .get(&record.commit_id)
        .filter(|state| !state.trim().is_empty())
        .cloned()
        .unwrap_or_else(|| "CURRENT".to_string());
    RestPullRequestCommit {
        author_date_label: record.author_date_label,
        author_email: record.author_email,
        commit_id: record.commit_id,
        commit_message: record.commit_message,
        commit_short_id: record.commit_short_id,
        state,
    }
}

fn rest_pull_request_changed_file_from_code_commit_record(
    record: CodeCommitFileDiffRecord,
) -> RestPullRequestChangedFile {
    RestPullRequestChangedFile {
        path: record.path,
        patch: record.patch,
    }
}

fn rest_pull_request_changed_file_from_vcs_record(
    record: yoram_vcs::PullRequestChangedFileRecord,
) -> RestPullRequestChangedFile {
    RestPullRequestChangedFile {
        path: record.path,
        patch: record.patch,
    }
}

async fn rest_pull_request_detail_from_record_with_repository_issue_references(
    service: &PilotServiceImpl,
    repository: &PilotRepository,
    record: persistence::PullRequestDetailRecord,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
) -> Result<RestPullRequestDetailResponse, ConnectError> {
    let source_branch_state =
        rest_pull_request_source_branch_state(service, repository, &record, actor_id).await?;
    let mut markdowns = vec![record.body_markdown.as_str()];
    for thread in &record.threads {
        markdowns.extend(
            thread
                .comments
                .iter()
                .map(|comment| comment.contents_markdown.as_str()),
        );
    }
    let issue_references =
        markdown_issue_references_for_project(repository, authorization, actor_id, &markdowns)
            .await?;
    let mention_references = markdown_mention_references(repository, &markdowns).await?;
    rest_pull_request_detail_from_record_with_issue_references(
        record,
        authorization,
        actor_id,
        &service.base_path,
        &issue_references,
        &mention_references,
        source_branch_state,
    )
}

async fn rest_pull_request_source_branch_state(
    service: &PilotServiceImpl,
    repository: &PilotRepository,
    record: &persistence::PullRequestDetailRecord,
    actor_id: Option<i64>,
) -> Result<RestPullRequestSourceBranchState, ConnectError> {
    let Some(source_project) = repository
        .read_project_by_owner_and_name(&record.from_owner_name, &record.from_project_name)
        .await
        .map_err(internal_error)?
    else {
        return Ok(RestPullRequestSourceBranchState::default());
    };
    if !source_project.vcs.eq_ignore_ascii_case("GIT") {
        return Ok(RestPullRequestSourceBranchState::default());
    }

    let repo_path = yoram_vcs::repository_path(&service.data_root, source_project.id);
    let snapshot = yoram_vcs::read_branch_list(&repo_path).map_err(code_browser_error)?;
    let branch = snapshot
        .branches
        .iter()
        .find(|branch| branch.name == record.from_branch);
    let exists = branch.is_some();
    let is_default = branch.is_some_and(|branch| branch.is_default);
    let viewer_is_contributor =
        actor_id.is_some_and(|actor_id| actor_id == record.contributor.user_id);
    let is_merged = record.state == "merged";
    let can_delete = viewer_is_contributor && is_merged && exists && !is_default;
    let can_restore = viewer_is_contributor
        && is_merged
        && !exists
        && !record.merged_commit_id_to.trim().is_empty();

    Ok(RestPullRequestSourceBranchState {
        can_delete,
        can_restore,
        exists,
    })
}

fn rest_pull_request_detail_from_record_with_issue_references(
    record: persistence::PullRequestDetailRecord,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
    base_path: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
    source_branch_state: RestPullRequestSourceBranchState,
) -> Result<RestPullRequestDetailResponse, ConnectError> {
    let viewer_can_project_update = actor_id.is_some() && project_update_allowed(authorization)?;
    let viewer_is_contributor =
        actor_id.is_some_and(|user_id| user_id == record.contributor.user_id);
    let viewer_is_receiver = actor_id.is_some_and(|user_id| user_id == record.receiver.user_id);
    let viewer_is_reviewer = actor_id.is_some_and(|user_id| {
        record
            .reviewers
            .iter()
            .any(|reviewer| reviewer.user_id == user_id)
    });
    let can_update = viewer_can_project_update || viewer_is_contributor || viewer_is_receiver;
    let can_review = actor_id.is_some()
        && (authorization.viewer.is_project_member
            || authorization.viewer.is_project_manager
            || authorization.viewer.is_organization_admin
            || authorization.viewer.is_site_admin
            || viewer_is_receiver
            || viewer_is_reviewer);
    let can_moderate_review_comments = actor_id.is_some()
        && (authorization.viewer.is_project_member
            || authorization.viewer.is_project_manager
            || authorization.viewer.is_organization_admin
            || authorization.viewer.is_site_admin);
    let owner_name = record.owner_name.clone();
    let project_name = record.project_name.clone();
    Ok(RestPullRequestDetailResponse {
        attachments: record
            .attachments
            .iter()
            .map(|attachment| issue_attachment_from_record(attachment, base_path))
            .collect(),
        body_html: String::new(),
        body_markdown: record.body_markdown,
        commits: record
            .commits
            .into_iter()
            .map(rest_pull_request_commit_from_record)
            .collect(),
        conflict: record.conflict,
        contributor: rest_pull_request_user_from_record(record.contributor),
        created_label: record.created_label,
        events: record
            .events
            .into_iter()
            .map(|event| RestPullRequestEvent {
                commits: event
                    .commits
                    .into_iter()
                    .map(rest_pull_request_commit_from_record)
                    .collect(),
                created_label: event.created_label,
                event_type: event.event_type,
                id: event.id,
                new_value: event.new_value,
                old_value: event.old_value,
                sender_avatar_url: gravatar_url(&event.sender_email_address),
                sender_label: event.sender_label,
                sender_login_id: event.sender_login_id,
            })
            .collect(),
        from_branch: record.from_branch,
        from_owner_name: record.from_owner_name,
        from_project_name: record.from_project_name,
        id: record.id,
        is_merging: record.is_merging,
        issue_references: issue_references
            .iter()
            .map(rest_issue_reference_metadata_from_resolved)
            .collect(),
        is_watching: record.is_watching,
        lacking_reviewer_count: record.lacking_reviewer_count,
        mention_references: mention_references
            .iter()
            .map(rest_mention_reference_metadata_from_resolved)
            .collect(),
        merged_commit_id_from: record.merged_commit_id_from,
        merged_commit_id_to: record.merged_commit_id_to,
        owner_name: owner_name.clone(),
        permissions: RestPullRequestPermissions {
            can_comment: actor_id.is_some(),
            can_delete_source_branch: source_branch_state.can_delete,
            can_read: true,
            can_read_changes: true,
            can_review,
            can_restore_source_branch: source_branch_state.can_restore,
            can_update,
            can_update_state: can_update,
            can_watch: actor_id.is_some(),
        },
        project_name: project_name.clone(),
        pull_request_number: record.pull_request_number,
        receiver: rest_pull_request_user_from_record(record.receiver),
        required_reviewer_count: record.required_reviewer_count,
        reviewed: record.reviewed,
        reviewers: record
            .reviewers
            .into_iter()
            .map(rest_pull_request_user_from_record)
            .collect(),
        source_branch_exists: source_branch_state.exists,
        state: record.state,
        threads: record
            .threads
            .into_iter()
            .map(|thread| {
                rest_pull_request_thread_from_record(
                    thread,
                    actor_id,
                    can_moderate_review_comments,
                    base_path,
                    issue_references,
                    mention_references,
                )
            })
            .collect(),
        title: record.title,
        to_branch: record.to_branch,
        updated_label: record.updated_label,
        watcher_count: record.watcher_count,
    })
}

fn rest_pull_request_filter(
    query: RestPullRequestListQuery,
    _actor_id: Option<i64>,
) -> persistence::PullRequestListFilter {
    let category = normalize_identifier(&query.category);
    persistence::PullRequestListFilter {
        category: if category.is_empty() {
            "open".to_string()
        } else {
            category.clone()
        },
        contributor_id: if query.contributor_id > 0 {
            Some(query.contributor_id)
        } else {
            None
        },
        filter: (!query.filter.trim().is_empty()).then(|| query.filter.trim().to_string()),
        page_num: query.page_num.max(1),
    }
}

fn rest_organization_pull_request_filter(
    query: RestOrganizationPullRequestListQuery,
) -> persistence::PullRequestListFilter {
    persistence::PullRequestListFilter {
        category: if normalize_identifier(&query.category) == "closed" {
            "closed".to_string()
        } else {
            "open".to_string()
        },
        contributor_id: None,
        filter: (!query.filter.trim().is_empty()).then(|| query.filter.trim().to_string()),
        page_num: query.page_num.max(1),
    }
}

pub(crate) fn rest_review_thread_filter(
    query: RestReviewThreadListQuery,
) -> persistence::ReviewThreadListFilter {
    persistence::ReviewThreadListFilter {
        author_id: (query.author_id > 0).then_some(query.author_id),
        filter: (!query.filter.trim().is_empty()).then(|| query.filter.trim().to_string()),
        order_by: if query.order_by.trim().is_empty() {
            "createdDate".to_string()
        } else {
            query.order_by.trim().to_string()
        },
        order_dir: if query.order_dir.trim().is_empty() {
            "desc".to_string()
        } else {
            query.order_dir.trim().to_string()
        },
        page_num: query.page_num.max(1),
        participant_id: (query.participant_id > 0).then_some(query.participant_id),
        state: if normalize_identifier(&query.state) == "closed" {
            "closed".to_string()
        } else {
            "open".to_string()
        },
    }
}

fn rest_pull_request_branch_error(error: VcsError) -> RestRouteError {
    match error {
        VcsError::NotFound => RestRouteError::bad_request("pull request repository is empty"),
        _ => RestRouteError::from_connect_error(internal_error(error)),
    }
}

async fn rest_require_pull_request_option_project(
    repository: &PilotRepository,
    project_id: i64,
    actor_id: Option<i64>,
) -> Result<persistence::ProjectAuthorizationRecord, RestRouteError> {
    let project = repository
        .read_project_by_id(project_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    rest_require_project_code_read(
        repository,
        &project.owner_name,
        &project.project_name,
        actor_id,
    )
    .await
}

async fn rest_pull_request_project_options(
    repository: &PilotRepository,
    actor_id: Option<i64>,
    selected_project_id: i64,
) -> Result<Vec<RestPullRequestProjectOption>, RestRouteError> {
    let projects = repository
        .list_projects()
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let mut options = Vec::new();
    for project in projects {
        let Some(authorization) = repository
            .read_project_authorization(&project.owner_name, &project.project_name, actor_id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
        else {
            continue;
        };
        if project_read_allowed(&authorization, actor_id.is_none())
            .map_err(RestRouteError::from_connect_error)?
            && project_code_menu_visible(&authorization, true)
        {
            options.push(RestPullRequestProjectOption {
                id: authorization.project.id,
                owner_name: authorization.project.owner_name,
                project_name: authorization.project.project_name,
                selected: authorization.project.id == selected_project_id,
            });
        }
    }
    Ok(options)
}

fn rest_pull_request_branch_options(
    service: &PilotServiceImpl,
    project: &persistence::ProjectRecord,
    selected_branch: &str,
) -> Result<(Vec<RestPullRequestBranchOption>, String), RestRouteError> {
    let repo_path = yoram_vcs::repository_path(&service.data_root, project.id);
    let branches =
        yoram_vcs::list_repository_branches(&repo_path).map_err(rest_pull_request_branch_error)?;
    if branches.is_empty() {
        return Err(RestRouteError::bad_request(
            "pull request repository is empty",
        ));
    }
    let selected = selected_branch.trim();
    let selected = if selected.is_empty() {
        branches[0].name.clone()
    } else if branches.iter().any(|branch| branch.name == selected) {
        selected.to_string()
    } else {
        return Err(RestRouteError::bad_request(
            "pull request branch is not available",
        ));
    };
    let options = branches
        .into_iter()
        .map(|branch| RestPullRequestBranchOption {
            selected: branch.name == selected,
            name: branch.name,
        })
        .collect();
    Ok((options, selected))
}

fn rest_pull_request_mutation_input(
    title: String,
    body_markdown: String,
    attachment_ids: Vec<i64>,
) -> Result<persistence::PullRequestMutationInput, RestRouteError> {
    if title.trim().is_empty() {
        return Err(RestRouteError::bad_request("pullRequest.title.required"));
    }
    if body_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request("pullRequest.body.required"));
    }
    Ok(persistence::PullRequestMutationInput {
        attachment_ids,
        body_markdown,
        title,
    })
}

fn require_pull_request_create_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
) -> Result<(), RestRouteError> {
    if authorization.viewer.is_site_admin || authorization.viewer.is_project_member {
        return Ok(());
    }
    Err(RestRouteError::from_connect_error(
        ConnectError::permission_denied("Guest is not allowed this request"),
    ))
}

async fn rest_pull_request_detail_response(
    service: &PilotServiceImpl,
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    pull_request_number: i64,
    actor_id: Option<i64>,
) -> Result<RestPullRequestDetailResponse, RestRouteError> {
    let authorization =
        rest_require_project_code_read(repository, owner_name, project_name, actor_id).await?;
    let record = repository
        .read_pull_request_detail(owner_name, project_name, pull_request_number, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    rest_pull_request_detail_from_record_with_repository_issue_references(
        service,
        repository,
        record,
        &authorization,
        actor_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)
}

pub(crate) async fn rest_read_pull_request_create_form_options(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestPullRequestFormQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestFormOptionsResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let target_authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    require_pull_request_create_allowed(&target_authorization)?;
    let from_project_id = if query.from_project_id > 0 {
        query.from_project_id
    } else {
        target_authorization.project.id
    };
    let to_project_id = if query.to_project_id > 0 {
        query.to_project_id
    } else {
        target_authorization.project.id
    };
    let from_authorization =
        rest_require_pull_request_option_project(repository, from_project_id, Some(actor.id))
            .await?;
    let to_authorization =
        rest_require_pull_request_option_project(repository, to_project_id, Some(actor.id)).await?;
    let project_options = rest_pull_request_project_options(
        repository,
        Some(actor.id),
        target_authorization.project.id,
    )
    .await?;
    let (from_branches, selected_from_branch) = rest_pull_request_branch_options(
        &service,
        &from_authorization.project,
        &query.from_branch,
    )?;
    let (to_branches, selected_to_branch) =
        rest_pull_request_branch_options(&service, &to_authorization.project, &query.to_branch)?;

    Ok(Json(RestPullRequestFormOptionsResponse {
        from_branches,
        from_projects: project_options
            .iter()
            .map(|option| RestPullRequestProjectOption {
                id: option.id,
                owner_name: option.owner_name.clone(),
                project_name: option.project_name.clone(),
                selected: option.id == from_project_id,
            })
            .collect(),
        mode: "create".to_string(),
        pull_request: None,
        selected: RestPullRequestFormSelected {
            from_branch: selected_from_branch,
            from_project_id,
            to_branch: selected_to_branch,
            to_project_id,
        },
        to_branches,
        to_projects: project_options
            .into_iter()
            .map(|option| RestPullRequestProjectOption {
                selected: option.id == to_project_id,
                ..option
            })
            .collect(),
    }))
}

pub(crate) async fn rest_read_pull_request_edit_form_options(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestFormOptionsResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let pull_request = rest_pull_request_detail_response(
        &service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    let from_project = repository
        .read_project_by_owner_and_name(
            &pull_request.from_owner_name,
            &pull_request.from_project_name,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("source project not found"))?;
    let to_project = repository
        .read_project_by_owner_and_name(&pull_request.owner_name, &pull_request.project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("target project not found"))?;
    rest_require_pull_request_option_project(repository, from_project.id, Some(actor.id)).await?;
    rest_require_pull_request_option_project(repository, to_project.id, Some(actor.id)).await?;
    let project_options =
        rest_pull_request_project_options(repository, Some(actor.id), to_project.id).await?;
    let (from_branches, selected_from_branch) =
        rest_pull_request_branch_options(&service, &from_project, &pull_request.from_branch)?;
    let (to_branches, selected_to_branch) =
        rest_pull_request_branch_options(&service, &to_project, &pull_request.to_branch)?;

    Ok(Json(RestPullRequestFormOptionsResponse {
        from_branches,
        from_projects: project_options
            .iter()
            .map(|option| RestPullRequestProjectOption {
                id: option.id,
                owner_name: option.owner_name.clone(),
                project_name: option.project_name.clone(),
                selected: option.id == from_project.id,
            })
            .collect(),
        mode: "edit".to_string(),
        pull_request: Some(pull_request),
        selected: RestPullRequestFormSelected {
            from_branch: selected_from_branch,
            from_project_id: from_project.id,
            to_branch: selected_to_branch,
            to_project_id: to_project.id,
        },
        to_branches,
        to_projects: project_options
            .into_iter()
            .map(|option| RestPullRequestProjectOption {
                selected: option.id == to_project.id,
                ..option
            })
            .collect(),
    }))
}

pub(crate) async fn rest_read_pull_request_merge_result(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestPullRequestFormQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestMergeResultResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let route_authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    require_pull_request_create_allowed(&route_authorization)?;
    let from_project_id = if query.from_project_id > 0 {
        query.from_project_id
    } else {
        route_authorization.project.id
    };
    let to_project_id = if query.to_project_id > 0 {
        query.to_project_id
    } else {
        route_authorization.project.id
    };
    if route_authorization.project.id != to_project_id {
        return Err(RestRouteError::bad_request(
            "pull request target project does not match route",
        ));
    }
    let from_authorization =
        rest_require_pull_request_option_project(repository, from_project_id, Some(actor.id))
            .await?;
    let to_authorization =
        rest_require_pull_request_option_project(repository, to_project_id, Some(actor.id)).await?;
    let (_, selected_from_branch) = rest_pull_request_branch_options(
        &service,
        &from_authorization.project,
        &query.from_branch,
    )?;
    let (_, selected_to_branch) =
        rest_pull_request_branch_options(&service, &to_authorization.project, &query.to_branch)?;

    let source_repo_path =
        yoram_vcs::repository_path(&service.data_root, from_authorization.project.id);
    let target_repo_path =
        yoram_vcs::repository_path(&service.data_root, to_authorization.project.id);
    let preview = yoram_vcs::preview_pull_request_merge(
        &source_repo_path,
        &target_repo_path,
        &selected_from_branch,
        &selected_to_branch,
    )
    .map_err(rest_pull_request_branch_error)?;
    Ok(Json(RestPullRequestMergeResultResponse {
        commits: preview
            .commits
            .into_iter()
            .map(|record| {
                rest_pull_request_commit_from_vcs_record_with_state(record, &HashMap::new())
            })
            .collect(),
        conflict: preview.conflict,
        no_head: preview.no_head,
    }))
}

pub(crate) async fn rest_create_pull_request(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestPullRequestCreateBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if body.from_project_id <= 0 || body.to_project_id <= 0 {
        return Err(RestRouteError::bad_request(
            "pull request project is required",
        ));
    }
    if body.from_branch.trim().is_empty() || body.to_branch.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "pull request branch is required",
        ));
    }
    let values =
        rest_pull_request_mutation_input(body.title, body.body_markdown, body.attachment_ids)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let route_authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    if route_authorization.project.id != body.to_project_id {
        return Err(RestRouteError::bad_request(
            "pull request target project does not match route",
        ));
    }
    require_pull_request_create_allowed(&route_authorization)?;
    let from_authorization =
        rest_require_pull_request_option_project(repository, body.from_project_id, Some(actor.id))
            .await?;
    let to_authorization =
        rest_require_pull_request_option_project(repository, body.to_project_id, Some(actor.id))
            .await?;
    rest_pull_request_branch_options(&service, &from_authorization.project, &body.from_branch)?;
    rest_pull_request_branch_options(&service, &to_authorization.project, &body.to_branch)?;

    let detail = repository
        .create_pull_request(persistence::CreatePullRequestInput {
            actor_display_name: actor.display_name.clone(),
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            from_branch: body.from_branch,
            from_project_id: body.from_project_id,
            to_branch: body.to_branch,
            to_project_id: body.to_project_id,
            values,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    let record = match detail {
        persistence::CreatePullRequestResult::Created(record) => {
            dispatch_pull_request_webhooks(
                repository,
                &record,
                &actor,
                "NEW_PULL_REQUEST",
                &record.body_markdown,
                None,
                None,
                &service.public_origin,
                &service.base_path,
                &service,
            )
            .await;
            record
        }
        persistence::CreatePullRequestResult::Duplicate(record) => record,
    };
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &to_authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_update_pull_request(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    body: RestPullRequestEditBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let values =
        rest_pull_request_mutation_input(body.title, body.body_markdown, body.attachment_ids)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        &service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    if !current.permissions.can_update {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request update is not allowed"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let record = repository
        .update_pull_request(persistence::UpdatePullRequestInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name,
            project_name,
            pull_request_number,
            values,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_update_pull_request_state(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    state: String,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        &service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    if !current.permissions.can_update_state {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request state update is not allowed"),
        ));
    }
    let next_state = normalize_identifier(&state);
    match next_state.as_str() {
        "closed" if current.state != "open" && current.state != "conflict" => {
            return Err(RestRouteError::bad_request("pull request is not open"));
        }
        "open" if current.state != "closed" => {
            return Err(RestRouteError::bad_request("pull request is not closed"));
        }
        "open" | "closed" => {}
        _ => return Err(RestRouteError::bad_request("invalid pull request state")),
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let record = repository
        .update_pull_request_state(persistence::PullRequestStateInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name,
            project_name,
            pull_request_number,
            state: next_state,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_accept_pull_request(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let (record, authorization) = accept_pull_request_for_actor(
        &service,
        repository,
        &actor,
        owner_name,
        project_name,
        pull_request_number,
    )
    .await?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

async fn accept_pull_request_for_actor(
    service: &PilotServiceImpl,
    repository: &PilotRepository,
    actor: &persistence::AppUserRecord,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
) -> Result<
    (
        persistence::PullRequestDetailRecord,
        persistence::ProjectAuthorizationRecord,
    ),
    RestRouteError,
> {
    let current = rest_pull_request_detail_response(
        service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    if !current.permissions.can_update_state {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request merge is not allowed"),
        ));
    }
    if current.conflict || current.state == "conflict" {
        return Err(RestRouteError::bad_request("pull request has conflicts"));
    }
    if current.state != "open" {
        return Err(RestRouteError::bad_request("pull request is not open"));
    }
    if current.required_reviewer_count > 0 && !current.reviewed {
        return Err(RestRouteError::bad_request(
            "pullRequest.not.enough.review.point",
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let from_project = repository
        .read_project_by_owner_and_name(&current.from_owner_name, &current.from_project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("source project not found"))?;
    let source_repo_path = yoram_vcs::repository_path(&service.data_root, from_project.id);
    let target_repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    let merge = yoram_vcs::merge_pull_request(
        &source_repo_path,
        &target_repo_path,
        &current.from_branch,
        &current.to_branch,
    )
    .map_err(code_browser_error)
    .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .merge_pull_request(persistence::PullRequestMergeInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            conflict: merge.conflict,
            merged_commit_id_from: merge.target_commit_id_before,
            merged_commit_id_to: merge.merged_commit_id,
            owner_name,
            project_name,
            pull_request_number,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    if !merge.conflict {
        dispatch_pull_request_webhooks(
            repository,
            &record,
            actor,
            "PULL_REQUEST_MERGED",
            &record.body_markdown,
            None,
            None,
            &service.public_origin,
            &service.base_path,
            &service,
        )
        .await;
    }

    Ok((record, authorization))
}

pub(crate) async fn rest_delete_pull_request_source_branch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        &service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    if !current.permissions.can_delete_source_branch {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request source branch delete is not allowed"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let source_project = repository
        .read_project_by_owner_and_name(&current.from_owner_name, &current.from_project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("source project not found"))?;
    let source_repo_path = yoram_vcs::repository_path(&service.data_root, source_project.id);
    yoram_vcs::delete_branch(&source_repo_path, &current.from_branch)
        .map_err(code_browser_error)
        .map_err(RestRouteError::from_connect_error)?;
    repository
        .delete_project_pushed_branch(source_project.id, &current.from_branch)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .read_pull_request_detail(
            &owner_name,
            &project_name,
            pull_request_number,
            Some(actor.id),
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_restore_pull_request_source_branch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        &service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    if !current.permissions.can_restore_source_branch {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request source branch restore is not allowed"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let source_project = repository
        .read_project_by_owner_and_name(&current.from_owner_name, &current.from_project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("source project not found"))?;
    let source_repo_path = yoram_vcs::repository_path(&service.data_root, source_project.id);
    let target_repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    yoram_vcs::restore_branch_from_merge(
        &source_repo_path,
        &target_repo_path,
        &current.from_branch,
        &current.merged_commit_id_to,
    )
    .map_err(code_browser_error)
    .map_err(RestRouteError::from_connect_error)?;
    repository
        .upsert_project_pushed_branch(source_project.id, &current.from_branch)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .read_pull_request_detail(
            &owner_name,
            &project_name,
            pull_request_number,
            Some(actor.id),
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_set_pull_request_review(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    reviewed: bool,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        &service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    if !current.permissions.can_review {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request review is not allowed"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let record = repository
        .set_pull_request_review(persistence::PullRequestReviewInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name,
            project_name,
            pull_request_number,
            reviewed,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    dispatch_pull_request_webhooks(
        repository,
        &record,
        &actor,
        "PULL_REQUEST_REVIEW_STATE_CHANGED",
        &record.body_markdown,
        None,
        Some(reviewed),
        &service.public_origin,
        &service.base_path,
        &service,
    )
    .await;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_set_pull_request_watch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    watching: bool,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        &service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    if watching {
        repository
            .watch_pull_request(current.id, actor.id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
    } else {
        repository
            .unwatch_pull_request(current.id, actor.id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
    }
    let record = repository
        .read_pull_request_detail(
            &owner_name,
            &project_name,
            pull_request_number,
            Some(actor.id),
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(crate) async fn rest_list_project_pull_requests(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestPullRequestListQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestListResponse>, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, actor_id).await?;
    let record = repository
        .list_project_pull_requests(
            &authorization.project,
            rest_pull_request_filter(query, actor_id),
            actor_id,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(rest_project_pull_request_list_from_record(
        &service, record, actor_id,
    )))
}

pub(crate) async fn rest_read_pull_request_detail(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, actor_id).await?;
    let record = repository
        .read_pull_request_detail(&owner_name, &project_name, pull_request_number, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            actor_id,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

fn rest_review_thread_is_outdated(
    thread: &RestReviewThread,
    pull_request: &RestPullRequestDetailResponse,
) -> bool {
    !thread.path.trim().is_empty()
        && !thread.prev_commit_id.trim().is_empty()
        && !thread.commit_id.trim().is_empty()
        && !pull_request.merged_commit_id_to.trim().is_empty()
        && thread.commit_id != pull_request.merged_commit_id_to
}

fn rest_review_thread_is_inline_for_changes(
    thread: &RestReviewThread,
    pull_request: &RestPullRequestDetailResponse,
    selected_commit_id: &str,
) -> bool {
    if thread.path.trim().is_empty() {
        return false;
    }
    let selected_commit_id = selected_commit_id.trim();
    if !selected_commit_id.is_empty() {
        return thread.commit_id.trim() == selected_commit_id;
    }
    !thread.prev_commit_id.trim().is_empty()
        && !rest_review_thread_is_outdated(thread, pull_request)
}

fn rest_review_thread_is_non_ranged_for_changes(
    thread: &RestReviewThread,
    selected_commit_id: &str,
) -> bool {
    if !thread.path.trim().is_empty() {
        return false;
    }
    let selected_commit_id = selected_commit_id.trim();
    selected_commit_id.is_empty() || thread.commit_id.trim() == selected_commit_id
}

pub(crate) async fn rest_read_pull_request_changes(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    query: RestPullRequestChangesQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestChangesResponse>, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, actor_id).await?;
    let record = repository
        .read_pull_request_detail(&owner_name, &project_name, pull_request_number, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    let merged_commit_id_from = record.merged_commit_id_from.clone();
    let merged_commit_id_to = record.merged_commit_id_to.clone();
    let detail = rest_pull_request_detail_from_record_with_repository_issue_references(
        &service,
        repository,
        record,
        &authorization,
        actor_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let repo_path = yoram_vcs::repository_path(&service.data_root, authorization.project.id);
    let diff = if merged_commit_id_from.trim().is_empty() || merged_commit_id_to.trim().is_empty() {
        yoram_vcs::PullRequestDiffSnapshot {
            commits: Vec::new(),
            files: Vec::new(),
            no_head: true,
        }
    } else {
        yoram_vcs::read_pull_request_diff_between_revisions(
            &repo_path,
            &merged_commit_id_from,
            &merged_commit_id_to,
        )
        .map_err(code_browser_error)
        .map_err(RestRouteError::from_connect_error)?
    };
    let selected_commit_id = query.commit_id.trim();
    let known_commit_state_by_id: HashMap<String, String> = detail
        .commits
        .iter()
        .map(|commit| (commit.commit_id.clone(), commit.state.clone()))
        .collect();
    let (commits, files) = if diff.no_head {
        (Vec::new(), Vec::new())
    } else {
        let commits: Vec<RestPullRequestCommit> = diff
            .commits
            .into_iter()
            .map(|record| {
                rest_pull_request_commit_from_vcs_record_with_state(
                    record,
                    &known_commit_state_by_id,
                )
            })
            .collect();
        let files = if selected_commit_id.is_empty() {
            diff.files
                .into_iter()
                .map(rest_pull_request_changed_file_from_vcs_record)
                .collect()
        } else if detail
            .commits
            .iter()
            .any(|commit| commit.commit_id == selected_commit_id)
            || commits
                .iter()
                .any(|commit| commit.commit_id == selected_commit_id)
        {
            yoram_vcs::read_commit_detail(&repo_path, selected_commit_id, None, "")
                .map_err(code_browser_error)
                .map_err(RestRouteError::from_connect_error)?
                .files
                .into_iter()
                .map(rest_pull_request_changed_file_from_code_commit_record)
                .collect()
        } else {
            return Err(RestRouteError::not_found("pull request commit not found"));
        };
        (commits, files)
    };
    let mut threads = detail.threads.clone();
    for thread in &mut threads {
        thread.is_outdated = rest_review_thread_is_outdated(thread, &detail);
    }
    let inline_threads = threads
        .iter()
        .filter(|thread| {
            rest_review_thread_is_inline_for_changes(thread, &detail, selected_commit_id)
        })
        .cloned()
        .collect();
    let non_ranged_threads = threads
        .iter()
        .filter(|thread| rest_review_thread_is_non_ranged_for_changes(thread, selected_commit_id))
        .cloned()
        .collect();
    Ok(Json(RestPullRequestChangesResponse {
        card_threads: threads.clone(),
        commits,
        files,
        inline_threads,
        non_ranged_threads,
        threads,
        pull_request: detail,
    }))
}

pub(crate) async fn rest_list_project_reviews(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestReviewThreadListQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestReviewThreadListResponse>, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, actor_id).await?;
    let side_filter_counts = rest_project_review_side_filter_counts(
        repository,
        &authorization.project,
        &query,
        actor_id,
    )
    .await?;
    let record = repository
        .list_project_review_threads(&authorization.project, rest_review_thread_filter(query))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(RestReviewThreadListResponse {
        all_count: side_filter_counts.0,
        author_count: side_filter_counts.2,
        closed_count: record.closed_count,
        items: record
            .items
            .into_iter()
            .map(|thread| rest_review_thread_from_record(thread, &service.base_path))
            .collect(),
        open_count: record.open_count,
        page_num: record.page_num,
        page_size: record.page_size,
        participant_count: side_filter_counts.1,
        state: record.state,
        total_count: record.total_count,
    }))
}

async fn rest_project_review_side_filter_counts(
    repository: &PilotRepository,
    project: &persistence::ProjectRecord,
    query: &RestReviewThreadListQuery,
    actor_id: Option<i64>,
) -> Result<(u32, u32, u32), RestRouteError> {
    let mut all_query = query.clone();
    all_query.author_id = 0;
    all_query.participant_id = 0;
    let all_count = repository
        .list_project_review_threads(project, rest_review_thread_filter(all_query))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .total_count;

    let Some(actor_id) = actor_id else {
        return Ok((all_count, 0, 0));
    };

    let mut participant_query = query.clone();
    participant_query.author_id = 0;
    participant_query.participant_id = actor_id;
    let participant_count = repository
        .list_project_review_threads(project, rest_review_thread_filter(participant_query))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .total_count;

    let mut author_query = query.clone();
    author_query.author_id = actor_id;
    author_query.participant_id = 0;
    let author_count = repository
        .list_project_review_threads(project, rest_review_thread_filter(author_query))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .total_count;

    Ok((all_count, participant_count, author_count))
}

pub(crate) async fn rest_list_organization_pull_requests(
    headers: HeaderMap,
    organization_name: String,
    query: RestOrganizationPullRequestListQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestListResponse>, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let authorization = repository
        .read_organization_authorization(&organization_name, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("organization not found"))?;
    let visible_projects =
        visible_code_projects_for_organization(repository, authorization.organization.id, actor_id)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .list_organization_pull_requests(
            visible_projects,
            rest_organization_pull_request_filter(query),
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(rest_pull_request_list_from_record(record, actor_id)))
}
