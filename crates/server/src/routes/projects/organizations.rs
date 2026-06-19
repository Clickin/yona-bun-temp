use super::*;

pub(crate) async fn organization_detail_read(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ReadOrganizationDetailRequestView<'static>>,
) -> Result<(OrganizationDetail, Context), ConnectError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&ctx.headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, actor_id)
        .await
        .map_err(internal_error)?;
    if let Some(authorization) = authorization {
        return Ok((
            organization_detail_with_logo_from_record(
                repository,
                &service.base_path,
                &authorization.organization,
                can_update_organization(
                    authorization.viewer.is_organization_admin,
                    authorization.viewer.is_site_admin,
                ),
            )
            .await?,
            ctx,
        ));
    }

    let organization = repository
        .read_organization_by_name(request.organization_name)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    Ok((
        organization_detail_with_logo_from_record(
            repository,
            &service.base_path,
            &persistence::OrganizationRecord {
                id: organization.id,
                organization_name: organization.organization_name,
                description: organization.description,
            },
            false,
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn organization_create(
    service: &PilotServiceImpl,
    mut ctx: Context,
    request: OwnedView<CreateOrganizationRequestView<'static>>,
) -> Result<(OrganizationDetail, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id).await?;
    if actor.is_guest {
        return Err(ConnectError::permission_denied(
            "guest users cannot create organizations",
        ));
    }

    if !is_valid_organization_name(request.organization_name) || request.description.len() > 255 {
        return Err(ConnectError::invalid_argument(
            "invalid organization request",
        ));
    }
    if repository
        .organization_name_exists(request.organization_name)
        .await
        .map_err(internal_error)?
        || repository
            .user_login_id_exists(request.organization_name)
            .await
            .map_err(internal_error)?
    {
        return Err(ConnectError::already_exists("organization.name.duplicate"));
    }

    let organization = repository
        .create_organization(persistence::CreateOrganizationInput {
            description: Some(request.description.trim().to_string()),
            organization_name: request.organization_name.trim().to_string(),
        })
        .await
        .map_err(internal_error)?;
    repository
        .add_organization_membership(organization.id, actor.id, "org_admin")
        .await
        .map_err(internal_error)?;
    attach_session_headers(&mut ctx, &service.session_manager, &session);

    Ok((
        organization_detail_with_logo_from_record(
            repository,
            &service.base_path,
            &persistence::OrganizationRecord {
                id: organization.id,
                organization_name: organization.organization_name,
                description: organization.description,
            },
            true,
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn organization_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateOrganizationRequestView<'static>>,
) -> Result<(OrganizationDetail, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    if !is_valid_organization_name(request.organization_name) || request.description.len() > 255 {
        return Err(ConnectError::invalid_argument(
            "invalid organization request",
        ));
    }

    let authorization = repository
        .read_organization_authorization(request.current_organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    if !can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    ) {
        return Err(ConnectError::permission_denied(
            "organization update is not allowed",
        ));
    }

    if normalize_identifier(request.current_organization_name)
        != normalize_identifier(request.organization_name)
        && (repository
            .organization_name_exists(request.organization_name)
            .await
            .map_err(internal_error)?
            || repository
                .user_login_id_exists(request.organization_name)
                .await
                .map_err(internal_error)?)
    {
        return Err(ConnectError::already_exists("organization.name.duplicate"));
    }

    let updated = repository
        .update_organization(persistence::UpdateOrganizationInput {
            current_organization_name: request.current_organization_name.trim().to_string(),
            description: Some(request.description.trim().to_string()),
            organization_name: request.organization_name.trim().to_string(),
        })
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    Ok((
        organization_detail_with_logo_from_record(
            repository,
            &service.base_path,
            &persistence::OrganizationRecord {
                id: updated.id,
                organization_name: updated.organization_name,
                description: updated.description,
            },
            true,
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn organization_settings_read(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ReadOrganizationSettingsRequestView<'static>>,
) -> Result<(OrganizationDetail, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    if !can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    ) {
        return Err(ConnectError::permission_denied(
            "organization update is not allowed",
        ));
    }

    Ok((
        organization_detail_with_logo_from_record(
            repository,
            &service.base_path,
            &authorization.organization,
            true,
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn organization_container_read(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ReadOrganizationContainerRequestView<'static>>,
) -> Result<(OrganizationContainer, Context), ConnectError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&ctx.headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;

    Ok((
        build_organization_container_response(
            repository,
            &service.base_path,
            &authorization,
            actor_id,
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn organization_members_read(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ReadOrganizationMembersRequestView<'static>>,
) -> Result<(ReadOrganizationMembersResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    if !can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    ) {
        return Err(ConnectError::permission_denied(
            "organization update is not allowed",
        ));
    }

    let directory = repository
        .read_organization_members(request.organization_name)
        .await
        .map_err(internal_error)?;
    Ok((
        ReadOrganizationMembersResponse {
            enrollment_requests: directory
                .enrollment_requests
                .into_iter()
                .map(|request| OrganizationEnrollmentRequest {
                    login_id: request.login_id,
                    user_label: request.user_label,
                    ..Default::default()
                })
                .collect(),
            members: directory
                .members
                .into_iter()
                .map(|member| OrganizationMember {
                    login_id: member.login_id,
                    role: member.role,
                    user_label: member.user_label,
                    ..Default::default()
                })
                .collect(),
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn organization_admin_read(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ReadOrganizationAdminRequestView<'static>>,
) -> Result<(OrganizationAdminView, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    if !can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    ) {
        return Err(ConnectError::permission_denied(
            "organization update is not allowed",
        ));
    }

    Ok((
        build_organization_admin_response(repository, &authorization).await?,
        ctx,
    ))
}

pub(crate) async fn organization_member_add(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<AddOrganizationMemberRequestView<'static>>,
) -> Result<(OrganizationAdminView, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    if !can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    ) {
        return Err(ConnectError::permission_denied(
            "organization update is not allowed",
        ));
    }

    let target_user = repository
        .find_user_by_login_id(request.login_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::invalid_argument("organization member is unknown"))?;
    if target_user.is_guest {
        return Err(ConnectError::invalid_argument(
            "guest users cannot be added to organizations directly",
        ));
    }
    repository
        .add_organization_membership(authorization.organization.id, target_user.id, "org_member")
        .await
        .map_err(internal_error)?;
    repository
        .delete_organization_enrollment_request(authorization.organization.id, target_user.id)
        .await
        .map_err(internal_error)?;

    let refreshed = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    Ok((
        build_organization_admin_response(repository, &refreshed).await?,
        ctx,
    ))
}

pub(crate) async fn organization_member_role_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateOrganizationMemberRoleRequestView<'static>>,
) -> Result<(OrganizationAdminView, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    if request.role != "org_admin" && request.role != "org_member" {
        return Err(ConnectError::invalid_argument(
            "organization role is invalid",
        ));
    }

    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    if !can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    ) {
        return Err(ConnectError::permission_denied(
            "organization update is not allowed",
        ));
    }

    let directory = repository
        .read_organization_members(request.organization_name)
        .await
        .map_err(internal_error)?;
    let current_member = directory
        .members
        .iter()
        .find(|member| member.user_id == request.user_id);
    if let Some(current_member) = current_member {
        let admin_count = directory
            .members
            .iter()
            .filter(|member| member.role == "org_admin")
            .count();
        if current_member.role == "org_admin" && request.role == "org_member" && admin_count == 1 {
            return Err(ConnectError::invalid_argument(
                "organization requires at least one admin",
            ));
        }
        repository
            .add_organization_membership(
                authorization.organization.id,
                request.user_id,
                request.role,
            )
            .await
            .map_err(internal_error)?;
    }

    let refreshed = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    Ok((
        build_organization_admin_response(repository, &refreshed).await?,
        ctx,
    ))
}

pub(crate) async fn organization_member_delete(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<DeleteOrganizationMemberRequestView<'static>>,
) -> Result<(OrganizationAdminView, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    let can_update = can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    );
    if !can_update && user_id != request.user_id {
        return Err(ConnectError::permission_denied(
            "organization update is not allowed",
        ));
    }

    let directory = repository
        .read_organization_members(request.organization_name)
        .await
        .map_err(internal_error)?;
    if let Some(current_member) = directory
        .members
        .iter()
        .find(|member| member.user_id == request.user_id)
    {
        let admin_count = directory
            .members
            .iter()
            .filter(|member| member.role == "org_admin")
            .count();
        if current_member.role == "org_admin" && admin_count == 1 {
            return Err(ConnectError::invalid_argument(
                "organization requires at least one admin",
            ));
        }
        repository
            .delete_organization_membership(authorization.organization.id, request.user_id)
            .await
            .map_err(internal_error)?;
    }

    let refreshed = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    Ok((
        build_organization_admin_response(repository, &refreshed).await?,
        ctx,
    ))
}

pub(crate) async fn organization_enrollment_accept(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<AcceptOrganizationEnrollmentRequestView<'static>>,
) -> Result<(OrganizationAdminView, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    if !can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    ) {
        return Err(ConnectError::permission_denied(
            "organization update is not allowed",
        ));
    }

    repository
        .add_organization_membership(authorization.organization.id, request.user_id, "org_member")
        .await
        .map_err(internal_error)?;
    repository
        .delete_organization_enrollment_request(authorization.organization.id, request.user_id)
        .await
        .map_err(internal_error)?;

    let refreshed = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    Ok((
        build_organization_admin_response(repository, &refreshed).await?,
        ctx,
    ))
}

pub(crate) async fn organization_enroll(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<EnrollOrganizationRequestView<'static>>,
) -> Result<(OrganizationContainer, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::invalid_argument("organization not found"))?;
    if !authorization.viewer.is_guest
        || authorization.viewer.is_organization_admin
        || authorization.viewer.is_organization_member
        || authorization.viewer.is_site_admin
    {
        return Err(ConnectError::invalid_argument(
            "Organization enrollment is only available to guests.",
        ));
    }

    repository
        .create_organization_enrollment_request(authorization.organization.id, user_id)
        .await
        .map_err(internal_error)?;
    let refreshed = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    Ok((
        build_organization_container_response(
            repository,
            &service.base_path,
            &refreshed,
            Some(user_id),
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn organization_enroll_cancel(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<CancelEnrollOrganizationRequestView<'static>>,
) -> Result<(OrganizationContainer, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::invalid_argument("organization not found"))?;
    if !authorization.viewer.is_guest
        || authorization.viewer.is_organization_admin
        || authorization.viewer.is_organization_member
        || authorization.viewer.is_site_admin
    {
        return Err(ConnectError::invalid_argument(
            "Organization enrollment is only available to guests.",
        ));
    }

    repository
        .delete_organization_enrollment_request(authorization.organization.id, user_id)
        .await
        .map_err(internal_error)?;
    let refreshed = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    Ok((
        build_organization_container_response(
            repository,
            &service.base_path,
            &refreshed,
            Some(user_id),
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn organization_leave(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<LeaveOrganizationRequestView<'static>>,
) -> Result<(OrganizationRedirectResult, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    if !authorization.viewer.is_organization_admin && !authorization.viewer.is_organization_member {
        return Err(ConnectError::invalid_argument(
            "organization leave is only available to members",
        ));
    }

    let directory = repository
        .read_organization_members(request.organization_name)
        .await
        .map_err(internal_error)?;
    let admin_count = directory
        .members
        .iter()
        .filter(|member| member.role == "org_admin")
        .count();
    if authorization.viewer.is_organization_admin && admin_count == 1 {
        return Err(ConnectError::invalid_argument(
            "organization requires at least one admin",
        ));
    }

    repository
        .delete_organization_membership(authorization.organization.id, user_id)
        .await
        .map_err(internal_error)?;
    Ok((
        OrganizationRedirectResult {
            ok: true,
            redirect_path: format!(
                "/organizations/{}",
                authorization.organization.organization_name
            ),
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn organization_delete(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<DeleteOrganizationRequestView<'static>>,
) -> Result<(OrganizationRedirectResult, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "organization requires repository backend",
        ));
    };
    let authorization = repository
        .read_organization_authorization(request.organization_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("organization not found"))?;
    if !can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    ) {
        return Err(ConnectError::permission_denied(
            "organization delete is not allowed",
        ));
    }
    if !repository
        .list_projects_for_organization(authorization.organization.id)
        .await
        .map_err(internal_error)?
        .is_empty()
    {
        return Err(ConnectError::invalid_argument("organization has projects"));
    }

    repository
        .delete_organization_by_name(request.organization_name)
        .await
        .map_err(internal_error)?;
    Ok((
        OrganizationRedirectResult {
            ok: true,
            redirect_path: "/".to_string(),
            ..Default::default()
        },
        ctx,
    ))
}
pub(crate) async fn organization_list(
    service: &PilotServiceImpl,
    ctx: Context,
    _request: OwnedView<ListOrganizationsRequestView<'static>>,
) -> Result<(ListOrganizationsResponse, Context), ConnectError> {
    if let PilotBackend::Repository(repository) = &service.backend {
        let records = repository
            .list_organizations()
            .await
            .map_err(internal_error)?;
        let mut items = Vec::with_capacity(records.len());
        for item in records {
            items.push(OrganizationListItem {
                organization_name: item.organization_name,
                description: item.description.unwrap_or_default(),
                logo_url: organization_logo_url(repository, &service.base_path, item.id).await?,
                ..Default::default()
            });
        }

        return Ok((
            ListOrganizationsResponse {
                items,
                ..Default::default()
            },
            ctx,
        ));
    }

    Ok((
        ListOrganizationsResponse {
            items: vec![OrganizationListItem {
                organization_name: "pilot".to_string(),
                description: "Pilot organization directory route foundation".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        },
        ctx,
    ))
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestOrganizationBody {
    description: String,
    logo_attachment_id: Option<i64>,
    organization_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestOrganizationMemberBody {
    login_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestOrganizationMemberRoleBody {
    role: String,
}
pub(crate) async fn rest_list_organizations(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    rest_reject_legacy_guest_prohibited_user(&headers, &service).await?;
    let request = ListOrganizationsRequest::default();
    let request = rest_owned_view::<ListOrganizationsRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_list(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_create_organization(
    headers: HeaderMap,
    body: RestOrganizationBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = CreateOrganizationRequest {
        description: body.description,
        organization_name: body.organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<CreateOrganizationRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_create(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_read_organization_detail(
    headers: HeaderMap,
    organization_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadOrganizationDetailRequest {
        organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ReadOrganizationDetailRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_detail_read(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_read_organization_admin(
    headers: HeaderMap,
    organization_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadOrganizationAdminRequest {
        organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ReadOrganizationAdminRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_admin_read(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_read_organization_container(
    headers: HeaderMap,
    organization_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadOrganizationContainerRequest {
        organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ReadOrganizationContainerRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_container_read(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_read_organization_settings(
    headers: HeaderMap,
    organization_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadOrganizationSettingsRequest {
        organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ReadOrganizationSettingsRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_settings_read(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_read_organization_members(
    headers: HeaderMap,
    organization_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadOrganizationMembersRequest {
        organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ReadOrganizationMembersRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_members_read(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_update_organization(
    headers: HeaderMap,
    current_organization_name: String,
    body: RestOrganizationBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let logo_attachment_id = body.logo_attachment_id;
    let request = UpdateOrganizationRequest {
        current_organization_name,
        description: body.description,
        organization_name: body.organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateOrganizationRequestView<'static>>(&request)?;
    let (mut payload, ctx) = organization_update(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    if let Some(logo_attachment_id) = logo_attachment_id.filter(|attachment_id| *attachment_id > 0)
    {
        payload.logo_url = rest_update_organization_logo_attachment(
            &service,
            &ctx.headers,
            &payload.organization_name,
            logo_attachment_id,
        )
        .await?;
    }
    Ok(rest_json_response(payload, ctx))
}

async fn rest_update_organization_logo_attachment(
    service: &PilotServiceImpl,
    headers: &HeaderMap,
    organization_name: &str,
    attachment_id: i64,
) -> Result<String, RestRouteError> {
    let session = require_session(&service.session_manager, headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let actor_id = session.user_id.ok_or_else(|| {
        RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
    })?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::from_connect_error(
            ConnectError::unimplemented("organization logo requires repository backend"),
        ));
    };
    let authorization = repository
        .read_organization_authorization(organization_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("organization not found"))?;
    if !can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    ) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("organization update is not allowed"),
        ));
    }
    let attachment = repository
        .read_attachment_by_id(attachment_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("attachment not found"))?;
    if !attachment.mime_type.starts_with("image/") || attachment.size > 5 * 1024 * 1024 {
        return Err(RestRouteError::from_connect_error(
            ConnectError::invalid_argument("organization logo must be an image no larger than 5MB"),
        ));
    }
    repository
        .set_organization_logo_attachment(authorization.organization.id, attachment_id, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::permission_denied(
                "organization logo attachment is not owned by the actor",
            ))
        })?;
    Ok(base_path_href(
        &service.base_path,
        &format!("/files/{attachment_id}"),
    ))
}

pub(crate) async fn rest_add_organization_member(
    headers: HeaderMap,
    organization_name: String,
    body: RestOrganizationMemberBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = AddOrganizationMemberRequest {
        login_id: body.login_id,
        organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<AddOrganizationMemberRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_member_add(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_update_organization_member_role(
    headers: HeaderMap,
    organization_name: String,
    user_id: i64,
    body: RestOrganizationMemberRoleBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = UpdateOrganizationMemberRoleRequest {
        organization_name,
        role: body.role,
        user_id,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateOrganizationMemberRoleRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_member_role_update(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_delete_organization_member(
    headers: HeaderMap,
    organization_name: String,
    user_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = DeleteOrganizationMemberRequest {
        organization_name,
        user_id,
        ..Default::default()
    };
    let request = rest_owned_view::<DeleteOrganizationMemberRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_member_delete(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_accept_organization_enrollment(
    headers: HeaderMap,
    organization_name: String,
    user_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = AcceptOrganizationEnrollmentRequest {
        organization_name,
        user_id,
        ..Default::default()
    };
    let request = rest_owned_view::<AcceptOrganizationEnrollmentRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_enrollment_accept(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_enroll_organization(
    headers: HeaderMap,
    organization_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = EnrollOrganizationRequest {
        organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<EnrollOrganizationRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_enroll(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_cancel_enroll_organization(
    headers: HeaderMap,
    organization_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = CancelEnrollOrganizationRequest {
        organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<CancelEnrollOrganizationRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_enroll_cancel(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_leave_organization(
    headers: HeaderMap,
    organization_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = LeaveOrganizationRequest {
        organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<LeaveOrganizationRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_leave(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_delete_organization(
    headers: HeaderMap,
    organization_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = DeleteOrganizationRequest {
        organization_name,
        ..Default::default()
    };
    let request = rest_owned_view::<DeleteOrganizationRequestView<'static>>(&request)?;
    let (payload, ctx) = organization_delete(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}
