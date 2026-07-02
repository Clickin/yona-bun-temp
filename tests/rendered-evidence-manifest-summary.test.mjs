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
  const prioritySummaryCounts = new Map();
  const primaryStatusCounts = new Map();
  const evidenceStatusCounts = new Map();
  const visualMetricClosureStatuses = new Set([
    "visual-layout-metric-guard-passed",
    "targeted-absence-guard-passed",
    "legacy-placeholder-deviation-recorded",
    "no-active-play-caller",
    "targeted-selector-and-inert-template-metric-guard-passed",
    "non-browser-mail-template-recorded",
  ]);
  let inSummary = false;
  let inPrioritySummary = false;
  let manifestDetailRows;
  let detailRows = 0;
  let visualLayoutMetricsNeeded = 0;

  for (const line of source.split("\n")) {
    const manifestDetailRowsMatch = /^Manifest detail rows: (\d+)$/.exec(line);
    if (manifestDetailRowsMatch) {
      manifestDetailRows = Number(manifestDetailRowsMatch[1]);
      continue;
    }
    if (line.startsWith("## ")) {
      inSummary = false;
      inPrioritySummary = false;
    }
    if (line === "## Evidence Status Summary") {
      inSummary = true;
      continue;
    }
    if (line === "## Priority Coverage Summary") {
      inPrioritySummary = true;
      continue;
    }
    if (inSummary) {
      const match = /^\| ([a-z0-9-]+) \| (\d+) \|/.exec(line);
      if (match) {
        summaryCounts.set(match[1], Number(match[2]));
      }
      continue;
    }
    if (inPrioritySummary) {
      const match = /^\| (P[0-9](?:\/P[0-9])?) \| (\d+) \|/.exec(line);
      if (match) {
        prioritySummaryCounts.set(match[1], Number(match[2]));
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
    if (columns.length < 8) {
      continue;
    }
    const priority = columns[0];
    const primaryStatus = columns[3];
    const evidenceStatus = columns[4];
    detailRows += 1;
    prioritySummaryCounts.set(
      `__actual:${priority}`,
      (prioritySummaryCounts.get(`__actual:${priority}`) ?? 0) + 1,
    );
    primaryStatusCounts.set(primaryStatus, (primaryStatusCounts.get(primaryStatus) ?? 0) + 1);
    evidenceStatusCounts.set(evidenceStatus, (evidenceStatusCounts.get(evidenceStatus) ?? 0) + 1);
    if (!visualMetricClosureStatuses.has(evidenceStatus)) {
      visualLayoutMetricsNeeded += 1;
    }
  }

  assert.equal(manifestDetailRows, detailRows, "manifest detail row count drifted");
  for (const status of [
    "targeted-absence-guard-passed",
    "intentional-deviation-recorded",
    "non-browser-mail-template-recorded",
  ]) {
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
  assert.equal(
    summaryCounts.get("visual-layout-metrics-needed"),
    visualLayoutMetricsNeeded,
    "visual-layout-metrics-needed count drifted",
  );
  for (const priority of ["P0", "P1", "P2/P3"]) {
    assert.equal(
      prioritySummaryCounts.get(priority),
      prioritySummaryCounts.get(`__actual:${priority}`),
      `${priority} count drifted`,
    );
  }
});
