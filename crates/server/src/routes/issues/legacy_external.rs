use crate::legacy_external_attachment_result;

use super::*;
use sha1::{Digest as _, Sha1};

pub(super) async fn legacy_external_create_issue_comment(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let body = legacy_issue_comment_create_body_from_value(&body);
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue comments require repository backend")
            .into_response();
    };
    let token_request = legacy_external_api_token_from_headers(&headers).is_some();
    let request_user_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, true).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let request_actor = match repository.find_user_by_id(request_user_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "user not found",
            ));
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let _access = match read_issue_access(
        repository,
        &owner,
        &project_name,
        number,
        Some(request_actor.id),
    )
    .await
    {
        Ok(access) if access.viewer_can_comment() => access,
        Ok(_) => {
            return RestRouteError::from_connect_error(ConnectError::permission_denied(
                "issue comment create is not allowed",
            ))
            .into_response();
        }
        Err(_) => {
            match require_project_resource_create(
                repository,
                &owner,
                &project_name,
                Some(request_actor.id),
                ProjectCreatableResource::IssueComment,
            )
            .await
            {
                Ok(_) => {}
                Err(error) => return RestRouteError::from_connect_error(error).into_response(),
            }
            match read_issue_access(
                repository,
                &owner,
                &project_name,
                number,
                Some(request_actor.id),
            )
            .await
            {
                Ok(access) => access,
                Err(error) => return RestRouteError::from_connect_error(error).into_response(),
            }
        }
    };
    let comment_markdown = if token_request {
        body.comment.trim()
    } else {
        body.body.trim()
    };
    if comment_markdown.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "Expecting Json data",
            })),
        )
            .into_response();
    }
    let comment_author = if token_request {
        request_actor.clone()
    } else {
        match legacy_external_post_author(repository, &request_actor, body.author.as_ref()).await {
            Ok(actor) => actor,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        }
    };
    let issue = match repository
        .create_issue_comment(persistence::CreateIssueCommentInput {
            actor_display_name: comment_author.display_name.clone(),
            actor_id: comment_author.id,
            actor_login_id: comment_author.login_id.clone(),
            attachment_ids: legacy_external_temporary_upload_file_ids(
                body.temporary_upload_files.as_ref(),
            ),
            contents_markdown: comment_markdown.to_string(),
            issue_number: number,
            owner_name: owner.clone(),
            parent_comment_id: None,
            project_name: project_name.clone(),
        })
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    if token_request {
        return (
            StatusCode::CREATED,
            Json(serde_json::json!({
                "result": legacy_external_issue_result(&issue),
            })),
        )
            .into_response();
    }
    let comment_id = issue
        .comments
        .iter()
        .map(|comment| comment.id)
        .max()
        .unwrap_or_default();
    (
        StatusCode::CREATED,
        Json(serde_json::json!({
            "status": 201,
            "location": format!(
                "{}#comment-{}",
                base_path_href(
                    &service.base_path,
                    &format!("/{owner}/{project_name}/issue/{number}")
                ),
                comment_id,
            ),
        })),
    )
        .into_response()
}

pub(super) async fn legacy_external_update_issue_labels(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: Vec<serde_json::Value>,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue labels require repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, true).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    if !access.viewer_can_manage() {
        return RestRouteError::from_connect_error(ConnectError::permission_denied(
            "issue label update is not allowed",
        ))
        .into_response();
    }
    let label_ids: Vec<i64> = body.iter().filter_map(legacy_external_label_id).collect();
    let issue = match repository
        .update_issue_labels(&owner, &project_name, number, &label_ids)
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "id": access.authorization.project.owner_name,
        "labels": issue.labels.len(),
    }))
    .into_response()
}

pub(super) async fn legacy_external_update_issue_weight(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    delta: i16,
    service: PilotServiceImpl,
) -> Response {
    if number <= 0 {
        return RestRouteError::bad_request("invalid issue weight request").into_response();
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue weight requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, true).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Permission denied",
            })),
        )
            .into_response();
    }
    let issue = match repository
        .update_issue_weight(&owner, &project_name, number, delta, Some(actor_id))
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "weight": issue.weight,
    }))
    .into_response()
}

pub(super) async fn legacy_external_read_issue(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue read requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, false).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let payload = match legacy_external_issue_result_with_detail(repository, &access.issue).await {
        Ok(payload) => payload,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "result": payload,
    }))
    .into_response()
}

pub(super) async fn legacy_external_update_issue(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let body = legacy_issue_update_body_from_value(&body);
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue update requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, true).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Permission denied",
            })),
        )
            .into_response();
    }
    let assignee_login_id = body
        .assignees
        .first()
        .map(|assignee| assignee.login_id.trim().to_string())
        .filter(|login_id| !login_id.is_empty())
        .or_else(|| {
            (!access.issue.assignee_login_id.trim().is_empty())
                .then(|| access.issue.assignee_login_id.clone())
        });
    let target_state = match body.state.as_str() {
        value if value.eq_ignore_ascii_case("open") => "open",
        value if value.eq_ignore_ascii_case("closed") => "closed",
        value if value.eq_ignore_ascii_case("close") => "closed",
        value if value.trim().is_empty() => "open",
        _ => "closed",
    };
    let issue = match repository
        .update_issue(persistence::UpdateIssueInput {
            actor_login_id: actor.login_id.clone(),
            issue_number: number,
            owner_name: owner.clone(),
            project_name: project_name.clone(),
            send_notification: true,
            values: persistence::IssueMutationInput {
                assignee_login_id,
                attachment_ids: access
                    .issue
                    .attachments
                    .iter()
                    .map(|attachment| attachment.id)
                    .collect(),
                body_markdown: if body.body.is_empty() {
                    access.issue.body_markdown.clone()
                } else {
                    body.body
                },
                due_date: None,
                is_draft: false,
                is_publish: false,
                label_ids: access.issue.labels.iter().map(|label| label.id).collect(),
                milestone_id: access.issue.milestone_id,
                parent_issue_id: access.issue.parent_issue_id,
                title: if body.title.trim().is_empty() {
                    access.issue.title.clone()
                } else {
                    body.title.trim().to_string()
                },
            },
        })
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let issue = if issue.state.eq_ignore_ascii_case(target_state) {
        issue
    } else {
        match repository
            .update_issue_state_as_actor(
                &owner,
                &project_name,
                number,
                target_state,
                actor.id,
                &actor.login_id,
            )
            .await
        {
            Ok(Some(issue)) => issue,
            Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        }
    };
    Json(serde_json::json!({
        "result": legacy_external_issue_result(&issue),
    }))
    .into_response()
}

pub(super) async fn legacy_external_detect_issue_change(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let body = legacy_issue_detect_change_body_from_value(&body);
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue detectChange requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, false).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let issue_update_date = match repository
        .read_issue_updated_at(&owner, &project_name, number)
        .await
    {
        Ok(updated_at) => updated_at
            .map(|value| value.and_utc().timestamp_millis())
            .unwrap_or_default(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let issue_body_checksum = legacy_external_sha1_hex(access.issue.body_markdown.as_bytes());
    let mut payload = serde_json::json!({
        "issueBodyChanged": issue_body_checksum != body.issue_body_checksum,
        "numOfComments": access.issue.comment_count,
        "issueBodyChecksum": issue_body_checksum,
        "issueUpdateDate": issue_update_date,
        "result": "ok",
    });
    if body.num_of_comments < access.issue.comment_count {
        if let Some(comment) = access
            .issue
            .comments
            .iter()
            .max_by_key(|comment| comment.id)
        {
            payload["commentAuthorName"] = serde_json::json!(comment.author_label);
        }
    }
    Json(payload).into_response()
}

pub(super) async fn legacy_external_issue_comment_notification_receivers(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented(
            "issue comment receivers require repository backend",
        )
        .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, false).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    if let Err(error) =
        read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await
    {
        return RestRouteError::from_connect_error(error).into_response();
    }
    let comment_markdown = legacy_json_find_value(&body, "comment")
        .and_then(|value| value.as_str())
        .unwrap_or_default();
    let parent_comment_id = legacy_json_find_value(&body, "parentCommentId")
        .and_then(|value| {
            value.as_i64().or_else(|| {
                value
                    .as_str()
                    .and_then(|raw| raw.trim().parse::<i64>().ok())
            })
        })
        .filter(|value| *value > 0);
    let receivers = match repository
        .list_issue_comment_notification_receivers(
            &owner,
            &project_name,
            number,
            actor_id,
            comment_markdown,
            parent_comment_id,
        )
        .await
    {
        Ok(Some(receivers)) => receivers,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let receivers = receivers
        .into_iter()
        .map(|receiver| {
            serde_json::json!({
                "loginId": receiver.login_id,
                "name": receiver.display_name,
                "pureNameOnly": receiver.pure_name_only,
                "avatarUrl": if receiver.avatar_url.is_empty() {
                    gravatar_url(&receiver.email_address)
                } else {
                    receiver.avatar_url
                },
                "type": "user",
            })
        })
        .collect::<Vec<_>>();

    Json(serde_json::json!({ "receivers": receivers })).into_response()
}

fn legacy_external_sha1_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha1::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

pub(super) async fn legacy_external_update_issue_content(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let body = legacy_content_update_body_from_value(&body);
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue content requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, true).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Forbidden request",
            })),
        )
            .into_response();
    }
    if access.issue.body_markdown != body.original {
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "message": "Already modified by someone.",
                "storedContent": access.issue.body_markdown,
            })),
        )
            .into_response();
    }
    let issue = match repository
        .update_issue_body(
            &owner,
            &project_name,
            number,
            actor.id,
            &actor.login_id,
            &body.content,
        )
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(legacy_external_issue_result(&issue)).into_response()
}

pub(super) async fn legacy_external_update_issue_state(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue state requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, true).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Permission denied",
            })),
        )
            .into_response();
    }
    let state = match legacy_json_find_value(&body, "state").and_then(serde_json::Value::as_str) {
        Some(value) if value.eq_ignore_ascii_case("open") => "open",
        Some(_) => "closed",
        None => "open",
    };
    let issue = match repository
        .update_issue_state_as_actor(
            &owner,
            &project_name,
            number,
            state,
            actor.id,
            &actor.login_id,
        )
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "result": legacy_external_issue_result(&issue),
    }))
    .into_response()
}

pub(super) async fn legacy_external_update_issue_assignee(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue assignee requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, true).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Permission denied",
            })),
        )
            .into_response();
    }
    let Some(assignee_login_id) = legacy_json_find_value(&body, "assignees")
        .and_then(serde_json::Value::as_array)
        .and_then(|assignees| assignees.first())
        .and_then(serde_json::Value::as_str)
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No assignee",
            })),
        )
            .into_response();
    };
    let issue = match repository
        .assign_issue(
            &owner,
            &project_name,
            number,
            Some(assignee_login_id).filter(|value| !value.trim().is_empty()),
            &actor.login_id,
        )
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let assignee = if issue.assignee_login_id.is_empty() {
        serde_json::json!({
            "loginId": "",
            "name": "None",
        })
    } else {
        serde_json::json!({
            "loginId": issue.assignee_login_id,
            "name": issue.assignee_label,
        })
    };
    Json(serde_json::json!({
        "assignee": assignee,
        "issue": format!("/{}/{}/issue/{}", owner, project_name, number),
    }))
    .into_response()
}

pub(super) async fn legacy_external_update_issue_sharer(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue sharer requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, true).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(actor) = access.actor.as_ref() else {
        return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
            "unauthorized request",
        ));
    };
    if !issue_can_mutate(&access.authorization, &access.issue, actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Permission denied",
            })),
        )
            .into_response();
    }
    let Some(sharer) = legacy_json_find_value(&body, "sharer")
        .filter(|value| !value.is_null())
        .filter(|value| match value {
            serde_json::Value::Array(items) => !items.is_empty(),
            serde_json::Value::Object(map) => !map.is_empty(),
            _ => true,
        })
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No sharer",
            })),
        )
            .into_response();
    };
    let action = legacy_json_find_value(&body, "action")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default();
    let action_result = if action.eq_ignore_ascii_case("add") {
        "added"
    } else if action.eq_ignore_ascii_case("delete") {
        "deleted"
    } else {
        return Json(serde_json::json!({
            "action": format!("Do nothing. Unsupported action: {action}"),
        }))
        .into_response();
    };
    let target_type = legacy_json_find_value(sharer, "type")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("user")
        .trim()
        .to_ascii_lowercase();
    let (target_users, sharer_name) = if target_type == "project" {
        let Some(project_id) =
            legacy_json_find_value(sharer, "loginId").and_then(legacy_external_label_id)
        else {
            return RestRouteError::not_found("issue sharer project not found").into_response();
        };
        let project = match repository.read_public_project_by_id(project_id).await {
            Ok(Some(project)) => project,
            Ok(None) => {
                return RestRouteError::not_found("issue sharer project not found").into_response()
            }
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        let users = match repository.list_project_member_users(project_id).await {
            Ok(users) => users,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        (users, project.project_name)
    } else {
        let Some(login_id) =
            legacy_json_find_value(sharer, "loginId").and_then(serde_json::Value::as_str)
        else {
            return RestRouteError::not_found("issue sharer user not found").into_response();
        };
        let user = match repository.find_user_by_login_id(login_id).await {
            Ok(Some(user)) => user,
            Ok(None) => {
                return RestRouteError::not_found("issue sharer user not found").into_response()
            }
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        let display_name = user.display_name.clone();
        (vec![user], display_name)
    };
    for target in target_users {
        let changed = if action_result == "added" {
            match repository
                .add_issue_sharer(access.issue.id, target.id, &target.login_id)
                .await
            {
                Ok(changed) => changed,
                Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
            }
        } else {
            match repository
                .remove_issue_sharer(access.issue.id, target.id)
                .await
            {
                Ok(changed) => changed,
                Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
            }
        };
        if changed {
            let event_action = if action_result == "added" {
                "share"
            } else {
                "unshare"
            };
            if let Err(error) = repository
                .record_issue_sharer_changed(
                    access.issue.id,
                    actor.id,
                    &actor.login_id,
                    target.id,
                    &target.login_id,
                    event_action,
                )
                .await
            {
                return RestRouteError::internal(error.to_string()).into_response();
            }
        }
    }
    Json(serde_json::json!({
        "action": action_result,
        "sharer": sharer_name,
    }))
    .into_response()
}

pub(super) async fn legacy_external_find_issue_sharer(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    query: RestIssueAssignableUsersQuery,
    service: PilotServiceImpl,
) -> Response {
    if !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue sharer lookup requires repository backend")
            .into_response();
    };
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let access = match read_issue_access(repository, &owner, &project_name, number, actor_id).await
    {
        Ok(access) => access,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let requested = query
        .query
        .split(',')
        .map(normalize_identifier)
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    let payload = access
        .issue
        .sharers
        .iter()
        .filter(|sharer| {
            requested.is_empty()
                || requested
                    .iter()
                    .any(|value| value.eq_ignore_ascii_case(&sharer.login_id))
        })
        .map(|sharer| {
            serde_json::json!({
                "loginId": sharer.login_id,
                "name": sharer.user_label,
                "pureNameOnly": sharer.user_label,
                "avatarUrl": "",
                "type": "user",
            })
        })
        .collect::<Vec<_>>();
    Json(payload).into_response()
}

fn legacy_external_issue_result(issue: &persistence::IssueRecord) -> serde_json::Value {
    let mut payload = serde_json::json!({
        "number": issue.issue_number,
        "id": issue.id,
        "title": issue.title,
        "type": "ISSUE_POST",
        "author": {
            "loginId": issue.author_login_id,
            "name": issue.author_label,
            "email": issue.author_email_address,
        },
        "createdAt": "",
        "updatedAt": "",
        "body": issue.body_markdown,
        "owner": issue.owner_name,
        "projectName": issue.project_name,
        "state": issue.state,
        "refUrl": format!(
            "/{}/{}/issue/{}",
            issue.owner_name, issue.project_name, issue.issue_number
        ),
    });
    if !issue.assignee_login_id.is_empty() {
        payload["assignees"] = serde_json::json!([{
            "loginId": issue.assignee_login_id,
            "name": issue.assignee_label,
            "email": issue.assignee_email_address,
        }]);
    }
    if !issue.labels.is_empty() {
        payload["labels"] = serde_json::json!(issue
            .labels
            .iter()
            .map(|label| serde_json::json!({
                "labelName": label.name,
                "labelColor": label.color,
                "category": label.category_name,
            }))
            .collect::<Vec<_>>());
    }
    if let Some(milestone_id) = issue.milestone_id {
        payload["milestoneId"] = serde_json::json!(milestone_id);
        payload["milestoneTitle"] = serde_json::json!(issue.milestone_title);
    }
    payload
}

pub(super) async fn legacy_external_issue_result_with_detail(
    repository: &PilotRepository,
    issue: &persistence::IssueRecord,
) -> Result<serde_json::Value, sea_orm::DbErr> {
    let mut payload = legacy_external_issue_result(issue);
    if !issue.attachments.is_empty() {
        payload["attachments"] = serde_json::json!(issue
            .attachments
            .iter()
            .map(legacy_external_attachment_result)
            .collect::<Vec<_>>());
    }
    if !issue.comments.is_empty() {
        payload["comments"] = serde_json::json!(issue
            .comments
            .iter()
            .filter(|comment| comment.parent_comment_id.is_none())
            .map(|comment| legacy_external_issue_comment_result(issue, comment))
            .collect::<Vec<_>>());
    }
    let events = legacy_external_issue_events_result(repository, issue).await?;
    if !events.is_empty() {
        payload["events"] = serde_json::json!(events);
    }
    Ok(payload)
}

fn legacy_external_issue_comment_result(
    issue: &persistence::IssueRecord,
    comment: &persistence::IssueCommentRecord,
) -> serde_json::Value {
    let child_comments = issue
        .comments
        .iter()
        .filter(|child| child.parent_comment_id == Some(comment.id))
        .map(|child| legacy_external_issue_comment_result(issue, child))
        .collect::<Vec<_>>();
    let mut payload = serde_json::json!({
        "id": comment.id,
        "type": "ISSUE_COMMENT",
        "author": {
            "loginId": comment.author_login_id,
            "name": comment.author_label,
            "email": comment.author_email_address,
        },
        "createdAt": comment.created_label,
        "body": comment.contents_markdown,
    });
    if !comment.attachments.is_empty() {
        payload["attachments"] = serde_json::json!(comment
            .attachments
            .iter()
            .map(legacy_external_attachment_result)
            .collect::<Vec<_>>());
    }
    if !child_comments.is_empty() {
        payload["childComments"] = serde_json::json!(child_comments);
    }
    payload
}

pub(super) async fn legacy_external_issue_events_result(
    repository: &PilotRepository,
    issue: &persistence::IssueRecord,
) -> Result<Vec<serde_json::Value>, sea_orm::DbErr> {
    let mut events = Vec::new();
    for item in &issue.timeline {
        let persistence::IssueTimelineItemRecord::Event {
            created_label,
            event_type,
            id,
            new_value,
            old_value,
            resource_href: _,
            resource_label: _,
            resource_title: _,
            sender_login_id,
            sender_label: _,
            target_login_id: _,
            target_label: _,
        } = item
        else {
            continue;
        };
        let actor = repository.find_user_by_identifier(sender_login_id).await?;
        let actor_payload = match actor {
            Some(actor) => serde_json::json!({
                "name": actor.display_name,
                "loginId": actor.login_id,
                "englishName": "",
            }),
            None => serde_json::json!({
                "name": sender_login_id,
                "loginId": sender_login_id,
                "englishName": "",
            }),
        };
        events.push(serde_json::json!({
            "id": id,
            "createdDate": created_label,
            "eventType": event_type,
            "eventDescription": event_type,
            "oldValue": old_value,
            "newValue": new_value,
            "actor": actor_payload,
        }));
    }
    Ok(events)
}

pub(crate) fn legacy_external_label_id(value: &serde_json::Value) -> Option<i64> {
    value
        .as_i64()
        .or_else(|| value.as_str()?.trim().parse::<i64>().ok())
}

pub(super) async fn legacy_external_update_issue_comment(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    comment_id: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let body = legacy_content_update_body_from_value(&body);
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue comment update requires repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, false).await {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let actor = match repository.find_user_by_id(actor_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "user not found",
            ));
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let access =
        match read_issue_access(repository, &owner, &project_name, number, Some(actor_id)).await {
            Ok(access) => access,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let Some(existing_comment) = access
        .issue
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
    else {
        return RestRouteError::not_found("issue comment not found").into_response();
    };
    if legacy_content_modified_by_others(&existing_comment.contents_markdown, &body.original) {
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "message": "Already modified by someone.",
                "storedContent": existing_comment.contents_markdown,
            })),
        )
            .into_response();
    }
    let can_edit_comment = existing_comment.author_id == Some(actor.id)
        || issue_can_mutate(&access.authorization, &access.issue, &actor);
    if !can_edit_comment {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Forbidden request",
            })),
        )
            .into_response();
    }
    let existing_attachment_ids = existing_comment
        .attachments
        .iter()
        .map(|attachment| attachment.id)
        .collect();
    let issue = match repository
        .update_issue_comment(persistence::UpdateIssueCommentInput {
            actor_id: actor.id,
            attachment_ids: existing_attachment_ids,
            comment_id,
            contents_markdown: body.content,
            issue_number: number,
            owner_name: owner,
            project_name,
            send_notification: existing_comment.author_id != Some(actor.id),
        })
        .await
    {
        Ok(Some(issue)) => issue,
        Ok(None) => return RestRouteError::not_found("issue comment not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let Some(updated_comment) = issue
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
    else {
        return RestRouteError::not_found("issue comment not found").into_response();
    };
    Json(serde_json::json!({
        "result": legacy_issue_comment_update_result(updated_comment, &actor),
    }))
    .into_response()
}

fn legacy_issue_comment_update_result(
    comment: &persistence::IssueCommentRecord,
    actor: &persistence::AppUserRecord,
) -> serde_json::Value {
    serde_json::json!({
        "id": comment.id,
        "contents": comment.contents_markdown,
        "createdDate": comment.created_label,
        "author": {
            "id": actor.id,
            "loginId": actor.login_id,
            "name": actor.display_name,
        },
    })
}

pub(super) async fn legacy_external_issue_assignable_users(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    query: RestIssueAssignableUsersQuery,
    service: PilotServiceImpl,
) -> Response {
    if !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented(
            "issue assignable users require repository backend",
        )
        .into_response();
    };
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if let Err(error) = read_issue_access(repository, &owner, &project_name, number, actor_id).await
    {
        return RestRouteError::from_connect_error(error).into_response();
    }
    let record = match repository
        .list_issue_assignable_users(
            &owner,
            &project_name,
            number,
            actor_id,
            &query.query,
            &query.search_type,
            10,
        )
        .await
    {
        Ok(Some(record)) => record,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let mut record = record;
    legacy_assignable_user_avatar_urls(repository, &mut record).await;
    let language = preferred_language_from_headers(&headers, &service.supported_languages);
    Json(legacy_external_assignable_users_result(
        record,
        language.as_deref(),
    ))
    .into_response()
}

pub(super) async fn legacy_external_issue_sharable_users(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    query: RestIssueAssignableUsersQuery,
    service: PilotServiceImpl,
) -> Response {
    if !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("issue sharable users require repository backend")
            .into_response();
    };
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if let Err(error) = read_issue_access(repository, &owner, &project_name, number, actor_id).await
    {
        return RestRouteError::from_connect_error(error).into_response();
    }
    let record = match repository
        .list_issue_sharable_users(
            &owner,
            &project_name,
            number,
            &query.query,
            &query.search_type,
            10,
        )
        .await
    {
        Ok(Some(record)) => record,
        Ok(None) => return RestRouteError::not_found("pilot issue not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    // Legacy User.avatarUrl(): uploaded avatar -> /files/{id}, else a size-64
    // gravatar of the raw email, else the default avatar asset when the
    // gravatar servers are unreachable (Config.isConnectableToGravatar).
    let mut record = record;
    legacy_assignable_user_avatar_urls(repository, &mut record).await;
    let language = preferred_language_from_headers(&headers, &service.supported_languages);
    Json(legacy_external_assignable_users_result(
        record,
        language.as_deref(),
    ))
    .into_response()
}

pub(crate) fn legacy_external_assignable_users_result(
    record: persistence::IssueAssignableUserSearchRecord,
    language: Option<&str>,
) -> Vec<serde_json::Value> {
    record
        .items
        .into_iter()
        .map(|item| {
            if item.item_type == "project" {
                // Legacy addProjectToProjects: numeric project id as loginId,
                // "owner/name" as name, empty avatarUrl, no pureNameOnly.
                return serde_json::json!({
                    "loginId": item.login_id.parse::<i64>().unwrap_or_default(),
                    "name": item.display_name,
                    "avatarUrl": item.avatar_url,
                    "type": item.item_type,
                });
            }
            if matches!(
                item.display_name.as_str(),
                "issue.assignToMe" | "issue.assignToAuthor" | "issue.noAssignee"
            ) {
                return serde_json::json!({
                    "loginId": if item.display_name == "issue.noAssignee" {
                        ""
                    } else {
                        item.login_id.as_str()
                    },
                    "name": super::super::messages::legacy_message(language, &item.display_name),
                    "avatarUrl": item.avatar_url,
                });
            }
            serde_json::json!({
                "loginId": item.login_id,
                "name": item.display_name,
                "pureNameOnly": item.pure_name_only,
                "avatarUrl": item.avatar_url,
                "type": item.item_type,
            })
        })
        .collect()
}
