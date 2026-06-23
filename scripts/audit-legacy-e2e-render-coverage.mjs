import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const routeCoveragePath = resolve(repoRoot, ".agent/legacy-html-page-audit/route-coverage.json");
const frontendTests = resolve(repoRoot, "frontend/tests");
const outputPath = resolve(repoRoot, ".agent/legacy-html-page-audit/e2e-render-coverage.json");

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
    return `/$owner/$projectName${projectMatch.groups.suffix ?? ""}`;
  }

  return cleanPath;
}

const routeCoverage = JSON.parse(readFileSync(routeCoveragePath, "utf8"));
const e2eNavigations = new Map();

for (const fileName of readdirSync(frontendTests).filter((file) => file.endsWith(".e2e.ts"))) {
  const filePath = resolve(frontendTests, fileName);
  const source = readFileSync(filePath, "utf8");
  for (const match of source.matchAll(/page\.goto\(\s*(?:"([^"]+)"|'([^']+)'|`([^`$]+?)`)/gs)) {
    const url = match[1] ?? match[2] ?? match[3];
    const key = routeKey(url);
    const matches = e2eNavigations.get(key) ?? [];
    matches.push({
      file: filePath.replace(`${repoRoot}/`, ""),
      url,
    });
    e2eNavigations.set(key, matches);
  }
}

const entries = routeCoverage.entries.map((entry) => {
  const coverageKey = routeKey(entry.legacyPath);
  const matches = e2eNavigations.get(coverageKey) ?? [];
  return {
    legacyPath: entry.legacyPath,
    coverageKey,
    rustRoute: entry.rustRoute,
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
  entries,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (summary.missingRenderedE2eEvidence > 0) {
  process.exitCode = 1;
}
