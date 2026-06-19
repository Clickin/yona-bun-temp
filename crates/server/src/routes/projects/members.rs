use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectMemberBody {
    login_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectMemberRoleBody {
    role: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectMemberRoleOption {
    role: String,
    label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectMemberEntry {
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
pub(super) struct RestProjectMemberDirectoryResponse {
    enrollment_requests: Vec<RestProjectEnrollmentRequestEntry>,
    members: Vec<RestProjectMemberEntry>,
    owner_name: String,
    project_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    redirect_path: Option<String>,
    role_options: Vec<RestProjectMemberRoleOption>,
    viewer_can_update: bool,
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
pub(super) async fn rest_read_project_members(
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

pub(super) async fn rest_add_project_member(
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

pub(super) async fn rest_update_project_member_role(
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
