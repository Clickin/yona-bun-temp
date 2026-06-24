use std::path::PathBuf;
use yoram_migration::legacy_external::yona_export_adapter::map_yona_export_project_directory_to_yobi_data;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    if args.len() < 2 || args.len() > 3 {
        eprintln!(
            "Usage: yona-export-to-yobi-data <legacy-project-export.json> <legacy-project-export-dir> [output-yobi-data.json]"
        );
        std::process::exit(2);
    }

    let snapshot = map_yona_export_project_directory_to_yobi_data(&args[0], &args[1])?;
    let output = serde_json::to_string_pretty(&snapshot)?;
    if let Some(output_path) = args.get(2).map(PathBuf::from) {
        std::fs::write(output_path, output)?;
    } else {
        println!("{output}");
    }

    Ok(())
}
