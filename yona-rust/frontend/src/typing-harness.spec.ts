import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function collectSourceFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "gen") {
        continue;
      }
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      if (entry.name === "routeTree.gen.ts" || entry.name === "typing-harness.spec.ts") {
        continue;
      }
      files.push(fullPath);
    }
  }

  return files;
}

describe("frontend typing and routing harness", () => {
  it("forbids any usage in frontend TypeScript sources outside generated code", () => {
    const sourceRoot = path.resolve(__dirname);
    const files = collectSourceFiles(sourceRoot);
    const anyMatches: string[] = [];

    for (const file of files) {
      const contents = fs.readFileSync(file, "utf8");
      const lines = contents.split(/\r?\n/u);

      lines.forEach((line, index) => {
        if (/\bas any\b|:\s*any\b|<\s*any\s*>|Array<any>|ReadonlyArray<any>|Promise<any>/.test(line)) {
          anyMatches.push(`${path.relative(sourceRoot, file)}:${index + 1}:${line.trim()}`);
        }
      });
    }

    expect(anyMatches).toEqual([]);
  });

  it("forbids static route tables and route-switch compatibility wrappers", () => {
    const sourceRoot = path.resolve(__dirname);
    const files = collectSourceFiles(sourceRoot);
    const violations: string[] = [];
    const forbiddenFile = path.join(sourceRoot, "route-table.ts");

    expect(fs.existsSync(forbiddenFile)).toBe(false);

    for (const file of files) {
      const contents = fs.readFileSync(file, "utf8");
      const lines = contents.split(/\r?\n/u);

      lines.forEach((line, index) => {
        if (
          /from ["']\.\/route-table["']|from ["'].*route-table["']/.test(line) ||
          /\bSTATIC_ROUTES\b|\bRouteKey\b|\bRoutePath\b|\bresolveCurrentPath\b|\brouteDocumentTitle\b|\bAppRoute\b|\bAuthWorkspaceShell\b/.test(line) ||
          /\bprops\.route\.kind\b|\bswitch\s*\(\s*props\.route\.kind\s*\)/.test(line)
        ) {
          violations.push(`${path.relative(sourceRoot, file)}:${index + 1}:${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
