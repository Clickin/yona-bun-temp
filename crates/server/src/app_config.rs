use crate::persistence::RepositoryConfig;
use crate::runtime_config;
use crate::{
    auth_social_providers_from_option, default_project_menu_keys, default_supported_languages,
    max_uploaded_file_size_from_option, project_default_menus_from_option,
    project_default_scope_from_option, site_name_from_option, supported_languages_from_option,
    trimmed_option, LEGACY_DEFAULT_MAX_FILE_SIZE,
};
use std::collections::BTreeMap;
use std::path::PathBuf;
use yoram_integrations::IntegrationConfig;

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
            base_path: "/".to_string(),
            public_origin: String::new(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AppRuntimeConfig {
    pub auth_ui: AuthUiConfig,
    pub password_hashing_silent_migration_to_argon2id: bool,
    pub data_root: PathBuf,
    pub integrations: IntegrationConfig,
    pub ldap: LdapRuntimeConfig,
    pub max_uploaded_file_size: usize,
    pub feedback_url: String,
    pub hide_project_listing: bool,
    pub navbar_custom_link_name: String,
    pub navbar_custom_link_url: String,
    pub oauth: OAuthRuntimeConfig,
    pub project_default_menus: Vec<String>,
    pub project_default_scope: String,
    pub session_timeout_seconds: Option<u64>,
    pub send_yona_usage: bool,
    pub show_user_email: bool,
    pub site_name: String,
    pub site_update: SiteUpdateConfig,
    pub slack_webhook_colors: BTreeMap<String, String>,
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

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct OAuthRuntimeConfig {
    pub providers: BTreeMap<String, OAuthProviderRuntimeConfig>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct OAuthProviderRuntimeConfig {
    pub access_token_url: String,
    pub authorization_url: String,
    pub client_id: String,
    pub client_secret: String,
    pub email_url: String,
    pub scope: String,
    pub user_info_url: String,
}

impl OAuthRuntimeConfig {
    pub fn from_providers<I, K>(providers: I) -> Self
    where
        I: IntoIterator<Item = (K, OAuthProviderRuntimeConfig)>,
        K: Into<String>,
    {
        Self {
            providers: providers
                .into_iter()
                .map(|(provider, config)| (provider.into(), config))
                .collect(),
        }
    }

    pub(crate) fn configured_provider(
        &self,
        provider: &str,
    ) -> Option<&OAuthProviderRuntimeConfig> {
        self.providers.get(&provider.to_ascii_lowercase())
    }

    pub(crate) fn from_startup(config: &runtime_config::StartupConfig) -> Self {
        let providers = config
            .oauth_providers
            .clone()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|(provider, config)| {
                let provider = provider.trim().to_ascii_lowercase();
                if provider.is_empty() {
                    return None;
                }
                Some((
                    provider.clone(),
                    OAuthProviderRuntimeConfig {
                        access_token_url: trimmed_option(config.access_token_url.as_deref())
                            .unwrap_or_else(|| default_oauth_access_token_url(&provider)),
                        authorization_url: trimmed_option(config.authorization_url.as_deref())
                            .unwrap_or_else(|| default_oauth_authorization_url(&provider)),
                        client_id: trimmed_option(config.client_id.as_deref()).unwrap_or_default(),
                        client_secret: trimmed_option(config.client_secret.as_deref())
                            .unwrap_or_default(),
                        email_url: trimmed_option(config.email_url.as_deref())
                            .unwrap_or_else(|| default_oauth_email_url(&provider)),
                        scope: trimmed_option(config.scope.as_deref())
                            .unwrap_or_else(|| default_oauth_scope(&provider)),
                        user_info_url: trimmed_option(config.user_info_url.as_deref())
                            .unwrap_or_else(|| default_oauth_user_info_url(&provider)),
                    },
                ))
            })
            .collect();
        Self { providers }
    }
}

fn default_oauth_access_token_url(provider: &str) -> String {
    match provider {
        "google" => "https://oauth2.googleapis.com/token",
        "github" => "https://github.com/login/oauth/access_token",
        _ => "",
    }
    .to_string()
}

fn default_oauth_authorization_url(provider: &str) -> String {
    match provider {
        "google" => "https://accounts.google.com/o/oauth2/auth",
        "github" => "https://github.com/login/oauth/authorize",
        _ => "",
    }
    .to_string()
}

fn default_oauth_email_url(provider: &str) -> String {
    match provider {
        "github" => "https://api.github.com/user/emails",
        _ => "",
    }
    .to_string()
}

fn default_oauth_scope(provider: &str) -> String {
    match provider {
        "google" => "profile email",
        "github" => "user:email",
        _ => "",
    }
    .to_string()
}

fn default_oauth_user_info_url(provider: &str) -> String {
    match provider {
        "google" => "https://www.googleapis.com/oauth2/v3/userinfo",
        "github" => "https://api.github.com/user",
        _ => "",
    }
    .to_string()
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LdapRuntimeConfig {
    pub base_dn: String,
    pub display_name_property: String,
    pub distinguished_name_postfix: String,
    pub email_property: String,
    pub enabled: bool,
    pub english_name_attribute_name: String,
    pub fallback_to_local_login: bool,
    pub fixture_users: Vec<LdapFixtureUser>,
    pub host: String,
    pub login_property: String,
    pub port: u16,
    pub protocol: String,
    pub use_email_base_login: bool,
    pub user_name_property: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LdapFixtureUser {
    pub department: String,
    pub display_name: String,
    pub email: String,
    pub english_name: String,
    pub login_id: String,
    pub password: String,
}

impl Default for LdapRuntimeConfig {
    fn default() -> Self {
        Self {
            base_dn: String::new(),
            display_name_property: "displayName".to_string(),
            distinguished_name_postfix: String::new(),
            email_property: "mail".to_string(),
            enabled: false,
            english_name_attribute_name: String::new(),
            fallback_to_local_login: false,
            fixture_users: Vec::new(),
            host: "127.0.0.1".to_string(),
            login_property: "sAMAccountName".to_string(),
            port: 389,
            protocol: "ldap".to_string(),
            use_email_base_login: false,
            user_name_property: "CN".to_string(),
        }
    }
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
            password_hashing_silent_migration_to_argon2id: false,
            data_root: PathBuf::from(".yona-data"),
            integrations: IntegrationConfig::default(),
            ldap: LdapRuntimeConfig::default(),
            max_uploaded_file_size: LEGACY_DEFAULT_MAX_FILE_SIZE,
            feedback_url: String::new(),
            hide_project_listing: false,
            navbar_custom_link_name: String::new(),
            navbar_custom_link_url: String::new(),
            oauth: OAuthRuntimeConfig::default(),
            project_default_menus: default_project_menu_keys(),
            project_default_scope: "public".to_string(),
            session_timeout_seconds: None,
            send_yona_usage: false,
            show_user_email: true,
            site_name: site_name_from_option(None),
            site_update: SiteUpdateConfig::default(),
            slack_webhook_colors: BTreeMap::new(),
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
            password_hashing_silent_migration_to_argon2id: config
                .auth_hashing_silent_migration_to_argon2id
                .unwrap_or(false),
            data_root: config
                .data_root
                .as_deref()
                .map(PathBuf::from)
                .unwrap_or_else(|| PathBuf::from(".yona-data")),
            integrations: integration_config_from_startup(config),
            ldap: LdapRuntimeConfig::from_startup(config),
            max_uploaded_file_size: max_uploaded_file_size_from_option(config.max_file_size),
            feedback_url: trimmed_option(config.feedback_url.as_deref()).unwrap_or_default(),
            hide_project_listing: config.hide_project_listing.unwrap_or(false),
            navbar_custom_link_name: trimmed_option(config.navbar_custom_link_name.as_deref())
                .unwrap_or_default(),
            navbar_custom_link_url: trimmed_option(config.navbar_custom_link_url.as_deref())
                .unwrap_or_default(),
            oauth: OAuthRuntimeConfig::from_startup(config),
            project_default_menus: project_default_menus_from_option(
                config.project_default_menus.as_deref(),
            ),
            project_default_scope: project_default_scope_from_option(
                config.project_default_scope.as_deref(),
            ),
            session_timeout_seconds: config.session_timeout_seconds,
            send_yona_usage: config.send_yona_usage.unwrap_or(false),
            show_user_email: config.show_user_email.unwrap_or(true),
            site_name: site_name_from_option(config.site_name.as_deref()),
            site_update: SiteUpdateConfig::from_startup(config),
            slack_webhook_colors: config.slack_webhook_colors.clone(),
            smtp: SmtpRuntimeConfig::from_startup(config),
            supported_languages: supported_languages_from_option(
                config.supported_languages.as_deref(),
            ),
            translation_proxy: TranslationProxyConfig::from_startup(config),
        }
    }
}

impl LdapRuntimeConfig {
    pub(crate) fn from_startup(config: &runtime_config::StartupConfig) -> Self {
        let defaults = Self::default();
        Self {
            base_dn: trimmed_option(config.ldap_base_dn.as_deref()).unwrap_or_default(),
            display_name_property: trimmed_option(config.ldap_display_name_property.as_deref())
                .unwrap_or(defaults.display_name_property),
            distinguished_name_postfix: trimmed_option(
                config.ldap_distinguished_name_postfix.as_deref(),
            )
            .unwrap_or_default(),
            email_property: trimmed_option(config.ldap_email_property.as_deref())
                .unwrap_or(defaults.email_property),
            enabled: config.ldap_enabled.unwrap_or(false),
            english_name_attribute_name: trimmed_option(
                config.ldap_english_name_attribute_name.as_deref(),
            )
            .unwrap_or_default(),
            fallback_to_local_login: config.ldap_fallback_to_local_login.unwrap_or(false),
            fixture_users: config
                .ldap_fixture_users
                .clone()
                .unwrap_or_default()
                .into_iter()
                .map(|user| LdapFixtureUser {
                    department: trimmed_option(user.department.as_deref()).unwrap_or_default(),
                    display_name: user.display_name.trim().to_string(),
                    email: user.email.trim().to_string(),
                    english_name: trimmed_option(user.english_name.as_deref()).unwrap_or_default(),
                    login_id: user.login_id.trim().to_string(),
                    password: user.password,
                })
                .collect(),
            host: trimmed_option(config.ldap_host.as_deref()).unwrap_or(defaults.host),
            login_property: trimmed_option(config.ldap_login_property.as_deref())
                .unwrap_or(defaults.login_property),
            port: config.ldap_port.unwrap_or(defaults.port),
            protocol: trimmed_option(config.ldap_protocol.as_deref()).unwrap_or(defaults.protocol),
            use_email_base_login: config.ldap_use_email_base_login.unwrap_or(false),
            user_name_property: trimmed_option(config.ldap_user_name_property.as_deref())
                .unwrap_or(defaults.user_name_property),
        }
    }
}

pub(crate) fn integration_config_from_startup(
    config: &runtime_config::StartupConfig,
) -> IntegrationConfig {
    let mut pairs = Vec::new();
    if let Some(host) = &config.smtp_host {
        pairs.push(("YONA_SMTP_HOST".to_string(), host.clone()));
    }
    if let Some(port) = config.smtp_port {
        pairs.push(("YONA_SMTP_PORT".to_string(), port.to_string()));
    }
    if let Some(ssl) = config.smtp_ssl {
        pairs.push(("YONA_SMTP_SSL".to_string(), ssl.to_string()));
    }
    if let Some(user) = &config.smtp_user {
        pairs.push(("YONA_SMTP_USER".to_string(), user.clone()));
    }
    if let Some(password) = &config.smtp_password {
        pairs.push(("YONA_SMTP_PASSWORD".to_string(), password.clone()));
    }
    if let Some(domain) = &config.smtp_domain {
        pairs.push(("YONA_SMTP_DOMAIN".to_string(), domain.clone()));
    }
    if let Some(from) = &config.smtp_from {
        pairs.push(("YONA_SMTP_FROM".to_string(), from.clone()));
    }
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

pub fn repository_config_from_startup(config: &runtime_config::StartupConfig) -> RepositoryConfig {
    let mut pairs = Vec::new();
    if let Some(guest_login_prefix) = &config.guest_login_prefix {
        pairs.push((
            "YONA_GUEST_LOGIN_PREFIX".to_string(),
            guest_login_prefix.clone(),
        ));
    }
    if let Some(stable_list_cache) = &config.stable_list_cache {
        pairs.push((
            "YONA_STABLE_LIST_CACHE".to_string(),
            stable_list_cache.clone(),
        ));
    }
    if let Some(notification_draft_time) = &config.notification_draft_time {
        pairs.push((
            "YONA_NOTIFICATION_DRAFT_TIME".to_string(),
            notification_draft_time.clone(),
        ));
    }
    if let Some(issue_event_draft_time) = &config.issue_event_draft_time {
        pairs.push((
            "YONA_ISSUE_EVENT_DRAFT_TIME".to_string(),
            issue_event_draft_time.clone(),
        ));
    }
    if let Some(default_menus) = &config.project_default_menus {
        pairs.push((
            "YONA_PROJECT_DEFAULT_MENUS".to_string(),
            default_menus.join(","),
        ));
    }
    RepositoryConfig::from_pairs(pairs)
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

    pub(crate) fn default_from(&self) -> String {
        trimmed_option(Some(&self.from))
            .or_else(|| self.sender_from_user_and_domain())
            .unwrap_or_else(|| "noreply@yoram.local".to_string())
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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn application_and_smtp_defaults_use_yoram_identity() {
        let defaults = AppRuntimeConfig::default();
        assert_eq!(defaults.site_name, "Yoram");
        assert!(!defaults.send_yona_usage);
        assert_eq!(
            SmtpRuntimeConfig::default().default_from(),
            "noreply@yoram.local"
        );
    }
}
