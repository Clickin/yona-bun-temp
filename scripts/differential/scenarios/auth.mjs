// Auth domain: login scenario + action definition.
//
// Domain module contract (see scenarios/index.mjs): each module exports
// `scenarios` and `actionDefinitions`. ctx = { step, resolved, state, entry,
// legacySession, yoramSession, legacyPage, yoramPage, options, yoramBaseUrl,
// suffix, helpers } where helpers carries run.mjs's shared request/render
// utilities.
import { translateLegacy, translateYoram } from "../adapters.mjs";
import { violation } from "../report.mjs";

export const scenarios = [
  {
    id: "S1-login",
    title: "admin login",
    actions: [{ actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } }],
    behaviorMatcher: { action: /^UserApp\.login$/ },
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
};
