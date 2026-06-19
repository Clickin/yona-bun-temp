use axum::{
    extract::{Form, Path, Query},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Redirect, Response},
    routing::{delete, get, patch, post, put},
    Json, Router,
};
use buffa::view::OwnedView;
use http::header::SET_COOKIE;
use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use yona_rust_domain::{
    authorize_project_access, ProjectAccessFacts, ProjectOperation, ProjectScope,
};

use crate::generated::yona::pilot::v1::*;
use crate::persistence::{self, PilotRepository};
use crate::{
    base_path_href, escape_html_attr, escape_html_text, gravatar_url, headers_with_form_csrf,
    internal_error, legacy_external_api_auth_error_response, legacy_external_authenticated_user_id,
    normalize_default_landing_path, normalize_identifier, read_issue_access, redirect_to,
    require_authenticated_user, require_session, require_valid_csrf,
    resolve_current_session_response, rest_json_response, rest_owned_view,
    send_workspace_email_validation_mail,
    session::{self, SessionManager},
    workspace_invalid_argument, AuthUiConfig, ConnectError, Context, PilotBackend,
    PilotServiceImpl, RestRouteError, WorkspaceIssueItem,
};

use super::rest_delete_project_member;

#[derive(Deserialize)]
struct DirectDefaultLoginPageQuery {
    path: Option<String>,
}

#[derive(Serialize)]
struct DirectDefaultLoginPageResponse {
    #[serde(rename = "defaultLoginPage")]
    default_login_page: String,
}

fn map_project_scope(value: &str) -> Result<ProjectScope, ConnectError> {
    ProjectScope::try_from(value)
        .map_err(|_| ConnectError::invalid_argument("invalid project scope"))
}

pub(crate) const WORKSPACE_DAYS_AGO: u32 = 14;

fn workspace_project_item_from_entry(item: &persistence::ProjectListEntry) -> ProjectListItem {
    ProjectListItem {
        owner_name: item.owner_name.clone(),
        project_name: item.project_name.clone(),
        overview: String::new(),
        project_scope: String::new(),
        ..Default::default()
    }
}

fn workspace_member_project_item_from_record(
    item: &persistence::WorkspaceMemberProjectRecord,
) -> WorkspaceMemberProjectItem {
    WorkspaceMemberProjectItem {
        created_label: item.created_label.clone(),
        last_pushed_label: item.last_pushed_label.clone(),
        member_count: item.member_count,
        owner_name: item.owner_name.clone(),
        project_name: item.project_name.clone(),
        overview: item.overview.clone(),
        project_scope: item.project_scope.clone(),
        watch_count: item.watch_count,
        ..Default::default()
    }
}

fn workspace_email_from_record(record: &persistence::WorkspaceEmailRecord) -> WorkspaceEmail {
    WorkspaceEmail {
        email_address: record.email_address.clone(),
        id: record.id.clone(),
        valid: record.valid,
        ..Default::default()
    }
}

fn workspace_notification_from_record(
    record: &persistence::WorkspaceNotificationPreferenceRecord,
) -> WorkspaceNotificationPreference {
    WorkspaceNotificationPreference {
        enabled: record.enabled,
        event_type: record.event_type.clone(),
        label: record.label.clone(),
        ..Default::default()
    }
}

fn watched_project_notifications_from_record(
    record: &persistence::WatchedProjectNotificationsRecord,
) -> WatchedProjectNotifications {
    WatchedProjectNotifications {
        notifications: record
            .notifications
            .iter()
            .map(workspace_notification_from_record)
            .collect(),
        owner_name: record.owner_name.clone(),
        project_id: record.project_id.clone(),
        project_name: record.project_name.clone(),
        ..Default::default()
    }
}

pub(crate) fn workspace_profile_from_record(
    record: &persistence::WorkspaceProfileRecord,
    avatar_url: String,
) -> WorkspaceProfile {
    WorkspaceProfile {
        avatar_url,
        connected_social_providers: record.connected_social_providers.clone(),
        display_name: record.display_name.clone(),
        english_name: record.english_name.clone(),
        is_blocked: record.is_blocked,
        is_guest: record.is_guest,
        is_site_admin: record.is_site_admin,
        login_id: record.login_id.clone(),
        primary_email_address: record.primary_email_address.clone(),
        since_label: record.since_label.clone(),
        ..Default::default()
    }
}

pub(crate) async fn workspace_avatar_url(
    repository: &PilotRepository,
    user_id: i64,
    email_address: &str,
    base_path: &str,
) -> Result<String, ConnectError> {
    if let Some(attachment) = repository
        .read_avatar_attachment_for_user(user_id)
        .await
        .map_err(internal_error)?
    {
        return Ok(base_path_href(
            base_path,
            &format!("/files/{}", attachment.id),
        ));
    }
    Ok(gravatar_url(email_address))
}

fn workspace_issue_item_from_record(
    record: &persistence::WorkspaceIssueListItemRecord,
) -> WorkspaceIssueItem {
    WorkspaceIssueItem {
        assignee_label: record.assignee_label.clone(),
        author_label: record.author_label.clone(),
        comment_count: record.comment_count,
        issue_number: record.issue_number,
        owner_name: record.owner_name.clone(),
        project_name: record.project_name.clone(),
        state: record.state.clone(),
        title: record.title.clone(),
        updated_label: record.updated_label.clone(),
        ..Default::default()
    }
}

fn workspace_pull_request_item_from_record(
    record: &persistence::WorkspacePullRequestListItemRecord,
) -> WorkspacePullRequestItem {
    WorkspacePullRequestItem {
        comment_count: record.comment_count,
        contributor_label: record.contributor_label.clone(),
        owner_name: record.owner_name.clone(),
        project_name: record.project_name.clone(),
        pull_request_number: record.pull_request_number,
        receiver_label: record.receiver_label.clone(),
        state: record.state.clone(),
        title: record.title.clone(),
        updated_label: record.updated_label.clone(),
        ..Default::default()
    }
}

async fn load_workspace_project_lists(
    repository: &PilotRepository,
    user_id: i64,
) -> Result<(Vec<ProjectListItem>, Vec<ProjectListItem>), ConnectError> {
    let favorite_projects = repository
        .list_favorite_projects_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(workspace_project_item_from_entry)
        .collect();
    let recent_projects = repository
        .list_recent_projects_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(workspace_project_item_from_entry)
        .collect();

    Ok((favorite_projects, recent_projects))
}

async fn load_workspace_settings_data(
    repository: &PilotRepository,
    user_id: i64,
) -> Result<
    (
        String,
        Vec<WorkspaceEmail>,
        Vec<WatchedProjectNotifications>,
    ),
    ConnectError,
> {
    let api_token = repository
        .read_api_token_for_user(user_id)
        .await
        .map_err(internal_error)?
        .unwrap_or_default();
    let emails = repository
        .list_workspace_emails_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(workspace_email_from_record)
        .collect();
    let watched_projects = repository
        .list_watched_project_notifications_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(watched_project_notifications_from_record)
        .collect();

    Ok((api_token, emails, watched_projects))
}

async fn load_workspace_dashboard_data(
    repository: &PilotRepository,
    user_id: i64,
    base_path: &str,
) -> Result<
    (
        Option<WorkspaceProfile>,
        Vec<WorkspaceIssueItem>,
        Vec<WorkspacePullRequestItem>,
        Vec<WorkspaceMemberProjectItem>,
    ),
    ConnectError,
> {
    let days_ago = u64::from(WORKSPACE_DAYS_AGO);
    let profile = match repository
        .read_workspace_profile_for_user(user_id)
        .await
        .map_err(internal_error)?
    {
        Some(record) => Some(workspace_profile_from_record(
            &record,
            workspace_avatar_url(
                repository,
                user_id,
                &record.primary_email_address,
                base_path,
            )
            .await?,
        )),
        None => None,
    };
    let issue_items = filter_workspace_issue_items_by_read_acl(
        repository,
        user_id,
        repository
            .list_recent_workspace_issues_for_user(user_id, days_ago)
            .await
            .map_err(internal_error)?,
    )
    .await?;
    let pull_request_items = filter_workspace_pull_request_items_by_read_acl(
        repository,
        user_id,
        repository
            .list_recent_workspace_pull_requests_for_user(user_id, days_ago)
            .await
            .map_err(internal_error)?,
    )
    .await?;
    let member_projects = repository
        .list_member_projects_for_user(user_id)
        .await
        .map_err(internal_error)?;
    let member_projects =
        filter_workspace_member_projects_by_read_acl(repository, user_id, member_projects).await?;

    Ok((profile, issue_items, pull_request_items, member_projects))
}

pub(crate) async fn filter_workspace_issue_items_by_read_acl(
    repository: &PilotRepository,
    user_id: i64,
    items: Vec<persistence::WorkspaceIssueListItemRecord>,
) -> Result<Vec<WorkspaceIssueItem>, ConnectError> {
    filter_workspace_issue_items_by_read_acl_for_viewer(repository, Some(user_id), items).await
}

pub(crate) async fn filter_workspace_issue_items_by_read_acl_for_viewer(
    repository: &PilotRepository,
    viewer_id: Option<i64>,
    items: Vec<persistence::WorkspaceIssueListItemRecord>,
) -> Result<Vec<WorkspaceIssueItem>, ConnectError> {
    let mut visible = Vec::new();

    for item in items {
        if workspace_project_read_allowed_for_viewer(
            repository,
            viewer_id,
            &item.owner_name,
            &item.project_name,
        )
        .await?
        {
            visible.push(workspace_issue_item_from_record(&item));
        }
    }

    Ok(visible)
}

async fn filter_workspace_pull_request_items_by_read_acl(
    repository: &PilotRepository,
    user_id: i64,
    items: Vec<persistence::WorkspacePullRequestListItemRecord>,
) -> Result<Vec<WorkspacePullRequestItem>, ConnectError> {
    filter_workspace_pull_request_items_by_read_acl_for_viewer(repository, Some(user_id), items)
        .await
}

pub(crate) async fn filter_workspace_pull_request_items_by_read_acl_for_viewer(
    repository: &PilotRepository,
    viewer_id: Option<i64>,
    items: Vec<persistence::WorkspacePullRequestListItemRecord>,
) -> Result<Vec<WorkspacePullRequestItem>, ConnectError> {
    let mut visible = Vec::new();

    for item in items {
        if workspace_project_read_allowed_for_viewer(
            repository,
            viewer_id,
            &item.owner_name,
            &item.project_name,
        )
        .await?
        {
            visible.push(workspace_pull_request_item_from_record(&item));
        }
    }

    Ok(visible)
}

async fn filter_workspace_member_projects_by_read_acl(
    repository: &PilotRepository,
    user_id: i64,
    items: Vec<persistence::WorkspaceMemberProjectRecord>,
) -> Result<Vec<WorkspaceMemberProjectItem>, ConnectError> {
    filter_workspace_member_projects_by_read_acl_for_viewer(repository, Some(user_id), items).await
}

pub(crate) async fn filter_workspace_member_projects_by_read_acl_for_viewer(
    repository: &PilotRepository,
    viewer_id: Option<i64>,
    items: Vec<persistence::WorkspaceMemberProjectRecord>,
) -> Result<Vec<WorkspaceMemberProjectItem>, ConnectError> {
    let mut visible = Vec::new();

    for item in items {
        if workspace_project_read_allowed_for_viewer(
            repository,
            viewer_id,
            &item.owner_name,
            &item.project_name,
        )
        .await?
        {
            visible.push(workspace_member_project_item_from_record(&item));
        }
    }

    Ok(visible)
}

async fn workspace_project_read_allowed_for_viewer(
    repository: &PilotRepository,
    viewer_id: Option<i64>,
    owner_name: &str,
    project_name: &str,
) -> Result<bool, ConnectError> {
    let Some(authorization) = repository
        .read_project_authorization(owner_name, project_name, viewer_id)
        .await
        .map_err(internal_error)?
    else {
        return Ok(false);
    };

    Ok(authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous: viewer_id.is_none(),
            is_guest: authorization.viewer.is_guest,
            is_organization_admin: authorization.viewer.is_organization_admin,
            is_organization_member: authorization.viewer.is_organization_member,
            is_project_manager: authorization.viewer.is_project_manager,
            is_project_member: authorization.viewer.is_project_member,
            is_site_admin: authorization.viewer.is_site_admin,
            project_scope: map_project_scope(&authorization.project.project_scope)?,
        },
        ProjectOperation::Read,
    )
    .allowed)
}

pub(crate) async fn build_workspace_overview_response(
    repository: &PilotRepository,
    session: &session::Session,
    base_path: &str,
) -> Result<ReadWorkspaceOverviewResponse, ConnectError> {
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let response = resolve_current_session_response(
        &PilotBackend::Repository(repository.clone()),
        Some(session),
    )
    .await?;
    if response.is_anonymous {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    }
    let (favorite_projects, recent_projects) =
        load_workspace_project_lists(repository, user_id).await?;
    let (api_token, emails, watched_projects) =
        load_workspace_settings_data(repository, user_id).await?;
    let (profile, issue_items, pull_request_items, member_projects) =
        load_workspace_dashboard_data(repository, user_id, base_path).await?;

    Ok(ReadWorkspaceOverviewResponse {
        api_token,
        days_ago: WORKSPACE_DAYS_AGO,
        default_landing_path: response.default_landing_path.clone(),
        emails,
        favorite_projects,
        issue_items,
        member_projects,
        profile: profile.into(),
        pull_request_items,
        recent_projects,
        session: Some(response).into(),
        watched_projects,
        ..Default::default()
    })
}

pub(crate) async fn workspace_overview_read(
    service: &PilotServiceImpl,
    ctx: Context,
) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "workspace requires repository backend",
        ));
    };
    Ok((
        build_workspace_overview_response(repository, &session, &service.base_path).await?,
        ctx,
    ))
}

pub(crate) async fn workspace_default_landing_path_set(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<SetDefaultLandingPathRequestView<'static>>,
) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "workspace requires repository backend",
        ));
    };

    let Some(path) = normalize_default_landing_path(Some(&request.path)) else {
        return Err(ConnectError::invalid_argument(
            "invalid default landing path",
        ));
    };
    repository
        .set_default_landing_path(user_id, Some(path))
        .await
        .map_err(internal_error)?;

    Ok((
        build_workspace_overview_response(repository, &session, &service.base_path).await?,
        ctx,
    ))
}

pub(crate) async fn workspace_profile_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateProfileRequestView<'static>>,
) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "workspace requires repository backend",
        ));
    };
    if request.name.trim().is_empty() {
        return Err(workspace_invalid_argument("validation.required"));
    }
    if !request.avatar_attachment_id.trim().is_empty() {
        let attachment_id = request
            .avatar_attachment_id
            .trim()
            .parse::<i64>()
            .map_err(|_| workspace_invalid_argument("user.avatar.uploadError"))?;
        let Some(attachment) = repository
            .promote_avatar_attachment_for_user(user_id, attachment_id)
            .await
            .map_err(|_| workspace_invalid_argument("user.avatar.uploadError"))?
        else {
            return Err(workspace_invalid_argument("user.avatar.uploadError"));
        };
        if !attachment.mime_type.starts_with("image/") {
            return Err(workspace_invalid_argument("user.avatar.onlyImage"));
        }
        if attachment.size > 1024 * 1000 {
            return Err(workspace_invalid_argument("user.avatar.fileSizeAlert"));
        }
    }
    repository
        .update_profile_for_user(user_id, &request.name, &request.email)
        .await
        .map_err(|error| workspace_invalid_argument(error.to_string()))?;
    Ok((
        build_workspace_overview_response(repository, &session, &service.base_path).await?,
        ctx,
    ))
}

pub(crate) async fn workspace_visited_projects_reset(
    service: &PilotServiceImpl,
    ctx: Context,
) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "workspace requires repository backend",
        ));
    };
    repository
        .clear_recent_projects_for_user(user_id)
        .await
        .map_err(internal_error)?;
    Ok((
        build_workspace_overview_response(repository, &session, &service.base_path).await?,
        ctx,
    ))
}

pub(crate) async fn workspace_email_add(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<AddWorkspaceEmailRequestView<'static>>,
) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "workspace requires repository backend",
        ));
    };
    repository
        .add_workspace_email_for_user(user_id, &request.email)
        .await
        .map_err(|error| workspace_invalid_argument(error.to_string()))?;
    Ok((
        build_workspace_overview_response(repository, &session, &service.base_path).await?,
        ctx,
    ))
}

pub(crate) async fn workspace_email_delete(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<DeleteWorkspaceEmailRequestView<'static>>,
) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let email_id = request
        .id
        .parse::<i64>()
        .map_err(|_| workspace_invalid_argument("Email id is invalid."))?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "workspace requires repository backend",
        ));
    };
    repository
        .delete_workspace_email_for_user(user_id, email_id)
        .await
        .map_err(|error| workspace_invalid_argument(error.to_string()))?;
    Ok((
        build_workspace_overview_response(repository, &session, &service.base_path).await?,
        ctx,
    ))
}

pub(crate) async fn workspace_email_validation_send(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<SendWorkspaceEmailValidationRequestView<'static>>,
) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let email_id = request
        .id
        .parse::<i64>()
        .map_err(|_| workspace_invalid_argument("Email id is invalid."))?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "workspace requires repository backend",
        ));
    };
    repository
        .send_workspace_email_validation_for_user(user_id, email_id)
        .await
        .map_err(|error| workspace_invalid_argument(error.to_string()))?;
    Ok((
        build_workspace_overview_response(repository, &session, &service.base_path).await?,
        ctx,
    ))
}

pub(crate) async fn workspace_main_email_set(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<SetMainWorkspaceEmailRequestView<'static>>,
) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let email_id = request
        .id
        .parse::<i64>()
        .map_err(|_| workspace_invalid_argument("Email id is invalid."))?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "workspace requires repository backend",
        ));
    };
    repository
        .set_main_workspace_email_for_user(user_id, email_id)
        .await
        .map_err(|error| workspace_invalid_argument(error.to_string()))?;
    Ok((
        build_workspace_overview_response(repository, &session, &service.base_path).await?,
        ctx,
    ))
}

pub(crate) async fn workspace_api_token_reset(
    service: &PilotServiceImpl,
    ctx: Context,
) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "workspace requires repository backend",
        ));
    };
    repository
        .reset_api_token_for_user(user_id)
        .await
        .map_err(internal_error)?;
    Ok((
        build_workspace_overview_response(repository, &session, &service.base_path).await?,
        ctx,
    ))
}

pub(crate) async fn workspace_notification_toggle(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ToggleWorkspaceNotificationRequestView<'static>>,
) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let project_id = request
        .project_id
        .parse::<i64>()
        .map_err(|_| workspace_invalid_argument("Project id is invalid."))?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "workspace requires repository backend",
        ));
    };
    let project = repository
        .read_project_by_id(project_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let authorization = repository
        .read_project_authorization(&project.owner_name, &project.project_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let project_scope = map_project_scope(&authorization.project.project_scope)?;
    let access = authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous: false,
            is_guest: authorization.viewer.is_guest,
            is_organization_admin: authorization.viewer.is_organization_admin,
            is_organization_member: authorization.viewer.is_organization_member,
            is_project_manager: authorization.viewer.is_project_manager,
            is_project_member: authorization.viewer.is_project_member,
            is_site_admin: authorization.viewer.is_site_admin,
            project_scope,
        },
        ProjectOperation::Read,
    );
    if !access.allowed {
        return Err(ConnectError::permission_denied("project access forbidden"));
    }
    let is_watching = repository
        .is_watching_project(user_id, project_id)
        .await
        .map_err(internal_error)?;
    if !is_watching {
        return Err(workspace_invalid_argument("watch not found"));
    }
    repository
        .toggle_workspace_notification_for_user(user_id, project_id, &request.event_type)
        .await
        .map_err(|error| workspace_invalid_argument(error.to_string()))?;
    Ok((
        build_workspace_overview_response(repository, &session, &service.base_path).await?,
        ctx,
    ))
}

async fn direct_legacy_leave_project(
    mut headers: HeaderMap,
    owner_name: String,
    project_name: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let login_redirect = base_path_href(
        &base_path,
        "/users/loginform?redirectUrl=%2Fuser%2Feditform",
    );
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return Redirect::to(&login_redirect).into_response();
    };
    let Some(user_id) = session.user_id else {
        return Redirect::to(&login_redirect).into_response();
    };
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("project leave requires repository backend")
            .into_response();
    };
    let user = match repository.find_user_by_id(user_id).await {
        Ok(Some(user)) => user,
        Ok(None) => return RestRouteError::not_found("user not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    headers.insert(
        "x-csrf-token",
        HeaderValue::from_str(&session.csrf_token).expect("csrf token header"),
    );
    let service = PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    let _ = rest_delete_project_member(headers, owner_name, project_name, user_id, service).await;
    redirect_to(
        &base_path,
        &format!("/{}?daysAgo=14&selected=projects", user.login_id),
    )
}

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/workspace",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_read_workspace_overview(headers, service).await }
                }
            }),
        )
        .route(
            "/workspace/default-landing-path",
            put({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestDefaultLandingPathBody>| {
                    let service = service.clone();
                    async move { rest_set_default_landing_path(headers, body, service).await }
                }
            }),
        )
        .route(
            "/workspace/profile",
            patch({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestUpdateProfileBody>| {
                    let service = service.clone();
                    async move { rest_update_profile(headers, body, service).await }
                }
            }),
        )
        .route(
            "/workspace/password",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestChangePasswordBody>| {
                    let service = service.clone();
                    async move { rest_change_password(headers, body, service).await }
                }
            }),
        )
        .route(
            "/workspace/recent-projects",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestRecentProjectVisitBody>| {
                    let service = service.clone();
                    async move { rest_record_recent_project_visit(headers, body, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_reset_visited_projects(headers, service).await }
                }
            }),
        )
        .route(
            "/workspace/files",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestWorkspaceFilesQuery>| {
                    let service = service.clone();
                    async move { rest_list_workspace_files(headers, query, service).await }
                }
            }),
        )
        .route(
            "/workspace/emails",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestWorkspaceEmailBody>| {
                    let service = service.clone();
                    async move { rest_add_workspace_email(headers, body, service).await }
                }
            }),
        )
        .route(
            "/workspace/emails/{email_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap, Path(email_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_delete_workspace_email(headers, email_id, service).await }
                }
            }),
        )
        .route(
            "/workspace/emails/{email_id}/validation",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(email_id): Path<String>| {
                    let service = service.clone();
                    async move {
                        rest_send_workspace_email_validation(headers, email_id, service).await
                    }
                }
            }),
        )
        .route(
            "/workspace/emails/{email_id}/main",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(email_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_set_main_workspace_email(headers, email_id, service).await }
                }
            }),
        )
        .route(
            "/workspace/api-token/reset",
            post({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_reset_api_token(headers, service).await }
                }
            }),
        )
        .route(
            "/workspace/notifications",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestWorkspaceNotificationBody>| {
                    let service = service.clone();
                    async move { rest_toggle_workspace_notification(headers, body, service).await }
                }
            }),
        )
}

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Router {
    let reset_visited_session_manager = session_manager.clone();
    let reset_visited_backend = backend.clone();
    let reset_visited_base_path = base_path.clone();
    let default_login_page_session_manager = session_manager.clone();
    let default_login_page_backend = backend.clone();
    let legacy_default_login_page_session_manager = session_manager.clone();
    let legacy_default_login_page_backend = backend.clone();
    let user_sidebar_session_manager = session_manager.clone();
    let user_sidebar_backend = backend.clone();
    let user_sidebar_base_path = base_path.clone();
    let usermenu_tab_session_manager = session_manager.clone();
    let usermenu_tab_backend = backend.clone();
    let usermenu_tab_base_path = base_path.clone();
    let update_profile_session_manager = session_manager.clone();
    let update_profile_backend = backend.clone();
    let update_profile_base_path = base_path.clone();
    let change_user_password_session_manager = session_manager.clone();
    let change_user_password_backend = backend.clone();
    let change_user_password_base_path = base_path.clone();
    let add_workspace_email_session_manager = session_manager.clone();
    let add_workspace_email_backend = backend.clone();
    let add_workspace_email_base_path = base_path.clone();
    let reset_api_token_session_manager = session_manager.clone();
    let reset_api_token_backend = backend.clone();
    let reset_api_token_base_path = base_path.clone();
    let delete_email_session_manager = session_manager.clone();
    let delete_email_backend = backend.clone();
    let delete_email_base_path = base_path.clone();
    let set_main_email_session_manager = session_manager.clone();
    let set_main_email_backend = backend.clone();
    let set_main_email_base_path = base_path.clone();
    let send_validation_session_manager = session_manager.clone();
    let send_validation_backend = backend.clone();
    let send_validation_base_path = base_path.clone();
    let send_validation_public_origin = public_origin.clone();
    let confirm_email_session_manager = session_manager.clone();
    let confirm_email_backend = backend.clone();
    let confirm_email_base_path = base_path.clone();
    let info_leave_session_manager = session_manager.clone();
    let info_leave_backend = backend.clone();
    let info_leave_base_path = base_path.clone();
    let legacy_favorite_projects_list_backend = backend.clone();
    let legacy_favorite_projects_list_session_manager = session_manager.clone();
    let legacy_favorite_project_toggle_backend = backend.clone();
    let legacy_favorite_project_toggle_session_manager = session_manager.clone();
    let legacy_favorite_issues_list_backend = backend.clone();
    let legacy_favorite_issues_list_session_manager = session_manager.clone();
    let legacy_favorite_issue_toggle_backend = backend.clone();
    let legacy_favorite_issue_toggle_session_manager = session_manager.clone();
    let legacy_favorite_organizations_list_backend = backend.clone();
    let legacy_favorite_organizations_list_session_manager = session_manager.clone();
    let legacy_favorite_organization_toggle_backend = backend.clone();
    let legacy_favorite_organization_toggle_session_manager = session_manager.clone();

    Router::new()
        .route(
            "/-_-api/v1/favoriteProjects",
            get(move |headers: HeaderMap| {
                async move {
                    legacy_external_favorite_projects(
                        headers,
                        legacy_favorite_projects_list_session_manager.clone(),
                        legacy_favorite_projects_list_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteProjects/{project_id}",
            post(move |headers: HeaderMap, Path(project_id): Path<i64>| {
                async move {
                    legacy_external_toggle_favorite_project(
                        headers,
                        project_id,
                        legacy_favorite_project_toggle_session_manager.clone(),
                        legacy_favorite_project_toggle_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteIssues",
            get(move |headers: HeaderMap| {
                async move {
                    legacy_external_favorite_issues(
                        headers,
                        legacy_favorite_issues_list_session_manager.clone(),
                        legacy_favorite_issues_list_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteIssues/{issue_id}",
            post(move |headers: HeaderMap, Path(issue_id): Path<i64>| {
                async move {
                    legacy_external_toggle_favorite_issue(
                        headers,
                        issue_id,
                        legacy_favorite_issue_toggle_session_manager.clone(),
                        legacy_favorite_issue_toggle_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteOrganizations",
            get(move |headers: HeaderMap| {
                async move {
                    legacy_external_favorite_organizations(
                        headers,
                        legacy_favorite_organizations_list_session_manager.clone(),
                        legacy_favorite_organizations_list_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteOrganizations/{organization_id}",
            post(
                move |headers: HeaderMap, Path(organization_id): Path<i64>| {
                    async move {
                        legacy_external_toggle_favorite_organization(
                            headers,
                            organization_id,
                            legacy_favorite_organization_toggle_session_manager.clone(),
                            legacy_favorite_organization_toggle_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/user/sidebar",
            axum::routing::get(
                move |headers: HeaderMap, Query(query): Query<DirectUserSidebarQuery>| {
                    async move {
                        direct_user_sidebar(
                            headers,
                            query,
                            user_sidebar_session_manager.clone(),
                            user_sidebar_backend.clone(),
                            user_sidebar_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/user/usermenuTabContentList",
            axum::routing::get(move |headers: HeaderMap| {
                async move {
                    direct_user_menu_tab_content_list(
                        headers,
                        usermenu_tab_session_manager.clone(),
                        usermenu_tab_backend.clone(),
                        usermenu_tab_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/edit",
            post(move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_update_user_profile(
                        headers,
                        form,
                        update_profile_session_manager.clone(),
                        update_profile_backend.clone(),
                        update_profile_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/resetPassword",
            post(move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_change_user_password(
                        headers,
                        form,
                        change_user_password_session_manager.clone(),
                        change_user_password_backend.clone(),
                        change_user_password_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/email",
            post(move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_add_workspace_email(
                        headers,
                        form,
                        add_workspace_email_session_manager.clone(),
                        add_workspace_email_backend.clone(),
                        add_workspace_email_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/editform/token_reset",
            post(move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_reset_api_token_from_settings_form(
                        headers,
                        form,
                        reset_api_token_session_manager.clone(),
                        reset_api_token_backend.clone(),
                        reset_api_token_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/email/delete/{email_id}",
            delete(move |headers: HeaderMap, Path(email_id): Path<String>| {
                async move {
                    direct_delete_workspace_email(
                        headers,
                        email_id,
                        delete_email_session_manager.clone(),
                        delete_email_backend.clone(),
                        delete_email_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/email/setAsMain/{email_id}",
            put(move |headers: HeaderMap, Path(email_id): Path<String>| {
                async move {
                    direct_set_main_workspace_email(
                        headers,
                        email_id,
                        set_main_email_session_manager.clone(),
                        set_main_email_backend.clone(),
                        set_main_email_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/email/sendValidationEmail/{email_id}",
            post(
                move |headers: HeaderMap,
                      Path(email_id): Path<String>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_send_workspace_email_validation(
                            headers,
                            email_id,
                            form,
                            send_validation_session_manager.clone(),
                            send_validation_backend.clone(),
                            send_validation_base_path.clone(),
                            send_validation_public_origin.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/user/email/confirm/{email_id}/{token}",
            get(
                move |headers: HeaderMap, Path((email_id, token)): Path<(String, String)>| {
                    async move {
                        direct_confirm_workspace_email(
                            headers,
                            email_id,
                            token,
                            confirm_email_session_manager.clone(),
                            confirm_email_backend.clone(),
                            confirm_email_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/info/leave/{owner_name}/{project_name}",
            get(
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    async move {
                        direct_legacy_leave_project(
                            headers,
                            owner_name,
                            project_name,
                            info_leave_session_manager.clone(),
                            info_leave_backend.clone(),
                            info_leave_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/user/resetVisitedList",
            post(move |headers: HeaderMap| {
                async move {
                    direct_reset_user_visited_list(
                        headers,
                        reset_visited_session_manager.clone(),
                        reset_visited_backend.clone(),
                        reset_visited_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/defultLoginPage",
            post(move |headers: HeaderMap, Query(query): Query<DirectDefaultLoginPageQuery>| {
                async move {
                    direct_set_default_login_page(
                        headers,
                        query,
                        default_login_page_session_manager.clone(),
                        default_login_page_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/user/defultLoginPage",
            post(move |headers: HeaderMap, Query(query): Query<DirectDefaultLoginPageQuery>| {
                async move {
                    direct_set_default_login_page(
                        headers,
                        query,
                        legacy_default_login_page_session_manager.clone(),
                        legacy_default_login_page_backend.clone(),
                    )
                    .await
                }
            }),
        )
}

async fn direct_reset_user_visited_list(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let login_redirect = base_path_href(
        &base_path,
        "/users/loginform?redirectUrl=%2Fuser%2Feditform",
    );
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return Redirect::to(&login_redirect).into_response();
    };
    let Some(user_id) = session.user_id else {
        return Redirect::to(&login_redirect).into_response();
    };

    match &backend {
        PilotBackend::Repository(repository) => {
            match repository.clear_recent_projects_for_user(user_id).await {
                Ok(()) => redirect_to(&base_path, "/user/editform"),
                Err(error) => RestRouteError::internal(error.to_string()).into_response(),
            }
        }
        _ => {
            RestRouteError::not_implemented("workspace requires repository backend").into_response()
        }
    }
}

async fn direct_set_default_login_page(
    headers: HeaderMap,
    query: DirectDefaultLoginPageQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
        .into_response();
    };
    let Some(user_id) = session.user_id else {
        return RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
        .into_response();
    };
    let Some(path) = normalize_default_landing_path(query.path.as_deref()) else {
        return RestRouteError::bad_request("invalid default landing path").into_response();
    };

    match &backend {
        PilotBackend::Repository(repository) => match repository
            .set_default_landing_path(user_id, Some(path.clone()))
            .await
        {
            Ok(_) => Json(DirectDefaultLoginPageResponse {
                default_login_page: path,
            })
            .into_response(),
            Err(error) => RestRouteError::internal(error.to_string()).into_response(),
        },
        _ => {
            RestRouteError::not_implemented("workspace requires repository backend").into_response()
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestDefaultLandingPathBody {
    path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestUpdateProfileBody {
    #[serde(default)]
    avatar_attachment_id: String,
    email: String,
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestChangePasswordBody {
    login_id: String,
    old_password: String,
    password: String,
    retyped_password: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestWorkspaceEmailBody {
    email: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestWorkspaceNotificationBody {
    event_type: String,
    project_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestRecentProjectVisitBody {
    owner_name: String,
    project_name: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestWorkspaceFilesQuery {
    filter: Option<String>,
    page: Option<u32>,
    page_num: Option<u32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestWorkspaceFileItem {
    container_id: i64,
    container_type: String,
    created_label: String,
    download_url: String,
    id: i64,
    location_href: String,
    location_label: String,
    mime_type: String,
    name: String,
    preview_url: String,
    size: i64,
    size_label: String,
    url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestWorkspaceFilesResponse {
    files: Vec<RestWorkspaceFileItem>,
    filter: String,
    page: u32,
    page_size: u32,
    total: u32,
    total_pages: u32,
}

#[derive(Deserialize)]
struct DirectUserSidebarQuery {
    hash: Option<String>,
    path: Option<String>,
}

async fn direct_user_sidebar(
    headers: HeaderMap,
    query: DirectUserSidebarQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let session_user_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let iframe_path = legacy_sidebar_iframe_path(&base_path, query);
    let authenticated_sidebar = match (backend, session_user_id) {
        (PilotBackend::Repository(repository), Some(user_id)) => {
            match render_legacy_authenticated_sidebar(&repository, user_id, &base_path).await {
                Ok(sidebar) => Some(sidebar),
                Err(error) => return error.into_response(),
            }
        }
        (PilotBackend::Repository(_), None) => None,
        (PilotBackend::Static, Some(_)) => {
            return RestRouteError::not_implemented("sidebar requires repository backend")
                .into_response();
        }
        (PilotBackend::Static, None) => None,
    };

    (
        [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
        render_legacy_user_sidebar_page(&base_path, &iframe_path, authenticated_sidebar.as_deref()),
    )
        .into_response()
}

async fn direct_user_menu_tab_content_list(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let repository = match backend {
        PilotBackend::Repository(repository) => repository,
        PilotBackend::Static => {
            return RestRouteError::not_implemented("usermenu requires repository backend")
                .into_response();
        }
    };
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
        .into_response();
    };
    let actor = match require_authenticated_user(&repository, session.user_id).await {
        Ok(actor) => actor,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let menu =
        match render_legacy_usermenu_tab_content_for_actor(&repository, &actor, &base_path).await {
            Ok(menu) => menu,
            Err(error) => {
                return error.into_response();
            }
        };

    (
        [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
        menu,
    )
        .into_response()
}

async fn render_legacy_authenticated_sidebar(
    repository: &PilotRepository,
    user_id: i64,
    base_path: &str,
) -> Result<String, RestRouteError> {
    let actor = require_authenticated_user(repository, Some(user_id))
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let menu = render_legacy_usermenu_tab_content_for_actor(repository, &actor, base_path).await?;
    Ok(render_legacy_sidebar_inner(base_path, &actor, &menu))
}

async fn render_legacy_usermenu_tab_content_for_actor(
    repository: &PilotRepository,
    actor: &persistence::AppUserRecord,
    base_path: &str,
) -> Result<String, RestRouteError> {
    let recent_projects = repository
        .list_recent_projects_for_user(actor.id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    let member_projects = repository
        .list_member_projects_for_user(actor.id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    let recent_issue_records = repository
        .list_recent_workspace_issues_for_user(actor.id, u64::from(WORKSPACE_DAYS_AGO))
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;
    let recent_issues =
        filter_workspace_issue_items_by_read_acl(repository, actor.id, recent_issue_records)
            .await
            .map_err(RestRouteError::from_connect_error)?;

    Ok(render_legacy_usermenu_tab_content_list(
        base_path,
        &actor.login_id,
        &recent_projects,
        &member_projects,
        &recent_issues,
    ))
}

fn legacy_sidebar_iframe_path(base_path: &str, query: DirectUserSidebarQuery) -> String {
    let path = query
        .path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("/notifications");
    let mut iframe_path = if path.starts_with('/') {
        base_path_href(base_path, path)
    } else {
        base_path_href(base_path, &format!("/{path}"))
    };
    if let Some(hash) = query
        .hash
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        iframe_path.push('#');
        iframe_path.push_str(hash.trim_start_matches('#'));
    }
    iframe_path
}

fn render_legacy_user_sidebar_page(
    base_path: &str,
    iframe_path: &str,
    authenticated_sidebar: Option<&str>,
) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<title>app.name</title>
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<link rel="shortcut icon" type="image/x-icon" href="{favicon}">
<link rel="stylesheet" type="text/css" media="all" href="{bootstrap}">
<link rel="stylesheet" type="text/css" media="all" href="{yobicon}">
<link rel="stylesheet" type="text/css" media="all" href="{usermenu_css}">
<link rel="stylesheet" type="text/css" media="all" href="{yobi_css}">
</head>
<body class="framed-body" id="html-body">
    <div id="sidebar" class="sidebar hide-in-mobile">
        {sidebar}
    <div id="sidebar-bottom" class="sidebar-bottom" style="
        position: absolute;
        bottom: 8px;
        right: 15px;
        color: gray;
    ">Yona, made by <i class="yobicon-hearts" style="
        color: red;
        vertical-align: middle;
    "></i></div>
    </div>
    <div id="mainFrame" class="show-in-mobile-100vh">
        <iframe name="mainFrame" id="mainFrameId" frameborder="0" class="mainFrame" height="100%" width="100%" src="{iframe_path}" ></iframe>
    </div>
    <script type="text/javascript">
        var UsermenuToggleFavoriteProjectUrl = "{favorite_project_url}";
        var UsermenuToggleFoveriteOrganizationUrl = "{favorite_organization_url}";
        var UsermenuGetFoveriteProjectsUrl = "{favorite_projects_url}";
        var UsermenuToggleFavoriteIssueUrl = "{favorite_issue_url}";
        var UsermenuGetFoveriteIssuesUrl = "{favorite_issues_url}";
        var UsermenuUrl = "{usermenu_url}";
    </script>
    <script type="text/javascript" src="{usermenu_js}"></script>
</body>
</html>
"#,
        favicon = escape_html_attr(&base_path_href(base_path, "/assets/images/favicon.ico")),
        bootstrap = escape_html_attr(&base_path_href(
            base_path,
            "/assets/bootstrap/css/bootstrap.css"
        )),
        yobicon = escape_html_attr(&base_path_href(
            base_path,
            "/assets/stylesheets/yobicon/style.css"
        )),
        usermenu_css = escape_html_attr(&base_path_href(
            base_path,
            "/assets/stylesheets/usermenu.css"
        )),
        yobi_css = escape_html_attr(&base_path_href(base_path, "/assets/stylesheets/yobi.css")),
        sidebar = authenticated_sidebar.unwrap_or_default(),
        iframe_path = escape_html_attr(iframe_path),
        favorite_project_url =
            escape_html_attr(&base_path_href(base_path, "/-_-api/v1/favoriteProjects/")),
        favorite_organization_url = escape_html_attr(&base_path_href(
            base_path,
            "/-_-api/v1/favoriteOrganizations/"
        )),
        favorite_projects_url =
            escape_html_attr(&base_path_href(base_path, "/-_-api/v1/favoriteProjects")),
        favorite_issue_url =
            escape_html_attr(&base_path_href(base_path, "/-_-api/v1/favoriteIssues/")),
        favorite_issues_url =
            escape_html_attr(&base_path_href(base_path, "/-_-api/v1/favoriteIssues")),
        usermenu_url = escape_html_attr(&base_path_href(base_path, "/user/usermenuTabContentList")),
        usermenu_js = escape_html_attr(&base_path_href(
            base_path,
            "/assets/javascripts/common/yona.Usermenu.js"
        )),
    )
}

fn render_legacy_sidebar_inner(
    base_path: &str,
    actor: &persistence::AppUserRecord,
    menu_content: &str,
) -> String {
    format!(
        r##"<div class="row-fluid user-menu-wrap">
    <span class="user-menu"><a href="{profile_href}" target="mainFrame">
        <span class="avatar-wrap smaller">
            <img src="{avatar_url}" />
        </span>
        <span class="caret-text hide-in-mobile">{display_name}</span>
    </a></span>
    <span class="user-menu"><a href="{settings_href}" target="mainFrame">userinfo.accountSetting</a></span>
    <a href="{logout_href}"><span class="user-menu logout label">title.logout</span></a>
    <div class="pin-in-sidebar" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i></div>
</div>
<ul class="nav nav-tabs nm">
    <li class="myOrganizationList">
        <a href="#myOrganizationList" data-toggle="tab">
        title.favorite
        </a>
    </li>
    <li class="myProjectList">
        <a href="#myProjectList" data-toggle="tab">
        title.project
        </a>
    </li>
    <li class="myRecentIssueList">
        <a href="#myRecentIssueList" data-toggle="tab">
            title.recently.visited.issue
        </a>
    </li>
    <li>
        <div class=""><i class="yobicon-refresh refresh-button"></i></div>
    </li>
</ul>
<div class="tab-content tab-box">
    <div id="usermenu-tab-content-list" class="tab-content">
        {menu_content}
    </div>
</div>
    <script>
         $(function(){{
             var activeMenu = localStorage.getItem('sidebarActiveMenu')
             if (activeMenu == null) {{
                $('.myOrganizationList').addClass('active');
                 $('#myOrganizationList').addClass('active');
             }} else {{
                 $('.'+activeMenu).addClass('active');
                 $('#'+activeMenu).addClass('active');
             }}

             $('.refresh-button').on('click', function(){{
                 window.location.reload();
             }});

             $('.myOrganizationList').on('click', function(){{
                 localStorage.setItem('sidebarActiveMenu', 'myOrganizationList');
                 $(".sidebar-bottom").hide();
             }})
             $('.myProjectList').on('click', function(){{
                 localStorage.setItem('sidebarActiveMenu', 'myProjectList');
                 $(".sidebar-bottom").hide();
             }})
             $('.myRecentIssueList').on('click', function(){{
                 localStorage.setItem('sidebarActiveMenu', 'myRecentIssueList');
                 $(".sidebar-bottom").show();
             }})

             $(".pin-in-sidebar").on("click", function () {{
                 localStorage.setItem('shallWeOpenLeftNavigation', "false");
                 window.location = window.location.href;
             }});

         }})
    </script>
"##,
        profile_href =
            escape_html_attr(&base_path_href(base_path, &format!("/{}", actor.login_id))),
        avatar_url = escape_html_attr(&base_path_href(
            base_path,
            "/assets/images/default-avatar-32.png"
        )),
        display_name = escape_html_text(&actor.display_name),
        settings_href = escape_html_attr(&base_path_href(base_path, "/user/editform")),
        logout_href = escape_html_attr(&base_path_href(base_path, "/users/logout")),
        menu_content = menu_content,
    )
}

fn render_legacy_usermenu_tab_content_list(
    base_path: &str,
    actor_login_id: &str,
    recent_projects: &[persistence::ProjectListEntry],
    member_projects: &[persistence::WorkspaceMemberProjectRecord],
    recent_issues: &[WorkspaceIssueItem],
) -> String {
    format!(
        r#"<div class="tab-pane user-project-list active" id="myOrganizationList">
{}
</div>
<div class="tab-pane user-project-list" id="myProjectList">
{}
</div>
<div class="tab-pane user-project-list" id="myRecentIssueList">
{}
</div>
"#,
        render_legacy_usermenu_organizations(base_path, actor_login_id, member_projects),
        render_legacy_usermenu_projects(
            base_path,
            actor_login_id,
            recent_projects,
            member_projects
        ),
        render_legacy_usermenu_recent_issues(base_path, recent_issues)
    )
}

fn render_legacy_usermenu_organizations(
    base_path: &str,
    actor_login_id: &str,
    member_projects: &[persistence::WorkspaceMemberProjectRecord],
) -> String {
    let body = if member_projects.is_empty() {
        render_legacy_usermenu_no_result("organizations", true)
    } else {
        let projects = member_projects
            .iter()
            .map(|project| {
                render_legacy_usermenu_project_item(
                    base_path,
                    &project.owner_name,
                    &project.project_name,
                    &project.project_scope,
                    false,
                )
            })
            .collect::<Vec<_>>()
            .join("");
        format!(
            r#"<ul class="tab-pane user-ul active" id="organizations">
<li class="org-li">
<div class="org-list project-flex-container all-orgs">
<div class="project-item project-item-container">
<div class="flex-item site-logo"><i class="yobicon-angle-right"></i></div>
<div class="projectName-owner all-org-names flex-item">
<div class="project-name org-name flex-item">{}</div>
<div class="project-owner flex-item sub-project-counter"></div>
</div>
</div>
<div class="star-org flex-item"></div>
</div>
<ul class="project-ul">
{}
</ul>
</li>
<ul class="etc-favorites"></ul>
</ul>"#,
            escape_html_text(actor_login_id),
            projects
        )
    };

    format!(
        r#"<div class="search-result">
<div class="group">
<input class="search-input org-search" type="text" autocomplete="off" placeholder="title.type.name">
<span class="bar"></span>
</div>
{}
</div>"#,
        body
    )
}

fn render_legacy_usermenu_projects(
    base_path: &str,
    actor_login_id: &str,
    recent_projects: &[persistence::ProjectListEntry],
    member_projects: &[persistence::WorkspaceMemberProjectRecord],
) -> String {
    let created_projects = member_projects
        .iter()
        .filter(|project| {
            normalize_identifier(&project.owner_name) == normalize_identifier(actor_login_id)
        })
        .cloned()
        .collect::<Vec<_>>();
    let joined_projects = member_projects
        .iter()
        .filter(|project| {
            normalize_identifier(&project.owner_name) != normalize_identifier(actor_login_id)
        })
        .cloned()
        .collect::<Vec<_>>();

    format!(
        r##"<div>
<div class="search-result">
<div class="tab-pane myproject-list-wrap" >
<div class="group">
<input class="search-input project-search" type="text" id="query" autocomplete="off" placeholder="title.type.name">
<span class="bar"></span>
</div>
<div class="subtab-wrap subtab-group">
<ul class="nav-subtab unstyled">
<li class="active"><a href="#recentlyVisited" data-toggle="tab">title.recently.visited</a></li>
<li><a href="#createdByMe" data-toggle="tab">title.createdByMe</a></li>
<li><a href="#watching" data-toggle="tab">title.watching</a></li>
<li><a href="#joinmember" data-toggle="tab">title.joinmember</a></li>
</ul>
</div>
<div class="tab-content">
{}
{}
{}
{}
</div>
</div>
</div>
</div>"##,
        render_legacy_usermenu_project_entries(base_path, "recentlyVisited", recent_projects, true),
        render_legacy_usermenu_project_records(base_path, "watching", &[], false),
        render_legacy_usermenu_project_records(base_path, "createdByMe", &created_projects, false),
        render_legacy_usermenu_project_records(base_path, "joinmember", &joined_projects, false)
    )
}

fn render_legacy_usermenu_project_entries(
    base_path: &str,
    id: &str,
    projects: &[persistence::ProjectListEntry],
    active: bool,
) -> String {
    if projects.is_empty() {
        return render_legacy_usermenu_no_result(id, active);
    }

    let rows = projects
        .iter()
        .map(|project| {
            render_legacy_usermenu_project_item(
                base_path,
                &project.owner_name,
                &project.project_name,
                "",
                false,
            )
        })
        .collect::<Vec<_>>()
        .join("");
    render_legacy_usermenu_list(id, active, &rows)
}

fn render_legacy_usermenu_project_records(
    base_path: &str,
    id: &str,
    projects: &[persistence::WorkspaceMemberProjectRecord],
    active: bool,
) -> String {
    if projects.is_empty() {
        return render_legacy_usermenu_no_result(id, active);
    }

    let rows = projects
        .iter()
        .map(|project| {
            render_legacy_usermenu_project_item(
                base_path,
                &project.owner_name,
                &project.project_name,
                &project.project_scope,
                false,
            )
        })
        .collect::<Vec<_>>()
        .join("");
    render_legacy_usermenu_list(id, active, &rows)
}

fn render_legacy_usermenu_recent_issues(
    base_path: &str,
    recent_issues: &[WorkspaceIssueItem],
) -> String {
    format!(
        r#"<div>
<div class="search-result">
<div class="tab-pane myproject-list-wrap" >
<div class="group">
<input class="search-input project-search" type="text" id="query" autocomplete="off" placeholder="title.type.name">
<span class="bar"></span>
</div>
<div class="tab-content">
{}
</div>
</div>
</div>
</div>"#,
        render_legacy_usermenu_issue_entries(
            base_path,
            "recentlyVisitedIssues",
            recent_issues,
            true
        )
    )
}

fn render_legacy_usermenu_issue_entries(
    base_path: &str,
    id: &str,
    issues: &[WorkspaceIssueItem],
    active: bool,
) -> String {
    if issues.is_empty() {
        return render_legacy_usermenu_no_result(id, active);
    }

    let rows = issues
        .iter()
        .map(|issue| {
            let path = format!(
                "/{}/{}/issue/{}",
                issue.owner_name, issue.project_name, issue.issue_number
            );
            let href = base_path_href(base_path, &path);
            format!(
                r##"<li class="user-li " data-location="{}">
<div class="project-list project-flex-container" data-toggle='popover' data-trigger="hover" data-placement="right" data-content="#{}">
<div class="project-item project-item-container">
<div class="issue-item projectName-owner flex-item">
<div class="issue-title-start">-</div><div class="issue-title flex-item"><a href="{}">{}</a></div>
</div>
</div>
</div>
</li>"##,
                escape_html_attr(&href),
                issue.issue_number,
                escape_html_attr(&href),
                escape_html_text(&issue.title)
            )
        })
        .collect::<Vec<_>>()
        .join("");
    render_legacy_usermenu_list(id, active, &rows)
}

fn render_legacy_usermenu_project_item(
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    project_scope: &str,
    favored: bool,
) -> String {
    let path = format!("/{owner_name}/{project_name}");
    let href = base_path_href(base_path, &path);
    let lock_icon = if normalize_identifier(project_scope) == "private" {
        r#" <i class="yobicon-lock yobicon-small"></i>"#
    } else {
        ""
    };
    let star_class = if favored { "starred" } else { "" };
    format!(
        r#"<li class="user-li " data-location="{}">
<div class="project-list project-flex-container">
<div class="project-item project-item-container">
<div class="flex-item site-logo"><i class="project-avatar"><span class="dummy-25px"> </span></i></div>
<div class="projectName-owner flex-item">
<div class="project-name flex-item"><a href="{}">{}{}</a></div>
<div class="project-owner flex-item"><a href="{}">{}</a></div>
</div>
</div>
<div class="star-project flex-item" data-project-id="">
<i class="star {} material-icons">star</i>
</div>
</div>
</li>"#,
        escape_html_attr(&href),
        escape_html_attr(&href),
        escape_html_text(project_name),
        lock_icon,
        escape_html_attr(&base_path_href(base_path, &format!("/{owner_name}"))),
        escape_html_text(owner_name),
        star_class
    )
}

fn render_legacy_usermenu_no_result(id: &str, active: bool) -> String {
    format!(
        r#"<div id="{}" class="no-result tab-pane user-ul {}">title.no.results</div>"#,
        escape_html_attr(id),
        if active { "active" } else { "" }
    )
}

fn render_legacy_usermenu_list(id: &str, active: bool, rows: &str) -> String {
    format!(
        r#"<ul class="tab-pane user-ul {}" id="{}">
{}
</ul>"#,
        if active { "active" } else { "" },
        escape_html_attr(id),
        rows
    )
}

async fn direct_update_user_profile(
    headers: HeaderMap,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let body = RestUpdateProfileBody {
        avatar_attachment_id: form
            .get("avatarAttachmentId")
            .or_else(|| form.get("avatarId"))
            .cloned()
            .unwrap_or_default(),
        email: form.get("email").cloned().unwrap_or_default(),
        name: form.get("name").cloned().unwrap_or_default(),
    };
    let service = PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_update_profile(headers_with_form_csrf(headers, &form), body, service).await {
        Ok(_) => redirect_to(&base_path, "/user/editform"),
        Err(error) => error.into_response(),
    }
}

async fn direct_change_user_password(
    headers: HeaderMap,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let body = RestChangePasswordBody {
        login_id: form.get("loginId").cloned().unwrap_or_default(),
        old_password: form.get("oldPassword").cloned().unwrap_or_default(),
        password: form.get("password").cloned().unwrap_or_default(),
        retyped_password: form.get("retypedPassword").cloned().unwrap_or_default(),
    };
    let service = PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_change_password(headers, body, service).await {
        Ok(rest_response) => {
            let mut response =
                Redirect::to(&base_path_href(&base_path, "/users/loginform")).into_response();
            for value in rest_response.headers().get_all(SET_COOKIE) {
                response.headers_mut().append(SET_COOKIE, value.clone());
            }
            if let Some(csrf_token) = rest_response.headers().get("x-csrf-token") {
                response
                    .headers_mut()
                    .insert("x-csrf-token", csrf_token.clone());
            }
            response
        }
        Err(error) => error.into_response(),
    }
}

async fn direct_add_workspace_email(
    headers: HeaderMap,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let body = RestWorkspaceEmailBody {
        email: form.get("email").cloned().unwrap_or_default(),
    };
    let service = PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_add_workspace_email(headers_with_form_csrf(headers, &form), body, service).await {
        Ok(_) => redirect_to(&base_path, "/user/editform"),
        Err(error) => error.into_response(),
    }
}

async fn direct_reset_api_token_from_settings_form(
    headers: HeaderMap,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let service = PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_reset_api_token(headers_with_form_csrf(headers, &form), service).await {
        Ok(_) => redirect_to(&base_path, "/user/editform/token"),
        Err(error) => error.into_response(),
    }
}

async fn direct_delete_workspace_email(
    headers: HeaderMap,
    email_id: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let service = PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_delete_workspace_email(headers, email_id, service).await {
        Ok(_) => redirect_to(&base_path, "/user/editform"),
        Err(error) => error.into_response(),
    }
}

async fn direct_set_main_workspace_email(
    headers: HeaderMap,
    email_id: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let service = PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_set_main_workspace_email(headers, email_id, service).await {
        Ok(_) => redirect_to(&base_path, "/user/editform"),
        Err(error) => error.into_response(),
    }
}

async fn direct_send_workspace_email_validation(
    headers: HeaderMap,
    email_id: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Response {
    let login_redirect = base_path_href(
        &base_path,
        "/users/loginform?redirectUrl=%2Fuser%2Feditform%2Femails",
    );
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return Redirect::to(&login_redirect).into_response();
    };
    let Some(user_id) = session.user_id else {
        return Redirect::to(&login_redirect).into_response();
    };
    let valid_csrf = form
        .get("csrfToken")
        .map(|value| value.trim() == session.csrf_token)
        .unwrap_or(false);
    if !valid_csrf {
        return Redirect::to(&base_path_href(
            &base_path,
            "/user/editform/emails?validation=error",
        ))
        .into_response();
    }
    let Ok(email_id) = email_id.parse::<i64>() else {
        return Redirect::to(&base_path_href(
            &base_path,
            "/user/editform/emails?validation=error",
        ))
        .into_response();
    };

    let redirect_path = match &backend {
        PilotBackend::Repository(repository) => {
            if repository
                .send_workspace_email_validation_for_user(user_id, email_id)
                .await
                .is_ok()
            {
                if let Ok(Some((address, token))) = repository
                    .read_workspace_email_token_for_user(user_id, email_id)
                    .await
                {
                    let _ = send_workspace_email_validation_mail(
                        &address,
                        email_id,
                        &token,
                        &public_origin,
                        &base_path,
                    );
                }
                "/user/editform/emails?validation=sent"
            } else {
                "/user/editform/emails?validation=error"
            }
        }
        _ => "/user/editform/emails?validation=error",
    };

    Redirect::to(&base_path_href(&base_path, redirect_path)).into_response()
}

async fn direct_confirm_workspace_email(
    headers: HeaderMap,
    email_id: String,
    token: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let previous_session = session_manager.read_session_from_headers(&headers);
    let previous_token = previous_session
        .as_ref()
        .map(|session| session.token.as_str());
    let Ok(email_id) = email_id.parse::<i64>() else {
        return Redirect::to(&base_path_href(
            &base_path,
            "/user/editform/emails?confirmed=invalid",
        ))
        .into_response();
    };

    match &backend {
        PilotBackend::Repository(repository) => {
            match repository
                .confirm_workspace_email_for_user(email_id, &token)
                .await
            {
                Ok(Some(user_id)) => {
                    let authenticated_session = session_manager.create_authenticated_session(
                        previous_token,
                        user_id,
                        false,
                    );
                    let mut response = Redirect::to(&base_path_href(
                        &base_path,
                        "/user/editform/emails?confirmed=1",
                    ))
                    .into_response();
                    for cookie in session_manager.build_set_cookie_headers(&authenticated_session) {
                        response.headers_mut().append(
                            axum::http::header::SET_COOKIE,
                            cookie.parse().expect("set-cookie header"),
                        );
                    }
                    response
                }
                _ => Redirect::to(&base_path_href(
                    &base_path,
                    "/user/editform/emails?confirmed=invalid",
                ))
                .into_response(),
            }
        }
        _ => Redirect::to(&base_path_href(
            &base_path,
            "/user/editform/emails?confirmed=invalid",
        ))
        .into_response(),
    }
}

pub(crate) async fn direct_toggle_workspace_notification(
    headers: HeaderMap,
    project_id: i64,
    event_type: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    let body = RestWorkspaceNotificationBody {
        event_type,
        project_id: project_id.to_string(),
    };
    match rest_toggle_workspace_notification(headers, body, service).await {
        Ok(_) => StatusCode::OK.into_response(),
        Err(error) => error.into_response(),
    }
}

pub(crate) async fn rest_read_workspace_overview(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadWorkspaceOverviewRequest::default();
    let request = rest_owned_view::<ReadWorkspaceOverviewRequestView<'static>>(&request)?;
    let _request = request;
    let (payload, ctx) = workspace_overview_read(&service, Context::new(headers))
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_list_workspace_files(
    headers: HeaderMap,
    query: RestWorkspaceFilesQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestWorkspaceFilesResponse>, RestRouteError> {
    const WORKSPACE_FILES_PAGE_SIZE: u32 = 50;

    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "workspace files require repository backend",
        ));
    };
    let Some(session) = service.session_manager.read_session_from_headers(&headers) else {
        return Err(RestRouteError::from_connect_error(
            ConnectError::unauthenticated("missing authenticated session"),
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let page = query.page.or(query.page_num).unwrap_or(1).max(1);
    let filter = query.filter.unwrap_or_default();
    let files = repository
        .list_user_attachments(&actor.login_id, &filter, page, WORKSPACE_FILES_PAGE_SIZE)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?;

    Ok(Json(RestWorkspaceFilesResponse {
        files: files
            .attachments
            .iter()
            .map(|record| rest_workspace_file_item(record, &service.base_path))
            .collect(),
        filter: files.filter,
        page: files.page,
        page_size: files.page_size,
        total: files.total,
        total_pages: files.total_pages,
    }))
}

pub(crate) async fn rest_set_default_landing_path(
    headers: HeaderMap,
    body: RestDefaultLandingPathBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = SetDefaultLandingPathRequest {
        path: body.path,
        ..Default::default()
    };
    let request = rest_owned_view::<SetDefaultLandingPathRequestView<'static>>(&request)?;
    let (payload, ctx) =
        workspace_default_landing_path_set(&service, Context::new(headers), request)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_update_profile(
    headers: HeaderMap,
    body: RestUpdateProfileBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = UpdateProfileRequest {
        avatar_attachment_id: body.avatar_attachment_id,
        email: body.email,
        name: body.name,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateProfileRequestView<'static>>(&request)?;
    let (payload, ctx) = workspace_profile_update(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_change_password(
    headers: HeaderMap,
    body: RestChangePasswordBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ChangePasswordRequest {
        login_id: body.login_id,
        old_password: body.old_password,
        password: body.password,
        retyped_password: body.retyped_password,
        ..Default::default()
    };
    let request = rest_owned_view::<ChangePasswordRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .change_password(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_reset_visited_projects(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ResetVisitedProjectsRequest::default();
    let request = rest_owned_view::<ResetVisitedProjectsRequestView<'static>>(&request)?;
    let _request = request;
    let (payload, ctx) = workspace_visited_projects_reset(&service, Context::new(headers))
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_add_workspace_email(
    headers: HeaderMap,
    body: RestWorkspaceEmailBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = AddWorkspaceEmailRequest {
        email: body.email,
        ..Default::default()
    };
    let request = rest_owned_view::<AddWorkspaceEmailRequestView<'static>>(&request)?;
    let (payload, ctx) = workspace_email_add(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_delete_workspace_email(
    headers: HeaderMap,
    email_id: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = DeleteWorkspaceEmailRequest {
        id: email_id,
        ..Default::default()
    };
    let request = rest_owned_view::<DeleteWorkspaceEmailRequestView<'static>>(&request)?;
    let (payload, ctx) = workspace_email_delete(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_send_workspace_email_validation(
    headers: HeaderMap,
    email_id: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = SendWorkspaceEmailValidationRequest {
        id: email_id,
        ..Default::default()
    };
    let request = rest_owned_view::<SendWorkspaceEmailValidationRequestView<'static>>(&request)?;
    let (payload, ctx) = workspace_email_validation_send(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_set_main_workspace_email(
    headers: HeaderMap,
    email_id: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = SetMainWorkspaceEmailRequest {
        id: email_id,
        ..Default::default()
    };
    let request = rest_owned_view::<SetMainWorkspaceEmailRequestView<'static>>(&request)?;
    let (payload, ctx) = workspace_main_email_set(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_reset_api_token(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ResetApiTokenRequest::default();
    let request = rest_owned_view::<ResetApiTokenRequestView<'static>>(&request)?;
    let _request = request;
    let (payload, ctx) = workspace_api_token_reset(&service, Context::new(headers))
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_toggle_workspace_notification(
    headers: HeaderMap,
    body: RestWorkspaceNotificationBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ToggleWorkspaceNotificationRequest {
        event_type: body.event_type,
        project_id: body.project_id,
        ..Default::default()
    };
    let request = rest_owned_view::<ToggleWorkspaceNotificationRequestView<'static>>(&request)?;
    let (payload, ctx) = workspace_notification_toggle(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

fn rest_workspace_file_item(
    record: &persistence::UserAttachmentRecord,
    base_path: &str,
) -> RestWorkspaceFileItem {
    let url = base_path_href(base_path, &format!("/files/{}", record.id));
    let preview_url = if record.mime_type.starts_with("image/") {
        url.clone()
    } else {
        String::new()
    };
    let (location_href, location_label) = rest_workspace_file_location(record);

    RestWorkspaceFileItem {
        container_id: record.container_id,
        container_type: record.container_type.clone(),
        created_label: record.created_label.clone(),
        download_url: format!("{url}?action=download"),
        id: record.id,
        location_href,
        location_label,
        mime_type: record.mime_type.clone(),
        name: record.name.clone(),
        preview_url,
        size: record.size,
        size_label: human_readable_byte_count(record.size),
        url,
    }
}

fn rest_workspace_file_location(record: &persistence::UserAttachmentRecord) -> (String, String) {
    match normalize_identifier(&record.container_type).as_str() {
        "user" | "user_avatar" => (String::new(), String::new()),
        container_type => (
            String::new(),
            format!("{} #{}", container_type, record.container_id),
        ),
    }
}

fn human_readable_byte_count(size: i64) -> String {
    let size = size.max(0) as f64;
    if size < 1000.0 {
        return format!("{} B", size as i64);
    }

    let units = ["kB", "MB", "GB", "TB", "PB", "EB"];
    let mut value = size;
    let mut unit = units[0];
    for candidate in units {
        value /= 1000.0;
        unit = candidate;
        if value < 1000.0 {
            break;
        }
    }
    format!("{value:.1} {unit}")
}

pub(crate) async fn rest_record_recent_project_visit(
    headers: HeaderMap,
    body: RestRecentProjectVisitBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = RecordRecentProjectVisitRequest {
        owner_name: body.owner_name,
        project_name: body.project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<RecordRecentProjectVisitRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .record_recent_project_visit(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn legacy_external_favorite_projects(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("favorite projects require repository backend")
            .into_response();
    };
    let user_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, false)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };

    let favorite_projects = match repository
        .list_legacy_favorite_projects_for_user(user_id)
        .await
    {
        Ok(projects) => projects,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let project_ids: Vec<i64> = favorite_projects
        .iter()
        .map(|(project_id, _, _)| *project_id)
        .collect();
    let projects: Vec<_> = favorite_projects
        .into_iter()
        .map(|(project_id, owner_name, project_name)| {
            serde_json::json!({
                "projectId": project_id,
                "projectName": project_name,
                "owner": owner_name,
            })
        })
        .collect();

    Json(serde_json::json!({
        "projectIds": project_ids,
        "projects": projects,
    }))
    .into_response()
}

async fn legacy_external_toggle_favorite_project(
    headers: HeaderMap,
    project_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("favorite project requires repository backend")
            .into_response();
    };
    let user_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let project = match repository.read_project_by_id(project_id).await {
        Ok(Some(project)) => project,
        Ok(None) => return RestRouteError::not_found("project not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let authorization = match repository
        .read_project_authorization(&project.owner_name, &project.project_name, Some(user_id))
        .await
    {
        Ok(Some(authorization)) => authorization,
        Ok(None) => return RestRouteError::not_found("project not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let project_scope = match map_project_scope(&authorization.project.project_scope) {
        Ok(project_scope) => project_scope,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let can_read = authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous: false,
            is_guest: authorization.viewer.is_guest,
            is_organization_admin: authorization.viewer.is_organization_admin,
            is_organization_member: authorization.viewer.is_organization_member,
            is_project_manager: authorization.viewer.is_project_manager,
            is_project_member: authorization.viewer.is_project_member,
            is_site_admin: authorization.viewer.is_site_admin,
            project_scope,
        },
        ProjectOperation::Read,
    )
    .allowed;
    if !can_read {
        return RestRouteError::from_connect_error(ConnectError::permission_denied(
            "project read is not allowed",
        ))
        .into_response();
    }

    let result = match repository
        .toggle_favorite_project(user_id, &project.owner_name, &project.project_name)
        .await
    {
        Ok(result) => result,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "projectId": project_id.to_string(),
        "favored": result.favorited,
    }))
    .into_response()
}

async fn legacy_external_favorite_issues(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("favorite issues require repository backend")
            .into_response();
    };
    let user_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, false)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };

    let favorite_issues = match repository
        .list_legacy_favorite_issues_for_user(user_id)
        .await
    {
        Ok(issues) => issues,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let issue_ids: Vec<i64> = favorite_issues
        .iter()
        .map(|(issue_id, _, _)| *issue_id)
        .collect();
    let issues: Vec<_> = favorite_issues
        .into_iter()
        .map(|(issue_id, title, author_name)| {
            serde_json::json!({
                "issueId": issue_id,
                "issueTitle": title,
                "issueAuthorName": author_name,
            })
        })
        .collect();

    Json(serde_json::json!({
        "projectIds": issue_ids,
        "projects": issues,
    }))
    .into_response()
}

async fn legacy_external_toggle_favorite_issue(
    headers: HeaderMap,
    issue_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("favorite issue requires repository backend")
            .into_response();
    };
    let user_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let Some((owner_name, project_name, issue_number)) =
        (match repository.read_legacy_favorite_issue_target(issue_id).await {
            Ok(target) => target,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        })
    else {
        return RestRouteError::not_found("issue not found").into_response();
    };
    if let Err(error) = read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        Some(user_id),
    )
    .await
    {
        return RestRouteError::from_connect_error(error).into_response();
    }

    let result = match repository.toggle_favorite_issue(issue_id, user_id).await {
        Ok(result) => result,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "issueId": issue_id.to_string(),
        "favored": result.favorited,
        "message": if result.favorited {
            "Added as a favorite issue. See it on the My Issues page"
        } else {
            "Removed from favorite issues"
        },
    }))
    .into_response()
}

async fn legacy_external_favorite_organizations(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented(
            "favorite organizations require repository backend",
        )
        .into_response();
    };
    let user_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, false)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };

    let favorite_organizations = match repository
        .list_legacy_favorite_organizations_for_user(user_id)
        .await
    {
        Ok(organizations) => organizations,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let organization_ids: Vec<i64> = favorite_organizations
        .iter()
        .map(|(organization_id, _)| *organization_id)
        .collect();
    let organizations: Vec<_> = favorite_organizations
        .into_iter()
        .map(|(organization_id, organization_name)| {
            serde_json::json!({
                "organizationId": organization_id,
                "organizationName": organization_name,
            })
        })
        .collect();

    Json(serde_json::json!({
        "organizationIds": organization_ids,
        "organizations": organizations,
    }))
    .into_response()
}

async fn legacy_external_toggle_favorite_organization(
    headers: HeaderMap,
    organization_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented(
            "favorite organization requires repository backend",
        )
        .into_response();
    };
    let user_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let favored = match repository
        .toggle_favorite_organization(user_id, organization_id)
        .await
    {
        Ok(Some(favored)) => favored,
        Ok(None) => return RestRouteError::not_found("organization not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "organizationId": organization_id.to_string(),
        "favored": favored,
    }))
    .into_response()
}
