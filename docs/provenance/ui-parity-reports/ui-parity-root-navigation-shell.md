# UI Parity Report: Root Navigation Shell

Status: current evidence workspace
Date: 2026-06-26

## Sources

- Legacy templates: `yona-original/app/views/common/navbar.scala.html`,
  `common/usermenu.scala.html`, `common/loginDialog.scala.html`,
  `common/footer.scala.html`, `common/sidebar.scala.html`
- Legacy config and helpers: `yona-original/conf/messages`,
  `yona-original/app/controllers/UserApp.java`, `ProjectApp`, `OrganizationApp`
- Current React/API: `frontend/src/routes/__root.tsx`,
  `frontend/src/runtime-config.ts`, `frontend/src/app-view-models.ts`,
  `frontend/src/api/session.ts`, `frontend/src/api/workspace.ts`
- Focused specs/evidence: `frontend/src/auth-workspace-shell.spec.tsx`,
  `frontend/src/root-custom-navbar-link.spec.ts`,
  `frontend/tests/search-parity.e2e.ts`,
  `output/playwright/visual-sweep/latest.json`

## Summary

| Status | Count |
| --- | ---: |
| covered | 2 |
| weak evidence | 1 |
| gap | 0 |
| deviation | 0 |

## Rows

| Route/state | Legacy source and behavior | Current source and evidence | Status | Owner |
| --- | --- | --- | --- | --- |
| Global navigation chrome on normal pages | `common/navbar.scala.html`, `common/usermenu.scala.html`, and `common/footer.scala.html` render `.gnb-outer`, logo, project list, feedback link, global search, authenticated user menu, sidebar entry, and footer except on standalone pages. | `frontend/src/routes/__root.tsx` renders the legacy shell; `auth-workspace-shell.spec.tsx`, `root-custom-navbar-link.spec.ts`, visual-sweep evidence, and core provenance pin the missing-CSS/root-shell regression fixes. | covered | none |
| Project and organization search-scope dropdown gating | Legacy root search exposes project/group scopes only when the route context and project/group membership conditions match `navbar.scala.html` and `project.hasGroup`. | `frontend/src/routes/__root.tsx` reads the route container context; `auth-workspace-shell.spec.tsx` pins organization scope suppression and project `organizationName`/`hasGroup` behavior. | covered | none |
| Full browser-visible root-shell state matrix | Legacy shell behavior varies by anonymous/authenticated/site-admin/guest, `application.hide.project.listing`, feedback URL, login dialog error state, sidebar tab selection, standalone footer suppression, and project/org scoped search. | Current evidence is mostly source/render specs plus route-entry visual sweep. The phase requires browser-visible interaction proof for modal open/submit/error, sidebar tabs, permission-hidden controls, footer suppression, and search-scope dropdown states. | weak evidence | `frontend/tests/` focused root-shell Playwright proof plus this report and `docs/plans/2026-06-26-full-ui-parity-subagent-phase.md` |

## Playwright Scenario Matrix

| Path | State | Legacy selector/copy | Rust selector/copy | Interaction | API/direct boundary | Status |
| --- | --- | --- | --- | --- | --- | --- |
| normal app route | anonymous and authenticated | `.gnb-outer`, `name="gnb-search-form"`, login dialog/menu variants | source/render specs and visual sweep show matching chrome | route entry only | React shell plus REST session/bootstrap | weak evidence |
| project/org route | scoped search | project/group dropdown follows container context | focused specs cover current selectors and search e2e covers scoped chrome | dropdown browser interaction still thin | React route context plus REST container APIs | weak evidence |
| `/secret`, `/restart`, `/_UIKit` | standalone pages | no duplicate root footer | source/render specs cover suppression | route entry only | React shell classification | weak evidence |
