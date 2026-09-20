use base64::{engine::general_purpose, Engine as _};
use sha2::{Digest, Sha256};
use std::{
    io::Write,
    path::{Path, PathBuf},
    process::Command,
    time::Duration,
};

use crate::runtime_config;
use crate::server_config::{configured_command_parts, parse_legacy_duration_ms};

pub async fn process_mailbox_parsed_message(
    repository: &yoram_persistence::AppRepository,
    data_root: &Path,
    base_path: &str,
    input: yoram_integrations::MailboxParsedMessageInput,
) -> Result<yoram_persistence::MailboxNormalizedMessageResult, sea_orm::DbErr> {
    let normalized = yoram_integrations::mailbox_normalize_parsed_message(input);
    let (attachments, uploads): (Vec<_>, Vec<_>) = normalized
        .attachments
        .into_iter()
        .map(|part| {
            let filename = part.filename.unwrap_or_else(|| "attachment".to_string());
            let hash = format!("{:x}", Sha256::digest(&part.body));
            let path = crate::routes::uploaded_file_path_with_root(data_root, &hash);
            let attachment = yoram_persistence::MailboxAttachmentInput {
                content_id: part.content_id,
                mime_type: crate::routes::detect_upload_mime_type(
                    &filename,
                    Some(&part.content_type),
                    &part.body,
                ),
                filename,
                hash,
                size: part.body.len() as i64,
            };
            (attachment, (path, part.body))
        })
        .unzip();
    let (guard, transaction, started_at) = repository.begin_serialized_write().await?;
    let result = repository
        .with_transaction(&transaction)
        .process_mailbox_normalized_message(yoram_persistence::MailboxNormalizedMessageInput {
            attachments,
            base_path: base_path.to_string(),
            body_markdown: normalized.body_markdown,
            content_type: normalized.content_type,
            from_addresses: normalized.from_addresses,
            message_id: normalized.message_id,
            recipient_details: normalized.recipient_details,
            reply_message_ids: normalized.reply_message_ids,
            title: normalized.title,
        })
        .await?;
    let mut created_uploads = Vec::new();
    let stored = async {
        if result
            .actions
            .iter()
            .any(|action| action.status == "created")
        {
            for (path, bytes) in uploads {
                if path.is_file() {
                    continue;
                }
                let parent = path.parent().expect("attachment upload parent");
                std::fs::create_dir_all(parent).map_err(mailbox_storage_error)?;
                let staging = parent.join(format!(
                    ".mailbox-{}",
                    crate::routes::random_storage_token()
                ));
                let mut file =
                    std::fs::File::create_new(&staging).map_err(mailbox_storage_error)?;
                let written = file.write_all(&bytes).and_then(|()| {
                    // Publishing must not overwrite a blob another upload already installed.
                    match std::fs::hard_link(&staging, &path) {
                        Ok(()) => {
                            created_uploads.push(path);
                            Ok(())
                        }
                        Err(error)
                            if error.kind() == std::io::ErrorKind::AlreadyExists
                                && path.is_file() =>
                        {
                            Ok(())
                        }
                        Err(error) => Err(error),
                    }
                });
                let _ = std::fs::remove_file(&staging);
                written.map_err(mailbox_storage_error)?;
            }
        }
        repository
            .commit_serialized_write(transaction, guard, started_at)
            .await
    }
    .await;
    if let Err(error) = stored {
        for path in created_uploads {
            let hash = path
                .file_name()
                .and_then(|name| name.to_str())
                .expect("attachment hash");
            // A pre-existing DB attachment can share a restored blob. Never remove it.
            if matches!(
                repository.attachment_hash_is_referenced(hash).await,
                Ok(false)
            ) {
                let _ = std::fs::remove_file(path);
            }
        }
        return Err(error);
    }
    Ok(result)
}

fn mailbox_storage_error(error: std::io::Error) -> sea_orm::DbErr {
    sea_orm::DbErr::Custom(format!("mailbox attachment storage failed: {error}"))
}

pub async fn process_mailbox_raw_message(
    repository: &yoram_persistence::AppRepository,
    data_root: &Path,
    base_path: &str,
    raw_message: impl AsRef<[u8]>,
    imap_address: &str,
) -> Result<yoram_persistence::MailboxNormalizedMessageResult, String> {
    let parsed = yoram_integrations::mailbox_parse_raw_message(raw_message, imap_address)
        .ok_or_else(|| {
            "raw mailbox message has invalid MIME or is missing a Message-ID header".to_string()
        })?;
    process_mailbox_parsed_message(repository, data_root, base_path, parsed)
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
            imap_address: "noreply@yoram.local".to_string(),
            initial_delay_ms: 5_000,
            interval_ms: 60_000,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn polling_defaults_use_yoram_identity() {
        assert_eq!(
            MailboxPollingConfig::default().imap_address,
            "noreply@yoram.local"
        );
    }
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
    repository: &yoram_persistence::AppRepository,
    data_root: &Path,
    base_path: &str,
    config: &MailboxPollingConfig,
) -> Result<Vec<yoram_persistence::MailboxNormalizedMessageResult>, String> {
    if !config.enabled {
        return Ok(Vec::new());
    }
    let raw_messages = fetch_mailbox_raw_messages(config)?;
    let mut results = Vec::new();
    for raw_message in raw_messages {
        results.push(
            process_mailbox_raw_message(
                repository,
                data_root,
                base_path,
                &raw_message,
                &config.imap_address,
            )
            .await?,
        );
    }
    Ok(results)
}

pub fn spawn_mailbox_polling_scheduler(
    repository: yoram_persistence::AppRepository,
    data_root: PathBuf,
    base_path: String,
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
            match poll_mailbox_scheduler_tick(&repository, &data_root, &base_path, &config).await {
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

fn fetch_mailbox_raw_messages(config: &MailboxPollingConfig) -> Result<Vec<Vec<u8>>, String> {
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
    let messages: Vec<String> = serde_json::from_slice(&output.stdout).map_err(|error| {
        format!("mailbox fetch output must be a JSON array of base64 messages: {error}")
    })?;
    messages
        .into_iter()
        .map(|message| {
            general_purpose::STANDARD
                .decode(message)
                .map_err(|error| format!("mailbox fetch message is not valid base64: {error}"))
        })
        .collect()
}
