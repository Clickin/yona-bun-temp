use std::path::PathBuf;

use axum::response::{IntoResponse, Response};
use http::Method;

use crate::{embedded_assets, BrowserRuntimeConfig};

pub(crate) async fn serve_filesystem_asset(
    asset_root: PathBuf,
    requested_path: &str,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    let Some(relative_path) = sanitize_relative_path(requested_path) else {
        return (axum::http::StatusCode::NOT_FOUND, "not found").into_response();
    };
    let file_path = asset_root.join("assets").join(relative_path);
    let Ok(bytes) = tokio::fs::read(&file_path).await else {
        return serve_index_html(asset_root, browser_runtime).await;
    };

    let mime = mime_guess::from_path(&file_path).first_or_octet_stream();
    ([(axum::http::header::CONTENT_TYPE, mime.as_ref())], bytes).into_response()
}

pub(crate) async fn serve_embedded_asset(
    requested_path: &str,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    let Some(relative_path) = sanitize_relative_path(requested_path) else {
        return (axum::http::StatusCode::NOT_FOUND, "not found").into_response();
    };
    let normalized = relative_path.to_string_lossy().replace('\\', "/");
    let Some(bytes) = embedded_assets::get(&format!("assets/{normalized}")) else {
        return serve_embedded_index_html(browser_runtime).await;
    };

    let mime = mime_guess::from_path(&normalized).first_or_octet_stream();
    (
        [(axum::http::header::CONTENT_TYPE, mime.as_ref())],
        bytes.to_vec(),
    )
        .into_response()
}

pub(crate) async fn serve_filesystem_fallback(
    asset_root: PathBuf,
    method: Method,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    if method != Method::GET && method != Method::HEAD {
        return axum::http::StatusCode::NOT_FOUND.into_response();
    }
    serve_index_html(asset_root, browser_runtime).await
}

pub(crate) async fn serve_embedded_fallback(
    method: Method,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    if method != Method::GET && method != Method::HEAD {
        return axum::http::StatusCode::NOT_FOUND.into_response();
    }
    serve_embedded_index_html(browser_runtime).await
}

pub(crate) async fn serve_index_html(
    asset_root: PathBuf,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    let index_path = asset_root.join("index.html");
    let Ok(index_html) = tokio::fs::read_to_string(index_path).await else {
        return (axum::http::StatusCode::NOT_FOUND, "not found").into_response();
    };

    html_with_runtime(index_html, browser_runtime)
}

pub(crate) async fn serve_embedded_index_html(browser_runtime: BrowserRuntimeConfig) -> Response {
    let Some(index_bytes) = embedded_assets::get("index.html") else {
        return (axum::http::StatusCode::NOT_FOUND, "not found").into_response();
    };
    let Ok(index_html) = String::from_utf8(index_bytes.to_vec()) else {
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            "invalid embedded asset",
        )
            .into_response();
    };

    html_with_runtime(index_html, browser_runtime)
}

fn html_with_runtime(index_html: String, browser_runtime: BrowserRuntimeConfig) -> Response {
    let runtime_json = serde_json::to_string(&browser_runtime).expect("runtime config json");
    let runtime_script = format!(
        "<script>window.__YONA_RUNTIME_CONFIG__ = {};</script>",
        runtime_json
    );
    let injected = if index_html.contains("</head>") {
        index_html.replacen("</head>", &format!("{runtime_script}</head>"), 1)
    } else if index_html.contains("<body>") {
        index_html.replacen("<body>", &format!("<body>{runtime_script}"), 1)
    } else {
        format!("{runtime_script}{index_html}")
    };

    (
        [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
        injected,
    )
        .into_response()
}

fn sanitize_relative_path(requested_path: &str) -> Option<PathBuf> {
    let trimmed = requested_path.trim_matches('/');
    if trimmed.is_empty() {
        return None;
    }

    let mut path = PathBuf::new();
    for component in std::path::Path::new(trimmed).components() {
        match component {
            std::path::Component::Normal(value) => path.push(value),
            _ => return None,
        }
    }

    Some(path)
}
