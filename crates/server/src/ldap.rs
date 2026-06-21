use std::time::Duration;

use futures::future::BoxFuture;
use ldap3::{LdapConnAsync, LdapConnSettings, Scope, SearchEntry};

use crate::{normalize_identifier, LdapFixtureUser, LdapRuntimeConfig};

const LEGACY_LDAP_TIMEOUT: Duration = Duration::from_millis(5000);

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct LdapBindSearchRequest {
    pub bind_principal: String,
    pub password: String,
    pub base_dn: String,
    pub filter: String,
    pub attributes: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum LdapConnectorError {
    Authentication,
    ConnectionUnavailable,
}

pub(crate) trait LdapDirectoryConnector {
    fn bind_search<'a>(
        &'a self,
        config: &'a LdapRuntimeConfig,
        request: LdapBindSearchRequest,
    ) -> BoxFuture<'a, Result<Option<LdapFixtureUser>, LdapConnectorError>>;
}

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct RealLdapDirectoryConnector;

impl LdapDirectoryConnector for RealLdapDirectoryConnector {
    fn bind_search<'a>(
        &'a self,
        config: &'a LdapRuntimeConfig,
        request: LdapBindSearchRequest,
    ) -> BoxFuture<'a, Result<Option<LdapFixtureUser>, LdapConnectorError>> {
        Box::pin(async move {
            let url = format!(
                "{}://{}:{}",
                config.protocol.trim(),
                config.host.trim(),
                config.port
            );
            let settings = LdapConnSettings::new().set_conn_timeout(LEGACY_LDAP_TIMEOUT);
            let (conn, mut ldap) = LdapConnAsync::with_settings(settings, &url)
                .await
                .map_err(|_| LdapConnectorError::ConnectionUnavailable)?;
            ldap3::drive!(conn);

            ldap.simple_bind(&request.bind_principal, &request.password)
                .await
                .map_err(|_| LdapConnectorError::ConnectionUnavailable)?
                .success()
                .map_err(|_| LdapConnectorError::Authentication)?;

            let (entries, _result) = ldap
                .search(
                    &request.base_dn,
                    Scope::Subtree,
                    &request.filter,
                    request.attributes,
                )
                .await
                .map_err(|_| LdapConnectorError::ConnectionUnavailable)?
                .success()
                .map_err(|_| LdapConnectorError::ConnectionUnavailable)?;

            if entries.len() > 1 {
                return Ok(None);
            }
            let Some(entry) = entries.into_iter().next() else {
                return Ok(None);
            };
            Ok(project_search_entry(config, SearchEntry::construct(entry)))
        })
    }
}

pub(crate) async fn authenticate_with_real_ldap_connector<C>(
    config: &LdapRuntimeConfig,
    identity: &str,
    password: &str,
    connector: &C,
) -> Result<Option<LdapFixtureUser>, LdapConnectorError>
where
    C: LdapDirectoryConnector + ?Sized,
{
    let request = legacy_bind_search_request(config, identity, password);
    connector.bind_search(config, request).await
}

pub(crate) fn fixture_ldap_authenticate(
    config: &LdapRuntimeConfig,
    identity: &str,
    password: &str,
) -> Option<LdapFixtureUser> {
    let normalized_identity = normalize_identifier(identity);
    config
        .fixture_users
        .iter()
        .find(|user| {
            let candidate = if normalized_identity.contains('@') {
                &user.email
            } else {
                &user.login_id
            };
            normalize_identifier(candidate) == normalized_identity && user.password == password
        })
        .cloned()
}

fn legacy_bind_search_request(
    config: &LdapRuntimeConfig,
    identity: &str,
    password: &str,
) -> LdapBindSearchRequest {
    let trimmed_identity = identity.trim();
    let bind_principal = if trimmed_identity.contains('@') {
        trimmed_identity.to_string()
    } else {
        format!(
            "{}={},{}",
            config.user_name_property.trim(),
            trimmed_identity,
            config.distinguished_name_postfix.trim()
        )
    };
    let search_property = if trimmed_identity.contains('@') {
        config.email_property.trim()
    } else {
        config.login_property.trim()
    };
    let mut attributes = vec![
        config.display_name_property.trim().to_string(),
        config.email_property.trim().to_string(),
        config.login_property.trim().to_string(),
        "department".to_string(),
    ];
    if !config.english_name_attribute_name.trim().is_empty() {
        attributes.push(config.english_name_attribute_name.trim().to_string());
    }
    attributes.sort();
    attributes.dedup();
    LdapBindSearchRequest {
        bind_principal,
        password: password.to_string(),
        base_dn: config.base_dn.trim().to_string(),
        filter: format!(
            "({}={})",
            search_property,
            escape_ldap_filter_value(trimmed_identity)
        ),
        attributes,
    }
}

fn project_search_entry(config: &LdapRuntimeConfig, entry: SearchEntry) -> Option<LdapFixtureUser> {
    let display_name = first_attr(&entry, &config.display_name_property)?;
    let email = first_attr(&entry, &config.email_property)?;
    let login_id = first_attr(&entry, &config.login_property)?;
    let department = first_attr(&entry, "department").unwrap_or_default();
    let english_name = if config.english_name_attribute_name.trim().is_empty() {
        String::new()
    } else {
        first_attr(&entry, &config.english_name_attribute_name).unwrap_or_default()
    };
    Some(LdapFixtureUser {
        department,
        display_name,
        email,
        english_name,
        login_id,
        password: String::new(),
    })
}

fn first_attr(entry: &SearchEntry, name: &str) -> Option<String> {
    entry
        .attrs
        .get(name.trim())
        .and_then(|values| values.first())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn escape_ldap_filter_value(value: &str) -> String {
    let mut escaped = String::new();
    for byte in value.as_bytes() {
        match byte {
            b'*' => escaped.push_str("\\2a"),
            b'(' => escaped.push_str("\\28"),
            b')' => escaped.push_str("\\29"),
            b'\\' => escaped.push_str("\\5c"),
            0 => escaped.push_str("\\00"),
            _ => escaped.push(*byte as char),
        }
    }
    escaped
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use futures::future::BoxFuture;

    use super::*;

    #[derive(Clone)]
    struct RecordingConnector {
        request: Arc<Mutex<Option<LdapBindSearchRequest>>>,
        result: Option<LdapFixtureUser>,
    }

    impl LdapDirectoryConnector for RecordingConnector {
        fn bind_search<'a>(
            &'a self,
            _config: &'a LdapRuntimeConfig,
            request: LdapBindSearchRequest,
        ) -> BoxFuture<'a, Result<Option<LdapFixtureUser>, LdapConnectorError>> {
            Box::pin(async move {
                *self.request.lock().unwrap() = Some(request);
                Ok(self.result.clone())
            })
        }
    }

    #[tokio::test]
    async fn real_connector_boundary_builds_legacy_bind_and_search_request() {
        let captured = Arc::new(Mutex::new(None));
        let connector = RecordingConnector {
            request: captured.clone(),
            result: Some(LdapFixtureUser {
                department: "Engineering".to_string(),
                display_name: "Door User".to_string(),
                email: "door@example.com".to_string(),
                english_name: "Door".to_string(),
                login_id: "door".to_string(),
                password: String::new(),
            }),
        };
        let config = LdapRuntimeConfig {
            base_dn: "ou=people,dc=example,dc=com".to_string(),
            distinguished_name_postfix: "OU=user,DC=example,DC=com".to_string(),
            english_name_attribute_name: "givenName".to_string(),
            login_property: "uid".to_string(),
            user_name_property: "CN".to_string(),
            ..LdapRuntimeConfig::default()
        };

        let user =
            authenticate_with_real_ldap_connector(&config, "door*(ops)", "ldap-pass", &connector)
                .await
                .unwrap()
                .expect("ldap user");

        assert_eq!(user.email, "door@example.com");
        let request = captured.lock().unwrap().clone().expect("captured request");
        assert_eq!(
            request.bind_principal,
            "CN=door*(ops),OU=user,DC=example,DC=com"
        );
        assert_eq!(request.base_dn, "ou=people,dc=example,dc=com");
        assert_eq!(request.filter, "(uid=door\\2a\\28ops\\29)");
        assert!(request.attributes.contains(&"displayName".to_string()));
        assert!(request.attributes.contains(&"mail".to_string()));
        assert!(request.attributes.contains(&"uid".to_string()));
        assert!(request.attributes.contains(&"department".to_string()));
        assert!(request.attributes.contains(&"givenName".to_string()));
    }

    #[tokio::test]
    async fn real_connector_boundary_uses_email_identity_directly() {
        let captured = Arc::new(Mutex::new(None));
        let connector = RecordingConnector {
            request: captured.clone(),
            result: None,
        };
        let config = LdapRuntimeConfig {
            email_property: "mail".to_string(),
            ..LdapRuntimeConfig::default()
        };

        let result = authenticate_with_real_ldap_connector(
            &config,
            "door@example.com",
            "secret",
            &connector,
        )
        .await
        .unwrap();

        assert!(result.is_none());
        let request = captured.lock().unwrap().clone().expect("captured request");
        assert_eq!(request.bind_principal, "door@example.com");
        assert_eq!(request.filter, "(mail=door@example.com)");
    }
}
