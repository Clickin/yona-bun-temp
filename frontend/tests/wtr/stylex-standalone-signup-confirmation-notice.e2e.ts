import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/users/signupform.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const legacyFallbackSource = "public/legacy-assets/stylesheets/legacy-fallback.css";
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
    const [route, theme, legacyFallback] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(legacyFallbackSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="standalone-signup-confirmation-notice"');
    expect(route).toContain("styles.confirmationNotice");
    expect(route).toContain('textAlign: "center"');
    expect(route).not.toContain("center-txt ${confirmationNoticeClassName}");
    expect(theme).not.toContain("standaloneSignupConfirmationNotice");
    expect(route).not.toContain("globalColors.");
    // F6 copy-fix-current-dom: `.center-txt` lives in the legacy fallback stylesheet
    // (loaded only in fallback-ON builds; dist strips the link via
    // src/legacy-fallback-mode.ts), not in src/app.css — the confirmation notice
    // centers via stylex textAlign (signupform.tsx:308; legacy _common.less:162).
    expect(legacyFallback).toContain(".center-txt");
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
    // F6 copy-fix-current-dom: owners are unconditional since 040d9de5a (2026-07-19
    // 'extend signup ownership across capability states'), so `owner ?? className`
    // now returns the owners; assert the retained legacy classes directly
    // (signup.scala.html:27,40) instead.
    expect(
      await page
        .locator(".page.full > *")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-stylex-owner") ?? element.className),
        ),
    ).toEqual([
      "standalone-signup-tagline",
      "standalone-signup-confirmation-notice",
      "standalone-signup-form-wrap",
    ]);
    await expect(page.locator(".center-wrap.tag-line-wrap.signup")).toHaveCount(1);
    await expect(page.locator(".signup-form-wrap.frm-wrap")).toHaveCount(1);
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
