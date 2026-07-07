import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { normalizeLegacyAuditPath } from "./legacy-route-coverage.mjs";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const legacyAuditPath = resolve(repoRoot, ".agent/legacy-html-page-audit/latest.json");
const routeTreePath = resolve(repoRoot, "frontend/src/routeTree.gen.ts");
const outputPath = resolve(repoRoot, ".agent/legacy-html-page-audit/route-coverage.json");

if (!existsSync(legacyAuditPath)) {
  throw new Error(`missing legacy HTML audit output: ${legacyAuditPath}`);
}

const legacyAudit = JSON.parse(readFileSync(legacyAuditPath, "utf8"));
if (!Array.isArray(legacyAudit.results)) {
  const summary = {
    checkedAt: new Date().toISOString(),
    legacyAuditCheckedAt: legacyAudit.checkedAt,
    status: "legacy-audit-unavailable",
    error: legacyAudit.error ?? "legacy audit has no results array",
    total: 0,
    routed: 0,
    missing: 0,
    entries: [],
  };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(1);
}
const routeTree = readFileSync(routeTreePath, "utf8");
const rustRoutes = new Set(
  [...routeTree.matchAll(/fullPath: '([^']+)'/g)].map(
    (match) => match[1].replace(/\/$/, "") || "/",
  ),
);
const covered = legacyAudit.results.map((result) => {
  const rustRoute = normalizeLegacyAuditPath(result.path, rustRoutes);
  return {
    legacyPath: result.path,
    legacyStatus: result.status,
    expectedLegacyNonOk: result.expectedNonOk,
    rustRoute,
    rustRouteExists: rustRoutes.has(rustRoute),
  };
});

const summary = {
  checkedAt: new Date().toISOString(),
  legacyAuditCheckedAt: legacyAudit.checkedAt,
  total: covered.length,
  routed: covered.filter((entry) => entry.rustRouteExists).length,
  missing: covered.filter((entry) => !entry.rustRouteExists).length,
  entries: covered,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (summary.missing > 0) {
  process.exitCode = 1;
}
