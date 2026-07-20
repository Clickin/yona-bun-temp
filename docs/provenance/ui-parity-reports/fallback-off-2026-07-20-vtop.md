# `.vtop` fallback-off report

This bounded retirement removes only the source-less `.vtop` alias from the
grouped vertical-alignment utility. The live `.vertical-top` declaration is
retained, while frozen and generated legacy CSS remain unchanged as historical
evidence.

`frontend/tests/legacy-fallback-off.e2e.ts` checks alias absence, sibling
retention, and the current no-emitter inventory in both normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes.
