import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const rootSource = new URL("../src/routes/__root.tsx", import.meta.url);
const themeSource = new URL("../src/routes/-root.stylex.ts", import.meta.url);

const desktop = { width: 1366, height: 900 };
const mobile = { width: 390, height: 844 };
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function openRootLoginDialog(page: Page) {
  await page.goto(`${basePath}/`);
  await page.locator("#required-logged-in > a.user-item-btn").click();
}

async function mockAnonymousRootShell(page: Page) {
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

test.describe("StyleX root login dialog", () => {
  test("declares a globally themed root login-dialog owner and stable parts", async () => {
    const [root, theme] = await Promise.all([
      readFile(rootSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(root).toContain('data-stylex-owner="root-login-dialog-frame"');
    expect(root).toContain('data-stylex-owner="root-login-dialog-body"');
    expect(root).toContain('"login-dialog-backdrop"');
    expect(root).toContain('data-stylex-part="login-dialog-close"');
    expect(root).toContain('data-stylex-part="login-dialog-form"');
    expect(root).toContain("const rootLoginDialogProps = stylex.props(");
    expect(root).toContain("visible && styles.rootLoginDialogVisible,");
    expect(root).toContain("className={rootLoginDialogProps.className}");
    expect(root).not.toContain('["loginDialog", rootLoginDialogProps.className]');
    expect(root).not.toContain('"modal hide loginDialog in"');
    expect(root).toContain('default: "460px"');
    expect(root).not.toContain("globalColors.");
    expect(theme).toContain("errorText");
  });

  test("opens from the root Log in CTA with legacy login form copy and navigation", async ({
    page,
  }) => {
    await mockAnonymousRootShell(page);
    await openRootLoginDialog(page);

    const dialog = page.locator('[data-stylex-owner="root-login-dialog-frame"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("id", "loginDialog");
    await expect(dialog).toHaveAttribute("role", "dialog");
    await expect(dialog).toHaveAttribute("aria-hidden", "false");
    await expect(dialog).not.toHaveClass(/\bloginDialog\b|\bmodal\b|\bhide\b|\bin\b/);
    await expect(dialog.locator('input[placeholder="Login ID or E-mail"]')).toBeVisible();
    await expect(dialog.locator('input[placeholder="Password"]')).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Reset password" })).toHaveAttribute(
      "href",
      `${basePath}/lostPassword`,
    );
    await expect(dialog.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      `${basePath}/users/signupform`,
    );
  });

  test("closes through close control, Escape, and backdrop", async ({ page }) => {
    await mockAnonymousRootShell(page);
    await openRootLoginDialog(page);
    const dialog = page.locator('[data-stylex-owner="root-login-dialog-frame"]');

    await dialog.locator('[data-stylex-part="login-dialog-close"]').click();
    await expect(dialog).toBeHidden();

    await openRootLoginDialog(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await openRootLoginDialog(page);
    await page
      .locator('[data-stylex-part="login-dialog-backdrop"]')
      .click({ position: { x: 2, y: 2 } });
    await expect(dialog).toBeHidden();
  });

  test("matches the legacy desktop dialog geometry and paint", async ({ page }) => {
    await mockAnonymousRootShell(page);
    await page.setViewportSize(desktop);
    await openRootLoginDialog(page);

    const dialog = page.locator('[data-stylex-owner="root-login-dialog-frame"]');
    const form = dialog.locator('[data-stylex-part="login-dialog-form"]');
    const backdrop = page.locator('[data-stylex-part="login-dialog-backdrop"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("width", "460px");
    await expect(dialog).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(dialog).toHaveCSS("border-radius", "6px");
    await expect(dialog).toHaveCSS("box-shadow", /rgba?\(0, 0, 0/);
    await expect(form).toHaveCSS("width", "400px");
    const loginInput = form.locator('input[placeholder="Login ID or E-mail"]');
    const passwordInput = form.locator('input[placeholder="Password"]');
    await expect(loginInput).toHaveCSS("height", "27px");
    await expect(passwordInput).toHaveCSS("height", "27px");
    await expect(loginInput).toHaveJSProperty("offsetHeight", 36);
    await expect(passwordInput).toHaveJSProperty("offsetHeight", 36);
    await expect(form.getByRole("button", { name: "Log in" })).toHaveCSS("height", "30px");
    await expect(backdrop).toHaveCSS("width", "1366px");
    await expect(backdrop).toHaveCSS("height", "900px");
    expect(await dialog.boundingBox()).toMatchObject({ height: 378, width: 462, x: 453, y: 90 });
    // Frame/body geometry and paint plus checked state are asserted above.
    await page.screenshot({
      path: "../output/playwright/stylex-root-login-dialog-desktop.png",
      fullPage: true,
    });
  });

  test("matches the legacy responsive mobile dialog geometry and paint", async ({ page }) => {
    await mockAnonymousRootShell(page);
    await page.setViewportSize(mobile);
    await openRootLoginDialog(page);

    const dialog = page.locator('[data-stylex-owner="root-login-dialog-frame"]');
    const backdrop = page.locator('[data-stylex-part="login-dialog-backdrop"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("left", "0px");
    await expect(dialog).toHaveCSS("margin-left", "0px");
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).toMatchObject({ height: 378, width: 392, x: 0 });
    expect(dialogBox?.y).toBeCloseTo(84.39, 1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(backdrop).toHaveCSS("width", "390px");
    await expect(backdrop).toHaveCSS("height", "844px");
    // Frame/body geometry and paint plus checked state are asserted above.
    await page.screenshot({
      path: "../output/playwright/stylex-root-login-dialog-mobile.png",
      fullPage: true,
    });
  });
});
