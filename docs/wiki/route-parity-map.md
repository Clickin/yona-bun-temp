---
title: StyleX route parity map
kind: route-map
status: active
updated: 2026-08-09
---

# Route parity map

This is a navigation index, not a replacement for the WTR files. Start with a
row, read the cited legacy template and LESS rule, then inspect only the linked
React owner and provenance.

| Surface | React route / StyleX owner | Legacy evidence | Focused WTR | Provenance |
| --- | --- | --- | --- | --- |
| Project issue form | `frontend/src/routes/$ownerName/$projectName/issueform.tsx`, `-issueform.stylex.ts` | `yona-original/app/views/issue/create.scala.html`, `common/editor.scala.html`, Select2 sources | `stylex-project-issueform.e2e.ts`, `stylex-project-issueform-select-controls.e2e.ts` | `frontend-stylex-migration-ledger.md`, `wtr-637-ledger.md` |
| Project settings | `frontend/src/routes/$ownerName/$projectName/setting.tsx`, `-setting.stylex.ts` | `yona-original/app/views/project/setting.scala.html` and legacy Select2 CSS | `stylex-project-setting.e2e.ts`, `stylex-project-setting-default-branch-control.e2e.ts` | `frontend-stylex-migration-ledger.md` |
| Issue labels | `frontend/src/routes/$ownerName/$projectName/issue/labelsform.tsx`, `-labelsform.stylex.ts` | `yona-original/app/views/issue/labels.scala.html`, `_page.less` | `stylex-project-labelsform.e2e.ts`, `stylex-project-labelsform-color-input-dynamic.e2e.ts` | `frontend-stylex-migration-ledger.md` |
| Project commits / branch Select2 | `frontend/src/routes/$ownerName/$projectName/commits.tsx`, `-commits.stylex.ts` | legacy `code/commits.scala.html`, `common/select2.scala.html` | `stylex-project-commits.e2e.ts`, `project-commits-svn-main.e2e.ts` | `frontend-stylex-migration-ledger.md` |
| New pull request | `frontend/src/routes/$ownerName/$projectName/newPullRequestForm.tsx`, `-new-pull-request.stylex.ts` | `yona-original/app/views/git/create.scala.html`, `common/editor.scala.html` | `stylex-project-new-pull-request.e2e.ts`, `stylex-project-new-pull-request-select2-button.e2e.ts` | `frontend-stylex-migration-ledger.md` |
| User profile | `frontend/src/routes/$user.tsx`, `-user-profile.stylex.ts` | `yona-original/app/views/user/view.scala.html` and user partials | `stylex-user-profile.e2e.ts`, `stylex-user-profile-projects-list.e2e.ts` | `frontend-stylex-migration-ledger.md` |
| Global shell | `frontend/src/routes/__root.tsx`, `-root.stylex.ts`, `-home-route-screen.stylex.ts` | `yona-original/app/views/common/navbar.scala.html`, user menu partials | `global-shell-geometry.e2e.ts`, `legacy-fallback-off.e2e.ts` | `wtr-637-ledger.md`, `frontend-yoram-rebrand-2026-07-13.md` |

When a route is changed, add or update its row in the same change as the
focused WTR and provenance entry. A source-only map update is not a StyleX
wave completion.
