use axum::{
    extract::{Path, Query},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, patch, post},
    Json, Router,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use http::header::{CONTENT_RANGE, REFERER, SET_COOKIE};
use serde::{Deserialize, Serialize};
use std::process::Command;

use super::{
    utils::{legacy_external_random_storage_token, legacy_external_user_statistics_result},
    RestDirectIssueFormQuery, RestUserIssuesQuery,
};
use crate::generated::yona::pilot::v1::{
    WorkspaceIssueItem, WorkspaceMemberProjectItem, WorkspaceProfile, WorkspacePullRequestItem,
};
use crate::{
    accepts_legacy_json, escape_html_text, filter_workspace_issue_items_by_read_acl_for_viewer,
    filter_workspace_member_projects_by_read_acl_for_viewer,
    filter_workspace_pull_request_items_by_read_acl_for_viewer, gravatar_url, internal_error,
    legacy_external_api_auth_error_response, legacy_external_authenticated_user_id,
    legacy_json_find_value, persistence, read_issue_access, read_posting_access,
    require_authenticated_user, require_session, rest_json_response,
    rest_list_user_issues as rest_list_user_issues_impl,
    rest_read_direct_issue_form_options as rest_read_direct_issue_form_options_impl,
    user_issue_filter_name, visible_user_issue_items, workspace_avatar_url,
    workspace_profile_from_record, ConnectError, Context, PilotBackend, PilotRepository,
    PilotServiceImpl, RestRouteError, TranslationProxyConfig,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestUserStatisticsResponse {
    assigned_issue: u32,
    issue: u32,
    issue_comment: u32,
    issue_comment_voter: u32,
    issue_voter: u32,
    posting: u32,
    posting_comment: u32,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RestPublicUserProfileQuery {
    days_ago: Option<i64>,
    selected: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestPublicUserProfileResponse {
    days_ago: u32,
    issue_items: Vec<WorkspaceIssueItem>,
    member_projects: Vec<WorkspaceMemberProjectItem>,
    profile: Option<WorkspaceProfile>,
    pull_request_items: Vec<WorkspacePullRequestItem>,
    redirect_path: Option<String>,
    selected: String,
    viewer_can_edit_profile: bool,
}

const WORKSPACE_DAYS_AGO: u32 = 14;

fn public_profile_days_ago(days_ago: Option<i64>) -> u32 {
    days_ago
        .map(|value| value.max(1) as u32)
        .unwrap_or(WORKSPACE_DAYS_AGO)
}

fn public_profile_selected(selected: Option<String>) -> String {
    match selected.as_deref().map(str::trim) {
        Some("projects") => "projects".to_string(),
        Some("pullRequests") => "pullRequests".to_string(),
        _ => "issues".to_string(),
    }
}

fn direct_plain_response(status: StatusCode, body: &str) -> Response {
    (status, body.to_string()).into_response()
}

pub(crate) fn rest_routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/users/{login_id}/profile",
            get({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(login_id): Path<String>,
                      Query(query): Query<RestPublicUserProfileQuery>| {
                    let service = service.clone();
                    async move { rest_read_public_user_profile(headers, login_id, query, service).await }
                }
            }),
        )
        .route(
            "/users/{login_id}/statistics",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { rest_read_user_statistics(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/user/issues/new-options",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestDirectIssueFormQuery>| {
                    let service = service.clone();
                    async move {
                        rest_read_direct_issue_form_options(headers, query, service).await
                    }
                }
            }),
        )
        .route(
            "/user/issues",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<RestUserIssuesQuery>| {
                    let service = service.clone();
                    async move {
                        rest_list_user_issues(headers, query, service).await
                    }
                }
            }),
        )
}

async fn rest_read_public_user_profile(
    headers: HeaderMap,
    login_id: String,
    query: RestPublicUserProfileQuery,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "public user profile requires repository backend",
        ));
    };

    if repository
        .read_organization_by_name(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
        .is_some()
    {
        return Ok(rest_json_response(
            RestPublicUserProfileResponse {
                days_ago: public_profile_days_ago(query.days_ago),
                issue_items: Vec::new(),
                member_projects: Vec::new(),
                profile: None,
                pull_request_items: Vec::new(),
                redirect_path: Some(format!("/organizations/{login_id}")),
                selected: public_profile_selected(query.selected),
                viewer_can_edit_profile: false,
            },
            Context::new(headers),
        ));
    }

    let Some(user) = repository
        .find_user_by_login_id(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
    else {
        return Err(RestRouteError::not_found("user not found"));
    };

    let viewer_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let viewer_can_edit_profile = viewer_id == Some(user.id);
    let days_ago = public_profile_days_ago(query.days_ago);
    let profile = match repository
        .read_workspace_profile_for_user(user.id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
    {
        Some(record) => {
            let avatar_url = workspace_avatar_url(
                repository,
                user.id,
                &record.primary_email_address,
                &service.base_path,
            )
            .await
            .map_err(RestRouteError::from_connect_error)?;
            let mut profile = workspace_profile_from_record(&record, avatar_url);
            if !viewer_can_edit_profile {
                profile.primary_email_address.clear();
            }
            Some(profile)
        }
        None => None,
    };
    let issue_items = filter_workspace_issue_items_by_read_acl_for_viewer(
        repository,
        viewer_id,
        repository
            .list_recent_workspace_issues_for_user(user.id, u64::from(days_ago))
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let pull_request_items = filter_workspace_pull_request_items_by_read_acl_for_viewer(
        repository,
        viewer_id,
        repository
            .list_recent_workspace_pull_requests_for_user(user.id, u64::from(days_ago))
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    let member_projects = filter_workspace_member_projects_by_read_acl_for_viewer(
        repository,
        viewer_id,
        repository
            .list_member_projects_for_user(user.id)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;

    Ok(rest_json_response(
        RestPublicUserProfileResponse {
            days_ago,
            issue_items,
            member_projects,
            profile,
            pull_request_items,
            redirect_path: None,
            selected: public_profile_selected(query.selected),
            viewer_can_edit_profile,
        },
        Context::new(headers),
    ))
}

fn rest_user_statistics_from_record(
    record: &persistence::UserStatisticsRecord,
) -> RestUserStatisticsResponse {
    RestUserStatisticsResponse {
        assigned_issue: record.assigned_issue,
        issue: record.issue,
        issue_comment: record.issue_comment,
        issue_comment_voter: record.issue_comment_voter,
        issue_voter: record.issue_voter,
        posting: record.posting,
        posting_comment: record.posting_comment,
    }
}

pub(crate) async fn rest_read_user_statistics(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "user statistics requires repository backend",
        ));
    };
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    let _actor = require_authenticated_user(repository, session.user_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let statistics = match repository
        .find_user_by_login_id(&login_id)
        .await
        .map_err(|error| RestRouteError::internal(error.to_string()))?
    {
        Some(user) => repository
            .read_user_statistics(user.id)
            .await
            .map_err(|error| RestRouteError::internal(error.to_string()))?,
        None => persistence::UserStatisticsRecord::default(),
    };

    Ok(rest_json_response(
        rest_user_statistics_from_record(&statistics),
        Context::new(headers),
    ))
}

async fn rest_list_user_issues(
    headers: HeaderMap,
    query: RestUserIssuesQuery,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    rest_list_user_issues_impl(headers, query, service)
        .await
        .map(IntoResponse::into_response)
}

async fn rest_read_direct_issue_form_options(
    headers: HeaderMap,
    query: RestDirectIssueFormQuery,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    rest_read_direct_issue_form_options_impl(headers, query, service)
        .await
        .map(IntoResponse::into_response)
}

pub(crate) fn routes(service: PilotServiceImpl) -> Router {
    Router::new()
        .route(
            "/-_-api/v1/admin/users",
            get({
                let service = service.clone();
                move |headers: HeaderMap| {
                    let service = service.clone();
                    async move { legacy_external_admin_users(headers, service).await }
                }
            }),
        )
        .route(
            "/-_-api/v1/admin/users/{login_id}",
            patch({
                let service = service.clone();
                move |headers: HeaderMap,
                      Path(login_id): Path<String>,
                      Json(body): Json<serde_json::Value>| {
                    let service = service.clone();
                    async move {
                        legacy_external_update_admin_user_state(headers, login_id, body, service)
                            .await
                    }
                }
            }),
        )
        .route(
            "/-_-api/v1/users",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<LegacyExternalUsersQuery>| {
                    let service = service.clone();
                    async move { legacy_external_users(headers, query, service).await }
                }
            }),
        )
        .route(
            "/-_-api/v1/users",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<serde_json::Value>| {
                    let service = service.clone();
                    async move { legacy_external_create_users(headers, body, service).await }
                }
            }),
        )
        .route(
            "/-_-api/v1/users/token",
            post({
                let service = service.clone();
                move |headers: HeaderMap, Json(body): Json<serde_json::Value>| {
                    let service = service.clone();
                    async move { legacy_external_user_token(headers, body, service).await }
                }
            }),
        )
        .route(
            "/-_-api/v1/user/issues",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Query(query): Query<LegacyExternalUserIssuesQuery>| {
                    let service = service.clone();
                    async move { legacy_external_user_issues(headers, query, service).await }
                }
            }),
        )
        .route(
            "/-_-api/v1/users/{login_id}/statistics",
            get({
                let service = service.clone();
                move |headers: HeaderMap, Path(login_id): Path<String>| {
                    let service = service.clone();
                    async move { legacy_external_user_statistics(headers, login_id, service).await }
                }
            }),
        )
        .route(
            "/-_-api/v1/translation",
            post(
                move |headers: HeaderMap, Json(body): Json<serde_json::Value>| {
                    let service = service.clone();
                    async move { legacy_external_translation(headers, body, service).await }
                },
            ),
        )
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct LegacyExternalUsersQuery {
    #[serde(default)]
    query: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LegacyExternalUserIssuesQuery {
    #[serde(default = "legacy_external_user_issues_default_filter")]
    filter: String,
    #[serde(default = "legacy_external_user_issues_default_page")]
    page: u32,
    #[serde(default = "legacy_external_user_issues_default_page_num")]
    page_num: u32,
}

fn legacy_external_user_issues_default_filter() -> String {
    "assigned".to_string()
}

fn legacy_external_user_issues_default_page() -> u32 {
    1
}

fn legacy_external_user_issues_default_page_num() -> u32 {
    15
}

#[derive(Clone, Debug)]
struct LegacyExternalUserCreateItem {
    email: String,
    login_id: String,
    name: String,
    original: serde_json::Value,
}

fn legacy_external_user_create_item_from_value(
    value: &serde_json::Value,
) -> LegacyExternalUserCreateItem {
    LegacyExternalUserCreateItem {
        email: legacy_json_find_value(value, "email")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        login_id: legacy_json_find_value(value, "loginId")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        name: legacy_json_find_value(value, "name")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        original: value.clone(),
    }
}

#[derive(Clone, Debug)]
struct LegacyExternalUserTokenBody {
    id: String,
    password: String,
}

fn legacy_external_user_token_body_from_value(
    value: &serde_json::Value,
) -> LegacyExternalUserTokenBody {
    LegacyExternalUserTokenBody {
        id: legacy_json_find_value(value, "id")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        password: legacy_json_find_value(value, "password")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
    }
}

pub(crate) async fn legacy_external_users(
    headers: HeaderMap,
    query: LegacyExternalUsersQuery,
    service: PilotServiceImpl,
) -> Response {
    let referer_is_members = headers
        .get(REFERER)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.ends_with("members"));
    if !referer_is_members || !accepts_legacy_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    if query.query.trim().is_empty() {
        return Json(Vec::<serde_json::Value>::new()).into_response();
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("users search requires repository backend")
            .into_response();
    };
    let users = match repository
        .list_site_users(persistence::SiteUserListFilter {
            page: 1,
            query: query.query,
            state: "active".to_string(),
        })
        .await
    {
        Ok(users) => users,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let total = users.total;
    let payload = users
        .users
        .into_iter()
        .take(10)
        .map(|user| {
            serde_json::json!({
                "info": format!(
                    "<img class='mention_image' src='{}'><b class='mention_name'>{}</b><span class='mention_username'> @{}</span>",
                    gravatar_url(&user.email_address),
                    escape_html_text(&user.display_name),
                    escape_html_text(&user.login_id),
                ),
                "loginId": user.login_id,
            })
        })
        .collect::<Vec<_>>();
    let mut response = Json(payload).into_response();
    if total > 10 {
        response.headers_mut().insert(
            CONTENT_RANGE,
            format!("items 10/{total}")
                .parse()
                .expect("legacy user search content-range"),
        );
    }
    response
}

pub(crate) async fn legacy_external_user_token(
    headers: HeaderMap,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let body = legacy_external_user_token_body_from_value(&body);
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("user token requires repository backend")
            .into_response();
    };

    let identifier = body.id.trim();
    let user = match repository.find_user_by_identifier(identifier).await {
        Ok(Some(user)) if user.is_confirmed => user,
        Ok(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "message": "No valid user by id" })),
            )
                .into_response();
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };

    let password_matches = verify(&body.password, &user.password_hash).unwrap_or(false);
    if !password_matches {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "message": "No user by id and password" })),
        )
            .into_response();
    }

    let token = match repository.reset_api_token_for_user(user.id).await {
        Ok(token) => token,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let previous_session = service.session_manager.read_session_from_headers(&headers);
    let previous_token = previous_session
        .as_ref()
        .map(|session| session.token.as_str());
    let authenticated_session =
        service
            .session_manager
            .create_authenticated_session(previous_token, user.id, false);
    let mut response = Json(serde_json::json!({ "access_token": token })).into_response();
    response.headers_mut().insert(
        "x-csrf-token",
        HeaderValue::from_str(&authenticated_session.csrf_token).expect("csrf header"),
    );
    for cookie in service
        .session_manager
        .build_set_cookie_headers(&authenticated_session)
    {
        response.headers_mut().append(
            SET_COOKIE,
            HeaderValue::from_str(&cookie).expect("set-cookie header"),
        );
    }
    response
}

pub(crate) async fn legacy_external_create_users(
    headers: HeaderMap,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("user create requires repository backend")
            .into_response();
    };
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let actor = match actor_id {
        Some(actor_id) => match repository.find_user_by_id(actor_id).await {
            Ok(actor) => actor,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        },
        None => None,
    };
    if !actor.as_ref().is_some_and(|actor| actor.is_site_admin) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "User creation with api is allowed by Site admin only.",
            })),
        )
            .into_response();
    }
    let Some(users) = legacy_json_find_value(&body, "users").and_then(|value| value.as_array())
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "message": "No users key exists or value must be array!",
            })),
        )
            .into_response();
    };

    let mut created_users = Vec::new();
    for user in users {
        let user = legacy_external_user_create_item_from_value(user);
        match repository.find_user_by_identifier(&user.email).await {
            Ok(Some(_)) => {
                created_users.push(serde_json::json!({
                    "status": 409,
                    "reason": "Conflict",
                    "message": "Already exists!",
                    "user": user.original,
                }));
                continue;
            }
            Ok(None) => {}
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        }

        let password_hash = match hash(
            format!(
                "legacy-external-user-disabled:{}:{}",
                user.login_id,
                legacy_external_random_storage_token()
            ),
            DEFAULT_COST,
        ) {
            Ok(password_hash) => password_hash,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        let created = match repository
            .create_user(persistence::CreateUserInput {
                display_name: user.name,
                email_address: user.email,
                is_confirmed: true,
                is_site_admin: false,
                login_id: user.login_id,
                password_hash,
            })
            .await
        {
            Ok(created) => created,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        created_users.push(serde_json::json!({
            "status": 201,
            "reason": "Created",
            "user": {
                "id": created.id,
                "loginId": created.login_id,
                "name": created.display_name,
                "email": created.email_address,
            },
        }));
    }

    (StatusCode::CREATED, Json(created_users)).into_response()
}

pub(crate) async fn legacy_external_user_issues(
    headers: HeaderMap,
    query: LegacyExternalUserIssuesQuery,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("user issues require repository backend")
            .into_response();
    };
    let actor_id = match legacy_external_authenticated_user_id(
        &headers,
        &service.session_manager,
        repository,
        false,
    )
    .await
    {
        Ok(user_id) => user_id,
        Err(error) => return legacy_external_api_auth_error_response(error),
    };
    let filter_name = match user_issue_filter_name(&query.filter) {
        Ok(filter_name) => filter_name,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let page_size = query.page_num.max(1);
    let page_num = query.page.max(1);
    let filter = persistence::UserIssueListFilter {
        filter: filter_name,
        order_by: "updatedDate".to_string(),
        order_dir: "desc".to_string(),
        page_num,
        page_size,
        query: None,
        state: "open".to_string(),
    };
    let mut items = match visible_user_issue_items(repository, actor_id, filter).await {
        Ok(items) => items,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let offset = ((page_num - 1) * page_size) as usize;
    let mut result = Vec::new();
    for item in items.drain(..).skip(offset).take(page_size as usize) {
        let detail = match repository
            .read_issue_detail_for_viewer(
                &item.owner_name,
                &item.project_name,
                item.issue_number,
                Some(actor_id),
            )
            .await
        {
            Ok(detail) => detail,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        let assignee_id = if item.assignee_login_id.trim().is_empty() {
            None
        } else {
            match repository
                .find_user_by_login_id(&item.assignee_login_id)
                .await
            {
                Ok(user) => user.map(|user| user.id),
                Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
            }
        };
        result.push(legacy_external_user_issue_result(
            item,
            detail.as_ref(),
            assignee_id,
        ));
    }

    Json(serde_json::json!({ "result": result })).into_response()
}

fn legacy_external_user_issue_result(
    item: persistence::ProjectIssueListItemRecord,
    detail: Option<&persistence::IssueRecord>,
    assignee_id: Option<i64>,
) -> serde_json::Value {
    let mut assignee = serde_json::json!({});
    if !item.assignee_login_id.trim().is_empty() {
        assignee = serde_json::json!({
            "id": assignee_id.unwrap_or_default(),
            "loginId": item.assignee_login_id,
            "name": item.assignee_label,
        });
    }
    let author_id = detail.and_then(|issue| issue.author_id).unwrap_or_default();
    serde_json::json!({
        "id": item.id,
        "number": item.issue_number,
        "state": item.state.to_ascii_uppercase(),
        "title": item.title,
        "createdDate": item.created_label,
        "updatedDate": item.updated_label,
        "author": {
            "id": author_id,
            "loginId": item.author_login_id,
            "name": item.author_label,
        },
        "assignee": assignee,
        "project": {
            "id": item.project_id,
            "name": item.project_name,
        },
        "owner": item.owner_name,
        "refUrl": format!(
            "{}/{}/issue/{}",
            item.owner_name, item.project_name, item.issue_number
        ),
    })
}

pub(crate) async fn legacy_external_admin_users(
    headers: HeaderMap,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("admin users require repository backend")
            .into_response();
    };
    let actor_id = match legacy_external_authenticated_user_id(
        &headers,
        &service.session_manager,
        repository,
        false,
    )
    .await
    {
        Ok(actor_id) => actor_id,
        Err(error) => return legacy_external_api_auth_error_response(error),
    };
    let actor = match repository.find_user_by_id(actor_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "missing authenticated user",
            ));
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    if !actor.is_site_admin {
        return StatusCode::FORBIDDEN.into_response();
    }

    let mut page = 1;
    let mut users = Vec::new();
    loop {
        let record = match repository
            .list_site_users(persistence::SiteUserListFilter {
                page,
                query: String::new(),
                state: "active".to_string(),
            })
            .await
        {
            Ok(record) => record,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        };
        let total_pages = record.total_pages;
        users.extend(record.users.into_iter().map(|user| {
            serde_json::json!({
                "id": user.id,
                "login_id": user.login_id,
                "name": user.display_name,
                "email": user.email_address,
                "state": user.state.to_ascii_uppercase(),
                "is_guest": user.is_guest,
            })
        }));
        if total_pages == 0 || page >= total_pages {
            break;
        }
        page += 1;
    }

    Json(users).into_response()
}

pub(crate) async fn legacy_external_update_admin_user_state(
    headers: HeaderMap,
    login_id: String,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("admin user state requires repository backend")
            .into_response();
    };
    let actor_id = match legacy_external_authenticated_user_id(
        &headers,
        &service.session_manager,
        repository,
        false,
    )
    .await
    {
        Ok(actor_id) => actor_id,
        Err(error) => return legacy_external_api_auth_error_response(error),
    };
    let actor = match repository.find_user_by_id(actor_id).await {
        Ok(Some(actor)) => actor,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "missing authenticated user",
            ));
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    if !actor.is_site_admin {
        return StatusCode::FORBIDDEN.into_response();
    }

    let state = legacy_json_find_value(&body, "state")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .trim()
        .to_ascii_uppercase();
    let row_state = match state.as_str() {
        "ACTIVE" | "LOCKED" | "DELETED" | "GUEST" => state,
        "SITE_ADMIN" => return StatusCode::FORBIDDEN.into_response(),
        _ => return StatusCode::BAD_REQUEST.into_response(),
    };
    let user = match repository.set_site_user_state(&login_id, &row_state).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return legacy_external_api_auth_error_response(ConnectError::unauthenticated(
                "user not found",
            ))
        }
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };

    Json(serde_json::json!({
        "id": user.id,
        "login_id": user.login_id,
        "state": user.state.to_ascii_uppercase(),
    }))
    .into_response()
}

pub(crate) async fn legacy_external_user_statistics(
    headers: HeaderMap,
    login_id: String,
    service: PilotServiceImpl,
) -> Response {
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("user statistics require repository backend")
            .into_response();
    };
    if let Err(error) =
        legacy_external_authenticated_user_id(&headers, &service.session_manager, repository, false)
            .await
    {
        return legacy_external_api_auth_error_response(error);
    }

    let statistics = match repository.find_user_by_login_id(&login_id).await {
        Ok(Some(user)) => match repository.read_user_statistics(user.id).await {
            Ok(statistics) => statistics,
            Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
        },
        Ok(None) => persistence::UserStatisticsRecord::default(),
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };

    Json(legacy_external_user_statistics_result(&statistics)).into_response()
}

#[derive(Clone, Debug)]
struct DirectTranslationRequest {
    owner: String,
    project_name: String,
    resource_type: String,
    number: i64,
}

fn direct_translation_request_from_value(value: &serde_json::Value) -> DirectTranslationRequest {
    DirectTranslationRequest {
        owner: legacy_json_find_value(value, "owner")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        project_name: legacy_json_find_value(value, "projectName")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        resource_type: legacy_json_find_value(value, "type")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        number: legacy_json_find_value(value, "number")
            .and_then(|value| {
                value
                    .as_i64()
                    .or_else(|| value.as_str()?.trim().parse::<i64>().ok())
            })
            .unwrap_or_default(),
    }
}

pub(crate) async fn legacy_external_translation(
    headers: HeaderMap,
    body: serde_json::Value,
    service: PilotServiceImpl,
) -> Response {
    if service.translation_proxy.api_url.trim().is_empty() {
        return direct_plain_response(StatusCode::PRECONDITION_FAILED, "Precondition Failed");
    }

    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("translation requires repository backend")
            .into_response();
    };
    let actor_id = match legacy_external_authenticated_user_id(
        &headers,
        &service.session_manager,
        repository,
        true,
    )
    .await
    {
        Ok(user_id) => user_id,
        Err(error) => return legacy_external_api_auth_error_response(error),
    };
    let body = direct_translation_request_from_value(&body);

    let text = match legacy_translation_source(repository, &body, actor_id).await {
        Ok(text) => text,
        Err(error) => return RestRouteError::from_connect_error(error).into_response(),
    };
    let translated = match legacy_translate_text(&service.translation_proxy, &text) {
        Ok(translated) => translated,
        Err(error) => return RestRouteError::bad_request(error).into_response(),
    };

    Json(serde_json::json!({
        "translated": translated,
        "translatedMarkdown": translated,
    }))
    .into_response()
}

async fn legacy_translation_source(
    repository: &PilotRepository,
    body: &DirectTranslationRequest,
    actor_id: i64,
) -> Result<String, ConnectError> {
    match body.resource_type.as_str() {
        "issue" => {
            let access = read_issue_access(
                repository,
                &body.owner,
                &body.project_name,
                body.number,
                Some(actor_id),
            )
            .await?;
            Ok(format!(
                "Title: {}\n\n{}",
                access.issue.title, access.issue.body_markdown
            ))
        }
        "posting" => {
            let access = read_posting_access(
                repository,
                &body.owner,
                &body.project_name,
                body.number,
                Some(actor_id),
            )
            .await?;
            Ok(format!(
                "Title: {}\n\n{}",
                access.posting.title, access.posting.body_markdown
            ))
        }
        "issue-comment" => {
            let origin = repository
                .read_issue_comment_origin(body.number)
                .await
                .map_err(internal_error)?
                .ok_or_else(|| ConnectError::not_found("issue comment not found"))?;
            read_issue_access(
                repository,
                &origin.owner_name,
                &origin.project_name,
                origin.issue_number,
                Some(actor_id),
            )
            .await?;
            Ok(origin.contents_markdown)
        }
        "post-comment" => {
            let origin = repository
                .read_posting_comment_origin(body.number)
                .await
                .map_err(internal_error)?
                .ok_or_else(|| ConnectError::not_found("posting comment not found"))?;
            read_posting_access(
                repository,
                &origin.owner_name,
                &origin.project_name,
                origin.post_number,
                Some(actor_id),
            )
            .await?;
            Ok(origin.contents_markdown)
        }
        _ => Err(ConnectError::invalid_argument(
            "translation resource type is invalid",
        )),
    }
}

fn legacy_translate_text(config: &TranslationProxyConfig, text: &str) -> Result<String, String> {
    if text.trim().is_empty() {
        return Ok(String::new());
    }
    let mut command = Command::new("curl");
    command
        .arg("-sS")
        .arg("-X")
        .arg("POST")
        .arg("-H")
        .arg("Accept: application/json,application/x-www-form-urlencoded,text/html,*/*")
        .arg("-H")
        .arg("Content-Type: application/x-www-form-urlencoded; charset=UTF-8");
    if !config.header_key.trim().is_empty() {
        command.arg("-H").arg(format!(
            "{}: {}",
            config.header_key.trim(),
            config.header_value
        ));
    }
    let output = command
        .arg("--data-urlencode")
        .arg("source=ko")
        .arg("--data-urlencode")
        .arg("target=en")
        .arg("--data-urlencode")
        .arg(format!("text={text}"))
        .arg(config.api_url.trim())
        .output()
        .map_err(|error| format!("translation.fetch.failed: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "translation.fetch.failed: exit status {}",
            output.status
        ));
    }
    let payload: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("translation.response.invalid: {error}"))?;
    payload
        .pointer("/result/translatedText")
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| "translation.response.missingTranslatedText".to_string())
}
