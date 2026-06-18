use std::path::PathBuf;

use axum::extract::Request;
use axum::response::{IntoResponse, Response};
use axum::{extract::Path as AxumPath, routing::get, Router};
use http::Method;

use crate::{
    embedded_assets, serve_embedded_or_smart_http_fallback,
    serve_filesystem_or_smart_http_fallback, session::SessionManager, smart_http_or_not_found,
    AssetMode, BrowserRuntimeConfig, PilotBackend,
};

pub(crate) fn apply_asset_routes(
    mut base_router: Router,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
    base_path: String,
    session_manager: SessionManager,
    backend: PilotBackend,
    public_origin: String,
) -> Router {
    match assets {
        AssetMode::Filesystem(asset_root) => {
            let asset_root_for_assets = asset_root.clone();
            let browser_runtime_for_assets = browser_runtime.clone();
            let asset_root_for_index = asset_root.clone();
            let browser_runtime_for_index = browser_runtime.clone();
            let asset_root_for_fallback = asset_root.clone();
            let browser_runtime_for_fallback = browser_runtime.clone();
            let asset_root_for_single_segment_fallback = asset_root.clone();
            let browser_runtime_for_single_segment_fallback = browser_runtime.clone();
            let asset_root_for_two_segment_fallback = asset_root;
            let browser_runtime_for_two_segment_fallback = browser_runtime.clone();
            let backend_for_fallback = backend;
            let session_manager_for_fallback = session_manager;
            let base_path_for_fallback = base_path.clone();
            let public_origin_for_fallback = public_origin;

            if base_path == "/" {
                base_router = base_router.route(
                    "/",
                    get(move || {
                        let asset_root = asset_root_for_index.clone();
                        let browser_runtime = browser_runtime_for_index.clone();
                        async move { serve_index_html(asset_root, browser_runtime).await }
                    }),
                );
            }

            base_router
                .route(
                    "/assets/{*path}",
                    get(move |AxumPath(path): AxumPath<String>| {
                        let asset_root = asset_root_for_assets.clone();
                        let browser_runtime = browser_runtime_for_assets.clone();
                        async move { serve_filesystem_asset(asset_root, &path, browser_runtime).await }
                    }),
                )
                .route(
                    "/{login_id}",
                    get(move || {
                        let asset_root = asset_root_for_single_segment_fallback.clone();
                        let browser_runtime = browser_runtime_for_single_segment_fallback.clone();
                        async move {
                            serve_filesystem_fallback(asset_root, Method::GET, browser_runtime).await
                        }
                    }),
                )
                .route(
                    "/{owner}/{project}",
                    get(move || {
                        let asset_root = asset_root_for_two_segment_fallback.clone();
                        let browser_runtime = browser_runtime_for_two_segment_fallback.clone();
                        async move {
                            serve_filesystem_fallback(asset_root, Method::GET, browser_runtime).await
                        }
                    }),
                )
                .fallback(move |request: Request| {
                    let asset_root = asset_root_for_fallback.clone();
                    let browser_runtime = browser_runtime_for_fallback.clone();
                    let session_manager = session_manager_for_fallback.clone();
                    let backend = backend_for_fallback.clone();
                    let base_path = base_path_for_fallback.clone();
                    let public_origin = public_origin_for_fallback.clone();
                    async move {
                        serve_filesystem_or_smart_http_fallback(
                            request,
                            asset_root,
                            browser_runtime,
                            session_manager,
                            backend,
                            base_path,
                            public_origin,
                        )
                        .await
                    }
                })
        }
        AssetMode::Embedded => {
            let browser_runtime_for_index = browser_runtime.clone();
            let browser_runtime_for_assets = browser_runtime.clone();
            let browser_runtime_for_fallback = browser_runtime.clone();
            let browser_runtime_for_single_segment_fallback = browser_runtime.clone();
            let browser_runtime_for_two_segment_fallback = browser_runtime;
            let backend_for_fallback = backend;
            let session_manager_for_fallback = session_manager;
            let base_path_for_fallback = base_path.clone();
            let public_origin_for_fallback = public_origin;

            if base_path == "/" {
                base_router = base_router.route(
                    "/",
                    get(move || {
                        let browser_runtime = browser_runtime_for_index.clone();
                        async move { serve_embedded_index_html(browser_runtime).await }
                    }),
                );
            }

            base_router
                .route(
                    "/assets/{*path}",
                    get(move |AxumPath(path): AxumPath<String>| {
                        let browser_runtime = browser_runtime_for_assets.clone();
                        async move { serve_embedded_asset(&path, browser_runtime).await }
                    }),
                )
                .route(
                    "/{login_id}",
                    get(move || {
                        let browser_runtime = browser_runtime_for_single_segment_fallback.clone();
                        async move { serve_embedded_fallback(Method::GET, browser_runtime).await }
                    }),
                )
                .route(
                    "/{owner}/{project}",
                    get(move || {
                        let browser_runtime = browser_runtime_for_two_segment_fallback.clone();
                        async move { serve_embedded_fallback(Method::GET, browser_runtime).await }
                    }),
                )
                .fallback(move |request: Request| {
                    let browser_runtime = browser_runtime_for_fallback.clone();
                    let session_manager = session_manager_for_fallback.clone();
                    let backend = backend_for_fallback.clone();
                    let base_path = base_path_for_fallback.clone();
                    let public_origin = public_origin_for_fallback.clone();
                    async move {
                        serve_embedded_or_smart_http_fallback(
                            request,
                            browser_runtime,
                            session_manager,
                            backend,
                            base_path,
                            public_origin,
                        )
                        .await
                    }
                })
        }
        AssetMode::None => {
            let backend_for_fallback = backend;
            let session_manager_for_fallback = session_manager;
            let base_path_for_fallback = base_path;
            let public_origin_for_fallback = public_origin;
            base_router.fallback(move |request: Request| {
                let session_manager = session_manager_for_fallback.clone();
                let backend = backend_for_fallback.clone();
                let base_path = base_path_for_fallback.clone();
                let public_origin = public_origin_for_fallback.clone();
                async move {
                    smart_http_or_not_found(
                        request,
                        session_manager,
                        backend,
                        base_path,
                        public_origin,
                    )
                    .await
                }
            })
        }
    }
}

pub(crate) fn mount_base_path(
    base_router: Router,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
    base_path: String,
) -> Router {
    if base_path == "/" {
        base_router
    } else if let AssetMode::Filesystem(asset_root) = assets {
        let browser_runtime_for_mount = browser_runtime;
        let asset_root_for_mount = asset_root;

        Router::new()
            .route(
                &format!("{base_path}/"),
                get(move || {
                    let asset_root = asset_root_for_mount.clone();
                    let browser_runtime = browser_runtime_for_mount.clone();
                    async move { serve_index_html(asset_root, browser_runtime).await }
                }),
            )
            .nest(&base_path, base_router)
    } else if matches!(assets, AssetMode::Embedded) {
        let browser_runtime_for_mount = browser_runtime;

        Router::new()
            .route(
                &format!("{base_path}/"),
                get(move || {
                    let browser_runtime = browser_runtime_for_mount.clone();
                    async move { serve_embedded_index_html(browser_runtime).await }
                }),
            )
            .nest(&base_path, base_router)
    } else {
        Router::new().nest(&base_path, base_router)
    }
}

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
