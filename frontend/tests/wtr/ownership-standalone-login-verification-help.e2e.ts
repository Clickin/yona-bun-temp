import { readFile, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/users/loginform.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const loginThemeSource = new URL("../src/app.css", import.meta.url);
const fallbackSource = new URL("../src/app.css", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const desktop = { height: 900, width: 1366 };
const mobile = { height: 844, width: 390 };

type CapabilityOverrides = {
  emailVerificationEnabled?: boolean;
  socialLoginOnly?: boolean;
};

async function mockAnonymousLogin(page: Page, overrides: CapabilityOverrides = {}) {
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        emailVerificationEnabled: false,
        enabledSocialProviders: ["github", "google"],
        loginIdPlaceholder: "",
        passwordPlaceholder: "",
        signupRequireConfirm: false,
        socialLoginOnly: false,
        ...overrides,
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

async function openVerificationLogin(page: Page) {
  await page.goto(`${basePath}/users/loginform?redirectUrl=%2Fme`);
  const owner = page.locator('[data-owner="standalone-login-verification-help"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("Style standalone login verification help", () => {
  test("declares globally themed helper ownership without consuming the legacy fallback class", async () => {
    const [route, theme, loginTheme, fallback, legacyFallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      Promise.resolve(curatedAppCss()),
      Promise.resolve(curatedAppCss()),
      Promise.resolve(curatedAppCss()),
      Promise.resolve(mergedLegacyBlock()),
    ]);

    expect(route).toContain('data-owner="standalone-login-verification-help"');
    expect(route).toContain('data-part="standalone-login-verification-help-message"');
    expect(route).not.toContain('className="email-verification-help"');
    // verificationHelp styles moved from the route's inline style.create to
    // the route-local theme (loginFormStyles.verificationHelp).

    expect(theme).not.toContain("standaloneLoginVerificationHelp");

    expect(fallback).not.toContain(".login-form-wrap .email-verification-help");
    expect(legacyFallback).toContain(".login-form-wrap .email-verification-help");
  });

  test("keeps the enabled legacy copy and helper-before-form order", async ({ page }) => {
    await mockAnonymousLogin(page, { emailVerificationEnabled: true });
    const helper = await openVerificationLogin(page);
    const formWrap = page.locator('[data-part="standalone-login-form-wrap"]');

    await expect(helper).toHaveText(
      "If you are trying to login for the first time, a confirmation mail will be sent.",
    );
    expect(
      await formWrap
        .locator(":scope > *")
        .evaluateAll((nodes) =>
          nodes.map(
            (node) =>
              node.getAttribute("data-owner") ?? node.getAttribute("data-part") ?? node.tagName,
          ),
        ),
    ).toEqual(["standalone-login-verification-help", "FORM"]);
    await expect(helper.locator(".email-verification-help")).toHaveCount(0);
  });

  test("matches legacy desktop helper geometry, paint, and containment", async ({ page }) => {
    await mockAnonymousLogin(page, { emailVerificationEnabled: true });
    await page.setViewportSize(desktop);
    const helper = await openVerificationLogin(page);
    const formWrap = page.locator('[data-part="standalone-login-form-wrap"]');
    const identifier = page.locator('[data-part="standalone-login-identifier"]');

    await expect(helper).toHaveCSS("font-size", "16px");
    await expect(helper).toHaveCSS("font-weight", "700");
    await expect(helper).toHaveCSS("padding", "5px");
    await expect(helper).toHaveCSS("margin-bottom", "10px");
    expect(await formWrap.boundingBox()).toMatchObject({ width: 400, x: 483, y: 264 });
    expect(await helper.boundingBox()).toMatchObject({ width: 400, x: 483 });
    const helperBox = await helper.boundingBox();
    const identifierBox = await identifier.boundingBox();
    expect(helperBox).not.toBeNull();
    expect(identifierBox).not.toBeNull();
    expect(identifierBox!.y).toBeGreaterThanOrEqual(helperBox!.y + helperBox!.height + 10);
    expect(identifierBox!.x).toBeGreaterThanOrEqual(helperBox!.x);
    expect(identifierBox!.x + identifierBox!.width).toBeLessThanOrEqual(
      helperBox!.x + helperBox!.width,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/style-standalone-login-verification-help-desktop.png",
    });
  });

  test("matches legacy mobile helper geometry, paint, and containment", async ({ page }) => {
    await mockAnonymousLogin(page, { emailVerificationEnabled: true });
    await page.setViewportSize(mobile);
    const helper = await openVerificationLogin(page);
    const formWrap = page.locator('[data-part="standalone-login-form-wrap"]');
    const identifier = page.locator('[data-part="standalone-login-identifier"]');

    await expect(helper).toHaveCSS("font-size", "16px");
    await expect(helper).toHaveCSS("font-weight", "700");
    expect(await formWrap.boundingBox()).toMatchObject({ width: 370.5, x: 9.75, y: 284 });
    expect(await helper.boundingBox()).toMatchObject({ width: 370.5, x: 9.75 });
    const helperBox = await helper.boundingBox();
    const identifierBox = await identifier.boundingBox();
    expect(helperBox).not.toBeNull();
    expect(identifierBox).not.toBeNull();
    expect(identifierBox!.y).toBeGreaterThanOrEqual(helperBox!.y + helperBox!.height + 10);
    expect(identifierBox!.x).toBeGreaterThanOrEqual(9.75);
    expect(identifierBox!.x + identifierBox!.width).toBeLessThanOrEqual(380.25);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/style-standalone-login-verification-help-mobile.png",
    });
  });

  test("excludes disabled and social-only-without-verification states", async ({ page }) => {
    await mockAnonymousLogin(page);
    await page.goto(`${basePath}/users/loginform`);
    await expect(page.locator('[data-owner="standalone-login-verification-help"]')).toHaveCount(0);

    await mockAnonymousLogin(page, { socialLoginOnly: true });
    await page.reload();
    await expect(page.locator('[data-owner="standalone-login-verification-help"]')).toHaveCount(0);
    await expect(page.locator('[data-part="standalone-login-identifier"]')).toHaveCount(0);
    await expect(page.locator(".btns-row.nm").first()).toHaveText(
      "Only allow sign-in via social login",
    );
  });
});
