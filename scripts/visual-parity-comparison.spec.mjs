import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVisualComparison,
  summarizeVisualComparison,
} from "./visual-parity-comparison.mjs";

test("buildVisualComparison flags legacy-normal to local-error pages", () => {
  const comparison = buildVisualComparison({
    legacyResults: [
      {
        path: "/projects",
        ok: true,
        status: 200,
        metrics: { bodyTextLength: 100, isErrorPage: false },
      },
    ],
    localResults: [
      {
        path: "/projects",
        ok: true,
        status: 404,
        errors: [],
        metrics: { bodyTextLength: 50, isErrorPage: true, stylesheetRules: 399 },
      },
    ],
  });

  assert.equal(comparison[0].statusDelta, "200->404");
  assert.deepEqual(comparison[0].diffErrors, [
    "legacy renders a normal page but local renders an error page",
  ]);
});

test("summarizeVisualComparison records status deltas without treating legacy-missing as a delta", () => {
  const summary = summarizeVisualComparison([
    {
      path: "/a",
      legacyOk: true,
      localOk: true,
      localErrors: [],
      diffErrors: [],
      statusDelta: "200->200",
      textLengthDelta: 0,
      localStylesheetRules: 1,
    },
    {
      path: "/b",
      legacyOk: true,
      localOk: true,
      localErrors: [],
      diffErrors: [],
      statusDelta: "404->200",
      textLengthDelta: 10,
      localStylesheetRules: 1,
    },
    {
      path: "/c",
      legacyOk: null,
      localOk: true,
      localErrors: [],
      diffErrors: [],
      statusDelta: "legacy-missing",
      textLengthDelta: null,
      localStylesheetRules: 1,
    },
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.compared, 2);
  assert.equal(summary.legacyMissing, 1);
  assert.equal(summary.statusDeltas.length, 1);
  assert.deepEqual(summary.statusDeltas[0], {
    path: "/b",
    statusDelta: "404->200",
    legacyOk: true,
    localOk: true,
  });
});
