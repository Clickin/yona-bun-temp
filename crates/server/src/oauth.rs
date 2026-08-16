// OAuth login providers as a trait with singleton per-provider
// implementations. `OAuthProviderKind` is the enum that pattern-matches to
// the right `&'static dyn OAuthProvider` (unit structs — zero allocation).
//
// Provider-specific behavior comes from each provider's docs:
// - GitHub: userinfo `https://api.github.com/user`, primary email from
//   `/user/emails`, scope `user:email`.
// - Google: OpenID Connect userinfo
//   `https://openidconnect.googleapis.com/v1/userinfo`, scope
//   `openid email profile`, stable id is `sub`.
// - Kakao: userinfo `https://kapi.kakao.com/v2/user/me` returns
//   `{ id, kakao_account: { email, profile: { nickname } } }`; email is
//   optional (user consent) so the app should require the `account_email`
//   consent item.
// - Naver: userinfo `https://openapi.naver.com/v1/nid/me` returns
//   `{ resultcode: "00", response: { id, email, name, nickname } }`; the
//   `state` parameter is REQUIRED on both authorize and token requests, and
//   the token request is a GET with query params.
use serde_json::Value;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum OAuthProviderKind {
    Github,
    Google,
    Kakao,
    Naver,
}

impl OAuthProviderKind {
    pub(crate) fn from_str(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "github" => Some(Self::Github),
            "google" => Some(Self::Google),
            "kakao" => Some(Self::Kakao),
            "naver" => Some(Self::Naver),
            _ => None,
        }
    }

    pub(crate) fn as_str(&self) -> &'static str {
        match self {
            Self::Github => "github",
            Self::Google => "google",
            Self::Kakao => "kakao",
            Self::Naver => "naver",
        }
    }

    pub(crate) fn display_name(&self) -> &'static str {
        match self {
            Self::Github => "GitHub",
            Self::Google => "Google",
            Self::Kakao => "Kakao",
            Self::Naver => "Naver",
        }
    }

    /// Pattern-matches the enum to the singleton provider implementation.
    pub(crate) fn provider(&self) -> &'static dyn OAuthProvider {
        match self {
            Self::Github => &GithubProvider,
            Self::Google => &GoogleProvider,
            Self::Kakao => &KakaoProvider,
            Self::Naver => &NaverProvider,
        }
    }
}

#[derive(Debug)]
pub(crate) struct OAuthProviderIdentity {
    pub provider_user_id: String,
    pub email: String,
    pub name: String,
}

pub(crate) trait OAuthProvider: Send + Sync {
    fn kind(&self) -> OAuthProviderKind;

    fn default_authorization_url(&self) -> &'static str;
    fn default_access_token_url(&self) -> &'static str;
    fn default_user_info_url(&self) -> &'static str;
    fn default_email_url(&self) -> Option<&'static str> {
        None
    }
    fn default_scope(&self) -> &'static str;

    /// Fetch the primary email from a separate endpoint (GitHub only).
    fn fetch_email(&self) -> bool {
        false
    }

    /// Naver's token endpoint is a GET with query params (not POST form).
    fn token_request_is_get(&self) -> bool {
        false
    }

    /// Naver requires the authorize `state` echoed back on the token request.
    fn token_request_requires_state(&self) -> bool {
        false
    }

    fn parse_identity(
        &self,
        userinfo: &Value,
        email_response: Option<&Value>,
    ) -> Option<OAuthProviderIdentity>;
}

fn json_string_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn json_id_field(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(|field| match field {
        Value::String(value) => {
            let value = value.trim();
            (!value.is_empty()).then(|| value.to_string())
        }
        Value::Number(value) => Some(value.to_string()),
        _ => None,
    })
}

fn github_primary_email(value: &Value) -> Option<String> {
    let emails = value.as_array()?;
    emails
        .iter()
        .find(|entry| {
            entry
                .get("primary")
                .and_then(Value::as_bool)
                .unwrap_or(false)
                && entry
                    .get("verified")
                    .and_then(Value::as_bool)
                    .unwrap_or(true)
        })
        .or_else(|| emails.first())
        .and_then(|entry| json_string_field(entry, "email"))
        .map(|email| email.trim().to_ascii_lowercase())
        .filter(|email| !email.is_empty())
}

pub(crate) struct GithubProvider;
pub(crate) struct GoogleProvider;
pub(crate) struct KakaoProvider;
pub(crate) struct NaverProvider;

impl OAuthProvider for GithubProvider {
    fn kind(&self) -> OAuthProviderKind {
        OAuthProviderKind::Github
    }
    fn default_authorization_url(&self) -> &'static str {
        "https://github.com/login/oauth/authorize"
    }
    fn default_access_token_url(&self) -> &'static str {
        "https://github.com/login/oauth/access_token"
    }
    fn default_user_info_url(&self) -> &'static str {
        "https://api.github.com/user"
    }
    fn default_email_url(&self) -> Option<&'static str> {
        Some("https://api.github.com/user/emails")
    }
    fn default_scope(&self) -> &'static str {
        "user:email"
    }
    fn fetch_email(&self) -> bool {
        true
    }
    fn parse_identity(
        &self,
        userinfo: &Value,
        email_response: Option<&Value>,
    ) -> Option<OAuthProviderIdentity> {
        let provider_user_id = json_id_field(userinfo, "id")?;
        let email = json_string_field(userinfo, "email")
            .map(|email| email.trim().to_ascii_lowercase())
            .filter(|email| !email.is_empty())
            .or_else(|| github_primary_email(email_response?))?;
        let name = json_string_field(userinfo, "name")
            .or_else(|| json_string_field(userinfo, "login"))
            .unwrap_or_else(|| email.clone());
        Some(OAuthProviderIdentity {
            provider_user_id,
            email,
            name,
        })
    }
}

impl OAuthProvider for GoogleProvider {
    fn kind(&self) -> OAuthProviderKind {
        OAuthProviderKind::Google
    }
    fn default_authorization_url(&self) -> &'static str {
        "https://accounts.google.com/o/oauth2/v2/auth"
    }
    fn default_access_token_url(&self) -> &'static str {
        "https://oauth2.googleapis.com/token"
    }
    fn default_user_info_url(&self) -> &'static str {
        "https://openidconnect.googleapis.com/v1/userinfo"
    }
    fn default_scope(&self) -> &'static str {
        "openid email profile"
    }
    fn parse_identity(
        &self,
        userinfo: &Value,
        _email_response: Option<&Value>,
    ) -> Option<OAuthProviderIdentity> {
        let provider_user_id =
            json_id_field(userinfo, "sub").or_else(|| json_id_field(userinfo, "id"))?;
        let email = json_string_field(userinfo, "email")
            .map(|email| email.trim().to_ascii_lowercase())
            .filter(|email| !email.is_empty())?;
        let name = json_string_field(userinfo, "name")
            .or_else(|| json_string_field(userinfo, "displayName"))
            .unwrap_or_else(|| email.clone());
        Some(OAuthProviderIdentity {
            provider_user_id,
            email,
            name,
        })
    }
}

impl OAuthProvider for KakaoProvider {
    fn kind(&self) -> OAuthProviderKind {
        OAuthProviderKind::Kakao
    }
    fn default_authorization_url(&self) -> &'static str {
        "https://kauth.kakao.com/oauth/authorize"
    }
    fn default_access_token_url(&self) -> &'static str {
        "https://kauth.kakao.com/oauth/token"
    }
    fn default_user_info_url(&self) -> &'static str {
        "https://kapi.kakao.com/v2/user/me"
    }
    fn default_scope(&self) -> &'static str {
        "account_email profile_nickname"
    }
    fn parse_identity(
        &self,
        userinfo: &Value,
        _email_response: Option<&Value>,
    ) -> Option<OAuthProviderIdentity> {
        // Kakao: { id, kakao_account: { email, profile: { nickname } } }.
        // email is optional (user consent); require the account_email
        // consent item in the app so the login id hint stays derivable.
        let provider_user_id = json_id_field(userinfo, "id")?;
        let email = json_string_field(userinfo.get("kakao_account")?, "email")
            .map(|email| email.trim().to_ascii_lowercase())
            .filter(|email| !email.is_empty())?;
        let name = userinfo
            .get("kakao_account")
            .and_then(|account| account.get("profile"))
            .and_then(|profile| json_string_field(profile, "nickname"))
            .filter(|name| !name.trim().is_empty())
            .unwrap_or_else(|| email.clone());
        Some(OAuthProviderIdentity {
            provider_user_id,
            email,
            name,
        })
    }
}

impl OAuthProvider for NaverProvider {
    fn kind(&self) -> OAuthProviderKind {
        OAuthProviderKind::Naver
    }
    fn default_authorization_url(&self) -> &'static str {
        "https://nid.naver.com/oauth2.0/authorize"
    }
    fn default_access_token_url(&self) -> &'static str {
        "https://nid.naver.com/oauth2.0/token"
    }
    fn default_user_info_url(&self) -> &'static str {
        "https://openapi.naver.com/v1/nid/me"
    }
    fn default_scope(&self) -> &'static str {
        ""
    }
    fn token_request_is_get(&self) -> bool {
        true
    }
    fn token_request_requires_state(&self) -> bool {
        true
    }
    fn parse_identity(
        &self,
        userinfo: &Value,
        _email_response: Option<&Value>,
    ) -> Option<OAuthProviderIdentity> {
        // Naver: { resultcode: "00", response: { id, email, name, nickname } }.
        if json_string_field(userinfo, "resultcode").as_deref() != Some("00") {
            return None;
        }
        let response = userinfo.get("response")?;
        let provider_user_id = json_id_field(response, "id")?;
        let email = json_string_field(response, "email")
            .map(|email| email.trim().to_ascii_lowercase())
            .filter(|email| !email.is_empty())?;
        let name = json_string_field(response, "name")
            .or_else(|| json_string_field(response, "nickname"))
            .unwrap_or_else(|| email.clone());
        Some(OAuthProviderIdentity {
            provider_user_id,
            email,
            name,
        })
    }
}
