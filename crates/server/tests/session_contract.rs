use http::HeaderMap;
use yona_rust_pilot_server::session::{Session, SessionConfig, SessionManager};

#[test]
fn csrf_validation_accepts_matching_token() {
    let manager = SessionManager::new(SessionConfig {
        cookie_path: "/yona".to_string(),
        public_origin: "https://public.yona.test".to_string(),
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
