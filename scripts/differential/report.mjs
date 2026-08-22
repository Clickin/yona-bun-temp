// Violation report assembly + human-readable stdout summary.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// A violation is {route, behaviorId?, kind: "api"|"dom"|"db"|"browser",
// expected, actual, classification}. classification: "infra" | "known-gap" |
// "needs-review".
export function classify(kind, detail) {
  if (kind === "api" || kind === "dom") {
    // Yoram serves the SPA shell over plain HTML; skeleton drift rooted in
    // React-owned markup is tracked by the WTR lanes and is not a sweep gap.
    const text = JSON.stringify(detail);
    if (/yona-root|__YONA_RUNTIME_CONFIG__|react-root/iu.test(text)) return "known-gap";
  }
  return "needs-review";
}

export function violation({ route, behaviorId = null, kind, expected, actual }) {
  return { route, behaviorId, kind, expected, actual, classification: classify(kind, { expected, actual }) };
}

export function writeReport(report, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, "report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

export function formatSummary(report) {
  const lines = [];
  lines.push(`differential sweep ${report.runId}`);
  lines.push(`  scenarios: ${report.scenarios.length}, behaviors covered: ${report.behaviorsCovered.length}`);
  for (const scenario of report.scenarios) {
    lines.push(`  [${scenario.id}] ${scenario.title} -> ${scenario.behaviorIds.join(", ") || "(no inventory match)"}`);
    for (const entry of scenario.violations) {
      lines.push(
        `    ${entry.kind.toUpperCase()} violation @ ${entry.route}` +
          ` (${entry.classification})${entry.behaviorId ? ` [${entry.behaviorId}]` : ""}`,
      );
      lines.push(`      expected: ${JSON.stringify(entry.expected).slice(0, 300)}`);
      lines.push(`      actual:   ${JSON.stringify(entry.actual).slice(0, 300)}`);
    }
  }
  const counts = { api: 0, dom: 0, db: 0, browser: 0 };
  let infra = 0;
  for (const scenario of report.scenarios) {
    for (const entry of scenario.violations) {
      if (entry.classification === "infra") {
        infra += 1;
      } else {
        counts[entry.kind] += 1;
      }
    }
  }
  lines.push(`  violations: api=${counts.api} dom=${counts.dom} db=${counts.db} browser=${counts.browser} infra=${infra}`);
  lines.push(`  db projections compared after teardown: ${report.dbProjection ? "yes" : "no"}`);
  return lines.join("\n");
}
