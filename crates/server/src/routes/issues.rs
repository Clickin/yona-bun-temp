use axum::{
    extract::{Path, Query, RawQuery},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Redirect, Response},
    routing::{delete, get, patch, post, put},
    Form, Json, Router,
};
use buffa::view::OwnedView;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[cfg(debug_assertions)]
use super::utils::organization_issue_list_item_to_proto;
use super::utils::{
    accepts_legacy_json, base_path_href, gravatar_url, legacy_content_update_body_from_value,
    legacy_external_api_auth_error_response, legacy_external_api_token_from_headers,
    legacy_external_attachment_result, legacy_external_authenticated_user_id,
    legacy_external_post_author, legacy_external_temporary_upload_file_ids,
    legacy_issue_comment_create_body_from_value, legacy_issue_detect_change_body_from_value,
    legacy_issue_update_body_from_value, legacy_json_find_value, project_issue_list_item_to_proto,
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
    visible_projects_for_organization, ConnectError, Context, MarkdownIssueReference,
    MarkdownMentionReference, PilotBackend, PilotRepository, PilotServiceImpl,
    ProjectCreatableResource, RestIssueAssignableUsersQuery, RestRouteError,
};

mod comments;
mod labels;
mod legacy_external;
mod lookups;
mod meta;
mod milestones;

use comments::{
    derived_issue_comment_markdown, direct_create_issue_comment, direct_delete_issue_comment,
    direct_issue_body_markdown_from_comment, direct_issue_comment_vote,
    direct_update_issue_comment, rest_create_issue_comment, rest_delete_issue_comment,
    rest_update_issue_comment, RestIssueCommentBody,
};
use labels::{
    direct_copy_issue_labels, direct_create_issue_label, direct_create_issue_label_category,
    direct_delete_issue_label, direct_delete_issue_label_category, direct_issue_label_css,
    direct_list_issue_label_categories, direct_list_issue_labels, direct_read_issue_label_category,
    direct_update_issue_label, direct_update_issue_label_category, rest_copy_project_labels,
    rest_create_project_label, rest_create_project_label_category, rest_delete_project_label,
    rest_delete_project_label_category, rest_list_project_label_categories,
    rest_list_project_labels, rest_update_project_label, rest_update_project_label_category,
    RestProjectLabelCategoryBody, RestProjectLabelCopyBody, RestProjectLabelCreateBody,
    RestProjectLabelUpdateBody,
};
pub(crate) use labels::{
    project_label_categories_list, project_label_category_create, project_label_category_delete,
    project_label_category_update, project_label_create, project_label_delete,
    project_label_update, project_labels_list,
};
pub(crate) use legacy_external::{
    legacy_external_assignable_users_result, legacy_external_label_id,
};
use legacy_external::{
    legacy_external_create_issue_comment, legacy_external_detect_issue_change,
    legacy_external_find_issue_sharer, legacy_external_issue_assignable_users,
    legacy_external_issue_comment_notification_receivers, legacy_external_issue_sharable_users,
    legacy_external_read_issue, legacy_external_update_issue,
    legacy_external_update_issue_assignee, legacy_external_update_issue_comment,
    legacy_external_update_issue_content, legacy_external_update_issue_labels,
    legacy_external_update_issue_sharer, legacy_external_update_issue_state,
    legacy_external_update_issue_weight,
};
pub(crate) use lookups::resolve_issue_reference_search_project;
use lookups::{
    rest_list_issue_assignable_users, rest_list_issue_mention_users,
    rest_list_issue_parent_options, rest_list_issue_sharable_users,
    rest_list_project_assignable_users, rest_list_project_issue_references,
    RestIssueMentionUsersQuery, RestIssueParentOptionsQuery, RestProjectIssueReferencesQuery,
};
pub(crate) use meta::{
    issue_comment_participation_mutation, issue_favorite_toggle, issue_participation_mutation,
};
use meta::{
    rest_assign_issue, rest_issue_comment_participation, rest_issue_participation,
    rest_share_issue, rest_toggle_favorite_issue, rest_unshare_issue, RestIssueAssigneeBody,
    RestIssueSharerBody, RestIssueSharerDeleteQuery,
};
use milestones::{
    rest_create_project_milestone, rest_delete_project_milestone, rest_list_project_milestones,
    rest_read_project_milestone, rest_set_project_milestone_state, rest_update_project_milestone,
    RestMilestoneListQuery, RestProjectMilestoneBody, RestProjectMilestoneStateBody,
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
    delete: bool,
    #[serde(alias = "due_date")]
    due_date: String,
    #[serde(alias = "dueDateChanged", alias = "is_due_date_changed")]
    is_due_date_changed: bool,
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

#[cfg(debug_assertions)]
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

#[cfg(debug_assertions)]
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

#[cfg(debug_assertions)]
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

#[cfg(debug_assertions)]
pub(crate) async fn issue_detail_read(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ReadIssueDetailRequestView<'static>>,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    if request.owner_name.trim().is_empty()
        || request.project_name.trim().is_empty()
        || request.issue_number <= 0
    {
        return Err(ConnectError::invalid_argument(
            "invalid pilot issue detail request",
        ));
    }

    if let PilotBackend::Repository(repository) = &service.backend {
        let session = service
            .session_manager
            .read_session_from_headers(&ctx.headers);
        let actor_id = session.as_ref().and_then(|session| session.user_id);
        let access = read_issue_access(
            repository,
            request.owner_name,
            request.project_name,
            request.issue_number,
            actor_id,
        )
        .await?;
        return Ok((
            issue_detail_response_from_access(&access, actor_id, &service.base_path),
            ctx,
        ));
    } else if request.owner_name != "pilot"
        || request.project_name != "yona"
        || request.issue_number != 1
    {
        return Err(ConnectError::not_found("pilot issue not found"));
    }

    Ok((pilot_issue_response("open"), ctx))
}

#[cfg(debug_assertions)]
pub(crate) async fn issue_state_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateIssueStateRequestView<'static>>,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;

    if request.issue_number <= 0 || !matches!(request.state, "open" | "closed") {
        return Err(ConnectError::invalid_argument(
            "invalid pilot issue state request",
        ));
    }

    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;

    if let PilotBackend::Repository(repository) = &service.backend {
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
                "issue state update is not allowed",
            ));
        }
        let issue = repository
            .update_issue_state_as_actor(
                request.owner_name,
                request.project_name,
                request.issue_number,
                request.state,
                actor.id,
                &actor.login_id,
            )
            .await
            .map_err(internal_error)?;

        return issue
            .map(|issue| {
                (
                    issue_detail_response_from_record(
                        &issue,
                        true,
                        true,
                        session.user_id,
                        &service.base_path,
                    ),
                    ctx,
                )
            })
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"));
    }

    if request.owner_name != "pilot" || request.project_name != "yona" || request.issue_number != 1
    {
        return Err(ConnectError::not_found("pilot issue not found"));
    }

    Ok((pilot_issue_response(request.state), ctx))
}

#[cfg(debug_assertions)]
fn pilot_issue_response(state: &str) -> ReadIssueDetailResponse {
    ReadIssueDetailResponse {
        owner_name: "pilot".to_string(),
        project_name: "yona".to_string(),
        issue_number: 1,
        title: "Pilot issue".to_string(),
        state: state.to_string(),
        ..Default::default()
    }
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
    parent_issue_state: String,
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
    comment_count: u32,
    created_label: String,
    is_draft: bool,
    issue_number: i64,
    labels: Vec<IssueLabel>,
    state: String,
    title: String,
    voter_count: u32,
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

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    let session_manager = service.session_manager.clone();
    let backend = service.backend.clone();
    let base_path = service.base_path.clone();

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
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestIssueMutationBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    let service = service.clone();
                    async move {
                        rest_create_issue(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            session_manager,
                            backend,
                            base_path,
                            service,
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
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestMassUpdateIssuesBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    let service = service.clone();
                    async move {
                        rest_mass_update_issues(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            session_manager,
                            backend,
                            base_path,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/issues/parent-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestIssueParentOptionsQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_issue_parent_options(
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
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestIssueMutationBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    let service = service.clone();
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
                            service,
                        )
                        .await
                    }
                }
            })
            .delete({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    let service = service.clone();
                    async move {
                        rest_delete_issue(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            session_manager,
                            backend,
                            base_path,
                            service,
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
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestIssueStateBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    let service = service.clone();
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
                            service,
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
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestIssueCommentBody>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    let service = service.clone();
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
                            service,
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
                    let service = service.clone();
                    async move {
                        rest_list_project_assignable_users(
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
            "/owners/{owner_name}/projects/{project_name}/issue-references",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Query(query): Query<RestProjectIssueReferencesQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_project_issue_references(
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
            "/owners/{owner_name}/projects/{project_name}/issues/{issue_number}/assignable-users",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, issue_number)): Path<(String, String, i64)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_issue_assignable_users(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            query,
                            service,
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
                    let service = service.clone();
                    async move {
                        rest_list_issue_sharable_users(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            query,
                            service,
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
                    let service = service.clone();
                    async move {
                        rest_list_issue_mention_users(
                            headers,
                            owner_name,
                            project_name,
                            issue_number,
                            query,
                            service,
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

pub(crate) fn routes(service: PilotServiceImpl) -> Router {
    let session_manager = service.session_manager.clone();
    let backend = service.backend.clone();
    let base_path = service.base_path.clone();

    let legacy_issue_label_service = service.clone();
    let legacy_issue_weight_up_service = service.clone();
    let legacy_issue_weight_down_service = service.clone();
    let legacy_issue_content_service = service.clone();
    let legacy_issue_detect_change_service = service.clone();
    let legacy_issue_read_service = service.clone();
    let legacy_issue_update_service = service.clone();
    let legacy_issue_state_service = service.clone();
    let legacy_issue_assignee_service = service.clone();
    let legacy_issue_share_service = service.clone();
    let legacy_issue_find_sharer_service = service.clone();
    let legacy_issue_assignable_service = service.clone();
    let legacy_issue_sharable_service = service.clone();
    let legacy_issue_comment_service = service.clone();
    let legacy_issue_comment_receivers_service = service.clone();
    let legacy_issue_comment_update_service = service.clone();
    let issue_comment_create_backend = backend.clone();
    let issue_comment_create_session_manager = session_manager.clone();
    let issue_comment_create_base_path = base_path.clone();
    let issue_comment_create_service = service.clone();
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
    let label_list_service = service.clone();
    let label_create_service = service.clone();
    let label_css_service = service.clone();
    let label_update_service = service.clone();
    let label_delete_service = service.clone();
    let label_copy_service = service.clone();
    let category_list_service = service.clone();
    let category_create_service = service.clone();
    let category_update_service = service.clone();
    let category_read_service = service.clone();
    let category_delete_service = service.clone();

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
                            legacy_issue_label_service.clone(),
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
                            legacy_issue_weight_up_service.clone(),
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
                            legacy_issue_weight_down_service.clone(),
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
                            legacy_issue_content_service.clone(),
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
                            legacy_issue_detect_change_service.clone(),
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
                            legacy_issue_read_service.clone(),
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
                            legacy_issue_update_service.clone(),
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
                            legacy_issue_state_service.clone(),
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
                            legacy_issue_assignee_service.clone(),
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
                            legacy_issue_share_service.clone(),
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
                            legacy_issue_find_sharer_service.clone(),
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
                            legacy_issue_assignable_service.clone(),
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
                            legacy_issue_sharable_service.clone(),
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
                            legacy_issue_comment_service.clone(),
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
                            legacy_issue_comment_update_service.clone(),
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
                            legacy_issue_comment_receivers_service.clone(),
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
                            issue_comment_create_service.clone(),
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
                            label_list_service.clone(),
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
                            label_create_service.clone(),
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
                            label_css_service.clone(),
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
                            label_update_service.clone(),
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
                            label_delete_service.clone(),
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
                            label_copy_service.clone(),
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
                            category_list_service.clone(),
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
                            category_create_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/label/category/{category_id}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project, category_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_read_issue_label_category(
                            headers,
                            owner,
                            project,
                            category_id,
                            category_read_service.clone(),
                        )
                        .await
                    }
                },
            )
            .put(
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
                            category_update_service.clone(),
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
                            category_delete_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}

async fn rest_list_project_issues(
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

async fn rest_list_organization_issues(
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

async fn rest_read_issue_detail(
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

async fn rest_update_issue_state(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    body: RestIssueStateBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let public_origin = service.public_origin.clone();
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
    if !issue.is_draft && existing.state != issue.state {
        dispatch_issue_webhooks(
            repository,
            &issue,
            &actor,
            "ISSUE_STATE_CHANGED",
            &issue.body_markdown,
            None,
            &public_origin,
            &base_path,
            &service.integrations,
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

async fn rest_create_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestIssueMutationBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let public_origin = service.public_origin.clone();
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
            &service.integrations,
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

async fn rest_update_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    body: RestIssueMutationBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let public_origin = service.public_origin.clone();
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
            actor_login_id: actor.login_id.clone(),
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
    if !issue.is_draft && existing.body_markdown != issue.body_markdown {
        dispatch_issue_webhooks(
            repository,
            &issue,
            &actor,
            "ISSUE_BODY_CHANGED",
            &issue.body_markdown,
            None,
            &public_origin,
            &base_path,
            &service.integrations,
        )
        .await;
    }
    if !issue.is_draft && existing.assignee_login_id != issue.assignee_login_id {
        dispatch_issue_webhooks(
            repository,
            &issue,
            &actor,
            "ISSUE_ASSIGNEE_CHANGED",
            &issue.body_markdown,
            None,
            &public_origin,
            &base_path,
            &service.integrations,
        )
        .await;
    }
    if !issue.is_draft && existing.milestone_id != issue.milestone_id {
        dispatch_issue_webhooks(
            repository,
            &issue,
            &actor,
            "ISSUE_MILESTONE_CHANGED",
            &issue.body_markdown,
            None,
            &public_origin,
            &base_path,
            &service.integrations,
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

pub(crate) async fn rest_delete_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    service: PilotServiceImpl,
) -> Result<Json<DeleteIssueResponse>, RestRouteError> {
    let public_origin = service.public_origin.clone();
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
    if !existing.is_draft {
        dispatch_issue_webhooks(
            repository,
            &existing,
            &actor,
            "RESOURCE_DELETED",
            &existing.body_markdown,
            None,
            &public_origin,
            &base_path,
            &service.integrations,
        )
        .await;
    }
    Ok(Json(DeleteIssueResponse {
        issue_number,
        owner_name,
        project_name,
        ..Default::default()
    }))
}

async fn rest_update_issue_weight(
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
    service: PilotServiceImpl,
) -> Result<Json<MassUpdateIssuesResponse>, RestRouteError> {
    let public_origin = service.public_origin.clone();
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
    let requested_state = (!body.state.trim().is_empty()).then(|| body.state.trim().to_string());
    let due_date = if body.is_due_date_changed {
        parse_milestone_due_date(&body.due_date).map_err(RestRouteError::from_connect_error)?
    } else {
        None
    };
    let mut previous_states = std::collections::HashMap::new();
    let mut previous_assignees = std::collections::HashMap::new();
    let mut previous_milestones = std::collections::HashMap::new();
    let mut target_issues = Vec::new();
    for issue_number in body.issue_numbers.iter().copied() {
        let issue = repository
            .read_issue_detail(&owner_name, &project_name, issue_number)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
            .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
        if issue.is_draft {
            target_issues.push(issue);
            continue;
        }
        if !issue_can_mutate(&authorization, &issue, &actor) {
            return Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("issue mass update is not allowed"),
            ));
        }
        previous_states.insert(issue_number, issue.state.clone());
        previous_assignees.insert(issue_number, issue.assignee_login_id.clone());
        previous_milestones.insert(issue_number, issue.milestone_id);
        target_issues.push(issue);
    }
    if body.delete {
        for issue in target_issues.iter().filter(|issue| !issue.is_draft) {
            if repository
                .delete_issue(&owner_name, &project_name, issue.issue_number)
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?
            {
                dispatch_issue_webhooks(
                    repository,
                    issue,
                    &actor,
                    "RESOURCE_DELETED",
                    &issue.body_markdown,
                    None,
                    &public_origin,
                    &base_path,
                    &service.integrations,
                )
                .await;
            }
        }
        return Ok(Json(MassUpdateIssuesResponse {
            ..Default::default()
        }));
    }
    let assignee_update = body.assignee_update;
    let milestone_update = body.milestone_update;
    let updated_issues = repository
        .mass_update_issues(
            persistence::MassUpdateIssuesInput {
                add_label_ids: body.add_label_ids,
                assignee_login_id: (!body.assignee_login_id.trim().is_empty())
                    .then(|| body.assignee_login_id.trim().to_string()),
                assignee_update: body.assignee_update,
                due_date,
                due_date_update: body.is_due_date_changed,
                issue_numbers: body.issue_numbers,
                milestone_id: body.milestone_id.filter(|value| *value > 0),
                milestone_update: body.milestone_update,
                owner_name,
                project_name,
                remove_label_ids: body.remove_label_ids,
                state: requested_state.clone(),
            },
            actor.id,
            &actor.login_id,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let mut items = Vec::with_capacity(updated_issues.len());
    for issue in &updated_issues {
        if !issue.is_draft {
            if requested_state.is_some()
                && previous_states
                    .get(&issue.issue_number)
                    .is_some_and(|previous_state| previous_state != &issue.state)
            {
                dispatch_issue_webhooks(
                    repository,
                    issue,
                    &actor,
                    "ISSUE_STATE_CHANGED",
                    &issue.body_markdown,
                    None,
                    &public_origin,
                    &base_path,
                    &service.integrations,
                )
                .await;
            }
            if assignee_update
                && previous_assignees
                    .get(&issue.issue_number)
                    .is_some_and(|previous_assignee| previous_assignee != &issue.assignee_login_id)
            {
                dispatch_issue_webhooks(
                    repository,
                    issue,
                    &actor,
                    "ISSUE_ASSIGNEE_CHANGED",
                    &issue.body_markdown,
                    None,
                    &public_origin,
                    &base_path,
                    &service.integrations,
                )
                .await;
            }
            if milestone_update
                && previous_milestones
                    .get(&issue.issue_number)
                    .is_some_and(|previous_milestone| previous_milestone != &issue.milestone_id)
            {
                dispatch_issue_webhooks(
                    repository,
                    issue,
                    &actor,
                    "ISSUE_MILESTONE_CHANGED",
                    &issue.body_markdown,
                    None,
                    &public_origin,
                    &base_path,
                    &service.integrations,
                )
                .await;
            }
        }
        items.push(
            issue_detail_response_from_record_with_repository_issue_references(
                repository,
                issue,
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
        parent_issue_state: issue.parent_issue_state.clone(),
        parent_issue_title: issue.parent_issue_title.clone(),
        weight: issue.weight,
    }
}

fn rest_issue_child_issue_from_record(
    record: &persistence::IssueChildRecord,
) -> RestIssueChildIssue {
    RestIssueChildIssue {
        assignee_label: record.assignee_label.clone(),
        comment_count: record.comment_count,
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
        voter_count: record.voter_count,
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

async fn rest_issue_detail_response_from_access_with_repository_issue_references(
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
