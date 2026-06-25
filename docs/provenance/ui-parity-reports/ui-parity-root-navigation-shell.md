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
  `frontend/tests/root-shell-parity.e2e.ts`,
  `frontend/src/root-custom-navbar-link.spec.ts`,
  `frontend/tests/search-parity.e2e.ts`,
  `output/playwright/visual-sweep/latest.json`

## Route Inventory Summary

Total rows: 5

| Status | Count |
| --- | ---: |
| covered | 3 |
| weak evidence | 1 |
| gap | 1 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| Route/state | Legacy source and behavior | Current source and evidence | Status | Owner |
| --- | --- | --- | --- | --- |
| Global navigation chrome on normal pages | `common/navbar.scala.html`, `common/usermenu.scala.html`, and `common/footer.scala.html` render `.gnb-outer`, logo, project list, feedback link, global search, authenticated user menu, sidebar entry, and footer except on standalone pages. | `frontend/src/routes/__root.tsx` renders the legacy shell; `auth-workspace-shell.spec.tsx`, `root-custom-navbar-link.spec.ts`, visual-sweep evidence, and core provenance pin the missing-CSS/root-shell regression fixes. | covered | none |
| Login dialog remember-me toggle | `common/loginDialog.scala.html` renders a normal checked `rememberMe` checkbox that the user can uncheck before submitting the modal login form. | `LegacyLoginDialog` currently renders the modal checkbox as fixed checked/read-only, and `root-shell-parity.e2e.ts` does not uncheck it or assert the submitted `rememberMe` payload. | gap | `frontend/src/routes/-auth-views.tsx`, `frontend/tests/root-shell-parity.e2e.ts` |
| Root shell browser raw-key absence proof | Legacy navbar, user menu, sidebar, footer, and login dialog resolve labels through `Messages(...)`. | Current structural/copy browser proof exists, but focused root-shell Playwright coverage does not broadly scan anonymous/authenticated/site-admin/guest shell states for visible raw legacy keys. | weak evidence | `frontend/tests/root-shell-parity.e2e.ts` |
| Project and organization search-scope dropdown gating | Legacy root search exposes project/group scopes only when the route context and project/group membership conditions match `navbar.scala.html` and `project.hasGroup`. | `frontend/src/routes/__root.tsx` reads the route container context; `auth-workspace-shell.spec.tsx` pins organization scope suppression and project `organizationName`/`hasGroup` behavior. | covered | none |
| Full browser-visible root-shell state matrix | Legacy shell behavior varies by anonymous/authenticated/site-admin/guest, `application.hide.project.listing`, feedback URL, login dialog error state, sidebar tab selection, standalone footer suppression, and project/org scoped search. | `frontend/tests/root-shell-parity.e2e.ts` now proves anonymous global nav, configured feedback link, login dialog open/submit/error/close, authenticated site-admin affix, user menu/sidebar tab content, guest project-list/org-create gating, standalone `/secret` root-footer suppression, and project route group/global search-scope actions under mounted `/yona` base path. `frontend/src/routes/__root.tsx` now strips the runtime base path before route-family classification so `/yona/secret` and `/yona/:owner/:project` match their legacy shell states. | covered in current follow-up | none |

## Playwright Scenario Matrix

| Path | State | Legacy selector/copy | Rust selector/copy | Interaction | API/direct boundary | Status |
| --- | --- | --- | --- | --- | --- | --- |
| normal app route | anonymous/authenticated/site-admin/guest | `.gnb-outer`, `name="gnb-search-form"`, login dialog/menu variants, guest gating | `root-shell-parity.e2e.ts` covers anonymous nav/feedback/login dialog, site-admin affix, user menu/sidebar content, and guest project/org gating | modal open/submit/error/close plus permission-visible controls | React shell plus REST session/bootstrap | covered |
| project/org route | scoped search | project/group dropdown follows container context | `root-shell-parity.e2e.ts` covers project route `Project`, `Group`, and `All` search actions under `/yona`; existing search e2e covers scoped chrome | dropdown DOM/action proof | React route context plus REST container APIs | covered |
| `/secret`, `/restart`, `/_UIKit` | standalone pages | page-owned footer only; no duplicate root footer | `root-shell-parity.e2e.ts` covers `/yona/secret` root-footer suppression while preserving the standalone `Powered by` footer | route entry proof | React shell classification | covered |
