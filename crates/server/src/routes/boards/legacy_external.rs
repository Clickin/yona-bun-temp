use axum::{
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};

use crate::{
    base_path_href, legacy_content_modified_by_others, legacy_content_update_body_from_value,
    legacy_external_api_auth_error_response, legacy_external_attachment_result,
    legacy_external_authenticated_user_id, legacy_external_date_string, legacy_external_label_id,
    legacy_external_parse_datetime, legacy_external_post_author,
    legacy_external_temporary_upload_file_ids, legacy_json_find_value, persistence,
    require_project_resource_create, ConnectError, PilotBackend, PilotRepository, PilotServiceImpl,
    ProjectCreatableResource, RestRouteError,
};

use super::{
    posting_can_create, posting_can_update, read_posting_access, read_posting_comment_create_access,
};

#[derive(Clone, Debug)]
struct LegacyBoardPostingsBody {
    posts: Option<Vec<LegacyBoardPostingBody>>,
}

#[derive(Clone, Debug)]
struct LegacyBoardPostingBody {
    author: Option<serde_json::Value>,
    body: String,
    created_at: Option<serde_json::Value>,
    number: Option<i64>,
    temporary_upload_files: Option<serde_json::Value>,
    title: String,
    updated_at: Option<serde_json::Value>,
}

fn legacy_board_postings_body_from_value(value: &serde_json::Value) -> LegacyBoardPostingsBody {
    LegacyBoardPostingsBody {
        posts: legacy_json_find_value(value, "posts")
            .and_then(|value| value.as_array())
            .map(|items| {
                items
                    .iter()
                    .map(legacy_board_posting_body_from_value)
                    .collect()
            }),
    }
}

fn legacy_board_posting_body_from_value(value: &serde_json::Value) -> LegacyBoardPostingBody {
    LegacyBoardPostingBody {
        author: legacy_json_find_value(value, "author").cloned(),
        body: legacy_json_find_value(value, "body")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        created_at: legacy_json_find_value(value, "createdAt").cloned(),
        number: legacy_json_find_value(value, "number").and_then(|value| {
            value
                .as_i64()
                .or_else(|| value.as_str()?.trim().parse::<i64>().ok())
        }),
        temporary_upload_files: legacy_json_find_value(value, "temporaryUploadFiles").cloned(),
        title: legacy_json_find_value(value, "title")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        updated_at: legacy_json_find_value(value, "updatedAt").cloned(),
    }
}

#[derive(Clone, Debug)]
struct LegacyBoardCommentCreateBody {
    author: Option<serde_json::Value>,
    body: String,
    created_at: Option<serde_json::Value>,
    temporary_upload_files: Option<serde_json::Value>,
}

fn legacy_board_comment_create_body_from_value(
    value: &serde_json::Value,
) -> LegacyBoardCommentCreateBody {
    LegacyBoardCommentCreateBody {
        author: legacy_json_find_value(value, "author").cloned(),
        body: legacy_json_find_value(value, "body")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        created_at: legacy_json_find_value(value, "createdAt").cloned(),
        temporary_upload_files: legacy_json_find_value(value, "temporaryUploadFiles").cloned(),
    }
}

pub(super) async fn legacy_external_create_board_postings(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let body = legacy_board_postings_body_from_value(&body);
    let Some(posts) = body.posts else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No posts key exists or value wasn't array!",
            })),
        )
            .into_response();
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("board postings require repository backend")
            .into_response();
    };
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
    let authorization = match require_project_resource_create(
        repository,
        &owner,
        &project_name,
        Some(request_user_id),
        ProjectCreatableResource::BoardPost,
    )
    .await
    {
        Ok(authorization) => authorization,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    if !posting_can_create(&authorization) {
        return RestRouteError::from_connect_error(ConnectError::permission_denied(
            "posting create is not allowed",
        ))
        .into_response();
    }

    let mut created_posts = Vec::new();
    for post in posts {
        let post_author =
            match legacy_external_post_author(repository, &request_actor, post.author.as_ref())
                .await
            {
                Ok(actor) => actor,
                Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
            };
        let created = match repository
            .create_legacy_external_posting(persistence::CreateLegacyExternalPostingInput {
                actor_display_name: post_author.display_name.clone(),
                actor_id: post_author.id,
                actor_login_id: post_author.login_id.clone(),
                attachment_actor_id: Some(request_user_id),
                created_at: legacy_external_parse_datetime(post.created_at.as_ref()),
                owner_name: owner.clone(),
                post_number: post.number.filter(|number| *number > 0),
                project_name: project_name.clone(),
                updated_at: legacy_external_parse_datetime(post.updated_at.as_ref()),
                values: persistence::PostingMutationInput {
                    attachment_ids: legacy_external_temporary_upload_file_ids(
                        post.temporary_upload_files.as_ref(),
                    ),
                    body_markdown: post.body,
                    label_ids: Vec::new(),
                    notice: false,
                    readme: false,
                    title: post.title,
                },
            })
            .await
        {
            Ok(Some(posting)) => posting,
            Ok(None) => return RestRouteError::not_found("project not found").into_response(),
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        created_posts.push(serde_json::json!({
                "status": 201,
                "location": base_path_href(
                &service.base_path,
                &format!("/{}/{}/post/{}", owner, project_name, created.post_number),
            ),
        }));
    }

    (StatusCode::CREATED, Json(created_posts)).into_response()
}

pub(super) async fn legacy_external_update_board_posting_content(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let body = legacy_content_update_body_from_value(&body);
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented(
            "board posting content requires repository backend",
        )
        .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &service, repository, true).await {
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
    let access = match read_posting_access(
        repository,
        &owner,
        &project_name,
        number,
        Some(actor_id),
    )
    .await
    {
        Ok(access) => access,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    if !posting_can_update(&access.authorization, &access.posting, &actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Forbidden request",
            })),
        )
            .into_response();
    }
    if access.posting.body_markdown != body.original {
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "message": "Already modified by someone.",
                "storedContent": access.posting.body_markdown,
            })),
        )
            .into_response();
    }

    let updated = match repository
        .update_posting(persistence::UpdatePostingInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name: owner,
            post_number: number,
            project_name,
            send_notification: true,
            values: persistence::PostingMutationInput {
                attachment_ids: access
                    .posting
                    .attachments
                    .iter()
                    .map(|attachment| attachment.id)
                    .collect(),
                body_markdown: body.content,
                label_ids: access.posting.labels.iter().map(|label| label.id).collect(),
                notice: access.posting.notice,
                readme: access.posting.readme,
                title: access.posting.title.clone(),
            },
        })
        .await
    {
        Ok(Some(posting)) => posting,
        Ok(None) => return RestRouteError::not_found("pilot posting not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let payload = match legacy_external_posting_result(repository, &updated).await {
        Ok(payload) => payload,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(payload).into_response()
}

pub(super) async fn legacy_external_create_board_posting_comment(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let body = legacy_board_comment_create_body_from_value(&body);
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented(
            "board posting comments require repository backend",
        )
        .into_response();
    };
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
    let _access = match read_posting_comment_create_access(
        repository,
        &owner,
        &project_name,
        number,
        &request_actor,
    )
    .await
    {
        Ok(access) => access,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let comment_author =
        match legacy_external_post_author(repository, &request_actor, body.author.as_ref()).await {
            Ok(actor) => actor,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
    let posting = match repository
        .create_posting_comment(persistence::CreatePostingCommentInput {
            actor_display_name: comment_author.display_name.clone(),
            actor_id: comment_author.id,
            actor_login_id: comment_author.login_id.clone(),
            attachment_actor_id: Some(request_user_id),
            attachment_ids: legacy_external_temporary_upload_file_ids(
                body.temporary_upload_files.as_ref(),
            ),
            contents_markdown: body.body,
            created_at: legacy_external_parse_datetime(body.created_at.as_ref()),
            owner_name: owner.clone(),
            parent_comment_id: None,
            post_number: number,
            project_name: project_name.clone(),
        })
        .await
    {
        Ok(Some(posting)) => posting,
        Ok(None) => return RestRouteError::not_found("pilot posting not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let comment_id = posting
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
                    &format!("/{owner}/{project_name}/post/{number}")
                ),
                comment_id,
            ),
        })),
    )
        .into_response()
}

pub(super) async fn legacy_external_update_board_posting_labels(
    owner: String,
    project_name: String,
    number: i64,
    body: Vec<serde_json::Value>,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("board posting labels require repository backend")
            .into_response();
    };
    let label_ids: Vec<i64> = body.iter().filter_map(legacy_external_label_id).collect();
    let posting = match repository
        .update_posting_labels(&owner, &project_name, number, &label_ids)
        .await
    {
        Ok(Some(posting)) => posting,
        Ok(None) => return RestRouteError::not_found("pilot posting not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "id": owner,
        "labels": posting.labels.len(),
    }))
    .into_response()
}

pub(super) async fn legacy_update_posting_comment(
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
        return RestRouteError::not_implemented(
            "board posting comment update requires repository backend",
        )
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
    let access = match read_posting_access(
        repository,
        &owner,
        &project_name,
        number,
        Some(actor_id),
    )
    .await
    {
        Ok(access) => access,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let Some(existing_comment) = access
        .posting
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
    else {
        return RestRouteError::not_found("posting comment not found").into_response();
    };
    let can_edit_comment = existing_comment.author_id == Some(actor.id)
        || posting_can_update(&access.authorization, &access.posting, &actor);
    if !can_edit_comment {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Forbidden request",
            })),
        )
            .into_response();
    }
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
    let existing_attachment_ids = existing_comment
        .attachments
        .iter()
        .map(|attachment| attachment.id)
        .collect();
    let posting = match repository
        .update_posting_comment(persistence::UpdatePostingCommentInput {
            actor_id: actor.id,
            attachment_ids: existing_attachment_ids,
            comment_id,
            contents_markdown: body.content,
            owner_name: owner,
            post_number: number,
            project_name,
        })
        .await
    {
        Ok(Some(posting)) => posting,
        Ok(None) => return RestRouteError::not_found("posting comment not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let Some(updated_comment) = posting
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
    else {
        return RestRouteError::not_found("posting comment not found").into_response();
    };
    Json(serde_json::json!({
        "result": legacy_posting_comment_update_result(updated_comment, &actor),
    }))
    .into_response()
}

fn legacy_posting_comment_update_result(
    comment: &persistence::PostingCommentRecord,
    actor: &persistence::AppUserRecord,
) -> serde_json::Value {
    serde_json::json!({
        "id": comment.id,
        "type": "NONISSUE_COMMENT",
        "author": {
            "loginId": actor.login_id,
            "name": actor.display_name,
            "email": actor.email_address,
        },
        "createdAt": legacy_external_date_string(comment.created_at),
        "body": comment.contents_markdown,
    })
}

async fn legacy_external_posting_result(
    repository: &PilotRepository,
    posting: &persistence::PostingRecord,
) -> Result<serde_json::Value, sea_orm::DbErr> {
    let author = match posting.author_id {
        Some(author_id) => repository.find_user_by_id(author_id).await?,
        None => None,
    };
    let author_login_id = author
        .as_ref()
        .map(|author| author.login_id.as_str())
        .unwrap_or(posting.author_login_id.as_str());
    let author_name = author
        .as_ref()
        .map(|author| author.display_name.as_str())
        .unwrap_or(posting.author_label.as_str());
    let author_email = author
        .as_ref()
        .map(|author| author.email_address.as_str())
        .unwrap_or("");
    let mut payload = serde_json::json!({
        "number": posting.post_number,
        "id": posting.id,
        "title": posting.title,
        "type": "BOARD_POST",
        "author": {
            "loginId": author_login_id,
            "name": author_name,
            "email": author_email,
        },
        "createdAt": legacy_external_date_string(posting.created_at),
        "updatedAt": legacy_external_date_string(posting.updated_at),
        "body": posting.body_markdown,
        "owner": posting.owner_name,
        "projectName": posting.project_name,
    });
    if !posting.attachments.is_empty() {
        payload["attachments"] = serde_json::json!(posting
            .attachments
            .iter()
            .map(legacy_external_attachment_result)
            .collect::<Vec<_>>());
    }
    if !posting.comments.is_empty() {
        payload["comments"] = serde_json::json!(posting
            .comments
            .iter()
            .map(legacy_external_posting_comment_result)
            .collect::<Vec<_>>());
    }
    Ok(payload)
}

fn legacy_external_posting_comment_result(
    comment: &persistence::PostingCommentRecord,
) -> serde_json::Value {
    serde_json::json!({
        "id": comment.id,
        "type": "NONISSUE_COMMENT",
        "author": {
            "loginId": comment.author_login_id,
            "name": comment.author_label,
            "email": "",
        },
        "createdAt": comment.created_label,
        "body": comment.contents_markdown,
    })
}
