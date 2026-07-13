import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("StyleX owns the root React event boundary without changing its display behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: true },
    });
  });

  await page.goto(`${basePath}/`);

  const boundary = page.locator("#main > div").first();
  await expect(boundary).toHaveCSS("display", "contents");
  await expect(boundary).not.toHaveAttribute("style");
  await expect(boundary).toHaveAttribute("class", /\bx/);

  const cssResponse = await page.request.get(new URL("/virtual:stylex.css", page.url()).toString());
  expect(cssResponse.ok()).toBe(true);
  expect(await cssResponse.text()).toMatch(/display:\s*contents/u);
});

test("Vite places the official StyleX plugin before route and React transforms", () => {
  const viteSource = readFileSync("vite.config.ts", "utf8");
  const rootSource = readFileSync("src/routes/__root.tsx", "utf8");

  expect(viteSource).toContain('import stylex from "@stylexjs/unplugin"');
  expect(viteSource.indexOf("stylex.vite()")).toBeLessThan(viteSource.indexOf("tanstackRouter({"));
  expect(rootSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(rootSource).toContain("...stylex.props(styles.rootEventBoundary)");
  expect(rootSource).not.toContain('style={{ display: "contents" }}');
});
