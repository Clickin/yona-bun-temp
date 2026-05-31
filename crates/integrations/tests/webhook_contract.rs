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
    std::env::remove_var("WEBHOOK_HTTP_DELIVERY_ENABLED");
    std::env::remove_var("WEBHOOK_ALLOW_PRIVATE_NETWORKS");
    std::env::remove_var("YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS");
    std::env::remove_var("WEBHOOK_HTTPS_DELIVERY_COMMAND");
    std::env::remove_var("YONA_WEBHOOK_HTTPS_DELIVERY_COMMAND");
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

#[test]
fn webhook_https_delivery_uses_executable_fetcher_and_preserves_legacy_headers() {
    let _guard = webhook_env_lock().lock().unwrap();
    clear_webhook_retry_env();
    clear_test_webhook_outbox();
    let fake_curl_dir = std::env::temp_dir().join(format!(
        "yona-webhook-https-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos()
    ));
    std::fs::create_dir_all(&fake_curl_dir).expect("fake curl tempdir");
    let fake_curl = fake_curl_dir.join("fake-curl.ps1");
    let capture_path = fake_curl_dir.join("body.txt");
    std::fs::write(
        &fake_curl,
        format!(
            r#"
param([Parameter(ValueFromRemainingArguments=$true)][object[]]$Remaining)
$body = [Console]::In.ReadToEnd()
[IO.File]::WriteAllText("{}", $body)
$argsText = $Remaining -join " "
if (-not $argsText.Contains("https://127.0.0.1/webhook")) {{ exit 9 }}
$bytes = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Type: text/plain`r`n`r`nthread.name")
[Console]::OpenStandardOutput().Write($bytes, 0, $bytes.Length)
"#,
            capture_path.display()
        ),
    )
    .expect("write fake curl");
    std::env::set_var("WEBHOOK_HTTP_DELIVERY_ENABLED", "true");
    std::env::set_var("YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS", "true");
    std::env::set_var(
        "YONA_WEBHOOK_HTTPS_DELIVERY_COMMAND",
        format!(
            "powershell -NoProfile -ExecutionPolicy Bypass -File {}",
            fake_curl.display()
        ),
    );

    let outcome = deliver_webhook(OutboundWebhook {
        body: "{\"text\":\"hello\"}".to_string(),
        event_type: "NEW_ISSUE".to_string(),
        payload_url: "https://127.0.0.1/webhook".to_string(),
        secret: "s3".to_string(),
        webhook_type: "DETAIL_HANGOUT_CHAT".to_string(),
    })
    .expect("https webhook succeeds through executable fetcher");

    assert_eq!(outcome.response_body.as_deref(), Some("thread.name"));
    assert_eq!(
        std::fs::read_to_string(capture_path).expect("captured body"),
        "{\"text\":\"hello\"}"
    );
    assert!(snapshot_test_webhook_outbox().is_empty());

    clear_webhook_retry_env();
    clear_test_webhook_outbox();
    let _ = std::fs::remove_dir_all(fake_curl_dir);
}
