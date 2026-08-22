// Domain tests for scripts/differential/scenarios/userorg.mjs.
// The registry (scenarios/index.mjs) does not import userorg yet — merge
// ACTION_DEFINITIONS locally here until the integrator registers the module.

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

const TARGET_DISTINCT_BEHAVIORS = 15;

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

test("translators produce expected method/path literals", () => {
  const legacy = (action, params = {}) => actionDefinitions[action].translateLegacy({ params });
  const yoram = (action, params = {}) => actionDefinitions[action].translateYoram({ params });

  // view-user-issues: tab query on both sides; yoram API + pagePath
  assert.deepEqual(legacy("view-user-issues", { tab: "assigned" }), { method: "GET", path: "/user/issues?tab=assigned" });
  assert.deepEqual(yoram("view-user-issues", { tab: "assigned" }), {
    method: "GET",
    path: "/api/v1/user/issues?tab=assigned",
    pagePath: "/user/issues?tab=assigned",
  });
  assert.deepEqual(legacy("view-user-issues"), { method: "GET", path: "/user/issues" });

  assert.deepEqual(legacy("get-user-issues-compat"), { method: "GET", path: "/-_-api/v1/user/issues" });
  assert.deepEqual(yoram("get-user-issues-compat"), { method: "GET", path: "/api/v1/-_-api/v1/user/issues" });

  assert.deepEqual(legacy("view-notifications"), { method: "GET", path: "/notifications" });
  assert.deepEqual(legacy("view-notifications", { path: "/notification" }), { method: "GET", path: "/notification" });
  assert.deepEqual(yoram("view-notifications"), {
    method: "GET",
    path: "/api/v1/notifications",
    pagePath: "/notifications",
  });

  assert.deepEqual(legacy("view-global-search", { query: "a b" }), { method: "GET", path: "/search?query=a%20b" });
  assert.deepEqual(yoram("view-global-search", { query: "sample" }).path, "/api/v1/search?query=sample");

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
  assert.deepEqual(yoram("get-user-statistics", { user: "admin" }), { method: "GET", path: "/api/v1/users/admin/statistics" });

  for (const definition of Object.values(actionDefinitions)) {
    for (const translate of [definition.translateLegacy, definition.translateYoram]) {
      const result = translate({ params: {} });
      assert.match(result.method, /^GET$/u);
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

test("buildCoverage emits per-scenario non-empty behaviorIds", () => {
  const coverage = buildCoverage(scenarios, inventory.behaviors, "test-run");
  assert.equal(coverage.runId, "test-run");
  for (const entry of coverage.scenarios) {
    assert.ok(entry.behaviorIds.length > 0, `${entry.scenarioId}: empty coverage entry`);
  }
});
