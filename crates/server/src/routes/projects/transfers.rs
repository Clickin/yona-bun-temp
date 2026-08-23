use super::*;

pub(super) async fn direct_accept_project_transfer(
    headers: HeaderMap,
    transfer_id: i64,
    confirm_key: String,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let session = match require_session(&service.session_manager, &headers) {
        Ok(session) => session,
        Err(_) => return StatusCode::UNAUTHORIZED.into_response(),
    };
    let Some(actor_id) = session.user_id else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    let transfer = match repository.read_valid_project_transfer(transfer_id).await {
        Ok(Some(transfer)) => transfer,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    if transfer.confirm_key != confirm_key {
        return StatusCode::BAD_REQUEST.into_response();
    }
    let actor = match repository.find_user_by_id(actor_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => return StatusCode::UNAUTHORIZED.into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    let mut allowed = actor.is_site_admin;
    match repository
        .find_user_by_login_id(&transfer.destination)
        .await
    {
        Ok(Some(destination_user)) => {
            allowed = allowed || destination_user.id == actor.id;
        }
        Ok(None) => match repository
            .read_organization_authorization(&transfer.destination, Some(actor.id))
            .await
        {
            Ok(Some(authorization)) => {
                allowed = allowed || authorization.viewer.is_organization_admin;
            }
            Ok(None) => {}
            Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
        },
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
    if !allowed {
        return StatusCode::FORBIDDEN.into_response();
    }

    // Destination-name resolution FIRST: one identity consumed by BOTH the
    // filesystem relocation and the DB transaction (no TOCTOU recompute).
    let Some(project) = repository
        .read_project_by_id(transfer.project_id)
        .await
        .ok()
        .flatten()
    else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let resolved_new_name = match repository
        .next_project_transfer_name(&transfer.destination, &project.project_name)
        .await
    {
        Ok(name) => name,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    let _locks = crate::lock_projects_for_mutation(vec![project.id]).await;
    let (old_layout, new_layout) = match (
        vcs::project_storage_layout(&service, &project.owner_name, &project.project_name),
        vcs::project_storage_layout(&service, &transfer.destination, &resolved_new_name),
    ) {
        (Ok(old), Ok(new)) => (old, new),
        _ => return StatusCode::UNPROCESSABLE_ENTITY.into_response(),
    };
    if vcs::ensure_single_storage_layout(&old_layout).is_err() {
        return (StatusCode::CONFLICT, "Inconsistent repository storage").into_response();
    }

    // Relocate the active-VCS store; roll back on DB failure.
    let (active_source, active_destination) = if project.vcs == "Subversion" {
        (old_layout.svn_path.clone(), new_layout.svn_path.clone())
    } else {
        (old_layout.git_path.clone(), new_layout.git_path.clone())
    };
    if active_source.exists() && !active_destination.exists() {
        if active_destination
            .parent()
            .is_some_and(|parent| std::fs::create_dir_all(parent).is_err())
        {
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
        if std::fs::rename(&active_source, &active_destination).is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    }

    match repository
        .accept_project_transfer(transfer.id, &resolved_new_name)
        .await
    {
        Ok(Some(relocation)) => redirect_to(
            &service.base_path,
            &format!(
                "/{}/{}",
                relocation.new_owner_name, relocation.new_project_name
            ),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => {
            // DB transaction failed: restore the physical location.
            if active_destination.exists() && !active_source.exists() {
                let _ = std::fs::rename(&active_destination, &active_source);
            }
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectTransferBody {
    destination: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectTransferResponse {
    owner_name: String,
    project_name: String,
    viewer_can_transfer: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    destination: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    new_project_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    redirect_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    transfer_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    confirm_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    accept_path: Option<String>,
}

fn rest_project_transfer_response(
    authorization: &persistence::ProjectAuthorizationRecord,
    transfer: Option<&persistence::ProjectTransferRecord>,
) -> Result<RestProjectTransferResponse, RestRouteError> {
    let viewer_can_transfer =
        project_update_allowed(authorization).map_err(RestRouteError::from_connect_error)?;
    Ok(RestProjectTransferResponse {
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        viewer_can_transfer,
        destination: transfer.map(|transfer| transfer.destination.clone()),
        new_project_name: transfer.map(|transfer| transfer.new_project_name.clone()),
        redirect_path: transfer.map(|_| {
            format!(
                "/{}/{}",
                authorization.project.owner_name, authorization.project.project_name
            )
        }),
        transfer_id: transfer.map(|transfer| transfer.id),
        confirm_key: transfer.map(|transfer| transfer.confirm_key.clone()),
        accept_path: transfer
            .map(|transfer| format!("/project/transfer/{}/{}", transfer.id, transfer.confirm_key)),
    })
}

pub(super) async fn rest_read_project_transfer(
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
            "project transfer requires repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, actor_id).await?;
    Ok(Json(rest_project_transfer_response(&authorization, None)?).into_response())
}

pub(super) async fn rest_request_project_transfer(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectTransferBody,
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
            "project transfer requires repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, Some(actor_id)).await?;
    let destination = body.destination.trim().to_string();
    if destination.is_empty() {
        return Err(RestRouteError::bad_request(
            "project.transfer.owner.required",
        ));
    }
    if destination.eq_ignore_ascii_case(&authorization.project.owner_name) {
        return Err(RestRouteError::bad_request("project.transfer.sameOwner"));
    }
    let destination_exists = repository
        .find_user_by_login_id(&destination)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .is_some()
        || repository
            .read_organization_by_name(&destination)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
            .is_some();
    if !destination_exists {
        return Err(RestRouteError::bad_request(
            "project.transfer.owner.notFound",
        ));
    }
    let new_project_name = repository
        .next_project_transfer_name(&destination, &authorization.project.project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let transfer = repository
        .request_project_transfer(persistence::ProjectTransferRequestInput {
            destination,
            new_project_name,
            project_id: authorization.project.id,
            sender_id: actor_id,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let sender = repository
        .find_user_by_id(actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::unauthenticated(
                "missing transfer sender",
            ))
        })?;
    send_project_transfer_request_mail(
        repository,
        &authorization,
        &transfer,
        &sender,
        &service.public_origin,
        &service.base_path,
        &service.smtp.default_from(),
        &service.integrations,
    )
    .await
    .map_err(internal_error)
    .map_err(RestRouteError::from_connect_error)?;

    Ok(Json(rest_project_transfer_response(
        &authorization,
        Some(&transfer),
    )?)
    .into_response())
}

pub(super) async fn direct_request_project_transfer(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    destination: String,
    service: PilotServiceImpl,
) -> Response {
    let body = RestProjectTransferBody { destination };
    match rest_request_project_transfer(
        headers,
        owner_name.clone(),
        project_name.clone(),
        body,
        service,
    )
    .await
    {
        Ok(_) => (
            StatusCode::NO_CONTENT,
            [("Location", format!("/{owner_name}/{project_name}"))],
        )
            .into_response(),
        Err(error) => error.into_response(),
    }
}
