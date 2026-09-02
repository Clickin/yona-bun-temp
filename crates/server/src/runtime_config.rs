use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::Deserialize;
use yoram_migration::RuntimeSchemaPolicy;

use crate::RuntimeConfig;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StartupConfig {
    pub asset_root: Option<String>,
    pub auth_email_verification_enabled: Option<bool>,
    pub auth_hashing_silent_migration_to_argon2id: Option<bool>,
    pub auth_login_id_placeholder: Option<String>,
    pub auth_password_placeholder: Option<String>,
    pub auth_signup_require_confirm: Option<bool>,
    pub auth_social_login_support: Option<Vec<String>>,
    pub auth_social_login_only: Option<bool>,
    pub github_allow_migration: Option<bool>,
    pub oauth_providers: Option<BTreeMap<String, OAuthProviderConfigFile>>,
    pub allowed_sending_mail_domains: Option<Vec<String>>,
    pub bind_addr: String,
    pub config_source: String,
    pub data_root: Option<String>,
    pub database_url: String,
    pub guest_login_prefix: Option<String>,
    pub issue_event_draft_time: Option<String>,
    pub ldap_base_dn: Option<String>,
    pub ldap_display_name_property: Option<String>,
    pub ldap_distinguished_name_postfix: Option<String>,
    pub ldap_email_property: Option<String>,
    pub ldap_enabled: Option<bool>,
    pub ldap_english_name_attribute_name: Option<String>,
    pub ldap_fallback_to_local_login: Option<bool>,
    pub ldap_fixture_users: Option<Vec<LdapFixtureUserConfig>>,
    pub ldap_host: Option<String>,
    pub ldap_login_property: Option<String>,
    pub ldap_port: Option<u16>,
    pub ldap_protocol: Option<String>,
    pub ldap_use_email_base_login: Option<bool>,
    pub ldap_user_name_property: Option<String>,
    pub mailbox_fetch_command: Option<String>,
    pub mailbox_imap_address: Option<String>,
    pub mailbox_polling_enabled: Option<bool>,
    pub mailbox_polling_initial_delay: Option<String>,
    pub mailbox_polling_interval: Option<String>,
    pub max_file_size: Option<usize>,
    pub feedback_url: Option<String>,
    pub hide_project_listing: Option<bool>,
    pub navbar_custom_link_name: Option<String>,
    pub navbar_custom_link_url: Option<String>,
    pub project_default_menus: Option<Vec<String>>,
    pub project_default_scope: Option<String>,
    pub runtime: RuntimeConfig,
    pub schema_policy: RuntimeSchemaPolicy,
    pub seed_pilot: bool,
    pub session_timeout_seconds: Option<u64>,
    pub send_yona_usage: Option<bool>,
    pub show_user_email: Option<bool>,
    pub site_allow_anonymous_access: Option<bool>,
    pub site_hostname: Option<String>,
    pub site_name: Option<String>,
    pub stable_list_cache: Option<String>,
    pub slack_webhook_colors: BTreeMap<String, String>,
    pub smtp_domain: Option<String>,
    pub smtp_from: Option<String>,
    pub smtp_host: Option<String>,
    pub smtp_password: Option<String>,
    pub smtp_port: Option<u16>,
    pub smtp_ssl: Option<bool>,
    pub smtp_user: Option<String>,
    pub supported_languages: Option<Vec<String>>,
    pub translation_api: Option<String>,
    pub translation_header_key: Option<String>,
    pub translation_header_value: Option<String>,
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
    application: Option<ApplicationConfigFile>,
    asset_root: Option<String>,
    auth: Option<AuthConfigFile>,
    bind_addr: Option<String>,
    data_root: Option<String>,
    database: Option<DatabaseConfigFile>,
    issue: Option<IssueConfigFile>,
    ldap: Option<LdapConfigFile>,
    mailbox: Option<MailboxConfigFile>,
    database_url: Option<String>,
    github: Option<GithubConfigFile>,
    project: Option<ProjectConfigFile>,
    public_origin: Option<String>,
    notification: Option<NotificationConfigFile>,
    oauth: Option<BTreeMap<String, OAuthProviderConfigFile>>,
    schema_policy: Option<String>,
    seed_pilot: Option<bool>,
    session: Option<SessionConfigFile>,
    stable_list_cache: Option<String>,
    show_user_email: Option<bool>,
    site: Option<SiteConfigFile>,
    slack: Option<BTreeMap<String, String>>,
    smtp: Option<SmtpConfigFile>,
    update: Option<UpdateConfigFile>,
    use_embedded_assets: Option<bool>,
    webhook: Option<WebhookConfigFile>,
    protocol: Option<String>,
}

#[derive(Default, Deserialize)]
struct GithubConfigFile {
    allow: Option<GithubAllowConfigFile>,
    client: Option<GithubClientConfigFile>,
}

#[derive(Default, Deserialize)]
struct GithubAllowConfigFile {
    migration: Option<bool>,
}

#[derive(Default, Deserialize)]
struct GithubClientConfigFile {
    id: Option<String>,
    secret: Option<String>,
}

#[derive(Default, Deserialize)]
struct ApplicationConfigFile {
    #[serde(rename = "use")]
    use_config: Option<ApplicationUseConfigFile>,
}

#[derive(Default, Deserialize)]
struct ApplicationUseConfigFile {
    ldap: Option<ApplicationUseLdapConfigFile>,
}

#[derive(Default, Deserialize)]
struct ApplicationUseLdapConfigFile {
    login: Option<ApplicationUseLdapLoginConfigFile>,
}

#[derive(Default, Deserialize)]
struct ApplicationUseLdapLoginConfigFile {
    supoort: Option<bool>,
}

#[derive(Default, Deserialize)]
struct SiteConfigFile {
    allow_anonymous_access: Option<bool>,
    allowed_sending_mail_domains: Option<Vec<String>>,
    guest_login_prefix: Option<String>,
    hostname: Option<String>,
    feedback_url: Option<String>,
    hide_project_listing: Option<bool>,
    langs: Option<Vec<String>>,
    name: Option<String>,
    navbar_custom_link_name: Option<String>,
    navbar_custom_link_url: Option<String>,
    send_yona_usage: Option<bool>,
    show_user_email: Option<bool>,
}

#[derive(Default, Deserialize)]
struct AuthConfigFile {
    email_verification: Option<bool>,
    hashing: Option<HashingConfigFile>,
    login_id_placeholder: Option<String>,
    password_placeholder: Option<String>,
    signup_require_confirm: Option<bool>,
    social_login_support: Option<Vec<String>>,
    social_login_only: Option<bool>,
}

#[derive(Default, Deserialize)]
struct HashingConfigFile {
    silent_migration_to_argon2id: Option<bool>,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq)]
pub struct OAuthProviderConfigFile {
    pub access_token_url: Option<String>,
    pub authorization_url: Option<String>,
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
    pub email_url: Option<String>,
    pub scope: Option<String>,
    pub user_info_url: Option<String>,
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

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq)]
pub struct LdapFixtureUserConfig {
    pub department: Option<String>,
    pub display_name: String,
    pub email: String,
    pub english_name: Option<String>,
    pub login_id: String,
    pub password: String,
}

#[derive(Default, Deserialize)]
struct LdapConfigFile {
    #[serde(alias = "baseDN")]
    base_dn: Option<String>,
    #[serde(alias = "displayNameProperty")]
    display_name_property: Option<String>,
    #[serde(alias = "distinguishedNamePostfix")]
    distinguished_name_postfix: Option<String>,
    #[serde(alias = "emailProperty")]
    email_property: Option<String>,
    enabled: Option<bool>,
    fixture_users: Option<Vec<LdapFixtureUserConfig>>,
    host: Option<String>,
    #[serde(alias = "loginProperty")]
    login_property: Option<String>,
    port: Option<u16>,
    protocol: Option<String>,
    options: Option<LdapOptionsConfigFile>,
    #[serde(alias = "userNameProperty")]
    user_name_property: Option<String>,
}

#[derive(Default, Deserialize)]
struct LdapOptionsConfigFile {
    #[serde(alias = "englishNameAttributeName")]
    english_name_attribute_name: Option<String>,
    #[serde(alias = "fallbackToLocalLogin")]
    fallback_to_local_login: Option<bool>,
    #[serde(alias = "useEmailBaseLogin")]
    use_email_base_login: Option<bool>,
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
    let (file, config_source) = read_startup_config_file(&env, current_dir)?;
    let application = file.application.unwrap_or_default();
    let site = file.site.unwrap_or_default();
    let auth = file.auth.unwrap_or_default();
    let hashing = auth.hashing.unwrap_or_default();
    let database = file.database.unwrap_or_default();
    let github = file.github.unwrap_or_default();
    let github_allow = github.allow.unwrap_or_default();
    let github_client = github.client.unwrap_or_default();
    let issue = file.issue.unwrap_or_default();
    let ldap = file.ldap.unwrap_or_default();
    let ldap_options = ldap.options.unwrap_or_default();
    let mailbox = file.mailbox.unwrap_or_default();
    let notification = file.notification.unwrap_or_default();
    let project = file.project.unwrap_or_default();
    let session = file.session.unwrap_or_default();
    let slack = file.slack.unwrap_or_default();
    let smtp = file.smtp.unwrap_or_default();
    let update = file.update.unwrap_or_default();
    let webhook = file.webhook.unwrap_or_default();

    let base_path = env.get("YONA_BASE_PATH").cloned().unwrap_or_default();
    let base_path = normalize_base_path(&base_path);
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
    let data_root = env_string(&env, "YONA_DATA").or_else(|| non_empty_string(file.data_root));

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
    let stable_list_cache = env_string(&env, "YONA_STABLE_LIST_CACHE")
        .or_else(|| non_empty_string(file.stable_list_cache));
    let site_name = env_string(&env, "YONA_SITE_NAME").or_else(|| non_empty_string(site.name));
    let site_allow_anonymous_access =
        env_bool(&env, "YONA_ALLOW_ANONYMOUS_ACCESS").or(site.allow_anonymous_access);
    let site_hostname = env_string(&env, "YONA_APPLICATION_HOSTNAME")
        .or_else(|| env_string(&env, "APPLICATION_HOSTNAME"))
        .or_else(|| non_empty_string(site.hostname));
    let allowed_sending_mail_domains = env_string(&env, "YONA_ALLOWED_MAIL_DOMAINS")
        .map(|value| split_csv(&value))
        .or(site.allowed_sending_mail_domains);
    let guest_login_prefix =
        env_string(&env, "YONA_GUEST_LOGIN_PREFIX").or(site.guest_login_prefix);
    let supported_languages = env_string(&env, "YONA_LANGS")
        .map(|value| split_csv(&value))
        .or(site.langs);
    let feedback_url = env_string(&env, "YONA_FEEDBACK_URL")
        .or_else(|| env_string(&env, "application.feedback.url"))
        .or_else(|| non_empty_string(site.feedback_url))
        .or_else(|| Some("https://github.com/yona-projects/yona/issues".to_string()));
    let hide_project_listing = env_bool(&env, "YONA_HIDE_PROJECT_LISTING")
        .or_else(|| env_bool(&env, "application.hide.project.listing"))
        .or(site.hide_project_listing);
    let navbar_custom_link_name = env_string(&env, "YONA_NAVBAR_CUSTOM_LINK_NAME")
        .or_else(|| env_string(&env, "application.navbar.custom.link.name"))
        .or_else(|| non_empty_string(site.navbar_custom_link_name));
    let navbar_custom_link_url = env_string(&env, "YONA_NAVBAR_CUSTOM_LINK_URL")
        .or_else(|| env_string(&env, "application.navbar.custom.link.url"))
        .or_else(|| non_empty_string(site.navbar_custom_link_url));
    let send_yona_usage = env_bool(&env, "YONA_SEND_YONA_USAGE")
        .or_else(|| env_bool(&env, "application.send.yona.usage"))
        .or(site.send_yona_usage);
    let translation_api = env_string(&env, "YONA_TRANSLATION_API")
        .or_else(|| env_string(&env, "APPLICATION_EXTRAS_TRANSLATION_API"));
    let translation_header_key = env_string(&env, "YONA_TRANSLATION_HEADER_KEY")
        .or_else(|| env_string(&env, "APPLICATION_EXTRAS_TRANSLATION_HEADER_KEY"));
    let auth_hashing_silent_migration_to_argon2id =
        env_bool(&env, "YONA_AUTH_HASHING_SILENT_MIGRATION_TO_ARGON2ID")
            .or(hashing.silent_migration_to_argon2id);
    let translation_header_value = env_string(&env, "YONA_TRANSLATION_HEADER_VALUE")
        .or_else(|| env_string(&env, "APPLICATION_EXTRAS_TRANSLATION_HEADER_VALUE"));
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
    let auth_social_login_support = env_string(&env, "YONA_AUTH_SOCIAL_LOGIN_SUPPORT")
        .map(|value| split_csv(&value))
        .or(auth.social_login_support);
    let auth_social_login_only =
        env_bool(&env, "YONA_AUTH_SOCIAL_LOGIN_ONLY").or(auth.social_login_only);
    let github_allow_migration = env_bool(&env, "YONA_GITHUB_ALLOW_MIGRATION")
        .or_else(|| env_bool(&env, "github.allow.migration"))
        .or(github_allow.migration);
    let github_client_id = env_string(&env, "YONA_GITHUB_CLIENT_ID")
        .or_else(|| env_string(&env, "github.client.id"))
        .or(github_client.id);
    let github_client_secret = env_string(&env, "YONA_GITHUB_CLIENT_SECRET")
        .or_else(|| env_string(&env, "github.client.secret"))
        .or(github_client.secret);
    let oauth_providers = oauth_providers_from_env_and_file(
        &env,
        file.oauth,
        github_client_id,
        github_client_secret,
    );
    let session_timeout_seconds = env
        .get("YONA_SESSION_TIMEOUT_SECONDS")
        .and_then(|value| value.trim().parse::<u64>().ok())
        .or(session.max_age);
    let issue_event_draft_time = env_string(&env, "YONA_ISSUE_EVENT_DRAFT_TIME")
        .or_else(|| non_empty_string(issue.event_draft_time));
    let ldap_enabled = env_bool(&env, "YONA_LDAP_ENABLED")
        .or_else(|| env_bool(&env, "application.use.ldap.login.supoort"))
        .or_else(|| {
            application
                .use_config
                .as_ref()
                .and_then(|use_config| use_config.ldap.as_ref())
                .and_then(|ldap| ldap.login.as_ref())
                .and_then(|login| login.supoort)
        })
        .or(ldap.enabled);
    let ldap_host = env_string(&env, "YONA_LDAP_HOST")
        .or_else(|| env_string(&env, "ldap.host"))
        .or_else(|| non_empty_string(ldap.host));
    let ldap_port = env
        .get("YONA_LDAP_PORT")
        .or_else(|| env.get("ldap.port"))
        .and_then(|value| value.trim().parse::<u16>().ok())
        .or(ldap.port);
    let ldap_protocol = env_string(&env, "YONA_LDAP_PROTOCOL")
        .or_else(|| env_string(&env, "ldap.protocol"))
        .or_else(|| env_string(&env, "protocol"))
        .or(file.protocol)
        .or_else(|| non_empty_string(ldap.protocol));
    let ldap_base_dn = env_string(&env, "YONA_LDAP_BASE_DN")
        .or_else(|| env_string(&env, "ldap.baseDN"))
        .or_else(|| non_empty_string(ldap.base_dn));
    let ldap_distinguished_name_postfix = env_string(&env, "YONA_LDAP_DISTINGUISHED_NAME_POSTFIX")
        .or_else(|| env_string(&env, "ldap.distinguishedNamePostfix"))
        .or_else(|| non_empty_string(ldap.distinguished_name_postfix));
    let ldap_login_property = env_string(&env, "YONA_LDAP_LOGIN_PROPERTY")
        .or_else(|| env_string(&env, "ldap.loginProperty"))
        .or_else(|| non_empty_string(ldap.login_property));
    let ldap_display_name_property = env_string(&env, "YONA_LDAP_DISPLAY_NAME_PROPERTY")
        .or_else(|| env_string(&env, "ldap.displayNameProperty"))
        .or_else(|| non_empty_string(ldap.display_name_property));
    let ldap_user_name_property = env_string(&env, "YONA_LDAP_USER_NAME_PROPERTY")
        .or_else(|| env_string(&env, "ldap.userNameProperty"))
        .or_else(|| non_empty_string(ldap.user_name_property));
    let ldap_email_property = env_string(&env, "YONA_LDAP_EMAIL_PROPERTY")
        .or_else(|| env_string(&env, "ldap.emailProperty"))
        .or_else(|| non_empty_string(ldap.email_property));
    let ldap_use_email_base_login = env_bool(&env, "YONA_LDAP_USE_EMAIL_BASE_LOGIN")
        .or_else(|| env_bool(&env, "ldap.options.useEmailBaseLogin"))
        .or(ldap_options.use_email_base_login);
    let ldap_fallback_to_local_login = env_bool(&env, "YONA_LDAP_FALLBACK_TO_LOCAL_LOGIN")
        .or_else(|| env_bool(&env, "ldap.options.fallbackToLocalLogin"))
        .or(ldap_options.fallback_to_local_login);
    let ldap_english_name_attribute_name =
        env_string(&env, "YONA_LDAP_ENGLISH_NAME_ATTRIBUTE_NAME")
            .or_else(|| env_string(&env, "ldap.options.englishNameAttributeName"))
            .or_else(|| non_empty_string(ldap_options.english_name_attribute_name));
    let ldap_fixture_users = env_string(&env, "YONA_LDAP_FIXTURE_USERS")
        .map(|value| parse_ldap_fixture_users(&value))
        .or(ldap.fixture_users);
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
    let smtp_host = env_string(&env, "YONA_SMTP_HOST")
        .or_else(|| env_string(&env, "SMTP_HOST"))
        .or_else(|| non_empty_string(smtp.host));
    let smtp_port = env
        .get("YONA_SMTP_PORT")
        .or_else(|| env.get("SMTP_PORT"))
        .and_then(|value| value.trim().parse::<u16>().ok())
        .or(smtp.port);
    let smtp_ssl = env_bool(&env, "YONA_SMTP_SSL")
        .or_else(|| env_bool(&env, "SMTP_SSL"))
        .or(smtp.ssl);
    let smtp_user = env_string(&env, "YONA_SMTP_USER")
        .or_else(|| env_string(&env, "SMTP_USER"))
        .or_else(|| non_empty_string(smtp.user));
    let smtp_password = env_string(&env, "YONA_SMTP_PASSWORD")
        .or_else(|| env_string(&env, "SMTP_PASSWORD"))
        .or_else(|| env_string(&env, "SMTP_PASS"))
        .or_else(|| non_empty_string(smtp.password));
    let smtp_domain = env_string(&env, "YONA_SMTP_DOMAIN")
        .or_else(|| env_string(&env, "SMTP_DOMAIN"))
        .or_else(|| non_empty_string(smtp.domain));
    let smtp_from = env_string(&env, "YONA_SMTP_FROM")
        .or_else(|| env_string(&env, "SMTP_FROM"))
        .or_else(|| non_empty_string(smtp.from));
    let slack_webhook_colors = slack_webhook_colors_from_config_and_env(slack, &env);
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
        auth_hashing_silent_migration_to_argon2id,
        auth_login_id_placeholder,
        auth_password_placeholder,
        auth_signup_require_confirm,
        auth_social_login_support,
        auth_social_login_only,
        github_allow_migration,
        oauth_providers,
        allowed_sending_mail_domains,
        bind_addr,
        config_source,
        data_root,
        database_url,
        guest_login_prefix,
        issue_event_draft_time,
        ldap_base_dn,
        ldap_display_name_property,
        ldap_distinguished_name_postfix,
        ldap_email_property,
        ldap_enabled,
        ldap_english_name_attribute_name,
        ldap_fallback_to_local_login,
        ldap_fixture_users,
        ldap_host,
        ldap_login_property,
        ldap_port,
        ldap_protocol,
        ldap_use_email_base_login,
        ldap_user_name_property,
        mailbox_fetch_command,
        mailbox_imap_address,
        mailbox_polling_enabled,
        mailbox_polling_initial_delay,
        mailbox_polling_interval,
        max_file_size,
        feedback_url,
        hide_project_listing,
        navbar_custom_link_name,
        navbar_custom_link_url,
        project_default_menus,
        project_default_scope,
        runtime: RuntimeConfig {
            allow_anonymous_access: site_allow_anonymous_access.unwrap_or(true),
            base_path,
            public_origin,
        },
        schema_policy,
        seed_pilot,
        session_timeout_seconds,
        send_yona_usage,
        show_user_email,
        site_allow_anonymous_access,
        site_hostname,
        site_name,
        stable_list_cache,
        slack_webhook_colors,
        smtp_domain,
        smtp_from,
        smtp_host,
        smtp_password,
        smtp_port,
        smtp_ssl,
        smtp_user,
        supported_languages,
        translation_api,
        translation_header_key,
        translation_header_value,
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

    let mut collapsed = with_leading;
    while collapsed.contains("//") {
        collapsed = collapsed.replace("//", "/");
    }
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

fn oauth_providers_from_env_and_file(
    env: &BTreeMap<String, String>,
    file_providers: Option<BTreeMap<String, OAuthProviderConfigFile>>,
    github_client_id: Option<String>,
    github_client_secret: Option<String>,
) -> Option<BTreeMap<String, OAuthProviderConfigFile>> {
    let mut providers = file_providers.unwrap_or_default();
    for provider in ["github", "google", "kakao", "naver"] {
        let prefix = format!("YONA_OAUTH_{}", provider.to_ascii_uppercase());
        let mut config = providers
            .remove(provider)
            .or_else(|| providers.remove(&provider.to_ascii_uppercase()))
            .unwrap_or_default();
        config.client_id = env_string(env, &format!("{prefix}_CLIENT_ID")).or(config.client_id);
        config.client_secret =
            env_string(env, &format!("{prefix}_CLIENT_SECRET")).or(config.client_secret);
        config.access_token_url =
            env_string(env, &format!("{prefix}_ACCESS_TOKEN_URL")).or(config.access_token_url);
        config.authorization_url =
            env_string(env, &format!("{prefix}_AUTHORIZATION_URL")).or(config.authorization_url);
        config.user_info_url =
            env_string(env, &format!("{prefix}_USER_INFO_URL")).or(config.user_info_url);
        config.email_url = env_string(env, &format!("{prefix}_EMAIL_URL")).or(config.email_url);
        config.scope = env_string(env, &format!("{prefix}_SCOPE")).or(config.scope);
        if config.client_id.is_some()
            || config.client_secret.is_some()
            || config.access_token_url.is_some()
            || config.authorization_url.is_some()
            || config.user_info_url.is_some()
            || config.email_url.is_some()
            || config.scope.is_some()
        {
            providers.insert(provider.to_string(), config);
        }
    }

    if github_client_id.is_some() || github_client_secret.is_some() {
        let mut config = providers.remove("github").unwrap_or_default();
        config.client_id = config.client_id.or(github_client_id);
        config.client_secret = config.client_secret.or(github_client_secret);
        providers.insert("github".to_string(), config);
    }

    if providers.is_empty() {
        None
    } else {
        Some(providers)
    }
}

fn parse_ldap_fixture_users(value: &str) -> Vec<LdapFixtureUserConfig> {
    value
        .split(';')
        .filter_map(|entry| {
            let mut parts = entry.split('|');
            let login_id = parts.next()?.trim();
            let email = parts.next()?.trim();
            let display_name = parts.next()?.trim();
            let password = parts.next()?.trim();
            if login_id.is_empty()
                || email.is_empty()
                || display_name.is_empty()
                || password.is_empty()
            {
                return None;
            }
            let department = parts
                .next()
                .map(str::trim)
                .filter(|part| !part.is_empty())
                .map(str::to_string);
            let english_name = parts
                .next()
                .map(str::trim)
                .filter(|part| !part.is_empty())
                .map(str::to_string);
            Some(LdapFixtureUserConfig {
                department,
                display_name: display_name.to_string(),
                email: email.to_string(),
                english_name,
                login_id: login_id.to_string(),
                password: password.to_string(),
            })
        })
        .collect()
}

fn slack_webhook_colors_from_config_and_env(
    mut colors: BTreeMap<String, String>,
    env: &BTreeMap<String, String>,
) -> BTreeMap<String, String> {
    colors.retain(|key, value| !key.trim().is_empty() && !value.trim().is_empty());
    colors = colors
        .into_iter()
        .map(|(key, value)| (key.trim().to_string(), value.trim().to_string()))
        .collect();

    for (key, value) in env {
        let Some(event_type) = key.strip_prefix("slack.") else {
            continue;
        };
        if event_type.trim().is_empty() || value.trim().is_empty() {
            continue;
        }
        colors.insert(event_type.trim().to_string(), value.trim().to_string());
    }

    colors
}

fn read_startup_config_file(
    env: &BTreeMap<String, String>,
    current_dir: &Path,
) -> anyhow::Result<(StartupConfigFile, String)> {
    let explicit_path = env
        .get("YORAM_CONFIG_TOML")
        .or_else(|| env.get("YONA_CONFIG_TOML"))
        .map(PathBuf::from);
    let config_path = explicit_path.or_else(|| {
        let yoram_path = current_dir.join("yoram.toml");
        if yoram_path.exists() {
            return Some(yoram_path);
        }
        let legacy_path = current_dir.join("yona.toml");
        legacy_path.exists().then_some(legacy_path)
    });

    let Some(config_path) = config_path else {
        return Ok((StartupConfigFile::default(), "defaults".to_string()));
    };

    let text = fs::read_to_string(&config_path)?;
    let parsed: StartupConfigFile = toml::from_str(&text)?;
    Ok((parsed, config_path.display().to_string()))
}
