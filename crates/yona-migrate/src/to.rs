/// TO targets — writes transformed data to a running Yoram instance or to stdout/file.
use std::path::PathBuf;

use anyhow::{Context as _, Result};

/// Write a full site import payload to a Yoram instance.
///
/// POST {base_url}/api/v1/site/import
pub fn write_site_import(
    base_url: &str,
    token: &str,
    payload: &serde_json::Value,
) -> Result<serde_json::Value> {
    let url = format!("{}/api/v1/site/import", base_url.trim_end_matches('/'));
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(payload)
        .send()
        .context("Failed to send site import request")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_default();
        anyhow::bail!(
            "Site import request failed: HTTP {} — {}",
            status,
            body,
        );
    }

    response.json().context("Failed to parse site import response")
}

/// Write data to a JSON file (streaming).
pub fn write_to_file(path: &PathBuf, payload: &serde_json::Value) -> Result<()> {
    let file = std::fs::File::create(path)
        .with_context(|| format!("Failed to create output file {}", path.display()))?;
    serde_json::to_writer_pretty(file, payload)
        .with_context(|| format!("Failed to write JSON to {}", path.display()))?;
    Ok(())
}

/// Write data to stdout (streaming).
pub fn write_to_stdout(payload: &serde_json::Value) -> Result<()> {
    serde_json::to_writer_pretty(std::io::stdout().lock(), payload)
        .context("Failed to write JSON to stdout")?;
    println!();
    Ok(())
}

/// Import a single project-level export into a Yoram instance.
pub fn write_project_import(
    base_url: &str,
    token: &str,
    owner: &str,
    project: &str,
    payload: &serde_json::Value,
) -> Result<serde_json::Value> {
    let url = format!(
        "{}/api/v1/owners/{}/projects/{}/imports",
        base_url.trim_end_matches('/'),
        owner,
        project,
    );

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()?;

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(payload)
        .send()
        .context("Failed to send project import request")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_default();
        anyhow::bail!(
            "Project import request failed: HTTP {} — {}",
            status,
            body,
        );
    }

    response.json().context("Failed to parse project import response")
}

// ponytail: attachment upload via multipart deferred — use the import endpoint for now

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_write_to_file_roundtrip() {
        let dir = std::env::temp_dir();
        let path = dir.join("yona_migrate_test_write.json");
        let _ = std::fs::remove_file(&path);
        let payload = serde_json::json!({"hello": "world"});
        write_to_file(&path, &payload).unwrap();
        let content = std::fs::read_to_string(&path).unwrap();
        let _ = std::fs::remove_file(&path);
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed["hello"], "world");
    }
}