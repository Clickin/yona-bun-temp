# `.ml20` fallback-off report

This bounded retirement removes only the source-less `.ml20` utility arm from
`frontend/src/app.css`. Current React/TSX sources emit no `ml20`; frozen and
generated legacy CSS remain unchanged as historical evidence. Neighboring
utility declarations are intentionally retained.

`frontend/tests/legacy-fallback-off.e2e.ts` checks exact app.css absence and
the current no-emitter inventory in both normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes.
