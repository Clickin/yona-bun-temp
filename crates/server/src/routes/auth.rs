use axum::{
    extract::{Form, Path, Query},
    http::{HeaderMap, Method},
    response::{IntoResponse, Redirect, Response},
    routing::{get, post},
    Json, Router,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use buffa::view::OwnedView;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::assets::serve_frontend_page;
use crate::generated::yona::pilot::v1::*;
#[cfg(debug_assertions)]
use crate::resolve_current_session_response;
use crate::{
    anonymous_current_session_response, append_response_headers, attach_session_headers,
    auth_ui_capabilities_from_config, base_path_href, headers_with_form_csrf, normalize_identifier,
    percent_encode_uri_component, require_session, require_valid_csrf, rest_json_response,
    rest_owned_view, rest_read_current_session, send_password_reset_mail, AssetMode, AuthUiConfig,
    BrowserRuntimeConfig, ConnectError, Context, PilotBackend, PilotServiceImpl, RestRouteError,
    LEGACY_LOGIN_INVALID_MESSAGE, LEGACY_LOGIN_REQUIRED_MESSAGE, LEGACY_MIN_PASSWORD_LENGTH,
};

use super::send_signup_verification_mail;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestSignInRequest {
    identifier: String,
    password: String,
    remember_me: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestRegisterRequest {
    email_address: String,
    login_id: String,
    name: String,
    password: String,
    retyped_password: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestVerifyUserRequest {
    login_id: String,
    verification_code: String,
}

pub(crate) fn rest_routes(service: PilotServiceImpl, auth_ui: AuthUiConfig) -> Router {
    Router::new()
        .route(
            "/session",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_read_current_session(headers, service).await }
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

pub(crate) async fn rest_read_auth_ui_capabilities(
    headers: HeaderMap,
    auth_ui: AuthUiConfig,
) -> Result<Response, RestRouteError> {
    let request = ReadAuthUiCapabilitiesRequest::default();
    let _request = rest_owned_view::<ReadAuthUiCapabilitiesRequestView<'static>>(&request)?;
    let payload = auth_ui_capabilities_from_config(&auth_ui);
    Ok(rest_json_response(payload, Context::new(headers)))
}

pub(crate) async fn rest_sign_in_with_password(
    headers: HeaderMap,
    input: RestSignInRequest,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = SignInWithPasswordRequest {
        identifier: input.identifier,
        password: input.password,
        remember_me: input.remember_me,
        ..Default::default()
    };
    let request = rest_owned_view::<SignInWithPasswordRequestView<'static>>(&request)?;
    let (payload, ctx) = auth_sign_in_with_password(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_register_with_password(
    headers: HeaderMap,
    input: RestRegisterRequest,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = RegisterWithPasswordRequest {
        email_address: input.email_address,
        login_id: input.login_id,
        name: input.name,
        password: input.password,
        retyped_password: input.retyped_password,
        ..Default::default()
    };
    let request = rest_owned_view::<RegisterWithPasswordRequestView<'static>>(&request)?;
    let (payload, ctx) = auth_register_with_password(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_verify_user(
    headers: HeaderMap,
    input: RestVerifyUserRequest,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = VerifyUserRequest {
        login_id: input.login_id,
        verification_code: input.verification_code,
        ..Default::default()
    };
    let request = rest_owned_view::<VerifyUserRequestView<'static>>(&request)?;
    let (payload, ctx) = auth_verify_user(&service, Context::new(headers), request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

pub(crate) async fn rest_sign_out(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let (payload, ctx) = auth_sign_out(&service, Context::new(headers))
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, ctx))
}

#[cfg(debug_assertions)]
pub(crate) async fn auth_session_read(
    service: &PilotServiceImpl,
    ctx: Context,
) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
    let session = service
        .session_manager
        .read_session_from_headers(&ctx.headers);
    let response = resolve_current_session_response(&service.backend, session.as_ref()).await?;
    Ok((response, ctx))
}

pub(crate) async fn auth_sign_in_with_password(
    service: &PilotServiceImpl,
    mut ctx: Context,
    request: OwnedView<SignInWithPasswordRequestView<'static>>,
) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "auth requires repository backend",
        ));
    };

    let identifier = normalize_identifier(request.identifier);
    if identifier.is_empty() || request.password.is_empty() {
        return Err(ConnectError::invalid_argument(
            LEGACY_LOGIN_REQUIRED_MESSAGE,
        ));
    }

    let Some(user) = repository
        .find_user_by_identifier(&identifier)
        .await
        .map_err(crate::internal_error)?
    else {
        return Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE));
    };

    let verified = verify(&request.password, &user.password_hash).map_err(crate::internal_error)?;
    if !verified {
        return Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE));
    }
    if crate::confirmation_session_required_from_config(&service.auth_ui) && !user.is_confirmed {
        return Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE));
    }

    let authenticated_session = service.session_manager.create_authenticated_session(
        Some(&session.token),
        user.id,
        request.remember_me,
    );
    attach_session_headers(&mut ctx, &service.session_manager, &authenticated_session);

    let default_landing_path = repository
        .read_default_landing_path(user.id)
        .await
        .map_err(crate::internal_error)?;
    Ok((
        crate::current_session_response_from_user(&user, default_landing_path),
        ctx,
    ))
}

pub(crate) async fn auth_register_with_password(
    service: &PilotServiceImpl,
    mut ctx: Context,
    request: OwnedView<RegisterWithPasswordRequestView<'static>>,
) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "auth requires repository backend",
        ));
    };

    let capabilities = auth_ui_capabilities_from_config(&service.auth_ui);
    let login_id = normalize_identifier(request.login_id);
    let email_address = normalize_identifier(request.email_address);
    if login_id.is_empty() {
        return Err(ConnectError::invalid_argument("user.wrongloginId.alert"));
    }
    if email_address.is_empty() {
        return Err(ConnectError::invalid_argument("validation.invalidEmail"));
    }
    if request.name.trim().is_empty() {
        return Err(ConnectError::invalid_argument("validation.required"));
    }
    if request.password.len() < LEGACY_MIN_PASSWORD_LENGTH {
        return Err(ConnectError::invalid_argument(
            "validation.tooShortPassword",
        ));
    }
    if request.password != request.retyped_password {
        return Err(ConnectError::invalid_argument(
            "validation.passwordMismatch",
        ));
    }

    if repository
        .user_login_id_exists(&login_id)
        .await
        .map_err(crate::internal_error)?
    {
        return Err(ConnectError::already_exists("user.loginId.duplicate"));
    }
    if repository
        .user_email_exists(&email_address)
        .await
        .map_err(crate::internal_error)?
    {
        return Err(ConnectError::already_exists("user.email.duplicate"));
    }

    let password_hash = hash(&request.password, DEFAULT_COST).map_err(crate::internal_error)?;
    let user = repository
        .create_user(crate::persistence::CreateUserInput {
            display_name: request.name.trim().to_string(),
            email_address,
            is_confirmed: !crate::confirmation_session_required_from_config(&service.auth_ui),
            is_site_admin: false,
            login_id,
            password_hash,
        })
        .await
        .map_err(crate::internal_error)?;

    if capabilities.email_verification_enabled {
        let verification_code = repository
            .create_signup_verification_for_user(user.id, &user.login_id)
            .await
            .map_err(crate::internal_error)?;
        send_signup_verification_mail(
            &user.email_address,
            &user.login_id,
            &verification_code,
            &service.public_origin,
            &service.base_path,
            &service.smtp.default_from(),
            &service.integrations,
        )?;
    }

    if crate::confirmation_session_required_from_config(&service.auth_ui) {
        return Ok((anonymous_current_session_response(), ctx));
    }

    let authenticated_session =
        service
            .session_manager
            .create_authenticated_session(Some(&session.token), user.id, false);
    attach_session_headers(&mut ctx, &service.session_manager, &authenticated_session);

    Ok((crate::current_session_response_from_user(&user, None), ctx))
}

pub(crate) async fn auth_sign_out(
    service: &PilotServiceImpl,
    mut ctx: Context,
) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
    let session = require_session(&service.session_manager, &ctx.headers)?;
    require_valid_csrf(&service.session_manager, &ctx.headers, &session)?;

    let anonymous_session = service
        .session_manager
        .create_anonymous_session(Some(&session.token));
    attach_session_headers(&mut ctx, &service.session_manager, &anonymous_session);

    Ok((anonymous_current_session_response(), ctx))
}

pub(crate) async fn auth_verify_user(
    service: &PilotServiceImpl,
    ctx: Context,
    request: OwnedView<VerifyUserRequestView<'static>>,
) -> Result<(VerifyUserResponse, Context), ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "auth requires repository backend",
        ));
    };
    let Some(user_id) = repository
        .find_valid_signup_verification_user_id(request.login_id, request.verification_code)
        .await
        .map_err(crate::internal_error)?
    else {
        return Err(ConnectError::not_found("Invalid verification"));
    };
    let user = repository
        .mark_user_confirmed(user_id)
        .await
        .map_err(crate::internal_error)?;
    repository
        .delete_signup_verification(request.verification_code)
        .await
        .map_err(crate::internal_error)?;
    Ok((
        VerifyUserResponse {
            login_id: user.login_id,
            ..Default::default()
        },
        ctx,
    ))
}

pub(crate) async fn direct_request_reset_password_email(
    headers: HeaderMap,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let session = service.session_manager.ensure_anonymous_session(&headers);
    let redirect_path = match &service.backend {
        PilotBackend::Repository(repository) => {
            let login_id =
                normalize_identifier(form.get("loginId").map(String::as_str).unwrap_or_default());
            let email_address = normalize_identifier(
                form.get("emailAddress")
                    .map(String::as_str)
                    .unwrap_or_default(),
            );
            match repository
                .find_user_by_login_id(&login_id)
                .await
                .ok()
                .flatten()
            {
                Some(user) if normalize_identifier(&user.email_address) == email_address => {
                    if let Ok(code) = repository
                        .create_password_reset_verification_for_user(user.id, &user.login_id)
                        .await
                    {
                        let _ = send_password_reset_mail(
                            &user.email_address,
                            &code,
                            &service.public_origin,
                            &service.base_path,
                            &service.site_name,
                            &service.smtp.default_from(),
                            &service.integrations,
                        );
                    }
                    "/lostPassword?requested=1"
                }
                _ => "/lostPassword?error=invalid",
            }
        }
        _ => "/lostPassword?error=unsupported",
    };

    let mut response =
        Redirect::to(&base_path_href(&service.base_path, redirect_path)).into_response();
    for cookie in service.session_manager.build_set_cookie_headers(&session) {
        response.headers_mut().append(
            axum::http::header::SET_COOKIE,
            cookie.parse().expect("set-cookie header"),
        );
    }
    response
}

pub(crate) async fn direct_reset_password(
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let hash_string = form.get("hashString").cloned().unwrap_or_default();
    let password = form.get("password").cloned().unwrap_or_default();
    let retyped_password = form.get("retypedPassword").cloned().unwrap_or_default();

    if password.len() < LEGACY_MIN_PASSWORD_LENGTH || password != retyped_password {
        let query = if hash_string.is_empty() {
            "/resetPassword?error=invalid".to_string()
        } else {
            format!("/resetPassword?error=invalid&s={hash_string}")
        };
        return Redirect::to(&base_path_href(&service.base_path, &query)).into_response();
    }

    let redirect_path = match &service.backend {
        PilotBackend::Repository(repository) => {
            match repository
                .find_valid_password_reset_user_id(&hash_string)
                .await
            {
                Ok(Some(user_id)) => match hash(&password, DEFAULT_COST) {
                    Ok(password_hash) => {
                        if repository
                            .update_password_hash_for_user(user_id, &password_hash)
                            .await
                            .is_ok()
                        {
                            let _ = repository
                                .delete_password_reset_verification(&hash_string)
                                .await;
                            "/users/loginform?password=reset".to_string()
                        } else {
                            format!("/resetPassword?error=invalid&s={hash_string}")
                        }
                    }
                    Err(_) => format!("/resetPassword?error=invalid&s={hash_string}"),
                },
                _ => format!("/resetPassword?error=invalid&s={hash_string}"),
            }
        }
        _ => "/resetPassword?error=unsupported".to_string(),
    };

    Redirect::to(&base_path_href(&service.base_path, &redirect_path)).into_response()
}

fn legacy_form_checkbox_checked(form: &HashMap<String, String>, key: &str) -> bool {
    form.get(key)
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on" | "checked"
            )
        })
        .unwrap_or(false)
}

fn has_absolute_url_scheme(value: &str) -> bool {
    let Some(index) = value.find("://") else {
        return false;
    };
    let scheme = &value[..index];
    let mut chars = scheme.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    first.is_ascii_alphabetic()
        && chars.all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '+' | '.' | '-')
        })
}

fn safe_legacy_auth_redirect_path(value: Option<&String>) -> Option<String> {
    let trimmed = value?.trim();
    if trimmed.is_empty()
        || !trimmed.starts_with('/')
        || trimmed.starts_with("//")
        || has_absolute_url_scheme(trimmed)
    {
        return None;
    }
    Some(trimmed.to_string())
}

fn post_auth_landing_path(redirect_path: Option<&String>, default_landing_path: &str) -> String {
    safe_legacy_auth_redirect_path(redirect_path).unwrap_or_else(|| {
        let trimmed = default_landing_path.trim();
        if trimmed.is_empty() {
            "/me".to_string()
        } else {
            trimmed.to_string()
        }
    })
}

fn redirect_with_context_headers(base_path: &str, path: &str, ctx: &Context) -> Response {
    let mut response = Redirect::to(&base_path_href(base_path, path)).into_response();
    append_response_headers(response.headers_mut(), &ctx.response_headers);
    response
}

pub(crate) async fn direct_legacy_login(
    headers: HeaderMap,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let request = SignInWithPasswordRequest {
        identifier: form
            .get("loginIdOrEmail")
            .or_else(|| form.get("loginId"))
            .cloned()
            .unwrap_or_default(),
        password: form.get("password").cloned().unwrap_or_default(),
        remember_me: legacy_form_checkbox_checked(&form, "rememberMe"),
        ..Default::default()
    };
    let request = match rest_owned_view::<SignInWithPasswordRequestView<'static>>(&request) {
        Ok(request) => request,
        Err(error) => return error.into_response(),
    };
    match service
        .sign_in_with_password(
            Context::new(headers_with_form_csrf(headers, &form)),
            request,
        )
        .await
    {
        Ok((payload, ctx)) => {
            let redirect_path = post_auth_landing_path(
                form.get("redirectUrl").or_else(|| form.get("redirect")),
                &payload.default_landing_path,
            );
            redirect_with_context_headers(&service.base_path, &redirect_path, &ctx)
        }
        Err(error) => RestRouteError::from_connect_error(error).into_response(),
    }
}

pub(crate) async fn direct_legacy_signup(
    headers: HeaderMap,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let request = RegisterWithPasswordRequest {
        email_address: form
            .get("email")
            .or_else(|| form.get("emailAddress"))
            .cloned()
            .unwrap_or_default(),
        login_id: form.get("loginId").cloned().unwrap_or_default(),
        name: form.get("name").cloned().unwrap_or_default(),
        password: form.get("password").cloned().unwrap_or_default(),
        retyped_password: form.get("retypedPassword").cloned().unwrap_or_default(),
        ..Default::default()
    };
    let request = match rest_owned_view::<RegisterWithPasswordRequestView<'static>>(&request) {
        Ok(request) => request,
        Err(error) => return error.into_response(),
    };
    match auth_register_with_password(
        &service,
        Context::new(headers_with_form_csrf(headers, &form)),
        request,
    )
    .await
    {
        Ok((payload, ctx)) => {
            let capabilities = auth_ui_capabilities_from_config(&service.auth_ui);
            let redirect_path = if payload.is_anonymous {
                if capabilities.signup_require_confirm {
                    "/users/loginform?signup=requested"
                } else if capabilities.email_verification_enabled {
                    "/users/loginform?verify=sent"
                } else {
                    "/users/loginform"
                }
            } else {
                payload.default_landing_path.trim()
            };
            let redirect_path = if redirect_path.is_empty() {
                "/me"
            } else {
                redirect_path
            };
            redirect_with_context_headers(&service.base_path, redirect_path, &ctx)
        }
        Err(error) => RestRouteError::from_connect_error(error).into_response(),
    }
}

pub(crate) async fn direct_unsupported_authenticate_provider(
    provider: String,
    service: PilotServiceImpl,
) -> Response {
    let provider = provider.trim();
    let redirect_path = if provider.is_empty() {
        "/users/loginform?error=unsupported".to_string()
    } else {
        format!(
            "/users/loginform?error=unsupported&provider={}",
            percent_encode_uri_component(provider)
        )
    };
    Redirect::to(&base_path_href(&service.base_path, &redirect_path)).into_response()
}

pub(crate) async fn direct_authenticate_provider_denied(
    provider: String,
    service: PilotServiceImpl,
) -> Response {
    let provider = provider.trim();
    let redirect_path = if provider.is_empty() {
        "/users/loginform?error=oauthDenied".to_string()
    } else {
        format!(
            "/users/loginform?error=oauthDenied&provider={}",
            percent_encode_uri_component(provider)
        )
    };
    Redirect::to(&base_path_href(&service.base_path, &redirect_path)).into_response()
}

const LEGACY_RESERVED_USER_NAMES: &[&str] = &[
    "-_-api",
    "assets",
    "authenticate",
    "categories",
    "comments",
    "favicon.ico",
    "files",
    "info",
    "labels",
    "logout",
    "lostPassword",
    "markdown",
    "messages.js",
    "migration",
    "new",
    "noti",
    "notification",
    "notifications",
    "organizations",
    "orgs",
    "project",
    "projectform",
    "projects",
    "resetPassword",
    "restricted",
    "search",
    "sites",
    "svn",
    "threads",
    "unwatch",
    "user",
    "users",
    "verify",
    "watch",
];

#[derive(Deserialize)]
pub(crate) struct DirectUserNameValidationQuery {
    name: Option<String>,
}

#[derive(Serialize)]
struct DirectUserNameValidationResponse {
    #[serde(rename = "isExist")]
    is_exist: bool,
    #[serde(rename = "isReserved")]
    is_reserved: bool,
}

#[derive(Deserialize)]
pub(crate) struct DirectUserEmailValidationQuery {
    email: Option<String>,
}

#[derive(Serialize)]
struct DirectUserEmailValidationResponse {
    #[serde(rename = "isExist")]
    is_exist: bool,
}

pub(crate) async fn direct_legacy_user_name_validation(
    query: DirectUserNameValidationQuery,
    service: PilotServiceImpl,
) -> Response {
    let name = query.name.unwrap_or_default();
    let is_reserved = is_legacy_reserved_user_name(&name);
    let PilotBackend::Repository(repository) = service.backend else {
        return RestRouteError::not_implemented("signup validation requires repository backend")
            .into_response();
    };

    let user_exists = match repository.user_login_id_exists(&name).await {
        Ok(exists) => exists,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let organization_exists = if user_exists {
        false
    } else {
        match repository.organization_name_exists(&name).await {
            Ok(exists) => exists,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        }
    };

    Json(DirectUserNameValidationResponse {
        is_exist: user_exists || organization_exists,
        is_reserved,
    })
    .into_response()
}

pub(crate) async fn direct_legacy_user_email_validation(
    query: DirectUserEmailValidationQuery,
    service: PilotServiceImpl,
) -> Response {
    let email = query.email.unwrap_or_default();
    let PilotBackend::Repository(repository) = service.backend else {
        return RestRouteError::not_implemented("signup validation requires repository backend")
            .into_response();
    };
    let is_exist = match repository.user_email_exists(&email).await {
        Ok(exists) => exists,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };

    Json(DirectUserEmailValidationResponse { is_exist }).into_response()
}

fn is_legacy_reserved_user_name(name: &str) -> bool {
    let normalized = normalize_identifier(name);
    LEGACY_RESERVED_USER_NAMES
        .iter()
        .any(|reserved| normalize_identifier(reserved) == normalized)
}

pub(crate) async fn direct_legacy_logout(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Response {
    let redirect_target = headers
        .get(http::header::REFERER)
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.trim().is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| base_path_href(&service.base_path, "/"));
    let previous_token = service
        .session_manager
        .read_session_from_headers(&headers)
        .map(|session| session.token);
    let anonymous_session = service
        .session_manager
        .create_anonymous_session(previous_token.as_deref());

    let mut ctx = Context::new(headers);
    attach_session_headers(&mut ctx, &service.session_manager, &anonymous_session);
    let mut response = Redirect::to(&redirect_target).into_response();
    append_response_headers(response.headers_mut(), &ctx.response_headers);
    response
}

pub(crate) fn routes(
    service: PilotServiceImpl,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
) -> Router {
    let session_bootstrap_service = service.clone();
    let authenticate_service = service.clone();
    let authenticate_denied_service = service.clone();
    let direct_logout_service = service.clone();
    let direct_user_logout_service = service.clone();
    let legacy_login_page_assets = assets.clone();
    let legacy_login_page_browser_runtime = browser_runtime.clone();
    let legacy_signup_page_assets = assets.clone();
    let legacy_signup_page_browser_runtime = browser_runtime.clone();
    let direct_login_service = service.clone();
    let lost_password_service = service.clone();
    let direct_signup_service = service.clone();
    let signup_name_validator_service = service.clone();
    let signup_email_validator_service = service.clone();
    let legacy_lost_password_page_assets = assets.clone();
    let legacy_lost_password_page_browser_runtime = browser_runtime.clone();
    let legacy_reset_password_page_assets = assets;
    let legacy_reset_password_page_browser_runtime = browser_runtime;
    let reset_password_service = service;

    Router::new()
        .route(
            "/api/auth/session",
            get(move |headers: HeaderMap| {
                let service = session_bootstrap_service.clone();
                async move { session_bootstrap(headers, service).await }
            }),
        )
        .route(
            "/authenticate/{provider}/denied",
            get(move |Path(provider): Path<String>| async move {
                direct_authenticate_provider_denied(provider, authenticate_denied_service.clone())
                    .await
            }),
        )
        .route(
            "/authenticate/{provider}",
            get(move |Path(provider): Path<String>| async move {
                direct_unsupported_authenticate_provider(provider, authenticate_service.clone())
                    .await
            }),
        )
        .route(
            "/logout",
            get(move |headers: HeaderMap| async move {
                direct_legacy_logout(headers, direct_logout_service.clone()).await
            }),
        )
        .route(
            "/users/logout",
            get(move |headers: HeaderMap| async move {
                direct_legacy_logout(headers, direct_user_logout_service.clone()).await
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
                    direct_legacy_login(headers, form, direct_login_service.clone()).await
                },
            ),
        )
        .route(
            "/users/signup",
            post(
                move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| async move {
                    direct_legacy_signup(headers, form, direct_signup_service.clone()).await
                },
            ),
        )
        .route(
            "/user/isUsed",
            get(
                move |Query(query): Query<DirectUserNameValidationQuery>| async move {
                    direct_legacy_user_name_validation(query, signup_name_validator_service.clone())
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
                        signup_email_validator_service.clone(),
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
                        lost_password_service.clone(),
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
                    direct_reset_password(form, reset_password_service.clone()).await
                },
            ),
        )
}

async fn session_bootstrap(headers: HeaderMap, service: PilotServiceImpl) -> Response {
    let session = service.session_manager.ensure_anonymous_session(&headers);
    let payload = build_session_route_payload(&service, &session).await;
    let mut response = Json(payload).into_response();
    response.headers_mut().insert(
        "X-CSRF-Token",
        session.csrf_token.parse().expect("csrf token header"),
    );
    for cookie in service.session_manager.build_set_cookie_headers(&session) {
        response.headers_mut().append(
            axum::http::header::SET_COOKIE,
            cookie.parse().expect("set-cookie header"),
        );
    }
    response
}

#[derive(Clone, Serialize)]
struct SessionRoutePayload {
    session: Option<SessionRouteRecord>,
    user: Option<SessionRouteUser>,
}

#[derive(Clone, Serialize)]
struct SessionRouteRecord {
    #[serde(rename = "csrfToken")]
    csrf_token: String,
    projection: ReadCurrentSessionResponse,
    #[serde(rename = "userId")]
    user_id: i64,
}

#[derive(Clone, Serialize)]
struct SessionRouteUser {
    #[serde(rename = "emailAddress")]
    email_address: String,
    id: i64,
    #[serde(rename = "isConfirmed")]
    is_confirmed: bool,
    #[serde(rename = "isSiteAdmin")]
    is_site_admin: bool,
    #[serde(rename = "loginId")]
    login_id: String,
    name: String,
}

async fn build_session_route_payload(
    service: &PilotServiceImpl,
    session: &crate::session::Session,
) -> SessionRoutePayload {
    let Ok(projection) =
        crate::resolve_current_session_response(&service.backend, Some(session)).await
    else {
        return SessionRoutePayload {
            session: None,
            user: None,
        };
    };

    if projection.is_anonymous {
        return SessionRoutePayload {
            session: None,
            user: None,
        };
    }

    SessionRoutePayload {
        session: Some(SessionRouteRecord {
            csrf_token: session.csrf_token.clone(),
            projection: projection.clone(),
            user_id: projection.actor_id,
        }),
        user: Some(SessionRouteUser {
            email_address: projection.email_address.clone(),
            id: projection.actor_id,
            is_confirmed: projection.is_confirmed,
            is_site_admin: projection.is_site_admin,
            login_id: projection.login_id.clone(),
            name: projection.user_label.clone(),
        }),
    }
}
