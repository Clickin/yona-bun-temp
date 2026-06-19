use axum::{
    extract::{Path, Query, RawQuery},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Redirect, Response},
    routing::{delete, get, patch, post, put},
    Form, Json, Router,
};
use buffa::view::OwnedView;
use serde::{Deserialize, Serialize};
use sha1::{Digest as _, Sha1};
use std::collections::HashMap;

use super::utils::{
    accepts_legacy_json, base_path_href, gravatar_url, legacy_content_update_body_from_value,
    legacy_external_api_auth_error_response, legacy_external_api_token_from_headers,
    legacy_external_attachment_result, legacy_external_authenticated_user_id,
    legacy_external_post_author, legacy_external_temporary_upload_file_ids,
    legacy_issue_comment_create_body_from_value, legacy_issue_detect_change_body_from_value,
    legacy_issue_update_body_from_value, legacy_json_find_value,
    organization_issue_list_item_to_proto, project_issue_list_item_to_proto,
};
use crate::generated::yona::pilot::v1::*;
use crate::{
    absolute_app_url, decode_query_component, deserialize_i64_vec_from_strings_or_numbers,
    deserialize_optional_i64_from_string_or_number, direct_project_update_allowed,
    direct_status_from_connect_error, dispatch_issue_webhooks, form_bool, form_value,
    headers_with_form_csrf, internal_error, issue_label_category_from_record, issue_label_css,
    issue_label_from_record, issue_reference_metadata_from_resolved,
    markdown_issue_references_for_project, markdown_mention_references,
    mention_reference_metadata_from_resolved, normalize_identifier, normalize_issue_label_color,
    parse_attachment_ids, parse_milestone_due_date, parse_rest_query_i64, parse_rest_query_u32,
    persistence, project_read_allowed, project_update_allowed, redirect_to,
    require_authenticated_user, require_project_authorization, require_project_read,
    require_project_resource_create, require_session, require_valid_csrf, rest_json_response,
    rest_owned_view, session::SessionManager, user_issue_filter_name, user_issue_state,
    visible_projects_for_organization, ConnectError, Context, ErrorCode, MarkdownIssueReference,
    MarkdownMentionReference, PilotBackend, PilotRepository, PilotServiceImpl,
    ProjectCreatableResource, RestIssueAssignableUsersQuery, RestRouteError,
};

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestUserIssuesQuery {
    filter: String,
    order_by: String,
    order_dir: String,
    page_num: u32,
    page_size: u32,
    query: String,
    state: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestDirectIssueFormQuery {
    #[serde(
        default,
        deserialize_with = "deserialize_optional_i64_from_string_or_number"
    )]
    comment_id: Option<i64>,
    mine: bool,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestIssueParentOptionsQuery {
    current_issue_number: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestDirectIssueFormProject {
    owner_name: String,
    project_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestDirectIssueFormOptionsResponse {
    body_markdown: String,
    refer_comment_id: String,
    selected_project: RestDirectIssueFormProject,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestMassUpdateIssuesBody {
    #[serde(
        default,
        deserialize_with = "deserialize_i64_vec_from_strings_or_numbers"
    )]
    add_label_ids: Vec<i64>,
    assignee_login_id: String,
    assignee_update: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_i64_vec_from_strings_or_numbers"
    )]
    issue_numbers: Vec<i64>,
    #[serde(
        default,
        deserialize_with = "deserialize_optional_i64_from_string_or_number"
    )]
    milestone_id: Option<i64>,
    milestone_update: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_i64_vec_from_strings_or_numbers"
    )]
    remove_label_ids: Vec<i64>,
    state: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestProjectIssuesQuery {
    assignee_id: Option<i64>,
    assignee_login_id: String,
    author_login_id: String,
    pub(crate) format: String,
    label_ids: Vec<i64>,
    milestone_id: Option<i64>,
    pub(crate) page_num: u32,
    state: String,
}

impl RestProjectIssuesQuery {
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
                "assigneeId" => query.assignee_id = Some(parse_rest_query_i64(&value)?),
                "assigneeLoginId" => query.assignee_login_id = value,
                "authorLoginId" => query.author_login_id = value,
                "format" => query.format = value,
                "labelIds" | "labelIds[]" => {
                    let parsed = parse_rest_query_i64(&value)?;
                    if parsed > 0 {
                        query.label_ids.push(parsed);
                    }
                }
                "milestoneId" => {
                    let parsed = parse_rest_query_i64(&value)?;
                    query.milestone_id = (parsed > 0).then_some(parsed);
                }
                "pageNum" => query.page_num = parse_rest_query_u32(&value)?,
                "state" => query.state = value,
                _ => {}
            }
        }

        Ok(query)
    }
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestOrganizationIssuesQuery {
    assignee_id: i64,
    author_id: i64,
    filter: String,
    items_per_page: u32,
    mention_id: i64,
    order_by: String,
    order_dir: String,
    page_num: u32,
    project_names: Vec<String>,
    state: String,
}

impl RestOrganizationIssuesQuery {
    fn from_raw_query(raw_query: Option<&str>) -> Result<Self, RestRouteError> {
        let mut query = Self::default();
        let Some(raw_query) = raw_query else {
            return Ok(query);
        };

        for pair in raw_query.split('&').filter(|pair| !pair.is_empty()) {
            let (raw_key, raw_value) = pair.split_once('=').unwrap_or((pair, ""));
            let key = decode_query_component(raw_key);
            let value = decode_query_component(raw_value);
            match key.as_str() {
                "assigneeId" => query.assignee_id = parse_rest_query_i64(&value)?,
                "authorId" => query.author_id = parse_rest_query_i64(&value)?,
                "filter" => query.filter = value,
                "itemsPerPage" => query.items_per_page = parse_rest_query_u32(&value)?,
                "mentionId" => query.mention_id = parse_rest_query_i64(&value)?,
                "orderBy" => query.order_by = value,
                "orderDir" => query.order_dir = value,
                "pageNum" => query.page_num = parse_rest_query_u32(&value)?,
                "projectNames" | "projectNames[]" => {
                    if !value.trim().is_empty() {
                        query.project_names.push(value);
                    }
                }
                "state" => query.state = value,
                _ => {}
            }
        }

        Ok(query)
    }
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestIssueMutationBody {
    assignee_login_id: String,
    #[serde(
        default,
        deserialize_with = "deserialize_i64_vec_from_strings_or_numbers"
    )]
    attachment_ids: Vec<i64>,
    body_markdown: String,
    due_date: String,
    is_draft: bool,
    is_publish: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_i64_vec_from_strings_or_numbers"
    )]
    label_ids: Vec<i64>,
    #[serde(
        default,
        deserialize_with = "deserialize_optional_i64_from_string_or_number"
    )]
    milestone_id: Option<i64>,
    #[serde(
        default,
        deserialize_with = "deserialize_optional_i64_from_string_or_number"
    )]
    parent_issue_id: Option<i64>,
    #[serde(
        default,
        deserialize_with = "deserialize_optional_i64_from_string_or_number"
    )]
    refer_comment_id: Option<i64>,
    title: String,
}

pub(crate) fn issue_list_filter_from_request(
    request: &ListProjectIssuesRequestView<'_>,
) -> persistence::IssueListFilter {
    persistence::IssueListFilter {
        assignee_id: None,
        assignee_login_id: (!request.assignee_login_id.trim().is_empty())
            .then(|| request.assignee_login_id.trim().to_string()),
        author_login_id: (!request.author_login_id.trim().is_empty())
            .then(|| request.author_login_id.trim().to_string()),
        draft_author_login_id: None,
        label_ids: request.label_ids.to_vec(),
        milestone_id: (request.milestone_id > 0).then_some(request.milestone_id),
        page_num: request.page_num.max(1),
        state: (!request.state.trim().is_empty()).then(|| request.state.trim().to_string()),
    }
}

pub(crate) async fn organization_issues_list(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ListOrganizationIssuesRequestView<'static>>,
) -> Result<(ListOrganizationIssuesResponse, Context), ConnectError> {
    if request.organization_name.trim().is_empty() {
        return Err(ConnectError::invalid_argument(
            "invalid organization issue list request",
        ));
    }
    let state = if request.state.trim().is_empty() {
        "open".to_string()
    } else {
        normalize_identifier(request.state)
    };
    if !matches!(state.as_str(), "open" | "closed") {
        return Err(ConnectError::invalid_argument(
            "invalid organization issue state",
        ));
    }

    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization issues require repository backend",
        ));
    };
    let session = service
        .session_manager
        .read_session_from_headers(&ctx.headers);
    let actor_id = session.as_ref().and_then(|session| session.user_id);
    let authorization = repository
        .read_organization_authorization(request.organization_name, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    let visible_projects =
        visible_projects_for_organization(repository, authorization.organization.id, actor_id)
            .await?;
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
                assignee_user_id: current_user_filter(request.assignee_id),
                author_id: current_user_filter(request.author_id),
                filter: Some(request.filter.to_string()).filter(|value| !value.trim().is_empty()),
                items_per_page: request.items_per_page,
                mention_user_id: None,
                order_by: request.order_by.to_string(),
                order_dir: request.order_dir.to_string(),
                page_num: request.page_num,
                project_names: request
                    .project_names
                    .iter()
                    .map(ToString::to_string)
                    .collect(),
                state,
            },
        )
        .await
        .map_err(internal_error)?;

    Ok((
        ListOrganizationIssuesResponse {
            closed_issue_count: record.closed_issue_count,
            items: record
                .items
                .into_iter()
                .map(organization_issue_list_item_to_proto)
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
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_issues_list(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ListProjectIssuesRequestView<'static>>,
) -> Result<(ListProjectIssuesResponse, Context), ConnectError> {
    if request.owner_name.trim().is_empty() || request.project_name.trim().is_empty() {
        return Err(ConnectError::invalid_argument(
            "invalid pilot project issue list request",
        ));
    }

    if let PilotBackend::Repository(repository) = &service.backend {
        let actor_id = service
            .session_manager
            .read_session_from_headers(&ctx.headers)
            .and_then(|session| session.user_id);

        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            actor_id,
        )
        .await?;

        let record = repository
            .list_project_issues_filtered(
                request.owner_name,
                request.project_name,
                issue_list_filter_from_request(&request),
            )
            .await
            .map_err(internal_error)?;

        return Ok((
            ListProjectIssuesResponse {
                items: record
                    .items
                    .into_iter()
                    .map(project_issue_list_item_to_proto)
                    .collect(),
                owner_name: authorization.project.owner_name,
                page_num: record.page_num,
                page_size: record.page_size,
                project_name: authorization.project.project_name,
                total_count: record.total_count,
                ..Default::default()
            },
            ctx,
        ));
    }

    if request.owner_name != "pilot" || request.project_name != "yona" {
        return Err(ConnectError::not_found("pilot project not found"));
    }

    Ok((
        ListProjectIssuesResponse {
            owner_name: "pilot".to_string(),
            project_name: "yona".to_string(),
            items: vec![ProjectIssueListItem {
                issue_number: 1,
                title: "Pilot issue".to_string(),
                state: "open".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        },
        ctx,
    ))
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestIssueStateBody {
    state: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueWeightResponse {
    weight: i16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueDetailResponse {
    #[serde(flatten)]
    detail: ReadIssueDetailResponse,
    author_id: Option<i64>,
    child_closed_count: u32,
    child_issues: Vec<RestIssueChildIssue>,
    child_open_count: u32,
    due_date_label: String,
    history_html: String,
    history_markdown: String,
    comment_parent_links: Vec<RestIssueCommentParentLink>,
    issue_id: i64,
    issue_voters: Vec<RestIssueVoter>,
    is_draft: bool,
    parent_issue_id: Option<i64>,
    parent_issue_number: Option<i64>,
    parent_issue_title: String,
    weight: i16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueCommentParentLink {
    id: i64,
    parent_comment_id: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueVoter {
    avatar_url: String,
    email_address: String,
    login_id: String,
    user_id: i64,
    user_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueChildIssue {
    assignee_label: String,
    created_label: String,
    is_draft: bool,
    issue_number: i64,
    labels: Vec<IssueLabel>,
    state: String,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueListItem {
    assignee_avatar_url: String,
    assignee_label: String,
    assignee_login_id: String,
    author_avatar_url: String,
    author_label: String,
    author_login_id: String,
    child_closed_count: u32,
    child_issues: Vec<RestIssueChildIssue>,
    child_open_count: u32,
    comment_count: u32,
    due_date_label: String,
    due_date_overdue: bool,
    id: i64,
    issue_number: i64,
    labels: Vec<IssueLabel>,
    milestone_id: i64,
    milestone_title: String,
    owner_name: String,
    parent_issue_number: Option<i64>,
    parent_issue_title: String,
    project_name: String,
    state: String,
    title: String,
    updated_label: String,
    voter_count: u32,
    watcher_count: u32,
    weight: i16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectIssueListResponse {
    draft_items: Vec<RestIssueListItem>,
    items: Vec<RestIssueListItem>,
    owner_name: String,
    page_num: u32,
    page_size: u32,
    project_name: String,
    total_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestOrganizationIssueListResponse {
    closed_issue_count: u32,
    items: Vec<RestIssueListItem>,
    open_issue_count: u32,
    organization_name: String,
    page_num: u32,
    page_size: u32,
    total_count: u32,
    visible_projects: Vec<OrganizationIssueProjectOption>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestUserIssueListResponse {
    closed_issue_count: u32,
    filter: String,
    items: Vec<RestIssueListItem>,
    open_issue_count: u32,
    page_num: u32,
    page_size: u32,
    side_filter_counts: RestUserIssueSideFilterCounts,
    state: String,
    total_count: u32,
    viewer_user_id: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestUserIssueSideFilterCounts {
    favorite: u32,
    mentioned: u32,
    shared: u32,
}

fn rest_issue_mutation_input_from_body(
    body: RestIssueMutationBody,
) -> Result<persistence::IssueMutationInput, ConnectError> {
    Ok(persistence::IssueMutationInput {
        assignee_login_id: (!body.assignee_login_id.trim().is_empty())
            .then(|| body.assignee_login_id.trim().to_string()),
        attachment_ids: body.attachment_ids,
        body_markdown: body.body_markdown,
        due_date: parse_milestone_due_date(&body.due_date)?,
        is_draft: body.is_draft,
        is_publish: body.is_publish,
        label_ids: body.label_ids,
        milestone_id: body.milestone_id.filter(|value| *value > 0),
        parent_issue_id: body.parent_issue_id.filter(|value| *value > 0),
        title: body.title.trim().to_string(),
    })
}

pub(crate) fn rest_project_issue_filter_from_query(
    query: RestProjectIssuesQuery,
) -> persistence::IssueListFilter {
    persistence::IssueListFilter {
        assignee_id: query.assignee_id,
        assignee_login_id: (!query.assignee_login_id.trim().is_empty())
            .then(|| query.assignee_login_id.trim().to_string()),
        author_login_id: (!query.author_login_id.trim().is_empty())
            .then(|| query.author_login_id.trim().to_string()),
        draft_author_login_id: None,
        label_ids: query.label_ids,
        milestone_id: query.milestone_id.filter(|value| *value > 0),
        page_num: query.page_num.max(1),
        state: (!query.state.trim().is_empty()).then(|| query.state.trim().to_string()),
    }
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestIssueCommentBody {
    #[serde(
        default,
        deserialize_with = "deserialize_i64_vec_from_strings_or_numbers"
    )]
    attachment_ids: Vec<i64>,
    contents_markdown: String,
    parent_comment_id: Option<i64>,
}

fn direct_comment_contents(form: &HashMap<String, String>) -> String {
    form_value(
        form,
        &[
            "contents",
            "contentsMarkdown",
            "contents_markdown",
            "body",
            "comment",
        ],
    )
    .trim()
    .to_string()
}

fn direct_comment_attachment_ids(form: &HashMap<String, String>) -> Vec<i64> {
    parse_attachment_ids(form_value(
        form,
        &["attachmentIds", "attachment_ids", "temporaryUploadFiles"],
    ))
}

fn direct_issue_comment_body(form: &HashMap<String, String>) -> RestIssueCommentBody {
    RestIssueCommentBody {
        attachment_ids: direct_comment_attachment_ids(form),
        contents_markdown: direct_comment_contents(form),
        parent_comment_id: form
            .get("parentCommentId")
            .and_then(|value| value.parse::<i64>().ok()),
    }
}

async fn direct_create_issue_comment(
    headers: HeaderMap,
    owner: String,
    project: String,
    issue_number: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Response {
    match rest_create_issue_comment(
        headers_with_form_csrf(headers, &form),
        owner.clone(),
        project.clone(),
        issue_number,
        direct_issue_comment_body(&form),
        session_manager,
        backend,
        base_path.clone(),
        public_origin,
    )
    .await
    {
        Ok(Json(detail)) => {
            let fragment = detail
                .detail
                .comments
                .iter()
                .max_by_key(|comment| comment.id)
                .map(|comment| format!("#comment-{}", comment.id))
                .unwrap_or_default();
            redirect_to(
                &base_path,
                &format!("/{owner}/{project}/issue/{issue_number}{fragment}"),
            )
        }
        Err(error) => error.into_response(),
    }
}

async fn direct_update_issue_comment(
    headers: HeaderMap,
    owner: String,
    project: String,
    issue_number: i64,
    comment_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    match rest_update_issue_comment(
        headers_with_form_csrf(headers, &form),
        owner.clone(),
        project.clone(),
        issue_number,
        comment_id,
        direct_issue_comment_body(&form),
        session_manager,
        backend,
        base_path.clone(),
    )
    .await
    {
        Ok(_) => redirect_to(
            &base_path,
            &format!("/{owner}/{project}/issue/{issue_number}#comment-{comment_id}"),
        ),
        Err(error) => error.into_response(),
    }
}

async fn direct_delete_issue_comment(
    headers: HeaderMap,
    owner: String,
    project: String,
    issue_number: i64,
    comment_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    match rest_delete_issue_comment(
        headers,
        owner.clone(),
        project.clone(),
        issue_number,
        comment_id,
        session_manager,
        backend,
        base_path.clone(),
    )
    .await
    {
        Ok(_) => redirect_to(
            &base_path,
            &format!("/{owner}/{project}/issue/{issue_number}"),
        ),
        Err(error) => error.into_response(),
    }
}

async fn direct_issue_comment_vote(
    headers: HeaderMap,
    owner: String,
    project: String,
    issue_number: i64,
    comment_id: i64,
    action: &str,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let session = match session_manager.read_session_from_headers(&headers) {
        Some(session) if session.user_id.is_some() => session,
        _ => return StatusCode::UNAUTHORIZED.into_response(),
    };
    if require_valid_csrf(&session_manager, &headers, &session).is_err() {
        return StatusCode::FORBIDDEN.into_response();
    }
    let actor = match require_authenticated_user(&repository, session.user_id).await {
        Ok(actor) => actor,
        Err(error) => return direct_status_from_connect_error(error).into_response(),
    };
    let access = match read_issue_access(
        &repository,
        &owner,
        &project,
        issue_number,
        Some(actor.id),
    )
    .await
    {
        Ok(access) => access,
        Err(error) => return direct_status_from_connect_error(error).into_response(),
    };
    if !access.viewer_can_comment() {
        return StatusCode::FORBIDDEN.into_response();
    }
    if !access
        .issue
        .comments
        .iter()
        .any(|comment| comment.id == comment_id)
    {
        return StatusCode::NOT_FOUND.into_response();
    }

    match action {
        "vote" => {
            if repository
                .vote_issue_comment(comment_id, actor.id)
                .await
                .is_err()
            {
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
        "unvote" => match repository.unvote_issue_comment(comment_id, actor.id).await {
            Ok(true) => {}
            Ok(false) => return StatusCode::NOT_FOUND.into_response(),
            Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
        },
        _ => return StatusCode::BAD_REQUEST.into_response(),
    }

    redirect_to(
        &base_path,
        &format!("/{owner}/{project}/issue/{issue_number}#comment-{comment_id}"),
    )
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueParentOption {
    id: i64,
    issue_number: i64,
    selected: bool,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueParentOptionsResponse {
    items: Vec<RestIssueParentOption>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueAssignableUserItem {
    avatar_url: String,
    display_name: String,
    login_id: String,
    pure_name_only: String,
    r#type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueAssignableUsersResponse {
    items: Vec<RestIssueAssignableUserItem>,
    total: u32,
    truncated: bool,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestIssueMentionUsersQuery {
    context: String,
    query: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueMentionUserItem {
    avatar_url: String,
    display_name: String,
    login_id: String,
    search_text: String,
    r#type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueMentionUsersResponse {
    items: Vec<RestIssueMentionUserItem>,
    total: u32,
    truncated: bool,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestProjectIssueReferencesQuery {
    query: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectIssueReferenceItem {
    issue_number: i64,
    state: String,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectIssueReferencesResponse {
    items: Vec<RestProjectIssueReferenceItem>,
    total: u32,
    truncated: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueAssigneeBody {
    assignee_login_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueSharerBody {
    login_id: String,
    #[serde(default)]
    target_type: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestIssueSharerDeleteQuery {
    target_type: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectLabelCreateBody {
    #[serde(default)]
    category_is_exclusive: bool,
    category_name: String,
    label_color: String,
    label_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectLabelUpdateBody {
    category_id: i64,
    label_color: String,
    label_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectLabelCategoryBody {
    #[serde(default)]
    category_is_exclusive: bool,
    category_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectLabelCopyBody {
    from_owner_name: String,
    from_project_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectLabelCopyResponse {
    copied: u32,
    labels: Vec<IssueLabel>,
    skipped: u32,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestMilestoneListQuery {
    order_by: String,
    order_dir: String,
    state: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestProjectMilestoneBody {
    attachment_ids: Vec<i64>,
    contents_markdown: String,
    due_date: String,
    state: String,
    title: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectMilestoneStateBody {
    state: String,
}

fn direct_json_label(label: &persistence::IssueLabelRecord) -> serde_json::Value {
    serde_json::json!({
        "id": label.id.to_string(),
        "name": label.name,
        "color": label.color,
        "category": label.category_name,
        "categoryId": label.category_id.unwrap_or_default().to_string(),
        "categoryIsExclusive": label.category_is_exclusive,
    })
}

fn direct_json_category(category: &persistence::IssueLabelCategoryRecord) -> serde_json::Value {
    serde_json::json!({
        "id": category.id.to_string(),
        "name": category.name,
        "isExclusive": category.is_exclusive.to_string(),
    })
}

pub(crate) async fn direct_list_issue_labels(
    headers: HeaderMap,
    owner: String,
    project: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if require_project_read(&repository, &owner, &project, actor_id)
        .await
        .is_err()
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    match repository.list_project_labels(&owner, &project).await {
        Ok(labels) => {
            Json(labels.iter().map(direct_json_label).collect::<Vec<_>>()).into_response()
        }
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) async fn direct_create_issue_label(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    let label_name = form_value(&form, &["labelName", "name"]).trim();
    let category_name = form_value(&form, &["categoryName", "category"]).trim();
    let color = match normalize_issue_label_color(form_value(&form, &["labelColor", "color"])) {
        Ok(color) => color,
        Err(_) => return StatusCode::BAD_REQUEST.into_response(),
    };
    if label_name.is_empty() || category_name.is_empty() {
        return StatusCode::BAD_REQUEST.into_response();
    }
    match repository
        .create_project_label(persistence::CreateProjectLabelInput {
            category_is_exclusive: form_bool(&form, &["categoryIsExclusive", "isExclusive"]),
            category_name: category_name.to_string(),
            label_color: color,
            label_name: label_name.to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some((label, true))) => {
            (StatusCode::CREATED, Json(direct_json_label(&label))).into_response()
        }
        Ok(Some((_label, false))) => StatusCode::NO_CONTENT.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) async fn direct_issue_label_css(
    headers: HeaderMap,
    owner: String,
    project: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if require_project_read(&repository, &owner, &project, actor_id)
        .await
        .is_err()
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    match repository.list_project_labels(&owner, &project).await {
        Ok(labels) => (
            [(http::header::CONTENT_TYPE, "text/css")],
            issue_label_css(&labels),
        )
            .into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) async fn direct_update_issue_label(
    headers: HeaderMap,
    owner: String,
    project: String,
    label_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    let category_id = form_value(&form, &["category.id", "categoryId"])
        .parse::<i64>()
        .unwrap_or_default();
    let color = match normalize_issue_label_color(form_value(&form, &["color", "labelColor"])) {
        Ok(color) => color,
        Err(_) => return StatusCode::BAD_REQUEST.into_response(),
    };
    match repository
        .update_project_label(persistence::UpdateProjectLabelInput {
            category_id,
            label_color: color,
            label_id,
            label_name: form_value(&form, &["name", "labelName"]).to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some(_)) => StatusCode::OK.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

pub(crate) async fn direct_delete_issue_label(
    headers: HeaderMap,
    owner: String,
    project: String,
    label_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if form_value(&form, &["_method"]).to_ascii_lowercase() != "delete" {
        return StatusCode::BAD_REQUEST.into_response();
    }
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .delete_project_label(&owner, &project, label_id)
        .await
    {
        Ok(true) => StatusCode::OK.into_response(),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) async fn direct_copy_issue_labels(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let redirect_response = || {
        Redirect::to(&base_path_href(
            &base_path,
            &format!("/{owner}/{project}/issue/labelsform"),
        ))
        .into_response()
    };
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let session = match direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        Ok(session) => session,
        Err(response) => return response,
    };
    let from_owner = form_value(&form, &["owner", "fromOwnerName"]).trim();
    let from_project = form_value(&form, &["projectName", "fromProjectName"]).trim();
    if from_owner.is_empty() || from_project.is_empty() {
        return redirect_response();
    }
    if require_project_read(&repository, from_owner, from_project, session.user_id)
        .await
        .is_ok()
    {
        if repository
            .copy_project_labels(from_owner, from_project, &owner, &project)
            .await
            .is_err()
        {
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    }
    redirect_response()
}

pub(crate) async fn direct_list_issue_label_categories(
    headers: HeaderMap,
    owner: String,
    project: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if require_project_read(&repository, &owner, &project, actor_id)
        .await
        .is_err()
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    match repository
        .list_project_label_categories(&owner, &project)
        .await
    {
        Ok(categories) => Json(
            categories
                .iter()
                .map(direct_json_category)
                .collect::<Vec<_>>(),
        )
        .into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) async fn direct_create_issue_label_category(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .create_project_label_category(persistence::CreateProjectLabelCategoryInput {
            category_is_exclusive: form_bool(&form, &["isExclusive", "categoryIsExclusive"]),
            category_name: form_value(&form, &["name", "categoryName"]).to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some((category, true))) => {
            (StatusCode::CREATED, Json(direct_json_category(&category))).into_response()
        }
        Ok(Some((_category, false))) => StatusCode::NO_CONTENT.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

pub(crate) async fn direct_update_issue_label_category(
    headers: HeaderMap,
    owner: String,
    project: String,
    category_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .update_project_label_category(persistence::UpdateProjectLabelCategoryInput {
            category_id,
            category_is_exclusive: form_bool(&form, &["isExclusive", "categoryIsExclusive"]),
            category_name: form_value(&form, &["name", "categoryName"]).to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some(_)) => StatusCode::OK.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

pub(crate) async fn direct_delete_issue_label_category(
    headers: HeaderMap,
    owner: String,
    project: String,
    category_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .delete_project_label_category(&owner, &project, category_id)
        .await
    {
        Ok(true) => StatusCode::OK.into_response(),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

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

async fn rest_list_project_labels(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ListProjectLabelsRequest {
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ListProjectLabelsRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .list_project_labels(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_list_project_label_categories(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ListProjectLabelsRequest {
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ListProjectLabelsRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .list_project_label_categories(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_create_project_label(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectLabelCreateBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = CreateProjectLabelRequest {
        category_is_exclusive: body.category_is_exclusive,
        category_name: body.category_name,
        label_color: body.label_color,
        label_name: body.label_name,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<CreateProjectLabelRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .create_project_label(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_update_project_label(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    label_id: i64,
    body: RestProjectLabelUpdateBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = UpdateProjectLabelRequest {
        category_id: body.category_id,
        label_color: body.label_color,
        label_id,
        label_name: body.label_name,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateProjectLabelRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .update_project_label(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_delete_project_label(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    label_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = DeleteProjectLabelRequest {
        label_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<DeleteProjectLabelRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .delete_project_label(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_copy_project_labels(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectLabelCopyBody,
    service: PilotServiceImpl,
) -> Result<Json<RestProjectLabelCopyResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = service.backend else {
        return Err(RestRouteError::not_implemented(
            "issue label requires repository backend",
        ));
    };
    require_authenticated_user(&repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let target_authorization =
        require_project_read(&repository, &owner_name, &project_name, session.user_id)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    if !crate::project_update_allowed(&target_authorization)
        .map_err(RestRouteError::from_connect_error)?
    {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("issue label copy is not allowed"),
        ));
    }
    require_project_read(
        &repository,
        &body.from_owner_name,
        &body.from_project_name,
        session.user_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let result = repository
        .copy_project_labels(
            &body.from_owner_name,
            &body.from_project_name,
            &owner_name,
            &project_name,
        )
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    Ok(Json(RestProjectLabelCopyResponse {
        copied: result.copied,
        labels: result
            .labels
            .iter()
            .map(crate::issue_label_from_record)
            .collect(),
        skipped: result.skipped,
    }))
}

async fn rest_create_project_label_category(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectLabelCategoryBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = CreateProjectLabelCategoryRequest {
        category_is_exclusive: body.category_is_exclusive,
        category_name: body.category_name,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<CreateProjectLabelCategoryRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .create_project_label_category(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_update_project_label_category(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    category_id: i64,
    body: RestProjectLabelCategoryBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = UpdateProjectLabelCategoryRequest {
        category_id,
        category_is_exclusive: body.category_is_exclusive,
        category_name: body.category_name,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateProjectLabelCategoryRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .update_project_label_category(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_delete_project_label_category(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    category_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = DeleteProjectLabelCategoryRequest {
        category_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<DeleteProjectLabelCategoryRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .delete_project_label_category(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_list_project_milestones(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestMilestoneListQuery,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ListProjectMilestonesRequest {
        order_by: if query.order_by.trim().is_empty() {
            "dueDate".to_string()
        } else {
            query.order_by
        },
        order_dir: if query.order_dir.trim().is_empty() {
            "asc".to_string()
        } else {
            query.order_dir
        },
        owner_name,
        project_name,
        state: if query.state.trim().is_empty() {
            "open".to_string()
        } else {
            query.state
        },
        ..Default::default()
    };
    let request = rest_owned_view::<ListProjectMilestonesRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .list_project_milestones(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_read_project_milestone(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    milestone_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadProjectMilestoneRequest {
        milestone_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ReadProjectMilestoneRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .read_project_milestone(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_create_project_milestone(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectMilestoneBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = CreateProjectMilestoneRequest {
        attachment_ids: body.attachment_ids,
        contents_markdown: body.contents_markdown,
        due_date: body.due_date,
        owner_name,
        project_name,
        state: body.state,
        title: body.title,
        ..Default::default()
    };
    let request = rest_owned_view::<CreateProjectMilestoneRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .create_project_milestone(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_update_project_milestone(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    milestone_id: i64,
    body: RestProjectMilestoneBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = UpdateProjectMilestoneRequest {
        attachment_ids: body.attachment_ids,
        contents_markdown: body.contents_markdown,
        due_date: body.due_date,
        milestone_id,
        owner_name,
        project_name,
        state: body.state,
        title: body.title,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateProjectMilestoneRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .update_project_milestone(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_delete_project_milestone(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    milestone_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = DeleteProjectMilestoneRequest {
        milestone_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<DeleteProjectMilestoneRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .delete_project_milestone(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_set_project_milestone_state(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    milestone_id: i64,
    body: RestProjectMilestoneStateBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = MilestoneStateMutationRequest {
        milestone_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<MilestoneStateMutationRequestView<'static>>(&request)?;
    let context = Context::new(headers);
    let (payload, ctx) = match normalize_identifier(&body.state).as_str() {
        "open" => service.open_project_milestone(context, request).await,
        "closed" | "close" => service.close_project_milestone(context, request).await,
        _ => Err(ConnectError::invalid_argument("invalid milestone state")),
    }
    .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_issue_participation(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    service: PilotServiceImpl,
    action: &str,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = IssueParticipationRequest {
        issue_number,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<IssueParticipationRequestView<'static>>(&request)?;
    let context = Context::new(headers);
    let (payload, ctx) = match action {
        "watch" => service.watch_issue(context, request).await,
        "unwatch" => service.unwatch_issue(context, request).await,
        "vote" => service.vote_issue(context, request).await,
        "unvote" => service.unvote_issue(context, request).await,
        _ => Err(ConnectError::invalid_argument(
            "invalid issue participation action",
        )),
    }
    .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn issue_participation_mutation(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<IssueParticipationRequestView<'static>>,
    action: &str,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id).await?;
    let access = read_issue_access(
        repository,
        request.owner_name,
        request.project_name,
        request.issue_number,
        Some(actor.id),
    )
    .await?;
    match action {
        "watch" => repository
            .watch_issue(access.issue.id, actor.id)
            .await
            .map_err(internal_error)?,
        "unwatch" => repository
            .unwatch_issue(access.issue.id, actor.id)
            .await
            .map_err(internal_error)?,
        "vote" => repository
            .vote_issue(access.issue.id, actor.id)
            .await
            .map_err(internal_error)?,
        "unvote" => repository
            .unvote_issue(access.issue.id, actor.id)
            .await
            .map_err(internal_error)?,
        _ => {
            return Err(ConnectError::invalid_argument(
                "invalid issue participation action",
            ));
        }
    }
    let updated = repository
        .read_issue_detail(
            request.owner_name,
            request.project_name,
            request.issue_number,
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
    Ok((
        issue_detail_response_from_record(
            &updated,
            false,
            true,
            session.user_id,
            &service.base_path,
        ),
        ctx,
    ))
}

async fn rest_issue_comment_participation(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    comment_id: i64,
    service: PilotServiceImpl,
    action: &str,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = IssueCommentParticipationRequest {
        comment_id,
        issue_number,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<IssueCommentParticipationRequestView<'static>>(&request)?;
    let context = Context::new(headers);
    let (payload, ctx) = match action {
        "vote" => service.vote_issue_comment(context, request).await,
        "unvote" => service.unvote_issue_comment(context, request).await,
        _ => Err(ConnectError::invalid_argument(
            "invalid issue comment participation action",
        )),
    }
    .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn issue_comment_participation_mutation(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<IssueCommentParticipationRequestView<'static>>,
    action: &str,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    if request.issue_number <= 0 || request.comment_id <= 0 {
        return Err(ConnectError::invalid_argument(
            "invalid issue comment participation request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id).await?;
    let access = read_issue_access(
        repository,
        request.owner_name,
        request.project_name,
        request.issue_number,
        Some(actor.id),
    )
    .await?;
    if !access.viewer_can_comment() {
        return Err(ConnectError::permission_denied(
            "issue comment vote is not allowed",
        ));
    }
    if !access
        .issue
        .comments
        .iter()
        .any(|comment| comment.id == request.comment_id)
    {
        return Err(ConnectError::not_found("pilot issue comment not found"));
    }

    match action {
        "vote" => repository
            .vote_issue_comment(request.comment_id, actor.id)
            .await
            .map_err(internal_error)?,
        "unvote" => {
            if !repository
                .unvote_issue_comment(request.comment_id, actor.id)
                .await
                .map_err(internal_error)?
            {
                return Err(ConnectError::not_found("issue comment vote not found"));
            }
        }
        _ => {
            return Err(ConnectError::invalid_argument(
                "invalid issue comment participation action",
            ));
        }
    }

    let updated = read_issue_access(
        repository,
        request.owner_name,
        request.project_name,
        request.issue_number,
        Some(actor.id),
    )
    .await?;
    Ok((
        issue_detail_response_from_access(&updated, Some(actor.id), &service.base_path),
        ctx,
    ))
}

pub(crate) async fn issue_favorite_toggle(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<IssueParticipationRequestView<'static>>,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id).await?;
    let access = read_issue_access(
        repository,
        request.owner_name,
        request.project_name,
        request.issue_number,
        Some(actor.id),
    )
    .await?;
    repository
        .toggle_favorite_issue(access.issue.id, actor.id)
        .await
        .map_err(internal_error)?;
    let updated = read_issue_access(
        repository,
        request.owner_name,
        request.project_name,
        request.issue_number,
        Some(actor.id),
    )
    .await?;
    Ok((
        issue_detail_response_from_access(&updated, Some(actor.id), &service.base_path),
        ctx,
    ))
}

pub(crate) async fn issue_sharer_mutation(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<IssueShareRequestView<'static>>,
    action: &str,
    target_type: &str,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    if request.owner_name.trim().is_empty()
        || request.project_name.trim().is_empty()
        || request.issue_number <= 0
        || request.login_id.trim().is_empty()
    {
        return Err(ConnectError::invalid_argument(
            "invalid issue sharer request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue sharer requires repository backend",
        ));
    };
    let access = read_issue_access(
        repository,
        request.owner_name,
        request.project_name,
        request.issue_number,
        session.user_id,
    )
    .await?;
    if !access.viewer_can_manage() {
        return Err(ConnectError::permission_denied(
            "issue sharer update is not allowed",
        ));
    }
    let actor = access.actor.as_ref().expect("authenticated issue actor");
    let normalized_target_type = target_type.trim().to_ascii_lowercase();
    let target_users = if normalized_target_type == "project" {
        let project_id = request
            .login_id
            .parse::<i64>()
            .map_err(|_| ConnectError::not_found("issue sharer project not found"))?;
        repository
            .read_public_project_by_id(project_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("issue sharer project not found"))?;
        repository
            .list_project_member_users(project_id)
            .await
            .map_err(internal_error)?
    } else if normalized_target_type.is_empty() || normalized_target_type == "user" {
        vec![repository
            .find_user_by_login_id(request.login_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("issue sharer user not found"))?]
    } else {
        return Err(ConnectError::invalid_argument(
            "unsupported issue sharer target type",
        ));
    };

    for target in target_users {
        let changed = match action {
            "share" => repository
                .add_issue_sharer(access.issue.id, target.id, &target.login_id)
                .await
                .map_err(internal_error)?,
            "unshare" => repository
                .remove_issue_sharer(access.issue.id, target.id)
                .await
                .map_err(internal_error)?,
            _ => {
                return Err(ConnectError::invalid_argument(
                    "invalid issue sharer action",
                ));
            }
        };
        if changed {
            repository
                .record_issue_sharer_changed(
                    access.issue.id,
                    actor.id,
                    &actor.login_id,
                    target.id,
                    &target.login_id,
                    action,
                )
                .await
                .map_err(internal_error)?;
        }
    }
    let updated = repository
        .read_issue_detail(
            request.owner_name,
            request.project_name,
            request.issue_number,
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
    let share_status = match session.user_id {
        Some(user_id) => repository
            .read_issue_share_status(updated.id, user_id)
            .await
            .map_err(internal_error)?,
        None => persistence::IssueShareStatus::default(),
    };
    Ok((
        issue_detail_response_from_record_with_sharer_flags(
            &updated,
            true,
            true,
            share_status.direct,
            share_status.inherited_from_parent,
            session.user_id,
            &service.base_path,
        ),
        ctx,
    ))
}

pub(crate) async fn issue_assignment_mutation(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<AssignIssueRequestView<'static>>,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    let existing = repository
        .read_issue_detail(
            request.owner_name,
            request.project_name,
            request.issue_number,
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
    if !issue_can_mutate(&authorization, &existing, &actor) {
        return Err(ConnectError::permission_denied(
            "issue assign is not allowed",
        ));
    }
    let issue = repository
        .assign_issue(
            request.owner_name,
            request.project_name,
            request.issue_number,
            Some(request.assignee_login_id).filter(|value| !value.trim().is_empty()),
            &actor.login_id,
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
    Ok((
        issue_detail_response_from_record(&issue, true, true, session.user_id, &service.base_path),
        ctx,
    ))
}

pub(crate) async fn project_labels_list(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ListProjectLabelsRequestView<'static>>,
) -> Result<(ListProjectLabelsResponse, Context), ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let session = service
        .session_manager
        .read_session_from_headers(&ctx.headers);
    require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.as_ref().and_then(|session| session.user_id),
    )
    .await?;
    let labels = repository
        .list_project_labels(request.owner_name, request.project_name)
        .await
        .map_err(internal_error)?
        .iter()
        .map(issue_label_from_record)
        .collect();
    Ok((
        ListProjectLabelsResponse {
            labels,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_create(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<CreateProjectLabelRequestView<'static>>,
) -> Result<(ProjectLabelMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
        ));
    };
    require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "issue label create is not allowed",
        ));
    }
    let color = normalize_issue_label_color(request.label_color)?;
    let Some((label, created)) = repository
        .create_project_label(persistence::CreateProjectLabelInput {
            category_is_exclusive: request.category_is_exclusive,
            category_name: request.category_name.trim().to_string(),
            label_color: color,
            label_name: request.label_name.trim().to_string(),
            owner_name: request.owner_name.to_string(),
            project_name: request.project_name.to_string(),
        })
        .await
        .map_err(internal_error)?
    else {
        return Err(ConnectError::not_found("project not found"));
    };
    Ok((
        ProjectLabelMutationResponse {
            created,
            label: Some(issue_label_from_record(&label)).into(),
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateProjectLabelRequestView<'static>>,
) -> Result<(ProjectLabelMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
        ));
    };
    require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "issue label update is not allowed",
        ));
    }
    let color = normalize_issue_label_color(request.label_color)?;
    let Some(label) = repository
        .update_project_label(persistence::UpdateProjectLabelInput {
            category_id: request.category_id,
            label_color: color,
            label_id: request.label_id,
            label_name: request.label_name.trim().to_string(),
            owner_name: request.owner_name.to_string(),
            project_name: request.project_name.to_string(),
        })
        .await
        .map_err(|error| ConnectError::invalid_argument(error.to_string()))?
    else {
        return Err(ConnectError::not_found("issue label not found"));
    };
    Ok((
        ProjectLabelMutationResponse {
            created: false,
            label: Some(issue_label_from_record(&label)).into(),
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_delete(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<DeleteProjectLabelRequestView<'static>>,
) -> Result<(ProjectLabelDeleteResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
        ));
    };
    require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "issue label delete is not allowed",
        ));
    }
    let ok = repository
        .delete_project_label(request.owner_name, request.project_name, request.label_id)
        .await
        .map_err(internal_error)?;
    if !ok {
        return Err(ConnectError::not_found("issue label not found"));
    }
    Ok((
        ProjectLabelDeleteResponse {
            ok,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_categories_list(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ListProjectLabelsRequestView<'static>>,
) -> Result<(ListProjectLabelCategoriesResponse, Context), ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
        ));
    };
    let session = service
        .session_manager
        .read_session_from_headers(&ctx.headers);
    require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.as_ref().and_then(|session| session.user_id),
    )
    .await?;
    let categories = repository
        .list_project_label_categories(request.owner_name, request.project_name)
        .await
        .map_err(internal_error)?
        .iter()
        .map(issue_label_category_from_record)
        .collect();
    Ok((
        ListProjectLabelCategoriesResponse {
            categories,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_category_create(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<CreateProjectLabelCategoryRequestView<'static>>,
) -> Result<(ProjectLabelCategoryMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
        ));
    };
    require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "issue label category create is not allowed",
        ));
    }
    let Some((category, created)) = repository
        .create_project_label_category(persistence::CreateProjectLabelCategoryInput {
            category_is_exclusive: request.category_is_exclusive,
            category_name: request.category_name.trim().to_string(),
            owner_name: request.owner_name.to_string(),
            project_name: request.project_name.to_string(),
        })
        .await
        .map_err(internal_error)?
    else {
        return Err(ConnectError::not_found("project not found"));
    };
    Ok((
        ProjectLabelCategoryMutationResponse {
            category: Some(issue_label_category_from_record(&category)).into(),
            created,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_category_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateProjectLabelCategoryRequestView<'static>>,
) -> Result<(ProjectLabelCategoryMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
        ));
    };
    require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "issue label category update is not allowed",
        ));
    }
    let Some(category) = repository
        .update_project_label_category(persistence::UpdateProjectLabelCategoryInput {
            category_id: request.category_id,
            category_is_exclusive: request.category_is_exclusive,
            category_name: request.category_name.trim().to_string(),
            owner_name: request.owner_name.to_string(),
            project_name: request.project_name.to_string(),
        })
        .await
        .map_err(|error| ConnectError::invalid_argument(error.to_string()))?
    else {
        return Err(ConnectError::not_found("issue label category not found"));
    };
    Ok((
        ProjectLabelCategoryMutationResponse {
            category: Some(issue_label_category_from_record(&category)).into(),
            created: false,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_category_delete(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<DeleteProjectLabelCategoryRequestView<'static>>,
) -> Result<(ProjectLabelDeleteResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
        ));
    };
    require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "issue label category delete is not allowed",
        ));
    }
    let ok = repository
        .delete_project_label_category(
            request.owner_name,
            request.project_name,
            request.category_id,
        )
        .await
        .map_err(internal_error)?;
    if !ok {
        return Err(ConnectError::not_found("issue label category not found"));
    }
    Ok((
        ProjectLabelDeleteResponse {
            ok,
            ..Default::default()
        },
        ctx,
    ))
}

async fn rest_toggle_favorite_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = IssueParticipationRequest {
        issue_number,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<IssueParticipationRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .toggle_favorite_issue(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_assign_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    body: RestIssueAssigneeBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = AssignIssueRequest {
        assignee_login_id: body.assignee_login_id,
        issue_number,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<AssignIssueRequestView<'static>>(&request)?;
    let (payload, ctx) = issue_assignment_mutation(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_share_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    body: RestIssueSharerBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = IssueShareRequest {
        issue_number,
        login_id: body.login_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<IssueShareRequestView<'static>>(&request)?;
    let (payload, ctx) = issue_sharer_mutation(
        &service,
        Context::new(headers),
        request,
        "share",
        &body.target_type,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_unshare_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    login_id: String,
    query: RestIssueSharerDeleteQuery,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = IssueShareRequest {
        issue_number,
        login_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<IssueShareRequestView<'static>>(&request)?;
    let (payload, ctx) = issue_sharer_mutation(
        &service,
        Context::new(headers),
        request,
        "unshare",
        &query.target_type,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

async fn rest_refreshed_issue_detail(
    headers: &HeaderMap,
    owner_name: &str,
    project_name: &str,
    issue_number: i64,
    service: &PilotServiceImpl,
    fallback: ReadIssueDetailResponse,
) -> Result<RestIssueDetailResponse, RestRouteError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Ok(RestIssueDetailResponse {
            author_id: None,
            child_closed_count: 0,
            child_issues: Vec::new(),
            child_open_count: 0,
            due_date_label: String::new(),
            detail: fallback,
            history_html: String::new(),
            history_markdown: String::new(),
            comment_parent_links: Vec::new(),
            issue_id: 0,
            issue_voters: Vec::new(),
            is_draft: false,
            parent_issue_id: None,
            parent_issue_number: None,
            parent_issue_title: String::new(),
            weight: 0,
        });
    };
    let access = read_issue_access(repository, owner_name, project_name, issue_number, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    rest_issue_detail_response_from_access_with_repository_issue_references(
        repository,
        &access,
        actor_id,
        &service.base_path,
    )
    .await
    .map_err(RestRouteError::from_connect_error)
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

async fn legacy_external_create_issue_comment(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let body = legacy_issue_comment_create_body_from_value(&body);
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue comments require repository backend")
            .into_response();
    };
    let token_request = legacy_external_api_token_from_headers(&headers).is_some();
    let request_user_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let request_actor = match repository.find_user_by_id(request_user_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "user not found",
            ));
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let _access = match read_issue_access(
        repository,
        &owner,
        &project_name,
        number,
        Some(request_actor.id),
    )
    .await
    {
        Ok(access) if access.viewer_can_comment() => access,
        Ok(_) => {
            return RestRouteError::from_connect_error(ConnectError::permission_denied(
                "issue comment create is not allowed",
            ))
            .into_response();
        }
        Err(_) => {
            match require_project_resource_create(
                repository,
                &owner,
                &project_name,
                Some(request_actor.id),
                ProjectCreatableResource::IssueComment,
            )
            .await
            {
                Ok(_) => {}
                Err(error) => return RestRouteError::from_connect_error(error).into_response(),
            }
            match read_issue_access(
                repository,
                &owner,
                &project_name,
                number,
                Some(request_actor.id),
            )
            .await
            {
                Ok(access) => access,
                Err(error) => return RestRouteError::from_connect_error(error).into_response(),
            }
        }
    };
    let comment_markdown = if token_request {
        body.comment.trim()
    } else {
        body.body.trim()
    };
    if comment_markdown.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "Expecting Json data",
            })),
        )
            .into_response();
    }
    let comment_author = if token_request {
        request_actor.clone()
    } else {
        match legacy_external_post_author(repository, &request_actor, body.author.as_ref()).await {
            Ok(actor) => actor,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        }
    };
    let issue = match repository
        .create_issue_comment(persistence::CreateIssueCommentInput {
            actor_display_name: comment_author.display_name.clone(),
            actor_id: comment_author.id,
            actor_login_id: comment_author.login_id.clone(),
            attachment_ids: legacy_external_temporary_upload_file_ids(
                body.temporary_upload_files.as_ref(),
            ),
            contents_markdown: comment_markdown.to_string(),
            issue_number: number,
            owner_name: owner.clone(),
            parent_comment_id: None,
            project_name: project_name.clone(),
        })
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    if token_request {
        return (
            StatusCode::CREATED,
            Json(serde_json::json!({
                "result": legacy_external_issue_result(&issue),
            })),
        )
            .into_response();
    }
    let comment_id = issue
        .comments
        .iter()
        .map(|comment| comment.id)
        .max()
        .unwrap_or_default();
    (
        StatusCode::CREATED,
        Json(serde_json::json!({
            "status": 201,
            "location": format!(
                "{}#comment-{}",
                base_path_href(&base_path, &format!("/{owner}/{project_name}/issue/{number}")),
                comment_id,
            ),
        })),
    )
        .into_response()
}

async fn legacy_external_update_issue_labels(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: Vec<serde_json::Value>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue labels require repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    if !access.viewer_can_manage() {
        return RestRouteError::from_connect_error(ConnectError::permission_denied(
            "issue label update is not allowed",
        ))
        .into_response();
    }
    let label_ids: Vec<i64> = body.iter().filter_map(legacy_external_label_id).collect();
    let issue = match repository
        .update_issue_labels(&owner, &project_name, number, &label_ids)
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "id": access.authorization.project.owner_name,
        "labels": issue.labels.len(),
    }))
    .into_response()
}

async fn legacy_external_update_issue_weight(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    delta: i16,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if number <= 0 {
        return RestRouteError::bad_request("invalid issue weight request").into_response();
    }
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue weight requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Permission denied",
            })),
        )
            .into_response();
    }
    let issue = match repository
        .update_issue_weight(&owner, &project_name, number, delta, Some(actor_id))
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "weight": issue.weight,
    }))
    .into_response()
}

async fn legacy_external_read_issue(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue read requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, false)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let payload = match legacy_external_issue_result_with_detail(repository, &access.issue).await {
        Ok(payload) => payload,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "result": payload,
    }))
    .into_response()
}

async fn legacy_external_update_issue(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let body = legacy_issue_update_body_from_value(&body);
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue update requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Permission denied",
            })),
        )
            .into_response();
    }
    let assignee_login_id = body
        .assignees
        .first()
        .map(|assignee| assignee.login_id.trim().to_string())
        .filter(|login_id| !login_id.is_empty())
        .or_else(|| {
            (!access.issue.assignee_login_id.trim().is_empty())
                .then(|| access.issue.assignee_login_id.clone())
        });
    let target_state = match body.state.as_str() {
        value if value.eq_ignore_ascii_case("open") => "open",
        value if value.eq_ignore_ascii_case("closed") => "closed",
        value if value.eq_ignore_ascii_case("close") => "closed",
        value if value.trim().is_empty() => "open",
        _ => "closed",
    };
    let issue = match repository
        .update_issue(persistence::UpdateIssueInput {
            actor_login_id: actor.login_id.clone(),
            issue_number: number,
            owner_name: owner.clone(),
            project_name: project_name.clone(),
            values: persistence::IssueMutationInput {
                assignee_login_id,
                attachment_ids: access
                    .issue
                    .attachments
                    .iter()
                    .map(|attachment| attachment.id)
                    .collect(),
                body_markdown: if body.body.is_empty() {
                    access.issue.body_markdown.clone()
                } else {
                    body.body
                },
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: access.issue.labels.iter().map(|label| label.id).collect(),
                milestone_id: access.issue.milestone_id,
                parent_issue_id: access.issue.parent_issue_id,
                title: if body.title.trim().is_empty() {
                    access.issue.title.clone()
                } else {
                    body.title.trim().to_string()
                },
            },
        })
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let issue = if issue.state.eq_ignore_ascii_case(target_state) {
        issue
    } else {
        match repository
            .update_issue_state_as_actor(
                &owner,
                &project_name,
                number,
                target_state,
                actor.id,
                &actor.login_id,
            )
            .await
        {
            Ok(Some(issue)) => issue,
            Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        }
    };
    Json(serde_json::json!({
        "result": legacy_external_issue_result(&issue),
    }))
    .into_response()
}

async fn legacy_external_detect_issue_change(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let body = legacy_issue_detect_change_body_from_value(&body);
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue detectChange requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, false)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let issue_update_date = match repository
        .read_issue_updated_at(&owner, &project_name, number)
        .await
    {
        Ok(updated_at) => updated_at
            .map(|value| value.and_utc().timestamp_millis())
            .unwrap_or_default(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let issue_body_checksum = legacy_external_sha1_hex(access.issue.body_markdown.as_bytes());
    let mut payload = serde_json::json!({
        "issueBodyChanged": issue_body_checksum != body.issue_body_checksum,
        "numOfComments": access.issue.comment_count,
        "issueBodyChecksum": issue_body_checksum,
        "issueUpdateDate": issue_update_date,
        "result": "ok",
    });
    if body.num_of_comments < access.issue.comment_count {
        if let Some(comment) = access
            .issue
            .comments
            .iter()
            .max_by_key(|comment| comment.id)
        {
            payload["commentAuthorName"] = serde_json::json!(comment.author_label);
        }
    }
    Json(payload).into_response()
}

async fn legacy_external_issue_comment_notification_receivers(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented(
            "issue comment receivers require repository backend",
        )
        .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, false)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    if let Err(error) =
        read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await
    {
        return RestRouteError::from_connect_error(error).into_response();
    }
    let comment_markdown = legacy_json_find_value(&body, "comment")
        .and_then(|value| value.as_str())
        .unwrap_or_default();
    let parent_comment_id = legacy_json_find_value(&body, "parentCommentId")
        .and_then(|value| {
            value.as_i64().or_else(|| {
                value
                    .as_str()
                    .and_then(|raw| raw.trim().parse::<i64>().ok())
            })
        })
        .filter(|value| *value > 0);
    let receivers = match repository
        .list_issue_comment_notification_receivers(
            &owner,
            &project_name,
            number,
            actor_id,
            comment_markdown,
            parent_comment_id,
        )
        .await
    {
        Ok(Some(receivers)) => receivers,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let receivers = receivers
        .into_iter()
        .map(|receiver| {
            serde_json::json!({
                "loginId": receiver.login_id,
                "name": receiver.display_name,
                "pureNameOnly": receiver.pure_name_only,
                "avatarUrl": if receiver.avatar_url.is_empty() {
                    gravatar_url(&receiver.email_address)
                } else {
                    receiver.avatar_url
                },
                "type": "user",
            })
        })
        .collect::<Vec<_>>();

    Json(serde_json::json!({ "receivers": receivers })).into_response()
}

fn legacy_external_sha1_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha1::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

async fn legacy_external_update_issue_content(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let body = legacy_content_update_body_from_value(&body);
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue content requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Forbidden request",
            })),
        )
            .into_response();
    }
    if access.issue.body_markdown != body.original {
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "message": "Already modified by someone.",
                "storedContent": access.issue.body_markdown,
            })),
        )
            .into_response();
    }
    let issue = match repository
        .update_issue_body(
            &owner,
            &project_name,
            number,
            actor.id,
            &actor.login_id,
            &body.content,
        )
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(legacy_external_issue_result(&issue)).into_response()
}

async fn legacy_external_update_issue_state(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue state requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Permission denied",
            })),
        )
            .into_response();
    }
    let state = match legacy_json_find_value(&body, "state").and_then(serde_json::Value::as_str) {
        Some(value) if value.eq_ignore_ascii_case("open") => "open",
        Some(_) => "closed",
        None => "open",
    };
    let issue = match repository
        .update_issue_state_as_actor(
            &owner,
            &project_name,
            number,
            state,
            actor.id,
            &actor.login_id,
        )
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "result": legacy_external_issue_result(&issue),
    }))
    .into_response()
}

async fn legacy_external_update_issue_assignee(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue assignee requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Permission denied",
            })),
        )
            .into_response();
    }
    let Some(assignee_login_id) = legacy_json_find_value(&body, "assignees")
        .and_then(serde_json::Value::as_array)
        .and_then(|assignees| assignees.first())
        .and_then(serde_json::Value::as_str)
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No assignee",
            })),
        )
            .into_response();
    };
    let issue = match repository
        .assign_issue(
            &owner,
            &project_name,
            number,
            Some(assignee_login_id).filter(|value| !value.trim().is_empty()),
            &actor.login_id,
        )
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let assignee = if issue.assignee_login_id.is_empty() {
        serde_json::json!({
            "loginId": "",
            "name": "None",
        })
    } else {
        serde_json::json!({
            "loginId": issue.assignee_login_id,
            "name": issue.assignee_label,
        })
    };
    Json(serde_json::json!({
        "assignee": assignee,
        "issue": format!("/{}/{}/issue/{}", owner, project_name, number),
    }))
    .into_response()
}

async fn legacy_external_update_issue_sharer(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue sharer requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Permission denied",
            })),
        )
            .into_response();
    }
    let Some(sharer) = legacy_json_find_value(&body, "sharer")
        .filter(|value| !value.is_null())
        .filter(|value| match value {
            serde_json::Value::Array(items) => !items.is_empty(),
            serde_json::Value::Object(map) => !map.is_empty(),
            _ => true,
        })
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No sharer",
            })),
        )
            .into_response();
    };
    let action = legacy_json_find_value(&body, "action")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default();
    let action_result = if action.eq_ignore_ascii_case("add") {
        "added"
    } else if action.eq_ignore_ascii_case("delete") {
        "deleted"
    } else {
        return Json(serde_json::json!({
            "action": format!("Do nothing. Unsupported action: {action}"),
        }))
        .into_response();
    };
    let target_type = legacy_json_find_value(sharer, "type")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("user")
        .trim()
        .to_ascii_lowercase();
    let (target_users, sharer_name) = if target_type == "project" {
        let Some(project_id) =
            legacy_json_find_value(sharer, "loginId").and_then(legacy_external_label_id)
        else {
            return RestRouteError::not_found("issue sharer project not found").into_response();
        };
        let project = match repository.read_public_project_by_id(project_id).await {
            Ok(Some(project)) => project,
            Ok(None) => {
                return RestRouteError::not_found("issue sharer project not found").into_response()
            }
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        let users = match repository.list_project_member_users(project_id).await {
            Ok(users) => users,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        (users, project.project_name)
    } else {
        let Some(login_id) =
            legacy_json_find_value(sharer, "loginId").and_then(serde_json::Value::as_str)
        else {
            return RestRouteError::not_found("issue sharer user not found").into_response();
        };
        let user = match repository.find_user_by_login_id(login_id).await {
            Ok(Some(user)) => user,
            Ok(None) => {
                return RestRouteError::not_found("issue sharer user not found").into_response()
            }
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        let display_name = user.display_name.clone();
        (vec![user], display_name)
    };
    for target in target_users {
        let changed = if action_result == "added" {
            match repository
                .add_issue_sharer(access.issue.id, target.id, &target.login_id)
                .await
            {
                Ok(changed) => changed,
                Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
            }
        } else {
            match repository
                .remove_issue_sharer(access.issue.id, target.id)
                .await
            {
                Ok(changed) => changed,
                Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
            }
        };
        if changed {
            let event_action = if action_result == "added" {
                "share"
            } else {
                "unshare"
            };
            if let Err(error) = repository
                .record_issue_sharer_changed(
                    access.issue.id,
                    actor.id,
                    &actor.login_id,
                    target.id,
                    &target.login_id,
                    event_action,
                )
                .await
            {
                return RestRouteError::internal(error.to_string()).into_response();
            }
        }
    }
    Json(serde_json::json!({
        "action": action_result,
        "sharer": sharer_name,
    }))
    .into_response()
}

async fn legacy_external_find_issue_sharer(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    query: RestIssueAssignableUsersQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue sharer lookup requires repository backend")
            .into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let access = match read_issue_access(repository, &owner, &project_name, number, actor_id).await
    {
        Ok(access) => access,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let requested = query
        .query
        .split(',')
        .map(normalize_identifier)
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    let payload = access
        .issue
        .sharers
        .iter()
        .filter(|sharer| {
            requested.is_empty()
                || requested
                    .iter()
                    .any(|value| value.eq_ignore_ascii_case(&sharer.login_id))
        })
        .map(|sharer| {
            serde_json::json!({
                "loginId": sharer.login_id,
                "name": sharer.user_label,
                "pureNameOnly": sharer.user_label,
                "avatarUrl": "",
                "type": "user",
            })
        })
        .collect::<Vec<_>>();
    Json(payload).into_response()
}

fn legacy_external_issue_result(issue: &persistence::IssueRecord) -> serde_json::Value {
    let mut payload = serde_json::json!({
        "number": issue.issue_number,
        "id": issue.id,
        "title": issue.title,
        "type": "ISSUE_POST",
        "author": {
            "loginId": issue.author_login_id,
            "name": issue.author_label,
            "email": issue.author_email_address,
        },
        "createdAt": "",
        "updatedAt": "",
        "body": issue.body_markdown,
        "owner": issue.owner_name,
        "projectName": issue.project_name,
        "state": issue.state,
        "refUrl": format!(
            "/{}/{}/issue/{}",
            issue.owner_name, issue.project_name, issue.issue_number
        ),
    });
    if !issue.assignee_login_id.is_empty() {
        payload["assignees"] = serde_json::json!([{
            "loginId": issue.assignee_login_id,
            "name": issue.assignee_label,
            "email": issue.assignee_email_address,
        }]);
    }
    if !issue.labels.is_empty() {
        payload["labels"] = serde_json::json!(issue
            .labels
            .iter()
            .map(|label| serde_json::json!({
                "labelName": label.name,
                "labelColor": label.color,
                "category": label.category_name,
            }))
            .collect::<Vec<_>>());
    }
    if let Some(milestone_id) = issue.milestone_id {
        payload["milestoneId"] = serde_json::json!(milestone_id);
        payload["milestoneTitle"] = serde_json::json!(issue.milestone_title);
    }
    payload
}

async fn legacy_external_issue_result_with_detail(
    repository: &PilotRepository,
    issue: &persistence::IssueRecord,
) -> Result<serde_json::Value, sea_orm::DbErr> {
    let mut payload = legacy_external_issue_result(issue);
    if !issue.attachments.is_empty() {
        payload["attachments"] = serde_json::json!(issue
            .attachments
            .iter()
            .map(legacy_external_attachment_result)
            .collect::<Vec<_>>());
    }
    if !issue.comments.is_empty() {
        payload["comments"] = serde_json::json!(issue
            .comments
            .iter()
            .filter(|comment| comment.parent_comment_id.is_none())
            .map(|comment| legacy_external_issue_comment_result(issue, comment))
            .collect::<Vec<_>>());
    }
    let events = legacy_external_issue_events_result(repository, issue).await?;
    if !events.is_empty() {
        payload["events"] = serde_json::json!(events);
    }
    Ok(payload)
}

fn legacy_external_issue_comment_result(
    issue: &persistence::IssueRecord,
    comment: &persistence::IssueCommentRecord,
) -> serde_json::Value {
    let child_comments = issue
        .comments
        .iter()
        .filter(|child| child.parent_comment_id == Some(comment.id))
        .map(|child| legacy_external_issue_comment_result(issue, child))
        .collect::<Vec<_>>();
    let mut payload = serde_json::json!({
        "id": comment.id,
        "type": "ISSUE_COMMENT",
        "author": {
            "loginId": comment.author_login_id,
            "name": comment.author_label,
            "email": comment.author_email_address,
        },
        "createdAt": comment.created_label,
        "body": comment.contents_markdown,
    });
    if !comment.attachments.is_empty() {
        payload["attachments"] = serde_json::json!(comment
            .attachments
            .iter()
            .map(legacy_external_attachment_result)
            .collect::<Vec<_>>());
    }
    if !child_comments.is_empty() {
        payload["childComments"] = serde_json::json!(child_comments);
    }
    payload
}

async fn legacy_external_issue_events_result(
    repository: &PilotRepository,
    issue: &persistence::IssueRecord,
) -> Result<Vec<serde_json::Value>, sea_orm::DbErr> {
    let mut events = Vec::new();
    for item in &issue.timeline {
        let persistence::IssueTimelineItemRecord::Event {
            created_label,
            event_type,
            id,
            new_value,
            old_value,
            sender_login_id,
        } = item
        else {
            continue;
        };
        let actor = repository.find_user_by_identifier(sender_login_id).await?;
        let actor_payload = match actor {
            Some(actor) => serde_json::json!({
                "name": actor.display_name,
                "loginId": actor.login_id,
                "englishName": "",
            }),
            None => serde_json::json!({
                "name": sender_login_id,
                "loginId": sender_login_id,
                "englishName": "",
            }),
        };
        events.push(serde_json::json!({
            "id": id,
            "createdDate": created_label,
            "eventType": event_type,
            "eventDescription": event_type,
            "oldValue": old_value,
            "newValue": new_value,
            "actor": actor_payload,
        }));
    }
    Ok(events)
}

pub(crate) fn legacy_external_label_id(value: &serde_json::Value) -> Option<i64> {
    value
        .as_i64()
        .or_else(|| value.as_str()?.trim().parse::<i64>().ok())
}

async fn legacy_external_update_issue_comment(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    comment_id: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let body = legacy_content_update_body_from_value(&body);
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue comment update requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, false)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let actor = match repository.find_user_by_id(actor_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "user not found",
            ));
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(existing_comment) = access
        .issue
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
    else {
        return RestRouteError::not_found("issue comment not found").into_response();
    };
    if existing_comment.contents_markdown != body.original {
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "message": "Already modified by someone.",
                "storedContent": existing_comment.contents_markdown,
            })),
        )
            .into_response();
    }
    let can_edit_comment = existing_comment.author_id == Some(actor.id)
        || issue_can_mutate(&access.authorization, &access.issue, &actor);
    if !can_edit_comment {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Forbidden request",
            })),
        )
            .into_response();
    }
    let existing_attachment_ids = existing_comment
        .attachments
        .iter()
        .map(|attachment| attachment.id)
        .collect();
    let issue = match repository
        .update_issue_comment(persistence::UpdateIssueCommentInput {
            actor_id: actor.id,
            attachment_ids: existing_attachment_ids,
            comment_id,
            contents_markdown: body.content,
            issue_number: number,
            owner_name: owner,
            project_name,
        })
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("issue comment not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let Some(updated_comment) = issue
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
    else {
        return RestRouteError::not_found("issue comment not found").into_response();
    };
    Json(serde_json::json!({
        "result": legacy_issue_comment_update_result(updated_comment, &actor),
    }))
    .into_response()
}

fn legacy_issue_comment_update_result(
    comment: &persistence::IssueCommentRecord,
    actor: &persistence::AppUserRecord,
) -> serde_json::Value {
    serde_json::json!({
        "id": comment.id,
        "contents": comment.contents_markdown,
        "createdDate": comment.created_label,
        "author": {
            "id": actor.id,
            "loginId": actor.login_id,
            "name": actor.display_name,
        },
    })
}

async fn legacy_external_issue_assignable_users(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    query: RestIssueAssignableUsersQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented(
            "issue assignable users require repository backend",
        )
        .into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if let Err(error) = read_issue_access(repository, &owner, &project_name, number, actor_id).await
    {
        return RestRouteError::from_connect_error(error).into_response();
    }
    let record = match repository
        .list_issue_assignable_users(
            &owner,
            &project_name,
            number,
            actor_id,
            &query.query,
            &query.search_type,
            10,
        )
        .await
    {
        Ok(Some(record)) => record,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(legacy_external_assignable_users_result(record)).into_response()
}

async fn legacy_external_issue_sharable_users(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    query: RestIssueAssignableUsersQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("issue sharable users require repository backend")
            .into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if let Err(error) = read_issue_access(repository, &owner, &project_name, number, actor_id).await
    {
        return RestRouteError::from_connect_error(error).into_response();
    }
    let record = match repository
        .list_issue_sharable_users(
            &owner,
            &project_name,
            number,
            &query.query,
            &query.search_type,
            10,
        )
        .await
    {
        Ok(Some(record)) => record,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(legacy_external_assignable_users_result(record)).into_response()
}

pub(crate) fn legacy_external_assignable_users_result(
    record: persistence::IssueAssignableUserSearchRecord,
) -> Vec<serde_json::Value> {
    record
        .items
        .into_iter()
        .map(|item| {
            serde_json::json!({
                "loginId": item.login_id,
                "name": item.display_name,
                "pureNameOnly": item.pure_name_only,
                "avatarUrl": item.avatar_url,
                "type": item.item_type,
            })
        })
        .collect()
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

async fn rest_list_issue_parent_options(
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

async fn rest_list_project_assignable_users(
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

async fn rest_list_issue_assignable_users(
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

async fn rest_list_issue_sharable_users(
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

async fn rest_list_issue_mention_users(
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

async fn rest_list_project_issue_references(
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

async fn rest_mass_update_issues(
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

pub(crate) async fn visible_user_issue_items(
    repository: &PilotRepository,
    user_id: i64,
    filter: persistence::UserIssueListFilter,
) -> Result<Vec<persistence::ProjectIssueListItemRecord>, ConnectError> {
    let candidates = repository
        .list_user_issue_candidates(user_id, filter)
        .await
        .map_err(internal_error)?;
    let mut visible = Vec::new();
    for candidate in candidates {
        if read_issue_access(
            repository,
            &candidate.item.owner_name,
            &candidate.item.project_name,
            candidate.item.issue_number,
            Some(user_id),
        )
        .await
        .is_ok()
        {
            visible.push(candidate.item);
        }
    }
    Ok(visible)
}

pub(crate) fn issue_attachment_from_record(
    record: &persistence::IssueAttachmentRecord,
    base_path: &str,
) -> IssueAttachment {
    IssueAttachment {
        id: record.id,
        mime_type: record.mime_type.clone(),
        name: record.name.clone(),
        size: record.size,
        url: base_path_href(base_path, &format!("/files/{}", record.id)),
        ..Default::default()
    }
}

fn issue_comment_from_record(
    record: &persistence::IssueCommentRecord,
    viewer_can_manage: bool,
    viewer_id: Option<i64>,
    base_path: &str,
    _owner_name: &str,
    _project_name: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> IssueComment {
    let viewer_is_author = viewer_id.is_some() && viewer_id == record.author_id;
    IssueComment {
        attachments: record
            .attachments
            .iter()
            .map(|attachment| issue_attachment_from_record(attachment, base_path))
            .collect(),
        author_label: record.author_label.clone(),
        author_avatar_url: gravatar_url(&record.author_email_address),
        author_login_id: record.author_login_id.clone(),
        contents_html: String::new(),
        contents_markdown: record.contents_markdown.clone(),
        created_label: record.created_label.clone(),
        id: record.id,
        issue_references: issue_references
            .iter()
            .map(issue_reference_metadata_from_resolved)
            .collect(),
        mention_references: mention_references
            .iter()
            .map(mention_reference_metadata_from_resolved)
            .collect(),
        via_email: record.via_email,
        viewer_can_delete: viewer_can_manage || viewer_is_author,
        viewer_can_update: viewer_can_manage || viewer_is_author,
        viewer_has_voted: record.viewer_has_voted,
        voter_count: record.voter_count,
        voters: record
            .voters
            .iter()
            .map(issue_comment_voter_from_record)
            .collect(),
        ..Default::default()
    }
}

fn issue_comment_voter_from_record(
    record: &persistence::IssueCommentVoterRecord,
) -> IssueCommentVoter {
    IssueCommentVoter {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id.clone(),
        user_id: record.user_id,
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

fn issue_voter_from_record(record: &persistence::IssueVoterRecord) -> RestIssueVoter {
    RestIssueVoter {
        avatar_url: gravatar_url(&record.email_address),
        email_address: record.email_address.clone(),
        login_id: record.login_id.clone(),
        user_id: record.user_id,
        user_label: record.user_label.clone(),
    }
}

fn issue_timeline_item_from_record(
    record: &persistence::IssueTimelineItemRecord,
    viewer_can_manage: bool,
    viewer_id: Option<i64>,
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> IssueTimelineItem {
    match record {
        persistence::IssueTimelineItemRecord::Comment(comment) => IssueTimelineItem {
            comment: Some(issue_comment_from_record(
                comment,
                viewer_can_manage,
                viewer_id,
                base_path,
                owner_name,
                project_name,
                issue_references,
                mention_references,
            ))
            .into(),
            created_label: comment.created_label.clone(),
            id: comment.id,
            kind: "comment".to_string(),
            ..Default::default()
        },
        persistence::IssueTimelineItemRecord::Event {
            created_label,
            event_type,
            id,
            new_value,
            old_value,
            sender_login_id,
        } => IssueTimelineItem {
            created_label: created_label.clone(),
            event_type: event_type.clone(),
            id: *id,
            kind: "event".to_string(),
            new_value: new_value.clone(),
            old_value: old_value.clone(),
            sender_login_id: sender_login_id.clone(),
            ..Default::default()
        },
    }
}

pub(crate) fn issue_milestone_from_record(
    record: &persistence::IssueMilestoneRecord,
    base_path: &str,
) -> IssueMilestone {
    IssueMilestone {
        attachments: record
            .attachments
            .iter()
            .map(|attachment| issue_attachment_from_record(attachment, base_path))
            .collect(),
        closed_issue_count: record.closed_issue_count,
        closed_issues: record
            .closed_issues
            .clone()
            .into_iter()
            .map(project_issue_list_item_to_proto)
            .collect(),
        completion_percent: record.completion_percent,
        contents_html: String::new(),
        contents_markdown: record.contents_markdown.clone(),
        due_date_label: record.due_date_label.clone(),
        id: record.id,
        open_issue_count: record.open_issue_count,
        open_issues: record
            .open_issues
            .clone()
            .into_iter()
            .map(project_issue_list_item_to_proto)
            .collect(),
        state: record.state.clone(),
        title: record.title.clone(),
        ..Default::default()
    }
}

pub(crate) async fn issue_milestone_from_record_with_issue_references(
    repository: &PilotRepository,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
    record: &persistence::IssueMilestoneRecord,
    base_path: &str,
) -> Result<IssueMilestone, ConnectError> {
    let issue_references = markdown_issue_references_for_project(
        repository,
        authorization,
        actor_id,
        &[record.contents_markdown.as_str()],
    )
    .await?;
    let mention_references =
        markdown_mention_references(repository, &[record.contents_markdown.as_str()]).await?;
    let mut milestone = issue_milestone_from_record(record, base_path);
    milestone.issue_references = issue_references
        .iter()
        .map(issue_reference_metadata_from_resolved)
        .collect();
    milestone.mention_references = mention_references
        .iter()
        .map(mention_reference_metadata_from_resolved)
        .collect();
    Ok(milestone)
}

pub(crate) fn issue_detail_response_from_record(
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_id: Option<i64>,
    base_path: &str,
) -> ReadIssueDetailResponse {
    issue_detail_response_from_record_with_sharer_flags(
        issue,
        viewer_can_manage,
        viewer_can_comment,
        false,
        false,
        viewer_id,
        base_path,
    )
}

pub(crate) async fn issue_detail_response_from_record_with_repository_issue_references(
    repository: &PilotRepository,
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_id: Option<i64>,
    base_path: &str,
) -> Result<ReadIssueDetailResponse, ConnectError> {
    let authorization = require_project_read(
        repository,
        &issue.owner_name,
        &issue.project_name,
        viewer_id,
    )
    .await?;
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
        markdown_issue_references_for_project(repository, &authorization, viewer_id, &markdowns)
            .await?;
    let mention_references = markdown_mention_references(repository, &markdowns).await?;
    Ok(
        issue_detail_response_from_record_with_sharer_flags_and_references(
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

pub(crate) fn issue_detail_response_from_record_with_sharer_flags(
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_is_direct_sharer: bool,
    viewer_has_inherited_share: bool,
    viewer_id: Option<i64>,
    base_path: &str,
) -> ReadIssueDetailResponse {
    let current_issue_reference = MarkdownIssueReference {
        owner_name: issue.owner_name.clone(),
        project_name: issue.project_name.clone(),
        issue_number: issue.issue_number,
        state: issue.state.clone(),
        title: issue.title.clone(),
    };
    issue_detail_response_from_record_with_sharer_flags_and_references(
        issue,
        viewer_can_manage,
        viewer_can_comment,
        viewer_is_direct_sharer,
        viewer_has_inherited_share,
        viewer_id,
        base_path,
        std::slice::from_ref(&current_issue_reference),
        &[],
    )
}

fn rest_issue_detail_response_from_record_with_sharer_flags_and_references(
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_is_direct_sharer: bool,
    viewer_has_inherited_share: bool,
    viewer_id: Option<i64>,
    base_path: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> RestIssueDetailResponse {
    let detail = issue_detail_response_from_record_with_sharer_flags_and_references(
        issue,
        viewer_can_manage,
        viewer_can_comment,
        viewer_is_direct_sharer,
        viewer_has_inherited_share,
        viewer_id,
        base_path,
        issue_references,
        mention_references,
    );
    RestIssueDetailResponse {
        author_id: issue.author_id,
        child_closed_count: issue.child_closed_count,
        child_issues: issue
            .child_issues
            .iter()
            .map(rest_issue_child_issue_from_record)
            .collect(),
        child_open_count: issue.child_open_count,
        due_date_label: issue.due_date_label.clone(),
        detail,
        history_html: String::new(),
        history_markdown: issue.history_markdown.clone(),
        comment_parent_links: issue
            .comments
            .iter()
            .map(|comment| RestIssueCommentParentLink {
                id: comment.id,
                parent_comment_id: comment.parent_comment_id,
            })
            .collect(),
        issue_id: issue.id,
        issue_voters: issue.voters.iter().map(issue_voter_from_record).collect(),
        is_draft: issue.is_draft,
        parent_issue_id: issue.parent_issue_id,
        parent_issue_number: issue.parent_issue_number,
        parent_issue_title: issue.parent_issue_title.clone(),
        weight: issue.weight,
    }
}

fn rest_issue_child_issue_from_record(
    record: &persistence::IssueChildRecord,
) -> RestIssueChildIssue {
    RestIssueChildIssue {
        assignee_label: record.assignee_label.clone(),
        created_label: record.created_label.clone(),
        is_draft: record.is_draft,
        issue_number: record.issue_number,
        labels: record
            .labels
            .iter()
            .map(super::utils::issue_label_from_record)
            .collect(),
        state: record.state.clone(),
        title: record.title.clone(),
    }
}

fn issue_detail_response_from_record_with_sharer_flags_and_references(
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_is_direct_sharer: bool,
    viewer_has_inherited_share: bool,
    viewer_id: Option<i64>,
    base_path: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> ReadIssueDetailResponse {
    ReadIssueDetailResponse {
        assignee_avatar_url: if issue.assignee_login_id.is_empty() {
            String::new()
        } else {
            gravatar_url(&issue.assignee_email_address)
        },
        assignee_label: issue.assignee_label.clone(),
        assignee_login_id: issue.assignee_login_id.clone(),
        attachments: issue
            .attachments
            .iter()
            .map(|attachment| issue_attachment_from_record(attachment, base_path))
            .collect(),
        author_avatar_url: gravatar_url(&issue.author_email_address),
        author_label: issue.author_label.clone(),
        author_login_id: issue.author_login_id.clone(),
        body_html: String::new(),
        body_markdown: issue.body_markdown.clone(),
        comment_count: issue.comment_count,
        comments: issue
            .comments
            .iter()
            .map(|comment| {
                issue_comment_from_record(
                    comment,
                    viewer_can_manage,
                    viewer_id,
                    base_path,
                    &issue.owner_name,
                    &issue.project_name,
                    issue_references,
                    mention_references,
                )
            })
            .collect(),
        has_voted: issue.has_voted,
        issue_references: issue_references
            .iter()
            .map(issue_reference_metadata_from_resolved)
            .collect(),
        mention_references: mention_references
            .iter()
            .map(mention_reference_metadata_from_resolved)
            .collect(),
        is_favorited: issue.is_favorited,
        is_watching: issue.is_watching,
        issue_number: issue.issue_number,
        labels: issue
            .labels
            .iter()
            .map(super::utils::issue_label_from_record)
            .collect(),
        milestone_id: issue.milestone_id.unwrap_or_default(),
        milestone_title: issue.milestone_title.clone(),
        owner_name: issue.owner_name.clone(),
        project_name: issue.project_name.clone(),
        sharers: issue.sharers.iter().map(issue_sharer_from_record).collect(),
        state: issue.state.clone(),
        timeline: issue
            .timeline
            .iter()
            .map(|item| {
                issue_timeline_item_from_record(
                    item,
                    viewer_can_manage,
                    viewer_id,
                    base_path,
                    &issue.owner_name,
                    &issue.project_name,
                    issue_references,
                    mention_references,
                )
            })
            .collect(),
        title: issue.title.clone(),
        viewer_can_comment,
        viewer_can_delete: viewer_can_manage,
        viewer_can_manage_sharers: viewer_can_manage,
        viewer_can_update: viewer_can_manage,
        viewer_has_inherited_share,
        viewer_is_direct_sharer,
        voter_count: issue.voter_count,
        watcher_count: issue.watcher_count,
        ..Default::default()
    }
}

fn issue_sharer_from_record(record: &persistence::IssueSharerRecord) -> IssueSharer {
    IssueSharer {
        login_id: record.login_id.clone(),
        user_id: record.user_id,
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

fn rest_issue_list_item_from_record(
    item: persistence::ProjectIssueListItemRecord,
) -> RestIssueListItem {
    RestIssueListItem {
        assignee_avatar_url: if item.assignee_email_address.trim().is_empty() {
            String::new()
        } else {
            gravatar_url(&item.assignee_email_address)
        },
        assignee_label: item.assignee_label,
        assignee_login_id: item.assignee_login_id,
        author_avatar_url: if item.author_email_address.trim().is_empty() {
            String::new()
        } else {
            gravatar_url(&item.author_email_address)
        },
        author_label: item.author_label,
        author_login_id: item.author_login_id,
        child_closed_count: item.child_closed_count,
        child_issues: item
            .child_issues
            .iter()
            .map(rest_issue_child_issue_from_record)
            .collect(),
        child_open_count: item.child_open_count,
        comment_count: item.comment_count,
        due_date_label: item.due_date_label,
        due_date_overdue: item.due_date_overdue,
        id: item.id,
        issue_number: item.issue_number,
        labels: item
            .labels
            .iter()
            .map(super::utils::issue_label_from_record)
            .collect(),
        milestone_id: item.milestone_id.unwrap_or_default(),
        milestone_title: item.milestone_title,
        owner_name: item.owner_name,
        parent_issue_number: item.parent_issue_number,
        parent_issue_title: item.parent_issue_title,
        project_name: item.project_name,
        state: item.state,
        title: item.title,
        updated_label: item.updated_label,
        voter_count: item.voter_count,
        watcher_count: item.watcher_count,
        weight: item.weight,
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
