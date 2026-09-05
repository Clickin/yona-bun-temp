// Domain tests for scripts/differential/scenarios/auth.mjs.

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { ACTION_DEFINITIONS as REGISTRY } from "./scenarios/index.mjs";
import { scenarios, actionDefinitions } from "./scenarios/auth.mjs";
import { validateScenarios, matchBehaviors, buildCoverage } from "./dsl.mjs";

const ACTION_DEFINITIONS = { ...REGISTRY, ...actionDefinitions };

const inventory = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../docs/provenance/behavior-inventory.json", import.meta.url)), "utf8"),
);

// Behaviors already covered by other domains' scenarios before this wave.
const PREVIOUSLY_COVERED = new Set([
  "B-0305", // POST /users/login (S1-login)
  "B-0187", // GET /users/login (Application.index)
]);

const TARGET_DISTINCT_BEHAVIORS = 15;

test("every auth scenario passes validateScenarios against merged registry", () => {
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

  // Anonymous/public pages share the legacy direct route on both sides.
  assert.deepEqual(legacy("view-login-page"), { method: "GET", path: "/users/login" });
  assert.deepEqual(yoram("view-login-page"), { method: "GET", path: "/users/login" });
  assert.deepEqual(legacy("view-login-form"), { method: "GET", path: "/users/loginform" });
  assert.deepEqual(legacy("view-signup-form"), { method: "GET", path: "/users/signupform" });
  assert.deepEqual(legacy("view-lost-password"), { method: "GET", path: "/lostPassword" });
  assert.deepEqual(legacy("view-help-page"), { method: "GET", path: "/_help" });
  assert.deepEqual(legacy("view-init-page"), { method: "GET", path: "/_init" });
  assert.deepEqual(legacy("view-uikit-page"), { method: "GET", path: "/_UIKit" });

  // Authenticated pages.
  assert.deepEqual(legacy("view-projectform"), { method: "GET", path: "/projectform" });
  assert.deepEqual(legacy("view-projects-list"), { method: "GET", path: "/projects" });
  assert.deepEqual(legacy("view-project-transfer", { id: "9", key: "k" }), { method: "GET", path: "/project/transfer/9/k" });
  assert.deepEqual(yoram("view-project-transfer", { id: "9", key: "k" }), { method: "GET", path: "/project/transfer/9/k" });

  // Logout: legacy GET spellings vs Yoram sign-out API.
  assert.deepEqual(legacy("logout-session"), { method: "GET", path: "/logout" });
  assert.deepEqual(yoram("logout-session"), { method: "POST", path: "/api/v1/auth/sign-out" });

  // Compat APIs: legacy keeps its external /-_-api/v1 namespace; Yoram serves
  // the migrated RESTful /api/v1 counterparts (restful-uri-mapping v1).
  assert.deepEqual(legacy("get-compat-hello"), { method: "GET", path: "/-_-api/v1/hello" });
  assert.deepEqual(yoram("get-compat-hello"), { method: "GET", path: "/api/v1/hello" });
  assert.deepEqual(legacy("get-compat-users"), { method: "GET", path: "/-_-api/v1/users" });
  assert.deepEqual(yoram("get-compat-users"), { method: "GET", path: "/api/v1/users/directory" });
  assert.deepEqual(legacy("get-favorite-projects"), { method: "GET", path: "/-_-api/v1/favoriteProjects" });
  assert.deepEqual(yoram("get-favorite-projects"), { method: "GET", path: "/api/v1/user/favorites/projects" });
  assert.deepEqual(legacy("get-favorite-organizations"), { method: "GET", path: "/-_-api/v1/favoriteOrganizations" });
  assert.deepEqual(yoram("get-favorite-organizations"), { method: "GET", path: "/api/v1/user/favorites/organizations" });
  assert.deepEqual(legacy("get-title-heads", { owner: "admin", project: "sample" }), {
    method: "GET",
    path: "/-_-api/v1/owners/admin/projects/sample/titleHeads",
  });
  assert.deepEqual(yoram("get-title-heads", { owner: "admin", project: "sample" }).path, "/api/v1/owners/admin/projects/sample/title-heads/find");

  // OAuth provider routes.
  assert.deepEqual(legacy("oauth-authenticate", { provider: "github" }), { method: "GET", path: "/authenticate/github" });
  assert.deepEqual(yoram("oauth-denied", { provider: "github" }), { method: "GET", path: "/authenticate/github/denied" });

  for (const [name, definition] of Object.entries(actionDefinitions)) {
    for (const [side, translate] of [["legacy", definition.translateLegacy], ["yoram", definition.translateYoram]]) {
      const result = translate({ params: {} });
      assert.match(result.method, /^(GET|POST|PUT|PATCH|DELETE)$/u, `${name}/${side}: method`);
      assert.ok(result.path.startsWith("/"), `${name}/${side}: path must be absolute`);
    }
  }
});

test("matchBehaviors returns non-empty lists and >=15 NEW distinct uncovered B-ids", () => {
  const covered = new Set();
  for (const scenario of scenarios) {
    const behaviorIds = matchBehaviors(scenario, inventory.behaviors);
    assert.ok(behaviorIds.length > 0, `${scenario.id}: matched no behaviors`);
    for (const id of behaviorIds) covered.add(id);
  }
  const newIds = [...covered].filter((id) => !PREVIOUSLY_COVERED.has(id));
  assert.ok(
    newIds.length >= TARGET_DISTINCT_BEHAVIORS,
    `new distinct B-ids ${newIds.length} < target ${TARGET_DISTINCT_BEHAVIORS}: ${newIds.sort().join(",")}`,
  );
});

test("buildCoverage emits per-scenario non-empty behaviorIds", () => {
  const coverage = buildCoverage(scenarios, inventory.behaviors, "test-run");
  assert.equal(coverage.runId, "test-run");
  for (const entry of coverage.scenarios) {
    assert.ok(entry.behaviorIds.length > 0, `${entry.scenarioId}: empty coverage entry`);
  }
});

test("restricted guard compares matching redirect status/location without rendering landing page", async () => {
  const originalFetch = globalThis.fetch;
  let rendered = false;
  globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: "/" } });
  try {
    const ctx = {
      step: { actor: "anonymous", action: "view-restricted-page", params: {} },
      entry: { behaviorIds: ["B-restricted"], violations: [], errors: [] },
      options: { legacyUrl: "http://legacy.test" },
      yoramBaseUrl: "http://yoram.test",
      helpers: {
        renderDomTarget() {
          rendered = true;
        },
      },
    };
    await ACTION_DEFINITIONS["view-restricted-page"].handler(ctx);
    assert.equal(rendered, false);
    assert.deepEqual(ctx.entry.violations, []);
    assert.deepEqual(ctx.entry.errors, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
