use std::collections::BTreeMap;
use std::fs;

use tempfile::tempdir;
use yona_rust_pilot_migration::RuntimeSchemaPolicy;
use yona_rust_pilot_server::runtime_config::{
    join_base_path, load_startup_config, normalize_base_path,
};

#[test]
fn normalizes_base_paths_like_the_go_pilot() {
    assert_eq!(normalize_base_path(""), "/");
    assert_eq!(normalize_base_path("/"), "/");
    assert_eq!(normalize_base_path("yona"), "/yona");
    assert_eq!(normalize_base_path("/yona/"), "/yona");
    assert_eq!(normalize_base_path("/tools/yona//"), "/tools/yona");
}

#[test]
fn joins_base_paths_without_double_slashes() {
    assert_eq!(
        join_base_path("/", "/api/auth/session"),
        "/api/auth/session"
    );
    assert_eq!(join_base_path("/yona", "/rpc"), "/yona/rpc");
}

#[test]
fn loads_startup_config_from_toml_file() {
    let dir = tempdir().expect("tempdir");
    let config_path = dir.path().join("yona.toml");
    fs::write(
        &config_path,
        r#"
base_path = "/toml"
public_origin = "https://example.com"
database_url = "mysql://db"
schema_policy = "adopt"
seed_pilot = true
use_embedded_assets = true
asset_root = "C:/assets"
"#,
    )
    .expect("write config");

    let config = load_startup_config(
        BTreeMap::from([(
            "YONA_CONFIG_TOML".to_string(),
            config_path.to_string_lossy().into_owned(),
        )]),
        dir.path(),
    )
    .expect("load startup config");

    assert_eq!(config.runtime.base_path, "/toml");
    assert_eq!(config.runtime.public_origin, "https://example.com");
    assert_eq!(config.database_url, "mysql://db");
    assert_eq!(config.schema_policy, RuntimeSchemaPolicy::Adopt);
    assert_eq!(config.seed_pilot, true);
    assert_eq!(config.use_embedded_assets, true);
    assert_eq!(config.asset_root.as_deref(), Some("C:/assets"));
    assert_eq!(config.bind_addr, "127.0.0.1:8089");
}

#[test]
fn environment_overrides_toml_values() {
    let dir = tempdir().expect("tempdir");
    let config_path = dir.path().join("yona.toml");
    fs::write(
        &config_path,
        r#"
base_path = "/toml"
public_origin = "https://example.com"
database_url = "mysql://db"
schema_policy = "adopt"
seed_pilot = false
bind_addr = "127.0.0.1:19089"
"#,
    )
    .expect("write config");

    let config = load_startup_config(
        BTreeMap::from([
            (
                "YONA_CONFIG_TOML".to_string(),
                config_path.to_string_lossy().into_owned(),
            ),
            ("YONA_BASE_PATH".to_string(), "/env".to_string()),
            (
                "YONA_PUBLIC_ORIGIN".to_string(),
                "https://env.example.com".to_string(),
            ),
            (
                "YONA_DATABASE_URL".to_string(),
                "sqlite::memory:".to_string(),
            ),
            (
                "YONA_SCHEMA_POLICY".to_string(),
                "validate_only".to_string(),
            ),
            ("YONA_SEED_PILOT".to_string(), "1".to_string()),
            ("YONA_BIND_ADDR".to_string(), "127.0.0.1:29089".to_string()),
        ]),
        dir.path(),
    )
    .expect("load startup config");

    assert_eq!(config.runtime.base_path, "/env");
    assert_eq!(config.runtime.public_origin, "https://env.example.com");
    assert_eq!(config.database_url, "sqlite::memory:");
    assert_eq!(config.schema_policy, RuntimeSchemaPolicy::ValidateOnly);
    assert_eq!(config.seed_pilot, true);
    assert_eq!(config.bind_addr, "127.0.0.1:29089");
}

#[test]
fn invalid_schema_policy_in_toml_is_rejected() {
    let dir = tempdir().expect("tempdir");
    let config_path = dir.path().join("yona.toml");
    fs::write(&config_path, "schema_policy = \"broken\"\n").expect("write config");

    let error = load_startup_config(
        BTreeMap::from([(
            "YONA_CONFIG_TOML".to_string(),
            config_path.to_string_lossy().into_owned(),
        )]),
        dir.path(),
    )
    .expect_err("invalid policy should fail");

    assert!(
        error.to_string().contains("unsupported schema policy"),
        "{error}"
    );
}
