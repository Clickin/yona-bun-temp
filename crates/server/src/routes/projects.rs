use axum::{
    body::Bytes,
    extract::{Form, Path, Query},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{delete, get, patch, post, put},
    Json, Router,
};
use buffa::view::OwnedView;
use sea_orm::entity::prelude::DateTime;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, path::Path as StdPath};

use crate::generated::yona::pilot::v1::*;
use crate::routes::utils::gravatar_url;
use crate::{
    absolute_app_url, accepts_legacy_json, attach_session_headers, base_path_href,
    build_organization_admin_response, build_organization_container_response,
    build_project_container_response, code_browser_error, code_file_record_is_renderable_markdown,
    direct_project_update_allowed, direct_status_from_connect_error, form_value,
    format_project_date_label, internal_error, issue_milestone_from_record,
    issue_milestone_from_record_with_issue_references, legacy_external_api_auth_error_response,
    legacy_external_assignable_users_result, legacy_external_authenticated_user_id,
    legacy_json_find_value, map_project_scope, markdown_mention_references, normalize_identifier,
    normalize_issue_label_color, normalize_milestone_state,
    organization_detail_with_logo_from_record, organization_logo_url, parse_attachment_ids,
    parse_milestone_due_date, persistence, project_detail_from_record,
    project_detail_with_logo_from_record, project_logo_url, project_read_allowed,
    project_update_allowed, redirect_to, repository_provisioning_lock, require_authenticated_user,
    require_project_read, require_project_resource_create, require_session, require_valid_csrf,
    rest_json_response, rest_mention_reference_metadata_from_resolved, rest_owned_view,
    rest_repository, rewrite_project_readme_markdown_links, send_project_transfer_request_mail,
    session::SessionManager, yona_data_root, AuthUiConfig, ConnectError, Context, PilotBackend,
    PilotRepository, PilotServiceImpl, ProjectCreatableResource, RestIssueAssignableUsersQuery,
    RestMentionReferenceMetadata, RestProjectDeleteResponse, RestRouteError,
};
use yona_rust_domain::{
    authorize_project_access, can_create_organization_project, can_create_personal_project,
    can_request_project_enrollment, can_update_organization, is_valid_organization_name,
    is_valid_project_name, ProjectAccessFacts, ProjectOperation,
};
use yona_rust_integrations::{deliver_webhook, OutboundWebhook, WebhookDeliveryOutcome};
use yona_rust_vcs::{ProjectHistoryCommitRecord, VcsError};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DirectMarkdownRenderBody {
    body: Option<String>,
    breaks: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectMarkdownRenderResponse {
    body_markdown: String,
    breaks: bool,
}

pub(crate) fn milestone_list_filter_from_request(
    request: &ListProjectMilestonesRequestView<'_>,
) -> persistence::MilestoneListFilter {
    persistence::MilestoneListFilter {
        order_by: if request.order_by.trim().is_empty() {
            "dueDate".to_string()
        } else {
            request.order_by.trim().to_string()
        },
        order_dir: if request.order_dir.trim().is_empty() {
            "asc".to_string()
        } else {
            request.order_dir.trim().to_string()
        },
        state: if request.state.trim().is_empty() {
            "open".to_string()
        } else {
            request.state.trim().to_string()
        },
    }
}

pub(crate) fn milestone_mutation_input(
    owner_name: &str,
    project_name: &str,
    actor_id: Option<i64>,
    title: &str,
    contents_markdown: &str,
    due_date: &str,
    state: &str,
    attachment_ids: &[i64],
) -> Result<persistence::MilestoneMutationInput, ConnectError> {
    let title = title.trim();
    if title.is_empty() {
        return Err(ConnectError::invalid_argument("milestone.error.title"));
    }
    Ok(persistence::MilestoneMutationInput {
        actor_id,
        attachment_ids: attachment_ids.to_vec(),
        contents_markdown: contents_markdown.to_string(),
        due_date: parse_milestone_due_date(due_date)?,
        owner_name: owner_name.to_string(),
        project_name: project_name.to_string(),
        state: normalize_milestone_state(state)?,
        title: title.to_string(),
    })
}

pub(crate) async fn project_milestone_state_mutation(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<MilestoneStateMutationRequestView<'static>>,
    state: &str,
) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "milestone requires repository backend",
        ));
    };
    require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "milestone update is not allowed",
        ));
    }
    let milestone = repository
        .update_project_milestone_state(
            request.owner_name,
            request.project_name,
            request.milestone_id,
            state,
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("milestone not found"))?;
    let mut milestone = issue_milestone_from_record_with_issue_references(
        repository,
        &authorization,
        session.user_id,
        &milestone,
        &service.base_path,
    )
    .await?;
    milestone.viewer_can_update = true;
    milestone.viewer_can_delete = true;
    Ok((
        ProjectMilestoneMutationResponse {
            milestone: Some(milestone).into(),
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_milestone_list(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ListProjectMilestonesRequestView<'static>>,
) -> Result<(ListProjectMilestonesResponse, Context), ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let session = service
        .session_manager
        .read_session_from_headers(&ctx.headers);
    let actor_id = session.as_ref().and_then(|session| session.user_id);
    require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        actor_id,
    )
    .await?;
    let records = repository
        .list_project_milestones(
            request.owner_name,
            request.project_name,
            milestone_list_filter_from_request(&request),
        )
        .await
        .map_err(internal_error)?;
    let milestones = records
        .iter()
        .map(|record| issue_milestone_from_record(record, &service.base_path))
        .collect();
    Ok((
        ListProjectMilestonesResponse {
            milestones,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_milestone_read(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ReadProjectMilestoneRequestView<'static>>,
) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "milestone requires repository backend",
        ));
    };
    let session = service
        .session_manager
        .read_session_from_headers(&ctx.headers);
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.as_ref().and_then(|session| session.user_id),
    )
    .await?;
    let viewer_can_update = project_update_allowed(&authorization).unwrap_or(false);
    let milestone = repository
        .read_project_milestone(
            request.owner_name,
            request.project_name,
            request.milestone_id,
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("milestone not found"))?;
    let mut milestone = issue_milestone_from_record_with_issue_references(
        repository,
        &authorization,
        session.as_ref().and_then(|session| session.user_id),
        &milestone,
        &service.base_path,
    )
    .await?;
    milestone.viewer_can_update = viewer_can_update;
    milestone.viewer_can_delete = viewer_can_update;
    Ok((
        ProjectMilestoneMutationResponse {
            milestone: Some(milestone).into(),
            ..Default::default()
        },
        ctx,
    ))
}

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

pub(crate) async fn project_detail_read(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ReadProjectDetailRequestView<'static>>,
) -> Result<(ProjectDetail, Context), ConnectError> {
    let session = service
        .session_manager
        .read_session_from_headers(&ctx.headers);
    let actor_id = session.as_ref().and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "project requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(request.owner_name, request.project_name, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let decision = authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous: actor_id.is_none(),
            is_guest: authorization.viewer.is_guest,
            is_organization_admin: authorization.viewer.is_organization_admin,
            is_organization_member: authorization.viewer.is_organization_member,
            is_project_manager: authorization.viewer.is_project_manager,
            is_project_member: authorization.viewer.is_project_member,
            is_site_admin: authorization.viewer.is_site_admin,
            project_scope: map_project_scope(&authorization.project.project_scope)?,
        },
        ProjectOperation::Read,
    );
    if !decision.allowed {
        return if actor_id.is_none() {
            Err(ConnectError::unauthenticated("project read is not allowed"))
        } else {
            Err(ConnectError::permission_denied(
                "project read is not allowed",
            ))
        };
    }

    if let Some(user_id) = actor_id {
        repository
            .record_recent_project_visit(
                user_id,
                &authorization.project.owner_name,
                &authorization.project.project_name,
            )
            .await
            .map_err(internal_error)?;
    }

    Ok((
        project_detail_with_logo_from_record(
            repository,
            &service.base_path,
            &authorization,
            authorize_project_access(
                &ProjectAccessFacts {
                    is_anonymous: actor_id.is_none(),
                    is_guest: authorization.viewer.is_guest,
                    is_organization_admin: authorization.viewer.is_organization_admin,
                    is_organization_member: authorization.viewer.is_organization_member,
                    is_project_manager: authorization.viewer.is_project_manager,
                    is_project_member: authorization.viewer.is_project_member,
                    is_site_admin: authorization.viewer.is_site_admin,
                    project_scope: map_project_scope(&authorization.project.project_scope)?,
                },
                ProjectOperation::Update,
            )
            .allowed,
            can_request_project_enrollment(
                actor_id.is_some(),
                authorization.viewer.is_guest,
                authorization.viewer.is_organization_admin,
                authorization.viewer.is_organization_member,
                authorization.viewer.is_project_manager,
                authorization.viewer.is_project_member,
                authorization.viewer.is_site_admin,
            ),
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn project_create(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<CreateProjectRequestView<'static>>,
) -> Result<(ProjectDetail, Context), ConnectError> {
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
    let request_scope = request.project_scope.trim();
    let default_scope;
    let scope_value = if request_scope.is_empty() {
        default_scope = service.project_default_scope.clone();
        default_scope.as_str()
    } else {
        request_scope
    };
    let scope = map_project_scope(scope_value)?;
    if !is_valid_project_name(request.project_name) || request.overview.len() > 255 {
        return Err(ConnectError::invalid_argument("invalid project request"));
    }
    if repository
        .project_identifier_exists(request.owner_name, request.project_name)
        .await
        .map_err(internal_error)?
    {
        return Err(ConnectError::already_exists("project.name.duplicate"));
    }
    let actor = repository
        .find_user_by_id(user_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::unauthenticated("missing authenticated user"))?;

    let organization = repository
        .read_organization_authorization(request.owner_name, Some(user_id))
        .await
        .map_err(internal_error)?;
    let created = if let Some(organization) = organization {
        if !can_create_organization_project(organization.viewer.is_organization_admin) {
            return Err(ConnectError::permission_denied(
                "organization project creation is not allowed",
            ));
        }
        repository
            .create_project(persistence::CreateProjectInput {
                organization_id: Some(organization.organization.id),
                owner_name: organization.organization.organization_name,
                overview: Some(request.overview.trim().to_string()),
                project_name: request.project_name.trim().to_string(),
                project_scope: scope.as_str().to_string(),
                vcs: "GIT".to_string(),
            })
            .await
            .map_err(internal_error)?
    } else {
        if !can_create_personal_project(Some(&actor.login_id), request.owner_name) {
            return Err(ConnectError::invalid_argument("project owner is invalid"));
        }
        repository
            .create_project(persistence::CreateProjectInput {
                organization_id: None,
                owner_name: request.owner_name.trim().to_string(),
                overview: Some(request.overview.trim().to_string()),
                project_name: request.project_name.trim().to_string(),
                project_scope: scope.as_str().to_string(),
                vcs: "GIT".to_string(),
            })
            .await
            .map_err(internal_error)?
    };
    let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), created.id);
    {
        let _guard = repository_provisioning_lock()
            .lock()
            .map_err(|_| internal_error("repository provisioning lock poisoned"))?;
        yona_rust_vcs::create_bare_repository(&repo_path).map_err(code_browser_error)?;
    }
    repository
        .add_project_membership(created.id, user_id, "manager")
        .await
        .map_err(internal_error)?;
    let authorization = repository
        .read_project_authorization(&created.owner_name, &created.project_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    Ok((
        project_detail_with_logo_from_record(
            repository,
            &service.base_path,
            &authorization,
            true,
            false,
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn project_list(
    service: &PilotServiceImpl,
    ctx: Context,
    _request: OwnedView<ListProjectsRequestView<'static>>,
) -> Result<(ListProjectsResponse, Context), ConnectError> {
    if let PilotBackend::Repository(repository) = &service.backend {
        let records = repository.list_projects().await.map_err(internal_error)?;
        let mut items = Vec::with_capacity(records.len());
        for item in records {
            items.push(ProjectListItem {
                logo_url: project_logo_url(repository, &service.base_path, item.id).await?,
                owner_name: item.owner_name,
                project_name: item.project_name,
                overview: item.overview.unwrap_or_default(),
                project_scope: item.project_scope,
                ..Default::default()
            });
        }

        return Ok((
            ListProjectsResponse {
                items,
                ..Default::default()
            },
            ctx,
        ));
    }

    Ok((
        ListProjectsResponse {
            items: vec![ProjectListItem {
                owner_name: "pilot".to_string(),
                project_name: "yona".to_string(),
                overview: "Pilot projects list is using the browser-safe route tree.".to_string(),
                project_scope: "public".to_string(),
                ..Default::default()
            }],
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

pub(crate) async fn project_settings_read(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ReadProjectSettingsRequestView<'static>>,
) -> Result<(ProjectDetail, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
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
    let can_update = authorize_project_access(
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
        ProjectOperation::Update,
    )
    .allowed;
    if !can_update {
        return Err(ConnectError::permission_denied(
            "project update is not allowed",
        ));
    }

    Ok((
        project_detail_with_logo_from_record(
            repository,
            &service.base_path,
            &authorization,
            true,
            false,
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn project_container_read(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ReadProjectContainerRequestView<'static>>,
) -> Result<(ProjectContainer, Context), ConnectError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&ctx.headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "project requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(request.owner_name, request.project_name, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    if !project_read_allowed(&authorization, actor_id.is_none())? {
        return if actor_id.is_none() {
            Err(ConnectError::unauthenticated("project read is not allowed"))
        } else {
            Err(ConnectError::permission_denied(
                "project read is not allowed",
            ))
        };
    }

    if let Some(user_id) = actor_id {
        repository
            .record_recent_project_visit(user_id, request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?;
    }

    Ok((
        build_project_container_response(
            repository,
            &service.public_origin,
            &service.base_path,
            &authorization,
            actor_id,
        )
        .await?,
        ctx,
    ))
}

pub(crate) async fn project_overview_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateProjectOverviewRequestView<'static>>,
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
    if request.overview.len() > 255 {
        return Err(ConnectError::invalid_argument("invalid project request"));
    }

    let authorization = repository
        .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "project update is not allowed",
        ));
    }

    repository
        .update_project(persistence::UpdateProjectInput {
            current_owner_name: authorization.project.owner_name.clone(),
            current_project_name: authorization.project.project_name.clone(),
            overview: Some(request.overview.trim().to_string()),
            project_name: authorization.project.project_name.clone(),
            project_scope: authorization.project.project_scope.clone(),
        })
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;

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

pub(crate) async fn project_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateProjectRequestView<'static>>,
) -> Result<(ProjectDetail, Context), ConnectError> {
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
    if !is_valid_project_name(request.project_name) || request.overview.len() > 255 {
        return Err(ConnectError::invalid_argument("invalid project request"));
    }
    let authorization = repository
        .read_project_authorization(
            request.current_owner_name,
            request.current_project_name,
            Some(user_id),
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let can_update = authorize_project_access(
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
        ProjectOperation::Update,
    )
    .allowed;
    if !can_update {
        return Err(ConnectError::permission_denied(
            "project update is not allowed",
        ));
    }
    if normalize_identifier(request.current_owner_name) != normalize_identifier(request.owner_name)
    {
        return Err(ConnectError::invalid_argument(
            "project owner change is not supported in this packet",
        ));
    }
    if (normalize_identifier(request.current_owner_name)
        != normalize_identifier(request.owner_name)
        || normalize_identifier(request.current_project_name)
            != normalize_identifier(request.project_name))
        && repository
            .project_identifier_exists(request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?
    {
        return Err(ConnectError::already_exists("project.name.duplicate"));
    }

    repository
        .update_project(persistence::UpdateProjectInput {
            current_owner_name: request.current_owner_name.trim().to_string(),
            current_project_name: request.current_project_name.trim().to_string(),
            overview: Some(request.overview.trim().to_string()),
            project_name: request.project_name.trim().to_string(),
            project_scope: map_project_scope(request.project_scope)?
                .as_str()
                .to_string(),
        })
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let updated = repository
        .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    Ok((
        project_detail_with_logo_from_record(repository, &service.base_path, &updated, true, false)
            .await?,
        ctx,
    ))
}

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

pub(crate) async fn project_milestone_create(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<CreateProjectMilestoneRequestView<'static>>,
) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "milestone requires repository backend",
        ));
    };
    require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "milestone create is not allowed",
        ));
    }
    let input = milestone_mutation_input(
        request.owner_name,
        request.project_name,
        session.user_id,
        request.title,
        request.contents_markdown,
        request.due_date,
        request.state,
        &request.attachment_ids,
    )?;
    if repository
        .project_milestone_title_exists(
            request.owner_name,
            request.project_name,
            &input.title,
            None,
        )
        .await
        .map_err(internal_error)?
    {
        return Err(ConnectError::invalid_argument(
            "milestone title is duplicated",
        ));
    }
    let milestone = repository
        .create_project_milestone(input)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let mut milestone = issue_milestone_from_record_with_issue_references(
        repository,
        &authorization,
        session.user_id,
        &milestone,
        &service.base_path,
    )
    .await?;
    milestone.viewer_can_update = true;
    milestone.viewer_can_delete = true;
    Ok((
        ProjectMilestoneMutationResponse {
            milestone: Some(milestone).into(),
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_milestone_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateProjectMilestoneRequestView<'static>>,
) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "milestone requires repository backend",
        ));
    };
    require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "milestone update is not allowed",
        ));
    }
    let input = milestone_mutation_input(
        request.owner_name,
        request.project_name,
        session.user_id,
        request.title,
        request.contents_markdown,
        request.due_date,
        request.state,
        &request.attachment_ids,
    )?;
    if repository
        .project_milestone_title_exists(
            request.owner_name,
            request.project_name,
            &input.title,
            Some(request.milestone_id),
        )
        .await
        .map_err(internal_error)?
    {
        return Err(ConnectError::invalid_argument(
            "milestone title is duplicated",
        ));
    }
    let milestone = repository
        .update_project_milestone(persistence::UpdateMilestoneInput {
            milestone_id: request.milestone_id,
            values: input,
        })
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("milestone not found"))?;
    let mut milestone = issue_milestone_from_record_with_issue_references(
        repository,
        &authorization,
        session.user_id,
        &milestone,
        &service.base_path,
    )
    .await?;
    milestone.viewer_can_update = true;
    milestone.viewer_can_delete = true;
    Ok((
        ProjectMilestoneMutationResponse {
            milestone: Some(milestone).into(),
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_milestone_delete(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<DeleteProjectMilestoneRequestView<'static>>,
) -> Result<(ProjectMilestoneDeleteResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "milestone requires repository backend",
        ));
    };
    require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.user_id,
    )
    .await?;
    if !project_update_allowed(&authorization)? {
        return Err(ConnectError::permission_denied(
            "milestone delete is not allowed",
        ));
    }
    let ok = repository
        .delete_project_milestone(
            request.owner_name,
            request.project_name,
            request.milestone_id,
        )
        .await
        .map_err(internal_error)?;
    if !ok {
        return Err(ConnectError::not_found("milestone not found"));
    }
    Ok((
        ProjectMilestoneDeleteResponse {
            ok,
            ..Default::default()
        },
        ctx,
    ))
}

async fn direct_toggle_project_watch(
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
    };
    match rest_toggle_project_watch(headers, owner_name, project_name, watching, service).await {
        Ok(_) => StatusCode::OK.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_delete_project_pushed_branch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pushed_branch_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner_name,
        &project_name,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    let project = match repository
        .read_project_by_owner_and_name(&owner_name, &project_name)
        .await
    {
        Ok(Some(project)) => project,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    match repository
        .delete_project_pushed_branch_by_id(project.id, pushed_branch_id)
        .await
    {
        Ok(_) => StatusCode::OK.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_accept_project_transfer(
    headers: HeaderMap,
    transfer_id: i64,
    confirm_key: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let session = match require_session(&session_manager, &headers) {
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

    match repository.accept_project_transfer(transfer.id).await {
        Ok(Some(project)) => redirect_to(
            &base_path,
            &format!("/{}/{}", project.owner_name, project.project_name),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_render_markdown(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: DirectMarkdownRenderBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    _base_path: String,
) -> Response {
    let markdown = body.body.as_deref().unwrap_or_default();
    if let PilotBackend::Repository(repository) = &backend {
        let actor_id = session_manager
            .read_session_from_headers(&headers)
            .and_then(|session| session.user_id);
        if let Err(error) =
            require_project_read(repository, &owner_name, &project_name, actor_id).await
        {
            return direct_status_from_connect_error(error).into_response();
        }
    }

    Json(DirectMarkdownRenderResponse {
        body_markdown: markdown.to_string(),
        breaks: body.breaks.unwrap_or(true),
    })
    .into_response()
}

fn direct_milestone_input_from_form(
    owner: &str,
    project: &str,
    actor_id: Option<i64>,
    form: &HashMap<String, String>,
) -> Result<persistence::MilestoneMutationInput, ConnectError> {
    let title = form_value(form, &["title"]).trim().to_string();
    if title.is_empty() {
        return Err(ConnectError::invalid_argument("milestone.error.title"));
    }
    Ok(persistence::MilestoneMutationInput {
        actor_id,
        attachment_ids: parse_attachment_ids(form_value(
            form,
            &["attachmentIds", "attachment_ids"],
        )),
        contents_markdown: form_value(form, &["contents", "contentsMarkdown", "contents_markdown"])
            .to_string(),
        due_date: parse_milestone_due_date(form_value(form, &["dueDate", "due_date"]))?,
        owner_name: owner.to_string(),
        project_name: project.to_string(),
        state: normalize_milestone_state(form_value(form, &["state"]))?,
        title,
    })
}

fn connect_error_to_status(error: ConnectError) -> Response {
    if error.to_string().contains("invalid") || error.to_string().contains("required") {
        StatusCode::BAD_REQUEST.into_response()
    } else {
        StatusCode::INTERNAL_SERVER_ERROR.into_response()
    }
}

async fn direct_create_project_milestone(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let session = match direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        Ok(session) => session,
        Err(response) => return response,
    };
    let input = match direct_milestone_input_from_form(&owner, &project, session.user_id, &form) {
        Ok(input) => input,
        Err(error) => return connect_error_to_status(error),
    };
    match repository
        .project_milestone_title_exists(&owner, &project, &input.title, None)
        .await
    {
        Ok(true) => return StatusCode::BAD_REQUEST.into_response(),
        Ok(false) => {}
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
    match repository.create_project_milestone(input).await {
        Ok(Some(milestone)) => redirect_to(
            &base_path,
            &format!("/{owner}/{project}/milestone/{}", milestone.id),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_update_project_milestone(
    headers: HeaderMap,
    owner: String,
    project: String,
    milestone_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let session = match direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        Ok(session) => session,
        Err(response) => return response,
    };
    let input = match direct_milestone_input_from_form(&owner, &project, session.user_id, &form) {
        Ok(input) => input,
        Err(error) => return connect_error_to_status(error),
    };
    match repository
        .project_milestone_title_exists(&owner, &project, &input.title, Some(milestone_id))
        .await
    {
        Ok(true) => return StatusCode::BAD_REQUEST.into_response(),
        Ok(false) => {}
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
    match repository
        .update_project_milestone(persistence::UpdateMilestoneInput {
            milestone_id,
            values: input,
        })
        .await
    {
        Ok(Some(milestone)) => redirect_to(
            &base_path,
            &format!("/{owner}/{project}/milestone/{}", milestone.id),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_update_project_milestone_state(
    headers: HeaderMap,
    owner: String,
    project: String,
    milestone_id: i64,
    state: &str,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .update_project_milestone_state(&owner, &project, milestone_id, state)
        .await
    {
        Ok(Some(milestone)) => redirect_to(
            &base_path,
            &format!("/{owner}/{project}/milestone/{}", milestone.id),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_delete_project_milestone(
    headers: HeaderMap,
    owner: String,
    project: String,
    milestone_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .delete_project_milestone(&owner, &project, milestone_id)
        .await
    {
        Ok(true) => redirect_to(&base_path, &format!("/{owner}/{project}/milestones")),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDirectoryItem {
    created_label: String,
    last_pushed_label: String,
    logo_url: String,
    member_count: u32,
    overview: String,
    owner_name: String,
    project_name: String,
    project_scope: String,
    watch_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDirectoryResponse {
    items: Vec<RestProjectDirectoryItem>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestOrganizationBody {
    description: String,
    logo_attachment_id: Option<i64>,
    organization_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestOrganizationMemberBody {
    login_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestOrganizationMemberRoleBody {
    role: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectMemberBody {
    login_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectMemberRoleBody {
    role: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectMemberRoleOption {
    role: String,
    label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectMemberEntry {
    avatar_url: String,
    is_owner: bool,
    login_id: String,
    role: String,
    user_id: i64,
    user_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectEnrollmentRequestEntry {
    avatar_url: String,
    login_id: String,
    user_id: i64,
    user_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectMemberDirectoryResponse {
    enrollment_requests: Vec<RestProjectEnrollmentRequestEntry>,
    members: Vec<RestProjectMemberEntry>,
    owner_name: String,
    project_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    redirect_path: Option<String>,
    role_options: Vec<RestProjectMemberRoleOption>,
    viewer_can_update: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectCreateBody {
    board: Option<bool>,
    code: Option<bool>,
    issue: Option<bool>,
    milestone: Option<bool>,
    overview: String,
    pull_request: Option<bool>,
    project_name: String,
    project_scope: String,
    review: Option<bool>,
    vcs: Option<String>,
}

#[derive(Deserialize)]
struct RestProjectCreateFormOptionsQuery {
    owner: Option<String>,
}

#[derive(Serialize)]
struct RestProjectCreateOwnerOption {
    #[serde(rename = "ownerName")]
    owner_name: String,
    organization: bool,
    selected: bool,
}

#[derive(Serialize)]
struct RestProjectCreateFormOptionsResponse {
    #[serde(rename = "ownerOptions")]
    owner_options: Vec<RestProjectCreateOwnerOption>,
    #[serde(rename = "selectedOwnerName")]
    selected_owner_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectUpdateBody {
    board: Option<bool>,
    code: Option<bool>,
    default_reviewer_count: Option<u32>,
    issue: Option<bool>,
    is_using_reviewer_count: Option<bool>,
    logo_attachment_id: Option<i64>,
    milestone: Option<bool>,
    overview: String,
    pull_request: Option<bool>,
    project_name: String,
    project_scope: String,
    review: Option<bool>,
}

#[derive(Clone, Copy)]
struct RestProjectReviewerSettings {
    default_reviewer_count: Option<u32>,
    is_using_reviewer_count: Option<bool>,
}

impl RestProjectCreateBody {
    fn menu_settings(&self) -> Option<persistence::ProjectMenuSettingsRecord> {
        rest_project_menu_settings(
            self.code,
            self.issue,
            self.pull_request,
            self.review,
            self.milestone,
            self.board,
        )
    }

    fn normalized_vcs(&self) -> Result<&'static str, RestRouteError> {
        let Some(vcs) = self.vcs.as_deref() else {
            return Ok("GIT");
        };
        match vcs.trim().to_ascii_lowercase().as_str() {
            "" | "git" => Ok("GIT"),
            "svn" | "subversion" => Ok("Subversion"),
            _ => Err(RestRouteError::bad_request("invalid project VCS")),
        }
    }
}

impl RestProjectUpdateBody {
    fn reviewer_settings(&self) -> Option<RestProjectReviewerSettings> {
        if self.default_reviewer_count.is_none() && self.is_using_reviewer_count.is_none() {
            return None;
        }

        Some(RestProjectReviewerSettings {
            default_reviewer_count: self.default_reviewer_count,
            is_using_reviewer_count: self.is_using_reviewer_count,
        })
    }

    fn menu_settings(&self) -> Option<persistence::ProjectMenuSettingsRecord> {
        rest_project_menu_settings(
            self.code,
            self.issue,
            self.pull_request,
            self.review,
            self.milestone,
            self.board,
        )
    }
}

pub(crate) fn rest_project_menu_settings(
    code: Option<bool>,
    issue: Option<bool>,
    pull_request: Option<bool>,
    review: Option<bool>,
    milestone: Option<bool>,
    board: Option<bool>,
) -> Option<persistence::ProjectMenuSettingsRecord> {
    if code.is_none()
        && issue.is_none()
        && pull_request.is_none()
        && review.is_none()
        && milestone.is_none()
        && board.is_none()
    {
        return None;
    }

    Some(persistence::ProjectMenuSettingsRecord {
        board: board.unwrap_or(false),
        code: code.unwrap_or(false),
        issue: issue.unwrap_or(false),
        milestone: milestone.unwrap_or(false),
        pull_request: pull_request.unwrap_or(false),
        review: review.unwrap_or(false),
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectContainerResponse {
    #[serde(flatten)]
    container: ProjectContainer,
    dashboard: RestProjectDashboard,
    history: RestProjectHistory,
    readme_file: Option<RestProjectReadmeFile>,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDashboard {
    assignees: Vec<RestProjectDashboardAssignee>,
    labels: Vec<RestProjectDashboardLabel>,
    unassigned_open_issue_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDashboardAssignee {
    avatar_url: String,
    login_id: String,
    open_issue_count: u32,
    user_id: i64,
    user_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDashboardLabel {
    category_id: Option<i64>,
    category_is_exclusive: bool,
    category_name: String,
    color: String,
    id: i64,
    name: String,
    open_issue_count: u32,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectHistory {
    items: Vec<RestProjectHistoryItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectHistoryItem {
    actor_avatar_url: String,
    actor_name: String,
    actor_url: String,
    created_label: String,
    item_type: String,
    short_title: String,
    #[serde(skip)]
    sort_key: i64,
    title: String,
    url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectReadmeFile {
    body_html: String,
    body_markdown: String,
    mention_references: Vec<RestMentionReferenceMetadata>,
    name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectWatcher {
    avatar_url: String,
    login_id: String,
    user_id: i64,
    user_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectWatchersResponse {
    owner_name: String,
    project_name: String,
    total_count: u32,
    watchers: Vec<RestProjectWatcher>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectWebhook {
    git_push: bool,
    id: i64,
    payload_url: String,
    secret: String,
    webhook_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectWebhookDelivery {
    created_label: String,
    error_message: Option<String>,
    event_type: String,
    id: i64,
    payload_url: String,
    request_body: String,
    response_body: Option<String>,
    status: String,
    webhook_id: i64,
    webhook_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectWebhooksResponse {
    deliveries: Vec<RestProjectWebhookDelivery>,
    owner_name: String,
    project_name: String,
    viewer_can_update: bool,
    webhook_types: Vec<&'static str>,
    webhooks: Vec<RestProjectWebhook>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectWebhookBody {
    #[serde(default)]
    git_push: bool,
    payload_url: String,
    #[serde(default)]
    secret: String,
    webhook_type: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectTransferBody {
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectOverviewBody {
    overview: String,
}

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
struct RestProjectForkBody {
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

async fn rest_reject_legacy_guest_prohibited_user(
    headers: &HeaderMap,
    service: &PilotServiceImpl,
) -> Result<(), RestRouteError> {
    let Some(user_id) = service
        .session_manager
        .read_session_from_headers(headers)
        .and_then(|session| session.user_id)
    else {
        return Ok(());
    };
    let repository = rest_repository(service)?;
    let user = repository
        .find_user_by_id(user_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::unauthenticated(
                "missing authenticated user",
            ))
        })?;
    if user.is_guest {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("guest users cannot access this route"),
        ));
    }
    Ok(())
}

fn project_member_role_options() -> Vec<RestProjectMemberRoleOption> {
    vec![
        RestProjectMemberRoleOption {
            role: "manager".to_string(),
            label: "manager".to_string(),
        },
        RestProjectMemberRoleOption {
            role: "member".to_string(),
            label: "member".to_string(),
        },
    ]
}

fn project_member_is_owner(
    project: &persistence::ProjectRecord,
    member: &persistence::ProjectMemberRecord,
) -> bool {
    project.organization_id.is_none()
        && normalize_identifier(&project.owner_name) == normalize_identifier(&member.login_id)
}

async fn build_project_member_directory_response(
    repository: &PilotRepository,
    authorization: &persistence::ProjectAuthorizationRecord,
    redirect_path: Option<String>,
) -> Result<RestProjectMemberDirectoryResponse, ConnectError> {
    let directory = repository
        .read_project_members(
            &authorization.project.owner_name,
            &authorization.project.project_name,
        )
        .await
        .map_err(internal_error)?;
    Ok(RestProjectMemberDirectoryResponse {
        enrollment_requests: directory
            .enrollment_requests
            .into_iter()
            .map(|request| RestProjectEnrollmentRequestEntry {
                avatar_url: gravatar_url(&request.email_address),
                login_id: request.login_id,
                user_id: request.user_id,
                user_label: request.user_label,
            })
            .collect(),
        members: directory
            .members
            .into_iter()
            .map(|member| RestProjectMemberEntry {
                avatar_url: gravatar_url(&member.email_address),
                is_owner: project_member_is_owner(&authorization.project, &member),
                login_id: member.login_id,
                role: member.role,
                user_id: member.user_id,
                user_label: member.user_label,
            })
            .collect(),
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        redirect_path,
        role_options: project_member_role_options(),
        viewer_can_update: project_update_allowed(authorization)?,
    })
}

async fn build_project_settings_container_response(
    repository: &PilotRepository,
    public_origin: &str,
    base_path: &str,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
) -> Result<ProjectContainer, ConnectError> {
    let mut container = build_project_container_response(
        repository,
        public_origin,
        base_path,
        authorization,
        actor_id,
    )
    .await?;
    let menu_settings = repository
        .read_project_menu_settings(authorization.project.id)
        .await
        .map_err(internal_error)?;
    container.show_board = menu_settings.board;
    container.show_code = menu_settings.code;
    container.show_issue = menu_settings.issue;
    container.show_milestone = menu_settings.milestone;
    container.show_pull_request = menu_settings.pull_request;
    container.show_review = menu_settings.review;
    Ok(container)
}

fn project_settings_container_json(
    container: ProjectContainer,
    project: &persistence::ProjectRecord,
    max_reviewer_count: u32,
) -> Result<serde_json::Value, ConnectError> {
    let show_board = container.show_board;
    let show_code = container.show_code;
    let show_issue = container.show_issue;
    let show_milestone = container.show_milestone;
    let show_pull_request = container.show_pull_request;
    let show_review = container.show_review;
    let mut value = serde_json::to_value(container)
        .map_err(|error| internal_error(format!("serialize project settings: {error}")))?;
    let Some(object) = value.as_object_mut() else {
        return Err(internal_error("project settings response is not an object"));
    };
    object.insert("showBoard".to_string(), serde_json::json!(show_board));
    object.insert("showCode".to_string(), serde_json::json!(show_code));
    object.insert("showIssue".to_string(), serde_json::json!(show_issue));
    object.insert(
        "showMilestone".to_string(),
        serde_json::json!(show_milestone),
    );
    object.insert(
        "showPullRequest".to_string(),
        serde_json::json!(show_pull_request),
    );
    object.insert("showReview".to_string(), serde_json::json!(show_review));
    object.insert(
        "defaultReviewerCount".to_string(),
        serde_json::json!(project.default_reviewer_count.max(1)),
    );
    object.insert(
        "isUsingReviewerCount".to_string(),
        serde_json::json!(project.is_using_reviewer_count),
    );
    object.insert(
        "maxReviewerCount".to_string(),
        serde_json::json!(max_reviewer_count.max(1)),
    );
    Ok(value)
}

pub(crate) async fn rest_list_projects(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    rest_reject_legacy_guest_prohibited_user(&headers, &service).await?;
    if let PilotBackend::Repository(repository) = &service.backend {
        let records = repository
            .list_projects()
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
        let mut items = Vec::with_capacity(records.len());
        for project in records {
            items.push(RestProjectDirectoryItem {
                created_label: format_project_date_label(project.created_date),
                last_pushed_label: format_project_date_label(project.last_pushed_date),
                logo_url: project_logo_url(repository, &service.base_path, project.id)
                    .await
                    .map_err(RestRouteError::from_connect_error)?,
                member_count: repository
                    .count_project_members(project.id)
                    .await
                    .map_err(internal_error)
                    .map_err(RestRouteError::from_connect_error)?,
                overview: project.overview.unwrap_or_default(),
                owner_name: project.owner_name,
                project_name: project.project_name,
                project_scope: project.project_scope,
                watch_count: repository
                    .count_project_watchers(project.id)
                    .await
                    .map_err(internal_error)
                    .map_err(RestRouteError::from_connect_error)?,
            });
        }
        return Ok(rest_json_response(
            RestProjectDirectoryResponse { items },
            Context::new(headers),
        ));
    }

    let request = ListProjectsRequest::default();
    let request = rest_owned_view::<ListProjectsRequestView<'static>>(&request)?;
    let (payload, ctx) = project_list(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
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

pub(crate) async fn rest_create_project(
    headers: HeaderMap,
    owner_name: String,
    body: RestProjectCreateBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let menu_settings = body.menu_settings();
    let requested_vcs = body.normalized_vcs()?;
    if requested_vcs == "Subversion" {
        yona_rust_vcs::ensure_svnadmin_available()
            .map_err(code_browser_error)
            .map_err(RestRouteError::from_connect_error)?;
    }
    let request = CreateProjectRequest {
        owner_name,
        overview: body.overview,
        project_name: body.project_name,
        project_scope: body.project_scope,
        ..Default::default()
    };
    let request = rest_owned_view::<CreateProjectRequestView<'static>>(&request)?;
    let (mut payload, ctx) = project_create(&service, Context::new(headers.clone()), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    if requested_vcs == "Subversion" {
        let session = require_session(&service.session_manager, &headers)
            .map_err(RestRouteError::from_connect_error)?;
        let actor_id = session.user_id.ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::unauthenticated(
                "missing authenticated session",
            ))
        })?;
        let PilotBackend::Repository(repository) = &service.backend else {
            return Err(RestRouteError::not_implemented(
                "project creation requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(&payload.owner_name, &payload.project_name, Some(actor_id))
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
            .ok_or_else(|| RestRouteError::not_found("project not found"))?;
        let changed = repository
            .change_project_vcs(authorization.project.id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
            .ok_or_else(|| RestRouteError::not_found("project not found"))?;
        reset_project_repository_storage(changed.id, &changed.vcs)?;
        let mut changed_authorization = authorization;
        changed_authorization.project = changed;
        payload = project_detail_with_logo_from_record(
            repository,
            &service.base_path,
            &changed_authorization,
            project_update_allowed(&changed_authorization)
                .map_err(RestRouteError::from_connect_error)?,
            false,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?;
    }
    if let Some(menu_settings) = menu_settings {
        rest_update_project_menu_settings(
            &service,
            &headers,
            &payload.owner_name,
            &payload.project_name,
            menu_settings,
        )
        .await?;
    }
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_project_create_form_options(
    headers: HeaderMap,
    query: RestProjectCreateFormOptionsQuery,
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
            "project create form options require repository backend",
        ));
    };
    let actor = repository
        .find_user_by_id(actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::unauthenticated(
                "missing authenticated user",
            ))
        })?;

    let mut owner_names = Vec::new();
    owner_names.push((actor.login_id.clone(), false));
    let organizations = repository
        .list_organizations()
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    for organization in organizations {
        let Some(authorization) = repository
            .read_organization_authorization(&organization.organization_name, Some(actor_id))
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
        else {
            continue;
        };
        if can_create_organization_project(authorization.viewer.is_organization_admin) {
            owner_names.push((authorization.organization.organization_name, true));
        }
    }

    let requested_owner = query.owner.unwrap_or_default();
    let selected_owner_name = owner_names
        .iter()
        .find(|(owner_name, _)| {
            normalize_identifier(owner_name) == normalize_identifier(&requested_owner)
        })
        .map(|(owner_name, _)| owner_name.clone())
        .unwrap_or_else(|| actor.login_id.clone());
    let owner_options = owner_names
        .into_iter()
        .map(|(owner_name, organization)| RestProjectCreateOwnerOption {
            selected: normalize_identifier(&owner_name)
                == normalize_identifier(&selected_owner_name),
            owner_name,
            organization,
        })
        .collect();

    Ok(Json(RestProjectCreateFormOptionsResponse {
        owner_options,
        selected_owner_name,
    })
    .into_response())
}

pub(crate) async fn rest_read_project_detail(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadProjectDetailRequest {
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ReadProjectDetailRequestView<'static>>(&request)?;
    let (payload, ctx) = project_detail_read(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_read_project_container(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadProjectContainerRequest {
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ReadProjectContainerRequestView<'static>>(&request)?;
    let context = Context::new(headers.clone());
    let (payload, ctx) = project_container_read(&service, context, request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let readme_file = rest_project_readme_file(&service, &headers, &payload)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let dashboard = rest_project_home_dashboard(&service, &headers, &payload)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let history = rest_project_home_history(&service, &payload)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(
        RestProjectContainerResponse {
            container: payload,
            dashboard,
            history,
            readme_file,
        },
        ctx,
    ))
}

async fn rest_project_home_dashboard(
    service: &PilotServiceImpl,
    headers: &HeaderMap,
    container: &ProjectContainer,
) -> Result<RestProjectDashboard, ConnectError> {
    if !container.show_issue {
        return Ok(RestProjectDashboard::default());
    }
    let actor_id = service
        .session_manager
        .read_session_from_headers(headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Ok(RestProjectDashboard::default());
    };
    let authorization = repository
        .read_project_authorization(&container.owner_name, &container.project_name, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let assignees = repository
        .list_project_dashboard_assignees(authorization.project.id)
        .await
        .map_err(internal_error)?
        .into_iter()
        .map(|assignee| RestProjectDashboardAssignee {
            avatar_url: gravatar_url(&assignee.email_address),
            login_id: assignee.login_id,
            open_issue_count: assignee.open_issue_count,
            user_id: assignee.user_id,
            user_label: assignee.user_label,
        })
        .collect();
    let labels = repository
        .list_project_dashboard_labels(authorization.project.id)
        .await
        .map_err(internal_error)?
        .into_iter()
        .map(|label| RestProjectDashboardLabel {
            category_id: label.category_id,
            category_is_exclusive: label.category_is_exclusive,
            category_name: label.category_name,
            color: label.color,
            id: label.id,
            name: label.name,
            open_issue_count: label.open_issue_count,
        })
        .collect();
    let unassigned_open_issue_count = repository
        .count_unassigned_open_issues_for_project(authorization.project.id)
        .await
        .map_err(internal_error)?;
    Ok(RestProjectDashboard {
        assignees,
        labels,
        unassigned_open_issue_count,
    })
}

async fn rest_project_home_history(
    service: &PilotServiceImpl,
    container: &ProjectContainer,
) -> Result<RestProjectHistory, ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Ok(RestProjectHistory::default());
    };
    let mut items: Vec<RestProjectHistoryItem> = repository
        .list_project_home_history_items(&container.owner_name, &container.project_name)
        .await
        .map_err(internal_error)?
        .into_iter()
        .map(|item| RestProjectHistoryItem {
            actor_avatar_url: gravatar_url(&item.actor_email_address),
            actor_name: item.actor_name,
            actor_url: if item.actor_login_id.trim().is_empty() {
                "#".to_string()
            } else {
                base_path_href(&service.base_path, &format!("/{}", item.actor_login_id))
            },
            created_label: item.created_label,
            item_type: item.item_type,
            short_title: item.short_title,
            sort_key: item
                .created_at
                .map(|value| value.and_utc().timestamp())
                .unwrap_or_default(),
            title: item.title,
            url: base_path_href(&service.base_path, &item.url_path),
        })
        .collect();
    if let Some(project) = repository
        .read_project_by_owner_and_name(&container.owner_name, &container.project_name)
        .await
        .map_err(internal_error)?
    {
        let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), project.id);
        for commit in yona_rust_vcs::read_project_history_commits(&repo_path, 10)
            .map_err(code_browser_error)?
        {
            items.push(rest_project_history_item_from_commit(
                &service.base_path,
                &container.owner_name,
                &container.project_name,
                commit,
            ));
        }
    }
    items.sort_by(|left, right| {
        right
            .sort_key
            .cmp(&left.sort_key)
            .then(right.url.cmp(&left.url))
    });
    Ok(RestProjectHistory { items })
}

fn rest_project_history_item_from_commit(
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    commit: ProjectHistoryCommitRecord,
) -> RestProjectHistoryItem {
    RestProjectHistoryItem {
        actor_avatar_url: gravatar_url(&commit.author_email),
        actor_name: if commit.author_name.trim().is_empty() {
            commit.author_email.clone()
        } else {
            commit.author_name
        },
        actor_url: "#".to_string(),
        created_label: commit.author_date,
        item_type: "commit".to_string(),
        short_title: commit.commit_short_id,
        sort_key: commit.author_timestamp,
        title: commit.short_message,
        url: base_path_href(
            base_path,
            &format!("/{owner_name}/{project_name}/commit/{}", commit.commit_id),
        ),
    }
}

async fn rest_project_readme_file(
    service: &PilotServiceImpl,
    headers: &HeaderMap,
    container: &ProjectContainer,
) -> Result<Option<RestProjectReadmeFile>, ConnectError> {
    if !container.show_code {
        return Ok(None);
    }
    let actor_id = service
        .session_manager
        .read_session_from_headers(headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Ok(None);
    };
    let authorization = repository
        .read_project_authorization(&container.owner_name, &container.project_name, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), authorization.project.id);
    let mut readme = project_readme_file_from_git(
        &repo_path,
        &service.base_path,
        &authorization.project.owner_name,
        &authorization.project.project_name,
    )?;
    if let Some(readme) = readme.as_mut() {
        readme.mention_references =
            markdown_mention_references(repository, &[readme.body_markdown.as_str()])
                .await?
                .iter()
                .map(rest_mention_reference_metadata_from_resolved)
                .collect();
    }
    Ok(readme)
}

fn project_readme_file_from_git(
    repo_path: &StdPath,
    base_path: &str,
    owner_name: &str,
    project_name: &str,
) -> Result<Option<RestProjectReadmeFile>, ConnectError> {
    for candidate in [
        "README.md",
        "readme.md",
        "README.markdown",
        "readme.markdown",
    ] {
        match yona_rust_vcs::read_code_browser(repo_path, None, candidate) {
            Ok(snapshot) => {
                let Some(file) = snapshot.file else {
                    continue;
                };
                if !code_file_record_is_renderable_markdown(&file) {
                    continue;
                }
                let body_markdown = rewrite_project_readme_markdown_links(
                    &file.text,
                    base_path,
                    owner_name,
                    project_name,
                    &snapshot.selected_branch,
                );
                return Ok(Some(RestProjectReadmeFile {
                    body_html: String::new(),
                    body_markdown,
                    mention_references: Vec::new(),
                    name: file.name,
                }));
            }
            Err(VcsError::NotFound) => continue,
            Err(error) => return Err(code_browser_error(error)),
        }
    }

    Ok(None)
}

pub(crate) async fn rest_read_project_settings(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadProjectSettingsRequest {
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ReadProjectSettingsRequestView<'static>>(&request)?;
    let (payload, ctx) = project_settings_read(&service, Context::new(headers.clone()), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(&payload.owner_name, &payload.project_name, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    let payload = build_project_settings_container_response(
        repository,
        &service.public_origin,
        &service.base_path,
        &authorization,
        actor_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let max_reviewer_count = repository
        .count_project_members(authorization.project.id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .max(1);
    let payload =
        project_settings_container_json(payload, &authorization.project, max_reviewer_count)
            .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_read_project_members(
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
            "project members require repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    if !project_update_allowed(&authorization).map_err(RestRouteError::from_connect_error)? {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("project update is not allowed"),
        ));
    }

    let payload = build_project_member_directory_response(repository, &authorization, None)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(payload).into_response())
}

pub(crate) async fn rest_add_project_member(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectMemberBody,
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
            "project members require repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    if !project_update_allowed(&authorization).map_err(RestRouteError::from_connect_error)? {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("project update is not allowed"),
        ));
    }

    let login_id = body.login_id.trim();
    if login_id.is_empty() {
        return Err(RestRouteError::from_connect_error(
            ConnectError::invalid_argument("project.members.addMember"),
        ));
    }
    let target_user = repository
        .find_user_by_login_id(login_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::invalid_argument(
                "project.member.notExist",
            ))
        })?;
    let directory = repository
        .read_project_members(&owner_name, &project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    if directory
        .members
        .iter()
        .any(|member| member.user_id == target_user.id)
    {
        return Err(RestRouteError::from_connect_error(
            ConnectError::invalid_argument("project.member.alreadyMember"),
        ));
    }

    repository
        .add_project_membership(authorization.project.id, target_user.id, "member")
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    repository
        .delete_project_enrollment_request(authorization.project.id, target_user.id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    repository
        .create_project_member_accept_notification(
            authorization.project.id,
            actor_id,
            target_user.id,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;

    let refreshed = repository
        .read_project_authorization(&owner_name, &project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    let payload = build_project_member_directory_response(repository, &refreshed, None)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(payload).into_response())
}

pub(crate) async fn rest_update_project_member_role(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    user_id: i64,
    body: RestProjectMemberRoleBody,
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
            "project members require repository backend",
        ));
    };
    let role = normalize_identifier(&body.role);
    if !matches!(role.as_str(), "manager" | "member") {
        return Err(RestRouteError::from_connect_error(
            ConnectError::invalid_argument("project member role is invalid"),
        ));
    }
    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    if !project_update_allowed(&authorization).map_err(RestRouteError::from_connect_error)? {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("project update is not allowed"),
        ));
    }

    let directory = repository
        .read_project_members(&owner_name, &project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let Some(current_member) = directory
        .members
        .iter()
        .find(|member| member.user_id == user_id)
    else {
        return Err(RestRouteError::from_connect_error(ConnectError::not_found(
            "project member not found",
        )));
    };
    if project_member_is_owner(&authorization.project, current_member) {
        return Err(RestRouteError::from_connect_error(
            ConnectError::invalid_argument("project.member.ownerMustBeAManager"),
        ));
    }

    repository
        .add_project_membership(authorization.project.id, user_id, &role)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let refreshed = repository
        .read_project_authorization(&owner_name, &project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    let payload = build_project_member_directory_response(repository, &refreshed, None)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(payload).into_response())
}

pub(crate) async fn rest_delete_project_member(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    user_id: i64,
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
            "project members require repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    let can_update =
        project_update_allowed(&authorization).map_err(RestRouteError::from_connect_error)?;
    if !can_update && actor_id != user_id {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("project update is not allowed"),
        ));
    }

    let directory = repository
        .read_project_members(&owner_name, &project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let current_member = directory
        .members
        .iter()
        .find(|member| member.user_id == user_id);
    if let Some(current_member) = current_member {
        if project_member_is_owner(&authorization.project, current_member) {
            return Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("project.member.ownerCannotLeave"),
            ));
        }
        repository
            .delete_project_membership(authorization.project.id, user_id)
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
    }

    let self_leave_redirect = if actor_id == user_id {
        let refreshed = repository
            .read_project_authorization(&owner_name, &project_name, Some(actor_id))
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
            .ok_or_else(|| {
                RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
            })?;
        if project_read_allowed(&refreshed, false).map_err(RestRouteError::from_connect_error)? {
            Some((format!("/{owner_name}/{project_name}"), true))
        } else {
            Some(("/".to_string(), false))
        }
    } else {
        None
    };
    let refreshed = repository
        .read_project_authorization(&owner_name, &project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    if let Some((redirect_path, false)) = self_leave_redirect {
        return Ok(Json(RestProjectMemberDirectoryResponse {
            enrollment_requests: Vec::new(),
            members: Vec::new(),
            owner_name: refreshed.project.owner_name,
            project_name: refreshed.project.project_name,
            redirect_path: Some(redirect_path),
            role_options: project_member_role_options(),
            viewer_can_update: false,
        })
        .into_response());
    }
    let redirect_path = self_leave_redirect
        .map(|(redirect_path, _)| redirect_path)
        .or_else(|| Some(format!("/{owner_name}/{project_name}/members")));
    let payload = build_project_member_directory_response(repository, &refreshed, redirect_path)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(payload).into_response())
}

pub(crate) async fn rest_read_project_watchers(
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
            "project watchers require repository backend",
        ));
    };
    let authorization = require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let watcher_list = repository
        .list_project_watchers(authorization.project.id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;

    let mut watchers = Vec::new();
    for watcher in watcher_list.watchers {
        let Some(watcher_authorization) = repository
            .read_project_authorization(&owner_name, &project_name, Some(watcher.user_id))
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?
        else {
            continue;
        };
        if !project_read_allowed(&watcher_authorization, false)
            .map_err(RestRouteError::from_connect_error)?
        {
            continue;
        }
        watchers.push(RestProjectWatcher {
            avatar_url: gravatar_url(&watcher.email_address),
            login_id: watcher.login_id,
            user_id: watcher.user_id,
            user_label: watcher.user_label,
        });
    }

    Ok(Json(RestProjectWatchersResponse {
        owner_name,
        project_name,
        total_count: watchers.len() as u32,
        watchers,
    })
    .into_response())
}

fn project_webhook_type_options() -> Vec<&'static str> {
    vec!["SIMPLE", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT", "JSON"]
}

fn project_webhook_type_code(value: &str) -> Result<i16, RestRouteError> {
    match value.trim() {
        "SIMPLE" => Ok(0),
        "DETAIL_SLACK" => Ok(1),
        "DETAIL_HANGOUT_CHAT" => Ok(2),
        "JSON" => Ok(3),
        _ => Err(RestRouteError::bad_request("invalid webhook type")),
    }
}

pub(crate) fn project_webhook_type_label(value: i16) -> String {
    match value {
        1 => "DETAIL_SLACK",
        2 => "DETAIL_HANGOUT_CHAT",
        3 => "JSON",
        _ => "SIMPLE",
    }
    .to_string()
}

fn rest_project_webhook_from_record(
    record: persistence::ProjectWebhookRecord,
) -> RestProjectWebhook {
    RestProjectWebhook {
        git_push: record.git_push,
        id: record.id,
        payload_url: record.payload_url,
        secret: record.secret,
        webhook_type: project_webhook_type_label(record.webhook_type),
    }
}

fn rest_project_webhook_delivery_from_record(
    record: persistence::ProjectWebhookDeliveryRecord,
) -> RestProjectWebhookDelivery {
    RestProjectWebhookDelivery {
        created_label: format_project_date_label(record.created_at),
        error_message: record.error_message,
        event_type: record.event_type,
        id: record.id,
        payload_url: record.payload_url,
        request_body: record.request_body,
        response_body: record.response_body,
        status: record.status,
        webhook_id: record.webhook_id,
        webhook_type: record.webhook_type,
    }
}

fn build_project_webhooks_response(
    authorization: &persistence::ProjectAuthorizationRecord,
    webhooks: persistence::ProjectWebhookListRecord,
    deliveries: Vec<persistence::ProjectWebhookDeliveryRecord>,
) -> Result<RestProjectWebhooksResponse, RestRouteError> {
    Ok(RestProjectWebhooksResponse {
        deliveries: deliveries
            .into_iter()
            .map(rest_project_webhook_delivery_from_record)
            .collect(),
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        viewer_can_update: project_update_allowed(authorization)
            .map_err(RestRouteError::from_connect_error)?,
        webhook_types: project_webhook_type_options(),
        webhooks: webhooks
            .webhooks
            .into_iter()
            .map(rest_project_webhook_from_record)
            .collect(),
    })
}

fn legacy_webhook_event_key<'a>(event_type: &'a str) -> &'a str {
    match event_type {
        "NEW_COMMENT" => "notification.type.new.comment",
        "NEW_ISSUE" => "notification.type.new.issue",
        "NEW_PULL_REQUEST" => "notification.type.new.pullrequest",
        "NEW_REVIEW_COMMENT" => "notification.type.new.simple.comment",
        "PULL_REQUEST_MERGED" => "pullRequest.event.message.merged",
        _ => event_type,
    }
}

fn legacy_pull_request_review_key(reviewed: bool) -> &'static str {
    if reviewed {
        "notification.pullrequest.reviewed"
    } else {
        "notification.pullrequest.unreviewed"
    }
}

fn legacy_webhook_link(url: &str, label: &str, escape_label: bool) -> String {
    let label = if escape_label {
        label.replace('>', "&gt;")
    } else {
        label.to_string()
    };
    format!(" <{url}|{label}>")
}

fn legacy_hangout_thread_json(thread_name: Option<&str>) -> serde_json::Value {
    match thread_name {
        Some(name) if !name.trim().is_empty() => serde_json::json!({ "name": name }),
        _ => serde_json::json!({}),
    }
}

fn webhook_response_thread_name(response_body: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(response_body).ok()?;
    match value.get("thread")?.get("name")? {
        serde_json::Value::String(name) => Some(name.clone()),
        serde_json::Value::Number(number) => Some(number.to_string()),
        serde_json::Value::Bool(value) => Some(value.to_string()),
        _ => None,
    }
}

async fn read_existing_webhook_thread_name(
    repository: &PilotRepository,
    webhook_id: i64,
    resource_type: &str,
    resource_id: &str,
) -> Option<String> {
    repository
        .read_webhook_thread(webhook_id, resource_type, resource_id)
        .await
        .ok()
        .flatten()
        .map(|record| record.thread_id)
}

async fn persist_hangout_webhook_thread_from_delivery(
    repository: &PilotRepository,
    webhook_id: i64,
    resource_type: &str,
    resource_id: &str,
    existing_thread_name: Option<&str>,
    delivery: Result<WebhookDeliveryOutcome, String>,
) {
    if existing_thread_name.is_some() {
        return;
    }
    let Ok(outcome) = delivery else {
        return;
    };
    let Some(response_body) = outcome.response_body else {
        return;
    };
    let Some(thread_id) = webhook_response_thread_name(&response_body) else {
        return;
    };
    let _ = repository
        .create_webhook_thread(persistence::CreateWebhookThreadInput {
            resource_id: resource_id.to_string(),
            resource_type: resource_type.to_string(),
            thread_id,
            webhook_id,
        })
        .await;
}

pub(crate) async fn record_project_webhook_delivery(
    repository: &PilotRepository,
    webhook: &persistence::ProjectWebhookRecord,
    event_type: &str,
    webhook_type: &str,
    request_body: &str,
    delivery: &Result<WebhookDeliveryOutcome, String>,
) {
    let (status, response_body, error_message) = match delivery {
        Ok(outcome) => (
            "SUCCESS".to_string(),
            outcome.response_body.clone(),
            None::<String>,
        ),
        Err(error) => ("FAILURE".to_string(), None, Some(error.clone())),
    };
    let _ = repository
        .create_webhook_delivery(persistence::CreateWebhookDeliveryInput {
            error_message,
            event_type: event_type.to_string(),
            payload_url: webhook.payload_url.clone(),
            request_body: request_body.to_string(),
            response_body,
            status,
            webhook_id: webhook.id,
            webhook_type: webhook_type.to_string(),
        })
        .await;
}

fn issue_webhook_payload(
    webhook: &persistence::ProjectWebhookRecord,
    issue: &persistence::IssueRecord,
    request_message: &str,
    detail_markdown: &str,
    thread_name: Option<&str>,
) -> String {
    match webhook.webhook_type {
        1 => {
            let mut fields = Vec::new();
            if !issue.milestone_title.trim().is_empty() {
                fields.push(serde_json::json!({
                    "title": "notification.type.milestone.changed",
                    "value": issue.milestone_title,
                    "short": true,
                }));
            }
            fields.push(serde_json::json!({
                "title": "",
                "value": issue.assignee_label,
                "short": true,
            }));
            fields.push(serde_json::json!({
                "title": "issue.state",
                "value": issue.state,
                "short": true,
            }));
            serde_json::json!({
                "text": request_message,
                "attachments": [{
                    "text": detail_markdown,
                    "fields": fields,
                    "color": "",
                }],
            })
            .to_string()
        }
        2 => serde_json::json!({
            "text": request_message,
            "thread": legacy_hangout_thread_json(thread_name),
        })
        .to_string(),
        _ => serde_json::json!({
            "text": request_message,
        })
        .to_string(),
    }
}

pub(crate) async fn dispatch_issue_webhooks(
    repository: &PilotRepository,
    issue: &persistence::IssueRecord,
    actor: &persistence::AppUserRecord,
    event_type: &str,
    detail_markdown: &str,
    target_fragment: Option<&str>,
    public_origin: &str,
    base_path: &str,
) {
    let Ok(Some(project)) = repository
        .read_project_by_owner_and_name(&issue.owner_name, &issue.project_name)
        .await
    else {
        return;
    };
    let Ok(webhooks) = repository.list_project_webhooks(project.id).await else {
        return;
    };
    if webhooks.webhooks.is_empty() {
        return;
    }

    let mut path = format!(
        "/{}/{}/issue/{}",
        issue.owner_name, issue.project_name, issue.issue_number
    );
    if let Some(fragment) = target_fragment {
        path.push_str(fragment);
    }
    let url = absolute_app_url(public_origin, base_path, &path);
    let target_label = format!("#{}: {}", issue.issue_number, issue.title);
    let resource_id = issue.id.to_string();

    for webhook in webhooks.webhooks {
        if webhook.webhook_type == 3 {
            continue;
        }
        let thread_name = if webhook.webhook_type == 2 {
            read_existing_webhook_thread_name(repository, webhook.id, "ISSUE_POST", &resource_id)
                .await
        } else {
            None
        };
        let webhook_type = project_webhook_type_label(webhook.webhook_type);
        let request_message = format!(
            "[{}] {} {}{}",
            project.project_name,
            actor.display_name,
            legacy_webhook_event_key(event_type),
            legacy_webhook_link(&url, &target_label, webhook.webhook_type == 1)
        );
        let body = issue_webhook_payload(
            &webhook,
            issue,
            &request_message,
            detail_markdown,
            thread_name.as_deref(),
        );
        let request_body = body.clone();
        let delivery = deliver_webhook(OutboundWebhook {
            body,
            event_type: event_type.to_string(),
            payload_url: webhook.payload_url.clone(),
            secret: webhook.secret.clone(),
            webhook_type,
        });
        record_project_webhook_delivery(
            repository,
            &webhook,
            event_type,
            &project_webhook_type_label(webhook.webhook_type),
            &request_body,
            &delivery,
        )
        .await;
        if webhook.webhook_type == 2 {
            persist_hangout_webhook_thread_from_delivery(
                repository,
                webhook.id,
                "ISSUE_POST",
                &resource_id,
                thread_name.as_deref(),
                delivery,
            )
            .await;
        }
    }
}

fn pull_request_webhook_payload(
    webhook: &persistence::ProjectWebhookRecord,
    pull_request: &persistence::PullRequestDetailRecord,
    request_message: &str,
    detail_markdown: &str,
    thread_name: Option<&str>,
) -> String {
    match webhook.webhook_type {
        1 => serde_json::json!({
            "text": request_message,
            "attachments": [{
                "text": detail_markdown,
                "fields": [
                    {
                        "title": "pullRequest.sender",
                        "value": pull_request.contributor.user_label,
                        "short": false,
                    },
                    {
                        "title": "pullRequest.from",
                        "value": pull_request.from_branch,
                        "short": true,
                    },
                    {
                        "title": "pullRequest.to",
                        "value": pull_request.to_branch,
                        "short": true,
                    },
                ],
                "color": "",
            }],
        })
        .to_string(),
        2 => serde_json::json!({
            "text": request_message,
            "thread": legacy_hangout_thread_json(thread_name),
        })
        .to_string(),
        _ => serde_json::json!({
            "text": request_message,
        })
        .to_string(),
    }
}

pub(crate) async fn dispatch_pull_request_webhooks(
    repository: &PilotRepository,
    pull_request: &persistence::PullRequestDetailRecord,
    actor: &persistence::AppUserRecord,
    event_type: &str,
    detail_markdown: &str,
    target_fragment: Option<&str>,
    reviewed: Option<bool>,
    public_origin: &str,
    base_path: &str,
) {
    let Ok(Some(project)) = repository
        .read_project_by_owner_and_name(&pull_request.owner_name, &pull_request.project_name)
        .await
    else {
        return;
    };
    let Ok(webhooks) = repository.list_project_webhooks(project.id).await else {
        return;
    };
    if webhooks.webhooks.is_empty() {
        return;
    }

    let mut path = format!(
        "/{}/{}/pullRequest/{}",
        pull_request.owner_name, pull_request.project_name, pull_request.pull_request_number
    );
    if let Some(fragment) = target_fragment {
        path.push_str(fragment);
    }
    let url = absolute_app_url(public_origin, base_path, &path);
    let target_label = format!(
        "#{}: {}",
        pull_request.pull_request_number, pull_request.title
    );
    let resource_id = pull_request.id.to_string();

    for webhook in webhooks.webhooks {
        if webhook.webhook_type == 3 {
            continue;
        }
        let thread_name = if webhook.webhook_type == 2 {
            read_existing_webhook_thread_name(repository, webhook.id, "PULL_REQUEST", &resource_id)
                .await
        } else {
            None
        };
        let webhook_type = project_webhook_type_label(webhook.webhook_type);
        let link = legacy_webhook_link(&url, &target_label, webhook.webhook_type == 1);
        let request_message = if event_type == "PULL_REQUEST_REVIEW_STATE_CHANGED" {
            format!(
                "[{}] {} {}{}",
                project.project_name,
                legacy_pull_request_review_key(reviewed.unwrap_or(true)),
                actor.display_name,
                link
            )
        } else {
            format!(
                "[{}] {} {}{}",
                project.project_name,
                actor.display_name,
                legacy_webhook_event_key(event_type),
                link
            )
        };
        let body = pull_request_webhook_payload(
            &webhook,
            pull_request,
            &request_message,
            detail_markdown,
            thread_name.as_deref(),
        );
        let request_body = body.clone();
        let delivery = deliver_webhook(OutboundWebhook {
            body,
            event_type: event_type.to_string(),
            payload_url: webhook.payload_url.clone(),
            secret: webhook.secret.clone(),
            webhook_type,
        });
        record_project_webhook_delivery(
            repository,
            &webhook,
            event_type,
            &project_webhook_type_label(webhook.webhook_type),
            &request_body,
            &delivery,
        )
        .await;
        if webhook.webhook_type == 2 {
            persist_hangout_webhook_thread_from_delivery(
                repository,
                webhook.id,
                "PULL_REQUEST",
                &resource_id,
                thread_name.as_deref(),
                delivery,
            )
            .await;
        }
    }
}

async fn rest_require_project_update(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    actor_id: Option<i64>,
) -> Result<persistence::ProjectAuthorizationRecord, RestRouteError> {
    let authorization = require_project_read(repository, owner_name, project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    if !project_update_allowed(&authorization).map_err(RestRouteError::from_connect_error)? {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("project update is not allowed"),
        ));
    }
    Ok(authorization)
}

pub(crate) async fn rest_read_project_webhooks(
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
            "project webhooks require repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, actor_id).await?;
    let webhooks = repository
        .list_project_webhooks(authorization.project.id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let deliveries = repository
        .list_project_webhook_deliveries(authorization.project.id, 20)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(build_project_webhooks_response(
        &authorization,
        webhooks,
        deliveries,
    )?)
    .into_response())
}

pub(crate) async fn rest_create_project_webhook(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectWebhookBody,
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
            "project webhooks require repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, Some(actor_id)).await?;
    let payload_url = body.payload_url.trim().to_string();
    let secret = body.secret.trim().to_string();
    if payload_url.is_empty() {
        return Err(RestRouteError::bad_request(
            "project.webhook.payloadUrl.empty",
        ));
    }
    if payload_url.len() > 2000 {
        return Err(RestRouteError::bad_request(
            "project.webhook.payloadUrl.maxLength",
        ));
    }
    if secret.len() > 250 {
        return Err(RestRouteError::bad_request(
            "project.webhook.secret.maxLength",
        ));
    }
    let webhook_type = project_webhook_type_code(&body.webhook_type)?;
    let webhooks = repository
        .create_project_webhook(persistence::CreateProjectWebhookInput {
            git_push: body.git_push,
            payload_url,
            project_id: authorization.project.id,
            secret,
            webhook_type,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let deliveries = repository
        .list_project_webhook_deliveries(authorization.project.id, 20)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(build_project_webhooks_response(
        &authorization,
        webhooks,
        deliveries,
    )?)
    .into_response())
}

pub(crate) async fn rest_delete_project_webhook(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    webhook_id: i64,
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
            "project webhooks require repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, Some(actor_id)).await?;
    let Some(webhooks) = repository
        .delete_project_webhook(authorization.project.id, webhook_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
    else {
        return Err(RestRouteError::not_found("project webhook not found"));
    };
    let deliveries = repository
        .list_project_webhook_deliveries(authorization.project.id, 20)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(build_project_webhooks_response(
        &authorization,
        webhooks,
        deliveries,
    )?)
    .into_response())
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

pub(crate) async fn rest_read_project_transfer(
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

pub(crate) async fn rest_request_project_transfer(
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

pub(crate) async fn rest_read_project_fork_options(
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

pub(crate) async fn rest_fork_project(
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

pub(crate) fn delete_project_repository_storage(project_id: i64) -> Result<(), RestRouteError> {
    let data_root = yona_data_root();
    let git_repo_path = yona_rust_vcs::repository_path(&data_root, project_id);
    let svn_repo_path = yona_rust_vcs::svn_repository_path(&data_root, project_id);
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

fn reset_project_repository_storage(project_id: i64, vcs: &str) -> Result<(), RestRouteError> {
    delete_project_repository_storage(project_id)?;
    let _guard = repository_provisioning_lock()
        .lock()
        .map_err(|_| internal_error("repository provisioning lock poisoned"))
        .map_err(RestRouteError::from_connect_error)?;
    let repo_path = yona_rust_vcs::repository_path_for_vcs(&yona_data_root(), project_id, vcs);
    if vcs == "Subversion" {
        return yona_rust_vcs::create_svn_repository(&repo_path)
            .map_err(code_browser_error)
            .map_err(RestRouteError::from_connect_error);
    }
    yona_rust_vcs::create_bare_repository(&repo_path)
        .map_err(code_browser_error)
        .map_err(RestRouteError::from_connect_error)
}

pub(crate) async fn rest_read_project_change_vcs(
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

pub(crate) async fn rest_change_project_vcs(
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
    reset_project_repository_storage(changed.id, &changed.vcs)?;
    let mut changed_authorization = authorization;
    changed_authorization.project = changed;
    Ok(Json(rest_project_change_vcs_response(
        &changed_authorization,
        Some(format!("/{owner_name}/{project_name}")),
    )?)
    .into_response())
}

pub(crate) async fn rest_update_project(
    headers: HeaderMap,
    current_owner_name: String,
    current_project_name: String,
    body: RestProjectUpdateBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let menu_settings = body.menu_settings();
    let reviewer_settings = body.reviewer_settings();
    let logo_attachment_id = body.logo_attachment_id;
    let owner_name = current_owner_name.clone();
    let request = UpdateProjectRequest {
        current_owner_name,
        current_project_name,
        owner_name,
        overview: body.overview,
        project_name: body.project_name,
        project_scope: body.project_scope,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateProjectRequestView<'static>>(&request)?;
    let (mut payload, ctx) = project_update(&service, Context::new(headers.clone()), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    if let Some(menu_settings) = menu_settings {
        rest_update_project_menu_settings(
            &service,
            &headers,
            &payload.owner_name,
            &payload.project_name,
            menu_settings,
        )
        .await?;
    }
    if let Some(reviewer_settings) = reviewer_settings {
        rest_update_project_reviewer_settings(
            &service,
            &headers,
            &payload.owner_name,
            &payload.project_name,
            reviewer_settings,
        )
        .await?;
    }
    if let Some(logo_attachment_id) = logo_attachment_id.filter(|attachment_id| *attachment_id > 0)
    {
        payload.logo_url = rest_update_project_logo_attachment(
            &service,
            &headers,
            &payload.owner_name,
            &payload.project_name,
            logo_attachment_id,
        )
        .await?;
    }
    Ok(rest_json_response(payload, ctx))
}

async fn rest_update_project_logo_attachment(
    service: &PilotServiceImpl,
    headers: &HeaderMap,
    owner_name: &str,
    project_name: &str,
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
            ConnectError::unimplemented("project logo requires repository backend"),
        ));
    };
    let authorization =
        rest_require_project_update(repository, owner_name, project_name, Some(actor_id)).await?;
    let attachment = repository
        .read_attachment_by_id(attachment_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("attachment not found"))?;
    if !attachment.mime_type.starts_with("image/") || attachment.size > 5 * 1024 * 1024 {
        return Err(RestRouteError::from_connect_error(
            ConnectError::invalid_argument("project logo must be an image no larger than 5MB"),
        ));
    }
    repository
        .set_project_logo_attachment(authorization.project.id, attachment_id, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::permission_denied(
                "project logo attachment is not owned by the actor",
            ))
        })?;
    Ok(base_path_href(
        &service.base_path,
        &format!("/files/{attachment_id}"),
    ))
}

async fn rest_update_project_menu_settings(
    service: &PilotServiceImpl,
    headers: &HeaderMap,
    owner_name: &str,
    project_name: &str,
    menu_settings: persistence::ProjectMenuSettingsRecord,
) -> Result<(), RestRouteError> {
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
        return Err(RestRouteError::not_implemented(
            "project requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(owner_name, project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    if !project_update_allowed(&authorization).map_err(RestRouteError::from_connect_error)? {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("project update is not allowed"),
        ));
    }

    repository
        .set_project_menu_settings(authorization.project.id, menu_settings)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)
}

async fn rest_update_project_reviewer_settings(
    service: &PilotServiceImpl,
    headers: &HeaderMap,
    owner_name: &str,
    project_name: &str,
    reviewer_settings: RestProjectReviewerSettings,
) -> Result<(), RestRouteError> {
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
        return Err(RestRouteError::not_implemented(
            "project requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(owner_name, project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    if !project_update_allowed(&authorization).map_err(RestRouteError::from_connect_error)? {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("project update is not allowed"),
        ));
    }

    let default_reviewer_count = reviewer_settings
        .default_reviewer_count
        .unwrap_or(authorization.project.default_reviewer_count)
        .max(1);
    let is_using_reviewer_count = reviewer_settings
        .is_using_reviewer_count
        .unwrap_or(authorization.project.is_using_reviewer_count);
    repository
        .set_project_reviewer_settings(
            authorization.project.id,
            default_reviewer_count,
            is_using_reviewer_count,
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)
}

async fn rest_update_project_overview(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectOverviewBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = UpdateProjectOverviewRequest {
        owner_name,
        overview: body.overview,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateProjectOverviewRequestView<'static>>(&request)?;
    let (payload, ctx) = project_overview_update(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

async fn direct_update_project_overview(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: Bytes,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let Ok(body) = serde_json::from_slice::<RestProjectOverviewBody>(&body) else {
        return RestRouteError::bad_request("overview is required").into_response();
    };
    let overview = body.overview.trim().to_string();
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_update_project_overview(headers, owner_name, project_name, body, service).await {
        Ok(_) => Json(serde_json::json!({ "overview": overview })).into_response(),
        Err(error) => error.into_response(),
    }
}

pub(crate) async fn rest_delete_project(
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
            "project delete requires repository backend",
        ));
    };
    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, Some(actor_id))
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| {
            RestRouteError::from_connect_error(ConnectError::not_found("project not found"))
        })?;
    if !project_update_allowed(&authorization).map_err(RestRouteError::from_connect_error)? {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("project delete is not allowed"),
        ));
    }
    let project_id = authorization.project.id;

    repository
        .delete_project_by_owner_and_name(&owner_name, &project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    delete_project_repository_storage(project_id)?;

    Ok(Json(RestProjectDeleteResponse {
        ok: true,
        redirect_path: "/".to_string(),
    })
    .into_response())
}

pub(crate) async fn rest_enroll_project(
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

pub(crate) async fn rest_cancel_enroll_project(
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

pub(crate) async fn rest_toggle_favorite_project(
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

pub(crate) async fn rest_toggle_project_watch(
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

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/projects",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_list_projects(headers, service).await }
                }
            }),
        )
        .route(
            "/projects/form-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestProjectCreateFormOptionsQuery>| {
                    let service = service.clone();
                    async move { rest_project_create_form_options(headers, query, service).await }
                }
            }),
        )
        .route(
            "/organizations",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_list_organizations(headers, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<RestOrganizationBody>| {
                    let service = service.clone();
                    async move { rest_create_organization(headers, body, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_organization_detail(headers, organization_name, service).await }
                }
            })
            .patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      Json(body): Json<RestOrganizationBody>| {
                    let service = service.clone();
                    async move { rest_update_organization(headers, organization_name, body, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_delete_organization(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/admin",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_organization_admin(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/container",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_organization_container(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/settings",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_organization_settings(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/members",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_organization_members(headers, organization_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      Json(body): Json<RestOrganizationMemberBody>| {
                    let service = service.clone();
                    async move { rest_add_organization_member(headers, organization_name, body, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/members/{user_id}",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((organization_name, user_id)): Path<(String, i64)>,
                      Json(body): Json<RestOrganizationMemberRoleBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_organization_member_role(
                            headers,
                            organization_name,
                            user_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path((organization_name, user_id)): Path<(String, i64)>| {
                    let service = service.clone();
                    async move { rest_delete_organization_member(headers, organization_name, user_id, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/enrollments/{user_id}/accept",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path((organization_name, user_id)): Path<(String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_accept_organization_enrollment(
                            headers,
                            organization_name,
                            user_id,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/enroll",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_enroll_organization(headers, organization_name, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_cancel_enroll_organization(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/leave",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path(organization_name): Path<String>| {
                    let service = service.clone();
                    async move { rest_leave_organization(headers, organization_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(owner_name): Path<String>,
                      Json(body): Json<RestProjectCreateBody>| {
                    let service = service.clone();
                    async move { rest_create_project(headers, owner_name, body, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_detail(headers, owner_name, project_name, service).await }
                }
            })
            .patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectUpdateBody>| {
                    let service = service.clone();
                    async move { rest_update_project(headers, owner_name, project_name, body, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_delete_project(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/container",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_container(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/settings",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_settings(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/members",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_members(headers, owner_name, project_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectMemberBody>| {
                    let service = service.clone();
                    async move {
                        rest_add_project_member(headers, owner_name, project_name, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/members/{user_id}",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, user_id)): Path<(String, String, i64)>,
                      Json(body): Json<RestProjectMemberRoleBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_project_member_role(
                            headers,
                            owner_name,
                            project_name,
                            user_id,
                            body,
                            service,
                        )
                        .await
                    }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, user_id)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_delete_project_member(
                            headers,
                            owner_name,
                            project_name,
                            user_id,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/watchers",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_watchers(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/webhooks",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_webhooks(headers, owner_name, project_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectWebhookBody>| {
                    let service = service.clone();
                    async move {
                        rest_create_project_webhook(headers, owner_name, project_name, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/webhooks/{webhook_id}",
            delete({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name, webhook_id)): Path<(String, String, i64)>| {
                    let service = service.clone();
                    async move {
                        rest_delete_project_webhook(
                            headers,
                            owner_name,
                            project_name,
                            webhook_id,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/transfer",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_transfer(headers, owner_name, project_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectTransferBody>| {
                    let service = service.clone();
                    async move {
                        rest_request_project_transfer(
                            headers,
                            owner_name,
                            project_name,
                            body,
                            service,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/fork-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_fork_options(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/fork",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectForkBody>| {
                    let service = service.clone();
                    async move { rest_fork_project(headers, owner_name, project_name, body, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/change-vcs",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_read_project_change_vcs(headers, owner_name, project_name, service).await }
                }
            })
            .post({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_change_project_vcs(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/overview",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      Json(body): Json<RestProjectOverviewBody>| {
                    let service = service.clone();
                    async move {
                        rest_update_project_overview(headers, owner_name, project_name, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/enroll",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_enroll_project(headers, owner_name, project_name, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_cancel_enroll_project(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/favorite",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_toggle_favorite_project(headers, owner_name, project_name, service).await }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/watch",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_toggle_project_watch(headers, owner_name, project_name, true, service).await }
                }
            })
            .delete({
                let service = service.clone();
                move |headers: HeaderMap, Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move { rest_toggle_project_watch(headers, owner_name, project_name, false, service).await }
                }
            }),
        )
}

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    let direct_project_watch_backend = backend.clone();
    let direct_project_watch_session_manager = session_manager.clone();
    let direct_project_unwatch_backend = backend.clone();
    let direct_project_unwatch_session_manager = session_manager.clone();
    let legacy_watchers_backend = backend.clone();
    let legacy_watchers_base_path = base_path.clone();
    let legacy_project_labels_backend = backend.clone();
    let legacy_project_labels_session_manager = session_manager.clone();
    let legacy_title_heads_backend = backend.clone();
    let legacy_title_heads_session_manager = session_manager.clone();
    let legacy_project_assignable_backend = backend.clone();
    let legacy_project_assignable_session_manager = session_manager.clone();
    let legacy_milestone_backend = backend.clone();
    let legacy_milestone_session_manager = session_manager.clone();
    let milestone_create_backend = backend.clone();
    let milestone_create_session_manager = session_manager.clone();
    let milestone_create_base_path = base_path.clone();
    let milestone_update_backend = backend.clone();
    let milestone_update_session_manager = session_manager.clone();
    let milestone_update_base_path = base_path.clone();
    let milestone_delete_backend = backend.clone();
    let milestone_delete_session_manager = session_manager.clone();
    let milestone_delete_base_path = base_path.clone();
    let milestone_open_backend = backend.clone();
    let milestone_open_session_manager = session_manager.clone();
    let milestone_open_base_path = base_path.clone();
    let milestone_close_backend = backend.clone();
    let milestone_close_session_manager = session_manager.clone();
    let milestone_close_base_path = base_path.clone();
    let pushed_branch_delete_backend = backend.clone();
    let pushed_branch_delete_session_manager = session_manager.clone();
    let transfer_accept_backend = backend.clone();
    let transfer_accept_session_manager = session_manager.clone();
    let transfer_accept_base_path = base_path.clone();
    let markdown_render_backend = backend.clone();
    let markdown_render_session_manager = session_manager.clone();
    let markdown_render_base_path = base_path.clone();
    let project_overview_update_backend = backend;
    let project_overview_update_session_manager = session_manager;

    Router::new()
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/milestones",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_create_milestones(
                            headers,
                            owner,
                            project_name,
                            body,
                            legacy_milestone_session_manager.clone(),
                            legacy_milestone_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestones",
            post(
                move |headers: HeaderMap,
                      Path((owner, project)): Path<(String, String)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_project_milestone(
                            headers,
                            owner,
                            project,
                            form,
                            milestone_create_session_manager.clone(),
                            milestone_create_backend.clone(),
                            milestone_create_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/edit",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_update_project_milestone(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            form,
                            milestone_update_session_manager.clone(),
                            milestone_update_backend.clone(),
                            milestone_update_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/delete",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_delete_project_milestone(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            milestone_delete_session_manager.clone(),
                            milestone_delete_backend.clone(),
                            milestone_delete_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/open",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_update_project_milestone_state(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            "open",
                            milestone_open_session_manager.clone(),
                            milestone_open_backend.clone(),
                            milestone_open_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/close",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_update_project_milestone_state(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            "closed",
                            milestone_close_session_manager.clone(),
                            milestone_close_backend.clone(),
                            milestone_close_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/labels",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_project_create_labels(
                            headers,
                            owner,
                            project_name,
                            body,
                            legacy_project_labels_session_manager.clone(),
                            legacy_project_labels_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/titleHeads",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Query(query): Query<LegacyProjectTitleHeadsQuery>| {
                    async move {
                        legacy_project_title_heads(
                            headers,
                            owner,
                            project_name,
                            query,
                            legacy_title_heads_session_manager.clone(),
                            legacy_title_heads_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/assignableUsers",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    async move {
                        legacy_external_project_assignable_users(
                            headers,
                            owner,
                            project_name,
                            query,
                            legacy_project_assignable_session_manager.clone(),
                            legacy_project_assignable_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/posts/{number}/watchers",
            get(
                move |Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Query(query): Query<LegacyExternalWatchersQuery>| {
                    async move {
                        legacy_external_watchers(
                            owner,
                            project_name,
                            number,
                            query,
                            legacy_watchers_base_path.clone(),
                            legacy_watchers_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner_name}/{project_name}/watch",
            post(
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    async move {
                        direct_toggle_project_watch(
                            headers,
                            owner_name,
                            project_name,
                            true,
                            direct_project_watch_session_manager.clone(),
                            direct_project_watch_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner_name}/{project_name}/unwatch",
            post(
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    async move {
                        direct_toggle_project_watch(
                            headers,
                            owner_name,
                            project_name,
                            false,
                            direct_project_unwatch_session_manager.clone(),
                            direct_project_unwatch_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}",
            put(
                move |headers: HeaderMap,
                      Path((owner, project)): Path<(String, String)>,
                      body: Bytes| {
                    async move {
                        direct_update_project_overview(
                            headers,
                            owner,
                            project,
                            body,
                            project_overview_update_session_manager.clone(),
                            project_overview_update_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/pushedBranch/{pushed_branch_id}/delete",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, pushed_branch_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_delete_project_pushed_branch(
                            headers,
                            owner,
                            project,
                            pushed_branch_id,
                            pushed_branch_delete_session_manager.clone(),
                            pushed_branch_delete_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/project/transfer/{transfer_id}/{confirm_key}",
            get(
                move |headers: HeaderMap,
                      Path((transfer_id, confirm_key)): Path<(i64, String)>| {
                    async move {
                        direct_accept_project_transfer(
                            headers,
                            transfer_id,
                            confirm_key,
                            transfer_accept_session_manager.clone(),
                            transfer_accept_backend.clone(),
                            transfer_accept_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/markdown/{owner}/{project}",
            post(
                move |headers: HeaderMap,
                      Path((owner, project)): Path<(String, String)>,
                      Json(body): Json<DirectMarkdownRenderBody>| {
                    async move {
                        direct_render_markdown(
                            headers,
                            owner,
                            project,
                            body,
                            markdown_render_session_manager.clone(),
                            markdown_render_backend.clone(),
                            markdown_render_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}

#[derive(Clone, Debug, Deserialize)]
struct LegacyExternalWatchersQuery {
    #[serde(rename = "type")]
    resource_type: Option<String>,
}

async fn legacy_external_watchers(
    owner: String,
    project_name: String,
    number: i64,
    query: LegacyExternalWatchersQuery,
    base_path: String,
    backend: PilotBackend,
) -> Response {
    let Some(resource_type) = query.resource_type.as_deref() else {
        return StatusCode::OK.into_response();
    };
    if !matches!(resource_type, "issues" | "posts") {
        return StatusCode::OK.into_response();
    }
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("watchers require repository backend")
            .into_response();
    };

    let watcher_list = match repository
        .list_legacy_external_post_watchers(&owner, &project_name, number, resource_type, 100)
        .await
    {
        Ok(watcher_list) => watcher_list,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let watcher_payload: Vec<_> = watcher_list
        .watchers
        .into_iter()
        .map(|watcher| {
            serde_json::json!({
                "name": watcher.name,
                "url": base_path_href(&base_path, &format!("/{}", watcher.login_id)),
            })
        })
        .collect();

    Json(serde_json::json!({
        "totalWatchers": watcher_list.total_watchers,
        "watchersInList": watcher_payload.len(),
        "watchers": watcher_payload,
    }))
    .into_response()
}

async fn legacy_external_create_milestones(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let Some(milestones) =
        legacy_json_find_value(&body, "milestones").and_then(|value| value.as_array())
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No milestones key exists or value wasn't array!",
            })),
        )
            .into_response();
    };
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("milestones require repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let authorization =
        match require_project_read(repository, &owner, &project_name, Some(actor_id)).await {
            Ok(authorization) => authorization,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let can_create = match project_update_allowed(&authorization) {
        Ok(can_create) => can_create,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    if !can_create {
        return RestRouteError::from_connect_error(ConnectError::permission_denied(
            "milestone create is not allowed",
        ))
        .into_response();
    }

    let mut results = Vec::new();
    for milestone in milestones {
        let milestone = legacy_milestone_body_from_value(milestone);
        let title = milestone.title.clone();
        match repository
            .project_milestone_title_exists(&owner, &project_name, &title, None)
            .await
        {
            Ok(true) => {
                results.push(serde_json::json!({
                    "milestone": milestone.original,
                    "message": "This milestone title already exists. Please enter a different title.",
                }));
                continue;
            }
            Ok(false) => {}
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        }
        let due_date = match legacy_external_due_on(milestone.due_on.as_deref()) {
            Ok(due_date) => due_date,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
        let state = if milestone
            .state
            .as_deref()
            .is_some_and(|state| state.eq_ignore_ascii_case("closed"))
        {
            "closed"
        } else {
            "open"
        };
        let created = match repository
            .create_project_milestone(persistence::MilestoneMutationInput {
                actor_id: Some(actor_id),
                attachment_ids: Vec::new(),
                contents_markdown: milestone.description.clone(),
                due_date,
                owner_name: owner.clone(),
                project_name: project_name.clone(),
                state: state.to_string(),
                title,
            })
            .await
        {
            Ok(Some(milestone)) => milestone,
            Ok(None) => return RestRouteError::not_found("project not found").into_response(),
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        results.push(legacy_external_milestone_result(&created));
    }

    (StatusCode::CREATED, Json(results)).into_response()
}

#[derive(Clone, Debug)]
struct LegacyMilestoneCreateItem {
    description: String,
    due_on: Option<String>,
    original: serde_json::Value,
    state: Option<String>,
    title: String,
}

fn legacy_milestone_body_from_value(value: &serde_json::Value) -> LegacyMilestoneCreateItem {
    let title = legacy_json_find_value(value, "title")
        .and_then(|value| value.as_str())
        .unwrap_or("No title")
        .to_string();
    let description = legacy_json_find_value(value, "description")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string();
    let due_on = legacy_json_find_value(value, "due_on")
        .and_then(|value| value.as_str())
        .map(ToString::to_string);
    let state = legacy_json_find_value(value, "state")
        .and_then(|value| value.as_str())
        .map(ToString::to_string);

    LegacyMilestoneCreateItem {
        description,
        due_on,
        original: value.clone(),
        state,
        title,
    }
}

fn legacy_external_due_on(value: Option<&str>) -> Result<Option<DateTime>, ConnectError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    DateTime::parse_from_str(&format!("{value} 23:59:59.999"), "%Y-%m-%d %H:%M:%S%.3f")
        .map(Some)
        .map_err(|_| ConnectError::invalid_argument("invalid milestone due_on"))
}

fn legacy_external_milestone_result(
    milestone: &persistence::IssueMilestoneRecord,
) -> serde_json::Value {
    let mut payload = serde_json::json!({
        "id": milestone.id,
        "title": milestone.title,
        "state": milestone.state,
        "description": milestone.contents_markdown,
    });
    if let Some(due_date) = milestone.due_date {
        payload["due_on"] = serde_json::json!(due_date.format("%Y-%m-%d").to_string());
    }
    payload
}

#[derive(Clone, Debug, Default, Deserialize)]
struct LegacyProjectTitleHeadsQuery {
    query: Option<String>,
}

async fn legacy_project_title_heads(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    query: LegacyProjectTitleHeadsQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("project title heads require repository backend")
            .into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization =
        match require_project_read(repository, &owner, &project_name, actor_id).await {
            Ok(authorization) => authorization,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };

    let query = query.query.unwrap_or_default();
    let title_heads = match repository
        .list_legacy_project_title_heads(&owner, &project_name, &query)
        .await
    {
        Ok(title_heads) => title_heads,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let labels = match repository
        .list_project_labels(
            &authorization.project.owner_name,
            &authorization.project.project_name,
        )
        .await
    {
        Ok(labels) => labels,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };

    let mut result = Vec::new();
    for title_head in title_heads {
        result.push(serde_json::json!({
            "name": title_head.name,
            "frequency": title_head.frequency,
            "category": "",
            "searchText": title_head.name,
        }));
    }
    for label in labels {
        result.push(serde_json::json!({
            "name": label.name,
            "frequency": 0,
            "category": label.category_name,
            "categoryId": label.category_id,
            "id": label.id,
            "labelColor": label.color,
            "isExclusive": label.category_is_exclusive,
            "searchText": format!("{}/{}", label.name, label.category_name),
        }));
    }

    Json(serde_json::json!({ "result": result })).into_response()
}

async fn legacy_external_project_assignable_users(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    query: RestIssueAssignableUsersQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented(
            "project assignable users require repository backend",
        )
        .into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if let Err(error) = require_project_read(repository, &owner, &project_name, actor_id).await {
        return RestRouteError::from_connect_error(error).into_response();
    }
    let record = match repository
        .list_project_assignable_users(
            &owner,
            &project_name,
            actor_id,
            &query.query,
            &query.search_type,
            10,
        )
        .await
    {
        Ok(Some(record)) => record,
        Ok(None) => return RestRouteError::not_found("pilot project not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(legacy_external_assignable_users_result(record)).into_response()
}

async fn legacy_project_create_labels(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let Some(labels) = legacy_json_find_value(&body, "labels").and_then(|value| value.as_array())
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No issues key exists or value wasn't array!",
            })),
        )
            .into_response();
    };
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("project labels require repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let authorization =
        match require_project_read(repository, &owner, &project_name, Some(actor_id)).await {
            Ok(authorization) => authorization,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let can_update = match project_update_allowed(&authorization) {
        Ok(can_update) => can_update,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    if !can_update {
        return RestRouteError::from_connect_error(ConnectError::permission_denied(
            "issue label create is not allowed",
        ))
        .into_response();
    }

    let mut results = Vec::new();
    for label in labels {
        let Some(label) = legacy_project_label_body_from_value(label) else {
            return RestRouteError::bad_request("invalid project label payload").into_response();
        };
        let color = match normalize_issue_label_color(&label.label_color) {
            Ok(color) => color,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
        let create_result = match repository
            .create_project_label(persistence::CreateProjectLabelInput {
                category_is_exclusive: label.is_exclusive.is_some(),
                category_name: label.category_name.trim().to_string(),
                label_color: color,
                label_name: label.label_name.trim().to_string(),
                owner_name: owner.clone(),
                project_name: project_name.clone(),
            })
            .await
        {
            Ok(Some(result)) => result,
            Ok(None) => return RestRouteError::not_found("project not found").into_response(),
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        let (created_label, created) = create_result;
        if created {
            results.push(serde_json::json!({
                "status": 201,
                "label": created_label.name,
                "category": created_label.category_name,
                "labelColor": created_label.color,
                "isExclusive": created_label.category_is_exclusive,
            }));
        } else {
            results.push(serde_json::json!({
                "status": 409,
                "reason": "Conflict",
                "message": "Failed to create a new label. The label may already exist.",
                "user": label.original,
            }));
        }
    }

    (StatusCode::CREATED, Json(results)).into_response()
}

#[derive(Clone, Debug)]
struct LegacyProjectLabelCreateItem {
    category_name: String,
    is_exclusive: Option<bool>,
    label_color: String,
    label_name: String,
    original: serde_json::Value,
}

fn legacy_project_label_body_from_value(
    value: &serde_json::Value,
) -> Option<LegacyProjectLabelCreateItem> {
    let category_name = legacy_json_find_value(value, "category")?
        .as_str()?
        .to_string();
    let label_color = legacy_json_find_value(value, "labelColor")?
        .as_str()?
        .to_string();
    let label_name = legacy_json_find_value(value, "labelName")?
        .as_str()?
        .to_string();
    let is_exclusive = legacy_json_find_value(value, "isExclusive")
        .filter(|value| value.is_boolean())
        .and_then(|value| value.as_bool());

    Some(LegacyProjectLabelCreateItem {
        category_name,
        is_exclusive,
        label_color,
        label_name,
        original: value.clone(),
    })
}
