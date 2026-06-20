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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn configured_commands_preserve_quoted_programs_and_arguments() {
        let (program, args) = configured_command_parts(
            r#""/opt/Yona Tools/fetch mailbox" --mode "unseen only" 'folder name'"#,
            "empty",
        )
        .expect("configured command");
        assert_eq!(program, "/opt/Yona Tools/fetch mailbox");
        assert_eq!(args, vec!["--mode", "unseen only", "folder name"]);

        assert_eq!(
            split_configured_command(r#"runner escaped\ value "two words""#)
                .expect("escaped command"),
            vec!["runner", "escaped value", "two words"]
        );
        assert!(split_configured_command(r#""unterminated"#).is_err());
    }
}
