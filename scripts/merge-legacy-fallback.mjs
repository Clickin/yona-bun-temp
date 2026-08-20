#!/usr/bin/env node
// Merge legacy-fallback.css into frontend/src/app.css (DOM-Parity Fast Lane,
// Stage A3): cascade-preserving + asset-URL-preserving relocation.
//
// 1. Verifies docs/provenance manifest sha256 against the fallback artifact.
// 2. Extracts the fallback `@layer legacy { ... }` inner content byte-exactly
//    (brace matching on raw text — no re-serialization).
// 3. Rewrites every non-data url() token relative to src/app.css:
//      ./assets/legacy/<path relative to public/legacy-assets/stylesheets/>
//    Assets are relocated SHA-aware (blind moves forbidden):
//      - destination exists + content sha256 equal  -> reuse, no copy
//      - destination exists + sha256 differs        -> HARD FAIL
//      - destination missing + identical sha256 file already under
//        src/assets/legacy                          -> reuse that file (no dup copy)
//      - destination missing + source missing       -> keep rewritten url
//        (reference stays broken exactly like pre-merge), warn
//      - otherwise                                  -> copy
// 4. Inserts the wrapped block before the hand-curated `@layer legacy {`
//    in app.css, between idempotent BEGIN/END markers. Curated rules come
//    later in the same layer, so they keep winning ties (same as the current
//    link -> import document order).
//
// Usage:
//   node scripts/merge-legacy-fallback.mjs --dry-run   report actions only
//   node scripts/merge-legacy-fallback.mjs             apply merge
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const frontendRoot = path.join(repoRoot, "frontend");
const fallbackDir = path.join(frontendRoot, "public", "legacy-assets", "stylesheets");
const legacyAssetsPublicRoot = path.resolve(fallbackDir, "..");
const fallbackPath = path.join(fallbackDir, "legacy-fallback.css");
const manifestPath = path.join(fallbackDir, "legacy-fallback.manifest.json");
const appCssPath = path.join(frontendRoot, "src", "app.css");
const legacyAssetRoot = path.join(frontendRoot, "src", "assets", "legacy");

const BEGIN_MARKER = "/* BEGIN merged frozen legacy-fallback";
const END_MARKER = "/* END merged frozen legacy-fallback */";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

// IE star-hacks (`*zoom: 1`, `*overflow: visible`, …) never apply in the
// target browser, but the Tailwind/LightningCSS pipeline mangles rules that
// contain them (it treats `*overflow` as `overflow` and can drop valid
// declarations or whole rules). Stripping them from the merged block keeps
// the built cascade identical to the pre-merge raw-served fallback. The
// canonicalizer treats `*`-prefixed declarations as semantically inert on
// both sides, so the css-cascade gate still holds.
const STAR_HACK_DECL_RE = /\s*\*[a-zA-Z-]+\s*:[^;}]*;/g;

// Strip `*`-prefixed declarations only OUTSIDE comments/strings (the naive
// regex would also rewrite `/*text-align:left;/*center;*/` style comments).
function stripStarHacks(css) {
  const nonCode = /\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = nonCode.exec(css))) {
    out += css.slice(last, m.index).replace(STAR_HACK_DECL_RE, "");
    out += m[0];
    last = m.index + m[0].length;
  }
  out += css.slice(last).replace(STAR_HACK_DECL_RE, "");
  return out;
}

/** Find the raw text between `@layer legacy {` and its matching `}`. */
function extractLayerContent(css) {
  const needle = "@layer legacy {";
  const start = css.indexOf(needle);
  if (start === -1) throw new Error("fallback css: `@layer legacy {` not found");
  let depth = 0;
  let index = start + needle.length - 1; // position of '{'
  for (; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error("fallback css: unbalanced braces in @layer legacy block");
  const innerStart = start + needle.length;
  return {
    inner: css.slice(innerStart, index), // between '{' and matching '}'
    layerEnd: index,
  };
}

const URL_TOKEN_RE = /url\(\s*(?:(["'])(.*?)\1|([^)'"\s]+))\s*\)/g;

/** Rewrite every url() in css text, applying the per-token resolver. */
function rewriteUrls(css, resolveToken) {
  return css.replace(URL_TOKEN_RE, (full, quote, quoted, unquoted) => {
    const token = quoted ?? unquoted;
    const rewritten = resolveToken(token);
    if (rewritten === null) return full; // data: untouched
    return `url("${rewritten}")`;
  });
}

/**
 * Relocation plan for one url token.
 * @param {object} [paths] test seam — defaults to the real tree
 * @returns {{ action: "reuse"|"copy"|"missing"|"data", rewritten: string|null, detail: string }}
 */
export function planUrl(token, report, paths = {}) {
  const fDir = paths.fallbackDir ?? fallbackDir;
  const aRoot = paths.legacyAssetRoot ?? legacyAssetRoot;
  const pubRoot = paths.legacyAssetsPublicRoot ?? legacyAssetsPublicRoot;
  if (token.startsWith("data:")) return { action: "data", rewritten: null, detail: "data-uri" };
  const [pathPart, ...rest] = token.split(/[?#]/);
  const suffix = rest.length > 0 ? token.slice(pathPart.length) : "";
  const sourceFile = path.resolve(fDir, pathPart);
  // Destination mirrors the path under public/legacy-assets, with the
  // `stylesheets/` prefix stripped (matches the existing src/assets/legacy
  // layout, e.g. yobicon/fonts/yobicon.woff).
  const relToPublic = path.relative(pubRoot, sourceFile);
  const relToDest = relToPublic.replace(/^stylesheets[/\\]/, "");
  const destFile = path.join(aRoot, relToDest);
  const rewrite = (targetFile) => `./assets/legacy/${path.relative(aRoot, targetFile)}${suffix}`;

  if (!fs.existsSync(sourceFile)) {
    report.push(`  MISSING source (kept broken, same as pre-merge): ${token}`);
    return {
      action: "missing",
      rewritten: rewrite(destFile),
      detail: `${token} -> ${rewrite(destFile)}`,
    };
  }
  const sourceSha = sha256(fs.readFileSync(sourceFile));
  if (fs.existsSync(destFile)) {
    const destSha = sha256(fs.readFileSync(destFile));
    if (destSha !== sourceSha) {
      throw new Error(
        `asset SHA conflict: ${token} -> ${destFile}\n  source sha256=${sourceSha}\n  dest   sha256=${destSha}`,
      );
    }
    return {
      action: "reuse",
      rewritten: rewrite(destFile),
      detail: `${token} -> ${rewrite(destFile)} (dest exists, sha equal)`,
    };
  }
  // Destination missing: prefer reusing an identical-content file already
  // owned by Vite under src/assets/legacy (no duplicate copies).
  for (const candidate of walkFiles(aRoot)) {
    if (sha256(fs.readFileSync(candidate)) === sourceSha) {
      return {
        action: "reuse",
        rewritten: rewrite(candidate),
        detail: `${token} -> ${rewrite(candidate)} (content reuse)`,
      };
    }
  }
  return {
    action: "copy",
    rewritten: rewrite(destFile),
    destFile,
    sourceFile,
    detail: `${token} -> ${rewrite(destFile)} (copy)`,
  };
}

function* walkFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (entry.isFile()) yield full;
  }
}

function buildMergedBlock() {
  // The public fallback file is deleted post-cutover; re-runs read the frozen
  // artifact from git (same bytes as the original merge).
  let fallback;
  if (fs.existsSync(fallbackPath)) {
    fallback = fs.readFileSync(fallbackPath, "utf8");
  } else {
    const result = spawnSync(
      "git",
      ["show", `HEAD:frontend/public/legacy-assets/stylesheets/legacy-fallback.css`],
      { encoding: "utf8", cwd: repoRoot },
    );
    if (result.status !== 0) {
      throw new Error("fallback css unavailable on disk and in git HEAD");
    }
    fallback = result.stdout;
  }
  const artifactSha = sha256(fallback);
  const manifestDiskPath = fs.existsSync(manifestPath)
    ? manifestPath
    : path.join(repoRoot, "docs", "provenance", "legacy-css-merged.manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestDiskPath, "utf8"));
  if (manifest.artifactSha256 !== artifactSha) {
    throw new Error(
      `fallback artifact sha mismatch with manifest:\n  file sha256=${artifactSha}\n  manifest artifactSha256=${manifest.artifactSha256}`,
    );
  }
  const { inner } = extractLayerContent(fallback);
  const report = [];
  const copyDestinations = new Map(); // destFile -> { sourceFile, tokens: [] }
  let reuses = 0;
  let missing = 0;
  const rewritten = rewriteUrls(stripStarHacks(inner), (token) => {
    const plan = planUrl(token, report);
    if (plan.action === "copy") {
      const entry = copyDestinations.get(plan.destFile) ?? {
        sourceFile: plan.sourceFile,
        tokens: [],
      };
      entry.tokens.push(token);
      copyDestinations.set(plan.destFile, entry);
    } else if (plan.action === "reuse") {
      reuses += 1;
      report.push(`  REUSE ${plan.detail}`);
    } else if (plan.action === "missing") {
      missing += 1;
      report.push(`  MISSING ${plan.detail}`);
    }
    return plan.rewritten;
  });
  const copies = copyDestinations.size;
  const starHacksStripped = (inner.match(STAR_HACK_DECL_RE) ?? []).length;
  return {
    artifactSha,
    block: `@layer legacy {\n${rewritten}\n}\n`,
    report,
    copies,
    copyDestinations,
    reuses,
    missing,
    starHacksStripped,
  };
}

function applyMerge({ dryRun }) {
  const { artifactSha, block, report, copies, copyDestinations, reuses, missing } =
    buildMergedBlock();
  const appCss = fs.readFileSync(appCssPath, "utf8");
  const markerOpen = `${BEGIN_MARKER} (sha256:${artifactSha}) */`;
  const markerClose = `${END_MARKER}`;
  const inserted = `${markerOpen}\n${block}${markerClose}\n`;
  let next;
  const beginAt = appCss.indexOf(BEGIN_MARKER);
  if (beginAt !== -1) {
    const endAt = appCss.indexOf(END_MARKER, beginAt);
    if (endAt === -1)
      throw new Error("app.css: BEGIN marker without END marker — manual repair needed");
    next = appCss.slice(0, beginAt) + inserted + appCss.slice(endAt + END_MARKER.length);
  } else {
    const anchor = "\n@layer legacy {";
    const anchorAt = appCss.indexOf(anchor);
    if (anchorAt === -1) throw new Error("app.css: `@layer legacy {` anchor not found");
    next = appCss.slice(0, anchorAt + 1) + inserted + appCss.slice(anchorAt + 1);
  }
  console.log(`[merge-legacy-fallback] artifact sha256=${artifactSha}`);
  console.log(
    `[merge-legacy-fallback] assets: ${copies} distinct copy, ${reuses} reuse, ${missing} missing-source`,
  );
  if (report.length > 0) console.log(`[merge-legacy-fallback] asset report:\n${report.join("\n")}`);
  if (dryRun) {
    console.log("[merge-legacy-fallback] dry-run — app.css not modified");
    return;
  }
  for (const [destFile, { sourceFile }] of copyDestinations) {
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.copyFileSync(sourceFile, destFile);
    console.log(
      `[merge-legacy-fallback] copied ${path.relative(frontendRoot, sourceFile)} -> ${path.relative(frontendRoot, destFile)}`,
    );
  }
  fs.writeFileSync(appCssPath, next);
  console.log("[merge-legacy-fallback] app.css updated (idempotent marker block)");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const dryRun = process.argv.includes("--dry-run");
  applyMerge({ dryRun });
}
