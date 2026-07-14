import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/users/signupform.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const fallbackSource = new URL(
  "../public/legacy-assets/stylesheets/legacy-fallback.css",
  import.meta.url,
);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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

async function openValidationState(page: Page) {
  await page.goto(`${basePath}/users/signupform`);
  const form = page.locator('form[name="signup"]');
  await form.getByRole("button", { name: "Sign up" }).click();
  const popovers = page.locator('[data-stylex-owner="standalone-signup-validation-popover"]');
  await expect(popovers).toHaveCount(4);
  return { form, popovers };
}

test.describe("StyleX standalone signup validation popover", () => {
  test("declares a standard-state-only StyleX popover while leaving frozen fallback consumers untouched", async () => {
    const [route, theme, fallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(fallbackSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="standalone-signup-validation-popover"');
    expect(route).toContain("stylex.props(styles.validationPopover)");
    expect(route).toContain("stylex.props(styles.validationPopoverArrow)");
    expect(route).toContain("standardPasswordSignup");
    expect(theme).toContain("standaloneSignupValidationPopoverMobileLeft");
    expect(theme).toContain("standaloneSignupValidationPopoverArrowLeftBorderColor");
    expect(fallback).toContain(".signup-form-wrap .popover.left");
  });

  test("renders submit and legacy blur/keyup validation copy, then cleans up React-owned surfaces", async ({
    page,
  }) => {
    await mockAnonymousSignup(page);
    const { form, popovers } = await openValidationState(page);
    await expect(popovers.locator('[data-stylex-part="validation-popover-content"]')).toHaveText([
      "Required field!",
      "Required field!",
      "Required field!",
      "Required field!",
    ]);
    expect(
      await popovers.evaluateAll((elements) =>
        elements.every(
          (element) =>
            !["popover", "left", "in"].some((className) => element.classList.contains(className)),
        ),
      ),
    ).toBe(true);
    await expect(popovers.locator(".arrow, .popover-content")).toHaveCount(0);

    await form.locator("#loginId").fill("bad_");
    await form.locator("#email").focus();
    await expect(
      page.locator(
        '[data-stylex-validation-for="loginId"] [data-stylex-part="validation-popover-content"]',
      ),
    ).toHaveText(
      "Login ID may contain alphanumeric characters as well as dashes, underscores or dots, but cannot begin or end with underscores or dots.",
    );
    await form.locator("#password").pressSequentially("abc");
    await expect(
      page.locator(
        '[data-stylex-validation-for="password"] [data-stylex-part="validation-popover-content"]',
      ),
    ).toHaveText("Password must be at least 4 characters in length.");
    await form.locator("#password").fill("passw0rd");
    await form.locator("#retypedPassword").fill("passw0rd");
    await form.locator("#retypedPassword").press("x");
    await expect(
      page.locator(
        '[data-stylex-validation-for="retypedPassword"] [data-stylex-part="validation-popover-content"]',
      ),
    ).toHaveText("Retyped password doesn't match");
    await form.locator("#retypedPassword").fill("passw0rd");
    await form.locator("#retypedPassword").press("ArrowRight");
    await expect(page.locator('[data-stylex-validation-for="retypedPassword"]')).toHaveCount(0);
  });

  test("matches desktop left-popover paint, arrow geometry, and input relation", async ({
    page,
  }) => {
    await mockAnonymousSignup(page);
    await page.setViewportSize({ height: 900, width: 1366 });
    await openValidationState(page);
    const popover = page.locator('[data-stylex-validation-for="loginId"]');
    const arrow = popover.locator('[data-stylex-part="validation-popover-arrow"]');
    const content = popover.locator('[data-stylex-part="validation-popover-content"]');

    await expect(popover).toHaveCSS("position", "absolute");
    await expect(popover).toHaveCSS("z-index", "1010");
    await expect(popover).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(popover).toHaveCSS("border-radius", "2px");
    await expect(popover).toHaveCSS("margin-left", "-10px");
    await expect(arrow).toHaveCSS("border-left-color", "rgba(0, 0, 0, 0.25)");
    await expect(arrow).toHaveCSS("border-width", "11px 0px 11px 11px");
    await expect(content).toHaveCSS("padding", "9px 10px");
    const boxes = await page.evaluate(() => {
      const input = document.querySelector("#loginId");
      const popover = document.querySelector<HTMLElement>('[data-stylex-validation-for="loginId"]');
      if (!input || !popover) return null;
      return { input: input.getBoundingClientRect(), popover: popover.getBoundingClientRect() };
    });
    expect(boxes).not.toBeNull();
    expect(boxes!.input.left - boxes!.popover.right).toBeCloseTo(10, 1);
    expect(boxes!.popover.top).toBeLessThan(boxes!.input.bottom);
    expect(boxes!.popover.bottom).toBeGreaterThan(boxes!.input.top);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.locator(".page.full")).toHaveScreenshot(
      "stylex-standalone-signup-validation-popover-desktop.png",
    );
  });

  test("matches responsive mobile left/content output without overflow", async ({ page }) => {
    await mockAnonymousSignup(page);
    await page.setViewportSize({ height: 844, width: 390 });
    await openValidationState(page);
    const popover = page.locator('[data-stylex-validation-for="loginId"]');
    const content = popover.locator('[data-stylex-part="validation-popover-content"]');

    await expect(popover).toHaveCSS("left", "24.375px");
    await expect(content).toHaveCSS("width", "150px");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.locator(".page.full")).toHaveScreenshot(
      "stylex-standalone-signup-validation-popover-mobile.png",
    );
  });

  test("leaves confirmation and social-only branches without validation-popover ownership", async ({
    page,
  }) => {
    await mockAnonymousSignup(page, { signupRequireConfirm: true });
    await page.goto(`${basePath}/users/signupform`);
    await expect(
      page.locator('[data-stylex-owner="standalone-signup-validation-popover"]'),
    ).toHaveCount(0);

    await page.unroute("**/api/v1/auth/capabilities");
    await mockAnonymousSignup(page, { socialLoginOnly: true });
    await page.reload();
    await expect(
      page.locator('[data-stylex-owner="standalone-signup-validation-popover"]'),
    ).toHaveCount(0);
  });
});
