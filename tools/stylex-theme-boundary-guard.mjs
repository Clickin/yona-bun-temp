import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const FORBIDDEN_GLOBAL_REGISTRY = /\bglobalColors\b/u;

const collectSourceFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });

export function evaluateStylexThemeBoundary({ sources }) {
  const violations = [];
  for (const [file, source] of sources) {
    if (FORBIDDEN_GLOBAL_REGISTRY.test(source)) {
      violations.push(
        `${file}: globalColors catch-all registry is forbidden; inline non-theme values and keep route paint in its ignored route theme`,
      );
    }
  }
  return { blocked: violations.length > 0, violations };
}

export function evaluateRepositoryStylexThemeBoundary(repoRoot) {
  const sourceRoot = join(repoRoot, "frontend", "src");
  return evaluateStylexThemeBoundary({
    sources: collectSourceFiles(sourceRoot).map((file) => [
      relative(repoRoot, file),
      readFileSync(file, "utf8"),
    ]),
  });
}

export function formatStylexThemeBoundarySummary(result) {
  if (!result.blocked) return "[stylex-theme-boundary] PASS globalColors registry absent";
  return [
    `[stylex-theme-boundary] FAIL ${result.violations.length} violation(s)`,
    ...result.violations.map((violation) => `  - ${violation}`),
  ].join("\n");
}
