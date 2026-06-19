use super::*;

pub(crate) async fn project_enroll(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<EnrollProjectRequestView<'static>>,
) -> Result<(EnrollmentMutationResult, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "project requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    if !can_request_project_enrollment(
        true,
        authorization.viewer.is_guest,
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_organization_member,
        authorization.viewer.is_project_manager,
        authorization.viewer.is_project_member,
        authorization.viewer.is_site_admin,
    ) {
        return Err(ConnectError::invalid_argument(
            "Project enrollment is only available to guests.",
        ));
    }
    repository
        .create_project_enrollment_request(authorization.project.id, user_id)
        .await
        .map_err(internal_error)?;
    Ok((
        EnrollmentMutationResult {
            ok: true,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_enroll_cancel(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<CancelEnrollProjectRequestView<'static>>,
) -> Result<(EnrollmentMutationResult, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "project requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    if !can_request_project_enrollment(
        true,
        authorization.viewer.is_guest,
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_organization_member,
        authorization.viewer.is_project_manager,
        authorization.viewer.is_project_member,
        authorization.viewer.is_site_admin,
    ) {
        return Err(ConnectError::invalid_argument(
            "Project enrollment is only available to guests.",
        ));
    }
    repository
        .delete_project_enrollment_request(authorization.project.id, user_id)
        .await
        .map_err(internal_error)?;
    Ok((
        EnrollmentMutationResult {
            ok: true,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_favorite_toggle(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ToggleFavoriteProjectRequestView<'static>>,
) -> Result<(ToggleFavoriteProjectResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "project requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let can_read = authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous: false,
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
    .allowed;
    if !can_read {
        return Err(ConnectError::permission_denied(
            "project read is not allowed",
        ));
    }
    let result = repository
        .toggle_favorite_project(user_id, request.owner_name, request.project_name)
        .await
        .map_err(internal_error)?;
    Ok((
        ToggleFavoriteProjectResponse {
            favorited: result.favorited,
            owner_name: result.owner_name,
            project_name: result.project_name,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn recent_project_visit_record(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<RecordRecentProjectVisitRequestView<'static>>,
) -> Result<(RecordRecentProjectVisitResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "project requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let can_read = authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous: false,
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
    .allowed;
    if !can_read {
        return Err(ConnectError::permission_denied(
            "project read is not allowed",
        ));
    }
    let result = repository
        .record_recent_project_visit(user_id, request.owner_name, request.project_name)
        .await
        .map_err(internal_error)?;
    Ok((
        RecordRecentProjectVisitResponse {
            owner_name: result.owner_name,
            project_name: result.project_name,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_watch_toggle(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ToggleProjectWatchRequestView<'static>>,
) -> Result<(ProjectContainer, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "project requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    if !project_read_allowed(&authorization, false)? {
        return Err(ConnectError::permission_denied(
            "project read is not allowed",
        ));
    }

    repository
        .set_project_watch(user_id, authorization.project.id, request.watching)
        .await
        .map_err(internal_error)?;

    let refreshed = repository
        .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;

    Ok((
        build_project_container_response(
            repository,
            &service.public_origin,
            &service.base_path,
            &refreshed,
            Some(user_id),
        )
        .await?,
        ctx,
    ))
}

pub(super) async fn direct_toggle_project_watch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    watching: bool,
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
        smtp: SmtpRuntimeConfig::from_env(),
    };
    match rest_toggle_project_watch(headers, owner_name, project_name, watching, service).await {
        Ok(_) => StatusCode::OK.into_response(),
        Err(error) => error.into_response(),
    }
}

pub(super) async fn rest_enroll_project(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = EnrollProjectRequest {
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<EnrollProjectRequestView<'static>>(&request)?;
    let (payload, ctx) = project_enroll(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_cancel_enroll_project(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = CancelEnrollProjectRequest {
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<CancelEnrollProjectRequestView<'static>>(&request)?;
    let (payload, ctx) = project_enroll_cancel(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_toggle_favorite_project(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ToggleFavoriteProjectRequest {
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ToggleFavoriteProjectRequestView<'static>>(&request)?;
    let (payload, ctx) = project_favorite_toggle(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_toggle_project_watch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    watching: bool,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ToggleProjectWatchRequest {
        owner_name,
        project_name,
        watching,
        ..Default::default()
    };
    let request = rest_owned_view::<ToggleProjectWatchRequestView<'static>>(&request)?;
    let (payload, ctx) = project_watch_toggle(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}
