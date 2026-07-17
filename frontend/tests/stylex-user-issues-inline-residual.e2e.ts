import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("user issues owns static popover anchors with route-local StyleX", async ({ page }) => {
  const source = readFileSync("src/routes/user/issues.tsx", "utf8");
  const styleSource = readFileSync("src/routes/user/-issues.stylex.ts", "utf8");
  const legacy = readFileSync(
    "../yona-original/app/views/issue/my_partial_search.scala.html",
    "utf8",
  );
  const menuLegacy = readFileSync(
    "../yona-original/app/views/common/mySeriesMenuTab.scala.html",
    "utf8",
  );
  const twoColumnLegacy = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const subtasksLegacy = readFileSync(
    "../yona-original/app/views/common/showSubtasksCheckbox.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobiUiLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
    "utf8",
  );

  expect(legacy).toContain('<ul class="nav nav-tabs nm">');
  expect(menuLegacy).toContain('id="setDefaultLoginPage"');
  expect(twoColumnLegacy).toContain('id="two-column-mode-checkbox"');
  expect(subtasksLegacy).toContain('id="toggle-show-subtasks"');
  expect(pageLess).toContain(".two-column-icon, .show-subtasks");
  expect(responsiveLess).toContain(".nav-tabs li a");
  expect(yobiUiLess).toContain(".popover {");
  expect(source).toContain('data-stylex-owner="user-issues-default-login-anchor"');
  expect(source).toContain('data-stylex-owner="user-issues-two-column-anchor"');
  expect(source).toContain('data-stylex-owner="user-issues-subtasks-anchor"');
  expect(source).not.toContain('style={{ position: "relative" }}');
  expect(styleSource).toContain('relativeAnchor: { position: "relative" }');

  await mockUserIssues(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/user/issues`, { waitUntil: "commit" });

  const defaultAnchor = page.locator('[data-stylex-owner="user-issues-default-login-anchor"]');
  const twoColumnAnchor = page.locator('[data-stylex-owner="user-issues-two-column-anchor"]');
  const subtasksAnchor = page.locator('[data-stylex-owner="user-issues-subtasks-anchor"]');
  await expect(defaultAnchor).toHaveCSS("position", "relative");
  await expect(twoColumnAnchor).toHaveCSS("position", "relative");
  await expect(subtasksAnchor).toHaveCSS("position", "relative");

  await defaultAnchor.locator("#setDefaultLoginPage").hover();
  await expect(defaultAnchor.locator(".popover")).toBeVisible();
  await twoColumnAnchor.hover();
  await expect(twoColumnAnchor.locator(".popover")).toBeVisible();
  await subtasksAnchor.hover();
  await expect(subtasksAnchor.locator(".popover")).toBeVisible();

  const desktop = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, width: rect.width };
    };
    return {
      defaultAnchor: read('[data-stylex-owner="user-issues-default-login-anchor"]'),
      twoColumnAnchor: read('[data-stylex-owner="user-issues-two-column-anchor"]'),
      subtasksAnchor: read('[data-stylex-owner="user-issues-subtasks-anchor"]'),
    };
  });
  expect(desktop.defaultAnchor).not.toBeNull();
  expect(desktop.twoColumnAnchor).not.toBeNull();
  expect(desktop.subtasksAnchor).not.toBeNull();
  expect(desktop.defaultAnchor!.right).toBeLessThanOrEqual(1366);
  expect(desktop.twoColumnAnchor!.right).toBeLessThanOrEqual(1366);
  expect(desktop.subtasksAnchor!.right).toBeLessThanOrEqual(1366);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

async function mockUserIssues(page: Page) {
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
    loginId: "alice",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/user/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        filter: "assigned",
        items: [
          {
            assigneeLabel: "",
            authorLabel: "Alice",
            authorLoginId: "alice",
            childClosedCount: 0,
            childOpenCount: 0,
            createdLabel: "2026-07-17",
            id: 1,
            issueNumber: 1,
            labels: [],
            ownerName: "alice",
            projectName: "sample",
            state: "open",
            title: "First issue",
            updatedLabel: "2026-07-17",
          },
        ],
        openIssueCount: 1,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: {},
        state: "open",
        totalCount: 1,
        totalPages: 1,
        viewerUserId: 1,
      },
    }),
  );
}
