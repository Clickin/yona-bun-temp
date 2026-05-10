//! Canonical integrations ownership for outbound provider slices.

use std::sync::{Mutex, OnceLock};

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

fn test_outbox() -> &'static Mutex<Vec<MailDeliveryRecord>> {
    static OUTBOX: OnceLock<Mutex<Vec<MailDeliveryRecord>>> = OnceLock::new();
    OUTBOX.get_or_init(|| Mutex::new(Vec::new()))
}

pub fn clear_test_outbox() {
    test_outbox().lock().unwrap().clear();
}

pub fn snapshot_test_outbox() -> Vec<MailDeliveryRecord> {
    test_outbox().lock().unwrap().clone()
}

pub fn smtp_enabled() -> bool {
    read_bool_env("SMTP_ENABLED")
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

    let host = std::env::var("SMTP_HOST").map_err(|_| "SMTP_HOST is required.".to_string())?;
    let port = std::env::var("SMTP_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(587);
    let mut builder = SmtpTransport::relay(&host)
        .map_err(|error| format!("smtp relay configuration failed: {error}"))?
        .port(port);
    let user = std::env::var("SMTP_USER")
        .ok()
        .filter(|value| !value.trim().is_empty());
    let pass = std::env::var("SMTP_PASS")
        .ok()
        .filter(|value| !value.trim().is_empty());
    if let (Some(user), Some(pass)) = (user, pass) {
        builder = builder.credentials(Credentials::new(user, pass));
    }
    builder
        .build()
        .send(&email)
        .map_err(|error| format!("smtp delivery failed: {error}"))?;
    Ok(())
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
