use serde::Serialize;
use std::io::Write;
use std::path::{Path, PathBuf};
use yoram_migration::legacy_external::project_export_mapper::{
    stream_yona_export_to_import_records, ProjectExportMapError, YonaImportRecord,
};
use yoram_migration::legacy_external::yona_export_adapter::{
    map_yona_export_project_directory_to_yobi_data, read_yona_export_attachment_bytes,
};

#[derive(Serialize)]
struct NdjsonLine<T: Serialize> {
    kind: &'static str,
    #[serde(flatten)]
    record: T,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    let mut format = "ndjson";
    let mut positional = Vec::new();
    let mut index = 0;
    while index < args.len() {
        match args[index].as_str() {
            "--format" => {
                index += 1;
                format = args.get(index).map(String::as_str).unwrap_or("ndjson");
            }
            other => positional.push(other.to_string()),
        }
        index += 1;
    }
    if positional.len() < 2 || positional.len() > 3 {
        eprintln!(
            "Usage: yona-export-to-yobi-data <legacy-project-export.json> <legacy-project-export-dir> [--format ndjson|json] [output]"
        );
        std::process::exit(2);
    }

    let output = positional.get(2).map(PathBuf::from);
    match format {
        "json" => {
            eprintln!("warning: --format json is deprecated; prefer --format ndjson (streaming)");
            let snapshot =
                map_yona_export_project_directory_to_yobi_data(&positional[0], &positional[1])?;
            let text = serde_json::to_string_pretty(&snapshot)?;
            match output {
                Some(path) => std::fs::write(path, text)?,
                None => println!("{text}"),
            }
        }
        "ndjson" => {
            let export_dir = Path::new(&positional[1]);
            let mut writer: Box<dyn Write> = match output {
                Some(path) => Box::new(std::fs::File::create(path)?),
                None => Box::new(std::io::stdout()),
            };
            stream_ndjson(&positional[0], export_dir, &mut writer)?;
            writer.flush()?;
        }
        other => {
            eprintln!("unknown --format {other}");
            std::process::exit(2);
        }
    }
    Ok(())
}

/// Emits canonical NDJSON (project, members, labels, milestones, issues,
/// posts) in two passes over the yona-export JSON. A yona-export JSON orders
/// its arrays issues -> posts -> milestones, while the Yoram import consumes
/// small sections (members/labels/milestones) before the large post/issue
/// sections; milestones must therefore be emitted before issues. Small
/// sections are buffered in neither pass, so memory stays O(1) per record.
fn stream_ndjson(
    json_path: &str,
    export_dir: &Path,
    writer: &mut dyn Write,
) -> Result<(), Box<dyn std::error::Error>> {
    for pass in 0..2 {
        let json_file = std::fs::File::open(json_path)?;
        let attachment_content_base64 =
            move |id: i64| read_yona_export_attachment_bytes(export_dir, id);
        let mut emit = |record: YonaImportRecord| -> Result<(), ProjectExportMapError> {
            let keep = match &record {
                YonaImportRecord::Project(_)
                | YonaImportRecord::Member(_)
                | YonaImportRecord::Label(_)
                | YonaImportRecord::Milestone(_) => pass == 0,
                YonaImportRecord::Post(_) | YonaImportRecord::Issue(_) => pass == 1,
            };
            if !keep {
                return Ok(());
            }
            let line = match record {
                YonaImportRecord::Project(record) => serde_json::to_string(&NdjsonLine {
                    kind: "project",
                    record,
                }),
                YonaImportRecord::Member(record) => serde_json::to_string(&NdjsonLine {
                    kind: "member",
                    record,
                }),
                YonaImportRecord::Label(record) => serde_json::to_string(&NdjsonLine {
                    kind: "label",
                    record,
                }),
                YonaImportRecord::Milestone(record) => serde_json::to_string(&NdjsonLine {
                    kind: "milestone",
                    record,
                }),
                YonaImportRecord::Post(record) => serde_json::to_string(&NdjsonLine {
                    kind: "post",
                    record,
                }),
                YonaImportRecord::Issue(record) => serde_json::to_string(&NdjsonLine {
                    kind: "issue",
                    record,
                }),
            }
            .map_err(ProjectExportMapError::InvalidJson)?;
            writeln!(writer, "{line}").map_err(ProjectExportMapError::Emit)
        };
        stream_yona_export_to_import_records(json_file, attachment_content_base64, &mut emit)?;
    }
    Ok(())
}
