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
    session::SessionManager, LegacyExternalUserIssuesQuery, LegacyExternalUsersQuery, PilotBackend,
    TranslationProxyConfig,
};

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
