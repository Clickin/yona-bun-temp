// Auth domain: login scenario + anonymous/public-page + simple-API read
// scenarios and their action definitions.
//
// Domain module contract (see scenarios/index.mjs): each module exports
// `scenarios` and `actionDefinitions`. ctx = { step, resolved, state, entry,
// legacySession, yoramSession, legacyPage, yoramPage, options, yoramBaseUrl,
// suffix, helpers } where helpers carries run.mjs's shared request/render
// utilities.
import { translateLegacy, translateYoram, LegacySession, YoramSession } from "../adapters.mjs";
import { violation } from "../report.mjs";

export const scenarios = [
  {
    id: "S1-login",
    title: "admin login",
    actions: [{ actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } }],
    behaviorMatcher: { action: /^UserApp\.login$/ },
  },
  {
    id: "S2-login-forms",
    title: "anonymous login entry pages (/users/login, /users/loginform)",
    actions: [
      { actor: "anonymous", action: "view-login-page", params: {} },
      { actor: "anonymous", action: "view-login-form", params: {} },
    ],
    behaviorMatcher: { action: /^(Application\.index|UserApp\.loginForm)$/, route: /^GET \/users\/login(form)?$/ },
  },
  {
    id: "S3-signup-form",
    title: "anonymous signup form page",
    actions: [{ actor: "anonymous", action: "view-signup-form", params: {} }],
    behaviorMatcher: { action: /^UserApp\.signupForm$/, route: /^GET \/users\/signupform$/ },
  },
  {
    id: "S4-lost-password",
    title: "anonymous lostPassword page",
    actions: [{ actor: "anonymous", action: "view-lost-password", params: {} }],
    behaviorMatcher: { action: /^PasswordResetApp\.lostPassword$/, route: /^GET \/lostPassword$/ },
  },
  {
    id: "S5-logout",
    title: "logout via /logout and /users/logout after login",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "logout-session", params: {} },
    ],
    // Runs after all I*/P*/PR* scenarios (id sort) and every later scenario
    // re-logins as its first step, so invalidating the shared sessions here is safe.
    behaviorMatcher: { action: /^(Application\.oAuthLogout|UserApp\.logout)$/, route: /^GET \/(users\/)?logout$/ },
  },
  {
    id: "S6-projectform",
    title: "new-project form page (/projectform)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-projectform", params: {} },
    ],
    behaviorMatcher: { action: /^ProjectApp\.newProjectForm$/, route: /^GET \/projectform$/ },
  },
  {
    id: "S7-projects-listing",
    title: "projects listing page (/projects)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-projects-list", params: {} },
    ],
    behaviorMatcher: { action: /^ProjectApp\.projects$/, route: /^GET \/projects$/ },
  },
  {
    id: "S8-transfer-page",
    title: "project transfer accept page GET (bogus id/key, read-only)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-project-transfer", params: { id: "99999999", key: "differential-sweep-nonexistent" } },
    ],
    // GET render only; never POSTs the transfer acceptance.
    behaviorMatcher: { action: /^ProjectApp\.acceptTransfer$/, route: /^GET \/project\/transfer\/:id\/:key$/ },
  },
  {
    id: "S9-help-init-uikit",
    title: "static app pages /_help, /_init, /_UIKit",
    actions: [
      { actor: "anonymous", action: "view-help-page", params: {} },
      { actor: "anonymous", action: "view-init-page", params: {} },
      { actor: "anonymous", action: "view-uikit-page", params: {} },
    ],
    behaviorMatcher: { action: /^(HelpApp\.help|Application\.(init|UIKit))$/, route: /^GET \/_(help|init|UIKit)$/ },
  },
  {
    id: "S10-simple-apis",
    title: "legacy-compat simple APIs (hello/users/favorites/titleHeads)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "get-compat-hello", params: {} },
      { actor: "admin", action: "get-compat-users", params: {} },
      { actor: "admin", action: "get-favorite-projects", params: {} },
      { actor: "admin", action: "get-favorite-organizations", params: {} },
      { actor: "admin", action: "get-title-heads", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: {
      action: /^(GlobalApi\.hello|UserApp\.users|UserApi\.getFoverite(Projects|Organizations)|ProjectApi\.titleHeads)$/,
    },
  },
  {
    id: "S11-oauth-authenticate",
    title: "OAuth provider authenticate routes (comparability-gated)",
    actions: [
      { actor: "anonymous", action: "oauth-authenticate", params: { provider: "github" } },
      { actor: "anonymous", action: "oauth-denied", params: { provider: "github" } },
    ],
    behaviorMatcher: { action: /^Application\.oAuth(Denied)?$/, route: /^GET \/authenticate\/:provider(\/denied)?$/ },
  },
  {
    id: "S12-compat-translation",
    title: "compat translation helper (unconfigured precondition parity)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "post-compat-translation", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueApi\.translate$/ },
  },
  {
    id: "S13-compat-default-login-page",
    title: "compat default login page mutation (boundary payload)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "post-compat-default-login-page", params: {} },
    ],
    behaviorMatcher: { action: /^UserApp\.setDefaultLoginPage$/, route: /defultLoginPage/ },
  },
  {
    id: "S14-compat-user-create-boundary",
    title: "site-admin user creation rejects invalid payload identically",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "post-compat-user-invalid", params: {} },
    ],
    behaviorMatcher: { action: /^UserApi\.newUser$/ },
  },
  {
    id: "S15-compat-token-boundary",
    title: "API token issuance rejects bad credentials identically",
    actions: [
      { actor: "anonymous", action: "post-compat-token-invalid", params: {} },
    ],
    behaviorMatcher: { action: /^UserApi\.newToken$/ },
  },
  {
    id: "S16-compat-admin-user-state-missing",
    title: "site-admin user state patch on missing user (boundary parity)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "patch-compat-admin-user-missing", params: {} },
    ],
    behaviorMatcher: { action: /^UserApi\.updateUserState$/ },
  },
  {
    id: "S17-lost-password-flow",
    title: "password reset request delivers token mail; reset form renders",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "anonymous", action: "request-lost-password", params: { loginId: "admin", emailAddress: "admin@example.com" } },
      { actor: "anonymous", action: "open-reset-link", params: {} },
    ],
    behaviorMatcher: { action: /^PasswordResetApp\.(requestResetPasswordEmail|resetPasswordForm)$/ },
  },
  {
    id: "S18-restricted-anonymous",
    title: "anonymous restricted page guard (/restricted)",
    actions: [{ actor: "anonymous", action: "view-restricted-page", params: {} }],
    behaviorMatcher: { action: /^Restricted\.index$/, route: /^GET \/restricted$/ },
  },
];

export const actionDefinitions = {
  login: {
    translateLegacy(step) {
      return { method: "POST", path: "/users/login", form: { loginId: step.params.loginId, password: step.params.password } };
    },
    translateYoram(step) {
      return {
        method: "POST",
        path: "/api/v1/auth/sign-in",
        json: { identifier: step.params.loginId, password: step.params.password, rememberMe: false },
      };
    },
    async handler(ctx) {
      const { step, entry, legacySession, yoramSession } = ctx;
      const legacyResult = await legacySession.login(step.params);
      if (legacyResult.status >= 400) {
        entry.violations.push(
          violation({ route: "/users/login", kind: "api", expected: "<3xx redirect>", actual: `status ${legacyResult.status}` }),
        );
      }
      const yoramResult = await yoramSession.login(step.params);
      if (yoramResult.status >= 400) {
        entry.violations.push(violation({ route: "/api/v1/auth/sign-in", kind: "api", expected: 200, actual: yoramResult.status }));
      }
    },
  },
  // --- anonymous/public pages (S2-S4, S9, S11) -----------------------------
  "view-login-page": {
    translateLegacy: () => ({ method: "GET", path: "/users/login" }),
    translateYoram: () => ({ method: "GET", path: "/users/login" }),
    handler: anonymousPageAction("/users/login"),
  },
  "view-login-form": {
    translateLegacy: () => ({ method: "GET", path: "/users/loginform" }),
    translateYoram: () => ({ method: "GET", path: "/users/loginform" }),
    handler: anonymousPageAction("/users/loginform"),
  },
  "view-signup-form": {
    translateLegacy: () => ({ method: "GET", path: "/users/signupform" }),
    translateYoram: () => ({ method: "GET", path: "/users/signupform" }),
    handler: anonymousPageAction("/users/signupform"),
  },
  "view-lost-password": {
    translateLegacy: () => ({ method: "GET", path: "/lostPassword" }),
    translateYoram: () => ({ method: "GET", path: "/lostPassword" }),
    handler: anonymousPageAction("/lostPassword"),
  },
  "view-help-page": {
    translateLegacy: () => ({ method: "GET", path: "/_help" }),
    translateYoram: () => ({ method: "GET", path: "/_help" }),
    handler: anonymousPageAction("/_help"),
  },
  "view-init-page": {
    translateLegacy: () => ({ method: "GET", path: "/_init" }),
    translateYoram: () => ({ method: "GET", path: "/_init" }),
    handler: anonymousPageAction("/_init"),
  },
  "view-uikit-page": {
    translateLegacy: () => ({ method: "GET", path: "/_UIKit" }),
    translateYoram: () => ({ method: "GET", path: "/_UIKit" }),
    handler: anonymousPageAction("/_UIKit"),
  },
  "view-restricted-page": {
    translateLegacy: () => ({ method: "GET", path: "/restricted" }),
    translateYoram: () => ({ method: "GET", path: "/restricted" }),
    async handler(ctx) {
      const { entry } = ctx;
      const path = "/restricted";
      const { legacyResult, yoramResult } = await requestAnonymousBoth(
        ctx,
        { method: "GET", path },
        { method: "GET", path },
      );
      pushStatusDivergence(ctx, path, legacyResult, yoramResult);

      const legacyRedirect = legacyResult.status >= 300 && legacyResult.status < 400;
      const yoramRedirect = yoramResult.status >= 300 && yoramResult.status < 400;
      const legacyLocation = normalizeLocation(legacyResult.location);
      const yoramLocation = normalizeLocation(yoramResult.location);

      if (legacyRedirect || yoramRedirect) {
        if (!legacyLocation || !yoramLocation) {
          entry.errors.push(
            `view-restricted-page: skipped redirect/render comparison; Yoram GET ${path} returned ${yoramResult.status} without a deterministic Location`,
          );
          return;
        }
        if (legacyLocation !== yoramLocation) {
          entry.violations.push(
            violation({
              route: path,
              behaviorId: entry.behaviorIds[0] ?? null,
              kind: "api",
              expected: { redirect: legacyLocation },
              actual: { redirect: yoramLocation },
            }),
          );
          return;
        }
        await renderDomTargetPath(ctx, legacyLocation);
        return;
      }

      await renderDomTargetPath(ctx, path);
    },
  },

  // --- authenticated pages (S6-S8) -----------------------------------------
  "view-projectform": {
    translateLegacy: () => ({ method: "GET", path: "/projectform" }),
    translateYoram: () => ({ method: "GET", path: "/projectform" }),
    handler: sessionPageAction("/projectform"),
  },
  "view-projects-list": {
    translateLegacy: () => ({ method: "GET", path: "/projects" }),
    translateYoram: () => ({ method: "GET", path: "/projects" }),
    handler: sessionPageAction("/projects"),
  },
  "view-project-transfer": {
    // GET render only; a bogus id/key must fail comparably on both sides.
    translateLegacy(step) {
      return { method: "GET", path: `/project/transfer/${step.params.id}/${step.params.key}` };
    },
    translateYoram(step) {
      return { method: "GET", path: `/project/transfer/${step.params.id}/${step.params.key}` };
    },
    async handler(ctx) {
      const { step } = ctx;
      const translation = { method: "GET", path: `/project/transfer/${step.params.id}/${step.params.key}` };
      const { legacyResult, yoramResult } = await ctx.helpers.requestBoth(ctx, translation, { ...translation });
      pushStatusDivergence(ctx, translation.path, legacyResult, yoramResult);
    },
  },

  // --- logout (S5) ----------------------------------------------------------
  "logout-session": {
    // Legacy honors both spellings; Yoram signs out via its auth API.
    translateLegacy: () => ({ method: "GET", path: "/logout" }),
    translateYoram: () => ({ method: "POST", path: "/api/v1/auth/sign-out" }),
    async handler(ctx) {
      const { entry, legacySession, yoramSession } = ctx;
      for (const path of ["/logout", "/users/logout"]) {
        const legacyResult = await legacySession.request({ method: "GET", path });
        if (legacyResult.status >= 400) entry.errors.push(`legacy logout failed: HTTP ${legacyResult.status} @ ${path}`);
      }
      const primed = await fetch(`${yoramSession.baseUrl}/api/auth/session`, { headers: { cookie: yoramSession.cookies } });
      yoramSession.csrfToken = primed.headers.get("x-csrf-token") ?? yoramSession.csrfToken;
      const sessionCookies = primed.headers.getSetCookie?.() ?? [];
      if (sessionCookies.length > 0) {
        yoramSession.cookies = sessionCookies.map((cookie) => cookie.split(";")[0]).join("; ");
      }
      const yoramResult = await yoramSession.request({ method: "POST", path: "/api/v1/auth/sign-out" });
      if (yoramResult.status >= 400) entry.errors.push(`yoram logout failed: HTTP ${yoramResult.status} @ /api/v1/auth/sign-out`);
    },
  },

  // --- simple compat APIs (S10) --------------------------------------------
  "get-compat-hello": {
    translateLegacy: () => ({ method: "GET", path: "/-_-api/v1/hello" }),
    translateYoram: () => ({ method: "GET", path: "/api/v1/hello" }),
    async handler(ctx) {
      await requestCompatApi(ctx, "/-_-api/v1/hello", "/api/v1/hello");
    },
  },
  "get-compat-users": {
    translateLegacy: () => ({ method: "GET", path: "/-_-api/v1/users" }),
    translateYoram: () => ({ method: "GET", path: "/api/v1/users/directory" }),
    async handler(ctx) {
      await requestCompatApi(ctx, "/-_-api/v1/users", "/api/v1/users/directory");
    },
  },
  "get-favorite-projects": {
    translateLegacy: () => ({ method: "GET", path: "/-_-api/v1/favoriteProjects" }),
    translateYoram: () => ({ method: "GET", path: "/api/v1/user/favorites/projects" }),
    async handler(ctx) {
      await requestCompatApi(ctx, "/-_-api/v1/favoriteProjects", "/api/v1/user/favorites/projects");
    },
  },
  "get-favorite-organizations": {
    translateLegacy: () => ({ method: "GET", path: "/-_-api/v1/favoriteOrganizations" }),
    translateYoram: () => ({ method: "GET", path: "/api/v1/user/favorites/organizations" }),
    async handler(ctx) {
      await requestCompatApi(ctx, "/-_-api/v1/favoriteOrganizations", "/api/v1/user/favorites/organizations");
    },
  },
  "get-title-heads": {
    translateLegacy(step) {
      return { method: "GET", path: `/-_-api/v1/owners/${step.params.owner}/projects/${step.params.project}/titleHeads` };
    },
    translateYoram(step) {
      return { method: "GET", path: `/api/v1/owners/${step.params.owner}/projects/${step.params.project}/title-heads/find` };
    },
    async handler(ctx) {
      const { step } = ctx;
      await requestCompatApi(
        ctx,
        `/-_-api/v1/owners/${step.params.owner}/projects/${step.params.project}/titleHeads`,
        `/api/v1/owners/${step.params.owner}/projects/${step.params.project}/title-heads/find`,
      );
    },
  },

  // --- OAuth provider routes (S11) -----------------------------------------
  "oauth-authenticate": {
    translateLegacy(step) {
      return { method: "GET", path: `/authenticate/${step.params.provider}` };
    },
    translateYoram(step) {
      return { method: "GET", path: `/authenticate/${step.params.provider}` };
    },
    async handler(ctx) {
      const { step } = ctx;
      const path = `/authenticate/${step.params.provider}`;
      const { legacyResult, yoramResult } = await requestAnonymousBoth(ctx, { method: "GET", path }, { method: "GET", path });
      pushStatusDivergence(ctx, path, legacyResult, yoramResult);
    },
  },
  "oauth-denied": {
    translateLegacy(step) {
      return { method: "GET", path: `/authenticate/${step.params.provider}/denied` };
    },
    translateYoram(step) {
      return { method: "GET", path: `/authenticate/${step.params.provider}/denied` };
    },
    async handler(ctx) {
      const { step } = ctx;
      const path = `/authenticate/${step.params.provider}/denied`;
      const { legacyResult, yoramResult } = await requestAnonymousBoth(ctx, { method: "GET", path }, { method: "GET", path });
      pushStatusDivergence(ctx, path, legacyResult, yoramResult);
    },
  },
  "post-compat-translation": {
    translateLegacy(step) {
      return { method: "POST", path: "/-_-api/v1/translation", json: { owner: step.params.owner, projectName: step.params.project, type: "issue", number: 1 } };
    },
    translateYoram(step) {
      return { method: "POST", path: `/api/v1/translation`, json: { owner: step.params.owner, projectName: step.params.project, type: "issue", number: 1 } };
    },
    async handler(ctx) {
      const { helpers, entry } = ctx;
      const legacy = this.translateLegacy(ctx.step);
      const yoram = this.translateYoram(ctx.step);
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacy, yoram);
      pushStatusDivergence(ctx, entry.behaviorIds[0] ?? legacy.path, legacyResult, yoramResult);
    },
  },
  "post-compat-default-login-page": {
    translateLegacy: () => ({ method: "POST", path: "/-_-api/v1/user/defultLoginPage", form: { defaultLoginPage: "" } }),
    translateYoram: () => ({ method: "POST", path: "/api/v1/user/default-login-page", form: { defaultLoginPage: "" } }),
    async handler(ctx) {
      const { entry, helpers } = ctx;
      const legacy = { method: "POST", path: "/-_-api/v1/user/defultLoginPage", form: { defaultLoginPage: "" } };
      const yoram = { method: "POST", path: "/api/v1/user/default-login-page", form: { defaultLoginPage: "" } };
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacy, yoram);
      pushStatusDivergence(ctx, "/user/editform/:tabId".replace(":tabId", "defultLoginPage"), legacyResult, yoramResult);
    },
  },
  "post-compat-user-invalid": {
    translateLegacy: () => ({ method: "POST", path: "/-_-api/v1/users", json: {} }),
    translateYoram: () => ({ method: "POST", path: "/api/v1/users/bulk", json: {} }),
    async handler(ctx) {
      const { entry, helpers } = ctx;
      const legacy = { method: "POST", path: "/-_-api/v1/users", json: {} };
      const yoram = { method: "POST", path: "/api/v1/users/bulk", json: {} };
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacy, yoram);
      pushStatusDivergence(ctx, entry.behaviorIds[0] ?? legacy.path, legacyResult, yoramResult);
    },
  },
  "post-compat-token-invalid": {
    translateLegacy: () => ({ method: "POST", path: "/-_-api/v1/users/token", json: { id: "no-such-parity-user", password: "definitely-wrong" } }),
    translateYoram: () => ({ method: "POST", path: "/api/v1/auth/token", json: { id: "no-such-parity-user", password: "definitely-wrong" } }),
    async handler(ctx) {
      const { entry, helpers } = ctx;
      const legacy = { method: "POST", path: "/-_-api/v1/users/token", json: { id: "no-such-parity-user", password: "definitely-wrong" } };
      const yoram = { method: "POST", path: "/api/v1/auth/token", json: { id: "no-such-parity-user", password: "definitely-wrong" } };
      const { legacyResult, yoramResult } = await requestAnonymousBoth(ctx, legacy, yoram);
      void entry;
      pushStatusDivergence(ctx, legacy.path, legacyResult, yoramResult);
    },
  },
  "patch-compat-admin-user-missing": {
    translateLegacy: () => ({ method: "PATCH", path: "/-_-api/v1/admin/users/no-such-parity-user", json: { state: "LOCKED" } }),
    translateYoram: () => ({ method: "PATCH", path: "/api/v1/admin/users/no-such-parity-user", json: { state: "LOCKED" } }),
    async handler(ctx) {
      const { entry, helpers } = ctx;
      const legacy = { method: "PATCH", path: "/-_-api/v1/admin/users/no-such-parity-user", json: { state: "LOCKED" } };
      const yoram = { method: "PATCH", path: "/api/v1/admin/users/no-such-parity-user", json: { state: "LOCKED" } };
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacy, yoram);
      pushStatusDivergence(ctx, entry.behaviorIds[0] ?? legacy.path, legacyResult, yoramResult);
    },
  },

  // --- wave C: email-token flows (B-0275/B-0154) -----------------------------
  // Both sides deliver password-reset mail to the sweep SMTP sink; each side's
  // mail carries its own absolute reset link (ports differ per instance).
  "request-lost-password": {
    translateLegacy(step) {
      return { method: "POST", path: "/lostPassword", form: { loginId: step.params.loginId, emailAddress: step.params.emailAddress } };
    },
    translateYoram(step) {
      return { method: "POST", path: "/lostPassword", form: { loginId: step.params.loginId, emailAddress: step.params.emailAddress } };
    },
    async handler(ctx) {
      const { step, state, helpers } = ctx;
      state.mailCountBefore = helpers.readMails().length;
      await helpers.requestBoth(ctx, this.translateLegacy(step, step.params), this.translateYoram(step, step.params));
    },
  },
  "open-reset-link": {
    // Client-side mail-driven flow; translators are inert registry stubs.
    translateLegacy: () => ({ method: "GET", path: "/__reset-link-client-side__" }),
    translateYoram: () => ({ method: "GET", path: "/__reset-link-client-side__" }),
    async handler(ctx) {
      const { entry, state, options, yoramBaseUrl, helpers } = ctx;
      const mails = await helpers.waitForMail(state.mailCountBefore ?? 0);
      const outcomes = {};
      for (const [side, baseUrl] of [["legacy", options.legacyUrl], ["yoram", yoramBaseUrl]]) {
        const expected = new URL(baseUrl);
        const expectedPort = expected.port || (expected.protocol === "https:" ? "443" : "80");
        const mail = mails.find((raw) =>
          helpers.extractMailLinks(raw, "/resetPassword").some((link) => {
            const url = new URL(link);
            return (url.port || (url.protocol === "https:" ? "443" : "80")) === expectedPort;
          }),
        );
        if (!mail) {
          entry.errors.push(`open-reset-link: no ${side} reset mail captured`);
          continue;
        }
        const link = helpers.extractMailLinks(mail, "/resetPassword").find((candidate) => {
          const url = new URL(candidate);
          return (url.port || (url.protocol === "https:" ? "443" : "80")) === expectedPort;
        });
        const url = new URL(link);
        const result = await helpers.sendRaw(ctx, side, { method: "GET", path: `${url.pathname}${url.search}` });
        outcomes[side] = result.status;
      }
      if (outcomes.legacy !== undefined && outcomes.yoram !== undefined && ((outcomes.legacy >= 400) !== (outcomes.yoram >= 400) || (outcomes.legacy >= 400 && outcomes.yoram >= 400 && outcomes.legacy !== outcomes.yoram))) {
        entry.violations.push(violation({ route: "/resetPassword?s=...", behaviorId: entry.behaviorIds[0] ?? null, kind: "api", expected: { status: outcomes.legacy }, actual: { status: outcomes.yoram } }));
      }
    },
  },
};
// --- shared helpers ---------------------------------------------------------

const normalizeLocation = (location) => {
  if (!location) return "";
  try {
    const url = new URL(location, "http://differential.invalid");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return location;
  }
};

const statusBucket = (status) => (status < 300 ? "2xx" : status < 400 ? "3xx" : status < 500 ? "4xx" : "5xx");

function freshSessions(ctx) {
  return { legacy: new LegacySession(ctx.options.legacyUrl), yoram: new YoramSession(ctx.yoramBaseUrl) };
}

// Request both sides WITHOUT session cookies (anonymous screens). Mirrors
// requestBoth: >=400 lands in entry.errors, never throws.
async function requestAnonymousBoth(ctx, legacyTranslation, yoramTranslation) {
  const { step, entry } = ctx;
  const sessions = freshSessions(ctx);
  const legacyResult = await sessions.legacy.request(legacyTranslation);
  if (legacyResult.status >= 400) entry.errors.push(`legacy ${step.action} failed: HTTP ${legacyResult.status} @ ${legacyTranslation.path}`);
  const yoramResult = await sessions.yoram.request(yoramTranslation);
  if (yoramResult.status >= 400) entry.errors.push(`yoram ${step.action} failed: HTTP ${yoramResult.status} @ ${yoramTranslation.path}`);
  return { legacyResult, yoramResult };
}

// Divergence rule: status-class mismatch between sides => violation, then continue.
function pushStatusDivergence(ctx, route, legacyResult, yoramResult) {
  const expected = statusBucket(legacyResult.status);
  const actual = statusBucket(yoramResult.status);
  if (expected !== actual) {
    ctx.entry.violations.push(violation({ route, behaviorId: ctx.entry.behaviorIds[0] ?? null, kind: "api", expected, actual }));
  }
}

// Anonymous DOM skeleton diff at the same path on both sides. Note: the shared
// browser pages may still carry cookies set by earlier authenticated scenarios;
// both sides receive them symmetrically so the diff stays apples-to-apples.
async function renderDomTargetPath(ctx, target, { spa = true } = {}) {
  await ctx.helpers.renderDomTarget(ctx, { legacy: `${ctx.options.legacyUrl}${target}`, yoram: `${ctx.yoramBaseUrl}${target}`, spa });
}

// Yoram serves the migrated compat endpoints at their RESTful /api/v1 paths
// (restful-uri-mapping v1) while legacy keeps its external /-_-api/v1
// namespace; each callsite passes both spellings explicitly.
async function requestCompatApi(ctx, legacyPath, yoramPath) {
  const yoramResult = await ctx.yoramSession.request({ method: "GET", path: yoramPath });
  const legacyResult = await ctx.legacySession.request({ method: "GET", path: legacyPath });
  if (legacyResult.status >= 400) ctx.entry.errors.push(`legacy GET failed: HTTP ${legacyResult.status} @ ${legacyPath}`);
  pushStatusDivergence(ctx, legacyPath, legacyResult, yoramResult);
  return { legacyResult, yoramResult };
}

// Anonymous page read: request without cookies, compare statuses, DOM-diff.
function anonymousPageAction(legacyPath) {
  return async (ctx) => {
    const { legacyResult, yoramResult } = await requestAnonymousBoth(ctx, { method: "GET", path: legacyPath }, { method: "GET", path: legacyPath });
    pushStatusDivergence(ctx, legacyPath, legacyResult, yoramResult);
    await renderDomTargetPath(ctx, legacyPath);
  };
}
// Authenticated page read via the shared sessions.
function sessionPageAction(legacyPath) {
  return async (ctx) => {
    const { legacyResult, yoramResult } = await ctx.helpers.requestBoth(ctx, { method: "GET", path: legacyPath }, { method: "GET", path: legacyPath });
    pushStatusDivergence(ctx, legacyPath, legacyResult, yoramResult);
    await renderDomTargetPath(ctx, legacyPath);
  };
}
