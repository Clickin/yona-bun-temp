# Template-First UI Parity Report: P1 Auth/Public/Home

Status: current reset baseline
Date: 2026-06-27
Owner packet: P1 auth/public/home
Mode: template-first mapper baseline; implementation evidence reviewed

## Scope

This report reopens anonymous public entry, login/signup, password reset,
verification, first-run setup, OAuth/social login controls, public home intro,
and help parity under
`docs/plans/2026-06-26-template-first-ui-parity-reset.md`.

The older `ui-parity-auth-public-entry.md` report remains useful route/API
evidence. This report restates it in the template-first reset format and keeps
the app-runtime boundary explicit: legacy form posts and flash/template returns
are implemented as REST JSON plus React-rendered legacy DOM, not copied legacy
JavaScript or Play form handlers.

## Legacy Template Call Graph

| Legacy source | Role | Required anchors |
| --- | --- | --- |
| `yona-original/app/views/index/notifications.scala.html`, `index/partial_intro.scala.html`, `siteLayout.scala.html`, `common/navbar.scala.html`, `common/footer.scala.html` | Anonymous public landing hero/features/signup CTA. | `.unsupported`, `.gnb-outer`, `.siteintro-bg`, `.siteintro`, `.site-heading`, `.site-features`, `.signup-btn`, `.feature`, `.feature-wrap`, `.feature-image`, `.feature-info`, `.page-footer-outer`. |
| `yona-original/app/views/index/index.scala.html`, `index/notifications.scala.html`, `index/partial_notifications.scala.html`, `common/mySeriesMenuTab.scala.html` | Authenticated default landing delegates to notifications/workspace home. | `.page-wrap-outer`, `.site-guide-outer`, `.welcome-table`, `.guide-toggle`, `#toggleIntro`, `.page.on-fold-intro`, `.content-container`, `.main-stream`, `.nav.nav-tabs`, `#setDefaultLoginPage`, `.activity-streams.notification-wrap`, `.warning-none`, `.notification-stream`, `.stream-type`, `.stream-desc[data-toggle=learnmore]`, `.message-wrap.nowrap`, `.avatar-wrap.smaller`, `.author`, `.ago.pull-right`. |
| `yona-original/app/views/user/login.scala.html` | Login form, redirect, social-login-only warning, OAuth buttons, remember me, forgot password link. | `.page.full`, `.tag-line-wrap.login`, `.login-form-wrap.frm-wrap`, `input[name=redirectUrl]`, `#loginIdOrEmailD`, `#password`, `.oauth-login-btn`, `#remember-me`, `.links-wrap a[href*=lostPassword]`. |
| `yona-original/app/views/user/signup.scala.html` | Signup form, signup-confirm admin contact, social-login-only warning, login link. | `.tag-line-wrap.signup`, `.signup-form-wrap.frm-wrap`, `form[name=signup]`, `#loginId`, `#uname`, `#email`, `#password`, `#retypedPassword`, `.go-login`, obfuscated admin contact text. |
| `yona-original/app/views/site/lostPassword.scala.html` | Lost password request form and success/error alerts. | `.tag-line-wrap.reset-password`, `.login-form-wrap.frm-wrap`, `.alert.alert-success`, `.alert.alert-error`, `#loginId`, `#emailAddress`. |
| `yona-original/app/views/user/resetPassword.scala.html` | Reset password form. | `form[name=passwordReset]`, `input[name=hashString]`, `#password`, `#retypedPassword`, `.btns-row`. |
| `yona-original/app/views/error/badrequest_default.scala.html` | Invalid reset URL error shell. | `.page-wrap-outer`, `.project-page-wrap`, `.error-wrap`, `.ico-404`, Home link. |
| `yona-original/app/views/help/toc.scala.html`, `siteLayout.scala.html`, `common/navbar.scala.html`, `common/footer.scala.html` | Anonymous help/FAQ page. | `.unsupported`, `.gnb-outer`, `.site-breadcrumb-outer`, `.site-breadcrumb-inner h3`, `.page-wrap`, `.qas > .qa`, `.question-wrap`, `.answer-wrap`, row open/closed toggle, `.page-footer-outer`. |
| `yona-original/app/views/help/UIKit.scala.html` | Standalone UI kit sample page. | `.gnb-outer`, `.subtitle`, `.page-wrap-outer`, `.container.page-wrap`, `.page`, button samples, dropdown samples, search forms, label samples, avatar samples, tabs, switch samples, `.page-footer-outer`. |
| `yona-original/app/views/restricted.scala.html`, `siteLayout.scala.html`, `common/navbar.scala.html` | Authenticated restricted sample page. | `.unsupported`, `.gnb-outer`, `.gnb-nav`, `.page-wrap-outer`, `.page-wrap`, fixed YouTube iframe, local user name/email, verification marker, provider/user ID, session expiry, `.page-footer-outer`. |

## Current React/API Targets

| Current source | Current responsibility |
| --- | --- |
| `frontend/src/routes/users/loginform.tsx` | Active template-first reset implementation for the anonymous `/users/loginform` screen, copied from `user/login.scala.html` and bound to auth capabilities/session REST helpers through TanStack Query. |
| `frontend/src/routes/users/signupform.tsx` | Active template-first reset implementation for the anonymous `/users/signupform` screen, copied from `user/signup.scala.html` and bound to auth capabilities/session/register REST helpers through TanStack Query. |
| `frontend/src/routes/lostPassword.tsx` | Active template-first reset implementation for the anonymous `/lostPassword` request screen, copied from `site/lostPassword.scala.html` and bound to password-reset REST helpers through TanStack Query. |
| `frontend/src/routes/resetPassword.tsx` | Active template-first reset implementation for the `/resetPassword?s=...` valid reset form screen, copied from `user/resetPassword.scala.html` and bound to password-reset REST helpers through TanStack Query. |
| `frontend/src/routes/restart.tsx` | Active template-first reset implementation for the `/restart` notice screen, copied from `welcome/restart.scala.html`. |
| `frontend/src/routes/secret.tsx` | Active template-first reset implementation for the first-run `/secret` setup screen, copied from `welcome/secret.scala.html` and bound to the secret-admin REST helper through TanStack Query. |
| `frontend/src/routes/restricted.tsx` | Active template-first reset implementation for the authenticated `/restricted` sample screen, copied from `restricted.scala.html` under `siteLayout.scala.html` and bound to current session REST through TanStack Query. |
| `frontend/src/routes/-home-route-screen.tsx`, `frontend/src/routes/index.tsx` | Active template-first reset implementation for anonymous `/` public landing and authenticated notification `/` home states, copied from `index/notifications.scala.html`, `index/partial_intro.scala.html`, `index/partial_notifications.scala.html`, and `common/mySeriesMenuTab.scala.html`. |
| `frontend/src/routes/notifications.tsx` | Active template-first reset implementation for direct authenticated `/notifications`, reusing the same `index/notifications.scala.html` notification screen through `-home-route-screen.tsx`. |
| `frontend/src/routes/-auth-views.tsx` | Login, signup, lost/reset password, verify, first-run setup, OAuth/social-login-only public auth surfaces. |
| `frontend/src/routes/-home-view.tsx`, `frontend/src/routes/index.tsx` | Anonymous home intro and authenticated/default landing notification states. |
| `frontend/src/routes/users/loginform.tsx`, `users/signupform.tsx`, `lostPassword.tsx`, `resetPassword.tsx`, `(legacy-auth)/reset-password/route.tsx`, `login/route.tsx`, `forgot-password/route.tsx` | Canonical public auth route entrypoints and aliases; login, signup, lost-password, and reset-password form are now active 2026-06-30 template-first reset routes. |
| `frontend/src/routes/verify/$loginId/$verificationCode.tsx` | Active template-first reset implementation for the `/verify/:loginId/:verificationCode` success screen, copied from `user/verified.scala.html` and bound to the verify REST helper through TanStack Query. |
| `frontend/src/routes/[_]help.tsx` | Active template-first reset implementation for the anonymous `/_help` screen, copied from `help/toc.scala.html` under the legacy site layout shell with the FAQ toggle kept in the route component. |
| `frontend/src/routes/[_]UIKit.tsx` | Active template-first reset implementation for the standalone `/_UIKit` screen, preserving the legacy body roots from `help/UIKit.scala.html`. |
| `frontend/src/api/auth.ts`, `frontend/src/auth-workspace-client.ts` | REST JSON auth/session/capability/password/verify boundaries. |
| `frontend/tests/loginform.e2e.ts` | Whole `.page.full` rendered DOM parity proof for anonymous `/users/loginform?redirectUrl=/me`; normalizes only mounted base path for the lost-password `Link` href. |
| `frontend/tests/signupform.e2e.ts` | Whole `.page.full` rendered DOM parity proof for anonymous `/users/signupform`; normalizes only mounted base path for the login `Link` href. |
| `frontend/tests/lost-password.e2e.ts` | Whole `.page.full` rendered DOM parity proof for anonymous `/lostPassword`; normalizes React/browser boolean-attribute handling only where needed. |
| `frontend/tests/reset-password.e2e.ts` | Whole `.page.full` rendered DOM parity proof for `/resetPassword?s=reset-token`; preserves the hidden reset hash input and submit form shape. |
| `frontend/tests/help-toc.e2e.ts` | Whole rendered DOM parity proof for anonymous `/_help`; compares the breadcrumb/page/FAQ roots and clicks the first FAQ row open/closed. |
| `frontend/tests/ui-kit.e2e.ts` | Whole rendered body-root DOM parity proof for standalone `/_UIKit`; reads `help/UIKit.scala.html`, extracts the legacy `<body>`, and compares `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer`. |
| `frontend/tests/restart.e2e.ts` | Whole rendered DOM parity proof for `/restart`; compares the page/footer roots from `welcome/restart.scala.html`. |
| `frontend/tests/secret-setup.e2e.ts` | Whole rendered DOM parity proof for `/secret`; compares the page/footer roots and proves CSRF-backed secret-admin REST submit plus base-path restart redirect. |
| `frontend/tests/restricted.e2e.ts` | Whole rendered DOM parity proof for `/restricted`; compares unsupported/nav/page/footer roots and session-bound identity/provider/expiry content from `restricted.scala.html`. |
| `frontend/tests/public-landing-parity.e2e.ts` | Whole rendered DOM parity proof for anonymous `/`; compares unsupported/nav/intro/footer roots, signup CTA, feature rows, and legacy footer links. |
| `frontend/tests/authenticated-home-empty-notifications.e2e.ts` | Whole rendered DOM parity proof for authenticated `/` and `/notifications` with zero notifications plus a direct `/notifications` one-row populated state; compares unsupported/nav/page/footer roots, welcome guide, notification tabs, empty notification copy, and legacy stream row DOM. |
| `frontend/tests/verify-user.e2e.ts` | Whole `.page.full` rendered DOM parity proof for `/verify/:loginId/:verificationCode` success; mocks only the verify REST result and preserves the legacy verified-user shell. |
| `frontend/src/auth-workspace-shell.spec.tsx`, `wave1-auth-workspace-parity.spec.tsx`, `help-route-parity.spec.tsx` | Static selector/source proof. |
| `frontend/tests/auth-public-entry-parity.e2e.ts`, `root-shell-parity.e2e.ts` | Browser-visible public auth/help/root-shell proof. |

## Open Reset Queue Summary

| status | count |
| --- | ---: |
| gap | 0 |
| deviation | 0 |
| weak evidence | 0 |
| covered | 14 |
| not-applicable | 1 |
| needs-parent-decision | 0 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `index/notifications.scala.html`, `index/partial_intro.scala.html` | Anonymous `/` public intro with signup CTA and feature grid. | `frontend/src/routes/index.tsx` | layout | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because the anonymous branch is one legacy partial plus site shell | `frontend/tests/public-landing-parity.e2e.ts` compares the stable `.unsupported`, `.gnb-outer`, `.siteintro-bg`, and `.page-footer-outer` roots, including global logo/search shell, hero heading/tagline, signup CTA rendered with the mounted base path, all six feature icon/title/description rows, and legacy copyright/footer links. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- public-landing-parity.e2e.ts`. |
| `index/notifications.scala.html`, `index/partial_notifications.scala.html`, `common/mySeriesMenuTab.scala.html` | Authenticated `/` and `/notifications` default landing with zero notifications and one populated notification row. | `frontend/src/routes/-home-route-screen.tsx`, `frontend/src/routes/index.tsx`, `frontend/src/routes/notifications.tsx`, `frontend/src/api/session.ts`, `frontend/src/api/notifications.ts` | layout | covered in 2026-06-30 template-first reset slice | P1 | none; empty and populated list rows are explicit states of the same legacy partial | `frontend/tests/authenticated-home-empty-notifications.e2e.ts` compares the stable `.unsupported`, `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots after mocking a non-anonymous session plus empty `/api/v1/notifications`, including `.site-guide-outer.hide`, welcome table actions/descriptions, `#toggleIntro`, `.page.on-fold-intro`, `common.mySeriesMenuTab` notification/my-issues/my-files tabs, the direct `/notifications` `#setDefaultLoginPage` button with `data-url`, popover hooks, title, and description copy, `.activity-streams.notification-wrap.unstyled`, and `.warning-none` copy for both `/` and `/notifications`; it also mocks a one-row notification response for direct `/notifications` and compares `.notification-stream`, `.stream-type.comment2`, `.stream-desc[data-target][data-toggle=learnmore]`, linked title, `.message-wrap.nowrap`, avatar/author login, and `.ago.pull-right`. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- authenticated-home-empty-notifications.e2e.ts public-landing-parity.e2e.ts`. |
| `user/login.scala.html` | `/users/loginform` login form with `redirectUrl`, username/password, remember me, forgot-password link. | `frontend/src/routes/users/loginform.tsx`, `frontend/src/api/auth.ts`, `frontend/src/auth-workspace-client.ts` | interaction | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because splitting this one-template screen would add indirection without reducing duplication | `frontend/tests/loginform.e2e.ts` was RED against the reset route tree, then GREEN after the Scala HTML skeleton was ported. It compares the whole stable `.page.full` container, including `.tag-line-wrap.login`, `.login-form-wrap.frm-wrap`, hidden `redirectUrl`, `#loginIdOrEmailD`, `#password`, submit button classes, `#remember-me`, and lost-password link. Allowed normalization: mounted `/yona` base path on the internal TanStack Router `Link` href. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- loginform.e2e.ts`. |
| `user/login.scala.html` | Social-login-only and OAuth provider controls. | `frontend/src/routes/-auth-views.tsx`, auth capabilities API | interaction | covered in current follow-up | P1 | none | Public entry e2e covers social-login-only mode, GitHub/Google provider buttons, OAuth unsupported/denied alerts, and absence of password fields in social-only state. This ports the user-visible UX without importing legacy Play Authenticate helpers. |
| `user/signup.scala.html` | `/users/signupform` default signup form. | `frontend/src/routes/users/signupform.tsx`, `frontend/src/api/auth.ts`, `frontend/src/auth-workspace-client.ts` | interaction | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because splitting this one-template screen would add indirection without reducing duplication | `frontend/tests/signupform.e2e.ts` was RED against the reset route tree, then GREEN after the Scala HTML skeleton was ported. It compares the whole stable `.page.full` container, including `.tag-line-wrap.signup`, `.signup-form-wrap.frm-wrap`, `form[name=signup]`, `#loginId`, `#uname`, `#email`, `#password`, `#retypedPassword`, submit button classes, and login link. Allowed normalization: mounted `/yona` base path on the internal TanStack Router `Link` href. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- signupform.e2e.ts`. |
| `user/signup.scala.html` | Signup confirmation/admin-contact interpolation and post-submit flash states. | `frontend/src/routes/-auth-views.tsx`, `frontend/src/routes/index.tsx`, auth capabilities API | data-boundary | covered in current follow-up | P1 | none | `auth-public-entry-parity.e2e.ts` asserts obfuscated default admin contact, signup requested/verification-sent redirect to index notification, and raw-key absence. |
| `welcome/restart.scala.html` | `/restart` standalone restart notice after first-run setup. | `frontend/src/routes/restart.tsx` | layout | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because the legacy screen is one standalone notice template | `frontend/tests/restart.e2e.ts` was RED against the reset route tree, then GREEN after `welcome/restart.scala.html` was ported. It compares the stable `.page-wrap-outer` and `.page-footer-outer` roots, including `.container.page-wrap`, `.secret-wrap`, `.logo`, `h3`, `p.secret-box.txt-center`, and footer provider. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- restart.e2e.ts`. |
| `welcome/secret.scala.html` | `/secret` no-admin first-run setup. | `frontend/src/routes/secret.tsx`, auth secret REST route | interaction | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because the legacy screen is one standalone template plus one submit boundary | `frontend/tests/secret-setup.e2e.ts` was RED against the reset route tree, then GREEN after `welcome/secret.scala.html` was ported. It compares the stable `.page-wrap-outer` and `.page-footer-outer` roots, including `.container.page-wrap`, `.secret-wrap`, `.logo`, warning alert, `.signup-form-wrap.frm-wrap`, `form.input-append[action="/"]`, read-only `loginId=admin`, name/email/password/retyped-password controls, submit button, and footer provider; it also proves `/api/auth/session` CSRF bootstrap, `/api/v1/auth/secret` JSON payload, and base-path-preserving `/restart` redirect. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- secret-setup.e2e.ts`. |
| `site/lostPassword.scala.html` | `/lostPassword` request form, success and invalid-request states. | `frontend/src/routes/lostPassword.tsx`, `frontend/src/api/auth.ts`, `frontend/src/auth-workspace-client.ts` | interaction | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because splitting this one-template screen would add indirection without reducing duplication | `frontend/tests/lost-password.e2e.ts` was RED against the reset route tree, then GREEN after the Scala HTML skeleton was ported. It compares the whole stable `.page.full` container, including `.tag-line-wrap.reset-password`, `.login-form-wrap.frm-wrap`, `form[action="/lostPassword"]`, `#loginId`, `#emailAddress`, and submit button classes. Allowed normalization: React/browser boolean attribute handling for the first `required` input is restored in the rendered DOM to match legacy `required="required"`. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- lost-password.e2e.ts`. |
| `user/resetPassword.scala.html`, `error/badrequest_default.scala.html` | `/resetPassword?s=...` valid reset form, login flash, invalid reset bad-request shell. | `frontend/src/routes/resetPassword.tsx`, `frontend/src/api/auth.ts`, `frontend/src/auth-workspace-client.ts` | interaction | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because splitting this one-template screen would add indirection without reducing duplication | `frontend/tests/reset-password.e2e.ts` was RED against the reset route tree, then GREEN after the Scala HTML skeleton was ported. It compares the whole stable `.page.full` reset form container, including `.tag-line-wrap.reset-password`, `.login-form-wrap.frm-wrap`, `form[name=passwordReset]`, hidden `hashString`, `#password`, `#retypedPassword`, and submit button classes; it also compares the invalid reset URL state against the full `siteLayout` roots `.unsupported`, `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer` from `error/badrequest_default.scala.html`, including `.project-page-wrap`, `.error-wrap`, `.ico-404`, resolved wrong-URL copy, and Home link. Allowed normalization: React submit/CSRF transport uses `/api/v1/auth/password-reset/complete`; invalid submit redirects to the legacy bad-request shell shape. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- reset-password.e2e.ts`. |
| Verification route/controller output | `/verify/:loginId/:verificationCode` success and invalid verification. | `frontend/src/routes/verify/$loginId/$verificationCode.tsx`, auth verify REST route | route | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because the legacy success screen is one tiny template and the invalid branch is a plain body | `frontend/tests/verify-user.e2e.ts` was RED against the reset route tree, then GREEN after `user/verified.scala.html` was ported. It compares the whole stable `.page.full` container, including `.center-wrap.tag-line-wrap.reset-password`, `h1.title`, verified login id, `<hr>`, and `p.tag-line`; the test mocks only `/api/v1/auth/verify` so the rendered shell remains the unit under proof. Invalid verification still renders the legacy plain `Invalid verification` body after REST rejection. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- verify-user.e2e.ts`. |
| Verification invalid HTTP deep-link status | Legacy invalid verification returns direct 404 plain body. | React SPA fallback plus REST verify status | route | not-applicable | P1 | none unless parent reclassifies direct-route ownership | Exact deep-link document HTTP status belongs to server direct-route/fallback ownership, not the React auth view packet. The user-visible React result and REST status are covered. |
| Auth aliases | `/login`, `/register`, `/forgot-password`, `/reset-password` convenience paths. | alias route files and `RedirectPage` | route | covered in current follow-up | P1 | none | E2E proves aliases redirect to canonical legacy paths while preserving base path and reset query; canonical screens retain legacy shell and REST JSON submit boundary. |
| `help/toc.scala.html`, `siteLayout.scala.html` | `/_help` anonymous help/FAQ route. | `frontend/src/routes/[_]help.tsx`, `frontend/src/routes/-home-route-screen.tsx` | interaction | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because the legacy screen is one template plus one click toggle, and the shared site shell is reused without changing rendered DOM | `frontend/tests/help-toc.e2e.ts` was RED against the reset route tree, then GREEN after the Scala HTML skeleton was ported and extended to the whole site layout shell. It compares the stable `.unsupported`, `.gnb-outer`, `.site-breadcrumb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots, including global logo/search shell, `.site-breadcrumb-inner h3`, `.page-wrap`, all six `.qas > .qa` rows, `.question-wrap`, `.answer-wrap`, legacy anchors, runtime `app.name` substitution, exact `style="width:100%"`, and footer links; it also clicks the first row open/closed to prove `.qa.open`. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- help-toc.e2e.ts public-landing-parity.e2e.ts`. |
| `help/UIKit.scala.html` | `/_UIKit` standalone UI kit route. | `frontend/src/routes/[_]UIKit.tsx` | layout | covered in current follow-up | P1 | none; static standalone sample has no REST data or form mutation boundary, and preserving the body-root DOM directly is the smallest faithful conversion | `frontend/tests/ui-kit.e2e.ts` reads the legacy Scala HTML file, extracts the `<body>`, and compares the rendered `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots for the standalone UI kit page, including the subtitle, button/upload/dropdown/search/label/avatar/tab/switch samples, data attributes, inline sample styles, and NAVER footer. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- ui-kit.e2e.ts`. |
| `restricted.scala.html`, `siteLayout.scala.html`, `common/navbar.scala.html` | `/restricted` authenticated sample route. | `frontend/src/routes/restricted.tsx`, `frontend/src/api/session.ts` | interaction | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because the legacy screen is one tiny authenticated template plus the global site wrapper | `frontend/tests/restricted.e2e.ts` was RED against the reset route tree, then GREEN after `restricted.scala.html` was ported. It compares the stable `.unsupported`, `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots, including the global logo/search shell, heading, fixed `560x315` Gangnam Style iframe, local user name/email, verification marker, provider/user ID copy, and `expires == -1` text. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- restricted.e2e.ts`. |

## Verifier Evidence

Static/component proof:

- `frontend/src/auth-workspace-shell.spec.tsx`
- `frontend/src/wave1-auth-workspace-parity.spec.tsx`
- `frontend/src/help-route-parity.spec.tsx`

Browser proof:

- `frontend/tests/auth-public-entry-parity.e2e.ts`
- `frontend/tests/authenticated-home-empty-notifications.e2e.ts`
- `frontend/tests/loginform.e2e.ts`
- `frontend/tests/help-toc.e2e.ts`
- `frontend/tests/lost-password.e2e.ts`
- `frontend/tests/public-landing-parity.e2e.ts`
- `frontend/tests/restart.e2e.ts`
- `frontend/tests/reset-password.e2e.ts`
- `frontend/tests/root-shell-parity.e2e.ts`
- `frontend/tests/restricted.e2e.ts`
- `frontend/tests/secret-setup.e2e.ts`
- `frontend/tests/signupform.e2e.ts`
- `frontend/tests/verify-user.e2e.ts`

Prior focused browser verification recorded in `ui-parity-auth-public-entry.md`:

- `pnpm --dir frontend test:e2e -- auth-public-entry-parity.e2e.ts root-shell-parity.e2e.ts pull-request-review-read-parity.e2e.ts issue-detail-parity.e2e.ts project-code-comment-upload-parity.e2e.ts site-admin-data-parity.e2e.ts`
- Result recorded there: `30` Playwright tests passed on `2026-06-26`.

P1 has no integrated desktop sweep status deltas in
`output/playwright/visual-sweep/latest.json` checked at
`2026-06-26T16:21:36.680Z`, but whole UI parity remains blocked by other packet
reports with `needs-parent-decision` rows.
