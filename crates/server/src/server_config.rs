pub(crate) fn parse_legacy_bool(value: &str) -> Option<bool> {
    match value.trim().to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => Some(true),
        "0" | "false" | "no" | "off" => Some(false),
        _ => None,
    }
}

pub(crate) fn parse_legacy_duration_ms(value: &str) -> Option<u64> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    let (number, multiplier) = if let Some(number) = trimmed.strip_suffix("ms") {
        (number.trim(), 1)
    } else if let Some(number) = trimmed.strip_suffix('s') {
        (number.trim(), 1_000)
    } else if let Some(number) = trimmed.strip_suffix('m') {
        (number.trim(), 60_000)
    } else if let Some(number) = trimmed.strip_suffix('h') {
        (number.trim(), 3_600_000)
    } else {
        (trimmed, 1)
    };

    number
        .parse::<u64>()
        .ok()
        .and_then(|amount| amount.checked_mul(multiplier))
}

pub(crate) fn configured_command_parts(
    command: &str,
    empty_message: &str,
) -> Result<(String, Vec<String>), String> {
    let parts = split_configured_command(command)?;
    let mut parts = parts.into_iter();
    let program = parts.next().ok_or_else(|| empty_message.to_string())?;
    Ok((program, parts.collect()))
}

pub(crate) fn split_configured_command(command: &str) -> Result<Vec<String>, String> {
    let mut parts = Vec::new();
    let mut current = String::new();
    let mut quote: Option<char> = None;
    let mut escaped = false;

    for ch in command.chars() {
        if escaped {
            current.push(ch);
            escaped = false;
            continue;
        }
        if ch == '\\' {
            escaped = true;
            continue;
        }
        if let Some(quote_char) = quote {
            if ch == quote_char {
                quote = None;
            } else {
                current.push(ch);
            }
            continue;
        }
        if ch == '\'' || ch == '"' {
            quote = Some(ch);
            continue;
        }
        if ch.is_whitespace() {
            if !current.is_empty() {
                parts.push(std::mem::take(&mut current));
            }
            continue;
        }
        current.push(ch);
    }

    if escaped {
        current.push('\\');
    }
    if quote.is_some() {
        return Err("configured command has unterminated quote".to_string());
    }
    if !current.is_empty() {
        parts.push(current);
    }

    Ok(parts)
}
