use axum::{
    extract::{Form, Path, Query},
    http::HeaderMap,
    routing::{delete, get, post},
    Json, Router,
};
use std::collections::HashMap;

use crate::{
    direct_create_project_milestone, direct_delete_project_milestone, direct_toggle_project_watch,
    direct_update_project_milestone, direct_update_project_milestone_state,
    legacy_external_create_milestones, legacy_external_project_assignable_users,
    legacy_external_watchers, legacy_project_create_labels, legacy_project_title_heads,
    session::SessionManager, LegacyExternalWatchersQuery, LegacyProjectTitleHeadsQuery,
    PilotBackend, RestIssueAssignableUsersQuery,
};

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Router {
    let direct_project_watch_backend = backend.clone();
    let direct_project_watch_session_manager = session_manager.clone();
    let direct_project_unwatch_backend = backend.clone();
    let direct_project_unwatch_session_manager = session_manager.clone();
    let legacy_watchers_backend = backend.clone();
    let legacy_watchers_base_path = base_path.clone();
    let legacy_project_labels_backend = backend.clone();
    let legacy_project_labels_session_manager = session_manager.clone();
    let legacy_title_heads_backend = backend.clone();
    let legacy_title_heads_session_manager = session_manager.clone();
    let legacy_project_assignable_backend = backend.clone();
    let legacy_project_assignable_session_manager = session_manager.clone();
    let legacy_milestone_backend = backend.clone();
    let legacy_milestone_session_manager = session_manager.clone();
    let milestone_create_backend = backend.clone();
    let milestone_create_session_manager = session_manager.clone();
    let milestone_create_base_path = base_path.clone();
    let milestone_update_backend = backend.clone();
    let milestone_update_session_manager = session_manager.clone();
    let milestone_update_base_path = base_path.clone();
    let milestone_delete_backend = backend.clone();
    let milestone_delete_session_manager = session_manager.clone();
    let milestone_delete_base_path = base_path.clone();
    let milestone_open_backend = backend.clone();
    let milestone_open_session_manager = session_manager.clone();
    let milestone_open_base_path = base_path.clone();
    let milestone_close_backend = backend.clone();
    let milestone_close_session_manager = session_manager.clone();
    let milestone_close_base_path = base_path.clone();

    Router::new()
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/milestones",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_create_milestones(
                            headers,
                            owner,
                            project_name,
                            body,
                            legacy_milestone_session_manager.clone(),
                            legacy_milestone_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestones",
            post(
                move |headers: HeaderMap,
                      Path((owner, project)): Path<(String, String)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_create_project_milestone(
                            headers,
                            owner,
                            project,
                            form,
                            milestone_create_session_manager.clone(),
                            milestone_create_backend.clone(),
                            milestone_create_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/edit",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>,
                      Form(form): Form<HashMap<String, String>>| {
                    async move {
                        direct_update_project_milestone(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            form,
                            milestone_update_session_manager.clone(),
                            milestone_update_backend.clone(),
                            milestone_update_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/delete",
            delete(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_delete_project_milestone(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            milestone_delete_session_manager.clone(),
                            milestone_delete_backend.clone(),
                            milestone_delete_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/open",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_update_project_milestone_state(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            "open",
                            milestone_open_session_manager.clone(),
                            milestone_open_backend.clone(),
                            milestone_open_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/close",
            post(
                move |headers: HeaderMap,
                      Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
                    async move {
                        direct_update_project_milestone_state(
                            headers,
                            owner,
                            project,
                            milestone_id,
                            "closed",
                            milestone_close_session_manager.clone(),
                            milestone_close_backend.clone(),
                            milestone_close_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/labels",
            post(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_project_create_labels(
                            headers,
                            owner,
                            project_name,
                            body,
                            legacy_project_labels_session_manager.clone(),
                            legacy_project_labels_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/titleHeads",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Query(query): Query<LegacyProjectTitleHeadsQuery>| {
                    async move {
                        legacy_project_title_heads(
                            headers,
                            owner,
                            project_name,
                            query,
                            legacy_title_heads_session_manager.clone(),
                            legacy_title_heads_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/assignableUsers",
            get(
                move |headers: HeaderMap,
                      Path((owner, project_name)): Path<(String, String)>,
                      Query(query): Query<RestIssueAssignableUsersQuery>| {
                    async move {
                        legacy_external_project_assignable_users(
                            headers,
                            owner,
                            project_name,
                            query,
                            legacy_project_assignable_session_manager.clone(),
                            legacy_project_assignable_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/owners/{owner}/projects/{project_name}/posts/{number}/watchers",
            get(
                move |Path((owner, project_name, number)): Path<(String, String, i64)>,
                      Query(query): Query<LegacyExternalWatchersQuery>| {
                    async move {
                        legacy_external_watchers(
                            owner,
                            project_name,
                            number,
                            query,
                            legacy_watchers_base_path.clone(),
                            legacy_watchers_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner_name}/{project_name}/watch",
            post(
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    async move {
                        direct_toggle_project_watch(
                            headers,
                            owner_name,
                            project_name,
                            true,
                            direct_project_watch_session_manager.clone(),
                            direct_project_watch_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/{owner_name}/{project_name}/unwatch",
            post(
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    async move {
                        direct_toggle_project_watch(
                            headers,
                            owner_name,
                            project_name,
                            false,
                            direct_project_unwatch_session_manager.clone(),
                            direct_project_unwatch_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}
