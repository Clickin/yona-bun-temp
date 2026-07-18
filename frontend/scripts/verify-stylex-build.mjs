import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  await fs.readFile(
    path.join(frontendRoot, "public/legacy-assets/stylesheets/legacy-fallback.manifest.json"),
    "utf8",
  ),
);
const sourceArtifact = await fs.readFile(path.join(frontendRoot, "public", manifest.artifact));
const builtArtifact = await fs.readFile(path.join(frontendRoot, "dist", manifest.artifact));
assert(sha256(sourceArtifact) === manifest.artifactSha256, "source fallback hash mismatch");
assert(sha256(builtArtifact) === manifest.artifactSha256, "built fallback hash mismatch");
const artifactText = sourceArtifact.toString("utf8");
for (const expectedUrl of [
  'url("../bootstrap/images/glyphicons-halflings.png")',
  "url('yobicon/fonts/yobicon.woff')",
  "url('../javascripts/lib/select2/select2.png')",
  "url('../images/sprite.png')",
]) {
  assert(artifactText.includes(expectedUrl), `rewritten fallback URL missing: ${expectedUrl}`);
}
const sourceMarkers = manifest.sources.map(({ id }) => `/* source:${id} */`);
assert(
  sourceMarkers.every(
    (marker, index) =>
      index === 0 || artifactText.indexOf(sourceMarkers[index - 1]) < artifactText.indexOf(marker),
  ),
  "generated fallback source order differs from manifest",
);

const builtHtml = await fs.readFile(path.join(frontendRoot, "dist/index.html"), "utf8");
const fallbackHref = `./${manifest.artifact}`;
assert(builtHtml.includes(`href="${fallbackHref}"`), "production HTML misses relative fallback");
assert(!builtHtml.includes("stylesheets/yobi.css"), "production HTML still links yobi.css");
assert(!builtHtml.includes("stylesheets/usermenu.css"), "production HTML still links usermenu.css");
assert(
  !builtHtml.includes("bootstrap/css/bootstrap.css"),
  "production HTML still links bootstrap.css",
);

const cssDirectory = path.join(frontendRoot, "dist/assets");
const cssFiles = (await fs.readdir(cssDirectory)).filter((file) => file.endsWith(".css"));
const stylexAssets = [];
for (const file of cssFiles) {
  const cssText = await fs.readFile(path.join(cssDirectory, file), "utf8");
  assertOnlyLayeredTopLevelRules(cssText, file);
  if (cssText.includes("@layer stylex.priority")) {
    stylexAssets.push({ cssText, file });
  }
}
assert(stylexAssets.length === 1, `expected one StyleX CSS asset, found ${stylexAssets.length}`);
const [{ cssText: stylexCss, file: stylexFile }] = stylexAssets;
assert(
  stylexCss.indexOf("@layer legacy;") < stylexCss.indexOf("@layer stylex.priority"),
  "StyleX CSS does not declare legacy before its priority layers",
);
assert(stylexCss.includes("--yoram-stylex-root-boundary: stylex"), "root StyleX probe missing");
assert(
  builtHtml.indexOf(fallbackHref) < builtHtml.indexOf(`./assets/${stylexFile}`),
  "legacy fallback link must precede the production StyleX asset",
);
console.log(`verified ${manifest.artifactSha256} before ${stylexFile}`);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertOnlyLayeredTopLevelRules(cssText, file) {
  let depth = 0;
  let statementStart = 0;
  let quote = "";
  let comment = false;
  for (let index = 0; index < cssText.length; index += 1) {
    const character = cssText[index];
    const next = cssText[index + 1];
    if (comment) {
      if (character === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "/" && next === "*") {
      comment = true;
      index += 1;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "{") {
      if (depth === 0) {
        const prelude = cssText.slice(statementStart, index).trim();
        assert(
          /^@layer\b/u.test(prelude) ||
            /^@property\s+--x-[\w-]+\s*$/u.test(prelude) ||
            /^(?::root,\s+)?\.x[\w.-]+(?:,\s+[^{}]+)?\s*$/u.test(prelude),
          `${file} has an unlayered top-level rule: ${prelude}`,
        );
      }
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) statementStart = index + 1;
    } else if (character === ";" && depth === 0) {
      statementStart = index + 1;
    }
  }
  assert(depth === 0, `${file} has unbalanced CSS blocks`);
}
