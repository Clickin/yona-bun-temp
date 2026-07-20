import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/users/signupform.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const fallbackSource = new URL("../src/app.css", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function mockAnonymousSignup(page: Page, capabilities: Record<string, unknown> = {}) {
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        defaultAdminContact: "moc.elpmaxe@nimda",
        emailVerificationEnabled: false,
        signupRequireConfirm: true,
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

async function openConfirmationNotice(page: Page) {
  await page.goto(`${basePath}/users/signupform`);
  const owner = page.locator('[data-stylex-owner="standalone-signup-confirmation-notice"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX standalone signup confirmation notice", () => {
  test("retires center-txt only for the confirmation state through a global theme variable", async () => {
    const [route, theme, fallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(fallbackSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="standalone-signup-confirmation-notice"');
    expect(route).toContain("styles.confirmationNotice");
    expect(route).toContain('textAlign: "center"');
    expect(route).not.toContain("center-txt ${confirmationNoticeClassName}");
    expect(theme).not.toContain("standaloneSignupConfirmationNotice");
    expect(route).not.toContain("globalColors.");
    expect(fallback).toContain(".center-txt");
  });

  test("preserves legacy two-paragraph copy, order, and obfuscated contact output", async ({
    page,
  }) => {
    await mockAnonymousSignup(page);
    const owner = await openConfirmationNotice(page);
    expect(await owner.evaluate((element) => !element.classList.contains("center-txt"))).toBe(true);
    await expect(owner.locator(":scope > p")).toHaveText([
      "Administrator admission is required for activation.",
      "If needed, please contact moc.elpmaxe@nimda",
    ]);
    await expect(owner.locator(":scope > p").nth(1).locator(".obfuscate")).toHaveText(
      "moc.elpmaxe@nimda",
    );
    expect(
      await page
        .locator(".page.full > *")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-stylex-owner") ?? element.className),
        ),
    ).toEqual([
      expect.stringContaining("tag-line-wrap signup"),
      "standalone-signup-confirmation-notice",
      "signup-form-wrap frm-wrap",
    ]);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`matches legacy ${viewport.name} centered notice geometry without overflow`, async ({
      page,
    }) => {
      await mockAnonymousSignup(page);
      await page.setViewportSize(viewport);
      const owner = await openConfirmationNotice(page);
      await expect(owner).toHaveCSS("text-align", "center");
      const geometry = await owner.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { center: box.left + box.width / 2, width: box.width };
      });
      expect(geometry.width).toBe(viewport.width);
      expect(geometry.center).toBe(viewport.width / 2);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expect(owner).toHaveScreenshot(
        `stylex-standalone-signup-confirmation-notice-${viewport.name}.png`,
      );
    });
  }

  test("keeps standard password and social-only states outside confirmation ownership", async ({
    page,
  }) => {
    await mockAnonymousSignup(page, { signupRequireConfirm: false });
    await page.goto(`${basePath}/users/signupform`);
    await expect(
      page.locator('[data-stylex-owner="standalone-signup-confirmation-notice"]'),
    ).toHaveCount(0);

    await page.unroute("**/api/v1/auth/capabilities");
    await mockAnonymousSignup(page, { signupRequireConfirm: false, socialLoginOnly: true });
    await page.reload();
    await expect(
      page.locator('[data-stylex-owner="standalone-signup-confirmation-notice"]'),
    ).toHaveCount(0);
  });
});
