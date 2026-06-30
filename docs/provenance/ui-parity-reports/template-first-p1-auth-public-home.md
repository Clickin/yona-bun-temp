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
| `yona-original/app/views/index/partial_intro.scala.html` | Anonymous public landing hero/features/signup CTA. | `.siteintro-bg`, `.siteintro`, `.site-heading`, `.site-features`, `.signup-btn`, `.feature`, `.feature-wrap`, `.feature-image`, `.feature-info`. |
| `yona-original/app/views/index/index.scala.html`, `index/notifications.scala.html` | Authenticated default landing delegates to notifications/workspace home. | notification/workspace shell; owned jointly with P6 for authenticated workspace surfaces. |
| `yona-original/app/views/user/login.scala.html` | Login form, redirect, social-login-only warning, OAuth buttons, remember me, forgot password link. | `.page.full`, `.tag-line-wrap.login`, `.login-form-wrap.frm-wrap`, `input[name=redirectUrl]`, `#loginIdOrEmailD`, `#password`, `.oauth-login-btn`, `#remember-me`, `.links-wrap a[href*=lostPassword]`. |
| `yona-original/app/views/user/signup.scala.html` | Signup form, signup-confirm admin contact, social-login-only warning, login link. | `.tag-line-wrap.signup`, `.signup-form-wrap.frm-wrap`, `form[name=signup]`, `#loginId`, `#uname`, `#email`, `#password`, `#retypedPassword`, `.go-login`, obfuscated admin contact text. |
| `yona-original/app/views/site/lostPassword.scala.html` | Lost password request form and success/error alerts. | `.tag-line-wrap.reset-password`, `.login-form-wrap.frm-wrap`, `.alert.alert-success`, `.alert.alert-error`, `#loginId`, `#emailAddress`. |
| `yona-original/app/views/user/resetPassword.scala.html` | Reset password form. | `form[name=passwordReset]`, `input[name=hashString]`, `#password`, `#retypedPassword`, `.btns-row`. |
| `yona-original/app/views/error/badrequest_default.scala.html` | Invalid reset URL error shell. | `.page-wrap-outer`, `.project-page-wrap`, `.error-wrap`, `.ico-404`, Home link. |
| `yona-original/app/views/help/toc.scala.html` | Anonymous help/FAQ page. | `.site-breadcrumb-outer`, `.site-breadcrumb-inner h3`, `.page-wrap`, `.qas > .qa`, `.question-wrap`, `.answer-wrap`, row open/closed toggle. |

## Current React/API Targets

| Current source | Current responsibility |
| --- | --- |
| `frontend/src/routes/users/loginform.tsx` | Active template-first reset implementation for the anonymous `/users/loginform` screen, copied from `user/login.scala.html` and bound to auth capabilities/session REST helpers through TanStack Query. |
| `frontend/src/routes/users/signupform.tsx` | Active template-first reset implementation for the anonymous `/users/signupform` screen, copied from `user/signup.scala.html` and bound to auth capabilities/session/register REST helpers through TanStack Query. |
| `frontend/src/routes/-auth-views.tsx` | Login, signup, lost/reset password, verify, first-run setup, OAuth/social-login-only public auth surfaces. |
| `frontend/src/routes/-home-view.tsx`, `frontend/src/routes/index.tsx` | Anonymous home intro and authenticated/default landing notification states. |
| `frontend/src/routes/users/loginform.tsx`, `users/signupform.tsx`, `lostPassword/route.tsx`, `resetPassword/route.tsx`, `(legacy-auth)/reset-password/route.tsx`, `login/route.tsx`, `forgot-password/route.tsx` | Canonical public auth route entrypoints and aliases; login and signup are now active 2026-06-30 template-first reset routes. |
| `frontend/src/routes/verify/$loginId/$verificationCode/route.tsx` | Verification success/invalid UI. |
| `frontend/src/routes/[_]help/route.tsx`, `frontend/src/routes/-help-views.tsx` | Anonymous help/FAQ route and view. |
| `frontend/src/api/auth.ts`, `frontend/src/auth-workspace-client.ts` | REST JSON auth/session/capability/password/verify boundaries. |
| `frontend/tests/loginform.e2e.ts` | Whole `.page.full` rendered DOM parity proof for anonymous `/users/loginform?redirectUrl=/me`; normalizes only mounted base path for the lost-password `Link` href. |
| `frontend/tests/signupform.e2e.ts` | Whole `.page.full` rendered DOM parity proof for anonymous `/users/signupform`; normalizes only mounted base path for the login `Link` href. |
| `frontend/src/auth-workspace-shell.spec.tsx`, `wave1-auth-workspace-parity.spec.tsx`, `help-route-parity.spec.tsx` | Static selector/source proof. |
| `frontend/tests/auth-public-entry-parity.e2e.ts`, `root-shell-parity.e2e.ts` | Browser-visible public auth/help/root-shell proof. |

## Open Reset Queue Summary

| status | count |
| --- | ---: |
| gap | 0 |
| deviation | 0 |
| weak evidence | 0 |
| covered | 11 |
| not-applicable | 1 |
| needs-parent-decision | 0 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `index/partial_intro.scala.html` | Anonymous `/` public intro with signup CTA and feature grid. | `frontend/src/routes/-home-view.tsx`, `frontend/src/routes/index.tsx` | layout | covered in current follow-up | P1 | none | Auth/workspace render specs and public entry e2e cover the anonymous home shell, signup CTA routing, flash notification target, and absence of visible raw message keys. |
| `user/login.scala.html` | `/users/loginform` login form with `redirectUrl`, username/password, remember me, forgot-password link. | `frontend/src/routes/users/loginform.tsx`, `frontend/src/api/auth.ts`, `frontend/src/auth-workspace-client.ts` | interaction | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because splitting this one-template screen would add indirection without reducing duplication | `frontend/tests/loginform.e2e.ts` was RED against the reset route tree, then GREEN after the Scala HTML skeleton was ported. It compares the whole stable `.page.full` container, including `.tag-line-wrap.login`, `.login-form-wrap.frm-wrap`, hidden `redirectUrl`, `#loginIdOrEmailD`, `#password`, submit button classes, `#remember-me`, and lost-password link. Allowed normalization: mounted `/yona` base path on the internal TanStack Router `Link` href. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- loginform.e2e.ts`. |
| `user/login.scala.html` | Social-login-only and OAuth provider controls. | `frontend/src/routes/-auth-views.tsx`, auth capabilities API | interaction | covered in current follow-up | P1 | none | Public entry e2e covers social-login-only mode, GitHub/Google provider buttons, OAuth unsupported/denied alerts, and absence of password fields in social-only state. This ports the user-visible UX without importing legacy Play Authenticate helpers. |
| `user/signup.scala.html` | `/users/signupform` default signup form. | `frontend/src/routes/users/signupform.tsx`, `frontend/src/api/auth.ts`, `frontend/src/auth-workspace-client.ts` | interaction | covered in 2026-06-30 template-first reset slice | P1 | none; single component kept because splitting this one-template screen would add indirection without reducing duplication | `frontend/tests/signupform.e2e.ts` was RED against the reset route tree, then GREEN after the Scala HTML skeleton was ported. It compares the whole stable `.page.full` container, including `.tag-line-wrap.signup`, `.signup-form-wrap.frm-wrap`, `form[name=signup]`, `#loginId`, `#uname`, `#email`, `#password`, `#retypedPassword`, submit button classes, and login link. Allowed normalization: mounted `/yona` base path on the internal TanStack Router `Link` href. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- signupform.e2e.ts`. |
| `user/signup.scala.html` | Signup confirmation/admin-contact interpolation and post-submit flash states. | `frontend/src/routes/-auth-views.tsx`, `frontend/src/routes/index.tsx`, auth capabilities API | data-boundary | covered in current follow-up | P1 | none | `auth-public-entry-parity.e2e.ts` asserts obfuscated default admin contact, signup requested/verification-sent redirect to index notification, and raw-key absence. |
| First-run setup legacy controller/template state | `/secret` no-admin first-run setup. | `frontend/src/routes/-auth-views.tsx`, auth secret REST route | interaction | covered in current follow-up | P1 | none | `auth-public-entry-parity.e2e.ts` proves `.secret-page`, `.secret-wrap .logo`, `.alert.alert-block.secret-box`, admin form fields, read-only `#loginId`, no legacy POST action, REST JSON submit body, and restart redirect. |
| `site/lostPassword.scala.html` | `/lostPassword` request form, success and invalid-request states. | `frontend/src/routes/-auth-views.tsx`, `lostPassword/route.tsx` | interaction | covered in current follow-up | P1 | none | Static and browser proof cover `#loginId`, `#emailAddress`, success `.alert.alert-success`, invalid `.alert.alert-error`, `site.mail.fail`, `site.resetPasswordEmail.invalidRequest`, and REST request boundary. |
| `user/resetPassword.scala.html`, `error/badrequest_default.scala.html` | `/resetPassword` valid reset, login flash, invalid reset bad-request shell. | `frontend/src/routes/-auth-views.tsx`, `resetPassword/route.tsx`, `(legacy-auth)/reset-password/route.tsx` | route | covered in current follow-up | P1 | none | Static specs and e2e cover `form[name=passwordReset]`, `hashString`, password fields, valid reset redirect to login flash, invalid reset `.error-wrap`/`.ico-404` shell, and mounted-base alias query preservation. |
| Verification route/controller output | `/verify/:loginId/:verificationCode` success and invalid verification. | `frontend/src/routes/verify/$loginId/$verificationCode/route.tsx`, auth verify REST route | route | covered in current follow-up | P1 | none | Browser proof covers success and invalid visible copy after REST resolution; invalid state renders plain `Invalid verification` without SPA error shell. |
| Verification invalid HTTP deep-link status | Legacy invalid verification returns direct 404 plain body. | React SPA fallback plus REST verify status | route | not-applicable | P1 | none unless parent reclassifies direct-route ownership | Exact deep-link document HTTP status belongs to server direct-route/fallback ownership, not the React auth view packet. The user-visible React result and REST status are covered. |
| Auth aliases | `/login`, `/register`, `/forgot-password`, `/reset-password` convenience paths. | alias route files and `RedirectPage` | route | covered in current follow-up | P1 | none | E2E proves aliases redirect to canonical legacy paths while preserving base path and reset query; canonical screens retain legacy shell and REST JSON submit boundary. |
| `help/toc.scala.html` | `/_help` anonymous help/FAQ route. | `frontend/src/routes/[_]help/route.tsx`, `frontend/src/routes/-help-views.tsx` | interaction | covered in current follow-up | P1 | none | `frontend/src/help-route-parity.spec.tsx` and public entry e2e prove breadcrumb, `.qas > .qa`, `.question-wrap`, `.answer-wrap`, runtime `app.name` substitution, FAQ row open/closed toggle, anonymous access, and no visible raw `title.help`/`app.name`. |

## Verifier Evidence

Static/component proof:

- `frontend/src/auth-workspace-shell.spec.tsx`
- `frontend/src/wave1-auth-workspace-parity.spec.tsx`
- `frontend/src/help-route-parity.spec.tsx`

Browser proof:

- `frontend/tests/auth-public-entry-parity.e2e.ts`
- `frontend/tests/loginform.e2e.ts`
- `frontend/tests/root-shell-parity.e2e.ts`
- `frontend/tests/signupform.e2e.ts`

Prior focused browser verification recorded in `ui-parity-auth-public-entry.md`:

- `pnpm --dir frontend test:e2e -- auth-public-entry-parity.e2e.ts root-shell-parity.e2e.ts pull-request-review-read-parity.e2e.ts issue-detail-parity.e2e.ts project-code-comment-upload-parity.e2e.ts site-admin-data-parity.e2e.ts`
- Result recorded there: `30` Playwright tests passed on `2026-06-26`.

P1 has no integrated desktop sweep status deltas in
`output/playwright/visual-sweep/latest.json` checked at
`2026-06-26T16:21:36.680Z`, but whole UI parity remains blocked by other packet
reports with `needs-parent-decision` rows.
