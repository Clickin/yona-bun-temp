import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/users/loginform.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const fallbackSource = new URL("../src/app.css", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const desktop = { height: 900, width: 1366 };
const mobile = { height: 844, width: 390 };

async function mockAnonymousLogin(page: Page, providers: string[] = ["github", "google"]) {
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        emailVerificationEnabled: false,
        enabledSocialProviders: providers,
        loginIdPlaceholder: "",
        passwordPlaceholder: "",
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
    });
  });
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

async function openStandardLogin(page: Page) {
  await page.goto(`${basePath}/users/loginform?redirectUrl=%2Fme`);
  const owner = page.locator('[data-stylex-owner="standalone-login-form"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX standalone login form", () => {
  test("declares globally themed standard-login ownership while retaining shared fallback consumers", async () => {
    const [route, theme, fallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(fallbackSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="standalone-login-form"');
    expect(route).toContain('data-stylex-part="standalone-login-identifier"');
    expect(route).toContain('data-stylex-part="standalone-login-submit"');
    expect(route).toContain("stylex.props(styles.textInput)");
    expect(route).toContain('className="ybtn oauth-login-btn"');
    expect(route).toContain('className="btns-row nm"');
    expect(theme).toContain("standaloneLoginFormWidth");
    expect(theme).toContain("standaloneLoginInputFocusBorderBottomColor");
    expect(theme).toContain("standaloneLoginActionLineHeight");
    expect(fallback).toContain(".login-form-wrap .text");
    expect(fallback).toContain(".oauth-login-btn");
    expect(fallback).toContain(".login-form-wrap {\n    width: 95% !important;");
  });

  test("keeps the legacy standard form order, copy, OAuth fallback, and password mutation", async ({
    page,
  }) => {
    await mockAnonymousLogin(page);
    const requests: unknown[] = [];
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "stylex-login-csrf" },
        json: { isAnonymous: true },
      });
    });
    await page.route("**/api/v1/auth/sign-in", async (route) => {
      requests.push({
        body: route.request().postDataJSON(),
        csrfToken: route.request().headers()["x-csrf-token"],
      });
      await route.fulfill({ contentType: "application/json", status: 401, json: {} });
    });

    const owner = await openStandardLogin(page);
    expect(
      await owner
        .locator(":scope > div")
        .evaluateAll((nodes) => nodes.map((node) => node.className)),
    ).toEqual([
      expect.stringContaining("tag-line-wrap login"),
      expect.stringContaining("login-form-wrap frm-wrap"),
    ]);
    await expect(owner.locator('[data-stylex-part="standalone-login-title"]')).toHaveText(
      "Log in to Yoram",
    );
    await expect(owner.locator('[data-stylex-part="standalone-login-copy"]')).toHaveText(
      "Web-based platform for collaborative software development",
    );
    await expect(owner.locator('[data-stylex-part="standalone-login-identifier"]')).toHaveAttribute(
      "placeholder",
      "Login ID or E-mail",
    );
    await expect(owner.locator('[data-stylex-part="standalone-login-password"]')).toHaveAttribute(
      "placeholder",
      "Password",
    );
    await expect(owner.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(owner.locator(".oauth-login-btn")).toHaveCount(2);
    await expect(owner.locator(".oauth-login-btn").first()).not.toHaveAttribute("data-stylex-part");
    await expect(owner.getByRole("link", { name: "Password forgotten?" })).toHaveAttribute(
      "href",
      `${basePath}/lostPassword`,
    );
    await expect(
      owner.locator('[data-stylex-part="standalone-login-remember-checkbox"]'),
    ).toBeChecked();

    await owner.locator('[data-stylex-part="standalone-login-identifier"]').fill("admin");
    await owner.locator('[data-stylex-part="standalone-login-password"]').fill("wrong-password");
    await owner.locator('[data-stylex-part="standalone-login-submit"]').click();
    await expect
      .poll(() => requests)
      .toEqual([
        {
          body: { identifier: "admin", password: "wrong-password", rememberMe: true },
          csrfToken: "stylex-login-csrf",
        },
      ]);
    await expect(owner.locator('[data-stylex-part="standalone-login-error"]')).toBeVisible();
  });

  test("matches legacy desktop geometry and paint", async ({ page }) => {
    await mockAnonymousLogin(page);
    await page.setViewportSize(desktop);
    const owner = await openStandardLogin(page);
    const form = owner.locator('[data-stylex-part="standalone-login-form-wrap"]');
    const identifier = owner.locator('[data-stylex-part="standalone-login-identifier"]');
    const password = owner.locator('[data-stylex-part="standalone-login-password"]');
    const submit = owner.locator('[data-stylex-part="standalone-login-submit"]');

    await expect(form).toHaveCSS("width", "400px");
    await expect(identifier).toHaveCSS("width", "386px");
    await expect(identifier).toHaveCSS("height", "27px");
    await expect(identifier).toHaveCSS("font-size", "12px");
    await expect(identifier).toHaveCSS("font-weight", "700");
    await expect(identifier).toHaveCSS("border-bottom-color", "rgb(204, 204, 204)");
    await expect(password).toHaveCSS("margin-bottom", "15px");
    await expect(submit).toHaveCSS("width", "400px");
    await identifier.focus();
    await expect(identifier).toHaveCSS("border-bottom-color", "rgb(243, 108, 34)");
    expect(await form.boundingBox()).toMatchObject({ width: 400, x: 483 });
    expect(await identifier.boundingBox()).toMatchObject({ height: 36, width: 398 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(owner).toHaveScreenshot("stylex-standalone-login-form-desktop.png");
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-standalone-login-form-desktop.png",
    });
  });

  test("matches legacy responsive mobile geometry and paint", async ({ page }) => {
    await mockAnonymousLogin(page);
    await page.setViewportSize(mobile);
    const owner = await openStandardLogin(page);
    const form = owner.locator('[data-stylex-part="standalone-login-form-wrap"]');
    const identifier = owner.locator('[data-stylex-part="standalone-login-identifier"]');
    const submit = owner.locator('[data-stylex-part="standalone-login-submit"]');

    await expect(form).toHaveCSS("width", "370.5px");
    await expect(identifier).toHaveCSS("width", "351.969px");
    await expect(submit).toHaveCSS("width", "370.5px");
    expect(await form.boundingBox()).toMatchObject({ width: 370.5, x: 9.75 });
    expect(await identifier.boundingBox()).toMatchObject({ width: 363.96875, x: 9.75 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(owner).toHaveScreenshot("stylex-standalone-login-form-mobile.png");
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-standalone-login-form-mobile.png",
    });
  });
});
