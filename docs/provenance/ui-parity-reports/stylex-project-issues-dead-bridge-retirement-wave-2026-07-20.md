# Project issues dead bridge retirement — 2026-07-20

This narrow cleanup retires one unreachable declaration from the frozen
fallback mirror. `frontend/src/app.css:2970-2972` previously scoped
`list-style: none` to `.issue-list-page .post-list-wrap`.

The current React route graph has no `issue-list-page` class consumer. Project,
user, organization, and site issue-list routes use other wrappers or StyleX
owners; the only remaining textual match is a `data-stylex-owner` value, which
does not participate in CSS matching. Frozen `_page.less:3827` provides the
unscoped `.post-list-wrap` rule, and `frontend/src/app.css:2811-2814` already
retains the unscoped `list-style: none` declaration.

The focused static contract in
`frontend/tests/stylex-project-issues-static-owners-wave.e2e.ts` asserts exact
absence of the scoped selector and presence of the generic fallback rule. No
TSX, frozen source, generated fallback, or test baseline changed. Because the
removed selector has no matching ancestor and duplicates the generic rule,
normal and fallback-off geometry are expected to remain unchanged.

Global fallback discovery remains incomplete/non-green; this is a single dead
bridge retirement and does not unlink any generated fallback module.
