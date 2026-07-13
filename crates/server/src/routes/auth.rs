use crate::api_types::OwnedView;
use axum::{
    extract::{Form, Path, Query},
    http::{HeaderMap, Method, StatusCode},
    response::{IntoResponse, Redirect, Response},
    routing::{get, post},
    Json, Router,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use yoram_domain::resolve_post_auth_landing_path;

use crate::api_types::*;
use crate::assets::serve_frontend_page;
use crate::ldap::{
    authenticate_with_real_ldap_connector, fixture_ldap_authenticate, LdapConnectorError,
    RealLdapDirectoryConnector,
};
use crate::persistence::{AppUserRecord, CreateUserInput, OAuthUserInput};
#[cfg(debug_assertions)]
use crate::resolve_current_session_response;
use crate::{
    anonymous_current_session_response, append_response_headers, attach_session_headers,
    auth_ui_capabilities_from_config, base_path_href, headers_with_form_csrf, normalize_identifier,
    percent_encode_uri_component, require_session, require_valid_csrf, rest_json_response,
    rest_owned_view, rest_read_current_session, send_password_reset_mail, AssetMode, AuthUiConfig,
    BrowserRuntimeConfig, ConnectError, Context, ErrorCode, LdapFixtureUser, LdapRuntimeConfig,
    PilotBackend, PilotRepository, PilotServiceImpl, RestRouteError, LEGACY_LOGIN_INVALID_MESSAGE,
    LEGACY_LOGIN_REQUIRED_MESSAGE, LEGACY_MIN_PASSWORD_LENGTH,
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestRequestPasswordResetRequest {
    email_address: String,
    login_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestCompletePasswordResetRequest {
    hash_string: String,
    password: String,
    retyped_password: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestSecretAdminSetupRequest {
    email_address: String,
    name: String,
    password: String,
    retyped_password: String,
}

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
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
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { rest_read_auth_ui_capabilities(headers, service).await }
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
        .route(
            "/auth/password-reset/request",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(input): Json<RestRequestPasswordResetRequest>| {
                    let service = service.clone();
                    async move { rest_request_password_reset(headers, input, service).await }
                }
            }),
        )
        .route(
            "/auth/password-reset/complete",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(input): Json<RestCompletePasswordResetRequest>| {
                    let service = service.clone();
                    async move { rest_complete_password_reset(headers, input, service).await }
                }
            }),
        )
        .route(
            "/auth/secret",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(input): Json<RestSecretAdminSetupRequest>| {
                    let service = service.clone();
                    async move { rest_secret_admin_setup(headers, input, service).await }
                }
            }),
        )
}

pub(crate) async fn rest_read_auth_ui_capabilities(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadAuthUiCapabilitiesRequest::default();
    let _request = rest_owned_view::<ReadAuthUiCapabilitiesRequestView<'static>>(&request)?;
    let mut payload = auth_ui_capabilities_from_config(&service.auth_ui);
    payload.default_admin_contact = legacy_obfuscated_default_admin_contact(&service).await?;
    payload.secret_setup_required = secret_admin_setup_required(&service)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    Ok(rest_json_response(payload, Context::new(headers)))
}

pub(crate) async fn legacy_obfuscated_default_admin_contact(
    service: &PilotServiceImpl,
) -> Result<String, RestRouteError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Ok(String::new());
    };
    let Some(admin) = repository
        .find_user_by_login_id("admin")
        .await
        .map_err(crate::internal_error)
        .map_err(RestRouteError::from_connect_error)?
    else {
        return Ok(String::new());
    };
    Ok(admin.email_address.chars().rev().collect())
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

pub(crate) async fn rest_request_password_reset(
    headers: HeaderMap,
    input: RestRequestPasswordResetRequest,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    request_password_reset_email(&service, &input.login_id, &input.email_address)
        .await
        .map_err(RestRouteError::from_connect_error)?;

    Ok(rest_json_response(
        serde_json::json!({ "redirectPath": "/lostPassword?requested=1" }),
        Context::new(headers),
    ))
}

pub(crate) async fn rest_complete_password_reset(
    headers: HeaderMap,
    input: RestCompletePasswordResetRequest,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    complete_password_reset(
        &service,
        &input.hash_string,
        &input.password,
        &input.retyped_password,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;

    Ok(rest_json_response(
        serde_json::json!({ "redirectPath": "/users/loginform?password=reset" }),
        Context::new(headers),
    ))
}

pub(crate) async fn rest_secret_admin_setup(
    headers: HeaderMap,
    input: RestSecretAdminSetupRequest,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    if !secret_admin_setup_required(&service)
        .await
        .map_err(RestRouteError::from_connect_error)?
    {
        return Err(RestRouteError::not_found("secret setup is not required"));
    }
    update_legacy_default_site_admin(
        &service,
        &input.name,
        &input.email_address,
        &input.password,
        &input.retyped_password,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;

    Ok(rest_json_response(
        serde_json::json!({ "restartPath": "/restart" }),
        Context::new(headers),
    ))
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
    if let (PilotBackend::Repository(repository), Some(user_id)) = (
        &service.backend,
        session.as_ref().and_then(|session| session.user_id),
    ) {
        crate::persist_preferred_language_from_headers(
            repository,
            user_id,
            &ctx.headers,
            &service.supported_languages,
        )
        .await?;
    }
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

    let identifier = normalize_identifier(&request.identifier);
    if identifier.is_empty() || request.password.is_empty() {
        return Err(ConnectError::invalid_argument(
            LEGACY_LOGIN_REQUIRED_MESSAGE,
        ));
    }

    let user = if service.ldap.enabled {
        authenticate_with_ldap_or_legacy_fallback(
            &service.auth_ui,
            &service.ldap,
            repository,
            &identifier,
            &request.password,
        )
        .await?
    } else {
        authenticate_local_user(repository, &identifier, &request.password).await?
    };

    if crate::confirmation_session_required_from_config(&service.auth_ui) && !user.is_confirmed {
        return Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE));
    }

    let authenticated_session = service.session_manager.create_authenticated_session(
        Some(&session.token),
        user.id,
        request.remember_me,
    );
    crate::persist_preferred_language_from_headers(
        repository,
        user.id,
        &ctx.headers,
        &service.supported_languages,
    )
    .await?;
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

async fn authenticate_local_user(
    repository: &PilotRepository,
    identifier: &str,
    password: &str,
) -> Result<AppUserRecord, ConnectError> {
    let Some(user) = repository
        .find_user_by_identifier(identifier)
        .await
        .map_err(crate::internal_error)?
    else {
        return Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE));
    };

    let verified = verify(password, &user.password_hash).map_err(crate::internal_error)?;
    if verified {
        Ok(user)
    } else {
        Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE))
    }
}

#[derive(Debug)]
enum LdapAuthFailure {
    Authentication,
    ConnectionUnavailable,
    Internal(ConnectError),
}

pub(crate) async fn authenticate_with_ldap_or_legacy_fallback(
    auth_ui: &AuthUiConfig,
    ldap: &LdapRuntimeConfig,
    repository: &PilotRepository,
    identifier: &str,
    password: &str,
) -> Result<AppUserRecord, ConnectError> {
    match authenticate_with_configured_ldap(auth_ui, ldap, repository, identifier, password).await {
        Ok(user) => Ok(user),
        Err(LdapAuthFailure::Authentication | LdapAuthFailure::ConnectionUnavailable)
            if ldap.fallback_to_local_login =>
        {
            authenticate_local_user(repository, identifier, password).await
        }
        Err(LdapAuthFailure::Authentication | LdapAuthFailure::ConnectionUnavailable) => {
            Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE))
        }
        Err(LdapAuthFailure::Internal(error)) => Err(error),
    }
}

async fn authenticate_with_configured_ldap(
    auth_ui: &AuthUiConfig,
    ldap: &LdapRuntimeConfig,
    repository: &PilotRepository,
    identifier: &str,
    password: &str,
) -> Result<AppUserRecord, LdapAuthFailure> {
    let ldap_identity = ldap_login_identity(ldap, repository, identifier).await?;
    let ldap_user = if ldap.fixture_users.is_empty() {
        authenticate_with_real_ldap_connector(
            ldap,
            &ldap_identity,
            password,
            &RealLdapDirectoryConnector,
        )
        .await
        .map_err(|error| match error {
            LdapConnectorError::Authentication => LdapAuthFailure::Authentication,
            LdapConnectorError::ConnectionUnavailable => LdapAuthFailure::ConnectionUnavailable,
        })?
    } else {
        fixture_ldap_authenticate(ldap, &ldap_identity, password)
    };
    let Some(ldap_user) = ldap_user else {
        return Err(LdapAuthFailure::Authentication);
    };
    provision_or_update_ldap_user(auth_ui, ldap, repository, &ldap_user, password)
        .await
        .map_err(LdapAuthFailure::Internal)
}

async fn ldap_login_identity(
    ldap: &LdapRuntimeConfig,
    repository: &PilotRepository,
    identifier: &str,
) -> Result<String, LdapAuthFailure> {
    if !ldap.use_email_base_login || identifier.contains('@') {
        return Ok(identifier.to_string());
    }
    match repository.find_user_by_login_id(identifier).await {
        Ok(Some(user)) => Ok(user.email_address),
        Ok(None) => Ok(identifier.to_string()),
        Err(_) => Err(LdapAuthFailure::ConnectionUnavailable),
    }
}

async fn provision_or_update_ldap_user(
    auth_ui: &AuthUiConfig,
    ldap: &LdapRuntimeConfig,
    repository: &PilotRepository,
    ldap_user: &LdapFixtureUser,
    password: &str,
) -> Result<AppUserRecord, ConnectError> {
    let email = normalize_identifier(&ldap_user.email);
    if email.is_empty() {
        return Err(ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE));
    }
    let display_name = legacy_ldap_display_name(ldap_user);
    let password_hash = hash(password, DEFAULT_COST).map_err(crate::internal_error)?;
    if let Some(existing) = repository
        .find_user_by_identifier(&email)
        .await
        .map_err(crate::internal_error)?
    {
        if !verify(password, &existing.password_hash).map_err(crate::internal_error)? {
            repository
                .update_password_hash_for_user(existing.id, &password_hash)
                .await
                .map_err(crate::internal_error)?;
        }
        return repository
            .update_ldap_user_profile(
                existing.id,
                &display_name,
                &email,
                Some(&ldap_user.english_name),
                &ldap_user.login_id,
            )
            .await
            .map_err(crate::internal_error);
    }

    let login_id = ldap_local_login_id(ldap, repository, ldap_user).await?;
    repository
        .create_user(CreateUserInput {
            display_name,
            email_address: email,
            is_confirmed: !crate::confirmation_session_required_from_config(auth_ui),
            is_site_admin: false,
            login_id,
            password_hash,
        })
        .await
        .map_err(crate::internal_error)
}

fn legacy_ldap_display_name(ldap_user: &LdapFixtureUser) -> String {
    let display_name = ldap_user.display_name.trim();
    let department = ldap_user.department.trim();
    if department.is_empty() {
        display_name.to_string()
    } else {
        format!("{display_name} [{department}]")
    }
}

async fn ldap_local_login_id(
    ldap: &LdapRuntimeConfig,
    repository: &PilotRepository,
    ldap_user: &LdapFixtureUser,
) -> Result<String, ConnectError> {
    let configured_login_id = normalize_identifier(&ldap_user.login_id);
    if !ldap.use_email_base_login {
        return Ok(configured_login_id);
    }
    let email = normalize_identifier(&ldap_user.email);
    let local_part = email
        .split_once('@')
        .map(|(local, _)| normalize_identifier(local))
        .filter(|local| !local.is_empty())
        .unwrap_or(configured_login_id);
    unique_legacy_ldap_login_id(repository, &local_part).await
}

async fn unique_legacy_ldap_login_id(
    repository: &PilotRepository,
    candidate: &str,
) -> Result<String, ConnectError> {
    if !repository
        .user_login_id_exists(candidate)
        .await
        .map_err(crate::internal_error)?
    {
        return Ok(candidate.to_string());
    }
    let mut next_candidate = candidate.to_string();
    let mut suffix = 1;
    loop {
        let proposed = format!("{next_candidate}{suffix}");
        if !repository
            .user_login_id_exists(&proposed)
            .await
            .map_err(crate::internal_error)?
        {
            return Ok(proposed);
        }
        next_candidate = proposed;
        suffix += 1;
    }
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
    let login_id = normalize_identifier(&request.login_id);
    let email_address = normalize_identifier(&request.email_address);
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
            is_site_admin: !repository
                .has_registered_users()
                .await
                .map_err(crate::internal_error)?,
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
    crate::persist_preferred_language_from_headers(
        repository,
        user.id,
        &ctx.headers,
        &service.supported_languages,
    )
    .await?;
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
        .find_valid_signup_verification_user_id(&request.login_id, &request.verification_code)
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
        .delete_signup_verification(&request.verification_code)
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
    let login_id = form.get("loginId").map(String::as_str).unwrap_or_default();
    let email_address = form
        .get("emailAddress")
        .map(String::as_str)
        .unwrap_or_default();
    let redirect_path = match request_password_reset_email(&service, login_id, email_address).await
    {
        Ok(()) => "/lostPassword?requested=1",
        Err(error) if error.code == ErrorCode::Unimplemented => "/lostPassword?error=unsupported",
        Err(_) => "/lostPassword?error=invalid",
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
    let invalid_path = if hash_string.is_empty() {
        "/resetPassword?error=invalid".to_string()
    } else {
        format!("/resetPassword?error=invalid&s={hash_string}")
    };
    let redirect_path =
        match complete_password_reset(&service, &hash_string, &password, &retyped_password).await {
            Ok(()) => "/users/loginform?password=reset".to_string(),
            Err(error) if error.code == ErrorCode::Unimplemented => {
                "/resetPassword?error=unsupported".to_string()
            }
            Err(_) => invalid_path,
        };

    Redirect::to(&base_path_href(&service.base_path, &redirect_path)).into_response()
}

async fn request_password_reset_email(
    service: &PilotServiceImpl,
    login_id: &str,
    email_address: &str,
) -> Result<(), ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "password reset requires repository backend",
        ));
    };
    let login_id = normalize_identifier(login_id);
    let email_address = normalize_identifier(email_address);
    let Some(user) = repository
        .find_user_by_login_id(&login_id)
        .await
        .map_err(crate::internal_error)?
    else {
        return Err(ConnectError::invalid_argument(
            "site.resetPasswordEmail.invalidRequest",
        ));
    };
    if normalize_identifier(&user.email_address) != email_address {
        return Err(ConnectError::invalid_argument(
            "site.resetPasswordEmail.invalidRequest",
        ));
    }

    let code = repository
        .create_password_reset_verification_for_user(user.id, &user.login_id)
        .await
        .map_err(crate::internal_error)?;
    send_password_reset_mail(
        &user.email_address,
        &code,
        &service.public_origin,
        &service.base_path,
        &service.site_name,
        &service.smtp.default_from(),
        &service.integrations,
    )?;
    Ok(())
}

async fn complete_password_reset(
    service: &PilotServiceImpl,
    hash_string: &str,
    password: &str,
    retyped_password: &str,
) -> Result<(), ConnectError> {
    if password.len() < LEGACY_MIN_PASSWORD_LENGTH || password != retyped_password {
        return Err(ConnectError::invalid_argument(
            "site.resetPasswordEmail.wrongUrl",
        ));
    }

    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "password reset requires repository backend",
        ));
    };
    let Some(user_id) = repository
        .find_valid_password_reset_user_id(hash_string)
        .await
        .map_err(crate::internal_error)?
    else {
        return Err(ConnectError::invalid_argument(
            "site.resetPasswordEmail.wrongUrl",
        ));
    };
    let password_hash = hash(password, DEFAULT_COST).map_err(crate::internal_error)?;
    repository
        .update_password_hash_for_user(user_id, &password_hash)
        .await
        .map_err(crate::internal_error)?;
    repository
        .delete_password_reset_verification(hash_string)
        .await
        .map_err(crate::internal_error)?;
    Ok(())
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

fn post_auth_landing_path(
    redirect_path: Option<&String>,
    default_landing_path: Option<&str>,
) -> String {
    resolve_post_auth_landing_path(redirect_path.map(String::as_str), default_landing_path)
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
                Some(&payload.default_landing_path),
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
                .to_string()
            } else {
                post_auth_landing_path(None, Some(&payload.default_landing_path))
            };
            redirect_with_context_headers(&service.base_path, &redirect_path, &ctx)
        }
        Err(error) => RestRouteError::from_connect_error(error).into_response(),
    }
}

async fn update_legacy_default_site_admin(
    service: &PilotServiceImpl,
    name: &str,
    email: &str,
    password: &str,
    retyped_password: &str,
) -> Result<(), ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(ConnectError::unimplemented(
            "auth requires repository backend",
        ));
    };

    if name.trim().is_empty() {
        return Err(ConnectError::invalid_argument("validation.required"));
    }
    let email_address = normalize_identifier(email);
    if email_address.is_empty() {
        return Err(ConnectError::invalid_argument("validation.invalidEmail"));
    }
    if password.len() < LEGACY_MIN_PASSWORD_LENGTH {
        return Err(ConnectError::invalid_argument(
            "validation.tooShortPassword",
        ));
    }
    if password != retyped_password {
        return Err(ConnectError::invalid_argument(
            "validation.passwordMismatch",
        ));
    }

    let password_hash = match hash(&password, DEFAULT_COST) {
        Ok(password_hash) => password_hash,
        Err(error) => return Err(crate::internal_error(error)),
    };
    match repository
        .update_default_site_admin(name.trim(), &email_address, &password_hash)
        .await
    {
        Ok(_) => Ok(()),
        Err(error) => Err(crate::internal_error(error)),
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

fn legacy_oauth_provider_display_name(provider: &str) -> String {
    match provider {
        "github" => "GitHub",
        "google" => "Google",
        _ => provider,
    }
    .to_string()
}

fn oauth_provider_configured<'a>(
    service: &'a PilotServiceImpl,
    provider: &str,
) -> Option<&'a crate::OAuthProviderRuntimeConfig> {
    let provider = provider.to_ascii_lowercase();
    if !service
        .auth_ui
        .enabled_social_providers
        .iter()
        .any(|configured| configured.trim().eq_ignore_ascii_case(&provider))
    {
        return None;
    }
    let config = service.oauth.configured_provider(&provider)?;
    if config.client_id.trim().is_empty() || config.authorization_url.trim().is_empty() {
        return None;
    }
    Some(config)
}

fn oauth_callback_identity(query: &HashMap<String, String>) -> Option<(String, String, String)> {
    let provider_user_id = query
        .get("providerUserId")
        .or_else(|| query.get("provider_user_id"))
        .or_else(|| query.get("id"))
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())?;
    let email = query
        .get("email")
        .map(|value| normalize_identifier(value))
        .filter(|value| !value.is_empty())?;
    let name = query
        .get("name")
        .or_else(|| query.get("displayName"))
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| email.clone());
    Some((provider_user_id, email, name))
}

#[derive(Debug)]
struct OAuthProviderIdentity {
    provider_user_id: String,
    email: String,
    name: String,
}

fn json_string_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn json_id_field(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(|field| match field {
        Value::String(value) => {
            let value = value.trim();
            (!value.is_empty()).then(|| value.to_string())
        }
        Value::Number(value) => Some(value.to_string()),
        _ => None,
    })
}

fn github_primary_email(value: &Value) -> Option<String> {
    let emails = value.as_array()?;
    emails
        .iter()
        .find(|entry| {
            entry
                .get("primary")
                .and_then(Value::as_bool)
                .unwrap_or(false)
                && entry
                    .get("verified")
                    .and_then(Value::as_bool)
                    .unwrap_or(true)
        })
        .or_else(|| emails.first())
        .and_then(|entry| json_string_field(entry, "email"))
        .map(|email| normalize_identifier(&email))
        .filter(|email| !email.is_empty())
}

fn oauth_provider_identity_from_userinfo(
    provider: &str,
    userinfo: &Value,
    email_response: Option<&Value>,
) -> Option<OAuthProviderIdentity> {
    match provider {
        "github" => {
            let provider_user_id = json_id_field(userinfo, "id")?;
            let email = json_string_field(userinfo, "email")
                .map(|email| normalize_identifier(&email))
                .filter(|email| !email.is_empty())
                .or_else(|| github_primary_email(email_response?))?;
            let name = json_string_field(userinfo, "name")
                .or_else(|| json_string_field(userinfo, "login"))
                .unwrap_or_else(|| email.clone());
            Some(OAuthProviderIdentity {
                provider_user_id,
                email,
                name,
            })
        }
        "google" => {
            let provider_user_id =
                json_id_field(userinfo, "sub").or_else(|| json_id_field(userinfo, "id"))?;
            let email = json_string_field(userinfo, "email")
                .map(|email| normalize_identifier(&email))
                .filter(|email| !email.is_empty())?;
            let name = json_string_field(userinfo, "name")
                .or_else(|| json_string_field(userinfo, "displayName"))
                .unwrap_or_else(|| email.clone());
            Some(OAuthProviderIdentity {
                provider_user_id,
                email,
                name,
            })
        }
        _ => None,
    }
}

async fn fetch_oauth_provider_identity(
    provider: &str,
    config: &crate::OAuthProviderRuntimeConfig,
    code: &str,
    redirect_uri: &str,
) -> Result<OAuthProviderIdentity, String> {
    if config.client_secret.trim().is_empty()
        || config.access_token_url.trim().is_empty()
        || config.user_info_url.trim().is_empty()
    {
        return Err("oauth provider exchange is not fully configured".to_string());
    }

    let client = reqwest::Client::builder()
        .user_agent("Yoram OAuth")
        .build()
        .map_err(|error| error.to_string())?;
    let token_response: Value = client
        .post(config.access_token_url.trim())
        .header(reqwest::header::ACCEPT, "application/json")
        .form(&[
            ("client_id", config.client_id.trim()),
            ("client_secret", config.client_secret.trim()),
            ("code", code.trim()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri),
        ])
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json()
        .await
        .map_err(|error| error.to_string())?;
    let access_token = json_string_field(&token_response, "access_token")
        .ok_or_else(|| "oauth token response did not include access_token".to_string())?;
    let userinfo: Value = client
        .get(config.user_info_url.trim())
        .bearer_auth(&access_token)
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json()
        .await
        .map_err(|error| error.to_string())?;
    let email_response = if provider == "github" && !config.email_url.trim().is_empty() {
        Some(
            client
                .get(config.email_url.trim())
                .bearer_auth(&access_token)
                .header(reqwest::header::ACCEPT, "application/json")
                .send()
                .await
                .map_err(|error| error.to_string())?
                .error_for_status()
                .map_err(|error| error.to_string())?
                .json()
                .await
                .map_err(|error| error.to_string())?,
        )
    } else {
        None
    };
    oauth_provider_identity_from_userinfo(provider, &userinfo, email_response.as_ref())
        .ok_or_else(|| "oauth provider identity response was incomplete".to_string())
}

fn oauth_login_id_hint(query: &HashMap<String, String>, email: &str) -> String {
    query
        .get("loginId")
        .or_else(|| query.get("login_id"))
        .map(|value| normalize_identifier(value))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            email
                .split_once('@')
                .map(|(local, _)| normalize_identifier(local))
                .filter(|local| !local.is_empty())
                .unwrap_or_else(|| "user".to_string())
        })
}

fn configured_oauth_start_redirect(
    provider: &str,
    config: &crate::OAuthProviderRuntimeConfig,
    service: &PilotServiceImpl,
) -> Response {
    let redirect_uri = format!(
        "{}{}",
        service.public_origin,
        base_path_href(&service.base_path, &format!("/authenticate/{provider}"))
    );
    let mut location = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&state=yona-oauth",
        config.authorization_url.trim(),
        percent_encode_uri_component(config.client_id.trim()),
        percent_encode_uri_component(&redirect_uri)
    );
    if !config.scope.trim().is_empty() {
        location.push_str("&scope=");
        location.push_str(&percent_encode_uri_component(config.scope.trim()));
    }
    Redirect::to(&location).into_response()
}

pub(crate) async fn direct_authenticate_provider(
    headers: HeaderMap,
    provider: String,
    query: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let provider = provider.trim().to_ascii_lowercase();
    let Some(config) = oauth_provider_configured(&service, &provider).cloned() else {
        return direct_unsupported_authenticate_provider(provider, service).await;
    };

    if query
        .get("error")
        .map(|value| value.eq_ignore_ascii_case("access_denied"))
        .unwrap_or(false)
    {
        return direct_authenticate_provider_denied(provider, service).await;
    }

    let (provider_user_id, email, name) = if let Some(identity) = oauth_callback_identity(&query) {
        identity
    } else {
        let Some(code) = query
            .get("code")
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
        else {
            return configured_oauth_start_redirect(&provider, &config, &service);
        };
        let redirect_uri = format!(
            "{}{}",
            service.public_origin,
            base_path_href(&service.base_path, &format!("/authenticate/{provider}"))
        );
        match fetch_oauth_provider_identity(&provider, &config, code, &redirect_uri).await {
            Ok(identity) => (identity.provider_user_id, identity.email, identity.name),
            Err(error) => {
                tracing::warn!(provider = %provider, error = %error, "OAuth provider callback exchange failed");
                return direct_authenticate_provider_denied(provider, service).await;
            }
        }
    };

    let PilotBackend::Repository(repository) = &service.backend else {
        return direct_unsupported_authenticate_provider(provider, service).await;
    };
    let session = service.session_manager.ensure_anonymous_session(&headers);
    let password_hash = match hash(format!("{provider}:{provider_user_id}:oauth"), DEFAULT_COST) {
        Ok(password_hash) => password_hash,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let login_id_hint = oauth_login_id_hint(&query, &email);
    let user = match repository
        .link_or_create_oauth_user(OAuthUserInput {
            email_address: email,
            display_name: name,
            login_id_hint,
            password_hash,
            provider: provider.clone(),
            provider_display_name: legacy_oauth_provider_display_name(&provider),
            provider_user_id,
        })
        .await
    {
        Ok(user) => user,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };

    let authenticated_session =
        service
            .session_manager
            .create_authenticated_session(Some(&session.token), user.id, false);
    if let Err(error) = crate::persist_preferred_language_from_headers(
        repository,
        user.id,
        &headers,
        &service.supported_languages,
    )
    .await
    {
        return RestRouteError::from_connect_error(error).into_response();
    }
    let default_landing_path = repository
        .read_default_landing_path(user.id)
        .await
        .ok()
        .flatten();
    let redirect_path =
        post_auth_landing_path(query.get("redirectUrl"), default_landing_path.as_deref());
    let mut response =
        Redirect::to(&base_path_href(&service.base_path, &redirect_path)).into_response();
    for cookie in service
        .session_manager
        .build_set_cookie_headers(&authenticated_session)
    {
        response.headers_mut().append(
            axum::http::header::SET_COOKIE,
            cookie.parse().expect("set-cookie header"),
        );
    }
    response
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
    let legacy_reset_password_page_assets = assets.clone();
    let legacy_reset_password_page_browser_runtime = browser_runtime.clone();
    let direct_secret_page_service = service.clone();
    let legacy_secret_page_assets = assets.clone();
    let legacy_secret_page_browser_runtime = browser_runtime.clone();
    let legacy_restart_page_assets = assets;
    let legacy_restart_page_browser_runtime = browser_runtime;
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
            get(
                move |headers: HeaderMap,
                      Path(provider): Path<String>,
                      Query(query): Query<HashMap<String, String>>| async move {
                    direct_authenticate_provider(
                        headers,
                        provider,
                        query,
                        authenticate_service.clone(),
                    )
                    .await
                },
            ),
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
            "/secret",
            get(move || {
                let service = direct_secret_page_service.clone();
                let assets = legacy_secret_page_assets.clone();
                let browser_runtime = legacy_secret_page_browser_runtime.clone();
                async move { direct_secret_page(service, assets, browser_runtime).await }
            }),
        )
        .route(
            "/restart",
            get(move || {
                let assets = legacy_restart_page_assets.clone();
                let browser_runtime = legacy_restart_page_browser_runtime.clone();
                async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
            }),
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

async fn direct_secret_page(
    service: PilotServiceImpl,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    match secret_admin_setup_required(&service).await {
        Ok(true) => serve_frontend_page(assets, Method::GET, browser_runtime).await,
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(error) => RestRouteError::from_connect_error(error).into_response(),
    }
}

pub(crate) async fn secret_admin_setup_required(
    service: &PilotServiceImpl,
) -> Result<bool, ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Ok(false);
    };
    let admin = repository
        .find_user_by_login_id("admin")
        .await
        .map_err(crate::internal_error)?;
    Ok(!admin.is_some_and(|admin| admin.is_site_admin))
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
