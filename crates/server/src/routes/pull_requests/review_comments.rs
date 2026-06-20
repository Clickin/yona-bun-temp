use axum::{
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;

use crate::{
    dispatch_pull_request_webhooks, internal_error, normalize_identifier, persistence,
    require_authenticated_user, require_project_resource_create, require_session,
    require_valid_csrf, rest_repository, rest_require_project_code_read,
    rest_update_commit_discussion_thread_state, ConnectError, PilotBackend, PilotServiceImpl,
    ProjectCreatableResource, RestRouteError,
};

use super::{
    rest_pull_request_detail_from_record_with_repository_issue_references,
    rest_pull_request_detail_response, rest_review_thread_from_record,
    RestPullRequestDetailResponse, RestReviewThread,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestPullRequestCommentBody {
    #[serde(default)]
    attachment_ids: Vec<i64>,
    commit_id: Option<String>,
    contents_markdown: String,
    end_line: Option<i32>,
    end_side: Option<String>,
    path: Option<String>,
    prev_commit_id: Option<String>,
    start_line: Option<i32>,
    start_side: Option<String>,
    thread_id: Option<i64>,
}

pub(super) async fn direct_update_review_thread_state(
    headers: HeaderMap,
    thread_id: i64,
    next_state: &str,
    service: PilotServiceImpl,
) -> Response {
    let repository = match &service.backend {
        PilotBackend::Repository(repository) => repository,
        PilotBackend::Static => {
            return RestRouteError::not_implemented("review thread requires repository backend")
                .into_response();
        }
    };
    let context = match repository.read_review_thread_route_context(thread_id).await {
        Ok(Some(context)) => context,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let result = if let Some(pull_request_number) = context.pull_request_number {
        rest_update_pull_request_thread_state(
            headers,
            context.owner_name,
            context.project_name,
            pull_request_number,
            context.thread_id,
            next_state.to_string(),
            service,
        )
        .await
        .map(|_| ())
    } else if !context.commit_id.trim().is_empty() {
        rest_update_commit_discussion_thread_state(
            headers,
            context.owner_name,
            context.project_name,
            context.commit_id,
            context.thread_id,
            next_state.to_string(),
            service,
        )
        .await
        .map(|_| ())
    } else {
        return StatusCode::NOT_FOUND.into_response();
    };

    match result {
        Ok(()) => StatusCode::OK.into_response(),
        Err(error) => error.into_response(),
    }
}

pub(super) async fn rest_create_pull_request_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    body: RestPullRequestCommentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if body.contents_markdown.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "pull request comment is required",
        ));
    }
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let authorization = require_project_resource_create(
        repository,
        &owner_name,
        &project_name,
        Some(actor.id),
        ProjectCreatableResource::ReviewComment,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let comment_markdown = body.contents_markdown.clone();
    let record = repository
        .create_pull_request_comment(persistence::CreatePullRequestCommentInput {
            actor_display_name: actor.display_name.clone(),
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            attachment_ids: body.attachment_ids,
            commit_id: body.commit_id,
            contents_markdown: body.contents_markdown,
            end_line: body.end_line,
            end_side: body.end_side,
            owner_name,
            path: body.path,
            prev_commit_id: body.prev_commit_id,
            project_name,
            pull_request_number,
            start_line: body.start_line,
            start_side: body.start_side,
            thread_id: body.thread_id,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request not found"))?;
    let created_comment = record
        .threads
        .iter()
        .flat_map(|thread| thread.comments.iter())
        .max_by_key(|comment| comment.id);
    let target_fragment = created_comment.map(|comment| format!("#comment-{}", comment.id));
    let detail_markdown = created_comment
        .map(|comment| comment.contents_markdown.clone())
        .unwrap_or(comment_markdown);
    dispatch_pull_request_webhooks(
        repository,
        &record,
        &actor,
        "NEW_REVIEW_COMMENT",
        &detail_markdown,
        target_fragment.as_deref(),
        None,
        &service.public_origin,
        &service.base_path,
        &service.integrations,
    )
    .await;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(super) async fn rest_update_pull_request_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    comment_id: i64,
    body: RestPullRequestCommentBody,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        &service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    let comment = current
        .threads
        .iter()
        .flat_map(|thread| thread.comments.iter())
        .find(|comment| comment.id == comment_id)
        .ok_or_else(|| RestRouteError::not_found("pull request comment not found"))?;
    if !comment.can_delete {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request comment update is not allowed"),
        ));
    }
    let contents_markdown = body.contents_markdown.trim().to_string();
    if contents_markdown.is_empty() {
        return Err(RestRouteError::from_connect_error(
            ConnectError::invalid_argument("pull request comment contents is required"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let record = repository
        .update_pull_request_comment(persistence::UpdatePullRequestCommentInput {
            actor_id: actor.id,
            attachment_ids: body.attachment_ids,
            comment_id,
            contents_markdown,
            owner_name,
            project_name,
            pull_request_number,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request comment not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(super) async fn rest_delete_pull_request_comment(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    comment_id: i64,
    service: PilotServiceImpl,
) -> Result<Json<RestPullRequestDetailResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        &service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    let comment = current
        .threads
        .iter()
        .flat_map(|thread| thread.comments.iter())
        .find(|comment| comment.id == comment_id)
        .ok_or_else(|| RestRouteError::not_found("pull request comment not found"))?;
    if !comment.can_delete {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("pull request comment delete is not allowed"),
        ));
    }
    let authorization =
        rest_require_project_code_read(repository, &owner_name, &project_name, Some(actor.id))
            .await?;
    let record = repository
        .delete_pull_request_comment(persistence::DeletePullRequestCommentInput {
            actor_id: actor.id,
            comment_id,
            owner_name,
            project_name,
            pull_request_number,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("pull request comment not found"))?;
    Ok(Json(
        rest_pull_request_detail_from_record_with_repository_issue_references(
            &service,
            repository,
            record,
            &authorization,
            Some(actor.id),
        )
        .await
        .map_err(RestRouteError::from_connect_error)?,
    ))
}

pub(super) async fn rest_update_pull_request_thread_state(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    thread_id: i64,
    state: String,
    service: PilotServiceImpl,
) -> Result<Json<RestReviewThread>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let current = rest_pull_request_detail_response(
        &service,
        repository,
        &owner_name,
        &project_name,
        pull_request_number,
        Some(actor.id),
    )
    .await?;
    let thread = current
        .threads
        .iter()
        .find(|thread| thread.id == thread_id)
        .ok_or_else(|| RestRouteError::not_found("review thread not found"))?;
    if !(current.permissions.can_review
        || current.permissions.can_update_state
        || thread.author_id == actor.id)
    {
        return Err(RestRouteError::from_connect_error(
            ConnectError::permission_denied("review thread state update is not allowed"),
        ));
    }
    let next_state = normalize_identifier(&state);
    if next_state != "open" && next_state != "closed" {
        return Err(RestRouteError::bad_request("invalid review thread state"));
    }
    let record = repository
        .update_pull_request_thread_state(persistence::PullRequestThreadStateInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name: owner_name.clone(),
            project_name: project_name.clone(),
            pull_request_number,
            state: next_state,
            thread_id,
        })
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("review thread not found"))?;
    Ok(Json(rest_review_thread_from_record(
        record,
        &service.base_path,
    )))
}
