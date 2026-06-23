import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const legacyAuditPath = resolve(repoRoot, ".agent/legacy-html-page-audit/latest.json");
const routeCoveragePath = resolve(repoRoot, ".agent/legacy-html-page-audit/route-coverage.json");
const frontendTests = resolve(repoRoot, "frontend/tests");
const outputPath = resolve(repoRoot, ".agent/legacy-html-page-audit/e2e-render-coverage.json");

if (!existsSync(legacyAuditPath)) {
  throw new Error(`missing legacy HTML audit output: ${legacyAuditPath}`);
}

if (!existsSync(routeCoveragePath)) {
  throw new Error(`missing route coverage output: ${routeCoveragePath}`);
}

function routeKey(input) {
  const cleanPath =
    input
      .replace(/^https?:\/\/[^/]+/, "")
      .replace(/^\/yona(?=\/|$)/, "")
      .split(/[?#]/)[0]
      .replace(/\/$/, "") || "/";

  const projectMatch = cleanPath.match(/^\/[^/]+\/[^/]+(?<suffix>\/.*)?$/);
  if (
    projectMatch &&
    !cleanPath.startsWith("/user/") &&
    !cleanPath.startsWith("/users/") &&
    !cleanPath.startsWith("/sites/") &&
    !cleanPath.startsWith("/organizations/")
  ) {
    let suffix = projectMatch.groups.suffix ?? "";
    suffix = suffix.replace(/^\/issue\/\d+$/, "/issue/$issueNumber");
    return `/$owner/$projectName${suffix}`;
  }

  return cleanPath;
}

const legacyAudit = JSON.parse(readFileSync(legacyAuditPath, "utf8"));
const routeCoverage = JSON.parse(readFileSync(routeCoveragePath, "utf8"));
const e2eNavigations = new Map();
const e2eSources = new Map();
const legacySignals = new Map(
  legacyAudit.results.map((result) => [
    result.path,
    [...new Set([...(result.checkedAnchors ?? []), ...(result.checkedStructuralTokens ?? [])])],
  ]),
);

for (const fileName of readdirSync(frontendTests).filter((file) => file.endsWith(".e2e.ts"))) {
  const filePath = resolve(frontendTests, fileName);
  const relativeFile = filePath.replace(`${repoRoot}/`, "");
  const source = readFileSync(filePath, "utf8");
  e2eSources.set(relativeFile, source);
  for (const match of source.matchAll(/page\.goto\(\s*(?:"([^"]+)"|'([^']+)'|`([^`$]+?)`)/gs)) {
    const url = match[1] ?? match[2] ?? match[3];
    const key = routeKey(url);
    const matches = e2eNavigations.get(key) ?? [];
    matches.push({
      file: relativeFile,
      url,
    });
    e2eNavigations.set(key, matches);
  }
}

const entries = routeCoverage.entries.map((entry) => {
  const coverageKey = routeKey(entry.legacyPath);
  const matches = e2eNavigations.get(coverageKey) ?? [];
  const expectedSignals = legacySignals.get(entry.legacyPath) ?? [];
  const missingSignals = expectedSignals.filter(
    (signal) => !matches.some((match) => e2eSources.get(match.file)?.includes(signal)),
  );
  return {
    legacyPath: entry.legacyPath,
    coverageKey,
    rustRoute: entry.rustRoute,
    expectedSignals,
    missingSignals,
    matchedE2eCount: matches.length,
    matchedE2eNavigations: matches,
  };
});

const summary = {
  checkedAt: new Date().toISOString(),
  routeCoverageCheckedAt: routeCoverage.checkedAt,
  total: entries.length,
  withRenderedE2eEvidence: entries.filter((entry) => entry.matchedE2eCount > 0).length,
  missingRenderedE2eEvidence: entries.filter((entry) => entry.matchedE2eCount === 0).length,
  withRenderedLegacySignalEvidence: entries.filter((entry) => entry.missingSignals.length === 0)
    .length,
  missingRenderedLegacySignalEvidence: entries.filter((entry) => entry.missingSignals.length > 0)
    .length,
  entries,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (summary.missingRenderedE2eEvidence > 0 || summary.missingRenderedLegacySignalEvidence > 0) {
  process.exitCode = 1;
}
