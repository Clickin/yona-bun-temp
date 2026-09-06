import assert from "node:assert/strict";
import { test } from "node:test";

import { DOMAIN_REGISTRY } from "./scenarios/index.mjs";

const { actionDefinitions } = DOMAIN_REGISTRY.userorg;

test("direct notification DOM target preserves the required legacy query", async () => {
  const rendered = [];
  const definition = actionDefinitions["view-notifications"];

  await definition.handler({
    step: { action: "view-notifications", params: { path: "/notification" } },
    resolved: {},
    options: { legacyUrl: "http://legacy.test" },
    yoramBaseUrl: "http://yoram.test",
    helpers: {
      requestBoth: async () => {},
      renderDomTarget: async (_ctx, target) => rendered.push(target),
    },
  });

  assert.deepEqual(rendered, [
    {
      legacy: "http://legacy.test/notification?from=0&limit=10",
      yoram: "http://yoram.test/notification?from=0&limit=10",
      spa: true,
      selector: ".page-wrap",
    },
  ]);
});
