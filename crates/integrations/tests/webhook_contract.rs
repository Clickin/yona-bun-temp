use yoram_integrations::{
    clear_test_webhook_outbox, deliver_webhook_with_config, queue_test_webhook_failure,
    queue_test_webhook_response, snapshot_test_webhook_outbox, IntegrationConfig, OutboundWebhook,
};

#[test]
fn webhook_delivery_retry_count_accepts_legacy_yona_alias() {
    assert_eq!(
        IntegrationConfig::default().webhook_delivery_retry_count(),
        0
    );

    assert_eq!(
        IntegrationConfig::from_pairs([("YONA_WEBHOOK_DELIVERY_RETRIES", "2")])
            .webhook_delivery_retry_count(),
        2
    );

    assert_eq!(
        IntegrationConfig::from_pairs([("YONA_WEBHOOK_DELIVERY_RETRIES", "99")])
            .webhook_delivery_retry_count(),
        5
    );

    assert_eq!(
        IntegrationConfig::from_pairs([("WEBHOOK_DELIVERY_RETRIES", "1")])
            .webhook_delivery_retry_count(),
        1
    );
}

#[test]
fn webhook_delivery_retries_transient_failures_before_returning_success() {
    clear_test_webhook_outbox();
    let config = IntegrationConfig::from_pairs([("YONA_WEBHOOK_DELIVERY_RETRIES", "1")]);
    queue_test_webhook_failure("temporary webhook failure");
    queue_test_webhook_response("ok");

    let outcome = deliver_webhook_with_config(
        OutboundWebhook {
            body: "{\"text\":\"hello\"}".to_string(),
            event_type: "NEW_ISSUE".to_string(),
            payload_url: "https://hooks.example/retry".to_string(),
            secret: "s3".to_string(),
            webhook_type: "SIMPLE".to_string(),
        },
        &config,
    )
    .expect("retried webhook succeeds");

    assert_eq!(outcome.response_body.as_deref(), Some("ok"));
    let attempts = snapshot_test_webhook_outbox();
    assert_eq!(attempts.len(), 2);
    assert!(attempts.iter().all(|attempt| {
        attempt.payload_url == "https://hooks.example/retry"
            && attempt.event_type == "NEW_ISSUE"
            && attempt.webhook_type == "SIMPLE"
    }));

    clear_test_webhook_outbox();
}

#[test]
fn webhook_https_delivery_uses_executable_fetcher_and_preserves_legacy_headers() {
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
    let fake_curl = fake_curl_dir.join("fake-curl.sh");
    let capture_path = fake_curl_dir.join("body.txt");
    std::fs::write(
        &fake_curl,
        format!(
            r#"#!/bin/sh
body="$(cat)"
printf "%s" "$body" > "{}"
case "$*" in
  *https://127.0.0.1/webhook*) ;;
  *) exit 9 ;;
esac
printf "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nthread.name"
"#,
            capture_path.display()
        ),
    )
    .expect("write fake curl");
    let fetch_command = format!("sh {}", fake_curl.display());
    let config = IntegrationConfig::from_pairs([
        ("WEBHOOK_HTTP_DELIVERY_ENABLED", "true"),
        ("YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS", "true"),
        (
            "YONA_WEBHOOK_HTTPS_DELIVERY_COMMAND",
            fetch_command.as_str(),
        ),
    ]);

    let outcome = deliver_webhook_with_config(
        OutboundWebhook {
            body: "{\"text\":\"hello\"}".to_string(),
            event_type: "NEW_ISSUE".to_string(),
            payload_url: "https://127.0.0.1/webhook".to_string(),
            secret: "s3".to_string(),
            webhook_type: "DETAIL_HANGOUT_CHAT".to_string(),
        },
        &config,
    )
    .expect("https webhook succeeds through executable fetcher");

    assert_eq!(outcome.response_body.as_deref(), Some("thread.name"));
    assert_eq!(
        std::fs::read_to_string(capture_path).expect("captured body"),
        "{\"text\":\"hello\"}"
    );
    assert!(snapshot_test_webhook_outbox().is_empty());

    clear_test_webhook_outbox();
    let _ = std::fs::remove_dir_all(fake_curl_dir);
}
