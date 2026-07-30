/// FROM sources — reads from a running legacy Yona or Yoram instance via REST API.
use std::path::PathBuf;

use anyhow::{Context as _, Result};

/// One table's worth of rows collected from the source.
pub struct SourceTableSet {
    pub tables: Vec<(String, Vec<serde_json::Value>)>,
}

/// Read the full site export from a legacy Yona instance.
///
/// GET `{base_url}/sites/export` — returns raw DB table dump.
/// Requires authentication via `Authorization: Bearer {token}`.
pub fn read_site_export(base_url: &str, token: &str) -> Result<SourceTableSet> {
    let url = format!("{}/sites/export", base_url.trim_end_matches('/'));
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()?;

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Accept", "application/json")
        .send()
        .context("Failed to fetch site export from legacy Yona")?;

    if !response.status().is_success() {
        anyhow::bail!(
            "Site export request failed: HTTP {} {}",
            response.status(),
            response.status().canonical_reason().unwrap_or("unknown"),
        );
    }

    let body: serde_json::Value = response.json()?;

    let mut tables = Vec::new();
    if let Some(map) = body.as_object() {
        for (key, value) in map {
            if let Some(arr) = value.as_array() {
                tables.push((key.clone(), arr.clone()));
            }
        }
    }

    Ok(SourceTableSet { tables })
}

/// Read the project-level export from a Yona/Yoram instance.
///
/// GET `{base_url}/-_-api/v1/owners/{owner}/projects/{project}/exports` (Yona)
/// or GET `{base_url}/api/v1/owners/{owner}/projects/{project}/exports` (Yoram)
pub fn read_project_export(
    base_url: &str,
    token: &str,
    owner: &str,
    project: &str,
) -> Result<serde_json::Value> {
    let base = base_url.trim_end_matches('/');
    // Try Yoram API path first, fall back to legacy Yona path
    let paths = [
        format!("{}/api/v1/owners/{}/projects/{}/exports", base, owner, project),
        format!("{}/-_-api/v1/owners/{}/projects/{}/exports", base, owner, project),
    ];

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()?;

    let mut last_error = None;
    for url in &paths {
        match client
            .get(url)
            .header("Authorization", format!("Bearer {}", token))
            .header("Accept", "application/json")
            .send()
        {
            Ok(response) if response.status().is_success() => {
                return response.json().context("Failed to parse project export JSON");
            }
            Ok(response) => {
                last_error = Some(anyhow::anyhow!(
                    "Project export request failed: HTTP {}",
                    response.status()
                ));
            }
            Err(e) => {
                last_error = Some(e.into());
            }
        }
    }

    Err(last_error.unwrap_or_else(|| {
        anyhow::anyhow!("Failed to read project export from {}", base)
    }))
}

/// Read site or project export from a local JSON file.
pub fn read_from_file(path: &PathBuf) -> Result<serde_json::Value> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read file {}", path.display()))?;
    let value: serde_json::Value =
        serde_json::from_str(&content).context("Failed to parse JSON from file")?;
    Ok(value)
}

/// Read attachment file content as base64.
pub fn read_attachment_base64(yona_data_dir: &PathBuf, hash: &str) -> Result<String> {
    let path = yona_data_dir.join("uploads").join(hash);
    let bytes = std::fs::read(&path)
        .with_context(|| format!("Failed to read attachment file {}", path.display()))?;
    Ok(base64_encode(&bytes))
}

pub(crate) fn base64_encode(bytes: &[u8]) -> String {
    base64_simd(bytes)
}

/// Minimal base64 encoder — no external dependency.
fn base64_simd(bytes: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base64_encode() {
        assert_eq!(base64_encode(b"hello"), "aGVsbG8=");
        assert_eq!(base64_encode(b"a"), "YQ==");
        assert_eq!(base64_encode(b"abc"), "YWJj");
        assert_eq!(base64_encode(b""), "");
    }

    #[test]
    fn test_read_from_file_invalid_path() {
        let result = read_from_file(&PathBuf::from("/nonexistent/file.json"));
        assert!(result.is_err());
    }

    #[test]
    fn test_read_from_file_valid_json() {
        // Use a temp dir to avoid tempfile dependency
        let dir = std::env::temp_dir();
        let path = dir.join("yona_migrate_test_read.json");
        let _ = std::fs::remove_file(&path);
        std::fs::write(&path, r#"{"hello":"world"}"#).unwrap();
        let result = read_from_file(&path);
        let _ = std::fs::remove_file(&path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap()["hello"], "world");
    }
}