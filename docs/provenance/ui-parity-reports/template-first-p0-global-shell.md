# Template-First UI Parity Report: P0 Global Shell/Assets

Status: current reset baseline
Date: 2026-06-26
Owner packet: P0 global shell/assets
Mode: template-first mapper baseline; implementation/verifier follow-up active

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
| `yona-original/app/views/layout_framed.scala.html` | Framed/mobile-height shell. Loads same core CSS with framed body/sidebar/iframe. | `body.framed-body#html-body`, `#sidebar`, `#sidebar-bottom`, `#mainFrame`, `iframe#mainFrameId.mainFrame`. |
| `yona-original/app/views/common/navbar.scala.html` | Global top navigation and search. | `.unsupported`, `header.gnb-outer`, `.gnb-inner`, `.pin[data-toggle=tooltip]`, `.gnb-nav`, `.logo.logo-letter`, `form[name=gnb-search-form].gnb-search-form`, `#gnb-search-scope-title`, `.search-box`, `.gnb-usermenu`. |
| `yona-original/app/views/common/usermenu.scala.html` | Authenticated/anonymous menu and side navigation. | `#mySidenav.sidenav`, `.user-menu-wrap`, `.nav.nav-tabs.nm`, `#usermenu-tab-content-list`, `.gnb-usermenu`, `#sidebar-open-btn`, `.dropdwon-box-btn`, `#required-logged-in`, `.counter-badge`. |
| `yona-original/app/views/common/loginDialog.scala.html` | Modal login UX. | `#loginDialog.modal.hide.loginDialog`, `.modal-body`, `.frm-wrap.login-form-wrap`, `#loginIdOrEmailD`, `#passwordD`, `.error .error-message`, `#remember-meD.checkbox`, `.bg-checkbox`, `.oauth-login-btn`. |
| `yona-original/app/views/common/scripts.scala.html` | Global dialog/toast containers and legacy JavaScript behavior. | `#yobiDialog.modal.hide.yobiDialog`, `#yobiToasts.yobiToasts`, `#tplYobiToast`, search-scope click handler, progress-bar link binding, markdown external-link handling. |
| `yona-original/app/views/common/footer.scala.html` | Normal page footer. | `footer.page-footer-outer`, `.page-footer`, `.provider`, `.yona-author`, `.naver-labs`, `.naver-cloud-platform`. |

## Current React/CSS Targets

| Current source | Current responsibility |
| --- | --- |
| `frontend/src/routes/__root.tsx` | Root provider, header, sidebar, footer, login dialog state, route-family footer suppression. |
| `frontend/src/routes/-auth-views.tsx` | `LegacyLoginDialog` and auth form fragments. |
| `frontend/src/routes/-shared.tsx` | Error/status shell helpers. |
| `frontend/src/app.css` | Hand-maintained approximation of legacy Bootstrap/Yobi visual rules. |
| `frontend/tests/root-shell-parity.e2e.ts` | Browser reachability and shell selector evidence. |
| `frontend/src/auth-workspace-shell.spec.tsx` | Static shell selector and copy assertions. |

## Open Reset Queue Summary

Source comparison by Subagent P0 found concrete reset blockers:

| status | count |
| --- | ---: |
| gap | 0 |
| deviation | 0 |
| weak evidence | 0 |
| covered | 11 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `layout.scala.html` | Any normal route, anonymous/authenticated. Legacy loads Bootstrap, yobicon, Select2, Pikaday, `usermenu.css`, compiled `yobi.css`, NProgress, Viewer CSS/JS in a fixed asset chain. | `frontend/index.html`, `frontend/public/legacy-assets/**`, `frontend/scripts/build-legacy-css.mjs`, `frontend/src/app.css` | asset | covered in current follow-up | P0 | none | `index.html` now links the legacy CSS asset chain through `%BASE_URL%legacy-assets/...` in layout order: favicon, Bootstrap, yobicon, Select2, Pikaday, `usermenu.css`, compiled `yobi.css`, NProgress, Viewer, and framed-shell magnific-popup CSS. Static CSS/images/fonts are copied under `frontend/public/legacy-assets/**`; `build:legacy-css` regenerates `yobi.css` and `usermenu.css` from `yona-original/app/assets/stylesheets/*.less`. No legacy JS is linked or copied for this asset row. Static proof is in `auth-workspace-shell.spec.tsx`; visual closure remains under the verifier baseline rows. |
| `layout.scala.html`, `partial_update_notification.scala.html` | Any normal route, site-admin update notification watched and update version available. | `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/routes/__root.tsx`, `frontend/src/auth-workspace-shell.spec.tsx` | layout | covered in current follow-up | P0 | none | `body#html-body`, `#main.main`, and the legacy site-admin `<p class="center-txt">` update notification are covered. `RootUpdateNotification` reads `/api/v1/site/update`, renders `site.update.notification`, preserves `data-request-method="post"` and `data-request-uri="/sites/unwatchUpdate"`, and POSTs the legacy hide action with CSRF. |
| `common/scripts.scala.html` | Any route with common scripts. | `frontend/src/routes/__root.tsx`, `frontend/src/auth-workspace-shell.spec.tsx` | interaction | covered in current follow-up | P0 | none | `LegacyGlobalContainers` now renders global `#yobiDialog`, `#yobiToasts`, and `#tplYobiToast`; the toast template keeps its legacy `script[type="text/x-jquery-tmpl"]` anchor as a React string child rather than `dangerouslySetInnerHTML`. The navbar search-scope handler preserves legacy `href="#"`, `data-action`, form `action` update, and `#gnb-search-scope-title` text update behavior. Focused static proof is in `auth-workspace-shell.spec.tsx`. Behavior consumers remain tracked by the separate flash/shortcut/upload/viewer row. |
| `common/navbar.scala.html` | Header on global/project/org routes. | `frontend/src/routes/__root.tsx`, `frontend/src/app.css`, `frontend/src/auth-workspace-shell.spec.tsx` | css | covered in current follow-up | P0 | none | Global nav CSS now follows legacy `_page.less` for dark `.gnb-outer`, translucent project-route header, `.gnb-inner` width/margins, muted orange `.logo-letter`, divider pipes, and collapsed/focused search input widths. Full asset-chain parity and visual screenshots remain tracked separately. |
| `common/navbar.scala.html` | Pin/sidebar toggle, framed/non-framed state. | `frontend/src/routes/__root.tsx`, `frontend/src/auth-workspace-shell.spec.tsx` | interaction | covered in current follow-up | P0 | none | Root header pin now preserves legacy `data-toggle="tooltip"`/`data-placement="bottom"` anchors, sets `localStorage.shallWeOpenLeftNavigation`, redirects top-level pages to `/sidebar?path=...&hash=...`, exits iframe state by clearing the flag and assigning `window.parent.location.href`, and reloads the framed sidebar pin after clearing the same flag. |
| `layout_framed.scala.html` | `/sidebar?path=...&hash=...`, authenticated framed shell. | `frontend/src/routes/__root.tsx`, `frontend/src/routes/sidebar/route.tsx`, `frontend/src/app.css`, `frontend/src/auth-workspace-shell.spec.tsx` | route | covered in current follow-up | P0 | none | `/sidebar` now renders a root-level framed shell instead of the normal header/footer wrapper: `body.framed-body`, `#sidebar.sidebar.hide-in-mobile`, `#sidebar-bottom`, `#mainFrame`, and `iframe#mainFrameId.mainFrame` anchors are present, and iframe `src` construction preserves legacy `path` plus `hash` query behavior under `/yona`. |
| `common/usermenu.scala.html`, `sidebar.scala.html` | Authenticated side menu tabs/favorites. | `frontend/src/routes/__root.tsx`, workspace overview mapping, `frontend/src/auth-workspace-shell.spec.tsx` | interaction | covered in current follow-up | P0 | none | Root sidebar renders the legacy tab content shape directly instead of loading a server HTML fragment from `UsermenuUrl`: `#usermenu-tab-content-list`, `myOrganizationList`/`myProjectList`/`myRecentIssueList`, `sidebarActiveMenu` localStorage tab persistence, active pane restoration, framed refresh button, and `.sidebar-bottom` show/hide behavior are preserved. `user-project-list` styling is restored for star colors, project rows carry legacy `star-project` and owner/project data anchors, and project favorite clicks call the REST toggle, update the `starred` class from legacy-shaped `favored` responses, refresh workspace data, and preserve stop-propagation behavior. Issue favorite controls are owned by the issue packet and already render `.favorite-issue`; organization favorite controls are route-specific organization/profile UI, not P0 global shell closure. Focused static and pure response-contract proof is in `auth-workspace-shell.spec.tsx`. |
| `common/loginDialog.scala.html` | Anonymous login dialog local error state. | `frontend/src/routes/-auth-views.tsx`, `frontend/src/routes/__root.tsx`, `frontend/src/auth-workspace-shell.spec.tsx` | interaction | covered in current follow-up | P0 | none | `RootLoginDialog` now keeps login failures local to the modal and `LegacyLoginDialog` fills `.loginDialog .error .error-message` with resolved legacy copy. Pixel/modal geometry remains part of the verifier baseline. |
| `common/scripts.scala.html` | Flash toast/alert, shortcuts, upload globals, markdown viewer. | `frontend/src/routes/__root.tsx`, `frontend/src/runtime-config.ts`, `crates/server/src/state.rs`, `frontend/src/auth-workspace-shell.spec.tsx`, `crates/server/tests/assets_contract.rs`, scattered route files | interaction | covered in current follow-up | P0 | none | `LegacyCommonScriptsBridge` now covers React-side flash notification projection into `#yobiToasts` from `[data-toggle=yobi-notify]`, CTRL+ENTER submit for input/textarea forms, markdown external-link `target=_blank` behavior, progressbar-link detection via a `legacy:nprogress:start` event, and the layout-level markdown viewer contract: `.markdown-wrap img` receives pointer cursor, duplicate-safe viewer binding markers, and `legacy:viewer:open` event detail for gallery consumers. It also maps legacy `yobi.Files.init` defaults through `legacyApplyFilesRuntimeDefaults`: `sListURL` and `sUploadURL` resolve to base-path-aware `/files`, `maxFileSize` defaults to the legacy `2147483454`, server runtime injection exposes configured `maxUploadedFileSize`, and `.upload-wrap` nodes receive the same list/upload/max-size data defaults. Focused proof is in `auth-workspace-shell.spec.tsx`; server injection proof is in `assets_contract.rs`. The task-list insert listener remains covered by `addLegacyTasklistTemplateFromButton` / `insertLegacyTasklistTemplate` in `frontend/src/routes/-markdown-renderer.tsx`. |
| `common/footer.scala.html` | Normal pages. | `frontend/src/routes/__root.tsx`, `frontend/src/app.css`, `scripts/visual-parity-sweep.mjs` | layout | covered in current follow-up | P0 | none | Source/E2E assert `.page-footer-outer .page-footer` and provider copy. The 2026-06-26 P0 visual follow-up restored legacy footer CSS from `_page.less`: `.page-footer-outer` padding/background and `.page-footer` centered `line-height:34px`. Focused post-fix Playwright metrics show normal checked routes render `footer.page-footer-outer` at 1366x56 with white background, matching the legacy visual sweep metric. |
| `common/navbar.scala.html` | Anonymous/authenticated header basics/search scope. | `frontend/src/routes/__root.tsx`, `frontend/src/app.css`, `scripts/visual-parity-sweep.mjs`, `scripts/visual-parity-comparison.spec.mjs`, `frontend/src/auth-workspace-shell.spec.tsx` | test-gap | covered in current follow-up | P0 | none | The visual sweep now records computed-style metrics for `.gnb-outer`, `.gnb-inner`, `.gnb-usermenu`, `#mySidenav`, and `footer.page-footer-outer`, fails normal pages missing the inner/user-menu navbar containers, exempts framed `/sidebar` from normal navbar requirements, and always writes desktop screenshots for `/`, `/admin/sample`, and `/users/loginform`. The 2026-06-26T15:03Z legacy-proxy/current run through `output/playwright/visual-sweep/latest.json` proved legacy and current both render `.gnb-outer` and `.gnb-inner` at 1366px desktop width on `/`, `/admin/sample`, and `/users/loginform`, with screenshots at `output/playwright/visual-sweep/legacy-_.png`, `local-_.png`, `legacy-_admin_sample.png`, `local-_admin_sample.png`, `legacy-_users_loginform.png`, and `local-_users_loginform.png`. That run exposed P0 chrome drift bugs in current output: closed create dropdowns inflated `.gnb-usermenu` to 477x270, avatar images rendered at source size, `/admin/sample` used the global dark nav instead of the translucent project-route header, and footer height collapsed to 18px. Current follow-up restored legacy Bootstrap dropdown hiding, `.gnb-usermenu-dropdown`/toggle/caret rules, `.avatar-wrap.smaller` sizing, legacy footer baseline rules, and root route classification so `/admin/sample` is a project route while `/admin` remains a user/profile root. Focused post-fix Playwright metrics show authenticated `/` and `/admin/sample` render `.gnb-usermenu` at 40px high, `.avatar-wrap.smaller` at 20x20, `.dropdwon-box-btn` as a 30px-high inline-block create button, and `/admin/sample` renders `header.gnb-outer.project-header` with `position:absolute` and `rgba(0,0,0,0.35)` background. Broader full-sweep failures remain outside this P0 navbar row: legacy homelab/sample-data status deltas, site-admin authorization state, and local seeded fixture/public-origin data rows. |

## Verifier Evidence

P0 baseline verifier evidence is now recorded, with root-shell interaction proof
and visual sweep metrics split by responsibility.

Root shell/browser verifier run:

- Command: `pnpm --dir frontend test:e2e -- root-shell-parity.e2e.ts`
- Checked at: `2026-06-27`
- Result: `6 passed`.
- Coverage: anonymous desktop root shell, login dialog open/error state, mobile
  login dialog at `390x844`, authenticated site-admin root shell, side menu
  tabs, create dropdown hidden/open states, guest navbar restrictions,
  standalone legacy pages, project-route search scope actions, `/yona` base-path
  anchors, and visible raw legacy key absence.

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
  `frontend/public/legacy-assets/**`, generated by `build:legacy-css` without
  importing legacy JavaScript.

Closure note:

- P0 has zero recorded `gap`, `deviation`, and `weak evidence` rows. It remains
  subject to the top-level integrated browser sweep before whole UI parity can
  be claimed, but this packet no longer has a standalone verifier-baseline
  blocker.
