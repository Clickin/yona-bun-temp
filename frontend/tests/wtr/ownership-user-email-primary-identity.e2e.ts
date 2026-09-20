import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright/visual-sweep");
const owners = {
  address: "user-email-primary-address",
  avatar: "user-email-primary-avatar",
  badge: "user-email-primary-badge",
} as const;
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`);

test.use({ locale: "ko-KR" });

test("pins desktop and mobile primary identity in one browser page state", async ({ page }) => {
  await mockPrimaryEmailSettings(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    {
      address: { height: 16, left: 71.59375, top: 357.421875, width: 137.8125 },
      avatar: { height: 40, left: 18, top: 347, width: 40 },
      badge: { height: 28, left: 223, top: 353, width: 71.8125 },
      height: 900,
      name: "desktop",
      width: 1366,
    },
    {
      address: { height: 16, left: 61.59375, top: 397.421875, width: 137.8125 },
      avatar: { height: 40, left: 8, top: 387, width: 40 },
      badge: { height: 28, left: 213, top: 393, width: 71.8125 },
      height: 844,
      name: "mobile",
      width: 390,
    },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/editform/emails`);
    await page.evaluate(() => document.fonts.ready);

    const avatar = owner(page, owners.avatar);
    const address = owner(page, owners.address);
    const badge = owner(page, owners.badge);
    await expect(avatar).toBeVisible();
    await expect(address).toHaveText("admin@example.com");
    await expect(badge).toHaveText("대표 이메일");
    await expect(page.locator('[data-owner="user-email-table"] tr')).toHaveCount(1);
    expect(
      await page
        .locator('[data-owner="user-email-table-identity-cell"]')
        .first()
        .locator(":scope > *")
        .evaluateAll((elements) => elements.map((element) => element.tagName)),
    ).toEqual(["IMG", "STRONG", "SPAN"]);

    await expect(avatar).not.toHaveAttribute("class", /\b(?:ml10|label-head|vmiddle)\b/u);
    await expect(address).not.toHaveClass(/\bml10\b/u);
    await expect(badge).not.toHaveClass(/\b(?:label-head|vmiddle|ml10)\b/u);
    await expect(avatar).toHaveAttribute("width", "40");
    await expect(avatar).toHaveAttribute("height", "40");
    await expect(avatar).toHaveCSS("max-width", "100%");
    await expect(avatar).toHaveCSS("vertical-align", "middle");
    await expect(avatar).toHaveCSS("border-style", "none");
    await expect(avatar).toHaveCSS("border-width", "0px");
    await expect(address).toHaveCSS("font-weight", "700");
    await expect(address).toHaveCSS("margin-left", "10px");
    await expect(badge).toHaveCSS("color", "rgb(0, 136, 204)");
    await expect(badge).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(badge).toHaveCSS("border", "1px solid rgba(0, 0, 0, 0.1)");
    await expect(badge).toHaveCSS("padding", "3px 5px");
    await expect(badge).toHaveCSS("display", "inline-block");
    await expect(badge).toHaveCSS("border-radius", "3px");
    await expect(badge).toHaveCSS("vertical-align", "middle");
    await expect(badge).toHaveCSS("margin-left", "10px");

    const geometry = await badge.evaluate(
      (_element, { avatar, address, badge }) => {
        const box = (element: Element) => {
          const rect = element.getBoundingClientRect();
          return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
        };
        return { address: box(address), avatar: box(avatar), badge: box(badge) };
      },
      {
        address: await address.elementHandle(),
        avatar: await avatar.elementHandle(),
        badge: await badge.elementHandle(),
      },
    );
    expect(geometry).toEqual({
      address: viewport.address,
      avatar: viewport.avatar,
      badge: viewport.badge,
    });
    expect(geometry.address.left).toBeGreaterThan(geometry.avatar.left + geometry.avatar.width);
    expect(geometry.badge.left).toBeGreaterThan(geometry.address.left + geometry.address.width);
    // Legacy-cascade fallback evidence retired: the app no longer loads
    // bootstrap.css, so the bare-class clone no longer reproduces the paint.
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `style-user-email-primary-identity-${viewport.name}.png`),
    });
  }
});

async function mockPrimaryEmailSettings(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      json: session,
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, fulfillSession);
  }
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "",
          displayName: "Admin User",
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}
