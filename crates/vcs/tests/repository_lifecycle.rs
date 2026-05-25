use std::process::Command;

use tempfile::tempdir;
use yona_rust_vcs::{
    create_svn_repository, delete_repository, ensure_svnadmin_available, repository_path,
    repository_path_for_vcs, svn_repository_path, svn_repository_uuid, svn_youngest_revision,
    VcsError,
};

fn svnadmin_available() -> bool {
    Command::new("svnadmin")
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
}

fn svnlook_available() -> bool {
    Command::new("svnlook")
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
}

#[test]
fn repository_paths_preserve_git_and_svn_storage_suffixes() {
    let data_root = tempdir().expect("tempdir");

    assert_eq!(
        repository_path(&data_root.path(), 7),
        data_root.path().join("repo").join("7.git")
    );
    assert_eq!(
        svn_repository_path(&data_root.path(), 7),
        data_root.path().join("repo").join("7.svn")
    );
    assert_eq!(
        repository_path_for_vcs(data_root.path(), 7, "GIT"),
        repository_path(data_root.path(), 7)
    );
    assert_eq!(
        repository_path_for_vcs(data_root.path(), 7, "Subversion"),
        svn_repository_path(data_root.path(), 7)
    );
}

#[test]
fn delete_repository_accepts_svn_repository_storage() {
    let data_root = tempdir().expect("tempdir");
    let repo_path = svn_repository_path(data_root.path(), 9);
    std::fs::create_dir_all(&repo_path).expect("seed svn storage");

    delete_repository(&repo_path).expect("delete svn storage");

    assert!(!repo_path.exists());
}

#[test]
fn create_svn_repository_uses_svnadmin_when_available() {
    let data_root = tempdir().expect("tempdir");
    let repo_path = svn_repository_path(data_root.path(), 11);

    if !svnadmin_available() {
        assert!(matches!(
            ensure_svnadmin_available(),
            Err(VcsError::SvnAdminUnavailable)
        ));
        assert!(matches!(
            create_svn_repository(&repo_path),
            Err(VcsError::SvnAdminUnavailable)
        ));
        return;
    }

    create_svn_repository(&repo_path).expect("create svn repository");

    assert!(repo_path.join("format").exists());
    assert!(repo_path.join("db").is_dir());
}

#[test]
fn svn_youngest_revision_uses_svnlook_when_available() {
    if !svnadmin_available() || !svnlook_available() {
        return;
    }

    let data_root = tempdir().expect("tempdir");
    let repo_path = svn_repository_path(data_root.path(), 12);

    create_svn_repository(&repo_path).expect("create svn repository");

    assert_eq!(
        svn_youngest_revision(&repo_path).expect("read youngest revision"),
        0
    );
}

#[test]
fn svn_repository_uuid_uses_svnlook_when_available() {
    if !svnadmin_available() || !svnlook_available() {
        return;
    }

    let data_root = tempdir().expect("tempdir");
    let repo_path = svn_repository_path(data_root.path(), 13);

    create_svn_repository(&repo_path).expect("create svn repository");

    let uuid = svn_repository_uuid(&repo_path).expect("read repository uuid");
    assert_eq!(uuid.len(), 36);
    assert!(uuid.chars().all(|ch| ch.is_ascii_hexdigit() || ch == '-'));
}
