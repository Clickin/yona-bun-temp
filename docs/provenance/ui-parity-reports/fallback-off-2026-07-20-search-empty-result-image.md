# Search empty-result image-owner parity report — 2026-07-20

The global, project, and organization search empty-result StyleX owners now
carry the frozen `no_contents.jpg` background. Each route resolves the asset
with `prefixBasePath(runtimeConfig.basePath, "/legacy-assets/images/no_contents.jpg")`,
so the browser path remains correct under `/yona` and root deployments.

The legacy `.empty-result` DOM/class contract, frozen Scala/LESS sources, and
generated fallback CSS remain unchanged. The prior fallback-retirement report
recorded the missing image as a follow-up gap; this batch closes that specific
owner gap without claiming unrelated baseline or fixture issues are resolved.
