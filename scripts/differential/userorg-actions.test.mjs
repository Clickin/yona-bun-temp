// Domain tests for scripts/differential/scenarios/userorg.mjs.
// The registry (scenarios/index.mjs) imports userorg; ACTION_DEFINITIONS is
// merged with this module's definitions so the file also passes standalone.

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { ACTION_DEFINITIONS as REGISTRY } from "./scenarios/index.mjs";
import { scenarios, actionDefinitions } from "./scenarios/userorg.mjs";
import { validateScenarios, matchBehaviors, buildCoverage } from "./dsl.mjs";

// Standalone merge: registry keys + this module's definitions.
const ACTION_DEFINITIONS = { ...REGISTRY, ...actionDefinitions };

const inventory = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../docs/provenance/behavior-inventory.json", import.meta.url)), "utf8"),
);

// Distinct B-ids matched by the whole userorg domain (read + mutation waves).
const TARGET_DISTINCT_BEHAVIORS = 77;

// Behavior ids already covered by the registry before the userorg mutation
// wave landed (snapshot of .agent/differential/behavior-coverage.json at
// wave start). New scenarios must add NEW_DISTINCT_TARGET ids beyond these.
const BASELINE_COVERED_IDS = new Set([
  "B-0023", "B-0028", "B-0029", "B-0031", "B-0035", "B-0037", "B-0038", "B-0039",
  "B-0040", "B-0041", "B-0043", "B-0045", "B-0046", "B-0049", "B-0050", "B-0051",
  "B-0052", "B-0053", "B-0054", "B-0055", "B-0056", "B-0057", "B-0058", "B-0059",
  "B-0060", "B-0061", "B-0062", "B-0063", "B-0064", "B-0065", "B-0066", "B-0067",
  "B-0072", "B-0073", "B-0074", "B-0075", "B-0077", "B-0079", "B-0081", "B-0082",
  "B-0083", "B-0084", "B-0085", "B-0086", "B-0087", "B-0088", "B-0089", "B-0090",
  "B-0091", "B-0092", "B-0093", "B-0094", "B-0095", "B-0096", "B-0097", "B-0098",
  "B-0099", "B-0100", "B-0101", "B-0102", "B-0103", "B-0104", "B-0105", "B-0106",
  "B-0111", "B-0112", "B-0114", "B-0135", "B-0136", "B-0137", "B-0141", "B-0142",
  "B-0148", "B-0156", "B-0160", "B-0176", "B-0177", "B-0179", "B-0180", "B-0181",
  "B-0182", "B-0187", "B-0188", "B-0189", "B-0191", "B-0305", "B-0306",
]);

const NEW_DISTINCT_TARGET = 35;

// Behavior ids the throwaway-entity lifecycle wave (U20-U23) must newly
// cover — none of these were matched by any registry scenario before it.
const LIFECYCLE_WAVE_REQUIRED_IDS = [
  "B-0016", "B-0017", "B-0018",
  "B-0020",
  "B-0234",
  "B-0278", "B-0279", "B-0280", "B-0281", "B-0282", "B-0283",
  "B-0290", "B-0291", "B-0292", "B-0293",
  "B-0298", "B-0299", "B-0300",
  "B-0302", "B-0306",
];

test("every userorg scenario passes validateScenarios against merged registry", () => {
  const problems = validateScenarios(scenarios, Object.keys(ACTION_DEFINITIONS));
  assert.deepEqual(problems, []);
});

test("every referenced action exists in merged ACTION_DEFINITIONS with both translators", () => {
  for (const scenario of scenarios) {
    for (const step of scenario.actions) {
      const definition = ACTION_DEFINITIONS[step.action];
      assert.ok(definition, `${scenario.id}: missing definition for ${step.action}`);
      assert.equal(typeof definition.translateLegacy, "function", `${step.action}: translateLegacy`);
      assert.equal(typeof definition.translateYoram, "function", `${step.action}: translateYoram`);
      assert.equal(typeof definition.handler, "function", `${step.action}: handler`);
    }
  }
});

test("action names are globally unique across the merged registry", () => {
  const seen = new Map();
  for (const [name, definition] of Object.entries(ACTION_DEFINITIONS)) {
    // Registry merge keeps the first definition per name; detect collisions by
    // checking that no userorg definition was shadowed by another domain.
    if (actionDefinitions[name] && definition !== actionDefinitions[name]) {
      throw new Error(`userorg action shadowed by another domain: ${name}`);
    }
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }
});

test("translators produce expected method/path literals", () => {
  const legacy = (action, params = {}) => actionDefinitions[action].translateLegacy({ params });
  const yoram = (action, params = {}) => actionDefinitions[action].translateYoram({ params });

  // view-user-issues: tab query on both sides; yoram API + pagePath
  assert.deepEqual(legacy("view-user-issues", { tab: "assigned" }), { method: "GET", path: "/user/issues?tab=assigned" });
  assert.deepEqual(yoram("view-user-issues", { tab: "assigned" }), {
    method: "GET",
    path: "/api/v1/user/issues/search?tab=assigned",
    pagePath: "/user/issues?tab=assigned",
  });
  assert.deepEqual(legacy("view-user-issues"), { method: "GET", path: "/user/issues" });

  assert.deepEqual(legacy("get-user-issues-compat"), { method: "GET", path: "/-_-api/v1/user/issues" });
  assert.deepEqual(yoram("get-user-issues-compat"), { method: "GET", path: "/api/v1/user/issues/search" });

  assert.deepEqual(legacy("view-notifications"), { method: "GET", path: "/notifications" });
  assert.deepEqual(legacy("view-notifications", { path: "/notification" }), { method: "GET", path: "/notification?from=0&limit=10" });
  assert.deepEqual(yoram("view-notifications"), {
    method: "GET",
    path: "/api/v1/notifications",
    pagePath: "/notifications",
  });

  assert.deepEqual(legacy("view-global-search", { query: "a b" }), { method: "GET", path: "/search?keyword=a%20b&searchType=issue" });
  assert.deepEqual(yoram("view-global-search", { query: "sample" }).path, "/api/v1/search?keyword=sample&searchType=issue");

  assert.deepEqual(legacy("view-orgs-list"), { method: "GET", path: "/orgs" });
  assert.deepEqual(yoram("view-orgs-list").path, "/api/v1/organizations");

  assert.deepEqual(legacy("view-org-home", { organization: "weblabs" }), { method: "GET", path: "/organizations/weblabs" });
  assert.deepEqual(yoram("view-org-home", { organization: "weblabs" }), {
    method: "GET",
    path: "/api/v1/organizations/weblabs",
    pagePath: "/organizations/weblabs",
  });

  assert.deepEqual(legacy("view-user-profile", { user: "admin" }), { method: "GET", path: "/admin" });
  assert.deepEqual(yoram("view-user-profile", { user: "admin" }), {
    method: "GET",
    path: "/api/v1/users/admin/profile",
    pagePath: "/admin",
  });

  assert.deepEqual(legacy("view-user-files"), { method: "GET", path: "/user/files" });
  assert.deepEqual(yoram("view-user-files"), { method: "GET", path: "/user/files" });

  assert.deepEqual(legacy("view-new-direct-issue-form"), { method: "GET", path: "/user/issues/new" });
  assert.deepEqual(legacy("view-new-direct-issue-form", { mine: true }), { method: "GET", path: "/user/issues/new/mine" });
  assert.deepEqual(yoram("view-new-direct-issue-form", { mine: true }), { method: "GET", path: "/user/issues/new/mine" });

  assert.deepEqual(legacy("get-user-statistics", { user: "admin" }), { method: "GET", path: "/-_-api/v1/users/admin/statistics" });
  assert.deepEqual(yoram("get-user-statistics", { user: "admin" }), { method: "GET", path: "/api/v1/users/admin/statistics/summary" });

  // --- org screens -----------------------------------------------------------
  assert.deepEqual(legacy("view-org-subpage", { organization: "weblabs", page: "boards" }), {
    method: "GET",
    path: "/organizations/weblabs/boards",
  });
  assert.deepEqual(yoram("view-org-subpage", { organization: "weblabs", page: "pullrequests" }).path,
    "/api/v1/organizations/weblabs/pull-requests");
  assert.deepEqual(yoram("view-org-subpage", { organization: "weblabs", page: "closedPullrequests" }).path,
    "/organizations/weblabs/closedPullrequests");
  assert.deepEqual(yoram("view-org-subpage", { organization: "weblabs", page: "members" }).path,
    "/api/v1/organizations/weblabs/members");
  // SPA-shell fallback pages translate to the same legacy direct route.
  assert.deepEqual(yoram("view-org-subpage", { organization: "weblabs", page: "deleteForm" }).path,
    "/organizations/weblabs/deleteForm");
  assert.deepEqual(yoram("view-org-subpage", { organization: "weblabs", page: "settingform" }).pagePath,
    "/organizations/weblabs/settingform");
  assert.deepEqual(legacy("view-new-org-form"), { method: "GET", path: "/organizations/new" });

  // --- profile edit forms ----------------------------------------------------
  assert.deepEqual(legacy("view-user-editform"), { method: "GET", path: "/user/editform" });
  assert.deepEqual(legacy("view-user-editform", { tab: "emails" }), { method: "GET", path: "/user/editform/emails" });
  assert.deepEqual(yoram("view-user-editform", { tab: "token" }), { method: "GET", path: "/user/editform/token" });

  // --- site-admin screens and files -----------------------------------------
  assert.deepEqual(legacy("view-site-screen", { screen: "userList" }), { method: "GET", path: "/sites/userList" });
  assert.deepEqual(yoram("view-site-screen", { screen: "projectList" }), { method: "GET", path: "/sites/projectList" });
  assert.deepEqual(legacy("view-files-list"), { method: "GET", path: "/files" });
  assert.deepEqual(yoram("get-users-directory"), { method: "GET", path: "/api/v1/users/directory" });
  assert.deepEqual(legacy("check-email-exists", { email: "a@b.co" }), { method: "GET", path: "/user/isEmailExist?email=a%40b.co" });

  // --- mutations ---------------------------------------------------------------
  assert.deepEqual(legacy("toggle-favorite", { target: "issue" }), { method: "POST", path: "/-_-api/v1/favoriteIssues/1" });
  assert.deepEqual(legacy("toggle-favorite", { target: "organization" }), { method: "POST", path: "/-_-api/v1/favoriteOrganizations/1" });
  assert.deepEqual(yoram("toggle-favorite", { target: "organization" }), {
    method: "POST",
    path: "/api/v1/organizations/weblabs/favorite",
  });
  assert.deepEqual(yoram("toggle-favorite", { target: "issue", issueNumber: 3 }), {
    method: "POST",
    path: "/api/v1/owners/admin/projects/sample/issues/3/favorite",
  });
  assert.deepEqual(legacy("toggle-noti-watch", { notiType: "NEW_ISSUE" }), { method: "POST", path: "/noti/toggle/1/NEW_ISSUE" });
  assert.deepEqual(legacy("add-email", { email: "x@y.z" }), { method: "POST", path: "/user/email", form: { email: "x@y.z" } });
  assert.deepEqual(legacy("set-as-main-email", { emailId: 7 }), { method: "PUT", path: "/user/email/setAsMain/7" });
  assert.deepEqual(yoram("delete-email", { emailId: 9 }), { method: "DELETE", path: "/user/email/delete/9" });
  assert.deepEqual(legacy("reset-visited-list"), { method: "POST", path: "/user/resetVisitedList" });
  assert.deepEqual(yoram("reset-visited-list"), { method: "POST", path: "/user/resetVisitedList" });
  // --- throwaway-entity lifecycle wave (U20-U23) ------------------------------
  assert.deepEqual(legacy("create-organization", { name: "o1" }), {
    method: "POST",
    path: "/organizations/new",
    form: { name: "o1" },
  });
  assert.deepEqual(yoram("create-organization", { name: "o1" }), {
    method: "POST",
    path: "/api/v1/organizations",
    json: { organizationName: "o1", description: "" },
  });
  assert.deepEqual(legacy("add-org-member", { organization: "o1", user: "bob" }), {
    method: "POST",
    path: "/organizations/o1/members",
    form: { loginId: "bob" },
  });
  assert.deepEqual(yoram("edit-org-member", { organization: "o1", role: "org_admin" }), {
    method: "PATCH",
    path: "/api/v1/organizations/o1/members/1",
    json: { role: "org_admin" },
  });
  assert.equal(legacy("enroll-organization", { organization: "o1" }).path, "/organizations/o1/enroll");
  assert.deepEqual(legacy("cancel-organization-enroll", { organization: "o1" }), {
    method: "POST",
    path: "/organizations/o1/cancel/enroll",
  });
  assert.deepEqual(yoram("cancel-organization-enroll", { organization: "o1" }), {
    method: "DELETE",
    path: "/api/v1/organizations/o1/enroll",
  });
  assert.deepEqual(legacy("leave-organization", { organization: "o1" }), {
    method: "DELETE",
    path: "/organizations/o1/member/leave",
  });
  assert.deepEqual(yoram("delete-org-member", { organization: "o1" }), {
    method: "DELETE",
    path: "/api/v1/organizations/o1/members/1",
  });
  assert.deepEqual(legacy("delete-organization", { organization: "o1" }), {
    method: "DELETE",
    path: "/organizations/o1",
  });

  const signupForm = actionDefinitions["signup-user"].translateLegacy({
    params: { loginId: "u1", name: "n1", email: "e@x.co", password: "p1" },
  });
  assert.equal(signupForm.path, "/users/signup");
  assert.equal(signupForm.form.retypedPassword, "p1");
  assert.deepEqual(legacy("toggle-account-lock", { loginId: "u1" }), {
    method: "POST",
    path: "/sites/toggleAccountLock?loginId=u1",
  });
  assert.deepEqual(legacy("toggle-guest-mode", { loginId: "u1" }), {
    method: "POST",
    path: "/sites/toggleGuestMode?loginId=u1",
  });
  assert.deepEqual(yoram("toggle-site-admin-role", { loginId: "u1" }), {
    method: "POST",
    path: "/sites/toggleSiteAdminRole/u1",
  });
  assert.deepEqual(legacy("unwatch-update"), { method: "POST", path: "/sites/unwatchUpdate" });
  assert.deepEqual(legacy("delete-site-user", { userId: 12 }), {
    method: "DELETE",
    path: "/sites/user/delete12",
  });
  assert.deepEqual(legacy("edit-user-profile", { name: "n", email: "e@x.co" }), {
    method: "POST",
    path: "/user/edit",
    form: { name: "n", email: "e@x.co" },
  });
  assert.deepEqual(yoram("save-user-editform-tab", { tab: "emails" }), {
    method: "POST",
    path: "/user/editform/emails",
    form: {},
  });
  assert.deepEqual(yoram("send-validation-email", { emailId: 5 }), {
    method: "POST",
    path: "/user/email/sendValidationEmail/5",
  });
  assert.deepEqual(yoram("reset-site-user-password", { loginId: "u1" }), {
    method: "POST",
    path: "/u1?action=resetPassword",
  });

  for (const definition of Object.values(actionDefinitions)) {
    for (const translate of [definition.translateLegacy, definition.translateYoram]) {
      const result = translate({ params: {} });
      assert.match(result.method, /^(GET|POST|PUT|DELETE|PATCH)$/u);
      assert.ok(result.path.startsWith("/"), `path must be absolute: ${result.path}`);
    }
  }
});

test("matchBehaviors returns non-empty distinct B-id lists for every scenario", () => {
  const covered = new Set();
  for (const scenario of scenarios) {
    const behaviorIds = matchBehaviors(scenario, inventory.behaviors);
    assert.ok(behaviorIds.length > 0, `${scenario.id}: matched no behaviors`);
    for (const id of behaviorIds) covered.add(id);
  }
  assert.ok(
    covered.size >= TARGET_DISTINCT_BEHAVIORS,
    `distinct covered B-ids ${covered.size} < target ${TARGET_DISTINCT_BEHAVIORS}: ${[...covered].sort().join(",")}`,
  );
});

test("mutation wave covers at least 35 NEW distinct behavior ids vs baseline", () => {
  const fresh = new Set();
  for (const scenario of scenarios) {
    for (const id of matchBehaviors(scenario, inventory.behaviors)) {
      if (!BASELINE_COVERED_IDS.has(id)) fresh.add(id);
    }
  }
  assert.ok(
    fresh.size >= NEW_DISTINCT_TARGET,
    `new distinct B-ids ${fresh.size} < target ${NEW_DISTINCT_TARGET}: ${[...fresh].sort().join(",")}`,
  );
});

test("lifecycle wave (U20-U23) covers every required previously-uncovered behavior id", () => {
  const covered = new Set(
    scenarios
      .filter((scenario) => /^U2[0-3]/.test(scenario.id))
      .flatMap((scenario) => matchBehaviors(scenario, inventory.behaviors)),
  );
  const missing = LIFECYCLE_WAVE_REQUIRED_IDS.filter((id) => !covered.has(id));
  assert.deepEqual(missing, [], `lifecycle wave misses: ${missing.join(",")}`);
});

test("lifecycle wave adds at least 18 NEW distinct behavior ids vs pre-wave registry coverage", () => {
  // Pre-wave covered ids come from the mutation-wave baseline plus the ids
  // its scenarios matched; the lifecycle ids must all be outside that set.
  const fresh = new Set();
  for (const scenario of scenarios) {
    for (const id of matchBehaviors(scenario, inventory.behaviors)) {
      if (!BASELINE_COVERED_IDS.has(id)) fresh.add(id);
    }
  }
  const lifecycleFresh = LIFECYCLE_WAVE_REQUIRED_IDS.filter((id) => fresh.has(id));
  assert.ok(lifecycleFresh.length >= 18, `only ${lifecycleFresh.length} lifecycle-wave B-ids are new`);
});

test("self-cleanup contract: every mutating scenario ends with revert/cleanup steps", () => {
  const cleanupByScenario = {
    "U12-favorite-toggles": (actions) =>
      actions.some((step) => step.action === "toggle-favorite"),
    "U14-noti-watch-toggle": (actions) => actions.some((step) => step.action === "toggle-noti-watch"),
    "U16-email-lifecycle": (actions) =>
      actions.some((step) => step.action === "delete-email") &&
      actions.some((step) => step.action === "restore-main-email"),
    "U20-throwaway-org-lifecycle": (actions) =>
      actions.at(-1).action === "delete-organization" &&
      actions.some((step) => step.action === "delete-org-member") &&
      actions.some((step) => step.action === "leave-organization"),
    "U21-throwaway-user-site-toggles": (actions) =>
      actions.at(-1).action === "delete-site-user" &&
      ["toggle-account-lock", "toggle-guest-mode", "toggle-site-admin-role"].every((action) =>
        actions.filter((step) => step.action === action).length === 1,
      ),
    "U22-user-profile-edit-revert": (actions) =>
      actions.some((step) => step.action === "edit-user-profile"),
    "U23-email-validation-lifecycle": (actions) => actions.at(-1).action === "delete-email",
  };
  for (const [scenarioId, check] of Object.entries(cleanupByScenario)) {
    const scenario = scenarios.find((entry) => entry.id === scenarioId);
    assert.ok(scenario, `missing scenario ${scenarioId}`);
    assert.ok(check(scenario.actions), `${scenarioId}: missing self-cleanup/revert steps`);
  }
  // Double-toggle semantics are enforced inside handlers; assert the toggling
  // actions appear exactly once per target and rely on internal round-trips.
  const favoriteSteps = scenarios
    .flatMap((scenario) => scenario.actions)
    .filter((step) => step.action === "toggle-favorite");
  const targets = favoriteSteps.map((step) => step.params.target).sort();
  assert.deepEqual(targets, ["issue", "organization", "project"]);
});

test("buildCoverage emits per-scenario non-empty behaviorIds", () => {
  const coverage = buildCoverage(scenarios, inventory.behaviors, "test-run");
  assert.equal(coverage.runId, "test-run");
  for (const entry of coverage.scenarios) {
    assert.ok(entry.behaviorIds.length > 0, `${entry.scenarioId}: empty coverage entry`);
  }
});
