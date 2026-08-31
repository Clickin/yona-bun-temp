import { strict as assert } from "node:assert";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runNode, writeBlockedSweepArtifacts } from "./legacy-jacoco-full-sweep-v2.mjs";

test("full sweep runner enforces a timeout and preserves the command", () => {
  assert.throws(
    () => runNode(["-e", "setTimeout(() => {}, 1000)"], process.env, 10),
    (error) => {
      assert.equal(error.code, "ETIMEDOUT");
      assert.deepEqual(error.sweepCommand, [process.execPath, "-e", "setTimeout(() => {}, 1000)"]);
      return true;
    },
  );
});

test("full sweep failure materializes blocked accounting and empty queues", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "legacy-jacoco-sweep-v2-"));
  try {
    const result = writeBlockedSweepArtifacts(outputDir, {
      reason: "FULL_SWEEP_DIFFERENTIAL_FAILED",
      command: [process.execPath, "scripts/differential/run.mjs"],
      error: Object.assign(new Error("runner timed out"), { code: "ETIMEDOUT", status: null }),
      validation: { allPassed: true, fullSweepAllowed: true },
    });
    assert.equal(result.status, "BLOCKED");
    const summary = JSON.parse(readFileSync(join(outputDir, "summary.json"), "utf8"));
    assert.equal(summary.attemptedScenarios, null);
    assert.equal(summary.fullSweepCompleted, false);
    assert.equal(summary.coverageEvidenceStatus, "BLOCKED");
    assert.deepEqual(summary.discoveryQueue, { P0: 0, P1: 0, P2: 0, P3: 0 });
    const queue = JSON.parse(readFileSync(join(outputDir, "discovery-queue.json"), "utf8"));
    assert.equal(queue.status, "BLOCKED");
    assert.deepEqual(queue.priorities, { P0: [], P1: [], P2: [], P3: [] });
    const failure = JSON.parse(readFileSync(join(outputDir, "failure.json"), "utf8"));
    assert.equal(failure.error.message, "runner timed out");
    assert.deepEqual(failure.command, [process.execPath, "scripts/differential/run.mjs"]);
  } finally {
    rmSync(outputDir, { force: true, recursive: true });
  }
});
