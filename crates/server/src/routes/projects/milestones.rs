use super::*;

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

pub(super) async fn direct_create_project_milestone(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let session =
        match direct_project_update_allowed(&headers, &owner, &project, &service, true).await {
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
            &service.base_path,
            &format!("/{owner}/{project}/milestone/{}", milestone.id),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(super) async fn direct_update_project_milestone(
    headers: HeaderMap,
    owner: String,
    project: String,
    milestone_id: i64,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let session =
        match direct_project_update_allowed(&headers, &owner, &project, &service, true).await {
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
            &service.base_path,
            &format!("/{owner}/{project}/milestone/{}", milestone.id),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(super) async fn direct_update_project_milestone_state(
    headers: HeaderMap,
    owner: String,
    project: String,
    milestone_id: i64,
    state: &str,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) =
        direct_project_update_allowed(&headers, &owner, &project, &service, true).await
    {
        return response;
    }
    match repository
        .update_project_milestone_state(&owner, &project, milestone_id, state)
        .await
    {
        Ok(Some(milestone)) => redirect_to(
            &service.base_path,
            &format!("/{owner}/{project}/milestone/{}", milestone.id),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(super) async fn direct_delete_project_milestone(
    headers: HeaderMap,
    owner: String,
    project: String,
    milestone_id: i64,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) =
        direct_project_update_allowed(&headers, &owner, &project, &service, true).await
    {
        return response;
    }
    match repository
        .delete_project_milestone(&owner, &project, milestone_id)
        .await
    {
        Ok(true) => redirect_to(
            &service.base_path,
            &format!("/{owner}/{project}/milestones"),
        ),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(super) async fn legacy_external_create_milestones(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    body: serde_json::Value,
    service: PilotServiceImpl,
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
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("milestones require repository backend")
            .into_response();
    };
    let actor_id = match legacy_external_authenticated_user_id(
        &headers,
        &service.session_manager,
        repository,
        true,
    )
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
