/// FROM sources — reads from a running legacy Yona or Yoram instance via REST API.
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

    let response = req.send().context("Failed to fetch site export from legacy Yona")?;

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
        format!("{}/-_-api/v1/owners/{}/projects/{}/exports", base, owner, project),
        format!("{}/api/v1/owners/{}/projects/{}/exports", base, owner, project),
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

/// Table catalog for the direct-DB source: dump key, physical table, columns.
/// Columns mirror the legacy `/sites/export` exchanger selects exactly
/// (including value types), so the transform sees byte-identical rows to a
/// `--from-file` dump produced by `extract_legacy_slice.py`.
const DB_TABLES: &[(&str, &str, &[&str])] = &[
    (
        "N4USER",
        "n4user",
        &[
            "id", "name", "login_id", "password", "password_salt", "email", "remember_me",
            "created_date", "state", "last_state_modified_date", "lang",
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
            "id", "name", "overview", "vcs", "siteurl", "owner", "created_date",
            "last_issue_number", "last_posting_number", "original_project_id", "last_pushed_date",
            "is_using_reviewer_count", "default_reviewer_count", "organization_id", "project_scope",
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
            "id", "title", "body", "created_date", "num_of_comments", "milestone_id", "author_id",
            "author_login_id", "author_name", "state", "project_id", "assignee_id", "number",
            "updated_date", "due_date",
        ],
    ),
    ("ISSUE_ISSUE_LABEL", "issue_issue_label", &["issue_id", "issue_label_id"]),
    (
        "ISSUE_COMMENT",
        "issue_comment",
        &[
            "id", "created_date", "author_id", "author_login_id", "author_name", "issue_id",
            "contents",
        ],
    ),
    (
        "POSTING",
        "posting",
        &[
            "id", "title", "body", "created_date", "num_of_comments", "author_id",
            "author_login_id", "author_name", "project_id", "number", "notice", "updated_date",
            "readme",
        ],
    ),
    (
        "POSTING_COMMENT",
        "posting_comment",
        &[
            "id", "created_date", "author_id", "author_login_id", "author_name", "posting_id",
            "contents",
        ],
    ),
    (
        "ATTACHMENT",
        "attachment",
        &[
            "id", "name", "hash", "container_type", "mime_type", "size", "container_id",
            "created_date",
        ],
    ),
    (
        "PULL_REQUEST",
        "pull_request",
        &[
            "id", "title", "body", "to_project_id", "from_project_id", "to_branch", "from_branch",
            "contributor_id", "receiver_id", "created", "updated", "received", "state",
            "last_commit_id", "merged_commit_id_from", "merged_commit_id_to", "number",
            "is_conflict", "is_merging",
        ],
    ),
    (
        "PULL_REQUEST_EVENT",
        "pull_request_event",
        &[
            "id", "pull_request_id", "created", "sender_login_id", "event_type", "new_value",
            "old_value",
        ],
    ),
];

/// TINYINT(1) columns the extractor emits as JSON booleans; every other
/// integer column is emitted as a JSON number (parity with the Python dump).
const BOOL_COLUMNS: &[&str] = &["is_exclusive", "is_conflict", "is_merging"];

/// Read the full site dump directly from the legacy MySQL/MariaDB database.
///
/// `url` is a `mysql://user:password@host:port/database` connection string.
/// This bypasses the legacy HTTP export surface entirely (the legacy
/// `/sites/export` exchanger dies on case-sensitive MariaDB schemas — see
/// the `ASSIGNEE` vs `assignee` mismatch), so it is the preferred production
/// source. Attachment bytes are still read from the filesystem via
/// `--yona-data-dir` and repos via `--from-repo-dir`.
pub fn read_from_db(url: &str) -> Result<serde_json::Value> {
    use sqlx::Connection as _;
    use sqlx::Row as _;

    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .context("Failed to build tokio runtime")?;
    runtime.block_on(async move {
        let mut connection = sqlx::MySqlConnection::connect(url)
            .await
            .context("Failed to connect to MySQL/MariaDB")?;
        let mut object = serde_json::Map::new();
        for (key, table, columns) in DB_TABLES {
            let column_list = columns
                .iter()
                .map(|column| format!("`{column}`"))
                .collect::<Vec<_>>()
                .join(", ");
            let sql = format!("SELECT {column_list} FROM `{table}`");
            let rows = sqlx::query(&sql)
                .fetch_all(&mut connection)
                .await
                .with_context(|| format!("Failed to read table `{table}`"))?;
            let mut values = Vec::with_capacity(rows.len());
            for row in rows {
                let mut value = serde_json::Map::new();
                for (index, column) in columns.iter().enumerate() {
                    value.insert(
                        (*column).to_string(),
                        db_cell_to_json(&row, index, column)?,
                    );
                }
                values.push(serde_json::Value::Object(value));
            }
            object.insert((*key).to_string(), serde_json::Value::Array(values));
        }
        Ok(serde_json::Value::Object(object))
    })
}

/// Map one MySQL cell to the JSON value type the legacy dump uses.
fn db_cell_to_json(
    row: &sqlx::mysql::MySqlRow,
    index: usize,
    column: &str,
) -> Result<serde_json::Value> {
    use chrono::TimeZone as _;
    use sqlx::Row as _;
    use sqlx::TypeInfo as _;
    use sqlx::ValueRef as _;

    let raw = row.try_get_raw(index)?;
    if raw.is_null() {
        return Ok(serde_json::Value::Null);
    }
    let type_name = raw.type_info().name().to_ascii_uppercase();
    if type_name.starts_with("TINYINT")
        || type_name.starts_with("SMALLINT")
        || type_name.starts_with("MEDIUMINT")
        || type_name.starts_with("INT")
        || type_name.starts_with("BIGINT")
        || type_name == "YEAR"
        || type_name == "BOOLEAN"
    {
        let value = row
            .try_get::<Option<i64>, _>(index)
            .map_err(|error| anyhow::anyhow!("{column}: {error}"))?
            .unwrap_or(0);
        if BOOL_COLUMNS.contains(&column) {
            return Ok(serde_json::Value::Bool(value != 0));
        }
        return Ok(serde_json::Value::Number(value.into()));
    }
    if type_name.starts_with("DATETIME") || type_name.starts_with("TIMESTAMP") {
        let datetime = row
            .try_get::<Option<chrono::NaiveDateTime>, _>(index)
            .map_err(|error| anyhow::anyhow!("{column}: {error}"))?;
        let millis = datetime
            .and_then(|value| chrono::Local.from_local_datetime(&value).single())
            .map(|value| value.timestamp_millis())
            .unwrap_or(0);
        return Ok(serde_json::Value::Number(millis.into()));
    }
    if type_name == "DATE" {
        // The extractor parsed DATE columns as local midnight epoch millis.
        let date = row
            .try_get::<Option<chrono::NaiveDate>, _>(index)
            .map_err(|error| anyhow::anyhow!("{column}: {error}"))?;
        let millis = date
            .and_then(|value| value.and_hms_opt(0, 0, 0))
            .and_then(|datetime| chrono::Local.from_local_datetime(&datetime).single())
            .map(|value| value.timestamp_millis())
            .unwrap_or(0);
        return Ok(serde_json::Value::Number(millis.into()));
    }
    if type_name.starts_with("FLOAT")
        || type_name.starts_with("DOUBLE")
        || type_name.starts_with("DECIMAL")
    {
        let value = row
            .try_get::<Option<f64>, _>(index)
            .map_err(|error| anyhow::anyhow!("{column}: {error}"))?
            .unwrap_or(0.0);
        if let Some(number) = serde_json::Number::from_f64(value) {
            return Ok(serde_json::Value::Number(number));
        }
        return Ok(serde_json::Value::Null);
    }
    // Text / varchar / char / blob columns.
    match row.try_get::<Option<String>, _>(index) {
        Ok(Some(text)) => Ok(serde_json::Value::String(text)),
        _ => {
            let bytes = row
                .try_get::<Option<Vec<u8>>, _>(index)
                .map_err(|error| anyhow::anyhow!("{column}: {error}"))?;
            Ok(bytes
                .map(|value| serde_json::Value::String(String::from_utf8_lossy(&value).into_owned()))
                .unwrap_or(serde_json::Value::Null))
        }
    }
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
