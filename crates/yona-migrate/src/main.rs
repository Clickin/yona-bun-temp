/// CLI harness for yona-migrate — streaming REST-to-REST migration tool.
///
/// # Usage
///
/// ## Site-level (one-time migration from legacy Yona):
/// ```sh
/// yona-migrate \
///   --from-file /tmp/yobi-data.json \
///   --to-url "http://localhost:8089" \
///   --to-token "xxx" \
///   --to-login "admin" \
///   --yona-data-dir /path/to/legacy/uploads \
///   --from-repo-dir /path/to/legacy/repos
/// ```
///
/// ## Site-level over HTTP (legacy PAT or session cookie):
/// ```sh
/// yona-migrate \
///   --from-url "https://legacy.yona.io" \
///   --from-token "xxx" \
///   --to-url "http://localhost:8089" --to-token "yyy" --to-login "admin"
///
/// yona-migrate \
///   --from-url "https://legacy.yona.io" \
///   --from-cookie "PLAY_SESSION=..." \
///   --to-url "http://localhost:8089" --to-token "yyy" --to-login "admin"
/// ```
///
/// ## Project-level (per-project sync):
/// ```sh
/// yona-migrate \
///   --from-url "https://legacy.yona.io" \
///   --from-owner "myorg" --from-project "myproject" --from-token "xxx" \
///   --to-url "http://localhost:8089" --to-token "yyy" --to-login "admin"
/// ```
///
/// ## File output (backup):
/// ```sh
/// yona-migrate --from-file /tmp/yobi-data.json --to-file /tmp/backup.json
/// ```
use std::path::PathBuf;
use std::process::Command;

use anyhow::{Context as _, Result};
use clap::Parser;

mod from;
mod site_transform;
mod stream_reader;
mod to;

#[derive(Parser)]
#[command(name = "yona-migrate", version, about = "Streaming Yona-to-Yoram migration tool")]
struct Args {
    /// Source URL (legacy Yona instance)
    #[arg(long, group = "from")]
    from_url: Option<String>,

    /// Source personal access token (legacy `Authorization: token <pat>`)
    #[arg(long, requires = "from_url")]
    from_token: Option<String>,

    /// Source session cookie (for legacy `/sites/export`, site-manager session)
    #[arg(long, requires = "from_url", conflicts_with = "from_token")]
    from_cookie: Option<String>,

    /// Source owner name (for project-level export)
    #[arg(long, requires = "from_url")]
    from_owner: Option<String>,

    /// Source project name (for project-level export)
    #[arg(long, requires = "from_url")]
    from_project: Option<String>,

    /// Source file (skip REST fetch, read the legacy `/sites/export` dump)
    #[arg(long)]
    from_file: Option<PathBuf>,

    /// Source database (mysql://user:pass@host:port/db) — read the legacy
    /// MariaDB/H2-compatible schema directly, bypassing the HTTP export
    /// surface. Preferred production source.
    #[arg(long)]
    from_db_url: Option<String>,

    /// Legacy bare-repository root (repos at `{root}/{project_id}` / `{project_id}.git` / `{project_id}.svn`)
    #[arg(long)]
    from_repo_dir: Option<PathBuf>,

    /// Legacy password for `git clone --mirror` over smart HTTP (login+password)
    #[arg(long, requires = "from_url")]
    from_password: Option<String>,

    /// Target URL (Yoram instance)
    #[arg(long, group = "to")]
    to_url: Option<String>,

    /// Target API token (`Authorization: Bearer`)
    #[arg(long, requires = "to_url")]
    to_token: Option<String>,

    /// Target login id of the API-token owner (git/svn Basic auth user)
    #[arg(long, requires = "to_url")]
    to_login: Option<String>,

    /// Output file (skip REST POST, write to file instead)
    #[arg(long)] // ponytail: standalone --to-file without --to-url
    to_file: Option<PathBuf>,

    /// Yona data directory for attachment files (site-level migration only)
    #[arg(short = 'd', long)]
    yona_data_dir: Option<PathBuf>,

    /// Dry run — validate but don't import
    #[arg(long)]
    dry_run: bool,

    /// Transfer repositories after the data import (default on)
    #[arg(long, default_value_t = true)]
    with_repos: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();
    tracing_subscriber::fmt::init();

    match determine_mode(&args) {
        Mode::SiteLevel => run_site_export(&args),
        Mode::ProjectLevel => run_project_export(&args),
        Mode::FileRead => run_file_read(&args),
        Mode::DbRead => run_db_read(&args),
    }
}

fn die(msg: impl std::fmt::Display) -> ! {
    eprintln!("error: {}", msg);
    std::process::exit(1)
}

enum Mode {
    SiteLevel,
    ProjectLevel,
    FileRead,
    DbRead,
}

fn determine_mode(args: &Args) -> Mode {
    if args.from_db_url.is_some() {
        return Mode::DbRead;
    }
    if args.from_file.is_some() {
        return Mode::FileRead;
    }
    if args.from_url.is_none() {
        die("Specify --from-url and (--from-token | --from-cookie), or --from-file");
    }
    if args.from_token.is_none() && args.from_cookie.is_none() {
        die("Specify --from-token or --from-cookie together with --from-url");
    }
    if args.from_owner.is_some() && args.from_project.is_some() {
        Mode::ProjectLevel
    } else if args.from_owner.is_none() && args.from_project.is_none() {
        Mode::SiteLevel
    } else {
        die("--from-owner and --from-project must be used together");
    }
}

fn from_auth(args: &Args) -> from::FromAuth {
    match (&args.from_token, &args.from_cookie) {
        (Some(token), _) => from::FromAuth::Token(token.clone()),
        (_, Some(cookie)) => from::FromAuth::Cookie(cookie.clone()),
        _ => die("missing --from-token or --from-cookie"),
    }
}

fn run_site_export(args: &Args) -> Result<()> {
    let auth = from_auth(args);

    let (source, source_label) = if let Some(from_url) = &args.from_url {
        eprintln!("Reading site export from {} ...", from_url);
        (from::read_site_export(from_url, &auth)?.tables, "REST")
    } else {
        die("site-level migration needs --from-url (or use --from-file)");
    };
    eprintln!("Read {} tables from {source_label} source", source.len());

    let mut ctx = site_transform::transform_dump(&source);
    eprintln!("Transformed: {}", summarize_counts(&ctx));

    // Attachments: fill content_base64 from the legacy uploads directory.
    if let Some(data_dir) = &args.yona_data_dir {
        fill_attachments(&mut ctx, data_dir);
    }

    if args.dry_run {
        eprintln!("DRY RUN — would import:");
        for (name, count) in ctx.counts() {
            eprintln!("  {name}: {count}");
        }
        return Ok(());
    }

    let payload = serde_json::to_value(&ctx)?;

    if let Some(file_path) = &args.to_file {
        to::write_to_file(file_path, &payload)?;
        eprintln!("Wrote export to {}", file_path.display());
        return Ok(());
    }

    if let Some(to_url) = &args.to_url {
        let to_token = args.to_token.as_deref().unwrap();
        eprintln!("Importing into {} ...", to_url);
        let result = to::write_site_import(to_url, to_token, &payload)?;
        eprintln!("Import result: {}", serde_json::to_string_pretty(&result)?);
        if args.with_repos {
            transfer_repositories(args, &ctx)?;
        }
    } else {
        to::write_to_stdout(&payload)?;
    }

    Ok(())
}

fn run_project_export(args: &Args) -> Result<()> {
    let auth = from_auth(args);
    let from_url = args.from_url.as_deref().unwrap();
    let owner = args.from_owner.as_deref().unwrap();
    let project = args.from_project.as_deref().unwrap();

    eprintln!("Reading project export: {}/{} from {} ...", owner, project, from_url);

    let payload = from::read_project_export(from_url, &auth, owner, project)?;
    let lines = to::project_export_to_ndjson(&payload)?;
    eprintln!("Composed {} NDJSON records", lines.len());

    if args.dry_run {
        eprintln!("DRY RUN — would import project {}/{}", owner, project);
        return Ok(());
    }

    if let Some(file_path) = &args.to_file {
        let content = lines.join("\n");
        std::fs::write(file_path, content)
            .with_context(|| format!("Failed to write {}", file_path.display()))?;
        eprintln!("Wrote project NDJSON to {}", file_path.display());
        return Ok(());
    }

    if let Some(to_url) = &args.to_url {
        let to_token = args.to_token.as_deref().unwrap();
        eprintln!("Importing project into {} ...", to_url);
        let result = to::write_project_import_ndjson(to_url, to_token, owner, project, &lines, false)?;
        eprintln!("Import result: {}", serde_json::to_string_pretty(&result)?);
        if args.with_repos {
            let mut ctx = site_transform::TransformationContext::new();
            ctx.projects.push(serde_json::json!({
                "id": payload.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
                "ownerName": owner,
                "projectName": project,
                "projectVcs": payload.get("projectVcs").and_then(|v| v.as_str()).unwrap_or("GIT"),
            }));
            transfer_repositories(args, &ctx)?;
        }
    } else {
        to::write_to_stdout(&payload)?;
    }

    Ok(())
}

fn run_file_read(args: &Args) -> Result<()> {
    let file_path = args.from_file.as_ref().unwrap();
    eprintln!("Reading dump from {} ...", file_path.display());

    let payload = from::read_from_file(file_path)?;
    let tables = dump_tables(&payload)?;
    run_table_import(tables, args)
}

fn run_db_read(args: &Args) -> Result<()> {
    let db_url = args.from_db_url.as_ref().unwrap();
    eprintln!("Reading dump from database {db_url} ...");

    let payload = from::read_from_db(db_url)?;
    let tables = dump_tables(&payload)?;
    run_table_import(tables, args)
}

/// Extract `(table, rows)` pairs from a dump object.
fn dump_tables(payload: &serde_json::Value) -> Result<Vec<(String, Vec<serde_json::Value>)>> {
    let map = payload
        .as_object()
        .ok_or_else(|| anyhow::anyhow!("dump must be a JSON object of table arrays"))?;
    Ok(map
        .iter()
        .filter_map(|(name, value)| value.as_array().map(|rows| (name.clone(), rows.clone())))
        .collect())
}

/// Shared site-import flow: transform the table dump, fill attachments,
/// then dry-run / write file / POST to the target.
fn run_table_import(
    tables: Vec<(String, Vec<serde_json::Value>)>,
    args: &Args,
) -> Result<()> {
    let mut ctx = site_transform::transform_dump(&tables);
    eprintln!("Transformed: {}", summarize_counts(&ctx));

    if let Some(data_dir) = &args.yona_data_dir {
        fill_attachments(&mut ctx, data_dir);
    }

    if args.dry_run {
        eprintln!("DRY RUN — would import:");
        for (name, count) in ctx.counts() {
            eprintln!("  {name}: {count}");
        }
        return Ok(());
    }

    let output = serde_json::to_value(&ctx)?;

    if let Some(file_path) = &args.to_file {
        to::write_to_file(file_path, &output)?;
        eprintln!("Wrote transformed export to {}", file_path.display());
    } else if let Some(to_url) = &args.to_url {
        let to_token = args.to_token.as_deref().unwrap();
        let result = to::write_site_import(to_url, to_token, &output)?;
        eprintln!("Import result: {}", serde_json::to_string_pretty(&result)?);
        if args.with_repos {
            transfer_repositories(args, &ctx)?;
        }
    } else {
        to::write_to_stdout(&output)?;
    }

    Ok(())
}

fn summarize_counts(ctx: &site_transform::TransformationContext) -> String {
    ctx.counts()
        .iter()
        .map(|(name, count)| format!("{name}={count}"))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Fill `content_base64` for every attachment in issues, posts, milestones
/// and their comments from the legacy uploads directory.
fn fill_attachments(ctx: &mut site_transform::TransformationContext, data_dir: &PathBuf) {
    let mut filled = 0usize;
    let mut warn_count = 0usize;
    for item in std::iter::empty::<&mut serde_json::Value>()
        .chain(ctx.issues.iter_mut())
        .chain(ctx.posts.iter_mut())
        .chain(ctx.milestones.iter_mut())
    {
        if let Some(attachments) = item.get_mut("attachments").and_then(|v| v.as_array_mut()) {
            for att in attachments {
                if let Some(hash) = att.get("hash").and_then(|v| v.as_str()) {
                    if !hash.is_empty() {
                        match from::read_attachment_base64(data_dir, hash) {
                            Ok(content) => {
                                let padding = content
                                    .chars()
                                    .rev()
                                    .take(2)
                                    .filter(|character| *character == '=')
                                    .count();
                                let decoded_size = content.len() / 4 * 3 - padding;
                                att["contentBase64"] = serde_json::Value::String(content);
                                att["size"] = serde_json::Value::Number(
                                    (decoded_size as i64).into(),
                                );
                                filled += 1;
                            }
                            Err(_) => {
                                warn_count += 1;
                            }
                        }
                    }
                }
            }
        }
        if let Some(comments) = item.get_mut("comments").and_then(|v| v.as_array_mut()) {
            for comment in comments {
                if let Some(attachments) =
                    comment.get_mut("attachments").and_then(|v| v.as_array_mut())
                {
                    for att in attachments {
                        if let Some(hash) = att.get("hash").and_then(|v| v.as_str()) {
                            if !hash.is_empty() {
                                match from::read_attachment_base64(data_dir, hash) {
                                    Ok(content) => {
                                        let padding = content
                                            .chars()
                                            .rev()
                                            .take(2)
                                            .filter(|character| *character == '=')
                                            .count();
                                        let decoded_size = content.len() / 4 * 3 - padding;
                                        att["contentBase64"] = serde_json::Value::String(content);
                                        att["size"] = serde_json::Value::Number(
                                            (decoded_size as i64).into(),
                                        );
                                        filled += 1;
                                    }
                                    Err(_) => {
                                        warn_count += 1;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    eprintln!("Filled {filled} attachments from {} ({} missing)", data_dir.display(), warn_count);
}

/// Push repositories for every transformed project (git mirror push or svn dump load).
///
/// git: local `git clone --bare <from-repo-dir>/<id>` then
/// `git push --mirror <to-url>/<owner>/<project>.git` with Basic `login:token`.
/// Without `--from-repo-dir` but with `--from-password`, mirror-clone directly
/// from the legacy smart HTTP URL (Basic `login:password`).
///
/// svn: `svnadmin dump` the legacy `{id}.svn` and `svnrdump load` into the
/// new app's SVN DAV (`/svn/{owner}/{project}`, Basic `login:token`).
fn transfer_repositories(args: &Args, ctx: &site_transform::TransformationContext) -> Result<()> {
    let Some(to_url) = &args.to_url else {
        return Ok(());
    };
    let Some(to_token) = &args.to_token else {
        return Ok(());
    };
    let Some(to_login) = &args.to_login else {
        eprintln!("Skipping repository transfer: specify --to-login (token owner) to enable it");
        return Ok(());
    };
    let Some(repo_dir) = &args.from_repo_dir else {
        if args.from_password.is_none() {
            eprintln!("Skipping repository transfer: specify --from-repo-dir (or --from-password to clone over HTTP)");
            return Ok(());
        }
        return transfer_repositories_over_http(args, to_url, to_login, to_token, ctx);
    };

    for project in &ctx.projects {
        let Some(id) = project.get("id").and_then(|v| v.as_i64()) else {
            continue;
        };
        let owner = project.get("ownerName").and_then(|v| v.as_str()).unwrap_or("");
        let name = project.get("projectName").and_then(|v| v.as_str()).unwrap_or("");
        if owner.is_empty() || name.is_empty() || id <= 0 {
            continue;
        }
        let vcs = project.get("projectVcs").and_then(|v| v.as_str()).unwrap_or("GIT");
        if vcs.eq_ignore_ascii_case("Subversion") {
            transfer_svn_repository(repo_dir, id, to_url, owner, name, to_login, to_token)?;
        } else {
            transfer_git_repository(repo_dir, id, to_url, owner, name, to_login, to_token)?;
        }
    }
    Ok(())
}

fn transfer_repositories_over_http(
    args: &Args,
    to_url: &str,
    to_login: &str,
    to_token: &str,
    ctx: &site_transform::TransformationContext,
) -> Result<()> {
    let Some(from_url) = &args.from_url else {
        return Ok(());
    };
    let Some(from_password) = &args.from_password else {
        return Ok(());
    };
    for project in &ctx.projects {
        let owner = project.get("ownerName").and_then(|v| v.as_str()).unwrap_or("");
        let name = project.get("projectName").and_then(|v| v.as_str()).unwrap_or("");
        if owner.is_empty() || name.is_empty() {
            continue;
        }
        let vcs = project.get("projectVcs").and_then(|v| v.as_str()).unwrap_or("GIT");
        if vcs.eq_ignore_ascii_case("Subversion") {
            eprintln!("Skipping SVN over HTTP transfer for {owner}/{name}: use --from-repo-dir");
            continue;
        }
        let legacy_url = format!("{}/{}/{}.git", from_url.trim_end_matches('/'), owner, name);
        let mirror = format!(
            "{}/{}/{}.git",
            to_url.trim_end_matches('/'),
            owner,
            name
        );
        let mirror = with_basic_auth_url(&mirror, to_login, to_token);
        let source = with_basic_auth_url(&legacy_url, owner, from_password);
        eprintln!("Mirror-cloning {} ...", legacy_url);
        run_cmd("git", &["clone", "--mirror", &source, &format!(".yona-migrate-{}-{}.git", owner, name)])?;
        run_cmd("git", &["-C", &format!(".yona-migrate-{}-{}.git", owner, name), "push", "--mirror", &mirror])?;
        let _ = std::fs::remove_dir_all(format!(".yona-migrate-{}-{}.git", owner, name));
    }
    Ok(())
}

fn transfer_git_repository(
    repo_dir: &PathBuf,
    id: i64,
    to_url: &str,
    owner: &str,
    name: &str,
    to_login: &str,
    to_token: &str,
) -> Result<()> {
    let source = [repo_dir.join(id.to_string()), repo_dir.join(format!("{id}.git"))]
        .into_iter()
        .find(|path| path.exists());
    let Some(source) = source else {
        eprintln!(
            "Skipping git repo for project id {id}: not found in {}",
            repo_dir.display()
        );
        return Ok(());
    };
    let mirror = format!("{}/{}/{}.git", to_url.trim_end_matches('/'), owner, name);
    let mirror = with_basic_auth_url(&mirror, to_login, to_token);
    let clone_dir = format!(".yona-migrate-{}-{}.git", owner, name);
    eprintln!("Mirroring git repo {} -> {}", source.display(), mirror);
    let _ = std::fs::remove_dir_all(&clone_dir);
    run_cmd("git", &["clone", "--bare", &source.display().to_string(), &clone_dir])?;
    let push = run_cmd("git", &["-C", &clone_dir, "push", "--mirror", &mirror]);
    let _ = std::fs::remove_dir_all(&clone_dir);
    push?;
    Ok(())
}

fn transfer_svn_repository(
    repo_dir: &PathBuf,
    id: i64,
    to_url: &str,
    owner: &str,
    name: &str,
    to_login: &str,
    to_token: &str,
) -> Result<()> {
    let source = repo_dir.join(format!("{id}.svn"));
    if !source.exists() {
        eprintln!("Skipping SVN project {owner}/{name}: {} missing", source.display());
        return Ok(());
    }
    let dump_path = format!(".yona-migrate-{}-{}.svndump", owner, name);
    let target = format!("{}/svn/{}/{}", to_url.trim_end_matches('/'), owner, name);
    eprintln!("Dumping SVN repo {} -> {}", source.display(), dump_path);
    let dump_file = std::fs::File::create(&dump_path)
        .with_context(|| format!("failed to create {}", dump_path))?;
    let output = Command::new("svnadmin")
        .arg("dump")
        .arg(&source)
        .stdout(std::process::Stdio::from(dump_file))
        .output()
        .context("failed to spawn svnadmin")?;
    if !output.status.success() {
        let _ = std::fs::remove_file(&dump_path);
        anyhow::bail!(
            "svnadmin dump failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        );
    }
    eprintln!("Loading SVN repo into {} (Basic {}) ...", target, to_login);
    let dump_file = std::fs::File::open(&dump_path)
        .with_context(|| format!("failed to open {}", dump_path))?;
    let output = Command::new("svnrdump")
        .args(["load", "--username", to_login, "--password", to_token, &target])
        .stdin(std::process::Stdio::from(dump_file))
        .output()
        .context("failed to spawn svnrdump")?;
    if !output.status.success() {
        // ponytail: the new app's SVN DAV write path is read-focused;
        // keep the dump and hand the operator the documented `svnadmin load`
        // fallback instead of failing the whole migration.
        eprintln!(
            "svnrdump load failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        );
        eprintln!(
            "Kept SVN dump at {dump_path}. On the Yoram host, run:\n\
             \x20 svnadmin load <yoram-data-root>/repo/{id}.svn < {dump_path}\n\
             (yoram-data-root defaults to .yona-data next to the server; \
             the repo dir is created by the import.)"
        );
        return Ok(());
    }
    let _ = std::fs::remove_file(&dump_path);
    Ok(())
}

fn with_basic_auth_url(url: &str, login: &str, password: &str) -> String {
    let (scheme, rest) = match url.split_once("://") {
        Some((scheme, rest)) => (scheme, rest),
        None => ("http", url),
    };
    let encoded_login = urlencode(login);
    let encoded_password = urlencode(password);
    format!("{scheme}://{encoded_login}:{encoded_password}@{rest}")
}

fn urlencode(value: &str) -> String {
    let mut result = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(byte as char)
            }
            _ => result.push_str(&format!("%{byte:02X}")),
        }
    }
    result
}

fn run_cmd(program: &str, args: &[&str]) -> Result<()> {
    let output = Command::new(program)
        .args(args)
        .output()
        .with_context(|| format!("failed to spawn {program}"))?;
    if !output.status.success() {
        anyhow::bail!(
            "{program} {:?} failed: {}",
            args,
            String::from_utf8_lossy(&output.stderr).trim()
        );
    }
    Ok(())
}
