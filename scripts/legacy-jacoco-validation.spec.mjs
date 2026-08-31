import { strict as assert } from "node:assert";
import test from "node:test";
import { FIVE_CONTROLLER_TARGETS, evaluateFiveControllerGate } from "./legacy-jacoco-validation.mjs";

function evidence() {
  return {
    methods: FIVE_CONTROLLER_TARGETS.map((target) => ({
      class: target.className,
      method: target.method,
      status: "FULLY_COVERED",
      instructionCovered: 1,
      instructionMissed: 0,
    })),
    classes: FIVE_CONTROLLER_TARGETS.map((target) => ({ name: target.className, methods: { covered: 1, missed: 0 } })),
    exec: FIVE_CONTROLLER_TARGETS.map((target, index) => ({ name: target.className, id: `${index}a`, methods: 0 })),
    distribution: FIVE_CONTROLLER_TARGETS.map((target, index) => ({ name: target.className, id: `${index}a`, methods: 0 })),
    runtimeDump: FIVE_CONTROLLER_TARGETS.map((target, index) => ({ name: target.className, id: `${index}a`, methods: 0 })),
  };
}

function requests(status = 200) {
  return new Map(FIVE_CONTROLLER_TARGETS.map((target) => [target.controller, {
    url: `http://127.0.0.1${target.requestPath}`,
    status,
    ok: true,
  }]));
}

test("five-controller gate only allows a complete covered identity set", () => {
  const result = evaluateFiveControllerGate({ ...evidence(), requests: requests() });
  assert.equal(result.allPassed, true);
  assert.equal(result.fullSweepAllowed, true);
  assert.equal(result.controllers.length, 5);
  assert.deepEqual(result.controllers.map((row) => row.blockedReason), [null, null, null, null, null]);
});

test("a missing covered method blocks the full sweep", () => {
  const input = evidence();
  input.methods = input.methods.filter((method) => method.method !== "issues");
  const result = evaluateFiveControllerGate({ ...input, requests: requests() });
  const issue = result.controllers.find((row) => row.controller === "IssueApp");
  assert.equal(result.allPassed, false);
  assert.equal(result.fullSweepAllowed, false);
  assert.match(issue.blockedReason, /METHOD_METADATA_MISSING/u);
});

test("identity mismatches are recorded per controller and block the gate", () => {
  const input = evidence();
  input.runtimeDump[4] = { ...input.runtimeDump[4], id: "different" };
  const result = evaluateFiveControllerGate({ ...input, requests: requests() });
  const pullRequest = result.controllers.find((row) => row.controller === "PullRequestApp");
  assert.equal(result.fullSweepAllowed, false);
  assert.equal(pullRequest.identityResult, "IDENTITY_MISMATCH");
  assert.match(pullRequest.blockedReason, /IDENTITY_MISMATCH/u);
});
