use std::io::Read;
use yona_rust_pilot_migration::import_checkpoint::summarize_site_import_report_json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    if args.len() > 1 {
        eprintln!("Usage: yobi-import-checkpoint [site-import-report.json]");
        std::process::exit(2);
    }

    let mut input = String::new();
    if let Some(path) = args.first() {
        input = std::fs::read_to_string(path)?;
    } else {
        std::io::stdin().read_to_string(&mut input)?;
    }

    let summary = summarize_site_import_report_json(&input)?;
    println!("{}", serde_json::to_string_pretty(&summary)?);
    Ok(())
}
