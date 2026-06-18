use axum::{
    extract::{Form, Path, Query},
    http::{HeaderMap, Method},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use std::collections::HashMap;

use crate::{
    direct_authenticate_provider_denied, direct_legacy_login, direct_legacy_logout,
    direct_legacy_signup, direct_legacy_user_email_validation, direct_legacy_user_name_validation,
    direct_request_reset_password_email, direct_reset_password,
    direct_unsupported_authenticate_provider, rest_read_auth_ui_capabilities,
    rest_read_current_session, rest_register_with_password, rest_sign_in_with_password,
    rest_sign_out, rest_verify_user, serve_frontend_page, session::SessionManager, AssetMode,
    AuthUiConfig, BrowserRuntimeConfig, DirectUserEmailValidationQuery,
    DirectUserNameValidationQuery, PilotBackend, PilotServiceImpl, RestRegisterRequest,
    RestSignInRequest, RestVerifyUserRequest,
};

pub(crate) fn rest_routes(service: PilotServiceImpl, auth_ui: AuthUiConfig) -> Router {
    Router::new()
        .route(
            "/session",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let session_manager = service.session_manager.clone();
                    let backend = service.backend.clone();
                    async move { rest_read_current_session(headers, session_manager, backend).await }
                }
            }),
        )
        .route(
            "/auth/capabilities",
            get({
                let auth_ui = auth_ui.clone();
                move |headers: HeaderMap| {
                    let auth_ui = auth_ui.clone();
                    async move { rest_read_auth_ui_capabilities(headers, auth_ui).await }
                }
            }),
        )
        .route(
            "/auth/sign-in",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(input): Json<RestSignInRequest>| {
                    let service = service.clone();
                    async move { rest_sign_in_with_password(headers, input, service).await }
                }
            }),
        )
        .route(
            "/auth/register",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(input): Json<RestRegisterRequest>| {
                    let service = service.clone();
                    async move { rest_register_with_password(headers, input, service).await }
                }
            }),
        )
        .route(
            "/auth/sign-out",
            post({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_sign_out(headers, service).await }
                }
            }),
        )
        .route(
            "/auth/verify",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(input): Json<RestVerifyUserRequest>| {
                    let service = service.clone();
                    async move { rest_verify_user(headers, input, service).await }
                }
            }),
        )
}

pub(crate) fn routes(
    session_manager: SessionManager,
    backend: PilotBackend,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
    base_path: String,
    public_origin: String,
    site_name: String,
) -> Router {
    let session_bootstrap_session_manager = session_manager.clone();
    let session_bootstrap_backend = backend.clone();
    let authenticate_base_path = base_path.clone();
    let authenticate_denied_base_path = base_path.clone();
    let direct_logout_session_manager = session_manager.clone();
    let direct_logout_base_path = base_path.clone();
    let direct_user_logout_session_manager = session_manager.clone();
    let direct_user_logout_base_path = base_path.clone();
    let legacy_login_page_assets = assets.clone();
    let legacy_login_page_browser_runtime = browser_runtime.clone();
    let legacy_signup_page_assets = assets.clone();
    let legacy_signup_page_browser_runtime = browser_runtime.clone();
    let direct_login_session_manager = session_manager.clone();
    let direct_login_backend = backend.clone();
    let direct_login_base_path = base_path.clone();
    let direct_login_public_origin = public_origin.clone();
    let direct_signup_session_manager = session_manager.clone();
    let direct_signup_backend = backend.clone();
    let direct_signup_base_path = base_path.clone();
    let direct_signup_public_origin = public_origin.clone();
    let signup_name_validator_backend = backend.clone();
    let signup_email_validator_backend = backend.clone();
    let legacy_lost_password_page_assets = assets.clone();
    let legacy_lost_password_page_browser_runtime = browser_runtime.clone();
    let lost_password_session_manager = session_manager.clone();
    let lost_password_backend = backend.clone();
    let lost_password_base_path = base_path.clone();
    let lost_password_public_origin = public_origin.clone();
    let lost_password_site_name = site_name.clone();
    let legacy_reset_password_page_assets = assets;
    let legacy_reset_password_page_browser_runtime = browser_runtime;
    let reset_password_backend = backend.clone();
    let reset_password_base_path = base_path.clone();

    Router::new()
        .route(
            "/api/auth/session",
            get(move |headers: HeaderMap| {
                let session_manager = session_bootstrap_session_manager.clone();
                let backend = session_bootstrap_backend.clone();
                async move { session_bootstrap(headers, session_manager, backend).await }
            }),
        )
        .route(
            "/authenticate/{provider}/denied",
            get(move |Path(provider): Path<String>| async move {
                direct_authenticate_provider_denied(provider, authenticate_denied_base_path.clone())
                    .await
            }),
        )
        .route(
            "/authenticate/{provider}",
            get(move |Path(provider): Path<String>| async move {
                direct_unsupported_authenticate_provider(provider, authenticate_base_path.clone())
                    .await
            }),
        )
        .route(
            "/logout",
            get(move |headers: HeaderMap| async move {
                direct_legacy_logout(
                    headers,
                    direct_logout_session_manager.clone(),
                    direct_logout_base_path.clone(),
                )
                .await
            }),
        )
        .route(
            "/users/logout",
            get(move |headers: HeaderMap| async move {
                direct_legacy_logout(
                    headers,
                    direct_user_logout_session_manager.clone(),
                    direct_user_logout_base_path.clone(),
                )
                .await
            }),
        )
        .route(
            "/users/loginform",
            get(move || {
                let assets = legacy_login_page_assets.clone();
                let browser_runtime = legacy_login_page_browser_runtime.clone();
                async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
            }),
        )
        .route(
            "/users/signupform",
            get(move || {
                let assets = legacy_signup_page_assets.clone();
                let browser_runtime = legacy_signup_page_browser_runtime.clone();
                async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
            }),
        )
        .route(
            "/users/login",
            post(
                move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| async move {
                    direct_legacy_login(
                        headers,
                        form,
                        direct_login_session_manager.clone(),
                        direct_login_backend.clone(),
                        direct_login_base_path.clone(),
                        direct_login_public_origin.clone(),
                    )
                    .await
                },
            ),
        )
        .route(
            "/users/signup",
            post(
                move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| async move {
                    direct_legacy_signup(
                        headers,
                        form,
                        direct_signup_session_manager.clone(),
                        direct_signup_backend.clone(),
                        direct_signup_base_path.clone(),
                        direct_signup_public_origin.clone(),
                    )
                    .await
                },
            ),
        )
        .route(
            "/user/isUsed",
            get(
                move |Query(query): Query<DirectUserNameValidationQuery>| async move {
                    direct_legacy_user_name_validation(query, signup_name_validator_backend.clone())
                        .await
                },
            ),
        )
        .route(
            "/user/isEmailExist",
            get(
                move |Query(query): Query<DirectUserEmailValidationQuery>| async move {
                    direct_legacy_user_email_validation(
                        query,
                        signup_email_validator_backend.clone(),
                    )
                    .await
                },
            ),
        )
        .route(
            "/lostPassword",
            get(move || {
                let assets = legacy_lost_password_page_assets.clone();
                let browser_runtime = legacy_lost_password_page_browser_runtime.clone();
                async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
            })
            .post(
                move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| async move {
                    direct_request_reset_password_email(
                        headers,
                        form,
                        lost_password_session_manager.clone(),
                        lost_password_backend.clone(),
                        lost_password_base_path.clone(),
                        lost_password_public_origin.clone(),
                        lost_password_site_name.clone(),
                    )
                    .await
                },
            ),
        )
        .route(
            "/resetPassword",
            get(move || {
                let assets = legacy_reset_password_page_assets.clone();
                let browser_runtime = legacy_reset_password_page_browser_runtime.clone();
                async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
            })
            .post(
                move |Form(form): Form<HashMap<String, String>>| async move {
                    direct_reset_password(
                        form,
                        reset_password_backend.clone(),
                        reset_password_base_path.clone(),
                    )
                    .await
                },
            ),
        )
}

async fn session_bootstrap(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> Response {
    let session = session_manager.ensure_anonymous_session(&headers);
    let payload = crate::build_session_route_payload(&backend, &session).await;
    let mut response = Json(payload).into_response();
    response.headers_mut().insert(
        "X-CSRF-Token",
        session.csrf_token.parse().expect("csrf token header"),
    );
    for cookie in session_manager.build_set_cookie_headers(&session) {
        response.headers_mut().append(
            axum::http::header::SET_COOKIE,
            cookie.parse().expect("set-cookie header"),
        );
    }
    response
}
