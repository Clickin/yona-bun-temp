use std::fs;
use std::path::{Path, PathBuf};

fn main() {
    println!("cargo:rerun-if-env-changed=YONA_EMBED_ASSET_ROOT");

    generate_embedded_assets().expect("failed to generate embedded assets");
}

fn generate_embedded_assets() -> std::io::Result<()> {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").expect("manifest dir"));
    let source_root = std::env::var("YONA_EMBED_ASSET_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| manifest_dir.join("testdata").join("embed-assets"));
    let source_root = source_root
        .canonicalize()
        .unwrap_or_else(|_| panic!("embedded asset root not found: {}", source_root.display()));

    let out_dir = PathBuf::from(std::env::var("OUT_DIR").expect("out dir"));
    let copied_root = out_dir.join("embedded-assets");
    if copied_root.exists() {
        fs::remove_dir_all(&copied_root)?;
    }
    fs::create_dir_all(&copied_root)?;

    let mut files = Vec::new();
    copy_asset_tree(&source_root, &copied_root, &source_root, &mut files)?;
    fs::write(
        out_dir.join("_embedded_assets.rs"),
        render_embedded_assets_module(&copied_root, &files),
    )?;

    Ok(())
}

fn copy_asset_tree(
    source_root: &Path,
    target_root: &Path,
    current: &Path,
    files: &mut Vec<String>,
) -> std::io::Result<()> {
    println!("cargo:rerun-if-changed={}", current.display());

    for entry in fs::read_dir(current)? {
        let entry = entry?;
        let path = entry.path();
        if entry.file_type()?.is_dir() {
            copy_asset_tree(source_root, target_root, &path, files)?;
            continue;
        }

        let relative = path.strip_prefix(source_root).expect("relative asset path");
        let relative_string = relative.to_string_lossy().replace('\\', "/");
        let target = target_root.join(relative);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(&path, &target)?;
        files.push(relative_string);
    }

    Ok(())
}

fn render_embedded_assets_module(copied_root: &Path, files: &[String]) -> String {
    let mut sorted = files.to_vec();
    sorted.sort();

    let match_arms = sorted
        .iter()
        .map(|relative| {
            let full = copied_root.join(relative);
            format!(
                "        \"{relative}\" => Some(include_bytes!(r#\"{}\"#) as &'static [u8]),\n",
                full.display()
            )
        })
        .collect::<String>();

    format!(
        "pub fn get(path: &str) -> Option<&'static [u8]> {{\n    match path {{\n{match_arms}        _ => None,\n    }}\n}}\n"
    )
}
