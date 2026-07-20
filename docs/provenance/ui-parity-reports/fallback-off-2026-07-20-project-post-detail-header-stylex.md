# Project post-detail header StyleX wave — 2026-07-20

The authenticated board-post detail header now owns its title, post id, date,
mobile metadata visibility, and original-message toggle declarations through
the route-local `-post-detail.stylex.ts` definitions. Legacy `board-header`,
`title`, `board-id`, and `date` classes remain for shared fallback consumers.

The wave also corrected two existing class/fallback boundaries: mobile metadata
now uses conditional StyleX display (`none` with the frozen max-720 `block`
state), and the original-message toggle uses explicit `borderStyle:none` and
`borderWidth:0` so StyleX emits the declaration instead of exposing the browser
button border when fallback is disabled.

Evidence: `stylex-project-post-detail-inline-residual.e2e.ts` passes in normal
and `VITE_DISABLE_LEGACY_FALLBACK=1` modes at desktop and 390px, including
header computed values, mobile visibility, and toggle border/padding.
