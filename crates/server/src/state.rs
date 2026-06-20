use axum::http::HeaderMap;
use http::StatusCode;
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{atomic::AtomicBool, Mutex, OnceLock},
};

use crate::runtime_config::normalize_base_path;
use crate::session::SessionManager;
use crate::{
    AppRuntimeConfig, AuthUiConfig, PilotRepository, SiteUpdateConfig, SmtpRuntimeConfig,
    TranslationProxyConfig,
};
use yona_rust_integrations::IntegrationConfig;

pub(crate) static SITE_UPDATE_NOTIFICATION_WATCHED: AtomicBool = AtomicBool::new(true);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ErrorCode {
    InvalidArgument,
    NotFound,
    AlreadyExists,
    Unauthenticated,
    PermissionDenied,
    Unimplemented,
    Internal,
}

impl ErrorCode {
    pub(crate) fn http_status(self) -> StatusCode {
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
    pub(crate) code: ErrorCode,
    pub(crate) message: Option<String>,
}

impl ConnectError {
    pub(crate) fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: Some(message.into()),
        }
    }

    pub(crate) fn invalid_argument(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::InvalidArgument, message)
    }

    pub(crate) fn not_found(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::NotFound, message)
    }

    pub(crate) fn already_exists(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::AlreadyExists, message)
    }

    pub(crate) fn unauthenticated(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Unauthenticated, message)
    }

    pub(crate) fn permission_denied(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::PermissionDenied, message)
    }

    pub(crate) fn unimplemented(message: impl Into<String>) -> Self {
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
    pub(crate) headers: HeaderMap,
    pub(crate) response_headers: HeaderMap,
}

impl Context {
    pub(crate) fn new(headers: HeaderMap) -> Self {
        Self {
            headers,
            response_headers: HeaderMap::new(),
        }
    }
}

pub(crate) fn repository_provisioning_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

#[derive(Clone)]
pub(crate) struct RuntimeRegistry {
    pub(crate) auth_ui: AuthUiConfig,
    pub(crate) data_root: PathBuf,
    pub(crate) integrations: IntegrationConfig,
    pub(crate) max_uploaded_file_size: usize,
    pub(crate) project_default_scope: String,
    pub(crate) site_name: String,
    pub(crate) site_update: SiteUpdateConfig,
    pub(crate) smtp: SmtpRuntimeConfig,
    pub(crate) translation_proxy: TranslationProxyConfig,
}

impl RuntimeRegistry {
    pub(crate) fn from_app_config(config: &AppRuntimeConfig) -> Self {
        Self {
            auth_ui: config.auth_ui.clone(),
            data_root: config.data_root.clone(),
            integrations: config.integrations.clone(),
            max_uploaded_file_size: config.max_uploaded_file_size,
            project_default_scope: config.project_default_scope.clone(),
            site_name: config.site_name.clone(),
            site_update: config.site_update.clone(),
            smtp: config.smtp.clone(),
            translation_proxy: config.translation_proxy.clone(),
        }
    }
}

#[derive(Clone)]
pub(crate) struct PilotServiceImpl {
    pub(crate) auth_ui: AuthUiConfig,
    pub(crate) base_path: String,
    pub(crate) data_root: PathBuf,
    pub(crate) public_origin: String,
    pub(crate) integrations: IntegrationConfig,
    pub(crate) max_uploaded_file_size: usize,
    pub(crate) session_manager: SessionManager,
    pub(crate) backend: PilotBackend,
    pub(crate) project_default_scope: String,
    pub(crate) site_name: String,
    pub(crate) smtp: SmtpRuntimeConfig,
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
    #[serde(rename = "siteName")]
    site_name: String,
    #[serde(rename = "supportedLanguages")]
    supported_languages: Vec<String>,
    #[serde(rename = "showUserEmail")]
    show_user_email: bool,
}

impl BrowserRuntimeConfig {
    pub(crate) fn from_base_path(
        base_path: &str,
        project_default_menus: Vec<String>,
        project_default_scope: String,
        site_name: String,
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
            site_name,
            supported_languages,
            show_user_email,
        }
    }
}

pub(crate) const LEGACY_LOGIN_INVALID_MESSAGE: &str = "user.login.invalid";
pub(crate) const LEGACY_LOGIN_REQUIRED_MESSAGE: &str = "user.login.required";
pub(crate) const LEGACY_MIN_PASSWORD_LENGTH: usize = 4;
