import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/secret.tsx", import.meta.url);
const routeThemeSource = new URL("../src/routes/-secret.stylex.ts", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function mockSecretSetup(page: Page, secretSetupRequired = true) {
  await page.route("**/api/v1/auth/capabilities", (route) =>
    route.fulfill({ contentType: "application/json", json: { secretSetupRequired } }),
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ contentType: "application/json", json: { isAnonymous: true } }),
  );
}

test.describe("StyleX secret setup", () => {
  test("uses route paint ownership for the legacy inline secret surface", async () => {
    const [route, routeTheme, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(routeThemeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-stylex-owner="secret-setup"');
    expect(route).toContain("styles.logo");
    expect(route).toContain('width: "123px"');
    expect(route).toContain("backgroundColor: secretTheme.logoSurface");
    expect(routeTheme).toContain('logoSurface: "#f36c22"');
    expect(theme).not.toMatch(/^\s+secretSetup[A-Z]/m);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`preserves legacy ${viewport.name} setup geometry and form order`, async ({ page }) => {
      await mockSecretSetup(page);
      await page.setViewportSize(viewport);
      await page.goto(`${basePath}/secret`);
      const owner = page.locator('[data-stylex-owner="secret-setup"]');
      const logo = owner.locator('[data-stylex-part="secret-setup-logo"]');
      await expect(owner).toBeVisible();
      await expect(logo).toHaveText("Yoram");
      await expect(logo).toHaveCSS("width", "123px");
      await expect(logo).toHaveCSS("height", "55px");
      await expect(logo).toHaveCSS("background-color", "rgb(243, 108, 34)");
      const geometry = await owner.evaluate((element) => {
        const ownerBox = element.getBoundingClientRect();
        const box = element.querySelector<HTMLElement>('[data-stylex-part="secret-setup-box"]');
        if (!box) return null;
        return {
          boxWidth: Number.parseFloat(getComputedStyle(box).width),
          ownerWidth: ownerBox.width,
        };
      });
      expect(geometry).not.toBeNull();
      expect(geometry!.boxWidth).toBeCloseTo(geometry!.ownerWidth / 2, 1);
      await expect(page.locator(".signup-form-wrap form dl input")).toHaveCount(5);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expect(page.locator(".page-wrap-outer")).toHaveScreenshot(
        `stylex-secret-setup-${viewport.name}.png`,
      );
    });
  }

  test("excludes the not-found state", async ({ page }) => {
    await mockSecretSetup(page, false);
    await page.goto(`${basePath}/secret`);
    await expect(page.locator('[data-stylex-owner="secret-setup"]')).toHaveCount(0);
  });
});
