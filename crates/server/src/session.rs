use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use base64::Engine;
use http::HeaderMap;
use rand::RngCore;

#[derive(Clone, Debug, Default)]
pub struct Session {
    pub csrf_token: String,
    pub token: String,
    pub user_id: Option<i64>,
}

#[derive(Clone, Debug, Default)]
pub struct SessionConfig {
    pub cookie_path: String,
    pub public_origin: String,
}

#[derive(Clone, Debug, Default)]
pub struct SessionManager {
    config: SessionConfig,
    sessions: Arc<Mutex<HashMap<String, Session>>>,
}

impl SessionManager {
    pub fn new(config: SessionConfig) -> Self {
        Self {
            config,
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn ensure_anonymous_session(&self, headers: &HeaderMap) -> Session {
        let cookie_header = headers
            .get(http::header::COOKIE)
            .and_then(|value| value.to_str().ok())
            .unwrap_or_default();
        if let Some(existing) = self.read_session_from_cookie_header(cookie_header) {
            return existing;
        }

        let session = Session {
            csrf_token: random_token(),
            token: random_token(),
            user_id: None,
        };
        self.sessions
            .lock()
            .unwrap()
            .insert(session.token.clone(), session.clone());
        session
    }

    pub fn validate_csrf(&self, _headers: &HeaderMap, _session: &Session) -> bool {
        let token = _headers
            .get("X-CSRF-Token")
            .and_then(|value| value.to_str().ok())
            .map(str::trim)
            .unwrap_or_default();
        !token.is_empty() && token == _session.csrf_token
    }

    pub fn read_session_from_headers(&self, headers: &HeaderMap) -> Option<Session> {
        let cookie_header = headers
            .get(http::header::COOKIE)
            .and_then(|value| value.to_str().ok())
            .unwrap_or_default();
        self.read_session_from_cookie_header(cookie_header)
    }

    pub fn create_authenticated_session(
        &self,
        previous_token: Option<&str>,
        user_id: i64,
    ) -> Session {
        self.replace_session(previous_token, Some(user_id))
    }

    pub fn create_anonymous_session(&self, previous_token: Option<&str>) -> Session {
        self.replace_session(previous_token, None)
    }

    pub fn build_set_cookie_headers(&self, session: &Session) -> Vec<String> {
        let secure = self
            .config
            .public_origin
            .trim()
            .to_ascii_lowercase()
            .starts_with("https://");
        let path = normalize_cookie_path(&self.config.cookie_path);
        let secure_suffix = if secure { "; Secure" } else { "" };

        vec![
            format!(
                "yona_csrf_token={}; Path={}; SameSite=Lax{}",
                session.csrf_token, path, secure_suffix
            ),
            format!(
                "yona_session={}; Path={}; Max-Age={}; HttpOnly; SameSite=Lax{}",
                session.token,
                path,
                30 * 24 * 60 * 60,
                secure_suffix
            ),
        ]
    }
}

impl SessionManager {
    fn read_session_from_cookie_header(&self, cookie_header: &str) -> Option<Session> {
        let token = read_cookie_value(cookie_header, "yona_session")?;
        self.sessions.lock().unwrap().get(&token).cloned()
    }

    fn replace_session(&self, previous_token: Option<&str>, user_id: Option<i64>) -> Session {
        let mut sessions = self.sessions.lock().unwrap();
        let existing = previous_token.and_then(|token| sessions.remove(token));
        let session = Session {
            csrf_token: existing
                .as_ref()
                .map(|session| session.csrf_token.clone())
                .unwrap_or_else(random_token),
            token: existing
                .as_ref()
                .map(|session| session.token.clone())
                .unwrap_or_else(random_token),
            user_id,
        };
        sessions.insert(session.token.clone(), session.clone());
        session
    }
}

fn normalize_cookie_path(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() || trimmed == "/" {
        return "/".to_string();
    }
    let with_leading = if trimmed.starts_with('/') {
        trimmed.to_string()
    } else {
        format!("/{trimmed}")
    };
    let normalized = with_leading.trim_end_matches('/');
    if normalized.is_empty() {
        "/".to_string()
    } else {
        normalized.to_string()
    }
}

fn read_cookie_value(cookie_header: &str, name: &str) -> Option<String> {
    cookie_header.split(';').find_map(|part| {
        let trimmed = part.trim();
        let (key, value) = trimmed.split_once('=')?;
        if key == name {
            Some(value.to_string())
        } else {
            None
        }
    })
}

fn random_token() -> String {
    let mut bytes = [0_u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}
