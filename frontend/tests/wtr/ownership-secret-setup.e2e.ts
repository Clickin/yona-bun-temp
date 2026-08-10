import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/secret.tsx", import.meta.url);
const routeThemeSource = new URL("../src/app.css", import.meta.url);
const restrictedRouteSource = new URL("../src/routes/restricted.tsx", import.meta.url);
const restartRouteSource = new URL("../src/routes/restart.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const fallbackSource = new URL("../src/app.css", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function mockSecretSetup(page: Page, secretSetupRequired = true) {
  await page.route("**/api/v1/auth/capabilities", (route) =>
    route.fulfill({ contentType: "application/json", json: { secretSetupRequired } }),
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ contentType: "application/json", json: { isAnonymous: true } }),
  );
}

test.describe("Style secret setup", () => {
  test("uses route paint ownership for the legacy inline secret surface", async () => {
    const [route, routeTheme, restrictedRoute, restartRoute, theme, fallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(routeThemeSource, "utf8"),
      readFile(restrictedRouteSource, "utf8"),
      readFile(restartRouteSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(fallbackSource, "utf8"),
    ]);
    expect(route).toContain('data-owner="secret-setup"');

    expect(route).toContain('data-owner="secret-setup-form"');

    expect(restrictedRoute).toContain('data-owner="restricted-sidebar-pin"');
    expect(restartRoute).toContain('data-owner="restart-notice"');
    expect(theme).not.toMatch(/^\s+secretSetup[A-Z]/m);
    expect(fallback).toContain(".page-wrap-outer:has(.secret-wrap) .signup-form-wrap .text");
    expect(fallback).toContain("width: calc(95vw * 0.4) !important;");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`preserves legacy ${viewport.name} setup geometry and form order`, async ({ page }) => {
      await mockSecretSetup(page);
      await page.setViewportSize(viewport);
      await page.goto(`${basePath}/secret`);
      const owner = page.locator('[data-owner="secret-setup"]');
      const logo = owner.locator('[data-part="secret-setup-logo"]');
      const formOwner = page.locator('[data-owner="secret-setup-form"]');
      const loginId = formOwner.locator("#loginId");
      await expect(owner).toBeVisible();
      await expect(logo).toHaveText("Yoram");
      await expect(logo).toHaveCSS("width", "123px");
      await expect(logo).toHaveCSS("height", "55px");
      await expect(logo).toHaveCSS("background-color", "rgb(243, 108, 34)");
      await expect(formOwner).toHaveCSS("position", "relative");
      await expect(formOwner).toHaveCSS("width", viewport.name === "desktop" ? "400px" : "370.5px");
      await expect(loginId).toHaveCSS("height", "27px");
      await expect(loginId).toHaveCSS("font-size", viewport.name === "desktop" ? "12px" : "16px");
      await expect(loginId).toHaveCSS("font-weight", "700");
      await expect(loginId).toHaveCSS("border-bottom-color", "rgb(204, 204, 204)");
      await loginId.focus();
      await expect(loginId).toHaveCSS("border-bottom-color", "rgb(243, 108, 34)");
      const geometry = await owner.evaluate((element) => {
        const ownerBox = element.getBoundingClientRect();
        const box = element.querySelector<HTMLElement>('[data-part="secret-setup-box"]');
        if (!box) return null;
        return {
          boxWidth: Number.parseFloat(getComputedStyle(box).width),
          ownerWidth: ownerBox.width,
        };
      });
      expect(geometry).not.toBeNull();
      expect(geometry!.boxWidth).toBeCloseTo(geometry!.ownerWidth / 2, 1);
      expect((await loginId.boundingBox())!.width).toBeCloseTo(
        viewport.name === "desktop" ? 398 : 160.2,
        1,
      );
      await expect(formOwner.locator('[data-part="secret-setup-action-row"]')).toHaveCSS(
        "text-align",
        "center",
      );
      await expect(page.locator(".signup-form-wrap form dl input")).toHaveCount(5);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });
  }

  test("excludes the not-found state", async ({ page }) => {
    await mockSecretSetup(page, false);
    await page.goto(`${basePath}/secret`);
    await expect(page.locator('[data-owner="secret-setup"]')).toHaveCount(0);
  });
});
