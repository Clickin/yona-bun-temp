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

  const fallbackLink = page.locator(
    'link[rel="stylesheet"][href$="/legacy-assets/stylesheets/legacy-fallback.css"]',
  );
  await expect(fallbackLink).toHaveCount(1);
  const fallbackUrl = await fallbackLink.evaluate((link: HTMLLinkElement) => link.href);
  expect(new URL(fallbackUrl).pathname).toBe(
    `${basePath}/legacy-assets/stylesheets/legacy-fallback.css`,
  );
  const fallbackResponse = await page.request.get(fallbackUrl);
  expect(fallbackResponse.ok()).toBe(true);
  const fallbackCss = await fallbackResponse.text();
  expect(fallbackCss).toContain("@layer legacy {");
  expect(fallbackCss.indexOf("source:bootstrap")).toBeLessThan(
    fallbackCss.indexOf("source:yobicon"),
  );
  expect(fallbackCss.indexOf("source:pikaday")).toBeLessThan(
    fallbackCss.indexOf("source:usermenu"),
  );
  expect(fallbackCss.indexOf("source:yobi")).toBeLessThan(fallbackCss.indexOf("source:nprogress"));
  for (const assetPath of [
    "../bootstrap/images/glyphicons-halflings.png",
    "yobicon/fonts/yobicon.woff",
    "../javascripts/lib/select2/select2.png",
    "../images/sprite.png",
  ]) {
    expect((await page.request.get(new URL(assetPath, fallbackUrl).toString())).ok()).toBe(true);
  }

  const boundary = page.locator("[data-stylex-root-boundary]");
  await expect(boundary).toHaveCSS("display", "contents");
  await expect(boundary).not.toHaveAttribute("style");
  await expect(boundary).toHaveAttribute("class", /\bx/);
  await expect(boundary).toHaveCSS("--yoram-stylex-root-boundary", "stylex");

  const childBefore = await boundary
    .locator(":scope > *")
    .first()
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, x: box.x, y: box.y };
    });
  await boundary.evaluate((element) => element.removeAttribute("class"));
  await expect(boundary).toHaveCSS("display", "contents");
  await expect(boundary).toHaveCSS("--yoram-stylex-root-boundary", "legacy");
  const childAfter = await boundary
    .locator(":scope > *")
    .first()
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, x: box.x, y: box.y };
    });
  expect(childAfter).toEqual(childBefore);

  const cssResponse = await page.request.get(new URL("/virtual:stylex.css", page.url()).toString());
  expect(cssResponse.ok()).toBe(true);
  expect(await cssResponse.text()).toMatch(/display:\s*contents/u);
});

test("Vite places the official StyleX plugin before route and React transforms", () => {
  const viteSource = readFileSync("vite.config.ts", "utf8");
  const rootSource = readFileSync("src/routes/__root.tsx", "utf8");

  expect(viteSource).toContain('import stylex from "@stylexjs/unplugin"');
  expect(viteSource.indexOf("stylex.vite({")).toBeLessThan(viteSource.indexOf("tanstackRouter({"));
  expect(viteSource).toContain('before: ["legacy"]');
  expect(viteSource).toContain('prefix: "stylex"');
  expect(rootSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(rootSource).toContain("...stylex.props(styles.rootEventBoundary)");
  expect(rootSource).toContain('data-stylex-root-boundary=""');
  expect(rootSource).not.toContain('style={{ display: "contents" }}');
});
