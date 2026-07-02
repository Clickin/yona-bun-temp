import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const legacyViewsDir = path.join(repoRoot, "yona-original", "app", "views");

function legacyViewFiles(dir = legacyViewsDir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return legacyViewFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".scala.html") ? [fullPath] : [];
  });
}

function relative(filePath) {
  return path.relative(repoRoot, filePath);
}

function filesContaining(pattern) {
  return legacyViewFiles().filter((filePath) => readFileSync(filePath, "utf8").includes(pattern));
}

test("legacy sidebar all-list wrappers stay dormant behind active user menu partials", () => {
  const userMenuTabContent = readFileSync(
    path.join(legacyViewsDir, "common", "usermenu_tab_content_list.scala.html"),
    "utf8",
  );
  assert.match(userMenuTabContent, /myOrganizationList\(UserApp\.currentUser\(\)\)/u);
  assert.match(userMenuTabContent, /myProjectList\(UserApp\.currentUser\(\)\)/u);
  assert.doesNotMatch(userMenuTabContent, /allOrganizationList\(/u);
  assert.doesNotMatch(userMenuTabContent, /allProjectList\(/u);

  assert.deepEqual(filesContaining("@views.html.index.allOrganizationList(").map(relative), []);
  assert.deepEqual(filesContaining("@views.html.index.allProjectList(").map(relative), []);
  assert.deepEqual(filesContaining("@allOrganizationList_partial(").map(relative), [
    "yona-original/app/views/index/allProjectList.scala.html",
  ]);
});

test("legacy git partial_forklist has no active Scala include caller", () => {
  const forkListPath = path.join(legacyViewsDir, "git", "partial_forklist.scala.html");
  assert.ok(statSync(forkListPath).isFile());
  assert.deepEqual(filesContaining("partial_forklist(").map(relative), []);
  assert.deepEqual(filesContaining("views.html.git.partial_forklist").map(relative), []);
});
