#[test]
fn embedded_asset_build_script_prefers_frontend_dist_when_env_is_absent() {
    let build_script = include_str!("../build.rs");

    assert!(build_script.contains("YONA_EMBED_ASSET_ROOT"));
    assert!(build_script.contains("join(\"frontend\").join(\"dist\")"));
    assert!(build_script.contains("frontend_dist.join(\"index.html\").is_file()"));
    assert!(build_script.contains("testdata"));
    assert!(build_script.contains("embed-assets"));
}
