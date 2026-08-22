// Issues-domain scenario/action contract tests.
//
// Validates the issues module against the merged registry (index.mjs): shape,
// known actions, translator literals, and inventory coverage.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { validateScenarios, matchBehaviors } from "./dsl.mjs";
import { ACTION_DEFINITIONS, scenarios } from "./scenarios/index.mjs";
import * as issues from "./scenarios/issues.mjs";
import { translateLegacy, translateYoram } from "./adapters.mjs";
const inventory = JSON.parse(readFileSync(new URL("../../docs/provenance/behavior-inventory.json", import.meta.url), "utf8")).behaviors;
const knownActions = Object.keys(ACTION_DEFINITIONS);
const issuesScenarios = scenarios.filter((scenario) => issues.scenarios.some((own) => own.id === scenario.id));

test("every issues scenario passes validateScenarios against the merged registry", () => {
  const problems = validateScenarios(issuesScenarios, knownActions);
  assert.deepEqual(problems, []);
});

test("every action referenced by issues scenarios exists in ACTION_DEFINITIONS", () => {
  for (const scenario of issuesScenarios) {
    for (const step of scenario.actions) {
      assert.ok(
        ACTION_DEFINITIONS[step.action],
        `${scenario.id} references unknown action ${step.action}`,
      );
    }
  }
});

test("issues scenarios keep their ids namespaced to the domain", () => {
  for (const scenario of issues.scenarios) {
    assert.match(scenario.id, /^(I\d{1,2}|S[346])-/, `${scenario.id} must be I* or the pre-existing S3/S4/S6`);
  }
});

test("read-page actions translate to legacy-direct GET paths on both sides", () => {
  const step = (action, params) => ({ actor: "admin", action, params });
  const cases = [
    ["issue-detail", { owner: "admin", project: "sample", number: 1 }, "/admin/sample/issue/1"],
    ["issue-edit-form", { owner: "admin", project: "sample", number: 1 }, "/admin/sample/issue/1/editform"],
    ["issue-timeline", { owner: "admin", project: "sample", number: 1 }, "/admin/sample/issue/1/timeline"],
    ["issue-next-state", { owner: "admin", project: "sample", number: 1 }, "/admin/sample/issue/1/nextstate"],
    ["new-issue-form", { owner: "admin", project: "sample" }, "/admin/sample/issueform"],
    ["issue-labels", { owner: "admin", project: "sample" }, "/admin/sample/issue/labels"],
    ["issue-label-styles", { owner: "admin", project: "sample" }, "/admin/sample/issue/labels.css"],
    ["issue-labels-form", { owner: "admin", project: "sample" }, "/admin/sample/issue/labelsform"],
    ["org-issues", { organization: "weblabs", state: "open" }, "/weblabs/issues?state=open"],
    ["site-issue-list", {}, "/sites/issueList"],
  ];
  for (const [action, params, expected] of cases) {
    assert.deepEqual(translateLegacy(step(action, params)), { method: "GET", path: expected });
    assert.deepEqual(translateYoram(step(action, params)), { method: "GET", path: expected });
  }
});

test("list-issues encodes state/milestone/search filter params", () => {
  const step = { actor: "admin", action: "list-issues", params: { owner: "admin", project: "sample", state: "closed", milestoneId: 1 } };
  assert.equal(translateLegacy(step).path, "/admin/sample/issues?state=closed&milestoneId=1");
  const search = { actor: "admin", action: "list-issues", params: { owner: "admin", project: "sample", search: "parity" } };
  assert.equal(translateYoram(search).path, "/admin/sample/issues?search=parity");
});

test("issue-api-probe mirrors the legacy-compat path and issue-label-categories targets categories", () => {
  const probe = { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" } };
  assert.equal(translateLegacy(probe).method, "GET");
  assert.equal(translateLegacy(probe).path, "/-_-api/v1/owners/admin/projects/sample/issues/1");
  assert.equal(translateYoram(probe).path, "/-_-api/v1/owners/admin/projects/sample/issues/1");
  const categories = { actor: "admin", action: "issue-label-categories", params: { owner: "admin", project: "sample" } };
  assert.equal(translateYoram(categories).path, "/admin/sample/issue/label/categories");
});

test("pre-existing mutation actions keep their translation contracts", () => {
  assert.equal(
    translateLegacy({ actor: "a", action: "create-issue", params: { owner: "admin", project: "sample" } }, { title: "t", body: "b" }).path,
    "/admin/sample/issues/latest",
  );
  assert.equal(ACTION_DEFINITIONS["create-issue-comment"].translateLegacy({ params: { owner: "admin", project: "sample" } }, { issueNumber: 7 }).path, "/admin/sample/issue/7/comments");
});

test("matchBehaviors returns a non-empty B-id list for every issues scenario", () => {
  for (const scenario of issuesScenarios) {
    const ids = matchBehaviors(scenario, inventory);
    assert.ok(ids.length > 0, `${scenario.id} covers no inventory behavior`);
  }
});

test("issues domain covers its target set of distinct B-ids", () => {
  const union = [...new Set(issuesScenarios.flatMap((scenario) => matchBehaviors(scenario, inventory)))].sort();
  assert.deepEqual(union, [
    "B-0031",
    "B-0035",
    "B-0037",
    "B-0038",
    "B-0039",
    "B-0040",
    "B-0081",
    "B-0082",
    "B-0083",
    "B-0084",
    "B-0085",
    "B-0086",
    "B-0087",
    "B-0088",
    "B-0089",
    "B-0090",
    "B-0091",
    "B-0092",
    "B-0141",
    "B-0142",
    "B-0160",
    "B-0245",
    "B-0252",
  ]);
});
