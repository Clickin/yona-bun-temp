use std::process::Command;

use tempfile::tempdir;
use yoram_vcs::{
    create_svn_repository, delete_repository, ensure_svnadmin_available, repository_path,
    repository_path_for_vcs, svn_executable, svn_path_last_changed_revision, svn_repository_path,
    svn_repository_uuid, svn_youngest_revision, VcsError,
};

fn svnadmin_available() -> bool {
    Command::new(svn_executable("svnadmin"))
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
}

fn svnlook_available() -> bool {
    Command::new(svn_executable("svnlook"))
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
}

fn svn_client_available() -> bool {
    Command::new(svn_executable("svn"))
        .arg("--version")
        .output()
        .is_ok_and(|output| output.status.success())
}

fn file_url(path: &std::path::Path) -> String {
    format!("file:///{}", path.display().to_string().replace('\\', "/"))
}

#[test]
fn repository_paths_preserve_git_and_svn_storage_suffixes() {
    let data_root = tempdir().expect("tempdir");

    assert_eq!(
        repository_path(&data_root.path(), "owner", "project").expect("git path"),
        data_root
            .path()
            .join("repo")
            .join("git")
            .join("owner")
            .join("project.git")
    );
    assert_eq!(
        svn_repository_path(&data_root.path(), "owner", "project").expect("svn path"),
        data_root
            .path()
            .join("repo")
            .join("svn")
            .join("owner")
            .join("project")
    );
    assert_eq!(
        repository_path_for_vcs(data_root.path(), "GIT", "owner", "project").expect("vcs git path"),
        repository_path(data_root.path(), "owner", "project").expect("git path")
    );
    assert_eq!(
        repository_path_for_vcs(data_root.path(), "Subversion", "owner", "project")
            .expect("vcs svn path"),
        svn_repository_path(data_root.path(), "owner", "project").expect("svn path")
    );
}

#[test]
fn repository_paths_allow_valid_yona_names() {
    let data_root = tempdir().expect("tempdir");

    // Leading dots and `.git` are valid Yona project names; the generic
    // path-safety layer must NOT reject them (domain validation owns that).
    repository_path(&data_root.path(), "owner", ".hidden-project").expect("leading dot");
    repository_path(&data_root.path(), "owner", "sample.git").expect("dot-git suffix");
    svn_repository_path(&data_root.path(), "Owner", "Project").expect("case preserved");
}

#[test]
fn repository_paths_reject_unsafe_components() {
    let data_root = tempdir().expect("tempdir");

    for owner in ["", ".", "..", "a/b", r"a\b", "a\0b"] {
        assert!(
            repository_path(&data_root.path(), owner, "project").is_err(),
            "owner {owner:?} must be rejected"
        );
        assert!(
            svn_repository_path(&data_root.path(), owner, "project").is_err(),
            "owner {owner:?} must be rejected"
        );
    }
    for project in ["", ".", "..", "a/b", r"a\b", "a\0b"] {
        assert!(
            repository_path(&data_root.path(), "owner", project).is_err(),
            "project {project:?} must be rejected"
        );
        assert!(
            svn_repository_path(&data_root.path(), "owner", project).is_err(),
            "project {project:?} must be rejected"
        );
    }
}

#[test]
fn delete_repository_accepts_svn_repository_storage() {
    let data_root = tempdir().expect("tempdir");
    let repo_path = svn_repository_path(data_root.path(), "owner", "project").expect("svn path");
    std::fs::create_dir_all(&repo_path).expect("seed svn storage");

    delete_repository(&repo_path).expect("delete svn storage");

    assert!(!repo_path.exists());
}

#[test]
fn create_svn_repository_uses_svnadmin_when_available() {
    let data_root = tempdir().expect("tempdir");
    let repo_path = svn_repository_path(data_root.path(), "owner", "project").expect("svn path");

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
    let repo_path = svn_repository_path(data_root.path(), "owner", "project").expect("svn path");

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
    let repo_path = svn_repository_path(data_root.path(), "owner", "project").expect("svn path");

    create_svn_repository(&repo_path).expect("create svn repository");

    let uuid = svn_repository_uuid(&repo_path).expect("read repository uuid");
    assert_eq!(uuid.len(), 36);
    assert!(uuid.chars().all(|ch| ch.is_ascii_hexdigit() || ch == '-'));
}

#[test]
fn svn_path_last_changed_revision_preserves_path_specific_metadata() {
    if !svnadmin_available() || !svnlook_available() || !svn_client_available() {
        return;
    }

    let data_root = tempdir().expect("tempdir");
    let repo_path = svn_repository_path(data_root.path(), "owner", "project").expect("svn path");
    create_svn_repository(&repo_path).expect("create svn repository");

    let import_dir = tempdir().expect("svn import tempdir");
    let trunk_dir = import_dir.path().join("trunk");
    std::fs::create_dir_all(&trunk_dir).expect("create svn trunk");
    std::fs::write(trunk_dir.join("README.md"), "readme one\n").expect("write readme");
    std::fs::write(trunk_dir.join("notes.txt"), "notes one\n").expect("write notes");
    let output = Command::new(svn_executable("svn"))
        .args(["import", "-m", "seed svn files"])
        .arg(import_dir.path())
        .arg(file_url(&repo_path))
        .output()
        .expect("run svn import");
    assert!(
        output.status.success(),
        "svn import should seed executable-backed repository: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let readme_revision = svn_youngest_revision(&repo_path).expect("read readme revision");

    let checkout_dir = tempdir().expect("svn checkout tempdir");
    let output = Command::new(svn_executable("svn"))
        .arg("checkout")
        .arg(file_url(&repo_path))
        .arg(checkout_dir.path())
        .output()
        .expect("run svn checkout");
    assert!(
        output.status.success(),
        "svn checkout should prepare metadata fixture: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    std::fs::write(
        checkout_dir.path().join("trunk").join("notes.txt"),
        "notes two\n",
    )
    .expect("update notes");
    let output = Command::new(svn_executable("svn"))
        .args(["commit", "-m", "update unrelated notes"])
        .arg(checkout_dir.path())
        .output()
        .expect("run svn commit");
    assert!(
        output.status.success(),
        "svn commit should persist unrelated metadata fixture: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let youngest_revision = svn_youngest_revision(&repo_path).expect("read youngest revision");
    assert!(
        youngest_revision > readme_revision,
        "fixture should create a newer repository revision than README.md"
    );

    assert_eq!(
        svn_path_last_changed_revision(&repo_path, Some(youngest_revision), "trunk/README.md")
            .expect("read README.md path revision"),
        readme_revision
    );
    assert_eq!(
        svn_path_last_changed_revision(&repo_path, Some(youngest_revision), "trunk/notes.txt")
            .expect("read notes.txt path revision"),
        youngest_revision
    );
}
