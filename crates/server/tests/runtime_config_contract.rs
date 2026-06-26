use std::collections::BTreeMap;
use std::fs;

use tempfile::tempdir;
use yoram_migration::RuntimeSchemaPolicy;
use yoram_server::repository_config_from_startup;
use yoram_server::runtime_config::{join_base_path, load_startup_config, normalize_base_path};

#[test]
fn normalizes_base_paths_like_the_go_pilot() {
    assert_eq!(normalize_base_path(""), "/");
    assert_eq!(normalize_base_path("/"), "/");
    assert_eq!(normalize_base_path("yona"), "/yona");
    assert_eq!(normalize_base_path("/yona/"), "/yona");
    assert_eq!(normalize_base_path("/tools/yona//"), "/tools/yona");
}

#[test]
fn joins_base_paths_without_double_slashes() {
    assert_eq!(
        join_base_path("/", "/api/auth/session"),
        "/api/auth/session"
    );
    assert_eq!(join_base_path("/yona", "/api/v1"), "/yona/api/v1");
}

#[test]
fn loads_startup_config_from_toml_file() {
    let dir = tempdir().expect("tempdir");
    let config_path = dir.path().join("yoram.toml");
    fs::write(
        &config_path,
        r#"
base_path = "/toml"
public_origin = "https://example.com"
database_url = "mysql://db"
schema_policy = "adopt"
seed_pilot = true
show_user_email = false
use_embedded_assets = true
asset_root = "C:/assets"
data_root = "/var/lib/yona-test"
"#,
    )
    .expect("write config");

    let config = load_startup_config(
        BTreeMap::from([(
            "YORAM_CONFIG_TOML".to_string(),
            config_path.to_string_lossy().into_owned(),
        )]),
        dir.path(),
    )
    .expect("load startup config");

    assert_eq!(config.runtime.base_path, "/toml");
    assert_eq!(config.runtime.public_origin, "https://example.com");
    assert_eq!(config.database_url, "mysql://db");
    assert_eq!(config.schema_policy, RuntimeSchemaPolicy::Adopt);
    assert_eq!(config.seed_pilot, true);
    assert_eq!(config.show_user_email, Some(false));
    assert_eq!(config.use_embedded_assets, true);
    assert_eq!(config.asset_root.as_deref(), Some("C:/assets"));
    assert_eq!(config.data_root.as_deref(), Some("/var/lib/yona-test"));
    assert_eq!(config.bind_addr, "127.0.0.1:8089");
    assert!(config.config_source.ends_with("yoram.toml"));
}

#[test]
fn discovers_default_yoram_toml_and_accepts_legacy_env_alias() {
    let dir = tempdir().expect("tempdir");
    let default_path = dir.path().join("yoram.toml");
    fs::write(&default_path, "base_path = \"/default\"\n").expect("write default config");
    let default_config =
        load_startup_config(BTreeMap::new(), dir.path()).expect("load default config");
    assert_eq!(default_config.runtime.base_path, "/default");
    assert_eq!(
        default_config.config_source,
        default_path.display().to_string()
    );

    let legacy_path = dir.path().join("legacy.toml");
    fs::write(&legacy_path, "base_path = \"/legacy-env\"\n").expect("write legacy config");
    let legacy_config = load_startup_config(
        BTreeMap::from([(
            "YONA_CONFIG_TOML".to_string(),
            legacy_path.to_string_lossy().into_owned(),
        )]),
        dir.path(),
    )
    .expect("load legacy env config");
    assert_eq!(legacy_config.runtime.base_path, "/legacy-env");
}

#[test]
fn loads_sectioned_legacy_migration_toml_keys() {
    let dir = tempdir().expect("tempdir");
    let config_path = dir.path().join("yoram.toml");
    fs::write(
        &config_path,
        r##"
[site]
name = "Legacy Yona"
hostname = "yona.example.com"
base_path = "/sectioned"
allow_anonymous_access = false
allowed_sending_mail_domains = ["allowed.example.com", "other.example.com"]
guest_login_prefix = "guest-"
feedback_url = "https://feedback.example.com"
hide_project_listing = true
navbar_custom_link_name = "Docs"
navbar_custom_link_url = "https://docs.example.com"
send_yona_usage = false
show_user_email = false
langs = ["ko-KR", "en-US"]

[auth]
email_verification = true
login_id_placeholder = "Employee ID"
password_placeholder = "Employee password"
signup_require_confirm = true
social_login_support = ["github", "google"]
social_login_only = true

[oauth.github]
client_id = "github-file-client"
client_secret = "github-file-secret"
access_token_url = "https://github.file/login/oauth/access_token"
authorization_url = "https://github.file/login/oauth/authorize"
user_info_url = "https://github.file/api/v3/user"
email_url = "https://github.file/api/v3/user/emails"
scope = "user:email"

[oauth.google]
client_id = "google-file-client"
client_secret = "google-file-secret"

[session]
max_age = 1800

[database]
url = "postgres://db"

[issue]
event_draft_time = "1s"

[mailbox]
fetch_command = "fetch-mailbox --unseen"
imap_address = "noreply@yona.example"
polling_enabled = true
polling_initial_delay = "2s"
polling_interval = "750ms"

[project]
default_scope = "private"
default_menus = ["issue", "board"]
max_file_size = 12345

[smtp]
host = "smtp.example.com"
port = 465
ssl = true
user = "smtp-user"
password = "smtp-pass"
domain = "smtp-domain.example.com"
from = "override@example.com"

[webhook]
delivery_retries = 2
allow_private_networks = true

[slack]
NEW_COMMENT = "#36a64f"
ISSUE_STATE_CHANGED = "danger"

[update]
current_version = "1.0.0"
latest_version = "1.1.0"
version = "1.1.0-alt"
release_url = "https://downloads.example/yona-1.1.0.zip"
metadata_url = "https://downloads.example/latest.json"
metadata_file = "/opt/yona/latest.json"
https_fetch_command = "curl --fail"

[notification]
mail_enabled = false
mail_initial_delay = "2s"
mail_interval = "750ms"
mail_delay = "0"
recipient_limit = 50
hide_address = false
draft_time = "1s"
"##,
    )
    .expect("write config");

    let config = load_startup_config(
        BTreeMap::from([(
            "YORAM_CONFIG_TOML".to_string(),
            config_path.to_string_lossy().into_owned(),
        )]),
        dir.path(),
    )
    .expect("load startup config");

    assert_eq!(config.runtime.base_path, "/sectioned");
    assert_eq!(config.database_url, "postgres://db");
    assert_eq!(config.site_name.as_deref(), Some("Legacy Yona"));
    assert_eq!(config.site_hostname.as_deref(), Some("yona.example.com"));
    assert_eq!(config.site_allow_anonymous_access, Some(false));
    assert_eq!(
        config.allowed_sending_mail_domains,
        Some(vec![
            "allowed.example.com".to_string(),
            "other.example.com".to_string()
        ])
    );
    assert_eq!(config.guest_login_prefix.as_deref(), Some("guest-"));
    assert_eq!(
        config.feedback_url.as_deref(),
        Some("https://feedback.example.com")
    );
    assert_eq!(config.hide_project_listing, Some(true));
    assert_eq!(config.navbar_custom_link_name.as_deref(), Some("Docs"));
    assert_eq!(
        config.navbar_custom_link_url.as_deref(),
        Some("https://docs.example.com")
    );
    assert_eq!(config.send_yona_usage, Some(false));
    assert_eq!(config.show_user_email, Some(false));
    assert_eq!(
        config.supported_languages,
        Some(vec!["ko-KR".to_string(), "en-US".to_string()])
    );
    assert_eq!(config.auth_email_verification_enabled, Some(true));
    assert_eq!(
        config.auth_login_id_placeholder.as_deref(),
        Some("Employee ID")
    );
    assert_eq!(
        config.auth_password_placeholder.as_deref(),
        Some("Employee password")
    );
    assert_eq!(config.auth_signup_require_confirm, Some(true));
    assert_eq!(
        config.auth_social_login_support,
        Some(vec!["github".to_string(), "google".to_string()])
    );
    assert_eq!(config.auth_social_login_only, Some(true));
    let oauth = config.oauth_providers.as_ref().expect("oauth providers");
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.client_id.as_deref()),
        Some("github-file-client")
    );
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.access_token_url.as_deref()),
        Some("https://github.file/login/oauth/access_token")
    );
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.authorization_url.as_deref()),
        Some("https://github.file/login/oauth/authorize")
    );
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.user_info_url.as_deref()),
        Some("https://github.file/api/v3/user")
    );
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.email_url.as_deref()),
        Some("https://github.file/api/v3/user/emails")
    );
    assert_eq!(
        oauth
            .get("google")
            .and_then(|provider| provider.client_secret.as_deref()),
        Some("google-file-secret")
    );
    assert_eq!(config.session_timeout_seconds, Some(1800));
    assert_eq!(config.issue_event_draft_time.as_deref(), Some("1s"));
    assert_eq!(
        config.mailbox_fetch_command.as_deref(),
        Some("fetch-mailbox --unseen")
    );
    assert_eq!(
        config.mailbox_imap_address.as_deref(),
        Some("noreply@yona.example")
    );
    assert_eq!(config.mailbox_polling_enabled, Some(true));
    assert_eq!(config.mailbox_polling_initial_delay.as_deref(), Some("2s"));
    assert_eq!(config.mailbox_polling_interval.as_deref(), Some("750ms"));
    assert_eq!(config.project_default_scope.as_deref(), Some("private"));
    assert_eq!(
        config.project_default_menus,
        Some(vec!["issue".to_string(), "board".to_string()])
    );
    assert_eq!(config.max_file_size, Some(12345));
    assert_eq!(config.smtp_host.as_deref(), Some("smtp.example.com"));
    assert_eq!(config.smtp_port, Some(465));
    assert_eq!(config.smtp_ssl, Some(true));
    assert_eq!(config.smtp_user.as_deref(), Some("smtp-user"));
    assert_eq!(config.smtp_password.as_deref(), Some("smtp-pass"));
    assert_eq!(
        config.smtp_domain.as_deref(),
        Some("smtp-domain.example.com")
    );
    assert_eq!(config.smtp_from.as_deref(), Some("override@example.com"));
    assert_eq!(config.update_current_version.as_deref(), Some("1.0.0"));
    assert_eq!(config.update_latest_version.as_deref(), Some("1.1.0"));
    assert_eq!(config.update_version.as_deref(), Some("1.1.0-alt"));
    assert_eq!(
        config.update_release_url.as_deref(),
        Some("https://downloads.example/yona-1.1.0.zip")
    );
    assert_eq!(
        config.update_metadata_url.as_deref(),
        Some("https://downloads.example/latest.json")
    );
    assert_eq!(
        config.update_metadata_file.as_deref(),
        Some("/opt/yona/latest.json")
    );
    assert_eq!(
        config.update_https_fetch_command.as_deref(),
        Some("curl --fail")
    );
    assert_eq!(config.webhook_delivery_retries, Some(2));
    assert_eq!(config.webhook_allow_private_networks, Some(true));
    assert_eq!(
        config
            .slack_webhook_colors
            .get("NEW_COMMENT")
            .map(String::as_str),
        Some("#36a64f")
    );
    assert_eq!(
        config
            .slack_webhook_colors
            .get("ISSUE_STATE_CHANGED")
            .map(String::as_str),
        Some("danger")
    );
    assert_eq!(config.notification_mail_enabled, Some(false));
    assert_eq!(
        config.notification_mail_initial_delay.as_deref(),
        Some("2s")
    );
    assert_eq!(config.notification_mail_interval.as_deref(), Some("750ms"));
    assert_eq!(config.notification_mail_delay.as_deref(), Some("0"));
    assert_eq!(config.notification_mail_recipient_limit, Some(50));
    assert_eq!(config.notification_mail_hide_address, Some(false));
    assert_eq!(config.notification_draft_time.as_deref(), Some("1s"));
}

#[test]
fn loads_legacy_ldap_keys_and_yona_env_overrides() {
    let dir = tempdir().expect("tempdir");
    let config_path = dir.path().join("yoram.toml");
    fs::write(
        &config_path,
        r#"
application.use.ldap.login.supoort = true
protocol = "ldap"

[ldap]
host = "ldap.example.com"
port = 389
baseDN = "ou=people,dc=example,dc=com"
distinguishedNamePostfix = "OU=user,DC=example,DC=com"
loginProperty = "uid"
displayNameProperty = "displayName"
userNameProperty = "CN"
emailProperty = "mail"
fixture_users = [
  { login_id = "door", email = "door@example.com", display_name = "Door", password = "ldap-pass", department = "Dev", english_name = "Door" },
]

[ldap.options]
useEmailBaseLogin = true
fallbackToLocalLogin = false
englishNameAttributeName = "givenName"
"#,
    )
    .expect("write config");

    let config = load_startup_config(
        BTreeMap::from([
            (
                "YORAM_CONFIG_TOML".to_string(),
                config_path.to_string_lossy().into_owned(),
            ),
            (
                "YONA_LDAP_FALLBACK_TO_LOCAL_LOGIN".to_string(),
                "true".to_string(),
            ),
            (
                "YONA_LDAP_FIXTURE_USERS".to_string(),
                "pt-door|pt-door@example.com|PT Door|secret|QA|Peter".to_string(),
            ),
        ]),
        dir.path(),
    )
    .expect("load startup config");

    assert_eq!(config.ldap_enabled, Some(true));
    assert_eq!(config.ldap_host.as_deref(), Some("ldap.example.com"));
    assert_eq!(config.ldap_port, Some(389));
    assert_eq!(config.ldap_protocol.as_deref(), Some("ldap"));
    assert_eq!(
        config.ldap_base_dn.as_deref(),
        Some("ou=people,dc=example,dc=com")
    );
    assert_eq!(
        config.ldap_distinguished_name_postfix.as_deref(),
        Some("OU=user,DC=example,DC=com")
    );
    assert_eq!(config.ldap_login_property.as_deref(), Some("uid"));
    assert_eq!(
        config.ldap_display_name_property.as_deref(),
        Some("displayName")
    );
    assert_eq!(config.ldap_user_name_property.as_deref(), Some("CN"));
    assert_eq!(config.ldap_email_property.as_deref(), Some("mail"));
    assert_eq!(config.ldap_use_email_base_login, Some(true));
    assert_eq!(config.ldap_fallback_to_local_login, Some(true));
    assert_eq!(
        config.ldap_english_name_attribute_name.as_deref(),
        Some("givenName")
    );
    let fixtures = config.ldap_fixture_users.expect("ldap fixtures");
    assert_eq!(fixtures.len(), 1);
    assert_eq!(fixtures[0].login_id, "pt-door");
    assert_eq!(fixtures[0].email, "pt-door@example.com");
    assert_eq!(fixtures[0].department.as_deref(), Some("QA"));
}

#[test]
fn environment_overrides_toml_values() {
    let dir = tempdir().expect("tempdir");
    let config_path = dir.path().join("yoram.toml");
    fs::write(
        &config_path,
        r#"
base_path = "/toml"
public_origin = "https://example.com"
database_url = "mysql://db"
schema_policy = "adopt"
seed_pilot = false
show_user_email = false
bind_addr = "127.0.0.1:19089"

[site]
name = "Toml Yona"
hostname = "toml.example.com"
allow_anonymous_access = false
allowed_sending_mail_domains = ["toml.example.com"]
langs = ["ko-KR"]

[auth]
login_id_placeholder = "Toml Login"
password_placeholder = "Toml Password"

[session]
max_age = 3600

[mailbox]
fetch_command = "toml-fetch-mailbox"
imap_address = "toml-noreply@yona.example"
polling_enabled = false
polling_initial_delay = "5s"
polling_interval = "60s"

[project]
default_scope = "private"
default_menus = ["issue"]
max_file_size = 12345

[smtp]
host = "smtp.toml.example.com"
port = 465
ssl = true
user = "toml-user"
password = "toml-pass"
domain = "toml-domain.example.com"
from = "toml-from@example.com"

[webhook]
delivery_retries = 1
allow_private_networks = false

[update]
current_version = "toml-current"
latest_version = "toml-latest"
version = "toml-version"
release_url = "https://toml.example/release"
metadata_url = "https://toml.example/latest.json"
metadata_file = "/toml/latest.json"
https_fetch_command = "toml-fetch"

[notification]
mail_enabled = true
mail_initial_delay = "5s"
mail_interval = "60s"
mail_delay = "180s"
recipient_limit = 100
hide_address = true
draft_time = "30s"
"#,
    )
    .expect("write config");

    let config = load_startup_config(
        BTreeMap::from([
            (
                "YORAM_CONFIG_TOML".to_string(),
                config_path.to_string_lossy().into_owned(),
            ),
            ("YONA_BASE_PATH".to_string(), "/env".to_string()),
            (
                "YONA_PUBLIC_ORIGIN".to_string(),
                "https://env.example.com".to_string(),
            ),
            (
                "YONA_DATABASE_URL".to_string(),
                "sqlite::memory:".to_string(),
            ),
            (
                "YONA_SCHEMA_POLICY".to_string(),
                "validate_only".to_string(),
            ),
            ("YONA_SEED_PILOT".to_string(), "1".to_string()),
            ("YONA_SHOW_USER_EMAIL".to_string(), "yes".to_string()),
            ("YONA_SEND_YONA_USAGE".to_string(), "false".to_string()),
            ("YONA_SITE_NAME".to_string(), "Env Yona".to_string()),
            (
                "YONA_NAVBAR_CUSTOM_LINK_NAME".to_string(),
                "Env Docs".to_string(),
            ),
            (
                "YONA_NAVBAR_CUSTOM_LINK_URL".to_string(),
                "https://env.example/docs".to_string(),
            ),
            (
                "YONA_APPLICATION_HOSTNAME".to_string(),
                "env.example.com".to_string(),
            ),
            (
                "YONA_ALLOWED_MAIL_DOMAINS".to_string(),
                "allowed.example.com,other.example.com".to_string(),
            ),
            (
                "YONA_ALLOW_ANONYMOUS_ACCESS".to_string(),
                "true".to_string(),
            ),
            (
                "YONA_AUTH_LOGIN_ID_PLACEHOLDER".to_string(),
                "Env Login".to_string(),
            ),
            (
                "YONA_AUTH_PASSWORD_PLACEHOLDER".to_string(),
                "Env Password".to_string(),
            ),
            (
                "YONA_AUTH_SOCIAL_LOGIN_SUPPORT".to_string(),
                "github, google".to_string(),
            ),
            (
                "YONA_OAUTH_GITHUB_CLIENT_ID".to_string(),
                "github-env-client".to_string(),
            ),
            (
                "YONA_OAUTH_GITHUB_CLIENT_SECRET".to_string(),
                "github-env-secret".to_string(),
            ),
            (
                "YONA_OAUTH_GITHUB_ACCESS_TOKEN_URL".to_string(),
                "https://github.env/login/oauth/access_token".to_string(),
            ),
            (
                "YONA_OAUTH_GITHUB_AUTHORIZATION_URL".to_string(),
                "https://github.env/login/oauth/authorize".to_string(),
            ),
            (
                "YONA_OAUTH_GITHUB_USER_INFO_URL".to_string(),
                "https://github.env/api/v3/user".to_string(),
            ),
            (
                "YONA_OAUTH_GITHUB_EMAIL_URL".to_string(),
                "https://github.env/api/v3/user/emails".to_string(),
            ),
            (
                "YONA_OAUTH_GITHUB_SCOPE".to_string(),
                "read:user user:email".to_string(),
            ),
            (
                "YONA_SESSION_TIMEOUT_SECONDS".to_string(),
                "7200".to_string(),
            ),
            (
                "YONA_MAILBOX_FETCH_COMMAND".to_string(),
                "env-fetch-mailbox".to_string(),
            ),
            (
                "YONA_MAILBOX_IMAP_ADDRESS".to_string(),
                "env-noreply@yona.example".to_string(),
            ),
            (
                "YONA_MAILBOX_POLLING_ENABLED".to_string(),
                "true".to_string(),
            ),
            (
                "YONA_MAILBOX_POLLING_INITIAL_DELAY".to_string(),
                "1s".to_string(),
            ),
            (
                "YONA_MAILBOX_POLLING_INTERVAL".to_string(),
                "2s".to_string(),
            ),
            ("YONA_LANGS".to_string(), "ja-JP,en-US".to_string()),
            (
                "application.feedback.url".to_string(),
                "https://env.example/feedback".to_string(),
            ),
            (
                "application.hide.project.listing".to_string(),
                "true".to_string(),
            ),
            (
                "YONA_TRANSLATION_API".to_string(),
                "https://env.example/translate".to_string(),
            ),
            (
                "YONA_TRANSLATION_HEADER_KEY".to_string(),
                "X-Translate-Key".to_string(),
            ),
            (
                "YONA_TRANSLATION_HEADER_VALUE".to_string(),
                "env-secret".to_string(),
            ),
            (
                "YONA_PROJECT_DEFAULT_SCOPE".to_string(),
                "public".to_string(),
            ),
            (
                "YONA_PROJECT_DEFAULT_MENUS".to_string(),
                "code,review".to_string(),
            ),
            ("YONA_MAX_FILE_SIZE".to_string(), "67890".to_string()),
            (
                "YONA_SMTP_HOST".to_string(),
                "smtp.env.example.com".to_string(),
            ),
            ("YONA_SMTP_PORT".to_string(), "2525".to_string()),
            ("YONA_SMTP_SSL".to_string(), "false".to_string()),
            ("YONA_SMTP_USER".to_string(), "env-user".to_string()),
            ("YONA_SMTP_PASSWORD".to_string(), "env-pass".to_string()),
            (
                "YONA_SMTP_DOMAIN".to_string(),
                "smtp-env.example.com".to_string(),
            ),
            (
                "YONA_SMTP_FROM".to_string(),
                "env-from@example.com".to_string(),
            ),
            ("YONA_WEBHOOK_DELIVERY_RETRIES".to_string(), "4".to_string()),
            (
                "YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS".to_string(),
                "true".to_string(),
            ),
            ("slack.NEW_ISSUE".to_string(), "good".to_string()),
            ("slack.NEW_COMMENT".to_string(), "#439fe0".to_string()),
            (
                "YONA_CURRENT_VERSION".to_string(),
                "env-current".to_string(),
            ),
            (
                "YONA_UPDATE_LATEST_VERSION".to_string(),
                "env-latest".to_string(),
            ),
            ("YONA_UPDATE_VERSION".to_string(), "env-version".to_string()),
            (
                "YONA_UPDATE_RELEASE_URL".to_string(),
                "https://env.example/release".to_string(),
            ),
            (
                "YONA_UPDATE_METADATA_URL".to_string(),
                "https://env.example/latest.json".to_string(),
            ),
            (
                "YONA_UPDATE_METADATA_FILE".to_string(),
                "/env/latest.json".to_string(),
            ),
            (
                "YONA_UPDATE_HTTPS_FETCH_COMMAND".to_string(),
                "env-fetch".to_string(),
            ),
            (
                "YONA_NOTIFICATION_MAIL_ENABLED".to_string(),
                "false".to_string(),
            ),
            (
                "YONA_NOTIFICATION_MAIL_INITIAL_DELAY".to_string(),
                "1s".to_string(),
            ),
            (
                "YONA_NOTIFICATION_MAIL_INTERVAL".to_string(),
                "2s".to_string(),
            ),
            ("YONA_NOTIFICATION_MAIL_DELAY".to_string(), "3s".to_string()),
            (
                "YONA_NOTIFICATION_MAIL_HIDE_ADDRESS".to_string(),
                "false".to_string(),
            ),
            (
                "YONA_NOTIFICATION_MAIL_RECIPIENT_LIMIT".to_string(),
                "7".to_string(),
            ),
            (
                "YONA_NOTIFICATION_DRAFT_TIME".to_string(),
                "1ms".to_string(),
            ),
            ("YONA_ISSUE_EVENT_DRAFT_TIME".to_string(), "2ms".to_string()),
            ("YONA_BIND_ADDR".to_string(), "127.0.0.1:29089".to_string()),
        ]),
        dir.path(),
    )
    .expect("load startup config");

    assert_eq!(config.runtime.base_path, "/env");
    assert_eq!(config.runtime.public_origin, "https://env.example.com");
    assert_eq!(config.database_url, "sqlite::memory:");
    assert_eq!(config.schema_policy, RuntimeSchemaPolicy::ValidateOnly);
    assert_eq!(config.seed_pilot, true);
    assert_eq!(config.show_user_email, Some(true));
    assert_eq!(config.send_yona_usage, Some(false));
    assert_eq!(config.site_name.as_deref(), Some("Env Yona"));
    assert_eq!(
        config.feedback_url.as_deref(),
        Some("https://env.example/feedback")
    );
    assert_eq!(config.hide_project_listing, Some(true));
    assert_eq!(config.navbar_custom_link_name.as_deref(), Some("Env Docs"));
    assert_eq!(
        config.navbar_custom_link_url.as_deref(),
        Some("https://env.example/docs")
    );
    assert_eq!(config.site_hostname.as_deref(), Some("env.example.com"));
    assert_eq!(
        config.allowed_sending_mail_domains,
        Some(vec![
            "allowed.example.com".to_string(),
            "other.example.com".to_string()
        ])
    );
    assert_eq!(config.site_allow_anonymous_access, Some(true));
    assert_eq!(
        config.auth_login_id_placeholder.as_deref(),
        Some("Env Login")
    );
    assert_eq!(
        config.auth_password_placeholder.as_deref(),
        Some("Env Password")
    );
    assert_eq!(
        config.auth_social_login_support,
        Some(vec!["github".to_string(), "google".to_string()])
    );
    let oauth = config.oauth_providers.as_ref().expect("oauth providers");
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.client_id.as_deref()),
        Some("github-env-client")
    );
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.client_secret.as_deref()),
        Some("github-env-secret")
    );
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.access_token_url.as_deref()),
        Some("https://github.env/login/oauth/access_token")
    );
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.authorization_url.as_deref()),
        Some("https://github.env/login/oauth/authorize")
    );
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.user_info_url.as_deref()),
        Some("https://github.env/api/v3/user")
    );
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.email_url.as_deref()),
        Some("https://github.env/api/v3/user/emails")
    );
    assert_eq!(
        oauth
            .get("github")
            .and_then(|provider| provider.scope.as_deref()),
        Some("read:user user:email")
    );
    assert_eq!(config.session_timeout_seconds, Some(7200));
    assert_eq!(
        config.mailbox_fetch_command.as_deref(),
        Some("env-fetch-mailbox")
    );
    assert_eq!(
        config.mailbox_imap_address.as_deref(),
        Some("env-noreply@yona.example")
    );
    assert_eq!(config.mailbox_polling_enabled, Some(true));
    assert_eq!(config.mailbox_polling_initial_delay.as_deref(), Some("1s"));
    assert_eq!(config.mailbox_polling_interval.as_deref(), Some("2s"));
    assert_eq!(
        config.supported_languages,
        Some(vec!["ja-JP".to_string(), "en-US".to_string()])
    );
    assert_eq!(
        config.translation_api.as_deref(),
        Some("https://env.example/translate")
    );
    assert_eq!(
        config.translation_header_key.as_deref(),
        Some("X-Translate-Key")
    );
    assert_eq!(
        config.translation_header_value.as_deref(),
        Some("env-secret")
    );
    assert_eq!(config.project_default_scope.as_deref(), Some("public"));
    assert_eq!(
        config.project_default_menus,
        Some(vec!["code".to_string(), "review".to_string()])
    );
    assert_eq!(config.max_file_size, Some(67890));
    assert_eq!(config.smtp_host.as_deref(), Some("smtp.env.example.com"));
    assert_eq!(config.smtp_port, Some(2525));
    assert_eq!(config.smtp_ssl, Some(false));
    assert_eq!(config.smtp_user.as_deref(), Some("env-user"));
    assert_eq!(config.smtp_password.as_deref(), Some("env-pass"));
    assert_eq!(config.smtp_domain.as_deref(), Some("smtp-env.example.com"));
    assert_eq!(config.smtp_from.as_deref(), Some("env-from@example.com"));
    assert_eq!(
        config.update_current_version.as_deref(),
        Some("env-current")
    );
    assert_eq!(config.update_latest_version.as_deref(), Some("env-latest"));
    assert_eq!(config.update_version.as_deref(), Some("env-version"));
    assert_eq!(
        config.update_release_url.as_deref(),
        Some("https://env.example/release")
    );
    assert_eq!(
        config.update_metadata_url.as_deref(),
        Some("https://env.example/latest.json")
    );
    assert_eq!(
        config.update_metadata_file.as_deref(),
        Some("/env/latest.json")
    );
    assert_eq!(
        config.update_https_fetch_command.as_deref(),
        Some("env-fetch")
    );
    assert_eq!(config.webhook_delivery_retries, Some(4));
    assert_eq!(config.webhook_allow_private_networks, Some(true));
    assert_eq!(
        config
            .slack_webhook_colors
            .get("NEW_ISSUE")
            .map(String::as_str),
        Some("good")
    );
    assert_eq!(
        config
            .slack_webhook_colors
            .get("NEW_COMMENT")
            .map(String::as_str),
        Some("#439fe0")
    );
    assert_eq!(config.notification_mail_enabled, Some(false));
    assert_eq!(
        config.notification_mail_initial_delay.as_deref(),
        Some("1s")
    );
    assert_eq!(config.notification_mail_interval.as_deref(), Some("2s"));
    assert_eq!(config.notification_mail_delay.as_deref(), Some("3s"));
    assert_eq!(config.notification_mail_hide_address, Some(false));
    assert_eq!(config.notification_mail_recipient_limit, Some(7));
    assert_eq!(config.notification_draft_time.as_deref(), Some("1ms"));
    assert_eq!(config.issue_event_draft_time.as_deref(), Some("2ms"));
    assert_eq!(config.bind_addr, "127.0.0.1:29089");
}

#[test]
fn startup_config_snapshots_legacy_smtp_aliases() {
    let dir = tempdir().expect("tempdir");
    let config = load_startup_config(
        BTreeMap::from([
            (
                "APPLICATION_HOSTNAME".to_string(),
                "legacy-host.example.com".to_string(),
            ),
            (
                "SMTP_HOST".to_string(),
                "smtp.legacy.example.com".to_string(),
            ),
            ("SMTP_PORT".to_string(), "2526".to_string()),
            ("SMTP_SSL".to_string(), "true".to_string()),
            ("SMTP_USER".to_string(), "legacy-user".to_string()),
            ("SMTP_PASS".to_string(), "legacy-pass".to_string()),
            (
                "SMTP_DOMAIN".to_string(),
                "legacy-domain.example.com".to_string(),
            ),
            (
                "SMTP_FROM".to_string(),
                "legacy-from@example.com".to_string(),
            ),
        ]),
        dir.path(),
    )
    .expect("load config");

    assert_eq!(
        config.site_hostname.as_deref(),
        Some("legacy-host.example.com")
    );
    assert_eq!(config.smtp_host.as_deref(), Some("smtp.legacy.example.com"));
    assert_eq!(config.smtp_port, Some(2526));
    assert_eq!(config.smtp_ssl, Some(true));
    assert_eq!(config.smtp_user.as_deref(), Some("legacy-user"));
    assert_eq!(config.smtp_password.as_deref(), Some("legacy-pass"));
    assert_eq!(
        config.smtp_domain.as_deref(),
        Some("legacy-domain.example.com")
    );
    assert_eq!(config.smtp_from.as_deref(), Some("legacy-from@example.com"));
}

#[test]
fn repository_config_from_startup_carries_persistence_runtime_snapshot() {
    let dir = tempdir().expect("tempdir");
    let config_path = dir.path().join("yoram.toml");
    fs::write(
        &config_path,
        r#"
[site]
guest_login_prefix = "guest-"

[issue]
event_draft_time = "1s"

[project]
default_menus = ["issue", "board"]

[notification]
draft_time = "250ms"
"#,
    )
    .expect("write config");

    let config = load_startup_config(
        BTreeMap::from([(
            "YORAM_CONFIG_TOML".to_string(),
            config_path.to_string_lossy().into_owned(),
        )]),
        dir.path(),
    )
    .expect("load startup config");

    let repository_config = repository_config_from_startup(&config);
    assert!(repository_config.login_id_matches_guest_prefix("guest-alice"));
    assert_eq!(repository_config.issue_event_draft_time_in_millis(), 1_000);
    assert_eq!(repository_config.notification_draft_time_in_millis(), 250);
    let menu_settings = repository_config.project_default_menu_settings();
    assert!(menu_settings.issue);
    assert!(menu_settings.board);
    assert!(!menu_settings.code);
    assert!(!menu_settings.pull_request);
    assert!(!menu_settings.review);
    assert!(!menu_settings.milestone);
}

#[test]
fn invalid_schema_policy_in_toml_is_rejected() {
    let dir = tempdir().expect("tempdir");
    let config_path = dir.path().join("yoram.toml");
    fs::write(&config_path, "schema_policy = \"broken\"\n").expect("write config");

    let error = load_startup_config(
        BTreeMap::from([(
            "YORAM_CONFIG_TOML".to_string(),
            config_path.to_string_lossy().into_owned(),
        )]),
        dir.path(),
    )
    .expect_err("invalid policy should fail");

    assert!(
        error.to_string().contains("unsupported schema policy"),
        "{error}"
    );
}
