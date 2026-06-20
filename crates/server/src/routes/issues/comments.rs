use super::*;

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct RestIssueCommentBody {
    #[serde(
        default,
        deserialize_with = "deserialize_i64_vec_from_strings_or_numbers"
    )]
    attachment_ids: Vec<i64>,
    contents_markdown: String,
    parent_comment_id: Option<i64>,
}

fn direct_comment_contents(form: &HashMap<String, String>) -> String {
    form_value(
        form,
        &[
            "contents",
            "contentsMarkdown",
            "contents_markdown",
            "body",
            "comment",
        ],
    )
    .trim()
    .to_string()
}

fn direct_comment_attachment_ids(form: &HashMap<String, String>) -> Vec<i64> {
    parse_attachment_ids(form_value(
        form,
        &["attachmentIds", "attachment_ids", "temporaryUploadFiles"],
    ))
}

fn direct_issue_comment_body(form: &HashMap<String, String>) -> RestIssueCommentBody {
    RestIssueCommentBody {
        attachment_ids: direct_comment_attachment_ids(form),
        contents_markdown: direct_comment_contents(form),
        parent_comment_id: form
            .get("parentCommentId")
            .and_then(|value| value.parse::<i64>().ok()),
    }
}

pub(super) async fn direct_create_issue_comment(
    headers: HeaderMap,
    owner: String,
    project: String,
    issue_number: i64,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    match rest_create_issue_comment(
        headers_with_form_csrf(headers, &form),
        owner.clone(),
        project.clone(),
        issue_number,
        direct_issue_comment_body(&form),
        service.clone(),
    )
    .await
    {
        Ok(Json(detail)) => {
            let fragment = detail
                .detail
                .comments
                .iter()
                .max_by_key(|comment| comment.id)
                .map(|comment| format!("#comment-{}", comment.id))
                .unwrap_or_default();
            redirect_to(
                &service.base_path,
                &format!("/{owner}/{project}/issue/{issue_number}{fragment}"),
            )
        }
        Err(error) => error.into_response(),
    }
}

pub(super) async fn direct_update_issue_comment(
    headers: HeaderMap,
    owner: String,
    project: String,
    issue_number: i64,
    comment_id: i64,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    match rest_update_issue_comment(
        headers_with_form_csrf(headers, &form),
        owner.clone(),
        project.clone(),
        issue_number,
        comment_id,
        direct_issue_comment_body(&form),
        service.clone(),
    )
    .await
    {
        Ok(_) => redirect_to(
            &service.base_path,
            &format!("/{owner}/{project}/issue/{issue_number}#comment-{comment_id}"),
        ),
        Err(error) => error.into_response(),
    }
}

pub(super) async fn direct_delete_issue_comment(
    headers: HeaderMap,
    owner: String,
    project: String,
    issue_number: i64,
    comment_id: i64,
    service: PilotServiceImpl,
) -> Response {
    match rest_delete_issue_comment(
        headers,
        owner.clone(),
        project.clone(),
        issue_number,
        comment_id,
        service.clone(),
    )
    .await
    {
        Ok(_) => redirect_to(
            &service.base_path,
            &format!("/{owner}/{project}/issue/{issue_number}"),
        ),
        Err(error) => error.into_response(),
    }
}

pub(super) async fn direct_issue_comment_vote(
    headers: HeaderMap,
    owner: String,
    project: String,
    issue_number: i64,
    comment_id: i64,
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
    if !access
        .issue
        .comments
        .iter()
        .any(|comment| comment.id == comment_id)
    {
        return StatusCode::NOT_FOUND.into_response();
    }

    match action {
        "vote" => {
            if repository
                .vote_issue_comment(comment_id, actor.id)
                .await
                .is_err()
            {
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
        "unvote" => match repository.unvote_issue_comment(comment_id, actor.id).await {
            Ok(true) => {}
            Ok(false) => return StatusCode::NOT_FOUND.into_response(),
            Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
        },
        _ => return StatusCode::BAD_REQUEST.into_response(),
    }

    redirect_to(
        &service.base_path,
        &format!("/{owner}/{project}/issue/{issue_number}#comment-{comment_id}"),
    )
}

pub(super) async fn rest_create_issue_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    body: RestIssueCommentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if issue_number <= 0 || body.contents_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request("invalid issue comment request"));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        Some(actor.id),
    )
    .await;
    let authorization = match &access {
        Ok(access) if access.viewer_can_comment() => access.authorization.clone(),
        Ok(_) => {
            return Err(RestRouteError::from_connect_error(
                ConnectError::permission_denied("issue comment create is not allowed"),
            ));
        }
        Err(_) => require_project_resource_create(
            repository,
            &owner_name,
            &project_name,
            session.user_id,
            ProjectCreatableResource::IssueComment,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    };
    let issue = repository
        .create_issue_comment(persistence::CreateIssueCommentInput {
            actor_display_name: actor.display_name.clone(),
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            attachment_ids: body.attachment_ids,
            contents_markdown: body.contents_markdown.clone(),
            issue_number,
            owner_name,
            parent_comment_id: body.parent_comment_id,
            project_name,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    let created_comment = issue.comments.iter().max_by_key(|comment| comment.id);
    let target_fragment = created_comment
        .map(|comment| format!("#comment-{}", comment.id))
        .unwrap_or_default();
    let detail_markdown = created_comment
        .map(|comment| comment.contents_markdown.as_str())
        .unwrap_or_else(|| body.contents_markdown.as_str());
    dispatch_issue_webhooks(
        repository,
        &issue,
        &actor,
        "NEW_COMMENT",
        detail_markdown,
        (!target_fragment.is_empty()).then_some(target_fragment.as_str()),
        &service.public_origin,
        &service.base_path,
        &service,
    )
    .await;
    Ok(Json(
        rest_issue_detail_response_from_record_with_authorization_issue_references(
            repository,
            &issue,
            &authorization,
            issue_can_mutate(&authorization, &issue, &actor),
            true,
            session.user_id,
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(super) async fn rest_update_issue_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    comment_id: i64,
    body: RestIssueCommentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if issue_number <= 0 || comment_id <= 0 {
        return Err(RestRouteError::bad_request("invalid issue comment request"));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        Some(actor.id),
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let comment_author = access
        .issue
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
        .and_then(|comment| comment.author_id);
    if comment_author != Some(actor.id) && !access.viewer_can_manage() {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("issue comment update is not allowed"),
        ));
    }
    let issue = repository
        .update_issue_comment(persistence::UpdateIssueCommentInput {
            actor_id: actor.id,
            attachment_ids: body.attachment_ids,
            comment_id,
            contents_markdown: body.contents_markdown,
            issue_number,
            owner_name,
            project_name,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    Ok(Json(
        rest_issue_detail_response_from_record_with_access_issue_references(
            repository,
            &issue,
            &access,
            session.user_id,
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(super) async fn rest_delete_issue_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    comment_id: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestIssueDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "issue requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let access = read_issue_access(
        repository,
        &owner_name,
        &project_name,
        issue_number,
        Some(actor.id),
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let comment_author = access
        .issue
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
        .and_then(|comment| comment.author_id);
    if comment_author != Some(actor.id) && !access.viewer_can_manage() {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("issue comment delete is not allowed"),
        ));
    }
    let issue = repository
        .delete_issue_comment(&owner_name, &project_name, issue_number, comment_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pilot issue not found"))?;
    Ok(Json(
        rest_issue_detail_response_from_record_with_access_issue_references(
            repository,
            &issue,
            &access,
            session.user_id,
            &service.base_path,
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

fn issue_comment_path(origin: &persistence::IssueCommentOriginRecord) -> String {
    format!(
        "/{}/{}/issue/{}#comment-{}",
        origin.owner_name, origin.project_name, origin.issue_number, origin.comment_id
    )
}

pub(super) fn direct_issue_body_markdown_from_comment(
    origin: &persistence::IssueCommentOriginRecord,
    public_origin: &str,
    base_path: &str,
) -> String {
    let source_url = absolute_app_url(public_origin, base_path, &issue_comment_path(origin));
    format!(
        "{}\n\n_Originally posted by @{} in {}_",
        origin.contents_markdown, origin.author_login_id, source_url
    )
}

pub(super) fn derived_issue_comment_markdown(
    issue: &persistence::IssueRecord,
    public_origin: &str,
    base_path: &str,
) -> String {
    let path = format!(
        "/{}/{}/issue/{}",
        issue.owner_name, issue.project_name, issue.issue_number
    );
    format!(
        "issue.derived:{}",
        absolute_app_url(public_origin, base_path, &path)
    )
}
