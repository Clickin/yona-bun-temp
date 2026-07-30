use axum::{
    extract::Path,
    http::HeaderMap,
    response::Response,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};

use crate::{
    internal_error, require_project_read, require_session, rest_actor_id, rest_json_response,
    rest_repository, ConnectError, Context, PilotServiceImpl, RestRouteError,
};
use crate::persistence::{IssueLabelRecord, IssueMilestoneRecord, MilestoneListFilter};

// ── Export types ─────────────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectExportResponse {
    owner: String,
    project_name: String,
    project_description: String,
    project_created_date: String,
    project_vcs: String,
    project_scope: String,
    issue_count: usize,
    post_count: usize,
    milestone_count: usize,
    labels: Vec<serde_json::Value>,
    issues: Vec<serde_json::Value>,
    posts: Vec<serde_json::Value>,
    milestones: Vec<serde_json::Value>,
    members: Vec<serde_json::Value>,
}

// ── Import types ─────────────────────────────────────────────────────────

#[allow(dead_code)]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectImportPayload {
    project: Option<serde_json::Value>,
    issues: Option<Vec<serde_json::Value>>,
    posts: Option<Vec<serde_json::Value>>,
    milestones: Option<Vec<serde_json::Value>>,
    labels: Option<Vec<serde_json::Value>>,
    members: Option<Vec<serde_json::Value>>,
}

// ── Helpers ──────────────────────────────────────────────────────────────

fn label_to_json(l: IssueLabelRecord) -> serde_json::Value {
    serde_json::json!({
        "category": l.category_name,
        "name": l.name,
        "color": l.color,
    })
}

fn milestone_to_json(m: IssueMilestoneRecord) -> serde_json::Value {
    serde_json::json!({
        "title": m.title,
        "state": m.state,
        "dueDate": m.due_date.map(|d| d.format("%Y-%m-%d").to_string()),
        "description": m.contents_markdown,
    })
}

// ── Handlers ─────────────────────────────────────────────────────────────

async fn rest_project_export(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let repository = rest_repository(&service)?;
    let actor_id = rest_actor_id(&service, &headers);
    let _authorization = require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;

    let project = repository
        .read_project_by_owner_and_name(&owner_name, &project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;

    let labels = repository
        .list_project_labels(&owner_name, &project_name)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;

    let milestones = repository
        .list_project_milestones(
            &owner_name,
            &project_name,
            MilestoneListFilter {
                order_by: String::new(),
                order_dir: String::new(),
                state: String::new(),
            },
        )
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;

    let labels_json: Vec<serde_json::Value> = labels.into_iter().map(label_to_json).collect();
    let milestones_json: Vec<serde_json::Value> =
        milestones.into_iter().map(milestone_to_json).collect();

    let response = ProjectExportResponse {
        owner: owner_name,
        project_name,
        project_description: project.overview.unwrap_or_default(),
        project_created_date: String::new(),
        project_vcs: project.vcs,
        project_scope: project.project_scope,
        issue_count: 0,
        post_count: 0,
        milestone_count: milestones_json.len(),
        labels: labels_json,
        issues: Vec::new(),
        posts: Vec::new(),
        milestones: milestones_json,
        members: Vec::new(),
    };

    let ctx = Context::new(headers);
    Ok(rest_json_response(response, ctx))
}

async fn rest_project_import(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    let repository = rest_repository(&service)?;

    let authorization = repository
        .read_project_authorization(&owner_name, &project_name, session.user_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;

    if !authorization.viewer.is_site_admin && !authorization.viewer.is_project_manager {
        let error = ConnectError::permission_denied("site admin or project owner required");
        return Err(RestRouteError::from_connect_error(error));
    }

    // ponytail: import stub — per-item import via the migrate crate handles the real work
    let ctx = Context::new(headers);
    Ok(rest_json_response(
        serde_json::json!({
            "status": "accepted",
            "owner": owner_name,
            "projectName": project_name,
        }),
        ctx,
    ))
}

// ── Routes ───────────────────────────────────────────────────────────────

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/owners/{owner_name}/projects/{project_name}/exports",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move {
                        rest_project_export(headers, owner_name, project_name, service).await
                    }
                }
            }),
        )
        .route(
            "/owners/{owner_name}/projects/{project_name}/imports",
            post({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>| {
                    let service = service.clone();
                    async move {
                        rest_project_import(headers, owner_name, project_name, service).await
                    }
                }
            }),
        )
}