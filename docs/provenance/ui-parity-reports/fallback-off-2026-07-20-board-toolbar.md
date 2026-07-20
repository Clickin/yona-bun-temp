# Fallback-off report: dead `.board-toolbar` bridge

Batch 594 retires the source-less React-side `.board-toolbar` compatibility
rules from `frontend/src/app.css`, including the narrow-screen form/input/
select/button arms. Repository inventory found no `.board-toolbar` emitter in
current React, frozen Scala templates, or legacy JavaScript. The project posts
screen uses the `search-wrap underline` structure and route-local StyleX
owners; surrounding post-list/search rules remain unchanged.

The project-posts static contract and formal `legacy-fallback-off.e2e.ts`
contract assert exact selector absence in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes. This bounded cleanup does not claim
global fallback discovery completion.
