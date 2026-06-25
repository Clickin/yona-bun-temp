import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROUTES_DIR = path.join(process.cwd(), "crates/server/src/routes");
const HTML_FIELD_ASSIGNMENT = /\b(body|contents|history)_html:\s*([^,]+),/g;

function listRustFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listRustFiles(entryPath);
    }
    if (!entry.isFile() || !entry.name.endsWith(".rs")) {
      return [];
    }
    return [entryPath];
  });
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split("\n").length;
}

test("server REST HTML compatibility fields stay empty", () => {
  const violations = [];

  for (const file of listRustFiles(ROUTES_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(HTML_FIELD_ASSIGNMENT)) {
      const value = match[2].trim();
      if (value === "String") {
        continue;
      }
      if (value !== "String::new()") {
        violations.push(
          `${path.relative(process.cwd(), file)}:${lineNumberForIndex(source, match.index ?? 0)} ` +
            `${match[1]}_html uses ${value}`,
        );
      }
    }
  }

  assert.deepEqual(violations, []);
});
