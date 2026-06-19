mod assets;
mod excel_export;
mod mailbox;
mod markdown;
mod notification_mail;
pub mod persistence;
mod routes;

pub(crate) use excel_export::{
    direct_issue_excel_export, direct_issue_excel_route_from_request, direct_review_excel_export,
    direct_review_excel_route_from_request,
};
pub(crate) use markdown::{
    issue_reference_metadata_from_resolved, markdown_issue_numbers,
    markdown_issue_references_for_project, markdown_mention_references, markdown_mention_tokens,
    mention_reference_metadata_from_resolved, rest_issue_reference_metadata_from_resolved,
    rest_mention_reference_metadata_from_resolved, rewrite_code_browser_markdown_image_links,
    rewrite_project_readme_markdown_links, MarkdownIssueReference, MarkdownMentionReference,
    RestIssueReferenceMetadata, RestMentionReferenceMetadata,
};
pub use notification_mail::{
    deliver_due_notification_mails, deliver_due_notification_mails_with_config,
    deliver_notification_mail_scheduler_tick, deliver_notification_mail_scheduler_tick_with_config,
    notification_mail_add_noreferrer_to_external_links,
    notification_mail_apply_legacy_html_postprocessing,
    notification_mail_scheduler_config_from_env, notification_mail_scheduler_config_from_startup,
    spawn_notification_mail_scheduler, NotificationMailDeliveryConfig,
    NotificationMailSchedulerConfig,
};
pub(crate) use routes::{
    accepts_legacy_json, base_path_href, delete_project_repository_storage,
    detect_upload_mime_type, direct_toggle_workspace_notification, dispatch_issue_webhooks,
    dispatch_pull_request_webhooks, form_bool, form_value, gravatar_url, headers_with_form_csrf,
    issue_can_mutate, issue_detail_response_from_access, issue_label_css,
    legacy_content_disposition_filename, legacy_content_update_body_from_value,
    legacy_external_api_auth_error_response, legacy_external_api_token_from_headers,
    legacy_external_assignable_users_result, legacy_external_attachment_result,
    legacy_external_authenticated_user_id, legacy_external_date_string, legacy_external_label_id,
    legacy_external_parse_datetime, legacy_external_post_author,
    legacy_external_temporary_upload_file_ids, legacy_issue_comment_create_body_from_value,
    legacy_issue_detect_change_body_from_value, legacy_issue_update_body_from_value,
    legacy_json_find_value, normalize_issue_label_color, posting_can_create, posting_can_update,
    project_webhook_type_label, read_issue_access, read_posting_access,
    read_posting_comment_create_access, record_project_webhook_delivery,
    resolve_issue_reference_search_project, rest_accept_pull_request,
    rest_commit_thread_from_record, rest_delete_project_member,
    rest_delete_pull_request_source_branch,
    rest_issue_detail_response_from_access_with_repository_issue_references, rest_list_user_issues,
    rest_project_issue_filter_from_query, rest_project_menu_settings,
    rest_read_direct_issue_form_options, rest_restore_pull_request_source_branch,
    rest_review_thread_filter, rest_toggle_project_watch,
    rest_update_commit_discussion_thread_state, rest_update_pull_request_thread_state,
    uploaded_file_path, RestProjectIssuesQuery, RestReviewThread, RestReviewThreadListQuery,
};
pub mod runtime_config;
mod server_config;
pub mod session;
mod smart_http;
mod svn_protocol;

use axum::extract::{Multipart, Query, RawQuery, Request};
use axum::http::HeaderMap;
use axum::middleware::{from_fn, Next};
use axum::response::{Html, IntoResponse, Redirect, Response};
use axum::routing::{delete, get, post, put};
use axum::{extract::Path, http::Method};
use axum::{Json, Router};
use base64::Engine as _;
use bcrypt::{hash, verify, DEFAULT_COST};
use buffa::view::{MessageView, OwnedView};
use http::header::{CONTENT_RANGE, REFERER, SET_COOKIE};
use http::{HeaderValue, StatusCode};
use runtime_config::normalize_base_path;
use sea_orm::entity::prelude::DateTime;
use serde::{Deserialize, Deserializer, Serialize};
use session::{SessionConfig, SessionManager};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{atomic::AtomicBool, Mutex, OnceLock},
    time::SystemTime,
    vec,
};

use assets::{
    apply_asset_routes, mount_base_path, serve_embedded_fallback, serve_filesystem_fallback,
};
use generated::yona::pilot::v1::*;
pub use mailbox::{
    mailbox_polling_config_from_env, mailbox_polling_config_from_startup,
    poll_mailbox_scheduler_tick, process_mailbox_parsed_message, process_mailbox_raw_message,
    spawn_mailbox_polling_scheduler, MailboxPollingConfig,
};
use persistence::PilotRepository;
#[cfg(test)]
pub(crate) use server_config::split_configured_command;
pub(crate) use server_config::{
    configured_command_parts, parse_legacy_bool, parse_legacy_duration_ms,
};
pub(crate) use smart_http::{
    direct_smart_http_request, route_from_path as smart_http_route_from_path,
    smart_http_authorization, smart_http_basic_challenge_response,
    smart_http_principal_from_headers, SmartHttpAccessFailure, SmartHttpPermission,
};
use yona_rust_domain::{
    authorize_project_access, can_create_organization_project, can_create_personal_project,
    can_request_project_enrollment, can_update_organization, is_valid_organization_name,
    is_valid_project_name, normalize_default_landing_path, ProjectAccessFacts, ProjectOperation,
    ProjectScope, DEFAULT_LANDING_FALLBACK_PATH,
};
use yona_rust_integrations::{deliver, OutboundMail};
use yona_rust_vcs::{CodeFileRecord, ProjectHistoryCommitRecord, VcsError};

pub use yona_rust_pilot_protocol as generated;

pub mod embedded_assets {
    include!(concat!(env!("OUT_DIR"), "/_embedded_assets.rs"));
}

static SITE_UPDATE_NOTIFICATION_WATCHED: AtomicBool = AtomicBool::new(true);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ErrorCode {
    InvalidArgument,
    NotFound,
    AlreadyExists,
    Unauthenticated,
    PermissionDenied,
    Unimplemented,
    Internal,
}

impl ErrorCode {
    fn http_status(self) -> StatusCode {
        match self {
            Self::InvalidArgument => StatusCode::BAD_REQUEST,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::AlreadyExists => StatusCode::CONFLICT,
            Self::Unauthenticated => StatusCode::UNAUTHORIZED,
            Self::PermissionDenied => StatusCode::FORBIDDEN,
            Self::Unimplemented => StatusCode::NOT_IMPLEMENTED,
            Self::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

#[derive(Clone, Debug)]
pub(crate) struct ConnectError {
    code: ErrorCode,
    message: Option<String>,
}

impl ConnectError {
    fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: Some(message.into()),
        }
    }

    fn invalid_argument(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::InvalidArgument, message)
    }

    fn not_found(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::NotFound, message)
    }

    fn already_exists(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::AlreadyExists, message)
    }

    fn unauthenticated(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Unauthenticated, message)
    }

    fn permission_denied(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::PermissionDenied, message)
    }

    fn unimplemented(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Unimplemented, message)
    }
}

impl std::fmt::Display for ConnectError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.message {
            Some(message) => formatter.write_str(message),
            None => write!(formatter, "{:?}", self.code),
        }
    }
}

impl std::error::Error for ConnectError {}

#[derive(Clone, Debug)]
pub(crate) struct Context {
    headers: HeaderMap,
    response_headers: HeaderMap,
}

impl Context {
    pub(crate) fn new(headers: HeaderMap) -> Self {
        Self {
            headers,
            response_headers: HeaderMap::new(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuntimeConfig {
    pub allow_anonymous_access: bool,
    pub base_path: String,
    pub public_origin: String,
}

impl Default for RuntimeConfig {
    fn default() -> Self {
        Self {
            allow_anonymous_access: true,
            base_path: String::new(),
            public_origin: String::new(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AppRuntimeConfig {
    pub auth_ui: AuthUiConfig,
    pub max_uploaded_file_size: usize,
    pub project_default_menus: Vec<String>,
    pub project_default_scope: String,
    pub session_timeout_seconds: Option<u64>,
    pub show_user_email: bool,
    pub site_name: String,
    pub site_update: SiteUpdateConfig,
    pub supported_languages: Vec<String>,
    pub translation_proxy: TranslationProxyConfig,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct AuthUiConfig {
    pub email_verification_enabled: bool,
    pub enabled_social_providers: Vec<String>,
    pub login_id_placeholder: String,
    pub password_placeholder: String,
    pub signup_require_confirm: bool,
    pub social_login_only: bool,
}

impl AuthUiConfig {
    fn from_startup(config: &runtime_config::StartupConfig) -> Self {
        Self {
            email_verification_enabled: config.auth_email_verification_enabled.unwrap_or(false),
            enabled_social_providers: auth_social_providers_from_option(
                config.auth_social_login_support.as_deref(),
            ),
            login_id_placeholder: trimmed_option(config.auth_login_id_placeholder.as_deref())
                .unwrap_or_default(),
            password_placeholder: trimmed_option(config.auth_password_placeholder.as_deref())
                .unwrap_or_default(),
            signup_require_confirm: config.auth_signup_require_confirm.unwrap_or(false),
            social_login_only: config.auth_social_login_only.unwrap_or(false),
        }
    }

    fn from_env() -> Self {
        Self {
            email_verification_enabled: configured_bool_env(
                &["YONA_AUTH_EMAIL_VERIFICATION_ENABLED"],
                false,
            ),
            enabled_social_providers: configured_auth_social_providers(),
            login_id_placeholder: configured_trimmed_string("YONA_AUTH_LOGIN_ID_PLACEHOLDER"),
            password_placeholder: configured_trimmed_string("YONA_AUTH_PASSWORD_PLACEHOLDER"),
            signup_require_confirm: configured_bool_env(
                &["YONA_AUTH_SIGNUP_REQUIRE_CONFIRM"],
                false,
            ),
            social_login_only: configured_bool_env(&["YONA_AUTH_SOCIAL_LOGIN_ONLY"], false),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SiteUpdateConfig {
    pub current_version: String,
    pub error: String,
    pub https_fetch_command: String,
    pub latest_version: String,
    pub metadata_file: String,
    pub metadata_url: String,
    pub release_url: String,
    pub version: String,
}

impl Default for SiteUpdateConfig {
    fn default() -> Self {
        Self {
            current_version: env!("CARGO_PKG_VERSION").to_string(),
            error: String::new(),
            https_fetch_command: String::new(),
            latest_version: String::new(),
            metadata_file: String::new(),
            metadata_url: String::new(),
            release_url: String::new(),
            version: String::new(),
        }
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct TranslationProxyConfig {
    pub api_url: String,
    pub header_key: String,
    pub header_value: String,
}

impl Default for AppRuntimeConfig {
    fn default() -> Self {
        Self {
            auth_ui: AuthUiConfig::default(),
            max_uploaded_file_size: LEGACY_DEFAULT_MAX_FILE_SIZE,
            project_default_menus: default_project_menu_keys(),
            project_default_scope: "public".to_string(),
            session_timeout_seconds: None,
            show_user_email: true,
            site_name: "Yona".to_string(),
            site_update: SiteUpdateConfig::default(),
            supported_languages: default_supported_languages(),
            translation_proxy: TranslationProxyConfig::default(),
        }
    }
}

impl AppRuntimeConfig {
    pub fn from_startup(config: &runtime_config::StartupConfig) -> Self {
        Self {
            auth_ui: AuthUiConfig::from_startup(config),
            max_uploaded_file_size: max_uploaded_file_size_from_option(config.max_file_size),
            project_default_menus: project_default_menus_from_option(
                config.project_default_menus.as_deref(),
            ),
            project_default_scope: project_default_scope_from_option(
                config.project_default_scope.as_deref(),
            ),
            session_timeout_seconds: config.session_timeout_seconds,
            show_user_email: config.show_user_email.unwrap_or(true),
            site_name: site_name_from_option(config.site_name.as_deref()),
            site_update: SiteUpdateConfig::from_startup(config),
            supported_languages: supported_languages_from_option(
                config.supported_languages.as_deref(),
            ),
            translation_proxy: TranslationProxyConfig::from_startup(config),
        }
    }

    fn from_env() -> Self {
        Self {
            auth_ui: AuthUiConfig::from_env(),
            max_uploaded_file_size: configured_max_uploaded_file_size(),
            project_default_menus: configured_project_default_menus(),
            project_default_scope: configured_project_default_scope(),
            session_timeout_seconds: configured_session_timeout_seconds(),
            show_user_email: configured_bool_env(
                &["YONA_SHOW_USER_EMAIL", "APPLICATION_SHOW_USER_EMAIL"],
                true,
            ),
            site_name: configured_site_name(),
            site_update: SiteUpdateConfig::from_env(),
            supported_languages: configured_supported_languages(),
            translation_proxy: TranslationProxyConfig::from_env(),
        }
    }
}

impl SiteUpdateConfig {
    fn from_startup(config: &runtime_config::StartupConfig) -> Self {
        let defaults = Self::default();
        Self {
            current_version: trimmed_option(config.update_current_version.as_deref())
                .unwrap_or(defaults.current_version),
            error: trimmed_option(config.update_error.as_deref()).unwrap_or_default(),
            https_fetch_command: trimmed_option(config.update_https_fetch_command.as_deref())
                .unwrap_or_default(),
            latest_version: trimmed_option(config.update_latest_version.as_deref())
                .unwrap_or_default(),
            metadata_file: trimmed_option(config.update_metadata_file.as_deref())
                .unwrap_or_default(),
            metadata_url: trimmed_option(config.update_metadata_url.as_deref()).unwrap_or_default(),
            release_url: trimmed_option(config.update_release_url.as_deref()).unwrap_or_default(),
            version: trimmed_option(config.update_version.as_deref()).unwrap_or_default(),
        }
    }

    fn from_env() -> Self {
        let defaults = Self::default();
        Self {
            current_version: configured_env_value(&["YONA_CURRENT_VERSION"])
                .unwrap_or(defaults.current_version),
            error: configured_env_value(&["YONA_UPDATE_ERROR"]).unwrap_or_default(),
            https_fetch_command: configured_env_value(&["YONA_UPDATE_HTTPS_FETCH_COMMAND"])
                .unwrap_or_default(),
            latest_version: configured_env_value(&["YONA_UPDATE_LATEST_VERSION"])
                .unwrap_or_default(),
            metadata_file: configured_env_value(&["YONA_UPDATE_METADATA_FILE"]).unwrap_or_default(),
            metadata_url: configured_env_value(&["YONA_UPDATE_METADATA_URL"]).unwrap_or_default(),
            release_url: configured_env_value(&["YONA_UPDATE_RELEASE_URL"]).unwrap_or_default(),
            version: configured_env_value(&["YONA_UPDATE_VERSION"]).unwrap_or_default(),
        }
    }
}

impl TranslationProxyConfig {
    fn from_startup(config: &runtime_config::StartupConfig) -> Self {
        Self {
            api_url: trimmed_option(config.translation_api.as_deref()).unwrap_or_default(),
            header_key: trimmed_option(config.translation_header_key.as_deref())
                .unwrap_or_default(),
            header_value: trimmed_option(config.translation_header_value.as_deref())
                .unwrap_or_default(),
        }
    }

    fn from_env() -> Self {
        Self {
            api_url: configured_env_value(&[
                "YONA_TRANSLATION_API",
                "APPLICATION_EXTRAS_TRANSLATION_API",
            ])
            .unwrap_or_default(),
            header_key: configured_env_value(&[
                "YONA_TRANSLATION_HEADER_KEY",
                "APPLICATION_EXTRAS_TRANSLATION_HEADER_KEY",
            ])
            .unwrap_or_default(),
            header_value: configured_env_value(&[
                "YONA_TRANSLATION_HEADER_VALUE",
                "APPLICATION_EXTRAS_TRANSLATION_HEADER_VALUE",
            ])
            .unwrap_or_default(),
        }
    }
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

pub fn create_router_with_repository_and_app_config(
    config: RuntimeConfig,
    repository: PilotRepository,
    app_config: AppRuntimeConfig,
) -> Router {
    build_router_with_app_config(
        config,
        PilotBackend::Repository(repository),
        AssetMode::None,
        app_config,
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

pub fn create_router_with_filesystem_assets_and_app_config(
    config: RuntimeConfig,
    asset_root: PathBuf,
    app_config: AppRuntimeConfig,
) -> Router {
    build_router_with_app_config(
        config,
        PilotBackend::Static,
        AssetMode::Filesystem(asset_root),
        app_config,
    )
}

pub fn create_router_with_embedded_assets(config: RuntimeConfig) -> Router {
    build_router(config, PilotBackend::Static, AssetMode::Embedded)
}

pub fn create_router_with_embedded_assets_and_app_config(
    config: RuntimeConfig,
    app_config: AppRuntimeConfig,
) -> Router {
    build_router_with_app_config(
        config,
        PilotBackend::Static,
        AssetMode::Embedded,
        app_config,
    )
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

pub fn create_router_with_repository_and_filesystem_assets_and_app_config(
    config: RuntimeConfig,
    repository: PilotRepository,
    asset_root: PathBuf,
    app_config: AppRuntimeConfig,
) -> Router {
    build_router_with_app_config(
        config,
        PilotBackend::Repository(repository),
        AssetMode::Filesystem(asset_root),
        app_config,
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

pub fn create_router_with_repository_and_embedded_assets_and_app_config(
    config: RuntimeConfig,
    repository: PilotRepository,
    app_config: AppRuntimeConfig,
) -> Router {
    build_router_with_app_config(
        config,
        PilotBackend::Repository(repository),
        AssetMode::Embedded,
        app_config,
    )
}

fn build_router(config: RuntimeConfig, backend: PilotBackend, assets: AssetMode) -> Router {
    build_router_with_app_config(config, backend, assets, AppRuntimeConfig::from_env())
}

fn build_router_with_app_config(
    config: RuntimeConfig,
    backend: PilotBackend,
    assets: AssetMode,
    app_config: AppRuntimeConfig,
) -> Router {
    let base_path = normalize_base_path(&config.base_path);
    let public_origin = default_public_origin(&config.public_origin);
    let allow_anonymous_access = config.allow_anonymous_access;
    let auth_ui = app_config.auth_ui;
    let max_uploaded_file_size = app_config.max_uploaded_file_size;
    let project_default_scope = app_config.project_default_scope;
    let project_default_menus = app_config.project_default_menus;
    let session_timeout_seconds = app_config.session_timeout_seconds;
    let show_user_email = app_config.show_user_email;
    let site_name = app_config.site_name;
    let site_update = app_config.site_update;
    let supported_languages = app_config.supported_languages;
    let translation_proxy = app_config.translation_proxy;
    let session_manager = SessionManager::new(SessionConfig {
        cookie_path: base_path.clone(),
        public_origin: public_origin.clone(),
        session_timeout_seconds,
    });
    let pilot_service = PilotServiceImpl {
        auth_ui: auth_ui.clone(),
        base_path: base_path.clone(),
        public_origin: public_origin.clone(),
        session_manager: session_manager.clone(),
        backend: backend.clone(),
        project_default_scope: project_default_scope.clone(),
    };
    let rest_auth_ui = auth_ui.clone();
    let route_backend = backend.clone();
    let browser_runtime = BrowserRuntimeConfig::from_base_path(
        &base_path,
        project_default_menus.clone(),
        project_default_scope.clone(),
        supported_languages.clone(),
        show_user_email,
    );
    let anonymous_gate_session_manager = session_manager.clone();
    let anonymous_gate_base_path = base_path.clone();
    let anonymous_gate_allow_anonymous_access = allow_anonymous_access;
    let rest_router =
        routes::rest_api_routes(pilot_service.clone(), site_update.clone(), rest_auth_ui);

    let mut base_router = routes::app_routes(
        session_manager.clone(),
        route_backend.clone(),
        assets.clone(),
        browser_runtime.clone(),
        base_path.clone(),
        public_origin.clone(),
        site_name.clone(),
        project_default_scope.clone(),
        translation_proxy.clone(),
        site_update.clone(),
        max_uploaded_file_size,
        rest_router,
    );

    base_router = apply_asset_routes(
        base_router,
        assets.clone(),
        browser_runtime.clone(),
        base_path.clone(),
        session_manager.clone(),
        route_backend.clone(),
        public_origin.clone(),
    );

    base_router = base_router.layer(from_fn(move |request: Request, next: Next| {
        let session_manager = anonymous_gate_session_manager.clone();
        let base_path = anonymous_gate_base_path.clone();
        let allow_anonymous_access = anonymous_gate_allow_anonymous_access;
        async move {
            anonymous_access_gate(
                request,
                next,
                session_manager,
                base_path,
                allow_anonymous_access,
            )
            .await
        }
    }));

    mount_base_path(base_router, assets, browser_runtime, base_path)
}

async fn anonymous_access_gate(
    request: Request,
    next: Next,
    session_manager: SessionManager,
    base_path: String,
    allow_anonymous_access: bool,
) -> Response {
    if allow_anonymous_access
        || anonymous_access_path_is_public(request.uri().path())
        || smart_http_route_from_path(request.uri().path(), &base_path).is_some()
        || svn_protocol::route_from_path(request.uri().path(), &base_path).is_some()
    {
        return next.run(request).await;
    }

    if session_manager
        .read_session_from_headers(request.headers())
        .and_then(|session| session.user_id)
        .is_some()
    {
        return next.run(request).await;
    }

    let method = request.method().clone();
    let path = request.uri().path().to_string();
    if path.starts_with("/api/") {
        return anonymous_access_rest_response();
    }
    if method == Method::GET || method == Method::HEAD {
        return anonymous_access_login_redirect(&base_path, &path);
    }

    anonymous_access_rest_response()
}

fn configured_session_timeout_seconds() -> Option<u64> {
    std::env::var("YONA_SESSION_TIMEOUT_SECONDS")
        .ok()
        .and_then(|value| value.trim().parse::<u64>().ok())
}

fn anonymous_access_path_is_public(path: &str) -> bool {
    path == "/api/auth/session"
        || path == "/api/v1/session"
        || path.starts_with("/api/v1/auth/")
        || path.starts_with("/assets/")
        || path == "/favicon.ico"
        || path == "/messages.js"
        || path == "/_init"
        || path == "/_UIKit"
        || path == "/login"
        || path.starts_with("/authenticate/")
        || path == "/user/sidebar"
        || path == "/users/loginform"
        || path == "/users/signupform"
        || path == "/forgot-password"
        || path == "/lostPassword"
        || path == "/reset-password"
        || path == "/resetPassword"
        || path.starts_with("/verify/")
}

fn anonymous_access_login_redirect(base_path: &str, path: &str) -> Response {
    let redirect_path = format!(
        "/users/loginform?redirectUrl={}",
        percent_encode_uri_component(path)
    );
    Redirect::to(&base_path_href(base_path, &redirect_path)).into_response()
}

fn anonymous_access_rest_response() -> Response {
    RestRouteError::from_connect_error(ConnectError::unauthenticated(LEGACY_LOGIN_REQUIRED_MESSAGE))
        .into_response()
}

pub(crate) async fn serve_filesystem_or_smart_http_fallback(
    request: Request,
    asset_root: PathBuf,
    browser_runtime: BrowserRuntimeConfig,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Response {
    let method = request.method().clone();
    if let Some(route) = direct_issue_excel_route_from_request(
        &method,
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_issue_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            session_manager,
            backend,
        )
        .await;
    }
    if let Some(route) = direct_review_excel_route_from_request(
        &method,
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_review_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            session_manager,
            backend,
        )
        .await;
    }
    if svn_protocol::route_from_path(request.uri().path(), &base_path).is_some() {
        return svn_protocol::direct_request(request, session_manager, backend, base_path).await;
    }
    if smart_http_route_from_path(request.uri().path(), &base_path).is_some() {
        return direct_smart_http_request(
            request,
            session_manager,
            backend,
            base_path,
            public_origin,
        )
        .await;
    }
    serve_filesystem_fallback(asset_root, method, browser_runtime).await
}

pub(crate) async fn serve_embedded_or_smart_http_fallback(
    request: Request,
    browser_runtime: BrowserRuntimeConfig,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Response {
    let method = request.method().clone();
    if let Some(route) = direct_issue_excel_route_from_request(
        &method,
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_issue_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            session_manager,
            backend,
        )
        .await;
    }
    if let Some(route) = direct_review_excel_route_from_request(
        &method,
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_review_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            session_manager,
            backend,
        )
        .await;
    }
    if svn_protocol::route_from_path(request.uri().path(), &base_path).is_some() {
        return svn_protocol::direct_request(request, session_manager, backend, base_path).await;
    }
    if smart_http_route_from_path(request.uri().path(), &base_path).is_some() {
        return direct_smart_http_request(
            request,
            session_manager,
            backend,
            base_path,
            public_origin,
        )
        .await;
    }
    serve_embedded_fallback(method, browser_runtime).await
}

pub(crate) async fn smart_http_or_not_found(
    request: Request,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Response {
    if let Some(route) = direct_issue_excel_route_from_request(
        request.method(),
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_issue_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            session_manager,
            backend,
        )
        .await;
    }
    if let Some(route) = direct_review_excel_route_from_request(
        request.method(),
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_review_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            session_manager,
            backend,
        )
        .await;
    }
    if svn_protocol::route_from_path(request.uri().path(), &base_path).is_some() {
        return svn_protocol::direct_request(request, session_manager, backend, base_path).await;
    }
    if smart_http_route_from_path(request.uri().path(), &base_path).is_some() {
        return direct_smart_http_request(
            request,
            session_manager,
            backend,
            base_path,
            public_origin,
        )
        .await;
    }
    StatusCode::NOT_FOUND.into_response()
}

pub(crate) async fn serve_frontend_page(
    assets: AssetMode,
    method: Method,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    match assets {
        AssetMode::Filesystem(asset_root) => {
            serve_filesystem_fallback(asset_root, method, browser_runtime).await
        }
        AssetMode::Embedded => serve_embedded_fallback(method, browser_runtime).await,
        AssetMode::None => StatusCode::NOT_FOUND.into_response(),
    }
}

fn percent_encode_uri_component(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        if uri_component_unescaped(byte) {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

fn uri_component_unescaped(byte: u8) -> bool {
    matches!(
        byte,
        b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'-'
            | b'_'
            | b'.'
            | b'!'
            | b'~'
            | b'*'
            | b'\''
            | b'('
            | b')'
    )
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
    configured_env_value(&["SMTP_FROM", "YONA_SMTP_FROM"])
        .or_else(smtp_sender_from_user_and_domain)
        .unwrap_or_else(|| "noreply@yona.local".to_string())
}

fn smtp_sender_from_user_and_domain() -> Option<String> {
    let user = configured_env_value(&["SMTP_USER", "YONA_SMTP_USER"])?;
    if user.contains('@') {
        return Some(user);
    }
    let domain = configured_env_value(&["SMTP_DOMAIN", "YONA_SMTP_DOMAIN"])
        .or_else(application_hostname_from_env)
        .unwrap_or_else(|| "localhost".to_string());
    Some(format!("{user}@{domain}"))
}

fn application_hostname_from_env() -> Option<String> {
    configured_env_value(&["YONA_APPLICATION_HOSTNAME", "APPLICATION_HOSTNAME"])
}

fn configured_site_name() -> String {
    let value = std::env::var("YONA_SITE_NAME").ok();
    site_name_from_option(value.as_deref())
}

fn site_name_from_option(value: Option<&str>) -> String {
    trimmed_option(value).unwrap_or_else(|| "Yona".to_string())
}

fn trimmed_option(value: Option<&str>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

pub(crate) fn configured_env_value(names: &[&str]) -> Option<String> {
    names.iter().find_map(|name| {
        std::env::var(name)
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    })
}

fn configured_trimmed_string(name: &str) -> String {
    let value = std::env::var(name).ok();
    trimmed_option(value.as_deref()).unwrap_or_default()
}

fn configured_auth_social_providers() -> Vec<String> {
    let value = std::env::var("YONA_AUTH_SOCIAL_LOGIN_SUPPORT").ok();
    auth_social_providers_from_csv(value.as_deref())
}

fn auth_social_providers_from_option(values: Option<&[String]>) -> Vec<String> {
    values
        .map(|values| values.join(","))
        .map(|value| auth_social_providers_from_csv(Some(&value)))
        .unwrap_or_default()
}

fn auth_social_providers_from_csv(value: Option<&str>) -> Vec<String> {
    value
        .unwrap_or_default()
        .split(',')
        .map(|provider| provider.trim().to_ascii_lowercase())
        .filter(|provider| !provider.is_empty())
        .collect()
}

fn configured_project_default_scope() -> String {
    let value = std::env::var("YONA_PROJECT_DEFAULT_SCOPE").ok();
    project_default_scope_from_option(value.as_deref())
}

fn project_default_scope_from_option(value: Option<&str>) -> String {
    value
        .map(normalize_identifier)
        .filter(|value| matches!(value.as_str(), "public" | "protected" | "private"))
        .unwrap_or_else(|| "public".to_string())
}

fn configured_project_default_menus() -> Vec<String> {
    let value = std::env::var("YONA_PROJECT_DEFAULT_MENUS").ok();
    project_default_menus_from_csv(value.as_deref())
}

fn project_default_menus_from_option(values: Option<&[String]>) -> Vec<String> {
    values
        .map(|values| values.join(","))
        .map(|value| project_default_menus_from_csv(Some(&value)))
        .unwrap_or_else(default_project_menu_keys)
}

fn project_default_menus_from_csv(value: Option<&str>) -> Vec<String> {
    let menus = value
        .unwrap_or_default()
        .split(',')
        .filter_map(normalized_project_default_menu_key)
        .collect::<Vec<_>>();
    (!menus.is_empty())
        .then_some(menus)
        .unwrap_or_else(default_project_menu_keys)
}

fn normalized_project_default_menu_key(value: &str) -> Option<String> {
    match normalize_project_default_menu_config_key(value).as_str() {
        "board" => Some("board".to_string()),
        "code" => Some("code".to_string()),
        "issue" => Some("issue".to_string()),
        "milestone" => Some("milestone".to_string()),
        "pullrequest" => Some("pullRequest".to_string()),
        "review" => Some("review".to_string()),
        _ => None,
    }
}

fn default_project_menu_keys() -> Vec<String> {
    vec![
        "code".to_string(),
        "issue".to_string(),
        "pullRequest".to_string(),
        "review".to_string(),
        "milestone".to_string(),
        "board".to_string(),
    ]
}

fn normalize_project_default_menu_config_key(value: &str) -> String {
    value
        .chars()
        .filter(|ch| !ch.is_whitespace() && *ch != '_' && *ch != '-')
        .collect::<String>()
        .to_ascii_lowercase()
}

fn configured_supported_languages() -> Vec<String> {
    let value = std::env::var("YONA_LANGS").ok();
    supported_languages_from_csv(value.as_deref())
}

fn supported_languages_from_option(values: Option<&[String]>) -> Vec<String> {
    let languages = values
        .unwrap_or_default()
        .iter()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    (!languages.is_empty())
        .then_some(languages)
        .unwrap_or_else(default_supported_languages)
}

fn supported_languages_from_csv(value: Option<&str>) -> Vec<String> {
    let languages = value
        .unwrap_or_default()
        .split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    (!languages.is_empty())
        .then_some(languages)
        .unwrap_or_else(default_supported_languages)
}

fn default_supported_languages() -> Vec<String> {
    vec![
        "en-US".to_string(),
        "ko-KR".to_string(),
        "ja-JP".to_string(),
        "ru-RU".to_string(),
        "uz-UZ".to_string(),
    ]
}

fn configured_bool_env(names: &[&str], default: bool) -> bool {
    names
        .iter()
        .find_map(|name| {
            std::env::var(name).ok().and_then(|value| {
                match value.trim().to_ascii_lowercase().as_str() {
                    "1" | "true" | "yes" | "on" => Some(true),
                    "0" | "false" | "no" | "off" => Some(false),
                    _ => None,
                }
            })
        })
        .unwrap_or(default)
}

pub(crate) fn yona_data_root() -> PathBuf {
    std::env::var("YONA_DATA")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(".yona-data"))
}

fn repository_provisioning_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

const LEGACY_DEFAULT_MAX_FILE_SIZE: usize = 2_147_483_454;

fn max_uploaded_file_size_from_env_value(value: Option<&str>) -> usize {
    value
        .and_then(|value| value.trim().parse::<usize>().ok())
        .unwrap_or(LEGACY_DEFAULT_MAX_FILE_SIZE)
}

fn max_uploaded_file_size_from_option(value: Option<usize>) -> usize {
    value.unwrap_or(LEGACY_DEFAULT_MAX_FILE_SIZE)
}

fn configured_max_uploaded_file_size() -> usize {
    let env_value = std::env::var("YONA_MAX_FILE_SIZE").ok();
    max_uploaded_file_size_from_env_value(env_value.as_deref())
}

pub(crate) fn random_storage_token() -> String {
    use base64::Engine;
    use rand::RngCore;

    let mut bytes = [0_u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

fn random_site_admin_password() -> String {
    random_storage_token().chars().take(6).collect()
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
        bcc: Vec::new(),
        body: format!("User verification\n\nClick this link to verify email:\n{verify_url}\n"),
        from: default_smtp_from(),
        html: false,
        reply_to: None,
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
    site_name: &str,
) -> Result<(), ConnectError> {
    let reset_url = absolute_app_url(
        public_origin,
        base_path,
        &format!("/resetPassword?s={verification_code}"),
    );
    deliver(OutboundMail {
        bcc: Vec::new(),
        body: format!("Copy the following URL and paste it to browser's URL bar\n\n{reset_url}"),
        from: default_smtp_from(),
        html: false,
        reply_to: None,
        subject: format!("[{}] Password reset request", site_name),
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
        bcc: Vec::new(),
        body: format!("Validation email\n\nConfirm this email address:\n{confirm_url}\n"),
        from: default_smtp_from(),
        html: false,
        reply_to: None,
        subject: "Validation email".to_string(),
        to: to.to_string(),
    })
    .map_err(internal_error)
}

async fn send_project_transfer_request_mail(
    repository: &PilotRepository,
    authorization: &persistence::ProjectAuthorizationRecord,
    transfer: &persistence::ProjectTransferRecord,
    sender: &persistence::AppUserRecord,
    public_origin: &str,
    base_path: &str,
) -> Result<(), String> {
    let mut recipients = Vec::new();
    if let Some(user) = repository
        .find_user_by_login_id(&transfer.destination)
        .await
        .map_err(|error| error.to_string())?
    {
        recipients.push(user.email_address);
    } else {
        let members = repository
            .read_organization_members(&transfer.destination)
            .await
            .map_err(|error| error.to_string())?;
        recipients.extend(
            members
                .members
                .into_iter()
                .filter(|member| member.role == "org_admin")
                .map(|member| member.email_address),
        );
    }
    recipients.sort();
    recipients.dedup();

    let accept_url = absolute_app_url(
        public_origin,
        base_path,
        &format!("/project/transfer/{}/{}", transfer.id, transfer.confirm_key),
    );
    let body = format!(
        "Hello {},\n\n@{} wants to transfer the {}/{} project to {}/{}.\n{}\n\n{}\n\nIf you do not accept the transfer it will expire in a day.\n\nThanks",
        transfer.destination,
        authorization.project.owner_name,
        authorization.project.owner_name,
        authorization.project.project_name,
        transfer.destination,
        transfer.new_project_name,
        "To accept the request, visit this link:",
        accept_url,
    );
    let subject = format!(
        "[{}] @{} wants to transfer project",
        authorization.project.project_name, sender.login_id
    );
    for to in recipients.into_iter().filter(|to| !to.trim().is_empty()) {
        let _ = deliver(OutboundMail {
            bcc: Vec::new(),
            body: body.clone(),
            from: default_smtp_from(),
            html: false,
            reply_to: None,
            subject: subject.clone(),
            to,
        });
    }
    Ok(())
}

async fn direct_toggle_project_watch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    watching: bool,
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
    match rest_toggle_project_watch(headers, owner_name, project_name, watching, service).await {
        Ok(_) => StatusCode::OK.into_response(),
        Err(error) => error.into_response(),
    }
}

fn site_export_filename_stamp() -> String {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

async fn direct_legacy_leave_project(
    mut headers: HeaderMap,
    owner_name: String,
    project_name: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let login_redirect = base_path_href(
        &base_path,
        "/users/loginform?redirectUrl=%2Fuser%2Feditform",
    );
    let Some(session) = session_manager.read_session_from_headers(&headers) else {
        return Redirect::to(&login_redirect).into_response();
    };
    let Some(user_id) = session.user_id else {
        return Redirect::to(&login_redirect).into_response();
    };
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("project leave requires repository backend")
            .into_response();
    };
    let user = match repository.find_user_by_id(user_id).await {
        Ok(Some(user)) => user,
        Ok(None) => return RestRouteError::not_found("user not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    headers.insert(
        "x-csrf-token",
        HeaderValue::from_str(&session.csrf_token).expect("csrf token header"),
    );
    let service = PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    let _ = rest_delete_project_member(headers, owner_name, project_name, user_id, service).await;
    redirect_to(
        &base_path,
        &format!("/{}?daysAgo=14&selected=projects", user.login_id),
    )
}

pub(crate) async fn direct_accept_pull_request(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Response {
    let redirect_path = format!(
        "/{}/{}/pullRequest/{}",
        owner_name, project_name, pull_request_number
    );
    let service = PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin,
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    match rest_accept_pull_request(
        headers,
        owner_name,
        project_name,
        pull_request_number,
        service,
    )
    .await
    {
        Ok(Json(_)) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

#[derive(Clone, Copy)]
pub(crate) enum PullRequestSourceBranchAction {
    Delete,
    Restore,
}

pub(crate) async fn direct_update_pull_request_source_branch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pull_request_number: i64,
    action: PullRequestSourceBranchAction,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let redirect_path = format!(
        "/{}/{}/pullRequest/{}",
        owner_name, project_name, pull_request_number
    );
    let service = PilotServiceImpl {
        base_path: base_path.clone(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    let result = match action {
        PullRequestSourceBranchAction::Delete => {
            rest_delete_pull_request_source_branch(
                headers,
                owner_name,
                project_name,
                pull_request_number,
                service,
            )
            .await
        }
        PullRequestSourceBranchAction::Restore => {
            rest_restore_pull_request_source_branch(
                headers,
                owner_name,
                project_name,
                pull_request_number,
                service,
            )
            .await
        }
    };
    match result {
        Ok(Json(_)) => redirect_to(&base_path, &redirect_path),
        Err(error) => error.into_response(),
    }
}

pub(crate) async fn direct_delete_project_pushed_branch(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    pushed_branch_id: i64,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Err(response) = direct_project_update_allowed(
        &headers,
        &owner_name,
        &project_name,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        return response;
    }
    let project = match repository
        .read_project_by_owner_and_name(&owner_name, &project_name)
        .await
    {
        Ok(Some(project)) => project,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    match repository
        .delete_project_pushed_branch_by_id(project.id, pushed_branch_id)
        .await
    {
        Ok(_) => StatusCode::OK.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

fn direct_site_user_list_href(state: Option<&str>, query: Option<&str>) -> String {
    let mut params = Vec::new();
    if let Some(state) = state.map(str::trim).filter(|state| !state.is_empty()) {
        params.push(format!("state={}", percent_encode_uri_component(state)));
    }
    if let Some(query) = query.map(str::trim).filter(|query| !query.is_empty()) {
        params.push(format!("query={}", percent_encode_uri_component(query)));
    }
    if params.is_empty() {
        "/sites/userList".to_string()
    } else {
        format!("/sites/userList?{}", params.join("&"))
    }
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

pub(crate) async fn direct_accept_project_transfer(
    headers: HeaderMap,
    transfer_id: i64,
    confirm_key: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let PilotBackend::Repository(repository) = backend else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let session = match require_session(&session_manager, &headers) {
        Ok(session) => session,
        Err(_) => return StatusCode::UNAUTHORIZED.into_response(),
    };
    let Some(actor_id) = session.user_id else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    let transfer = match repository.read_valid_project_transfer(transfer_id).await {
        Ok(Some(transfer)) => transfer,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    if transfer.confirm_key != confirm_key {
        return StatusCode::BAD_REQUEST.into_response();
    }
    let actor = match repository.find_user_by_id(actor_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => return StatusCode::UNAUTHORIZED.into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    let mut allowed = actor.is_site_admin;
    match repository
        .find_user_by_login_id(&transfer.destination)
        .await
    {
        Ok(Some(destination_user)) => {
            allowed = allowed || destination_user.id == actor.id;
        }
        Ok(None) => match repository
            .read_organization_authorization(&transfer.destination, Some(actor.id))
            .await
        {
            Ok(Some(authorization)) => {
                allowed = allowed || authorization.viewer.is_organization_admin;
            }
            Ok(None) => {}
            Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
        },
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
    if !allowed {
        return StatusCode::FORBIDDEN.into_response();
    }

    match repository.accept_project_transfer(transfer.id).await {
        Ok(Some(project)) => redirect_to(
            &base_path,
            &format!("/{}/{}", project.owner_name, project.project_name),
        ),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub(crate) fn redirect_to(base_path: &str, path: &str) -> Response {
    Redirect::to(&base_path_href(base_path, path)).into_response()
}

pub(crate) fn direct_status_from_connect_error(error: ConnectError) -> StatusCode {
    let message = error.to_string().to_ascii_lowercase();
    if message.contains("missing authenticated") {
        StatusCode::UNAUTHORIZED
    } else if message.contains("not found") {
        StatusCode::NOT_FOUND
    } else if message.contains("permission")
        || message.contains("forbidden")
        || message.contains("not allowed")
        || message.contains("invalid csrf")
    {
        StatusCode::FORBIDDEN
    } else if message.contains("invalid") || message.contains("required") {
        StatusCode::BAD_REQUEST
    } else {
        StatusCode::INTERNAL_SERVER_ERROR
    }
}

pub(crate) async fn direct_render_markdown(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: DirectMarkdownRenderBody,
    session_manager: SessionManager,
    backend: PilotBackend,
    _base_path: String,
) -> Response {
    let markdown = body.body.as_deref().unwrap_or_default();
    if let PilotBackend::Repository(repository) = &backend {
        let actor_id = session_manager
            .read_session_from_headers(&headers)
            .and_then(|session| session.user_id);
        if let Err(error) =
            require_project_read(repository, &owner_name, &project_name, actor_id).await
        {
            return direct_status_from_connect_error(error).into_response();
        }
    }

    Json(DirectMarkdownRenderResponse {
        body_markdown: markdown.to_string(),
        breaks: body.breaks.unwrap_or(true),
    })
    .into_response()
}

#[derive(Serialize)]
struct RestErrorEnvelope {
    error: RestErrorPayload,
}

#[derive(Serialize)]
struct RestErrorPayload {
    code: &'static str,
    message: String,
    status: u16,
}

pub(crate) struct RestRouteError {
    code: Option<&'static str>,
    message: String,
    status: StatusCode,
}

impl RestRouteError {
    pub(crate) fn from_connect_error(error: ConnectError) -> Self {
        let status = error.code.http_status();
        let message = error.message.clone().unwrap_or_else(|| error.to_string());
        Self {
            code: None,
            message,
            status,
        }
    }

    pub(crate) fn bad_request(message: impl Into<String>) -> Self {
        Self {
            code: None,
            message: message.into(),
            status: StatusCode::BAD_REQUEST,
        }
    }

    pub(crate) fn not_found(message: impl Into<String>) -> Self {
        Self {
            code: None,
            message: message.into(),
            status: StatusCode::NOT_FOUND,
        }
    }

    pub(crate) fn not_implemented(message: impl Into<String>) -> Self {
        Self {
            code: None,
            message: message.into(),
            status: StatusCode::NOT_IMPLEMENTED,
        }
    }
}

impl IntoResponse for RestRouteError {
    fn into_response(self) -> Response {
        let code = self.code.unwrap_or(match self.status {
            StatusCode::BAD_REQUEST => "bad_request",
            StatusCode::UNAUTHORIZED => "unauthorized",
            StatusCode::FORBIDDEN => "forbidden",
            StatusCode::NOT_FOUND => "not_found",
            StatusCode::CONFLICT => "already_exists",
            StatusCode::NOT_IMPLEMENTED => "not_implemented",
            _ => "internal_error",
        });
        (
            self.status,
            Json(RestErrorEnvelope {
                error: RestErrorPayload {
                    code,
                    message: self.message,
                    status: self.status.as_u16(),
                },
            }),
        )
            .into_response()
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestBoardLabel {
    category_id: String,
    category_is_exclusive: bool,
    category_name: String,
    color: String,
    id: String,
    name: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestIssueAssignableUsersQuery {
    query: String,
    #[serde(rename = "type")]
    search_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDeleteResponse {
    ok: bool,
    redirect_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueDetailResponse {
    #[serde(flatten)]
    detail: ReadIssueDetailResponse,
    author_id: Option<i64>,
    child_closed_count: u32,
    child_issues: Vec<RestIssueChildIssue>,
    child_open_count: u32,
    due_date_label: String,
    history_html: String,
    history_markdown: String,
    comment_parent_links: Vec<RestIssueCommentParentLink>,
    issue_id: i64,
    issue_voters: Vec<RestIssueVoter>,
    is_draft: bool,
    parent_issue_id: Option<i64>,
    parent_issue_number: Option<i64>,
    parent_issue_title: String,
    weight: i16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueCommentParentLink {
    id: i64,
    parent_comment_id: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueVoter {
    avatar_url: String,
    email_address: String,
    login_id: String,
    user_id: i64,
    user_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueWeightResponse {
    weight: i16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueChildIssue {
    assignee_label: String,
    created_label: String,
    is_draft: bool,
    issue_number: i64,
    labels: Vec<IssueLabel>,
    state: String,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestIssueListItem {
    assignee_avatar_url: String,
    assignee_label: String,
    assignee_login_id: String,
    author_avatar_url: String,
    author_label: String,
    author_login_id: String,
    child_closed_count: u32,
    child_issues: Vec<RestIssueChildIssue>,
    child_open_count: u32,
    comment_count: u32,
    due_date_label: String,
    due_date_overdue: bool,
    id: i64,
    issue_number: i64,
    labels: Vec<IssueLabel>,
    milestone_id: i64,
    milestone_title: String,
    owner_name: String,
    parent_issue_number: Option<i64>,
    parent_issue_title: String,
    project_name: String,
    state: String,
    title: String,
    updated_label: String,
    voter_count: u32,
    watcher_count: u32,
    weight: i16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectIssueListResponse {
    draft_items: Vec<RestIssueListItem>,
    items: Vec<RestIssueListItem>,
    owner_name: String,
    page_num: u32,
    page_size: u32,
    project_name: String,
    total_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestOrganizationIssueListResponse {
    closed_issue_count: u32,
    items: Vec<RestIssueListItem>,
    open_issue_count: u32,
    organization_name: String,
    page_num: u32,
    page_size: u32,
    total_count: u32,
    visible_projects: Vec<OrganizationIssueProjectOption>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestUserIssueListResponse {
    closed_issue_count: u32,
    filter: String,
    items: Vec<RestIssueListItem>,
    open_issue_count: u32,
    page_num: u32,
    page_size: u32,
    side_filter_counts: RestUserIssueSideFilterCounts,
    state: String,
    total_count: u32,
    viewer_user_id: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestUserIssueSideFilterCounts {
    favorite: u32,
    mentioned: u32,
    shared: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DirectMarkdownRenderBody {
    body: Option<String>,
    breaks: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectMarkdownRenderResponse {
    body_markdown: String,
    breaks: bool,
}

impl RestRouteError {
    fn internal(message: impl Into<String>) -> Self {
        Self {
            code: None,
            message: message.into(),
            status: StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

pub(crate) fn rest_owned_view<V>(message: &V::Owned) -> Result<OwnedView<V>, RestRouteError>
where
    V: MessageView<'static>,
{
    OwnedView::<V>::from_owned(message).map_err(|error| {
        RestRouteError::internal(format!("failed to encode REST request: {error}"))
    })
}

fn append_response_headers(target: &mut HeaderMap, source: &HeaderMap) {
    for (name, value) in source {
        target.append(name, value.clone());
    }
}

pub(crate) fn rest_json_response<T: Serialize>(payload: T, ctx: Context) -> Response {
    let mut response = Json(payload).into_response();
    append_response_headers(response.headers_mut(), &ctx.response_headers);
    response
}

pub(crate) async fn rest_read_current_session(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Result<Response, RestRouteError> {
    let session = session_manager.ensure_anonymous_session(&headers);
    let payload = resolve_current_session_response(&backend, Some(&session))
        .await
        .map_err(RestRouteError::from_connect_error)?;
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
    Ok(response)
}

pub(crate) fn rest_not_found_response() -> Response {
    RestRouteError::not_found("REST endpoint not found.").into_response()
}

pub(crate) async fn legacy_external_api_hello() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "I'm alive!",
        "ok": true,
    }))
}

#[derive(Clone, Debug, Deserialize)]
struct LegacyExternalWatchersQuery {
    #[serde(rename = "type")]
    resource_type: Option<String>,
}

async fn legacy_external_watchers(
    owner: String,
    project_name: String,
    number: i64,
    query: LegacyExternalWatchersQuery,
    base_path: String,
    backend: PilotBackend,
) -> Response {
    let Some(resource_type) = query.resource_type.as_deref() else {
        return StatusCode::OK.into_response();
    };
    if !matches!(resource_type, "issues" | "posts") {
        return StatusCode::OK.into_response();
    }
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("watchers require repository backend")
            .into_response();
    };

    let watcher_list = match repository
        .list_legacy_external_post_watchers(&owner, &project_name, number, resource_type, 100)
        .await
    {
        Ok(watcher_list) => watcher_list,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let watcher_payload: Vec<_> = watcher_list
        .watchers
        .into_iter()
        .map(|watcher| {
            serde_json::json!({
                "name": watcher.name,
                "url": base_path_href(&base_path, &format!("/{}", watcher.login_id)),
            })
        })
        .collect();

    Json(serde_json::json!({
        "totalWatchers": watcher_list.total_watchers,
        "watchersInList": watcher_payload.len(),
        "watchers": watcher_payload,
    }))
    .into_response()
}

#[derive(Clone, Debug)]
struct LegacyBoardPostingsBody {
    posts: Option<Vec<LegacyBoardPostingBody>>,
}

#[derive(Clone, Debug)]
struct LegacyBoardPostingBody {
    author: Option<serde_json::Value>,
    body: String,
    created_at: Option<serde_json::Value>,
    number: Option<i64>,
    temporary_upload_files: Option<serde_json::Value>,
    title: String,
    updated_at: Option<serde_json::Value>,
}

fn legacy_board_postings_body_from_value(value: &serde_json::Value) -> LegacyBoardPostingsBody {
    LegacyBoardPostingsBody {
        posts: legacy_json_find_value(value, "posts")
            .and_then(|value| value.as_array())
            .map(|items| {
                items
                    .iter()
                    .map(legacy_board_posting_body_from_value)
                    .collect()
            }),
    }
}

fn legacy_board_posting_body_from_value(value: &serde_json::Value) -> LegacyBoardPostingBody {
    LegacyBoardPostingBody {
        author: legacy_json_find_value(value, "author").cloned(),
        body: legacy_json_find_value(value, "body")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        created_at: legacy_json_find_value(value, "createdAt").cloned(),
        number: legacy_json_find_value(value, "number").and_then(|value| {
            value
                .as_i64()
                .or_else(|| value.as_str()?.trim().parse::<i64>().ok())
        }),
        temporary_upload_files: legacy_json_find_value(value, "temporaryUploadFiles").cloned(),
        title: legacy_json_find_value(value, "title")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        updated_at: legacy_json_find_value(value, "updatedAt").cloned(),
    }
}

#[derive(Clone, Debug)]
struct LegacyBoardCommentCreateBody {
    author: Option<serde_json::Value>,
    body: String,
    created_at: Option<serde_json::Value>,
    temporary_upload_files: Option<serde_json::Value>,
}

fn legacy_board_comment_create_body_from_value(
    value: &serde_json::Value,
) -> LegacyBoardCommentCreateBody {
    LegacyBoardCommentCreateBody {
        author: legacy_json_find_value(value, "author").cloned(),
        body: legacy_json_find_value(value, "body")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        created_at: legacy_json_find_value(value, "createdAt").cloned(),
        temporary_upload_files: legacy_json_find_value(value, "temporaryUploadFiles").cloned(),
    }
}

async fn legacy_external_create_board_postings(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let body = legacy_board_postings_body_from_value(&body);
    let Some(posts) = body.posts else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No posts key exists or value wasn't array!",
            })),
        )
            .into_response();
    };
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("board postings require repository backend")
            .into_response();
    };
    let request_user_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let request_actor = match repository.find_user_by_id(request_user_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "user not found",
            ));
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let authorization = match require_project_resource_create(
        repository,
        &owner,
        &project_name,
        Some(request_user_id),
        ProjectCreatableResource::BoardPost,
    )
    .await
    {
        Ok(authorization) => authorization,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    if !posting_can_create(&authorization) {
        return RestRouteError::from_connect_error(ConnectError::permission_denied(
            "posting create is not allowed",
        ))
        .into_response();
    }

    let mut created_posts = Vec::new();
    for post in posts {
        let post_author =
            match legacy_external_post_author(repository, &request_actor, post.author.as_ref())
                .await
            {
                Ok(actor) => actor,
                Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
            };
        let created = match repository
            .create_legacy_external_posting(persistence::CreateLegacyExternalPostingInput {
                actor_display_name: post_author.display_name.clone(),
                actor_id: post_author.id,
                actor_login_id: post_author.login_id.clone(),
                attachment_actor_id: Some(request_user_id),
                created_at: legacy_external_parse_datetime(post.created_at.as_ref()),
                owner_name: owner.clone(),
                post_number: post.number.filter(|number| *number > 0),
                project_name: project_name.clone(),
                updated_at: legacy_external_parse_datetime(post.updated_at.as_ref()),
                values: persistence::PostingMutationInput {
                    attachment_ids: legacy_external_temporary_upload_file_ids(
                        post.temporary_upload_files.as_ref(),
                    ),
                    body_markdown: post.body,
                    label_ids: Vec::new(),
                    notice: false,
                    readme: false,
                    title: post.title,
                },
            })
            .await
        {
            Ok(Some(posting)) => posting,
            Ok(None) => return RestRouteError::not_found("project not found").into_response(),
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        created_posts.push(serde_json::json!({
            "status": 201,
            "location": base_path_href(
                &base_path,
                &format!("/{}/{}/post/{}", owner, project_name, created.post_number),
            ),
        }));
    }

    (StatusCode::CREATED, Json(created_posts)).into_response()
}

async fn legacy_external_update_board_posting_content(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let body = legacy_content_update_body_from_value(&body);
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented(
            "board posting content requires repository backend",
        )
        .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let actor = match repository.find_user_by_id(actor_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "user not found",
            ));
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let access = match read_posting_access(
        repository,
        &owner,
        &project_name,
        number,
        Some(actor_id),
    )
    .await
    {
        Ok(access) => access,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    if !posting_can_update(&access.authorization, &access.posting, &actor) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Forbidden request",
            })),
        )
            .into_response();
    }
    if access.posting.body_markdown != body.original {
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "message": "Already modified by someone.",
                "storedContent": access.posting.body_markdown,
            })),
        )
            .into_response();
    }

    let updated = match repository
        .update_posting(persistence::UpdatePostingInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            owner_name: owner,
            post_number: number,
            project_name,
            values: persistence::PostingMutationInput {
                attachment_ids: access
                    .posting
                    .attachments
                    .iter()
                    .map(|attachment| attachment.id)
                    .collect(),
                body_markdown: body.content,
                label_ids: access.posting.labels.iter().map(|label| label.id).collect(),
                notice: access.posting.notice,
                readme: access.posting.readme,
                title: access.posting.title.clone(),
            },
        })
        .await
    {
        Ok(Some(posting)) => posting,
        Ok(None) => return RestRouteError::not_found("pilot posting not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let payload = match legacy_external_posting_result(repository, &updated).await {
        Ok(payload) => payload,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(payload).into_response()
}

async fn legacy_external_create_board_posting_comment(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
) -> Response {
    let body = legacy_board_comment_create_body_from_value(&body);
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented(
            "board posting comments require repository backend",
        )
        .into_response();
    };
    let request_user_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let request_actor = match repository.find_user_by_id(request_user_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "user not found",
            ));
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let _access = match read_posting_comment_create_access(
        repository,
        &owner,
        &project_name,
        number,
        &request_actor,
    )
    .await
    {
        Ok(access) => access,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let comment_author =
        match legacy_external_post_author(repository, &request_actor, body.author.as_ref()).await {
            Ok(actor) => actor,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
    let posting = match repository
        .create_posting_comment(persistence::CreatePostingCommentInput {
            actor_display_name: comment_author.display_name.clone(),
            actor_id: comment_author.id,
            actor_login_id: comment_author.login_id.clone(),
            attachment_actor_id: Some(request_user_id),
            attachment_ids: legacy_external_temporary_upload_file_ids(
                body.temporary_upload_files.as_ref(),
            ),
            contents_markdown: body.body,
            created_at: legacy_external_parse_datetime(body.created_at.as_ref()),
            owner_name: owner.clone(),
            parent_comment_id: None,
            post_number: number,
            project_name: project_name.clone(),
        })
        .await
    {
        Ok(Some(posting)) => posting,
        Ok(None) => return RestRouteError::not_found("pilot posting not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let comment_id = posting
        .comments
        .iter()
        .map(|comment| comment.id)
        .max()
        .unwrap_or_default();
    (
        StatusCode::CREATED,
        Json(serde_json::json!({
            "status": 201,
            "location": format!(
                "{}#comment-{}",
                base_path_href(&base_path, &format!("/{owner}/{project_name}/post/{number}")),
                comment_id,
            ),
        })),
    )
        .into_response()
}

async fn legacy_external_create_milestones(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let Some(milestones) =
        legacy_json_find_value(&body, "milestones").and_then(|value| value.as_array())
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No milestones key exists or value wasn't array!",
            })),
        )
            .into_response();
    };
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("milestones require repository backend")
            .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, true)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let authorization =
        match require_project_read(repository, &owner, &project_name, Some(actor_id)).await {
            Ok(authorization) => authorization,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
    let can_create = match project_update_allowed(&authorization) {
        Ok(can_create) => can_create,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    if !can_create {
        return RestRouteError::from_connect_error(ConnectError::permission_denied(
            "milestone create is not allowed",
        ))
        .into_response();
    }

    let mut results = Vec::new();
    for milestone in milestones {
        let milestone = legacy_milestone_body_from_value(milestone);
        let title = milestone.title.clone();
        match repository
            .project_milestone_title_exists(&owner, &project_name, &title, None)
            .await
        {
            Ok(true) => {
                results.push(serde_json::json!({
                    "milestone": milestone.original,
                    "message": "This milestone title already exists. Please enter a different title.",
                }));
                continue;
            }
            Ok(false) => {}
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        }
        let due_date = match legacy_external_due_on(milestone.due_on.as_deref()) {
            Ok(due_date) => due_date,
            Err(error) => return RestRouteError::from_connect_error(error).into_response(),
        };
        let state = if milestone
            .state
            .as_deref()
            .is_some_and(|state| state.eq_ignore_ascii_case("closed"))
        {
            "closed"
        } else {
            "open"
        };
        let created = match repository
            .create_project_milestone(persistence::MilestoneMutationInput {
                actor_id: Some(actor_id),
                attachment_ids: Vec::new(),
                contents_markdown: milestone.description.clone(),
                due_date,
                owner_name: owner.clone(),
                project_name: project_name.clone(),
                state: state.to_string(),
                title,
            })
            .await
        {
            Ok(Some(milestone)) => milestone,
            Ok(None) => return RestRouteError::not_found("project not found").into_response(),
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        results.push(legacy_external_milestone_result(&created));
    }

    (StatusCode::CREATED, Json(results)).into_response()
}

#[derive(Clone, Debug)]
struct LegacyMilestoneCreateItem {
    description: String,
    due_on: Option<String>,
    original: serde_json::Value,
    state: Option<String>,
    title: String,
}

fn legacy_milestone_body_from_value(value: &serde_json::Value) -> LegacyMilestoneCreateItem {
    let title = legacy_json_find_value(value, "title")
        .and_then(|value| value.as_str())
        .unwrap_or("No title")
        .to_string();
    let description = legacy_json_find_value(value, "description")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string();
    let due_on = legacy_json_find_value(value, "due_on")
        .and_then(|value| value.as_str())
        .map(ToString::to_string);
    let state = legacy_json_find_value(value, "state")
        .and_then(|value| value.as_str())
        .map(ToString::to_string);

    LegacyMilestoneCreateItem {
        description,
        due_on,
        original: value.clone(),
        state,
        title,
    }
}

fn legacy_external_due_on(value: Option<&str>) -> Result<Option<DateTime>, ConnectError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    DateTime::parse_from_str(&format!("{value} 23:59:59.999"), "%Y-%m-%d %H:%M:%S%.3f")
        .map(Some)
        .map_err(|_| ConnectError::invalid_argument("invalid milestone due_on"))
}

fn legacy_external_milestone_result(
    milestone: &persistence::IssueMilestoneRecord,
) -> serde_json::Value {
    let mut payload = serde_json::json!({
        "id": milestone.id,
        "title": milestone.title,
        "state": milestone.state,
        "description": milestone.contents_markdown,
    });
    if let Some(due_date) = milestone.due_date {
        payload["due_on"] = serde_json::json!(due_date.format("%Y-%m-%d").to_string());
    }
    payload
}

async fn legacy_external_update_board_posting_labels(
    owner: String,
    project_name: String,
    number: i64,
    body: Vec<serde_json::Value>,
    backend: PilotBackend,
) -> Response {
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented("board posting labels require repository backend")
            .into_response();
    };
    let label_ids: Vec<i64> = body.iter().filter_map(legacy_external_label_id).collect();
    let posting = match repository
        .update_posting_labels(&owner, &project_name, number, &label_ids)
        .await
    {
        Ok(Some(posting)) => posting,
        Ok(None) => return RestRouteError::not_found("pilot posting not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    Json(serde_json::json!({
        "id": owner,
        "labels": posting.labels.len(),
    }))
    .into_response()
}

pub(crate) async fn legacy_update_posting_comment(
    headers: HeaderMap,
    owner: String,
    project_name: String,
    number: i64,
    comment_id: i64,
    body: serde_json::Value,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let body = legacy_content_update_body_from_value(&body);
    let PilotBackend::Repository(repository) = &backend else {
        return RestRouteError::not_implemented(
            "board posting comment update requires repository backend",
        )
        .into_response();
    };
    let actor_id =
        match legacy_external_authenticated_user_id(&headers, &session_manager, repository, false)
            .await
        {
            Ok(user_id) => user_id,
            Err(error) => return legacy_external_api_auth_error_response(error),
        };
    let actor = match repository.find_user_by_id(actor_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "user not found",
            ));
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let access = match read_posting_access(
        repository,
        &owner,
        &project_name,
        number,
        Some(actor_id),
    )
    .await
    {
        Ok(access) => access,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let Some(existing_comment) = access
        .posting
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
    else {
        return RestRouteError::not_found("posting comment not found").into_response();
    };
    let can_edit_comment = existing_comment.author_id == Some(actor.id)
        || posting_can_update(&access.authorization, &access.posting, &actor);
    if !can_edit_comment {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "message": "Forbidden request",
            })),
        )
            .into_response();
    }
    if existing_comment.contents_markdown != body.original {
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "message": "Already modified by someone.",
                "storedContent": existing_comment.contents_markdown,
            })),
        )
            .into_response();
    }
    let existing_attachment_ids = existing_comment
        .attachments
        .iter()
        .map(|attachment| attachment.id)
        .collect();
    let posting = match repository
        .update_posting_comment(persistence::UpdatePostingCommentInput {
            actor_id: actor.id,
            attachment_ids: existing_attachment_ids,
            comment_id,
            contents_markdown: body.content,
            owner_name: owner,
            post_number: number,
            project_name,
        })
        .await
    {
        Ok(Some(posting)) => posting,
        Ok(None) => return RestRouteError::not_found("posting comment not found").into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let Some(updated_comment) = posting
        .comments
        .iter()
        .find(|comment| comment.id == comment_id)
    else {
        return RestRouteError::not_found("posting comment not found").into_response();
    };
    Json(serde_json::json!({
        "result": legacy_posting_comment_update_result(updated_comment, &actor),
    }))
    .into_response()
}

fn legacy_posting_comment_update_result(
    comment: &persistence::PostingCommentRecord,
    actor: &persistence::AppUserRecord,
) -> serde_json::Value {
    serde_json::json!({
        "id": comment.id,
        "type": "NONISSUE_COMMENT",
        "author": {
            "loginId": actor.login_id,
            "name": actor.display_name,
            "email": actor.email_address,
        },
        "createdAt": legacy_external_date_string(comment.created_at),
        "body": comment.contents_markdown,
    })
}

async fn legacy_external_posting_result(
    repository: &PilotRepository,
    posting: &persistence::PostingRecord,
) -> Result<serde_json::Value, sea_orm::DbErr> {
    let author = match posting.author_id {
        Some(author_id) => repository.find_user_by_id(author_id).await?,
        None => None,
    };
    let author_login_id = author
        .as_ref()
        .map(|author| author.login_id.as_str())
        .unwrap_or(posting.author_login_id.as_str());
    let author_name = author
        .as_ref()
        .map(|author| author.display_name.as_str())
        .unwrap_or(posting.author_label.as_str());
    let author_email = author
        .as_ref()
        .map(|author| author.email_address.as_str())
        .unwrap_or("");
    let mut payload = serde_json::json!({
        "number": posting.post_number,
        "id": posting.id,
        "title": posting.title,
        "type": "BOARD_POST",
        "author": {
            "loginId": author_login_id,
            "name": author_name,
            "email": author_email,
        },
        "createdAt": legacy_external_date_string(posting.created_at),
        "updatedAt": legacy_external_date_string(posting.updated_at),
        "body": posting.body_markdown,
        "owner": posting.owner_name,
        "projectName": posting.project_name,
    });
    if !posting.attachments.is_empty() {
        payload["attachments"] = serde_json::json!(posting
            .attachments
            .iter()
            .map(legacy_external_attachment_result)
            .collect::<Vec<_>>());
    }
    if !posting.comments.is_empty() {
        payload["comments"] = serde_json::json!(posting
            .comments
            .iter()
            .map(legacy_external_posting_comment_result)
            .collect::<Vec<_>>());
    }
    Ok(payload)
}

fn legacy_external_posting_comment_result(
    comment: &persistence::PostingCommentRecord,
) -> serde_json::Value {
    serde_json::json!({
        "id": comment.id,
        "type": "NONISSUE_COMMENT",
        "author": {
            "loginId": comment.author_login_id,
            "name": comment.author_label,
            "email": "",
        },
        "createdAt": comment.created_label,
        "body": comment.contents_markdown,
    })
}

pub(crate) fn rest_repository(
    service: &PilotServiceImpl,
) -> Result<&PilotRepository, RestRouteError> {
    match &service.backend {
        PilotBackend::Repository(repository) => Ok(repository),
        PilotBackend::Static => Err(RestRouteError::not_implemented(
            "pull request reads require repository backend",
        )),
    }
}

fn rest_actor_id(service: &PilotServiceImpl, headers: &HeaderMap) -> Option<i64> {
    service
        .session_manager
        .read_session_from_headers(headers)
        .and_then(|session| session.user_id)
}

pub(crate) async fn rest_require_project_code_read(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    actor_id: Option<i64>,
) -> Result<persistence::ProjectAuthorizationRecord, RestRouteError> {
    let authorization = require_project_read(repository, owner_name, project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    if !project_code_menu_visible(&authorization, true) {
        let error = ConnectError::permission_denied("project code access is not allowed");
        return Err(RestRouteError::from_connect_error(error));
    }
    Ok(authorization)
}

#[derive(Deserialize)]
#[serde(untagged)]
enum RestStringOrNumber {
    String(String),
    Signed(i64),
    Unsigned(u64),
}

fn parse_rest_i64(value: RestStringOrNumber) -> Result<i64, String> {
    match value {
        RestStringOrNumber::String(value) => value
            .trim()
            .parse::<i64>()
            .map_err(|_| format!("invalid integer value: {value}")),
        RestStringOrNumber::Signed(value) => Ok(value),
        RestStringOrNumber::Unsigned(value) => {
            i64::try_from(value).map_err(|_| format!("integer is too large: {value}"))
        }
    }
}

pub(crate) fn deserialize_optional_i64_from_string_or_number<'de, D>(
    deserializer: D,
) -> Result<Option<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<RestStringOrNumber>::deserialize(deserializer)?;
    match value {
        Some(RestStringOrNumber::String(value)) if value.trim().is_empty() => Ok(None),
        Some(value) => parse_rest_i64(value)
            .map(Some)
            .map_err(serde::de::Error::custom),
        None => Ok(None),
    }
}

pub(crate) fn deserialize_i64_vec_from_strings_or_numbers<'de, D>(
    deserializer: D,
) -> Result<Vec<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    let values = Vec::<RestStringOrNumber>::deserialize(deserializer)?;
    values
        .into_iter()
        .map(parse_rest_i64)
        .collect::<Result<Vec<_>, _>>()
        .map_err(serde::de::Error::custom)
}

fn parse_rest_query_i64(value: &str) -> Result<i64, RestRouteError> {
    if value.trim().is_empty() {
        return Ok(0);
    }
    value
        .parse()
        .map_err(|_| RestRouteError::bad_request("invalid organization issue query"))
}

pub(crate) fn parse_rest_query_u32(value: &str) -> Result<u32, RestRouteError> {
    if value.trim().is_empty() {
        return Ok(0);
    }
    value
        .parse()
        .map_err(|_| RestRouteError::bad_request("invalid organization issue query"))
}

pub(crate) fn decode_query_component(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                decoded.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < bytes.len() => {
                let high = (bytes[index + 1] as char).to_digit(16);
                let low = (bytes[index + 2] as char).to_digit(16);
                if let (Some(high), Some(low)) = (high, low) {
                    decoded.push(((high << 4) | low) as u8);
                    index += 3;
                } else {
                    decoded.push(bytes[index]);
                    index += 1;
                }
            }
            byte => {
                decoded.push(byte);
                index += 1;
            }
        }
    }

    String::from_utf8_lossy(&decoded).into_owned()
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestUserIssuesQuery {
    filter: String,
    order_by: String,
    order_dir: String,
    page_num: u32,
    page_size: u32,
    query: String,
    state: String,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct RestDirectIssueFormQuery {
    #[serde(
        default,
        deserialize_with = "deserialize_optional_i64_from_string_or_number"
    )]
    comment_id: Option<i64>,
    mine: bool,
}

pub(crate) async fn direct_update_review_thread_state(
    headers: HeaderMap,
    thread_id: i64,
    next_state: &str,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let repository = match &backend {
        PilotBackend::Repository(repository) => repository,
        PilotBackend::Static => {
            return RestRouteError::not_implemented("review thread requires repository backend")
                .into_response();
        }
    };
    let context = match repository.read_review_thread_route_context(thread_id).await {
        Ok(Some(context)) => context,
        Ok(None) => return StatusCode::NOT_FOUND.into_response(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let service = PilotServiceImpl {
        base_path: String::new(),
        public_origin: String::new(),
        session_manager,
        backend,
        project_default_scope: "public".to_string(),
        auth_ui: AuthUiConfig::from_env(),
    };
    let result = if let Some(pull_request_number) = context.pull_request_number {
        rest_update_pull_request_thread_state(
            headers,
            context.owner_name,
            context.project_name,
            pull_request_number,
            context.thread_id,
            next_state.to_string(),
            service,
        )
        .await
        .map(|_| ())
    } else if !context.commit_id.trim().is_empty() {
        rest_update_commit_discussion_thread_state(
            headers,
            context.owner_name,
            context.project_name,
            context.commit_id,
            context.thread_id,
            next_state.to_string(),
            service,
        )
        .await
        .map(|_| ())
    } else {
        return StatusCode::NOT_FOUND.into_response();
    };

    match result {
        Ok(()) => StatusCode::OK.into_response(),
        Err(error) => error.into_response(),
    }
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

pub(crate) fn parse_milestone_due_date(value: &str) -> Result<Option<DateTime>, ConnectError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    DateTime::parse_from_str(&format!("{trimmed} 23:59:59.999"), "%Y-%m-%d %H:%M:%S%.3f")
        .map(Some)
        .map_err(|_| ConnectError::invalid_argument("invalid milestone due date"))
}

pub(crate) fn parse_attachment_ids(value: &str) -> Vec<i64> {
    value
        .split(',')
        .filter_map(|item| item.trim().parse::<i64>().ok())
        .filter(|item| *item > 0)
        .collect()
}

fn direct_milestone_input_from_form(
    owner: &str,
    project: &str,
    actor_id: Option<i64>,
    form: &HashMap<String, String>,
) -> Result<persistence::MilestoneMutationInput, ConnectError> {
    let title = form_value(form, &["title"]).trim().to_string();
    if title.is_empty() {
        return Err(ConnectError::invalid_argument("milestone.error.title"));
    }
    Ok(persistence::MilestoneMutationInput {
        actor_id,
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
    let session = match direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        Ok(session) => session,
        Err(response) => return response,
    };
    let input = match direct_milestone_input_from_form(&owner, &project, session.user_id, &form) {
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
    let session = match direct_project_update_allowed(
        &headers,
        &owner,
        &project,
        &session_manager,
        &repository,
        true,
    )
    .await
    {
        Ok(session) => session,
        Err(response) => return response,
    };
    let input = match direct_milestone_input_from_form(&owner, &project, session.user_id, &form) {
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
pub(crate) struct PilotServiceImpl {
    auth_ui: AuthUiConfig,
    base_path: String,
    public_origin: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    project_default_scope: String,
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
        let mut milestone = issue_milestone_from_record_with_issue_references(
            repository,
            &authorization,
            session.user_id,
            &milestone,
            &self.base_path,
        )
        .await?;
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
        let actor = require_authenticated_user(repository, session.user_id).await?;
        let access = read_issue_access(
            repository,
            request.owner_name,
            request.project_name,
            request.issue_number,
            Some(actor.id),
        )
        .await?;
        match action {
            "watch" => repository
                .watch_issue(access.issue.id, actor.id)
                .await
                .map_err(internal_error)?,
            "unwatch" => repository
                .unwatch_issue(access.issue.id, actor.id)
                .await
                .map_err(internal_error)?,
            "vote" => repository
                .vote_issue(access.issue.id, actor.id)
                .await
                .map_err(internal_error)?,
            "unvote" => repository
                .unvote_issue(access.issue.id, actor.id)
                .await
                .map_err(internal_error)?,
            _ => {
                return Err(ConnectError::invalid_argument(
                    "invalid issue participation action",
                ));
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

    async fn issue_comment_participation(
        &self,
        ctx: Context,
        request: OwnedView<IssueCommentParticipationRequestView<'static>>,
        action: &str,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        if request.issue_number <= 0 || request.comment_id <= 0 {
            return Err(ConnectError::invalid_argument(
                "invalid issue comment participation request",
            ));
        }
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        let access = read_issue_access(
            repository,
            request.owner_name,
            request.project_name,
            request.issue_number,
            Some(actor.id),
        )
        .await?;
        if !access.viewer_can_comment() {
            return Err(ConnectError::permission_denied(
                "issue comment vote is not allowed",
            ));
        }
        if !access
            .issue
            .comments
            .iter()
            .any(|comment| comment.id == request.comment_id)
        {
            return Err(ConnectError::not_found("pilot issue comment not found"));
        }

        match action {
            "vote" => repository
                .vote_issue_comment(request.comment_id, actor.id)
                .await
                .map_err(internal_error)?,
            "unvote" => {
                if !repository
                    .unvote_issue_comment(request.comment_id, actor.id)
                    .await
                    .map_err(internal_error)?
                {
                    return Err(ConnectError::not_found("issue comment vote not found"));
                }
            }
            _ => {
                return Err(ConnectError::invalid_argument(
                    "invalid issue comment participation action",
                ));
            }
        }

        let updated = read_issue_access(
            repository,
            request.owner_name,
            request.project_name,
            request.issue_number,
            Some(actor.id),
        )
        .await?;
        Ok((
            issue_detail_response_from_access(&updated, Some(actor.id), &self.base_path),
            ctx,
        ))
    }

    async fn issue_sharer_mutation(
        &self,
        ctx: Context,
        request: OwnedView<IssueShareRequestView<'static>>,
        action: &str,
        target_type: &str,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        if request.owner_name.trim().is_empty()
            || request.project_name.trim().is_empty()
            || request.issue_number <= 0
            || request.login_id.trim().is_empty()
        {
            return Err(ConnectError::invalid_argument(
                "invalid issue sharer request",
            ));
        }
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "issue sharer requires repository backend",
            ));
        };
        let access = read_issue_access(
            repository,
            request.owner_name,
            request.project_name,
            request.issue_number,
            session.user_id,
        )
        .await?;
        if !access.viewer_can_manage() {
            return Err(ConnectError::permission_denied(
                "issue sharer update is not allowed",
            ));
        }
        let actor = access.actor.as_ref().expect("authenticated issue actor");
        let normalized_target_type = target_type.trim().to_ascii_lowercase();
        let target_users = if normalized_target_type == "project" {
            let project_id = request
                .login_id
                .parse::<i64>()
                .map_err(|_| ConnectError::not_found("issue sharer project not found"))?;
            repository
                .read_public_project_by_id(project_id)
                .await
                .map_err(internal_error)?
                .ok_or_else(|| ConnectError::not_found("issue sharer project not found"))?;
            repository
                .list_project_member_users(project_id)
                .await
                .map_err(internal_error)?
        } else if normalized_target_type.is_empty() || normalized_target_type == "user" {
            vec![repository
                .find_user_by_login_id(request.login_id)
                .await
                .map_err(internal_error)?
                .ok_or_else(|| ConnectError::not_found("issue sharer user not found"))?]
        } else {
            return Err(ConnectError::invalid_argument(
                "unsupported issue sharer target type",
            ));
        };

        for target in target_users {
            let changed = match action {
                "share" => repository
                    .add_issue_sharer(access.issue.id, target.id, &target.login_id)
                    .await
                    .map_err(internal_error)?,
                "unshare" => repository
                    .remove_issue_sharer(access.issue.id, target.id)
                    .await
                    .map_err(internal_error)?,
                _ => {
                    return Err(ConnectError::invalid_argument(
                        "invalid issue sharer action",
                    ));
                }
            };
            if changed {
                repository
                    .record_issue_sharer_changed(
                        access.issue.id,
                        actor.id,
                        &actor.login_id,
                        target.id,
                        &target.login_id,
                        action,
                    )
                    .await
                    .map_err(internal_error)?;
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
        let share_status = match session.user_id {
            Some(user_id) => repository
                .read_issue_share_status(updated.id, user_id)
                .await
                .map_err(internal_error)?,
            None => persistence::IssueShareStatus::default(),
        };
        Ok((
            issue_detail_response_from_record_with_sharer_flags(
                &updated,
                true,
                true,
                share_status.direct,
                share_status.inherited_from_parent,
                session.user_id,
                &self.base_path,
            ),
            ctx,
        ))
    }
}

#[derive(Clone)]
pub(crate) enum PilotBackend {
    Static,
    Repository(PilotRepository),
}

#[derive(Clone)]
pub(crate) enum AssetMode {
    None,
    Filesystem(PathBuf),
    Embedded,
}

#[derive(Clone, Serialize)]
pub(crate) struct BrowserRuntimeConfig {
    #[serde(rename = "apiBaseUrl")]
    api_base_url: String,
    #[serde(rename = "basePath")]
    base_path: String,
    #[serde(rename = "projectDefaultMenus")]
    project_default_menus: Vec<String>,
    #[serde(rename = "projectDefaultScope")]
    project_default_scope: String,
    #[serde(rename = "supportedLanguages")]
    supported_languages: Vec<String>,
    #[serde(rename = "showUserEmail")]
    show_user_email: bool,
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
    fn from_base_path(
        base_path: &str,
        project_default_menus: Vec<String>,
        project_default_scope: String,
        supported_languages: Vec<String>,
        show_user_email: bool,
    ) -> Self {
        let base_path = normalize_base_path(base_path);
        let api_base_url = if base_path == "/" {
            "/api".to_string()
        } else {
            format!("{base_path}/api")
        };
        Self {
            api_base_url,
            base_path,
            project_default_menus,
            project_default_scope,
            supported_languages,
            show_user_email,
        }
    }
}

pub(crate) fn auth_ui_capabilities_from_config(
    config: &AuthUiConfig,
) -> ReadAuthUiCapabilitiesResponse {
    ReadAuthUiCapabilitiesResponse {
        email_verification_enabled: config.email_verification_enabled,
        enabled_social_providers: config.enabled_social_providers.clone(),
        login_id_placeholder: config.login_id_placeholder.clone(),
        password_placeholder: config.password_placeholder.clone(),
        signup_require_confirm: config.signup_require_confirm,
        social_login_only: config.social_login_only,
        ..Default::default()
    }
}

fn confirmation_session_required() -> bool {
    confirmation_session_required_from_config(&AuthUiConfig::from_env())
}

fn confirmation_session_required_from_config(config: &AuthUiConfig) -> bool {
    config.signup_require_confirm || config.email_verification_enabled
}

const LEGACY_LOGIN_INVALID_MESSAGE: &str = "user.login.invalid";
const LEGACY_LOGIN_REQUIRED_MESSAGE: &str = "user.login.required";
const LEGACY_MIN_PASSWORD_LENGTH: usize = 4;

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

pub(crate) fn internal_error(error: impl ToString) -> ConnectError {
    ConnectError::new(ErrorCode::Internal, error.to_string())
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

pub(crate) fn workspace_profile_from_record(
    record: &persistence::WorkspaceProfileRecord,
    avatar_url: String,
) -> WorkspaceProfile {
    WorkspaceProfile {
        avatar_url,
        connected_social_providers: record.connected_social_providers.clone(),
        display_name: record.display_name.clone(),
        english_name: record.english_name.clone(),
        is_blocked: record.is_blocked,
        is_guest: record.is_guest,
        is_site_admin: record.is_site_admin,
        login_id: record.login_id.clone(),
        primary_email_address: record.primary_email_address.clone(),
        since_label: record.since_label.clone(),
        ..Default::default()
    }
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
    filter_workspace_issue_items_by_read_acl_for_viewer(repository, Some(user_id), items).await
}

pub(crate) async fn filter_workspace_issue_items_by_read_acl_for_viewer(
    repository: &PilotRepository,
    viewer_id: Option<i64>,
    items: Vec<persistence::WorkspaceIssueListItemRecord>,
) -> Result<Vec<WorkspaceIssueItem>, ConnectError> {
    let mut visible = Vec::new();

    for item in items {
        if workspace_project_read_allowed_for_viewer(
            repository,
            viewer_id,
            &item.owner_name,
            &item.project_name,
        )
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
    filter_workspace_pull_request_items_by_read_acl_for_viewer(repository, Some(user_id), items)
        .await
}

pub(crate) async fn filter_workspace_pull_request_items_by_read_acl_for_viewer(
    repository: &PilotRepository,
    viewer_id: Option<i64>,
    items: Vec<persistence::WorkspacePullRequestListItemRecord>,
) -> Result<Vec<WorkspacePullRequestItem>, ConnectError> {
    let mut visible = Vec::new();

    for item in items {
        if workspace_project_read_allowed_for_viewer(
            repository,
            viewer_id,
            &item.owner_name,
            &item.project_name,
        )
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
    filter_workspace_member_projects_by_read_acl_for_viewer(repository, Some(user_id), items).await
}

pub(crate) async fn filter_workspace_member_projects_by_read_acl_for_viewer(
    repository: &PilotRepository,
    viewer_id: Option<i64>,
    items: Vec<persistence::WorkspaceMemberProjectRecord>,
) -> Result<Vec<WorkspaceMemberProjectItem>, ConnectError> {
    let mut visible = Vec::new();

    for item in items {
        if workspace_project_read_allowed_for_viewer(
            repository,
            viewer_id,
            &item.owner_name,
            &item.project_name,
        )
        .await?
        {
            visible.push(workspace_member_project_item_from_record(&item));
        }
    }

    Ok(visible)
}

async fn workspace_project_read_allowed_for_viewer(
    repository: &PilotRepository,
    viewer_id: Option<i64>,
    owner_name: &str,
    project_name: &str,
) -> Result<bool, ConnectError> {
    let Some(authorization) = repository
        .read_project_authorization(owner_name, project_name, viewer_id)
        .await
        .map_err(internal_error)?
    else {
        return Ok(false);
    };

    Ok(authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous: viewer_id.is_none(),
            is_guest: authorization.viewer.is_guest,
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

async fn organization_logo_url(
    repository: &PilotRepository,
    base_path: &str,
    organization_id: i64,
) -> Result<String, ConnectError> {
    Ok(repository
        .read_organization_logo_attachment(organization_id)
        .await
        .map_err(internal_error)?
        .map(|attachment| base_path_href(base_path, &format!("/files/{}", attachment.id)))
        .unwrap_or_default())
}

async fn organization_detail_with_logo_from_record(
    repository: &PilotRepository,
    base_path: &str,
    record: &persistence::OrganizationRecord,
    viewer_can_update: bool,
) -> Result<OrganizationDetail, ConnectError> {
    let mut detail = organization_detail_from_record(record, viewer_can_update);
    detail.logo_url = organization_logo_url(repository, base_path, record.id).await?;
    Ok(detail)
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

async fn project_logo_url(
    repository: &PilotRepository,
    base_path: &str,
    project_id: i64,
) -> Result<String, ConnectError> {
    Ok(repository
        .read_project_logo_attachment(project_id)
        .await
        .map_err(internal_error)?
        .map(|attachment| base_path_href(base_path, &format!("/files/{}", attachment.id)))
        .unwrap_or_default())
}

async fn project_detail_with_logo_from_record(
    repository: &PilotRepository,
    base_path: &str,
    authorization: &persistence::ProjectAuthorizationRecord,
    viewer_can_update: bool,
    viewer_can_enroll: bool,
) -> Result<ProjectDetail, ConnectError> {
    let mut detail =
        project_detail_from_record(authorization, viewer_can_update, viewer_can_enroll);
    detail.logo_url = project_logo_url(repository, base_path, authorization.project.id).await?;
    Ok(detail)
}

pub(crate) fn project_read_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
    is_anonymous: bool,
) -> Result<bool, ConnectError> {
    Ok(authorize_project_access(
        &ProjectAccessFacts {
            is_anonymous,
            is_guest: authorization.viewer.is_guest,
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
            is_guest: authorization.viewer.is_guest,
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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ProjectCreatableResource {
    BoardPost,
    CommitComment,
    Fork,
    IssueComment,
    IssuePost,
    NonIssueComment,
    ReviewComment,
}

fn project_group_member_create_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
) -> bool {
    authorization.project.organization_id.is_some()
        && authorization.viewer.is_organization_member
        && matches!(
            normalize_identifier(&authorization.project.project_scope).as_str(),
            "public" | "protected"
        )
}

fn project_member_or_admin_create_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
) -> bool {
    authorization.viewer.is_site_admin
        || authorization.viewer.is_organization_admin
        || authorization.viewer.is_project_manager
        || authorization.viewer.is_project_member
}

fn project_resource_create_allowed(
    authorization: &persistence::ProjectAuthorizationRecord,
    resource_type: ProjectCreatableResource,
) -> bool {
    if project_member_or_admin_create_allowed(authorization)
        || project_group_member_create_allowed(authorization)
    {
        return true;
    }
    normalize_identifier(&authorization.project.project_scope) == "public"
        && matches!(
            resource_type,
            ProjectCreatableResource::BoardPost
                | ProjectCreatableResource::CommitComment
                | ProjectCreatableResource::Fork
                | ProjectCreatableResource::IssueComment
                | ProjectCreatableResource::IssuePost
                | ProjectCreatableResource::NonIssueComment
                | ProjectCreatableResource::ReviewComment
        )
}

async fn require_project_resource_create(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    actor_id: Option<i64>,
    resource_type: ProjectCreatableResource,
) -> Result<persistence::ProjectAuthorizationRecord, ConnectError> {
    let Some(actor_id) = actor_id else {
        return Err(ConnectError::unauthenticated(
            "missing authenticated session",
        ));
    };
    let authorization = repository
        .read_project_authorization(owner_name, project_name, Some(actor_id))
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    if project_resource_create_allowed(&authorization, resource_type) {
        Ok(authorization)
    } else {
        Err(ConnectError::permission_denied(
            "project resource create is not allowed",
        ))
    }
}

fn escape_html_text(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn escape_html_attr(value: &str) -> String {
    escape_html_text(value)
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
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
    _owner_name: &str,
    _project_name: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> IssueComment {
    let viewer_is_author = viewer_id.is_some() && viewer_id == record.author_id;
    IssueComment {
        attachments: record
            .attachments
            .iter()
            .map(|attachment| issue_attachment_from_record(attachment, base_path))
            .collect(),
        author_label: record.author_label.clone(),
        author_avatar_url: gravatar_url(&record.author_email_address),
        author_login_id: record.author_login_id.clone(),
        contents_html: String::new(),
        contents_markdown: record.contents_markdown.clone(),
        created_label: record.created_label.clone(),
        id: record.id,
        issue_references: issue_references
            .iter()
            .map(issue_reference_metadata_from_resolved)
            .collect(),
        mention_references: mention_references
            .iter()
            .map(mention_reference_metadata_from_resolved)
            .collect(),
        via_email: record.via_email,
        viewer_can_delete: viewer_can_manage || viewer_is_author,
        viewer_can_update: viewer_can_manage || viewer_is_author,
        viewer_has_voted: record.viewer_has_voted,
        voter_count: record.voter_count,
        voters: record
            .voters
            .iter()
            .map(issue_comment_voter_from_record)
            .collect(),
        ..Default::default()
    }
}

fn issue_comment_voter_from_record(
    record: &persistence::IssueCommentVoterRecord,
) -> IssueCommentVoter {
    IssueCommentVoter {
        avatar_url: gravatar_url(&record.email_address),
        login_id: record.login_id.clone(),
        user_id: record.user_id,
        user_label: record.user_label.clone(),
        ..Default::default()
    }
}

fn issue_voter_from_record(record: &persistence::IssueVoterRecord) -> RestIssueVoter {
    RestIssueVoter {
        avatar_url: gravatar_url(&record.email_address),
        email_address: record.email_address.clone(),
        login_id: record.login_id.clone(),
        user_id: record.user_id,
        user_label: record.user_label.clone(),
    }
}

fn issue_timeline_item_from_record(
    record: &persistence::IssueTimelineItemRecord,
    viewer_can_manage: bool,
    viewer_id: Option<i64>,
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> IssueTimelineItem {
    match record {
        persistence::IssueTimelineItemRecord::Comment(comment) => IssueTimelineItem {
            comment: Some(issue_comment_from_record(
                comment,
                viewer_can_manage,
                viewer_id,
                base_path,
                owner_name,
                project_name,
                issue_references,
                mention_references,
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
        contents_html: String::new(),
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

async fn issue_milestone_from_record_with_issue_references(
    repository: &PilotRepository,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
    record: &persistence::IssueMilestoneRecord,
    base_path: &str,
) -> Result<IssueMilestone, ConnectError> {
    let issue_references = markdown_issue_references_for_project(
        repository,
        authorization,
        actor_id,
        &[record.contents_markdown.as_str()],
    )
    .await?;
    let mention_references =
        markdown_mention_references(repository, &[record.contents_markdown.as_str()]).await?;
    let mut milestone = issue_milestone_from_record(record, base_path);
    milestone.issue_references = issue_references
        .iter()
        .map(issue_reference_metadata_from_resolved)
        .collect();
    milestone.mention_references = mention_references
        .iter()
        .map(mention_reference_metadata_from_resolved)
        .collect();
    Ok(milestone)
}

fn issue_list_filter_from_request(
    request: &ListProjectIssuesRequestView<'_>,
) -> persistence::IssueListFilter {
    persistence::IssueListFilter {
        assignee_id: None,
        assignee_login_id: (!request.assignee_login_id.trim().is_empty())
            .then(|| request.assignee_login_id.trim().to_string()),
        author_login_id: (!request.author_login_id.trim().is_empty())
            .then(|| request.author_login_id.trim().to_string()),
        draft_author_login_id: None,
        label_ids: request.label_ids.to_vec(),
        milestone_id: (request.milestone_id > 0).then_some(request.milestone_id),
        page_num: request.page_num.max(1),
        state: (!request.state.trim().is_empty()).then(|| request.state.trim().to_string()),
    }
}

fn user_issue_filter_name(value: &str) -> Result<String, ConnectError> {
    let normalized = normalize_identifier(value);
    let resolved = if normalized.is_empty() {
        "assigned".to_string()
    } else {
        normalized
    };
    match resolved.as_str() {
        "assigned" | "authored" | "commented" | "mentioned" | "shared" | "favorite" => Ok(resolved),
        _ => Err(ConnectError::invalid_argument("invalid user issue filter")),
    }
}

fn user_issue_state(value: &str) -> Result<String, ConnectError> {
    let normalized = normalize_identifier(value);
    let resolved = if normalized.is_empty() {
        "open".to_string()
    } else {
        normalized
    };
    match resolved.as_str() {
        "open" | "closed" => Ok(resolved),
        _ => Err(ConnectError::invalid_argument("invalid user issue state")),
    }
}

async fn visible_user_issue_items(
    repository: &PilotRepository,
    user_id: i64,
    filter: persistence::UserIssueListFilter,
) -> Result<Vec<persistence::ProjectIssueListItemRecord>, ConnectError> {
    let candidates = repository
        .list_user_issue_candidates(user_id, filter)
        .await
        .map_err(internal_error)?;
    let mut visible = Vec::new();
    for candidate in candidates {
        if read_issue_access(
            repository,
            &candidate.item.owner_name,
            &candidate.item.project_name,
            candidate.item.issue_number,
            Some(user_id),
        )
        .await
        .is_ok()
        {
            visible.push(candidate.item);
        }
    }
    Ok(visible)
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
    actor_id: Option<i64>,
    title: &str,
    contents_markdown: &str,
    due_date: &str,
    state: &str,
    attachment_ids: &[i64],
) -> Result<persistence::MilestoneMutationInput, ConnectError> {
    let title = title.trim();
    if title.is_empty() {
        return Err(ConnectError::invalid_argument("milestone.error.title"));
    }
    Ok(persistence::MilestoneMutationInput {
        actor_id,
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
        is_guest: authorization.viewer.is_guest,
        is_organization_admin: authorization.viewer.is_organization_admin,
        is_organization_member: authorization.viewer.is_organization_member,
        is_project_manager: authorization.viewer.is_project_manager,
        is_project_member: authorization.viewer.is_project_member,
        is_site_admin: authorization.viewer.is_site_admin,
        project_scope: map_project_scope(&authorization.project.project_scope)?,
    })
}

pub(crate) async fn require_project_read(
    repository: &PilotRepository,
    owner_name: &str,
    project_name: &str,
    actor_id: Option<i64>,
) -> Result<persistence::ProjectAuthorizationRecord, ConnectError> {
    let authorization =
        require_project_authorization(repository, owner_name, project_name, actor_id).await?;
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

async fn require_project_authorization(
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
    Ok(authorization)
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

fn optional_i64_string(value: Option<i64>) -> String {
    value.map(|value| value.to_string()).unwrap_or_default()
}

fn rest_board_label_from_record(label: &persistence::IssueLabelRecord) -> RestBoardLabel {
    RestBoardLabel {
        category_id: optional_i64_string(label.category_id),
        category_is_exclusive: label.category_is_exclusive,
        category_name: label.category_name.clone(),
        color: label.color.clone(),
        id: label.id.to_string(),
        name: label.name.clone(),
    }
}

fn issue_detail_response_from_record(
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_id: Option<i64>,
    base_path: &str,
) -> ReadIssueDetailResponse {
    issue_detail_response_from_record_with_sharer_flags(
        issue,
        viewer_can_manage,
        viewer_can_comment,
        false,
        false,
        viewer_id,
        base_path,
    )
}

async fn issue_detail_response_from_record_with_repository_issue_references(
    repository: &PilotRepository,
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_id: Option<i64>,
    base_path: &str,
) -> Result<ReadIssueDetailResponse, ConnectError> {
    let authorization = require_project_read(
        repository,
        &issue.owner_name,
        &issue.project_name,
        viewer_id,
    )
    .await?;
    let mut markdowns = vec![
        issue.body_markdown.as_str(),
        issue.history_markdown.as_str(),
    ];
    markdowns.extend(
        issue
            .comments
            .iter()
            .map(|comment| comment.contents_markdown.as_str()),
    );
    let issue_references =
        markdown_issue_references_for_project(repository, &authorization, viewer_id, &markdowns)
            .await?;
    let mention_references = markdown_mention_references(repository, &markdowns).await?;
    Ok(
        issue_detail_response_from_record_with_sharer_flags_and_references(
            issue,
            viewer_can_manage,
            viewer_can_comment,
            false,
            false,
            viewer_id,
            base_path,
            &issue_references,
            &mention_references,
        ),
    )
}

fn issue_detail_response_from_record_with_sharer_flags(
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_is_direct_sharer: bool,
    viewer_has_inherited_share: bool,
    viewer_id: Option<i64>,
    base_path: &str,
) -> ReadIssueDetailResponse {
    let current_issue_reference = MarkdownIssueReference {
        owner_name: issue.owner_name.clone(),
        project_name: issue.project_name.clone(),
        issue_number: issue.issue_number,
        state: issue.state.clone(),
        title: issue.title.clone(),
    };
    issue_detail_response_from_record_with_sharer_flags_and_references(
        issue,
        viewer_can_manage,
        viewer_can_comment,
        viewer_is_direct_sharer,
        viewer_has_inherited_share,
        viewer_id,
        base_path,
        std::slice::from_ref(&current_issue_reference),
        &[],
    )
}

fn rest_issue_detail_response_from_record_with_sharer_flags_and_references(
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_is_direct_sharer: bool,
    viewer_has_inherited_share: bool,
    viewer_id: Option<i64>,
    base_path: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> RestIssueDetailResponse {
    let detail = issue_detail_response_from_record_with_sharer_flags_and_references(
        issue,
        viewer_can_manage,
        viewer_can_comment,
        viewer_is_direct_sharer,
        viewer_has_inherited_share,
        viewer_id,
        base_path,
        issue_references,
        mention_references,
    );
    RestIssueDetailResponse {
        author_id: issue.author_id,
        child_closed_count: issue.child_closed_count,
        child_issues: issue
            .child_issues
            .iter()
            .map(rest_issue_child_issue_from_record)
            .collect(),
        child_open_count: issue.child_open_count,
        due_date_label: issue.due_date_label.clone(),
        detail,
        history_html: String::new(),
        history_markdown: issue.history_markdown.clone(),
        comment_parent_links: issue
            .comments
            .iter()
            .map(|comment| RestIssueCommentParentLink {
                id: comment.id,
                parent_comment_id: comment.parent_comment_id,
            })
            .collect(),
        issue_id: issue.id,
        issue_voters: issue.voters.iter().map(issue_voter_from_record).collect(),
        is_draft: issue.is_draft,
        parent_issue_id: issue.parent_issue_id,
        parent_issue_number: issue.parent_issue_number,
        parent_issue_title: issue.parent_issue_title.clone(),
        weight: issue.weight,
    }
}

fn rest_issue_child_issue_from_record(
    record: &persistence::IssueChildRecord,
) -> RestIssueChildIssue {
    RestIssueChildIssue {
        assignee_label: record.assignee_label.clone(),
        created_label: record.created_label.clone(),
        is_draft: record.is_draft,
        issue_number: record.issue_number,
        labels: record.labels.iter().map(issue_label_from_record).collect(),
        state: record.state.clone(),
        title: record.title.clone(),
    }
}

fn issue_detail_response_from_record_with_sharer_flags_and_references(
    issue: &persistence::IssueRecord,
    viewer_can_manage: bool,
    viewer_can_comment: bool,
    viewer_is_direct_sharer: bool,
    viewer_has_inherited_share: bool,
    viewer_id: Option<i64>,
    base_path: &str,
    issue_references: &[MarkdownIssueReference],
    mention_references: &[MarkdownMentionReference],
) -> ReadIssueDetailResponse {
    ReadIssueDetailResponse {
        assignee_avatar_url: if issue.assignee_login_id.is_empty() {
            String::new()
        } else {
            gravatar_url(&issue.assignee_email_address)
        },
        assignee_label: issue.assignee_label.clone(),
        assignee_login_id: issue.assignee_login_id.clone(),
        attachments: issue
            .attachments
            .iter()
            .map(|attachment| issue_attachment_from_record(attachment, base_path))
            .collect(),
        author_avatar_url: gravatar_url(&issue.author_email_address),
        author_label: issue.author_label.clone(),
        author_login_id: issue.author_login_id.clone(),
        body_html: String::new(),
        body_markdown: issue.body_markdown.clone(),
        comment_count: issue.comment_count,
        comments: issue
            .comments
            .iter()
            .map(|comment| {
                issue_comment_from_record(
                    comment,
                    viewer_can_manage,
                    viewer_id,
                    base_path,
                    &issue.owner_name,
                    &issue.project_name,
                    issue_references,
                    mention_references,
                )
            })
            .collect(),
        has_voted: issue.has_voted,
        issue_references: issue_references
            .iter()
            .map(issue_reference_metadata_from_resolved)
            .collect(),
        mention_references: mention_references
            .iter()
            .map(mention_reference_metadata_from_resolved)
            .collect(),
        is_favorited: issue.is_favorited,
        is_watching: issue.is_watching,
        issue_number: issue.issue_number,
        labels: issue.labels.iter().map(issue_label_from_record).collect(),
        milestone_id: issue.milestone_id.unwrap_or_default(),
        milestone_title: issue.milestone_title.clone(),
        owner_name: issue.owner_name.clone(),
        project_name: issue.project_name.clone(),
        sharers: issue.sharers.iter().map(issue_sharer_from_record).collect(),
        state: issue.state.clone(),
        timeline: issue
            .timeline
            .iter()
            .map(|item| {
                issue_timeline_item_from_record(
                    item,
                    viewer_can_manage,
                    viewer_id,
                    base_path,
                    &issue.owner_name,
                    &issue.project_name,
                    issue_references,
                    mention_references,
                )
            })
            .collect(),
        title: issue.title.clone(),
        viewer_can_comment,
        viewer_can_delete: viewer_can_manage,
        viewer_can_manage_sharers: viewer_can_manage,
        viewer_can_update: viewer_can_manage,
        viewer_has_inherited_share,
        viewer_is_direct_sharer,
        voter_count: issue.voter_count,
        watcher_count: issue.watcher_count,
        ..Default::default()
    }
}

fn issue_sharer_from_record(record: &persistence::IssueSharerRecord) -> IssueSharer {
    IssueSharer {
        login_id: record.login_id.clone(),
        user_id: record.user_id,
        user_label: record.user_label.clone(),
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
        id: record.id,
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
    base_path: &str,
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
        && authorization.viewer.is_guest
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
            logo_url: project_logo_url(repository, base_path, project_authorization.project.id)
                .await?,
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
        logo_url: organization_logo_url(repository, base_path, authorization.organization.id)
            .await?,
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

async fn visible_projects_for_organization(
    repository: &PilotRepository,
    organization_id: i64,
    actor_id: Option<i64>,
) -> Result<Vec<persistence::ProjectRecord>, ConnectError> {
    let projects = repository
        .list_projects_for_organization(organization_id)
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
        if project_read_allowed(&project_authorization, actor_id.is_none())? {
            visible_projects.push(project_authorization.project);
        }
    }
    Ok(visible_projects)
}

async fn visible_code_projects_for_organization(
    repository: &PilotRepository,
    organization_id: i64,
    actor_id: Option<i64>,
) -> Result<Vec<persistence::ProjectRecord>, ConnectError> {
    let projects = repository
        .list_projects_for_organization(organization_id)
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
        if project_read_allowed(&project_authorization, actor_id.is_none())?
            && project_code_menu_visible(&project_authorization, true)
        {
            visible_projects.push(project_authorization.project);
        }
    }
    Ok(visible_projects)
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
        authorization.viewer.is_guest,
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
        logo_url: project_logo_url(repository, base_path, authorization.project.id).await?,
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

impl PilotServiceImpl {
    async fn read_current_session(
        &self,
        ctx: Context,
        _request: OwnedView<ReadCurrentSessionRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        let response = resolve_current_session_response(&self.backend, session.as_ref()).await?;
        Ok((response, ctx))
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
        if identifier.is_empty() || request.password.is_empty() {
            return Err(ConnectError::invalid_argument(
                LEGACY_LOGIN_REQUIRED_MESSAGE,
            ));
        }

        let Some(user) = repository
            .find_user_by_identifier(&identifier)
            .await
            .map_err(internal_error)?
        else {
            return Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE));
        };

        let verified = verify(&request.password, &user.password_hash).map_err(internal_error)?;
        if !verified {
            return Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE));
        }
        if confirmation_session_required_from_config(&self.auth_ui) && !user.is_confirmed {
            return Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE));
        }

        let authenticated_session = self.session_manager.create_authenticated_session(
            Some(&session.token),
            user.id,
            request.remember_me,
        );
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

        let capabilities = auth_ui_capabilities_from_config(&self.auth_ui);
        let login_id = normalize_identifier(request.login_id);
        let email_address = normalize_identifier(request.email_address);
        if login_id.is_empty() {
            return Err(ConnectError::invalid_argument("user.wrongloginId.alert"));
        }
        if email_address.is_empty() {
            return Err(ConnectError::invalid_argument("validation.invalidEmail"));
        }
        if request.name.trim().is_empty() {
            return Err(ConnectError::invalid_argument("validation.required"));
        }
        if request.password.len() < LEGACY_MIN_PASSWORD_LENGTH {
            return Err(ConnectError::invalid_argument(
                "validation.tooShortPassword",
            ));
        }
        if request.password != request.retyped_password {
            return Err(ConnectError::invalid_argument(
                "validation.passwordMismatch",
            ));
        }

        if repository
            .user_login_id_exists(&login_id)
            .await
            .map_err(internal_error)?
        {
            return Err(ConnectError::already_exists("user.loginId.duplicate"));
        }
        if repository
            .user_email_exists(&email_address)
            .await
            .map_err(internal_error)?
        {
            return Err(ConnectError::already_exists("user.email.duplicate"));
        }

        let password_hash = hash(&request.password, DEFAULT_COST).map_err(internal_error)?;
        let user = repository
            .create_user(persistence::CreateUserInput {
                display_name: request.name.trim().to_string(),
                email_address,
                is_confirmed: !confirmation_session_required_from_config(&self.auth_ui),
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

        if confirmation_session_required_from_config(&self.auth_ui) {
            return Ok((anonymous_current_session_response(), ctx));
        }

        let authenticated_session =
            self.session_manager
                .create_authenticated_session(Some(&session.token), user.id, false);
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
            return Err(workspace_invalid_argument("validation.required"));
        }
        if !request.avatar_attachment_id.trim().is_empty() {
            let attachment_id = request
                .avatar_attachment_id
                .trim()
                .parse::<i64>()
                .map_err(|_| workspace_invalid_argument("user.avatar.uploadError"))?;
            let Some(attachment) = repository
                .promote_avatar_attachment_for_user(user_id, attachment_id)
                .await
                .map_err(|_| workspace_invalid_argument("user.avatar.uploadError"))?
            else {
                return Err(workspace_invalid_argument("user.avatar.uploadError"));
            };
            if !attachment.mime_type.starts_with("image/") {
                return Err(workspace_invalid_argument("user.avatar.onlyImage"));
            }
            if attachment.size > 1024 * 1000 {
                return Err(workspace_invalid_argument("user.avatar.fileSizeAlert"));
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
            return Err(workspace_invalid_argument("user.wrongloginId.alert"));
        }
        if !verify(&request.old_password, &user.password_hash).map_err(internal_error)? {
            return Err(workspace_invalid_argument("user.wrongPassword.alert"));
        }
        if request.password.len() < LEGACY_MIN_PASSWORD_LENGTH {
            return Err(workspace_invalid_argument("validation.tooShortPassword"));
        }
        if request.password != request.retyped_password {
            return Err(workspace_invalid_argument("validation.passwordMismatch"));
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
                is_guest: authorization.viewer.is_guest,
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
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let actor = require_authenticated_user(repository, session.user_id).await?;
        if actor.is_guest {
            return Err(ConnectError::permission_denied(
                "guest users cannot create organizations",
            ));
        }

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
            return Err(ConnectError::already_exists("organization.name.duplicate"));
        }

        let organization = repository
            .create_organization(persistence::CreateOrganizationInput {
                description: Some(request.description.trim().to_string()),
                organization_name: request.organization_name.trim().to_string(),
            })
            .await
            .map_err(internal_error)?;
        repository
            .add_organization_membership(organization.id, actor.id, "org_admin")
            .await
            .map_err(internal_error)?;
        attach_session_headers(&mut ctx, &self.session_manager, &session);

        Ok((
            organization_detail_with_logo_from_record(
                repository,
                &self.base_path,
                &persistence::OrganizationRecord {
                    id: organization.id,
                    organization_name: organization.organization_name,
                    description: organization.description,
                },
                true,
            )
            .await?,
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
                organization_detail_with_logo_from_record(
                    repository,
                    &self.base_path,
                    &authorization.organization,
                    can_update_organization(
                        authorization.viewer.is_organization_admin,
                        authorization.viewer.is_site_admin,
                    ),
                )
                .await?,
                ctx,
            ));
        }

        let organization = repository
            .read_organization_by_name(request.organization_name)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            organization_detail_with_logo_from_record(
                repository,
                &self.base_path,
                &persistence::OrganizationRecord {
                    id: organization.id,
                    organization_name: organization.organization_name,
                    description: organization.description,
                },
                false,
            )
            .await?,
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
            organization_detail_with_logo_from_record(
                repository,
                &self.base_path,
                &authorization.organization,
                true,
            )
            .await?,
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
            build_organization_container_response(
                repository,
                &self.base_path,
                &authorization,
                actor_id,
            )
            .await?,
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
            return Err(ConnectError::already_exists("organization.name.duplicate"));
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
            organization_detail_with_logo_from_record(
                repository,
                &self.base_path,
                &persistence::OrganizationRecord {
                    id: updated.id,
                    organization_name: updated.organization_name,
                    description: updated.description,
                },
                true,
            )
            .await?,
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
        if target_user.is_guest {
            return Err(ConnectError::invalid_argument(
                "guest users cannot be added to organizations directly",
            ));
        }
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
        if !authorization.viewer.is_guest
            || authorization.viewer.is_organization_admin
            || authorization.viewer.is_organization_member
            || authorization.viewer.is_site_admin
        {
            return Err(ConnectError::invalid_argument(
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
            build_organization_container_response(
                repository,
                &self.base_path,
                &refreshed,
                Some(user_id),
            )
            .await?,
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
        if !authorization.viewer.is_guest
            || authorization.viewer.is_organization_admin
            || authorization.viewer.is_organization_member
            || authorization.viewer.is_site_admin
        {
            return Err(ConnectError::invalid_argument(
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
            build_organization_container_response(
                repository,
                &self.base_path,
                &refreshed,
                Some(user_id),
            )
            .await?,
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
        let request_scope = request.project_scope.trim();
        let default_scope;
        let scope_value = if request_scope.is_empty() {
            default_scope = self.project_default_scope.clone();
            default_scope.as_str()
        } else {
            request_scope
        };
        let scope = map_project_scope(scope_value)?;
        if !is_valid_project_name(request.project_name) || request.overview.len() > 255 {
            return Err(ConnectError::invalid_argument("invalid project request"));
        }
        if repository
            .project_identifier_exists(request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?
        {
            return Err(ConnectError::already_exists("project.name.duplicate"));
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
                    vcs: "GIT".to_string(),
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
                    vcs: "GIT".to_string(),
                })
                .await
                .map_err(internal_error)?
        };
        let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), created.id);
        {
            let _guard = repository_provisioning_lock()
                .lock()
                .map_err(|_| internal_error("repository provisioning lock poisoned"))?;
            yona_rust_vcs::create_bare_repository(&repo_path).map_err(code_browser_error)?;
        }
        repository
            .add_project_membership(created.id, user_id, "manager")
            .await
            .map_err(internal_error)?;
        let authorization = repository
            .read_project_authorization(&created.owner_name, &created.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        Ok((
            project_detail_with_logo_from_record(
                repository,
                &self.base_path,
                &authorization,
                true,
                false,
            )
            .await?,
            ctx,
        ))
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
                is_guest: authorization.viewer.is_guest,
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
            project_detail_with_logo_from_record(
                repository,
                &self.base_path,
                &authorization,
                authorize_project_access(
                    &ProjectAccessFacts {
                        is_anonymous: actor_id.is_none(),
                        is_guest: authorization.viewer.is_guest,
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
                    authorization.viewer.is_guest,
                    authorization.viewer.is_organization_admin,
                    authorization.viewer.is_organization_member,
                    authorization.viewer.is_project_manager,
                    authorization.viewer.is_project_member,
                    authorization.viewer.is_site_admin,
                ),
            )
            .await?,
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
                is_guest: authorization.viewer.is_guest,
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

        Ok((
            project_detail_with_logo_from_record(
                repository,
                &self.base_path,
                &authorization,
                true,
                false,
            )
            .await?,
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
                is_guest: authorization.viewer.is_guest,
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
            return Err(ConnectError::already_exists("project.name.duplicate"));
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
        Ok((
            project_detail_with_logo_from_record(
                repository,
                &self.base_path,
                &updated,
                true,
                false,
            )
            .await?,
            ctx,
        ))
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
            authorization.viewer.is_guest,
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_organization_member,
            authorization.viewer.is_project_manager,
            authorization.viewer.is_project_member,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::invalid_argument(
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
            authorization.viewer.is_guest,
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_organization_member,
            authorization.viewer.is_project_manager,
            authorization.viewer.is_project_member,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::invalid_argument(
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
                is_guest: authorization.viewer.is_guest,
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
                is_guest: authorization.viewer.is_guest,
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
            let records = repository
                .list_projects()
                .await
                .map_err(|error| ConnectError::new(ErrorCode::Internal, error.to_string()))?;
            let mut items = Vec::with_capacity(records.len());
            for item in records {
                items.push(ProjectListItem {
                    logo_url: project_logo_url(repository, &self.base_path, item.id).await?,
                    owner_name: item.owner_name,
                    project_name: item.project_name,
                    overview: item.overview.unwrap_or_default(),
                    project_scope: item.project_scope,
                    ..Default::default()
                });
            }

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
            let records = repository
                .list_organizations()
                .await
                .map_err(|error| ConnectError::new(ErrorCode::Internal, error.to_string()))?;
            let mut items = Vec::with_capacity(records.len());
            for item in records {
                items.push(OrganizationListItem {
                    organization_name: item.organization_name,
                    description: item.description.unwrap_or_default(),
                    logo_url: organization_logo_url(repository, &self.base_path, item.id).await?,
                    ..Default::default()
                });
            }

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

    async fn list_organization_issues(
        &self,
        ctx: Context,
        request: OwnedView<ListOrganizationIssuesRequestView<'static>>,
    ) -> Result<(ListOrganizationIssuesResponse, Context), ConnectError> {
        if request.organization_name.trim().is_empty() {
            return Err(ConnectError::invalid_argument(
                "invalid organization issue list request",
            ));
        }
        let state = if request.state.trim().is_empty() {
            "open".to_string()
        } else {
            normalize_identifier(request.state)
        };
        if !matches!(state.as_str(), "open" | "closed") {
            return Err(ConnectError::invalid_argument(
                "invalid organization issue state",
            ));
        }

        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization issues require repository backend",
            ));
        };
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        let actor_id = session.as_ref().and_then(|session| session.user_id);
        let authorization = repository
            .read_organization_authorization(request.organization_name, actor_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        let visible_projects =
            visible_projects_for_organization(repository, authorization.organization.id, actor_id)
                .await?;
        let current_user_filter = |value: i64| {
            if value > 0 {
                actor_id.or(Some(-1))
            } else {
                None
            }
        };
        let record = repository
            .list_organization_issues_filtered(
                &authorization.organization.organization_name,
                visible_projects,
                persistence::OrganizationIssueListFilter {
                    assignee_user_id: current_user_filter(request.assignee_id),
                    author_id: current_user_filter(request.author_id),
                    filter: Some(request.filter.to_string())
                        .filter(|value| !value.trim().is_empty()),
                    items_per_page: request.items_per_page,
                    mention_user_id: None,
                    order_by: request.order_by.to_string(),
                    order_dir: request.order_dir.to_string(),
                    page_num: request.page_num,
                    project_names: request
                        .project_names
                        .iter()
                        .map(ToString::to_string)
                        .collect(),
                    state,
                },
            )
            .await
            .map_err(internal_error)?;

        Ok((
            ListOrganizationIssuesResponse {
                closed_issue_count: record.closed_issue_count,
                items: record
                    .items
                    .into_iter()
                    .map(organization_issue_list_item_to_proto)
                    .collect(),
                open_issue_count: record.open_issue_count,
                organization_name: record.organization_name,
                page_num: record.page_num,
                page_size: record.page_size,
                total_count: record.total_count,
                visible_projects: record
                    .visible_projects
                    .into_iter()
                    .map(|project| OrganizationIssueProjectOption {
                        owner_name: project.owner_name,
                        project_name: project.project_name,
                        ..Default::default()
                    })
                    .collect(),
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
            let access = read_issue_access(
                repository,
                request.owner_name,
                request.project_name,
                request.issue_number,
                actor_id,
            )
            .await?;
            return Ok((
                issue_detail_response_from_access(&access, actor_id, &self.base_path),
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
                .update_issue_state_as_actor(
                    request.owner_name,
                    request.project_name,
                    request.issue_number,
                    request.state,
                    actor.id,
                    &actor.login_id,
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

    async fn vote_issue_comment(
        &self,
        ctx: Context,
        request: OwnedView<IssueCommentParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        self.issue_comment_participation(ctx, request, "vote").await
    }

    async fn unvote_issue_comment(
        &self,
        ctx: Context,
        request: OwnedView<IssueCommentParticipationRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        self.issue_comment_participation(ctx, request, "unvote")
            .await
    }

    async fn toggle_favorite_issue(
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
        let access = read_issue_access(
            repository,
            request.owner_name,
            request.project_name,
            request.issue_number,
            Some(actor.id),
        )
        .await?;
        repository
            .toggle_favorite_issue(access.issue.id, actor.id)
            .await
            .map_err(internal_error)?;
        let updated = read_issue_access(
            repository,
            request.owner_name,
            request.project_name,
            request.issue_number,
            Some(actor.id),
        )
        .await?;
        Ok((
            issue_detail_response_from_access(&updated, Some(actor.id), &self.base_path),
            ctx,
        ))
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
        let actor_id = session.as_ref().and_then(|session| session.user_id);
        require_project_read(
            repository,
            request.owner_name,
            request.project_name,
            actor_id,
        )
        .await?;
        let records = repository
            .list_project_milestones(
                request.owner_name,
                request.project_name,
                milestone_list_filter_from_request(&request),
            )
            .await
            .map_err(internal_error)?;
        let milestones = records
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
        let mut milestone = issue_milestone_from_record_with_issue_references(
            repository,
            &authorization,
            session.as_ref().and_then(|session| session.user_id),
            &milestone,
            &self.base_path,
        )
        .await?;
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
            session.user_id,
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
        let mut milestone = issue_milestone_from_record_with_issue_references(
            repository,
            &authorization,
            session.user_id,
            &milestone,
            &self.base_path,
        )
        .await?;
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
            session.user_id,
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
        let mut milestone = issue_milestone_from_record_with_issue_references(
            repository,
            &authorization,
            session.user_id,
            &milestone,
            &self.base_path,
        )
        .await?;
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
        owner_name: item.owner_name,
        project_name: item.project_name,
        state: item.state,
        title: item.title,
        updated_label: item.updated_label,
        voter_count: item.voter_count,
        watcher_count: item.watcher_count,
        ..Default::default()
    }
}

fn rest_issue_list_item_from_record(
    item: persistence::ProjectIssueListItemRecord,
) -> RestIssueListItem {
    RestIssueListItem {
        assignee_avatar_url: if item.assignee_email_address.trim().is_empty() {
            String::new()
        } else {
            gravatar_url(&item.assignee_email_address)
        },
        assignee_label: item.assignee_label,
        assignee_login_id: item.assignee_login_id,
        author_avatar_url: if item.author_email_address.trim().is_empty() {
            String::new()
        } else {
            gravatar_url(&item.author_email_address)
        },
        author_label: item.author_label,
        author_login_id: item.author_login_id,
        child_closed_count: item.child_closed_count,
        child_issues: item
            .child_issues
            .iter()
            .map(rest_issue_child_issue_from_record)
            .collect(),
        child_open_count: item.child_open_count,
        comment_count: item.comment_count,
        due_date_label: item.due_date_label,
        due_date_overdue: item.due_date_overdue,
        id: item.id,
        issue_number: item.issue_number,
        labels: item.labels.iter().map(issue_label_from_record).collect(),
        milestone_id: item.milestone_id.unwrap_or_default(),
        milestone_title: item.milestone_title,
        owner_name: item.owner_name,
        parent_issue_number: item.parent_issue_number,
        parent_issue_title: item.parent_issue_title,
        project_name: item.project_name,
        state: item.state,
        title: item.title,
        updated_label: item.updated_label,
        voter_count: item.voter_count,
        watcher_count: item.watcher_count,
        weight: item.weight,
    }
}

fn code_browser_error(error: VcsError) -> ConnectError {
    match error {
        VcsError::GitUnavailable => ConnectError::unimplemented("git executable is unavailable"),
        VcsError::SvnAdminUnavailable => {
            ConnectError::unimplemented("svnadmin executable is unavailable")
        }
        VcsError::SvnUnavailable => ConnectError::unimplemented("svn executable is unavailable"),
        VcsError::InvalidBranch | VcsError::InvalidPath | VcsError::InvalidRepositoryPath => {
            ConnectError::invalid_argument(error.to_string())
        }
        VcsError::NotFound => ConnectError::not_found("repository path not found"),
        VcsError::GitTimedOut
        | VcsError::GitFailed(_)
        | VcsError::SvnAdminFailed(_)
        | VcsError::SvnFailed(_)
        | VcsError::SvnLookFailed(_)
        | VcsError::SvnLookUnavailable
        | VcsError::FilesystemFailed(_) => internal_error(error),
    }
}

fn code_branch_error(error: VcsError) -> ConnectError {
    match error {
        VcsError::GitUnavailable => ConnectError::unimplemented("git executable is unavailable"),
        VcsError::SvnAdminUnavailable => {
            ConnectError::unimplemented("svnadmin executable is unavailable")
        }
        VcsError::SvnUnavailable => ConnectError::unimplemented("svn executable is unavailable"),
        VcsError::InvalidBranch | VcsError::InvalidPath | VcsError::InvalidRepositoryPath => {
            ConnectError::invalid_argument(error.to_string())
        }
        VcsError::NotFound => ConnectError::not_found("branch not found"),
        VcsError::GitTimedOut
        | VcsError::GitFailed(_)
        | VcsError::SvnAdminFailed(_)
        | VcsError::SvnFailed(_)
        | VcsError::SvnLookFailed(_)
        | VcsError::SvnLookUnavailable
        | VcsError::FilesystemFailed(_) => internal_error(error),
    }
}

fn code_file_record_is_renderable_markdown(file: &CodeFileRecord) -> bool {
    !file.is_binary && !file.is_too_large && code_path_is_markdown(&file.path)
}

fn code_path_is_markdown(path: &str) -> bool {
    let extension = path
        .rsplit_once('.')
        .map(|(_, extension)| extension.to_ascii_lowercase())
        .unwrap_or_default();
    matches!(
        extension.as_str(),
        "markdown" | "mdown" | "mkdn" | "mkd" | "md" | "mdwn"
    )
}

fn organization_issue_list_item_to_proto(
    item: persistence::ProjectIssueListItemRecord,
) -> OrganizationIssueListItem {
    OrganizationIssueListItem {
        assignee_label: item.assignee_label,
        author_label: item.author_label,
        comment_count: item.comment_count,
        issue_number: item.issue_number,
        labels: item.labels.iter().map(issue_label_from_record).collect(),
        milestone_id: item.milestone_id.unwrap_or_default(),
        milestone_title: item.milestone_title,
        owner_name: item.owner_name,
        project_name: item.project_name,
        state: item.state,
        title: item.title,
        updated_label: item.updated_label,
        voter_count: item.voter_count,
        watcher_count: item.watcher_count,
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn max_uploaded_file_size_uses_legacy_default_and_env_override() {
        assert_eq!(
            max_uploaded_file_size_from_env_value(None),
            LEGACY_DEFAULT_MAX_FILE_SIZE
        );
        assert_eq!(
            max_uploaded_file_size_from_env_value(Some("")),
            LEGACY_DEFAULT_MAX_FILE_SIZE
        );
        assert_eq!(max_uploaded_file_size_from_env_value(Some("4096")), 4096);
        assert_eq!(
            max_uploaded_file_size_from_env_value(Some("not-a-number")),
            LEGACY_DEFAULT_MAX_FILE_SIZE
        );
    }

    #[test]
    fn configured_commands_preserve_quoted_programs_and_arguments() {
        let (program, args) = configured_command_parts(
            r#""/opt/Yona Tools/fetch mailbox" --mode "unseen only" 'folder name'"#,
            "empty",
        )
        .expect("configured command");
        assert_eq!(program, "/opt/Yona Tools/fetch mailbox");
        assert_eq!(args, vec!["--mode", "unseen only", "folder name"]);

        assert_eq!(
            split_configured_command(r#"runner escaped\ value "two words""#)
                .expect("escaped command"),
            vec!["runner", "escaped value", "two words"]
        );
        assert!(split_configured_command(r#""unterminated"#).is_err());
    }

    #[test]
    fn site_update_https_fetch_command_preserves_quoted_override() {
        let config = SiteUpdateConfig {
            https_fetch_command: r#""/opt/Yona Tools/fetch update" --header "X-Test: yes""#
                .to_string(),
            ..SiteUpdateConfig::default()
        };
        let (program, args) =
            site_update_https_fetch_command("https://downloads.example/yona.zip", &config)
                .expect("fetch command");
        assert_eq!(program, "/opt/Yona Tools/fetch update");
        assert_eq!(
            args,
            vec![
                "--header".to_string(),
                "X-Test: yes".to_string(),
                "https://downloads.example/yona.zip".to_string(),
            ]
        );
    }

    #[test]
    fn markdown_mention_tokens_follow_legacy_boundaries() {
        assert_eq!(
            markdown_mention_tokens("@testOwner @testOwner/testProject @nforge @nforge/yobi"),
            vec![
                "nforge".to_string(),
                "nforge/yobi".to_string(),
                "testOwner".to_string(),
                "testOwner/testProject".to_string(),
            ]
        );
        assert!(
            markdown_mention_tokens("mail@example.com owner/@ignored path/@ignored").is_empty()
        );
    }
}
