# Search empty-result fallback-off retirement report — 2026-07-20

## Scope and consumer graph

The React-side `frontend/src/app.css` `.empty-result` arm is removed. Its
current React consumers are exactly:

- global search: `global-search-empty-result`
- project search: `project-search-empty-result`
- organization search: `organization-search-empty`

The removed arm contained only `min-height: 32px`, `padding: 10px 0`, and
`color: #777`. The frozen search empty-state declaration remains in
`yona-original/app/assets/stylesheets/less/_page.less:2966`; generated
`legacy-fallback.css` remains unchanged as historical fallback evidence.

## Focused evidence

The managed focused normal run covered six tests. Five passed, including the
static owner contracts, project empty-state desktop/mobile contract, global
empty-state geometry, and exact fallback arm retirement contract. The
organization mobile test failed because the existing owner rendered no
`no_contents.jpg` background in the current normal/fallback fixture state; the
test data also returned the seeded issue instead of an empty result in one
replay. This is an existing search owner/fixture parity gap, not a declaration
from the removed app.css arm.

The matching managed fallback-off run passed the static contracts and project
checks. The organization mobile and global empty-state checks failed on the
same missing `no_contents.jpg` background. No DOM or interaction regression
from removing the three-declaration app.css arm was observed.

Commands used the managed dynamic-port wrapper in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes. Frozen Scala/LESS sources were not
modified. The remaining image gap is explicitly retained as follow-up work;
this report does not claim complete search empty-state or overall migration
completion.

## Global fallback-off context

The same-turn global fallback-off discovery report recorded the existing
anonymous `global-shell-geometry` failure first (`18px` width delta against a
`1px` tolerance), with 13 passed, 1 failed, 3 interrupted, and 2,619 not run
under `--max-failures=1`. That unrelated global gap remains non-green.
