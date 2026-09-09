use axum::{
    extract::Path,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::delete,
    Router,
};

use crate::routes::utils::{
    internal_error, project_update_allowed, remove_unreferenced_attachment_blobs,
    require_authenticated_user, require_session, require_valid_csrf,
    rest_require_project_code_read,
};
use crate::{persistence, PilotBackend, PilotServiceImpl, RestRouteError};

pub(crate) fn routes(service: PilotServiceImpl) -> Router {
    Router::new().route(
        "/comments/{comment_type}/{comment_id}",
        delete(
            move |headers: HeaderMap, Path((comment_type, comment_id)): Path<(String, i64)>| {
                direct_delete_legacy_comment(headers, comment_type, comment_id, service.clone())
            },
        ),
    )
}

async fn direct_delete_legacy_comment(
    headers: HeaderMap,
    comment_type: String,
    comment_id: i64,
    service: PilotServiceImpl,
) -> Response {
    if !matches!(comment_type.as_str(), "code_comment" | "review_comment") {
        return StatusCode::BAD_REQUEST.into_response();
    }
    match delete_legacy_review_comment(&headers, &comment_type, comment_id, service).await {
        Ok(()) => StatusCode::OK.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn delete_legacy_review_comment(
    headers: &HeaderMap,
    comment_type: &str,
    comment_id: i64,
    service: PilotServiceImpl,
) -> Result<(), RestRouteError> {
    let session = require_session(&service.session_manager, headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "comment delete requires repository backend",
        ));
    };
    let actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let target = repository
        .read_legacy_review_comment_delete_target(comment_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::bad_request("comment not found"))?;
    let mut attachment_hashes = repository
        .list_attachments_by_container("REVIEW_COMMENT", comment_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .into_iter()
        .map(|attachment| attachment.hash)
        .collect::<Vec<_>>();
    if let Some(thread_id) = repository
        .read_review_comment_thread_id(comment_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
    {
        attachment_hashes.extend(
            repository
                .list_attachments_by_container("COMMENT_THREAD", thread_id)
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?
                .into_iter()
                .map(|attachment| attachment.hash),
        );
    }

    match (comment_type, target.kind) {
        (
            "code_comment",
            persistence::LegacyReviewCommentDeleteTargetKind::Commit { commit_id },
        ) => {
            let authorization = rest_require_project_code_read(
                repository,
                &target.owner_name,
                &target.project_name,
                Some(actor.id),
            )
            .await?;
            let can_moderate = project_update_allowed(&authorization).unwrap_or(false);
            if !(can_moderate || target.author_id == Some(actor.id)) {
                return Err(RestRouteError::from_connect_error(
                    crate::ConnectError::permission_denied("comment delete is not allowed"),
                ));
            }
            repository
                .delete_commit_discussion_comment(persistence::DeleteCommitDiscussionCommentInput {
                    actor_id: actor.id,
                    comment_id,
                    commit_id,
                    owner_name: target.owner_name,
                    project_name: target.project_name,
                })
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?
                .ok_or_else(|| RestRouteError::bad_request("comment not found"))?;
            remove_unreferenced_attachment_blobs(
                repository,
                &service.data_root,
                attachment_hashes.iter(),
            )
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
            Ok(())
        }
        (
            "review_comment",
            persistence::LegacyReviewCommentDeleteTargetKind::PullRequest {
                pull_request_number,
            },
        ) => {
            let authorization = rest_require_project_code_read(
                repository,
                &target.owner_name,
                &target.project_name,
                Some(actor.id),
            )
            .await?;
            let can_moderate = project_update_allowed(&authorization).unwrap_or(false);
            if !(can_moderate || target.author_id == Some(actor.id)) {
                return Err(RestRouteError::from_connect_error(
                    crate::ConnectError::permission_denied("comment delete is not allowed"),
                ));
            }
            repository
                .delete_pull_request_comment(persistence::DeletePullRequestCommentInput {
                    actor_id: actor.id,
                    comment_id,
                    owner_name: target.owner_name,
                    project_name: target.project_name,
                    pull_request_number,
                })
                .await
                .map_err(internal_error)
                .map_err(RestRouteError::from_connect_error)?
                .ok_or_else(|| RestRouteError::bad_request("comment not found"))?;
            remove_unreferenced_attachment_blobs(
                repository,
                &service.data_root,
                attachment_hashes.iter(),
            )
            .await
            .map_err(internal_error)
            .map_err(RestRouteError::from_connect_error)?;
            Ok(())
        }
        _ => Err(RestRouteError::bad_request("comment type is invalid")),
    }
}
