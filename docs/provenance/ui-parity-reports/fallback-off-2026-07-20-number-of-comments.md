# Fallback-off report: `.number-of-comments` bridge — 2026-07-20

Batch 653 retires the source-less React-side `.number-of-comments` declaration
from `frontend/src/app.css`. Current React source emits no matching class;
frozen Scala/LESS and generated fallback remain historical evidence.

Commands:

- Normal: `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store exec node scripts/run-playwright-e2e.mjs --grep "source-less number-of-comments bridge has no app.css arm"`
- Fallback off: `VITE_DISABLE_LEGACY_FALLBACK=1 pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store exec node scripts/run-playwright-e2e.mjs --grep "source-less number-of-comments bridge has no app.css arm"`

Both managed-port runs passed `1/1`. The contract verifies exact app.css arm
absence, retained neighboring `.commitMsg.short`, no current React emitter,
and generated fallback evidence. The generated fallback CSS hash remained
`8b437655422bcfe1e612e7320362c3b52e6f65ec43c064dd344e8e7e5de18be6`.

