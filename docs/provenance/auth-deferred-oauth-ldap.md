# Auth Deferred OAuth/LDAP Confirmation

## Status

- `deferred-2nd-priority`: OAuth social login and LDAP login are not current-phase implementation scope.
- This note is confirmation-only provenance. It does not authorize provider login, OAuth callback/session linking, LDAP bind/search, LDAP user provisioning, or BasicAuth LDAP behavior in the current phase.

## Current App-Owned Scope

- Social-login-only configuration remains app-owned as documented in `SPEC.md` Section 1.5: parse `YONA_AUTH_SOCIAL_LOGIN_ONLY`, expose the auth UI capability/gating state, and do not silently ignore unsupported provider state.
- Unsupported/denied OAuth route behavior remains app-owned without implementing provider auth: `/authenticate/:provider` redirects unsupported providers to `/users/loginform?error=unsupported&provider=...`; `/authenticate/:provider/denied` redirects with an OAuth-denied state; the login shell renders explicit message-key warning state.
- LDAP has no app-runtime flow in the current phase. LDAP settings and legacy behavior remain evidence for future deferred work only.

## Legacy Evidence

- OAuth route surface: `yona-original/conf/routes` maps `/logout`, `/authenticate/:provider`, and `/authenticate/:provider/denied` to `Application.oAuthLogout`, `Application.oAuth`, and `Application.oAuthDenied`.
- OAuth bootstrap/provider config: `yona-original/app/Global.java` creates `social-login.conf` and wires PlayAuthenticate resolver auth/denied behavior; `yona-original/conf/play.plugins` registers Google and GitHub providers; `yona-original/conf/social-login.conf.default` contains provider settings.
- OAuth login UI: `yona-original/app/views/user/login.scala.html` and `yona-original/app/views/common/loginDialog.scala.html` read `application.social.login.support`, preserve the social-login-only warning, and render allowed provider buttons.
- OAuth local-user linking: `yona-original/app/controllers/UserApp.java` handles `PlayAuthenticate.isLoggedIn(session())` in `loginForm()` and `linkWithExistedOrCreateLocalUser()`.
- LDAP config and flow: `yona-original/conf/application.conf.default` documents `application.use.ldap.login.supoort` and `ldap.*`; `yona-original/app/controllers/UserApp.java` switches password login to `authenticateWithLdap` when `LdapService.useLdap`; `yona-original/app/utils/LdapService.java` performs LDAP bind/search and user projection; `yona-original/app/utils/BasicAuthAction.java` also routes BasicAuth through LDAP when enabled.

## Current SPEC Decision

- `SPEC.md` Section 3.3 lists both `LDAP 연동` and `Social Login (OAuth)` as second-priority/deferred due to infrastructure or external-provider complexity.
- `SPEC.md` FG-01 keeps `GET /authenticate/:provider` and `/authenticate/:provider/denied` in the legacy route inventory, but marks `Social Login (OAuth)` and `LDAP 연동` as `deferred` / `2차`.
- `SPEC.md` Section 1.5 explicitly separates compatibility configuration from feature execution for social login: current work may parse config and expose UI/unsupported-provider state, while OAuth provider login remains deferred.

## Future Worker Split

- OAuth provider worker: implement provider configuration loading, GitHub/Google authorization start, callback handling, denied/error mapping, credential persistence, local-user linking/creation, logout interaction, and legacy UI/provider button parity.
- OAuth test/evidence worker: add route, session, callback, denied, unsupported-provider, and login-shell parity coverage against the legacy paths above.
- LDAP runtime worker: implement `application.use.ldap.login.supoort` and `ldap.*` compatibility, bind/search, email-based login option, fallback-to-local option, user creation/update, guest flag propagation, and BasicAuth LDAP behavior.
- LDAP test/evidence worker: add isolated LDAP service tests plus form-login and BasicAuth contract coverage using controlled LDAP fixtures/mocks.

Do not implement OAuth provider login or LDAP runtime flow in the current phase.
