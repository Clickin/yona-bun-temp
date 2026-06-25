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

test("server routes do not set route-owned text/html content types", () => {
  const violations = [];
  const htmlContentTypePattern =
    /\bCONTENT_TYPE\b[\s\S]{0,180}["']text\/html\b|["']text\/html\b[\s\S]{0,180}\bCONTENT_TYPE\b/g;

  for (const file of listRustFiles(ROUTES_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(htmlContentTypePattern)) {
      violations.push(
        `${path.relative(process.cwd(), file)}:${lineNumberForIndex(source, match.index ?? 0)} ` +
          "sets text/html from a route module instead of using the SPA asset shell",
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

test("React-owned pushed-branch dismissal has a REST JSON mutation route", () => {
  const source = readFileSync(path.join(ROUTES_DIR, "projects.rs"), "utf8");

  assert.match(
    source,
    /"\x2fowners\x2f\{owner_name\}\x2fprojects\x2f\{project_name\}\x2fpushed-branches\x2f\{pushed_branch_id\}"[\s\S]*?rest_delete_project_pushed_branch/,
  );
  assert.match(source, /Json\(RestProjectPushedBranchDeleteResponse \{ deleted: true \}\)/);
});
