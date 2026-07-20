# Fallback-off project-issues dead bridge contract — 2026-07-20

The bounded fallback contract now asserts that the unreachable
`.issue-list-page .post-list-wrap` selector is absent while the active generic
`.post-list-wrap` reset remains. The project issues route source is also
asserted not to emit the retired ancestor class.

Managed fallback-off execution passed the focused project-issues contract (1
passed). The existing fallback-off discovery contract confirms that the
generated `legacy-assets/stylesheets/legacy-fallback.css` link is absent when
`VITE_DISABLE_LEGACY_FALLBACK=1`; no generated fallback CSS, frozen source, or
geometry baseline was changed. This retirement is limited to the single dead
app.css declaration.
