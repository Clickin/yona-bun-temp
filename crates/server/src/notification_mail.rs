use sea_orm::entity::prelude::{DateTime, DateTimeUtc};
use std::time::{Duration, SystemTime};
use yona_rust_integrations::{
    deliver, notification_mail_batches, NotificationMailRecipient, OutboundMail,
};

use crate::persistence::PilotRepository;
use crate::server_config::{parse_legacy_bool, parse_legacy_duration_ms};
use crate::{
    absolute_app_url, default_public_origin, escape_html_attr, escape_html_text,
    normalize_identifier, percent_encode_uri_component, persistence, runtime_config,
    site_name_from_option, SmtpRuntimeConfig,
};

fn normalize_mail_domain_list(values: &[String]) -> Vec<String> {
    values
        .iter()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_ascii_lowercase())
        .collect()
}

fn notification_mail_recipient_allowed(email: &str, allowed_domains: &[String]) -> bool {
    if allowed_domains.is_empty() {
        return true;
    }
    let Some((_, domain)) = email.rsplit_once('@') else {
        return false;
    };
    if domain.is_empty() {
        return false;
    }
    let domain = domain.to_ascii_lowercase();
    allowed_domains
        .iter()
        .any(|allowed| allowed.as_str() == domain)
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NotificationMailSchedulerConfig {
    pub enabled: bool,
    pub initial_delay_ms: u64,
    pub interval_ms: u64,
    pub delay_ms: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NotificationMailDeliveryConfig {
    pub allowed_domains: Vec<String>,
    pub default_from: String,
    pub hide_address: bool,
    pub recipient_limit: Option<usize>,
    pub reply_to_address: Option<String>,
    pub site_name: String,
}

impl Default for NotificationMailDeliveryConfig {
    fn default() -> Self {
        Self {
            allowed_domains: Vec::new(),
            default_from: "noreply@yona.local".to_string(),
            hide_address: false,
            recipient_limit: None,
            reply_to_address: None,
            site_name: "Yona".to_string(),
        }
    }
}

impl NotificationMailDeliveryConfig {
    pub fn from_startup(config: &runtime_config::StartupConfig) -> Self {
        Self {
            allowed_domains: normalize_mail_domain_list(
                config
                    .allowed_sending_mail_domains
                    .as_deref()
                    .unwrap_or(&[]),
            ),
            default_from: SmtpRuntimeConfig::from_startup(config).default_from(),
            hide_address: config.notification_mail_hide_address.unwrap_or(false),
            recipient_limit: config.notification_mail_recipient_limit,
            reply_to_address: config.mailbox_imap_address.clone(),
            site_name: site_name_from_option(config.site_name.as_deref()),
        }
    }
}

impl Default for NotificationMailSchedulerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            initial_delay_ms: 5_000,
            interval_ms: 60_000,
            delay_ms: 180_000,
        }
    }
}

pub fn notification_mail_scheduler_config_from_env() -> NotificationMailSchedulerConfig {
    let defaults = NotificationMailSchedulerConfig::default();
    let enabled = std::env::var("YONA_NOTIFICATION_MAIL_ENABLED")
        .ok()
        .and_then(|value| parse_legacy_bool(&value));
    let initial_delay = std::env::var("YONA_NOTIFICATION_MAIL_INITIAL_DELAY").ok();
    let interval = std::env::var("YONA_NOTIFICATION_MAIL_INTERVAL").ok();
    let delay = std::env::var("YONA_NOTIFICATION_MAIL_DELAY").ok();
    notification_mail_scheduler_config_from_options(
        enabled,
        initial_delay.as_deref(),
        interval.as_deref(),
        delay.as_deref(),
        defaults,
    )
}

pub fn notification_mail_scheduler_config_from_startup(
    config: &runtime_config::StartupConfig,
) -> NotificationMailSchedulerConfig {
    notification_mail_scheduler_config_from_options(
        config.notification_mail_enabled,
        config.notification_mail_initial_delay.as_deref(),
        config.notification_mail_interval.as_deref(),
        config.notification_mail_delay.as_deref(),
        NotificationMailSchedulerConfig::default(),
    )
}

fn notification_mail_scheduler_config_from_options(
    enabled: Option<bool>,
    initial_delay: Option<&str>,
    interval: Option<&str>,
    delay: Option<&str>,
    defaults: NotificationMailSchedulerConfig,
) -> NotificationMailSchedulerConfig {
    NotificationMailSchedulerConfig {
        enabled: enabled.unwrap_or(defaults.enabled),
        initial_delay_ms: initial_delay
            .and_then(parse_legacy_duration_ms)
            .unwrap_or(defaults.initial_delay_ms),
        interval_ms: interval
            .and_then(parse_legacy_duration_ms)
            .unwrap_or(defaults.interval_ms)
            .max(1),
        delay_ms: delay
            .and_then(parse_legacy_duration_ms)
            .unwrap_or(defaults.delay_ms as u64)
            .min(i64::MAX as u64) as i64,
    }
}

fn notification_mail_content(
    item: &persistence::NotificationItemRecord,
    target_url: &str,
    public_origin: &str,
    base_path: &str,
    site_name: &str,
    delivery_config: &NotificationMailDeliveryConfig,
) -> (String, String) {
    let subject = if item.target_title.is_empty() {
        item.message.clone()
    } else {
        item.target_title.clone()
    };
    let body = notification_mail_apply_legacy_html_postprocessing(
        &notification_mail_legacy_body(
            item,
            target_url,
            public_origin,
            base_path,
            site_name,
            delivery_config,
        ),
        public_origin,
    );
    (subject, body)
}

fn notification_mail_legacy_body(
    item: &persistence::NotificationItemRecord,
    target_url: &str,
    public_origin: &str,
    base_path: &str,
    site_name: &str,
    delivery_config: &NotificationMailDeliveryConfig,
) -> String {
    let settings_url = absolute_app_url(public_origin, base_path, "/user/editform/notifications");
    let settings_link = notification_mail_footer_link(&settings_url, "Notification settings");
    let unwatch_url = notification_mail_unwatch_url(item, public_origin, base_path)
        .unwrap_or_else(|| settings_url.clone());
    let unwatch_link = notification_mail_footer_link(&unwatch_url, "Unwatch");
    let target_link = if target_url.is_empty() {
        String::new()
    } else {
        let prefix = if notification_mail_reply_to(item, delivery_config).is_some() {
            "Reply to this email directly or "
        } else {
            ""
        };
        format!(
            "\n\n{}<a href=\"{}\" target=\"_blank\">View it on {}</a>\n",
            prefix,
            escape_html_attr(target_url),
            escape_html_text(site_name)
        )
    };

    format!(
        "<div style=\"font-family:'Helvetica Neue','Helvetica','Arial','나눔고딕','NanumGothic','NanumGothicOTF','Apple SD Gothic Neo','맑은 고딕',sans-serif;\">\n  {}\n</div>\n\n<hr style=\"border:0; border-bottom:1px solid #ddd; margin:20px 0;\">\n{}\n<div style=\"max-width:410px;margin-top:20px;color:#989898;text-align:justify;word-break:break-all;font-size:11px;font-family:'Helvetica Neue','Helvetica','Arial','나눔고딕','NanumGothic','NanumGothicOTF','Apple SD Gothic Neo','맑은 고딕',sans-serif;\">You can {} or<br>change settings at {} if you want to mute this.</div>\n",
        item.message, target_link, unwatch_link, settings_link
    )
}

fn notification_mail_reply_to(
    item: &persistence::NotificationItemRecord,
    delivery_config: &NotificationMailDeliveryConfig,
) -> Option<String> {
    let imap_address = delivery_config.reply_to_address.as_deref()?;
    let (local_part, domain) = imap_address.split_once('@')?;
    if local_part.is_empty() || domain.is_empty() {
        return None;
    }
    let detail = notification_mail_reply_detail(item)?;
    let encoded_detail = detail
        .split('/')
        .map(percent_encode_uri_component)
        .collect::<Vec<_>>()
        .join("/");
    Some(format!("{local_part}+{encoded_detail}@{domain}"))
}

fn notification_mail_reply_detail(item: &persistence::NotificationItemRecord) -> Option<String> {
    let resource_type = notification_mail_reply_resource_type(item)?;
    let resource_id = item.reply_resource_id.trim();
    if resource_id.is_empty() {
        return None;
    }
    let (owner_name, project_name) = notification_mail_target_owner_project(&item.target_path)?;
    Some(format!(
        "{}/{}/{}/{}",
        owner_name, project_name, resource_type, resource_id
    ))
}

fn notification_mail_target_owner_project(target_path: &str) -> Option<(String, String)> {
    let mut segments = target_path.trim_start_matches('/').split('/');
    let owner_name = segments.next()?.trim();
    let project_name = segments.next()?.trim();
    if owner_name.is_empty() || project_name.is_empty() {
        return None;
    }
    Some((owner_name.to_string(), project_name.to_string()))
}

fn notification_mail_reply_resource_type(
    item: &persistence::NotificationItemRecord,
) -> Option<&'static str> {
    match normalize_identifier(&item.reply_resource_type).as_str() {
        "issue" | "issue_post" | "issue_comment" => Some("issue_post"),
        "posting" | "board_post" | "posting_comment" | "nonissue_comment" => Some("board_post"),
        "comment_thread" | "review_comment" => Some("comment_thread"),
        _ => None,
    }
}

fn notification_mail_unwatch_url(
    item: &persistence::NotificationItemRecord,
    public_origin: &str,
    base_path: &str,
) -> Option<String> {
    let resource_type = notification_mail_legacy_resource_type(&item.resource_type)?;
    let resource_id = item.resource_id.trim();
    if resource_id.is_empty() {
        return None;
    }
    Some(absolute_app_url(
        public_origin,
        base_path,
        &format!(
            "/unwatch?resource.type={}&resource.id={}",
            percent_encode_uri_component(resource_type),
            percent_encode_uri_component(resource_id)
        ),
    ))
}

fn notification_mail_legacy_resource_type(resource_type: &str) -> Option<&'static str> {
    match normalize_identifier(resource_type).as_str() {
        "issue" | "issue_post" => Some("issue_post"),
        "posting" | "board_post" => Some("board_post"),
        "pull_request" => Some("pull_request"),
        "project" => Some("project"),
        "issue_comment" => Some("issue_comment"),
        "posting_comment" | "nonissue_comment" => Some("nonissue_comment"),
        "commit_comment" | "code_comment" => Some("code_comment"),
        "review_comment" => Some("review_comment"),
        "comment_thread" => Some("comment_thread"),
        _ => None,
    }
}

fn notification_mail_footer_link(link: &str, anchor_text: &str) -> String {
    format!(
        "<a href=\"{}\" target=\"_blank\" style=\"color:#4399e2; text-decoration:underline;\">{}</a>",
        escape_html_attr(link),
        escape_html_text(anchor_text)
    )
}

pub fn notification_mail_add_noreferrer_to_external_links(
    html: &str,
    public_origin: &str,
) -> String {
    let html = notification_mail_absolutize_src_attrs(html, public_origin);
    let public_host = host_from_absolute_url(public_origin);
    let mut rendered = String::with_capacity(html.len());
    let mut cursor = 0;
    while let Some(tag_start) = find_html_tag_with_attr_start(&html, cursor, "href") {
        rendered.push_str(&html[cursor..tag_start]);
        let Some(relative_end) = html[tag_start..].find('>') else {
            rendered.push_str(&html[tag_start..]);
            return rendered;
        };
        let tag_end = tag_start + relative_end + 1;
        let tag = &html[tag_start..tag_end];
        rendered.push_str(&notification_mail_href_tag_with_legacy_attrs(
            tag,
            public_origin,
            public_host.as_deref(),
        ));
        cursor = tag_end;
    }
    rendered.push_str(&html[cursor..]);
    rendered
}

pub fn notification_mail_apply_legacy_html_postprocessing(
    html: &str,
    public_origin: &str,
) -> String {
    let linked = notification_mail_add_noreferrer_to_external_links(html, public_origin);
    notification_mail_wrap_images_like_legacy(&linked, public_origin)
}

fn notification_mail_wrap_images_like_legacy(html: &str, public_origin: &str) -> String {
    let mut rendered = String::with_capacity(html.len());
    let mut cursor = 0;
    while let Some(tag_start) = find_html_tag_start(html, cursor, "img") {
        rendered.push_str(&html[cursor..tag_start]);
        let Some(relative_end) = html[tag_start..].find('>') else {
            rendered.push_str(&html[tag_start..]);
            return rendered;
        };
        let tag_end = tag_start + relative_end + 1;
        let tag = &html[tag_start..tag_end];
        rendered.push_str(&notification_mail_wrapped_image_tag(tag, public_origin));
        cursor = tag_end;
    }
    rendered.push_str(&html[cursor..]);
    rendered
}

fn notification_mail_absolutize_src_attrs(html: &str, public_origin: &str) -> String {
    let mut rendered = String::with_capacity(html.len());
    let mut cursor = 0;
    while let Some(tag_start) = find_html_tag_with_attr_start(html, cursor, "src") {
        rendered.push_str(&html[cursor..tag_start]);
        let Some(relative_end) = html[tag_start..].find('>') else {
            rendered.push_str(&html[tag_start..]);
            return rendered;
        };
        let tag_end = tag_start + relative_end + 1;
        let tag = &html[tag_start..tag_end];
        rendered.push_str(&notification_mail_tag_with_absolute_attr(
            tag,
            "src",
            public_origin,
        ));
        cursor = tag_end;
    }
    rendered.push_str(&html[cursor..]);
    rendered
}

fn find_html_tag_with_attr_start(html: &str, cursor: usize, attr_name: &str) -> Option<usize> {
    let lower_html = html[cursor..].to_ascii_lowercase();
    let mut search_from = 0;
    while let Some(relative_start) = lower_html[search_from..].find('<') {
        let local_start = search_from + relative_start;
        let Some(relative_end) = lower_html[local_start..].find('>') else {
            return None;
        };
        let local_end = local_start + relative_end + 1;
        let tag = &html[cursor + local_start..cursor + local_end];
        if html_attr_span(tag, attr_name).is_some() {
            return Some(cursor + local_start);
        }
        search_from = local_end;
    }
    None
}

fn find_html_tag_start(html: &str, cursor: usize, name: &str) -> Option<usize> {
    let lower_html = html[cursor..].to_ascii_lowercase();
    let needle = format!("<{}", name.to_ascii_lowercase());
    let mut search_from = 0;
    while let Some(relative_start) = lower_html[search_from..].find(&needle) {
        let local_start = search_from + relative_start;
        let after_name = local_start + needle.len();
        let is_tag = lower_html
            .as_bytes()
            .get(after_name)
            .map(|byte| {
                byte.is_ascii_whitespace()
                    || *byte == b'>'
                    || *byte == b'/'
                    || *byte == b'\t'
                    || *byte == b'\n'
                    || *byte == b'\r'
            })
            .unwrap_or(false);
        if is_tag {
            return Some(cursor + local_start);
        }
        search_from = after_name;
    }
    None
}

fn notification_mail_wrapped_image_tag(tag: &str, public_origin: &str) -> String {
    let tag = notification_mail_tag_with_absolute_attr(tag, "src", public_origin);
    let Some(src) = html_attr_value(&tag, "src") else {
        return tag.to_string();
    };
    let image = notification_mail_image_tag_with_max_width(&tag);
    format!(
        "<a href=\"{}\" target=\"_blank\" style=\"border:0;outline:0;\">{}</a>",
        escape_html_attr(&src),
        image
    )
}

fn notification_mail_image_tag_with_max_width(tag: &str) -> String {
    if let Some((style_start, style_end, style_value)) = html_attr_span(tag, "style") {
        let mut updated = String::with_capacity(tag.len() + "max-width:1024px;".len());
        updated.push_str(&tag[..style_start]);
        updated.push_str(&format!("style=\"max-width:1024px;{}\"", style_value));
        updated.push_str(&tag[style_end..]);
        return updated;
    }
    let insert_at = tag.rfind('>').unwrap_or(tag.len());
    let mut updated = String::with_capacity(tag.len() + " style=\"max-width:1024px;\"".len());
    updated.push_str(&tag[..insert_at]);
    updated.push_str(" style=\"max-width:1024px;\"");
    updated.push_str(&tag[insert_at..]);
    updated
}

fn notification_mail_href_tag_with_legacy_attrs(
    tag: &str,
    public_origin: &str,
    public_host: Option<&str>,
) -> String {
    let tag = notification_mail_tag_with_absolute_attr(tag, "href", public_origin);
    let Some(href) = html_attr_value(&tag, "href") else {
        return tag.to_string();
    };
    if !notification_mail_link_is_external(&href, public_host) {
        return tag.to_string();
    }
    if let Some((rel_start, rel_end, rel_value)) = html_attr_span(&tag, "rel") {
        if rel_value
            .split_whitespace()
            .any(|value| value.eq_ignore_ascii_case("noreferrer"))
        {
            return tag.to_string();
        }
        let mut updated = String::with_capacity(tag.len() + " noreferrer".len());
        updated.push_str(&tag[..rel_start]);
        updated.push_str(&format!("rel=\"{} noreferrer\"", rel_value));
        updated.push_str(&tag[rel_end..]);
        return updated;
    }
    let insert_at = tag.rfind('>').unwrap_or(tag.len());
    let mut updated = String::with_capacity(tag.len() + " rel=\" noreferrer\"".len());
    updated.push_str(&tag[..insert_at]);
    updated.push_str(" rel=\" noreferrer\"");
    updated.push_str(&tag[insert_at..]);
    updated
}

fn notification_mail_tag_with_absolute_attr(tag: &str, name: &str, public_origin: &str) -> String {
    let Some((attr_start, attr_end, value)) = html_attr_span(tag, name) else {
        return tag.to_string();
    };
    let Some(absolute_value) = notification_mail_absolute_url(&value, public_origin) else {
        return tag.to_string();
    };
    let mut updated = String::with_capacity(tag.len() + absolute_value.len());
    updated.push_str(&tag[..attr_start]);
    updated.push_str(&format!(
        "{}=\"{}\"",
        name,
        escape_html_attr(&absolute_value)
    ));
    updated.push_str(&tag[attr_end..]);
    updated
}

fn notification_mail_absolute_url(value: &str, public_origin: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty()
        || trimmed.starts_with('#')
        || uri_looks_absolute(trimmed)
        || public_origin.trim().is_empty()
    {
        return None;
    }
    let origin = public_origin.trim_end_matches('/');
    if trimmed.starts_with('/') {
        Some(format!("{origin}{trimmed}"))
    } else {
        Some(format!("{origin}/{trimmed}"))
    }
}

fn uri_looks_absolute(value: &str) -> bool {
    let first_delimiter = value.find([':', '/', '?', '#']).unwrap_or(value.len());
    value.as_bytes().get(first_delimiter) == Some(&b':')
}

fn notification_mail_link_is_external(href: &str, public_host: Option<&str>) -> bool {
    let trimmed = href.trim();
    let lower = trimmed.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return false;
    }
    if absolute_url_has_malformed_percent_escape(trimmed) {
        return true;
    }
    let Some(href_host) = host_from_absolute_url(trimmed) else {
        return true;
    };
    public_host
        .map(|host| !href_host.eq_ignore_ascii_case(host))
        .unwrap_or(true)
}

fn absolute_url_has_malformed_percent_escape(value: &str) -> bool {
    let bytes = value.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            if index + 2 >= bytes.len()
                || !bytes[index + 1].is_ascii_hexdigit()
                || !bytes[index + 2].is_ascii_hexdigit()
            {
                return true;
            }
            index += 3;
        } else {
            index += 1;
        }
    }
    false
}

fn host_from_absolute_url(value: &str) -> Option<String> {
    let trimmed = value.trim();
    let scheme_end = trimmed.find("://")?;
    let host_start = scheme_end + 3;
    let host_end = trimmed[host_start..]
        .find(['/', '?', '#'])
        .map(|offset| host_start + offset)
        .unwrap_or(trimmed.len());
    let host = trimmed[host_start..host_end]
        .rsplit('@')
        .next()
        .unwrap_or_default()
        .split(':')
        .next()
        .unwrap_or_default()
        .trim();
    (!host.is_empty()).then(|| host.to_ascii_lowercase())
}

fn html_attr_value(tag: &str, name: &str) -> Option<String> {
    html_attr_span(tag, name).map(|(_, _, value)| value)
}

fn html_attr_span(tag: &str, name: &str) -> Option<(usize, usize, String)> {
    let lower = tag.to_ascii_lowercase();
    let name = name.to_ascii_lowercase();
    let bytes = lower.as_bytes();
    let name_bytes = name.as_bytes();
    let mut index = 0;
    while index + name_bytes.len() <= bytes.len() {
        let Some(relative_start) = lower[index..].find(&name) else {
            return None;
        };
        let attr_start = index + relative_start;
        let before = attr_start
            .checked_sub(1)
            .and_then(|position| bytes.get(position).copied());
        let has_name_boundary = before
            .map(|byte| byte.is_ascii_whitespace() || byte == b'<' || byte == b'/')
            .unwrap_or(true);
        let mut after_name = attr_start + name_bytes.len();
        if !has_name_boundary {
            index = after_name;
            continue;
        }
        while bytes
            .get(after_name)
            .copied()
            .is_some_and(|byte| byte.is_ascii_whitespace())
        {
            after_name += 1;
        }
        if bytes.get(after_name).copied() != Some(b'=') {
            index = after_name;
            continue;
        }
        let mut value_start = after_name + 1;
        while bytes
            .get(value_start)
            .copied()
            .is_some_and(|byte| byte.is_ascii_whitespace())
        {
            value_start += 1;
        }
        let quote = tag.as_bytes().get(value_start).copied()?;
        let (value_body_start, value_body_end, attr_end) = if quote == b'"' || quote == b'\'' {
            let value_body_start = value_start + 1;
            let value_body_end = tag[value_body_start..].find(quote as char)? + value_body_start;
            (value_body_start, value_body_end, value_body_end + 1)
        } else {
            let value_body_start = value_start;
            let value_body_end = tag[value_body_start..]
                .find(|ch: char| ch.is_whitespace() || ch == '>')
                .map(|offset| value_body_start + offset)
                .unwrap_or(tag.len());
            if value_body_end == value_body_start {
                index = value_start + 1;
                continue;
            }
            (value_body_start, value_body_end, value_body_end)
        };
        return Some((
            attr_start,
            attr_end,
            tag[value_body_start..value_body_end].to_string(),
        ));
    }
    None
}

pub async fn deliver_due_notification_mails(
    repository: &PilotRepository,
    now: DateTime,
    delay_ms: i64,
    public_origin: &str,
    base_path: &str,
    delivery_config: &NotificationMailDeliveryConfig,
) -> Result<usize, String> {
    let public_origin = default_public_origin(public_origin);
    let deliveries = repository
        .drain_due_notification_mail_deliveries(now, delay_ms)
        .await
        .map_err(|error| error.to_string())?;
    let deliveries: Vec<_> = deliveries
        .into_iter()
        .filter(|delivery| {
            notification_mail_recipient_allowed(
                &delivery.recipient_email,
                &delivery_config.allowed_domains,
            )
        })
        .collect();
    let mut grouped: Vec<(
        persistence::NotificationItemRecord,
        Vec<NotificationMailRecipient>,
    )> = Vec::new();
    for delivery in deliveries {
        let recipient = NotificationMailRecipient {
            email: delivery.recipient_email,
            name: delivery.recipient_login_id,
            preferred_language: delivery.recipient_language,
        };
        if let Some((_, recipients)) = grouped
            .iter_mut()
            .find(|(item, _)| item.id == delivery.item.id)
        {
            recipients.push(recipient);
        } else {
            grouped.push((delivery.item, vec![recipient]));
        }
    }

    let mut delivered = 0;
    for (item, recipients) in grouped {
        let target_url = if item.target_path.is_empty() {
            String::new()
        } else {
            absolute_app_url(&public_origin, base_path, &item.target_path)
        };
        let (subject, body) = notification_mail_content(
            &item,
            &target_url,
            &public_origin,
            base_path,
            &delivery_config.site_name,
            delivery_config,
        );
        for batch in notification_mail_batches(
            &recipients,
            &delivery_config.default_from,
            &delivery_config.site_name,
            delivery_config.hide_address,
            delivery_config.recipient_limit,
        ) {
            let bcc = batch
                .bcc
                .into_iter()
                .map(|recipient| recipient.email)
                .collect::<Vec<_>>();
            let reply_to = notification_mail_reply_to(&item, delivery_config);
            for recipient in batch.to {
                deliver(OutboundMail {
                    bcc: bcc.clone(),
                    body: body.clone(),
                    from: delivery_config.default_from.clone(),
                    html: true,
                    reply_to: reply_to.clone(),
                    subject: subject.clone(),
                    to: recipient.email,
                })
                .map_err(|error| error.to_string())?;
                delivered += 1;
            }
        }
    }
    Ok(delivered)
}

pub async fn deliver_due_notification_mails_with_config(
    repository: &PilotRepository,
    now: DateTime,
    delay_ms: i64,
    public_origin: &str,
    base_path: &str,
    delivery_config: &NotificationMailDeliveryConfig,
) -> Result<usize, String> {
    deliver_due_notification_mails(
        repository,
        now,
        delay_ms,
        public_origin,
        base_path,
        delivery_config,
    )
    .await
}

pub async fn deliver_notification_mail_scheduler_tick(
    repository: &PilotRepository,
    config: &NotificationMailSchedulerConfig,
    public_origin: &str,
    base_path: &str,
    delivery_config: &NotificationMailDeliveryConfig,
) -> Result<usize, String> {
    if !config.enabled {
        return Ok(0);
    }
    deliver_due_notification_mails(
        repository,
        DateTimeUtc::from(SystemTime::now()).naive_utc(),
        config.delay_ms,
        public_origin,
        base_path,
        delivery_config,
    )
    .await
}

pub async fn deliver_notification_mail_scheduler_tick_with_config(
    repository: &PilotRepository,
    config: &NotificationMailSchedulerConfig,
    public_origin: &str,
    base_path: &str,
    delivery_config: &NotificationMailDeliveryConfig,
) -> Result<usize, String> {
    deliver_notification_mail_scheduler_tick(
        repository,
        config,
        public_origin,
        base_path,
        delivery_config,
    )
    .await
}

pub fn spawn_notification_mail_scheduler(
    repository: PilotRepository,
    public_origin: impl Into<String>,
    base_path: impl Into<String>,
    config: NotificationMailSchedulerConfig,
    delivery_config: NotificationMailDeliveryConfig,
) -> Option<tokio::task::JoinHandle<()>> {
    if !config.enabled {
        return None;
    }
    let public_origin = public_origin.into();
    let base_path = base_path.into();
    Some(tokio::spawn(async move {
        if config.initial_delay_ms > 0 {
            tokio::time::sleep(Duration::from_millis(config.initial_delay_ms)).await;
        }
        loop {
            if let Err(error) = deliver_notification_mail_scheduler_tick_with_config(
                &repository,
                &config,
                &public_origin,
                &base_path,
                &delivery_config,
            )
            .await
            {
                tracing::warn!(%error, "notification mail scheduler tick failed");
            }
            tokio::time::sleep(Duration::from_millis(config.interval_ms)).await;
        }
    }))
}
