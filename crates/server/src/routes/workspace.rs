use crate::api_types::OwnedView;
use axum::{
    extract::{Form, Path, Query},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Redirect, Response},
    routing::{delete, get, patch, post, put},
    Json, Router,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use http::header::SET_COOKIE;
use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use yoram_domain::{
    authorize_project_access, normalize_default_landing_path, ProjectAccessFacts, ProjectOperation,
    ProjectScope,
};

use crate::api_types::*;
use crate::persistence::{self, PilotRepository};
use crate::{
    anonymous_current_session_response, attach_session_headers, base_path_href, gravatar_url,
    headers_with_form_csrf, internal_error, normalize_identifier, project_logo_url, redirect_to,
    require_authenticated_user, require_session, require_valid_csrf,
    resolve_current_session_response, rest_json_response, rest_owned_view,
    send_workspace_email_validation_mail, session, workspace_invalid_argument, ConnectError,
    Context, PilotBackend, PilotServiceImpl, RestRouteError, LEGACY_MIN_PASSWORD_LENGTH,
};

use super::rest_delete_project_member;

mod legacy_favorites;
mod sidebar;

use legacy_favorites::{
    legacy_external_favorite_issues, legacy_external_favorite_organizations,
    legacy_external_favorite_projects, legacy_external_toggle_favorite_issue,
    legacy_external_toggle_favorite_organization, legacy_external_toggle_favorite_project,
};
use sidebar::{direct_user_menu_tab_content_list, direct_user_sidebar, DirectUserSidebarQuery};

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

fn workspace_project_item_from_entry(
    item: &persistence::ProjectListEntry,
) -> WorkspaceMemberProjectItem {
    WorkspaceMemberProjectItem {
        owner_name: item.owner_name.clone(),
        project_name: item.project_name.clone(),
        ..Default::default()
    }
}

async fn workspace_member_project_item_from_record(
    repository: &PilotRepository,
    base_path: &str,
    viewer_id: Option<i64>,
    viewer_login_id: &str,
    subject_user_id: i64,
    subject_login_id: &str,
    item: &persistence::WorkspaceMemberProjectRecord,
) -> Result<WorkspaceMemberProjectItem, ConnectError> {
    let is_watching = match viewer_id {
        Some(user_id) => repository
            .is_watching_project(user_id, item.project_id)
            .await
            .map_err(internal_error)?,
        None => false,
    };
    let viewer_is_project_owner = !viewer_login_id.is_empty() && viewer_login_id == item.owner_name;
    let project_is_public = normalize_identifier(&item.project_scope) == "public";
    let viewer_can_watch =
        viewer_id.is_some() && !viewer_is_project_owner && (is_watching || project_is_public);
    let viewer_can_leave =
        viewer_id == Some(subject_user_id) && subject_login_id != item.owner_name;

    Ok(WorkspaceMemberProjectItem {
        created_label: item.created_label.clone(),
        is_watching,
        last_pushed_label: item.last_pushed_label.clone(),
        logo_url: project_logo_url(repository, base_path, item.project_id).await?,
        member_count: item.member_count,
        origin_owner_name: item.origin_owner_name.clone(),
        origin_project_name: item.origin_project_name.clone(),
        owner_name: item.owner_name.clone(),
        project_name: item.project_name.clone(),
        overview: item.overview.clone(),
        project_scope: item.project_scope.clone(),
        viewer_can_leave,
        viewer_can_watch,
        watch_count: item.watch_count,
        ..Default::default()
    })
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
        assignee_login_id: record.assignee_login_id.clone(),
        author_label: record.author_label.clone(),
        author_login_id: record.author_login_id.clone(),
        comment_count: record.comment_count,
        issue_number: record.issue_number,
        labels: record
            .labels
            .iter()
            .map(super::utils::issue_label_from_record)
            .collect(),
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
        contributor_login_id: record.contributor_login_id.clone(),
        owner_name: record.owner_name.clone(),
        project_name: record.project_name.clone(),
        pull_request_number: record.pull_request_number,
        receiver_label: record.receiver_label.clone(),
        receiver_login_id: record.receiver_login_id.clone(),
        state: record.state.clone(),
        title: record.title.clone(),
        updated_label: record.updated_label.clone(),
        ..Default::default()
    }
}

async fn load_workspace_project_lists(
    repository: &PilotRepository,
    user_id: i64,
) -> Result<
    (
        Vec<WorkspaceMemberProjectItem>,
        Vec<WorkspaceMemberProjectItem>,
    ),
    ConnectError,
> {
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
    let mut subject_login_id = String::new();
    let profile = match repository
        .read_workspace_profile_for_user(user_id)
        .await
        .map_err(internal_error)?
    {
        Some(record) => {
            subject_login_id = record.login_id.clone();
            Some(workspace_profile_from_record(
                &record,
                workspace_avatar_url(
                    repository,
                    user_id,
                    &record.primary_email_address,
                    base_path,
                )
                .await?,
            ))
        }
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
    let member_projects = filter_workspace_member_projects_by_read_acl(
        repository,
        base_path,
        user_id,
        &subject_login_id,
        member_projects,
    )
    .await?;

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
    base_path: &str,
    user_id: i64,
    subject_login_id: &str,
    items: Vec<persistence::WorkspaceMemberProjectRecord>,
) -> Result<Vec<WorkspaceMemberProjectItem>, ConnectError> {
    filter_workspace_member_projects_by_read_acl_for_viewer(
        repository,
        base_path,
        Some(user_id),
        subject_login_id,
        user_id,
        subject_login_id,
        items,
    )
    .await
}

pub(crate) async fn filter_workspace_member_projects_by_read_acl_for_viewer(
    repository: &PilotRepository,
    base_path: &str,
    viewer_id: Option<i64>,
    viewer_login_id: &str,
    subject_user_id: i64,
    subject_login_id: &str,
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
            visible.push(
                workspace_member_project_item_from_record(
                    repository,
                    base_path,
                    viewer_id,
                    viewer_login_id,
                    subject_user_id,
                    subject_login_id,
                    &item,
                )
                .await?,
            );
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

pub(crate) async fn workspace_password_change(
    service: &PilotServiceImpl,
    mut ctx: Context,
    request: OwnedView<ChangePasswordRequestView<'static>>,
) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
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
    let user = repository
        .find_user_by_id(user_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::unauthenticated("missing authenticated session"))?;
    if normalize_identifier(&request.login_id) != user.login_id {
        return Err(workspace_invalid_argument("user.wrongloginId.alert"));
    }
    if !verify(&request.old_password, &user.password_hash).map_err(internal_error)? {
        return Err(workspace_invalid_argument("user.wrongPassword.alert"));
    }
    if request.password.len() < LEGACY_MIN_PASSWORD_LENGTH {
        return Err(workspace_invalid_argument("validation.tooShortPassword"));
    }
    if request.password != request.retyped_password {
        return Err(workspace_invalid_argument("validation.passwordMismatch"));
    }
    let password_hash = hash(&request.password, DEFAULT_COST).map_err(internal_error)?;
    repository
        .update_password_hash_for_user(user_id, &password_hash)
        .await
        .map_err(internal_error)?;

    let anonymous_session = service
        .session_manager
        .create_anonymous_session(Some(&session.token));
    attach_session_headers(&mut ctx, &service.session_manager, &anonymous_session);
    Ok((anonymous_current_session_response(), ctx))
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
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let login_redirect = base_path_href(
        &base_path,
        "/users/loginform?redirectUrl=%2Fuser%2Feditform",
    );
    let Some(session) = service.session_manager.read_session_from_headers(&headers) else {
        return Redirect::to(&login_redirect).into_response();
    };
    let Some(user_id) = session.user_id else {
        return Redirect::to(&login_redirect).into_response();
    };
    let PilotBackend::Repository(repository) = &service.backend else {
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

pub(crate) fn routes(service: PilotServiceImpl, site_name: String) -> Router {
    let reset_visited_service = service.clone();
    let default_login_page_service = service.clone();
    let legacy_default_login_page_service = service.clone();
    let user_sidebar_service = service.clone();
    let user_sidebar_site_name = site_name;
    let usermenu_tab_service = service.clone();
    let update_profile_service = service.clone();
    let change_user_password_service = service.clone();
    let add_workspace_email_service = service.clone();
    let reset_api_token_service = service.clone();
    let delete_email_service = service.clone();
    let set_main_email_service = service.clone();
    let send_validation_service = service.clone();
    let confirm_email_service = service.clone();
    let info_leave_service = service.clone();
    let legacy_favorite_projects_list_service = service.clone();
    let legacy_favorite_project_toggle_service = service.clone();
    let legacy_favorite_issues_list_service = service.clone();
    let legacy_favorite_issue_toggle_service = service.clone();
    let legacy_favorite_organizations_list_service = service.clone();
    let legacy_favorite_organization_toggle_service = service.clone();

    Router::new()
        .route(
            "/-_-api/v1/favoriteProjects",
            get(move |headers: HeaderMap| {
                let service = legacy_favorite_projects_list_service.clone();
                async move { legacy_external_favorite_projects(headers, service).await }
            }),
        )
        .route(
            "/-_-api/v1/favoriteProjects/{project_id}",
            post(move |headers: HeaderMap, Path(project_id): Path<i64>| {
                let service = legacy_favorite_project_toggle_service.clone();
                async move {
                    legacy_external_toggle_favorite_project(headers, project_id, service).await
                }
            }),
        )
        .route(
            "/-_-api/v1/favoriteIssues",
            get(move |headers: HeaderMap| {
                let service = legacy_favorite_issues_list_service.clone();
                async move { legacy_external_favorite_issues(headers, service).await }
            }),
        )
        .route(
            "/-_-api/v1/favoriteIssues/{issue_id}",
            post(move |headers: HeaderMap, Path(issue_id): Path<i64>| {
                let service = legacy_favorite_issue_toggle_service.clone();
                async move { legacy_external_toggle_favorite_issue(headers, issue_id, service).await }
            }),
        )
        .route(
            "/-_-api/v1/favoriteOrganizations",
            get(move |headers: HeaderMap| {
                let service = legacy_favorite_organizations_list_service.clone();
                async move { legacy_external_favorite_organizations(headers, service).await }
            }),
        )
        .route(
            "/-_-api/v1/favoriteOrganizations/{organization_id}",
            post(
                move |headers: HeaderMap, Path(organization_id): Path<i64>| {
                    let service = legacy_favorite_organization_toggle_service.clone();
                    async move {
                        legacy_external_toggle_favorite_organization(headers, organization_id, service).await
                    }
                },
            ),
        )
        .route(
            "/user/sidebar",
            axum::routing::get(
                move |headers: HeaderMap, Query(query): Query<DirectUserSidebarQuery>| {
                    let service = user_sidebar_service.clone();
                    let site_name = user_sidebar_site_name.clone();
                    async move { direct_user_sidebar(headers, query, service, site_name).await }
                },
            ),
        )
        .route(
            "/user/usermenuTabContentList",
            axum::routing::get(move |headers: HeaderMap| {
                let service = usermenu_tab_service.clone();
                async move { direct_user_menu_tab_content_list(headers, service).await }
            }),
        )
        .route(
            "/user/edit",
            post(move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_update_user_profile(
                        headers,
                        form,
                        update_profile_service.clone(),
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
                        change_user_password_service.clone(),
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
                        add_workspace_email_service.clone(),
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
                        reset_api_token_service.clone(),
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
                        delete_email_service.clone(),
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
                        set_main_email_service.clone(),
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
                            send_validation_service.clone(),
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
                            confirm_email_service.clone(),
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
                            info_leave_service.clone(),
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
                        reset_visited_service.clone(),
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
                        default_login_page_service.clone(),
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
                        legacy_default_login_page_service.clone(),
                    )
                    .await
                }
            }),
        )
}

async fn direct_reset_user_visited_list(headers: HeaderMap, service: PilotServiceImpl) -> Response {
    let base_path = service.base_path.clone();
    let login_redirect = base_path_href(
        &base_path,
        "/users/loginform?redirectUrl=%2Fuser%2Feditform",
    );
    let Some(session) = service.session_manager.read_session_from_headers(&headers) else {
        return Redirect::to(&login_redirect).into_response();
    };
    let Some(user_id) = session.user_id else {
        return Redirect::to(&login_redirect).into_response();
    };

    match &service.backend {
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
    service: PilotServiceImpl,
) -> Response {
    let Some(session) = service.session_manager.read_session_from_headers(&headers) else {
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

    match &service.backend {
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

async fn direct_update_user_profile(
    headers: HeaderMap,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let body = RestUpdateProfileBody {
        avatar_attachment_id: form
            .get("avatarAttachmentId")
            .or_else(|| form.get("avatarId"))
            .cloned()
            .unwrap_or_default(),
        email: form.get("email").cloned().unwrap_or_default(),
        name: form.get("name").cloned().unwrap_or_default(),
    };
    match rest_update_profile(headers_with_form_csrf(headers, &form), body, service).await {
        Ok(_) => redirect_to(&base_path, "/user/editform"),
        Err(error) => error.into_response(),
    }
}

async fn direct_change_user_password(
    headers: HeaderMap,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let body = RestChangePasswordBody {
        login_id: form.get("loginId").cloned().unwrap_or_default(),
        old_password: form.get("oldPassword").cloned().unwrap_or_default(),
        password: form.get("password").cloned().unwrap_or_default(),
        retyped_password: form.get("retypedPassword").cloned().unwrap_or_default(),
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
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let body = RestWorkspaceEmailBody {
        email: form.get("email").cloned().unwrap_or_default(),
    };
    match rest_add_workspace_email(headers_with_form_csrf(headers, &form), body, service).await {
        Ok(_) => redirect_to(&base_path, "/user/editform"),
        Err(error) => error.into_response(),
    }
}

async fn direct_reset_api_token_from_settings_form(
    headers: HeaderMap,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_reset_api_token(headers_with_form_csrf(headers, &form), service).await {
        Ok(_) => redirect_to(&base_path, "/user/editform/token"),
        Err(error) => error.into_response(),
    }
}

async fn direct_delete_workspace_email(
    headers: HeaderMap,
    email_id: String,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_delete_workspace_email(headers, email_id, service).await {
        Ok(_) => redirect_to(&base_path, "/user/editform"),
        Err(error) => error.into_response(),
    }
}

async fn direct_set_main_workspace_email(
    headers: HeaderMap,
    email_id: String,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    match rest_set_main_workspace_email(headers, email_id, service).await {
        Ok(_) => redirect_to(&base_path, "/user/editform"),
        Err(error) => error.into_response(),
    }
}

async fn direct_send_workspace_email_validation(
    headers: HeaderMap,
    email_id: String,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let public_origin = service.public_origin.clone();
    let login_redirect = base_path_href(
        &base_path,
        "/users/loginform?redirectUrl=%2Fuser%2Feditform%2Femails",
    );
    let Some(session) = service.session_manager.read_session_from_headers(&headers) else {
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
    let redirect_path = match &service.backend {
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
                        &service.smtp.default_from(),
                        &service.integrations,
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
    service: PilotServiceImpl,
) -> Response {
    let base_path = service.base_path.clone();
    let previous_session = service.session_manager.read_session_from_headers(&headers);
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

    match &service.backend {
        PilotBackend::Repository(repository) => {
            match repository
                .confirm_workspace_email_for_user(email_id, &token)
                .await
            {
                Ok(Some(user_id)) => {
                    let authenticated_session = service
                        .session_manager
                        .create_authenticated_session(previous_token, user_id, false);
                    let mut response = Redirect::to(&base_path_href(
                        &base_path,
                        "/user/editform/emails?confirmed=1",
                    ))
                    .into_response();
                    for cookie in service
                        .session_manager
                        .build_set_cookie_headers(&authenticated_session)
                    {
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
    service: PilotServiceImpl,
) -> Response {
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

async fn rest_list_workspace_files(
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
    let mut file_items = Vec::with_capacity(files.attachments.len());
    for record in &files.attachments {
        file_items.push(
            rest_workspace_file_item(record, repository, &service.base_path)
                .await
                .map_err(|error| RestRouteError::internal(error.to_string()))?,
        );
    }

    Ok(Json(RestWorkspaceFilesResponse {
        files: file_items,
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
    let (payload, ctx) = workspace_password_change(&service, Context::new(headers), request)
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

async fn rest_workspace_file_item(
    record: &persistence::UserAttachmentRecord,
    repository: &persistence::PilotRepository,
    base_path: &str,
) -> Result<RestWorkspaceFileItem, sea_orm::DbErr> {
    let url = base_path_href(base_path, &format!("/files/{}", record.id));
    let preview_url = if record.mime_type.starts_with("image/") {
        url.clone()
    } else {
        String::new()
    };
    let (location_href, location_label) =
        rest_workspace_file_location(record, repository, base_path).await?;

    Ok(RestWorkspaceFileItem {
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
    })
}

async fn rest_workspace_file_location(
    record: &persistence::UserAttachmentRecord,
    repository: &persistence::PilotRepository,
    base_path: &str,
) -> Result<(String, String), sea_orm::DbErr> {
    match normalize_identifier(&record.container_type).as_str() {
        "user" | "user_avatar" => Ok((String::new(), String::new())),
        container_type => {
            let Some(route_path) = repository
                .read_attachment_location_path(&record.container_type, record.container_id)
                .await?
            else {
                return Ok((
                    String::new(),
                    format!("{} #{}", container_type, record.container_id),
                ));
            };
            Ok((base_path_href(base_path, &route_path), route_path))
        }
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
