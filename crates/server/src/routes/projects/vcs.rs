use super::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectChangeVcsResponse {
    owner_name: String,
    project_name: String,
    current_vcs: String,
    next_vcs: String,
    viewer_can_change: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    redirect_path: Option<String>,
}

fn rest_next_project_vcs(current: &str) -> String {
    if current == "GIT" {
        "Subversion".to_string()
    } else {
        "GIT".to_string()
    }
}

fn rest_project_change_vcs_response(
    authorization: &persistence::ProjectAuthorizationRecord,
    redirect_path: Option<String>,
) -> Result<RestProjectChangeVcsResponse, RestRouteError> {
    let viewer_can_change =
        project_update_allowed(authorization).map_err(RestRouteError::from_connect_error)?;
    Ok(RestProjectChangeVcsResponse {
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        current_vcs: authorization.project.vcs.clone(),
        next_vcs: rest_next_project_vcs(&authorization.project.vcs),
        viewer_can_change,
        redirect_path,
    })
}

pub(crate) fn delete_project_repository_storage(
    data_root: &std::path::Path,
    project_id: i64,
) -> Result<(), RestRouteError> {
    let git_repo_path = yona_rust_vcs::repository_path(data_root, project_id);
    let svn_repo_path = yona_rust_vcs::svn_repository_path(data_root, project_id);
    let _guard = repository_provisioning_lock()
        .lock()
        .map_err(|_| internal_error("repository provisioning lock poisoned"))
        .map_err(RestRouteError::from_connect_error)?;
    yona_rust_vcs::delete_repository(&git_repo_path)
        .map_err(code_browser_error)
        .map_err(RestRouteError::from_connect_error)?;
    yona_rust_vcs::delete_repository(&svn_repo_path)
        .map_err(code_browser_error)
        .map_err(RestRouteError::from_connect_error)
}

pub(super) fn reset_project_repository_storage(
    data_root: &std::path::Path,
    project_id: i64,
    vcs: &str,
) -> Result<(), RestRouteError> {
    delete_project_repository_storage(data_root, project_id)?;
    let _guard = repository_provisioning_lock()
        .lock()
        .map_err(|_| internal_error("repository provisioning lock poisoned"))
        .map_err(RestRouteError::from_connect_error)?;
    let repo_path = yona_rust_vcs::repository_path_for_vcs(data_root, project_id, vcs);
    if vcs == "Subversion" {
        return yona_rust_vcs::create_svn_repository(&repo_path)
            .map_err(code_browser_error)
            .map_err(RestRouteError::from_connect_error);
    }
    yona_rust_vcs::create_bare_repository(&repo_path)
        .map_err(code_browser_error)
        .map_err(RestRouteError::from_connect_error)
}

pub(super) async fn rest_read_project_change_vcs(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project change VCS requires repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, actor_id).await?;
    Ok(Json(rest_project_change_vcs_response(&authorization, None)?).into_response())
}

pub(super) async fn rest_change_project_vcs(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let actor_id = session.user_id.ok_or_else(|| {
        RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
    })?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project change VCS requires repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, Some(actor_id)).await?;
    let next_vcs = rest_next_project_vcs(&authorization.project.vcs);
    if next_vcs == "Subversion" {
        yona_rust_vcs::ensure_svnadmin_available()
            .map_err(code_browser_error)
            .map_err(RestRouteError::from_connect_error)?;
    }
    let changed = repository
        .change_project_vcs(authorization.project.id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    reset_project_repository_storage(&service.data_root, changed.id, &changed.vcs)?;
    let mut changed_authorization = authorization;
    changed_authorization.project = changed;
    Ok(Json(rest_project_change_vcs_response(
        &changed_authorization,
        Some(format!("/{owner_name}/{project_name}")),
    )?)
    .into_response())
}

pub(super) async fn direct_change_project_vcs(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Response {
    match rest_change_project_vcs(headers, owner_name.clone(), project_name.clone(), service).await
    {
        Ok(_) => (
            StatusCode::NO_CONTENT,
            [("Location", format!("/{owner_name}/{project_name}"))],
        )
            .into_response(),
        Err(error) => error.into_response(),
    }
}
