use super::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectForkSource {
    is_forked: bool,
    overview: String,
    owner_name: String,
    project_name: String,
    project_scope: String,
    vcs: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectForkOwnerOption {
    organization: bool,
    owner_name: String,
    selected: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectForkSelected {
    owner_name: String,
    project_name: String,
    project_scope: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectForkSummary {
    owner_name: String,
    project_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectForkOptionsResponse {
    can_fork: bool,
    existing_forks: Vec<RestProjectForkSummary>,
    owner_options: Vec<RestProjectForkOwnerOption>,
    selected: RestProjectForkSelected,
    source: RestProjectForkSource,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectForkBody {
    name: Option<String>,
    owner: Option<String>,
    project_scope: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectForkResponse {
    ok: bool,
    project: ProjectDetail,
    redirect_path: String,
}

async fn rest_project_fork_owner_options(
    repository: &PilotRepository,
    actor: &persistence::AppUserRecord,
    selected_owner_name: &str,
) -> Result<Vec<RestProjectForkOwnerOption>, RestRouteError> {
    let mut options = vec![RestProjectForkOwnerOption {
        organization: false,
        owner_name: actor.login_id.clone(),
        selected: actor.login_id.eq_ignore_ascii_case(selected_owner_name),
    }];
    for organization in repository
        .list_organizations()
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
    {
        let Some(authorization) = repository
            .read_organization_authorization(&organization.organization_name, Some(actor.id))
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
        else {
            continue;
        };
        if can_create_organization_project(authorization.viewer.is_organization_admin) {
            let owner_name = authorization.organization.organization_name;
            let selected = owner_name.eq_ignore_ascii_case(selected_owner_name);
            options.push(RestProjectForkOwnerOption {
                organization: true,
                owner_name,
                selected,
            });
        }
    }
    if !options.iter().any(|option| option.selected) {
        if let Some(first) = options.first_mut() {
            first.selected = true;
        }
    }
    Ok(options)
}

async fn rest_project_fork_options_response(
    repository: &PilotRepository,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor: &persistence::AppUserRecord,
    selected_owner_name: &str,
    selected_project_name: &str,
    selected_project_scope: &str,
) -> Result<RestProjectForkOptionsResponse, RestRouteError> {
    let owner_options =
        rest_project_fork_owner_options(repository, actor, selected_owner_name).await?;
    let existing_forks = repository
        .list_project_forks(authorization.project.id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .into_iter()
        .map(|project| RestProjectForkSummary {
            owner_name: project.owner_name,
            project_name: project.project_name,
        })
        .collect();
    Ok(RestProjectForkOptionsResponse {
        can_fork: authorization.project.vcs.eq_ignore_ascii_case("GIT")
            && !owner_options.is_empty(),
        existing_forks,
        owner_options,
        selected: RestProjectForkSelected {
            owner_name: selected_owner_name.to_string(),
            project_name: selected_project_name.to_string(),
            project_scope: selected_project_scope.to_string(),
        },
        source: RestProjectForkSource {
            is_forked: authorization.project.original_project_id.is_some(),
            overview: authorization.project.overview.clone().unwrap_or_default(),
            owner_name: authorization.project.owner_name.clone(),
            project_name: authorization.project.project_name.clone(),
            project_scope: authorization.project.project_scope.clone(),
            vcs: authorization.project.vcs.clone(),
        },
    })
}

async fn rest_project_fork_target_organization_id(
    repository: &PilotRepository,
    actor: &persistence::AppUserRecord,
    target_owner_name: &str,
) -> Result<Option<i64>, RestRouteError> {
    if can_create_personal_project(Some(&actor.login_id), target_owner_name) {
        return Ok(None);
    }
    let authorization = repository
        .read_organization_authorization(target_owner_name, Some(actor.id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::bad_request("project.fork.owner.notFound"))?;
    if !can_create_organization_project(authorization.viewer.is_organization_admin) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("project fork owner is not allowed"),
        ));
    }
    Ok(Some(authorization.organization.id))
}

pub(super) async fn rest_read_project_fork_options(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    let actor_id = session.user_id.ok_or_else(|| {
        RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
    })?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project fork requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, Some(actor_id))
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization =
        require_project_read(repository, &owner_name, &project_name, Some(actor_id))
            .await
            .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(
        rest_project_fork_options_response(
            repository,
            &authorization,
            &actor,
            &actor.login_id,
            &authorization.project.project_name,
            &authorization.project.project_scope,
        )
        .await?,
    )
    .into_response())
}

pub(super) async fn rest_fork_project(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectForkBody,
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
            "project fork requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, Some(actor_id))
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization = require_project_resource_create(
        repository,
        &owner_name,
        &project_name,
        Some(actor_id),
        ProjectCreatableResource::Fork,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    if !authorization.project.vcs.eq_ignore_ascii_case("GIT") {
        return Err(RestRouteError::bad_request("project.fork.gitOnly"));
    }
    let target_owner_name = body
        .owner
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(&actor.login_id)
        .to_string();
    let target_project_name = body
        .name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(&authorization.project.project_name)
        .to_string();
    let target_scope_value = body
        .project_scope
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(&authorization.project.project_scope);
    let target_scope = map_project_scope(target_scope_value)
        .map_err(RestRouteError::from_connect_error)?
        .as_str()
        .to_string();
    if !is_valid_project_name(&target_project_name) {
        return Err(RestRouteError::bad_request("project.name.invalid"));
    }
    let target_organization_id =
        rest_project_fork_target_organization_id(repository, &actor, &target_owner_name).await?;
    if repository
        .project_identifier_exists(&target_owner_name, &target_project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
    {
        return Err(RestRouteError::from_connect_error(
            ConnectError::already_exists("project.name.duplicate"),
        ));
    }

    let fork = repository
        .create_fork_project(persistence::CreateForkProjectInput {
            organization_id: target_organization_id,
            original_project_id: authorization.project.id,
            owner_name: target_owner_name.clone(),
            overview: authorization.project.overview.clone(),
            project_name: target_project_name.clone(),
            project_scope: target_scope.clone(),
            vcs: "GIT".to_string(),
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let source_menu_settings = repository
        .read_project_menu_settings(authorization.project.id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    repository
        .set_project_menu_settings(fork.id, source_menu_settings)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let source_repo_path =
        yona_rust_vcs::repository_path(&yona_data_root(), authorization.project.id);
    let fork_repo_path = yona_rust_vcs::repository_path(&yona_data_root(), fork.id);
    let clone_result = {
        let _guard = repository_provisioning_lock()
            .lock()
            .map_err(|_| internal_error("repository provisioning lock poisoned"))
            .map_err(RestRouteError::from_connect_error)?;
        yona_rust_vcs::clone_bare_repository(&source_repo_path, &fork_repo_path)
    };
    if let Err(error) = clone_result {
        let _ = repository
            .delete_project_by_owner_and_name(&fork.owner_name, &fork.project_name)
            .await;
        let _ = yona_rust_vcs::delete_repository(&fork_repo_path);
        return Err(RestRouteError::from_connect_error(code_browser_error(
            error,
        )));
    }
    repository
        .add_project_membership(fork.id, actor_id, "manager")
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let fork_authorization = repository
        .read_project_authorization(&fork.owner_name, &fork.project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    let project = project_detail_from_record(
        &fork_authorization,
        project_update_allowed(&fork_authorization).map_err(RestRouteError::from_connect_error)?,
        false,
    );
    Ok(Json(RestProjectForkResponse {
        ok: true,
        redirect_path: format!("/{}/{}", fork.owner_name, fork.project_name),
        project,
    })
    .into_response())
}
