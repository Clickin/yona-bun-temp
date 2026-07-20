# StyleX `.error-wrap` Search/Profile/Root Parity — 2026-07-21

Batch 669 gives the shared search error family, the four public user-profile
empty panels, and the root alias not-found screen colocated owners for the
frozen `.error-wrap` and sprite declarations.

## Legacy evidence

- Search variants: `yona-original/app/views/error/notfound_default.scala.html`,
  `error/forbidden.scala.html`, `error/internalServerError_default.scala.html`,
  `error/requestTextEntityTooLarge.scala.html`, and `search/result.scala.html`.
- Profile empty panels: `yona-original/app/views/user/view.scala.html`.
- Root not-found shell: `yona-original/app/views/error/notfound_default.scala.html`,
  `error/notfound.scala.html`, and the included layout/navbar/usermenu/footer
  partials.
- Frozen declarations: `yona-original/app/assets/stylesheets/less/_page.less:5230-5236`,
  `_sprites.less:488-497`, the `yobi.less` import chain, and Bootstrap.
- Copy: `yona-original/conf/messages`.

The live legacy replay is unavailable in the focused test environment. The
tests therefore assert the Scala/LESS/message source mapping directly and
record the rendered React output as the parity evidence.

## React owners

- `frontend/src/routes/-search-screen.tsx` owns the shared error wrapper,
  icon paint (`ico-err1`, `ico-err2`, and `ico-404`), message typography,
  home navigation, and the two request-too-large paragraphs while retaining
  the legacy `error-wrap` and icon classes.
- `frontend/src/routes/$user.tsx` owns the open-issues, closed-issues,
  pull-request, and projects empty-panel wrappers/messages while retaining
  the existing tab IDs, tab state, DOM order, and copy.
- `frontend/src/routes/__root.tsx` owns the root alias not-found wrapper,
  `ico-err2` sprite paint, message, and home Link while retaining the root
  shell and legacy classes.

Exact migrated declarations are the frozen wrapper padding/centering,
`ico-err1`/`ico-err2` sprite dimensions and offsets, and the nested message
color, 16px bold typography, and 30px vertical margin. The shared generated
fallback remains enabled for non-owned consumers.

## Verification

- `frontend/tests/stylex-search-error-wrap.e2e.ts`
- `frontend/tests/stylex-user-profile-empty-error-wrap.e2e.ts`
- `frontend/tests/stylex-root-notfound-error-wrap.e2e.ts`
- Normal dynamic-port Playwright run: 3/3 passed serially.
- `VITE_DISABLE_LEGACY_FALLBACK=1` dynamic-port Playwright run: 3/3 passed serially.
- Worker checks: frontend typecheck, oxfmt, frozen-file integrity, and
  `git diff --check` passed for each owner.
