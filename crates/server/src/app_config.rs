use crate::runtime_config;
use crate::{
    auth_social_providers_from_option, configured_auth_social_providers, configured_bool_env,
    configured_env_value, configured_max_uploaded_file_size, configured_project_default_menus,
    configured_project_default_scope, configured_site_name, configured_supported_languages,
    configured_trimmed_string, default_project_menu_keys, default_supported_languages,
    max_uploaded_file_size_from_option, project_default_menus_from_option,
    project_default_scope_from_option, site_name_from_option, supported_languages_from_option,
    trimmed_option, LEGACY_DEFAULT_MAX_FILE_SIZE,
};
use yona_rust_integrations::IntegrationConfig;

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
    pub integrations: IntegrationConfig,
    pub max_uploaded_file_size: usize,
    pub project_default_menus: Vec<String>,
    pub project_default_scope: String,
    pub session_timeout_seconds: Option<u64>,
    pub show_user_email: bool,
    pub site_name: String,
    pub site_update: SiteUpdateConfig,
    pub smtp: SmtpRuntimeConfig,
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
    pub(crate) fn from_startup(config: &runtime_config::StartupConfig) -> Self {
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

    pub(crate) fn from_env() -> Self {
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
pub struct SmtpRuntimeConfig {
    pub domain: String,
    pub from: String,
    pub host: String,
    pub password: String,
    pub site_hostname: String,
    pub user: String,
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
            integrations: IntegrationConfig::default(),
            max_uploaded_file_size: LEGACY_DEFAULT_MAX_FILE_SIZE,
            project_default_menus: default_project_menu_keys(),
            project_default_scope: "public".to_string(),
            session_timeout_seconds: None,
            show_user_email: true,
            site_name: "Yona".to_string(),
            site_update: SiteUpdateConfig::default(),
            smtp: SmtpRuntimeConfig::default(),
            supported_languages: default_supported_languages(),
            translation_proxy: TranslationProxyConfig::default(),
        }
    }
}

impl AppRuntimeConfig {
    pub fn from_startup(config: &runtime_config::StartupConfig) -> Self {
        Self {
            auth_ui: AuthUiConfig::from_startup(config),
            integrations: integration_config_from_startup(config),
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
            smtp: SmtpRuntimeConfig::from_startup(config),
            supported_languages: supported_languages_from_option(
                config.supported_languages.as_deref(),
            ),
            translation_proxy: TranslationProxyConfig::from_startup(config),
        }
    }

    pub(crate) fn from_env() -> Self {
        Self {
            auth_ui: AuthUiConfig::from_env(),
            integrations: IntegrationConfig::from_env(),
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
            smtp: SmtpRuntimeConfig::from_env(),
            supported_languages: configured_supported_languages(),
            translation_proxy: TranslationProxyConfig::from_env(),
        }
    }
}

fn integration_config_from_startup(config: &runtime_config::StartupConfig) -> IntegrationConfig {
    let mut pairs = Vec::new();
    if let Some(delivery_retries) = config.webhook_delivery_retries {
        pairs.push((
            "YONA_WEBHOOK_DELIVERY_RETRIES".to_string(),
            delivery_retries.to_string(),
        ));
    }
    if let Some(allow_private_networks) = config.webhook_allow_private_networks {
        pairs.push((
            "YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS".to_string(),
            allow_private_networks.to_string(),
        ));
    }
    IntegrationConfig::from_pairs(pairs)
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

    pub(crate) fn from_env() -> Self {
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

impl SmtpRuntimeConfig {
    pub(crate) fn from_startup(config: &runtime_config::StartupConfig) -> Self {
        Self {
            domain: trimmed_option(config.smtp_domain.as_deref()).unwrap_or_default(),
            from: trimmed_option(config.smtp_from.as_deref()).unwrap_or_default(),
            host: trimmed_option(config.smtp_host.as_deref()).unwrap_or_default(),
            password: trimmed_option(config.smtp_password.as_deref()).unwrap_or_default(),
            site_hostname: trimmed_option(config.site_hostname.as_deref()).unwrap_or_default(),
            user: trimmed_option(config.smtp_user.as_deref()).unwrap_or_default(),
        }
    }

    pub(crate) fn from_env() -> Self {
        Self {
            domain: configured_env_value(&["SMTP_DOMAIN", "YONA_SMTP_DOMAIN"]).unwrap_or_default(),
            from: configured_env_value(&["SMTP_FROM", "YONA_SMTP_FROM"]).unwrap_or_default(),
            host: configured_env_value(&["SMTP_HOST", "YONA_SMTP_HOST"]).unwrap_or_default(),
            password: configured_env_value(&["SMTP_PASSWORD", "SMTP_PASS", "YONA_SMTP_PASSWORD"])
                .unwrap_or_default(),
            site_hostname: configured_env_value(&[
                "YONA_APPLICATION_HOSTNAME",
                "APPLICATION_HOSTNAME",
            ])
            .unwrap_or_default(),
            user: configured_env_value(&["SMTP_USER", "YONA_SMTP_USER"]).unwrap_or_default(),
        }
    }

    pub(crate) fn default_from(&self) -> String {
        trimmed_option(Some(&self.from))
            .or_else(|| self.sender_from_user_and_domain())
            .unwrap_or_else(|| "noreply@yona.local".to_string())
    }

    pub(crate) fn not_configured_items(&self) -> Vec<String> {
        [
            ("smtp.host", self.host.as_str()),
            ("smtp.user", self.user.as_str()),
            ("smtp.password", self.password.as_str()),
        ]
        .into_iter()
        .filter(|(_, value)| value.trim().is_empty())
        .map(|(label, _)| label.to_string())
        .collect()
    }

    fn sender_from_user_and_domain(&self) -> Option<String> {
        let user = trimmed_option(Some(&self.user))?;
        if user.contains('@') {
            return Some(user.to_string());
        }
        let domain = trimmed_option(Some(&self.domain))
            .or_else(|| trimmed_option(Some(&self.site_hostname)))
            .unwrap_or_else(|| "localhost".to_string());
        Some(format!("{user}@{domain}"))
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

fn configured_session_timeout_seconds() -> Option<u64> {
    std::env::var("YONA_SESSION_TIMEOUT_SECONDS")
        .ok()
        .and_then(|value| value.trim().parse::<u64>().ok())
}
