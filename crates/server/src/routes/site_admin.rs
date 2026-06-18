use axum::{
    body::Bytes,
    extract::{Path, Query},
    http::HeaderMap,
    http::StatusCode,
    response::{Html, IntoResponse, Redirect, Response},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use std::{collections::HashMap, sync::atomic::Ordering};

use crate::{
    base_path_href, decode_query_component, direct_site_user_list_href, escape_html_text,
    headers_with_form_csrf, persistence, redirect_to, rest_delete_site_project,
    rest_read_site_diagnostics, rest_read_site_mail_list, rest_read_site_no_avatar_users,
    rest_require_site_admin_repository, rest_reset_site_user_password, rest_send_site_test_mail,
    rest_set_site_user_avatar_from_attachment, rest_site_update_download_file_response,
    rest_site_update_download_redirect, rest_toggle_site_user_account_lock,
    rest_toggle_site_user_admin, rest_toggle_site_user_guest, session::SessionManager,
    AuthUiConfig, ConnectError, PilotBackend, PilotServiceImpl, RestRouteError,
    RestSiteAvatarFromAttachmentBody, RestSiteDiagnosticsResponse, RestSiteMailListBody,
    RestSiteMailSendBody, SiteUpdateConfig, SITE_UPDATE_NOTIFICATION_WATCHED,
};

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    site_update: SiteUpdateConfig,
    base_path: String,
) -> Router {
    let unwatch_session_manager = session_manager.clone();
    let unwatch_backend = backend.clone();
    let site_update_download_session_manager = session_manager.clone();
    let site_update_download_backend = backend.clone();
    let site_update_download_config = site_update.clone();
    let site_update_download_file_session_manager = session_manager.clone();
    let site_update_download_file_backend = backend.clone();
    let site_update_download_file_config = site_update.clone();
    let site_toggle_admin_session_manager = session_manager.clone();
    let site_toggle_admin_backend = backend.clone();
    let site_toggle_admin_base_path = base_path.clone();
    let site_toggle_lock_session_manager = session_manager.clone();
    let site_toggle_lock_backend = backend.clone();
    let site_toggle_lock_base_path = base_path.clone();
    let site_toggle_guest_session_manager = session_manager.clone();
    let site_toggle_guest_backend = backend.clone();
    let site_toggle_guest_base_path = base_path.clone();
    let site_delete_user_session_manager = session_manager.clone();
    let site_delete_user_backend = backend.clone();
    let site_delete_user_base_path = base_path.clone();
    let site_delete_project_session_manager = session_manager.clone();
    let site_delete_project_backend = backend.clone();
    let site_delete_project_base_path = base_path.clone();
    let site_reset_user_password_session_manager = session_manager.clone();
    let site_reset_user_password_backend = backend.clone();
    let site_diagnostic_shell_session_manager = session_manager.clone();
    let site_diagnostic_shell_backend = backend.clone();
    let site_no_avatar_session_manager = session_manager.clone();
    let site_no_avatar_backend = backend.clone();
    let site_set_avatar_session_manager = session_manager.clone();
    let site_set_avatar_backend = backend.clone();
    let site_mail_send_session_manager = session_manager.clone();
    let site_mail_send_backend = backend.clone();
    let site_mail_send_base_path = base_path.clone();
    let site_mail_list_session_manager = session_manager.clone();
    let site_mail_list_backend = backend.clone();

    Router::new()
        .route(
            "/sites/diagnostic",
            get(move |headers: HeaderMap| {
                async move {
                    direct_read_site_diagnostic_shell(
                        headers,
                        site_diagnostic_shell_session_manager.clone(),
                        site_diagnostic_shell_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/noAvatarUsers",
            get(move |headers: HeaderMap| {
                async move {
                    direct_read_site_no_avatar_users(
                        headers,
                        site_no_avatar_session_manager.clone(),
                        site_no_avatar_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/setAttachmentToUserAvatar",
            post(move |headers: HeaderMap, body: Bytes| {
                async move {
                    direct_set_attachment_to_user_avatar(
                        headers,
                        body,
                        site_set_avatar_session_manager.clone(),
                        site_set_avatar_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/mail",
            post(move |headers: HeaderMap, body: Bytes| {
                async move {
                    direct_send_site_mail(
                        headers,
                        body,
                        site_mail_send_session_manager.clone(),
                        site_mail_send_backend.clone(),
                        site_mail_send_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/mailList",
            post(move |headers: HeaderMap, body: Bytes| {
                async move {
                    direct_read_site_mail_list(
                        headers,
                        body,
                        site_mail_list_session_manager.clone(),
                        site_mail_list_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/unwatchUpdate",
            post(move |headers: HeaderMap| {
                let session_manager = unwatch_session_manager.clone();
                let backend = unwatch_backend.clone();
                async move { direct_unwatch_site_update(headers, session_manager, backend).await }
            }),
        )
        .route(
            "/sites/update/download",
            get(move |headers: HeaderMap| async move {
                direct_download_site_update(
                    headers,
                    site_update_download_session_manager.clone(),
                    site_update_download_backend.clone(),
                    site_update_download_config.clone(),
                )
                .await
            }),
        )
        .route(
            "/sites/update/download-file",
            get(move |headers: HeaderMap| async move {
                direct_download_site_update_file(
                    headers,
                    site_update_download_file_session_manager.clone(),
                    site_update_download_file_backend.clone(),
                    site_update_download_file_config.clone(),
                )
                .await
            }),
        )
        .route(
            "/sites/toggleSiteAdminRole/{login_id}",
            post(move |headers: HeaderMap, Path(login_id): Path<String>| {
                async move {
                    direct_toggle_site_admin_role(
                        headers,
                        login_id,
                        site_toggle_admin_session_manager.clone(),
                        site_toggle_admin_backend.clone(),
                        site_toggle_admin_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/toggleAccountLock",
            post(
                move |headers: HeaderMap, Query(query): Query<RestSiteDirectUserMutationQuery>| {
                    async move {
                        direct_toggle_site_user_account_lock(
                            headers,
                            query,
                            site_toggle_lock_session_manager.clone(),
                            site_toggle_lock_backend.clone(),
                            site_toggle_lock_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/sites/toggleGuestMode",
            post(
                move |headers: HeaderMap, Query(query): Query<RestSiteDirectUserMutationQuery>| {
                    async move {
                        direct_toggle_site_user_guest(
                            headers,
                            query,
                            site_toggle_guest_session_manager.clone(),
                            site_toggle_guest_backend.clone(),
                            site_toggle_guest_base_path.clone(),
                        )
                        .await
                    }
                },
            ),
        )
        .route(
            "/sites/user/{*legacy_path}",
            axum::routing::delete(move |headers: HeaderMap, Path(legacy_path): Path<String>| {
                async move {
                    direct_delete_site_user_by_legacy_path(
                        headers,
                        legacy_path,
                        site_delete_user_session_manager.clone(),
                        site_delete_user_backend.clone(),
                        site_delete_user_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/sites/project/delete/{project_id}",
            axum::routing::delete(move |headers: HeaderMap, Path(project_id): Path<i64>| {
                async move {
                    direct_delete_site_project(
                        headers,
                        project_id,
                        site_delete_project_session_manager.clone(),
                        site_delete_project_backend.clone(),
                        site_delete_project_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{login_id}",
            post(move |headers: HeaderMap, Path(login_id): Path<String>| {
                async move {
                    direct_reset_site_user_password(
                        headers,
                        login_id,
                        site_reset_user_password_session_manager.clone(),
                        site_reset_user_password_backend.clone(),
                    )
                    .await
                }
            }),
        )
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestSiteDirectUserMutationQuery {
    login_id: String,
    query: Option<String>,
    state: Option<String>,
}

async fn direct_read_site_diagnostic_shell(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_read_site_diagnostics(headers, service).await {
        Ok(payload) => {
            let payload = payload.0;
            Html(render_legacy_site_diagnostic_shell(&payload)).into_response()
        }
        Err(error) => error.into_response(),
    }
}

fn render_legacy_site_diagnostic_shell(payload: &RestSiteDiagnosticsResponse) -> String {
    let body = if payload.errors.is_empty() {
        "<p>site.diagnostic.errorNotFound</p>".to_string()
    } else {
        let mut items = String::new();
        for error in &payload.errors {
            items.push_str(&format!("<li><pre>{}</pre></li>", escape_html_text(error)));
        }
        format!(
            "<p>site.diagnostic.errorFound {}</p><ul>{items}</ul>",
            payload.error_count
        )
    };
    format!(
        r#"<!doctype html>
<html>
<head><title>title.siteSetting</title></head>
<body>
<div class="site-breadcrumb-outer"><h3>site.sidebar</h3></div>
<div class="site-setting-wrap">
<ul class="site-setting-nav">
<li><a href="/sites/userList">site.sidebar.userList</a></li>
<li><a href="/sites/postList">site.sidebar.postList</a></li>
<li><a href="/sites/issueList">site.sidebar.issueList</a></li>
<li><a href="/sites/projectList">site.sidebar.projectList</a></li>
<li><a href="/sites/mail">site.sidebar.mailSend</a></li>
<li><a href="/sites/massmail">site.sidebar.massMail</a></li>
<li><a href="/sites/update">site.sidebar.update</a></li>
<li class="active"><a href="/sites/diagnostic">site.sidebar.diagnostics</a></li>
</ul>
<div class="title_area"><h2 class="pull-left">site.sidebar.diagnostics</h2></div>
{body}
</div>
</body>
</html>"#
    )
}

async fn direct_read_site_no_avatar_users(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_read_site_no_avatar_users(headers, service).await {
        Ok(payload) => payload.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_set_attachment_to_user_avatar(
    headers: HeaderMap,
    body: Bytes,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let Ok(body) = serde_json::from_slice::<RestSiteAvatarFromAttachmentBody>(&body) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "message": "Expecting Json data" })),
        )
            .into_response();
    };
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_set_site_user_avatar_from_attachment(headers, body, service).await {
        Ok(payload) => payload.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_read_site_mail_list(
    headers: HeaderMap,
    body: Bytes,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let body = direct_site_mail_list_body(&body);
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_read_site_mail_list(headers, body, service).await {
        Ok(payload) => Json(payload.0.recipients).into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_send_site_mail(
    headers: HeaderMap,
    body: Bytes,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let form = direct_site_mail_form(&body);
    let headers = headers_with_form_csrf(headers, &form);
    let body = RestSiteMailSendBody {
        from: form.get("from").cloned().unwrap_or_default(),
        to: form.get("to").cloned().unwrap_or_default(),
        subject: form.get("subject").cloned().unwrap_or_default(),
        body: form.get("body").cloned().unwrap_or_default(),
    };
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_send_site_test_mail(headers, body, service).await {
        Ok(_) => {
            Redirect::to(&base_path_href(&base_path, "/sites/mail?sended=true")).into_response()
        }
        Err(error) => error.into_response(),
    }
}

fn direct_site_mail_form(body: &[u8]) -> HashMap<String, String> {
    if let Ok(body) = serde_json::from_slice::<RestSiteMailSendBody>(body) {
        return HashMap::from([
            ("from".to_string(), body.from),
            ("to".to_string(), body.to),
            ("subject".to_string(), body.subject),
            ("body".to_string(), body.body),
        ]);
    }
    let raw = std::str::from_utf8(body).unwrap_or_default();
    let mut parsed = HashMap::new();
    for pair in raw.split('&').filter(|pair| !pair.is_empty()) {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        parsed.insert(decode_query_component(key), decode_query_component(value));
    }
    parsed
}

fn direct_site_mail_list_body(body: &[u8]) -> RestSiteMailListBody {
    if let Ok(body) = serde_json::from_slice::<RestSiteMailListBody>(body) {
        return body;
    }
    let raw = std::str::from_utf8(body).unwrap_or_default();
    let mut parsed = RestSiteMailListBody::default();
    for pair in raw.split('&').filter(|pair| !pair.is_empty()) {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        let key = decode_query_component(key);
        let value = decode_query_component(value);
        if key == "all" {
            parsed.all = value.trim().eq_ignore_ascii_case("true");
            if parsed.all {
                parsed.projects.clear();
            }
        } else if !parsed.all && !value.trim().is_empty() {
            parsed.projects.push(value);
        }
    }
    parsed
}

async fn direct_unwatch_site_update(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_require_site_admin_repository(&service, &headers, true).await {
        Ok(_) => {
            SITE_UPDATE_NOTIFICATION_WATCHED.store(false, Ordering::SeqCst);
            StatusCode::OK.into_response()
        }
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_admin_role(
    headers: HeaderMap,
    login_id: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_toggle_site_user_admin(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, "/sites/userList"),
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_user_account_lock(
    headers: HeaderMap,
    query: RestSiteDirectUserMutationQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let login_id = query.login_id.trim().to_string();
    if login_id.is_empty() {
        return RestRouteError::bad_request("loginId is required").into_response();
    }
    let redirect_path = direct_site_user_list_href(query.state.as_deref(), query.query.as_deref());
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_toggle_site_user_account_lock(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

async fn direct_toggle_site_user_guest(
    headers: HeaderMap,
    query: RestSiteDirectUserMutationQuery,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let login_id = query.login_id.trim().to_string();
    if login_id.is_empty() {
        return RestRouteError::bad_request("loginId is required").into_response();
    }
    let redirect_path = direct_site_user_list_href(query.state.as_deref(), query.query.as_deref());
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_toggle_site_user_guest(headers, login_id, service).await {
        Ok(_) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

async fn direct_reset_site_user_password(
    headers: HeaderMap,
    login_id: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_reset_site_user_password(headers, login_id, service).await {
        Ok(payload) => payload.into_response(),
        Err(error) => error.into_response(),
    }
}

async fn direct_delete_site_user_by_legacy_path(
    headers: HeaderMap,
    legacy_path: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let user_id = match direct_site_user_delete_id(&legacy_path) {
        Ok(user_id) => user_id,
        Err(error) => return error.into_response(),
    };
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    let repository = match rest_require_site_admin_repository(&service, &headers, true).await {
        Ok(repository) => repository,
        Err(error) => return error.into_response(),
    };
    let user = match repository.find_user_by_id(user_id).await {
        Ok(Some(user)) => user,
        Ok(None) => return RestRouteError::not_found("user not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    match repository.delete_site_user(&user.login_id).await {
        Ok(persistence::SiteUserDeleteResult::Deleted(_)) => {
            redirect_to(&base_path, "/sites/userList")
        }
        Ok(persistence::SiteUserDeleteResult::NotFound) => {
            RestRouteError::not_found("user not found").into_response()
        }
        Ok(persistence::SiteUserDeleteResult::OnlyManager) => RestRouteError::from_connect_error(
            ConnectError::permission_denied("site.userList.deleteAlert"),
        )
        .into_response(),
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
}

async fn direct_delete_site_project(
    headers: HeaderMap,
    project_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_delete_site_project(headers, project_id, service).await {
        Ok(_) => redirect_to(&base_path, "/sites/projectList"),
        Err(error) => error.into_response(),
    }
}

fn direct_site_user_delete_id(legacy_path: &str) -> Result<i64, RestRouteError> {
    let Some(candidate) = legacy_path
        .strip_prefix("delete/")
        .or_else(|| legacy_path.strip_prefix("delete"))
    else {
        return Err(RestRouteError::not_found("user not found"));
    };
    candidate
        .trim()
        .parse()
        .map_err(|_| RestRouteError::bad_request("invalid user id"))
}

async fn direct_download_site_update(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
    site_update: SiteUpdateConfig,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_require_site_admin_repository(&service, &headers, false).await {
        Ok(_) => match rest_site_update_download_redirect(&site_update) {
            Ok(redirect) => redirect.into_response(),
            Err(error) => error.into_response(),
        },
        Err(error) => error.into_response(),
    }
}

async fn direct_download_site_update_file(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
    site_update: SiteUpdateConfig,
) -> Response {
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_require_site_admin_repository(&service, &headers, false).await {
        Ok(_) => match rest_site_update_download_file_response(&site_update) {
            Ok(response) => response,
            Err(error) => error.into_response(),
        },
        Err(error) => error.into_response(),
    }
}
