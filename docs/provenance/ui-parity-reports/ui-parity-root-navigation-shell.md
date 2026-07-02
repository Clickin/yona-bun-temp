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
- Focused specs/evidence: `frontend/tests/public-landing-parity.e2e.ts`,
  `frontend/tests/authenticated-home-empty-notifications.e2e.ts`,
  `frontend/tests/ui-kit.e2e.ts`, `frontend/tests/secret-setup.e2e.ts`,
  `frontend/tests/restart.e2e.ts`, `output/playwright/visual-sweep/latest.json`

## Route Inventory Summary

Total rows: 5

| Status | Count |
| --- | ---: |
| covered | 5 |
| weak evidence | 0 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| Route/state | Legacy source and behavior | Current source and evidence | Status | Owner |
| --- | --- | --- | --- | --- |
| Global navigation chrome on normal pages | `common/navbar.scala.html`, `common/usermenu.scala.html`, and `common/footer.scala.html` render `.gnb-outer`, logo, project list, feedback link, global search, authenticated user menu, sidebar entry, and footer except on standalone pages. | `frontend/src/routes/__root.tsx` renders the legacy shell; `public-landing-parity.e2e.ts`, `authenticated-home-empty-notifications.e2e.ts`, `ui-kit.e2e.ts`, visual-sweep evidence, and core provenance pin the missing-CSS/root-shell regression fixes. | covered | none |
| Login dialog remember-me toggle | `common/loginDialog.scala.html` renders a normal checked `rememberMe` checkbox that the user can uncheck before submitting the modal login form. | `LegacyLoginDialog` renders the modal `rememberMe` as a normal default-checked checkbox, and `frontend/tests/ui-kit.e2e.ts` covers the modal form, visible/open state, and REST sign-in payload/error boundary. | covered | none |
| Root shell browser raw-key absence proof | Legacy navbar, user menu, sidebar, footer, and login dialog resolve labels through `Messages(...)`. | `frontend/tests/public-landing-parity.e2e.ts`, `frontend/tests/authenticated-home-empty-notifications.e2e.ts`, `frontend/tests/ui-kit.e2e.ts`, `frontend/tests/secret-setup.e2e.ts`, and `frontend/tests/restart.e2e.ts` cover public, authenticated, UI kit, and standalone shell states with resolved copy. | covered | none |
| Project and organization search-scope dropdown gating | Legacy root search exposes project/group scopes only when the route context and project/group membership conditions match `navbar.scala.html` and `project.hasGroup`. | `frontend/src/routes/__root.tsx` reads route container context; project search-scope behavior is covered through the project shell/settings route evidence and global search shell rows in the rendered evidence manifest. | covered | none |
| Full browser-visible root-shell state matrix | Legacy shell behavior varies by anonymous/authenticated/site-admin/guest, `application.hide.project.listing`, feedback URL, login dialog error state, sidebar tab selection, standalone footer suppression, and project/org scoped search. | Manifest-listed E2Es prove anonymous global nav, configured feedback link, login dialog open/submit/error/close, authenticated workspace/sidebar tab content, standalone `/secret` and `/restart` footer ownership, `/_UIKit` route rendering, and project search-scope actions under mounted `/yona` base path. `frontend/src/routes/__root.tsx` strips the runtime base path before route-family classification. | covered in current follow-up | none |

## Playwright Scenario Matrix

| Path | State | Legacy selector/copy | Rust selector/copy | Interaction | API/direct boundary | Status |
| --- | --- | --- | --- | --- | --- | --- |
| normal app route | anonymous/authenticated/site-admin/guest | `.gnb-outer`, `name="gnb-search-form"`, login dialog/menu variants, guest gating | public/authenticated/UI kit E2Es cover anonymous nav/feedback/login dialog plus authenticated user menu/sidebar content | modal open/submit/error/close plus permission-visible controls | React shell plus REST session/bootstrap | covered |
| project/org route | scoped search | project/group dropdown follows container context | project settings/search evidence covers project route search-scope actions under `/yona`; organization/global search rows cover scoped chrome variants | dropdown DOM/action proof | React route context plus REST container APIs | covered |
| `/secret`, `/restart`, `/_UIKit` | standalone pages | `/secret` and `/restart` own the secret/restart footer; `/_UIKit` keeps the legacy UI kit body with global chrome/footer | `secret-setup.e2e.ts`, `restart.e2e.ts`, and `ui-kit.e2e.ts` cover standalone footer ownership and UI kit body without raw keys | route entry proof | React shell classification | covered |
