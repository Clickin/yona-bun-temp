import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const manifest = JSON.parse(
  readFileSync(
    new URL("../public/legacy-assets/stylesheets/legacy-fallback.manifest.json", import.meta.url),
    "utf8",
  ),
) as {
  artifactSha256: string;
  layeredViteInputs: Array<{
    id: string;
    input: string;
    layer: string;
    sourceFiles: Array<{ path: string; sha256: string }>;
  }>;
  sources: Array<{ cascadeIndex: number; id: string }>;
};
const fallback = readFileSync(
  new URL("../public/legacy-assets/stylesheets/legacy-fallback.css", import.meta.url),
  "utf8",
);
const yobiconFoundation = readFileSync(new URL("./yobicon-font.css", import.meta.url), "utf8");
const frozenYobicon = readFileSync(
  new URL("../../yona-original/public/stylesheets/yobicon/style.css", import.meta.url),
  "utf8",
);

const yobiconFontSources = ["yobicon.eot", "yobicon.woff", "yobicon.ttf", "yobicon.svg"] as const;
const yobiconAssets = ["yobicon.dev.svg", ...yobiconFontSources] as const;

test("the generated legacy fallback is deterministic and preserves runtime cascade order", () => {
  expect(createHash("sha256").update(fallback).digest("hex")).toBe(manifest.artifactSha256);
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
  expect(fallback).toContain("@layer legacy {");
});

test("the frontend loads only the generated legacy fallback entry", () => {
  const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  expect(indexHtml).toContain("./legacy-assets/stylesheets/legacy-fallback.css");
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

test("all non-StyleX Vite CSS inputs explicitly join the legacy layer", () => {
  const appCss = readFileSync(new URL("./app.css", import.meta.url), "utf8");
  const dynatreeBridge = readFileSync(
    new URL("./routes/$ownerName/$projectName/code/legacy-dynatree.css", import.meta.url),
    "utf8",
  );
  const codeRoute = readFileSync(
    new URL("./routes/$ownerName/$projectName/code/$branch.tsx", import.meta.url),
    "utf8",
  );

  expect(appCss.trimStart()).toMatch(/^@layer legacy\s*\{/u);
  expect(dynatreeBridge).toContain('ui.dynatree.css" layer(legacy)');
  expect(codeRoute).toContain('import "./legacy-dynatree.css";');
  expect(codeRoute).not.toContain(
    'import "../../../../../../yona-original/public/stylesheets/dynatree/skin/ui.dynatree.css";',
  );
  expect(manifest.layeredViteInputs.map(({ id, input, layer }) => [id, input, layer])).toEqual([
    ["react-app", "frontend/src/app.css", "legacy"],
    ["dynatree", "frontend/src/routes/$ownerName/$projectName/code/legacy-dynatree.css", "legacy"],
  ]);
  for (const entry of manifest.layeredViteInputs) {
    for (const source of entry.sourceFiles) {
      expect(
        createHash("sha256")
          .update(readFileSync(new URL(`../../${source.path}`, import.meta.url)))
          .digest("hex"),
      ).toBe(source.sha256);
    }
  }
});
