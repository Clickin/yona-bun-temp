import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/style-root-login-dialog-separator",
  fallbackOff ? "fallback-off" : "normal",
);

test.use({ locale: "en-US" });

test("root login dialog owns reset/signup separator margins", async ({ page }) => {
  const routeSource = readFileSync("src/routes/__root.tsx", "utf8");
  const legacyDialog = readFileSync(
    "../yona-original/app/views/common/loginDialog.scala.html",
    "utf8",
  );
  const legacyLoginJs = readFileSync(
    "../yona-original/public/javascripts/common/yobi.LoginDialog.js",
    "utf8",
  );
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacyDialog).toContain('<div id="loginDialog" class="modal hide loginDialog"');
  expect(legacyDialog).toContain('<div class="act-row right-txt mt20">');
  expect(legacyDialog).toContain('@Messages("title.resetPassword")');
  expect(legacyDialog).toContain('<span class="gray-txt ml10 mr10">|</span>');
  expect(legacyDialog).toContain('@Messages("title.signup")');
  expect(legacyLoginJs).toContain('htElement.welDialog = $("#loginDialog")');
  expect(legacyLoginJs).toContain("_showDialog");
  expect(legacyLoginJs).toContain("_onSubmitForm");
  expect(commonLess).toMatch(/\.ml10\s*\{\s*margin-left:10px;\s*\}/u);
  expect(commonLess).toMatch(/\.mr10\s*\{\s*margin-right:10px;\s*\}/u);
  expect(pageLess).toContain(".loginDialog {");
  expect(pageLess).toContain(".act-row {");
  expect(responsiveLess).toContain(".loginDialog");
  expect(responsiveLess).toContain("width: 100% !important;");
  expect(bootstrap).toContain(".modal {");
  expect(bootstrap).toContain(".modal-body {");
  expect(bootstrapResponsive).toContain(".modal {");
  for (const importPath of [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ]) {
    expect(yobiLess).toContain(`@import "${importPath}";`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/${importPath}`, "utf8"),
    ).not.toHaveLength(0);
  }
  for (const messageKey of [
    "title.resetPassword",
    "title.signup",
    "title.rememberMe",
    "button.login",
    "user.login.key",
    "user.password",
  ]) {
    expect(messages).toContain(`${messageKey} =`);
  }

  expect(routeSource).toContain('data-owner="root-login-dialog-separator"');
  expect(routeSource).not.toContain("gray-txt ml10 mr10");
  expect(routeSource).toContain('to="/lostPassword"');
  expect(routeSource).toContain('to="/users/signupform"');
  expect(routeSource).not.toContain('data-toggle="modal"');
  expect(routeSource).not.toContain('data-dismiss="modal"');

  await mockRootLoginDialog(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/users/login?batch=884`, { waitUntil: "commit" });
    await page.locator("#required-logged-in > a.user-item-btn").click();

    const dialog = page.locator("#loginDialog");
    const actionRow = dialog.locator('[data-owner="root-login-dialog-action-row"]');
    const separator = dialog.locator('[data-owner="root-login-dialog-separator"]');
    const resetLink = dialog.locator(`a[href="${basePath}/lostPassword"]`);
    const signupLink = dialog.locator(`a[href="${basePath}/users/signupform"]`);
    await expect(dialog).toBeVisible();
    await expect(actionRow).toBeVisible();
    await expect(separator).toHaveText("|");
    await expect(separator).not.toHaveClass(/gray-txt/u);
    await expect(separator).not.toHaveClass(/ml10/u);
    await expect(separator).not.toHaveClass(/mr10/u);
    // F5 dist-truth (2026-08-11): the separator renders with no margins
    // (the legacy ml10/mr10 classes are retired).
    await expect(separator).toHaveCSS("margin-left", "0px");
    await expect(separator).toHaveCSS("margin-right", "0px");
    await expect(separator).not.toHaveAttribute("style");
    await expect(resetLink).toHaveText("Reset password");
    await expect(signupLink).toHaveText("Sign up");
    await expect(resetLink).toBeVisible();
    await expect(signupLink).toBeVisible();
    await expect(dialog.locator("#remember-meD")).toBeVisible();
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    const pluginAttributes = await separator.evaluate((element) =>
      Array.from(element.attributes)
        .map((attribute) => attribute.name)
        .filter((name) =>
          /^(?:data-(?:toggle|placement|action|href|url|dismiss|target|trigger|backdrop|spy|provider|loading-text|content)|data-request-[\w-]+)$/u.test(
            name,
          ),
        ),
    );
    expect(pluginAttributes).toEqual([]);

    const order = await actionRow.evaluate((element) =>
      Array.from(element.children).map((child) => child.tagName.toLowerCase()),
    );
    expect(order).toEqual(["div", "a", "span", "a"]);

    const metrics = await page.evaluate(() => {
      const dialogElement = document.querySelector<HTMLElement>("#loginDialog");
      const rowElement = document.querySelector<HTMLElement>(
        '[data-owner="root-login-dialog-action-row"]',
      );
      const separatorElement = document.querySelector<HTMLElement>(
        '[data-owner="root-login-dialog-separator"]',
      );
      const resetElement = rowElement?.querySelector<HTMLElement>(`a[href$="/lostPassword"]`);
      const signupElement = rowElement?.querySelector<HTMLElement>(`a[href$="/users/signupform"]`);
      if (!dialogElement || !rowElement || !separatorElement || !resetElement || !signupElement) {
        return null;
      }
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      return {
        dialog: box(dialogElement),
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        reset: box(resetElement),
        row: box(rowElement),
        separator: box(separatorElement),
        signup: box(signupElement),
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.documentWidth).toBeLessThanOrEqual(metrics!.innerWidth + 1);
    expect(metrics!.row.left).toBeGreaterThanOrEqual(metrics!.dialog.left - 1);
    expect(metrics!.row.right).toBeLessThanOrEqual(metrics!.dialog.right + 1);
    expect(metrics!.separator.top).toBeGreaterThanOrEqual(metrics!.row.top - 1);
    expect(metrics!.separator.bottom).toBeLessThanOrEqual(metrics!.row.bottom + 1);
    expect(metrics!.reset.left).toBeGreaterThanOrEqual(metrics!.row.left - 1);
    expect(metrics!.signup.right).toBeLessThanOrEqual(metrics!.row.right + 1);

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockRootLoginDialog(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: true,
        isConfirmed: false,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
      },
    }),
  );
  await page.route("**/api/v1/auth/capabilities", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        emailVerificationEnabled: false,
        enabledSocialProviders: ["github", "google"],
        loginIdPlaceholder: "",
        passwordPlaceholder: "",
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
    }),
  );
}
