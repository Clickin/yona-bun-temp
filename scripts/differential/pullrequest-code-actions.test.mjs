// Tests for the pullrequest-code domain module: registry shape, translator
// literals, and behavior-inventory coverage. Runs standalone: merges this
// module's actionDefinitions with the shared registry locally because
// scenarios/index.mjs is not edited by domain agents.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";
import { validateScenarios, matchBehaviors } from "./dsl.mjs";
import { scenarios, actionDefinitions } from "./scenarios/pullrequest-code.mjs";

const MERGED_DEFINITIONS = { ...ACTION_DEFINITIONS, ...actionDefinitions };
const knownActions = Object.keys(MERGED_DEFINITIONS);

const inventory = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../docs/provenance/behavior-inventory.json"), "utf8"),
).behaviors;

test("every scenario passes validateScenarios against merged registry", () => {
  const problems = validateScenarios(scenarios, knownActions);
  assert.deepEqual(problems, []);
});

test("every referenced action exists in ACTION_DEFINITIONS after merge", () => {
  for (const scenario of scenarios) {
    for (const step of scenario.actions) {
      assert.ok(
        MERGED_DEFINITIONS[step.action],
        `${scenario.id}: action ${step.action} missing from merged registry`,
      );
      assert.equal(typeof MERGED_DEFINITIONS[step.action].handler, "function", `${step.action} needs handler`);
      assert.equal(typeof MERGED_DEFINITIONS[step.action].translateLegacy, "function", `${step.action} needs translateLegacy`);
      assert.equal(typeof MERGED_DEFINITIONS[step.action].translateYoram, "function", `${step.action} needs translateYoram`);
    }
  }
});

test("translators produce expected method/path literals", () => {
  const step = (action, params) => ({ action, params });
  const cases = [
    ["list-pullrequests", { owner: "admin", project: "sample" }, "/admin/sample/pullRequests"],
    ["list-closed-pullrequests", { owner: "admin", project: "sample" }, "/admin/sample/closedPullRequests"],
    ["list-sent-pullrequests", { owner: "admin", project: "sample" }, "/admin/sample/sentPullRequests"],
    ["new-pullrequest-form", { owner: "admin", project: "sample" }, "/admin/sample/newPullRequestForm"],
    ["merge-result", { owner: "admin", project: "sample" }, "/admin/sample/newPullRequest/mergeResult"],
    ["view-pullrequest", { owner: "admin", project: "sample", prId: 1 }, "/admin/sample/pullRequest/1"],
    ["view-pullrequest-state", { owner: "admin", project: "sample", prId: 2 }, "/admin/sample/pullRequest/2/state"],
    ["view-pullrequest-changes", { owner: "admin", project: "sample", prId: 3 }, "/admin/sample/pullRequest/3/changes"],
    ["view-specific-change", { owner: "admin", project: "sample", prId: 3, commitId: "abc123" }, "/admin/sample/pullRequest/3/changes/abc123"],
    ["view-pullrequest-editform", { owner: "admin", project: "sample", prId: 4 }, "/admin/sample/pullRequest/4/editform"],
    ["list-commits", { owner: "admin", project: "sample" }, "/admin/sample/commits"],
    ["list-commits-branch", { owner: "admin", project: "sample", branch: "main" }, "/admin/sample/commits/main/"],
    ["list-commits-path", { owner: "admin", project: "sample", branch: "main", path: "README.md" }, "/admin/sample/commits/main/README.md"],
    ["view-commit", { owner: "admin", project: "sample", commitId: "def456" }, "/admin/sample/commit/def456"],
    ["browse-code", { owner: "admin", project: "sample" }, "/admin/sample/code"],
    ["browse-code-branch", { owner: "admin", project: "sample", branch: "main" }, "/admin/sample/code/main"],
    ["browse-code-tree-entry", { owner: "admin", project: "sample", branch: "main", path: "README.md" }, "/admin/sample/code/main/README.md"],
    ["browse-code-ajax-root", { owner: "admin", project: "sample", branch: "main" }, "/admin/sample/code/main/!"],
    ["browse-code-ajax-slash", { owner: "admin", project: "sample", branch: "main" }, "/admin/sample/code/main/!/"],
    ["browse-code-ajax-path", { owner: "admin", project: "sample", branch: "main", path: "app.js" }, "/admin/sample/code/main/!/app.js"],
    ["list-branches", { owner: "admin", project: "sample" }, "/admin/sample/branches"],
  ];
  for (const [action, params, expectedPath] of cases) {
    const legacy = MERGED_DEFINITIONS[action].translateLegacy(step(action, params), {});
    assert.deepEqual(legacy, { method: "GET", path: expectedPath }, `${action} legacy translation`);
    const yoram = MERGED_DEFINITIONS[action].translateYoram(step(action, params), {});
    assert.equal(yoram.method, "GET", `${action} yoram method`);
    assert.equal(yoram.path, expectedPath, `${action} yoram path (SPA shell serves legacy route)`);
    assert.equal(yoram.pagePath, expectedPath, `${action} yoram pagePath`);
  }
});

test("matchBehaviors returns non-empty B-id lists for every scenario", () => {
  for (const scenario of scenarios) {
    const ids = matchBehaviors(scenario, inventory);
    assert.ok(ids.length > 0, `${scenario.id}: no behaviors matched`);
  }
});

test("distinct covered B-id count meets target (>= 20)", () => {
  const all = new Set(scenarios.flatMap((scenario) => matchBehaviors(scenario, inventory)));
  assert.ok(all.size >= 20, `distinct B-id coverage ${all.size} < 20: ${[...all].join(", ")}`);
});

test("all scenarios are read-only GET actions (no mutations)", () => {
  for (const scenario of scenarios) {
    for (const stepAction of scenario.actions.map((a) => a.action)) {
      if (stepAction === "login") continue;
      const def = MERGED_DEFINITIONS[stepAction];
      const probe = { action: stepAction, params: { owner: "o", project: "p", prId: 1, commitId: "c", branch: "b", path: "x" } };
      assert.equal(def.translateLegacy(probe, {}).method, "GET", `${stepAction} must be GET`);
    }
  }
});
