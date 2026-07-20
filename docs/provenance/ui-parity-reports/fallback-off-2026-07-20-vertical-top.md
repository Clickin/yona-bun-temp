# `.vertical-top` fallback-off report

This bounded retirement removes only the source-less `.vertical-top` utility
arm from `frontend/src/app.css`. Its `.vtop` alias was retired previously;
current React/TSX sources emit neither class. Frozen and generated legacy CSS
remain unchanged as historical evidence.

`frontend/tests/legacy-fallback-off.e2e.ts` checks exact app.css absence and
the current no-emitter inventory in both normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes.
