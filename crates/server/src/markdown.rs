use axum::{http::HeaderMap, Json};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;

use crate::api_types::{IssueReferenceMetadata, MentionReferenceMetadata};
use crate::{
    base_path_href, internal_error, persistence, project_code_menu_visible, read_issue_access,
    require_project_read, resolve_issue_reference_search_project, ConnectError, ErrorCode,
    PilotBackend, PilotRepository, PilotServiceImpl, RestRouteError,
};

const MARKDOWN_COMMIT_CANDIDATE_LIMIT: usize = 32;
const MARKDOWN_REFERENCE_CANDIDATE_LIMIT: usize = 32;
const MARKDOWN_REFERENCE_BODY_MAX_BYTES: usize = yoram_vcs::MAX_ISSUE_TEMPLATE_BYTES - 64 * 1024;

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

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct MarkdownCommitReference {
    pub(crate) token: String,
    pub(crate) owner_name: String,
    pub(crate) project_name: String,
    pub(crate) commit_id: String,
    pub(crate) short_id: String,
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestMarkdownReferencesBody {
    body_markdown: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestMarkdownReferencesResponse {
    issue_references: Vec<RestMarkdownIssueReference>,
    mention_references: Vec<RestMarkdownMentionReference>,
    commit_references: Vec<RestMarkdownCommitReference>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestMarkdownIssueReference {
    token: String,
    owner_name: String,
    project_name: String,
    issue_number: i64,
    title: String,
    state: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestMarkdownMentionReference {
    token: String,
    kind: String,
    login_id: String,
    owner_name: String,
    project_name: String,
    label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestMarkdownCommitReference {
    token: String,
    owner_name: String,
    project_name: String,
    commit_id: String,
    short_id: String,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq)]
enum MarkdownProjectTarget {
    Current,
    Owner(String),
    Project(String, String),
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct MarkdownIssueToken {
    token: String,
    target: MarkdownProjectTarget,
    issue_number: i64,
    start: usize,
    end: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct MarkdownCommitToken {
    token: String,
    target: MarkdownProjectTarget,
    commit_id: String,
    start: usize,
    end: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct MarkdownMentionToken {
    token: String,
    path: String,
    start: usize,
    end: usize,
}

#[derive(Clone, Debug)]
struct ResolvedMarkdownCommit {
    owner_name: String,
    project_name: String,
    commit_id: String,
    short_id: String,
}

#[derive(Clone, Debug)]
struct ResolvedMarkdownIssue {
    owner_name: String,
    project_name: String,
    issue_number: i64,
    title: String,
    state: String,
}

#[derive(Clone, Debug)]
struct ResolvedMarkdownMention {
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

pub(crate) async fn rest_markdown_references(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    body: RestMarkdownReferencesBody,
    service: PilotServiceImpl,
) -> Result<Json<RestMarkdownReferencesResponse>, RestRouteError> {
    if body.body_markdown.len() > MARKDOWN_REFERENCE_BODY_MAX_BYTES {
        return Err(RestRouteError::payload_too_large(
            "markdown reference body is too large",
        ));
    }
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "markdown references require repository backend",
        ));
    };
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let authorization = require_project_read(repository, &owner_name, &project_name, actor_id)
        .await
        .map_err(RestRouteError::from_connect_error)?;
    let response = resolve_rest_markdown_references(
        repository,
        &authorization,
        actor_id,
        &body.body_markdown,
        &service.data_root,
    )
    .await
    .map_err(RestRouteError::from_connect_error)?;
    Ok(Json(response))
}

async fn resolve_rest_markdown_references(
    repository: &PilotRepository,
    current: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
    markdown: &str,
    data_root: &Path,
) -> Result<RestMarkdownReferencesResponse, ConnectError> {
    let issue_candidates = markdown_issue_tokens(markdown);
    let mut bounded_issue_candidates = Vec::new();
    let mut bounded_issue_tokens = HashSet::new();
    for candidate in &issue_candidates {
        if bounded_issue_tokens.contains(&candidate.token) {
            continue;
        }
        if bounded_issue_candidates.len() == MARKDOWN_REFERENCE_CANDIDATE_LIMIT {
            break;
        }
        bounded_issue_tokens.insert(candidate.token.clone());
        bounded_issue_candidates.push(candidate.clone());
    }

    let issue_resolution_key = |candidate: &MarkdownIssueToken| {
        markdown_target_names(&candidate.target, current).map(|(owner_name, project_name)| {
            (
                owner_name.to_lowercase(),
                project_name.to_lowercase(),
                candidate.issue_number,
            )
        })
    };
    let mut issue_resolution_inputs = Vec::new();
    let mut seen_issue_resolution_keys = HashSet::new();
    for candidate in &bounded_issue_candidates {
        let Some((owner_name, project_name)) = markdown_target_names(&candidate.target, current)
        else {
            continue;
        };
        let key = (
            owner_name.to_lowercase(),
            project_name.to_lowercase(),
            candidate.issue_number,
        );
        if seen_issue_resolution_keys.insert(key.clone()) {
            issue_resolution_inputs.push((key, owner_name, project_name, candidate.issue_number));
        }
    }

    let mut resolved_issue_candidates = HashMap::new();
    for (key, owner_name, project_name, issue_number) in issue_resolution_inputs {
        match read_issue_access(
            repository,
            &owner_name,
            &project_name,
            issue_number,
            actor_id,
        )
        .await
        {
            Ok(access) => {
                resolved_issue_candidates.insert(
                    key,
                    ResolvedMarkdownIssue {
                        owner_name: access.authorization.project.owner_name,
                        project_name: access.authorization.project.project_name,
                        issue_number: access.issue.issue_number,
                        title: access.issue.title,
                        state: access.issue.state,
                    },
                );
            }
            Err(error) if markdown_reference_is_absent(&error) => {}
            Err(error) => return Err(error),
        }
    }

    let mut issue_references = Vec::new();
    let mut emitted_issue_tokens = HashSet::new();
    let mut resolved_spans = Vec::new();
    for candidate in issue_candidates {
        let Some(key) = issue_resolution_key(&candidate) else {
            continue;
        };
        let Some(issue) = resolved_issue_candidates.get(&key) else {
            continue;
        };
        resolved_spans.push((candidate.start, candidate.end));
        if bounded_issue_tokens.contains(&candidate.token)
            && emitted_issue_tokens.insert(candidate.token.clone())
        {
            issue_references.push(RestMarkdownIssueReference {
                token: candidate.token,
                owner_name: issue.owner_name.clone(),
                project_name: issue.project_name.clone(),
                issue_number: issue.issue_number,
                title: issue.title.clone(),
                state: issue.state.clone(),
            });
        }
    }

    let commit_candidates = markdown_commit_tokens(markdown)
        .into_iter()
        .filter(|candidate| !span_overlaps(&resolved_spans, candidate.start, candidate.end))
        .collect::<Vec<_>>();
    let mut unique_commit_keys = Vec::new();
    let mut seen_commit_keys = HashSet::new();
    for candidate in &commit_candidates {
        let key = (candidate.target.clone(), candidate.commit_id.clone());
        if seen_commit_keys.contains(&key) {
            continue;
        }
        if unique_commit_keys.len() == MARKDOWN_COMMIT_CANDIDATE_LIMIT {
            break;
        }
        seen_commit_keys.insert(key.clone());
        unique_commit_keys.push(key);
    }

    let mut authorized_commit_candidates = Vec::new();
    for (target, revision) in unique_commit_keys {
        let Some(authorization) =
            readable_markdown_project(repository, current, actor_id, &target).await?
        else {
            continue;
        };
        if !authorization.project.vcs.eq_ignore_ascii_case("GIT")
            || !project_code_menu_visible(&authorization, true)
        {
            continue;
        }
        let repo_path = yoram_vcs::repository_path(
            data_root,
            &authorization.project.owner_name,
            &authorization.project.project_name,
        )
        .map_err(internal_error)?;
        authorized_commit_candidates.push((
            (target, revision.clone()),
            authorization.project.owner_name,
            authorization.project.project_name,
            repo_path,
            revision,
        ));
    }

    let resolved_commit_candidates = tokio::task::spawn_blocking(move || {
        authorized_commit_candidates
            .into_iter()
            .filter_map(|(key, owner_name, project_name, repo_path, revision)| {
                yoram_vcs::resolve_git_commit_reference(&repo_path, &revision)
                    .ok()
                    .map(|commit| {
                        (
                            key,
                            ResolvedMarkdownCommit {
                                owner_name,
                                project_name,
                                commit_id: commit.commit_id,
                                short_id: commit.commit_short_id,
                            },
                        )
                    })
            })
            .collect::<HashMap<_, _>>()
    })
    .await
    .map_err(internal_error)?;

    let mut commit_references = Vec::new();
    let mut commit_tokens = HashSet::new();
    for candidate in commit_candidates {
        let key = (candidate.target, candidate.commit_id);
        let Some(commit) = resolved_commit_candidates.get(&key) else {
            continue;
        };
        resolved_spans.push((candidate.start, candidate.end));
        if commit_tokens.insert(candidate.token.clone()) {
            commit_references.push(RestMarkdownCommitReference {
                token: candidate.token,
                owner_name: commit.owner_name.clone(),
                project_name: commit.project_name.clone(),
                commit_id: commit.commit_id.clone(),
                short_id: commit.short_id.clone(),
            });
        }
    }

    let mut mention_candidates = Vec::new();
    let mut mention_tokens = HashSet::new();
    for candidate in markdown_preview_mention_tokens(markdown) {
        if span_overlaps(&resolved_spans, candidate.start, candidate.end) {
            continue;
        }
        if mention_tokens.contains(&candidate.token) {
            continue;
        }
        if mention_candidates.len() == MARKDOWN_REFERENCE_CANDIDATE_LIMIT {
            break;
        }
        mention_tokens.insert(candidate.token.clone());
        mention_candidates.push(candidate);
    }

    let mut mention_resolution_inputs = Vec::new();
    let mut seen_mention_resolution_keys = HashSet::new();
    for candidate in &mention_candidates {
        let key = candidate.path.to_lowercase();
        if seen_mention_resolution_keys.insert(key.clone()) {
            mention_resolution_inputs.push((key, candidate.path.clone()));
        }
    }
    let mut resolved_mention_candidates = HashMap::new();
    for (key, path) in mention_resolution_inputs {
        if let Some(target) = markdown_project_target(&path)
            .filter(|target| matches!(target, MarkdownProjectTarget::Project(_, _)))
        {
            let Some(authorization) =
                readable_markdown_project(repository, current, actor_id, &target).await?
            else {
                continue;
            };
            let login_id = format!(
                "{}/{}",
                authorization.project.owner_name, authorization.project.project_name
            );
            resolved_mention_candidates.insert(
                key,
                ResolvedMarkdownMention {
                    kind: "project".to_string(),
                    login_id: login_id.clone(),
                    owner_name: authorization.project.owner_name,
                    project_name: authorization.project.project_name,
                    label: login_id,
                },
            );
            continue;
        }

        if let Some(organization) = repository
            .read_organization_by_name(&path)
            .await
            .map_err(internal_error)?
        {
            resolved_mention_candidates.insert(
                key,
                ResolvedMarkdownMention {
                    kind: "organization".to_string(),
                    login_id: organization.organization_name.clone(),
                    owner_name: String::new(),
                    project_name: String::new(),
                    label: organization.organization_name,
                },
            );
            continue;
        }

        if let Some(user) = repository
            .find_user_by_login_id(&path)
            .await
            .map_err(internal_error)?
            .filter(|user| !user.login_id.eq_ignore_ascii_case("anonymous"))
        {
            resolved_mention_candidates.insert(
                key,
                ResolvedMarkdownMention {
                    kind: "user".to_string(),
                    login_id: user.login_id,
                    owner_name: String::new(),
                    project_name: String::new(),
                    label: user.display_name,
                },
            );
        }
    }

    let mention_references = mention_candidates
        .into_iter()
        .filter_map(|candidate| {
            resolved_mention_candidates
                .get(&candidate.path.to_lowercase())
                .map(|mention| RestMarkdownMentionReference {
                    token: candidate.token,
                    kind: mention.kind.clone(),
                    login_id: mention.login_id.clone(),
                    owner_name: mention.owner_name.clone(),
                    project_name: mention.project_name.clone(),
                    label: mention.label.clone(),
                })
        })
        .collect();

    Ok(RestMarkdownReferencesResponse {
        issue_references,
        mention_references,
        commit_references,
    })
}

async fn readable_markdown_project(
    repository: &PilotRepository,
    current: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
    target: &MarkdownProjectTarget,
) -> Result<Option<persistence::ProjectAuthorizationRecord>, ConnectError> {
    if matches!(target, MarkdownProjectTarget::Current) {
        return Ok(Some(current.clone()));
    }
    let Some((owner_name, project_name)) = markdown_target_names(target, current) else {
        return Ok(None);
    };
    match require_project_read(repository, &owner_name, &project_name, actor_id).await {
        Ok(authorization) => Ok(Some(authorization)),
        Err(error) if markdown_reference_is_absent(&error) => Ok(None),
        Err(error) => Err(error),
    }
}

fn markdown_reference_is_absent(error: &ConnectError) -> bool {
    matches!(
        error.code,
        ErrorCode::NotFound | ErrorCode::Unauthenticated | ErrorCode::PermissionDenied
    )
}

fn markdown_target_names(
    target: &MarkdownProjectTarget,
    current: &persistence::ProjectAuthorizationRecord,
) -> Option<(String, String)> {
    match target {
        MarkdownProjectTarget::Current => Some((
            current.project.owner_name.clone(),
            current.project.project_name.clone(),
        )),
        MarkdownProjectTarget::Owner(owner_name) => {
            Some((owner_name.clone(), current.project.project_name.clone()))
        }
        MarkdownProjectTarget::Project(owner_name, project_name) => {
            Some((owner_name.clone(), project_name.clone()))
        }
    }
}

fn markdown_project_target(path: &str) -> Option<MarkdownProjectTarget> {
    let mut parts = path.split('/');
    let owner_name = parts.next()?.trim();
    let project_name = parts.next().map(str::trim);
    if owner_name.is_empty() || parts.next().is_some() {
        return None;
    }
    match project_name {
        Some(project_name) if !project_name.is_empty() => Some(MarkdownProjectTarget::Project(
            owner_name.to_string(),
            project_name.to_string(),
        )),
        Some(_) => None,
        None => Some(MarkdownProjectTarget::Owner(owner_name.to_string())),
    }
}

fn markdown_issue_tokens(markdown: &str) -> Vec<MarkdownIssueToken> {
    let mut tokens = Vec::new();
    let mut index = 0;
    while let Some((item, next_index)) = markdown_char(markdown, index) {
        if markdown[..index]
            .chars()
            .next_back()
            .is_some_and(markdown_word_char)
        {
            index = next_index;
            continue;
        }

        let parsed = if item == '#' {
            let end = consume_markdown_digits(markdown, next_index);
            (end > next_index).then(|| (MarkdownProjectTarget::Current, next_index, end))
        } else {
            let path_start = if item == '@' { next_index } else { index };
            let path_end = consume_markdown_path(markdown, path_start);
            markdown_char(markdown, path_end)
                .filter(|(separator, _)| *separator == '#' && path_end > path_start)
                .and_then(|(_, digits_start)| {
                    let end = consume_markdown_digits(markdown, digits_start);
                    (end > digits_start).then(|| {
                        (
                            markdown_project_target(&markdown[path_start..path_end]),
                            digits_start,
                            end,
                        )
                    })
                })
                .and_then(|(target, digits_start, end)| {
                    target.map(|target| (target, digits_start, end))
                })
        };

        if let Some((target, digits_start, end)) = parsed {
            if !markdown_wrapped_by_word(markdown, index, end) {
                if let Ok(issue_number) = markdown[digits_start..end].parse::<i64>() {
                    if issue_number > 0 {
                        tokens.push(MarkdownIssueToken {
                            token: markdown[index..end].to_string(),
                            target,
                            issue_number,
                            start: index,
                            end,
                        });
                    }
                }
            }
            index = end;
            continue;
        }
        index = next_index;
    }
    tokens
}

fn markdown_commit_tokens(markdown: &str) -> Vec<MarkdownCommitToken> {
    let mut tokens = Vec::new();
    let mut index = 0;
    while let Some((item, next_index)) = markdown_char(markdown, index) {
        if markdown[..index]
            .chars()
            .next_back()
            .is_some_and(markdown_word_char)
        {
            index = next_index;
            continue;
        }

        let parsed = if item == '@' {
            let end = consume_markdown_sha(markdown, next_index);
            (end > next_index).then(|| (MarkdownProjectTarget::Current, next_index, end))
        } else if markdown_path_char(item) {
            let path_end = consume_markdown_path(markdown, index);
            match markdown_char(markdown, path_end) {
                Some(('@', sha_start)) => {
                    let end = consume_markdown_sha(markdown, sha_start);
                    (end > sha_start)
                        .then(|| markdown_project_target(&markdown[index..path_end]))
                        .flatten()
                        .map(|target| (target, sha_start, end))
                }
                _ if markdown_sha_char(item) => {
                    let end = consume_markdown_sha(markdown, index);
                    Some((MarkdownProjectTarget::Current, index, end))
                }
                _ => None,
            }
        } else {
            None
        };

        if let Some((target, sha_start, end)) = parsed {
            let sha = &markdown[sha_start..end];
            if (7..=40).contains(&sha.len()) && !markdown_wrapped_by_word(markdown, index, end) {
                tokens.push(MarkdownCommitToken {
                    token: markdown[index..end].to_string(),
                    target,
                    commit_id: sha.to_string(),
                    start: index,
                    end,
                });
            }
            index = end;
            continue;
        }
        index = next_index;
    }
    tokens
}

fn markdown_preview_mention_tokens(markdown: &str) -> Vec<MarkdownMentionToken> {
    let mut tokens = Vec::new();
    let mut index = 0;
    while let Some((item, next_index)) = markdown_char(markdown, index) {
        if item != '@' {
            index = next_index;
            continue;
        }
        let end = consume_markdown_path(markdown, next_index);
        if end > next_index && !markdown_wrapped_by_word(markdown, index, end) {
            tokens.push(MarkdownMentionToken {
                token: markdown[index..end].to_string(),
                path: markdown[next_index..end].to_string(),
                start: index,
                end,
            });
            index = end;
        } else {
            index = next_index;
        }
    }
    tokens
}

fn span_overlaps(spans: &[(usize, usize)], start: usize, end: usize) -> bool {
    spans
        .iter()
        .any(|(other_start, other_end)| start < *other_end && *other_start < end)
}

fn markdown_char(markdown: &str, index: usize) -> Option<(char, usize)> {
    markdown[index..]
        .chars()
        .next()
        .map(|item| (item, index + item.len_utf8()))
}

fn consume_markdown_path(markdown: &str, mut index: usize) -> usize {
    while let Some((item, next_index)) = markdown_char(markdown, index) {
        if !markdown_path_char(item) {
            break;
        }
        index = next_index;
    }
    index
}

fn consume_markdown_digits(markdown: &str, mut index: usize) -> usize {
    while let Some((item, next_index)) = markdown_char(markdown, index) {
        if !item.is_ascii_digit() {
            break;
        }
        index = next_index;
    }
    index
}

fn consume_markdown_sha(markdown: &str, mut index: usize) -> usize {
    while let Some((item, next_index)) = markdown_char(markdown, index) {
        if !markdown_sha_char(item) {
            break;
        }
        index = next_index;
    }
    index
}

fn markdown_path_char(item: char) -> bool {
    item.is_ascii_alphanumeric()
        || matches!(item, '-' | '_' | '.' | '/')
        || ('\u{ac00}'..='\u{d7a3}').contains(&item)
}

fn markdown_sha_char(item: char) -> bool {
    item.is_ascii_digit() || matches!(item, 'a'..='f')
}

fn markdown_word_char(item: char) -> bool {
    item.is_ascii_alphanumeric() || item == '_'
}

fn markdown_wrapped_by_word(markdown: &str, start: usize, end: usize) -> bool {
    markdown[..start]
        .chars()
        .next_back()
        .is_some_and(markdown_word_char)
        || markdown[end..]
            .chars()
            .next()
            .is_some_and(markdown_word_char)
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

pub(crate) async fn markdown_commit_references_for_project(
    repository: &PilotRepository,
    authorization: &persistence::ProjectAuthorizationRecord,
    actor_id: Option<i64>,
    markdowns: &[&str],
    data_root: &Path,
) -> Result<Vec<MarkdownCommitReference>, ConnectError> {
    let markdown = markdowns.join("\n");
    let response =
        resolve_rest_markdown_references(repository, authorization, actor_id, &markdown, data_root)
            .await?;
    Ok(response
        .commit_references
        .into_iter()
        .map(|reference| MarkdownCommitReference {
            token: reference.token,
            owner_name: reference.owner_name,
            project_name: reference.project_name,
            commit_id: reference.commit_id,
            short_id: reference.short_id,
        })
        .collect())
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


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn markdown_mention_tokens_follow_legacy_boundaries() {
        assert_eq!(
            markdown_mention_tokens("@testOwner @testOwner/testProject @nforge @nforge/yobi"),
            vec![
                "nforge".to_string(),
                "nforge/yobi".to_string(),
                "testOwner".to_string(),
                "testOwner/testProject".to_string(),
            ]
        );
        assert!(
            markdown_mention_tokens("mail@example.com owner/@ignored path/@ignored").is_empty()
        );
    }

    #[test]
    fn markdown_preview_token_characters_match_legacy_java_patterns() {
        assert!(markdown_word_char('A'));
        assert!(!markdown_word_char('한'));
        assert!(markdown_path_char('한'));
        assert!(!markdown_path_char('日'));
    }
}
