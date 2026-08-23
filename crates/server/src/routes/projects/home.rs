use super::*;
use std::path::Path as StdPath;
use yoram_vcs::{ProjectHistoryCommitRecord, VcsError};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectContainerResponse {
    #[serde(flatten)]
    container: ProjectContainer,
    dashboard: RestProjectDashboard,
    history: RestProjectHistory,
    readme_file: Option<RestProjectReadmeFile>,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDashboard {
    assignees: Vec<RestProjectDashboardAssignee>,
    labels: Vec<RestProjectDashboardLabel>,
    milestones: Vec<RestProjectDashboardMilestone>,
    no_milestone_open_issue_count: u32,
    pull_requests: Vec<RestProjectDashboardPullRequest>,
    unassigned_open_issue_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDashboardAssignee {
    avatar_url: String,
    login_id: String,
    open_issue_count: u32,
    user_id: i64,
    user_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDashboardLabel {
    category_id: Option<i64>,
    category_is_exclusive: bool,
    category_name: String,
    color: String,
    id: i64,
    name: String,
    open_issue_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDashboardMilestone {
    closed_issue_count: u32,
    completion_percent: u32,
    id: i64,
    open_issue_count: u32,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectDashboardPullRequest {
    contributor_avatar_url: String,
    contributor_login_id: String,
    contributor_user_id: i64,
    contributor_user_label: String,
    created_label: String,
    pull_request_number: i64,
    title: String,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectHistory {
    items: Vec<RestProjectHistoryItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectHistoryItem {
    actor_avatar_url: String,
    actor_name: String,
    actor_url: String,
    created_label: String,
    item_type: String,
    short_title: String,
    #[serde(skip)]
    sort_key: i64,
    title: String,
    url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectReadmeFile {
    body_html: String,
    body_markdown: String,
    mention_references: Vec<RestMentionReferenceMetadata>,
    name: String,
}

pub(super) async fn rest_read_project_container(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    tab_id: Option<String>,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let request = ReadProjectContainerRequest {
        owner_name: owner_name.clone(),
        project_name: project_name.clone(),
        ..Default::default()
    };
    let request = rest_owned_view::<ReadProjectContainerRequestView<'static>>(&request)?;
    let context = Context::new(headers.clone());
    let (payload, ctx) = project_container_read(&service, context, request)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let requested_tab = tab_id.as_deref();
    let readme_file = if requested_tab.is_none() || requested_tab == Some("readme") {
        rest_project_readme_file(&service, &headers, &payload)
            .await
            .map_err(RestRouteError::from_connect_error)?
    } else {
        None
    };
    let dashboard = if requested_tab.is_none() || requested_tab == Some("dashboard") {
        rest_project_home_dashboard(&service, &headers, &payload)
            .await
            .map_err(RestRouteError::from_connect_error)?
    } else {
        RestProjectDashboard::default()
    };
    let history = if requested_tab.is_none() || requested_tab == Some("history") {
        rest_project_home_history(&service, &payload)
            .await
            .map_err(RestRouteError::from_connect_error)?
    } else {
        RestProjectHistory::default()
    };
    Ok(rest_json_response(
        RestProjectContainerResponse {
            container: payload,
            dashboard,
            history,
            readme_file,
        },
        ctx,
    ))
}

async fn rest_project_home_dashboard(
    service: &PilotServiceImpl,
    headers: &HeaderMap,
    container: &ProjectContainer,
) -> Result<RestProjectDashboard, ConnectError> {
    if !container.show_issue {
        return Ok(RestProjectDashboard::default());
    }
    let actor_id = service
        .session_manager
        .read_session_from_headers(headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Ok(RestProjectDashboard::default());
    };
    let authorization = repository
        .read_project_authorization(&container.owner_name, &container.project_name, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let assignees = repository
        .list_project_dashboard_assignees(authorization.project.id)
        .await
        .map_err(internal_error)?
        .into_iter()
        .map(|assignee| RestProjectDashboardAssignee {
            avatar_url: gravatar_url(&assignee.email_address),
            login_id: assignee.login_id,
            open_issue_count: assignee.open_issue_count,
            user_id: assignee.user_id,
            user_label: assignee.user_label,
        })
        .collect();
    let labels = repository
        .list_project_dashboard_labels(authorization.project.id)
        .await
        .map_err(internal_error)?
        .into_iter()
        .map(|label| RestProjectDashboardLabel {
            category_id: label.category_id,
            category_is_exclusive: label.category_is_exclusive,
            category_name: label.category_name,
            color: label.color,
            id: label.id,
            name: label.name,
            open_issue_count: label.open_issue_count,
        })
        .collect();
    let milestones = repository
        .list_project_dashboard_open_milestones(authorization.project.id)
        .await
        .map_err(internal_error)?
        .into_iter()
        .map(|milestone| RestProjectDashboardMilestone {
            closed_issue_count: milestone.closed_issue_count,
            completion_percent: milestone.completion_percent,
            id: milestone.id,
            open_issue_count: milestone.open_issue_count,
            title: milestone.title,
        })
        .collect();
    let pull_requests = if container.show_pull_request {
        repository
            .list_project_dashboard_pull_requests(authorization.project.id, 10)
            .await
            .map_err(internal_error)?
            .into_iter()
            .map(|pull_request| RestProjectDashboardPullRequest {
                contributor_avatar_url: gravatar_url(&pull_request.contributor_email_address),
                contributor_login_id: pull_request.contributor_login_id,
                contributor_user_id: pull_request.contributor_user_id,
                contributor_user_label: pull_request.contributor_user_label,
                created_label: pull_request.created_label,
                pull_request_number: pull_request.pull_request_number,
                title: pull_request.title,
            })
            .collect()
    } else {
        Vec::new()
    };
    let no_milestone_open_issue_count = repository
        .count_no_milestone_open_issues_for_project(authorization.project.id)
        .await
        .map_err(internal_error)?;
    let unassigned_open_issue_count = repository
        .count_unassigned_open_issues_for_project(authorization.project.id)
        .await
        .map_err(internal_error)?;
    Ok(RestProjectDashboard {
        assignees,
        labels,
        milestones,
        no_milestone_open_issue_count,
        pull_requests,
        unassigned_open_issue_count,
    })
}

async fn rest_project_home_history(
    service: &PilotServiceImpl,
    container: &ProjectContainer,
) -> Result<RestProjectHistory, ConnectError> {
    let PilotBackend::Repository(repository) = &service.backend else {
        return Ok(RestProjectHistory::default());
    };
    let mut items: Vec<RestProjectHistoryItem> = repository
        .list_project_home_history_items(&container.owner_name, &container.project_name)
        .await
        .map_err(internal_error)?
        .into_iter()
        .map(|item| RestProjectHistoryItem {
            actor_avatar_url: gravatar_url(&item.actor_email_address),
            actor_name: item.actor_name,
            actor_url: if item.actor_login_id.trim().is_empty() {
                "#".to_string()
            } else {
                base_path_href(&service.base_path, &format!("/{}", item.actor_login_id))
            },
            created_label: item.created_label,
            item_type: item.item_type,
            short_title: item.short_title,
            sort_key: item
                .created_at
                .map(|value| value.and_utc().timestamp())
                .unwrap_or_default(),
            title: item.title,
            url: base_path_href(&service.base_path, &item.url_path),
        })
        .collect();
    if let Some(project) = repository
        .read_project_by_owner_and_name(&container.owner_name, &container.project_name)
        .await
        .map_err(internal_error)?
    {
        let repo_path = yoram_vcs::repository_path(
            &service.data_root,
            &project.owner_name,
            &project.project_name,
        )
        .map_err(internal_error)?;
        for commit in
            yoram_vcs::read_project_history_commits(&repo_path, 10).map_err(code_browser_error)?
        {
            items.push(rest_project_history_item_from_commit(
                &service.base_path,
                &container.owner_name,
                &container.project_name,
                commit,
            ));
        }
    }
    items.sort_by(|left, right| {
        right
            .sort_key
            .cmp(&left.sort_key)
            .then(right.url.cmp(&left.url))
    });
    Ok(RestProjectHistory { items })
}

fn rest_project_history_item_from_commit(
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    commit: ProjectHistoryCommitRecord,
) -> RestProjectHistoryItem {
    RestProjectHistoryItem {
        actor_avatar_url: gravatar_url(&commit.author_email),
        actor_name: if commit.author_name.trim().is_empty() {
            commit.author_email.clone()
        } else {
            commit.author_name
        },
        actor_url: "#".to_string(),
        created_label: commit.author_date,
        item_type: "commit".to_string(),
        short_title: commit.commit_short_id,
        sort_key: commit.author_timestamp,
        title: commit.short_message,
        url: base_path_href(
            base_path,
            &format!("/{owner_name}/{project_name}/commit/{}", commit.commit_id),
        ),
    }
}

async fn rest_project_readme_file(
    service: &PilotServiceImpl,
    headers: &HeaderMap,
    container: &ProjectContainer,
) -> Result<Option<RestProjectReadmeFile>, ConnectError> {
    if !container.show_code {
        return Ok(None);
    }
    let actor_id = service
        .session_manager
        .read_session_from_headers(headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Ok(None);
    };
    let authorization = repository
        .read_project_authorization(&container.owner_name, &container.project_name, actor_id)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| ConnectError::not_found("project not found"))?;
    let repo_path = yoram_vcs::repository_path(
        &service.data_root,
        &authorization.project.owner_name,
        &authorization.project.project_name,
    )
    .map_err(internal_error)?;
    let mut readme = project_readme_file_from_git(
        &repo_path,
        &service.base_path,
        &authorization.project.owner_name,
        &authorization.project.project_name,
    )?;
    if let Some(readme) = readme.as_mut() {
        readme.mention_references =
            markdown_mention_references(repository, &[readme.body_markdown.as_str()])
                .await?
                .iter()
                .map(rest_mention_reference_metadata_from_resolved)
                .collect();
    }
    Ok(readme)
}

fn project_readme_file_from_git(
    repo_path: &StdPath,
    base_path: &str,
    owner_name: &str,
    project_name: &str,
) -> Result<Option<RestProjectReadmeFile>, ConnectError> {
    for candidate in [
        "README.md",
        "readme.md",
        "README.markdown",
        "readme.markdown",
    ] {
        match yoram_vcs::read_code_browser(repo_path, None, candidate) {
            Ok(snapshot) => {
                let Some(file) = snapshot.file else {
                    continue;
                };
                if !code_file_record_is_renderable_markdown(&file) {
                    continue;
                }
                let body_markdown = rewrite_project_readme_markdown_links(
                    &file.text,
                    base_path,
                    owner_name,
                    project_name,
                    &snapshot.selected_branch,
                );
                return Ok(Some(RestProjectReadmeFile {
                    body_html: String::new(),
                    body_markdown,
                    mention_references: Vec::new(),
                    name: file.name,
                }));
            }
            Err(VcsError::NotFound) => continue,
            Err(error) => return Err(code_browser_error(error)),
        }
    }

    Ok(None)
}
