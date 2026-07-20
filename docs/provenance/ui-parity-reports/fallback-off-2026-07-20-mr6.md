# `.mr6` fallback-off report

This bounded retirement removes only the source-less `.mr6` utility arm from
`frontend/src/app.css`. Current React/TSX sources emit no `mr6`; frozen and
generated legacy CSS remain unchanged as historical evidence. Neighboring
margin utility declarations are intentionally retained.

`frontend/tests/legacy-fallback-off.e2e.ts` checks exact app.css absence and
the current no-emitter inventory in both normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes.
