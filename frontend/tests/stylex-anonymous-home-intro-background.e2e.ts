import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
const routeSource = new URL("../src/routes/-home-route-screen.tsx", import.meta.url);
test("anonymous home intro background uses Dynamic StyleX", async () => {
  const route = await readFile(routeSource, "utf8");
  expect(route).toContain("anonymousHomeIntroDynamicStyles.background(siteIntroBackgroundUrl)");
  expect(route).not.toContain('"--siteintro-background-image": `url("${siteIntroBackgroundUrl}")`');
});
