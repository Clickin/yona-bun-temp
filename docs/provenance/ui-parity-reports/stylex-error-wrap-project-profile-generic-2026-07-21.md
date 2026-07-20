# StyleX `.error-wrap` Project/Profile Generic Parity — 2026-07-21

Batch 670 gives the project generic internal-error shell and the public
missing-user not-found shell colocated owners for the frozen wrapper, sprite,
and message declarations.

## Legacy evidence

- Project generic error: `yona-original/app/views/error/internalServerError_default.scala.html`.
- Public missing user: `yona-original/app/views/error/notfound_default.scala.html`
  and `yona-original/app/views/user/view.scala.html` for the profile shell.
- Included shell evidence: `layout.scala.html`, `common/navbar.scala.html`,
  `common/usermenu.scala.html`, and `common/footer.scala.html`.
- Frozen declarations: `yona-original/app/assets/stylesheets/less/_page.less:5230-5236`,
  `_sprites.less:488-497`, the `yobi.less` import chain, and Bootstrap.
- Copy: `yona-original/conf/messages`.

Live legacy replay is unavailable in the focused environment. The focused
tests assert the Scala/LESS/message source mapping directly and record the
rendered React output as the parity evidence.

## React owners

- `frontend/src/routes/$ownerName/$projectName.tsx` owns the project generic
  internal-error wrapper, `ico-404` paint, message, and Home Link while
  retaining the existing project shell and legacy classes.
- `frontend/src/routes/$user.tsx` owns the public missing-user wrapper,
  `ico-err2` sprite paint, message, and Home Link while retaining the
  anonymous-profile shell, footer, and copy. The four populated profile empty
  panels remain the separate Batch 669 owners.

The exact migrated declarations are frozen `.error-wrap` padding/centering,
the frozen sprite dimensions/offsets, and the nested message color, 16px bold
typography, and 30px vertical margin. The shared generated fallback remains
for non-owned consumers.

The stale `ProjectPostEditNotFoundBody` in the post detail route was inspected
and found unreachable; its attempted owner/test was excluded rather than
counted as a visible migration.

## Verification

- `frontend/tests/stylex-project-internal-error-wrap.e2e.ts`
- `frontend/tests/stylex-user-profile-notfound-error-wrap.e2e.ts`
- Normal dynamic-port Playwright run: 2/2 passed serially.
- `VITE_DISABLE_LEGACY_FALLBACK=1` dynamic-port Playwright run: 2/2 passed serially.
- Worker typecheck, oxfmt, frozen-file integrity, and `git diff --check` passed;
  the main harness confirmed both reachable states.
