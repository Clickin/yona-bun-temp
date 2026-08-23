use axum::{
    extract::Form,
    http::{HeaderMap, Method, StatusCode},
    response::{IntoResponse, Redirect, Response},
    routing::{get, post},
    Router,
};
use std::collections::HashMap;
use std::path::Path;

use crate::assets::serve_frontend_page;
use crate::{
    base_path_href, headers_with_form_csrf, legacy_external_api_hello, map_project_scope,
    persistence, redirect_to, repository_provisioning_lock, require_session, require_valid_csrf,
    rest_project_menu_settings, AssetMode, BrowserRuntimeConfig, PilotBackend, PilotRepository,
    PilotServiceImpl, RestRouteError,
};
use yoram_domain::{
    can_create_organization_project, can_create_personal_project, is_valid_project_name,
};

pub(crate) async fn direct_legacy_init(service: PilotServiceImpl) -> Response {
    if let PilotBackend::Repository(repository) = &service.backend {
        make_legacy_test_repositories(repository, &service.data_root).await;
    }

    Redirect::to(&base_path_href(&service.base_path, "/")).into_response()
}

pub(crate) async fn direct_legacy_fake() -> Response {
    StatusCode::BAD_REQUEST.into_response()
}

async fn make_legacy_test_repositories(repository: &PilotRepository, data_root: &Path) {
    let projects = match repository.list_projects().await {
        Ok(projects) => projects,
        Err(error) => {
            tracing::warn!(%error, "legacy /_init could not list projects");
            return;
        }
    };
    for project in projects {
        let repo_path = yoram_vcs::repository_path_for_vcs(data_root, project.id, &project.vcs);
        let result = if project.vcs.eq_ignore_ascii_case("Subversion") {
            yoram_vcs::create_svn_repository(&repo_path)
        } else {
            yoram_vcs::create_bare_repository(&repo_path)
        };
        if let Err(error) = result {
            tracing::warn!(
                %error,
                project_id = project.id,
                owner = %project.owner_name,
                project = %project.project_name,
                vcs = %project.vcs,
                "legacy /_init repository provisioning failed"
            );
        }
    }
}

pub(crate) async fn direct_legacy_migration_disabled(
    headers: HeaderMap,
    service: PilotServiceImpl,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    if service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id)
        .is_none()
    {
        return Redirect::to(&base_path_href(
            &service.base_path,
            "/users/loginform?redirectUrl=%2Fmigration",
        ))
        .into_response();
    }

    match assets {
        AssetMode::None => {
            RestRouteError::forbidden_code("forbidden", "error.forbidden.or.not.allowed")
                .into_response()
        }
        assets => {
            let mut response = serve_frontend_page(assets, Method::GET, browser_runtime).await;
            *response.status_mut() = StatusCode::FORBIDDEN;
            response
        }
    }
}

pub(crate) async fn direct_legacy_migration_json_disabled(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Response {
    if service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id)
        .is_none()
    {
        return Redirect::to(&base_path_href(
            &service.base_path,
            "/users/loginform?redirectUrl=%2Fmigration",
        ))
        .into_response();
    }

    RestRouteError::forbidden_code("forbidden", "error.forbidden.or.not.allowed").into_response()
}

pub(crate) async fn direct_import_project(
    headers: HeaderMap,
    form: HashMap<String, String>,
    service: PilotServiceImpl,
) -> Response {
    let headers = headers_with_form_csrf(headers, &form);
    let session = match require_session(&service.session_manager, &headers) {
        Ok(session) => session,
        Err(_) => return legacy_plain_response(StatusCode::FORBIDDEN, "forbidden"),
    };
    if require_valid_csrf(&service.session_manager, &headers, &session).is_err() {
        return legacy_plain_response(StatusCode::FORBIDDEN, "forbidden");
    }
    let Some(actor_id) = session.user_id else {
        return legacy_plain_response(StatusCode::FORBIDDEN, "forbidden");
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("project import requires repository backend")
            .into_response();
    };

    let source_url = direct_form_value(&form, "url");
    if source_url.is_empty() {
        return legacy_plain_response(StatusCode::BAD_REQUEST, "project.import.error.empty.url");
    }
    let owner_name = direct_form_value(&form, "owner");
    let project_name = direct_form_value(&form, "name");
    let overview = direct_form_value(&form, "overview");
    if !is_valid_project_name(&project_name) || overview.len() > 255 {
        return legacy_plain_response(StatusCode::BAD_REQUEST, "project.name.alert");
    }
    let identifier_exists = match repository
        .project_identifier_exists(&owner_name, &project_name)
        .await
    {
        Ok(exists) => exists,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    if identifier_exists {
        return legacy_plain_response(StatusCode::BAD_REQUEST, "project.name.duplicate");
    }

    let request_scope = direct_form_value(&form, "projectScope");
    let default_scope;
    let scope_value = if request_scope.is_empty() {
        default_scope = service.project_default_scope.clone();
        default_scope.as_str()
    } else {
        request_scope.as_str()
    };
    let scope = match map_project_scope(scope_value) {
        Ok(scope) => scope,
        Err(_) => return legacy_plain_response(StatusCode::BAD_REQUEST, "invalid project scope"),
    };

    let actor = match repository.find_user_by_id(actor_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => return legacy_plain_response(StatusCode::FORBIDDEN, "forbidden"),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let organization = match repository
        .read_organization_authorization(&owner_name, Some(actor_id))
        .await
    {
        Ok(organization) => organization,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let created = if let Some(organization) = organization {
        if !can_create_organization_project(organization.viewer.is_organization_admin) {
            return legacy_plain_response(StatusCode::FORBIDDEN, "forbidden");
        }
        repository
            .create_project(persistence::CreateProjectInput {
                organization_id: Some(organization.organization.id),
                owner_name: organization.organization.organization_name,
                overview: Some(overview.clone()),
                project_name: project_name.clone(),
                project_scope: scope.as_str().to_string(),
                vcs: "GIT".to_string(),
            })
            .await
    } else {
        if !can_create_personal_project(Some(&actor.login_id), &owner_name) {
            return legacy_plain_response(StatusCode::BAD_REQUEST, "project.owner.invalid");
        }
        repository
            .create_project(persistence::CreateProjectInput {
                organization_id: None,
                owner_name: owner_name.clone(),
                overview: Some(overview.clone()),
                project_name: project_name.clone(),
                project_scope: scope.as_str().to_string(),
                vcs: "GIT".to_string(),
            })
            .await
    };
    let created = match created {
        Ok(created) => created,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };

    let repo_path = yoram_vcs::repository_path(&service.data_root, created.id);
    let clone_result = {
        let _guard = match repository_provisioning_lock().lock() {
            Ok(guard) => guard,
            Err(_) => {
                return RestRouteError::internal("repository provisioning lock poisoned")
                    .into_response();
            }
        };
        if repo_path.exists() {
            let _ = yoram_vcs::delete_repository(&repo_path);
        }
        yoram_vcs::clone_bare_repository_from_source(&source_url, &repo_path)
    };
    if let Err(error) = clone_result {
        let _ = repository
            .delete_project_by_owner_and_name(&created.owner_name, &created.project_name)
            .await;
        let _ = yoram_vcs::delete_repository(&repo_path);
        return legacy_plain_response(
            StatusCode::BAD_REQUEST,
            &format!("project.import.error.invalid.url: {error}"),
        );
    }

    if let Err(error) = repository
        .add_project_membership(created.id, actor_id, "manager")
        .await
    {
        let _ = repository
            .delete_project_by_owner_and_name(&created.owner_name, &created.project_name)
            .await;
        let _ = yoram_vcs::delete_repository(&repo_path);
        return RestRouteError::internal(error.to_string()).into_response();
    }
    if let Some(menu_settings) = direct_project_menu_settings_from_form(&form) {
        if let Err(error) = repository
            .set_project_menu_settings(created.id, menu_settings)
            .await
        {
            return RestRouteError::internal(error.to_string()).into_response();
        }
    }

    redirect_to(
        &service.base_path,
        &format!("/{}/{}", created.owner_name, created.project_name),
    )
}

fn direct_form_value(form: &HashMap<String, String>, key: &str) -> String {
    form.get(key)
        .map(|value| value.trim())
        .unwrap_or_default()
        .to_string()
}

fn direct_project_menu_settings_from_form(
    form: &HashMap<String, String>,
) -> Option<persistence::ProjectMenuSettingsRecord> {
    let checked = |name: &str| form.get(name).map(|value| direct_form_checked(value));
    rest_project_menu_settings(
        checked("code"),
        checked("issue"),
        checked("pullRequest"),
        checked("review"),
        checked("milestone"),
        checked("board"),
    )
}

fn direct_form_checked(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "true" | "on" | "yes" | "1"
    )
}

fn legacy_plain_response(status: StatusCode, body: &str) -> Response {
    (status, body.to_string()).into_response()
}

pub(crate) fn routes(
    service: PilotServiceImpl,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
) -> Router {
    let legacy_migration_assets = assets;
    let legacy_migration_browser_runtime = browser_runtime;
    let legacy_init_service = service.clone();
    let project_import_service = service.clone();
    let legacy_migration_service = service.clone();
    let legacy_migration_json_service = service;

    Router::new()
        .route("/", post(direct_legacy_fake))
        .route("/api/v1/hello", get(legacy_external_api_hello))
        .route(
            "/_init",
            get(move || {
                let service = legacy_init_service.clone();
                async move { direct_legacy_init(service).await }
            }),
        )
        .route(
            "/_import",
            get({
                let assets = legacy_migration_assets.clone();
                let browser_runtime = legacy_migration_browser_runtime.clone();
                move || {
                    let assets = assets.clone();
                    let browser_runtime = browser_runtime.clone();
                    async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
                }
            })
            .post(
                move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| async move {
                    direct_import_project(headers, form, project_import_service.clone()).await
                },
            ),
        )
        .route(
            "/migration",
            get(move |headers: HeaderMap| {
                let assets = legacy_migration_assets.clone();
                let browser_runtime = legacy_migration_browser_runtime.clone();
                let service = legacy_migration_service.clone();
                async move {
                    direct_legacy_migration_disabled(headers, service, assets, browser_runtime)
                        .await
                }
            }),
        )
        .route(
            "/migration/{*legacy_path}",
            get(move |headers: HeaderMap| {
                let service = legacy_migration_json_service.clone();
                async move { direct_legacy_migration_json_disabled(headers, service).await }
            }),
        )
}
