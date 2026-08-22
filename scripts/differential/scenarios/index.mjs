// Domain scenario registry for the differential parity sweep.
//
// Adding a new action/scenario = create one new domain module here exporting
// `scenarios` and `actionDefinitions`, then add it to `domains` below. No
// shared-file edits needed.
//
// Domain module contract:
//   export const scenarios = [ { id, title, actions: [{ actor, action, params }], behaviorMatcher } ];
//   export const actionDefinitions = {
//     "action-name": {
//       translateLegacy(step, resolved) { return { method, path, form|json }; },
//       translateYoram(step, resolved) { return { method, path, json }; },
//       async handler(ctx) {},
//     },
//   };
// ctx = { step, resolved, state, entry, legacySession, yoramSession,
// legacyPage, yoramPage, options, yoramBaseUrl, suffix, helpers } — helpers
// carries run.mjs's shared request/render utilities (requestBoth,
// renderDomTarget, setCookiesFromHeader, hoverAnchor, raceTimeout,
// popoverExtract, issueNumberFromLocation).
import * as auth from "./auth.mjs";
import * as project from "./project.mjs";
import * as issues from "./issues.mjs";
import * as pullrequestCode from "./pullrequest-code.mjs";
import * as userorg from "./userorg.mjs";

const domains = [auth, project, issues, pullrequestCode, userorg];

export const scenarios = [...auth.scenarios, ...project.scenarios, ...issues.scenarios, ...pullrequestCode.scenarios, ...userorg.scenarios].sort((a, b) => a.id.localeCompare(b.id));

export const ACTION_DEFINITIONS = Object.assign({}, ...domains.map((domain) => domain.actionDefinitions));
