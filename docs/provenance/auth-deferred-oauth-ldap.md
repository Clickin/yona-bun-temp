# Auth Deferred OAuth/LDAP Confirmation

## Status

- `deferred-2nd-priority`: OAuth social login remains outside current implementation scope. LDAP has entered Phase 2 auth deferred-runtime work through the P2-C bounded slice below.
- 2026-06-21 P2-C update: LDAP form-login runtime now has a bounded first slice in app runtime. It parses legacy `application.use.ldap.login.supoort`, `ldap.*`, and `YONA_LDAP_*` equivalents, then authenticates through an internal fixture-backed LDAP boundary for deterministic tests. The slice covers LDAP-enabled password login, `ldap.options.useEmailBaseLogin`, `ldap.options.fallbackToLocalLogin`, local user provisioning/update by LDAP email, local password refresh, and new-user guest-prefix propagation.
- 2026-06-21 P2-D update: Smart HTTP and SVN BasicAuth now route LDAP-enabled password credentials through the same fixture-backed LDAP boundary used by form login. Existing API-token BasicAuth and session auth remain intact, configured local fallback still accepts local passwords, wrong LDAP/local credentials still return the legacy Basic challenge, and legacy email-base login semantics are preserved by resolving a local BasicAuth login ID to its email before LDAP fixture authentication.
- Remaining LDAP gap: real network bind/search is still not implemented.

## Current App-Owned Scope

- Social-login-only configuration remains app-owned as documented in `SPEC.md` Section 1.5: parse `YONA_AUTH_SOCIAL_LOGIN_ONLY`, expose the auth UI capability/gating state, and do not silently ignore unsupported provider state.
- Unsupported/denied OAuth route behavior remains app-owned without implementing provider auth: `/authenticate/:provider` redirects unsupported providers to `/users/loginform?error=unsupported&provider=...`; `/authenticate/:provider/denied` redirects with an OAuth-denied state; the login shell renders explicit message-key warning state.
- LDAP has fixture-backed app-runtime form-login and Smart HTTP/SVN BasicAuth flows for P2-C/P2-D. Real LDAP socket/JNDI-equivalent connector work remains deferred to a later LDAP connector slice.

## Legacy Evidence

- OAuth route surface: `yona-original/conf/routes` maps `/logout`, `/authenticate/:provider`, and `/authenticate/:provider/denied` to `Application.oAuthLogout`, `Application.oAuth`, and `Application.oAuthDenied`.
- OAuth bootstrap/provider config: `yona-original/app/Global.java` creates `social-login.conf` and wires PlayAuthenticate resolver auth/denied behavior; `yona-original/conf/play.plugins` registers Google and GitHub providers; `yona-original/conf/social-login.conf.default` contains provider settings.
- OAuth login UI: `yona-original/app/views/user/login.scala.html` and `yona-original/app/views/common/loginDialog.scala.html` read `application.social.login.support`, preserve the social-login-only warning, and render allowed provider buttons.
- OAuth local-user linking: `yona-original/app/controllers/UserApp.java` handles `PlayAuthenticate.isLoggedIn(session())` in `loginForm()` and `linkWithExistedOrCreateLocalUser()`.
- LDAP config and flow: `yona-original/conf/application.conf.default` documents `application.use.ldap.login.supoort` and `ldap.*`; `yona-original/app/controllers/UserApp.java` switches password login to `authenticateWithLdap` when `LdapService.useLdap`; `yona-original/app/utils/LdapService.java` performs LDAP bind/search and user projection; `yona-original/app/utils/BasicAuthAction.java` also routes BasicAuth through LDAP when enabled.

## Current SPEC Decision

- `SPEC.md` Section 3.3 lists both `LDAP 연동` and `Social Login (OAuth)` as second-priority/deferred due to infrastructure or external-provider complexity. P2-C/P2-D partially narrow the LDAP item by adding fixture-backed form-login and Smart HTTP/SVN BasicAuth runtime behavior while leaving real bind/search as explicit follow-up work.
- `SPEC.md` FG-01 keeps `GET /authenticate/:provider` and `/authenticate/:provider/denied` in the legacy route inventory, but marks `Social Login (OAuth)` and `LDAP 연동` as `deferred` / `2차`.
- `SPEC.md` Section 1.5 explicitly separates compatibility configuration from feature execution for social login: current work may parse config and expose UI/unsupported-provider state, while OAuth provider login remains deferred.

## Future Worker Split

- OAuth provider worker: implement provider configuration loading, GitHub/Google authorization start, callback handling, denied/error mapping, credential persistence, local-user linking/creation, logout interaction, and legacy UI/provider button parity.
- OAuth test/evidence worker: add route, session, callback, denied, unsupported-provider, and login-shell parity coverage against the legacy paths above.
- LDAP runtime worker: P2-C implemented `application.use.ldap.login.supoort` and `ldap.*` compatibility, deterministic fixture authentication, email-based login option, fallback-to-local option, local user creation/update, password refresh, and new-user guest flag propagation. P2-D reused that boundary for Smart HTTP/SVN BasicAuth, while preserving local-token/session auth and configured local fallback. Remaining work is replacing/augmenting the fixture provider with a real LDAP bind/search connector and adding existing-user English-name/guest refresh if the persistence boundary is expanded.
- LDAP BasicAuth worker: complete for fixture-backed Smart HTTP/SVN BasicAuth. Coverage lives in `crates/server/tests/smart_http_contract.rs` and `crates/server/tests/svn_protocol_contract.rs`.
- LDAP test/evidence worker: P2-C added config and form-login coverage with controlled LDAP fixtures/mocks. P2-D added BasicAuth LDAP contract coverage for Smart HTTP and SVN.

Do not implement OAuth provider login in this note's current OAuth scope. Do not claim full LDAP parity until real bind/search is covered.
