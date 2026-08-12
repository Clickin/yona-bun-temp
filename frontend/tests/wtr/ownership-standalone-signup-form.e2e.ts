import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/users/signupform.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const fallbackSource = new URL("../src/app.css", import.meta.url);
const legacyFallbackSource = "public/legacy-assets/stylesheets/legacy-fallback.css";
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const desktop = { height: 900, width: 1366 };
const mobile = { height: 844, width: 390 };

async function mockAnonymousSignup(page: Page, capabilities: Record<string, unknown> = {}) {
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: false,
        ...capabilities,
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

async function openStandardSignup(page: Page) {
  await page.goto(`${basePath}/users/signupform`);
  const owner = page.locator('[data-owner="standalone-signup-form"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("Style standalone signup form", () => {
  test("declares globally themed standard-signup ownership while retaining real shared fallbacks", async () => {
    const [route, theme, fallback, legacyFallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(fallbackSource, "utf8"),
      readFile(legacyFallbackSource, "utf8"),
    ]);

    // F6 copy-fix-current-dom: owners are applied unconditionally since 040d9de5a
    // (2026-07-19 'extend signup ownership across capability states') removed the
    // `standardPasswordSignup` conditional; legacy DOM/classes are preserved
    // (signup.scala.html:26-40).
    expect(route).toContain('data-owner="standalone-signup-form"');
    expect(route).toContain('data-owner="standalone-signup-title"');
    expect(route).toContain('data-owner="standalone-signup-form-wrap"');
    expect(route).toContain('"standalone-signup-login-id"');
    expect(route).toContain('"standalone-signup-submit"');

    expect(theme).toContain("accent");

    expect(legacyFallback).toContain(".signup-form-wrap .text");
    expect(legacyFallback).toContain(".signup-form-wrap {\n    width: 95% !important;");
    expect(legacyFallback).toContain(".signup-form-wrap .popover.left");
    expect(fallback).toContain("@layer legacy");
  });

  test("keeps the legacy standard form order, copy, validation, and registration payload", async ({
    page,
  }) => {
    await mockAnonymousSignup(page);
    const requests: unknown[] = [];
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "style-signup-csrf" },
        json: { isAnonymous: true },
      });
    });
    await page.route("**/api/v1/auth/register", async (route) => {
      requests.push({
        body: route.request().postDataJSON(),
        csrfToken: route.request().headers()["x-csrf-token"],
      });
      await route.fulfill({ contentType: "application/json", status: 500, json: {} });
    });

    const owner = await openStandardSignup(page);
    expect(
      await owner
        .locator(":scope > div")
        .evaluateAll((nodes) => nodes.map((node) => node.className)),
    ).toEqual([
      expect.stringContaining("tag-line-wrap signup"),
      expect.stringContaining("signup-form-wrap frm-wrap"),
    ]);
    await expect(owner.locator('[data-part="standalone-signup-title"]')).toHaveText(
      "Sign up for Yoram",
    );
    await expect(owner.locator('[data-part="standalone-signup-copy"]')).toHaveText(
      "Web-based platform for collaborative software development",
    );
    await expect(owner.locator("label")).toHaveText([
      "User ID (lower case)",
      "Name",
      "Email address",
      "Password",
      "Password confirmation",
    ]);
    await expect(owner.locator("input")).toHaveCount(5);
    await expect(owner.locator("input.text, input.password")).toHaveCount(0);
    await expect(owner.locator('[data-part="standalone-signup-actions"]')).toHaveText(
      "Already signed up? Log in",
    );
    await expect(owner.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      `${basePath}/users/loginform`,
    );

    await owner.getByRole("button", { name: "Sign up" }).click();
    await expect(owner.locator('[data-owner="standalone-signup-validation-popover"]')).toHaveCount(
      4,
    );
    expect(requests).toEqual([]);

    await owner.locator('[data-part="standalone-signup-login-id"]').fill("door");
    await owner.locator('[data-part="standalone-signup-name"]').fill("Door");
    await owner.locator('[data-part="standalone-signup-email"]').fill("door@example.com");
    await owner.locator('[data-part="standalone-signup-password"]').fill("passw0rd");
    await owner.locator('[data-part="standalone-signup-retyped-password"]').fill("passw0rd");
    await owner.getByRole("button", { name: "Sign up" }).click();
    await expect
      .poll(() => requests)
      .toEqual([
        {
          body: {
            emailAddress: "door@example.com",
            loginId: "door",
            name: "Door",
            password: "passw0rd",
            retypedPassword: "passw0rd",
          },
          csrfToken: "style-signup-csrf",
        },
      ]);
  });

  test("matches legacy desktop geometry and paint", async ({ page }) => {
    await mockAnonymousSignup(page);
    await page.setViewportSize(desktop);
    const owner = await openStandardSignup(page);
    const form = owner.locator('[data-part="standalone-signup-form-wrap"]');
    const loginId = owner.locator('[data-part="standalone-signup-login-id"]');
    const password = owner.locator('[data-part="standalone-signup-password"]');
    const submit = owner.locator('[data-part="standalone-signup-submit"]');

    await expect(form).toHaveCSS("width", "400px");
    await expect(loginId).toHaveCSS("width", "386px");
    await expect(loginId).toHaveCSS("height", "27px");
    await expect(loginId).toHaveCSS("font-size", "12px");
    await expect(loginId).toHaveCSS("font-weight", "700");
    await password.focus();
    await expect(loginId).toHaveCSS("border-bottom-color", "rgb(204, 204, 204)");
    await expect(password).toHaveCSS("margin-bottom", "15px");
    await expect(submit).toHaveCSS("width", "400px");
    await loginId.focus();
    await expect(loginId).toHaveCSS("border-bottom-color", "rgb(243, 108, 34)");
    expect(await form.boundingBox()).toMatchObject({ width: 400, x: 483 });
    // F5 dist-truth (2026-08-11): the login-id input box is 35px tall.
    expect(await loginId.boundingBox()).toMatchObject({ height: 35, width: 398, x: 483 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.reload();
    const cleanOwner = page.locator('[data-owner="standalone-signup-form"]');
    await expect(cleanOwner).toBeVisible();
    await cleanOwner.locator('[data-part="standalone-signup-login-id"]').focus();
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/style-standalone-signup-form-desktop.png",
    });
  });

  test("matches legacy responsive mobile geometry and paint without overflow", async ({ page }) => {
    await mockAnonymousSignup(page);
    await page.setViewportSize(mobile);
    const owner = await openStandardSignup(page);
    const form = owner.locator('[data-part="standalone-signup-form-wrap"]');
    const loginId = owner.locator('[data-part="standalone-signup-login-id"]');
    const submit = owner.locator('[data-part="standalone-signup-submit"]');

    await expect(form).toHaveCSS("width", "370.5px");
    await expect(loginId).toHaveCSS("width", "148.188px");
    await expect(submit).toHaveCSS("width", "370.5px");
    expect(await form.boundingBox()).toMatchObject({ width: 370.5, x: 9.75 });
    expect(await loginId.boundingBox()).toMatchObject({ width: 160.1875, x: 220.0625 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: "../output/playwright/style-standalone-signup-form-mobile.png",
    });
  });

  test("leaves confirmation and social-only branches outside standard Style ownership", async ({
    page,
  }) => {
    await mockAnonymousSignup(page, { signupRequireConfirm: true });
    await page.goto(`${basePath}/users/signupform`);
    // F6 copy-fix-current-dom: the owner sits on the `.page.full` wrapper
    // unconditionally since 040d9de5a (signupform.tsx:287); the legacy wrapper
    // exists in all capability branches (signup.scala.html:26) and the app
    // preserves it — owner attrs are invisible app-only markers. Confirmation
    // mode renders the notice ALONGSIDE the standard form (signup.scala.html:27-40),
    // so the field parts stay owned; social-only mode is the branch that drops them.
    await expect(page.locator('[data-owner="standalone-signup-form"]')).toHaveCount(1);
    await expect(page.locator('[data-part="standalone-signup-login-id"]')).toHaveCount(1);
    const confirmationNotice = page.locator('[data-owner="standalone-signup-confirmation-notice"]');
    await expect(confirmationNotice).toBeVisible();
    await expect(
      confirmationNotice.locator('[data-part="signup-confirmation-primary"]'),
    ).toHaveText("Administrator admission is required for activation.");

    await page.unroute("**/api/v1/auth/capabilities");
    await mockAnonymousSignup(page, { socialLoginOnly: true });
    await page.reload();
    await expect(page.locator('[data-owner="standalone-signup-form"]')).toHaveCount(1);
    await expect(page.locator('[data-part="standalone-signup-login-id"]')).toHaveCount(0);
    await expect(page.locator(".signup-form-wrap .btns-row.nm")).toHaveText(
      "Only allow sign-in via social login",
    );
  });
});
