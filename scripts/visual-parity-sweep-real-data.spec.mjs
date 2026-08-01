import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sweepSource = readFileSync(resolve("scripts/visual-parity-sweep.mjs"), "utf8");

test("real-data mode cannot fall back to fixture credentials or bootstrap writes", () => {
  assert.match(sweepSource, /const realDataMode = process\.env\.YORAM_SWEEP_REAL_DATA === "1"/u);
  assert.match(sweepSource, /\(realDataMode \? "" : "admin"\)/u);
  assert.match(sweepSource, /if \(realDataMode\) \{[\s\S]*?return signInLocalAccount/u);
  assert.match(sweepSource, /realDataMode \|\|/u);
  assert.match(sweepSource, /realDataMode[\s\S]*?discoveredRealDataPages/u);
});

test("real-data artifacts use a caller-owned output directory and redact text-bearing fields", () => {
  assert.match(sweepSource, /YORAM_SWEEP_OUTPUT_DIR/u);
  assert.match(sweepSource, /sanitizeTargetForArtifact/u);
  assert.match(sweepSource, /\["title", "text", "chromeText", "chromeAttributes"\]/u);
  assert.match(sweepSource, /writeFileSync\(resolve\(outputDir, "write-ledger\.json"\)/u);
});

test("write parity refuses to proceed without a verified restore input", () => {
  assert.match(sweepSource, /REAL_DUMP_PATH/u);
  assert.match(sweepSource, /RESTORE_REQUIRED/u);
  assert.match(sweepSource, /requestShape: null/u);
  assert.match(sweepSource, /checkpointBefore: null/u);
});
