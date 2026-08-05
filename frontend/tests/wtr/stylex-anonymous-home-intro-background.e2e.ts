import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL("../src/routes/-home-route-screen.tsx", import.meta.url);
test("anonymous home intro background uses Dynamic StyleX", async () => {
  const route = await readFile(routeSource, "utf8");
  expect(route).toContain(
    "anonymousHomeIntroDynamicStyles.background(viteOwnedSiteIntroBackgroundUrl)",
  );
  expect(route).not.toContain('"--siteintro-background-image": `url("${siteIntroBackgroundUrl}")`');
});
