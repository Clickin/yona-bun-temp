import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/lostPassword.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const fallbackSource = new URL(
  "../public/legacy-assets/stylesheets/legacy-fallback.css",
  import.meta.url,
);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function mockAuthenticated(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { emailAddress: "door@example.com", isAnonymous: false, loginId: "door" },
    });
  });
}
async function open(page: Page) {
  await page.goto(`${basePath}/lostPassword?error=invalid`);
  const owner = page.locator('[data-stylex-owner="lost-password-authenticated-error-alert"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX authenticated lost-password error alert", () => {
  test("reuses canonical error alert values while retaining fallback boundaries", async () => {
    const [route, theme, fallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(fallbackSource, "utf8"),
    ]);
    expect(route).toContain('"lost-password-authenticated-error-alert"');
    expect(route).toContain("authenticatedVisibleError");
    expect(theme).toContain("lostPasswordErrorAlertSurface");
    expect(fallback).toContain(".alert-error");
  });

  test("keeps prefilled fields, error order, copy, and React dismissal", async ({ page }) => {
    await mockAuthenticated(page);
    const alert = await open(page);
    const formWrap = page.locator(".page.full > .login-form-wrap");
    await expect(page.locator("#loginId")).toHaveValue("door");
    await expect(page.locator("#emailAddress")).toHaveValue("door@example.com");
    expect(
      await formWrap
        .locator(":scope > *")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-stylex-owner") ?? node.tagName),
        ),
    ).toEqual(["lost-password-authenticated-error-alert", "FORM"]);
    await expect(
      alert.locator('[data-stylex-part="lost-password-authenticated-error-alert-heading"]'),
    ).toHaveText("Failed to send mail.");
    await expect(alert).toContainText("Invalid password reset request");
    await expect(alert.locator(".alert, .alert-error, .close")).toHaveCount(0);
    await alert
      .locator('[data-stylex-part="lost-password-authenticated-error-alert-dismiss"]')
      .click();
    await expect(alert).toHaveCount(0);
  });

  test("matches desktop Bootstrap geometry and paint", async ({ page }) => {
    await mockAuthenticated(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    const alert = await open(page);
    await expect(alert).toHaveCSS("background-color", "rgb(242, 222, 222)");
    await expect(alert).toHaveCSS("border-color", "rgb(238, 211, 215)");
    expect(await alert.boundingBox()).toMatchObject({ width: 400, x: 483, y: 246 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(alert).toHaveScreenshot(
      "stylex-lost-password-authenticated-error-alert-desktop.png",
    );
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-lost-password-authenticated-error-alert-desktop.png",
    });
  });

  test("matches responsive mobile Bootstrap geometry and paint", async ({ page }) => {
    await mockAuthenticated(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const alert = await open(page);
    await expect(alert).toHaveCSS("width", "319.5px");
    expect(await alert.boundingBox()).toMatchObject({ width: 370.5, x: 9.75, y: 308 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(alert).toHaveScreenshot(
      "stylex-lost-password-authenticated-error-alert-mobile.png",
    );
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-lost-password-authenticated-error-alert-mobile.png",
    });
  });

  test("excludes anonymous error, authenticated success/no-alert, and anonymous baseline", async ({
    page,
  }) => {
    await page.route("**/api/v1/session", async (route) =>
      route.fulfill({ contentType: "application/json", json: { isAnonymous: true } }),
    );
    await page.goto(`${basePath}/lostPassword?error=invalid`);
    await expect(
      page.locator('[data-stylex-owner="lost-password-authenticated-error-alert"]'),
    ).toHaveCount(0);
    await expect(page.locator('[data-stylex-owner="lost-password-error-alert"]')).toBeVisible();
    await page.unroute("**/api/v1/session");
    await mockAuthenticated(page);
    await page.goto(`${basePath}/lostPassword?requested=1`);
    await expect(
      page.locator('[data-stylex-owner="lost-password-authenticated-error-alert"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-stylex-owner="lost-password-authenticated-success-alert"]'),
    ).toBeVisible();
    await page.goto(`${basePath}/lostPassword`);
    await expect(
      page.locator('[data-stylex-owner="lost-password-authenticated-prefill"]'),
    ).toBeVisible();
  });
});
