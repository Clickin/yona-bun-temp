import { expect, test } from "vitest";
import { legacyFallbackEnabled, transformLegacyFallbackLink } from "./legacy-fallback-mode";

const indexHtml = `<head>
  <link
    rel="stylesheet"
    type="text/css"
    media="all"
    href="./legacy-assets/stylesheets/legacy-fallback.css"
  />
</head>`;

test("legacy fallback is enabled unless the destructive discovery mode is explicit", () => {
  expect(legacyFallbackEnabled(undefined)).toBe(true);
  expect(legacyFallbackEnabled("0")).toBe(true);
  expect(legacyFallbackEnabled("1")).toBe(false);
});

test("fallback-off transform removes only the generated fallback entry", () => {
  expect(transformLegacyFallbackLink(indexHtml, false)).not.toContain("legacy-fallback.css");
  expect(transformLegacyFallbackLink(indexHtml, true)).toBe(indexHtml);
});
