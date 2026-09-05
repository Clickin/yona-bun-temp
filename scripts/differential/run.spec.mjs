import { strict as assert } from "node:assert";
import test from "node:test";
import {
  executeStep,
  parseArgs,
  selectScenarios,
  PARITY_PULL_REQUEST,
  PARITY_REVIEW,
  registrationStatusIsUsable,
  SKELETON_EXTRACT,
} from "./run.mjs";
import { HarnessError, summarizeExecution } from "./report.mjs";
import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";

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

test("parity PR fixture preserves run-dev seed contract and stable review seed", () => {
  assert.deepEqual(PARITY_PULL_REQUEST, {
    body: "",
    // R13's create-pullrequest opens main -> feature/ui (the direction the
    // restore/accept lifecycle scenarios and the deterministic seed use).
    fromBranch: "main",
    number: 1,
    state: 1,
    title: "Add feature branch change",
    toBranch: "feature/ui",
  });
  assert.deepEqual(PARITY_REVIEW, {
    contents: "Review the feature branch parity fixture.",
    path: "parity-feature.txt",
  });
});

test("SKELETON_EXTRACT stays in sync with the sanctioned side-effect anchor marker", () => {
  // The browser-side extract inlines the sideEffectAnchorTag decision (it is
  // serialized into the page, so it cannot import diff.mjs). These guards fail
  // if the inlined copy is dropped or its marker/behavior attributes drift.
  const source = SKELETON_EXTRACT.toString();
  assert.match(source, /a#/u);
  assert.match(source, /data-request-method/u);
  assert.match(source, /data-request-uri/u);
  assert.match(source, /data-toggle/u);
  assert.match(source, /javascript:/u);
});

test("fresh parity account bootstrap reuses an existing account on duplicate registration", () => {
  assert.equal(registrationStatusIsUsable(200), true);
  assert.equal(registrationStatusIsUsable(409), true);
  assert.equal(registrationStatusIsUsable(422), false);
  assert.equal(registrationStatusIsUsable(500), false);
});

function stepContext(action, entry = { behaviorIds: [], violations: [], errors: [] }) {
  return { step: { action }, entry };
}

test("executeStep records a successful action as EXECUTED", async () => {
  const action = "__contract_success__";
  ACTION_DEFINITIONS[action] = { handler: async () => {} };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [] };
    await executeStep(stepContext(action, entry));
    assert.deepEqual(entry.stepResults, [{ action, status: "EXECUTED", error: null }]);
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("executeStep records a dependent HarnessError action as SKIPPED", async () => {
  const action = "__contract_skip__";
  ACTION_DEFINITIONS[action] = { handler: async () => { throw new HarnessError("missing entity"); } };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [], harnessNoted: true };
    await executeStep(stepContext(action, entry));
    assert.equal(entry.stepResults[0].status, "SKIPPED");
    assert.equal(entry.stepResults[0].error, "missing entity");
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("executeStep records thrown action errors as FAILED", async () => {
  const action = "__contract_failure__";
  ACTION_DEFINITIONS[action] = { handler: async () => { throw new Error("boom"); } };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [] };
    await executeStep(stepContext(action, entry));
    assert.deepEqual(entry.stepResults, [{ action, status: "FAILED", error: "boom" }]);
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("executeStep records handler-added step errors as FAILED", async () => {
  const action = "__contract_recorded_error__";
  ACTION_DEFINITIONS[action] = { handler: async ({ entry }) => { entry.errors.push("HTTP 500"); } };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [] };
    await executeStep(stepContext(action, entry));
    assert.deepEqual(entry.stepResults, [{ action, status: "FAILED", error: "HTTP 500" }]);
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("summarizeExecution separates global infrastructure errors from step errors", () => {
  const summary = summarizeExecution({
    infraErrors: ["yoram boot failed"],
    scenarios: [
      { stepResults: [{ status: "EXECUTED" }] },
      { stepResults: [{ status: "SKIPPED" }, { status: "FAILED" }] },
    ],
  }, 3);
  assert.deepEqual(summary, {
    registeredScenarios: 3,
    attemptedScenarios: 2,
    globalInfraErrors: ["yoram boot failed"],
    scenariosWithStepErrors: 1,
    scenariosWithoutStepErrors: 1,
    totalStepErrors: 2,
  });
});
