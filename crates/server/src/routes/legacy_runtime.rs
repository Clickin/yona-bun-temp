use axum::{
    extract::Form,
    http::{HeaderMap, Method, StatusCode},
    response::{Html, IntoResponse, Redirect, Response},
    routing::{get, post},
    Router,
};
use std::collections::HashMap;

use crate::{
    base_path_href, headers_with_form_csrf, legacy_external_api_hello, map_project_scope,
    persistence, redirect_to, repository_provisioning_lock, require_session, require_valid_csrf,
    rest_project_menu_settings, serve_frontend_page, session::SessionManager, yona_data_root,
    AssetMode, BrowserRuntimeConfig, PilotBackend, PilotRepository, RestRouteError,
};
use yona_rust_domain::{
    can_create_organization_project, can_create_personal_project, is_valid_project_name,
};

pub(crate) async fn direct_legacy_init(backend: PilotBackend, base_path: String) -> Response {
    if let PilotBackend::Repository(repository) = backend {
        make_legacy_test_repositories(&repository).await;
    }

    Redirect::to(&base_path_href(&base_path, "/")).into_response()
}

async fn make_legacy_test_repositories(repository: &PilotRepository) {
    let projects = match repository.list_projects().await {
        Ok(projects) => projects,
        Err(error) => {
            tracing::warn!(%error, "legacy /_init could not list projects");
            return;
        }
    };
    for project in projects {
        let repo_path =
            yona_rust_vcs::repository_path_for_vcs(&yona_data_root(), project.id, &project.vcs);
        let result = if project.vcs.eq_ignore_ascii_case("Subversion") {
            yona_rust_vcs::create_svn_repository(&repo_path)
        } else {
            yona_rust_vcs::create_bare_repository(&repo_path)
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
    session_manager: SessionManager,
    base_path: String,
) -> Response {
    if session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id)
        .is_none()
    {
        return Redirect::to(&base_path_href(
            &base_path,
            "/users/loginform?redirectUrl=%2Fmigration",
        ))
        .into_response();
    }

    let guide_href = base_path_href(&base_path, "/sites/data");
    let body = format!(
        r#"<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Migration</title>
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
<div class="yobi-migration">
<div class="header-pannel">
<div class="comeback-text pull-right">Yona to Github<span class="midium-font"></span></div>
<div class="row title-text-bg">
<div id="system-msg" class="well board">
<div class="messages">error.forbidden.or.not.allowed</div>
</div>
</div>
<div class="status">
<div class="row">
<div class="head-title row-fluid">
<div class="source-title span5"><div class="project-name warn">Source 프로젝트를 선택해 주세요</div></div>
<div class="arrow span1"><i class="yobicon-arrow-right-alt"></i></div>
<div class="destination-title span6"><div class="project-name warn">Destination 프로젝트를 선택해 주세요</div></div>
</div>
</div>
</div>
<div class="row source-destination">
<div class="source-project span4"><div class="header">Source 0 개</div><div class="search left-border"><input tabindex="1" type="text" class="search-query" name="target-filter" placeholder="Search.." autofocus disabled></div><div class="left-project-list"></div></div>
<div class="destination-project span4"><div class="header">Destination 0 개</div><div class="search"><input type="text" tabindex="2" class="search-query" name="target-filter" placeholder="Search.." disabled></div><div class="destination-project-list"></div></div>
<div class="span6 status">
<div class="progress row"><div class="bar span10 bar-danger" style="width: 0%">0/0</div></div>
<table class="table">
<thead><tr><th colspan="2">Migration 대상</th><th></th></tr></thead>
<tbody>
<tr><td class="left-title">마일스톤</td><td class="left-title">0</td><td><div class="btn-group"><button class="btn btn-danger" disabled>마일스톤 옮기기</button></div></td></tr>
<tr><td class="left-title">이슈</td><td class="left-title"><span>0</span></td><td><div class="btn-group"><button class="btn btn-danger" disabled>이슈 옮기기</button></div></td></tr>
<tr><td class="left-title">게시글</td><td class="left-title"><span>0</span></td><td><div class="btn-group"><button class="btn btn-danger" disabled>게시글 옮기기</button></div></td></tr>
<tr><td class="td-title left-title">주의 사항!!</td><td colspan="2" class="text-align-left"><div class="caution">작업 시작전에 Yona to Githbub 마이그레이션 가이드를 꼭 읽어주세요.</div></td></tr>
</tbody>
</table>
<div class="left-title">기존 이슈 담당자</div>
<div class="caution">Migration 기능은 현재 사용할 수 없습니다.</div>
<div class="caution"><a href="{guide_href}">/sites/data</a></div>
</div>
</div>
</div>
</div>
</body>
</html>"#
    );
    (StatusCode::FORBIDDEN, Html(body)).into_response()
}

pub(crate) async fn direct_legacy_migration_json_disabled(
    headers: HeaderMap,
    session_manager: SessionManager,
    base_path: String,
) -> Response {
    if session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id)
        .is_none()
    {
        return Redirect::to(&base_path_href(
            &base_path,
            "/users/loginform?redirectUrl=%2Fmigration",
        ))
        .into_response();
    }

    RestRouteError::forbidden_code("forbidden", "error.forbidden.or.not.allowed").into_response()
}

pub(crate) async fn direct_import_project(
    headers: HeaderMap,
    form: HashMap<String, String>,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    project_default_scope: String,
) -> Response {
    let headers = headers_with_form_csrf(headers, &form);
    let session = match require_session(&session_manager, &headers) {
        Ok(session) => session,
        Err(_) => return legacy_plain_response(StatusCode::FORBIDDEN, "forbidden"),
    };
    if require_valid_csrf(&session_manager, &headers, &session).is_err() {
        return legacy_plain_response(StatusCode::FORBIDDEN, "forbidden");
    }
    let Some(actor_id) = session.user_id else {
        return legacy_plain_response(StatusCode::FORBIDDEN, "forbidden");
    };
    let PilotBackend::Repository(repository) = &backend else {
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
        default_scope = project_default_scope;
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

    let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), created.id);
    let clone_result = {
        let _guard = match repository_provisioning_lock().lock() {
            Ok(guard) => guard,
            Err(_) => {
                return RestRouteError::internal("repository provisioning lock poisoned")
                    .into_response();
            }
        };
        if repo_path.exists() {
            let _ = yona_rust_vcs::delete_repository(&repo_path);
        }
        yona_rust_vcs::clone_bare_repository_from_source(&source_url, &repo_path)
    };
    if let Err(error) = clone_result {
        let _ = repository
            .delete_project_by_owner_and_name(&created.owner_name, &created.project_name)
            .await;
        let _ = yona_rust_vcs::delete_repository(&repo_path);
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
        let _ = yona_rust_vcs::delete_repository(&repo_path);
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
        &base_path,
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
    session_manager: SessionManager,
    backend: PilotBackend,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
    base_path: String,
    project_default_scope: String,
) -> Router {
    let legacy_api_index_assets = assets.clone();
    let legacy_api_index_browser_runtime = browser_runtime.clone();
    let legacy_api_v1_index_assets = assets;
    let legacy_api_v1_index_browser_runtime = browser_runtime;
    let legacy_init_backend = backend.clone();
    let legacy_init_base_path = base_path.clone();
    let project_import_session_manager = session_manager.clone();
    let project_import_backend = backend;
    let project_import_base_path = base_path.clone();
    let project_import_default_scope = project_default_scope;
    let legacy_migration_session_manager = session_manager.clone();
    let legacy_migration_base_path = base_path.clone();
    let legacy_migration_json_session_manager = session_manager;
    let legacy_migration_json_base_path = base_path;

    Router::new()
        .route(
            "/-_-api",
            get(move || {
                let assets = legacy_api_index_assets.clone();
                let browser_runtime = legacy_api_index_browser_runtime.clone();
                async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
            }),
        )
        .route(
            "/-_-api/v1/",
            get(move || {
                let assets = legacy_api_v1_index_assets.clone();
                let browser_runtime = legacy_api_v1_index_browser_runtime.clone();
                async move { serve_frontend_page(assets, Method::GET, browser_runtime).await }
            }),
        )
        .route("/-_-api/v1/hello", get(legacy_external_api_hello))
        .route(
            "/_init",
            get(move || {
                let backend = legacy_init_backend.clone();
                let base_path = legacy_init_base_path.clone();
                async move { direct_legacy_init(backend, base_path).await }
            }),
        )
        .route(
            "/_import",
            post(
                move |headers: HeaderMap, Form(form): Form<HashMap<String, String>>| async move {
                    direct_import_project(
                        headers,
                        form,
                        project_import_session_manager.clone(),
                        project_import_backend.clone(),
                        project_import_base_path.clone(),
                        project_import_default_scope.clone(),
                    )
                    .await
                },
            ),
        )
        .route(
            "/migration",
            get(move |headers: HeaderMap| {
                let session_manager = legacy_migration_session_manager.clone();
                let base_path = legacy_migration_base_path.clone();
                async move {
                    direct_legacy_migration_disabled(headers, session_manager, base_path).await
                }
            }),
        )
        .route(
            "/migration/{*legacy_path}",
            get(move |headers: HeaderMap| {
                let session_manager = legacy_migration_json_session_manager.clone();
                let base_path = legacy_migration_json_base_path.clone();
                async move {
                    direct_legacy_migration_json_disabled(headers, session_manager, base_path).await
                }
            }),
        )
}
