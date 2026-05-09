import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const hookPath = path.join(repoRoot, ".husky", "pre-commit");
const verifyToolPath = path.join(repoRoot, "tools", "precommit-verify.mjs");
const designHarnessPath = path.join(repoRoot, "tools", "yona-design-harness.mjs");
const serverSourcePath = path.join(repoRoot, "crates", "server", "src", "lib.rs");
const specPath = path.join(repoRoot, "SPEC.md");
const yonaExportProvenancePath = path.join(
  repoRoot,
  "docs",
  "provenance",
  "phase-0b",
  "yona-export.md",
);
const frontendToolExtensions = [".js", ".jsx", ".ts", ".tsx"];

function readExtensionSet(source, name) {
  const match = source.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`));
  assert.ok(match, `${name} must be declared as a Set literal`);
  return [...match[1].matchAll(/"([^"]+)"/gu)].map((entry) => entry[1]);
}

function readStringArray(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  assert.ok(match, `${name} must be declared as an array literal`);
  return [...match[1].matchAll(/"([^"]+)"/gu)].map((entry) => entry[1]);
}

test("pre-commit hook points at the canonical root verification tool", () => {
  assert.equal(existsSync(hookPath), true, ".husky/pre-commit must exist");
  assert.equal(existsSync(verifyToolPath), true, "tools/precommit-verify.mjs must exist");
  assert.equal(existsSync(designHarnessPath), true, "tools/yona-design-harness.mjs must exist");

  const hookSource = readFileSync(hookPath, "utf8");

  assert.match(hookSource, /node\s+\.\/tools\/precommit-verify\.mjs/);
  assert.doesNotMatch(hookSource, /bun\s+run\s+precommit:verify/);
});

test("pre-commit verification runs the legacy Yona design harness", () => {
  const verifySource = readFileSync(verifyToolPath, "utf8");

  assert.match(verifySource, /from "\.\/yona-design-harness\.mjs"/);
  assert.match(verifySource, /evaluateDesignHarness/u);
  assert.match(verifySource, /shouldBlockDesignHarness/u);
});

test("pre-commit ox tools only target frontend JavaScript and TypeScript files", () => {
  const verifySource = readFileSync(verifyToolPath, "utf8");

  assert.deepEqual(readExtensionSet(verifySource, "OXLINT_EXTENSIONS"), frontendToolExtensions);
  assert.deepEqual(readExtensionSet(verifySource, "OXFMT_EXTENSIONS"), frontendToolExtensions);
});

test("pre-commit oxlint enables React component lint plugins", () => {
  const verifySource = readFileSync(verifyToolPath, "utf8");

  assert.deepEqual(readStringArray(verifySource, "OXLINT_PLUGIN_ARGS"), [
    "--react-plugin",
    "--react-perf-plugin",
    "--jsx-a11y-plugin",
  ]);
  assert.match(verifySource, /\.\.\.OXLINT_PLUGIN_ARGS/u);
});

test("pre-commit runs React Doctor when frontend source files are staged", () => {
  const verifySource = readFileSync(verifyToolPath, "utf8");

  assert.match(verifySource, /REACT_DOCTOR_PROJECT = "@yona\/rust-frontend"/u);
  assert.deepEqual(readStringArray(verifySource, "REACT_DOCTOR_PRECOMMIT_ARGS"), [
    "--project",
    "--offline",
    "--full",
    "--fail-on",
    "warning",
  ]);
  assert.match(verifySource, /reactDoctorTargets/u);
  assert.match(verifySource, /file\.startsWith\("frontend\/"\)/u);
});

test("external REST harness requires yona-export provenance for issue and milestone REST", () => {
  const serverSource = readFileSync(serverSourcePath, "utf8");
  const specSource = readFileSync(specPath, "utf8");
  const provenanceSource = readFileSync(yonaExportProvenancePath, "utf8");

  assert.doesNotMatch(serverSource, /\/-_-api\/v1\/owners\/[^"]*\/issues/u);
  assert.doesNotMatch(serverSource, /\/-_-api\/v1\/owners\/[^"]*\/milestones/u);
  assert.match(
    specSource,
    /새 React application API는 `\/api\/v1\/\*\*`를 canonical surface로 사용/u,
  );
  assert.match(
    specSource,
    /내부 React 화면은 `\/api\/v1\/\*\*` application API와 TanStack Query를 사용/u,
  );
  assert.match(specSource, /외부 도구와의 호환/u);
  assert.match(specSource, /내부 React 화면/u);
  assert.match(provenanceSource, /migration-facing project export\/import tool contract/u);
  assert.match(provenanceSource, /Do not add `\/-_-api\/v1` issue\/milestone/u);
});
