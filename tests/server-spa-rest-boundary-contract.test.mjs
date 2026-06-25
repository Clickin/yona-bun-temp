import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROUTES_DIR = path.join(process.cwd(), "crates/server/src/routes");
const AUTH_ROUTE = path.join(ROUTES_DIR, "auth.rs");

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

test("server routes do not emit route-owned HTML fragments", () => {
  const violations = [];
  const htmlResponsePattern = /\bHtml\s*(?:<|\()/g;

  for (const file of listRustFiles(ROUTES_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(htmlResponsePattern)) {
      violations.push(
        `${path.relative(process.cwd(), file)}:${lineNumberForIndex(source, match.index ?? 0)} ` +
          "uses axum Html instead of SPA shell or REST JSON",
      );
    }
  }

  assert.deepEqual(violations, []);
});

test("auth signup and login keep REST JSON as the primary React boundary", () => {
  const source = readFileSync(AUTH_ROUTE, "utf8");

  assert.match(source, /"\x2fauth\x2fsign-in"[\s\S]*?Json\(input\): Json<RestSignInRequest>/);
  assert.match(source, /"\x2fauth\x2fregister"[\s\S]*?Json\(input\): Json<RestRegisterRequest>/);
  assert.match(source, /pub\(crate\) async fn direct_legacy_login\(/);
  assert.match(source, /pub\(crate\) async fn direct_legacy_signup\(/);
  assert.match(
    source,
    /"\x2fusers\x2flogin"[\s\S]*?Form\(form\): Form<HashMap<String, String>>[\s\S]*?direct_legacy_login/,
  );
  assert.match(
    source,
    /"\x2fusers\x2fsignup"[\s\S]*?Form\(form\): Form<HashMap<String, String>>[\s\S]*?direct_legacy_signup/,
  );
});

