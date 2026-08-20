#!/usr/bin/env node
// CSS cascade semantic canonicalizer + differ (DOM-Parity Fast Lane, Stage A).
//
// Canonical model: "effective semantic cascade" built from stylesheets in HTML
// document order (index.html inline <style>, legacy-fallback.css when present,
// app.css). Physical structure (stylesheet boundaries, raw @layer statement
// text, offsets) is NOT an equality key — the merged single-entry stylesheet
// must canonicalize identically to the pre-merge multi-entry state.
//
// Equality model:
//   - effective layer order (first-declaration order of @layer names)
//   - per-cascade-bucket (layerPath + atRuleAncestors) logical rule order:
//     selector + declarations in original order + !important flag
//   - @font-face: structured descriptors; src url() compared by resource
//     identity (file bytes sha256 + query + fragment)
//   - @keyframes: name + frame selectors + declarations in original order
//   - other at-rules (@theme, @tailwind utilities, ...): name + params +
//     declarations, attributed to their layer context
//   - url() resource identity: data: URIs decoded to bytes sha256; file URLs
//     resolved relative to the owning stylesheet; missing files canonicalize
//     to `missing:<basename>` (path-independent — the same missing reference
//     stays equal when its stylesheet moves)
//
// Usage:
//   node scripts/css-cascade.mjs            compare HEAD vs baseline (exit 0/1)
//   node scripts/css-cascade.mjs --freeze   write docs/provenance/css-cascade-baseline.json
//   node scripts/css-cascade.mjs --regen    alias of --freeze
//   node scripts/css-cascade.mjs --self-test  run canonicalizer fixtures
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import postcss from "postcss";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const frontendRoot = path.join(repoRoot, "frontend");
const baselinePath = path.join(repoRoot, "docs", "provenance", "css-cascade-baseline.json");
const requireFromFrontend = createRequire(path.join(frontendRoot, "package.json"));

export const INPUT_PATHS = {
  indexHtml: path.join(frontendRoot, "index.html"),
  fallback: path.join(
    frontendRoot,
    "public",
    "legacy-assets",
    "stylesheets",
    "legacy-fallback.css",
  ),
  appCss: path.join(frontendRoot, "src", "app.css"),
};

// ---------------------------------------------------------------------------
// url() resource identity
// ---------------------------------------------------------------------------

const URL_TOKEN_RE = /url\(\s*(?:(["'])(.*?)\1|([^)'"\s]+))\s*\)/g;

/**
 * Split a css url token into { path, query, fragment }.
 * Manual split (no URL parser): the URL parser would normalize `..` dot
 * segments away, which breaks resolving `url(../x.png)` against the
 * owning stylesheet's directory. Fragment = after the last `#`; query =
 * after the first `?` before the fragment.
 */
function splitCssUrl(token) {
  const hashAt = token.lastIndexOf("#");
  const fragment = hashAt === -1 ? "" : token.slice(hashAt + 1);
  const withoutHash = hashAt === -1 ? token : token.slice(0, hashAt);
  const queryAt = withoutHash.indexOf("?");
  const query = queryAt === -1 ? "" : withoutHash.slice(queryAt + 1);
  const pathPart = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt);
  let path = pathPart;
  try {
    path = decodeURIComponent(pathPart);
  } catch {
    // keep raw
  }
  return { path, query, fragment };
}

function sha256Of(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Resolve a css url token to its resource identity.
 * @param {string} token raw css url content
 * @param {string} baseDir directory the owning stylesheet lives in
 * @returns {{ identity: string, kind: "data"|"file"|"missing", sha256?: string, path?: string }}
 */
export function resolveUrlIdentity(token, baseDir) {
  if (token.startsWith("data:")) {
    const comma = token.indexOf(",");
    const head = comma === -1 ? token : token.slice(0, comma);
    const payload = comma === -1 ? "" : token.slice(comma + 1);
    let bytes;
    if (/;base64(?:;|$)/u.test(head)) {
      bytes = Buffer.from(payload, "base64");
    } else {
      bytes = Buffer.from(
        payload.replace(/%([0-9a-fA-F]{2})/g, (_, hex) =>
          String.fromCharCode(Number.parseInt(hex, 16)),
        ),
        "latin1",
      );
    }
    return { identity: `data:${sha256Of(bytes)}`, kind: "data", sha256: sha256Of(bytes) };
  }
  const { path: filePath, query, fragment } = splitCssUrl(token);
  const resolved = path.resolve(baseDir, filePath);
  const suffix = `${query ? `?${query}` : ""}${fragment ? `#${fragment}` : ""}`;
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    const sha256 = sha256Of(fs.readFileSync(resolved));
    return { identity: `file:${sha256}${suffix}`, kind: "file", sha256, path: resolved };
  }
  // Missing file: path-independent identity (the reference is equally broken
  // wherever the stylesheet lives; only the basename is semantically visible).
  return {
    identity: `missing:${path.basename(filePath)}${suffix}`,
    kind: "missing",
    path: resolved,
  };
}

/** Replace every url() token in a css value with its resource identity. */
function normalizeValue(value, baseDir) {
  let out = value.replace(URL_TOKEN_RE, (_match, _quote, quoted, unquoted) => {
    const token = quoted ?? unquoted;
    return `url(${resolveUrlIdentity(token, baseDir).identity})`;
  });
  // collapse whitespace runs (formatting-insensitive)
  out = out.replace(/\s+/g, " ").trim();
  // quote style is formatting, not semantics
  out = out.replace(/'/g, '"');
  return out;
}

// ---------------------------------------------------------------------------
// canonical model builder
// ---------------------------------------------------------------------------

/**
 * @param {Array<{name: string, css?: string, filePath?: string}>} inputs in document order
 */
export function canonicalize(inputs) {
  const model = {
    layers: [], // effective first-declaration order
    buckets: new Map(), // bucketKey -> { layerPath, atRules, rules: [] }
    fontFaces: [],
    keyframes: [],
    others: [],
    diagnostics: {
      inputs: [],
      layerStatements: [],
      urlAssets: new Map(), // identity -> count (diagnostic only)
      ruleCount: 0,
    },
  };

  const declaredLayers = new Set();
  const declareLayers = (names, source) => {
    for (const name of names) {
      if (!declaredLayers.has(name)) {
        declaredLayers.add(name);
        model.layers.push(name);
      }
    }
    if (names.length > 0 && source) model.diagnostics.layerStatements.push(source);
  };

  const bucketFor = (layerStack, atRules) => {
    const layerPath = layerStack.length === 0 ? null : layerStack.join("/");
    const key = `${layerPath ?? "∅"}|${atRules.join(">")}`;
    let bucket = model.buckets.get(key);
    if (!bucket) {
      bucket = { layerPath, atRules: [...atRules], rules: [] };
      model.buckets.set(key, bucket);
    }
    return bucket;
  };

  const recordUrlRefs = (value, baseDir) => {
    const re = new RegExp(URL_TOKEN_RE.source, "g");
    let m;
    while ((m = re.exec(value))) {
      const token = m[2] ?? m[3];
      const { identity } = resolveUrlIdentity(token, baseDir);
      model.diagnostics.urlAssets.set(
        identity,
        (model.diagnostics.urlAssets.get(identity) ?? 0) + 1,
      );
    }
  };

  /**
   * Walk a container, tracking layer + at-rule context.
   * @param {import("postcss").Container} container
   * @param {{ layerStack: string[], atRules: string[], baseDir: string, atRuleAncestors: string[] }} ctx
   */
  function walk(container, ctx) {
    const { layerStack, atRules, baseDir } = ctx;
    for (const node of container.nodes ?? []) {
      if (node.type === "rule") {
        const bucket = bucketFor(layerStack, atRules);
        const declarations = (node.nodes ?? [])
          .filter((child) => child.type === "decl")
          // IE star-hacks (`*zoom: 1`) never apply in the target browser and
          // are stripped from the merged legacy block — semantically inert on
          // both sides of the comparison. postcss stores the star in
          // decl.raws.before.
          .filter((decl) => !(decl.raws?.before ?? "").endsWith("*"))
          .map((decl) => {
            recordUrlRefs(decl.value, baseDir);
            return {
              p: decl.prop,
              v: normalizeValue(decl.value, baseDir),
              i: decl.important === true,
            };
          });
        bucket.rules.push({ s: normalizeValue(node.selector, baseDir), d: declarations });
        model.diagnostics.ruleCount += 1;
        continue;
      }
      if (node.type === "atrule") {
        const name = node.name.toLowerCase();
        const params = node.params?.trim() ?? "";
        if (name === "charset") continue; // no cascade semantics
        if (name === "import") {
          // @import "specifier" layer(name); — inline the imported stylesheet.
          const layerMatch = /layer\(([^)]+)\)/u.exec(params);
          const mediaRest = params
            .replace(/^(["'])(.*?)\1/u, "")
            .replace(/layer\([^)]+\)/u, "")
            .trim();
          const specMatch = /^(["'])(.*?)\1/u.exec(params);
          if (specMatch) {
            const specifier = specMatch[2];
            let importedPath = null;
            try {
              importedPath = requireFromFrontend.resolve(specifier);
            } catch {
              const candidate = path.resolve(baseDir, specifier);
              if (fs.existsSync(candidate)) importedPath = candidate;
            }
            if (importedPath) {
              const importedCss = fs.readFileSync(importedPath, "utf8");
              const importedRoot = postcss.parse(importedCss, { from: importedPath });
              const nextLayers = [...layerStack];
              if (layerMatch) {
                const layerName = layerMatch[1].trim();
                declareLayers([layerName], null);
                nextLayers.push(layerName);
              }
              const nextAtRules = mediaRest ? [...atRules, `import ${mediaRest}`] : atRules;
              walk(importedRoot, {
                layerStack: nextLayers,
                atRules: nextAtRules,
                baseDir: path.dirname(importedPath),
                atRuleAncestors: ctx.atRuleAncestors,
              });
              model.diagnostics.inputs.push({
                name: node.name,
                specifier,
                resolved: importedPath,
                layer: layerMatch ? layerMatch[1].trim() : null,
              });
            }
          }
          continue;
        }
        if (name === "layer") {
          const names = params
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          if (names.length > 0) {
            declareLayers(names, `${node.name} ${node.params?.trim()}`);
          }
          if (node.nodes) {
            const nextLayers =
              names.length > 0
                ? [...layerStack, names[names.length - 1]]
                : [...layerStack, "\u0000anon"];
            walk(node, {
              layerStack: nextLayers,
              atRules,
              baseDir,
              atRuleAncestors: ctx.atRuleAncestors,
            });
          }
          continue;
        }
        if (name === "font-face") {
          const descriptors = {};
          for (const decl of node.nodes ?? []) {
            if (decl.type !== "decl") continue;
            recordUrlRefs(decl.value, baseDir);
            descriptors[decl.prop] = normalizeValue(decl.value, baseDir);
          }
          model.fontFaces.push({
            layer: layerStack.join("/") || null,
            atRules: [...atRules],
            d: descriptors,
          });
          continue;
        }
        if (name === "keyframes" || name.endsWith("-keyframes")) {
          const frames = (node.nodes ?? [])
            .filter((child) => child.type === "rule")
            .map((frame) => ({
              s: normalizeValue(frame.selector, baseDir),
              d: (frame.nodes ?? [])
                .filter((child) => child.type === "decl")
                .map((decl) => ({
                  p: decl.prop,
                  v: normalizeValue(decl.value, baseDir),
                  i: decl.important === true,
                })),
            }));
          model.keyframes.push({
            layer: layerStack.join("/") || null,
            atRules: [...atRules],
            name: params,
            frames,
          });
          continue;
        }
        // Generic at-rule: record own declarations (if any), recurse into
        // structural children (rules/at-rules) under an extended at-rule path.
        const declarations = (node.nodes ?? [])
          .filter((child) => child.type === "decl")
          .map((decl) => {
            recordUrlRefs(decl.value, baseDir);
            return {
              p: decl.prop,
              v: normalizeValue(decl.value, baseDir),
              i: decl.important === true,
            };
          });
        const othersRecord = {
          name,
          params,
          layer: layerStack.join("/") || null,
          atRules: [...atRules],
          declarations,
        };
        const hasDecls = (node.nodes ?? []).some((child) => child.type === "decl");
        const hasStructural = (node.nodes ?? []).some((child) => child.type !== "decl");
        if (hasDecls) model.others.push(othersRecord);
        if (hasStructural) {
          walk(node, {
            layerStack,
            atRules: [...atRules, `${name} ${params}`.trim()],
            baseDir,
            atRuleAncestors: ctx.atRuleAncestors,
          });
        } else if (!hasDecls) {
          // Empty or marker at-rule (e.g. `@tailwind utilities;`).
          model.others.push(othersRecord);
        }
      }
    }
  }

  for (const input of inputs) {
    const css = input.css ?? fs.readFileSync(input.filePath, "utf8");
    const baseDir = input.filePath ? path.dirname(input.filePath) : frontendRoot;
    const root = postcss.parse(css, { from: input.filePath ?? "<inline>" });
    model.diagnostics.inputs.push({
      name: input.name,
      path: input.filePath ?? "<inline>",
      sha256: sha256Of(Buffer.from(css, "utf8")),
      bytes: Buffer.byteLength(css),
    });
    walk(root, { layerStack: [], atRules: [], baseDir, atRuleAncestors: [] });
  }

  // Serialize buckets deterministically (first-occurrence order).
  model.buckets = [...model.buckets.entries()].map(([key, bucket]) => ({ key, ...bucket }));
  model.diagnostics.urlAssets = [...model.diagnostics.urlAssets.entries()]
    .map(([identity, count]) => ({ identity, count }))
    .sort((a, b) => a.identity.localeCompare(b.identity));
  return model;
}

// ---------------------------------------------------------------------------
// inputs (HTML document order)
// ---------------------------------------------------------------------------

function readInlineStyle(html) {
  const match = /<style[^>]*>([\s\S]*?)<\/style>/u.exec(html);
  return match ? match[1] : "";
}

export function headInputs() {
  const indexHtml = fs.readFileSync(INPUT_PATHS.indexHtml, "utf8");
  const inputs = [{ name: "index.html-inline", css: readInlineStyle(indexHtml) }];
  if (fs.existsSync(INPUT_PATHS.fallback)) {
    inputs.push({ name: "legacy-fallback.css", filePath: INPUT_PATHS.fallback });
  }
  inputs.push({ name: "app.css", filePath: INPUT_PATHS.appCss });
  return inputs;
}

/**
 * Inputs as of a git ref (used by --regen to reproduce the pre-merge
 * baseline from the merge commit's parent). Content comes from git; the
 * on-disk directories still anchor url() resource resolution.
 */
function inputsFromGit(ref) {
  const show = (pathSpec) => {
    const result = spawnSync("git", ["show", `${ref}:${pathSpec}`], {
      encoding: "utf8",
      cwd: repoRoot,
    });
    if (result.status !== 0) return null;
    return result.stdout;
  };
  const indexHtml = show("frontend/index.html");
  if (indexHtml === null) throw new Error(`git show ${ref}:frontend/index.html failed`);
  const inputs = [{ name: "index.html-inline", css: readInlineStyle(indexHtml) }];
  const fallback = show("frontend/public/legacy-assets/stylesheets/legacy-fallback.css");
  if (fallback !== null) {
    inputs.push({ name: "legacy-fallback.css", css: fallback, filePath: INPUT_PATHS.fallback });
  }
  const appCss = show("frontend/src/app.css");
  if (appCss === null) throw new Error(`git show ${ref}:frontend/src/app.css failed`);
  inputs.push({ name: "app.css", css: appCss, filePath: INPUT_PATHS.appCss });
  return inputs;
}

// ---------------------------------------------------------------------------
// comparison
// ---------------------------------------------------------------------------

function compareModels(left, right) {
  const diffs = [];
  const push = (where, detail) => diffs.push(`  ${where}: ${detail}`);
  if (JSON.stringify(left.layers) !== JSON.stringify(right.layers)) {
    push("layers", `left=[${left.layers.join(", ")}] right=[${right.layers.join(", ")}]`);
  }
  const leftBuckets = new Map(left.buckets.map((b) => [b.key, b]));
  const rightBuckets = new Map(right.buckets.map((b) => [b.key, b]));
  const leftKeys = left.buckets.map((b) => b.key);
  const rightKeys = right.buckets.map((b) => b.key);
  if (JSON.stringify(leftKeys) !== JSON.stringify(rightKeys)) {
    push("bucket-keys", `left=[${leftKeys.join(" | ")}] right=[${rightKeys.join(" | ")}]`);
  }
  for (const bucket of left.buckets) {
    const other = rightBuckets.get(bucket.key);
    if (!other) {
      push(`bucket ${bucket.key}`, "missing on right");
      continue;
    }
    const max = Math.max(bucket.rules.length, other.rules.length);
    let firstDiff = -1;
    for (let index = 0; index < max; index += 1) {
      const leftRule = bucket.rules[index];
      const rightRule = other.rules[index];
      if (!leftRule || !rightRule) {
        firstDiff = index;
        break;
      }
      if (JSON.stringify(leftRule) !== JSON.stringify(rightRule)) {
        firstDiff = index;
        break;
      }
    }
    if (firstDiff !== -1) {
      push(
        `bucket ${bucket.key}`,
        `rule #${firstDiff} differs: left=${JSON.stringify(bucket.rules[firstDiff])?.slice(0, 160)} right=${JSON.stringify(other.rules[firstDiff])?.slice(0, 160)}`,
      );
    }
  }
  for (const [label, field] of [
    ["font-faces", "fontFaces"],
    ["keyframes", "keyframes"],
    ["others", "others"],
  ]) {
    const leftList = left[field];
    const rightList = right[field];
    if (label === "keyframes") {
      // Distinct @keyframes names do not interact with each other in the
      // cascade — only same-name definitions have an order that matters.
      // Compare name-grouped definition sequences.
      const group = (list) =>
        [
          ...list
            .reduce((map, item) => {
              const entry = map.get(item.name) ?? [];
              entry.push({ layer: item.layer, atRules: item.atRules, frames: item.frames });
              map.set(item.name, entry);
              return map;
            }, new Map())
            .entries(),
        ].sort((a, b) => a[0].localeCompare(b[0]));
      if (JSON.stringify(group(leftList)) !== JSON.stringify(group(rightList))) {
        push(label, "name-grouped definitions differ");
      }
      continue;
    }
    if (leftList.length !== rightList.length) {
      push(label, `count left=${leftList.length} right=${rightList.length}`);
      continue;
    }
    for (let index = 0; index < leftList.length; index += 1) {
      if (JSON.stringify(leftList[index]) !== JSON.stringify(rightList[index])) {
        push(
          label,
          `#${index} differs: left=${JSON.stringify(leftList[index])?.slice(0, 160)} right=${JSON.stringify(rightList[index])?.slice(0, 160)}`,
        );
      }
    }
  }
  return diffs;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function gitHead() {
  try {
    return fs.readFileSync(path.join(repoRoot, ".git", "HEAD"), "utf8").trim();
  } catch {
    return "unknown";
  }
}

function serializeModel(model) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    gitHead: gitHead(),
    effectiveLayerOrder: [...model.layers],
    model: {
      layers: model.layers,
      buckets: model.buckets,
      fontFaces: model.fontFaces,
      keyframes: model.keyframes,
      others: model.others,
    },
    diagnostics: {
      inputs: model.diagnostics.inputs,
      layerStatements: model.diagnostics.layerStatements,
      urlAssets: model.diagnostics.urlAssets,
      ruleCount: model.diagnostics.ruleCount,
      bucketCount: model.buckets.length,
      fontFaceCount: model.fontFaces.length,
      keyframeCount: model.keyframes.length,
    },
  };
}

export function canonicalizeHead() {
  return canonicalize(headInputs());
}

export function runSelfTest() {
  const tmp = fs.mkdtempSync(path.join("/tmp", "css-cascade-self-test-"));
  try {
    fs.writeFileSync(path.join(tmp, "x.png"), Buffer.from([1, 2, 3, 4]));
    fs.writeFileSync(path.join(tmp, "x2.png"), Buffer.from([1, 2, 3, 5]));
    const results = [];
    const expect = (label, condition, detail) => {
      results.push({ label, pass: Boolean(condition), detail });
    };

    // (a) distributed first declarations vs consolidated statement → equal
    const setA = [
      { name: "inline", css: "@layer a;" },
      { name: "other", css: "@layer b { .x { color: red } }" },
    ];
    const setB = [
      { name: "inline", css: "" },
      { name: "other", css: "@layer a, b; @layer b { .x { color: red } }" },
    ];
    expect(
      "layer-order-distributed-vs-consolidated",
      compareModels(canonicalize(setA), canonicalize(setB)).length === 0,
      "",
    );

    // (b) layer order swap → diff
    const setC = [
      { name: "inline", css: "" },
      { name: "other", css: "@layer b, a; @layer b { .x { color: red } }" },
    ];
    expect(
      "layer-order-swap-diffs",
      compareModels(canonicalize(setA), canonicalize(setC)).length > 0,
      "",
    );

    // (c) same-layer rule order flip → diff
    const setD = [{ name: "s", css: "@layer l { .a { color: red } .b { color: blue } }" }];
    const setE = [{ name: "s", css: "@layer l { .b { color: blue } .a { color: red } }" }];
    expect(
      "rule-order-flip-diffs",
      compareModels(canonicalize(setD), canonicalize(setE)).length > 0,
      "",
    );

    // (d) url identity: same bytes, different query → diff; same file via
    // different textual path → equal
    const f1 = { name: "s", filePath: path.join(tmp, "one.css") };
    fs.writeFileSync(f1.filePath, `a { background: url(x.png) }`);
    const f2 = { name: "s", filePath: path.join(tmp, "two.css") };
    fs.writeFileSync(f2.filePath, `a { background: url(x.png?q=1) }`);
    const f3 = { name: "s", filePath: path.join(tmp, "three.css") };
    fs.writeFileSync(f3.filePath, `a { background: url("./x.png") }`);
    expect("url-query-diffs", compareModels(canonicalize([f1]), canonicalize([f2])).length > 0, "");
    expect(
      "url-path-equivalent-equal",
      compareModels(canonicalize([f1]), canonicalize([f3])).length === 0,
      "",
    );

    // (e) fragment difference → diff
    const f4 = { name: "s", filePath: path.join(tmp, "four.css") };
    fs.writeFileSync(f4.filePath, `a { background: url(x.png#frag-a) }`);
    const f5 = { name: "s", filePath: path.join(tmp, "five.css") };
    fs.writeFileSync(f5.filePath, `a { background: url(x.png#frag-b) }`);
    expect(
      "url-fragment-diffs",
      compareModels(canonicalize([f4]), canonicalize([f5])).length > 0,
      "",
    );

    // (f) data URI bytes equivalence vs different bytes
    const payload = Buffer.from("hello world").toString("base64");
    const d1 = { name: "s", css: `a { background: url(data:image/png;base64,${payload}) }` };
    const d2 = { name: "s", css: `a { background: url(data:image/png;base64,${payload}) }` };
    const d3 = {
      name: "s",
      css: `a { background: url(data:image/png;base64,${Buffer.from("hello worlD").toString("base64")}) }`,
    };
    expect(
      "data-uri-equal",
      compareModels(canonicalize([d1]), canonicalize([d2])).length === 0,
      "",
    );
    expect(
      "data-uri-bytes-diff",
      compareModels(canonicalize([d1]), canonicalize([d3])).length > 0,
      "",
    );

    // (g) missing file stays equal across stylesheet relocation
    const m1 = { name: "s", css: `a { background: url(font.eot?#iefix) }` };
    const m2 = { name: "s", css: `a { background: url(./deep/nested/font.eot?#iefix) }` };
    expect(
      "missing-file-relocation-equal",
      compareModels(canonicalize([m1]), canonicalize([m2])).length === 0,
      "",
    );

    // (h) font-face formatting-only difference → equal
    const ff1 = {
      name: "s",
      css: `@font-face { font-family: X; src: url(x.png) format("woff2"); }`,
    };
    const ff2 = {
      name: "s",
      css: `@font-face { font-family: X; src: url(x.png) format('woff2') }`,
    };
    expect(
      "font-face-formatting-equal",
      compareModels(canonicalize([ff1]), canonicalize([ff2])).length === 0,
      "",
    );

    for (const result of results) {
      console.log(
        `${result.pass ? "PASS" : "FAIL"}  ${result.label}${result.detail ? ` — ${result.detail}` : ""}`,
      );
    }
    return results.every((result) => result.pass) ? 0 : 1;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (!isMain) {
  // Imported as a module (debug/fixture consumers).
} else {
  runCli();
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    process.exit(runSelfTest());
  }

  if (args.includes("--freeze") || args.includes("--regen")) {
    const model = args.includes("--regen")
      ? canonicalize(inputsFromGit(args[args.indexOf("--regen") + 1] ?? "HEAD"))
      : canonicalizeHead();
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, `${JSON.stringify(serializeModel(model), null, 2)}\n`);
    console.log(
      `[css-cascade] baseline frozen: ${baselinePath}`,
      `layers=[${model.layers.join(", ")}]`,
      `rules=${model.diagnostics.ruleCount}`,
      `buckets=${model.buckets.length}`,
      `fontFaces=${model.fontFaces.length}`,
      `keyframes=${model.keyframes.length}`,
      `others=${model.others.length}`,
      `urlAssets=${model.diagnostics.urlAssets.length}`,
    );
    process.exit(0);
  }

  // default: compare HEAD vs baseline
  if (!fs.existsSync(baselinePath)) {
    console.error(
      `[css-cascade] baseline missing — run 'node scripts/css-cascade.mjs --freeze' first (${baselinePath})`,
    );
    process.exit(2);
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const head = canonicalizeHead();
  const diffs = compareModels(baseline.model, head);
  if (diffs.length === 0) {
    console.log(
      `[css-cascade] OK — semantic cascade equal (layers=[${head.layers.join(", ")}], rules=${head.diagnostics.ruleCount}, buckets=${head.buckets.length})`,
    );
    process.exit(0);
  }
  console.error(`[css-cascade] DIFF — ${diffs.length} semantic difference(s):`);
  for (const diff of diffs) console.error(diff);
  console.error(
    `[css-cascade] head layers=[${head.layers.join(", ")}] rules=${head.diagnostics.ruleCount} vs baseline layers=[${baseline.model.layers.join(", ")}] rules=${baseline.diagnostics.ruleCount}`,
  );
  process.exit(1);
}
