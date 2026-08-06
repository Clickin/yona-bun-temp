import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

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

  // Fallback-off runtime (VITE_DISABLE_LEGACY_FALLBACK=1 in both runners):
  // the generated legacy stylesheet link is stripped from index.html, so the
  // pin is count 0; the file itself remains served for direct fetches.
  const fallbackLink = page.locator(
    'link[rel="stylesheet"][href$="/legacy-assets/stylesheets/legacy-fallback.css"]',
  );
  await expect(fallbackLink).toHaveCount(0);
  const fallbackUrl = new URL(
    `${basePath}/legacy-assets/stylesheets/legacy-fallback.css`,
    page.url(),
  ).toString();
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
  // Fallback-off runtime: the legacy `#main [data-stylex-root-boundary]` rule
  // (display: contents + var legacy) lives in legacy-fallback.css, which is
  // stripped from index.html — so removing the stylex class yields block + "".
  await expect(boundary).toHaveCSS("display", "block");
  await expect(boundary).toHaveCSS("--yoram-stylex-root-boundary", "");
  const childAfter = await boundary
    .locator(":scope > *")
    .first()
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, x: box.x, y: box.y };
    });
  expect(childAfter).toEqual(childBefore);

  // /virtual:stylex.css is a Vite dev-only virtual module; WTR mounts dist, so
  // the assertion is dropped (the boundary display:contents is already pinned
  // above via computed style).
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
