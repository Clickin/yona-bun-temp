use std::collections::BTreeMap;
use std::sync::OnceLock;

use axum::{response::IntoResponse, routing::get, Router};

// Frontend-owned i18n dictionaries (see scripts/generate-i18n-dictionaries.mjs).
// Values are verbatim legacy message values; Play/MessageFormat unescaping is
// applied at parse time (see play_unescape_message_value) so every output path
// serves the same unescaped copy legacy `play.i18n.Messages.get` produces.
const LEGACY_DEFAULT_MESSAGES: &str =
    include_str!("../../../../frontend/src/i18n/messages/en-US.json");
const LEGACY_JAPANESE_MESSAGES: &str =
    include_str!("../../../../frontend/src/i18n/messages/ja-JP.json");
const LEGACY_KOREAN_MESSAGES: &str =
    include_str!("../../../../frontend/src/i18n/messages/ko-KR.json");
const LEGACY_RUSSIAN_MESSAGES: &str =
    include_str!("../../../../frontend/src/i18n/messages/ru-RU.json");
const LEGACY_UZBEK_MESSAGES: &str =
    include_str!("../../../../frontend/src/i18n/messages/uz-UZ.json");

static EN_MESSAGES: OnceLock<BTreeMap<String, String>> = OnceLock::new();
static JA_MESSAGES: OnceLock<BTreeMap<String, String>> = OnceLock::new();
static KO_MESSAGES: OnceLock<BTreeMap<String, String>> = OnceLock::new();
static RU_MESSAGES: OnceLock<BTreeMap<String, String>> = OnceLock::new();
static UZ_MESSAGES: OnceLock<BTreeMap<String, String>> = OnceLock::new();

fn en_messages() -> &'static BTreeMap<String, String> {
    EN_MESSAGES.get_or_init(|| parse_legacy_message_json(LEGACY_DEFAULT_MESSAGES))
}

fn ja_messages() -> &'static BTreeMap<String, String> {
    JA_MESSAGES.get_or_init(|| parse_legacy_message_json(LEGACY_JAPANESE_MESSAGES))
}

fn ko_messages() -> &'static BTreeMap<String, String> {
    KO_MESSAGES.get_or_init(|| parse_legacy_message_json(LEGACY_KOREAN_MESSAGES))
}

fn ru_messages() -> &'static BTreeMap<String, String> {
    RU_MESSAGES.get_or_init(|| parse_legacy_message_json(LEGACY_RUSSIAN_MESSAGES))
}

fn uz_messages() -> &'static BTreeMap<String, String> {
    UZ_MESSAGES.get_or_init(|| parse_legacy_message_json(LEGACY_UZBEK_MESSAGES))
}

fn parse_legacy_message_json(source: &str) -> BTreeMap<String, String> {
    let raw: BTreeMap<String, String> =
        serde_json::from_str(source).expect("frontend i18n dictionary JSON must parse");
    raw.into_iter()
        .map(|(key, value)| (key, play_unescape_message_value(&value)))
        .collect()
}

/// Applies the escapes legacy Play serves over `play.i18n.Messages.get` values:
/// Java-properties escapes (`\n`/`\t`/`\r`/`\\`) and Play apostrophe quoting
/// (`''` → `'`). `js_string_literal` re-escapes the first set for the JS
/// payload, mirroring legacy `jsmessages.JsMessages.generate()`.
fn play_unescape_message_value(value: &str) -> String {
    let mut unescaped = String::with_capacity(value.len());
    let mut chars = value.chars();
    while let Some(current) = chars.next() {
        match current {
            '\\' => match chars.next() {
                Some('n') => unescaped.push('\n'),
                Some('t') => unescaped.push('\t'),
                Some('r') => unescaped.push('\r'),
                Some('\\') => unescaped.push('\\'),
                Some(other) => {
                    unescaped.push('\\');
                    unescaped.push(other);
                }
                None => unescaped.push('\\'),
            },
            '\'' if chars.clone().next() == Some('\'') => {
                unescaped.push('\'');
                chars.next();
            }
            current => unescaped.push(current),
        }
    }
    unescaped
}

pub(crate) fn routes() -> Router {
    Router::new().route("/messages.js", get(legacy_js_messages))
}

async fn legacy_js_messages() -> impl IntoResponse {
    let mut entries = String::new();
    for (key, value) in en_messages() {
        entries.push_str("    ");
        entries.push_str(&js_string_literal(key));
        entries.push_str(": ");
        entries.push_str(&js_string_literal(value));
        entries.push_str(",\n");
    }
    let body = format!(
        r#"(function(global) {{
  var _messages = {{
{entries}  }};
  function format(message, args) {{
    return String(message).replace(/\{{(\d+)\}}/g, function(match, index) {{
      return Object.prototype.hasOwnProperty.call(args, index) ? args[index] : match;
    }});
  }}
  function Messages(key) {{
    var value = Object.prototype.hasOwnProperty.call(_messages, key) ? _messages[key] : key;
    return arguments.length > 1 ? format(value, Array.prototype.slice.call(arguments, 1)) : value;
  }}
  Messages._messages = _messages;
  global.Messages = Messages;
}})(this);
"#
    );
    (
        [(
            axum::http::header::CONTENT_TYPE,
            "application/javascript; charset=utf-8",
        )],
        body,
    )
        .into_response()
}

pub(crate) fn legacy_message(language: Option<&str>, key: &str) -> String {
    let localized_messages = match language
        .unwrap_or_default()
        .split_once('-')
        .map(|(prefix, _)| prefix)
        .unwrap_or_else(|| language.unwrap_or_default())
        .to_ascii_lowercase()
        .as_str()
    {
        "ja" => Some(ja_messages()),
        "ko" => Some(ko_messages()),
        "ru" => Some(ru_messages()),
        "uz" => Some(uz_messages()),
        _ => None,
    };
    localized_messages
        .and_then(|messages| messages.get(key))
        .or_else(|| en_messages().get(key))
        .map(String::as_str)
        .unwrap_or(key)
        .to_string()
}

fn js_string_literal(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len() + 2);
    escaped.push('"');
    for ch in value.chars() {
        match ch {
            '\\' => escaped.push_str("\\\\"),
            '"' => escaped.push_str("\\\""),
            '\n' => escaped.push_str("\\n"),
            '\r' => escaped.push_str("\\r"),
            '\t' => escaped.push_str("\\t"),
            '\u{08}' => escaped.push_str("\\b"),
            '\u{0c}' => escaped.push_str("\\f"),
            c if c.is_control() => {
                escaped.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => escaped.push(c),
        }
    }
    escaped.push('"');
    escaped
}

#[cfg(test)]
mod tests {
    use super::{en_messages, js_string_literal, legacy_message, play_unescape_message_value};

    #[test]
    fn parses_legacy_default_messages_without_new_keyspace() {
        let messages = en_messages();
        assert_eq!(
            messages.get("title.no.results").map(String::as_str),
            Some("No results")
        );
        assert_eq!(
            messages.get("button.login").map(String::as_str),
            Some("Log in")
        );
        assert!(!messages
            .keys()
            .any(|key| key.starts_with("yoram.") || key.starts_with("react.")));
    }

    #[test]
    fn escapes_message_values_for_javascript() {
        assert_eq!(js_string_literal("a\"b\\c\n"), "\"a\\\"b\\\\c\\n\"");
    }

    #[test]
    fn unescapes_play_apostrophe_quoting_and_properties_escapes() {
        assert_eq!(play_unescape_message_value("user''s"), "user's");
        assert_eq!(
            play_unescape_message_value("a\\nb\\tc\\rd\\\\e"),
            "a\nb\tc\rd\\e"
        );
    }

    #[test]
    fn resolves_localized_legacy_messages_with_default_fallback() {
        assert_eq!(legacy_message(Some("ko-KR"), "issue.derived"), "파생 이슈");
        assert_eq!(
            legacy_message(Some("en-US"), "issue.derived"),
            "Derived issue"
        );
        assert_eq!(legacy_message(None, "issue.derived"), "Derived issue");
    }
}
