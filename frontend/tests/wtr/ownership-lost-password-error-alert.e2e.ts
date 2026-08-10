import { expect, test, type Page, readFile } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/lostPassword.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const legacyFallbackSource = "public/legacy-assets/stylesheets/legacy-fallback.css";
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

async function openQueryError(page: Page) {
  await page.goto(`${basePath}/lostPassword?error=invalid`);
  const owner = page.locator('[data-owner="lost-password-error-alert"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("Style anonymous visible lost-password error alert", () => {
  test("declares globally themed error ownership while retaining fallback for excluded states", async () => {
    const [route, theme, legacyFallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(legacyFallbackSource, "utf8"),
    ]);

    expect(route).toContain("data-owner={");
    expect(route).toContain('"lost-password-error-alert"');
    expect(route).toContain('"lost-password-error-alert-heading"');
    expect(route).toContain('"lost-password-error-alert-dismiss"');
    expect(route).toContain("anonymousVisibleError");

    expect(theme).not.toMatch(/^\s+lostPassword[A-Z]/m);
    expect(legacyFallback).toContain(".alert-error");
    expect(legacyFallback).toContain(".alert .close");
  });

  test("keeps query and mutation errors in the same legacy branch with React dismissal", async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    const queryAlert = await openQueryError(page);
    const formWrap = page.locator(".page.full > .login-form-wrap");
    await expect(queryAlert).toContainText("Failed to send mail.Invalid password reset request");
    expect(
      await formWrap
        .locator(":scope > *")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-owner") ?? element.tagName),
        ),
    ).toEqual(["lost-password-error-alert", "FORM"]);
    await expect(queryAlert.locator(".alert, .alert-error, .close")).toHaveCount(0);
    await queryAlert.locator('[data-part="lost-password-error-alert-dismiss"]').click();
    await expect(queryAlert).toHaveCount(0);

    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "style-lost-password-error-csrf" },
        json: {},
      });
    });
    await page.route("**/api/v1/auth/password-reset/request", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { error: { message: "site.resetPasswordEmail.invalidRequest" } },
        status: 400,
      });
    });
    await page.goto(`${basePath}/lostPassword`);
    await page.locator("#loginId").fill("unknown");
    await page.locator("#emailAddress").fill("unknown@example.com");
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    const mutationAlert = page.locator('[data-owner="lost-password-error-alert"]');
    await expect(mutationAlert).toContainText("Failed to send mail.Invalid password reset request");
    expect(
      await formWrap
        .locator(":scope > *")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-owner") ?? element.tagName),
        ),
    ).toEqual(["lost-password-error-alert", "FORM"]);
    await mutationAlert.locator('[data-part="lost-password-error-alert-dismiss"]').click();
    await expect(mutationAlert).toHaveCount(0);
    await expect(page).toHaveURL(`${basePath}/lostPassword`);
  });

  test("matches Bootstrap legacy desktop error alert geometry and paint", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(desktop);
    const alert = await openQueryError(page);
    const heading = alert.locator('[data-part="lost-password-error-alert-heading"]');
    const dismiss = alert.locator('[data-part="lost-password-error-alert-dismiss"]');

    await expect(alert).toHaveCSS("background-color", "rgb(242, 222, 222)");
    await expect(alert).toHaveCSS("border-color", "rgb(238, 211, 215)");
    await expect(alert).toHaveCSS("color", "rgb(185, 74, 72)");
    await expect(heading).toHaveCSS("font-size", "15px");
    await expect(dismiss).toHaveCSS("opacity", "0.2");
    await dismiss.hover();
    await expect(dismiss).toHaveCSS("opacity", "0.4");
    expect(await alert.boundingBox()).toMatchObject({ width: 400, x: 483, y: 246 });
    expect(await heading.boundingBox()).toMatchObject({ height: 18, x: 498, y: 255 });
    expect(await dismiss.boundingBox()).toMatchObject({
      height: 20,
      width: 12.875,
      x: 855.125,
      y: 253,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/style-lost-password-error-alert-desktop.png",
    });
  });

  test("matches Bootstrap legacy responsive mobile error alert geometry and paint", async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(mobile);
    const alert = await openQueryError(page);
    const heading = alert.locator('[data-part="lost-password-error-alert-heading"]');
    const dismiss = alert.locator('[data-part="lost-password-error-alert-dismiss"]');

    await expect(alert).toHaveCSS("width", "319.5px");
    await expect(heading).toHaveCSS("font-size", "15px");
    await expect(dismiss).toHaveCSS("line-height", "20px");
    expect(await alert.boundingBox()).toMatchObject({ width: 370.5, x: 9.75, y: 308 });
    expect(await heading.boundingBox()).toMatchObject({ height: 18, x: 24.75, y: 317 });
    expect(await dismiss.boundingBox()).toMatchObject({
      height: 20,
      width: 12.875,
      x: 352.375,
      y: 315,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/style-lost-password-error-alert-mobile.png",
    });
  });

  test("excludes baseline, requested-success, and authenticated prefill states", async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    await page.goto(`${basePath}/lostPassword`);
    await expect(page.locator('[data-owner="lost-password-error-alert"]')).toHaveCount(0);
    await page.goto(`${basePath}/lostPassword?requested=1`);
    await expect(page.locator('[data-owner="lost-password-error-alert"]')).toHaveCount(0);

    await page.unroute("**/api/v1/session");
    await page.route("**/api/v1/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { emailAddress: "door@example.com", isAnonymous: false, loginId: "door" },
      });
    });
    await page.goto(`${basePath}/lostPassword?requested=1`);
    await expect(page.locator('[data-owner="lost-password-success-alert"]')).toHaveCount(0);
    await expect(
      page.locator('[data-owner="lost-password-authenticated-success-alert"]'),
    ).toBeVisible();

    await page.goto(`${basePath}/lostPassword?error=invalid`);
    await expect(page.locator('[data-owner="lost-password-error-alert"]')).toHaveCount(0);
    await expect(
      page.locator('[data-owner="lost-password-authenticated-error-alert"]'),
    ).toBeVisible();
  });
});
