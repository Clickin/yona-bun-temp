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

test("issue-api-probe keeps the legacy-compat path on legacy and maps to RESTful on yoram", () => {
  const probe = { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" } };
  assert.equal(translateLegacy(probe).method, "GET");
  assert.equal(translateLegacy(probe).path, "/-_-api/v1/owners/admin/projects/sample/issues/1");
  assert.equal(translateYoram(probe).path, "/api/v1/owners/admin/projects/sample/issues/1");
  const assignable = { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1/assignableUsers" } };
  assert.equal(translateYoram(assignable).path, "/api/v1/owners/admin/projects/sample/issues/1/assignable-users/find");
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
    "B-0005",
    "B-0006",
    "B-0007",
    "B-0014",
    "B-0015",
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
    "B-0124",
    "B-0129",
    "B-0130",
    "B-0131",
    "B-0141",
    "B-0142",
    "B-0160",
    "B-0171",
    "B-0194",
    "B-0195",
    "B-0197",
    "B-0201",
    "B-0205",
    "B-0206",
    "B-0207",
    "B-0208",
    "B-0209",
    "B-0210",
    "B-0211",
    "B-0212",
    "B-0213",
    "B-0214",
    "B-0241",
    "B-0242",
    "B-0243",
    "B-0244",
    "B-0245",
    "B-0246",
    "B-0247",
    "B-0248",
    "B-0249",
    "B-0250",
    "B-0251",
    "B-0252",
    "B-0276",
    "B-0297",
    "B-0307",
    "B-0308",
    "B-0309",
    "B-0311",
    "B-0312",
]);
});
// B-ids reachable before the mutation wave (read-only era union).
const PRE_MUTATION_COVERAGE = [
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
];

test("mutation scenarios add at least 40 new distinct B-ids over the read-only baseline", () => {
  const union = new Set(issuesScenarios.flatMap((scenario) => matchBehaviors(scenario, inventory)));
  const fresh = [...union].filter((id) => !PRE_MUTATION_COVERAGE.includes(id)).sort();
  assert.ok(fresh.length >= 40, `expected >=40 new distinct B-ids, got ${fresh.length}: ${fresh.join(",")}`);
});

test("mutation actions translate to the legacy form route vs the Yoram REST route", () => {
  const step = (action, params) => ({ actor: "admin", action, params });
  const vars = { title: "t", body: "b", issueNumber: 7, commentId: 9, issuePk: 42, labelId: 5, categoryId: 6, labelName: "L", categoryName: "C" };

  // edit-issue: legacy form POST edit route vs Yoram compat PUT issue.
  assert.deepEqual(
    translateLegacy(step("edit-issue", { owner: "admin", project: "sample" }), vars),
    { method: "POST", path: "/admin/sample/issue/7/edit", form: { title: "t", body: "b", assigneeLoginId: "" } },
  );
  assert.deepEqual(
    translateYoram(step("edit-issue", { owner: "admin", project: "sample" }), vars),
    { method: "PUT", path: "/api/v1/owners/admin/projects/sample/issues/7", json: { title: "t", body: "b" } },
  );

  // delete-issue: legacy direct DELETE route vs Yoram SPA REST DELETE.
  assert.equal(translateLegacy(step("delete-issue", { owner: "admin", project: "sample" }), vars).path, "/admin/sample/issue/7/delete");
  assert.equal(translateYoram(step("delete-issue", { owner: "admin", project: "sample" }), vars).path, "/api/v1/projects/admin/sample/issues/7");

  // comment mutations chain the captured comment id on both sides.
  assert.equal(
    translateLegacy(step("edit-comment", { owner: "admin", project: "sample" }), vars).path,
    "/admin/sample/issue/7/comments/9",
  );
  assert.equal(
    translateYoram(step("delete-comment-compat", { owner: "admin", project: "sample" }), vars).path,
    "/comments/issue/9",
  );

  // watch/favorite key on the resolved DB pk.
  assert.equal(
    translateLegacy(step("watch-issue", { owner: "admin", project: "sample" }), vars).path,
    "/watch?resource.type=issue_post&resource.id=42",
  );
  assert.equal(
    translateYoram(step("toggle-favorite-issue", { owner: "admin", project: "sample" }), vars).path,
    "/api/v1/user/favorites/issues/42",
  );

  // label CRUD: legacy form routes on both sides, attach via compat API.
  assert.deepEqual(
    translateLegacy(step("create-issue-label", { owner: "admin", project: "sample" }), { labelName: "L", categoryName: "C" }),
    { method: "POST", path: "/admin/sample/issue/labels", form: { labelName: "L", categoryName: "C", labelColor: "#123456" } },
  );
  assert.equal(
    translateLegacy(step("attach-issue-labels", { owner: "admin", project: "sample" }), vars).path,
    "/-_-api/v1/owners/admin/projects/sample/issuelabel/7",
  );
  assert.equal(
    translateLegacy(step("delete-issue-label", { owner: "admin", project: "sample" }), vars).path,
    "/admin/sample/issue/label/5/delete",
  );
  assert.equal(
    translateYoram(step("delete-label-category", { owner: "admin", project: "sample" }), vars).method,
    "DELETE",
  );

  // migration exports + markdown probe keep identical paths on both sides.
  for (const [action, path] of [
    ["migration-export-issues", "/migration/admin/projects/sample/issues"],
    ["migration-export-labels", "/migration/admin/projects/sample/labels"],
    ["migration-export-issuelabel-pairs", "/migration/admin/projects/sample/issuelabel"],
    ["render-markdown", "/markdown/admin/sample"],
  ]) {
    assert.equal(translateLegacy(step(action, { owner: "admin", project: "sample" }), vars).path, path);
    assert.equal(translateYoram(step(action, { owner: "admin", project: "sample" }), vars).path, path);
  }
  assert.deepEqual(translateLegacy(step("global-labels", {})), { method: "GET", path: "/labels" });
});
