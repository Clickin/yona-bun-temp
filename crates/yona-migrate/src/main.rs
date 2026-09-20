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
use clap::{Parser, Subcommand};

mod direct_db;
mod from;
mod preflight;
mod site_transform;
mod stream_reader;
mod to;

#[derive(Subcommand)]
enum CliCommand {
    /// In-place preflight against a legacy MariaDB + YONA_DATA pair (Phase 6 gate).
    Preflight {
        /// Legacy database URL, e.g. mysql://root@127.0.0.1:3306/yona
        #[arg(long)]
        db_url: String,

        /// YONA_DATA root containing repo/ and uploads/
        #[arg(long)]
        data_root: PathBuf,

        /// Promote selected warnings (orphan repositories) to errors
        #[arg(long)]
        strict: bool,
    },
}

#[derive(Parser)]
#[command(
    name = "yona-migrate",
    version,
    about = "Streaming Yona-to-Yoram migration tool"
)]
struct Args {
    #[command(subcommand)]
    command: Option<CliCommand>,
    /// Source URL (legacy Yona instance)
    #[arg(long, group = "from")]
    from_url: Option<String>,

    /// Source Yoram instance (Yoram→Yoram migration). Reads
    /// `GET /api/v1/site/export` (Bearer via --from-token) and imports the
    /// payload as-is; attachment bytes are fetched from the source's
    /// `/files/{id}` route, so the source storage backend (local partition,
    /// S3, ...) never needs direct access.
    #[arg(long, group = "from")]
    from_yoram_url: Option<String>,

    /// Source login id of the API-token owner (Yoram git/svn smart HTTP
    /// Basic auth is `login:api-token`; default: each project owner).
    #[arg(long)]
    from_login: Option<String>,

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
    #[arg(long, group = "from")]
    from_file: Option<PathBuf>,

    /// Read-only legacy MySQL/MariaDB snapshot; requires a separate empty --to-db-url.
    #[arg(long, group = "from", requires = "to_db_url", conflicts_with_all = ["to_url", "to_file", "from_repo_dir"])]
    from_db_url: Option<String>,

    /// Empty disposable MySQL/MariaDB target (never the source database).
    #[arg(long, group = "to", requires = "from_db_url")]
    to_db_url: Option<String>,

    /// Acknowledge matching write-frozen source DB and YONA_DATA snapshots.
    #[arg(long, requires = "from_db_url")]
    source_snapshot: bool,

    /// Maximum rows per direct-DB transaction (1..=1000).
    #[arg(long, default_value_t = 250)]
    batch_size: usize,

    /// Source H2 database (jdbc:h2:...) — read via the legacy host's H2 jar.
    #[arg(long, group = "from")]
    from_h2_url: Option<String>,

    /// Path to the H2 jar (required with --from-h2-url; ships with Yona).
    #[arg(long, requires = "from_h2_url")]
    from_h2_jar: Option<PathBuf>,

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
    #[arg(long, group = "to")]
    to_file: Option<PathBuf>,

    /// Yona data directory for attachment files (site-level migration only)
    #[arg(short = 'd', long)]
    yona_data_dir: Option<PathBuf>,

    /// Empty disposable target YONA_DATA root for direct DB migration, or the
    /// existing in-place root for repository preflight in other modes.
    #[arg(long)]
    yoram_data_root: Option<PathBuf>,

    /// Dry run — validate but don't import
    #[arg(long)]
    dry_run: bool,

    /// Transfer repositories after the data import (default on)
    #[arg(long, default_value_t = true, action = clap::ArgAction::Set)]
    with_repos: bool,
}

#[test]
fn project_import_can_disable_repository_transfer() {
    let args = Args::try_parse_from(["yona-migrate", "--with-repos=false"]).unwrap();
    assert!(!args.with_repos);
}

#[test]
fn direct_db_cli_rejects_bulk_http_and_ambiguous_sources() {
    assert!(Args::try_parse_from([
        "yona-migrate",
        "--from-db-url",
        "mysql://source/yona",
        "--to-url",
        "http://target"
    ])
    .is_err());
    assert!(Args::try_parse_from([
        "yona-migrate",
        "--from-db-url",
        "mysql://source/yona",
        "--to-db-url",
        "mysql://target/yoram",
        "--from-file",
        "dump.json"
    ])
    .is_err());
}

#[test]
fn missing_attachments_fail_before_import() {
    let root = tempfile::tempdir().unwrap();
    let mut ctx = site_transform::TransformationContext::new();
    ctx.issues
        .push(serde_json::json!({"attachments": [{"hash": "missing"}]}));
    assert!(fill_attachments(&mut ctx, &root.path().to_path_buf()).is_err());
    assert!(upload_attachment_files(
        "http://127.0.0.1:1",
        "secret",
        vec!["missing".into()],
        &root.path().to_path_buf()
    )
    .is_err());
}

#[test]
fn command_failure_does_not_leak_credentials() {
    let error = run_cmd("sh", &["-c", "printf sensitive-token >&2; exit 1"]).unwrap_err();
    assert!(!format!("{error:#}").contains("sensitive-token"));
}

#[test]
fn uploader_propagates_server_failure() {
    use std::io::{Read, Write};
    let root = tempfile::tempdir().unwrap();
    std::fs::create_dir(root.path().join("uploads")).unwrap();
    std::fs::write(root.path().join("uploads/hash"), "content").unwrap();
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let server = std::thread::spawn(move || {
        let (mut socket, _) = listener.accept().unwrap();
        socket
            .set_read_timeout(Some(std::time::Duration::from_secs(5)))
            .unwrap();
        let mut bytes = [0u8; 8192];
        let _ = socket.read(&mut bytes).unwrap();
        socket.write_all(b"HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").unwrap();
    });
    assert!(upload_attachment_files(
        &url,
        "secret",
        vec!["hash".into()],
        &root.path().to_path_buf()
    )
    .is_err());
    server.join().unwrap();
}

fn main() -> Result<()> {
    let args = Args::parse();
    tracing_subscriber::fmt::init();

    if let Some(CliCommand::Preflight {
        db_url,
        data_root,
        strict,
    }) = &args.command
    {
        let runtime = tokio::runtime::Runtime::new().context("building tokio runtime")?;
        return runtime.block_on(preflight::run(db_url, data_root, *strict));
    }

    if args.to_url.is_some() {
        anyhow::ensure!(args.to_token.is_some(), "--to-url requires --to-token");
        if args.with_repos && !args.dry_run {
            anyhow::ensure!(
                args.to_login.is_some(),
                "repository transfer requires --to-login (or explicitly --with-repos=false)"
            );
        }
    }

    match determine_mode(&args) {
        Mode::SiteLevel => run_site_export(&args),
        Mode::ProjectLevel => run_project_export(&args),
        Mode::FileRead => run_file_read(&args),
        Mode::DbRead => run_db_read(&args),
        Mode::H2Read => run_h2_read(&args),
        Mode::YoramRead => run_yoram_to_yoram(&args),
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
    H2Read,
    YoramRead,
}

fn determine_mode(args: &Args) -> Mode {
    if args.from_yoram_url.is_some() {
        return Mode::YoramRead;
    }
    if args.from_h2_url.is_some() {
        return Mode::H2Read;
    }
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

    run_table_import(source, args)
}

fn run_project_export(args: &Args) -> Result<()> {
    let auth = from_auth(args);
    let from_url = args.from_url.as_deref().unwrap();
    let owner = args.from_owner.as_deref().unwrap();
    let project = args.from_project.as_deref().unwrap();

    eprintln!(
        "Reading project export: {}/{} from {} ...",
        owner, project, from_url
    );

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
        let result =
            to::write_project_import_ndjson(to_url, to_token, owner, project, &lines, false)?;
        eprintln!("Import result: {}", serde_json::to_string_pretty(&result)?);
        let skipped_projects = result
            .get("skippedProjects")
            .and_then(|value| value.as_u64())
            .unwrap_or(0);
        if skipped_projects > 0 {
            eprintln!(
                "warning: {skipped_projects} project record(s) skipped. The project may already \
                 exist on the target, or its owner user \"{owner}\" is missing there. Run the \
                 site-level import once to create users: yona-migrate --from-yoram-url ... \
                 (without --from-owner/--from-project), then re-run this project import."
            );
        }
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
    direct_db::run(args)
}

fn run_h2_read(args: &Args) -> Result<()> {
    let h2_url = args.from_h2_url.as_ref().unwrap();
    let h2_jar = args.from_h2_jar.as_ref().unwrap();
    eprintln!("Reading dump from H2 database ...");

    let payload = from::read_from_h2(h2_url, h2_jar)?;
    let tables = dump_tables(&payload)?;
    run_table_import(tables, args)
}

/// Yoram→Yoram: the site export payload IS the site import payload, so no
/// legacy table transform runs. Attachments carry `hash` + `id`; the bytes
/// are fetched from the source's `/files/{id}` route and uploaded as
/// `uploads/{hash}` (the placeholder flow keys rows by hash). With
/// `--from-owner` + `--from-project`, migrates a single project via the
/// NDJSON export/import surface instead.
fn run_yoram_to_yoram(args: &Args) -> Result<()> {
    let from_url = args.from_yoram_url.as_ref().unwrap();
    let from_token = match &args.from_token {
        Some(token) => token.clone(),
        None => die("--from-yoram-url needs --from-token (Yoram Bearer token)"),
    };

    if let (Some(owner), Some(project)) = (&args.from_owner, &args.from_project) {
        return run_yoram_project_to_yoram(args, from_url, &from_token, owner, project);
    }

    let to_token = args.to_token.as_deref();

    eprintln!("Reading Yoram site export from {from_url} ...");
    let payload = from::read_yoram_site_export(from_url, &from_token)?;

    let count = |key: &str| {
        payload
            .get(key)
            .and_then(|value| value.as_array())
            .map(|rows| rows.len())
            .unwrap_or(0)
    };
    let attachment_pairs = collect_payload_attachments(&payload);
    eprintln!(
        "Read export: users={} projects={} issues={} posts={} attachments={}",
        count("users"),
        count("projects"),
        count("issues"),
        count("posts"),
        attachment_pairs.len()
    );

    if args.dry_run {
        eprintln!("DRY RUN — would import the export payload as-is");
        return Ok(());
    }

    if let Some(file_path) = &args.to_file {
        to::write_to_file(file_path, &payload)?;
        eprintln!("Wrote export to {}", file_path.display());
        return Ok(());
    }

    if let Some(to_url) = &args.to_url {
        let to_token = to_token.unwrap();
        // Finish staging all files before importing metadata. No detached
        // uploader may turn a transfer failure into a successful import.
        eprintln!(
            "{}",
            upload_attachments_from_url(
                from_url,
                &from_token,
                to_url,
                to_token,
                &attachment_pairs
            )?
        );
        eprintln!("Importing into {to_url} ...");
        let result = to::write_site_import(to_url, to_token, &payload)?;
        eprintln!("Import result: {}", serde_json::to_string_pretty(&result)?);
        if args.with_repos {
            let ctx = payload_to_transformation_context(&payload);
            transfer_repositories(args, &ctx)?;
        }
    } else {
        to::write_to_stdout(&payload)?;
    }
    Ok(())
}

/// Project-level Yoram→Yoram: read the source's NDJSON project export and
/// pass the lines through to the target's project import route. Repository
/// bytes travel over smart HTTP with the source token owner's login.
fn run_yoram_project_to_yoram(
    args: &Args,
    from_url: &str,
    from_token: &str,
    owner: &str,
    project: &str,
) -> Result<()> {
    eprintln!("Reading Yoram project export: {owner}/{project} from {from_url} ...");
    let lines = from::read_yoram_project_export(from_url, from_token, owner, project)?;
    eprintln!("Read {} NDJSON lines", lines.len());

    if args.dry_run {
        eprintln!("DRY RUN — would import project {owner}/{project}");
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
        eprintln!("Importing project into {to_url} ...");
        let result =
            to::write_project_import_ndjson(to_url, to_token, owner, project, &lines, false)?;
        eprintln!("Import result: {}", serde_json::to_string_pretty(&result)?);
        if args.with_repos {
            let mut ctx = site_transform::TransformationContext::new();
            for line in &lines {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(line) {
                    if value.get("kind").and_then(|k| k.as_str()) == Some("project") {
                        ctx.projects.push(serde_json::json!({
                            "id": value.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
                            "ownerName": owner,
                            "projectName": project,
                            "projectVcs": value.get("projectVcs").and_then(|v| v.as_str()).unwrap_or("GIT"),
                        }));
                        break;
                    }
                }
            }
            transfer_repositories(args, &ctx)?;
        }
    } else {
        to::write_to_stdout(&serde_json::json!({ "lines": lines }))?;
    }
    Ok(())
}

/// Collect `(hash, id)` pairs for every attachment in the export payload
/// (issues/posts/milestones and their comments).
fn collect_payload_attachments(payload: &serde_json::Value) -> Vec<(String, i64)> {
    let mut pairs = Vec::new();
    for key in ["issues", "posts", "milestones"] {
        let Some(items) = payload.get(key).and_then(|value| value.as_array()) else {
            continue;
        };
        for item in items {
            for container in std::iter::once(item).chain(
                item.get("comments")
                    .and_then(|value| value.as_array())
                    .into_iter()
                    .flatten(),
            ) {
                let Some(attachments) = container
                    .get("attachments")
                    .and_then(|value| value.as_array())
                else {
                    continue;
                };
                for att in attachments {
                    let hash = att.get("hash").and_then(|value| value.as_str());
                    let id = att.get("id").and_then(|value| value.as_i64());
                    if let (Some(hash), Some(id)) = (hash, id) {
                        if !hash.is_empty() && id > 0 {
                            pairs.push((hash.to_string(), id));
                        }
                    }
                }
            }
        }
    }
    pairs.sort();
    pairs.dedup();
    pairs
}

/// Fetch attachment bytes from the source (`/files/{id}`, Bearer) and upload
/// them to the target (`POST /api/v1/site/import/files`, hash + file).
fn upload_attachments_from_url(
    from_url: &str,
    from_token: &str,
    to_url: &str,
    to_token: &str,
    pairs: &[(String, i64)],
) -> Result<String> {
    use std::io::Write;
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;
    for (hash, id) in pairs {
        let bytes = from::fetch_attachment_bytes(from_url, from_token, *id)?;
        let mut file = tempfile::NamedTempFile::new()?;
        file.write_all(&bytes)?;
        file.flush()?;
        upload_one_file(&client, to_url, to_token, hash, &file.path().to_path_buf())?;
    }
    Ok(format!(
        "Attachment transfer done: {} uploaded",
        pairs.len()
    ))
}

/// Build a TransformationContext from an export payload (for repo transfer).
fn payload_to_transformation_context(
    payload: &serde_json::Value,
) -> site_transform::TransformationContext {
    let mut ctx = site_transform::TransformationContext::new();
    if let Some(projects) = payload.get("projects").and_then(|value| value.as_array()) {
        for project in projects {
            ctx.projects.push(serde_json::json!({
                "id": project.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
                "ownerName": project.get("ownerName").and_then(|v| v.as_str()).unwrap_or(""),
                "projectName": project.get("projectName").and_then(|v| v.as_str()).unwrap_or(""),
                "projectVcs": project.get("vcs").and_then(|v| v.as_str()).unwrap_or("GIT"),
            }));
        }
    }
    ctx
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
fn run_table_import(tables: Vec<(String, Vec<serde_json::Value>)>, args: &Args) -> Result<()> {
    let mut ctx = site_transform::transform_dump(&tables);
    eprintln!("Transformed: {}", summarize_counts(&ctx));

    let hashes = collect_attachment_hashes(&ctx)?;
    if !hashes.is_empty() {
        let data_dir = args.yona_data_dir.as_ref().context(
            "attachments require --yona-data-dir; missing bytes are not a successful migration",
        )?;
        if let Some(to_url) = args.to_url.as_ref().filter(|_| !args.dry_run) {
            let token = args
                .to_token
                .as_deref()
                .context("--to-url requires --to-token")?;
            eprintln!(
                "{}",
                upload_attachment_files(to_url, token, hashes, data_dir)?
            );
        } else {
            fill_attachments(&mut ctx, data_dir)?;
        }
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

/// Every attachment hash referenced by the transformed payload.
fn collect_attachment_hashes(ctx: &site_transform::TransformationContext) -> Result<Vec<String>> {
    fn collect(item: &serde_json::Value, hashes: &mut Vec<String>) -> Result<()> {
        if let Some(attachments) = item.get("attachments").and_then(|v| v.as_array()) {
            for attachment in attachments {
                hashes.push(
                    attachment
                        .get("hash")
                        .and_then(|v| v.as_str())
                        .filter(|hash| !hash.is_empty())
                        .context("attachment has no hash")?
                        .to_string(),
                );
            }
        }
        for key in ["comments", "childComments"] {
            if let Some(comments) = item.get(key).and_then(|v| v.as_array()) {
                for comment in comments {
                    collect(comment, hashes)?;
                }
            }
        }
        Ok(())
    }
    let mut hashes = Vec::new();
    for item in ctx.issues.iter().chain(&ctx.posts).chain(&ctx.milestones) {
        collect(item, &mut hashes)?;
    }
    hashes.sort();
    hashes.dedup();
    Ok(hashes)
}

/// Upload attachment files to `POST {to_url}/api/v1/site/import/files` as
/// multipart (hash + file), streaming from the legacy uploads directory.
/// Files already present on the server are skipped, so an interrupted run
/// resumes cleanly.
fn upload_attachment_files(
    to_url: &str,
    to_token: &str,
    hashes: Vec<String>,
    data_dir: &PathBuf,
) -> Result<String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;
    for hash in &hashes {
        let path = data_dir.join("uploads").join(hash);
        upload_one_file(&client, to_url, to_token, hash, &path)?;
    }
    Ok(format!("Attachment upload done: {} uploaded", hashes.len()))
}

/// POST one attachment file as multipart (`hash` + `file` fields).
fn upload_one_file(
    client: &reqwest::blocking::Client,
    to_url: &str,
    to_token: &str,
    hash: &str,
    path: &PathBuf,
) -> Result<()> {
    use reqwest::blocking::multipart::{Form, Part};
    use std::io::BufReader;

    let file = std::fs::File::open(path)
        .with_context(|| format!("failed to open attachment {}", path.display()))?;
    let length = file.metadata()?.len();
    let part = Part::reader_with_length(BufReader::new(file), length)
        .file_name(hash.to_string())
        .mime_str("application/octet-stream")
        .context("invalid upload part")?;
    let form = Form::new()
        .text("hash", hash.to_string())
        .part("file", part);
    let response = client
        .post(format!(
            "{}/api/v1/site/import/files",
            to_url.trim_end_matches('/')
        ))
        .bearer_auth(to_token)
        .multipart(form)
        .send()
        .context("attachment upload request failed")?;
    if !response.status().is_success() {
        anyhow::bail!("upload failed: HTTP {}", response.status());
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
fn fill_attachments(
    ctx: &mut site_transform::TransformationContext,
    data_dir: &PathBuf,
) -> Result<()> {
    fn fill(item: &mut serde_json::Value, data_dir: &PathBuf) -> Result<()> {
        if let Some(attachments) = item.get_mut("attachments").and_then(|v| v.as_array_mut()) {
            for attachment in attachments {
                let hash = attachment
                    .get("hash")
                    .and_then(|v| v.as_str())
                    .filter(|hash| !hash.is_empty())
                    .context("attachment has no hash")?;
                let content = from::read_attachment_base64(data_dir, hash)?;
                let padding = content
                    .bytes()
                    .rev()
                    .take(2)
                    .filter(|byte| *byte == b'=')
                    .count();
                let size = content.len() / 4 * 3 - padding;
                attachment["contentBase64"] = serde_json::Value::String(content);
                attachment["size"] = serde_json::json!(size);
            }
        }
        for key in ["comments", "childComments"] {
            if let Some(comments) = item.get_mut(key).and_then(|v| v.as_array_mut()) {
                for comment in comments {
                    fill(comment, data_dir)?;
                }
            }
        }
        Ok(())
    }
    for item in ctx
        .issues
        .iter_mut()
        .chain(&mut ctx.posts)
        .chain(&mut ctx.milestones)
    {
        fill(item, data_dir)?;
    }
    Ok(())
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
/// In-place repository preflight (runs by default when no --to-url is given):
/// every project must have a valid canonical repository —
/// git: `repo/git/{owner}/{project}.git` passing `git rev-parse --is-bare-repository`,
/// svn: `repo/svn/{owner}/{project}` with a valid `format` marker.
/// Any missing or invalid repository fails the migration (blocking error).
fn preflight_repositories(args: &Args, ctx: &site_transform::TransformationContext) -> Result<()> {
    let Some(data_root) = args.yoram_data_root.as_ref() else {
        anyhow::bail!(
            "repository preflight requires --yoram-data-root (the YONA_DATA root of the in-place target)"
        );
    };
    let mut failures = Vec::new();
    let mut checked = 0usize;
    for project in &ctx.projects {
        let owner = project
            .get("ownerName")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let name = project
            .get("projectName")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if owner.is_empty() || name.is_empty() {
            continue;
        }
        let vcs = project
            .get("projectVcs")
            .and_then(|v| v.as_str())
            .unwrap_or("GIT");
        checked += 1;
        if vcs.eq_ignore_ascii_case("Subversion") {
            let repo_path = data_root.join("repo").join("svn").join(owner).join(name);
            if !repo_path.is_dir() {
                failures.push(format!(
                    "MISSING svn repository for {owner}/{name}: {}",
                    repo_path.display()
                ));
            } else if !repo_path.join("format").is_file() {
                failures.push(format!(
                    "INVALID svn repository for {owner}/{name}: {} has no format marker",
                    repo_path.display()
                ));
            }
        } else {
            let repo_path = data_root
                .join("repo")
                .join("git")
                .join(owner)
                .join(format!("{name}.git"));
            if !repo_path.is_dir() {
                failures.push(format!(
                    "MISSING git repository for {owner}/{name}: {}",
                    repo_path.display()
                ));
                continue;
            }
            let output = Command::new("git")
                .args(["rev-parse", "--is-bare-repository"])
                .current_dir(&repo_path)
                .output();
            match output {
                Ok(output)
                    if output.status.success()
                        && String::from_utf8_lossy(&output.stdout).trim() == "true" => {}
                Ok(output) => failures.push(format!(
                    "INVALID git repository for {owner}/{name}: {}: {}",
                    repo_path.display(),
                    String::from_utf8_lossy(&output.stderr).trim()
                )),
                Err(error) => failures.push(format!(
                    "INVALID git repository for {owner}/{name}: {}: {error}",
                    repo_path.display()
                )),
            }
        }
    }
    if failures.is_empty() {
        eprintln!(
            "Repository preflight OK: {checked} repositories validated under {}",
            data_root.display()
        );
        return Ok(());
    }
    eprintln!(
        "Repository preflight FAILED with {} problem(s):",
        failures.len()
    );
    for failure in &failures {
        eprintln!("  {failure}");
    }
    anyhow::bail!("repository preflight found missing/invalid repositories")
}

fn transfer_repositories(args: &Args, ctx: &site_transform::TransformationContext) -> Result<()> {
    let Some(to_url) = &args.to_url else {
        // In-place flow (no --to-url): repository "transfer" is validation-only.
        return preflight_repositories(args, ctx);
    };
    let to_token = args
        .to_token
        .as_deref()
        .context("repository transfer requires --to-token")?;
    let to_login = args
        .to_login
        .as_deref()
        .context("repository transfer requires --to-login (or explicitly --with-repos=false)")?;
    let Some(repo_dir) = &args.from_repo_dir else {
        if let Some(yoram_url) = &args.from_yoram_url {
            return transfer_repositories_from_yoram(
                yoram_url,
                args.from_token.as_deref(),
                args.from_login.as_deref(),
                to_url,
                to_login,
                to_token,
                ctx,
            );
        }
        if args.from_password.is_none() {
            anyhow::bail!("repository transfer requires --from-repo-dir or --from-password (or explicitly --with-repos=false)");
        }
        return transfer_repositories_over_http(args, to_url, to_login, to_token, ctx);
    };

    for project in &ctx.projects {
        let Some(id) = project.get("id").and_then(|v| v.as_i64()) else {
            continue;
        };
        let owner = project
            .get("ownerName")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let name = project
            .get("projectName")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if owner.is_empty() || name.is_empty() || id <= 0 {
            continue;
        }
        let vcs = project
            .get("projectVcs")
            .and_then(|v| v.as_str())
            .unwrap_or("GIT");
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
    let from_url = args
        .from_url
        .as_deref()
        .context("repository transfer requires --from-url")?;
    let from_password = args
        .from_password
        .as_deref()
        .context("repository transfer requires --from-password")?;
    for project in &ctx.projects {
        let owner = project
            .get("ownerName")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let name = project
            .get("projectName")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if owner.is_empty() || name.is_empty() {
            continue;
        }
        let vcs = project
            .get("projectVcs")
            .and_then(|v| v.as_str())
            .unwrap_or("GIT");
        if vcs.eq_ignore_ascii_case("Subversion") {
            anyhow::bail!(
                "SVN HTTP transfer is unsupported for {owner}/{name}; use --from-repo-dir"
            );
        }
        let legacy_url = format!("{}/{}/{}.git", from_url.trim_end_matches('/'), owner, name);
        let mirror = format!("{}/{}/{}.git", to_url.trim_end_matches('/'), owner, name);
        let mirror = with_basic_auth_url(&mirror, to_login, to_token);
        let source = with_basic_auth_url(&legacy_url, owner, from_password);
        eprintln!("Mirror-cloning {} ...", legacy_url);
        run_cmd(
            "git",
            &[
                "clone",
                "--mirror",
                &source,
                &format!(".yona-migrate-{}-{}.git", owner, name),
            ],
        )?;
        run_cmd(
            "git",
            &[
                "-C",
                &format!(".yona-migrate-{}-{}.git", owner, name),
                "push",
                "--mirror",
                &mirror,
            ],
        )?;
        let _ = std::fs::remove_dir_all(format!(".yona-migrate-{}-{}.git", owner, name));
    }
    Ok(())
}

fn transfer_repositories_from_yoram(
    from_url: &str,
    from_token: Option<&str>,
    from_login: Option<&str>,
    to_url: &str,
    to_login: &str,
    to_token: &str,
    ctx: &site_transform::TransformationContext,
) -> Result<()> {
    let from_token = from_token.context("repository transfer requires --from-token")?;
    for project in &ctx.projects {
        let owner = project
            .get("ownerName")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let name = project
            .get("projectName")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if owner.is_empty() || name.is_empty() {
            continue;
        }
        let vcs = project
            .get("projectVcs")
            .and_then(|v| v.as_str())
            .unwrap_or("GIT");
        if vcs.eq_ignore_ascii_case("Subversion") {
            anyhow::bail!(
                "SVN HTTP transfer is unsupported for {owner}/{name}; use --from-repo-dir"
            );
        }
        // Yoram smart HTTP Basic auth is `login:api-token`.
        let source_login = from_login.unwrap_or(owner);
        let source_url = format!("{}/{}/{}.git", from_url.trim_end_matches('/'), owner, name);
        let source = with_basic_auth_url(&source_url, source_login, from_token);
        let mirror = format!("{}/{}/{}.git", to_url.trim_end_matches('/'), owner, name);
        let mirror = with_basic_auth_url(&mirror, to_login, to_token);
        let clone_dir = format!(".yona-migrate-{}-{}.git", owner, name);
        eprintln!("Mirror-cloning {source_url} ...");
        let _ = std::fs::remove_dir_all(&clone_dir);
        run_cmd("git", &["clone", "--mirror", &source, &clone_dir])?;
        let push = run_cmd("git", &["-C", &clone_dir, "push", "--mirror", &mirror]);
        let _ = std::fs::remove_dir_all(&clone_dir);
        push?;
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
    let source = [
        repo_dir.join(id.to_string()),
        repo_dir.join(format!("{id}.git")),
    ]
    .into_iter()
    .find(|path| path.exists());
    let Some(source) = source else {
        anyhow::bail!(
            "git repository for project id {id} ({owner}/{name}) not found in {}",
            repo_dir.display()
        );
    };
    let mirror = format!("{}/{}/{}.git", to_url.trim_end_matches('/'), owner, name);
    let mirror = with_basic_auth_url(&mirror, to_login, to_token);
    let clone_dir = format!(".yona-migrate-{}-{}.git", owner, name);
    eprintln!("Mirroring git repo {} -> {owner}/{name}", source.display());
    let _ = std::fs::remove_dir_all(&clone_dir);
    run_cmd(
        "git",
        &["clone", "--bare", &source.display().to_string(), &clone_dir],
    )?;
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
        anyhow::bail!(
            "SVN repository for {owner}/{name} missing: {}",
            source.display()
        );
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
    let dump_file =
        std::fs::File::open(&dump_path).with_context(|| format!("failed to open {}", dump_path))?;
    let output = Command::new("svnrdump")
        .args([
            "load",
            "--username",
            to_login,
            "--password",
            to_token,
            &target,
        ])
        .stdin(std::process::Stdio::from(dump_file))
        .output()
        .context("failed to spawn svnrdump")?;
    if !output.status.success() {
        anyhow::bail!("svnrdump load failed; migration is incomplete. Dump retained at {dump_path}; load it into the separate target with svnadmin and verify UUID/revisions before cutover");
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
        anyhow::bail!("{program} failed with status {}; command arguments and subprocess output withheld because they may contain credentials", output.status);
    }
    Ok(())
}
