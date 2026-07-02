import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { parseArgs, resolveRequiredRange } from "../scripts/check-scala-html-goal-automation.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const automationScriptPath = path.join(repoRoot, "scripts", "check-scala-html-goal-automation.mjs");

test("scala html goal automation exposes a repo script", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const source = readFileSync(automationScriptPath, "utf8");

  assert.equal(
    packageJson.scripts["agent:scala-html-goal-automation"],
    "node scripts/check-scala-html-goal-automation.mjs",
  );
  assert.match(source, /YONA_SCALA_HTML_GOAL_HISTORY_RANGE/u);
  assert.match(source, /\.agent\/scala-html-goal-history-range/u);
  assert.match(source, /audit-scala-html-goal-history\.mjs/u);
  assert.match(source, /--fail-on-violation/u);
  assert.match(source, /checked zero commits/u);
});

test("scala html goal automation requires an armed unattended range", () => {
  assert.throws(
    () =>
      resolveRequiredRange({
        env: {},
        rangeFile: path.join(repoRoot, "does-not-exist"),
      }),
    /not armed/u,
  );
});

test("scala html goal automation resolves explicit range before env and local memo", () => {
  assert.equal(
    resolveRequiredRange({
      env: { YONA_SCALA_HTML_GOAL_HISTORY_RANGE: "HEAD~10..HEAD" },
      range: "HEAD~1..HEAD",
      rangeFile: path.join(repoRoot, "does-not-exist"),
    }),
    "HEAD~1..HEAD",
  );
});

test("scala html goal automation resolves env range before local memo", () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "scala-html-goal-range-"));
  const rangeFile = path.join(tempDir, "range");
  writeFileSync(rangeFile, "HEAD~50..HEAD\n", "utf8");

  assert.equal(
    resolveRequiredRange({
      env: { YONA_SCALA_HTML_GOAL_HISTORY_RANGE: "HEAD~5..HEAD" },
      rangeFile,
    }),
    "HEAD~5..HEAD",
  );
});

test("scala html goal automation reads the ignored local memo range", () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "scala-html-goal-range-"));
  const rangeFile = path.join(tempDir, "range");
  writeFileSync(rangeFile, "# current unattended frontend goal\nHEAD~5..HEAD\n", "utf8");

  assert.equal(resolveRequiredRange({ env: {}, rangeFile }), "HEAD~5..HEAD");
});

test("scala html goal automation rejects non-range values", () => {
  assert.throws(
    () =>
      resolveRequiredRange({
        env: { YONA_SCALA_HTML_GOAL_HISTORY_RANGE: "HEAD" },
        rangeFile: path.join(repoRoot, "does-not-exist"),
      }),
    /must be a git revision range/u,
  );
});

test("scala html goal automation parses CLI options", () => {
  assert.deepEqual(parseArgs(["--", "--range", "HEAD~1..HEAD", "--skip-audit"]), {
    range: "HEAD~1..HEAD",
    rangeFile: ".agent/scala-html-goal-history-range",
    skipAudit: true,
  });
});
