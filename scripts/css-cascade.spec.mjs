import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");

test("canonicalizer self-test fixtures pass", () => {
  const result = spawnSync(process.execPath, ["scripts/css-cascade.mjs", "--self-test"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS  font-face-formatting-equal/u);
});

test("merged app.css marker sha pins the manifest artifact sha", () => {
  const appCss = fs.readFileSync(path.join(repoRoot, "frontend/src/app.css"), "utf8");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "docs/provenance/legacy-css-merged.manifest.json"), "utf8"),
  );
  const begin = appCss.indexOf("/* BEGIN merged frozen legacy-fallback");
  const end = appCss.indexOf("/* END merged frozen legacy-fallback */", begin);
  assert.ok(begin !== -1 && end !== -1, "merged block markers present in app.css");
  const marker = /sha256:([0-9a-f]{64})/u.exec(appCss.slice(begin, begin + 160));
  assert.equal(marker?.[1], manifest.artifactSha256);
  assert.equal(manifest.runtime, false);
  assert.equal(manifest.mergedInto, "frontend/src/app.css");
  // the layer contract line is present
  assert.ok(appCss.startsWith("@layer homeb, legacy, theme, utilities;\n"));
});

test("head vs baseline semantic cascade is equal", () => {
  const result = spawnSync(process.execPath, ["scripts/css-cascade.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK — semantic cascade equal/u);
});
