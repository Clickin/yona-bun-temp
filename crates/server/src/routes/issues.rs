use axum::{
    extract::{Path, Query},
    http::HeaderMap,
    routing::{get, patch, post, put},
    Json, Router,
};

use crate::{
    legacy_external_detect_issue_change, legacy_external_find_issue_sharer,
    legacy_external_issue_assignable_users, legacy_external_issue_sharable_users,
    legacy_external_read_issue, legacy_external_update_issue,
    legacy_external_update_issue_assignee, legacy_external_update_issue_content,
    legacy_external_update_issue_labels, legacy_external_update_issue_sharer,
    legacy_external_update_issue_state, legacy_external_update_issue_weight,
    session::SessionManager, PilotBackend, RestIssueAssignableUsersQuery,
};

pub(crate) fn routes(session_manager: SessionManager, backend: PilotBackend) -> Router {
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
}
