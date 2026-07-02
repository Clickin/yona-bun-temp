# Template-First UI Parity Report: P0 Global Shell/Assets

Status: current reset baseline
Date: 2026-07-02
Owner packet: P0 global shell/assets
Mode: template-first mapper baseline; implementation evidence reviewed

## Scope

This report reopens global shell parity under
`docs/plans/2026-06-26-template-first-ui-parity-reset.md`.

The older `ui-parity-root-navigation-shell.md` report remains useful route/API
evidence, but its `covered` rows do not prove template-level visual parity.
P0 closes only after a verifier compares legacy and current rendered output
from the legacy template DOM/CSS contract.

## Legacy Template Call Graph

| Legacy source | Role | Required anchors |
| --- | --- | --- |
| `yona-original/app/views/layout.scala.html` | Normal app shell. Loads legacy CSS/assets, `common.navbar`, page content, `common.scripts`, usermenu JS, Viewer gallery hook. | `body#html-body`, `div#main.main`, Bootstrap/yobicon/select2/pikaday/usermenu/yobi/nprogress/viewer styles, `common.scripts()` dialog/toast/login containers. |
| `yona-original/app/views/layout_framed.scala.html` | Historical framed shell reference. The React SPA now keeps sidebar in the root layout rather than recreating the iframe shell. | Reference-only anchors: `body.framed-body#html-body`, `#sidebar`, `#sidebar-bottom`, `#mainFrame`, `iframe#mainFrameId.mainFrame`; these are intentionally absent from active frontend code. |
| `yona-original/app/views/common/navbar.scala.html` | Global top navigation and search. | `.unsupported`, `header.gnb-outer`, `.gnb-inner`, `.pin[data-toggle=tooltip]`, `.gnb-nav`, `.logo.logo-letter`, `form[name=gnb-search-form].gnb-search-form`, `#gnb-search-scope-title`, `.search-box`, `.gnb-usermenu`. |
| `yona-original/app/views/common/usermenu.scala.html` | Authenticated/anonymous menu and side navigation. | `#mySidenav.sidenav`, `.user-menu-wrap`, `.nav.nav-tabs.nm`, `#usermenu-tab-content-list`, `.gnb-usermenu`, `#sidebar-open-btn`, `.dropdwon-box-btn`, `#required-logged-in`, `.counter-badge`. |
| `yona-original/app/views/common/loginDialog.scala.html` | Modal login UX. | `#loginDialog.modal.hide.loginDialog`, `.modal-body`, `.frm-wrap.login-form-wrap`, `#loginIdOrEmailD`, `#passwordD`, `.error .error-message`, `#remember-meD.checkbox`, `.bg-checkbox`, `.oauth-login-btn`. |
| `yona-original/app/views/common/scripts.scala.html` | Global dialog/toast containers and legacy JavaScript behavior. | `#yobiDialog.modal.hide.yobiDialog`, `#yobiToasts.yobiToasts`, `#tplYobiToast`, search-scope click handler, progress-bar link binding, markdown external-link handling. |
| `yona-original/app/views/common/footer.scala.html` | Normal page footer. | `footer.page-footer-outer`, `.page-footer`, `.provider`, `.yona-author`, `.naver-labs`, `.naver-cloud-platform`. |

## Current React/CSS Targets

| Current source | Current responsibility |
| --- | --- |
| `frontend/src/routes/__root.tsx` | Root provider, header, sidebar, footer, login dialog state, route-family footer suppression. |
| `frontend/src/routes/index.tsx` | Anonymous public landing route rendered inside the root shell. |
| `frontend/src/routes/users/loginform.tsx` | Standalone legacy login screen and flash/toast consumer. |
| `frontend/src/routes/[_]UIKit.tsx` | UI kit route used for global chrome and login-dialog selector evidence. |
| `frontend/src/main.tsx` | Runtime mount boundary that restores `body#html-body > #root > #main.main` around normal React routes. |
| `frontend/src/app.css` | Hand-maintained approximation of legacy Bootstrap/Yobi visual rules. |
| `frontend/tests/public-landing-parity.e2e.ts` | Browser shell selector and legacy head asset/meta evidence for anonymous `/`. |
| `frontend/tests/ui-kit.e2e.ts` | Browser evidence for global chrome, footer, and login dialog selectors/metrics. |
| `frontend/tests/authenticated-home-empty-notifications.e2e.ts` | Browser evidence for authenticated root shell, sidebar tabs, sidebar open/close, and framed-shell absence. |
| `frontend/tests/loginform.e2e.ts` | Browser evidence for standalone login shell and legacy flash/toast markup. |

## Open Reset Queue Summary

Source comparison by Subagent P0 found concrete reset blockers:

| status | count |
| --- | ---: |
| gap | 0 |
| deviation | 0 |
| weak evidence | 0 |
| covered | 12 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `layout.scala.html` | Any normal route, anonymous/authenticated. Legacy loads Bootstrap, yobicon, Select2, Pikaday, `usermenu.css`, compiled `yobi.css`, NProgress, Viewer CSS/JS in a fixed asset chain. | `frontend/index.html`, `frontend/public/legacy-assets`, `frontend/scripts/build-legacy-css.mjs`, `frontend/src/app.css`, `frontend/tests/public-landing-parity.e2e.ts` | asset | covered in current follow-up | P0 | none | `index.html` now links the legacy CSS asset chain through root-relative `/legacy-assets/...` source hrefs in layout order; Vite prefixes the configured `/yona` base once at runtime, avoiding the previous `/yona/yona/legacy-assets/...` zero-rule stylesheet loads. The chain covers favicon, Bootstrap, yobicon, Select2, Pikaday, `usermenu.css`, compiled `yobi.css`, NProgress, Viewer, and framed-shell magnific-popup CSS. Static CSS/images/fonts are copied under `frontend/public/legacy-assets`; `build:legacy-css` regenerates `yobi.css` and `usermenu.css` from the legacy LESS files in `yona-original/app/assets/stylesheets`. `frontend/tests/public-landing-parity.e2e.ts` asserts the legacy asset suffixes and order plus viewport/content-type/`X-UA-Compatible`, OpenGraph, Twitter meta names, and loaded desktop/mobile layout metrics. No legacy JS is linked or copied for this asset row. |
| `layout.scala.html`, `partial_update_notification.scala.html` | Any normal route, site-admin update notification watched and update version available. | `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/routes/__root.tsx`, `frontend/tests/public-landing-parity.e2e.ts`, `frontend/tests/ui-kit.e2e.ts` | layout | covered in current follow-up | P0 | none | `body#html-body`, `#root > #main.main`, and the legacy site-admin `<p class="center-txt">` update notification are covered. `mountApp` restores the legacy `div#main.main` shell around the React router, and `frontend/tests/public-landing-parity.e2e.ts` asserts `body#html-body > #root > #main.main` on anonymous `/`. Root chrome and footer selector/metric evidence is maintained by `frontend/tests/ui-kit.e2e.ts`. |
| `common/scripts.scala.html` | Any route with common scripts. | `frontend/src/routes/__root.tsx`, `frontend/tests/loginform.e2e.ts`, `frontend/tests/ui-kit.e2e.ts` | interaction | covered in current follow-up | P0 | none | `__root.tsx` renders global `#yobiDialog`, `#yobiToasts`, and `#tplYobiToast`; the toast template keeps its legacy `script[type="text/x-jquery-tmpl"]` anchor as a React string child. The navbar search-scope handler preserves legacy `href="#"`, `data-action`, form `action` update, and `#gnb-search-scope-title` text update behavior. `frontend/tests/loginform.e2e.ts` proves the rendered toast container and flash markup; `frontend/tests/ui-kit.e2e.ts` proves the shared shell chrome. Behavior consumers remain tracked by the separate flash/shortcut/upload/viewer row. |
| `common/navbar.scala.html` | Header on global/project/org routes. | `frontend/src/routes/__root.tsx`, `frontend/src/app.css`, `frontend/tests/public-landing-parity.e2e.ts`, `frontend/tests/ui-kit.e2e.ts`, `frontend/tests/authenticated-home-empty-notifications.e2e.ts` | css | covered in current follow-up | P0 | none | Global nav CSS follows legacy `_page.less` for dark `.gnb-outer`, translucent project-route header, `.gnb-inner` width/margins, muted orange `.logo-letter`, divider pipes, and collapsed/focused search input widths. The used legacy `_common.less` utility classes for text colors, small font, and yobicon vertical alignment are restored globally so directory/organization/project chrome keeps legacy compact typography and icon alignment. Browser evidence covers anonymous landing, UI kit chrome, and authenticated root shell metrics. |
| `common/navbar.scala.html` | Pin/sidebar toggle inside the React SPA layout. | `frontend/src/routes/__root.tsx`, `frontend/tests/authenticated-home-empty-notifications.e2e.ts` | interaction | covered in current follow-up | P0 | none | Root header pin preserves legacy `data-toggle="tooltip"`/`data-placement="bottom"` anchors but now toggles the React-owned `#mySidenav` layout state directly. The previous frontend `/sidebar?path=...&hash=...` iframe contract is retired for the React SPA surface, with browser proof in the authenticated home shell tests. |
| `layout_framed.scala.html` | Legacy framed shell reference only. | `frontend/src/routes/__root.tsx`, `frontend/tests/authenticated-home-empty-notifications.e2e.ts` | reference-only | covered in current follow-up | P0 | none | React no longer treats `/sidebar` as a separate framed page. The active SPA root layout owns sidebar for all routes; `RootFramedShell`, `body.framed-body`, `#sidebar`, `#sidebar-bottom`, `#mainFrame`, and `iframe#mainFrameId` are intentionally absent from active frontend code, and `frontend/tests/authenticated-home-empty-notifications.e2e.ts` asserts that absence. |
| `common/usermenu.scala.html`, `sidebar.scala.html` | Authenticated side menu tabs/favorites. | `frontend/src/routes/__root.tsx`, `frontend/src/routes/-home-route-screen.tsx`, `frontend/tests/authenticated-home-empty-notifications.e2e.ts` | interaction | covered in current follow-up | P0 | none | Root sidebar renders the legacy tab content shape directly instead of loading a server HTML fragment from `UsermenuUrl`: `#mySidenav`, `#usermenu-tab-content-list`, `myOrganizationList`/`myProjectList`/`myRecentIssueList`, `sidebarActiveMenu` localStorage tab persistence, and active pane restoration are preserved in the SPA layout. `user-project-list` styling is restored for star colors, project rows carry legacy `star-project` and owner/project data anchors, and project favorite clicks call the REST toggle, update the `starred` class from legacy-shaped `favored` responses, refresh workspace data, and preserve stop-propagation behavior. Issue favorite controls are owned by the issue packet and already render `.favorite-issue`; organization favorite controls are route-specific organization/profile UI, not P0 global shell closure. Focused browser proof is in `frontend/tests/authenticated-home-empty-notifications.e2e.ts`. |
| `common/usermenu.scala.html`, `yona.Usermenu.js` | Normal-page side navigation open/close. | `frontend/src/routes/__root.tsx`, `frontend/src/app.css`, `frontend/tests/authenticated-home-empty-notifications.e2e.ts` | interaction | covered in current follow-up | P0 | none | Normal root pages now keep `#mySidenav` closed, open it to the legacy sidebar width through root React state when `#sidebar-open-btn` is clicked or the `F` shortcut is pressed with no focused field, and close it on outside clicks without reintroducing a jQuery width-mutation bridge. Mobile width keeps the legacy `100vw` rule. |
| `common/loginDialog.scala.html` | Anonymous login dialog shell. | `frontend/src/routes/__root.tsx`, `frontend/tests/ui-kit.e2e.ts` | interaction | covered in current follow-up | P0 | none | `RootLoginDialog` now mounts the legacy hidden `#loginDialog.modal.hide.loginDialog` shell from `common/loginDialog.scala.html` on normal SPA routes, while `/users/loginform` keeps owning the standalone login screen to avoid duplicate legacy login IDs in the current SPA route set. `frontend/tests/ui-kit.e2e.ts` asserts the rendered modal body, login form action/method, `#loginIdOrEmailD`, `#passwordD`, `.error .error-message`, checked `#remember-meD`, and lost-password/signup links; it also opens the shell and proves `[data-dismiss="modal"]` restores the legacy hidden state. Modal submit/error mutation behavior remains owned by the canonical `/users/loginform` REST/TanStack auth flow until a concrete modal-open caller is restored. |
| `common/scripts.scala.html` | Flash toast/alert, shortcuts, upload globals, markdown viewer. | `frontend/src/routes/__root.tsx`, `frontend/src/routes/users/loginform.tsx`, `frontend/src/runtime-config.ts`, `crates/server/src/state.rs`, `frontend/tests/loginform.e2e.ts`, scattered route files | interaction | covered in current follow-up | P0 | none | `RootResetShell` now restores the global `#yobiToasts` container and projects React-side flash notifications from `[data-toggle=yobi-notify]` into the legacy `.toast` DOM shape. `frontend/tests/loginform.e2e.ts` proves the `user.loginWithNewPassword` flash path by opening `/users/loginform?password=reset` and comparing the login shell plus `#yobiToasts` toast markup from `common/scripts.scala.html`. Remaining common-script behaviors such as broader shortcuts/upload/viewer contracts stay tracked by the existing global-shell provenance rows and later focused route owners. |
| `common/footer.scala.html` | Normal pages. | `frontend/src/routes/__root.tsx`, `frontend/src/app.css`, `frontend/tests/public-landing-parity.e2e.ts`, `frontend/tests/ui-kit.e2e.ts`, `frontend/tests/authenticated-home-empty-notifications.e2e.ts` | layout | covered in current follow-up | P0 | none | Source/E2E assert `.page-footer-outer .page-footer` and provider copy. The P0 visual follow-up restored legacy footer CSS from `_page.less`: `.page-footer-outer` padding/background and `.page-footer` centered `line-height:34px`. Focused Playwright metrics in public landing, UI kit, and authenticated home tests show normal checked routes render the footer at the legacy desktop/mobile dimensions. |
| `common/navbar.scala.html` | Anonymous/authenticated header basics/search scope. | `frontend/src/routes/__root.tsx`, `frontend/src/app.css`, `frontend/tests/public-landing-parity.e2e.ts`, `frontend/tests/ui-kit.e2e.ts`, `frontend/tests/authenticated-home-empty-notifications.e2e.ts`, `scripts/visual-parity-sweep.mjs`, `scripts/visual-parity-comparison.spec.mjs` | test-gap | covered in current follow-up | P0 | none | The focused E2E set records computed-style metrics for `.gnb-outer`, `.gnb-inner`, `.gnb-usermenu`, `#mySidenav`, `#loginDialog`, and `footer.page-footer-outer` across anonymous, UI kit, and authenticated root states. The visual sweep continues to provide legacy/current screenshot comparison support for broader chrome audits. Current CSS restores legacy Bootstrap dropdown hiding, `.gnb-usermenu-dropdown`/toggle/caret rules, `.avatar-wrap.smaller` sizing, legacy footer baseline rules, and project-route header classification. Broader full-sweep failures remain outside this P0 navbar row: legacy homelab/sample-data status deltas, site-admin authorization state, and local seeded fixture/public-origin data rows. |

## Verifier Evidence

P0 baseline verifier evidence is now recorded, with root-shell interaction proof
and visual sweep metrics split by responsibility.

Root shell/browser verifier run:

- Current focused command: `pnpm --dir frontend test:e2e -- public-landing-parity.e2e.ts ui-kit.e2e.ts loginform.e2e.ts signupform.e2e.ts lost-password.e2e.ts reset-password.e2e.ts restricted.e2e.ts secret-setup.e2e.ts restart.e2e.ts authenticated-home-empty-notifications.e2e.ts auth-aliases.e2e.ts help-toc.e2e.ts verify-user.e2e.ts`
- Checked at: `2026-07-02`
- Coverage: anonymous desktop/mobile root shell, legacy head meta names,
  favicon and stylesheet order, `body#html-body > #root > #main.main`, UI kit
  global chrome, login dialog open/error/dismiss states, standalone auth pages,
  reset/lost password routes, restricted/secret/restart pages, authenticated
  root shell, side menu tabs, create dropdown hidden/open states, sidebar
  open/close interactions, framed-shell absence, auth aliases, help TOC chrome,
  verify-user route, and visible raw legacy key absence.

Visual sweep verifier evidence:

- Desktop screenshots from the 2026-06-26 sweep remain the rendered
  legacy/current evidence for `/`, `/admin/sample`, and `/users/loginform`:
  `output/playwright/visual-sweep/legacy-_.png`,
  `output/playwright/visual-sweep/local-_.png`,
  `output/playwright/visual-sweep/legacy-_admin_sample.png`,
  `output/playwright/visual-sweep/local-_admin_sample.png`,
  `output/playwright/visual-sweep/legacy-_users_loginform.png`, and
  `output/playwright/visual-sweep/local-_users_loginform.png`.
- The same sweep records computed-style proof for `.gnb-outer`, `.gnb-inner`,
  `.gnb-usermenu`, `#mySidenav`, `#loginDialog`, and
  `footer.page-footer-outer`, and it records raw-key scan failures as verifier
  errors.
- Asset-chain proof is covered by the first reset row: `index.html` links the
  legacy Bootstrap/Yobi/Select2/Pikaday/NProgress/Viewer CSS baseline through
  `frontend/public/legacy-assets`, generated by `build:legacy-css` without
  importing legacy JavaScript.

Closure note:

- P0 has zero recorded `gap`, `deviation`, and `weak evidence` rows. It remains
  subject to the top-level integrated browser sweep before whole UI parity can
  be claimed, but this packet no longer has a standalone verifier-baseline
  blocker.
