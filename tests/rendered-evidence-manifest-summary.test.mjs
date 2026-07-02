import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(
  repoRoot,
  "docs",
  "provenance",
  "ui-parity-reports",
  "2026-06-28-rendered-evidence-execution-manifest.md",
);

test("rendered evidence summary counts match manifest row statuses", () => {
  const source = readFileSync(manifestPath, "utf8");
  const summaryCounts = new Map();
  const primaryStatusCounts = new Map();
  const evidenceStatusCounts = new Map();
  let inSummary = false;

  for (const line of source.split("\n")) {
    if (line === "## Evidence Status Summary") {
      inSummary = true;
      continue;
    }
    if (inSummary && line.startsWith("## ")) {
      inSummary = false;
    }
    if (inSummary) {
      const match = /^\| ([a-z0-9-]+) \| (\d+) \|/.exec(line);
      if (match) {
        summaryCounts.set(match[1], Number(match[2]));
      }
      continue;
    }
    if (!line.startsWith("| P")) {
      continue;
    }
    const columns = line
      .split("|")
      .slice(1, -1)
      .map((column) => column.trim().replaceAll("`", ""));
    const primaryStatus = columns[3];
    const evidenceStatus = columns[4];
    primaryStatusCounts.set(primaryStatus, (primaryStatusCounts.get(primaryStatus) ?? 0) + 1);
    evidenceStatusCounts.set(evidenceStatus, (evidenceStatusCounts.get(evidenceStatus) ?? 0) + 1);
  }

  for (const status of ["targeted-absence-guard-passed", "non-browser-mail-template-recorded"]) {
    assert.equal(
      summaryCounts.get(status),
      primaryStatusCounts.get(status),
      `${status} count drifted`,
    );
  }
  assert.equal(
    summaryCounts.get("visual-layout-metric-guard-passed"),
    evidenceStatusCounts.get("visual-layout-metric-guard-passed"),
    "visual-layout-metric-guard-passed count drifted",
  );
});
