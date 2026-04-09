use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::Deserialize;
use yona_rust_pilot_migration::RuntimeSchemaPolicy;

use crate::RuntimeConfig;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StartupConfig {
    pub asset_root: Option<String>,
    pub database_url: String,
    pub runtime: RuntimeConfig,
    pub schema_policy: RuntimeSchemaPolicy,
    pub seed_pilot: bool,
    pub use_embedded_assets: bool,
}

#[derive(Default, Deserialize)]
struct StartupConfigFile {
    asset_root: Option<String>,
    base_path: Option<String>,
    database_url: Option<String>,
    public_origin: Option<String>,
    schema_policy: Option<String>,
    seed_pilot: Option<bool>,
    use_embedded_assets: Option<bool>,
}

pub fn load_startup_config(
    env: BTreeMap<String, String>,
    current_dir: &Path,
) -> anyhow::Result<StartupConfig> {
    let file = read_startup_config_file(&env, current_dir)?;

    let base_path = env
        .get("YONA_BASE_PATH")
        .cloned()
        .or(file.base_path)
        .unwrap_or_default();
    let public_origin = env
        .get("YONA_PUBLIC_ORIGIN")
        .cloned()
        .or(file.public_origin)
        .unwrap_or_default();
    let database_url = env
        .get("YONA_DATABASE_URL")
        .cloned()
        .or(file.database_url)
        .unwrap_or_else(|| "sqlite::memory:".to_string());

    let schema_policy = env
        .get("YONA_SCHEMA_POLICY")
        .cloned()
        .or(file.schema_policy)
        .unwrap_or_else(|| "up".to_string())
        .parse::<RuntimeSchemaPolicy>()
        .map_err(anyhow::Error::msg)?;

    let seed_pilot = env_bool(&env, "YONA_SEED_PILOT")
        .or(file.seed_pilot)
        .unwrap_or(false);
    let use_embedded_assets = env_bool(&env, "YONA_USE_EMBEDDED_ASSETS")
        .or(file.use_embedded_assets)
        .unwrap_or(false);
    let asset_root = env.get("YONA_ASSET_ROOT").cloned().or(file.asset_root);

    Ok(StartupConfig {
        asset_root,
        database_url,
        runtime: RuntimeConfig {
            base_path,
            public_origin,
        },
        schema_policy,
        seed_pilot,
        use_embedded_assets,
    })
}

pub fn load_startup_config_from_env() -> anyhow::Result<StartupConfig> {
    let env: BTreeMap<String, String> = std::env::vars().collect();
    let current_dir = std::env::current_dir()?;
    load_startup_config(env, &current_dir)
}

pub fn normalize_base_path(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() || trimmed == "/" {
        return "/".to_string();
    }

    let with_leading = if trimmed.starts_with('/') {
        trimmed.to_string()
    } else {
        format!("/{trimmed}")
    };

    let collapsed = with_leading.replace("//", "/");
    let normalized = collapsed.trim_end_matches('/');

    if normalized.is_empty() {
        "/".to_string()
    } else {
        normalized.to_string()
    }
}

pub fn join_base_path(base_path: &str, suffix: &str) -> String {
    if base_path == "/" {
        return suffix.to_string();
    }

    format!("{base_path}{suffix}")
}

fn env_bool(env: &BTreeMap<String, String>, key: &str) -> Option<bool> {
    env.get(key)
        .map(|value| matches!(value.trim(), "1" | "true" | "TRUE" | "True"))
}

fn read_startup_config_file(
    env: &BTreeMap<String, String>,
    current_dir: &Path,
) -> anyhow::Result<StartupConfigFile> {
    let explicit_path = env.get("YONA_CONFIG_TOML").map(PathBuf::from);
    let config_path = explicit_path.or_else(|| {
        let default_path = current_dir.join("yona.toml");
        default_path.exists().then_some(default_path)
    });

    let Some(config_path) = config_path else {
        return Ok(StartupConfigFile::default());
    };

    let text = fs::read_to_string(&config_path)?;
    let parsed: StartupConfigFile = toml::from_str(&text)?;
    Ok(parsed)
}
