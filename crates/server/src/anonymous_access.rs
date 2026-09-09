use axum::extract::Request;
use axum::http::Method;
use axum::middleware::Next;
use axum::response::{IntoResponse, Redirect, Response};

use crate::routes::{base_path_href, percent_encode_uri_component, RestRouteError};
use crate::session::SessionManager;
use crate::smart_http::route_from_path as smart_http_route_from_path;
use crate::{svn_protocol, ConnectError, LEGACY_LOGIN_REQUIRED_MESSAGE};

pub(crate) async fn anonymous_access_gate(
    request: Request,
    next: Next,
    session_manager: SessionManager,
    base_path: String,
    allow_anonymous_access: bool,
) -> Response {
    let path = request.uri().path().to_string();
    let requires_authenticated_session =
        path == "/restricted" || path == crate::routes::base_path_href(&base_path, "/restricted");
    // Legacy global label-typeahead is anonymous for both path spellings.
    let global_label_typeahead = ["/labels", "/categories"]
        .iter()
        .any(|name| *name == path || path == crate::routes::base_path_href(&base_path, name));
    if !requires_authenticated_session
        && (allow_anonymous_access
            || anonymous_access_path_is_public(&path)
            || global_label_typeahead
            || smart_http_route_from_path(request.uri().path(), &base_path).is_some()
            || svn_protocol::route_from_path(request.uri().path(), &base_path).is_some())
    {
        return next.run(request).await;
    }

    if session_manager
        .read_session_from_headers(request.headers())
        .and_then(|session| session.user_id)
        .is_some()
    {
        return next.run(request).await;
    }

    let method = request.method().clone();
    if requires_authenticated_session {
        let mut response =
            Redirect::to(&crate::routes::base_path_href(&base_path, "/")).into_response();
        response.headers_mut().append(
            axum::http::header::SET_COOKIE,
            format!(
                "PLAY_FLASH=message=Nice+try%2C+but+you+need+to+log+in+first%21; Path={}; HttpOnly",
                crate::runtime_config::normalize_base_path(&base_path)
            )
            .parse()
            .expect("flash cookie"),
        );
        return response;
    }

    if path.starts_with("/api/") {
        return anonymous_access_rest_response();
    }
    if method == Method::GET || method == Method::HEAD {
        return anonymous_access_login_redirect(&base_path, &path);
    }

    anonymous_access_rest_response()
}

fn anonymous_access_path_is_public(path: &str) -> bool {
    path == "/api/auth/session"
        || path == "/api/v1/session"
        || path.starts_with("/api/v1/auth/")
        || path.starts_with("/assets/")
        || path == "/favicon.ico"
        || path == "/messages.js"
        || path == "/_init"
        || path == "/_UIKit"
        || path == "/login"
        || path.starts_with("/authenticate/")
        || path == "/user/sidebar"
        || path == "/users/loginform"
        || path == "/users/login"
        || path == "/users/signupform"
        || path == "/forgot-password"
        || path == "/lostPassword"
        || path == "/reset-password"
        || path == "/resetPassword"
        || path.starts_with("/verify/")
}

fn anonymous_access_login_redirect(base_path: &str, path: &str) -> Response {
    let redirect_path = format!(
        "/users/loginform?redirectUrl={}",
        percent_encode_uri_component(path)
    );
    Redirect::to(&base_path_href(base_path, &redirect_path)).into_response()
}

fn anonymous_access_rest_response() -> Response {
    RestRouteError::from_connect_error(ConnectError::unauthenticated(LEGACY_LOGIN_REQUIRED_MESSAGE))
        .into_response()
}
