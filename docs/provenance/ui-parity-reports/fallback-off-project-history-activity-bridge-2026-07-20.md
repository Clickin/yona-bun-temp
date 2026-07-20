# Fallback-off project-history activity bridge contract — 2026-07-20

The generic project-history wrapper declarations were retired from
`frontend/src/app.css`:

- `.content-container .main-stream { margin-bottom: 15px; }`
- `.content-container .main-stream .activity-streams { margin: 0; }`

The only current React consumer is `HistoryPane` in
`frontend/src/routes/$ownerName/$projectName.tsx`, where
`projectHistoryStyles.stream` and `projectHistoryStyles.activityStreams` own
the same declarations. The legacy item-specific `:first-of-type` padding and
`:last-child` border rules remain in fallback because their conditional StyleX
variants are not yet owned. Frozen Scala/LESS sources were not modified.

The static contract is covered by
`stylex-project-history-typography.e2e.ts` and
`legacy-fallback-off.e2e.ts`; both assert exact generic-selector absence and
retention of the item-specific fallback variants. Focused normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` runs passed with no geometry baseline or
generated fallback changes.
