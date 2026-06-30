# UI Parity Report: Auth Public Entry

Status: current evidence workspace
Date: 2026-06-26

## Sources

- Legacy routes: `yona-original/conf/routes` `GET /`,
  `GET /users/loginform`,
  `GET /users/signupform`, `POST /users/signup`, `GET/POST /lostPassword`,
  `GET/POST /resetPassword`, `GET /verify/:loginId/:verificationCode`,
  `GET /_help`, `GET /_UIKit`
- Legacy controllers: `yona-original/app/controllers/UserApp.java`,
  `yona-original/app/controllers/PasswordResetApp.java`,
  `yona-original/app/controllers/HelpApp.java`,
  `yona-original/app/controllers/Application.java`
- Legacy templates: `yona-original/app/views/user/login.scala.html`,
  `signup.scala.html`, `resetPassword.scala.html`, `verified.scala.html`,
  `yona-original/app/views/site/lostPassword.scala.html`,
  `yona-original/app/views/index/notifications.scala.html`,
  `yona-original/app/views/index/partial_intro.scala.html`,
  `yona-original/app/views/index/partial_notifications.scala.html`,
  `yona-original/app/views/common/mySeriesMenuTab.scala.html`,
  `yona-original/app/views/help/toc.scala.html`,
  `yona-original/app/views/help/UIKit.scala.html`,
  `yona-original/app/views/error/badrequest_default.scala.html`,
  `yona-original/app/views/common/scripts.scala.html`
- Current React/API: `frontend/src/routes/-auth-views.tsx`,
  `frontend/src/routes/index.tsx`,
  `frontend/src/routes/notifications.tsx`,
  `frontend/src/routes/users/loginform.tsx`,
  `frontend/src/routes/users/signupform.tsx`,
  `frontend/src/routes/lostPassword.tsx`,
  `frontend/src/routes/resetPassword.tsx`,
  `frontend/src/routes/restart.tsx`,
  `frontend/src/routes/restricted.tsx`,
  `frontend/src/routes/secret.tsx`,
  `frontend/src/routes/(legacy-auth)/reset-password/route.tsx`,
  `frontend/src/routes/login/route.tsx`,
  `frontend/src/routes/register/route.tsx`,
  `frontend/src/routes/forgot-password/route.tsx`,
  `frontend/src/routes/verify/$loginId/$verificationCode.tsx`,
  `frontend/src/routes/[_]help.tsx`,
  `frontend/src/routes/[_]UIKit.tsx`,
  `frontend/src/api/auth.ts`, `frontend/src/auth-workspace-client.ts`,
  `frontend/vite.config.ts`
- Focused specs: `frontend/src/auth-workspace-shell.spec.tsx`,
  `frontend/src/wave1-auth-workspace-parity.spec.tsx`,
  `frontend/src/help-route-parity.spec.tsx`,
  `frontend/tests/auth-public-entry-parity.e2e.ts`,
  `frontend/tests/authenticated-home-empty-notifications.e2e.ts`,
  `frontend/tests/public-landing-parity.e2e.ts`,
  `frontend/tests/ui-kit.e2e.ts`,
  `frontend/tests/help-toc.e2e.ts`,
  `frontend/tests/loginform.e2e.ts`, `frontend/tests/signupform.e2e.ts`,
  `frontend/tests/lost-password.e2e.ts`, `frontend/tests/reset-password.e2e.ts`,
  `frontend/tests/restart.e2e.ts`, `frontend/tests/secret-setup.e2e.ts`,
  `frontend/tests/restricted.e2e.ts`,
  `frontend/tests/verify-user.e2e.ts`

## Route Inventory Summary

Total rows: 13

| Status | Count |
| --- | ---: |
| covered | 13 |
| weak evidence | 0 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 1 |
| needs-parent-decision | 0 |

## Result Inventory

| Route/state | Legacy source and behavior | Current source and evidence | Status | Owner |
| --- | --- | --- | --- | --- |
| `/users/signupform` valid submit with `signup.require.admin.confirm=true` or `application.use.email.verification=true` | `UserApp.newUser()` sets flash `user.signup.requested` or `user.verification.mail.sent`, then redirects to `Application.index()`; `common/scripts.scala.html` displays flash through `$yobi.notify(...)`. | `frontend/src/routes/users/signupform/route.tsx` keeps the React REST submit boundary through `registerWithPassword` and now routes anonymous post-state to `/?signup=requested` or `/?verify=sent`; `IndexRouteComponent` maps those query states to the legacy flash keys and `HomePage` renders a `data-toggle="yobi-notify"` success notification. | covered in Wave 4 | `frontend/src/routes/index.tsx`, `frontend/src/routes/-home-view.tsx`, `frontend/src/auth-workspace-shell.spec.tsx`, `frontend/src/route-parity.spec.tsx` |
| Signup confirmation description admin-contact interpolation | `signup.scala.html` renders `title.signupConfirmDesc2` with the reversed default admin email argument. Legacy `conf/messages` expects `{0}` in that description. | `/api/v1/auth/capabilities` now projects `defaultAdminContact` from the legacy default `admin` user email after reversing it, `AppRuntimeContext` maps it into the auth view model, and `RegisterPage` passes it to `title.signupConfirmDesc2` while preserving the legacy `<span class="obfuscate">` wrapper. `auth-public-entry-parity.e2e.ts` asserts the browser-visible obfuscated contact on `/users/signupform`. | covered | none |
| Public auth browser raw-key absence proof | Legacy public auth/setup templates resolve message-backed labels and descriptions through `Messages(...)`. | `frontend/tests/auth-public-entry-parity.e2e.ts` now runs visible `body.innerText()` raw-key scans across first-run `/secret`, login, signup, lost/reset password, verify success/invalid, auth aliases, help, and social/OAuth states while preserving REST JSON submit boundaries. | covered | none |
| `/lostPassword` invalid request | `PasswordResetApp.requestResetPasswordEmail()` returns `lostPassword.scala.html` with `site.mail.fail` and `site.resetPasswordEmail.invalidRequest`. | `LostPasswordPage` renders the same alert/error copy for `/lostPassword?error=invalid`; React submits through `/api/v1/auth/password-reset/request`. | covered | none |
| `/resetPassword` valid submit | `PasswordResetApp.resetPassword()` updates the password, flashes `user.loginWithNewPassword`, and returns the legacy login template. | REST `/auth/password-reset/complete` returns `/users/loginform?password=reset`; `LoginPage` renders the legacy login shell and `user.loginWithNewPassword`. Redirect-after-REST is the app-runtime boundary replacement for a direct POST template response. | covered | none |
| `/resetPassword` invalid submit | `PasswordResetApp.resetPassword()` returns `400` `ErrorViews.BadRequest.render("site.resetPasswordEmail.wrongUrl")`, which uses `badrequest_default.scala.html`. | `ResetPasswordPage` now renders the same bad-request wrapper and `site.resetPasswordEmail.wrongUrl` message for `/resetPassword?error=invalid` instead of keeping the reset form visible; focused render spec pins `.page-wrap-outer`, `.project-page-wrap`, `.error-wrap`, `.ico-404`, Home link, and absence of `name="passwordReset"`. | covered | none |
| `/verify/:loginId/:verificationCode` invalid verification | `UserApp.verifyUser()` returns `404` plain body `Invalid verification`. | `frontend/src/routes/verify/$loginId/$verificationCode.tsx` keeps a pending state until REST verification resolves, renders the legacy success shell on success, and renders plain `Invalid verification` without the SPA error shell when REST `/api/v1/auth/verify` rejects. The browser HTTP status for a React deep link remains SPA fallback behavior; REST verify already carries not-found status. | not-applicable | Exact deep-link HTTP status would need server direct-route/fallback ownership, not React auth view scope. |
| Public auth browser-proof checklist depth | Legacy public entry includes `/`, first-run `/secret` admin setup, `/restart`, login form with `rememberMe` and `redirectUrl`, signup, lost/reset password valid/invalid states, verify success/invalid states, auth aliases, `/_help`, and optional OAuth/social-login-only variants. | `frontend/tests/secret-setup.e2e.ts` gives `/secret` its own whole-screen template-first proof from `welcome/secret.scala.html`, including page/footer roots, form shell, CSRF-backed REST JSON submit, and base-path restart redirect. `frontend/tests/restart.e2e.ts` gives `/restart` its own whole-screen proof from `welcome/restart.scala.html`. `frontend/tests/auth-public-entry-parity.e2e.ts` remains broader smoke evidence for public auth flows, aliases, anonymous `/_help`, OAuth/social states, lost/reset states, and verify states. | covered | none |
| `/login`, `/register`, `/forgot-password`, `/reset-password` auth aliases | Legacy canonical public routes are `/users/loginform`, `/users/signupform`, `/lostPassword`, and `/resetPassword`; aliases are app-runtime convenience routes and must not introduce a divergent UI shell. | `frontend/src/routes/login/route.tsx`, `register/route.tsx`, `forgot-password/route.tsx`, and `(legacy-auth)/reset-password/route.tsx` redirect to the canonical legacy paths through `RedirectPage`, preserving base path and query where required. `frontend/tests/auth-public-entry-parity.e2e.ts` proves alias navigation including `/reset-password?s=...` query preservation. | covered | none |
| `/_help` anonymous help/FAQ page | `conf/routes` maps `GET /_help` to anonymous `HelpApp.help()` and `help/toc.scala.html` under `siteLayout.scala.html`; FAQ rows toggle by clicking `.qas > .qa`. | `frontend/src/routes/[_]help.tsx` is the active template-first reset route copied from `help/toc.scala.html` and wrapped in the shared legacy site shell. `frontend/tests/help-toc.e2e.ts` compares the stable `.unsupported`, `.gnb-outer`, `.site-breadcrumb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots, all six `.qas > .qa` rows, anchors, runtime `app.name` substitution, exact `style="width:100%"`, and first-row open/closed toggle after a RED baseline against the reset route tree. `frontend/tests/auth-public-entry-parity.e2e.ts` remains broader smoke evidence for anonymous access and raw-key absence. | covered | none |
| `/_UIKit` standalone UI kit page | `conf/routes` maps `GET /_UIKit` to `Application.UIKit()`, which returns `help/UIKit.scala.html` as a standalone document with its own header, page body samples, and NAVER footer. | `frontend/src/routes/[_]UIKit.tsx` is the active template-first reset route for the standalone body roots. `frontend/tests/ui-kit.e2e.ts` reads the legacy Scala HTML file, extracts `<body>`, and compares `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer`, including button/upload/dropdown/search/label/avatar/tab/switch samples and stable data/style attributes. | covered | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/restart` | restart notice after first-run setup | `welcome/restart.scala.html` standalone page/footer shell, logo, welcome heading, restart notice, footer provider | active flat route `frontend/src/routes/restart.tsx` preserves `.page-wrap-outer`, `.container.page-wrap`, `.secret-wrap`, `.logo`, `p.secret-box.txt-center`, and footer provider; `frontend/tests/restart.e2e.ts` whole-screen browser proof added on 2026-06-30 | direct route render | anonymous React page, no REST mutation | covered |
| `/restricted` | authenticated restricted sample | `restricted.scala.html` in `siteLayout.scala.html`, global nav/search wrapper, fixed YouTube iframe, local user name/email, verification state, provider/user ID, session expiry text | active flat route `frontend/src/routes/restricted.tsx` preserves `.unsupported`, `.gnb-outer`, `.gnb-nav`, `.page-wrap-outer`, `.page-wrap`, fixed iframe, session-bound identity/auth copy, and footer provider; `frontend/tests/restricted.e2e.ts` whole-screen browser proof added on 2026-06-30 | direct route render with mocked current session | React reads `/api/v1/session`; server auth guard remains backend-owned | covered |
| `/` | anonymous public landing | `index/notifications.scala.html` anonymous branch renders `partial_intro.scala.html` inside `siteLayout`: hero heading, signup CTA, six feature rows, footer links | active flat route `frontend/src/routes/index.tsx` preserves `.unsupported`, `.gnb-outer`, `.siteintro-bg`, `.siteintro`, `.signup-btn`, `.feature-wrap`, all feature rows, and the global footer; `frontend/tests/public-landing-parity.e2e.ts` whole-screen browser proof added on 2026-06-30 | direct route render; signup anchor href asserted | anonymous React page; authenticated notifications branch remains a separate screen state | covered |
| `/`, `/notifications` | authenticated notification home | `index/notifications.scala.html` authenticated branch renders guide table, toggle, `common.mySeriesMenuTab(TAB_NOTI)`, and `partial_notifications(0, 20)` empty state or `.notification-stream` rows | active flat routes `frontend/src/routes/index.tsx` and `frontend/src/routes/notifications.tsx` read `/api/v1/session` and `/api/v1/notifications`, preserve the page wrapper, hidden guide, welcome table, `#toggleIntro`, notification/my-issues/my-files tabs, direct `/notifications` `#setDefaultLoginPage` popover button, `.activity-streams.notification-wrap.unstyled`, `.warning-none`, and one-row stream DOM; `frontend/tests/authenticated-home-empty-notifications.e2e.ts` whole-screen browser proof added on 2026-06-30 and extended for a populated direct `/notifications` row | direct route render with mocked authenticated session and empty or one-row notification list | React uses TanStack Query REST boundaries for the legacy partial data | covered |
| `/secret` | first-run/no-admin setup | `welcome/secret.scala.html` standalone page/footer shell, read-only `loginId=admin`, admin name/password/email fields, restart redirect after setup | active flat route `frontend/src/routes/secret.tsx` preserves the page/footer roots, `.secret-wrap`, warning alert, `.signup-form-wrap.frm-wrap`, legacy form attributes, read-only admin id, field order, submit button, footer provider, and base-path restart redirect; `frontend/tests/secret-setup.e2e.ts` whole-screen browser proof added on 2026-06-30 | fill admin fields, submit, assert restart redirect | React bootstraps CSRF through `/api/auth/session` and submits `/api/v1/auth/secret` REST JSON | covered |
| `/users/loginform` | anonymous login | login form fields, `rememberMe`, `redirectUrl`, forgot-password link | active template-first reset route `frontend/src/routes/users/loginform.tsx` preserves the rendered `.page.full` DOM and legacy link shape; `frontend/tests/loginform.e2e.ts` whole-container browser proof added on 2026-06-30 | direct route render; focused submit wiring stays on existing React mutation boundary | React reads `/api/v1/auth/capabilities`, bootstraps CSRF through `/api/auth/session`, and submits `/api/v1/auth/sign-in` REST JSON | covered |
| `/users/signupform` | anonymous signup | signup form fields, `form[name=signup]`, login link, confirmation/admin-contact states | active template-first reset route `frontend/src/routes/users/signupform.tsx` preserves the rendered `.page.full` DOM and legacy link shape; `frontend/tests/signupform.e2e.ts` whole-container browser proof added on 2026-06-30 | direct route render; focused submit wiring stays on existing React mutation boundary | React reads `/api/v1/auth/capabilities`, bootstraps CSRF through `/api/auth/session`, and submits `/api/v1/auth/register` REST JSON | covered |
| `/lostPassword`, `/resetPassword` | valid/invalid reset | lost/reset form copy, invalid reset bad-request shell, valid reset login flash | active template-first reset routes `frontend/src/routes/lostPassword.tsx` and `frontend/src/routes/resetPassword.tsx` preserve the anonymous request/reset form `.page.full` DOM and password-reset REST boundary; `frontend/tests/lost-password.e2e.ts` and `frontend/tests/reset-password.e2e.ts` provide whole-container browser proof | submit/reset route states | React password reset REST boundary | covered |
| `/verify/:loginId/:verificationCode` | success/invalid verification | `user/verified.scala.html` success shell or plain `Invalid verification` | active flat route `frontend/src/routes/verify/$loginId/$verificationCode.tsx` preserves the `.page.full` verified-user shell with login id, divider, and detail copy; `frontend/tests/verify-user.e2e.ts` whole-screen browser proof added on 2026-06-30 | direct deep link | REST verify owns status; React renders result | covered |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | auth aliases | canonical legacy public forms remain `/users/loginform`, `/users/signupform`, `/lostPassword`, `/resetPassword` | aliases redirect to canonical legacy route shells with base-path/query preservation | direct alias navigation | React `RedirectPage`; canonical screens keep REST JSON submit boundaries | covered |
| `/_help` | anonymous help page | `HelpApp.help()`, `help/toc.scala.html`, and `siteLayout.scala.html`, `.qas > .qa` FAQ toggle | active flat route `frontend/src/routes/[_]help.tsx` preserves the global site shell, breadcrumb/page/FAQ roots, six legacy FAQ rows, anchors, runtime app-name copy, footer, and item-wide toggle; `frontend/tests/help-toc.e2e.ts` whole-screen browser proof added on 2026-06-30 and extended to global shell/footer roots | render help and click FAQ row | anonymous React page, no REST mutation | covered |
| `/_UIKit` | standalone UI kit page | `Application.UIKit()` and `help/UIKit.scala.html`, standalone `.gnb-outer`, sample `.page-wrap-outer`, and NAVER footer | active flat route `frontend/src/routes/[_]UIKit.tsx` preserves the standalone body roots and sample controls; `frontend/tests/ui-kit.e2e.ts` compares the rendered body roots against the legacy template body | direct route render | anonymous React page, no REST mutation | covered |
