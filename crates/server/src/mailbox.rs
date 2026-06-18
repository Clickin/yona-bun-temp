use std::{process::Command, time::Duration};

use crate::runtime_config;
use crate::server_config::{configured_command_parts, parse_legacy_bool, parse_legacy_duration_ms};

pub async fn process_mailbox_parsed_message(
    repository: &yona_rust_persistence::AppRepository,
    input: yona_rust_integrations::MailboxParsedMessageInput,
) -> Result<yona_rust_persistence::MailboxNormalizedMessageResult, sea_orm::DbErr> {
    let normalized = yona_rust_integrations::mailbox_normalize_parsed_message(input);
    repository
        .process_mailbox_normalized_message(yona_rust_persistence::MailboxNormalizedMessageInput {
            body_markdown: normalized.body_markdown,
            from_addresses: normalized.from_addresses,
            message_id: normalized.message_id,
            recipient_details: normalized.recipient_details,
            reply_message_ids: normalized.reply_message_ids,
            title: normalized.title,
        })
        .await
}

pub async fn process_mailbox_raw_message(
    repository: &yona_rust_persistence::AppRepository,
    raw_message: &str,
    imap_address: &str,
) -> Result<yona_rust_persistence::MailboxNormalizedMessageResult, String> {
    let parsed = yona_rust_integrations::mailbox_parse_raw_message(raw_message, imap_address)
        .ok_or_else(|| "raw mailbox message is missing a Message-ID header".to_string())?;
    process_mailbox_parsed_message(repository, parsed)
        .await
        .map_err(|error| error.to_string())
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxPollingConfig {
    pub enabled: bool,
    pub fetch_command: String,
    pub imap_address: String,
    pub initial_delay_ms: u64,
    pub interval_ms: u64,
}

impl Default for MailboxPollingConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            fetch_command: String::new(),
            imap_address: "noreply@yona.local".to_string(),
            initial_delay_ms: 5_000,
            interval_ms: 60_000,
        }
    }
}

pub fn mailbox_polling_config_from_env() -> MailboxPollingConfig {
    let fetch_command = std::env::var("YONA_MAILBOX_FETCH_COMMAND")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let enabled = std::env::var("YONA_MAILBOX_POLLING_ENABLED")
        .ok()
        .and_then(|value| parse_legacy_bool(&value));
    let imap_address = std::env::var("YONA_MAILBOX_IMAP_ADDRESS").ok();
    let initial_delay = std::env::var("YONA_MAILBOX_POLLING_INITIAL_DELAY").ok();
    let interval = std::env::var("YONA_MAILBOX_POLLING_INTERVAL").ok();
    mailbox_polling_config_from_options(
        fetch_command.as_deref(),
        enabled,
        imap_address.as_deref(),
        initial_delay.as_deref(),
        interval.as_deref(),
    )
}

pub fn mailbox_polling_config_from_startup(
    config: &runtime_config::StartupConfig,
) -> MailboxPollingConfig {
    mailbox_polling_config_from_options(
        config.mailbox_fetch_command.as_deref(),
        config.mailbox_polling_enabled,
        config.mailbox_imap_address.as_deref(),
        config.mailbox_polling_initial_delay.as_deref(),
        config.mailbox_polling_interval.as_deref(),
    )
}

fn mailbox_polling_config_from_options(
    fetch_command: Option<&str>,
    enabled: Option<bool>,
    imap_address: Option<&str>,
    initial_delay: Option<&str>,
    interval: Option<&str>,
) -> MailboxPollingConfig {
    let defaults = MailboxPollingConfig::default();
    let fetch_command = fetch_command
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_default();
    MailboxPollingConfig {
        enabled: enabled.unwrap_or(!fetch_command.is_empty()),
        fetch_command,
        imap_address: imap_address
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or(defaults.imap_address),
        initial_delay_ms: initial_delay
            .and_then(parse_legacy_duration_ms)
            .unwrap_or(defaults.initial_delay_ms),
        interval_ms: interval
            .and_then(parse_legacy_duration_ms)
            .unwrap_or(defaults.interval_ms)
            .max(1),
    }
}

pub async fn poll_mailbox_scheduler_tick(
    repository: &yona_rust_persistence::AppRepository,
    config: &MailboxPollingConfig,
) -> Result<Vec<yona_rust_persistence::MailboxNormalizedMessageResult>, String> {
    if !config.enabled {
        return Ok(Vec::new());
    }
    let raw_messages = fetch_mailbox_raw_messages(config)?;
    let mut results = Vec::new();
    for raw_message in raw_messages {
        results.push(
            process_mailbox_raw_message(repository, &raw_message, &config.imap_address).await?,
        );
    }
    Ok(results)
}

pub fn spawn_mailbox_polling_scheduler(
    repository: yona_rust_persistence::AppRepository,
    config: MailboxPollingConfig,
) -> Option<tokio::task::JoinHandle<()>> {
    if !config.enabled {
        return None;
    }
    Some(tokio::spawn(async move {
        if config.initial_delay_ms > 0 {
            tokio::time::sleep(Duration::from_millis(config.initial_delay_ms)).await;
        }
        loop {
            match poll_mailbox_scheduler_tick(&repository, &config).await {
                Ok(results) if !results.is_empty() => {
                    tracing::info!(
                        count = results.len(),
                        "mailbox polling scheduler processed messages"
                    );
                }
                Ok(_) => {}
                Err(error) => tracing::warn!(%error, "mailbox polling scheduler tick failed"),
            }
            tokio::time::sleep(Duration::from_millis(config.interval_ms)).await;
        }
    }))
}

fn fetch_mailbox_raw_messages(config: &MailboxPollingConfig) -> Result<Vec<String>, String> {
    let (program, mut args) =
        configured_command_parts(&config.fetch_command, "mailbox fetch command is empty")?;
    args.push(config.imap_address.clone());
    let output = Command::new(&program)
        .args(args)
        .output()
        .map_err(|error| format!("mailbox fetch command failed: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let reason = stderr.trim();
        return Err(if reason.is_empty() {
            format!(
                "mailbox fetch command failed: exit status {}",
                output.status
            )
        } else {
            format!("mailbox fetch command failed: {reason}")
        });
    }
    Ok(output
        .stdout
        .split(|byte| *byte == 0)
        .filter_map(|message| {
            let text = String::from_utf8_lossy(message).trim().to_string();
            (!text.is_empty()).then_some(text)
        })
        .collect())
}
