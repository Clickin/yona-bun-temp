import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import less from "less";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(frontendRoot, "..");
const outputRuntimePath = "legacy-assets/stylesheets/legacy-fallback.css";
const outputPath = path.join(frontendRoot, "public", outputRuntimePath);
const manifestPath = path.join(
  frontendRoot,
  "public/legacy-assets/stylesheets/legacy-fallback.manifest.json",
);

const runtimeCascade = [
  css(
    "bootstrap",
    "yona-original/public/bootstrap/css/bootstrap.css",
    "legacy-assets/bootstrap/css/bootstrap.css",
    "frozen",
  ),
  css(
    "yobicon",
    "yona-original/public/stylesheets/yobicon/style.css",
    "legacy-assets/stylesheets/yobicon/style.css",
    "plugin",
  ),
  css(
    "select2",
    "yona-original/public/javascripts/lib/select2/select2.css",
    "legacy-assets/javascripts/lib/select2/select2.css",
    "plugin",
  ),
  css(
    "pikaday",
    "yona-original/public/javascripts/lib/pikaday/pikaday.css",
    "legacy-assets/javascripts/lib/pikaday/pikaday.css",
    "plugin",
  ),
  lessCss(
    "usermenu",
    "yona-original/app/assets/stylesheets/usermenu.less",
    "legacy-assets/stylesheets/usermenu.css",
  ),
  lessCss(
    "yobi",
    "yona-original/app/assets/stylesheets/yobi.less",
    "legacy-assets/stylesheets/yobi.css",
  ),
  css(
    "nprogress",
    "yona-original/public/javascripts/lib/nprogress/nprogress.css",
    "legacy-assets/javascripts/lib/nprogress/nprogress.css",
    "plugin",
  ),
  css(
    "viewer",
    "yona-original/public/javascripts/lib/viewerjs/viewer.css",
    "legacy-assets/javascripts/lib/viewerjs/viewer.css",
    "plugin",
  ),
  css(
    "magnific-popup",
    "yona-original/public/javascripts/lib/magnific-popup/magnific-popup.css",
    "legacy-assets/javascripts/lib/magnific-popup/magnific-popup.css",
    "plugin",
  ),
];

assertUnique(
  runtimeCascade.map(({ id }) => id),
  "runtime cascade id",
);
assertUnique(
  runtimeCascade.map(({ runtimePath }) => runtimePath),
  "runtime cascade path",
);

const deadYobiFallbackSelectors = [
  ".all-projects .project .info-wrap .forked",
  ".all-projects .project .stats-wrap .like",
  ".all-projects .project .stats-wrap .like .num",
  ".all-projects .project .stats-wrap .like .ico",
  ".profile-frmwrap .avatar-frm",
  ".profile-frmwrap .avatar-frm .avatar-wrap",
  ".profile-frmwrap .avatar-frm .avatar-wrap .progress",
  ".profile-frmwrap .avatar-frm .avatar-wrap .progress.loading",
  ".profile-frmwrap .avatar-frm .btn-wrap",
  ".profile-frmwrap .avatar-frm .btn-wrap .nbtn i",
];

const renderedSources = [];
const sourceManifest = [];
for (const [cascadeIndex, entry] of runtimeCascade.entries()) {
  const inputPath = path.join(repoRoot, entry.input);
  const source = await fs.readFile(inputPath, "utf8");
  const sourceFiles =
    entry.kind === "less" ? await lessSourceFiles(inputPath, source) : [inputPath];
  const rendered =
    entry.kind === "less"
      ? (
          await less.render(source, {
            filename: inputPath,
            math: "always",
            paths: [path.dirname(inputPath)],
          })
        ).css
      : source;
  const normalized = retireDeadYobiSelectors(
    rewriteRelativeUrls(stripCharset(rendered), entry.runtimePath),
    entry.id,
  );
  renderedSources.push(`/* source:${entry.id} */\n${normalized.trim()}\n`);
  sourceManifest.push({
    cascadeIndex,
    id: entry.id,
    role: entry.role,
    runtimePath: entry.runtimePath,
    sourceFiles: await Promise.all(
      sourceFiles.map(async (sourcePath) => ({
        path: path.relative(repoRoot, sourcePath).split(path.sep).join("/"),
        sha256: sha256(await fs.readFile(sourcePath)),
      })),
    ),
  });
}

const artifact = `@charset "UTF-8";\n@layer legacy {\n${renderedSources.join("\n")}\n/* Wave 0 nonvisual precedence probe; both layers preserve display: contents. */\n#main [data-stylex-root-boundary] {\n  --yoram-stylex-root-boundary: legacy;\n  display: contents;\n}\n}\n`;
const artifactSha256 = sha256(artifact);
const layeredViteInputs = await Promise.all([
  layeredViteInput("react-app", "frontend/src/app.css", "react-parity"),
  layeredViteInput(
    "dynatree",
    "frontend/src/routes/$ownerName/$projectName/code/legacy-dynatree.css",
    "plugin",
    ["yona-original/public/stylesheets/dynatree/skin/ui.dynatree.css"],
  ),
]);
const manifest = {
  schemaVersion: 1,
  artifact: outputRuntimePath,
  artifactSha256,
  layer: "legacy",
  activeFrozen: ["bootstrap", "usermenu", "yobi"],
  pluginPassthrough: ["yobicon", "select2", "pikaday", "nprogress", "viewer", "magnific-popup"],
  layeredViteInputs,
  referenceOnly: [
    {
      id: "bootstrap-responsive",
      path: "yona-original/public/bootstrap/css/bootstrap-responsive.css",
      reason: "inactive in legacy layout.scala.html and retained as parity evidence",
      sha256: sha256(
        await fs.readFile(
          path.join(repoRoot, "yona-original/public/bootstrap/css/bootstrap-responsive.css"),
        ),
      ),
    },
  ],
  precedenceProbe: "#main [data-stylex-root-boundary]",
  sources: sourceManifest,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, artifact);
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${path.relative(repoRoot, outputPath)} sha256:${artifactSha256}`);

function css(id, input, runtimePath, role) {
  return { id, input, kind: "css", role, runtimePath };
}

function lessCss(id, input, runtimePath) {
  return { id, input, kind: "less", role: "frozen", runtimePath };
}

async function layeredViteInput(id, input, role, dependencies = []) {
  return {
    id,
    input,
    layer: "legacy",
    role,
    sourceFiles: await Promise.all(
      [input, ...dependencies].map(async (sourcePath) => ({
        path: sourcePath,
        sha256: sha256(await fs.readFile(path.join(repoRoot, sourcePath))),
      })),
    ),
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stripCharset(cssText) {
  return cssText.replace(/^\s*@charset\s+["'][^"']+["'];\s*/iu, "");
}

function rewriteRelativeUrls(cssText, sourceRuntimePath) {
  const sourceDirectory = path.posix.dirname(sourceRuntimePath);
  const outputDirectory = path.posix.dirname(outputRuntimePath);
  return cssText.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/giu, (match, quote, value) => {
    const trimmed = value.trim();
    if (/^(?:data:|https?:|\/|#)/iu.test(trimmed)) {
      return match;
    }
    const suffixIndex = trimmed.search(/[?#]/u);
    const pathname = suffixIndex === -1 ? trimmed : trimmed.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? "" : trimmed.slice(suffixIndex);
    const absoluteRuntimePath = path.posix.normalize(path.posix.join(sourceDirectory, pathname));
    const relativePath = path.posix.relative(outputDirectory, absoluteRuntimePath) || ".";
    return `url(${quote}${relativePath}${suffix}${quote})`;
  });
}

function retireDeadYobiSelectors(cssText, sourceId) {
  if (sourceId !== "yobi") {
    return cssText;
  }

  let rendered = cssText;
  for (const selector of deadYobiFallbackSelectors) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const rule = new RegExp(`(^|\\n)${escapedSelector}\\s*\\{[^{}]*\\}\\s*`, "gu");
    const matches = [...rendered.matchAll(rule)];
    if (matches.length !== 1) {
      throw new Error(
        `Expected exactly one rendered Yobi rule for dead fallback selector ${selector}, found ${matches.length}.`,
      );
    }
    rendered = rendered.replace(rule, "$1");
  }
  return rendered;
}

async function lessSourceFiles(entryPath, source) {
  const imports = [...source.matchAll(/^\s*@import\s+["']([^"']+)["'];/gmu)].map(([, importPath]) =>
    path.resolve(path.dirname(entryPath), importPath),
  );
  assertUnique(imports, `${path.relative(repoRoot, entryPath)} import`);
  for (const importPath of imports) {
    await fs.access(importPath);
  }
  return [entryPath, ...imports];
}

function assertUnique(values, label) {
  if (new Set(values).size !== values.length) {
    throw new Error(`Duplicate ${label} in legacy fallback manifest.`);
  }
}
