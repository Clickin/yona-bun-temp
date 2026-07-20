# Fallback-off report: dead project-home status bridge

Batch 600 retires only the React-side `.project-home .inner header
.project-status` block and its `.ico-like`, `.num`, and `.sp` descendants from
`frontend/src/app.css`. Current React project-home routes emit no
`project-status` consumer. The frozen Scala/LESS source and generated fallback
remain unchanged as historical output evidence.

The project-home side-panel and formal `legacy-fallback-off.e2e.ts` contracts
assert exact app.css absence, retained frozen/generated evidence, and no React
consumer in normal and `VITE_DISABLE_LEGACY_FALLBACK=1` modes. This bounded
cleanup does not claim global fallback discovery completion.
