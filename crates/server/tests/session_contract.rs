use http::HeaderMap;
use yona_rust_pilot_server::session::{Session, SessionConfig, SessionManager};

#[test]
fn csrf_validation_accepts_matching_token() {
    let manager = SessionManager::new(SessionConfig {
        cookie_path: "/yona".to_string(),
        public_origin: "https://public.yona.test".to_string(),
        session_timeout_seconds: None,
    });
    let session = Session {
        csrf_token: "csrf-token".to_string(),
        remember_me: false,
        token: "session-token".to_string(),
        user_id: None,
    };
    let mut headers = HeaderMap::new();
    headers.insert("X-CSRF-Token", "csrf-token".parse().unwrap());

    assert!(manager.validate_csrf(&headers, &session));
}

#[test]
fn configured_session_timeout_expires_stored_session_and_cookie() {
    let manager = SessionManager::new(SessionConfig {
        cookie_path: "/yona".to_string(),
        public_origin: "https://public.yona.test".to_string(),
        session_timeout_seconds: Some(0),
    });
    let session = manager.create_authenticated_session(None, 42, false);
    let cookies = manager.build_set_cookie_headers(&session);

    assert!(
        cookies
            .iter()
            .any(|cookie| cookie.starts_with("yona_session=") && cookie.contains("Max-Age=0")),
        "configured session timeout should be reflected in the session cookie: {cookies:?}"
    );
    assert!(
        cookies.iter().all(|cookie| cookie.contains("Path=/yona")),
        "session bootstrap cookies should preserve the configured base path: {cookies:?}"
    );

    let mut headers = HeaderMap::new();
    headers.insert(
        http::header::COOKIE,
        format!("yona_session={}", session.token).parse().unwrap(),
    );

    assert!(
        manager.read_session_from_headers(&headers).is_none(),
        "a stored session past the configured timeout must not authenticate"
    );
}
