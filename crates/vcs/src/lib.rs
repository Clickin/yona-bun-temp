use std::ffi::OsString;
use std::io::{Read, Write};
#[cfg(unix)]
use std::os::unix::process::CommandExt;
use std::path::{Component, Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::{Duration, Instant, SystemTime};

pub const CRATE_OWNER: &str = "vcs";
pub const HISTORY_ITEM_LIMIT: usize = 25;
pub const MAX_ISSUE_TEMPLATE_BYTES: usize = 2 * 1024 * 1024;
pub const MAX_TEXT_FILE_BYTES: i64 = 1024 * 1024;
pub const MAX_SMART_HTTP_RPC_BYTES: usize = 100 * 1024 * 1024;

const HEADER_BODY_DELIMITER_CRLF: &[u8] = b"\r\n\r\n";
const HEADER_BODY_DELIMITER_LF: &[u8] = b"\n\n";
const DEFAULT_GIT_AUTHOR_EMAIL: &str = "yoram@example.invalid";
const DEFAULT_GIT_AUTHOR_NAME: &str = "Yoram";
static TEMP_WORK_DIR_SEQUENCE: AtomicU64 = AtomicU64::new(0);

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
pub struct CodeBlameSnapshot {
    pub lines: Vec<CodeBlameRecord>,
    pub path: String,
    pub selected_branch: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeBlameRecord {
    pub author_date: String,
    pub author_email: String,
    pub author_name: String,
    pub commit_id: String,
    pub commit_message: String,
    pub commit_short_id: String,
    pub content: String,
    pub line_number: u32,
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
pub struct CodeTagListSnapshot {
    pub tags: Vec<CodeTagListItemRecord>,
    pub no_head: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeTagListItemRecord {
    pub name: String,
    pub short_name: String,
    pub commit_id: String,
    pub commit_short_id: String,
    pub commit_message: String,
    pub creator_name: String,
    pub creator_email: String,
    pub created_date: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeFindFileResult {
    pub paths: Vec<String>,
    pub selected_branch: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeGrepMatchRecord {
    pub content: String,
    pub line_number: u32,
    pub path: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CodeGrepResult {
    pub matches: Vec<CodeGrepMatchRecord>,
    pub query: String,
    pub selected_branch: String,
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
    pub author_timestamp: Option<i64>,
    pub commit_id: String,
    pub commit_message: String,
    pub commit_short_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequestChangedFileRecord {
    pub path: String,
    pub patch: String,
}

pub struct PullRequestMergeMetadata<'a> {
    pub author_name: &'a str,
    pub author_email: &'a str,
    pub pull_request_number: i64,
    pub source_project: Option<&'a str>,
    pub review_trailers: &'a str,
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

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum VcsPathError {
    #[error("invalid repository path component: {0:?}")]
    InvalidComponent(String),
}

fn validate_repository_component(component: &str) -> Result<(), VcsPathError> {
    // ponytail: path-safety only — business naming policy lives in entity validation.
    if component.is_empty()
        || component == "."
        || component == ".."
        || component.contains('/')
        || component.contains('\\')
        || component.contains('\0')
    {
        return Err(VcsPathError::InvalidComponent(component.to_string()));
    }
    Ok(())
}

pub fn repository_path(
    data_root: &Path,
    owner: &str,
    project: &str,
) -> Result<PathBuf, VcsPathError> {
    validate_repository_component(owner)?;
    validate_repository_component(project)?;
    Ok(data_root
        .join("repo")
        .join("git")
        .join(owner)
        .join(format!("{project}.git")))
}

pub fn svn_repository_path(
    data_root: &Path,
    owner: &str,
    project: &str,
) -> Result<PathBuf, VcsPathError> {
    validate_repository_component(owner)?;
    validate_repository_component(project)?;
    Ok(data_root.join("repo").join("svn").join(owner).join(project))
}

pub fn repository_path_for_vcs(
    data_root: &Path,
    vcs: &str,
    owner: &str,
    project: &str,
) -> Result<PathBuf, VcsPathError> {
    if vcs == "Subversion" {
        svn_repository_path(data_root, owner, project)
    } else {
        repository_path(data_root, owner, project)
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
    // svnadmin create is not idempotent (unlike `git init --bare`): a valid
    // repo left behind by an earlier (possibly rolled-back) import is fine.
    if repo_path.is_dir() && (repo_path.join("format").exists() || repo_path.join("db").is_dir()) {
        return Ok(());
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

fn svn_activity_work_dir(repo_path: &Path, activity_id: &str) -> Result<PathBuf, VcsError> {
    validate_repository_component(activity_id).map_err(|_| VcsError::InvalidPath)?;
    let parent = repo_path.parent().ok_or(VcsError::InvalidPath)?;
    Ok(parent.join(".svn-activities").join(activity_id))
}

fn cleanup_stale_svn_activities(parent: &Path) {
    let Ok(entries) = std::fs::read_dir(parent) else {
        return;
    };
    let now = SystemTime::now();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Ok(modified) = entry.metadata().and_then(|metadata| metadata.modified()) else {
            continue;
        };
        let stale = now
            .duration_since(modified)
            .map(|age| age > Duration::from_secs(60 * 60))
            .unwrap_or(false);
        if stale {
            let _ = std::fs::remove_dir_all(&path);
            if let Some(activity_id) = path.file_name().and_then(|name| name.to_str()) {
                let _ = std::fs::remove_file(parent.join(format!("{activity_id}.log")));
            }
        }
    }
}

pub fn svn_activity_begin(repo_path: &Path, activity_id: &str) -> Result<i64, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if let Some(parent) = work_dir.parent() {
        cleanup_stale_svn_activities(parent);
    }
    if work_dir.exists() {
        return Err(VcsError::SvnFailed(format!(
            "SVN activity already exists: {activity_id}"
        )));
    }
    if let Some(parent) = work_dir.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            VcsError::FilesystemFailed(format!("create SVN activity directory: {error}"))
        })?;
    }
    let revision = svn_youngest_revision(repo_path)?;
    run_svn_command(
        svn_command("svn")
            .args(["checkout", "--non-interactive", "-r", &revision.to_string()])
            .arg(svn_file_url(repo_path))
            .arg(&work_dir),
    )?;
    Ok(revision)
}

pub fn svn_activity_path_exists(
    repo_path: &Path,
    activity_id: &str,
    path: &str,
) -> Result<bool, VcsError> {
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if !work_dir.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Ok(true);
    }
    Ok(work_dir.join(clean_path).exists())
}

pub fn svn_activity_file_contents(
    repo_path: &Path,
    activity_id: &str,
    path: &str,
) -> Result<Vec<u8>, VcsError> {
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if !work_dir.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    std::fs::read(work_dir.join(clean_path)).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            VcsError::NotFound
        } else {
            VcsError::FilesystemFailed(error.to_string())
        }
    })
}

pub fn svn_activity_put_file(
    repo_path: &Path,
    activity_id: &str,
    path: &str,
    contents: &[u8],
) -> Result<bool, VcsError> {
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if !work_dir.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let target_path = work_dir.join(&clean_path);
    let existed = target_path.exists();
    if let Some(parent) = target_path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            VcsError::FilesystemFailed(format!("create SVN activity PUT parent: {error}"))
        })?;
    }
    std::fs::write(&target_path, contents)
        .map_err(|error| VcsError::FilesystemFailed(format!("write SVN activity file: {error}")))?;
    if !existed {
        run_svn_command(
            svn_command("svn")
                .args(["add", "--parents", "--force"])
                .arg(&target_path),
        )?;
    }
    Ok(existed)
}

pub fn svn_activity_delete_path(
    repo_path: &Path,
    activity_id: &str,
    path: &str,
) -> Result<(), VcsError> {
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if !work_dir.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let target_path = work_dir.join(&clean_path);
    if !target_path.exists() {
        return Err(VcsError::NotFound);
    }
    run_svn_command(svn_command("svn").arg("delete").arg(&target_path))
}

pub fn svn_activity_make_collection(
    repo_path: &Path,
    activity_id: &str,
    path: &str,
) -> Result<(), VcsError> {
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if !work_dir.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let target_path = work_dir.join(&clean_path);
    if target_path.exists() {
        return Err(VcsError::FilesystemFailed(format!(
            "SVN collection already exists: {clean_path}"
        )));
    }
    std::fs::create_dir_all(&target_path).map_err(|error| {
        VcsError::FilesystemFailed(format!("create SVN activity collection: {error}"))
    })?;
    run_svn_command(
        svn_command("svn")
            .args(["add", "--parents", "--force"])
            .arg(&target_path),
    )
}

pub fn svn_activity_copy_path(
    repo_path: &Path,
    activity_id: &str,
    source_revision: Option<i64>,
    source_path: &str,
    destination_path: &str,
) -> Result<(), VcsError> {
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if !work_dir.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_source = normalize_repo_path(source_path)?;
    let clean_destination = normalize_repo_path(destination_path)?;
    if clean_source.is_empty() || clean_destination.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let source = if source_revision.is_some() {
        let mut source_url = svn_file_url(repo_path);
        source_url.push('/');
        source_url.push_str(&clean_source);
        source_url.push('@');
        source_url.push_str(&source_revision.unwrap_or_default().to_string());
        source_url
    } else {
        work_dir.join(&clean_source).display().to_string()
    };
    run_svn_command(
        svn_command("svn")
            .arg("copy")
            .arg(source)
            .arg(work_dir.join(&clean_destination)),
    )
}

pub fn svn_activity_move_path(
    repo_path: &Path,
    activity_id: &str,
    source_path: &str,
    destination_path: &str,
) -> Result<(), VcsError> {
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if !work_dir.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_source = normalize_repo_path(source_path)?;
    let clean_destination = normalize_repo_path(destination_path)?;
    if clean_source.is_empty() || clean_destination.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    run_svn_command(
        svn_command("svn")
            .arg("move")
            .arg(work_dir.join(clean_source))
            .arg(work_dir.join(clean_destination)),
    )
}

pub fn svn_activity_patch_properties(
    repo_path: &Path,
    activity_id: &str,
    path: &str,
    patches: &[SvnPropertyPatch],
) -> Result<(), VcsError> {
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if !work_dir.is_dir() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() || patches.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    for patch in patches {
        validate_svn_property_name(&patch.name)?;
        let target_path = work_dir.join(&clean_path);
        if !target_path.exists() {
            return Err(VcsError::NotFound);
        }
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
    Ok(())
}

pub async fn svn_activity_commit(
    repo_path: &Path,
    activity_id: &str,
    author: &str,
    message: &str,
    lock_tokens: &[(String, String)],
    keep_locks: bool,
) -> Result<i64, VcsError> {
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if !work_dir.is_dir() {
        return Err(VcsError::NotFound);
    }
    let status = svn_command("svn")
        .args(["status", "--quiet"])
        .arg(&work_dir)
        .output()
        .map_err(|_| VcsError::SvnUnavailable)?;
    if !status.status.success() {
        return Err(VcsError::SvnFailed(
            String::from_utf8_lossy(&status.stderr).trim().to_string(),
        ));
    }
    if status.stdout.is_empty() {
        let revision = svn_youngest_revision(repo_path)?;
        let _ = std::fs::remove_dir_all(&work_dir);
        return Ok(revision);
    }
    if !lock_tokens.is_empty() {
        use sqlx::Connection;
        let mut locks = Vec::with_capacity(lock_tokens.len());
        for (path, token) in lock_tokens {
            let lock = svn_lock(repo_path, path)?.ok_or_else(|| {
                VcsError::SvnFailed("Supplied SVN lock no longer exists".to_string())
            })?;
            if lock.owner != author || lock.token != *token {
                return Err(VcsError::SvnFailed(
                    "SVN lock owner or token mismatch".to_string(),
                ));
            }
            locks.push(lock);
        }
        // ponytail: only our disposable SVN 1.8–1.14 format-31 working copy is
        // modified; fail closed on a new format until its lock schema is reviewed.
        let bind_locks = async {
            let options = sqlx::sqlite::SqliteConnectOptions::new()
                .filename(work_dir.join(".svn/wc.db"))
                .create_if_missing(false);
            let mut connection = sqlx::SqliteConnection::connect_with(&options).await?;
            let version: i64 = sqlx::query_scalar("PRAGMA user_version")
                .fetch_one(&mut connection)
                .await?;
            if version != 31 {
                return Err(sqlx::Error::Protocol(format!(
                    "unsupported SVN working-copy format {version}"
                )));
            }
            let mut transaction = connection.begin().await?;
            let repository_id: i64 = sqlx::query_scalar("SELECT id FROM REPOSITORY WHERE root = ?")
                .bind(svn_file_url(repo_path))
                .fetch_one(&mut *transaction)
                .await?;
            for lock in locks {
                sqlx::query("INSERT OR REPLACE INTO LOCK (repos_id, repos_relpath, lock_token, lock_owner, lock_comment) VALUES (?, ?, ?, ?, ?)")
                    .bind(repository_id)
                    .bind(lock.path.trim_start_matches('/'))
                    .bind(lock.token)
                    .bind(lock.owner)
                    .bind(lock.comment)
                    .execute(&mut *transaction).await?;
            }
            transaction.commit().await?;
            connection.close().await
        };
        bind_locks.await.map_err(|error| {
            VcsError::SvnFailed(format!("bind SVN working-copy locks: {error}"))
        })?;
    }
    let mut command = svn_command("svn");
    command.args([
        "commit",
        "--non-interactive",
        "--no-auth-cache",
        "--username",
        author,
        "-m",
        message,
    ]);
    if keep_locks {
        command.arg("--no-unlock");
    }
    let output = command
        .arg(&work_dir)
        .output()
        .map_err(|_| VcsError::SvnUnavailable)?;
    if !output.status.success() {
        return Err(VcsError::SvnFailed(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ));
    }
    let revision = svn_youngest_revision(repo_path)?;
    let _ = std::fs::remove_dir_all(&work_dir);
    Ok(revision)
}

pub fn svn_activity_abort(repo_path: &Path, activity_id: &str) -> Result<(), VcsError> {
    let work_dir = svn_activity_work_dir(repo_path, activity_id)?;
    if work_dir.exists() {
        std::fs::remove_dir_all(&work_dir)
            .map_err(|error| VcsError::FilesystemFailed(error.to_string()))?;
    }
    Ok(())
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
    let (metadata, comment_body) = output.split_once("\nComment (").unwrap_or((output, ""));
    let mut token = String::new();
    let mut owner = String::new();
    let mut comment = comment_body
        .split_once('\n')
        .map(|(_, text)| text.strip_suffix('\n').unwrap_or(text).to_string())
        .unwrap_or_default();
    let mut created = String::new();
    let mut expires = None;
    for line in metadata.lines() {
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
    // Relative data roots (e.g. `.yona-data`) must be absolute for svn —
    // `file:///.yona-data/...` points at the filesystem root. Canonicalize
    // the parent so non-existent paths (e.g. a repo not yet provisioned)
    // still yield an absolute URL.
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .map(|cwd| cwd.join(path))
            .unwrap_or_else(|_| path.to_path_buf())
    };
    let canonical = absolute
        .parent()
        .and_then(|parent| parent.canonicalize().ok())
        .map(|parent| parent.join(absolute.file_name().unwrap_or_default()))
        .unwrap_or(absolute);
    let display = canonical.display().to_string().replace('\\', "/");
    let display = display.trim_start_matches('/');
    format!("file:///{display}")
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
        DEFAULT_GIT_AUTHOR_EMAIL
    } else {
        author_email.trim()
    };
    let name = if author_name.trim().is_empty() {
        DEFAULT_GIT_AUTHOR_NAME
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
    // Resolve a relative data root to an absolute path before handing it to
    // the child process: git-http-backend re-resolves GIT_PROJECT_ROOT
    // against its own cwd (which we set to the repo root), so a relative
    // root would double up (.yona-data/repo/.yona-data/repo) and 404.
    let repo_root = request
        .repo_root
        .canonicalize()
        .unwrap_or_else(|_| request.repo_root.to_path_buf());

    let mut command = Command::new("git");
    command
        .arg("http-backend")
        .current_dir(&repo_root)
        .env("GIT_PROJECT_ROOT", &repo_root)
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
    #[cfg(unix)]
    command.process_group(0);

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
    let Some(mut stdin) = child.stdin.take() else {
        let _ = child.kill();
        let _ = child.wait();
        return Err(VcsError::GitUnavailable);
    };
    let Some(stdout) = child.stdout.take() else {
        let _ = child.kill();
        let _ = child.wait();
        return Err(VcsError::GitUnavailable);
    };
    let Some(stderr) = child.stderr.take() else {
        let _ = child.kill();
        let _ = child.wait();
        return Err(VcsError::GitUnavailable);
    };

    let output = thread::scope(|scope| {
        let stdin_writer = scope.spawn(|| {
            let result = if request.body.is_empty() {
                Ok(())
            } else {
                stdin.write_all(request.body)
            };
            drop(stdin);
            result
        });
        let stdout_reader = scope.spawn(|| read_stream(stdout, None));
        let stderr_reader = scope.spawn(|| read_stream(stderr, None));

        let start = Instant::now();
        let status = loop {
            match child.try_wait() {
                Ok(Some(status)) => break status,
                Ok(None) if start.elapsed() > Duration::from_secs(30) => {
                    terminate_git_process_group(child.id());
                    let _ = child.kill();
                    let _ = child.wait();
                    let _ = stdin_writer.join();
                    let _ = stdout_reader.join();
                    let _ = stderr_reader.join();
                    return Err(VcsError::GitTimedOut);
                }
                Ok(None) => thread::sleep(Duration::from_millis(10)),
                Err(_) => {
                    terminate_git_process_group(child.id());
                    let _ = child.kill();
                    let _ = child.wait();
                    let _ = stdin_writer.join();
                    let _ = stdout_reader.join();
                    let _ = stderr_reader.join();
                    return Err(VcsError::GitUnavailable);
                }
            }
        };

        let stdin_result = stdin_writer.join().map_err(|_| VcsError::GitUnavailable)?;
        let stdout = stdout_reader
            .join()
            .map_err(|_| VcsError::GitUnavailable)?
            .map_err(|error| VcsError::GitFailed(error.to_string()))?;
        let stderr = stderr_reader
            .join()
            .map_err(|_| VcsError::GitUnavailable)?
            .map_err(|error| VcsError::GitFailed(error.to_string()))?;
        stdin_result.map_err(|error| VcsError::GitFailed(error.to_string()))?;

        Ok(std::process::Output {
            status,
            stdout: stdout.bytes,
            stderr: stderr.bytes,
        })
    })?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.contains("not found") || stderr.contains("No such file") {
            return Err(VcsError::NotFound);
        }
        return Err(VcsError::GitFailed(stderr));
    }

    parse_git_http_backend_output(&output.stdout)
}

#[cfg(unix)]
fn terminate_git_process_group(pid: u32) {
    let _ = Command::new("kill")
        .args(["-KILL", &format!("-{pid}")])
        .status();
}

#[cfg(windows)]
fn terminate_git_process_group(pid: u32) {
    let _ = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status();
}

#[cfg(not(unix))]
#[cfg(not(windows))]
fn terminate_git_process_group(_pid: u32) {}

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
    if !branches.iter().any(|branch| branch.name == selected_branch)
        && !revision_exists(&repo_path, &selected_branch)
    {
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

pub fn read_svn_code_browser(
    repo_path: &Path,
    branch: Option<&str>,
    path: &str,
) -> Result<CodeBrowserSnapshot, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Ok(no_head_snapshot());
    }
    let selected_branch = branch
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("HEAD")
        .to_string();
    if branch.is_none() && svn_youngest_revision(repo_path)? == 0 {
        return Ok(no_head_snapshot());
    }
    let clean_path = normalize_repo_path(path)?;
    let tree = svn_list_tree(repo_path, None, &clean_path)?;
    let entries = tree
        .entries
        .into_iter()
        .map(|entry| CodeEntryRecord {
            author_email: String::new(),
            author_label: String::new(),
            commit_date: String::new(),
            commit_message: String::new(),
            commit_short_id: String::new(),
            kind: if entry.is_dir { "folder" } else { "file" }.to_string(),
            name: entry
                .path
                .rsplit('/')
                .next()
                .unwrap_or(entry.path.as_str())
                .to_string(),
            path: entry.path,
            size: 0,
        })
        .collect();
    Ok(CodeBrowserSnapshot {
        branches: vec![CodeBranchRecord {
            name: "HEAD".to_string(),
        }],
        breadcrumbs: breadcrumbs_for_path(&clean_path),
        entries,
        file: None,
        no_head: false,
        path: clean_path,
        selected_branch,
    })
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

pub fn read_archive_targz(repo_path: &Path, revision: &str) -> Result<Vec<u8>, VcsError> {
    if !repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let revision = revision.trim();
    if revision.is_empty() || revision.starts_with('-') || !revision_exists(repo_path, revision) {
        return Err(VcsError::NotFound);
    }

    git_bytes(repo_path, &["archive", "--format=tar.gz", revision])
}

pub fn read_code_archive_targz(repo_path: &Path, revision: &str) -> Result<Vec<u8>, VcsError> {
    read_archive_targz(repo_path, revision)
}

fn format_epoch_seconds(secs: i64) -> String {
    let days = secs / 86400;
    let rem_secs = (secs % 86400).abs();
    let hours = rem_secs / 3600;
    let mins = (rem_secs % 3600) / 60;
    let secs_of_min = rem_secs % 60;

    let z = days + 719468;
    let era = (if z >= 0 { z } else { z - 146096 }) / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };

    format!("{y:04}-{m:02}-{d:02} {hours:02}:{mins:02}:{secs_of_min:02}")
}

pub fn read_code_blame(
    repo_path: &Path,
    revision: &str,
    path: &str,
) -> Result<CodeBlameSnapshot, VcsError> {
    use std::collections::HashMap;

    if !repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let clean_path = normalize_repo_path(path)?;
    if clean_path.is_empty() {
        return Err(VcsError::InvalidPath);
    }
    let revision = revision.trim();
    if revision.is_empty() || revision.starts_with('-') || !revision_exists(repo_path, revision) {
        return Err(VcsError::NotFound);
    }

    let output_bytes = git_bytes(
        repo_path,
        &["blame", "-w", "--porcelain", revision, "--", &clean_path],
    )?;
    let output_str = String::from_utf8_lossy(&output_bytes);

    let mut lines = Vec::new();
    let mut commit_meta_map: HashMap<String, (String, String, String, String)> = HashMap::new();
    let mut current_commit_id = String::new();
    let mut current_line_number: u32 = 0;
    let mut cur_author_name = String::new();
    let mut cur_author_email = String::new();
    let mut cur_author_date = String::new();
    let mut cur_commit_message = String::new();

    for line in output_str.lines() {
        if let Some(content) = line.strip_prefix('\t') {
            if let Some((name, email, date, msg)) = commit_meta_map.get(&current_commit_id) {
                lines.push(CodeBlameRecord {
                    commit_id: current_commit_id.clone(),
                    commit_short_id: current_commit_id.chars().take(7).collect(),
                    author_name: name.clone(),
                    author_email: email.clone(),
                    author_date: date.clone(),
                    commit_message: msg.clone(),
                    line_number: current_line_number,
                    content: content.to_string(),
                });
            } else {
                let meta = (
                    cur_author_name.clone(),
                    cur_author_email.clone(),
                    cur_author_date.clone(),
                    cur_commit_message.clone(),
                );
                commit_meta_map.insert(current_commit_id.clone(), meta.clone());
                lines.push(CodeBlameRecord {
                    commit_id: current_commit_id.clone(),
                    commit_short_id: current_commit_id.chars().take(7).collect(),
                    author_name: meta.0,
                    author_email: meta.1,
                    author_date: meta.2,
                    commit_message: meta.3,
                    line_number: current_line_number,
                    content: content.to_string(),
                });
            }
        } else if let Some(name) = line.strip_prefix("author ") {
            cur_author_name = name.to_string();
        } else if let Some(email) = line.strip_prefix("author-mail ") {
            cur_author_email = email.trim_matches(|c| c == '<' || c == '>').to_string();
        } else if let Some(time_str) = line.strip_prefix("author-time ") {
            if let Ok(secs) = time_str.trim().parse::<i64>() {
                cur_author_date = format_epoch_seconds(secs);
            }
        } else if let Some(msg) = line.strip_prefix("summary ") {
            cur_commit_message = msg.to_string();
        } else {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3
                && parts[0].len() >= 7
                && parts[0].chars().all(|c| c.is_ascii_hexdigit())
            {
                current_commit_id = parts[0].to_string();
                current_line_number = parts[2].parse::<u32>().unwrap_or(0);
                if let Some((name, email, date, msg)) = commit_meta_map.get(&current_commit_id) {
                    cur_author_name = name.clone();
                    cur_author_email = email.clone();
                    cur_author_date = date.clone();
                    cur_commit_message = msg.clone();
                } else {
                    cur_author_name.clear();
                    cur_author_email.clear();
                    cur_author_date.clear();
                    cur_commit_message.clear();
                }
            }
        }
    }

    Ok(CodeBlameSnapshot {
        lines,
        path: clean_path,
        selected_branch: revision.to_string(),
    })
}

pub fn find_code_files(
    repo_path: &Path,
    branch: &str,
    query: Option<&str>,
) -> Result<CodeFindFileResult, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let selected_branch = if branch.trim().is_empty() {
        default_branch(repo_path).ok_or(VcsError::NotFound)?
    } else {
        branch.to_string()
    };

    let output = git_output(
        repo_path,
        &["ls-tree", "-r", "--name-only", &selected_branch],
    )?;
    let q_lower = query.map(|q| q.trim().to_lowercase()).unwrap_or_default();
    let mut paths = Vec::new();

    for line in output.lines() {
        let p = line.trim();
        if p.is_empty() {
            continue;
        }
        if !q_lower.is_empty() && !p.to_lowercase().contains(&q_lower) {
            continue;
        }
        paths.push(p.to_string());
    }

    Ok(CodeFindFileResult {
        paths,
        selected_branch,
    })
}

pub fn grep_code_files(
    repo_path: &Path,
    branch: &str,
    query: &str,
) -> Result<CodeGrepResult, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(VcsError::NotFound);
    }
    let query_trimmed = query.trim();
    let selected_branch = if branch.trim().is_empty() {
        default_branch(repo_path).ok_or(VcsError::NotFound)?
    } else {
        branch.to_string()
    };

    if query_trimmed.is_empty() {
        return Ok(CodeGrepResult {
            matches: Vec::new(),
            query: query.to_string(),
            selected_branch,
        });
    }

    let mut command = git_command();
    command
        .arg("--git-dir")
        .arg(repo_path)
        .args([
            "grep",
            "-n",
            "-I",
            "--full-name",
            "-e",
            query_trimmed,
            &selected_branch,
        ])
        .stdin(Stdio::null())
        .stderr(Stdio::piped())
        .stdout(Stdio::piped());

    let (output, exceeded) = capture_command_output(
        command,
        Duration::from_secs(10),
        Some(10 * 1024 * 1024),
        Some(64 * 1024),
    )
    .map_err(|error| match error {
        CommandCaptureError::Unavailable => VcsError::GitUnavailable,
        CommandCaptureError::TimedOut => VcsError::GitTimedOut,
    })?;

    if exceeded {
        return Err(VcsError::GitFailed(
            "git grep output exceeded configured limit".to_string(),
        ));
    }

    if !output.status.success() {
        let code = output.status.code();
        let stderr = git_error_text(&output);
        if code == Some(1) && stderr.is_empty() {
            return Ok(CodeGrepResult {
                matches: Vec::new(),
                query: query.to_string(),
                selected_branch,
            });
        }
        if stderr.contains("Not a valid object name")
            || stderr.contains("ambiguous argument")
            || stderr.contains("pathspec")
        {
            return Err(VcsError::NotFound);
        }
        return Err(VcsError::GitFailed(stderr));
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let mut matches = Vec::new();
    for line in stdout_str.lines() {
        let parts: Vec<&str> = line.splitn(4, ':').collect();
        if parts.len() >= 4 {
            let path = parts[1].to_string();
            let line_number = parts[2].parse::<u32>().unwrap_or(0);
            let content = parts[3].to_string();
            matches.push(CodeGrepMatchRecord {
                content,
                line_number,
                path,
            });
        }
    }

    Ok(CodeGrepResult {
        matches,
        query: query.to_string(),
        selected_branch,
    })
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
    if !branches.iter().any(|branch| branch.name == selected_branch)
        && !revision_exists(&repo_path, &selected_branch)
    {
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

pub fn read_svn_code_history(
    repo_path: &Path,
    branch: Option<&str>,
    path: &str,
    page: u32,
) -> Result<CodeHistorySnapshot, VcsError> {
    if !repo_path.exists() || !repo_path.is_dir() {
        return Ok(no_head_history_snapshot(page));
    }
    let clean_path = normalize_repo_path(path)?;
    let youngest = svn_youngest_revision(repo_path)?;
    let skip = usize::try_from(page).unwrap_or_default() * HISTORY_ITEM_LIMIT;
    let mut commits = Vec::new();
    for revision in (1..=youngest).rev() {
        if !clean_path.is_empty()
            && !svn_changed_paths(repo_path, revision)?
                .iter()
                .any(|changed| {
                    changed.path == clean_path
                        || changed.path.starts_with(&format!("{clean_path}/"))
                })
        {
            continue;
        }
        let entry = svn_log_entries(repo_path, revision, revision, 1)?
            .pop()
            .ok_or(VcsError::NotFound)?;
        commits.push(CodeCommitRecord {
            author_date: entry.date.trim().to_string(),
            author_email: String::new(),
            author_name: entry.author,
            comment_count: 0,
            commit_id: revision.to_string(),
            commit_short_id: revision.to_string(),
            short_message: first_line(&entry.message).to_string(),
            message: entry.message,
        });
    }
    let commits = commits.into_iter().skip(skip).collect::<Vec<_>>();
    let has_older = commits.len() > HISTORY_ITEM_LIMIT;
    Ok(CodeHistorySnapshot {
        branches: vec![CodeBranchRecord {
            name: "HEAD".to_string(),
        }],
        breadcrumbs: breadcrumbs_for_path(&clean_path),
        commits: commits.into_iter().take(HISTORY_ITEM_LIMIT).collect(),
        has_newer: page > 0,
        has_older,
        no_head: false,
        page,
        path: clean_path,
        selected_branch: branch
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or_default()
            .to_string(),
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

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct GitDiffStat {
    pub files_changed: u32,
    pub insertions: u32,
    pub deletions: u32,
}

pub fn parse_git_diff_stat(output: &str) -> GitDiffStat {
    let mut stat = GitDiffStat::default();
    for line in output.lines().rev() {
        let line = line.trim();
        if line.contains("file changed") || line.contains("files changed") {
            let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
            for part in parts {
                let tokens: Vec<&str> = part.split_whitespace().collect();
                if !tokens.is_empty() {
                    if let Ok(val) = tokens[0].parse::<u32>() {
                        if part.contains("file") {
                            stat.files_changed = val;
                        } else if part.contains("insertion") {
                            stat.insertions = val;
                        } else if part.contains("deletion") {
                            stat.deletions = val;
                        }
                    }
                }
            }
            return stat;
        }
    }
    stat
}

pub fn compute_diff_stat_from_files(files: &[CodeCommitFileDiffRecord]) -> GitDiffStat {
    let mut insertions = 0u32;
    let mut deletions = 0u32;
    for file in files {
        for line in file.patch.lines() {
            if line.starts_with("--- ")
                || line.starts_with("+++ ")
                || line.starts_with("diff --git ")
            {
                continue;
            }
            if line.starts_with('+') {
                insertions += 1;
            } else if line.starts_with('-') {
                deletions += 1;
            }
        }
    }
    GitDiffStat {
        files_changed: files.len() as u32,
        insertions,
        deletions,
    }
}

pub fn git_merge_base(repo_path: &Path, rev_a: &str, rev_b: &str) -> Result<String, VcsError> {
    let rev_a = rev_a.trim();
    let rev_b = rev_b.trim();
    if rev_a.is_empty() || rev_b.is_empty() {
        return Err(VcsError::NotFound);
    }
    if !repo_path.exists() || !has_head(repo_path) {
        return Err(VcsError::NotFound);
    }
    ensure_commit_exists(repo_path, rev_a)?;
    ensure_commit_exists(repo_path, rev_b)?;
    let output = git_output(repo_path, &["merge-base", rev_a, rev_b])?;
    let mb = output.trim().to_string();
    if mb.is_empty() {
        Err(VcsError::NotFound)
    } else {
        Ok(mb)
    }
}

pub fn read_compare_diff(
    repo_path: &Path,
    rev_a: &str,
    rev_b: &str,
) -> Result<CodeCompareSnapshot, VcsError> {
    read_compare_diff_ext(repo_path, rev_a, rev_b, false)
}

pub fn read_compare_diff_ext(
    repo_path: &Path,
    rev_a: &str,
    rev_b: &str,
    three_dot: bool,
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

    let base_ref = if three_dot {
        git_merge_base(repo_path, rev_a, rev_b)?
    } else {
        rev_a.to_string()
    };

    let diff = git_output(
        repo_path,
        &[
            "diff",
            "--find-renames",
            "--patch",
            "--unified=3",
            &base_ref,
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

pub fn read_commit_file_diff(
    repo_path: &Path,
    commit_id: &str,
    filepath: &str,
) -> Result<CodeCommitFileDiffRecord, VcsError> {
    let commit_id = commit_id.trim();
    let clean_path = normalize_repo_path(filepath)?;
    if commit_id.is_empty() || clean_path.is_empty() {
        return Err(VcsError::NotFound);
    }
    if !repo_path.exists() || !has_head(repo_path) {
        return Err(VcsError::NotFound);
    }
    ensure_commit_exists(repo_path, commit_id)?;
    let diff = git_output(
        repo_path,
        &[
            "show",
            "--find-renames",
            "--patch",
            "--unified=3",
            commit_id,
            "--",
            &clean_path,
        ],
    )?;
    let files = parse_commit_diff_files(&diff);
    if let Some(file) = files.into_iter().next() {
        Ok(file)
    } else {
        Ok(CodeCommitFileDiffRecord {
            path: clean_path,
            patch: String::new(),
        })
    }
}

pub fn read_commit_diff_stat(repo_path: &Path, commit_id: &str) -> Result<GitDiffStat, VcsError> {
    let commit_id = commit_id.trim();
    if commit_id.is_empty() || !repo_path.exists() || !has_head(repo_path) {
        return Ok(GitDiffStat::default());
    }
    ensure_commit_exists(repo_path, commit_id)?;
    let output = git_output(repo_path, &["show", "--stat", "--format=", commit_id])?;
    Ok(parse_git_diff_stat(&output))
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

pub fn read_code_tags(repo_path: &Path) -> Result<CodeTagListSnapshot, VcsError> {
    if !repo_path.exists() || !has_head(repo_path) {
        return Ok(CodeTagListSnapshot {
            tags: Vec::new(),
            no_head: true,
        });
    }
    let tags = list_tag_details(repo_path)?;
    Ok(CodeTagListSnapshot {
        tags,
        no_head: false,
    })
}

pub fn create_code_tag(
    repo_path: &Path,
    tag_name: &str,
    target: Option<&str>,
    message: Option<&str>,
) -> Result<CodeTagListSnapshot, VcsError> {
    if !repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let tag_name = normalize_tag_name(tag_name)?;
    let tags = list_tag_details(repo_path)?;
    if tags.iter().any(|t| t.name == tag_name) {
        return Err(VcsError::GitFailed(format!(
            "tag '{tag_name}' already exists"
        )));
    }
    let target_ref = match target.map(str::trim).filter(|v| !v.is_empty()) {
        Some(target) => target.to_string(),
        None => default_branch(repo_path).unwrap_or_else(|| "HEAD".to_string()),
    };

    let msg_str;
    if let Some(msg) = message.map(str::trim).filter(|v| !v.is_empty()) {
        msg_str = msg.to_string();
        git_output(
            repo_path,
            &["tag", "-a", &tag_name, "-m", &msg_str, &target_ref],
        )?;
    } else {
        git_output(repo_path, &["tag", &tag_name, &target_ref])?;
    }
    read_code_tags(repo_path)
}

pub fn delete_code_tag(repo_path: &Path, tag_name: &str) -> Result<CodeTagListSnapshot, VcsError> {
    if !repo_path.exists() {
        return Err(VcsError::NotFound);
    }
    let tag_name = normalize_tag_name(tag_name)?;
    let tags = list_tag_details(repo_path)?;
    if !tags.iter().any(|t| t.name == tag_name) {
        return Err(VcsError::NotFound);
    }

    git_output(repo_path, &["tag", "-d", &tag_name])?;
    read_code_tags(repo_path)
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
    metadata: &PullRequestMergeMetadata<'_>,
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
        &["config", "user.email", metadata.author_email],
    )?;
    git_worktree_output(
        work_dir.path(),
        &["config", "user.name", metadata.author_name],
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
    let subjects = git_worktree_output(
        work_dir.path(),
        &[
            "log",
            "--format=%s",
            &format!("{target_commit_id_before}..{merge_target}"),
        ],
    )?;
    let mut message = format!("Merge branch '{from_branch}'");
    if let Some(source_project) = metadata.source_project {
        message.push_str(" of ");
        message.push_str(source_project);
    }
    if to_branch != "master" {
        message.push_str(" into '");
        message.push_str(&to_branch);
        message.push('\'');
    }
    message.push_str(&format!(
        "\n\nfrom pull-request {}\n\n* {from_branch}:\n",
        metadata.pull_request_number
    ));
    for subject in subjects.lines() {
        message.push_str("  ");
        message.push_str(subject);
        message.push('\n');
    }
    message.push('\n');
    message.push_str(metadata.review_trailers);
    match git_worktree_output(
        work_dir.path(),
        &[
            "merge",
            "--no-ff",
            "--cleanup=verbatim",
            "-m",
            &message,
            &merge_target,
        ],
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
        &["config", "user.email", DEFAULT_GIT_AUTHOR_EMAIL],
    )?;
    git_worktree_output(
        work_dir.path(),
        &["config", "user.name", DEFAULT_GIT_AUTHOR_NAME],
    )?;
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
        &[
            "for-each-ref",
            "--sort=-committerdate",
            "--format=%(refname:short)",
            "refs/heads",
        ],
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
            "--format=%(refname:short)%1f%(objectname)%1f%(objectname:short)%1f%(contents:subject)%1f%(committerdate:iso-strict)",
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
    // Keep Git's timestamp ordering: ISO strings with different offsets are not chronological.
    branches.sort_by_key(|branch| !branch.is_default);
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

fn list_tag_details(repo_path: &Path) -> Result<Vec<CodeTagListItemRecord>, VcsError> {
    let output = git_output(
        repo_path,
        &[
            "for-each-ref",
            "--sort=-creatordate",
            "--format=%(refname:short)%1f%(objectname)%1f%(objectname:short)%1f%(*objectname)%1f%(*objectname:short)%1f%(contents:subject)%1f%(creatordate:short)%1f%(taggername)%1f%(taggeremail)%1f%(authorname)%1f%(authoremail)",
            "refs/tags",
        ],
    )?;
    let tags = output
        .lines()
        .filter_map(|line| {
            let mut parts = line.split('\x1f');
            let name = parts.next()?.trim().to_string();
            if name.is_empty() {
                return None;
            }
            let objectname = parts.next().unwrap_or_default().trim().to_string();
            let objectname_short = parts.next().unwrap_or_default().trim().to_string();
            let deref_objectname = parts.next().unwrap_or_default().trim().to_string();
            let deref_objectname_short = parts.next().unwrap_or_default().trim().to_string();
            let commit_message = parts.next().unwrap_or_default().trim().to_string();
            let created_date = parts.next().unwrap_or_default().trim().to_string();
            let taggername = parts.next().unwrap_or_default().trim().to_string();
            let taggeremail = parts.next().unwrap_or_default().trim().to_string();
            let authorname = parts.next().unwrap_or_default().trim().to_string();
            let authoremail = parts.next().unwrap_or_default().trim().to_string();

            let (commit_id, commit_short_id) = if !deref_objectname.is_empty() {
                (deref_objectname, deref_objectname_short)
            } else {
                (objectname, objectname_short)
            };
            let creator_name = if !taggername.is_empty() {
                taggername
            } else {
                authorname
            };
            let creator_email = if !taggeremail.is_empty() {
                taggeremail
            } else {
                authoremail
            };

            Some(CodeTagListItemRecord {
                short_name: name.clone(),
                name,
                commit_id,
                commit_short_id,
                commit_message,
                creator_name,
                creator_email,
                created_date,
            })
        })
        .collect::<Vec<_>>();
    Ok(tags)
}

fn normalize_tag_name(tag_name: &str) -> Result<String, VcsError> {
    let trimmed = tag_name
        .trim()
        .strip_prefix("refs/tags/")
        .unwrap_or_else(|| tag_name.trim());
    if trimmed.is_empty()
        || trimmed.contains('\0')
        || trimmed.contains(' ')
        || trimmed.contains("..")
    {
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
            "--format=%h%x1f%s%x1f%aI%x1f%an%x1f%ae",
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
            "--format=%H%x1f%h%x1f%s%x1f%aI%x1f%an%x1f%ae",
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
            "--format=%H%x1f%h%x1f%s%x1f%ae%x1f%ad%x1f%at",
            "--date=iso-strict",
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
            "--format=%H%x1f%h%x1f%s%x1f%ae%x1f%ad%x1f%at",
            "--date=iso-strict",
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
            let author_timestamp = parts.next().and_then(|value| value.parse::<i64>().ok());
            Some(PullRequestDiffCommitRecord {
                author_date_label,
                author_email,
                author_timestamp,
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
    let format = "--format=%x1e%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%aI";
    let mut args = vec!["log", format, max_count.as_str(), skip.as_str(), branch];
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
            "--format=%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%aI%x1f%B",
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
    let path_arg = path_arg
        .canonicalize()
        .map_err(|error| VcsError::FilesystemFailed(error.to_string()))?;
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
        let temp_dir = std::env::temp_dir();
        loop {
            let nanos = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|error| VcsError::FilesystemFailed(error.to_string()))?
                .as_nanos();
            let sequence = TEMP_WORK_DIR_SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let path = temp_dir.join(format!(
                "yona-vcs-{label}-{}-{nanos}-{sequence}",
                std::process::id()
            ));
            match std::fs::create_dir(&path) {
                Ok(()) => return Ok(Self { path }),
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(error) => return Err(VcsError::FilesystemFailed(error.to_string())),
            }
        }
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
    fn branch_list_preserves_committer_timestamp_and_chronological_order() {
        let directory = tempdir().expect("branch repository");
        let repo_path = directory.path();
        git_output(repo_path, &["init", "-b", "main"]).expect("init repository");
        git_output(repo_path, &["config", "user.name", "Committer"]).expect("set name");
        git_output(
            repo_path,
            &["config", "user.email", "committer@example.com"],
        )
        .expect("set email");
        let tree = git_output(repo_path, &["mktree"]).expect("empty tree");
        for (branch, date) in [
            ("main", "2026-07-01T03:04:05+09:00"),
            ("earlier", "2026-07-02T12:34:56+09:00"),
            ("later", "2026-07-02T08:34:57+00:00"),
        ] {
            let output = Command::new("git")
                .arg("--git-dir")
                .arg(repo_path)
                .args(["commit-tree", tree.trim(), "-m", branch])
                .env("GIT_AUTHOR_DATE", "2001-01-01T00:00:00+00:00")
                .env("GIT_COMMITTER_DATE", date)
                .output()
                .expect("commit branch");
            assert!(output.status.success(), "{:?}", output);
            let commit = String::from_utf8(output.stdout).expect("commit ID");
            git_output(
                repo_path,
                &["update-ref", &format!("refs/heads/{branch}"), commit.trim()],
            )
            .expect("set branch");
        }

        let snapshot = read_branch_list(repo_path).expect("read branches");
        let dates = snapshot
            .branches
            .iter()
            .map(|branch| (branch.name.as_str(), branch.commit_date.as_str()))
            .collect::<Vec<_>>();
        assert_eq!(
            dates,
            [
                ("main", "2026-07-01T03:04:05+09:00"),
                ("later", "2026-07-02T08:34:57+00:00"),
                ("earlier", "2026-07-02T12:34:56+09:00"),
            ]
        );
        let choices = list_repository_branches(repo_path).expect("read branch choices");
        assert_eq!(
            choices
                .iter()
                .map(|branch| branch.name.as_str())
                .collect::<Vec<_>>(),
            ["later", "earlier", "main"]
        );
    }

    #[test]
    fn svn_file_url_canonicalizes_relative_repo_roots() {
        // Regression: a relative data root (`.yona-data`) produced
        // `file:///.yona-data/repo/1.svn`, which svn resolves against the
        // filesystem root — every DAV write failed with E170013 and the
        // client saw 409/out-of-date. The URL must be absolute.
        let relative = Path::new("target/svn-file-url-test/repo.svn");
        std::fs::create_dir_all(relative.parent().expect("parent"))
            .expect("create relative parent");
        let url = svn_file_url(relative);
        assert!(url.starts_with("file:///"), "unexpected url: {url}");
        assert!(
            !url.starts_with("file:///."),
            "url is relative under the filesystem root: {url}"
        );
        let expected = std::fs::canonicalize(relative.parent().expect("parent"))
            .expect("canonicalize parent")
            .join(relative.file_name().expect("file name"));
        let expected = expected.display().to_string().replace('\\', "/");
        assert_eq!(
            url,
            format!("file:///{}", expected.trim_start_matches('/')),
            "url must resolve to the absolute repo path"
        );
        let _ = std::fs::remove_dir_all("target/svn-file-url-test");
    }

    #[test]
    fn empty_svn_browser_distinguishes_the_root_from_an_explicit_revision() {
        if ensure_svnadmin_available().is_err()
            || Command::new(svn_executable("svnlook"))
                .arg("--version")
                .output()
                .map_or(true, |output| !output.status.success())
        {
            return;
        }
        let data_dir = tempdir().expect("svn browser tempdir");
        let repo_path = data_dir.path().join("empty.svn");
        create_svn_repository(&repo_path).expect("create empty svn repository");

        assert!(
            read_svn_code_browser(&repo_path, None, "")
                .expect("read svn root")
                .no_head
        );
        let explicit = read_svn_code_browser(&repo_path, Some("main"), "")
            .expect("read explicit svn revision");
        assert!(!explicit.no_head);
        assert_eq!(explicit.selected_branch, "main");
        assert_eq!(
            explicit.branches,
            vec![CodeBranchRecord {
                name: "HEAD".into()
            }]
        );
        assert!(explicit.entries.is_empty());
    }

    #[test]
    fn empty_svn_history_is_an_empty_history_screen() {
        if ensure_svnadmin_available().is_err()
            || Command::new(svn_executable("svnlook"))
                .arg("--version")
                .output()
                .map_or(true, |output| !output.status.success())
        {
            return;
        }
        let data_dir = tempdir().expect("svn history tempdir");
        let repo_path = data_dir.path().join("empty.svn");
        create_svn_repository(&repo_path).expect("create empty svn repository");

        let history =
            read_svn_code_history(&repo_path, None, "", 0).expect("read empty svn history");
        assert!(!history.no_head);
        assert_eq!(history.selected_branch, "");
        assert_eq!(
            history.branches,
            vec![CodeBranchRecord {
                name: "HEAD".into()
            }]
        );
        assert!(history.commits.is_empty());
    }

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

    #[test]
    fn git_tags_crud_operations_work_correctly() {
        let data_dir = tempdir().expect("tags tempdir");
        let repo_path = data_dir.path().join("tags.git");
        create_bare_repository(&repo_path).expect("create bare repository");
        let commit_id = commit_text_file(
            &repo_path,
            None,
            "README.md",
            "tag test file\n",
            "Initial commit for tag test",
            "Tester Name",
            "tester@example.com",
        )
        .expect("commit test file")
        .expect("commit id");

        let initial_tags = read_code_tags(&repo_path).expect("read empty tags");
        assert!(!initial_tags.no_head);
        assert!(initial_tags.tags.is_empty());

        let created_snapshot =
            create_code_tag(&repo_path, "v1.0.0", Some("HEAD"), Some("Release v1.0.0"))
                .expect("create tag");
        assert_eq!(created_snapshot.tags.len(), 1);
        assert_eq!(created_snapshot.tags[0].name, "v1.0.0");
        assert_eq!(created_snapshot.tags[0].commit_id, commit_id);
        assert_eq!(created_snapshot.tags[0].commit_message, "Release v1.0.0");

        let deleted_snapshot = delete_code_tag(&repo_path, "v1.0.0").expect("delete tag");
        assert!(deleted_snapshot.tags.is_empty());
    }

    #[test]
    fn find_and_grep_code_files_search_repository() {
        let data_dir = tempdir().expect("find grep tempdir");
        let repo_path = data_dir.path().join("search.git");
        create_bare_repository(&repo_path).expect("create bare repository");
        commit_text_file(
            &repo_path,
            None,
            "src/main.rs",
            "fn main() {\n    println!(\"Hello World\");\n}\n",
            "Initial commit",
            "Tester",
            "tester@example.com",
        )
        .expect("commit main.rs");
        commit_text_file(
            &repo_path,
            None,
            "README.md",
            "# Sample Project\nHello World documentation.\n",
            "Add README",
            "Tester",
            "tester@example.com",
        )
        .expect("commit README.md");

        let find_all = find_code_files(&repo_path, "master", None)
            .or_else(|_| find_code_files(&repo_path, "main", None))
            .expect("find code files all");
        assert_eq!(find_all.paths.len(), 2);
        assert!(find_all.paths.contains(&"src/main.rs".to_string()));
        assert!(find_all.paths.contains(&"README.md".to_string()));

        let find_filtered = find_code_files(&repo_path, &find_all.selected_branch, Some("main"))
            .expect("find code files filtered");
        assert_eq!(find_filtered.paths, vec!["src/main.rs".to_string()]);

        let grep_results = grep_code_files(&repo_path, &find_all.selected_branch, "println")
            .expect("grep code files");
        assert_eq!(grep_results.matches.len(), 1);
        assert_eq!(grep_results.matches[0].path, "src/main.rs");
        assert_eq!(grep_results.matches[0].line_number, 2);
        assert!(grep_results.matches[0].content.contains("println!"));

        let grep_empty =
            grep_code_files(&repo_path, &find_all.selected_branch, "nonexistent_keyword")
                .expect("grep code files empty");
        assert!(grep_empty.matches.is_empty());
    }
}

#[cfg(test)]
mod git_backend_relative_root_tests {
    use super::*;
    use tempfile::tempdir;

    /// git-http-backend re-resolves a relative GIT_PROJECT_ROOT against its
    /// own cwd (the repo root), so a relative data root double-paths and 404s.
    /// `run_git_http_backend` must canonicalize the root before spawning.
    #[test]
    fn run_git_http_backend_accepts_relative_repo_root() {
        let data_dir = tempdir().expect("git backend tempdir");
        let repo_dir = data_dir.path().join("repo/1.git");
        std::fs::create_dir_all(repo_dir.parent().expect("repo parent"))
            .expect("create repo parent");
        let output = Command::new("git")
            .args(["init", "--bare"])
            .arg(&repo_dir)
            .output()
            .expect("git init");
        assert!(output.status.success());

        let cwd = std::env::current_dir().expect("current dir");
        let relative_root = relative_path_from(&cwd, &repo_dir.parent().expect("repo parent"));
        let response = run_git_http_backend(GitHttpBackendRequest {
            body: &[],
            content_type: Some("application/x-git-upload-pack-request"),
            git_protocol: None,
            method: "GET",
            path_info: "/1.git/info/refs",
            query_string: "service=git-upload-pack",
            remote_addr: "127.0.0.1",
            remote_user: None,
            repo_root: &relative_root,
        })
        .expect("backend response");

        assert_eq!(response.status, 200);
        assert!(
            String::from_utf8_lossy(&response.body).contains("service=git-upload-pack"),
            "got advertisement: {:?}",
            String::from_utf8_lossy(&response.body)
                .chars()
                .take(80)
                .collect::<String>()
        );
    }

    /// Hand-rolled pathdiff: a relative path from `base` to `target`.
    fn relative_path_from(base: &std::path::Path, target: &std::path::Path) -> std::path::PathBuf {
        let base_parts: Vec<&std::ffi::OsStr> = base.components().map(|c| c.as_os_str()).collect();
        let target_parts: Vec<&std::ffi::OsStr> =
            target.components().map(|c| c.as_os_str()).collect();
        let mut common = 0;
        while common < base_parts.len()
            && common < target_parts.len()
            && base_parts[common] == target_parts[common]
        {
            common += 1;
        }
        let mut result = std::path::PathBuf::new();
        for _ in common..base_parts.len() {
            result.push("..");
        }
        for part in &target_parts[common..] {
            result.push(part);
        }
        result
    }
}
