import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/restart.tsx", import.meta.url);
const routeThemeSource = new URL("../src/routes/-restart.stylex.ts", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const fallbackSource = new URL("../src/app.css", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const desktop = { height: 900, width: 1366 };
const mobile = { height: 844, width: 390 };

async function openRestart(page: Page, failed = false) {
  await page.goto(`${basePath}/restart${failed ? "?hasFailedToUpdateSecret=true" : ""}`);
  const owner = page.locator('[data-stylex-owner="restart-notice"]');
  await expect(owner).toBeVisible();
  await expect(page.locator('[data-stylex-owner="restart-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="restart-shell"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="restart-footer"]')).toBeVisible();
  return owner;
}

test.describe("StyleX restart notice", () => {
  test("uses route paint ownership while retaining the legacy restart skeleton", async () => {
    const [route, routeTheme, theme, fallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(routeThemeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(fallbackSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="restart-notice"');
    expect(route).toContain('data-stylex-part="restart-notice-logo"');
    expect(route).toContain('data-stylex-part="restart-notice-copy"');
    expect(route).toContain("styles.restartNotice");
    expect(route).toContain('padding: "50px 0px"');
    expect(route).toContain("backgroundColor: restartTheme.logoSurface");
    expect(routeTheme).toContain('logoSurface: "#f36c22"');
    expect(theme).not.toContain("restartNoticeWrapPadding");
    expect(fallback).toContain(".secret-wrap .logo");
    expect(fallback).toContain(".secret-box");
  });

  test("keeps default and failed legacy copy/order and logo SPA navigation", async ({ page }) => {
    const owner = await openRestart(page);
    await expect(owner.locator('[data-stylex-part="restart-notice-heading"]')).toHaveText(
      "Welcome!",
    );
    await expect(owner.locator('[data-stylex-part="restart-notice-copy"]')).toHaveText(
      "Server needs to be restarted.",
    );
    expect(
      await owner.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["A", "H3", "P"]);

    const logo = owner.locator('[data-stylex-part="restart-notice-logo"]');
    await expect(logo).toHaveAttribute("href", `${basePath}/`);
    await page.evaluate(() => {
      (window as Window & { __restartStylexSpa?: string }).__restartStylexSpa = "kept";
    });
    await logo.click({ noWaitAfter: true });
    await expect
      .poll(() => page.evaluate(() => window.location.pathname), { timeout: 5_000 })
      .toBe(`${basePath}/`);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { __restartStylexSpa?: string }).__restartStylexSpa,
        ),
      )
      .toBe("kept");

    const failedOwner = await openRestart(page, true);
    await expect(failedOwner.locator('[data-stylex-part="restart-notice-copy"]')).toHaveText(
      "Server needs to be restarted.Please update application.secret with random text.",
    );
  });

  for (const viewport of [
    { ...desktop, name: "desktop" },
    { ...mobile, name: "mobile" },
  ]) {
    test(`matches legacy ${viewport.name} geometry, containment, and paint`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const owner = await openRestart(page, true);
      const logo = owner.locator('[data-stylex-part="restart-notice-logo"]');
      const copy = owner.locator('[data-stylex-part="restart-notice-copy"]');

      await expect(owner).toHaveCSS("padding", "50px 0px");
      await expect(owner).toHaveCSS("text-align", "center");
      await expect(logo).toHaveCSS("width", "123px");
      await expect(logo).toHaveCSS("height", "55px");
      await expect(logo).toHaveCSS("line-height", "55px");
      await expect(logo).toHaveCSS("font-size", "26px");
      await expect(logo).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(logo).toHaveCSS("background-color", "rgb(243, 108, 34)");
      await expect(copy).toHaveCSS("margin-top", "20px");
      await expect(copy).toHaveCSS("margin-bottom", "20px");

      const [ownerBox, logoBox, copyBox] = await Promise.all([
        owner.boundingBox(),
        logo.boundingBox(),
        copy.boundingBox(),
      ]);
      expect(ownerBox).not.toBeNull();
      expect(logoBox).not.toBeNull();
      expect(copyBox).not.toBeNull();
      expect(logoBox!.width).toBe(123);
      expect(logoBox!.height).toBe(55);
      expect(copyBox!.width).toBeCloseTo(ownerBox!.width / 2, 1);
      expect(logoBox!.x).toBeCloseTo((viewport.width - logoBox!.width) / 2, 1);
      expect(copyBox!.x).toBeCloseTo((viewport.width - copyBox!.width) / 2, 1);
      expect(copyBox!.y).toBeGreaterThanOrEqual(logoBox!.y + logoBox!.height);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        fullPage: true,
        path: `../output/playwright/stylex-restart-notice-${viewport.name}.png`,
      });
    });
  }

  test("keeps the footer outside restart-notice ownership", async ({ page }) => {
    await openRestart(page);
    await expect(page.locator('[data-stylex-owner="restart-notice"]')).toHaveCount(1);
    await expect(page.locator(".page-footer-outer [data-stylex-owner]")).toHaveCount(0);
    await expect(page.locator(".page-footer-outer .provider")).toHaveText("Powered by Yoram");
  });
});
