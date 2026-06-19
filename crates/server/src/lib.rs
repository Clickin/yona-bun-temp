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
    accepts_legacy_json, anonymous_current_session_response, append_response_headers,
    attach_session_headers, base_path_href, build_organization_admin_response,
    build_organization_container_response, build_project_container_response,
    build_workspace_overview_response, code_branch_error, code_browser_error,
    code_file_record_is_renderable_markdown, code_path_is_markdown,
    current_session_response_from_user, decode_query_component, delete_project_repository_storage,
    deserialize_i64_vec_from_strings_or_numbers, deserialize_optional_i64_from_string_or_number,
    detect_upload_mime_type, direct_project_update_allowed, direct_status_from_connect_error,
    direct_toggle_workspace_notification, dispatch_issue_webhooks, dispatch_pull_request_webhooks,
    escape_html_attr, escape_html_text, filter_workspace_issue_items_by_read_acl_for_viewer,
    filter_workspace_member_projects_by_read_acl_for_viewer,
    filter_workspace_pull_request_items_by_read_acl_for_viewer, form_bool, form_value,
    format_project_date_label, gravatar_url, headers_with_form_csrf, issue_attachment_from_record,
    issue_can_mutate, issue_detail_response_from_access, issue_detail_response_from_record,
    issue_detail_response_from_record_with_repository_issue_references,
    issue_detail_response_from_record_with_sharer_flags, issue_label_category_from_record,
    issue_label_css, issue_label_from_record, issue_list_filter_from_request,
    issue_milestone_from_record, issue_milestone_from_record_with_issue_references,
    legacy_content_disposition_filename, legacy_content_update_body_from_value,
    legacy_external_api_auth_error_response, legacy_external_api_hello,
    legacy_external_api_token_from_headers, legacy_external_assignable_users_result,
    legacy_external_attachment_result, legacy_external_authenticated_user_id,
    legacy_external_date_string, legacy_external_label_id, legacy_external_parse_datetime,
    legacy_external_post_author, legacy_external_temporary_upload_file_ids,
    legacy_issue_comment_create_body_from_value, legacy_issue_detect_change_body_from_value,
    legacy_issue_update_body_from_value, legacy_json_find_value,
    milestone_list_filter_from_request, milestone_mutation_input, normalize_identifier,
    normalize_issue_label_color, normalize_milestone_state, optional_i64_string,
    organization_admin_member_from_record, organization_detail_from_record,
    organization_detail_with_logo_from_record, organization_enrollment_request_summary_from_record,
    organization_issue_list_item_to_proto, organization_logo_url,
    organization_member_summary_from_record, organization_role_options, parse_attachment_ids,
    parse_milestone_due_date, parse_rest_query_i64, parse_rest_query_u32, posting_can_create,
    posting_can_update, project_code_menu_visible, project_detail_from_record,
    project_detail_with_logo_from_record, project_issue_list_item_to_proto, project_logo_url,
    project_member_summary_from_record, project_milestone_summary_from_record,
    project_resource_create_allowed, project_webhook_type_label, read_issue_access,
    read_posting_access, read_posting_comment_create_access, record_project_webhook_delivery,
    redirect_to, require_project_resource_create, require_session, require_valid_csrf,
    resolve_current_session_response, resolve_issue_reference_search_project, rest_actor_id,
    rest_board_label_from_record, rest_commit_thread_from_record, rest_delete_project_member,
    rest_issue_detail_response_from_access_with_repository_issue_references, rest_json_response,
    rest_list_user_issues, rest_not_found_response, rest_owned_view,
    rest_project_issue_filter_from_query, rest_project_menu_settings, rest_read_current_session,
    rest_read_direct_issue_form_options, rest_repository, rest_require_project_code_read,
    rest_review_thread_filter, rest_update_commit_discussion_thread_state, uploaded_file_path,
    user_issue_filter_name, user_issue_state, visible_code_projects_for_organization,
    visible_projects_for_organization, visible_user_issue_items, workspace_avatar_url,
    workspace_profile_from_record, ProjectCreatableResource, RestBoardLabel,
    RestIssueAssignableUsersQuery, RestProjectDeleteResponse, RestProjectIssuesQuery,
    RestReviewThread, RestReviewThreadListQuery, RestRouteError,
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
use axum::Router;
use axum::{extract::Path, http::Method};
use base64::Engine as _;
use bcrypt::{hash, verify, DEFAULT_COST};
use buffa::view::OwnedView;
use http::StatusCode;
use runtime_config::normalize_base_path;
use serde::{Deserialize, Serialize};
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
    ProjectScope,
};
use yona_rust_integrations::{deliver, OutboundMail};
use yona_rust_vcs::ProjectHistoryCommitRecord;

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

pub(crate) fn percent_encode_uri_component(value: &str) -> String {
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

pub(crate) fn absolute_app_url(public_origin: &str, base_path: &str, path: &str) -> String {
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

fn site_export_filename_stamp() -> String {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
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

pub(crate) fn internal_error(error: impl ToString) -> ConnectError {
    ConnectError::new(ErrorCode::Internal, error.to_string())
}

fn map_project_scope(value: &str) -> Result<ProjectScope, ConnectError> {
    ProjectScope::try_from(value)
        .map_err(|_| ConnectError::invalid_argument("invalid project scope"))
}

fn workspace_invalid_argument(message: impl Into<String>) -> ConnectError {
    ConnectError::invalid_argument(message.into())
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

pub(crate) fn project_update_allowed(
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
