//! Standalone Phase 6 in-place preflight:
//! `yona-migrate preflight --db-url mysql://... --data-root /path/YONA_DATA [--strict]`
//!
//! Validates that a legacy Yona MariaDB + YONA_DATA pair is safe to point
//! Yoram at, with explicit severities (plan Phase 6 item 2):
//! - BLOCKING: expected repository missing/invalid; interrupted repo/.staging/*;
//!   filesystem state prevents safe owner/project resolution; broken evolution history.
//! - ERROR: active project has BOTH canonical Git and SVN repositories.
//! - WARNING (default non-blocking): orphan filesystem repositories (escalated to
//!   errors under --strict); attachment/avatar rows whose uploads/{hash} file is
//!   missing or size-mismatched; malformed password-hash shapes.
//!
//! Exit code: 0 iff no BLOCKING/ERROR findings (WARNINGs printed but non-blocking);
//! 1 otherwise.

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context as _, Result};
use sea_orm::{ConnectionTrait, Database, Statement};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Severity {
    Warning,
    Error,
    Blocking,
}

impl Severity {
    fn label(self) -> &'static str {
        match self {
            Severity::Warning => "WARNING",
            Severity::Error => "ERROR",
            Severity::Blocking => "BLOCKING ERROR",
        }
    }
}

struct Finding {
    severity: Severity,
    message: String,
}

/// Runs the full preflight. Returns Ok(()) when the exit-code contract allows
/// startup (no BLOCKING/ERROR findings after optional --strict promotion),
/// Err otherwise. Findings are always printed.
pub async fn run(db_url: &str, data_root: &Path, strict: bool) -> Result<()> {
    let mut findings: Vec<Finding> = Vec::new();
    let mut notes: Vec<String> = Vec::new();

    eprintln!("Preflight: connecting to {db_url} ...");
    let db = Database::connect(db_url)
        .await
        .with_context(|| format!("cannot connect to {db_url}"))?;

    // --- schema manifest validation -------------------------------------
    if let Err(error) = yoram_migration::validate_schema_against_manifest(&db).await {
        findings.push(Finding {
            severity: Severity::Blocking,
            message: format!("schema does not match legacy manifest: {error}"),
        });
    } else {
        notes.push("schema matches legacy manifest".to_string());
    }

    // --- evolution / migration history ----------------------------------
    check_evolution_history(&db, &mut findings, &mut notes).await;

    // --- per-project repository checks (both directions) -----------------
    let projects = query_projects(&db).await?;
    let expected_pairs: BTreeSet<(String, String)> = projects
        .iter()
        .map(|(owner, name, _)| (owner.clone(), name.clone()))
        .collect();
    for (owner, name, vcs) in &projects {
        check_project_repositories(data_root, owner, name, vcs, &mut findings);
    }
    if projects.is_empty() {
        notes.push("no project rows found".to_string());
    }

    // --- interrupted staging operations ----------------------------------
    check_staging(data_root, &mut findings);

    // --- orphan filesystem repositories (FS -> DB direction) -------------
    scan_orphans(data_root, &expected_pairs, strict, &mut findings);

    // --- attachments / avatars -------------------------------------------
    check_attachments(&db, data_root, &mut findings).await;

    // --- password hash sanity --------------------------------------------
    check_password_hashes(&db, &mut findings).await;

    // --- report -----------------------------------------------------------
    for note in &notes {
        eprintln!("preflight: ok — {note}");
    }
    // Highest severity first so the operator sees blocking problems first.
    findings.sort_by_key(|finding| std::cmp::Reverse(finding.severity));
    for finding in &findings {
        eprintln!("[{}] {}", finding.severity.label(), finding.message);
    }
    let mut warnings = 0usize;
    let mut errors = 0usize;
    let mut blockings = 0usize;
    for finding in &findings {
        match finding.severity {
            Severity::Warning => warnings += 1,
            Severity::Error => errors += 1,
            Severity::Blocking => blockings += 1,
        }
    }
    eprintln!(
        "preflight summary: {} blocking, {} error(s), {} warning(s){}",
        blockings,
        errors,
        warnings,
        if strict { " (--strict)" } else { "" }
    );

    if blockings > 0 || errors > 0 {
        anyhow::bail!(
            "preflight found {} blocking and {} error finding(s)",
            blockings,
            errors
        );
    }
    Ok(())
}

type ProjectRow = (String, String, String);

async fn query_projects(db: &sea_orm::DatabaseConnection) -> Result<Vec<ProjectRow>> {
    let backend = db.get_database_backend();
    let rows = db
        .query_all(Statement::from_string(
            backend,
            "select coalesce(owner,'') owner, coalesce(name,'') name, \
             coalesce(vcs,'GIT') vcs from project order by id",
        ))
        .await
        .context("reading project rows")?;
    Ok(rows
        .into_iter()
        .filter_map(|row| {
            let owner: String = row.try_get_by_index(0).ok()?;
            let name: String = row.try_get_by_index(1).ok()?;
            let vcs: String = row.try_get_by_index(2).ok()?;
            if owner.is_empty() || name.is_empty() {
                None
            } else {
                Some((owner, name, vcs))
            }
        })
        .collect())
}

fn git_repo_path(data_root: &Path, owner: &str, name: &str) -> PathBuf {
    data_root
        .join("repo")
        .join("git")
        .join(owner)
        .join(format!("{name}.git"))
}

fn svn_repo_path(data_root: &Path, owner: &str, name: &str) -> PathBuf {
    data_root.join("repo").join("svn").join(owner).join(name)
}

fn check_project_repositories(
    data_root: &Path,
    owner: &str,
    name: &str,
    vcs: &str,
    findings: &mut Vec<Finding>,
) {
    let git_path = git_repo_path(data_root, owner, name);
    let svn_path = svn_repo_path(data_root, owner, name);
    // Filesystem state that prevents safe owner/{name} resolution at all.
    for component in [
        data_root.join("repo/git").join(owner),
        data_root.join("repo/svn").join(owner),
    ] {
        if component.exists() && !component.is_dir() {
            findings.push(Finding {
                severity: Severity::Blocking,
                message: format!(
                    "filesystem state prevents safe owner/project resolution: {} is not a directory",
                    component.display()
                ),
            });
        }
    }

    if git_path.exists() && svn_path.exists() {
        findings.push(Finding {
            severity: Severity::Error,
            message: format!(
                "project {owner}/{name} unexpectedly has BOTH canonical Git ({}) and SVN ({}) repositories",
                git_path.display(),
                svn_path.display()
            ),
        });
    }

    if is_subversion(vcs) {
        if !svn_path.exists() {
            findings.push(Finding {
                severity: Severity::Blocking,
                message: format!(
                    "MISSING svn repository for {owner}/{name}: {}",
                    svn_path.display()
                ),
            });
        } else if !svn_path.join("format").is_file() {
            findings.push(Finding {
                severity: Severity::Blocking,
                message: format!(
                    "INVALID svn repository for {owner}/{name}: {} has no format marker",
                    svn_path.display()
                ),
            });
        }
    } else if !git_path.exists() {
        findings.push(Finding {
            severity: Severity::Blocking,
            message: format!(
                "MISSING git repository for {owner}/{name}: {}",
                git_path.display()
            ),
        });
    } else if !git_path.is_dir() {
        findings.push(Finding {
            severity: Severity::Blocking,
            message: format!(
                "INVALID git repository for {owner}/{name}: {} is not a directory",
                git_path.display()
            ),
        });
    } else {
        match Command::new("git")
            .args(["rev-parse", "--is-bare-repository"])
            .current_dir(&git_path)
            .output()
        {
            Ok(output)
                if output.status.success()
                    && String::from_utf8_lossy(&output.stdout).trim() == "true" => {}
            Ok(output) => findings.push(Finding {
                severity: Severity::Blocking,
                message: format!(
                    "INVALID git repository for {owner}/{name}: {}: {}",
                    git_path.display(),
                    String::from_utf8_lossy(&output.stderr).trim()
                ),
            }),
            Err(error) => findings.push(Finding {
                severity: Severity::Blocking,
                message: format!(
                    "INVALID git repository for {owner}/{name}: {}: {error}",
                    git_path.display()
                ),
            }),
        }
    }
}

fn is_subversion(vcs: &str) -> bool {
    vcs.eq_ignore_ascii_case("Subversion")
}

fn check_staging(data_root: &Path, findings: &mut Vec<Finding>) {
    let staging = data_root.join("repo/.staging");
    let entries = match std::fs::read_dir(&staging) {
        Ok(entries) => entries,
        Err(_) => return, // absent or unreadable-as-missing: no interrupted ops recorded
    };
    for entry in entries.flatten() {
        findings.push(Finding {
            severity: Severity::Blocking,
            message: format!(
                "interrupted repository operation: leftover staging entry {}",
                entry.path().display()
            ),
        });
    }
}

fn collect_canonical_repos(root: PathBuf, suffix: Option<&str>) -> Vec<(String, String, PathBuf)> {
    let mut found = Vec::new();
    let owners = match std::fs::read_dir(&root) {
        Ok(entries) => entries,
        Err(_) => return found,
    };
    for owner_entry in owners.flatten() {
        let owner_path = owner_entry.path();
        if !owner_path.is_dir() || owner_entry.file_name() == ".staging" {
            continue;
        }
        let owner = owner_entry.file_name().to_string_lossy().to_string();
        let projects = match std::fs::read_dir(&owner_path) {
            Ok(entries) => entries,
            Err(_) => continue,
        };
        for project_entry in projects.flatten() {
            let path = project_entry.path();
            if !path.is_dir() {
                continue;
            }
            let raw = project_entry.file_name().to_string_lossy().to_string();
            let name = match suffix {
                Some(suffix) => raw.strip_suffix(suffix).map(str::to_string),
                None => Some(raw.clone()),
            };
            if let Some(name) = name {
                found.push((owner.clone(), name, path));
            }
        }
    }
    found
}

fn scan_orphans(
    data_root: &Path,
    expected: &BTreeSet<(String, String)>,
    strict: bool,
    findings: &mut Vec<Finding>,
) {
    let mut on_disk: BTreeSet<(String, String)> = BTreeSet::new();
    for (owner, name, _path) in collect_canonical_repos(data_root.join("repo/git"), Some(".git")) {
        on_disk.insert((owner, name));
    }
    for (owner, name, _path) in collect_canonical_repos(data_root.join("repo/svn"), None) {
        on_disk.insert((owner, name));
    }
    for (owner, name) in on_disk {
        if !expected.contains(&(owner.clone(), name.clone())) {
            findings.push(Finding {
                severity: if strict {
                    Severity::Error
                } else {
                    Severity::Warning
                },
                message: format!(
                    "orphan filesystem repository with no referring DB project: {owner}/{name}{}",
                    if strict {
                        ""
                    } else {
                        " (--strict would escalate this)"
                    }
                ),
            });
        }
    }
}

async fn check_evolution_history(
    db: &sea_orm::DatabaseConnection,
    findings: &mut Vec<Finding>,
    notes: &mut Vec<String>,
) {
    let backend = db.get_database_backend();
    let table_exists = |table: &str| {
        let table = table.to_string();
        async move {
            let sql = format!(
                "select count(*) c from information_schema.tables \
                 where table_schema=database() and table_name='{table}'"
            );
            let rows = db.query_all(Statement::from_string(backend, sql)).await?;
            let count: i64 = rows[0].try_get_by_index(0)?;
            anyhow::Ok(count > 0)
        }
    };

    if table_exists("play_evolutions").await.unwrap_or(false) {
        let applied_sql = "select count(*) total, \
             sum(case when state <> 'applied' then 1 else 0 end) not_applied, \
             sum(case when last_problem is not null then 1 else 0 end) with_problem \
             from play_evolutions";
        match db
            .query_all(Statement::from_string(backend, applied_sql))
            .await
        {
            Ok(rows) => {
                let row = &rows[0];
                let total: i64 = row.try_get_by_index(0).unwrap_or(0);
                let not_applied: i64 = row.try_get_by_index(1).unwrap_or(0);
                let problems: i64 = row.try_get_by_index(2).unwrap_or(0);
                if total == 0 {
                    findings.push(Finding {
                        severity: Severity::Warning,
                        message: "play_evolutions exists but records no applied evolutions".into(),
                    });
                } else if not_applied > 0 || problems > 0 {
                    findings.push(Finding {
                        severity: Severity::Error,
                        message: format!(
                            "play_evolutions history broken: {not_applied} row(s) not 'applied', {problems} with last_problem"
                        ),
                    });
                } else {
                    notes.push(format!("{total} play_evolutions all 'applied'"));
                }
            }
            Err(error) => findings.push(Finding {
                severity: Severity::Error,
                message: format!("cannot read play_evolutions: {error}"),
            }),
        }
    } else {
        findings.push(Finding {
            severity: Severity::Warning,
            message: "no play_evolutions table (legacy evolution history unverifiable)".into(),
        });
    }

    if table_exists("seaql_migrations").await.unwrap_or(false) {
        notes.push("seaql_migrations present (Yoram adopt already ran)".to_string());
    }
}

async fn check_attachments(
    db: &sea_orm::DatabaseConnection,
    data_root: &Path,
    findings: &mut Vec<Finding>,
) {
    let backend = db.get_database_backend();
    let rows = match db
        .query_all(Statement::from_string(
            backend,
            "select id, name, coalesce(hash,''), container_type, coalesce(size,-1) \
             from attachment where hash is not null and hash <> '' order by id",
        ))
        .await
    {
        Ok(rows) => rows,
        Err(_) => return, // attachment table absent -> manifest validation already flagged it
    };
    let uploads = data_root.join("uploads");
    let mut checked = 0usize;
    let mut avatars = 0usize;
    for row in rows {
        let id: i64 = row.try_get_by_index(0).unwrap_or(0);
        let name: String = row.try_get_by_index(1).unwrap_or_default();
        let hash: String = row.try_get_by_index(2).unwrap_or_default();
        let container_type: String = row.try_get_by_index(3).unwrap_or_default();
        let size: i64 = row.try_get_by_index(4).unwrap_or(-1);
        if container_type == "USER_AVATAR" {
            avatars += 1;
        }
        let path = uploads.join(&hash);
        checked += 1;
        if !path.is_file() {
            findings.push(Finding {
                severity: Severity::Warning,
                message: format!(
                    "attachment #{id} ({name}, {container_type}): missing upload file {}",
                    path.display()
                ),
            });

            continue;
        }
        if size >= 0 {
            match std::fs::metadata(&path) {
                Ok(meta) if meta.len() == size as u64 => {}
                Ok(meta) => findings.push(Finding {
                    severity: Severity::Warning,
                    message: format!(
                        "attachment #{id} ({name}): size mismatch db={size} file={}",
                        meta.len()
                    ),
                }),
                Err(error) => findings.push(Finding {
                    severity: Severity::Warning,
                    message: format!("attachment #{id} ({name}): cannot stat file: {error}"),
                }),
            }
        }
    }
    eprintln!(
        "preflight: attachments checked={checked} avatar_rows={avatars} under {}",
        uploads.display()
    );
}

async fn check_password_hashes(db: &sea_orm::DatabaseConnection, findings: &mut Vec<Finding>) {
    let backend = db.get_database_backend();
    let rows = match db
        .query_all(Statement::from_string(
            backend,
            "select id, coalesce(login_id,''), password from n4user where password is not null and password <> '' order by id",
        ))
        .await
    {
        Ok(rows) => rows,
        Err(_) => return,
    };
    for row in rows {
        let id: i64 = row.try_get_by_index(0).unwrap_or(0);
        let login_id: String = row.try_get_by_index(1).unwrap_or_default();
        let password: String = row.try_get_by_index(2).unwrap_or_default();
        let looks_sha256_base64 = password.len() == 44
            && password
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'+' || b == b'/' || b == b'=');
        let looks_bcrypt = password.starts_with("$2a$")
            || password.starts_with("$2b$")
            || password.starts_with("$2x$")
            || password.starts_with("$2y$");
        if !looks_sha256_base64 && !looks_bcrypt {
            findings.push(Finding {
                severity: Severity::Warning,
                message: format!(
                    "user {login_id}#{id}: unrecognized password hash shape (len {}, not legacy SHA-256 base64 nor bcrypt)",
                    password.len()
                ),
            });
        }
    }
}
