use std::sync::{Mutex, OnceLock};

use yona_rust_integrations::smtp_delivery_config_from_env;

fn smtp_env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn clear_smtp_ssl_env() {
    std::env::remove_var("SMTP_SSL");
    std::env::remove_var("YONA_SMTP_SSL");
}

#[test]
fn smtp_ssl_env_accepts_legacy_yona_alias() {
    let _guard = smtp_env_lock().lock().unwrap();
    clear_smtp_ssl_env();
    let default_config = smtp_delivery_config_from_env();
    assert_eq!(default_config.ssl_enabled, None);
    assert_eq!(default_config.default_port, 587);

    std::env::set_var("YONA_SMTP_SSL", "true");
    let ssl_config = smtp_delivery_config_from_env();
    assert_eq!(ssl_config.ssl_enabled, Some(true));
    assert_eq!(ssl_config.default_port, 465);

    std::env::set_var("YONA_SMTP_SSL", "false");
    let plain_config = smtp_delivery_config_from_env();
    assert_eq!(plain_config.ssl_enabled, Some(false));
    assert_eq!(plain_config.default_port, 25);

    std::env::remove_var("YONA_SMTP_SSL");
    std::env::set_var("SMTP_SSL", "on");
    let legacy_config = smtp_delivery_config_from_env();
    assert_eq!(legacy_config.ssl_enabled, Some(true));
    assert_eq!(legacy_config.default_port, 465);

    clear_smtp_ssl_env();
}
