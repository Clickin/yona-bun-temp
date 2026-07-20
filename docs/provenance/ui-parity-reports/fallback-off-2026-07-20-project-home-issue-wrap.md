# Fallback-off report: dead project-home issue-wrap bridge

Batch 597 retires only the React-side `.project-home .issue-wrap` margin and
button-width arms from `frontend/src/app.css`. Current React project-home
routes emit no `.issue-wrap` consumer. The unrelated project-home-top issue
number output is outside this bounded removal.

The project-home side-panel and formal `legacy-fallback-off.e2e.ts` contracts
assert exact absence of the retired arms in both normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes. Frozen
Scala/LESS and generated fallback assets are unchanged. This bounded cleanup
does not claim global fallback discovery completion.
