import { readFile, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/resetPassword.tsx", import.meta.url);
const routeThemeSource = new URL("../src/app.css", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const desktop = { height: 900, width: 1366 };
const mobile = { height: 844, width: 390 };

async function mockAnonymousSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { defaultLandingPath: "/", isAnonymous: true, isGuest: false },
    });
  });
}

async function openValidTokenReset(page: Page) {
  await page.goto(`${basePath}/resetPassword?s=style-popover-token`);
  const form = page.locator('[data-owner="reset-password-form"]');
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "Confirm" }).click();
  const popovers = page.locator('[data-owner="reset-password-validation-popover"]');
  await expect(popovers).toHaveCount(2);
  return popovers;
}

test.describe("Style valid-token reset password validation popover", () => {
  test("owns the valid-token presentation while retaining the fallback for excluded states", async () => {
    const [route, _routeTheme, theme, legacyFallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(routeThemeSource, "utf8"),
      readFile(themeSource, "utf8"),
      Promise.resolve(mergedLegacyBlock()),
    ]);

    expect(route).toContain('data-owner="reset-password-validation-popover"');

    expect(theme).not.toMatch(/^\s+resetPassword[A-Z]/m);
    expect(legacyFallback).toContain(".popover.left");
    expect(legacyFallback).toContain(".popover-content");
  });

  test("keeps legacy validation copy and removes legacy popover classes from the owned DOM", async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    const popovers = await openValidTokenReset(page);

    await expect(popovers).toHaveText(["Required field!", "Required field!"]);
    await expect(
      popovers.locator('[data-part="reset-password-validation-popover-arrow"]'),
    ).toHaveCount(2);
    await expect(
      popovers.locator('[data-part="reset-password-validation-popover-content"]'),
    ).toHaveText(["Required field!", "Required field!"]);
    for (const selector of [".popover", ".left", ".in", ".arrow", ".popover-content"]) {
      await expect(popovers.locator(selector)).toHaveCount(0);
    }
  });

  test("matches legacy desktop validation-popover geometry and paint", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(desktop);
    const popovers = await openValidTokenReset(page);
    const first = popovers.nth(0);
    const second = popovers.nth(1);

    await expect(first).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(first).toHaveCSS("border-radius", "2px");
    await expect(first).toHaveCSS("line-height", "13px");
    await expect(
      first.locator('[data-part="reset-password-validation-popover-content"]'),
    ).toHaveCSS("padding", "9px 10px");
    expect(await first.boundingBox()).toMatchObject({
      height: 37.59375,
      width: 111.796875,
      x: 361,
      y: 235,
    });
    expect(await second.boundingBox()).toMatchObject({
      height: 37.59375,
      width: 111.796875,
      x: 361,
      y: 286,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/style-reset-password-validation-popover-desktop.png",
    });
  });

  test("matches legacy mobile validation-popover geometry without overflow", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(mobile);
    const popovers = await openValidTokenReset(page);
    const first = popovers.nth(0);
    const second = popovers.nth(1);

    expect(await first.boundingBox()).toMatchObject({
      height: 37.59375,
      width: 111.796875,
      x: -112.25,
      y: 297,
    });
    expect(await second.boundingBox()).toMatchObject({
      height: 37.59375,
      width: 111.796875,
      x: -112.25,
      y: 348,
    });
    // F5 dist-truth (2026-08-11): the validation popover hangs off the left
    // edge (x -112.25). The original note claimed the 390px viewport scrolls
    // horizontally; Chrome-measured (2026-08-15, top-level AND WTR iframe):
    // negative-x absolutely-positioned content never extends
    // documentElement.scrollWidth (measured 390 == innerWidth with the popover
    // at x -112.25, both body-appended and positioned-ancestor variants) — the
    // legacy BS2 tip has the same geometry, so the document does not scroll.
    // The parity observable is the left-edge overhang, pinned above.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/style-reset-password-validation-popover-mobile.png",
    });
  });

  test("excludes no-token reset state from popover ownership", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto(`${basePath}/resetPassword`);
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.locator('[data-owner="reset-password-validation-popover"]')).toHaveCount(0);
    await expect(page.locator(".popover.left.in")).toHaveCount(2);
  });
});
