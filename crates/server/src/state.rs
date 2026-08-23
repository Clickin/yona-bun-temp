use axum::http::HeaderMap;
use http::StatusCode;
use serde::Serialize;
use std::{
    collections::{BTreeMap, HashMap},
    path::PathBuf,
    sync::{atomic::AtomicBool, LazyLock, Mutex},
};

use crate::runtime_config::normalize_base_path;
use crate::session::SessionManager;
use crate::{
    AppRuntimeConfig, AuthUiConfig, LdapRuntimeConfig, OAuthRuntimeConfig, PilotRepository,
    SiteUpdateConfig, SmtpRuntimeConfig, TranslationProxyConfig,
};
use yoram_integrations::IntegrationConfig;

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

pub(crate) fn site_import_staging_lock() -> &'static tokio::sync::Mutex<()> {
    static LOCK: LazyLock<tokio::sync::Mutex<()>> = LazyLock::new(|| tokio::sync::Mutex::new(()));
    &LOCK
}

/// Namespace mutation lock: serializes every operation that can claim an
/// owner/project repository destination path (project create, rename,
/// transfer, organization rename, delete staging transition, VCS type
/// change). A per-project lock alone cannot stop two different project IDs
/// racing for the same destination path.
///
/// Acquisition order is ALWAYS: 1) this namespace lock, then 2) affected
/// project locks from [`project_repository_lock`] in ascending project_id
/// order. Single-process scope only.
pub(crate) fn repository_namespace_lock() -> &'static tokio::sync::Mutex<()> {
    static LOCK: LazyLock<tokio::sync::Mutex<()>> = LazyLock::new(|| tokio::sync::Mutex::new(()));
    &LOCK
}

/// Project-ID-keyed exclusive/shared repository lease. Shared read guards
/// keep the physical repository path stable for smart-http/SVN dispatch and
/// code-browser reads; exclusive write guards cover rename, transfer,
/// delete, VCS type change, and organization rename. Entries are removed
/// once the last guard drops so the registry cannot grow indefinitely.
pub(crate) fn project_repository_lock(project_id: i64) -> std::sync::Arc<tokio::sync::RwLock<()>> {
    static LOCKS: LazyLock<Mutex<HashMap<i64, std::sync::Weak<tokio::sync::RwLock<()>>>>> =
        LazyLock::new(|| Mutex::new(HashMap::new()));
    let mut locks = LOCKS
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    locks.retain(|_, weak| weak.upgrade().is_some());
    let lock = match locks.get(&project_id).and_then(std::sync::Weak::upgrade) {
        Some(lock) => lock,
        None => {
            let lock = std::sync::Arc::new(tokio::sync::RwLock::new(()));
            locks.insert(project_id, std::sync::Arc::downgrade(&lock));
            lock
        }
    };
    lock
}

/// Held across repository lifecycle mutations. Acquisition order: namespace
/// mutation lock first, then exclusive project locks in ascending project_id
/// order.
pub(crate) struct ProjectMutationLocks {
    _namespace: tokio::sync::OwnedMutexGuard<()>,
    _projects: Vec<tokio::sync::OwnedRwLockWriteGuard<()>>,
}

pub(crate) async fn lock_projects_for_mutation(project_ids: Vec<i64>) -> ProjectMutationLocks {
    let mut ids = project_ids;
    ids.sort_unstable();
    ids.dedup();
    static NAMESPACE: LazyLock<std::sync::Arc<tokio::sync::Mutex<()>>> =
        LazyLock::new(|| std::sync::Arc::new(tokio::sync::Mutex::new(())));
    let namespace = std::sync::Arc::clone(&NAMESPACE).lock_owned().await;
    let mut projects = Vec::with_capacity(ids.len());
    for id in ids {
        projects.push(project_repository_lock(id).write_owned().await);
    }
    ProjectMutationLocks {
        _namespace: namespace,
        _projects: projects,
    }
}

#[derive(Clone)]
pub(crate) struct RuntimeRegistry {
    pub(crate) auth_ui: AuthUiConfig,
    pub(crate) password_hashing_silent_migration_to_argon2id: bool,
    pub(crate) data_root: PathBuf,
    pub(crate) integrations: IntegrationConfig,
    pub(crate) ldap: LdapRuntimeConfig,
    pub(crate) max_uploaded_file_size: usize,
    pub(crate) oauth: OAuthRuntimeConfig,
    pub(crate) project_default_scope: String,
    pub(crate) site_name: String,
    pub(crate) site_update: SiteUpdateConfig,
    pub(crate) slack_webhook_colors: BTreeMap<String, String>,
    pub(crate) show_user_email: bool,
    pub(crate) smtp: SmtpRuntimeConfig,
    pub(crate) supported_languages: Vec<String>,
    pub(crate) translation_proxy: TranslationProxyConfig,
}

impl RuntimeRegistry {
    pub(crate) fn from_app_config(config: &AppRuntimeConfig) -> Self {
        Self {
            auth_ui: config.auth_ui.clone(),
            password_hashing_silent_migration_to_argon2id: config
                .password_hashing_silent_migration_to_argon2id,
            data_root: config.data_root.clone(),
            integrations: config.integrations.clone(),
            ldap: config.ldap.clone(),
            max_uploaded_file_size: config.max_uploaded_file_size,
            oauth: config.oauth.clone(),
            project_default_scope: config.project_default_scope.clone(),
            site_name: config.site_name.clone(),
            site_update: config.site_update.clone(),
            slack_webhook_colors: config.slack_webhook_colors.clone(),
            show_user_email: config.show_user_email,
            smtp: config.smtp.clone(),
            supported_languages: config.supported_languages.clone(),
            translation_proxy: config.translation_proxy.clone(),
        }
    }
}

#[derive(Clone)]
pub(crate) struct PilotServiceImpl {
    pub(crate) auth_ui: AuthUiConfig,
    pub(crate) base_path: String,
    pub(crate) password_hashing_silent_migration_to_argon2id: bool,
    pub(crate) data_root: PathBuf,
    pub(crate) public_origin: String,
    pub(crate) integrations: IntegrationConfig,
    pub(crate) ldap: LdapRuntimeConfig,
    pub(crate) max_uploaded_file_size: usize,
    pub(crate) oauth: OAuthRuntimeConfig,
    pub(crate) session_manager: SessionManager,
    pub(crate) backend: PilotBackend,
    pub(crate) project_default_scope: String,
    pub(crate) site_name: String,
    pub(crate) site_update: SiteUpdateConfig,
    pub(crate) slack_webhook_colors: BTreeMap<String, String>,
    pub(crate) show_user_email: bool,
    pub(crate) smtp: SmtpRuntimeConfig,
    pub(crate) supported_languages: Vec<String>,
    pub(crate) translation_proxy: TranslationProxyConfig,
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
    #[serde(rename = "feedbackUrl")]
    feedback_url: String,
    #[serde(rename = "hideProjectListing")]
    hide_project_listing: bool,
    #[serde(rename = "maxUploadedFileSize")]
    max_uploaded_file_size: usize,
    #[serde(rename = "navbarCustomLinkName")]
    navbar_custom_link_name: String,
    #[serde(rename = "navbarCustomLinkUrl")]
    navbar_custom_link_url: String,
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
    #[serde(skip)]
    send_yona_usage: bool,
}

impl BrowserRuntimeConfig {
    pub(crate) fn base_path(&self) -> &str {
        &self.base_path
    }

    pub(crate) fn from_base_path(
        base_path: &str,
        project_default_menus: Vec<String>,
        project_default_scope: String,
        feedback_url: String,
        hide_project_listing: bool,
        max_uploaded_file_size: usize,
        navbar_custom_link_name: String,
        navbar_custom_link_url: String,
        site_name: String,
        supported_languages: Vec<String>,
        show_user_email: bool,
        send_yona_usage: bool,
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
            feedback_url,
            hide_project_listing,
            max_uploaded_file_size,
            navbar_custom_link_name,
            navbar_custom_link_url,
            project_default_menus,
            project_default_scope,
            site_name,
            supported_languages,
            show_user_email,
            send_yona_usage,
        }
    }

    pub(crate) fn send_yona_usage(&self) -> bool {
        self.send_yona_usage
    }
}

pub(crate) const LEGACY_LOGIN_INVALID_MESSAGE: &str = "user.login.invalid";
pub(crate) const LEGACY_LOGIN_REQUIRED_MESSAGE: &str = "user.login.required";
pub(crate) const LEGACY_MIN_PASSWORD_LENGTH: usize = 4;

#[cfg(test)]
mod lock_tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn exclusive_project_lock_blocks_shared_readers() {
        let _mutation = lock_projects_for_mutation(vec![7, 3]).await;
        let lock = project_repository_lock(3);
        let blocked = tokio::time::timeout(Duration::from_millis(50), lock.read()).await;
        assert!(
            blocked.is_err(),
            "shared reader must be blocked while the exclusive mutation lock is held"
        );
        drop(_mutation);
        let lock = project_repository_lock(3);
        let acquired = tokio::time::timeout(Duration::from_millis(50), lock.read()).await;
        assert!(
            acquired.is_ok(),
            "shared reader must proceed after mutation completes"
        );
    }
}
