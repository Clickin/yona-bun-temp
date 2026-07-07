import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const routeCoveragePath = resolve(repoRoot, ".agent/legacy-html-page-audit/route-coverage.json");
const frontendSrc = resolve(repoRoot, "frontend/src");
const outputPath = resolve(repoRoot, ".agent/legacy-html-page-audit/parity-spec-coverage.json");

if (!existsSync(routeCoveragePath)) {
  throw new Error(`missing route coverage output: ${routeCoveragePath}`);
}

function collectSpecFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) {
      return collectSpecFiles(path);
    }
    return entry.isFile() && entry.name.endsWith(".spec.tsx") ? [path] : [];
  });
}

function routeEvidenceNeedles(route) {
  const normalized = route.replace(/\/$/, "") || "/";
  if (normalized === "/") {
    return ["fullPath: '/'", 'fullPath: "/"', "renderHome("];
  }
  const needles = new Set([`fullPath: '${normalized}'`, `fullPath: "${normalized}"`, normalized]);
  if (normalized.startsWith("/sites/")) {
    needles.add("SiteAdmin");
    needles.add("site-admin");
  }
  if (
    normalized.startsWith("/$ownerName/$projectName") ||
    normalized.startsWith("/$owner/$projectName")
  ) {
    needles.add("project-header-outer");
    needles.add("project-menu-outer");
  }
  return [...needles];
}

const coverage = JSON.parse(readFileSync(routeCoveragePath, "utf8"));
const specFiles = collectSpecFiles(frontendSrc).map((path) => ({
  path,
  source: readFileSync(path, "utf8"),
}));

const entries = coverage.entries.map((entry) => {
  const needles = routeEvidenceNeedles(entry.rustRoute);
  const matches = specFiles
    .filter((file) => needles.some((needle) => file.source.includes(needle)))
    .map((file) => file.path.replace(`${repoRoot}/`, ""));
  return {
    legacyPath: entry.legacyPath,
    rustRoute: entry.rustRoute,
    matchedSpecCount: matches.length,
    matchedSpecs: matches,
  };
});

const summary = {
  checkedAt: new Date().toISOString(),
  routeCoverageCheckedAt: coverage.checkedAt,
  total: entries.length,
  withSpecEvidence: entries.filter((entry) => entry.matchedSpecCount > 0).length,
  missingSpecEvidence: entries.filter((entry) => entry.matchedSpecCount === 0).length,
  entries,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (summary.missingSpecEvidence > 0) {
  process.exitCode = 1;
}
