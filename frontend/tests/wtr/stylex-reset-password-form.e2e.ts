import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const routeSource = "../src/routes/resetPassword.tsx";
const routeThemeSource = "../src/routes/-resetPassword.stylex.ts";
const themeSource = "../src/theme.stylex.ts";
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

async function openValidTokenReset(page: Page) {
  await page.goto(`${basePath}/resetPassword?s=stylex-reset-token`);
  const owner = page.locator('[data-stylex-owner="reset-password-form"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX valid-token reset password form", () => {
  test("declares globally themed valid-token ownership while retaining real fallback states", async () => {
    const [route, routeTheme, theme, legacyFallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(routeThemeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(legacyFallbackSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner={validTokenReset ? "reset-password-form"');
    expect(route).toContain('"reset-password-password"');
    expect(route).toContain('"reset-password-submit"');
    expect(route).toContain("stylex.props(styles.textInput, styles.passwordInput)");
    expect(route).toContain("popover left in");
    expect(route).toContain("resetPasswordStyles.validationPopoverFallback");
    expect(route).toContain("validationPopoverPosition");
    expect(route).toContain('default: "400px"');
    expect(route).toContain("borderBottomColor: resetPasswordTheme.inputFocusBorder");
    expect(routeTheme).toContain('inputFocusBorder: "#f36c22"');
    expect(theme).not.toMatch(/^\s+resetPassword[A-Z]/m);
    expect(legacyFallback).toContain(".login-form-wrap .text");
    expect(legacyFallback).toContain(".login-form-wrap {\n    width: 95% !important;");
  });

  test("keeps legacy order, validation, and successful reset mutation", async ({ page }) => {
    await mockAnonymousSession(page);
    const requests: unknown[] = [];
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "stylex-reset-csrf" },
        json: { isAnonymous: true },
      });
    });
    await page.route("**/api/v1/auth/password-reset/complete", async (route) => {
      requests.push({
        body: route.request().postDataJSON(),
        csrfToken: route.request().headers()["x-csrf-token"],
      });
      await route.fulfill({ contentType: "application/json", json: {} });
    });

    const owner = await openValidTokenReset(page);
    expect(
      await owner
        .locator(":scope > div")
        .evaluateAll((nodes) => nodes.map((node) => node.className)),
    ).toEqual([
      expect.stringContaining("tag-line-wrap reset-password"),
      expect.stringContaining("login-form-wrap frm-wrap"),
    ]);
    await expect(owner.locator('[data-stylex-part="reset-password-title"]')).toHaveText(
      "Reset password for Yoram",
    );
    await expect(owner.locator('[data-stylex-part="reset-password-copy"]')).toHaveText(
      "Web-based platform for collaborative software development",
    );
    await expect(owner.locator('form[name="passwordReset"] input[type="hidden"]')).toHaveValue(
      "stylex-reset-token",
    );
    await expect(owner.locator("input.text, input.password")).toHaveCount(0);

    await owner.getByRole("button", { name: "Confirm" }).click();
    await expect(
      owner.locator('[data-stylex-owner="reset-password-validation-popover"]'),
    ).toHaveCount(2);
    await expect(
      owner.locator('[data-stylex-part="reset-password-validation-popover-content"]'),
    ).toHaveText(["Required field!", "Required field!"]);
    expect(requests).toEqual([]);

    await owner.locator('[data-stylex-part="reset-password-password"]').fill("new-pass");
    await owner.locator('[data-stylex-part="reset-password-retyped-password"]').fill("new-pass");
    await owner.locator('[data-stylex-part="reset-password-submit"]').click();
    await expect
      .poll(() => requests)
      .toEqual([
        {
          body: {
            hashString: "stylex-reset-token",
            password: "new-pass",
            retypedPassword: "new-pass",
          },
          csrfToken: "stylex-reset-csrf",
        },
      ]);
    await expect(page).toHaveURL(`${basePath}/users/loginform?password=reset`);
  });

  test("keeps the no-token fallback popover geometry without literal position styles", async ({
    page,
  }) => {
    await mockAnonymousSession(page);
    await page.goto(`${basePath}/resetPassword`);
    const form = page.locator('form[name="passwordReset"]');
    await form.locator("#password").focus();
    await form.locator("#password").blur();

    const popover = form.locator(".popover.left.in").first();
    await expect(popover).toBeVisible();
    await expect(popover).toHaveCSS("display", "block");
    await expect(popover).toHaveCSS("max-width", "144px");
    await expect(popover).toHaveCSS("position", "absolute");
    expect(await popover.getAttribute("style")).not.toMatch(/(?:^|;)\s*(?:left|top)\s*:/i);

    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test("matches legacy desktop geometry and paint", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(desktop);
    const owner = await openValidTokenReset(page);
    const form = owner.locator('[data-stylex-part="reset-password-form-wrap"]');
    const password = owner.locator('[data-stylex-part="reset-password-password"]');
    const retypedPassword = owner.locator('[data-stylex-part="reset-password-retyped-password"]');
    const submit = owner.locator('[data-stylex-part="reset-password-submit"]');

    await expect(form).toHaveCSS("width", "400px");
    await expect(password).toHaveCSS("width", "386px");
    await expect(password).toHaveCSS("height", "27px");
    await expect(password).toHaveCSS("font-size", "12px");
    await expect(password).toHaveCSS("font-weight", "700");
    await expect(password).toHaveCSS("margin-bottom", "15px");
    await expect(retypedPassword).toHaveCSS("margin-bottom", "15px");
    await expect(submit).toHaveCSS("width", "400px");
    await password.focus();
    await expect(password).toHaveCSS("border-bottom-color", "rgb(243, 108, 34)");
    expect(await form.boundingBox()).toMatchObject({ height: 132, width: 400, x: 483, y: 244 });
    expect(await password.boundingBox()).toMatchObject({ height: 36, width: 398, x: 483, y: 244 });
    expect(await retypedPassword.boundingBox()).toMatchObject({
      height: 36,
      width: 398,
      x: 483,
      y: 295,
    });
    expect(await submit.boundingBox()).toMatchObject({ height: 30, width: 400, x: 483, y: 346 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-reset-password-form-desktop.png",
    });
  });

  test("matches legacy responsive mobile geometry and paint", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(mobile);
    const owner = await openValidTokenReset(page);
    const form = owner.locator('[data-stylex-part="reset-password-form-wrap"]');
    const password = owner.locator('[data-stylex-part="reset-password-password"]');
    const retypedPassword = owner.locator('[data-stylex-part="reset-password-retyped-password"]');
    const submit = owner.locator('[data-stylex-part="reset-password-submit"]');

    await expect(form).toHaveCSS("width", "370.5px");
    await expect(password).toHaveCSS("width", "351.969px");
    await expect(password).toHaveCSS("margin-bottom", "15px");
    await expect(submit).toHaveCSS("width", "370.5px");
    expect(await form.boundingBox()).toMatchObject({ height: 132, width: 370.5, x: 9.75, y: 304 });
    expect(await password.boundingBox()).toMatchObject({
      height: 36,
      width: 363.96875,
      x: 9.75,
      y: 304,
    });
    expect(await retypedPassword.boundingBox()).toMatchObject({
      height: 36,
      width: 363.96875,
      x: 9.75,
      y: 355,
    });
    expect(await submit.boundingBox()).toMatchObject({
      height: 30,
      width: 370.5,
      x: 9.75,
      y: 406,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/stylex-reset-password-form-mobile.png",
    });
  });

  test("keeps invalid-token bad-request markup outside valid-token ownership", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto(`${basePath}/resetPassword?error=invalid&s=stylex-reset-token`);

    await expect(page.locator('[data-stylex-owner="reset-password-form"]')).toHaveCount(0);
    await expect(page.locator('[data-stylex-part="reset-password-password"]')).toHaveCount(0);
    await expect(page.locator(".reset-password-bad-request .error-wrap p")).toHaveText(
      "Wrong url to reset password.",
    );
  });
});
