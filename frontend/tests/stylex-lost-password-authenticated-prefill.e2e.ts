import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/lostPassword.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const legacyFallbackSource = new URL(
  "../public/legacy-assets/stylesheets/legacy-fallback.css",
  import.meta.url,
);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const desktop = { height: 900, width: 1366 };
const mobile = { height: 844, width: 390 };

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        actorId: "42",
        defaultLandingPath: "/",
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "door",
        userLabel: "Door",
      },
    });
  });
}

async function openAuthenticatedPrefill(page: Page) {
  await page.goto(`${basePath}/lostPassword`);
  const owner = page.locator('[data-stylex-owner="lost-password-authenticated-prefill"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX authenticated lost-password prefill", () => {
  test("reuses globally themed form values while retaining fallback alert states", async () => {
    const [route, theme, legacyFallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(legacyFallbackSource, "utf8"),
    ]);

    expect(route).toContain('"lost-password-authenticated-prefill"');
    expect(route).toContain("authenticatedNoAlert");
    expect(route).toContain("lostPasswordTheme.inputFocusBorder");
    expect(theme).not.toMatch(/^\s+lostPassword[A-Z]/m);
    expect(legacyFallback).toContain(".login-form-wrap .text");
    expect(legacyFallback).toContain(".login-form-wrap {\n    width: 95% !important;");
  });

  test("preserves prefilled values, order, and the password-reset mutation payload", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page);
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "stylex-auth-prefill-csrf" },
        json: {},
      });
    });
    const requests: unknown[] = [];
    await page.route("**/api/v1/auth/password-reset/request", async (route) => {
      requests.push({
        body: route.request().postDataJSON(),
        csrfToken: route.request().headers()["x-csrf-token"],
      });
      await route.fulfill({ contentType: "application/json", json: {} });
    });

    const owner = await openAuthenticatedPrefill(page);
    const form = owner.locator(
      '[data-stylex-part="lost-password-authenticated-prefill-form-wrap"] form',
    );
    await expect(form.locator("input.text")).toHaveCount(0);
    expect(
      await owner.locator(":scope > div").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["DIV", "DIV"]);
    await expect(
      owner.locator('[data-stylex-part="lost-password-authenticated-prefill-login-id"]'),
    ).toHaveValue("door");
    await expect(
      owner.locator('[data-stylex-part="lost-password-authenticated-prefill-email"]'),
    ).toHaveValue("door@example.com");
    await owner.locator('[data-stylex-part="lost-password-authenticated-prefill-submit"]').click();
    await expect
      .poll(() => requests)
      .toEqual([
        {
          body: { emailAddress: "door@example.com", loginId: "door" },
          csrfToken: "stylex-auth-prefill-csrf",
        },
      ]);
    await expect(page).toHaveURL(`${basePath}/lostPassword?requested=1`);
  });

  test("matches legacy desktop prefill form geometry and paint", async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.setViewportSize(desktop);
    const owner = await openAuthenticatedPrefill(page);
    const form = owner.locator(
      '[data-stylex-part="lost-password-authenticated-prefill-form-wrap"]',
    );
    const loginId = owner.locator(
      '[data-stylex-part="lost-password-authenticated-prefill-login-id"]',
    );
    const email = owner.locator('[data-stylex-part="lost-password-authenticated-prefill-email"]');
    const submit = owner.locator('[data-stylex-part="lost-password-authenticated-prefill-submit"]');

    await expect(form).toHaveCSS("width", "400px");
    await expect(loginId).toHaveCSS("width", "386px");
    await expect(loginId).toHaveCSS("font-size", "12px");
    await loginId.focus();
    await expect(loginId).toHaveCSS("border-bottom-color", "rgb(243, 108, 34)");
    expect(await form.boundingBox()).toMatchObject({ height: 134, width: 400, x: 483, y: 246 });
    expect(await loginId.boundingBox()).toMatchObject({ height: 36, width: 398, x: 483, y: 246 });
    expect(await email.boundingBox()).toMatchObject({ height: 36, width: 398, x: 483, y: 292 });
    expect(await submit.boundingBox()).toMatchObject({ height: 42, width: 400, x: 483, y: 338 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(owner).toHaveScreenshot("stylex-lost-password-authenticated-prefill-desktop.png");
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-lost-password-authenticated-prefill-desktop.png",
    });
  });

  test("matches legacy responsive mobile prefill form geometry and paint", async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.setViewportSize(mobile);
    const owner = await openAuthenticatedPrefill(page);
    const form = owner.locator(
      '[data-stylex-part="lost-password-authenticated-prefill-form-wrap"]',
    );
    const loginId = owner.locator(
      '[data-stylex-part="lost-password-authenticated-prefill-login-id"]',
    );
    const email = owner.locator('[data-stylex-part="lost-password-authenticated-prefill-email"]');
    const submit = owner.locator('[data-stylex-part="lost-password-authenticated-prefill-submit"]');

    await expect(form).toHaveCSS("width", "370.5px");
    await expect(loginId).toHaveCSS("width", "351.969px");
    await expect(loginId).toHaveCSS("font-size", "16px");
    expect(await form.boundingBox()).toMatchObject({ height: 134, width: 370.5, x: 9.75, y: 308 });
    expect(await loginId.boundingBox()).toMatchObject({
      height: 36,
      width: 363.96875,
      x: 9.75,
      y: 308,
    });
    expect(await email.boundingBox()).toMatchObject({
      height: 36,
      width: 363.96875,
      x: 9.75,
      y: 354,
    });
    expect(await submit.boundingBox()).toMatchObject({
      height: 42,
      width: 370.5,
      x: 9.75,
      y: 400,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(owner).toHaveScreenshot("stylex-lost-password-authenticated-prefill-mobile.png");
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-lost-password-authenticated-prefill-mobile.png",
    });
  });

  test("excludes anonymous baseline and authenticated requested/error fallback alerts", async ({
    page,
  }) => {
    await page.route("**/api/v1/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { defaultLandingPath: "/", isAnonymous: true, isGuest: false },
      });
    });
    await page.goto(`${basePath}/lostPassword`);
    await expect(
      page.locator('[data-stylex-owner="lost-password-authenticated-prefill"]'),
    ).toHaveCount(0);
    await expect(page.locator('[data-stylex-owner="lost-password-form"]')).toBeVisible();

    await page.unroute("**/api/v1/session");
    await mockAuthenticatedSession(page);
    await page.goto(`${basePath}/lostPassword?requested=1`);
    await expect(
      page.locator('[data-stylex-owner="lost-password-authenticated-prefill"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-stylex-owner="lost-password-authenticated-success-alert"]'),
    ).toBeVisible();
    await page.goto(`${basePath}/lostPassword?error=invalid`);
    await expect(
      page.locator('[data-stylex-owner="lost-password-authenticated-prefill"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-stylex-owner="lost-password-authenticated-error-alert"]'),
    ).toBeVisible();
  });
});
