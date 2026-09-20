/// FROM sources — reads from a running legacy Yona or Yoram instance via REST API.
use std::collections::HashMap;
use std::path::PathBuf;

use anyhow::{Context as _, Result};

/// Legacy Yona external-API surface recognized by this tool.
///
/// - `GET /sites/export`                 — full DB table dump; session (site manager) only.
/// - `GET /-_-api/v1/owners/{owner}/projects/{project}/exports`
///                                       — project export; PAT (`Authorization: token <pat>`).
/// - `GET /-_-api/v1/admin/users`        — user list; PAT.
/// - `POST /-_-api/v1/users/token`       — PAT creation.
/// - `GET /migration/{owner}/projects/{project}/{labels,issuelabel,milestones,issues,posts}`
///                                       — legacy migration helpers; session.
///
/// Legacy authentication is a personal access token sent as
/// `Authorization: token <pat>` + `Yona-Token: <pat>` (the legacy `UserApi`
/// parses `Authorization.split("token")[1]`, so `Bearer` fails). The new
/// Rust app accepts `Authorization: Bearer <token>`.
#[allow(dead_code)]
pub fn describe_legacy_routes() -> &'static str {
    "GET /sites/export\n\
     GET /-_-api/v1/owners/{owner}/projects/{project}/exports\n\
     GET /-_-api/v1/admin/users\n\
     POST /-_-api/v1/users/token\n\
     GET /migration/{owner}/projects/{project}/{labels,issuelabel,milestones,issues,posts}"
}

/// Legacy-side authentication: PAT (`token` prefix) or a session cookie.
#[derive(Clone, Debug)]
pub enum FromAuth {
    /// Personal access token (`Authorization: token <pat>`, `Yona-Token`).
    Token(String),
    /// Session cookie (site-manager session copied from the browser).
    Cookie(String),
}

/// Legacy request headers (PAT convention).
pub fn legacy_auth_headers(auth: &FromAuth) -> Vec<(&'static str, String)> {
    match auth {
        FromAuth::Token(token) => vec![
            ("Authorization", format!("token {}", token)),
            ("Yona-Token", token.to_owned()),
        ],
        FromAuth::Cookie(cookie) => vec![("Cookie", cookie.to_owned())],
    }
}

/// New-app (Yoram) request headers.
pub fn yoram_auth_headers(token: &str) -> Vec<(&'static str, String)> {
    vec![("Authorization", format!("Bearer {}", token))]
}

/// One table's worth of rows collected from the source.
pub struct SourceTableSet {
    pub tables: Vec<(String, Vec<serde_json::Value>)>,
}

/// Read the full site export from a legacy Yona instance.
///
/// GET `{base_url}/sites/export` — returns raw DB table dump.
pub fn read_site_export(base_url: &str, auth: &FromAuth) -> Result<SourceTableSet> {
    let url = format!("{}/sites/export", base_url.trim_end_matches('/'));
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;

    let mut req = client.get(&url).header("Accept", "application/json");
    for (k, v) in legacy_auth_headers(auth) {
        req = req.header(k, &v);
    }

    let response = req
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

/// Read the project-level export from a legacy Yona instance.
///
/// GET `{base_url}/-_-api/v1/owners/{owner}/projects/{project}/exports` (legacy PAT)
pub fn read_project_export(
    base_url: &str,
    auth: &FromAuth,
    owner: &str,
    project: &str,
) -> Result<serde_json::Value> {
    let base = base_url.trim_end_matches('/');
    let paths = [
        format!(
            "{}/-_-api/v1/owners/{}/projects/{}/exports",
            base, owner, project
        ),
        format!(
            "{}/api/v1/owners/{}/projects/{}/exports",
            base, owner, project
        ),
    ];

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()?;

    let mut last_error = None;
    for url in &paths {
        let mut req = client.get(url).header("Accept", "application/json");
        for (k, v) in legacy_auth_headers(auth) {
            req = req.header(k, &v);
        }

        match req.send() {
            Ok(response) if response.status().is_success() => {
                return response
                    .json()
                    .context("Failed to parse project export JSON");
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

    Err(last_error
        .unwrap_or_else(|| anyhow::anyhow!("Failed to read project export from {}", base)))
}

/// Read site or project export from a local JSON file.
/// Read the site export from a running Yoram instance (Yoram→Yoram).
///
/// GET `{base_url}/api/v1/site/export` with `Authorization: Bearer <token>`.
/// The response is already in the site-import payload shape (format
/// "yobi-data", camelCase, id-bearing items), so it feeds the target import
/// without the legacy table transform.
pub fn read_yoram_site_export(base_url: &str, token: &str) -> Result<serde_json::Value> {
    let url = format!("{}/api/v1/site/export", base_url.trim_end_matches('/'));
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .bearer_auth(token)
        .send()
        .context("Failed to fetch site export from Yoram")?;
    if !response.status().is_success() {
        anyhow::bail!(
            "Site export request failed: HTTP {} {}",
            response.status(),
            response.status().canonical_reason().unwrap_or("unknown"),
        );
    }
    response.json().context("Failed to parse Yoram site export")
}

/// Fetch one attachment's bytes from the source Yoram instance.
///
/// GET `{base_url}/files/{id}` with Bearer auth — the app serves attachment
/// bytes over HTTP regardless of its storage backend (local partition, S3,
/// ...), which is what keeps the migrator backend-agnostic.
pub fn fetch_attachment_bytes(base_url: &str, token: &str, attachment_id: i64) -> Result<Vec<u8>> {
    let url = format!(
        "{}/files/{}?download=1",
        base_url.trim_end_matches('/'),
        attachment_id
    );
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;
    let response = client
        .get(&url)
        .bearer_auth(token)
        .send()
        .context("Failed to fetch attachment from source")?;
    if !response.status().is_success() {
        anyhow::bail!(
            "Attachment {} fetch failed: HTTP {}",
            attachment_id,
            response.status()
        );
    }
    Ok(response.bytes()?.to_vec())
}

/// Read the project-level NDJSON export from a running Yoram instance
/// (Yoram→Yoram). The new app's `GET /api/v1/owners/{owner}/projects/
/// {project}/exports` streams the same NDJSON the import route consumes, so
/// the migrator passes the lines through to the target unchanged.
pub fn read_yoram_project_export(
    base_url: &str,
    token: &str,
    owner: &str,
    project: &str,
) -> Result<Vec<String>> {
    let url = format!(
        "{}/api/v1/owners/{}/projects/{}/exports",
        base_url.trim_end_matches('/'),
        owner,
        project,
    );
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;
    let response = client
        .get(&url)
        .header("Accept", "application/x-ndjson")
        .bearer_auth(token)
        .send()
        .context("Failed to fetch project export from Yoram")?;
    if !response.status().is_success() {
        anyhow::bail!(
            "Project export request failed: HTTP {} {}",
            response.status(),
            response.status().canonical_reason().unwrap_or("unknown"),
        );
    }
    let body = response
        .text()
        .context("Failed to read project export body")?;
    let lines = body
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    if lines.is_empty() {
        anyhow::bail!("Project export returned no NDJSON lines");
    }
    Ok(lines)
}

pub fn read_from_file(path: &PathBuf) -> Result<serde_json::Value> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read file {}", path.display()))?;
    let value: serde_json::Value =
        serde_json::from_str(&content).context("Failed to parse JSON from file")?;
    Ok(value)
}

/// Table catalog for the direct-DB source: dump key, physical table, columns.
/// Columns mirror the legacy `/sites/export` exchanger selects exactly
/// (including value types), so the transform sees byte-identical rows to a
/// `--from-file` dump produced by `extract_legacy_slice.py`.
const DB_TABLES: &[(&str, &str, &[&str])] = &[
    (
        "N4USER",
        "n4user",
        &[
            "id",
            "name",
            "login_id",
            "password",
            "password_salt",
            "email",
            "remember_me",
            "created_date",
            "state",
            "last_state_modified_date",
            "lang",
        ],
    ),
    ("SITE_ADMIN", "site_admin", &["id", "admin_id"]),
    ("ROLE", "role", &["id", "name", "active"]),
    (
        "ORGANIZATION",
        "organization",
        &["id", "name", "descr", "created"],
    ),
    (
        "ORGANIZATION_USER",
        "organization_user",
        &["id", "user_id", "organization_id", "role_id"],
    ),
    (
        "PROJECT",
        "project",
        &[
            "id",
            "name",
            "overview",
            "vcs",
            "siteurl",
            "owner",
            "created_date",
            "last_issue_number",
            "last_posting_number",
            "original_project_id",
            "last_pushed_date",
            "is_using_reviewer_count",
            "default_reviewer_count",
            "organization_id",
            "project_scope",
        ],
    ),
    (
        "PROJECT_USER",
        "project_user",
        &["id", "user_id", "project_id", "role_id"],
    ),
    ("ASSIGNEE", "assignee", &["id", "user_id", "project_id"]),
    (
        "ISSUE_LABEL_CATEGORY",
        "issue_label_category",
        &["id", "project_id", "name", "is_exclusive"],
    ),
    (
        "ISSUE_LABEL",
        "issue_label",
        &["id", "color", "name", "project_id", "category_id"],
    ),
    (
        "MILESTONE",
        "milestone",
        &["id", "title", "due_date", "contents", "state", "project_id"],
    ),
    (
        "ISSUE",
        "issue",
        &[
            "id",
            "title",
            "body",
            "created_date",
            "num_of_comments",
            "milestone_id",
            "author_id",
            "author_login_id",
            "author_name",
            "state",
            "project_id",
            "assignee_id",
            "number",
            "updated_date",
            "due_date",
        ],
    ),
    (
        "ISSUE_ISSUE_LABEL",
        "issue_issue_label",
        &["issue_id", "issue_label_id"],
    ),
    (
        "ISSUE_COMMENT",
        "issue_comment",
        &[
            "id",
            "created_date",
            "author_id",
            "author_login_id",
            "author_name",
            "issue_id",
            "contents",
        ],
    ),
    (
        "POSTING",
        "posting",
        &[
            "id",
            "title",
            "body",
            "created_date",
            "num_of_comments",
            "author_id",
            "author_login_id",
            "author_name",
            "project_id",
            "number",
            "notice",
            "updated_date",
            "readme",
        ],
    ),
    (
        "POSTING_COMMENT",
        "posting_comment",
        &[
            "id",
            "created_date",
            "author_id",
            "author_login_id",
            "author_name",
            "posting_id",
            "contents",
        ],
    ),
    (
        "ATTACHMENT",
        "attachment",
        &[
            "id",
            "name",
            "hash",
            "container_type",
            "mime_type",
            "size",
            "container_id",
            "created_date",
        ],
    ),
    (
        "PULL_REQUEST",
        "pull_request",
        &[
            "id",
            "title",
            "body",
            "to_project_id",
            "from_project_id",
            "to_branch",
            "from_branch",
            "contributor_id",
            "receiver_id",
            "created",
            "updated",
            "received",
            "state",
            "last_commit_id",
            "merged_commit_id_from",
            "merged_commit_id_to",
            "number",
            "is_conflict",
            "is_merging",
        ],
    ),
    (
        "PULL_REQUEST_EVENT",
        "pull_request_event",
        &[
            "id",
            "pull_request_id",
            "created",
            "sender_login_id",
            "event_type",
            "new_value",
            "old_value",
        ],
    ),
];

/// TINYINT(1) columns the extractor emits as JSON booleans; every other
/// integer column is emitted as a JSON number (parity with the Python dump).
const BOOL_COLUMNS: &[&str] = &["is_exclusive", "is_conflict", "is_merging"];

/// Read the full site dump from a legacy H2 database (an official Yona
/// backend) via the H2 jar's JDBC Shell + `CSVWRITE`, producing the same
/// table JSON the MariaDB path emits. Requires `java` and the H2 jar on the
/// host (both ship with every Yona distribution). The tool is expected to run
/// on the legacy server, matching the direct-data-partition architecture.
pub fn read_from_h2(h2_url: &str, h2_jar: &PathBuf) -> Result<serde_json::Value> {
    let work_dir = std::env::temp_dir().join(format!("yona-migrate-h2-{}", std::process::id()));
    std::fs::create_dir_all(&work_dir).context("failed to create H2 work dir")?;

    let mut object = serde_json::Map::new();
    for (key, table, columns) in DB_TABLES {
        let types_csv = work_dir.join(format!("types-{table}.csv"));
        let data_csv = work_dir.join(format!("data-{table}.csv"));
        let type_sql = format!(
            "CALL CSVWRITE('{}', 'SELECT COLUMN_NAME, TYPE_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ''{}''');",
            types_csv.display(),
            table.to_ascii_uppercase()
        );
        if run_h2_shell(h2_jar, h2_url, &type_sql).is_err() {
            eprintln!("H2: table `{table}` not readable, skipping");
            object.insert((*key).to_string(), serde_json::Value::Array(Vec::new()));
            continue;
        }
        let mut column_types: HashMap<String, String> = HashMap::new();
        for row in parse_h2_csv(&types_csv)? {
            if row.len() >= 2 {
                column_types.insert(row[0].clone(), row[1].to_ascii_uppercase());
            }
        }
        let column_list = columns
            .iter()
            .map(|column| format!("`{column}`"))
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!("SELECT {column_list} FROM `{table}`");
        let data_sql = format!(
            "CALL CSVWRITE('{}', '{}');",
            data_csv.display(),
            sql.replace('\'', "''")
        );
        if run_h2_shell(h2_jar, h2_url, &data_sql).is_err() {
            eprintln!("H2: table `{table}` not readable, skipping");
            object.insert((*key).to_string(), serde_json::Value::Array(Vec::new()));
            continue;
        }
        let mut values = Vec::new();
        for row in parse_h2_csv(&data_csv)? {
            let mut value = serde_json::Map::new();
            for (index, column) in columns.iter().enumerate() {
                let raw = row.get(index).cloned().unwrap_or_default();
                value.insert(
                    (*column).to_string(),
                    h2_cell_to_json(column, &raw, column_types.get(&column.to_ascii_uppercase())),
                );
            }
            values.push(serde_json::Value::Object(value));
        }
        object.insert((*key).to_string(), serde_json::Value::Array(values));
    }
    let _ = std::fs::remove_dir_all(&work_dir);
    Ok(serde_json::Value::Object(object))
}

/// Run one H2 Shell batch; `-sql` accepts multiple statements separated by
/// newlines.
fn run_h2_shell(h2_jar: &PathBuf, h2_url: &str, statements: &str) -> Result<()> {
    let output = std::process::Command::new("java")
        .args([
            "-cp",
            h2_jar.to_str().context("H2 jar path is not UTF-8")?,
            "org.h2.tools.Shell",
            "-url",
            h2_url,
            "-user",
            "sa",
            "-password",
            "",
            "-sql",
            statements,
        ])
        .output()
        .context("failed to spawn java (H2 Shell) — is java on PATH?")?;
    if !output.status.success() {
        anyhow::bail!(
            "H2 Shell failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        );
    }
    Ok(())
}

/// Parse CSVWRITE output: header row + quoted fields, doubled quotes and
/// embedded commas/newlines inside quotes.
fn parse_h2_csv(path: &PathBuf) -> Result<Vec<Vec<String>>> {
    let content = match std::fs::read_to_string(path) {
        Ok(content) => content,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => {
            return Err(error).context("failed to read H2 CSV");
        }
    };
    let mut rows = Vec::new();
    let mut fields = Vec::new();
    let mut field = String::new();
    let mut in_quotes = false;
    let mut chars = content.chars().peekable();
    while let Some(character) = chars.next() {
        match character {
            '"' if in_quotes => {
                if chars.peek() == Some(&'"') {
                    chars.next();
                    field.push('"');
                } else {
                    in_quotes = false;
                }
            }
            '"' => in_quotes = true,
            ',' if !in_quotes => {
                fields.push(std::mem::take(&mut field));
            }
            '\n' if !in_quotes => {
                fields.push(std::mem::take(&mut field));
                rows.push(std::mem::take(&mut fields));
            }
            _ => field.push(character),
        }
    }
    if !field.is_empty() || !fields.is_empty() {
        fields.push(field);
        rows.push(fields);
    }
    if rows.len() > 1 {
        rows.remove(0); // header
    } else {
        rows.clear();
    }
    Ok(rows)
}

/// Map an H2 CSV cell to the JSON value type the legacy dump uses, driven by
/// the information_schema data type. Field-name overrides keep parity with
/// the MariaDB extractor (which emits `notice`/`readme`/`active` as JSON
/// numbers even though H2 stores them as BOOLEAN).
fn h2_cell_to_json(column: &str, raw: &str, data_type: Option<&String>) -> serde_json::Value {
    use chrono::TimeZone as _;

    let data_type = data_type.map(|value| value.as_str()).unwrap_or("VARCHAR");
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return serde_json::Value::Null;
    }
    if BOOL_COLUMNS.contains(&column) {
        return serde_json::Value::Bool(trimmed.eq_ignore_ascii_case("true"));
    }
    if INT_FIELDS.contains(&column) {
        return trimmed
            .parse::<i64>()
            .map(|value| serde_json::Value::Number(value.into()))
            .unwrap_or(serde_json::Value::Null);
    }
    if data_type.contains("INT") || data_type == "SMALLINT" || data_type == "TINYINT" {
        if let Ok(value) = trimmed.parse::<i64>() {
            return serde_json::Value::Number(value.into());
        }
        return serde_json::Value::Null;
    }
    if data_type == "BOOLEAN" || data_type == "BIT" {
        return serde_json::Value::Bool(trimmed.eq_ignore_ascii_case("true"));
    }
    if data_type.contains("TIMESTAMP") || data_type == "DATE" || data_type == "DATETIME" {
        let text = trimmed.trim_end_matches(".0");
        let millis = chrono::NaiveDateTime::parse_from_str(text, "%Y-%m-%d %H:%M:%S")
            .or_else(|_| {
                chrono::NaiveDate::parse_from_str(text, "%Y-%m-%d")
                    .map(|date| date.and_hms_opt(0, 0, 0).expect("midnight datetime"))
            })
            .ok()
            .and_then(|datetime| chrono::Local.from_local_datetime(&datetime).single())
            .map(|value| value.timestamp_millis())
            .unwrap_or(0);
        return serde_json::Value::Number(millis.into());
    }
    serde_json::Value::String(trimmed.to_string())
}

/// Integer-typed legacy fields (JSON numbers regardless of the H2 column
/// type), mirroring the MariaDB extractor.
const INT_FIELDS: &[&str] = &[
    "active",
    "default_reviewer_count",
    "is_using_reviewer_count",
    "notice",
    "readme",
    "remember_me",
];

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
    fn test_legacy_auth_headers_use_token_prefix_not_bearer() {
        let headers = legacy_auth_headers(&FromAuth::Token("pat-123".to_string()));
        let authorization = headers
            .iter()
            .find(|(name, _)| *name == "Authorization")
            .unwrap()
            .1
            .clone();
        assert!(authorization.starts_with("token "), "got {authorization}");
        assert!(!authorization.starts_with("Bearer"), "got {authorization}");
        let yona_token = headers
            .iter()
            .find(|(name, _)| *name == "Yona-Token")
            .unwrap()
            .1
            .clone();
        assert_eq!(yona_token, "pat-123");
    }

    #[test]
    fn test_cookie_auth_header() {
        let headers = legacy_auth_headers(&FromAuth::Cookie("PLAY_SESSION=abc".to_string()));
        assert_eq!(headers, vec![("Cookie", "PLAY_SESSION=abc".to_string())]);
    }

    #[test]
    fn test_yoram_auth_headers_use_bearer() {
        let headers = yoram_auth_headers("tok");
        assert_eq!(headers, vec![("Authorization", "Bearer tok".to_string())]);
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
