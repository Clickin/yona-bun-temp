import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  evaluateDesignHarness,
  formatDesignHarnessSummary,
  shouldBlockDesignHarness,
} from "../tools/yona-design-harness.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const designPath = path.join(repoRoot, "DESIGN.md");
const precommitVerifyPath = path.join(repoRoot, "tools", "precommit-verify.mjs");
const appCssPath = path.join(repoRoot, "frontend", "src", "app.css");
const mainPath = path.join(repoRoot, "frontend", "src", "main.tsx");

test("DESIGN.md anchors frontend design to legacy Yona sources", () => {
  assert.equal(existsSync(designPath), true, "DESIGN.md must exist");
  const source = readFileSync(designPath, "utf8");

  for (const anchor of [
    "yona-original/app/views/**",
    "yona-original/app/assets/stylesheets/yobi.less",
    "yona-original/public/bootstrap/css/bootstrap.css",
    "_variables.less @orange",
    "tools/yona-design-harness.mjs",
  ]) {
    assert.match(source, new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
});

test("precommit verification invokes the legacy design harness", () => {
  const source = readFileSync(precommitVerifyPath, "utf8");

  assert.match(source, /evaluateDesignHarness/u);
  assert.match(source, /formatDesignHarnessSummary/u);
  assert.match(source, /shouldBlockDesignHarness/u);
});

test("current shared app CSS keeps the legacy Yona baseline active", () => {
  const appCss = readFileSync(appCssPath, "utf8");
  const main = readFileSync(mainPath, "utf8");

  assert.match(main, /import "\.\/app\.css";/u);
  assert.doesNotMatch(appCss, /#f5f1e8/u);
  assert.doesNotMatch(appCss, /\bGeorgia\b|Times New Roman/u);
  assert.match(appCss, /background(?:-color)?: #fff/u);
  assert.match(appCss, /#f36c22/u);
  assert.match(appCss, /#ff7332/u);
  assert.match(appCss, /\.ybtn/u);
  assert.match(appCss, /\.nav-tabs/u);
});

test("design harness blocks known temporary non-legacy UI drift", () => {
  const result = evaluateDesignHarness({
    changedFiles: ["frontend/src/app.css"],
    repoRoot,
  });

  assert.equal(shouldBlockDesignHarness(result), false);
  assert.match(formatDesignHarnessSummary(result), /PASS/u);

  const harnessSource = readFileSync(
    path.join(repoRoot, "tools", "yona-design-harness.mjs"),
    "utf8",
  );
  assert.match(harnessSource, /#f5f1e8/u);
  assert.match(harnessSource, /Georgia/u);
  assert.match(harnessSource, /Times New Roman/u);
});

test("design harness skips non-component implementation files", () => {
  const result = evaluateDesignHarness({
    changedFiles: ["frontend/src/api/auth.ts"],
    repoRoot,
  });

  assert.equal(result.required, false);
  assert.equal(shouldBlockDesignHarness(result), false);
});
