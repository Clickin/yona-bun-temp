import { expect, test, type Page } from "@playwright/test";

test("user profile to email settings keeps the legacy user-settings shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserSettings(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/user/editform`);
  await expect(page.locator("#frmBasic")).toBeVisible();
  await captureUserSettingsShellNodes(page);
  await expectUserSettingsGeometry(page);

  await page.locator('.page-wrap > .nav-tabs a[href$="/user/editform/emails"]').click();
  await expect(page).toHaveURL(`${basePath}/user/editform/emails`);
  await expect(page.locator("form.form-inline.inner-bubble")).toBeVisible();
  await expect(page.locator(".page-wrap > .nav-tabs > li.active")).toHaveText("Email settings");
  await expectUserSettingsShellNodesToPersist(page);
  await expectUserSettingsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("form.form-inline.inner-bubble")).toBeVisible();
  await expectUserSettingsShellNodesToPersist(page);
  await expectUserSettingsGeometry(page);
});

test("user email to password settings keeps the legacy user-settings shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserSettings(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/user/editform/emails`);
  await expect(page.locator("form.form-inline.inner-bubble")).toBeVisible();
  await captureUserSettingsShellNodes(page);
  await expectUserSettingsGeometry(page);

  await page.locator('.page-wrap > .nav-tabs a[href$="/user/editform/password"]').click();
  await expect(page).toHaveURL(`${basePath}/user/editform/password`);
  await expect(page.locator("#frmPassword")).toBeVisible();
  await expect(page.locator(".page-wrap > .nav-tabs > li.active")).toHaveText("Change password");
  await expectUserSettingsShellNodesToPersist(page);
  await expectUserSettingsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#frmPassword")).toBeVisible();
  await expectUserSettingsShellNodesToPersist(page);
  await expectUserSettingsGeometry(page);
});

test("user password to token settings keeps the legacy user-settings shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserSettings(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/user/editform/password`);
  await expect(page.locator("#frmPassword")).toBeVisible();
  await captureUserSettingsShellNodes(page);
  await expectUserSettingsGeometry(page);

  await page.locator('.page-wrap > .nav-tabs a[href$="/user/editform/token"]').click();
  await expect(page).toHaveURL(`${basePath}/user/editform/token`);
  await expect(page.locator(".token-generate #frmBasic")).toBeVisible();
  await expect(page.locator(".page-wrap > .nav-tabs > li.active")).toHaveText("User Token");
  await expectUserSettingsShellNodesToPersist(page);
  await expectUserSettingsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".token-generate #frmBasic")).toBeVisible();
  await expectUserSettingsShellNodesToPersist(page);
  await expectUserSettingsGeometry(page);
});

test("user token to notification settings keeps the legacy user-settings shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserSettings(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/user/editform/token`);
  await expect(page.locator(".token-generate #frmBasic")).toBeVisible();
  await captureUserSettingsShellNodes(page);
  await expectUserSettingsGeometry(page);

  await page.locator('.page-wrap > .nav-tabs a[href$="/user/editform/notifications"]').click();
  await expect(page).toHaveURL(`${basePath}/user/editform/notifications`);
  await expect(page.locator("#notification-projects")).toBeVisible();
  await expect(page.locator(".page-wrap > .nav-tabs > li.active")).toHaveText(
    "Notification settings",
  );
  await expectUserSettingsShellNodesToPersist(page);
  await expectUserSettingsGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#notification-projects")).toBeVisible();
  await expectUserSettingsShellNodesToPersist(page);
  await expectUserSettingsGeometry(page);
});

async function mockUserSettings(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(workspaceBody()) });
  });
}

function workspaceBody() {
  return {
    emails: [],
    favoriteProjects: [],
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/assets/images/default-avatar-128.png",
      displayName: "Admin User",
      loginId: "admin",
      primaryEmailAddress: "admin@example.com",
    },
    pullRequestItems: [],
    recentProjects: [],
    watchedProjects: [
      {
        notifications: [{ enabled: true, eventType: "NEW_ISSUE" }],
        ownerName: "admin",
        projectId: "1",
        projectName: "sample",
      },
    ],
  };
}

async function captureUserSettingsShellNodes(page: Page) {
  await page.evaluate(() => {
    const shell = {
      breadcrumb: document.querySelector(".site-breadcrumb-outer"),
      gnb: document.querySelector(".gnb-outer"),
      pageWrap: document.querySelector(".page-wrap-outer"),
      tabs: document.querySelector(".page-wrap > .nav-tabs"),
    };
    if (Object.values(shell).some((element) => !element)) {
      throw new Error("Missing legacy user settings shell");
    }
    (window as Window & { __userSettingsShell?: typeof shell }).__userSettingsShell = shell;
  });
}

async function expectUserSettingsShellNodesToPersist(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const previous = (window as Window & { __userSettingsShell?: Record<string, Element> })
          .__userSettingsShell;
        return Boolean(
          previous &&
          previous.gnb === document.querySelector(".gnb-outer") &&
          previous.breadcrumb === document.querySelector(".site-breadcrumb-outer") &&
          previous.pageWrap === document.querySelector(".page-wrap-outer") &&
          previous.tabs === document.querySelector(".page-wrap > .nav-tabs"),
        );
      }),
    )
    .toBe(true);
}

async function expectUserSettingsGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const breadcrumb = rect(".site-breadcrumb-outer");
    const gnb = rect(".gnb-outer");
    const pageWrap = rect(".page-wrap-outer");
    const tabs = rect(".page-wrap > .nav-tabs");
    const body = rect(
      ".page-wrap > form, .page-wrap > #frmBasic, .page-wrap > .token-generate > #frmBasic, .page-wrap > div > #notification-projects",
    );
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      breadcrumbBottom: breadcrumb.bottom,
      breadcrumbLeft: breadcrumb.left,
      breadcrumbRight: breadcrumb.right,
      gnbBottom: gnb.bottom,
      gnbLeft: gnb.left,
      gnbRight: gnb.right,
      pageWrapBottom: pageWrap.bottom,
      pageWrapLeft: pageWrap.left,
      pageWrapRight: pageWrap.right,
      tabsBottom: tabs.bottom,
      tabsLeft: tabs.left,
      tabsRight: tabs.right,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbBottom).toBeGreaterThan(0);
  expect(metrics.breadcrumbBottom).toBeGreaterThan(metrics.gnbBottom);
  expect(metrics.pageWrapBottom).toBeGreaterThan(metrics.tabsBottom);
  expect(metrics.gnbLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.breadcrumbLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.pageWrapLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.tabsLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.gnbRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.breadcrumbRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.pageWrapRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.tabsRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}
