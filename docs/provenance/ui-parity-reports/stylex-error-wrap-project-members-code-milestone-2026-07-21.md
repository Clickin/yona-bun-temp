# StyleX error-wrap project members, code, and milestone states — 2026-07-21

Batch 663 moves the exact frozen error-state declarations into three existing
route owners:

- project members forbidden/bad-request shell;
- code-file branch-not-found state;
- milestone not-found state.

The legacy evidence is `project/members.scala.html` with its project menu
partial, `code/view.scala.html`, `milestone/view.scala.html`/`milestone/list.scala.html`,
the generic not-found template, `conf/messages`, `_page.less:5230-5236`, and
`_sprites.less:488-497`. The React output keeps the legacy `.error-wrap`,
`.ico.ico-err2`, copy, project shell, and login/list navigation. The exact
frozen declarations are colocated in each route's StyleX module: `padding:
100px 0`, centered wrapper, the `-80px -160px` sprite position with `50px ×
80px` geometry, and the bold 16px gray message with 30px vertical margins.

The shared legacy fallback remains intentionally enabled for other current
React error-wrap emitters; this batch does not claim fallback retirement.

Focused evidence:

- `stylex-project-members-error-wrap.e2e.ts`
- `stylex-project-code-file-error-wrap.e2e.ts`
- `stylex-project-milestone-error-wrap.e2e.ts`

The serial managed Playwright suite passed 3/3 with the fallback enabled and
3/3 with `VITE_DISABLE_LEGACY_FALLBACK=1`. Each test asserts visible copy and
navigation, computed declarations, and desktop/mobile containment. Frontend
typecheck, formatting, and the required commit guards are recorded with the
wave commit.

Live legacy visual comparison is a documented gap for this wave: the usual
legacy endpoints (`127.0.0.1:9000`/`19100`) and local visual-sweep frontend
(`127.0.0.1:3101/yona`) were unavailable during verification. The focused tests
therefore provide the executable legacy-source and browser-metric evidence;
the gap remains open for a later live visual sweep.
