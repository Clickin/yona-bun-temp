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

async function openAnonymousLostPassword(page: Page) {
  await page.goto(`${basePath}/lostPassword`);
  const owner = page.locator('[data-stylex-owner="lost-password-form"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX anonymous lost-password form", () => {
  test("declares globally themed anonymous ownership while retaining real fallback states", async () => {
    const [route, theme, legacyFallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(legacyFallbackSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner={anonymousBaseline ? "lost-password-form"');
    expect(route).toContain('"lost-password-login-id"');
    expect(route).toContain('"lost-password-submit"');
    expect(route).toContain('className={anonymousBaseline ? textInputClassName : "text"}');
    expect(theme).toContain("lostPasswordFormWidth");
    expect(theme).toContain("lostPasswordInputFocusBorderBottomColor");
    expect(legacyFallback).toContain(".login-form-wrap .text");
    expect(legacyFallback).toContain(".login-form-wrap {\n    width: 95% !important;");
  });

  test("keeps legacy form order and sends the anonymous request through the SPA boundary", async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    const requests: unknown[] = [];
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "stylex-lost-password-csrf" },
        json: { isAnonymous: true },
      });
    });
    await page.route("**/api/v1/auth/password-reset/request", async (route) => {
      requests.push({
        body: route.request().postDataJSON(),
        csrfToken: route.request().headers()["x-csrf-token"],
      });
      await route.fulfill({ contentType: "application/json", json: {} });
    });

    const owner = await openAnonymousLostPassword(page);
    expect(
      await owner
        .locator(":scope > div")
        .evaluateAll((nodes) => nodes.map((node) => node.className)),
    ).toEqual([
      expect.stringContaining("tag-line-wrap reset-password"),
      expect.stringContaining("login-form-wrap frm-wrap"),
    ]);
    await expect(owner.locator('[data-stylex-part="lost-password-title"]')).toHaveText(
      "Reset password for Yoram",
    );
    await expect(owner.locator('[data-stylex-part="lost-password-copy"]')).toHaveText(
      "Web-based platform for collaborative software development",
    );
    await expect(owner.locator("input.text")).toHaveCount(0);
    await expect(owner.locator('[data-stylex-part="lost-password-login-id"]')).toHaveAttribute(
      "placeholder",
      "Login ID",
    );
    await expect(owner.locator('[data-stylex-part="lost-password-email"]')).toHaveAttribute(
      "placeholder",
      "Email address",
    );

    await owner.locator('[data-stylex-part="lost-password-login-id"]').fill("door");
    await owner.locator('[data-stylex-part="lost-password-email"]').fill("door@example.com");
    await owner.locator('[data-stylex-part="lost-password-submit"]').click();
    await expect
      .poll(() => requests)
      .toEqual([
        {
          body: { emailAddress: "door@example.com", loginId: "door" },
          csrfToken: "stylex-lost-password-csrf",
        },
      ]);
    await expect(page).toHaveURL(`${basePath}/lostPassword?requested=1`);
  });

  test("matches legacy desktop geometry and paint", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(desktop);
    const owner = await openAnonymousLostPassword(page);
    const form = owner.locator('[data-stylex-part="lost-password-form-wrap"]');
    const loginId = owner.locator('[data-stylex-part="lost-password-login-id"]');
    const email = owner.locator('[data-stylex-part="lost-password-email"]');
    const submit = owner.locator('[data-stylex-part="lost-password-submit"]');

    await expect(form).toHaveCSS("width", "400px");
    await expect(loginId).toHaveCSS("width", "386px");
    await expect(loginId).toHaveCSS("height", "27px");
    await expect(loginId).toHaveCSS("font-size", "12px");
    await expect(loginId).toHaveCSS("font-weight", "700");
    await expect(loginId).toHaveCSS("margin-bottom", "10px");
    await loginId.focus();
    await expect(loginId).toHaveCSS("border-bottom-color", "rgb(243, 108, 34)");
    expect(await form.boundingBox()).toMatchObject({ height: 134, width: 400, x: 483, y: 246 });
    expect(await loginId.boundingBox()).toMatchObject({ height: 36, width: 398, x: 483, y: 246 });
    expect(await email.boundingBox()).toMatchObject({ height: 36, width: 398, x: 483, y: 292 });
    expect(await submit.boundingBox()).toMatchObject({ height: 42, width: 400, x: 483, y: 338 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(owner).toHaveScreenshot("stylex-lost-password-form-desktop.png");
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-lost-password-form-desktop.png",
    });
  });

  test("matches legacy responsive mobile geometry and paint", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(mobile);
    const owner = await openAnonymousLostPassword(page);
    const form = owner.locator('[data-stylex-part="lost-password-form-wrap"]');
    const loginId = owner.locator('[data-stylex-part="lost-password-login-id"]');
    const email = owner.locator('[data-stylex-part="lost-password-email"]');
    const submit = owner.locator('[data-stylex-part="lost-password-submit"]');

    await expect(form).toHaveCSS("width", "370.5px");
    await expect(loginId).toHaveCSS("width", "351.969px");
    await expect(loginId).toHaveCSS("font-size", "16px");
    await expect(submit).toHaveCSS("width", "370.5px");
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
    await expect(owner).toHaveScreenshot("stylex-lost-password-form-mobile.png");
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-lost-password-form-mobile.png",
    });
  });

  test("keeps requested, error, and authenticated prefill states outside anonymous ownership", async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    await page.goto(`${basePath}/lostPassword?requested=1`);
    await expect(page.locator('[data-stylex-owner="lost-password-form"]')).toHaveCount(0);
    await expect(page.locator('[data-stylex-part^="lost-password-"]')).toHaveCount(0);
    await expect(page.locator(".alert-success")).toBeVisible();

    await page.goto(`${basePath}/lostPassword?error=invalid`);
    await expect(page.locator('[data-stylex-owner="lost-password-form"]')).toHaveCount(0);
    await expect(page.locator(".alert-error")).toBeVisible();

    await page.unroute("**/api/v1/session");
    await page.route("**/api/v1/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { emailAddress: "door@example.com", isAnonymous: false, loginId: "door" },
      });
    });
    await page.goto(`${basePath}/lostPassword`);
    await expect(page.locator('[data-stylex-owner="lost-password-form"]')).toHaveCount(0);
    await expect(page.locator("#loginId")).toHaveValue("door");
    await expect(page.locator("#emailAddress")).toHaveValue("door@example.com");
  });
});
