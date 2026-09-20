use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use yoram_vcs::{
    merge_pull_request, read_pull_request_diff, read_pull_request_diff_between_revisions,
    PullRequestMergeMetadata,
};

fn temp_repo_path(label: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before unix epoch")
        .as_nanos();
    std::env::temp_dir().join(format!(
        "yona-vcs-{label}-{}-{nanos}.git",
        std::process::id()
    ))
}

fn run_git(repo_path: &PathBuf, args: &[&str]) {
    let status = Command::new("git")
        .arg("-C")
        .arg(repo_path)
        .args(args)
        .status()
        .expect("run git");
    assert!(status.success(), "git {:?} failed", args);
}

fn write_repo_file(repo_path: &PathBuf, relative_path: &str, contents: &str) {
    let path = repo_path.join(relative_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, contents).unwrap();
}

fn clone_bare(work_path: &PathBuf, repo_path: &PathBuf) {
    let status = Command::new("git")
        .args(["clone", "--bare"])
        .arg(work_path)
        .arg(repo_path)
        .status()
        .expect("clone bare repository");
    assert!(status.success(), "git clone --bare failed");
}

fn git_output(repo_path: &PathBuf, args: &[&str]) -> String {
    let output = Command::new("git")
        .arg("-C")
        .arg(repo_path)
        .args(args)
        .output()
        .expect("run git output");
    assert!(output.status.success(), "git {:?} failed", args);
    String::from_utf8(output.stdout).unwrap().trim().to_string()
}

#[test]
fn repo_pull_request_diff_returns_empty_snapshot_when_repository_is_missing() {
    let repo_path = temp_repo_path("missing");

    let snapshot = read_pull_request_diff(&repo_path, "feature", "main").unwrap();

    assert!(snapshot.no_head);
    assert!(snapshot.commits.is_empty());
    assert!(snapshot.files.is_empty());
}

#[test]
fn repo_pull_request_diff_returns_empty_snapshot_when_head_is_missing() {
    let repo_path = temp_repo_path("no-head");
    let init_status = Command::new("git")
        .args(["init", "--bare"])
        .arg(&repo_path)
        .status();
    if !matches!(init_status, Ok(status) if status.success()) {
        eprintln!("skipping no-head git repository assertion because git init failed");
        return;
    }

    let snapshot = read_pull_request_diff(&repo_path, "feature", "main").unwrap();

    assert!(snapshot.no_head);
    assert!(snapshot.commits.is_empty());
    assert!(snapshot.files.is_empty());

    fs::remove_dir_all(&repo_path).unwrap();
}

#[test]
fn repo_pull_request_diff_returns_empty_snapshot_when_branch_ref_is_missing() {
    let repo_path = temp_repo_path("missing-branch");
    let work_path = temp_repo_path("missing-branch-work");
    fs::create_dir_all(&work_path).unwrap();
    run_git(&work_path, &["init", "-b", "main"]);
    run_git(&work_path, &["config", "user.email", "test@example.com"]);
    run_git(&work_path, &["config", "user.name", "Test User"]);
    write_repo_file(&work_path, "README.md", "hello\n");
    run_git(&work_path, &["add", "README.md"]);
    run_git(&work_path, &["commit", "-m", "initial"]);
    clone_bare(&work_path, &repo_path);

    let snapshot = read_pull_request_diff(&repo_path, "deleted-topic", "main").unwrap();

    assert!(snapshot.no_head);
    assert!(snapshot.commits.is_empty());
    assert!(snapshot.files.is_empty());

    fs::remove_dir_all(&work_path).unwrap();
    fs::remove_dir_all(&repo_path).unwrap();
}

#[test]
fn repo_pull_request_diff_keeps_deleted_file_path() {
    let repo_path = temp_repo_path("deleted-file");
    let work_path = temp_repo_path("deleted-file-work");
    fs::create_dir_all(&work_path).unwrap();
    run_git(&work_path, &["init", "-b", "main"]);
    run_git(&work_path, &["config", "user.email", "test@example.com"]);
    run_git(&work_path, &["config", "user.name", "Test User"]);
    write_repo_file(&work_path, "src/remove_me.rs", "pub fn remove_me() {}\n");
    run_git(&work_path, &["add", "src/remove_me.rs"]);
    run_git(&work_path, &["commit", "-m", "initial"]);
    run_git(&work_path, &["checkout", "-b", "topic/delete-file"]);
    fs::remove_file(work_path.join("src/remove_me.rs")).unwrap();
    run_git(&work_path, &["add", "src/remove_me.rs"]);
    run_git(&work_path, &["commit", "-m", "delete file"]);
    clone_bare(&work_path, &repo_path);

    let snapshot = read_pull_request_diff(&repo_path, "topic/delete-file", "main").unwrap();

    assert!(!snapshot.no_head);
    assert_eq!(snapshot.files.len(), 1);
    assert_eq!(snapshot.files[0].path, "src/remove_me.rs");
    assert!(snapshot.files[0].patch.contains("+++ /dev/null"));

    fs::remove_dir_all(&work_path).unwrap();
    fs::remove_dir_all(&repo_path).unwrap();
}

#[test]
fn repo_pull_request_diff_reads_stored_revision_pair() {
    let repo_path = temp_repo_path("revision-pair");
    let work_path = temp_repo_path("revision-pair-work");
    fs::create_dir_all(&work_path).unwrap();
    run_git(&work_path, &["init", "-b", "main"]);
    run_git(&work_path, &["config", "user.email", "test@example.com"]);
    run_git(&work_path, &["config", "user.name", "Test User"]);
    write_repo_file(&work_path, "src/lib.rs", "pub fn value() -> i32 { 1 }\n");
    run_git(&work_path, &["add", "src/lib.rs"]);
    run_git(&work_path, &["commit", "-m", "initial"]);
    let base_revision = git_output(&work_path, &["rev-parse", "HEAD"]);
    write_repo_file(&work_path, "src/lib.rs", "pub fn value() -> i32 { 2 }\n");
    run_git(&work_path, &["add", "src/lib.rs"]);
    run_git(&work_path, &["commit", "-m", "update value"]);
    let head_revision = git_output(&work_path, &["rev-parse", "HEAD"]);
    clone_bare(&work_path, &repo_path);

    let snapshot =
        read_pull_request_diff_between_revisions(&repo_path, &base_revision, &head_revision)
            .unwrap();

    assert!(!snapshot.no_head);
    assert_eq!(snapshot.commits.len(), 1);
    assert_eq!(snapshot.commits[0].commit_message, "update value");
    assert_eq!(snapshot.files.len(), 1);
    assert_eq!(snapshot.files[0].path, "src/lib.rs");
    assert!(snapshot.files[0]
        .patch
        .contains("pub fn value() -> i32 { 2 }"));

    fs::remove_dir_all(&work_path).unwrap();
    fs::remove_dir_all(&repo_path).unwrap();
}

#[test]
fn pull_request_merge_records_fork_and_master_message_with_ordered_parents() {
    let source_path = temp_repo_path("merge-source");
    let target_path = temp_repo_path("merge-target");
    let work_path = temp_repo_path("merge-work");
    fs::create_dir_all(&work_path).unwrap();
    run_git(&work_path, &["init", "-b", "master"]);
    run_git(
        &work_path,
        &["config", "user.email", "contributor@example.com"],
    );
    run_git(&work_path, &["config", "user.name", "Contributor"]);
    write_repo_file(&work_path, "README.md", "base\n");
    run_git(&work_path, &["add", "README.md"]);
    run_git(&work_path, &["commit", "-m", "base"]);
    let target_parent = git_output(&work_path, &["rev-parse", "HEAD"]);
    clone_bare(&work_path, &target_path);
    run_git(&work_path, &["checkout", "-b", "topic"]);
    write_repo_file(&work_path, "README.md", "first change\n");
    run_git(&work_path, &["commit", "-am", "first change"]);
    write_repo_file(&work_path, "README.md", "second change\n");
    run_git(&work_path, &["commit", "-am", "second change"]);
    let source_parent = git_output(&work_path, &["rev-parse", "HEAD"]);
    clone_bare(&work_path, &source_path);

    let merged = merge_pull_request(
        &source_path,
        &target_path,
        "refs/heads/topic",
        "refs/heads/master",
        &PullRequestMergeMetadata {
            author_name: "Maintainer",
            author_email: "maintainer@example.com",
            pull_request_number: 17,
            source_project: Some("contributor/fork"),
            review_trailers: "",
        },
    )
    .unwrap();

    assert!(!merged.conflict);
    assert_eq!(
        git_output(&target_path, &["show", "-s", "--format=%P", "master"]),
        format!("{target_parent} {source_parent}")
    );
    assert_eq!(
        git_output(&target_path, &["show", "-s", "--format=%B", "master"]),
        "Merge branch 'topic' of contributor/fork\n\nfrom pull-request 17\n\n* topic:\n  second change\n  first change"
    );
    assert_eq!(
        git_output(&target_path, &["show", "master:README.md"]),
        "second change"
    );
    assert_eq!(
        git_output(&source_path, &["rev-parse", "topic"]),
        source_parent
    );

    fs::remove_dir_all(&work_path).unwrap();
    fs::remove_dir_all(&source_path).unwrap();
    fs::remove_dir_all(&target_path).unwrap();
}
