use axum::extract::Request;
use axum::response::{IntoResponse, Response};
use base64::{engine::general_purpose, Engine as _};
use bcrypt::verify;
use http::header::{AUTHORIZATION, WWW_AUTHENTICATE};
use http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use http_body_util::BodyExt;
use std::collections::HashMap;
use std::path::Path;

use crate::session::SessionManager;
use crate::{
    absolute_app_url, base_path_href, confirmation_session_required,
    dispatch_pull_request_webhooks, internal_error, map_project_scope, persistence,
    project_webhook_type_label, record_project_webhook_delivery, yona_data_root, ConnectError,
    PilotBackend, PilotRepository, RestRouteError, LEGACY_LOGIN_REQUIRED_MESSAGE,
};
use yona_rust_domain::ProjectScope;
use yona_rust_integrations::{deliver_webhook, OutboundWebhook};
use yona_rust_vcs::{
    GitHeadRefRecord, GitHttpBackendRequest, GitPushCommitRecord, VcsError,
    MAX_SMART_HTTP_RPC_BYTES,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum SmartHttpPermission {
    Read,
    Write,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct SmartHttpRoute {
    git_path: String,
    owner_name: String,
    project_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct SmartHttpPushChange {
    commits: Vec<GitPushCommitRecord>,
    full_ref: String,
    new_oid: String,
    old_oid: Option<String>,
    short_ref: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct SmartHttpPushSummary {
    deleted_refs: Vec<GitHeadRefRecord>,
    updated_refs: Vec<SmartHttpPushChange>,
}

impl SmartHttpPushSummary {
    fn is_empty(&self) -> bool {
        self.deleted_refs.is_empty() && self.updated_refs.is_empty()
    }

    fn ref_names(&self) -> Vec<String> {
        let mut refs = self
            .updated_refs
            .iter()
            .map(|change| change.full_ref.clone())
            .chain(
                self.deleted_refs
                    .iter()
                    .map(|change| change.full_name.clone()),
            )
            .collect::<Vec<_>>();
        refs.sort();
        refs.dedup();
        refs
    }

    fn updated_branch_names(&self) -> Vec<String> {
        let mut branches = self
            .updated_refs
            .iter()
            .map(|change| change.short_ref.clone())
            .collect::<Vec<_>>();
        branches.sort();
        branches.dedup();
        branches
    }

    fn deleted_branch_names(&self) -> Vec<String> {
        let mut branches = self
            .deleted_refs
            .iter()
            .map(|change| change.short_name.clone())
            .collect::<Vec<_>>();
        branches.sort();
        branches.dedup();
        branches
    }

    fn commits(&self) -> Vec<GitPushCommitRecord> {
        let mut commits = Vec::new();
        let mut seen = std::collections::HashSet::new();
        for change in &self.updated_refs {
            for commit in &change.commits {
                if seen.insert(commit.commit_id.clone()) {
                    commits.push(commit.clone());
                }
            }
        }
        commits
    }
}

pub(crate) async fn direct_smart_http_request(
    request: Request,
    session_manager: SessionManager,
    backend: PilotBackend,
    base_path: String,
    public_origin: String,
) -> Response {
    let Some(route) = route_from_path(request.uri().path(), &base_path) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let (parts, body) = request.into_parts();
    let method = parts.method.as_str().to_ascii_uppercase();
    if method != "GET" && method != "POST" {
        return StatusCode::METHOD_NOT_ALLOWED.into_response();
    }
    let query_string = parts.uri.query().unwrap_or_default().to_string();
    if method == "GET" && route.git_path == "info/refs" && !smart_http_has_service(&query_string) {
        return (StatusCode::FORBIDDEN, "Unsupported service: getanyfile").into_response();
    }
    if method == "POST" && smart_http_announced_body_too_large(&parts.headers) {
        return (StatusCode::PAYLOAD_TOO_LARGE, "Request Entity Too Large").into_response();
    }

    let PilotBackend::Repository(repository) = &backend else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };
    let principal =
        match smart_http_principal_from_headers(&parts.headers, &session_manager, repository).await
        {
            Ok(principal) => principal,
            Err(response) => return response,
        };
    let actor_id = principal.as_ref().map(|user| user.id);
    let remote_user = principal.as_ref().map(|user| user.login_id.clone());
    let authorization = match repository
        .read_project_authorization(&route.owner_name, &route.project_name, actor_id)
        .await
    {
        Ok(Some(authorization)) => authorization,
        Ok(None) => return (StatusCode::NOT_FOUND, "Repository not found").into_response(),
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    if !authorization.project.vcs.eq_ignore_ascii_case("GIT") {
        return (StatusCode::NOT_FOUND, "Repository not found").into_response();
    }

    let permission = if smart_http_requires_write(&route.git_path, &query_string) {
        SmartHttpPermission::Write
    } else {
        SmartHttpPermission::Read
    };
    match smart_http_authorization(&authorization, actor_id.is_none(), permission) {
        Ok(()) => {}
        Err(SmartHttpAccessFailure::AuthenticationRequired) => {
            return smart_http_basic_challenge_response();
        }
        Err(SmartHttpAccessFailure::Forbidden) => {
            return (StatusCode::FORBIDDEN, "Forbidden").into_response();
        }
        Err(SmartHttpAccessFailure::InvalidProjectScope(error)) => {
            return RestRouteError::from_connect_error(error).into_response();
        }
    }

    let body_bytes = match body.collect().await {
        Ok(collected) => collected.to_bytes(),
        Err(error) => {
            return RestRouteError::from_connect_error(internal_error(error)).into_response();
        }
    };
    if body_bytes.len() > MAX_SMART_HTTP_RPC_BYTES {
        return (StatusCode::PAYLOAD_TOO_LARGE, "Request Entity Too Large").into_response();
    }

    let repo_root = yona_data_root().join("repo");
    let path_info = format!("/{}.git/{}", authorization.project.id, route.git_path);
    let content_type = parts
        .headers
        .get(http::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok());
    let git_protocol = parts
        .headers
        .get("git-protocol")
        .and_then(|value| value.to_str().ok());
    let remote_addr = smart_http_remote_addr(&parts.headers);
    let repo_path = yona_rust_vcs::repository_path(&yona_data_root(), authorization.project.id);
    let is_receive_pack_post = method == "POST" && route.git_path == "git-receive-pack";
    let before_refs = if is_receive_pack_post {
        match yona_rust_vcs::read_head_refs(&repo_path) {
            Ok(refs) => refs,
            Err(error) => {
                return RestRouteError::from_connect_error(internal_error(error)).into_response();
            }
        }
    } else {
        Vec::new()
    };

    let response = yona_rust_vcs::run_git_http_backend(GitHttpBackendRequest {
        body: &body_bytes,
        content_type,
        git_protocol,
        method: &method,
        path_info: &path_info,
        query_string: &query_string,
        remote_addr: &remote_addr,
        remote_user: remote_user.as_deref(),
        repo_root: &repo_root,
    });

    match response {
        Ok(output) => {
            if is_receive_pack_post && (200..300).contains(&output.status) {
                if let Some(actor) = principal.as_ref() {
                    record_smart_http_push_side_effects(
                        repository,
                        &authorization.project,
                        actor,
                        &repo_path,
                        before_refs,
                        &public_origin,
                        &base_path,
                    )
                    .await;
                }
            }
            smart_http_backend_response(output)
        }
        Err(VcsError::NotFound) => (StatusCode::NOT_FOUND, "Repository not found").into_response(),
        Err(VcsError::GitUnavailable) => (
            StatusCode::SERVICE_UNAVAILABLE,
            "git executable is unavailable",
        )
            .into_response(),
        Err(VcsError::GitTimedOut) => {
            (StatusCode::GATEWAY_TIMEOUT, "git command timed out").into_response()
        }
        Err(VcsError::GitFailed(message))
            if message.contains("Smart HTTP request body exceeds limit") =>
        {
            (StatusCode::PAYLOAD_TOO_LARGE, "Request Entity Too Large").into_response()
        }
        Err(error) => RestRouteError::from_connect_error(internal_error(error)).into_response(),
    }
}

pub(crate) fn route_from_path(path: &str, base_path: &str) -> Option<SmartHttpRoute> {
    let mut relative = path;
    if base_path != "/" {
        if relative == base_path {
            relative = "/";
        } else if let Some(stripped) = relative.strip_prefix(&format!("{base_path}/")) {
            relative = stripped;
        }
    }
    let segments = relative
        .trim_start_matches('/')
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();
    if segments.len() < 3 {
        return None;
    }
    let owner_name = segments[0].to_string();
    let project_segment = segments[1];
    let git_path = match segments[2..] {
        ["info", "refs"] => "info/refs",
        ["git-upload-pack"] => "git-upload-pack",
        ["git-receive-pack"] => "git-receive-pack",
        _ => return None,
    }
    .to_string();

    let project_name = project_segment
        .strip_suffix(".git")
        .unwrap_or(project_segment)
        .to_string();
    if owner_name.is_empty() || project_name.is_empty() {
        return None;
    }

    Some(SmartHttpRoute {
        git_path,
        owner_name,
        project_name,
    })
}

fn smart_http_has_service(query_string: &str) -> bool {
    query_string
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .any(|(name, value)| name == "service" && !value.trim().is_empty())
}

fn smart_http_requires_write(git_path: &str, query_string: &str) -> bool {
    git_path == "git-receive-pack"
        || query_string
            .split('&')
            .filter_map(|pair| pair.split_once('='))
            .any(|(name, value)| name == "service" && value == "git-receive-pack")
}

fn smart_http_announced_body_too_large(headers: &HeaderMap) -> bool {
    headers
        .get(http::header::CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<usize>().ok())
        .is_some_and(|length| length > MAX_SMART_HTTP_RPC_BYTES)
}

#[derive(Clone, Debug)]
pub(crate) enum SmartHttpAccessFailure {
    AuthenticationRequired,
    Forbidden,
    InvalidProjectScope(ConnectError),
}

pub(crate) fn smart_http_authorization(
    authorization: &persistence::ProjectAuthorizationRecord,
    is_anonymous: bool,
    permission: SmartHttpPermission,
) -> Result<(), SmartHttpAccessFailure> {
    let scope = map_project_scope(&authorization.project.project_scope)
        .map_err(SmartHttpAccessFailure::InvalidProjectScope)?;
    if authorization.viewer.is_site_admin
        || authorization.viewer.is_organization_admin
        || authorization.viewer.is_project_manager
    {
        return Ok(());
    }

    let requires_write = permission == SmartHttpPermission::Write
        || (permission == SmartHttpPermission::Read
            && authorization.project.is_code_accessible_member_only);
    if requires_write {
        if authorization.viewer.is_project_member
            || (authorization.viewer.is_organization_member
                && matches!(scope, ProjectScope::Public | ProjectScope::Protected))
        {
            return Ok(());
        }
        return if is_anonymous {
            Err(SmartHttpAccessFailure::AuthenticationRequired)
        } else {
            Err(SmartHttpAccessFailure::Forbidden)
        };
    }

    if matches!(scope, ProjectScope::Public)
        || authorization.viewer.is_project_member
        || (authorization.viewer.is_organization_member && matches!(scope, ProjectScope::Protected))
    {
        return Ok(());
    }

    if is_anonymous {
        Err(SmartHttpAccessFailure::AuthenticationRequired)
    } else {
        Err(SmartHttpAccessFailure::Forbidden)
    }
}

pub(crate) async fn smart_http_principal_from_headers(
    headers: &HeaderMap,
    session_manager: &SessionManager,
    repository: &PilotRepository,
) -> Result<Option<persistence::AppUserRecord>, Response> {
    match parse_basic_authorization(headers) {
        Ok(Some((identifier, secret))) => {
            let Some(user) = repository
                .find_user_by_identifier(&identifier)
                .await
                .map_err(|error| {
                    RestRouteError::from_connect_error(internal_error(error)).into_response()
                })?
            else {
                return Err(smart_http_basic_challenge_response());
            };
            let password_matches = verify(&secret, &user.password_hash).unwrap_or(false);
            let token_matches = repository
                .read_api_token_for_user(user.id)
                .await
                .map_err(|error| {
                    RestRouteError::from_connect_error(internal_error(error)).into_response()
                })?
                .is_some_and(|token| !token.is_empty() && token == secret);
            if !(password_matches || token_matches) {
                return Err(smart_http_basic_challenge_response());
            }
            if confirmation_session_required() && !user.is_confirmed {
                return Err(smart_http_basic_challenge_response());
            }
            Ok(Some(user))
        }
        Ok(None) => {
            let Some(session) = session_manager.read_session_from_headers(headers) else {
                return Ok(None);
            };
            let Some(user_id) = session.user_id else {
                return Ok(None);
            };
            repository.find_user_by_id(user_id).await.map_err(|error| {
                RestRouteError::from_connect_error(internal_error(error)).into_response()
            })
        }
        Err(()) => Err(smart_http_basic_challenge_response()),
    }
}

fn parse_basic_authorization(headers: &HeaderMap) -> Result<Option<(String, String)>, ()> {
    let Some(value) = headers.get(AUTHORIZATION) else {
        return Ok(None);
    };
    let value = value.to_str().map_err(|_| ())?;
    let Some(encoded) = value
        .trim()
        .strip_prefix("Basic ")
        .or_else(|| value.trim().strip_prefix("basic "))
    else {
        return Ok(None);
    };
    let decoded = general_purpose::STANDARD.decode(encoded).map_err(|_| ())?;
    let Some(separator) = decoded.iter().position(|byte| *byte == b':') else {
        return Err(());
    };
    let login_id = iso_8859_1_bytes_to_string(&decoded[..separator]);
    let password = iso_8859_1_bytes_to_string(&decoded[separator + 1..]);
    Ok(Some((login_id, password)))
}

fn iso_8859_1_bytes_to_string(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| char::from(*byte)).collect()
}

pub(crate) fn smart_http_basic_challenge_response() -> Response {
    let mut response = (StatusCode::UNAUTHORIZED, LEGACY_LOGIN_REQUIRED_MESSAGE).into_response();
    response.headers_mut().insert(
        WWW_AUTHENTICATE,
        HeaderValue::from_static("Basic realm=\"Yona\""),
    );
    response
}

fn smart_http_remote_addr(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .or_else(|| headers.get("x-real-ip"))
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("127.0.0.1")
        .to_string()
}

fn smart_http_backend_response(output: yona_rust_vcs::GitHttpBackendResponse) -> Response {
    let status = StatusCode::from_u16(output.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut response = (status, output.body).into_response();
    for (name, value) in output.headers {
        let Ok(name) = HeaderName::from_bytes(name.as_bytes()) else {
            continue;
        };
        let Ok(value) = HeaderValue::from_str(&value) else {
            continue;
        };
        if name == http::header::CONTENT_TYPE {
            response.headers_mut().insert(name, value);
        } else {
            response.headers_mut().append(name, value);
        }
    }
    response
}

async fn record_smart_http_push_side_effects(
    repository: &PilotRepository,
    project: &persistence::ProjectRecord,
    actor: &persistence::AppUserRecord,
    repo_path: &Path,
    before_refs: Vec<GitHeadRefRecord>,
    public_origin: &str,
    base_path: &str,
) {
    let Ok(summary) = smart_http_push_summary(repo_path, before_refs) else {
        return;
    };
    if summary.is_empty() {
        return;
    }
    let ref_names = summary.ref_names();
    let commit_count = summary.commits().len();
    let notification_message =
        legacy_push_notification_message(&project.project_name, commit_count, &ref_names);
    let _ = repository
        .record_git_push(
            project.id,
            actor.id,
            &summary.updated_branch_names(),
            &summary.deleted_branch_names(),
            &notification_message,
        )
        .await;
    record_pull_request_commit_changed_side_effects(
        repository,
        project,
        actor,
        &summary,
        public_origin,
        base_path,
    )
    .await;
    dispatch_git_push_webhooks(
        repository,
        project,
        actor,
        &summary,
        public_origin,
        base_path,
    )
    .await;
}

async fn record_pull_request_commit_changed_side_effects(
    repository: &PilotRepository,
    project: &persistence::ProjectRecord,
    actor: &persistence::AppUserRecord,
    summary: &SmartHttpPushSummary,
    public_origin: &str,
    base_path: &str,
) {
    let branches = summary
        .updated_refs
        .iter()
        .filter(|change| !change.commits.is_empty())
        .map(|change| persistence::PullRequestCommitChangedBranchInput {
            branch_name: change.short_ref.clone(),
            commits: change
                .commits
                .iter()
                .map(|commit| persistence::PullRequestPushedCommitInput {
                    author_email: commit.author_email.clone(),
                    commit_id: commit.commit_id.clone(),
                    commit_message: commit.message.clone(),
                })
                .collect(),
        })
        .collect::<Vec<_>>();
    if branches.is_empty() {
        return;
    }

    let Ok(changed) = repository
        .record_pull_request_commit_changes(persistence::PullRequestCommitChangedInput {
            actor_id: actor.id,
            actor_login_id: actor.login_id.clone(),
            branches,
            project_id: project.id,
        })
        .await
    else {
        return;
    };

    for record in changed {
        let detail_markdown = record.commit_messages.join("\n");
        dispatch_pull_request_webhooks(
            repository,
            &record.pull_request,
            actor,
            "PULL_REQUEST_COMMIT_CHANGED",
            &detail_markdown,
            None,
            None,
            public_origin,
            base_path,
        )
        .await;
    }
}

fn smart_http_push_summary(
    repo_path: &Path,
    before_refs: Vec<GitHeadRefRecord>,
) -> Result<SmartHttpPushSummary, VcsError> {
    let after_refs = yona_rust_vcs::read_head_refs(repo_path)?;
    let before_by_full_name = before_refs
        .iter()
        .map(|record| (record.full_name.clone(), record.clone()))
        .collect::<HashMap<_, _>>();
    let after_by_full_name = after_refs
        .iter()
        .map(|record| (record.full_name.clone(), record.clone()))
        .collect::<HashMap<_, _>>();
    let before_oids = before_refs
        .iter()
        .map(|record| record.object_id.clone())
        .collect::<Vec<_>>();

    let mut updated_refs = Vec::new();
    for after in after_refs {
        let before = before_by_full_name.get(&after.full_name);
        if before.is_some_and(|before| before.object_id == after.object_id) {
            continue;
        }
        let old_oid = before.map(|record| record.object_id.clone());
        let commits = yona_rust_vcs::read_push_commits(
            repo_path,
            old_oid.as_deref(),
            &after.object_id,
            &before_oids,
        )?;
        updated_refs.push(SmartHttpPushChange {
            commits,
            full_ref: after.full_name,
            new_oid: after.object_id,
            old_oid,
            short_ref: after.short_name,
        });
    }

    let deleted_refs = before_refs
        .into_iter()
        .filter(|before| !after_by_full_name.contains_key(&before.full_name))
        .collect::<Vec<_>>();

    Ok(SmartHttpPushSummary {
        deleted_refs,
        updated_refs,
    })
}

fn legacy_push_notification_message(
    project_name: &str,
    commit_count: usize,
    ref_names: &[String],
) -> String {
    if ref_names.len() == 1 {
        format!(
            "notification.pushed.commits.to: {project_name} {commit_count} {}",
            ref_names[0]
        )
    } else {
        format!("notification.pushed.commits: {project_name} {commit_count}")
    }
}

async fn dispatch_git_push_webhooks(
    repository: &PilotRepository,
    project: &persistence::ProjectRecord,
    actor: &persistence::AppUserRecord,
    summary: &SmartHttpPushSummary,
    public_origin: &str,
    base_path: &str,
) {
    let Ok(webhooks) = repository.list_project_webhooks(project.id).await else {
        return;
    };
    if webhooks.webhooks.is_empty() {
        return;
    }
    let commits = summary.commits();
    let body =
        git_push_webhook_payload(project, actor, summary, &commits, public_origin, base_path);
    for webhook in webhooks.webhooks {
        if !webhook.git_push {
            continue;
        }
        let webhook_type = project_webhook_type_label(webhook.webhook_type);
        let delivery = deliver_webhook(OutboundWebhook {
            body: body.clone(),
            event_type: "NEW_COMMIT".to_string(),
            payload_url: webhook.payload_url.clone(),
            secret: webhook.secret.clone(),
            webhook_type: webhook_type.clone(),
        });
        record_project_webhook_delivery(
            repository,
            &webhook,
            "NEW_COMMIT",
            &webhook_type,
            &body,
            &delivery,
        )
        .await;
    }
}

fn git_push_webhook_payload(
    project: &persistence::ProjectRecord,
    actor: &persistence::AppUserRecord,
    summary: &SmartHttpPushSummary,
    commits: &[GitPushCommitRecord],
    public_origin: &str,
    base_path: &str,
) -> String {
    let commit_values = commits
        .iter()
        .map(|commit| {
            serde_json::json!({
                "id": commit.commit_id.as_str(),
                "message": commit.message.as_str(),
                "timestamp": commit.timestamp.as_str(),
                "url": absolute_app_url(
                    public_origin,
                    base_path,
                    &format!(
                        "/{}/{}/commit/{}",
                        project.owner_name, project.project_name, commit.commit_id
                    ),
                ),
                "author": {
                    "name": commit.author_name.as_str(),
                    "email": commit.author_email.as_str(),
                },
                "committer": {
                    "name": commit.committer_name.as_str(),
                    "email": commit.committer_email.as_str(),
                },
            })
        })
        .collect::<Vec<_>>();
    let head_commit = commit_values
        .first()
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let ref_names = summary.ref_names();
    serde_json::json!({
        "ref": ref_names,
        "commits": commit_values,
        "head_commit": head_commit,
        "sender": {
            "login": actor.login_id.as_str(),
            "id": actor.id,
            "avatar_url": "",
            "type": "User",
            "site_admin": actor.is_site_admin,
        },
        "pusher": {
            "name": actor.display_name.as_str(),
            "email": actor.email_address.as_str(),
        },
        "repository": {
            "id": project.id,
            "name": project.project_name.as_str(),
            "owner": project.owner_name.as_str(),
            "html_url": base_path_href(
                base_path,
                &format!("/{}/{}", project.owner_name, project.project_name),
            ),
            "overview": project.overview.clone().unwrap_or_default(),
            "private": project.project_scope.eq_ignore_ascii_case("private"),
        },
    })
    .to_string()
}
