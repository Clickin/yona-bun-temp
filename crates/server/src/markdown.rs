use serde::Serialize;

use crate::generated::yona::pilot::v1::{IssueReferenceMetadata, MentionReferenceMetadata};
use crate::{
    base_path_href, internal_error, persistence, resolve_issue_reference_search_project,
    ConnectError, PilotRepository,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct MarkdownIssueReference {
    pub(crate) owner_name: String,
    pub(crate) project_name: String,
    pub(crate) issue_number: i64,
    pub(crate) state: String,
    pub(crate) title: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct MarkdownMentionReference {
    pub(crate) kind: String,
    pub(crate) login_id: String,
    pub(crate) owner_name: String,
    pub(crate) project_name: String,
    pub(crate) label: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestIssueReferenceMetadata {
    owner_name: String,
    project_name: String,
    issue_number: i64,
    state: String,
    title: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestMentionReferenceMetadata {
    kind: String,
    login_id: String,
    owner_name: String,
    project_name: String,
    label: String,
}

pub(crate) fn issue_reference_metadata_from_resolved(
    reference: &MarkdownIssueReference,
) -> IssueReferenceMetadata {
    IssueReferenceMetadata {
        owner_name: reference.owner_name.clone(),
        project_name: reference.project_name.clone(),
        issue_number: reference.issue_number,
        state: reference.state.clone(),
        title: reference.title.clone(),
        ..Default::default()
    }
}

pub(crate) fn mention_reference_metadata_from_resolved(
    reference: &MarkdownMentionReference,
) -> MentionReferenceMetadata {
    MentionReferenceMetadata {
        kind: reference.kind.clone(),
        login_id: reference.login_id.clone(),
        owner_name: reference.owner_name.clone(),
        project_name: reference.project_name.clone(),
        label: reference.label.clone(),
        ..Default::default()
    }
}

pub(crate) fn rest_issue_reference_metadata_from_resolved(
    reference: &MarkdownIssueReference,
) -> RestIssueReferenceMetadata {
    RestIssueReferenceMetadata {
        owner_name: reference.owner_name.clone(),
        project_name: reference.project_name.clone(),
        issue_number: reference.issue_number,
        state: reference.state.clone(),
        title: reference.title.clone(),
    }
}

pub(crate) fn rest_mention_reference_metadata_from_resolved(
    reference: &MarkdownMentionReference,
) -> RestMentionReferenceMetadata {
    RestMentionReferenceMetadata {
        kind: reference.kind.clone(),
        login_id: reference.login_id.clone(),
        owner_name: reference.owner_name.clone(),
        project_name: reference.project_name.clone(),
        label: reference.label.clone(),
    }
}

pub(crate) fn markdown_issue_numbers(markdown: &str) -> Vec<i64> {
    let mut numbers = Vec::new();
    let mut chars = markdown.char_indices().peekable();
    while let Some((index, item)) = chars.next() {
        if item != '#' {
            continue;
        }
        if markdown[..index]
            .chars()
            .next_back()
            .is_some_and(|previous| previous.is_ascii_alphanumeric() || previous == '_')
        {
            continue;
        }
        let mut digits = String::new();
        while let Some((_, next)) = chars.peek().copied() {
            if !next.is_ascii_digit() {
                break;
            }
            digits.push(next);
            chars.next();
        }
        if let Ok(number) = digits.parse::<i64>() {
            if number > 0 {
                numbers.push(number);
            }
        }
    }
    numbers.sort_unstable();
    numbers.dedup();
    numbers
}

pub(crate) fn markdown_mention_tokens(markdown: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut chars = markdown.char_indices().peekable();
    while let Some((index, item)) = chars.next() {
        if item != '@' {
            continue;
        }
        if markdown[..index]
            .chars()
            .next_back()
            .is_some_and(|previous| {
                previous.is_ascii_alphanumeric() || matches!(previous, '-' | '_' | '.' | '/')
            })
        {
            continue;
        }
        let mut token = String::new();
        while let Some((_, next)) = chars.peek().copied() {
            if !(next.is_ascii_alphanumeric() || matches!(next, '-' | '_' | '.' | '/')) {
                break;
            }
            token.push(next);
            chars.next();
        }
        if !token.is_empty() {
            tokens.push(token);
        }
    }
    tokens.sort_unstable();
    tokens.dedup();
    tokens
}

pub(crate) async fn markdown_issue_references_for_project(
    repository: &PilotRepository,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
    markdowns: &[&str],
) -> Result<Vec<MarkdownIssueReference>, ConnectError> {
    let mut issue_numbers = markdowns
        .iter()
        .flat_map(|markdown| markdown_issue_numbers(markdown))
        .collect::<Vec<_>>();
    issue_numbers.sort_unstable();
    issue_numbers.dedup();
    if issue_numbers.is_empty() {
        return Ok(Vec::new());
    }

    let search_project =
        resolve_issue_reference_search_project(repository, authorization, actor_id).await?;
    let records = repository
        .list_project_issue_references_by_numbers(
            &search_project.owner_name,
            &search_project.project_name,
            &issue_numbers,
        )
        .await
        .map_err(internal_error)?;
    Ok(records
        .into_iter()
        .map(|record| MarkdownIssueReference {
            owner_name: authorization.project.owner_name.clone(),
            project_name: authorization.project.project_name.clone(),
            issue_number: record.issue_number,
            state: record.state,
            title: record.title,
        })
        .collect())
}

pub(crate) async fn markdown_mention_references(
    repository: &PilotRepository,
    markdowns: &[&str],
) -> Result<Vec<MarkdownMentionReference>, ConnectError> {
    let mut tokens = markdowns
        .iter()
        .flat_map(|markdown| markdown_mention_tokens(markdown))
        .collect::<Vec<_>>();
    tokens.sort_unstable();
    tokens.dedup();

    let mut references = Vec::new();
    for token in tokens {
        if let Some((owner_name, project_name)) = token.split_once('/') {
            if let Some(project) = repository
                .read_project_by_owner_and_name(owner_name, project_name)
                .await
                .map_err(internal_error)?
            {
                references.push(MarkdownMentionReference {
                    kind: "project".to_string(),
                    login_id: String::new(),
                    owner_name: project.owner_name,
                    project_name: project.project_name,
                    label: format!("{owner_name}/{project_name}"),
                });
            }
            continue;
        }

        if let Some(user) = repository
            .find_user_by_login_id(&token)
            .await
            .map_err(internal_error)?
        {
            references.push(MarkdownMentionReference {
                kind: "user".to_string(),
                login_id: user.login_id,
                owner_name: String::new(),
                project_name: String::new(),
                label: user.display_name,
            });
            continue;
        }

        if let Some(organization) = repository
            .read_organization_by_name(&token)
            .await
            .map_err(internal_error)?
        {
            references.push(MarkdownMentionReference {
                kind: "organization".to_string(),
                login_id: organization.organization_name,
                owner_name: String::new(),
                project_name: String::new(),
                label: organization.description.unwrap_or_default(),
            });
        }
    }

    Ok(references)
}

pub(crate) fn rewrite_code_browser_markdown_image_links(
    markdown: &str,
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    branch: &str,
) -> String {
    let mut rendered = String::with_capacity(markdown.len());
    let mut index = 0;

    while let Some(relative_start) = markdown[index..].find("![") {
        let start = index + relative_start;
        rendered.push_str(&markdown[index..start]);
        let Some(relative_label_end) = markdown[start + 2..].find("](") else {
            rendered.push_str(&markdown[start..]);
            return rendered;
        };
        let label_end = start + 2 + relative_label_end;
        let target_start = label_end + 2;
        let Some(relative_target_end) = markdown[target_start..].find(')') else {
            rendered.push_str(&markdown[start..]);
            return rendered;
        };
        let target_end = target_start + relative_target_end;
        let target = &markdown[target_start..target_end];
        rendered.push_str(&markdown[start..target_start]);
        if let Some(local_path) = markdown_local_dot_path(target) {
            let href = base_path_href(
                base_path,
                &format!("/{owner_name}/{project_name}/files/{branch}/{local_path}"),
            );
            rendered.push_str(&href);
        } else {
            rendered.push_str(target);
        }
        rendered.push(')');
        index = target_end + 1;
    }

    rendered.push_str(&markdown[index..]);
    rendered
}

pub(crate) fn rewrite_project_readme_markdown_links(
    markdown: &str,
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    branch: &str,
) -> String {
    let image_filtered = rewrite_code_browser_markdown_image_links(
        markdown,
        base_path,
        owner_name,
        project_name,
        branch,
    );
    rewrite_project_readme_markdown_normal_links(
        &image_filtered,
        base_path,
        owner_name,
        project_name,
        branch,
    )
}

fn rewrite_project_readme_markdown_normal_links(
    markdown: &str,
    base_path: &str,
    owner_name: &str,
    project_name: &str,
    branch: &str,
) -> String {
    let mut rendered = String::with_capacity(markdown.len());
    let mut index = 0;

    while let Some(relative_start) = markdown[index..].find('[') {
        let start = index + relative_start;
        rendered.push_str(&markdown[index..start]);
        let previous = markdown[..start].chars().next_back();
        if previous == Some('!') {
            rendered.push('[');
            index = start + 1;
            continue;
        }
        let Some(relative_label_end) = markdown[start + 1..].find("](") else {
            rendered.push_str(&markdown[start..]);
            return rendered;
        };
        let label_end = start + 1 + relative_label_end;
        let target_start = label_end + 2;
        let Some(relative_target_end) = markdown[target_start..].find(')') else {
            rendered.push_str(&markdown[start..]);
            return rendered;
        };
        let target_end = target_start + relative_target_end;
        let target = &markdown[target_start..target_end];
        rendered.push_str(&markdown[start..target_start]);
        if previous.is_some() {
            if let Some(local_path) = markdown_local_dot_path(target) {
                let href = base_path_href(
                    base_path,
                    &format!("/{owner_name}/{project_name}/code/{branch}/{local_path}"),
                );
                rendered.push_str(&href);
            } else {
                rendered.push_str(target);
            }
        } else {
            rendered.push_str(target);
        }
        rendered.push(')');
        index = target_end + 1;
    }

    rendered.push_str(&markdown[index..]);
    rendered
}

fn markdown_local_dot_path(target: &str) -> Option<&str> {
    let trimmed = target.trim();
    let local_path = trimmed
        .strip_prefix("./")
        .or_else(|| trimmed.strip_prefix("/./"))?;
    let scheme_prefix = local_path
        .split_once(':')
        .map(|(scheme, _)| scheme.to_ascii_lowercase());
    if matches!(
        scheme_prefix.as_deref(),
        Some("http" | "https" | "ftp" | "file")
    ) {
        return None;
    }
    (!local_path.is_empty()).then_some(local_path)
}
