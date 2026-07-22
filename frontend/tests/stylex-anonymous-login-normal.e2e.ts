import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

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

async function openAnonymousLogin(page: Page) {
  await page.goto(`${basePath}/users/loginform?redirectUrl=%2Fme`);
  const owner = page.locator('[data-stylex-owner="standalone-login-form"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX anonymous default login form", () => {
  test("maps the frozen Scala skeleton and keeps route-local StyleX ownership", async () => {
    const [route, styles, legacy] = await Promise.all([
      readFile(new URL("../src/routes/users/loginform.tsx", import.meta.url), "utf8"),
      readFile(new URL("../src/routes/users/-loginform.stylex.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../../yona-original/app/views/user/login.scala.html", import.meta.url),
        "utf8",
      ),
    ]);

    expect(legacy).toContain('<div class="page full">');
    expect(legacy).toContain('<div class="center-wrap tag-line-wrap login">');
    expect(legacy).toContain('name="redirectUrl"');
    expect(legacy).toContain('id="loginIdOrEmailD"');
    expect(legacy).toContain('id="password"');
    expect(legacy).toContain('class="btns-row nm"');
    expect(legacy).toContain('class="act-row mt5"');
    expect(route).toContain("import { loginFormStyles");
    expect(route).toContain('data-stylex-owner="standalone-login-form"');
    expect(route).not.toMatch(/\b(?:document|globalThis\.document|window\.document)\b/u);
    expect(route).not.toMatch(/(?:addEventListener|classList|dangerouslySetInnerHTML|href=["']#)/u);
    expect(route).not.toMatch(/style\s*=/u);
    expect(styles).toContain("export const loginFormStyles = stylex.create");
    expect(styles).toContain('default: "400px"');
    expect(styles).toContain('default: "386px"');
  });

  test("renders only the anonymous normal DOM/order/copy and field contract", async ({ page }) => {
    await mockAnonymousSession(page);
    const owner = await openAnonymousLogin(page);
    const directChildren = await owner
      .locator(":scope > div")
      .evaluateAll((nodes) => nodes.map((node) => node.className));
    expect(directChildren).toEqual([
      expect.stringContaining("center-wrap tag-line-wrap login"),
      expect.stringContaining("login-form-wrap frm-wrap"),
    ]);
    await expect(owner.locator('[data-stylex-part="standalone-login-title"]')).toHaveText(
      "Log in to Yoram",
    );
    await expect(owner.locator('[data-stylex-part="standalone-login-copy"]')).toHaveText(
      "Web-based platform for collaborative software development",
    );

    const form = owner.locator(".login-form-wrap > form");
    await expect(form).toHaveAttribute("action", `${basePath}/users/login`);
    await expect(form).toHaveAttribute("method", "POST");
    await expect(form.locator('input[type="hidden"][name="redirectUrl"]')).toHaveValue("/me");
    await expect(form.locator("dl > dd")).toHaveCount(2);
    await expect(form.locator("#loginIdOrEmailD")).toHaveAttribute("name", "loginIdOrEmail");
    await expect(form.locator("#loginIdOrEmailD")).toHaveAttribute(
      "placeholder",
      "Login ID or E-mail",
    );
    await expect(form.locator("#loginIdOrEmailD")).toHaveAttribute("autocomplete", "off");
    await expect(form.locator("#password")).toHaveAttribute("name", "password");
    await expect(form.locator("#password")).toHaveAttribute("placeholder", "Password");
    await expect(form.locator("#password")).toHaveAttribute("autocomplete", "off");
    await expect(form.locator("button[type=submit]")).toHaveText("Log in");
    await expect(form.locator(":scope > .btns-row.nm")).toHaveCount(1);
    await expect(form.locator(".act-row.mt5 .remember-me-wrap")).toContainText("Stay logged in");
    await expect(form.locator(".links-wrap a")).toHaveAttribute("href", `${basePath}/lostPassword`);
    await expect(
      owner.locator(".email-verification-help, .oauth-login-btn, .error-message"),
    ).toHaveCount(0);
    expect(await owner.locator("[style]").count()).toBe(0);
  });

  test("keeps legacy desktop and mobile form geometry contained", async ({ page }) => {
    await mockAnonymousSession(page);
    await page.setViewportSize(desktop);
    const owner = await openAnonymousLogin(page);
    const formWrap = owner.locator('[data-stylex-part="standalone-login-form-wrap"]');
    const identifier = owner.locator('[data-stylex-part="standalone-login-identifier"]');
    const password = owner.locator('[data-stylex-part="standalone-login-password"]');
    await expect(formWrap).toHaveCSS("width", "400px");
    await expect(identifier).toHaveCSS("width", "386px");
    await expect(identifier).toHaveCSS("height", "27px");
    await expect(password).toHaveCSS("margin-bottom", "15px");
    expect(await formWrap.boundingBox()).toMatchObject({ width: 400 });

    await page.setViewportSize(mobile);
    await expect(formWrap).toHaveCSS("width", "370.5px");
    await expect(identifier).toHaveCSS("width", "351.969px");
    const formBox = await formWrap.boundingBox();
    const inputBox = await identifier.boundingBox();
    expect(formBox).not.toBeNull();
    expect(inputBox).not.toBeNull();
    expect(inputBox!.x).toBeGreaterThanOrEqual(formBox!.x);
    expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(formBox!.x + formBox!.width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
});
