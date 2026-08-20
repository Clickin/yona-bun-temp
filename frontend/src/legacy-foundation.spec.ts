import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Post-merge: the frozen legacy fallback content lives inside app.css between
// the BEGIN/END markers (single global baseline stylesheet entry); the
// generation manifest moved to docs/provenance as a provenance artifact.
const manifest = JSON.parse(
  readFileSync(
    new URL("../../docs/provenance/legacy-css-merged.manifest.json", import.meta.url),
    "utf8",
  ),
) as {
  artifactSha256: string;
  runtime: boolean;
  mergedInto: string;
  layeredViteInputs: Array<{
    id: string;
    input: string;
    layer: string;
    sourceFiles: Array<{ path: string; sha256: string }>;
  }>;
  sources: Array<{ cascadeIndex: number; id: string }>;
};
const appCss = readFileSync(new URL("./app.css", import.meta.url), "utf8");
const yobiconFoundation = readFileSync(new URL("./yobicon-font.css", import.meta.url), "utf8");
const frozenYobicon = readFileSync(
  new URL("../../yona-original/public/stylesheets/yobicon/style.css", import.meta.url),
  "utf8",
);

function mergedLegacyBlock(): string {
  const begin = appCss.indexOf("/* BEGIN merged frozen legacy-fallback");
  const end = appCss.indexOf("/* END merged frozen legacy-fallback */", begin);
  if (begin === -1 || end === -1) {
    throw new Error("merged legacy block markers missing in app.css");
  }
  return appCss.slice(begin, end + "/* END merged frozen legacy-fallback */".length);
}

const yobiconFontSources = ["yobicon.eot", "yobicon.woff", "yobicon.ttf", "yobicon.svg"] as const;
const yobiconAssets = ["yobicon.dev.svg", ...yobiconFontSources] as const;

test("the merged legacy block is deterministic and preserves the frozen cascade order", () => {
  const marker = /\/\* BEGIN merged frozen legacy-fallback \(sha256:([0-9a-f]+)\) \*\//u.exec(
    mergedLegacyBlock(),
  );
  expect(marker?.[1]).toBe(manifest.artifactSha256);
  expect(manifest.runtime).toBe(false);
  expect(manifest.mergedInto).toBe("frontend/src/app.css");
  expect(manifest.sources.map(({ cascadeIndex, id }) => [cascadeIndex, id])).toEqual([
    [0, "bootstrap"],
    [1, "yobicon"],
    [2, "select2"],
    [3, "pikaday"],
    [4, "usermenu"],
    [5, "yobi"],
    [6, "nprogress"],
    [7, "viewer"],
    [8, "magnific-popup"],
  ]);
  expect(mergedLegacyBlock()).toContain("@layer legacy {");
});

test("the frontend loads a single global baseline stylesheet entry", () => {
  const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  expect(indexHtml).not.toContain("legacy-fallback.css");
  expect(indexHtml).not.toMatch(
    /(?:bootstrap\/css\/bootstrap|stylesheets\/(?:usermenu|yobi))\.css/u,
  );
});

test("the Vite-owned Yobicon foundation preserves the frozen font-face source mapping", () => {
  expect(yobiconFoundation).toContain('font-family: "yobicon";');
  expect(frozenYobicon).toContain("font-family: 'yobicon';");
  for (const font of yobiconFontSources) {
    const sourcePath = `./assets/legacy/yobicon/fonts/${font}`;
    expect(yobiconFoundation).toContain(`url("${sourcePath}`);
    expect(
      createHash("sha256")
        .update(readFileSync(new URL(`./assets/legacy/yobicon/fonts/${font}`, import.meta.url)))
        .digest("hex"),
    ).toBe(
      createHash("sha256")
        .update(
          readFileSync(
            new URL(`../public/legacy-assets/stylesheets/yobicon/fonts/${font}`, import.meta.url),
          ),
        )
        .digest("hex"),
    );
  }
  for (const font of yobiconAssets) {
    expect(
      createHash("sha256")
        .update(readFileSync(new URL(`./assets/legacy/yobicon/fonts/${font}`, import.meta.url)))
        .digest("hex"),
    ).toBe(
      createHash("sha256")
        .update(
          readFileSync(
            new URL(`../public/legacy-assets/stylesheets/yobicon/fonts/${font}`, import.meta.url),
          ),
        )
        .digest("hex"),
    );
  }
  expect(yobiconFoundation).toContain('format("embedded-opentype")');
  expect(yobiconFoundation).toContain('format("woff")');
  expect(yobiconFoundation).toContain('format("truetype")');
  expect(yobiconFoundation).toContain('format("svg")');
});

test("app.css declares the explicit effective layer order contract", () => {
  expect(appCss).toContain("@layer homeb, legacy, theme, utilities;");
  expect(appCss).toContain('@import "tailwindcss/theme.css" layer(theme)');
  expect(appCss).toContain('@import "tailwindcss/utilities.css" layer(utilities)');
});

test("all non-Style Vite CSS inputs explicitly join the legacy layer", () => {
  const dynatreeBridge = readFileSync(
    new URL("./routes/$ownerName/$projectName/code/legacy-dynatree.css", import.meta.url),
    "utf8",
  );
  const codeRoute = readFileSync(
    new URL("./routes/$ownerName/$projectName/code/$branch.tsx", import.meta.url),
    "utf8",
  );

  expect(appCss).toContain("@layer legacy {");
  expect(dynatreeBridge).toContain('ui.dynatree.css" layer(legacy)');
  expect(codeRoute).toContain('import "./legacy-dynatree.css";');
  expect(codeRoute).not.toContain(
    'import "../../../../../../yona-original/public/stylesheets/dynatree/skin/ui.dynatree.css";',
  );
  expect(manifest.layeredViteInputs.map(({ id, input, layer }) => [id, input, layer])).toEqual([
    ["react-app", "frontend/src/app.css", "legacy"],
    ["dynatree", "frontend/src/routes/$ownerName/$projectName/code/legacy-dynatree.css", "legacy"],
  ]);
});
