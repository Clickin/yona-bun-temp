/// CLI harness for yona-migrate — streaming REST-to-REST migration tool.
///
/// # Usage
///
/// ## Site-level (one-time migration from legacy Yona):
/// ```sh
/// yona-migrate \
///   --from-url "https://legacy.yona.io" \
///   --from-token "xxx" \
///   --to-url "http://localhost:4000" \
///   --to-token "admin" \
///   --yona-data-dir /path/to/uploads
/// ```
///
/// ## Project-level (per-project sync):
/// ```sh
/// yona-migrate \
///   --from-url "https://legacy.yona.io" \
///   --from-owner "myorg" \
///   --from-project "myproject" \
///   --from-token "xxx" \
///   --to-url "http://localhost:4000" \
///   --to-token "admin"
/// ```
///
/// ## File output (backup):
/// ```sh
/// yona-migrate \
///   --from-url "https://legacy.yona.io" \
///   --from-token "xxx" \
///   --to-file /tmp/backup.json
/// ```
use std::path::PathBuf;

use anyhow::Result;
use clap::Parser;

mod from;
mod site_transform;
mod stream_reader;
mod to;

#[derive(Parser)]
#[command(name = "yona-migrate", version, about = "Streaming Yona-to-Yoram migration tool")]
struct Args {
    /// Source URL (legacy Yona or Yoram instance)
    #[arg(long, group = "from")]
    from_url: Option<String>,

    /// Source API token
    #[arg(long, requires = "from_url")]
    from_token: Option<String>,

    /// Source owner name (for project-level export)
    #[arg(long, requires = "from_url")]
    from_owner: Option<String>,

    /// Source project name (for project-level export)
    #[arg(long, requires = "from_url")]
    from_project: Option<String>,

    /// Source file (skip REST fetch, read from file instead)
    #[arg(long)]
    from_file: Option<PathBuf>,

    /// Target URL (Yoram instance)
    #[arg(long, group = "to")]
    to_url: Option<String>,

    /// Target API token
    #[arg(long, requires = "to_url")]
    to_token: Option<String>,

    /// Output file (skip REST POST, write to file instead)
    #[arg(long)] // ponytail: standalone --to-file without --to-url
    to_file: Option<PathBuf>,

    /// Yona data directory for attachment files (site-level migration only)
    #[arg(short = 'd', long)]
    yona_data_dir: Option<PathBuf>,

    /// Dry run — validate but don't import
    #[arg(long)]
    dry_run: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();
    tracing_subscriber::fmt::init();

    // Mode detection
    match determine_mode(&args) {
        Mode::SiteLevel => run_site_export(&args),
        Mode::ProjectLevel => run_project_export(&args),
        Mode::FileRead => run_file_read(&args),
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
}

fn determine_mode(args: &Args) -> Mode {
    if args.from_file.is_some() {
        return Mode::FileRead;
    }
    let has_from = args.from_url.is_some() && args.from_token.is_some();
    if !has_from {
        die("Specify --from-url and --from-token or --from-file");
    }
    if args.from_owner.is_some() && args.from_project.is_some() {
        Mode::ProjectLevel
    } else {
        Mode::SiteLevel
    }
}

fn run_site_export(args: &Args) -> Result<()> {
    let from_url = args.from_url.as_deref().unwrap();
    let token = args.from_token.as_deref().unwrap();

    eprintln!("Reading site export from {} ...", from_url);

    let source = from::read_site_export(from_url, token)?;
    eprintln!("Read {} tables from source", source.tables.len());

    // Transform
    let mut ctx = site_transform::TransformationContext::new();
    let total_rows: usize = source
        .tables
        .iter()
        .map(|(name, rows)| {
            site_transform::transform_table(name, rows.clone(), &mut ctx);
            rows.len()
        })
        .sum();
    eprintln!(
        "Transformed {} rows across {} tables",
        total_rows,
        source.tables.len()
    );

    // Handle attachments if data dir is provided
    if let Some(data_dir) = &args.yona_data_dir {
        eprintln!("Processing attachments from {} ...", data_dir.display());
        for issue in &mut ctx.issues {
            if let Some(attachments) = issue.get_mut("attachments").and_then(|v| v.as_array_mut()) {
                for att in attachments {
                    if let Some(hash) = att.get("hash").and_then(|v| v.as_str()) {
                        match from::read_attachment_base64(data_dir, hash) {
                            Ok(content) => {
                                att["content_base64"] = serde_json::Value::String(content);
                            }
                            Err(e) => {
                                eprintln!("Warning: failed to read attachment {}: {}", hash, e);
                            }
                        }
                    }
                }
            }
        }
        for post in &mut ctx.posts {
            if let Some(attachments) = post.get_mut("attachments").and_then(|v| v.as_array_mut()) {
                for att in attachments {
                    if let Some(hash) = att.get("hash").and_then(|v| v.as_str()) {
                        match from::read_attachment_base64(data_dir, hash) {
                            Ok(content) => {
                                att["content_base64"] = serde_json::Value::String(content);
                            }
                            Err(e) => {
                                eprintln!("Warning: failed to read attachment {}: {}", hash, e);
                            }
                        }
                    }
                }
            }
        }
    }

    // Check output mode
    let payload = serde_json::to_value(&ctx)?;

    if args.dry_run {
        eprintln!("DRY RUN — would import:");
        eprintln!("  users: {}", ctx.users.len());
        eprintln!("  projects: {}", ctx.projects.len());
        eprintln!("  project_members: {}", ctx.project_members.len());
        eprintln!("  labels: {}", ctx.labels.len());
        eprintln!("  milestones: {}", ctx.milestones.len());
        eprintln!("  issues: {}", ctx.issues.len());
        eprintln!("  posts: {}", ctx.posts.len());
        return Ok(());
    }

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
    } else {
        to::write_to_stdout(&payload)?;
    }

    Ok(())
}

fn run_project_export(args: &Args) -> Result<()> {
    let from_url = args.from_url.as_deref().unwrap();
    let token = args.from_token.as_deref().unwrap();
    let owner = args.from_owner.as_deref().unwrap();
    let project = args.from_project.as_deref().unwrap();

    eprintln!("Reading project export: {}/{} from {} ...", owner, project, from_url);

    let payload = from::read_project_export(from_url, token, owner, project)?;

    if args.dry_run {
        eprintln!("DRY RUN — would import project export");
        eprintln!(
            "Payload keys: {:?}",
            payload.as_object().map(|o| o.keys().collect::<Vec<_>>())
        );
        return Ok(());
    }

    if let Some(file_path) = &args.to_file {
        to::write_to_file(file_path, &payload)?;
        eprintln!("Wrote project export to {}", file_path.display());
        return Ok(());
    }

    if let Some(to_url) = &args.to_url {
        let to_token = args.to_token.as_deref().unwrap();
        eprintln!("Importing project into {} ...", to_url);
        let result = to::write_project_import(to_url, to_token, owner, project, &payload)?;
        eprintln!("Import result: {}", serde_json::to_string_pretty(&result)?);
    } else {
        to::write_to_stdout(&payload)?;
    }

    Ok(())
}

fn run_file_read(args: &Args) -> Result<()> {
    let file_path = args.from_file.as_ref().unwrap();
    eprintln!("Reading from file {} ...", file_path.display());

    let payload = from::read_from_file(file_path)?;

    // Determine format: check if it has top-level tables (site export) or single project data
    if let Some(map) = payload.as_object() {
        let has_tables = map.keys().any(|k| matches!(k.as_str(), "n4user" | "users" | "project" | "projects"));
        if has_tables {
            // Site export format — transform and write
            let mut ctx = site_transform::TransformationContext::new();
            for (name, value) in map {
                if let Some(rows) = value.as_array() {
                    site_transform::transform_table(name, rows.clone(), &mut ctx);
                }
            }
            let output = serde_json::to_value(&ctx)?;

            if let Some(file_path) = &args.to_file {
                to::write_to_file(file_path, &output)?;
                eprintln!("Wrote transformed export to {}", file_path.display());
            } else if let Some(to_url) = &args.to_url {
                let to_token = args.to_token.as_deref().unwrap();
                let result = to::write_site_import(to_url, to_token, &output)?;
                eprintln!("Import result: {}", serde_json::to_string_pretty(&result)?);
            } else {
                to::write_to_stdout(&output)?;
            }
        } else {
            // Single project — passthrough
            if let Some(file_path) = &args.to_file {
                to::write_to_file(file_path, &payload)?;
                eprintln!("Wrote project export to {}", file_path.display());
            } else {
                to::write_to_stdout(&payload)?;
            }
        }
    }

    Ok(())
}