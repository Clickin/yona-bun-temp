import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const legacyAuditPath = resolve(repoRoot, ".agent/legacy-html-page-audit/latest.json");
const frontendSrc = resolve(repoRoot, "frontend/src");
const outputPath = resolve(repoRoot, ".agent/legacy-html-page-audit/anchor-coverage.json");

if (!existsSync(legacyAuditPath)) {
  throw new Error(`missing legacy HTML audit output: ${legacyAuditPath}`);
}

function collectFrontendFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) {
      return collectFrontendFiles(path);
    }
    if (!entry.isFile() || !/\.(tsx?|css)$/.test(entry.name) || entry.name === "routeTree.gen.ts") {
      return [];
    }
    return [path];
  });
}

const legacyAudit = JSON.parse(readFileSync(legacyAuditPath, "utf8"));
const frontendFiles = collectFrontendFiles(frontendSrc).map((path) => ({
  path: path.replace(`${repoRoot}/`, ""),
  source: readFileSync(path, "utf8"),
}));

const entries = legacyAudit.results.map((result) => {
  const anchors = result.checkedAnchors ?? [];
  const anchorEvidence = anchors.map((anchor) => {
    const matches = frontendFiles
      .filter((file) => file.source.includes(anchor))
      .map((file) => file.path);
    return {
      anchor,
      matchedFileCount: matches.length,
      matchedFiles: matches,
    };
  });
  return {
    legacyPath: result.path,
    legacyStatus: result.status,
    expectedLegacyNonOk: result.expectedNonOk,
    checkedAnchors: anchors,
    anchorsWithEvidence: anchorEvidence.filter((entry) => entry.matchedFileCount > 0).length,
    missingAnchors: anchorEvidence
      .filter((entry) => entry.matchedFileCount === 0)
      .map((entry) => entry.anchor),
    anchorEvidence,
  };
});

const summary = {
  checkedAt: new Date().toISOString(),
  legacyAuditCheckedAt: legacyAudit.checkedAt,
  totalPages: entries.length,
  totalAnchors: entries.reduce((sum, entry) => sum + entry.checkedAnchors.length, 0),
  missingAnchorEvidence: entries.reduce((sum, entry) => sum + entry.missingAnchors.length, 0),
  entries,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (summary.missingAnchorEvidence > 0) {
  process.exitCode = 1;
}
