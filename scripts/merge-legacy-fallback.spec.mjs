import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { planUrl } from "./merge-legacy-fallback.mjs";

function makeTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "merge-legacy-fallback-spec-"));
  // public/legacy-assets/stylesheets = fallback dir; public/legacy-assets = public root
  const fallbackDir = path.join(root, "public", "legacy-assets", "stylesheets");
  const legacyAssetRoot = path.join(root, "src", "assets", "legacy");
  fs.mkdirSync(fallbackDir, { recursive: true });
  fs.mkdirSync(legacyAssetRoot, { recursive: true });
  return {
    root,
    fallbackDir,
    legacyAssetRoot,
    legacyAssetsPublicRoot: path.resolve(fallbackDir, ".."),
  };
}

test("destination exists with identical sha -> reuse, no copy", () => {
  const tree = makeTree();
  try {
    const source = path.join(tree.fallbackDir, "..", "images", "x.png");
    const dest = path.join(tree.legacyAssetRoot, "images", "x.png");
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(source, Buffer.from([1, 2, 3]));
    fs.writeFileSync(dest, Buffer.from([1, 2, 3]));
    const plan = planUrl("../images/x.png", [], tree);
    assert.equal(plan.action, "reuse");
    assert.equal(plan.rewritten, "./assets/legacy/images/x.png");
  } finally {
    fs.rmSync(tree.root, { recursive: true, force: true });
  }
});

test("destination exists with different sha -> hard fail", () => {
  const tree = makeTree();
  try {
    const source = path.join(tree.fallbackDir, "..", "images", "x.png");
    const dest = path.join(tree.legacyAssetRoot, "images", "x.png");
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(source, Buffer.from([1, 2, 3]));
    fs.writeFileSync(dest, Buffer.from([4, 5, 6]));
    assert.throws(() => planUrl("../images/x.png", [], tree), /asset SHA conflict/u);
  } finally {
    fs.rmSync(tree.root, { recursive: true, force: true });
  }
});

test("destination missing + identical content elsewhere under legacy assets -> reuse", () => {
  const tree = makeTree();
  try {
    const source = path.join(tree.fallbackDir, "..", "images", "x.png");
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, Buffer.from([9, 9, 9]));
    // existing Vite-owned asset with identical content at a different path
    fs.writeFileSync(path.join(tree.legacyAssetRoot, "existing.png"), Buffer.from([9, 9, 9]));
    const plan = planUrl("../images/x.png", [], tree);
    assert.equal(plan.action, "reuse");
    assert.equal(plan.rewritten, "./assets/legacy/existing.png");
  } finally {
    fs.rmSync(tree.root, { recursive: true, force: true });
  }
});

test("missing source stays missing (kept broken like pre-merge)", () => {
  const tree = makeTree();
  try {
    const plan = planUrl("fonts/typo..ttf", [], tree);
    assert.equal(plan.action, "missing");
    assert.equal(plan.rewritten, "./assets/legacy/fonts/typo..ttf");
  } finally {
    fs.rmSync(tree.root, { recursive: true, force: true });
  }
});

test("query and fragment survive the rewrite", () => {
  const tree = makeTree();
  try {
    const source = path.join(tree.fallbackDir, "yobicon", "fonts", "yobicon.eot");
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, Buffer.from([1]));
    fs.mkdirSync(path.join(tree.legacyAssetRoot, "yobicon", "fonts"), { recursive: true });
    fs.writeFileSync(
      path.join(tree.legacyAssetRoot, "yobicon", "fonts", "yobicon.eot"),
      Buffer.from([1]),
    );
    const plan = planUrl("yobicon/fonts/yobicon.eot?#iefix", [], tree);
    assert.equal(plan.rewritten, "./assets/legacy/yobicon/fonts/yobicon.eot?#iefix");
  } finally {
    fs.rmSync(tree.root, { recursive: true, force: true });
  }
});
