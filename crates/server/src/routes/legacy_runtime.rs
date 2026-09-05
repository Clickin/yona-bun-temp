use axum::{
    extract::{Form, Path as AxumPath, Query},
    http::{HeaderMap, Method, StatusCode},
    response::{IntoResponse, Json, Redirect, Response},
    routing::{get, post},
    Router,
};
use std::collections::HashMap;
use std::path::Path;
use sea_orm::entity::prelude::DateTime;

use crate::assets::serve_frontend_page;
use crate::{
    base_path_href, headers_with_form_csrf, legacy_external_api_hello, map_project_scope,
    persistence, redirect_to, repository_namespace_lock, require_session, require_valid_csrf,
    rest_project_menu_settings, AssetMode, BrowserRuntimeConfig, PilotBackend, PilotRepository,
    PilotServiceImpl, RestRouteError,
};
use yoram_domain::{
    can_create_organization_project, can_create_personal_project, is_valid_project_name,
};
use yoram_persistence::{IssueListFilter, MilestoneListFilter, PostingListFilter};

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
        let repo_path = match yoram_vcs::repository_path_for_vcs(
            data_root,
            &project.vcs,
            &project.owner_name,
            &project.project_name,
        ) {
            Ok(repo_path) => repo_path,
            Err(error) => {
                tracing::warn!(
                    %error,
                    project_id = project.id,
                    owner = %project.owner_name,
                    project = %project.project_name,
                    vcs = %project.vcs,
                    "legacy /_init repository provisioning failed"
                );
                continue;
            }
        };
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

pub(crate) async fn direct_legacy_migration(
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
    service: PilotServiceImpl,
    assets: AssetMode,
    browser_runtime: BrowserRuntimeConfig,
) -> Response {
    if !service.github_allow_migration {
        return direct_legacy_migration_disabled(headers, service, assets, browser_runtime).await;
    }
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

    let mut browser_runtime = browser_runtime;
    if let Some(code) = query
        .get("code")
        .map(String::as_str)
        .filter(|code| !code.trim().is_empty())
    {
        match exchange_github_migration_code(&service, code).await {
            Ok(token) => {
                browser_runtime = browser_runtime.with_migration_token(token);
            }
            Err(error) => {
                tracing::warn!(%error, "legacy migration OAuth token exchange failed");
            }
        }
    }
    serve_frontend_page(assets, Method::GET, browser_runtime).await
}

async fn exchange_github_migration_code(
    service: &PilotServiceImpl,
    code: &str,
) -> Result<String, String> {
    let provider = service
        .oauth
        .configured_provider("github")
        .ok_or_else(|| "github OAuth provider is not configured".to_string())?;
    if provider.client_id.trim().is_empty() || provider.client_secret.trim().is_empty() {
        return Err("github OAuth client credentials are not configured".to_string());
    }
    if provider.access_token_url.trim().is_empty() {
        return Err("github OAuth access token URL is not configured".to_string());
    }

    let response = reqwest::Client::new()
        .post(provider.access_token_url.trim())
        .header(reqwest::header::ACCEPT, "application/json, application/x-www-form-urlencoded")
        .form(&[
            ("client_id", provider.client_id.as_str()),
            ("client_secret", provider.client_secret.as_str()),
            ("code", code),
        ])
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();
    let body = response.text().await.map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(format!("github OAuth token endpoint returned {status}"));
    }
    parse_github_access_token(&body).ok_or_else(|| {
        "github OAuth token response did not include access_token".to_string()
    })
}

fn parse_github_access_token(body: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|value| value.get("access_token")?.as_str().map(ToString::to_string))
        .or_else(|| {
            body.split('&').find_map(|part| {
                let (key, value) = part.split_once('=')?;
                (key == "access_token" && !value.is_empty()).then(|| value.to_string())
            })
        })
}

pub(crate) async fn direct_legacy_migration_json(
    headers: HeaderMap,
    AxumPath(legacy_path): AxumPath<String>,
    Query(query): Query<HashMap<String, String>>,
    service: PilotServiceImpl,
) -> Response {
    // Legacy gates only the migration HUB page behind
    // `github.allow.migration` (MigrationApp.java:51-54); every JSON export
    // endpoint (projects/project/labels/issuelabel/milestones/issues/posts) is
    // login-only (`@AnonymousCheck(requiresLogin = true)`,
    // MigrationApp.java:93-94,121-122,161-162,185-186,204-205,216-217,228-229),
    // so this catch-all must not require the flag.
    let Some(actor_id) = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id)
    else {
        return Redirect::to(&base_path_href(
            &service.base_path,
            "/users/loginform?redirectUrl=%2Fmigration",
        ))
        .into_response();
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("migration requires repository backend")
            .into_response();
    };

    let segments = legacy_path.split('/').collect::<Vec<_>>();
    let result = match segments.as_slice() {
        ["projects"] => migration_projects(repository, actor_id).await,
        [owner, "projects", project_name] => {
            migration_project(repository, owner, project_name).await
        }
        [owner, "projects", project_name, "labels"] => {
            migration_labels(repository, owner, project_name).await
        }
        [owner, "projects", project_name, "issuelabel"] => {
            migration_issue_label_pairs(repository, owner, project_name).await
        }
        [owner, "projects", project_name, "milestones"] => {
            migration_milestones(repository, owner, project_name).await
        }
        [owner, "projects", project_name, "issues"] => {
            migration_issues(
                repository,
                owner,
                project_name,
                &service.base_path,
                migration_wiki_commit_requested(&query),
            )
            .await
        }
        [owner, "projects", project_name, "posts"] => {
            migration_posts(
                repository,
                owner,
                project_name,
                &service.base_path,
                migration_wiki_commit_requested(&query),
            )
            .await
        }
        _ => Err(MigrationRouteError::NotFound),
    };
    match result {
        Ok(payload) => Json(payload).into_response(),
        Err(MigrationRouteError::NotFound) => {
            RestRouteError::not_found("migration resource not found").into_response()
        }
        Err(MigrationRouteError::Database(error)) => {
            RestRouteError::internal(error.to_string()).into_response()
        }
    }
}

fn migration_wiki_commit_requested(query: &HashMap<String, String>) -> bool {
    query
        .get("withWikiCommit")
        // Legacy MigrationApp.java: `isNotBlank(v) && v.endsWith("true")` —
        // blank check trims, endsWith runs on the raw value.
        .is_some_and(|value| !value.trim().is_empty() && value.ends_with("true"))
}

enum MigrationRouteError {
    NotFound,
    Database(sea_orm::DbErr),
}

async fn migration_projects(
    repository: &PilotRepository,
    actor_id: i64,
) -> Result<serde_json::Value, MigrationRouteError> {
    let projects = repository
        .list_projects()
        .await
        .map_err(MigrationRouteError::Database)?;
    let mut result = Vec::new();
    for project in projects {
        let Some(actor_authorization) = repository
            .read_project_authorization(
                &project.owner_name,
                &project.project_name,
                Some(actor_id),
            )
            .await
            .map_err(MigrationRouteError::Database)?
        else {
            continue;
        };
        let viewer = actor_authorization.viewer;
        if viewer.is_site_admin || viewer.is_project_manager || viewer.is_organization_admin {
            result.push(serde_json::json!({
                "owner": project.owner_name,
                "projectName": project.project_name,
                "private": project.project_scope.eq_ignore_ascii_case("private"),
                "members": repository.count_project_members(project.id).await
                    .map_err(MigrationRouteError::Database)?,
                "full_name": format!("{}/{}", project.owner_name, project.project_name),
            }));
        }
    }
    Ok(serde_json::Value::Array(result))
}

async fn migration_project(
    repository: &PilotRepository,
    owner: &str,
    project_name: &str,
) -> Result<serde_json::Value, MigrationRouteError> {
    let Some(project) = repository
        .read_project_by_owner_and_name(owner, project_name)
        .await
        .map_err(MigrationRouteError::Database)?
    else {
        return Err(MigrationRouteError::NotFound);
    };
    let issues = migration_issue_records(repository, owner, project_name)
        .await?;
    let posts = migration_post_records(repository, owner, project_name)
        .await?;
    let milestones = repository
        .list_project_milestones(
            owner,
            project_name,
            MilestoneListFilter {
                order_by: "dueDate".to_string(),
                order_dir: "asc".to_string(),
                state: "all".to_string(),
            },
        )
        .await
        .map_err(MigrationRouteError::Database)?;

    let mut assignee_logins = std::collections::BTreeSet::new();
    for issue in &issues {
        if !issue.assignee_login_id.trim().is_empty() {
            assignee_logins.insert(issue.assignee_login_id.clone());
        }
    }
    let mut assignees = Vec::new();
    for login in assignee_logins {
        if let Some(user) = repository
            .find_user_by_identifier(&login)
            .await
            .map_err(MigrationRouteError::Database)?
        {
            assignees.push(serde_json::json!({
                "name": user.display_name,
                "login": user.login_id,
                "email": user.email_address,
            }));
        }
    }

    Ok(migration_project_summary_json(
        &project,
        repository
            .count_project_members(project.id)
            .await
            .map_err(MigrationRouteError::Database)?,
        issues.len(),
        posts.len(),
        milestones.len(),
        assignees,
    ))
}

fn migration_project_summary_json(
    project: &yoram_persistence::ProjectRecord,
    member_count: u32,
    issue_count: usize,
    post_count: usize,
    milestone_count: usize,
    assignees: Vec<serde_json::Value>,
) -> serde_json::Value {
    serde_json::json!({
        "owner": project.owner_name,
        "projectName": project.project_name,
        "full_name": format!("{}/{}", project.owner_name, project.project_name),
        "assignees": assignees,
        "memberCount": member_count,
        "issueCount": issue_count,
        "postCount": post_count,
        "milestoneCount": milestone_count,
    })
}

async fn migration_labels(
    repository: &PilotRepository,
    owner: &str,
    project_name: &str,
) -> Result<serde_json::Value, MigrationRouteError> {
    if repository
        .read_project_by_owner_and_name(owner, project_name)
        .await
        .map_err(MigrationRouteError::Database)?
        .is_none()
    {
        return Err(MigrationRouteError::NotFound);
    }
    let labels = repository
        .list_project_labels(owner, project_name)
        .await
        .map_err(MigrationRouteError::Database)?
        .into_iter()
        .map(|label| {
            (
                label.id.to_string(),
                serde_json::json!({
                    "id": label.id,
                    "name": label.name,
                    "categoryId": label.category_id,
                    "categoryName": label.category_name,
                }),
            )
        })
        .collect::<serde_json::Map<_, _>>();
    Ok(serde_json::json!({ "labels": labels }))
}

async fn migration_issue_label_pairs(
    repository: &PilotRepository,
    owner: &str,
    project_name: &str,
) -> Result<serde_json::Value, MigrationRouteError> {
    let issues = migration_issue_records(repository, owner, project_name).await?;
    let issue_label_pairs = issues
        .into_iter()
        .flat_map(|issue| {
            issue.labels.into_iter().map(move |label| {
                serde_json::json!({
                    "issueId": issue.id,
                    "issueLabelId": label.id,
                })
            })
        })
        .collect::<Vec<_>>();
    Ok(serde_json::json!({ "issueLabelPairs": issue_label_pairs }))
}

async fn migration_milestones(
    repository: &PilotRepository,
    owner: &str,
    project_name: &str,
) -> Result<serde_json::Value, MigrationRouteError> {
    let milestones = repository
        .list_project_milestones(
            owner,
            project_name,
            MilestoneListFilter {
                order_by: "dueDate".to_string(),
                order_dir: "asc".to_string(),
                state: "all".to_string(),
            },
        )
        .await
        .map_err(MigrationRouteError::Database)?;
    if repository
        .read_project_by_owner_and_name(owner, project_name)
        .await
        .map_err(MigrationRouteError::Database)?
        .is_none()
    {
        return Err(MigrationRouteError::NotFound);
    }
    Ok(serde_json::json!({
        "milestones": milestones.into_iter().map(|milestone| serde_json::json!({
            "milestone": {
                "id": milestone.id,
                "title": milestone.title,
                "state": milestone.state,
                "description": milestone.contents_markdown,
                "due_on": milestone.due_date.map(|date| date.format("%Y-%m-%dT%H:%M:%SZ").to_string()),
            }
        })).collect::<Vec<_>>()
    }))
}

async fn migration_issues(
    repository: &PilotRepository,
    owner: &str,
    project_name: &str,
    base_path: &str,
    with_wiki_commit: bool,
) -> Result<serde_json::Value, MigrationRouteError> {
    Ok(serde_json::json!({
        "issues": migration_issue_records(repository, owner, project_name)
            .await?
            .into_iter()
            .map(|issue| migration_issue_json(&issue, base_path, with_wiki_commit))
            .collect::<Vec<_>>()
    }))
}

async fn migration_posts(
    repository: &PilotRepository,
    owner: &str,
    project_name: &str,
    base_path: &str,
    with_wiki_commit: bool,
) -> Result<serde_json::Value, MigrationRouteError> {
    Ok(serde_json::json!({
        "issues": migration_post_records(repository, owner, project_name)
            .await?
            .into_iter()
            .map(|post| migration_post_json(&post, base_path, with_wiki_commit))
            .collect::<Vec<_>>()
    }))
}

async fn migration_issue_records(
    repository: &PilotRepository,
    owner: &str,
    project_name: &str,
) -> Result<Vec<yoram_persistence::IssueRecord>, MigrationRouteError> {
    let mut records = Vec::new();
    let mut page_num = 1;
    loop {
        let page = repository
            .list_project_issues_for_export(
                owner,
                project_name,
                IssueListFilter {
                    assignee_id: None,
                    assignee_login_id: None,
                    author_id: None,
                    author_login_id: None,
                    commenter_id: None,
                    due_date: None,
                    draft_author_login_id: None,
                    filter: None,
                    label_ids: Vec::new(),
                    milestone_id: None,
                    order_by: "number".to_string(),
                    order_dir: "asc".to_string(),
                    page_num,
                    state: None,
                },
            )
            .await
            .map_err(MigrationRouteError::Database)?;
        for item in page.items.clone() {
            if let Some(issue) = repository
                .read_issue_detail(owner, project_name, item.issue_number)
                .await
                .map_err(MigrationRouteError::Database)?
            {
                records.push(issue);
            }
        }
        if page.items.len() < page.page_size as usize || records.len() >= page.total_count as usize {
            break;
        }
        page_num += 1;
    }
    if repository
        .read_project_by_owner_and_name(owner, project_name)
        .await
        .map_err(MigrationRouteError::Database)?
        .is_none()
    {
        return Err(MigrationRouteError::NotFound);
    }
    Ok(records)
}

async fn migration_post_records(
    repository: &PilotRepository,
    owner: &str,
    project_name: &str,
) -> Result<Vec<yoram_persistence::PostingRecord>, MigrationRouteError> {
    let mut records = Vec::new();
    let mut readme_number = None;
    let mut page_num = 1;
    loop {
        let page = repository
            .list_project_postings_filtered(
                owner,
                project_name,
                PostingListFilter {
                    filter: None,
                    label_ids: Vec::new(),
                    order_by: "createdDate".to_string(),
                    order_dir: "asc".to_string(),
                    page_num,
                },
                None,
            )
            .await
            .map_err(MigrationRouteError::Database)?;
        if page_num == 1 {
            readme_number = page.readme.as_ref().map(|post| post.post_number);
        }
        for item in page.items.clone() {
            if let Some(post) = repository
                .read_posting_detail_for_viewer(owner, project_name, item.post_number, None)
                .await
                .map_err(MigrationRouteError::Database)?
            {
                records.push(post);
            }
        }
        if page.items.len() < page.page_size as usize || records.len() >= page.total_count as usize {
            break;
        }
        page_num += 1;
    }
    if let Some(post_number) = readme_number {
        if !records.iter().any(|post| post.post_number == post_number) {
            if let Some(readme) = repository
                .read_posting_detail_for_viewer(owner, project_name, post_number, None)
                .await
                .map_err(MigrationRouteError::Database)?
            {
                records.push(readme);
            }
        }
    }
    if repository
        .read_project_by_owner_and_name(owner, project_name)
        .await
        .map_err(MigrationRouteError::Database)?
        .is_none()
    {
        return Err(MigrationRouteError::NotFound);
    }
    Ok(records)
}

fn migration_issue_json(
    issue: &yoram_persistence::IssueRecord,
    base_path: &str,
    with_wiki_commit: bool,
) -> serde_json::Value {
    let link = format!(
        "{}/{}/{}/issue/{}",
        base_path.trim_end_matches('/'),
        issue.owner_name,
        issue.project_name,
        issue.issue_number
    );
    let mut node = serde_json::Map::new();
    node.insert("id".to_string(), serde_json::json!(issue.id));
    node.insert("title".to_string(), serde_json::json!(issue.title));
    node.insert(
        "body".to_string(),
        serde_json::json!(migration_body(
            &issue.body_markdown,
            &issue.author_login_id,
            &issue.author_label,
            "이슈",
            &link,
            base_path,
            &issue.attachments,
            with_wiki_commit,
        )),
    );
    node.insert(
        "created_at".to_string(),
        serde_json::json!(migration_timestamp(issue.created_at)),
    );
    if !issue.assignee_login_id.is_empty() {
        node.insert(
            "assignee".to_string(),
            serde_json::json!(issue.assignee_login_id),
        );
    }
    if issue.milestone_id.is_some() {
        node.insert("milestone".to_string(), serde_json::json!(issue.milestone_title));
        node.insert("milestoneId".to_string(), serde_json::json!(issue.milestone_id));
    }
    node.insert(
        "closed".to_string(),
        serde_json::json!(issue.state.eq_ignore_ascii_case("closed")),
    );
    serde_json::json!({
        "issue": node,
        "comments": issue.comments.iter().map(|comment| {
            let comment_link = format!("{link}#comment-{}", comment.id);
            migration_comment_json(
                &comment.contents_markdown,
                &comment.author_login_id,
                &comment.author_label,
                &comment_link,
                base_path,
                &comment.attachments,
                comment.created_at,
                with_wiki_commit,
            )
        }).collect::<Vec<_>>(),
    })
}

fn migration_post_json(
    post: &yoram_persistence::PostingRecord,
    base_path: &str,
    with_wiki_commit: bool,
) -> serde_json::Value {
    let link = format!(
        "{}/{}/{}/post/{}",
        base_path.trim_end_matches('/'),
        post.owner_name,
        post.project_name,
        post.post_number
    );
    serde_json::json!({
        "issue": {
            "title": post.title,
            "body": migration_body(
                &post.body_markdown,
                &post.author_login_id,
                &post.author_label,
                "게시글",
                &link,
                base_path,
                &post.attachments,
                with_wiki_commit,
            ),
            "created_at": migration_timestamp(post.created_at),
        },
        "comments": post.comments.iter().map(|comment| {
            let comment_link = format!("{link}#comment-{}", comment.id);
            migration_comment_json(
                &comment.contents_markdown,
                &comment.author_login_id,
                &comment.author_label,
                &comment_link,
                base_path,
                &comment.attachments,
                comment.created_at,
                with_wiki_commit,
            )
        }).collect::<Vec<_>>(),
    })
}

fn migration_comment_json(
    body: &str,
    author_login: &str,
    author_name: &str,
    link: &str,
    base_path: &str,
    attachments: &[yoram_persistence::IssueAttachmentRecord],
    created_at: Option<DateTime>,
    with_wiki_commit: bool,
) -> serde_json::Value {
    serde_json::json!({
        "created_at": migration_timestamp(created_at),
        "body": migration_body(
            body,
            author_login,
            author_name,
            "코멘트",
            link,
            base_path,
            attachments,
            with_wiki_commit,
        ),
    })
}

fn migration_body(
    body: &str,
    author_login: &str,
    author_name: &str,
    kind: &str,
    link: &str,
    base_path: &str,
    attachments: &[yoram_persistence::IssueAttachmentRecord],
    with_wiki_commit: bool,
) -> String {
    let base_prefix = base_path.trim_end_matches('/');
    let absolute_links = migration_body_links(body, base_prefix, with_wiki_commit);
    let mut result = format!(
        "@{} ({}) 님이 작성한 [{}]({})입니다. \n\\---\n\n{}",
        author_login, author_name, kind, link, absolute_links
    );
    if !attachments.is_empty() {
        result.push_str("\n\n--- attachments ---");
        for attachment in attachments {
            result.push_str(&format!(
                "\n[{}]({})",
                attachment.name,
                if with_wiki_commit {
                    format!(
                        "../wiki/files/{}/{}",
                        attachment.id,
                        attachment.name.replace('#', "%23")
                    )
                } else {
                    format!("{}/files/{}", base_path.trim_end_matches('/'), attachment.id)
                }
            ));
        }
    }
    result
}

fn migration_body_links(body: &str, base_prefix: &str, with_wiki_commit: bool) -> String {
    let mut result = body
        .replace(
            "<img src=\"/",
            &format!("<img src=\"{base_prefix}/"),
        )
        .replace(
            "<img src='/",
            &format!("<img src='{base_prefix}/"),
        );
    let original = std::mem::take(&mut result);
    let mut result = String::with_capacity(original.len());
    let mut rest = original.as_str();
    while let Some(link_start) = rest.find("](/") {
        result.push_str(&rest[..link_start + 2]);
        let target_start = link_start + 3;
        let Some(target_end) = rest[target_start..].find(')') else {
            result.push_str(&rest[link_start + 2..]);
            return result;
        };
        let target = &rest[target_start..target_start + target_end];
        let text = result
            .rfind('[')
            .map(|start| result[start + 1..result.len() - 2].to_string())
            .unwrap_or_default();
        if with_wiki_commit {
            result.push_str(&format!("../wiki/{target}/{text}"));
        } else {
            result.push_str(&format!("{base_prefix}/{target}"));
        }
        result.push(')');
        rest = &rest[target_start + target_end + 1..];
    }
    result.push_str(rest);
    result
}

fn migration_timestamp(date: Option<DateTime>) -> String {
    date.map(|date| date.format("%Y-%m-%dT%H:%M:%SZ").to_string())
        .unwrap_or_default()
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
                initial_manager_user_id: None,
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
                initial_manager_user_id: None,
            })
            .await
    };
    let created = match created {
        Ok(created) => created,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };

    let repo_path = match yoram_vcs::repository_path(
        &service.data_root,
        &created.owner_name,
        &created.project_name,
    ) {
        Ok(repo_path) => repo_path,
        Err(error) => return RestRouteError::internal(error.to_string()).into_response(),
    };
    let clone_result = {
        let _guard = repository_namespace_lock().lock().await;
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

// --- legacy global label typeahead -------------------------------------------
// LabelApp.labels/categories (yona-original/app/controllers/LabelApp.java:51-120):
// anonymous (@AnonymousCheck on LabelApp), JSON-only content negotiation,
// required `limit`, response = JSON array of label/category names with a
// Content-Range `items <limit>/<total>` header exactly when total > limit.

const LEGACY_MAX_FETCH_LABELS: u64 = 1000;

// Play `request().accepts("application/json")`: an absent Accept header means
// */* (accepts); otherwise any listed media range matching application/json,
// application/* or */* accepts. q-value weighting is not modeled — the probe
// pins Accept: application/json and page fetches send text/html, which the
// media match already 406s.
fn accepts_application_json(headers: &HeaderMap) -> bool {
    let Some(accept) = headers
        .get(axum::http::header::ACCEPT)
        .and_then(|value| value.to_str().ok())
    else {
        return true;
    };
    accept.split(',').any(|part| {
        let media = part.split(';').next().unwrap_or("").trim().to_ascii_lowercase();
        media == "application/json" || media == "application/*" || media == "*/*"
    })
}

// Legacy binds `limit: Integer` with no default, so missing/blank answers 400
// "No limit" (LabelApp.java:56-58); unparseable values are a Play binding
// failure, which also answers 400.
fn parse_label_limit(query: &HashMap<String, String>) -> Option<u64> {
    let raw = query.get("limit").map(String::as_str).map(str::trim)?;
    if raw.is_empty() {
        return None;
    }
    raw.parse::<u64>().ok()
}

// 200 JSON array of names; the Content-Range header uses the (possibly
// clamped) page limit and the pre-paging total.
fn label_typeahead_response(names: Vec<String>, total: u64, limit: u64) -> Response {
    let mut response = Json(names).into_response();
    if total > limit {
        if let Ok(value) = format!("items {limit}/{total}").parse() {
            response
                .headers_mut()
                .insert(axum::http::header::CONTENT_RANGE, value);
        }
    }
    response
}

async fn direct_global_labels(
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
    service: PilotServiceImpl,
) -> Response {
    if !accepts_application_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let Some(limit) = parse_label_limit(&query) else {
        return legacy_plain_response(StatusCode::BAD_REQUEST, "No limit");
    };
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("labels requires repository backend").into_response();
    };
    let query_text = query.get("query").map(String::as_str).unwrap_or("");
    let category = query.get("category").map(String::as_str).unwrap_or("");
    match repository
        .list_all_label_names(query_text, category, limit)
        .await
    {
        Ok((names, total)) => label_typeahead_response(names, total, limit),
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
}

async fn direct_global_label_categories(
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
    service: PilotServiceImpl,
) -> Response {
    if !accepts_application_json(&headers) {
        return StatusCode::NOT_ACCEPTABLE.into_response();
    }
    let Some(mut limit) = parse_label_limit(&query) else {
        return legacy_plain_response(StatusCode::BAD_REQUEST, "No limit");
    };
    // Categories clamp the limit to MAX_FETCH_LABELS before paging
    // (LabelApp.java:112-114); labels() does not clamp.
    if limit > LEGACY_MAX_FETCH_LABELS {
        limit = LEGACY_MAX_FETCH_LABELS;
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return RestRouteError::not_implemented("labels requires repository backend").into_response();
    };
    let query_text = query.get("query").map(String::as_str).unwrap_or("");
    match repository
        .list_all_label_category_names(query_text, limit)
        .await
    {
        Ok((names, total)) => label_typeahead_response(names, total, limit),
        Err(error) => RestRouteError::internal(error.to_string()).into_response(),
    }
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
    let legacy_migration_json_service = service.clone();
    let global_categories_service = service.clone();
    let global_labels_service = service;

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
            get(move |headers: HeaderMap, query: Query<HashMap<String, String>>| {
                let assets = legacy_migration_assets.clone();
                let browser_runtime = legacy_migration_browser_runtime.clone();
                let service = legacy_migration_service.clone();
                async move {
                    direct_legacy_migration(headers, query, service, assets, browser_runtime)
                        .await
                }
            }),
        )
        .route(
            "/migration/{*legacy_path}",
            get(
                move |
                    headers: HeaderMap,
                    path: AxumPath<String>,
                    query: Query<HashMap<String, String>>,
                | {
                let service = legacy_migration_json_service.clone();
                    async move { direct_legacy_migration_json(headers, path, query, service).await }
                },
            ),
        )
        .route(
            "/labels",
            get(
                move |headers: HeaderMap, query: Query<HashMap<String, String>>| {
                    let service = global_labels_service.clone();
                    async move { direct_global_labels(headers, query, service).await }
                },
            ),
        )
        .route(
            "/categories",
            get(
                move |headers: HeaderMap, query: Query<HashMap<String, String>>| {
                    let service = global_categories_service.clone();
                    async move { direct_global_label_categories(headers, query, service).await }
                },
            ),
        )
}

#[cfg(test)]
mod tests {
    use super::{migration_body, migration_body_links, migration_wiki_commit_requested};
    use std::collections::HashMap;
    use yoram_persistence::IssueAttachmentRecord;

    fn wiki_commit_query(value: Option<&str>) -> HashMap<String, String> {
        let mut query = HashMap::new();
        if let Some(value) = value {
            query.insert("withWikiCommit".to_string(), value.to_string());
        }
        query
    }

    #[test]
    // Legacy MigrationApp.java:346 `isNotBlank(v) && v.endsWith("true")`.
    fn migration_wiki_commit_requested_matches_legacy_ends_with_semantics() {
        assert!(migration_wiki_commit_requested(&wiki_commit_query(Some("true"))));
        // Legacy accepts any non-blank raw value ending in "true".
        assert!(migration_wiki_commit_requested(&wiki_commit_query(Some("nottrue"))));
        // Blank, false, case variants, and trailing-whitespace values are
        // rejected because endsWith runs on the raw (untrimmed) value; a
        // leading space still ends with "true".
        assert!(migration_wiki_commit_requested(&wiki_commit_query(Some(" true"))));
        assert!(!migration_wiki_commit_requested(&wiki_commit_query(Some("TRUE"))));
        assert!(!migration_wiki_commit_requested(&wiki_commit_query(Some(""))));
        assert!(!migration_wiki_commit_requested(&wiki_commit_query(Some("   "))));
        assert!(!migration_wiki_commit_requested(&wiki_commit_query(Some("true "))));
        assert!(!migration_wiki_commit_requested(&wiki_commit_query(None)));
    }

    #[test]
    fn migration_body_links_preserve_legacy_wiki_commit_mode() {
        assert_eq!(
            migration_body_links("<img src=\"/image.png\"> [image](/image.png)", "/yona", false),
            "<img src=\"/yona/image.png\"> [image](/yona/image.png)"
        );
        assert_eq!(
            migration_body_links("[image](/image.png)", "", true),
            "[image](../wiki/image.png/image)"
        );
    }

    #[test]
    // Legacy injects the raw link text into the wiki commit path
    // (`[$1](../wiki/$2/$1)`) without any URL encoding.
    fn migration_body_links_injects_raw_link_text_into_wiki_path() {
        assert_eq!(
            migration_body_links("[한글 링크](/가-나.png)", "/yona", true),
            "[한글 링크](../wiki/가-나.png/한글 링크)"
        );
        assert_eq!(
            migration_body_links("[a b (1)](/dir/file name.png)", "/yona", true),
            "[a b (1)](../wiki/dir/file name.png/a b (1))"
        );
        assert_eq!(
            migration_body_links("[100%](/query?.png)", "/yona", true),
            "[100%](../wiki/query?.png/100%)"
        );
        // Link text differing from the target path.
        assert_eq!(
            migration_body_links("[설명 텍스트](/files/manual.pdf)", "/yona", true),
            "[설명 텍스트](../wiki/files/manual.pdf/설명 텍스트)"
        );
        assert_eq!(
            migration_body_links("[한글 파일](/한글 파일.png)", "/yona", false),
            "[한글 파일](/yona/한글 파일.png)"
        );
    }

    fn attachment(id: i64, name: &str) -> IssueAttachmentRecord {
        IssueAttachmentRecord {
            created_at: None,
            hash: String::new(),
            id,
            mime_type: String::new(),
            name: name.to_string(),
            size: 0,
        }
    }

    #[test]
    // Legacy `addAttachmentsStringUsingWikiCommit` escapes only `#` as `%23`
    // in the attachment file name; every other URL-sensitive character stays raw.
    fn migration_body_wiki_commit_attachments_escape_only_hash() {
        let attachments = vec![
            attachment(1, "screen shot.png"),
            attachment(2, "a#b.png"),
            attachment(3, "100%.png"),
            attachment(4, "query?.png"),
            attachment(5, "paren(1).png"),
            attachment(6, "한글 파일.png"),
        ];
        let body = migration_body(
            "", "author", "Author", "이슈", "/owner/project/issue/1", "/yona", &attachments, true,
        );
        assert!(body.contains("[screen shot.png](../wiki/files/1/screen shot.png)"));
        assert!(body.contains("[a#b.png](../wiki/files/2/a%23b.png)"));
        assert!(body.contains("[100%.png](../wiki/files/3/100%.png)"));
        assert!(body.contains("[query?.png](../wiki/files/4/query?.png)"));
        assert!(body.contains("[paren(1).png](../wiki/files/5/paren(1).png)"));
        assert!(body.contains("[한글 파일.png](../wiki/files/6/한글 파일.png)"));
    }

    #[test]
    // Without wiki commit mode legacy links `YONA_SERVER + url`, which yields
    // the broken protocol-relative `//files/{id}` (YONA_SERVER = "/").
    // Yoram intentionally emits `{base_path}/files/{id}` instead:
    // LEGACY_BUG_NOT_REPRODUCED.
    fn migration_body_plain_attachments_use_working_absolute_path() {
        let attachments = vec![attachment(7, "a#b.png")];
        let body = migration_body(
            "", "author", "Author", "이슈", "/owner/project/issue/1", "/yona", &attachments, false,
        );
        assert!(body.contains("[a#b.png](/yona/files/7)"));
    }
}
