use crate::api_types::OwnedView;
use axum::{
    extract::{Form, Path, Query},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Redirect, Response},
    routing::{delete, get, patch, post, put},
    Json, Router,
};
use bcrypt::{hash, DEFAULT_COST};
use http::header::SET_COOKIE;
use std::collections::{HashMap, HashSet};

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
    send_workspace_email_validation_mail, session, verify_password, workspace_invalid_argument,
    ConnectError, Context, PilotBackend, PilotServiceImpl, RestRouteError,
    LEGACY_MIN_PASSWORD_LENGTH,
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

struct WorkspaceProjectCatalog {
    current_identity: HashMap<(String, String), i64>,
    previous_identity: HashMap<(String, String), i64>,
    projects_by_id: HashMap<i64, persistence::ProjectRecord>,
}

impl WorkspaceProjectCatalog {
    fn new(projects: Vec<persistence::ProjectRecord>) -> Self {
        let mut current_identity = HashMap::new();
        let mut previous_identity = HashMap::new();
        let mut projects_by_id = HashMap::new();

        for project in projects {
            current_identity.insert(
                workspace_project_identity(&project.owner_name, &project.project_name),
                project.id,
            );
            if let (Some(previous_owner_name), Some(previous_project_name)) = (
                project.previous_owner_name.as_deref(),
                project.previous_project_name.as_deref(),
            ) {
                previous_identity.insert(
                    workspace_project_identity(previous_owner_name, previous_project_name),
                    project.id,
                );
            }
            projects_by_id.insert(project.id, project);
        }

        Self {
            current_identity,
            previous_identity,
            projects_by_id,
        }
    }

    fn find_by_id(&self, project_id: i64) -> Option<&persistence::ProjectRecord> {
        self.projects_by_id.get(&project_id)
    }

    fn find_by_identity(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Option<&persistence::ProjectRecord> {
        let identity = workspace_project_identity(owner_name, project_name);
        self.current_identity
            .get(&identity)
            .or_else(|| self.previous_identity.get(&identity))
            .and_then(|project_id| self.projects_by_id.get(project_id))
    }

    fn projects(&self) -> impl Iterator<Item = &persistence::ProjectRecord> {
        self.projects_by_id.values()
    }
}

fn workspace_project_identity(owner_name: &str, project_name: &str) -> (String, String) {
    (
        normalize_identifier(owner_name),
        normalize_identifier(project_name),
    )
}

#[derive(Clone, Copy, Default)]
struct WorkspaceOrganizationAccess {
    is_admin: bool,
    is_member: bool,
}

struct WorkspaceProjectAccess {
    is_guest: bool,
    is_site_admin: bool,
    member_project_ids: HashSet<i64>,
    normalized_login_id: String,
    organizations: HashMap<i64, WorkspaceOrganizationAccess>,
}

impl WorkspaceProjectAccess {
    fn read_allowed(&self, project: &persistence::ProjectRecord) -> Result<bool, ConnectError> {
        let organization = project
            .organization_id
            .and_then(|organization_id| self.organizations.get(&organization_id))
            .copied()
            .unwrap_or_default();

        Ok(authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_guest: self.is_guest,
                is_organization_admin: organization.is_admin,
                is_organization_member: organization.is_member,
                is_project_manager: normalize_identifier(&project.owner_name)
                    == self.normalized_login_id,
                is_project_member: self.member_project_ids.contains(&project.id),
                is_site_admin: self.is_site_admin,
                project_scope: map_project_scope(&project.project_scope)?,
            },
            ProjectOperation::Read,
        )
        .allowed)
    }
}

async fn cached_workspace_project_logo_url(
    repository: &PilotRepository,
    base_path: &str,
    logo_urls: &mut HashMap<i64, String>,
    project_id: i64,
) -> Result<String, ConnectError> {
    if let Some(logo_url) = logo_urls.get(&project_id) {
        return Ok(logo_url.clone());
    }
    let logo_url = project_logo_url(repository, base_path, project_id).await?;
    logo_urls.insert(project_id, logo_url.clone());
    Ok(logo_url)
}

async fn workspace_project_item_from_catalog(
    repository: &PilotRepository,
    base_path: &str,
    logo_urls: &mut HashMap<i64, String>,
    project: &persistence::ProjectRecord,
    is_favorited: bool,
) -> Result<WorkspaceMemberProjectItem, ConnectError> {
    Ok(WorkspaceMemberProjectItem {
        created_at: project
            .created_date
            .map(|value| value.and_utc().to_rfc3339())
            .unwrap_or_default(),
        last_pushed_at: project
            .last_pushed_date
            .map(|value| value.and_utc().to_rfc3339())
            .unwrap_or_default(),
        is_favorited,
        logo_url: cached_workspace_project_logo_url(repository, base_path, logo_urls, project.id)
            .await?,
        owner_name: project.owner_name.clone(),
        overview: project.overview.clone().unwrap_or_default(),
        project_id: project.id,
        project_name: project.project_name.clone(),
        project_scope: project.project_scope.clone(),
        ..Default::default()
    })
}

async fn workspace_member_project_item_from_record(
    repository: &PilotRepository,
    base_path: &str,
    logo_urls: &mut HashMap<i64, String>,
    viewer_id: Option<i64>,
    viewer_login_id: &str,
    subject_user_id: i64,
    subject_login_id: &str,
    item: &persistence::WorkspaceMemberProjectRecord,
    is_favorited: bool,
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
        created_at: item
            .created_at
            .map(|value| value.and_utc().to_rfc3339())
            .unwrap_or_default(),
        is_favorited,
        is_watching,
        last_pushed_at: item
            .last_pushed_at
            .map(|value| value.and_utc().to_rfc3339())
            .unwrap_or_default(),
        logo_url: cached_workspace_project_logo_url(
            repository,
            base_path,
            logo_urls,
            item.project_id,
        )
        .await?,
        member_count: item.member_count,
        origin_owner_name: item.origin_owner_name.clone(),
        origin_project_name: item.origin_project_name.clone(),
        owner_name: item.owner_name.clone(),
        project_id: item.project_id,
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
        child_closed_count: record.child_closed_count,
        child_issues: record
            .child_issues
            .iter()
            .map(workspace_issue_child_item_from_record)
            .collect(),
        child_open_count: record.child_open_count,
        comment_count: record.comment_count,
        due_date_label: record.due_date_label.clone(),
        due_date_overdue: record.due_date_overdue,
        due_date_text: record.due_date_text.clone(),
        issue_number: record.issue_number,
        labels: record
            .labels
            .iter()
            .map(super::utils::issue_label_from_record)
            .collect(),
        milestone_id: record.milestone_id.unwrap_or_default(),
        milestone_title: record.milestone_title.clone(),
        owner_name: record.owner_name.clone(),
        parent_issue_number: record.parent_issue_number.unwrap_or_default(),
        parent_issue_title: record.parent_issue_title.clone(),
        project_name: record.project_name.clone(),
        state: record.state.clone(),
        title: record.title.clone(),
        updated_label: record.updated_label.clone(),
        ..Default::default()
    }
}

fn workspace_issue_child_item_from_record(
    record: &persistence::IssueChildRecord,
) -> WorkspaceIssueChildItem {
    WorkspaceIssueChildItem {
        assignee_label: record.assignee_label.clone(),
        comment_count: record.comment_count,
        created_label: record.created_label.clone(),
        id: record.id,
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

async fn workspace_project_items_from_ids(
    repository: &PilotRepository,
    base_path: &str,
    logo_urls: &mut HashMap<i64, String>,
    catalog: &WorkspaceProjectCatalog,
    access: &WorkspaceProjectAccess,
    project_ids: &[i64],
    favorite_project_ids: &HashSet<i64>,
) -> Result<Vec<WorkspaceMemberProjectItem>, ConnectError> {
    let mut projects = Vec::new();
    for project_id in project_ids {
        let Some(project) = catalog.find_by_id(*project_id) else {
            continue;
        };
        if access.read_allowed(project)? {
            projects.push(
                workspace_project_item_from_catalog(
                    repository,
                    base_path,
                    logo_urls,
                    project,
                    favorite_project_ids.contains(project_id),
                )
                .await?,
            );
        }
    }
    Ok(projects)
}

async fn workspace_member_project_items_from_records(
    repository: &PilotRepository,
    base_path: &str,
    logo_urls: &mut HashMap<i64, String>,
    catalog: &WorkspaceProjectCatalog,
    access: &WorkspaceProjectAccess,
    user_id: i64,
    login_id: &str,
    records: Vec<persistence::WorkspaceMemberProjectRecord>,
    favorite_project_ids: &HashSet<i64>,
) -> Result<Vec<WorkspaceMemberProjectItem>, ConnectError> {
    let mut projects = Vec::new();
    for record in records {
        let Some(project) = catalog
            .find_by_id(record.project_id)
            .or_else(|| catalog.find_by_identity(&record.owner_name, &record.project_name))
        else {
            continue;
        };
        if access.read_allowed(project)? {
            projects.push(
                workspace_member_project_item_from_record(
                    repository,
                    base_path,
                    logo_urls,
                    Some(user_id),
                    login_id,
                    user_id,
                    login_id,
                    &record,
                    favorite_project_ids.contains(&project.id),
                )
                .await?,
            );
        }
    }
    Ok(projects)
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

    Ok((profile, issue_items, pull_request_items))
}

pub(crate) async fn filter_workspace_issue_items_by_read_acl(
    repository: &PilotRepository,
    user_id: i64,
    items: Vec<persistence::WorkspaceIssueListItemRecord>,
) -> Result<Vec<WorkspaceIssueItem>, ConnectError> {
    filter_workspace_issue_items_by_read_acl_for_viewer(repository, Some(user_id), items).await
}

async fn filter_workspace_pull_request_items_by_read_acl(
    repository: &PilotRepository,
    user_id: i64,
    items: Vec<persistence::WorkspacePullRequestListItemRecord>,
) -> Result<Vec<WorkspacePullRequestItem>, ConnectError> {
    filter_workspace_pull_request_items_by_read_acl_for_viewer(repository, Some(user_id), items)
        .await
}

pub(crate) async fn filter_workspace_issue_items_by_read_acl_for_viewer(
    repository: &PilotRepository,
    viewer_id: Option<i64>,
    items: Vec<persistence::WorkspaceIssueListItemRecord>,
) -> Result<Vec<WorkspaceIssueItem>, ConnectError> {
    let mut visible = Vec::new();
    let access_results = futures::future::join_all(items.iter().map(|item| async {
        workspace_project_read_allowed_for_viewer(
            repository,
            viewer_id,
            &item.owner_name,
            &item.project_name,
        )
        .await
    }))
    .await;

    for (item, access_result) in items.iter().zip(access_results) {
        if access_result? {
            visible.push(workspace_issue_item_from_record(&item));
        }
    }

    Ok(visible)
}

pub(crate) async fn filter_workspace_pull_request_items_by_read_acl_for_viewer(
    repository: &PilotRepository,
    viewer_id: Option<i64>,
    items: Vec<persistence::WorkspacePullRequestListItemRecord>,
) -> Result<Vec<WorkspacePullRequestItem>, ConnectError> {
    let mut visible = Vec::new();
    let access_results = futures::future::join_all(items.iter().map(|item| async {
        workspace_project_read_allowed_for_viewer(
            repository,
            viewer_id,
            &item.owner_name,
            &item.project_name,
        )
        .await
    }))
    .await;

    for (item, access_result) in items.iter().zip(access_results) {
        if access_result? {
            visible.push(workspace_pull_request_item_from_record(&item));
        }
    }

    Ok(visible)
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
    let mut logo_urls = HashMap::new();
    let authorization_results = futures::future::join_all(items.iter().map(|item| async {
        repository
            .read_project_authorization(&item.owner_name, &item.project_name, viewer_id)
            .await
            .map_err(internal_error)
    }))
    .await;

    for (item, authorization_result) in items.iter().zip(authorization_results) {
        let Some(authorization) = authorization_result? else {
            continue;
        };
        if workspace_project_authorization_read_allowed(&authorization, viewer_id)? {
            visible.push(
                workspace_member_project_item_from_record(
                    repository,
                    base_path,
                    &mut logo_urls,
                    viewer_id,
                    viewer_login_id,
                    subject_user_id,
                    subject_login_id,
                    item,
                    authorization.is_favorited,
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

    workspace_project_authorization_read_allowed(&authorization, viewer_id)
}

fn workspace_project_authorization_read_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
    viewer_id: Option<i64>,
) -> Result<bool, ConnectError> {
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

fn workspace_project_name_cmp(
    left: &WorkspaceMemberProjectItem,
    right: &WorkspaceMemberProjectItem,
) -> std::cmp::Ordering {
    left.project_name
        .to_lowercase()
        .cmp(&right.project_name.to_lowercase())
        .then_with(|| left.project_name.cmp(&right.project_name))
        .then_with(|| left.project_id.cmp(&right.project_id))
}

async fn load_workspace_sidebar_organizations(
    repository: &PilotRepository,
    base_path: &str,
    logo_urls: &mut HashMap<i64, String>,
    catalog: &WorkspaceProjectCatalog,
    access: &WorkspaceProjectAccess,
    organizations_by_id: &HashMap<i64, persistence::OrganizationRecord>,
    favorite_organization_ids: &[i64],
    favorite_project_ids: &HashSet<i64>,
) -> Result<
    (
        Vec<WorkspaceMemberProjectItem>,
        Vec<WorkspaceSidebarOrganizationItem>,
        Vec<WorkspaceSidebarOrganizationItem>,
    ),
    ConnectError,
> {
    let mut own_projects = Vec::new();
    for project in catalog.projects() {
        if normalize_identifier(&project.owner_name) == access.normalized_login_id
            && access.read_allowed(project)?
        {
            own_projects.push(
                workspace_project_item_from_catalog(
                    repository,
                    base_path,
                    logo_urls,
                    project,
                    favorite_project_ids.contains(&project.id),
                )
                .await?,
            );
        }
    }
    own_projects.sort_by(workspace_project_name_cmp);

    let regular_organization_ids = catalog
        .projects()
        .filter(|project| favorite_project_ids.contains(&project.id))
        .filter_map(|project| project.organization_id)
        .collect::<HashSet<_>>();
    let mut projects_by_organization = HashMap::<i64, Vec<_>>::new();
    for project in catalog.projects() {
        if let Some(organization_id) = project.organization_id {
            projects_by_organization
                .entry(organization_id)
                .or_default()
                .push(project);
        }
    }

    let mut favorite_organization_id_set = HashSet::new();
    let mut favorite_organizations = Vec::new();
    for organization_id in favorite_organization_ids {
        if !favorite_organization_id_set.insert(*organization_id) {
            continue;
        }
        let Some(organization) = organizations_by_id.get(organization_id) else {
            continue;
        };
        favorite_organizations.push(
            workspace_sidebar_organization_item(
                repository,
                base_path,
                logo_urls,
                access,
                organization,
                projects_by_organization
                    .remove(organization_id)
                    .unwrap_or_default(),
                favorite_project_ids,
                true,
            )
            .await?,
        );
    }

    let mut regular_organization_records = regular_organization_ids
        .into_iter()
        .filter(|organization_id| !favorite_organization_id_set.contains(organization_id))
        .filter_map(|organization_id| organizations_by_id.get(&organization_id))
        .collect::<Vec<_>>();
    regular_organization_records.sort_by(|left, right| {
        left.organization_name
            .to_lowercase()
            .cmp(&right.organization_name.to_lowercase())
            .then_with(|| left.organization_name.cmp(&right.organization_name))
    });

    let mut organizations = Vec::new();
    for organization in regular_organization_records {
        let organization_id = organization.id;
        organizations.push(
            workspace_sidebar_organization_item(
                repository,
                base_path,
                logo_urls,
                access,
                organization,
                projects_by_organization
                    .remove(&organization_id)
                    .unwrap_or_default(),
                favorite_project_ids,
                false,
            )
            .await?,
        );
    }

    Ok((own_projects, favorite_organizations, organizations))
}

async fn workspace_sidebar_organization_item(
    repository: &PilotRepository,
    base_path: &str,
    logo_urls: &mut HashMap<i64, String>,
    access: &WorkspaceProjectAccess,
    organization: &persistence::OrganizationRecord,
    projects: Vec<&persistence::ProjectRecord>,
    favorite_project_ids: &HashSet<i64>,
    is_favorited: bool,
) -> Result<WorkspaceSidebarOrganizationItem, ConnectError> {
    let organization_access = access
        .organizations
        .get(&organization.id)
        .copied()
        .unwrap_or_default();
    let project_count = (organization_access.is_admin || access.is_site_admin)
        .then_some(u32::try_from(projects.len()).unwrap_or(u32::MAX));
    let mut visible_projects = Vec::new();
    for project in projects {
        if access.read_allowed(project)? {
            visible_projects.push(
                workspace_project_item_from_catalog(
                    repository,
                    base_path,
                    logo_urls,
                    project,
                    favorite_project_ids.contains(&project.id),
                )
                .await?,
            );
        }
    }
    visible_projects.sort_by(workspace_project_name_cmp);

    Ok(WorkspaceSidebarOrganizationItem {
        is_favorited,
        organization_id: organization.id,
        organization_name: organization.organization_name.clone(),
        project_count,
        projects: visible_projects,
    })
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
    let favorite_project_id_list = repository
        .list_favorite_project_ids_for_user(user_id)
        .await
        .map_err(internal_error)?;
    let favorite_project_ids = favorite_project_id_list
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    let recent_project_ids = repository
        .list_recent_project_ids_for_user(user_id)
        .await
        .map_err(internal_error)?;
    let favorite_organization_ids = repository
        .list_favorite_organization_ids_for_user(user_id)
        .await
        .map_err(internal_error)?;
    let member_project_records = repository
        .list_member_projects_for_user(user_id)
        .await
        .map_err(internal_error)?;
    let seed_project_ids = favorite_project_id_list
        .iter()
        .chain(recent_project_ids.iter())
        .copied()
        .chain(
            member_project_records
                .iter()
                .map(|project| project.project_id),
        )
        .collect::<Vec<_>>();
    let mut catalog_projects = repository
        .list_workspace_project_catalog(&seed_project_ids, Some(&response.login_id), &[])
        .await
        .map_err(internal_error)?;
    let mut sidebar_organization_ids = favorite_organization_ids
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    for project in &catalog_projects {
        if favorite_project_ids.contains(&project.id) {
            if let Some(organization_id) = project.organization_id {
                sidebar_organization_ids.insert(organization_id);
            }
        }
    }
    let sidebar_organization_id_list = sidebar_organization_ids.iter().copied().collect::<Vec<_>>();
    catalog_projects.extend(
        repository
            .list_workspace_project_catalog(&[], None, &sidebar_organization_id_list)
            .await
            .map_err(internal_error)?,
    );
    let catalog = WorkspaceProjectCatalog::new(catalog_projects);
    let member_project_ids = member_project_records
        .iter()
        .filter_map(|project| {
            catalog
                .find_by_id(project.project_id)
                .or_else(|| catalog.find_by_identity(&project.owner_name, &project.project_name))
                .map(|project| project.id)
        })
        .collect::<HashSet<_>>();
    let relevant_organization_ids = favorite_organization_ids
        .iter()
        .copied()
        .chain(
            catalog
                .projects()
                .filter_map(|project| project.organization_id),
        )
        .collect::<HashSet<_>>();
    let relevant_organization_id_list = relevant_organization_ids
        .iter()
        .copied()
        .collect::<Vec<_>>();
    let mut organizations_by_id = HashMap::new();
    let mut organization_access = HashMap::new();
    for (organization, role_name) in repository
        .list_workspace_organizations_for_user(user_id, &relevant_organization_id_list)
        .await
        .map_err(internal_error)?
    {
        let role_name = normalize_identifier(&role_name);
        let is_admin = role_name == "org_admin";
        organization_access.insert(
            organization.id,
            WorkspaceOrganizationAccess {
                is_admin,
                is_member: is_admin || role_name == "org_member",
            },
        );
        organizations_by_id.insert(organization.id, organization);
    }
    let normalized_login_id = normalize_identifier(&response.login_id);
    let access = WorkspaceProjectAccess {
        is_guest: response.is_guest,
        is_site_admin: response.is_site_admin,
        member_project_ids,
        normalized_login_id,
        organizations: organization_access,
    };

    let (profile, issue_items, pull_request_items) =
        load_workspace_dashboard_data(repository, user_id, base_path).await?;
    let mut logo_urls = HashMap::new();
    let member_projects = workspace_member_project_items_from_records(
        repository,
        base_path,
        &mut logo_urls,
        &catalog,
        &access,
        user_id,
        &response.login_id,
        member_project_records,
        &favorite_project_ids,
    )
    .await?;
    let favorite_projects = workspace_project_items_from_ids(
        repository,
        base_path,
        &mut logo_urls,
        &catalog,
        &access,
        &favorite_project_id_list,
        &favorite_project_ids,
    )
    .await?;
    let recent_projects = workspace_project_items_from_ids(
        repository,
        base_path,
        &mut logo_urls,
        &catalog,
        &access,
        &recent_project_ids,
        &favorite_project_ids,
    )
    .await?;
    let (api_token, emails, watched_projects) =
        load_workspace_settings_data(repository, user_id).await?;
    let (own_projects, favorite_organizations, organizations) =
        load_workspace_sidebar_organizations(
            repository,
            base_path,
            &mut logo_urls,
            &catalog,
            &access,
            &organizations_by_id,
            &favorite_organization_ids,
            &favorite_project_ids,
        )
        .await?;

    Ok(ReadWorkspaceOverviewResponse {
        api_token,
        days_ago: WORKSPACE_DAYS_AGO,
        default_landing_path: response.default_landing_path.clone(),
        emails,
        favorite_projects,
        favorite_organizations,
        issue_items,
        member_projects,
        organizations,
        own_projects,
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
    if matches!(
        verify_password(
            &request.old_password,
            &user.password_hash,
            user.password_salt.as_deref(),
        ),
        crate::PasswordVerification::NoMatch
    ) {
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
            "/api/v1/user/favorites/projects",
            get(move |headers: HeaderMap| {
                let service = legacy_favorite_projects_list_service.clone();
                async move { legacy_external_favorite_projects(headers, service).await }
            }),
        )
        .route(
            "/api/v1/user/favorites/projects/{project_id}",
            post(move |headers: HeaderMap, Path(project_id): Path<i64>| {
                let service = legacy_favorite_project_toggle_service.clone();
                async move {
                    legacy_external_toggle_favorite_project(headers, project_id, service).await
                }
            }),
        )
        .route(
            "/api/v1/user/favorites/issues",
            get(move |headers: HeaderMap| {
                let service = legacy_favorite_issues_list_service.clone();
                async move { legacy_external_favorite_issues(headers, service).await }
            }),
        )
        .route(
            "/api/v1/user/favorites/issues/{issue_id}",
            post(move |headers: HeaderMap, Path(issue_id): Path<i64>| {
                let service = legacy_favorite_issue_toggle_service.clone();
                async move { legacy_external_toggle_favorite_issue(headers, issue_id, service).await }
            }),
        )
        .route(
            "/api/v1/user/favorites/organizations",
            get(move |headers: HeaderMap| {
                let service = legacy_favorite_organizations_list_service.clone();
                async move { legacy_external_favorite_organizations(headers, service).await }
            }),
        )
        .route(
            "/api/v1/user/favorites/organizations/{organization_id}",
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
            "/api/v1/user/default-login-page",
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
