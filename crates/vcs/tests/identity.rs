use std::process::Command;

use tempfile::tempdir;
use yoram_vcs::{commit_text_file, create_bare_repository};

#[test]
fn empty_git_author_uses_yoram_identity() {
    let data_dir = tempdir().expect("git author tempdir");
    let repo_path = data_dir.path().join("author.git");
    create_bare_repository(&repo_path).expect("create bare repository");
    commit_text_file(
        &repo_path,
        None,
        "README.md",
        "Yoram\n",
        "Seed Yoram identity",
        "",
        "",
    )
    .expect("commit with default author");

    let output = Command::new("git")
        .args(["--git-dir"])
        .arg(&repo_path)
        .args(["log", "-1", "--format=%an <%ae>"])
        .output()
        .expect("read default author");
    assert!(output.status.success());
    assert_eq!(
        String::from_utf8(output.stdout)
            .expect("utf-8 git author")
            .trim(),
        "Yoram <yoram@example.invalid>"
    );
}
