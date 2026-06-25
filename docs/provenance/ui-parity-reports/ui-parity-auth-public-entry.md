# UI Parity Report: Auth Public Entry

Status: current evidence workspace
Date: 2026-06-26

## Sources

- Legacy routes: `yona-original/conf/routes` `GET /users/loginform`,
  `GET /users/signupform`, `POST /users/signup`, `GET/POST /lostPassword`,
  `GET/POST /resetPassword`, `GET /verify/:loginId/:verificationCode`
- Legacy controllers: `yona-original/app/controllers/UserApp.java`,
  `yona-original/app/controllers/PasswordResetApp.java`
- Legacy templates: `yona-original/app/views/user/login.scala.html`,
  `signup.scala.html`, `resetPassword.scala.html`, `verified.scala.html`,
  `yona-original/app/views/site/lostPassword.scala.html`,
  `yona-original/app/views/error/badrequest_default.scala.html`,
  `yona-original/app/views/common/scripts.scala.html`
- Current React/API: `frontend/src/routes/-auth-views.tsx`,
  `frontend/src/routes/users/signupform/route.tsx`,
  `frontend/src/routes/lostPassword/route.tsx`,
  `frontend/src/routes/resetPassword/route.tsx`,
  `frontend/src/routes/(legacy-auth)/reset-password/route.tsx`,
  `frontend/src/routes/verify/$loginId/$verificationCode/route.tsx`,
  `frontend/src/api/auth.ts`, `frontend/src/auth-workspace-client.ts`,
  `frontend/vite.config.ts`
- Focused specs: `frontend/src/auth-workspace-shell.spec.tsx`,
  `frontend/src/wave1-auth-workspace-parity.spec.tsx`,
  `frontend/tests/auth-public-entry-parity.e2e.ts`

## Route Inventory Summary

Total rows: 6

| Status | Count |
| --- | ---: |
| covered | 5 |
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
| `/lostPassword` invalid request | `PasswordResetApp.requestResetPasswordEmail()` returns `lostPassword.scala.html` with `site.mail.fail` and `site.resetPasswordEmail.invalidRequest`. | `LostPasswordPage` renders the same alert/error copy for `/lostPassword?error=invalid`; React submits through `/api/v1/auth/password-reset/request`. | covered | none |
| `/resetPassword` valid submit | `PasswordResetApp.resetPassword()` updates the password, flashes `user.loginWithNewPassword`, and returns the legacy login template. | REST `/auth/password-reset/complete` returns `/users/loginform?password=reset`; `LoginPage` renders the legacy login shell and `user.loginWithNewPassword`. Redirect-after-REST is the app-runtime boundary replacement for a direct POST template response. | covered | none |
| `/resetPassword` invalid submit | `PasswordResetApp.resetPassword()` returns `400` `ErrorViews.BadRequest.render("site.resetPasswordEmail.wrongUrl")`, which uses `badrequest_default.scala.html`. | `ResetPasswordPage` now renders the same bad-request wrapper and `site.resetPasswordEmail.wrongUrl` message for `/resetPassword?error=invalid` instead of keeping the reset form visible; focused render spec pins `.page-wrap-outer`, `.project-page-wrap`, `.error-wrap`, `.ico-404`, Home link, and absence of `name="passwordReset"`. | covered | none |
| `/verify/:loginId/:verificationCode` invalid verification | `UserApp.verifyUser()` returns `404` plain body `Invalid verification`. | `frontend/src/routes/verify/$loginId/$verificationCode/route.tsx` now keeps a pending state until REST verification resolves, and `VerifyUserPage` renders plain `Invalid verification` without the SPA error shell when REST `/api/v1/auth/verify` rejects. The browser HTTP status for a React deep link remains SPA fallback behavior; REST verify already carries not-found status. | not-applicable | Exact deep-link HTTP status would need server direct-route/fallback ownership, not React auth view scope. |
| Public auth browser-proof checklist depth | Legacy public entry includes `/`, first-run `/secret` admin setup, login form with `rememberMe` and `redirectUrl`, signup, lost/reset password valid/invalid states, verify success/invalid states, auth aliases, and optional OAuth/social-login-only variants. | `frontend/tests/auth-public-entry-parity.e2e.ts` now proves browser-visible first-run `/secret` admin setup through REST JSON with restart redirect, login submit with `rememberMe=false` and `redirectUrl`, signup-confirm redirect and flash, auth aliases including `/reset-password?s=...` query preservation, social-login-only GitHub/Google controls, OAuth unsupported/denied alerts, lost/reset valid and invalid states, and verify success/invalid states. `frontend/vite.config.ts` no longer proxies the React-owned `/resetPassword` page path to the backend during dev, so mounted-base-path deep links render the React route. Verification: `pnpm --dir frontend test:e2e -- auth-public-entry-parity.e2e.ts` passed 7 Playwright tests on 2026-06-27. | covered | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/secret` | first-run/no-admin setup | `#frmSignUp`, admin login/password/email fields, restart redirect after setup | same form shell and submit controls in `auth-public-entry-parity.e2e.ts` | fill admin fields, submit, assert restart redirect | React submits `/api/v1/auth/secret` REST JSON | covered |
| `/users/loginform` | anonymous login | login form fields, `rememberMe`, `redirectUrl`, legacy error alert | same selectors and error copy | submit failure and preserve redirect | React submits `/api/v1/auth/login` REST JSON | covered |
| `/users/signupform` | signup confirmation | signup form redirects to index flash when confirmation/email verification is required | same redirect and notification shell | submit valid signup | React submits `/api/v1/auth/register` REST JSON | covered |
| `/lostPassword`, `/resetPassword` | valid/invalid reset | lost/reset form copy, invalid reset bad-request shell, valid reset login flash | same document titles, bad-request shell, and login flash | submit/reset route states | React password reset REST boundary | covered |
| `/verify/:loginId/:verificationCode` | success/invalid verification | verified shell or plain `Invalid verification` | same visible success/invalid copy after REST resolution | direct deep link | REST verify owns status; React renders result | covered |
