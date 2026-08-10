import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL("../src/routes/-home-route-screen.tsx", import.meta.url);
test("home notification expanded min-height uses Dynamic Style", async () => {
  const route = await readFile(routeSource, "utf8");
  expect(route).toContain('data-part="authenticated-home-notification-expanded-height"');
});
