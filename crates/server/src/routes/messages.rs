use axum::{response::IntoResponse, routing::get, Router};

const LEGACY_DEFAULT_MESSAGES: &str = include_str!("../../../../yona-original/conf/messages");
const LEGACY_JAPANESE_MESSAGES: &str =
    include_str!("../../../../yona-original/conf/messages.ja-JP");
const LEGACY_KOREAN_MESSAGES: &str = include_str!("../../../../yona-original/conf/messages.ko-KR");
const LEGACY_RUSSIAN_MESSAGES: &str = include_str!("../../../../yona-original/conf/messages.ru-RU");
const LEGACY_UZBEK_MESSAGES: &str = include_str!("../../../../yona-original/conf/messages.uz-UZ");

pub(crate) fn routes() -> Router {
    Router::new().route("/messages.js", get(legacy_js_messages))
}

async fn legacy_js_messages() -> impl IntoResponse {
    let mut entries = String::new();
    for (key, value) in parse_legacy_messages(LEGACY_DEFAULT_MESSAGES) {
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
        "ja" => Some(LEGACY_JAPANESE_MESSAGES),
        "ko" => Some(LEGACY_KOREAN_MESSAGES),
        "ru" => Some(LEGACY_RUSSIAN_MESSAGES),
        "uz" => Some(LEGACY_UZBEK_MESSAGES),
        _ => None,
    };
    localized_messages
        .and_then(|source| legacy_message_value(source, key))
        .or_else(|| legacy_message_value(LEGACY_DEFAULT_MESSAGES, key))
        .unwrap_or(key)
        .to_string()
}

fn legacy_message_value<'a>(source: &'a str, key: &str) -> Option<&'a str> {
    parse_legacy_messages(source)
        .into_iter()
        .find_map(|(candidate, value)| (candidate == key).then_some(value))
}

fn parse_legacy_messages(source: &str) -> Vec<(&str, &str)> {
    source
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                return None;
            }
            let (key, value) = trimmed.split_once('=')?;
            Some((key.trim(), value.trim()))
        })
        .collect()
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
    use super::{
        js_string_literal, legacy_message, parse_legacy_messages, LEGACY_DEFAULT_MESSAGES,
    };

    #[test]
    fn parses_legacy_default_messages_without_new_keyspace() {
        let messages = parse_legacy_messages(LEGACY_DEFAULT_MESSAGES);
        assert!(messages
            .iter()
            .any(|(key, value)| { *key == "title.no.results" && *value == "No results" }));
        assert!(messages
            .iter()
            .any(|(key, value)| { *key == "button.login" && *value == "Log in" }));
        assert!(!messages
            .iter()
            .any(|(key, _)| key.starts_with("yoram.") || key.starts_with("react.")));
    }

    #[test]
    fn escapes_message_values_for_javascript() {
        assert_eq!(js_string_literal("a\"b\\c\n"), "\"a\\\"b\\\\c\\n\"");
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
