use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::Command;
use std::time::{Duration, Instant};

use tempfile::tempdir;
use yoram_vcs::{run_git_http_backend, GitHttpBackendRequest};

fn run_git(cwd: &Path, args: &[&str]) -> String {
    let output = Command::new("git")
        .current_dir(cwd)
        .args(args)
        .output()
        .expect("run git");
    assert!(
        output.status.success(),
        "git {args:?} failed\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout)
        .expect("git output should be utf-8")
        .trim()
        .to_string()
}

fn run_git_bytes(cwd: &Path, args: &[&str], input: &[u8]) -> Vec<u8> {
    let mut child = Command::new("git")
        .current_dir(cwd)
        .args(args)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .expect("spawn git");
    child
        .stdin
        .take()
        .expect("git stdin")
        .write_all(input)
        .expect("write git stdin");
    let output = child.wait_with_output().expect("wait for git");
    assert!(
        output.status.success(),
        "git {args:?} failed\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    output.stdout
}

fn pktline(payload: &[u8]) -> Vec<u8> {
    let mut line = format!("{:04x}", payload.len() + 4).into_bytes();
    line.extend_from_slice(payload);
    line
}

#[test]
fn smart_http_upload_pack_drains_large_backend_response() {
    let root = tempdir().expect("git backend tempdir");
    let work = root.path().join("work");
    fs::create_dir(&work).expect("create git worktree");

    run_git(&work, &["init", "-q"]);
    run_git(&work, &["config", "user.name", "repro"]);
    run_git(&work, &["config", "user.email", "repro@example.invalid"]);

    let mut contents = vec![0_u8; 1024 * 1024];
    let mut state = 0x1234_5678_u32;
    for byte in &mut contents {
        state = state.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        *byte = (state >> 24) as u8;
    }
    fs::write(work.join("data.bin"), contents).expect("write large git blob");
    run_git(&work, &["add", "data.bin"]);
    run_git(&work, &["commit", "-q", "-m", "large pack repro"]);
    let oid = run_git(&work, &["rev-parse", "HEAD"]);
    run_git(
        root.path(),
        &["clone", "-q", "--bare", "work", "sample.git"],
    );

    let mut body = pktline(format!("want {oid}\n").as_bytes());
    body.extend_from_slice(b"0000");
    body.extend_from_slice(&pktline(b"done\n"));
    let response = run_git_http_backend(GitHttpBackendRequest {
        body: &body,
        content_type: Some("application/x-git-upload-pack-request"),
        git_protocol: None,
        method: "POST",
        path_info: "/sample.git/git-upload-pack",
        query_string: "",
        remote_addr: "127.0.0.1",
        remote_user: None,
        repo_root: root.path(),
    })
    .expect("large upload-pack response should complete");

    assert_eq!(response.status, 200);
    assert!(
        response.body.len() > 512 * 1024,
        "large upload-pack response must be fully drained, got {} bytes",
        response.body.len()
    );
}

#[test]
fn smart_http_timeout_kills_backend_descendants() {
    let root = tempdir().expect("git timeout tempdir");
    let work = root.path().join("work");
    let bare = root.path().join("sleeping.git");
    fs::create_dir(&work).expect("create git worktree");
    run_git(&work, &["init", "-q"]);
    run_git(&work, &["config", "user.name", "repro"]);
    run_git(&work, &["config", "user.email", "repro@example.invalid"]);
    fs::write(work.join("README.md"), "timeout repro\n").expect("write timeout README");
    run_git(&work, &["add", "README.md"]);
    run_git(&work, &["commit", "-q", "-m", "timeout repro"]);
    let oid = run_git(&work, &["rev-parse", "HEAD"]);
    run_git(root.path(), &["init", "--bare", bare.to_str().unwrap()]);

    let marker = root.path().join("descendant-marker");
    let hook = bare.join("hooks").join("pre-receive");
    let marker_path = marker.to_string_lossy().replace('\'', "'\\''");
    fs::write(
        &hook,
        format!(
            "#!/bin/sh\n(sleep 31; printf descendant-survived > '{marker_path}') &\nsleep 31\n"
        ),
    )
    .expect("write sleeping pre-receive hook");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut permissions = fs::metadata(&hook).expect("hook metadata").permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&hook, permissions).expect("make hook executable");
    }

    let zero = "0".repeat(40);
    let update = format!("{zero} {oid} refs/heads/main\0report-status\n");
    let mut body = pktline(update.as_bytes());
    body.extend_from_slice(b"0000");
    body.extend_from_slice(&run_git_bytes(
        &work,
        &["pack-objects", "--stdout", "--revs"],
        format!("{oid}\n").as_bytes(),
    ));
    let started = Instant::now();
    let result = run_git_http_backend(GitHttpBackendRequest {
        body: &body,
        content_type: Some("application/x-git-receive-pack-request"),
        git_protocol: None,
        method: "POST",
        path_info: "/sleeping.git/git-receive-pack",
        query_string: "",
        remote_addr: "127.0.0.1",
        remote_user: Some("repro"),
        repo_root: root.path(),
    });
    assert!(matches!(result, Err(yoram_vcs::VcsError::GitTimedOut)));
    assert!(
        started.elapsed() < Duration::from_secs(35),
        "backend timeout must be bounded"
    );
    std::thread::sleep(Duration::from_secs(2));
    assert!(
        !marker.exists(),
        "timed-out Git backend descendants must be terminated"
    );
}
