use axum::{
    extract::{Path, Query},
    http::HeaderMap,
    routing::{delete, get, patch, post, put},
    Form, Json, Router,
};
use std::collections::HashMap;

use crate::{
    direct_create_issue_comment, direct_delete_issue_comment, direct_issue_comment_vote,
    direct_update_issue_comment, legacy_external_create_issue_comment,
    legacy_external_detect_issue_change, legacy_external_find_issue_sharer,
    legacy_external_issue_assignable_users, legacy_external_issue_comment_notification_receivers,
    legacy_external_issue_sharable_users, legacy_external_read_issue, legacy_external_update_issue,
    legacy_external_update_issue_assignee, legacy_external_update_issue_comment,
    legacy_external_update_issue_content, legacy_external_update_issue_labels,
    legacy_external_update_issue_sharer, legacy_external_update_issue_state,
    legacy_external_update_issue_weight, session::SessionManager, PilotBackend,
    RestIssueAssignableUsersQuery,
};

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Router {
    let legacy_issue_label_backend = backend.clone();
    let legacy_issue_label_session_manager = session_manager.clone();
    let legacy_issue_weight_up_backend = backend.clone();
    let legacy_issue_weight_up_session_manager = session_manager.clone();
    let legacy_issue_weight_down_backend = backend.clone();
    let legacy_issue_weight_down_session_manager = session_manager.clone();
    let legacy_issue_content_backend = backend.clone();
    let legacy_issue_content_session_manager = session_manager.clone();
    let legacy_issue_detect_change_backend = backend.clone();
    let legacy_issue_detect_change_session_manager = session_manager.clone();
    let legacy_issue_read_backend = backend.clone();
    let legacy_issue_read_session_manager = session_manager.clone();
    let legacy_issue_update_backend = backend.clone();
    let legacy_issue_update_session_manager = session_manager.clone();
    let legacy_issue_state_backend = backend.clone();
    let legacy_issue_state_session_manager = session_manager.clone();
    let legacy_issue_assignee_backend = backend.clone();
    let legacy_issue_assignee_session_manager = session_manager.clone();
    let legacy_issue_share_backend = backend.clone();
    let legacy_issue_share_session_manager = session_manager.clone();
    let legacy_issue_find_sharer_backend = backend.clone();
    let legacy_issue_find_sharer_session_manager = session_manager.clone();
    let legacy_issue_assignable_backend = backend.clone();
    let legacy_issue_assignable_session_manager = session_manager.clone();
    let legacy_issue_sharable_backend = backend.clone();
    let legacy_issue_sharable_session_manager = session_manager.clone();
    let legacy_issue_comment_backend = backend.clone();
    let legacy_issue_comment_session_manager = session_manager.clone();
    let legacy_issue_comment_base_path = base_path.clone();
    let legacy_issue_comment_receivers_backend = backend.clone();
    let legacy_issue_comment_receivers_session_manager = session_manager.clone();
    let legacy_issue_comment_update_backend = backend.clone();
    let legacy_issue_comment_update_session_manager = session_manager.clone();
    let issue_comment_create_backend = backend.clone();
    let issue_comment_create_session_manager = session_manager.clone();
    let issue_comment_create_base_path = base_path.clone();
    let issue_comment_create_public_origin = public_origin.clone();
    let issue_comment_update_backend = backend.clone();
    let issue_comment_update_session_manager = session_manager.clone();
    let issue_comment_update_base_path = base_path.clone();
    let issue_comment_delete_backend = backend.clone();
    let issue_comment_delete_session_manager = session_manager.clone();
    let issue_comment_delete_base_path = base_path.clone();
    let comment_vote_backend = backend.clone();
    let comment_vote_session_manager = session_manager.clone();
    let comment_vote_base_path = base_path.clone();
    let comment_unvote_backend = backend.clone();
    let comment_unvote_session_manager = session_manager.clone();
    let comment_unvote_base_path = base_path.clone();

    Router::new()
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issuelabel/{number}",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<Vec<serde_json::Value>>| {
                    async move {
                        legacy_external_update_issue_labels(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_label_session_manager.clone(),
                            legacy_issue_label_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/upvoteWeight",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>| {
                    async move {
                        legacy_external_update_issue_weight(
                            headers,
                            owner,
                            project_name,
                            number,
                            1,
                            legacy_issue_weight_up_session_manager.clone(),
                            legacy_issue_weight_up_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/downvoteWeight",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>| {
                    async move {
                        legacy_external_update_issue_weight(
                            headers,
                            owner,
                            project_name,
                            number,
                            -1,
                            legacy_issue_weight_down_session_manager.clone(),
                            legacy_issue_weight_down_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/content",
            patch(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue_content(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_content_session_manager.clone(),
                            legacy_issue_content_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/detectChange",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_detect_issue_change(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_detect_change_session_manager.clone(),
                            legacy_issue_detect_change_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>| {
                    async move {
                        legacy_external_read_issue(
                            headers,
                            owner,
                            project_name,
                            number,
                            legacy_issue_read_session_manager.clone(),
                            legacy_issue_read_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}",
            put(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_update_session_manager.clone(),
                            legacy_issue_update_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}",
            patch(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue_state(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_state_session_manager.clone(),
                            legacy_issue_state_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/assignees",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue_assignee(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_assignee_session_manager.clone(),
                            legacy_issue_assignee_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/share",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue_sharer(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_share_session_manager.clone(),
                            legacy_issue_share_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/findSharer",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    async move {
                        legacy_external_find_issue_sharer(
                            headers,
                            owner,
                            project_name,
                            number,
                            query,
                            legacy_issue_find_sharer_session_manager.clone(),
                            legacy_issue_find_sharer_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/assignableUsers",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    async move {
                        legacy_external_issue_assignable_users(
                            headers,
                            owner,
                            project_name,
                            number,
                            query,
                            legacy_issue_assignable_session_manager.clone(),
                            legacy_issue_assignable_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/sharableUsers",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    async move {
                        legacy_external_issue_sharable_users(
                            headers,
                            owner,
                            project_name,
                            number,
                            query,
                            legacy_issue_sharable_session_manager.clone(),
                            legacy_issue_sharable_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/comments",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_create_issue_comment(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_comment_session_manager.clone(),
                            legacy_issue_comment_backend.clone(),
                            legacy_issue_comment_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/comments/{comment_id}",
            put(
                move |headers: HeaderMap,
                      Path((owner, project_name, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_issue_comment(
                            headers,
                            owner,
                            project_name,
                            number,
                            comment_id,
                            body,
                            legacy_issue_comment_update_session_manager.clone(),
                            legacy_issue_comment_update_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/issues/{number}/commentNotiReceivers",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_issue_comment_notification_receivers(
                            headers,
                            owner,
                            project_name,
                            number,
                            body,
                            legacy_issue_comment_receivers_session_manager.clone(),
                            legacy_issue_comment_receivers_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/{number}/comments",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number)): Path<(String, String, i64)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_issue_comment(
                            headers,
                            owner,
                            project,
                            number,
                            form,
                            issue_comment_create_session_manager.clone(),
                            issue_comment_create_backend.clone(),
                            issue_comment_create_base_path.clone(),
                            issue_comment_create_public_origin.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/{number}/comments/{comment_id}",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_update_issue_comment(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            form,
                            issue_comment_update_session_manager.clone(),
                            issue_comment_update_backend.clone(),
                            issue_comment_update_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/{number}/comment/{comment_id}/delete",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    async move {
                        direct_delete_issue_comment(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            issue_comment_delete_session_manager.clone(),
                            issue_comment_delete_backend.clone(),
                            issue_comment_delete_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/{number}/comment/{comment_id}/vote",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    async move {
                        direct_issue_comment_vote(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            "vote",
                            comment_vote_session_manager.clone(),
                            comment_vote_backend.clone(),
                            comment_vote_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/issue/{number}/comment/{comment_id}/unvote",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, number, comment_id)): Path<(
                    String,
                    String,
                    i64,
                    i64,
                )>| {
                    async move {
                        direct_issue_comment_vote(
                            headers,
                            owner,
                            project,
                            number,
                            comment_id,
                            "unvote",
                            comment_unvote_session_manager.clone(),
                            comment_unvote_backend.clone(),
                            comment_unvote_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}
