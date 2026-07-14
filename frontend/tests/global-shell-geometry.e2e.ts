import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const LEGACY_FEEDBACK_URL = "https://github.com/yona-projects/yona/issues";
const SITEINTRO_BACKGROUND_PATH = "/src/assets/legacy/photo-svetacreative.jpg";
const SITEINTRO_BACKGROUND_URL = `${BASE_PATH === "/" ? "" : BASE_PATH}${SITEINTRO_BACKGROUND_PATH}`;

test.use({ locale: "en-US", viewport: { width: 1366, height: 900 } });

test("anonymous public shell matches live legacy desktop geometry and visible order", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  const sessionRequestPaths = await mockSession(page, { isAnonymous: true });
  const siteIntroBackgroundResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === SITEINTRO_BACKGROUND_URL,
  );

  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const backgroundResponse = await siteIntroBackgroundResponse;
  expect(backgroundResponse.status()).toBe(200);
  const expectedBackgroundUrl = new URL(SITEINTRO_BACKGROUND_URL, page.url()).href;
  expect(
    await page
      .locator('[data-stylex-owner="anonymous-home-intro"]')
      .evaluate((element) => getComputedStyle(element).backgroundImage),
  ).toContain(`url("${expectedBackgroundUrl}")`);

  const navItems = page.locator('[data-stylex-owner="global-gnb-nav"] > li');
  const brandItem = page.locator('[data-stylex-owner="global-gnb-brand-item"]');
  await expect(navItems).toHaveCount(5);
  await expect(brandItem.locator('[data-stylex-owner="global-gnb-brand-link"]')).toHaveText("Y");
  await expect(brandItem.locator('[data-stylex-owner="global-gnb-brand-link"]')).toHaveAttribute(
    "href",
    `${BASE_PATH}/`,
  );
  await expect(navItems.nth(1).locator("a")).toHaveText("List All");
  await expect(navItems.nth(1).locator("a")).toHaveAttribute("href", `${BASE_PATH}/projects`);
  await expect(navItems.nth(2)).toHaveAttribute(
    "data-stylex-owner",
    "global-gnb-project-list-divider",
  );
  const feedbackLink = navItems.nth(3).locator('[data-stylex-owner="global-gnb-feedback-link"]');
  await expect(feedbackLink).toHaveText("Yoram repository");
  await expect(feedbackLink).toHaveAttribute("href", LEGACY_FEEDBACK_URL);
  await expect(feedbackLink).toHaveAttribute("target", "_blank");
  await expect(navItems.nth(4).locator("form.gnb-search-form")).toBeVisible();
  await expect(navItems.nth(4).locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${BASE_PATH}/search`,
  );
  const loginLink = page.locator("#required-logged-in > a.user-item-btn");
  await expect(loginLink).toHaveAttribute("href", `${BASE_PATH}/users/loginform`);
  await expect(loginLink).not.toHaveAttribute("data-login");
  await expect(loginLink).toHaveAttribute("aria-controls", "loginDialog");
  await expect(loginLink).toHaveAttribute("aria-haspopup", "dialog");
  await expect(page.locator(".gnb-usermenu .ybtn-success")).toHaveAttribute(
    "href",
    `${BASE_PATH}/users/signupform`,
  );
  await expect(
    page.locator('[data-stylex-owner="anonymous-home-intro-signup-link"]'),
  ).toHaveAttribute("href", `${BASE_PATH}/users/signupform`);
  await expect.poll(() => sessionRequestPaths).toEqual([`${BASE_PATH}/api/v1/session`]);
  await assertOwnedShellHasNoPluginHooks(page);
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-divider"]')).toBeVisible();

  const metrics = await readShellMetrics(page);
  expect(metrics.viewport).toEqual({ height: 900, scrollWidth: 1366, width: 1366 });
  expectBox(metrics.navbar, { height: 40, width: 1366, x: 0, y: 0 });
  expectBox(metrics.inner, { height: 40, width: 1319.08, x: 23.45, y: 0 });
  expectBox(metrics.pin, { height: 26, width: 25, x: -6, y: 6 });
  expectBox(metrics.logo, { height: 29, width: 29.77, x: 80.45, y: 5 });
  expectBox(metrics.listAll, { height: 37, width: 63.02, x: 110.22, y: 1 });
  expectBox(metrics.divider, { height: 40, width: 3.11, x: 173.23, y: 0 });
  expectBox(metrics.feedback, { height: 37, width: 83.17, x: 176.34, y: 1 });
  expectBox(metrics.search, { height: 30, width: 112, x: 259.52, y: 5 });
  expectBox(metrics.heroCover, { height: 269, width: 750, x: 298, y: 40 });
  expectBox(metrics.heroHeading, { height: 40, width: 750, x: 298, y: 95 });

  expect(metrics.logo.right).toBeLessThanOrEqual(metrics.listAll.x);
  expect(metrics.listAll.right).toBeLessThanOrEqual(metrics.divider.x + 0.01);
  expect(metrics.divider.right).toBeLessThanOrEqual(metrics.feedback.x + 0.01);
  expect(metrics.feedback.right).toBeLessThanOrEqual(metrics.search.x + 0.01);
  expect(metrics.search.bottom).toBeLessThanOrEqual(metrics.navbar.bottom);
  expect(metrics.search.right).toBeLessThan(metrics.userMenu.x);
  expect(metrics.userMenu.right).toBeLessThanOrEqual(metrics.inner.right + 0.01);
  expect(metrics.heroHeading.x).toBe(metrics.heroCover.x);
  expect(metrics.heroHeading.right).toBe(metrics.heroCover.right);

  const pin = page.locator('[data-stylex-owner="global-sidebar-open-pin"]');
  await expect(pin).toBeVisible();
  await expect(pin.locator(".yobicon-arrow-right")).toBeVisible();
  await expect(pin.locator(".yobicon-arrow-left")).toBeHidden();
});

test("anonymous home login Link opens and dismisses the legacy root dialog", async ({ page }) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: true });
  await mockRootLoginCapabilities(page);

  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const initialUrl = page.url();
  const loginLink = page.locator("#required-logged-in > a.user-item-btn");
  expectBox(await readElementBox(loginLink), { height: 27, width: 59.08, x: 1195.47, y: 6 });

  await loginLink.click();

  const dialog = page.locator("#loginDialog");
  const backdrop = page.locator(".modal-backdrop.in");
  await expect(page).toHaveURL(initialUrl);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#loginIdOrEmailD")).toBeFocused();
  await expect(page.locator("#loginDialog .error")).toBeHidden();
  await expect(page.locator("#loginDialog form.login-form-wrap")).toHaveAttribute(
    "action",
    `${BASE_PATH}/users/login`,
  );
  await expect(backdrop).toHaveCount(1);

  const metrics = await readLoginDialogMetrics(page);
  expectBox(metrics.dialog, { height: 378, width: 462, x: 453, y: 90 });
  expectBox(metrics.body, { height: 376, width: 460, x: 454, y: 91 });
  expectBox(metrics.form, { height: 306, width: 400, x: 484, y: 126 });
  expectBox(metrics.identifier, { height: 36, width: 398, x: 484, y: 126 });
  expectBox(metrics.password, { height: 36, width: 398, x: 484, y: 172 });
  expectBox(metrics.submit, { height: 30, width: 400, x: 484, y: 223 });
  expectBox(metrics.backdrop, { height: 900, width: 1366, x: 0, y: 0 });
  expect(metrics.backdropOpacity).toBe("0.5");
  expect(metrics.backdropZIndex).toBe("1040");
  expect(metrics.dialogZIndex).toBe("1050");

  await page.locator("#loginDialog button.close").click();
  await expect(dialog).toBeHidden();
  await expect(backdrop).toHaveCount(0);
  await expect(page).toHaveURL(initialUrl);

  await loginLink.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(backdrop).toHaveCount(0);

  await loginLink.click();
  await backdrop.click({ position: { x: 4, y: 4 } });
  await expect(dialog).toBeHidden();
  await expect(backdrop).toHaveCount(0);
  await expect(page).toHaveURL(initialUrl);
});

test("anonymous mobile home login dialog keeps legacy Korean geometry without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installRuntimeConfig(page, { supportedLanguages: ["ko-KR"] });
  await mockSession(page, { isAnonymous: true });
  await mockRootLoginCapabilities(page);

  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const loginLink = page.locator("#required-logged-in > a.user-item-btn");
  await expect(loginLink).toHaveText("로그인");
  await expect(loginLink).not.toHaveAttribute("data-login");
  await loginLink.click();

  const metrics = await readLoginDialogMetrics(page);
  expectBox(await readElementBox(loginLink), { height: 27, width: 56.34, x: 228.42, y: 46 });
  expectBox(metrics.dialog, { height: 378, width: 392, x: 0, y: 84.39 });
  expectBox(metrics.body, { height: 376, width: 390, x: 1, y: 85.39 });
  expectBox(metrics.form, { height: 306, width: 342, x: 25, y: 120.39 });
  expectBox(metrics.identifier, { height: 36, width: 336.89, x: 25, y: 120.39 });
  expectBox(metrics.backdrop, { height: 844, width: 390, x: 0, y: 0 });
  expect(metrics.documentScrollWidth).toBe(390);
  expect(metrics.identifierFontSize).toBe("16px");
  await expect(page.locator("#loginIdOrEmailD")).toBeFocused();
});

test("anonymous public shell keeps the live legacy mobile wrapping without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installRuntimeConfig(page, { supportedLanguages: ["ko-KR"] });
  await mockSession(page, { isAnonymous: true });

  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-divider"]')).toBeVisible();

  const metrics = await readShellMetrics(page);
  expect(metrics.viewport).toEqual({ height: 844, scrollWidth: 390, width: 390 });
  expectBox(metrics.navbar, { height: 40, width: 390, x: 0, y: 0 });
  expectBox(metrics.inner, { height: 40, width: 362.59, x: 13.7, y: 0 });
  expectBox(metrics.pin, { height: 26, width: 25, x: -6, y: 6 });
  expectBox(metrics.logo, { height: 29, width: 29.77, x: 30.7, y: 5 });
  expectBox(metrics.listAll, { height: 37, width: 72.23, x: 60.47, y: 1 });
  expectBox(metrics.divider, { height: 40, width: 3.11, x: 132.7, y: 0 });
  expectBox(metrics.feedback, { height: 37, width: 132.78, x: 135.81, y: 1 });
  expectBox(metrics.heroCover, { height: 309, width: 410, x: -20, y: 40 });
  expectBox(metrics.heroHeading, { height: 80, width: 410, x: -20, y: 95 });

  expect(metrics.search.display).toBe("none");
  expect(metrics.search.width).toBe(0);
  expect(metrics.feedback.right).toBeLessThanOrEqual(metrics.nav.x + metrics.nav.width + 0.01);
  expect(metrics.userMenu.y).toBe(metrics.navbar.bottom);
  expect(metrics.userMenu.right).toBeLessThanOrEqual(metrics.inner.right + 0.01);
  expect(metrics.login.display).not.toBe("none");
  expect(metrics.login.color).toBe("rgb(93, 187, 224)");
  expect(metrics.signup.display).not.toBe("none");
  expect(metrics.login.y).toBeGreaterThanOrEqual(metrics.navbar.bottom);
  expect(metrics.signup.y).toBeGreaterThanOrEqual(metrics.navbar.bottom);
  expect(metrics.login.bottom).toBeLessThanOrEqual(metrics.heroHeading.y);
  expect(metrics.signup.bottom).toBeLessThanOrEqual(metrics.heroHeading.y);
  expect(metrics.login.right).toBeLessThanOrEqual(metrics.signup.x);
  expect(metrics.heroCover.right).toBe(390);
  expect(metrics.heroHeading.right).toBe(metrics.heroCover.right);
  await assertOwnedShellHasNoPluginHooks(page);
});

test("shared authenticated shell keeps navbar conditions and React-owned panel state", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: false, isGuest: false, isSiteAdmin: true });
  await mockAuthenticatedHomeData(page);

  await page.goto(`${BASE_PATH}/`);

  await expect(
    page.locator('[data-stylex-owner="global-gnb-nav"] > li').nth(1).locator("a"),
  ).toHaveText("List All");
  await expect(page.locator('[data-stylex-owner="global-gnb-feedback-link"]')).toHaveText(
    "Yoram repository",
  );
  await assertOwnedShellHasNoPluginHooks(page);

  const sidebar = page.locator("#mySidenav");
  const userMenuButton = page.locator("#sidebar-open-btn button.gnb-dropdown-toggle");
  await userMenuButton.click();
  await expect(sidebar).toHaveClass(/sidenav-open/);
  await expect(sidebar).toHaveCSS("width", "360px");
  await userMenuButton.click();
  await expect(sidebar).not.toHaveClass(/sidenav-open/);
});

test("guest session only suppresses List All and its divider", async ({ page }) => {
  await installRuntimeConfig(page);
  await mockSession(page, { isAnonymous: false });
  await mockAuthenticatedHomeData(page, { isGuest: true });

  await page.goto(`${BASE_PATH}/`);
  await expect(
    page.locator('[data-stylex-owner="global-gnb-nav"] > li > a', { hasText: "List All" }),
  ).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-divider"]')).toHaveCount(
    0,
  );
  await expect(page.locator('[data-stylex-owner="global-gnb-feedback-link"]')).toBeVisible();
});

test("hide-project-listing config only suppresses List All and its divider", async ({ page }) => {
  await installRuntimeConfig(page, { hideProjectListing: true });
  await mockSession(page, { isAnonymous: true, isGuest: false });

  await page.goto(`${BASE_PATH}/`);
  await expect(
    page.locator('[data-stylex-owner="global-gnb-nav"] > li > a', { hasText: "List All" }),
  ).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-divider"]')).toHaveCount(
    0,
  );
  await expect(page.locator('[data-stylex-owner="global-gnb-feedback-link"]')).toBeVisible();
});

async function installRuntimeConfig(page: Page, overrides: Record<string, unknown> = {}) {
  await page.addInitScript(
    ({ basePath, feedbackUrl, runtimeOverrides }) => {
      (
        window as Window & {
          __YONA_RUNTIME_CONFIG__?: Record<string, unknown>;
        }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl,
        hideProjectListing: false,
        supportedLanguages: ["en-US"],
        ...runtimeOverrides,
      };
    },
    { basePath: BASE_PATH, feedbackUrl: LEGACY_FEEDBACK_URL, runtimeOverrides: overrides },
  );
}

async function mockSession(page: Page, overrides: Record<string, unknown>) {
  const requestPaths: string[] = [];
  await page.route("**/api/v1/session", async (route) => {
    requestPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      body: JSON.stringify({
        actorId: null,
        defaultLandingPath: "/",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
        ...overrides,
      }),
      contentType: "application/json",
    });
  });
  return requestPaths;
}

async function mockRootLoginCapabilities(page: Page) {
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: ["github", "google"],
        socialLoginOnly: false,
      }),
    });
  });
}

async function mockAuthenticatedHomeData(
  page: Page,
  profileOverrides: Record<string, unknown> = {},
) {
  await page.route("**/api/v1/notifications?*", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ hasMore: false, items: [], total: 0 }),
      contentType: "application/json",
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emails: [],
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
          ...profileOverrides,
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      contentType: "application/json",
    });
  });
}

async function assertOwnedShellHasNoPluginHooks(page: Page) {
  for (const attribute of [
    "data-toggle",
    "data-placement",
    "data-action",
    "data-backdrop",
    "data-dismiss",
    "data-href",
    "data-loading-text",
    "data-url",
    "data-provider",
    "data-request-method",
    "data-request-uri",
    "data-spy",
    "data-target",
    "data-trigger",
  ]) {
    await expect(page.locator(`[data-stylex-owner=global-gnb-outer] [${attribute}]`)).toHaveCount(
      0,
    );
  }
}

async function readShellMetrics(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing geometry target: ${selector}`);
      }
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        color: getComputedStyle(element).color,
        display: getComputedStyle(element).display,
        height: rect.height,
        right: rect.right,
        width: rect.width,
        x: rect.x,
        y: rect.y,
      };
    };

    return {
      divider: box('[data-stylex-owner="global-gnb-project-list-divider"]'),
      feedback: box('[data-stylex-owner="global-gnb-feedback-link"]'),
      heroCover: box('[data-stylex-owner="anonymous-home-intro-cover"]'),
      heroHeading: box('[data-stylex-owner="anonymous-home-intro-heading"]'),
      inner: box('[data-stylex-owner="global-gnb-inner"]'),
      login: box("#required-logged-in"),
      listAll: box('[data-stylex-owner="global-gnb-nav"] > li:nth-child(2) > a'),
      logo: box('[data-stylex-owner="global-gnb-brand-link"]'),
      nav: box('[data-stylex-owner="global-gnb-nav"]'),
      navbar: box("[data-stylex-owner=global-gnb-outer]"),
      pin: box('[data-stylex-owner="global-sidebar-open-pin"]'),
      search: box(".gnb-search-form"),
      signup: box(".gnb-usermenu .ybtn-success"),
      userMenu: box(".gnb-usermenu"),
      viewport: {
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        width: innerWidth,
      },
    };
  });
}

function expectBox(
  actual: { height: number; width: number; x: number; y: number },
  expected: { height: number; width: number; x: number; y: number },
) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(1);
}

async function readElementBox(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
  });
}

async function readLoginDialogMetrics(page: Page) {
  return page.evaluate(() => {
    const elementBox = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing login dialog geometry target: ${selector}`);
      }
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
    };
    const dialog = document.querySelector<HTMLElement>("#loginDialog");
    const identifier = document.querySelector<HTMLElement>("#loginIdOrEmailD");
    const backdrop = document.querySelector<HTMLElement>(".modal-backdrop.in");
    if (!dialog || !identifier || !backdrop) {
      throw new Error("Missing login dialog style target.");
    }
    return {
      backdrop: elementBox(".modal-backdrop.in"),
      backdropOpacity: getComputedStyle(backdrop).opacity,
      backdropZIndex: getComputedStyle(backdrop).zIndex,
      body: elementBox("#loginDialog .modal-body"),
      dialog: elementBox("#loginDialog"),
      dialogZIndex: getComputedStyle(dialog).zIndex,
      documentScrollWidth: document.documentElement.scrollWidth,
      form: elementBox("#loginDialog form.login-form-wrap"),
      identifier: elementBox("#loginIdOrEmailD"),
      identifierFontSize: getComputedStyle(identifier).fontSize,
      password: elementBox("#passwordD"),
      submit: elementBox("#loginDialog button[type='submit']"),
    };
  });
}
