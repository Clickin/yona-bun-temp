import { strict as assert } from "node:assert";
import test from "node:test";
import { parseArgs, selectScenarios } from "./run.mjs";

test("differential runner keeps all scenarios by default", () => {
  const options = parseArgs([]);
  const selected = selectScenarios(options.scenarioIds);
  assert.equal(options.scenarioIds.length, 0);
  assert.equal(selected.length, 117);
});

test("differential runner accepts repeated and comma-separated scenario IDs", () => {
  const options = parseArgs(["--scenario", "S1-login", "--scenarios", "I1-issue-detail,R1-pr-lists,P1-issue-labels"]);
  assert.deepEqual(options.scenarioIds, ["S1-login", "I1-issue-detail", "R1-pr-lists", "P1-issue-labels"]);
  assert.deepEqual(selectScenarios(options.scenarioIds).map(({ id }) => id), ["I1-issue-detail", "P1-issue-labels", "R1-pr-lists", "S1-login"]);
});

test("differential runner rejects unknown scenario IDs", () => {
  assert.throws(() => selectScenarios(["does-not-exist"]), /unknown scenario id/u);
});
