use axum::{http::HeaderMap, Json};
use serde::{Deserialize, Serialize};

use crate::routes::utils::gravatar_url;
use crate::{
    base_path_href, internal_error, organization_logo_url, persistence, require_project_read,
    ConnectError, ErrorCode, PilotBackend, PilotRepository, PilotServiceImpl,
    RestIssueAssignableUsersQuery, RestRouteError,
};

use super::{project_issue_form_logo_url, read_issue_access};

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct RestIssueParentOptionsQuery {
    current_issue_number: Option<i64>,
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
pub(super) struct RestIssueParentOptionsResponse {
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
pub(super) struct RestIssueAssignableUsersResponse {
    items: Vec<RestIssueAssignableUserItem>,
    total: u32,
    truncated: bool,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct RestProjectIssueSearchUsersQuery {
    role: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectIssueSearchUserItem {
    avatar_url: String,
    display_name: String,
    login_id: String,
    pure_name_only: String,
    user_id: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectIssueSearchUsersResponse {
    items: Vec<RestProjectIssueSearchUserItem>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct RestIssueMentionUsersQuery {
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
pub(super) struct RestIssueMentionUsersResponse {
    items: Vec<RestIssueMentionUserItem>,
    total: u32,
    truncated: bool,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct RestProjectIssueReferencesQuery {
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
pub(super) struct RestProjectIssueReferencesResponse {
    items: Vec<RestProjectIssueReferenceItem>,
    total: u32,
    truncated: bool,
}

pub(super) async fn rest_list_issue_parent_options(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestIssueParentOptionsQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueParentOptionsResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid issue parent options request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "issue parent options require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
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

async fn enrich_rest_issue_mention_avatars(
    repository: &PilotRepository,
    project: &persistence::ProjectRecord,
    base_path: &str,
    response: &mut RestIssueMentionUsersResponse,
) -> Result<(), RestRouteError> {
    let login_ids = response
        .items
        .iter()
        .filter(|item| item.r#type == "user")
        .map(|item| item.login_id.clone())
        .collect::<Vec<_>>();
    let avatar_inputs = repository
        .list_mention_user_avatar_inputs(&login_ids)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    for item in &mut response.items {
        match item.r#type.as_str() {
            "user" => {
                item.avatar_url = avatar_inputs
                    .get(&item.login_id)
                    .map(|(email, attachment_id)| {
                        attachment_id.map_or_else(
                            || gravatar_url(email),
                            |attachment_id| {
                                base_path_href(base_path, &format!("/files/{attachment_id}"))
                            },
                        )
                    })
                    .unwrap_or_else(|| gravatar_url(""));
            }
            "project" => {
                item.avatar_url = project_issue_form_logo_url(repository, base_path, project.id)
                    .await
                    .map_err(RestRouteError::from_connect_error)?;
            }
            "organization" => {
                if let Some(organization_id) = project.organization_id {
                    let logo_url = organization_logo_url(repository, base_path, organization_id)
                        .await
                        .map_err(RestRouteError::from_connect_error)?;
                    item.avatar_url = if logo_url.is_empty() {
                        base_path_href(base_path, "/legacy-assets/images/group_default.png")
                    } else {
                        logo_url
                    };
                }
            }
            _ => {}
        }
    }
    Ok(())
}

pub(super) async fn rest_list_project_assignable_users(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestIssueAssignableUsersQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueAssignableUsersResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid project assignable users request",
        ));
    }

    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project assignable users require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
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

pub(super) async fn rest_list_project_issue_search_users(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestProjectIssueSearchUsersQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestProjectIssueSearchUsersResponse>, RestRouteError> {
    if owner_name.trim().is_empty()
        || project_name.trim().is_empty()
        || !matches!(query.role.as_str(), "author" | "assignee")
    {
        return Err(RestRouteError::bad_request(
            "invalid project issue search users request",
        ));
    }

    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project issue search users require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let record = repository
        .list_project_issue_search_users(&owner_name, &project_name, actor_id, &query.role)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot project not found"))?;

    Ok(Json(RestProjectIssueSearchUsersResponse {
        items: record
            .items
            .into_iter()
            .map(|item| RestProjectIssueSearchUserItem {
                avatar_url: item.avatar_url,
                display_name: item.display_name,
                login_id: item.login_id,
                pure_name_only: item.pure_name_only,
                user_id: item.user_id,
            })
            .collect(),
    }))
}

pub(super) async fn rest_list_issue_assignable_users(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    query: RestIssueAssignableUsersQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueAssignableUsersResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() || issue_number <= 0 {
        return Err(RestRouteError::bad_request(
            "invalid issue assignable users request",
        ));
    }

    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "issue assignable users require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
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

pub(super) async fn rest_list_issue_sharable_users(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    query: RestIssueAssignableUsersQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueAssignableUsersResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() || issue_number <= 0 {
        return Err(RestRouteError::bad_request(
            "invalid issue sharable users request",
        ));
    }

    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "issue sharable users require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
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

pub(super) async fn rest_list_project_mention_users(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestIssueMentionUsersQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueMentionUsersResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid project mention users request",
        ));
    }
    let context = query.context.trim();
    if !context.is_empty() && context != "issue-body" {
        return Err(RestRouteError::bad_request("invalid issue mention context"));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project mention users require repository backend",
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
        .list_project_mention_users(
            &authorization.project.owner_name,
            &authorization.project.project_name,
            actor_id,
            &query.query,
            10,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot project not found"))?;
    let mut response = rest_issue_mention_users_response(record);
    enrich_rest_issue_mention_avatars(
        repository,
        &authorization.project,
        &service.base_path,
        &mut response,
    )
    .await?;
    Ok(Json(response))
}

pub(super) async fn rest_list_issue_mention_users(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    query: RestIssueMentionUsersQuery,
    service: PilotServiceImpl,
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

    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "issue mention users require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
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

    let mut response = rest_issue_mention_users_response(record);
    enrich_rest_issue_mention_avatars(
        repository,
        &access.authorization.project,
        &service.base_path,
        &mut response,
    )
    .await?;
    Ok(Json(response))
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

pub(super) async fn rest_list_project_issue_references(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestProjectIssueReferencesQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestProjectIssueReferencesResponse>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid project issue references request",
        ));
    }

    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project issue references require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
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
        .list_project_issue_references(search_project.id, &query.query, 20)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;

    Ok(Json(rest_project_issue_references_response(record)))
}
