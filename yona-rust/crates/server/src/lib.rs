pub mod persistence;
pub mod runtime_config;
pub mod session;

use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{extract::Path, http::Method};
use axum::{Json, Router};
use bcrypt::{hash, verify, DEFAULT_COST};
use buffa::view::OwnedView;
use connectrpc::{ConnectError, Context};
use http::header::SET_COOKIE;
use http::HeaderValue;
use runtime_config::normalize_base_path;
use serde::Serialize;
use session::{SessionConfig, SessionManager};
use std::sync::Arc;
use std::{path::PathBuf, vec};

use generated::yona::pilot::v1::*;
use persistence::PilotRepository;
use yona_rust_domain::{
    authorize_project_access, can_create_organization_project, can_create_personal_project,
    can_request_project_enrollment, can_update_organization, is_valid_organization_name,
    is_valid_project_name, normalize_default_landing_path, ProjectAccessFacts, ProjectOperation,
    ProjectScope, DEFAULT_LANDING_FALLBACK_PATH,
};

#[allow(clippy::missing_panics_doc)]
pub mod generated {
    include!(concat!(env!("OUT_DIR"), "/_connectrpc.rs"));
}

pub mod embedded_assets {
    include!(concat!(env!("OUT_DIR"), "/_embedded_assets.rs"));
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct RuntimeConfig {
    pub base_path: String,
    pub public_origin: String,
}

pub fn create_router(config: RuntimeConfig) -> Router {
    build_router(config, PilotBackend::Static, AssetMode::None)
}

pub fn create_router_with_repository(config: RuntimeConfig, repository: PilotRepository) -> Router {
    build_router(
        config,
        PilotBackend::Repository(repository),
        AssetMode::None,
    )
}

pub fn create_router_with_app_repository(
    config: RuntimeConfig,
    repository: PilotRepository,
) -> Router {
    create_router_with_repository(config, repository)
}

pub fn create_router_with_filesystem_assets(config: RuntimeConfig, asset_root: PathBuf) -> Router {
    build_router(
        config,
        PilotBackend::Static,
        AssetMode::Filesystem(asset_root),
    )
}

pub fn create_router_with_embedded_assets(config: RuntimeConfig) -> Router {
    build_router(config, PilotBackend::Static, AssetMode::Embedded)
}

pub fn create_router_with_repository_and_filesystem_assets(
    config: RuntimeConfig,
    repository: PilotRepository,
    asset_root: PathBuf,
) -> Router {
    build_router(
        config,
        PilotBackend::Repository(repository),
        AssetMode::Filesystem(asset_root),
    )
}

pub fn create_router_with_repository_and_embedded_assets(
    config: RuntimeConfig,
    repository: PilotRepository,
) -> Router {
    build_router(
        config,
        PilotBackend::Repository(repository),
        AssetMode::Embedded,
    )
}

fn build_router(config: RuntimeConfig, backend: PilotBackend, assets: AssetMode) -> Router {
    let base_path = normalize_base_path(&config.base_path);
    let session_manager = SessionManager::new(SessionConfig {
        cookie_path: base_path.clone(),
        public_origin: config.public_origin,
    });
    let route_backend = backend.clone();
    let browser_runtime = BrowserRuntimeConfig::from_base_path(&base_path);
    let connect_router = Arc::new(PilotServiceImpl {
        session_manager: session_manager.clone(),
        backend,
    })
    .register(connectrpc::Router::new())
    .into_axum_service();

    let mut base_router = Router::new()
        .route(
            "/api/auth/session",
            get(move |headers: HeaderMap| {
                let session_manager = session_manager.clone();
                let backend = route_backend.clone();
                async move { session_bootstrap(headers, session_manager, backend).await }
            }),
        )
        .nest_service("/rpc", connect_router);

    match assets.clone() {
        AssetMode::Filesystem(asset_root) => {
            let asset_root_for_assets = asset_root.clone();
            let browser_runtime_for_assets = browser_runtime.clone();
            let asset_root_for_index = asset_root.clone();
            let browser_runtime_for_index = browser_runtime.clone();
            let asset_root_for_fallback = asset_root.clone();
            let browser_runtime_for_fallback = browser_runtime.clone();

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

            base_router =
                base_router
                    .route(
                        "/assets/{*path}",
                        get(move |Path(path): Path<String>| {
                            let asset_root = asset_root_for_assets.clone();
                            let browser_runtime = browser_runtime_for_assets.clone();
                            async move {
                                serve_filesystem_asset(asset_root, &path, browser_runtime).await
                            }
                        }),
                    )
                    .fallback(move |method: Method| {
                        let asset_root = asset_root_for_fallback.clone();
                        let browser_runtime = browser_runtime_for_fallback.clone();
                        async move {
                            serve_filesystem_fallback(asset_root, method, browser_runtime).await
                        }
                    });
        }
        AssetMode::Embedded => {
            let browser_runtime_for_index = browser_runtime.clone();
            let browser_runtime_for_assets = browser_runtime.clone();
            let browser_runtime_for_fallback = browser_runtime.clone();

            if base_path == "/" {
                base_router = base_router.route(
                    "/",
                    get(move || {
                        let browser_runtime = browser_runtime_for_index.clone();
                        async move { serve_embedded_index_html(browser_runtime).await }
                    }),
                );
            }

            base_router = base_router
                .route(
                    "/assets/{*path}",
                    get(move |Path(path): Path<String>| {
                        let browser_runtime = browser_runtime_for_assets.clone();
                        async move { serve_embedded_asset(&path, browser_runtime).await }
                    }),
                )
                .fallback(move |method: Method| {
                    let browser_runtime = browser_runtime_for_fallback.clone();
                    async move { serve_embedded_fallback(method, browser_runtime).await }
                });
        }
        AssetMode::None => {}
    }

    if base_path == "/" {
        base_router
    } else if let AssetMode::Filesystem(asset_root) = assets {
        let browser_runtime_for_mount = browser_runtime.clone();
        let asset_root_for_mount = asset_root.clone();

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
        let browser_runtime_for_mount = browser_runtime.clone();

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

async fn session_bootstrap(
    headers: HeaderMap,
    session_manager: SessionManager,
    backend: PilotBackend,
) -> impl IntoResponse {
    let session = session_manager.ensure_anonymous_session(&headers);
    let payload = build_session_route_payload(&backend, &session).await;
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

#[derive(Clone)]
struct PilotServiceImpl {
    session_manager: SessionManager,
    backend: PilotBackend,
}

#[derive(Clone)]
enum PilotBackend {
    Static,
    Repository(PilotRepository),
}

#[derive(Clone)]
enum AssetMode {
    None,
    Filesystem(PathBuf),
    Embedded,
}

#[derive(Clone, Serialize)]
struct BrowserRuntimeConfig {
    #[serde(rename = "apiBaseUrl")]
    api_base_url: String,
    #[serde(rename = "basePath")]
    base_path: String,
    #[serde(rename = "rpcBaseUrl")]
    rpc_base_url: String,
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

impl BrowserRuntimeConfig {
    fn from_base_path(base_path: &str) -> Self {
        let base_path = normalize_base_path(base_path);
        let api_base_url = if base_path == "/" {
            "/api".to_string()
        } else {
            format!("{base_path}/api")
        };
        let rpc_base_url = if base_path == "/" {
            "/rpc".to_string()
        } else {
            format!("{base_path}/rpc")
        };

        Self {
            api_base_url,
            base_path,
            rpc_base_url,
        }
    }
}

fn fixed_auth_ui_capabilities() -> ReadAuthUiCapabilitiesResponse {
    fn parse_bool_env(name: &str) -> bool {
        std::env::var(name)
            .map(|value| matches!(value.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"))
            .unwrap_or(false)
    }

    ReadAuthUiCapabilitiesResponse {
        email_verification_enabled: parse_bool_env("YONA_AUTH_EMAIL_VERIFICATION_ENABLED"),
        enabled_social_providers: vec![],
        signup_require_confirm: parse_bool_env("YONA_AUTH_SIGNUP_REQUIRE_CONFIRM"),
        social_login_only: parse_bool_env("YONA_AUTH_SOCIAL_LOGIN_ONLY"),
        ..Default::default()
    }
}

fn normalize_identifier(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn current_session_response_from_user(
    user: &persistence::AppUserRecord,
    default_landing_path: Option<String>,
) -> ReadCurrentSessionResponse {
    ReadCurrentSessionResponse {
        actor_id: user.id,
        default_landing_path: default_landing_path
            .unwrap_or_else(|| DEFAULT_LANDING_FALLBACK_PATH.to_string()),
        email_address: user.email_address.clone(),
        is_anonymous: false,
        is_confirmed: user.is_confirmed,
        is_site_admin: user.is_site_admin,
        login_id: user.login_id.clone(),
        user_label: user.display_name.clone(),
        ..Default::default()
    }
}

fn anonymous_current_session_response() -> ReadCurrentSessionResponse {
    ReadCurrentSessionResponse {
        is_anonymous: true,
        default_landing_path: DEFAULT_LANDING_FALLBACK_PATH.to_string(),
        ..Default::default()
    }
}

async fn resolve_current_session_response(
    backend: &PilotBackend,
    session: Option<&session::Session>,
) -> Result<ReadCurrentSessionResponse, ConnectError> {
    let Some(session) = session else {
        return Ok(anonymous_current_session_response());
    };

    let Some(user_id) = session.user_id else {
        return Ok(anonymous_current_session_response());
    };

    match backend {
        PilotBackend::Repository(repository) => {
            let Some(user) = repository
                .find_user_by_id(user_id)
                .await
                .map_err(internal_error)?
            else {
                return Ok(anonymous_current_session_response());
            };
            let default_landing_path = repository
                .read_default_landing_path(user_id)
                .await
                .map_err(internal_error)?;
            Ok(current_session_response_from_user(
                &user,
                default_landing_path,
            ))
        }
        PilotBackend::Static => Ok(anonymous_current_session_response()),
    }
}

async fn build_session_route_payload(
    backend: &PilotBackend,
    session: &session::Session,
) -> SessionRoutePayload {
    let Ok(projection) = resolve_current_session_response(backend, Some(session)).await else {
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

fn internal_error(error: impl ToString) -> ConnectError {
    ConnectError::new(connectrpc::ErrorCode::Internal, error.to_string())
}

fn require_session<'a>(
    session_manager: &SessionManager,
    headers: &'a HeaderMap,
) -> Result<session::Session, ConnectError> {
    session_manager
        .read_session_from_headers(headers)
        .ok_or_else(|| ConnectError::unauthenticated("missing pilot session"))
}

fn require_valid_csrf(
    session_manager: &SessionManager,
    headers: &HeaderMap,
    session: &session::Session,
) -> Result<(), ConnectError> {
    if session_manager.validate_csrf(headers, session) {
        Ok(())
    } else {
        Err(ConnectError::permission_denied("invalid csrf token"))
    }
}

fn attach_session_headers(
    ctx: &mut Context,
    session_manager: &SessionManager,
    session: &session::Session,
) {
    ctx.response_headers.insert(
        "x-csrf-token",
        HeaderValue::from_str(&session.csrf_token).expect("csrf header"),
    );
    for cookie in session_manager.build_set_cookie_headers(session) {
        ctx.response_headers.append(
            SET_COOKIE,
            HeaderValue::from_str(&cookie).expect("set-cookie header"),
        );
    }
}

fn map_project_scope(value: &str) -> Result<ProjectScope, ConnectError> {
    ProjectScope::try_from(value)
        .map_err(|_| ConnectError::invalid_argument("invalid project scope"))
}

fn workspace_project_item_from_entry(item: &persistence::ProjectListEntry) -> ProjectListItem {
    ProjectListItem {
        owner_name: item.owner_name.clone(),
        project_name: item.project_name.clone(),
        overview: String::new(),
        project_scope: String::new(),
        ..Default::default()
    }
}

fn workspace_email_from_record(record: &persistence::WorkspaceEmailRecord) -> WorkspaceEmail {
    WorkspaceEmail {
        email_address: record.email_address.clone(),
        id: record.id.clone(),
        valid: record.valid,
        ..Default::default()
    }
}

fn workspace_notification_from_record(
    record: &persistence::WorkspaceNotificationPreferenceRecord,
) -> WorkspaceNotificationPreference {
    WorkspaceNotificationPreference {
        enabled: record.enabled,
        event_type: record.event_type.clone(),
        label: record.label.clone(),
        ..Default::default()
    }
}

fn watched_project_notifications_from_record(
    record: &persistence::WatchedProjectNotificationsRecord,
) -> WatchedProjectNotifications {
    WatchedProjectNotifications {
        notifications: record
            .notifications
            .iter()
            .map(workspace_notification_from_record)
            .collect(),
        owner_name: record.owner_name.clone(),
        project_id: record.project_id.clone(),
        project_name: record.project_name.clone(),
        ..Default::default()
    }
}

async fn load_workspace_project_lists(
    repository: &PilotRepository,
    user_id: i64,
) -> Result<(Vec<ProjectListItem>, Vec<ProjectListItem>), ConnectError> {
    let favorite_projects = repository
        .list_favorite_projects_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(workspace_project_item_from_entry)
        .collect();
    let recent_projects = repository
        .list_recent_projects_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(workspace_project_item_from_entry)
        .collect();

    Ok((favorite_projects, recent_projects))
}

async fn load_workspace_settings_data(
    repository: &PilotRepository,
    user_id: i64,
) -> Result<(String, Vec<WorkspaceEmail>, Vec<WatchedProjectNotifications>), ConnectError> {
    let api_token = repository
        .read_api_token_for_user(user_id)
        .await
        .map_err(internal_error)?
        .unwrap_or_default();
    let emails = repository
        .list_workspace_emails_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(workspace_email_from_record)
        .collect();
    let watched_projects = repository
        .list_watched_project_notifications_for_user(user_id)
        .await
        .map_err(internal_error)?
        .iter()
        .map(watched_project_notifications_from_record)
        .collect();

    Ok((api_token, emails, watched_projects))
}

fn organization_detail_from_record(
    record: &persistence::OrganizationRecord,
    viewer_can_update: bool,
) -> OrganizationDetail {
    OrganizationDetail {
        organization_name: record.organization_name.clone(),
        description: record.description.clone().unwrap_or_default(),
        viewer_can_update,
        ..Default::default()
    }
}

fn project_detail_from_record(
    authorization: &persistence::ProjectAuthorizationRecord,
    viewer_can_update: bool,
    viewer_can_enroll: bool,
) -> ProjectDetail {
    ProjectDetail {
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        organization_name: authorization
            .project
            .organization_name
            .clone()
            .unwrap_or_default(),
        overview: authorization.project.overview.clone().unwrap_or_default(),
        project_scope: authorization.project.project_scope.clone(),
        viewer_can_update,
        viewer_can_enroll,
        enrollment_requested: authorization.enrollment_requested,
        is_favorited: authorization.is_favorited,
        ..Default::default()
    }
}

impl PilotService for PilotServiceImpl {
    async fn read_current_session(
        &self,
        ctx: Context,
        _request: OwnedView<ReadCurrentSessionRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        let response = resolve_current_session_response(&self.backend, session.as_ref()).await?;
        Ok((response, ctx))
    }

    async fn read_auth_ui_capabilities(
        &self,
        ctx: Context,
        _request: OwnedView<ReadAuthUiCapabilitiesRequestView<'static>>,
    ) -> Result<(ReadAuthUiCapabilitiesResponse, Context), ConnectError> {
        Ok((fixed_auth_ui_capabilities(), ctx))
    }

    async fn sign_in_with_password(
        &self,
        mut ctx: Context,
        request: OwnedView<SignInWithPasswordRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "auth requires repository backend",
            ));
        };

        let identifier = normalize_identifier(request.identifier);
        if identifier.is_empty() || request.password.len() < 8 {
            return Err(ConnectError::invalid_argument("invalid sign-in request"));
        }

        let Some(user) = repository
            .find_user_by_identifier(&identifier)
            .await
            .map_err(internal_error)?
        else {
            return Err(ConnectError::unauthenticated(
                "Invalid login ID, email, or password.",
            ));
        };

        let verified = verify(&request.password, &user.password_hash).map_err(internal_error)?;
        if !verified {
            return Err(ConnectError::unauthenticated(
                "Invalid login ID, email, or password.",
            ));
        }

        let authenticated_session = self
            .session_manager
            .create_authenticated_session(Some(&session.token), user.id);
        attach_session_headers(&mut ctx, &self.session_manager, &authenticated_session);

        let default_landing_path = repository
            .read_default_landing_path(user.id)
            .await
            .map_err(internal_error)?;
        Ok((
            current_session_response_from_user(&user, default_landing_path),
            ctx,
        ))
    }

    async fn register_with_password(
        &self,
        mut ctx: Context,
        request: OwnedView<RegisterWithPasswordRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "auth requires repository backend",
            ));
        };

        let login_id = normalize_identifier(request.login_id);
        let email_address = normalize_identifier(request.email_address);
        if login_id.is_empty() {
            return Err(ConnectError::invalid_argument("Login ID is required."));
        }
        if email_address.is_empty() {
            return Err(ConnectError::invalid_argument("Email address is required."));
        }
        if request.name.trim().is_empty() {
            return Err(ConnectError::invalid_argument("Name is required."));
        }
        if request.password.len() < 8 {
            return Err(ConnectError::invalid_argument(
                "Password must be at least 8 characters.",
            ));
        }
        if request.password != request.retyped_password {
            return Err(ConnectError::invalid_argument("Passwords do not match."));
        }

        if repository
            .find_user_by_identifier(&login_id)
            .await
            .map_err(internal_error)?
            .is_some()
            || repository
                .find_user_by_identifier(&email_address)
                .await
                .map_err(internal_error)?
                .is_some()
        {
            return Err(ConnectError::already_exists(
                "Login ID or email is already in use.",
            ));
        }

        let password_hash = hash(&request.password, DEFAULT_COST).map_err(internal_error)?;
        let user = repository
            .create_user(persistence::CreateUserInput {
                display_name: request.name.trim().to_string(),
                email_address,
                is_confirmed: true,
                is_site_admin: false,
                login_id,
                password_hash,
            })
            .await
            .map_err(internal_error)?;

        let authenticated_session = self
            .session_manager
            .create_authenticated_session(Some(&session.token), user.id);
        attach_session_headers(&mut ctx, &self.session_manager, &authenticated_session);

        Ok((current_session_response_from_user(&user, None), ctx))
    }

    async fn sign_out(
        &self,
        mut ctx: Context,
        _request: OwnedView<SignOutRequestView<'static>>,
    ) -> Result<(ReadCurrentSessionResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;

        let anonymous_session = self
            .session_manager
            .create_anonymous_session(Some(&session.token));
        attach_session_headers(&mut ctx, &self.session_manager, &anonymous_session);

        Ok((anonymous_current_session_response(), ctx))
    }

    async fn read_workspace_overview(
        &self,
        ctx: Context,
        _request: OwnedView<ReadWorkspaceOverviewRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let response = resolve_current_session_response(&self.backend, Some(&session)).await?;
        if response.is_anonymous {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        }

        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };
        let (favorite_projects, recent_projects) =
            load_workspace_project_lists(repository, user_id).await?;
        let (api_token, emails, watched_projects) =
            load_workspace_settings_data(repository, user_id).await?;

        Ok((
            ReadWorkspaceOverviewResponse {
                api_token,
                default_landing_path: response.default_landing_path.clone(),
                emails,
                favorite_projects,
                recent_projects,
                session: Some(response).into(),
                watched_projects,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn set_default_landing_path(
        &self,
        ctx: Context,
        request: OwnedView<SetDefaultLandingPathRequestView<'static>>,
    ) -> Result<(ReadWorkspaceOverviewResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "workspace requires repository backend",
            ));
        };

        let Some(path) = normalize_default_landing_path(Some(&request.path)) else {
            return Err(ConnectError::invalid_argument(
                "invalid default landing path",
            ));
        };
        repository
            .set_default_landing_path(user_id, Some(path))
            .await
            .map_err(internal_error)?;

        let updated = resolve_current_session_response(&self.backend, Some(&session)).await?;
        let (favorite_projects, recent_projects) =
            load_workspace_project_lists(repository, user_id).await?;
        let (api_token, emails, watched_projects) =
            load_workspace_settings_data(repository, user_id).await?;
        Ok((
            ReadWorkspaceOverviewResponse {
                api_token,
                default_landing_path: updated.default_landing_path.clone(),
                emails,
                favorite_projects,
                recent_projects,
                session: Some(updated).into(),
                watched_projects,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn create_organization(
        &self,
        mut ctx: Context,
        request: OwnedView<CreateOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };

        if !is_valid_organization_name(request.organization_name) || request.description.len() > 255
        {
            return Err(ConnectError::invalid_argument(
                "invalid organization request",
            ));
        }
        if repository
            .organization_name_exists(request.organization_name)
            .await
            .map_err(internal_error)?
            || repository
                .user_login_id_exists(request.organization_name)
                .await
                .map_err(internal_error)?
        {
            return Err(ConnectError::already_exists(
                "Organization name is already in use.",
            ));
        }

        let organization = repository
            .create_organization(persistence::CreateOrganizationInput {
                description: Some(request.description.trim().to_string()),
                organization_name: request.organization_name.trim().to_string(),
            })
            .await
            .map_err(internal_error)?;
        repository
            .add_organization_membership(organization.id, user_id, "org_admin")
            .await
            .map_err(internal_error)?;
        attach_session_headers(&mut ctx, &self.session_manager, &session);

        Ok((
            organization_detail_from_record(
                &persistence::OrganizationRecord {
                    id: organization.id,
                    organization_name: organization.organization_name,
                    description: organization.description,
                },
                true,
            ),
            ctx,
        ))
    }

    async fn read_organization_detail(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationDetailRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        let actor_id = self
            .session_manager
            .read_session_from_headers(&ctx.headers)
            .and_then(|session| session.user_id);
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, actor_id)
            .await
            .map_err(internal_error)?;
        if let Some(authorization) = authorization {
            return Ok((
                organization_detail_from_record(
                    &authorization.organization,
                    can_update_organization(
                        authorization.viewer.is_organization_admin,
                        authorization.viewer.is_site_admin,
                    ),
                ),
                ctx,
            ));
        }

        let organization = repository
            .read_organization_by_name(request.organization_name)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            organization_detail_from_record(
                &persistence::OrganizationRecord {
                    id: organization.id,
                    organization_name: organization.organization_name,
                    description: organization.description,
                },
                false,
            ),
            ctx,
        ))
    }

    async fn read_organization_settings(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationSettingsRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        Ok((
            organization_detail_from_record(&authorization.organization, true),
            ctx,
        ))
    }

    async fn read_organization_members(
        &self,
        ctx: Context,
        request: OwnedView<ReadOrganizationMembersRequestView<'static>>,
    ) -> Result<(ReadOrganizationMembersResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        let authorization = repository
            .read_organization_authorization(request.organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        let directory = repository
            .read_organization_members(request.organization_name)
            .await
            .map_err(internal_error)?;
        Ok((
            ReadOrganizationMembersResponse {
                enrollment_requests: directory
                    .enrollment_requests
                    .into_iter()
                    .map(|request| OrganizationEnrollmentRequest {
                        login_id: request.login_id,
                        user_label: request.user_label,
                        ..Default::default()
                    })
                    .collect(),
                members: directory
                    .members
                    .into_iter()
                    .map(|member| OrganizationMember {
                        login_id: member.login_id,
                        role: member.role,
                        user_label: member.user_label,
                        ..Default::default()
                    })
                    .collect(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn update_organization(
        &self,
        ctx: Context,
        request: OwnedView<UpdateOrganizationRequestView<'static>>,
    ) -> Result<(OrganizationDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "organization requires repository backend",
            ));
        };
        if !is_valid_organization_name(request.organization_name) || request.description.len() > 255
        {
            return Err(ConnectError::invalid_argument(
                "invalid organization request",
            ));
        }

        let authorization = repository
            .read_organization_authorization(request.current_organization_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        if !can_update_organization(
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::permission_denied(
                "organization update is not allowed",
            ));
        }

        if normalize_identifier(request.current_organization_name)
            != normalize_identifier(request.organization_name)
            && (repository
                .organization_name_exists(request.organization_name)
                .await
                .map_err(internal_error)?
                || repository
                    .user_login_id_exists(request.organization_name)
                    .await
                    .map_err(internal_error)?)
        {
            return Err(ConnectError::already_exists(
                "Organization name is already in use.",
            ));
        }

        let updated = repository
            .update_organization(persistence::UpdateOrganizationInput {
                current_organization_name: request.current_organization_name.trim().to_string(),
                description: Some(request.description.trim().to_string()),
                organization_name: request.organization_name.trim().to_string(),
            })
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("organization not found"))?;
        Ok((
            organization_detail_from_record(
                &persistence::OrganizationRecord {
                    id: updated.id,
                    organization_name: updated.organization_name,
                    description: updated.description,
                },
                true,
            ),
            ctx,
        ))
    }

    async fn create_project(
        &self,
        ctx: Context,
        request: OwnedView<CreateProjectRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let scope = map_project_scope(request.project_scope)?;
        if !is_valid_project_name(request.project_name) || request.overview.len() > 255 {
            return Err(ConnectError::invalid_argument("invalid project request"));
        }
        if repository
            .project_identifier_exists(request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?
        {
            return Err(ConnectError::already_exists(
                "Project name is already in use for this owner.",
            ));
        }
        let actor = repository
            .find_user_by_id(user_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::unauthenticated("missing authenticated user"))?;

        let organization = repository
            .read_organization_authorization(request.owner_name, Some(user_id))
            .await
            .map_err(internal_error)?;
        let created = if let Some(organization) = organization {
            if !can_create_organization_project(organization.viewer.is_organization_admin) {
                return Err(ConnectError::permission_denied(
                    "organization project creation is not allowed",
                ));
            }
            repository
                .create_project(persistence::CreateProjectInput {
                    organization_id: Some(organization.organization.id),
                    owner_name: organization.organization.organization_name,
                    overview: Some(request.overview.trim().to_string()),
                    project_name: request.project_name.trim().to_string(),
                    project_scope: scope.as_str().to_string(),
                })
                .await
                .map_err(internal_error)?
        } else {
            if !can_create_personal_project(Some(&actor.login_id), request.owner_name) {
                return Err(ConnectError::invalid_argument("project owner is invalid"));
            }
            repository
                .create_project(persistence::CreateProjectInput {
                    organization_id: None,
                    owner_name: request.owner_name.trim().to_string(),
                    overview: Some(request.overview.trim().to_string()),
                    project_name: request.project_name.trim().to_string(),
                    project_scope: scope.as_str().to_string(),
                })
                .await
                .map_err(internal_error)?
        };
        repository
            .add_project_membership(created.id, user_id, "manager")
            .await
            .map_err(internal_error)?;
        let authorization = repository
            .read_project_authorization(&created.owner_name, &created.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        Ok((project_detail_from_record(&authorization, true, false), ctx))
    }

    async fn read_project_detail(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectDetailRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        let session = self.session_manager.read_session_from_headers(&ctx.headers);
        let actor_id = session.as_ref().and_then(|session| session.user_id);
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, actor_id)
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let decision = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: actor_id.is_none(),
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Read,
        );
        if !decision.allowed {
            return if actor_id.is_none() {
                Err(ConnectError::unauthenticated("project read is not allowed"))
            } else {
                Err(ConnectError::permission_denied(
                    "project read is not allowed",
                ))
            };
        }

        if let Some(user_id) = actor_id {
            repository
                .record_recent_project_visit(
                    user_id,
                    &authorization.project.owner_name,
                    &authorization.project.project_name,
                )
                .await
                .map_err(internal_error)?;
        }

        Ok((
            project_detail_from_record(
                &authorization,
                authorize_project_access(
                    &ProjectAccessFacts {
                        is_anonymous: actor_id.is_none(),
                        is_organization_admin: authorization.viewer.is_organization_admin,
                        is_organization_member: authorization.viewer.is_organization_member,
                        is_project_manager: authorization.viewer.is_project_manager,
                        is_project_member: authorization.viewer.is_project_member,
                        is_site_admin: authorization.viewer.is_site_admin,
                        project_scope: map_project_scope(&authorization.project.project_scope)?,
                    },
                    ProjectOperation::Update,
                )
                .allowed,
                can_request_project_enrollment(
                    actor_id.is_some(),
                    authorization.viewer.is_organization_admin,
                    authorization.viewer.is_organization_member,
                    authorization.viewer.is_project_manager,
                    authorization.viewer.is_project_member,
                    authorization.viewer.is_site_admin,
                ),
            ),
            ctx,
        ))
    }

    async fn read_project_settings(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectSettingsRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let can_update = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Update,
        )
        .allowed;
        if !can_update {
            return Err(ConnectError::permission_denied(
                "project update is not allowed",
            ));
        }

        Ok((project_detail_from_record(&authorization, true, false), ctx))
    }

    async fn read_project_members(
        &self,
        ctx: Context,
        request: OwnedView<ReadProjectMembersRequestView<'static>>,
    ) -> Result<(ReadProjectMembersResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let can_update = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Update,
        )
        .allowed;
        if !can_update {
            return Err(ConnectError::permission_denied(
                "project update is not allowed",
            ));
        }

        let directory = repository
            .read_project_members(request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?;
        Ok((
            ReadProjectMembersResponse {
                enrollment_requests: directory
                    .enrollment_requests
                    .into_iter()
                    .map(|request| ProjectEnrollmentRequest {
                        login_id: request.login_id,
                        user_label: request.user_label,
                        ..Default::default()
                    })
                    .collect(),
                members: directory
                    .members
                    .into_iter()
                    .map(|member| ProjectMember {
                        login_id: member.login_id,
                        role: member.role,
                        user_label: member.user_label,
                        ..Default::default()
                    })
                    .collect(),
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn update_project(
        &self,
        ctx: Context,
        request: OwnedView<UpdateProjectRequestView<'static>>,
    ) -> Result<(ProjectDetail, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        if !is_valid_project_name(request.project_name) || request.overview.len() > 255 {
            return Err(ConnectError::invalid_argument("invalid project request"));
        }
        let authorization = repository
            .read_project_authorization(
                request.current_owner_name,
                request.current_project_name,
                Some(user_id),
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let can_update = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Update,
        )
        .allowed;
        if !can_update {
            return Err(ConnectError::permission_denied(
                "project update is not allowed",
            ));
        }
        if normalize_identifier(request.current_owner_name)
            != normalize_identifier(request.owner_name)
        {
            return Err(ConnectError::invalid_argument(
                "project owner change is not supported in this packet",
            ));
        }
        if (normalize_identifier(request.current_owner_name)
            != normalize_identifier(request.owner_name)
            || normalize_identifier(request.current_project_name)
                != normalize_identifier(request.project_name))
            && repository
                .project_identifier_exists(request.owner_name, request.project_name)
                .await
                .map_err(internal_error)?
        {
            return Err(ConnectError::already_exists(
                "Project name is already in use for this owner.",
            ));
        }

        repository
            .update_project(persistence::UpdateProjectInput {
                current_owner_name: request.current_owner_name.trim().to_string(),
                current_project_name: request.current_project_name.trim().to_string(),
                overview: Some(request.overview.trim().to_string()),
                project_name: request.project_name.trim().to_string(),
                project_scope: map_project_scope(request.project_scope)?
                    .as_str()
                    .to_string(),
            })
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let updated = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        Ok((project_detail_from_record(&updated, true, false), ctx))
    }

    async fn enroll_project(
        &self,
        ctx: Context,
        request: OwnedView<EnrollProjectRequestView<'static>>,
    ) -> Result<(EnrollmentMutationResult, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        if !can_request_project_enrollment(
            true,
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_organization_member,
            authorization.viewer.is_project_manager,
            authorization.viewer.is_project_member,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::already_exists(
                "Project enrollment is only available to guests.",
            ));
        }
        repository
            .create_project_enrollment_request(authorization.project.id, user_id)
            .await
            .map_err(internal_error)?;
        Ok((
            EnrollmentMutationResult {
                ok: true,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn cancel_enroll_project(
        &self,
        ctx: Context,
        request: OwnedView<CancelEnrollProjectRequestView<'static>>,
    ) -> Result<(EnrollmentMutationResult, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        if !can_request_project_enrollment(
            true,
            authorization.viewer.is_organization_admin,
            authorization.viewer.is_organization_member,
            authorization.viewer.is_project_manager,
            authorization.viewer.is_project_member,
            authorization.viewer.is_site_admin,
        ) {
            return Err(ConnectError::already_exists(
                "Project enrollment is only available to guests.",
            ));
        }
        repository
            .delete_project_enrollment_request(authorization.project.id, user_id)
            .await
            .map_err(internal_error)?;
        Ok((
            EnrollmentMutationResult {
                ok: true,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn toggle_favorite_project(
        &self,
        ctx: Context,
        request: OwnedView<ToggleFavoriteProjectRequestView<'static>>,
    ) -> Result<(ToggleFavoriteProjectResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let can_read = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Read,
        )
        .allowed;
        if !can_read {
            return Err(ConnectError::permission_denied(
                "project read is not allowed",
            ));
        }
        let result = repository
            .toggle_favorite_project(user_id, request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?;
        Ok((
            ToggleFavoriteProjectResponse {
                favorited: result.favorited,
                owner_name: result.owner_name,
                project_name: result.project_name,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn record_recent_project_visit(
        &self,
        ctx: Context,
        request: OwnedView<RecordRecentProjectVisitRequestView<'static>>,
    ) -> Result<(RecordRecentProjectVisitResponse, Context), ConnectError> {
        let session = require_session(&self.session_manager, &ctx.headers)?;
        require_valid_csrf(&self.session_manager, &ctx.headers, &session)?;
        let Some(user_id) = session.user_id else {
            return Err(ConnectError::unauthenticated(
                "missing authenticated session",
            ));
        };
        let PilotBackend::Repository(repository) = &self.backend else {
            return Err(ConnectError::unimplemented(
                "project requires repository backend",
            ));
        };
        let authorization = repository
            .read_project_authorization(request.owner_name, request.project_name, Some(user_id))
            .await
            .map_err(internal_error)?
            .ok_or_else(|| ConnectError::not_found("project not found"))?;
        let can_read = authorize_project_access(
            &ProjectAccessFacts {
                is_anonymous: false,
                is_organization_admin: authorization.viewer.is_organization_admin,
                is_organization_member: authorization.viewer.is_organization_member,
                is_project_manager: authorization.viewer.is_project_manager,
                is_project_member: authorization.viewer.is_project_member,
                is_site_admin: authorization.viewer.is_site_admin,
                project_scope: map_project_scope(&authorization.project.project_scope)?,
            },
            ProjectOperation::Read,
        )
        .allowed;
        if !can_read {
            return Err(ConnectError::permission_denied(
                "project read is not allowed",
            ));
        }
        let result = repository
            .record_recent_project_visit(user_id, request.owner_name, request.project_name)
            .await
            .map_err(internal_error)?;
        Ok((
            RecordRecentProjectVisitResponse {
                owner_name: result.owner_name,
                project_name: result.project_name,
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn list_projects(
        &self,
        ctx: Context,
        _request: OwnedView<ListProjectsRequestView<'static>>,
    ) -> Result<(ListProjectsResponse, Context), ConnectError> {
        if let PilotBackend::Repository(repository) = &self.backend {
            let items = repository
                .list_projects()
                .await
                .map_err(|error| {
                    ConnectError::new(connectrpc::ErrorCode::Internal, error.to_string())
                })?
                .into_iter()
                .map(|item| ProjectListItem {
                    owner_name: item.owner_name,
                    project_name: item.project_name,
                    overview: item.overview.unwrap_or_default(),
                    project_scope: item.project_scope,
                    ..Default::default()
                })
                .collect();

            return Ok((
                ListProjectsResponse {
                    items,
                    ..Default::default()
                },
                ctx,
            ));
        }

        Ok((
            ListProjectsResponse {
                items: vec![ProjectListItem {
                    owner_name: "pilot".to_string(),
                    project_name: "yona".to_string(),
                    overview: "Pilot projects list is using the browser-safe route tree."
                        .to_string(),
                    project_scope: "public".to_string(),
                    ..Default::default()
                }],
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn list_organizations(
        &self,
        ctx: Context,
        _request: OwnedView<ListOrganizationsRequestView<'static>>,
    ) -> Result<(ListOrganizationsResponse, Context), ConnectError> {
        if let PilotBackend::Repository(repository) = &self.backend {
            let items = repository
                .list_organizations()
                .await
                .map_err(|error| {
                    ConnectError::new(connectrpc::ErrorCode::Internal, error.to_string())
                })?
                .into_iter()
                .map(|item| OrganizationListItem {
                    organization_name: item.organization_name,
                    description: item.description.unwrap_or_default(),
                    ..Default::default()
                })
                .collect();

            return Ok((
                ListOrganizationsResponse {
                    items,
                    ..Default::default()
                },
                ctx,
            ));
        }

        Ok((
            ListOrganizationsResponse {
                items: vec![OrganizationListItem {
                    organization_name: "pilot".to_string(),
                    description: "Pilot organization directory route foundation".to_string(),
                    ..Default::default()
                }],
                ..Default::default()
            },
            ctx,
        ))
    }

    async fn read_issue_detail(
        &self,
        ctx: Context,
        request: OwnedView<ReadIssueDetailRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        if request.owner_name.trim().is_empty()
            || request.project_name.trim().is_empty()
            || request.issue_number <= 0
        {
            return Err(ConnectError::invalid_argument(
                "invalid pilot issue detail request",
            ));
        }

        if let PilotBackend::Repository(repository) = &self.backend {
            let issue = repository
                .read_issue_detail(
                    request.owner_name,
                    request.project_name,
                    request.issue_number,
                )
                .await
                .map_err(|error| {
                    ConnectError::new(connectrpc::ErrorCode::Internal, error.to_string())
                })?;

            return issue
                .map(|issue| (issue_model_to_response(issue), ctx))
                .ok_or_else(|| ConnectError::not_found("pilot issue not found"));
        } else if request.owner_name != "pilot"
            || request.project_name != "yona"
            || request.issue_number != 1
        {
            return Err(ConnectError::not_found("pilot issue not found"));
        }

        Ok((pilot_issue_response("open"), ctx))
    }

    async fn update_issue_state(
        &self,
        ctx: Context,
        request: OwnedView<UpdateIssueStateRequestView<'static>>,
    ) -> Result<(ReadIssueDetailResponse, Context), ConnectError> {
        let Some(session) = self.session_manager.read_session_from_headers(&ctx.headers) else {
            return Err(ConnectError::unauthenticated("missing pilot session"));
        };

        if request.issue_number <= 0 || !matches!(request.state, "open" | "closed") {
            return Err(ConnectError::invalid_argument(
                "invalid pilot issue state request",
            ));
        }

        if !self.session_manager.validate_csrf(&ctx.headers, &session) {
            return Err(ConnectError::permission_denied("invalid csrf token"));
        }

        if let PilotBackend::Repository(repository) = &self.backend {
            let issue = repository
                .update_issue_state(
                    request.owner_name,
                    request.project_name,
                    request.issue_number,
                    request.state,
                )
                .await
                .map_err(|error| {
                    ConnectError::new(connectrpc::ErrorCode::Internal, error.to_string())
                })?;

            return issue
                .map(|issue| (issue_model_to_response(issue), ctx))
                .ok_or_else(|| ConnectError::not_found("pilot issue not found"));
        }

        if request.owner_name != "pilot"
            || request.project_name != "yona"
            || request.issue_number != 1
        {
            return Err(ConnectError::not_found("pilot issue not found"));
        }

        Ok((pilot_issue_response(request.state), ctx))
    }
}

fn pilot_issue_response(state: &str) -> ReadIssueDetailResponse {
    ReadIssueDetailResponse {
        owner_name: "pilot".to_string(),
        project_name: "yona".to_string(),
        issue_number: 1,
        title: "Pilot issue".to_string(),
        state: state.to_string(),
        ..Default::default()
    }
}

fn issue_model_to_response(issue: persistence::IssueRecord) -> ReadIssueDetailResponse {
    ReadIssueDetailResponse {
        owner_name: issue.owner_name,
        project_name: issue.project_name,
        issue_number: issue.issue_number,
        title: issue.title,
        state: issue.state,
        ..Default::default()
    }
}

async fn serve_filesystem_asset(
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

async fn serve_embedded_asset(
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

async fn serve_filesystem_fallback(
    asset_root: PathBuf,
    method: Method,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    if method != Method::GET && method != Method::HEAD {
        return axum::http::StatusCode::NOT_FOUND.into_response();
    }

    serve_index_html(asset_root, browser_runtime).await
}

async fn serve_embedded_fallback(
    method: Method,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    if method != Method::GET && method != Method::HEAD {
        return axum::http::StatusCode::NOT_FOUND.into_response();
    }

    serve_embedded_index_html(browser_runtime).await
}

async fn serve_index_html(asset_root: PathBuf, browser_runtime: BrowserRuntimeConfig) -> Response {
    let index_path = asset_root.join("index.html");
    let Ok(index_html) = tokio::fs::read_to_string(index_path).await else {
        return (axum::http::StatusCode::NOT_FOUND, "not found").into_response();
    };

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

async fn serve_embedded_index_html(browser_runtime: BrowserRuntimeConfig) -> Response {
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
