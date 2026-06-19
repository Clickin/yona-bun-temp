use axum::{
    body::Bytes,
    http::{HeaderMap, HeaderValue},
    response::{IntoResponse, Redirect, Response},
    Json,
};
use serde::Serialize;
use std::{path::Path as StdPath, process::Command, time::Duration};

use crate::server_config::configured_command_parts;
use crate::{
    legacy_content_disposition_filename, trimmed_option, PilotServiceImpl, RestRouteError,
    SiteUpdateConfig,
};

use super::rest_require_site_admin_repository;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestSiteUpdateResponse {
    current_version: String,
    error: Option<String>,
    message: String,
    release_url: Option<String>,
    version_to_update: Option<String>,
}

pub(super) async fn rest_read_site_update(
    headers: HeaderMap,
    service: PilotServiceImpl,
    site_update: SiteUpdateConfig,
) -> Result<Json<RestSiteUpdateResponse>, RestRouteError> {
    rest_require_site_admin_repository(&service, &headers, false).await?;
    Ok(Json(rest_site_update_response(&site_update)))
}

pub(crate) async fn rest_download_site_update(
    headers: HeaderMap,
    service: PilotServiceImpl,
    site_update: SiteUpdateConfig,
) -> Result<Redirect, RestRouteError> {
    rest_require_site_admin_repository(&service, &headers, false).await?;
    rest_site_update_download_redirect(&site_update)
}

pub(crate) async fn rest_download_site_update_file(
    headers: HeaderMap,
    service: PilotServiceImpl,
    site_update: SiteUpdateConfig,
) -> Result<Response, RestRouteError> {
    rest_require_site_admin_repository(&service, &headers, false).await?;
    rest_site_update_download_file_response(&site_update)
}

pub(super) fn rest_site_update_download_redirect(
    config: &SiteUpdateConfig,
) -> Result<Redirect, RestRouteError> {
    let response = rest_site_update_response(config);
    if let Some(error) = response.error {
        return Err(RestRouteError::bad_request(error));
    }
    if response.version_to_update.is_none() {
        return Err(RestRouteError::not_found("site.update.isNotNecessary"));
    }
    let release_url = response
        .release_url
        .ok_or_else(|| RestRouteError::not_found("site.update.releaseUrl.notFound"))?;
    if !site_update_release_url_is_redirectable(&release_url) {
        return Err(RestRouteError::bad_request(
            "site.update.download.invalidUrl",
        ));
    }
    Ok(Redirect::to(&release_url))
}

pub(super) fn rest_site_update_download_file_response(
    config: &SiteUpdateConfig,
) -> Result<Response, RestRouteError> {
    let response = rest_site_update_response(config);
    if let Some(error) = response.error {
        return Err(RestRouteError::bad_request(error));
    }
    if response.version_to_update.is_none() {
        return Err(RestRouteError::not_found("site.update.isNotNecessary"));
    }
    let release_url = response
        .release_url
        .ok_or_else(|| RestRouteError::not_found("site.update.releaseUrl.notFound"))?;
    let payload = site_update_download_payload(&release_url, config)?;
    let mut response = Bytes::from(payload.bytes).into_response();
    if let Ok(header_value) = HeaderValue::from_str(&payload.content_type) {
        response
            .headers_mut()
            .insert(http::header::CONTENT_TYPE, header_value);
    }
    let disposition = format!(
        "attachment; {}",
        legacy_content_disposition_filename(&payload.file_name)
    );
    if let Ok(header_value) = HeaderValue::from_str(&disposition) {
        response
            .headers_mut()
            .insert(http::header::CONTENT_DISPOSITION, header_value);
    }
    Ok(response)
}

fn rest_site_update_response(config: &SiteUpdateConfig) -> RestSiteUpdateResponse {
    let current_version = config.current_version.clone();
    let mut error = trimmed_option(Some(&config.error));
    let discovered_update = if error.is_none() {
        match site_update_metadata_from_config(config) {
            Ok(metadata) => metadata,
            Err(metadata_error) => {
                error = Some(metadata_error);
                None
            }
        }
    } else {
        None
    };
    let version_to_update = if error.is_none() {
        let configured_version = trimmed_option(Some(&config.latest_version))
            .or_else(|| trimmed_option(Some(&config.version)));
        configured_version
            .or_else(|| {
                discovered_update
                    .as_ref()
                    .map(|metadata| metadata.version.clone())
            })
            .filter(|value| !site_update_versions_equal(value, &current_version))
    } else {
        None
    };
    let release_url = version_to_update.as_ref().map(|version| {
        trimmed_option(Some(&config.release_url))
            .or_else(|| {
                discovered_update
                    .as_ref()
                    .and_then(|metadata| metadata.release_url.clone())
            })
            .unwrap_or_else(|| {
                format!("https://github.com/yona-projects/yona/releases/tag/{version}")
            })
    });
    let message = if version_to_update.is_some() {
        "site.update.isAvailable"
    } else {
        "site.update.isNotNecessary"
    }
    .to_string();

    RestSiteUpdateResponse {
        current_version,
        error,
        message,
        release_url,
        version_to_update,
    }
}

fn site_update_release_url_is_redirectable(release_url: &str) -> bool {
    let normalized = release_url.trim().to_ascii_lowercase();
    (normalized.starts_with("https://") || normalized.starts_with("http://"))
        && !release_url.chars().any(|ch| ch == '\r' || ch == '\n')
}

struct SiteUpdateDownloadPayload {
    bytes: Vec<u8>,
    content_type: String,
    file_name: String,
}

fn site_update_download_payload(
    release_url: &str,
    config: &SiteUpdateConfig,
) -> Result<SiteUpdateDownloadPayload, RestRouteError> {
    let release_url = release_url.trim();
    if let Some(path) = release_url.strip_prefix("file://") {
        let bytes = std::fs::read(path).map_err(|error| {
            RestRouteError::bad_request(format!("site.update.download.readFailed: {error}"))
        })?;
        let file_name = StdPath::new(path)
            .file_name()
            .and_then(|value| value.to_str())
            .filter(|value| !value.trim().is_empty())
            .unwrap_or("yona-update.bin")
            .to_string();
        return Ok(SiteUpdateDownloadPayload {
            bytes,
            content_type: "application/octet-stream".to_string(),
            file_name,
        });
    }
    if release_url.starts_with("http://") {
        return site_update_plain_http_get_bytes(release_url).map_err(RestRouteError::bad_request);
    }
    if release_url.starts_with("https://") {
        return site_update_https_get_bytes(release_url, config)
            .map_err(RestRouteError::bad_request);
    }
    Err(RestRouteError::bad_request(
        "site.update.download.unsupportedScheme",
    ))
}

struct SiteUpdateMetadata {
    release_url: Option<String>,
    version: String,
}

fn site_update_metadata_from_config(
    config: &SiteUpdateConfig,
) -> Result<Option<SiteUpdateMetadata>, String> {
    let Some(location) = trimmed_option(Some(&config.metadata_url))
        .or_else(|| trimmed_option(Some(&config.metadata_file)))
    else {
        return Ok(None);
    };
    let payload = site_update_metadata_payload(&location)?;
    let value: serde_json::Value = serde_json::from_str(&payload)
        .map_err(|error| format!("site.update.metadata.invalidJson: {error}"))?;
    let version = site_update_metadata_field(
        &value,
        &[
            "version",
            "latestVersion",
            "latest_version",
            "tagName",
            "tag_name",
            "name",
        ],
    )
    .ok_or_else(|| "site.update.metadata.missingVersion".to_string())?;
    let release_url = site_update_metadata_field(
        &value,
        &[
            "releaseUrl",
            "release_url",
            "htmlUrl",
            "html_url",
            "downloadUrl",
            "download_url",
        ],
    );
    Ok(Some(SiteUpdateMetadata {
        release_url,
        version,
    }))
}

fn site_update_metadata_payload(location: &str) -> Result<String, String> {
    let location = location.trim();
    if location.is_empty() {
        return Err("site.update.metadata.emptyLocation".to_string());
    }
    if let Some(path) = location.strip_prefix("file://") {
        return std::fs::read_to_string(path)
            .map_err(|error| format!("site.update.metadata.readFailed: {error}"));
    }
    if location.starts_with("http://") {
        return site_update_plain_http_get(location);
    }
    if location.contains("://") {
        return Err("site.update.metadata.unsupportedScheme".to_string());
    }
    std::fs::read_to_string(location)
        .map_err(|error| format!("site.update.metadata.readFailed: {error}"))
}

fn site_update_metadata_field(value: &serde_json::Value, names: &[&str]) -> Option<String> {
    names.iter().find_map(|name| {
        value
            .get(*name)
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToString::to_string)
    })
}

fn site_update_versions_equal(left: &str, right: &str) -> bool {
    left.trim().trim_start_matches(['v', 'V']) == right.trim().trim_start_matches(['v', 'V'])
}

struct SiteUpdatePlainHttpUrl {
    host: String,
    path: String,
    port: u16,
}

fn site_update_plain_http_get(url: &str) -> Result<String, String> {
    let payload = site_update_plain_http_get_bytes(url)?;
    String::from_utf8(payload.bytes)
        .map_err(|error| format!("site.update.metadata.invalidUtf8: {error}"))
}

fn site_update_plain_http_get_bytes(url: &str) -> Result<SiteUpdateDownloadPayload, String> {
    let parsed = site_update_parse_plain_http_url(url)?;
    let address = std::net::ToSocketAddrs::to_socket_addrs(&(parsed.host.as_str(), parsed.port))
        .map_err(|error| format!("site.update.metadata.resolveFailed: {error}"))?
        .next()
        .ok_or_else(|| "site.update.metadata.resolveFailed: no address".to_string())?;
    let mut stream = std::net::TcpStream::connect_timeout(&address, Duration::from_secs(5))
        .map_err(|error| format!("site.update.metadata.connectFailed: {error}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| format!("site.update.metadata.timeoutFailed: {error}"))?;
    stream
        .set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| format!("site.update.metadata.timeoutFailed: {error}"))?;
    let request = format!(
        "GET {} HTTP/1.1\r\nHost: {}\r\nUser-Agent: Yona-Rust-Update-Checker\r\nAccept: */*\r\nConnection: close\r\n\r\n",
        parsed.path, parsed.host
    );
    std::io::Write::write_all(&mut stream, request.as_bytes())
        .map_err(|error| format!("site.update.metadata.writeFailed: {error}"))?;
    let mut response = Vec::new();
    std::io::Read::read_to_end(&mut stream, &mut response)
        .map_err(|error| format!("site.update.metadata.readFailed: {error}"))?;
    let header_end = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .ok_or_else(|| "site.update.metadata.invalidHttpResponse".to_string())?;
    let (head, body) = response.split_at(header_end);
    let head = String::from_utf8_lossy(head);
    let status_line = head.lines().next().unwrap_or_default();
    if !status_line.contains(" 2") {
        return Err(format!(
            "site.update.metadata.httpStatus: {}",
            status_line.trim()
        ));
    }
    let body = site_update_http_body_bytes(&head, &body[4..])?;
    let content_type = head
        .lines()
        .filter_map(|line| line.split_once(':'))
        .find_map(|(name, value)| {
            name.eq_ignore_ascii_case("content-type")
                .then(|| value.trim().to_string())
        })
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "application/octet-stream".to_string());
    let file_name = parsed
        .path
        .rsplit('/')
        .next()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("yona-update.bin")
        .to_string();
    Ok(SiteUpdateDownloadPayload {
        bytes: body,
        content_type,
        file_name,
    })
}

fn site_update_https_get_bytes(
    url: &str,
    config: &SiteUpdateConfig,
) -> Result<SiteUpdateDownloadPayload, String> {
    let (program, args) = site_update_https_fetch_command(url, config)?;
    let output = Command::new(&program)
        .args(&args)
        .output()
        .map_err(|error| format!("site.update.download.httpsFetchFailed: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let reason = stderr.trim();
        return Err(if reason.is_empty() {
            format!(
                "site.update.download.httpsFetchFailed: exit status {}",
                output.status
            )
        } else {
            format!("site.update.download.httpsFetchFailed: {reason}")
        });
    }
    site_update_payload_from_http_response_bytes(url, &output.stdout)
}

pub(crate) fn site_update_https_fetch_command(
    url: &str,
    config: &SiteUpdateConfig,
) -> Result<(String, Vec<String>), String> {
    let configured = trimmed_option(Some(&config.https_fetch_command));
    if let Some(configured) = configured {
        let (program, mut args) =
            configured_command_parts(&configured, "site.update.download.httpsFetchCommandEmpty")?;
        args.push(url.to_string());
        return Ok((program, args));
    }
    Ok((
        "curl".to_string(),
        [
            "--fail",
            "--location",
            "--silent",
            "--show-error",
            "--max-time",
            "30",
            "--dump-header",
            "-",
            "--output",
            "-",
            url,
        ]
        .into_iter()
        .map(ToString::to_string)
        .collect(),
    ))
}

fn site_update_payload_from_http_response_bytes(
    url: &str,
    response: &[u8],
) -> Result<SiteUpdateDownloadPayload, String> {
    let header_end = response
        .windows(4)
        .rposition(|window| window == b"\r\n\r\n")
        .ok_or_else(|| "site.update.metadata.invalidHttpResponse".to_string())?;
    let (head, body) = response.split_at(header_end);
    let head = String::from_utf8_lossy(head);
    let status_line = head
        .lines()
        .filter(|line| line.starts_with("HTTP/"))
        .next_back()
        .unwrap_or_default();
    if !status_line.contains(" 2") {
        return Err(format!(
            "site.update.metadata.httpStatus: {}",
            status_line.trim()
        ));
    }
    let body = site_update_http_body_bytes(&head, &body[4..])?;
    let content_type = head
        .lines()
        .filter_map(|line| line.split_once(':'))
        .rev()
        .find_map(|(name, value)| {
            name.eq_ignore_ascii_case("content-type")
                .then(|| value.trim().to_string())
        })
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "application/octet-stream".to_string());
    let file_name = url
        .split('?')
        .next()
        .unwrap_or(url)
        .rsplit('/')
        .next()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("yona-update.bin")
        .to_string();
    Ok(SiteUpdateDownloadPayload {
        bytes: body,
        content_type,
        file_name,
    })
}

fn site_update_http_body_bytes(head: &str, body: &[u8]) -> Result<Vec<u8>, String> {
    if head
        .lines()
        .filter_map(|line| line.split_once(':'))
        .any(|(name, value)| {
            name.eq_ignore_ascii_case("transfer-encoding")
                && value
                    .split(',')
                    .any(|encoding| encoding.trim().eq_ignore_ascii_case("chunked"))
        })
    {
        return site_update_decode_chunked_body(body);
    }
    Ok(body.to_vec())
}

fn site_update_decode_chunked_body(body: &[u8]) -> Result<Vec<u8>, String> {
    let mut offset = 0;
    let mut decoded = Vec::new();
    loop {
        let size_end = body[offset..]
            .windows(2)
            .position(|window| window == b"\r\n")
            .map(|position| offset + position)
            .ok_or_else(|| "site.update.metadata.invalidChunkedResponse".to_string())?;
        let size_line = std::str::from_utf8(&body[offset..size_end])
            .map_err(|error| format!("site.update.metadata.invalidChunkedResponse: {error}"))?;
        let size_hex = size_line
            .split_once(';')
            .map(|(size, _)| size)
            .unwrap_or(size_line)
            .trim();
        let size = usize::from_str_radix(size_hex, 16)
            .map_err(|_| "site.update.metadata.invalidChunkedResponse".to_string())?;
        offset = size_end + 2;
        if size == 0 {
            return Ok(decoded);
        }
        let chunk_end = offset
            .checked_add(size)
            .ok_or_else(|| "site.update.metadata.invalidChunkedResponse".to_string())?;
        if chunk_end + 2 > body.len() || &body[chunk_end..chunk_end + 2] != b"\r\n" {
            return Err("site.update.metadata.invalidChunkedResponse".to_string());
        }
        decoded.extend_from_slice(&body[offset..chunk_end]);
        offset = chunk_end + 2;
    }
}

fn site_update_parse_plain_http_url(url: &str) -> Result<SiteUpdatePlainHttpUrl, String> {
    let without_scheme = url
        .strip_prefix("http://")
        .ok_or_else(|| "site.update.metadata.unsupportedScheme".to_string())?;
    let (authority, raw_path) = without_scheme
        .split_once('/')
        .unwrap_or((without_scheme, ""));
    if authority.is_empty() || authority.contains('@') {
        return Err("site.update.metadata.invalidHost".to_string());
    }
    let (host, port) = if let Some((host, port)) = authority.rsplit_once(':') {
        let port = port
            .parse::<u16>()
            .map_err(|_| "site.update.metadata.invalidPort".to_string())?;
        (host.to_string(), port)
    } else {
        (authority.to_string(), 80)
    };
    if host.trim().is_empty() {
        return Err("site.update.metadata.invalidHost".to_string());
    }
    let path = if raw_path.is_empty() {
        "/".to_string()
    } else {
        format!("/{raw_path}")
    };
    Ok(SiteUpdatePlainHttpUrl { host, path, port })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn site_update_https_fetch_command_preserves_quoted_override() {
        let config = SiteUpdateConfig {
            https_fetch_command: r#""/opt/Yona Tools/fetch update" --header "X-Test: yes""#
                .to_string(),
            ..SiteUpdateConfig::default()
        };
        let (program, args) =
            site_update_https_fetch_command("https://downloads.example/yona.zip", &config)
                .expect("fetch command");
        assert_eq!(program, "/opt/Yona Tools/fetch update");
        assert_eq!(
            args,
            vec![
                "--header".to_string(),
                "X-Test: yes".to_string(),
                "https://downloads.example/yona.zip".to_string(),
            ]
        );
    }
}
