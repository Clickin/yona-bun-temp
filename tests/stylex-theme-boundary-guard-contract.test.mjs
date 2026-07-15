import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateRepositoryStylexThemeBoundary,
  evaluateStylexThemeBoundary,
} from "../tools/stylex-theme-boundary-guard.mjs";

test("current frontend has no globalColors catch-all registry", () => {
  const result = evaluateRepositoryStylexThemeBoundary(process.cwd());
  assert.equal(result.blocked, false, result.violations.join("\n"));
});

test("guard rejects catch-all definitions and consumers", () => {
  const result = evaluateStylexThemeBoundary({
    sources: new Map([
      [
        "frontend/src/theme.stylex.ts",
        "export const globalColors = stylex.defineVars({ width: '10px' });",
      ],
      ["frontend/src/routes/example.tsx", "const color = globalColors.exampleRouteSurface;"],
    ]),
  });

  assert.equal(result.blocked, true);
  assert.equal(result.violations.length, 2);
});
