use std::sync::{Mutex, OnceLock};

use yona_rust_integrations::{
    clear_test_webhook_outbox, deliver_webhook, queue_test_webhook_failure,
    queue_test_webhook_response, snapshot_test_webhook_outbox,
    webhook_delivery_retry_count_from_env, OutboundWebhook,
};

fn webhook_env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn clear_webhook_retry_env() {
    std::env::remove_var("WEBHOOK_DELIVERY_RETRIES");
    std::env::remove_var("YONA_WEBHOOK_DELIVERY_RETRIES");
}

#[test]
fn webhook_delivery_retry_count_accepts_legacy_yona_alias() {
    let _guard = webhook_env_lock().lock().unwrap();
    clear_webhook_retry_env();
    assert_eq!(webhook_delivery_retry_count_from_env(), 0);

    std::env::set_var("YONA_WEBHOOK_DELIVERY_RETRIES", "2");
    assert_eq!(webhook_delivery_retry_count_from_env(), 2);

    std::env::set_var("YONA_WEBHOOK_DELIVERY_RETRIES", "99");
    assert_eq!(webhook_delivery_retry_count_from_env(), 5);

    std::env::remove_var("YONA_WEBHOOK_DELIVERY_RETRIES");
    std::env::set_var("WEBHOOK_DELIVERY_RETRIES", "1");
    assert_eq!(webhook_delivery_retry_count_from_env(), 1);

    clear_webhook_retry_env();
}

#[test]
fn webhook_delivery_retries_transient_failures_before_returning_success() {
    let _guard = webhook_env_lock().lock().unwrap();
    clear_webhook_retry_env();
    clear_test_webhook_outbox();
    std::env::set_var("YONA_WEBHOOK_DELIVERY_RETRIES", "1");
    queue_test_webhook_failure("temporary webhook failure");
    queue_test_webhook_response("ok");

    let outcome = deliver_webhook(OutboundWebhook {
        body: "{\"text\":\"hello\"}".to_string(),
        event_type: "NEW_ISSUE".to_string(),
        payload_url: "https://hooks.example/retry".to_string(),
        secret: "s3".to_string(),
        webhook_type: "SIMPLE".to_string(),
    })
    .expect("retried webhook succeeds");

    assert_eq!(outcome.response_body.as_deref(), Some("ok"));
    let attempts = snapshot_test_webhook_outbox();
    assert_eq!(attempts.len(), 2);
    assert!(attempts.iter().all(|attempt| {
        attempt.payload_url == "https://hooks.example/retry"
            && attempt.event_type == "NEW_ISSUE"
            && attempt.webhook_type == "SIMPLE"
    }));

    clear_webhook_retry_env();
    clear_test_webhook_outbox();
}
