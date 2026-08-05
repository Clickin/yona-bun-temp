import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, readFile } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/lostPassword.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
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

async function openAnonymousLostPassword(page: Page) {
  await page.goto(`${basePath}/lostPassword`);
  const owner = page.locator('[data-stylex-owner="lost-password-form"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX anonymous lost-password form", () => {
  test("declares route-themed ownership for every lost-password state", async () => {
    const [route, theme, legacyFallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(legacyFallbackSource, "utf8"),
    ]);

    expect(route).toMatch(/data-stylex-owner=\{\s*anonymousBaseline\s*\?\s*"lost-password-form"/u);
    expect(route).toContain('"lost-password-login-id"');
    expect(route).toContain('"lost-password-submit"');
    expect(route).toContain("className={textInputClassName}");
    expect(route).toContain("color: lostPasswordTheme.titleHighlight");
    expect(route).toContain('boxSizing: "content-box"');
    expect(route).toContain('default: "400px"');
    expect(route).toContain("borderBottomColor: lostPasswordTheme.inputFocusBorder");
    expect(theme).not.toMatch(/^\s+lostPassword[A-Z]/m);
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
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-lost-password-form-mobile.png",
    });
  });

  test("keeps requested, error, and authenticated states inside the shared screen ownership", async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    await page.goto(`${basePath}/lostPassword?requested=1`);
    const success = page.locator('[data-stylex-owner="lost-password-success-alert"]');
    await expect(success).toBeVisible();
    await expect(
      success.locator('[data-stylex-part="lost-password-success-alert-heading"]'),
    ).toHaveText("Mail has been sent.");
    await expect(
      success.locator('[data-stylex-part="lost-password-success-alert-dismiss"]'),
    ).toBeVisible();
    await expect(
      page.locator(
        ".page.full > .login-form-wrap .alert-success, .page.full > .login-form-wrap input.text",
      ),
    ).toHaveCount(0);
    await expect(success).toHaveCSS("background-color", "rgb(223, 240, 216)");
    await expect(page.locator("#loginId")).toHaveCSS("width", "386px");

    await page.goto(`${basePath}/lostPassword?error=invalid`);
    const error = page.locator('[data-stylex-owner="lost-password-error-alert"]');
    await expect(error).toBeVisible();
    await expect(
      error.locator('[data-stylex-part="lost-password-error-alert-heading"]'),
    ).toHaveText("Failed to send mail.");
    await expect(
      error.locator('[data-stylex-part="lost-password-error-alert-dismiss"]'),
    ).toBeVisible();
    await expect(
      page.locator(
        ".page.full > .login-form-wrap .alert-error, .page.full > .login-form-wrap input.text",
      ),
    ).toHaveCount(0);
    await expect(error).toHaveCSS("background-color", "rgb(242, 222, 222)");

    await page.unroute("**/api/v1/session");
    await page.route("**/api/v1/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { emailAddress: "door@example.com", isAnonymous: false, loginId: "door" },
      });
    });
    await page.goto(`${basePath}/lostPassword`);
    const authenticated = page.locator('[data-stylex-owner="lost-password-authenticated-prefill"]');
    await expect(authenticated).toBeVisible();
    await expect(
      authenticated.locator('[data-stylex-part="lost-password-authenticated-prefill-form-wrap"]'),
    ).toBeVisible();
    await expect(
      authenticated.locator('[data-stylex-part="lost-password-authenticated-prefill-login-id"]'),
    ).toBeVisible();
    await expect(
      authenticated.locator('[data-stylex-part="lost-password-authenticated-prefill-email"]'),
    ).toBeVisible();
    await expect(page.locator(".page.full > .login-form-wrap input.text")).toHaveCount(0);
    await expect(page.locator("#loginId")).toHaveValue("door");
    await expect(page.locator("#emailAddress")).toHaveValue("door@example.com");
  });
});
