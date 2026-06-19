use super::*;

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct RestMilestoneListQuery {
    order_by: String,
    order_dir: String,
    state: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct RestProjectMilestoneBody {
    attachment_ids: Vec<i64>,
    contents_markdown: String,
    due_date: String,
    state: String,
    title: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectMilestoneStateBody {
    state: String,
}

pub(super) async fn rest_list_project_milestones(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestMilestoneListQuery,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ListProjectMilestonesRequest {
        order_by: if query.order_by.trim().is_empty() {
            "dueDate".to_string()
        } else {
            query.order_by
        },
        order_dir: if query.order_dir.trim().is_empty() {
            "asc".to_string()
        } else {
            query.order_dir
        },
        owner_name,
        project_name,
        state: if query.state.trim().is_empty() {
            "open".to_string()
        } else {
            query.state
        },
        ..Default::default()
    };
    let request = rest_owned_view::<ListProjectMilestonesRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .list_project_milestones(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_read_project_milestone(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    milestone_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadProjectMilestoneRequest {
        milestone_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ReadProjectMilestoneRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .read_project_milestone(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_create_project_milestone(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectMilestoneBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = CreateProjectMilestoneRequest {
        attachment_ids: body.attachment_ids,
        contents_markdown: body.contents_markdown,
        due_date: body.due_date,
        owner_name,
        project_name,
        state: body.state,
        title: body.title,
        ..Default::default()
    };
    let request = rest_owned_view::<CreateProjectMilestoneRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .create_project_milestone(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_update_project_milestone(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    milestone_id: i64,
    body: RestProjectMilestoneBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = UpdateProjectMilestoneRequest {
        attachment_ids: body.attachment_ids,
        contents_markdown: body.contents_markdown,
        due_date: body.due_date,
        milestone_id,
        owner_name,
        project_name,
        state: body.state,
        title: body.title,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateProjectMilestoneRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .update_project_milestone(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_delete_project_milestone(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    milestone_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = DeleteProjectMilestoneRequest {
        milestone_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<DeleteProjectMilestoneRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .delete_project_milestone(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_set_project_milestone_state(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    milestone_id: i64,
    body: RestProjectMilestoneStateBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = MilestoneStateMutationRequest {
        milestone_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<MilestoneStateMutationRequestView<'static>>(&request)?;
    let context = Context::new(headers);
    let (payload, ctx) = match normalize_identifier(&body.state).as_str() {
        "open" => service.open_project_milestone(context, request).await,
        "closed" | "close" => service.close_project_milestone(context, request).await,
        _ => Err(ConnectError::invalid_argument("invalid milestone state")),
    }
    .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}
