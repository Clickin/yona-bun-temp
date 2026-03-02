import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
  ".svelte",
]);
const IGNORED_DIR_NAMES = new Set([
  ".git",
  ".svelte-kit",
  "node_modules",
  "build",
  "dist",
  "coverage",
  "yona-original",
]);

const IMPORT_FROM_REGEX = /(?:import|export)\s+(?:type\s+)?[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT_REGEX = /import\s+['"]([^'"]+)['"]/g;

interface Violation {
  file: string;
  importPath: string;
  reason: string;
}

const ALLOWED_EXCEPTIONS = new Set([
  "apps/web/src/lib/server/hono/auth-app.ts",
  "packages/api/src/auth/auth-app.ts",
]);

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (IGNORED_DIR_NAMES.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];

  for (const regex of [IMPORT_FROM_REGEX, SIDE_EFFECT_IMPORT_REGEX]) {
    regex.lastIndex = 0;
    let match = regex.exec(content);
    while (match) {
      imports.push(match[1]);
      match = regex.exec(content);
    }
  }

  return imports;
}

function isException(file: string): boolean {
  return ALLOWED_EXCEPTIONS.has(file);
}

function validateImport(file: string, importPath: string): string | null {
  if (/^(\.\.\/){3,}/.test(importPath)) {
    return "Deep relative import is forbidden; use project aliases.";
  }

  if (
    importPath.startsWith("@core/") ||
    importPath.startsWith("@api/") ||
    importPath.startsWith("@infra/")
  ) {
    return "Use @yona/* package imports instead of @core/@api/@infra aliases.";
  }

  if (file.startsWith("packages/") && !isException(file)) {
    if (
      importPath.startsWith("@web/") ||
      importPath.startsWith("$lib") ||
      importPath.startsWith("$app")
    ) {
      return "packages/* must not import app internals (@web/$lib/$app).";
    }
  }

  if (file.startsWith("apps/web/src/")) {
    if (importPath.includes("/packages/") || importPath.startsWith("../../packages/")) {
      return "apps/web must use @yona/* for cross-package imports.";
    }
  }

  return null;
}

async function main(): Promise<void> {
  const roots = ["apps", "packages", "tools"];
  const files: string[] = [];

  for (const root of roots) {
    files.push(...(await collectFiles(path.join(ROOT, root))));
  }

  const violations: Violation[] = [];

  for (const absoluteFile of files) {
    const relativeFile = path.relative(ROOT, absoluteFile).split(path.sep).join("/");
    const content = await readFile(absoluteFile, "utf-8");
    const imports = extractImports(content);

    for (const importPath of imports) {
      const reason = validateImport(relativeFile, importPath);
      if (reason) {
        violations.push({ file: relativeFile, importPath, reason });
      }
    }
  }

  if (violations.length === 0) {
    console.log("Import convention lint passed.");
    return;
  }

  console.error(`Import convention lint failed with ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(`- ${violation.file} -> ${violation.importPath}`);
    console.error(`  ${violation.reason}`);
  }

  process.exit(1);
}

await main();
