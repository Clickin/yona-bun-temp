use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::Deserialize;
use yona_rust_pilot_migration::RuntimeSchemaPolicy;

use crate::RuntimeConfig;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StartupConfig {
    pub asset_root: Option<String>,
    pub auth_email_verification_enabled: Option<bool>,
    pub auth_login_id_placeholder: Option<String>,
    pub auth_password_placeholder: Option<String>,
    pub auth_signup_require_confirm: Option<bool>,
    pub auth_social_login_only: Option<bool>,
    pub allowed_sending_mail_domains: Option<Vec<String>>,
    pub bind_addr: String,
    pub database_url: String,
    pub guest_login_prefix: Option<String>,
    pub issue_event_draft_time: Option<String>,
    pub mailbox_fetch_command: Option<String>,
    pub mailbox_imap_address: Option<String>,
    pub mailbox_polling_enabled: Option<bool>,
    pub mailbox_polling_initial_delay: Option<String>,
    pub mailbox_polling_interval: Option<String>,
    pub max_file_size: Option<usize>,
    pub project_default_menus: Option<Vec<String>>,
    pub project_default_scope: Option<String>,
    pub runtime: RuntimeConfig,
    pub schema_policy: RuntimeSchemaPolicy,
    pub seed_pilot: bool,
    pub session_timeout_seconds: Option<u64>,
    pub show_user_email: Option<bool>,
    pub site_allow_anonymous_access: Option<bool>,
    pub site_hostname: Option<String>,
    pub site_name: Option<String>,
    pub smtp_domain: Option<String>,
    pub smtp_from: Option<String>,
    pub smtp_host: Option<String>,
    pub smtp_password: Option<String>,
    pub smtp_port: Option<u16>,
    pub smtp_ssl: Option<bool>,
    pub smtp_user: Option<String>,
    pub supported_languages: Option<Vec<String>>,
    pub update_current_version: Option<String>,
    pub update_error: Option<String>,
    pub update_https_fetch_command: Option<String>,
    pub update_latest_version: Option<String>,
    pub update_metadata_file: Option<String>,
    pub update_metadata_url: Option<String>,
    pub update_release_url: Option<String>,
    pub update_version: Option<String>,
    pub webhook_allow_private_networks: Option<bool>,
    pub webhook_delivery_retries: Option<usize>,
    pub notification_mail_delay: Option<String>,
    pub notification_mail_enabled: Option<bool>,
    pub notification_mail_hide_address: Option<bool>,
    pub notification_mail_initial_delay: Option<String>,
    pub notification_mail_interval: Option<String>,
    pub notification_mail_recipient_limit: Option<usize>,
    pub notification_draft_time: Option<String>,
    pub use_embedded_assets: bool,
}

#[derive(Default, Deserialize)]
struct StartupConfigFile {
    asset_root: Option<String>,
    auth: Option<AuthConfigFile>,
    base_path: Option<String>,
    bind_addr: Option<String>,
    database: Option<DatabaseConfigFile>,
    issue: Option<IssueConfigFile>,
    mailbox: Option<MailboxConfigFile>,
    database_url: Option<String>,
    project: Option<ProjectConfigFile>,
    public_origin: Option<String>,
    notification: Option<NotificationConfigFile>,
    schema_policy: Option<String>,
    seed_pilot: Option<bool>,
    session: Option<SessionConfigFile>,
    show_user_email: Option<bool>,
    site: Option<SiteConfigFile>,
    smtp: Option<SmtpConfigFile>,
    update: Option<UpdateConfigFile>,
    use_embedded_assets: Option<bool>,
    webhook: Option<WebhookConfigFile>,
}

#[derive(Default, Deserialize)]
struct SiteConfigFile {
    allow_anonymous_access: Option<bool>,
    allowed_sending_mail_domains: Option<Vec<String>>,
    base_path: Option<String>,
    guest_login_prefix: Option<String>,
    hostname: Option<String>,
    langs: Option<Vec<String>>,
    name: Option<String>,
    show_user_email: Option<bool>,
}

#[derive(Default, Deserialize)]
struct AuthConfigFile {
    email_verification: Option<bool>,
    login_id_placeholder: Option<String>,
    password_placeholder: Option<String>,
    signup_require_confirm: Option<bool>,
    social_login_only: Option<bool>,
}

#[derive(Default, Deserialize)]
struct SessionConfigFile {
    max_age: Option<u64>,
}

#[derive(Default, Deserialize)]
struct DatabaseConfigFile {
    url: Option<String>,
}

#[derive(Default, Deserialize)]
struct IssueConfigFile {
    event_draft_time: Option<String>,
}

#[derive(Default, Deserialize)]
struct MailboxConfigFile {
    fetch_command: Option<String>,
    imap_address: Option<String>,
    polling_enabled: Option<bool>,
    polling_initial_delay: Option<String>,
    polling_interval: Option<String>,
}

#[derive(Default, Deserialize)]
struct ProjectConfigFile {
    default_menus: Option<Vec<String>>,
    default_scope: Option<String>,
    max_file_size: Option<usize>,
}

#[derive(Default, Deserialize)]
struct SmtpConfigFile {
    domain: Option<String>,
    from: Option<String>,
    host: Option<String>,
    password: Option<String>,
    port: Option<u16>,
    ssl: Option<bool>,
    user: Option<String>,
}

#[derive(Default, Deserialize)]
struct UpdateConfigFile {
    current_version: Option<String>,
    error: Option<String>,
    https_fetch_command: Option<String>,
    latest_version: Option<String>,
    metadata_file: Option<String>,
    metadata_url: Option<String>,
    release_url: Option<String>,
    version: Option<String>,
}

#[derive(Default, Deserialize)]
struct WebhookConfigFile {
    allow_private_networks: Option<bool>,
    delivery_retries: Option<usize>,
}

#[derive(Default, Deserialize)]
struct NotificationConfigFile {
    draft_time: Option<String>,
    hide_address: Option<bool>,
    mail_delay: Option<String>,
    mail_enabled: Option<bool>,
    mail_initial_delay: Option<String>,
    mail_interval: Option<String>,
    recipient_limit: Option<usize>,
}

pub fn load_startup_config(
    env: BTreeMap<String, String>,
    current_dir: &Path,
) -> anyhow::Result<StartupConfig> {
    let file = read_startup_config_file(&env, current_dir)?;
    let site = file.site.unwrap_or_default();
    let auth = file.auth.unwrap_or_default();
    let database = file.database.unwrap_or_default();
    let issue = file.issue.unwrap_or_default();
    let mailbox = file.mailbox.unwrap_or_default();
    let notification = file.notification.unwrap_or_default();
    let project = file.project.unwrap_or_default();
    let session = file.session.unwrap_or_default();
    let smtp = file.smtp.unwrap_or_default();
    let update = file.update.unwrap_or_default();
    let webhook = file.webhook.unwrap_or_default();

    let base_path = env
        .get("YONA_BASE_PATH")
        .cloned()
        .or(file.base_path)
        .or(site.base_path)
        .unwrap_or_default();
    let public_origin = env
        .get("YONA_PUBLIC_ORIGIN")
        .cloned()
        .or(file.public_origin)
        .unwrap_or_default();
    let bind_addr = env
        .get("YONA_BIND_ADDR")
        .cloned()
        .or(file.bind_addr)
        .unwrap_or_else(|| "127.0.0.1:8089".to_string());
    let database_url = env
        .get("YONA_DATABASE_URL")
        .cloned()
        .or(file.database_url)
        .or(database.url)
        .unwrap_or_else(|| "sqlite::memory:".to_string());

    let schema_policy = env
        .get("YONA_SCHEMA_POLICY")
        .cloned()
        .or(file.schema_policy)
        .unwrap_or_else(|| "up".to_string())
        .parse::<RuntimeSchemaPolicy>()
        .map_err(anyhow::Error::msg)?;

    let seed_pilot = env_bool(&env, "YONA_SEED_PILOT")
        .or(file.seed_pilot)
        .unwrap_or(false);
    let site_name = env_string(&env, "YONA_SITE_NAME").or_else(|| non_empty_string(site.name));
    let site_allow_anonymous_access =
        env_bool(&env, "YONA_ALLOW_ANONYMOUS_ACCESS").or(site.allow_anonymous_access);
    let site_hostname =
        env_string(&env, "YONA_APPLICATION_HOSTNAME").or_else(|| non_empty_string(site.hostname));
    let allowed_sending_mail_domains = env_string(&env, "YONA_ALLOWED_MAIL_DOMAINS")
        .map(|value| split_csv(&value))
        .or(site.allowed_sending_mail_domains);
    let guest_login_prefix =
        env_string(&env, "YONA_GUEST_LOGIN_PREFIX").or(site.guest_login_prefix);
    let supported_languages = env_string(&env, "YONA_LANGS")
        .map(|value| split_csv(&value))
        .or(site.langs);
    let show_user_email = env_bool(&env, "YONA_SHOW_USER_EMAIL")
        .or(file.show_user_email)
        .or(site.show_user_email);
    let auth_email_verification_enabled =
        env_bool(&env, "YONA_AUTH_EMAIL_VERIFICATION_ENABLED").or(auth.email_verification);
    let auth_login_id_placeholder = env_string(&env, "YONA_AUTH_LOGIN_ID_PLACEHOLDER")
        .or_else(|| non_empty_string(auth.login_id_placeholder));
    let auth_password_placeholder = env_string(&env, "YONA_AUTH_PASSWORD_PLACEHOLDER")
        .or_else(|| non_empty_string(auth.password_placeholder));
    let auth_signup_require_confirm =
        env_bool(&env, "YONA_AUTH_SIGNUP_REQUIRE_CONFIRM").or(auth.signup_require_confirm);
    let auth_social_login_only =
        env_bool(&env, "YONA_AUTH_SOCIAL_LOGIN_ONLY").or(auth.social_login_only);
    let session_timeout_seconds = env
        .get("YONA_SESSION_TIMEOUT_SECONDS")
        .and_then(|value| value.trim().parse::<u64>().ok())
        .or(session.max_age);
    let issue_event_draft_time = env_string(&env, "YONA_ISSUE_EVENT_DRAFT_TIME")
        .or_else(|| non_empty_string(issue.event_draft_time));
    let mailbox_fetch_command = env_string(&env, "YONA_MAILBOX_FETCH_COMMAND")
        .or_else(|| non_empty_string(mailbox.fetch_command));
    let mailbox_imap_address = env_string(&env, "YONA_MAILBOX_IMAP_ADDRESS")
        .or_else(|| non_empty_string(mailbox.imap_address));
    let mailbox_polling_enabled =
        env_bool(&env, "YONA_MAILBOX_POLLING_ENABLED").or(mailbox.polling_enabled);
    let mailbox_polling_initial_delay = env_string(&env, "YONA_MAILBOX_POLLING_INITIAL_DELAY")
        .or_else(|| non_empty_string(mailbox.polling_initial_delay));
    let mailbox_polling_interval = env_string(&env, "YONA_MAILBOX_POLLING_INTERVAL")
        .or_else(|| non_empty_string(mailbox.polling_interval));
    let project_default_scope = env_string(&env, "YONA_PROJECT_DEFAULT_SCOPE")
        .or_else(|| non_empty_string(project.default_scope));
    let project_default_menus = env_string(&env, "YONA_PROJECT_DEFAULT_MENUS")
        .map(|value| split_csv(&value))
        .or(project.default_menus);
    let max_file_size = env
        .get("YONA_MAX_FILE_SIZE")
        .and_then(|value| value.trim().parse::<usize>().ok())
        .or(project.max_file_size);
    let smtp_host = env_string(&env, "YONA_SMTP_HOST").or_else(|| non_empty_string(smtp.host));
    let smtp_port = env
        .get("YONA_SMTP_PORT")
        .and_then(|value| value.trim().parse::<u16>().ok())
        .or(smtp.port);
    let smtp_ssl = env_bool(&env, "YONA_SMTP_SSL").or(smtp.ssl);
    let smtp_user = env_string(&env, "YONA_SMTP_USER").or_else(|| non_empty_string(smtp.user));
    let smtp_password =
        env_string(&env, "YONA_SMTP_PASSWORD").or_else(|| non_empty_string(smtp.password));
    let smtp_domain =
        env_string(&env, "YONA_SMTP_DOMAIN").or_else(|| non_empty_string(smtp.domain));
    let smtp_from = env_string(&env, "YONA_SMTP_FROM").or_else(|| non_empty_string(smtp.from));
    let update_current_version = env_string(&env, "YONA_CURRENT_VERSION")
        .or_else(|| non_empty_string(update.current_version));
    let update_error =
        env_string(&env, "YONA_UPDATE_ERROR").or_else(|| non_empty_string(update.error));
    let update_latest_version = env_string(&env, "YONA_UPDATE_LATEST_VERSION")
        .or_else(|| non_empty_string(update.latest_version));
    let update_version =
        env_string(&env, "YONA_UPDATE_VERSION").or_else(|| non_empty_string(update.version));
    let update_release_url = env_string(&env, "YONA_UPDATE_RELEASE_URL")
        .or_else(|| non_empty_string(update.release_url));
    let update_metadata_url = env_string(&env, "YONA_UPDATE_METADATA_URL")
        .or_else(|| non_empty_string(update.metadata_url));
    let update_metadata_file = env_string(&env, "YONA_UPDATE_METADATA_FILE")
        .or_else(|| non_empty_string(update.metadata_file));
    let update_https_fetch_command = env_string(&env, "YONA_UPDATE_HTTPS_FETCH_COMMAND")
        .or_else(|| non_empty_string(update.https_fetch_command));
    let webhook_delivery_retries = env
        .get("YONA_WEBHOOK_DELIVERY_RETRIES")
        .and_then(|value| value.trim().parse::<usize>().ok())
        .or(webhook.delivery_retries);
    let webhook_allow_private_networks =
        env_bool(&env, "YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS").or(webhook.allow_private_networks);
    let notification_mail_enabled =
        env_bool(&env, "YONA_NOTIFICATION_MAIL_ENABLED").or(notification.mail_enabled);
    let notification_mail_initial_delay = env_string(&env, "YONA_NOTIFICATION_MAIL_INITIAL_DELAY")
        .or_else(|| non_empty_string(notification.mail_initial_delay));
    let notification_mail_interval = env_string(&env, "YONA_NOTIFICATION_MAIL_INTERVAL")
        .or_else(|| non_empty_string(notification.mail_interval));
    let notification_mail_delay = env_string(&env, "YONA_NOTIFICATION_MAIL_DELAY")
        .or_else(|| non_empty_string(notification.mail_delay));
    let notification_mail_hide_address =
        env_bool(&env, "YONA_NOTIFICATION_MAIL_HIDE_ADDRESS").or(notification.hide_address);
    let notification_mail_recipient_limit = env
        .get("YONA_NOTIFICATION_MAIL_RECIPIENT_LIMIT")
        .and_then(|value| value.trim().parse::<usize>().ok())
        .or(notification.recipient_limit);
    let notification_draft_time = env_string(&env, "YONA_NOTIFICATION_DRAFT_TIME")
        .or_else(|| non_empty_string(notification.draft_time));
    let use_embedded_assets = env_bool(&env, "YONA_USE_EMBEDDED_ASSETS")
        .or(file.use_embedded_assets)
        .unwrap_or(false);
    let asset_root = env.get("YONA_ASSET_ROOT").cloned().or(file.asset_root);

    Ok(StartupConfig {
        asset_root,
        auth_email_verification_enabled,
        auth_login_id_placeholder,
        auth_password_placeholder,
        auth_signup_require_confirm,
        auth_social_login_only,
        allowed_sending_mail_domains,
        bind_addr,
        database_url,
        guest_login_prefix,
        issue_event_draft_time,
        mailbox_fetch_command,
        mailbox_imap_address,
        mailbox_polling_enabled,
        mailbox_polling_initial_delay,
        mailbox_polling_interval,
        max_file_size,
        project_default_menus,
        project_default_scope,
        runtime: RuntimeConfig {
            base_path,
            public_origin,
        },
        schema_policy,
        seed_pilot,
        session_timeout_seconds,
        show_user_email,
        site_allow_anonymous_access,
        site_hostname,
        site_name,
        smtp_domain,
        smtp_from,
        smtp_host,
        smtp_password,
        smtp_port,
        smtp_ssl,
        smtp_user,
        supported_languages,
        update_current_version,
        update_error,
        update_https_fetch_command,
        update_latest_version,
        update_metadata_file,
        update_metadata_url,
        update_release_url,
        update_version,
        webhook_allow_private_networks,
        webhook_delivery_retries,
        notification_mail_delay,
        notification_mail_enabled,
        notification_mail_hide_address,
        notification_mail_initial_delay,
        notification_mail_interval,
        notification_mail_recipient_limit,
        notification_draft_time,
        use_embedded_assets,
    })
}

pub fn load_startup_config_from_env() -> anyhow::Result<StartupConfig> {
    let env: BTreeMap<String, String> = std::env::vars().collect();
    let current_dir = std::env::current_dir()?;
    load_startup_config(env, &current_dir)
}

pub fn normalize_base_path(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() || trimmed == "/" {
        return "/".to_string();
    }

    let with_leading = if trimmed.starts_with('/') {
        trimmed.to_string()
    } else {
        format!("/{trimmed}")
    };

    let collapsed = with_leading.replace("//", "/");
    let normalized = collapsed.trim_end_matches('/');

    if normalized.is_empty() {
        "/".to_string()
    } else {
        normalized.to_string()
    }
}

pub fn join_base_path(base_path: &str, suffix: &str) -> String {
    if base_path == "/" {
        return suffix.to_string();
    }

    format!("{base_path}{suffix}")
}

pub fn apply_startup_runtime_env(config: &StartupConfig) {
    if let Some(site_name) = &config.site_name {
        std::env::set_var("YONA_SITE_NAME", site_name);
    }
    if let Some(hostname) = &config.site_hostname {
        std::env::set_var("YONA_APPLICATION_HOSTNAME", hostname);
    }
    if let Some(domains) = &config.allowed_sending_mail_domains {
        std::env::set_var("YONA_ALLOWED_MAIL_DOMAINS", domains.join(","));
    }
    if let Some(allow_anonymous_access) = config.site_allow_anonymous_access {
        std::env::set_var(
            "YONA_ALLOW_ANONYMOUS_ACCESS",
            if allow_anonymous_access {
                "true"
            } else {
                "false"
            },
        );
    }
    if let Some(guest_login_prefix) = &config.guest_login_prefix {
        std::env::set_var("YONA_GUEST_LOGIN_PREFIX", guest_login_prefix);
    }
    if let Some(languages) = &config.supported_languages {
        std::env::set_var("YONA_LANGS", languages.join(","));
    }
    if let Some(show_user_email) = config.show_user_email {
        std::env::set_var(
            "YONA_SHOW_USER_EMAIL",
            if show_user_email { "true" } else { "false" },
        );
    }
    if let Some(email_verification_enabled) = config.auth_email_verification_enabled {
        std::env::set_var(
            "YONA_AUTH_EMAIL_VERIFICATION_ENABLED",
            if email_verification_enabled {
                "true"
            } else {
                "false"
            },
        );
    }
    if let Some(login_id_placeholder) = &config.auth_login_id_placeholder {
        std::env::set_var("YONA_AUTH_LOGIN_ID_PLACEHOLDER", login_id_placeholder);
    }
    if let Some(password_placeholder) = &config.auth_password_placeholder {
        std::env::set_var("YONA_AUTH_PASSWORD_PLACEHOLDER", password_placeholder);
    }
    if let Some(signup_require_confirm) = config.auth_signup_require_confirm {
        std::env::set_var(
            "YONA_AUTH_SIGNUP_REQUIRE_CONFIRM",
            if signup_require_confirm {
                "true"
            } else {
                "false"
            },
        );
    }
    if let Some(social_login_only) = config.auth_social_login_only {
        std::env::set_var(
            "YONA_AUTH_SOCIAL_LOGIN_ONLY",
            if social_login_only { "true" } else { "false" },
        );
    }
    if let Some(session_timeout_seconds) = config.session_timeout_seconds {
        std::env::set_var(
            "YONA_SESSION_TIMEOUT_SECONDS",
            session_timeout_seconds.to_string(),
        );
    }
    if let Some(draft_time) = &config.issue_event_draft_time {
        std::env::set_var("YONA_ISSUE_EVENT_DRAFT_TIME", draft_time);
    }
    if let Some(fetch_command) = &config.mailbox_fetch_command {
        std::env::set_var("YONA_MAILBOX_FETCH_COMMAND", fetch_command);
    }
    if let Some(imap_address) = &config.mailbox_imap_address {
        std::env::set_var("YONA_MAILBOX_IMAP_ADDRESS", imap_address);
    }
    if let Some(polling_enabled) = config.mailbox_polling_enabled {
        std::env::set_var(
            "YONA_MAILBOX_POLLING_ENABLED",
            if polling_enabled { "true" } else { "false" },
        );
    }
    if let Some(initial_delay) = &config.mailbox_polling_initial_delay {
        std::env::set_var("YONA_MAILBOX_POLLING_INITIAL_DELAY", initial_delay);
    }
    if let Some(interval) = &config.mailbox_polling_interval {
        std::env::set_var("YONA_MAILBOX_POLLING_INTERVAL", interval);
    }
    if let Some(default_scope) = &config.project_default_scope {
        std::env::set_var("YONA_PROJECT_DEFAULT_SCOPE", default_scope);
    }
    if let Some(default_menus) = &config.project_default_menus {
        std::env::set_var("YONA_PROJECT_DEFAULT_MENUS", default_menus.join(","));
    }
    if let Some(max_file_size) = config.max_file_size {
        std::env::set_var("YONA_MAX_FILE_SIZE", max_file_size.to_string());
    }
    if let Some(host) = &config.smtp_host {
        std::env::set_var("YONA_SMTP_HOST", host);
    }
    if let Some(port) = config.smtp_port {
        std::env::set_var("YONA_SMTP_PORT", port.to_string());
    }
    if let Some(ssl) = config.smtp_ssl {
        std::env::set_var("YONA_SMTP_SSL", if ssl { "true" } else { "false" });
    }
    if let Some(user) = &config.smtp_user {
        std::env::set_var("YONA_SMTP_USER", user);
    }
    if let Some(password) = &config.smtp_password {
        std::env::set_var("YONA_SMTP_PASSWORD", password);
    }
    if let Some(domain) = &config.smtp_domain {
        std::env::set_var("YONA_SMTP_DOMAIN", domain);
    }
    if let Some(from) = &config.smtp_from {
        std::env::set_var("YONA_SMTP_FROM", from);
    }
    if let Some(current_version) = &config.update_current_version {
        std::env::set_var("YONA_CURRENT_VERSION", current_version);
    }
    if let Some(error) = &config.update_error {
        std::env::set_var("YONA_UPDATE_ERROR", error);
    }
    if let Some(latest_version) = &config.update_latest_version {
        std::env::set_var("YONA_UPDATE_LATEST_VERSION", latest_version);
    }
    if let Some(version) = &config.update_version {
        std::env::set_var("YONA_UPDATE_VERSION", version);
    }
    if let Some(release_url) = &config.update_release_url {
        std::env::set_var("YONA_UPDATE_RELEASE_URL", release_url);
    }
    if let Some(metadata_url) = &config.update_metadata_url {
        std::env::set_var("YONA_UPDATE_METADATA_URL", metadata_url);
    }
    if let Some(metadata_file) = &config.update_metadata_file {
        std::env::set_var("YONA_UPDATE_METADATA_FILE", metadata_file);
    }
    if let Some(fetch_command) = &config.update_https_fetch_command {
        std::env::set_var("YONA_UPDATE_HTTPS_FETCH_COMMAND", fetch_command);
    }
    if let Some(delivery_retries) = config.webhook_delivery_retries {
        std::env::set_var(
            "YONA_WEBHOOK_DELIVERY_RETRIES",
            delivery_retries.to_string(),
        );
    }
    if let Some(allow_private_networks) = config.webhook_allow_private_networks {
        std::env::set_var(
            "YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS",
            if allow_private_networks {
                "true"
            } else {
                "false"
            },
        );
    }
    if let Some(mail_enabled) = config.notification_mail_enabled {
        std::env::set_var(
            "YONA_NOTIFICATION_MAIL_ENABLED",
            if mail_enabled { "true" } else { "false" },
        );
    }
    if let Some(initial_delay) = &config.notification_mail_initial_delay {
        std::env::set_var("YONA_NOTIFICATION_MAIL_INITIAL_DELAY", initial_delay);
    }
    if let Some(interval) = &config.notification_mail_interval {
        std::env::set_var("YONA_NOTIFICATION_MAIL_INTERVAL", interval);
    }
    if let Some(delay) = &config.notification_mail_delay {
        std::env::set_var("YONA_NOTIFICATION_MAIL_DELAY", delay);
    }
    if let Some(hide_address) = config.notification_mail_hide_address {
        std::env::set_var(
            "YONA_NOTIFICATION_MAIL_HIDE_ADDRESS",
            if hide_address { "true" } else { "false" },
        );
    }
    if let Some(recipient_limit) = config.notification_mail_recipient_limit {
        std::env::set_var(
            "YONA_NOTIFICATION_MAIL_RECIPIENT_LIMIT",
            recipient_limit.to_string(),
        );
    }
    if let Some(draft_time) = &config.notification_draft_time {
        std::env::set_var("YONA_NOTIFICATION_DRAFT_TIME", draft_time);
    }
}

fn env_bool(env: &BTreeMap<String, String>, key: &str) -> Option<bool> {
    env.get(key)
        .and_then(|value| match value.trim().to_ascii_lowercase().as_str() {
            "1" | "true" | "yes" | "on" => Some(true),
            "0" | "false" | "no" | "off" => Some(false),
            _ => None,
        })
}

fn env_string(env: &BTreeMap<String, String>, key: &str) -> Option<String> {
    env.get(key)
        .cloned()
        .and_then(|value| non_empty_string(Some(value)))
}

fn non_empty_string(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn split_csv(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .collect()
}

fn read_startup_config_file(
    env: &BTreeMap<String, String>,
    current_dir: &Path,
) -> anyhow::Result<StartupConfigFile> {
    let explicit_path = env.get("YONA_CONFIG_TOML").map(PathBuf::from);
    let config_path = explicit_path.or_else(|| {
        let default_path = current_dir.join("yona.toml");
        default_path.exists().then_some(default_path)
    });

    let Some(config_path) = config_path else {
        return Ok(StartupConfigFile::default());
    };

    let text = fs::read_to_string(&config_path)?;
    let parsed: StartupConfigFile = toml::from_str(&text)?;
    Ok(parsed)
}
