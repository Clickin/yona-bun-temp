# Auth Deferred OAuth/LDAP Confirmation

## Status

- `partial-2nd-priority`: OAuth social login now has a bounded P2-A/P2-B app-runtime slice for configured GitHub/Google authorization start, deterministic callback identity handling, local-user link/create, session creation, denied/unsupported redirects, and connected-provider profile projection. Real provider token/userinfo HTTP exchange remains deferred.
- 2026-06-21 P2-C update: LDAP form-login runtime now has a bounded first slice in app runtime. It parses legacy `application.use.ldap.login.supoort`, `ldap.*`, and `YONA_LDAP_*` equivalents, then authenticates through an internal fixture-backed LDAP boundary for deterministic tests. The slice covers LDAP-enabled password login, `ldap.options.useEmailBaseLogin`, `ldap.options.fallbackToLocalLogin`, local user provisioning/update by LDAP email, local password refresh, and new-user guest-prefix propagation.
- 2026-06-21 P2-D update: Smart HTTP and SVN BasicAuth now route LDAP-enabled password credentials through the same fixture-backed LDAP boundary used by form login. Existing API-token BasicAuth and session auth remain intact, configured local fallback still accepts local passwords, wrong LDAP/local credentials still return the legacy Basic challenge, and legacy email-base login semantics are preserved by resolving a local BasicAuth login ID to its email before LDAP fixture authentication.
- 2026-06-21 LDAP connector update: when no deterministic fixture users are configured, LDAP login now uses a real simple bind/search connector with the legacy guessed bind principal, subtree search under `baseDN`, login-vs-email filter selection, single-result enforcement, and display/email/login/department/English-name projection. Tests cover the connector boundary through a deterministic mock; app route tests keep fixture-backed form-login and Smart HTTP/SVN BasicAuth behavior green without a real network dependency.
- Remaining LDAP gap: existing LDAP user's English-name/guest refresh remains follow-up if the persistence boundary is expanded.

## Current App-Owned Scope

- Social-login-only configuration remains app-owned as documented in `SPEC.md` Section 1.5: parse `YONA_AUTH_SOCIAL_LOGIN_ONLY`, expose the auth UI capability/gating state, and do not silently ignore unsupported provider state.
- OAuth route behavior is app-owned for the bounded runtime slice: `/authenticate/:provider` still redirects unconfigured/unsupported providers to `/users/loginform?error=unsupported&provider=...`; configured GitHub/Google providers redirect to their configured authorization URL; deterministic callback query identity links or creates a local user, persists `user_credential` / `linked_account`, creates a session, and redirects to the default landing path; `/authenticate/:provider/denied` redirects with an OAuth-denied state. Real provider token exchange and userinfo fetch remain deferred.
- LDAP has fixture-backed app-runtime form-login and Smart HTTP/SVN BasicAuth flows for P2-C/P2-D, plus a real simple bind/search connector for non-fixture runtime LDAP. Existing-user English-name/guest refresh remains follow-up.

## Legacy Evidence

- OAuth route surface: `yona-original/conf/routes` maps `/logout`, `/authenticate/:provider`, and `/authenticate/:provider/denied` to `Application.oAuthLogout`, `Application.oAuth`, and `Application.oAuthDenied`.
- OAuth bootstrap/provider config: `yona-original/app/Global.java` creates `social-login.conf` and wires PlayAuthenticate resolver auth/denied behavior; `yona-original/conf/play.plugins` registers Google and GitHub providers; `yona-original/conf/social-login.conf.default` contains provider settings.
- OAuth login UI: `yona-original/app/views/user/login.scala.html` and `yona-original/app/views/common/loginDialog.scala.html` read `application.social.login.support`, preserve the social-login-only warning, and render allowed provider buttons.
- OAuth local-user linking: `yona-original/app/controllers/UserApp.java` handles `PlayAuthenticate.isLoggedIn(session())` in `loginForm()` and `linkWithExistedOrCreateLocalUser()`.
- LDAP config and flow: `yona-original/conf/application.conf.default` documents `application.use.ldap.login.supoort` and `ldap.*`; `yona-original/app/controllers/UserApp.java` switches password login to `authenticateWithLdap` when `LdapService.useLdap`; `yona-original/app/utils/LdapService.java` performs LDAP bind/search and user projection; `yona-original/app/utils/BasicAuthAction.java` also routes BasicAuth through LDAP when enabled.

## Current SPEC Decision

- `SPEC.md` Section 3.3 now records the bounded OAuth app-runtime slice as partial and keeps real provider token/userinfo HTTP exchange deferred. P2-C/P2-D narrow the LDAP item by adding fixture-backed form-login, Smart HTTP/SVN BasicAuth runtime behavior, and the real bind/search connector while leaving existing-user English-name/guest refresh as explicit follow-up work.
- `SPEC.md` FG-01 keeps `GET /authenticate/:provider` and `/authenticate/:provider/denied` in the legacy route inventory, and marks `Social Login (OAuth)` as partial for configured start, deterministic callback, link/create, session, denied/unsupported, and profile-provider projection.
- `SPEC.md` Section 1.5 still separates compatibility configuration from real external-provider exchange: deterministic tests do not require GitHub/Google network access.

## Future Worker Split

- OAuth provider worker: bounded configured-provider start, deterministic callback handling, denied/error mapping, credential persistence, local-user linking/creation, session creation, and profile provider projection are implemented. Remaining follow-up is real provider token/userinfo HTTP exchange and any provider-specific logout interaction that requires external provider behavior.
- OAuth test/evidence worker: route, session, callback, denied, unsupported-provider, runtime-config, and profile-provider projection coverage lives in `crates/server/tests/auth_workspace_contract.rs` and `crates/server/tests/runtime_config_contract.rs`; existing frontend login/dialog/profile shell tests remain the UI evidence.
- LDAP runtime worker: P2-C implemented `application.use.ldap.login.supoort` and `ldap.*` compatibility, deterministic fixture authentication, email-based login option, fallback-to-local option, local user creation/update, password refresh, and new-user guest flag propagation. P2-D reused that boundary for Smart HTTP/SVN BasicAuth, while preserving local-token/session auth and configured local fallback. The connector follow-up added real simple bind/search support when fixture users are absent. Remaining work is existing-user English-name/guest refresh if the persistence boundary is expanded.
- LDAP BasicAuth worker: complete for fixture-backed Smart HTTP/SVN BasicAuth. Coverage lives in `crates/server/tests/smart_http_contract.rs` and `crates/server/tests/svn_protocol_contract.rs`.
- LDAP test/evidence worker: P2-C added config and form-login coverage with controlled LDAP fixtures/mocks. P2-D added BasicAuth LDAP contract coverage for Smart HTTP and SVN.

Do not claim full OAuth parity until real provider token/userinfo HTTP exchange is implemented or explicitly retired. Do not claim full LDAP parity until existing-user English-name/guest refresh is either implemented or explicitly retired.
