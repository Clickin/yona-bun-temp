use axum::{
    extract::{Path, RawQuery},
    http::HeaderMap,
    routing::get,
    Router,
};

use axum::Json;
use yona_rust_search::SearchType;

use crate::{
    decode_query_component, internal_error, normalize_identifier, parse_rest_query_u32,
    persistence, require_project_read, session::SessionManager, PilotBackend, PilotRepository,
    RestRouteError,
};

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
                        rest_search_global(headers, query, session_manager, backend).await
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
                        rest_search_project(
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
                        rest_search_organization(
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

struct RestSearchQuery {
    keyword: String,
    page_num: u32,
    search_type: String,
}

impl RestSearchQuery {
    fn from_raw_query(raw_query: Option<&str>) -> Result<Self, RestRouteError> {
        let mut keyword = None;
        let mut page_num = 1;
        let mut search_type = None;
        let raw_query =
            raw_query.ok_or_else(|| RestRouteError::bad_request("search query is required"))?;

        for pair in raw_query.split('&').filter(|pair| !pair.is_empty()) {
            let (raw_key, raw_value) = pair.split_once('=').unwrap_or((pair, ""));
            let key = decode_query_component(raw_key);
            let value = decode_query_component(raw_value);
            match key.as_str() {
                "keyword" => keyword = Some(value),
                "pageNum" => page_num = parse_rest_query_u32(&value)?.max(1),
                "searchType" => search_type = Some(normalize_identifier(&value)),
                _ => {}
            }
        }

        let keyword = keyword
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .ok_or_else(|| RestRouteError::bad_request("search keyword is required"))?;
        let search_type = search_type
            .filter(|value| SearchType::from_wire(value).is_some())
            .ok_or_else(|| RestRouteError::bad_request("invalid search type"))?;

        Ok(Self {
            keyword,
            page_num,
            search_type,
        })
    }
}

async fn rest_search_global(
    headers: HeaderMap,
    query: RestSearchQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<persistence::SearchResultRecord>, RestRouteError> {
    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "search requires repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    rest_search_with_input(
        repository,
        persistence::SearchRepositoryInput {
            actor_id,
            keyword: query.keyword,
            organization_name: None,
            owner_name: None,
            page_num: query.page_num,
            project_name: None,
            requested_search_type: query.search_type.clone(),
            search_type: query.search_type,
            scope: persistence::SearchScope::Global,
        },
    )
    .await
}

async fn rest_search_project(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    query: RestSearchQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<persistence::SearchResultRecord>, RestRouteError> {
    if owner_name.trim().is_empty() || project_name.trim().is_empty() {
        return Err(RestRouteError::bad_request("invalid search project scope"));
    }
    if query.search_type == SearchType::Project.as_wire() {
        return Err(RestRouteError::bad_request(
            "project search type is not valid in project scope",
        ));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "search requires repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization = require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    rest_search_with_input(
        repository,
        persistence::SearchRepositoryInput {
            actor_id,
            keyword: query.keyword,
            organization_name: None,
            owner_name: Some(authorization.project.owner_name),
            page_num: query.page_num,
            project_name: Some(authorization.project.project_name),
            requested_search_type: query.search_type.clone(),
            search_type: query.search_type,
            scope: persistence::SearchScope::Project,
        },
    )
    .await
}

async fn rest_search_organization(
    headers: HeaderMap,
    organization_name: String,
    query: RestSearchQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Json<persistence::SearchResultRecord>, RestRouteError> {
    if organization_name.trim().is_empty() {
        return Err(RestRouteError::bad_request(
            "invalid organization search scope",
        ));
    }

    let PilotBackend::Repository(repository) = &backend else {
        return Err(RestRouteError::not_implemented(
            "search requires repository backend",
        ));
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization = repository
        .read_organization_authorization(&organization_name, actor_id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("organization not found"))?;
    rest_search_with_input(
        repository,
        persistence::SearchRepositoryInput {
            actor_id,
            keyword: query.keyword,
            organization_name: Some(authorization.organization.organization_name),
            owner_name: None,
            page_num: query.page_num,
            project_name: None,
            requested_search_type: query.search_type.clone(),
            search_type: query.search_type,
            scope: persistence::SearchScope::Organization,
        },
    )
    .await
}

async fn rest_search_with_input(
    repository: &PilotRepository,
    input: persistence::SearchRepositoryInput,
) -> Result<Json<persistence::SearchResultRecord>, RestRouteError> {
    repository
        .search_app(input)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .map(Json)
        .ok_or_else(|| RestRouteError::not_found("search scope not found"))
}
