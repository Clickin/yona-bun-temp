# Search-category fallback-off report

The shared `.search-category-wrap` family is retired from `frontend/src/app.css`.
Global, project, and organization search already own the category list, item,
link, active, and empty declarations in StyleX. Frozen LESS and generated
fallback CSS remain unchanged as historical evidence.

This bounded wave also retires the exact shared `.search-list-item` row arm.
Route-specific `.search-box-wrap`, `.search-result-title`, `.search-list-wrap`,
content/meta, and empty-result declarations remain pending geometry and consumer
proof.

The formal fallback-off contract checks exact family absence, neighboring-rule
retention, and all three route owner/source contracts in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes.

The attempted three-route browser replay (`stylex-global-search-category.e2e.ts`,
`stylex-project-search-category.e2e.ts`, and `stylex-organization-search-category.e2e.ts`)
was blocked by the Playwright-managed frontend webServer readiness timeout after the backend
started; no route assertion result was used as acceptance evidence.
