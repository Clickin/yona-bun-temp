use std::ffi::OsString;
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

pub const CRATE_OWNER: &str = "vcs";
pub const HISTORY_ITEM_LIMIT: usize = 25;
pub const MAX_ISSUE_TEMPLATE_BYTES: usize = 2 * 1024 * 1024;
pub const MAX_TEXT_FILE_BYTES: i64 = 1024 * 1024;
pub const MAX_SMART_HTTP_RPC_BYTES: usize = 100 * 1024 * 1024;

const HEADER_BODY_DELIMITER_CRLF: &[u8] = b"\r\n\r\n";
const HEADER_BODY_DELIMITER_LF: &[u8] = b"\n\n";

pub fn svn_executable(name: &str) -> PathBuf {
    let executable_name = if cfg!(windows) && !name.ends_with(".exe") {
        format!("{name}.exe")
    } else {
        name.to_string()
    };
    if let Some(path) = std::env::var_os("PATH").and_then(|path| {
        std::env::split_paths(&path)
            .map(|dir| dir.join(&executable_name))
            .find(|candidate| candidate.is_file())
    }) {
        return path;
    }

    #[cfg(windows)]
    {
        for base in ["ProgramFiles", "ProgramFiles(x86)"]
            .into_iter()
            .filter_map(std::env::var_os)
        {
            for vendor_dir in [
                "VisualSVN Server\\bin",
                "Subversion\\bin",
                "TortoiseSVN\\bin",
            ] {
                let candidate = PathBuf::from(&base).join(vendor_dir).join(&executable_name);
                if candidate.is_file() {
                    return candidate;
                }
            }
        }
    }

    PathBuf::from(name)
}

fn svn_command(name: &str) -> Command {
    Command::new(svn_executable(name))
}

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
    pub author_email: String,
    pub author_label: String,
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
    pub author_email: String,
    pub author_label: String,
    pub commit_date: String,
    pub commit_id: String,
    pub commit_message: String,
    pub commit_short_id: String,
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
pub struct ProjectHistoryCommitRecord {
    pub author_date: String,
    pub author_email: String,
    pub author_name: String,
    pub author_timestamp: i64,
    pub commit_id: String,
    pub commit_short_id: String,
    pub short_message: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GitCommitReferenceRecord {
    pub commit_id: String,
    pub commit_short_id: String,
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
pub struct CodeBranchListSnapshot {
    pub branches: Vec<CodeBranchListItemRecord>,
    pub default_branch: String,
    pub no_head: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeBranchListItemRecord {
    pub commit_date: String,
    pub commit_id: String,
    pub commit_message: String,
    pub commit_short_id: String,
    pub is_default: bool,
    pub name: String,
    pub short_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GitHttpBackendRequest<'a> {
    pub body: &'a [u8],
    pub content_type: Option<&'a str>,
    pub git_protocol: Option<&'a str>,
    pub method: &'a str,
    pub path_info: &'a str,
    pub query_string: &'a str,
    pub remote_addr: &'a str,
    pub remote_user: Option<&'a str>,
    pub repo_root: &'a Path,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GitHttpBackendResponse {
    pub body: Vec<u8>,
    pub headers: Vec<(String, String)>,
    pub status: u16,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GitHeadRefRecord {
    pub full_name: String,
    pub object_id: String,
    pub short_name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GitPushCommitRecord {
    pub author_email: String,
    pub author_name: String,
    pub committer_email: String,
    pub committer_name: String,
    pub commit_id: String,
    pub message: String,
    pub timestamp: String,
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

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestMergeResult {
    pub conflict: bool,
    pub from_commit_id: String,
    pub merged_commit_id: String,
    pub target_commit_id_before: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestMergePreview {
    pub commits: Vec<PullRequestDiffCommitRecord>,
    pub conflict: bool,
    pub no_head: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SvnTreeEntry {
    pub path: String,
    pub is_dir: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SvnTree {
    pub path: String,
    pub entries: Vec<SvnTreeEntry>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SvnLogEntry {
    pub revision: i64,
    pub author: String,
    pub date: String,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SvnChangedAction {
    Added,
    Modified,
    Deleted,
    Replaced,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SvnChangedPath {
    pub path: String,
    pub is_dir: bool,
    pub action: SvnChangedAction,
    pub copy_from_path: Option<String>,
    pub copy_from_revision: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SvnLock {
    pub path: String,
    pub token: String,
    pub owner: String,
    pub comment: String,
    pub created: String,
    pub expires: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SvnPropertyPatch {
    pub name: String,
    pub value: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SvnInheritedPropertySet {
    pub path: String,
    pub properties: Vec<SvnProperty>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SvnProperty {
    pub name: String,
    pub value: String,
}

#[derive(Debug, thiserror::Error)]
pub enum VcsError {
    #[error("git executable is unavailable")]
    GitUnavailable,
    #[error("svnadmin executable is unavailable")]
    SvnAdminUnavailable,
    #[error("svn executable is unavailable")]
    SvnUnavailable,
    #[error("svnlook executable is unavailable")]
    SvnLookUnavailable,
    #[error("git command timed out")]
    GitTimedOut,
    #[error("invalid repository path")]
    InvalidRepositoryPath,
    #[error("invalid repository object path")]
    InvalidPath,
    #[error("invalid repository branch")]
    InvalidBranch,
    #[error("repository object not found")]
    NotFound,
    #[error("repository filesystem operation failed: {0}")]
    FilesystemFailed(String),
    #[error("git command failed: {0}")]
    GitFailed(String),
    #[error("svnadmin command failed: {0}")]
    SvnAdminFailed(String),
    #[error("svn command failed: {0}")]
    SvnFailed(String),
    #[error("svnlook command failed: {0}")]
    SvnLookFailed(String),
}

pub fn repository_path(data_root: &Path, project_id: i64) -> PathBuf {
    data_root.join("repo").join(format!("{project_id}.git"))
}

pub fn svn_repository_path(data_root: &Path, project_id: i64) -> PathBuf {
    data_root.join("repo").join(format!("{project_id}.svn"))
}

pub fn repository_path_for_vcs(data_root: &Path, project_id: i64, vcs: &str) -> PathBuf {
    if vcs == "Subversion" {
        svn_repository_path(data_root, project_id)
    } else {
        repository_path(data_root, project_id)
    }
}

pub fn ensure_svnadmin_available() -> Result<(), VcsError> {
    let output = svn_command("svnadmin")
        .arg("--version")
        .output()
        .map_err(|_| VcsError::SvnAdminUnavailable)?;
    if output.status.success() {
        Ok(())
    } else {
        Err(VcsError::SvnAdminFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ))
    }
}

pub fn create_bare_repository(repo_path: &Path) -> Result<(), VcsError> {
    if let Some(parent) = repo_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| VcsError::FilesystemFailed(error.to_string()))?;
    }
    if repo_path.exists() && !repo_path.is_dir() {
        return Err(VcsError::FilesystemFailed(format!(
            "{} exists and is not a directory",
            repo_path.display()
        )));
    }

    let output = Command::new("git")
        .args(["init", "--bare"])
        .arg(repo_path)
        .output()
        .map_err(|_| VcsError::GitUnavailable)?;
    if output.status.success() {
        Ok(())
    } else {
        Err(VcsError::GitFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ))
    }
}

pub fn create_svn_repository(repo_path: &Path) -> Result<(), VcsError> {
    if let Some(parent) = repo_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| VcsError::FilesystemFailed(error.to_string()))?;
    }
    if repo_path.exists() && !repo_path.is_dir() {
        return Err(VcsError::FilesystemFailed(format!(
            "{} exists and is not a directory",
            repo_path.display()
        )));
    }

    let output = svn_command("svnadmin")
        .args(["create"])
        .arg(repo_path)
        .output()
        .map_err(|_| VcsError::SvnAdminUnavailable)?;
    if output.status.success() {
        Ok(())
    } else {
        Err(VcsError::SvnAdminFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ))
    }
}

pub fn svn_youngest_revision(repo_path: &Path) -> Result<i64, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }

    let output = svn_command("svnlook")
        .args(["youngest"])
        .arg(repo_path)
        .output()
        .map_err(|_| VcsError::SvnLookUnavailable)?;
    if !output.status.success() {
        return Err(VcsError::SvnLookFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ));
    }

    let revision = String::from_utf8_lossy(&output.stdout).trim().to_string();
    revision
        .parse::<i64>()
        .map_err(|_| VcsError::SvnLookFailed(format!("invalid youngest revision: {revision}")))
}

pub fn svn_repository_uuid(repo_path: &Path) -> Result<String, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }

    let output = svn_command("svnlook")
        .args(["uuid"])
        .arg(repo_path)
        .output()
        .map_err(|_| VcsError::SvnLookUnavailable)?;
    if !output.status.success() {
        return Err(VcsError::SvnLookFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ));
    }

    let uuid = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if uuid.is_empty() {
        return Err(VcsError::SvnLookFailed("empty repository uuid".to_string()));
    }
    Ok(uuid)
}

pub fn svn_cat_file(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
) -> Result<Vec<u8>, VcsError> {
    svn_cat_file_with_limit(repo_path, revision, path, None)
}

pub fn svn_cat_file_bounded(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
    max_bytes: usize,
) -> Result<Vec<u8>, VcsError> {
    svn_cat_file_with_limit(repo_path, revision, path, Some(max_bytes))
}

fn svn_cat_file_with_limit(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
    max_bytes: Option<usize>,
) -> Result<Vec<u8>, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }

    let mut command = svn_command("svnlook");
    command.arg("cat");
    if let Some(revision) = revision {
        command.args(["-r", &revision.to_string()]);
    }
    command
        .arg(repo_path)
        .arg(&clean_path)
        .stdin(Stdio::null())
        .stderr(Stdio::piped())
        .stdout(Stdio::piped());
    let (output, exceeded) = capture_command_output(
        command,
        Duration::from_secs(5),
        max_bytes,
        max_bytes.map(|_| 64 * 1024),
    )
    .map_err(|error| match error {
        CommandCaptureError::Unavailable => VcsError::SvnLookUnavailable,
        CommandCaptureError::TimedOut => {
            VcsError::SvnLookFailed("svnlook command timed out".to_string())
        }
    })?;
    if exceeded {
        return Err(VcsError::SvnLookFailed(
            "svnlook command output exceeded the configured limit".to_string(),
        ));
    }
    if output.status.success() {
        return Ok(output.stdout);
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let lower = stderr.to_ascii_lowercase();
    if lower.contains("path not found")
        || lower.contains("is a directory")
        || lower.contains("not a file")
        || lower.contains("does not exist")
        || lower.contains("file not found")
    {
        return Err(VcsError::NotFound);
    }
    Err(VcsError::SvnLookFailed(stderr))
}

pub fn svn_list_tree(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
) -> Result<SvnTree, VcsError> {
    svn_list_tree_filtered(repo_path, revision, path, false)
}

pub fn svn_list_tree_recursive(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
) -> Result<SvnTree, VcsError> {
    svn_list_tree_filtered(repo_path, revision, path, true)
}

fn svn_list_tree_filtered(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
    recursive: bool,
) -> Result<SvnTree, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;

    let mut command = svn_command("svnlook");
    command.args(["tree", "--full-paths"]);
    if let Some(revision) = revision {
        command.args(["-r", &revision.to_string()]);
    }
    let output = command
        .arg(repo_path)
        .arg(&clean_path)
        .output()
        .map_err(|_| VcsError::SvnLookUnavailable)?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let lower = stderr.to_ascii_lowercase();
        if lower.contains("path not found")
            || lower.contains("does not exist")
            || lower.contains("file not found")
        {
            return Err(VcsError::NotFound);
        }
        return Err(VcsError::SvnLookFailed(stderr));
    }

    let base = clean_path.trim_matches('/').to_string();
    let base_prefix = if base.is_empty() {
        String::new()
    } else {
        format!("{base}/")
    };
    let mut base_is_collection = base.is_empty();
    let mut entries = Vec::new();
    for line in String::from_utf8_lossy(&output.stdout).lines() {
        let raw_path = line.trim();
        if raw_path.is_empty() {
            continue;
        }
        let is_dir = raw_path.ends_with('/');
        let entry_path = raw_path.trim_matches('/').to_string();
        if entry_path == base {
            base_is_collection = is_dir;
            continue;
        }
        if !base_prefix.is_empty() && !entry_path.starts_with(&base_prefix) {
            continue;
        }
        let relative = if base_prefix.is_empty() {
            entry_path.as_str()
        } else {
            entry_path
                .strip_prefix(&base_prefix)
                .expect("entry prefix checked")
        };
        if relative.is_empty() || (!recursive && relative.trim_matches('/').contains('/')) {
            continue;
        }
        entries.push(SvnTreeEntry {
            path: entry_path,
            is_dir,
        });
    }
    if !base_is_collection {
        return Err(VcsError::NotFound);
    }
    Ok(SvnTree {
        path: base,
        entries,
    })
}

pub fn svn_log_entries(
    repo_path: &Path,
    start_revision: i64,
    end_revision: i64,
    limit: usize,
) -> Result<Vec<SvnLogEntry>, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    if start_revision < 0 || end_revision < 0 {
        return Err(VcsError::InvalidPath);
    }
    let mut revisions = if start_revision >= end_revision {
        (end_revision..=start_revision).rev().collect::<Vec<_>>()
    } else {
        (start_revision..=end_revision).collect::<Vec<_>>()
    };
    if limit > 0 && revisions.len() > limit {
        revisions.truncate(limit);
    }

    revisions
        .into_iter()
        .map(|revision| {
            if revision == 0 {
                return Ok(SvnLogEntry {
                    revision,
                    author: String::new(),
                    date: String::new(),
                    message: String::new(),
                });
            }
            Ok(SvnLogEntry {
                revision,
                author: svnlook_text(repo_path, revision, "author")?,
                date: svnlook_text(repo_path, revision, "date")?,
                message: svnlook_text(repo_path, revision, "log")?,
            })
        })
        .collect()
}

pub fn svn_changed_paths(repo_path: &Path, revision: i64) -> Result<Vec<SvnChangedPath>, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    if revision < 0 {
        return Err(VcsError::InvalidPath);
    }

    let output = svn_command("svnlook")
        .args(["changed", "--copy-info", "-r", &revision.to_string()])
        .arg(repo_path)
        .output()
        .map_err(|_| VcsError::SvnLookUnavailable)?;
    if !output.status.success() {
        return Err(VcsError::SvnLookFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ));
    }

    parse_svnlook_changed(&String::from_utf8_lossy(&output.stdout))
}

fn svnlook_diff(repo_path: &Path, revision: i64) -> Result<String, VcsError> {
    let output = svn_command("svnlook")
        .args(["diff", "-r", &revision.to_string()])
        .arg(repo_path)
        .output()
        .map_err(|_| VcsError::SvnLookUnavailable)?;
    if !output.status.success() {
        return Err(VcsError::SvnLookFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn svn_path_last_changed_revision(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
) -> Result<i64, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    if revision.is_some_and(|revision| revision < 0) {
        return Err(VcsError::InvalidPath);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return revision.map_or_else(|| svn_youngest_revision(repo_path), Ok);
    }

    let mut command = svn_command("svnlook");
    command.arg("history");
    if let Some(revision) = revision {
        command.args(["-r", &revision.to_string()]);
    }
    let output = command
        .arg(repo_path)
        .arg(&clean_path)
        .output()
        .map_err(|_| VcsError::SvnLookUnavailable)?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let lower = stderr.to_ascii_lowercase();
        if lower.contains("path not found")
            || lower.contains("no such revision")
            || lower.contains("does not exist")
            || lower.contains("not found")
        {
            return Err(VcsError::NotFound);
        }
        return Err(VcsError::SvnLookFailed(stderr));
    }

    parse_svnlook_history_latest_revision(&String::from_utf8_lossy(&output.stdout))
}

pub fn svn_revision_at_or_before(repo_path: &Path, date: &str) -> Result<Option<i64>, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let target = parse_svn_report_date(date)?;
    let youngest = svn_youngest_revision(repo_path)?;
    for revision in (0..=youngest).rev() {
        let revision_date = svnlook_text(repo_path, revision, "date")?;
        if parse_svnlook_date(&revision_date)? <= target {
            return Ok(Some(revision));
        }
    }
    Ok(None)
}

pub fn svn_lock(repo_path: &Path, path: &str) -> Result<Option<SvnLock>, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Ok(None);
    }

    let output = svn_command("svnlook")
        .arg("lock")
        .arg(repo_path)
        .arg(&clean_path)
        .output()
        .map_err(|_| VcsError::SvnLookUnavailable)?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let lower = stderr.to_ascii_lowercase();
        if lower.contains("path not found")
            || lower.contains("not locked")
            || lower.contains("no lock")
        {
            return Ok(None);
        }
        return Err(VcsError::SvnLookFailed(stderr));
    }
    let output = String::from_utf8_lossy(&output.stdout);
    Ok(parse_svnlook_lock(&clean_path, &output))
}

pub fn svn_property(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
    property_name: &str,
) -> Result<Option<String>, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    if revision.is_some_and(|revision| revision < 0) {
        return Err(VcsError::InvalidPath);
    }
    validate_svn_property_name(property_name)?;
    let clean_path = normalize_repo_path(path)?;
    let mut command = svn_command("svnlook");
    command.arg("propget");
    if let Some(revision) = revision {
        command.args(["-r", &revision.to_string()]);
    }
    command.arg(repo_path).arg(property_name);
    command.arg(if clean_path.is_empty() {
        "/"
    } else {
        &clean_path
    });
    let output = command.output().map_err(|_| VcsError::SvnLookUnavailable)?;
    if output.status.success() {
        let value = String::from_utf8_lossy(&output.stdout)
            .trim_end_matches(['\r', '\n'])
            .to_string();
        return Ok(if value.is_empty() { None } else { Some(value) });
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let lower = stderr.to_ascii_lowercase();
    if lower.contains("path not found")
        || lower.contains("no such revision")
        || lower.contains("not found")
    {
        return Err(VcsError::NotFound);
    }
    Err(VcsError::SvnLookFailed(stderr))
}

pub fn svn_properties(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
) -> Result<Vec<SvnProperty>, VcsError> {
    let property_names = svn_property_names(repo_path, revision, path)?;
    let mut properties = Vec::new();
    for name in property_names {
        if let Some(value) = svn_property(repo_path, revision, path, &name)? {
            properties.push(SvnProperty { name, value });
        }
    }
    Ok(properties)
}

pub fn svn_inherited_properties(
    repo_path: &Path,
    revision: i64,
    path: &str,
) -> Result<Vec<SvnInheritedPropertySet>, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    if revision < 0 {
        return Err(VcsError::InvalidPath);
    }
    let clean_path = normalize_repo_path(path)?;
    let mut inherited = Vec::new();
    for ancestor in svn_inherited_property_ancestors(&clean_path) {
        let property_names = svn_property_names(repo_path, Some(revision), &ancestor)?;
        let mut properties = Vec::new();
        for name in property_names {
            if let Some(value) = svn_property(repo_path, Some(revision), &ancestor, &name)? {
                properties.push(SvnProperty { name, value });
            }
        }
        if !properties.is_empty() {
            inherited.push(SvnInheritedPropertySet {
                path: ancestor,
                properties,
            });
        }
    }
    Ok(inherited)
}

fn svn_property_names(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
) -> Result<Vec<String>, VcsError> {
    if revision.is_some_and(|revision| revision < 0) {
        return Err(VcsError::InvalidPath);
    }
    let clean_path = normalize_repo_path(path)?;
    let mut command = svn_command("svnlook");
    command.arg("proplist");
    if let Some(revision) = revision {
        command.args(["-r", &revision.to_string()]);
    }
    command.arg(repo_path);
    command.arg(if clean_path.is_empty() {
        "/"
    } else {
        &clean_path
    });
    let output = command.output().map_err(|_| VcsError::SvnLookUnavailable)?;
    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(str::trim)
            .filter(|name| !name.is_empty())
            .filter(|name| !name.starts_with("Properties on "))
            .map(ToOwned::to_owned)
            .collect());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let lower = stderr.to_ascii_lowercase();
    if lower.contains("path not found")
        || lower.contains("no such revision")
        || lower.contains("not found")
    {
        return Err(VcsError::NotFound);
    }
    Err(VcsError::SvnLookFailed(stderr))
}

fn svn_inherited_property_ancestors(path: &str) -> Vec<String> {
    let mut ancestors = Vec::new();
    let mut current = path.trim_matches('/').to_string();
    loop {
        let parent = match current.rsplit_once('/') {
            Some((parent, _)) => parent.to_string(),
            None => String::new(),
        };
        ancestors.push(parent.clone());
        if parent.is_empty() {
            break;
        }
        current = parent;
    }
    ancestors.reverse();
    ancestors
}

pub fn svn_lock_path(
    repo_path: &Path,
    path: &str,
    owner: &str,
    comment: &str,
    token: &str,
) -> Result<SvnLock, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let comment_file = svn_lock_comment_file("lock")?;
    std::fs::write(&comment_file, comment).map_err(|error| {
        VcsError::FilesystemFailed(format!("write svn lock comment file: {error}"))
    })?;

    let mut command = svn_command("svnadmin");
    command
        .arg("lock")
        .arg(repo_path)
        .arg(&clean_path)
        .arg(owner)
        .arg(&comment_file);
    if !token.trim().is_empty() {
        command.arg(token.trim());
    }
    let output = command.output().map_err(|_| VcsError::SvnAdminUnavailable);
    let _ = std::fs::remove_file(&comment_file);
    let output = output?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let lower = stderr.to_ascii_lowercase();
        if lower.contains("path not found") {
            return Err(VcsError::NotFound);
        }
        return Err(VcsError::SvnAdminFailed(stderr));
    }

    svn_lock(repo_path, &clean_path)?.ok_or(VcsError::NotFound)
}

pub fn svn_unlock_path(
    repo_path: &Path,
    path: &str,
    owner: &str,
    token: &str,
) -> Result<(), VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() || token.trim().is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let output = svn_command("svnadmin")
        .arg("unlock")
        .arg(repo_path)
        .arg(&clean_path)
        .arg(owner)
        .arg(token.trim())
        .output()
        .map_err(|_| VcsError::SvnAdminUnavailable)?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let lower = stderr.to_ascii_lowercase();
        if lower.contains("path not found") || lower.contains("not locked") {
            return Err(VcsError::NotFound);
        }
        return Err(VcsError::SvnAdminFailed(stderr));
    }
    Ok(())
}

pub fn svn_put_file(
    repo_path: &Path,
    path: &str,
    contents: &[u8],
    message: &str,
) -> Result<i64, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let work_dir = svn_temp_work_dir("put")?;
    let cleanup = WorkDirCleanup {
        path: work_dir.clone(),
    };
    run_svn_command(
        svn_command("svn")
            .arg("checkout")
            .arg(svn_file_url(repo_path))
            .arg(&work_dir),
    )?;

    let target_path = work_dir.join(&clean_path);
    let existed = target_path.exists();
    if let Some(parent) = target_path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            VcsError::FilesystemFailed(format!("create svn put parent directory: {error}"))
        })?;
    }
    std::fs::write(&target_path, contents)
        .map_err(|error| VcsError::FilesystemFailed(format!("write svn put file: {error}")))?;
    if !existed {
        run_svn_command(
            svn_command("svn")
                .arg("add")
                .arg("--parents")
                .arg(&target_path),
        )?;
    }
    run_svn_command(
        svn_command("svn")
            .arg("commit")
            .arg("-m")
            .arg(message)
            .arg(&target_path),
    )?;
    drop(cleanup);
    svn_youngest_revision(repo_path)
}

pub fn svn_delete_path(repo_path: &Path, path: &str, message: &str) -> Result<i64, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let work_dir = svn_temp_work_dir("delete")?;
    let cleanup = WorkDirCleanup {
        path: work_dir.clone(),
    };
    run_svn_command(
        svn_command("svn")
            .arg("checkout")
            .arg(svn_file_url(repo_path))
            .arg(&work_dir),
    )?;

    let target_path = work_dir.join(&clean_path);
    if !target_path.exists() {
        return Err(VcsError::NotFound);
    }
    run_svn_command(svn_command("svn").arg("delete").arg(&target_path))?;
    run_svn_command(
        svn_command("svn")
            .arg("commit")
            .arg("-m")
            .arg(message)
            .arg(&target_path),
    )?;
    drop(cleanup);
    svn_youngest_revision(repo_path)
}

pub fn svn_make_collection(repo_path: &Path, path: &str, message: &str) -> Result<i64, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let work_dir = svn_temp_work_dir("mkcol")?;
    let cleanup = WorkDirCleanup {
        path: work_dir.clone(),
    };
    run_svn_command(
        svn_command("svn")
            .arg("checkout")
            .arg(svn_file_url(repo_path))
            .arg(&work_dir),
    )?;

    let target_path = work_dir.join(&clean_path);
    if target_path.exists() {
        return Err(VcsError::FilesystemFailed(format!(
            "svn collection already exists: {clean_path}"
        )));
    }
    std::fs::create_dir_all(&target_path).map_err(|error| {
        VcsError::FilesystemFailed(format!("create svn collection directory: {error}"))
    })?;
    run_svn_command(
        svn_command("svn")
            .arg("add")
            .arg("--parents")
            .arg(&target_path),
    )?;
    run_svn_command(
        svn_command("svn")
            .arg("commit")
            .arg("-m")
            .arg(message)
            .arg(&target_path),
    )?;
    drop(cleanup);
    svn_youngest_revision(repo_path)
}

pub fn svn_copy_path(
    repo_path: &Path,
    source_revision: Option<i64>,
    source_path: &str,
    destination_path: &str,
    message: &str,
) -> Result<i64, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_source = normalize_repo_path(source_path)?;
    let clean_destination = normalize_repo_path(destination_path)?;
    if clean_source.is_empty() || clean_destination.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let work_dir = svn_temp_work_dir("copy")?;
    let cleanup = WorkDirCleanup {
        path: work_dir.clone(),
    };
    run_svn_command(
        svn_command("svn")
            .arg("checkout")
            .arg(svn_file_url(repo_path))
            .arg(&work_dir),
    )?;

    let mut source_url = svn_file_url(repo_path);
    source_url.push('/');
    source_url.push_str(&clean_source);
    if let Some(revision) = source_revision {
        source_url.push('@');
        source_url.push_str(&revision.to_string());
    }
    let target_path = work_dir.join(&clean_destination);
    run_svn_command(
        svn_command("svn")
            .arg("copy")
            .arg(source_url)
            .arg(&target_path),
    )?;
    run_svn_command(
        svn_command("svn")
            .arg("commit")
            .arg("-m")
            .arg(message)
            .arg(&target_path),
    )?;
    drop(cleanup);
    svn_youngest_revision(repo_path)
}

pub fn svn_move_path(
    repo_path: &Path,
    source_path: &str,
    destination_path: &str,
    message: &str,
) -> Result<i64, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_source = normalize_repo_path(source_path)?;
    let clean_destination = normalize_repo_path(destination_path)?;
    if clean_source.is_empty() || clean_destination.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let work_dir = svn_temp_work_dir("move")?;
    let cleanup = WorkDirCleanup {
        path: work_dir.clone(),
    };
    run_svn_command(
        svn_command("svn")
            .arg("checkout")
            .arg(svn_file_url(repo_path))
            .arg(&work_dir),
    )?;

    let source = work_dir.join(&clean_source);
    let target = work_dir.join(&clean_destination);
    run_svn_command(svn_command("svn").arg("move").arg(&source).arg(&target))?;
    run_svn_command(
        svn_command("svn")
            .arg("commit")
            .arg("-m")
            .arg(message)
            .arg(&work_dir),
    )?;
    drop(cleanup);
    svn_youngest_revision(repo_path)
}

pub fn svn_patch_properties(
    repo_path: &Path,
    path: &str,
    patches: &[SvnPropertyPatch],
    message: &str,
) -> Result<i64, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() || patches.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    for patch in patches {
        validate_svn_property_name(&patch.name)?;
    }
    let work_dir = svn_temp_work_dir("proppatch")?;
    let cleanup = WorkDirCleanup {
        path: work_dir.clone(),
    };
    run_svn_command(
        svn_command("svn")
            .arg("checkout")
            .arg(svn_file_url(repo_path))
            .arg(&work_dir),
    )?;

    let target_path = work_dir.join(&clean_path);
    if !target_path.exists() {
        return Err(VcsError::NotFound);
    }
    for patch in patches {
        match &patch.value {
            Some(value) => run_svn_command(
                svn_command("svn")
                    .arg("propset")
                    .arg(&patch.name)
                    .arg(value)
                    .arg(&target_path),
            )?,
            None => run_svn_command(
                svn_command("svn")
                    .arg("propdel")
                    .arg(&patch.name)
                    .arg(&target_path),
            )?,
        }
    }
    run_svn_command(
        svn_command("svn")
            .arg("commit")
            .arg("-m")
            .arg(message)
            .arg(&target_path),
    )?;
    drop(cleanup);
    svn_youngest_revision(repo_path)
}

pub fn svn_path_exists(
    repo_path: &Path,
    revision: Option<i64>,
    path: &str,
) -> Result<bool, VcsError> {
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Ok(true);
    }
    match svn_cat_file(repo_path, revision, &clean_path) {
        Ok(_) => Ok(true),
        Err(VcsError::NotFound) => match svn_list_tree(repo_path, revision, &clean_path) {
            Ok(_) => Ok(true),
            Err(VcsError::NotFound) => Ok(false),
            Err(error) => Err(error),
        },
        Err(error) => Err(error),
    }
}

pub fn svn_deleted_revision(
    repo_path: &Path,
    path: &str,
    peg_revision: i64,
    end_revision: i64,
) -> Result<Option<i64>, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    if peg_revision < 0 || end_revision < 0 {
        return Err(VcsError::InvalidPath);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    if !svn_path_exists(repo_path, Some(peg_revision), &clean_path)? {
        return Err(VcsError::NotFound);
    }
    if end_revision <= peg_revision {
        return Ok(None);
    }

    let mut previous_exists = true;
    for revision in (peg_revision + 1)..=end_revision {
        let exists = svn_path_exists(repo_path, Some(revision), &clean_path)?;
        if previous_exists && !exists {
            return Ok(Some(revision));
        }
        previous_exists = exists;
    }
    Ok(None)
}

fn parse_svnlook_lock(path: &str, output: &str) -> Option<SvnLock> {
    let mut token = String::new();
    let mut owner = String::new();
    let mut comment = String::new();
    let mut created = String::new();
    let mut expires = None;
    for line in output.lines() {
        let Some((key, value)) = line.split_once(':') else {
            continue;
        };
        let value = value.trim().to_string();
        match key.trim().to_ascii_lowercase().as_str() {
            "token" | "uuid token" => token = value,
            "owner" => owner = value,
            "comment" => comment = value,
            "created" => created = value,
            "expires" => {
                if !value.eq_ignore_ascii_case("never") {
                    expires = Some(value);
                }
            }
            _ => {}
        }
    }
    if token.is_empty() {
        return None;
    }
    Some(SvnLock {
        path: format!("/{path}"),
        token,
        owner,
        comment,
        created,
        expires,
    })
}

fn parse_svnlook_changed(output: &str) -> Result<Vec<SvnChangedPath>, VcsError> {
    let mut paths = Vec::new();
    let lines = output.lines().collect::<Vec<_>>();
    let mut index = 0;
    while index < lines.len() {
        let line = lines[index];
        index += 1;
        if line.trim().is_empty() {
            continue;
        }
        if parse_svnlook_copy_info(line)?.is_some() {
            continue;
        }
        let mut columns = line.chars();
        let text_status = columns.next().unwrap_or_default();
        let prop_status = columns.next().unwrap_or_default();
        let action = match text_status {
            'A' => SvnChangedAction::Added,
            'U' | '_' => SvnChangedAction::Modified,
            'D' => SvnChangedAction::Deleted,
            'R' => SvnChangedAction::Replaced,
            _ if prop_status == 'U' => SvnChangedAction::Modified,
            _ => continue,
        };
        let raw_path = line.get(4..).unwrap_or_default().trim();
        let clean_path = normalize_repo_path(raw_path)?;
        if clean_path.is_empty() {
            continue;
        }
        let mut copy_from_path = None;
        let mut copy_from_revision = None;
        if let Some(next_line) = lines.get(index) {
            if let Some(copy_info) = parse_svnlook_copy_info(next_line)? {
                copy_from_path = Some(copy_info.0);
                copy_from_revision = Some(copy_info.1);
                index += 1;
            }
        }
        paths.push(SvnChangedPath {
            path: clean_path,
            is_dir: raw_path.ends_with('/'),
            action,
            copy_from_path,
            copy_from_revision,
        });
    }
    Ok(paths)
}

fn parse_svnlook_history_latest_revision(output: &str) -> Result<i64, VcsError> {
    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty()
            || trimmed.starts_with('-')
            || trimmed
                .chars()
                .next()
                .is_some_and(|character| !character.is_ascii_digit())
        {
            continue;
        }
        let Some(revision) = trimmed.split_whitespace().next() else {
            continue;
        };
        return revision
            .parse::<i64>()
            .map_err(|_| VcsError::SvnLookFailed(format!("invalid history revision: {line}")));
    }
    Err(VcsError::NotFound)
}

fn parse_svnlook_copy_info(line: &str) -> Result<Option<(String, i64)>, VcsError> {
    let trimmed = line.trim();
    let Some(rest) = trimmed
        .strip_prefix("(from ")
        .and_then(|value| value.strip_suffix(')'))
    else {
        return Ok(None);
    };
    let Some((path, revision)) = rest.rsplit_once(":r") else {
        return Ok(None);
    };
    let revision = revision
        .parse::<i64>()
        .map_err(|_| VcsError::SvnLookFailed(format!("invalid copy revision: {line}")))?;
    Ok(Some((normalize_repo_path(path)?, revision)))
}

fn svn_lock_comment_file(label: &str) -> Result<PathBuf, VcsError> {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| VcsError::FilesystemFailed(format!("read system time: {error}")))?
        .as_nanos();
    Ok(std::env::temp_dir().join(format!(
        "yona-vcs-svn-{label}-{}-{nanos}.txt",
        std::process::id()
    )))
}

fn svn_temp_work_dir(label: &str) -> Result<PathBuf, VcsError> {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| VcsError::FilesystemFailed(format!("read system time: {error}")))?
        .as_nanos();
    let path = std::env::temp_dir().join(format!(
        "yona-vcs-svn-{label}-{}-{nanos}",
        std::process::id()
    ));
    std::fs::create_dir_all(&path)
        .map_err(|error| VcsError::FilesystemFailed(format!("create svn temp dir: {error}")))?;
    Ok(path)
}

fn svn_file_url(path: &Path) -> String {
    format!("file:///{}", path.display().to_string().replace('\\', "/"))
}

fn run_svn_command(command: &mut Command) -> Result<(), VcsError> {
    let output = command.output().map_err(|_| VcsError::SvnUnavailable)?;
    if output.status.success() {
        Ok(())
    } else {
        Err(VcsError::SvnFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ))
    }
}

fn validate_svn_property_name(name: &str) -> Result<(), VcsError> {
    let name = name.trim();
    if name.is_empty()
        || name
            .chars()
            .any(|character| character.is_control() || character.is_whitespace())
    {
        return Err(VcsError::InvalidPath);
    }
    Ok(())
}

struct WorkDirCleanup {
    path: PathBuf,
}

impl Drop for WorkDirCleanup {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

fn svnlook_text(repo_path: &Path, revision: i64, subcommand: &str) -> Result<String, VcsError> {
    let output = svn_command("svnlook")
        .arg(subcommand)
        .args(["-r", &revision.to_string()])
        .arg(repo_path)
        .output()
        .map_err(|_| VcsError::SvnLookUnavailable)?;
    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout)
            .trim_end_matches(['\r', '\n'])
            .to_string());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if stderr.to_ascii_lowercase().contains("no such revision") {
        return Err(VcsError::NotFound);
    }
    Err(VcsError::SvnLookFailed(stderr))
}

fn parse_svn_report_date(value: &str) -> Result<i64, VcsError> {
    let value = value.trim();
    let (date, time) = value.split_once('T').ok_or(VcsError::InvalidPath)?;
    let time = time.trim_end_matches('Z');
    let (hour, minute, second) = parse_time_hms(time)?;
    let (year, month, day) = parse_ymd(date)?;
    Ok(epoch_seconds_utc(year, month, day, hour, minute, second))
}

fn parse_svnlook_date(value: &str) -> Result<i64, VcsError> {
    let mut parts = value.split_whitespace();
    let date = parts.next().ok_or(VcsError::InvalidPath)?;
    let time = parts.next().ok_or(VcsError::InvalidPath)?;
    let offset = parts.next().ok_or(VcsError::InvalidPath)?;
    let (year, month, day) = parse_ymd(date)?;
    let (hour, minute, second) = parse_time_hms(time)?;
    let offset_seconds = parse_tz_offset(offset)?;
    Ok(epoch_seconds_utc(year, month, day, hour, minute, second) - offset_seconds)
}

fn parse_ymd(value: &str) -> Result<(i32, u32, u32), VcsError> {
    let mut parts = value.split('-');
    let year = parts
        .next()
        .and_then(|part| part.parse::<i32>().ok())
        .ok_or(VcsError::InvalidPath)?;
    let month = parts
        .next()
        .and_then(|part| part.parse::<u32>().ok())
        .ok_or(VcsError::InvalidPath)?;
    let day = parts
        .next()
        .and_then(|part| part.parse::<u32>().ok())
        .ok_or(VcsError::InvalidPath)?;
    if parts.next().is_some() || !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return Err(VcsError::InvalidPath);
    }
    Ok((year, month, day))
}

fn parse_time_hms(value: &str) -> Result<(u32, u32, u32), VcsError> {
    let value = value.split_once('.').map(|(head, _)| head).unwrap_or(value);
    let mut parts = value.split(':');
    let hour = parts
        .next()
        .and_then(|part| part.parse::<u32>().ok())
        .ok_or(VcsError::InvalidPath)?;
    let minute = parts
        .next()
        .and_then(|part| part.parse::<u32>().ok())
        .ok_or(VcsError::InvalidPath)?;
    let second = parts
        .next()
        .and_then(|part| part.parse::<u32>().ok())
        .ok_or(VcsError::InvalidPath)?;
    if parts.next().is_some() || hour > 23 || minute > 59 || second > 60 {
        return Err(VcsError::InvalidPath);
    }
    Ok((hour, minute, second))
}

fn parse_tz_offset(value: &str) -> Result<i64, VcsError> {
    if value.len() != 5 {
        return Err(VcsError::InvalidPath);
    }
    let sign = match &value[0..1] {
        "+" => 1,
        "-" => -1,
        _ => return Err(VcsError::InvalidPath),
    };
    let hours = value[1..3]
        .parse::<i64>()
        .map_err(|_| VcsError::InvalidPath)?;
    let minutes = value[3..5]
        .parse::<i64>()
        .map_err(|_| VcsError::InvalidPath)?;
    if hours > 23 || minutes > 59 {
        return Err(VcsError::InvalidPath);
    }
    Ok(sign * ((hours * 60 + minutes) * 60))
}

fn epoch_seconds_utc(year: i32, month: u32, day: u32, hour: u32, minute: u32, second: u32) -> i64 {
    let days = days_from_civil(year, month, day);
    days * 86_400 + i64::from(hour) * 3_600 + i64::from(minute) * 60 + i64::from(second)
}

fn days_from_civil(year: i32, month: u32, day: u32) -> i64 {
    let year = year - i32::from(month <= 2);
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let month = month as i32;
    let day = day as i32;
    let day_of_year = (153 * (month + if month > 2 { -3 } else { 9 }) + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    i64::from(era * 146_097 + day_of_era - 719_468)
}

pub fn clone_bare_repository(source_repo_path: &Path, repo_path: &Path) -> Result<(), VcsError> {
    if !source_repo_path.exists() || !source_repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    clone_bare_repository_from_source(
        source_repo_path.to_str().ok_or(VcsError::InvalidPath)?,
        repo_path,
    )
}

pub fn clone_bare_repository_from_source(source: &str, repo_path: &Path) -> Result<(), VcsError> {
    let source = source.trim();
    if source.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    if repo_path.exists() {
        return Err(VcsError::FilesystemFailed(format!(
            "{} already exists",
            repo_path.display()
        )));
    }
    if let Some(parent) = repo_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| VcsError::FilesystemFailed(error.to_string()))?;
    }

    let output = Command::new("git")
        .args(["clone", "--bare"])
        .arg(source)
        .arg(repo_path)
        .output()
        .map_err(|_| VcsError::GitUnavailable)?;
    if output.status.success() {
        Ok(())
    } else {
        Err(VcsError::GitFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ))
    }
}

pub fn commit_readme_file(
    repo_path: &Path,
    body_markdown: &str,
    author_name: &str,
    author_email: &str,
) -> Result<Option<String>, VcsError> {
    commit_text_file(
        repo_path,
        None,
        "README.md",
        body_markdown,
        "Update README",
        author_name,
        author_email,
    )
}

pub fn commit_text_file(
    repo_path: &Path,
    branch: Option<&str>,
    path: &str,
    contents: &str,
    message: &str,
    author_name: &str,
    author_email: &str,
) -> Result<Option<String>, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }

    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let branch = branch
        .map(normalize_branch_name)
        .transpose()?
        .or_else(|| default_branch(repo_path))
        .unwrap_or_else(|| "main".to_string());
    let had_head = has_head(repo_path);
    let work_dir = TempWorkDir::create("readme")?;
    git_clone_repository(repo_path, work_dir.path())?;
    if !had_head {
        git_worktree_output(work_dir.path(), &["checkout", "-B", &branch])?;
        git_output(
            repo_path,
            &["symbolic-ref", "HEAD", &format!("refs/heads/{branch}")],
        )?;
    } else {
        git_worktree_output(work_dir.path(), &["checkout", &branch])?;
    }

    let target_path = work_dir.path().join(&clean_path);
    if let Some(parent) = target_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| VcsError::FilesystemFailed(error.to_string()))?;
    }
    std::fs::write(&target_path, contents)
        .map_err(|error| VcsError::FilesystemFailed(error.to_string()))?;
    git_worktree_output(work_dir.path(), &["add", "--", &clean_path])?;
    let status = git_worktree_output(
        work_dir.path(),
        &["status", "--porcelain", "--", &clean_path],
    )?;
    if status.trim().is_empty() {
        return Ok(None);
    }

    let email = if author_email.trim().is_empty() {
        "yona@example.invalid"
    } else {
        author_email.trim()
    };
    let name = if author_name.trim().is_empty() {
        "Yona"
    } else {
        author_name.trim()
    };
    git_worktree_output(
        work_dir.path(),
        &[
            "-c",
            &format!("user.email={email}"),
            "-c",
            &format!("user.name={name}"),
            "commit",
            "-m",
            message,
        ],
    )?;
    let commit_id = git_worktree_output(work_dir.path(), &["rev-parse", "HEAD"])?
        .trim()
        .to_string();
    git_worktree_output(
        work_dir.path(),
        &["push", "origin", &format!("HEAD:{branch}")],
    )?;
    Ok(Some(commit_id))
}

pub fn delete_repository(repo_path: &Path) -> Result<(), VcsError> {
    if !repo_path.exists() {
        return Ok(());
    }
    if !repo_path.is_dir() {
        return Err(VcsError::FilesystemFailed(format!(
            "{} exists and is not a directory",
            repo_path.display()
        )));
    }
    let file_name = repo_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or(VcsError::InvalidRepositoryPath)?;
    if !file_name.ends_with(".git") && !file_name.ends_with(".svn") {
        return Err(VcsError::InvalidRepositoryPath);
    }

    std::fs::remove_dir_all(repo_path)
        .map_err(|error| VcsError::FilesystemFailed(error.to_string()))
}

pub fn run_git_http_backend(
    request: GitHttpBackendRequest<'_>,
) -> Result<GitHttpBackendResponse, VcsError> {
    if request.body.len() > MAX_SMART_HTTP_RPC_BYTES {
        return Err(VcsError::GitFailed(
            "Smart HTTP request body exceeds limit".to_string(),
        ));
    }
    if !request.repo_root.exists() || !request.repo_root.is_dir() {
        return Err(VcsError::NotFound);
    }

    let mut command = Command::new("git");
    command
        .arg("http-backend")
        .current_dir(request.repo_root)
        .env("GIT_PROJECT_ROOT", request.repo_root)
        .env("PATH_INFO", request.path_info)
        .env("REQUEST_METHOD", request.method)
        .env("QUERY_STRING", request.query_string)
        .env("CONTENT_TYPE", request.content_type.unwrap_or_default())
        .env("REMOTE_ADDR", request.remote_addr)
        .env("GIT_HTTP_EXPORT_ALL", "1")
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(Stdio::piped())
        .stderr(Stdio::piped())
        .stdout(Stdio::piped());

    if request.method != "GET" {
        command.env("CONTENT_LENGTH", request.body.len().to_string());
    }
    if let Some(protocol) = request.git_protocol.filter(|value| !value.is_empty()) {
        command.env("HTTP_GIT_PROTOCOL", protocol);
        command.env("GIT_PROTOCOL", protocol);
    }
    if let Some(remote_user) = request.remote_user.filter(|value| !value.is_empty()) {
        command.env("REMOTE_USER", remote_user);
    }

    let mut child = command.spawn().map_err(|_| VcsError::GitUnavailable)?;
    if let Some(mut stdin) = child.stdin.take() {
        if !request.body.is_empty() {
            stdin
                .write_all(request.body)
                .map_err(|error| VcsError::GitFailed(error.to_string()))?;
        }
    }

    let start = Instant::now();
    loop {
        match child.try_wait().map_err(|_| VcsError::GitUnavailable)? {
            Some(_) => break,
            None if start.elapsed() > Duration::from_secs(30) => {
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
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.contains("not found") || stderr.contains("No such file") {
            return Err(VcsError::NotFound);
        }
        return Err(VcsError::GitFailed(stderr));
    }

    parse_git_http_backend_output(&output.stdout)
}

pub fn read_head_refs(repo_path: &Path) -> Result<Vec<GitHeadRefRecord>, VcsError> {
    if !repo_path.exists() {
        return Ok(Vec::new());
    }
    let output = git_output(
        repo_path,
        &[
            "for-each-ref",
            "--format=%(refname)%1f%(objectname)%1f%(refname:short)",
            "refs/heads",
        ],
    )?;
    Ok(output
        .lines()
        .filter_map(|line| {
            let mut parts = line.split('\x1f');
            let full_name = parts.next()?.trim().to_string();
            let object_id = parts.next().unwrap_or_default().trim().to_string();
            let short_name = parts.next().unwrap_or_default().trim().to_string();
            if full_name.is_empty() || object_id.is_empty() || short_name.is_empty() {
                return None;
            }
            Some(GitHeadRefRecord {
                full_name,
                object_id,
                short_name,
            })
        })
        .collect())
}

pub fn read_push_commits(
    repo_path: &Path,
    old_oid: Option<&str>,
    new_oid: &str,
    exclude_oids: &[String],
) -> Result<Vec<GitPushCommitRecord>, VcsError> {
    let new_oid = new_oid.trim();
    if new_oid.is_empty() || is_zero_oid(new_oid) {
        return Ok(Vec::new());
    }

    let mut args = vec![
        "log".to_string(),
        "--reverse".to_string(),
        "--format=%x1e%H%x1f%s%x1f%aI%x1f%aN%x1f%aE%x1f%cN%x1f%cE".to_string(),
    ];
    if let Some(old_oid) = old_oid.map(str::trim).filter(|value| !value.is_empty()) {
        if !is_zero_oid(old_oid) {
            args.push(format!("{old_oid}..{new_oid}"));
        } else {
            args.push(new_oid.to_string());
        }
    } else {
        args.push(new_oid.to_string());
        let excludes = exclude_oids
            .iter()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty() && !is_zero_oid(value))
            .collect::<Vec<_>>();
        if !excludes.is_empty() {
            args.push("--not".to_string());
            args.extend(excludes.into_iter().map(str::to_string));
        }
    }
    let borrowed = args.iter().map(String::as_str).collect::<Vec<_>>();
    let output = git_output(repo_path, &borrowed)?;
    Ok(output
        .split('\x1e')
        .filter_map(|record| {
            let record = record.trim_matches(|character| character == '\r' || character == '\n');
            if record.trim().is_empty() {
                return None;
            }
            let mut parts = record.split('\x1f');
            let commit_id = parts.next()?.trim().to_string();
            let message = parts.next().unwrap_or_default().trim().to_string();
            let timestamp = parts.next().unwrap_or_default().trim().to_string();
            let author_name = parts.next().unwrap_or_default().trim().to_string();
            let author_email = parts.next().unwrap_or_default().trim().to_string();
            let committer_name = parts.next().unwrap_or_default().trim().to_string();
            let committer_email = parts.next().unwrap_or_default().trim().to_string();
            if commit_id.is_empty() {
                return None;
            }
            Some(GitPushCommitRecord {
                author_email,
                author_name,
                committer_email,
                committer_name,
                commit_id,
                message,
                timestamp,
            })
        })
        .collect())
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
    let branches = list_code_selector_refs(&repo_path)?;
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
    read_file_bytes_with_limit(repo_path, revision, path, None)
}

pub fn read_file_bytes_bounded(
    repo_path: &Path,
    revision: &str,
    path: &str,
    max_bytes: usize,
) -> Result<CodeFileBytesRecord, VcsError> {
    read_file_bytes_with_limit(repo_path, revision, path, Some(max_bytes))
}

fn read_file_bytes_with_limit(
    repo_path: &Path,
    revision: &str,
    path: &str,
    max_bytes: Option<usize>,
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
    let bytes = match max_bytes {
        Some(max_bytes) => git_bytes_bounded(repo_path, &["show", &spec], max_bytes)?,
        None => git_bytes(repo_path, &["show", &spec])?,
    };
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
    let branches = list_code_selector_refs(&repo_path)?;
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

pub fn read_project_history_commits(
    repo_path: &Path,
    limit: usize,
) -> Result<Vec<ProjectHistoryCommitRecord>, VcsError> {
    if limit == 0 || !repo_path.exists() {
        return Ok(Vec::new());
    }
    let repo_path = repo_path.to_path_buf();
    let branches = list_branches(&repo_path)?;
    if branches.is_empty() || !has_head(&repo_path) {
        return Ok(Vec::new());
    }
    let selected_branch = default_branch(&repo_path).unwrap_or_else(|| branches[0].name.clone());
    let limit_arg = format!("-n{limit}");
    let output = git_output(
        &repo_path,
        &[
            "log",
            &limit_arg,
            "--date=short",
            "--format=%x1e%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%ad%x1f%at",
            &selected_branch,
            "--",
        ],
    )?;
    Ok(output
        .split('\x1e')
        .filter_map(|record| {
            let record = record.trim_matches(|character| character == '\r' || character == '\n');
            if record.trim().is_empty() {
                return None;
            }
            let mut parts = record.split('\x1f');
            let commit_id = parts.next()?.to_string();
            let commit_short_id = parts.next().unwrap_or_default().to_string();
            let short_message = parts.next().unwrap_or_default().to_string();
            let author_name = parts.next().unwrap_or_default().to_string();
            let author_email = parts.next().unwrap_or_default().to_string();
            let author_date = parts.next().unwrap_or_default().to_string();
            let author_timestamp = parts
                .next()
                .and_then(|value| value.parse::<i64>().ok())
                .unwrap_or_default();
            Some(ProjectHistoryCommitRecord {
                author_date,
                author_email,
                author_name,
                author_timestamp,
                commit_id,
                commit_short_id,
                short_message,
            })
        })
        .collect())
}

pub fn resolve_git_commit_reference(
    repo_path: &Path,
    revision: &str,
) -> Result<GitCommitReferenceRecord, VcsError> {
    let revision = revision.trim();
    if !(7..=40).contains(&revision.len())
        || !revision
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
        || !repo_path.is_dir()
    {
        return Err(VcsError::NotFound);
    }

    let spec = format!("{revision}^{{commit}}");
    let commit_id = git_output(repo_path, &["rev-parse", "--verify", &spec])?
        .trim()
        .to_string();
    if commit_id.len() != 40
        || !commit_id
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
    {
        return Err(VcsError::NotFound);
    }

    Ok(GitCommitReferenceRecord {
        commit_short_id: commit_id[..7].to_string(),
        commit_id,
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
    let branches = list_code_selector_refs(&repo_path)?;
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

pub fn read_svn_commit_detail(
    repo_path: &Path,
    commit_id: &str,
    path: &str,
) -> Result<CodeCommitDetailSnapshot, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Ok(no_head_commit_detail_snapshot());
    }
    let revision = commit_id
        .trim()
        .parse::<i64>()
        .map_err(|_| VcsError::NotFound)?;
    if revision <= 0 {
        return Err(VcsError::NotFound);
    }
    let youngest_revision = svn_youngest_revision(repo_path)?;
    if revision > youngest_revision {
        return Err(VcsError::NotFound);
    }

    let clean_path = normalize_repo_path(path)?;
    let mut entries = svn_log_entries(repo_path, revision, revision, 1)?;
    let Some(entry) = entries.pop() else {
        return Err(VcsError::NotFound);
    };
    let changed_paths = svn_changed_paths(repo_path, revision)?;
    let diff = svnlook_diff(repo_path, revision)?;
    let files = changed_paths
        .into_iter()
        .filter(|changed| {
            !changed.is_dir
                && (clean_path.is_empty()
                    || changed.path == clean_path
                    || changed.path.starts_with(&format!("{clean_path}/")))
        })
        .map(|changed| CodeCommitFileDiffRecord {
            path: changed.path,
            patch: diff.clone(),
        })
        .collect::<Vec<_>>();
    let parent_commit = (revision > 1).then(|| CodeCommitParentRecord {
        commit_id: (revision - 1).to_string(),
        commit_short_id: (revision - 1).to_string(),
    });

    Ok(CodeCommitDetailSnapshot {
        branches: vec![CodeBranchRecord {
            name: "HEAD".to_string(),
        }],
        breadcrumbs: breadcrumbs_for_path(&clean_path),
        commit: Some(CodeCommitRecord {
            author_date: entry.date.trim().to_string(),
            author_email: String::new(),
            author_name: entry.author,
            comment_count: 0,
            commit_id: revision.to_string(),
            commit_short_id: revision.to_string(),
            short_message: first_line(&entry.message).to_string(),
            message: entry.message,
        }),
        files,
        no_head: false,
        parent_commit,
        path: clean_path,
        selected_branch: "HEAD".to_string(),
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

pub fn read_branch_list(repo_path: &Path) -> Result<CodeBranchListSnapshot, VcsError> {
    if !repo_path.exists() {
        return Ok(no_head_branch_list());
    }
    if !has_head(repo_path) {
        return Ok(no_head_branch_list());
    }
    let default_branch = default_branch(repo_path).unwrap_or_default();
    let branches = list_branch_details(repo_path, &default_branch)?;
    if branches.is_empty() {
        return Ok(no_head_branch_list());
    }
    Ok(CodeBranchListSnapshot {
        branches,
        default_branch,
        no_head: false,
    })
}

pub fn set_default_branch(
    repo_path: &Path,
    branch_name: &str,
) -> Result<CodeBranchListSnapshot, VcsError> {
    if !repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let branch_name = normalize_branch_name(branch_name)?;
    let branches = list_branches(repo_path)?;
    if !branch_exists(&branches, &branch_name) {
        return Err(VcsError::NotFound);
    }
    let target = format!("refs/heads/{branch_name}");
    git_output(repo_path, &["symbolic-ref", "HEAD", &target])?;
    read_branch_list(repo_path)
}

pub fn delete_branch(
    repo_path: &Path,
    branch_name: &str,
) -> Result<CodeBranchListSnapshot, VcsError> {
    if !repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let branch_name = normalize_branch_name(branch_name)?;
    let default_branch = default_branch(repo_path).unwrap_or_default();
    if branch_name == default_branch {
        return Err(VcsError::InvalidBranch);
    }
    let branches = list_branches(repo_path)?;
    if !branch_exists(&branches, &branch_name) {
        return Err(VcsError::NotFound);
    }
    git_output(repo_path, &["branch", "-D", &branch_name])?;
    read_branch_list(repo_path)
}

pub fn restore_branch_from_merge(
    source_repo_path: &Path,
    target_repo_path: &Path,
    branch_name: &str,
    merge_commit_id: &str,
) -> Result<String, VcsError> {
    if !source_repo_path.exists() || !target_repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let branch_name = normalize_branch_name(branch_name)?;
    let merge_commit_id = merge_commit_id.trim();
    if merge_commit_id.is_empty() || merge_commit_id.contains('\0') {
        return Err(VcsError::NotFound);
    }
    let source_branches = list_branches(source_repo_path)?;
    if branch_exists(&source_branches, &branch_name) {
        return Err(VcsError::InvalidBranch);
    }
    let default_branch = default_branch(source_repo_path).unwrap_or_default();
    if branch_name == default_branch {
        return Err(VcsError::InvalidBranch);
    }

    let work_dir = TempWorkDir::create("restore-branch")?;
    git_clone_repository(source_repo_path, work_dir.path())?;
    git_worktree_output_with_path(
        work_dir.path(),
        &["remote", "add", "pull-request-target"],
        target_repo_path,
    )?;
    git_worktree_output(
        work_dir.path(),
        &[
            "fetch",
            "pull-request-target",
            "+refs/heads/*:refs/remotes/pull-request-target/*",
        ],
    )?;
    let merge_spec = format!("{merge_commit_id}^{{commit}}");
    git_worktree_output(work_dir.path(), &["cat-file", "-e", &merge_spec])?;
    let source_parent_spec = format!("{merge_commit_id}^2");
    let source_commit_id =
        git_worktree_output(work_dir.path(), &["rev-parse", &source_parent_spec])?
            .trim()
            .to_string();
    if source_commit_id.is_empty() {
        return Err(VcsError::NotFound);
    }
    git_worktree_output(
        work_dir.path(),
        &["branch", &branch_name, &source_commit_id],
    )?;
    let push_ref = format!("refs/heads/{branch_name}:refs/heads/{branch_name}");
    git_worktree_output(work_dir.path(), &["push", "origin", &push_ref])?;

    Ok(source_commit_id)
}

pub fn merge_pull_request(
    source_repo_path: &Path,
    target_repo_path: &Path,
    from_branch: &str,
    to_branch: &str,
) -> Result<PullRequestMergeResult, VcsError> {
    if !source_repo_path.exists() || !target_repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let from_branch = normalize_branch_name(from_branch)?;
    let to_branch = normalize_branch_name(to_branch)?;
    let source_branches = list_branches(source_repo_path)?;
    let target_branches = list_branches(target_repo_path)?;
    if !branch_exists(&source_branches, &from_branch)
        || !branch_exists(&target_branches, &to_branch)
    {
        return Err(VcsError::NotFound);
    }

    let target_ref = format!("refs/heads/{to_branch}");
    let source_ref = format!("refs/heads/{from_branch}");
    let target_commit_id_before = git_output(target_repo_path, &["rev-parse", &target_ref])?
        .trim()
        .to_string();
    let from_commit_id = git_output(source_repo_path, &["rev-parse", &source_ref])?
        .trim()
        .to_string();

    let work_dir = TempWorkDir::create("merge")?;
    git_clone_repository(target_repo_path, work_dir.path())?;
    git_worktree_output(work_dir.path(), &["checkout", &to_branch])?;
    git_worktree_output(
        work_dir.path(),
        &["config", "user.email", "yona@example.invalid"],
    )?;
    git_worktree_output(work_dir.path(), &["config", "user.name", "Yona"])?;
    git_worktree_output_with_path(
        work_dir.path(),
        &["remote", "add", "pull-request-source"],
        source_repo_path,
    )?;
    git_worktree_output(
        work_dir.path(),
        &[
            "fetch",
            "pull-request-source",
            &format!("+{source_ref}:refs/remotes/pull-request-source/{from_branch}"),
        ],
    )?;
    let merge_target = format!("refs/remotes/pull-request-source/{from_branch}");
    match git_worktree_output(
        work_dir.path(),
        &["merge", "--no-ff", "--no-edit", &merge_target],
    ) {
        Ok(_) => {}
        Err(VcsError::GitFailed(message)) if is_merge_conflict_output(&message) => {
            let _ = git_worktree_output(work_dir.path(), &["merge", "--abort"]);
            return Ok(PullRequestMergeResult {
                conflict: true,
                from_commit_id,
                merged_commit_id: String::new(),
                target_commit_id_before,
            });
        }
        Err(error) => return Err(error),
    }

    let merged_commit_id = git_worktree_output(work_dir.path(), &["rev-parse", "HEAD"])?
        .trim()
        .to_string();
    let push_ref = format!("HEAD:{target_ref}");
    git_worktree_output(work_dir.path(), &["push", "origin", &push_ref])?;

    Ok(PullRequestMergeResult {
        conflict: false,
        from_commit_id,
        merged_commit_id,
        target_commit_id_before,
    })
}

pub fn preview_pull_request_merge(
    source_repo_path: &Path,
    target_repo_path: &Path,
    from_branch: &str,
    to_branch: &str,
) -> Result<PullRequestMergePreview, VcsError> {
    if !source_repo_path.exists() || !target_repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let from_branch = normalize_branch_name(from_branch)?;
    let to_branch = normalize_branch_name(to_branch)?;
    let source_branches = list_branches(source_repo_path)?;
    let target_branches = list_branches(target_repo_path)?;
    if !branch_exists(&source_branches, &from_branch)
        || !branch_exists(&target_branches, &to_branch)
        || !has_head(source_repo_path)
        || !has_head(target_repo_path)
    {
        return Err(VcsError::NotFound);
    }

    let source_ref = format!("refs/heads/{from_branch}");
    let target_ref = format!("refs/heads/{to_branch}");
    let work_dir = TempWorkDir::create("merge-preview")?;
    git_worktree_output(work_dir.path(), &["init"])?;
    git_worktree_output(
        work_dir.path(),
        &["config", "user.email", "yona@example.invalid"],
    )?;
    git_worktree_output(work_dir.path(), &["config", "user.name", "Yona"])?;
    git_worktree_output_with_path(
        work_dir.path(),
        &["remote", "add", "target"],
        target_repo_path,
    )?;
    git_worktree_output(
        work_dir.path(),
        &[
            "fetch",
            "target",
            &format!("+{target_ref}:refs/remotes/target/{to_branch}"),
        ],
    )?;
    let checkout_target = format!("refs/remotes/target/{to_branch}");
    git_worktree_output(
        work_dir.path(),
        &["checkout", "-B", &to_branch, &checkout_target],
    )?;
    git_worktree_output_with_path(
        work_dir.path(),
        &["remote", "add", "pull-request-source"],
        source_repo_path,
    )?;
    git_worktree_output(
        work_dir.path(),
        &[
            "fetch",
            "pull-request-source",
            &format!("+{source_ref}:refs/remotes/pull-request-source/{from_branch}"),
        ],
    )?;

    let merge_target = format!("refs/remotes/pull-request-source/{from_branch}");
    let commits =
        list_pull_request_commits_in_worktree(work_dir.path(), &to_branch, &merge_target)?;
    let conflict = match git_worktree_output(
        work_dir.path(),
        &["merge", "--no-ff", "--no-edit", &merge_target],
    ) {
        Ok(_) => false,
        Err(VcsError::GitFailed(message)) if is_merge_conflict_output(&message) => true,
        Err(error) => return Err(error),
    };
    let _ = git_worktree_output(work_dir.path(), &["merge", "--abort"]);

    Ok(PullRequestMergePreview {
        commits,
        conflict,
        no_head: false,
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

fn no_head_branch_list() -> CodeBranchListSnapshot {
    CodeBranchListSnapshot {
        branches: Vec::new(),
        default_branch: String::new(),
        no_head: true,
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

fn list_code_selector_refs(repo_path: &Path) -> Result<Vec<CodeBranchRecord>, VcsError> {
    let output = git_output(
        repo_path,
        &[
            "for-each-ref",
            "--format=%(refname:short)",
            "refs/heads",
            "refs/tags",
        ],
    )?;
    let mut refs = Vec::new();
    for name in output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
    {
        if refs
            .iter()
            .any(|existing: &CodeBranchRecord| existing.name == name)
        {
            continue;
        }
        refs.push(CodeBranchRecord {
            name: name.to_string(),
        });
    }
    Ok(refs)
}

fn list_branch_details(
    repo_path: &Path,
    default_branch: &str,
) -> Result<Vec<CodeBranchListItemRecord>, VcsError> {
    let output = git_output(
        repo_path,
        &[
            "for-each-ref",
            "--sort=-committerdate",
            "--format=%(refname:short)%1f%(objectname)%1f%(objectname:short)%1f%(contents:subject)%1f%(committerdate:short)",
            "refs/heads",
        ],
    )?;
    let mut branches = output
        .lines()
        .filter_map(|line| {
            let mut parts = line.split('\x1f');
            let name = parts.next()?.trim().to_string();
            if name.is_empty() {
                return None;
            }
            let commit_id = parts.next().unwrap_or_default().trim().to_string();
            let commit_short_id = parts.next().unwrap_or_default().trim().to_string();
            let commit_message = parts.next().unwrap_or_default().trim().to_string();
            let commit_date = parts.next().unwrap_or_default().trim().to_string();
            Some(CodeBranchListItemRecord {
                commit_date,
                commit_id,
                commit_message,
                commit_short_id,
                is_default: name == default_branch,
                short_name: name.clone(),
                name,
            })
        })
        .collect::<Vec<_>>();
    branches.sort_by(|left, right| {
        right
            .is_default
            .cmp(&left.is_default)
            .then_with(|| right.commit_date.cmp(&left.commit_date))
            .then_with(|| left.name.cmp(&right.name))
    });
    Ok(branches)
}

fn branch_exists(branches: &[CodeBranchRecord], name: &str) -> bool {
    let normalized = name.trim();
    !normalized.is_empty() && branches.iter().any(|branch| branch.name == normalized)
}

fn normalize_branch_name(branch_name: &str) -> Result<String, VcsError> {
    let trimmed = branch_name
        .trim()
        .strip_prefix("refs/heads/")
        .unwrap_or_else(|| branch_name.trim());
    if trimmed.is_empty() || trimmed.contains('\0') {
        return Err(VcsError::InvalidBranch);
    }
    Ok(trimmed.to_string())
}

fn revision_exists(repo_path: &Path, revision: &str) -> bool {
    let spec = format!("{revision}^{{commit}}");
    git_output(repo_path, &["rev-parse", "--verify", &spec]).is_ok()
}

fn is_zero_oid(value: &str) -> bool {
    value.chars().all(|character| character == '0')
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
        let (commit_short_id, commit_message, commit_date, author_label, author_email) =
            latest_commit_for_path(repo_path, branch, &entry_path);
        entries.push(CodeEntryRecord {
            author_email,
            author_label,
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

fn latest_commit_for_path(
    repo_path: &Path,
    branch: &str,
    path: &str,
) -> (String, String, String, String, String) {
    let Ok(output) = git_output(
        repo_path,
        &[
            "log",
            "-1",
            "--format=%h%x1f%s%x1f%cs%x1f%an%x1f%ae",
            branch,
            "--",
            path,
        ],
    ) else {
        return (
            String::new(),
            String::new(),
            String::new(),
            String::new(),
            String::new(),
        );
    };
    let mut parts = output.trim().split('\x1f');
    (
        parts.next().unwrap_or_default().to_string(),
        parts.next().unwrap_or_default().to_string(),
        parts.next().unwrap_or_default().to_string(),
        parts.next().unwrap_or_default().to_string(),
        parts.next().unwrap_or_default().to_string(),
    )
}

fn latest_file_commit_for_path(
    repo_path: &Path,
    branch: &str,
    path: &str,
) -> (String, String, String, String, String, String) {
    let Ok(output) = git_output(
        repo_path,
        &[
            "log",
            "-1",
            "--format=%H%x1f%h%x1f%s%x1f%cs%x1f%an%x1f%ae",
            branch,
            "--",
            path,
        ],
    ) else {
        return (
            String::new(),
            String::new(),
            String::new(),
            String::new(),
            String::new(),
            String::new(),
        );
    };
    let mut parts = output.trim().split('\x1f');
    (
        parts.next().unwrap_or_default().to_string(),
        parts.next().unwrap_or_default().to_string(),
        parts.next().unwrap_or_default().to_string(),
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
    Ok(parse_pull_request_commit_records(&output)
        .into_iter()
        .collect())
}

fn list_pull_request_commits_in_worktree(
    work_tree_path: &Path,
    base_revision: &str,
    head_revision: &str,
) -> Result<Vec<PullRequestDiffCommitRecord>, VcsError> {
    let range = format!("{base_revision}..{head_revision}");
    let output = git_worktree_output(
        work_tree_path,
        &[
            "log",
            "--format=%H%x1f%h%x1f%s%x1f%ae%x1f%ad",
            "--date=short",
            &range,
        ],
    )?;
    Ok(parse_pull_request_commit_records(&output)
        .into_iter()
        .collect())
}

fn parse_pull_request_commit_records(output: &str) -> Vec<PullRequestDiffCommitRecord> {
    output
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
        .collect()
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

fn first_line(text: &str) -> &str {
    text.lines().next().unwrap_or_default()
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
    let (commit_id, commit_short_id, commit_message, commit_date, author_label, author_email) =
        latest_file_commit_for_path(repo_path, branch, path);
    Ok(CodeFileRecord {
        author_email,
        author_label,
        commit_date,
        commit_id,
        commit_message,
        commit_short_id,
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

fn git_clone_repository(source_repo_path: &Path, work_tree_path: &Path) -> Result<(), VcsError> {
    let output = git_command()
        .arg("clone")
        .arg(source_repo_path)
        .arg(work_tree_path)
        .output()
        .map_err(|_| VcsError::GitUnavailable)?;
    if output.status.success() {
        Ok(())
    } else {
        Err(VcsError::GitFailed(git_error_text(&output)))
    }
}

fn git_worktree_output(work_tree_path: &Path, args: &[&str]) -> Result<String, VcsError> {
    let args = args.iter().map(OsString::from).collect::<Vec<_>>();
    let bytes = git_worktree_bytes(work_tree_path, args)?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

fn git_worktree_output_with_path(
    work_tree_path: &Path,
    args: &[&str],
    path_arg: &Path,
) -> Result<String, VcsError> {
    let mut args = args.iter().map(OsString::from).collect::<Vec<_>>();
    args.push(path_arg.as_os_str().to_os_string());
    let bytes = git_worktree_bytes(work_tree_path, args)?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

fn git_worktree_bytes(
    work_tree_path: &Path,
    args: impl IntoIterator<Item = OsString>,
) -> Result<Vec<u8>, VcsError> {
    let args = args.into_iter().collect::<Vec<_>>();
    let mut command = git_command();
    command
        .arg("-C")
        .arg(work_tree_path)
        .args(&args)
        .stdin(Stdio::null())
        .stderr(Stdio::piped())
        .stdout(Stdio::piped());
    command_bytes(command, Duration::from_secs(30))
}

fn git_bytes(repo_path: &Path, args: &[&str]) -> Result<Vec<u8>, VcsError> {
    let mut command = git_command();
    command
        .arg("--git-dir")
        .arg(repo_path)
        .args(args)
        .stdin(Stdio::null())
        .stderr(Stdio::piped())
        .stdout(Stdio::piped());
    command_bytes(command, Duration::from_secs(5))
}

fn git_bytes_bounded(
    repo_path: &Path,
    args: &[&str],
    max_bytes: usize,
) -> Result<Vec<u8>, VcsError> {
    let mut command = git_command();
    command
        .arg("--git-dir")
        .arg(repo_path)
        .args(args)
        .stdin(Stdio::null())
        .stderr(Stdio::piped())
        .stdout(Stdio::piped());
    command_bytes_with_limit(command, Duration::from_secs(5), Some(max_bytes))
}

fn git_command() -> Command {
    let mut command = Command::new("git");
    command.env_remove("GIT_DIR").env_remove("GIT_WORK_TREE");
    command
}

fn command_bytes(command: Command, timeout: Duration) -> Result<Vec<u8>, VcsError> {
    command_bytes_with_limit(command, timeout, None)
}

fn command_bytes_with_limit(
    command: Command,
    timeout: Duration,
    max_bytes: Option<usize>,
) -> Result<Vec<u8>, VcsError> {
    let (output, exceeded) =
        capture_command_output(command, timeout, max_bytes, max_bytes.map(|_| 64 * 1024)).map_err(
            |error| match error {
                CommandCaptureError::Unavailable => VcsError::GitUnavailable,
                CommandCaptureError::TimedOut => VcsError::GitTimedOut,
            },
        )?;
    if exceeded {
        return Err(VcsError::GitFailed(
            "git command output exceeded the configured limit".to_string(),
        ));
    }
    if output.status.success() {
        return Ok(output.stdout);
    }
    let stderr = git_error_text(&output);
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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum CommandCaptureError {
    Unavailable,
    TimedOut,
}

struct CapturedStream {
    bytes: Vec<u8>,
    exceeded: bool,
}

fn read_stream(mut stream: impl Read, max_bytes: Option<usize>) -> std::io::Result<CapturedStream> {
    let mut bytes = Vec::new();
    let mut exceeded = false;
    let mut buffer = [0_u8; 8192];
    loop {
        let count = stream.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        match max_bytes {
            Some(max_bytes) => {
                let remaining = max_bytes.saturating_sub(bytes.len());
                bytes.extend_from_slice(&buffer[..count.min(remaining)]);
                exceeded |= count > remaining;
            }
            None => bytes.extend_from_slice(&buffer[..count]),
        }
    }
    Ok(CapturedStream { bytes, exceeded })
}

fn capture_command_output(
    mut command: Command,
    timeout: Duration,
    max_stdout_bytes: Option<usize>,
    max_stderr_bytes: Option<usize>,
) -> Result<(std::process::Output, bool), CommandCaptureError> {
    let mut child = command
        .spawn()
        .map_err(|_| CommandCaptureError::Unavailable)?;
    let stdout = child
        .stdout
        .take()
        .ok_or(CommandCaptureError::Unavailable)?;
    let stderr = child
        .stderr
        .take()
        .ok_or(CommandCaptureError::Unavailable)?;
    let stdout_reader = thread::spawn(move || read_stream(stdout, max_stdout_bytes));
    let stderr_reader = thread::spawn(move || read_stream(stderr, max_stderr_bytes));
    let start = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Ok(status),
            Ok(None) if start.elapsed() > timeout => {
                break Err(CommandCaptureError::TimedOut);
            }
            Ok(None) => thread::sleep(Duration::from_millis(10)),
            Err(_) => break Err(CommandCaptureError::Unavailable),
        }
    };
    if status.is_err() {
        let _ = child.kill();
        let _ = child.wait();
    }
    let stdout = stdout_reader.join();
    let stderr = stderr_reader.join();
    let status = status?;
    let stdout = stdout
        .map_err(|_| CommandCaptureError::Unavailable)?
        .map_err(|_| CommandCaptureError::Unavailable)?;
    let stderr = stderr
        .map_err(|_| CommandCaptureError::Unavailable)?
        .map_err(|_| CommandCaptureError::Unavailable)?;
    let exceeded = stdout.exceeded || stderr.exceeded;
    let output = std::process::Output {
        status,
        stdout: stdout.bytes,
        stderr: stderr.bytes,
    };
    Ok((output, exceeded))
}

fn git_error_text(output: &std::process::Output) -> String {
    let mut message = String::from_utf8_lossy(&output.stderr).to_string();
    if !output.stdout.is_empty() {
        message.push_str(&String::from_utf8_lossy(&output.stdout));
    }
    message
}

fn is_merge_conflict_output(message: &str) -> bool {
    message.contains("CONFLICT") || message.contains("Automatic merge failed")
}

struct TempWorkDir {
    path: PathBuf,
}

impl TempWorkDir {
    fn create(label: &str) -> Result<Self, VcsError> {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|error| VcsError::FilesystemFailed(error.to_string()))?
            .as_nanos();
        let path =
            std::env::temp_dir().join(format!("yona-vcs-{label}-{}-{nanos}", std::process::id()));
        std::fs::create_dir_all(&path)
            .map_err(|error| VcsError::FilesystemFailed(error.to_string()))?;
        Ok(Self { path })
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TempWorkDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

fn parse_git_http_backend_output(output: &[u8]) -> Result<GitHttpBackendResponse, VcsError> {
    let (header_end, delimiter_len) = find_delimiter(output, HEADER_BODY_DELIMITER_CRLF)
        .or_else(|| find_delimiter(output, HEADER_BODY_DELIMITER_LF))
        .ok_or_else(|| {
            VcsError::GitFailed(
                "Invalid git-http-backend CGI output: missing header/body delimiter".to_string(),
            )
        })?;
    let header_text = String::from_utf8_lossy(&output[..header_end]);
    let body = output[header_end + delimiter_len..].to_vec();
    let mut status = 200u16;
    let mut headers = Vec::new();

    for raw_line in header_text.lines() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }
        let Some((name, value)) = line.split_once(':') else {
            continue;
        };
        let name = name.trim();
        let value = value.trim();
        if name.eq_ignore_ascii_case("status") {
            if let Some(code) = value
                .split_whitespace()
                .next()
                .and_then(|code| code.parse::<u16>().ok())
            {
                status = code;
            }
            continue;
        }
        headers.push((name.to_string(), value.to_string()));
    }

    Ok(GitHttpBackendResponse {
        body,
        headers,
        status,
    })
}

fn find_delimiter(buffer: &[u8], delimiter: &[u8]) -> Option<(usize, usize)> {
    buffer
        .windows(delimiter.len())
        .position(|window| window == delimiter)
        .map(|index| (index, delimiter.len()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn read_file_bytes_drains_git_output_larger_than_a_pipe_buffer() {
        let data_dir = tempdir().expect("large blob tempdir");
        let repo_path = data_dir.path().join("large.git");
        create_bare_repository(&repo_path).expect("create bare repository");
        let contents = "x".repeat(MAX_TEXT_FILE_BYTES as usize + 1);
        commit_text_file(
            &repo_path,
            None,
            "ISSUE_TEMPLATE.md",
            &contents,
            "Add large template",
            "Template Author",
            "template@example.com",
        )
        .expect("commit large template");

        let file =
            read_file_bytes(&repo_path, "HEAD", "ISSUE_TEMPLATE.md").expect("read large template");
        assert_eq!(file.bytes, contents.as_bytes());
        assert!(matches!(
            read_file_bytes_bounded(
                &repo_path,
                "HEAD",
                "ISSUE_TEMPLATE.md",
                contents.len() - 1,
            ),
            Err(VcsError::GitFailed(message)) if message.contains("output exceeded")
        ));
    }

    #[cfg(unix)]
    #[test]
    fn bounded_command_capture_drains_both_streams_and_times_out_children() {
        let mut noisy = Command::new("sh");
        noisy
            .args([
                "-c",
                "dd if=/dev/zero bs=65536 count=2 2>/dev/null; dd if=/dev/zero bs=65536 count=2 1>&2 2>/dev/null",
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let (output, exceeded) =
            capture_command_output(noisy, Duration::from_secs(2), Some(1024), Some(1024))
                .expect("capture bounded stdout and stderr");
        assert!(output.status.success());
        assert!(exceeded);
        assert_eq!(output.stdout.len(), 1024);
        assert_eq!(output.stderr.len(), 1024);

        let mut sleeping = Command::new("sh");
        sleeping
            .args(["-c", "sleep 1"])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        assert_eq!(
            capture_command_output(sleeping, Duration::from_millis(20), Some(1024), Some(1024),)
                .expect_err("sleeping child must time out"),
            CommandCaptureError::TimedOut
        );
    }

    #[test]
    fn git_commit_reference_resolver_returns_canonical_and_legacy_short_ids() {
        let data_dir = tempdir().expect("git commit reference tempdir");
        let repo_path = data_dir.path().join("reference.git");
        create_bare_repository(&repo_path).expect("create bare repository");
        let commit_id = commit_text_file(
            &repo_path,
            None,
            "README.md",
            "reference\n",
            "Seed reference",
            "Reference Author",
            "reference@example.com",
        )
        .expect("commit reference fixture")
        .expect("commit id");

        let reference = resolve_git_commit_reference(&repo_path, &commit_id[..7])
            .expect("resolve abbreviated commit reference");
        assert_eq!(reference.commit_id, commit_id);
        assert_eq!(reference.commit_short_id, commit_id[..7]);
        assert!(matches!(
            resolve_git_commit_reference(&repo_path, "ABCDEF0"),
            Err(VcsError::NotFound)
        ));
        assert!(matches!(
            resolve_git_commit_reference(&repo_path, "abcdef"),
            Err(VcsError::NotFound)
        ));
    }

    #[test]
    fn parse_svnlook_changed_preserves_action_path_and_kind() {
        let changed = parse_svnlook_changed(
            "A   trunk/\nA   trunk/README.md\n U  trunk/\nD   old.txt\nR   moved.txt\n",
        )
        .expect("parse changed output");

        assert_eq!(
            changed,
            vec![
                SvnChangedPath {
                    path: "trunk".to_string(),
                    is_dir: true,
                    action: SvnChangedAction::Added,
                    copy_from_path: None,
                    copy_from_revision: None,
                },
                SvnChangedPath {
                    path: "trunk/README.md".to_string(),
                    is_dir: false,
                    action: SvnChangedAction::Added,
                    copy_from_path: None,
                    copy_from_revision: None,
                },
                SvnChangedPath {
                    path: "trunk".to_string(),
                    is_dir: true,
                    action: SvnChangedAction::Modified,
                    copy_from_path: None,
                    copy_from_revision: None,
                },
                SvnChangedPath {
                    path: "old.txt".to_string(),
                    is_dir: false,
                    action: SvnChangedAction::Deleted,
                    copy_from_path: None,
                    copy_from_revision: None,
                },
                SvnChangedPath {
                    path: "moved.txt".to_string(),
                    is_dir: false,
                    action: SvnChangedAction::Replaced,
                    copy_from_path: None,
                    copy_from_revision: None,
                },
            ]
        );
    }

    #[test]
    fn parse_svnlook_changed_reads_copy_info() {
        let changed = parse_svnlook_changed("A + branch-switch/\n    (from trunk/:r1)\n")
            .expect("parse changed copy output");

        assert_eq!(
            changed,
            vec![SvnChangedPath {
                path: "branch-switch".to_string(),
                is_dir: true,
                action: SvnChangedAction::Added,
                copy_from_path: Some("trunk".to_string()),
                copy_from_revision: Some(1),
            }]
        );
    }

    #[test]
    fn parse_svnlook_history_reads_latest_path_revision() {
        let revision = parse_svnlook_history_latest_revision(
            "REVISION   PATH\n--------   ----\n2          /trunk/README.md\n1          /trunk/README.md\n",
        )
        .expect("parse history output");

        assert_eq!(revision, 2);
    }

    #[test]
    fn parse_svnlook_history_returns_not_found_for_empty_history() {
        assert!(matches!(
            parse_svnlook_history_latest_revision("REVISION   PATH\n--------   ----\n"),
            Err(VcsError::NotFound)
        ));
    }
}
