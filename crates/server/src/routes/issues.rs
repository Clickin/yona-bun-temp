use axum::{extract::Path, http::HeaderMap, routing::post, Json, Router};

use crate::{
    legacy_external_update_issue_labels, legacy_external_update_issue_weight,
    session::SessionManager, PilotBackend,
};

pub(crate) fn routes(session_manager: SessionManager, backend: PilotBackend) -> Router {
    let legacy_issue_label_backend = backend.clone();
    let legacy_issue_label_session_manager = session_manager.clone();
    let legacy_issue_weight_up_backend = backend.clone();
    let legacy_issue_weight_up_session_manager = session_manager.clone();
    let legacy_issue_weight_down_backend = backend.clone();
    let legacy_issue_weight_down_session_manager = session_manager.clone();

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
}
