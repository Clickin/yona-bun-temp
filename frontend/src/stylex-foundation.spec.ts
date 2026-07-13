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
  sources: Array<{ cascadeIndex: number; id: string }>;
};
const fallback = readFileSync(
  new URL("../public/legacy-assets/stylesheets/legacy-fallback.css", import.meta.url),
  "utf8",
);

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
