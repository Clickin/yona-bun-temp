use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectLabelCreateBody {
    #[serde(default)]
    category_is_exclusive: bool,
    category_name: String,
    label_color: String,
    label_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectLabelUpdateBody {
    category_id: i64,
    label_color: String,
    label_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectLabelCategoryBody {
    #[serde(default)]
    category_is_exclusive: bool,
    category_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectLabelCopyBody {
    from_owner_name: String,
    from_project_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestProjectLabelCopyResponse {
    copied: u32,
    labels: Vec<IssueLabel>,
    skipped: u32,
}
fn direct_json_label(label: &persistence::IssueLabelRecord) -> serde_json::Value {
    serde_json::json!({
        "id": label.id.to_string(),
        "name": label.name,
        "color": label.color,
        "category": label.category_name,
        "categoryId": label.category_id.unwrap_or_default().to_string(),
        "categoryIsExclusive": label.category_is_exclusive,
    })
}

fn direct_json_category(category: &persistence::IssueLabelCategoryRecord) -> serde_json::Value {
    serde_json::json!({
        "id": category.id.to_string(),
        "name": category.name,
        "isExclusive": category.is_exclusive.to_string(),
    })
}

pub(crate) async fn direct_list_issue_labels(
    headers: HeaderMap,
    owner: String,
    project: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if require_project_read(&repository, &owner, &project, actor_id)
        .await
        .is_err()
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    match repository.list_project_labels(&owner, &project).await {
        Ok(labels) => {
            Json(labels.iter().map(direct_json_label).collect::<Vec<_>>()).into_response()
        }
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) async fn direct_create_issue_label(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
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
    let label_name = form_value(&form, &["labelName", "name"]).trim();
    let category_name = form_value(&form, &["categoryName", "category"]).trim();
    let color = match normalize_issue_label_color(form_value(&form, &["labelColor", "color"])) {
        Ok(color) => color,
        Err(_) => return StatusCode::BAD_REQUEST.into_response(),
    };
    if label_name.is_empty() || category_name.is_empty() {
        return StatusCode::BAD_REQUEST.into_response();
    }
    match repository
        .create_project_label(persistence::CreateProjectLabelInput {
            category_is_exclusive: form_bool(&form, &["categoryIsExclusive", "isExclusive"]),
            category_name: category_name.to_string(),
            label_color: color,
            label_name: label_name.to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some((label, true))) => {
            (StatusCode::CREATED, Json(direct_json_label(&label))).into_response()
        }
        Ok(Some((_label, false))) => StatusCode::NO_CONTENT.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) async fn direct_issue_label_css(
    headers: HeaderMap,
    owner: String,
    project: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if require_project_read(&repository, &owner, &project, actor_id)
        .await
        .is_err()
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    match repository.list_project_labels(&owner, &project).await {
        Ok(labels) => (
            [(http::header::CONTENT_TYPE, "text/css")],
            issue_label_css(&labels),
        )
            .into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) async fn direct_update_issue_label(
    headers: HeaderMap,
    owner: String,
    project: String,
    label_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
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
    let category_id = form_value(&form, &["category.id", "categoryId"])
        .parse::<i64>()
        .unwrap_or_default();
    let color = match normalize_issue_label_color(form_value(&form, &["color", "labelColor"])) {
        Ok(color) => color,
        Err(_) => return StatusCode::BAD_REQUEST.into_response(),
    };
    match repository
        .update_project_label(persistence::UpdateProjectLabelInput {
            category_id,
            label_color: color,
            label_id,
            label_name: form_value(&form, &["name", "labelName"]).to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some(_)) => StatusCode::OK.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

pub(crate) async fn direct_delete_issue_label(
    headers: HeaderMap,
    owner: String,
    project: String,
    label_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if form_value(&form, &["_method"]).to_ascii_lowercase() != "delete" {
        return StatusCode::BAD_REQUEST.into_response();
    }
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
        .delete_project_label(&owner, &project, label_id)
        .await
    {
        Ok(true) => StatusCode::OK.into_response(),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) async fn direct_copy_issue_labels(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let redirect_response = || {
        Redirect::to(&base_path_href(
            &base_path,
            &format!("/{owner}/{project}/issue/labelsform"),
        ))
        .into_response()
    };
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
    let from_owner = form_value(&form, &["owner", "fromOwnerName"]).trim();
    let from_project = form_value(&form, &["projectName", "fromProjectName"]).trim();
    if from_owner.is_empty() || from_project.is_empty() {
        return redirect_response();
    }
    if require_project_read(&repository, from_owner, from_project, session.user_id)
        .await
        .is_ok()
    {
        if repository
            .copy_project_labels(from_owner, from_project, &owner, &project)
            .await
            .is_err()
        {
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    }
    redirect_response()
}

pub(crate) async fn direct_list_issue_label_categories(
    headers: HeaderMap,
    owner: String,
    project: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if require_project_read(&repository, &owner, &project, actor_id)
        .await
        .is_err()
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    match repository
        .list_project_label_categories(&owner, &project)
        .await
    {
        Ok(categories) => Json(
            categories
                .iter()
                .map(direct_json_category)
                .collect::<Vec<_>>(),
        )
        .into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) async fn direct_create_issue_label_category(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
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
        .create_project_label_category(persistence::CreateProjectLabelCategoryInput {
            category_is_exclusive: form_bool(&form, &["isExclusive", "categoryIsExclusive"]),
            category_name: form_value(&form, &["name", "categoryName"]).to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some((category, true))) => {
            (StatusCode::CREATED, Json(direct_json_category(&category))).into_response()
        }
        Ok(Some((_category, false))) => StatusCode::NO_CONTENT.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

pub(crate) async fn direct_update_issue_label_category(
    headers: HeaderMap,
    owner: String,
    project: String,
    category_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
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
        .update_project_label_category(persistence::UpdateProjectLabelCategoryInput {
            category_id,
            category_is_exclusive: form_bool(&form, &["isExclusive", "categoryIsExclusive"]),
            category_name: form_value(&form, &["name", "categoryName"]).to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some(_)) => StatusCode::OK.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

pub(crate) async fn direct_delete_issue_label_category(
    headers: HeaderMap,
    owner: String,
    project: String,
    category_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
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
        .delete_project_label_category(&owner, &project, category_id)
        .await
    {
        Ok(true) => StatusCode::OK.into_response(),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
pub(super) async fn rest_list_project_labels(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ListProjectLabelsRequest {
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ListProjectLabelsRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .list_project_labels(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_list_project_label_categories(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ListProjectLabelsRequest {
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<ListProjectLabelsRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .list_project_label_categories(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_create_project_label(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectLabelCreateBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = CreateProjectLabelRequest {
        category_is_exclusive: body.category_is_exclusive,
        category_name: body.category_name,
        label_color: body.label_color,
        label_name: body.label_name,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<CreateProjectLabelRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .create_project_label(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_update_project_label(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    label_id: i64,
    body: RestProjectLabelUpdateBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = UpdateProjectLabelRequest {
        category_id: body.category_id,
        label_color: body.label_color,
        label_id,
        label_name: body.label_name,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateProjectLabelRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .update_project_label(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_delete_project_label(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    label_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = DeleteProjectLabelRequest {
        label_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<DeleteProjectLabelRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .delete_project_label(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_copy_project_labels(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectLabelCopyBody,
    service: PilotServiceImpl,
) -> Result<Json<RestProjectLabelCopyResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = service.backend else {
        return Err(RestRouteError::not_implemented(
            "issue label requires repository backend",
        ));
    };
    require_authenticated_user(&repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let target_authorization =
        require_project_read(&repository, &owner_name, &project_name, session.user_id)
            .await
            .map_err(RestRouteError::from_connect_error)?;
    if !crate::project_update_allowed(&target_authorization)
        .map_err(RestRouteError::from_connect_error)?
    {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("issue label copy is not allowed"),
        ));
    }
    require_project_read(
        &repository,
        &body.from_owner_name,
        &body.from_project_name,
        session.user_id,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let result = repository
        .copy_project_labels(
            &body.from_owner_name,
            &body.from_project_name,
            &owner_name,
            &project_name,
        )
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    Ok(Json(RestProjectLabelCopyResponse {
        copied: result.copied,
        labels: result
            .labels
            .iter()
            .map(crate::issue_label_from_record)
            .collect(),
        skipped: result.skipped,
    }))
}

pub(super) async fn rest_create_project_label_category(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestProjectLabelCategoryBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = CreateProjectLabelCategoryRequest {
        category_is_exclusive: body.category_is_exclusive,
        category_name: body.category_name,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<CreateProjectLabelCategoryRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .create_project_label_category(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_update_project_label_category(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    category_id: i64,
    body: RestProjectLabelCategoryBody,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = UpdateProjectLabelCategoryRequest {
        category_id,
        category_is_exclusive: body.category_is_exclusive,
        category_name: body.category_name,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<UpdateProjectLabelCategoryRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .update_project_label_category(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(super) async fn rest_delete_project_label_category(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    category_id: i64,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = DeleteProjectLabelCategoryRequest {
        category_id,
        owner_name,
        project_name,
        ..Default::default()
    };
    let request = rest_owned_view::<DeleteProjectLabelCategoryRequestView<'static>>(&request)?;
    let (payload, ctx) = service
        .delete_project_label_category(Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}
pub(crate) async fn project_labels_list(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ListProjectLabelsRequestView<'static>>,
) -> Result<(ListProjectLabelsResponse, Context), ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue requires repository backend",
        ));
    };
    let session = service
        .session_manager
        .read_session_from_headers(&ctx.headers);
    require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.as_ref().and_then(|session| session.user_id),
    )
    .await?;
    let labels = repository
        .list_project_labels(request.owner_name, request.project_name)
        .await
        .map_err(internal_error)?
        .iter()
        .map(issue_label_from_record)
        .collect();
    Ok((
        ListProjectLabelsResponse {
            labels,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_create(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<CreateProjectLabelRequestView<'static>>,
) -> Result<(ProjectLabelMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
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
            "issue label create is not allowed",
        ));
    }
    let color = normalize_issue_label_color(request.label_color)?;
    let Some((label, created)) = repository
        .create_project_label(persistence::CreateProjectLabelInput {
            category_is_exclusive: request.category_is_exclusive,
            category_name: request.category_name.trim().to_string(),
            label_color: color,
            label_name: request.label_name.trim().to_string(),
            owner_name: request.owner_name.to_string(),
            project_name: request.project_name.to_string(),
        })
        .await
        .map_err(internal_error)?
    else {
        return Err(ConnectError::not_found("project not found"));
    };
    Ok((
        ProjectLabelMutationResponse {
            created,
            label: Some(issue_label_from_record(&label)).into(),
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateProjectLabelRequestView<'static>>,
) -> Result<(ProjectLabelMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
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
            "issue label update is not allowed",
        ));
    }
    let color = normalize_issue_label_color(request.label_color)?;
    let Some(label) = repository
        .update_project_label(persistence::UpdateProjectLabelInput {
            category_id: request.category_id,
            label_color: color,
            label_id: request.label_id,
            label_name: request.label_name.trim().to_string(),
            owner_name: request.owner_name.to_string(),
            project_name: request.project_name.to_string(),
        })
        .await
        .map_err(|error| ConnectError::invalid_argument(error.to_string()))?
    else {
        return Err(ConnectError::not_found("issue label not found"));
    };
    Ok((
        ProjectLabelMutationResponse {
            created: false,
            label: Some(issue_label_from_record(&label)).into(),
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_delete(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<DeleteProjectLabelRequestView<'static>>,
) -> Result<(ProjectLabelDeleteResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
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
            "issue label delete is not allowed",
        ));
    }
    let ok = repository
        .delete_project_label(request.owner_name, request.project_name, request.label_id)
        .await
        .map_err(internal_error)?;
    if !ok {
        return Err(ConnectError::not_found("issue label not found"));
    }
    Ok((
        ProjectLabelDeleteResponse {
            ok,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_categories_list(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<ListProjectLabelsRequestView<'static>>,
) -> Result<(ListProjectLabelCategoriesResponse, Context), ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
        ));
    };
    let session = service
        .session_manager
        .read_session_from_headers(&ctx.headers);
    require_project_read(
        repository,
        request.owner_name,
        request.project_name,
        session.as_ref().and_then(|session| session.user_id),
    )
    .await?;
    let categories = repository
        .list_project_label_categories(request.owner_name, request.project_name)
        .await
        .map_err(internal_error)?
        .iter()
        .map(issue_label_category_from_record)
        .collect();
    Ok((
        ListProjectLabelCategoriesResponse {
            categories,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_category_create(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<CreateProjectLabelCategoryRequestView<'static>>,
) -> Result<(ProjectLabelCategoryMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
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
            "issue label category create is not allowed",
        ));
    }
    let Some((category, created)) = repository
        .create_project_label_category(persistence::CreateProjectLabelCategoryInput {
            category_is_exclusive: request.category_is_exclusive,
            category_name: request.category_name.trim().to_string(),
            owner_name: request.owner_name.to_string(),
            project_name: request.project_name.to_string(),
        })
        .await
        .map_err(internal_error)?
    else {
        return Err(ConnectError::not_found("project not found"));
    };
    Ok((
        ProjectLabelCategoryMutationResponse {
            category: Some(issue_label_category_from_record(&category)).into(),
            created,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_category_update(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<UpdateProjectLabelCategoryRequestView<'static>>,
) -> Result<(ProjectLabelCategoryMutationResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
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
            "issue label category update is not allowed",
        ));
    }
    let Some(category) = repository
        .update_project_label_category(persistence::UpdateProjectLabelCategoryInput {
            category_id: request.category_id,
            category_is_exclusive: request.category_is_exclusive,
            category_name: request.category_name.trim().to_string(),
            owner_name: request.owner_name.to_string(),
            project_name: request.project_name.to_string(),
        })
        .await
        .map_err(|error| ConnectError::invalid_argument(error.to_string()))?
    else {
        return Err(ConnectError::not_found("issue label category not found"));
    };
    Ok((
        ProjectLabelCategoryMutationResponse {
            category: Some(issue_label_category_from_record(&category)).into(),
            created: false,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn project_label_category_delete(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<DeleteProjectLabelCategoryRequestView<'static>>,
) -> Result<(ProjectLabelDeleteResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "issue label requires repository backend",
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
            "issue label category delete is not allowed",
        ));
    }
    let ok = repository
        .delete_project_label_category(
            request.owner_name,
            request.project_name,
            request.category_id,
        )
        .await
        .map_err(internal_error)?;
    if !ok {
        return Err(ConnectError::not_found("issue label category not found"));
    }
    Ok((
        ProjectLabelDeleteResponse {
            ok,
            ..Default::default()
        },
        ctx,
    ))
}
