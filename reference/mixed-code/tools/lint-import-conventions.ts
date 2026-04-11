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

const ALLOWED_EXCEPTIONS = new Set<string>();
const TARGET_OWNERSHIP_PREFIXES = [
  "reference/mixed-code/apps/app/",
  "reference/mixed-code/packages/auth/",
  "reference/mixed-code/packages/contracts/",
  "reference/mixed-code/packages/db/",
  "reference/mixed-code/packages/domain/",
  "reference/mixed-code/packages/i18n/",
  "reference/mixed-code/packages/integrations/",
  "reference/mixed-code/packages/ui/",
  "reference/mixed-code/packages/vcs/",
];
const LEGACY_OWNERSHIP_IMPORTS = ["@yona/core", "@yona/infra"];

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

function isTargetOwnershipFile(file: string): boolean {
  return TARGET_OWNERSHIP_PREFIXES.some((prefix) => file.startsWith(prefix));
}

function isLegacyOwnershipImport(importPath: string): boolean {
  return LEGACY_OWNERSHIP_IMPORTS.some(
    (legacyImport) => importPath === legacyImport || importPath.startsWith(`${legacyImport}/`),
  );
}

function validateImport(file: string, importPath: string): string | null {
  if (/^(\.\.\/){3,}/.test(importPath)) {
    return "Deep relative import is forbidden; use project aliases.";
  }

  if (importPath.startsWith("@core/") || importPath.startsWith("@infra/")) {
    return "Use @yona/* package imports instead of @core/@infra aliases.";
  }

  if (importPath.startsWith("@api/")) {
    return "@api/* is removed; import from target ownership packages instead.";
  }

  if (file.startsWith("reference/mixed-code/packages/") && !isException(file)) {
    if (
      importPath.startsWith("@web/") ||
      importPath.startsWith("$lib") ||
      importPath.startsWith("$app")
    ) {
      return "reference/mixed-code/packages/* must not import app internals (@web/$lib/$app).";
    }
  }

  if (isTargetOwnershipFile(file) && isLegacyOwnershipImport(importPath)) {
    return "Target ownership must not depend on legacy @yona/core or @yona/infra packages.";
  }

  if (file.startsWith("reference/mixed-code/apps/app/")) {
    if (
      importPath.startsWith("@web/") ||
      importPath.startsWith("$lib") ||
      importPath.startsWith("$app")
    ) {
      return "reference/mixed-code/apps/app must not import SvelteKit app internals (@web/$lib/$app).";
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
