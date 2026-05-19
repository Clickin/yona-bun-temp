//! Canonical integrations ownership for outbound provider slices.

use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};

/// Returns the crate ownership label used by foundation tests and future packet wiring.
pub const CRATE_OWNER: &str = "integrations";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MailDeliveryRecord {
    pub body: String,
    pub from: String,
    pub subject: String,
    pub to: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OutboundMail {
    pub body: String,
    pub from: String,
    pub subject: String,
    pub to: String,
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

pub fn clear_test_outbox() {
    test_outbox().lock().unwrap().clear();
}

pub fn snapshot_test_outbox() -> Vec<MailDeliveryRecord> {
    test_outbox().lock().unwrap().clone()
}

pub fn clear_test_webhook_outbox() {
    test_webhook_outbox().lock().unwrap().clear();
}

pub fn snapshot_test_webhook_outbox() -> Vec<WebhookDeliveryRecord> {
    test_webhook_outbox().lock().unwrap().clone()
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

pub fn deliver(mail: OutboundMail) -> Result<(), String> {
    if !smtp_enabled() {
        test_outbox().lock().unwrap().push(MailDeliveryRecord {
            body: mail.body,
            from: mail.from,
            subject: mail.subject,
            to: mail.to,
        });
        return Ok(());
    }

    let email = Message::builder()
        .from(
            mail.from
                .parse()
                .map_err(|error| format!("invalid from address: {error}"))?,
        )
        .to(mail
            .to
            .parse()
            .map_err(|error| format!("invalid to address: {error}"))?)
        .subject(mail.subject)
        .body(mail.body)
        .map_err(|error| format!("invalid mail message: {error}"))?;

    let host = configured_env_value(&["SMTP_HOST", "YONA_SMTP_HOST"])
        .ok_or_else(|| "SMTP_HOST is required.".to_string())?;
    let port = configured_env_value(&["SMTP_PORT", "YONA_SMTP_PORT"])
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(587);
    let mut builder = SmtpTransport::relay(&host)
        .map_err(|error| format!("smtp relay configuration failed: {error}"))?
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

pub fn deliver_webhook(webhook: OutboundWebhook) -> Result<(), String> {
    let record = WebhookDeliveryRecord {
        body: webhook.body,
        event_type: webhook.event_type,
        headers: webhook_headers(&webhook.secret),
        payload_url: webhook.payload_url,
        webhook_type: webhook.webhook_type,
    };

    if !webhook_http_delivery_enabled() {
        test_webhook_outbox().lock().unwrap().push(record);
        return Ok(());
    }

    post_webhook_over_plain_http(&record)
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

fn post_webhook_over_plain_http(record: &WebhookDeliveryRecord) -> Result<(), String> {
    let parsed = parse_plain_http_url(&record.payload_url)?;
    let address = (parsed.host.as_str(), parsed.port)
        .to_socket_addrs()
        .map_err(|error| format!("webhook address resolution failed: {error}"))?
        .next()
        .ok_or_else(|| "webhook address resolution returned no endpoints".to_string())?;
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
        Ok(())
    } else {
        Err(format!("webhook request failed: {status}"))
    }
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
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(false)
}
