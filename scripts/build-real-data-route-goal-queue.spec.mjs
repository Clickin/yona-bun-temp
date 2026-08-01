import test from "node:test";
import assert from "node:assert/strict";
import { routePatternForPath, buildRouteGoalQueue } from "./build-real-data-route-goal-queue.mjs";

test("route goal queue maps concrete paths to the most specific legacy pattern", () => {
  assert.equal(
    routePatternForPath("/alice/sample/issue/42", ["/*paths", "/:owner/:project/issues", "/:owner/:project/issue/:number"]),
    "/:owner/:project/issue/:number",
  );
});

test("route goal queue preserves every live path and does not mark auth-blocked screens covered", () => {
  const queue = buildRouteGoalQueue({
    manifest: {
      liveLegacyPaths: ["/", "/alice/sample/issues"],
      legacyRoutePatterns: ["/", "/:owner/:project/issues"],
      knownLegacyOnlyGaps: [],
    },
    desktop: {
      legacy: { authStatus: "AUTH_BLOCKED" },
      local: { authStatus: "AUTH_BLOCKED" },
      comparison: [{ path: "/", legacyOk: true, localOk: true, statusDelta: "200->200", diffErrors: [], localErrors: [] }],
    },
    mobile: {
      legacy: { authStatus: "AUTH_BLOCKED" },
      local: { authStatus: "AUTH_BLOCKED" },
      comparison: [{ path: "/", legacyOk: true, localOk: true, statusDelta: "200->200", diffErrors: [], localErrors: [] }],
    },
  });
  assert.equal(queue.entries.length, 2);
  assert.equal(queue.counts.classifications.AUTH_BLOCKED, 2);
  assert.equal(queue.entries.some((entry) => entry.classification === "COVERED"), false);
});
