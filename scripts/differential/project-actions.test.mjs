// Tests for the project domain module: registry shape, translator literals,
// and behavior-inventory coverage. Runs standalone: merges this module's
// actionDefinitions with the shared registry locally because
// scenarios/index.mjs is not edited by domain agents.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";
import { validateScenarios, matchBehaviors } from "./dsl.mjs";
import { scenarios, actionDefinitions } from "./scenarios/project.mjs";

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
    ["list-issue-labels", { owner: "admin", project: "sample" }, "/admin/sample/issue/labels"],
    ["view-issue-labels-form", { owner: "admin", project: "sample" }, "/admin/sample/issue/labelsform"],
    ["list-issue-label-categories", { owner: "admin", project: "sample" }, "/admin/sample/issue/label/categories"],
    ["view-issue-label-category", { owner: "admin", project: "sample", categoryId: 1 }, "/admin/sample/issue/label/category/1"],
    ["fetch-issue-label-styles", { owner: "admin", project: "sample" }, "/admin/sample/issue/labels.css"],
    ["view-site-labels", {}, "/labels"],
    ["view-site-label-categories", {}, "/categories"],
    ["list-milestones", { owner: "admin", project: "sample" }, "/admin/sample/milestones"],
    ["view-milestone", { owner: "admin", project: "sample", milestoneId: 1 }, "/admin/sample/milestone/1"],
    ["view-milestone-editform", { owner: "admin", project: "sample", milestoneId: 2 }, "/admin/sample/milestone/2/editform"],
    ["view-new-milestone-form", { owner: "admin", project: "sample" }, "/admin/sample/newMilestoneForm"],
    ["list-posts", { owner: "admin", project: "sample" }, "/admin/sample/posts"],
    ["view-post-form", { owner: "admin", project: "sample" }, "/admin/sample/postform"],
    ["view-post", { owner: "admin", project: "sample", postNumber: 1 }, "/admin/sample/post/1"],
    ["view-post-editform", { owner: "admin", project: "sample", postNumber: 2 }, "/admin/sample/post/2/editform"],
    ["list-post-watchers", { owner: "admin", project: "sample", postNumber: 1 }, "/-_-api/v1/owners/admin/projects/sample/posts/1/watchers"],
    ["view-project-members", { owner: "admin", project: "sample" }, "/admin/sample/members"],
    ["view-project-watchers", { owner: "admin", project: "sample" }, "/admin/sample/watchers"],
    ["view-project-setting-form", { owner: "admin", project: "sample" }, "/admin/sample/settingform"],
    ["view-project-delete-form", { owner: "admin", project: "sample" }, "/admin/sample/deleteform"],
    ["view-project-transfer-form", { owner: "admin", project: "sample" }, "/admin/sample/transfer"],
    ["view-project-webhooks", { owner: "admin", project: "sample" }, "/admin/sample/webhooks"],
    ["view-project-statistics", { owner: "admin", project: "sample" }, "/admin/sample/statistics"],
    ["view-project-go-menu", { owner: "admin", project: "sample" }, "/admin/sample/go"],
    ["view-change-vcs-form", { owner: "admin", project: "sample" }, "/admin/sample/changeVCS"],
    ["fetch-mention-list", { owner: "admin", project: "sample" }, "/admin/sample/mentionList"],
    ["fetch-mention-list-commit-diff", { owner: "admin", project: "sample" }, "/admin/sample/mentionListAtCommitDiff"],
    ["fetch-mention-list-pull-request", { owner: "admin", project: "sample" }, "/admin/sample/mentionListAtPullRequest"],
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

test("distinct covered B-id count meets target (>= 30)", () => {
  const all = new Set(scenarios.flatMap((scenario) => matchBehaviors(scenario, inventory)));
  assert.ok(all.size >= 30, `distinct B-id coverage ${all.size} < 30: ${[...all].join(", ")}`);
});

test("all scenarios are read-only GET actions (no mutations)", () => {
  for (const scenario of scenarios) {
    for (const stepAction of scenario.actions.map((a) => a.action)) {
      if (stepAction === "login") continue;
      const def = MERGED_DEFINITIONS[stepAction];
      const probe = { action: stepAction, params: { owner: "o", project: "p", milestoneId: 1, postNumber: 1, categoryId: 1, query: "x" } };
      assert.equal(def.translateLegacy(probe, {}).method, "GET", `${stepAction} must be GET`);
    }
  }
});
