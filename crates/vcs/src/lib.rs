use std::path::{Component, Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

pub const CRATE_OWNER: &str = "vcs";
pub const HISTORY_ITEM_LIMIT: usize = 25;
pub const MAX_TEXT_FILE_BYTES: i64 = 1024 * 1024;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeBrowserSnapshot {
    pub branches: Vec<CodeBranchRecord>,
    pub breadcrumbs: Vec<CodeBreadcrumbRecord>,
    pub entries: Vec<CodeEntryRecord>,
    pub file: Option<CodeFileRecord>,
    pub no_head: bool,
    pub path: String,
    pub selected_branch: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeBranchRecord {
    pub name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeBreadcrumbRecord {
    pub name: String,
    pub path: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeEntryRecord {
    pub commit_date: String,
    pub commit_message: String,
    pub commit_short_id: String,
    pub kind: String,
    pub name: String,
    pub path: String,
    pub size: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeFileRecord {
    pub is_binary: bool,
    pub is_too_large: bool,
    pub mime_type: String,
    pub name: String,
    pub path: String,
    pub size: i64,
    pub text: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeFileBytesRecord {
    pub bytes: Vec<u8>,
    pub mime_type: String,
    pub name: String,
    pub path: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeHistorySnapshot {
    pub branches: Vec<CodeBranchRecord>,
    pub breadcrumbs: Vec<CodeBreadcrumbRecord>,
    pub commits: Vec<CodeCommitRecord>,
    pub has_newer: bool,
    pub has_older: bool,
    pub no_head: bool,
    pub page: u32,
    pub path: String,
    pub selected_branch: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeCommitRecord {
    pub author_date: String,
    pub author_email: String,
    pub author_name: String,
    pub comment_count: u32,
    pub commit_id: String,
    pub commit_short_id: String,
    pub message: String,
    pub short_message: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeCommitDetailSnapshot {
    pub branches: Vec<CodeBranchRecord>,
    pub breadcrumbs: Vec<CodeBreadcrumbRecord>,
    pub commit: Option<CodeCommitRecord>,
    pub files: Vec<CodeCommitFileDiffRecord>,
    pub no_head: bool,
    pub parent_commit: Option<CodeCommitParentRecord>,
    pub path: String,
    pub selected_branch: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeCommitParentRecord {
    pub commit_id: String,
    pub commit_short_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeCommitFileDiffRecord {
    pub path: String,
    pub patch: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeCompareSnapshot {
    pub commit_a: Option<CodeCommitRecord>,
    pub commit_b: Option<CodeCommitRecord>,
    pub files: Vec<CodeCommitFileDiffRecord>,
    pub no_head: bool,
    pub rev_a: String,
    pub rev_b: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestDiffSnapshot {
    pub commits: Vec<PullRequestDiffCommitRecord>,
    pub files: Vec<PullRequestChangedFileRecord>,
    pub no_head: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestDiffCommitRecord {
    pub author_date_label: String,
    pub author_email: String,
    pub commit_id: String,
    pub commit_message: String,
    pub commit_short_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestChangedFileRecord {
    pub path: String,
    pub patch: String,
}

#[derive(Debug, thiserror::Error)]
pub enum VcsError {
    #[error("git executable is unavailable")]
    GitUnavailable,
    #[error("git command timed out")]
    GitTimedOut,
    #[error("invalid repository path")]
    InvalidRepositoryPath,
    #[error("invalid repository object path")]
    InvalidPath,
    #[error("repository object not found")]
    NotFound,
    #[error("git command failed: {0}")]
    GitFailed(String),
}

pub fn repository_path(data_root: &Path, project_id: i64) -> PathBuf {
    data_root.join("repo").join(format!("{project_id}.git"))
}

pub fn read_code_browser(
    repo_path: &Path,
    branch: Option<&str>,
    path: &str,
) -> Result<CodeBrowserSnapshot, VcsError> {
    if !repo_path.exists() {
        return Ok(no_head_snapshot());
    }
    let repo_path = repo_path.to_path_buf();
    let clean_path = normalize_repo_path(path)?;
    let branches = list_branches(&repo_path)?;
    if branches.is_empty() || !has_head(&repo_path) {
        return Ok(no_head_snapshot());
    }
    let selected_branch = match branch.map(str::trim).filter(|value| !value.is_empty()) {
        Some(branch) => branch.to_string(),
        None => default_branch(&repo_path).unwrap_or_else(|| branches[0].name.clone()),
    };
    if !branches.iter().any(|branch| branch.name == selected_branch) {
        return Err(VcsError::NotFound);
    }

    let object_spec = object_spec(&selected_branch, &clean_path);
    let object_type = git_output(&repo_path, &["cat-file", "-t", &object_spec])?;
    let breadcrumbs = breadcrumbs_for_path(&clean_path);
    match object_type.trim() {
        "tree" => Ok(CodeBrowserSnapshot {
            branches,
            breadcrumbs,
            entries: list_tree_entries(&repo_path, &selected_branch, &clean_path)?,
            file: None,
            no_head: false,
            path: clean_path,
            selected_branch,
        }),
        "blob" => Ok(CodeBrowserSnapshot {
            branches,
            breadcrumbs,
            entries: Vec::new(),
            file: Some(read_file(&repo_path, &selected_branch, &clean_path)?),
            no_head: false,
            path: clean_path,
            selected_branch,
        }),
        _ => Err(VcsError::NotFound),
    }
}

pub fn read_file_bytes(
    repo_path: &Path,
    revision: &str,
    path: &str,
) -> Result<CodeFileBytesRecord, VcsError> {
    if !repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::NotFound);
    }
    let revision = revision.trim();
    if revision.is_empty() {
        return Err(VcsError::NotFound);
    }
    let spec = object_spec(revision, &clean_path);
    let object_type = git_output(repo_path, &["cat-file", "-t", &spec])?;
    if object_type.trim() != "blob" {
        return Err(VcsError::NotFound);
    }
    let bytes = git_bytes(repo_path, &["show", &spec])?;
    Ok(CodeFileBytesRecord {
        bytes,
        mime_type: mime_guess::from_path(&clean_path)
            .first_or_octet_stream()
            .to_string(),
        name: Path::new(&clean_path)
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_string(),
        path: clean_path,
    })
}

pub fn read_archive_zip(repo_path: &Path, revision: &str) -> Result<Vec<u8>, VcsError> {
    if !repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let revision = revision.trim();
    if revision.is_empty() || revision.starts_with('-') || !revision_exists(repo_path, revision) {
        return Err(VcsError::NotFound);
    }

    git_bytes(repo_path, &["archive", "--format=zip", revision])
}

pub fn read_code_history(
    repo_path: &Path,
    branch: Option<&str>,
    path: &str,
    page: u32,
) -> Result<CodeHistorySnapshot, VcsError> {
    if !repo_path.exists() {
        return Ok(no_head_history_snapshot(page));
    }
    let repo_path = repo_path.to_path_buf();
    let clean_path = normalize_repo_path(path)?;
    let branches = list_branches(&repo_path)?;
    if branches.is_empty() || !has_head(&repo_path) {
        return Ok(no_head_history_snapshot(page));
    }
    let selected_branch = match branch.map(str::trim).filter(|value| !value.is_empty()) {
        Some(branch) => branch.to_string(),
        None => default_branch(&repo_path).unwrap_or_else(|| branches[0].name.clone()),
    };
    if !branches.iter().any(|branch| branch.name == selected_branch) {
        return Err(VcsError::NotFound);
    }

    let breadcrumbs = breadcrumbs_for_path(&clean_path);
    let commits = list_history_commits(&repo_path, &selected_branch, &clean_path, page)?;
    let has_older = commits.len() > HISTORY_ITEM_LIMIT;
    Ok(CodeHistorySnapshot {
        branches,
        breadcrumbs,
        commits: commits.into_iter().take(HISTORY_ITEM_LIMIT).collect(),
        has_newer: page > 0,
        has_older,
        no_head: false,
        page,
        path: clean_path,
        selected_branch,
    })
}

pub fn read_commit_detail(
    repo_path: &Path,
    commit_id: &str,
    branch: Option<&str>,
    path: &str,
) -> Result<CodeCommitDetailSnapshot, VcsError> {
    if !repo_path.exists() {
        return Ok(no_head_commit_detail_snapshot());
    }
    let repo_path = repo_path.to_path_buf();
    let clean_path = normalize_repo_path(path)?;
    let branches = list_branches(&repo_path)?;
    if branches.is_empty() || !has_head(&repo_path) {
        return Ok(no_head_commit_detail_snapshot());
    }
    let selected_branch = match branch.map(str::trim).filter(|value| !value.is_empty()) {
        Some(branch) => branch.to_string(),
        None => default_branch(&repo_path).unwrap_or_else(|| branches[0].name.clone()),
    };
    if !branches.iter().any(|branch| branch.name == selected_branch) {
        return Err(VcsError::NotFound);
    }

    let commit_id = commit_id.trim();
    if commit_id.is_empty() {
        return Err(VcsError::NotFound);
    }
    ensure_commit_exists(&repo_path, commit_id)?;

    let commit = read_commit_record(&repo_path, commit_id)?;
    let parent_commit = read_parent_commit(&repo_path, commit_id)?;
    let diff = git_output(
        &repo_path,
        &[
            "show",
            "--format=",
            "--find-renames",
            "--patch",
            "--unified=3",
            commit_id,
        ],
    )?;

    Ok(CodeCommitDetailSnapshot {
        branches,
        breadcrumbs: breadcrumbs_for_path(&clean_path),
        commit: Some(commit),
        files: parse_commit_diff_files(&diff),
        no_head: false,
        parent_commit,
        path: clean_path,
        selected_branch,
    })
}

pub fn read_compare_diff(
    repo_path: &Path,
    rev_a: &str,
    rev_b: &str,
) -> Result<CodeCompareSnapshot, VcsError> {
    let rev_a = rev_a.trim();
    let rev_b = rev_b.trim();
    if rev_a.is_empty() || rev_b.is_empty() {
        return Err(VcsError::NotFound);
    }
    if !repo_path.exists() {
        return Ok(no_head_compare_snapshot(rev_a, rev_b));
    }
    if !has_head(repo_path) {
        return Ok(no_head_compare_snapshot(rev_a, rev_b));
    }
    ensure_commit_exists(repo_path, rev_a)?;
    ensure_commit_exists(repo_path, rev_b)?;
    let commit_a = read_commit_record(repo_path, rev_a)?;
    let commit_b = read_commit_record(repo_path, rev_b)?;
    let diff = git_output(
        repo_path,
        &[
            "diff",
            "--find-renames",
            "--patch",
            "--unified=3",
            rev_a,
            rev_b,
        ],
    )?;
    Ok(CodeCompareSnapshot {
        commit_a: Some(commit_a),
        commit_b: Some(commit_b),
        files: parse_commit_diff_files(&diff),
        no_head: false,
        rev_a: rev_a.to_string(),
        rev_b: rev_b.to_string(),
    })
}

pub fn read_pull_request_diff(
    repo_path: &Path,
    from_branch: &str,
    to_branch: &str,
) -> Result<PullRequestDiffSnapshot, VcsError> {
    if !repo_path.exists() {
        return Ok(no_head_pull_request_diff());
    }
    let branches = list_branches(repo_path)?;
    if branches.is_empty() || !has_head(repo_path) {
        return Ok(no_head_pull_request_diff());
    }
    if !branch_exists(&branches, from_branch) || !branch_exists(&branches, to_branch) {
        return Ok(no_head_pull_request_diff());
    }

    read_pull_request_diff_range(repo_path, to_branch, from_branch)
}

pub fn read_pull_request_diff_between_revisions(
    repo_path: &Path,
    base_revision: &str,
    head_revision: &str,
) -> Result<PullRequestDiffSnapshot, VcsError> {
    if !repo_path.exists() {
        return Ok(no_head_pull_request_diff());
    }
    if !has_head(repo_path) {
        return Ok(no_head_pull_request_diff());
    }
    let base_revision = base_revision.trim();
    let head_revision = head_revision.trim();
    if base_revision.is_empty()
        || head_revision.is_empty()
        || !revision_exists(repo_path, base_revision)
        || !revision_exists(repo_path, head_revision)
    {
        return Ok(no_head_pull_request_diff());
    }

    read_pull_request_diff_range(repo_path, base_revision, head_revision)
}

pub fn list_repository_branches(repo_path: &Path) -> Result<Vec<CodeBranchRecord>, VcsError> {
    if !repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    if !has_head(repo_path) {
        return Ok(Vec::new());
    }
    list_branches(repo_path)
}

fn read_pull_request_diff_range(
    repo_path: &Path,
    base_revision: &str,
    head_revision: &str,
) -> Result<PullRequestDiffSnapshot, VcsError> {
    let commits = list_pull_request_commits(repo_path, base_revision, head_revision)?;
    let diff = git_output(
        repo_path,
        &[
            "diff",
            "--find-renames",
            "--patch",
            "--unified=3",
            base_revision,
            head_revision,
        ],
    )?;
    Ok(PullRequestDiffSnapshot {
        commits,
        files: parse_diff_files(&diff),
        no_head: false,
    })
}

fn no_head_snapshot() -> CodeBrowserSnapshot {
    CodeBrowserSnapshot {
        branches: Vec::new(),
        breadcrumbs: Vec::new(),
        entries: Vec::new(),
        file: None,
        no_head: true,
        path: String::new(),
        selected_branch: String::new(),
    }
}

fn no_head_pull_request_diff() -> PullRequestDiffSnapshot {
    PullRequestDiffSnapshot {
        commits: Vec::new(),
        files: Vec::new(),
        no_head: true,
    }
}

fn no_head_history_snapshot(page: u32) -> CodeHistorySnapshot {
    CodeHistorySnapshot {
        branches: Vec::new(),
        breadcrumbs: Vec::new(),
        commits: Vec::new(),
        has_newer: page > 0,
        has_older: false,
        no_head: true,
        page,
        path: String::new(),
        selected_branch: String::new(),
    }
}

fn no_head_commit_detail_snapshot() -> CodeCommitDetailSnapshot {
    CodeCommitDetailSnapshot {
        branches: Vec::new(),
        breadcrumbs: Vec::new(),
        commit: None,
        files: Vec::new(),
        no_head: true,
        parent_commit: None,
        path: String::new(),
        selected_branch: String::new(),
    }
}

fn no_head_compare_snapshot(rev_a: &str, rev_b: &str) -> CodeCompareSnapshot {
    CodeCompareSnapshot {
        commit_a: None,
        commit_b: None,
        files: Vec::new(),
        no_head: true,
        rev_a: rev_a.to_string(),
        rev_b: rev_b.to_string(),
    }
}

fn list_branches(repo_path: &Path) -> Result<Vec<CodeBranchRecord>, VcsError> {
    let output = git_output(
        repo_path,
        &["for-each-ref", "--format=%(refname:short)", "refs/heads"],
    )?;
    Ok(output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(|name| CodeBranchRecord {
            name: name.to_string(),
        })
        .collect())
}

fn branch_exists(branches: &[CodeBranchRecord], name: &str) -> bool {
    let normalized = name.trim();
    !normalized.is_empty() && branches.iter().any(|branch| branch.name == normalized)
}

fn revision_exists(repo_path: &Path, revision: &str) -> bool {
    let spec = format!("{revision}^{{commit}}");
    git_output(repo_path, &["rev-parse", "--verify", &spec]).is_ok()
}

fn has_head(repo_path: &Path) -> bool {
    git_output(repo_path, &["rev-parse", "--verify", "HEAD"]).is_ok()
}

fn default_branch(repo_path: &Path) -> Option<String> {
    git_output(repo_path, &["symbolic-ref", "--quiet", "--short", "HEAD"])
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn list_tree_entries(
    repo_path: &Path,
    branch: &str,
    path: &str,
) -> Result<Vec<CodeEntryRecord>, VcsError> {
    let spec = object_spec(branch, path);
    let output = git_output(repo_path, &["ls-tree", "-l", &spec])?;
    let mut entries = Vec::new();
    for line in output.lines() {
        let Some((metadata, name)) = line.split_once('\t') else {
            continue;
        };
        let fields = metadata.split_whitespace().collect::<Vec<_>>();
        if fields.len() < 4 {
            continue;
        }
        let kind = if fields[1] == "tree" {
            "folder"
        } else {
            "file"
        };
        let size = fields[3].parse::<i64>().unwrap_or_default();
        let entry_path = join_repo_path(path, name);
        let (commit_short_id, commit_message, commit_date) =
            latest_commit_for_path(repo_path, branch, &entry_path);
        entries.push(CodeEntryRecord {
            commit_date,
            commit_message,
            commit_short_id,
            kind: kind.to_string(),
            name: name.to_string(),
            path: entry_path,
            size,
        });
    }
    entries.sort_by(|left, right| {
        left.kind
            .cmp(&right.kind)
            .then_with(|| left.name.cmp(&right.name))
    });
    Ok(entries)
}

fn latest_commit_for_path(repo_path: &Path, branch: &str, path: &str) -> (String, String, String) {
    let Ok(output) = git_output(
        repo_path,
        &["log", "-1", "--format=%h%x1f%s%x1f%cs", branch, "--", path],
    ) else {
        return (String::new(), String::new(), String::new());
    };
    let mut parts = output.trim().split('\x1f');
    (
        parts.next().unwrap_or_default().to_string(),
        parts.next().unwrap_or_default().to_string(),
        parts.next().unwrap_or_default().to_string(),
    )
}

fn list_pull_request_commits(
    repo_path: &Path,
    base_revision: &str,
    head_revision: &str,
) -> Result<Vec<PullRequestDiffCommitRecord>, VcsError> {
    let range = format!("{base_revision}..{head_revision}");
    let output = git_output(
        repo_path,
        &[
            "log",
            "--format=%H%x1f%h%x1f%s%x1f%ae%x1f%ad",
            "--date=short",
            &range,
        ],
    )?;
    Ok(output
        .lines()
        .filter_map(|line| {
            let mut parts = line.split('\x1f');
            let commit_id = parts.next()?.to_string();
            let commit_short_id = parts.next().unwrap_or_default().to_string();
            let commit_message = parts.next().unwrap_or_default().to_string();
            let author_email = parts.next().unwrap_or_default().to_string();
            let author_date_label = parts.next().unwrap_or_default().to_string();
            Some(PullRequestDiffCommitRecord {
                author_date_label,
                author_email,
                commit_id,
                commit_message,
                commit_short_id,
            })
        })
        .collect())
}

fn list_history_commits(
    repo_path: &Path,
    branch: &str,
    path: &str,
    page: u32,
) -> Result<Vec<CodeCommitRecord>, VcsError> {
    let max_count = format!("--max-count={}", HISTORY_ITEM_LIMIT + 1);
    let skip = format!(
        "--skip={}",
        usize::try_from(page).unwrap_or_default() * HISTORY_ITEM_LIMIT
    );
    let format = "--format=%x1e%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%ad";
    let mut args = vec![
        "log",
        "--date=short",
        format,
        max_count.as_str(),
        skip.as_str(),
        branch,
    ];
    if !path.is_empty() {
        args.push("--");
        args.push(path);
    }

    let output = git_output(repo_path, &args)?;
    Ok(output
        .split('\x1e')
        .filter_map(|record| {
            let record = record.trim_matches(|character| character == '\r' || character == '\n');
            if record.is_empty() {
                return None;
            }
            let mut parts = record.split('\x1f');
            let commit_id = parts.next()?.to_string();
            let commit_short_id = parts.next().unwrap_or_default().to_string();
            let short_message = parts.next().unwrap_or_default().to_string();
            let author_name = parts.next().unwrap_or_default().to_string();
            let author_email = parts.next().unwrap_or_default().to_string();
            let author_date = parts.next().unwrap_or_default().to_string();
            Some(CodeCommitRecord {
                author_date,
                author_email,
                author_name,
                comment_count: 0,
                commit_id,
                commit_short_id,
                message: short_message.clone(),
                short_message,
            })
        })
        .collect())
}

fn ensure_commit_exists(repo_path: &Path, commit_id: &str) -> Result<(), VcsError> {
    let spec = format!("{commit_id}^{{commit}}");
    let object_type = git_output(repo_path, &["cat-file", "-t", &spec])?;
    if object_type.trim() == "commit" {
        Ok(())
    } else {
        Err(VcsError::NotFound)
    }
}

fn read_commit_record(repo_path: &Path, commit_id: &str) -> Result<CodeCommitRecord, VcsError> {
    let output = git_output(
        repo_path,
        &[
            "show",
            "-s",
            "--date=short",
            "--format=%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%ad%x1f%B",
            commit_id,
        ],
    )?;
    let mut parts = output.trim_end().splitn(7, '\x1f');
    let commit_id = parts.next().unwrap_or_default().to_string();
    let commit_short_id = parts.next().unwrap_or_default().to_string();
    let short_message = parts.next().unwrap_or_default().to_string();
    let author_name = parts.next().unwrap_or_default().to_string();
    let author_email = parts.next().unwrap_or_default().to_string();
    let author_date = parts.next().unwrap_or_default().to_string();
    let message = parts
        .next()
        .unwrap_or(&short_message)
        .trim_end()
        .to_string();
    Ok(CodeCommitRecord {
        author_date,
        author_email,
        author_name,
        comment_count: 0,
        commit_id,
        commit_short_id,
        message,
        short_message,
    })
}

fn read_parent_commit(
    repo_path: &Path,
    commit_id: &str,
) -> Result<Option<CodeCommitParentRecord>, VcsError> {
    let output = git_output(repo_path, &["show", "-s", "--format=%P", commit_id])?;
    let Some(parent_commit_id) = output.split_whitespace().next() else {
        return Ok(None);
    };
    let commit_short_id = git_output(repo_path, &["rev-parse", "--short=7", parent_commit_id])?
        .trim()
        .to_string();
    Ok(Some(CodeCommitParentRecord {
        commit_id: parent_commit_id.to_string(),
        commit_short_id,
    }))
}

fn parse_commit_diff_files(diff: &str) -> Vec<CodeCommitFileDiffRecord> {
    parse_diff_files(diff)
        .into_iter()
        .map(|file| CodeCommitFileDiffRecord {
            path: file.path,
            patch: file.patch,
        })
        .collect()
}

fn parse_diff_files(diff: &str) -> Vec<PullRequestChangedFileRecord> {
    let mut files = Vec::new();
    let mut current_path = String::new();
    let mut current_patch = Vec::new();

    for line in diff.lines() {
        if line.starts_with("diff --git ") {
            if !current_patch.is_empty() {
                files.push(PullRequestChangedFileRecord {
                    path: current_path.clone(),
                    patch: current_patch.join("\n"),
                });
                current_patch.clear();
            }
            current_path = line
                .split_whitespace()
                .nth(3)
                .map(clean_diff_path)
                .unwrap_or_default();
        }
        if let Some(path) = line.strip_prefix("+++ ") {
            let path = clean_diff_path(path);
            if !path.is_empty() {
                current_path = path;
            }
        } else if current_path.is_empty() && line.starts_with("--- ") {
            current_path = line
                .strip_prefix("--- ")
                .map(clean_diff_path)
                .unwrap_or_default();
        }
        if !line.is_empty() || !current_patch.is_empty() {
            current_patch.push(line.to_string());
        }
    }

    if !current_patch.is_empty() {
        files.push(PullRequestChangedFileRecord {
            path: current_path,
            patch: current_patch.join("\n"),
        });
    }

    files
}

fn clean_diff_path(path: &str) -> String {
    let cleaned = path
        .trim()
        .trim_matches('"')
        .strip_prefix("b/")
        .or_else(|| path.trim().trim_matches('"').strip_prefix("a/"))
        .unwrap_or_else(|| path.trim().trim_matches('"'))
        .to_string();
    if cleaned == "/dev/null" {
        String::new()
    } else {
        cleaned
    }
}

fn read_file(repo_path: &Path, branch: &str, path: &str) -> Result<CodeFileRecord, VcsError> {
    let spec = object_spec(branch, path);
    let size = git_output(repo_path, &["cat-file", "-s", &spec])?
        .trim()
        .parse::<i64>()
        .unwrap_or_default();
    let bytes = git_bytes(repo_path, &["show", &spec])?;
    let is_binary = bytes.contains(&0);
    let is_too_large = size > MAX_TEXT_FILE_BYTES;
    let text = if is_binary || is_too_large {
        String::new()
    } else {
        String::from_utf8_lossy(&bytes).to_string()
    };
    Ok(CodeFileRecord {
        is_binary,
        is_too_large,
        mime_type: mime_guess::from_path(path)
            .first_or_octet_stream()
            .to_string(),
        name: Path::new(path)
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_string(),
        path: path.to_string(),
        size,
        text,
    })
}

fn object_spec(branch: &str, path: &str) -> String {
    if path.is_empty() {
        format!("{branch}:")
    } else {
        format!("{branch}:{path}")
    }
}

fn join_repo_path(parent: &str, name: &str) -> String {
    if parent.is_empty() {
        name.to_string()
    } else {
        format!("{parent}/{name}")
    }
}

fn breadcrumbs_for_path(path: &str) -> Vec<CodeBreadcrumbRecord> {
    let mut breadcrumbs = Vec::new();
    let mut current = String::new();
    for part in path.split('/').filter(|part| !part.is_empty()) {
        current = join_repo_path(&current, part);
        breadcrumbs.push(CodeBreadcrumbRecord {
            name: part.to_string(),
            path: current.clone(),
        });
    }
    breadcrumbs
}

fn normalize_repo_path(path: &str) -> Result<String, VcsError> {
    let trimmed = path.trim().trim_matches('/');
    if trimmed.is_empty() {
        return Ok(String::new());
    }
    if trimmed.contains('\\') || trimmed.contains(':') {
        return Err(VcsError::InvalidPath);
    }
    let path = Path::new(trimmed);
    if path.is_absolute() {
        return Err(VcsError::InvalidPath);
    }
    let mut parts = Vec::new();
    for component in path.components() {
        match component {
            Component::Normal(value) => {
                let Some(value) = value.to_str() else {
                    return Err(VcsError::InvalidPath);
                };
                if value.is_empty() {
                    return Err(VcsError::InvalidPath);
                }
                parts.push(value.to_string());
            }
            _ => return Err(VcsError::InvalidPath),
        }
    }
    Ok(parts.join("/"))
}

fn git_output(repo_path: &Path, args: &[&str]) -> Result<String, VcsError> {
    let bytes = git_bytes(repo_path, args)?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

fn git_bytes(repo_path: &Path, args: &[&str]) -> Result<Vec<u8>, VcsError> {
    let mut command = Command::new("git");
    command
        .arg("--git-dir")
        .arg(repo_path)
        .args(args)
        .stdin(Stdio::null())
        .stderr(Stdio::piped())
        .stdout(Stdio::piped());
    let mut child = command.spawn().map_err(|_| VcsError::GitUnavailable)?;
    let start = Instant::now();
    loop {
        match child.try_wait().map_err(|_| VcsError::GitUnavailable)? {
            Some(_) => break,
            None if start.elapsed() > Duration::from_secs(5) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(VcsError::GitTimedOut);
            }
            None => thread::sleep(Duration::from_millis(10)),
        }
    }
    let output = child
        .wait_with_output()
        .map_err(|_| VcsError::GitUnavailable)?;
    if output.status.success() {
        return Ok(output.stdout);
    }
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if stderr.contains("Not a valid object name")
        || stderr.contains("ambiguous argument")
        || stderr.contains("pathspec")
        || stderr.contains("does not exist in")
        || stderr.contains("exists on disk, but not in")
    {
        Err(VcsError::NotFound)
    } else {
        Err(VcsError::GitFailed(stderr))
    }
}
