use axum::{
    extract::{Path, RawQuery},
    http::HeaderMap,
    routing::get,
    Router,
};

use crate::{session::SessionManager, PilotBackend, RestSearchQuery};

pub(crate) fn routes(session_manager: SessionManager, backend: PilotBackend) -> Router {
    Router::new()
        .route(
            "/search",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap, RawQuery(raw_query): RawQuery| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        let query = RestSearchQuery::from_raw_query(raw_query.as_deref())?;
                        crate::rest_search_global(headers, query, session_manager, backend).await
                    }
                }
            }),
        )
        .route(
            "/projects/{owner_name}/{project_name}/search",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path((owner_name, project_name)): Path<(String, String)>,
                      RawQuery(raw_query): RawQuery| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        let query = RestSearchQuery::from_raw_query(raw_query.as_deref())?;
                        crate::rest_search_project(
                            headers,
                            owner_name,
                            project_name,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/organizations/{organization_name}/search",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap,
                      Path(organization_name): Path<String>,
                      RawQuery(raw_query): RawQuery| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        let query = RestSearchQuery::from_raw_query(raw_query.as_deref())?;
                        crate::rest_search_organization(
                            headers,
                            organization_name,
                            query,
                            session_manager,
                            backend,
                        )
                        .await
                    }
                }
            }),
        )
}
