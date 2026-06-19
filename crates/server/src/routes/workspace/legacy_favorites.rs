use axum::{
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};

use yona_rust_domain::{authorize_project_access, ProjectAccessFacts, ProjectOperation};

use crate::{
    legacy_external_api_auth_error_response, legacy_external_authenticated_user_id,
    read_issue_access, session::SessionManager, ConnectError, PilotBackend, RestRouteError,
};

use super::map_project_scope;

pub(super) async fn legacy_external_favorite_projects(
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

pub(super) async fn legacy_external_toggle_favorite_project(
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

pub(super) async fn legacy_external_favorite_issues(
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

pub(super) async fn legacy_external_toggle_favorite_issue(
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

pub(super) async fn legacy_external_favorite_organizations(
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

pub(super) async fn legacy_external_toggle_favorite_organization(
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
