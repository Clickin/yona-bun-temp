pub mod persistence;
pub mod runtime_config;
pub mod session;

use axum::extract::{Form, Multipart};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Redirect, Response};
use axum::routing::{delete, get, post, put};
use axum::{extract::Path, http::Method};
use axum::{Json, Router};
use bcrypt::{hash, verify, DEFAULT_COST};
use buffa::view::OwnedView;
use connectrpc::{ConnectError, Context};
use http::header::SET_COOKIE;
use http::{HeaderValue, StatusCode};
use md5::{Digest, Md5};
use pulldown_cmark::{html, Options, Parser};
use runtime_config::normalize_base_path;
use sea_orm::entity::prelude::DateTime;
use serde::Serialize;
use session::{SessionConfig, SessionManager};
use std::sync::Arc;
use std::{collections::HashMap, path::PathBuf, vec};

use generated::yona::pilot::v1::*;
use persistence::PilotRepository;
use yona_rust_domain::{
    authorize_project_access, can_create_organization_project, can_create_personal_project,
    can_request_project_enrollment, can_update_organization, is_valid_organization_name,
    is_valid_project_name, normalize_default_landing_path, ProjectAccessFacts, ProjectOperation,
    ProjectScope, DEFAULT_LANDING_FALLBACK_PATH,
};
use yona_rust_integrations::{deliver, OutboundMail};

#[allow(clippy::missing_panics_doc)]
pub mod generated {
    include!(concat!(env!("OUT_DIR"), "/_connectrpc.rs"));
}

pub mod embedded_assets {
    include!(concat!(env!("OUT_DIR"), "/_embedded_assets.rs"));
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct RuntimeConfig {
    pub base_path: String,
    pub public_origin: String,
}

pub fn create_router(config: RuntimeConfig) -> Router {
    build_router(config, PilotBackend::Static, AssetMode::None)
}

pub fn create_router_with_repository(config: RuntimeConfig, repository: PilotRepository) -> Router {
    build_router(
        config,
        PilotBackend::Repository(repository),
        AssetMode::None,
    )
}

pub fn create_router_with_app_repository(
    config: RuntimeConfig,
    repository: PilotRepository,
) -> Router {
    create_router_with_repository(config, repository)
}

pub fn create_router_with_filesystem_assets(config: RuntimeConfig, asset_root: PathBuf) -> Router {
    build_router(
        config,
        PilotBackend::Static,
        AssetMode::Filesystem(asset_root),
    )
}

pub fn create_router_with_embedded_assets(config: RuntimeConfig) -> Router {
    build_router(config, PilotBackend::Static, AssetMode::Embedded)
}

pub fn create_router_with_repository_and_filesystem_assets(
    config: RuntimeConfig,
    repository: PilotRepository,
    asset_root: PathBuf,
) -> Router {
    build_router(
        config,
        PilotBackend::Repository(repository),
        AssetMode::Filesystem(asset_root),
    )
}

pub fn create_router_with_repository_and_embedded_assets(
    config: RuntimeConfig,
    repository: PilotRepository,
) -> Router {
    build_router(
        config,
        PilotBackend::Repository(repository),
        AssetMode::Embedded,
    )
}

fn build_router(config: RuntimeConfig, backend: PilotBackend, assets: AssetMode) -> Router {
    let base_path = normalize_base_path(&config.base_path);
    let public_origin = default_public_origin(&config.public_origin);
    let session_manager = SessionManager::new(SessionConfig {
        cookie_path: base_path.clone(),
        public_origin: public_origin.clone(),
    });
    let route_backend = backend.clone();
    let browser_runtime = BrowserRuntimeConfig::from_base_path(&base_path);
    let connect_router = Arc::new(PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin: public_origin.clone(),
        session_manager: session_manager.clone(),
        backend,
    })
    .register(connectrpc::Router::new())
    .into_axum_service();
    let lost_password_session_manager = session_manager.clone();
    let lost_password_backend = route_backend.clone();
    let lost_password_base_path = base_path.clone();
    let lost_password_public_origin = public_origin.clone();
    let reset_password_backend = route_backend.clone();
    let reset_password_base_path = base_path.clone();
    let send_validation_session_manager = session_manager.clone();
    let send_validation_backend = route_backend.clone();
    let send_validation_base_path = base_path.clone();
    let send_validation_public_origin = public_origin.clone();
    let confirm_email_session_manager = session_manager.clone();
    let confirm_email_backend = route_backend.clone();
    let confirm_email_base_path = base_path.clone();
    let file_session_manager = session_manager.clone();
    let file_backend = route_backend.clone();
    let file_base_path = base_path.clone();
    let file_read_session_manager = session_manager.clone();
    let file_read_backend = route_backend.clone();
    let label_list_backend = route_backend.clone();
    let label_list_session_manager = session_manager.clone();
    let label_create_backend = route_backend.clone();
    let label_create_session_manager = session_manager.clone();
    let label_css_backend = route_backend.clone();
    let label_css_session_manager = session_manager.clone();
    let label_update_backend = route_backend.clone();
    let label_update_session_manager = session_manager.clone();
    let label_delete_backend = route_backend.clone();
    let label_delete_session_manager = session_manager.clone();
    let category_list_backend = route_backend.clone();
    let category_list_session_manager = session_manager.clone();
    let category_create_backend = route_backend.clone();
    let category_create_session_manager = session_manager.clone();
    let category_update_backend = route_backend.clone();
    let category_update_session_manager = session_manager.clone();
    let category_delete_backend = route_backend.clone();
    let category_delete_session_manager = session_manager.clone();
    let milestone_create_backend = route_backend.clone();
    let milestone_create_session_manager = session_manager.clone();
    let milestone_create_base_path = base_path.clone();
    let milestone_update_backend = route_backend.clone();
    let milestone_update_session_manager = session_manager.clone();
    let milestone_update_base_path = base_path.clone();
    let milestone_delete_backend = route_backend.clone();
    let milestone_delete_session_manager = session_manager.clone();
    let milestone_delete_base_path = base_path.clone();
    let milestone_open_backend = route_backend.clone();
    let milestone_open_session_manager = session_manager.clone();
    let milestone_open_base_path = base_path.clone();
    let milestone_close_backend = route_backend.clone();
    let milestone_close_session_manager = session_manager.clone();
    let milestone_close_base_path = base_path.clone();

    let mut base_router = Router::new()
        .route(
            "/api/auth/session",
            get(move |headers: HeaderMap| {
                let session_manager = session_manager.clone();
                let backend = route_backend.clone();
                async move { session_bootstrap(headers, session_manager, backend).await }
            }),
        )
        .route(
            "/lostPassword",
            post(move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_request_reset_password_email(
                        headers,
                        form,
                        lost_password_session_manager.clone(),
                        lost_password_backend.clone(),
                        lost_password_base_path.clone(),
                        lost_password_public_origin.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/resetPassword",
            post(move |Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_reset_password(
                        form,
                        reset_password_backend.clone(),
                        reset_password_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/email/sendValidationEmail/{email_id}",
            post(move |headers: HeaderMap, Path(email_id): Path<String>, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_send_workspace_email_validation(
                        headers,
                        email_id,
                        form,
                        send_validation_session_manager.clone(),
                        send_validation_backend.clone(),
                        send_validation_base_path.clone(),
                        send_validation_public_origin.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/user/email/confirm/{email_id}/{token}",
            get(move |headers: HeaderMap, Path((email_id, token)): Path<(String, String)>| {
                async move {
                    direct_confirm_workspace_email(
                        headers,
                        email_id,
                        token,
                        confirm_email_session_manager.clone(),
                        confirm_email_backend.clone(),
                        confirm_email_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/files",
            post(move |headers: HeaderMap, multipart: Multipart| {
                async move {
                    upload_file(
                        headers,
                        multipart,
                        file_session_manager.clone(),
                        file_backend.clone(),
                        file_base_path.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/files/{id}",
            get(move |headers: HeaderMap, Path(id): Path<i64>| {
                async move {
                    get_uploaded_file(
                        headers,
                        id,
                        file_read_session_manager.clone(),
                        file_read_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{owner}/{project}/issue/labels",
            get(move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>| {
                async move {
                    direct_list_issue_labels(
                        headers,
                        owner,
                        project,
                        label_list_session_manager.clone(),
                        label_list_backend.clone(),
                    )
                    .await
                }
            })
            .post(move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_create_issue_label(
                        headers,
                        owner,
                        project,
                        form,
                        label_create_session_manager.clone(),
                        label_create_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{owner}/{project}/issue/labels.css",
            get(move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>| {
                async move {
                    direct_issue_label_css(
                        headers,
                        owner,
                        project,
                        label_css_session_manager.clone(),
                        label_css_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{owner}/{project}/issue/label/{label_id}",
            put(move |headers: HeaderMap, Path((owner, project, label_id)): Path<(String, String, i64)>, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_update_issue_label(
                        headers,
                        owner,
                        project,
                        label_id,
                        form,
                        label_update_session_manager.clone(),
                        label_update_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{owner}/{project}/issue/label/{label_id}/delete",
            post(move |headers: HeaderMap, Path((owner, project, label_id)): Path<(String, String, i64)>, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_delete_issue_label(
                        headers,
                        owner,
                        project,
                        label_id,
                        form,
                        label_delete_session_manager.clone(),
                        label_delete_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{owner}/{project}/issue/label/categories",
            get(move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>| {
                async move {
                    direct_list_issue_label_categories(
                        headers,
                        owner,
                        project,
                        category_list_session_manager.clone(),
                        category_list_backend.clone(),
                    )
                    .await
                }
            })
            .post(move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_create_issue_label_category(
                        headers,
                        owner,
                        project,
                        form,
                        category_create_session_manager.clone(),
                        category_create_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{owner}/{project}/issue/label/category/{category_id}",
            put(move |headers: HeaderMap, Path((owner, project, category_id)): Path<(String, String, i64)>, Form(form): Form<HashMap<String, String>>| {
                async move {
                    direct_update_issue_label_category(
                        headers,
                        owner,
                        project,
                        category_id,
                        form,
                        category_update_session_manager.clone(),
                        category_update_backend.clone(),
                    )
                    .await
                }
            })
            .delete(move |headers: HeaderMap, Path((owner, project, category_id)): Path<(String, String, i64)>| {
                async move {
                    direct_delete_issue_label_category(
                        headers,
                        owner,
                        project,
                        category_id,
                        category_delete_session_manager.clone(),
                        category_delete_backend.clone(),
                    )
                    .await
                }
            }),
        )
        .route(
            "/{owner}/{project}/milestones",
            post(move |headers: HeaderMap, Path((owner, project)): Path<(String, String)>, Form(form): Form<HashMap<String, String>>| {
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
            }),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/edit",
            post(move |headers: HeaderMap, Path((owner, project, milestone_id)): Path<(String, String, i64)>, Form(form): Form<HashMap<String, String>>| {
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
            }),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/delete",
            delete(move |headers: HeaderMap, Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
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
            }),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/open",
            post(move |headers: HeaderMap, Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
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
            }),
        )
        .route(
            "/{owner}/{project}/milestone/{milestone_id}/close",
            post(move |headers: HeaderMap, Path((owner, project, milestone_id)): Path<(String, String, i64)>| {
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
            }),
        )
        .nest_service("/rpc", connect_router);

    match assets.clone() {
        AssetMode::Filesystem(asset_root) => {
            let asset_root_for_assets = asset_root.clone();
            let browser_runtime_for_assets = browser_runtime.clone();
            let asset_root_for_index = asset_root.clone();
            let browser_runtime_for_index = browser_runtime.clone();
            let asset_root_for_fallback = asset_root.clone();
            let browser_runtime_for_fallback = browser_runtime.clone();

            if base_path == "/" {
                base_router = base_router.route(
                    "/",
                    get(move || {
                        let asset_root = asset_root_for_index.clone();
                        let browser_runtime = browser_runtime_for_index.clone();
                        async move { serve_index_html(asset_root, browser_runtime).await }
                    }),
                );
            }

            base_router =
                base_router
                    .route(
                        "/assets/{*path}",
                        get(move |Path(path): Path<String>| {
                            let asset_root = asset_root_for_assets.clone();
                            let browser_runtime = browser_runtime_for_assets.clone();
                            async move {
                                serve_filesystem_asset(asset_root, &path, browser_runtime).await
                            }
                        }),
                    )
                    .fallback(move |method: Method| {
                        let asset_root = asset_root_for_fallback.clone();
                        let browser_runtime = browser_runtime_for_fallback.clone();
                        async move {
                            serve_filesystem_fallback(asset_root, method, browser_runtime).await
                        }
                    });
        }
        AssetMode::Embedded => {
            let browser_runtime_for_index = browser_runtime.clone();
            let browser_runtime_for_assets = browser_runtime.clone();
            let browser_runtime_for_fallback = browser_runtime.clone();

            if base_path == "/" {
                base_router = base_router.route(
                    "/",
                    get(move || {
                        let browser_runtime = browser_runtime_for_index.clone();
                        async move { serve_embedded_index_html(browser_runtime).await }
                    }),
                );
            }

            base_router = base_router
                .route(
                    "/assets/{*path}",
                    get(move |Path(path): Path<String>| {
                        let browser_runtime = browser_runtime_for_assets.clone();
                        async move { serve_embedded_asset(&path, browser_runtime).await }
                    }),
                )
                .fallback(move |method: Method| {
                    let browser_runtime = browser_runtime_for_fallback.clone();
                    async move { serve_embedded_fallback(method, browser_runtime).await }
                });
        }
        AssetMode::None => {}
    }

    if base_path == "/" {
        base_router
    } else if let AssetMode::Filesystem(asset_root) = assets {
        let browser_runtime_for_mount = browser_runtime.clone();
        let asset_root_for_mount = asset_root.clone();

        Router::new()
            .route(
                &format!("{base_path}/"),
                get(move || {
                    let asset_root = asset_root_for_mount.clone();
                    let browser_runtime = browser_runtime_for_mount.clone();
                    async move { serve_index_html(asset_root, browser_runtime).await }
                }),
            )
            .nest(&base_path, base_router)
    } else if matches!(assets, AssetMode::Embedded) {
        let browser_runtime_for_mount = browser_runtime.clone();

        Router::new()
            .route(
                &format!("{base_path}/"),
                get(move || {
                    let browser_runtime = browser_runtime_for_mount.clone();
                    async move { serve_embedded_index_html(browser_runtime).await }
                }),
            )
            .nest(&base_path, base_router)
    } else {
        Router::new().nest(&base_path, base_router)
    }
}

async fn session_bootstrap(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> impl IntoResponse {
    let session = session_manager.ensure_anonymous_session(&headers);
    let payload = build_session_route_payload(&backend, &session).await;
    let mut response = Json(payload).into_response();
    response.headers_mut().insert(
        "X-CSRF-Token",
        session.csrf_token.parse().expect("csrf token header"),
    );
    for cookie in session_manager.build_set_cookie_headers(&session) {
        response.headers_mut().append(
            axum::http::header::SET_COOKIE,
            cookie.parse().expect("set-cookie header"),
        );
    }
    response
}

fn base_path_href(base_path: &str, path: &str) -> String {
    if base_path == "/" {
        path.to_string()
    } else {
        format!("{base_path}{path}")
    }
}

fn default_public_origin(configured: &str) -> String {
    let candidate = if configured.trim().is_empty() {
        std::env::var("YONA_PUBLIC_ORIGIN")
            .ok()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "http://localhost:3001".to_string())
    } else {
        configured.trim().to_string()
    };
    candidate.trim_end_matches('/').to_string()
}

fn absolute_app_url(public_origin: &str, base_path: &str, path: &str) -> String {
    format!("{public_origin}{}", base_path_href(base_path, path))
}

fn default_smtp_from() -> String {
    std::env::var("SMTP_FROM")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "noreply@yona.local".to_string())
}

fn gravatar_url(email_address: &str) -> String {
    let normalized = normalize_identifier(email_address);
    let mut hasher = Md5::new();
    hasher.update(normalized.as_bytes());
    format!(
        "https://www.gravatar.com/avatar/{:x}?s=256&d=identicon",
        hasher.finalize()
    )
}

fn uploaded_files_root() -> PathBuf {
    let base = std::env::var("YONA_DATA")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(".yona-data"));
    base.join("uploads")
}

fn uploaded_file_path(hash: &str) -> PathBuf {
    uploaded_files_root().join(hash)
}

fn random_storage_token() -> String {
    use base64::Engine;
    use rand::RngCore;

    let mut bytes = [0_u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

fn send_signup_verification_mail(
    to: &str,
    login_id: &str,
    verification_code: &str,
    public_origin: &str,
    base_path: &str,
) -> Result<(), ConnectError> {
    let verify_url = absolute_app_url(
        public_origin,
        base_path,
        &format!("/verify/{login_id}/{verification_code}"),
    );
    deliver(OutboundMail {
        body: format!("User verification\n\nClick this link to verify email:\n{verify_url}\n"),
        from: default_smtp_from(),
        subject: "New Sign-up Confirm".to_string(),
        to: to.to_string(),
    })
    .map_err(internal_error)
}

fn send_password_reset_mail(
    to: &str,
    verification_code: &str,
    public_origin: &str,
    base_path: &str,
) -> Result<(), ConnectError> {
    let reset_url = absolute_app_url(
        public_origin,
        base_path,
        &format!("/resetPassword?s={verification_code}"),
    );
    deliver(OutboundMail {
        body: format!(
            "Password reset request\n\nOpen this link to reset your password:\n{reset_url}\n"
        ),
        from: default_smtp_from(),
        subject: "Password reset request".to_string(),
        to: to.to_string(),
    })
    .map_err(internal_error)
}

fn send_workspace_email_validation_mail(
    to: &str,
    email_id: i64,
    token: &str,
    public_origin: &str,
    base_path: &str,
) -> Result<(), ConnectError> {
    let confirm_url = absolute_app_url(
        public_origin,
        base_path,
        &format!("/user/email/confirm/{email_id}/{token}"),
    );
    deliver(OutboundMail {
        body: format!("Validation email\n\nConfirm this email address:\n{confirm_url}\n"),
        from: default_smtp_from(),
        subject: "Validation email".to_string(),
        to: to.to_string(),
    })
    .map_err(internal_error)
}

async fn direct_request_reset_password_email(
    headers: HeaderMap,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Response {
    let session = session_manager.ensure_anonymous_session(&headers);
    let redirect_path = match &backend {
        PilotBackend::Repository(repository) => {
            let login_id =
                normalize_identifier(form.get("loginId").map(String::as_str).unwrap_or_default());
            let email_address = normalize_identifier(
                form.get("emailAddress")
                    .map(String::as_str)
                    .unwrap_or_default(),
            );
            match repository
                .find_user_by_login_id(&login_id)
                .await
                .ok()
                .flatten()
            {
                Some(user) if normalize_identifier(&user.email_address) == email_address => {
                    if let Ok(code) = repository
                        .create_password_reset_verification_for_user(user.id, &user.login_id)
                        .await
                    {
                        let _ = send_password_reset_mail(
                            &user.email_address,
                            &code,
                            &public_origin,
                            &base_path,
                        );
                    }
                    "/lostPassword?requested=1"
                }
                _ => "/lostPassword?error=invalid",
            }
        }
        _ => "/lostPassword?error=unsupported",
    };

    let mut response = Redirect::to(&base_path_href(&base_path, redirect_path)).into_response();
    for cookie in session_manager.build_set_cookie_headers(&session) {
        response.headers_mut().append(
            axum::http::header::SET_COOKIE,
            cookie.parse().expect("set-cookie header"),
        );
    }
    response
}

async fn direct_reset_password(
    form: HashMap<String, String>,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let hash_string = form.get("hashString").cloned().unwrap_or_default();
    let password = form.get("password").cloned().unwrap_or_default();
    let retyped_password = form.get("retypedPassword").cloned().unwrap_or_default();

    if password.len() < 8 || password != retyped_password {
        let query = if hash_string.is_empty() {
            "/resetPassword?error=invalid".to_string()
        } else {
            format!("/resetPassword?error=invalid&s={hash_string}")
        };
        return Redirect::to(&base_path_href(&base_path, &query)).into_response();
    }

    let redirect_path = match &backend {
        PilotBackend::Repository(repository) => {
            match repository
                .find_valid_password_reset_user_id(&hash_string)
                .await
            {
                Ok(Some(user_id)) => match hash(&password, DEFAULT_COST) {
                    Ok(password_hash) => {
                        if repository
                            .update_password_hash_for_user(user_id, &password_hash)
                            .await
                            .is_ok()
                        {
                            let _ = repository
                                .delete_password_reset_verification(&hash_string)
                                .await;
                            "/users/loginform?password=reset".to_string()
                        } else {
                            format!("/resetPassword?error=invalid&s={hash_string}")
                        }
                    }
                    Err(_) => format!("/resetPassword?error=invalid&s={hash_string}"),
                },
                _ => format!("/resetPassword?error=invalid&s={hash_string}"),
            }
        }
        _ => "/resetPassword?error=unsupported".to_string(),
    };

    Redirect::to(&base_path_href(&base_path, &redirect_path)).into_response()
}

async fn direct_send_workspace_email_validation(
    headers: HeaderMap,
    email_id: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Response {
    let login_redirect = base_path_href(
        &base_path,
        "/users/loginform?redirectUrl=%2Fuser%2Feditform%2Femails",
    );
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return Redirect::to(&login_redirect).into_response();
    };
    let Some(user_id) = session.user_id else {
        return Redirect::to(&login_redirect).into_response();
    };
    let valid_csrf = form
        .get("csrfToken")
        .map(|value| value.trim() == session.csrf_token)
        .unwrap_or(false);
    if !valid_csrf {
        return Redirect::to(&base_path_href(
            &base_path,
            "/user/editform/emails?validation=error",
        ))
        .into_response();
    }
    let Ok(email_id) = email_id.parse::<i64>() else {
        return Redirect::to(&base_path_href(
            &base_path,
            "/user/editform/emails?validation=error",
        ))
        .into_response();
    };

    let redirect_path = match &backend {
        PilotBackend::Repository(repository) => {
            if repository
                .send_workspace_email_validation_for_user(user_id, email_id)
                .await
                .is_ok()
            {
                if let Ok(Some((address, token))) = repository
                    .read_workspace_email_token_for_user(user_id, email_id)
                    .await
                {
                    let _ = send_workspace_email_validation_mail(
                        &address,
                        email_id,
                        &token,
                        &public_origin,
                        &base_path,
                    );
                }
                "/user/editform/emails?validation=sent"
            } else {
                "/user/editform/emails?validation=error"
            }
        }
        _ => "/user/editform/emails?validation=error",
    };

    Redirect::to(&base_path_href(&base_path, redirect_path)).into_response()
}

async fn direct_confirm_workspace_email(
    headers: HeaderMap,
    email_id: String,
    token: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let previous_session = session_manager.read_session_from_headers(&headers);
    let previous_token = previous_session
        .as_ref()
        .map(|session| session.token.as_str());
    let Ok(email_id) = email_id.parse::<i64>() else {
        return Redirect::to(&base_path_href(
            &base_path,
            "/user/editform/emails?confirmed=invalid",
        ))
        .into_response();
    };

    match &backend {
        PilotBackend::Repository(repository) => {
            match repository
                .confirm_workspace_email_for_user(email_id, &token)
                .await
            {
                Ok(Some(user_id)) => {
                    let authenticated_session =
                        session_manager.create_authenticated_session(previous_token, user_id);
                    let mut response = Redirect::to(&base_path_href(
                        &base_path,
                        "/user/editform/emails?confirmed=1",
                    ))
                    .into_response();
                    for cookie in session_manager.build_set_cookie_headers(&authenticated_session) {
                        response.headers_mut().append(
                            axum::http::header::SET_COOKIE,
                            cookie.parse().expect("set-cookie header"),
                        );
                    }
                    response
                }
                _ => Redirect::to(&base_path_href(
                    &base_path,
                    "/user/editform/emails?confirmed=invalid",
                ))
                .into_response(),
            }
        }
        _ => Redirect::to(&base_path_href(
            &base_path,
            "/user/editform/emails?confirmed=invalid",
        ))
        .into_response(),
    }
}

fn form_value<'a>(form: &'a HashMap<String, String>, keys: &[&str]) -> &'a str {
    keys.iter()
        .find_map(|key| form.get(*key).map(String::as_str))
        .unwrap_or("")
}

fn form_bool(form: &HashMap<String, String>, keys: &[&str]) -> bool {
    matches!(
        form_value(form, keys).trim().to_ascii_lowercase().as_str(),
        "true" | "1" | "on" | "yes"
    )
}

fn direct_json_label(label: &persistence::IssueLabelRecord) -> serde_json::Value {
    serde_json::json!({
        "id": label.id.to_string(),
        "name": label.name,
        "color": label.color,
        "category": label.category_name,
        "categoryId": label.category_id.unwrap_or_default().to_string(),
        "categoryIsExclusive": label.category_is_exclusive,
    })
}

fn direct_json_category(category: &persistence::IssueLabelCategoryRecord) -> serde_json::Value {
    serde_json::json!({
        "id": category.id.to_string(),
        "name": category.name,
        "isExclusive": category.is_exclusive.to_string(),
    })
}

async fn direct_project_update_allowed(
    headers: &HeaderMap,
    owner: &str,
    project: &str,
    session_manager: &SessionManager,
    repository: &PilotRepository,
    check_csrf: bool,
) -> Result<session::Session, Response> {
    let session = match require_session(session_manager, headers) {
        Ok(session) => session,
        Err(_) => return Err(StatusCode::UNAUTHORIZED.into_response()),
    };
    if check_csrf && require_valid_csrf(session_manager, headers, &session).is_err() {
        return Err(StatusCode::FORBIDDEN.into_response());
    }
    let Some(user_id) = session.user_id else {
        return Err(StatusCode::UNAUTHORIZED.into_response());
    };
    let authorization = match repository
        .read_project_authorization(owner, project, Some(user_id))
        .await
    {
        Ok(Some(authorization)) => authorization,
        Ok(None) => return Err(StatusCode::NOT_FOUND.into_response()),
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR.into_response()),
    };
    match project_update_allowed(&authorization) {
        Ok(true) => Ok(session),
        Ok(false) => Err(StatusCode::FORBIDDEN.into_response()),
        Err(_) => Err(StatusCode::BAD_REQUEST.into_response()),
    }
}

async fn direct_list_issue_labels(
    headers: HeaderMap,
    owner: String,
    project: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if require_project_read(&repository, &owner, &project, actor_id)
        .await
        .is_err()
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    match repository.list_project_labels(&owner, &project).await {
        Ok(labels) => {
            Json(labels.iter().map(direct_json_label).collect::<Vec<_>>()).into_response()
        }
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_create_issue_label(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    let label_name = form_value(&form, &["labelName", "name"]).trim();
    let category_name = form_value(&form, &["categoryName", "category"]).trim();
    let color = match normalize_issue_label_color(form_value(&form, &["labelColor", "color"])) {
        Ok(color) => color,
        Err(_) => return StatusCode::BAD_REQUEST.into_response(),
    };
    if label_name.is_empty() || category_name.is_empty() {
        return StatusCode::BAD_REQUEST.into_response();
    }
    match repository
        .create_project_label(persistence::CreateProjectLabelInput {
            category_is_exclusive: form_bool(&form, &["categoryIsExclusive", "isExclusive"]),
            category_name: category_name.to_string(),
            label_color: color,
            label_name: label_name.to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some((label, true))) => {
            (StatusCode::CREATED, Json(direct_json_label(&label))).into_response()
        }
        Ok(Some((_label, false))) => StatusCode::NO_CONTENT.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_issue_label_css(
    headers: HeaderMap,
    owner: String,
    project: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if require_project_read(&repository, &owner, &project, actor_id)
        .await
        .is_err()
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    match repository.list_project_labels(&owner, &project).await {
        Ok(labels) => (
            [(http::header::CONTENT_TYPE, "text/css")],
            issue_label_css(&labels),
        )
            .into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_update_issue_label(
    headers: HeaderMap,
    owner: String,
    project: String,
    label_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    let category_id = form_value(&form, &["category.id", "categoryId"])
        .parse::<i64>()
        .unwrap_or_default();
    let color = match normalize_issue_label_color(form_value(&form, &["color", "labelColor"])) {
        Ok(color) => color,
        Err(_) => return StatusCode::BAD_REQUEST.into_response(),
    };
    match repository
        .update_project_label(persistence::UpdateProjectLabelInput {
            category_id,
            label_color: color,
            label_id,
            label_name: form_value(&form, &["name", "labelName"]).to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some(_)) => StatusCode::OK.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

async fn direct_delete_issue_label(
    headers: HeaderMap,
    owner: String,
    project: String,
    label_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    if form_value(&form, &["_method"]).to_ascii_lowercase() != "delete" {
        return StatusCode::BAD_REQUEST.into_response();
    }
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .delete_project_label(&owner, &project, label_id)
        .await
    {
        Ok(true) => StatusCode::OK.into_response(),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_list_issue_label_categories(
    headers: HeaderMap,
    owner: String,
    project: String,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let actor_id = session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    if require_project_read(&repository, &owner, &project, actor_id)
        .await
        .is_err()
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    match repository
        .list_project_label_categories(&owner, &project)
        .await
    {
        Ok(categories) => Json(
            categories
                .iter()
                .map(direct_json_category)
                .collect::<Vec<_>>(),
        )
        .into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_create_issue_label_category(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .create_project_label_category(persistence::CreateProjectLabelCategoryInput {
            category_is_exclusive: form_bool(&form, &["isExclusive", "categoryIsExclusive"]),
            category_name: form_value(&form, &["name", "categoryName"]).to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some((category, true))) => {
            (StatusCode::CREATED, Json(direct_json_category(&category))).into_response()
        }
        Ok(Some((_category, false))) => StatusCode::NO_CONTENT.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

async fn direct_update_issue_label_category(
    headers: HeaderMap,
    owner: String,
    project: String,
    category_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .update_project_label_category(persistence::UpdateProjectLabelCategoryInput {
            category_id,
            category_is_exclusive: form_bool(&form, &["isExclusive", "categoryIsExclusive"]),
            category_name: form_value(&form, &["name", "categoryName"]).to_string(),
            owner_name: owner,
            project_name: project,
        })
        .await
    {
        Ok(Some(_)) => StatusCode::OK.into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::BAD_REQUEST.into_response(),
    }
}

async fn direct_delete_issue_label_category(
    headers: HeaderMap,
    owner: String,
    project: String,
    category_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .delete_project_label_category(&owner, &project, category_id)
        .await
    {
        Ok(true) => StatusCode::OK.into_response(),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

fn redirect_to(base_path: &str, path: &str) -> Response {
    Redirect::to(&base_path_href(base_path, path)).into_response()
}

fn normalize_milestone_state(value: &str) -> Result<String, ConnectError> {
    let normalized = value.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "" => Ok("open".to_string()),
        "open" => Ok("open".to_string()),
        "closed" => Ok("closed".to_string()),
        _ => Err(ConnectError::invalid_argument("invalid milestone state")),
    }
}

fn parse_milestone_due_date(value: &str) -> Result<Option<DateTime>, ConnectError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    DateTime::parse_from_str(&format!("{trimmed} 23:59:59.999"), "%Y-%m-%d %H:%M:%S%.3f")
        .map(Some)
        .map_err(|_| ConnectError::invalid_argument("invalid milestone due date"))
}

fn parse_attachment_ids(value: &str) -> Vec<i64> {
    value
        .split(',')
        .filter_map(|item| item.trim().parse::<i64>().ok())
        .filter(|item| *item > 0)
        .collect()
}

fn direct_milestone_input_from_form(
    owner: &str,
    project: &str,
    form: &HashMap<String, String>,
) -> Result<persistence::MilestoneMutationInput, ConnectError> {
    let title = form_value(form, &["title"]).trim().to_string();
    if title.is_empty() {
        return Err(ConnectError::invalid_argument(
            "milestone title is required",
        ));
    }
    Ok(persistence::MilestoneMutationInput {
        attachment_ids: parse_attachment_ids(form_value(
            form,
            &["attachmentIds", "attachment_ids"],
        )),
        contents_markdown: form_value(form, &["contents", "contentsMarkdown", "contents_markdown"])
            .to_string(),
        due_date: parse_milestone_due_date(form_value(form, &["dueDate", "due_date"]))?,
        owner_name: owner.to_string(),
        project_name: project.to_string(),
        state: normalize_milestone_state(form_value(form, &["state"]))?,
        title,
    })
}

fn connect_error_to_status(error: ConnectError) -> Response {
    if error.to_string().contains("invalid") || error.to_string().contains("required") {
        StatusCode::BAD_REQUEST.into_response()
    } else {
        StatusCode::INTERNAL_SERVER_ERROR.into_response()
    }
}

async fn direct_create_project_milestone(
    headers: HeaderMap,
    owner: String,
    project: String,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    let input = match direct_milestone_input_from_form(&owner, &project, &form) {
        Ok(input) => input,
        Err(error) => return connect_error_to_status(error),
    };
    match repository
        .project_milestone_title_exists(&owner, &project, &input.title, None)
        .await
    {
        Ok(true) => return StatusCode::BAD_REQUEST.into_response(),
        Ok(false) => {}
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
    match repository.create_project_milestone(input).await {
        Ok(Some(milestone)) => redirect_to(
            &base_path,
            &format!("/{owner}/{project}/milestone/{}", milestone.id),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_update_project_milestone(
    headers: HeaderMap,
    owner: String,
    project: String,
    milestone_id: i64,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    let input = match direct_milestone_input_from_form(&owner, &project, &form) {
        Ok(input) => input,
        Err(error) => return connect_error_to_status(error),
    };
    match repository
        .project_milestone_title_exists(&owner, &project, &input.title, Some(milestone_id))
        .await
    {
        Ok(true) => return StatusCode::BAD_REQUEST.into_response(),
        Ok(false) => {}
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
    match repository
        .update_project_milestone(persistence::UpdateMilestoneInput {
            milestone_id,
            values: input,
        })
        .await
    {
        Ok(Some(milestone)) => redirect_to(
            &base_path,
            &format!("/{owner}/{project}/milestone/{}", milestone.id),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_update_project_milestone_state(
    headers: HeaderMap,
    owner: String,
    project: String,
    milestone_id: i64,
    state: &str,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .update_project_milestone_state(&owner, &project, milestone_id, state)
        .await
    {
        Ok(Some(milestone)) => redirect_to(
            &base_path,
            &format!("/{owner}/{project}/milestone/{}", milestone.id),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn direct_delete_project_milestone(
    headers: HeaderMap,
    owner: String,
    project: String,
    milestone_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    match repository
        .delete_project_milestone(&owner, &project, milestone_id)
        .await
    {
        Ok(true) => redirect_to(&base_path, &format!("/{owner}/{project}/milestones")),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

#[derive(Clone)]
struct PilotServiceImpl {
    base_path: String,
    public_origin: String,
    session_manager: SessionManager,
    backend: PilotBackend,
}

impl PilotServiceImpl {
    async fn set_project_milestone_state(
        &self,
        ctx: Context,
        request: OwnedView<MilestoneStateMutationRequestView<'static>>,
        state: &str,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "milestone requires repository backend",
            ));
        };
        require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "milestone update is not allowed",
            ));
        }
        let milestone = repository
            .update_project_milestone_state(
                request.owner_name,
                request.project_name,
                request.milestone_id,
                state,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("milestone not found"))?;
        let mut milestone = issue_milestone_from_record(&milestone, &self.base_path);
        milestone.viewer_can_update = true;
        milestone.viewer_can_delete = true;
        Ok((
            ProjectMilestoneMutationResponse {
                milestone: Some(milestone).into(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn issue_participation(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
        action: &str,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let _actor = require_authenticated_user(repository, session.user_id).await?;
        require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        let issue = repository
            .read_issue_detail(
                request.owner_name,
                request.project_name,
                request.issue_number,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        let user_id = session.user_id.expect("authenticated user id");
        match action {
            "watch" => repository
                .watch_issue(issue.id, user_id)
                .await
                .map_err(internal_error)?,
            "unwatch" => repository
                .unwatch_issue(issue.id, user_id)
                .await
                .map_err(internal_error)?,
            "vote" => repository
                .vote_issue(issue.id, user_id)
                .await
                .map_err(internal_error)?,
            "unvote" => repository
                .unvote_issue(issue.id, user_id)
                .await
                .map_err(internal_error)?,
            _ => {
                return Err(ConnectError::invalid_argument(
                    "invalid issue participation action",
                ))
            }
        }
        let updated = repository
            .read_issue_detail(
                request.owner_name,
                request.project_name,
                request.issue_number,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        Ok((
            issue_detail_response_from_record(
                &updated,
                false,
                true,
                session.user_id,
                &self.base_path,
            ),
            ctx,
        ))
    }
}

#[derive(Clone)]
enum PilotBackend {
    Static,
    Repository(PilotRepository),
}

#[derive(Clone)]
enum AssetMode {
    None,
    Filesystem(PathBuf),
    Embedded,
}

#[derive(Clone, Serialize)]
struct BrowserRuntimeConfig {
    #[serde(rename = "apiBaseUrl")]
    api_base_url: String,
    #[serde(rename = "basePath")]
    base_path: String,
    #[serde(rename = "rpcBaseUrl")]
    rpc_base_url: String,
}

#[derive(Clone, Serialize)]
struct SessionRoutePayload {
    session: Option<SessionRouteRecord>,
    user: Option<SessionRouteUser>,
}

#[derive(Clone, Serialize)]
struct SessionRouteRecord {
    #[serde(rename = "csrfToken")]
    csrf_token: String,
    projection: ReadCurrentSessionResponse,
    #[serde(rename = "userId")]
    user_id: i64,
}

#[derive(Clone, Serialize)]
struct SessionRouteUser {
    #[serde(rename = "emailAddress")]
    email_address: String,
    id: i64,
    #[serde(rename = "isConfirmed")]
    is_confirmed: bool,
    #[serde(rename = "isSiteAdmin")]
    is_site_admin: bool,
    #[serde(rename = "loginId")]
    login_id: String,
    name: String,
}

impl BrowserRuntimeConfig {
    fn from_base_path(base_path: &str) -> Self {
        let base_path = normalize_base_path(base_path);
        let api_base_url = if base_path == "/" {
            "/api".to_string()
        } else {
            format!("{base_path}/api")
        };
        let rpc_base_url = if base_path == "/" {
            "/rpc".to_string()
        } else {
            format!("{base_path}/rpc")
        };

        Self {
            api_base_url,
            base_path,
            rpc_base_url,
        }
    }
}

fn fixed_auth_ui_capabilities() -> ReadAuthUiCapabilitiesResponse {
    fn parse_bool_env(name: &str) -> bool {
        std::env::var(name)
            .map(|value| {
                matches!(
                    value.trim().to_ascii_lowercase().as_str(),
                    "1" | "true" | "yes" | "on"
                )
            })
            .unwrap_or(false)
    }

    ReadAuthUiCapabilitiesResponse {
        email_verification_enabled: parse_bool_env("YONA_AUTH_EMAIL_VERIFICATION_ENABLED"),
        enabled_social_providers: vec![],
        signup_require_confirm: parse_bool_env("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM"),
        social_login_only: parse_bool_env("YONA_AUTH_SOCIAL_LOGIN_ONLY"),
        ..Default::default()
    }
}

fn confirmation_session_required() -> bool {
    let capabilities = fixed_auth_ui_capabilities();
    capabilities.signup_require_confirm || capabilities.email_verification_enabled
}

fn normalize_identifier(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn current_session_response_from_user(
    user: &persistence::AppUserRecord,
    default_landing_path: Option<String>,
) -> ReadCurrentSessionResponse {
    ReadCurrentSessionResponse {
        actor_id: user.id,
        default_landing_path: default_landing_path
            .unwrap_or_else(|| DEFAULT_LANDING_FALLBACK_PATH.to_string()),
        email_address: user.email_address.clone(),
        is_anonymous: false,
        is_confirmed: user.is_confirmed,
        is_site_admin: user.is_site_admin,
        login_id: user.login_id.clone(),
        user_label: user.display_name.clone(),
        ..Default::default()
    }
}

fn anonymous_current_session_response() -> ReadCurrentSessionResponse {
    ReadCurrentSessionResponse {
        is_anonymous: true,
        default_landing_path: DEFAULT_LANDING_FALLBACK_PATH.to_string(),
        ..Default::default()
    }
}

async fn resolve_current_session_response(
    backend: &PilotBackend,
    session: Option<&session::Session>,
) -> Result<ReadCurrentSessionResponse, ConnectError> {
    let Some(session) = session else {
        return Ok(anonymous_current_session_response());
    };

    let Some(user_id) = session.user_id else {
        return Ok(anonymous_current_session_response());
    };

    match backend {
        PilotBackend::Repository(repository) => {
            let Some(user) = repository
                .find_user_by_id(user_id)
                .await
                .map_err(internal_error)?
            else {
                return Ok(anonymous_current_session_response());
            };
            let default_landing_path = repository
                .read_default_landing_path(user_id)
                .await
                .map_err(internal_error)?;
            Ok(current_session_response_from_user(
                &user,
                default_landing_path,
            ))
        }
        PilotBackend::Static => Ok(anonymous_current_session_response()),
    }
}

async fn build_session_route_payload(
    backend: &PilotBackend,
    session: &session::Session,
) -> SessionRoutePayload {
    let Ok(projection) = resolve_current_session_response(backend, Some(session)).await else {
        return SessionRoutePayload {
            session: None,
            user: None,
        };
    };

    if projection.is_anonymous {
        return SessionRoutePayload {
            session: None,
            user: None,
        };
    }

    SessionRoutePayload {
        session: Some(SessionRouteRecord {
            csrf_token: session.csrf_token.clone(),
            projection: projection.clone(),
            user_id: projection.actor_id,
        }),
        user: Some(SessionRouteUser {
            email_address: projection.email_address.clone(),
            id: projection.actor_id,
            is_confirmed: projection.is_confirmed,
            is_site_admin: projection.is_site_admin,
            login_id: projection.login_id.clone(),
            name: projection.user_label.clone(),
        }),
    }
}

fn internal_error(error: impl ToString) -> ConnectError {
    ConnectError::new(connectrpc::ErrorCode::Internal, error.to_string())
}

fn require_session<'a>(
    session_manager: &SessionManager,
    headers: &'a HeaderMap,
) -> Result<session::Session, ConnectError> {
    session_manager
        .read_session_from_headers(headers)
        .ok_or_else(|| ConnectError::unauthenticated("missing pilot session"))
}

fn require_valid_csrf(
    session_manager: &SessionManager,
    headers: &HeaderMap,
    session: &session::Session,
) -> Result<(), ConnectError> {
    if session_manager.validate_csrf(headers, session) {
        Ok(())
    } else {
        Err(ConnectError::permission_denied("invalid csrf token"))
    }
}

fn attach_session_headers(
    ctx: &mut Context,
    session_manager: &SessionManager,
    session: &session::Session,
) {
    ctx.response_headers.insert(
        "x-csrf-token",
        HeaderValue::from_str(&session.csrf_token).expect("csrf header"),
    );
    for cookie in session_manager.build_set_cookie_headers(session) {
        ctx.response_headers.append(
            SET_COOKIE,
            HeaderValue::from_str(&cookie).expect("set-cookie header"),
        );
    }
}

fn map_project_scope(value: &str) -> Result<ProjectScope, ConnectError> {
    ProjectScope::try_from(value)
        .map_err(|_| ConnectError::invalid_argument("invalid project scope"))
}

const WORKSPACE_DAYS_AGO: u32 = 14;

fn workspace_project_item_from_entry(item: &persistence::ProjectListEntry) -> ProjectListItem {
    ProjectListItem {
        owner_name: item.owner_name.clone(),
        project_name: item.project_name.clone(),
        overview: String::new(),
        project_scope: String::new(),
        ..Default::default()
    }
}

fn workspace_member_project_item_from_record(
    item: &persistence::WorkspaceMemberProjectRecord,
) -> WorkspaceMemberProjectItem {
    WorkspaceMemberProjectItem {
        created_label: item.created_label.clone(),
        last_pushed_label: item.last_pushed_label.clone(),
        member_count: item.member_count,
        owner_name: item.owner_name.clone(),
        project_name: item.project_name.clone(),
        overview: item.overview.clone(),
        project_scope: item.project_scope.clone(),
        watch_count: item.watch_count,
        ..Default::default()
    }
}

fn workspace_email_from_record(record: &persistence::WorkspaceEmailRecord) -> WorkspaceEmail {
    WorkspaceEmail {
        email_address: record.email_address.clone(),
        id: record.id.clone(),
        valid: record.valid,
        ..Default::default()
    }
}

fn workspace_notification_from_record(
    record: &persistence::WorkspaceNotificationPreferenceRecord,
) -> WorkspaceNotificationPreference {
    WorkspaceNotificationPreference {
        enabled: record.enabled,
        event_type: record.event_type.clone(),
        label: record.label.clone(),
        ..Default::default()
    }
}

fn watched_project_notifications_from_record(
    record: &persistence::WatchedProjectNotificationsRecord,
) -> WatchedProjectNotifications {
    WatchedProjectNotifications {
        notifications: record
            .notifications
            .iter()
            .map(workspace_notification_from_record)
            .collect(),
        owner_name: record.owner_name.clone(),
        project_id: record.project_id.clone(),
        project_name: record.project_name.clone(),
        ..Default::default()
    }
}

fn workspace_profile_from_record(
    record: &persistence::WorkspaceProfileRecord,
    avatar_url: String,
) -> WorkspaceProfile {
    WorkspaceProfile {
        avatar_url,
        connected_social_providers: record.connected_social_providers.clone(),
        display_name: record.display_name.clone(),
        english_name: record.english_name.clone(),
        is_blocked: record.is_blocked,
        is_site_admin: record.is_site_admin,
        login_id: record.login_id.clone(),
        primary_email_address: record.primary_email_address.clone(),
        since_label: record.since_label.clone(),
        ..Default::default()
    }
}

#[derive(Serialize)]
struct UploadFileResponse {
    id: i64,
    #[serde(rename = "mimeType")]
    mime_type: String,
    name: String,
    size: i64,
    url: String,
}

async fn upload_file(
    headers: HeaderMap,
    mut multipart: Multipart,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    if !session_manager.validate_csrf(&headers, &session) {
        return StatusCode::FORBIDDEN.into_response();
    }
    let Some(user_id) = session.user_id else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    let PilotBackend::Repository(repository) = &backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let Ok(Some(user)) = repository.find_user_by_id(user_id).await else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() != Some("filePath") {
            continue;
        }
        let file_name = field
            .file_name()
            .map(ToString::to_string)
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "upload.bin".to_string());
        let mime_type = field
            .content_type()
            .map(ToString::to_string)
            .unwrap_or_else(|| "application/octet-stream".to_string());
        if !mime_type.starts_with("image/") {
            return StatusCode::BAD_REQUEST.into_response();
        }
        let Ok(bytes) = field.bytes().await else {
            return StatusCode::BAD_REQUEST.into_response();
        };
        if bytes.len() > 1024 * 1000 {
            return StatusCode::BAD_REQUEST.into_response();
        }
        let hash = random_storage_token();
        let path = uploaded_file_path(&hash);
        if let Some(parent) = path.parent() {
            if std::fs::create_dir_all(parent).is_err() {
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
        if std::fs::write(&path, &bytes).is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
        let Ok(attachment) = repository
            .create_user_attachment_upload(
                user.id,
                &user.login_id,
                &file_name,
                &mime_type,
                bytes.len() as i64,
                &hash,
            )
            .await
        else {
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        };

        let response = UploadFileResponse {
            id: attachment.id,
            mime_type,
            name: file_name,
            size: bytes.len() as i64,
            url: base_path_href(&base_path, &format!("/files/{}", attachment.id)),
        };
        return (StatusCode::CREATED, Json(response)).into_response();
    }

    StatusCode::BAD_REQUEST.into_response()
}

async fn get_uploaded_file(
    headers: HeaderMap,
    attachment_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let Ok(Some(attachment)) = repository.read_attachment_by_id(attachment_id).await else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let is_avatar = attachment.container_type == "USER_AVATAR";
    if !is_avatar {
        let Some(session) = session_manager.read_session_from_headers(&headers) else {
            return StatusCode::FORBIDDEN.into_response();
        };
        let Some(user_id) = session.user_id else {
            return StatusCode::FORBIDDEN.into_response();
        };
        if attachment.container_type != "USER" || attachment.container_id != user_id {
            return StatusCode::FORBIDDEN.into_response();
        }
    }
    let Ok(bytes) = std::fs::read(uploaded_file_path(&attachment.hash)) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    ([(http::header::CONTENT_TYPE, attachment.mime_type)], bytes).into_response()
}

async fn workspace_avatar_url(
    repository: &PilotRepository,
    user_id: i64,
    email_address: &str,
    base_path: &str,
) -> Result<String, ConnectError> {
    if let Some(attachment) = repository
        .read_avatar_attachment_for_user(user_id)
        .await
        .map_err(internal_error)?
    {
        return Ok(base_path_href(
            base_path,
            &format!("/files/{}", attachment.id),
        ));
    }
    Ok(gravatar_url(email_address))
}

fn workspace_issue_item_from_record(
    record: &persistence::WorkspaceIssueListItemRecord,
) -> WorkspaceIssueItem {
    WorkspaceIssueItem {
        assignee_label: record.assignee_label.clone(),
        author_label: record.author_label.clone(),
        comment_count: record.comment_count,
        issue_number: record.issue_number,
        owner_name: record.owner_name.clone(),
        project_name: record.project_name.clone(),
        state: record.state.clone(),
        title: record.title.clone(),
        updated_label: record.updated_label.clone(),
        ..Default::default()
    }
}

fn workspace_pull_request_item_from_record(
    record: &persistence::WorkspacePullRequestListItemRecord,
) -> WorkspacePullRequestItem {
    WorkspacePullRequestItem {
        comment_count: record.comment_count,
        contributor_label: record.contributor_label.clone(),
        owner_name: record.owner_name.clone(),
        project_name: record.project_name.clone(),
        pull_request_number: record.pull_request_number,
        receiver_label: record.receiver_label.clone(),
        state: record.state.clone(),
        title: record.title.clone(),
        updated_label: record.updated_label.clone(),
        ..Default::default()
    }
}

async fn load_workspace_project_lists(
    repository: &PilotRepository,
    user_id: i64,
) -> Result<(Vec<ProjectListItem>, Vec<ProjectListItem>), ConnectError> {
    let favorite_projects = repository
        .list_favorite_projects_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(workspace_project_item_from_entry)
        .collect();
    let recent_projects = repository
        .list_recent_projects_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(workspace_project_item_from_entry)
        .collect();

    Ok((favorite_projects, recent_projects))
}

async fn load_workspace_settings_data(
    repository: &PilotRepository,
    user_id: i64,
) -> Result<
    (
        String,
        Vec<WorkspaceEmail>,
        Vec<WatchedProjectNotifications>,
    ),
    ConnectError,
> {
    let api_token = repository
        .read_api_token_for_user(user_id)
        .await
        .map_err(internal_error)?
        .unwrap_or_default();
    let emails = repository
        .list_workspace_emails_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(workspace_email_from_record)
        .collect();
    let watched_projects = repository
        .list_watched_project_notifications_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(watched_project_notifications_from_record)
        .collect();

    Ok((api_token, emails, watched_projects))
}

async fn load_workspace_dashboard_data(
    repository: &PilotRepository,
    user_id: i64,
    base_path: &str,
) -> Result<
    (
        Option<WorkspaceProfile>,
        Vec<WorkspaceIssueItem>,
        Vec<WorkspacePullRequestItem>,
        Vec<WorkspaceMemberProjectItem>,
    ),
    ConnectError,
> {
    let days_ago = u64::from(WORKSPACE_DAYS_AGO);
    let profile = match repository
        .read_workspace_profile_for_user(user_id)
        .await
        .map_err(internal_error)?
    {
        Some(record) => Some(workspace_profile_from_record(
            &record,
            workspace_avatar_url(
                repository,
                user_id,
                &record.primary_email_address,
                base_path,
            )
            .await?,
        )),
        None => None,
    };
    let issue_items = filter_workspace_issue_items_by_read_acl(
        repository,
        user_id,
        repository
            .list_recent_workspace_issues_for_user(user_id, days_ago)
            .await
            .map_err(internal_error)?,
    )
    .await?;
    let pull_request_items = filter_workspace_pull_request_items_by_read_acl(
        repository,
        user_id,
        repository
            .list_recent_workspace_pull_requests_for_user(user_id, days_ago)
            .await
            .map_err(internal_error)?,
    )
    .await?;
    let member_projects = repository
        .list_member_projects_for_user(user_id)
        .await
        .map_err(internal_error)?;
    let member_projects =
        filter_workspace_member_projects_by_read_acl(repository, user_id, member_projects).await?;

    Ok((profile, issue_items, pull_request_items, member_projects))
}

async fn filter_workspace_issue_items_by_read_acl(
    repository: &PilotRepository,
    user_id: i64,
    items: Vec<persistence::WorkspaceIssueListItemRecord>,
) -> Result<Vec<WorkspaceIssueItem>, ConnectError> {
    let mut visible = Vec::new();

    for item in items {
        if workspace_project_read_allowed(repository, user_id, &item.owner_name, &item.project_name)
            .await?
        {
            visible.push(workspace_issue_item_from_record(&item));
        }
    }

    Ok(visible)
}

async fn filter_workspace_pull_request_items_by_read_acl(
    repository: &PilotRepository,
    user_id: i64,
    items: Vec<persistence::WorkspacePullRequestListItemRecord>,
) -> Result<Vec<WorkspacePullRequestItem>, ConnectError> {
    let mut visible = Vec::new();

    for item in items {
        if workspace_project_read_allowed(repository, user_id, &item.owner_name, &item.project_name)
            .await?
        {
            visible.push(workspace_pull_request_item_from_record(&item));
        }
    }

    Ok(visible)
}

async fn filter_workspace_member_projects_by_read_acl(
    repository: &PilotRepository,
    user_id: i64,
    items: Vec<persistence::WorkspaceMemberProjectRecord>,
) -> Result<Vec<WorkspaceMemberProjectItem>, ConnectError> {
    let mut visible = Vec::new();

    for item in items {
        if workspace_project_read_allowed(repository, user_id, &item.owner_name, &item.project_name)
            .await?
        {
            visible.push(workspace_member_project_item_from_record(&item));
        }
    }

    Ok(visible)
}

async fn workspace_project_read_allowed(
    repository: &PilotRepository,
    user_id: i64,
    owner_name: &str,
    project_name: &str,
) -> Result<bool, ConnectError> {
    let Some(authorization) = repository
        .read_project_authorization(owner_name, project_name, Some(user_id))
        .await
        .map_err(internal_error)?
    else {
        return Ok(false);
    };

    Ok(authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous: false,
            is_organization_admin: authorization.viewer.is_organization_admin,
            is_organization_member: authorization.viewer.is_organization_member,
            is_project_manager: authorization.viewer.is_project_manager,
            is_project_member: authorization.viewer.is_project_member,
            is_site_admin: authorization.viewer.is_site_admin,
            project_scope: map_project_scope(&authorization.project.project_scope)?,
        },
        ProjectOperation::Read,
    )
    .allowed)
}

async fn build_workspace_overview_response(
    repository: &PilotRepository,
    session: &session::Session,
    base_path: &str,
) -> Result<ReadWorkspaceOverviewResponse, ConnectError> {
    let Some(user_id) = session.user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let response = resolve_current_session_response(
        &PilotBackend::Repository(repository.clone()),
        Some(session),
    )
    .await?;
    if response.is_anonymous {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    }
    let (favorite_projects, recent_projects) =
        load_workspace_project_lists(repository, user_id).await?;
    let (api_token, emails, watched_projects) =
        load_workspace_settings_data(repository, user_id).await?;
    let (profile, issue_items, pull_request_items, member_projects) =
        load_workspace_dashboard_data(repository, user_id, base_path).await?;

    Ok(ReadWorkspaceOverviewResponse {
        api_token,
        days_ago: WORKSPACE_DAYS_AGO,
        default_landing_path: response.default_landing_path.clone(),
        emails,
        favorite_projects,
        issue_items,
        member_projects,
        profile: profile.into(),
        pull_request_items,
        recent_projects,
        session: Some(response).into(),
        watched_projects,
        ..Default::default()
    })
}

fn workspace_invalid_argument(message: impl Into<String>) -> ConnectError {
    ConnectError::invalid_argument(message.into())
}

fn organization_detail_from_record(
    record: &persistence::OrganizationRecord,
    viewer_can_update: bool,
) -> OrganizationDetail {
    OrganizationDetail {
        organization_name: record.organization_name.clone(),
        description: record.description.clone().unwrap_or_default(),
        viewer_can_update,
        ..Default::default()
    }
}

fn project_detail_from_record(
    authorization: &persistence::ProjectAuthorizationRecord,
    viewer_can_update: bool,
    viewer_can_enroll: bool,
) -> ProjectDetail {
    ProjectDetail {
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        organization_name: authorization
            .project
            .organization_name
            .clone()
            .unwrap_or_default(),
        overview: authorization.project.overview.clone().unwrap_or_default(),
        project_scope: authorization.project.project_scope.clone(),
        viewer_can_update,
        viewer_can_enroll,
        enrollment_requested: authorization.enrollment_requested,
        is_favorited: authorization.is_favorited,
        ..Default::default()
    }
}

fn project_read_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
    is_anonymous: bool,
) -> Result<bool, ConnectError> {
    Ok(authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous,
            is_organization_admin: authorization.viewer.is_organization_admin,
            is_organization_member: authorization.viewer.is_organization_member,
            is_project_manager: authorization.viewer.is_project_manager,
            is_project_member: authorization.viewer.is_project_member,
            is_site_admin: authorization.viewer.is_site_admin,
            project_scope: map_project_scope(&authorization.project.project_scope)?,
        },
        ProjectOperation::Read,
    )
    .allowed)
}

fn project_update_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
) -> Result<bool, ConnectError> {
    Ok(authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous: false,
            is_organization_admin: authorization.viewer.is_organization_admin,
            is_organization_member: authorization.viewer.is_organization_member,
            is_project_manager: authorization.viewer.is_project_manager,
            is_project_member: authorization.viewer.is_project_member,
            is_site_admin: authorization.viewer.is_site_admin,
            project_scope: map_project_scope(&authorization.project.project_scope)?,
        },
        ProjectOperation::Update,
    )
    .allowed)
}

fn render_markdown_html(markdown: &str) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    let parser = Parser::new_ext(markdown, options);
    let mut rendered = String::new();
    html::push_html(&mut rendered, parser);
    ammonia::clean(&rendered)
}

fn issue_label_from_record(record: &persistence::IssueLabelRecord) -> IssueLabel {
    IssueLabel {
        category_id: record.category_id.unwrap_or_default(),
        category_is_exclusive: record.category_is_exclusive,
        category_name: record.category_name.clone(),
        color: record.color.clone(),
        id: record.id,
        name: record.name.clone(),
        ..Default::default()
    }
}

fn issue_label_category_from_record(
    record: &persistence::IssueLabelCategoryRecord,
) -> IssueLabelCategory {
    IssueLabelCategory {
        id: record.id,
        is_exclusive: record.is_exclusive,
        name: record.name.clone(),
        ..Default::default()
    }
}

fn normalize_issue_label_color(value: &str) -> Result<String, ConnectError> {
    let trimmed = value.trim().trim_start_matches('#');
    let expanded = match trimmed.len() {
        3 if trimmed.chars().all(|item| item.is_ascii_hexdigit()) => trimmed
            .chars()
            .flat_map(|item| [item, item])
            .collect::<String>(),
        6 if trimmed.chars().all(|item| item.is_ascii_hexdigit()) => trimmed.to_string(),
        _ => return Err(ConnectError::invalid_argument("invalid issue label color")),
    };
    Ok(format!("#{}", expanded.to_ascii_lowercase()))
}

fn issue_label_text_color(background: &str) -> &'static str {
    let normalized =
        normalize_issue_label_color(background).unwrap_or_else(|_| "#ffffff".to_string());
    let hex = normalized.trim_start_matches('#');
    let red = u8::from_str_radix(&hex[0..2], 16).unwrap_or(255) as f64;
    let green = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255) as f64;
    let blue = u8::from_str_radix(&hex[4..6], 16).unwrap_or(255) as f64;
    let color_space = (red * 0.21) + (green * 0.72) + (blue * 0.07);
    if color_space > 192.0 {
        "dimgray"
    } else {
        "white"
    }
}

fn issue_label_css(labels: &[persistence::IssueLabelRecord]) -> String {
    labels
        .iter()
        .map(|label| {
            let color = normalize_issue_label_color(&label.color)
                .unwrap_or_else(|_| "#ffffff".to_string());
            let text_color = issue_label_text_color(&color);
            format!(
                ".issue-label[data-label-id=\"{}\"]{{\n    box-shadow: inset 2px 0 0px {};\n    -webkit-box-shadow: inset 2px 0 0px {};\n    -moz-box-shadow: inset 2px 0 0px {};\n}}\n.issue-label.active[data-label-id=\"{}\"]{{\n    background-color: {};\n    color: {};\n}}\n",
                label.id, color, color, color, label.id, color, text_color
            )
        })
        .collect()
}

fn issue_attachment_from_record(
    record: &persistence::IssueAttachmentRecord,
    base_path: &str,
) -> IssueAttachment {
    IssueAttachment {
        id: record.id,
        mime_type: record.mime_type.clone(),
        name: record.name.clone(),
        size: record.size,
        url: base_path_href(base_path, &format!("/files/{}", record.id)),
        ..Default::default()
    }
}

fn issue_comment_from_record(
    record: &persistence::IssueCommentRecord,
    viewer_can_manage: bool,
    viewer_id: Option<i64>,
    base_path: &str,
) -> IssueComment {
    let viewer_is_author = viewer_id.is_some() && viewer_id == record.author_id;
    IssueComment {
        attachments: record
            .attachments
            .iter()
            .map(|attachment| issue_attachment_from_record(attachment, base_path))
            .collect(),
        author_label: record.author_label.clone(),
        author_login_id: record.author_login_id.clone(),
        contents_html: render_markdown_html(&record.contents_markdown),
        contents_markdown: record.contents_markdown.clone(),
        created_label: record.created_label.clone(),
        id: record.id,
        viewer_can_delete: viewer_can_manage || viewer_is_author,
        viewer_can_update: viewer_can_manage || viewer_is_author,
        ..Default::default()
    }
}

fn issue_timeline_item_from_record(
    record: &persistence::IssueTimelineItemRecord,
    viewer_can_manage: bool,
    viewer_id: Option<i64>,
    base_path: &str,
) -> IssueTimelineItem {
    match record {
        persistence::IssueTimelineItemRecord::Comment(comment) => IssueTimelineItem {
            comment: Some(issue_comment_from_record(
                comment,
                viewer_can_manage,
                viewer_id,
                base_path,
            ))
            .into(),
            created_label: comment.created_label.clone(),
            id: comment.id,
            kind: "comment".to_string(),
            ..Default::default()
        },
        persistence::IssueTimelineItemRecord::Event {
            created_label,
            event_type,
            id,
            new_value,
            old_value,
            sender_login_id,
        } => IssueTimelineItem {
            created_label: created_label.clone(),
            event_type: event_type.clone(),
            id: *id,
            kind: "event".to_string(),
            new_value: new_value.clone(),
            old_value: old_value.clone(),
            sender_login_id: sender_login_id.clone(),
            ..Default::default()
        },
    }
}

fn issue_milestone_from_record(
    record: &persistence::IssueMilestoneRecord,
    base_path: &str,
) -> IssueMilestone {
    IssueMilestone {
        attachments: record
            .attachments
            .iter()
            .map(|attachment| issue_attachment_from_record(attachment, base_path))
            .collect(),
        closed_issue_count: record.closed_issue_count,
        closed_issues: record
            .closed_issues
            .clone()
            .into_iter()
            .map(project_issue_list_item_to_proto)
            .collect(),
        completion_percent: record.completion_percent,
        contents_html: render_markdown_html(&record.contents_markdown),
        contents_markdown: record.contents_markdown.clone(),
        due_date_label: record.due_date_label.clone(),
        id: record.id,
        open_issue_count: record.open_issue_count,
        open_issues: record
            .open_issues
            .clone()
            .into_iter()
            .map(project_issue_list_item_to_proto)
            .collect(),
        state: record.state.clone(),
        title: record.title.clone(),
        ..Default::default()
    }
}

fn issue_mutation_input_from_create(
    request: &CreateIssueRequestView<'_>,
) -> persistence::IssueMutationInput {
    persistence::IssueMutationInput {
        assignee_login_id: (!request.assignee_login_id.trim().is_empty())
            .then(|| request.assignee_login_id.trim().to_string()),
        attachment_ids: request.attachment_ids.to_vec(),
        body_markdown: request.body_markdown.to_string(),
        label_ids: request.label_ids.to_vec(),
        milestone_id: (request.milestone_id > 0).then_some(request.milestone_id),
        title: request.title.trim().to_string(),
    }
}

fn issue_mutation_input_from_update(
    request: &UpdateIssueRequestView<'_>,
) -> persistence::IssueMutationInput {
    persistence::IssueMutationInput {
        assignee_login_id: (!request.assignee_login_id.trim().is_empty())
            .then(|| request.assignee_login_id.trim().to_string()),
        attachment_ids: request.attachment_ids.to_vec(),
        body_markdown: request.body_markdown.to_string(),
        label_ids: request.label_ids.to_vec(),
        milestone_id: (request.milestone_id > 0).then_some(request.milestone_id),
        title: request.title.trim().to_string(),
    }
}

fn issue_list_filter_from_request(
    request: &ListProjectIssuesRequestView<'_>,
) -> persistence::IssueListFilter {
    persistence::IssueListFilter {
        assignee_login_id: (!request.assignee_login_id.trim().is_empty())
            .then(|| request.assignee_login_id.trim().to_string()),
        author_login_id: (!request.author_login_id.trim().is_empty())
            .then(|| request.author_login_id.trim().to_string()),
        label_ids: request.label_ids.to_vec(),
        milestone_id: (request.milestone_id > 0).then_some(request.milestone_id),
        page_num: request.page_num.max(1),
        state: (!request.state.trim().is_empty()).then(|| request.state.trim().to_string()),
    }
}

fn milestone_list_filter_from_request(
    request: &ListProjectMilestonesRequestView<'_>,
) -> persistence::MilestoneListFilter {
    persistence::MilestoneListFilter {
        order_by: if request.order_by.trim().is_empty() {
            "dueDate".to_string()
        } else {
            request.order_by.trim().to_string()
        },
        order_dir: if request.order_dir.trim().is_empty() {
            "asc".to_string()
        } else {
            request.order_dir.trim().to_string()
        },
        state: if request.state.trim().is_empty() {
            "open".to_string()
        } else {
            request.state.trim().to_string()
        },
    }
}

fn milestone_mutation_input(
    owner_name: &str,
    project_name: &str,
    title: &str,
    contents_markdown: &str,
    due_date: &str,
    state: &str,
    attachment_ids: &[i64],
) -> Result<persistence::MilestoneMutationInput, ConnectError> {
    let title = title.trim();
    if title.is_empty() {
        return Err(ConnectError::invalid_argument(
            "milestone title is required",
        ));
    }
    Ok(persistence::MilestoneMutationInput {
        attachment_ids: attachment_ids.to_vec(),
        contents_markdown: contents_markdown.to_string(),
        due_date: parse_milestone_due_date(due_date)?,
        owner_name: owner_name.to_string(),
        project_name: project_name.to_string(),
        state: normalize_milestone_state(state)?,
        title: title.to_string(),
    })
}

fn project_facts(
    authorization: &persistence::ProjectAuthorizationRecord,
    is_anonymous: bool,
) -> Result<ProjectAccessFacts, ConnectError> {
    Ok(ProjectAccessFacts {
        is_anonymous,
        is_organization_admin: authorization.viewer.is_organization_admin,
        is_organization_member: authorization.viewer.is_organization_member,
        is_project_manager: authorization.viewer.is_project_manager,
        is_project_member: authorization.viewer.is_project_member,
        is_site_admin: authorization.viewer.is_site_admin,
        project_scope: map_project_scope(&authorization.project.project_scope)?,
    })
}

fn issue_can_mutate(
    authorization: &persistence::ProjectAuthorizationRecord,
    issue: &persistence::IssueRecord,
    actor: &persistence::AppUserRecord,
) -> bool {
    authorization.viewer.is_site_admin
        || authorization.viewer.is_organization_admin
        || authorization.viewer.is_project_manager
        || authorization.viewer.is_project_member
        || issue.author_id == Some(actor.id)
        || (!issue.assignee_login_id.is_empty()
            && issue
                .assignee_login_id
                .eq_ignore_ascii_case(&actor.login_id))
}

async fn require_project_read(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    actor_id: Option<i64>,
) -> Result<persistence::ProjectAuthorizationRecord, ConnectError> {
    let authorization = repository
        .read_project_authorization(owner_name, project_name, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let allowed = authorize_project_access(
        &project_facts(&authorization, actor_id.is_none())?,
        ProjectOperation::Read,
    )
    .allowed;
    if allowed {
        Ok(authorization)
    } else {
        Err(ConnectError::permission_denied(
            "project read is not allowed",
        ))
    }
}

async fn require_authenticated_user(
    repository: &PilotRepository,
    user_id: Option<i64>,
) -> Result<persistence::AppUserRecord, ConnectError> {
    let Some(user_id) = user_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    repository
        .find_user_by_id(user_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::unauthenticated("missing authenticated user"))
}

fn issue_detail_response_from_record(
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_id: Option<i64>,
    base_path: &str,
) -> ReadIssueDetailResponse {
    ReadIssueDetailResponse {
        assignee_label: issue.assignee_label.clone(),
        assignee_login_id: issue.assignee_login_id.clone(),
        attachments: issue
            .attachments
            .iter()
            .map(|attachment| issue_attachment_from_record(attachment, base_path))
            .collect(),
        author_label: issue.author_label.clone(),
        author_login_id: issue.author_login_id.clone(),
        body_html: render_markdown_html(&issue.body_markdown),
        body_markdown: issue.body_markdown.clone(),
        comment_count: issue.comment_count,
        comments: issue
            .comments
            .iter()
            .map(|comment| {
                issue_comment_from_record(comment, viewer_can_manage, viewer_id, base_path)
            })
            .collect(),
        has_voted: issue.has_voted,
        is_watching: issue.is_watching,
        issue_number: issue.issue_number,
        labels: issue.labels.iter().map(issue_label_from_record).collect(),
        milestone_id: issue.milestone_id.unwrap_or_default(),
        milestone_title: issue.milestone_title.clone(),
        owner_name: issue.owner_name.clone(),
        project_name: issue.project_name.clone(),
        state: issue.state.clone(),
        timeline: issue
            .timeline
            .iter()
            .map(|item| {
                issue_timeline_item_from_record(item, viewer_can_manage, viewer_id, base_path)
            })
            .collect(),
        title: issue.title.clone(),
        viewer_can_comment,
        viewer_can_delete: viewer_can_manage,
        viewer_can_update: viewer_can_manage,
        voter_count: issue.voter_count,
        watcher_count: issue.watcher_count,
        ..Default::default()
    }
}

fn format_project_date_label(value: Option<sea_orm::entity::prelude::DateTime>) -> String {
    value
        .map(|value| value.format("%Y-%m-%d").to_string())
        .unwrap_or_default()
}

fn organization_member_summary_from_record(
    record: &persistence::OrganizationMemberRecord,
) -> OrganizationMemberSummary {
    OrganizationMemberSummary {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id.clone(),
        role: record.role.clone(),
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

fn organization_admin_member_from_record(
    record: &persistence::OrganizationMemberRecord,
) -> OrganizationAdminMember {
    OrganizationAdminMember {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id.clone(),
        role: record.role.clone(),
        user_id: record.user_id,
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

fn organization_enrollment_request_summary_from_record(
    record: &persistence::OrganizationEnrollmentRequestRecord,
) -> OrganizationEnrollmentRequestSummary {
    OrganizationEnrollmentRequestSummary {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id.clone(),
        user_id: record.user_id,
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

fn organization_role_options() -> Vec<OrganizationRoleOption> {
    vec![
        OrganizationRoleOption {
            role: "org_admin".to_string(),
            label: "org_admin".to_string(),
            ..Default::default()
        },
        OrganizationRoleOption {
            role: "org_member".to_string(),
            label: "org_member".to_string(),
            ..Default::default()
        },
    ]
}

fn project_member_summary_from_record(
    record: &persistence::ProjectMemberRecord,
) -> ProjectMemberSummary {
    ProjectMemberSummary {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id.clone(),
        role: record.role.clone(),
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

fn project_milestone_summary_from_record(
    record: &persistence::ProjectMilestoneSummaryRecord,
) -> ProjectMilestoneSummary {
    ProjectMilestoneSummary {
        closed_issue_count: record.closed_issue_count,
        completion_percent: record.completion_percent,
        due_date_label: record.due_date_label.clone(),
        open_issue_count: record.open_issue_count,
        title: record.title.clone(),
        ..Default::default()
    }
}

async fn resolve_project_origin(
    repository: &PilotRepository,
    project: &persistence::ProjectRecord,
) -> Result<(String, String), ConnectError> {
    let Some(origin_project_id) = project.original_project_id else {
        return Ok((String::new(), String::new()));
    };
    let Some(origin_project) = repository
        .read_project_by_id(origin_project_id)
        .await
        .map_err(internal_error)?
    else {
        return Ok((String::new(), String::new()));
    };
    Ok((origin_project.owner_name, origin_project.project_name))
}

fn project_code_menu_visible(
    authorization: &persistence::ProjectAuthorizationRecord,
    show_code: bool,
) -> bool {
    show_code
        && (!authorization.project.is_code_accessible_member_only
            || authorization.viewer.is_project_member
            || authorization.viewer.is_project_manager
            || authorization.viewer.is_organization_admin
            || authorization.viewer.is_site_admin)
}

async fn build_organization_container_response(
    repository: &PilotRepository,
    authorization: &persistence::OrganizationAuthorizationRecord,
    actor_id: Option<i64>,
) -> Result<OrganizationContainer, ConnectError> {
    let can_view_roster = authorization.viewer.is_organization_member
        || authorization.viewer.is_organization_admin
        || authorization.viewer.is_site_admin;
    let viewer_can_update = can_update_organization(
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_site_admin,
    );
    let viewer_can_create_project =
        can_create_organization_project(authorization.viewer.is_organization_admin)
            || authorization.viewer.is_site_admin;

    let directory = if can_view_roster {
        Some(
            repository
                .read_organization_members(&authorization.organization.organization_name)
                .await
                .map_err(internal_error)?,
        )
    } else {
        None
    };
    let admin_count = directory
        .as_ref()
        .map(|directory| {
            directory
                .members
                .iter()
                .filter(|member| member.role == "org_admin")
                .count()
        })
        .unwrap_or(0);
    let viewer_can_enroll = actor_id.is_some()
        && !authorization.viewer.is_organization_admin
        && !authorization.viewer.is_organization_member
        && !authorization.viewer.is_site_admin;
    let viewer_can_leave = actor_id.is_some()
        && (authorization.viewer.is_organization_member
            || authorization.viewer.is_organization_admin)
        && (!authorization.viewer.is_organization_admin || admin_count > 1);

    let projects = repository
        .list_projects_for_organization(authorization.organization.id)
        .await
        .map_err(internal_error)?;
    let mut visible_projects = Vec::new();
    for project in projects {
        let Some(project_authorization) = repository
            .read_project_authorization(&project.owner_name, &project.project_name, actor_id)
            .await
            .map_err(internal_error)?
        else {
            continue;
        };
        if !project_read_allowed(&project_authorization, actor_id.is_none())? {
            continue;
        }
        let (origin_owner_name, origin_project_name) =
            resolve_project_origin(repository, &project_authorization.project).await?;
        let is_watching = if let Some(user_id) = actor_id {
            repository
                .is_watching_project(user_id, project_authorization.project.id)
                .await
                .map_err(internal_error)?
        } else {
            false
        };
        visible_projects.push(OrganizationProjectCard {
            created_label: format_project_date_label(project_authorization.project.created_date),
            is_watching,
            last_pushed_label: format_project_date_label(
                project_authorization.project.last_pushed_date,
            ),
            logo_url: String::new(),
            member_count: repository
                .count_project_members(project_authorization.project.id)
                .await
                .map_err(internal_error)?,
            origin_owner_name,
            origin_project_name,
            overview: project_authorization
                .project
                .overview
                .clone()
                .unwrap_or_default(),
            owner_name: project_authorization.project.owner_name.clone(),
            project_name: project_authorization.project.project_name.clone(),
            project_scope: project_authorization.project.project_scope.clone(),
            watch_count: repository
                .count_project_watchers(project_authorization.project.id)
                .await
                .map_err(internal_error)?,
            ..Default::default()
        });
    }

    let admin_members = directory
        .as_ref()
        .map(|directory| {
            directory
                .members
                .iter()
                .filter(|member| member.role == "org_admin")
                .map(organization_member_summary_from_record)
                .collect()
        })
        .unwrap_or_default();
    let member_members = directory
        .as_ref()
        .map(|directory| {
            directory
                .members
                .iter()
                .filter(|member| member.role != "org_admin")
                .map(organization_member_summary_from_record)
                .collect()
        })
        .unwrap_or_default();

    Ok(OrganizationContainer {
        admin_members,
        description: authorization
            .organization
            .description
            .clone()
            .unwrap_or_default(),
        enrollment_requested: authorization.enrollment_requested,
        member_members,
        organization_name: authorization.organization.organization_name.clone(),
        viewer_can_create_project,
        viewer_can_enroll,
        viewer_can_leave,
        viewer_can_update,
        visible_projects,
        ..Default::default()
    })
}

async fn build_organization_admin_response(
    repository: &PilotRepository,
    authorization: &persistence::OrganizationAuthorizationRecord,
) -> Result<OrganizationAdminView, ConnectError> {
    let directory = repository
        .read_organization_members(&authorization.organization.organization_name)
        .await
        .map_err(internal_error)?;
    let delete_allowed = repository
        .list_projects_for_organization(authorization.organization.id)
        .await
        .map_err(internal_error)?
        .is_empty();

    Ok(OrganizationAdminView {
        delete_allowed,
        enrollment_requests: directory
            .enrollment_requests
            .iter()
            .map(organization_enrollment_request_summary_from_record)
            .collect(),
        members: directory
            .members
            .iter()
            .map(organization_admin_member_from_record)
            .collect(),
        organization_name: authorization.organization.organization_name.clone(),
        role_options: organization_role_options(),
        viewer_can_update: can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ),
        ..Default::default()
    })
}

async fn build_project_container_response(
    repository: &PilotRepository,
    public_origin: &str,
    base_path: &str,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
) -> Result<ProjectContainer, ConnectError> {
    let viewer_can_update = if actor_id.is_some() {
        project_update_allowed(authorization)?
    } else {
        false
    };
    let viewer_can_enroll = can_request_project_enrollment(
        actor_id.is_some(),
        authorization.viewer.is_organization_admin,
        authorization.viewer.is_organization_member,
        authorization.viewer.is_project_manager,
        authorization.viewer.is_project_member,
        authorization.viewer.is_site_admin,
    );
    let viewer_can_watch = actor_id.is_some() && project_read_allowed(authorization, false)?;
    let member_count = repository
        .count_project_members(authorization.project.id)
        .await
        .map_err(internal_error)?;
    let watch_count = repository
        .count_project_watchers(authorization.project.id)
        .await
        .map_err(internal_error)?;
    let menu_settings = repository
        .read_project_menu_settings(authorization.project.id)
        .await
        .map_err(internal_error)?;
    let show_code = project_code_menu_visible(authorization, menu_settings.code);
    let show_pull_request = show_code && menu_settings.pull_request;
    let show_review = show_code && menu_settings.review;
    let show_issue = menu_settings.issue;
    let show_milestone = menu_settings.milestone;
    let show_board = menu_settings.board;
    let show_admin = viewer_can_update;
    let is_watching = if let Some(user_id) = actor_id {
        repository
            .is_watching_project(user_id, authorization.project.id)
            .await
            .map_err(internal_error)?
    } else {
        false
    };
    let project_directory = repository
        .read_project_members(
            &authorization.project.owner_name,
            &authorization.project.project_name,
        )
        .await
        .map_err(internal_error)?;
    let members = project_directory
        .members
        .iter()
        .map(project_member_summary_from_record)
        .collect();
    let current_milestone = if show_milestone {
        repository
            .read_current_milestone_for_project(authorization.project.id)
            .await
            .map_err(internal_error)?
            .map(|record| project_milestone_summary_from_record(&record))
            .into()
    } else {
        None.into()
    };
    let (origin_owner_name, origin_project_name) =
        resolve_project_origin(repository, &authorization.project).await?;

    Ok(ProjectContainer {
        background_url: String::new(),
        board_count: if show_board {
            repository
                .count_project_boards(authorization.project.id)
                .await
                .map_err(internal_error)?
        } else {
            0
        },
        clone_url: if show_code {
            absolute_app_url(
                public_origin,
                base_path,
                &format!(
                    "/{}/{}.git",
                    authorization.project.owner_name, authorization.project.project_name
                ),
            )
        } else {
            String::new()
        },
        code_member_only: authorization.project.is_code_accessible_member_only,
        current_milestone,
        default_tab: "readme".to_string(),
        enrollment_requested: authorization.enrollment_requested,
        is_favorited: authorization.is_favorited,
        is_forked: authorization.project.original_project_id.is_some(),
        is_watching,
        logo_url: String::new(),
        member_count,
        members,
        open_issue_count: if show_issue {
            repository
                .count_open_issues_for_project(authorization.project.id)
                .await
                .map_err(internal_error)?
        } else {
            0
        },
        open_pull_request_count: if show_pull_request {
            repository
                .count_open_pull_requests_for_project(authorization.project.id)
                .await
                .map_err(internal_error)?
        } else {
            0
        },
        organization_name: authorization
            .project
            .organization_name
            .clone()
            .unwrap_or_default(),
        origin_owner_name,
        origin_project_name,
        overview: authorization.project.overview.clone().unwrap_or_default(),
        overview_editable: viewer_can_update,
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        project_scope: authorization.project.project_scope.clone(),
        review_count: if show_review {
            repository
                .count_project_reviews(authorization.project.id)
                .await
                .map_err(internal_error)?
        } else {
            0
        },
        show_admin,
        show_board,
        show_code,
        show_issue,
        show_milestone,
        show_pull_request,
        show_review,
        viewer_can_enroll: viewer_can_enroll,
        viewer_can_update: viewer_can_update,
        viewer_can_watch,
        watch_count,
        ..Default::default()
    })
}

impl PilotService for PilotServiceImpl {
    async fn read_current_session(
        &self,
        ctx: Context,
        _request: OwnedView<ReadCurrentSessionRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        let response = resolve_current_session_response(&self.backend, session.as_ref()).await?;
        Ok((response, ctx))
    }

    async fn read_auth_ui_capabilities(
        &self,
        ctx: Context,
        _request: OwnedView<ReadAuthUiCapabilitiesRequestView<'static>>,
    ) -> Result<(ReadAuthUiCapabilitiesResponse, Context), ConnectError> {
        Ok((fixed_auth_ui_capabilities(), ctx))
    }

    async fn sign_in_with_password(
        &self,
        mut ctx: Context,
        request: OwnedView<SignInWithPasswordRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "auth requires repository backend",
            ));
        };

        let identifier = normalize_identifier(request.identifier);
        if identifier.is_empty() || request.password.len() < 8 {
            return Err(ConnectError::invalid_argument("invalid sign-in request"));
        }

        let Some(user) = repository
            .find_user_by_identifier(&identifier)
            .await
            .map_err(internal_error)?
        else {
            return Err(ConnectError::unauthenticated(
                "Invalid login ID, email, or password.",
            ));
        };

        let verified = verify(&request.password, &user.password_hash).map_err(internal_error)?;
        if !verified {
            return Err(ConnectError::unauthenticated(
                "Invalid login ID, email, or password.",
            ));
        }
        if confirmation_session_required() && !user.is_confirmed {
            return Err(ConnectError::unauthenticated(
                "Invalid login ID, email, or password.",
            ));
        }

        let authenticated_session = self
            .session_manager
            .create_authenticated_session(Some(&session.token), user.id);
        attach_session_headers(&mut ctx, &self.session_manager, &authenticated_session);

        let default_landing_path = repository
            .read_default_landing_path(user.id)
            .await
            .map_err(internal_error)?;
        Ok((
            current_session_response_from_user(&user, default_landing_path),
            ctx,
        ))
    }

    async fn register_with_password(
        &self,
        mut ctx: Context,
        request: OwnedView<RegisterWithPasswordRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "auth requires repository backend",
            ));
        };

        let capabilities = fixed_auth_ui_capabilities();
        let login_id = normalize_identifier(request.login_id);
        let email_address = normalize_identifier(request.email_address);
        if login_id.is_empty() {
            return Err(ConnectError::invalid_argument("Login ID is required."));
        }
        if email_address.is_empty() {
            return Err(ConnectError::invalid_argument("Email address is required."));
        }
        if request.name.trim().is_empty() {
            return Err(ConnectError::invalid_argument("Name is required."));
        }
        if request.password.len() < 8 {
            return Err(ConnectError::invalid_argument(
                "Password must be at least 8 characters.",
            ));
        }
        if request.password != request.retyped_password {
            return Err(ConnectError::invalid_argument("Passwords do not match."));
        }

        if repository
            .find_user_by_identifier(&login_id)
            .await
            .map_err(internal_error)?
            .is_some()
            || repository
                .find_user_by_identifier(&email_address)
                .await
                .map_err(internal_error)?
                .is_some()
        {
            return Err(ConnectError::already_exists(
                "Login ID or email is already in use.",
            ));
        }

        let password_hash = hash(&request.password, DEFAULT_COST).map_err(internal_error)?;
        let user = repository
            .create_user(persistence::CreateUserInput {
                display_name: request.name.trim().to_string(),
                email_address,
                is_confirmed: !confirmation_session_required(),
                is_site_admin: false,
                login_id,
                password_hash,
            })
            .await
            .map_err(internal_error)?;

        if capabilities.email_verification_enabled {
            let verification_code = repository
                .create_signup_verification_for_user(user.id, &user.login_id)
                .await
                .map_err(internal_error)?;
            send_signup_verification_mail(
                &user.email_address,
                &user.login_id,
                &verification_code,
                &self.public_origin,
                &self.base_path,
            )?;
        }

        if confirmation_session_required() {
            return Ok((anonymous_current_session_response(), ctx));
        }

        let authenticated_session = self
            .session_manager
            .create_authenticated_session(Some(&session.token), user.id);
        attach_session_headers(&mut ctx, &self.session_manager, &authenticated_session);

        Ok((current_session_response_from_user(&user, None), ctx))
    }

    async fn verify_user(
        &self,
        ctx: Context,
        request: OwnedView<VerifyUserRequestView<'static>>,
    ) -> Result<(VerifyUserResponse, Context), ConnectError> {
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "auth requires repository backend",
            ));
        };
        let Some(user_id) = repository
            .find_valid_signup_verification_user_id(request.login_id, request.verification_code)
            .await
            .map_err(internal_error)?
        else {
            return Err(ConnectError::not_found("Invalid verification"));
        };
        let user = repository
            .mark_user_confirmed(user_id)
            .await
            .map_err(internal_error)?;
        repository
            .delete_signup_verification(request.verification_code)
            .await
            .map_err(internal_error)?;
        Ok((
            VerifyUserResponse {
                login_id: user.login_id,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn sign_out(
        &self,
        mut ctx: Context,
        _request: OwnedView<SignOutRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;

        let anonymous_session = self
            .session_manager
            .create_anonymous_session(Some(&session.token));
        attach_session_headers(&mut ctx, &self.session_manager, &anonymous_session);

        Ok((anonymous_current_session_response(), ctx))
    }

    async fn read_workspace_overview(
        &self,
        ctx: Context,
        _request: OwnedView<ReadWorkspaceOverviewRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        Ok((
            build_workspace_overview_response(repository, &session, &self.base_path).await?,
            ctx,
        ))
    }

    async fn set_default_landing_path(
        &self,
        ctx: Context,
        request: OwnedView<SetDefaultLandingPathRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };

        let Some(path) = normalize_default_landing_path(Some(&request.path)) else {
            return Err(ConnectError::invalid_argument(
                "invalid default landing path",
            ));
        };
        repository
            .set_default_landing_path(user_id, Some(path))
            .await
            .map_err(internal_error)?;

        Ok((
            build_workspace_overview_response(repository, &session, &self.base_path).await?,
            ctx,
        ))
    }

    async fn update_profile(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProfileRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        if request.name.trim().is_empty() {
            return Err(workspace_invalid_argument("Name is required."));
        }
        if !request.avatar_attachment_id.trim().is_empty() {
            let attachment_id = request
                .avatar_attachment_id
                .trim()
                .parse::<i64>()
                .map_err(|_| workspace_invalid_argument("Avatar attachment id is invalid."))?;
            let Some(attachment) = repository
                .promote_avatar_attachment_for_user(user_id, attachment_id)
                .await
                .map_err(|error| workspace_invalid_argument(error.to_string()))?
            else {
                return Err(workspace_invalid_argument("Avatar attachment is invalid."));
            };
            if !attachment.mime_type.starts_with("image/") {
                return Err(workspace_invalid_argument("Only image files are allowed."));
            }
            if attachment.size > 1024 * 1000 {
                return Err(workspace_invalid_argument(
                    "Images should be less than 1MB in size.",
                ));
            }
        }
        repository
            .update_profile_for_user(user_id, &request.name, &request.email)
            .await
            .map_err(|error| workspace_invalid_argument(error.to_string()))?;
        Ok((
            build_workspace_overview_response(repository, &session, &self.base_path).await?,
            ctx,
        ))
    }

    async fn change_password(
        &self,
        mut ctx: Context,
        request: OwnedView<ChangePasswordRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        let user = repository
            .find_user_by_id(user_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::unauthenticated("missing authenticated session"))?;
        if normalize_identifier(&request.login_id) != user.login_id {
            return Err(workspace_invalid_argument(
                "Login ID does not match current session.",
            ));
        }
        if !verify(&request.old_password, &user.password_hash).map_err(internal_error)? {
            return Err(workspace_invalid_argument("Current password is incorrect."));
        }
        if request.password.len() < 8 {
            return Err(workspace_invalid_argument(
                "Password must be at least 8 characters.",
            ));
        }
        if request.password != request.retyped_password {
            return Err(workspace_invalid_argument("Passwords do not match."));
        }
        let password_hash = hash(&request.password, DEFAULT_COST).map_err(internal_error)?;
        repository
            .update_password_hash_for_user(user_id, &password_hash)
            .await
            .map_err(internal_error)?;

        let anonymous_session = self
            .session_manager
            .create_anonymous_session(Some(&session.token));
        attach_session_headers(&mut ctx, &self.session_manager, &anonymous_session);
        Ok((anonymous_current_session_response(), ctx))
    }

    async fn reset_visited_projects(
        &self,
        ctx: Context,
        _request: OwnedView<ResetVisitedProjectsRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        repository
            .clear_recent_projects_for_user(user_id)
            .await
            .map_err(internal_error)?;
        Ok((
            build_workspace_overview_response(repository, &session, &self.base_path).await?,
            ctx,
        ))
    }

    async fn add_workspace_email(
        &self,
        ctx: Context,
        request: OwnedView<AddWorkspaceEmailRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        repository
            .add_workspace_email_for_user(user_id, &request.email)
            .await
            .map_err(|error| workspace_invalid_argument(error.to_string()))?;
        Ok((
            build_workspace_overview_response(repository, &session, &self.base_path).await?,
            ctx,
        ))
    }

    async fn delete_workspace_email(
        &self,
        ctx: Context,
        request: OwnedView<DeleteWorkspaceEmailRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let email_id = request
            .id
            .parse::<i64>()
            .map_err(|_| workspace_invalid_argument("Email id is invalid."))?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        repository
            .delete_workspace_email_for_user(user_id, email_id)
            .await
            .map_err(|error| workspace_invalid_argument(error.to_string()))?;
        Ok((
            build_workspace_overview_response(repository, &session, &self.base_path).await?,
            ctx,
        ))
    }

    async fn send_workspace_email_validation(
        &self,
        ctx: Context,
        request: OwnedView<SendWorkspaceEmailValidationRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let email_id = request
            .id
            .parse::<i64>()
            .map_err(|_| workspace_invalid_argument("Email id is invalid."))?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        repository
            .send_workspace_email_validation_for_user(user_id, email_id)
            .await
            .map_err(|error| workspace_invalid_argument(error.to_string()))?;
        Ok((
            build_workspace_overview_response(repository, &session, &self.base_path).await?,
            ctx,
        ))
    }

    async fn set_main_workspace_email(
        &self,
        ctx: Context,
        request: OwnedView<SetMainWorkspaceEmailRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let email_id = request
            .id
            .parse::<i64>()
            .map_err(|_| workspace_invalid_argument("Email id is invalid."))?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        repository
            .set_main_workspace_email_for_user(user_id, email_id)
            .await
            .map_err(|error| workspace_invalid_argument(error.to_string()))?;
        Ok((
            build_workspace_overview_response(repository, &session, &self.base_path).await?,
            ctx,
        ))
    }

    async fn reset_api_token(
        &self,
        ctx: Context,
        _request: OwnedView<ResetApiTokenRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        repository
            .reset_api_token_for_user(user_id)
            .await
            .map_err(internal_error)?;
        Ok((
            build_workspace_overview_response(repository, &session, &self.base_path).await?,
            ctx,
        ))
    }

    async fn toggle_workspace_notification(
        &self,
        ctx: Context,
        request: OwnedView<ToggleWorkspaceNotificationRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let project_id = request
            .project_id
            .parse::<i64>()
            .map_err(|_| workspace_invalid_argument("Project id is invalid."))?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        let project = repository
            .read_project_by_id(project_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let authorization = repository
            .read_project_authorization(&project.owner_name, &project.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let project_scope = map_project_scope(&authorization.project.project_scope)?;
        let access = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope,
            },
            ProjectOperation::Read,
        );
        if !access.allowed {
            return Err(ConnectError::permission_denied("project access forbidden"));
        }
        let is_watching = repository
            .is_watching_project(user_id, project_id)
            .await
            .map_err(internal_error)?;
        if !is_watching {
            return Err(workspace_invalid_argument("watch not found"));
        }
        repository
            .toggle_workspace_notification_for_user(user_id, project_id, &request.event_type)
            .await
            .map_err(|error| workspace_invalid_argument(error.to_string()))?;
        Ok((
            build_workspace_overview_response(repository, &session, &self.base_path).await?,
            ctx,
        ))
    }

    async fn create_organization(
        &self,
        mut ctx: Context,
        request: OwnedView<CreateOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };

        if !is_valid_organization_name(request.organization_name) || request.description.len() > 255
        {
            return Err(ConnectError::invalid_argument(
                "invalid organization request",
            ));
        }
        if repository
            .organization_name_exists(request.organization_name)
            .await
            .map_err(internal_error)?
            || repository
                .user_login_id_exists(request.organization_name)
                .await
                .map_err(internal_error)?
        {
            return Err(ConnectError::already_exists(
                "Organization name is already in use.",
            ));
        }

        let organization = repository
            .create_organization(persistence::CreateOrganizationInput {
                description: Some(request.description.trim().to_string()),
                organization_name: request.organization_name.trim().to_string(),
            })
            .await
            .map_err(internal_error)?;
        repository
            .add_organization_membership(organization.id, user_id, "org_admin")
            .await
            .map_err(internal_error)?;
        attach_session_headers(&mut ctx, &self.session_manager, &session);

        Ok((
            organization_detail_from_record(
                &persistence::OrganizationRecord {
                    id: organization.id,
                    organization_name: organization.organization_name,
                    description: organization.description,
                },
                true,
            ),
            ctx,
        ))
    }

    async fn read_organization_detail(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationDetailRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        let actor_id = self
            .session_manager
            .read_session_from_headers(&ctx.headers)
            .and_then(|session| session.user_id);
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, actor_id)
            .await
            .map_err(internal_error)?;
        if let Some(authorization) = authorization {
            return Ok((
                organization_detail_from_record(
                    &authorization.organization,
                    can_update_organization(
                        authorization.viewer.is_organization_admin,
                        authorization.viewer.is_site_admin,
                    ),
                ),
                ctx,
            ));
        }

        let organization = repository
            .read_organization_by_name(request.organization_name)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            organization_detail_from_record(
                &persistence::OrganizationRecord {
                    id: organization.id,
                    organization_name: organization.organization_name,
                    description: organization.description,
                },
                false,
            ),
            ctx,
        ))
    }

    async fn read_organization_settings(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationSettingsRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        Ok((
            organization_detail_from_record(&authorization.organization, true),
            ctx,
        ))
    }

    async fn read_organization_members(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationMembersRequestView<'static>>,
    ) -> Result<(ReadOrganizationMembersResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        let directory = repository
            .read_organization_members(request.organization_name)
            .await
            .map_err(internal_error)?;
        Ok((
            ReadOrganizationMembersResponse {
                enrollment_requests: directory
                    .enrollment_requests
                    .into_iter()
                    .map(|request| OrganizationEnrollmentRequest {
                        login_id: request.login_id,
                        user_label: request.user_label,
                        ..Default::default()
                    })
                    .collect(),
                members: directory
                    .members
                    .into_iter()
                    .map(|member| OrganizationMember {
                        login_id: member.login_id,
                        role: member.role,
                        user_label: member.user_label,
                        ..Default::default()
                    })
                    .collect(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn read_organization_admin(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationAdminRequestView<'static>>,
    ) -> Result<(OrganizationAdminView, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        Ok((
            build_organization_admin_response(repository, &authorization).await?,
            ctx,
        ))
    }

    async fn read_organization_container(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationContainerRequestView<'static>>,
    ) -> Result<(OrganizationContainer, Context), ConnectError> {
        let actor_id = self
            .session_manager
            .read_session_from_headers(&ctx.headers)
            .and_then(|session| session.user_id);
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, actor_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;

        Ok((
            build_organization_container_response(repository, &authorization, actor_id).await?,
            ctx,
        ))
    }

    async fn update_organization(
        &self,
        ctx: Context,
        request: OwnedView<UpdateOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        if !is_valid_organization_name(request.organization_name) || request.description.len() > 255
        {
            return Err(ConnectError::invalid_argument(
                "invalid organization request",
            ));
        }

        let authorization = repository
            .read_organization_authorization(request.current_organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        if normalize_identifier(request.current_organization_name)
            != normalize_identifier(request.organization_name)
            && (repository
                .organization_name_exists(request.organization_name)
                .await
                .map_err(internal_error)?
                || repository
                    .user_login_id_exists(request.organization_name)
                    .await
                    .map_err(internal_error)?)
        {
            return Err(ConnectError::already_exists(
                "Organization name is already in use.",
            ));
        }

        let updated = repository
            .update_organization(persistence::UpdateOrganizationInput {
                current_organization_name: request.current_organization_name.trim().to_string(),
                description: Some(request.description.trim().to_string()),
                organization_name: request.organization_name.trim().to_string(),
            })
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            organization_detail_from_record(
                &persistence::OrganizationRecord {
                    id: updated.id,
                    organization_name: updated.organization_name,
                    description: updated.description,
                },
                true,
            ),
            ctx,
        ))
    }

    async fn add_organization_member(
        &self,
        ctx: Context,
        request: OwnedView<AddOrganizationMemberRequestView<'static>>,
    ) -> Result<(OrganizationAdminView, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        let target_user = repository
            .find_user_by_login_id(request.login_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::invalid_argument("organization member is unknown"))?;
        repository
            .add_organization_membership(
                authorization.organization.id,
                target_user.id,
                "org_member",
            )
            .await
            .map_err(internal_error)?;
        repository
            .delete_organization_enrollment_request(authorization.organization.id, target_user.id)
            .await
            .map_err(internal_error)?;

        let refreshed = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            build_organization_admin_response(repository, &refreshed).await?,
            ctx,
        ))
    }

    async fn update_organization_member_role(
        &self,
        ctx: Context,
        request: OwnedView<UpdateOrganizationMemberRoleRequestView<'static>>,
    ) -> Result<(OrganizationAdminView, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        if request.role != "org_admin" && request.role != "org_member" {
            return Err(ConnectError::invalid_argument(
                "organization role is invalid",
            ));
        }

        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        let directory = repository
            .read_organization_members(request.organization_name)
            .await
            .map_err(internal_error)?;
        let current_member = directory
            .members
            .iter()
            .find(|member| member.user_id == request.user_id);
        if let Some(current_member) = current_member {
            let admin_count = directory
                .members
                .iter()
                .filter(|member| member.role == "org_admin")
                .count();
            if current_member.role == "org_admin"
                && request.role == "org_member"
                && admin_count == 1
            {
                return Err(ConnectError::invalid_argument(
                    "organization requires at least one admin",
                ));
            }
            repository
                .add_organization_membership(
                    authorization.organization.id,
                    request.user_id,
                    request.role,
                )
                .await
                .map_err(internal_error)?;
        }

        let refreshed = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            build_organization_admin_response(repository, &refreshed).await?,
            ctx,
        ))
    }

    async fn delete_organization_member(
        &self,
        ctx: Context,
        request: OwnedView<DeleteOrganizationMemberRequestView<'static>>,
    ) -> Result<(OrganizationAdminView, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        let can_update = can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        );
        if !can_update && user_id != request.user_id {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        let directory = repository
            .read_organization_members(request.organization_name)
            .await
            .map_err(internal_error)?;
        if let Some(current_member) = directory
            .members
            .iter()
            .find(|member| member.user_id == request.user_id)
        {
            let admin_count = directory
                .members
                .iter()
                .filter(|member| member.role == "org_admin")
                .count();
            if current_member.role == "org_admin" && admin_count == 1 {
                return Err(ConnectError::invalid_argument(
                    "organization requires at least one admin",
                ));
            }
            repository
                .delete_organization_membership(authorization.organization.id, request.user_id)
                .await
                .map_err(internal_error)?;
        }

        let refreshed = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            build_organization_admin_response(repository, &refreshed).await?,
            ctx,
        ))
    }

    async fn accept_organization_enrollment(
        &self,
        ctx: Context,
        request: OwnedView<AcceptOrganizationEnrollmentRequestView<'static>>,
    ) -> Result<(OrganizationAdminView, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        repository
            .add_organization_membership(
                authorization.organization.id,
                request.user_id,
                "org_member",
            )
            .await
            .map_err(internal_error)?;
        repository
            .delete_organization_enrollment_request(authorization.organization.id, request.user_id)
            .await
            .map_err(internal_error)?;

        let refreshed = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            build_organization_admin_response(repository, &refreshed).await?,
            ctx,
        ))
    }

    async fn enroll_organization(
        &self,
        ctx: Context,
        request: OwnedView<EnrollOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationContainer, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::invalid_argument("organization not found"))?;
        if authorization.viewer.is_organization_admin
            || authorization.viewer.is_organization_member
            || authorization.viewer.is_site_admin
        {
            return Err(ConnectError::already_exists(
                "Organization enrollment is only available to guests.",
            ));
        }

        repository
            .create_organization_enrollment_request(authorization.organization.id, user_id)
            .await
            .map_err(internal_error)?;
        let refreshed = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            build_organization_container_response(repository, &refreshed, Some(user_id)).await?,
            ctx,
        ))
    }

    async fn cancel_enroll_organization(
        &self,
        ctx: Context,
        request: OwnedView<CancelEnrollOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationContainer, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::invalid_argument("organization not found"))?;
        if authorization.viewer.is_organization_admin
            || authorization.viewer.is_organization_member
            || authorization.viewer.is_site_admin
        {
            return Err(ConnectError::already_exists(
                "Organization enrollment is only available to guests.",
            ));
        }

        repository
            .delete_organization_enrollment_request(authorization.organization.id, user_id)
            .await
            .map_err(internal_error)?;
        let refreshed = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            build_organization_container_response(repository, &refreshed, Some(user_id)).await?,
            ctx,
        ))
    }

    async fn leave_organization(
        &self,
        ctx: Context,
        request: OwnedView<LeaveOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationRedirectResult, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !authorization.viewer.is_organization_admin
            && !authorization.viewer.is_organization_member
        {
            return Err(ConnectError::invalid_argument(
                "organization leave is only available to members",
            ));
        }

        let directory = repository
            .read_organization_members(request.organization_name)
            .await
            .map_err(internal_error)?;
        let admin_count = directory
            .members
            .iter()
            .filter(|member| member.role == "org_admin")
            .count();
        if authorization.viewer.is_organization_admin && admin_count == 1 {
            return Err(ConnectError::invalid_argument(
                "organization requires at least one admin",
            ));
        }

        repository
            .delete_organization_membership(authorization.organization.id, user_id)
            .await
            .map_err(internal_error)?;
        Ok((
            OrganizationRedirectResult {
                ok: true,
                redirect_path: format!(
                    "/organizations/{}",
                    authorization.organization.organization_name
                ),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn delete_organization(
        &self,
        ctx: Context,
        request: OwnedView<DeleteOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationRedirectResult, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization delete is not allowed",
            ));
        }
        if !repository
            .list_projects_for_organization(authorization.organization.id)
            .await
            .map_err(internal_error)?
            .is_empty()
        {
            return Err(ConnectError::invalid_argument("organization has projects"));
        }

        repository
            .delete_organization_by_name(request.organization_name)
            .await
            .map_err(internal_error)?;
        Ok((
            OrganizationRedirectResult {
                ok: true,
                redirect_path: "/".to_string(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn create_project(
        &self,
        ctx: Context,
        request: OwnedView<CreateProjectRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let scope = map_project_scope(request.project_scope)?;
        if !is_valid_project_name(request.project_name) || request.overview.len() > 255 {
            return Err(ConnectError::invalid_argument("invalid project request"));
        }
        if repository
            .project_identifier_exists(request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?
        {
            return Err(ConnectError::already_exists(
                "Project name is already in use for this owner.",
            ));
        }
        let actor = repository
            .find_user_by_id(user_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::unauthenticated("missing authenticated user"))?;

        let organization = repository
            .read_organization_authorization(request.owner_name, Some(user_id))
            .await
            .map_err(internal_error)?;
        let created = if let Some(organization) = organization {
            if !can_create_organization_project(organization.viewer.is_organization_admin) {
                return Err(ConnectError::permission_denied(
                    "organization project creation is not allowed",
                ));
            }
            repository
                .create_project(persistence::CreateProjectInput {
                    organization_id: Some(organization.organization.id),
                    owner_name: organization.organization.organization_name,
                    overview: Some(request.overview.trim().to_string()),
                    project_name: request.project_name.trim().to_string(),
                    project_scope: scope.as_str().to_string(),
                })
                .await
                .map_err(internal_error)?
        } else {
            if !can_create_personal_project(Some(&actor.login_id), request.owner_name) {
                return Err(ConnectError::invalid_argument("project owner is invalid"));
            }
            repository
                .create_project(persistence::CreateProjectInput {
                    organization_id: None,
                    owner_name: request.owner_name.trim().to_string(),
                    overview: Some(request.overview.trim().to_string()),
                    project_name: request.project_name.trim().to_string(),
                    project_scope: scope.as_str().to_string(),
                })
                .await
                .map_err(internal_error)?
        };
        repository
            .add_project_membership(created.id, user_id, "manager")
            .await
            .map_err(internal_error)?;
        let authorization = repository
            .read_project_authorization(&created.owner_name, &created.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        Ok((project_detail_from_record(&authorization, true, false), ctx))
    }

    async fn read_project_detail(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectDetailRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        let actor_id = session.as_ref().and_then(|session| session.user_id);
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, actor_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let decision = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: actor_id.is_none(),
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Read,
        );
        if !decision.allowed {
            return if actor_id.is_none() {
                Err(ConnectError::unauthenticated("project read is not allowed"))
            } else {
                Err(ConnectError::permission_denied(
                    "project read is not allowed",
                ))
            };
        }

        if let Some(user_id) = actor_id {
            repository
                .record_recent_project_visit(
                    user_id,
                    &authorization.project.owner_name,
                    &authorization.project.project_name,
                )
                .await
                .map_err(internal_error)?;
        }

        Ok((
            project_detail_from_record(
                &authorization,
                authorize_project_access(
                    &ProjectAccessFacts {
                        is_anonymous: actor_id.is_none(),
                        is_organization_admin: authorization.viewer.is_organization_admin,
                        is_organization_member: authorization.viewer.is_organization_member,
                        is_project_manager: authorization.viewer.is_project_manager,
                        is_project_member: authorization.viewer.is_project_member,
                        is_site_admin: authorization.viewer.is_site_admin,
                        project_scope: map_project_scope(&authorization.project.project_scope)?,
                    },
                    ProjectOperation::Update,
                )
                .allowed,
                can_request_project_enrollment(
                    actor_id.is_some(),
                    authorization.viewer.is_organization_admin,
                    authorization.viewer.is_organization_member,
                    authorization.viewer.is_project_manager,
                    authorization.viewer.is_project_member,
                    authorization.viewer.is_site_admin,
                ),
            ),
            ctx,
        ))
    }

    async fn read_project_settings(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectSettingsRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let can_update = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Update,
        )
        .allowed;
        if !can_update {
            return Err(ConnectError::permission_denied(
                "project update is not allowed",
            ));
        }

        Ok((project_detail_from_record(&authorization, true, false), ctx))
    }

    async fn read_project_members(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectMembersRequestView<'static>>,
    ) -> Result<(ReadProjectMembersResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let can_update = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Update,
        )
        .allowed;
        if !can_update {
            return Err(ConnectError::permission_denied(
                "project update is not allowed",
            ));
        }

        let directory = repository
            .read_project_members(request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?;
        Ok((
            ReadProjectMembersResponse {
                enrollment_requests: directory
                    .enrollment_requests
                    .into_iter()
                    .map(|request| ProjectEnrollmentRequest {
                        login_id: request.login_id,
                        user_label: request.user_label,
                        ..Default::default()
                    })
                    .collect(),
                members: directory
                    .members
                    .into_iter()
                    .map(|member| ProjectMember {
                        login_id: member.login_id,
                        role: member.role,
                        user_label: member.user_label,
                        ..Default::default()
                    })
                    .collect(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn read_project_container(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectContainerRequestView<'static>>,
    ) -> Result<(ProjectContainer, Context), ConnectError> {
        let actor_id = self
            .session_manager
            .read_session_from_headers(&ctx.headers)
            .and_then(|session| session.user_id);
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, actor_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        if !project_read_allowed(&authorization, actor_id.is_none())? {
            return if actor_id.is_none() {
                Err(ConnectError::unauthenticated("project read is not allowed"))
            } else {
                Err(ConnectError::permission_denied(
                    "project read is not allowed",
                ))
            };
        }

        if let Some(user_id) = actor_id {
            repository
                .record_recent_project_visit(user_id, request.owner_name, request.project_name)
                .await
                .map_err(internal_error)?;
        }

        Ok((
            build_project_container_response(
                repository,
                &self.public_origin,
                &self.base_path,
                &authorization,
                actor_id,
            )
            .await?,
            ctx,
        ))
    }

    async fn update_project_overview(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectOverviewRequestView<'static>>,
    ) -> Result<(ProjectContainer, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        if request.overview.len() > 255 {
            return Err(ConnectError::invalid_argument("invalid project request"));
        }

        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "project update is not allowed",
            ));
        }

        repository
            .update_project(persistence::UpdateProjectInput {
                current_owner_name: authorization.project.owner_name.clone(),
                current_project_name: authorization.project.project_name.clone(),
                overview: Some(request.overview.trim().to_string()),
                project_name: authorization.project.project_name.clone(),
                project_scope: authorization.project.project_scope.clone(),
            })
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;

        let refreshed = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;

        Ok((
            build_project_container_response(
                repository,
                &self.public_origin,
                &self.base_path,
                &refreshed,
                Some(user_id),
            )
            .await?,
            ctx,
        ))
    }

    async fn toggle_project_watch(
        &self,
        ctx: Context,
        request: OwnedView<ToggleProjectWatchRequestView<'static>>,
    ) -> Result<(ProjectContainer, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        if !project_read_allowed(&authorization, false)? {
            return Err(ConnectError::permission_denied(
                "project read is not allowed",
            ));
        }

        repository
            .set_project_watch(user_id, authorization.project.id, request.watching)
            .await
            .map_err(internal_error)?;

        let refreshed = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;

        Ok((
            build_project_container_response(
                repository,
                &self.public_origin,
                &self.base_path,
                &refreshed,
                Some(user_id),
            )
            .await?,
            ctx,
        ))
    }

    async fn update_project(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        if !is_valid_project_name(request.project_name) || request.overview.len() > 255 {
            return Err(ConnectError::invalid_argument("invalid project request"));
        }
        let authorization = repository
            .read_project_authorization(
                request.current_owner_name,
                request.current_project_name,
                Some(user_id),
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let can_update = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Update,
        )
        .allowed;
        if !can_update {
            return Err(ConnectError::permission_denied(
                "project update is not allowed",
            ));
        }
        if normalize_identifier(request.current_owner_name)
            != normalize_identifier(request.owner_name)
        {
            return Err(ConnectError::invalid_argument(
                "project owner change is not supported in this packet",
            ));
        }
        if (normalize_identifier(request.current_owner_name)
            != normalize_identifier(request.owner_name)
            || normalize_identifier(request.current_project_name)
                != normalize_identifier(request.project_name))
            && repository
                .project_identifier_exists(request.owner_name, request.project_name)
                .await
                .map_err(internal_error)?
        {
            return Err(ConnectError::already_exists(
                "Project name is already in use for this owner.",
            ));
        }

        repository
            .update_project(persistence::UpdateProjectInput {
                current_owner_name: request.current_owner_name.trim().to_string(),
                current_project_name: request.current_project_name.trim().to_string(),
                overview: Some(request.overview.trim().to_string()),
                project_name: request.project_name.trim().to_string(),
                project_scope: map_project_scope(request.project_scope)?
                    .as_str()
                    .to_string(),
            })
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let updated = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        Ok((project_detail_from_record(&updated, true, false), ctx))
    }

    async fn enroll_project(
        &self,
        ctx: Context,
        request: OwnedView<EnrollProjectRequestView<'static>>,
    ) -> Result<(EnrollmentMutationResult, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        if !can_request_project_enrollment(
            true,
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_organization_member,
            authorization.viewer.is_project_manager,
            authorization.viewer.is_project_member,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::already_exists(
                "Project enrollment is only available to guests.",
            ));
        }
        repository
            .create_project_enrollment_request(authorization.project.id, user_id)
            .await
            .map_err(internal_error)?;
        Ok((
            EnrollmentMutationResult {
                ok: true,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn cancel_enroll_project(
        &self,
        ctx: Context,
        request: OwnedView<CancelEnrollProjectRequestView<'static>>,
    ) -> Result<(EnrollmentMutationResult, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        if !can_request_project_enrollment(
            true,
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_organization_member,
            authorization.viewer.is_project_manager,
            authorization.viewer.is_project_member,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::already_exists(
                "Project enrollment is only available to guests.",
            ));
        }
        repository
            .delete_project_enrollment_request(authorization.project.id, user_id)
            .await
            .map_err(internal_error)?;
        Ok((
            EnrollmentMutationResult {
                ok: true,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn toggle_favorite_project(
        &self,
        ctx: Context,
        request: OwnedView<ToggleFavoriteProjectRequestView<'static>>,
    ) -> Result<(ToggleFavoriteProjectResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let can_read = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Read,
        )
        .allowed;
        if !can_read {
            return Err(ConnectError::permission_denied(
                "project read is not allowed",
            ));
        }
        let result = repository
            .toggle_favorite_project(user_id, request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?;
        Ok((
            ToggleFavoriteProjectResponse {
                favorited: result.favorited,
                owner_name: result.owner_name,
                project_name: result.project_name,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn record_recent_project_visit(
        &self,
        ctx: Context,
        request: OwnedView<RecordRecentProjectVisitRequestView<'static>>,
    ) -> Result<(RecordRecentProjectVisitResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let can_read = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Read,
        )
        .allowed;
        if !can_read {
            return Err(ConnectError::permission_denied(
                "project read is not allowed",
            ));
        }
        let result = repository
            .record_recent_project_visit(user_id, request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?;
        Ok((
            RecordRecentProjectVisitResponse {
                owner_name: result.owner_name,
                project_name: result.project_name,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn list_projects(
        &self,
        ctx: Context,
        _request: OwnedView<ListProjectsRequestView<'static>>,
    ) -> Result<(ListProjectsResponse, Context), ConnectError> {
        if let PilotBackend::Repository(repository) = &self.backend {
            let items = repository
                .list_projects()
                .await
                .map_err(|error| {
                    ConnectError::new(connectrpc::ErrorCode::Internal, error.to_string())
                })?
                .into_iter()
                .map(|item| ProjectListItem {
                    owner_name: item.owner_name,
                    project_name: item.project_name,
                    overview: item.overview.unwrap_or_default(),
                    project_scope: item.project_scope,
                    ..Default::default()
                })
                .collect();

            return Ok((
                ListProjectsResponse {
                    items,
                    ..Default::default()
                },
                ctx,
            ));
        }

        Ok((
            ListProjectsResponse {
                items: vec![ProjectListItem {
                    owner_name: "pilot".to_string(),
                    project_name: "yona".to_string(),
                    overview: "Pilot projects list is using the browser-safe route tree."
                        .to_string(),
                    project_scope: "public".to_string(),
                    ..Default::default()
                }],
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn list_organizations(
        &self,
        ctx: Context,
        _request: OwnedView<ListOrganizationsRequestView<'static>>,
    ) -> Result<(ListOrganizationsResponse, Context), ConnectError> {
        if let PilotBackend::Repository(repository) = &self.backend {
            let items = repository
                .list_organizations()
                .await
                .map_err(|error| {
                    ConnectError::new(connectrpc::ErrorCode::Internal, error.to_string())
                })?
                .into_iter()
                .map(|item| OrganizationListItem {
                    organization_name: item.organization_name,
                    description: item.description.unwrap_or_default(),
                    ..Default::default()
                })
                .collect();

            return Ok((
                ListOrganizationsResponse {
                    items,
                    ..Default::default()
                },
                ctx,
            ));
        }

        Ok((
            ListOrganizationsResponse {
                items: vec![OrganizationListItem {
                    organization_name: "pilot".to_string(),
                    description: "Pilot organization directory route foundation".to_string(),
                    ..Default::default()
                }],
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn list_project_issues(
        &self,
        ctx: Context,
        request: OwnedView<ListProjectIssuesRequestView<'static>>,
    ) -> Result<(ListProjectIssuesResponse, Context), ConnectError> {
        if request.owner_name.trim().is_empty() || request.project_name.trim().is_empty() {
            return Err(ConnectError::invalid_argument(
                "invalid pilot project issue list request",
            ));
        }

        if let PilotBackend::Repository(repository) = &self.backend {
            let actor_id = self
                .session_manager
                .read_session_from_headers(&ctx.headers)
                .and_then(|session| session.user_id);

            let authorization = require_project_read(
                repository,
                request.owner_name,
                request.project_name,
                actor_id,
            )
            .await?;

            let record = repository
                .list_project_issues_filtered(
                    request.owner_name,
                    request.project_name,
                    issue_list_filter_from_request(&request),
                )
                .await
                .map_err(internal_error)?;

            return Ok((
                ListProjectIssuesResponse {
                    items: record
                        .items
                        .into_iter()
                        .map(project_issue_list_item_to_proto)
                        .collect(),
                    owner_name: authorization.project.owner_name,
                    page_num: record.page_num,
                    page_size: record.page_size,
                    project_name: authorization.project.project_name,
                    total_count: record.total_count,
                    ..Default::default()
                },
                ctx,
            ));
        }

        if request.owner_name != "pilot" || request.project_name != "yona" {
            return Err(ConnectError::not_found("pilot project not found"));
        }

        Ok((
            ListProjectIssuesResponse {
                owner_name: "pilot".to_string(),
                project_name: "yona".to_string(),
                items: vec![ProjectIssueListItem {
                    issue_number: 1,
                    title: "Pilot issue".to_string(),
                    state: "open".to_string(),
                    ..Default::default()
                }],
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn read_issue_detail(
        &self,
        ctx: Context,
        request: OwnedView<ReadIssueDetailRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        if request.owner_name.trim().is_empty()
            || request.project_name.trim().is_empty()
            || request.issue_number <= 0
        {
            return Err(ConnectError::invalid_argument(
                "invalid pilot issue detail request",
            ));
        }

        if let PilotBackend::Repository(repository) = &self.backend {
            let session = self.session_manager.read_session_from_headers(&ctx.headers);
            let actor_id = session.as_ref().and_then(|session| session.user_id);
            let authorization = require_project_read(
                repository,
                request.owner_name,
                request.project_name,
                actor_id,
            )
            .await?;
            let issue = repository
                .read_issue_detail(
                    request.owner_name,
                    request.project_name,
                    request.issue_number,
                )
                .await
                .map_err(internal_error)?;

            let Some(issue) = issue else {
                return Err(ConnectError::not_found("pilot issue not found"));
            };
            let actor = match actor_id {
                Some(user_id) => repository
                    .find_user_by_id(user_id)
                    .await
                    .map_err(internal_error)?,
                None => None,
            };
            let viewer_can_manage = actor
                .as_ref()
                .is_some_and(|actor| issue_can_mutate(&authorization, &issue, actor));
            let viewer_can_comment = actor_id.is_some();
            return Ok((
                issue_detail_response_from_record(
                    &issue,
                    viewer_can_manage,
                    viewer_can_comment,
                    actor_id,
                    &self.base_path,
                ),
                ctx,
            ));
        } else if request.owner_name != "pilot"
            || request.project_name != "yona"
            || request.issue_number != 1
        {
            return Err(ConnectError::not_found("pilot issue not found"));
        }

        Ok((pilot_issue_response("open"), ctx))
    }

    async fn update_issue_state(
        &self,
        ctx: Context,
        request: OwnedView<UpdateIssueStateRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;

        if request.issue_number <= 0 || !matches!(request.state, "open" | "closed") {
            return Err(ConnectError::invalid_argument(
                "invalid pilot issue state request",
            ));
        }

        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;

        if let PilotBackend::Repository(repository) = &self.backend {
            let actor = require_authenticated_user(repository, session.user_id).await?;
            let authorization = require_project_read(
                repository,
                request.owner_name,
                request.project_name,
                session.user_id,
            )
            .await?;
            let existing = repository
                .read_issue_detail(
                    request.owner_name,
                    request.project_name,
                    request.issue_number,
                )
                .await
                .map_err(internal_error)?
                .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
            if !issue_can_mutate(&authorization, &existing, &actor) {
                return Err(ConnectError::permission_denied(
                    "issue state update is not allowed",
                ));
            }
            let issue = repository
                .update_issue_state(
                    request.owner_name,
                    request.project_name,
                    request.issue_number,
                    request.state,
                )
                .await
                .map_err(internal_error)?;

            return issue
                .map(|issue| {
                    (
                        issue_detail_response_from_record(
                            &issue,
                            true,
                            true,
                            session.user_id,
                            &self.base_path,
                        ),
                        ctx,
                    )
                })
                .ok_or_else(|| ConnectError::not_found("pilot issue not found"));
        }

        if request.owner_name != "pilot"
            || request.project_name != "yona"
            || request.issue_number != 1
        {
            return Err(ConnectError::not_found("pilot issue not found"));
        }

        Ok((pilot_issue_response(request.state), ctx))
    }

    async fn create_issue(
        &self,
        ctx: Context,
        request: OwnedView<CreateIssueRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        if request.title.trim().is_empty() {
            return Err(ConnectError::invalid_argument("issue title is required"));
        }
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        let issue = repository
            .create_issue(persistence::CreateIssueInput {
                actor_display_name: actor.display_name.clone(),
                actor_id: actor.id,
                actor_login_id: actor.login_id.clone(),
                owner_name: request.owner_name.to_string(),
                project_name: request.project_name.to_string(),
                values: issue_mutation_input_from_create(&request),
            })
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        Ok((
            issue_detail_response_from_record(&issue, true, true, session.user_id, &self.base_path),
            ctx,
        ))
    }

    async fn update_issue(
        &self,
        ctx: Context,
        request: OwnedView<UpdateIssueRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        if request.issue_number <= 0 || request.title.trim().is_empty() {
            return Err(ConnectError::invalid_argument(
                "invalid issue update request",
            ));
        }
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        let existing = repository
            .read_issue_detail(
                request.owner_name,
                request.project_name,
                request.issue_number,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        if !issue_can_mutate(&authorization, &existing, &actor) {
            return Err(ConnectError::permission_denied(
                "issue update is not allowed",
            ));
        }
        let issue = repository
            .update_issue(persistence::UpdateIssueInput {
                actor_login_id: actor.login_id,
                issue_number: request.issue_number,
                owner_name: request.owner_name.to_string(),
                project_name: request.project_name.to_string(),
                values: issue_mutation_input_from_update(&request),
            })
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        Ok((
            issue_detail_response_from_record(&issue, true, true, session.user_id, &self.base_path),
            ctx,
        ))
    }

    async fn delete_issue(
        &self,
        ctx: Context,
        request: OwnedView<DeleteIssueRequestView<'static>>,
    ) -> Result<(DeleteIssueResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        let existing = repository
            .read_issue_detail(
                request.owner_name,
                request.project_name,
                request.issue_number,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        if !issue_can_mutate(&authorization, &existing, &actor) {
            return Err(ConnectError::permission_denied(
                "issue delete is not allowed",
            ));
        }
        if !repository
            .delete_issue(
                request.owner_name,
                request.project_name,
                request.issue_number,
            )
            .await
            .map_err(internal_error)?
        {
            return Err(ConnectError::not_found("pilot issue not found"));
        }
        Ok((
            DeleteIssueResponse {
                issue_number: request.issue_number,
                owner_name: request.owner_name.to_string(),
                project_name: request.project_name.to_string(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn create_issue_comment(
        &self,
        ctx: Context,
        request: OwnedView<CreateIssueCommentRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        if request.issue_number <= 0 || request.contents_markdown.trim().is_empty() {
            return Err(ConnectError::invalid_argument(
                "invalid issue comment request",
            ));
        }
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        let issue = repository
            .create_issue_comment(persistence::CreateIssueCommentInput {
                actor_display_name: actor.display_name.clone(),
                actor_id: actor.id,
                actor_login_id: actor.login_id,
                attachment_ids: request.attachment_ids.to_vec(),
                contents_markdown: request.contents_markdown.to_string(),
                issue_number: request.issue_number,
                owner_name: request.owner_name.to_string(),
                project_name: request.project_name.to_string(),
            })
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        Ok((
            issue_detail_response_from_record(
                &issue,
                false,
                true,
                session.user_id,
                &self.base_path,
            ),
            ctx,
        ))
    }

    async fn update_issue_comment(
        &self,
        ctx: Context,
        request: OwnedView<UpdateIssueCommentRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        if request.issue_number <= 0 || request.comment_id <= 0 {
            return Err(ConnectError::invalid_argument(
                "invalid issue comment request",
            ));
        }
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        let existing = repository
            .read_issue_detail(
                request.owner_name,
                request.project_name,
                request.issue_number,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        let comment_author = existing
            .comments
            .iter()
            .find(|comment| comment.id == request.comment_id)
            .and_then(|comment| comment.author_id);
        if comment_author != Some(actor.id) && !issue_can_mutate(&authorization, &existing, &actor)
        {
            return Err(ConnectError::permission_denied(
                "issue comment update is not allowed",
            ));
        }
        let issue = repository
            .update_issue_comment(persistence::UpdateIssueCommentInput {
                attachment_ids: request.attachment_ids.to_vec(),
                comment_id: request.comment_id,
                contents_markdown: request.contents_markdown.to_string(),
                issue_number: request.issue_number,
                owner_name: request.owner_name.to_string(),
                project_name: request.project_name.to_string(),
            })
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        Ok((
            issue_detail_response_from_record(&issue, true, true, session.user_id, &self.base_path),
            ctx,
        ))
    }

    async fn delete_issue_comment(
        &self,
        ctx: Context,
        request: OwnedView<DeleteIssueCommentRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        let existing = repository
            .read_issue_detail(
                request.owner_name,
                request.project_name,
                request.issue_number,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        let comment_author = existing
            .comments
            .iter()
            .find(|comment| comment.id == request.comment_id)
            .and_then(|comment| comment.author_id);
        if comment_author != Some(actor.id) && !issue_can_mutate(&authorization, &existing, &actor)
        {
            return Err(ConnectError::permission_denied(
                "issue comment delete is not allowed",
            ));
        }
        let issue = repository
            .delete_issue_comment(
                request.owner_name,
                request.project_name,
                request.issue_number,
                request.comment_id,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        Ok((
            issue_detail_response_from_record(&issue, true, true, session.user_id, &self.base_path),
            ctx,
        ))
    }

    async fn list_issue_timeline(
        &self,
        ctx: Context,
        request: OwnedView<ListIssueTimelineRequestView<'static>>,
    ) -> Result<(ListIssueTimelineResponse, Context), ConnectError> {
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        let actor_id = session.as_ref().and_then(|session| session.user_id);
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            actor_id,
        )
        .await?;
        let issue = repository
            .read_issue_detail(
                request.owner_name,
                request.project_name,
                request.issue_number,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        let actor = match actor_id {
            Some(user_id) => repository
                .find_user_by_id(user_id)
                .await
                .map_err(internal_error)?,
            None => None,
        };
        let can_manage = actor
            .as_ref()
            .is_some_and(|actor| issue_can_mutate(&authorization, &issue, actor));
        Ok((
            ListIssueTimelineResponse {
                items: issue
                    .timeline
                    .iter()
                    .map(|item| {
                        issue_timeline_item_from_record(item, can_manage, actor_id, &self.base_path)
                    })
                    .collect(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn watch_issue(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        self.issue_participation(ctx, request, "watch").await
    }

    async fn unwatch_issue(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        self.issue_participation(ctx, request, "unwatch").await
    }

    async fn vote_issue(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        self.issue_participation(ctx, request, "vote").await
    }

    async fn unvote_issue(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        self.issue_participation(ctx, request, "unvote").await
    }

    async fn assign_issue(
        &self,
        ctx: Context,
        request: OwnedView<AssignIssueRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        let existing = repository
            .read_issue_detail(
                request.owner_name,
                request.project_name,
                request.issue_number,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        if !issue_can_mutate(&authorization, &existing, &actor) {
            return Err(ConnectError::permission_denied(
                "issue assign is not allowed",
            ));
        }
        let issue = repository
            .assign_issue(
                request.owner_name,
                request.project_name,
                request.issue_number,
                Some(request.assignee_login_id).filter(|value| !value.trim().is_empty()),
                &actor.login_id,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        Ok((
            issue_detail_response_from_record(&issue, true, true, session.user_id, &self.base_path),
            ctx,
        ))
    }

    async fn unassign_issue(
        &self,
        ctx: Context,
        request: OwnedView<IssueParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        let existing = repository
            .read_issue_detail(
                request.owner_name,
                request.project_name,
                request.issue_number,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        if !issue_can_mutate(&authorization, &existing, &actor) {
            return Err(ConnectError::permission_denied(
                "issue assign is not allowed",
            ));
        }
        let issue = repository
            .assign_issue(
                request.owner_name,
                request.project_name,
                request.issue_number,
                None,
                &actor.login_id,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
        Ok((
            issue_detail_response_from_record(&issue, true, true, session.user_id, &self.base_path),
            ctx,
        ))
    }

    async fn mass_update_issues(
        &self,
        ctx: Context,
        request: OwnedView<MassUpdateIssuesRequestView<'static>>,
    ) -> Result<(MassUpdateIssuesResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        for issue_number in request.issue_numbers.iter().copied() {
            let issue = repository
                .read_issue_detail(request.owner_name, request.project_name, issue_number)
                .await
                .map_err(internal_error)?
                .ok_or_else(|| ConnectError::not_found("pilot issue not found"))?;
            if !issue_can_mutate(&authorization, &issue, &actor) {
                return Err(ConnectError::permission_denied(
                    "issue mass update is not allowed",
                ));
            }
        }
        let items = repository
            .mass_update_issues(
                persistence::MassUpdateIssuesInput {
                    add_label_ids: request.add_label_ids.to_vec(),
                    assignee_login_id: (!request.assignee_login_id.trim().is_empty())
                        .then(|| request.assignee_login_id.trim().to_string()),
                    assignee_update: request.assignee_update,
                    issue_numbers: request.issue_numbers.to_vec(),
                    milestone_id: (request.milestone_id > 0).then_some(request.milestone_id),
                    milestone_update: request.milestone_update,
                    owner_name: request.owner_name.to_string(),
                    project_name: request.project_name.to_string(),
                    remove_label_ids: request.remove_label_ids.to_vec(),
                    state: (!request.state.trim().is_empty())
                        .then(|| request.state.trim().to_string()),
                },
                &actor.login_id,
            )
            .await
            .map_err(internal_error)?
            .into_iter()
            .map(|issue| {
                issue_detail_response_from_record(
                    &issue,
                    true,
                    true,
                    session.user_id,
                    &self.base_path,
                )
            })
            .collect();
        Ok((
            MassUpdateIssuesResponse {
                items,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn list_project_labels(
        &self,
        ctx: Context,
        request: OwnedView<ListProjectLabelsRequestView<'static>>,
    ) -> Result<(ListProjectLabelsResponse, Context), ConnectError> {
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.as_ref().and_then(|session| session.user_id),
        )
        .await?;
        let labels = repository
            .list_project_labels(request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?
            .iter()
            .map(issue_label_from_record)
            .collect();
        Ok((
            ListProjectLabelsResponse {
                labels,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn list_project_label_categories(
        &self,
        ctx: Context,
        request: OwnedView<ListProjectLabelsRequestView<'static>>,
    ) -> Result<(ListProjectLabelCategoriesResponse, Context), ConnectError> {
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue label requires repository backend",
            ));
        };
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.as_ref().and_then(|session| session.user_id),
        )
        .await?;
        let categories = repository
            .list_project_label_categories(request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?
            .iter()
            .map(issue_label_category_from_record)
            .collect();
        Ok((
            ListProjectLabelCategoriesResponse {
                categories,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn create_project_label(
        &self,
        ctx: Context,
        request: OwnedView<CreateProjectLabelRequestView<'static>>,
    ) -> Result<(ProjectLabelMutationResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue label requires repository backend",
            ));
        };
        require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "issue label create is not allowed",
            ));
        }
        let color = normalize_issue_label_color(request.label_color)?;
        let Some((label, created)) = repository
            .create_project_label(persistence::CreateProjectLabelInput {
                category_is_exclusive: request.category_is_exclusive,
                category_name: request.category_name.trim().to_string(),
                label_color: color,
                label_name: request.label_name.trim().to_string(),
                owner_name: request.owner_name.to_string(),
                project_name: request.project_name.to_string(),
            })
            .await
            .map_err(internal_error)?
        else {
            return Err(ConnectError::not_found("project not found"));
        };
        Ok((
            ProjectLabelMutationResponse {
                created,
                label: Some(issue_label_from_record(&label)).into(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn update_project_label(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectLabelRequestView<'static>>,
    ) -> Result<(ProjectLabelMutationResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue label requires repository backend",
            ));
        };
        require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "issue label update is not allowed",
            ));
        }
        let color = normalize_issue_label_color(request.label_color)?;
        let Some(label) = repository
            .update_project_label(persistence::UpdateProjectLabelInput {
                category_id: request.category_id,
                label_color: color,
                label_id: request.label_id,
                label_name: request.label_name.trim().to_string(),
                owner_name: request.owner_name.to_string(),
                project_name: request.project_name.to_string(),
            })
            .await
            .map_err(|error| ConnectError::invalid_argument(error.to_string()))?
        else {
            return Err(ConnectError::not_found("issue label not found"));
        };
        Ok((
            ProjectLabelMutationResponse {
                created: false,
                label: Some(issue_label_from_record(&label)).into(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn delete_project_label(
        &self,
        ctx: Context,
        request: OwnedView<DeleteProjectLabelRequestView<'static>>,
    ) -> Result<(ProjectLabelDeleteResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue label requires repository backend",
            ));
        };
        require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "issue label delete is not allowed",
            ));
        }
        let ok = repository
            .delete_project_label(request.owner_name, request.project_name, request.label_id)
            .await
            .map_err(internal_error)?;
        if !ok {
            return Err(ConnectError::not_found("issue label not found"));
        }
        Ok((
            ProjectLabelDeleteResponse {
                ok,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn create_project_label_category(
        &self,
        ctx: Context,
        request: OwnedView<CreateProjectLabelCategoryRequestView<'static>>,
    ) -> Result<(ProjectLabelCategoryMutationResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue label requires repository backend",
            ));
        };
        require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "issue label category create is not allowed",
            ));
        }
        let Some((category, created)) = repository
            .create_project_label_category(persistence::CreateProjectLabelCategoryInput {
                category_is_exclusive: request.category_is_exclusive,
                category_name: request.category_name.trim().to_string(),
                owner_name: request.owner_name.to_string(),
                project_name: request.project_name.to_string(),
            })
            .await
            .map_err(internal_error)?
        else {
            return Err(ConnectError::not_found("project not found"));
        };
        Ok((
            ProjectLabelCategoryMutationResponse {
                category: Some(issue_label_category_from_record(&category)).into(),
                created,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn update_project_label_category(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectLabelCategoryRequestView<'static>>,
    ) -> Result<(ProjectLabelCategoryMutationResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue label requires repository backend",
            ));
        };
        require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "issue label category update is not allowed",
            ));
        }
        let Some(category) = repository
            .update_project_label_category(persistence::UpdateProjectLabelCategoryInput {
                category_id: request.category_id,
                category_is_exclusive: request.category_is_exclusive,
                category_name: request.category_name.trim().to_string(),
                owner_name: request.owner_name.to_string(),
                project_name: request.project_name.to_string(),
            })
            .await
            .map_err(|error| ConnectError::invalid_argument(error.to_string()))?
        else {
            return Err(ConnectError::not_found("issue label category not found"));
        };
        Ok((
            ProjectLabelCategoryMutationResponse {
                category: Some(issue_label_category_from_record(&category)).into(),
                created: false,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn delete_project_label_category(
        &self,
        ctx: Context,
        request: OwnedView<DeleteProjectLabelCategoryRequestView<'static>>,
    ) -> Result<(ProjectLabelDeleteResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue label requires repository backend",
            ));
        };
        require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "issue label category delete is not allowed",
            ));
        }
        let ok = repository
            .delete_project_label_category(
                request.owner_name,
                request.project_name,
                request.category_id,
            )
            .await
            .map_err(internal_error)?;
        if !ok {
            return Err(ConnectError::not_found("issue label category not found"));
        }
        Ok((
            ProjectLabelDeleteResponse {
                ok,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn list_project_milestones(
        &self,
        ctx: Context,
        request: OwnedView<ListProjectMilestonesRequestView<'static>>,
    ) -> Result<(ListProjectMilestonesResponse, Context), ConnectError> {
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.as_ref().and_then(|session| session.user_id),
        )
        .await?;
        let milestones = repository
            .list_project_milestones(
                request.owner_name,
                request.project_name,
                milestone_list_filter_from_request(&request),
            )
            .await
            .map_err(internal_error)?
            .iter()
            .map(|record| issue_milestone_from_record(record, &self.base_path))
            .collect();
        Ok((
            ListProjectMilestonesResponse {
                milestones,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn read_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectMilestoneRequestView<'static>>,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "milestone requires repository backend",
            ));
        };
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.as_ref().and_then(|session| session.user_id),
        )
        .await?;
        let viewer_can_update = project_update_allowed(&authorization).unwrap_or(false);
        let milestone = repository
            .read_project_milestone(
                request.owner_name,
                request.project_name,
                request.milestone_id,
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("milestone not found"))?;
        let mut milestone = issue_milestone_from_record(&milestone, &self.base_path);
        milestone.viewer_can_update = viewer_can_update;
        milestone.viewer_can_delete = viewer_can_update;
        Ok((
            ProjectMilestoneMutationResponse {
                milestone: Some(milestone).into(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn create_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<CreateProjectMilestoneRequestView<'static>>,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "milestone requires repository backend",
            ));
        };
        require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "milestone create is not allowed",
            ));
        }
        let input = milestone_mutation_input(
            request.owner_name,
            request.project_name,
            request.title,
            request.contents_markdown,
            request.due_date,
            request.state,
            &request.attachment_ids,
        )?;
        if repository
            .project_milestone_title_exists(
                request.owner_name,
                request.project_name,
                &input.title,
                None,
            )
            .await
            .map_err(internal_error)?
        {
            return Err(ConnectError::invalid_argument(
                "milestone title is duplicated",
            ));
        }
        let milestone = repository
            .create_project_milestone(input)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let mut milestone = issue_milestone_from_record(&milestone, &self.base_path);
        milestone.viewer_can_update = true;
        milestone.viewer_can_delete = true;
        Ok((
            ProjectMilestoneMutationResponse {
                milestone: Some(milestone).into(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn update_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectMilestoneRequestView<'static>>,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "milestone requires repository backend",
            ));
        };
        require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "milestone update is not allowed",
            ));
        }
        let input = milestone_mutation_input(
            request.owner_name,
            request.project_name,
            request.title,
            request.contents_markdown,
            request.due_date,
            request.state,
            &request.attachment_ids,
        )?;
        if repository
            .project_milestone_title_exists(
                request.owner_name,
                request.project_name,
                &input.title,
                Some(request.milestone_id),
            )
            .await
            .map_err(internal_error)?
        {
            return Err(ConnectError::invalid_argument(
                "milestone title is duplicated",
            ));
        }
        let milestone = repository
            .update_project_milestone(persistence::UpdateMilestoneInput {
                milestone_id: request.milestone_id,
                values: input,
            })
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("milestone not found"))?;
        let mut milestone = issue_milestone_from_record(&milestone, &self.base_path);
        milestone.viewer_can_update = true;
        milestone.viewer_can_delete = true;
        Ok((
            ProjectMilestoneMutationResponse {
                milestone: Some(milestone).into(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn delete_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<DeleteProjectMilestoneRequestView<'static>>,
    ) -> Result<(ProjectMilestoneDeleteResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "milestone requires repository backend",
            ));
        };
        require_authenticated_user(repository, session.user_id).await?;
        let authorization = require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            session.user_id,
        )
        .await?;
        if !project_update_allowed(&authorization)? {
            return Err(ConnectError::permission_denied(
                "milestone delete is not allowed",
            ));
        }
        let ok = repository
            .delete_project_milestone(
                request.owner_name,
                request.project_name,
                request.milestone_id,
            )
            .await
            .map_err(internal_error)?;
        if !ok {
            return Err(ConnectError::not_found("milestone not found"));
        }
        Ok((
            ProjectMilestoneDeleteResponse {
                ok,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn open_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<MilestoneStateMutationRequestView<'static>>,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        self.set_project_milestone_state(ctx, request, "open").await
    }

    async fn close_project_milestone(
        &self,
        ctx: Context,
        request: OwnedView<MilestoneStateMutationRequestView<'static>>,
    ) -> Result<(ProjectMilestoneMutationResponse, Context), ConnectError> {
        self.set_project_milestone_state(ctx, request, "closed")
            .await
    }

    async fn render_markdown(
        &self,
        ctx: Context,
        request: OwnedView<RenderMarkdownRequestView<'static>>,
    ) -> Result<(RenderMarkdownResponse, Context), ConnectError> {
        if let PilotBackend::Repository(repository) = &self.backend {
            let session = self.session_manager.read_session_from_headers(&ctx.headers);
            require_project_read(
                repository,
                request.owner_name,
                request.project_name,
                session.as_ref().and_then(|session| session.user_id),
            )
            .await?;
        }
        Ok((
            RenderMarkdownResponse {
                html: render_markdown_html(request.markdown),
                ..Default::default()
            },
            ctx,
        ))
    }
}

fn pilot_issue_response(state: &str) -> ReadIssueDetailResponse {
    ReadIssueDetailResponse {
        owner_name: "pilot".to_string(),
        project_name: "yona".to_string(),
        issue_number: 1,
        title: "Pilot issue".to_string(),
        state: state.to_string(),
        ..Default::default()
    }
}

fn project_issue_list_item_to_proto(
    item: persistence::ProjectIssueListItemRecord,
) -> ProjectIssueListItem {
    ProjectIssueListItem {
        assignee_label: item.assignee_label,
        author_label: item.author_label,
        comment_count: item.comment_count,
        issue_number: item.issue_number,
        labels: item.labels.iter().map(issue_label_from_record).collect(),
        milestone_id: item.milestone_id.unwrap_or_default(),
        milestone_title: item.milestone_title,
        state: item.state,
        title: item.title,
        updated_label: item.updated_label,
        voter_count: item.voter_count,
        watcher_count: item.watcher_count,
        ..Default::default()
    }
}

async fn serve_filesystem_asset(
    asset_root: PathBuf,
    requested_path: &str,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    let Some(relative_path) = sanitize_relative_path(requested_path) else {
        return (axum::http::StatusCode::NOT_FOUND, "not found").into_response();
    };
    let file_path = asset_root.join("assets").join(relative_path);
    let Ok(bytes) = tokio::fs::read(&file_path).await else {
        return serve_index_html(asset_root, browser_runtime).await;
    };

    let mime = mime_guess::from_path(&file_path).first_or_octet_stream();
    ([(axum::http::header::CONTENT_TYPE, mime.as_ref())], bytes).into_response()
}

async fn serve_embedded_asset(
    requested_path: &str,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    let Some(relative_path) = sanitize_relative_path(requested_path) else {
        return (axum::http::StatusCode::NOT_FOUND, "not found").into_response();
    };
    let normalized = relative_path.to_string_lossy().replace('\\', "/");
    let Some(bytes) = embedded_assets::get(&format!("assets/{normalized}")) else {
        return serve_embedded_index_html(browser_runtime).await;
    };

    let mime = mime_guess::from_path(&normalized).first_or_octet_stream();
    (
        [(axum::http::header::CONTENT_TYPE, mime.as_ref())],
        bytes.to_vec(),
    )
        .into_response()
}

async fn serve_filesystem_fallback(
    asset_root: PathBuf,
    method: Method,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    if method != Method::GET && method != Method::HEAD {
        return axum::http::StatusCode::NOT_FOUND.into_response();
    }

    serve_index_html(asset_root, browser_runtime).await
}

async fn serve_embedded_fallback(
    method: Method,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    if method != Method::GET && method != Method::HEAD {
        return axum::http::StatusCode::NOT_FOUND.into_response();
    }

    serve_embedded_index_html(browser_runtime).await
}

async fn serve_index_html(asset_root: PathBuf, browser_runtime: BrowserRuntimeConfig) -> Response {
    let index_path = asset_root.join("index.html");
    let Ok(index_html) = tokio::fs::read_to_string(index_path).await else {
        return (axum::http::StatusCode::NOT_FOUND, "not found").into_response();
    };

    let runtime_json = serde_json::to_string(&browser_runtime).expect("runtime config json");
    let runtime_script = format!(
        "<script>window.__YONA_RUNTIME_CONFIG__ = {};</script>",
        runtime_json
    );
    let injected = if index_html.contains("</head>") {
        index_html.replacen("</head>", &format!("{runtime_script}</head>"), 1)
    } else if index_html.contains("<body>") {
        index_html.replacen("<body>", &format!("<body>{runtime_script}"), 1)
    } else {
        format!("{runtime_script}{index_html}")
    };

    (
        [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
        injected,
    )
        .into_response()
}

async fn serve_embedded_index_html(browser_runtime: BrowserRuntimeConfig) -> Response {
    let Some(index_bytes) = embedded_assets::get("index.html") else {
        return (axum::http::StatusCode::NOT_FOUND, "not found").into_response();
    };
    let Ok(index_html) = String::from_utf8(index_bytes.to_vec()) else {
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            "invalid embedded asset",
        )
            .into_response();
    };

    let runtime_json = serde_json::to_string(&browser_runtime).expect("runtime config json");
    let runtime_script = format!(
        "<script>window.__YONA_RUNTIME_CONFIG__ = {};</script>",
        runtime_json
    );
    let injected = if index_html.contains("</head>") {
        index_html.replacen("</head>", &format!("{runtime_script}</head>"), 1)
    } else if index_html.contains("<body>") {
        index_html.replacen("<body>", &format!("<body>{runtime_script}"), 1)
    } else {
        format!("{runtime_script}{index_html}")
    };

    (
        [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
        injected,
    )
        .into_response()
}

fn sanitize_relative_path(requested_path: &str) -> Option<PathBuf> {
    let trimmed = requested_path.trim_matches('/');
    if trimmed.is_empty() {
        return None;
    }

    let mut path = PathBuf::new();
    for component in std::path::Path::new(trimmed).components() {
        match component {
            std::path::Component::Normal(value) => path.push(value),
            _ => return None,
        }
    }

    Some(path)
}
