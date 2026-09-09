use axum::{
    extract::{Path, Query},
    http::StatusCode,
    http::{HeaderMap, Method},
    response::{IntoResponse, Redirect, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{Datelike, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};

use super::{messages::legacy_message, utils::preferred_language_from_headers};
use crate::assets::serve_frontend_page;
use crate::{
    base_path_href, direct_toggle_workspace_notification, internal_error, persistence, redirect_to,
    require_project_read, require_session, AssetMode,
    BrowserRuntimeConfig, ConnectError, PilotBackend, PilotServiceImpl, RestRouteError,
};

#[derive(Default, Deserialize)]
#[serde(default)]
struct DirectNotificationPartialQuery {
    from: Option<u32>,
    size: Option<u32>,
    limit: Option<u32>,
}

#[derive(Deserialize)]
struct LegacyResourceQuery {
    #[serde(rename = "resource.id")]
    resource_id: Option<String>,
    #[serde(rename = "resource.type")]
    resource_type: Option<String>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestNotificationsQuery {
    from: u32,
    size: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestNotificationActor {
    avatar_url: String,
    display_name: String,
    login_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestNotificationItem {
    actor: RestNotificationActor,
    created_at: String,
    created_label: String,
    event_type: String,
    id: String,
    message: String,
    target_href: String,
    target_title: String,
    type_icon: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestNotificationsResponse {
    has_more: bool,
    items: Vec<RestNotificationItem>,
    total: u32,
}

pub(crate) fn routes(
    service: PilotServiceImpl,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
) -> Router {
    let notification_service = service.clone();
    let notification_assets = assets;
    let notification_browser_runtime = browser_runtime;
    let watch_service = service.clone();
    let unwatch_get_service = service.clone();
    let unwatch_post_service = service.clone();
    let direct_notification_toggle_service = service;

    Router::new()
        .route(
            "/notification",
            get(
                move |headers: HeaderMap, Query(query): Query<DirectNotificationPartialQuery>| {
                    let service = notification_service.clone();
                    let assets = notification_assets.clone();
                    let browser_runtime = notification_browser_runtime.clone();
                    async move {
                        direct_notification_api(headers, query, service, assets, browser_runtime)
                            .await
                    }
                },
            ),
        )
        .route(
            "/noti/toggle/{project_id}/{noti_type}",
            post(
                move |headers: HeaderMap, Path((project_id, noti_type)): Path<(i64, String)>| {
                    let service = direct_notification_toggle_service.clone();
                    async move {
                        direct_toggle_workspace_notification(
                            headers, project_id, noti_type, service,
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/watch",
            post(
                move |headers: HeaderMap, query: Query<LegacyResourceQuery>| {
                    let service = watch_service.clone();
                    async move { direct_legacy_watch(headers, query, service).await }
                },
            ),
        )
        .route(
            "/unwatch",
            get(
                move |headers: HeaderMap, query: Query<LegacyResourceQuery>| {
                    let service = unwatch_get_service.clone();
                    async move { direct_legacy_unwatch(headers, query, service).await }
                },
            ),
        )
        .route(
            "/unwatch",
            post(
                move |headers: HeaderMap, query: Query<LegacyResourceQuery>| {
                    let service = unwatch_post_service.clone();
                    async move { direct_legacy_unwatch(headers, query, service).await }
                },
            ),
        )
}

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new().route(
        "/notifications",
        get({
            let service = service.clone();
            move |headers: HeaderMap, Query(query): Query<RestNotificationsQuery>| {
                let service = service.clone();
                async move { rest_list_notifications(headers, query, service).await }
            }
        }),
    )
}

fn rest_notifications_response(
    record: persistence::NotificationListRecord,
    base_path: &str,
    language: Option<&str>,
) -> RestNotificationsResponse {
    let now = Utc::now().naive_utc();
    RestNotificationsResponse {
        has_more: record.has_more,
        items: record
            .items
            .into_iter()
            .map(|item| {
                let created_label = item
                    .created
                    .map(|created| notification_created_label(created, now, language))
                    .unwrap_or_default();
                RestNotificationItem {
                    actor: RestNotificationActor {
                        avatar_url: if item.actor.avatar_url.is_empty() {
                            base_path_href(base_path, "/legacy-assets/images/default-avatar-64.png")
                        } else {
                            item.actor.avatar_url
                        },
                        display_name: item.actor.display_name,
                        login_id: item.actor.login_id,
                    },
                    created_at: item
                        .created
                        .map(|created| created.format("%Y-%m-%dT%H:%M:%S").to_string())
                        .unwrap_or_default(),
                    created_label,
                    event_type: item.event_type,
                    id: item.id.to_string(),
                    message: item.message,
                    target_href: if item.target_path.is_empty() {
                        String::new()
                    } else {
                        base_path_href(base_path, &item.target_path)
                    },
                    target_title: item.target_title,
                    type_icon: item.type_icon,
                }
            })
            .collect(),
        total: record.total,
    }
}

async fn rest_list_notifications(
    headers: HeaderMap,
    query: RestNotificationsQuery,
    service: PilotServiceImpl,
) -> Result<Json<RestNotificationsResponse>, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    let Some(user_id) = session.user_id else {
        return Err(RestRouteError::from_connect_error(
            ConnectError::unauthenticated("missing pilot user"),
        ));
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "notifications require repository backend",
        ));
    };
    let record = repository
        .list_notifications_for_user(user_id, query.from, query.size)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?;
    let language = preferred_language_from_headers(&headers, &service.supported_languages);
    Ok(Json(rest_notifications_response(
        record,
        &service.base_path,
        language.as_deref(),
    )))
}

async fn direct_notification_api(
    headers: HeaderMap,
    query: DirectNotificationPartialQuery,
    service: PilotServiceImpl,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    let wants_html = headers
        .get(axum::http::header::ACCEPT)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| {
            value
                .split(',')
                .any(|part| part.trim().starts_with("text/html"))
        });
    if wants_html {
        return serve_frontend_page(assets, Method::GET, browser_runtime).await;
    }

    let from = query.from.unwrap_or(0);
    let size = query
        .size
        .or(query.limit)
        .filter(|size| *size > 0)
        .unwrap_or(20);
    let Some(user_id) = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id)
    else {
        return Json(RestNotificationsResponse {
            has_more: false,
            items: Vec::new(),
            total: 0,
        })
        .into_response();
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("notifications require repository backend")
            .into_response();
    };
    match repository
        .list_notifications_for_user(user_id, from, size)
        .await
    {
        Ok(record) => {
            let language = preferred_language_from_headers(&headers, &service.supported_languages);
            Json(rest_notifications_response(
                record,
                &service.base_path,
                language.as_deref(),
            ))
            .into_response()
        }
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
}

async fn direct_legacy_unwatch(
    headers: HeaderMap,
    Query(query): Query<LegacyResourceQuery>,
    service: PilotServiceImpl,
) -> Response {
    let resource_type = query.resource_type.unwrap_or_default();
    let resource_id = query.resource_id.unwrap_or_default();
    if resource_type.trim().is_empty() || resource_id.trim().is_empty() {
        return RestRouteError::bad_request("resource.type and resource.id are required")
            .into_response();
    }
    let Some(session) = service.session_manager.read_session_from_headers(&headers) else {
        return Redirect::to(&base_path_href(
            &service.base_path,
            "/users/loginform?redirectUrl=%2Fnotification",
        ))
        .into_response();
    };
    let Some(user_id) = session.user_id else {
        return Redirect::to(&base_path_href(
            &service.base_path,
            "/users/loginform?redirectUrl=%2Fnotification",
        ))
        .into_response();
    };
    let repository = match &service.backend {
        PilotBackend::Repository(repository) => repository,
        PilotBackend::Static => {
            return RestRouteError::not_implemented("unwatch requires repository backend")
                .into_response();
        }
    };
    let target = match repository
        .resolve_legacy_resource_target(&resource_type, &resource_id)
        .await
    {
        Ok(Some(target)) => target,
        Ok(None) => return RestRouteError::not_found("resource not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    if let Err(error) = require_project_read(
        repository,
        &target.owner_name,
        &target.project_name,
        Some(user_id),
    )
    .await
    {
        return RestRouteError::from_connect_error(error).into_response();
    }
    match repository
        .unwatch_notification_resource(user_id, &resource_type, &resource_id)
        .await
    {
        Ok(()) if legacy_prefers_json(&headers) => StatusCode::OK.into_response(),
        Ok(()) => redirect_to(&service.base_path, &target.target_path),
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
}

async fn direct_legacy_watch(
    headers: HeaderMap,
    Query(query): Query<LegacyResourceQuery>,
    service: PilotServiceImpl,
) -> Response {
    let resource_type = query.resource_type.unwrap_or_default();
    let resource_id = query.resource_id.unwrap_or_default();
    if resource_type.trim().is_empty() || resource_id.trim().is_empty() {
        return RestRouteError::bad_request("resource.type and resource.id are required")
            .into_response();
    }
    let Some(user_id) = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id)
    else {
        return (StatusCode::FORBIDDEN, "Anonymous cannot watch it.").into_response();
    };
    let repository = match &service.backend {
        PilotBackend::Repository(repository) => repository,
        PilotBackend::Static => {
            return RestRouteError::not_implemented("watch requires repository backend")
                .into_response();
        }
    };
    let target = match repository
        .resolve_legacy_resource_target(&resource_type, &resource_id)
        .await
    {
        Ok(Some(target)) => target,
        Ok(None) => return RestRouteError::not_found("resource not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    if require_project_read(
        repository,
        &target.owner_name,
        &target.project_name,
        Some(user_id),
    )
    .await
    .is_err()
    {
        return (StatusCode::FORBIDDEN, "You have no permission to watch it.").into_response();
    }
    match repository
        .watch_notification_resource(user_id, &resource_type, &resource_id)
        .await
    {
        Ok(()) => StatusCode::OK.into_response(),
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
}

fn notification_created_label(
    created: NaiveDateTime,
    now: NaiveDateTime,
    language: Option<&str>,
) -> String {
    let seconds = (now - created).num_seconds();
    let (singular, plural, count) = match seconds {
        691_200.. => {
            return created
                .format(if created.year() == now.year() {
                    "%m-%d"
                } else {
                    "%Y-%m-%d"
                })
                .to_string();
        }
        86_400.. => ("common.time.day", "common.time.days", seconds / 86_400),
        3_600.. => ("common.time.hour", "common.time.hours", seconds / 3_600),
        60.. => ("common.time.minute", "common.time.minutes", seconds / 60),
        1.. => ("common.time.second", "common.time.seconds", seconds),
        _ => return legacy_message(language, "common.time.just"),
    };
    legacy_message(language, if count == 1 { singular } else { plural })
        .replace("{0}", &count.to_string())
}

fn legacy_prefers_json(headers: &HeaderMap) -> bool {
    headers
        .get(axum::http::header::ACCEPT)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_ascii_lowercase().contains("application/json"))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, NaiveDate};

    #[test]
    fn notification_dates_keep_legacy_age_boundaries_and_locale() {
        let now = NaiveDate::from_ymd_opt(2026, 1, 9)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        let label = |seconds, language| {
            notification_created_label(now - Duration::seconds(seconds), now, Some(language))
        };
        assert_eq!(label(691_199, "en"), "7 days ago");
        assert_eq!(label(691_200, "en"), "01-01");
        assert_eq!(label(777_600, "en"), "2025-12-31");
        assert_eq!(label(1, "en"), "1 second ago");
        assert_eq!(label(2, "en"), "2 seconds ago");
        assert_eq!(label(86_400, "ko-KR"), "1일 전");
        assert_eq!(label(-1, "ko-KR"), "방금 전");
    }
}
