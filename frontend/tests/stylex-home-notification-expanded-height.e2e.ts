import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
const routeSource = new URL("../src/routes/-home-route-screen.tsx", import.meta.url);
test("home notification expanded min-height uses Dynamic StyleX", async () => {
  const route = await readFile(routeSource, "utf8");
  expect(route).toContain('data-stylex-part="authenticated-home-notification-expanded-height"');
  expect(route).toContain("expandedMinHeight(expandedMinHeight)");
  expect(route).not.toContain(
    "style={expandedMinHeight ? { minHeight: expandedMinHeight } : undefined}",
  );
});
