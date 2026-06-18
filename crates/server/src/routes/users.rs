use axum::{
    extract::{Path, Query},
    http::HeaderMap,
    routing::{get, patch, post},
    Json, Router,
};

use crate::{
    legacy_external_admin_users, legacy_external_create_users, legacy_external_translation,
    legacy_external_update_admin_user_state, legacy_external_user_issues,
    legacy_external_user_statistics, legacy_external_user_token, legacy_external_users,
    rest_list_user_issues, rest_read_direct_issue_form_options, rest_read_public_user_profile,
    rest_read_user_statistics, session::SessionManager, LegacyExternalUserIssuesQuery,
    LegacyExternalUsersQuery, PilotBackend, PilotServiceImpl, RestDirectIssueFormQuery,
    RestPublicUserProfileQuery, RestUserIssuesQuery, TranslationProxyConfig,
};

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    let session_manager = service.session_manager.clone();
    let backend = service.backend.clone();
    let base_path = service.base_path.clone();
    let public_origin = service.public_origin.clone();

    Router::new()
        .route(
            "/users/{login_id}/profile",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(login_id): Path<String>,
                      Query(query): Query<RestPublicUserProfileQuery>| {
                    let service = service.clone();
                    async move { rest_read_public_user_profile(headers, login_id, query, service).await }
                }
            }),
        )
        .route(
            "/users/{login_id}/statistics",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_user_statistics(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/user/issues/new-options",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                let base_path = base_path.clone();
                let public_origin = public_origin.clone();
                move |headers: HeaderMap, Query(query): Query<RestDirectIssueFormQuery>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    let base_path = base_path.clone();
                    let public_origin = public_origin.clone();
                    async move {
                        rest_read_direct_issue_form_options(
                            headers,
                            query,
                            session_manager,
                            backend,
                            base_path,
                            public_origin,
                        )
                        .await
                    }
                }
            }),
        )
        .route(
            "/user/issues",
            get({
                let session_manager = session_manager.clone();
                let backend = backend.clone();
                move |headers: HeaderMap, Query(query): Query<RestUserIssuesQuery>| {
                    let session_manager = session_manager.clone();
                    let backend = backend.clone();
                    async move {
                        rest_list_user_issues(headers, query, session_manager, backend).await
                    }
                }
            }),
        )
}

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    translation_proxy: TranslationProxyConfig,
) -> Router {
    let legacy_admin_users_session_manager = session_manager.clone();
    let legacy_admin_users_backend = backend.clone();
    let legacy_admin_user_state_session_manager = session_manager.clone();
    let legacy_admin_user_state_backend = backend.clone();
    let legacy_user_search_backend = backend.clone();
    let legacy_user_create_backend = backend.clone();
    let legacy_user_create_session_manager = session_manager.clone();
    let legacy_user_token_session_manager = session_manager.clone();
    let legacy_user_token_backend = backend.clone();
    let legacy_user_issues_backend = backend.clone();
    let legacy_user_issues_session_manager = session_manager.clone();
    let legacy_user_statistics_backend = backend.clone();
    let legacy_user_statistics_session_manager = session_manager.clone();
    let legacy_translation_backend = backend;
    let legacy_translation_session_manager = session_manager;

    Router::new()
        .route(
            "/-_-api/v1/admin/users",
            get(move |headers: HeaderMap| {
                async move {
                    legacy_external_admin_users(
                        headers,
                        legacy_admin_users_session_manager.clone(),
                        legacy_admin_users_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/admin/users/{login_id}",
            patch(
                move |headers: HeaderMap,
                      Path(login_id): Path<String>,
                      Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_update_admin_user_state(
                            headers,
                            login_id,
                            body,
                            legacy_admin_user_state_session_manager.clone(),
                            legacy_admin_user_state_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/users",
            get(
                move |headers: HeaderMap, Query(query): Query<LegacyExternalUsersQuery>| {
                    async move {
                        legacy_external_users(headers, query, legacy_user_search_backend.clone())
                            .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/users",
            post(
                move |headers: HeaderMap, Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_create_users(
                            headers,
                            body,
                            legacy_user_create_session_manager.clone(),
                            legacy_user_create_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/users/token",
            post(
                move |headers: HeaderMap, Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_user_token(
                            headers,
                            body,
                            legacy_user_token_session_manager.clone(),
                            legacy_user_token_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/user/issues",
            get(
                move |headers: HeaderMap, Query(query): Query<LegacyExternalUserIssuesQuery>| {
                    async move {
                        legacy_external_user_issues(
                            headers,
                            query,
                            legacy_user_issues_session_manager.clone(),
                            legacy_user_issues_backend.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/-_-api/v1/users/{login_id}/statistics",
            get(move |headers: HeaderMap, Path(login_id): Path<String>| {
                async move {
                    legacy_external_user_statistics(
                        headers,
                        login_id,
                        legacy_user_statistics_session_manager.clone(),
                        legacy_user_statistics_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/-_-api/v1/translation",
            post(
                move |headers: HeaderMap, Json(body): Json<serde_json::Value>| {
                    async move {
                        legacy_external_translation(
                            headers,
                            body,
                            legacy_translation_session_manager.clone(),
                            legacy_translation_backend.clone(),
                            translation_proxy.clone(),
                        )
                        .await
                    }
                },
            ),
        )
}
