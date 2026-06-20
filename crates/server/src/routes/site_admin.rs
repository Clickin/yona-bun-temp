use axum::{
    body::Bytes,
    extract::{Path, Query},
    http::HeaderMap,
    http::StatusCode,
    response::{Html, IntoResponse, Redirect, Response},
    routing::{delete, get, post},
    Json, Router,
};
use base64::{engine::general_purpose, Engine as _};
use bcrypt::{hash, DEFAULT_COST};
use http::HeaderValue;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, path::Path as StdPath, sync::atomic::Ordering};
use yona_rust_domain::ProjectScope;
use yona_rust_integrations::{deliver_with_config, OutboundMail};

use crate::persistence::PilotRepository;
use crate::{
    base_path_href, decode_query_component, delete_project_repository_storage,
    detect_upload_mime_type, escape_html_text, gravatar_url, headers_with_form_csrf,
    internal_error, map_project_scope, normalize_identifier, normalize_issue_label_color,
    normalize_milestone_state, parse_milestone_due_date, percent_encode_uri_component, persistence,
    project_logo_url, random_site_admin_password, random_storage_token, redirect_to,
    require_authenticated_user, require_session, require_valid_csrf, rest_board_label_from_record,
    rest_repository, site_export_filename_stamp, workspace_avatar_url, ConnectError,
    PilotServiceImpl, RestBoardLabel, RestProjectDeleteResponse, RestRouteError, SmtpRuntimeConfig,
    SITE_UPDATE_NOTIFICATION_WATCHED,
};

use super::uploaded_file_path_with_root;

mod update;

use update::{
    rest_download_site_update, rest_download_site_update_file, rest_read_site_update,
    rest_site_update_download_file_response, rest_site_update_download_redirect,
};

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteUsersQuery {
    page: Option<u32>,
    query: Option<String>,
    state: Option<String>,
}

fn direct_site_user_list_href(state: Option<&str>, query: Option<&str>) -> String {
    let mut params = Vec::new();
    if let Some(state) = state.map(str::trim).filter(|state| !state.is_empty()) {
        params.push(format!("state={}", percent_encode_uri_component(state)));
    }
    if let Some(query) = query.map(str::trim).filter(|query| !query.is_empty()) {
        params.push(format!("query={}", percent_encode_uri_component(query)));
    }
    if params.is_empty() {
        "/sites/userList".to_string()
    } else {
        format!("/sites/userList?{}", params.join("&"))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteUserItem {
    avatar_url: String,
    created_at: String,
    display_name: String,
    email_address: String,
    id: i64,
    is_guest: bool,
    is_site_admin: bool,
    last_state_modified_at: String,
    login_id: String,
    state: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteUserListResponse {
    page: u32,
    page_size: u32,
    query: String,
    site_admin_count: u32,
    state: String,
    total: u32,
    total_pages: u32,
    users: Vec<RestSiteUserItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteNoAvatarUserItem {
    email: String,
    login_id: String,
    name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteNoAvatarUsersResponse {
    users: Vec<RestSiteNoAvatarUserItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteUserMutationResponse {
    user: RestSiteUserItem,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteAvatarFromAttachmentBody {
    avatar_file_id: i64,
    email: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteLegacyOkResponse {
    message: String,
    status: u16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteUserPasswordResetResponse {
    is_success: bool,
    login_id: String,
    name: String,
    new_password: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteProjectsQuery {
    filter: Option<String>,
    page: Option<u32>,
    page_num: Option<u32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteProjectItem {
    created_at: String,
    id: i64,
    owner_name: String,
    overview: String,
    project_logo_url: String,
    project_name: String,
    project_scope: String,
    vcs: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteProjectListResponse {
    filter: String,
    page: u32,
    page_size: u32,
    projects: Vec<RestSiteProjectItem>,
    total: u32,
    total_pages: u32,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSitePostsQuery {
    page: Option<u32>,
    page_num: Option<u32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSitePostListResponse {
    page: u32,
    page_size: u32,
    posts: Vec<RestSitePostItem>,
    total: u32,
    total_pages: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSitePostItem {
    author_avatar_url: String,
    author_label: String,
    author_login_id: String,
    comment_count: u32,
    created_label: String,
    created_title: String,
    labels: Vec<RestBoardLabel>,
    notice: bool,
    owner_name: String,
    post_number: String,
    project_logo_url: String,
    project_name: String,
    readme: bool,
    title: String,
    updated_label: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteIssuesQuery {
    page: Option<u32>,
    page_num: Option<u32>,
    state: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteIssueItem {
    assignee_label: String,
    author_avatar_url: String,
    author_label: String,
    author_login_id: String,
    comment_count: u32,
    created_label: String,
    created_title: String,
    issue_number: String,
    labels: Vec<RestBoardLabel>,
    milestone_title: String,
    owner_name: String,
    project_logo_url: String,
    project_name: String,
    state: String,
    title: String,
    updated_label: String,
    voter_count: u32,
    watcher_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteIssueListResponse {
    issues: Vec<RestSiteIssueItem>,
    page: u32,
    page_size: u32,
    state: String,
    total: u32,
    total_pages: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteDiagnosticsResponse {
    error_count: u32,
    errors: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteMailOptionsResponse {
    not_configured_items: Vec<String>,
    sender: String,
    sent: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteMailSendBody {
    from: String,
    to: String,
    subject: String,
    body: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteMailListBody {
    all: bool,
    projects: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteMailListResponse {
    recipients: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteExportResponse {
    format: String,
    provenance: String,
    users: Vec<RestSiteUserItem>,
    projects: Vec<RestSiteProjectItem>,
    project_members: Vec<RestSiteExportProjectMemberItem>,
    labels: Vec<RestSiteExportProjectLabelItem>,
    milestones: Vec<RestSiteExportMilestoneItem>,
    posts: Vec<RestSiteExportPostItem>,
    issues: Vec<RestSiteExportIssueItem>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteImportPayload {
    format: String,
    users: Vec<RestSiteImportUserItem>,
    projects: Vec<RestSiteImportProjectItem>,
    project_members: Vec<RestSiteExportProjectMemberItem>,
    labels: Vec<RestSiteExportProjectLabelItem>,
    milestones: Vec<RestSiteExportMilestoneItem>,
    posts: Vec<RestSiteExportPostItem>,
    issues: Vec<RestSiteExportIssueItem>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteImportUserItem {
    display_name: String,
    email_address: String,
    is_site_admin: bool,
    login_id: String,
    state: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteImportProjectItem {
    owner_name: String,
    overview: String,
    project_name: String,
    project_scope: String,
    #[serde(alias = "projectVcs")]
    vcs: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportProjectMemberItem {
    login_id: String,
    owner_name: String,
    project_name: String,
    role: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportProjectLabelItem {
    category_is_exclusive: bool,
    category_name: String,
    color: String,
    #[serde(alias = "labelName")]
    name: String,
    owner_name: String,
    project_name: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportMilestoneItem {
    attachments: Vec<RestSiteExportAttachmentItem>,
    contents_markdown: String,
    due_date: String,
    owner_name: String,
    project_name: String,
    state: String,
    title: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportPostItem {
    author_login_id: String,
    attachments: Vec<RestSiteExportAttachmentItem>,
    body_markdown: String,
    comments: Vec<RestSiteExportCommentItem>,
    history_markdown: String,
    labels: Vec<RestSiteExportLabelItem>,
    notice: bool,
    owner_name: String,
    post_number: String,
    project_name: String,
    readme: bool,
    title: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportIssueItem {
    assignee_login_id: String,
    author_login_id: String,
    attachments: Vec<RestSiteExportAttachmentItem>,
    body_markdown: String,
    comments: Vec<RestSiteExportCommentItem>,
    history_markdown: String,
    issue_number: String,
    labels: Vec<RestSiteExportLabelItem>,
    milestone_title: String,
    owner_name: String,
    project_name: String,
    state: String,
    title: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportCommentItem {
    author_login_id: String,
    attachments: Vec<RestSiteExportAttachmentItem>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    child_comments: Vec<RestSiteExportCommentItem>,
    contents_markdown: String,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportAttachmentItem {
    #[serde(skip_serializing_if = "Option::is_none")]
    content_base64: Option<String>,
    id: i64,
    mime_type: String,
    name: String,
    size: i64,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteExportLabelItem {
    category_is_exclusive: bool,
    category_name: String,
    color: String,
    #[serde(alias = "labelName")]
    name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestSiteImportResponse {
    imported_projects: u32,
    imported_project_members: u32,
    imported_issues: u32,
    imported_labels: u32,
    imported_milestones: u32,
    imported_posts: u32,
    imported_users: u32,
    skipped_issues: u32,
    skipped_labels: u32,
    skipped_milestones: u32,
    skipped_posts: u32,
    skipped_projects: u32,
    skipped_project_members: u32,
    skipped_users: u32,
    unsupported_sections: Vec<String>,
}

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/site/users",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestSiteUsersQuery>| {
                    let service = service.clone();
                    async move { rest_read_site_users(headers, query, service).await }
                }
            }),
        )
        .route(
            "/site/no-avatar-users",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_read_site_no_avatar_users(headers, service).await }
                }
            }),
        )
        .route(
            "/site/users/avatar-from-attachment",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestSiteAvatarFromAttachmentBody>| {
                    let service = service.clone();
                    async move {
                        rest_set_site_user_avatar_from_attachment(headers, body, service).await
                    }
                }
            }),
        )
        .route(
            "/site/users/{login_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_delete_site_user(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/site/users/{login_id}/site-admin/toggle",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_toggle_site_user_admin(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/site/users/{login_id}/account-lock/toggle",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_toggle_site_user_account_lock(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/site/users/{login_id}/guest/toggle",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_toggle_site_user_guest(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/site/users/{login_id}/password/reset",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_reset_site_user_password(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/site/projects",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestSiteProjectsQuery>| {
                    let service = service.clone();
                    async move { rest_read_site_projects(headers, query, service).await }
                }
            }),
        )
        .route(
            "/site/posts",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestSitePostsQuery>| {
                    let service = service.clone();
                    async move { rest_read_site_posts(headers, query, service).await }
                }
            }),
        )
        .route(
            "/site/issues",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestSiteIssuesQuery>| {
                    let service = service.clone();
                    async move { rest_read_site_issues(headers, query, service).await }
                }
            }),
        )
        .route(
            "/site/diagnostics",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_read_site_diagnostics(headers, service).await }
                }
            }),
        )
        .route(
            "/site/update",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move {
                        rest_read_site_update(headers, service).await
                    }
                }
            }),
        )
        .route(
            "/site/update/download",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move {
                        rest_download_site_update(headers, service).await
                    }
                }
            }),
        )
        .route(
            "/site/update/download-file",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move {
                        rest_download_site_update_file(headers, service).await
                    }
                }
            }),
        )
        .route(
            "/site/mail",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_read_site_mail(headers, service).await }
                }
            }),
        )
        .route(
            "/site/mail/test",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestSiteMailSendBody>| {
                    let service = service.clone();
                    async move { rest_send_site_test_mail(headers, body, service).await }
                }
            }),
        )
        .route(
            "/site/mail-list",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestSiteMailListBody>| {
                    let service = service.clone();
                    async move { rest_read_site_mail_list(headers, body, service).await }
                }
            }),
        )
        .route(
            "/site/projects/{project_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap, Path(project_id): Path<i64>| {
                    let service = service.clone();
                    async move { rest_delete_site_project(headers, project_id, service).await }
                }
            }),
        )
}

pub(crate) fn routes(service: PilotServiceImpl) -> Router {
    let unwatch_service = service.clone();
    let site_update_download_service = service.clone();
    let site_update_download_file_service = service.clone();
    let site_toggle_admin_service = service.clone();
    let site_toggle_lock_service = service.clone();
    let site_toggle_guest_service = service.clone();
    let site_delete_user_service = service.clone();
    let site_delete_project_service = service.clone();
    let site_reset_user_password_service = service.clone();
    let site_diagnostic_shell_service = service.clone();
    let site_no_avatar_service = service.clone();
    let site_set_avatar_service = service.clone();
    let site_mail_send_service = service.clone();
    let site_mail_list_service = service.clone();
    let site_export_service = service.clone();
    let site_import_service = service;

    Router::new()
        .route(
            "/sites/export",
            get(move |headers: HeaderMap| {
                async move {
                    direct_export_site_data(
                        headers,
                        site_export_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/import",
            post(move |headers: HeaderMap, body: Bytes| {
                async move {
                    direct_import_site_data(
                        headers,
                        body,
                        site_import_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/diagnostic",
            get(move |headers: HeaderMap| {
                async move {
                    direct_read_site_diagnostic_shell(
                        headers,
                        site_diagnostic_shell_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/noAvatarUsers",
            get(move |headers: HeaderMap| {
                async move {
                    direct_read_site_no_avatar_users(
                        headers,
                        site_no_avatar_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/setAttachmentToUserAvatar",
            post(move |headers: HeaderMap, body: Bytes| {
                async move {
                    direct_set_attachment_to_user_avatar(
                        headers,
                        body,
                        site_set_avatar_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/mail",
            post(move |headers: HeaderMap, body: Bytes| {
                async move {
                    direct_send_site_mail(
                        headers,
                        body,
                        site_mail_send_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/mailList",
            post(move |headers: HeaderMap, body: Bytes| {
                async move {
                    direct_read_site_mail_list(
                        headers,
                        body,
                        site_mail_list_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/unwatchUpdate",
            post(move |headers: HeaderMap| {
                let service = unwatch_service.clone();
                async move { direct_unwatch_site_update(headers, service).await }
            }),
        )
        .route(
            "/sites/update/download",
            get(move |headers: HeaderMap| async move {
                direct_download_site_update(
                    headers,
                    site_update_download_service.clone(),
                )
                .await
            }),
        )
        .route(
            "/sites/update/download-file",
            get(move |headers: HeaderMap| async move {
                direct_download_site_update_file(
                    headers,
                    site_update_download_file_service.clone(),
                )
                .await
            }),
        )
        .route(
            "/sites/toggleSiteAdminRole/{login_id}",
            post(move |headers: HeaderMap, Path(login_id): Path<String>| {
                async move {
                    direct_toggle_site_admin_role(
                        headers,
                        login_id,
                        site_toggle_admin_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/toggleAccountLock",
            post(
                move |headers: HeaderMap, Query(query): Query<RestSiteDirectUserMutationQuery>| {
                    async move {
                        direct_toggle_site_user_account_lock(
                            headers,
                            query,
                            site_toggle_lock_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/sites/toggleGuestMode",
            post(
                move |headers: HeaderMap, Query(query): Query<RestSiteDirectUserMutationQuery>| {
                    async move {
                        direct_toggle_site_user_guest(
                            headers,
                            query,
                            site_toggle_guest_service.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/sites/user/{*legacy_path}",
            axum::routing::delete(move |headers: HeaderMap, Path(legacy_path): Path<String>| {
                async move {
                    direct_delete_site_user_by_legacy_path(
                        headers,
                        legacy_path,
                        site_delete_user_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/project/delete/{project_id}",
            axum::routing::delete(move |headers: HeaderMap, Path(project_id): Path<i64>| {
                async move {
                    direct_delete_site_project(
                        headers,
                        project_id,
                        site_delete_project_service.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{login_id}",
            post(move |headers: HeaderMap, Path(login_id): Path<String>| {
                async move {
                    direct_reset_site_user_password(
                        headers,
                        login_id,
                        site_reset_user_password_service.clone(),
                    )
                    .await
                }
            }),
        )
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteDirectUserMutationQuery {
    login_id: String,
    query: Option<String>,
    state: Option<String>,
}

async fn direct_read_site_diagnostic_shell(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Response {
    match rest_read_site_diagnostics(headers, service).await {
        Ok(payload) => {
            let payload = payload.0;
            Html(render_legacy_site_diagnostic_shell(&payload)).into_response()
        }
        Err(error) => error.into_response(),
    }
}

fn render_legacy_site_diagnostic_shell(payload: &RestSiteDiagnosticsResponse) -> String {
    let body = if payload.errors.is_empty() {
        "<p>site.diagnostic.errorNotFound</p>".to_string()
    } else {
        let mut items = String::new();
        for error in &payload.errors {
            items.push_str(&format!("<li><pre>{}</pre></li>", escape_html_text(error)));
        }
        format!(
            "<p>site.diagnostic.errorFound {}</p><ul>{items}</ul>",
            payload.error_count
        )
    };
    format!(
        r#"<!doctype html>
<html>
<head><title>title.siteSetting</title></head>
<body>
<div class="site-breadcrumb-outer"><h3>site.sidebar</h3></div>
<div class="site-setting-wrap">
<ul class="site-setting-nav">
<li><a href="/sites/userList">site.sidebar.userList</a></li>
<li><a href="/sites/postList">site.sidebar.postList</a></li>
<li><a href="/sites/issueList">site.sidebar.issueList</a></li>
<li><a href="/sites/projectList">site.sidebar.projectList</a></li>
<li><a href="/sites/mail">site.sidebar.mailSend</a></li>
<li><a href="/sites/massmail">site.sidebar.massMail</a></li>
<li><a href="/sites/update">site.sidebar.update</a></li>
<li class="active"><a href="/sites/diagnostic">site.sidebar.diagnostics</a></li>
</ul>
<div class="title_area"><h2 class="pull-left">site.sidebar.diagnostics</h2></div>
{body}
</div>
</body>
</html>"#
    )
}

async fn direct_read_site_no_avatar_users(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Response {
    match rest_read_site_no_avatar_users(headers, service).await {
        Ok(payload) => payload.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_export_site_data(headers: HeaderMap, service: PilotServiceImpl) -> Response {
    match rest_export_site_data(headers, service).await {
        Ok(payload) => direct_site_export_response(&payload),
        Err(error) => error.into_response(),
    }
}

async fn direct_import_site_data(
    headers: HeaderMap,
    body: Bytes,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let (form, payload, is_multipart, has_data_file) = direct_site_import_payload(&headers, &body);
    if is_multipart && !has_data_file {
        return Redirect::to(&base_path_href(&base_path, "/sites/data")).into_response();
    }
    let headers = headers_with_form_csrf(headers, &form);
    match rest_import_site_data(headers, &payload, service).await {
        Ok(payload) => {
            let payload = payload.0;
            if is_multipart {
                Redirect::to(&base_path_href(&base_path, "/")).into_response()
            } else {
                Json(payload).into_response()
            }
        }
        Err(error) => error.into_response(),
    }
}

fn direct_site_export_response(payload: &RestSiteExportResponse) -> Response {
    match serde_json::to_vec(payload) {
        Ok(body) => {
            let mut response = body.into_response();
            let headers = response.headers_mut();
            headers.insert(
                axum::http::header::CONTENT_TYPE,
                HeaderValue::from_static("application/x-download"),
            );
            if let Ok(header_value) = HeaderValue::from_str(&format!(
                "attachment; filename=yobi-data-{}.json",
                site_export_filename_stamp()
            )) {
                headers.insert(axum::http::header::CONTENT_DISPOSITION, header_value);
            }
            response
        }
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
}

fn direct_site_import_payload(
    headers: &HeaderMap,
    body: &[u8],
) -> (HashMap<String, String>, String, bool, bool) {
    let content_type = headers
        .get(http::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    if !content_type
        .to_ascii_lowercase()
        .starts_with("multipart/form-data")
    {
        return (
            HashMap::new(),
            String::from_utf8_lossy(body).to_string(),
            false,
            true,
        );
    }
    let Some(boundary) = content_type
        .split(';')
        .map(str::trim)
        .find_map(|part| part.strip_prefix("boundary="))
        .map(|part| part.trim_matches('"').to_string())
    else {
        return (HashMap::new(), String::new(), true, false);
    };
    let mut form = HashMap::new();
    let mut data = String::new();
    let mut has_data_file = false;
    let text = String::from_utf8_lossy(body);
    for part in text.split(&format!("--{boundary}")) {
        let Some((headers, value)) = part.split_once("\r\n\r\n") else {
            continue;
        };
        let Some(name) = headers
            .split(';')
            .find_map(|segment| segment.trim().strip_prefix("name=\""))
            .and_then(|segment| segment.split('"').next())
        else {
            continue;
        };
        let value = value
            .trim_start_matches("\r\n")
            .trim_end_matches("\r\n")
            .trim_end_matches("--")
            .to_string();
        if name == "data" {
            has_data_file = headers.contains("filename=");
            data = value;
        } else {
            form.insert(name.to_string(), value);
        }
    }
    (form, data, true, has_data_file)
}

async fn direct_set_attachment_to_user_avatar(
    headers: HeaderMap,
    body: Bytes,
    service: PilotServiceImpl,
) -> Response {
    let Ok(body) = serde_json::from_slice::<RestSiteAvatarFromAttachmentBody>(&body) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "message": "Expecting Json data" })),
        )
            .into_response();
    };
    match rest_set_site_user_avatar_from_attachment(headers, body, service).await {
        Ok(payload) => payload.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_read_site_mail_list(
    headers: HeaderMap,
    body: Bytes,
    service: PilotServiceImpl,
) -> Response {
    let body = direct_site_mail_list_body(&body);
    match rest_read_site_mail_list(headers, body, service).await {
        Ok(payload) => Json(payload.0.recipients).into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_send_site_mail(
    headers: HeaderMap,
    body: Bytes,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let form = direct_site_mail_form(&body);
    let headers = headers_with_form_csrf(headers, &form);
    let body = RestSiteMailSendBody {
        from: form.get("from").cloned().unwrap_or_default(),
        to: form.get("to").cloned().unwrap_or_default(),
        subject: form.get("subject").cloned().unwrap_or_default(),
        body: form.get("body").cloned().unwrap_or_default(),
    };
    match rest_send_site_test_mail(headers, body, service).await {
        Ok(_) => {
            Redirect::to(&base_path_href(&base_path, "/sites/mail?sended=true")).into_response()
        }
        Err(error) => error.into_response(),
    }
}

fn direct_site_mail_form(body: &[u8]) -> HashMap<String, String> {
    if let Ok(body) = serde_json::from_slice::<RestSiteMailSendBody>(body) {
        return HashMap::from([
            ("from".to_string(), body.from),
            ("to".to_string(), body.to),
            ("subject".to_string(), body.subject),
            ("body".to_string(), body.body),
        ]);
    }
    let raw = std::str::from_utf8(body).unwrap_or_default();
    let mut parsed = HashMap::new();
    for pair in raw.split('&').filter(|pair| !pair.is_empty()) {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        parsed.insert(decode_query_component(key), decode_query_component(value));
    }
    parsed
}

fn direct_site_mail_list_body(body: &[u8]) -> RestSiteMailListBody {
    if let Ok(body) = serde_json::from_slice::<RestSiteMailListBody>(body) {
        return body;
    }
    let raw = std::str::from_utf8(body).unwrap_or_default();
    let mut parsed = RestSiteMailListBody::default();
    for pair in raw.split('&').filter(|pair| !pair.is_empty()) {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        let key = decode_query_component(key);
        let value = decode_query_component(value);
        if key == "all" {
            parsed.all = value.trim().eq_ignore_ascii_case("true");
            if parsed.all {
                parsed.projects.clear();
            }
        } else if !parsed.all && !value.trim().is_empty() {
            parsed.projects.push(value);
        }
    }
    parsed
}

async fn direct_unwatch_site_update(headers: HeaderMap, service: PilotServiceImpl) -> Response {
    match rest_require_site_admin_repository(&service, &headers, true).await {
        Ok(_) => {
            SITE_UPDATE_NOTIFICATION_WATCHED.store(false, Ordering::SeqCst);
            StatusCode::OK.into_response()
        }
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_admin_role(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_toggle_site_user_admin(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, "/sites/userList"),
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_user_account_lock(
    headers: HeaderMap,
    query: RestSiteDirectUserMutationQuery,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let login_id = query.login_id.trim().to_string();
    if login_id.is_empty() {
        return RestRouteError::bad_request("loginId is required").into_response();
    }
    let redirect_path = direct_site_user_list_href(query.state.as_deref(), query.query.as_deref());
    match rest_toggle_site_user_account_lock(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_user_guest(
    headers: HeaderMap,
    query: RestSiteDirectUserMutationQuery,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let login_id = query.login_id.trim().to_string();
    if login_id.is_empty() {
        return RestRouteError::bad_request("loginId is required").into_response();
    }
    let redirect_path = direct_site_user_list_href(query.state.as_deref(), query.query.as_deref());
    match rest_toggle_site_user_guest(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

async fn direct_reset_site_user_password(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Response {
    match rest_reset_site_user_password(headers, login_id, service).await {
        Ok(payload) => payload.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_delete_site_user_by_legacy_path(
    headers: HeaderMap,
    legacy_path: String,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let user_id = match direct_site_user_delete_id(&legacy_path) {
        Ok(user_id) => user_id,
        Err(error) => return error.into_response(),
    };
    let repository = match rest_require_site_admin_repository(&service, &headers, true).await {
        Ok(repository) => repository,
        Err(error) => return error.into_response(),
    };
    let user = match repository.find_user_by_id(user_id).await {
        Ok(Some(user)) => user,
        Ok(None) => return RestRouteError::not_found("user not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    match repository.delete_site_user(&user.login_id).await {
        Ok(persistence::SiteUserDeleteResult::Deleted(_)) => {
            redirect_to(&base_path, "/sites/userList")
        }
        Ok(persistence::SiteUserDeleteResult::NotFound) => {
            RestRouteError::not_found("user not found").into_response()
        }
        Ok(persistence::SiteUserDeleteResult::OnlyManager) => RestRouteError::from_connect_error(
            ConnectError::permission_denied("site.userList.deleteAlert"),
        )
        .into_response(),
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
}

async fn direct_delete_site_project(
    headers: HeaderMap,
    project_id: i64,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_delete_site_project(headers, project_id, service).await {
        Ok(_) => redirect_to(&base_path, "/sites/projectList"),
        Err(error) => error.into_response(),
    }
}

fn direct_site_user_delete_id(legacy_path: &str) -> Result<i64, RestRouteError> {
    let Some(candidate) = legacy_path
        .strip_prefix("delete/")
        .or_else(|| legacy_path.strip_prefix("delete"))
    else {
        return Err(RestRouteError::not_found("user not found"));
    };
    candidate
        .trim()
        .parse()
        .map_err(|_| RestRouteError::bad_request("invalid user id"))
}

async fn direct_download_site_update(headers: HeaderMap, service: PilotServiceImpl) -> Response {
    match rest_require_site_admin_repository(&service, &headers, false).await {
        Ok(_) => match rest_site_update_download_redirect(&service.site_update) {
            Ok(redirect) => redirect.into_response(),
            Err(error) => error.into_response(),
        },
        Err(error) => error.into_response(),
    }
}

async fn direct_download_site_update_file(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Response {
    match rest_require_site_admin_repository(&service, &headers, false).await {
        Ok(_) => match rest_site_update_download_file_response(&service.site_update) {
            Ok(response) => response,
            Err(error) => error.into_response(),
        },
        Err(error) => error.into_response(),
    }
}

async fn rest_read_site_users(
    headers: HeaderMap,
    query: RestSiteUsersQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserListResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let state = rest_site_user_state(query.state)?;
    let record = repository
        .list_site_users(persistence::SiteUserListFilter {
            page: query.page.unwrap_or(1).max(1),
            query: query.query.unwrap_or_default(),
            state,
        })
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    Ok(Json(
        rest_site_user_list_from_record(&repository, &service.base_path, record)
            .await
            .map_err(RestRouteError::from_connect_error)?,
    ))
}

async fn rest_read_site_no_avatar_users(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteNoAvatarUsersResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let users = repository
        .list_site_no_avatar_users()
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    Ok(Json(RestSiteNoAvatarUsersResponse {
        users: users
            .into_iter()
            .map(rest_site_no_avatar_user_from_record)
            .collect(),
    }))
}

async fn rest_set_site_user_avatar_from_attachment(
    headers: HeaderMap,
    body: RestSiteAvatarFromAttachmentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteLegacyOkResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    if body.avatar_file_id <= 0 {
        return Err(RestRouteError::bad_request("avatarFileId is required"));
    }
    if body.email.trim().is_empty() {
        return Err(RestRouteError::bad_request("email is required"));
    }

    match repository
        .set_user_avatar_from_attachment_by_email(&body.email, body.avatar_file_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
    {
        persistence::SiteUserAvatarFromAttachmentResult::Applied
        | persistence::SiteUserAvatarFromAttachmentResult::Ignored => {
            Ok(Json(rest_site_legacy_ok_response()))
        }
        persistence::SiteUserAvatarFromAttachmentResult::AttachmentNotFound => {
            Err(RestRouteError::not_found("attachment not found"))
        }
        persistence::SiteUserAvatarFromAttachmentResult::UserNotFound => {
            Err(RestRouteError::not_found("user not found"))
        }
    }
}

async fn rest_toggle_site_user_admin(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserMutationResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let user = repository
        .toggle_site_admin_role(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .ok_or_else(|| RestRouteError::not_found("user not found"))?;

    Ok(Json(RestSiteUserMutationResponse {
        user: rest_site_user_from_record(&repository, &service.base_path, user)
            .await
            .map_err(RestRouteError::from_connect_error)?,
    }))
}

async fn rest_toggle_site_user_account_lock(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserMutationResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let user = repository
        .toggle_site_user_account_lock(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .ok_or_else(|| RestRouteError::not_found("user not found"))?;

    Ok(Json(RestSiteUserMutationResponse {
        user: rest_site_user_from_record(&repository, &service.base_path, user)
            .await
            .map_err(RestRouteError::from_connect_error)?,
    }))
}

async fn rest_toggle_site_user_guest(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserMutationResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let user = repository
        .toggle_site_user_guest_mode(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .ok_or_else(|| RestRouteError::not_found("user not found"))?;

    Ok(Json(RestSiteUserMutationResponse {
        user: rest_site_user_from_record(&repository, &service.base_path, user)
            .await
            .map_err(RestRouteError::from_connect_error)?,
    }))
}

async fn rest_delete_site_user(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserMutationResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let user = match repository
        .delete_site_user(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
    {
        persistence::SiteUserDeleteResult::Deleted(user) => user,
        persistence::SiteUserDeleteResult::NotFound => {
            return Err(RestRouteError::not_found("user not found"));
        }
        persistence::SiteUserDeleteResult::OnlyManager => {
            return Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("site.userList.deleteAlert"),
            ));
        }
    };

    Ok(Json(RestSiteUserMutationResponse {
        user: rest_site_user_from_record(&repository, &service.base_path, user)
            .await
            .map_err(RestRouteError::from_connect_error)?,
    }))
}

async fn rest_reset_site_user_password(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteUserPasswordResetResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let user = repository
        .find_user_by_login_id(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .filter(|user| normalize_identifier(&user.login_id) != "anonymous")
        .ok_or_else(|| RestRouteError::not_found("user not found"))?;
    let new_password = random_site_admin_password();
    let password_hash = hash(&new_password, DEFAULT_COST)
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    repository
        .update_password_hash_for_user(user.id, &password_hash)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    Ok(Json(RestSiteUserPasswordResetResponse {
        is_success: true,
        login_id: user.login_id,
        name: user.display_name,
        new_password,
    }))
}

async fn rest_read_site_projects(
    headers: HeaderMap,
    query: RestSiteProjectsQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteProjectListResponse>, RestRouteError> {
    const SITE_PROJECT_PAGE_SIZE: usize = 30;

    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let filter = query.filter.unwrap_or_default().trim().to_string();
    let normalized_filter = normalize_identifier(&filter);
    let page = query.page.or(query.page_num).unwrap_or(1).max(1);
    let mut projects = repository
        .list_projects()
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .into_iter()
        .filter(|project| {
            normalized_filter.is_empty()
                || normalize_identifier(&project.project_name).contains(&normalized_filter)
        })
        .collect::<Vec<_>>();
    projects.sort_by(|left, right| {
        right
            .created_date
            .cmp(&left.created_date)
            .then_with(|| left.owner_name.cmp(&right.owner_name))
            .then_with(|| left.project_name.cmp(&right.project_name))
    });

    let total = projects.len();
    let offset = ((page - 1) as usize).saturating_mul(SITE_PROJECT_PAGE_SIZE);
    let mut page_projects = Vec::new();
    for project in projects
        .into_iter()
        .skip(offset)
        .take(SITE_PROJECT_PAGE_SIZE)
    {
        page_projects.push(
            rest_site_project_from_record(&repository, &service.base_path, project)
                .await
                .map_err(RestRouteError::from_connect_error)?,
        );
    }
    let total_pages = if total == 0 {
        0
    } else {
        total.div_ceil(SITE_PROJECT_PAGE_SIZE)
    };

    Ok(Json(RestSiteProjectListResponse {
        filter,
        page,
        page_size: SITE_PROJECT_PAGE_SIZE as u32,
        projects: page_projects,
        total: total as u32,
        total_pages: total_pages as u32,
    }))
}

async fn rest_read_site_posts(
    headers: HeaderMap,
    query: RestSitePostsQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestSitePostListResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let record = repository
        .list_site_postings(query.page.or(query.page_num).unwrap_or(1))
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    let mut posts = Vec::new();
    for post in &record.posts {
        posts.push(
            rest_site_post_from_record(&repository, &service.base_path, post)
                .await
                .map_err(RestRouteError::from_connect_error)?,
        );
    }

    Ok(Json(RestSitePostListResponse {
        page: record.page,
        page_size: record.page_size,
        posts,
        total: record.total,
        total_pages: record.total_pages,
    }))
}

async fn rest_read_site_issues(
    headers: HeaderMap,
    query: RestSiteIssuesQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteIssueListResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let state = rest_site_issue_state(query.state)?;
    let record = repository
        .list_site_issues(&state, query.page.or(query.page_num).unwrap_or(1))
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    let mut issues = Vec::new();
    for issue in &record.issues {
        issues.push(
            rest_site_issue_from_record(&repository, &service.base_path, issue)
                .await
                .map_err(RestRouteError::from_connect_error)?,
        );
    }

    Ok(Json(RestSiteIssueListResponse {
        issues,
        page: record.page,
        page_size: record.page_size,
        state: record.state,
        total: record.total,
        total_pages: record.total_pages,
    }))
}

async fn rest_read_site_diagnostics(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteDiagnosticsResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let errors = repository
        .site_diagnostic_errors()
        .await
        .map_err(|error| RestRouteError::internal(format!("Failed to diagnose: {error}")))?;

    Ok(Json(RestSiteDiagnosticsResponse {
        error_count: errors.len() as u32,
        errors,
    }))
}

async fn rest_export_site_data(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<RestSiteExportResponse, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, false).await?;
    let users = rest_export_site_users(repository, &service.base_path).await?;
    let project_records = repository
        .list_projects()
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    let mut projects = Vec::new();
    let mut milestone_project_refs = Vec::new();
    for project in project_records {
        milestone_project_refs.push((project.owner_name.clone(), project.project_name.clone()));
        projects.push(
            rest_site_project_from_record(repository, &service.base_path, project)
                .await
                .map_err(RestRouteError::from_connect_error)?,
        );
    }
    let labels = rest_export_site_labels(repository, &milestone_project_refs).await?;
    let milestones =
        rest_export_site_milestones(repository, &milestone_project_refs, &service.data_root)
            .await?;
    let project_members =
        rest_export_site_project_members(repository, &milestone_project_refs).await?;
    let posts = rest_export_site_posts(repository, &service.data_root).await?;
    let issues = rest_export_site_issues(repository, &service.data_root).await?;

    Ok(RestSiteExportResponse {
        format: "yobi-data".to_string(),
        provenance: "rust-app-runtime".to_string(),
        users,
        projects,
        project_members,
        labels,
        milestones,
        posts,
        issues,
    })
}

async fn rest_import_site_data(
    headers: HeaderMap,
    payload: &str,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteImportResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let payload: RestSiteImportPayload = serde_json::from_str(payload)
        .map_err(|_| RestRouteError::bad_request("invalid site data import payload"))?;
    if payload.format.trim() != "yobi-data" {
        return Err(RestRouteError::bad_request(
            "unsupported site data import format",
        ));
    }

    let mut imported_users = 0;
    let mut skipped_users = 0;
    for user in payload.users {
        let login_id = user.login_id.trim();
        let email_address = user.email_address.trim();
        if login_id.is_empty()
            || repository
                .find_user_by_login_id(login_id)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .is_some()
        {
            skipped_users += 1;
            continue;
        }
        let imported_password_hash = hash(
            format!(
                "imported-user-disabled:{login_id}:{}",
                site_export_filename_stamp()
            ),
            DEFAULT_COST,
        )
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
        repository
            .create_user(persistence::CreateUserInput {
                display_name: user.display_name.trim().to_string(),
                email_address: email_address.to_string(),
                is_confirmed: !user.state.trim().eq_ignore_ascii_case("LOCKED"),
                is_site_admin: user.is_site_admin,
                login_id: login_id.to_string(),
                password_hash: imported_password_hash,
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        imported_users += 1;
    }

    let mut imported_projects = 0;
    let mut skipped_projects = 0;
    for project in payload.projects {
        let owner_name = project.owner_name.trim();
        let project_name = project.project_name.trim();
        if owner_name.is_empty()
            || project_name.is_empty()
            || repository
                .find_user_by_login_id(owner_name)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .is_none()
            || repository
                .read_project_by_owner_and_name(owner_name, project_name)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .is_some()
        {
            skipped_projects += 1;
            continue;
        }
        repository
            .create_project(persistence::CreateProjectInput {
                organization_id: None,
                owner_name: owner_name.to_string(),
                overview: Some(project.overview.trim().to_string()),
                project_name: project_name.to_string(),
                project_scope: normalize_site_import_project_scope(&project.project_scope)
                    .map_err(RestRouteError::from_connect_error)?,
                vcs: normalize_site_import_project_vcs(&project.vcs),
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        imported_projects += 1;
    }

    let mut imported_project_members = 0;
    let mut skipped_project_members = 0;
    for member in payload.project_members {
        let owner_name = member.owner_name.trim();
        let project_name = member.project_name.trim();
        let login_id = member.login_id.trim();
        let role = normalize_site_import_project_member_role(&member.role);
        let Some(project) = repository
            .read_project_by_owner_and_name(owner_name, project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        else {
            skipped_project_members += 1;
            continue;
        };
        let Some(user) = repository
            .find_user_by_login_id(login_id)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        else {
            skipped_project_members += 1;
            continue;
        };
        repository
            .add_project_membership(project.id, user.id, &role)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        imported_project_members += 1;
    }

    let mut imported_labels = 0;
    let mut skipped_labels = 0;
    for label in payload.labels {
        let owner_name = label.owner_name.trim();
        let project_name = label.project_name.trim();
        let label_name = label.name.trim();
        if owner_name.is_empty()
            || project_name.is_empty()
            || label_name.is_empty()
            || repository
                .read_project_by_owner_and_name(owner_name, project_name)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .is_none()
        {
            skipped_labels += 1;
            continue;
        }
        let label_color = if label.color.trim().is_empty() {
            "#999999".to_string()
        } else {
            normalize_issue_label_color(label.color.trim())
                .map_err(RestRouteError::from_connect_error)?
        };
        let category_name = if label.category_name.trim().is_empty() {
            "Imported"
        } else {
            label.category_name.trim()
        };
        match repository
            .create_project_label(persistence::CreateProjectLabelInput {
                category_is_exclusive: label.category_is_exclusive,
                category_name: category_name.to_string(),
                label_color,
                label_name: label_name.to_string(),
                owner_name: owner_name.to_string(),
                project_name: project_name.to_string(),
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        {
            Some((_record, true)) => imported_labels += 1,
            Some((_record, false)) => skipped_labels += 1,
            None => skipped_labels += 1,
        }
    }

    let mut imported_milestones = 0;
    let mut skipped_milestones = 0;
    for milestone in payload.milestones {
        let owner_name = milestone.owner_name.trim();
        let project_name = milestone.project_name.trim();
        let title = milestone.title.trim();
        let Some(actor) = rest_site_import_actor(repository, "", owner_name).await? else {
            skipped_milestones += 1;
            continue;
        };
        if title.is_empty()
            || repository
                .read_project_by_owner_and_name(owner_name, project_name)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .is_none()
            || repository
                .project_milestone_title_exists(owner_name, project_name, title, None)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
        {
            skipped_milestones += 1;
            continue;
        }
        let imported_attachments =
            rest_site_import_attachments(&service, repository, &actor, &milestone.attachments)
                .await?;
        let contents_markdown = rewrite_site_import_file_links(
            &milestone.contents_markdown,
            &imported_attachments.link_rewrites,
        );
        if repository
            .create_project_milestone(persistence::MilestoneMutationInput {
                actor_id: Some(actor.id),
                attachment_ids: imported_attachments.ids,
                contents_markdown,
                due_date: parse_milestone_due_date(&milestone.due_date)
                    .map_err(RestRouteError::from_connect_error)?,
                owner_name: owner_name.to_string(),
                project_name: project_name.to_string(),
                state: normalize_milestone_state(&milestone.state)
                    .map_err(RestRouteError::from_connect_error)?,
                title: title.to_string(),
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
            .is_some()
        {
            imported_milestones += 1;
        } else {
            skipped_milestones += 1;
        }
    }

    let mut imported_posts = 0;
    let mut skipped_posts = 0;
    for post in payload.posts {
        let Some(actor) =
            rest_site_import_actor(repository, &post.author_login_id, &post.owner_name).await?
        else {
            skipped_posts += 1;
            continue;
        };
        if repository
            .read_project_by_owner_and_name(&post.owner_name, &post.project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
            .is_none()
        {
            skipped_posts += 1;
            continue;
        }
        let label_ids = rest_site_import_label_ids(
            repository,
            &post.owner_name,
            &post.project_name,
            &post.labels,
        )
        .await?;
        let imported_attachments =
            rest_site_import_attachments(&service, repository, &actor, &post.attachments).await?;
        let body_markdown = rewrite_site_import_file_links(
            &post.body_markdown,
            &imported_attachments.link_rewrites,
        );
        let created = repository
            .create_posting(persistence::CreatePostingInput {
                actor_display_name: actor.display_name.clone(),
                actor_id: actor.id,
                actor_login_id: actor.login_id.clone(),
                owner_name: post.owner_name.trim().to_string(),
                project_name: post.project_name.trim().to_string(),
                values: persistence::PostingMutationInput {
                    attachment_ids: imported_attachments.ids,
                    body_markdown,
                    label_ids,
                    notice: post.notice,
                    readme: post.readme,
                    title: post.title,
                },
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        let Some(created) = created else {
            skipped_posts += 1;
            continue;
        };
        if !post.history_markdown.trim().is_empty() {
            repository
                .restore_posting_history(
                    &post.owner_name,
                    &post.project_name,
                    created.post_number,
                    &post.history_markdown,
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
        }
        rest_site_import_post_comments(
            &service,
            repository,
            &post.owner_name,
            &post.project_name,
            created.post_number,
            &post.comments,
            &actor,
            None,
        )
        .await?;
        imported_posts += 1;
    }

    let mut imported_issues = 0;
    let mut skipped_issues = 0;
    for issue in payload.issues {
        let Some(actor) =
            rest_site_import_actor(repository, &issue.author_login_id, &issue.owner_name).await?
        else {
            skipped_issues += 1;
            continue;
        };
        if repository
            .read_project_by_owner_and_name(&issue.owner_name, &issue.project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
            .is_none()
        {
            skipped_issues += 1;
            continue;
        }
        let label_ids = rest_site_import_label_ids(
            repository,
            &issue.owner_name,
            &issue.project_name,
            &issue.labels,
        )
        .await?;
        let milestone_id = rest_site_import_milestone_id(
            repository,
            &issue.owner_name,
            &issue.project_name,
            &issue.milestone_title,
            &actor,
        )
        .await?;
        let imported_attachments =
            rest_site_import_attachments(&service, repository, &actor, &issue.attachments).await?;
        let body_markdown = rewrite_site_import_file_links(
            &issue.body_markdown,
            &imported_attachments.link_rewrites,
        );
        let created = repository
            .create_issue(persistence::CreateIssueInput {
                actor_display_name: actor.display_name.clone(),
                actor_id: actor.id,
                actor_login_id: actor.login_id.clone(),
                owner_name: issue.owner_name.trim().to_string(),
                project_name: issue.project_name.trim().to_string(),
                values: persistence::IssueMutationInput {
                    assignee_login_id: empty_string_as_none(issue.assignee_login_id.trim()),
                    attachment_ids: imported_attachments.ids,
                    body_markdown,
                    due_date: None,
                    is_draft: false,
                    is_publish: false,
                    label_ids,
                    milestone_id,
                    parent_issue_id: None,
                    title: issue.title,
                },
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        let Some(created) = created else {
            skipped_issues += 1;
            continue;
        };
        if !issue.history_markdown.trim().is_empty() {
            repository
                .restore_issue_history(
                    &issue.owner_name,
                    &issue.project_name,
                    created.issue_number,
                    &issue.history_markdown,
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
        }
        if issue.state.trim().eq_ignore_ascii_case("closed") {
            repository
                .update_issue_state_as_actor(
                    &created.owner_name,
                    &created.project_name,
                    created.issue_number,
                    "closed",
                    actor.id,
                    &actor.login_id,
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
        }
        rest_site_import_issue_comments(
            &service,
            repository,
            &issue.owner_name,
            &issue.project_name,
            created.issue_number,
            &issue.comments,
            &actor,
            None,
        )
        .await?;
        imported_issues += 1;
    }

    Ok(Json(RestSiteImportResponse {
        imported_issues,
        imported_labels,
        imported_milestones,
        imported_posts,
        imported_projects,
        imported_project_members,
        imported_users,
        skipped_issues,
        skipped_labels,
        skipped_milestones,
        skipped_posts,
        skipped_projects,
        skipped_project_members,
        skipped_users,
        unsupported_sections: Vec::new(),
    }))
}

async fn rest_site_import_post_comments(
    service: &PilotServiceImpl,
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    post_number: i64,
    comments: &[RestSiteExportCommentItem],
    fallback_actor: &persistence::AppUserRecord,
    parent_comment_id: Option<i64>,
) -> Result<(), RestRouteError> {
    for comment in comments {
        let contents_markdown = comment.contents_markdown.trim();
        if contents_markdown.is_empty() {
            continue;
        }
        let actor =
            rest_site_import_comment_actor(repository, &comment.author_login_id, fallback_actor)
                .await?;
        let imported_attachments =
            rest_site_import_attachments(service, repository, &actor, &comment.attachments).await?;
        let contents_markdown =
            rewrite_site_import_file_links(contents_markdown, &imported_attachments.link_rewrites);
        let detail = repository
            .create_posting_comment(persistence::CreatePostingCommentInput {
                actor_display_name: actor.display_name.clone(),
                actor_id: actor.id,
                actor_login_id: actor.login_id.clone(),
                attachment_actor_id: None,
                attachment_ids: imported_attachments.ids,
                contents_markdown,
                created_at: None,
                owner_name: owner_name.trim().to_string(),
                parent_comment_id,
                post_number,
                project_name: project_name.trim().to_string(),
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        if let Some(created_comment_id) = detail
            .as_ref()
            .and_then(|posting| posting.comments.iter().map(|comment| comment.id).max())
        {
            Box::pin(rest_site_import_post_comments(
                service,
                repository,
                owner_name,
                project_name,
                post_number,
                &comment.child_comments,
                &actor,
                Some(created_comment_id),
            ))
            .await?;
        }
    }
    Ok(())
}

async fn rest_site_import_issue_comments(
    service: &PilotServiceImpl,
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    issue_number: i64,
    comments: &[RestSiteExportCommentItem],
    fallback_actor: &persistence::AppUserRecord,
    parent_comment_id: Option<i64>,
) -> Result<(), RestRouteError> {
    for comment in comments {
        let contents_markdown = comment.contents_markdown.trim();
        if contents_markdown.is_empty() {
            continue;
        }
        let actor =
            rest_site_import_comment_actor(repository, &comment.author_login_id, fallback_actor)
                .await?;
        let imported_attachments =
            rest_site_import_attachments(service, repository, &actor, &comment.attachments).await?;
        let contents_markdown =
            rewrite_site_import_file_links(contents_markdown, &imported_attachments.link_rewrites);
        let detail = repository
            .create_issue_comment(persistence::CreateIssueCommentInput {
                actor_display_name: actor.display_name.clone(),
                actor_id: actor.id,
                actor_login_id: actor.login_id.clone(),
                attachment_ids: imported_attachments.ids,
                contents_markdown,
                issue_number,
                owner_name: owner_name.trim().to_string(),
                parent_comment_id,
                project_name: project_name.trim().to_string(),
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        if let Some(created_comment_id) = detail
            .as_ref()
            .and_then(|issue| issue.comments.iter().map(|comment| comment.id).max())
        {
            Box::pin(rest_site_import_issue_comments(
                service,
                repository,
                owner_name,
                project_name,
                issue_number,
                &comment.child_comments,
                &actor,
                Some(created_comment_id),
            ))
            .await?;
        }
    }
    Ok(())
}

async fn rest_site_import_comment_actor(
    repository: &PilotRepository,
    preferred_login_id: &str,
    fallback_actor: &persistence::AppUserRecord,
) -> Result<persistence::AppUserRecord, RestRouteError> {
    if !preferred_login_id.trim().is_empty() {
        if let Some(user) = repository
            .find_user_by_login_id(preferred_login_id.trim())
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        {
            return Ok(user);
        }
    }
    Ok(fallback_actor.clone())
}

struct RestSiteImportedAttachments {
    ids: Vec<i64>,
    link_rewrites: Vec<(i64, i64)>,
}

async fn rest_site_import_attachments(
    service: &PilotServiceImpl,
    repository: &PilotRepository,
    actor: &persistence::AppUserRecord,
    attachments: &[RestSiteExportAttachmentItem],
) -> Result<RestSiteImportedAttachments, RestRouteError> {
    let mut attachment_ids = Vec::new();
    let mut link_rewrites = Vec::new();
    for attachment in attachments {
        if let Some(content_base64) = attachment
            .content_base64
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            let bytes = general_purpose::STANDARD
                .decode(content_base64)
                .map_err(|_| {
                    RestRouteError::bad_request("site.import.attachment.invalidContent")
                })?;
            if attachment.size >= 0 && attachment.size != bytes.len() as i64 {
                return Err(RestRouteError::bad_request(
                    "site.import.attachment.sizeMismatch",
                ));
            }
            if bytes.len() > service.max_uploaded_file_size {
                return Err(RestRouteError::bad_request(
                    "site.import.attachment.tooLarge",
                ));
            }
            let file_name = attachment
                .name
                .trim()
                .is_empty()
                .then(|| "attachment.bin".to_string())
                .unwrap_or_else(|| attachment.name.trim().to_string());
            let mime_type = attachment
                .mime_type
                .trim()
                .is_empty()
                .then(|| detect_upload_mime_type(&file_name, None, &bytes))
                .unwrap_or_else(|| attachment.mime_type.trim().to_string());
            let hash = random_storage_token();
            let path = uploaded_file_path_with_root(&service.data_root, &hash);
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|error| RestRouteError::internal(error.to_string()))?;
            }
            std::fs::write(&path, &bytes)
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
            let created = repository
                .create_user_attachment_upload(
                    actor.id,
                    &actor.login_id,
                    &file_name,
                    &mime_type,
                    bytes.len() as i64,
                    &hash,
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
            attachment_ids.push(created.id);
            if attachment.id > 0 && attachment.id != created.id {
                link_rewrites.push((attachment.id, created.id));
            }
            continue;
        }

        if attachment.id > 0 {
            attachment_ids.push(attachment.id);
        }
    }
    Ok(RestSiteImportedAttachments {
        ids: attachment_ids,
        link_rewrites,
    })
}

fn rewrite_site_import_file_links(markdown: &str, rewrites: &[(i64, i64)]) -> String {
    if rewrites.is_empty() || !markdown.contains("/files/") {
        return markdown.to_string();
    }
    let rewrite_map = rewrites
        .iter()
        .copied()
        .collect::<std::collections::BTreeMap<_, _>>();
    let bytes = markdown.as_bytes();
    let mut rewritten = String::with_capacity(markdown.len());
    let mut index = 0;
    while let Some(relative_start) = markdown[index..].find("/files/") {
        let start = index + relative_start;
        rewritten.push_str(&markdown[index..start]);
        let number_start = start + "/files/".len();
        let mut number_end = number_start;
        while number_end < bytes.len() && bytes[number_end].is_ascii_digit() {
            number_end += 1;
        }
        if number_end == number_start {
            rewritten.push_str("/files/");
            index = number_start;
            continue;
        }
        let old_id = markdown[number_start..number_end].parse::<i64>().ok();
        if let Some(new_id) = old_id.and_then(|id| rewrite_map.get(&id)) {
            rewritten.push_str("/files/");
            rewritten.push_str(&new_id.to_string());
        } else {
            rewritten.push_str(&markdown[start..number_end]);
        }
        index = number_end;
    }
    rewritten.push_str(&markdown[index..]);
    rewritten
}

async fn rest_site_import_label_ids(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    labels: &[RestSiteExportLabelItem],
) -> Result<Vec<i64>, RestRouteError> {
    let mut label_ids = Vec::new();
    for label in labels {
        let label_name = label.name.trim();
        if label_name.is_empty() {
            continue;
        }
        let category_name = if label.category_name.trim().is_empty() {
            "Imported"
        } else {
            label.category_name.trim()
        };
        let label_color = if label.color.trim().is_empty() {
            "#999999".to_string()
        } else {
            normalize_issue_label_color(label.color.trim())
                .map_err(RestRouteError::from_connect_error)?
        };
        let Some((record, _created)) = repository
            .create_project_label(persistence::CreateProjectLabelInput {
                category_is_exclusive: label.category_is_exclusive,
                category_name: category_name.to_string(),
                label_color,
                label_name: label_name.to_string(),
                owner_name: owner_name.trim().to_string(),
                project_name: project_name.trim().to_string(),
            })
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        else {
            continue;
        };
        label_ids.push(record.id);
    }
    Ok(label_ids)
}

async fn rest_site_import_milestone_id(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    milestone_title: &str,
    actor: &persistence::AppUserRecord,
) -> Result<Option<i64>, RestRouteError> {
    let title = milestone_title.trim();
    if title.is_empty() {
        return Ok(None);
    }
    let milestones = repository
        .list_project_milestones(
            owner_name,
            project_name,
            persistence::MilestoneListFilter {
                order_by: String::new(),
                order_dir: String::new(),
                state: String::new(),
            },
        )
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    if let Some(existing) = milestones.iter().find(|milestone| milestone.title == title) {
        return Ok(Some(existing.id));
    }
    let created = repository
        .create_project_milestone(persistence::MilestoneMutationInput {
            actor_id: Some(actor.id),
            attachment_ids: Vec::new(),
            contents_markdown: String::new(),
            due_date: None,
            owner_name: owner_name.trim().to_string(),
            project_name: project_name.trim().to_string(),
            state: "open".to_string(),
            title: title.to_string(),
        })
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    Ok(created.map(|milestone| milestone.id))
}

async fn rest_site_import_actor(
    repository: &PilotRepository,
    preferred_login_id: &str,
    owner_name: &str,
) -> Result<Option<persistence::AppUserRecord>, RestRouteError> {
    for candidate in [preferred_login_id.trim(), owner_name.trim()] {
        if candidate.is_empty() {
            continue;
        }
        if let Some(user) = repository
            .find_user_by_login_id(candidate)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
        {
            return Ok(Some(user));
        }
    }
    Ok(None)
}

fn normalize_site_import_project_scope(value: &str) -> Result<String, ConnectError> {
    let trimmed = value.trim();
    let scope = if trimmed.is_empty() {
        ProjectScope::Public
    } else {
        map_project_scope(trimmed)?
    };
    Ok(scope.as_str().to_string())
}

fn normalize_site_import_project_vcs(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "svn" | "subversion" => "Subversion".to_string(),
        _ => "GIT".to_string(),
    }
}

fn normalize_site_import_project_member_role(value: &str) -> String {
    if value.trim().eq_ignore_ascii_case("manager") {
        "manager".to_string()
    } else {
        "member".to_string()
    }
}

async fn rest_export_site_users(
    repository: &PilotRepository,
    base_path: &str,
) -> Result<Vec<RestSiteUserItem>, RestRouteError> {
    let mut users_by_id = HashMap::new();
    for state in ["ACTIVE", "LOCKED", "DELETED", "GUEST", "SITE_ADMIN"] {
        let mut page = 1;
        loop {
            let record = repository
                .list_site_users(persistence::SiteUserListFilter {
                    page,
                    query: String::new(),
                    state: state.to_string(),
                })
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
            for user in record.users {
                if !users_by_id.contains_key(&user.id) {
                    let rest_user = rest_site_user_from_record(repository, base_path, user)
                        .await
                        .map_err(RestRouteError::from_connect_error)?;
                    users_by_id.insert(rest_user.id, rest_user);
                }
            }
            if record.total_pages == 0 || page >= record.total_pages {
                break;
            }
            page += 1;
        }
    }
    let mut users = users_by_id.into_values().collect::<Vec<_>>();
    users.sort_by(|left, right| left.login_id.cmp(&right.login_id));
    Ok(users)
}

async fn rest_export_site_milestones(
    repository: &PilotRepository,
    project_refs: &[(String, String)],
    data_root: &StdPath,
) -> Result<Vec<RestSiteExportMilestoneItem>, RestRouteError> {
    let mut milestones = Vec::new();
    for (owner_name, project_name) in project_refs {
        let records = repository
            .list_project_milestones(
                owner_name,
                project_name,
                persistence::MilestoneListFilter {
                    order_by: "dueDate".to_string(),
                    order_dir: "asc".to_string(),
                    state: "all".to_string(),
                },
            )
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        for record in records {
            milestones.push(rest_site_export_milestone_from_record(
                data_root,
                owner_name,
                project_name,
                &record,
            ));
        }
    }
    Ok(milestones)
}

async fn rest_export_site_labels(
    repository: &PilotRepository,
    project_refs: &[(String, String)],
) -> Result<Vec<RestSiteExportProjectLabelItem>, RestRouteError> {
    let mut labels = Vec::new();
    for (owner_name, project_name) in project_refs {
        let records = repository
            .list_project_labels(owner_name, project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        for record in records {
            labels.push(rest_site_export_project_label_from_record(
                owner_name,
                project_name,
                &record,
            ));
        }
    }
    Ok(labels)
}

async fn rest_export_site_project_members(
    repository: &PilotRepository,
    project_refs: &[(String, String)],
) -> Result<Vec<RestSiteExportProjectMemberItem>, RestRouteError> {
    let mut project_members = Vec::new();
    for (owner_name, project_name) in project_refs {
        let records = repository
            .read_project_members(owner_name, project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        for member in records.members {
            project_members.push(RestSiteExportProjectMemberItem {
                login_id: member.login_id,
                owner_name: owner_name.to_string(),
                project_name: project_name.to_string(),
                role: normalize_site_import_project_member_role(&member.role),
            });
        }
    }
    Ok(project_members)
}

fn rest_site_export_project_label_from_record(
    owner_name: &str,
    project_name: &str,
    label: &persistence::IssueLabelRecord,
) -> RestSiteExportProjectLabelItem {
    RestSiteExportProjectLabelItem {
        category_is_exclusive: label.category_is_exclusive,
        category_name: label.category_name.clone(),
        color: label.color.clone(),
        name: label.name.clone(),
        owner_name: owner_name.to_string(),
        project_name: project_name.to_string(),
    }
}

fn rest_site_export_milestone_from_record(
    data_root: &StdPath,
    owner_name: &str,
    project_name: &str,
    milestone: &persistence::IssueMilestoneRecord,
) -> RestSiteExportMilestoneItem {
    RestSiteExportMilestoneItem {
        attachments: milestone
            .attachments
            .iter()
            .map(|record| rest_site_export_attachment_from_record(data_root, record))
            .collect(),
        contents_markdown: milestone.contents_markdown.clone(),
        due_date: milestone.due_date_label.clone(),
        owner_name: owner_name.to_string(),
        project_name: project_name.to_string(),
        state: milestone.state.clone(),
        title: milestone.title.clone(),
    }
}

async fn rest_export_site_posts(
    repository: &PilotRepository,
    data_root: &StdPath,
) -> Result<Vec<RestSiteExportPostItem>, RestRouteError> {
    let mut posts = Vec::new();
    let mut page = 1;
    loop {
        let record = repository
            .list_site_postings(page)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?;
        for post in record.posts {
            let post_number = post.post_number;
            let detail = repository
                .read_posting_detail_for_viewer(
                    &post.owner_name,
                    &post.project_name,
                    post_number,
                    None,
                )
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .ok_or_else(|| RestRouteError::internal("site export post disappeared"))?;
            posts.push(rest_site_export_post_from_record(data_root, &detail));
        }
        if record.total_pages == 0 || page >= record.total_pages {
            break;
        }
        page += 1;
    }
    Ok(posts)
}

async fn rest_export_site_issues(
    repository: &PilotRepository,
    data_root: &StdPath,
) -> Result<Vec<RestSiteExportIssueItem>, RestRouteError> {
    let mut issues = Vec::new();
    for state in ["open", "closed"] {
        let mut page = 1;
        loop {
            let record = repository
                .list_site_issues(state, page)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?;
            for issue in record.issues {
                let detail = repository
                    .read_issue_detail(&issue.owner_name, &issue.project_name, issue.issue_number)
                    .await
                    .map_err(|error| RestRouteError::internal(error.to_string()))?
                    .ok_or_else(|| RestRouteError::internal("site export issue disappeared"))?;
                issues.push(rest_site_export_issue_from_record(data_root, &detail));
            }
            if record.total_pages == 0 || page >= record.total_pages {
                break;
            }
            page += 1;
        }
    }
    Ok(issues)
}

async fn rest_read_site_mail(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteMailOptionsResponse>, RestRouteError> {
    rest_require_site_admin_repository(&service, &headers, false).await?;
    Ok(Json(rest_site_mail_options(false, &service.smtp)))
}

async fn rest_send_site_test_mail(
    headers: HeaderMap,
    body: RestSiteMailSendBody,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteMailOptionsResponse>, RestRouteError> {
    rest_require_site_admin_repository(&service, &headers, true).await?;
    let from = required_site_mail_field(body.from, "from")?;
    let to = required_site_mail_field(body.to, "to")?;
    let subject = required_site_mail_field(body.subject, "subject")?;
    let body = required_site_mail_field(body.body, "body")?;
    deliver_with_config(
        OutboundMail {
            bcc: Vec::new(),
            body,
            from,
            html: false,
            reply_to: None,
            subject,
            to,
        },
        &service.integrations,
    )
    .map_err(RestRouteError::internal)?;

    Ok(Json(rest_site_mail_options(true, &service.smtp)))
}

async fn rest_read_site_mail_list(
    headers: HeaderMap,
    body: RestSiteMailListBody,
    service: PilotServiceImpl,
) -> Result<Json<RestSiteMailListResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let recipients = if body.all {
        repository
            .list_site_mail_recipients()
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?
    } else {
        rest_site_mail_recipients_for_projects(repository, &body.projects).await?
    };

    Ok(Json(RestSiteMailListResponse { recipients }))
}

fn rest_site_mail_options(sent: bool, smtp: &SmtpRuntimeConfig) -> RestSiteMailOptionsResponse {
    RestSiteMailOptionsResponse {
        not_configured_items: smtp.not_configured_items(),
        sender: smtp.default_from(),
        sent,
    }
}

fn required_site_mail_field(value: String, name: &str) -> Result<String, RestRouteError> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        return Err(RestRouteError::bad_request(format!("{name} is required")));
    }
    Ok(trimmed)
}

async fn rest_site_mail_recipients_for_projects(
    repository: &PilotRepository,
    projects: &[String],
) -> Result<Vec<String>, RestRouteError> {
    let mut recipients = Vec::new();
    for project_label in projects {
        let project_label = project_label.trim();
        if project_label.is_empty() {
            continue;
        }
        let Some(project) = rest_find_site_mail_project(repository, project_label).await? else {
            continue;
        };
        recipients.extend(
            repository
                .list_project_member_users(project.id)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?
                .into_iter()
                .map(|user| user.email_address.trim().to_string())
                .filter(|email| !email.is_empty()),
        );
    }
    recipients.sort();
    recipients.dedup();
    Ok(recipients)
}

async fn rest_find_site_mail_project(
    repository: &PilotRepository,
    project_label: &str,
) -> Result<Option<persistence::ProjectRecord>, RestRouteError> {
    if let Some((owner_name, project_name)) = project_label.split_once('/') {
        return repository
            .read_project_by_owner_and_name(owner_name, project_name)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()));
    }
    let normalized = normalize_identifier(project_label);
    let project = repository
        .list_projects()
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .into_iter()
        .find(|project| normalize_identifier(&project.project_name) == normalized);
    Ok(project)
}

pub(crate) async fn rest_delete_site_project(
    headers: HeaderMap,
    project_id: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestProjectDeleteResponse>, RestRouteError> {
    let repository = rest_require_site_admin_repository(&service, &headers, true).await?;
    let project = repository
        .read_project_by_id(project_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    repository
        .delete_project_by_owner_and_name(&project.owner_name, &project.project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    delete_project_repository_storage(&service, project.id)?;

    Ok(Json(RestProjectDeleteResponse {
        ok: true,
        redirect_path: "/sites/projectList".to_string(),
    }))
}

async fn rest_require_site_admin_repository<'a>(
    service: &'a PilotServiceImpl,
    headers: &HeaderMap,
    validate_csrf: bool,
) -> Result<&'a PilotRepository, RestRouteError> {
    let session = require_session(&service.session_manager, headers)
        .map_err(RestRouteError::from_connect_error)?;
    if validate_csrf {
        require_valid_csrf(&service.session_manager, headers, &session)
            .map_err(RestRouteError::from_connect_error)?;
    }
    let repository = rest_repository(service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    if !actor.is_site_admin {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("site admin is required"),
        ));
    }
    Ok(repository)
}

fn rest_site_user_state(state: Option<String>) -> Result<String, RestRouteError> {
    let normalized = state
        .as_deref()
        .map(normalize_identifier)
        .unwrap_or_default()
        .to_ascii_uppercase();
    let normalized = if normalized.is_empty() {
        "ACTIVE".to_string()
    } else {
        normalized
    };
    match normalized.as_str() {
        "ACTIVE" | "LOCKED" | "DELETED" | "GUEST" | "SITE_ADMIN" => Ok(normalized),
        _ => Err(RestRouteError::bad_request("invalid site user state")),
    }
}

fn rest_site_issue_state(state: Option<String>) -> Result<String, RestRouteError> {
    let normalized = state
        .as_deref()
        .map(normalize_identifier)
        .unwrap_or_default();
    let normalized = if normalized.is_empty() {
        "open".to_string()
    } else {
        normalized
    };
    match normalized.as_str() {
        "open" | "closed" => Ok(normalized),
        _ => Err(RestRouteError::bad_request("invalid site issue state")),
    }
}

async fn rest_site_user_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: persistence::SiteUserRecord,
) -> Result<RestSiteUserItem, ConnectError> {
    let avatar_url =
        workspace_avatar_url(repository, record.id, &record.email_address, base_path).await?;
    Ok(RestSiteUserItem {
        avatar_url,
        created_at: record
            .created_at
            .map(|value| value.to_string())
            .unwrap_or_default(),
        display_name: record.display_name,
        email_address: record.email_address,
        id: record.id,
        is_guest: record.is_guest,
        is_site_admin: record.is_site_admin,
        last_state_modified_at: record
            .last_state_modified_at
            .map(|value| value.to_string())
            .unwrap_or_default(),
        login_id: record.login_id,
        state: record.state,
    })
}

async fn rest_site_user_list_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: persistence::SiteUserListRecord,
) -> Result<RestSiteUserListResponse, ConnectError> {
    let mut users = Vec::new();
    for user in record.users {
        users.push(rest_site_user_from_record(repository, base_path, user).await?);
    }

    Ok(RestSiteUserListResponse {
        page: record.page,
        page_size: record.page_size,
        query: record.query,
        site_admin_count: record.site_admin_count,
        state: record.state,
        total: record.total,
        total_pages: record.total_pages,
        users,
    })
}

fn rest_site_no_avatar_user_from_record(
    record: persistence::SiteNoAvatarUserRecord,
) -> RestSiteNoAvatarUserItem {
    RestSiteNoAvatarUserItem {
        email: record.email,
        login_id: record.login_id,
        name: record.name,
    }
}

fn rest_site_legacy_ok_response() -> RestSiteLegacyOkResponse {
    RestSiteLegacyOkResponse {
        message: "OK".to_string(),
        status: 200,
    }
}

fn empty_string_as_none(value: &str) -> Option<String> {
    let value = value.trim();
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

async fn rest_site_project_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: persistence::ProjectRecord,
) -> Result<RestSiteProjectItem, ConnectError> {
    let project_logo_url = project_logo_url(repository, base_path, record.id).await?;
    Ok(RestSiteProjectItem {
        created_at: record
            .created_date
            .map(|value| value.to_string())
            .unwrap_or_default(),
        id: record.id,
        owner_name: record.owner_name,
        overview: record.overview.unwrap_or_default(),
        project_logo_url,
        project_name: record.project_name,
        project_scope: record.project_scope,
        vcs: record.vcs,
    })
}

fn rest_site_export_post_from_record(
    data_root: &StdPath,
    record: &persistence::PostingRecord,
) -> RestSiteExportPostItem {
    RestSiteExportPostItem {
        author_login_id: record.author_login_id.clone(),
        attachments: record
            .attachments
            .iter()
            .map(|record| rest_site_export_attachment_from_record(data_root, record))
            .collect(),
        body_markdown: record.body_markdown.clone(),
        comments: rest_site_export_post_comments_from_records(data_root, &record.comments),
        history_markdown: record.history_markdown.clone(),
        labels: record
            .labels
            .iter()
            .map(rest_site_export_label_from_record)
            .collect(),
        notice: record.notice,
        owner_name: record.owner_name.clone(),
        post_number: record.post_number.to_string(),
        project_name: record.project_name.clone(),
        readme: record.readme,
        title: record.title.clone(),
    }
}

fn rest_site_export_issue_from_record(
    data_root: &StdPath,
    record: &persistence::IssueRecord,
) -> RestSiteExportIssueItem {
    RestSiteExportIssueItem {
        assignee_login_id: record.assignee_login_id.clone(),
        author_login_id: record.author_login_id.clone(),
        attachments: record
            .attachments
            .iter()
            .map(|record| rest_site_export_attachment_from_record(data_root, record))
            .collect(),
        body_markdown: record.body_markdown.clone(),
        comments: rest_site_export_issue_comments_from_records(data_root, &record.comments),
        history_markdown: record.history_markdown.clone(),
        issue_number: record.issue_number.to_string(),
        labels: record
            .labels
            .iter()
            .map(rest_site_export_label_from_record)
            .collect(),
        milestone_title: record.milestone_title.clone(),
        owner_name: record.owner_name.clone(),
        project_name: record.project_name.clone(),
        state: record.state.clone(),
        title: record.title.clone(),
    }
}

fn rest_site_export_post_comment_from_record(
    data_root: &StdPath,
    record: &persistence::PostingCommentRecord,
    child_comments: Vec<RestSiteExportCommentItem>,
) -> RestSiteExportCommentItem {
    RestSiteExportCommentItem {
        author_login_id: record.author_login_id.clone(),
        attachments: record
            .attachments
            .iter()
            .map(|record| rest_site_export_attachment_from_record(data_root, record))
            .collect(),
        child_comments,
        contents_markdown: record.contents_markdown.clone(),
    }
}

fn rest_site_export_issue_comment_from_record(
    data_root: &StdPath,
    record: &persistence::IssueCommentRecord,
    child_comments: Vec<RestSiteExportCommentItem>,
) -> RestSiteExportCommentItem {
    RestSiteExportCommentItem {
        author_login_id: record.author_login_id.clone(),
        attachments: record
            .attachments
            .iter()
            .map(|record| rest_site_export_attachment_from_record(data_root, record))
            .collect(),
        child_comments,
        contents_markdown: record.contents_markdown.clone(),
    }
}

fn rest_site_export_post_comments_from_records(
    data_root: &StdPath,
    records: &[persistence::PostingCommentRecord],
) -> Vec<RestSiteExportCommentItem> {
    records
        .iter()
        .filter(|record| record.parent_comment_id.is_none())
        .map(|record| rest_site_export_post_comment_tree(data_root, record, records))
        .collect()
}

fn rest_site_export_post_comment_tree(
    data_root: &StdPath,
    record: &persistence::PostingCommentRecord,
    records: &[persistence::PostingCommentRecord],
) -> RestSiteExportCommentItem {
    let children = records
        .iter()
        .filter(|child| child.parent_comment_id == Some(record.id))
        .map(|child| rest_site_export_post_comment_tree(data_root, child, records))
        .collect();
    rest_site_export_post_comment_from_record(data_root, record, children)
}

fn rest_site_export_issue_comments_from_records(
    data_root: &StdPath,
    records: &[persistence::IssueCommentRecord],
) -> Vec<RestSiteExportCommentItem> {
    records
        .iter()
        .filter(|record| record.parent_comment_id.is_none())
        .map(|record| rest_site_export_issue_comment_tree(data_root, record, records))
        .collect()
}

fn rest_site_export_issue_comment_tree(
    data_root: &StdPath,
    record: &persistence::IssueCommentRecord,
    records: &[persistence::IssueCommentRecord],
) -> RestSiteExportCommentItem {
    let children = records
        .iter()
        .filter(|child| child.parent_comment_id == Some(record.id))
        .map(|child| rest_site_export_issue_comment_tree(data_root, child, records))
        .collect();
    rest_site_export_issue_comment_from_record(data_root, record, children)
}

fn rest_site_export_attachment_from_record(
    data_root: &StdPath,
    record: &persistence::IssueAttachmentRecord,
) -> RestSiteExportAttachmentItem {
    RestSiteExportAttachmentItem {
        content_base64: rest_site_export_attachment_content_base64(data_root, record),
        id: record.id,
        mime_type: record.mime_type.clone(),
        name: record.name.clone(),
        size: record.size,
    }
}

fn rest_site_export_attachment_content_base64(
    data_root: &StdPath,
    record: &persistence::IssueAttachmentRecord,
) -> Option<String> {
    let hash = record.hash.trim();
    if hash.is_empty() {
        return None;
    }
    std::fs::read(uploaded_file_path_with_root(data_root, hash))
        .ok()
        .map(|bytes| general_purpose::STANDARD.encode(bytes))
}

fn rest_site_export_label_from_record(
    record: &persistence::IssueLabelRecord,
) -> RestSiteExportLabelItem {
    RestSiteExportLabelItem {
        category_is_exclusive: record.category_is_exclusive,
        category_name: record.category_name.clone(),
        color: record.color.clone(),
        name: record.name.clone(),
    }
}

async fn rest_site_post_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: &persistence::ProjectPostingListItemRecord,
) -> Result<RestSitePostItem, ConnectError> {
    Ok(RestSitePostItem {
        author_avatar_url: gravatar_url(&record.author_email_address),
        author_label: record.author_label.clone(),
        author_login_id: record.author_login_id.clone(),
        comment_count: record.comment_count,
        created_label: record.created_label.clone(),
        created_title: record.created_title.clone(),
        labels: record
            .labels
            .iter()
            .map(rest_board_label_from_record)
            .collect(),
        notice: record.notice,
        owner_name: record.owner_name.clone(),
        post_number: record.post_number.to_string(),
        project_logo_url: project_logo_url(repository, base_path, record.project_id).await?,
        project_name: record.project_name.clone(),
        readme: record.readme,
        title: record.title.clone(),
        updated_label: record.updated_label.clone(),
    })
}

async fn rest_site_issue_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: &persistence::ProjectIssueListItemRecord,
) -> Result<RestSiteIssueItem, ConnectError> {
    Ok(RestSiteIssueItem {
        assignee_label: record.assignee_label.clone(),
        author_avatar_url: gravatar_url(&record.author_email_address),
        author_label: record.author_label.clone(),
        author_login_id: record.author_login_id.clone(),
        comment_count: record.comment_count,
        created_label: record.created_label.clone(),
        created_title: record.created_title.clone(),
        issue_number: record.issue_number.to_string(),
        labels: record
            .labels
            .iter()
            .map(rest_board_label_from_record)
            .collect(),
        milestone_title: record.milestone_title.clone(),
        owner_name: record.owner_name.clone(),
        project_logo_url: project_logo_url(repository, base_path, record.project_id).await?,
        project_name: record.project_name.clone(),
        state: record.state.clone(),
        title: record.title.clone(),
        updated_label: record.updated_label.clone(),
        voter_count: record.voter_count,
        watcher_count: record.watcher_count,
    })
}
