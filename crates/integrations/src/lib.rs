//! Canonical integrations ownership for outbound provider slices.

use std::collections::VecDeque;
use std::io::{Read, Write};
use std::net::{IpAddr, TcpStream, ToSocketAddrs};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use base64::{engine::general_purpose, Engine as _};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};

/// Returns the crate ownership label used by foundation tests and future packet wiring.
pub const CRATE_OWNER: &str = "integrations";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailDeliveryRecord {
    pub bcc: Vec<String>,
    pub body: String,
    pub from: String,
    pub subject: String,
    pub to: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OutboundMail {
    pub bcc: Vec<String>,
    pub body: String,
    pub from: String,
    pub subject: String,
    pub to: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EmailAddressWithDetail {
    detail: String,
    domain: String,
    user: String,
}

impl EmailAddressWithDetail {
    pub fn new(value: &str) -> Self {
        let (local_part, domain) = value.trim().split_once('@').unwrap_or((value.trim(), ""));
        let (user, detail) = local_part.split_once('+').unwrap_or((local_part, ""));
        Self {
            detail: detail.to_string(),
            domain: domain.to_string(),
            user: user.to_string(),
        }
    }

    pub fn user(&self) -> &str {
        &self.user
    }

    pub fn domain(&self) -> &str {
        &self.domain
    }

    pub fn detail(&self) -> &str {
        &self.detail
    }

    pub fn equals_except_details(&self, other: &Self) -> bool {
        self.user == other.user && self.domain == other.domain
    }
}

pub fn mailbox_message_id_left(message_id: &str) -> Option<String> {
    let left_angle = message_id.find('<')?;
    let at_sign = message_id[left_angle + 1..]
        .find('@')
        .map(|offset| left_angle + 1 + offset)?;
    let left = message_id[left_angle + 1..at_sign]
        .trim()
        .strip_prefix('/')
        .unwrap_or_else(|| message_id[left_angle + 1..at_sign].trim())
        .to_string();
    (!left.is_empty()).then_some(left)
}

pub fn mailbox_parse_message_ids(header_value: &str) -> Vec<String> {
    let mut ids = Vec::new();
    let mut rest = header_value;
    while let Some(start) = rest.find('<') {
        let after_start = &rest[start..];
        let Some(end) = after_start.find('>') else {
            break;
        };
        ids.push(after_start[..=end].to_string());
        rest = &after_start[end + 1..];
    }
    ids
}

pub fn mailbox_collect_thread_message_ids(
    in_reply_to: Option<&str>,
    references: &[String],
) -> Vec<String> {
    let mut ids = Vec::new();
    if let Some(in_reply_to) = in_reply_to {
        for id in mailbox_parse_message_ids(in_reply_to) {
            if !ids.contains(&id) {
                ids.push(id);
            }
        }
    }
    for reference in references {
        for id in mailbox_parse_message_ids(reference) {
            if !ids.contains(&id) {
                ids.push(id);
            }
        }
    }
    ids
}

pub fn mailbox_recipients_to_yona(
    recipients: &[String],
    imap_address: &str,
) -> Vec<EmailAddressWithDetail> {
    let imap = EmailAddressWithDetail::new(imap_address);
    let mut matched = Vec::new();
    for recipient in recipients {
        let address = EmailAddressWithDetail::new(recipient);
        if address.equals_except_details(&imap) {
            matched.push(address);
        }
    }
    matched
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxProjectDetail {
    pub owner_name: String,
    pub project_name: String,
}

pub fn mailbox_project_detail(detail: &str) -> Option<MailboxProjectDetail> {
    let mut parts = detail.split('/');
    let owner_name = parts.next()?;
    let project_name = parts.next()?;
    if owner_name.is_empty() || project_name.is_empty() {
        return None;
    }
    Some(MailboxProjectDetail {
        owner_name: owner_name.to_string(),
        project_name: project_name.to_string(),
    })
}

pub fn mailbox_resource_path_from_detail(detail: &str) -> Option<String> {
    let mut parts = detail.splitn(3, '/');
    parts.next()?;
    parts.next()?;
    let resource_path = parts.next()?;
    (!resource_path.is_empty()).then_some(resource_path.to_string())
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxMimePart {
    pub body: String,
    pub content_id: Option<String>,
    pub content_type: String,
    pub parts: Vec<MailboxMimePart>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxExtractedContent {
    pub attachments: Vec<MailboxMimePart>,
    pub body: String,
    pub content_type: String,
}

impl MailboxExtractedContent {
    fn empty() -> Self {
        Self {
            attachments: Vec::new(),
            body: String::new(),
            content_type: String::new(),
        }
    }

    fn merge(&mut self, other: MailboxExtractedContent) {
        self.body.push_str(&other.body);
        if self.content_type.is_empty() {
            self.content_type = other.content_type;
        }
        self.attachments.extend(other.attachments);
    }
}

pub fn mailbox_extract_content(part: &MailboxMimePart) -> MailboxExtractedContent {
    mailbox_process_part(part, None)
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxParsedMessageInput {
    pub from_addresses: Vec<String>,
    pub imap_address: String,
    pub in_reply_to: Option<String>,
    pub message_id: String,
    pub recipients: Vec<String>,
    pub references: Vec<String>,
    pub root_part: MailboxMimePart,
    pub subject: String,
}

pub fn mailbox_parse_raw_message(
    raw: &str,
    imap_address: &str,
) -> Option<MailboxParsedMessageInput> {
    let (headers, body) = mailbox_split_message(raw);
    let message_id = mailbox_header_first(&headers, "Message-ID")?;
    let content_type =
        mailbox_header_first(&headers, "Content-Type").unwrap_or_else(|| "text/plain".to_string());
    let transfer_encoding = mailbox_header_first(&headers, "Content-Transfer-Encoding");
    Some(MailboxParsedMessageInput {
        from_addresses: mailbox_header_addresses(&headers, &["From"]),
        imap_address: imap_address.to_string(),
        in_reply_to: mailbox_header_first(&headers, "In-Reply-To"),
        message_id,
        recipients: mailbox_header_addresses(
            &headers,
            &["To", "Cc", "Bcc", "Delivered-To", "X-Original-To"],
        ),
        references: mailbox_header_values(&headers, "References"),
        root_part: mailbox_parse_mime_part(
            &content_type,
            None,
            transfer_encoding.as_deref(),
            &body,
        ),
        subject: mailbox_header_first(&headers, "Subject").unwrap_or_default(),
    })
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailboxNormalizedMessage {
    pub body_markdown: String,
    pub content_type: String,
    pub from_addresses: Vec<String>,
    pub message_id: String,
    pub recipient_details: Vec<String>,
    pub reply_message_ids: Vec<String>,
    pub title: String,
}

fn mailbox_split_message(raw: &str) -> (Vec<(String, String)>, String) {
    let normalized = raw.replace("\r\n", "\n").replace('\r', "\n");
    let (header_text, body) = normalized
        .split_once("\n\n")
        .map_or((normalized.as_str(), ""), |(headers, body)| (headers, body));
    (mailbox_parse_headers(header_text), body.to_string())
}

fn mailbox_parse_headers(header_text: &str) -> Vec<(String, String)> {
    let mut headers: Vec<(String, String)> = Vec::new();
    for line in header_text.lines() {
        if line.starts_with(' ') || line.starts_with('\t') {
            if let Some((_, value)) = headers.last_mut() {
                value.push(' ');
                value.push_str(line.trim());
            }
            continue;
        }
        let Some((name, value)) = line.split_once(':') else {
            continue;
        };
        headers.push((name.trim().to_string(), value.trim().to_string()));
    }
    headers
}

fn mailbox_header_values(headers: &[(String, String)], name: &str) -> Vec<String> {
    headers
        .iter()
        .filter(|(candidate, _)| candidate.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.clone())
        .collect()
}

fn mailbox_header_first(headers: &[(String, String)], name: &str) -> Option<String> {
    mailbox_header_values(headers, name).into_iter().next()
}

fn mailbox_header_addresses(headers: &[(String, String)], names: &[&str]) -> Vec<String> {
    let mut addresses = Vec::new();
    for name in names {
        for value in mailbox_header_values(headers, name) {
            for address in mailbox_extract_addresses(&value) {
                if !addresses.contains(&address) {
                    addresses.push(address);
                }
            }
        }
    }
    addresses
}

fn mailbox_extract_addresses(value: &str) -> Vec<String> {
    value
        .split(',')
        .filter_map(|part| {
            let trimmed = part.trim();
            let address = if let Some(start) = trimmed.find('<') {
                let after_start = &trimmed[start + 1..];
                after_start.find('>').map(|end| &after_start[..end])
            } else {
                Some(trimmed.trim_matches('"'))
            }?;
            let address = address.trim();
            (address.contains('@') && !address.is_empty()).then_some(address.to_string())
        })
        .collect()
}

fn mailbox_parse_mime_part(
    content_type: &str,
    content_id: Option<String>,
    transfer_encoding: Option<&str>,
    body: &str,
) -> MailboxMimePart {
    if mailbox_mime_type_matches(content_type, "multipart/*") {
        let boundary = mailbox_content_type_parameter(content_type, "boundary");
        let parts = boundary
            .as_deref()
            .map(|boundary| mailbox_parse_multipart_body(boundary, body))
            .unwrap_or_default();
        return MailboxMimePart {
            body: String::new(),
            content_id,
            content_type: content_type.to_string(),
            parts,
        };
    }

    MailboxMimePart {
        body: mailbox_decode_transfer_body(body, transfer_encoding),
        content_id,
        content_type: content_type.to_string(),
        parts: Vec::new(),
    }
}

fn mailbox_parse_multipart_body(boundary: &str, body: &str) -> Vec<MailboxMimePart> {
    let delimiter = format!("--{boundary}");
    let closing_delimiter = format!("--{boundary}--");
    let mut parts = Vec::new();
    for segment in body.split(&delimiter).skip(1) {
        let segment = segment.trim_start_matches('\n');
        if segment.starts_with("--") || segment.starts_with(&closing_delimiter) {
            break;
        }
        let segment = segment.trim_end_matches('\n');
        let (headers, part_body) = mailbox_split_message(segment);
        let content_type = mailbox_header_first(&headers, "Content-Type")
            .unwrap_or_else(|| "text/plain".to_string());
        let content_id = mailbox_header_first(&headers, "Content-ID");
        let transfer_encoding = mailbox_header_first(&headers, "Content-Transfer-Encoding");
        parts.push(mailbox_parse_mime_part(
            &content_type,
            content_id,
            transfer_encoding.as_deref(),
            &part_body,
        ));
    }
    parts
}

fn mailbox_decode_transfer_body(body: &str, transfer_encoding: Option<&str>) -> String {
    match transfer_encoding
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "quoted-printable" => mailbox_decode_quoted_printable(body),
        "base64" => mailbox_decode_base64(body),
        _ => body.to_string(),
    }
}

fn mailbox_decode_base64(body: &str) -> String {
    let compact = body
        .chars()
        .filter(|character| !character.is_ascii_whitespace())
        .collect::<String>();
    general_purpose::STANDARD
        .decode(compact.as_bytes())
        .map(|bytes| String::from_utf8_lossy(&bytes).to_string())
        .unwrap_or_else(|_| body.to_string())
}

fn mailbox_decode_quoted_printable(body: &str) -> String {
    let bytes = body.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'=' && index + 1 < bytes.len() && bytes[index + 1] == b'\n' {
            index += 2;
            continue;
        }
        if bytes[index] == b'=' && index + 2 < bytes.len() {
            let pair = &body[index + 1..index + 3];
            if let Ok(value) = u8::from_str_radix(pair, 16) {
                decoded.push(value);
                index += 3;
                continue;
            }
        }
        decoded.push(bytes[index]);
        index += 1;
    }
    String::from_utf8_lossy(&decoded).to_string()
}

pub fn mailbox_normalize_parsed_message(
    input: MailboxParsedMessageInput,
) -> MailboxNormalizedMessage {
    let content = mailbox_extract_content(&input.root_part);
    let recipient_details = mailbox_recipients_to_yona(&input.recipients, &input.imap_address)
        .into_iter()
        .map(|address| address.detail().to_string())
        .collect();
    let reply_message_ids =
        mailbox_collect_thread_message_ids(input.in_reply_to.as_deref(), &input.references);

    MailboxNormalizedMessage {
        body_markdown: content.body,
        content_type: content.content_type,
        from_addresses: input.from_addresses,
        message_id: input.message_id,
        recipient_details,
        reply_message_ids,
        title: input.subject,
    }
}

fn mailbox_process_part(
    part: &MailboxMimePart,
    parent: Option<&MailboxMimePart>,
) -> MailboxExtractedContent {
    if mailbox_mime_type_matches(&part.content_type, "text/*") {
        return MailboxExtractedContent {
            attachments: Vec::new(),
            body: part.body.clone(),
            content_type: part.content_type.clone(),
        };
    }

    if mailbox_mime_type_matches(&part.content_type, "multipart/*") {
        if mailbox_mime_type_matches(&part.content_type, "multipart/related") {
            return mailbox_content_with_attachments(part);
        }
        if mailbox_mime_type_matches(&part.content_type, "multipart/alternative") {
            return mailbox_content_of_best_part(part, parent);
        }
        return mailbox_joined_content(part);
    }

    MailboxExtractedContent::empty()
}

fn mailbox_joined_content(part: &MailboxMimePart) -> MailboxExtractedContent {
    let mut content = MailboxExtractedContent::empty();
    for child in &part.parts {
        content.merge(mailbox_process_part(child, Some(part)));
    }
    content
}

fn mailbox_content_with_attachments(part: &MailboxMimePart) -> MailboxExtractedContent {
    let start = mailbox_content_type_parameter(&part.content_type, "start");
    let mut content = MailboxExtractedContent::empty();
    for (index, child) in part.parts.iter().enumerate() {
        if mailbox_is_root_part(child, index, start.as_deref()) {
            content.merge(mailbox_process_part(child, Some(part)));
        } else {
            content.attachments.push(child.clone());
        }
    }
    content
}

fn mailbox_content_of_best_part(
    part: &MailboxMimePart,
    parent: Option<&MailboxMimePart>,
) -> MailboxExtractedContent {
    let parent_is_related = parent
        .is_some_and(|parent| mailbox_mime_type_matches(&parent.content_type, "multipart/related"));
    let Some(best) = part.parts.iter().fold(None, |best, child| {
        Some(mailbox_better_part(best, child, parent_is_related))
    }) else {
        return MailboxExtractedContent::empty();
    };

    mailbox_process_part(best, Some(part))
}

fn mailbox_better_part<'a>(
    left: Option<&'a MailboxMimePart>,
    right: &'a MailboxMimePart,
    prefer_html_for_related: bool,
) -> &'a MailboxMimePart {
    let priority = if prefer_html_for_related {
        ["multipart/related", "text/html", "text/plain"]
    } else {
        ["multipart/related", "text/plain", "text/html"]
    };
    match left {
        Some(left)
            if mailbox_mime_point(left, &priority) > mailbox_mime_point(right, &priority) =>
        {
            left
        }
        _ => right,
    }
}

fn mailbox_mime_point(part: &MailboxMimePart, priority: &[&str]) -> usize {
    priority
        .iter()
        .position(|candidate| mailbox_mime_type_matches(&part.content_type, candidate))
        .map(|index| priority.len() + 1 - index)
        .unwrap_or(1)
}

fn mailbox_is_root_part(part: &MailboxMimePart, index: usize, start: Option<&str>) -> bool {
    start
        .map(|start| part.content_id.as_deref() == Some(start))
        .unwrap_or(index == 0)
}

fn mailbox_mime_type_matches(content_type: &str, pattern: &str) -> bool {
    let actual = content_type
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    if let Some(prefix) = pattern.strip_suffix("/*") {
        actual.starts_with(&format!("{prefix}/"))
    } else {
        actual == pattern
    }
}

fn mailbox_content_type_parameter(content_type: &str, name: &str) -> Option<String> {
    content_type.split(';').skip(1).find_map(|parameter| {
        let (key, value) = parameter.split_once('=')?;
        if key.trim().eq_ignore_ascii_case(name) {
            Some(
                value
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string(),
            )
        } else {
            None
        }
    })
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SmtpDeliveryConfig {
    pub default_port: u16,
    pub ssl_enabled: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WebhookHeaderRecord {
    pub name: String,
    pub value: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WebhookDeliveryRecord {
    pub body: String,
    pub event_type: String,
    pub headers: Vec<WebhookHeaderRecord>,
    pub payload_url: String,
    pub webhook_type: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WebhookDeliveryOutcome {
    pub response_body: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OutboundWebhook {
    pub body: String,
    pub event_type: String,
    pub payload_url: String,
    pub secret: String,
    pub webhook_type: String,
}

fn test_outbox() -> &'static Mutex<Vec<MailDeliveryRecord>> {
    static OUTBOX: OnceLock<Mutex<Vec<MailDeliveryRecord>>> = OnceLock::new();
    OUTBOX.get_or_init(|| Mutex::new(Vec::new()))
}

fn test_webhook_outbox() -> &'static Mutex<Vec<WebhookDeliveryRecord>> {
    static OUTBOX: OnceLock<Mutex<Vec<WebhookDeliveryRecord>>> = OnceLock::new();
    OUTBOX.get_or_init(|| Mutex::new(Vec::new()))
}

fn test_webhook_responses() -> &'static Mutex<VecDeque<Result<String, String>>> {
    static RESPONSES: OnceLock<Mutex<VecDeque<Result<String, String>>>> = OnceLock::new();
    RESPONSES.get_or_init(|| Mutex::new(VecDeque::new()))
}

pub fn clear_test_outbox() {
    test_outbox().lock().unwrap().clear();
}

pub fn snapshot_test_outbox() -> Vec<MailDeliveryRecord> {
    test_outbox().lock().unwrap().clone()
}

pub fn clear_test_webhook_outbox() {
    test_webhook_outbox().lock().unwrap().clear();
    test_webhook_responses().lock().unwrap().clear();
}

pub fn snapshot_test_webhook_outbox() -> Vec<WebhookDeliveryRecord> {
    test_webhook_outbox().lock().unwrap().clone()
}

pub fn queue_test_webhook_response(response: impl ToString) {
    test_webhook_responses()
        .lock()
        .unwrap()
        .push_back(Ok(response.to_string()));
}

pub fn queue_test_webhook_failure(error: impl ToString) {
    test_webhook_responses()
        .lock()
        .unwrap()
        .push_back(Err(error.to_string()));
}

pub fn smtp_enabled() -> bool {
    read_bool_env("SMTP_ENABLED")
}

fn configured_env_value(names: &[&str]) -> Option<String> {
    names.iter().find_map(|name| {
        std::env::var(name)
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
    })
}

pub fn webhook_http_delivery_enabled() -> bool {
    read_bool_env("WEBHOOK_HTTP_DELIVERY_ENABLED")
}

pub fn webhook_delivery_retry_count_from_env() -> usize {
    configured_env_value(&["WEBHOOK_DELIVERY_RETRIES", "YONA_WEBHOOK_DELIVERY_RETRIES"])
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(0)
        .min(5)
}

pub fn webhook_private_network_delivery_allowed() -> bool {
    configured_env_value(&[
        "YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS",
        "WEBHOOK_ALLOW_PRIVATE_NETWORKS",
    ])
    .map(|value| parse_bool_env_value(&value))
    .unwrap_or(false)
}

pub fn smtp_delivery_config_from_env() -> SmtpDeliveryConfig {
    let ssl_enabled = smtp_ssl_enabled_from_env();
    SmtpDeliveryConfig {
        default_port: smtp_default_port(ssl_enabled),
        ssl_enabled,
    }
}

pub fn deliver(mail: OutboundMail) -> Result<(), String> {
    if !smtp_enabled() {
        test_outbox().lock().unwrap().push(MailDeliveryRecord {
            bcc: mail.bcc,
            body: mail.body,
            from: mail.from,
            subject: mail.subject,
            to: mail.to,
        });
        return Ok(());
    }

    let mut builder = Message::builder()
        .from(
            mail.from
                .parse()
                .map_err(|error| format!("invalid from address: {error}"))?,
        )
        .to(mail
            .to
            .parse()
            .map_err(|error| format!("invalid to address: {error}"))?);
    for bcc in mail.bcc {
        builder = builder.bcc(
            bcc.parse()
                .map_err(|error| format!("invalid bcc address: {error}"))?,
        );
    }
    let email = builder
        .subject(mail.subject)
        .body(mail.body)
        .map_err(|error| format!("invalid mail message: {error}"))?;

    let host = configured_env_value(&["SMTP_HOST", "YONA_SMTP_HOST"])
        .ok_or_else(|| "SMTP_HOST is required.".to_string())?;
    let smtp_config = smtp_delivery_config_from_env();
    let port = configured_env_value(&["SMTP_PORT", "YONA_SMTP_PORT"])
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(smtp_config.default_port);
    let mut builder = match smtp_config.ssl_enabled {
        Some(false) => SmtpTransport::builder_dangerous(&host),
        Some(true) | None => SmtpTransport::relay(&host)
            .map_err(|error| format!("smtp relay configuration failed: {error}"))?,
    }
    .port(port);
    let user = configured_env_value(&["SMTP_USER", "YONA_SMTP_USER"]);
    let pass = configured_env_value(&["SMTP_PASS", "YONA_SMTP_PASSWORD"]);
    if let (Some(user), Some(pass)) = (user, pass) {
        builder = builder.credentials(Credentials::new(user, pass));
    }
    builder
        .build()
        .send(&email)
        .map_err(|error| format!("smtp delivery failed: {error}"))?;
    Ok(())
}

pub fn deliver_webhook(webhook: OutboundWebhook) -> Result<WebhookDeliveryOutcome, String> {
    let record = WebhookDeliveryRecord {
        body: webhook.body,
        event_type: webhook.event_type,
        headers: webhook_headers(&webhook.secret),
        payload_url: webhook.payload_url,
        webhook_type: webhook.webhook_type,
    };
    let attempts = webhook_delivery_retry_count_from_env() + 1;
    let mut last_error = None;
    for _attempt in 0..attempts {
        match deliver_webhook_once(&record) {
            Ok(outcome) => return Ok(outcome),
            Err(error) => last_error = Some(error),
        }
    }
    Err(last_error.unwrap_or_else(|| "webhook delivery failed".to_string()))
}

fn deliver_webhook_once(record: &WebhookDeliveryRecord) -> Result<WebhookDeliveryOutcome, String> {
    if !webhook_http_delivery_enabled() {
        test_webhook_outbox().lock().unwrap().push(record.clone());
        return match test_webhook_responses().lock().unwrap().pop_front() {
            Some(Ok(response_body)) => Ok(WebhookDeliveryOutcome {
                response_body: Some(response_body),
            }),
            Some(Err(error)) => Err(error),
            None => Ok(WebhookDeliveryOutcome {
                response_body: None,
            }),
        };
    }

    post_webhook_over_plain_http(record)
}

fn webhook_headers(secret: &str) -> Vec<WebhookHeaderRecord> {
    let mut headers = vec![
        WebhookHeaderRecord {
            name: "Content-Type".to_string(),
            value: "application/json".to_string(),
        },
        WebhookHeaderRecord {
            name: "User-Agent".to_string(),
            value: "Yobi-Hookshot".to_string(),
        },
    ];
    if !secret.trim().is_empty() {
        headers.push(WebhookHeaderRecord {
            name: "Authorization".to_string(),
            value: format!("token {} ", secret.trim()),
        });
    }
    headers
}

fn post_webhook_over_plain_http(
    record: &WebhookDeliveryRecord,
) -> Result<WebhookDeliveryOutcome, String> {
    let parsed = parse_plain_http_url(&record.payload_url)?;
    let addresses = (parsed.host.as_str(), parsed.port)
        .to_socket_addrs()
        .map_err(|error| format!("webhook address resolution failed: {error}"))?
        .collect::<Vec<_>>();
    if addresses.is_empty() {
        return Err("webhook address resolution returned no endpoints".to_string());
    }
    let allow_private_networks = webhook_private_network_delivery_allowed();
    let address = addresses
        .into_iter()
        .find(|address| webhook_endpoint_allowed(address.ip(), allow_private_networks))
        .ok_or_else(|| "webhook delivery refused private or unsafe endpoints".to_string())?;
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_secs(5))
        .map_err(|error| format!("webhook connection failed: {error}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| format!("webhook read timeout configuration failed: {error}"))?;
    stream
        .set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| format!("webhook write timeout configuration failed: {error}"))?;

    let mut request = format!(
        "POST {} HTTP/1.1\r\nHost: {}\r\nContent-Length: {}\r\nConnection: close\r\n",
        parsed.path,
        parsed.host_header,
        record.body.as_bytes().len()
    );
    for header in &record.headers {
        request.push_str(&format!("{}: {}\r\n", header.name, header.value));
    }
    request.push_str("\r\n");
    request.push_str(&record.body);

    stream
        .write_all(request.as_bytes())
        .map_err(|error| format!("webhook request write failed: {error}"))?;
    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| format!("webhook response read failed: {error}"))?;
    let status = response.lines().next().unwrap_or_default();
    if status.contains(" 2") {
        Ok(WebhookDeliveryOutcome {
            response_body: response_body_from_plain_http_response(&response),
        })
    } else {
        Err(format!("webhook request failed: {status}"))
    }
}

fn webhook_endpoint_allowed(address: IpAddr, allow_private_networks: bool) -> bool {
    if allow_private_networks {
        return true;
    }
    match address {
        IpAddr::V4(address) => {
            !(address.is_loopback()
                || address.is_private()
                || address.is_link_local()
                || address.is_unspecified()
                || address.is_multicast())
        }
        IpAddr::V6(address) => {
            !(address.is_loopback()
                || address.is_unique_local()
                || address.is_unicast_link_local()
                || address.is_unspecified()
                || address.is_multicast())
        }
    }
}

fn response_body_from_plain_http_response(response: &str) -> Option<String> {
    response
        .split_once("\r\n\r\n")
        .or_else(|| response.split_once("\n\n"))
        .map(|(_, body)| body.to_string())
}

struct PlainHttpUrl {
    host: String,
    host_header: String,
    path: String,
    port: u16,
}

fn parse_plain_http_url(value: &str) -> Result<PlainHttpUrl, String> {
    let Some(rest) = value.strip_prefix("http://") else {
        return Err("webhook HTTP delivery currently supports plain http:// URLs".to_string());
    };
    let (authority, raw_path) = rest
        .split_once('/')
        .map(|(authority, path)| (authority, format!("/{path}")))
        .unwrap_or((rest, "/".to_string()));
    if authority.is_empty() || authority.contains('@') {
        return Err("webhook payload URL host is invalid".to_string());
    }
    let (host, port) = authority
        .rsplit_once(':')
        .and_then(|(host, port)| port.parse::<u16>().ok().map(|port| (host, port)))
        .unwrap_or((authority, 80));
    if host.is_empty() {
        return Err("webhook payload URL host is invalid".to_string());
    }
    Ok(PlainHttpUrl {
        host: host.to_string(),
        host_header: authority.to_string(),
        path: raw_path,
        port,
    })
}

fn read_bool_env(name: &str) -> bool {
    std::env::var(name)
        .map(|value| parse_bool_env_value(&value))
        .unwrap_or(false)
}

fn smtp_ssl_enabled_from_env() -> Option<bool> {
    configured_env_value(&["SMTP_SSL", "YONA_SMTP_SSL"]).map(|value| parse_bool_env_value(&value))
}

fn smtp_default_port(ssl_enabled: Option<bool>) -> u16 {
    match ssl_enabled {
        Some(true) => 465,
        Some(false) => 25,
        None => 587,
    }
}

fn parse_bool_env_value(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "1" | "true" | "yes" | "on"
    )
}

#[cfg(test)]
mod tests {
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
    use std::sync::{Mutex, OnceLock};

    use super::{webhook_endpoint_allowed, webhook_private_network_delivery_allowed};

    fn webhook_env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    fn clear_webhook_private_network_env() {
        std::env::remove_var("YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS");
        std::env::remove_var("WEBHOOK_ALLOW_PRIVATE_NETWORKS");
    }

    #[test]
    fn webhook_endpoint_blocks_private_networks_by_default() {
        assert!(!webhook_endpoint_allowed(
            IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
            false
        ));
        assert!(!webhook_endpoint_allowed(
            IpAddr::V4(Ipv4Addr::new(10, 0, 0, 1)),
            false
        ));
        assert!(!webhook_endpoint_allowed(
            IpAddr::V6(Ipv6Addr::LOCALHOST),
            false
        ));
        assert!(webhook_endpoint_allowed(
            IpAddr::V4(Ipv4Addr::new(93, 184, 216, 34)),
            false
        ));
    }

    #[test]
    fn webhook_private_network_delivery_env_uses_yona_alias() {
        let _guard = webhook_env_lock().lock().unwrap();
        clear_webhook_private_network_env();
        assert!(!webhook_private_network_delivery_allowed());

        std::env::set_var("YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS", "true");
        assert!(webhook_private_network_delivery_allowed());

        std::env::remove_var("YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS");
        std::env::set_var("WEBHOOK_ALLOW_PRIVATE_NETWORKS", "on");
        assert!(webhook_private_network_delivery_allowed());

        clear_webhook_private_network_env();
    }

    #[test]
    fn webhook_endpoint_allows_private_networks_when_configured() {
        assert!(webhook_endpoint_allowed(
            IpAddr::V4(Ipv4Addr::new(192, 168, 1, 10)),
            true
        ));
        assert!(webhook_endpoint_allowed(
            IpAddr::V6(Ipv6Addr::LOCALHOST),
            true
        ));
    }
}
