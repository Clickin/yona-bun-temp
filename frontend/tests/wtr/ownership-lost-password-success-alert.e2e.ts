import { readFileSync } from "../wtr-compat.ts";
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
      json: {
        actorId: null,
        defaultLandingPath: "/",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
      },
    });
  });
}

async function openAnonymousRequestedSuccess(page: Page) {
  await page.goto(`${basePath}/lostPassword?requested=1`);
  const owner = page.locator('[data-owner="lost-password-success-alert"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("Style anonymous requested-success lost-password alert", () => {
  test("declares a globally themed owner while leaving the legacy fallback for excluded alert states", async () => {
    const [route, theme, legacyFallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(legacyFallbackSource, "utf8"),
    ]);

    expect(route).toContain("data-owner={");
    expect(route).toContain('"lost-password-success-alert"');
    expect(route).toContain('"lost-password-success-alert-heading"');
    expect(route).toContain('"lost-password-success-alert-dismiss"');
    expect(route).toContain("anonymousRequestedSuccess");

    expect(theme).not.toMatch(/^\s+lostPassword[A-Z]/m);
    expect(legacyFallback).toContain(".alert-success");
    expect(legacyFallback).toContain(".alert .close");
  });

  test("preserves the legacy success alert order, copy, and React-owned dismissal", async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    const alert = await openAnonymousRequestedSuccess(page);
    const formWrap = page.locator(".page.full > .login-form-wrap");

    expect(
      await formWrap
        .locator(":scope > *")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-owner") ?? element.tagName),
        ),
    ).toEqual(["lost-password-success-alert", "FORM"]);
    await expect(alert).toHaveText("×Mail has been sent.");
    await expect(alert.locator('[data-part="lost-password-success-alert-heading"]')).toHaveText(
      "Mail has been sent.",
    );
    await expect(alert.locator('[data-part="lost-password-success-alert-dismiss"]')).toHaveText(
      "×",
    );
    await expect(alert.locator(".alert, .alert-success, .close")).toHaveCount(0);
    await alert.locator('[data-part="lost-password-success-alert-dismiss"]').click();
    await expect(alert).toHaveCount(0);
    await expect(formWrap.locator(":scope > form")).toBeVisible();
  });

  test("matches Bootstrap legacy desktop success alert geometry and paint", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(desktop);
    const alert = await openAnonymousRequestedSuccess(page);
    const heading = alert.locator('[data-part="lost-password-success-alert-heading"]');
    const dismiss = alert.locator('[data-part="lost-password-success-alert-dismiss"]');

    await expect(alert).toHaveCSS("background-color", "rgb(223, 240, 216)");
    await expect(alert).toHaveCSS("border-color", "rgb(214, 233, 198)");
    await expect(alert).toHaveCSS("color", "rgb(70, 136, 71)");
    await expect(alert).toHaveCSS("padding-top", "8px");
    await expect(alert).toHaveCSS("margin-bottom", "20px");
    await expect(heading).toHaveCSS("font-size", "15px");
    await expect(dismiss).toHaveCSS("font-size", "20px");
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
      path: "../output/playwright/style-lost-password-success-alert-desktop.png",
    });
  });

  test("matches Bootstrap legacy responsive mobile success alert geometry and paint", async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(mobile);
    const alert = await openAnonymousRequestedSuccess(page);
    const heading = alert.locator('[data-part="lost-password-success-alert-heading"]');
    const dismiss = alert.locator('[data-part="lost-password-success-alert-dismiss"]');

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
      path: "../output/playwright/style-lost-password-success-alert-mobile.png",
    });
  });

  test("excludes anonymous baseline, error, and authenticated prefill states", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto(`${basePath}/lostPassword`);
    await expect(page.locator('[data-owner="lost-password-success-alert"]')).toHaveCount(0);

    await page.goto(`${basePath}/lostPassword?error=invalid`);
    await expect(page.locator('[data-owner="lost-password-success-alert"]')).toHaveCount(0);
    await expect(page.locator('[data-owner="lost-password-error-alert"]')).toBeVisible();

    await page.unroute("**/api/v1/session");
    await page.route("**/api/v1/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { emailAddress: "door@example.com", isAnonymous: false, loginId: "door" },
      });
    });
    await page.goto(`${basePath}/lostPassword?requested=1`);
    await expect(page.locator('[data-owner="lost-password-success-alert"]')).toHaveCount(0);
    await expect(page.locator("#loginId")).toHaveValue("door");
    await expect(page.locator("#emailAddress")).toHaveValue("door@example.com");
  });
});
