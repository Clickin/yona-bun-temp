use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestIssueAssigneeBody {
    assignee_login_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestIssueSharerBody {
    login_id: String,
    #[serde(default)]
    target_type: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct RestIssueSharerDeleteQuery {
    target_type: String,
}
pub(super) async fn rest_issue_participation(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    service: PilotServiceImpl,
    action: &str,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = IssueParticipationRequest {
        issue_number,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<IssueParticipationRequestView<'static>>(&request)?;
    let context = Context::new(headers);
    let (payload, ctx) = match action {
        "watch" => service.watch_issue(context, request).await,
        "unwatch" => service.unwatch_issue(context, request).await,
        "vote" => service.vote_issue(context, request).await,
        "unvote" => service.unvote_issue(context, request).await,
        _ => Err(ConnectError::invalid_argument(
            "invalid issue participation action",
        )),
    }
    .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn direct_issue_participation(
    headers: HeaderMap,
    owner: String,
    project: String,
    issue_number: i64,
    action: &str,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let session = match service.session_manager.read_session_from_headers(&headers) {
        Some(session) if session.user_id.is_some() => session,
        _ => return StatusCode::UNAUTHORIZED.into_response(),
    };
    if require_valid_csrf(&service.session_manager, &headers, &session).is_err() {
        return StatusCode::FORBIDDEN.into_response();
    }
    let actor = match require_authenticated_user(repository, session.user_id).await {
        Ok(actor) => actor,
        Err(error) => return direct_status_from_connect_error(error).into_response(),
    };
    let access =
        match read_issue_access(repository, &owner, &project, issue_number, Some(actor.id)).await {
            Ok(access) => access,
            Err(error) => return direct_status_from_connect_error(error).into_response(),
        };
    if !access.viewer_can_comment() {
        return StatusCode::FORBIDDEN.into_response();
    }

    match action {
        "vote" => {
            if repository
                .vote_issue(access.issue.id, actor.id)
                .await
                .is_err()
            {
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
        "unvote" => {
            if repository
                .unvote_issue(access.issue.id, actor.id)
                .await
                .is_err()
            {
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
        _ => return StatusCode::BAD_REQUEST.into_response(),
    }

    redirect_to(
        &service.base_path,
        &format!("/{owner}/{project}/issue/{issue_number}"),
    )
}

pub(crate) async fn issue_participation_mutation(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<IssueParticipationRequestView<'static>>,
    action: &str,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id).await?;
    let access = read_issue_access(
        repository,
        &request.owner_name,
        &request.project_name,
        request.issue_number,
        Some(actor.id),
    )
    .await?;
    match action {
        "watch" => repository
            .watch_issue(access.issue.id, actor.id)
            .await
            .map_err(internal_error)?,
        "unwatch" => repository
            .unwatch_issue(access.issue.id, actor.id)
            .await
            .map_err(internal_error)?,
        "vote" => repository
            .vote_issue(access.issue.id, actor.id)
            .await
            .map_err(internal_error)?,
        "unvote" => repository
            .unvote_issue(access.issue.id, actor.id)
            .await
            .map_err(internal_error)?,
        _ => {
            return Err(ConnectError::invalid_argument(
                "invalid issue participation action",
            ));
        }
    }
    let updated = repository
        .read_issue_detail(
            &request.owner_name,
            &request.project_name,
            request.issue_number,
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
    Ok((
        issue_detail_response_from_record(
            &updated,
            false,
            true,
            session.user_id,
            &service.base_path,
        ),
        ctx,
    ))
}

pub(super) async fn rest_issue_comment_participation(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    comment_id: i64,
    service: PilotServiceImpl,
    action: &str,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = IssueCommentParticipationRequest {
        comment_id,
        issue_number,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<IssueCommentParticipationRequestView<'static>>(&request)?;
    let context = Context::new(headers);
    let (payload, ctx) = match action {
        "vote" => service.vote_issue_comment(context, request).await,
        "unvote" => service.unvote_issue_comment(context, request).await,
        _ => Err(ConnectError::invalid_argument(
            "invalid issue comment participation action",
        )),
    }
    .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn issue_comment_participation_mutation(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<IssueCommentParticipationRequestView<'static>>,
    action: &str,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    if request.issue_number <= 0 || request.comment_id <= 0 {
        return Err(ConnectError::invalid_argument(
            "invalid issue comment participation request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id).await?;
    let access = read_issue_access(
        repository,
        &request.owner_name,
        &request.project_name,
        request.issue_number,
        Some(actor.id),
    )
    .await?;
    if !access.viewer_can_comment() {
        return Err(ConnectError::permission_denied(
            "issue comment vote is not allowed",
        ));
    }
    if !access
        .issue
        .comments
        .iter()
        .any(|comment| comment.id == request.comment_id)
    {
        return Err(ConnectError::not_found("pilot issue comment not found"));
    }

    match action {
        "vote" => repository
            .vote_issue_comment(request.comment_id, actor.id)
            .await
            .map_err(internal_error)?,
        "unvote" => {
            if !repository
                .unvote_issue_comment(request.comment_id, actor.id)
                .await
                .map_err(internal_error)?
            {
                return Err(ConnectError::not_found("issue comment vote not found"));
            }
        }
        _ => {
            return Err(ConnectError::invalid_argument(
                "invalid issue comment participation action",
            ));
        }
    }

    let updated = read_issue_access(
        repository,
        &request.owner_name,
        &request.project_name,
        request.issue_number,
        Some(actor.id),
    )
    .await?;
    Ok((
        issue_detail_response_from_access(&updated, Some(actor.id), &service.base_path),
        ctx,
    ))
}

pub(crate) async fn issue_favorite_toggle(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<IssueParticipationRequestView<'static>>,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id).await?;
    let access = read_issue_access(
        repository,
        &request.owner_name,
        &request.project_name,
        request.issue_number,
        Some(actor.id),
    )
    .await?;
    repository
        .toggle_favorite_issue(access.issue.id, actor.id)
        .await
        .map_err(internal_error)?;
    let updated = read_issue_access(
        repository,
        &request.owner_name,
        &request.project_name,
        request.issue_number,
        Some(actor.id),
    )
    .await?;
    Ok((
        issue_detail_response_from_access(&updated, Some(actor.id), &service.base_path),
        ctx,
    ))
}

pub(crate) async fn issue_sharer_mutation(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<IssueShareRequestView<'static>>,
    action: &str,
    target_type: &str,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    if request.owner_name.trim().is_empty()
        || request.project_name.trim().is_empty()
        || request.issue_number <= 0
        || request.login_id.trim().is_empty()
    {
        return Err(ConnectError::invalid_argument(
            "invalid issue sharer request",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue sharer requires repository backend",
        ));
    };
    let access = read_issue_access(
        repository,
        &request.owner_name,
        &request.project_name,
        request.issue_number,
        session.user_id,
    )
    .await?;
    if !access.viewer_can_manage() {
        return Err(ConnectError::permission_denied(
            "issue sharer update is not allowed",
        ));
    }
    let actor = access.actor.as_ref().expect("authenticated issue actor");
    let normalized_target_type = target_type.trim().to_ascii_lowercase();
    let target_users = if normalized_target_type == "project" {
        let project_id = request
            .login_id
            .parse::<i64>()
            .map_err(|_| ConnectError::not_found("issue sharer project not found"))?;
        repository
            .read_public_project_by_id(project_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("issue sharer project not found"))?;
        repository
            .list_project_member_users(project_id)
            .await
            .map_err(internal_error)?
    } else if normalized_target_type.is_empty() || normalized_target_type == "user" {
        vec![repository
            .find_user_by_login_id(&request.login_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("issue sharer user not found"))?]
    } else {
        return Err(ConnectError::invalid_argument(
            "unsupported issue sharer target type",
        ));
    };

    for target in target_users {
        let changed = match action {
            "share" => repository
                .add_issue_sharer(access.issue.id, target.id, &target.login_id)
                .await
                .map_err(internal_error)?,
            "unshare" => repository
                .remove_issue_sharer(access.issue.id, target.id)
                .await
                .map_err(internal_error)?,
            _ => {
                return Err(ConnectError::invalid_argument(
                    "invalid issue sharer action",
                ));
            }
        };
        if changed {
            repository
                .record_issue_sharer_changed(
                    access.issue.id,
                    actor.id,
                    &actor.login_id,
                    target.id,
                    &target.login_id,
                    action,
                )
                .await
                .map_err(internal_error)?;
        }
    }
    let updated = repository
        .read_issue_detail(
            &request.owner_name,
            &request.project_name,
            request.issue_number,
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
    let share_status = match session.user_id {
        Some(user_id) => repository
            .read_issue_share_status(updated.id, user_id)
            .await
            .map_err(internal_error)?,
        None => persistence::IssueShareStatus::default(),
    };
    Ok((
        issue_detail_response_from_record_with_sharer_flags(
            &updated,
            true,
            true,
            share_status.direct,
            share_status.inherited_from_parent,
            session.user_id,
            &service.base_path,
        ),
        ctx,
    ))
}

pub(crate) async fn issue_assignment_mutation(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<AssignIssueRequestView<'static>>,
) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id).await?;
    let authorization = require_project_read(
        repository,
        &request.owner_name,
        &request.project_name,
        session.user_id,
    )
    .await?;
    let existing = repository
        .read_issue_detail(
            &request.owner_name,
            &request.project_name,
            request.issue_number,
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
    if !issue_can_mutate(&authorization, &existing, &actor) {
        return Err(ConnectError::permission_denied(
            "issue assign is not allowed",
        ));
    }
    let issue = repository
        .assign_issue(
            &request.owner_name,
            &request.project_name,
            request.issue_number,
            Some(request.assignee_login_id)
                .filter(|value| !value.trim().is_empty())
                .as_deref(),
            &actor.login_id,
        )
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
    Ok((
        issue_detail_response_from_record(&issue, true, true, session.user_id, &service.base_path),
        ctx,
    ))
}

pub(super) async fn rest_toggle_favorite_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = IssueParticipationRequest {
        issue_number,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<IssueParticipationRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .toggle_favorite_issue(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_assign_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    body: RestIssueAssigneeBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = AssignIssueRequest {
        assignee_login_id: body.assignee_login_id,
        issue_number,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<AssignIssueRequestView<'static>>(&request)?;
    let (payload, ctx) = issue_assignment_mutation(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_share_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    body: RestIssueSharerBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = IssueShareRequest {
        issue_number,
        login_id: body.login_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<IssueShareRequestView<'static>>(&request)?;
    let (payload, ctx) = issue_sharer_mutation(
        &service,
        Context::new(headers),
        request,
        "share",
        &body.target_type,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_unshare_issue(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    login_id: String,
    query: RestIssueSharerDeleteQuery,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let refresh_headers = headers.clone();
    let refresh_owner_name = owner_name.clone();
    let refresh_project_name = project_name.clone();
    let request = IssueShareRequest {
        issue_number,
        login_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<IssueShareRequestView<'static>>(&request)?;
    let (payload, ctx) = issue_sharer_mutation(
        &service,
        Context::new(headers),
        request,
        "unshare",
        &query.target_type,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let payload = rest_refreshed_issue_detail(
        &refresh_headers,
        &refresh_owner_name,
        &refresh_project_name,
        issue_number,
        &service,
        payload,
    )
    .await?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_refreshed_issue_detail(
    headers: &HeaderMap,
    owner_name: &str,
    project_name: &str,
    issue_number: i64,
    service: &PilotServiceImpl,
    fallback: ReadIssueDetailResponse,
) -> Result<RestIssueDetailResponse, RestRouteError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Ok(RestIssueDetailResponse {
            author_id: None,
            child_closed_count: 0,
            child_issues: Vec::new(),
            child_open_count: 0,
            due_date_label: String::new(),
            detail: fallback,
            history_html: String::new(),
            history_markdown: String::new(),
            comment_parent_links: Vec::new(),
            issue_id: 0,
            issue_voters: Vec::new(),
            is_draft: false,
            parent_issue_id: None,
            parent_issue_number: None,
            parent_issue_state: String::new(),
            parent_issue_title: String::new(),
            viewer_user_id: actor_id.unwrap_or_default(),
            weight: 0,
        });
    };
    let access = read_issue_access(repository, owner_name, project_name, issue_number, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    rest_issue_detail_response_from_access_with_repository_issue_references(
        repository,
        &access,
        actor_id,
        &service.base_path,
    )
    .await
    .map_err(RestRouteError::from_connect_error)
}
