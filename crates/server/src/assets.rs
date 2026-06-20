use std::path::PathBuf;

use axum::extract::Request;
use axum::response::{IntoResponse, Response};
use axum::{extract::Path as AxumPath, routing::get, Router};
use http::Method;

use crate::excel_export::{
    direct_issue_excel_export, direct_issue_excel_route_from_request, direct_review_excel_export,
    direct_review_excel_route_from_request,
};
use crate::smart_http::{direct_smart_http_request, route_from_path as smart_http_route_from_path};
use crate::{svn_protocol, AssetMode, BrowserRuntimeConfig, PilotServiceImpl};

mod embedded_assets {
    include!(concat!(env!("OUT_DIR"), "/_embedded_assets.rs"));
}

pub(crate) fn apply_asset_routes(
    mut base_router: Router,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
    service: PilotServiceImpl,
) -> Router {
    let base_path = service.base_path.clone();
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
            let service_for_fallback = service;
            let base_path_for_fallback = base_path.clone();

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
                    let service = service_for_fallback.clone();
                    let base_path = base_path_for_fallback.clone();
                    async move {
                        serve_filesystem_or_smart_http_fallback(
                            request,
                            asset_root,
                            browser_runtime,
                            base_path,
                            service,
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
            let service_for_fallback = service;
            let base_path_for_fallback = base_path.clone();

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
                    let service = service_for_fallback.clone();
                    let base_path = base_path_for_fallback.clone();
                    async move {
                        serve_embedded_or_smart_http_fallback(
                            request,
                            browser_runtime,
                            base_path,
                            service,
                        )
                        .await
                    }
                })
        }
        AssetMode::None => {
            let service_for_fallback = service;
            let base_path_for_fallback = base_path;
            base_router.fallback(move |request: Request| {
                let service = service_for_fallback.clone();
                let base_path = base_path_for_fallback.clone();
                async move { smart_http_or_not_found(request, base_path, service).await }
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

pub(crate) async fn serve_filesystem_or_smart_http_fallback(
    request: Request,
    asset_root: PathBuf,
    browser_runtime: BrowserRuntimeConfig,
    base_path: String,
    service: PilotServiceImpl,
) -> Response {
    let method = request.method().clone();
    if let Some(route) = direct_issue_excel_route_from_request(
        &method,
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_issue_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            service.session_manager.clone(),
            service.backend.clone(),
        )
        .await;
    }
    if let Some(route) = direct_review_excel_route_from_request(
        &method,
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_review_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            service.session_manager.clone(),
            service.backend.clone(),
        )
        .await;
    }
    if svn_protocol::route_from_path(request.uri().path(), &base_path).is_some() {
        return svn_protocol::direct_request(request, service).await;
    }
    if smart_http_route_from_path(request.uri().path(), &base_path).is_some() {
        return direct_smart_http_request(request, service).await;
    }
    serve_filesystem_fallback(asset_root, method, browser_runtime).await
}

pub(crate) async fn serve_embedded_or_smart_http_fallback(
    request: Request,
    browser_runtime: BrowserRuntimeConfig,
    base_path: String,
    service: PilotServiceImpl,
) -> Response {
    let method = request.method().clone();
    if let Some(route) = direct_issue_excel_route_from_request(
        &method,
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_issue_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            service.session_manager.clone(),
            service.backend.clone(),
        )
        .await;
    }
    if let Some(route) = direct_review_excel_route_from_request(
        &method,
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_review_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            service.session_manager.clone(),
            service.backend.clone(),
        )
        .await;
    }
    if svn_protocol::route_from_path(request.uri().path(), &base_path).is_some() {
        return svn_protocol::direct_request(request, service).await;
    }
    if smart_http_route_from_path(request.uri().path(), &base_path).is_some() {
        return direct_smart_http_request(request, service).await;
    }
    serve_embedded_fallback(method, browser_runtime).await
}

pub(crate) async fn smart_http_or_not_found(
    request: Request,
    base_path: String,
    service: PilotServiceImpl,
) -> Response {
    if let Some(route) = direct_issue_excel_route_from_request(
        request.method(),
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_issue_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            service.session_manager.clone(),
            service.backend.clone(),
        )
        .await;
    }
    if let Some(route) = direct_review_excel_route_from_request(
        request.method(),
        request.uri().path(),
        request.uri().query(),
        &base_path,
    ) {
        return direct_review_excel_export(
            request.headers().clone(),
            route.owner_name,
            route.project_name,
            route.query,
            service.session_manager.clone(),
            service.backend.clone(),
        )
        .await;
    }
    if svn_protocol::route_from_path(request.uri().path(), &base_path).is_some() {
        return svn_protocol::direct_request(request, service).await;
    }
    if smart_http_route_from_path(request.uri().path(), &base_path).is_some() {
        return direct_smart_http_request(request, service).await;
    }
    axum::http::StatusCode::NOT_FOUND.into_response()
}

pub(crate) async fn serve_frontend_page(
    assets: AssetMode,
    method: Method,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    match assets {
        AssetMode::Filesystem(asset_root) => {
            serve_filesystem_fallback(asset_root, method, browser_runtime).await
        }
        AssetMode::Embedded => serve_embedded_fallback(method, browser_runtime).await,
        AssetMode::None => axum::http::StatusCode::NOT_FOUND.into_response(),
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
