use axum::{
    extract::{Form, Path, RawQuery},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{delete, get, patch, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use yona_rust_vcs::VcsError;

use crate::{
    code_browser_error, decode_query_component, deserialize_i64_vec_from_strings_or_numbers,
    dispatch_posting_comment_webhooks, dispatch_posting_webhooks, form_value, gravatar_url,
    headers_with_form_csrf, internal_error, markdown_issue_references_for_project,
    markdown_mention_references, normalize_identifier, optional_i64_string, parse_rest_query_i64,
    parse_rest_query_u32, persistence, project_resource_create_allowed, project_update_allowed,
    redirect_to, require_authenticated_user, require_project_read, require_project_resource_create,
    require_session, require_valid_csrf, rest_board_label_from_record,
    rest_issue_reference_metadata_from_resolved, rest_mention_reference_metadata_from_resolved,
    visible_projects_for_organization, ConnectError, MarkdownIssueReference,
    MarkdownMentionReference, PilotBackend, PilotRepository, PilotServiceImpl,
    ProjectCreatableResource, RestBoardLabel, RestIssueReferenceMetadata,
    RestMentionReferenceMetadata, RestRouteError,
};

mod legacy_external;

use legacy_external::{
    legacy_external_create_board_posting_comment, legacy_external_create_board_postings,
    legacy_external_update_board_posting_content, legacy_external_update_board_posting_labels,
    legacy_update_posting_comment,
};

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestProjectPostsQuery {
    filter: String,
    label_ids: Vec<i64>,
    order_by: String,
    order_dir: String,
    page_num: u32,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestPostMutationBody {
    #[serde(
        default,
        deserialize_with = "deserialize_i64_vec_from_strings_or_numbers"
    )]
    attachment_ids: Vec<i64>,
    body_markdown: String,
    branch: String,
    edit: bool,
    issue_template: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_i64_vec_from_strings_or_numbers"
    )]
    label_ids: Vec<i64>,
    line_ending: String,
    new_file_name: String,
    notice: bool,
    path: String,
    readme: bool,
    title: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestPostCommentBody {
    #[serde(
        default,
        deserialize_with = "deserialize_i64_vec_from_strings_or_numbers"
    )]
    attachment_ids: Vec<i64>,
    contents_markdown: String,
    parent_comment_id: Option<i64>,
}

impl RestProjectPostsQuery {
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
                "filter" => query.filter = value,
                "labelIds" | "labelIds[]" => {
                    if !value.trim().is_empty() {
                        query.label_ids.push(parse_rest_query_i64(&value)?);
                    }
                }
                "orderBy" => query.order_by = value,
                "orderDir" => query.order_dir = value,
                "pageNum" => query.page_num = parse_rest_query_u32(&value)?,
                _ => {}
            }
        }

        Ok(query)
    }
}

#[derive(Default)]
struct RestPostFormOptionsQuery {
    branch: Option<String>,
    edit: bool,
    issue_template: bool,
    path: Option<String>,
}

impl RestPostFormOptionsQuery {
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
                "branch" => query.branch = Some(value),
                "edit" => query.edit = true,
                "issueTemplate" | "issueTemplate[]" | "issue_template" => {
                    query.issue_template = true;
                }
                "path" => query.path = Some(value),
                _ => {}
            }
        }
        Ok(query)
    }
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestOrganizationBoardsQuery {
    filter: String,
    order_by: String,
    order_dir: String,
    page_num: u32,
    project_names: Vec<String>,
}

impl RestOrganizationBoardsQuery {
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
                "filter" => query.filter = value,
                "orderBy" => query.order_by = value,
                "orderDir" => query.order_dir = value,
                "pageNum" => query.page_num = parse_rest_query_u32(&value)?,
                "projectNames" | "projectNames[]" => {
                    if !value.trim().is_empty() {
                        query.project_names.push(value);
                    }
                }
                _ => {}
            }
        }

        Ok(query)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestBoardAttachment {
    id: String,
    mime_type: String,
    name: String,
    size: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPostComment {
    attachments: Vec<RestBoardAttachment>,
    author_id: String,
    author_label: String,
    author_login_id: String,
    contents_html: String,
    contents_markdown: String,
    created_label: String,
    id: String,
    issue_references: Vec<RestIssueReferenceMetadata>,
    mention_references: Vec<RestMentionReferenceMetadata>,
    parent_comment_id: String,
    via_email: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPostListItem {
    author_avatar_url: String,
    author_label: String,
    author_login_id: String,
    comment_count: u32,
    created_label: String,
    labels: Vec<RestBoardLabel>,
    notice: bool,
    owner_name: String,
    post_number: String,
    project_name: String,
    readme: bool,
    title: String,
    updated_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPostDetailResponse {
    attachments: Vec<RestBoardAttachment>,
    author_id: String,
    author_label: String,
    author_login_id: String,
    body_html: String,
    body_markdown: String,
    comment_count: u32,
    comments: Vec<RestPostComment>,
    created_label: String,
    history_html: String,
    history_markdown: String,
    id: String,
    issue_references: Vec<RestIssueReferenceMetadata>,
    mention_references: Vec<RestMentionReferenceMetadata>,
    is_watching: bool,
    labels: Vec<RestBoardLabel>,
    notice: bool,
    owner_name: String,
    post_number: String,
    project_name: String,
    readme: bool,
    title: String,
    updated_label: String,
    permissions: RestPostPermissions,
    watcher_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPostPermissions {
    can_comment: bool,
    can_create: bool,
    can_delete: bool,
    can_read: bool,
    can_set_notice: bool,
    can_watch: bool,
    can_update: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPostDefaultPermissions {
    can_attach_files: bool,
    can_create: bool,
    can_mark_notice: bool,
    can_mark_readme: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectPostFormOptionsResponse {
    can_attach_files: bool,
    can_mark_notice: bool,
    can_mark_readme: bool,
    default_permissions: RestPostDefaultPermissions,
    online_commit: RestPostOnlineCommitOptions,
    labels: Vec<RestBoardLabel>,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPostOnlineCommitOptions {
    branch: String,
    edit: bool,
    issue_template: bool,
    path: String,
    prepared_body_markdown: String,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPostOnlineCommitResponse {
    branch: String,
    commit_id: Option<String>,
    online_commit: bool,
    path: String,
    redirect_href: String,
}

#[derive(Serialize)]
#[serde(untagged)]
enum RestPostMutationResponse {
    Detail(RestPostDetailResponse),
    OnlineCommit(RestPostOnlineCommitResponse),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectPostsResponse {
    items: Vec<RestPostListItem>,
    notices: Vec<RestPostListItem>,
    owner_name: String,
    page_num: u32,
    page_size: u32,
    project_name: String,
    readme: Option<RestPostDetailResponse>,
    total_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestOrganizationBoardProjectOption {
    owner_name: String,
    project_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestOrganizationBoardsResponse {
    items: Vec<RestPostListItem>,
    organization_name: String,
    page_num: u32,
    page_size: u32,
    total_count: u32,
    visible_projects: Vec<RestOrganizationBoardProjectOption>,
}

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/projects/{owner_name}/{project_name}/posts",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      RawQuery(raw_query): RawQuery| {
                    let service = service.clone();
                    async move {
                        let query = RestProjectPostsQuery::from_raw_query(raw_query.as_deref())?;
                        rest_list_project_posts(headers, owner_name, project_name, query, service)
                            .await
                    }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestPostMutationBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_posting(headers, owner_name, project_name, body, service).await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/posts/form-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      RawQuery(raw_query): RawQuery| {
                    let service = service.clone();
                    async move {
                        let query = RestPostFormOptionsQuery::from_raw_query(raw_query.as_deref())?;
                        rest_project_post_form_options(
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
            "/projects/{owner_name}/{project_name}/posts/{post_number}",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_read_posting_detail(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            service,
                        )
                        .await
                    }
                }
            })
            .patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestPostMutationBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
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
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_delete_posting(headers, owner_name, project_name, post_number, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/posts/{post_number}/comments",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>,
                      Json(body): Json<RestPostCommentBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_posting_comment(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/posts/{post_number}/comments/{comment_id}",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Json(body): Json<RestPostCommentBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_posting_comment(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            comment_id,
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
                      Path((owner_name, project_name, post_number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    let service = service.clone();
                    async move {
                        rest_delete_posting_comment(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            comment_id,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/posts/{post_number}/watch",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_watch_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            service,
                            true,
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, post_number)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_watch_posting(
                            headers,
                            owner_name,
                            project_name,
                            post_number,
                            service,
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
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      RawQuery(raw_query): RawQuery| {
                    let service = service.clone();
                    async move {
                        let query =
                            RestOrganizationBoardsQuery::from_raw_query(raw_query.as_deref())?;
                        rest_list_organization_boards(headers, organization_name, query, service)
                            .await
                    }
                }
            }),
        )
}

pub(crate) fn routes(service: PilotServiceImpl) -> Router {
    let legacy_board_posts_service = service.clone();
    let legacy_board_content_service = service.clone();
    let legacy_board_comment_service = service.clone();
    let legacy_board_label_service = service.clone();
    let board_comment_create_service = service.clone();
    let board_comment_update_service = service.clone();
    let legacy_board_comment_update_service = service.clone();
    let board_comment_delete_service = service.clone();

    Router::new()
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/posts",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Json(body): Json<serde_json::Value>| {
                    let service = legacy_board_posts_service.clone();
                    async move {
                        legacy_external_create_board_postings(
                            headers,
                            owner,
                            project_name,
                            body,
                            service,
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
                    let service = legacy_board_content_service.clone();
                    async move {
                        legacy_external_update_board_posting_content(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            service,
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
                    let service = legacy_board_comment_service.clone();
                    async move {
                        legacy_external_create_board_posting_comment(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            service,
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
                    let service = legacy_board_label_service.clone();
                    async move {
                        legacy_external_update_board_posting_labels(
                            owner,
                            project_name,
                            number,
                            body,
                            service,
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
                            board_comment_create_service.clone(),
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
                            board_comment_update_service.clone(),
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
                    let service = legacy_board_comment_update_service.clone();
                    async move {
                        legacy_update_posting_comment(
                            headers, owner, project, number, comment_id, body, service,
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
                            board_comment_delete_service.clone(),
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

fn rest_board_attachment_from_record(
    attachment: &persistence::IssueAttachmentRecord,
) -> RestBoardAttachment {
    RestBoardAttachment {
        id: attachment.id.to_string(),
        mime_type: attachment.mime_type.clone(),
        name: attachment.name.clone(),
        size: attachment.size,
    }
}

fn rest_post_comment_from_record(
    comment: &persistence::PostingCommentRecord,
    _owner_name: &str,
    _project_name: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> RestPostComment {
    RestPostComment {
        attachments: comment
            .attachments
            .iter()
            .map(rest_board_attachment_from_record)
            .collect(),
        author_id: optional_i64_string(comment.author_id),
        author_label: comment.author_label.clone(),
        author_login_id: comment.author_login_id.clone(),
        contents_html: String::new(),
        contents_markdown: comment.contents_markdown.clone(),
        created_label: comment.created_label.clone(),
        id: comment.id.to_string(),
        issue_references: issue_references
            .iter()
            .map(rest_issue_reference_metadata_from_resolved)
            .collect(),
        mention_references: mention_references
            .iter()
            .map(rest_mention_reference_metadata_from_resolved)
            .collect(),
        parent_comment_id: optional_i64_string(comment.parent_comment_id),
        via_email: comment.via_email,
    }
}

fn rest_post_list_item_from_record(
    item: &persistence::ProjectPostingListItemRecord,
) -> RestPostListItem {
    RestPostListItem {
        author_avatar_url: gravatar_url(&item.author_email_address),
        author_label: item.author_label.clone(),
        author_login_id: item.author_login_id.clone(),
        comment_count: item.comment_count,
        created_label: item.created_label.clone(),
        labels: item
            .labels
            .iter()
            .map(rest_board_label_from_record)
            .collect(),
        notice: item.notice,
        owner_name: item.owner_name.clone(),
        post_number: item.post_number.to_string(),
        project_name: item.project_name.clone(),
        readme: item.readme,
        title: item.title.clone(),
        updated_label: item.updated_label.clone(),
    }
}

async fn rest_post_detail_response_from_record_with_repository_issue_references(
    repository: &PilotRepository,
    posting: &persistence::PostingRecord,
    actor_id: Option<i64>,
    base_path: &str,
    viewer_can_create: bool,
    viewer_can_update: bool,
    viewer_can_delete: bool,
    viewer_can_comment: bool,
    viewer_can_set_notice: bool,
    viewer_can_watch: bool,
) -> Result<RestPostDetailResponse, ConnectError> {
    let authorization = require_project_read(
        repository,
        &posting.owner_name,
        &posting.project_name,
        actor_id,
    )
    .await?;
    rest_post_detail_response_from_record_with_access_issue_references(
        repository,
        &authorization,
        posting,
        actor_id,
        base_path,
        viewer_can_create,
        viewer_can_update,
        viewer_can_delete,
        viewer_can_comment,
        viewer_can_set_notice,
        viewer_can_watch,
    )
    .await
}

async fn rest_post_detail_response_from_record_with_access_issue_references(
    repository: &PilotRepository,
    authorization: &persistence::ProjectAuthorizationRecord,
    posting: &persistence::PostingRecord,
    actor_id: Option<i64>,
    base_path: &str,
    viewer_can_create: bool,
    viewer_can_update: bool,
    viewer_can_delete: bool,
    viewer_can_comment: bool,
    viewer_can_set_notice: bool,
    viewer_can_watch: bool,
) -> Result<RestPostDetailResponse, ConnectError> {
    let mut markdowns = vec![
        posting.body_markdown.as_str(),
        posting.history_markdown.as_str(),
    ];
    markdowns.extend(
        posting
            .comments
            .iter()
            .map(|comment| comment.contents_markdown.as_str()),
    );
    let issue_references =
        markdown_issue_references_for_project(repository, authorization, actor_id, &markdowns)
            .await?;
    let mention_references = markdown_mention_references(repository, &markdowns).await?;
    Ok(rest_post_detail_response_from_record_with_references(
        posting,
        base_path,
        viewer_can_create,
        viewer_can_update,
        viewer_can_delete,
        viewer_can_comment,
        viewer_can_set_notice,
        viewer_can_watch,
        &issue_references,
        &mention_references,
    ))
}

fn rest_post_detail_response_from_record_with_references(
    posting: &persistence::PostingRecord,
    base_path: &str,
    viewer_can_create: bool,
    viewer_can_update: bool,
    viewer_can_delete: bool,
    viewer_can_comment: bool,
    viewer_can_set_notice: bool,
    viewer_can_watch: bool,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> RestPostDetailResponse {
    RestPostDetailResponse {
        attachments: posting
            .attachments
            .iter()
            .map(rest_board_attachment_from_record)
            .collect(),
        author_id: optional_i64_string(posting.author_id),
        author_label: posting.author_label.clone(),
        author_login_id: posting.author_login_id.clone(),
        body_html: String::new(),
        body_markdown: posting.body_markdown.clone(),
        comment_count: posting.comment_count,
        comments: posting
            .comments
            .iter()
            .map(|comment| {
                rest_post_comment_from_record(
                    comment,
                    &posting.owner_name,
                    &posting.project_name,
                    issue_references,
                    mention_references,
                )
            })
            .collect(),
        created_label: posting.created_label.clone(),
        history_html: String::new(),
        history_markdown: posting.history_markdown.clone(),
        id: posting.id.to_string(),
        issue_references: issue_references
            .iter()
            .map(rest_issue_reference_metadata_from_resolved)
            .collect(),
        mention_references: mention_references
            .iter()
            .map(rest_mention_reference_metadata_from_resolved)
            .collect(),
        is_watching: posting.is_watching,
        labels: posting
            .labels
            .iter()
            .map(rest_board_label_from_record)
            .collect(),
        notice: posting.notice,
        owner_name: posting.owner_name.clone(),
        post_number: posting.post_number.to_string(),
        project_name: posting.project_name.clone(),
        readme: posting.readme,
        title: posting.title.clone(),
        updated_label: posting.updated_label.clone(),
        permissions: RestPostPermissions {
            can_comment: viewer_can_comment,
            can_create: viewer_can_create,
            can_delete: viewer_can_delete,
            can_read: true,
            can_set_notice: viewer_can_set_notice,
            can_watch: viewer_can_watch,
            can_update: viewer_can_update,
        },
        watcher_count: posting.watcher_count,
    }
}

fn rest_post_mutation_input_from_body(
    body: RestPostMutationBody,
) -> persistence::PostingMutationInput {
    persistence::PostingMutationInput {
        attachment_ids: body.attachment_ids,
        body_markdown: body.body_markdown,
        label_ids: body.label_ids,
        notice: body.notice,
        readme: body.readme,
        title: body.title.trim().to_string(),
    }
}

fn direct_post_comment_body(form: &HashMap<String, String>) -> RestPostCommentBody {
    RestPostCommentBody {
        attachment_ids: direct_post_comment_attachment_ids(form),
        contents_markdown: direct_post_comment_contents(form),
        parent_comment_id: form
            .get("parentCommentId")
            .and_then(|value| value.parse::<i64>().ok()),
    }
}

fn direct_post_comment_contents(form: &HashMap<String, String>) -> String {
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

fn direct_post_comment_attachment_ids(form: &HashMap<String, String>) -> Vec<i64> {
    parse_post_attachment_ids(form_value(
        form,
        &["attachmentIds", "attachment_ids", "temporaryUploadFiles"],
    ))
}

fn parse_post_attachment_ids(value: &str) -> Vec<i64> {
    value
        .split(',')
        .filter_map(|part| {
            let part = part.trim();
            (!part.is_empty())
                .then(|| part.parse::<i64>().ok())
                .flatten()
        })
        .collect()
}

async fn direct_create_posting_comment(
    headers: HeaderMap,
    owner: String,
    project: String,
    post_number: i64,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_create_posting_comment(
        headers_with_form_csrf(headers, &form),
        owner.clone(),
        project.clone(),
        post_number,
        direct_post_comment_body(&form),
        service,
    )
    .await
    {
        Ok(Json(detail)) => {
            let fragment = detail
                .comments
                .iter()
                .filter_map(|comment| comment.id.parse::<i64>().ok())
                .max()
                .map(|comment_id| format!("#comment-{comment_id}"))
                .unwrap_or_default();
            redirect_to(
                &base_path,
                &format!("/{owner}/{project}/post/{post_number}{fragment}"),
            )
        }
        Err(error) => error.into_response(),
    }
}

async fn direct_update_posting_comment(
    headers: HeaderMap,
    owner: String,
    project: String,
    post_number: i64,
    comment_id: i64,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_update_posting_comment(
        headers_with_form_csrf(headers, &form),
        owner.clone(),
        project.clone(),
        post_number,
        comment_id,
        direct_post_comment_body(&form),
        service,
    )
    .await
    {
        Ok(_) => redirect_to(
            &base_path,
            &format!("/{owner}/{project}/post/{post_number}#comment-{comment_id}"),
        ),
        Err(error) => error.into_response(),
    }
}

async fn direct_delete_posting_comment(
    headers: HeaderMap,
    owner: String,
    project: String,
    post_number: i64,
    comment_id: i64,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_delete_posting_comment(
        headers,
        owner.clone(),
        project.clone(),
        post_number,
        comment_id,
        service,
    )
    .await
    {
        Ok(_) => redirect_to(
            &base_path,
            &format!("/{owner}/{project}/post/{post_number}"),
        ),
        Err(error) => error.into_response(),
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

async fn rest_list_project_posts(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestProjectPostsQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestProjectPostsResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid project posting list request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project postings require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
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
                &service.base_path,
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

async fn rest_project_post_form_options(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestPostFormOptionsQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestProjectPostFormOptionsResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid project posting form options request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project posting form options require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
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
    let online_commit = rest_post_online_commit_options(&service, &authorization, &query)
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

async fn rest_list_organization_boards(
    headers: HeaderMap,
    organization_name: String,
    query: RestOrganizationBoardsQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestOrganizationBoardsResponse>, RestRouteError> {
    if organization_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid organization board list request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "organization boards require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
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

async fn rest_read_posting_detail(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    if post_number <= 0 {
        return Err(RestRouteError::bad_request(
            "invalid posting detail request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "posting requires repository backend",
        ));
    };
    let actor_id = service
        .session_manager
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
            &service.base_path,
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

async fn rest_create_posting(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestPostMutationBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPostMutationResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let online_commit = rest_post_online_commit_input(&body);
    if !online_commit.enabled && body.title.trim().is_empty() {
        return Err(RestRouteError::bad_request("post.error.emptyTitle"));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
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
            &service,
            &authorization,
            &online_commit,
            &actor,
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
            &service,
            &authorization,
            &owner_name_for_sync,
            &project_name_for_sync,
            &readme_body_markdown,
            &actor,
        )?;
    }
    dispatch_posting_webhooks(
        repository,
        &posting,
        &actor,
        "NEW_POSTING",
        None,
        "",
        &service.base_path,
        &service,
    )
    .await;
    Ok(Json(RestPostMutationResponse::Detail(
        rest_post_detail_response_from_record_with_access_issue_references(
            repository,
            &authorization,
            &posting,
            session.user_id,
            &service.base_path,
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

async fn rest_update_posting(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    body: RestPostMutationBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if post_number <= 0 || body.title.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid posting update request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
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
            &service,
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
            &service.base_path,
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

async fn rest_delete_posting(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    service: PilotServiceImpl,
) -> Result<StatusCode, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &service.backend else {
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

async fn rest_create_posting_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    body: RestPostCommentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if post_number <= 0 || body.contents_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid posting comment request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
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
    if let Some(comment) = posting
        .comments
        .iter()
        .filter(|comment| comment.author_id == Some(actor.id))
        .max_by_key(|comment| comment.id)
    {
        dispatch_posting_comment_webhooks(
            repository,
            &posting,
            comment,
            &actor,
            "NEW_COMMENT",
            "",
            &service.base_path,
            &service,
        )
        .await;
    }
    Ok(Json(
        rest_post_detail_response_from_record_with_access_issue_references(
            repository,
            &access.authorization,
            &posting,
            session.user_id,
            &service.base_path,
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

async fn rest_update_posting_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    comment_id: i64,
    body: RestPostCommentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if post_number <= 0 || comment_id <= 0 || body.contents_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid posting comment update request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
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
    if let Some(comment) = posting
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
    {
        dispatch_posting_comment_webhooks(
            repository,
            &posting,
            comment,
            &actor,
            "COMMENT_UPDATED",
            "",
            &service.base_path,
            &service,
        )
        .await;
    }
    Ok(Json(
        rest_post_detail_response_from_record_with_repository_issue_references(
            repository,
            &posting,
            session.user_id,
            &service.base_path,
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

async fn rest_delete_posting_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    comment_id: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if post_number <= 0 || comment_id <= 0 {
        return Err(RestRouteError::bad_request(
            "invalid posting comment delete request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
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
            &service.base_path,
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

async fn rest_watch_posting(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    post_number: i64,
    service: PilotServiceImpl,
    watch: bool,
) -> Result<Json<RestPostDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &service.backend else {
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
            &service.base_path,
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
    service: &PilotServiceImpl,
    authorization: &persistence::ProjectAuthorizationRecord,
    owner_name: &str,
    project_name: &str,
    body_markdown: &str,
    actor: &persistence::AppUserRecord,
) -> Result<(), RestRouteError> {
    if !authorization.project.vcs.eq_ignore_ascii_case("GIT") {
        return Ok(());
    }
    let repo_path = yona_rust_vcs::repository_path(&service.data_root, authorization.project.id);
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
    service: &PilotServiceImpl,
    authorization: &persistence::ProjectAuthorizationRecord,
    query: &RestPostFormOptionsQuery,
) -> Result<RestPostOnlineCommitOptions, ConnectError> {
    if !authorization.project.vcs.eq_ignore_ascii_case("GIT") {
        return Ok(RestPostOnlineCommitOptions::default());
    }
    let repo_path = yona_rust_vcs::repository_path(&service.data_root, authorization.project.id);
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
    service: &PilotServiceImpl,
    authorization: &persistence::ProjectAuthorizationRecord,
    input: &RestPostOnlineCommitInput,
    actor: &persistence::AppUserRecord,
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
    let repo_path = yona_rust_vcs::repository_path(&service.data_root, authorization.project.id);
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
