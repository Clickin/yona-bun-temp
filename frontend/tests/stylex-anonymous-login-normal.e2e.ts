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
    const [route, styles, legacy, yobi, pageLess, common, bootstrap, responsive, messages] =
      await Promise.all([
        readFile(new URL("../src/routes/users/loginform.tsx", import.meta.url), "utf8"),
        readFile(new URL("../src/routes/users/-loginform.stylex.ts", import.meta.url), "utf8"),
        readFile(
          new URL("../../yona-original/app/views/user/login.scala.html", import.meta.url),
          "utf8",
        ),
        readFile(
          new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
          "utf8",
        ),
        readFile(
          new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
          "utf8",
        ),
        readFile(
          new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
          "utf8",
        ),
        readFile(
          new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
          "utf8",
        ),
        readFile(
          new URL(
            "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
            import.meta.url,
          ),
          "utf8",
        ),
        readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
      ]);

    expect(legacy).toContain('<div class="page full">');
    expect(legacy).toContain('<div class="center-wrap tag-line-wrap login">');
    expect(legacy).toContain('name="redirectUrl"');
    expect(legacy).toContain('id="loginIdOrEmailD"');
    expect(legacy).toContain('id="password"');
    expect(legacy).toContain('class="btns-row nm"');
    expect(legacy).toContain('class="act-row mt5"');
    expect(legacy).toContain('class="remember-me-wrap pull-left"');
    expect(legacy).toContain('class="links-wrap pull-right"');
    expect(legacy).toContain('name="rememberMe" class="checkbox" checked');
    expect(legacy).toContain('@Messages("title.rememberMe")');
    expect(legacy).toContain('@Messages("title.forgotpassword")');
    for (const importPath of [
      "_variables.less",
      "_mixins.less",
      "_common.less",
      "_sprites.less",
      "_page.less",
      "_tippy.less",
      "_scrollbar.less",
      "_responsive.less",
      "_yobiUI.less",
      "_temporary.less",
      "_markdown.less",
      "_migration.less",
      "_override.less",
    ]) {
      expect(yobi).toContain(`@import "less/${importPath}";`);
    }
    expect(pageLess).toMatch(/\.remember-me-wrap\s*\{[\s\S]*?margin-top:0px;/u);
    expect(pageLess).toMatch(/\.checkbox\s*\{[\s\S]*?margin-top:4px\s*!important;/u);
    expect(pageLess).toMatch(/\.act-row\s*\{\s*line-height:22px;\s*overflow:auto;/u);
    expect(common).toContain("body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{");
    expect(bootstrap).toMatch(/\.pull-right\s*\{\s*float:\s*right;\s*\}/u);
    expect(bootstrap).toMatch(/\.pull-left\s*\{\s*float:\s*left;\s*\}/u);
    expect(responsive).toContain('input[type="checkbox"]');
    expect(messages).toContain("title.forgotpassword = Password forgotten?");
    expect(messages).toContain("title.rememberMe = Stay logged in");
    expect(route).toContain("import { loginFormStyles");
    expect(route).toContain('data-stylex-owner="standalone-login-form"');
    expect(route).not.toMatch(/\b(?:document|globalThis\.document|window\.document)\b/u);
    expect(route).not.toMatch(/(?:addEventListener|classList|dangerouslySetInnerHTML|href=["']#)/u);
    expect(route).not.toMatch(/style\s*=/u);
    expect(styles).toContain("export const loginFormStyles = stylex.create");
    expect(styles).toMatch(/rememberMe:\s*\{[\s\S]*?float:\s*"left"/u);
    expect(styles).toMatch(/linksWrap:\s*\{\s*float:\s*"right"/u);
    expect(route).not.toMatch(/remember-me-wrap pull-left|links-wrap pull-right/u);
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
    await expect(form.locator("#remember-me")).toBeChecked();
    await expect(form.locator(".act-row.mt5 .remember-me-wrap")).not.toHaveClass(/pull-left/u);
    await expect(form.locator(".act-row.mt5 .links-wrap")).not.toHaveClass(/pull-right/u);
    await expect(form.locator(".links-wrap a")).toHaveAttribute("href", `${basePath}/lostPassword`);
    await expect(form.locator(".links-wrap")).toContainText("Password forgotten?");
    await expect(form.locator(".act-row.mt5")).toHaveCSS("line-height", "22px");
    await expect(form.locator(".act-row.mt5")).toHaveCSS("overflow", "auto");
    await expect(form.locator(".remember-me-wrap")).toHaveCSS("margin-top", "0px");
    await expect(form.locator(".remember-me-wrap")).toHaveCSS("float", "left");
    await expect(form.locator(".links-wrap")).toHaveCSS("float", "right");
    await expect(form.locator("#remember-me")).toHaveCSS("margin-top", "4px");
    expect(
      await form
        .locator(
          ".act-row.mt5 [data-toggle], .act-row.mt5 [data-action], .act-row.mt5 [data-url], .act-row.mt5 [data-request-url], .act-row.mt5 [data-dismiss], .act-row.mt5 [data-target]",
        )
        .count(),
    ).toBe(0);
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
    const actionRow = owner.locator('[data-stylex-part="standalone-login-actions"]');
    const remember = owner.locator(".remember-me-wrap");
    const links = owner.locator(".links-wrap");
    await expect(formWrap).toHaveCSS("width", "400px");
    await expect(identifier).toHaveCSS("width", "386px");
    await expect(identifier).toHaveCSS("height", "27px");
    await expect(password).toHaveCSS("margin-bottom", "15px");
    expect(await formWrap.boundingBox()).toMatchObject({ width: 400 });
    const desktopAction = await actionRow.boundingBox();
    const desktopRemember = await remember.boundingBox();
    const desktopLinks = await links.boundingBox();
    expect(desktopAction).not.toBeNull();
    expect(desktopRemember).not.toBeNull();
    expect(desktopLinks).not.toBeNull();
    expect(desktopRemember!.x).toBeGreaterThanOrEqual(desktopAction!.x);
    expect(desktopLinks!.x + desktopLinks!.width).toBeLessThanOrEqual(
      desktopAction!.x + desktopAction!.width,
    );

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
    const mobileAction = await actionRow.boundingBox();
    const mobileRemember = await remember.boundingBox();
    const mobileLinks = await links.boundingBox();
    expect(mobileAction).not.toBeNull();
    expect(mobileRemember).not.toBeNull();
    expect(mobileLinks).not.toBeNull();
    expect(mobileRemember!.x).toBeGreaterThanOrEqual(mobileAction!.x);
    expect(mobileLinks!.x + mobileLinks!.width).toBeLessThanOrEqual(
      mobileAction!.x + mobileAction!.width,
    );
    expect(mobileAction!.x + mobileAction!.width).toBeLessThanOrEqual(390);
  });
});
